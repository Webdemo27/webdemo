"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Buildings,
  Browser,
  ChatCircleText,
  GearSix,
  Phone,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

// Anrufe sits directly under Overview because it is the work: 78% of
// these leads have a phone number and 38% an email, and nothing in this
// pipeline earns anything until someone actually speaks to a business.
const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: SquaresFour },
  { href: "/anrufe", label: "Anrufe", icon: Phone },
  { href: "/leads", label: "Leads", icon: Buildings },
  { href: "/demos", label: "Demos", icon: Browser },
  { href: "/messages", label: "Messages", icon: ChatCircleText },
  { href: "/settings", label: "Settings", icon: GearSix },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Hauptnavigation">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
