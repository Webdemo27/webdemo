import type { ScoreReason } from "@/lib/types";

export function ScoreReasons({ reasons }: { reasons: unknown }) {
  const list = Array.isArray(reasons) ? (reasons as ScoreReason[]) : [];
  if (list.length === 0) return null;

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-primary hover:underline">
        Begründung ({list.length})
      </summary>
      <ul className="mt-2 space-y-1.5 text-xs">
        {list.map((r, i) => (
          <li key={i} className="flex items-start justify-between gap-3 rounded-md bg-muted px-2.5 py-1.5">
            <div>
              <span className="font-medium text-foreground">{r.factor}</span>
              <p className="text-muted-foreground">{r.detail}</p>
            </div>
            <span className="tabular shrink-0 font-medium text-foreground">
              {r.contribution > 0 ? `+${r.contribution}` : r.contribution}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
