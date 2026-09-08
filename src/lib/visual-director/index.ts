import { getVisualProfile } from "./profiles";
import type { VisualProfile } from "./types";
import type { ConceptVariant } from "./variants";

export * from "./types";
export * from "./variants";
export { getVisualProfile } from "./profiles";

/** Step 1 of the demo pipeline: decide the full creative brief for this
 * lead before any asset or markup is produced — industry, audience,
 * brand impression, art direction, imagery style, typography, color
 * world, layout direction, motion level, and whether a 3D hero fits.
 * Deterministic and rule-based (no LLM call configured in this
 * project), backed by real UI/UX Pro Max design-system lookups baked
 * into profiles.ts rather than invented on the spot.
 *
 * When a ConceptVariant is given, its overrides (layout direction,
 * motion, forced 3D) are applied on top of the industry base — the
 * variant decides *structure*, the industry base still decides *brand*
 * (colors/typography/imagery stay industry-authentic even in a bold or
 * minimal variant). Returns a fresh copy so later steps can safely
 * adjust the asset plan per lead.
 *
 * use3d is the AND of both signals, deliberately: the industry base
 * says whether 3D ever has real value here at all ("Three.js nur bei
 * echtem Mehrwert" — real estate/hotel/automotive only, never a
 * bakery), and only the Interactive/3D variant actually turns it on for
 * a given render. Without this, every variant for a 3D-eligible
 * industry would render the same WebGL hero, defeating the point of
 * having 8 visually distinct variants; with it, a bakery choosing
 * "Interactive/3D" gracefully gets a strong full-bleed hero instead of
 * a canvas that wouldn't suit the business. */
export function buildVisualProfile(
  lead: { industry: string | null },
  variant?: ConceptVariant
): VisualProfile {
  const base = getVisualProfile(lead.industry);
  const profile: VisualProfile = {
    ...base,
    colors: { ...base.colors },
    typography: { ...base.typography },
    avoid: [...base.avoid],
    assetPlan: base.assetPlan.map((entry) => ({ ...entry })),
  };

  if (variant) {
    if (variant.layoutDirectionOverride) profile.layoutDirection = variant.layoutDirectionOverride;
    if (variant.motionOverride) profile.motion = variant.motionOverride;
  }

  profile.use3d = base.use3d && Boolean(variant?.forceUse3d);

  return profile;
}
