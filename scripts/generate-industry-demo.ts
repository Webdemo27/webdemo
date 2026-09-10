/** Builds an industry demo in the house style derived from the dentist
 * reference video: dark stacked uppercase hero over an oversized chrome
 * key visual, an expanding treatment/service accordion, every section
 * on one long page, and a page-wide scroll-scrubbed background video.
 *
 * Every industry gets its OWN generated imagery and its OWN clip — the
 * shared thing is the system, not the footage. All media comes from
 * OpenRouter.
 *
 *   npx tsx --env-file=.env scripts/generate-industry-demo.ts Restaurant
 *   npx tsx --env-file=.env scripts/generate-industry-demo.ts --alle
 */
import fs from "node:fs";
import path from "node:path";
import { buildVisualProfile } from "../src/lib/visual-director";
import { getVariant } from "../src/lib/visual-director/variants";
import { OpenRouterImageProvider } from "../src/lib/images/providers/openrouter-image-provider";
import { optimizeAndSave } from "../src/lib/images/optimizer";
import { stampDemoWatermark } from "../src/lib/images/watermark";
import { toAssetView, type DemoAssetView } from "../src/lib/demo-generator/asset-view";
import {
  renderDemoSite,
  stackedHeroSection,
  treatmentAccordionSection,
  treatmentAccordionScript,
  pageVideoBackground,
  scrollVideoScript,
  deriveServiceLabels,
  secondaryPageLabel,
  floatingTabBar,
  floatingTabBarScript,
  scatteredGallerySection,
  typographyHeroSection,
  buildEditorialRows,
  type TabBarStyle,
  type DemoData,
} from "../src/lib/demo-generator/template";
import { OpenRouterVideoProvider } from "../src/lib/video/providers/openrouter-video-provider";
import { watermarkAndEncodeVideo } from "../src/lib/video/watermark";

const LOCATION = "Musterstadt";

interface IndustrySpec {
  company: string;
  /** Short, industry-generic positioning line — the same category of
   * copy taglineFor() already produces. Never a factual claim about a
   * real business (no awards, no years, no staff). */
  headline: string;
  /** The oversized chrome key visual — generated as the background
   * VIDEO, not as a still. Two competing visuals (a static hero image
   * in front of a moving background) is what the first pass got wrong:
   * the background is always the high-resolution scrubbed clip, and the
   * key visual is what it shows. Keeping one motif across every
   * industry is what makes the set read as one house style rather than
   * twelve unrelated pages. */
  keyVisual: string;
}

const INDUSTRIES: Record<string, IndustrySpec> = {
  Restaurant: {
    company: "Musterrestaurant",
    headline: "Gutes Essen braucht Zeit",
    keyVisual:
      "A single oversized glossy chrome-and-glass dinner plate with a domed cloche floating above a sunlit green meadow under a bright sky with soft clouds, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Zahnarzt: {
    company: "Musterpraxis",
    headline: "Gesunde Zähne mit Ruhe",
    keyVisual:
      "A single oversized glossy chrome-and-glass molar tooth sculpture floating above a sunlit green meadow under a bright blue sky with soft clouds, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Café: {
    company: "Mustercafé",
    headline: "Zeit für eine Pause",
    keyVisual:
      "A single oversized glossy chrome-and-glass coffee cup and saucer floating above a sunlit green meadow under a bright sky with soft clouds, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Bäckerei: {
    company: "Musterbäckerei",
    headline: "Jeden Morgen frisch",
    keyVisual:
      "A single oversized glossy chrome-and-glass bread loaf sculpture floating above a sunlit wheat field under a bright sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Friseur: {
    company: "Mustersalon",
    headline: "Ihr Stil beginnt hier",
    keyVisual:
      "A single oversized glossy chrome-and-glass pair of hairdressing scissors floating above a sunlit green meadow under a bright sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Immobilienmakler: {
    company: "Musterimmobilien",
    headline: "Zuhause gut beraten",
    keyVisual:
      "A single oversized glossy chrome-and-glass house sculpture floating above a sunlit green meadow under a bright sky with soft clouds, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Hotel: {
    company: "Musterhotel",
    headline: "Ankommen und bleiben",
    keyVisual:
      "A single oversized glossy chrome-and-glass hotel bell sculpture floating above a sunlit green meadow under a bright sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Rechtsanwalt: {
    company: "Musterkanzlei",
    headline: "Klarheit im Recht",
    keyVisual:
      "A single oversized glossy chrome-and-glass scales of justice sculpture floating above a calm landscape under an overcast sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Steuerberater: {
    company: "Musterkanzlei",
    headline: "Zahlen ohne Sorgen",
    keyVisual:
      "A single oversized glossy chrome-and-glass abacus sculpture floating above a calm landscape under a clear sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Autowerkstatt: {
    company: "Musterwerkstatt",
    headline: "Technik in guten Händen",
    keyVisual:
      "A single oversized glossy chrome-and-glass wrench sculpture floating above a sunlit landscape under a dramatic sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Fahrradladen: {
    company: "Musterradladen",
    headline: "Fahren mit Freude",
    keyVisual:
      "A single oversized glossy chrome-and-glass bicycle wheel sculpture floating above a sunlit green meadow under a bright sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
  Blumenladen: {
    company: "Musterblumen",
    headline: "Blumen für jeden Anlass",
    keyVisual:
      "A single oversized glossy chrome-and-glass tulip sculpture floating above a sunlit flower meadow under a bright sky, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field",
  },
};

function slugFor(industry: string): string {
  return industry
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    // Accents beyond the umlauts (Café) were dropping to a bare "-",
    // producing folder names like "branche-caf-".
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rebuilds the raw asset descriptors from what is already on disk, so
 * a template change costs nothing. optimizeAndSave writes
 * `<base>-<width>.<ext>`, which is enough to reconstruct the
 * width-keyed format maps toAssetView expects. */
interface RawAsset {
  role: string;
  altText: string;
  aspectRatio: string;
  width: number | null;
  height: number | null;
  localPath: string | null;
  formats: unknown;
}

function assetsFromDisk(assetsDir: string, company: string): { serviceRaws: RawAsset[]; hasVideo: boolean } {
  const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
  const bases = Array.from(
    new Set(
      files
        .map((f) => f.match(/^(service-\d+)-\d+\.(webp|avif)$/)?.[1])
        .filter((b): b is string => Boolean(b))
    )
  ).sort();

  const serviceRaws = bases.map((base) => {
    const formats: { webp: Record<string, string>; avif: Record<string, string> } = { webp: {}, avif: {} };
    for (const f of files) {
      const m = f.match(new RegExp(`^${base}-(\\d+)\\.(webp|avif)$`));
      if (m) formats[m[2] as "webp" | "avif"][m[1]] = f;
    }
    return {
      role: "service",
      altText: `${company} – ${base} (KI-generiert, openrouter-images)`,
      aspectRatio: "3:4",
      width: 0,
      height: 0,
      localPath: null,
      formats,
    };
  });

  const hasVideo = files.includes("bg-video-scrub.mp4");
  return { serviceRaws, hasVideo };
}

async function buildIndustry(industry: string, htmlOnly = false) {
  const spec = INDUSTRIES[industry];
  if (!spec) throw new Error(`Keine Vorgaben für Branche "${industry}". Bekannt: ${Object.keys(INDUSTRIES).join(", ")}`);

  const outDir = path.join("public", "demos", "_showcase", `branche-${slugFor(industry)}`);
  const assetsDir = path.join(outDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const variant = getVariant("premium-editorial");
  const profile = buildVisualProfile({ industry }, variant);
  const services = deriveServiceLabels(profile);
  console.log(`\n=== ${industry} (${spec.company}) ===`);
  console.log(`Leistungen: ${services.join(", ")}`);

  const imageProvider = new OpenRouterImageProvider();
  async function image(prompt: string, aspect: string, baseName: string) {
    console.log(`  Bild: ${baseName}`);
    const generated = await imageProvider.generateImage({
      prompt,
      role: baseName.startsWith("hero") ? "hero" : "service",
      aspectRatio: aspect,
      styleGuide: {
        artDirection: profile.artDirection,
        imageryStyle: profile.imageryStyle,
        colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
      },
    });
    const saved = await optimizeAndSave(await stampDemoWatermark(generated.buffer), assetsDir, baseName, aspect);
    return {
      role: baseName.startsWith("hero") ? "hero" : "service",
      altText: `${spec.company} – ${baseName} (KI-generiert, openrouter-images)`,
      aspectRatio: aspect,
      width: saved.width,
      height: saved.height,
      localPath: null,
      formats: saved.formats,
    };
  }

  // No hero still is generated: the key visual IS the background clip.
  // Rendering both put a static image in front of moving footage, which
  // is the one thing this layout must not do.
  let serviceRaws: RawAsset[] = [];
  let videoCost = 0;

  if (htmlOnly) {
    const disk = assetsFromDisk(assetsDir, spec.company);
    if (!disk.hasVideo || disk.serviceRaws.length === 0) {
      throw new Error(`--nur-html: Für "${industry}" liegen noch keine Assets in ${assetsDir}.`);
    }
    serviceRaws = disk.serviceRaws;
    console.log(`  Assets von der Platte übernommen (${serviceRaws.length} Bilder + Video) — keine Kosten.`);
  } else {
    for (let i = 0; i < services.length; i++) {
      serviceRaws.push(
        await image(
          `Clean minimal editorial photograph representing "${services[i]}" at a ${industry}, bright airy studio light, pale neutral background, no text`,
          "3:4",
          `service-${i + 1}`
        )
      );
    }

    console.log("  Video (Leitmotiv als Hintergrund) …");
    const video = await new OpenRouterVideoProvider().generateVideo({
      prompt: `${spec.keyVisual}. Slow cinematic camera orbit around the sculpture, gentle drifting clouds, subtle light shifting across the reflective surface.`,
      aspectRatio: "16:9",
      durationSeconds: 8,
      resolution: "1080p",
      styleGuide: {
        artDirection: profile.artDirection,
        imageryStyle: profile.imageryStyle,
        colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
      },
    });
    await watermarkAndEncodeVideo(video.buffer, assetsDir, "bg-video");
    videoCost = video.costUsd ?? 0;
    console.log(`  Video fertig: ${video.durationSeconds}s @ ${video.resolution}, ${video.costUsd != null ? `$${video.costUsd.toFixed(3)}` : "Kosten unbekannt"}`);
  }

  const demoData: DemoData = {
    companyName: spec.company,
    industry,
    location: LOCATION,
    address: null,
    contactPhone: null,
    contactEmail: null,
    latitude: null,
    longitude: null,
  };

  const { pages } = renderDemoSite(demoData, profile, serviceRaws, variant);
  const base = pages.find((p) => p.filename === "index.html") ?? pages[0];

  const supporting = `${industry} in ${LOCATION}. ${services.join(", ")} — alles an einem Ort.`;
  const serviceViews = serviceRaws.map((raw, i) => ({ asset: toAssetView(raw), label: services[i] }));

  /** Three variants per industry, all sharing the same generated video
   * and images — the expensive part is produced once, so a variant
   * costs nothing but disk. They differ where it is actually visible:
   * the opening, how services are presented, and the tab treatment. */
  const VARIANTS: Array<{ slug: string; name: string; tab: TabBarStyle; build: () => string }> = [
    {
      slug: "a-kinetisch",
      name: "Kinetisch",
      tab: "dark",
      build: () =>
        stackedHeroSection(spec.headline, supporting, spec.company, LOCATION, undefined) +
        treatmentAccordionSection(serviceViews, secondaryPageLabel(profile.industryKey)),
    },
    {
      slug: "b-editorial",
      name: "Editorial",
      tab: "light",
      build: () =>
        typographyHeroSection(spec.company, spec.headline, "standard", "#kontakt", null, "") +
        scatteredGallerySection(
          serviceViews.map((v, i) => ({
            asset: v.asset,
            headline: buildEditorialRows(spec.company, LOCATION, serviceViews.length)[i].headline,
          })),
          secondaryPageLabel(profile.industryKey)
        ),
    },
    {
      slug: "c-galerie",
      name: "Galerie",
      tab: "glass",
      build: () =>
        stackedHeroSection(spec.headline, supporting, spec.company, LOCATION, undefined) +
        scatteredGallerySection(
          serviceViews.map((v, i) => ({ asset: v.asset, headline: services[i] })),
          secondaryPageLabel(profile.industryKey)
        ),
    },
  ];

  const tabItems = [
    { href: "#", label: "Start", icon: "home" as const, active: true },
    { href: "#leistungen", label: secondaryPageLabel(profile.industryKey), icon: "services" as const, active: false },
    { href: "#ueber-uns", label: "Über uns", icon: "about" as const, active: false },
    { href: "#kontakt", label: "Kontakt", icon: "contact" as const, active: false },
  ];

  // One long page: the scrubbed background needs real scroll travel,
  // and four short pages give it none.
  const extra = pages
    .filter((p) => p.filename !== base.filename)
    .map((p) => (p.html.match(/<\/header>([\s\S]*?)<footer/) ?? ["", ""])[1])
    .join("\n");

  const videoAsset = toAssetView({
    role: "hero",
    altText: `${spec.company} – Hintergrundvideo (KI-generiert)`,
    aspectRatio: "16:9",
    width: null,
    height: null,
    localPath: null,
    // Names are fixed by watermarkAndEncodeVideo's baseName, so an
    // HTML-only rebuild can address the same files without re-encoding.
    formats: {
      video: "bg-video.mp4",
      poster: "bg-video-poster.jpg",
      videoScrub: "bg-video-scrub.mp4",
    },
  });
  const videoLayer = pageVideoBackground(videoAsset);

  for (const v of VARIANTS) {
    let out = base.html.replace(/<section class="hero[^"]*">[\s\S]*?<\/section>/, v.build());
    out = out.replace(/(\n\s*<footer)/, `\n${extra}$1`);
    out = out.replace("<body>", `<body class="page-video-mode">\n  ${videoLayer}`);
    out = out.replace(
      "</body>",
      `${floatingTabBar(tabItems, v.tab)}\n${treatmentAccordionScript()}\n${floatingTabBarScript()}\n${scrollVideoScript()}\n</body>`
    );

    // Variants live beside each other and share ../assets, so three
    // pages cost one set of media rather than three.
    const variantDir = path.join(outDir, v.slug);
    fs.mkdirSync(variantDir, { recursive: true });
    out = out.replace(/(src|href|poster)="assets\//g, '$1="../assets/');
    out = out.replace(/srcset="([^"]*)"/g, (_m, set: string) =>
      `srcset="${set.replace(/(^|,\s*)assets\//g, "$1../assets/")}"`
    );
    out = out.replace(/data-video-src="assets\//g, 'data-video-src="../assets/');
    fs.writeFileSync(path.join(variantDir, "index.html"), out, "utf-8");
    console.log(`  Variante ${v.name}: ${path.join(variantDir, "index.html")}`);
  }

  return { industry, cost: videoCost };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY fehlt in .env");
  const arg = process.argv[2];
  if (!arg) throw new Error(`Aufruf: generate-industry-demo.ts <Branche|--alle>\nBranchen: ${Object.keys(INDUSTRIES).join(", ")}`);

  const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
  const htmlOnly = flags.includes("--nur-html");
  const list = arg === "--alle" || htmlOnly && arg === "--alle" ? Object.keys(INDUSTRIES) : arg.startsWith("--") ? Object.keys(INDUSTRIES) : [arg];
  let total = 0;
  for (const industry of list) {
    const r = await buildIndustry(industry, htmlOnly);
    total += r.cost;
  }
  console.log(`\nFertig: ${list.length} Branche(n). Video-Kosten gesamt: $${total.toFixed(2)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
