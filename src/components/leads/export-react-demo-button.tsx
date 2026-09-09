"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Sparkle } from "@phosphor-icons/react";

interface ExportOutcome {
  ok: boolean;
  slug?: string;
  error?: string;
}

/** Triggers exportReactDemo() (actions.ts) — the dashboard-integrated
 * replacement for running `npm run export:react-demo -- <slug>` on the
 * command line. The experimental Vite/React/WebGL engine (demo-app/)
 * runs its own separate dev server (localhost:5173 in local dev), so
 * the success link points there rather than into this Next.js app. */
export function ExportReactDemoButton({
  leadId,
  action,
}: {
  leadId: string;
  action: (leadId: string) => Promise<ExportOutcome>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ExportOutcome | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const outcome = await action(leadId);
            setResult(outcome);
          })
        }
      >
        <Sparkle size={14} aria-hidden="true" />
        {pending ? "Exportiere…" : "Vite/React/WebGL-Vorschau"}
      </Button>
      {result?.ok && result.slug ? (
        <a
          href={`http://localhost:5173/${result.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Exportiert — in neuem Tab ansehen
        </a>
      ) : null}
      {result && !result.ok ? (
        <p className="max-w-[16rem] text-right text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
