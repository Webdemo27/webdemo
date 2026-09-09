import { BaseImageProvider } from "../base-provider";
import type { GeneratedImage, ImageGenerationRequest } from "../types";

const API_URL = "https://openrouter.ai/api/v1/images";

// Configurable so a model swap (OpenRouter adds new image models
// constantly) is a .env change, not a code change. gpt-image-2 is
// OpenRouter's own documented "high-quality photorealistic output" pick
// as of this writing — re-check https://openrouter.ai/docs/guides/overview/multimodal/image-generation
// before assuming this is still current, since image-model catalogs
// change faster than most APIs.
const DEFAULT_MODEL = "openai/gpt-image-2";

export function isOpenRouterImagesConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function buildPrompt(request: ImageGenerationRequest): string {
  const { styleGuide } = request;
  return [
    request.prompt,
    `Art direction: ${styleGuide.artDirection}.`,
    `Imagery style: ${styleGuide.imageryStyle}.`,
    styleGuide.colorHints.length > 0 ? `Color palette: ${styleGuide.colorHints.join(", ")}.` : "",
    "No visible text, no logos, no watermarks, photorealistic quality appropriate to the brief.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** OpenRouter's aspect_ratio param takes the same "W:H" shape the rest
 * of this codebase already uses (VisualProfile.assetPlan entries) — no
 * mapping to a fixed size list needed, unlike the OpenAI provider. */
function toDimensions(aspectRatio: string): { width: number; height: number } {
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) return { width: 1024, height: 1024 };
  const base = 1024;
  return w >= h ? { width: base, height: Math.round((base * h) / w) } : { width: Math.round((base * w) / h), height: base };
}

/**
 * ImageGenerationProvider implementation against OpenRouter's unified
 * Image API (https://openrouter.ai/api/v1/images) — one endpoint routed
 * to any of OpenRouter's 30+ image models by `model` id, rather than
 * integrating each provider's own API directly. Fails closed without
 * OPENROUTER_API_KEY, like every other external integration in this
 * project (Gmail, Cloudflare, OpenAI).
 */
export class OpenRouterImageProvider extends BaseImageProvider {
  name = "openrouter-images";

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    if (!isOpenRouterImagesConfigured()) {
      throw new Error("OpenRouter-Bildgenerierung ist nicht konfiguriert (OPENROUTER_API_KEY fehlt in .env).");
    }

    const model = process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_MODEL;
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(request),
        aspect_ratio: request.aspectRatio,
        resolution: "1K",
        n: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter Images API Fehler: HTTP ${res.status} — ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as { data?: Array<{ b64_json?: string; media_type?: string }> };
    const entry = data.data?.[0];
    if (!entry?.b64_json) throw new Error("OpenRouter Images API lieferte kein Bild zurück.");

    const buffer = Buffer.from(entry.b64_json, "base64");
    const { width, height } = toDimensions(request.aspectRatio);
    const mimeType = entry.media_type || "image/png";

    return { buffer, mimeType, width, height };
  }

  async generateBatch(requests: ImageGenerationRequest[]): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    for (const request of requests) {
      results.push(await this.generateImage(request));
    }
    return results;
  }

  async generateVariation(
    _base: GeneratedImage,
    request: ImageGenerationRequest
  ): Promise<GeneratedImage> {
    return this.generateImage({
      ...request,
      prompt: `${request.prompt} (alternative composition/angle, same subject and style)`,
    });
  }
}
