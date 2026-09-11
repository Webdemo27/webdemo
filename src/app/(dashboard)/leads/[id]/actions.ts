"use server";

import { revalidatePath } from "next/cache";
import { prisma, logActivity, updateLeadStatus } from "@/lib/db";
import { runAnalysisAndScoring, runDemoGeneration, runMessageGeneration, reformulateSentMessage } from "@/lib/pipeline/steps";
import { safeRecordError } from "@/lib/research";
import { publishDemoPublicly, type PublishDemoOutcome } from "@/lib/publishing";
import { exportLeadDataForReactApp } from "@/lib/demo-generator/export-react-data";
import {
  runPreflightChecklist,
  GmailSender,
  requireApprovedMessage,
  isGmailConfigured,
  type PreflightResult,
} from "@/lib/email";
import type { LeadStatus } from "@/lib/types";

function refresh(leadId: string) {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/messages");
}

/** Manually runs the website-analysis + scoring step for one lead. Never
 * throws to the caller — a failure is recorded on the lead (per the "one
 * lead's error never stops the pipeline" rule) and reported for display. */
export async function analyzeLead(leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runAnalysisAndScoring(leadId);
    refresh(leadId);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler bei der Analyse.";
    await safeRecordError(leadId, message);
    refresh(leadId);
    return { ok: false, error: message };
  }
}

/** "Demo neu erstellen" restarts the whole per-lead process, not just the
 * demo file: fresh analysis + scoring, then a new demo variant, then a
 * new message draft — one click instead of three. The message step is
 * skipped (not attempted, not an error) once a human has already
 * approved/rejected/sent it, same hard rule as runMessageGeneration's
 * own guard — this only makes that check explicit up front instead of
 * relying on catching its thrown refusal. */
export async function generateLeadDemo(leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runAnalysisAndScoring(leadId);
    await runDemoGeneration(leadId);

    const message = await prisma.message.findUnique({ where: { leadId } });
    const messageDecided = Boolean(message?.approvedAt || message?.rejectedAt || message?.sentAt);
    if (!messageDecided) {
      await runMessageGeneration(leadId);
    }

    refresh(leadId);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler beim Neustart des Prozesses.";
    await safeRecordError(leadId, message);
    refresh(leadId);
    return { ok: false, error: message };
  }
}

/** Manually generates (or regenerates) the outreach message draft for a
 * lead. Always lands the lead at WAITING_FOR_REVIEW — nothing is ever
 * sent from here or automatically afterwards. */
export async function generateLeadMessage(leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runMessageGeneration(leadId);
    refresh(leadId);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler bei der Nachrichtenerstellung.";
    await safeRecordError(leadId, message);
    refresh(leadId);
    return { ok: false, error: message };
  }
}

export interface PublishLeadDemoOutcome extends PublishDemoOutcome {
  /** Result of the Gmail draft attempt that follows a successful
   * publish. Absent when publishing itself failed. */
  gmail?: GmailDraftOutcome;
}

/** Publishes the demo publicly via Cloudflare and verifies the URL is
 * actually reachable over HTTPS before saving it — see
 * lib/publishing/publish-demo.ts. Fails closed with a clear reason when
 * Cloudflare isn't configured (no credentials in this project).
 *
 * On success it immediately prepares the Gmail draft, so the moment a
 * demo is live the outreach mail is waiting in Drafts with the real link
 * already in it (publishDemoPublicly -> insertDemoLink puts it there).
 * That is the whole point of publishing, and doing it by hand afterwards
 * was an easy step to forget.
 *
 * Publishing also counts as the human approval of the message, because
 * it IS a deliberate per-lead decision: a person looked at this one lead
 * and chose to put its demo on the public internet under their own name.
 * Requiring a separate "Freigeben" click straight afterwards asked the
 * same person to confirm the same decision twice, and it was the step
 * that silently stopped the draft from ever appearing.
 *
 * What that does NOT do is send anything. The draft sits in Gmail until
 * a human opens it and presses Send — the review still happens, just in
 * the inbox the mail will actually leave from, with the finished text
 * and the live link in front of them. Nothing in this codebase can put
 * mail in front of a prospect: GmailSender.send() is never called from
 * any button.
 *
 * The approval is narrow and never silent. Only a draft still waiting
 * for review is approved; a rejected or already-sent message is left
 * exactly as it is, and the approval is written to the activity log
 * saying it came from publishing.
 *
 * A failed draft never fails the publish: the demo really is live, and
 * reporting otherwise would be a lie about the thing that matters most.
 */
export async function publishLeadDemo(leadId: string): Promise<PublishLeadDemoOutcome> {
  const result = await publishDemoPublicly(leadId);
  if (!result.ok) {
    refresh(leadId);
    return result;
  }

  // Approve before drafting: "Nachricht freigegeben" is one of the
  // preflight checks prepareGmailDraft insists on.
  const message = await prisma.message.findUnique({ where: { leadId } });
  if (message && !message.approvedAt && !message.rejectedAt && !message.sentAt) {
    await prisma.message.update({ where: { leadId }, data: { approvedAt: new Date() } });
    await updateLeadStatus(
      leadId,
      "APPROVED",
      "Mit dem Veröffentlichen der Demo freigegeben — der Versand bleibt ein eigener Klick in Gmail"
    );
  }

  let gmail: GmailDraftOutcome | undefined;
  try {
    gmail = await prepareGmailDraft(leadId);
  } catch (e) {
    gmail = {
      preflight: { passed: false, checks: [], recipient: null, subject: "", body: "" },
      draftCreated: false,
      gmailConfigured: isGmailConfigured(),
      error: e instanceof Error ? e.message : "Unbekannter Fehler beim Gmail-Entwurf.",
    };
  }

  refresh(leadId);
  return { ...result, gmail };
}

/** Exports whatever the static-HTML engine already generated for this
 * lead into the experimental Vite/React/WebGL demo-app (see
 * demo-generator/export-react-data.ts) — previously only reachable via
 * `npm run export:react-demo -- <slug>` on the command line. Pure
 * format conversion of already-real data; never touches the static
 * engine's own output or the lead's pipeline status. */
export async function exportReactDemo(leadId: string): Promise<{ ok: boolean; slug?: string; error?: string }> {
  try {
    const result = await exportLeadDataForReactApp(leadId);
    return { ok: true, slug: result.slug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler beim Export." };
  }
}

/** Manual status override — part of dashboard status management. Does not
 * trigger any pipeline step or message send by itself. */
export async function changeLeadStatus(leadId: string, status: LeadStatus) {
  await updateLeadStatus(leadId, status, `Status manuell auf ${status} gesetzt`);
  refresh(leadId);
}

/** Human review: approve. This only marks the message approved — it never
 * sends anything. Sending is a separate, explicit action (Phase 10). */
export async function approveMessage(leadId: string) {
  const message = await prisma.message.findUnique({ where: { leadId } });
  if (!message) throw new Error("Kein Nachrichtenentwurf für diesen Lead vorhanden.");

  await prisma.message.update({
    where: { leadId },
    data: { approvedAt: new Date(), rejectedAt: null },
  });
  await updateLeadStatus(leadId, "APPROVED", "Nachricht durch Nutzer freigegeben");
  refresh(leadId);
}

/** Marks an already-approved message as sent. This exists for today's
 * reality (Gmail auto-send isn't built yet, Phase 10) — the user copies
 * the approved text and sends it themselves, then records that here. It
 * never sends anything itself; it only requires the message to already
 * be approved by a human. */
export async function markMessageSent(leadId: string) {
  const message = await prisma.message.findUnique({ where: { leadId } });
  if (!message) throw new Error("Kein Nachrichtenentwurf für diesen Lead vorhanden.");
  if (!message.approvedAt) throw new Error("Nachricht muss zuerst freigegeben werden.");

  await prisma.message.update({ where: { leadId }, data: { sentAt: new Date() } });
  await updateLeadStatus(leadId, "CONTACTED", "Nachricht manuell versendet (außerhalb der App) und als gesendet markiert");
  refresh(leadId);
}

export interface GmailDraftOutcome {
  preflight: PreflightResult;
  draftCreated: boolean;
  gmailConfigured: boolean;
  error?: string;
}

/** Runs the full pre-send checklist (recipient, subject, body, approval,
 * reachable HTTPS demo URL, no localhost/placeholder text, signature),
 * then — only if every check passes AND Gmail is configured — creates a
 * Gmail draft via the API. A draft is inert until the user opens Gmail
 * and clicks Send themselves; this never sends anything. When Gmail
 * isn't configured, the checklist and composed text are still returned
 * so the user can copy it manually. */
export async function prepareGmailDraft(leadId: string): Promise<GmailDraftOutcome> {
  const preflight = await runPreflightChecklist(leadId);
  const gmailConfigured = isGmailConfigured();

  if (!preflight.passed || !preflight.recipient) {
    return { preflight, draftCreated: false, gmailConfigured };
  }

  try {
    await requireApprovedMessage(leadId);
    const sender = new GmailSender();
    const result = await sender.createDraft({
      to: preflight.recipient,
      subject: preflight.subject,
      body: preflight.body,
    });

    if (!result.ok) {
      return { preflight, draftCreated: false, gmailConfigured, error: result.error };
    }

    await logActivity(leadId, "GMAIL_DRAFT_CREATED", "Gmail-Entwurf erstellt (nicht versendet)");
    refresh(leadId);
    return { preflight, draftCreated: true, gmailConfigured };
  } catch (e) {
    return {
      preflight,
      draftCreated: false,
      gmailConfigured,
      error: e instanceof Error ? e.message : "Unbekannter Fehler.",
    };
  }
}

/** Creates a brand-new draft for a lead whose message was already sent
 * — a follow-up, or wanting to try a different angle. See
 * reformulateSentMessage's own doc comment for why moving status back
 * to WAITING_FOR_REVIEW here is safe and deliberate. The new draft
 * still requires its own fresh approval before anything can be sent. */
export async function reformulateMessage(leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await reformulateSentMessage(leadId);
    refresh(leadId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
}

/** Human review: reject/discard the draft. */
export async function rejectMessage(leadId: string) {
  const message = await prisma.message.findUnique({ where: { leadId } });
  if (!message) throw new Error("Kein Nachrichtenentwurf für diesen Lead vorhanden.");

  await prisma.message.update({
    where: { leadId },
    data: { rejectedAt: new Date() },
  });
  await updateLeadStatus(leadId, "REJECTED", "Nachricht durch Nutzer verworfen");
  refresh(leadId);
}

/** Human review: edit the draft before approving. */
export async function updateMessageDraft(leadId: string, formData: FormData) {
  const subject = formData.get("subject")?.toString().trim() || null;
  const body = formData.get("body")?.toString().trim() ?? "";

  if (!body) throw new Error("Nachricht darf nicht leer sein.");

  await prisma.message.update({
    where: { leadId },
    data: { subject, body, editedByUser: true },
  });
  await logActivity(leadId, "MESSAGE_EDITED", "Nachrichtenentwurf manuell bearbeitet");
  refresh(leadId);
}
