import type { DemoPublisher, PublishInput, PublishResult } from "./types";

const API_BASE = "https://api.cloudflare.com/client/v4";

export function isCloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

/** Cloudflare Pages project names must be DNS-label-safe; the slug from
 * demo-generator/slug.ts is already lowercase/hyphenated, this just caps
 * the length to Cloudflare's limit. */
function toProjectName(slug: string): string {
  return slug.slice(0, 58).replace(/^-+|-+$/g, "");
}

/**
 * Publishes one demo as its own Cloudflare Pages project, so each lead
 * gets a stable, dedicated public URL (`https://<slug>.pages.dev`)
 * without exposing the dashboard, database, or other leads' demos.
 *
 * Phase 11 architecture preparation: this follows Cloudflare's
 * documented Pages "direct upload" API shape, but has never been
 * exercised against a live account — this project has no Cloudflare
 * credentials configured. Verify request/response field names against
 * https://developers.cloudflare.com/api/ the first time this is
 * actually enabled, before relying on it.
 */
export class CloudflarePagesPublisher implements DemoPublisher {
  async publish({ slug, html }: PublishInput): Promise<PublishResult> {
    if (!isCloudflareConfigured()) {
      return {
        ok: false,
        error: "Cloudflare ist nicht konfiguriert (CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID fehlen in .env).",
      };
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID as string;
    const token = process.env.CLOUDFLARE_API_TOKEN as string;
    const projectName = toProjectName(slug);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await this.ensureProject(accountId, projectName, headers);

      const form = new FormData();
      form.append("index.html", new Blob([html], { type: "text/html" }), "index.html");

      const res = await fetch(
        `${API_BASE}/accounts/${accountId}/pages/projects/${projectName}/deployments`,
        { method: "POST", headers, body: form }
      );

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Cloudflare API Fehler: HTTP ${res.status} — ${text}` };
      }

      const data = (await res.json()) as { result?: { url?: string } };
      const deploymentUrl = data.result?.url;

      return {
        ok: true,
        publicUrl: deploymentUrl ?? `https://${projectName}.pages.dev`,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler bei der Cloudflare-Bereitstellung.",
      };
    }
  }

  private async ensureProject(
    accountId: string,
    projectName: string,
    headers: Record<string, string>
  ) {
    const check = await fetch(`${API_BASE}/accounts/${accountId}/pages/projects/${projectName}`, {
      headers,
    });
    if (check.ok) return;

    await fetch(`${API_BASE}/accounts/${accountId}/pages/projects`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName, production_branch: "main" }),
    });
  }
}
