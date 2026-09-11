import { PageHeader } from "@/components/layout/page-header";
import { CallCockpit, type QueueEntry } from "@/components/calling/call-cockpit";
import { loadCallQueue, loadCallStats } from "@/lib/calling/queue";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function AnrufePage() {
  const [queue, stats] = await Promise.all([loadCallQueue(), loadCallStats()]);

  return (
    <>
      <PageHeader
        title="Anrufe"
        description={`${queue.length} Betrieb${queue.length === 1 ? "" : "e"} offen · Telefon ist der breitere und rechtlich tragfähigere Kanal`}
      />
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Anrufe gesamt" value={String(stats.total)} />
          <Stat label="Erreicht" value={String(stats.reached)} />
          <Stat label="Link zugesagt" value={String(stats.linkSent)} />
          <Stat
            label="Wählversuche je Gespräch"
            value={stats.dialsPerConversation != null ? String(stats.dialsPerConversation) : "—"}
            hint={stats.dialsPerConversation == null ? "noch kein Gespräch erfasst" : undefined}
          />
        </div>

        <CallCockpit queue={queue as QueueEntry[]} />
      </div>
    </>
  );
}
