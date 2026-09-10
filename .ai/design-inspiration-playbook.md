# Design Inspiration Playbook

Real, first-hand observations from six real award-caliber sites (visited
live, 2026-09-09, per explicit user request: "diese Webseiten
analysieren wie ein echter Nutzer, darüber alles aufschreiben, sich
merken, Playbook erstellen"). Purpose: a durable reference of genuinely
distinctive techniques to draw on for the demo engine's ConceptVariant/
NavigationConcept/MotionStructure system — inspiration for **new**
concepts, never anything to literally copy (colors, copy, brand assets,
or layouts belonging to these specific companies stay theirs).

Read this before inventing a "new" creative direction from scratch —
check whether one of these techniques, adapted and made honest for a
local business, is a better fit than reinventing something generic.

## 1. Filmbot (filmbot.com) — cinema ticketing SaaS

- **Scalloped/capsule image-mask columns**: hero photography clipped
  into a repeating rounded-rect "pill" shape (alternating column
  heights, like a film-strip motif), not a plain rectangle crop. Real
  motion-blur action photography reinforces the shape's kinetic feel.
  → Adoptable as a new `heroStyle` or `editorial` layout variant: an
    image mask shape that echoes the industry (e.g. a plate/circle
    motif for Restaurant, a comb/scissor silhouette for Friseur) instead
    of a plain rectangle. Pure CSS `clip-path`, no WebGL needed.
- **Two-tone editorial paragraphs**: a bold black lead sentence directly
  followed by a lighter gray supporting sentence, same size/weight
  family, separated by color only — not a heading+body split.
  → Cheap, high-impact typographic hierarchy trick usable in the
    `aboutSection`/editorial copy today.
- **Asymmetric scattered photo collage** (not masonry, not a grid):
  real photos at deliberately irregular sizes/offsets, evoking a
  scrapbook. Strong "real culture, not stock" feeling.
  → Good alternative to the grid-locked `editorial`/gallery layout for
    industries wanting a warmer, less corporate feel (Café, Bäckerei,
    Friseur "Galerie").
- **Monospace/technical labels contrasted with big humanist headlines**
  (bracket-style `[ LABEL ]`, small-caps tracked-out eyebrow text) for
  a retro-technical voice layered under bold rounded display type.

## 2. Rezo Zero (rezo-zero.com) — creative dev agency

- **Typography-only hero, zero imagery**: the entire hero is one huge
  multi-line statement in a rounded sans-serif, nothing else. Confident
  restraint rather than needing a photo to fill the space.
  → A genuinely distinct `heroStyle` option for restrained/professional
    profiles (Rechtsanwalt, Steuerberater) — bigger, bolder type instead
    of "minimal" meaning small and quiet.
- **Sticky/fixed header that content scrolls *under*, semi-transparent**
  — nav never disappears, doesn't reserve dead space either, just floats
  above with high z-index. (Already partially covered by the
  floating-glass NavigationConcept — worth double-checking it stays
  legible over busy imagery, which this site solves by keeping the nav
  area plain white.)
- **Clean two-column plain-text section** ("Skills" / "Mission &
  Vision") — no cards, no icons, no imagery, just two aligned text
  blocks. A legitimate "confidence needs no decoration" section type
  for the About/methodology content on serious-trade profiles.
- **Asymmetric black-and-white photography grid** with unequal column
  widths (not a uniform 3-up grid) for a portfolio/project section.

## 3. Podium (podium.global) — sports creative studio

- **Percentage-counter preloader** (small centered dot + numeric %,
  top-right) before the hero renders. Only justified because the hero
  genuinely needs heavy assets loaded first — **do not adopt by
  default**; the mission's own performance discipline (fast load,
  no gratuitous blocking) rules this out for ordinary local-business
  demos. Reserve the *pattern* for a future demo that has a real reason
  to preload something heavy (e.g. a big real 3D scene), and always make
  it skippable/instant on slow connections.
- **Gooey/metaball SVG-filter blob hero**: multiple blurred circular
  shapes merged into one amoeba-like silhouette (classic
  `feGaussianBlur` + `feColorMatrix` contrast "goo" filter), with real
  photo/video content masked inside the blob, slowly morphing. Bold,
  avant-garde, high production value.
  → Too loud for most trades, but a legitimate option for an energetic/
    creative-leaning profile (`energetic-punch` motionStructure already
    exists) as an alternative hero treatment — feasible in pure SVG/CSS,
    no WebGL required.
- **Real 3D-rendered object floating in a photo collage** (a textured
  rock/asteroid model with proper lighting, floating among 2D photo
  tiles at different depths over a dark-to-white radial gradient). A
  genuinely more ambitious use of `use3d` than this project's current
  abstract Three.js hero scenes — a real *asset*, not just a shape.

## 4. Gionatan Nese (gionatannese.com) — personal portfolio

- **Draggable/pannable infinite canvas mood-board**: project thumbnails
  scattered in a rough radial constellation (not a grid at all),
  confirmed genuinely draggable (content shifts and rescales on drag,
  a zoom-percentage indicator appears). A rare, high-effort spatial
  interaction.
  → Full drag-canvas is too complex/fragile to justify for a local
    business demo, but the underlying **principle** — a gallery doesn't
    have to be a rigid grid — is directly usable: a loosely scattered
    (but still static/non-draggable) photo arrangement is a cheap way
    to make a Friseur/Blumenladen "Galerie" feel less templated.
- **Minimal pill-shaped nav with numbered tabs** ("Creative Space 1 2
  3") instead of named links — playful, works when a personal brand can
  afford a little mystery; too oblique for a business a stranger needs
  to navigate quickly, so not recommended for demos, but interesting as
  a research note.

## 5. United Carriers (unitedcarriers.com) — global logistics

- **The single best example of an "earned" WOW moment** in this
  set: a real WebGL 3D Earth (dot-matrix particle continents, glowing
  atmosphere rim-light, day/night terminator, floating country-name
  pins with live pins for actual served countries) as the literal hero
  — directly visualizing the business's real value prop (global
  reach/shipping routes), not decoration for its own sake. Exactly the
  mission's own "WOW moment must connect to the real business" rule,
  demonstrated at the highest production tier.
  → Too heavy/complex to fully replicate for small-business demos, but
    the *category* of idea — find the one real fact about this specific
    business that a literal, honest visualization could make vivid — is
    the actionable takeaway. For a local business the equivalent is
    already partly built (the real OpenStreetMap location-map WOW
    moment) — this site is proof that pattern is worth extending further
    per industry (e.g. a real simple animated route/delivery-radius map
    for a business that delivers, once real service-area data exists).
- **Scroll-scrubbed atmosphere gradient**: the page background
  physically transitions (night-sky black → deep blue → bright white)
  tied to scroll position across the first two sections, landing on a
  real daylight aerial photo — "descending from space to earth." Pure
  CSS custom-property/gradient interpolation driven by ScrollTrigger,
  genuinely cheap to build, no WebGL needed.
  → Directly adoptable: a scroll-scrubbed background-color/gradient
    shift between sections (e.g. Hotel: evening mood → bright day mood;
    Immobilienmakler: exterior dusk → bright interior) using the
    existing `scroll-scrub` motionStructure's GSAP/ScrollTrigger
    plumbing already in this codebase.
- Live news-ticker strip, dual-intent CTA pair ("Talk with us" / "Our
  Services") side by side rather than one primary + one ghost link.

## 6. Zero University (why.zero.university) — hiring/education brand

- **Numeral-countdown preloader** (huge bold "99"→"0" counter,
  bottom-left, over a rich green gradient-mesh background) — a bolder,
  more brand-forward preloader style than Podium's minimal dot+%.
- **The interaction gate as brand statement**: before any content
  loads, the visitor is asked to literally "DRAW A ZERO" (trace a
  circle gesture with the cursor/finger around a stylized illustrated
  hand) to proceed — the site's core required interaction directly
  embodies the brand name/concept ("Zero"). Extremely bold, real
  friction, would never be appropriate to force on a local-business
  demo visitor (a bakery demo must never gate real content behind a
  gesture puzzle).
  → The **principle**, not the mechanic, is the takeaway: when a
    business's name or core idea genuinely maps to a simple physical
    gesture or shape, ONE optional, skippable micro-interaction that
    plays on that idea (never gating primary content) can be a
    memorable, honest "WOW moment" — e.g. a Friseur demo where the
    magnetic CTA already built into this engine could be themed toward
    a "snip" motion, or an Autowerkstatt demo where a hover interaction
    mimics a wrench turning. Don't force this — only build it where a
    business's own identity actually suggests one.

## Cross-cutting takeaways for this project specifically

1. **Scroll-scrubbed atmosphere/gradient shifts** (from United Carriers)
   is the highest-value, lowest-effort technique to port — it reuses
   the `scroll-scrub` motionStructure's existing GSAP/ScrollTrigger
   wiring in `template.ts`, needs no new library, and would visibly
   differentiate demos that pick that motion structure.
2. **Non-rectangular image masking** (Filmbot's capsule columns) and
   **scattered-not-gridded galleries** (Filmbot's collage, Nese's
   mood-board principle) are both pure-CSS, cheap ways to make the
   existing `editorialSection`/lightbox gallery feel less templated,
   without new dependencies.
3. **"Earned" 3D/WOW moments must visualize something real about the
   business** (United Carriers' globe = real routes; this project's own
   location map = real coordinates) — a reminder to keep chasing that
   principle for the remaining per-industry WOW moments still on the
   NEXT ACTION list (Restaurant, Anwalt, Friseur) rather than reaching
   for decoration.
4. **Preloaders and interaction gates are a *deliberate* choice, not a
   default** — both Podium and Zero University justify the friction with
   genuinely heavy/bespoke content. Nothing in this project's demo
   engine should ever block on a preloader or gesture gate; the mission's
   own performance-discipline rule (fast load, no gratuitous blocking)
   stands above imitating these sites' choices here.
5. **Typography-as-hero** (Rezo Zero) is a legitimate, currently-missing
   `heroStyle` for restrained/professional profiles that don't want a
   photo dominating — worth considering as a 13th ConceptVariant or a
   new heroStyle value alongside the existing "minimal"/"full-bleed"/
   "color-block" set.

## Per-industry Awwwards research (ongoing, started 2026-09-09)

Same rule as above: techniques only, never content/branding. Awwwards
has no clean per-industry taxonomy (its "Category" filter is broad —
E-commerce, Business services, etc. — not "Restaurant" or "Real
Estate"), so finding real examples means searching by keyword and
filtering out marketing-agency portfolios that merely mention the
industry. This section grows one industry at a time across sessions —
check here before starting a fresh industry search from scratch.

### Restaurant — "Qissa, A Tale of Food" (qissa.co.uk, Awwwards nominee)

- **Inline color-accent words inside a heading**, not the whole heading:
  "A word that means *a tale*." — only the last phrase in the brand's
  accent gold. Cheap (a single `<span>`), reads as considered rather
  than templated. Directly usable in `aboutSection`/hero headlines.
- **A pull-quote / brand-promise callout**: italic serif text, a thin
  colored left border, attributed on its own line with an em-dash
  ("— THE QISSA PROMISE"). A distinct block type this project's About
  section doesn't have yet — currently `aboutSection` is a single plain
  paragraph; a one-sentence "promise" pull-quote under it would be a
  cheap, real upgrade using assets already generated (`profile.brandImpression`).
- **Symmetric-dash section eyebrows** ("— THE MASTERPIECES —", dashes on
  both sides, not just leading) as a section-transition marker before a
  heading — slightly more considered than this project's current
  single-leading-dash eyebrows (see `editorial-eyebrow`).
- **A scrolling gold marquee/ticker band** of brand keywords ("Taste ✦
  Craft ✦ Gathering ✦ Celebration ✦ Origin ✦ Spice"), full-bleed, in
  italic serif, as a section divider — strong rhythm break between two
  content sections using pure text, no imagery. A genuinely cheap
  (CSS `@keyframes` marquee) technique that would suit Restaurant/Café/
  Bäckerei industries' `editorial`/`about` boundary.
- **Menu categories as a real 2-column photo+caption grid** ("Grills &
  Tandoor" / "Traditional Curries", full-bleed rounded photo + serif
  title + one-line description below, not a tight card) — more
  editorial than this project's current `servicesSection` cards; worth
  considering as an alternate services layout for hospitality profiles
  specifically (elegant/hospitality already get more whitespace scale).
- **Partial-crop neighbor images in a photo row** (a food-plate gallery
  where the center plate is full-size and the left/right neighbors are
  visibly cut off at the viewport edge) — hints at "more content" without
  needing an actual carousel library; a pure CSS overflow technique.
- **Elegant scroll-cue**: "BEGIN THE STORY" label + a short vertical
  line beneath the hero CTA, instead of a generic down-arrow — ties the
  scroll affordance to the brand's own "story" concept rather than being
  generic chrome.

### Real estate / office space — "The Nest" (thenest.pl, Awwwards nominee)

Pure "real estate agent" results were thin on Awwwards (only 2 hits for
the term); this one is a virtual-office/business-address service, not a
brokerage, but the property-presentation techniques still transfer:

- **Layered geometric building illustration** in the hero: a real photo
  of the actual building, overlaid with flat geometric shapes (a dark
  solid silhouette wedge, a circle, a torn-paper-edge blob) plus small
  numbered/pin markers on specific floors — turns a plain building photo
  into an annotated, editorial diagram rather than a stock exterior
  shot. A genuinely adaptable technique for Immobilienmakler: annotate
  a *real* property photo (pins on real floors/rooms) instead of an
  unlabeled exterior shot, IF real per-room data exists — otherwise
  don't invent labels (see this project's existing "nicht erfinden"
  discipline).
- **Inline italic color-accent on the last phrase of a heading** ("at a
  real address.") — the exact same technique as Qissa's "a tale.",
  independently observed on a completely different industry/agency —
  worth treating as a genuinely reusable, industry-agnostic pattern
  rather than a one-off.

### Anwalt / law firm — "ARIO" (ario.law, Awwwards honorable mention)

Same thin-coverage issue as real estate — Awwwards' free-text search
found nothing for "law firm"/"law" until the exact tag URL
(`/websites/law/`) was used directly.

- **Scattered-letters-assemble-on-click hero**: the firm's wordmark
  ("ARIO") starts as its individual giant letters scattered across
  the far corners of the viewport over a plain gradient background;
  the visitor's first click snaps them into their correct reading
  position as the header slides in. A genuine, memorable first
  interaction tied directly to the brand name — same *category* of
  idea as Zero University's "draw a zero" gesture (see the six-site
  playbook above) but far more restrained: one click, not a traced
  gesture, and it doesn't block any real content behind it (the letters
  are already legible, just not yet assembled) — a much safer version
  of "interaction embodies the brand name" for this project's own
  no-gratuitous-friction rule.
- **Deliberately casual, human copy breaking the stiff-lawyer
  stereotype**: "We enjoy the law, adore the drive, crisis situations
  motivate and changes inspire us. Our team is more than freaking
  awesome lawyers." — a real content/tone lesson more than a visual
  technique: this project's own Rechtsanwalt profile
  (`brandImpression: "seriös, autoritär, vertrauenswürdig"`) is
  deliberately the opposite (serious/formal), which is a legitimate,
  different brand choice — but confirms "serious" isn't the only valid
  tone for this industry if a specific lead's own real personality
  warrants something warmer (not to invent a warmer tone by default).
- **A real named-partner video intro** ("OLEKSII VORONKO, MANAGING
  PARTNER") — exactly the mission's own "Anwalt: Autorität/Case Story"
  WOW-moment ask, done for real. Not currently buildable honestly in
  this project: would need a real video of a real named partner, which
  research doesn't currently capture — logged here as the concrete
  target to aim for if/when a lead's own site or Impressum ever
  surfaces one, rather than inventing a stand-in.
- **Bold real-number stat cards** ("4+ years in the legal market", "5+
  lawyers in the team") — large numeral, thin divider tick above,
  one-line label below. Honest and simple, but **currently blocked by
  data availability**: this project's research pipeline (OSM Overpass)
  doesn't capture company age or team size, so building this now would
  mean inventing numbers — exactly what "nicht erfinden" forbids. Keep
  this pattern in mind if a future research source ever provides real
  values for these.
- **Scroll-scrubbed two-tone heading** ("Rock the *Future with the Rule
  of Law*" — the first few words solid white, the rest dimmer gray,
  the split point tied to scroll position rather than fixed) — a
  genuine scroll-scrub technique, distinct from Qissa's *static* inline
  accent word. Cheap to build with the GSAP/ScrollTrigger plumbing this
  project already has (`scroll-scrub` motionStructure) and needs no new
  data — directly shippable.

### Friseur / hair salon — "Serenity Hair" (serenityhairblaxland.com.au)

Note: searching "hair-salon" also surfaced "Salon Heleen Hülsmann" (an
Honorable Mention) — but that "Salon" is French for showroom, a
pre-loved *designer fashion* boutique, not a hairdresser. Worth
remembering for future searches: "salon" is ambiguous in English/Dutch
search results, filter results by what the site actually sells, not
just the tag match.

- **Colored quick-link tiles below the hero** ("VIEW OUR TEAM" / "VIEW
  OUR SERVICES" / "SEE OUR GALLERY", three different soft pastel
  color-block rectangles, big and clickable) instead of relying only on
  small header nav text — a friendly, tactile "visual sitemap" moment.
  **Directly shippable, no new data needed** — this project already has
  real per-industry pastel/soft-toned palettes and already knows which
  secondary pages exist for a given lead (`activeSecondary` in
  template.ts) — this is purely a presentational upgrade over plain nav
  links, well-suited to approachable/friendly industries (Friseur,
  Café, Bäckerei, Blumenladen) rather than restrained/professional ones.
- **A small handwritten-script aside** ("Hey & welcome!") layered over
  the hero photo, separate from and above the main formal headline — a
  cheap, warm personal touch. Directly adoptable via a script/cursive
  Google Font already loadable the same way other fonts are.
- **Circle-cropped editorial portrait photo**, offset over a two-tone
  split-color background — a real transformation/hair-color photo shown
  through a circular mask rather than a rectangle. A genuine, low-effort
  (pure CSS `border-radius`/`clip-path`) way to make a hero photo feel
  more editorial/beauty-industry-specific than the default rectangular
  crop, and a natural fit for the mission's "Friseur: Transformation"
  WOW-moment ask if paired with a real before/after pair (not invented —
  only if real before/after photos exist for a lead).

### Autowerkstatt — "363 Car & Social Club" (363sudbury.com, Awwwards HM)

Note: "car-repair"/"car repair shop" tags on Awwwards mostly surface
unrelated results (a car-diagnostics software product, an injury law
firm, a car wash) — this one is a car enthusiasts' club (secure storage
+ concierge car care), not a repair shop either, but the technique
below is genuinely industry-agnostic and the standout find of this
whole research thread.

- **A real, live weather widget for the business's actual city**
  ("Greater Sudbury, ON — Patchy rain 21°C", top-right of the hero,
  updating in real time) — not decoration, genuinely live current data
  for the real location. **Directly and broadly buildable, verified
  live**: [Open-Meteo](https://api.open-meteo.com) is a completely
  free, keyless, CORS-open weather API — confirmed with a real
  cross-origin fetch from this project's own dashboard origin. This
  project already captures real lat/lon per lead for the location map
  (`Lead.latitude`/`longitude`), so a weather badge needs no new data
  source at all. Arguably a *better* "real, live, honest" WOW moment
  than anything currently in the demo engine (even the location map is
  static once rendered) — not automotive-specific, applicable to any
  industry with coordinates. Highest-value single finding from the
  whole Awwwards research thread; shipping this next.
- Bold dark hero (real high-end car in a moody garage photo), a
  boxed monogram logo mark, and a full-bleed neon-yellow bottom bar for
  primary nav ("Explore") — strong, simple high-contrast color-blocking
  against the otherwise dark/desaturated palette. Good reference for a
  bold accent-color-as-navigation-bar treatment for `energetic-punch`
  motionStructure profiles.

Per-industry Awwwards research thread complete for now (Restaurant,
Real Estate, Anwalt, Friseur, Autowerkstatt) — revisit for more
industries (Café, Bäckerei, Immobilienmakler-specific brokerages,
Zahnarzt/Arztpraxis, Fahrradladen) in a future session rather than
re-researching these five.

## GSAP / Awwwards animation flows (started 2026-09-09)

Explicit user request: "bei awwwards beste animation flows webseiten,
gsap webseiten recherchieren und manche demos sollen von awwwards
replicat werden 1:1". Source list: the real, live
[awwwards.com/websites/gsap/](https://www.awwwards.com/websites/gsap/)
tag page (20 real sites, fetched 2026-09-09 — not a guessed URL). Note
on method: none of the sites checked exposed `window.gsap` — GSAP is
bundled inside their Next.js/Vite chunks, invisible to a `typeof
window.gsap` check — so "GSAP-tagged" here is taken on Awwwards' own
tagging, and the choreography below was captured empirically (real
scroll-throughs + screenshots at each stage), not by reading their
minified JS. That is exactly what this project needs anyway: it
reimplements its own vanilla GSAP, never borrows a competitor's code.

### dsgn Interior (dsgninterior.se) — interior architecture, Malmö — **STRONGEST 1:1 CANDIDATE**

- **Pinned-heading, scroll-scrubbed project reel**: the hero section
  pins in place while the user scrolls; a background photo crossfades
  through a sequence of real completed projects, each one's name
  (`Fellowmind Göteborg`, `Car.info`, …) crossfading in sync as its
  photo resolves to full clarity, then the whole section releases back
  into normal scroll once the sequence ends. Verified live by scrolling
  through 3 real transitions — genuinely pinned (not just a fast
  fade-in-on-scroll), heading stays dead-center the entire time.
  → **This is directly buildable as a real feature today, with zero
  invented content**: every lead's demo already has exactly this shape
  of data — 3 real editorial photos + real real captions
  (`buildEditorialRows()`, already shared between both engines). A new
  `projectReelSection()`/`projectReelScript()` (GSAP ScrollTrigger,
  `pin: true`, cross-fading `opacity` on stacked `<img>` layers keyed to
  scroll progress, heading text swapped via the same progress value) is
  a genuine, honest 1:1 structural+motion replica — same technique
  category as this session's angled-carousel work but a *vertical
  pinned crossfade* instead of a *horizontal scrub*, so it reads as a
  distinct real choice for a lead, not a reskin of the same idea.
  Strong fit for Immobilienmakler (real listings/objects), Autowerkstatt
  (real completed jobs), Friseur (real before/after work) — anywhere a
  lead has 3+ real photos that represent discrete "pieces of work."
- Full-bleed real video (not photo) as the hero background, bold
  oversized sans headline directly on top, no scrim beyond natural video
  contrast — confirms a real lead's own video footage (if ever
  available) could replace a static hero image directly, no new
  technique needed.

### The Nest (thenest.pl) — revisited for motion (content already logged above)

- **Numbered stacked feature list**, no cards/icons: `— 01 OFFICE
  FLOORS` small-caps eyebrow (leader line + number), big serif heading,
  one paragraph, a plain underlined text link with an arrow. Each block
  simply fades up in sequence on scroll — no exotic motion, but a
  genuinely different, calmer alternative to this project's card-grid
  `servicesSection` for profiles wanting a quieter, editorial feel
  (Anwalt, Steuerberater-style trades). Directly shippable as an
  alternate services layout — no new data needed, same `services[]`
  array this project already has.
- **Staggered pin-marker + label reveal on an annotated building
  photo**: real building photo overlaid with flat geometric shapes and
  small numbered pin markers; as the section scrolls into view, floor
  labels ("GROUND FLOOR — Bistro in the Michelin Guide 2026") appear one
  at a time next to their pin, not all at once. Good technique for
  Immobilienmakler **only if** a lead has real per-floor/per-room facts
  to attach to real pin coordinates — otherwise this project's
  "nicht erfinden" rule blocks it (no inventing floor labels).

### ALTITUDE 101 (altitude101.com) — VR/immersive product — inspiration only, not lead-transferable

- A continuously-orbiting field of glossy 3D torus/tube shapes (WebGL)
  surrounds a bright glowing headset-silhouette mask; scrolling reveals
  a large word cropped inside that glowing mask, crossfading as it
  scrolls. No real local-business analog (abstract tech/VR product, no
  real content to transfer honestly) — logged purely as a technique
  reference for `demo-app`'s own WebGL hero (`WebGLHero.tsx`): a
  glow-mask text reveal layered over a continuously-rotating 3D object
  field is a legitimate, industry-agnostic upgrade to consider there
  specifically, once a real reason to add more WebGL polish comes up.

**Verdict**: one real, honest, zero-invented-content 1:1 candidate
identified (dsgn Interior's pinned project reel) — building it next as
`projectReelSection()` using a real lead's existing editorial assets,
the same way the angled carousel used Tobias Grünert's.

## Current Site-of-the-Day winners (2026-09-10)

Pulled from the live `awwwards.com/websites/sites_of_the_day/` list.
Most of that week's winners are AI platforms, artist pages and agency
portfolios with no honest local-business analogue. The one direct hit:

### ERA Residence (era-residence.com) — luxury residential, **Site of the Month, Aug 2026**

The highest-ranked entry on the list and a direct industry match
(Immobilienmakler is one of this project's real industries). Visited
live; cookie banner declined.

- **Rotating circular seal badge** — the brand name set on a circle
  around a small emblem, slowly rotating, pinned top-left across every
  section and recolouring to suit the section behind it. Confirmed
  rotating by comparing two screenshots. Pure SVG `<textPath>` + one CSS
  rotation, no library, and it needs nothing but the lead's own real
  company name → **directly shippable**, built as `rotatingSealBadge()`.
  Suits the trades where a "seal" reads as quality rather than kitsch:
  Immobilienmakler, Hotel, Friseur, Restaurant.
- **Arched section top edge** — the section following the hero rises
  with a wide elliptical arc instead of a straight edge, so the boundary
  reads as a soft horizon. One `border-radius` with separate horizontal
  and vertical radii; cheap → **directly shippable**, built as the
  `.arched-top` treatment.
- **Oversized display wordmark bleeding past the viewport edges**, set
  over the hero photo with a thin circle outline behind it. Related to
  the typography-hero already built (Rezo Zero), so not rebuilt — noted
  as a variation, not a separate technique.
- Rotated giant type at the section edges, and a symmetric label using
  the brand emblem as the divider ("COSTA ✦ DEL SOL"). The symmetric
  divider is the same idea as Qissa's symmetric-dash eyebrow already
  logged; the rotated edge type is decorative-only and skipped.

Not pursued from that week's list, and why: Cerebrium/Sharplink/
USAvionix/Seasats (AI-platform and aerospace marketing, no local-trade
analogue), Trevor Noah/Paul Kalkbrenner (personality sites built around
a famous person's own likeness — nothing transferable), MIU MIU and
Decathlon (campaign microsites needing bespoke 3D asset production),
Why Zero / Gionatan Nese / United Carriers (already in this playbook).
