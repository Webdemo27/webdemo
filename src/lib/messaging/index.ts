import type { WebsiteAnalysisData, AnalysisDimension } from "../types";
import {
  SUBJECT_TEMPLATES,
  OPENERS,
  BRIDGES_WITH_LINK,
  BRIDGES_NO_LINK,
  CLOSINGS,
  buildSignature,
  pickVariant,
} from "./templates";

export { BRIDGES_NO_LINK, BRIDGES_WITH_LINK };

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
  /** Real, publicly reachable HTTPS URL for the demo, or null if it
   * hasn't been deployed yet (Cloudflare, Phase 11). Never a localhost
   * path — when null, the message simply doesn't mention a link rather
   * than showing a placeholder or an unreachable address. */
  demoUrl: string | null;
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
  const closing = pickVariant(CLOSINGS, seed + ":closing");

  const bridgeLine = lead.demoUrl
    ? `${pickVariant(BRIDGES_WITH_LINK, seed + ":bridge")} ${lead.demoUrl}`
    : pickVariant(BRIDGES_NO_LINK, seed + ":bridge");

  const lines = [
    `Hallo,`,
    ``,
    opener,
    observation ? observation : null,
    ``,
    bridgeLine,
    ``,
    closing,
    ``,
    buildSignature(),
  ].filter((line): line is string => line !== null);

  return { subject, body: lines.join("\n") };
}

/**
 * Swaps a message's "I'll send you the link separately" promise for the
 * real link, once one exists — used right after a successful Cloudflare
 * publish so an already-approved message (approved before any public
 * URL existed, which is the normal order of events) doesn't sit there
 * with a broken promise. Deliberately a targeted text substitution, not
 * a call to generateMessage(): it preserves everything the human
 * actually reviewed and approved (the specific observation, the exact
 * wording) and only ever changes the one sentence that promised a link,
 * never resets approval/rejection/sent state. Returns the original body
 * unchanged if the link is already present or no matching "no link"
 * phrase is found (e.g. the message was hand-edited into something
 * unrecognizable) — appends a clearly-separated fallback line in that
 * last case rather than silently doing nothing, since a human should
 * still get the link somehow.
 */
export function insertDemoLink(body: string, url: string): string {
  if (body.includes(url)) return body;

  for (let i = 0; i < BRIDGES_NO_LINK.length; i++) {
    if (body.includes(BRIDGES_NO_LINK[i])) {
      return body.replace(BRIDGES_NO_LINK[i], `${BRIDGES_WITH_LINK[i]} ${url}`);
    }
  }

  return `${body}\n\nDen Link zur Demo reiche ich hiermit nach: ${url}`;
}
