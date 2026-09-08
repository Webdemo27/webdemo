import type { VisualProfile } from "./types";

const FONT = {
  hospitality: {
    heading: "Playfair Display SC",
    body: "Karla",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Karla:wght@300;400;500;600;700&family=Playfair+Display+SC:wght@400;700&display=swap",
  },
  healthcare: {
    heading: "Lexend",
    body: "Source Sans 3",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
  },
  professional: {
    heading: "EB Garamond",
    body: "Lato",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap",
  },
  elegant: {
    heading: "Playfair Display",
    body: "Inter",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap",
  },
  luxury: {
    heading: "Cinzel",
    body: "Josefin Sans",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Josefin+Sans:wght@300;400;500;600;700&display=swap",
  },
  active: {
    heading: "Barlow Condensed",
    body: "Barlow",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap",
  },
} as const;

/** Base creative direction per business cluster, sourced from UI/UX Pro
 * Max `--design-system` lookups (real palettes/typography, not invented)
 * and adapted per specific trade below. `assetPlan` is a starting point —
 * the asset pipeline may shrink it if fewer real images are available,
 * never invents beyond what's planned. */
export const VISUAL_PROFILES: Record<string, VisualProfile> = {
  Bäckerei: {
    industryKey: "Bäckerei",
    targetAudience: "Stammkundschaft und Laufkundschaft im Stadtteil, alle Altersgruppen",
    brandImpression: "warm, handwerklich, einladend",
    artDirection: "Warme, natürliche Nahaufnahmen von Backwaren und Handwerk, weiches Licht",
    imageryStyle: "Warme Food-Fotografie, natürliches Licht, handwerkliche Details",
    layoutDirection: "editorial-asymmetric",
    motion: "subtle",
    use3d: false,
    colors: {
      primary: "#92400E",
      primaryDark: "#78350F",
      secondary: "#B45309",
      accent: "#92400E",
      background: "#FFFBEB",
      foreground: "#78350F",
      card: "#FFFFFF",
      muted: "#FEF3C7",
      border: "#FDE68A",
      mode: "light",
    },
    typography: { ...FONT.hospitality, mood: "warm, handwerklich, einladend" },
    avoid: ["kalte Studio-Optik", "generische Stockfotos", "AI-Lila-Verläufe"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "service", count: 3, aspectRatio: "4:3" },
      { role: "editorial", count: 2, aspectRatio: "3:2" },
      { role: "detail", count: 1, aspectRatio: "1:1" },
    ],
  },

  Restaurant: {
    industryKey: "Restaurant",
    targetAudience: "Gäste für Mittagstisch, Abendessen und Anlässe",
    brandImpression: "einladend, appetitlich, gastfreundlich",
    artDirection: "Stimmungsvolle Gastro-Fotografie, warmes Ambiente-Licht",
    imageryStyle: "Appetitliche Nahaufnahmen, warme Innenraumatmosphäre",
    layoutDirection: "editorial-asymmetric",
    motion: "subtle",
    use3d: false,
    colors: {
      primary: "#92400E",
      primaryDark: "#78350F",
      secondary: "#B45309",
      accent: "#B45309",
      background: "#FFFBEB",
      foreground: "#451A03",
      card: "#FFFFFF",
      muted: "#FEF3C7",
      border: "#FDE68A",
      mode: "light",
    },
    typography: { ...FONT.hospitality, mood: "gastfreundlich, appetitlich" },
    avoid: ["schlechte Food-Fotos", "versteckte Öffnungszeiten", "AI-Lila-Verläufe"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "service", count: 3, aspectRatio: "4:3" },
      { role: "editorial", count: 2, aspectRatio: "3:2" },
      { role: "detail", count: 1, aspectRatio: "1:1" },
    ],
  },

  Café: {
    industryKey: "Café",
    targetAudience: "Gäste für Frühstück, Kaffeepause und Treffen",
    brandImpression: "gemütlich, freundlich, unaufgeregt",
    artDirection: "Weiches Licht, ruhige Kaffeehaus-Atmosphäre",
    imageryStyle: "Warme, ruhige Food- und Ambiente-Fotografie",
    layoutDirection: "editorial-asymmetric",
    motion: "subtle",
    use3d: false,
    colors: {
      primary: "#92400E",
      primaryDark: "#78350F",
      secondary: "#B45309",
      accent: "#78350F",
      background: "#FDF8F0",
      foreground: "#57310C",
      card: "#FFFFFF",
      muted: "#F3E7D3",
      border: "#EAD9B8",
      mode: "light",
    },
    typography: { ...FONT.hospitality, mood: "gemütlich, ruhig" },
    avoid: ["kalte Optik", "generische Stockfotos"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "service", count: 3, aspectRatio: "4:3" },
      { role: "editorial", count: 1, aspectRatio: "3:2" },
      { role: "detail", count: 1, aspectRatio: "1:1" },
    ],
  },

  Zahnarzt: healthcareProfile("Zahnarzt", "Patient:innen aller Altersgruppen in der Umgebung", "#0891B2"),
  Arztpraxis: healthcareProfile("Arztpraxis", "Patient:innen der Region", "#0891B2"),
  Physiotherapie: healthcareProfile(
    "Physiotherapie",
    "Patient:innen mit Reha- und Bewegungsbedarf",
    "#0D9488"
  ),
  Tierarzt: healthcareProfile("Tierarzt", "Tierhalter:innen der Region", "#0D9488"),

  Rechtsanwalt: professionalProfile(
    "Rechtsanwalt",
    "Privat- und Geschäftskund:innen mit Rechtsbedarf",
    "#1E3A8A"
  ),
  Steuerberater: professionalProfile(
    "Steuerberater",
    "Privatpersonen und kleine Unternehmen",
    "#1E3A8A"
  ),

  Friseur: elegantProfile("Friseur", "Kund:innen, die Wert auf Stil legen", "#9D174D", "#701147"),
  Blumenladen: elegantProfile("Blumenladen", "Privat- und Anlasskund:innen", "#166534", "#0F4023"),

  Immobilienmakler: luxuryProfile(
    "Immobilienmakler",
    "Käufer:innen, Verkäufer:innen und Kapitalanleger",
    true
  ),
  Hotel: luxuryProfile("Hotel", "Reisende und Gäste der Region", true),

  Fahrradladen: activeProfile("Fahrradladen", "Radsportler:innen und Alltagsradler:innen", "#F97316", false),
  Autowerkstatt: activeProfile(
    "Autowerkstatt",
    "Fahrzeughalter:innen der Region",
    "#DC2626",
    true
  ),
};

function healthcareProfile(key: string, audience: string, accent: string): VisualProfile {
  return {
    industryKey: key,
    targetAudience: audience,
    brandImpression: "vertrauensvoll, ruhig, kompetent",
    artDirection: "Klare, freundliche Praxisfotografie, viel Weißraum, beruhigende Farben",
    imageryStyle: "Helle, klare Aufnahmen von Praxisräumen und Behandlungsbereichen",
    layoutDirection: "grid-clean",
    motion: "subtle",
    use3d: false,
    colors: {
      primary: accent,
      primaryDark: "#164E63",
      secondary: "#22D3EE",
      accent: "#059669",
      background: "#F0FBFC",
      foreground: "#164E63",
      card: "#FFFFFF",
      muted: "#E8F1F6",
      border: "#A5F3FC",
      mode: "light",
    },
    typography: { ...FONT.healthcare, mood: "vertrauensvoll, ruhig, kompetent" },
    avoid: ["Motion-lastige Animationen", "AI-Lila-/Pink-Verläufe", "grelle Neonfarben"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "service", count: 3, aspectRatio: "4:3" },
      { role: "environment", count: 1, aspectRatio: "3:2" },
      { role: "detail", count: 1, aspectRatio: "1:1" },
    ],
  };
}

function professionalProfile(key: string, audience: string, primary: string): VisualProfile {
  return {
    industryKey: key,
    targetAudience: audience,
    brandImpression: "seriös, autoritär, vertrauenswürdig",
    artDirection: "Zurückhaltend, wenige aber bewusst gesetzte Bilder, viel Typografie",
    imageryStyle: "Architektonische/abstrakte Motive statt Personenfotos, ruhige Kompositionen",
    layoutDirection: "grid-clean",
    motion: "none",
    use3d: false,
    colors: {
      primary,
      primaryDark: "#0F172A",
      secondary: "#1E40AF",
      accent: "#B45309",
      background: "#F8FAFC",
      foreground: "#0F172A",
      card: "#FFFFFF",
      muted: "#E9EEF5",
      border: "#CBD5E1",
      mode: "light",
    },
    typography: { ...FONT.professional, mood: "seriös, formal, vertrauenswürdig" },
    avoid: ["veraltetes Design", "verstecke Qualifikationen", "AI-Lila-Verläufe"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "editorial", count: 2, aspectRatio: "3:2" },
      { role: "detail", count: 1, aspectRatio: "1:1" },
    ],
  };
}

function elegantProfile(key: string, audience: string, primary: string, primaryDark: string): VisualProfile {
  return {
    industryKey: key,
    targetAudience: audience,
    brandImpression: "elegant, hochwertig, zeitlos",
    artDirection: "Editorial-Fotografie, viel Weißraum, feine Details",
    imageryStyle: "Elegante Detailaufnahmen, weiches natürliches Licht",
    layoutDirection: "editorial-asymmetric",
    motion: "subtle",
    use3d: false,
    colors: {
      primary,
      primaryDark,
      secondary: "#F9A8D4",
      accent: "#C9A227",
      background: "#FBFAF8",
      foreground: "#1F2937",
      card: "#FFFFFF",
      muted: "#F3EEEA",
      border: "#E7E0D8",
      mode: "light",
    },
    typography: { ...FONT.elegant, mood: "elegant, luxuriös, zeitlos" },
    avoid: ["grelle Neonfarben", "harte Animationen", "generische Stockfotos"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "service", count: 3, aspectRatio: "4:3" },
      { role: "editorial", count: 2, aspectRatio: "3:2" },
      { role: "detail", count: 2, aspectRatio: "1:1" },
    ],
  };
}

function luxuryProfile(key: string, audience: string, use3d: boolean): VisualProfile {
  return {
    industryKey: key,
    targetAudience: audience,
    brandImpression: "exklusiv, hochwertig, zurückhaltend selbstbewusst",
    artDirection: "Großformatige, ruhige Bildkompositionen, viel Schwarz/Gold, wenig Text pro Screen",
    imageryStyle: "Architektonische Weitwinkelaufnahmen, gezielte Detailaufnahmen",
    layoutDirection: "immersive-storytelling",
    motion: "standard",
    use3d,
    colors: {
      primary: "#1C1917",
      primaryDark: "#0C0A09",
      secondary: "#44403C",
      accent: "#A16207",
      background: "#FAFAF9",
      foreground: "#0C0A09",
      card: "#FFFFFF",
      muted: "#EFEDEA",
      border: "#D6D3D1",
      mode: "light",
    },
    typography: { ...FONT.luxury, mood: "exklusiv, elegant, selbstbewusst" },
    avoid: ["billig wirkende Bilder", "hektische Animationen", "generische Templates"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "21:9" },
      { role: "editorial", count: 3, aspectRatio: "3:2" },
      { role: "detail", count: 2, aspectRatio: "1:1" },
      { role: "environment", count: 1, aspectRatio: "16:9" },
    ],
  };
}

function activeProfile(
  key: string,
  audience: string,
  primary: string,
  use3d: boolean
): VisualProfile {
  return {
    industryKey: key,
    targetAudience: audience,
    brandImpression: "energiegeladen, kompetent, bodenständig",
    artDirection: "Dynamische, technische Nahaufnahmen, kräftige Farben",
    imageryStyle: "Technische Detailaufnahmen, Werkstatt-/Produktatmosphäre",
    layoutDirection: "bold-blocks",
    motion: "subtle",
    use3d,
    colors: {
      primary,
      primaryDark: "#7C2D12",
      secondary: "#FB923C",
      accent: "#16A34A",
      background: "#F8FAFC",
      foreground: "#0F172A",
      card: "#FFFFFF",
      muted: "#F1F5F9",
      border: "#E2E8F0",
      mode: "light",
    },
    typography: { ...FONT.active, mood: "energetisch, bodenständig, kompetent" },
    avoid: ["statisches Design", "generische Stockfotos"],
    assetPlan: [
      { role: "hero", count: 1, aspectRatio: "16:9" },
      { role: "service", count: 3, aspectRatio: "4:3" },
      { role: "detail", count: 2, aspectRatio: "1:1" },
    ],
  };
}

const DEFAULT_PROFILE: VisualProfile = professionalProfile(
  "Allgemein",
  "Lokale Kundschaft",
  "#2563EB"
);

export function getVisualProfile(industry: string | null | undefined): VisualProfile {
  if (!industry) return DEFAULT_PROFILE;
  return VISUAL_PROFILES[industry] ?? DEFAULT_PROFILE;
}
