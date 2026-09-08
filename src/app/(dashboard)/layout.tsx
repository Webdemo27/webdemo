import type { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Buildings } from "@phosphor-icons/react/dist/ssr";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside
        className="hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-card md:flex"
      >
        <div className="flex h-[var(--header-height)] items-center gap-2 border-b border-border px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Buildings size={18} weight="fill" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-foreground">Webdemo</span>
        </div>
        <SidebarNav />
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          Lokales Dashboard · v0.1
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        {children}
      </div>
    </div>
  );
}
