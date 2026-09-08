import { getOverviewStats, getRecentActivity, getSalesOpportunityStats } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_META } from "@/lib/status";
import Link from "next/link";
import {
  Sparkle,
  CheckCircle,
  Browser,
  ChatCircleText,
  PaperPlaneTilt,
  Fire,
  Globe,
  Target,
  TrendUp,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function OverviewPage() {
  const [stats, activity, opportunity] = await Promise.all([
    getOverviewStats(),
    getRecentActivity(10),
    getSalesOpportunityStats(),
  ]);

  const maxStatusCount = Math.max(1, ...stats.statusBreakdown.map((s) => s.count));
  const tierTotal = Math.max(1, opportunity.hot + opportunity.warm + opportunity.cold);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Pipeline-Status auf einen Blick"
      />
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Editorial opening area — one strong headline instead of a
            generic "Overview" banner, so the tool reads like a sales
            cockpit rather than a CRUD admin panel. */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-7 py-8 shadow-premium sm:px-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-success/10 blur-3xl"
          />
          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Sales Cockpit
            </p>
            <h1 className="mt-2 max-w-2xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              <span className="text-gradient-animated">Der nächste Kunde</span>{" "}
              <span className="text-foreground">ist schon da draußen.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {stats.totalLeads} Unternehmen im Blick, {opportunity.hot} davon bereit für den
              ersten Kontakt — {stats.waitingForReview} Nachrichten warten auf deine Prüfung.
            </p>
          </div>
        </section>

        {/* Asymmetric stat layout: one featured opportunity, one pipeline
            panel, then a compact secondary-metrics row — not eight
            identical tiles. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {opportunity.bestOpportunity ? (
            <Link
              href={`/leads/${opportunity.bestOpportunity.leadId}`}
              className="hover-lift group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/10 via-card to-card p-6 lg:col-span-7"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                  <Target size={13} weight="bold" aria-hidden="true" />
                  Beste Chance heute
                </span>
                <div className="mt-4 text-2xl font-semibold text-foreground">
                  {opportunity.bestOpportunity.companyName}
                </div>
                <p className="tabular mt-1 text-sm text-muted-foreground">
                  Sales Opportunity Score {opportunity.bestOpportunity.score}/100
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-warning transition-transform group-hover:translate-x-1">
                Lead ansehen
                <ArrowRight size={15} weight="bold" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            <div className="hover-lift flex flex-col justify-center rounded-2xl border border-dashed border-border p-6 text-center lg:col-span-7">
              <p className="text-sm text-muted-foreground">
                Noch keine bewertete Chance — sobald eine Demo mit Konzept vorliegt, erscheint
                sie hier.
              </p>
            </div>
          )}

          <div className="hover-lift flex flex-col justify-between rounded-2xl border border-border bg-card p-6 lg:col-span-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Geschätzter Pipeline-Wert
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-success/10 text-success">
                <TrendUp size={16} weight="bold" aria-hidden="true" />
              </span>
            </div>
            <div className="tabular mt-2 text-3xl font-semibold text-foreground">
              {money.format(opportunity.pipelineValue)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aus Hot- und Warm-Angeboten mit recherchiertem Marktpreis
            </p>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-warning"
                style={{ width: `${(opportunity.hot / tierTotal) * 100}%` }}
                title={`${opportunity.hot} Hot`}
              />
              <div
                className="h-full bg-primary/60"
                style={{ width: `${(opportunity.warm / tierTotal) * 100}%` }}
                title={`${opportunity.warm} Warm`}
              />
              <div
                className="h-full bg-border"
                style={{ width: `${(opportunity.cold / tierTotal) * 100}%` }}
                title={`${opportunity.cold} Cold`}
              />
            </div>
            <div className="tabular mt-2 flex justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Fire size={12} weight="fill" className="text-warning" aria-hidden="true" />
                {opportunity.hot} Hot
              </span>
              <span>{opportunity.warm} Warm</span>
              <span>{opportunity.cold} Cold</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-12 lg:grid-cols-6">
            <KpiCard label="Neue Leads" value={stats.newLeads} icon={Sparkle} />
            <KpiCard
              label="Qualifiziert"
              value={stats.qualifiedLeads}
              icon={CheckCircle}
              tone="success"
            />
            <KpiCard label="Demos erstellt" value={stats.demosCreated} icon={Browser} />
            <KpiCard label="Öffentliche Demos" value={opportunity.publicDemos} icon={Globe} />
            <KpiCard
              label="Nachrichten bereit"
              value={stats.messagesReady}
              icon={ChatCircleText}
            />
            <KpiCard
              label="Versendet"
              value={stats.messagesSent}
              icon={PaperPlaneTilt}
              hint={`${stats.conversionRate}% Conversion`}
              tone="success"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="hover-lift lg:col-span-3">
            <CardHeader>
              <CardTitle>Leads nach Status</CardTitle>
              <Link href="/leads" className="text-xs font-medium text-primary hover:underline">
                Alle Leads →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {stats.statusBreakdown.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <StatusBadge status={status} />
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={STATUS_META[status].dotClass + " h-full rounded-full"}
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="tabular w-8 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="hover-lift lg:col-span-2">
            <CardHeader>
              <CardTitle>Letzte Aktivität</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Noch keine Aktivität. Starte die Recherche über Leads.
                </p>
              ) : (
                activity.map((entry) => (
                  <div key={entry.id} className="text-xs">
                    <Link
                      href={`/leads/${entry.leadId}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {entry.lead.companyName}
                    </Link>
                    <p className="text-muted-foreground">{entry.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
