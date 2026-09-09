import { spawn } from "node:child_process";
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
    // Strips ANSI color codes so a raw wrangler error stays readable if
    // it's ever shown in the dashboard UI.
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
    child.on("close", (code) => resolve({ code: code ?? 1, output: stripAnsi(output) }));
    child.on("error", (err) => resolve({ code: 1, output: output + `\n${err.message}` }));
  });
}

/**
 * Publishes one demo as its own Cloudflare Pages project via `wrangler
 * pages deploy`, so each lead gets a stable, dedicated public URL
 * (`https://<slug>.pages.dev`) without exposing the dashboard, database,
 * or other leads' demos.
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
      const projectName = toProjectName(slug);

      // Explicit, non-interactive project creation up front. `pages
      // deploy` against a project that doesn't exist yet would
      // otherwise prompt "Would you like to create one?" — with no TTY
      // attached that prompt can never be answered. "already exists" is
      // the normal, expected outcome on every deploy after the first.
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

      const deploy = await runWrangler([
        "pages",
        "deploy",
        directory,
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
      // deployment, and the alias only needs to propagate once per
      // project (at creation) rather than on every republish.
      const deployedOk = /https:\/\/[a-z0-9.-]+\.pages\.dev\S*/i.test(deploy.output);
      if (!deployedOk) {
        return {
          ok: false,
          error:
            "Wrangler hat das Deployment ohne Fehler beendet, aber keine Deployment-URL in der Ausgabe gefunden — bitte Cloudflare-Dashboard manuell prüfen.",
        };
      }

      return { ok: true, publicUrl: `https://${projectName}.pages.dev` };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler bei der Cloudflare-Bereitstellung.",
      };
    }
  }

  /** Tears down the whole Cloudflare Pages project (all its deployments,
   * the `<project>.pages.dev` domain) — the counterpart to publish(),
   * for cleaning up a demo that's no longer wanted. `--yes` is required:
   * this command normally prompts for confirmation, and stdin is closed
   * immediately on every wrangler call (see runWrangler), so an
   * unconfirmed prompt would otherwise just fail on EOF instead of
   * actually deleting anything. A project that's already gone (or never
   * existed on Cloudflare — e.g. a demo that was never published) is
   * treated as success, same "already exists" tolerance as create(). */
  async deleteProject(slug: string): Promise<{ ok: boolean; error?: string }> {
    if (!isCloudflareConfigured()) {
      return { ok: false, error: "Cloudflare ist nicht konfiguriert (CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID fehlen in .env)." };
    }
    try {
      const projectName = toProjectName(slug);
      const result = await runWrangler(["pages", "project", "delete", projectName, "--yes"]);
      if (result.code !== 0 && !/not found|does not exist|couldn.?t find/i.test(result.output)) {
        return { ok: false, error: `Cloudflare-Projekt konnte nicht gelöscht werden: ${result.output.slice(0, 500)}` };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler beim Löschen des Cloudflare-Projekts.",
      };
    }
  }
}
