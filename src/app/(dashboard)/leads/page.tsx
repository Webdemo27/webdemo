import Link from "next/link";
import { listLeads, deriveLeadTier } from "@/lib/db";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/status";
import { PageHeader } from "@/components/layout/page-header";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResearchPanel } from "@/components/leads/research-panel";
import { LeadsTable } from "@/components/leads/leads-table";
import { runResearchAction } from "./research-actions";
import { deleteLeadsAction } from "./bulk-actions";
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
          <LeadsTable
            leads={leads.map((lead) => ({
              id: lead.id,
              companyName: lead.companyName,
              domain: lead.domain,
              industry: lead.industry,
              location: lead.location,
              status: lead.status,
              websiteScore: lead.websiteScore,
              leadScore: lead.leadScore,
              updatedAt: lead.updatedAt,
              tier: deriveLeadTier(lead.demo?.concept),
            }))}
            sortBy={sortBy}
            sortDir={sortDir}
            search={search}
            statusFilter={statusFilter}
            deleteAction={deleteLeadsAction}
          />
        )}
      </div>
    </>
  );
}
