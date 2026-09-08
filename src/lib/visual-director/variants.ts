import type { LayoutDirection, MotionLevel } from "./types";

export type SectionKey = "hero" | "services" | "editorial" | "detail" | "location" | "about" | "contact";
export type HeroStyle = "full-bleed" | "minimal" | "3d" | "color-block";
export type CtaIntensity = "minimal" | "standard" | "aggressive";

/**
 * A named creative concept — a genuinely different structural strategy,
 * not a palette swap. "Demo neu erstellen" cycles through these (see
 * pickNextVariant) so repeated regeneration produces real variety
 * instead of the same layout with different colors.
 */
export interface ConceptVariant {
  id: string;
  name: string;
  description: string;
  heroStyle: HeroStyle;
  sectionOrder: SectionKey[];
  ctaIntensity: CtaIntensity;
  whitespaceScale: number;
  layoutDirectionOverride?: LayoutDirection;
  motionOverride?: MotionLevel;
  forceUse3d?: boolean;
}

export const CONCEPT_VARIANTS: ConceptVariant[] = [
  {
    id: "premium-editorial",
    name: "Premium Editorial",
    description:
      "Ruhige, redaktionelle Bildsprache mit alternierenden Text-/Bildblöcken und einem großformatigen Hero.",
    heroStyle: "full-bleed",
    sectionOrder: ["hero", "services", "editorial", "detail", "location", "about", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 1,
  },
  {
    id: "bold-conversion",
    name: "Bold Conversion",
    description:
      "Kräftige Farbflächen, sofort sichtbare Handlungsaufforderung, kompakte Abstände — auf schnelle Kontaktaufnahme ausgelegt.",
    heroStyle: "color-block",
    sectionOrder: ["hero", "services", "contact", "editorial", "detail", "about"],
    ctaIntensity: "aggressive",
    whitespaceScale: 0.78,
    layoutDirectionOverride: "bold-blocks",
  },
  {
    id: "immersive-visual",
    name: "Immersive Visual",
    description:
      "Großformatige, raumfüllende Bilder mit dramaturgischem Aufbau — die Location steht früh im Fokus.",
    heroStyle: "full-bleed",
    sectionOrder: ["hero", "location", "editorial", "services", "detail", "about", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 1.25,
    layoutDirectionOverride: "immersive-storytelling",
  },
  {
    id: "luxury-minimal",
    name: "Luxury Minimal",
    description:
      "Reduziert auf das Wesentliche: viel Weißraum, zurückhaltende Typografie, ein starkes Statement-Bild statt vieler Kacheln.",
    heroStyle: "minimal",
    sectionOrder: ["hero", "editorial", "about", "detail", "contact"],
    ctaIntensity: "minimal",
    whitespaceScale: 1.6,
    motionOverride: "subtle",
  },
  {
    id: "interactive-3d",
    name: "Interactive / 3D",
    description:
      "Signature-Variante mit animiertem 3D-Hero für einen technischen, hochwertigen Auftritt — besonders für Premium-/Technik-Branchen.",
    heroStyle: "3d",
    sectionOrder: ["hero", "services", "editorial", "location", "detail", "about", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 1,
    forceUse3d: true,
  },
];

/** Picks the next concept variant for a lead. When `preferredId` is
 * given (from the biggest X-ray problem category — see
 * preferredVariantFor in concept.ts) and hasn't been used yet, it wins:
 * this is what makes the demo genuinely react to the research instead
 * of only cycling for variety's sake. Otherwise prefers any variant
 * never used for this lead before; once every variant has been tried
 * at least once, cycles back to whichever has been used least. */
export function pickNextVariant(usedVariantIds: string[], preferredId?: string | null): ConceptVariant {
  if (preferredId && !usedVariantIds.includes(preferredId)) {
    const preferred = CONCEPT_VARIANTS.find((v) => v.id === preferredId);
    if (preferred) return preferred;
  }

  const unused = CONCEPT_VARIANTS.filter((v) => !usedVariantIds.includes(v.id));
  if (unused.length > 0) return unused[0];

  const counts = new Map<string, number>();
  for (const id of usedVariantIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  return CONCEPT_VARIANTS.reduce((least, v) => {
    const leastCount = counts.get(least.id) ?? 0;
    const vCount = counts.get(v.id) ?? 0;
    return vCount < leastCount ? v : least;
  }, CONCEPT_VARIANTS[0]);
}

export function getVariant(id: string): ConceptVariant {
  return CONCEPT_VARIANTS.find((v) => v.id === id) ?? CONCEPT_VARIANTS[0];
}
