import type { LeadCandidate, LeadSource, ResearchParams } from "../types";
import { geocodePlace } from "../nominatim";
import { findCategory } from "../osm-categories";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "webdemo-lead-platform/0.1 (local dev tool, manual use)";

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

    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      throw new Error(`Overpass-Anfrage fehlgeschlagen: HTTP ${res.status}`);
    }

    const data = (await res.json()) as OverpassResponse;

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
