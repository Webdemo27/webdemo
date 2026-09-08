import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DemoConcept, ProblemCategory } from "@/lib/visual-director/concept";

const CATEGORY_LABELS: Record<ProblemCategory, string> = {
  technical: "Technisch",
  ux: "UX",
  trust: "Vertrauen",
  conversion: "Conversion",
  brand: "Marke",
};

const SEVERITY_CLASS: Record<string, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const TIER_CLASS: Record<string, string> = {
  hot: "bg-rose-50 text-rose-700 border-rose-200",
  warm: "bg-amber-50 text-amber-700 border-amber-200",
  cold: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ConceptPanel({ concept }: { concept: unknown }) {
  if (!concept) return null;
  const c = concept as DemoConcept;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Visual Concept &amp; Sales Brief</CardTitle>
          <CardDescription>Research-driven — jede Aussage stammt aus der Analyse, nichts erfunden.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scoring */}
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted p-3">
          <div>
            <div className="text-xs text-muted-foreground">Sales Opportunity Score</div>
            <div className="tabular text-xl font-semibold text-foreground">
              {c.scoring.salesOpportunityScore}/100
            </div>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${TIER_CLASS[c.scoring.tier]}`}
          >
            {c.scoring.tier}
          </span>
          <div className="ml-auto">
            <div className="text-xs text-muted-foreground">Wow Potential</div>
            <div className="tabular text-xl font-semibold text-foreground">{c.scoring.wowPotential}/100</div>
          </div>
        </div>

        {/* Design concept */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Design-Konzept</h4>
          <p className="mt-1 text-sm font-medium text-foreground">{c.designConcept.variantName}</p>
          <p className="text-xs text-muted-foreground">{c.designConcept.variantDescription}</p>
          <ul className="mt-2 space-y-1.5">
            {c.designConcept.rationale.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.section}:</span> {r.why}
              </li>
            ))}
          </ul>
        </div>

        {/* X-Ray */}
        {c.xray.problems.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Website X-Ray — größte Baustelle: {c.xray.biggestProblemCategory ? CATEGORY_LABELS[c.xray.biggestProblemCategory] : "—"}
            </h4>
            <ul className="mt-2 space-y-1.5">
              {c.xray.problems.slice(0, 5).map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 font-medium ${SEVERITY_CLASS[p.severity]}`}>
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  <span className="text-muted-foreground">{p.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Money impact */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opportunity (illustrativ)</h4>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            {c.opportunityMap.moneyImpact.map((s) => (
              <div key={s.label} className="rounded-md border border-border p-2">
                <div className="text-muted-foreground capitalize">{s.label}</div>
                <div className="tabular text-base font-semibold text-foreground">{s.monthlyLeads}</div>
                <div className="text-muted-foreground">Anfragen/Monat ({s.conversionRatePct}%)</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground italic">{c.opportunityMap.moneyImpactDisclaimer}</p>
        </div>

        {/* Key changes */}
        {c.keyChanges.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Das würden wir konkret ändern
            </h4>
            <div className="mt-2 space-y-2">
              {c.keyChanges.map((k, i) => (
                <div key={i} className="rounded-md border border-border p-2.5 text-xs">
                  <div className="text-rose-700">
                    <span className="font-medium">Alt:</span> {k.before}
                  </div>
                  <div className="text-emerald-700">
                    <span className="font-medium">Neu:</span> {k.after}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    <span className="font-medium">Warum:</span> {k.why}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="rounded-md border border-border p-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preis-Richtwert</h4>
          <div className="tabular mt-1 text-lg font-semibold text-foreground">
            {c.pricing.estimatedPrice.toLocaleString("de-DE")} {c.pricing.currency}
          </div>
          <p className="text-xs text-muted-foreground italic">{c.pricing.disclaimer}</p>
        </div>

        {/* Objections */}
        {c.objections.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Mögliche Einwände &amp; Antworten
            </h4>
            <div className="mt-2 space-y-2">
              {c.objections.map((o, i) => (
                <div key={i} className="text-xs">
                  <p className="font-medium text-foreground">{o.objection}</p>
                  <p className="text-muted-foreground">{o.response}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
