import type { LeadCandidate, LeadSource } from "../types";

/** Second, independent LeadSource implementation — proves discovery isn't
 * hard-coupled to Overpass. Parses manually pasted lines of the form
 * "Firma; Website; Ort" (website/Ort optional), one business per line. */
export function createManualSource(rawText: string): LeadSource {
  return {
    name: "manual-import",
    async discover(): Promise<LeadCandidate[]> {
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      return lines.map((line, i) => {
        const [companyName, website, location] = line.split(";").map((v) => v?.trim());
        return {
          companyName: companyName || `Unbenannter Lead ${i + 1}`,
          website: website || undefined,
          location: location || undefined,
          sourceRef: `manual:${i}`,
        };
      });
    },
  };
}
