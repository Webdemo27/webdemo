import type { CheerioAPI } from "cheerio";
import type { AnalysisDimension } from "../types";
import type { FetchedPage } from "./fetch-page";

function dim(score: number | null, verifiable: boolean, ...notes: string[]): AnalysisDimension {
  return { score: score == null ? null : Math.round(score), verifiable, notes };
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

const CTA_KEYWORDS =
  /kontakt(ieren)?|anrufen|termin|anfrage|jetzt buchen|bestellen|angebot|reservieren|beratung/i;
const TESTIMONIAL_KEYWORDS = /bewertung|kunden (sagen|meinen)|erfahrungen|referenz(en)?|testimonial/i;

export function checkMobileUx($: CheerioAPI): AnalysisDimension {
  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport) {
    return dim(10, true, "Kein Viewport-Meta-Tag gefunden — Seite ist auf Mobilgeräten sehr wahrscheinlich nicht nutzbar.");
  }
  if (/width\s*=\s*device-width/i.test(viewport)) {
    return dim(75, true, "Viewport-Tag korrekt gesetzt (Grundvoraussetzung für responsives Design erfüllt).");
  }
  return dim(45, true, "Viewport-Tag vorhanden, aber ungewöhnlich konfiguriert.");
}

export function checkNavigation($: CheerioAPI): AnalysisDimension {
  const hasNavElement = $("nav").length > 0;
  const linkCount = $("a").length;

  if (linkCount === 0) {
    return dim(15, true, "Keine Links auf der Seite gefunden.");
  }
  if (!hasNavElement && linkCount < 3) {
    return dim(30, true, "Keine erkennbare Navigation, sehr wenige Links.");
  }
  if (hasNavElement) {
    return dim(70, true, `Semantisches <nav>-Element vorhanden, ${linkCount} Links insgesamt.`);
  }
  return dim(50, true, `Keine <nav>-Struktur, aber ${linkCount} Links vorhanden.`);
}

export function checkPerformance(page: FetchedPage): AnalysisDimension {
  const sizeKb = page.sizeBytes / 1024;
  let score = 100;
  if (page.fetchMs > 3000) score -= 30;
  else if (page.fetchMs > 1500) score -= 15;
  if (sizeKb > 1000) score -= 30;
  else if (sizeKb > 400) score -= 15;

  return dim(
    clamp(score),
    true,
    `Antwortzeit ${page.fetchMs}ms, HTML-Größe ${sizeKb.toFixed(0)}KB (vereinfachte Messung, kein vollständiger Performance-Audit).`
  );
}

export function checkContent($: CheerioAPI): AnalysisDimension {
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text.length === 0 ? 0 : text.split(" ").length;
  const h1Count = $("h1").length;

  let score = 30;
  if (wordCount > 400) score = 70;
  else if (wordCount > 150) score = 50;
  if (h1Count === 1) score += 10;
  else if (h1Count === 0) score -= 10;

  return dim(
    clamp(score),
    true,
    `${wordCount} Wörter sichtbarer Text, ${h1Count} H1-Überschrift(en).`
  );
}

export function checkCta($: CheerioAPI): AnalysisDimension {
  const telLinks = $('a[href^="tel:"]').length;
  const mailLinks = $('a[href^="mailto:"]').length;
  const buttons = $('button, a.button, a.btn, .btn, input[type="submit"]').length;

  let ctaTextMatches = 0;
  $("a, button").each((_, el) => {
    const text = $(el).text();
    if (CTA_KEYWORDS.test(text)) ctaTextMatches += 1;
  });

  const signals = telLinks + mailLinks + buttons + ctaTextMatches;
  if (signals === 0) {
    return dim(10, true, "Kein Call-to-Action, keine Telefon-/Mail-Links gefunden.");
  }
  if (signals <= 2) {
    return dim(45, true, `Schwacher Call-to-Action (${signals} Signal(e) gefunden).`);
  }
  return dim(80, true, `Klarer Call-to-Action vorhanden (${signals} Signale: Buttons/Tel/Mail/CTA-Text).`);
}

export function checkTrust($: CheerioAPI, page: FetchedPage): AnalysisDimension {
  const bodyText = $("body").text();
  const hasImpressum = $("a").filter((_, el) => /impressum/i.test($(el).text() + ($(el).attr("href") ?? ""))).length > 0;
  const hasDatenschutz = $("a").filter((_, el) => /datenschutz/i.test($(el).text() + ($(el).attr("href") ?? ""))).length > 0;
  const hasTestimonials = TESTIMONIAL_KEYWORDS.test(bodyText);

  const notes: string[] = [];
  let score = 40;

  if (page.https) {
    score += 15;
  } else {
    score -= 20;
    notes.push("Keine HTTPS-Verschlüsselung.");
  }

  if (hasImpressum) {
    score += 20;
    notes.push("Impressum-Link gefunden.");
  } else {
    score -= 15;
    notes.push("Kein Impressum-Link gefunden (in Deutschland gesetzlich vorgeschrieben).");
  }

  if (hasDatenschutz) {
    score += 10;
  } else {
    notes.push("Kein Datenschutz-Link gefunden.");
  }

  if (hasTestimonials) {
    score += 10;
    notes.push("Bewertungen/Referenzen im Text erwähnt.");
  }

  return dim(clamp(score), true, ...notes);
}

export function checkContactExperience($: CheerioAPI): AnalysisDimension {
  const hasForm = $("form").length > 0;
  const telLinks = $('a[href^="tel:"]').length;
  const mailLinks = $('a[href^="mailto:"]').length;
  const hasMapEmbed =
    $('iframe[src*="maps"]').length > 0 || $('iframe[src*="openstreetmap"]').length > 0;

  let score = 20;
  const notes: string[] = [];
  if (hasForm) {
    score += 35;
    notes.push("Kontaktformular vorhanden.");
  } else {
    notes.push("Kein Kontaktformular gefunden.");
  }
  if (telLinks > 0) score += 20;
  if (mailLinks > 0) score += 15;
  if (hasMapEmbed) {
    score += 10;
    notes.push("Kartenintegration vorhanden.");
  }

  return dim(clamp(score), true, ...notes);
}

export function checkAccessibility($: CheerioAPI): AnalysisDimension {
  const images = $("img");
  const withAlt = images.filter((_, el) => Boolean($(el).attr("alt")?.trim())).length;
  const altRatio = images.length === 0 ? 1 : withAlt / images.length;
  const lang = $("html").attr("lang");
  const hasH1 = $("h1").length > 0;

  let score = 40;
  const notes: string[] = [`Vereinfachte Prüfung, kein vollständiger Accessibility-Audit.`];

  if (images.length > 0) {
    score += Math.round(altRatio * 30);
    notes.push(`${withAlt}/${images.length} Bilder mit Alt-Text.`);
  } else {
    score += 10;
  }

  if (lang) score += 15;
  else notes.push("Kein lang-Attribut auf <html>.");

  if (hasH1) score += 15;

  return dim(clamp(score), true, ...notes);
}

/** Design quality can't be reliably judged from raw HTML alone without a
 * rendered screenshot — only flag it when there's a strong, unambiguous
 * structural signal (deprecated markup). Otherwise mark not verifiable
 * rather than guess. */
export function checkDesign($: CheerioAPI): AnalysisDimension {
  const deprecatedTags = $("font, center, marquee, blink").length;
  const heavyTableLayout = $("table").length >= 4 && $("table td table").length > 0;

  if (deprecatedTags > 0 || heavyTableLayout) {
    return dim(
      15,
      true,
      "Veraltete HTML-Elemente oder tabellenbasiertes Layout gefunden — deutliches Zeichen für ein sehr altes Design."
    );
  }

  return dim(
    null,
    false,
    "Visuelle Designqualität kann automatisiert nicht zuverlässig bewertet werden (erfordert Screenshot bzw. manuelle Prüfung)."
  );
}

export function computeConversionPotential(dims: {
  cta: AnalysisDimension;
  contactExperience: AnalysisDimension;
  content: AnalysisDimension;
  trust: AnalysisDimension;
}): AnalysisDimension {
  const weighted: Array<[AnalysisDimension, number]> = [
    [dims.cta, 0.35],
    [dims.contactExperience, 0.25],
    [dims.content, 0.2],
    [dims.trust, 0.2],
  ];

  const usable = weighted.filter(([d]) => d.verifiable && d.score != null);
  if (usable.length === 0) {
    return dim(null, false, "Zu wenige verifizierbare Signale für eine Einschätzung.");
  }

  const totalWeight = usable.reduce((sum, [, w]) => sum + w, 0);
  const score = usable.reduce((sum, [d, w]) => sum + (d.score as number) * (w / totalWeight), 0);

  return dim(
    score,
    true,
    "Abgeleitet aus CTA, Kontaktmöglichkeit, Content und Trust (gewichteter Durchschnitt)."
  );
}
