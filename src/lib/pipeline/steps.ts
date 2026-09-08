import {
  prisma,
  logActivity,
  advancePipelineStatus,
  saveWebsiteAnalysis,
  saveLeadScore,
  saveContactDiscovery,
} from "../db";
import { fromJson } from "../db/json";
import { analyzeWebsite } from "../analysis";
import { captureBeforeScreenshots } from "../analysis/screenshot";
import { discoverContactEmails, type EmailCandidate } from "../contact-discovery";
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

  // Real viewport screenshots of the lead's current site — the "Vorher"
  // half of the Before/After comparison. Never blocks analysis: a failed
  // capture just leaves the screenshot fields null, same "mark
  // unverifiable, don't invent" discipline as the rest of analysis/.
  const screenshots = await captureBeforeScreenshots(lead.website, leadId);
  await saveWebsiteAnalysis(leadId, data, websiteScore, {
    desktopPath: screenshots.desktop ? `/screenshots/${leadId}/${screenshots.desktop.publicPath}` : null,
    mobilePath: screenshots.mobile ? `/screenshots/${leadId}/${screenshots.mobile.publicPath}` : null,
    error: screenshots.error,
  });

  // Real, sourced contact-email discovery (Impressum/Kontakt/Datenschutz/
  // Team/Über uns) — folds in whatever the lead already had (typically an
  // OpenStreetMap contact:email tag from research) as one more candidate
  // so ranking happens once, consistently, across every source.
  const externalCandidates: EmailCandidate[] = lead.contactEmail
    ? [
        {
          email: lead.contactEmail,
          source: (lead.contactEmailSource as EmailCandidate["source"]) ?? "OpenStreetMap",
          sourceUrl: lead.contactEmailSourceUrl ?? lead.website,
          confidence: (lead.contactEmailConfidence as EmailCandidate["confidence"]) ?? "MEDIUM",
          foundAt: (lead.contactEmailFoundAt ?? lead.createdAt).toISOString(),
        },
      ]
    : [];
  const contactDiscovery = await discoverContactEmails(lead.website, externalCandidates);
  await saveContactDiscovery(leadId, contactDiscovery);

  const { leadScore, reasons } = scoreLead(data, {
    hasContactInfo: Boolean(contactDiscovery.primary || lead.contactPhone || lead.address),
  });
  await saveLeadScore(leadId, leadScore, reasons);

  const qualified = isQualified(leadScore);
  if (qualified) {
    await advancePipelineStatus(leadId, "QUALIFIED", `Lead qualifiziert (Score ${leadScore}/100)`);
  }

  return { websiteScore, leadScore, qualified };
}

export async function runDemoGeneration(leadId: string) {
  return generateDemo(leadId);
}

export async function runMessageGeneration(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { analysis: true, demo: true, message: true },
  });
  if (!lead) throw new Error("Lead nicht gefunden.");
  if (!lead.analysis) throw new Error("Für diesen Lead liegt noch keine Website-Analyse vor.");
  if (!lead.demo) throw new Error("Für diesen Lead wurde noch keine Demo erstellt.");
  // A human has already decided on this exact message — never silently
  // overwrite that decision. This is the last line of defense against
  // the pipeline re-entering an already-reviewed lead (e.g. a stray
  // re-analysis regressing its status, or /loop picking it back up);
  // regenerating a message that's genuinely still pending review is
  // fine and expected, deciding-over one that's approved/rejected/sent
  // is not.
  if (lead.message?.approvedAt || lead.message?.rejectedAt || lead.message?.sentAt) {
    throw new Error(
      "Für diesen Lead liegt bereits eine entschiedene Nachricht vor (freigegeben/abgelehnt/versendet) — wird nicht überschrieben."
    );
  }

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
    { companyName: lead.companyName, location: lead.location, demoUrl: lead.demo.publicUrl },
    analysisData,
    leadId
  );

  await prisma.message.upsert({
    where: { leadId },
    create: { leadId, subject, body },
    update: { subject, body, editedByUser: false, approvedAt: null, rejectedAt: null, sentAt: null },
  });

  await logActivity(leadId, "MESSAGE_DRAFTED", "Nachrichtenentwurf erstellt");
  await advancePipelineStatus(leadId, "WAITING_FOR_REVIEW", "Nachricht bereit — wartet auf manuelle Prüfung");
}
