const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** File extensions that regularly get matched by a naive email regex
 * scanning raw HTML/text (e.g. "logo@2x.png") — not real TLDs. */
const NON_TLD_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "css",
  "js",
  "json",
  "woff",
  "woff2",
  "ico",
  "pdf",
]);

/** Local parts that reach a system, not a person who could act on
 * outreach — never worth surfacing as a contact candidate. */
const SYSTEM_LOCAL_PARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "bounce",
  "bounces",
  "postmaster",
]);

/** German Impressum pages are legally required (VSBG / EU ODR
 * Regulation 524/2013) to name a consumer dispute-resolution board —
 * its email sits right next to the business's own address in the same
 * block, on an unrelated third-party domain. It's real and it's on the
 * page, but reaching out to it would email a regulator, not the
 * business, so it's excluded the same way a system mailbox is. */
const DISPUTE_RESOLUTION_LOCAL_PART = /schlichtung|ombudsmann|streitbeilegung/;

/** Domains that show up constantly in scraped HTML but are never the
 * business's own contact address (tracking pixels, CDN/platform
 * boilerplate, spec/schema references, placeholder examples). */
const NON_BUSINESS_DOMAINS = new Set([
  "example.com",
  "example.org",
  "email.com",
  "domain.com",
  "yoursite.com",
  "sentry.io",
  "sentry-cdn.com",
  "wixpress.com",
  "schema.org",
  "w3.org",
  "godaddy.com",
  "gravatar.com",
  "cloudflare.com",
  "google.com",
  "googleapis.com",
  "gstatic.com",
]);

/** Normalizes and validates one raw email string. Returns null for
 * anything that isn't a plausible, useful business contact address —
 * never guesses or repairs a malformed address, just rejects it. */
export function normalizeEmail(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
  if (!EMAIL_PATTERN.test(cleaned)) return null;

  const [local, domain] = cleaned.split("@");
  if (SYSTEM_LOCAL_PARTS.has(local)) return null;
  if (DISPUTE_RESOLUTION_LOCAL_PART.test(local)) return null;
  if (NON_BUSINESS_DOMAINS.has(domain)) return null;

  const tld = domain.split(".").pop() ?? "";
  if (NON_TLD_EXTENSIONS.has(tld)) return null;

  return cleaned;
}
