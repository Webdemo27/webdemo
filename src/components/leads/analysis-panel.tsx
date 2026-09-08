import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import type { AnalysisDimension } from "@/lib/types";

const DIMENSION_LABELS: Record<string, string> = {
  design: "Design",
  mobileUx: "Mobile UX",
  navigation: "Navigation",
  performance: "Performance",
  content: "Content",
  cta: "Call-to-Action",
  trust: "Trust",
  contactExperience: "Kontaktaufnahme",
  accessibility: "Accessibility",
  conversionPotential: "Conversion-Potenzial",
};

const DIMENSION_ORDER = Object.keys(DIMENSION_LABELS);

function asDimension(value: unknown): AnalysisDimension {
  if (
    value &&
    typeof value === "object" &&
    "verifiable" in value &&
    "notes" in value
  ) {
    return value as AnalysisDimension;
  }
  return { score: null, verifiable: false, notes: [] };
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

interface AnalysisRecord {
  design: unknown;
  mobileUx: unknown;
  navigation: unknown;
  performance: unknown;
  content: unknown;
  cta: unknown;
  trust: unknown;
  contactExperience: unknown;
  accessibility: unknown;
  conversionPotential: unknown;
  strengths: unknown;
  weaknesses: unknown;
  opportunities: unknown;
  fetchedAt: Date;
}

export function AnalysisPanel({
  analysis,
  actions,
}: {
  analysis: AnalysisRecord | null;
  actions?: ReactNode;
}) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Website-Analyse</CardTitle>
          {actions}
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Noch keine Analyse vorhanden. Wird im Recherche-/Analyse-Schritt der Pipeline
            erzeugt.
          </p>
        </CardContent>
      </Card>
    );
  }

  const strengths = asStringList(analysis.strengths);
  const weaknesses = asStringList(analysis.weaknesses);
  const opportunities = asStringList(analysis.opportunities);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Website-Analyse</CardTitle>
          <CardDescription>
            Zuletzt geprüft: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(analysis.fetchedAt)}
          </CardDescription>
        </div>
        {actions}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DIMENSION_ORDER.map((key) => {
            const dim = asDimension((analysis as unknown as Record<string, unknown>)[key]);
            return (
              <div key={key} className="rounded-md border border-border p-2.5">
                <div className="text-xs font-medium text-muted-foreground">
                  {DIMENSION_LABELS[key]}
                </div>
                <div className="mt-1">
                  {dim.verifiable ? (
                    <ScoreBadge score={dim.score} />
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      nicht überprüfbar
                    </span>
                  )}
                </div>
                {dim.notes.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">{dim.notes[0]}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {(strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NotesList title="Stärken" items={strengths} tone="text-emerald-700" />
            <NotesList title="Schwächen" items={weaknesses} tone="text-rose-700" />
            <NotesList title="Chancen" items={opportunities} tone="text-amber-700" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotesList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className={`text-xs font-semibold ${tone}`}>{title}</h4>
      <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span aria-hidden="true">–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
