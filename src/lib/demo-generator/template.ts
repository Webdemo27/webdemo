import type { IndustryConfig } from "./industry-config";

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
  check: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
};

/** Renders a complete, self-contained demo page — no external CSS/JS,
 * no CDN dependency, so it works offline and is trivial to deploy as a
 * single static artifact later (Phase 11). Never fabricates business
 * facts: missing contact fields fall back to a contact form instead of
 * an invented phone/email, and `placeholders` records exactly which
 * fields were not real data so a reviewer can see it at a glance. */
export function renderDemoHtml(
  lead: DemoData,
  config: IndustryConfig
): { html: string; placeholders: DemoPlaceholders } {
  const name = escapeHtml(lead.companyName);
  const location = lead.location ?? "Ihrer Region";
  const tagline = escapeHtml(config.tagline.replace("{location}", location));
  const initial = escapeHtml(lead.companyName.trim().charAt(0).toUpperCase() || "?");

  const placeholders: DemoPlaceholders = {
    location: !lead.location,
    address: !lead.address,
    phone: !lead.contactPhone,
    email: !lead.contactEmail,
  };

  const contactCard = lead.contactPhone || lead.contactEmail
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

  const servicesHtml = config.services
    .map(
      (s) => `
      <li class="service-card">
        <span class="service-icon">${ICONS.check}</span>
        <span>${escapeHtml(s)}</span>
      </li>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name}${lead.location ? ` — ${escapeHtml(lead.location)}` : ""}</title>
<meta name="robots" content="noindex, nofollow" />
<style>
  :root {
    --accent: ${config.accent};
    --accent-dark: ${config.accentDark};
    --bg: #f8fafc;
    --fg: #0f172a;
    --muted: #475569;
    --card: #ffffff;
    --border: #e2e8f0;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.6; }
  a { color: inherit; }
  .site-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background: var(--card); border-bottom: 1px solid var(--border); }
  .brand { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1.05rem; }
  .brand-mark { display: flex; align-items: center; justify-content: center; width: 2.1rem; height: 2.1rem; border-radius: 0.6rem; background: var(--accent); color: #fff; font-weight: 700; }
  .header-cta { padding: 0.55rem 1.1rem; border-radius: 0.5rem; background: var(--accent); color: #fff; text-decoration: none; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
  .hero { padding: 4.5rem 1.5rem 4rem; text-align: center; background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, white), var(--bg)); }
  .hero h1 { font-size: clamp(1.8rem, 4vw, 2.75rem); margin: 0 0 0.75rem; letter-spacing: -0.02em; }
  .hero p { max-width: 40rem; margin: 0 auto 1.75rem; color: var(--muted); font-size: 1.05rem; }
  .hero-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
  .btn-primary { padding: 0.8rem 1.6rem; border-radius: 0.6rem; background: var(--accent); color: #fff; text-decoration: none; font-weight: 600; }
  .btn-secondary { padding: 0.8rem 1.6rem; border-radius: 0.6rem; background: var(--card); color: var(--fg); text-decoration: none; font-weight: 600; border: 1px solid var(--border); }
  section { padding: 3.5rem 1.5rem; max-width: 64rem; margin: 0 auto; }
  h2 { font-size: 1.6rem; text-align: center; margin: 0 0 2rem; letter-spacing: -0.01em; }
  .services { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
  .service-card { display: flex; align-items: center; gap: 0.7rem; padding: 1.25rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.75rem; font-weight: 600; }
  .service-icon { display: flex; color: var(--accent); flex-shrink: 0; }
  .about-text { max-width: 42rem; margin: 0 auto; text-align: center; color: var(--muted); }
  .contact-wrap { display: grid; gap: 1.5rem; grid-template-columns: 1fr; max-width: 32rem; margin: 0 auto; }
  .contact-details { display: flex; flex-direction: column; gap: 0.9rem; padding: 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.75rem; }
  .contact-row { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; color: var(--fg); }
  .contact-row svg { color: var(--accent); flex-shrink: 0; }
  .contact-form { display: flex; flex-direction: column; gap: 0.7rem; padding: 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 0.75rem; }
  .contact-form input, .contact-form textarea { padding: 0.65rem 0.8rem; border-radius: 0.5rem; border: 1px solid var(--border); font: inherit; background: var(--bg); }
  .contact-form button { padding: 0.7rem; border: none; border-radius: 0.5rem; background: var(--accent); color: #fff; font-weight: 600; }
  .form-hint { margin: 0; font-size: 0.8rem; color: var(--muted); }
  footer { padding: 2rem 1.5rem 3rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
  .demo-flag { display: inline-block; margin-top: 0.5rem; padding: 0.3rem 0.7rem; border-radius: 999px; background: color-mix(in srgb, var(--accent) 15%, white); color: var(--accent-dark); font-weight: 600; }
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

  <section class="hero">
    <h1>${name}</h1>
    <p>${tagline}</p>
    <div class="hero-actions">
      <a class="btn-primary" href="#kontakt">Jetzt Kontakt aufnehmen</a>
      <a class="btn-secondary" href="#leistungen">Leistungen ansehen</a>
    </div>
  </section>

  <section id="leistungen">
    <h2>Leistungen</h2>
    <ul class="services">${servicesHtml}</ul>
  </section>

  <section id="ueber-uns">
    <h2>Über uns</h2>
    <p class="about-text">
      ${name} ist für Kundinnen und Kunden in ${escapeHtml(location)} da.
      Dieses Demo-Konzept zeigt, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte —
      Inhalte und Bilder werden im nächsten Schritt gemeinsam mit Ihnen final abgestimmt.
    </p>
  </section>

  <section id="kontakt">
    <h2>Kontakt</h2>
    <div class="contact-wrap">
      ${contactCard}
    </div>
  </section>

  <footer>
    <div>Unverbindliches Demo-Konzept — kein offizieller Auftritt von ${name}.</div>
    <span class="demo-flag">Demo-Vorschau</span>
  </footer>
</body>
</html>
`;

  return { html, placeholders };
}
