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
