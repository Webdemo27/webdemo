# Autopilot State

Read this file, `CLAUDE.md`, `git log --oneline -20`, and `git status` at the
start of every new session on this project before doing anything else. Then
go straight to NEXT ACTION — don't wait for a new task description.

**CRITICAL FIX (2026-09-09, same session as the shared-Cloudflare-project
migration): the shared-project fix itself was broken until this fix.**
After moving every lead to one shared Cloudflare Pages project
(`webdemo-demos`) to escape the 21-project account cap, publishing a
NEW lead (Joachim Langner, Zahnarzt) still failed with the exact same
`8000027` "reached the limit of projects" error — a real, live
regression caught because the user was independently testing the
dashboard and sent a screenshot. Root cause: `wrangler pages project
create <name>` returns that error unconditionally whenever the account
is AT its project cap, regardless of whether `<name>` already exists —
it checks the account-wide count before checking for a name collision.
Freeing exactly one slot to create `webdemo-demos` put the account
right back at the same cap (20 old projects + 1 new one = 21 again), so
the old "always call create, tolerate 'already exists' in the error
text" pattern hard-failed on every single subsequent publish — the
"already exists" branch was never reached. **Fixed properly**: added
`projectExists()` in `cloudflare-publisher.ts` (`wrangler pages project
list --json`, checked before ever calling `create`) so `create` is only
invoked on the one genuine first-time case, never redundantly. Verified
live: republished Joachim Langner successfully to
`https://webdemo-demos.pages.dev/joachim-langner/` right after the fix.
**Lesson for future sessions**: after this fix, do not assume the
Cloudflare project-limit problem is permanently behind us just because
`webdemo-demos` exists — if a *different* wrangler command starts
failing with 8000027 again, check whether it's unconditionally calling
`project create` the same way, rather than re-diagnosing from scratch.

**GIT PUSH HANG — PERMANENTLY FIXED (2026-09-09, same session), not
just worked around.** The recurring `git push` hang documented at length
below (GCM blocking on an interactive browser account-picker with nobody
at the keyboard) is now solved at the root: switched this repo's remote
from HTTPS to SSH. Generated a dedicated ed25519 key
(`~/.ssh/id_ed25519_webdemo27`, `~/.ssh/config` pins it to `github.com`),
the user added the public key to the **Webdemo27** GitHub account, `ssh
-T git@github.com` confirmed authentication as Webdemo27, and
`git remote set-url origin git@github.com:Webdemo27/webdemo.git` was
applied. Verified live: `git push origin main` completed in under 2
seconds with zero prompts, after this had been the single biggest
recurring friction point in the session. **Every
push from here on should be instant and silent** — if the GCM-style hang
or an account-picker dialog ever reappears, something has regressed
(e.g. the remote got reset to HTTPS, or the SSH key was removed from the
GitHub account) — re-diagnose from there rather than assuming this is
"just GCM being unpredictable" again. The rest of this section (below)
is kept as historical record of the diagnosis, not current guidance.

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

**"React Vite... WEB3GL" question — superseded by a real, deliberate
architecture migration. Do not treat this as still just a "static HTML
engine" project.** Earlier in the session the user clarified the specific
tech didn't matter, just that motion should feel genuinely alive — built
that within the existing static-HTML architecture (CDN-loaded GSAP).
**Later, in a fresh continuation of this same session, the user
explicitly asked again for a real Vite+React+WebGL rewrite**, was shown
the tradeoffs (breaks the "static HTML, no framework" rule in CLAUDE.md,
large migration) via AskUserQuestion, and chose the full rewrite anyway.
See `demo-app/` (a new, separate Vite+React+Three.js/R3F+GSAP project)
and the "Vite/React/WebGL demo engine" entries in COMPLETED below for
what's built so far. **The two engines now coexist deliberately**: the
static-HTML engine (`src/lib/demo-generator/template.ts`) is still what
every "Demo erstellen"/"Demo neu erstellen" button in the dashboard
produces and what gets published to Cloudflare; `demo-app/` is a real,
growing parallel engine, fed by `exportLeadDataForReactApp()`, not yet
wired into the dashboard's own buttons or the Cloudflare publish step.
Continuing to build out `demo-app/` (more sections, more ConceptVariants
ported over, dashboard/publish integration) is real, current, standing
work — not a settled-and-closed question.

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

## UPDATE (2026-09-09, same session): Cloudflare Pages architecture changed — shared project, not one-per-lead

**Real production incident, not a hypothetical:** the user hit
`wrangler` error `8000027` ("You have reached the limit of projects you
can have on your account") live in the dashboard while publishing a
lead. The account was capped at **21** projects, not the documented
free-tier 100 — likely a newer-account restriction — because the
original design (`CloudflarePagesPublisher`) created one brand-new
Cloudflare Pages project per lead via `wrangler pages project create`.

**Fix shipped:** every lead now deploys into ONE shared project
(`webdemo-demos`, overridable via `CLOUDFLARE_PAGES_PROJECT` in `.env`)
at its own path — `https://webdemo-demos.pages.dev/<slug>/` instead of
`https://<slug>.pages.dev`. This works with zero changes to the demo
HTML itself because every asset/nav reference in generated demos was
already relative (`assets/foo.jpg`, `index.html`, confirmed in
`asset-pipeline.ts`/`template.ts`) — demo output was always portable.

- `src/lib/publishing/cloudflare-publisher.ts`: `sharedProjectName()`
  replaces per-lead `toProjectName(slug)` for the CF project name;
  `STAGING_ROOT` (`.cloudflare-deploy/`, git-ignored) holds one
  subfolder per *published* lead — `mirrorIntoStaging()` does a full
  rm+cp on each publish so a regeneration's changed asset filenames
  never leave stale orphans; the whole `STAGING_ROOT` (not just the one
  lead's directory) is what actually gets deployed each time, since a
  Pages deployment is always a full-tree replace. `ensureStagingRoot()`
  writes a small "not public" placeholder at the root so `/` never 404s
  and the deploy dir is never empty (deploying an empty dir would fail).
  `deleteProject(slug)` (called from `delete-demo.ts`) no longer tears
  down a whole CF project — it removes just that lead's subfolder from
  staging and redeploys, since deleting the *project* would take every
  other published lead offline with it.
- Bonus: this also mitigates the earlier-logged KNOWN RISK below
  (`*.pages.dev` getting blocklisted by a recipient's mail gateway) —
  with one shared project, only ONE eventual custom domain protects
  every demo's reputation instead of needing one per lead.
- **Real bug found and fixed while live-testing this**: the very first
  test crashed `logActivity()` with a Prisma/SQLite error ("unexpected
  end of hex escape") — traced to `runWrangler`'s ANSI-strip regex only
  handling SGR color codes (`ESC[...m`), not the emoji (✘, ⛅️, ✨) newer
  `wrangler` versions print liberally in terminal output; a non-ASCII
  character landing exactly on the `.slice(0, 500)` truncation boundary
  produced a lone UTF-16 surrogate that broke Prisma's JSON-based engine
  transport on write. Fixed at the source (`stripAnsi` in
  cloudflare-publisher.ts now strips OSC hyperlink escapes, general CSI
  sequences, and any non-ASCII/non-printable byte from wrangler's output
  — it's pure diagnostic CLI text, never business data, so nothing of
  value is lost) AND defensively at the `logActivity()` boundary itself
  (`src/lib/db/activity.ts` now strips stray control characters from
  every `message` before insert — a general hardening, not just a
  one-off patch, since any future caller could hand it raw external
  text again).
- **Real bootstrap problem found and resolved live, with the user's
  explicit sign-off**: even creating the first-ever shared project
  failed with the same 8000027 error, because the account was ALREADY
  at its 21-project cap from the old one-project-per-lead design.
  Investigated via `wrangler pages project list` + a DB cross-check:
  9 of the 21 existing projects were fully orphaned (no Lead/Demo record
  in the current `dev.db` references them at all — the local DB was
  apparently reset at some point while these Cloudflare projects
  persisted independently). Of those 9, three (`meisterschnitt`,
  `hotel-zum-riesen`, `junker-immobilien`) were flagged and deliberately
  **left alone** since they may still have a real, unsent Gmail draft
  referencing their link (per this file's own prior history) even
  though no local DB row proves it either way anymore. Asked the user
  directly which orphan to sacrifice rather than deciding unilaterally
  on a live external account; they approved deleting
  `rechtsanwalt-bocionek` (a pure in-session QA test fixture, confirmed
  orphaned). Freed the slot, `webdemo-demos` created successfully.
- **Verified live end-to-end**: published lead "KP21" — real project
  creation, real deploy, real HTTPS+content-match verification, all the
  way to `https://webdemo-demos.pages.dev/kp21/` rendering correctly
  (confirmed both `.../kp21/ueber-uns.html` and the bare `.../kp21/`
  directory-index form), and the bare `https://webdemo-demos.pages.dev/`
  root showing the "not public" placeholder instead of a raw 404.
- **Not independently live-tested**: the `deleteProject()` teardown path
  (remove one lead's subfolder + redeploy) — its logic reuses the exact
  same proven `wrangler pages deploy STAGING_ROOT` call, just preceded
  by an `fs.rm`, so it's covered by type-check + lint but wasn't
  exercised against a real lead (doing so would have required actually
  deleting KP21's demo record just to test infra, which wasn't worth the
  risk). Worth a real test the next time a demo is deleted through the
  normal dashboard flow.
- **Pre-existing leads with the OLD `https://<slug>.pages.dev` URL
  format are untouched** — e.g. `cafe-aroma`, `basic-coffee`, and the
  other 9 currently-DB-tracked published leads from the wrangler list
  keep working exactly as before; they were not migrated/republished
  under the new shared path. Only future publishes (and any future
  republish) use the new shared-project URL shape.
- **Separately noticed, not yet fixed**: `cafe-aroma`'s stored
  `Demo.publicUrl` (`https://cafe-aroma.pages.dev`) doesn't match its
  actual live Cloudflare domain (`https://cafe-aroma-ezb.pages.dev` —
  Cloudflare appended a suffix because the bare name was already taken
  by an unrelated Cloudflare account elsewhere, since `*.pages.dev` is a
  globally shared namespace). This predates today's changes and is
  irrelevant going forward (the shared-project design no longer creates
  a new `<slug>.pages.dev` domain per lead at all), but if `cafe-aroma`'s
  message was ever sent with that stored link, the link is dead. Not
  investigated further — flagging for awareness only.

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

- **Three more showcase techniques (2026-09-10)**: atmosphere gradient
  (United Carriers — the playbook's own #1-ranked "highest-value,
  lowest-effort" technique, added to `gsapMotionScript`'s scroll-scrub
  branch, no new plumbing), `scriptAside()`/`scriptAsideFontLink()`
  (Serenity Hair — cursive aside above the headline), `gooeyHeroSection()`
  (Podium — metaball blob hero via the classic SVG goo filter, real
  photo in a circular cutout). 5 showcases total now in
  `scripts/generate-showcase.ts`. Bug caught+fixed during verification:
  the gooey photo was originally inside the filtered blob container so
  the goo filter blurred the photo too — moved to a sibling
  `.gooey-stage` wrapper. Verified live (all 5, fresh checks): correct
  rendering, 60fps atmosphere scrub confirmed via direct ScrollTrigger
  progress inspection, zero console errors.
  **Still queued from the playbook**: Gionatan Nese's scattered-gallery
  principle (distinct enough from Filmbot's collage to be worth its own
  showcase — a loosely-scattered, non-grid photo layout), 363 Car &
  Social Club's neon-accent bottom-bar nav (deprioritized this round —
  unlike the others, it needs a genuinely new NavigationConcept, not
  just a spliced body section, so it's a bigger structural change).
  Podium's percentage preloader and Zero University's "draw a zero"
  gate are explicitly logged as **not to build** (playbook's own
  cross-cutting takeaway #4: no gratuitous blocking/friction for
  ordinary local-business demos).
- **Neutral showcase demos for playbook techniques + reusable generator**
  (2026-09-09) — explicit user request: "generiere die webseiten die du
  playbook erstellt hast von awwwwards als demos". Asked via
  AskUserQuestion whether to apply techniques to real leads or build
  neutral standalone showcases; user chose **neutral showcases**
  (placeholder company "Musterfirma", not a real lead — an internal
  technique catalog independent of the real lead pipeline). Built three
  more real section functions in template.ts: `typographyHeroSection()`
  (Rezo Zero — zero imagery, confident statement), `scallopedHeroSection()`
  (Filmbot — pill-shaped image-mask columns, film-strip motif),
  `marqueeSection()` (Qissa — scrolling keyword ticker, real service
  labels only). `scripts/generate-showcase.ts` is a **reusable** (not
  disposable) generator — real `renderDemoSite()` pipeline + neutral
  profile + abstract-SVG placeholder assets (same no-invented-photo
  fallback the real pipeline already uses, zero OpenRouter cost) — rerun
  it any time to add more as more playbook techniques get built. Output
  under `public/demos/_showcase/` (git-ignored like all demo output).
  **Bug caught and fixed during verification**: the typography hero's
  CTA link inherited the real hero's white/photo-scrim text color,
  illegible on its own light background — fixed with scoped
  `.typo-hero .cta-link`/`.btn-ghost` overrides. Verified live (fresh
  tab, clean console) on both showcases.
  **Still queued from the playbook** (not yet built as showcases):
  Podium, Gionatan Nese, United Carriers' neon accent nav bar, Zero
  University's "draw a zero" gesture, ARIO's scattered-letters-assemble
  hero, Serenity Hair, 363 Car & Social Club's neon bar, and the two
  GSAP-research items already logged (pin-marker/floor-label reveal —
  data-gated; the project reel and numbered list are already shipped as
  real gated/live features, not showcase-only). Continue adding to
  `generate-showcase.ts` in future iterations rather than re-researching.
- **Numbered stacked feature list for professionalProfile leads**
  (2026-09-09) — one of the two directly-shippable techniques logged in
  the GSAP/Awwwards research (The Nest, thenest.pl) now actually built:
  `numberedFeatureList()` in template.ts, gated on the exact
  `brandImpression` string `professionalProfile()` gives Rechtsanwalt/
  Steuerberater ("seriös, autoritär, vertrauenswürdig"). No cards, no
  icons — em-dash numbered eyebrow + heading + divider line, real
  service labels only (deliberately omits the per-item description/link
  The Nest's real version has, since this project has no real per-service
  paragraph or destination to show honestly). Every other industry's
  card-grid `servicesSection` is untouched. Verified live on a real lead
  (Wille Rechtsanwälte): renders correctly, zero console errors.
  **Still open from that research**: the pin-marker/floor-label reveal
  technique — blocked by needing real per-floor/per-room data a lead
  would have to supply, not buildable honestly without it.
- **Angled/tilted GSAP carousel prototype for Tobias Grünert** (2026-09-09)
  — explicit user request, scoped to ONE lead only, gated behind review:
  "wenn ich damit zufrieden bin werden bei immobilienmakler branche diese
  motiv benutzt". Built `angledCarouselSection()`/`angledCarouselScript()`
  in `template.ts` (pin + scrub via GSAP ScrollTrigger, one card per real
  editorial asset, tilt via `--tilt` CSS var, caption below each image,
  straightens on hover using emil-design-eng's easing tokens —
  `var(--ease-out)` / 260ms, not a bare `all` transition). Rendered as a
  **standalone preview file** (`public/demos/tobias-gruenert/karussell-
  preview.html`, via disposable `scripts/generate-carousel-preview.ts`
  which pulls his real DB assets/captions) rather than touching his real
  `ueber-uns.html` — his lead stays untouched in WAITING_FOR_REVIEW.
  **Verified live**: ScrollTrigger pin/scrub confirmed correct (progress
  tracks scroll 1:1, `position:fixed` + `pin-spacer` present), frame
  timing sampled during an actual scroll drive averaged 16.67ms/frame
  (60fps, max 16.9ms), hover-straighten confirmed visually. **NOT** wired
  into the live Immobilienmakler ConceptVariant/SectionKey system — only
  ships broadly once the user confirms satisfaction with this preview.
- **Demo-app: editorial gallery + lightbox ported** (2026-09-09, same
  loop) — `EditorialGallery.tsx`, a React-native (state-driven, not
  vanilla-DOM) port of the static engine's lightbox WOW moment.
  Extracted `buildEditorialRows()`/exported `galleryLabelFor()` from
  template.ts so both engines share the exact real caption logic, not
  duplicated copies. Verified live on KP21's /ueber-uns: real photos,
  correct captions, keyboard/pointer nav, focus restored on close, zero
  console errors.
- **Demo-app: WebGL hero rendering fixed — abstract-SVG texture + text
  scrim** (2026-09-09, same loop) — the known "abstract-SVG heroes
  render as a broken/black WebGL texture" bug is fixed at the root
  (`generateAbstractSvg()` now sets width/height attributes, not just
  viewBox — required for `THREE.TextureLoader` loading it standalone via
  `new Image()`, unlike the static engine's plain `<img>` usage which
  never needed this). Also ported the static engine's `.hero-scrim` dark
  gradient into demo-app, which never had one — white hero text was
  illegible over light images/gradients. **Debugging note for future
  sessions**: verifying this hit a false alarm from WebGL context
  exhaustion (too many accumulated browser tabs across a long testing
  session → "Context Lost", producing a misleading blank render) and a
  red herring from `gl.readPixels()` (unreliable with
  `preserveDrawingBuffer: false` — the buffer clears before a separate
  readback call runs). If a canvas looks wrong mid-session, close stale
  tabs and re-test with a fresh navigation before assuming a code bug;
  trust screenshots over `readPixels` for this canvas config.
- **Demo-app: real location map + live weather ported** (2026-09-09,
  same loop) — `LocationSection.tsx` brings the static engine's real
  OSM map embed and the live Open-Meteo weather badge into the React
  engine (Home route, below hero), added `latitude`/`longitude` to the
  exported LeadData. Verified live on the same real Mainz lead — real
  weather, real map with marker at the actual coordinates.
- **Awwwards: Autowerkstatt done (research thread complete), 4th shipped
  feature — real live weather badge** (2026-09-09, same loop) — 363 Car
  & Social Club logged in `.ai/design-inspiration-playbook.md`: a real
  live weather reading for the business's own city, done via Open-Meteo
  (free, keyless, CORS-open, verified with a real cross-origin fetch).
  Shipped immediately — reuses `Lead.latitude`/`longitude` already
  captured for the location map, no new data source needed.
  `weatherBadge()`/`weatherWidgetScript()` in template.ts, `hidden` by
  default, only reveals on real successful data (never a broken/
  placeholder state on failure). Verified live on a real Immobilienmakler
  lead in Mainz — real current temperature/condition rendered correctly.
  Completes the initial 5-industry Awwwards research pass (Restaurant,
  Real Estate, Anwalt, Friseur, Autowerkstatt) — more industries (Café,
  Bäckerei, Zahnarzt, Fahrradladen) are a good target for a future
  session, continuing the same playbook file.
- **Awwwards: Friseur done, 3rd shipped feature** (2026-09-09, same
  loop) — Serenity Hair logged in `.ai/design-inspiration-playbook.md`
  (colored quick-link tiles, a handwritten-script hero aside, a
  circle-cropped portrait — the latter a natural fit for a future
  "Friseur: Transformation" WOW moment if real before/after photos ever
  exist). Shipped the quick-link tiles: `quickLinksSection()` in
  template.ts, gated to warm/approachable industries only
  (`layoutDirection === "editorial-asymmetric"`), real destinations
  only. Verified live on KP21 — real navigation, zero console errors.
  Known minor limitation: tile tint variety depends on how distinct a
  lead's own primary/secondary/accent hues are (some industries, e.g.
  Restaurant's default palette, have secondary===accent).
- **Demo-app: dashboard export button** (2026-09-09, same loop) —
  closed the "only reachable via CLI script" gap from earlier: a real
  "Vite/React/WebGL-Vorschau" button on the lead detail page
  (`ExportReactDemoButton` → `exportReactDemo()` server action →
  `exportLeadDataForReactApp()`), linking straight to
  `localhost:5173/<slug>` on success. Verified live on KP21 — real
  export ran (confirmed via file mtime), correct link, zero console
  errors. `npm run export:react-demo` still works too, now just an
  alternative, not the only path.
- **Awwwards research: Anwalt/law firm done, 2 features shipped from it**
  (2026-09-09, same loop) — ario.law logged in
  `.ai/design-inspiration-playbook.md` (scattered-letters-assemble-on-
  click hero, real named-partner video intro as the honest target for
  the mission's "Anwalt: Autorität" WOW moment, real-number stat cards
  blocked by data availability — not invented). Shipped the one
  directly-buildable technique: a scroll-scrubbed two-tone reveal on the
  brand-promise pull-quote (`promiseWords()` + a new scroll-scrub effect
  in `gsapMotionScript`), wired only into the existing `scroll-scrub`
  motionStructure so every other variant is unaffected. Verified live on
  Joachim Langner (Architectural Grid) — genuine scroll-scrub, reverses
  correctly when scrolling back up.
- **Demo-app: real multi-page routing shipped** (2026-09-09, same loop) —
  replaced the single long page with real routes matching the static
  engine's index/leistungen/ueber-uns/kontakt split (`routes/Layout.tsx`
  + per-page components, React Router `<Outlet context>`), NavLink
  active-state styling. Also closed a gap this same routing change
  exposed: ported the brand-promise pull-quote to the React About page
  too (added `brandPromise` to the exported LeadData JSON, reusing
  `buildBrandPromise()` — no logic duplicated between engines). Verified
  live across all four routes for KP21, zero console errors, clean
  build.
- **Autonomous /loop mission started (2026-09-09)**: user asked for ~3
  days of self-paced autonomous work (playbooks, gallery images/videos
  with a "Demo" watermark, Awwwards per-industry research). Shipped so
  far this loop: a `stampDemoWatermark()` step on every AI-generated
  image (real photos untouched); video generation researched (OpenRouter
  has a real API, ~$0.50/video-second for Veo 3.1, async — deliberately
  not built yet, needs its own scoped pass, see NEXT ACTION); Awwwards
  research for Restaurant (Qissa) and Real Estate (The Nest) logged in
  `.ai/design-inspiration-playbook.md`; and the first shipped result
  from that research — a brand-promise pull-quote in the About section
  (`buildBrandPromise()`, built only from the existing curated
  `profile.brandImpression`, never an invented claim). If you're a fresh
  session picking this up: check whether the loop is still active
  (ScheduleWakeup firing every ~20-25min) before assuming it stopped.
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
  - **Kinetic typography extended to every section heading**, not just
    the hero — Leistungen/Über uns/Kontakt headings all reveal as masked
    per-word spans too, via the same `kineticWords()` used for the hero.
  - **Real embedded location map — a genuine "Lage" WOW moment** (mission
    section 12, called out specifically for real estate). The exact
    business's own coordinates were sitting unused in Overpass's response
    the whole time (`out center tags` already returns a node's lat/lon or
    a way's centroid) — captured them instead of discarding them.
    `Lead.latitude`/`longitude` (new migration
    `add_lead_coordinates`) thread through
    `LeadCandidate -> LeadInput -> DemoData` into a real, live, pannable
    OpenStreetMap embed (no API key, no invented address, no stock
    image) with a marker at the real coordinates — not gated to real
    estate, renders for any lead with coordinates whose variant includes
    a location section. Falls back to the pre-existing text-only banner
    when coordinates are unavailable (leads researched before this
    migration). **Ran a real Prisma migration** — hit and fixed a real
    Windows file-lock (`EPERM`) on the query-engine DLL because the dev
    server had it open; stopped the server, `npx prisma generate`,
    restarted. Verified end-to-end live: a fresh 5-lead real-estate
    research batch (Mainz) captured distinct real coordinates matching
    real addresses; a generated demo's map embed URL contained the exact
    right coordinates and rendered as a genuine interactive map, not a
    placeholder.

- **Editorial gallery WOW/interaction moment** (mission sections 11 + 12,
  before the Cloudflare fire drill above): every editorial photo now
  opens full-screen in a real lightbox on click, with its own real
  caption (the same copy already printed inline — nothing invented),
  keyboard (arrows/Escape) and pointer navigation between every
  editorial image on that page, and focus correctly restored to the
  trigger on close. The gallery gets an industry-honest name instead of
  one generic label for every business — "Atmosphäre" for hospitality
  (Restaurant/Café/Bäckerei/Hotel), "Galerie" for elegant trades
  (Friseur/Blumenladen), "Werkstatt-Einblicke" for automotive
  (Fahrradladen/Autowerkstatt), "Einblicke" default elsewhere (see
  `galleryLabelFor` in template.ts). Purely additive: the lightbox
  script only gets injected into a page's HTML when that page's body
  actually contains a trigger. Verified live on lead "KP21" (Luxury
  Minimal variant): eyebrow label renders, click opens the lightbox with
  the correct caption, next-arrow advances to the second image and
  caption, Escape closes AND restores focus to the original trigger
  (confirmed via visible focus ring), zero console errors, confirmed
  again working correctly on the real published Cloudflare URL.

## IN PROGRESS

**The Vite/React/WebGL demo-app migration** (see `demo-app/`) — real,
standing, multi-phase work, not close to done. Shipped so far: hero
(WebGL/R3F photo texture + shader displacement), nav, services (GSAP
reveal), about, contact, all fed by real per-lead data via
`exportLeadDataForReactApp()`. Verified across 3 industries (Restaurant,
Café, Zahnarzt). **Not yet done**: the other 11 ConceptVariants' layouts,
the 3 NavigationConcepts, the 6 MotionStructures, the editorial/lightbox
gallery, the location map, multi-page routing (currently one single
page per lead, not the static engine's real index/leistungen/ueber-uns/
kontakt split) — and, critically, **no dashboard button or Cloudflare
publish integration yet**: exporting to demo-app is only reachable via
`npm run export:react-demo -- <slug>` on the command line. The static
HTML engine remains what "Demo erstellen"/"Öffentlich bereitstellen"
actually do in the dashboard today.

Everything else in this file is complete, type-checked, linted, and
verified live.

## BLOCKED

Nothing. Every external integration (Cloudflare, Gmail, OpenRouter, git
push via SSH) is real, configured, and verified working end-to-end.

## NEXT ACTION

**Two explicit user requests currently take priority over the standing
mission below, in this order:**

0a. **Water-flow hero effect + text-animation coverage — DONE (2026-09-09).**
    User: "wir wollen nicht standard webseiten bauen wo alles langweilig
    wirkt, sondern auch mit mausbewegung schwebende wasserflow
    (extremflüssig) einbauen, es muss wirklich alles animiert werden
    sogar die texte". Shipped in two passes:
    (1) `fluidFlowLayer()`/`fluidFlowScript()` — turbulence-distorted,
    blurred color blobs behind the hero, damped/spring-like toward the
    cursor (not 1:1 tracking, per emil-design-eng), velocity spikes the
    SVG feDisplacementMap scale for real liquid reactivity;
    `.hero-content--floating` gives the real headline/tagline/CTA their
    own smaller independent float — text responds to the cursor without
    ever being distorted (kept legible). Applied to every demo's hero
    automatically (`profile.motion !== "none"`), not gated like the
    carousel. Verified: 60fps during simulated continuous mouse movement,
    disabled correctly on mobile/coarse pointer/reduced-motion.
    (2) Loaded `ui-ux-pro-max` (its GSAP domain, live CLI query) alongside
    `emil-design-eng` as the user explicitly asked, and used its own
    guidance to scope the rest: "reserve [split-text reveal] for short
    headlines under ~8 words" + "animate 1-2 key elements per view max".
    Extended the existing `kineticWords()` per-word masked-reveal (already
    on the hero h1/section h2s) to editorial gallery h3s, the location
    banner's city name, and the angled-carousel captions — all short real
    headlines. Deliberately did NOT split-animate body paragraphs (they
    keep their existing single fade-in) since that would violate the
    same loaded guidance. Verified live: kinetic spans render and become
    fully legible after reveal, zero console errors, on real pages.
    **This closes 0a** — both explicit asks (water-flow + "sogar die
    Texte") now have real, verified, skill-informed implementations.
0b. **Awwwards GSAP/animation-flow research + 1:1 replication — DONE
    (2026-09-09).** User: "bei awwwards beste animation flows webseiten,
    gsap webseiten recherchieren und manche demos sollen von awwwards
    replicat werden 1:1". Fetched the real
    `awwwards.com/websites/gsap/` tag page (20 real sites, not a guessed
    URL) and visited three live: **dsgn Interior** (dsgninterior.se —
    strongest candidate: a pinned hero that crossfades through a real
    project sequence on scroll), **The Nest** (thenest.pl — revisited
    specifically for motion this time: numbered stacked feature list,
    staggered pin-marker label reveal), **ALTITUDE 101** (altitude101.com
    — abstract VR/WebGL product, logged as inspiration-only for
    `demo-app`'s WebGLHero, no real-lead transfer). Findings logged in
    `.ai/design-inspiration-playbook.md`'s new "GSAP / Awwwards animation
    flows" section. **Built the 1:1 replica**: `projectReelSection()`/
    `projectReelScript()` in template.ts — genuine pin+scrub crossfade
    through a lead's own real editorial photos/captions (not invented),
    falls back to a plain stacked list if GSAP fails. Verified live on a
    real lead (standalone preview, same pattern as the angled carousel):
    active layer advances 0→1→2 correctly in sync with scroll, 60fps
    during a simulated scroll, fallback renders correctly, zero console
    errors. **Not yet wired into the live ConceptVariant/SectionKey
    system** — same "prototype → verify → let it be reviewed before wide
    rollout" discipline as the carousel. Of the two other researched
    techniques: the numbered feature list is now built and shipped live
    (see COMPLETED) since it needed no gating (it's a real, direct
    services[] rendering, not a new unreviewed motion prototype); the
    pin-marker/floor-label reveal remains data-gated (needs real
    per-floor facts a lead would have to supply).
0c. **Loop cadence changed 2026-09-09**: user asked for 10-minute
    check-ins instead of the previous ~25-minute self-paced cadence —
    use `delaySeconds` around 600 (not 1500-1800) for ScheduleWakeup
    going forward in this mission.
0d. **Showcase-demo generation — IN PROGRESS, 5 of ~7 techniques built
    (2026-09-10).** User: "generiere die webseiten die du playbook
    erstellt hast von awwwwards als demos" → resolved via AskUserQuestion
    to neutral showcases (see COMPLETED for the full list built so far).
    **Next up**: Gionatan Nese's scattered-gallery principle (a
    non-grid, loosely-scattered photo layout — distinct enough from
    Filmbot's collage to warrant its own showcase) and 363 Car & Social
    Club's neon-accent bottom-bar nav (needs a genuinely new
    NavigationConcept + header changes, not just a spliced body
    section — bigger structural change, budget more time for it). Once
    those two are done, the playbook's buildable-as-showcase techniques
    are exhausted (the rest are either already-shipped real features,
    data-gated, or explicitly flagged as anti-patterns not to build —
    see COMPLETED for the full breakdown) — return to the older
    standing-mission priorities below.

Per the active "AUTOPILOT — DEMO CREATIVE LAB" mission (standing
authorization, keep working without waiting for prompts):

1. **Video generation for hero backgrounds (per-industry, e.g. Hotel/
   Restaurant/Immobilienmakler)** — researched 2026-09-09: OpenRouter has
   a real video API (`POST /api/v1/videos`, async job + polling, models
   include Veo 3.1, Seedance, Sora 2 Pro). Real cost consideration before
   building this: Veo 3.1 is ~$0.50/video-second, so a 5s clip is ≈$2.50
   — an order of magnitude more than a $0.006 image, and each demo could
   want its own video. Worth a deliberate, scoped build (async polling
   infra is architecturally different from the synchronous image
   providers already built) rather than rushing it — needs: a
   VideoGenerationProvider following the same pattern as
   ImageGenerationProvider, a `<video autoplay muted loop playsinline>`
   hero treatment gated behind `prefers-reduced-motion` + a poster-image
   fallback, and almost certainly a DEMO watermark burned into the video
   too (see `src/lib/images/watermark.ts` for the image equivalent — a
   video needs frame-level compositing, e.g. via ffmpeg, not sharp).
   Not yet started.
2. **Continue the demo-app migration** (see IN PROGRESS) — natural next
   slices, roughly in order of value: (a) multi-page routing (React
   Router nested routes reading the same per-slug JSON, matching the
   static engine's real index/leistungen/ueber-uns/kontakt split —
   right now everything is one long page); (b) wire a real dashboard
   button/action that calls `exportLeadDataForReactApp()` instead of
   requiring the CLI script; (c) port at least one more ConceptVariant's
   layout/nav treatment so it's not visually identical for every lead;
   (d) the editorial/lightbox gallery and the real location map, both
   already proven in the static engine, ported into React components.
2. ~~Interaction moments~~ **Done**: magnetic CTA on the hero's primary
   button (mission section 11) — see COMPLETED. Could still add a
   second, more industry-specific interaction (e.g. an interactive
   before/after or image-cursor-preview) but the baseline requirement
   (at least one deliberate interaction) is now met for every demo with
   a real hero CTA.
3. **Per-industry WOW moments** (mission section 12) — Immobilien's
   ("Lage") is now genuinely done via the real embedded location map
   (see COMPLETED); it also benefits every other industry generically,
   since any local business has a real location. Still not deliberately
   designed: Restaurant (Atmosphäre/Menü), Anwalt (Autorität/Case
   Story), Friseur (Transformation/Gallery), etc. Worth scoping the
   remaining ones as their own deliberate pass rather than bolting on
   ad-hoc special cases.
4. **Typography systems** (mission section 10) — kinetic word-reveal is
   now on the hero headline AND every section heading (see COMPLETED).
   Not yet done: scroll-*scrubbed* (not just triggered-once) masked
   typography (e.g. via the GSAP scroll-scrub motionStructure), and
   oversized/condensed display type as its own art-direction lever
   distinct from the existing heading/body font pairs.
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

`c31d82a` — Fix: color picker showed 20 identical-looking black swatches
on dark profiles. **Pushed successfully** — `origin/main` is caught up
(verified via SSH push, ~2s, no hang). Git push authentication is now
via SSH (see the top-of-file note), not the old HTTPS+GCM setup, so
future pushes should be instant and silent going forward.

## NEXT PRIORITY

**All P1 items are done**: Cloudflare (shared-project architecture,
survived a real regression), GitHub (SSH auth, push friction solved for
good), Gmail, and OpenRouter AI image generation are all real,
configured, and proven working end-to-end. The Demo Engine now has
genuine motion, real photorealistic imagery (no more abstract-SVG
fallback in practice once OpenRouter is configured), and a working
20-color picker. **Current priority is P2**: the Vite/React/WebGL
demo-app migration (see IN PROGRESS / NEXT ACTION) — a real, large,
user-directed architecture initiative, not optional polish.

## CONCURRENT SESSION NOTE

Another Claude Code session was active on this same working directory
(not an isolated worktree) earlier in this session — it committed
`81537be` and `89cf5b5` (the interactive Before/After slider). Always
check `git status`/`git log` for changes made outside this session
before assuming the tree matches what you last read, and stage files
explicitly (never a blanket `git add -A`) to avoid committing another
session's in-progress, unreviewed work. Not observed active in the most
recent part of this session, but assume it could resume.
