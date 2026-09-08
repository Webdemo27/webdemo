import { prisma } from "../db";

/**
 * The one gate every future send path must go through. Throws unless a
 * human has explicitly approved this exact message and it hasn't been
 * sent or rejected since. Any code that wants to send email — a UI
 * button, a script, a future automation — calls this first; there is no
 * other way to reach a sender in this codebase, and nothing currently
 * calls it, because no send action exists yet (Phase 10 architecture
 * only).
 */
export async function requireApprovedMessage(leadId: string) {
  const message = await prisma.message.findUnique({ where: { leadId } });
  if (!message) throw new Error("Kein Nachrichtenentwurf vorhanden.");
  if (message.rejectedAt) throw new Error("Nachricht wurde verworfen — kein Versand möglich.");
  if (message.sentAt) throw new Error("Nachricht wurde bereits als gesendet markiert.");
  if (!message.approvedAt) {
    throw new Error("Nachricht wurde noch nicht durch einen Menschen freigegeben.");
  }
  return message;
}
