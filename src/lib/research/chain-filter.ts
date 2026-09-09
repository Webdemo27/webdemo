/** Filters out branches of larger chains/franchises during lead
 * discovery. This tool targets independent local businesses whose owner
 * would personally read and act on an outreach email — a chain location
 * is typically run by a marketing/IT department or already works with an
 * agency, so it's not a fit and shouldn't take up a lead slot. */

/** OSM tags a mapper sets on a location that belongs to a larger
 * brand — an independent local business essentially never carries
 * these. `operator` differing from `name` is the same signal under a
 * different tag (e.g. a Rossmann branch operated by "dm-drogerie markt
 * GmbH"). */
function tagsIndicateChain(tags: Record<string, string>): boolean {
  if (tags.brand || tags["brand:wikidata"]) return true;
  const operator = tags.operator?.trim().toLowerCase();
  const name = tags.name?.trim().toLowerCase();
  if (operator && operator !== name) return true;
  return false;
}

/** Supplementary safety net for well-known German chains/franchises OSM
 * mappers sometimes forget to tag with `brand` — kept short and specific
 * to the industries this tool targets (see osm-categories.ts), not a
 * general-purpose blocklist. */
const KNOWN_CHAIN_NAMES = [
  "klier",
  "essanelle",
  "kamps",
  "backwerk",
  "back-factory",
  "back factory",
  "nordsee",
  "mcdonald's",
  "mcdonalds",
  "burger king",
  "subway",
  "kfc",
  "starbucks",
  "engel & völkers",
  "engel und völkers",
  "re/max",
  "remax",
  "mcmakler",
  "von poll",
  "fressnapf",
];

function nameIndicatesChain(companyName: string): boolean {
  const lower = companyName.trim().toLowerCase();
  return KNOWN_CHAIN_NAMES.some((chain) => lower.includes(chain));
}

/** True if this candidate looks like a branch of a larger chain rather
 * than an independent local business. `tags` (raw OSM tags, when
 * available) is the stronger signal; the name check runs regardless. */
export function isLikelyChain(input: { companyName: string; tags?: Record<string, string> }): boolean {
  if (input.tags && tagsIndicateChain(input.tags)) return true;
  return nameIndicatesChain(input.companyName);
}
