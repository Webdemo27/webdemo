/**
 * Exports one already-generated demo's real data into demo-app's
 * LeadData JSON format, so the new Vite/React/WebGL engine can render
 * it. Usage:
 *   npx tsx scripts/export-react-demo.ts <slug>
 */
import { prisma } from "../src/lib/db";
import { exportLeadDataForReactApp } from "../src/lib/demo-generator/export-react-data";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npx tsx scripts/export-react-demo.ts <slug>");
    process.exit(1);
  }

  const demo = await prisma.demo.findUnique({ where: { slug } });
  if (!demo) {
    console.error(`Kein Demo mit slug "${slug}" gefunden.`);
    process.exit(1);
  }

  const result = await exportLeadDataForReactApp(demo.leadId);
  console.log(`Exportiert: demo-app/public/data/${result.slug}.json (+ Bilder in demo-app/public/data/${result.slug}/)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
