import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateDemoButton } from "./generate-demo-button";
import { ArrowSquareOut, Globe } from "@phosphor-icons/react/dist/ssr";

export function DemoPreviewCard({
  leadId,
  demo,
  hasAnalysis,
  generateAction,
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
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Demo</CardTitle>
          <CardDescription>Vorlage: {demo.templateKey}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ArrowSquareOut size={14} aria-hidden="true" />
              Vorschau
            </Button>
          </a>
          <GenerateDemoButton leadId={leadId} hasDemo={true} hasAnalysis={hasAnalysis} action={generateAction} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {demo.publicUrl ? (
          <a
            href={demo.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-primary hover:underline"
          >
            <Globe size={14} aria-hidden="true" />
            {demo.publicUrl}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nur lokale Vorschau — öffentliche Bereitstellung (Cloudflare) ist vorbereitet, aber
            noch nicht aktiviert (Phase 11).
          </p>
        )}
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          <iframe
            src={previewUrl}
            title={`Demo-Vorschau ${demo.slug}`}
            className="h-80 w-full"
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  );
}
