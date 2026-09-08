import { promises as fs } from "fs";
import path from "path";
import { prisma, logActivity } from "../db";
import { toJson } from "../db/json";
import { renderDemoHtml, type DemoData } from "./template";
import { getIndustryConfig } from "./industry-config";
import { slugify } from "./slug";

export { getIndustryConfig } from "./industry-config";
export { slugify } from "./slug";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");

async function uniqueSlug(base: string, leadId: string): Promise<string> {
  const candidate = base || `lead-${leadId.slice(0, 8)}`;
  const existing = await prisma.demo.findUnique({ where: { slug: candidate } });
  if (!existing || existing.leadId === leadId) return candidate;
  return `${candidate}-${leadId.slice(0, 6)}`;
}

/** Generates (or regenerates) a self-contained static demo site for a
 * qualified lead and writes it under public/demos/<slug>/index.html so
 * Next.js serves it directly, isolated from the dashboard. */
export async function generateDemo(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead nicht gefunden.");

  const demoData: DemoData = {
    companyName: lead.companyName,
    industry: lead.industry,
    location: lead.location,
    address: lead.address,
    contactPhone: lead.contactPhone,
    contactEmail: lead.contactEmail,
  };

  const config = getIndustryConfig(lead.industry);
  const { html, placeholders } = renderDemoHtml(demoData, config);

  const existingDemo = await prisma.demo.findUnique({ where: { leadId } });
  const baseSlug = existingDemo?.slug ?? slugify(lead.companyName);
  const slug = existingDemo ? existingDemo.slug : await uniqueSlug(baseSlug, leadId);

  const outputDir = path.join(DEMOS_ROOT, slug);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");

  const demo = await prisma.demo.upsert({
    where: { leadId },
    create: {
      leadId,
      slug,
      templateKey: "local-service-v1",
      outputDir: `public/demos/${slug}`,
      placeholders: toJson(placeholders),
    },
    update: {
      templateKey: "local-service-v1",
      outputDir: `public/demos/${slug}`,
      placeholders: toJson(placeholders),
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "DEMO_CREATED" } });
  await logActivity(leadId, "DEMO_CREATED", `Demo-Website erstellt (/demos/${slug}/)`);

  return demo;
}
