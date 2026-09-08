import * as cheerio from "cheerio";
import { fetchPage } from "../analysis/fetch-page";
import { readImageMetadata } from "./optimizer";

const USER_AGENT = "Mozilla/5.0 (compatible; webdemo-lead-platform/0.1; local dev asset tool)";
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const MAX_DOWNLOAD_ATTEMPTS = 16;
const MAX_CANDIDATES = 8;

export interface ExtractedImageCandidate {
  sourceUrl: string;
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

const SKIP_PATTERN = /(logo|icon|sprite|favicon|pixel|badge|payment|social[-_]?media|avatar|spinner|loader)/i;

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/**
 * Finds real, usable photos already published on the lead's own
 * website — the most honest possible source for a demo (their actual
 * business, not a fabricated or generic stock photo). Filters out
 * icons/logos/tracking pixels by URL pattern first, then by actual
 * downloaded pixel dimensions (a real content photo is rarely under
 * 400x300; icons and UI chrome usually are). Never throws — a site
 * with nothing usable just yields an empty list, and the asset
 * pipeline falls back to abstract generative art for that slot.
 */
export async function extractRealImages(websiteUrl: string): Promise<ExtractedImageCandidate[]> {
  const pageResult = await fetchPage(websiteUrl);
  if (!pageResult.ok) return [];

  const $ = cheerio.load(pageResult.page.html);
  const base = pageResult.page.finalUrl;

  const urls = new Set<string>();
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
    if (!src || src.startsWith("data:")) return;
    const resolved = resolveUrl(src, base);
    if (!resolved) return;
    if (SKIP_PATTERN.test(resolved)) return;
    if (/\.svg(\?|$)/i.test(resolved)) return;
    urls.add(resolved);
  });

  const candidates: ExtractedImageCandidate[] = [];
  let attempts = 0;

  for (const url of urls) {
    if (candidates.length >= MAX_CANDIDATES || attempts >= MAX_DOWNLOAD_ATTEMPTS) break;
    attempts += 1;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/") || contentType.includes("svg")) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const meta = await readImageMetadata(buffer);
      if (meta.width < MIN_WIDTH || meta.height < MIN_HEIGHT) continue;

      candidates.push({ sourceUrl: url, buffer, width: meta.width, height: meta.height, format: meta.format });
    } catch {
      continue;
    }
  }

  // Largest first — the biggest photos are the most likely genuine content shots.
  return candidates.sort((a, b) => b.width * b.height - a.width * a.height);
}
