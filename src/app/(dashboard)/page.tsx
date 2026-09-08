import { getOverviewStats, getRecentActivity } from "@/lib/db";
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
  ClockCountdown,
  ChatCircleText,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, activity] = await Promise.all([
    getOverviewStats(),
    getRecentActivity(10),
  ]);

  const maxStatusCount = Math.max(1, ...stats.statusBreakdown.map((s) => s.count));

  return (
    <>
      <PageHeader
        title="Overview"
        description="Pipeline-Status auf einen Blick"
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Neue Leads" value={stats.newLeads} icon={Sparkle} />
          <KpiCard
            label="Qualifiziert"
            value={stats.qualifiedLeads}
            icon={CheckCircle}
            tone="success"
          />
          <KpiCard label="Demos erstellt" value={stats.demosCreated} icon={Browser} />
          <KpiCard
            label="Wartet auf Prüfung"
            value={stats.waitingForReview}
            icon={ClockCountdown}
            tone="warning"
          />
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
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

          <Card className="lg:col-span-2">
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
