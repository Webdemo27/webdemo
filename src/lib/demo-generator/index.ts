import { promises as fs } from "fs";
import path from "path";
import { prisma, logActivity } from "../db";
import { toJson, fromJson } from "../db/json";
import { renderDemoHtml, type DemoData } from "./template";
import { slugify } from "./slug";
import { buildVisualProfile, pickNextVariant } from "../visual-director";
import { reviewDemo } from "../visual-director/review";
import { buildDemoConcept, preferredVariantFor, buildXray } from "../visual-director/concept";
import { generateAssetsForLead, type AssetPipelineSummary } from "../images";
import type { WebsiteAnalysisData } from "../types";

export { slugify } from "./slug";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");

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
  const variant = pickNextVariant(history, preferredVariantId);
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
  };

  const { html, placeholders } = renderDemoHtml(demoData, profile, assetRows, variant);
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");

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

  await prisma.lead.update({ where: { id: leadId }, data: { status: "DEMO_CREATED" } });
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
