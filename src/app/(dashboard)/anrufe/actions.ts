"use server";

import { revalidatePath } from "next/cache";
import { prisma, logActivity, updateLeadStatus } from "@/lib/db";
import type { CallOutcome } from "@prisma/client";

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  NOT_REACHED: "nicht erreicht",
  WRONG_PERSON: "falsche Person erreicht",
  NOT_INTERESTED: "kein Interesse",
  LINK_SENT: "Link zugesagt und geschickt",
  FOLLOW_UP: "Wiedervorlage vereinbart",
  WON: "Auftrag",
};

/**
 * Records one call attempt.
 *
 * This is the first thing in the project that measures whether any of it
 * works. Before it, 55 leads and 10 demos had produced exactly zero
 * recorded contact attempts, so questions like "how many dials is one
 * conversation worth" had no answer at all.
 *
 * Reaching someone moves the lead's status, because a conversation
 * happened — but only forward, and never past what the call actually
 * established. A refusal is REJECTED, a won deal is CONVERTED, anything
 * where they agreed to look is CONTACTED. "Not reached" changes nothing
 * about the lead except that we tried.
 */
export async function recordCall(input: {
  leadId: string;
  outcome: CallOutcome;
  note?: string;
  linkSentVia?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId }, select: { id: true } });
    if (!lead) return { ok: false, error: "Lead nicht gefunden." };

    const now = new Date();
    await prisma.callAttempt.create({
      data: {
        leadId: input.leadId,
        outcome: input.outcome,
        note: input.note?.trim() || null,
        linkSentVia: input.linkSentVia?.trim() || null,
      },
    });
    await prisma.lead.update({ where: { id: input.leadId }, data: { lastCalledAt: now } });

    const via = input.linkSentVia ? ` (Link per ${input.linkSentVia})` : "";
    await logActivity(
      input.leadId,
      "CALLED",
      `Anruf: ${OUTCOME_LABEL[input.outcome]}${via}${input.note ? ` — ${input.note.trim()}` : ""}`
    );

    if (input.outcome === "WON") {
      await updateLeadStatus(input.leadId, "CONVERTED", "Auftrag am Telefon gewonnen");
    } else if (input.outcome === "NOT_INTERESTED") {
      await updateLeadStatus(input.leadId, "REJECTED", "Am Telefon abgelehnt");
    } else if (input.outcome === "LINK_SENT" || input.outcome === "FOLLOW_UP") {
      await updateLeadStatus(input.leadId, "CONTACTED", `Am Telefon erreicht — ${OUTCOME_LABEL[input.outcome]}`);
    }

    revalidatePath("/anrufe");
    revalidatePath(`/leads/${input.leadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler." };
  }
}
