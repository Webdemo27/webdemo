"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MagicWand } from "@phosphor-icons/react";

export function GenerateDemoButton({
  leadId,
  hasDemo,
  action,
}: {
  leadId: string;
  hasDemo: boolean;
  action: (leadId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={hasDemo ? "outline" : "primary"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await action(leadId);
            if (!result.ok) setError(result.error ?? "Fehler bei der Demo-Erstellung.");
          })
        }
      >
        <MagicWand size={14} aria-hidden="true" />
        {pending ? "Erstelle…" : hasDemo ? "Demo neu erstellen" : "Demo erstellen"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
