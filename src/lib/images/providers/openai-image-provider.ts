import { BaseImageProvider } from "../base-provider";
import type { GeneratedImage, ImageGenerationRequest } from "../types";

const API_URL = "https://api.openai.com/v1/images/generations";

export function isOpenAiImagesConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function toSize(aspectRatio: string): string {
  // gpt-image-1 accepts a fixed set of sizes; map the requested ratio
  // to the closest supported one rather than an arbitrary WxH.
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) return "1024x1024";
  const ratio = w / h;
  if (ratio > 1.2) return "1536x1024";
  if (ratio < 0.85) return "1024x1536";
  return "1024x1024";
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

/**
 * Reference ImageGenerationProvider implementation against the OpenAI
 * Images API (gpt-image-1). Fails closed without OPENAI_API_KEY, like
 * every other external integration in this project (Gmail, Cloudflare).
 *
 * Unverified against a live account — no key is configured here.
 * Model name, size options, and response shape are per OpenAI's
 * documented API as of this writing; re-check
 * https://platform.openai.com/docs/api-reference/images before first
 * real use, since image-model APIs change faster than most.
 */
export class OpenAiImageProvider extends BaseImageProvider {
  name = "openai-images";

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    if (!isOpenAiImagesConfigured()) {
      throw new Error("OpenAI-Bildgenerierung ist nicht konfiguriert (OPENAI_API_KEY fehlt in .env).");
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: buildPrompt(request),
        size: toSize(request.aspectRatio),
        n: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI Images API Fehler: HTTP ${res.status} — ${text}`);
    }

    const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI Images API lieferte kein Bild zurück.");

    const buffer = Buffer.from(b64, "base64");
    const size = toSize(request.aspectRatio).split("x").map(Number);

    return { buffer, mimeType: "image/png", width: size[0], height: size[1] };
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
    // gpt-image-1 has no dedicated "variations" endpoint (that was a
    // DALL-E 2-only feature) — re-generate from the same brief with a
    // note asking for a fresh composition instead.
    return this.generateImage({
      ...request,
      prompt: `${request.prompt} (alternative composition/angle, same subject and style)`,
    });
  }
}
