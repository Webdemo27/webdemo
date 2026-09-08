@AGENTS.md

# Webdemo — Lead Generation & Website Demo Platform

Local Windows tool: finds local businesses with outdated websites, analyzes and scores them,
generates a personalized demo site, drafts an outreach message, and waits for **manual human
review and approval** before anything is ever sent. No step in this pipeline may send a message
automatically — sending is always a separate, explicit, human-triggered action.

## Stack

- **Next.js (App Router) + TypeScript** — dashboard UI and backend (API routes / server actions) in one app.
- **Tailwind CSS** for styling; dashboard UI follows the UI/UX Pro Max skill (high-quality SaaS look, not a generic admin template).
- **Prisma + SQLite** (`prisma/dev.db`, git-ignored) for local persistent storage. Swapping to a hosted Postgres DB later is a config change, not a rewrite.
- Generated demo sites live under `/generated-demos/<leadId>/` as static output, isolated from the dashboard, previewed via iframe.

## Module boundaries (`src/lib/*`)

- `research/` — lead discovery (must support multiple sources later; no hard coupling to one).
- `analysis/` — website analysis (design, mobile UX, nav, performance, content, CTA, trust, contact, accessibility, conversion potential). No invented facts — mark anything unverifiable as such.
- `scoring/` — transparent 0–100 lead score derived from the analysis. Never artificially inflate a score.
- `demo-generator/` — builds the per-lead demo site. Never invents company facts; uses clearly-marked neutral placeholders for missing info.
- `messaging/` — drafts the personalized outreach message (short, natural, specific, no invented claims, no mass-marketing tone).
- `email/` — **abstraction/interface only for now**. Real Gmail sending is Phase 10 and is not implemented yet.
- `db/` — Prisma client + repository functions.

## Lead status flow

`NEW → RESEARCHED → ANALYZED → QUALIFIED → DEMO_CREATED → MESSAGE_READY → WAITING_FOR_REVIEW → APPROVED → CONTACTED → REPLIED → CONVERTED` (or `REJECTED` at any point).

## Hard constraints

- **Never send a message automatically.** Every message stops at `WAITING_FOR_REVIEW` until the user explicitly approves it in the dashboard.
- **Never commit secrets.** `.env` is git-ignored; `.env.example` documents required variables. Gmail/Cloudflare credentials come from environment variables only, never hardcoded.
- **Never use, modify, or delete the git repository at `C:\Users\cihan`** (the user's Windows profile root) — it is an unrelated, accidental repo. This project's own repo lives at the project root and is separate.
- **Never push to GitHub without explicit user approval** for that specific push.
- Work only inside this project folder; don't read or write files elsewhere on the machine.
- Duplicate leads are prevented by domain + company name (see `research/` when implemented).
- Build iteratively per the phase plan in the project goal — don't build later phases ahead of time.

