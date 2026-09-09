import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusSelect } from "@/components/leads/status-select";
import { ScoreReasons } from "@/components/leads/score-reasons";
import { AnalysisPanel } from "@/components/leads/analysis-panel";
import { ConceptPanel } from "@/components/leads/concept-panel";
import { BeforeAfterCard } from "@/components/leads/before-after-card";
import { AnalyzeButton } from "@/components/leads/analyze-button";
import { DemoPreviewCard } from "@/components/leads/demo-preview-card";
import { MessageReviewCard } from "@/components/leads/message-review-card";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { ArrowLeft, Globe, MapPin, EnvelopeSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import {
  changeLeadStatus,
  approveMessage,
  rejectMessage,
  updateMessageDraft,
  analyzeLead,
  generateLeadDemo,
  exportReactDemo,
  generateLeadMessage,
  markMessageSent,
  prepareGmailDraft,
  publishLeadDemo,
  reformulateMessage,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  return (
    <>
      <PageHeader
        title={lead.companyName}
        description={[lead.industry, lead.location].filter(Boolean).join(" · ")}
        actions={
          <Link href="/leads" className="text-xs font-medium text-muted-foreground hover:text-foreground">
            <span className="inline-flex items-center gap-1">
              <ArrowLeft size={14} aria-hidden="true" />
              Zurück zu Leads
            </span>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Lead-Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Field icon={Globe} label="Website">
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {lead.domain ?? lead.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Field>
                  <Field icon={MapPin} label="Adresse">
                    {lead.address ?? lead.location ?? "—"}
                  </Field>
                  <Field icon={EnvelopeSimple} label="E-Mail">
                    {lead.contactEmail ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        {lead.contactEmail}
                        {lead.contactEmailSource ? (
                          <span
                            className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            title={
                              lead.contactEmailSourceUrl
                                ? `Quelle: ${lead.contactEmailSourceUrl}`
                                : undefined
                            }
                          >
                            {lead.contactEmailSource}
                            {lead.contactEmailConfidence ? ` · ${lead.contactEmailConfidence}` : ""}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span title={lead.contactDiscoveryError ?? undefined}>
                        {lead.contactDiscoveryError ? "— (nichts gefunden)" : "—"}
                      </span>
                    )}
                  </Field>
                  <Field icon={Phone} label="Telefon">
                    {lead.contactPhone ?? "—"}
                  </Field>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-border pt-4">
                  <ScoreLabel label="Website-Score" score={lead.websiteScore} />
                  <div>
                    <ScoreLabel label="Lead-Score" score={lead.leadScore} />
                    <ScoreReasons reasons={lead.scoreReasons} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Status</div>
                    <StatusSelect leadId={lead.id} status={lead.status} action={changeLeadStatus} />
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    Quelle: {lead.source}
                  </div>
                </div>
              </CardContent>
            </Card>

            <AnalysisPanel
              analysis={lead.analysis}
              actions={
                <AnalyzeButton leadId={lead.id} hasWebsite={Boolean(lead.website)} action={analyzeLead} />
              }
            />
            <ConceptPanel concept={lead.demo?.concept} />
            <BeforeAfterCard
              beforePath={lead.analysis?.screenshotDesktopPath}
              afterPath={lead.demo?.afterScreenshotDesktopPath}
              companyName={lead.companyName}
            />
            <ActivityTimeline entries={lead.activity} />
          </div>

          <div className="space-y-4">
            <DemoPreviewCard
              leadId={lead.id}
              demo={lead.demo}
              hasAnalysis={Boolean(lead.analysis)}
              generateAction={generateLeadDemo}
              publishAction={publishLeadDemo}
              exportReactAction={exportReactDemo}
            />
            <MessageReviewCard
              leadId={lead.id}
              message={lead.message}
              hasAnalysis={Boolean(lead.analysis)}
              hasDemo={Boolean(lead.demo)}
              approveAction={approveMessage}
              rejectAction={rejectMessage}
              updateAction={updateMessageDraft}
              generateAction={generateLeadMessage}
              markSentAction={markMessageSent}
              gmailDraftAction={prepareGmailDraft}
              reformulateAction={reformulateMessage}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden={true} />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function ScoreLabel({ label, score }: { label: string; score: number | null }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <ScoreBadge score={score} />
    </div>
  );
}
