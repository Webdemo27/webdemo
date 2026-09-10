/** Regenerates a demo's images from scratch and re-renders its pages —
 * used after the asset pipeline changed (e.g. dropping scraped imagery),
 * without cycling the concept variant the way "Demo neu erstellen" does.
 *
 *   npx tsx --env-file=.env scripts/regenerate-assets.ts <slug>
 */
import { prisma } from "../src/lib/db/client";
import { fromJson } from "../src/lib/db/json";
import { generateAssetsForLead } from "../src/lib/images";
import { rerenderDemoFromStoredState } from "../src/lib/demo-generator";
import type { VisualProfile } from "../src/lib/visual-director/types";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Aufruf: npx tsx --env-file=.env scripts/regenerate-assets.ts <slug>");

  const demo = await prisma.demo.findUnique({ where: { slug }, include: { lead: true } });
  if (!demo) throw new Error(`Keine Demo mit Slug "${slug}" gefunden.`);

  const profile = fromJson<VisualProfile>(demo.visualProfile);
  if (!profile) throw new Error("Diese Demo hat kein gespeichertes VisualProfile.");

  console.log(`Bilder neu generieren für ${demo.lead.companyName}…`);
  const summary = await generateAssetsForLead(demo.leadId, profile);
  console.log(
    `  geplant: ${summary.planned}, generiert: ${summary.fromProvider}, ` +
      `abstrakt: ${summary.fromAbstractArt}, von Fremdseite: ${summary.fromRealPhotos}`
  );
  if (summary.errors.length) console.log("  Fehler:", summary.errors.join(" | "));

  const { pageCount } = await rerenderDemoFromStoredState(demo.id);
  console.log(`${pageCount} Seiten neu gerendert.`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
