import type { ColorWorld } from "./types";
import { pickVariant } from "../messaging/templates";

/** Gives repeated "Demo neu erstellen" clicks a genuinely different
 * color mood, not just a different layout — colors used to be fixed per
 * industry regardless of variant. A pure hue rotation on the brand
 * colors (primary/primaryDark/secondary/accent) keeps each industry's
 * chosen saturation and lightness intact — so contrast against white
 * button text, card backgrounds, etc. stays exactly as tuned — while the
 * hue itself shifts to a visibly different, still-harmonious color. */

// Modest shifts on purpose: enough to read as a different colorway, not
// so large that a industry's authentic tone (e.g. a bakery's warm
// browns) drifts into an unrelated hue family.
const HUE_SHIFTS = [0, 16, -16, 30, -30] as const;

// The generic "AI-purple-gradient" look is explicitly called out as
// something to avoid across several industry profiles (profiles.ts) —
// never rotate a hue into this band regardless of the shift picked.
const FORBIDDEN_HUE_MIN = 268;
const FORBIDDEN_HUE_MAX = 328;

function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function safeShift(hue: number, shift: number): number {
  const next = (hue + shift + 360) % 360;
  if (next >= FORBIDDEN_HUE_MIN && next <= FORBIDDEN_HUE_MAX) return hue;
  return next;
}

function rotate(hex: string, shift: number): string {
  if (shift === 0) return hex;
  const [h, s, l] = hexToHsl(hex);
  // Grayscale/near-neutral colors have no meaningful hue to rotate —
  // rotating them would just introduce unwanted tint.
  if (s < 0.08) return hex;
  return hslToHex(safeShift(h, shift), s, l);
}

/** Applies a seed-deterministic hue shift to the brand colors only —
 * background/foreground/card/muted/border stay exactly as the industry
 * profile defined them, so page-wide readability is never affected. */
export function applyColorway(colors: ColorWorld, seed: string): ColorWorld {
  const shift = pickVariant([...HUE_SHIFTS], `${seed}:colorway`);
  if (shift === 0) return colors;
  return {
    ...colors,
    primary: rotate(colors.primary, shift),
    primaryDark: rotate(colors.primaryDark, shift),
    secondary: rotate(colors.secondary, shift),
    accent: rotate(colors.accent, shift),
  };
}
