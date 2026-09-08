import type { VisualProfile } from "../visual-director/types";
import { pickVariant } from "../messaging/templates";
import { toAssetView, groupByRole, type DemoAssetView } from "./asset-view";

export interface DemoData {
  companyName: string;
  industry: string | null;
  location: string | null;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
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

const ABOUT_OPENERS = [
  "{company} steht für {mood} Qualität in {location}.",
  "In {location} ist {company} die Adresse für {mood} Service.",
  "{company} verbindet {mood} Handwerk mit persönlicher Beratung in {location}.",
];

const ABOUT_CLOSERS = [
  "Dieses Demo-Konzept zeigt, wie ein moderner, mobilfreundlicher Auftritt dazu aussehen könnte.",
  "Dieser Entwurf skizziert, wie sich das online genauso hochwertig zeigen lässt.",
  "Inhalte und Bilder werden im nächsten Schritt gemeinsam final abgestimmt.",
];

function heroTextPosition(profile: VisualProfile): string {
  if (profile.layoutDirection === "grid-clean") return "hero-center";
  if (profile.layoutDirection === "bold-blocks") return "hero-center";
  return "hero-bottom-left";
}

function heroSection(name: string, tagline: string, hero: DemoAssetView | undefined, profile: VisualProfile): string {
  const position = heroTextPosition(profile);
  const visual = profile.use3d
    ? `<canvas id="scene3d" class="hero-canvas" aria-hidden="true"></canvas>`
    : hero
    ? pictureTag(hero, "hero-media", true)
    : "";

  return `
  <section class="hero ${position}">
    <div class="hero-bg">${visual}</div>
    <div class="hero-scrim"></div>
    <div class="hero-content" data-reveal>
      <h1>${escapeHtml(name)}</h1>
      <p class="hero-tagline">${escapeHtml(tagline)}</p>
      <div class="hero-actions">
        <a class="btn-primary" href="#kontakt">Jetzt Kontakt aufnehmen</a>
        <a class="btn-ghost" href="#leistungen">Leistungen ansehen</a>
      </div>
    </div>
  </section>`;
}

function serviceCard(label: string, asset: DemoAssetView | undefined, featured: boolean): string {
  if (asset) {
    return `
    <li class="service-card service-card--media ${featured ? "service-card--featured" : ""}" data-reveal>
      ${pictureTag(asset, "service-media")}
      <div class="service-card-label"><span>${ICONS.check}</span>${escapeHtml(label)}</div>
    </li>`;
  }
  return `
    <li class="service-card" data-reveal>
      <span class="service-icon">${ICONS.check}</span>
      <span>${escapeHtml(label)}</span>
    </li>`;
}

function servicesSection(services: string[], assets: DemoAssetView[]): string {
  const cards = services
    .map((label, i) => serviceCard(label, assets[i], i === 0 && assets.length > 0))
    .join("");
  return `
  <section id="leistungen" class="services">
    <h2 data-reveal>Leistungen</h2>
    <ul class="services-grid">${cards}</ul>
  </section>`;
}

function editorialRow(asset: DemoAssetView, index: number, headline: string, body: string): string {
  const reversed = index % 2 === 1;
  return `
  <div class="editorial-row ${reversed ? "editorial-row--reverse" : ""}" data-reveal>
    <div class="editorial-media">${pictureTag(asset, "editorial-image")}</div>
    <div class="editorial-text">
      <h3>${escapeHtml(headline)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
  </div>`;
}

function editorialSection(assets: DemoAssetView[], name: string, location: string): string {
  if (assets.length === 0) return "";
  const headlines = ["Ein Ort mit Charakter", "Erfahrung, die man sieht", "Details, die zählen"];
  const bodies = [
    `${name} legt Wert auf Atmosphäre und Sorgfalt – spürbar in jedem Detail vor Ort in ${location}.`,
    `Wer ${name} besucht, merkt schnell: hier steckt echtes Handwerk und Aufmerksamkeit dahinter.`,
    `Kleine Details machen den Unterschied – genau die, die ${name} täglich im Blick hat.`,
  ];
  const rows = assets
    .map((asset, i) => editorialRow(asset, i, headlines[i % headlines.length], bodies[i % bodies.length]))
    .join("");
  return `<section class="editorial">${rows}</section>`;
}

function locationBanner(location: string): string {
  return `
  <section class="location-banner" data-reveal>
    <span class="location-eyebrow">Vor Ort in</span>
    <span class="location-name">${escapeHtml(location)}</span>
  </section>`;
}

function detailStrip(assets: DemoAssetView[]): string {
  if (assets.length === 0) return "";
  return `
  <section class="detail-strip" data-reveal>
    ${assets.map((a) => `<div class="detail-item">${pictureTag(a, "detail-image")}</div>`).join("")}
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

function aboutSection(name: string, location: string, mood: string, seed: string): string {
  const opener = pickVariant(ABOUT_OPENERS, seed + ":about-open")
    .replace("{company}", name)
    .replace("{location}", location)
    .replace("{mood}", formatMoodList(mood));
  const closer = pickVariant(ABOUT_CLOSERS, seed + ":about-close");
  return `
  <section id="ueber-uns" class="about" data-reveal>
    <h2>Über uns</h2>
    <p class="about-text">${escapeHtml(opener)} ${escapeHtml(closer)}</p>
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
      <h2>Kontakt</h2>
      <div class="contact-wrap">${contactCard}</div>
    </section>`;
}

function reduceMotionScript(): string {
  return `
  <script>
    (function () {
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

export function renderDemoHtml(
  lead: DemoData,
  profile: VisualProfile,
  rawAssets: RawAssetInput[]
): { html: string; placeholders: DemoPlaceholders } {
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

  const assets = rawAssets.map(toAssetView);
  const byRole = groupByRole(assets);
  const heroAsset = byRole.hero?.[0];
  const serviceAssets = byRole.service ?? [];
  const editorialAssets = byRole.editorial ?? [];
  const detailAssets = byRole.detail ?? [];
  const environmentAsset = byRole.environment?.[0];

  const services = profile.assetPlan
    .find((p) => p.role === "service")
    ? deriveServiceLabels(profile)
    : [];

  const contactHtml = contactSection(lead);

  const motionCss = profile.motion === "none" ? "" : `[data-reveal]{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease;} [data-reveal].is-visible{opacity:1;transform:none;}`;

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name}${lead.location ? ` — ${escapeHtml(lead.location)}` : ""}</title>
<meta name="robots" content="noindex, nofollow" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${profile.typography.googleFontsHref}" rel="stylesheet" />
<style>
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
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--font-body); background: var(--bg); color: var(--fg); line-height: 1.65; }
  h1, h2, h3 { font-family: var(--font-heading); font-weight: 700; letter-spacing: -0.01em; margin: 0; }
  a { color: inherit; }
  img { display: block; max-width: 100%; }
  ${motionCss}

  .site-header { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.75rem; background: color-mix(in srgb, var(--card) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); }
  .brand { display: flex; align-items: center; gap: 0.6rem; font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem; }
  .brand-mark { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 0.5rem; background: var(--primary); color: #fff; font-weight: 700; }
  .header-cta { padding: 0.6rem 1.2rem; border-radius: 0.4rem; background: var(--primary); color: #fff; text-decoration: none; font-size: 0.85rem; font-weight: 600; }

  .hero { position: relative; min-height: 88vh; display: flex; overflow: hidden; background: linear-gradient(150deg, color-mix(in srgb, var(--primary) 30%, var(--bg)), var(--bg)); }
  .hero-bg { position: absolute; inset: 0; }
  .hero-media, .hero-canvas { width: 100%; height: 100%; object-fit: cover; }
  .hero-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 100%); }
  .hero.hero-center .hero-scrim { background: rgba(0,0,0,0.55); }
  .hero-content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1.25rem; padding: 3rem clamp(1.5rem, 6vw, 5rem); max-width: 46rem; }
  .hero.hero-bottom-left { align-items: flex-start; justify-content: flex-end; }
  .hero.hero-center { align-items: center; justify-content: center; text-align: center; margin: 0 auto; }
  .hero h1 { color: #fff; font-size: clamp(2.2rem, 5.5vw, 4rem); text-shadow: 0 2px 28px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.5); }
  .hero-tagline { color: rgba(255,255,255,0.95); font-size: clamp(1.05rem, 2vw, 1.35rem); max-width: 34rem; text-shadow: 0 1px 12px rgba(0,0,0,0.4); }
  .hero-actions { display: flex; gap: 0.9rem; flex-wrap: wrap; }
  .btn-primary { padding: 0.85rem 1.7rem; border-radius: 0.5rem; background: var(--accent); color: #fff; text-decoration: none; font-weight: 600; }
  .btn-ghost { padding: 0.85rem 1.7rem; border-radius: 0.5rem; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.5); color: #fff; text-decoration: none; font-weight: 600; }

  section { padding: clamp(3rem, 7vw, 6rem) clamp(1.5rem, 6vw, 5rem); }
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

  .editorial-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: clamp(1.5rem, 4vw, 4rem); align-items: center; margin-bottom: clamp(2.5rem, 6vw, 5rem); }
  .editorial-row:last-child { margin-bottom: 0; }
  .editorial-row--reverse { grid-template-columns: 1fr 1.2fr; }
  .editorial-row--reverse .editorial-media { order: 2; }
  .editorial-image { width: 100%; height: auto; border-radius: 1rem; aspect-ratio: 3 / 2; object-fit: cover; }
  .editorial-text h3 { font-size: clamp(1.3rem, 2.4vw, 1.8rem); margin-bottom: 0.75rem; }
  .editorial-text p { color: color-mix(in srgb, var(--fg) 75%, transparent); max-width: 34rem; }

  .location-banner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; padding-top: 2rem; padding-bottom: 2rem; }
  .location-eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.75rem; color: color-mix(in srgb, var(--fg) 55%, transparent); }
  .location-name { font-family: var(--font-heading); font-size: clamp(2.2rem, 7vw, 4.5rem); color: var(--primary); }

  .detail-strip { display: flex; justify-content: center; flex-wrap: wrap; gap: 1.25rem; padding-top: 0; }
  .detail-item { width: min(280px, 40vw); }
  .detail-image { width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 0.8rem; }

  .environment { padding-top: 0; }
  .environment-image { width: 100%; height: auto; aspect-ratio: 21 / 9; object-fit: cover; border-radius: 1rem; }

  .about-text { max-width: 42rem; margin: 0 auto; text-align: center; color: color-mix(in srgb, var(--fg) 75%, transparent); font-size: 1.05rem; }

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

  @media (max-width: 720px) {
    .editorial-row, .editorial-row--reverse { grid-template-columns: 1fr; }
    .editorial-row--reverse .editorial-media { order: 0; }
    .service-card--featured { grid-row: auto; }
    .service-card--featured .service-media { aspect-ratio: 4 / 3; height: auto; }
    .detail-item { width: min(200px, 42vw); }
  }
</style>
</head>
<body>
  <header class="site-header">
    <div class="brand">
      <span class="brand-mark">${initial}</span>
      <span>${name}</span>
    </div>
    <a class="header-cta" href="#kontakt">Kontakt</a>
  </header>

  ${heroSection(lead.companyName, taglineFor(lead.companyName, location, profile, seed), heroAsset, profile)}

  ${servicesSection(services, serviceAssets)}
  ${editorialSection(editorialAssets, lead.companyName, location)}
  ${detailStrip(detailAssets)}
  ${lead.location ? locationBanner(lead.location) : ""}
  ${environmentSection(environmentAsset)}
  ${aboutSection(lead.companyName, location, profile.brandImpression, seed)}
  ${contactHtml}

  <footer>
    <div>Unverbindliches Demo-Konzept — kein offizieller Auftritt von ${name}.</div>
    <span class="demo-flag">Demo-Vorschau</span>
  </footer>

  ${reduceMotionScript()}
  ${profile.use3d ? three3dScript(profile.colors.accent) : ""}
</body>
</html>
`;

  return { html, placeholders };
}

function taglineFor(company: string, location: string, profile: VisualProfile, seed: string): string {
  const templates = [
    `${profile.brandImpression[0].toUpperCase()}${profile.brandImpression.slice(1)} in ${location}`,
    `Für Kund:innen in ${location}, die Wert auf ${profile.brandImpression.split(",")[0]} legen`,
    `${profile.industryKey} mit Haltung — mitten in ${location}`,
  ];
  return pickVariant(templates, seed + ":tagline");
}

function deriveServiceLabels(profile: VisualProfile): string[] {
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
