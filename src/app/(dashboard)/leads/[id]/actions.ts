"use server";

import { revalidatePath } from "next/cache";
import { prisma, logActivity, updateLeadStatus } from "@/lib/db";
import { runAnalysisAndScoring, runDemoGeneration, runMessageGeneration } from "@/lib/pipeline/steps";
import { safeRecordError } from "@/lib/research";
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

/** Manually (re)generates the static demo site for a lead. */
export async function generateLeadDemo(leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runDemoGeneration(leadId);
    refresh(leadId);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler bei der Demo-Erstellung.";
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
