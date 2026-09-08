import sharp, { type ResizeOptions } from "sharp";
import { promises as fs } from "fs";
import path from "path";
import type { GeneratedImage, ResponsiveFormatSet, SavedAsset } from "./types";

const RESPONSIVE_WIDTHS = [800, 1600];

function parseAspectRatio(aspectRatio: string): number | null {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspectRatio.trim());
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (!w || !h) return null;
  return w / h;
}

/** Resizes/crops one image to a target aspect ratio and writes WebP
 * (always) and AVIF (best-effort) files at each responsive width. This
 * is the one real place image optimization happens — every asset
 * source (real-extracted, AI-generated) goes through it, so the "WebP/
 * AVIF, responsive sizes, sensible compression, responsive crops"
 * requirement is met once, consistently, rather than per-source. */
export async function optimizeAndSave(
  buffer: Buffer,
  destDir: string,
  baseName: string,
  aspectRatio?: string
): Promise<SavedAsset> {
  await fs.mkdir(destDir, { recursive: true });

  const targetRatio = aspectRatio ? parseAspectRatio(aspectRatio) : null;
  const source = sharp(buffer).rotate();
  const meta = await source.metadata();

  const webp: ResponsiveFormatSet = {};
  const avif: ResponsiveFormatSet = {};
  let finalWidth = meta.width ?? 0;
  let finalHeight = meta.height ?? 0;

  for (const width of RESPONSIVE_WIDTHS) {
    if (meta.width && width > meta.width * 1.25) continue; // don't upscale meaningfully past source

    const resizeOptions: ResizeOptions = targetRatio
      ? { width, height: Math.round(width / targetRatio), fit: "cover", position: "attention" }
      : { width, withoutEnlargement: true };

    const resized = source.clone().resize(resizeOptions);

    const webpBuffer = await resized.clone().webp({ quality: 78 }).toBuffer();
    const webpName = `${baseName}-${width}.webp`;
    await fs.writeFile(path.join(destDir, webpName), webpBuffer);
    webp[String(width)] = webpName;

    try {
      const avifBuffer = await resized.clone().avif({ quality: 60 }).toBuffer();
      const avifName = `${baseName}-${width}.avif`;
      await fs.writeFile(path.join(destDir, avifName), avifBuffer);
      avif[String(width)] = avifName;
    } catch {
      // AVIF encode can fail/be unsupported on some builds — WebP alone still satisfies the requirement.
    }

    const finalMeta = await sharp(webpBuffer).metadata();
    finalWidth = finalMeta.width ?? finalWidth;
    finalHeight = finalMeta.height ?? finalHeight;
  }

  if (Object.keys(webp).length === 0) {
    // Source smaller than every target width — still emit one file at its native size.
    const webpBuffer = await source.clone().webp({ quality: 78 }).toBuffer();
    const webpName = `${baseName}-orig.webp`;
    await fs.writeFile(path.join(destDir, webpName), webpBuffer);
    webp[String(meta.width ?? 0)] = webpName;
  }

  return {
    formats: { webp, avif: Object.keys(avif).length > 0 ? avif : undefined },
    width: finalWidth,
    height: finalHeight,
  };
}

export async function readImageMetadata(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format ?? "unknown" };
}

export function largestFormatFile(formats: SavedAsset["formats"]): string {
  const widths = Object.keys(formats.webp).map(Number);
  const max = Math.max(...widths);
  return formats.webp[String(max)];
}

export function toGeneratedImage(buffer: Buffer, mimeType: string, width: number, height: number): GeneratedImage {
  return { buffer, mimeType, width, height };
}
