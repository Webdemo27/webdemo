import { useEffect, useRef, useState } from "react";
import type { LeadEditorialItem } from "../types";

/** React port of the static engine's editorial gallery + lightbox
 * (mission sections 11/12 — a real interaction, not just a photo row).
 * State-driven rather than the vanilla-DOM version there: `activeIndex`
 * is the single source of truth for which image is open, so keyboard
 * nav/close just update state instead of manually toggling classes.
 * Captions are the same real copy already printed inline — nothing
 * invented for the lightbox. */
export function EditorialGallery({ items, label }: { items: LeadEditorialItem[]; label: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
      if (e.key === "ArrowRight") setActiveIndex((i) => (i === null ? i : (i + 1) % items.length));
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeIndex, items.length]);

  if (items.length === 0) return null;

  function open(index: number, trigger: HTMLElement) {
    lastFocused.current = trigger;
    setActiveIndex(index);
  }

  function close() {
    setActiveIndex(null);
    lastFocused.current?.focus();
  }

  const active = activeIndex !== null ? items[activeIndex] : null;

  return (
    <section className="editorial">
      <span className="editorial-eyebrow">{label}</span>
      {items.map((item, i) => (
        <div className={`editorial-row ${i % 2 === 1 ? "editorial-row--reverse" : ""}`} key={item.headline + i}>
          <button
            type="button"
            className="editorial-media editorial-lightbox-trigger"
            aria-label={`${item.headline} – Bild vergrößern`}
            onClick={(e) => open(i, e.currentTarget)}
          >
            <img src={item.image} alt={item.headline} className="editorial-image" />
            <span className="lightbox-zoom-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </span>
          </button>
          <div className="editorial-text">
            <h3>{item.headline}</h3>
            <p>{item.body}</p>
          </div>
        </div>
      ))}

      {active && (
        <div className="lightbox is-open" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.target === e.currentTarget && close()}>
          <button type="button" className="lightbox-close" aria-label="Schließen" ref={closeButtonRef} onClick={close}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {items.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav lightbox-prev"
                aria-label="Vorheriges Bild"
                onClick={() => setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length))}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="lightbox-nav lightbox-next"
                aria-label="Nächstes Bild"
                onClick={() => setActiveIndex((i) => (i === null ? i : (i + 1) % items.length))}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}
          <figure className="lightbox-figure">
            <img className="lightbox-image" src={active.image} alt={active.headline} />
            <figcaption>
              <span className="lightbox-caption-title">{active.headline}</span>
              <span className="lightbox-caption-body">{active.body}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
