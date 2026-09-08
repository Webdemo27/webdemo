# Autopilot State

Read this file, `CLAUDE.md`, `git log --oneline -20`, and `git status` at the
start of every new session on this project before doing anything else. Then
go straight to NEXT ACTION — don't wait for a new task description.

Last updated: 2026-09-08 (session covering the CEO quality audit,
Cloudflare rebuild, and the first real Cloudflare publish).

## CURRENT OBJECTIVE

Make the full pipeline (research → contact discovery → analysis → demo →
visuals → before/after → offer → deploy → verify → hand-off for sending)
genuinely sellable — not just architecturally complete. Owner: Hacibekir
Cayir.

## CURRENT PHASE

**Cloudflare is live and proven end-to-end.** Real credentials were added
this session; the first real publish succeeded (see LAST SUCCESSFUL TEST).
**Plan change from the user: Gmail OAuth is dropped.** Hacibekir couldn't
create a Gmail API token and will send outreach emails manually himself.
Don't push Gmail setup further — the job now is making sure the approved
message text (with the real public link) is always correct and easy to
copy, not getting a Gmail draft created. The Settings page's Gmail
setup section can stay (harmless, might get used later) but isn't a
priority to revisit.

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
  images included).
- **First real Cloudflare publish succeeded** (lead "Meisterschnitt" →
  https://dc2f5187.meisterschnitt.pages.dev, real, reachable, verified).
  Two bugs this exposed, both fixed: (1) verify.ts's ~48s poll budget was
  too short for a brand-new *.pages.dev subdomain's first DNS propagation
  — increased to ~140s; (2) message-review-card.tsx hid the "Bearbeiten"
  button once a message was approved, so a message approved *before* a
  public URL existed had no UI path to get the real link added — changed
  the condition from `!decided` to `!sentAt`.
- Used the now-editable approved message to add Meisterschnitt's real
  link, replacing the "I'll send the link separately" placeholder
  sentence — this exact text is what would go to a real customer.

## IN PROGRESS

- Nothing mid-edit. Working tree is clean as of the last commit below.

## BLOCKED

Nothing. Cloudflare is fully configured and proven working. Gmail is
intentionally not being pursued (see CURRENT PHASE) — not a blocker, a
dropped requirement.

## NEXT ACTION

1. The end-to-end mechanism is proven. The real next lever is *volume and
   quality across many leads*, not more infrastructure: for each lead
   that reaches an approved message, actually click "Öffentlich
   bereitstellen" so it gets a real link before Hacibekir copies the text
   to send — this doesn't happen automatically, someone (a session or
   Hacibekir) has to trigger it per lead.
2. Consider whether "Demo erstellen"/regeneration should auto-publish once
   Cloudflare is configured, vs. staying a manual per-lead click — a
   product decision, not obviously a bugfix, so don't just wire it
   without thinking about project-limit/rate implications (every publish
   creates a real Cloudflare Pages project).
3. The highest-value P2 work (per the master mission) is the Demo Engine:
   today there are 8 structural ConceptVariants × 7 industry
   VisualProfiles (56 combinations) — real and tested, but the mission
   asks for ≥30 *named* creative directions with their own typography/
   motion systems (kinetic type, scroll-reveal, magnetic CTA, etc.),
   which is a genuinely large, separate body of design+code work, not a
   quick add-on. Don't start it speculatively without deciding scope
   first — it's easy to half-build a "variant explosion" that produces 30
   shallow reskins instead of 30 real concepts, which the mission
   explicitly calls out as not counting. A CREATE SALES PACKAGE
   single-button flow and the 10-metric dashboard (mission sections
   16-17) are smaller, well-scoped P2 items without this risk.

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

**Real Cloudflare publish, full end-to-end (2026-09-08):** lead
"Meisterschnitt" → `wrangler pages project create` + `pages deploy` →
real deployment at a *.pages.dev subdomain → verified reachable (after
fixing the DNS-propagation poll window) and content-matched →
`Demo.publicUrl` saved → approved message edited (using the now-fixed
Bearbeiten button) to include the real link in place of the
no-link-yet placeholder sentence. This is the complete HAUPTZIEL path
proven with real infrastructure, for the first time this project has
existed. Full `tsc`/`lint`/`next build` clean at HEAD.

Earlier in the session: real end-to-end contact discovery +
before-screenshot capture verified on real leads (bakery, law firm,
hotel, hairdresser) via the standard `/loop` path, including a genuine
domain-match ranking fix and rejection of a legally-mandated-but-
irrelevant dispute-resolution-board address. Real Before/After
comparison verified on a hairdresser lead.

## LAST COMMIT

`52415d8` — First real Cloudflare publish succeeded — fix the two bugs
it found. Working tree clean, nothing pushed (per standing rule: never
push without the user's explicit approval for that specific push, which
overrides any mission/goal text asking for automatic push-on-milestone).

## NEXT PRIORITY

P1 (Cloudflare) is done and proven. Gmail is dropped per user decision.
Next priority is P2: pick between (a) publishing real links for more
approved leads so there's a growing set of ready-to-send messages, or
(b) the CREATE SALES PACKAGE button / dashboard metrics from the master
mission (sections 16-17) — both are well-scoped and don't carry the
"30 shallow reskins" risk the Demo Engine expansion does.

## CONCURRENT SESSION NOTE

Another Claude Code session has been active on this same working
directory (not an isolated worktree) during this session — it committed
`81537be` and `89cf5b5` (the interactive Before/After slider) while this
session was working. Always check `git status`/`git log` for changes
made outside this session before assuming the tree matches what you last
read, and stage files explicitly (never a blanket `git add -A`) to avoid
committing another session's in-progress, unreviewed work.
