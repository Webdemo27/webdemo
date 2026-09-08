export interface UrlVerification {
  reachable: boolean;
  isHttps: boolean;
  status?: number;
  /** False only when the page loaded but didn't contain the expected
   * marker text — a real, if unlikely, failure mode (wrong project,
   * stale cached deployment) worth surfacing distinctly from "didn't
   * load at all". True when no marker was requested. */
  contentMatches: boolean;
  error?: string;
}

// A brand-new *.pages.dev subdomain's first DNS propagation can take
// noticeably longer than a re-deploy to an existing project — confirmed
// live: a fresh project's URL returned "fetch failed" for the first ~50s
// of polling, then 200 moments later. 14 x 10s (~140s total) gives real
// first-time propagation room without polling forever.
const POLL_ATTEMPTS = 14;
const POLL_DELAY_MS = 10000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Real verification, not a trust-the-API-response assumption: fetches
 * the URL a publisher just returned and confirms it's HTTPS, actually
 * resolves with a 2xx, and — when `expectedText` is given — that the
 * page really is the demo we just deployed (not a stale cached asset or
 * a project name collision) before the app ever calls it "public". A
 * demo is only allowed into a customer-facing message once this passes
 * — see publish-demo.ts.
 *
 * Cloudflare Pages deployments propagate asynchronously — the API/CLI
 * can report success a few seconds before the URL is actually live —
 * so this polls with a short backoff rather than checking once.
 */
export async function verifyPublicUrl(url: string, expectedText?: string): Promise<UrlVerification> {
  const isHttps = url.startsWith("https://");
  if (!isHttps) {
    return { reachable: false, isHttps: false, contentMatches: false, error: "URL ist nicht HTTPS." };
  }

  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10000) });
      lastStatus = res.status;
      if (res.ok) {
        const body = await res.text();
        const contentMatches = !expectedText || body.includes(expectedText);
        return { reachable: true, isHttps: true, status: res.status, contentMatches };
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "URL nicht erreichbar.";
    }

    if (attempt < POLL_ATTEMPTS) await sleep(POLL_DELAY_MS);
  }

  return { reachable: false, isHttps: true, status: lastStatus, contentMatches: false, error: lastError };
}
