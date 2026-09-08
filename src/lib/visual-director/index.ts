import { getVisualProfile } from "./profiles";
import type { VisualProfile } from "./types";

export * from "./types";
export { getVisualProfile } from "./profiles";

/** Step 1 of the demo pipeline: decide the full creative brief for this
 * lead before any asset or markup is produced — industry, audience,
 * brand impression, art direction, imagery style, typography, color
 * world, layout direction, motion level, and whether a 3D hero fits.
 * Deterministic and rule-based (no LLM call configured in this
 * project), backed by real UI/UX Pro Max design-system lookups baked
 * into profiles.ts rather than invented on the spot. Returns a fresh
 * copy so later steps can safely adjust the asset plan per lead. */
export function buildVisualProfile(lead: { industry: string | null }): VisualProfile {
  const base = getVisualProfile(lead.industry);
  return {
    ...base,
    colors: { ...base.colors },
    typography: { ...base.typography },
    avoid: [...base.avoid],
    assetPlan: base.assetPlan.map((entry) => ({ ...entry })),
  };
}
