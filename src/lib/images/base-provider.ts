import type {
  GeneratedImage,
  ImageGenerationProvider,
  ImageGenerationRequest,
  SavedAsset,
} from "./types";
import { optimizeAndSave } from "./optimizer";

/** Shared saveAsset/optimizeAsset so every concrete provider writes
 * files the same way — only the actual generation calls differ between
 * providers. */
export abstract class BaseImageProvider implements ImageGenerationProvider {
  abstract name: string;
  abstract generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
  abstract generateBatch(requests: ImageGenerationRequest[]): Promise<GeneratedImage[]>;
  abstract generateVariation(
    base: GeneratedImage,
    request: ImageGenerationRequest
  ): Promise<GeneratedImage>;

  async saveAsset(image: GeneratedImage, destDir: string, baseName: string): Promise<SavedAsset> {
    return optimizeAndSave(image.buffer, destDir, baseName);
  }

  /** Default optimize is a no-op passthrough — real compression happens
   * in saveAsset via sharp. Providers that can request a specific
   * quality/size from the model itself may override this. */
  async optimizeAsset(image: GeneratedImage): Promise<GeneratedImage> {
    return image;
  }
}
