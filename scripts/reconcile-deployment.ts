/**
 * Brings the Cloudflare staging tree back in line with reality without
 * deploying: it should contain exactly the demos that have a recorded
 * publicUrl, each copied fresh from public/demos.
 *
 * Worth having as its own command because the tree drifts silently. It
 * is only ever written just before a deploy, so a failed deploy leaves
 * a folder behind — and since the whole tree is what gets uploaded, the
 * next successful deploy of any other lead publishes that leftover too.
 * Found in production on 2026-09-11: ten staged folders while exactly
 * one demo was actually published, six of them for leads that no longer
 * existed in the database at all, every one of them reachable at a
 * public URL.
 *
 * Removing a folder here does NOT take it offline — only a deploy does
 * that. This prepares the tree; the next publish carries it out.
 *
 *   npx tsx scripts/reconcile-deployment.ts
 */
import path from "node:path";
import { prisma } from "../src/lib/db/client";
import { ensureStagingRoot, reconcileStaging, oversizedStagedFiles } from "../src/lib/publishing/cloudflare-publisher";

async function main() {
  const published = await prisma.demo.findMany({
    where: { publicUrl: { not: null } },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  if (published.length === 0) {
    console.log("Keine Demo hat eine publicUrl — der Staging-Baum darf keinen Demo-Ordner enthalten.");
  } else {
    console.log(`Veröffentlicht laut Datenbank (${published.length}): ${published.map((d) => d.slug).join(", ")}`);
  }

  const staged = published.map((d) => ({
    slug: d.slug,
    directory: path.join(process.cwd(), "public", "demos", d.slug),
  }));

  await ensureStagingRoot();
  // reconcileStaging always keeps its first argument, so pass the first
  // published demo as "current" rather than inventing a slug that would
  // then be protected from removal.
  const removed = staged.length > 0 ? await reconcileStaging(staged[0], staged.slice(1)) : await reconcileStaging({ slug: "", directory: "" }, []);

  console.log(
    removed.length > 0
      ? `\nAus dem Staging-Baum entfernt (${removed.length}): ${removed.join(", ")}`
      : "\nNichts zu entfernen — der Staging-Baum war bereits korrekt."
  );

  const oversized = await oversizedStagedFiles();
  console.log(
    oversized.length > 0
      ? `\nÜber Cloudflares 25-MiB-Grenze:\n  ${oversized.map((o) => `${o.file} (${(o.bytes / 1024 / 1024).toFixed(1)} MiB)`).join("\n  ")}`
      : "\nKeine Datei über 25 MiB — ein Deploy würde durchlaufen."
  );

  if (removed.length > 0) {
    console.log(
      "\nAchtung: diese Demos sind noch öffentlich erreichbar. Erst der nächste\n" +
        "Deploy (Knopf \"Öffentlich bereitstellen\") nimmt sie wirklich vom Netz."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
