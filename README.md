# Webdemo — Lead-Generation & Demo-Plattform

Lokales Tool: findet lokale Unternehmen mit veralteten Websites, analysiert und bewertet sie,
generiert eine individuelle Demo-Website und einen personalisierten Nachrichtenentwurf — und
wartet auf manuelle Freigabe, bevor irgendetwas versendet wird.

## Setup

```bash
npm install
cp .env.example .env   # DATABASE_URL ist bereits korrekt vorbelegt
npm run db:migrate     # legt prisma/dev.db an
npm run dev            # Dashboard unter http://localhost:3000
```

Optional Beispieldaten laden: `npm run db:seed`

## Die Pipeline

```
RESEARCH → DEDUPLICATE → ANALYZE → SCORE → QUALIFY
  → BUILD DEMO → CREATE MESSAGE → WAIT_FOR_REVIEW
```

Manuell pro Lead über das Dashboard (Lead-Detailseite) oder gesamthaft über:

```bash
npm run loop                                                   # bestehende Leads weiterverarbeiten
npm run loop -- --location "Frankfurt am Main" --category bakery --limit 15
```

Verfügbare `--category`-Werte: siehe `src/lib/research/osm-categories.ts`.

Jeder Lauf überspringt bereits entschiedene Leads (`WAITING_FOR_REVIEW` und alles danach) und
lässt einzelne Fehler nie den gesamten Lauf abbrechen. **Nachrichten werden nie automatisch
versendet** — jede landet bei `WAITING_FOR_REVIEW` und muss im Dashboard freigegeben werden.

## Architektur

Siehe [CLAUDE.md](./CLAUDE.md) für Modulgrenzen, Status-Flow und die Sicherheits-Leitplanken
(keine Secrets im Repo, kein Auto-Versand, kein Zugriff auf das Home-Verzeichnis-Repo).

- **Next.js (App Router) + TypeScript + Tailwind CSS** — Dashboard und Backend in einer App.
- **Prisma + SQLite** — lokale, persistente Datenbank (`prisma/dev.db`, git-ignoriert).
- **`src/lib/*`** — unabhängige Module: `research`, `analysis`, `scoring`, `demo-generator`,
  `messaging`, `email` (Gmail-Architektur, noch nicht aktiv), `publishing` (Cloudflare-Architektur,
  noch nicht aktiv), `pipeline` (gemeinsame Schritte für Dashboard-Buttons und `/loop`).
- Generierte Demos liegen unter `public/demos/<slug>/index.html` (git-ignoriert).

## Nützliche Befehle

```bash
npm run build        # Produktions-Build
npm run lint          # ESLint
npm run db:studio     # Prisma Studio (DB-Browser)
```
