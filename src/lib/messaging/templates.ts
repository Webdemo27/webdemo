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

export const BRIDGES = [
  "Deshalb habe ich mir erlaubt, unverbindlich ein kurzes Demo-Konzept vorzubereiten, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte:",
  "Daraufhin habe ich ein kurzes Demo-Konzept erstellt, das zeigt, wie ein moderner Auftritt aussehen könnte:",
];

export const CLOSINGS = [
  "Falls das interessant ist, lassen Sie es mich gerne wissen — falls nicht, auch völlig in Ordnung.",
  "Kein Verkaufsgespräch, nur eine Idee — melden Sie sich gerne, wenn Sie mögen.",
  "Über eine kurze, unverbindliche Rückmeldung würde ich mich freuen.",
];

export const SIGNOFF = "Beste Grüße";

/** Deterministic per-lead pick, so regenerating the same lead doesn't
 * flip-flop the phrasing, while different leads still vary. */
export function pickVariant<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return options[hash % options.length];
}
