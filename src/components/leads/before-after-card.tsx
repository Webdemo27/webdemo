"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowsLeftRight } from "@phosphor-icons/react";

/** Real viewport screenshots, before and after, as one draggable
 * comparison — the lead's current live site revealed under the freshly
 * generated demo. Both images come from analysis/screenshot.ts
 * (Playwright), never a mockup or invented "after" state. Renders
 * nothing until both halves exist, since a lopsided single-image
 * comparison isn't the point — the whole value is the direct contrast. */
export function BeforeAfterCard({
  beforePath,
  afterPath,
  companyName,
}: {
  beforePath: string | null | undefined;
  afterPath: string | null | undefined;
  companyName: string;
}) {
  if (!beforePath || !afterPath) return null;

  return (
    <Card className="hover-lift">
      <CardHeader>
        <div>
          <CardTitle>Vorher / Nachher</CardTitle>
          <CardDescription>Echte Aufnahmen — kein Mockup. Ziehen zum Vergleichen.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <BeforeAfterSlider beforePath={beforePath} afterPath={afterPath} companyName={companyName} />
      </CardContent>
    </Card>
  );
}

function BeforeAfterSlider({
  beforePath,
  afterPath,
  companyName,
}: {
  beforePath: string;
  afterPath: string;
  companyName: string;
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[1440/900] w-full touch-none overflow-hidden rounded-lg border border-border select-none"
      onPointerDown={(e) => {
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging) setFromClientX(e.clientX);
      }}
      onPointerUp={() => setDragging(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local static screenshot file */}
      <img
        src={afterPath}
        alt={`Neues Demo-Konzept für ${companyName}`}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute top-2 right-2 rounded-full bg-success/90 px-2 py-0.5 text-[10px] font-semibold text-white"
        aria-hidden="true"
      >
        Nachher
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- local static screenshot file */}
      <img
        src={beforePath}
        alt={`Aktuelle Website von ${companyName}`}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />
      <div
        className="pointer-events-none absolute top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-background transition-[left]"
        style={{ left: 8, opacity: position > 12 ? 1 : 0 }}
        aria-hidden="true"
      >
        Vorher
      </div>

      {/* Divider + handle. A real button with a slider role and arrow-key
          support — dragging is convenient but never the only way to use
          this, per accessible-dragging guidance. */}
      <div
        className={`pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] ${dragging ? "" : "transition-[left]"}`}
        style={{ left: `${position}%` }}
      />
      <button
        type="button"
        role="slider"
        aria-label="Vorher/Nachher-Vergleich verschieben"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-border bg-card text-foreground shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dragging ? "" : "transition-[left]"}`}
        style={{ left: `${position}%` }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
          else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
          else if (e.key === "Home") setPosition(0);
          else if (e.key === "End") setPosition(100);
          else return;
          e.preventDefault();
        }}
      >
        <ArrowsLeftRight size={16} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
