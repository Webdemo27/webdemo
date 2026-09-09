import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db/client";
import { toAssetView } from "../src/lib/demo-generator/asset-view";
import { angledCarouselSection, angledCarouselScript, buildEditorialRows } from "../src/lib/demo-generator/template";

async function main() {
  const slug = "tobias-gruenert";
  const demo = await prisma.demo.findUnique({
    where: { slug },
    include: { lead: true, assets: true },
  });
  if (!demo) throw new Error(`No demo found for slug ${slug}`);

  const editorialAssets = demo.assets
    .filter((a) => a.role === "editorial")
    .map((a) =>
      toAssetView({
        role: a.role,
        altText: a.altText,
        aspectRatio: a.aspectRatio,
        width: a.width,
        height: a.height,
        localPath: a.localPath,
        formats: a.formats,
      })
    );

  const location = demo.lead.location ?? "";
  const rows = buildEditorialRows(demo.lead.companyName, location, editorialAssets.length);

  const items = editorialAssets.map((asset, i) => ({
    asset,
    headline: rows[i].headline,
    body: rows[i].body,
  }));

  const carouselSection = angledCarouselSection(items, "Einblicke");
  const carouselScript = angledCarouselScript();

  const dir = path.join("public", "demos", slug);
  const source = fs.readFileSync(path.join(dir, "ueber-uns.html"), "utf-8");

  const editorialSectionRegex = /<section class="editorial">[\s\S]*?<\/section>\s*(?=\n\s*<div class="lightbox")/;
  if (!editorialSectionRegex.test(source)) {
    throw new Error("Could not locate the editorial section in ueber-uns.html to replace");
  }
  let output = source.replace(editorialSectionRegex, carouselSection + "\n  ");

  const carouselCss = `
  .angled-carousel { padding-top: clamp(2rem, 5vw, 3.5rem); }
  .angled-carousel-viewport {
    overflow-x: auto; overflow-y: visible; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding: 1rem clamp(1.5rem, 6vw, 5rem) 2.5rem;
  }
  .angled-carousel-viewport::-webkit-scrollbar { display: none; }
  .angled-carousel-track {
    display: flex; gap: clamp(1.5rem, 4vw, 3rem); width: max-content; will-change: transform;
  }
  .angled-card { width: min(340px, 72vw); flex-shrink: 0; }
  .angled-card-media {
    position: relative; border-radius: 1rem; overflow: hidden; aspect-ratio: 3 / 4;
    transform: rotate(var(--tilt)); box-shadow: 0 22px 44px -22px rgba(0,0,0,0.35);
    transition: transform 260ms var(--ease-out), box-shadow 260ms var(--ease-out);
  }
  .angled-card-media:hover { transform: rotate(0deg) scale(1.03); box-shadow: 0 28px 54px -20px rgba(0,0,0,0.4); }
  .angled-card-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  .angled-card-caption { padding-top: 1.1rem; max-width: 30rem; }
  .angled-card-caption h3 { font-size: clamp(1.05rem, 2vw, 1.3rem); margin-bottom: 0.4rem; }
  .angled-card-caption p { color: color-mix(in srgb, var(--fg) 75%, transparent); font-size: 0.92rem; }
  @media (prefers-reduced-motion: reduce) {
    .angled-card-media { transition-duration: 1ms !important; }
  }
`;
  output = output.replace("</style>", `${carouselCss}</style>`);

  output = output.replace("</body>", `${carouselScript}\n</body>`);

  const outPath = path.join(dir, "karussell-preview.html");
  fs.writeFileSync(outPath, output, "utf-8");
  console.log(`Written: ${outPath}`);
  console.log(`Items: ${items.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
