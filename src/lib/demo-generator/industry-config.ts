/** Industry-level (not company-specific) visual and copy configuration.
 * Service labels are generic categories for the trade, never invented
 * facts about the actual business — they exist so the demo reads as a
 * finished concept instead of an empty template. */
export interface IndustryConfig {
  accent: string;
  accentDark: string;
  tagline: string;
  services: string[];
}

const DEFAULT_CONFIG: IndustryConfig = {
  accent: "#2563eb",
  accentDark: "#1d4ed8",
  tagline: "Ihr kompetenter Partner in {location}",
  services: ["Beratung", "Service vor Ort", "Persönlicher Kontakt"],
};

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  Bäckerei: {
    accent: "#b3672c",
    accentDark: "#8a4e20",
    tagline: "Frisch gebacken, jeden Morgen in {location}",
    services: ["Brot & Brötchen", "Kuchen & Torten", "Kaffee & Snacks"],
  },
  Restaurant: {
    accent: "#a13d2c",
    accentDark: "#7c2e21",
    tagline: "Kulinarische Momente in {location}",
    services: ["Mittagstisch", "À la carte", "Feiern & Events"],
  },
  Café: {
    accent: "#8a5a3c",
    accentDark: "#6b432c",
    tagline: "Kaffeezeit in {location}",
    services: ["Kaffeespezialitäten", "Frühstück", "Kuchenauswahl"],
  },
  Friseur: {
    accent: "#a3336b",
    accentDark: "#7c2652",
    tagline: "Ihr Look, neu gedacht — in {location}",
    services: ["Haarschnitt & Styling", "Farbe & Strähnen", "Beratung"],
  },
  Zahnarzt: {
    accent: "#1f7a6c",
    accentDark: "#175f54",
    tagline: "Zahngesundheit in guten Händen in {location}",
    services: ["Vorsorge", "Ästhetische Zahnheilkunde", "Notfalltermine"],
  },
  Arztpraxis: {
    accent: "#1f6f7a",
    accentDark: "#17565f",
    tagline: "Medizinische Versorgung in {location}",
    services: ["Allgemeine Sprechstunde", "Vorsorgeuntersuchungen", "Terminvereinbarung"],
  },
  Rechtsanwalt: {
    accent: "#334155",
    accentDark: "#1e293b",
    tagline: "Rechtsberatung mit Weitblick in {location}",
    services: ["Erstberatung", "Vertretung", "Vertragsprüfung"],
  },
  Steuerberater: {
    accent: "#3f5f8a",
    accentDark: "#31496b",
    tagline: "Zahlen im Griff — Steuerberatung in {location}",
    services: ["Steuererklärung", "Buchhaltung", "Unternehmensberatung"],
  },
  Physiotherapie: {
    accent: "#2a7a4f",
    accentDark: "#1f5e3c",
    tagline: "Beweglich bleiben in {location}",
    services: ["Krankengymnastik", "Massage", "Rehatraining"],
  },
  Blumenladen: {
    accent: "#5a8a3c",
    accentDark: "#456b2c",
    tagline: "Blumige Grüße aus {location}",
    services: ["Sträuße & Gestecke", "Hochzeitsfloristik", "Trauerfloristik"],
  },
  Fahrradladen: {
    accent: "#2c6b8a",
    accentDark: "#20516b",
    tagline: "Auf zwei Rädern durch {location}",
    services: ["Verkauf", "Reparatur & Service", "Zubehör"],
  },
  Autowerkstatt: {
    accent: "#455566",
    accentDark: "#33404d",
    tagline: "Zuverlässig unterwegs — Werkstatt in {location}",
    services: ["Inspektion", "Reparatur", "Reifenservice"],
  },
  Immobilienmakler: {
    accent: "#8a7a3c",
    accentDark: "#6b5e2c",
    tagline: "Zuhause finden in {location}",
    services: ["Verkauf", "Vermietung", "Immobilienbewertung"],
  },
  Hotel: {
    accent: "#6b3c8a",
    accentDark: "#512c6b",
    tagline: "Willkommen in {location}",
    services: ["Zimmer & Suiten", "Frühstück", "Veranstaltungen"],
  },
  Tierarzt: {
    accent: "#2c8a6f",
    accentDark: "#206b55",
    tagline: "Tiermedizinische Betreuung in {location}",
    services: ["Sprechstunde", "Vorsorge", "Notfallversorgung"],
  },
};

export function getIndustryConfig(industry: string | null | undefined): IndustryConfig {
  if (!industry) return DEFAULT_CONFIG;
  return INDUSTRY_CONFIGS[industry] ?? DEFAULT_CONFIG;
}
