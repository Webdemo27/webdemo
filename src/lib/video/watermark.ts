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
export async function watermarkAndEncodeVideo(
  input: Buffer,
  outDir: string,
  baseName: string
): Promise<{ videoPath: string; posterPath: string }> {
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
        "-crf", "26",
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
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  return { videoPath: `assets/${videoFile}`, posterPath: `assets/${posterFile}` };
}
