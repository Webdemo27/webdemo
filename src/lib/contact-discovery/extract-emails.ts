import * as cheerio from "cheerio";
import { normalizeEmail } from "./normalize";

const EMAIL_TEXT_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Pulls every plausible business email out of one fetched page: mailto
 * links, JSON-LD structured data (`email` fields — schema.org
 * Organization/LocalBusiness/Person markup), and plain visible text
 * (German Impressum pages very often list the address as bare text next
 * to the phone number, not as a link). Each raw match still goes through
 * `normalizeEmail` — this function only finds candidates, never decides
 * whether one is a legitimate business address. */
export function extractEmailsFromHtml(html: string): Set<string> {
  const $ = cheerio.load(html);
  const found = new Set<string>();

  $('a[href^="mailto:"]').each((_, el) => {
    const normalized = normalizeEmail($(el).attr("href") ?? "");
    if (normalized) found.add(normalized);
  });

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      collectJsonLdEmails(JSON.parse(raw), found);
    } catch {
      // Malformed JSON-LD is common (trailing commas, HTML-escaped
      // quotes) — skip it rather than let one bad block break discovery.
    }
  });

  // cheerio's .text() concatenates adjacent elements with no separator,
  // so "<a>info@site.de</a>Website" reads as one run of characters and
  // the greedy TLD group below happily swallows "dewebsite" as if it
  // were part of the domain. Inserting a newline at block/line-break
  // boundaries first restores the whitespace a browser would render,
  // so the regex stops at the real end of the address.
  $("br").replaceWith("\n");
  $("p, div, li, td, tr, h1, h2, h3, h4, h5, h6, section, article, footer, header").each(
    (_, el) => {
      $(el).append("\n");
    }
  );
  const bodyText = $.root().text();
  for (const match of bodyText.matchAll(EMAIL_TEXT_PATTERN)) {
    const normalized = normalizeEmail(match[0]);
    if (normalized) found.add(normalized);
  }

  return found;
}

function collectJsonLdEmails(node: unknown, into: Set<string>) {
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdEmails(item, into);
    return;
  }
  if (!node || typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  if (typeof obj.email === "string") {
    const normalized = normalizeEmail(obj.email);
    if (normalized) into.add(normalized);
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectJsonLdEmails(value, into);
  }
}
