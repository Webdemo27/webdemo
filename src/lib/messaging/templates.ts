export const SUBJECT_TEMPLATES = [
  "Kurze Idee für die Website von {company}",
  "Ein unverbindlicher Vorschlag für {company}",
  "Website-Konzept für {company} zum Ansehen",
];

export const OPENERS = [
  "ich bin gerade auf die Website von {company} gestoßen.",
  "ich habe mir eben den Webauftritt von {company} angesehen.",
  "beim Recherchieren lokaler Betriebe in {location} bin ich auf {company} gestoßen.",
];

/** Used when a real public demo URL exists (never a localhost link). */
export const BRIDGES_WITH_LINK = [
  "Deshalb habe ich mir erlaubt, unverbindlich ein kurzes Demo-Konzept vorzubereiten, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte:",
  "Daraufhin habe ich ein kurzes Demo-Konzept erstellt, das zeigt, wie ein moderner Auftritt aussehen könnte:",
];

/** Used when the demo isn't publicly reachable yet — never mention a
 * link that doesn't resolve for the recipient. */
export const BRIDGES_NO_LINK = [
  "Deshalb habe ich mir erlaubt, unverbindlich ein kurzes Demo-Konzept vorzubereiten, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte — ich sende Ihnen den Link dazu gerne im Anschluss.",
  "Daraufhin habe ich ein kurzes Demo-Konzept erstellt; den Link dazu reiche ich Ihnen gerne separat nach.",
];

export const CLOSINGS = [
  "Falls das interessant ist, lassen Sie es mich gerne wissen — falls nicht, auch völlig in Ordnung.",
  "Kein Verkaufsgespräch, nur eine Idee — melden Sie sich gerne, wenn Sie mögen.",
  "Über eine kurze, unverbindliche Rückmeldung würde ich mich freuen.",
];

/** Real signature from env (SENDER_NAME/PHONE/WHATSAPP) — never
 * fabricated. Falls back to a generic sign-off if unset so the draft is
 * still usable, but a real signature is expected before sending. */
export function buildSignature(): string {
  const name = process.env.SENDER_NAME;
  const phone = process.env.SENDER_PHONE;
  const whatsapp = process.env.SENDER_WHATSAPP;
  const email = process.env.GMAIL_SENDER_ADDRESS;

  if (!name) return "Beste Grüße";

  const lines = ["Beste Grüße", "", name];
  if (phone) lines.push(phone);
  if (whatsapp) lines.push(`WhatsApp: ${whatsapp}`);
  if (email) lines.push(email);
  return lines.join("\n");
}

/** Deterministic per-lead pick, so regenerating the same lead doesn't
 * flip-flop the phrasing, while different leads still vary. */
export function pickVariant<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return options[hash % options.length];
}
