import { scoreTone, SCORE_TONE_CLASS } from "@/lib/status";
import { cn } from "@/lib/utils/cn";

export function ScoreBadge({
  score,
  label,
  className,
}: {
  score: number | null | undefined;
  label?: string;
  className?: string;
}) {
  if (score == null) {
    return (
      <span className={cn("tabular text-xs text-muted-foreground", className)}>
        —
      </span>
    );
  }

  const tone = scoreTone(score);
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className={cn("tabular text-sm font-semibold", SCORE_TONE_CLASS[tone])}>
        {score}
      </span>
      <span className="text-xs text-muted-foreground">/100{label ? ` ${label}` : ""}</span>
    </span>
  );
}
