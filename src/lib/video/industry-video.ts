import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../db";
import { toJson, fromJson } from "../db/json";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");
const SHOWCASE_ROOT = path.join(DEMOS_ROOT, "_showcase");

/** Mirrors slugFor() in scripts/generate-industry-demo.ts. */
function industrySlug(industry: string): string {
  return industry
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Gives a lead's demo the scroll-scrubbed background video by reusing
 * its industry's key-visual clip, instead of generating a new one.
 *
 * Generating per lead would cost $0.40 and about two minutes each, for a
 * clip that would look the same as the industry's anyway — the key
 * visual is the industry's motif, not the individual business's. The
 * twelve industry clips already exist, so a Zahnarzt lead simply gets
 * the Zahnarzt clip: no cost, no wait, and the whole set stays visually
 * consistent.
 *
 * The files are copied rather than referenced across directories,
 * because a demo folder has to stay self-contained — publishing uploads
 * one folder, and a relative path pointing outside it would 404 the
 * moment it goes live. Only the scrub encode and its poster are copied;
 * the ambient loop is unused in page-video mode.
 *
 * Returns false when the industry has no clip yet, which is not an
 * error — the demo then renders with its hero image as before.
 */
export async function attachIndustryVideo(demoId: string): Promise<boolean> {
  const demo = await prisma.demo.findUnique({
    where: { id: demoId },
    include: { lead: true, assets: true },
  });
  if (!demo?.lead.industry) return false;

  const heroAsset = demo.assets.find((a) => a.role === "hero");
  if (!heroAsset) return false;

  const sourceDir = path.join(SHOWCASE_ROOT, `branche-${industrySlug(demo.lead.industry)}`, "assets");
  const scrub = path.join(sourceDir, "bg-video-scrub.mp4");
  const poster = path.join(sourceDir, "bg-video-poster.jpg");

  try {
    await fs.access(scrub);
    await fs.access(poster);
  } catch {
    return false;
  }

  const destDir = path.join(DEMOS_ROOT, demo.slug, "assets");
  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(scrub, path.join(destDir, "bg-video-scrub.mp4"));
  await fs.copyFile(poster, path.join(destDir, "bg-video-poster.jpg"));

  const existing = (fromJson<Record<string, unknown>>(heroAsset.formats) ?? {}) as Record<string, unknown>;
  await prisma.demoAsset.update({
    where: { id: heroAsset.id },
    data: {
      formats: toJson({
        ...existing,
        videoScrub: "bg-video-scrub.mp4",
        poster: "bg-video-poster.jpg",
        // The page-wide background only reads videoScrub, but `video`
        // is what marks the asset as carrying one at all (see
        // toAssetView), so it has to be set for the layer to render.
        video: "bg-video-scrub.mp4",
      }),
    },
  });

  return true;
}
