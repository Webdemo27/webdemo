import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateDemoButton } from "./generate-demo-button";
import { PublishDemoButton } from "./publish-demo-button";
import { CopyUrlButton } from "./copy-url-button";
import { ArrowSquareOut, Globe } from "@phosphor-icons/react/dist/ssr";

interface PublishOutcome {
  ok: boolean;
  publicUrl?: string;
  error?: string;
  configured: boolean;
}

export function DemoPreviewCard({
  leadId,
  demo,
  hasAnalysis,
  generateAction,
  publishAction,
}: {
  leadId: string;
  demo: {
    slug: string;
    templateKey: string;
    createdAt: Date;
    publicUrl: string | null;
  } | null;
  hasAnalysis: boolean;
  generateAction: (leadId: string) => Promise<{ ok: boolean; error?: string }>;
  publishAction: (leadId: string) => Promise<PublishOutcome>;
}) {
  if (!demo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Demo</CardTitle>
          <GenerateDemoButton leadId={leadId} hasDemo={false} hasAnalysis={hasAnalysis} action={generateAction} />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Noch keine Demo erstellt.
          </p>
        </CardContent>
      </Card>
    );
  }

  const previewUrl = `/demos/${demo.slug}/index.html`;

  return (
    <Card className="hover-lift overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Demo</CardTitle>
          <CardDescription>Konzept: {demo.templateKey}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ArrowSquareOut size={14} aria-hidden="true" />
              In neuem Tab
            </Button>
          </a>
          <GenerateDemoButton leadId={leadId} hasDemo={true} hasAnalysis={hasAnalysis} action={generateAction} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {demo.publicUrl ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
            <Globe size={14} className="shrink-0 text-primary" aria-hidden="true" />
            <a
              href={demo.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-xs text-primary hover:underline"
            >
              {demo.publicUrl}
            </a>
            <CopyUrlButton url={demo.publicUrl} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Nur lokale Vorschau — noch nicht öffentlich verfügbar.
            </p>
            <PublishDemoButton leadId={leadId} action={publishAction} />
          </div>
        )}
        {/* A demo is a full desktop landing page — a small thumbnail-height
            iframe undersells it. Sized tall enough to read as a real
            preview of the finished project, scaled down slightly so the
            page's own responsive layout still shows its desktop framing. */}
        <div className="overflow-hidden rounded-lg border border-border bg-muted shadow-premium">
          <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/40" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/40" aria-hidden="true" />
          </div>
          <iframe
            src={previewUrl}
            title={`Demo-Vorschau ${demo.slug}`}
            className="h-[42rem] w-full"
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  );
}
