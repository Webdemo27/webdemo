import type { AnalysisDimension, ScoreReason, WebsiteAnalysisData } from "../types";

/** Kept for display and for ordering the call list — NOT a gate any
 * more. See isQualified() for why.
 *
 * A lead at or above this scores as a strong opportunity. Measured
 * against the first 10 real scored leads the distribution ran 20–59, so
 * treat this as "clearly worth calling first", not as a pass mark. */
export const STRONG_OPPORTUNITY_SCORE = 45;

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

/**
 * Whether this lead is worth building a demo for.
 *
 * Deliberately NOT a score threshold any more. The old cutoff was 50,
 * and measured against every lead this system has actually scored, not
 * one reached it — 7 of 10 landed at 20–39, 3 at 40–59. The automated
 * pipeline could therefore never produce a demo; every demo in the
 * database was made by hand, past the gate. A threshold nobody passes is
 * not a filter, it is an off switch.
 *
 * Lowering the number would only move the guess. The gate existed
 * because a demo used to be expensive; it now costs about 46 seconds and
 * a few cents of image generation, and the industry clip is copied
 * rather than generated. What is actually scarce is the time to call
 * these businesses — so the score should ORDER that work, not block it,
 * and it does (see the call list's ranking).
 *
 * What genuinely disqualifies a lead is being unable to reach them at
 * all. No phone and no email means there is no way to start a
 * conversation, however weak their website is.
 */
export function isQualified(signals: { contactPhone: string | null; contactEmail: string | null }): boolean {
  return Boolean(signals.contactPhone || signals.contactEmail);
}
