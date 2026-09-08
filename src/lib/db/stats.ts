import { prisma } from "./client";
import { LEAD_STATUSES, type LeadStatus } from "../types";
import { stageIndex } from "../status";

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

export interface StoredConcept {
  scoring?: { salesOpportunityScore: number; tier: "hot" | "warm" | "cold"; wowPotential: number };
  pricing?: { recommendedOfferPrice: number };
}

/** Reads the X-Ray-derived priority tier off a Demo's stored concept
 * JSON, for anywhere a lead needs a HOT/WARM/COLD signal (the leads
 * table, this file's own aggregate stats). Null until a demo with a
 * concept exists — a lead can't have a sales-opportunity tier before
 * research has actually produced one. */
export function deriveLeadTier(concept: unknown): "hot" | "warm" | "cold" | null {
  return (concept as StoredConcept | null)?.scoring?.tier ?? null;
}

/** Aggregates the X-Ray/concept scoring across every lead that has a
 * demo (Demo.concept is only set once analysis exists — see
 * demo-generator/index.ts) — hot/warm/cold counts, public demo count,
 * and today's single best opportunity by Sales Opportunity Score. */
export async function getSalesOpportunityStats() {
  const demos = await prisma.demo.findMany({
    select: {
      concept: true,
      publicUrl: true,
      lead: { select: { id: true, companyName: true } },
    },
  });

  let hot = 0;
  let warm = 0;
  let cold = 0;
  let publicDemos = 0;
  let pipelineValue = 0;
  let best: { leadId: string; companyName: string; score: number } | null = null;

  for (const demo of demos) {
    if (demo.publicUrl) publicDemos += 1;
    const concept = demo.concept as unknown as StoredConcept | null;
    const scoring = concept?.scoring;
    if (!scoring) continue;

    if (scoring.tier === "hot") hot += 1;
    else if (scoring.tier === "warm") warm += 1;
    else cold += 1;

    // Only hot/warm opportunities count toward pipeline value — a cold
    // lead's offer price isn't a realistic near-term deal.
    if (scoring.tier !== "cold" && concept?.pricing?.recommendedOfferPrice) {
      pipelineValue += concept.pricing.recommendedOfferPrice;
    }

    if (!best || scoring.salesOpportunityScore > best.score) {
      best = {
        leadId: demo.lead.id,
        companyName: demo.lead.companyName,
        score: scoring.salesOpportunityScore,
      };
    }
  }

  return { hot, warm, cold, publicDemos, pipelineValue, bestOpportunity: best };
}

export async function getRecentActivity(limit = 12) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { lead: { select: { companyName: true, id: true } } },
  });
}
