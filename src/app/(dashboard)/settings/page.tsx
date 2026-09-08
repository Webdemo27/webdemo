import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { isGmailConfigured } from "@/lib/email";
import { CheckCircle, XCircle, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

function ConfigRow({ label, configured, hint }: { label: string; configured: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {configured ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckCircle size={16} weight="fill" aria-hidden="true" />
          Konfiguriert
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <XCircle size={16} aria-hidden="true" />
          Nicht konfiguriert
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const gmailConfigured = isGmailConfigured();
  const cloudflareConfigured = Boolean(
    process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID
  );

  return (
    <>
      <PageHeader title="Settings" description="Konfiguration & Sicherheit" />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Integrationen</CardTitle>
            <CardDescription>
              Werte kommen ausschließlich aus Umgebungsvariablen (.env, nicht committet).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigRow
              label="Gmail-Entwürfe"
              configured={gmailConfigured}
              hint={`Absender: ${process.env.GMAIL_SENDER_ADDRESS ?? "nicht gesetzt"} — Entwurf-Erstellung ist aktiv (Button "Gmail-Entwurf vorbereiten"); echter Versand bleibt bewusst nicht verdrahtet, nur ein Mensch klickt in Gmail auf Senden.`}
            />
            <ConfigRow
              label="Cloudflare (öffentliche Demo-URLs)"
              configured={cloudflareConfigured}
              hint="Aktiv (Button „Öffentlich bereitstellen“) — bei fehlenden Zugangsdaten schlägt die Aktion mit klarer Fehlermeldung fehl, statt stillschweigend nichts zu tun."
            />
            <ConfigRow label="Datenbank" configured={Boolean(process.env.DATABASE_URL)} hint="Lokale SQLite-Datei (prisma/dev.db)." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sicherheits-Leitplanken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm text-foreground">
            <SafetyItem text="Nachrichten werden niemals automatisch versendet — jede Nachricht durchläuft WAITING_FOR_REVIEW und erfordert manuelle Freigabe." />
            <SafetyItem text="Keine Credentials im Code oder in Git — alle Secrets ausschließlich über .env (git-ignoriert)." />
            <SafetyItem text="Kein automatischer GitHub-Push — Versionskontrolle bleibt manuell gesteuert." />
            <SafetyItem text="Keine erfundenen Unternehmensdaten in Analyse, Demo oder Nachricht — fehlende Informationen werden als nicht überprüfbar markiert." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SafetyItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
