import { Link, useOutletContext } from "react-router-dom";
import { WebGLHero } from "../components/WebGLHero";
import { LocationSection } from "../components/LocationSection";
import type { LeadData } from "../types";

export function HomePage() {
  const data = useOutletContext<LeadData>();
  return (
    <>
      <section id="home" className="hero">
        <WebGLHero imageUrl={data.heroImage} />
        <div className="hero-scrim" />
        <div className="hero-content">
          <h1>{data.companyName}</h1>
          <p className="hero-tagline">{data.tagline}</p>
          <Link className="btn-primary" to={`/${data.slug}/leistungen`}>
            {data.servicesLabel} ansehen
          </Link>
        </div>
      </section>
      <LocationSection location={data.location} latitude={data.latitude} longitude={data.longitude} />
    </>
  );
}
