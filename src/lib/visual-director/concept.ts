import type { WebsiteAnalysisData, ScoreReason } from "../types";
import type { ConceptVariant } from "./variants";
import type { VisualProfile } from "./types";
import { MARKET_PRICE_SOURCES, averageMarketAnchor, averageOfferPrice, type MarketPriceSource } from "../pricing/market-data";

export type ProblemCategory = "technical" | "ux" | "trust" | "conversion" | "brand";

export interface ProblemFinding {
  category: ProblemCategory;
  label: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface MoneyImpactScenario {
  label: "current" | "improved" | "potential";
  monthlyVisitors: number;
  conversionRatePct: number;
  monthlyLeads: number;
}

export interface DesignRationale {
  section: string;
  why: string;
}

export interface KeyChange {
  before: string;
  after: string;
  why: string;
}

export interface PricingEstimate {
  sources: MarketPriceSource[];
  averageMarketAnchor: number;
  recommendedOfferPrice: number;
  currency: "EUR";
  disclaimer: string;
}

export interface SalesObjection {
  objection: string;
  response: string;
}

export interface DemoConcept {
  businessProfile: {
    companyName: string;
    industry: string | null;
    specialty: string | null;
    location: string | null;
    hasRealPhotos: boolean;
  };
  websiteAudit: {
    websiteScore: number | null;
    strengths: string[];
    weaknesses: string[];
  };
  xray: {
    problems: ProblemFinding[];
    biggestProblemCategory: ProblemCategory | null;
  };
  opportunityMap: {
    opportunities: string[];
    moneyImpact: MoneyImpactScenario[];
    moneyImpactDisclaimer: string;
  };
  scoring: {
    salesOpportunityScore: number;
    tier: "hot" | "warm" | "cold";
    wowPotential: number;
  };
  contentStructure: { sectionOrder: string[] };
  designConcept: {
    variantId: string;
    variantName: string;
    variantDescription: string;
    rationale: DesignRationale[];
  };
  keyChanges: KeyChange[];
  pricing: PricingEstimate;
  objections: SalesObjection[];
}

const DIMENSION_META: Record<
  string,
  { label: string; category: ProblemCategory }
> = {
  performance: { label: "Performance", category: "technical" },
  accessibility: { label: "Accessibility", category: "technical" },
  mobileUx: { label: "Mobile UX", category: "ux" },
  navigation: { label: "Navigation", category: "ux" },
  content: { label: "Informationsarchitektur / Content", category: "ux" },
  trust: { label: "Vertrauenssignale", category: "trust" },
  contactExperience: { label: "Kontaktaufnahme", category: "trust" },
  cta: { label: "Call-to-Action / Conversion-Führung", category: "conversion" },
  conversionPotential: { label: "Conversion-Potenzial", category: "conversion" },
  design: { label: "Gestaltung / Positionierung", category: "brand" },
};

function severityFor(score: number): "low" | "medium" | "high" {
  if (score < 25) return "high";
  if (score < 45) return "medium";
  return "low";
}

/** X-ray, step 1: bucket every verified weak dimension into the five
 * business-problem categories the user asked for, instead of raw
 * technical dimension names — this is what makes it read as a business
 * audit rather than a lint report. Only ever built from dimensions the
 * analysis actually verified. */
export function buildXray(analysis: WebsiteAnalysisData): { problems: ProblemFinding[]; biggestProblemCategory: ProblemCategory | null } {
  const problems: ProblemFinding[] = [];
  let weakest: { key: string; score: number } | null = null;

  for (const [key, meta] of Object.entries(DIMENSION_META)) {
    const dim = (analysis as unknown as Record<string, { score: number | null; verifiable: boolean; notes: string[] }>)[key];
    if (!dim || !dim.verifiable || dim.score == null) continue;
    if (dim.score < 55) {
      problems.push({
        category: meta.category,
        label: meta.label,
        severity: severityFor(dim.score),
        detail: dim.notes[0] ?? `${meta.label}: ${dim.score}/100`,
      });
    }
    if (!weakest || dim.score < weakest.score) weakest = { key, score: dim.score };
  }

  problems.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const biggestProblemCategory = weakest ? DIMENSION_META[weakest.key]?.category ?? null : null;
  return { problems, biggestProblemCategory };
}

/** Money Impact, step 2: illustrative conversion-funnel scenarios, never
 * a claimed real revenue figure. The visitor baseline is a clearly
 * labeled round assumption (matching the brief's own example), not a
 * measurement — every scenario carries the same disclaimer in the UI. */
function buildMoneyImpact(): { moneyImpact: MoneyImpactScenario[]; disclaimer: string } {
  const monthlyVisitors = 100;
  const scenarios: MoneyImpactScenario[] = [
    { label: "current", monthlyVisitors, conversionRatePct: 2, monthlyLeads: Math.round(monthlyVisitors * 0.02) },
    { label: "improved", monthlyVisitors, conversionRatePct: 4, monthlyLeads: Math.round(monthlyVisitors * 0.04) },
    { label: "potential", monthlyVisitors, conversionRatePct: 6, monthlyLeads: Math.round(monthlyVisitors * 0.06) },
  ];
  return {
    moneyImpact: scenarios,
    disclaimer:
      "Illustrative Schätzung auf Basis angenommener Besucherzahlen — keine gemessenen Umsätze oder echten Analytics-Daten.",
  };
}

// Each category maps to a genuinely distinct variant — these used to
// collapse trust/ux/technical all onto "premium-editorial", meaning most
// leads (these three categories are the most common X-ray findings) got
// the exact same concept. Matched semantically instead: a weak-trust
// site gets the variant literally built to be "vertrauensbildend"
// (corporate), a confusing-UX site gets the one with the shortest path
// from hero to offer (product-focused), a weak-performance/technical
// site gets the precise, structured one (architectural-grid).
const CATEGORY_PREFERRED_VARIANT: Record<ProblemCategory, string> = {
  conversion: "bold-conversion",
  brand: "immersive-visual",
  trust: "corporate",
  ux: "product-focused",
  technical: "architectural-grid",
};

export function preferredVariantFor(category: ProblemCategory | null): string | null {
  return category ? CATEGORY_PREFERRED_VARIANT[category] : null;
}

function wowPotential(input: {
  realImageCount: number;
  profile: VisualProfile;
  designScore: { verifiable: boolean; score: number | null };
}): number {
  let score = 20;
  score += Math.min(input.realImageCount * 6, 30);

  if (input.profile.use3d) score += 25;
  else if (input.profile.layoutDirection === "immersive-storytelling") score += 20;
  else if (input.profile.layoutDirection === "editorial-asymmetric") score += 12;
  else score += 6;

  if (input.designScore.verifiable && input.designScore.score != null) {
    score += input.designScore.score < 30 ? 25 : 10;
  } else {
    score += 15; // unknown current design — real before/after contrast still plausible
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function salesOpportunityScore(leadScore: number, wow: number): { score: number; tier: "hot" | "warm" | "cold" } {
  const score = Math.round(leadScore * 0.6 + wow * 0.4);
  const tier = score >= 65 ? "hot" : score >= 40 ? "warm" : "cold";
  return { score, tier };
}

/** Real, sourced German web-design market pricing (see
 * pricing/market-data.ts) for a one-page local-business site — the
 * closest comparable to what this project builds. Each source's offer
 * price is exactly its documented market anchor minus €100; the
 * recommended price is the average across all three sources. Nothing
 * here is invented, and nothing varies by variant/industry — the
 * market data doesn't know or care which concept was chosen. */
function buildPricing(): PricingEstimate {
  return {
    sources: MARKET_PRICE_SOURCES,
    averageMarketAnchor: averageMarketAnchor(),
    recommendedOfferPrice: averageOfferPrice(),
    currency: "EUR",
    disclaimer:
      "Recherchierte Marktpreise für vergleichbare Onepager-Websites (3 Quellen, siehe Tabelle) — Angebotspreis je Quelle = Marktanker − 100 €. Kein automatisch verbindliches Angebot.",
  };
}

const OBJECTION_BANK: Record<ProblemCategory, SalesObjection> = {
  conversion: {
    objection: '"Meine Website funktioniert doch, ich bekomme ja Anfragen."',
    response:
      "Das ist ein gutes Zeichen — die Frage ist, wie viele Anfragen liegenbleiben, weil der nächste Schritt nicht sofort klar ist. Schon kleine Verbesserungen an der Handlungsaufforderung können das ohne Risiko testen lassen.",
  },
  trust: {
    objection: '"Ich habe keine Zeit, mich um eine neue Website zu kümmern."',
    response:
      "Genau deshalb liegt hier schon ein fertiges Konzept vor, das Sie sich unverbindlich ansehen können — der Aufwand für Sie ist zunächst nur, kurz reinzuschauen.",
  },
  brand: {
    objection: '"Sieht meine Website nicht gut genug aus?"',
    response:
      "Es geht weniger um gut oder schlecht als um zeitgemäß — Kund:innen vergleichen unbewusst mit dem, was sie sonst online sehen. Das Konzept zeigt, wie sich das mit denselben Inhalten moderner darstellen lässt.",
  },
  ux: {
    objection: '"Was bringt mir eine neue Website konkret?"',
    response:
      "Vor allem, dass neue Besucher:innen schneller finden, was sie suchen — das senkt die Hürde für eine erste Kontaktaufnahme spürbar.",
  },
  technical: {
    objection: '"Ist das nicht teuer und aufwendig?"',
    response:
      "Der erste Schritt kostet Sie nichts — das Demo-Konzept steht bereits. Über Umfang und Preis lässt sich in Ruhe sprechen, erst wenn es für Sie wirklich passt.",
  },
};

function buildKeyChanges(analysis: WebsiteAnalysisData, problems: ProblemFinding[]): KeyChange[] {
  const afterByCategory: Record<ProblemCategory, string> = {
    technical: "Schlanke, schnell ladende Seite ohne unnötigen Ballast.",
    ux: "Klare Struktur — Angebot und nächster Schritt sofort erkennbar.",
    trust: "Direkter Kontaktweg und ruhige, glaubwürdige Bildsprache.",
    conversion: "Prominente, wiederkehrende Handlungsaufforderung.",
    brand: "Moderne, zur Branche passende Gestaltung mit klarer Positionierung.",
  };

  return problems.slice(0, 3).map((p) => ({
    before: p.detail,
    after: afterByCategory[p.category],
    why: `${p.label} wurde als Schwachstelle erkannt (Schweregrad: ${p.severity}).`,
  }));
}

function buildRationale(
  biggestProblemCategory: ProblemCategory | null,
  variant: ConceptVariant,
  analysis: WebsiteAnalysisData
): DesignRationale[] {
  const rationale: DesignRationale[] = [];

  if (biggestProblemCategory === "conversion") {
    rationale.push({
      section: "Call-to-Action",
      why: "Die Handlungsaufforderung war auf der bisherigen Website schwach oder schwer auffindbar — deshalb ist sie hier prominent und wiederholt platziert.",
    });
  } else if (biggestProblemCategory === "ux" || biggestProblemCategory === "technical") {
    rationale.push({
      section: "Struktur",
      why: "Inhalte waren bisher schwer auffindbar — deshalb steht das Kernangebot direkt im Hero, nicht erst nach mehreren Abschnitten.",
    });
  } else if (biggestProblemCategory === "brand") {
    rationale.push({
      section: "Visuelle Gestaltung",
      why: "Die bisherige Gestaltung wirkte veraltet oder unentschieden — deshalb wurde eine hochwertigere, redaktionelle Bildsprache gewählt.",
    });
  } else if (biggestProblemCategory === "trust") {
    rationale.push({
      section: "Vertrauen & Atmosphäre",
      why: "Vertrauenssignale und Kontaktaufnahme waren bisher schwach — deshalb liegt der Fokus auf ruhiger, glaubwürdiger Bildsprache und einem direkten Kontaktweg.",
    });
  }

  rationale.push({
    section: "Konzept",
    why: `Variante "${variant.name}" gewählt: ${variant.description}`,
  });

  if (analysis.cta.verifiable && analysis.cta.score != null && analysis.cta.score < 40) {
    rationale.push({
      section: "CTA-Intensität",
      why: `Call-to-Action war bisher schwach (${analysis.cta.score}/100) — deshalb ${variant.ctaIntensity === "aggressive" ? "mehrfache, deutlich sichtbare" : "eine klare"} Handlungsaufforderung.`,
    });
  }

  return rationale;
}

export interface BuildConceptInput {
  companyName: string;
  industry: string | null;
  specialty: string | null;
  location: string | null;
  analysis: WebsiteAnalysisData;
  leadScore: number;
  realImageCount: number;
  variant: ConceptVariant;
  profile: VisualProfile;
}

/** Assembles the full research-driven concept: Business Profile →
 * Website Audit → Opportunity Map (X-Ray + Money Impact) → Sales
 * Scoring → Content Structure → Design Concept (with reasoning) → Key
 * Changes → Pricing → Objections. Every field traces back to real
 * analysis/lead data or a clearly disclaimed illustrative formula —
 * nothing here is invented about the business itself. */
export function buildDemoConcept(input: BuildConceptInput): DemoConcept {
  const { problems, biggestProblemCategory } = buildXray(input.analysis);
  const { moneyImpact, disclaimer } = buildMoneyImpact();
  const wow = wowPotential({
    realImageCount: input.realImageCount,
    profile: input.profile,
    designScore: { verifiable: input.analysis.design.verifiable, score: input.analysis.design.score },
  });
  const { score, tier } = salesOpportunityScore(input.leadScore, wow);

  return {
    businessProfile: {
      companyName: input.companyName,
      industry: input.industry,
      specialty: input.specialty,
      location: input.location,
      hasRealPhotos: input.realImageCount > 0,
    },
    websiteAudit: {
      websiteScore: null,
      strengths: input.analysis.strengths,
      weaknesses: input.analysis.weaknesses,
    },
    xray: { problems, biggestProblemCategory },
    opportunityMap: {
      opportunities: input.analysis.opportunities,
      moneyImpact,
      moneyImpactDisclaimer: disclaimer,
    },
    scoring: { salesOpportunityScore: score, tier, wowPotential: wow },
    contentStructure: { sectionOrder: input.variant.sectionOrder },
    designConcept: {
      variantId: input.variant.id,
      variantName: input.variant.name,
      variantDescription: input.variant.description,
      rationale: buildRationale(biggestProblemCategory, input.variant, input.analysis),
    },
    keyChanges: buildKeyChanges(input.analysis, problems),
    pricing: buildPricing(),
    objections: Array.from(
      new Set([biggestProblemCategory, ...problems.slice(0, 2).map((p) => p.category)].filter(Boolean))
    )
      .slice(0, 3)
      .map((cat) => OBJECTION_BANK[cat as ProblemCategory]),
  };
}

export type { ScoreReason };
