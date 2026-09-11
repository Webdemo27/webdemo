"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Phone, ArrowSquareOut, CheckCircle, SkipForward, Warning } from "@phosphor-icons/react";
import { recordCall } from "@/app/(dashboard)/anrufe/actions";

type Outcome = "NOT_REACHED" | "WRONG_PERSON" | "NOT_INTERESTED" | "LINK_SENT" | "FOLLOW_UP" | "WON";

interface Beat {
  sagen: string;
  danach?: string;
  hinweis?: string;
}

interface ScriptShape {
  abschnitte: Array<{ titel: string; beats: Beat[] }>;
  beleg: string | null;
  ohneBefund: boolean;
  einwaende: Array<{ einwand: string; antwort: string }>;
  danach: string[];
}

export interface QueueEntry {
  leadId: string;
  companyName: string;
  industry: string | null;
  location: string | null;
  phone: string;
  website: string | null;
  leadScore: number | null;
  demoUrl: string | null;
  demoPreviewPath: string | null;
  attempts: number;
  lastOutcome: Outcome | null;
  script: ScriptShape;
}

/** Ordered by how a call actually ends: the two good outcomes first and
 * visually strongest, the refusal last. Making "kein Interesse" the
 * easiest button to hit would quietly bias the data. */
const OUTCOMES: Array<{ value: Outcome; label: string; variant: "success" | "primary" | "outline" | "destructive" }> = [
  { value: "LINK_SENT", label: "Link geschickt", variant: "success" },
  { value: "FOLLOW_UP", label: "Wiedervorlage", variant: "primary" },
  { value: "WON", label: "Auftrag", variant: "success" },
  { value: "NOT_REACHED", label: "Nicht erreicht", variant: "outline" },
  { value: "WRONG_PERSON", label: "Falsche Person", variant: "outline" },
  { value: "NOT_INTERESTED", label: "Kein Interesse", variant: "destructive" },
];

function Line({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-foreground">{children}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function CallCockpit({ queue }: { queue: QueueEntry[] }) {
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [via, setVia] = useState("WhatsApp");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  const lead = queue[index];

  if (!lead) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <CheckCircle size={28} weight="fill" className="mx-auto mb-3 text-emerald-600" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {done > 0 ? `${done} Anruf${done === 1 ? "" : "e"} erfasst — Liste durch.` : "Keine Anrufe offen."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hier erscheint ein Betrieb, sobald er eine Telefonnummer <em>und</em> eine fertige Demo hat — ohne
          Entwurf gäbe es am Telefon nichts zu zeigen. Neue über <code>npm run loop</code> erzeugen.
        </p>
      </div>
    );
  }

  function submit(outcome: Outcome) {
    setError(null);
    startTransition(async () => {
      const result = await recordCall({
        leadId: lead.leadId,
        outcome,
        note,
        linkSentVia: outcome === "LINK_SENT" ? via : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Konnte nicht gespeichert werden.");
        return;
      }
      setNote("");
      setDone((d) => d + 1);
      setIndex((i) => i + 1);
    });
  }

  const s = lead.script;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} von {queue.length} in der Liste
        </span>
        {done > 0 ? <span>{done} heute erfasst</span> : null}
      </div>

      <article className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/40 p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{lead.companyName}</h2>
            <p className="text-xs text-muted-foreground">
              {[lead.industry, lead.location].filter(Boolean).join(" · ") || "—"}
              {lead.attempts > 0 ? ` · ${lead.attempts}. Versuch` : ""}
              {lead.leadScore != null ? ` · Chance ${lead.leadScore}/100` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <ArrowSquareOut size={14} aria-hidden="true" />
                  Ihre Seite
                </Button>
              </a>
            ) : null}
            {lead.demoUrl || lead.demoPreviewPath ? (
              <a href={lead.demoUrl ?? lead.demoPreviewPath!} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <ArrowSquareOut size={14} aria-hidden="true" />
                  {lead.demoUrl ? "Demo (live)" : "Demo (lokal)"}
                </Button>
              </a>
            ) : null}
            {/* tel: so a click dials on a phone or softphone instead of
                making the caller retype the number. */}
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`}>
              <Button size="sm">
                <Phone size={14} weight="fill" aria-hidden="true" />
                {lead.phone}
              </Button>
            </a>
          </div>
        </header>

        <div className="space-y-5 p-5">
          {s.ohneBefund ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              Die Analyse hat für diesen Betrieb nichts Belastbares gefunden. Nichts erfinden — das Skript
              fragt deshalb, statt etwas zu behaupten.
            </p>
          ) : null}

          {s.abschnitte.map((abschnitt, ai) => (
            <Section key={abschnitt.titel} title={abschnitt.titel}>
              <div
                className={
                  ai === s.abschnitte.length - 1
                    ? "space-y-3 rounded-md border-l-2 border-primary bg-primary/5 py-2.5 pl-3"
                    : "space-y-3"
                }
              >
                {abschnitt.beats.map((beat, bi) => (
                  <div key={bi}>
                    <Line>{beat.sagen}</Line>
                    {beat.danach ? (
                      <p className="mt-0.5 text-xs font-medium text-primary">↳ {beat.danach}</p>
                    ) : null}
                    {beat.hinweis ? (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{beat.hinweis}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              {ai === 1 && s.beleg ? (
                <p className="text-xs italic text-muted-foreground">Beleg, nicht vorlesen: {s.beleg}</p>
              ) : null}
            </Section>
          ))}

          <details className="group">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Wenn er bremst ({s.einwaende.length} Einwände)
            </summary>
            <dl className="mt-2 space-y-2">
              {s.einwaende.map((e) => (
                <div key={e.einwand} className="text-sm">
                  <dt className="text-muted-foreground">&bdquo;{e.einwand}&ldquo;</dt>
                  <dd className="text-foreground">→ {e.antwort}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        <footer className="space-y-3 border-t border-border bg-muted/40 p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notiz (optional)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Wer ist zuständig, wann zurückrufen, was gesagt wurde …"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Ergebnis des Anrufs</legend>
            {OUTCOMES.map((o) => (
              <Button
                key={o.value}
                variant={o.variant}
                disabled={pending}
                onClick={() => submit(o.value)}
                className="min-h-11"
              >
                {o.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setIndex((i) => i + 1)}
              className="min-h-11 ml-auto"
              title="Überspringen, ohne etwas zu erfassen"
            >
              <SkipForward size={14} aria-hidden="true" />
              Überspringen
            </Button>
          </fieldset>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Link geschickt per
            <select
              value={via}
              onChange={(e) => setVia(e.target.value)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
            >
              <option>WhatsApp</option>
              <option>E-Mail</option>
              <option>SMS</option>
            </select>
            <span>&mdash; gilt nur f&uuml;r &bdquo;Link geschickt&ldquo;</span>
          </label>

          {error ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <Warning size={14} weight="fill" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
