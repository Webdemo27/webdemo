import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AboutSection({ text }: { text: string }) {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(".about-text", { opacity: 1, y: 0 });
        return;
      }
      gsap.set(".about-text", { opacity: 0, y: 20 });
      gsap.to(".about-text", {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="ueber-uns" className="about" ref={ref}>
      <h2>Über uns</h2>
      <p className="about-text">{text}</p>
    </section>
  );
}
