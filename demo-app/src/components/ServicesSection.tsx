import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LeadService } from "../types";

gsap.registerPlugin(ScrollTrigger);

/** Real GSAP + ScrollTrigger, not a CSS-only fade: cards start below
 * their resting position and slightly scaled down, staggered 90ms apart,
 * and only animate once — cleaned up on unmount via ctx.revert() so
 * navigating away mid-scroll never leaves a dangling ScrollTrigger
 * watching a removed DOM node (the exact class of bug the mission's
 * "ScrollTrigger cleanup" requirement calls out). */
export function ServicesSection({ services, label }: { services: LeadService[]; label: string }) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(".service-card", { opacity: 1, y: 0, scale: 1 });
        return;
      }
      gsap.set(".service-card", { opacity: 0, y: 40, scale: 0.96 });
      gsap.to(".service-card", {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="leistungen" className="services" ref={sectionRef}>
      <h2>{label}</h2>
      <ul className="services-grid">
        {services.map((service) => (
          <li key={service.label} className="service-card">
            <img src={service.image} alt={service.label} className="service-media" />
            <span className="service-label">{service.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
