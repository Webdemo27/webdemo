import type { VisualProfile, MotionLevel, ColorWorld } from "../visual-director/types";
import type { ConceptVariant, HeroStyle, CtaIntensity, SectionKey, MotionStructure, NavigationConcept } from "../visual-director/variants";
import { swatchPreviewColor } from "../visual-director/colorway";
import { pickVariant } from "../messaging/templates";
import { toAssetView, groupByRole, type DemoAssetView } from "./asset-view";

export interface DemoData {
  companyName: string;
  industry: string | null;
  location: string | null;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  /** This exact business's real coordinates (OSM node/way, never
   * geocoded/guessed) — powers the real embedded location map. Null
   * when unavailable (leads researched before this field existed, or
   * any source that doesn't provide coordinates). */
  latitude: number | null;
  longitude: number | null;
}

export interface DemoPlaceholders {
  location: boolean;
  address: boolean;
  phone: boolean;
  email: boolean;
}

interface RawAssetInput {
  role: string;
  altText: string;
  aspectRatio: string;
  width: number | null;
  height: number | null;
  localPath: string | null;
  formats: unknown;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ICONS = {
  phone: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  zoom: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
};

function pictureTag(asset: DemoAssetView, className: string, eager = false): string {
  const loading = eager ? "eager" : "lazy";
  const fetchPriority = eager ? ' fetchpriority="high"' : "";
  if (asset.isVector) {
    return `<img src="${asset.src}" alt="${escapeHtml(asset.altText)}" class="${className}" loading="${loading}" width="${asset.width}" height="${asset.height}"${fetchPriority} />`;
  }
  const sources = [
    asset.srcsetAvif ? `<source type="image/avif" srcset="${asset.srcsetAvif}" sizes="100vw" />` : "",
    asset.srcsetWebp ? `<source type="image/webp" srcset="${asset.srcsetWebp}" sizes="100vw" />` : "",
  ].join("");
  return `<picture>${sources}<img src="${asset.src}" alt="${escapeHtml(asset.altText)}" class="${className}" loading="${loading}" width="${asset.width}" height="${asset.height}"${fetchPriority} /></picture>`;
}

/* Deliberately predicate-only phrasing (adjective after a verb like
 * "wirkt"/"auf", never modifying a noun directly): brandImpression can
 * hold multiple comma-separated adjectives, and German attributive
 * adjectives before a noun require gender/case endings that a raw
 * adjective list can't supply correctly ("für seriös Qualität" is
 * wrong; "für seriöse Qualität" would be right, but the plural-list
 * case has no single correct ending). Predicate position never
 * declines, so it stays grammatical for any mood string. */
const ABOUT_OPENERS = [
  "{company} wirkt in {location} auf den ersten Blick {mood}.",
  "In {location} zeigt sich {company} {mood} — und immer persönlich.",
  "{company} tritt in {location} {mood} auf, mit viel Aufmerksamkeit für die Beratung im Detail.",
];

const ABOUT_CLOSERS = [
  "Dieses Demo-Konzept zeigt, wie ein moderner, mobilfreundlicher Auftritt dazu aussehen könnte.",
  "Dieser Entwurf skizziert, wie sich das online genauso hochwertig zeigen lässt.",
  "Inhalte und Bilder werden im nächsten Schritt gemeinsam final abgestimmt.",
];

/* A short pull-quote below the about text — inspired by real
 * hospitality-site "brand promise" callouts (see
 * .ai/design-inspiration-playbook.md, Qissa). Built only from
 * profile.brandImpression, the same curated mood string aboutSection
 * already uses — never a new invented claim about the business, just a
 * more editorial presentation of a fact already in the visual profile. */
const BRAND_PROMISE_TEMPLATES = [
  "{company} steht für {mood} — in jedem Detail, bei jedem Besuch.",
  "Das Versprechen von {company}: {mood}, ohne Kompromisse.",
  "{moodCap} — dafür steht {company}, jeden Tag aufs Neue.",
];

function heroTextPosition(profile: VisualProfile, heroStyle: HeroStyle): string {
  if (heroStyle === "minimal") return "hero-center hero-minimal";
  if (profile.layoutDirection === "grid-clean") return "hero-center";
  if (profile.layoutDirection === "bold-blocks" || heroStyle === "color-block") return "hero-center";
  return "hero-bottom-left";
}

function heroActions(ctaIntensity: CtaIntensity, contactHref: string, secondaryHref: string | null, secondaryLabel: string): string {
  if (ctaIntensity === "minimal") {
    return `<a class="cta-link" href="${contactHref}">Kontakt aufnehmen →</a>`;
  }
  const secondary = secondaryHref
    ? `<a class="btn-ghost" href="${secondaryHref}">${escapeHtml(secondaryLabel)}</a>`
    : "";
  if (ctaIntensity === "aggressive") {
    return `
      <div class="hero-actions">
        <a class="btn-primary btn-lg" href="${contactHref}">Jetzt unverbindlich anfragen</a>
        ${secondary}
      </div>`;
  }
  return `
    <div class="hero-actions">
      <a class="btn-primary" href="${contactHref}">Jetzt Kontakt aufnehmen</a>
      ${secondary}
    </div>`;
}

/** Splits the hero headline into per-word masked spans instead of one
 * plain text node — a genuine kinetic-typography technique (each word
 * clips inside `overflow:hidden` and slides up from below on reveal),
 * not just fading the whole line in at once. Gated the same as the rest
 * of the reveal system (see [data-reveal].is-visible .kinetic-word-inner
 * in buildMotionCss) — with motion off, this degrades to plain visible
 * text since the mask transform never applies in the first place. */
function kineticWords(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map(
      (word, i) =>
        `<span class="kinetic-word"><span class="kinetic-word-inner" style="transition-delay:${i * 45}ms">${escapeHtml(word)}</span></span>`
    )
    .join(" ");
}

/** A generated hero video (see lib/video) replaces the still image when
 * one exists on the hero asset. Always muted + playsinline + loop —
 * an unmuted or non-inline hero video is blocked by every mobile
 * browser's autoplay policy anyway — and `poster` carries the real
 * first frame so there's never a blank box before the first frame
 * decodes. `data-hero-video` lets the reduced-motion script pause it
 * for visitors who asked for less motion (ui-ux-pro-max: reduced-motion;
 * a looping background is exactly the kind of decorative motion that
 * rule exists for), which markup alone cannot express. */
function heroVisual(hero: DemoAssetView): string {
  if (!hero.videoSrc) return pictureTag(hero, "hero-media", true);
  const poster = hero.videoPoster ?? hero.src;

  // Preferred treatment when the all-intra encode exists: the hero
  // background IS the scroll-scrubbed clip (scrollVideoScript pins the
  // hero and drives currentTime from scroll position, forwards on the
  // way down and backwards on the way up). No autoplay — this one never
  // plays on its own — but preload="auto", since scrubbing only feels
  // solid once the whole clip is buffered.
  if (hero.videoScrubSrc) {
    return `<video class="hero-media hero-video" data-scroll-video-media muted playsinline preload="auto" poster="${escapeHtml(poster)}" aria-hidden="true" tabindex="-1">
      <source src="${escapeHtml(hero.videoScrubSrc)}" type="video/mp4" />
    </video>`;
  }
  // aria-hidden, deliberately: this is a decorative background loop —
  // the hero heading beside it carries the actual meaning. Reusing the
  // hero image's alt text here would also be a lie, since that text
  // describes a photo from the lead's own site while the video is
  // AI-generated (and carries the burned-in DEMO badge to say so).
  return `<video class="hero-media hero-video" data-hero-video autoplay muted loop playsinline preload="metadata" poster="${escapeHtml(poster)}" aria-hidden="true" tabindex="-1">
      <source src="${escapeHtml(hero.videoSrc)}" type="video/mp4" />
    </video>`;
}

function heroSection(
  name: string,
  tagline: string,
  hero: DemoAssetView | undefined,
  profile: VisualProfile,
  heroStyle: HeroStyle,
  ctaIntensity: CtaIntensity,
  contactHref: string,
  secondaryHref: string | null,
  secondaryLabel: string
): string {
  const position = heroTextPosition(profile, heroStyle);
  const is3d = heroStyle === "3d";
  const isColorBlock = heroStyle === "color-block";

  // With the page-wide video behind everything, the hero must render no
  // visual of its own: a hero image here would simply cover the very
  // footage it is meant to reveal.
  const pageVideoActive = Boolean(hero?.videoScrubSrc);

  const visual = is3d
    ? `<canvas id="scene3d" class="hero-canvas" aria-hidden="true"></canvas>`
    : isColorBlock || pageVideoActive
    ? ""
    : hero
    ? heroVisual(hero)
    : "";

  const scrim = isColorBlock ? "" : `<div class="hero-scrim"></div>`;
  const heroClass = `hero ${position}${isColorBlock ? " hero-color-block" : ""}`;
  const fluid = profile.motion !== "none" ? fluidFlowLayer() : "";
  // The hero is no longer the scrub target — pageVideoBackground owns
  // the clip now, fixed behind the whole document.
  const scrubbed = "";

  return `
  <section class="${heroClass}"${scrubbed}>
    <div class="hero-bg">${visual}${fluid}</div>
    ${scrim}
    <div class="hero-content${fluid ? " hero-content--floating" : ""}">
      <h1 data-reveal style="--stagger-index:0">${kineticWords(name)}</h1>
      <p class="hero-tagline" data-reveal style="--stagger-index:1">${escapeHtml(tagline)}</p>
      <div data-reveal style="--stagger-index:2">${heroActions(ctaIntensity, contactHref, secondaryHref, secondaryLabel)}</div>
    </div>
  </section>`;
}

/** Typography-only hero — zero imagery, one huge multi-line statement.
 * Real technique from Rezo Zero (rezo-zero.com, logged in design-
 * inspiration-playbook.md): "confident restraint rather than needing a
 * photo to fill the space." Reuses the same real name/tagline every
 * other hero uses — nothing invented, just a different, bolder
 * presentation of the same real copy for profiles wanting restrained
 * confidence instead of a photo-led hero. */
export function typographyHeroSection(
  name: string,
  tagline: string,
  ctaIntensity: CtaIntensity,
  contactHref: string,
  secondaryHref: string | null,
  secondaryLabel: string
): string {
  return `
  <section class="typo-hero">
    <div class="typo-hero-content">
      <h1 data-reveal style="--stagger-index:0">${kineticWords(name)}</h1>
      <p class="typo-hero-tagline" data-reveal style="--stagger-index:1">${kineticWords(tagline)}</p>
      <div data-reveal style="--stagger-index:2">${heroActions(ctaIntensity, contactHref, secondaryHref, secondaryLabel)}</div>
    </div>
  </section>`;
}

/** Scalloped/capsule image-mask columns — real technique from Filmbot
 * (filmbot.com, logged in design-inspiration-playbook.md): hero
 * photography clipped into repeating pill-shaped columns at alternating
 * heights, a film-strip motif, instead of one plain rectangular crop.
 * Pure CSS (border-radius + transform), no clip-path polygon math
 * needed since a tall narrow rect with a very large border-radius
 * already reads as a capsule/pill. */
export function scallopedHeroSection(items: DemoAssetView[], name: string, tagline: string): string {
  const offsets = [0, 48, -24, 32];
  const columns = items
    .map((asset, i) => {
      const offset = offsets[i % offsets.length];
      return `<div class="scalloped-col" style="--offset:${offset}px">${pictureTag(asset, "scalloped-col-image", i === 0)}</div>`;
    })
    .join("");
  return `
  <section class="scalloped-hero">
    <div class="scalloped-hero-text" data-reveal>
      <h1>${kineticWords(name)}</h1>
      <p>${escapeHtml(tagline)}</p>
    </div>
    <div class="scalloped-columns">${columns}</div>
  </section>`;
}

/** Full-bleed scrolling keyword marquee — real technique from Qissa (A
 * Tale of Food, qissa.co.uk, logged in design-inspiration-playbook.md):
 * a rhythm-break section divider using pure text, no imagery. Real
 * service labels only (`deriveServiceLabels`/`services[]`), never
 * invented brand keywords. `aria-hidden` because the same labels are
 * already announced accessibly in the real services list elsewhere —
 * this is a decorative repeat, not the only place the content exists. */
export function marqueeSection(words: string[]): string {
  if (words.length === 0) return "";
  const track = words.map((w) => `<span>${escapeHtml(w)}</span><span class="marquee-dot">✦</span>`).join("");
  return `
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">${track}${track}</div>
  </div>`;
}

/** A small handwritten-script aside layered above the main headline —
 * real technique from Serenity Hair (serenityhairblaxland.com.au,
 * logged in design-inspiration-playbook.md): a cheap, warm personal
 * touch for approachable/friendly industries, separate from the formal
 * headline itself. Generic welcoming copy only (never a specific claim
 * about the business) — same discipline as every other UI-chrome string
 * already in this file (e.g. heroActions' CTA labels). Loads its own
 * cursive Google Font since profile.typography never plans for a third
 * script face. */
export function scriptAsideFontLink(): string {
  return `<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap" rel="stylesheet" />`;
}

export function scriptAside(text = "Willkommen!"): string {
  return `<span class="hero-script-aside" data-reveal aria-hidden="true">${escapeHtml(text)}</span>`;
}

/** Gooey/metaball blob hero — real technique from Podium (podium.global,
 * logged in design-inspiration-playbook.md): blurred circular shapes
 * merged into one amoeba-like silhouette via the classic SVG
 * feGaussianBlur+feColorMatrix "goo" filter, with the real hero photo
 * shown inside a circular cutout centered on the merged shape rather
 * than a fragile true SVG clip — bold and avant-garde, legitimate for
 * `energetic-punch` profiles specifically (the playbook itself flags
 * this as "too loud for most trades"), never the default hero. */
export function gooeyHeroSection(hero: DemoAssetView | undefined, name: string, tagline: string): string {
  const photo = hero ? `<div class="gooey-photo">${pictureTag(hero, "gooey-photo-image", true)}</div>` : "";
  return `
  <section class="gooey-hero">
    <svg class="gooey-defs" aria-hidden="true" focusable="false">
      <filter id="goo">
        <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
      </filter>
    </svg>
    <div class="gooey-stage">
      <div class="gooey-blobs">
        <span class="gooey-blob gooey-blob--a"></span>
        <span class="gooey-blob gooey-blob--b"></span>
        <span class="gooey-blob gooey-blob--c"></span>
      </div>
      ${photo}
    </div>
    <div class="gooey-hero-text" data-reveal>
      <h1>${kineticWords(name)}</h1>
      <p>${escapeHtml(tagline)}</p>
    </div>
  </section>`;
}

const TAB_ICONS: Record<string, string> = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  services: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  about: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>`,
  contact: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`,
};

export type TabBarStyle = "light" | "glass" | "dark";

export interface TabBarItem {
  href: string;
  label: string;
  icon: keyof typeof TAB_ICONS;
  active: boolean;
}

/** Floating tab bar with a sliding active indicator — rebuilt from the
 * "Navigation Tabs V3" reference. Three treatments share one mechanism:
 * the indicator is a single element that moves to sit behind (or above)
 * whichever tab is active, rather than each tab animating its own
 * background. That is what makes the movement read as one object
 * travelling instead of two states cross-fading.
 *
 * - light: dot above the active tab, icon and label tint to the accent
 * - glass: filled circle slides behind the active icon
 * - dark:  capsule slides and the active tab reveals its label
 *
 * Real page links, so this is genuine navigation and not decoration —
 * and on a phone it doubles as a reachable bottom bar. */
export function floatingTabBar(items: TabBarItem[], style: TabBarStyle = "dark"): string {
  if (items.length === 0) return "";
  const tabs = items
    .map(
      (item, i) => `
      <a class="tab-item${item.active ? " is-active" : ""}" href="${escapeHtml(item.href)}" data-tab-index="${i}"${item.active ? ' aria-current="page"' : ""}>
        <span class="tab-icon">${TAB_ICONS[item.icon] ?? TAB_ICONS.home}</span>
        <span class="tab-label">${escapeHtml(item.label)}</span>
      </a>`
    )
    .join("");
  return `
  <nav class="tab-bar tab-bar--${style}" aria-label="Schnellnavigation">
    <span class="tab-indicator" aria-hidden="true"></span>
    ${tabs}
  </nav>`;
}

export function floatingTabBarScript(): string {
  return `
  <script>
    (function () {
      var bar = document.querySelector('.tab-bar');
      if (!bar) return;
      var indicator = bar.querySelector('.tab-indicator');
      var tabs = Array.prototype.slice.call(bar.querySelectorAll('.tab-item'));
      if (!indicator || tabs.length === 0) return;

      function moveTo(tab) {
        // Measured against the bar, not the page, so it stays correct
        // wherever the bar is positioned or scrolled.
        var barBox = bar.getBoundingClientRect();
        var box = tab.getBoundingClientRect();
        indicator.style.width = box.width + 'px';
        indicator.style.transform = 'translateX(' + (box.left - barBox.left) + 'px)';
      }

      var current = bar.querySelector('.tab-item.is-active') || tabs[0];

      // Position without animating on first paint: the indicator should
      // already be under the current page, not slide in from the left.
      indicator.style.transition = 'none';
      moveTo(current);
      // Two frames, so the no-transition placement is actually painted
      // before transitions are re-enabled.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { indicator.style.transition = ''; });
      });

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        tabs.forEach(function (tab) {
          tab.addEventListener('mouseenter', function () { moveTo(tab); });
        });
        bar.addEventListener('mouseleave', function () { moveTo(current); });
      }
      tabs.forEach(function (tab) {
        tab.addEventListener('focus', function () { moveTo(tab); });
      });
      bar.addEventListener('focusout', function () { moveTo(current); });
      window.addEventListener('resize', function () { moveTo(current); });
    })();
  </script>`;
}

/** Dark full-bleed hero with the headline stacked hard left in heavy
 * uppercase, a short supporting line set small on the right, and small
 * meta labels along the bottom — the hero composition from the dentist
 * reference.
 *
 * The headline is broken onto its own lines rather than left to wrap,
 * because the whole effect depends on the stack reading as a block. */
export function stackedHeroSection(
  headline: string,
  supporting: string,
  metaLeft: string,
  metaRight: string,
  hero: DemoAssetView | undefined
): string {
  const lines = headline
    .toUpperCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => `<span class="stacked-hero-line">${escapeHtml(word)}</span>`)
    .join("");
  const media = hero ? pictureTag(hero, "stacked-hero-media", true) : "";
  return `
  <section class="stacked-hero">
    <div class="stacked-hero-bg">${media}</div>
    <div class="stacked-hero-scrim"></div>
    <div class="stacked-hero-inner">
      <h1 class="stacked-hero-headline" data-reveal>${lines}</h1>
      <p class="stacked-hero-supporting" data-reveal>${escapeHtml(supporting)}</p>
      <div class="stacked-hero-meta" data-reveal>
        <span>${escapeHtml(metaLeft)}</span>
        <span>${escapeHtml(metaRight)}</span>
      </div>
    </div>
  </section>`;
}

/** Expanding horizontal treatment accordion — the signature section of
 * the dentist reference the user asked to rebuild: a row of full-height
 * image panels where the active one widens and the others compress to
 * slivers, each carrying its own label.
 *
 * Panels are <button>s, not divs: this is a real control (it changes
 * what is shown), so it has to be reachable and operable by keyboard,
 * and aria-expanded has to say which one is open. Hover activates it
 * too for pointer users, but hover is never the only way in.
 *
 * Labels are the lead's own real service names — the same `services[]`
 * every other section uses, nothing invented per panel. */
export function treatmentAccordionSection(
  items: Array<{ asset: DemoAssetView; label: string }>,
  heading: string
): string {
  if (items.length === 0) return "";
  const panels = items
    .map(
      (item, i) => `
      <button type="button" class="treatment-panel${i === 0 ? " is-active" : ""}" data-treatment-panel aria-expanded="${i === 0 ? "true" : "false"}">
        ${pictureTag(item.asset, "treatment-panel-image", i === 0)}
        <span class="treatment-panel-label">${escapeHtml(item.label)}</span>
      </button>`
    )
    .join("");
  return `
  <section class="treatment-accordion" data-reveal>
    <h2>${kineticWords(heading)}</h2>
    <div class="treatment-row">${panels}</div>
  </section>`;
}

export function treatmentAccordionScript(): string {
  return `
  <script>
    (function () {
      var panels = Array.prototype.slice.call(document.querySelectorAll('[data-treatment-panel]'));
      if (panels.length < 2) return;

      function activate(target) {
        panels.forEach(function (p) {
          var on = p === target;
          p.classList.toggle('is-active', on);
          p.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
      }

      panels.forEach(function (panel) {
        panel.addEventListener('click', function () { activate(panel); });
        // Focus, not just hover, so keyboard tabbing opens panels the
        // same way a pointer does.
        panel.addEventListener('focus', function () { activate(panel); });
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          panel.addEventListener('mouseenter', function () { activate(panel); });
        }
      });
    })();
  </script>`;
}

/** The scrubbed clip as the background of the WHOLE page, not just the
 * hero: one fixed full-viewport layer behind every section, with the
 * entire document's scroll range driving `currentTime`.
 *
 * Fixed positioning rather than a pinned section, deliberately — a pin
 * only holds the video for its own stretch of the page, which is what
 * makes it read as "a video section" instead of a background. Fixed
 * means every section scrolls over the same continuous footage.
 *
 * Sections have to become transparent for any of this to be visible,
 * which is what `.page-video-mode` in the stylesheet does, along with
 * turning cards into glass panels and forcing light type — a moving
 * background is the one case where the profile's own light-mode colours
 * cannot stay as they are and still be readable. */
export function pageVideoBackground(asset: DemoAssetView): string {
  const src = asset.videoScrubSrc ?? asset.videoSrc;
  if (!src) return "";
  const poster = asset.videoPoster ?? asset.src;
  // No <source> in the markup on purpose: the scrub encode is all-intra
  // and runs to tens of megabytes, which is fine on a desktop that is
  // about to scrub through it and completely unacceptable on a phone
  // over cellular. The script attaches the source only on pointer
  // devices with room for it; everywhere else the poster frame stays,
  // which costs a normal image and still looks composed.
  return `
  <div class="page-video" aria-hidden="true">
    <video class="page-video-media" data-scroll-video-media data-video-src="${escapeHtml(src)}" muted playsinline preload="none" poster="${escapeHtml(poster)}"></video>
    <div class="page-video-scrim"></div>
  </div>`;
}

/** Scroll-scrubbed background video — the "Webflow/Apple" treatment:
 * the video is pinned full-bleed behind the content and does not play
 * on its own; scroll position drives `currentTime` directly, so
 * scrolling down runs it forward and scrolling back up runs it in
 * reverse.
 *
 * Uses the all-intra `videoScrubSrc` encode, not the normal one — with
 * a normal ~2s GOP the browser has to decode forward from a distant
 * keyframe on every seek, which visibly stutters. Falls back to the
 * regular encode if the scrub variant is missing.
 *
 * `preload="auto"` and no `autoplay`: nothing here ever plays linearly,
 * but the whole clip must be buffered before scrubbing feels solid. */
export function scrollVideoSection(asset: DemoAssetView, headline: string, body: string): string {
  const src = asset.videoScrubSrc ?? asset.videoSrc;
  if (!src) return "";
  const poster = asset.videoPoster ?? asset.src;
  return `
  <section class="scroll-video" data-scroll-video>
    <div class="scroll-video-stage">
      <video class="scroll-video-media" data-scroll-video-media muted playsinline preload="auto" poster="${escapeHtml(poster)}" aria-hidden="true" tabindex="-1">
        <source src="${escapeHtml(src)}" type="video/mp4" />
      </video>
      <div class="scroll-video-scrim"></div>
      <div class="scroll-video-content">
        <h2>${kineticWords(headline)}</h2>
        <p>${escapeHtml(body)}</p>
      </div>
    </div>
  </section>`;
}

export function scrollVideoScript(): string {
  return `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/ScrollTrigger.min.js"></script>
  <script>
    (function () {
      var pageLayer = document.querySelector('.page-video');
      var section = document.querySelector('[data-scroll-video]');
      var video = document.querySelector('[data-scroll-video-media]');
      var pageWide = Boolean(pageLayer);
      if (!video || (!pageWide && !section)) return;

      // Every reason not to scrub is checked BEFORE the source is
      // attached, so a visitor who will never see the animation never
      // pays to download it. Reduced motion and a missing GSAP both
      // leave the poster frame showing, which is a complete, composed
      // background on its own.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

      // Gate the download itself, not just the animation. The scrub
      // encode is all-intra and runs to tens of megabytes — fine on a
      // desktop about to scrub through it, indefensible on a phone over
      // cellular.
      //
      // Pointer type is the load-bearing test: a fine hovering pointer
      // means a mouse, which means a machine on a desktop connection.
      // Width is only a floor against a genuinely tiny window — set at
      // 768 it wrongly starved a 760px-wide desktop window, so it sits
      // below any real phone in landscape instead.
      var deserved =
        window.matchMedia('(min-width: 640px)').matches &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      var deferredSrc = video.getAttribute('data-video-src');
      if (deferredSrc) {
        if (!deserved) return; // poster frame stays, nothing downloaded
        video.setAttribute('preload', 'auto');
        video.src = deferredSrc;
        video.load();
      }

      try {
        gsap.registerPlugin(ScrollTrigger);

        function buildPageWide() {
          var duration = video.duration;
          if (!duration || !isFinite(duration)) return;
          // No pin: the layer is already position:fixed, so the whole
          // document's scroll range maps straight onto the clip and the
          // footage stays behind every section from top to bottom.
          gsap.to(video, {
            currentTime: duration,
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.4,
              invalidateOnRefresh: true,
            },
          });
        }

        function build() {
          if (pageWide) return buildPageWide();

          // duration is NaN until metadata lands, and the scroll
          // distance is derived from it, so everything waits for it.
          var duration = video.duration;
          if (!duration || !isFinite(duration)) return;

          section.classList.add('scroll-video--active');

          // Scroll travel is derived from the frame count, not the
          // duration: what a visitor perceives as smooth is how many
          // pixels pass between two distinct frames. The scrub encode
          // is interpolated to 60fps, so ~8px per frame keeps stepping
          // below the threshold where it reads as chunky, while still
          // giving the section real presence. (Duration alone would
          // make a longer clip feel coarser, not smoother.)
          var PX_PER_FRAME = 8;
          var frameCount = Math.round(duration * 60);
          var distance = Math.max(window.innerHeight, Math.round(frameCount * PX_PER_FRAME));

          gsap.to(video, {
            currentTime: duration,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=' + distance,
              pin: true,
              scrub: 0.4,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
        }

        // Wait for enough buffer before pinning, and prime the decoder
        // first. Measured: scrubbing a settled clip holds a steady 60fps
        // (median 16.7ms), but the very first seek on an unprimed video
        // cost a ~1000ms stall — which would land exactly when the
        // visitor first scrolls in. Priming with a muted play/pause
        // forces the decode path to be ready before the pin exists, so
        // that cost is paid off-screen instead.
        function prime() {
          var started = video.play();
          if (started && typeof started.then === 'function') {
            started.then(function () { video.pause(); video.currentTime = 0; build(); }).catch(build);
          } else {
            video.pause();
            build();
          }
        }

        video.pause();
        if (video.readyState >= 3) prime();
        else video.addEventListener('canplaythrough', prime, { once: true });
      } catch (e) {
        // GSAP blocked — the section stays a normal, non-pinned block
        // showing the poster frame.
      }
    })();
  </script>`;
}

/** Rotating circular seal badge — real technique from ERA Residence
 * (era-residence.com, Awwwards Site of the Month Aug 2026; logged in
 * design-inspiration-playbook.md). The brand name set on a circle
 * around a small emblem, rotating slowly. Uses the lead's own real
 * company name and nothing else — no invented tagline, no fake
 * "established 1985" ring, which is the usual way seals start lying.
 *
 * The name is repeated until it fills the circle so short names don't
 * leave a bald arc, separated by a diamond. SVG textPath rather than
 * per-letter rotated spans: one element, correct kerning along the
 * curve, and it scales cleanly. */
export function rotatingSealBadge(companyName: string): string {
  const name = companyName.trim().toUpperCase();
  const SEPARATOR = "  ✦  ";

  // Fit the text to the ring rather than guessing: the path below has
  // r=42, so it is 2*pi*42 ≈ 264 user units around. At this weight and
  // tracking a character advances ≈ 0.71 * fontSize, so 264 units hold
  // about 41 characters at the 9px base size. Repeat the name as often
  // as fits (a short name shouldn't leave a bald arc), then shrink the
  // type if even one lap would overflow — which is what a long company
  // name would otherwise do, overlapping itself at the 12 o'clock join.
  const CIRCUMFERENCE = 2 * Math.PI * 42;
  const ADVANCE_RATIO = 0.71;
  const BASE_FONT = 9;

  const perRepeat = name.length + SEPARATOR.length;
  const capacity = Math.floor(CIRCUMFERENCE / (BASE_FONT * ADVANCE_RATIO));
  const repeats = Math.max(1, Math.min(4, Math.floor(capacity / Math.max(perRepeat, 1))));
  const ring = Array.from({ length: repeats }, () => name + SEPARATOR).join("");
  const fontSize = Math.min(BASE_FONT, CIRCUMFERENCE / (ring.length * ADVANCE_RATIO));

  return `
  <div class="seal-badge" aria-hidden="true">
    <svg viewBox="0 0 120 120" class="seal-badge-ring">
      <defs>
        <path id="seal-ring-path" d="M60,60 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0" fill="none" />
      </defs>
      <text class="seal-badge-text" style="font-size:${fontSize.toFixed(2)}px"><textPath href="#seal-ring-path">${escapeHtml(ring)}</textPath></text>
    </svg>
    <svg viewBox="0 0 24 24" class="seal-badge-emblem" fill="currentColor">
      <circle cx="12" cy="7" r="4.2" /><circle cx="12" cy="17" r="4.2" />
      <circle cx="7" cy="12" r="4.2" /><circle cx="17" cy="12" r="4.2" />
    </svg>
  </div>`;
}

/** Scattered (non-grid) photo gallery — real principle from Gionatan
 * Nese's draggable mood-board (gionatannese.com, logged in design-
 * inspiration-playbook.md): "a gallery doesn't have to be a rigid
 * grid." The full draggable/pannable canvas is too fragile for a local-
 * business demo (per the playbook's own note), so this keeps only the
 * static loosely-scattered arrangement — each photo at a slight
 * alternating rotation/vertical offset, straightening on hover, a
 * scrapbook feel distinct from Filmbot's uniform-height capsule columns
 * (scallopedHeroSection) despite both being "non-rectangular" ideas. */
export interface ScatteredGalleryItem {
  asset: DemoAssetView;
  headline: string;
}

export function scatteredGallerySection(items: ScatteredGalleryItem[], label: string): string {
  if (items.length === 0) return "";
  const rotations = [-6, 4, -3, 7, -5, 3];
  const shifts = [0, 28, -14, 18, -22, 10];
  const cards = items
    .map((item, i) => {
      const rot = rotations[i % rotations.length];
      const shift = shifts[i % shifts.length];
      return `
      <figure class="scattered-item" data-reveal style="--stagger-index:${i}">
        <div class="scattered-item-inner" style="--rot:${rot}deg;--shift:${shift}px">
          ${pictureTag(item.asset, "scattered-item-image")}
          <figcaption>${escapeHtml(item.headline)}</figcaption>
        </div>
      </figure>`;
    })
    .join("");
  return `
  <section class="scattered-gallery" data-reveal>
    <span class="editorial-eyebrow">${escapeHtml(label)}</span>
    <div class="scattered-gallery-grid">${cards}</div>
  </section>`;
}

/** Mouse-reactive "water-flow" decoration (mission follow-up: "schwebende
 * wasserflow (extremflüssig) einbauen ... es muss wirklich alles animiert
 * werden sogar die texte"). Two real, distinct techniques, not one relabeled
 * as two: (1) blurred color blobs distorted by an animated SVG turbulence/
 * displacement filter, mouse-position drives them via damped (spring-like)
 * lerping in fluidFlowScript rather than 1:1 tracking — see emil-design-eng's
 * "spring-based mouse interactions" (raw tracking "feels artificial"); (2)
 * .hero-content--floating gets its own, much smaller, independently-damped
 * parallax offset so the real headline/tagline genuinely float with the
 * cursor too, without ever running the distortion filter over legible text
 * (that would hurt readability — ui-ux-pro-max color-contrast/readability). */
function fluidFlowLayer(): string {
  return `
    <svg class="fluid-flow-defs" aria-hidden="true" focusable="false">
      <filter id="fluid-distort" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="7" result="noise">
          <animate attributeName="baseFrequency" dur="22s" values="0.008 0.014;0.016 0.022;0.008 0.014" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
    <div class="fluid-flow" aria-hidden="true">
      <span class="fluid-blob fluid-blob--a"></span>
      <span class="fluid-blob fluid-blob--b"></span>
      <span class="fluid-blob fluid-blob--c"></span>
    </div>`;
}

function fluidFlowScript(): string {
  return `
  <script>
    (function () {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var hero = document.querySelector('.hero');
      var blobs = document.querySelectorAll('.fluid-blob');
      var floatEl = document.querySelector('.hero-content--floating');
      var displacement = document.querySelector('#fluid-distort feDisplacementMap');
      if (!hero || blobs.length === 0) return;

      var targetX = 0.5, targetY = 0.5;
      var blobDamped = [{x:0.5,y:0.5},{x:0.5,y:0.5},{x:0.5,y:0.5}];
      var floatDamped = { x: 0, y: 0 };
      var velocity = 0;
      var lastMoveAt = performance.now();

      hero.addEventListener('mousemove', function (e) {
        var rect = hero.getBoundingClientRect();
        var nx = (e.clientX - rect.left) / rect.width;
        var ny = (e.clientY - rect.top) / rect.height;
        velocity = Math.min(1, Math.hypot(nx - targetX, ny - targetY) * 14);
        targetX = nx;
        targetY = ny;
        lastMoveAt = performance.now();
      }, { passive: true });

      var damping = [0.05, 0.035, 0.02];
      var reach = [26, 40, 58];

      function tick() {
        var idleFor = performance.now() - lastMoveAt;
        var settle = idleFor > 1200 ? 0.4 : 0;
        for (var i = 0; i < blobs.length; i++) {
          var d = blobDamped[i];
          d.x += (targetX - d.x) * damping[i];
          d.y += (targetY - d.y) * damping[i];
          var dx = (d.x - 0.5) * reach[i];
          var dy = (d.y - 0.5) * reach[i];
          blobs[i].style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
        }
        if (floatEl) {
          floatDamped.x += ((targetX - 0.5) * 14 - floatDamped.x) * 0.045;
          floatDamped.y += ((targetY - 0.5) * 10 - floatDamped.y) * 0.045;
          floatEl.style.transform = 'translate(' + floatDamped.x.toFixed(2) + 'px, ' + floatDamped.y.toFixed(2) + 'px)';
        }
        if (displacement) {
          var restingScale = 16 + settle * 6;
          var scale = restingScale + velocity * 42;
          displacement.setAttribute('scale', scale.toFixed(1));
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    })();
  </script>`;
}

function serviceCard(label: string, asset: DemoAssetView | undefined, featured: boolean, index: number): string {
  if (asset) {
    return `
    <li class="service-card service-card--media ${featured ? "service-card--featured" : ""}" data-reveal style="--stagger-index:${index}">
      ${pictureTag(asset, "service-media")}
      <div class="service-card-label"><span>${ICONS.check}</span>${escapeHtml(label)}</div>
    </li>`;
  }
  return `
    <li class="service-card" data-reveal style="--stagger-index:${index}">
      <span class="service-icon">${ICONS.check}</span>
      <span>${escapeHtml(label)}</span>
    </li>`;
}

/** Numbered stacked feature list — no cards, no icons, no images (real
 * technique from The Nest, thenest.pl, logged in design-inspiration-
 * playbook.md's GSAP/Awwwards section). Gated on the exact
 * `brandImpression` string `professionalProfile()` gives Rechtsanwalt/
 * Steuerberater — "confidence needs no decoration" fits their
 * restrained, formal tone, matching the same signal The Nest's own
 * calm real-estate/office-service copy used. Deliberately omits the
 * per-item paragraph + link The Nest's real version has: this project
 * only has real short service LABELS (`services[]`), never invented
 * one-sentence descriptions or destinations to link to — same real
 * copy pattern as everywhere else, just a leaner honest subset of the
 * source technique. */
function numberedFeatureList(services: string[]): string {
  const items = services
    .map(
      (label, i) => `
    <div class="numbered-feature" data-reveal style="--stagger-index:${i}">
      <span class="numbered-feature-index">— ${String(i + 1).padStart(2, "0")}</span>
      <h3>${kineticWords(label)}</h3>
    </div>`
    )
    .join("");
  return `<div class="numbered-features">${items}</div>`;
}

function servicesSection(services: string[], assets: DemoAssetView[], heading: string, brandImpression: string): string {
  const numbered = brandImpression === "seriös, autoritär, vertrauenswürdig";
  const body = numbered
    ? numberedFeatureList(services)
    : `<ul class="services-grid">${services.map((label, i) => serviceCard(label, assets[i], i === 0 && assets.length > 0, i)).join("")}</ul>`;
  return `
  <section id="leistungen" class="services${numbered ? " services--numbered" : ""}">
    <h2 data-reveal>${kineticWords(heading)}</h2>
    ${body}
  </section>`;
}

function editorialRow(asset: DemoAssetView, index: number, headline: string, body: string): string {
  const reversed = index % 2 === 1;
  return `
  <div class="editorial-row ${reversed ? "editorial-row--reverse" : ""}" data-reveal>
    <button type="button" class="editorial-media editorial-lightbox-trigger" data-lightbox-group="editorial" data-headline="${escapeHtml(headline)}" data-body="${escapeHtml(body)}" aria-label="${escapeHtml(headline)} – Bild vergrößern">
      ${pictureTag(asset, "editorial-image")}
      <span class="lightbox-zoom-hint" aria-hidden="true">${ICONS.zoom}</span>
    </button>
    <div class="editorial-text">
      <h3>${kineticWords(headline)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
  </div>`;
}

/** The editorial gallery's "WOW moment" (mission sections 11 + 12): a
 * real interaction, not just a static row of images. Every editorial
 * photo opens full-screen with its own real caption (the same copy
 * already printed beside it inline — nothing invented for the lightbox)
 * and keyboard/pointer navigation between every editorial image on that
 * page. `galleryLabel` gives the gallery an industry-honest name —
 * "Atmosphäre" for hospitality, "Galerie" for elegant trades, etc. (see
 * galleryLabelFor) — instead of one generic label for every business. */
/** The same headline/body pairs editorialSection cycles through,
 * extracted so the React demo engine's export (export-react-data.ts)
 * can reuse the exact real copy instead of duplicating it. */
export function buildEditorialRows(name: string, location: string, count: number): Array<{ headline: string; body: string }> {
  const headlines = ["Ein Ort mit Charakter", "Erfahrung, die man sieht", "Details, die zählen"];
  const bodies = [
    `${name} legt Wert auf Atmosphäre und Sorgfalt – spürbar in jedem Detail vor Ort in ${location}.`,
    `Wer ${name} besucht, merkt schnell: hier steckt echte Erfahrung und Aufmerksamkeit dahinter.`,
    `Kleine Details machen den Unterschied – genau die, die ${name} täglich im Blick hat.`,
  ];
  return Array.from({ length: count }, (_, i) => ({
    headline: headlines[i % headlines.length],
    body: bodies[i % bodies.length],
  }));
}

function editorialSection(assets: DemoAssetView[], name: string, location: string, galleryLabel: string): string {
  if (assets.length === 0) return "";
  const captions = buildEditorialRows(name, location, assets.length);
  const rows = assets.map((asset, i) => editorialRow(asset, i, captions[i].headline, captions[i].body)).join("");
  return `<section class="editorial">
    <span class="editorial-eyebrow" data-reveal>${escapeHtml(galleryLabel)}</span>
    ${rows}
  </section>
  ${lightboxMarkup(galleryLabel)}`;
}

function lightboxMarkup(label: string): string {
  return `
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-hidden="true" aria-label="${escapeHtml(label)}">
    <button type="button" class="lightbox-close" aria-label="Schließen">${ICONS.close}</button>
    <button type="button" class="lightbox-nav lightbox-prev" aria-label="Vorheriges Bild">${ICONS.arrowLeft}</button>
    <button type="button" class="lightbox-nav lightbox-next" aria-label="Nächstes Bild">${ICONS.arrowRight}</button>
    <figure class="lightbox-figure">
      <img class="lightbox-image" src="" alt="" />
      <figcaption>
        <span class="lightbox-caption-title"></span>
        <span class="lightbox-caption-body"></span>
      </figcaption>
    </figure>
  </div>`;
}

/** Purely additive: with no `.editorial-lightbox-trigger` on the page
 * (rendered only when this page actually includes the editorial section
 * — see the bodyHtml check at the renderPage call site) this script is
 * never even injected. */
function lightboxScript(): string {
  return `
  <script>
    (function () {
      var triggers = Array.prototype.slice.call(document.querySelectorAll('.editorial-lightbox-trigger'));
      var lightbox = document.getElementById('lightbox');
      if (triggers.length === 0 || !lightbox) return;
      var img = lightbox.querySelector('.lightbox-image');
      var titleEl = lightbox.querySelector('.lightbox-caption-title');
      var bodyEl = lightbox.querySelector('.lightbox-caption-body');
      var closeBtn = lightbox.querySelector('.lightbox-close');
      var prevBtn = lightbox.querySelector('.lightbox-prev');
      var nextBtn = lightbox.querySelector('.lightbox-next');
      if (triggers.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
      }
      var activeIndex = 0;
      var lastFocused = null;

      function show(index) {
        activeIndex = (index + triggers.length) % triggers.length;
        var trigger = triggers[activeIndex];
        var sourceImg = trigger.querySelector('img');
        img.setAttribute('src', sourceImg.currentSrc || sourceImg.src);
        img.setAttribute('alt', sourceImg.getAttribute('alt') || '');
        titleEl.textContent = trigger.getAttribute('data-headline') || '';
        bodyEl.textContent = trigger.getAttribute('data-body') || '';
      }

      function open(index) {
        lastFocused = document.activeElement;
        show(index);
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
      }

      function close() {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }

      triggers.forEach(function (trigger, i) {
        trigger.addEventListener('click', function () { open(i); });
      });
      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', function () { show(activeIndex - 1); });
      nextBtn.addEventListener('click', function () { show(activeIndex + 1); });
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) close();
      });
      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(activeIndex - 1);
        if (e.key === 'ArrowRight') show(activeIndex + 1);
      });
    })();
  </script>`;
}

export interface AngledCarouselItem {
  asset: DemoAssetView;
  headline: string;
  body: string;
}

/** A "schräger Karussell" (tilted carousel) — prototype built for live
 * review on one real lead (Tobias Grünert, Immobilienmakler) before any
 * decision on rolling it out as a real ConceptVariant/NavigationConcept
 * option; not yet wired into the variant-selection system on purpose.
 * Each card sits at a slight alternating tilt (a scattered, editorial
 * feel) and straightens on hover; the row scrolls horizontally as the
 * visitor scrolls the page vertically via GSAP's standard "pin the
 * section + scrub the track's translateX" pattern — a single
 * GPU-composited transform per frame, the only way to hold 60fps
 * through a section this size (no layout-triggering properties
 * anywhere in the animation). Falls back to a plain native
 * horizontally-scrollable row if GSAP fails to load. Real captions
 * only — same real copy pattern as buildEditorialRows(), nothing
 * invented for this prototype. */
export function angledCarouselSection(items: AngledCarouselItem[], label: string): string {
  if (items.length === 0) return "";
  const tilts = [-4, 3, -2, 5, -3, 2];
  const cards = items
    .map((item, i) => {
      const tilt = tilts[i % tilts.length];
      return `
      <div class="angled-card" style="--tilt:${tilt}deg">
        <div class="angled-card-media">${pictureTag(item.asset, "angled-card-image")}</div>
        <div class="angled-card-caption">
          <h3>${kineticWords(item.headline)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </div>
      </div>`;
    })
    .join("");
  return `
  <section class="angled-carousel" data-reveal>
    <span class="editorial-eyebrow">${escapeHtml(label)}</span>
    <div class="angled-carousel-viewport">
      <div class="angled-carousel-track">${cards}</div>
    </div>
  </section>`;
}

export function angledCarouselScript(): string {
  return `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/ScrollTrigger.min.js"></script>
  <script>
    (function () {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      try {
        gsap.registerPlugin(ScrollTrigger);
        var wrap = document.querySelector('.angled-carousel-viewport');
        var track = document.querySelector('.angled-carousel-track');
        if (!wrap || !track) return;
        var tween = null;
        function build() {
          var distance = track.scrollWidth - wrap.clientWidth;
          if (distance <= 0) return null;
          return gsap.to(track, {
            x: -distance,
            ease: 'none',
            scrollTrigger: {
              trigger: wrap,
              start: 'top top',
              end: '+=' + distance,
              scrub: 0.5,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
        }
        tween = build();
        window.addEventListener('resize', function () {
          if (tween && tween.scrollTrigger) { tween.scrollTrigger.kill(); tween.kill(); }
          gsap.set(track, { x: 0 });
          tween = build();
        });
      } catch (e) {
        // GSAP unavailable/blocked — .angled-carousel-viewport's own
        // overflow-x:auto keeps the cards reachable as a plain
        // horizontally-scrollable row instead of a scroll-pinned track.
      }
    })();
  </script>`;
}

/** A real 1:1 replica of a genuine Awwwards technique (dsgn interior,
 * dsgninterior.se — logged in design-inspiration-playbook.md's "GSAP /
 * Awwwards animation flows" section): the section pins in place while
 * a full-bleed background photo crossfades through a real sequence —
 * each lead's own editorial photos/captions here, never invented — and
 * releases back into normal scroll once the sequence ends. Same real
 * per-lead data as the angled carousel (buildEditorialRows()-generated
 * captions), but a genuinely different motion category: a *vertical
 * pinned crossfade*, not a horizontal scrub, so it reads as its own
 * real choice rather than a reskin of the carousel. Degrades to a
 * plain stacked list of real photo+caption blocks (no absolute
 * positioning, no pin) whenever GSAP fails to load or JS is off — see
 * the `.project-reel-js` gating in the stylesheet. */
export function projectReelSection(items: AngledCarouselItem[], label: string): string {
  if (items.length === 0) return "";
  const layers = items
    .map(
      (item, i) => `
      <div class="project-reel-layer${i === 0 ? " is-active" : ""}" data-index="${i}">
        ${pictureTag(item.asset, "project-reel-media")}
        <div class="project-reel-scrim"></div>
        <div class="project-reel-caption">
          <h3>${escapeHtml(item.headline)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </div>
      </div>`
    )
    .join("");
  return `
  <section class="project-reel" data-reveal>
    <span class="editorial-eyebrow">${escapeHtml(label)}</span>
    <div class="project-reel-viewport">${layers}</div>
  </section>`;
}

export function projectReelScript(): string {
  return `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/ScrollTrigger.min.js"></script>
  <script>
    (function () {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      try {
        gsap.registerPlugin(ScrollTrigger);
        var section = document.querySelector('.project-reel');
        var viewport = document.querySelector('.project-reel-viewport');
        var layers = document.querySelectorAll('.project-reel-layer');
        if (!section || !viewport || layers.length < 2) return;
        section.classList.add('project-reel-js');

        var current = 0;
        var distance = window.innerHeight * (layers.length - 1) * 0.9;

        ScrollTrigger.create({
          trigger: viewport,
          start: 'top top',
          end: '+=' + distance,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          onUpdate: function (self) {
            var idx = Math.min(layers.length - 1, Math.floor(self.progress * layers.length));
            if (idx === current) return;
            layers[current].classList.remove('is-active');
            layers[idx].classList.add('is-active');
            current = idx;
          },
        });
      } catch (e) {
        // GSAP unavailable/blocked — the stylesheet's default (non
        // ".project-reel-js") rules already render every layer as a
        // plain stacked photo+caption block, nothing to recover here.
      }
    })();
  </script>`;
}

/** A real embedded map — OpenStreetMap's own free export/embed, no API
 * key needed — centered on this exact business's real coordinates
 * (never a geocoded guess, see DemoData.latitude/longitude). This is
 * the "Lage" WOW moment the creative-lab mission calls out specifically
 * for real estate, but genuinely any local business benefits from
 * showing where it actually is — so it renders whenever coordinates
 * are available, not gated to one industry. */
function locationMapEmbed(lat: number, lon: number): string {
  const dLat = 0.004;
  const dLon = 0.007;
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join("%2C");
  const marker = `${lat.toFixed(5)}%2C${lon.toFixed(5)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  return `
  <div class="location-map" data-reveal>
    <iframe src="${src}" loading="lazy" title="Standort auf der Karte" referrerpolicy="no-referrer-when-downgrade"></iframe>
  </div>`;
}

/** Colored quick-link tiles below the hero — inspired by Serenity Hair
 * (.ai/design-inspiration-playbook.md, Friseur section): a friendly,
 * tactile "visual sitemap" instead of relying only on small header nav
 * text. Only rendered for warm/approachable industries
 * (`layoutDirection === "editorial-asymmetric"` — Bäckerei, Restaurant,
 * Café, Friseur, Blumenladen), never for restrained/professional or
 * luxury profiles, where it would clash with their deliberate
 * minimalism. Real destinations only (whatever secondary pages this
 * lead+variant actually has), never invented links. */
function quickLinksSection(pages: Array<{ filename: string; label: string }>): string {
  if (pages.length === 0) return "";
  return `
  <section class="quick-links" data-reveal>
    ${pages
      .map(
        (p, i) =>
          `<a class="quick-link-tile quick-link-tile--${i % 3}" href="${p.filename}">
            <span class="quick-link-eyebrow">Entdecken Sie</span>
            <span class="quick-link-label">${escapeHtml(p.label)}</span>
          </a>`
      )
      .join("")}
  </section>`;
}

/** A real, LIVE weather reading for this exact business's real
 * coordinates — inspired by 363 Car & Social Club
 * (.ai/design-inspiration-playbook.md, Autowerkstatt section), verified
 * there to be genuinely buildable: Open-Meteo is a free, keyless,
 * CORS-open API, and this project already has real lat/lon per lead for
 * the location map. Starts `hidden` and stays that way if the fetch
 * ever fails (offline preview, API down) — never shows a broken/empty
 * badge, and never blocks anything else on the page. */
function weatherBadge(lat: number, lon: number): string {
  return `<span class="weather-badge" data-lat="${lat}" data-lon="${lon}" hidden><span class="weather-icon"></span><span class="weather-text"></span></span>`;
}

function weatherWidgetScript(): string {
  return `
  <script>
    (function () {
      var badge = document.querySelector('.weather-badge[data-lat]');
      if (!badge) return;
      var lat = badge.getAttribute('data-lat');
      var lon = badge.getAttribute('data-lon');
      var ICONS = {
        sun: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
        cloud: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 12.5 4.5 4.5 0 0 1 17.5 19Z"/></svg>',
        rain: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 13v6M8 13v6M12 15v6"/><path d="M17.5 15H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 8.5 4.5 4.5 0 0 1 17.5 15Z"/></svg>',
        snow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/><path d="M17.5 13H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 6.5 4.5 4.5 0 0 1 17.5 13Z"/></svg>',
        storm: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 13H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 6.5 4.5 4.5 0 0 1 17.5 13Z"/><path d="m13 13-3 5h4l-3 5"/></svg>'
      };
      var CODES = {
        0: ['Klar', 'sun'], 1: ['Meist klar', 'sun'], 2: ['Bewölkt', 'cloud'], 3: ['Bedeckt', 'cloud'],
        45: ['Nebel', 'cloud'], 48: ['Nebel', 'cloud'],
        51: ['Nieselregen', 'rain'], 53: ['Nieselregen', 'rain'], 55: ['Nieselregen', 'rain'], 56: ['Nieselregen', 'rain'], 57: ['Nieselregen', 'rain'],
        61: ['Regen', 'rain'], 63: ['Regen', 'rain'], 65: ['Regen', 'rain'], 66: ['Regen', 'rain'], 67: ['Regen', 'rain'],
        71: ['Schnee', 'snow'], 73: ['Schnee', 'snow'], 75: ['Schnee', 'snow'], 77: ['Schnee', 'snow'],
        80: ['Schauer', 'rain'], 81: ['Schauer', 'rain'], 82: ['Schauer', 'rain'],
        85: ['Schneeschauer', 'snow'], 86: ['Schneeschauer', 'snow'],
        95: ['Gewitter', 'storm'], 96: ['Gewitter', 'storm'], 99: ['Gewitter', 'storm']
      };
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&timezone=auto')
        .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function (data) {
          var current = data && data.current;
          if (!current) return;
          var entry = CODES[current.weather_code] || ['', 'cloud'];
          var icon = badge.querySelector('.weather-icon');
          var text = badge.querySelector('.weather-text');
          icon.innerHTML = ICONS[entry[1]];
          text.textContent = Math.round(current.temperature_2m) + '°C' + (entry[0] ? ' · ' + entry[0] : '');
          badge.hidden = false;
        })
        .catch(function () {
          // Offline preview, API unreachable, or blocked — badge just
          // never appears rather than showing broken/placeholder data.
        });
    })();
  </script>`;
}

function locationBanner(location: string, latitude: number | null, longitude: number | null): string {
  const map = latitude != null && longitude != null ? locationMapEmbed(latitude, longitude) : "";
  const weather = latitude != null && longitude != null ? weatherBadge(latitude, longitude) : "";
  return `
  <section class="location-banner" data-reveal>
    <span class="location-eyebrow">Vor Ort in</span>
    <span class="location-name">${kineticWords(location)}</span>
    ${weather}
  </section>
  ${map}`;
}

function detailStrip(assets: DemoAssetView[]): string {
  if (assets.length === 0) return "";
  return `
  <section class="detail-strip">
    ${assets.map((a, i) => `<div class="detail-item" data-reveal style="--stagger-index:${i}">${pictureTag(a, "detail-image")}</div>`).join("")}
  </section>`;
}

function environmentSection(asset: DemoAssetView | undefined): string {
  if (!asset) return "";
  return `
  <section class="environment" data-reveal>
    ${pictureTag(asset, "environment-image")}
  </section>`;
}

function formatMoodList(mood: string): string {
  const parts = mood.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return mood;
  return `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;
}

export function buildAboutText(name: string, location: string, mood: string, seed: string): string {
  const opener = pickVariant(ABOUT_OPENERS, seed + ":about-open")
    .replace("{company}", name)
    .replace("{location}", location)
    .replace("{mood}", formatMoodList(mood));
  const closer = pickVariant(ABOUT_CLOSERS, seed + ":about-close");
  return `${opener} ${closer}`;
}

export function buildBrandPromise(name: string, mood: string, seed: string): string {
  const moodList = formatMoodList(mood);
  const moodCap = moodList.charAt(0).toUpperCase() + moodList.slice(1);
  return pickVariant(BRAND_PROMISE_TEMPLATES, seed + ":brand-promise")
    .replace("{company}", name)
    .replace("{moodCap}", moodCap)
    .replace("{mood}", moodList);
}

/** Per-word spans with no mask/transform of their own (unlike
 * kineticWords) — a plain, inert wrapper by default so every variant
 * renders identically to before. Only variants using the `scroll-scrub`
 * motionStructure attach real behavior to these spans (see
 * gsapMotionScript): a scroll-scrubbed two-tone reveal inspired by
 * ario.law's headline treatment (.ai/design-inspiration-playbook.md,
 * Anwalt section) — each word brightens as the visitor scrolls past the
 * quote, instead of a fixed static accent color. */
function promiseWords(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => `<span class="promise-word">${escapeHtml(word)}</span>`)
    .join(" ");
}

function aboutSection(name: string, location: string, mood: string, seed: string): string {
  const text = buildAboutText(name, location, mood, seed);
  const promise = buildBrandPromise(name, mood, seed);
  return `
  <section id="ueber-uns" class="about" data-reveal>
    <h2>${kineticWords("Über uns")}</h2>
    <p class="about-text">${escapeHtml(text)}</p>
    <blockquote class="about-promise">
      <p>${promiseWords(promise)}</p>
      <cite>— ${escapeHtml(name)}</cite>
    </blockquote>
  </section>`;
}

function contactSection(lead: DemoData): string {
  const contactCard =
    lead.contactPhone || lead.contactEmail
      ? `
      <div class="contact-details">
        ${lead.contactPhone ? `<a class="contact-row" href="tel:${escapeHtml(lead.contactPhone.replace(/\s+/g, ""))}">${ICONS.phone}<span>${escapeHtml(lead.contactPhone)}</span></a>` : ""}
        ${lead.contactEmail ? `<a class="contact-row" href="mailto:${escapeHtml(lead.contactEmail)}">${ICONS.mail}<span>${escapeHtml(lead.contactEmail)}</span></a>` : ""}
        ${lead.address ? `<div class="contact-row">${ICONS.pin}<span>${escapeHtml(lead.address)}</span></div>` : ""}
      </div>`
      : `
      <form class="contact-form" onsubmit="event.preventDefault()">
        <p class="form-hint">Kontaktformular (Demo-Konzept — im Livebetrieb funktionsfähig)</p>
        <input type="text" placeholder="Ihr Name" disabled />
        <input type="email" placeholder="Ihre E-Mail-Adresse" disabled />
        <textarea placeholder="Ihre Nachricht" rows="3" disabled></textarea>
        <button type="submit" disabled>Nachricht senden</button>
      </form>`;

  return `
    <section id="kontakt" class="contact" data-reveal>
      <h2>${kineticWords("Kontakt")}</h2>
      <div class="contact-wrap">${contactCard}</div>
    </section>`;
}

/* Three real reveal treatments (not just one fade), picked per lead from
 * the seed so demos genuinely differ from each other rather than all
 * sharing the exact same scroll animation. Every treatment still
 * resolves to a plain, instant "visible" state when profile.motion is
 * "none" (buildMotionCss returns "") or the visitor prefers reduced
 * motion — see the @media block below. */
const MOTION_FLAVORS = ["fade-up", "fade-scale", "fade-blur"] as const;
type MotionFlavor = (typeof MOTION_FLAVORS)[number];

function revealTransformCss(flavor: MotionFlavor): { hidden: string; hasFilter: boolean; filterReset: string } {
  if (flavor === "fade-scale") {
    return { hidden: "transform: translateY(10px) scale(0.97);", hasFilter: false, filterReset: "" };
  }
  if (flavor === "fade-blur") {
    return {
      hidden: "transform: translateY(10px); filter: blur(6px);",
      hasFilter: true,
      filterReset: "filter: blur(0);",
    };
  }
  return { hidden: "transform: translateY(16px);", hasFilter: false, filterReset: "" };
}

function buildMotionCss(level: MotionLevel, flavor: MotionFlavor, structure: MotionStructure): string {
  if (level === "none" || structure === "none") return "";
  const { hidden, hasFilter, filterReset } = revealTransformCss(flavor);

  // Same reveal mechanism throughout (opacity/transform on [data-reveal],
  // driven by the IntersectionObserver in reduceMotionScript), but three
  // genuinely different feels layered on top of it:
  // - editorial-fade: slower, quieter — a plain transition, longer duration.
  // - energetic-punch: a keyframe with a small scale overshoot instead of
  //   a plain transition — snappier duration, real punch (never scale(0),
  //   starts at 0.92 same as the animate skill's floor).
  // - everything else (kinetic-stagger and the two GSAP structures, which
  //   still use this for their non-hero sections): the existing baseline.
  const isPunch = structure === "energetic-punch";
  const isEditorial = structure === "editorial-fade";
  const revealDuration = isEditorial ? "780ms" : isPunch ? "420ms" : "var(--dur-reveal)";
  const revealEasing = isPunch ? "var(--ease-out)" : "var(--ease-out)";
  const filterTransition = hasFilter ? `filter ${revealDuration} ${revealEasing}, ` : "";

  const revealRule = isPunch
    ? `
  [data-reveal] { --stagger-index: 0; opacity: 0; animation-duration: ${revealDuration}; animation-timing-function: ${revealEasing}; animation-delay: calc(min(var(--stagger-index), 6) * 70ms); animation-fill-mode: forwards; }
  [data-reveal].is-visible { animation-name: demoRevealPunch; }
  @keyframes demoRevealPunch {
    0% { opacity: 0; transform: translateY(16px) scale(0.92); }
    65% { opacity: 1; transform: translateY(-3px) scale(1.03); }
    100% { opacity: 1; transform: none; }
  }`
    : `
  [data-reveal] {
    --stagger-index: 0;
    opacity: 0;
    ${hidden}
    transition: opacity ${revealDuration} ${revealEasing}, ${filterTransition}transform ${revealDuration} ${revealEasing};
    transition-delay: calc(min(var(--stagger-index), 6) * 70ms);
  }
  [data-reveal].is-visible { opacity: 1; transform: none; ${filterReset} }`;

  return `
  /* Free cross-page fade in browsers that support the View Transitions
   * API (Chrome/Edge as of writing); everywhere else this rule is
   * simply ignored and navigation is instant, same as before — no
   * feature detection needed, no JS. Naming the brand mark upgrades the
   * plain crossfade into a real "shared element" transition (mission
   * section 9) in those same browsers: the logo visually morphs to its
   * new position/page instead of fading out and back in as a separate
   * element — every page has exactly one .brand-mark, so the name is
   * always unique within a document as the spec requires. */
  @view-transition { navigation: auto; }
  .brand-mark { view-transition-name: demo-brand-mark; }
  ${revealRule}

  /* Kinetic typography: each hero headline word masks and slides up on
   * its own, staggered — real word-reveal, not the whole line fading in
   * as one block. Independent of which reveal mechanism the outer
   * [data-reveal] uses (plain transition or the punch keyframe) since it
   * only keys off the shared .is-visible class. */
  .kinetic-word { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: 0.12em; margin-bottom: -0.12em; }
  .kinetic-word-inner {
    display: inline-block; transform: translateY(115%);
    transition: transform 650ms var(--ease-out);
  }
  [data-reveal].is-visible .kinetic-word-inner { transform: none; }

  [data-reveal] .editorial-image, [data-reveal] .service-media, [data-reveal] .detail-image, [data-reveal] .environment-image {
    clip-path: inset(0 0 100% 0);
    transition: clip-path 650ms var(--ease-in-out);
    transition-delay: calc(min(var(--stagger-index), 6) * 70ms);
  }
  [data-reveal].is-visible .editorial-image, [data-reveal].is-visible .service-media, [data-reveal].is-visible .detail-image, [data-reveal].is-visible .environment-image {
    clip-path: inset(0 0 0 0);
  }

  .nav-toggle span { transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-fast) var(--ease-out); }
  .nav-toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .nav-toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
  .nav-toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  @media (max-width: 640px) {
    .site-nav {
      opacity: 0; transform: translateY(-6px) scale(0.98); transform-origin: top;
      transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
    }
    .site-nav.is-open { opacity: 1; transform: none; }
    .site-nav a { opacity: 0; transform: translateY(-4px); transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out); }
    .site-nav.is-open a { opacity: 1; transform: none; }
    .site-nav.is-open a:nth-child(1) { transition-delay: 40ms; }
    .site-nav.is-open a:nth-child(2) { transition-delay: 80ms; }
    .site-nav.is-open a:nth-child(3) { transition-delay: 120ms; }
    .site-nav.is-open a:nth-child(4) { transition-delay: 160ms; }
  }

  .btn-primary, .header-cta { position: relative; overflow: hidden; isolation: isolate; }
  .btn-primary::after, .header-cta::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 48%, rgba(255,255,255,0.4) 54%, transparent 72%);
    transform: translateX(-130%);
  }
  /* hero-color-block flips .btn-primary to a white background (see its
   * rule further up) — a white sweep is invisible there, so it needs a
   * dark tint instead of the default light one. */
  .hero.hero-color-block .btn-primary::after {
    background: linear-gradient(115deg, transparent 30%, rgba(0,0,0,0.12) 48%, rgba(0,0,0,0.12) 54%, transparent 72%);
  }
  @media (hover: hover) and (pointer: fine) {
    .btn-primary:hover::after, .header-cta:hover::after { transform: translateX(130%); transition: transform 700ms var(--ease-in-out); }
    .btn-primary:hover, .header-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--primary) 55%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-reveal], [data-reveal] .editorial-image, [data-reveal] .service-media, [data-reveal] .detail-image, [data-reveal] .environment-image, .kinetic-word-inner {
      transition: none !important; animation: none !important; transform: none !important; filter: none !important; clip-path: none !important; opacity: 1 !important;
    }
    .btn-primary::after, .header-cta::after { display: none; }
  }`;
}

/** A small floating swatch picker so a lead can preview the demo in any
 * of 20 colorways (see colorway.ts) themselves, right on the page,
 * instead of only ever seeing the one the generator happened to pick.
 * A compact trigger (today's color) expands into a swatch grid rather
 * than showing all 20 inline — rendered on every page; the choice
 * persists across pages via localStorage. */
function colorPickerWidget(options: ColorWorld[], activeIndex: number): string {
  if (options.length <= 1) return "";
  const swatches = options
    .map(
      (c, i) =>
        `<button type="button" class="color-swatch${i === activeIndex ? " is-active" : ""}" data-index="${i}" style="--swatch-color:${swatchPreviewColor(c.primary)}" aria-label="Farbvariante ${i + 1} von ${options.length}"></button>`
    )
    .join("");
  return `
  <div class="color-picker">
    <button type="button" class="color-picker-trigger" aria-expanded="false" aria-haspopup="true" aria-label="Farbe der Demo wählen" style="--swatch-color:${swatchPreviewColor(options[activeIndex].primary)}"></button>
    <div class="color-picker-panel" role="group" aria-label="Farbe der Demo wählen">
      <span class="color-picker-label">Farbe wählen</span>
      <div class="color-picker-grid">${swatches}</div>
    </div>
  </div>`;
}

function colorPickerScript(options: ColorWorld[], activeIndex: number): string {
  const palettes = options.map((c) => ({
    primary: c.primary,
    primaryDark: c.primaryDark,
    secondary: c.secondary,
    accent: c.accent,
  }));
  // The trigger's own preview dot must stay as visually distinguishable
  // as the swatch grid after a selection — see swatchPreviewColor's doc
  // comment (dark/near-black brand colors, e.g. the luxury profile,
  // would otherwise make every selection look like the same black dot).
  const previewColors = options.map((c) => swatchPreviewColor(c.primary));
  return `
  <script>
    (function () {
      var palettes = ${JSON.stringify(palettes)};
      var previewColors = ${JSON.stringify(previewColors)};
      var root = document.documentElement;
      var STORAGE_KEY = 'demoColorway';
      var picker = document.querySelector('.color-picker');
      var trigger = document.querySelector('.color-picker-trigger');

      function apply(index) {
        var palette = palettes[index];
        if (!palette) return;
        root.classList.add('color-swapping');
        window.clearTimeout(root._colorSwapTimer);
        root._colorSwapTimer = window.setTimeout(function () {
          root.classList.remove('color-swapping');
        }, 500);
        Object.keys(palette).forEach(function (key) {
          root.style.setProperty('--' + key, palette[key]);
        });
        document.querySelectorAll('.color-swatch').forEach(function (btn, i) {
          btn.classList.toggle('is-active', i === index);
        });
        if (trigger) trigger.style.setProperty('--swatch-color', previewColors[index] || palette.primary);
        try { localStorage.setItem(STORAGE_KEY, String(index)); } catch (e) {}
      }

      document.querySelectorAll('.color-swatch').forEach(function (btn) {
        btn.addEventListener('click', function () {
          apply(parseInt(btn.getAttribute('data-index'), 10));
          if (picker) picker.classList.remove('is-open');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
      });

      if (trigger && picker) {
        trigger.addEventListener('click', function () {
          var open = picker.classList.toggle('is-open');
          trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', function (e) {
          if (!picker.contains(e.target)) {
            picker.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
          }
        });
      }

      var stored = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
      var storedIndex = stored !== null ? parseInt(stored, 10) : NaN;
      if (!isNaN(storedIndex) && storedIndex !== ${activeIndex} && palettes[storedIndex]) {
        apply(storedIndex);
      }
    })();
  </script>`;
}

function headerScrollScript(): string {
  return `
  <script>
    (function () {
      var header = document.querySelector('.site-header');
      if (!header) return;
      var onScroll = function () {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();

    (function () {
      var toggle = document.querySelector('.nav-toggle');
      var nav = document.getElementById('site-nav');
      if (!toggle || !nav) return;
      var setOpen = function (open) {
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      toggle.addEventListener('click', function () {
        setOpen(!nav.classList.contains('is-open'));
      });
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
      });
    })();
  </script>`;
}

/** Three genuinely different navigation systems, not one bar re-skinned:
 * "capsule" (the rounded segmented-control track), "floating-glass" (an
 * inset, heavier-blur panel — same link markup as capsule, different
 * header shell), and "fullscreen-overlay" (brand + trigger only; opening
 * it reveals a full-viewport scene with large typographic links and a
 * hover-swapped preview image — see fullscreenMenuScript). Which one a
 * variant gets is fixed per ConceptVariant (visual-director/variants.ts)
 * so it stays paired with the rest of that concept's character. */
function renderHeader(params: {
  navConcept: NavigationConcept;
  navPages: Array<{ slug: PageSlug; filename: string; label: string }>;
  currentSlug: PageSlug;
  name: string;
  initial: string;
  contactHref: string;
  showHeaderCta: boolean;
  previewAssetFor: Partial<Record<PageSlug, string>>;
}): string {
  const { navConcept, navPages, currentSlug, name, initial, contactHref, showHeaderCta, previewAssetFor } = params;

  if (navConcept === "fullscreen-overlay") {
    const overlayLinks = navPages
      .map((p) => {
        const preview = previewAssetFor[p.slug];
        return `<a href="${p.filename}"${p.slug === currentSlug ? ' class="is-active" aria-current="page"' : ""}${preview ? ` data-preview="${preview}"` : ""}>${escapeHtml(p.label)}</a>`;
      })
      .join("\n        ");
    const firstPreview = previewAssetFor[currentSlug] || Object.values(previewAssetFor).find(Boolean) || "";

    return `
  <header class="site-header site-header--minimal">
    <div class="brand">
      <span class="brand-mark">${initial}</span>
      <span>${name}</span>
    </div>
    <button type="button" class="fullscreen-menu-trigger" aria-expanded="false" aria-controls="fullscreen-menu" aria-label="Menü öffnen">
      <span></span><span></span><span></span>
    </button>
  </header>
  <div class="fullscreen-menu" id="fullscreen-menu" aria-hidden="true">
    <button type="button" class="fullscreen-menu-close" aria-label="Menü schließen">✕</button>
    <nav class="fullscreen-menu-links" aria-label="Hauptnavigation">
      ${overlayLinks}
    </nav>
    ${firstPreview ? `<div class="fullscreen-menu-preview"><img class="fullscreen-menu-preview-img" src="${firstPreview}" alt="" /></div>` : ""}
  </div>`;
  }

  const navLinksHtml = navPages
    .map(
      (p) =>
        `<a href="${p.filename}"${p.slug === currentSlug ? ' class="is-active" aria-current="page"' : ""}>${escapeHtml(p.label)}</a>`
    )
    .join("\n      ");
  const headerClass = navConcept === "floating-glass" ? "site-header site-header--floating" : "site-header";

  return `
  <header class="${headerClass}">
    <div class="brand">
      <span class="brand-mark">${initial}</span>
      <span>${name}</span>
    </div>
    <nav class="site-nav" id="site-nav">
      ${navLinksHtml}
    </nav>
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menü öffnen">
      <span></span><span></span><span></span>
    </button>
    ${showHeaderCta ? `<a class="header-cta" href="${contactHref}">Kontakt</a>` : ""}
  </header>`;
}

/** Powers the fullscreen-overlay nav concept: open/close (trigger, close
 * button, Escape, clicking a link), a body scroll-lock while open, and a
 * crossfaded preview-image swap on link hover. Purely progressive —
 * without JS the trigger button just does nothing, same fail-safe
 * posture as every other interactive script in this file. */
function fullscreenMenuScript(): string {
  return `
  <script>
    (function () {
      var trigger = document.querySelector('.fullscreen-menu-trigger');
      var menu = document.getElementById('fullscreen-menu');
      if (!trigger || !menu) return;
      var closeBtn = menu.querySelector('.fullscreen-menu-close');

      function setOpen(open) {
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', open ? 'false' : 'true');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      }

      trigger.addEventListener('click', function () {
        setOpen(!menu.classList.contains('is-open'));
      });
      if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setOpen(false);
      });
      menu.querySelectorAll('.fullscreen-menu-links a').forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
      });

      var previewImg = menu.querySelector('.fullscreen-menu-preview-img');
      if (previewImg) {
        menu.querySelectorAll('a[data-preview]').forEach(function (a) {
          a.addEventListener('mouseenter', function () {
            var src = a.getAttribute('data-preview');
            if (!src || previewImg.getAttribute('src') === src) return;
            previewImg.style.opacity = '0';
            window.setTimeout(function () {
              previewImg.setAttribute('src', src);
              previewImg.style.opacity = '1';
            }, 180);
          });
        });
      }
    })();
  </script>`;
}

/** A deliberate interaction moment on the hero's main CTA (mission
 * section 11: every demo needs at least one) — the button is subtly
 * attracted toward the cursor within a radius around it, springing back
 * once the cursor moves away. Desktop-with-a-real-pointer only (gated by
 * hover+pointer:fine, exactly like the button hover-lift elsewhere in
 * this file — touch fires false hover/move events), respects reduced
 * motion, and reuses the button's own existing transform transition
 * (var(--dur-fast)) rather than adding a new one. rAF-throttled so it
 * never does more than one style write per frame regardless of how
 * fast mousemove fires (mission section 16: no unnecessary main-thread
 * work from an animation). No-ops cleanly on a minimal-CTA hero (a bare
 * text link, not a .btn-primary) since the selector just finds nothing. */
function magneticCtaScript(): string {
  return `
  <script>
    (function () {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var btn = document.querySelector('.hero .btn-primary');
      if (!btn) return;
      var radius = 70;
      var strength = 0.3;
      var pending = false;
      var lastEvent = null;

      function apply() {
        pending = false;
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = lastEvent.clientX - cx;
        var dy = lastEvent.clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = Math.max(rect.width, rect.height) / 2 + radius;
        if (dist < maxDist) {
          var pull = (1 - dist / maxDist) * strength;
          btn.style.transform = 'translate(' + (dx * pull).toFixed(1) + 'px, ' + (dy * pull).toFixed(1) + 'px)';
        } else if (btn.style.transform) {
          btn.style.transform = '';
        }
      }

      document.addEventListener('mousemove', function (e) {
        lastEvent = e;
        if (pending) return;
        pending = true;
        requestAnimationFrame(apply);
      }, { passive: true });
    })();
  </script>`;
}

function reduceMotionScript(): string {
  return `
  <script>
    (function () {
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // A looping hero video is decorative motion — freeze it on the
      // first frame (the poster still shows) rather than letting it run
      // for visitors who asked the OS for reduced motion. autoplay is a
      // markup attribute, so this has to be done in script.
      if (prefersReduced) {
        document.querySelectorAll('[data-hero-video]').forEach(function (video) {
          video.autoplay = false;
          video.removeAttribute('autoplay');
          video.pause();
        });
      }

      var els = document.querySelectorAll('[data-reveal]');
      if (prefersReduced || !('IntersectionObserver' in window)) {
        els.forEach(function (el) { el.classList.add('is-visible'); });
        return;
      }
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
      els.forEach(function (el) { observer.observe(el); });
    })();
  </script>`;
}

function three3dScript(colorHex: string): string {
  return `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    (function () {
      var canvas = document.getElementById('scene3d');
      if (!canvas || typeof THREE === 'undefined') return;
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      try {
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        camera.position.z = 6;

        var geometry = new THREE.TorusKnotGeometry(1.4, 0.4, 128, 24);
        var material = new THREE.MeshStandardMaterial({ color: ${JSON.stringify(colorHex)}, metalness: 0.6, roughness: 0.3, wireframe: false });
        var mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        var light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(3, 3, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        function resize() {
          var w = canvas.clientWidth, h = canvas.clientHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        window.addEventListener('resize', resize);
        resize();

        function animate() {
          if (!prefersReduced) {
            mesh.rotation.x += 0.0022;
            mesh.rotation.y += 0.0035;
          }
          renderer.render(scene, camera);
          requestAnimationFrame(animate);
        }
        animate();
      } catch (e) {
        // WebGL unavailable or blocked — the CSS gradient behind the canvas remains visible.
      }
    })();
  </script>`;
}

const GSAP_VERSION = "3.12.5";

/** GSAP + ScrollTrigger, loaded via CDN only for the two motion
 * structures that actually use it — same "load it only where it earns
 * its weight" rule as Three.js/use3d. Deliberately purely additive on
 * top of the vanilla [data-reveal] system, never load-bearing for basic
 * visibility: cinematic-parallax nudges the hero visual's own position
 * (still fully visible either way), scroll-scrub adds a slow zoom to
 * images that the vanilla clip-path reveal already made visible on its
 * own. If GSAP fails to load or throws, the page still works exactly as
 * it would without this script. */
function gsapMotionScript(structure: MotionStructure): string {
  if (structure !== "cinematic-parallax" && structure !== "scroll-scrub") return "";

  const effect =
    structure === "cinematic-parallax"
      ? `
        var heroBg = document.querySelector('.hero-bg');
        var hero = document.querySelector('.hero');
        if (heroBg && hero) {
          gsap.to(heroBg, {
            yPercent: 14,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
          });
        }`
      : `
        gsap.utils.toArray('.editorial-image, .detail-image, .service-media, .environment-image').forEach(function (img) {
          gsap.fromTo(
            img,
            { scale: 1.12 },
            { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top 95%', end: 'top 35%', scrub: true } }
          );
        });
        var promiseQuote = document.querySelector('.about-promise');
        var promiseWords = gsap.utils.toArray('.promise-word');
        if (promiseQuote && promiseWords.length) {
          gsap.set(promiseWords, { opacity: 0.28 });
          gsap.to(promiseWords, {
            opacity: 1,
            ease: 'none',
            stagger: 0.5,
            scrollTrigger: { trigger: promiseQuote, start: 'top 90%', end: 'bottom 55%', scrub: true },
          });
        }
        // Scroll-scrubbed atmosphere gradient (United Carriers,
        // unitedcarriers.com — design-inspiration-playbook.md's own
        // cross-cutting takeaway #1: "highest-value, lowest-effort").
        // The page background physically transitions from a dark
        // "night" tone into this profile's real --bg color as the
        // visitor scrolls past the hero — landing on the real brand
        // background, not an arbitrary color, so it stays on-brand for
        // every industry/colorway rather than a fixed palette.
        var atmosphereHero = document.querySelector('.hero');
        var realBgHex = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
        function hexToRgb(hex) {
          var h = hex.replace('#', '');
          if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
          var num = parseInt(h, 16);
          return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        }
        if (atmosphereHero && /^#[0-9a-fA-F]{3,6}$/.test(realBgHex)) {
          var nightRgb = [10, 12, 16];
          var targetRgb = hexToRgb(realBgHex);
          var atmosphereProxy = { t: 0 };
          gsap.to(atmosphereProxy, {
            t: 1,
            ease: 'none',
            scrollTrigger: { trigger: atmosphereHero, start: 'top top', end: 'bottom top', scrub: true },
            onUpdate: function () {
              var r = Math.round(nightRgb[0] + (targetRgb[0] - nightRgb[0]) * atmosphereProxy.t);
              var g = Math.round(nightRgb[1] + (targetRgb[1] - nightRgb[1]) * atmosphereProxy.t);
              var b = Math.round(nightRgb[2] + (targetRgb[2] - nightRgb[2]) * atmosphereProxy.t);
              document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
            },
          });
        }`;

  return `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}/ScrollTrigger.min.js"></script>
  <script>
    (function () {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      try {
        gsap.registerPlugin(ScrollTrigger);
        ${effect}
      } catch (e) {
        // GSAP unavailable/blocked — the vanilla reveal system already
        // made every element visible on its own, so nothing breaks.
      }
    })();
  </script>`;
}

/** A demo is a small multi-page site, not one scrolling document — page
 * count and navigation come from what real content actually exists for
 * this lead/variant, never padded out. "Leistungen" only gets its own
 * page when there's a real services section to put there (some variants,
 * e.g. luxury-minimal, deliberately have none); "Über uns" gathers the
 * brand-story sections (about/editorial/detail) since they all answer
 * the same "who are you" question a visitor has after the homepage. */
type PageSlug = "" | "leistungen" | "ueber-uns" | "kontakt";

const SECONDARY_GROUPS: Array<{ slug: PageSlug; sections: Array<Exclude<SectionKey, "hero">> }> = [
  { slug: "leistungen", sections: ["services"] },
  { slug: "ueber-uns", sections: ["about", "editorial", "detail"] },
  { slug: "kontakt", sections: ["contact"] },
];

/** Every business in this dataset sells services/appointments, not
 * dishes or rooms with real menus/rates this system has never seen —
 * renaming the nav label is honest personalization (the industry really
 * does call it that), unlike inventing the page's actual contents would
 * be. */
const SECONDARY_PAGE_LABELS: Record<string, string> = {
  Restaurant: "Speisekarte",
  Café: "Angebot",
  Bäckerei: "Angebot",
  Hotel: "Zimmer & Angebote",
};

export function secondaryPageLabel(industryKey: string): string {
  return SECONDARY_PAGE_LABELS[industryKey] ?? "Leistungen";
}

/** Industry-honest name for the editorial lightbox gallery (mission
 * section 12: a WOW moment should read as built for that specific
 * business, not a generic template) — "Atmosphäre" for hospitality
 * trades where ambiance is the actual selling point, "Galerie" for
 * elegant/craft trades showcasing real work, "Werkstatt-Einblicke" for
 * automotive/technical trades, and a neutral "Einblicke" default for
 * everyone else (e.g. professional-services profiles, which still get
 * real editorial photos, just fewer of them and less ambiance-driven). */
const GALLERY_LABELS: Record<string, string> = {
  Restaurant: "Atmosphäre",
  Café: "Atmosphäre",
  Bäckerei: "Atmosphäre",
  Hotel: "Atmosphäre",
  Friseur: "Galerie",
  Blumenladen: "Galerie",
  Fahrradladen: "Werkstatt-Einblicke",
  Autowerkstatt: "Werkstatt-Einblicke",
};

export function galleryLabelFor(industryKey: string): string {
  return GALLERY_LABELS[industryKey] ?? "Einblicke";
}

function pageFilename(slug: PageSlug): string {
  return slug === "" ? "index.html" : `${slug}.html`;
}

function pageNavLabel(slug: PageSlug, industryKey: string): string {
  if (slug === "") return "Home";
  if (slug === "leistungen") return secondaryPageLabel(industryKey);
  if (slug === "ueber-uns") return "Über uns";
  return "Kontakt";
}

export interface DemoPage {
  filename: string;
  html: string;
}

export function renderDemoSite(
  lead: DemoData,
  profile: VisualProfile,
  rawAssets: RawAssetInput[],
  variant: ConceptVariant
): { pages: DemoPage[]; placeholders: DemoPlaceholders } {
  const name = escapeHtml(lead.companyName);
  const location = lead.location ?? "Ihrer Region";
  const initial = escapeHtml(lead.companyName.trim().charAt(0).toUpperCase() || "?");
  const seed = lead.companyName + (lead.location ?? "");

  const placeholders: DemoPlaceholders = {
    location: !lead.location,
    address: !lead.address,
    phone: !lead.contactPhone,
    email: !lead.contactEmail,
  };

  const colorwayOptions = profile.colorwayOptions ?? [profile.colors];
  const activeColorwayIndex = Math.max(
    0,
    colorwayOptions.findIndex((c) => c.primary === profile.colors.primary)
  );

  const assets = rawAssets.map(toAssetView);
  const byRole = groupByRole(assets);
  const heroAsset = byRole.hero?.[0];
  const serviceAssets = byRole.service ?? [];
  const editorialAssets = byRole.editorial ?? [];
  const detailAssets = byRole.detail ?? [];
  const environmentAsset = byRole.environment?.[0];

  // Real, industry-appropriate service labels exist independently of
  // whether the visual profile happens to plan a "service" *image* role
  // (professional-services profiles like Rechtsanwalt/Steuerberater
  // never do) — serviceCard() already renders a clean icon+text card
  // with no photo, so a Leistungen page is honest content on its own
  // merit and shouldn't be gated on having pictures to go with it.
  const services = deriveServiceLabels(profile);

  const nonHeroSections: Partial<Record<Exclude<SectionKey, "hero">, string>> = {
    services: services.length > 0 ? servicesSection(services, serviceAssets, secondaryPageLabel(profile.industryKey), profile.brandImpression) : "",
    editorial: editorialSection(editorialAssets, lead.companyName, location, galleryLabelFor(profile.industryKey)),
    detail: detailStrip(detailAssets) + environmentSection(environmentAsset),
    location: lead.location ? locationBanner(lead.location, lead.latitude, lead.longitude) : "",
    about: aboutSection(lead.companyName, location, profile.brandImpression, seed),
    contact: contactSection(lead),
  };

  const activeSecondary = SECONDARY_GROUPS.map((group) => ({
    slug: group.slug,
    sections: group.sections.filter((key) => variant.sectionOrder.includes(key) && nonHeroSections[key]),
  })).filter((group) => group.sections.length > 0);

  const pageSlugs: PageSlug[] = ["", ...activeSecondary.map((g) => g.slug)];
  const navPages = pageSlugs.map((slug) => ({ slug, filename: pageFilename(slug), label: pageNavLabel(slug, profile.industryKey) }));

  // Which real image represents each page, for the fullscreen-overlay
  // nav's hover preview — falls back gracefully (no data-preview
  // attribute, so that link just doesn't swap the image) rather than
  // inventing a placeholder photo for a page that has none.
  const previewAssetFor: Partial<Record<PageSlug, string>> = {
    "": heroAsset?.src,
    leistungen: serviceAssets[0]?.src ?? editorialAssets[0]?.src,
    "ueber-uns": editorialAssets[0]?.src ?? detailAssets[0]?.src ?? environmentAsset?.src,
    kontakt: environmentAsset?.src ?? detailAssets[0]?.src,
  };

  const hasLeistungen = activeSecondary.some((g) => g.slug === "leistungen");
  const hasUeberUns = activeSecondary.some((g) => g.slug === "ueber-uns");
  const hasKontakt = activeSecondary.some((g) => g.slug === "kontakt");
  const contactHref = hasKontakt ? "kontakt.html" : "index.html";
  const secondaryHref = hasLeistungen ? "leistungen.html" : hasUeberUns ? "ueber-uns.html" : null;
  const secondaryLabel = hasLeistungen ? secondaryPageLabel(profile.industryKey) : "Über uns";

  const heroHtml = heroSection(
    lead.companyName,
    taglineFor(lead.companyName, location, profile, seed),
    heroAsset,
    profile,
    variant.heroStyle,
    variant.ctaIntensity,
    contactHref,
    secondaryHref,
    secondaryLabel
  );

  const quickLinksHtml =
    profile.layoutDirection === "editorial-asymmetric"
      ? quickLinksSection(navPages.filter((p) => p.slug !== "").map((p) => ({ filename: p.filename, label: p.label })))
      : "";

  function bodyFor(slug: PageSlug): string {
    if (slug === "") {
      const homeKeys = variant.sectionOrder.filter((k) => k === "location" && nonHeroSections.location);
      return [heroHtml, quickLinksHtml, ...homeKeys.map((k) => nonHeroSections[k as Exclude<SectionKey, "hero">] ?? "")].join(
        "\n"
      );
    }
    const group = activeSecondary.find((g) => g.slug === slug);
    if (!group) return "";
    const keysInOrder = variant.sectionOrder.filter((k): k is Exclude<SectionKey, "hero"> =>
      (group.sections as SectionKey[]).includes(k)
    );
    return keysInOrder.map((k) => nonHeroSections[k] ?? "").join("\n");
  }

  const mobileCtaBar =
    variant.ctaIntensity === "aggressive"
      ? `<div class="mobile-cta-bar"><a class="btn-primary" href="${contactHref}">Jetzt anfragen</a></div>`
      : "";
  const showHeaderCta = variant.heroStyle !== "minimal";
  const motionFlavor = pickVariant([...MOTION_FLAVORS], seed + ":motionFlavor");
  const motionCss = buildMotionCss(profile.motion, motionFlavor, variant.motionStructure);

  const styleBlock = `
  :root {
    --primary: ${profile.colors.primary};
    --primary-dark: ${profile.colors.primaryDark};
    --secondary: ${profile.colors.secondary};
    --accent: ${profile.colors.accent};
    --bg: ${profile.colors.background};
    --fg: ${profile.colors.foreground};
    --card: ${profile.colors.card};
    --muted: ${profile.colors.muted};
    --border: ${profile.colors.border};
    --font-heading: '${profile.typography.heading}', serif;
    --font-body: '${profile.typography.body}', sans-serif;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --dur-fast: 150ms;
    --dur-base: 220ms;
    --dur-reveal: 560ms;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--font-body); background: var(--bg); color: var(--fg); line-height: 1.65; }
  h1, h2, h3 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.01em; margin: 0; }
  a { color: inherit; }
  img { display: block; max-width: 100%; }
  ${motionCss}

  .site-header { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.75rem; background: color-mix(in srgb, var(--card) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); transition: box-shadow var(--dur-base) ease, background var(--dur-base) ease; }
  .site-header.is-scrolled { box-shadow: 0 8px 24px -16px rgba(0,0,0,0.35); background: color-mix(in srgb, var(--card) 97%, transparent); }
  /* Floating-glass nav concept: an inset panel rather than a flush-docked
   * bar — reads as floating above the content instead of part of it. */
  .site-header--floating {
    top: 1rem; margin: 0 1rem; border-radius: 1.25rem; border: 1px solid var(--border);
    box-shadow: 0 14px 34px -18px rgba(0,0,0,0.3); backdrop-filter: blur(16px);
  }
  .site-header--floating.is-scrolled { top: 0.6rem; box-shadow: 0 18px 40px -16px rgba(0,0,0,0.4); }
  @media (max-width: 640px) { .site-header--floating { margin: 0 0.6rem; border-radius: 1rem; } }
  /* Fullscreen-overlay nav concept: brand + trigger only, no inline links. */
  .site-header--minimal { justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 0.6rem; font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem; flex-shrink: 0; }
  .brand-mark { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 0.5rem; background: var(--primary); color: #fff; font-weight: 700; flex-shrink: 0; }
  .header-cta {
    padding: 0.6rem 1.2rem; border-radius: 0.4rem;
    background: linear-gradient(155deg, rgba(255,255,255,0.24), rgba(255,255,255,0) 55%), var(--primary);
    color: #fff; text-decoration: none; font-size: 0.85rem; font-weight: 600; flex-shrink: 0;
    box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--primary) 55%, transparent);
  }
  /* A rounded "capsule" nav — a pill-shaped track holding pill-shaped
   * links, the active one lifted onto a solid card-colored pill. Reads
   * as one modern navigation unit rather than a row of plain text
   * links. Kept to the desktop layout; the mobile dropdown below resets
   * it back to a plain rectangular panel, where a capsule shape would
   * look out of place. */
  .site-nav {
    display: flex; gap: 0.25rem; align-items: center; overflow-x: auto; scrollbar-width: none;
    background: color-mix(in srgb, var(--muted) 70%, transparent);
    border-radius: 999px; padding: 0.3rem;
  }
  .site-nav::-webkit-scrollbar { display: none; }
  .site-nav a {
    text-decoration: none; font-size: 0.85rem; font-weight: 600; color: var(--fg); opacity: 0.75; white-space: nowrap;
    padding: 0.5rem 1.05rem; border-radius: 999px;
    transition: background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out);
  }
  .site-nav a:hover { opacity: 1; background: color-mix(in srgb, var(--card) 55%, transparent); }
  .site-nav a.is-active { opacity: 1; color: var(--primary); background: var(--card); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .nav-toggle { display: none; background: none; border: none; padding: 0; margin: 0; cursor: pointer; flex-shrink: 0; }
  @media (max-width: 640px) {
    .brand span:last-child { display: none; }
    .nav-toggle { display: flex; flex-direction: column; justify-content: center; align-items: stretch; gap: 5px; width: 1.5rem; height: 1.5rem; }
    .nav-toggle span { display: block; height: 2px; width: 100%; background: var(--fg); border-radius: 2px; }
    .site-nav {
      position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; align-items: stretch; gap: 0.15rem;
      overflow: visible; background: var(--card); border-radius: 0 0 1rem 1rem; padding: 0.5rem 1rem 1rem;
      box-shadow: 0 12px 24px -16px rgba(0,0,0,0.25);
    }
    .site-nav:not(.is-open) { visibility: hidden; pointer-events: none; }
    .site-nav a { width: 100%; padding: 0.7rem 0.9rem; white-space: normal; }
    .site-nav a.is-active { background: color-mix(in srgb, var(--primary) 10%, transparent); }
  }

  /* Fullscreen-overlay nav concept: the menu itself is the moment, not
   * just a means to navigate — large typographic links over a full
   * dark scene, with a preview image that swaps to match the hovered
   * link (see fullscreenMenuScript). Works identically at every
   * viewport size, so there's no separate mobile treatment here. */
  .fullscreen-menu-trigger {
    display: flex; flex-direction: column; justify-content: center; gap: 5px;
    width: 1.6rem; height: 1.6rem; background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0;
  }
  .fullscreen-menu-trigger span {
    display: block; height: 2px; width: 100%; background: var(--fg); border-radius: 2px;
    transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-fast) var(--ease-out);
  }
  .fullscreen-menu-trigger[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .fullscreen-menu-trigger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
  .fullscreen-menu-trigger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

  .fullscreen-menu {
    position: fixed; inset: 0; z-index: 90;
    display: flex; align-items: center; justify-content: space-between; gap: clamp(1.5rem, 6vw, 5rem);
    padding: clamp(2rem, 8vw, 6rem);
    background: var(--fg); color: var(--bg);
    visibility: hidden; opacity: 0;
    transition: opacity var(--dur-base) var(--ease-out), visibility 0s linear var(--dur-base);
  }
  .fullscreen-menu.is-open { visibility: visible; opacity: 1; transition-delay: 0s; }
  .fullscreen-menu-close {
    position: absolute; top: clamp(1.25rem, 4vw, 2.5rem); right: clamp(1.25rem, 4vw, 2.5rem);
    width: 2.75rem; height: 2.75rem; border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--bg) 35%, transparent);
    background: transparent; color: var(--bg); font-size: 1.1rem; cursor: pointer;
    transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
  }
  .fullscreen-menu-close:hover { background: color-mix(in srgb, var(--bg) 12%, transparent); transform: rotate(90deg); }
  .fullscreen-menu-links { display: flex; flex-direction: column; gap: 0.5rem; }
  .fullscreen-menu-links a {
    font-family: var(--font-heading); font-weight: 700; text-decoration: none; color: var(--bg);
    font-size: clamp(2rem, 6vw, 4.2rem); line-height: 1.15;
    opacity: 0; transform: translateY(14px);
    transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out);
  }
  .fullscreen-menu.is-open .fullscreen-menu-links a { opacity: 0.55; transform: none; }
  .fullscreen-menu.is-open .fullscreen-menu-links a:hover,
  .fullscreen-menu.is-open .fullscreen-menu-links a.is-active { opacity: 1; color: var(--secondary); }
  .fullscreen-menu.is-open .fullscreen-menu-links a:nth-child(1) { transition-delay: 40ms; }
  .fullscreen-menu.is-open .fullscreen-menu-links a:nth-child(2) { transition-delay: 90ms; }
  .fullscreen-menu.is-open .fullscreen-menu-links a:nth-child(3) { transition-delay: 140ms; }
  .fullscreen-menu.is-open .fullscreen-menu-links a:nth-child(4) { transition-delay: 190ms; }
  .fullscreen-menu-preview { flex-shrink: 0; width: min(30vw, 26rem); aspect-ratio: 3 / 4; border-radius: 1rem; overflow: hidden; display: none; }
  .fullscreen-menu-preview-img { width: 100%; height: 100%; object-fit: cover; transition: opacity 220ms ease; }
  @media (min-width: 860px) { .fullscreen-menu-preview { display: block; } }
  @media (max-width: 640px) { .fullscreen-menu { flex-direction: column; justify-content: center; align-items: flex-start; } }
  @media (prefers-reduced-motion: reduce) {
    .fullscreen-menu, .fullscreen-menu-links a { transition-duration: 1ms !important; }
  }

  .hero { position: relative; min-height: 88vh; display: flex; overflow: hidden; background: linear-gradient(150deg, color-mix(in srgb, var(--primary) 30%, var(--bg)), var(--bg)); }
  .hero-bg { position: absolute; inset: 0; }
  .hero-media, .hero-canvas { width: 100%; height: 100%; object-fit: cover; }
  .hero-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 100%); }
  .hero.hero-center .hero-scrim { background: rgba(0,0,0,0.55); }
  .hero-content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1.25rem; padding: 3rem clamp(1.5rem, 6vw, 5rem); max-width: 46rem; }
  .hero.hero-bottom-left { align-items: flex-start; justify-content: flex-end; }
  .hero.hero-center { align-items: center; justify-content: center; text-align: center; margin: 0 auto; }
  .hero.hero-minimal { min-height: 60vh; }
  .hero.hero-minimal .hero-content { max-width: 34rem; }
  .hero.hero-minimal h1 { font-size: clamp(1.8rem, 3.5vw, 2.6rem); }
  .hero.hero-color-block { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .hero.hero-color-block .hero-content { color: #fff; }
  .hero.hero-color-block .btn-primary {
    background: linear-gradient(155deg, rgba(0,0,0,0.05), rgba(0,0,0,0) 55%), #fff;
    color: var(--primary-dark);
    box-shadow: 0 10px 24px -10px rgba(0,0,0,0.3);
  }

  /* Typography-only hero (typographyHeroSection) — real technique from
     Rezo Zero: zero imagery, one huge confident multi-line statement. */
  .typo-hero { padding: clamp(4rem, 14vw, 9rem) clamp(1.5rem, 6vw, 5rem); background: var(--bg); }
  .typo-hero-content { max-width: 56rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .typo-hero-content h1 { font-size: clamp(2.6rem, 7vw, 5.5rem); line-height: 1.02; }
  .typo-hero-tagline { font-family: var(--font-heading); font-size: clamp(1.3rem, 3vw, 2rem); color: color-mix(in srgb, var(--fg) 78%, transparent); }
  .typo-hero .cta-link { color: var(--primary); text-shadow: none; }
  .typo-hero .btn-ghost { background: transparent; border-color: var(--border); color: var(--fg); }

  /* Scalloped/capsule image-mask hero (scallopedHeroSection) — real
     technique from Filmbot: photography clipped into repeating
     pill-shaped columns at alternating heights, a film-strip motif. */
  .scalloped-hero { padding: clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 6vw, 5rem); }
  .scalloped-hero-text { max-width: 40rem; margin-bottom: clamp(2rem, 5vw, 3rem); }
  .scalloped-hero-text h1 { font-size: clamp(2rem, 4.5vw, 3.2rem); margin-bottom: 0.75rem; }
  .scalloped-hero-text p { font-size: 1.1rem; color: color-mix(in srgb, var(--fg) 75%, transparent); }
  .scalloped-columns { display: flex; gap: clamp(0.75rem, 2vw, 1.5rem); align-items: flex-start; }
  .scalloped-col { flex: 1; aspect-ratio: 2 / 5; border-radius: 999px; overflow: hidden; transform: translateY(var(--offset)); box-shadow: 0 20px 40px -22px rgba(0,0,0,0.3); }
  .scalloped-col-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  @media (max-width: 720px) {
    .scalloped-columns { flex-wrap: wrap; }
    .scalloped-col { flex: 1 1 calc(50% - 0.5rem); aspect-ratio: 3 / 4; transform: none; }
  }

  /* Scrolling keyword marquee (marqueeSection) — real technique from
     Qissa: a full-bleed text-only rhythm-break divider between two
     sections, real service labels only. */
  .marquee { overflow: hidden; white-space: nowrap; padding: clamp(1.5rem, 4vw, 2.5rem) 0; background: var(--primary); }
  .marquee-track { display: inline-flex; width: max-content; animation: marquee-scroll 26s linear infinite; }
  .marquee-track span { font-family: var(--font-heading); font-style: italic; font-size: clamp(1.4rem, 3.5vw, 2.4rem); color: #fff; padding: 0 0.75rem; }
  .marquee-dot { font-style: normal !important; opacity: 0.6; }
  @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) {
    .marquee-track { animation-play-state: paused; }
  }

  /* Handwritten-script hero aside (scriptAside) — real technique from
     Serenity Hair: a small cursive personal touch above the headline. */
  .hero-script-aside {
    display: inline-block; font-family: 'Caveat', cursive; font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    color: var(--accent); transform: rotate(-4deg); margin-bottom: -0.5rem;
  }

  /* Gooey/metaball blob hero (gooeyHeroSection) — real technique from
     Podium: blurred circles merged into one amoeba silhouette via the
     classic feGaussianBlur+feColorMatrix "goo" filter, real photo shown
     inside a circular cutout centered on the merged shape. Bold/avant-
     garde — for energetic-punch profiles only, never a default. */
  .gooey-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
  .gooey-hero { position: relative; min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem; overflow: hidden; padding: 3rem 1.5rem; background: var(--bg); }
  .gooey-stage { position: relative; width: min(60vw, 32rem); aspect-ratio: 1; }
  .gooey-blobs { position: absolute; inset: 0; filter: url(#goo); }
  .gooey-blob { position: absolute; border-radius: 50%; background: var(--accent); animation: gooey-float 9s ease-in-out infinite; }
  .gooey-blob--a { width: 55%; height: 55%; top: 5%; left: 10%; background: var(--primary); animation-delay: 0s; }
  .gooey-blob--b { width: 40%; height: 40%; bottom: 8%; right: 8%; background: var(--secondary); animation-delay: -3s; }
  .gooey-blob--c { width: 30%; height: 30%; bottom: 20%; left: 25%; background: var(--accent); animation-delay: -6s; }
  .gooey-photo { position: absolute; inset: 12%; border-radius: 50%; overflow: hidden; pointer-events: none; }
  .gooey-photo-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  @keyframes gooey-float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(6%, -8%) scale(1.08); }
    66% { transform: translate(-5%, 6%) scale(0.95); }
  }
  .gooey-hero-text { position: relative; text-align: center; max-width: 40rem; }
  .gooey-hero-text h1 { font-size: clamp(2rem, 5vw, 3.4rem); margin-bottom: 0.75rem; }
  .gooey-hero-text p { font-size: 1.05rem; color: color-mix(in srgb, var(--fg) 75%, transparent); }
  @media (prefers-reduced-motion: reduce) {
    .gooey-blob { animation: none; }
  }

  /* Floating tab bar with a sliding indicator (floatingTabBar) — three
     treatments over one mechanism. Fixed to the bottom so it doubles as
     a reachable bottom bar on a phone. */
  .tab-bar {
    position: fixed; left: 50%; bottom: clamp(0.75rem, 3vw, 1.5rem); transform: translateX(-50%);
    z-index: 40; display: flex; align-items: center; gap: 0.15rem;
    padding: 0.4rem; border-radius: 999px; max-width: calc(100vw - 1.5rem);
  }
  .tab-indicator {
    position: absolute; left: 0; top: 0.4rem; bottom: 0.4rem; border-radius: 999px;
    transition: transform 420ms var(--ease-out), width 420ms var(--ease-out);
    pointer-events: none;
  }
  .tab-item {
    position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
    gap: 0.15rem; padding: 0.55rem 0.9rem; border-radius: 999px; text-decoration: none;
    font-size: 0.68rem; letter-spacing: 0.02em; white-space: nowrap;
    transition: color var(--dur-base) var(--ease-out);
  }
  .tab-icon { display: flex; }
  .tab-icon svg { width: 20px; height: 20px; }
  /* The bar is fixed, so the document has to reserve room for it —
     otherwise it sits on top of whatever the page ends with (caught on
     the hero, where it covered the supporting line). */
  body:has(.tab-bar) { padding-bottom: 6rem; }
  .tab-item:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  .tab-bar--light { background: #fff; box-shadow: 0 18px 40px -20px rgba(0,0,0,0.45); }
  .tab-bar--light .tab-item { color: #4b5563; }
  .tab-bar--light .tab-item.is-active { color: var(--primary); }
  /* The dot sits above the active tab rather than behind it. The
     indicator itself keeps the tab's full width (the script sets it),
     and the dot is centred inside it — shrinking the indicator to 6px
     instead made "margin-left: 50%" resolve against the bar's width, so
     the dot floated over the neighbouring tab. */
  .tab-bar--light .tab-indicator { top: -0.35rem; bottom: auto; height: 6px; background: transparent; }
  .tab-bar--light .tab-indicator::before {
    content: ""; position: absolute; left: 50%; top: 0; width: 6px; height: 6px;
    border-radius: 999px; background: var(--primary); transform: translateX(-50%);
  }

  .tab-bar--glass {
    background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  .tab-bar--glass .tab-item { color: rgba(255,255,255,0.75); }
  .tab-bar--glass .tab-item.is-active { color: #fff; }
  .tab-bar--glass .tab-label { display: none; }
  .tab-bar--glass .tab-indicator { background: var(--primary); box-shadow: 0 8px 20px -8px var(--primary); }

  .tab-bar--dark { background: #0f1216; box-shadow: 0 18px 40px -20px rgba(0,0,0,0.6); }
  .tab-bar--dark .tab-item { color: rgba(255,255,255,0.65); }
  .tab-bar--dark .tab-item.is-active { color: #0f1216; }
  .tab-bar--dark .tab-indicator { background: #fff; }
  /* Only the active tab shows its label — that expansion is what makes
     the capsule feel like it grew into place rather than jumped. */
  .tab-bar--dark .tab-label { display: none; }
  .tab-bar--dark .tab-item.is-active .tab-label { display: block; }

  @media (max-width: 640px) {
    .tab-bar { gap: 0; padding: 0.35rem; }
    .tab-item { padding: 0.5rem 0.7rem; }
    /* The engine's own mobile CTA bar also pins to the bottom; lift the
       tab bar above it so they never overlap. */
    body:has(.mobile-cta-bar) .tab-bar { bottom: 4.6rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .tab-indicator { transition-duration: 1ms !important; }
  }

  /* Dark stacked hero (stackedHeroSection) — headline hard left in
     heavy uppercase over a full-bleed image, supporting line small on
     the right, meta labels along the bottom. */
  .stacked-hero { position: relative; min-height: 92vh; display: flex; align-items: center; padding: 0; overflow: hidden; background: #0b0d10; }
  .stacked-hero-bg { position: absolute; inset: 0; }
  .stacked-hero-media { width: 100%; height: 100%; object-fit: cover; }
  /* Not optional decoration: the key visual is generated, so its
     brightness is unknown at build time. Measured against the actual
     rendered pixels, white type over a bright sky came out at 1.7:1 —
     this brings the areas that carry text back above 4.5:1 while
     leaving the centre-right open so the key visual still reads. */
  .stacked-hero-scrim {
    position: absolute; inset: 0;
    background:
      linear-gradient(90deg, rgba(8,10,14,0.78) 0%, rgba(8,10,14,0.45) 45%, rgba(8,10,14,0.55) 100%),
      linear-gradient(180deg, rgba(8,10,14,0.30) 0%, rgba(8,10,14,0.25) 45%, rgba(8,10,14,0.70) 100%);
  }
  .stacked-hero-inner {
    position: relative; z-index: 1; width: 100%;
    padding: clamp(2rem, 6vw, 5rem); display: grid; gap: 1.5rem;
    grid-template-areas: "headline supporting" "meta meta";
    grid-template-columns: minmax(0, 1fr) minmax(0, 22rem); align-items: end;
  }
  .stacked-hero-headline {
    grid-area: headline; display: flex; flex-direction: column; margin: 0;
    font-size: clamp(2.4rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: -0.01em;
    font-weight: 700; color: #fff; text-transform: uppercase;
  }
  .stacked-hero-line { display: block; }
  .stacked-hero-supporting { grid-area: supporting; margin: 0; color: rgba(255,255,255,0.78); font-size: 0.95rem; max-width: 22rem; }
  .stacked-hero-meta {
    grid-area: meta; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    padding-top: clamp(1.5rem, 5vw, 3rem); font-size: 0.72rem; letter-spacing: 0.16em;
    text-transform: uppercase; color: rgba(255,255,255,0.62);
  }
  @media (max-width: 720px) {
    .stacked-hero-inner { grid-template-areas: "headline" "supporting" "meta"; grid-template-columns: 1fr; }
  }

  /* Expanding treatment accordion (treatmentAccordionSection): the
     active panel widens and the rest compress to slivers. flex-grow is
     the honest property to animate here — scaling instead would distort
     the photography, which is the whole point of the section. */
  .treatment-accordion { background: #0b0d10; color: #fff; }
  .treatment-accordion h2 { color: #fff; text-transform: uppercase; letter-spacing: -0.01em; }
  .treatment-row { display: flex; gap: 0.6rem; height: clamp(280px, 52vh, 520px); }
  .treatment-panel {
    position: relative; flex: 1 1 0; min-width: 0; padding: 0; border: none; cursor: pointer;
    border-radius: 1rem; overflow: hidden; background: #14171c;
    transition: flex-grow 520ms var(--ease-out);
  }
  .treatment-panel.is-active { flex-grow: 4; }
  .treatment-panel:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
  .treatment-panel-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  .treatment-panel-label {
    position: absolute; left: 1rem; bottom: 1rem; z-index: 1;
    padding: 0.4rem 0.8rem; border-radius: 999px;
    background: rgba(10,12,16,0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    color: #fff; font-size: 0.8rem; letter-spacing: 0.04em; white-space: nowrap;
  }
  @media (max-width: 720px) {
    .treatment-row { flex-direction: column; height: auto; }
    .treatment-panel { height: 200px; flex: none; }
    .treatment-panel.is-active { height: 320px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .treatment-panel { transition-duration: 1ms !important; }
  }

  /* With the page-wide clip behind everything, the page scrim already
     does the heavy darkening — the hero's own full scrim on top of it
     would make the first screen markedly darker than the rest. Keep
     only the left-side gradient the stacked headline needs. */
  .page-video-mode .stacked-hero-scrim {
    background: linear-gradient(90deg, rgba(8,10,14,0.62) 0%, rgba(8,10,14,0.15) 55%, rgba(8,10,14,0) 100%);
  }

  /* Page-wide scrubbed video background (pageVideoBackground). The
     layer is fixed behind everything; .page-video-mode then has to undo
     every opaque surface in the document, otherwise the footage is
     simply covered up. Legibility is the whole risk here, so the scrim
     is heavy and type is forced light — a profile's light-mode palette
     cannot survive over moving footage unchanged. */
  .page-video { position: fixed; inset: 0; z-index: 0; overflow: hidden; }
  .page-video-media { width: 100%; height: 100%; object-fit: cover; display: block; }
  .page-video-scrim {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(8,10,14,0.62) 0%, rgba(8,10,14,0.78) 100%);
  }
  .page-video-mode { background: #0a0c10; color: #fff; }
  .page-video-mode .site-header,
  .page-video-mode main,
  .page-video-mode section,
  .page-video-mode footer,
  .page-video-mode .marquee,
  .page-video-mode .location-map,
  .page-video-mode .quick-links { position: relative; z-index: 1; }
  /* Every opaque section surface becomes transparent so one continuous
     clip shows through the entire page. */
  .page-video-mode section,
  .page-video-mode .hero,
  .page-video-mode .hero-bg,
  .page-video-mode .typo-hero,
  .page-video-mode .gooey-hero,
  .page-video-mode .scroll-video-stage,
  .page-video-mode footer { background: transparent; }
  .page-video-mode .hero-scrim,
  .page-video-mode .fluid-flow { display: none; }
  .page-video-mode h1,
  .page-video-mode h2,
  .page-video-mode h3,
  .page-video-mode .location-name,
  .page-video-mode .about-promise p { color: #fff; }
  .page-video-mode p,
  .page-video-mode li,
  .page-video-mode .editorial-text p,
  .page-video-mode .about-text,
  .page-video-mode .scattered-item figcaption,
  .page-video-mode footer { color: rgba(255,255,255,0.82); }
  .page-video-mode .editorial-eyebrow,
  .page-video-mode .location-eyebrow,
  .page-video-mode .numbered-feature-index { color: rgba(255,255,255,0.7); }
  /* Cards keep their shape but become glass, so they read as panels
     over the footage instead of opaque holes punched through it. */
  .page-video-mode .service-card,
  .page-video-mode .contact-details,
  .page-video-mode .contact-form,
  .page-video-mode .weather-badge,
  .page-video-mode .quick-link-tile {
    background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.22);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); color: #fff;
  }
  .page-video-mode .contact-row,
  .page-video-mode .service-card { color: #fff; }
  .page-video-mode .contact-form input,
  .page-video-mode .contact-form textarea {
    background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.28); color: #fff;
  }
  .page-video-mode .contact-form input::placeholder,
  .page-video-mode .contact-form textarea::placeholder { color: rgba(255,255,255,0.6); }
  .page-video-mode .site-header {
    background: rgba(10,12,16,0.55); border-bottom-color: rgba(255,255,255,0.16);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  /* The capsule track is a light --muted tint by default; left as-is it
     puts white link labels on cream and they wash out. Measured by eye
     against the rendered page, not assumed. */
  .page-video-mode .site-nav { background: rgba(255,255,255,0.12); }
  .page-video-mode .site-nav a { color: rgba(255,255,255,0.92); }
  /* The active pill keeps its solid light background, so its label has
     to go back to dark — a blanket "make nav text white" rule renders
     it white-on-white and the current page disappears. */
  .page-video-mode .site-nav a.is-active { color: #0a0c10; }
  .page-video-mode .header-cta { background: var(--accent); color: #fff; border-color: transparent; }
  .page-video-mode .brand, .page-video-mode .brand-name { color: #fff; }
  .page-video-mode .numbered-feature { border-color: rgba(255,255,255,0.2); }
  .page-video-mode .demo-flag { background: rgba(255,255,255,0.14); color: #fff; }

  /* Scroll-scrubbed background video (scrollVideoSection) — pinned
     full-bleed behind the copy, currentTime driven by scroll position.
     Default rules are the no-JS/reduced-motion fallback: a normal
     block showing the poster frame. .scroll-video--active is added
     only once the script has metadata and pins the stage. */
  .scroll-video { position: relative; padding: 0; }
  .scroll-video-stage { position: relative; height: 70vh; overflow: hidden; }
  .scroll-video.scroll-video--active .scroll-video-stage { height: 100vh; }
  .scroll-video-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .scroll-video-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.6) 100%); }
  .scroll-video-content {
    position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; gap: 1rem;
    padding: clamp(1.5rem, 6vw, 5rem); color: #fff;
  }
  .scroll-video-content h2 { font-size: clamp(1.8rem, 5vw, 3.4rem); margin: 0; }
  .scroll-video-content p { max-width: 34rem; color: rgba(255,255,255,0.88); }

  /* Rotating circular seal badge (rotatingSealBadge) — real technique
     from ERA Residence (Awwwards Site of the Month, Aug 2026). Pinned
     over the hero, rotating slowly; "currentColor" lets it invert
     against whatever sits behind it. */
  .seal-badge {
    position: absolute; top: clamp(1rem, 4vw, 2.5rem); left: clamp(1rem, 4vw, 2.5rem);
    width: clamp(78px, 11vw, 130px); aspect-ratio: 1; z-index: 2; color: #fff; pointer-events: none;
  }
  .seal-badge-ring { width: 100%; height: 100%; animation: seal-spin 24s linear infinite; }
  .seal-badge-text {
    font-family: var(--font-body); font-weight: 600; letter-spacing: 0.16em;
    fill: currentColor; text-transform: uppercase;
  }
  .seal-badge-emblem {
    position: absolute; top: 50%; left: 50%; width: 34%; height: 34%; transform: translate(-50%, -50%);
  }
  @keyframes seal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .seal-badge-ring { animation: none; } }

  /* Arched section top edge (.arched-top) — real technique from ERA
     Residence: the section after the hero rises on a wide elliptical
     arc instead of a straight edge, so the boundary reads as a soft
     horizon rather than a hard cut. Pulled up over the hero by its own
     arc height so no gap shows through. */
  .arched-top {
    position: relative; z-index: 1; background: var(--bg);
    border-radius: 50% 50% 0 0 / clamp(2rem, 6vw, 5rem) clamp(2rem, 6vw, 5rem) 0 0;
    margin-top: calc(-1 * clamp(2rem, 6vw, 5rem));
    padding-top: clamp(3.5rem, 9vw, 7rem);
  }

  /* Scattered (non-grid) photo gallery (scatteredGallerySection) — real
     principle from Gionatan Nese's mood-board, kept static (no drag). */
  .scattered-gallery-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(1.5rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem); padding-top: 1rem; }
  .scattered-item { margin: 0; width: clamp(160px, 22vw, 260px); }
  .scattered-item-inner {
    display: flex; flex-direction: column; gap: 0.6rem; cursor: default;
    transform: rotate(var(--rot)) translateY(var(--shift)); transition: transform 260ms var(--ease-out);
  }
  .scattered-item:hover .scattered-item-inner, .scattered-item:focus-within .scattered-item-inner {
    transform: rotate(0deg) translateY(0) scale(1.05); position: relative; z-index: 2;
  }
  .scattered-item-image { width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 0.5rem; box-shadow: 0 16px 32px -18px rgba(0,0,0,0.35); display: block; }
  .scattered-item figcaption { font-size: 0.85rem; text-align: center; color: color-mix(in srgb, var(--fg) 70%, transparent); }
  @media (prefers-reduced-motion: reduce) {
    .scattered-item-inner { transition-duration: 1ms !important; }
  }

  /* Mouse-reactive "water-flow" (fluidFlowLayer/fluidFlowScript): blurred,
     turbulence-distorted color blobs behind the hero content, damped
     toward the cursor rather than following it 1:1. .hero-content--floating
     gets its own separate, much smaller float so real text stays sharp —
     never run the distortion filter over legible type. */
  .fluid-flow-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
  .fluid-flow { position: absolute; inset: -10%; z-index: 0; overflow: hidden; mix-blend-mode: screen; opacity: 0.72; pointer-events: none; }
  .hero.hero-color-block .fluid-flow { mix-blend-mode: soft-light; opacity: 0.85; }
  .fluid-blob {
    position: absolute; border-radius: 50%; filter: blur(60px) url(#fluid-distort);
    will-change: transform;
  }
  .fluid-blob--a { top: 8%; left: 12%; width: 42vw; height: 42vw; background: color-mix(in srgb, var(--accent) 75%, transparent); }
  .fluid-blob--b { bottom: 4%; right: 10%; width: 36vw; height: 36vw; background: color-mix(in srgb, var(--primary) 70%, transparent); }
  .fluid-blob--c { top: 40%; left: 45%; width: 26vw; height: 26vw; background: color-mix(in srgb, var(--secondary) 65%, transparent); }
  .hero-content--floating { will-change: transform; }
  @media (max-width: 640px), (prefers-reduced-motion: reduce), (hover: none), (pointer: coarse) {
    .fluid-flow { display: none; }
  }
  .hero.hero-color-block .btn-ghost { background: transparent; border-color: rgba(255,255,255,0.7); }
  .hero h1 { color: #fff; font-size: clamp(2.2rem, 5.5vw, 4rem); text-shadow: 0 2px 28px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.5); }
  .hero.hero-color-block h1 { text-shadow: none; }
  .hero-tagline { color: rgba(255,255,255,0.95); font-size: clamp(1.05rem, 2vw, 1.35rem); max-width: 34rem; text-shadow: 0 1px 12px rgba(0,0,0,0.4); }
  .hero.hero-color-block .hero-tagline { text-shadow: none; }
  .hero-actions { display: flex; gap: 0.9rem; flex-wrap: wrap; }
  .btn-primary, .btn-ghost, .header-cta { transition: transform var(--dur-fast) var(--ease-out); }
  .btn-primary:active, .btn-ghost:active, .header-cta:active { transform: scale(0.97); }
  .cta-link { transition: opacity var(--dur-fast) var(--ease-out); }
  .cta-link:active { opacity: 0.75; }
  .btn-primary {
    padding: 0.85rem 1.7rem; border-radius: 0.5rem;
    background: linear-gradient(155deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%), var(--accent);
    color: #fff; text-decoration: none; font-weight: 600;
    box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .btn-primary.btn-lg { padding: 1.05rem 2.1rem; font-size: 1.05rem; }
  .btn-ghost { padding: 0.85rem 1.7rem; border-radius: 0.5rem; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.5); color: #fff; text-decoration: none; font-weight: 600; }
  .cta-link { color: #fff; text-decoration: underline; text-underline-offset: 4px; font-weight: 600; text-shadow: 0 1px 12px rgba(0,0,0,0.4); }
  .mobile-cta-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 30; padding: 0.75rem 1rem; background: var(--card); border-top: 1px solid var(--border); display: none; }
  .mobile-cta-bar .btn-primary { display: block; text-align: center; }
  @media (max-width: 640px) {
    .mobile-cta-bar { display: block; }
    body { padding-bottom: 4.5rem; }
  }

  section { padding: clamp(${(3 * variant.whitespaceScale).toFixed(2)}rem, ${(7 * variant.whitespaceScale).toFixed(1)}vw, ${(6 * variant.whitespaceScale).toFixed(2)}rem) clamp(1.5rem, 6vw, 5rem); }
  h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); margin-bottom: 2rem; }

  .services-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1.1rem; }
  .service-card { display: flex; align-items: center; gap: 0.7rem; padding: 1.4rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.8rem; font-weight: 600; }
  .service-icon { display: flex; color: var(--primary); flex-shrink: 0; }
  .service-card--media { flex-direction: column; align-items: stretch; padding: 0; overflow: hidden; }
  .service-media { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; }
  .service-card-label { display: flex; align-items: center; gap: 0.6rem; padding: 1.1rem 1.3rem; }
  .service-card-label span { display: flex; color: var(--primary); }
  .service-card--featured { grid-row: span 2; }
  .service-card--featured .service-media { aspect-ratio: 4 / 5; height: 100%; }

  /* Numbered stacked feature list (numberedFeatureList) — real Awwwards
     technique (The Nest, thenest.pl), no cards/icons/images, for the
     restrained professionalProfile brandImpression only. */
  .numbered-features { display: flex; flex-direction: column; max-width: 42rem; }
  .numbered-feature { display: flex; align-items: baseline; gap: 1.25rem; padding: clamp(1.5rem, 4vw, 2.25rem) 0; border-bottom: 1px solid var(--border); }
  .numbered-feature:first-child { border-top: 1px solid var(--border); }
  .numbered-feature-index { flex-shrink: 0; font-size: 0.8rem; letter-spacing: 0.08em; color: color-mix(in srgb, var(--fg) 55%, transparent); }
  .numbered-feature h3 { margin: 0; font-size: clamp(1.2rem, 2.4vw, 1.6rem); }

  .editorial-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: clamp(1.5rem, 4vw, 4rem); align-items: center; margin-bottom: clamp(2.5rem, 6vw, 5rem); }
  .editorial-row:last-child { margin-bottom: 0; }
  .editorial-row--reverse { grid-template-columns: 1fr 1.2fr; }
  .editorial-row--reverse .editorial-media { order: 2; }
  .editorial-image { width: 100%; height: auto; border-radius: 1rem; aspect-ratio: 3 / 2; object-fit: cover; }
  .editorial-text h3 { font-size: clamp(1.3rem, 2.4vw, 1.8rem); margin-bottom: 0.75rem; }
  .editorial-text p { color: color-mix(in srgb, var(--fg) 75%, transparent); max-width: 34rem; }
  .editorial-eyebrow {
    display: block; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.75rem; font-weight: 600;
    color: color-mix(in srgb, var(--primary) 80%, var(--fg) 20%); margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
  }

  /* The editorial gallery's WOW/interaction moment (mission section 11):
     each real photo opens full-screen with its own caption via #lightbox
     (markup: lightboxMarkup, behavior: lightboxScript). */
  .editorial-lightbox-trigger {
    display: block; width: 100%; border: none; margin: 0; padding: 0; background: none; font: inherit;
    text-align: inherit; cursor: zoom-in; position: relative; border-radius: 1rem; overflow: hidden;
  }
  .lightbox-zoom-hint {
    position: absolute; top: 0.85rem; right: 0.85rem; display: flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; border-radius: 999px; color: #fff;
    background: color-mix(in srgb, #000 45%, transparent); opacity: 0;
    transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
    transform: scale(0.85);
  }
  .editorial-lightbox-trigger:hover .lightbox-zoom-hint,
  .editorial-lightbox-trigger:focus-visible .lightbox-zoom-hint { opacity: 1; transform: scale(1); }
  .editorial-lightbox-trigger:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }

  .lightbox {
    position: fixed; inset: 0; z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: clamp(1.5rem, 6vw, 4rem);
    background: color-mix(in srgb, #000 88%, transparent);
    visibility: hidden; opacity: 0;
    transition: opacity var(--dur-base) var(--ease-out), visibility 0s linear var(--dur-base);
  }
  .lightbox.is-open { visibility: visible; opacity: 1; transition-delay: 0s; }
  .lightbox-figure { margin: 0; max-width: min(90vw, 60rem); display: flex; flex-direction: column; gap: 1rem; }
  .lightbox-image { width: 100%; max-height: 70vh; object-fit: contain; border-radius: 0.75rem; }
  .lightbox-figure figcaption { color: #fff; text-align: center; display: flex; flex-direction: column; gap: 0.35rem; }
  .lightbox-caption-title { font-family: var(--font-heading); font-size: 1.1rem; }
  .lightbox-caption-body { font-size: 0.9rem; opacity: 0.75; max-width: 34rem; margin: 0 auto; }
  .lightbox-close, .lightbox-nav {
    position: absolute; border: 1px solid color-mix(in srgb, #fff 35%, transparent); background: transparent;
    color: #fff; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  }
  .lightbox-close:hover, .lightbox-nav:hover { background: color-mix(in srgb, #fff 14%, transparent); }
  .lightbox-close { top: clamp(1rem, 4vw, 2rem); right: clamp(1rem, 4vw, 2rem); width: 2.75rem; height: 2.75rem; }
  .lightbox-close:hover { transform: rotate(90deg); }
  .lightbox-nav { top: 50%; transform: translateY(-50%); width: 3rem; height: 3rem; }
  .lightbox-nav:hover { transform: translateY(-50%) scale(1.08); }
  .lightbox-prev { left: clamp(0.5rem, 3vw, 1.75rem); }
  .lightbox-next { right: clamp(0.5rem, 3vw, 1.75rem); }
  @media (max-width: 640px) {
    .lightbox-nav { width: 2.5rem; height: 2.5rem; }
    .lightbox-prev { left: 0.35rem; }
    .lightbox-next { right: 0.35rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lightbox, .lightbox-zoom-hint { transition-duration: 1ms !important; }
  }

  /* Angled/tilted horizontal carousel — pinned + scrubbed by GSAP ScrollTrigger
     (angledCarouselSection/angledCarouselScript). Prototype for Tobias Grünert;
     only .angled-card-media rotates (var(--tilt) per card) so the caption below
     stays level and readable. Straightens on hover per emil-design-eng guidance:
     transform-only, custom ease-out, no bare "all" transition. */
  .angled-carousel { padding-top: clamp(2rem, 5vw, 3.5rem); }
  .angled-carousel-viewport {
    overflow-x: auto; overflow-y: visible; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding: 1rem clamp(1.5rem, 6vw, 5rem) 2.5rem;
  }
  .angled-carousel-viewport::-webkit-scrollbar { display: none; }
  .angled-carousel-track {
    display: flex; gap: clamp(1.5rem, 4vw, 3rem); width: max-content; will-change: transform;
  }
  .angled-card { width: min(340px, 72vw); flex-shrink: 0; }
  .angled-card-media {
    position: relative; border-radius: 1rem; overflow: hidden; aspect-ratio: 3 / 4;
    transform: rotate(var(--tilt)); box-shadow: 0 22px 44px -22px rgba(0,0,0,0.35);
    transition: transform 260ms var(--ease-out), box-shadow 260ms var(--ease-out);
  }
  .angled-card-media:hover { transform: rotate(0deg) scale(1.03); box-shadow: 0 28px 54px -20px rgba(0,0,0,0.4); }
  .angled-card-image { width: 100%; height: 100%; object-fit: cover; display: block; }
  .angled-card-caption { padding-top: 1.1rem; max-width: 30rem; }
  .angled-card-caption h3 { font-size: clamp(1.05rem, 2vw, 1.3rem); margin-bottom: 0.4rem; }
  .angled-card-caption p { color: color-mix(in srgb, var(--fg) 75%, transparent); font-size: 0.92rem; }
  @media (prefers-reduced-motion: reduce) {
    .angled-card-media { transition-duration: 1ms !important; }
  }

  /* Pinned scroll-crossfade project reel (projectReelSection/
     projectReelScript) — a real 1:1 replica of dsgn interior's
     (dsgninterior.se) technique, logged in design-inspiration-
     playbook.md. Default rules below are the no-JS/GSAP-failed
     fallback: every layer renders as a plain stacked photo+caption
     block. .project-reel-js (added only once GSAP successfully sets
     up the pin) switches layers to an absolutely-positioned crossfade
     stack instead. */
  .project-reel { padding-top: clamp(2rem, 5vw, 3.5rem); padding-bottom: 0; }
  .project-reel-viewport { position: relative; }
  .project-reel-layer { position: relative; margin-bottom: 2px; }
  .project-reel-media { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
  .project-reel-scrim { display: none; }
  .project-reel-caption { padding: 1.5rem clamp(1.5rem, 6vw, 5rem) 0; }
  .project-reel-caption h3 { font-size: clamp(1.4rem, 3vw, 2rem); margin-bottom: 0.5rem; }
  .project-reel-caption p { color: color-mix(in srgb, var(--fg) 75%, transparent); max-width: 34rem; }

  .project-reel.project-reel-js .project-reel-viewport { height: 100vh; overflow: hidden; }
  .project-reel.project-reel-js .project-reel-layer {
    position: absolute; inset: 0; margin: 0; opacity: 0;
    transition: opacity 500ms var(--ease-out);
  }
  .project-reel.project-reel-js .project-reel-layer.is-active { opacity: 1; z-index: 1; }
  .project-reel.project-reel-js .project-reel-media { width: 100%; height: 100%; aspect-ratio: auto; }
  .project-reel.project-reel-js .project-reel-scrim {
    display: block; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%);
  }
  .project-reel.project-reel-js .project-reel-caption {
    position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; gap: 0.75rem;
    padding: 2rem; color: #fff;
  }
  .project-reel.project-reel-js .project-reel-caption p { color: rgba(255,255,255,0.85); }
  @media (prefers-reduced-motion: reduce) {
    .project-reel.project-reel-js .project-reel-layer { transition-duration: 1ms !important; }
  }

  .quick-links {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;
    padding: clamp(1.5rem, 4vw, 2.5rem) clamp(1.5rem, 6vw, 5rem) 0;
  }
  .quick-link-tile {
    display: flex; flex-direction: column; gap: 0.3rem; padding: 1.5rem 1.25rem; border-radius: 0.9rem;
    text-decoration: none; color: var(--fg); transition: transform var(--dur-fast) var(--ease-out);
  }
  .quick-link-tile:hover { transform: translateY(-3px); }
  .quick-link-tile--0 { background: color-mix(in srgb, var(--primary) 16%, var(--card)); }
  .quick-link-tile--1 { background: color-mix(in srgb, var(--secondary) 20%, var(--card)); }
  .quick-link-tile--2 { background: color-mix(in srgb, var(--accent) 16%, var(--card)); }
  .quick-link-eyebrow { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: color-mix(in srgb, var(--fg) 65%, transparent); }
  .quick-link-label { font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; }

  .location-banner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; padding-top: 2rem; padding-bottom: 2rem; }
  .location-eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.75rem; color: color-mix(in srgb, var(--fg) 55%, transparent); }
  .location-name { font-family: var(--font-heading); font-size: clamp(2.2rem, 7vw, 4.5rem); color: var(--primary); }
  .weather-badge {
    display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem; padding: 0.35rem 0.85rem;
    border-radius: 999px; background: var(--card); border: 1px solid var(--border);
    font-size: 0.8rem; color: color-mix(in srgb, var(--fg) 75%, transparent);
  }
  .weather-icon { display: flex; color: var(--primary); }
  .location-map {
    max-width: 900px; margin: 0 auto clamp(2rem, 5vw, 4rem); padding: 0 clamp(1.5rem, 6vw, 5rem);
  }
  .location-map iframe {
    width: 100%; height: 320px; border: 0; display: block; border-radius: 1rem;
    box-shadow: 0 16px 36px -18px rgba(0,0,0,0.3);
  }
  @media (max-width: 640px) { .location-map iframe { height: 220px; } }

  .detail-strip { display: flex; justify-content: center; flex-wrap: wrap; gap: 1.25rem; padding-top: 0; }
  .detail-item { width: min(280px, 40vw); }
  .detail-image { width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 0.8rem; }

  .environment { padding-top: 0; }
  .environment-image { width: 100%; height: auto; aspect-ratio: 21 / 9; object-fit: cover; border-radius: 1rem; }

  .about-text { max-width: 42rem; margin: 0 auto; text-align: center; color: color-mix(in srgb, var(--fg) 75%, transparent); font-size: 1.05rem; }

  .about-promise {
    max-width: 34rem; margin: clamp(2rem, 5vw, 3rem) auto 0; padding: 0 0 0 clamp(1rem, 3vw, 1.5rem);
    border-left: 3px solid var(--accent); text-align: left;
  }
  .about-promise p { margin: 0; font-family: var(--font-heading); font-style: italic; font-size: clamp(1.1rem, 2.2vw, 1.35rem); color: var(--fg); }
  .about-promise cite { display: block; margin-top: 0.6rem; font-style: normal; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: color-mix(in srgb, var(--fg) 60%, transparent); }

  .contact-wrap { display: grid; gap: 1.5rem; grid-template-columns: 1fr; max-width: 32rem; margin: 0 auto; }
  .contact-details { display: flex; flex-direction: column; gap: 0.9rem; padding: 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.9rem; }
  .contact-row { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; color: var(--fg); }
  .contact-row svg { color: var(--primary); flex-shrink: 0; }
  .contact-form { display: flex; flex-direction: column; gap: 0.7rem; padding: 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.9rem; }
  .contact-form input, .contact-form textarea { padding: 0.65rem 0.8rem; border-radius: 0.5rem; border: 1px solid var(--border); font: inherit; background: var(--bg); }
  .contact-form button { padding: 0.7rem; border: none; border-radius: 0.5rem; background: var(--primary); color: #fff; font-weight: 600; }
  .form-hint { margin: 0; font-size: 0.8rem; color: color-mix(in srgb, var(--fg) 65%, transparent); }

  footer { padding: 2rem 1.5rem 3rem; text-align: center; color: color-mix(in srgb, var(--fg) 65%, transparent); font-size: 0.8rem; }
  .demo-flag { display: inline-block; margin-top: 0.5rem; padding: 0.3rem 0.7rem; border-radius: 999px; background: color-mix(in srgb, var(--primary) 15%, white); color: var(--primary-dark); font-weight: 600; }

  .color-picker { position: fixed; bottom: 1.25rem; right: 1.25rem; z-index: 40; }
  .color-picker-trigger {
    width: 2.75rem; height: 2.75rem; border-radius: 999px; padding: 0; cursor: pointer;
    background:
      linear-gradient(155deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%),
      var(--swatch-color);
    border: 2px solid color-mix(in srgb, var(--card) 85%, transparent);
    box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--swatch-color) 70%, transparent), 0 2px 6px rgba(0,0,0,0.15);
    transition: transform var(--dur-fast) var(--ease-out);
  }
  .color-picker-trigger:hover { transform: scale(1.08); }
  .color-picker-panel {
    position: absolute; bottom: calc(100% + 0.75rem); right: 0;
    display: flex; flex-direction: column; gap: 0.6rem;
    padding: 0.9rem; border-radius: 1.1rem; width: 13rem;
    background: color-mix(in srgb, var(--card) 96%, transparent);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    box-shadow: 0 20px 45px -20px rgba(0,0,0,0.4);
    opacity: 0; transform: translateY(6px) scale(0.96); transform-origin: bottom right;
    pointer-events: none;
    transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
  }
  .color-picker.is-open .color-picker-panel { opacity: 1; transform: none; pointer-events: auto; }
  .color-picker-label { font-size: 0.72rem; font-weight: 600; color: color-mix(in srgb, var(--fg) 65%, transparent); }
  .color-picker-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
  .color-swatch {
    width: 1.6rem; height: 1.6rem; flex-shrink: 0; border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--card) 80%, transparent);
    background:
      linear-gradient(155deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 55%),
      var(--swatch-color);
    cursor: pointer; padding: 0;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
    transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch.is-active { box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--swatch-color); }
  @media (max-width: 640px) {
    .color-picker { bottom: calc(4.5rem + 0.75rem); right: 0.75rem; }
  }
  /* The picker's own click-to-preview crossfade is a deliberate,
   * user-initiated response (occasional, not ambient) — it plays
   * regardless of profile.motion, but still respects the OS-level
   * reduced-motion setting, which is a distinct, stronger signal. */
  @media (prefers-reduced-motion: no-preference) {
    .color-swapping, .color-swapping * {
      transition: background-color .45s ease, border-color .45s ease, color .45s ease, box-shadow .45s ease, fill .45s ease !important;
    }
  }

  @media (max-width: 720px) {
    .editorial-row, .editorial-row--reverse { grid-template-columns: 1fr; }
    .editorial-row--reverse .editorial-media { order: 0; }
    .service-card--featured { grid-row: auto; }
    .service-card--featured .service-media { aspect-ratio: 4 / 3; height: auto; }
    .detail-item { width: min(200px, 42vw); }
  }`;

  function renderPage(slug: PageSlug): DemoPage {
    const title = slug === "" ? `${name}${lead.location ? ` — ${escapeHtml(lead.location)}` : ""}` : `${pageNavLabel(slug, profile.industryKey)} — ${name}`;
    const headerHtml = renderHeader({
      navConcept: variant.navigationConcept,
      navPages,
      currentSlug: slug,
      name,
      initial,
      contactHref,
      showHeaderCta,
      previewAssetFor,
    });

    const bodyHtml = bodyFor(slug);
    // One fixed clip behind every page of the demo, not just the home
    // hero — a background that stops at the fold is not a background.
    const pageVideo = heroAsset?.videoScrubSrc ? pageVideoBackground(heroAsset) : "";

    const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="robots" content="noindex, nofollow" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${profile.typography.googleFontsHref}" rel="stylesheet" />
<style>${styleBlock}
</style>
</head>
<body${pageVideo ? ' class="page-video-mode"' : ""}>
  ${pageVideo}
  ${headerHtml}

  ${bodyHtml}

  <footer>
    <div>Unverbindliches Demo-Konzept — kein offizieller Auftritt von ${name}.</div>
    <span class="demo-flag">Demo-Vorschau</span>
  </footer>

  ${mobileCtaBar}
  ${colorPickerWidget(colorwayOptions, activeColorwayIndex)}

  ${reduceMotionScript()}
  ${headerScrollScript()}
  ${variant.navigationConcept === "fullscreen-overlay" ? fullscreenMenuScript() : ""}
  ${slug === "" && profile.motion !== "none" ? magneticCtaScript() : ""}
  ${bodyHtml.includes("editorial-lightbox-trigger") ? lightboxScript() : ""}
  ${bodyHtml.includes("weather-badge") ? weatherWidgetScript() : ""}
  ${bodyHtml.includes("angled-carousel") ? angledCarouselScript() : ""}
  ${bodyHtml.includes("project-reel") ? projectReelScript() : ""}
  ${bodyHtml.includes("data-scroll-video") || pageVideo ? scrollVideoScript() : ""}
  ${bodyHtml.includes("data-treatment-panel") ? treatmentAccordionScript() : ""}
  ${bodyHtml.includes("tab-indicator") ? floatingTabBarScript() : ""}
  ${bodyHtml.includes("fluid-flow") ? fluidFlowScript() : ""}
  ${colorPickerScript(colorwayOptions, activeColorwayIndex)}
  ${slug === "" && profile.use3d ? three3dScript(profile.colors.accent) : ""}
  ${profile.motion !== "none" && (variant.motionStructure === "scroll-scrub" || (slug === "" && variant.motionStructure === "cinematic-parallax")) ? gsapMotionScript(variant.motionStructure) : ""}
</body>
</html>
`;

    return { filename: pageFilename(slug), html };
  }

  return { pages: pageSlugs.map(renderPage), placeholders };
}

export function taglineFor(company: string, location: string, profile: VisualProfile, seed: string): string {
  const mood = formatMoodList(profile.brandImpression);
  const templates = [
    `${mood[0].toUpperCase()}${mood.slice(1)} in ${location}`,
    `Für alle in ${location}, denen ein ${mood} wirkender Auftritt wichtig ist`,
    `${profile.industryKey} mit Haltung — mitten in ${location}`,
  ];
  return pickVariant(templates, seed + ":tagline");
}

export function deriveServiceLabels(profile: VisualProfile): string[] {
  // Neutral, industry-generic category labels (never invented specifics
  // about the actual business) — matches the count planned for the
  // "service" asset role so every image slot has a caption.
  const count = profile.assetPlan.find((p) => p.role === "service")?.count ?? 3;
  const byIndustry: Record<string, string[]> = {
    Bäckerei: ["Brot & Brötchen", "Kuchen & Torten", "Kaffee & Snacks"],
    Restaurant: ["Mittagstisch", "À la carte", "Feiern & Events"],
    Café: ["Kaffeespezialitäten", "Frühstück", "Kuchenauswahl"],
    Friseur: ["Haarschnitt & Styling", "Farbe & Strähnen", "Beratung"],
    Zahnarzt: ["Vorsorge", "Ästhetische Zahnheilkunde", "Notfalltermine"],
    Arztpraxis: ["Allgemeine Sprechstunde", "Vorsorgeuntersuchungen", "Terminvereinbarung"],
    Rechtsanwalt: ["Erstberatung", "Vertretung", "Vertragsprüfung"],
    Steuerberater: ["Steuererklärung", "Buchhaltung", "Unternehmensberatung"],
    Physiotherapie: ["Krankengymnastik", "Massage", "Rehatraining"],
    Blumenladen: ["Sträuße & Gestecke", "Hochzeitsfloristik", "Trauerfloristik"],
    Fahrradladen: ["Verkauf", "Reparatur & Service", "Zubehör"],
    Autowerkstatt: ["Inspektion", "Reparatur", "Reifenservice"],
    Immobilienmakler: ["Verkauf", "Vermietung", "Immobilienbewertung"],
    Hotel: ["Zimmer & Suiten", "Frühstück", "Veranstaltungen"],
    Tierarzt: ["Sprechstunde", "Vorsorge", "Notfallversorgung"],
  };
  const labels = byIndustry[profile.industryKey] ?? ["Beratung", "Service vor Ort", "Persönlicher Kontakt"];
  return labels.slice(0, count);
}
