/**
 * Finds — and with --apply removes — files under public/demos that
 * nothing uses any more.
 *
 * "Unused" is deliberately checked against BOTH consumers, because they
 * are different: a demo's own HTML references its imagery and video,
 * while the dashboard references the before/after screenshots through
 * Demo.afterScreenshot*Path columns. Checking only the HTML marks every
 * after-*.webp as garbage, which it is not.
 *
 * Two categories:
 *  - orphaned assets: a file in a demo's assets/ that neither its HTML
 *    nor the database points at. Typically left behind when a demo was
 *    re-generated into a different concept variant.
 *  - orphaned demo folders: a folder with no Demo row at all. The
 *    dashboard cannot see or publish these, so they are dead weight —
 *    but they are also git-ignored, so deleting them is irreversible.
 *
 * Reports by default and changes nothing. Pass --apply to delete.
 *
 *   npx tsx scripts/clean-demo-storage.ts
 *   npx tsx scripts/clean-demo-storage.ts --apply
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db/client";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");
const apply = process.argv.includes("--apply");

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

async function main() {
  const demos = await prisma.demo.findMany({
    select: { slug: true, afterScreenshotDesktopPath: true, afterScreenshotMobilePath: true, assets: true },
  });
  const bySlug = new Map(demos.map((d) => [d.slug, d]));

  const folders = (await fs.readdir(DEMOS_ROOT, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  let orphanAssetBytes = 0;
  const orphanAssets: string[] = [];
  let orphanFolderBytes = 0;
  const orphanFolders: string[] = [];

  for (const folder of folders) {
    const dir = path.join(DEMOS_ROOT, folder);
    const files = await listFiles(dir);

    // _showcase is a set of hand-run demos with no Demo rows by design,
    // so "no database row" says nothing about it.
    if (folder !== "_showcase" && !bySlug.has(folder)) {
      let bytes = 0;
      for (const f of files) bytes += (await fs.stat(f)).size;
      orphanFolders.push(`${folder} (${mb(bytes)})`);
      orphanFolderBytes += bytes;
      continue;
    }

    const htmlBodies = await Promise.all(
      files.filter((f) => f.endsWith(".html")).map((f) => fs.readFile(f, "utf8"))
    );
    const haystack = htmlBodies.join("\n");
    const demo = bySlug.get(folder);
    // Everything the database points at for this demo, by file name.
    const dbNames = new Set<string>();
    for (const p of [demo?.afterScreenshotDesktopPath, demo?.afterScreenshotMobilePath]) {
      if (p) dbNames.add(path.basename(p));
    }
    for (const a of demo?.assets ?? []) {
      const formats = a.formats as unknown;
      if (formats) JSON.stringify(formats).replace(/"([^"]+\.[a-z0-9]+)"/gi, (_, n) => (dbNames.add(n), n));
    }

    for (const f of files.filter((f) => f.includes(`${path.sep}assets${path.sep}`))) {
      const base = path.basename(f);
      if (haystack.includes(base) || dbNames.has(base)) continue;
      const bytes = (await fs.stat(f)).size;
      orphanAssets.push(`${folder}/${base} (${mb(bytes)})`);
      orphanAssetBytes += bytes;
      if (apply) await fs.rm(f, { force: true });
    }
  }

  console.log(`Nicht mehr referenzierte Assets: ${orphanAssets.length} Dateien, ${mb(orphanAssetBytes)}`);
  for (const a of orphanAssets.slice(0, 40)) console.log(`  ${a}`);
  if (orphanAssets.length > 40) console.log(`  … und ${orphanAssets.length - 40} weitere`);

  console.log(`\nDemo-Ordner ohne Datenbank-Eintrag: ${orphanFolders.length} Ordner, ${mb(orphanFolderBytes)}`);
  for (const f of orphanFolders) console.log(`  ${f}`);
  console.log(
    "\nDiese Ordner werden auch mit --apply NICHT geloescht: sie sind git-ignoriert, also\n" +
      "waere das unwiederbringlich, und sie enthalten Arbeit fuer echte Leads, deren\n" +
      "Datenbank-Zeile verloren ging. Entweder Demo neu erzeugen oder von Hand loeschen."
  );

  if (!apply) console.log("\nTrockenlauf — nichts geaendert. Mit --apply werden die Assets oben geloescht.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
