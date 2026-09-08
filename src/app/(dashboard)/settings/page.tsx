import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { isGmailConfigured } from "@/lib/email";
import { CheckCircle, XCircle, ShieldCheck, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

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

        {!cloudflareConfigured ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Cloudflare einrichten</CardTitle>
                <CardDescription>
                  Zwei Werte, einmalig — danach veröffentlicht der Button „Öffentlich bereitstellen“
                  selbstständig.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SetupStep n={1} title="API-Token erstellen">
                <p>
                  In Cloudflare unter{" "}
                  <ExternalLink href="https://dash.cloudflare.com/profile/api-tokens">
                    Profil → API-Tokens
                  </ExternalLink>{" "}
                  auf „Token erstellen“. Vorlage <Code>Cloudflare Pages bearbeiten</Code> wählen (oder
                  ein eigenes Token mit der Berechtigung <Code>Account → Cloudflare Pages → Bearbeiten</Code>{" "}
                  für dieses Konto). Nach dem Erstellen wird der Token nur einmal angezeigt — sofort
                  kopieren.
                </p>
                <EnvLine name="CLOUDFLARE_API_TOKEN" />
              </SetupStep>

              <SetupStep n={2} title="Account-ID finden">
                <p>
                  Im Cloudflare-Dashboard ein beliebiges Projekt/Domain öffnen (oder{" "}
                  <ExternalLink href="https://dash.cloudflare.com/">dash.cloudflare.com</ExternalLink>{" "}
                  → „Workers &amp; Pages“) — die Account-ID steht rechts in der Seitenleiste der
                  Übersichtsseite.
                </p>
                <EnvLine name="CLOUDFLARE_ACCOUNT_ID" />
              </SetupStep>

              <SetupStep n={3} title="Eintragen und neu starten">
                <p>
                  Beide Werte in die Datei <Code>.env</Code> im Projektordner eintragen (nicht in
                  <Code>.env.example</Code> — diese Datei ist git-ignoriert und wird nie committet), dann
                  den lokalen Server einmal neu starten. Sobald beide Werte gesetzt sind, zeigt diese
                  Seite „Konfiguriert“ und der Publish-Button funktioniert ohne weiteres Zutun.
                </p>
              </SetupStep>
            </CardContent>
          </Card>
        ) : null}

        {!gmailConfigured ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Gmail einrichten</CardTitle>
                <CardDescription>
                  Einmalige OAuth2-Einrichtung für {process.env.GMAIL_SENDER_ADDRESS ?? "hacibekircayir@gmail.com"} —
                  danach erstellt der Button „Gmail-Entwurf vorbereiten“ echte Entwürfe (nie automatischer
                  Versand).
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SetupStep n={1} title="Google-Cloud-Projekt + Gmail API">
                <p>
                  In der{" "}
                  <ExternalLink href="https://console.cloud.google.com/">Google Cloud Console</ExternalLink>{" "}
                  ein Projekt anlegen (oder ein bestehendes wählen) und unter „APIs &amp; Dienste →
                  Bibliothek“ die <Code>Gmail API</Code> aktivieren.
                </p>
              </SetupStep>

              <SetupStep n={2} title="OAuth-Consent-Screen + Zugangsdaten">
                <p>
                  Unter „APIs &amp; Dienste → OAuth-Zustimmungsbildschirm“ einen Screen im Testmodus
                  anlegen und {process.env.GMAIL_SENDER_ADDRESS ?? "hacibekircayir@gmail.com"} als
                  Testnutzer hinzufügen (keine Google-Verifizierung nötig, solange nur dieses eine Konto
                  verwendet wird). Danach unter „Zugangsdaten → Zugangsdaten erstellen → OAuth-Client-ID“
                  einen Client vom Typ <Code>Desktop-App</Code> anlegen.
                </p>
                <EnvLine name="GMAIL_CLIENT_ID" />
                <EnvLine name="GMAIL_CLIENT_SECRET" />
              </SetupStep>

              <SetupStep n={3} title="Refresh-Token holen">
                <p>
                  Im{" "}
                  <ExternalLink href="https://developers.google.com/oauthplayground">
                    OAuth 2.0 Playground
                  </ExternalLink>{" "}
                  oben rechts im Zahnrad die eigene Client-ID/Secret aus Schritt 2 eintragen. Als Scope{" "}
                  <Code>https://www.googleapis.com/auth/gmail.compose</Code> auswählen (erlaubt Entwürfe
                  erstellen — nichts weiter), mit{" "}
                  {process.env.GMAIL_SENDER_ADDRESS ?? "hacibekircayir@gmail.com"} autorisieren, dann
                  „Authorization Code gegen Tokens tauschen“ — der angezeigte{" "}
                  <Code>Refresh Token</Code> ist der gesuchte Wert.
                </p>
                <EnvLine name="GMAIL_REFRESH_TOKEN" />
              </SetupStep>

              <SetupStep n={4} title="Eintragen und neu starten">
                <p>
                  Alle drei Werte in <Code>.env</Code> eintragen, Server neu starten. Diese Seite zeigt
                  dann „Konfiguriert“, und der Gmail-Entwurf-Button funktioniert selbstständig.
                </p>
              </SetupStep>
            </CardContent>
          </Card>
        ) : null}

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

function SetupStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-primary hover:underline"
    >
      {children}
      <ArrowSquareOut size={11} aria-hidden="true" />
    </a>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{children}</code>
  );
}

/** Names the exact .env variable a step's value belongs in — never
 * shows or accepts the actual secret value anywhere in this UI. */
function EnvLine({ name }: { name: string }) {
  return (
    <p className="tabular flex items-center gap-1.5 rounded-md border border-dashed border-border bg-muted/50 px-2 py-1 font-mono text-[11px] text-foreground">
      → <Code>{name}</Code> <span className="text-muted-foreground">in .env</span>
    </p>
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
