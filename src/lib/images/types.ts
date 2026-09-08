import type { ImageRole } from "../visual-director/types";

export interface ImageGenerationRequest {
  prompt: string;
  role: ImageRole;
  aspectRatio: string;
  styleGuide: {
    artDirection: string;
    imageryStyle: string;
    colorHints: string[];
  };
}

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  seed?: string;
}

/** Width-keyed relative filenames per encoded format, e.g.
 * { "800": "hero-800.webp", "1600": "hero-1600.webp" }. */
export type ResponsiveFormatSet = Record<string, string>;

export interface SavedAsset {
  formats: {
    webp: ResponsiveFormatSet;
    avif?: ResponsiveFormatSet;
  };
  width: number;
  height: number;
}

/**
 * Provider-agnostic image generation abstraction (Visual Quality
 * upgrade, step 2). A concrete provider (OpenAI Images today, another
 * model later) only needs its own generateImage/generateBatch/
 * generateVariation — saveAsset/optimizeAsset have a shared, correct
 * implementation in optimizer.ts via BaseImageProvider so every
 * provider writes files the same, consistent way.
 *
 * No provider is configured in this project (no API key set) — the
 * asset pipeline in asset-pipeline.ts works fully without one, using
 * real images extracted from the lead's own site and, where that isn't
 * enough, deterministic abstract art. A provider only adds a third,
 * optional source.
 */
export interface ImageGenerationProvider {
  name: string;
  generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
  generateBatch(requests: ImageGenerationRequest[]): Promise<GeneratedImage[]>;
  generateVariation(base: GeneratedImage, request: ImageGenerationRequest): Promise<GeneratedImage>;
  saveAsset(image: GeneratedImage, destDir: string, baseName: string): Promise<SavedAsset>;
  optimizeAsset(image: GeneratedImage): Promise<GeneratedImage>;
}
