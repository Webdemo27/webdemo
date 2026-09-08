import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateDemoButton } from "./generate-demo-button";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

export function DemoPreviewCard({
  leadId,
  demo,
  generateAction,
}: {
  leadId: string;
  demo: { slug: string; templateKey: string; createdAt: Date } | null;
  generateAction: (leadId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  if (!demo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Demo</CardTitle>
          <GenerateDemoButton leadId={leadId} hasDemo={false} action={generateAction} />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Noch keine Demo erstellt.
          </p>
        </CardContent>
      </Card>
    );
  }

  const url = `/demos/${demo.slug}/index.html`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Demo</CardTitle>
          <CardDescription>Vorlage: {demo.templateKey}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ArrowSquareOut size={14} aria-hidden="true" />
              Öffnen
            </Button>
          </a>
          <GenerateDemoButton leadId={leadId} hasDemo={true} action={generateAction} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          <iframe
            src={url}
            title={`Demo-Vorschau ${demo.slug}`}
            className="h-80 w-full"
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  );
}
