export interface UrlVerification {
  reachable: boolean;
  isHttps: boolean;
  status?: number;
  error?: string;
}

/**
 * Real verification, not a trust-the-API-response assumption: fetches
 * the URL a publisher just returned and confirms it's HTTPS and
 * actually resolves with a 2xx before the app ever calls it "public."
 * A demo is only allowed into a customer-facing message once this
 * passes — see actions.ts's publishDemoPublicly.
 */
export async function verifyPublicUrl(url: string): Promise<UrlVerification> {
  const isHttps = url.startsWith("https://");
  if (!isHttps) {
    return { reachable: false, isHttps: false, error: "URL ist nicht HTTPS." };
  }

  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10000) });
    return { reachable: res.ok, isHttps: true, status: res.status };
  } catch (e) {
    return {
      reachable: false,
      isHttps: true,
      error: e instanceof Error ? e.message : "URL nicht erreichbar.",
    };
  }
}
