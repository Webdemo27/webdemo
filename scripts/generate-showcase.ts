import fs from "node:fs";
import path from "node:path";
import { buildVisualProfile } from "../src/lib/visual-director";
import { CONCEPT_VARIANTS, getVariant } from "../src/lib/visual-director/variants";
import { generateAbstractSvg } from "../src/lib/images/abstract-generator";
import {
  renderDemoSite,
  taglineFor,
  deriveServiceLabels,
  scallopedHeroSection,
  marqueeSection,
  typographyHeroSection,
  scriptAside,
  scriptAsideFontLink,
  gooeyHeroSection,
  scatteredGallerySection,
  buildEditorialRows,
  rotatingSealBadge,
  type DemoData,
} from "../src/lib/demo-generator/template";
import { toAssetView } from "../src/lib/demo-generator/asset-view";
import type { ImageRole } from "../src/lib/visual-director/types";

const COMPANY = "Musterfirma";
const LOCATION = "Musterstadt";

function writeAssetSvgs(dir: string, profile: ReturnType<typeof buildVisualProfile>, seed: string) {
  const assetsDir = path.join(dir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const rawAssets = profile.assetPlan.flatMap((entry) =>
    Array.from({ length: entry.count }).map((_, i) => {
      const svg = generateAbstractSvg(profile.colors, profile.layoutDirection, entry.role, `${seed}:${entry.role}:${i}`, entry.aspectRatio);
      const filename = `${entry.role}-${i + 1}.svg`;
      fs.writeFileSync(path.join(assetsDir, filename), svg, "utf-8");
      return {
        role: entry.role as ImageRole,
        altText: `${COMPANY} – ${entry.role} (Platzhalter, generiert)`,
        aspectRatio: entry.aspectRatio,
        width: null,
        height: null,
        localPath: `assets/${filename}`,
        formats: null,
      };
    })
  );
  return rawAssets;
}

function buildBasePage(industry: string, outDir: string, variant = CONCEPT_VARIANTS[0]) {
  const profile = buildVisualProfile({ industry }, variant);
  const seed = COMPANY + LOCATION;
  const rawAssets = writeAssetSvgs(outDir, profile, seed);
  const demoData: DemoData = {
    companyName: COMPANY,
    industry,
    location: LOCATION,
    address: null,
    contactPhone: null,
    contactEmail: null,
    latitude: null,
    longitude: null,
  };
  const { pages } = renderDemoSite(demoData, profile, rawAssets, variant);
  const indexPage = pages.find((p) => p.filename === "index.html") ?? pages[0];
  const tagline = taglineFor(COMPANY, LOCATION, profile, seed);
  return { html: indexPage.html, pages, profile, rawAssets, tagline };
}

function replaceHero(html: string, replacement: string): string {
  const heroRegex = /<section class="hero[^"]*">[\s\S]*?<\/section>/;
  if (!heroRegex.test(html)) throw new Error("Could not locate hero section");
  return html.replace(heroRegex, replacement);
}

function injectCss(html: string, css: string): string {
  return html.replace("</style>", `${css}\n</style>`);
}

async function main() {
  const showcaseRoot = path.join("public", "demos", "_showcase");
  fs.rmSync(showcaseRoot, { recursive: true, force: true });

  // Showcase 1: Filmbot scalloped hero + Qissa marquee (Restaurant)
  {
    const dir = path.join(showcaseRoot, "scalloped-hero-marquee");
    const { html, profile, rawAssets } = buildBasePage("Restaurant", dir);
    const scallopedAssets = rawAssets
      .filter((a) => a.role === "service" || a.role === "editorial")
      .map((a) => toAssetView(a));
    const tagline = taglineFor(COMPANY, LOCATION, profile, COMPANY + LOCATION);
    const hero = scallopedHeroSection(scallopedAssets, COMPANY, tagline);
    const marquee = marqueeSection(deriveServiceLabels(profile));
    let output = replaceHero(html, hero + marquee);
    output = injectCss(
      output,
      `
  .scalloped-hero { padding: clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 6vw, 5rem); }
  .scalloped-hero-text { max-width: 40rem; margin-bottom: clamp(2rem, 5vw, 3rem); }
  .scalloped-hero-text h1 { font-size: clamp(2rem, 4.5vw, 3.2rem); margin-bottom: 0.75rem; }
  .scalloped-hero-text p { font-size: 1.1rem; color: color-mix(in srgb, var(--fg) 75%, transparent); }
  .scalloped-columns { display: flex; gap: clamp(0.75rem, 2vw, 1.5rem); align-items: flex-start; }
  .scalloped-col { flex: 1; aspect-ratio: 2 / 5; border-radius: 999px; overflow: hidden; transform: translateY(var(--offset)); box-shadow: 0 20px 40px -22px rgba(0,0,0,0.3); }
  .scalloped-col-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  @media (max-width: 720px) {
    .scalloped-columns { flex-wrap: wrap; }
    .scalloped-col { flex: 1 1 calc(50% - 0.5rem); aspect-ratio: 3 / 4; transform: none; }
  }
  .marquee { overflow: hidden; white-space: nowrap; padding: clamp(1.5rem, 4vw, 2.5rem) 0; background: var(--primary); }
  .marquee-track { display: inline-flex; width: max-content; animation: marquee-scroll 26s linear infinite; }
  .marquee-track span { font-family: var(--font-heading); font-style: italic; font-size: clamp(1.4rem, 3.5vw, 2.4rem); color: #fff; padding: 0 0.75rem; }
  .marquee-dot { font-style: normal !important; opacity: 0.6; }
  @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .marquee-track { animation-play-state: paused; } }
`
    );
    fs.writeFileSync(path.join(dir, "index.html"), output, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }

  // Showcase 2: Rezo Zero typography-only hero (Rechtsanwalt)
  {
    const dir = path.join(showcaseRoot, "typography-hero");
    const { html, profile } = buildBasePage("Rechtsanwalt", dir);
    const tagline = taglineFor(COMPANY, LOCATION, profile, COMPANY + LOCATION);
    const hero = typographyHeroSection(COMPANY, tagline, "minimal", "#kontakt", null, "");
    let output = replaceHero(html, hero);
    output = injectCss(
      output,
      `
  .typo-hero { padding: clamp(4rem, 14vw, 9rem) clamp(1.5rem, 6vw, 5rem); background: var(--bg); }
  .typo-hero-content { max-width: 56rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .typo-hero-content h1 { font-size: clamp(2.6rem, 7vw, 5.5rem); line-height: 1.02; }
  .typo-hero-tagline { font-family: var(--font-heading); font-size: clamp(1.3rem, 3vw, 2rem); color: color-mix(in srgb, var(--fg) 78%, transparent); }
  .typo-hero .cta-link { color: var(--primary); text-shadow: none; }
  .typo-hero .btn-ghost { background: transparent; border-color: var(--border); color: var(--fg); }
`
    );
    fs.writeFileSync(path.join(dir, "index.html"), output, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }

  // Showcase 3: United Carriers scroll-scrubbed atmosphere gradient (Hotel)
  // — no splicing needed, the "asymmetric" variant's scroll-scrub
  // motionStructure already triggers gsapMotionScript's new effect.
  {
    const dir = path.join(showcaseRoot, "atmosphere-gradient");
    const variant = getVariant("asymmetric");
    const { html } = buildBasePage("Hotel", dir, variant);
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }

  // Showcase 4: Serenity Hair handwritten-script aside (Friseur)
  {
    const dir = path.join(showcaseRoot, "script-aside");
    const { html } = buildBasePage("Friseur", dir);
    let output = html.replace(
      /(<h1 data-reveal style="--stagger-index:0">)/,
      `${scriptAside("Willkommen!")}$1`
    );
    output = output.replace("</head>", `${scriptAsideFontLink()}\n</head>`);
    fs.writeFileSync(path.join(dir, "index.html"), output, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }

  // Showcase 5: Podium gooey/metaball blob hero (Fahrradladen, energetic-punch)
  {
    const dir = path.join(showcaseRoot, "gooey-hero");
    const variant = getVariant("dynamic-energy");
    const { html, rawAssets, tagline } = buildBasePage("Fahrradladen", dir, variant);
    const heroAsset = rawAssets.find((a) => a.role === "hero");
    const hero = gooeyHeroSection(heroAsset ? toAssetView(heroAsset) : undefined, COMPANY, tagline);
    const output = replaceHero(html, hero);
    fs.writeFileSync(path.join(dir, "index.html"), output, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }

  // Showcase 6: Gionatan Nese scattered (non-grid) gallery (Friseur)
  // — the editorial section lives on ueber-uns.html, not the homepage.
  {
    const dir = path.join(showcaseRoot, "scattered-gallery");
    const { pages, rawAssets } = buildBasePage("Friseur", dir);
    const ueberUnsPage = pages.find((p) => p.filename === "ueber-uns.html");
    if (!ueberUnsPage) throw new Error("Friseur profile has no ueber-uns.html page");
    const galleryAssets = rawAssets.filter((a) => a.role === "editorial" || a.role === "service").map((a) => toAssetView(a));
    const rows = buildEditorialRows(COMPANY, LOCATION, galleryAssets.length);
    const items = galleryAssets.map((asset, i) => ({ asset, headline: rows[i].headline }));
    const gallery = scatteredGallerySection(items, "Galerie");
    const editorialRegex = /<section class="editorial">[\s\S]*?<\/section>/;
    if (!editorialRegex.test(ueberUnsPage.html)) throw new Error("Could not locate editorial section on ueber-uns.html");
    let output = ueberUnsPage.html.replace(editorialRegex, gallery);
    // Drop the now-orphaned lightbox markup (targets .editorial-lightbox-trigger, none left on this page)
    output = output.replace(/<div class="lightbox"[\s\S]*?<\/div>\n/, "");
    fs.writeFileSync(path.join(dir, "index.html"), output, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }

  // Showcase 7: ERA Residence rotating seal badge + arched section edge
  // (Immobilienmakler — the industry the source site actually serves)
  {
    const dir = path.join(showcaseRoot, "seal-badge-arch");
    const { html } = buildBasePage("Immobilienmakler", dir);
    // Seal sits inside the hero (which is position:relative), and the
    // section right after the hero gets the arched top edge.
    let output = html.replace(/(<div class="hero-content)/, `${rotatingSealBadge(COMPANY)}\n    $1`);
    let archApplied = false;
    output = output.replace(/<section class="(?!hero)([^"]*)"/g, (match, cls: string) => {
      if (archApplied) return match;
      archApplied = true;
      return `<section class="${cls} arched-top"`;
    });
    if (!archApplied) throw new Error("Keine Sektion nach dem Hero gefunden, die den Bogen bekommen könnte");
    fs.writeFileSync(path.join(dir, "index.html"), output, "utf-8");
    console.log(`Written: ${path.join(dir, "index.html")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
