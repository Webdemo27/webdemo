# Autopilot State

Read this file, `CLAUDE.md`, `git log --oneline -20`, and `git status` at the
start of every new session on this project before doing anything else. Then
go straight to NEXT ACTION — don't wait for a new task description.

Last updated: 2026-09-09 (session covering the CEO quality audit,
Cloudflare rebuild, first real Cloudflare publish, first GitHub push, the
multi-page Demo Engine rebuild, real Gmail OAuth end-to-end, auto-link
insertion into approved messages, the Demo Engine motion pass using the
emilkowalski/skill animation skills, chain/websiteless research filters,
bulk-delete leads, full-pipeline restart on "Demo neu erstellen",
per-regeneration color variation, and the message-reformulate feature).

**Open question for the user, not yet acted on**: a message this
session asked for "React Vite Demos... WEB3GL" — read as possibly
wanting the demo-generator rewritten onto React/Vite instead of static
self-contained HTML. That directly conflicts with CLAUDE.md's explicit
"no framework dependency" architecture (chosen for iframe preview +
Cloudflare Pages static Direct Upload). Did NOT silently pivot the
architecture on an ambiguous one-line message — flagged it back to the
user instead. If they confirm they want it, that's a genuinely large,
separate rewrite (per-demo build step, bigger output, new failure
modes) — scope it deliberately, don't bolt it on quickly.

## CURRENT OBJECTIVE

Make the full pipeline (research → contact discovery → analysis → demo →
visuals → before/after → offer → deploy → verify → Gmail draft / manual
send) genuinely sellable — not just architecturally complete. Owner:
Hacibekir Cayir.

## CURRENT PHASE

**Cloudflare is live and proven end-to-end** (real publish + verify
succeeded, now on the stable project URL — see COMPLETED). **GitHub is
connected and pushed** — `origin/main` exists and matches local `main`.
**Gmail is one step from done**: full OAuth setup completed live with
the user (fixed a real setup bug along the way — Desktop-app OAuth
clients can't be used with the OAuth Playground's redirect flow; needed
a Web-application-type client with
`https://developers.google.com/oauthplayground` as an authorized
redirect URI; also needed `hacibekircayir@gmail.com` added as an OAuth
test user). `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`
are all real and saved in `.env`, Settings page shows all three
integrations "Konfiguriert". Ran the real end-to-end test (Meisterschnitt,
"Gmail-Entwurf vorbereiten") — **the entire preflight checklist passes**
(recipient, subject, body, approval, real public URL, no localhost, no
placeholders, signature all ✓) but the actual Gmail API call itself
fails: `Gmail API has not been used in project 491216628576 before or
it is disabled`. This is a separate one-time step from creating OAuth
credentials — the user has been given the direct enable link
(`https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=491216628576`)
and needs to click Enable there; Google says allow a few minutes to
propagate before retrying. **Demo Engine now builds real multi-page
sites** (see COMPLETED) — this was the master
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
- **Gmail OAuth fully live, verified twice** (Meisterschnitt, Hotel Zum
  Riesen): real drafts created via the Gmail API in
  hacibekircayir@gmail.com's account. Four distinct setup bugs found and
  fixed live with the user (OAuth client type, wrong Google account,
  missing test-user grant, Gmail API not enabled on the project) — see
  LAST SUCCESSFUL TEST.
- **`insertDemoLink()`** (`src/lib/messaging/index.ts`) wired into
  `publishDemoPublicly()` (`src/lib/publishing/publish-demo.ts`): after a
  verified publish, an already-approved message's "I'll send the link
  separately" placeholder is automatically swapped for the real URL —
  never touches `approvedAt`/`rejectedAt`/`sentAt`, so it can't silently
  overwrite a human's review decision.
- **Demo Engine: real motion**, not a static template. Installed and
  applied the `emilkowalski/skill` animation pack: custom easing tokens,
  an animated sliding underline on the nav, a diagonal shimmer sweep on
  primary/header buttons, universal `scale(0.97)` press feedback, a
  kinetic hero (headline → tagline → CTA staggered 70ms apart), staggered
  service-card/detail-image reveals via a `--stagger-index` CSS custom
  property, and a `clip-path` image-uncover layered under the existing
  fade. Three reveal flavors (fade-up/fade-scale/fade-blur) are chosen
  per-lead from the seed so demos don't all share one motion signature.
  Everything decorative is gated behind the existing `profile.motion`
  flag — verified live that a `motion: "none"` profile (Rechtsanwalt
  Bocionek) renders with zero shimmer/underline/stagger while still
  getting the universal press feedback, and an expressive profile
  (Ristorante) gets the full treatment on both desktop and mobile.
  `prefers-reduced-motion` handled via a dedicated `@media` block.

- **Research/leads quality pass** (all verified live): Overpass now
  skips branches of a chain/franchise (OSM brand/operator tags + a
  short known-name safety net — chain-filter.ts) and businesses with no
  website at all (the pipeline can't analyze what doesn't exist —
  confirmed via a real permanently-stuck lead). Leads table got a real
  multi-select + delete UI (leads-table.tsx, bulk-actions.ts) so
  pre-existing junk can be cleaned out manually — the user used this
  live to go from 80 leads down to 12. "Demo neu erstellen" now restarts
  the whole per-lead process (analysis → demo → message) in one click
  instead of three, still refusing to touch an already-decided message.
  Demo color now varies per regeneration too (colorway.ts, pure hue
  rotation, industry-authentic saturation/lightness preserved). A
  message that's already sent can now be reformulated into a fresh
  draft requiring its own approval (reformulateSentMessage).

## IN PROGRESS

Nothing. All three integrations (Cloudflare, GitHub, Gmail) are
configured and proven working end-to-end as of this session.

## BLOCKED

Nothing. This is the first point in the project's history where every
external integration is real and verified.

## NEXT ACTION

1. **Publish real links for more approved leads** — Meisterschnitt, Hotel
   Zum Riesen, and Junker Immobilien have real public URLs; any
   newly-approved lead still needs someone to click "Öffentlich
   bereitstellen" — this doesn't happen automatically, and since this
   session the resulting link is auto-inserted into the approved message
   afterward (see COMPLETED / `insertDemoLink`).
2. **Demo Engine motion pass is done for the core mechanics** (nav,
   buttons, reveals, stagger, hero) — verified live across an expressive
   and a "no motion" profile, desktop and mobile. Not yet done: applying
   the same motion-flavor thinking to the hero visual itself (e.g. a
   subtle parallax/idle float on `hero-color-block` or 3D variants) and
   to page-to-page navigation (no page-transition animation between the
   static multi-page files yet — would need a tiny shared-element/fade
   script, not attempted this session, judge whether it's worth the
   added JS for a static demo before building it).
3. Per the master mission's Demo Engine ask (≥30 named creative
   directions, a formal variant registry with similarity detection):
   the multi-page work + this session's motion pass are the structural
   and motion pieces; the registry itself (tracking variantId/concept/
   industry/etc. and rejecting near-duplicate variants) is still not
   built — separate, deliberate design work, don't start it
   speculatively mid-session.
4. The `.agents/skills/` emilkowalski animation pack (animate,
   animation-vocabulary, emil-design-eng, improve-animations,
   review-animations, find-animation-opportunities, etc.) is now
   actually applied (see COMPLETED), not just installed — reach for it
   again for any further motion/polish work rather than inventing
   patterns from scratch.

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
- **`insertDemoLink()` can't replace an already-embedded link, only fill
  in a missing one.** If a lead is republished after its message already
  contains a demo URL (e.g. re-verifying an old hash-based Cloudflare URL
  against the newer stable-alias one), `insertDemoLink` falls through to
  its "append a new line" branch instead of swapping the old URL out —
  the message ends up with two different links. Discovered this
  session while deciding whether to backport the new animated demo
  engine onto the 3 already-published leads (Meisterschnitt, Hotel Zum
  Riesen, Junker Immobilien) — **deliberately did not touch them**
  because of this: Meisterschnitt already has a real, unsent Gmail draft
  built around its current (pre-motion-pass, hash-URL) demo, and
  regenerating would have created exactly this two-links mismatch. Their
  live links keep pointing at the older, non-animated but fully
  verified demo; every demo generated from here on gets the new engine
  automatically. Fixing `insertDemoLink` to detect and replace a prior
  link properly is a reasonable follow-up if a real need to republish an
  already-linked lead comes up, but wasn't built speculatively.

## LAST SUCCESSFUL TEST

**The complete HAUPTZIEL pipeline, real end-to-end, for the first time
in this project's history (2026-09-09):** lead Meisterschnitt → real
contact discovery (info@meisterschnittnbg.de) → real analysis → real
demo → real Cloudflare public URL (verified reachable) → approved
message with the real link → clicked "Gmail-Entwurf vorbereiten" →
preflight checklist 7/7 green → **a real Gmail draft was created via
the Gmail API** in hacibekircayir@gmail.com's account, ready for a human
to open, review, and send. Two real infra bugs found and fixed getting
here: Cloudflare's per-deployment hash URLs need fresh DNS propagation
on every single deploy (switched to the stable project-alias URL);
Gmail OAuth needed a Web-application-type client (not Desktop), the
Playground's redirect URI whitelisted, and the account added as an
OAuth test user. Also published Hotel Zum Riesen and Junker Immobilien
for real and updated their approved messages with the real links.

Also verified live this session: multi-page demo generation across 4-page
(law firm, restaurant, hotel with the "Zimmer & Angebote" label) and
3-page (luxury-minimal, correctly has no Leistungen page) cases.

**Motion pass verification (2026-09-09):** regenerated Ristorante Classico
Da Gigi's (expressive/subtle-motion profile) and Rechtsanwalt Bocionek
(motion:"none" profile) live via the dashboard, then inspected computed
styles directly in the browser (not just screenshots): confirmed the
nav underline `::after` scales to 1 under the active link, the button
shimmer's `::after` sweeps from `translateX(-130%)` to `+130%` on real
`:hover`, hero headline/tagline/CTA carry 0/70/140ms transition-delays,
service cards stagger the same way with images fully uncovered via
`clip-path`, and on the "none" profile every one of those (`::after`
content, position, transform) is inert — only the universal
`scale(0.97)` press-feedback transition survives, exactly as intended.
Checked on both desktop and a 375px mobile viewport.

## LAST COMMIT

`537df82` — Demo Engine: real motion (nav underline, button shimmer,
staggered/clip-path reveals). Pushed to `origin/main`, confirmed
`origin/main == HEAD`. Preceded by `41f70cd` (auto-insert demo link into
approved messages) and `d873bd0` from earlier in the session — all
pushed. **The user has since given standing authorization to push to
this repo without asking each time** (see the `feedback-github-push-no-ask`
memory) — keep committing and pushing at every stable milestone, no
per-push confirmation needed going forward.

## NEXT PRIORITY

**All P1 items are done**: Cloudflare, GitHub, and Gmail are all real,
configured, and proven working end-to-end, and approved messages now
pick up their real link automatically after publish. Demo Engine now
has genuine motion (P2, this session). Next priority is P3: the formal
variant registry with similarity detection, and/or continuing to
publish real links and QA more industries as new leads come in — see
NEXT ACTION.

## CONCURRENT SESSION NOTE

Another Claude Code session was active on this same working directory
(not an isolated worktree) earlier in this session — it committed
`81537be` and `89cf5b5` (the interactive Before/After slider). Always
check `git status`/`git log` for changes made outside this session
before assuming the tree matches what you last read, and stage files
explicitly (never a blanket `git add -A`) to avoid committing another
session's in-progress, unreviewed work. Not observed active in the most
recent part of this session, but assume it could resume.
