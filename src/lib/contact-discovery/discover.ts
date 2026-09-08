import * as cheerio from "cheerio";
import { fetchPage } from "../analysis/fetch-page";
import { discoverCandidatePages } from "./pages";
import { extractEmailsFromHtml } from "./extract-emails";
import { dedupeAndRank, computeContactQualityScore } from "./rank";
import type { ContactDiscoveryResult, ContactPageKind, EmailCandidate } from "./types";

export * from "./types";

const PAGE_CONFIDENCE: Record<ContactPageKind, "HIGH" | "MEDIUM" | "LOW"> = {
  Kontaktseite: "HIGH",
  Impressum: "HIGH",
  Startseite: "MEDIUM",
  Datenschutzerklärung: "MEDIUM",
  "Über uns": "MEDIUM",
  Team: "MEDIUM",
  OpenStreetMap: "MEDIUM",
};

/**
 * Real, public-record contact-email discovery for one lead's website —
 * never a guess, never a generated address. Crawls the homepage plus a
 * bounded set of linked pages that German business sites are legally or
 * conventionally expected to carry (Impressum, Kontakt, Datenschutz,
 * Team, Über uns), extracts every plausible business email from each,
 * and ranks them by how authoritative the source page is. A failed fetch
 * or a site with nothing findable is a normal, expected outcome — this
 * never throws, matching the rest of analysis/'s "mark unverifiable,
 * don't invent" discipline.
 *
 * `externalCandidates` lets a caller fold in an email from a source this
 * module doesn't crawl itself (e.g. an OpenStreetMap `contact:email` tag
 * already fetched during research) so ranking happens once, consistently,
 * across every source.
 */
export async function discoverContactEmails(
  websiteUrl: string,
  externalCandidates: EmailCandidate[] = []
): Promise<ContactDiscoveryResult> {
  const pagesChecked: string[] = [];
  const found: EmailCandidate[] = [...externalCandidates];
  const now = new Date().toISOString();
  const businessDomain = (() => {
    try {
      return new URL(websiteUrl).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  const homepage = await fetchPage(websiteUrl);
  if (!homepage.ok) {
    const ranked = dedupeAndRank(found, businessDomain);
    return {
      candidates: ranked,
      primary: ranked[0] ?? null,
      contactQualityScore: computeContactQualityScore(ranked[0] ?? null),
      pagesChecked,
      error: `Website nicht erreichbar (${homepage.error}) — nur externe Quellen berücksichtigt.`,
    };
  }

  pagesChecked.push(homepage.page.finalUrl);
  const $home = cheerio.load(homepage.page.html);
  addCandidates(found, extractEmailsFromHtml(homepage.page.html), "Startseite", homepage.page.finalUrl, now);

  const linkedPages = discoverCandidatePages($home, homepage.page.finalUrl, homepage.page.finalUrl);
  for (const { url, kind } of linkedPages) {
    const res = await fetchPage(url);
    if (!res.ok) continue;
    pagesChecked.push(res.page.finalUrl);
    addCandidates(found, extractEmailsFromHtml(res.page.html), kind, res.page.finalUrl, now);
  }

  const ranked = dedupeAndRank(found, businessDomain);
  const primary = ranked[0] ?? null;

  return {
    candidates: ranked,
    primary,
    contactQualityScore: computeContactQualityScore(primary),
    pagesChecked,
    error: primary ? null : "Keine öffentliche geschäftliche E-Mail-Adresse gefunden.",
  };
}

function addCandidates(
  into: EmailCandidate[],
  emails: Set<string>,
  source: ContactPageKind,
  sourceUrl: string,
  foundAt: string
) {
  for (const email of emails) {
    into.push({ email, source, sourceUrl, confidence: PAGE_CONFIDENCE[source], foundAt });
  }
}
