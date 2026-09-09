"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "@phosphor-icons/react";
import type { DeleteDemoOutcome } from "@/lib/publishing";

export function DeleteDemoButton({
  demoId,
  companyName,
  wasPublished,
  action,
}: {
  demoId: string;
  companyName: string;
  wasPublished: boolean;
  action: (demoId: string) => Promise<DeleteDemoOutcome>;
}) {
  const [pending, startTransition] = useTransition();
  const [warning, setWarning] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            wasPublished
              ? `Demo von "${companyName}" wirklich löschen? Das entfernt auch das zugehörige Cloudflare-Pages-Projekt (der öffentliche Link wird ungültig). Kann nicht rückgängig gemacht werden.`
              : `Demo von "${companyName}" wirklich löschen? Kann nicht rückgängig gemacht werden.`
          );
          if (!confirmed) return;
          setWarning(null);
          startTransition(async () => {
            const result = await action(demoId);
            if (!result.ok) setWarning(result.error ?? "Fehler beim Löschen.");
            else if (result.cloudflareWarning) setWarning(`Lokal gelöscht, aber Cloudflare: ${result.cloudflareWarning}`);
          });
        }}
      >
        <Trash size={14} aria-hidden="true" />
        {pending ? "Lösche…" : "Löschen"}
      </Button>
      {warning ? <p className="max-w-[220px] text-right text-xs text-destructive">{warning}</p> : null}
    </div>
  );
}
