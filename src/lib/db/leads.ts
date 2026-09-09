import { prisma } from "./client";
import { logActivity } from "./activity";
import { normalizeDomain, normalizeCompanyName } from "./normalize";
import { toJson } from "./json";
import { stageIndex } from "../status";
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
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
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

/** Forward-only version of `updateLeadStatus` for automated pipeline
 * steps (analysis, scoring, demo/message generation). Re-running
 * analysis on a lead a human has already moved past — WAITING_FOR_REVIEW,
 * APPROVED, even REJECTED — must not silently rewind its status: doing
 * so makes it look "newly qualified" again to /loop, which will then
 * regenerate the demo and overwrite an already-approved message,
 * destroying a human decision no automated step should ever touch. A
 * human explicitly changing status via the dashboard dropdown still goes
 * through the unguarded `updateLeadStatus` above — a human moving a lead
 * backwards on purpose is not the case this guards against. No-ops
 * (returns null) when the lead is already at or past `status`. */
export async function advancePipelineStatus(id: string, status: LeadStatus, note?: string) {
  const current = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
  if (!current || stageIndex(status) <= stageIndex(current.status)) return null;
  return updateLeadStatus(id, status, note);
}

export async function recordLeadError(id: string, error: string) {
  await prisma.lead.update({
    where: { id },
    data: { lastError: error, lastErrorAt: new Date() },
  });
  await logActivity(id, "ERROR", error);
}

/** Persists every candidate this discovery run found, and mirrors the
 * winning one onto `Lead.contactEmail*` so the rest of the app (message
 * generation, the Gmail preflight checklist, the leads table) can keep
 * reading that single field without joining `contactEmails`. Replaces
 * `isPrimary` on the whole set each run rather than only ever adding, so
 * a better source found on a later run correctly displaces an older,
 * weaker one. */
export async function saveContactDiscovery(
  leadId: string,
  result: {
    candidates: Array<{
      email: string;
      source: string;
      sourceUrl: string;
      confidence: string;
      foundAt: string;
    }>;
    primary: { email: string; source: string; sourceUrl: string; confidence: string } | null;
    contactQualityScore: number;
    error: string | null;
  }
) {
  await prisma.$transaction(
    result.candidates.map((c) =>
      prisma.contactEmail.upsert({
        where: { leadId_email: { leadId, email: c.email } },
        create: {
          leadId,
          email: c.email,
          source: c.source,
          sourceUrl: c.sourceUrl,
          confidence: c.confidence,
          isPrimary: result.primary?.email === c.email,
          foundAt: new Date(c.foundAt),
        },
        update: {
          source: c.source,
          sourceUrl: c.sourceUrl,
          confidence: c.confidence,
          isPrimary: result.primary?.email === c.email,
          foundAt: new Date(c.foundAt),
        },
      })
    )
  );

  await prisma.lead.update({
    where: { id: leadId },
    data: result.primary
      ? {
          contactEmail: result.primary.email,
          contactEmailSource: result.primary.source,
          contactEmailConfidence: result.primary.confidence,
          contactEmailSourceUrl: result.primary.sourceUrl,
          contactEmailFoundAt: new Date(),
          contactQualityScore: result.contactQualityScore,
          contactDiscoveryError: null,
        }
      : {
          contactQualityScore: 0,
          contactDiscoveryError: result.error,
        },
  });
}

export interface ScreenshotSaveInput {
  desktopPath: string | null;
  mobilePath: string | null;
  error: string | null;
}

export async function saveWebsiteAnalysis(
  leadId: string,
  data: WebsiteAnalysisData,
  websiteScore: number | null,
  screenshots?: ScreenshotSaveInput
) {
  const screenshotFields = screenshots
    ? {
        screenshotDesktopPath: screenshots.desktopPath,
        screenshotMobilePath: screenshots.mobilePath,
        screenshotError: screenshots.error,
      }
    : {};

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
      ...screenshotFields,
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
      ...screenshotFields,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { websiteScore },
  });
  await advancePipelineStatus(leadId, "ANALYZED");

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

/** Permanently removes leads and everything attached to them (analysis,
 * demo, messages, activity log — all `onDelete: Cascade` in the schema).
 * A generated demo's static files on disk and any live Cloudflare Pages
 * deployment are untouched — this only clears the dashboard record, not
 * external resources. Returns how many rows were actually deleted. */
export async function deleteLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0;
  const result = await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  return result.count;
}
