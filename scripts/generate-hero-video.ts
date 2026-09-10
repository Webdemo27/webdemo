/** Triggers real hero-video generation for one demo by slug.
 * Deliberately a manual, per-lead command: unlike images, each run
 * costs real money (see the model/pricing note in the provider).
 *
 *   npx tsx --env-file=.env scripts/generate-hero-video.ts <slug>
 */
import { prisma } from "../src/lib/db/client";
import { generateHeroVideoForDemo } from "../src/lib/video";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Aufruf: npx tsx --env-file=.env scripts/generate-hero-video.ts <slug>");

  const demo = await prisma.demo.findUnique({ where: { slug }, include: { lead: true } });
  if (!demo) throw new Error(`Keine Demo mit Slug "${slug}" gefunden.`);

  console.log(`Generiere Hero-Video für ${demo.lead.companyName} (${demo.lead.industry ?? "ohne Branche"})…`);
  console.log("Das dauert typischerweise 1–3 Minuten (asynchroner Job + Polling).");
  const started = Date.now();

  const result = await generateHeroVideoForDemo(demo.id);

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`\nFertig nach ${seconds}s`);
  console.log(`  Video:  ${result.videoPath}`);
  console.log(`  Poster: ${result.posterPath}`);
  console.log(`  Kosten: ${result.costUsd != null ? `$${result.costUsd.toFixed(3)}` : "von der API nicht gemeldet"}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
