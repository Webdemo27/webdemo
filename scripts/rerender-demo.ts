/** Re-renders an existing demo's HTML from its stored state (same
 * variant, same assets — no image/video regeneration, no cost).
 * Useful after a template change, or to pick up an asset that was
 * attached after the demo was first built.
 *
 *   npx tsx scripts/rerender-demo.ts <slug>
 *   npx tsx scripts/rerender-demo.ts --alle
 *
 * --alle is the one to reach for after editing the template: a change
 * there affects every demo already on disk, and re-rendering them one
 * slug at a time is how some end up silently left on the old output.
 */
import { prisma } from "../src/lib/db/client";
import { rerenderDemoFromStoredState } from "../src/lib/demo-generator";

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error("Aufruf: npx tsx scripts/rerender-demo.ts <slug>|--alle");

  const demos =
    arg === "--alle"
      ? await prisma.demo.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } })
      : await prisma.demo.findMany({ where: { slug: arg }, select: { id: true, slug: true } });

  if (demos.length === 0) {
    throw new Error(arg === "--alle" ? "Keine Demos in der Datenbank." : `Keine Demo mit Slug "${arg}" gefunden.`);
  }

  // One failure must not abandon the rest — a demo whose stored state
  // is incomplete (e.g. missing VisualProfile) would otherwise stop
  // every demo after it from being brought up to date.
  let ok = 0;
  const failed: string[] = [];
  for (const demo of demos) {
    try {
      const { pageCount } = await rerenderDemoFromStoredState(demo.id);
      console.log(`  ${demo.slug}: ${pageCount} Seiten`);
      ok++;
    } catch (err) {
      failed.push(`${demo.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n${ok} von ${demos.length} Demos neu gerendert.`);
  if (failed.length > 0) {
    console.log(`Fehlgeschlagen:\n  ${failed.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
