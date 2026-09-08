import * as cheerio from "cheerio";
import { fetchPage } from "./fetch-page";
import {
  checkMobileUx,
  checkNavigation,
  checkPerformance,
  checkContent,
  checkCta,
  checkTrust,
  checkContactExperience,
  checkAccessibility,
  checkDesign,
  computeConversionPotential,
} from "./checks";
import type { AnalysisDimension, WebsiteAnalysisData } from "../types";

export { fetchPage } from "./fetch-page";

export interface AnalysisOutcome {
  data: WebsiteAnalysisData;
  websiteScore: number | null;
}

function unverifiable(note: string): AnalysisDimension {
  return { score: null, verifiable: false, notes: [note] };
}

/** Analyzes a business website and derives a transparent 0-100 quality
 * score. Every dimension is either backed by a real, checkable signal
 * from the fetched HTML, or explicitly marked not verifiable — nothing
 * here is guessed or invented. A failed fetch still returns a complete,
 * consistent result (all dimensions unverifiable) instead of throwing,
 * so one broken site never stops a research/analysis run. */
export async function analyzeWebsite(url: string): Promise<AnalysisOutcome> {
  const result = await fetchPage(url);

  if (!result.ok) {
    const note = `Website konnte nicht abgerufen werden: ${result.error}`;
    const unreachable = unverifiable(note);
    const data: WebsiteAnalysisData = {
      design: unreachable,
      mobileUx: unreachable,
      navigation: unreachable,
      performance: unreachable,
      content: unreachable,
      cta: unreachable,
      trust: unreachable,
      contactExperience: unreachable,
      accessibility: unreachable,
      conversionPotential: unreachable,
      strengths: [],
      weaknesses: [],
      opportunities: ["Website-Erreichbarkeit prüfen und Analyse erneut ausführen."],
      rawSignals: { fetchError: result.error },
    };
    return { data, websiteScore: null };
  }

  const { page } = result;
  const $ = cheerio.load(page.html);

  const design = checkDesign($);
  const mobileUx = checkMobileUx($);
  const navigation = checkNavigation($);
  const performance = checkPerformance(page);
  const content = checkContent($);
  const cta = checkCta($);
  const trust = checkTrust($, page);
  const contactExperience = checkContactExperience($);
  const accessibility = checkAccessibility($);
  const conversionPotential = computeConversionPotential({ cta, contactExperience, content, trust });

  const allDimensions = [
    design,
    mobileUx,
    navigation,
    performance,
    content,
    cta,
    trust,
    contactExperience,
    accessibility,
  ];

  const { strengths, weaknesses, opportunities } = deriveSummary({
    design,
    mobileUx,
    navigation,
    performance,
    content,
    cta,
    trust,
    contactExperience,
    accessibility,
  });

  const verifiableScores = allDimensions.filter((d) => d.verifiable && d.score != null);
  const websiteScore =
    verifiableScores.length > 0
      ? Math.round(
          verifiableScores.reduce((sum, d) => sum + (d.score as number), 0) / verifiableScores.length
        )
      : null;

  const data: WebsiteAnalysisData = {
    design,
    mobileUx,
    navigation,
    performance,
    content,
    cta,
    trust,
    contactExperience,
    accessibility,
    conversionPotential,
    strengths,
    weaknesses,
    opportunities,
    rawSignals: {
      finalUrl: page.finalUrl,
      httpStatus: page.status,
      https: page.https,
      fetchMs: page.fetchMs,
      sizeBytes: page.sizeBytes,
    },
  };

  return { data, websiteScore };
}

const DIMENSION_LABELS: Record<string, string> = {
  design: "Design",
  mobileUx: "Mobile UX",
  navigation: "Navigation",
  performance: "Performance",
  content: "Content",
  cta: "Call-to-Action",
  trust: "Trust",
  contactExperience: "Kontaktaufnahme",
  accessibility: "Accessibility",
};

function deriveSummary(dims: Record<string, AnalysisDimension>) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];

  for (const [key, dim] of Object.entries(dims)) {
    if (!dim.verifiable || dim.score == null) continue;
    const label = DIMENSION_LABELS[key] ?? key;
    if (dim.score >= 70) {
      strengths.push(`${label}: ${dim.notes[0] ?? "gut"}`);
    } else if (dim.score <= 35) {
      weaknesses.push(`${label}: ${dim.notes[0] ?? "schwach"}`);
      opportunities.push(`${label} verbessern: ${dim.notes[0] ?? ""}`.trim());
    }
  }

  return { strengths, weaknesses, opportunities };
}
