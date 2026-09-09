# Autopilot State

Read this file, `CLAUDE.md`, `git log --oneline -20`, and `git status` at the
start of every new session on this project before doing anything else. Then
go straight to NEXT ACTION — don't wait for a new task description.

Last updated: 2026-09-09 (session covering the CEO quality audit,
Cloudflare rebuild, first real Cloudflare publish, first GitHub push, and
the multi-page Demo Engine rebuild).

## CURRENT OBJECTIVE

Make the full pipeline (research → contact discovery → analysis → demo →
visuals → before/after → offer → deploy → verify → Gmail draft / manual
send) genuinely sellable — not just architecturally complete. Owner:
Hacibekir Cayir.

## CURRENT PHASE

**Cloudflare is live and proven end-to-end** (real publish + verify
succeeded). **GitHub is connected and pushed** — `origin/main` exists and
matches local `main`. **Gmail is back in progress**: the user un-dropped
it and is working through real OAuth setup live with Claude's help —
hit and fixed a real setup bug (Desktop-app OAuth clients can't be used
with the OAuth Playground's redirect flow; needs a Web-application-type
client with `https://developers.google.com/oauthplayground` as an
authorized redirect URI). Client ID/secret regenerated correctly as a
Web app and saved to `.env`; still waiting on the final
`GMAIL_REFRESH_TOKEN` from the Playground's Step 2. **Demo Engine now
builds real multi-page sites** (see COMPLETED) — this was the master
mission's top-priority ask this round.

## COMPLETED

- Full pipeline: research (OSM Overpass, retries on transient
  502/503/504) → analysis (cheerio audit + real Playwright
  before-screenshots) → contact discovery (crawls Impressum/Kontakt/
  Datenschutz, ranked by domain-match + source authority) → scoring →
  X-ray → concept/variant selection → demo generation (now multi-page,
  see below) → pricing (3 sourced market anchors, −€100 rule) →
  messaging → Cloudflare publish (Wrangler CLI) → Gmail draft prep
  (real signature, preflight checklist) or manual copy-to-clipboard.
- **First real Cloudflare publish, verified live**: lead "Meisterschnitt"
  → https://dc2f5187.meisterschnitt.pages.dev, reachable, content-matched,
  saved. Fixed the two bugs this exposed (DNS-propagation poll window
  too short; approved messages couldn't be edited to add the link once
  one existed).
- **First GitHub push**: `origin/main` created from a previously-empty
  remote. Scanned full history for secrets before pushing (none found).
  Verified `origin/main` == local `HEAD` after push.
- **Demo Engine: real multi-page sites**, not one scrolling page.
  `renderDemoSite()` emits index.html / leistungen.html / ueber-uns.html
  / kontakt.html (only the pages that have real content for that
  variant+industry — e.g. luxury-minimal correctly gets a 3-page site,
  no Leistungen page, since it has no services section at all). Real
  nav with active-state per page. Industry-real secondary-page labels
  (Speisekarte/Angebot/Zimmer & Angebote/Leistungen). Two bugs found
  and fixed while verifying live across two industries: (1)
  deriveServiceLabels() was wrongly gated on having a "service" image
  asset role, so Rechtsanwalt/Steuerberater never got a Leistungen page
  despite having real service labels; (2) the services section's <h2>
  was hardcoded "Leistungen" regardless of the resolved nav label,
  so a restaurant's page said "Speisekarte" in nav but "Leistungen" in
  its own heading.
- Dashboard: premium redesign, HOT/WARM/COLD priority column, Before/
  After screenshot card (later upgraded by the concurrent session into
  an interactive drag slider), enlarged demo preview, copy-URL feedback.
- Fixed a critical bug where re-analyzing an already-approved lead could
  silently rewind its status and let /loop overwrite an approved
  message — guarded by `advancePipelineStatus` (forward-only) plus a
  hard refusal in `runMessageGeneration`.

## IN PROGRESS

- **Gmail OAuth, live with the user**: waiting on them to redo Step 1
  authorization in the OAuth Playground with the new Web-app credentials
  (already saved to `.env`) and send back the resulting
  `GMAIL_REFRESH_TOKEN` from Step 2. Nothing to do here until that
  arrives — don't re-attempt or guess at it.

## BLOCKED

- Only the Gmail refresh token, and only on the user completing the
  Playground flow (interactive Google login — Claude cannot do this
  step). Cloudflare and GitHub are both fully working, nothing blocked
  there.

## NEXT ACTION

1. **When `GMAIL_REFRESH_TOKEN` arrives**: save it to `.env`, restart
   the dev server, then run one real end-to-end test — approve a
   message for a lead with both a real contact email AND a real
   Cloudflare public URL (e.g. re-verify Meisterschnitt, which has
   both already), click "Gmail-Entwurf vorbereiten", confirm the
   preflight checklist is all-green and a real Gmail draft appears in
   hacibekircayir@gmail.com's Drafts folder (draft only — never call
   `.send()`).
2. **Demo Engine QA pass**: the multi-page rebuild has been verified on
   2 industries (law firm, restaurant) plus one 4-page and implicitly
   the 3-page (luxury-minimal) case by code inspection but not yet
   visually confirmed live — spot-check a lead that lands on
   luxury-minimal or corporate (both have thin/no-services
   sectionOrders) to visually confirm a clean 2-3 page site, and check
   the Hotel/Immobilienmakler "Zimmer & Angebote" label live (not yet
   screenshotted).
3. **Publish real links for more approved leads** — Cloudflare works
   but only Meisterschnitt has actually been published; every other
   approved-or-approvable lead is still sitting on a local-only demo.
4. Per the master mission's Demo Engine ask (≥30 named creative
   directions, typography/motion systems, variant registry with
   similarity detection): the multi-page work above is the structural
   piece; the registry/typography/motion expansion is bigger, separate
   design work — don't start it speculatively mid-session. If picked
   up, scope it deliberately (which named directions, what they change
   beyond color/font) rather than generating filler variants.

## KNOWN BUGS

- Two pre-existing test leads ("Dr. Ortwin Schuchardt", "Haarstudio
  Bahar") are permanently stuck in `DEMO_CREATED` with a stale pre-fix
  error. Local dev data only, safe to ignore or delete.

## KNOWN LIMITATIONS

- Contact discovery only crawls pages linked from the homepage
  nav/footer — a site burying its contact page elsewhere correctly
  reports "nothing found" rather than guessing.
- No image-generation provider configured (by design, optional, fails
  closed) — every demo without real photos uses the deterministic
  abstract-SVG fallback.
- Multi-page detail pages (per-project/per-property/per-team-member,
  e.g. `/leistungen/[slug]`) are deliberately NOT built — there's no
  real underlying per-item data model yet (just category labels), and
  inventing per-item descriptions would violate "nicht erfinden". Would
  need real structured content (research findings per service/project)
  before this is honest to build.

## LAST SUCCESSFUL TEST

**Multi-page demo generation, verified live (2026-09-09):** regenerated
Rechtsanwalt Bocionek (4 pages: services page appeared correctly after
the deriveServiceLabels fix) and Ristorante Classico Da Gigi's (4 pages,
"Speisekarte" label correct in both nav and heading after the second
fix). Nav active-state, page titles, mobile nav layout all confirmed via
screenshot. Full `tsc`/`lint`/`next build` clean at HEAD.

Just before that: real Cloudflare publish end-to-end (Meisterschnitt →
live, verified, reachable `*.pages.dev` URL; approved message edited to
include the real link).

## LAST COMMIT

`29ff617` — Demo Engine: real multi-page sites instead of one-page
scrolling demos. Pushed to `origin/main` (confirmed in sync). Two
commits pushed this session total (`a27b6c8` first, then `29ff617`).

## NEXT PRIORITY

P1 items (Cloudflare, GitHub) are done and proven. Gmail is back
in-progress with the user, one step from done — that's the most
immediate next priority once the refresh token arrives. In parallel,
P2 Demo Engine QA (item 2 above) and publishing more real links (item 3)
are good next steps that don't require waiting on anything.

## CONCURRENT SESSION NOTE

Another Claude Code session was active on this same working directory
(not an isolated worktree) earlier in this session — it committed
`81537be` and `89cf5b5` (the interactive Before/After slider). Always
check `git status`/`git log` for changes made outside this session
before assuming the tree matches what you last read, and stage files
explicitly (never a blanket `git add -A`) to avoid committing another
session's in-progress, unreviewed work. Not observed active in the most
recent part of this session, but assume it could resume.
