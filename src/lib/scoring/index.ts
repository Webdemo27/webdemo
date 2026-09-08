import type { AnalysisDimension, ScoreReason, WebsiteAnalysisData } from "../types";

/** A lead qualifies for demo/message generation once its score reaches
 * this threshold. One named constant so the cutoff is easy to find and
 * tune, and never silently duplicated. */
export const QUALIFICATION_THRESHOLD = 50;

interface ScoringFactor {
  key: string;
  label: string;
  weight: number;
  dimension: AnalysisDimension;
}

/** Every factor is framed as "quality" (0 = bad site, 100 = great site).
 * The lead score is the inverse (opportunity for us), weighted, and
 * computed ONLY from dimensions the analysis actually verified — an
 * unverifiable dimension contributes nothing rather than a guessed
 * value, so the score never gets artificially inflated. */
function buildFactors(analysis: WebsiteAnalysisData): ScoringFactor[] {
  return [
    { key: "design", label: "Design veraltet", weight: 0.15, dimension: analysis.design },
    { key: "mobileUx", label: "Mobile UX schwach", weight: 0.2, dimension: analysis.mobileUx },
    { key: "performance", label: "Performance schwach", weight: 0.1, dimension: analysis.performance },
    { key: "cta", label: "Call-to-Action fehlt/schwach", weight: 0.15, dimension: analysis.cta },
    {
      key: "contactExperience",
      label: "Kontaktaufnahme unnötig schwierig",
      weight: 0.15,
      dimension: analysis.contactExperience,
    },
    { key: "content", label: "Leistungen schlecht präsentiert", weight: 0.1, dimension: analysis.content },
    {
      key: "conversionPotential",
      label: "Ungenutztes Conversion-Potenzial",
      weight: 0.15,
      dimension: analysis.conversionPotential,
    },
  ];
}

export interface LeadScoreResult {
  leadScore: number;
  reasons: ScoreReason[];
}

/** Computes a transparent 0-100 lead (opportunity) score from a website
 * analysis plus whether the business is actually reachable. Every point
 * traces back to a named, weighted factor in `reasons` — nothing here is
 * a black box, and nothing is invented for data we don't have. */
export function scoreLead(
  analysis: WebsiteAnalysisData,
  businessSignals: { hasContactInfo: boolean }
): LeadScoreResult {
  const factors = buildFactors(analysis);
  const usable = factors.filter((f) => f.dimension.verifiable && f.dimension.score != null);
  const totalWeight = usable.reduce((sum, f) => sum + f.weight, 0);

  const reasons: ScoreReason[] = [];
  let weightedOpportunity = 0;

  for (const f of usable) {
    const quality = f.dimension.score as number;
    const opportunity = 100 - quality;
    const normalizedWeight = totalWeight > 0 ? f.weight / totalWeight : 0;
    weightedOpportunity += opportunity * normalizedWeight;

    reasons.push({
      factor: f.label,
      weight: Math.round(normalizedWeight * 100) / 100,
      contribution: Math.round(opportunity * normalizedWeight),
      detail: `Website-Qualität in diesem Bereich: ${quality}/100.`,
    });
  }

  for (const f of factors) {
    if (usable.includes(f)) continue;
    reasons.push({
      factor: f.label,
      weight: 0,
      contribution: 0,
      detail: "Nicht überprüfbar — fließt nicht in die Bewertung ein.",
    });
  }

  let score = totalWeight > 0 ? weightedOpportunity : 0;

  if (businessSignals.hasContactInfo) {
    score += 5;
    reasons.push({
      factor: "Kontaktdaten vorhanden",
      weight: 0.05,
      contribution: 5,
      detail: "Telefon oder Adresse bekannt — Ansprache ist praktisch möglich.",
    });
  } else {
    reasons.push({
      factor: "Keine Kontaktdaten bekannt",
      weight: 0,
      contribution: 0,
      detail: "Weder Telefon noch Adresse bekannt — erschwert die Kontaktaufnahme zusätzlich.",
    });
  }

  reasons.sort((a, b) => b.contribution - a.contribution);

  return { leadScore: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export function isQualified(leadScore: number): boolean {
  return leadScore >= QUALIFICATION_THRESHOLD;
}
