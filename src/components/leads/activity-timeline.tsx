import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
}

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verlauf</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch keine Einträge.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-xs">
                <span className="tabular w-32 shrink-0 text-muted-foreground">
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(entry.createdAt)}
                </span>
                <span className="text-foreground">{entry.message}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
