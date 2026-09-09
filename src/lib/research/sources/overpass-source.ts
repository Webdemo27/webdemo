import type { LeadCandidate, LeadSource, ResearchParams } from "../types";
import { geocodePlace } from "../nominatim";
import { findCategory } from "../osm-categories";
import { isLikelyChain } from "../chain-filter";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "webdemo-lead-platform/0.1 (local dev tool, manual use)";
// The public Overpass instance regularly returns transient 502/503/504
// under load — observed repeatedly during real testing, and a bare
// retry after a short pause reliably succeeds. Retrying here (rather
// than in loop.ts) means every caller of this source gets the same
// resilience, and a lead-processing run only ever aborts on a genuinely
// persistent failure.
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  /// A node's own coordinates.
  lat?: number;
  lon?: number;
  /// A way/relation's centroid — present because the query uses
  /// `out center tags` (see discover() below); ways have no single
  /// lat/lon of their own.
  center?: { lat: number; lon: number };
}

/** This exact business's real coordinates — a node's own lat/lon, or a
 * way's centroid — never a fallback/guessed value. Undefined only if
 * Overpass genuinely returned neither (shouldn't happen given `out
 * center`, but the type doesn't guarantee it). */
function coordinatesOf(el: OverpassElement): { lat: number; lon: number } | undefined {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  return undefined;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
    [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function toCandidate(el: OverpassElement, industryLabel: string): LeadCandidate | null {
  const tags = el.tags ?? {};
  const companyName = tags.name;
  if (!companyName) return null;
  if (isLikelyChain({ companyName, tags })) return null;

  const website = tags.website ?? tags["contact:website"] ?? tags.url;
  // The whole pipeline audits an *existing* website (analysis needs a URL
  // to fetch) — a business with none can never leave RESEARCHED status,
  // so it's excluded here rather than becoming a permanently stuck lead.
  if (!website) return null;

  const coords = coordinatesOf(el);

  return {
    companyName,
    industry: industryLabel,
    website,
    address: buildAddress(tags),
    contactPhone: tags.phone ?? tags["contact:phone"],
    contactEmail: tags.email ?? tags["contact:email"],
    latitude: coords?.lat,
    longitude: coords?.lon,
    sourceRef: `osm:${el.type}/${el.id}`,
  };
}

/** Finds real local businesses via the public OpenStreetMap Overpass API.
 * No API key required. Skips candidates with no name, no website (the
 * pipeline audits an existing site, so there's nothing to analyze), or
 * that look like a branch of a larger chain (see chain-filter.ts) —
 * none of those can ever become a usable lead here. */
export const overpassSource: LeadSource = {
  name: "openstreetmap-overpass",

  async discover(params: ResearchParams): Promise<LeadCandidate[]> {
    const category = findCategory(params.category);
    if (!category) {
      throw new Error(`Unbekannte Kategorie: ${params.category}`);
    }

    const place = await geocodePlace(params.location);
    if (!place) {
      throw new Error(`Ort konnte nicht gefunden werden: ${params.location}`);
    }

    const radius = params.radiusMeters ?? 5000;
    const limit = params.limit ?? 20;
    const tagFilter = `["${category.osmKey}"="${category.osmValue}"]`;

    const query = `
      [out:json][timeout:25];
      (
        node${tagFilter}(around:${radius},${place.lat},${place.lon});
        way${tagFilter}(around:${radius},${place.lat},${place.lon});
      );
      out center tags ${limit * 2};
    `;

    let lastStatus = 0;
    let data: OverpassResponse | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (res.ok) {
        data = (await res.json()) as OverpassResponse;
        break;
      }

      lastStatus = res.status;
      if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
        throw new Error(`Overpass-Anfrage fehlgeschlagen: HTTP ${res.status}`);
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }

    if (!data) {
      throw new Error(`Overpass-Anfrage fehlgeschlagen: HTTP ${lastStatus}`);
    }

    const seen = new Set<string>();
    const candidates: LeadCandidate[] = [];
    for (const el of data.elements) {
      const candidate = toCandidate(el, category.label);
      if (!candidate) continue;
      const dedupeKey = candidate.companyName.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      candidates.push({ ...candidate, location: place.displayName.split(",")[0] });
      if (candidates.length >= limit) break;
    }

    return candidates;
  },
};
