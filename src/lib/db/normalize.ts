/** Extracts a lowercased, "www."-stripped domain from any URL-ish string. */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let value = input.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Normalizes a company name for fuzzy duplicate matching (lowercase,
 * legal-form suffixes and punctuation stripped, whitespace collapsed). */
export function normalizeCompanyName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/\b(gmbh|ug|kg|ohg|e\.?k\.?|ag|inc|llc|ltd|co\.?)\b\.?/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
