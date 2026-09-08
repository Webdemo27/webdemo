"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PencilSimple, Check, X, Sparkle, Copy, PaperPlaneTilt, EnvelopeSimple } from "@phosphor-icons/react";
import type { PreflightResult } from "@/lib/email";

interface MessageData {
  subject: string | null;
  body: string;
  editedByUser: boolean;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  sentAt: Date | null;
}

export function MessageReviewCard({
  leadId,
  message,
  hasAnalysis,
  hasDemo,
  approveAction,
  rejectAction,
  updateAction,
  generateAction,
  markSentAction,
  gmailDraftAction,
}: {
  leadId: string;
  message: MessageData | null;
  hasAnalysis: boolean;
  hasDemo: boolean;
  approveAction: (leadId: string) => Promise<void>;
  rejectAction: (leadId: string) => Promise<void>;
  updateAction: (leadId: string, formData: FormData) => Promise<void>;
  generateAction: (leadId: string) => Promise<{ ok: boolean; error?: string }>;
  markSentAction: (leadId: string) => Promise<void>;
  gmailDraftAction: (leadId: string) => Promise<{
    preflight: PreflightResult;
    draftCreated: boolean;
    gmailConfigured: boolean;
    error?: string;
  }>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [gmailResult, setGmailResult] = useState<{
    preflight: PreflightResult;
    draftCreated: boolean;
    gmailConfigured: boolean;
    error?: string;
  } | null>(null);

  if (!message) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nachricht</CardTitle>
          <Button
            size="sm"
            disabled={pending || !hasAnalysis || !hasDemo}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await generateAction(leadId);
                if (!result.ok) setError(result.error ?? "Fehler bei der Nachrichtenerstellung.");
              })
            }
          >
            <Sparkle size={14} aria-hidden="true" />
            {pending ? "Erstelle…" : "Entwurf erstellen"}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {!hasAnalysis
              ? "Website-Analyse wird benötigt, bevor ein Entwurf erstellt werden kann."
              : !hasDemo
              ? "Demo wird benötigt, bevor ein Entwurf erstellt werden kann."
              : "Noch kein Nachrichtenentwurf."}
          </p>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  const decided = Boolean(message.approvedAt || message.rejectedAt);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Nachricht</CardTitle>
          <CardDescription>
            {message.sentAt
              ? "Gesendet"
              : message.approvedAt
              ? "Freigegeben — wartet auf manuellen Versand"
              : message.rejectedAt
              ? "Verworfen"
              : "Wartet auf Prüfung"}
            {message.editedByUser ? " · bearbeitet" : ""}
          </CardDescription>
        </div>
        {!message.sentAt && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <PencilSimple size={14} aria-hidden="true" />
            Bearbeiten
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                try {
                  await updateAction(leadId, formData);
                  setEditing(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Fehler beim Speichern");
                }
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="subject">Betreff</Label>
              <Input id="subject" name="subject" defaultValue={message.subject ?? ""} />
            </div>
            <div>
              <Label htmlFor="body">Nachricht</Label>
              <Textarea id="body" name="body" rows={8} defaultValue={message.body} />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                Speichern
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 rounded-md bg-muted p-3">
            {message.subject ? (
              <p className="text-sm font-medium text-foreground">{message.subject}</p>
            ) : null}
            <p className="text-sm whitespace-pre-wrap text-foreground">{message.body}</p>
          </div>
        )}

        {!decided && !editing ? (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button
              size="sm"
              variant="success"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await approveAction(leadId);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Fehler");
                  }
                })
              }
            >
              <Check size={14} aria-hidden="true" />
              Freigeben
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await rejectAction(leadId);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Fehler");
                  }
                })
              }
            >
              <X size={14} aria-hidden="true" />
              Verwerfen
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {message.approvedAt && !message.sentAt ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Freigegeben. Automatischer Versand bleibt bewusst deaktiviert — entweder Text
              kopieren und selbst versenden, oder unten einen echten Gmail-Entwurf vorbereiten
              (landet im Gmail-Postfach, wird aber nie automatisch gesendet). Danach hier als
              versendet markieren.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const text = message.subject ? `${message.subject}\n\n${message.body}` : message.body;
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy size={14} aria-hidden="true" />
                {copied ? "Kopiert!" : "Text kopieren"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    try {
                      await markSentAction(leadId);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Fehler");
                    }
                  })
                }
              >
                <PaperPlaneTilt size={14} aria-hidden="true" />
                Als gesendet markieren
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    setGmailResult(null);
                    const result = await gmailDraftAction(leadId);
                    setGmailResult(result);
                  })
                }
              >
                <EnvelopeSimple size={14} aria-hidden="true" />
                Gmail-Entwurf vorbereiten
              </Button>
            </div>

            {gmailResult ? (
              <div className="space-y-1.5 rounded-md border border-border p-2.5">
                <p className="text-xs font-medium text-foreground">
                  {gmailResult.draftCreated
                    ? "Gmail-Entwurf erstellt — öffnen Sie Gmail, prüfen Sie den Entwurf und senden Sie ihn selbst."
                    : !gmailResult.gmailConfigured
                    ? "Gmail ist nicht konfiguriert — Checkliste unten, Text oben manuell kopierbar."
                    : "Entwurf konnte nicht erstellt werden — siehe Checkliste."}
                </p>
                <ul className="space-y-1">
                  {gmailResult.preflight.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className={c.passed ? "text-success" : "text-destructive"}>
                        {c.passed ? "✓" : "✗"}
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{c.label}:</span> {c.detail}
                      </span>
                    </li>
                  ))}
                </ul>
                {gmailResult.error ? <p className="text-xs text-destructive">{gmailResult.error}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
