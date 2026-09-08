"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CloudArrowUp } from "@phosphor-icons/react";

interface PublishOutcome {
  ok: boolean;
  publicUrl?: string;
  error?: string;
  configured: boolean;
}

export function PublishDemoButton({
  leadId,
  action,
}: {
  leadId: string;
  action: (leadId: string) => Promise<PublishOutcome>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PublishOutcome | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const outcome = await action(leadId);
            setResult(outcome);
          })
        }
      >
        <CloudArrowUp size={14} aria-hidden="true" />
        {pending ? "Veröffentliche…" : "Öffentlich bereitstellen"}
      </Button>
      {result && !result.ok ? (
        <p className="max-w-[16rem] text-right text-xs text-destructive">{result.error}</p>
      ) : null}
    </div>
  );
}
