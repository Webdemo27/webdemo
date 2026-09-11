/**
 * Repeatable pipeline runner:
 *   RESEARCH -> DEDUPLICATE -> ANALYZE -> SCORE -> QUALIFY -> BUILD DEMO
 *   -> PREVIEW -> CREATE MESSAGE -> WAIT_FOR_REVIEW
 *
 * Usage:
 *   npm run loop                                        # advance existing leads only
 *   npm run loop -- --location "Offenbach am Main" --category bakery --limit 15
 *
 * Rules this script must never break:
 * - Never sends anything. It stops every lead at WAITING_FOR_REVIEW.
 * - A lead already reviewed/decided (WAITING_FOR_REVIEW or later, or
 *   REJECTED) is skipped — never reprocessed.
 * - One lead's failure is recorded on that lead and never stops the run.
 */
import { prisma, recordLeadError } from "../src/lib/db";
import { runResearch, overpassSource } from "../src/lib/research";
import { runAnalysisAndScoring, runDemoGeneration, runMessageGeneration } from "../src/lib/pipeline/steps";
import type { LeadStatus } from "../src/lib/types";

const SKIP_STATUSES: LeadStatus[] = [
  "WAITING_FOR_REVIEW",
  "APPROVED",
  "CONTACTED",
  "REPLIED",
  "CONVERTED",
  "REJECTED",
];

interface CliArgs {
  location?: string;
  category?: string;
  /** How many businesses the RESEARCH step pulls from the source. */
  limit: number;
  /** How many existing leads this run advances. Unbounded when unset. */
  max?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { limit: 15 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--location") args.location = argv[++i];
    else if (arg === "--category") args.category = argv[++i];
    else if (arg === "--limit") args.limit = Number(argv[++i]) || 15;
    else if (arg === "--max") {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed > 0) args.max = Math.floor(parsed);
    }
  }
  return args;
}

type AdvanceOutcome =
  | "analyzed-and-qualified"
  | "analyzed-not-qualified"
  | "demo-created"
  | "waiting-for-review"
  | "skipped-no-website"
  | "no-op";

/** Advances one lead through every step it's currently eligible for,
 * stopping naturally at the next checkpoint (not qualified, or reached
 * WAITING_FOR_REVIEW) rather than forcing it further. */
async function advanceLead(leadId: string): Promise<AdvanceOutcome> {
  // A small bounded loop, not recursion — a lead can move through at
  // most a handful of statuses in one run, so this always terminates.
  for (let guard = 0; guard < 10; guard++) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || SKIP_STATUSES.includes(lead.status)) return "no-op";

    if (lead.status === "NEW" || lead.status === "RESEARCHED") {
      if (!lead.website) return "skipped-no-website";
      const { qualified } = await runAnalysisAndScoring(leadId);
      if (!qualified) return "analyzed-not-qualified";
      continue;
    }

    if (lead.status === "ANALYZED") {
      // Re-entering with an existing analysis but not (yet) qualified —
      // nothing changed since last run, so stop here rather than loop.
      return "analyzed-not-qualified";
    }

    if (lead.status === "QUALIFIED") {
      await runDemoGeneration(leadId);
      continue;
    }

    if (lead.status === "DEMO_CREATED" || lead.status === "MESSAGE_READY") {
      await runMessageGeneration(leadId);
      return "waiting-for-review";
    }

    return "no-op";
  }
  return "no-op";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const summary = {
    research: null as null | Awaited<ReturnType<typeof runResearch>>,
    qualified: 0,
    notQualified: 0,
    demosCreated: 0,
    waitingForReview: 0,
    skippedNoWebsite: 0,
    skippedAlreadyProcessed: 0,
    errors: [] as Array<{ company: string; error: string }>,
  };

  if (args.location && args.category) {
    console.log(`Recherche: "${args.category}" in "${args.location}" (max ${args.limit})…`);
    summary.research = await runResearch(overpassSource, {
      location: args.location,
      category: args.category,
      limit: args.limit,
    });
    console.log(
      `  → ${summary.research.found} gefunden, ${summary.research.created} neu, ${summary.research.duplicates} bereits vorhanden, ${summary.research.errors.length} Fehler`
    );
  } else {
    console.log("Kein --location/--category angegeben — überspringe Recherche, verarbeite bestehende Leads.");
  }

  const pending = await prisma.lead.findMany({
    where: { status: { notIn: SKIP_STATUSES } },
    orderBy: { createdAt: "asc" },
  });

  // Every advanced lead generates images, which costs money. Without a
  // bound, one command spends whatever 45 leads happen to cost and there
  // is no way to measure the per-lead price first. The run is resumable
  // by design — leads that already moved are skipped next time — so
  // stopping early loses nothing.
  const leads = args.max != null ? pending.slice(0, args.max) : pending;
  console.log(
    args.max != null && pending.length > leads.length
      ? `${leads.length} von ${pending.length} Lead(s) in diesem Durchlauf (--max ${args.max}).`
      : `${leads.length} Lead(s) im Pipeline-Durchlauf.`
  );

  for (const lead of leads) {
    try {
      const outcome = await advanceLead(lead.id);
      switch (outcome) {
        case "analyzed-not-qualified":
          summary.notQualified += 1;
          break;
        case "waiting-for-review":
          summary.waitingForReview += 1;
          break;
        case "skipped-no-website":
          summary.skippedNoWebsite += 1;
          break;
        case "no-op":
          summary.skippedAlreadyProcessed += 1;
          break;
      }
      console.log(`  - ${lead.companyName}: ${outcome}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push({ company: lead.companyName, error: message });
      await recordLeadError(lead.id, message).catch(() => {
        // Even error-logging must not abort the run.
      });
      console.error(`  - ${lead.companyName}: FEHLER — ${message}`);
    }
  }

  console.log("\n--- Zusammenfassung ---");
  console.log(`Wartet auf Prüfung (neu):     ${summary.waitingForReview}`);
  console.log(`Nicht qualifiziert:           ${summary.notQualified}`);
  console.log(`Ohne Website übersprungen:    ${summary.skippedNoWebsite}`);
  console.log(`Bereits in Bearbeitung/fertig:${summary.skippedAlreadyProcessed}`);
  console.log(`Fehler:                       ${summary.errors.length}`);
  if (summary.errors.length > 0) {
    for (const err of summary.errors) console.log(`  - ${err.company}: ${err.error}`);
  }
}

main()
  .catch((e) => {
    console.error("Loop abgebrochen (unerwarteter Fehler außerhalb der Lead-Verarbeitung):", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
