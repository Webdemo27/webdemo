/**
 * Re-encodes every scroll-scrub clip already on disk with the current
 * settings in lib/video/watermark.ts, so the existing set matches what
 * new demos get.
 *
 * Why this exists: the scrub encodes were originally quality-targeted
 * (CRF) and landed between 26 and 57 MB. Cloudflare Pages refuses any
 * single asset over 25 MiB, so those files could not be published at
 * all. encodeScrubVariant() is now rate-targeted and size-verified;
 * this brings the back catalogue in line without regenerating (and
 * re-paying for) a single clip.
 *
 * Two kinds of file are handled differently:
 *  - _showcase clips have their watermarked ambient master beside them
 *    (bg-video.mp4), so they are re-encoded from that — same source and
 *    same generation count as the production pipeline.
 *  - per-lead clips are byte-copies of a showcase clip (see
 *    video/industry-video.ts), and are replaced with the new encode
 *    rather than transcoded a third time. They are matched to their
 *    showcase original by hashing the *poster* that was copied
 *    alongside them, not the video: the poster is never re-encoded, so
 *    the match still holds on a second run, after the videos it would
 *    otherwise have been compared against have already changed.
 *
 * Usage: npx tsx scripts/shrink-scrub-videos.ts [--dry]
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { encodeScrubVariant } from "../src/lib/video/watermark";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");
const LIMIT_BYTES = 25 * 1024 * 1024;
/** A real 1080p all-intra clip is tens of MB; anything this small is a
 * truncated leftover from an interrupted encode, not a finished file.
 * Without this check "already under the limit" happily accepts 0 bytes. */
const MIN_PLAUSIBLE_BYTES = 1024 * 1024;
const dryRun = process.argv.includes("--dry");

function needsRebuild(bytes: number): boolean {
  return bytes > LIMIT_BYTES || bytes < MIN_PLAUSIBLE_BYTES;
}

async function findScrubFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findScrubFiles(full)));
    else if (entry.name.endsWith("-scrub.mp4")) found.push(full);
  }
  return found;
}

async function hashFile(file: string): Promise<string> {
  return createHash("sha1").update(await fs.readFile(file)).digest("hex");
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  const all = await findScrubFiles(DEMOS_ROOT);
  const showcase = all.filter((f) => f.includes(`${path.sep}_showcase${path.sep}`));
  const perLead = all.filter((f) => !f.includes(`${path.sep}_showcase${path.sep}`));

  console.log(`${all.length} Scrub-Videos gefunden (${showcase.length} Showcase, ${perLead.length} pro Lead).\n`);

  // Identify per-lead copies by their poster, which industry-video.ts
  // copies alongside the clip and nothing here rewrites — so the match
  // survives re-encoding the videos themselves.
  const posterFor = (scrub: string) =>
    path.join(path.dirname(scrub), `${path.basename(scrub, "-scrub.mp4")}-poster.jpg`);
  const showcaseByPoster = new Map<string, string>();
  for (const file of showcase) {
    const poster = posterFor(file);
    if (await fs.access(poster).then(() => true, () => false)) {
      showcaseByPoster.set(await hashFile(poster), file);
    }
  }
  const perLeadOrigin = new Map<string, string | undefined>();
  for (const file of perLead) {
    const poster = posterFor(file);
    const hasPoster = await fs.access(poster).then(() => true, () => false);
    perLeadOrigin.set(file, hasPoster ? showcaseByPoster.get(await hashFile(poster)) : undefined);
  }

  const rebuilt = new Map<string, string>(); // showcase path -> new path
  let totalAfter = 0;
  let largest = 0;
  const record = (bytes: number) => {
    totalAfter += bytes;
    largest = Math.max(largest, bytes);
  };

  for (const file of showcase) {
    const before = (await fs.stat(file)).size;
    const dir = path.dirname(file);
    const baseName = path.basename(file, "-scrub.mp4");
    const master = path.join(dir, `${baseName}.mp4`);

    const hasMaster = await fs
      .access(master)
      .then(() => true)
      .catch(() => false);
    const source = hasMaster ? master : file;

    // Re-encoding a truncated file from itself would just launder the
    // damage into a confusing ffmpeg error. Say what is actually wrong.
    if (before < MIN_PLAUSIBLE_BYTES && !hasMaster) {
      throw new Error(
        `${path.relative(DEMOS_ROOT, file)} ist nur ${mb(before)} gross und es liegt kein ${baseName}.mp4 daneben — ` +
          `die Datei ist unbrauchbar und muss neu generiert werden (scripts/generate-industry-demo.ts).`
      );
    }

    if (!needsRebuild(before)) {
      console.log(`= ${path.relative(DEMOS_ROOT, file)} — ${mb(before)}, bereits unter dem Limit`);
      record(before);
      rebuilt.set(file, file);
      continue;
    }

    if (dryRun) {
      console.log(`~ ${path.relative(DEMOS_ROOT, file)} — ${mb(before)} → würde aus ${path.basename(source)} neu kodiert`);
      continue;
    }

    await encodeScrubVariant(source, dir, baseName);
    const after = (await fs.stat(file)).size;
    record(after);
    rebuilt.set(file, file);
    const flag = after <= LIMIT_BYTES ? "✓" : "✗ IMMER NOCH ZU GROSS";
    console.log(`${flag} ${path.relative(DEMOS_ROOT, file)} — ${mb(before)} → ${mb(after)}`);
  }

  for (const file of perLead) {
    const before = (await fs.stat(file)).size;
    if (!needsRebuild(before)) {
      console.log(`= ${path.relative(DEMOS_ROOT, file)} — ${mb(before)}, bereits unter dem Limit`);
      record(before);
      continue;
    }
    const origin = perLeadOrigin.get(file);
    if (dryRun) {
      console.log(
        `~ ${path.relative(DEMOS_ROOT, file)} — ${mb(before)} → ${
          origin ? `Kopie von ${path.relative(DEMOS_ROOT, origin)}` : "Neukodierung aus sich selbst"
        }`
      );
      continue;
    }
    if (origin && rebuilt.has(origin)) {
      await fs.copyFile(rebuilt.get(origin)!, file);
    } else {
      await encodeScrubVariant(file, path.dirname(file), path.basename(file, "-scrub.mp4"));
    }
    const after = (await fs.stat(file)).size;
    record(after);
    const flag = after <= LIMIT_BYTES ? "✓" : "✗ IMMER NOCH ZU GROSS";
    console.log(`${flag} ${path.relative(DEMOS_ROOT, file)} — ${mb(before)} → ${mb(after)}`);
  }

  // Only the end state is worth reporting. A "before → after" total
  // would lie on a re-run: files left alone contribute their already-
  // shrunk size to both halves, so the sum can even appear to grow.
  if (!dryRun) {
    console.log(`\nGesamt auf der Platte: ${mb(totalAfter)} in ${all.length} Dateien, groesste ${mb(largest)}.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
