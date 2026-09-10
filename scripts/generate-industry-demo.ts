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
import { toAssetView } from "../src/lib/demo-generator/asset-view";
import {
  renderDemoSite,
  stackedHeroSection,
  treatmentAccordionSection,
  treatmentAccordionScript,
  pageVideoBackground,
  scrollVideoScript,
  deriveServiceLabels,
  secondaryPageLabel,
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
    .replace(/[^a-z0-9]+/g, "-");
}

async function buildIndustry(industry: string) {
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
  const serviceRaws = [];
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
  const encoded = await watermarkAndEncodeVideo(video.buffer, assetsDir, "bg-video");
  console.log(`  Video fertig: ${video.durationSeconds}s @ ${video.resolution}, ${video.costUsd != null ? `$${video.costUsd.toFixed(3)}` : "Kosten unbekannt"}`);

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

  // undefined hero asset on purpose — the stacked hero is type over the
  // page-wide clip, with no image of its own.
  const hero = stackedHeroSection(
    spec.headline,
    `${industry} in ${LOCATION}. ${services.join(", ")} — alles an einem Ort.`,
    spec.company,
    LOCATION,
    undefined
  );
  const accordion = treatmentAccordionSection(
    serviceRaws.map((raw, i) => ({ asset: toAssetView(raw), label: services[i] })),
    secondaryPageLabel(profile.industryKey)
  );

  let output = base.html.replace(/<section class="hero[^"]*">[\s\S]*?<\/section>/, hero + accordion);

  // One long page: the scrubbed background needs real scroll travel,
  // and four short pages give it none.
  const extra = pages
    .filter((p) => p.filename !== base.filename)
    .map((p) => (p.html.match(/<\/header>([\s\S]*?)<footer/) ?? ["", ""])[1])
    .join("\n");
  output = output.replace(/(\n\s*<footer)/, `\n${extra}$1`);

  const videoAsset = toAssetView({
    role: "hero",
    altText: `${spec.company} – Hintergrundvideo (KI-generiert)`,
    aspectRatio: "16:9",
    width: null,
    height: null,
    localPath: null,
    formats: {
      video: path.basename(encoded.videoPath),
      poster: path.basename(encoded.posterPath),
      videoScrub: path.basename(encoded.scrubPath),
    },
  });
  output = output.replace("<body>", `<body class="page-video-mode">\n  ${pageVideoBackground(videoAsset)}`);
  output = output.replace("</body>", `${treatmentAccordionScript()}\n${scrollVideoScript()}\n</body>`);

  fs.writeFileSync(path.join(outDir, "index.html"), output, "utf-8");
  console.log(`  Geschrieben: ${path.join(outDir, "index.html")}`);
  return { industry, cost: video.costUsd ?? 0 };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY fehlt in .env");
  const arg = process.argv[2];
  if (!arg) throw new Error(`Aufruf: generate-industry-demo.ts <Branche|--alle>\nBranchen: ${Object.keys(INDUSTRIES).join(", ")}`);

  const list = arg === "--alle" ? Object.keys(INDUSTRIES) : [arg];
  let total = 0;
  for (const industry of list) {
    const r = await buildIndustry(industry);
    total += r.cost;
  }
  console.log(`\nFertig: ${list.length} Branche(n). Video-Kosten gesamt: $${total.toFixed(2)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
