import { promises as fs } from "fs";
import path from "path";
import { prisma, logActivity } from "../db";
import { toJson } from "../db/json";
import { renderDemoHtml, type DemoData } from "./template";
import { slugify } from "./slug";
import { buildVisualProfile } from "../visual-director";
import { reviewDemo } from "../visual-director/review";
import { generateAssetsForLead, type AssetPipelineSummary } from "../images";

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
}

/**
 * Generates (or regenerates) a self-contained static demo site for a
 * lead: Visual Director decides the creative brief, the asset pipeline
 * fills it (real photos from the lead's own site → abstract art, no
 * provider required), then the template renders around those assets.
 * Written under public/demos/<slug>/index.html, isolated from the
 * dashboard.
 */
export async function generateDemo(leadId: string): Promise<GenerateDemoResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead nicht gefunden.");

  const profile = buildVisualProfile({ industry: lead.industry });

  const existingDemo = await prisma.demo.findUnique({ where: { leadId } });
  const baseSlug = existingDemo?.slug ?? slugify(lead.companyName);
  const slug = existingDemo ? existingDemo.slug : await uniqueSlug(baseSlug, leadId);
  const outputDir = path.join(DEMOS_ROOT, slug);
  await fs.mkdir(outputDir, { recursive: true });

  // Demo row must exist before the asset pipeline runs (it needs the
  // slug for the output folder and the demo id to attach assets to).
  const demo = await prisma.demo.upsert({
    where: { leadId },
    create: {
      leadId,
      slug,
      templateKey: "visual-director-v1",
      outputDir: `public/demos/${slug}`,
      placeholders: {},
      visualProfile: toJson(profile),
    },
    update: {
      templateKey: "visual-director-v1",
      visualProfile: toJson(profile),
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

  const { html, placeholders } = renderDemoHtml(demoData, profile, assetRows);
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");

  await prisma.demo.update({ where: { id: demo.id }, data: { placeholders: toJson(placeholders) } });

  const sectionCount = ["hero", "services", "editorial", "detail", "about", "contact"].length;
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
    `Demo-Website erstellt (/demos/${slug}/) — ${assetSummary.fromRealPhotos} echte Fotos, ${assetSummary.fromProvider} generiert, ${assetSummary.fromAbstractArt} abstrakte Kompositionen`
  );
  if (!review.passed) {
    const failed = review.checks.filter((c) => !c.passed).map((c) => c.label);
    await logActivity(leadId, "VISUAL_REVIEW", `Visual-QA-Hinweise: ${failed.join("; ")}`);
  }

  return { demo, assetSummary, visualReviewPassed: review.passed };
}
