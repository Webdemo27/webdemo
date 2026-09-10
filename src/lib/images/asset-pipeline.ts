import { promises as fs } from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { toJson } from "../db/json";
import type { VisualProfile, AssetPlanEntry, ImageRole } from "../visual-director/types";
import type { ExtractedImageCandidate } from "./real-image-extractor";
import { generateAbstractSvg } from "./abstract-generator";
import { optimizeAndSave, readImageMetadata } from "./optimizer";
import { OpenAiImageProvider, isOpenAiImagesConfigured } from "./providers/openai-image-provider";
import { OpenRouterImageProvider, isOpenRouterImagesConfigured } from "./providers/openrouter-image-provider";
import { NotConfiguredProvider } from "./providers/not-configured-provider";
import type { ImageGenerationProvider } from "./types";

const ROLE_LABELS: Record<ImageRole, string> = {
  hero: "Hero-Bereich",
  service: "Leistung",
  product: "Produkt",
  team: "Team",
  environment: "Räumlichkeiten",
  detail: "Detail",
  editorial: "Impression",
  background: "Hintergrund",
  texture: "Textur",
  "3d": "3D-Element",
};

/** OpenRouter checked first: it's a single gateway to 30+ image models
 * (see openrouter-image-provider.ts), so it's the more flexible option
 * when both happen to be configured — not a judgment that OpenAI's
 * direct API is worse, just an arbitrary but stable tie-break. */
function getProvider(): ImageGenerationProvider {
  if (isOpenRouterImagesConfigured()) return new OpenRouterImageProvider();
  if (isOpenAiImagesConfigured()) return new OpenAiImageProvider();
  return new NotConfiguredProvider();
}

function assetsDir(slug: string): string {
  return path.join(process.cwd(), "public", "demos", slug, "assets");
}

function aspectValue(aspectRatio: string): number {
  const [w, h] = aspectRatio.split(":").map(Number);
  return w && h ? w / h : 4 / 3;
}

/** Picks the unused real candidate whose aspect ratio is closest to
 * what this slot needs — a landscape hero shouldn't get a portrait
 * crop of something unrelated just because it was first in the list. */
function pickBestCandidate(
  candidates: ExtractedImageCandidate[],
  used: Set<string>,
  targetAspect: number
): ExtractedImageCandidate | null {
  let best: ExtractedImageCandidate | null = null;
  let bestDiff = Infinity;
  for (const c of candidates) {
    if (used.has(c.sourceUrl)) continue;
    const diff = Math.abs(c.width / c.height - targetAspect);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
}

export interface AssetPipelineSummary {
  planned: number;
  fromRealPhotos: number;
  fromProvider: number;
  fromAbstractArt: number;
  errors: string[];
}

/** Fills a lead's demo asset plan: an image generation provider if one
 * is configured → deterministic abstract art (always available, never
 * fails). Scraping the lead's own site used to come first and no longer
 * runs at all — see the note at the call site. Clears any previous
 * assets for this demo first, so re-running produces a clean, consistent
 * set rather than accumulating duplicates. */
export async function generateAssetsForLead(
  leadId: string,
  profile: VisualProfile
): Promise<AssetPipelineSummary> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { demo: true } });
  if (!lead) throw new Error("Lead nicht gefunden.");
  if (!lead.demo) throw new Error("Für diesen Lead wurde noch keine Demo erstellt.");

  const demo = lead.demo;
  const destDir = assetsDir(demo.slug);
  await fs.mkdir(destDir, { recursive: true });

  await prisma.demoAsset.deleteMany({ where: { demoId: demo.id } });

  // Deliberately NOT scraping the lead's own site any more. What comes
  // back is rarely usable photography — it is promotional graphics with
  // their logo and campaign text baked in ("Silvester in der Orangerie"
  // landed as a hero), which reads as a collage of the old site rather
  // than a new design, and it is their material to begin with. Every
  // image is generated for us instead.
  const realCandidates: ExtractedImageCandidate[] = [];
  const usedReal = new Set<string>();
  const provider = getProvider();

  const summary: AssetPipelineSummary = {
    planned: profile.assetPlan.reduce((sum, e) => sum + e.count, 0),
    fromRealPhotos: 0,
    fromProvider: 0,
    fromAbstractArt: 0,
    errors: [],
  };

  let order = 0;
  for (const entry of profile.assetPlan) {
    for (let i = 0; i < entry.count; i++) {
      order += 1;
      try {
        await fillOneSlot({
          entry,
          index: i,
          order,
          demoId: demo.id,
          companyName: lead.companyName,
          destDir,
          profile,
          realCandidates,
          usedReal,
          provider,
          summary,
        });
      } catch (e) {
        summary.errors.push(
          `${entry.role} #${i + 1}: ${e instanceof Error ? e.message : "unbekannter Fehler"}`
        );
      }
    }
  }

  return summary;
}

async function fillOneSlot(params: {
  entry: AssetPlanEntry;
  index: number;
  order: number;
  demoId: string;
  companyName: string;
  destDir: string;
  profile: VisualProfile;
  realCandidates: ExtractedImageCandidate[];
  usedReal: Set<string>;
  provider: ImageGenerationProvider;
  summary: AssetPipelineSummary;
}) {
  const { entry, index, order, demoId, companyName, destDir, profile, realCandidates, usedReal, provider, summary } =
    params;
  const roleLabel = ROLE_LABELS[entry.role];
  const baseName = `${entry.role}-${index + 1}`;
  const targetAspect = aspectValue(entry.aspectRatio);

  // 1) Real photo already on the lead's own site.
  const candidate = pickBestCandidate(realCandidates, usedReal, targetAspect);
  if (candidate) {
    usedReal.add(candidate.sourceUrl);
    const saved = await optimizeAndSave(candidate.buffer, destDir, baseName, entry.aspectRatio);
    await prisma.demoAsset.create({
      data: {
        demoId,
        role: entry.role,
        source: "real-extracted",
        altText: `${companyName} – ${roleLabel} (Originalaufnahme von der bestehenden Website)`,
        sourceUrl: candidate.sourceUrl,
        width: saved.width,
        height: saved.height,
        aspectRatio: entry.aspectRatio,
        formats: toJson(saved.formats),
        order,
      },
    });
    summary.fromRealPhotos += 1;
    return;
  }

  // 2) Configured image-generation provider (optional).
  try {
    const image = await provider.generateImage({
      prompt: `${roleLabel} for ${companyName}, a local ${profile.industryKey}`,
      role: entry.role,
      aspectRatio: entry.aspectRatio,
      styleGuide: {
        artDirection: profile.artDirection,
        imageryStyle: profile.imageryStyle,
        colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
      },
    });
    const saved = await provider.saveAsset(image, destDir, baseName);
    await prisma.demoAsset.create({
      data: {
        demoId,
        role: entry.role,
        source: provider.name,
        altText: `${companyName} – ${roleLabel} (KI-generiert, ${provider.name})`,
        width: saved.width,
        height: saved.height,
        aspectRatio: entry.aspectRatio,
        formats: toJson(saved.formats),
        order,
      },
    });
    summary.fromProvider += 1;
    return;
  } catch {
    // Expected when no provider is configured — fall through to abstract art.
  }

  // 3) Deterministic abstract art — always available.
  const svg = generateAbstractSvg(
    profile.colors,
    profile.layoutDirection,
    entry.role,
    `${demoId}:${baseName}`,
    entry.aspectRatio
  );
  const fileName = `${baseName}.svg`;
  await fs.writeFile(path.join(destDir, fileName), svg, "utf8");
  const [aw, ah] = entry.aspectRatio.split(":").map(Number);
  const width = 1200;
  const height = Math.round((width * (ah || 3)) / (aw || 4));

  await prisma.demoAsset.create({
    data: {
      demoId,
      role: entry.role,
      source: "abstract-generative",
      altText: `Abstrakte Bildkomposition passend zur Markenwelt von ${companyName}`,
      localPath: `assets/${fileName}`,
      width,
      height,
      aspectRatio: entry.aspectRatio,
      order,
    },
  });
  summary.fromAbstractArt += 1;
}

export async function removeAsset(assetId: string) {
  const asset = await prisma.demoAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Asset nicht gefunden.");
  await prisma.demoAsset.delete({ where: { id: assetId } });
  return asset;
}

/** Regenerates exactly one asset without touching the rest of the demo
 * — required by "Bildgenerierung optional... ein einzelnes Asset darf
 * regeneriert werden, ohne die komplette Demo neu zu generieren." Reuses
 * whichever source tier the asset already came from when possible, and
 * always succeeds by falling through to a fresh abstract variant. */
export async function regenerateAsset(assetId: string) {
  const asset = await prisma.demoAsset.findUnique({ where: { id: assetId }, include: { demo: { include: { lead: true } } } });
  if (!asset) throw new Error("Asset nicht gefunden.");

  const { demo } = asset;
  const lead = demo.lead;
  const profile: VisualProfile = {
    ...(demo.visualProfile as unknown as VisualProfile),
  };
  const destDir = assetsDir(demo.slug);
  const roleLabel = ROLE_LABELS[asset.role as ImageRole];
  const baseName = `${asset.role}-regen-${Date.now()}`;

  if (asset.localPath) {
    await fs.rm(path.join(process.cwd(), "public", "demos", demo.slug, asset.localPath), { force: true });
  }
  if (asset.formats) {
    const formats = asset.formats as unknown as { webp?: Record<string, string>; avif?: Record<string, string> };
    for (const file of [...Object.values(formats.webp ?? {}), ...Object.values(formats.avif ?? {})]) {
      await fs.rm(path.join(destDir, file), { force: true }).catch(() => {});
    }
  }

  const provider = getProvider();
  try {
    const image = await provider.generateImage({
      prompt: `${roleLabel} for ${lead.companyName}, a local ${profile.industryKey}`,
      role: asset.role as ImageRole,
      aspectRatio: asset.aspectRatio,
      styleGuide: {
        artDirection: profile.artDirection,
        imageryStyle: profile.imageryStyle,
        colorHints: [profile.colors.primary, profile.colors.secondary, profile.colors.accent],
      },
    });
    const saved = await provider.saveAsset(image, destDir, baseName);
    return prisma.demoAsset.update({
      where: { id: assetId },
      data: {
        source: provider.name,
        altText: `${lead.companyName} – ${roleLabel} (KI-generiert, ${provider.name})`,
        width: saved.width,
        height: saved.height,
        formats: toJson(saved.formats),
        localPath: null,
        sourceUrl: null,
      },
    });
  } catch {
    const svg = generateAbstractSvg(
      profile.colors,
      profile.layoutDirection,
      asset.role as ImageRole,
      `${assetId}:${Date.now()}`,
      asset.aspectRatio
    );
    const fileName = `${baseName}.svg`;
    await fs.writeFile(path.join(destDir, fileName), svg, "utf8");
    return prisma.demoAsset.update({
      where: { id: assetId },
      data: {
        source: "abstract-generative",
        altText: `Abstrakte Bildkomposition passend zur Markenwelt von ${lead.companyName}`,
        localPath: `assets/${fileName}`,
        formats: Prisma.DbNull,
        sourceUrl: null,
      },
    });
  }
}

export { readImageMetadata };
