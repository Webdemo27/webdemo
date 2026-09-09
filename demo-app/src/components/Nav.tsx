import { NavLink } from "react-router-dom";
import type { LeadData } from "../types";

export function Nav({ data }: { data: LeadData }) {
  const initial = data.companyName.trim().charAt(0).toUpperCase() || "?";
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "is-active" : undefined);

  return (
    <header className="site-header">
      <div className="brand-mark">
        <span className="brand-avatar">{initial}</span>
        <span className="brand-name">{data.companyName}</span>
      </div>
      <nav className="site-nav">
        <NavLink to={`/${data.slug}`} end className={linkClass}>
          Home
        </NavLink>
        <NavLink to={`/${data.slug}/leistungen`} className={linkClass}>
          {data.servicesLabel}
        </NavLink>
        <NavLink to={`/${data.slug}/ueber-uns`} className={linkClass}>
          Über uns
        </NavLink>
        <NavLink to={`/${data.slug}/kontakt`} className={linkClass}>
          Kontakt
        </NavLink>
      </nav>
    </header>
  );
}
