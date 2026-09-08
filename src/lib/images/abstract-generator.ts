import type { ColorWorld, ImageRole, LayoutDirection } from "../visual-director/types";

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

function parseAspect(aspectRatio: string): [number, number] {
  const [w, h] = aspectRatio.split(":").map(Number);
  return w && h ? [w, h] : [4, 3];
}

/** Soft blurred gradient blobs — reads as premium/editorial rather than
 * a flat placeholder. Suits warm, luxury, and storytelling directions. */
function gradientMesh(colors: ColorWorld, rand: () => number, w: number, h: number): string {
  const blobs = [colors.primary, colors.secondary, colors.accent]
    .map((color, i) => {
      const cx = (0.2 + rand() * 0.6) * w;
      const cy = (0.2 + rand() * 0.6) * h;
      const r = (0.35 + rand() * 0.25) * Math.max(w, h);
      const opacity = 0.55 - i * 0.1;
      return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`;
    })
    .join("\n");

  return `
    <defs>
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${(Math.max(w, h) * 0.09).toFixed(0)}" />
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="${colors.background}" />
    <g filter="url(#blur)">${blobs}</g>
  `;
}

/** Clean diagonal line grid with one solid accent shape — suits
 * professional, grid-clean, and technical/active directions. */
function geometricPattern(colors: ColorWorld, rand: () => number, w: number, h: number): string {
  const lineCount = 7;
  const lines = Array.from({ length: lineCount })
    .map((_, i) => {
      const offset = (i / lineCount) * (w + h);
      return `<line x1="${offset - h}" y1="${h}" x2="${offset}" y2="0" stroke="${colors.border}" stroke-width="${(w * 0.006).toFixed(1)}" />`;
    })
    .join("\n");

  const shapeX = (0.55 + rand() * 0.3) * w;
  const shapeY = (0.25 + rand() * 0.3) * h;
  const shapeR = Math.min(w, h) * 0.22;

  return `
    <rect width="${w}" height="${h}" fill="${colors.background}" />
    <g opacity="0.6">${lines}</g>
    <circle cx="${shapeX.toFixed(0)}" cy="${shapeY.toFixed(0)}" r="${shapeR.toFixed(0)}" fill="${colors.accent}" opacity="0.85" />
    <rect x="${(shapeX - shapeR * 0.4).toFixed(0)}" y="${(shapeY - shapeR * 0.4).toFixed(0)}" width="${(shapeR * 0.8).toFixed(0)}" height="${(shapeR * 0.8).toFixed(0)}" fill="${colors.primary}" opacity="0.9" />
  `;
}

/** Bold angular color blocks — suits energetic/active directions. */
function duotoneBlocks(colors: ColorWorld, rand: () => number, w: number, h: number): string {
  const splitX = (0.35 + rand() * 0.3) * w;
  return `
    <rect width="${w}" height="${h}" fill="${colors.primary}" />
    <polygon points="${splitX},0 ${w},0 ${w},${h} ${(splitX - h * 0.3).toFixed(0)},${h}" fill="${colors.secondary}" />
    <polygon points="${(splitX + w * 0.1).toFixed(0)},0 ${(splitX + w * 0.25).toFixed(0)},0 ${(splitX - h * 0.1).toFixed(0)},${h} ${(splitX - h * 0.25).toFixed(0)},${h}" fill="${colors.accent}" opacity="0.9" />
  `;
}

function pickRecipe(layoutDirection: LayoutDirection, role: ImageRole): (typeof gradientMesh) {
  if (layoutDirection === "bold-blocks") return duotoneBlocks;
  if (layoutDirection === "grid-clean") return geometricPattern;
  if (role === "texture" || role === "background") return geometricPattern;
  return gradientMesh;
}

/** Deterministic, on-brand abstract SVG art — the guaranteed-available
 * visual source when there's no real photo and no image-generation
 * provider configured. Vector (crisp at any size, near-zero file
 * weight) and seeded per lead+role so it's reproducible, never a random
 * grab-bag. This is an intentional "premium placeholder" aesthetic, not
 * a fake photo — real agency concept mockups use exactly this technique
 * before final photography is commissioned. */
export function generateAbstractSvg(
  colors: ColorWorld,
  layoutDirection: LayoutDirection,
  role: ImageRole,
  seed: string,
  aspectRatio: string
): string {
  const [aw, ah] = parseAspect(aspectRatio);
  const width = 1200;
  const height = Math.round((width * ah) / aw);
  const rand = seededRandom(`${seed}:${role}`);
  const recipe = pickRecipe(layoutDirection, role);
  const body = recipe(colors, rand, width, height);

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${body}</svg>`;
}
