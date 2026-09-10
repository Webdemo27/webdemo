/** Re-renders an existing demo's HTML from its stored state (same
 * variant, same assets — no image/video regeneration, no cost).
 * Useful after a template change, or to pick up an asset that was
 * attached after the demo was first built.
 *
 *   npx tsx scripts/rerender-demo.ts <slug>
 */
import { prisma } from "../src/lib/db/client";
import { rerenderDemoFromStoredState } from "../src/lib/demo-generator";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Aufruf: npx tsx scripts/rerender-demo.ts <slug>");

  const demo = await prisma.demo.findUnique({ where: { slug } });
  if (!demo) throw new Error(`Keine Demo mit Slug "${slug}" gefunden.`);

  const { pageCount } = await rerenderDemoFromStoredState(demo.id);
  console.log(`${pageCount} Seiten neu gerendert für ${slug}.`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
