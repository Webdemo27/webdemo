import { pickKeyObservation } from "../messaging";
import { buildSignature } from "../messaging/templates";
import type { WebsiteAnalysisData } from "../types";

/**
 * The words to say on the phone, built from this one business's real
 * analysis.
 *
 * Why the phone at all: 78% of the leads in this database have a number
 * and only 38% an email, and unsolicited B2B email advertising in
 * Germany needs prior explicit consent while a call to a business can
 * rest on presumed consent where the offer plausibly relates to what
 * they do. The call is both the wider channel and the defensible one —
 * and it is where the consent to send the link is actually obtained.
 *
 * Nothing here invents a fact about the business. The observation comes
 * from the verified analysis or is left out entirely; the script then
 * opens with a question instead of a finding, which is a weaker call but
 * an honest one.
 */

export interface CallScript {
  /** Said first, standing up. Name, trade, why this call. */
  einstieg: string[];
  /** The one verified thing about their site. Null when the analysis
   * verified nothing worth saying. */
  beobachtung: string | null;
  /** Where the analysis finding came from, for the caller's own
   * confidence — never read aloud. */
  beleg: string | null;
  ueberleitung: string[];
  /** The consent moment: everything after the call depends on this. */
  bitte: string[];
  einwaende: Array<{ einwand: string; antwort: string }>;
  danach: string[];
}

export interface CallScriptContext {
  companyName: string;
  industry: string | null;
  location: string | null;
  analysis: WebsiteAnalysisData | null;
  /** The live demo URL, or null when it hasn't been published yet. */
  demoUrl: string | null;
}

/** "Restaurant" -> "Restaurants", so the trade line sounds spoken rather
 * than like a database field. Falls back to a neutral phrase when the
 * industry is unknown — never guesses one. */
function tradePlural(industry: string | null): string {
  if (!industry) return "kleine Betriebe";
  const map: Record<string, string> = {
    Restaurant: "Restaurants",
    Café: "Cafés",
    Bäckerei: "Bäckereien",
    Zahnarzt: "Zahnarztpraxen",
    Arztpraxis: "Arztpraxen",
    Friseur: "Friseursalons",
    Hotel: "Hotels",
    Rechtsanwalt: "Kanzleien",
    Steuerberater: "Steuerkanzleien",
    Autowerkstatt: "Werkstätten",
    Fahrradladen: "Fahrradläden",
    Blumenladen: "Blumenläden",
    Immobilienmakler: "Maklerbüros",
  };
  return map[industry] ?? `Betriebe wie ${industry}`;
}

function callerName(): string {
  return process.env.SENDER_NAME?.trim() || "—";
}

export function buildCallScript(ctx: CallScriptContext): CallScript {
  const name = callerName();
  const ort = ctx.location ?? "der Gegend";
  const branche = tradePlural(ctx.industry);
  const observation = ctx.analysis ? pickKeyObservation(ctx.analysis) : null;

  const einstieg = [
    `Guten Tag, mein Name ist ${name}.`,
    `Ich baue Websites für ${branche} hier in ${ort}.`,
    // Naming the reason for the call immediately is what separates this
    // from a cold sales call: there is a specific reason, and it is true.
    observation
      ? `Ich rufe an, weil mir bei Ihrer Website etwas aufgefallen ist. Haben Sie kurz zwei Minuten?`
      : `Ich habe mir Ihre Website angesehen und hätte eine kurze Frage dazu. Haben Sie zwei Minuten?`,
  ];

  const ueberleitung = observation
    ? [
        `Ich wollte das nicht nur behaupten, deshalb habe ich es Ihnen gebaut.`,
        `Ein fertiger Entwurf für ${ctx.companyName} — mit Ihrem Namen, am Handy bedienbar. Kostenlos und unverbindlich.`,
      ]
    : [
        `Ich habe Ihnen einen Entwurf gebaut, wie Ihr Auftritt aussehen könnte.`,
        `Fertig, mit Ihrem Namen, am Handy bedienbar. Kostenlos und unverbindlich.`,
      ];

  // The single most important sentence in the script. A "yes" here is
  // the consent that makes the follow-up mail or WhatsApp lawful, and it
  // is the only thing this call has to achieve.
  const bitte = [
    `Darf ich Ihnen den Link schicken? Sie schauen in Ruhe drauf, und wenn es nichts für Sie ist, sagen Sie mir das einfach.`,
    `Lieber per WhatsApp oder per E-Mail?`,
  ];

  const einwaende: CallScript["einwaende"] = [
    {
      einwand: "Ich habe gerade keine Zeit.",
      antwort: `Verstehe ich. Ich schicke Ihnen einfach den Link, dann schauen Sie, wann es passt. Auf welche Nummer darf ich?`,
    },
    {
      einwand: "Wir haben schon eine Website.",
      antwort: `Ja, die habe ich gesehen — deshalb rufe ich an. Schauen Sie sich den Entwurf einmal an und sagen Sie mir, ob Sie einen Unterschied sehen. Wenn nicht, war's das.`,
    },
    {
      einwand: "Was kostet das denn?",
      antwort: `Der Entwurf kostet nichts, den bekommen Sie so. Über Preise reden wir erst, wenn Ihnen gefällt, was Sie sehen.`,
    },
    {
      einwand: "Schicken Sie mir eine E-Mail.",
      antwort: `Mache ich gern. An welche Adresse? — und darf ich in ein paar Tagen kurz nachfassen, ob Sie reingeschaut haben?`,
    },
    {
      einwand: "Kein Interesse.",
      antwort: `Alles gut, danke für Ihre Zeit. Schönen Tag noch.`,
    },
    {
      einwand: "Wer sind Sie nochmal / woher haben Sie meine Nummer?",
      antwort: `${name}, ich baue Websites hier in der Region. Ihre Nummer steht öffentlich auf Ihrer Website beziehungsweise im Branchenverzeichnis.`,
    },
  ];

  const danach = [
    ctx.demoUrl
      ? `Link sofort schicken, solange das Gespräch noch frisch ist: ${ctx.demoUrl}`
      : `Demo zuerst veröffentlichen ("Öffentlich bereitstellen") — dann liegt der Entwurf mit dem Link fertig in Gmail.`,
    `Ergebnis hier eintragen — auch ein "nicht erreicht". Ohne das weiß niemand, was wirkt.`,
    `Bei Zusage: in 3–4 Tagen kurz nachfassen, ob er reingeschaut hat.`,
  ];

  return {
    einstieg,
    beobachtung: observation?.plain ?? null,
    beleg: observation?.detail ?? null,
    ueberleitung,
    bitte,
    einwaende,
    danach,
  };
}

/** The whole script as one block of text, for printing or reading off a
 * second screen. */
export function callScriptAsText(script: CallScript): string {
  const lines: string[] = [];
  lines.push("— EINSTIEG —", ...script.einstieg, "");
  if (script.beobachtung) {
    lines.push("— WAS MIR AUFGEFALLEN IST —", script.beobachtung);
    if (script.beleg) lines.push(`(Beleg, nicht vorlesen: ${script.beleg})`);
    lines.push("");
  }
  lines.push("— ÜBERLEITUNG —", ...script.ueberleitung, "");
  lines.push("— DIE BITTE —", ...script.bitte, "");
  lines.push("— EINWÄNDE —");
  for (const e of script.einwaende) lines.push(`„${e.einwand}"`, `  → ${e.antwort}`);
  lines.push("", "— NACH DEM GESPRÄCH —", ...script.danach);
  const signature = buildSignature();
  if (signature) lines.push("", "— WER ANRUFT —", signature);
  return lines.join("\n");
}
