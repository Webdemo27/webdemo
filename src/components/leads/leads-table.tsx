"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { SortableTh } from "@/components/leads/sortable-th";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScoreBadge } from "@/components/ui/score-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Button } from "@/components/ui/button";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import type { LeadStatus } from "@/lib/types";

// Deliberately a plain local shape, not imported from @/lib/db: that
// module pulls in the Prisma client, which can't be bundled into this
// "use client" component. Tier is pre-derived server-side in page.tsx.
interface Lead {
  id: string;
  companyName: string;
  domain: string | null;
  industry: string | null;
  location: string | null;
  status: LeadStatus;
  websiteScore: number | null;
  leadScore: number | null;
  updatedAt: Date;
  tier: "hot" | "warm" | "cold" | null;
}

export function LeadsTable({
  leads,
  sortBy,
  sortDir,
  search,
  statusFilter,
  deleteAction,
}: {
  leads: Lead[];
  sortBy: string;
  sortDir: "asc" | "desc";
  search: string;
  statusFilter: LeadStatus | undefined;
  deleteAction: (leadIds: string[]) => Promise<{ deleted: number }>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function buildHref(nextSort: string, nextDir: "asc" | "desc") {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("sort", nextSort);
    qs.set("dir", nextDir);
    return `/leads?${qs.toString()}`;
  }

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      `${ids.length} Lead${ids.length === 1 ? "" : "s"} inkl. Analyse, Demo und Nachricht endgültig löschen? Das kann nicht rückgängig gemacht werden.`
    );
    if (!confirmed) return;
    startTransition(async () => {
      await deleteAction(ids);
      setSelected(new Set());
    });
  }

  return (
    <>
      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {selected.size} Lead{selected.size === 1 ? "" : "s"} ausgewählt
          </span>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
            <Trash size={14} aria-hidden="true" />
            {pending ? "Wird gelöscht…" : "Löschen"}
          </Button>
        </div>
      ) : null}

      <Table>
        <Thead>
          <Tr>
            <Th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                aria-label="Alle Leads auswählen"
                className="h-4 w-4 accent-primary"
              />
            </Th>
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
            <Tr key={lead.id} className={selected.has(lead.id) ? "bg-muted/40" : undefined}>
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(lead.id)}
                  onChange={() => toggleOne(lead.id)}
                  aria-label={`${lead.companyName} auswählen`}
                  className="h-4 w-4 accent-primary"
                />
              </Td>
              <Td>
                <Link href={`/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary">
                  {lead.companyName}
                </Link>
                {lead.domain ? <div className="text-xs text-muted-foreground">{lead.domain}</div> : null}
              </Td>
              <Td className="text-xs text-muted-foreground">
                {[lead.industry, lead.location].filter(Boolean).join(" · ") || "—"}
              </Td>
              <Td>
                <PriorityBadge tier={lead.tier} />
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
                {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(lead.updatedAt)}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
}
