import { prisma, logActivity, updateLeadStatus, saveWebsiteAnalysis, saveLeadScore } from "../db";
import { fromJson } from "../db/json";
import { analyzeWebsite } from "../analysis";
import { scoreLead, isQualified } from "../scoring";
import { generateDemo } from "../demo-generator";
import { generateMessage } from "../messaging";
import type { WebsiteAnalysisData } from "../types";

/** The individual, reusable pipeline steps. Both the dashboard's manual
 * per-lead buttons (src/app/(dashboard)/leads/[id]/actions.ts) and the
 * repeatable /loop script (scripts/loop.ts) call these same functions —
 * one implementation of "what analyzing/scoring/demo/message means",
 * never duplicated. */

export async function runAnalysisAndScoring(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead nicht gefunden.");
  if (!lead.website) throw new Error("Lead hat keine Website hinterlegt.");

  const { data, websiteScore } = await analyzeWebsite(lead.website);
  await saveWebsiteAnalysis(leadId, data, websiteScore);

  const { leadScore, reasons } = scoreLead(data, {
    hasContactInfo: Boolean(lead.contactPhone || lead.address),
  });
  await saveLeadScore(leadId, leadScore, reasons);

  const qualified = isQualified(leadScore);
  if (qualified) {
    await updateLeadStatus(leadId, "QUALIFIED", `Lead qualifiziert (Score ${leadScore}/100)`);
  }

  return { websiteScore, leadScore, qualified };
}

export async function runDemoGeneration(leadId: string) {
  return generateDemo(leadId);
}

export async function runMessageGeneration(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { analysis: true, demo: true },
  });
  if (!lead) throw new Error("Lead nicht gefunden.");
  if (!lead.analysis) throw new Error("Für diesen Lead liegt noch keine Website-Analyse vor.");
  if (!lead.demo) throw new Error("Für diesen Lead wurde noch keine Demo erstellt.");

  const analysisData = fromJson<WebsiteAnalysisData>({
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
  });

  const { subject, body } = generateMessage(
    { companyName: lead.companyName, location: lead.location },
    analysisData,
    leadId
  );

  await prisma.message.upsert({
    where: { leadId },
    create: { leadId, subject, body },
    update: { subject, body, editedByUser: false, approvedAt: null, rejectedAt: null, sentAt: null },
  });

  await logActivity(leadId, "MESSAGE_DRAFTED", "Nachrichtenentwurf erstellt");
  await updateLeadStatus(leadId, "WAITING_FOR_REVIEW", "Nachricht bereit — wartet auf manuelle Prüfung");
}
