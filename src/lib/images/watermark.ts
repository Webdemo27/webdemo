import sharp from "sharp";

/** A small, semi-transparent badge, not a loud diagonal stamp — visible
 * enough that nobody could mistake AI-generated imagery for a real photo
 * of the business if it were ever seen outside the demo context, but
 * restrained enough to stay out of the way of the actual composition.
 * Fixed pixel size: composited once onto the full-resolution source
 * buffer before optimizeAndSave()'s resize step, so it scales down
 * proportionally and consistently across every responsive output size
 * rather than needing to be redrawn per size. */
const BADGE_SVG = `
<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="200" height="60" rx="12" fill="black" fill-opacity="0.55" />
  <text x="100" y="39" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700"
        fill="white" text-anchor="middle" letter-spacing="3">DEMO</text>
</svg>`;

/** Stamps a "DEMO" badge onto synthetic imagery before it's saved — see
 * BaseImageProvider.saveAsset(). Never applied to real photos extracted
 * from a lead's own site (those ARE real, unlike AI-generated content) —
 * only to what this project actually generates itself. */
export async function stampDemoWatermark(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .composite([{ input: Buffer.from(BADGE_SVG), gravity: "southeast" }])
    .toBuffer();
}
