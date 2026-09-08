"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { List, X, Buildings } from "@phosphor-icons/react";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
      <button
        type="button"
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted cursor-pointer"
      >
        {open ? <X size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}
      </button>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Buildings size={14} weight="fill" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-foreground">Webdemo</span>

      {open ? (
        <div className="fixed inset-0 z-40 flex">
          <button
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 flex h-full w-64 flex-col bg-card shadow-xl">
            <div className="flex h-[var(--header-height)] items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold text-foreground">Navigation</span>
              <button
                type="button"
                aria-label="Menü schließen"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <SidebarNav />
          </div>
        </div>
      ) : null}
    </div>
  );
}
