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

## IN PROGRESS

Nothing. All three integrations (Cloudflare, GitHub, Gmail) are
configured and proven working end-to-end as of this session.

## BLOCKED

Nothing. This is the first point in the project's history where every
external integration is real and verified.

## NEXT ACTION

1. **The Gmail Enable-API step is done** (project 491216628576's Gmail
   API enabled) and the full pipeline verified end-to-end on
   Meisterschnitt: real preflight checklist all-green, real Gmail draft
   actually created via the API. Hotel Zum Riesen and Junker Immobilien
   are also now published with real links in their approved messages
   (Junker has no discovered contact email, so its Gmail draft can't be
   created — "Text kopieren" is its path). Worth a quick Gmail-draft
   test on Hotel Zum Riesen too (it has a real contact email) to confirm
   this isn't a one-lead fluke.
2. **Demo Engine QA pass** (done for the most part): visually verified
   the 4-page (law firm, restaurant, hotel with "Zimmer & Angebote"
   label) and 3-page (luxury-minimal, no Leistungen page) cases live.
3. **Publish real links for more approved leads** — 3 of the leads that
   have ever been approved now have real public URLs (Meisterschnitt,
   Hotel Zum Riesen, Junker Immobilien); any newly-approved lead still
   needs someone to click "Öffentlich bereitstellen" — this doesn't
   happen automatically.
4. **New: emilkowalski/skill animation skills installed** this session
   (`.agents/skills/` — animate, apple-design, animation-vocabulary,
   improve-animations, review-animations, find-animation-opportunities,
   emil-design-eng, etc.). Directly relevant to the master mission's
   Typography+Animation / Motion Language asks (sections 10-12) — use
   these when picking that work up rather than inventing motion
   patterns from scratch.
5. Per the master mission's Demo Engine ask (≥30 named creative
   directions, typography/motion systems, variant registry with
   similarity detection): the multi-page work above is the structural
   piece; the registry/typography/motion expansion is bigger, separate
   design work — don't start it speculatively mid-session. If picked
   up, scope it deliberately (which named directions, what they change
   beyond color/font) rather than generating filler variants, and lean
   on the newly-installed animation skills for the motion side of it.

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

## LAST COMMIT

`d4be967` — Cloudflare publish: use the stable project URL, not the
per-deploy hash URL. Pushed to `origin/main`. Three commits pushed this
session total so far (`a27b6c8`, `29ff617`, `d4be967`) — push the
`.env`-adjacent state-file commit and the emilkowalski skills addition
next if not already done by the time this is read.

## NEXT PRIORITY

**All P1 items are done**: Cloudflare, GitHub, and Gmail are all real,
configured, and proven working end-to-end. There is no remaining
external-integration work. Next priority is P2: Demo Engine expansion
(≥30 named creative directions, typography/motion systems — see NEXT
ACTION §4-5, and use the newly-installed emilkowalski animation skills
for the motion side) or continuing to publish real links / test more
industries as new leads come in.

## CONCURRENT SESSION NOTE

Another Claude Code session was active on this same working directory
(not an isolated worktree) earlier in this session — it committed
`81537be` and `89cf5b5` (the interactive Before/After slider). Always
check `git status`/`git log` for changes made outside this session
before assuming the tree matches what you last read, and stage files
explicitly (never a blanket `git add -A`) to avoid committing another
session's in-progress, unreviewed work. Not observed active in the most
recent part of this session, but assume it could resume.
