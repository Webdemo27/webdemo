export type ImageRole =
  | "hero"
  | "service"
  | "product"
  | "team"
  | "environment"
  | "detail"
  | "editorial"
  | "background"
  | "texture"
  | "3d";

export interface AssetPlanEntry {
  role: ImageRole;
  count: number;
  aspectRatio: string;
}

export interface ColorWorld {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  muted: string;
  border: string;
  mode: "light" | "dark";
}

export interface Typography {
  heading: string;
  body: string;
  googleFontsHref: string;
  mood: string;
}

export type LayoutDirection =
  | "editorial-asymmetric"
  | "grid-clean"
  | "immersive-storytelling"
  | "bold-blocks";

export type MotionLevel = "none" | "subtle" | "standard";

/** The full creative brief a demo is built from — determined once per
 * lead, before any asset or markup is produced. Every later step (asset
 * pipeline, template renderer) reads from this instead of re-deciding
 * style on its own, so a demo's visuals stay internally consistent. */
export interface VisualProfile {
  industryKey: string;
  targetAudience: string;
  brandImpression: string;
  artDirection: string;
  imageryStyle: string;
  layoutDirection: LayoutDirection;
  motion: MotionLevel;
  use3d: boolean;
  colors: ColorWorld;
  typography: Typography;
  avoid: string[];
  assetPlan: AssetPlanEntry[];
}
