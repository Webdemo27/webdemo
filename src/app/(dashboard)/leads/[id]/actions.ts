"use server";

import { revalidatePath } from "next/cache";
import { prisma, logActivity, updateLeadStatus } from "@/lib/db";
import type { LeadStatus } from "@/lib/types";

function refresh(leadId: string) {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/messages");
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
