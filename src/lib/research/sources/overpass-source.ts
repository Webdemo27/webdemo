import type { LeadCandidate, LeadSource, ResearchParams } from "../types";
import { geocodePlace } from "../nominatim";
import { findCategory } from "../osm-categories";

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

  const website = tags.website ?? tags["contact:website"] ?? tags.url;

  return {
    companyName,
    industry: industryLabel,
    website,
    address: buildAddress(tags),
    contactPhone: tags.phone ?? tags["contact:phone"],
    contactEmail: tags.email ?? tags["contact:email"],
    sourceRef: `osm:${el.type}/${el.id}`,
  };
}

/** Finds real local businesses via the public OpenStreetMap Overpass API.
 * No API key required. Only returns what OSM actually has tagged — most
 * candidates will need a website analysis pass before they're useful,
 * and many will have no website tag at all (a strong signal on its own). */
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
