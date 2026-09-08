import type { ContactConfidence, ContactPageKind, EmailCandidate } from "./types";

/** How trustworthy each source is, purely as "is this really the
 * business's own published contact channel" — never a claim about actual
 * mailbox deliverability (no send/verify probe exists in this system). */
const SOURCE_QUALITY: Record<ContactPageKind, number> = {
  Kontaktseite: 100,
  Impressum: 90,
  Startseite: 80,
  Datenschutzerklärung: 75,
  "Über uns": 75,
  Team: 75,
  OpenStreetMap: 50,
};

const CONFIDENCE_RANK: Record<ContactConfidence, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** "Direct contact person" beats a role inbox beats everything else —
 * matches the priority the sales workflow actually wants: a named human
 * replies faster than a shared info@ inbox. */
function localPartRank(email: string): number {
  const local = email.split("@")[0] ?? "";
  if (/^[a-z]+[._-][a-z]+$/.test(local)) return 0; // firstname.lastname-style
  if (local === "kontakt" || local === "contact") return 1;
  if (local === "info") return 2;
  return 3;
}

/** Very small local businesses commonly run their real inbox on a free
 * consumer provider rather than their own domain — that's still
 * genuinely theirs, so it must rank alongside an on-domain address, not
 * behind it. */
const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "outlook.de",
  "outlook.com",
  "hotmail.de",
  "hotmail.com",
  "icloud.com",
  "yahoo.de",
  "yahoo.com",
]);

/** 0 when the address is plausibly the business's *own* — same domain as
 * its website, or a free provider a one-person shop would plausibly use
 * itself — 1 for anything else (a web agency's credit line, a
 * government privacy office, a third-party directory listing). Without
 * this, an Impressum page that happens to also mention e.g. the agency
 * that built the site has no principled reason to rank the business's
 * own address first, and a coincidence like alphabetical order decides
 * who actually gets contacted. */
function domainMatchRank(email: string, businessDomain: string | null): number {
  const domain = email.split("@")[1] ?? "";
  if (!businessDomain) return FREE_EMAIL_PROVIDERS.has(domain) ? 0 : 1;
  if (domain === businessDomain || domain.endsWith(`.${businessDomain}`)) return 0;
  return FREE_EMAIL_PROVIDERS.has(domain) ? 0 : 1;
}

/** Deduplicates by normalized email, keeping the highest-confidence
 * finding for each address (a later, weaker source never downgrades an
 * already-confirmed one), then sorts best-first: confidence tier first
 * (a LOW candidate can never outrank a HIGH one, whatever its local
 * part), then whether the domain is plausibly the business's own (not
 * an incidentally-mentioned agency/regulator), then how "personal" the
 * address looks, then source quality. `businessDomain` is the lead's own
 * website hostname (e.g. "der-baecker-eifler.de"), or null when the
 * caller couldn't parse one. */
export function dedupeAndRank(
  candidates: EmailCandidate[],
  businessDomain: string | null = null
): EmailCandidate[] {
  const byEmail = new Map<string, EmailCandidate>();
  for (const c of candidates) {
    const existing = byEmail.get(c.email);
    if (!existing || CONFIDENCE_RANK[c.confidence] < CONFIDENCE_RANK[existing.confidence]) {
      byEmail.set(c.email, c);
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => {
    const conf = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
    if (conf !== 0) return conf;
    const domainMatch = domainMatchRank(a.email, businessDomain) - domainMatchRank(b.email, businessDomain);
    if (domainMatch !== 0) return domainMatch;
    const local = localPartRank(a.email) - localPartRank(b.email);
    if (local !== 0) return local;
    const quality = SOURCE_QUALITY[b.source] - SOURCE_QUALITY[a.source];
    if (quality !== 0) return quality;
    return a.email.localeCompare(b.email);
  });
}

/** 0-100 headline number for the dashboard — directly reflects the
 * primary candidate's source, per the documented ladder (100 = kontakt/
 * structured data on the lead's own site, 90 = Impressum, down to 50 for
 * a third-party directory like OpenStreetMap, 0 = nothing found). */
export function computeContactQualityScore(primary: EmailCandidate | null): number {
  if (!primary) return 0;
  return SOURCE_QUALITY[primary.source];
}
