const USER_AGENT =
  "Mozilla/5.0 (compatible; webdemo-lead-platform/0.1; local dev analysis tool)";

export interface FetchedPage {
  html: string;
  finalUrl: string;
  status: number;
  fetchMs: number;
  sizeBytes: number;
  https: boolean;
}

export type FetchResult =
  | { ok: true; page: FetchedPage }
  | { ok: false; error: string };

/** Fetches a website's HTML for analysis. Never throws — a failed fetch
 * is a normal, expected outcome (site down, blocks bots, times out) and
 * must simply make every dependent dimension "not verifiable", not crash
 * the pipeline. */
export async function fetchPage(url: string, timeoutMs = 10000): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: controller.signal,
    });

    const html = await res.text();
    const fetchMs = Date.now() - startedAt;

    return {
      ok: true,
      page: {
        html,
        finalUrl: res.url || url,
        status: res.status,
        fetchMs,
        sizeBytes: Buffer.byteLength(html, "utf8"),
        https: (res.url || url).startsWith("https://"),
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler beim Abruf";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
