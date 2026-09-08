const USER_AGENT = "webdemo-lead-platform/0.1 (local dev tool, manual use)";

export interface GeocodedPlace {
  lat: number;
  lon: number;
  boundingBox: [south: number, north: number, west: number, east: number];
  displayName: string;
}

/** Resolves a free-text place name via the public Nominatim API (OSM),
 * which requires no API key. Respects Nominatim's usage policy: a single
 * request, a descriptive User-Agent, no bulk/parallel geocoding. */
export async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim-Anfrage fehlgeschlagen: HTTP ${res.status}`);

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    boundingbox: [string, string, string, string];
    display_name: string;
  }>;

  const first = results[0];
  if (!first) return null;

  return {
    lat: parseFloat(first.lat),
    lon: parseFloat(first.lon),
    boundingBox: first.boundingbox.map(Number) as [number, number, number, number],
    displayName: first.display_name,
  };
}
