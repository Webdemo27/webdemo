import { Fire, Snowflake } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils/cn";

const TIER_META = {
  hot: { label: "Hot", className: "bg-warning/10 text-warning border-warning/25", icon: Fire, weight: "fill" as const },
  warm: { label: "Warm", className: "bg-primary/10 text-primary border-primary/25", icon: Fire, weight: "regular" as const },
  cold: { label: "Cold", className: "bg-muted text-muted-foreground border-border", icon: Snowflake, weight: "regular" as const },
} as const;

/** Sales-priority signal for a lead — derived from the X-Ray concept's
 * salesOpportunityScore tier (see stats.ts's deriveLeadTier), so a
 * salesperson scanning the leads table sees who to contact first without
 * opening each one. Icon + label + color together, never color alone. */
export function PriorityBadge({ tier }: { tier: "hot" | "warm" | "cold" | null }) {
  if (!tier) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.className
      )}
    >
      <Icon size={12} weight={meta.weight} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
