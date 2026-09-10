import {
  prisma,
  logActivity,
  advancePipelineStatus,
  updateLeadStatus,
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
import type { WebsiteAnalysis } from "@prisma/client";

function analysisRowToData(analysis: WebsiteAnalysis): WebsiteAnalysisData {
  return fromJson<WebsiteAnalysisData>({
    design: analysis.design,
    mobileUx: analysis.mobileUx,
    navigation: analysis.navigation,
    performance: analysis.performance,
    content: analysis.content,
    cta: analysis.cta,
    trust: analysis.trust,
    contactExperience: analysis.contactExperience,
    accessibility: analysis.accessibility,
    conversionPotential: analysis.conversionPotential,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    opportunities: analysis.opportunities,
  });
}

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

  const { subject, body } = generateMessage(
    { companyName: lead.companyName, contactName: lead.contactName, location: lead.location, demoUrl: lead.demo.publicUrl },
    analysisRowToData(lead.analysis),
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

/** Lets a human request a brand-new draft for a lead whose message was
 * already sent — a follow-up, or wanting to try a different angle.
 * Unlike runMessageGeneration, this deliberately targets the one case
 * that function refuses (a decided message) and only that case: it
 * still refuses a message that's merely approved-but-unsent or
 * rejected, since those are exactly what the normal review flow (edit/
 * approve/reject) already covers. Moving status back to
 * WAITING_FOR_REVIEW bypasses advancePipelineStatus's forward-only
 * guard on purpose — that guard exists to stop automated/accidental
 * regressions (a stray re-analysis, /loop re-entering a lead), not an
 * explicit human request for exactly this. The new draft still goes
 * through the same approval gate as any other message — nothing is
 * ever sent without a fresh, separate approval. */
export async function reformulateSentMessage(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { analysis: true, demo: true, message: true },
  });
  if (!lead) throw new Error("Lead nicht gefunden.");
  if (!lead.analysis) throw new Error("Für diesen Lead liegt keine Website-Analyse vor.");
  if (!lead.demo) throw new Error("Für diesen Lead wurde noch keine Demo erstellt.");
  if (!lead.message?.sentAt) {
    throw new Error("Neu formulieren ist nur für eine bereits versendete Nachricht vorgesehen.");
  }

  // A fresh nonce in the seed, not just the leadId, so the reformulated
  // draft actually picks a different opener/bridge/closing combination
  // than the one that was sent — a plain re-roll of the same
  // deterministic seed would very likely land on the exact same text.
  const { subject, body } = generateMessage(
    { companyName: lead.companyName, contactName: lead.contactName, location: lead.location, demoUrl: lead.demo.publicUrl },
    analysisRowToData(lead.analysis),
    `${leadId}:reformulate:${Date.now()}`
  );

  await prisma.message.update({
    where: { leadId },
    data: { subject, body, editedByUser: false, approvedAt: null, rejectedAt: null, sentAt: null },
  });
  await updateLeadStatus(
    leadId,
    "WAITING_FOR_REVIEW",
    "Neue Nachricht formuliert (vorherige war bereits versendet) — wartet auf manuelle Prüfung"
  );
  await logActivity(
    leadId,
    "MESSAGE_REFORMULATED",
    "Neuer Nachrichtenentwurf erstellt, nachdem die vorherige Nachricht bereits versendet wurde"
  );
}
