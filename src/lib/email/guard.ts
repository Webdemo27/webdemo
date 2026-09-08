import { prisma } from "../db";

/**
 * The one gate every send/draft path must go through. Throws unless a
 * human has explicitly approved this exact message and it hasn't been
 * sent or rejected since. Any code that wants to reach Gmail — a UI
 * button, a script, a future automation — calls this first; there is no
 * other way to reach a sender in this codebase. Called today by
 * `prepareGmailDraft()` (src/app/(dashboard)/leads/[id]/actions.ts)
 * before every `GmailSender.createDraft()` call. `GmailSender.send()`
 * exists and is gated the same way, but is deliberately never called
 * from any button — draft-only, matching "niemals automatisch senden".
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
