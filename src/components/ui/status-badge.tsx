import { STATUS_META } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        meta.badgeClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
