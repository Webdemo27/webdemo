export interface VideoGenerationRequest {
  /** What the clip should show — built from the lead's real industry and
   * the VisualProfile's art direction, never invented business facts. */
  prompt: string;
  aspectRatio: string;
  /** Seconds. Kept short on purpose: a hero background loop only needs a
   * few seconds, and cost is billed per second. */
  durationSeconds: number;
  resolution: string;
  styleGuide: {
    artDirection: string;
    imageryStyle: string;
    colorHints: string[];
  };
}

export interface GeneratedVideo {
  buffer: Buffer;
  mimeType: string;
  /** What OpenRouter actually charged for this job, straight from the
   * job's own `usage.cost` — reported rather than estimated, so the
   * dashboard can show a real number. */
  costUsd: number | null;
  model: string;
  /** What was actually generated after the request was snapped onto the
   * model's supported values — never the originally requested numbers,
   * so logs and the UI can't claim a duration that wasn't produced. */
  durationSeconds: number;
  resolution: string;
}

export interface SavedVideoAsset {
  /** The clip the page actually plays, relative to the demo's own
   * directory, e.g. "assets/hero-video-scrub.mp4". The full-quality
   * master is kept outside the demo folder (see masterDirFor) because
   * no page requests it. */
  scrubPath: string;
  /** First frame, written as a real image file so the <video> has a
   * poster and non-autoplay contexts still show something. */
  posterPath: string;
  costUsd: number | null;
}

/** Provider-agnostic video generation, mirroring ImageGenerationProvider
 * in ../images/types.ts. Async by nature (generation takes minutes, not
 * seconds), so unlike the image providers there's no synchronous
 * single-call path — every implementation submits a job and polls. */
export interface VideoGenerationProvider {
  name: string;
  generateVideo(request: VideoGenerationRequest): Promise<GeneratedVideo>;
}
