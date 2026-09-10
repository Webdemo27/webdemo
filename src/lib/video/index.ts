import path from "path";
import { prisma, logActivity } from "../db";
import { toJson, fromJson } from "../db/json";
import type { VisualProfile } from "../visual-director/types";
import { rerenderDemoFromStoredState } from "../demo-generator";
import { getVariant } from "../visual-director/variants";
import { OpenRouterVideoProvider, isOpenRouterVideoConfigured } from "./providers/openrouter-video-provider";
import { watermarkAndEncodeVideo } from "./watermark";
import type { SavedVideoAsset } from "./types";

export { isOpenRouterVideoConfigured } from "./providers/openrouter-video-provider";
export { isFfmpegAvailable } from "./watermark";

const DEMOS_ROOT = path.join(process.cwd(), "public", "demos");

/** Short on purpose: a hero background loop reads as ambient, and cost
 * is billed per second (see the model note in the provider). */
const DURATION_SECONDS = 5;

/**
 * 1080p, not 720p: the clip is the full-bleed hero background, so on any
 * normal laptop a 1280px-wide source gets upscaled and visibly softens.
 * On veo-3.1-lite this moves billing from the
 * `duration_seconds_without_audio_720p` SKU ($0.03/s) to
 * `duration_seconds_without_audio` ($0.05/s) — $0.20 for a 4s clip.
 *
 * Not 4K, deliberately: veo-3.1-lite has no 4K tier at all (that needs
 * veo-3.1-fast at $0.25/s, $1.00 a clip), and more importantly the
 * scroll-scrub encode has to be all-intra, where 720p already weighs
 * 1.8MB for 4 seconds. 4K would land in the tens of MB for a background
 * nobody views at native size — the wrong trade for a hero asset.
 */
const RESOLUTION = "1080p";

/** What the clip should actually show, per industry — the same
 * "describe the setting, never claim a fact" discipline the image
 * prompts follow. Nothing here asserts anything about the specific
 * business (no staff, no awards, no menu items); it describes an
 * atmosphere the industry genuinely has. */
const INDUSTRY_SCENES: Record<string, string> = {
  Restaurant: "Slow ambient shot of a warm, softly lit restaurant dining room, steam rising, candlelight, empty tables set for service",
  Café: "Slow ambient shot of a cosy café interior, morning light through the window, steam rising from a cup",
  Bäckerei: "Slow ambient shot of a warm bakery interior, golden light, fresh bread on wooden shelves",
  Hotel: "Slow ambient shot of an elegant hotel lobby at dusk, warm lamps, calm and spacious",
  Friseur: "Slow ambient shot of a calm, modern hair salon interior, soft daylight, clean styling stations",
  Blumenladen: "Slow ambient shot of a flower shop interior, daylight, buckets of fresh cut flowers",
  Immobilienmakler: "Slow aerial-style drift over a quiet residential street with well-kept houses at golden hour",
  Rechtsanwalt: "Slow ambient shot of a quiet, formal office interior, tall windows, bookshelves, muted daylight",
  Steuerberater: "Slow ambient shot of a calm modern office interior, soft daylight, clean desks",
  Autowerkstatt: "Slow ambient shot of a clean, well-lit car workshop interior, tools on the wall, polished floor",
  Fahrradladen: "Slow ambient shot of a bright bicycle shop interior, bikes lined up, daylight through the shopfront",
};

function sceneFor(profile: VisualProfile): string {
  return (
    INDUSTRY_SCENES[profile.industryKey] ??
    `Slow ambient establishing shot of a tidy, welcoming ${profile.industryKey} business interior, natural daylight`
  );
}

/**
 * Generates one looping hero background video for a demo, burns the
 * DEMO watermark into every frame, and attaches it to the demo's
 * existing hero asset rather than creating a competing hero row — the
 * image formats already on that row stay as the poster/fallback, and
 * the template upgrades to <video> only when `formats.video` is present.
 *
 * Deliberately a separate, explicitly-triggered step and NOT part of
 * generateDemo(): unlike images (fractions of a cent), a clip costs
 * real money per second, so it must never fire implicitly on every
 * "Demo erstellen" click.
 */
export async function generateHeroVideoForDemo(demoId: string): Promise<SavedVideoAsset> {
  if (!isOpenRouterVideoConfigured()) {
    throw new Error("Videogenerierung ist nicht konfiguriert (OPENROUTER_API_KEY fehlt in .env).");
  }

  const demo = await prisma.demo.findUnique({
    where: { id: demoId },
    include: { lead: true, assets: { orderBy: { order: "asc" } } },
  });
  if (!demo) throw new Error("Demo nicht gefunden.");

  const profile = fromJson<VisualProfile>(demo.visualProfile);
  if (!profile) throw new Error("Diese Demo hat kein gespeichertes VisualProfile — bitte zuerst neu generieren.");

  const heroAsset = demo.assets.find((a) => a.role === "hero");
  if (!heroAsset) throw new Error("Diese Demo hat kein Hero-Asset, an das ein Video gehängt werden könnte.");

  // Check BEFORE spending: two hero styles deliberately render no
  // image at all — "color-block" is a solid colour panel and "3d" is a
  // live canvas — so a video attached to them would be generated,
  // billed, and then never displayed. Caught the expensive way: a
  // colour-block demo silently swallowed a paid clip.
  const variant = getVariant(demo.conceptVariant ?? "");
  if (variant.heroStyle === "color-block" || variant.heroStyle === "3d") {
    throw new Error(
      `Die Konzeptvariante "${variant.name}" nutzt einen ${variant.heroStyle}-Hero ohne Bildfläche — ` +
        "ein Video würde dort nie angezeigt. Bitte zuerst eine Variante mit Bild-Hero erzeugen " +
        "(Demo neu erstellen), sonst entstehen Kosten ohne sichtbares Ergebnis."
    );
  }

  const provider = new OpenRouterVideoProvider();
  const video = await provider.generateVideo({
    prompt: sceneFor(profile),
    aspectRatio: "16:9",
    durationSeconds: DURATION_SECONDS,
    resolution: RESOLUTION,
    styleGuide: {
      artDirection: profile.artDirection,
      imageryStyle: profile.imageryStyle,
      colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
    },
  });

  const destDir = path.join(DEMOS_ROOT, demo.slug, "assets");
  const { videoPath, posterPath, scrubPath } = await watermarkAndEncodeVideo(video.buffer, destDir, "hero-video");

  const existingFormats = (fromJson<Record<string, unknown>>(heroAsset.formats) ?? {}) as Record<string, unknown>;
  await prisma.demoAsset.update({
    where: { id: heroAsset.id },
    data: {
      formats: toJson({
        ...existingFormats,
        video: path.basename(videoPath),
        poster: path.basename(posterPath),
        videoScrub: path.basename(scrubPath),
      }),
    },
  });

  // The demo's HTML was rendered before this video existed, so it still
  // points at the still image — re-render from stored state (same
  // variant, same assets, no image regeneration) so the <video> is
  // actually used instead of sitting unreferenced on disk.
  await rerenderDemoFromStoredState(demo.id);

  const costLabel = video.costUsd != null ? `$${video.costUsd.toFixed(3)}` : "unbekannte Kosten";
  await logActivity(
    demo.leadId,
    "DEMO_VIDEO_GENERATED",
    `Hero-Video generiert (${video.model}, ${video.durationSeconds}s, ${video.resolution}, ${costLabel}, DEMO-Wasserzeichen eingebrannt).`
  );

  return { videoPath, posterPath, costUsd: video.costUsd };
}
