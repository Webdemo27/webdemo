"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/status";

export function StatusSelect({
  leadId,
  status,
  action,
}: {
  leadId: string;
  status: LeadStatus;
  action: (leadId: string, status: LeadStatus) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      aria-label="Status ändern"
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        startTransition(() => {
          void action(leadId, next);
        });
      }}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </Select>
  );
}
