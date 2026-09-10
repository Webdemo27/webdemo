/**
 * Outreach copy, written along Eric Worre's line: people decide on a
 * feeling and justify it afterwards, so the message sells the feeling a
 * visitor gets — trust, "these people look like they know what they are
 * doing" — rather than a list of technical features.
 *
 * What that means concretely here:
 * - It opens on THEM and their customers, never on "I found your site".
 * - It never opens by telling someone their website is bad. Leading with
 *   criticism puts a business owner on the defensive, and the real
 *   observation lands far better after their competence is acknowledged.
 * - It names the offer plainly (a finished demo, already built, free)
 *   and asks for something small (look at it), not for a meeting.
 * - It closes with posture, not apology. "Sorry to bother you, ignore me
 *   if you like" reads as someone who does not believe in their own work.
 *
 * What it must NOT become: hype. This project's rule against invented
 * claims and mass-marketing tone still governs every line — no promised
 * numbers, no "revolutionise", no urgency games. Emotional, specific and
 * honest at the same time.
 */

export const SUBJECT_TEMPLATES = [
  "Wie {company} online wirkt — ein fertiger Entwurf",
  "Für {company}: ein Website-Entwurf zum Ansehen",
  "{company}: Ihr Auftritt, einmal neu gedacht",
  "Ein fertiger Website-Entwurf für {company}",
  "{company} online — ich habe etwas vorbereitet",
];

/** Opens on the prospect and their customers. The unspoken message is
 * "I looked properly, and I respect what you do." */
export const OPENERS = [
  "wer in {location} nach einem Betrieb wie Ihrem sucht, entscheidet heute in wenigen Sekunden — und zwar am Bildschirm, lange bevor jemand bei Ihnen anruft.",
  "Ihre Arbeit spricht für sich. Der erste Eindruck entsteht heute allerdings meist online, bevor ein Kunde Sie überhaupt kennenlernt.",
  "die meisten Menschen in {location} schauen sich einen Betrieb erst im Netz an und entscheiden dann, ob sie anrufen. Diese paar Sekunden entscheiden viel.",
  "ich habe mir {company} angesehen — nicht als Prüfer, sondern so, wie ein möglicher Kunde es tun würde: kurz, am Handy, zwischendurch.",
];

/** Sits between the opener and the observation: acknowledges competence
 * so the observation reads as an opportunity, not an insult. */
export const ACKNOWLEDGEMENTS = [
  "Fachlich müssen Sie sich niemandem beweisen.",
  "An Ihrer Arbeit liegt es sicher nicht.",
  "Dass Sie Ihr Handwerk beherrschen, steht außer Frage.",
  "Ihr Betrieb hat offensichtlich Substanz.",
];

export const OBSERVATION_LEAD_INS = [
  "Genau dort ist mir etwas aufgefallen:",
  "Beim Ansehen ist mir eine Sache aufgefallen:",
  "Ein Punkt ist mir dabei aufgefallen:",
];

/** The feeling, not the feature list — what a visitor should come away
 * with. Deliberately about the customer's experience, never a promised
 * result for the business. */
export const FEELING_LINES = [
  "Ein Auftritt sollte in den ersten Sekunden das Gefühl geben: Hier bin ich richtig, hier kümmert sich jemand.",
  "Der Auftritt soll dasselbe Gefühl vermitteln, das Ihre Kunden bei Ihnen vor Ort haben.",
  "Ein guter Auftritt nimmt die Unsicherheit heraus, bevor jemand zum Hörer greift.",
  "Was online entsteht, ist Vertrauen — oder eben Zweifel. Dazwischen gibt es wenig.",
];

/** Used when a real public demo URL exists (never a localhost link).
 * Index-aligned with BRIDGES_NO_LINK — see insertDemoLink() in
 * messaging/index.ts, which relies on that pairing to swap the "link
 * follows separately" promise for the real link once one exists. */
export const BRIDGES_WITH_LINK = [
  "Deshalb habe ich Ihnen etwas gebaut, statt es nur zu beschreiben: einen fertigen Entwurf mit Ihrem Namen, kostenlos und unverbindlich.",
  "Statt darüber zu reden, habe ich es umgesetzt — ein fertiger Entwurf für {company}, kostenlos und unverbindlich:",
  "Ich habe Ihnen einen fertigen Entwurf erstellt, damit Sie sehen statt lesen müssen — kostenlos, unverbindlich:",
  "Am einfachsten sehen Sie selbst. Ein fertiger Entwurf für {company}, ohne Kosten und ohne Verpflichtung:",
];

/** Used when the demo isn't publicly reachable yet — never mention a
 * link that doesn't resolve for the recipient. Index-aligned with
 * BRIDGES_WITH_LINK, see the note there. */
export const BRIDGES_NO_LINK = [
  "Deshalb habe ich Ihnen etwas gebaut, statt es nur zu beschreiben: einen fertigen Entwurf mit Ihrem Namen, kostenlos und unverbindlich. Den Link sende ich Ihnen gleich im Anschluss.",
  "Statt darüber zu reden, habe ich es umgesetzt — einen fertigen Entwurf für {company}, kostenlos und unverbindlich. Den Link reiche ich Ihnen separat nach.",
  "Ich habe Ihnen einen fertigen Entwurf erstellt, damit Sie sehen statt lesen müssen — kostenlos und unverbindlich. Den Link schicke ich Ihnen im Anschluss.",
  "Am einfachsten sehen Sie selbst: ein fertiger Entwurf für {company}, ohne Kosten und ohne Verpflichtung. Den Link sende ich Ihnen gleich nach.",
];

/** The small ask. Never "can we schedule a call" — that is a bigger
 * commitment than a cold contact has any reason to make. */
export const ASKS = [
  "Schauen Sie in Ruhe drauf — eine Minute genügt. Wenn es Ihnen gefällt, sagen Sie mir einfach, was anders sein soll.",
  "Sehen Sie es sich an, wann es Ihnen passt. Sagen Sie mir danach in einem Satz, ob es die richtige Richtung ist.",
  "Werfen Sie einen Blick darauf. Falls etwas nicht passt, sagen Sie mir was — ich passe es an.",
  "Sehen Sie selbst, ob Sie sich darin wiedererkennen. Ihre ehrliche Einschätzung genügt mir.",
];

/** Posture, not apology. Someone who does not believe in their own work
 * is the last person a business owner wants building their website. */
export const CLOSINGS = [
  "Wenn es für Sie nicht passt, sagen Sie kurz Bescheid — dann ist die Sache für mich erledigt.",
  "Passt es nicht, ist das völlig in Ordnung. Eine kurze Rückmeldung genügt.",
  "Sollte es nicht Ihr Weg sein, sagen Sie es mir offen — ich nehme Ihnen das nicht übel.",
  "Ich melde mich nicht nach. Wenn Sie mögen, antworten Sie einfach.",
];

/** Getting a salutation wrong is worse than not using a name at all, and
 * a bare name ("Guten Tag Thomas Müller") reads oddly in German business
 * correspondence. So a name is only used when it already carries its own
 * form of address. */
export function buildSalutation(contactName: string | null): string {
  const name = contactName?.trim();
  if (!name) return "Guten Tag,";
  if (/^(Herrn?|Frau|Dr\.|Prof\.)\s/i.test(name)) return `Guten Tag ${name},`;
  return "Guten Tag,";
}

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
