import { chromium } from "playwright";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

export interface CapturedScreenshot {
  /** Web-servable path (relative to /public), e.g. "/screenshots/<id>/before-desktop.webp". */
  publicPath: string;
  width: number;
  height: number;
}

export interface ScreenshotPairResult {
  desktop: CapturedScreenshot | null;
  mobile: CapturedScreenshot | null;
  /** Set only when BOTH captures failed — a single failed viewport still
   * returns the other, since half a before/after pair beats none. */
  error: string | null;
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

const NAV_TIMEOUT_MS = 15000;

/**
 * Renders one URL (an `https://` site or a local `file://` demo) in a real
 * Chromium tab and saves a viewport screenshot (not full-page — the visible
 * fold is what actually drives a first impression, and fixed-height shots
 * are what a side-by-side Vorher/Nachher comparison needs). Never throws:
 * a blocked/slow/broken page just yields `null`, same "mark unverifiable,
 * don't guess" discipline as the rest of analysis/.
 */
async function captureOne(
  browser: import("playwright").Browser,
  url: string,
  viewport: { width: number; height: number },
  destDir: string,
  baseName: string
): Promise<CapturedScreenshot | null> {
  try {
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width < 768,
      hasTouch: viewport.width < 768,
    });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
      // Best-effort settle for lazy images/webfonts — short so one slow
      // site never stalls the whole analysis run.
      await page.waitForTimeout(500);
    } catch {
      // "networkidle"/"load" can time out on sites with long-polling or
      // ad trackers even though the page rendered fine — the screenshot
      // below still captures whatever painted, so we don't bail here.
    }

    const png = await page.screenshot({ type: "png" });
    await context.close();

    await fs.mkdir(destDir, { recursive: true });
    const fileName = `${baseName}.webp`;
    const webp = await sharp(png).webp({ quality: 72 }).toBuffer();
    await fs.writeFile(path.join(destDir, fileName), webp);
    const meta = await sharp(webp).metadata();

    return {
      publicPath: fileName,
      width: meta.width ?? viewport.width,
      height: meta.height ?? viewport.height,
    };
  } catch {
    return null;
  }
}

/** Captures a desktop + mobile screenshot pair of one URL into `destDir`,
 * returning public-relative file names (caller prefixes with its own
 * public URL base — this module doesn't know if it's a lead site or a
 * local demo). One Chromium instance, two contexts (desktop/mobile need
 * different viewports so can't share a context) — cheaper and more
 * reliable than launching a browser per viewport. */
async function captureScreenshotPair(
  url: string,
  destDir: string,
  baseName: string
): Promise<ScreenshotPairResult> {
  let browser: import("playwright").Browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unbekannter Fehler";
    return { desktop: null, mobile: null, error: `Chromium konnte nicht gestartet werden: ${msg}` };
  }

  try {
    const [desktop, mobile] = await Promise.all([
      captureOne(browser, url, VIEWPORTS.desktop, destDir, `${baseName}-desktop`),
      captureOne(browser, url, VIEWPORTS.mobile, destDir, `${baseName}-mobile`),
    ]);

    return {
      desktop,
      mobile,
      error: !desktop && !mobile ? "Screenshot fehlgeschlagen (Seite nicht ladbar)." : null,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Captures the lead's *current* live website — the "Vorher" half of the
 * Before/After comparison. Stored under public/screenshots/<leadId>/ so it
 * survives independently of any demo (a lead can be analyzed long before
 * a demo/slug exists). */
export async function captureBeforeScreenshots(
  websiteUrl: string,
  leadId: string
): Promise<ScreenshotPairResult> {
  const destDir = path.join(process.cwd(), "public", "screenshots", leadId);
  return captureScreenshotPair(websiteUrl, destDir, "before");
}

/** Captures the freshly-rendered demo HTML straight off disk (a `file://`
 * URL, not localhost) — the "Nachher" half. Works whether or not the Next
 * dev/prod server happens to be running, since demo-generator writes
 * static, self-contained HTML. Saved alongside the demo's own assets. */
export async function captureAfterScreenshots(
  demoIndexHtmlPath: string,
  destDir: string
): Promise<ScreenshotPairResult> {
  const fileUrl = "file://" + demoIndexHtmlPath.replace(/\\/g, "/");
  return captureScreenshotPair(fileUrl, destDir, "after");
}
