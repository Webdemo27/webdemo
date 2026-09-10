import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { SCRUB_FPS } from "./encoding-constants";

const execFileAsync = promisify(execFile);

/** Unlike images (sharp composites a badge in-process), video needs
 * frame-level compositing — that means ffmpeg. It's an external binary,
 * so this fails closed with a clear message rather than silently
 * shipping an unwatermarked clip. */
export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

/** drawtext needs a real font file on Windows (fontconfig isn't set up
 * there), and ffmpeg's filter syntax needs the drive colon escaped. */
function fontFileArg(): string {
  const candidates =
    process.platform === "win32"
      ? ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"]
      : ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"];
  const chosen = candidates[0];
  return chosen.replace(/^([A-Za-z]):/, "$1\\\\:");
}

/** Cloudflare Pages rejects any single asset over 25 MiB — a hard
 * platform limit, not a preference. */
const SCRUB_LIMIT_BYTES = 25 * 1024 * 1024;

/** What the rate calculation aims for. Below the limit on purpose:
 * `-b:v` is an average target, and measured on this material x264
 * overshot it by 5–8% (a 24 MiB target produced 25.2 and 25.9 MiB),
 * because all-intra frames give rate control very little to trade
 * against. The margin absorbs that plus container overhead. */
const SCRUB_BUDGET_BYTES = 22 * 1024 * 1024;

async function probeDurationSeconds(file: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    file,
  ]);
  const seconds = Number(String(stdout).trim());
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 8;
}

/**
 * A second encode of the same clip, made seekable frame-by-frame:
 * every frame is a keyframe (`-g 1`), so setting `currentTime` lands
 * instantly instead of decoding forward from a distant I-frame.
 *
 * This is what makes scroll-scrubbed video (scrollVideoSection) smooth
 * — with a normal ~2-second GOP, scrubbing visibly stutters and jumps.
 * The cost is file size (all-intra is several times larger), which is
 * why it is a separate file rather than the default: the ambient hero
 * loop plays linearly and doesn't need it.
 */
async function runScrubEncode(sourcePath: string, outPath: string, targetKbit: number): Promise<number> {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i", sourcePath,
      // Frame count is what scrubbing smoothness depends on. The models
      // return 24fps, i.e. 96 frames for a 4s clip — over a viewport-
      // sized scroll that is one new frame every ~18px, which reads as
      // stepping however smoothly the page itself renders. Motion-
      // compensated interpolation lifts that; mci over blend because
      // blend cross-fades and smears moving subjects while mci
      // synthesises real intermediate positions.
      "-vf", `minterpolate=fps=${SCRUB_FPS}:mi_mode=mci:mc_mode=aobmc:vsbmc=1`,
      "-an",
      "-c:v", "libx264",
      "-preset", "slow",
      // A rate target, not a quality target: the 25 MiB ceiling has to
      // hold for every clip, and CRF cannot promise that.
      //
      // The cap also keeps decoding feasible, which was the earlier
      // constraint: measured on a real page, an all-intra 1080p60 clip
      // at ~65 Mbit/s fell up to 2.4s behind the scroll because the
      // decoder could not keep up with the seeks. ~22 Mbit/s is well
      // inside what tracked scroll exactly.
      //
      // bufsize is one second rather than two: a larger buffer lets the
      // rate wander further above target on hard frames, and with every
      // frame an I-frame there are no cheap frames to average it back
      // down against.
      "-b:v", `${targetKbit}k`,
      "-maxrate", `${targetKbit}k`,
      "-bufsize", `${targetKbit}k`,
      // Biases the encoder toward cheaper decoding, which is exactly the
      // bottleneck when every frame is a keyframe being seeked to.
      "-tune", "fastdecode",
      "-g", "1",
      "-keyint_min", "1",
      "-sc_threshold", "0",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outPath,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  return (await fs.stat(outPath)).size;
}

export async function encodeScrubVariant(
  sourcePath: string,
  outDir: string,
  baseName: string
): Promise<string> {
  const file = `${baseName}-scrub.mp4`;
  const outPath = path.join(outDir, file);
  // Encode beside the target and rename into place, never straight onto
  // it. Two reasons, both hit in practice: ffmpeg refuses outright when
  // input and output are the same path (re-encoding a clip from itself),
  // and a process killed mid-write leaves a truncated file where a valid
  // one used to be — which is exactly how a 0-byte background video got
  // shipped once. The rename is the only step that touches the target.
  const tmpPath = path.join(outDir, `.${baseName}-scrub.tmp.mp4`);

  // Size is fixed by the platform, so the only real choice is how to
  // spend the bits — and measuring beat guessing here. At a 24 MiB
  // budget for an 8s clip, VMAF against the source came out at 85.3 for
  // 1080p30, 68.6 for 720p60 and 62.2 for 1080p60. Halving the frame
  // rate buys a large quality gain because the same bits cover half as
  // many frames; 62 is visibly mushy. 30fps still gives 240 frames for
  // an 8s clip, roughly one new frame per 11px of scroll on a typical
  // page — coarser than 60fps but nowhere near the ~18px where stepping
  // becomes obvious.
  const durationSeconds = await probeDurationSeconds(sourcePath);
  let targetKbit = Math.floor((SCRUB_BUDGET_BYTES * 8) / durationSeconds / 1000);

  // Verify rather than assume. Rate control aims at the target, it does
  // not promise it, and a clip that lands over 25 MiB cannot be
  // published at all — a silent failure that would only surface at
  // deploy time. If it overshoots, scale the rate by exactly how far it
  // missed and encode again; two corrections is far more than the
  // observed 5–8% drift needs.
  try {
    let size = await runScrubEncode(sourcePath, tmpPath, targetKbit);
    for (let attempt = 0; attempt < 2 && size > SCRUB_LIMIT_BYTES; attempt++) {
      targetKbit = Math.floor(targetKbit * (SCRUB_BUDGET_BYTES / size));
      size = await runScrubEncode(sourcePath, tmpPath, targetKbit);
    }
    if (size > SCRUB_LIMIT_BYTES) {
      throw new Error(
        `Scrub-Encode von ${baseName} bleibt mit ${(size / 1024 / 1024).toFixed(1)} MiB über dem 25-MiB-Limit von Cloudflare Pages.`
      );
    }
    await fs.rename(tmpPath, outPath);
  } finally {
    await fs.rm(tmpPath, { force: true });
  }

  return `assets/${file}`;
}

/**
 * Burns the same "DEMO" badge the image pipeline stamps
 * (images/watermark.ts) into every frame, and re-encodes to a
 * web-deliverable MP4: H.264 + yuv420p (the only combination every
 * browser reliably decodes), no audio track at all (a hero loop is
 * always muted, and dropping it saves bytes), and +faststart so the
 * moov atom sits at the front for progressive playback.
 *
 * Returns the watermarked MP4 and a real first-frame poster image, so
 * the <video> has something to show before/without autoplay.
 */
export async function watermarkAndEncodeVideo(
  input: Buffer,
  outDir: string,
  baseName: string
): Promise<{ videoPath: string; posterPath: string; scrubPath: string }> {
  if (!(await isFfmpegAvailable())) {
    throw new Error("ffmpeg wurde nicht gefunden — ohne ffmpeg kann kein DEMO-Wasserzeichen ins Video gebrannt werden.");
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "webdemo-video-"));
  const tmpInput = path.join(tmpDir, "source.mp4");
  await fs.writeFile(tmpInput, input);

  await fs.mkdir(outDir, { recursive: true });
  const videoFile = `${baseName}.mp4`;
  const posterFile = `${baseName}-poster.jpg`;
  const videoOut = path.join(outDir, videoFile);
  const posterOut = path.join(outDir, posterFile);
  let scrubPath: string;

  // Badge geometry mirrors BADGE_SVG in images/watermark.ts: a small
  // semi-transparent dark plate in the bottom-right corner, not a loud
  // diagonal stamp across the composition.
  //
  // Insets are a percentage of the frame, not fixed pixels, because the
  // hero renders the video with `object-fit: cover` — measured live, a
  // 16:9 clip in a typical hero box loses ~8% off the top and bottom,
  // which cropped a 40px-inset badge clean out of view. 12% vertical
  // keeps it visible through that crop while still reading as a corner
  // badge.
  const drawtext = [
    `drawtext=fontfile=${fontFileArg()}`,
    "text='DEMO'",
    "fontcolor=white",
    "fontsize=h/18",
    "box=1",
    "boxcolor=black@0.55",
    "boxborderw=18",
    "x=w-tw-(w*0.05)",
    "y=h-th-(h*0.12)",
  ].join(":");

  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i", tmpInput,
        "-vf", drawtext,
        "-an",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        videoOut,
      ],
      { maxBuffer: 32 * 1024 * 1024 }
    );

    await execFileAsync(
      "ffmpeg",
      ["-y", "-i", videoOut, "-frames:v", "1", "-q:v", "4", posterOut],
      { maxBuffer: 32 * 1024 * 1024 }
    );

    // Built from the already-watermarked file on purpose: the badge has
    // to be in both encodes, and re-deriving it here keeps the two in
    // sync automatically.
    scrubPath = await encodeScrubVariant(videoOut, outDir, baseName);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  return { videoPath: `assets/${videoFile}`, posterPath: `assets/${posterFile}`, scrubPath };
}
