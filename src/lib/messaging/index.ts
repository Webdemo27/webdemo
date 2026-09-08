import type { WebsiteAnalysisData, AnalysisDimension } from "../types";
import { SUBJECT_TEMPLATES, OPENERS, BRIDGES, CLOSINGS, SIGNOFF, pickVariant } from "./templates";

const OBSERVATION_CANDIDATES: Array<keyof WebsiteAnalysisData> = [
  "mobileUx",
  "cta",
  "design",
  "performance",
  "content",
  "contactExperience",
];

const OBSERVATION_LEAD_INS = [
  "Dabei ist mir aufgefallen:",
  "Mir ist aufgefallen:",
  "Dabei fiel mir auf:",
];

function pickKeyObservation(analysis: WebsiteAnalysisData, seed: string): string | null {
  let best: { note: string; score: number } | null = null;

  for (const key of OBSERVATION_CANDIDATES) {
    const dim = analysis[key] as AnalysisDimension;
    if (!dim.verifiable || dim.score == null || dim.notes.length === 0) continue;
    if (!best || dim.score < best.score) {
      best = { note: dim.notes[0], score: dim.score };
    }
  }

  if (!best) return null;
  return `${pickVariant(OBSERVATION_LEAD_INS, seed + ":observation")} ${best.note}`;
}

export interface MessageContext {
  companyName: string;
  location: string | null;
}

export interface GeneratedMessage {
  subject: string;
  body: string;
}

/** Assembles a short, natural outreach draft from real analysis findings
 * — never an invented claim, never mass-marketing copy. This is a
 * template-based generator (no external LLM call, since that would
 * require API credentials this project doesn't have configured); the
 * one genuine per-lead detail is the analysis observation and the demo
 * reference. Output is always a DRAFT — it stops at WAITING_FOR_REVIEW
 * and a human must read, optionally edit, and approve it before anything
 * is ever sent. */
export function generateMessage(
  lead: MessageContext,
  analysis: WebsiteAnalysisData,
  seed: string
): GeneratedMessage {
  const location = lead.location ?? "Ihrer Region";
  const observation = pickKeyObservation(analysis, seed);

  const subject = pickVariant(SUBJECT_TEMPLATES, seed).replace("{company}", lead.companyName);
  const opener = pickVariant(OPENERS, seed + ":opener")
    .replace("{company}", lead.companyName)
    .replace("{location}", location);
  const bridge = pickVariant(BRIDGES, seed + ":bridge");
  const closing = pickVariant(CLOSINGS, seed + ":closing");

  const lines = [
    `Hallo,`,
    ``,
    opener,
    observation ? observation : null,
    ``,
    `${bridge} [Demo-Link einfügen]`,
    ``,
    closing,
    ``,
    SIGNOFF,
  ].filter((line): line is string => line !== null);

  return { subject, body: lines.join("\n") };
}
