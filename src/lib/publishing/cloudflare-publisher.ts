import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DemoPublisher, PublishInput, PublishResult } from "./types";

// The locally installed binary, not `npx wrangler` — this Next.js
// process itself typically runs under an npx/npm-invoked script, and
// spawning npx *again* from inside that inherits npm's own resolution
// environment variables in a way that reliably breaks on Windows
// ("Cannot find module .../npm/bin/npm-prefix.js"). The project already
// depends on wrangler directly, so its binary is at a fixed, known path
// — no npx resolution step needed at all.
const WRANGLER_BIN = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler"
);

const WRANGLER_ENV = {
  WRANGLER_SEND_METRICS: "false",
  CI: "true",
  // Wrangler colorizes its terminal output by default; NO_COLOR is the
  // cross-tool convention it (like most CLIs) respects, so error text
  // stays readable if it ever surfaces in the dashboard UI.
  NO_COLOR: "1",
};

export function isCloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

/** Cloudflare Pages' free plan caps an account at 100 projects total —
 * hit for real on 2026-09-09 (`wrangler` error 8000027) after the
 * original one-project-per-lead design accumulated leads across many
 * research runs. Every lead now shares this single project instead,
 * living at its own path (`https://<project>.pages.dev/<slug>/`) — a
 * project name is a one-time, account-wide choice, so it's read from
 * `.env` (defaulting to "webdemo-demos") rather than derived per lead.
 * This also incidentally helps the *other* known risk logged in
 * `.ai/autopilot-state.md` (recipients' mail gateways blocklisting the
 * shared `*.pages.dev` suffix): with one project, only one custom domain
 * needs to be attached to protect every demo's sender reputation, not
 * one per lead. */
function sharedProjectName(): string {
  return toProjectName(process.env.CLOUDFLARE_PAGES_PROJECT || "webdemo-demos");
}

/** Every already-published lead's demo lives here, one subfolder per
 * slug, and this whole tree is what actually gets deployed to Cloudflare
 * (see publish()) — kept separate from `public/demos/` (which holds
 * *every* generated demo, published or not) so a lead never becomes
 * publicly reachable just because some other lead was published. Not
 * committed to git (see .gitignore) — same "per-lead output" treatment
 * as public/demos and public/screenshots. */
const STAGING_ROOT = path.join(process.cwd(), ".cloudflare-deploy");

/** A visitor landing on the bare project domain (no slug) sees this
 * instead of Cloudflare's raw 404 — cheap, and it also guarantees
 * STAGING_ROOT is never completely empty (an empty directory would make
 * `wrangler pages deploy` fail), e.g. right after deleteProject() removes
 * the last remaining lead's subfolder. */
async function ensureStagingRoot(): Promise<void> {
  await fs.mkdir(STAGING_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(STAGING_ROOT, "index.html"),
    "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\" /><title>Webdemo</title></head>" +
      "<body style=\"font-family:system-ui,sans-serif;padding:4rem;color:#334;max-width:32rem;margin:0 auto;\">" +
      "<p>Diese Übersicht ist nicht öffentlich. Bitte den direkten Demo-Link verwenden.</p></body></html>",
    "utf8"
  );
}

/** Full replace, not a merge — guarantees no stale asset file lingers in
 * the staged copy after a regeneration changes which files exist (e.g. a
 * different colorway/variant produces different image filenames). */
async function mirrorIntoStaging(slug: string, directory: string): Promise<void> {
  const target = path.join(STAGING_ROOT, slug);
  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(directory, target, { recursive: true });
}

/** Cloudflare Pages project names must be DNS-label-safe; the slug from
 * demo-generator/slug.ts is already lowercase/hyphenated, this just caps
 * the length to Cloudflare's limit. */
function toProjectName(slug: string): string {
  return slug.slice(0, 58).replace(/^-+|-+$/g, "");
}

interface WranglerRun {
  code: number;
  output: string;
}

/** Runs one wrangler subcommand and waits for it to exit. Cloudflare has
 * no documented public REST API for multi-file Direct Upload — the
 * `/pages/.../deployments` HTTP endpoint this project used before this
 * fix requires a reverse-engineered, undocumented content-hash/manifest
 * protocol (see Cloudflare's own Pages "Direct Upload" docs, which only
 * describe Wrangler and dashboard drag-and-drop as supported paths).
 * Shelling out to Wrangler — Cloudflare's own officially maintained CLI
 * — uploads the whole directory correctly and stays working across
 * Cloudflare API changes, which a hand-rolled version of their internal
 * protocol would not.
 *
 * stdin is closed immediately so a first-run telemetry prompt or any
 * other interactive question fails fast (EOF) instead of hanging the
 * server action forever with no TTY attached; WRANGLER_SEND_METRICS=false
 * skips that specific prompt outright. A 90s timeout is a second
 * independent safety net. */

// Reject only characters a shell could interpret specially — an
// allowlist would have to model every legitimate path character (this
// very project's own directory contains a space: ".../Webseiten
// leads/..."), which a denylist doesn't need to. Quotes and newlines are
// blocked because they'd break the manual quoting below.
const DANGEROUS_ARG_CHARS = /["\n\r\t;&|`$<>^]/;

function assertSafeArgs(args: string[]) {
  for (const arg of args) {
    if (DANGEROUS_ARG_CHARS.test(arg)) {
      throw new Error(`Unsicheres Argument für Wrangler-Aufruf blockiert: ${JSON.stringify(arg)}`);
    }
  }
}

function runWrangler(args: string[]): Promise<WranglerRun> {
  assertSafeArgs(args);

  return new Promise((resolve) => {
    // The .cmd shim on Windows can only execute through a shell
    // (spawning it directly fails with EINVAL) — so shell:true is
    // required on Windows, not optional. Node does NOT escape array
    // args in shell mode (its own DEP0190 warning): a directory path
    // containing a space would otherwise be split into two shell
    // arguments, corrupting the command. Node's own guidance for this
    // case is to build and quote the full command string yourself and
    // pass it with no separate args array — every argument is already
    // validated above to exclude quotes and shell metacharacters, so
    // wrapping each in double quotes is safe.
    const child =
      process.platform === "win32"
        ? spawn(
            [WRANGLER_BIN, ...args].map((a) => `"${a}"`).join(" "),
            { env: { ...process.env, ...WRANGLER_ENV }, shell: true, signal: AbortSignal.timeout(90_000) }
          )
        : spawn(WRANGLER_BIN, args, {
            env: { ...process.env, ...WRANGLER_ENV },
            signal: AbortSignal.timeout(90_000),
          });
    child.stdin.end();

    let output = "";
    child.stdout.on("data", (d: Buffer) => (output += d.toString()));
    child.stderr.on("data", (d: Buffer) => (output += d.toString()));
    // Cleans wrangler's raw output so it's safe to both display in the
    // dashboard and hand to logActivity() (which persists it via
    // Prisma/SQLite). Real incident (2026-09-09): wrangler's output uses
    // emoji liberally (✘, ⛅️, ✨, …) and Prisma's query-engine transport
    // throws "unexpected end of hex escape" once a later `.slice(0, N)`
    // call site (see truncateSafely) risked cutting a surrogate pair in
    // half — a lone surrogate can't round-trip through JSON encoding
    // cleanly. Rather than depend on every truncation call site getting
    // that exactly right, this strips ANSI (both OSC hyperlinks and
    // general CSI sequences, not just SGR color codes) AND every
    // non-ASCII/non-printable character up front: wrangler's own CLI
    // chrome is purely decorative diagnostic text, never business data
    // (lead names etc. never flow through this subprocess), so there's
    // nothing lost by keeping only plain ASCII from it.
    const stripAnsi = (s: string) =>
      s
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
        .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
        .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
    child.on("close", (code) => resolve({ code: code ?? 1, output: stripAnsi(output) }));
    child.on("error", (err) => resolve({ code: 1, output: output + `\n${err.message}` }));
  });
}

/**
 * Publishes every lead's demo into one shared Cloudflare Pages project
 * via `wrangler pages deploy`, each at its own stable public path
 * (`https://<project>.pages.dev/<slug>/`) — avoids the free plan's
 * 100-projects-per-account cap that a one-project-per-lead design runs
 * into (see sharedProjectName's doc comment) while still keeping every
 * lead's demo independently addressable and never exposing the
 * dashboard, database, or other leads' *unpublished* demos (see
 * STAGING_ROOT).
 */
export class CloudflarePagesPublisher implements DemoPublisher {
  async publish({ slug, directory }: PublishInput): Promise<PublishResult> {
    if (!isCloudflareConfigured()) {
      return {
        ok: false,
        error: "Cloudflare ist nicht konfiguriert (CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID fehlen in .env).",
      };
    }

    try {
      const projectName = sharedProjectName();

      // Explicit, non-interactive project creation up front. `pages
      // deploy` against a project that doesn't exist yet would
      // otherwise prompt "Would you like to create one?" — with no TTY
      // attached that prompt can never be answered. "already exists" is
      // the normal, expected outcome on every deploy after the first —
      // in the shared-project design that's now every single deploy.
      const create = await runWrangler([
        "pages",
        "project",
        "create",
        projectName,
        "--production-branch=main",
      ]);
      if (create.code !== 0 && !/already exists/i.test(create.output)) {
        return {
          ok: false,
          error: `Cloudflare-Projekt konnte nicht angelegt werden: ${create.output.slice(0, 500)}`,
        };
      }

      await ensureStagingRoot();
      await mirrorIntoStaging(slug, directory);

      const deploy = await runWrangler([
        "pages",
        "deploy",
        STAGING_ROOT,
        `--project-name=${projectName}`,
        "--branch=main",
        "--commit-dirty=true",
      ]);

      if (deploy.code !== 0) {
        return {
          ok: false,
          error: `Cloudflare-Deployment fehlgeschlagen: ${deploy.output.slice(0, 500)}`,
        };
      }

      // Wrangler prints a per-deployment URL (a random hash prefixed onto
      // the project domain, e.g. https://afa9eae2.<project>.pages.dev) —
      // a *new* hostname on every single deploy, which needs its own DNS
      // propagation each time (confirmed live: still not reachable after
      // 140s of polling on more than one otherwise-successful deploy).
      // The bare project domain (https://<project>.pages.dev) is a
      // stable alias Cloudflare points at whatever the current
      // production deployment is — since this deploy targeted
      // production-branch "main" via --branch=main, that's this
      // deployment, and the alias only needs to propagate once for the
      // whole project's lifetime (at its first-ever deploy) rather than
      // per lead, since every lead now shares this one project/domain.
      const deployedOk = /https:\/\/[a-z0-9.-]+\.pages\.dev\S*/i.test(deploy.output);
      if (!deployedOk) {
        return {
          ok: false,
          error:
            "Wrangler hat das Deployment ohne Fehler beendet, aber keine Deployment-URL in der Ausgabe gefunden — bitte Cloudflare-Dashboard manuell prüfen.",
        };
      }

      return { ok: true, publicUrl: `https://${projectName}.pages.dev/${slug}/` };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler bei der Cloudflare-Bereitstellung.",
      };
    }
  }

  /** The counterpart to publish() for a demo that's no longer wanted.
   * In the shared-project design there's no longer a whole project to
   * tear down per lead (deleting the *project* would take every other
   * published lead offline with it) — instead this removes just that
   * lead's subfolder from the staged tree and redeploys, so its path
   * stops resolving while every other lead's stays live. A lead that was
   * never published (no local staging folder) is treated as success,
   * same "nothing to do" tolerance the old per-project version had for
   * "already gone on Cloudflare". */
  async deleteProject(slug: string): Promise<{ ok: boolean; error?: string }> {
    if (!isCloudflareConfigured()) {
      return { ok: false, error: "Cloudflare ist nicht konfiguriert (CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID fehlen in .env)." };
    }
    try {
      const target = path.join(STAGING_ROOT, slug);
      const existed = await fs
        .access(target)
        .then(() => true)
        .catch(() => false);
      if (!existed) return { ok: true };

      await fs.rm(target, { recursive: true, force: true });
      await ensureStagingRoot();

      const projectName = sharedProjectName();
      const deploy = await runWrangler([
        "pages",
        "deploy",
        STAGING_ROOT,
        `--project-name=${projectName}`,
        "--branch=main",
        "--commit-dirty=true",
      ]);
      if (deploy.code !== 0) {
        return { ok: false, error: `Konnte nicht neu deployt werden, um "${slug}" zu entfernen: ${deploy.output.slice(0, 500)}` };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler beim Entfernen des Demos aus dem Cloudflare-Deployment.",
      };
    }
  }
}
