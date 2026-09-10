import { promises as fs } from "fs";
import path from "path";
import { prisma, logActivity, advancePipelineStatus } from "../db";
import { toJson, fromJson } from "../db/json";
import { renderDemoSite, type DemoData } from "./template";
import { slugify } from "./slug";
import { buildVisualProfile, pickNextVariant } from "../visual-director";
import { getVariant } from "../visual-director/variants";
import type { VisualProfile } from "../visual-director/types";
import { reviewDemo } from "../visual-director/review";
import { buildDemoConcept, preferredVariantFor, buildXray } from "../visual-director/concept";
import { generateAssetsForLead, type AssetPipelineSummary } from "../images";
import { captureAfterScreenshots } from "../analysis/screenshot";
import type { WebsiteAnalysisData } from "../types";

export { slugify } from "./slug";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");

/** Real counts of how often each variant has actually been used, across
 * every lead's demo — Demo.conceptVariant already persists this, so no
 * separate registry table is needed. Used to break ties toward whatever
 * is genuinely rarest site-wide when a lead has no per-lead history and
 * no X-ray-driven preference (see pickNextVariant's doc comment). */
async function globalVariantUsageCounts(): Promise<Record<string, number>> {
  const rows = await prisma.demo.groupBy({
    by: ["conceptVariant"],
    _count: { conceptVariant: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.conceptVariant) counts[row.conceptVariant] = row._count.conceptVariant;
  }
  return counts;
}

async function uniqueSlug(base: string, leadId: string): Promise<string> {
  const candidate = base || `lead-${leadId.slice(0, 8)}`;
  const existing = await prisma.demo.findUnique({ where: { slug: candidate } });
  if (!existing || existing.leadId === leadId) return candidate;
  return `${candidate}-${leadId.slice(0, 6)}`;
}

export interface GenerateDemoResult {
  demo: Awaited<ReturnType<typeof prisma.demo.upsert>>;
  assetSummary: AssetPipelineSummary;
  visualReviewPassed: boolean;
  variantName: string;
}

/**
 * Generates (or regenerates) a self-contained static demo site for a
 * lead. Order matters: X-Ray (from the existing analysis, if any) finds
 * the biggest real problem category → that picks a preferred concept
 * variant not yet tried for this lead → Visual Director builds the
 * creative brief around that variant → the asset pipeline fills it
 * (real photos from the lead's own site → abstract art, no provider
 * required) → the template renders around those assets → a research-
 * driven concept (business profile, website audit, opportunity map,
 * design rationale, pricing) is assembled for the dashboard. Written
 * under public/demos/<slug>/index.html, isolated from the dashboard.
 */
/**
 * Re-renders an existing demo's HTML from its already-stored state —
 * same VisualProfile, same ConceptVariant, same asset rows — without
 * touching the asset pipeline or picking a new variant.
 *
 * Needed whenever something changes an asset *after* generation (today:
 * attaching a generated hero video, see lib/video). Calling
 * generateDemo() there would be wrong twice over: it cycles to a
 * different concept variant, and it re-runs image generation for assets
 * that already exist.
 */
export async function rerenderDemoFromStoredState(demoId: string): Promise<{ pageCount: number }> {
  const demo = await prisma.demo.findUnique({
    where: { id: demoId },
    include: { lead: true, assets: { orderBy: { order: "asc" } } },
  });
  if (!demo) throw new Error("Demo nicht gefunden.");

  const profile = fromJson<VisualProfile>(demo.visualProfile);
  if (!profile) throw new Error("Diese Demo hat kein gespeichertes VisualProfile — bitte neu generieren.");
  const variant = getVariant(demo.conceptVariant ?? "");

  const demoData: DemoData = {
    companyName: demo.lead.companyName,
    industry: demo.lead.industry,
    location: demo.lead.location,
    address: demo.lead.address,
    contactPhone: demo.lead.contactPhone,
    contactEmail: demo.lead.contactEmail,
    latitude: demo.lead.latitude,
    longitude: demo.lead.longitude,
  };

  const { pages } = renderDemoSite(demoData, profile, demo.assets, variant);
  const outputDir = path.join(DEMOS_ROOT, demo.slug);
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all(pages.map((p) => fs.writeFile(path.join(outputDir, p.filename), p.html, "utf8")));

  return { pageCount: pages.length };
}

export async function generateDemo(leadId: string): Promise<GenerateDemoResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { analysis: true } });
  if (!lead) throw new Error("Lead nicht gefunden.");
  if (!lead.analysis) {
    throw new Error(
      "Für diesen Lead liegt noch keine Website-Analyse vor — die Recherche muss die Demo bestimmen, nicht umgekehrt. Bitte zuerst analysieren."
    );
  }

  const existingDemo = await prisma.demo.findUnique({ where: { leadId } });
  const history: string[] = existingDemo?.variantHistory
    ? (fromJson<string[]>(existingDemo.variantHistory) ?? [])
    : [];

  const analysisData = lead.analysis
    ? fromJson<WebsiteAnalysisData>({
        design: lead.analysis.design,
        mobileUx: lead.analysis.mobileUx,
        navigation: lead.analysis.navigation,
        performance: lead.analysis.performance,
        content: lead.analysis.content,
        cta: lead.analysis.cta,
        trust: lead.analysis.trust,
        contactExperience: lead.analysis.contactExperience,
        accessibility: lead.analysis.accessibility,
        conversionPotential: lead.analysis.conversionPotential,
        strengths: lead.analysis.strengths,
        weaknesses: lead.analysis.weaknesses,
        opportunities: lead.analysis.opportunities,
      })
    : null;

  // Demo reacts to the X-ray: the biggest verified problem category
  // (if any) prefers a specific concept variant, so the structure isn't
  // picked at random — see preferredVariantFor/CATEGORY_PREFERRED_VARIANT.
  let preferredVariantId: string | null = null;
  if (analysisData) {
    preferredVariantId = preferredVariantFor(buildXray(analysisData).biggestProblemCategory);
  }
  const variant = pickNextVariant(history, preferredVariantId, await globalVariantUsageCounts());
  const profile = buildVisualProfile({ industry: lead.industry }, variant);

  const baseSlug = existingDemo?.slug ?? slugify(lead.companyName);
  const slug = existingDemo ? existingDemo.slug : await uniqueSlug(baseSlug, leadId);
  const outputDir = path.join(DEMOS_ROOT, slug);
  await fs.mkdir(outputDir, { recursive: true });

  const newHistory = [...history, variant.id];

  // Demo row must exist before the asset pipeline runs (it needs the
  // slug for the output folder and the demo id to attach assets to).
  const demo = await prisma.demo.upsert({
    where: { leadId },
    create: {
      leadId,
      slug,
      templateKey: "visual-director-v2",
      outputDir: `public/demos/${slug}`,
      placeholders: {},
      visualProfile: toJson(profile),
      conceptVariant: variant.id,
      variantHistory: toJson(newHistory),
    },
    update: {
      templateKey: "visual-director-v2",
      visualProfile: toJson(profile),
      conceptVariant: variant.id,
      variantHistory: toJson(newHistory),
    },
  });

  const assetSummary = await generateAssetsForLead(leadId, profile);

  const assetRows = await prisma.demoAsset.findMany({
    where: { demoId: demo.id },
    orderBy: { order: "asc" },
  });

  const demoData: DemoData = {
    companyName: lead.companyName,
    industry: lead.industry,
    location: lead.location,
    address: lead.address,
    contactPhone: lead.contactPhone,
    contactEmail: lead.contactEmail,
    latitude: lead.latitude,
    longitude: lead.longitude,
  };

  const { pages, placeholders } = renderDemoSite(demoData, profile, assetRows, variant);
  // A regenerated demo can end up with fewer pages than a previous
  // variant (e.g. switching from one with a Leistungen page to
  // luxury-minimal, which has none) — clear stale .html files first so
  // an old page never lingers as dead, unlinked content.
  const existingFiles = await fs.readdir(outputDir).catch(() => [] as string[]);
  await Promise.all(
    existingFiles
      .filter((f) => f.endsWith(".html") && !pages.some((p) => p.filename === f))
      .map((f) => fs.rm(path.join(outputDir, f), { force: true }))
  );
  await Promise.all(pages.map((p) => fs.writeFile(path.join(outputDir, p.filename), p.html, "utf8")));
  const html = pages.find((p) => p.filename === "index.html")?.html ?? pages[0].html;

  // Real screenshots of the just-rendered demo, straight off disk — the
  // "Nachher" half of the Before/After comparison shown next to the
  // lead's existing site (captured during analysis). Never blocks demo
  // creation: a failed capture just leaves these fields null.
  const afterScreenshots = await captureAfterScreenshots(
    path.join(outputDir, "index.html"),
    path.join(outputDir, "assets")
  );
  await prisma.demo.update({
    where: { id: demo.id },
    data: {
      afterScreenshotDesktopPath: afterScreenshots.desktop
        ? `/demos/${slug}/assets/${afterScreenshots.desktop.publicPath}`
        : null,
      afterScreenshotMobilePath: afterScreenshots.mobile
        ? `/demos/${slug}/assets/${afterScreenshots.mobile.publicPath}`
        : null,
    },
  });

  if (analysisData) {
    const concept = buildDemoConcept({
      companyName: lead.companyName,
      industry: lead.industry,
      specialty: lead.specialty,
      location: lead.location,
      analysis: analysisData,
      leadScore: lead.leadScore ?? 0,
      realImageCount: assetSummary.fromRealPhotos,
      variant,
      profile,
    });
    await prisma.demo.update({
      where: { id: demo.id },
      data: { concept: toJson(concept), placeholders: toJson(placeholders) },
    });
  } else {
    await prisma.demo.update({ where: { id: demo.id }, data: { placeholders: toJson(placeholders) } });
  }

  const sectionCount = variant.sectionOrder.length;
  const review = reviewDemo({
    profile,
    assetCount: assetRows.length,
    heroHasVisual: Boolean(assetRows.find((a) => a.role === "hero")) || profile.use3d,
    sectionCount,
    html,
  });

  await advancePipelineStatus(leadId, "DEMO_CREATED");
  await logActivity(
    leadId,
    "DEMO_CREATED",
    `Demo erstellt (/demos/${slug}/), Konzept "${variant.name}" — ${assetSummary.fromRealPhotos} echte Fotos, ${assetSummary.fromProvider} generiert, ${assetSummary.fromAbstractArt} abstrakte Kompositionen`
  );
  if (!review.passed) {
    const failed = review.checks.filter((c) => !c.passed).map((c) => c.label);
    await logActivity(leadId, "VISUAL_REVIEW", `Visual-QA-Hinweise: ${failed.join("; ")}`);
  }

  return { demo, assetSummary, visualReviewPassed: review.passed, variantName: variant.name };
}
