import { prisma, createLeadIfNew, saveWebsiteAnalysis, saveLeadScore } from "../src/lib/db";
import type { WebsiteAnalysisData } from "../src/lib/types";

function dim(score: number | null, verifiable: boolean, ...notes: string[]) {
  return { score, verifiable, notes };
}

async function main() {
  // Lead 1: full pipeline, waiting for review (exercises every dashboard state)
  const { lead: bakery } = await createLeadIfNew({
    companyName: "Bäckerei Vogel",
    industry: "Bäckerei",
    location: "Frankfurt am Main",
    website: "https://baeckerei-vogel-example.de",
    address: "Musterstraße 12, 60313 Frankfurt am Main",
    contactPhone: "+49 69 1234567",
    source: "seed",
  });

  const analysis: WebsiteAnalysisData = {
    design: dim(28, true, "Layout wirkt wie eine Vorlage aus 2012, kein einheitliches Farbschema."),
    mobileUx: dim(15, true, "Nicht responsive, horizontales Scrollen auf Mobilgeräten nötig."),
    navigation: dim(40, true, "Nur 3 Menüpunkte, keine klare Struktur für Sortiment/Öffnungszeiten."),
    performance: dim(35, true, "Ladezeit ca. 4.8s (unkomprimierte Bilder)."),
    content: dim(50, true, "Öffnungszeiten vorhanden, aber kein Sortiment oder Angebote sichtbar."),
    cta: dim(10, true, "Kein Call-to-Action, keine Kontaktaufforderung auffindbar."),
    trust: dim(null, false, "Keine Bewertungen oder Gütesiegel auf der Seite verlinkt — nicht zuverlässig prüfbar."),
    contactExperience: dim(30, true, "Nur Telefonnummer als Bild eingebettet, kein Kontaktformular."),
    accessibility: dim(20, true, "Kein Alt-Text bei Bildern, geringer Kontrast bei Fließtext."),
    conversionPotential: dim(70, true, "Hohe Kundenfrequenz laut Standort, aber Website verhindert Online-Anfragen."),
    strengths: ["Guter, zentraler Standort", "Langjährig etabliertes Geschäft"],
    weaknesses: ["Nicht mobilfähig", "Kein Call-to-Action", "Veraltetes Design"],
    opportunities: ["Online-Bestellung für Torten/Sonderanfertigungen", "Google-Maps-Einbindung mit Bewertungen"],
    rawSignals: { httpsOnly: true, viewportMetaPresent: false, htmlSizeKb: 340 },
  };

  await saveWebsiteAnalysis(bakery.id, analysis, 32);
  await saveLeadScore(bakery.id, 82, [
    { factor: "Mobile UX sehr schwach", weight: 0.3, contribution: 25, detail: "Kein responsives Layout" },
    { factor: "Kein CTA", weight: 0.2, contribution: 18, detail: "Keine Handlungsaufforderung" },
    { factor: "Hohes Conversion-Potenzial", weight: 0.2, contribution: 15, detail: "Guter Standort, aber ungenutzt" },
  ]);

  await prisma.lead.update({ where: { id: bakery.id }, data: { status: "QUALIFIED" } });

  const demo = await prisma.demo.create({
    data: {
      leadId: bakery.id,
      slug: "baeckerei-vogel",
      templateKey: "local-service-v1",
      outputDir: "public/demos/baeckerei-vogel",
      placeholders: { phone: "verify", email: "placeholder" },
    },
  });
  await prisma.lead.update({ where: { id: bakery.id }, data: { status: "DEMO_CREATED" } });

  await prisma.message.create({
    data: {
      leadId: bakery.id,
      subject: "Kurze Idee für die Website von Bäckerei Vogel",
      body: `Hallo,\n\nich bin auf die Website der Bäckerei Vogel gestoßen und habe mir erlaubt, ein kurzes, unverbindliches Demo-Konzept zu erstellen, wie ein moderner, mobilfreundlicher Auftritt aussehen könnte: [Demo-Link]\n\nFalls das interessant ist, können wir gerne kurz telefonieren.\n\nBeste Grüße`,
    },
  });
  await prisma.lead.update({ where: { id: bakery.id }, data: { status: "WAITING_FOR_REVIEW" } });

  await prisma.activityLog.createMany({
    data: [
      { leadId: bakery.id, type: "DEMO_CREATED", message: "Demo-Website erstellt (local-service-v1)" },
      { leadId: bakery.id, type: "MESSAGE_DRAFTED", message: "Nachrichtenentwurf erstellt" },
    ],
  });

  // Lead 2: brand new, nothing processed yet (exercises empty states)
  await createLeadIfNew({
    companyName: "Rechtsanwaltskanzlei Berger",
    industry: "Rechtsberatung",
    location: "Offenbach",
    website: "https://kanzlei-berger-example.de",
    source: "seed",
  });

  console.log("Seed complete:", { demoSlug: demo.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
