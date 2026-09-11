/**
 * Repairs outreach messages whose demo link ended up below the
 * signature instead of inside the text.
 *
 * insertDemoLink() used to compare the raw bridge template against the
 * already-filled message body, so any template containing "{company}" —
 * three of the four — could never match, and the link was appended after
 * the sign-off while the sentence above still promised it was coming
 * separately. From the recipient's side that reads as a mail with no
 * link in it.
 *
 * This strips that appended line and re-runs the fixed insertion, so the
 * link lands in the sentence that talks about it.
 *
 * Reports by default; pass --apply to write.
 *
 *   npx tsx scripts/repair-demo-links.ts
 *   npx tsx scripts/repair-demo-links.ts --apply
 */
import { prisma } from "../src/lib/db/client";
import { insertDemoLink } from "../src/lib/messaging";
import { buildSignature } from "../src/lib/messaging/templates";

const apply = process.argv.includes("--apply");

/** The exact shape the old fallback appended. Matched rather than
 * guessed at, so a link a human typed there on purpose is left alone. */
const APPENDED = /\n+Den Link zur Demo reiche ich hiermit nach: \S+\s*$/;

async function main() {
  const leads = await prisma.lead.findMany({
    where: { message: { isNot: null }, demo: { isNot: null } },
    include: { message: true, demo: true },
  });

  const signature = buildSignature();
  let repaired = 0;

  for (const lead of leads) {
    const url = lead.demo?.publicUrl;
    const body = lead.message?.body;
    if (!url || !body) continue;

    const linkAt = body.indexOf(url);
    const signatureAt = signature ? body.lastIndexOf(signature) : -1;
    const belowSignature = linkAt !== -1 && signatureAt !== -1 && linkAt > signatureAt;
    if (!belowSignature) {
      console.log(`= ${lead.companyName}: Link steht bereits im Text`);
      continue;
    }

    const stripped = body.replace(APPENDED, "");
    if (stripped.includes(url)) {
      console.log(`! ${lead.companyName}: Link unter der Signatur, aber nicht in der bekannten Form — bitte von Hand prüfen`);
      continue;
    }

    const fixed = insertDemoLink(stripped, url, { companyName: lead.companyName, location: lead.location });
    const nowInText = fixed.indexOf(url) !== -1 && fixed.indexOf(url) < fixed.lastIndexOf(signature);
    if (!nowInText) {
      console.log(`! ${lead.companyName}: Reparatur hätte den Link wieder nicht im Text platziert — unverändert gelassen`);
      continue;
    }

    console.log(`${apply ? "✓" : "~"} ${lead.companyName}`);
    console.log(`    ${fixed.split("\n").find((l) => l.includes(url))?.trim()}`);
    if (apply) await prisma.message.update({ where: { leadId: lead.id }, data: { body: fixed } });
    repaired++;
  }

  console.log(
    apply
      ? `\n${repaired} Nachricht(en) repariert.`
      : `\n${repaired} Nachricht(en) würden repariert — Trockenlauf, nichts geändert. Mit --apply schreiben.`
  );
  if (repaired > 0) {
    console.log(
      "Hinweis: ein bereits in Gmail liegender Entwurf wird dadurch NICHT geändert.\n" +
        "Den alten Entwurf löschen und erneut veröffentlichen, um einen sauberen zu bekommen."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
