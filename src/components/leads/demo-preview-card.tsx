import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

export function DemoPreviewCard({
  demo,
}: {
  demo: { slug: string; templateKey: string; createdAt: Date } | null;
}) {
  if (!demo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Noch keine Demo erstellt. Wird für qualifizierte Leads automatisch generiert.
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
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ArrowSquareOut size={14} aria-hidden="true" />
            Öffnen
          </Button>
        </a>
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
