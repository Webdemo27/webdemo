/** Attaches the industry key-visual clip to an existing demo and
 * re-renders it — for demos generated before that step existed.
 *   npx tsx scripts/attach-video.ts <slug>
 */
import { prisma } from "../src/lib/db/client";
import { attachIndustryVideo } from "../src/lib/video/industry-video";
import { rerenderDemoFromStoredState } from "../src/lib/demo-generator";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Aufruf: npx tsx scripts/attach-video.ts <slug>");
  const demo = await prisma.demo.findUnique({ where: { slug }, include: { lead: true } });
  if (!demo) throw new Error(`Keine Demo mit Slug "${slug}".`);
  const ok = await attachIndustryVideo(demo.id);
  console.log(ok ? `Branchen-Video (${demo.lead.industry}) übernommen.` : "Kein Branchen-Video verfügbar.");
  if (ok) console.log(`${(await rerenderDemoFromStoredState(demo.id)).pageCount} Seiten neu gerendert.`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
