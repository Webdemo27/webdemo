/** Produces the all-intra scrub encode for a demo whose hero video was
 * generated before that variant existed, and records it on the asset.
 * Re-encodes the existing watermarked file — no API call, no cost.
 *
 *   npx tsx scripts/backfill-scrub-video.ts <slug>
 */
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../src/lib/db/client";
import { toJson, fromJson } from "../src/lib/db/json";
import { encodeScrubVariant } from "../src/lib/video/watermark";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Aufruf: npx tsx scripts/backfill-scrub-video.ts <slug>");

  const demo = await prisma.demo.findUnique({ where: { slug }, include: { assets: true } });
  if (!demo) throw new Error(`Keine Demo mit Slug "${slug}" gefunden.`);

  const heroAsset = demo.assets.find((a) => a.role === "hero");
  if (!heroAsset) throw new Error("Diese Demo hat kein Hero-Asset.");

  const formats = (fromJson<Record<string, unknown>>(heroAsset.formats) ?? {}) as Record<string, unknown>;
  const videoFile = formats.video as string | undefined;
  if (!videoFile) throw new Error("Diese Demo hat noch kein Hero-Video.");

  const assetsDir = path.join("public", "demos", slug, "assets");
  const sourcePath = path.join(assetsDir, videoFile);
  if (!fs.existsSync(sourcePath)) throw new Error(`Videodatei fehlt auf der Platte: ${sourcePath}`);

  const scrubPath = await encodeScrubVariant(sourcePath, assetsDir, "hero-video");
  await prisma.demoAsset.update({
    where: { id: heroAsset.id },
    data: { formats: toJson({ ...formats, videoScrub: path.basename(scrubPath) }) },
  });

  const size = fs.statSync(path.join(assetsDir, path.basename(scrubPath))).size;
  console.log(`Scrub-Encode erstellt: ${scrubPath} (${Math.round(size / 1024)} KB)`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
