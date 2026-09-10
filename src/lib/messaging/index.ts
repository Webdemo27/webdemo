import type { WebsiteAnalysisData, AnalysisDimension } from "../types";
import {
  SUBJECT_TEMPLATES,
  OPENERS,
  ACKNOWLEDGEMENTS,
  OBSERVATION_LEAD_INS,
  FEELING_LINES,
  ASKS,
  BRIDGES_WITH_LINK,
  BRIDGES_NO_LINK,
  CLOSINGS,
  buildSalutation,
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

/**
 * The analysis notes are written for us, not for the recipient — things
 * like "3564 Wörter sichtbarer Text, 0 H1-Überschrift(en)". A café owner
 * does not know what an H1 is, and a sentence they cannot decode cannot
 * make them feel anything, which defeats the point of the message.
 *
 * So each dimension gets a plain sentence about what a visitor actually
 * experiences. This states an implication, never an invented claim: the
 * dimension really did score lowest and really is verifiable, and the
 * raw finding still travels along in brackets for anyone who wants it.
 */
const OBSERVATION_IN_PLAIN_GERMAN: Record<string, string> = {
  mobileUx: "Am Handy ist die Seite schwer zu bedienen — und die meisten Ihrer Kunden schauen genau dort zuerst.",
  cta: "Es ist nicht auf Anhieb klar, was ein Interessent als Nächstes tun soll — anrufen, schreiben, vorbeikommen.",
  design: "Der Auftritt wirkt älter, als Ihr Betrieb es ist.",
  performance: "Die Seite braucht spürbar lange zum Laden. Die meisten Besucher warten das nicht ab.",
  content: "Der Text macht es Besuchern schwer, schnell zu erfassen, worum es geht.",
  contactExperience: "Wer Sie erreichen möchte, muss dafür suchen.",
};

function pickKeyObservation(analysis: WebsiteAnalysisData): { plain: string; detail: string } | null {
  let best: { key: string; note: string; score: number } | null = null;

  for (const key of OBSERVATION_CANDIDATES) {
    const dim = analysis[key] as AnalysisDimension;
    if (!dim.verifiable || dim.score == null || dim.notes.length === 0) continue;
    if (!best || dim.score < best.score) {
      best = { key, note: dim.notes[0], score: dim.score };
    }
  }

  if (!best) return null;
  const plain = OBSERVATION_IN_PLAIN_GERMAN[best.key];
  if (!plain) return null;
  return { plain, detail: best.note };
}

export interface MessageContext {
  companyName: string;
  /** Real contact person if research found one — used only when it
   * already carries a form of address, see buildSalutation(). */
  contactName?: string | null;
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
  const fill = (text: string) =>
    text.replace(/\{company\}/g, lead.companyName).replace(/\{location\}/g, location);

  const observation = pickKeyObservation(analysis);

  const subject = fill(pickVariant(SUBJECT_TEMPLATES, seed));
  const opener = fill(pickVariant(OPENERS, seed + ":opener"));
  const acknowledgement = pickVariant(ACKNOWLEDGEMENTS, seed + ":ack");
  const feeling = pickVariant(FEELING_LINES, seed + ":feeling");
  const ask = pickVariant(ASKS, seed + ":ask");
  const closing = pickVariant(CLOSINGS, seed + ":closing");

  const bridgeLine = lead.demoUrl
    ? `${fill(pickVariant(BRIDGES_WITH_LINK, seed + ":bridge"))} ${lead.demoUrl}`
    : fill(pickVariant(BRIDGES_NO_LINK, seed + ":bridge"));

  // The observation only appears once the reader's competence has been
  // acknowledged. On its own, straight after the greeting, it reads as
  // "your website is bad" — which is the fastest way to lose someone who
  // has run their business for twenty years.
  const observationBlock = observation
    ? `${acknowledgement} ${pickVariant(OBSERVATION_LEAD_INS, seed + ":observation")} ${observation.plain} (${observation.detail})`
    : null;

  const lines = [
    buildSalutation(lead.contactName ?? null),
    ``,
    opener,
    ``,
    observationBlock,
    observationBlock ? `` : null,
    feeling,
    ``,
    bridgeLine,
    ``,
    ask,
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
