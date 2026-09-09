/** A candidate business found by a lead source, before dedup/persistence. */
export interface LeadCandidate {
  companyName: string;
  industry?: string;
  location?: string;
  website?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** This exact business's real coordinates, when the source provides
   * them (e.g. Overpass's node lat/lon or way centroid) — never a
   * geocoded guess. Powers the real embedded location map in the demo. */
  latitude?: number;
  longitude?: number;
  sourceRef?: string;
}

export interface ResearchParams {
  /** Free-text place name, e.g. "Frankfurt am Main, Germany". */
  location: string;
  /** Business category key, see osm-categories.ts for the supported set. */
  category: string;
  radiusMeters?: number;
  limit?: number;
}

/** A pluggable business-discovery adapter. Research (this interface) is
 * intentionally decoupled from website analysis — a source only ever
 * returns candidates, never scores or judges them. */
export interface LeadSource {
  name: string;
  discover(params: ResearchParams): Promise<LeadCandidate[]>;
}
