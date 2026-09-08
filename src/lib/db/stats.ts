import { prisma } from "./client";
import { LEAD_STATUSES, type LeadStatus } from "../types";

const STAGE_ORDER: LeadStatus[] = [
  "NEW",
  "RESEARCHED",
  "ANALYZED",
  "QUALIFIED",
  "DEMO_CREATED",
  "MESSAGE_READY",
  "WAITING_FOR_REVIEW",
  "APPROVED",
  "CONTACTED",
  "REPLIED",
  "CONVERTED",
];

function stageIndex(status: LeadStatus) {
  return STAGE_ORDER.indexOf(status);
}

export async function getOverviewStats() {
  const [total, byStatusRaw, demosCreated, messages] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.demo.count(),
    prisma.message.findMany({
      select: { approvedAt: true, rejectedAt: true, sentAt: true },
    }),
  ]);

  const byStatus = new Map<LeadStatus, number>();
  for (const status of LEAD_STATUSES) byStatus.set(status, 0);
  for (const row of byStatusRaw) {
    byStatus.set(row.status as LeadStatus, row._count._all);
  }

  const qualifiedIdx = stageIndex("QUALIFIED");
  let qualifiedOrBeyond = 0;
  let waitingForReview = 0;
  let converted = 0;
  let contactedOrBeyond = 0;

  for (const status of LEAD_STATUSES) {
    const count = byStatus.get(status) ?? 0;
    const idx = stageIndex(status);
    if (idx >= qualifiedIdx && status !== "REJECTED") qualifiedOrBeyond += count;
    if (status === "WAITING_FOR_REVIEW") waitingForReview += count;
    if (status === "CONVERTED") converted += count;
    if (idx >= stageIndex("CONTACTED") && status !== "REJECTED") contactedOrBeyond += count;
  }

  const messagesReady = messages.filter(
    (m) => !m.approvedAt && !m.rejectedAt && !m.sentAt
  ).length;
  const messagesSent = messages.filter((m) => m.sentAt).length;

  const conversionRate =
    contactedOrBeyond > 0 ? Math.round((converted / contactedOrBeyond) * 1000) / 10 : 0;

  return {
    totalLeads: total,
    newLeads: byStatus.get("NEW") ?? 0,
    qualifiedLeads: qualifiedOrBeyond,
    demosCreated,
    waitingForReview,
    messagesReady,
    messagesSent,
    converted,
    conversionRate,
    statusBreakdown: LEAD_STATUSES.map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    })),
  };
}

export async function getRecentActivity(limit = 12) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { lead: { select: { companyName: true, id: true } } },
  });
}
