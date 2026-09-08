import { BaseImageProvider } from "../base-provider";
import type { GeneratedImage } from "../types";

/** The default provider when nothing is configured. Fails closed with a
 * clear error on every generation call (same pattern as GmailSender and
 * CloudflarePagesPublisher) instead of silently no-op'ing — callers
 * (asset-pipeline.ts) catch this and fall back to real-image extraction
 * or abstract generative art, so the system still works end to end. */
export class NotConfiguredProvider extends BaseImageProvider {
  name = "not-configured";

  async generateImage(): Promise<GeneratedImage> {
    throw new Error(
      "Kein Bildgenerierungs-Provider konfiguriert (z. B. OPENAI_API_KEY fehlt in .env)."
    );
  }

  async generateBatch(): Promise<GeneratedImage[]> {
    throw new Error("Kein Bildgenerierungs-Provider konfiguriert.");
  }

  async generateVariation(): Promise<GeneratedImage> {
    throw new Error("Kein Bildgenerierungs-Provider konfiguriert.");
  }
}
