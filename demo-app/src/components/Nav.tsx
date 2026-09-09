import type { LeadData } from "../types";

export function Nav({ data }: { data: LeadData }) {
  const initial = data.companyName.trim().charAt(0).toUpperCase() || "?";
  return (
    <header className="site-header">
      <div className="brand-mark">
        <span className="brand-avatar">{initial}</span>
        <span className="brand-name">{data.companyName}</span>
      </div>
      <nav className="site-nav">
        <a href="#home">Home</a>
        <a href="#leistungen">{data.servicesLabel}</a>
      </nav>
    </header>
  );
}
