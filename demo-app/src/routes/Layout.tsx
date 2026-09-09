import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import type { LeadData } from "../types";

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

/** Fetches the lead's data once per slug and hands it down to whichever
 * page route is active via <Outlet context={...}> (see routes/*.tsx,
 * each reading it back with useOutletContext<LeadData>()) — real
 * multi-page navigation (index/leistungen/ueber-uns/kontakt, matching
 * the static-HTML engine's page split) instead of one long single
 * page, without re-fetching data on every navigation. */
export function Layout() {
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
      <Outlet context={data} />
      <footer className="site-footer">
        <div>Unverbindliches Demo-Konzept — kein offizieller Auftritt von {data.companyName}.</div>
        <span className="demo-flag">Demo-Vorschau · Vite + React + WebGL</span>
      </footer>
    </>
  );
}
