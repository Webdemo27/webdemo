import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Browser, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function DemosPage() {
  const demos = await prisma.demo.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { id: true, companyName: true, industry: true, status: true } } },
  });

  return (
    <>
      <PageHeader title="Demos" description={`${demos.length} generierte Demo${demos.length === 1 ? "" : "s"}`} />
      <div className="flex-1 overflow-y-auto p-6">
        {demos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <Browser size={28} className="mb-3 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Noch keine Demos</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Demos werden automatisch für qualifizierte Leads erzeugt, sobald die
              Pipeline (Phase 6+) läuft.
            </p>
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Unternehmen</Th>
                <Th>Branche</Th>
                <Th>Vorlage</Th>
                <Th>Lead-Status</Th>
                <Th>Erstellt</Th>
                <Th className="text-right">Aktion</Th>
              </Tr>
            </Thead>
            <Tbody>
              {demos.map((demo) => (
                <Tr key={demo.id}>
                  <Td>
                    <Link href={`/leads/${demo.lead.id}`} className="font-medium text-foreground hover:text-primary">
                      {demo.lead.companyName}
                    </Link>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{demo.lead.industry ?? "—"}</Td>
                  <Td className="text-xs text-muted-foreground">{demo.templateKey}</Td>
                  <Td>
                    <StatusBadge status={demo.lead.status} />
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(demo.createdAt)}
                  </Td>
                  <Td className="text-right">
                    <a href={`/demos/${demo.slug}/index.html`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ArrowSquareOut size={14} aria-hidden="true" />
                        Ansehen
                      </Button>
                    </a>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </>
  );
}
