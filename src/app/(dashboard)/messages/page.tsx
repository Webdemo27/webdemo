import Link from "next/link";
import { prisma } from "@/lib/db";
import type { LeadStatus } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatCircleText, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { id: true, companyName: true, status: true } } },
  });

  const pending = messages.filter((m) => !m.approvedAt && !m.rejectedAt && !m.sentAt);
  const decided = messages.filter((m) => m.approvedAt || m.rejectedAt || m.sentAt);

  return (
    <>
      <PageHeader
        title="Messages"
        description={`${pending.length} wartend · ${decided.length} entschieden`}
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <ChatCircleText size={28} className="mb-3 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Noch keine Nachrichtenentwürfe</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Entwürfe entstehen automatisch, sobald ein Lead qualifiziert und eine Demo
              erstellt wurde. Jede Nachricht muss hier manuell freigegeben werden.
            </p>
          </div>
        ) : (
          <>
            <Section title="Wartet auf Prüfung" items={pending} />
            <Section title="Entschieden" items={decided} />
          </>
        )}
      </div>
    </>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    subject: string | null;
    body: string;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    sentAt: Date | null;
    lead: { id: string; companyName: string; status: LeadStatus };
  }>;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle className="truncate">{m.lead.companyName}</CardTitle>
                <CardDescription className="truncate">{m.subject ?? "(kein Betreff)"}</CardDescription>
              </div>
              <StatusBadge status={m.lead.status} />
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-xs text-muted-foreground">{m.body}</p>
              <Link href={`/leads/${m.lead.id}`} className="mt-3 inline-block">
                <Button size="sm" variant="outline">
                  Prüfen
                  <ArrowRight size={14} aria-hidden="true" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
