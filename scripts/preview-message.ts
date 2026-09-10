/** Prints the outreach draft for one lead, so the copy can be read as a
 * recipient would see it rather than inferred from templates.
 *
 *   npx tsx scripts/preview-message.ts <slug-oder-firmenname>
 */
import { prisma } from "../src/lib/db/client";
import { generateMessage } from "../src/lib/messaging";
import { fromJson } from "../src/lib/db/json";
import type { WebsiteAnalysisData } from "../src/lib/types";

function analysisRowToData(a: Record<string, unknown>): WebsiteAnalysisData {
  return fromJson<WebsiteAnalysisData>({
    design: a.design, mobileUx: a.mobileUx, navigation: a.navigation,
    performance: a.performance, content: a.content, cta: a.cta, trust: a.trust,
    contactExperience: a.contactExperience, accessibility: a.accessibility,
    conversionPotential: a.conversionPotential, strengths: a.strengths,
    weaknesses: a.weaknesses, opportunities: a.opportunities,
  }) as WebsiteAnalysisData;
}

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { analysis: { isNot: null } },
    include: { analysis: true, demo: true },
  });
  if (!lead?.analysis) throw new Error("Kein Lead mit Analyse gefunden.");

  const { subject, body } = generateMessage(
    {
      companyName: lead.companyName,
      contactName: lead.contactName,
      location: lead.location,
      demoUrl: lead.demo?.publicUrl ?? null,
    },
    analysisRowToData(lead.analysis as unknown as Record<string, unknown>),
    lead.id
  );

  console.log(`Lead:    ${lead.companyName} (${lead.industry ?? "-"}, ${lead.location ?? "-"})`);
  console.log(`Kontakt: ${lead.contactName ?? "— kein Name bekannt"}`);
  console.log("=".repeat(70));
  console.log(`Betreff: ${subject}`);
  console.log("-".repeat(70));
  console.log(body);
  console.log("=".repeat(70));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
