export type ContactConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ContactPageKind =
  | "Kontaktseite"
  | "Impressum"
  | "Startseite"
  | "Datenschutzerklärung"
  | "Über uns"
  | "Team"
  | "OpenStreetMap";

/** One real, sourced email finding — never a guess. `sourceUrl` always
 * points at the exact page it was read from, so a human can verify it in
 * one click. */
export interface EmailCandidate {
  email: string;
  source: ContactPageKind;
  sourceUrl: string;
  confidence: ContactConfidence;
  /** ISO timestamp — when this candidate was (re)confirmed. */
  foundAt: string;
}

export interface ContactDiscoveryResult {
  /** All distinct candidates found, best first. */
  candidates: EmailCandidate[];
  primary: EmailCandidate | null;
  /** 0-100, see rank.ts — reflects how trustworthy the *source* is, never
   * a claim that the mailbox itself is confirmed deliverable (no send
   * probe is ever performed). */
  contactQualityScore: number;
  pagesChecked: string[];
  error: string | null;
}
