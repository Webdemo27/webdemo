import type { GeneratedVideo, VideoGenerationProvider, VideoGenerationRequest } from "../types";

const API_URL = "https://openrouter.ai/api/v1/videos";

/**
 * Chosen against the live model list (scripts/list-video-models.ts,
 * 2026-09-10): veo-3.1-lite bills $0.03/second on its
 * `duration_seconds_without_audio_720p` SKU — the cheapest per-second
 * price among models that quote a real per-second rate, and 720p muted
 * is exactly what a hero background loop needs. For comparison, full
 * veo-3.1 is $0.20/s and Runway Aleph 2 is $28/s. Override with
 * OPENROUTER_VIDEO_MODEL; re-run the probe script before assuming these
 * prices still hold.
 */
const DEFAULT_MODEL = "google/veo-3.1-lite";

/** Generation genuinely takes minutes. Poll on a slow interval (the API
 * docs suggest ~30s) but keep a hard ceiling so a stuck job can never
 * hang the demo pipeline forever. */
const POLL_INTERVAL_MS = 15_000;
const MAX_WAIT_MS = 10 * 60 * 1000;

export function isOpenRouterVideoConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function buildPrompt(request: VideoGenerationRequest): string {
  const { styleGuide } = request;
  return [
    request.prompt,
    `Art direction: ${styleGuide.artDirection}.`,
    `Imagery style: ${styleGuide.imageryStyle}.`,
    styleGuide.colorHints.length > 0 ? `Color palette: ${styleGuide.colorHints.join(", ")}.` : "",
    "Slow, subtle camera movement suitable for a seamless looping website background.",
    "No visible text, no logos, no watermarks, no people looking directly at the camera.",
  ]
    .filter(Boolean)
    .join(" ");
}

interface VideoJob {
  id: string;
  status: string;
  error?: string | { message?: string } | null;
  unsigned_urls?: string[];
  usage?: { cost?: number };
}

interface VideoModelCapabilities {
  supported_durations: number[] | null;
  supported_resolutions: string[] | null;
  supported_aspect_ratios: string[] | null;
}

let capabilitiesCache: Map<string, VideoModelCapabilities> | null = null;

/** Each model accepts its own fixed set of durations/resolutions —
 * veo-3.1-lite takes 4/6/8s and rejects 5s outright with a 400. Rather
 * than hardcoding one model's list (and breaking the moment
 * OPENROUTER_VIDEO_MODEL is pointed elsewhere), ask the catalog once
 * and snap the request onto whatever this model actually supports.
 * Failure here is non-fatal: the request goes out unsnapped and the API
 * validates it, exactly as before. */
async function loadCapabilities(model: string, key: string): Promise<VideoModelCapabilities | null> {
  if (!capabilitiesCache) {
    try {
      const res = await fetch(`${API_URL}/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) return null;
      const raw = (await res.json()) as { data?: Array<VideoModelCapabilities & { id: string }> };
      capabilitiesCache = new Map((raw.data ?? []).map((m) => [m.id, m]));
    } catch {
      return null;
    }
  }
  return capabilitiesCache.get(model) ?? null;
}

function snapDuration(requested: number, supported: number[] | null): number {
  if (!supported || supported.length === 0) return requested;
  if (supported.includes(requested)) return requested;
  // Prefer the closest, and on a tie the shorter one — duration is
  // billed per second, so ties should round down.
  return [...supported].sort(
    (a, b) => Math.abs(a - requested) - Math.abs(b - requested) || a - b
  )[0];
}

function snapChoice(requested: string, supported: string[] | null): string {
  if (!supported || supported.length === 0 || supported.includes(requested)) return requested;
  return supported[0];
}

const TERMINAL_FAILURES = new Set(["failed", "cancelled", "expired"]);

function describeError(error: VideoJob["error"]): string {
  if (!error) return "unbekannter Fehler";
  return typeof error === "string" ? error : error.message ?? JSON.stringify(error);
}

/**
 * VideoGenerationProvider against OpenRouter's unified video API — the
 * same account/key the image provider already uses, one endpoint routed
 * to any of its ~28 video models by `model` id.
 *
 * Shape of the flow (verified live, not assumed): POST /api/v1/videos
 * returns a job `id` immediately; GET /api/v1/videos/{id} reports
 * `status` until it reaches `completed`, at which point
 * `unsigned_urls[0]` (equivalently /content?index=0) serves the MP4 and
 * `usage.cost` reports what was actually billed. Fails closed without
 * OPENROUTER_API_KEY, like every other external integration here.
 */
export class OpenRouterVideoProvider implements VideoGenerationProvider {
  name = "openrouter-video";

  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedVideo> {
    if (!isOpenRouterVideoConfigured()) {
      throw new Error("OpenRouter-Videogenerierung ist nicht konfiguriert (OPENROUTER_API_KEY fehlt in .env).");
    }
    const key = process.env.OPENROUTER_API_KEY as string;
    const model = process.env.OPENROUTER_VIDEO_MODEL || DEFAULT_MODEL;

    const caps = await loadCapabilities(model, key);
    const duration = snapDuration(request.durationSeconds, caps?.supported_durations ?? null);
    const resolution = snapChoice(request.resolution, caps?.supported_resolutions ?? null);
    const aspectRatio = snapChoice(request.aspectRatio, caps?.supported_aspect_ratios ?? null);

    const submitRes = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(request),
        aspect_ratio: aspectRatio,
        resolution,
        duration,
        // A muted looping background never plays audio, and the
        // without-audio SKU is what makes this affordable.
        generate_audio: false,
      }),
    });

    if (!submitRes.ok) {
      const text = await submitRes.text();
      throw new Error(`OpenRouter Video API Fehler beim Start: HTTP ${submitRes.status} — ${text.slice(0, 500)}`);
    }

    const job = (await submitRes.json()) as VideoJob;
    if (!job.id) throw new Error("OpenRouter Video API lieferte keine Job-ID zurück.");

    const finished = await this.pollUntilDone(job.id, key);
    const url = finished.unsigned_urls?.[0] ?? `${API_URL}/${finished.id}/content?index=0`;

    const videoRes = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!videoRes.ok) {
      throw new Error(`Video-Download fehlgeschlagen: HTTP ${videoRes.status}`);
    }
    const buffer = Buffer.from(await videoRes.arrayBuffer());

    return {
      buffer,
      mimeType: videoRes.headers.get("content-type") ?? "video/mp4",
      costUsd: finished.usage?.cost ?? null,
      model,
      durationSeconds: duration,
      resolution,
    };
  }

  private async pollUntilDone(jobId: string, key: string): Promise<VideoJob> {
    const deadline = Date.now() + MAX_WAIT_MS;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const res = await fetch(`${API_URL}/${jobId}`, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter Video API Fehler beim Polling: HTTP ${res.status} — ${text.slice(0, 300)}`);
      }
      const job = (await res.json()) as VideoJob;

      if (job.status === "completed") return job;
      if (TERMINAL_FAILURES.has(job.status)) {
        throw new Error(`Videogenerierung ${job.status}: ${describeError(job.error)}`);
      }
    }

    throw new Error(
      `Videogenerierung hat das Zeitlimit von ${MAX_WAIT_MS / 60000} Minuten überschritten (Job ${jobId}).`
    );
  }
}
