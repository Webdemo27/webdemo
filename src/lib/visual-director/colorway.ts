import type { ColorWorld } from "./types";
import { pickVariant } from "../messaging/templates";

/** Gives repeated "Demo neu erstellen" clicks a genuinely different
 * color mood, not just a different layout — colors used to be fixed per
 * industry regardless of variant. A pure hue rotation on the brand
 * colors (primary/primaryDark/secondary/accent) keeps each industry's
 * chosen saturation and lightness intact — so contrast against white
 * button text, card backgrounds, etc. stays exactly as tuned — while the
 * hue itself shifts to a visibly different, still-harmonious color. */

// The full picker offer: 20 hues evenly spaced around the whole wheel
// (18° apart), so a lead can preview genuinely any brand color, not
// just a variation close to the industry's default. Index 0 is always
// "no shift" (the industry's authentic original).
const PICKER_HUE_COUNT = 20;
const PICKER_HUE_STEP = 360 / PICKER_HUE_COUNT;
const PICKER_SHIFTS: number[] = Array.from({ length: PICKER_HUE_COUNT }, (_, i) => i * PICKER_HUE_STEP);

// The tool's own automatic pick (what a demo actually renders/pitches
// before anyone touches the picker) stays deliberately modest — close
// enough to the industry's authentic tone that it never needs the
// customer to "fix" it via the picker first. Restricted to a subset of
// the same 20 picker indices (not a separate shift set) so the
// auto-picked color is always byte-identical to one of the 20 swatches
// — no separate "21st" color the picker can't also show as selected.
const DEFAULT_PICK_INDICES = [0, 1, 2, 18, 19];

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
  if (next < FORBIDDEN_HUE_MIN || next > FORBIDDEN_HUE_MAX) return next;
  // Nudge to whichever edge of the forbidden band is closer, rather than
  // collapsing back to the unshifted hue — with 20 options several would
  // otherwise land in this band and all bail to the same duplicate color.
  const distToMin = Math.abs(next - FORBIDDEN_HUE_MIN);
  const distToMax = Math.abs(next - FORBIDDEN_HUE_MAX);
  return distToMin <= distToMax ? (FORBIDDEN_HUE_MIN - 1 + 360) % 360 : (FORBIDDEN_HUE_MAX + 1) % 360;
}

function rotate(hex: string, shift: number): string {
  if (shift === 0) return hex;
  const [h, s, l] = hexToHsl(hex);
  // Grayscale/near-neutral colors have no meaningful hue to rotate —
  // rotating them would just introduce unwanted tint.
  if (s < 0.08) return hex;
  return hslToHex(safeShift(h, shift), s, l);
}

function buildPalette(colors: ColorWorld, shift: number): ColorWorld {
  if (shift === 0) return colors;
  return {
    ...colors,
    primary: rotate(colors.primary, shift),
    primaryDark: rotate(colors.primaryDark, shift),
    secondary: rotate(colors.secondary, shift),
    accent: rotate(colors.accent, shift),
  };
}

/** Applies a seed-deterministic, modest hue shift to the brand colors
 * only — background/foreground/card/muted/border stay exactly as the
 * industry profile defined them, so page-wide readability is never
 * affected. Always one of colorwayOptions()'s 20 entries (see
 * DEFAULT_PICK_INDICES), so the demo's initial render always matches
 * one of the picker's own swatches exactly — no separate, unreachable
 * "21st" color. */
export function applyColorway(colors: ColorWorld, seed: string): ColorWorld {
  const index = pickVariant(DEFAULT_PICK_INDICES, `${seed}:colorway`);
  return buildPalette(colors, PICKER_SHIFTS[index]);
}

/** Real bug (2026-09-09, caught live on a luxury-profile lead): a small
 * color-picker swatch needs every option visibly distinguishable even
 * when the underlying real brand color is very dark or barely saturated
 * — the luxury profile's primary (`#1C1917`, "viel Schwarz/Gold" by
 * design) has ~10% lightness, so a pure hue rotation on it produces 20
 * technically-different hex values that all read as plain black in a
 * 24px dot. This boosts lightness/saturation for DISPLAY ONLY — the
 * swatch's little color dot — never the actual applied theme color
 * (colorPickerScript's `apply()` uses the real, unboosted palette from
 * colorwayOptions() directly), so clicking a swatch still sets the
 * exact tuned brand color it always did. */
export function swatchPreviewColor(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  const displayS = Math.max(s, 0.45);
  const displayL = Math.min(Math.max(l, 0.38), 0.62);
  return hslToHex(h, displayS, displayL);
}

/** All 20 colorways a lead can preview via the on-demo color picker —
 * the full hue wheel, not just the modest range applyColorway() picks
 * from. Same hue-rotation rule (see buildPalette): saturation/lightness
 * stay exactly as tuned, so every option is exactly as contrast-safe as
 * the one actually rendered. */
export function colorwayOptions(colors: ColorWorld): ColorWorld[] {
  return PICKER_SHIFTS.map((shift) => buildPalette(colors, shift));
}
