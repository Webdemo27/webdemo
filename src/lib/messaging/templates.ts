export const SUBJECT_TEMPLATES = [
  "Kurze Idee für die Website von {company}",
  "Ein unverbindlicher Vorschlag für {company}",
  "Website-Konzept für {company} zum Ansehen",
  "Ein moderner Auftritt für {company}?",
  "Kurzer Vorschlag: neue Website für {company}",
];

export const OPENERS = [
  "ich bin gerade auf die Website von {company} gestoßen.",
  "ich habe mir eben den Webauftritt von {company} angesehen.",
  "beim Recherchieren lokaler Betriebe in {location} bin ich auf {company} gestoßen.",
  "als jemand, der viel mit lokalen Unternehmen in {location} zu tun hat, bin ich auf {company} aufmerksam geworden.",
  "ich beschäftige mich beruflich mit Webauftritten lokaler Betriebe und habe mir dabei {company} genauer angesehen.",
];

/** Used when a real public demo URL exists (never a localhost link).
 * Index-aligned with BRIDGES_NO_LINK — see insertDemoLink() in
 * messaging/index.ts, which relies on that pairing to swap the "link
 * follows separately" promise for the real link once one exists. */
export const BRIDGES_WITH_LINK = [
  "Deshalb habe ich mir erlaubt, unverbindlich ein kurzes Demo-Konzept vorzubereiten, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte:",
  "Daraufhin habe ich ein kurzes Demo-Konzept erstellt, das zeigt, wie ein moderner Auftritt aussehen könnte:",
  "Um das greifbarer zu machen, habe ich unverbindlich einen Entwurf umgesetzt, den Sie sich direkt ansehen können:",
  "Ganz konkret sieht das dann so aus — ein kurzer Entwurf, unverbindlich und kostenlos:",
];

/** Used when the demo isn't publicly reachable yet — never mention a
 * link that doesn't resolve for the recipient. Index-aligned with
 * BRIDGES_WITH_LINK, see the note there. */
export const BRIDGES_NO_LINK = [
  "Deshalb habe ich mir erlaubt, unverbindlich ein kurzes Demo-Konzept vorzubereiten, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte — ich sende Ihnen den Link dazu gerne im Anschluss.",
  "Daraufhin habe ich ein kurzes Demo-Konzept erstellt; den Link dazu reiche ich Ihnen gerne separat nach.",
  "Um das greifbarer zu machen, habe ich unverbindlich einen Entwurf umgesetzt — den Link dazu reiche ich Ihnen im Anschluss gerne nach.",
  "Ganz konkret sieht das dann so aus — einen Link zu diesem kurzen, kostenlosen Entwurf sende ich Ihnen gerne separat.",
];

export const CLOSINGS = [
  "Falls das interessant ist, lassen Sie es mich gerne wissen — falls nicht, auch völlig in Ordnung.",
  "Kein Verkaufsgespräch, nur eine Idee — melden Sie sich gerne, wenn Sie mögen.",
  "Über eine kurze, unverbindliche Rückmeldung würde ich mich freuen.",
  "Wenn das für Sie interessant ist, können wir gerne kurz telefonieren — ansonsten kein Thema.",
  "Ich freue mich über Ihre Rückmeldung, ganz gleich, wie sie ausfällt.",
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
