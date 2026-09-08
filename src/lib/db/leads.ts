import { prisma } from "./client";
import { logActivity } from "./activity";
import { normalizeDomain, normalizeCompanyName } from "./normalize";
import { toJson } from "./json";
import type { LeadInput, LeadStatus, WebsiteAnalysisData, ScoreReason } from "../types";
import type { Prisma } from "@prisma/client";

/** Looks for an existing lead matching by domain first (strong signal),
 * falling back to normalized company name + location (fuzzy, for leads
 * without a known website yet). Returns null when nothing matches. */
export async function findDuplicateLead(input: LeadInput) {
  const domain = normalizeDomain(input.website);

  if (domain) {
    const byDomain = await prisma.lead.findUnique({ where: { domain } });
    if (byDomain) return byDomain;
  }

  const normalizedName = normalizeCompanyName(input.companyName);
  if (!normalizedName) return null;

  const candidates = await prisma.lead.findMany({
    where: { normalizedName },
  });

  if (candidates.length === 0) return null;

  if (!input.location) return candidates[0];

  const location = input.location.toLowerCase();
  const sameLocation = candidates.find((c) =>
    (c.location ?? "").toLowerCase() === location
  );
  return sameLocation ?? candidates[0];
}

/** Creates a lead unless a duplicate already exists (by domain, or by
 * normalized name + location). Returns the existing lead untouched when
 * a duplicate is found — a business is never added twice. */
export async function createLeadIfNew(input: LeadInput) {
  const duplicate = await findDuplicateLead(input);
  if (duplicate) {
    return { lead: duplicate, created: false as const };
  }

  const domain = normalizeDomain(input.website);
  const normalizedName = normalizeCompanyName(input.companyName);

  const lead = await prisma.lead.create({
    data: {
      companyName: input.companyName,
      normalizedName,
      industry: input.industry ?? null,
      location: input.location ?? null,
      website: input.website ?? null,
      domain,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      address: input.address ?? null,
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      status: "NEW",
    },
  });

  await logActivity(lead.id, "CREATED", `Lead discovered via ${input.source}`);
  return { lead, created: true as const };
}

export interface LeadListFilters {
  search?: string;
  status?: LeadStatus | LeadStatus[];
  sortBy?: "createdAt" | "updatedAt" | "leadScore" | "websiteScore" | "companyName";
  sortDir?: "asc" | "desc";
  minScore?: number;
}

export async function listLeads(filters: LeadListFilters = {}) {
  const where: Prisma.LeadWhereInput = {};

  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      where.OR = [
        { companyName: { contains: term } },
        { industry: { contains: term } },
        { location: { contains: term } },
        { website: { contains: term } },
        { domain: { contains: term } },
      ];
    }
  }

  if (typeof filters.minScore === "number") {
    where.leadScore = { gte: filters.minScore };
  }

  const sortBy = filters.sortBy ?? "createdAt";
  const sortDir = filters.sortDir ?? "desc";

  return prisma.lead.findMany({
    where,
    orderBy: { [sortBy]: sortDir },
    include: { analysis: true, demo: true, message: true },
  });
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      analysis: true,
      demo: true,
      message: true,
      activity: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  note?: string
) {
  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  await logActivity(id, "STATUS_CHANGE", note ?? `Status changed to ${status}`, {
    status,
  });
  return lead;
}

export async function recordLeadError(id: string, error: string) {
  await prisma.lead.update({
    where: { id },
    data: { lastError: error, lastErrorAt: new Date() },
  });
  await logActivity(id, "ERROR", error);
}

export async function saveWebsiteAnalysis(
  leadId: string,
  data: WebsiteAnalysisData,
  websiteScore: number | null
) {
  const analysis = await prisma.websiteAnalysis.upsert({
    where: { leadId },
    create: {
      leadId,
      design: toJson(data.design),
      mobileUx: toJson(data.mobileUx),
      navigation: toJson(data.navigation),
      performance: toJson(data.performance),
      content: toJson(data.content),
      cta: toJson(data.cta),
      trust: toJson(data.trust),
      contactExperience: toJson(data.contactExperience),
      accessibility: toJson(data.accessibility),
      conversionPotential: toJson(data.conversionPotential),
      strengths: toJson(data.strengths),
      weaknesses: toJson(data.weaknesses),
      opportunities: toJson(data.opportunities),
      rawSignals: data.rawSignals ? toJson(data.rawSignals) : undefined,
    },
    update: {
      design: toJson(data.design),
      mobileUx: toJson(data.mobileUx),
      navigation: toJson(data.navigation),
      performance: toJson(data.performance),
      content: toJson(data.content),
      cta: toJson(data.cta),
      trust: toJson(data.trust),
      contactExperience: toJson(data.contactExperience),
      accessibility: toJson(data.accessibility),
      conversionPotential: toJson(data.conversionPotential),
      strengths: toJson(data.strengths),
      weaknesses: toJson(data.weaknesses),
      opportunities: toJson(data.opportunities),
      rawSignals: data.rawSignals ? toJson(data.rawSignals) : undefined,
      fetchedAt: new Date(),
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { websiteScore, status: "ANALYZED" },
  });

  await logActivity(
    leadId,
    "ANALYZED",
    websiteScore == null
      ? "Website-Analyse abgeschlossen (Website nicht erreichbar)"
      : `Website analysiert, Score ${websiteScore}/100`
  );
  return analysis;
}

export async function saveLeadScore(
  leadId: string,
  leadScore: number,
  reasons: ScoreReason[]
) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { leadScore, scoreReasons: toJson(reasons) },
  });
  await logActivity(leadId, "SCORED", `Lead scored ${leadScore}/100`, {
    reasons,
  });
}
