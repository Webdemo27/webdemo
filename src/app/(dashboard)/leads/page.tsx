import Link from "next/link";
import { listLeads, deriveLeadTier } from "@/lib/db";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/status";
import { PageHeader } from "@/components/layout/page-header";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreBadge } from "@/components/ui/score-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { SortableTh } from "@/components/leads/sortable-th";
import { ResearchPanel } from "@/components/leads/research-panel";
import { runResearchAction } from "./research-actions";
import { MagnifyingGlass, Buildings } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

type SortField = "createdAt" | "updatedAt" | "leadScore" | "websiteScore" | "companyName";

function isSortField(value: string | undefined): value is SortField {
  return ["createdAt", "updatedAt", "leadScore", "websiteScore", "companyName"].includes(
    value ?? ""
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const search = params.q ?? "";
  const statusFilter = params.status && params.status !== "ALL" ? (params.status as LeadStatus) : undefined;
  const sortBy: SortField = isSortField(params.sort) ? params.sort : "createdAt";
  const sortDir = params.dir === "asc" ? "asc" : "desc";

  const leads = await listLeads({
    search: search || undefined,
    status: statusFilter,
    sortBy,
    sortDir,
  });

  function buildHref(nextSort: string, nextDir: "asc" | "desc") {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("sort", nextSort);
    qs.set("dir", nextDir);
    return `/leads?${qs.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${leads.length} Lead${leads.length === 1 ? "" : "s"}`}
      />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <ResearchPanel action={runResearchAction} />
        <form
          method="get"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="relative min-w-[220px] flex-1">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Firma, Branche, Ort oder Domain suchen…"
              className="pl-9"
              aria-label="Leads durchsuchen"
            />
          </div>
          <Select name="status" defaultValue={statusFilter ?? "ALL"} aria-label="Nach Status filtern">
            <option value="ALL">Alle Status</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </Select>
          <input type="hidden" name="sort" value={sortBy} />
          <input type="hidden" name="dir" value={sortDir} />
          <Button type="submit" variant="secondary" size="sm">
            Filtern
          </Button>
          {(search || statusFilter) && (
            <Link href="/leads" className="text-xs text-muted-foreground hover:text-foreground">
              Zurücksetzen
            </Link>
          )}
        </form>

        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <Buildings size={28} className="mb-3 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Keine Leads gefunden</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Passe die Suche/den Filter an, oder starte die Recherche, um neue lokale
              Unternehmen zu finden.
            </p>
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <SortableTh field="companyName" label="Unternehmen" currentSort={sortBy} currentDir={sortDir} buildHref={buildHref} />
                <Th>Branche / Ort</Th>
                <Th>Priorität</Th>
                <Th>Status</Th>
                <SortableTh field="websiteScore" label="Website" currentSort={sortBy} currentDir={sortDir} buildHref={buildHref} />
                <SortableTh field="leadScore" label="Lead-Score" currentSort={sortBy} currentDir={sortDir} buildHref={buildHref} />
                <SortableTh field="updatedAt" label="Aktualisiert" currentSort={sortBy} currentDir={sortDir} buildHref={buildHref} />
              </Tr>
            </Thead>
            <Tbody>
              {leads.map((lead) => (
                <Tr key={lead.id}>
                  <Td>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {lead.companyName}
                    </Link>
                    {lead.domain ? (
                      <div className="text-xs text-muted-foreground">{lead.domain}</div>
                    ) : null}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {[lead.industry, lead.location].filter(Boolean).join(" · ") || "—"}
                  </Td>
                  <Td>
                    <PriorityBadge tier={deriveLeadTier(lead.demo?.concept)} />
                  </Td>
                  <Td>
                    <StatusBadge status={lead.status} />
                  </Td>
                  <Td>
                    <ScoreBadge score={lead.websiteScore} />
                  </Td>
                  <Td>
                    <ScoreBadge score={lead.leadScore} />
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
                      lead.updatedAt
                    )}
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
