import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

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
export async function encodeScrubVariant(
  sourcePath: string,
  outDir: string,
  baseName: string
): Promise<string> {
  const file = `${baseName}-scrub.mp4`;
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i", sourcePath,
      // Frame count is what scrubbing smoothness actually depends on.
      // The models return 24fps, i.e. 96 frames for a 4s clip — spread
      // over a viewport-sized pin that is one new frame every ~18px of
      // scroll, which reads as stepping however smoothly the page
      // itself renders. Motion-compensated interpolation to 60fps gives
      // 240 frames (~7px per frame), which is what makes it feel like
      // driving the footage rather than flicking through stills.
      // mci over blend: blend cross-fades and smears moving subjects,
      // mci synthesises real intermediate positions. It costs ~20s of
      // local encode time, which is nothing next to the generation.
      "-vf", "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1",
      "-an",
      "-c:v", "libx264",
      "-preset", "slow",
      // Decoding, not downloading, is the binding constraint here, so
      // this is a bitrate ceiling rather than a quality target. Measured
      // on a real page: an all-intra 1080p60 clip at CRF 16 came out at
      // ~65 Mbit/s and the video fell up to 2.4s behind the scroll
      // because the decoder could not keep up with the seeks. The same
      // clip at CRF 23 (~42 Mbit/s) tracked scroll position exactly —
      // 0.00s deviation at every sampled position, forwards and back.
      // Raise this only against a re-measurement, not by eye.
      "-crf", "23",
      // Biases the encoder toward cheaper decoding, which is exactly the
      // bottleneck when every frame is a keyframe being seeked to.
      "-tune", "fastdecode",
      "-g", "1",
      "-keyint_min", "1",
      "-sc_threshold", "0",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      path.join(outDir, file),
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  return `assets/${file}`;
}

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
