# Autopilot State

Read this file, `CLAUDE.md`, `git log --oneline -20`, and `git status` at the
start of every new session on this project before doing anything else. Then
go straight to NEXT ACTION — don't wait for a new task description.

Last updated: 2026-09-08 (session covering the CEO quality audit +
Cloudflare rebuild).

## CURRENT OBJECTIVE

Make the full pipeline (research → contact discovery → analysis → demo →
visuals → before/after → offer → deploy → verify → Gmail draft) genuinely
sellable — not just architecturally complete. Owner: Hacibekir Cayir.

## CURRENT PHASE

Infrastructure hardening. The creative/demo engine (variants, visual
director, X-ray, pricing, messaging) has been through several rounds of
real-lead testing and bug fixes and is in reasonable shape. The remaining
gap before a real outreach can happen end-to-end is the two external
integrations (Cloudflare, Gmail) actually running against real accounts —
both are now code-complete and fail closed correctly, but neither has ever
been exercised against live credentials because none exist yet.

## COMPLETED

- Full pipeline: research (OSM Overpass, with retry on transient 502/503/504)
  → analysis (cheerio audit + real Playwright before-screenshots) → contact
  discovery (crawls Impressum/Kontakt/Datenschutz, ranked by domain-match +
  source authority, verified against real sites) → scoring → X-ray →
  concept/variant selection (8 structural variants × 7 industry visual
  profiles) → demo generation (real/abstract asset pipeline, real
  after-screenshot capture) → pricing (3 sourced market anchors, documented,
  −€100 rule) → messaging → Gmail draft prep (real signature, preflight
  checklist) → Cloudflare publish (rewritten on Wrangler CLI this session).
- Dashboard: premium redesign (editorial hero, pipeline-value panel,
  shimmer CTAs, correct button-priority hierarchy), HOT/WARM/COLD priority
  column in the leads table, Before/After screenshot card, enlarged demo
  preview with copy-URL feedback.
- Fixed a critical bug where re-analyzing an already-approved lead could
  silently rewind its status and let /loop overwrite an approved message —
  now guarded by `advancePipelineStatus` (forward-only) plus a hard refusal
  in `runMessageGeneration` if the message is already approved/rejected/sent.
- Cloudflare publisher rewritten from a broken hand-rolled single-file API
  call to `wrangler pages deploy <dir>` (uploads the whole directory,
  images included); verified the spawn plumbing itself (binary resolution,
  Windows shell quoting with a space in this project's own path, error
  propagation) against the real Cloudflare API using a deliberately invalid
  token — confirmed the code correctly reaches Cloudflare and reports a
  clean error, not yet exercised with a real token.

## IN PROGRESS

- Nothing mid-edit. Working tree is clean as of the last commit below.

## BLOCKED

- **Cloudflare**: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are not
  set in `.env`. Until they are, "Öffentlich bereitstellen" fails closed
  with a clear message and no demo can get a real public URL. Exact values
  needed — see NEXT ACTION.
- **Gmail**: `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`
  are not set. Until they are, "Gmail-Entwurf vorbereiten" fails closed
  (message text is still fully generated and copy-to-clipboard works as a
  fallback). Has not been re-verified against a real account since the
  contact-discovery work landed — worth a fresh end-to-end check once
  Cloudflare is connected, since a real public URL changes what the
  preflight checklist reports.
- Neither of these can be resolved by Claude — they require the account
  owner to create real credentials. Nothing else in the codebase is
  blocking on missing information.

## NEXT ACTION

1. Hand the user the exact Cloudflare setup steps (token creation, account
   ID location, .env variable names, required permissions) — this was in
   progress when this state file was created; if not yet delivered in the
   conversation, deliver it now.
2. Once `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are real: run one
   full E2E test on an existing real lead with a demo already generated —
   publish → verify (reachable + content matches) → confirm `Demo.publicUrl`
   is a real `https://*.pages.dev` URL → regenerate that lead's message so
   it includes the real link → Gmail draft prep → confirm the preflight
   checklist's "Demo erreichbar" line now passes.
3. Build the Settings page "Cloudflare" section into a real connect/status
   UI (currently just a configured/not-configured line) — show exactly
   which value is missing without ever displaying or logging a secret.
4. Re-test Gmail draft creation end-to-end once real Cloudflare credentials
   make a real public URL available, since no lead has ever had both a real
   contact email AND a real public URL at the same time yet.

## KNOWN BUGS

- Two pre-existing test leads ("Dr. Ortwin Schuchardt", "Haarstudio Bahar")
  are permanently stuck in `DEMO_CREATED` with a stale pre-fix error — from
  before `generateDemo()` required an analysis to exist. Local dev data
  only, not a live defect; safe to ignore or delete via the dashboard.

## KNOWN LIMITATIONS

- Contact discovery only crawls pages linked from the homepage nav/footer
  (Impressum/Kontakt/Datenschutz/Team/Über uns) — a site that buries its
  contact page differently, or has no crawlable link to it at all, will
  correctly report "nothing found" rather than guessing.
- The abstract-art asset fallback (used when a lead's site has no usable
  real photos and no image-generation provider is configured) covers two
  layout families well (grid-clean panel motif, gradient-mesh blobs);
  `duotoneBlocks` (bold-blocks layout) hasn't had the same level of
  scrutiny — worth a look if a bold-conversion demo ever looks off.
- No image-generation provider is configured (by design — optional,
  fails closed) — every demo without real photos currently uses the
  deterministic abstract-SVG fallback, never a generated photo.

## LAST SUCCESSFUL TEST

Cloudflare publisher spawn plumbing, verified against the live Cloudflare
API with an intentionally invalid token (2026-09-08): confirmed the
wrangler binary resolves and runs without the npx/npm-prefix.js resolution
bug, confirmed a directory path containing a space (this project's own
path) survives the Windows shell-quoting intact as one argument, confirmed
a real Cloudflare API rejection is captured and surfaced cleanly rather
than hanging or crashing. Full `tsc`/`lint`/`next build` clean at HEAD.

Earlier in the session: real end-to-end contact discovery + before-screenshot
capture verified on real leads (bakery, law firm, hotel, hairdresser) via
the standard `/loop` path, including a genuine domain-match ranking fix and
rejection of a legally-mandated-but-irrelevant dispute-resolution-board
address. Real Before/After comparison verified on a hairdresser lead.

## LAST COMMIT

`c6c2d94` — Rebuild Cloudflare publishing on the officially-supported
Wrangler CLI. Working tree clean, nothing pushed (per standing rule: never
push without the user's explicit approval for that specific push, which
overrides any goal text asking for automatic push-on-milestone).

## NEXT PRIORITY

P1 (per the master mission's own priority order): finish the Cloudflare
Settings UI, then hand off the credential requirement clearly. P2 after
that: re-verify Gmail once a real public URL exists to test against.
