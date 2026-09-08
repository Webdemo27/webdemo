/** A candidate business found by a lead source, before dedup/persistence. */
export interface LeadCandidate {
  companyName: string;
  industry?: string;
  location?: string;
  website?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
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
