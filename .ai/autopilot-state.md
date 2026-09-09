# Autopilot State

Read this file, `CLAUDE.md`, `git log --oneline -20`, and `git status` at the
start of every new session on this project before doing anything else. Then
go straight to NEXT ACTION — don't wait for a new task description.

Last updated: 2026-09-09, very late in an extremely long single session
covering (in order): the CEO quality audit, Cloudflare rebuild, first
real Cloudflare publish, first GitHub push, the multi-page Demo Engine
rebuild, real Gmail OAuth end-to-end, auto-link insertion into approved
messages, a full Demo Engine motion pass (animated capsule nav + mobile
hamburger, button shimmer/press/hover-lift, staggered reveals,
per-regeneration color variation growing into a 20-color live picker),
chain/websiteless research filters, bulk-delete leads, a demo delete
button that also tears down the Cloudflare project, full-pipeline
restart on "Demo neu erstellen", the message-reformulate feature, 12
ConceptVariants with distinct GSAP/ScrollTrigger-based motion
structures, and then a formal "AUTOPILOT — DEMO CREATIVE LAB" mission
from the user (standing authorization for autonomous commit/push to
Webdemo27/webdemo, no confirmation needed for normal work, focus on
making the Demo Engine the strongest part of the product) under which
three more real features shipped: three genuinely different navigation
systems (capsule/floating-glass/fullscreen-overlay), a fix for a real
cross-lead variant-repetition bug, and kinetic per-word typography on
the hero headline. See git log for the full, detailed commit-by-commit
story — each commit message is deliberately thorough.

**"React Vite... WEB3GL" question — resolved, not pivoted.** The user
clarified later in the session that the specific tech doesn't matter
("egal ob web3gl oder next threejs... aber ALLES lebendig") — the actual
ask was for genuinely alive, GSAP/ScrollTrigger-level motion, not a
React/Vite rewrite. Built that within the existing static-HTML
architecture (CDN-loaded GSAP, same pattern as Three.js/use3d) rather
than the framework rewrite — correctly avoided a huge, unrequested
architecture change. **Do not revisit the React/Vite rewrite question
speculatively** — it was asked and answered.

**Standing push authorization is ACTIVE, not paused.** An earlier note
here said the user asked to hold pushes while they slept — they have
since woken up, explicitly asked for a commit+push (which succeeded),
and then issued the full "AUTOPILOT — DEMO CREATIVE LAB" mission with
explicit standing authorization for autonomous `git add`/`commit`/`push`
to Webdemo27/webdemo, no confirmation needed. That authorization is
current and in force — the note below is about a *technical* problem,
not a policy hold.

**KNOWN ISSUE, unresolved as of this update: `git push` is hanging.
Diagnosed, not just observed.** `git config --get credential.helper`
confirms `manager` (Git Credential Manager) on this HTTPS remote.
Eight-plus consecutive `git push origin main` calls this stretch each
ran past a 60-90s tool timeout with zero output (not even a partial
error) — this is GCM blocking on an interactive browser/device-flow
re-authentication prompt that nobody is at the keyboard to complete,
exactly the "externe Sicherheitsaktion... kann nicht von dir umgangen
werden" case the AUTOPILOT mission itself calls out. One push out of
all these attempts did eventually succeed after several minutes, so
this isn't a hard/permanent failure — GCM's cached token appears to
periodically allow a push through, just unpredictably.

Local commits are all safe and accumulating correctly (`git log` has
the full history); only the push to `origin/main` is stuck. **Do not
spawn a large number of concurrent `git push` background processes** —
check `git rev-parse origin/main HEAD` first, and if a push is already
in flight (local HEAD differs from origin and you just started one),
wait for its notification instead of stacking another. Do NOT attempt
to work around GCM (no embedding a token in the remote URL, no
`credential.helper` changes, no `--no-verify`-style bypass) — per
CLAUDE.md and the mission text alike, this specific class of external
auth prompt is for the user to resolve on their own machine (e.g. by
running one `git push` themselves interactively to complete GCM's
re-auth, which likely unsticks this for every session afterward too).
Standing push authorization ([[feedback-github-push-no-ask]] memory)
is still fully active — this is a technical blocker to mention plainly
when reporting status, not something to ask permission about.

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
- **Demo Engine, second major round this session** (all verified live
  with computed-style checks, not just screenshots):
  - Nav redesigned again per explicit feedback into a rounded
    capsule/segmented-control (pill track, active link lifted onto a
    solid pill, hover pills) plus a real animated mobile hamburger menu
    (morphs to X, dropdown fades/scales in with a per-link stagger).
  - Buttons gained a permanent glossy diagonal highlight + soft
    color-matched glow shadow at rest (not just on hover) — "nicht matt
    sondern bloom elegant."
  - Color picker grew from a fixed 5-swatch row into a proper 20-color
    full-spectrum picker (colorway.ts's `colorwayOptions()`): a compact
    circular trigger (today's color, glossy) expands a swatch-grid
    popover, crossfades the whole page's CSS custom properties live,
    persists via localStorage across the multi-page site. The tool's own
    automatic pick (`applyColorway()`) stays restricted to a conservative
    subset of those same 20 so it's always exactly one of the visible
    swatches — no unreachable 21st color.
  - Demos list page got a delete button that also tears down the
    Cloudflare Pages project (`CloudflarePagesPublisher.deleteProject()`,
    `wrangler pages project delete --yes`) — best-effort, never blocks
    local cleanup, lead itself untouched.
  - **12 ConceptVariants now** (was 8), each carrying a `motionStructure`
    — a real animation *system*, not a duration tweak: kinetic-stagger /
    editorial-fade / energetic-punch on the existing vanilla reveal, plus
    two new GSAP+ScrollTrigger-based ones (cinematic-parallax,
    scroll-scrub) loaded via CDN only for variants that use them, always
    purely additive on top of the vanilla system (never load-bearing for
    basic visibility — if GSAP fails, the page looks exactly like it
    would without it). Fixed a real bug caught during this work: the
    GSAP call site didn't check `profile.motion !== "none"`, so a
    serious/no-motion industry profile could still get GSAP parallax if
    it landed on a variant with no explicit motionOverride — now fixed
    to match how buildMotionCss already gates everything else.
- **AUTOPILOT — DEMO CREATIVE LAB mission, first three deliverables**
  (all verified live):
  - **Three genuinely different navigation systems**, replacing "one bar
    for every variant": `NavigationConcept` = "capsule" (existing pill
    track) / "floating-glass" (new — inset panel, heavier blur, tightens
    on scroll) / "fullscreen-overlay" (new — brand+trigger only; opening
    it reveals a full-viewport scene with large staggered typographic
    links and a preview image that crossfades to match the hovered link,
    using real asset images). Assigned per-variant to match character
    (restrained concepts get capsule, editorial ones get floating-glass,
    dramatic ones get fullscreen-overlay). Verified live: fullscreen
    overlay's open/close/Escape/scroll-lock/hover-preview-swap (confirmed
    via computed `src`, not just visually), floating-glass on desktop
    and mobile, and — importantly — the pre-existing 3D hero (Three.js)
    still composes correctly with the new capsule header on a real
    Immobilienmakler lead (Hildebrand Immobilien GmbH).
  - **Fixed a real, significant variant-repetition bug**: every
    brand-new lead with no X-ray-driven preference always got
    `unused[0]` = "Premium Editorial" — confirmed in real data (8 of the
    DB's demos sat on it vs. 1-2 each for others). Two causes fixed:
    `CATEGORY_PREFERRED_VARIANT` had collapsed 3 of 5 X-ray problem
    categories onto premium-editorial (remapped each to a semantically
    fitting variant instead); `pickNextVariant`'s "no preference"
    fallback now reads real cross-lead usage counts (`Demo.conceptVariant`
    grouped via Prisma — the "registry" the mission asked for already
    exists as the Demo table, no new schema needed) and picks whichever
    unused variant is genuinely rarest site-wide. Verified live: a fresh
    restaurant lead (KP21) landed on "Product-Focused", not the old
    universal default.
  - **Kinetic typography**: the hero headline now splits into per-word
    masked spans that slide up from below on reveal, staggered 45ms
    apart, instead of the whole line fading in as one block. Keys off
    the existing shared `.is-visible` class so it works with any reveal
    mechanism. Verified live on both an expressive profile (staggered
    delays confirmed via computed style) and a `motion: "none"` profile
    (renders as plain static text, zero visual difference).
  - **Magnetic CTA interaction moment** (mission section 11): the hero's
    primary button subtly attracts toward the cursor within a ~70px
    radius, springing back once the cursor leaves — rAF-throttled,
    hover+pointer:fine gated, respects reduced motion, reuses the
    button's existing transform transition. Verified live by dispatching
    a synthetic mousemove and reading back the resulting `translate()`.
  - **Shared-element page transition** on the brand mark
    (`view-transition-name: demo-brand-mark`) — extends the existing
    `@view-transition { navigation: auto; }` rule so the logo morphs
    across page navigation instead of a plain crossfade, in browsers
    that support the View Transitions API. Pure progressive enhancement.

## IN PROGRESS

Nothing mid-implementation. All work above is complete, type-checked,
linted, verified live (except the shared-element transition, which is a
small, low-risk CSS-only addition confirmed by build/lint only — not
independently observed mid-transition in the browser), and building
cleanly (`npm run build`).

**What's actually blocked is pushing to GitHub** — see the KNOWN ISSUE
note near the top of this file (a technical git-push hang, not a policy
hold — standing push authorization is active). This has now happened on
essentially every push attempt this stretch (5+ consecutive hangs, one
of which eventually succeeded after several minutes). If you're a fresh
session: there are likely several commits ahead of `origin/main` by the
time you read this — check `git rev-parse origin/main HEAD` and push
once; if it hangs, let it run in the background rather than stacking
more attempts, and keep building in the meantime.

## BLOCKED

Nothing. This is the first point in the project's history where every
external integration is real and verified.

## NEXT ACTION

Per the active "AUTOPILOT — DEMO CREATIVE LAB" mission (standing
authorization, keep working without waiting for prompts):

1. **Resolve/retry the git push hang** — see the KNOWN ISSUE note near
   the top. Check `git rev-parse origin/main HEAD` first; if a push is
   already in flight, wait rather than stacking another.
2. ~~Interaction moments~~ **Done**: magnetic CTA on the hero's primary
   button (mission section 11) — see COMPLETED. Could still add a
   second, more industry-specific interaction (e.g. an interactive
   before/after or image-cursor-preview) but the baseline requirement
   (at least one deliberate interaction) is now met for every demo with
   a real hero CTA.
3. **Per-industry WOW moments** (mission section 12) — not yet
   deliberately designed per industry (Restaurant: Atmosphäre/Menü;
   Immobilien: Visualisierung/Lage; Anwalt: Autorität/Case Story; etc.).
   Current demos have a strong generic quality bar but no single
   industry-tailored "moment" yet. Worth scoping as its own deliberate
   pass rather than bolting on ad-hoc per-industry special cases.
4. **Typography systems** (mission section 10) — kinetic word-reveal on
   the hero headline is done (see COMPLETED). Not yet done: masked
   scroll-driven typography elsewhere on the page (e.g. section
   headings), oversized/condensed display type as its own art-direction
   lever distinct from the existing heading/body font pairs.
5. Per the mission's ≥30-named-creative-directions ambition: now at 12
   ConceptVariants × 3 NavigationConcepts × 6 MotionStructures — real,
   substantial progress on genuine structural variety, not just palette
   swaps. Not literally 30 named directions yet.
6. The `.agents/skills/` emilkowalski animation pack (animate,
   animation-vocabulary, emil-design-eng, improve-animations,
   review-animations, find-animation-opportunities, etc.) has now been
   applied across three full motion/creative passes — reach for it again
   for any further motion/polish work rather than inventing patterns
   from scratch.
7. **Publish real links for more approved leads** — Meisterschnitt, Hotel
   Zum Riesen, and Junker Immobilien have real public URLs; any
   newly-approved lead still needs someone to click "Öffentlich
   bereitstellen" — this doesn't happen automatically, and the resulting
   link is auto-inserted into the approved message afterward (see
   `insertDemoLink`). Do NOT retroactively regenerate/republish those
   three specific leads' demos — see the KNOWN LIMITATION on
   `insertDemoLink` further down (it can't replace an existing link, only
   fill a missing one) and Meisterschnitt's real, unsent Gmail draft
   built around its current link.
8. ~~QA gap~~ **Closed (2026-09-09, same session)**: researched a fresh
   real Rechtsanwalt lead (Kassel, "Wille Rechtsanwälte") specifically to
   verify the `ca41d9c` GSAP-gating fix live, since no `motion: "none"`
   lead existed in the DB at the time it was written. Regenerated until
   it landed on "Immersive Visual" (`cinematic-parallax`) — confirmed
   both via `grep -c gsap` on the generated HTML (0 occurrences) and live
   in the browser (`typeof gsap === 'undefined'`) that GSAP correctly
   does not load, while the capsule nav (solid white active pill
   confirmed via computed `backgroundColor`), glossy buttons, and color
   picker — all correctly judged "baseline visual quality," not "heavy
   motion" — still render normally. The fix is solid, not just
   reasoned-about.

## KNOWN BUGS

- Two pre-existing test leads ("Dr. Ortwin Schuchardt", "Haarstudio
  Bahar") are permanently stuck in `DEMO_CREATED` with a stale pre-fix
  error. Local dev data only, safe to ignore or delete.

## KNOWN RISK — pages.dev links can get silently blocked by recipients

**Real, observed incident (2026-09-09):** a real outreach email (Basic
Coffee, sent for real via a prepared Gmail draft) bounced. Google's own
bounce text: `Die Antwort vom Remoteserver ist: 550 5.7.1 Recipients
have complained about included content (B-URL)` — a rejection from the
*recipient's* mail security gateway (not Gmail's outbound side),
`(B-URL)` being that gateway's own tag for "message contains a
blocklisted URL." The link was a `*.pages.dev` address — Cloudflare's
shared free-tier domain used by millions of Pages projects. Because it's
shared, abuse by unrelated Cloudflare Pages users elsewhere can get the
whole `pages.dev` suffix wholesale-blocklisted by corporate mail-security
gateways (Barracuda/Proofpoint/Mimecast-style products commonly do
exactly this), completely independent of this project's own content.
Every published demo currently uses this same shared domain, so this
risk applies to any future recipient whose mail provider has made the
same call — not just this one lead.

**The real fix**: a custom domain on the Cloudflare Pages projects
(e.g. `demos.<user's domain>`) instead of `*.pages.dev` — then the
domain's reputation is exclusively the user's own. Asked the user
directly (2026-09-09); they don't have a domain yet, so this is
unresolved for now, not silently worked around. When they get one:
Cloudflare Pages → the project → Custom domains → add it, point a CNAME
at `<project>.pages.dev` per Cloudflare's own instructions, done per
project (or one wildcard/apex setup reused if Cloudflare's plan
supports it — check at the time). A cheap domain (~€10-15/year from any
registrar) is enough; it doesn't need to be on Cloudflare's own
registrar. Until then, treat any bounce mentioning a blocked/flagged URL
as this same root cause, not a one-off — don't spend time debugging the
specific email's content.

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

`ca41d9c` — Fix: GSAP motion structures ignored the profile.motion=none
business flag. **NOT pushed** — local HEAD is several commits ahead of
`origin/main` (last pushed: `1b038a4`, the 20-color picker). See the
PENDING note near the top of this file for why (user asked to hold
pushes until they're back awake) and the standing
`feedback-github-push-no-ask` authorization that still applies once they
are. Run `git log origin/main..HEAD --oneline` to see exactly what's
waiting.

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
