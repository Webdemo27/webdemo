import { prisma } from "./client";
import { toJson } from "./json";

/** A real incident (2026-09-09): a raw external-process error string
 * (wrangler's stderr) carrying an unstripped terminal escape sequence
 * reached here and crashed the write itself — SQLite's string encoding
 * threw "unexpected end of hex escape" on the stray control byte,
 * taking down the whole action instead of just logging its failure. Any
 * caller can hand this raw text from a subprocess/API/scrape, so the
 * boundary strips stray control characters (keeping tab/newline/CR)
 * rather than trusting every call site to have sanitized first. */
function sanitizeForStorage(text: string): string {
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

export async function logActivity(
  leadId: string,
  type: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      leadId,
      type,
      message: sanitizeForStorage(message),
      metadata: metadata ? toJson(metadata) : undefined,
    },
  });
}
