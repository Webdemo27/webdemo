import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Nav } from "./components/Nav";
import { WebGLHero } from "./components/WebGLHero";
import { ServicesSection } from "./components/ServicesSection";
import { AboutSection } from "./components/AboutSection";
import { ContactSection } from "./components/ContactSection";
import type { LeadData } from "./types";

/** Sets CSS custom properties from the lead's real color palette (same
 * variables the existing static-HTML engine uses) so every component
 * below can just read var(--primary) etc. instead of prop-drilling
 * colors through the whole tree. */
function applyTheme(data: LeadData) {
  const root = document.documentElement.style;
  root.setProperty("--primary", data.colors.primary);
  root.setProperty("--primary-dark", data.colors.primaryDark);
  root.setProperty("--secondary", data.colors.secondary);
  root.setProperty("--accent", data.colors.accent);
  root.setProperty("--bg", data.colors.background);
  root.setProperty("--fg", data.colors.foreground);
  root.setProperty("--font-heading", `'${data.typography.heading}', serif`);
  root.setProperty("--font-body", `'${data.typography.body}', sans-serif`);

  const existing = document.getElementById("lead-fonts");
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.id = "lead-fonts";
  link.rel = "stylesheet";
  link.href = data.typography.googleFontsHref;
  document.head.appendChild(link);

  document.title = `${data.companyName} — ${data.location}`;
}

export function App() {
  const { slug } = useParams();
  const [data, setData] = useState<LeadData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/data/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: LeadData) => {
        if (cancelled) return;
        setData(json);
        applyTheme(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) return <div className="state-message">Demo nicht gefunden.</div>;
  if (!data) return <div className="state-message">Lädt…</div>;

  return (
    <>
      <Nav data={data} />
      <section id="home" className="hero">
        <WebGLHero imageUrl={data.heroImage} />
        <div className="hero-content">
          <h1>{data.companyName}</h1>
          <p className="hero-tagline">{data.tagline}</p>
          <a className="btn-primary" href="#leistungen">
            {data.servicesLabel} ansehen
          </a>
        </div>
      </section>
      <ServicesSection services={data.services} label={data.servicesLabel} />
      <AboutSection text={data.aboutText} />
      <ContactSection data={data} />
      <footer className="site-footer">
        <div>Unverbindliches Demo-Konzept — kein offizieller Auftritt von {data.companyName}.</div>
        <span className="demo-flag">Demo-Vorschau · Vite + React + WebGL</span>
      </footer>
    </>
  );
}
