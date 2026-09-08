export type LeadStatus =
  | "NEW"
  | "RESEARCHED"
  | "ANALYZED"
  | "QUALIFIED"
  | "DEMO_CREATED"
  | "MESSAGE_READY"
  | "WAITING_FOR_REVIEW"
  | "APPROVED"
  | "CONTACTED"
  | "REPLIED"
  | "CONVERTED"
  | "REJECTED";

export const LEAD_STATUSES: LeadStatus[] = [
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
  "REJECTED",
];

/** One scored dimension of a website analysis. `verifiable: false` means
 * the signal could not be checked from the fetched page and must not be
 * guessed — score stays null in that case. */
export interface AnalysisDimension {
  score: number | null;
  verifiable: boolean;
  notes: string[];
}

export interface WebsiteAnalysisData {
  design: AnalysisDimension;
  mobileUx: AnalysisDimension;
  navigation: AnalysisDimension;
  performance: AnalysisDimension;
  content: AnalysisDimension;
  cta: AnalysisDimension;
  trust: AnalysisDimension;
  contactExperience: AnalysisDimension;
  accessibility: AnalysisDimension;
  conversionPotential: AnalysisDimension;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  rawSignals?: Record<string, unknown>;
}

export interface ScoreReason {
  factor: string;
  weight: number;
  contribution: number;
  detail: string;
}

export interface LeadInput {
  companyName: string;
  industry?: string | null;
  location?: string | null;
  website?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  source: string;
  sourceRef?: string | null;
}
