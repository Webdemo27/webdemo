import type { LayoutDirection, MotionLevel } from "./types";

export type SectionKey = "hero" | "services" | "editorial" | "detail" | "location" | "about" | "contact";
export type HeroStyle = "full-bleed" | "minimal" | "3d" | "color-block";
export type CtaIntensity = "minimal" | "standard" | "aggressive";

/**
 * The animation SYSTEM a variant uses, not just an intensity level —
 * each is a genuinely different mechanism, not a duration/easing tweak
 * on the same one:
 * - "kinetic-stagger": the original vanilla IntersectionObserver reveal
 *   (template.ts's data-reveal system) — fast, punchy, snappy stagger.
 * - "editorial-fade": the same reveal system, but slower and gentler
 *   (longer duration, smaller travel distance) — quiet, refined.
 * - "energetic-punch": kinetic-stagger with a small scale overshoot on
 *   entrance for extra energy — still never scale(0), see animate skill.
 * - "cinematic-parallax": GSAP + ScrollTrigger — the hero visual drifts
 *   at a different speed than scroll, a real depth effect the vanilla
 *   system can't do.
 * - "scroll-scrub": GSAP + ScrollTrigger — image reveals are tied
 *   directly to scroll position (scrub) instead of firing once when
 *   scrolled into view.
 * - "none": no motion at all (paired with motionOverride: "none").
 * GSAP is only loaded via CDN for variants using the two GSAP-based
 * structures — everything else stays framework-free, same as the 3D
 * hero's Three.js is only loaded when a variant actually uses it. */
export type MotionStructure =
  | "kinetic-stagger"
  | "editorial-fade"
  | "energetic-punch"
  | "cinematic-parallax"
  | "scroll-scrub"
  | "none";

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
  motionStructure: MotionStructure;
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
    motionStructure: "editorial-fade",
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
    motionStructure: "kinetic-stagger",
  },
  {
    id: "immersive-visual",
    name: "Immersive Visual",
    description:
      "Großformatige, raumfüllende Bilder mit dramaturgischem Aufbau und Parallax-Tiefe im Hero — die Location steht früh im Fokus.",
    heroStyle: "full-bleed",
    sectionOrder: ["hero", "location", "editorial", "services", "detail", "about", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 1.25,
    layoutDirectionOverride: "immersive-storytelling",
    motionStructure: "cinematic-parallax",
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
    motionStructure: "editorial-fade",
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
    motionStructure: "kinetic-stagger",
    forceUse3d: true,
  },
  {
    id: "corporate",
    name: "Corporate",
    description:
      "Zurückhaltend und vertrauensbildend: Leistungen und Kompetenz stehen vor Atmosphäre, klares Raster, keine Ablenkung.",
    heroStyle: "minimal",
    sectionOrder: ["hero", "services", "about", "editorial", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 1.1,
    layoutDirectionOverride: "grid-clean",
    motionOverride: "none",
    motionStructure: "none",
  },
  {
    id: "asymmetric",
    name: "Asymmetric",
    description:
      "Modernes Magazin-Layout mit bewusst ungleichen Spaltenbreiten, versetzten Bildern und scroll-gekoppelten Bildaufdeckungen statt symmetrischer Kacheln.",
    heroStyle: "full-bleed",
    sectionOrder: ["hero", "editorial", "services", "location", "detail", "about", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 0.95,
    layoutDirectionOverride: "editorial-asymmetric",
    motionStructure: "scroll-scrub",
  },
  {
    id: "product-focused",
    name: "Product-Focused",
    description:
      "Leistungen/Produkte stehen direkt nach dem Hero im Zentrum — kurzer Weg vom ersten Eindruck zum Angebot.",
    heroStyle: "minimal",
    sectionOrder: ["hero", "services", "detail", "contact", "editorial", "about"],
    ctaIntensity: "standard",
    whitespaceScale: 0.9,
    layoutDirectionOverride: "grid-clean",
    motionStructure: "kinetic-stagger",
  },
  {
    id: "cinematic-story",
    name: "Cinematic Story",
    description:
      "Erzählt zuerst die Geschichte hinter dem Betrieb, bevor das Angebot kommt — mit Parallax-Tiefe im Hero für einen filmischen ersten Eindruck.",
    heroStyle: "full-bleed",
    sectionOrder: ["hero", "about", "editorial", "location", "services", "detail", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 1.3,
    layoutDirectionOverride: "immersive-storytelling",
    motionStructure: "cinematic-parallax",
  },
  {
    id: "architectural-grid",
    name: "Architectural Grid",
    description:
      "Präzises Raster, großformatiger Hero, Detailaufnahmen vor den Leistungen — scroll-gekoppelte Bildaufdeckungen statt einmaliger Einblendungen.",
    heroStyle: "full-bleed",
    sectionOrder: ["hero", "detail", "services", "editorial", "about", "location", "contact"],
    ctaIntensity: "standard",
    whitespaceScale: 0.85,
    layoutDirectionOverride: "grid-clean",
    motionStructure: "scroll-scrub",
  },
  {
    id: "dynamic-energy",
    name: "Dynamic Energy",
    description:
      "Dicht getaktet, sofort verkaufsorientiert, mit einem spürbaren Schwung beim Einblenden der Inhalte statt ruhigem Auftauchen.",
    heroStyle: "color-block",
    sectionOrder: ["hero", "services", "contact", "detail", "editorial", "location", "about"],
    ctaIntensity: "aggressive",
    whitespaceScale: 0.7,
    motionStructure: "energetic-punch",
  },
  {
    id: "quiet-confidence",
    name: "Quiet Confidence",
    description:
      "Sehr zurückhaltend: die Menschen hinter dem Betrieb stehen vor dem Angebot, großzügiger Weißraum, betont langsames Auftauchen der Inhalte.",
    heroStyle: "minimal",
    sectionOrder: ["hero", "about", "services", "editorial", "contact"],
    ctaIntensity: "minimal",
    whitespaceScale: 1.4,
    motionOverride: "subtle",
    motionStructure: "editorial-fade",
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
