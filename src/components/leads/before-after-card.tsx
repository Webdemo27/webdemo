import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/** Real viewport screenshots side by side — the lead's current live site
 * next to the freshly generated demo. Both come from analysis/screenshot.ts
 * (Playwright), never a mockup or invented "after" state. Renders nothing
 * until both halves exist, since a lopsided single-image comparison isn't
 * the point — the whole value is the direct contrast. */
export function BeforeAfterCard({
  beforePath,
  afterPath,
}: {
  beforePath: string | null | undefined;
  afterPath: string | null | undefined;
}) {
  if (!beforePath || !afterPath) return null;

  return (
    <Card className="hover-lift">
      <CardHeader>
        <div>
          <CardTitle>Vorher / Nachher</CardTitle>
          <CardDescription>Echte Aufnahmen — kein Mockup</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Shot label="Vorher" path={beforePath} tone="text-muted-foreground" />
          <Shot label="Nachher" path={afterPath} tone="text-success" />
        </div>
      </CardContent>
    </Card>
  );
}

function Shot({ label, path, tone }: { label: string; path: string; tone: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- local static
          screenshot file, not an optimizable remote/app asset */}
      <img
        src={path}
        alt={`${label === "Vorher" ? "Aktuelle Website" : "Neues Demo-Konzept"} (${label})`}
        width={1440}
        height={900}
        className="block w-full"
        style={{ aspectRatio: "1440 / 900", height: "auto" }}
        loading="lazy"
      />
      <p className={`border-t border-border bg-muted px-3 py-1.5 text-xs font-semibold ${tone}`}>
        {label}
      </p>
    </div>
  );
}
