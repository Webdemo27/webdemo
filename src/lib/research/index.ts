import { createLeadIfNew, updateLeadStatus, recordLeadError } from "../db";
import type { LeadSource, ResearchParams } from "./types";

export * from "./types";
export * from "./osm-categories";
export { overpassSource } from "./sources/overpass-source";
export { createManualSource } from "./sources/manual-source";

export interface ResearchSummary {
  found: number;
  created: number;
  duplicates: number;
  errors: Array<{ companyName: string; error: string }>;
}

/** Runs a lead source and persists every candidate via the dedup-aware
 * repository layer. A failure on one candidate is logged and skipped —
 * it never aborts the rest of the run. */
export async function runResearch(
  source: LeadSource,
  params: ResearchParams
): Promise<ResearchSummary> {
  const candidates = await source.discover(params);

  const summary: ResearchSummary = { found: candidates.length, created: 0, duplicates: 0, errors: [] };

  for (const candidate of candidates) {
    try {
      const { lead, created } = await createLeadIfNew({
        companyName: candidate.companyName,
        industry: candidate.industry,
        location: candidate.location,
        website: candidate.website,
        address: candidate.address,
        contactPhone: candidate.contactPhone,
        contactEmail: candidate.contactEmail,
        source: source.name,
        sourceRef: candidate.sourceRef,
      });

      if (created) {
        summary.created += 1;
        await updateLeadStatus(lead.id, "RESEARCHED", "Recherche abgeschlossen");
      } else {
        summary.duplicates += 1;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unbekannter Fehler";
      summary.errors.push({ companyName: candidate.companyName, error: message });
    }
  }

  return summary;
}

/** Same as runResearch, but for a lead that already exists and failed
 * downstream — records the error without throwing, per the pipeline's
 * "one lead's failure never stops the run" rule. */
export async function safeRecordError(leadId: string, error: unknown) {
  await recordLeadError(leadId, error instanceof Error ? error.message : String(error));
}
