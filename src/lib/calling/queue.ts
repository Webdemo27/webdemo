import { prisma } from "../db";
import { fromJson } from "../db/json";
import { buildCallScript, type CallScript } from "./script";
import type { WebsiteAnalysisData } from "../types";
import type { CallOutcome, WebsiteAnalysis } from "@prisma/client";

/** Outcomes that take a lead out of the queue for good. A "no" is a
 * real answer and must not come back tomorrow as a fresh lead — that is
 * how a caller ends up annoying the same business twice. */
const CLOSED_OUTCOMES: CallOutcome[] = ["NOT_INTERESTED", "WON"];

/** How long before a lead nobody picked up is worth another try. Short
 * enough to catch a different shift, long enough not to be a nuisance. */
const RETRY_AFTER_HOURS = 20;

export interface CallQueueEntry {
  leadId: string;
  companyName: string;
  industry: string | null;
  location: string | null;
  phone: string;
  website: string | null;
  /** Opportunity score — what orders this queue. */
  leadScore: number | null;
  demoUrl: string | null;
  /** Local preview path when the demo exists but isn't published yet. */
  demoPreviewPath: string | null;
  attempts: number;
  lastCalledAt: Date | null;
  lastOutcome: CallOutcome | null;
  script: CallScript;
}

function analysisToData(analysis: WebsiteAnalysis | null): WebsiteAnalysisData | null {
  if (!analysis) return null;
  return fromJson<WebsiteAnalysisData>({
    design: analysis.design,
    mobileUx: analysis.mobileUx,
    navigation: analysis.navigation,
    performance: analysis.performance,
    content: analysis.content,
    cta: analysis.cta,
    trust: analysis.trust,
    contactExperience: analysis.contactExperience,
    accessibility: analysis.accessibility,
    conversionPotential: analysis.conversionPotential,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    opportunities: analysis.opportunities,
  });
}

/**
 * The leads to call today, best first.
 *
 * Ordering is the whole point. A demo now costs seconds, so the scarce
 * resource is the caller's time — the opportunity score no longer
 * decides *whether* a lead gets worked (see scoring/isQualified), it
 * decides *when*. Never called outranks called-and-not-reached, and
 * within each group the weakest website comes first, because that is the
 * conversation with the most to say.
 */
export async function loadCallQueue(limit = 50): Promise<CallQueueEntry[]> {
  const leads = await prisma.lead.findMany({
    where: {
      contactPhone: { not: null },
      status: { notIn: ["REJECTED", "CONVERTED"] },
      // A demo is not optional here: the script says "ich habe Ihnen
      // einen Entwurf gebaut", and saying that with nothing to send is
      // inventing a fact to a stranger on the phone. Leads without one
      // wait until the pipeline has built it.
      demo: { isNot: null },
    },
    include: {
      analysis: true,
      demo: true,
      calls: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { calls: true } },
    },
  });

  const now = Date.now();
  const open = leads.filter((lead) => {
    const last = lead.calls[0];
    if (!last) return true;
    if (CLOSED_OUTCOMES.includes(last.outcome)) return false;
    // A promised follow-up is a commitment, so it stays in the queue
    // regardless of how recently it was made.
    if (last.outcome === "FOLLOW_UP") return true;
    return now - last.createdAt.getTime() > RETRY_AFTER_HOURS * 3600_000;
  });

  open.sort((a, b) => {
    const aCalled = a._count.calls > 0 ? 1 : 0;
    const bCalled = b._count.calls > 0 ? 1 : 0;
    if (aCalled !== bCalled) return aCalled - bCalled;
    return (b.leadScore ?? 0) - (a.leadScore ?? 0);
  });

  return open.slice(0, limit).map((lead) => ({
    leadId: lead.id,
    companyName: lead.companyName,
    industry: lead.industry,
    location: lead.location,
    phone: lead.contactPhone!,
    website: lead.website,
    leadScore: lead.leadScore,
    demoUrl: lead.demo?.publicUrl ?? null,
    demoPreviewPath: lead.demo ? `/demos/${lead.demo.slug}/index.html` : null,
    attempts: lead._count.calls,
    lastCalledAt: lead.lastCalledAt,
    lastOutcome: lead.calls[0]?.outcome ?? null,
    script: buildCallScript({
      companyName: lead.companyName,
      industry: lead.industry,
      location: lead.location,
      analysis: analysisToData(lead.analysis),
      demoUrl: lead.demo?.publicUrl ?? null,
    }),
  }));
}

export interface CallStats {
  total: number;
  reached: number;
  linkSent: number;
  followUp: number;
  notInterested: number;
  won: number;
  /** Dials per conversation with a decision-maker — the number that
   * says how much calling one real conversation costs. Null until at
   * least one such conversation has happened. */
  dialsPerConversation: number | null;
}

/** The numbers this business has never had. Everything here is counted,
 * never estimated. */
export async function loadCallStats(): Promise<CallStats> {
  const calls = await prisma.callAttempt.findMany({ select: { outcome: true } });
  const count = (o: CallOutcome) => calls.filter((c) => c.outcome === o).length;

  const linkSent = count("LINK_SENT");
  const followUp = count("FOLLOW_UP");
  const notInterested = count("NOT_INTERESTED");
  const won = count("WON");
  const conversations = linkSent + followUp + notInterested + won;

  return {
    total: calls.length,
    reached: conversations + count("WRONG_PERSON"),
    linkSent,
    followUp,
    notInterested,
    won,
    dialsPerConversation: conversations > 0 ? Math.round((calls.length / conversations) * 10) / 10 : null,
  };
}
