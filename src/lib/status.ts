import { LEAD_STATUSES, type LeadStatus } from "./types";

/** Position of a status in the pipeline's natural order — see
 * LEAD_STATUSES. Used to tell "further along" from "further behind",
 * never to validate that a transition is legal (REJECTED can happen
 * from anywhere). */
export function stageIndex(status: LeadStatus): number {
  return LEAD_STATUSES.indexOf(status);
}

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  NEW: {
    label: "Neu",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  RESEARCHED: {
    label: "Recherchiert",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  ANALYZED: {
    label: "Analysiert",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotClass: "bg-indigo-500",
  },
  QUALIFIED: {
    label: "Qualifiziert",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  DEMO_CREATED: {
    label: "Demo erstellt",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dotClass: "bg-cyan-500",
  },
  MESSAGE_READY: {
    label: "Nachricht bereit",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  WAITING_FOR_REVIEW: {
    label: "Wartet auf Prüfung",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    dotClass: "bg-orange-500",
  },
  APPROVED: {
    label: "Freigegeben",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  CONTACTED: {
    label: "Kontaktiert",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    dotClass: "bg-teal-500",
  },
  REPLIED: {
    label: "Geantwortet",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  CONVERTED: {
    label: "Konvertiert",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    dotClass: "bg-green-600",
  },
  REJECTED: {
    label: "Abgelehnt",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
};

export function scoreTone(score: number | null | undefined): "low" | "mid" | "high" {
  if (score == null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

export const SCORE_TONE_CLASS: Record<"low" | "mid" | "high", string> = {
  low: "text-slate-500",
  mid: "text-amber-600",
  high: "text-emerald-600",
};
