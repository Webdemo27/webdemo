"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CloudArrowUp, CheckCircle, Envelope, Warning } from "@phosphor-icons/react";

interface PublishOutcome {
  ok: boolean;
  publicUrl?: string;
  error?: string;
  configured: boolean;
  /** Demos that had been publicly reachable without ever being published
   * successfully, now taken out of the deployment. */
  removedFromDeployment?: string[];
  /** Set when publishing succeeded: what happened with the Gmail draft
   * that is prepared straight afterwards. */
  gmail?: {
    draftCreated: boolean;
    gmailConfigured: boolean;
    error?: string;
    preflight: { passed: boolean; checks: Array<{ label: string; passed: boolean; detail: string }> };
  };
}

/** The single sentence explaining why no draft appeared.
 *
 * A draft not being created is rarely a failure — far more often the
 * message simply hasn't been approved yet, which is the safety gate
 * working as intended. So this reports the first failed preflight check
 * by name instead of a generic error: "Nachricht wurde noch nicht
 * freigegeben" tells the user what to click, "Entwurf fehlgeschlagen"
 * does not. */
function draftBlockedReason(gmail: NonNullable<PublishOutcome["gmail"]>): string {
  if (!gmail.gmailConfigured) return "Gmail ist nicht eingerichtet — Text kann unten kopiert werden.";
  const failed = gmail.preflight.checks.find((c) => !c.passed);
  if (failed) return `${failed.label}: ${failed.detail}`;
  return gmail.error ?? "Entwurf konnte nicht erstellt werden.";
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
    <div className="flex flex-col items-end gap-2">
      <Button
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
        <CloudArrowUp size={14} aria-hidden="true" />
        {pending ? "Veröffentliche…" : "Öffentlich bereitstellen"}
      </Button>

      {result && !result.ok ? (
        <p className="max-w-[18rem] text-right text-xs text-destructive">{result.error}</p>
      ) : null}

      {result?.ok ? (
        <div className="max-w-[20rem] space-y-1.5 text-right text-xs">
          <p className="flex items-center justify-end gap-1.5 text-emerald-700">
            <CheckCircle size={14} weight="fill" aria-hidden="true" />
            <span>Demo ist online</span>
          </p>
          {result.publicUrl ? (
            <a
              href={result.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {result.publicUrl}
            </a>
          ) : null}

          {result.removedFromDeployment?.length ? (
            <p className="flex items-start justify-end gap-1.5 text-amber-700">
              <Warning size={14} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                Aus dem Deployment entfernt (waren öffentlich, ohne je veröffentlicht worden zu sein):{" "}
                {result.removedFromDeployment.join(", ")}
              </span>
            </p>
          ) : null}

          {result.gmail?.draftCreated ? (
            <p className="flex items-start justify-end gap-1.5 text-emerald-700">
              <Envelope size={14} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                Gmail-Entwurf liegt bereit — Link ist eingebaut, in Gmail nur noch auf Senden drücken
              </span>
            </p>
          ) : result.gmail ? (
            <p className="flex items-start justify-end gap-1.5 text-amber-700">
              <Warning size={14} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>Kein Gmail-Entwurf — {draftBlockedReason(result.gmail)}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
