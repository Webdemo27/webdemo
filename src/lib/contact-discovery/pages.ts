import type { CheerioAPI } from "cheerio";
import type { ContactPageKind } from "./types";

/** Ordered so the first pattern that matches an `<a>`'s href/text wins —
 * Impressum/Kontakt are checked before the broader "Über uns" pattern so
 * e.g. "Kontakt & Impressum" classifies as Impressum's dedicated page
 * when both exist as separate links. */
const PAGE_PATTERNS: Array<{ kind: ContactPageKind; pattern: RegExp }> = [
  { kind: "Impressum", pattern: /impressum|imprint|legal[-_]?notice/i },
  { kind: "Kontaktseite", pattern: /kontakt|contact/i },
  { kind: "Datenschutzerklärung", pattern: /datenschutz|privacy/i },
  { kind: "Team", pattern: /\bteam\b|mitarbeiter/i },
  { kind: "Über uns", pattern: /ueber[-_]?uns|über[-_]?uns|\babout\b|unternehmen|wir-über|philosophie/i },
];

const CRAWL_LIMIT = 5;

export interface CandidatePage {
  url: string;
  kind: ContactPageKind;
}

function classify(href: string, text: string): ContactPageKind | null {
  const haystack = `${href} ${text}`;
  for (const { kind, pattern } of PAGE_PATTERNS) {
    if (pattern.test(haystack)) return kind;
  }
  return null;
}

/** Finds the small set of pages worth crawling for a business contact
 * email, from links already on the homepage (nav + footer are both just
 * `<a>` tags in the DOM, so no special-casing needed) — Impressum,
 * Kontakt, Datenschutz, Team, Über uns. Capped at `CRAWL_LIMIT` so one
 * link-heavy site can never trigger an unbounded crawl. */
export function discoverCandidatePages($: CheerioAPI, baseUrl: string, homepageUrl: string): CandidatePage[] {
  const seen = new Set<string>([homepageUrl]);
  const byKind = new Map<ContactPageKind, string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href.trim())) return;

    const kind = classify(href, $(el).text());
    if (!kind || byKind.has(kind)) return;

    let resolved: string;
    try {
      const u = new URL(href, baseUrl);
      u.hash = "";
      resolved = u.toString();
    } catch {
      return;
    }

    if (seen.has(resolved)) return;
    seen.add(resolved);
    byKind.set(kind, resolved);
  });

  return Array.from(byKind.entries())
    .map(([kind, url]) => ({ kind, url }))
    .slice(0, CRAWL_LIMIT);
}
