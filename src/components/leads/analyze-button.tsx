"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ArrowsClockwise } from "@phosphor-icons/react";

export function AnalyzeButton({
  leadId,
  hasWebsite,
  action,
}: {
  leadId: string;
  hasWebsite: boolean;
  action: (leadId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !hasWebsite}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await action(leadId);
            if (!result.ok) setError(result.error ?? "Analyse fehlgeschlagen.");
          })
        }
      >
        <ArrowsClockwise size={14} className={pending ? "animate-spin" : ""} aria-hidden="true" />
        {pending ? "Analysiere…" : "Analyse & Scoring ausführen"}
      </Button>
      {!hasWebsite ? (
        <p className="text-xs text-muted-foreground">Keine Website hinterlegt.</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
