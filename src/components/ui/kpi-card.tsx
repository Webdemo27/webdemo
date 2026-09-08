import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: Icon;
  hint?: string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", toneClass)}>
          <Icon size={16} weight="bold" aria-hidden="true" />
        </span>
      </div>
      <div className="tabular mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
