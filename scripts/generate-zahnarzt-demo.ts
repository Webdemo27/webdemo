/** Builds the Zahnarzt industry demo modelled on the reference video
 * the user supplied: dark stacked hero over a chrome-tooth key visual,
 * an expanding treatment accordion, and the existing contact block.
 *
 * All imagery comes from OpenRouter (never abstract SVG placeholders) —
 * the reference is entirely image-driven, so placeholders would miss
 * the point of the rebuild.
 *
 *   npx tsx --env-file=.env scripts/generate-zahnarzt-demo.ts
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
  type DemoData,
} from "../src/lib/demo-generator/template";
import { OpenRouterVideoProvider } from "../src/lib/video/providers/openrouter-video-provider";
import { watermarkAndEncodeVideo } from "../src/lib/video/watermark";

const COMPANY = "Musterpraxis";
const LOCATION = "Musterstadt";
const INDUSTRY = "Zahnarzt";
const OUT_DIR = path.join("public", "demos", "_showcase", "zahnarzt-praxis");

/** Scene briefs mirroring the reference's look: one hero key visual and
 * one bright, product-style shot per real service label. They describe
 * imagery only — no claim about any actual practice. */
const HERO_PROMPT =
  "A single oversized glossy chrome-and-glass molar tooth sculpture floating above a sunlit green meadow under a bright blue sky with soft clouds, photorealistic 3D render, iridescent reflective material, centred composition, cinematic depth of field";

const TREATMENT_PROMPTS: Record<string, string> = {
  Vorsorge:
    "Clean minimal still life of dental hygiene instruments and a mirror on a soft white pedestal, bright airy studio light, pale neutral background, editorial product photography",
  "Ästhetische Zahnheilkunde":
    "Clean minimal still life of a set of transparent clear dental aligners on a glass tray, bright airy studio light, pale neutral background, editorial product photography",
  Notfalltermine:
    "Calm modern dental treatment room with a chair by a large window, plants, soft daylight, bright and reassuring, architectural interior photography",
};

async function generate(provider: OpenRouterImageProvider, prompt: string, aspect: string, baseName: string, profile: ReturnType<typeof buildVisualProfile>) {
  console.log(`  … ${baseName}`);
  const image = await provider.generateImage({
    prompt,
    role: "hero",
    aspectRatio: aspect,
    styleGuide: {
      artDirection: profile.artDirection,
      imageryStyle: profile.imageryStyle,
      colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
    },
  });
  const watermarked = await stampDemoWatermark(image.buffer);
  const saved = await optimizeAndSave(watermarked, path.join(OUT_DIR, "assets"), baseName, aspect);
  return {
    role: baseName.startsWith("hero") ? "hero" : "service",
    altText: `${COMPANY} – ${baseName} (KI-generiert, openrouter-images)`,
    aspectRatio: aspect,
    width: saved.width,
    height: saved.height,
    localPath: null,
    formats: saved.formats,
  };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY fehlt in .env");

  const variant = getVariant("premium-editorial");
  const profile = buildVisualProfile({ industry: INDUSTRY }, variant);
  const services = deriveServiceLabels(profile);
  console.log(`Leistungen aus dem Zahnarzt-Profil: ${services.join(", ")}`);

  fs.mkdirSync(path.join(OUT_DIR, "assets"), { recursive: true });
  const provider = new OpenRouterImageProvider();

  console.log("Bilder über OpenRouter generieren:");
  const heroRaw = await generate(provider, HERO_PROMPT, "16:9", "hero-1", profile);
  const treatmentRaws = [];
  for (let i = 0; i < services.length; i++) {
    const label = services[i];
    const prompt = TREATMENT_PROMPTS[label] ?? `Clean minimal editorial photograph representing ${label} at a modern dental practice, bright airy studio light`;
    treatmentRaws.push(await generate(provider, prompt, "3:4", `service-${i + 1}`, profile));
  }

  const demoData: DemoData = {
    companyName: COMPANY,
    industry: INDUSTRY,
    location: LOCATION,
    address: null,
    contactPhone: null,
    contactEmail: null,
    latitude: null,
    longitude: null,
  };

  console.log("\nHintergrundvideo über OpenRouter generieren (~$0.20)…");
  const videoProvider = new OpenRouterVideoProvider();
  const video = await videoProvider.generateVideo({
    prompt:
      "Slow ambient shot of a calm, modern dental practice interior with a treatment chair by a large window, plants and soft daylight, gentle camera drift",
    aspectRatio: "16:9",
    durationSeconds: 8,
    resolution: "1080p",
    styleGuide: {
      artDirection: profile.artDirection,
      imageryStyle: profile.imageryStyle,
      colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
    },
  });
  const encoded = await watermarkAndEncodeVideo(video.buffer, path.join(OUT_DIR, "assets"), "bg-video");
  console.log(
    `  ${video.durationSeconds}s @ ${video.resolution}, Kosten: ${video.costUsd != null ? `$${video.costUsd.toFixed(3)}` : "unbekannt"}`
  );

  const { pages } = renderDemoSite(demoData, profile, [heroRaw, ...treatmentRaws], variant);
  const base = pages.find((p) => p.filename === "index.html") ?? pages[0];

  const heroView = toAssetView(heroRaw);
  const hero = stackedHeroSection(
    "Gesunde Zähne mit Ruhe",
    `Zahnarztpraxis in ${LOCATION}. Vorsorge, ästhetische Zahnheilkunde und Notfalltermine — in einer Praxis.`,
    COMPANY,
    LOCATION,
    heroView
  );
  const accordion = treatmentAccordionSection(
    treatmentRaws.map((raw, i) => ({ asset: toAssetView(raw), label: services[i] })),
    "Behandlung rund um Ihr Lächeln"
  );

  let output = base.html.replace(/<section class="hero[^"]*">[\s\S]*?<\/section>/, hero + accordion);

  // One long scrolling page, not four short ones: the whole point is to
  // give the scroll-scrubbed background enough travel to be visible, and
  // a 200px-tall page scrubs the entire clip in one flick. Pull the
  // sections off the secondary pages onto this one.
  const extraSections = pages
    .filter((p) => p.filename !== base.filename)
    .map((p) => {
      const body = p.html.match(/<\/header>([\s\S]*?)<footer/);
      return body ? body[1] : "";
    })
    .join("\n");
  output = output.replace(/(\n\s*<footer)/, `\n${extraSections}$1`);

  // Same page-wide scrubbed background as the Orangerie demo: one fixed
  // clip behind every section, driven by the document's scroll range.
  const videoAsset = toAssetView({
    role: "hero",
    altText: `${COMPANY} – Hintergrundvideo (KI-generiert)`,
    aspectRatio: "16:9",
    width: null,
    height: null,
    localPath: null,
    formats: {
      ...heroRaw.formats,
      video: path.basename(encoded.videoPath),
      poster: path.basename(encoded.posterPath),
      videoScrub: path.basename(encoded.scrubPath),
    },
  });
  output = output.replace("<body>", `<body class="page-video-mode">\n  ${pageVideoBackground(videoAsset)}`);
  output = output.replace("</body>", `${treatmentAccordionScript()}\n${scrollVideoScript()}\n</body>`);

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), output, "utf-8");
  console.log(`\nGeschrieben: ${path.join(OUT_DIR, "index.html")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
