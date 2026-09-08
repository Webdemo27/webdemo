"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PencilSimple, Check, X } from "@phosphor-icons/react";

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
  approveAction,
  rejectAction,
  updateAction,
}: {
  leadId: string;
  message: MessageData | null;
  approveAction: (leadId: string) => Promise<void>;
  rejectAction: (leadId: string) => Promise<void>;
  updateAction: (leadId: string, formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!message) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nachricht</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Noch kein Nachrichtenentwurf. Wird automatisch erstellt, sobald der Lead
            qualifiziert und die Demo erstellt wurde.
          </p>
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
        {!decided && !editing && (
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
        {message.approvedAt ? (
          <p className="text-xs text-muted-foreground">
            Freigegeben — der tatsächliche Versand erfolgt erst über eine separate,
            manuell ausgelöste Aktion (Gmail-Integration folgt in Phase 10) und niemals
            automatisch.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
