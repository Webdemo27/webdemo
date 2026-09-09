export interface LeadColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

export interface LeadTypography {
  heading: string;
  body: string;
  googleFontsHref: string;
}

export interface LeadService {
  label: string;
  image: string;
}

/** One lead's real content, produced by the existing Next.js pipeline
 * (research → analysis → visual profile) — this app never invents
 * anything, it only renders whatever this JSON says. Served from
 * /data/<slug>.json (see public/data/kp21.json for a real example built
 * from an actual lead's data). */
export interface LeadData {
  slug: string;
  companyName: string;
  industry: string;
  location: string;
  address: string;
  contactEmail: string;
  tagline: string;
  colors: LeadColors;
  typography: LeadTypography;
  heroImage: string;
  services: LeadService[];
}
