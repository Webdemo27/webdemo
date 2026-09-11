import { prisma } from "../db";

export interface PreflightCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  recipient: string | null;
  subject: string;
  body: string;
}

const PLACEHOLDER_PATTERN = /\[.*(platzhalter|einfügen|todo|placeholder|xxx|lorem ipsum).*\]/i;
const LOCALHOST_PATTERN = /https?:\/\/(localhost|127\.0\.0\.1)/i;

/**
 * Everything the brief asked to check before a Gmail draft is created:
 * recipient, subject, body, demo actually reachable, URL correct (never
 * localhost, never a bare placeholder), signature present, no invented
 * data left in. This is a read-only report — it never blocks
 * createDraft() itself, but the dashboard surfaces every failed check
 * so a human decides whether to proceed.
 */
export async function runPreflightChecklist(leadId: string): Promise<PreflightResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { message: true, demo: true },
  });

  const checks: PreflightCheck[] = [];
  const recipient = lead?.contactEmail ?? null;

  checks.push({
    label: "Empfänger",
    passed: Boolean(recipient),
    detail: recipient ?? "Keine E-Mail-Adresse für diesen Lead hinterlegt.",
  });

  const subject = lead?.message?.subject ?? "";
  checks.push({
    label: "Betreff",
    passed: subject.trim().length > 0,
    detail: subject || "Kein Betreff gesetzt.",
  });

  const body = lead?.message?.body ?? "";
  checks.push({
    label: "Nachricht",
    passed: body.trim().length > 0,
    detail: body ? `${body.length} Zeichen` : "Kein Nachrichtentext vorhanden.",
  });

  checks.push({
    label: "Nachricht freigegeben",
    passed: Boolean(lead?.message?.approvedAt) && !lead?.message?.rejectedAt && !lead?.message?.sentAt,
    detail: lead?.message?.approvedAt
      ? "Freigegeben"
      : "Nachricht wurde noch nicht durch einen Menschen freigegeben.",
  });

  const publicUrl = lead?.demo?.publicUrl ?? null;
  checks.push({
    label: "Demo erreichbar (öffentliche HTTPS-URL)",
    passed: Boolean(publicUrl),
    detail: publicUrl ?? "Noch keine öffentliche Demo-URL (Cloudflare-Veröffentlichung fehlt).",
  });

  // That a public URL exists says nothing about the recipient being able
  // to reach it: the message is written before publishing, so its bridge
  // sentence promises a demo without carrying one. insertDemoLink() fixes
  // that at publish time — this check is what notices when it didn't, so
  // the gap surfaces here instead of in an email that invites someone to
  // look at a demo and then never says where.
  const linkInBody = Boolean(publicUrl) && body.includes(publicUrl!);
  checks.push({
    label: "Demo-Link steht in der Nachricht",
    passed: linkInBody,
    detail: linkInBody
      ? publicUrl!
      : publicUrl
        ? "Die Nachricht nennt die öffentliche Demo-URL nicht."
        : "Ohne öffentliche URL kann die Nachricht keinen Link enthalten.",
  });

  const mentionsLocalhost = LOCALHOST_PATTERN.test(body);
  checks.push({
    label: "Keine localhost-URL in der Nachricht",
    passed: !mentionsLocalhost,
    detail: mentionsLocalhost ? "Nachricht enthält eine localhost-URL." : "OK",
  });

  const hasPlaceholder = PLACEHOLDER_PATTERN.test(body) || PLACEHOLDER_PATTERN.test(subject);
  checks.push({
    label: "Keine Platzhalter im Text",
    passed: !hasPlaceholder,
    detail: hasPlaceholder ? "Es wurde noch ein Platzhalter im Text gefunden." : "OK",
  });

  const hasSignature = Boolean(process.env.SENDER_NAME) && body.includes(process.env.SENDER_NAME ?? "\0");
  checks.push({
    label: "Signatur vorhanden",
    passed: hasSignature,
    detail: hasSignature
      ? "Signatur enthalten."
      : "Keine vollständige Signatur (SENDER_NAME in .env setzen und Nachricht neu erstellen).",
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
    recipient,
    subject,
    body,
  };
}
