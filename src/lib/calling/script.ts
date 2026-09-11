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
 * Written as a dialogue, not a pitch. The first version of this was a
 * list of short declarative lines, and reading it aloud made the caller
 * stumble: nothing connected, there was nothing for the other person to
 * answer, and it stopped dead between sections. A cold call that is one
 * person talking is a cold call that ends early. So almost every beat
 * hands the conversation back with a question, and the pauses are
 * written down, because the hardest part of a call is shutting up.
 *
 * Nothing here invents a fact about the business. The observation comes
 * from the verified analysis or is left out entirely, and the script
 * then asks about their website instead of asserting something about it.
 */

export interface CallBeat {
  /** Spoken, flowing. Meant to be read almost word for word. */
  sagen: string;
  /** What the caller does after saying it — nearly always: stop talking. */
  danach?: string;
  /** Context for the caller only. Never read aloud. */
  hinweis?: string;
}

export interface CallSection {
  titel: string;
  beats: CallBeat[];
}

export interface CallScript {
  abschnitte: CallSection[];
  /** The verified finding behind the observation, for the caller's own
   * confidence. Never read aloud. */
  beleg: string | null;
  /** True when the analysis found nothing solid, so the script asks
   * instead of asserting. */
  ohneBefund: boolean;
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
  return map[industry] ?? `Betriebe wie Ihren`;
}

/** The consequence that makes a finding matter to the owner, in their
 * terms. Keyed by the same dimensions pickKeyObservation can return, so
 * the "why that is a pity" line always fits what was just said. */
const WARUM_DAS_SCHADE_IST: Record<string, string> = {
  "Am Handy ist die Seite schwer zu bedienen — und die meisten Ihrer Kunden schauen genau dort zuerst.":
    "Die allermeisten schauen heute vom Handy aus, oft im Vorbeigehen. Wenn da gezoomt und geschoben werden muss, sind die Leute wieder weg, bevor sie überhaupt gesehen haben, was Sie anbieten.",
  "Es ist nicht auf Anhieb klar, was ein Interessent als Nächstes tun soll — anrufen, schreiben, vorbeikommen.":
    "Und dann steht jemand da, findet es eigentlich ganz gut — weiß aber nicht, was er jetzt machen soll. Anrufen? Vorbeikommen? Meistens macht er dann gar nichts.",
  "Der Auftritt wirkt älter, als Ihr Betrieb es ist.":
    "Das ist schade, weil die Seite ja der erste Eindruck ist. Die Leute denken dann, der Laden sei so wie die Seite — und das werden Sie nicht sein.",
  "Die Seite braucht spürbar lange zum Laden. Die meisten Besucher warten das nicht ab.":
    "Und ganz ehrlich, keiner wartet heute mehr. Nach ein paar Sekunden ist man beim Nächsten, und der ist dann vielleicht nicht mal besser als Sie.",
  "Der Text macht es Besuchern schwer, schnell zu erfassen, worum es geht.":
    "Die Leute lesen heute nicht mehr, die überfliegen. Wenn in den ersten Sekunden nicht hängen bleibt, worum es geht, sind sie wieder weg — obwohl alles dasteht.",
  "Wer Sie erreichen möchte, muss dafür suchen.":
    "Und wer suchen muss, ruft oft einfach nicht an. Das sind Leute, die Sie eigentlich schon hatten.",
};

function callerName(): string {
  return process.env.SENDER_NAME?.trim() || "—";
}

export function buildCallScript(ctx: CallScriptContext): CallScript {
  const name = callerName();
  const ort = ctx.location ?? "der Gegend";
  const branche = tradePlural(ctx.industry);
  const observation = ctx.analysis ? pickKeyObservation(ctx.analysis) : null;
  const warum = observation ? WARUM_DAS_SCHADE_IST[observation.plain] : undefined;

  const abschnitte: CallSection[] = [];

  abschnitte.push({
    titel: "Wer ich bin",
    beats: [
      {
        sagen: `Guten Tag, hier ist ${name} aus ${ort}. Sagen Sie, störe ich Sie gerade mitten im Betrieb?`,
        danach: "Kurz warten. Diese eine Frage entscheidet, ob das ein Gespräch wird oder ein Abwimmeln.",
        hinweis:
          'Bei "ja, ungünstig": nicht weiterreden, sondern "Wann passt es Ihnen besser — heute Nachmittag oder lieber morgen früh?"',
      },
      {
        sagen: `Ich mache Websites für ${branche} hier in der Gegend. Ganz kurz, warum ich anrufe: Ich bin über Ihre Seite gestolpert und da ist mir etwas aufgefallen.`,
        danach: "Weiterreden, nicht warten.",
      },
      {
        sagen: `Darf ich kurz fragen — kümmern Sie sich selbst um die Website, oder hat das damals jemand anderes für Sie gemacht?`,
        danach: "Warten und zuhören. Hier erzählen die meisten von sich aus, was sie an der Seite stört.",
        hinweis:
          "Das ist die wichtigste Frage im ganzen Gespräch. Wer selbst antwortet, ist der Entscheider. Wer sagt „das hat mein Neffe gemacht“, hat schon zugegeben, dass es niemanden mehr pflegt.",
      },
    ],
  });

  if (observation) {
    abschnitte.push({
      titel: "Was mir aufgefallen ist",
      beats: [
        {
          sagen: `Darf ich Ihnen sagen, was mir aufgefallen ist? Ich will da gar nicht meckern, das meiste passt ja.`,
          danach: "Kurz warten, bis ein Ja kommt.",
          hinweis:
            "Um Erlaubnis fragen, bevor Kritik kommt. Ungefragt kritisiert klingt nach Verkäufer, gefragt klingt nach Hilfe.",
        },
        {
          sagen: observation.plain,
          danach: "Kurz Luft holen. Den Satz wirken lassen.",
        },
        ...(warum
          ? [
              {
                sagen: warum,
                danach: "Warten. Oft kommt hier ein „ja, das stimmt“ — und dann haben Sie das Gespräch.",
              },
            ]
          : []),
        {
          sagen: `Merken Sie das eigentlich? Also dass Leute anrufen und Sachen fragen, die eigentlich auf der Seite stehen?`,
          danach: "Warten und zuhören.",
          hinweis: "Lässt den Gesprächspartner das Problem selbst aussprechen. Viel stärker, als es ihm zu erklären.",
        },
      ],
    });
  } else {
    abschnitte.push({
      titel: "Was mir aufgefallen ist",
      beats: [
        {
          sagen: `Ich hab mir Ihre Seite angeschaut — und ehrlich gesagt hätte ich da eine Frage an Sie: Sind Sie damit eigentlich zufrieden, so wie sie gerade ist?`,
          danach: "Warten. Ehrlich warten, auch wenn es still wird.",
          hinweis:
            "Die Analyse hat für diesen Betrieb nichts Belastbares gefunden. Nichts erfinden — stattdessen fragen. Was der Inhaber selbst nennt, ist ohnehin das bessere Argument.",
        },
        {
          sagen: `Und wann haben Sie da zuletzt was dran gemacht?`,
          danach: "Warten. Die Antwort ist fast immer „schon länger“.",
        },
      ],
    });
  }

  abschnitte.push({
    titel: "Was ich mache",
    beats: [
      {
        sagen: `Ich wollte das jetzt nicht einfach behaupten und Ihnen was verkaufen. Deshalb hab ich mir erlaubt, Ihnen das mal zu bauen.`,
        danach: "Weiterreden.",
      },
      {
        sagen: `Ein fertiger Entwurf für ${ctx.companyName}, mit Ihrem Namen drauf, sauber am Handy bedienbar. Das kostet Sie nichts und Sie sind zu nichts verpflichtet — ich zeig Ihnen einfach, wie es aussehen könnte.`,
        danach: "Kurz warten.",
      },
    ],
  });

  abschnitte.push({
    titel: "Die Bitte — hier entscheidet sich alles",
    beats: [
      {
        sagen: `Darf ich Ihnen den Link schicken? Sie schauen in einer ruhigen Minute drauf, und wenn es nichts für Sie ist, sagen Sie mir das einfach — dann ist gut.`,
        danach: "Warten. Nicht nachschieben, nicht rechtfertigen.",
        hinweis:
          "Ein Ja hier ist zugleich die Einwilligung, ihm anschließend schreiben zu dürfen. Ohne dieses Ja keine Mail.",
      },
      {
        sagen: `Lieber per WhatsApp oder per E-Mail?`,
        danach: "Nummer oder Adresse notieren und laut wiederholen.",
        hinweis: "Die Wahl zwischen zwei Ja-Varianten, nicht zwischen Ja und Nein.",
      },
      {
        sagen: `Super, dann haben Sie das gleich. Wenn es Ihnen gefällt, melden Sie sich einfach bei mir — und wenn nicht, hören Sie nichts mehr von mir. Versprochen.`,
        danach: "Freundlich auflegen.",
        hinweis: 'Das Versprechen, sich sonst nicht mehr zu melden, nimmt den Druck raus und wird erstaunlich oft belohnt.',
      },
    ],
  });

  const einwaende: CallScript["einwaende"] = [
    {
      einwand: "Ich hab gerade keine Zeit.",
      antwort: `Verstehe ich völlig, ich halte Sie auch gar nicht auf. Ich schick Ihnen einfach den Link, dann schauen Sie, wann es Ihnen passt. Auf welche Nummer darf ich?`,
    },
    {
      einwand: "Wir haben schon eine Website.",
      antwort: `Ja, die hab ich gesehen — genau deswegen ruf ich ja an. Schauen Sie sich den Entwurf einmal an, und wenn Sie keinen Unterschied sehen, dann lassen wir's. Das ist ja kein Drama.`,
    },
    {
      einwand: "Was kostet das denn?",
      antwort: `Der Entwurf kostet Sie gar nichts, den kriegen Sie einfach so. Über Geld reden wir frühestens, wenn Ihnen gefällt, was Sie da sehen — und auch dann nur, wenn Sie wollen.`,
    },
    {
      einwand: "Schicken Sie mir einfach eine E-Mail.",
      antwort: `Mach ich gern. An welche Adresse denn am besten? … Und darf ich mich in drei, vier Tagen nochmal ganz kurz melden und fragen, ob Sie reingeschaut haben?`,
    },
    {
      einwand: "Wir sind zufrieden, brauchen nichts.",
      antwort: `Das freut mich ehrlich. Dann schauen Sie einfach mal drauf — wenn Sie danach immer noch sagen, passt alles, dann haben Sie ja die Bestätigung. Und ich bin weg.`,
    },
    {
      einwand: "Kein Interesse.",
      antwort: `Alles gut, dann will ich Sie gar nicht weiter stören. Danke für Ihre Zeit und einen schönen Tag noch.`,
    },
    {
      einwand: "Wer sind Sie nochmal? Woher haben Sie meine Nummer?",
      antwort: `${name}, ich baue Websites hier in der Region. Ihre Nummer steht öffentlich auf Ihrer eigenen Seite beziehungsweise im Branchenverzeichnis — ich hab da nichts Geheimes.`,
    },
  ];

  const danach = [
    ctx.demoUrl
      ? `Link sofort rausschicken, solange das Gespräch noch frisch ist: ${ctx.demoUrl}`
      : `Demo zuerst veröffentlichen („Öffentlich bereitstellen“) — dann liegt der Entwurf mit dem Link fertig in Gmail.`,
    `Ergebnis hier eintragen — auch ein „nicht erreicht“. Ohne das weiß niemand, was wirkt.`,
    `Bei Zusage: in drei bis vier Tagen kurz nachfassen, ob er reingeschaut hat.`,
  ];

  return {
    abschnitte,
    beleg: observation?.detail ?? null,
    ohneBefund: !observation,
    einwaende,
    danach,
  };
}

/** The whole script as one block of text, for printing or reading off a
 * second screen. */
export function callScriptAsText(script: CallScript): string {
  const lines: string[] = [];
  for (const abschnitt of script.abschnitte) {
    lines.push(`— ${abschnitt.titel.toUpperCase()} —`);
    for (const beat of abschnitt.beats) {
      lines.push(beat.sagen);
      if (beat.danach) lines.push(`   [${beat.danach}]`);
      if (beat.hinweis) lines.push(`   (nicht vorlesen: ${beat.hinweis})`);
      lines.push("");
    }
  }
  if (script.beleg) lines.push(`(Beleg für die Beobachtung, nicht vorlesen: ${script.beleg})`, "");
  lines.push("— WENN ER BREMST —");
  for (const e of script.einwaende) lines.push(`„${e.einwand}“`, `  → ${e.antwort}`);
  lines.push("", "— NACH DEM GESPRÄCH —", ...script.danach);
  const signature = buildSignature();
  if (signature) lines.push("", "— WER ANRUFT —", signature);
  return lines.join("\n");
}
