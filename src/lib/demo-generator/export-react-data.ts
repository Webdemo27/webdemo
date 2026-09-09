import { promises as fs } from "fs";
import path from "path";
import { prisma } from "../db";
import { fromJson } from "../db/json";
import type { VisualProfile } from "../visual-director/types";
import { taglineFor, deriveServiceLabels, buildAboutText, buildBrandPromise, secondaryPageLabel } from "./template";
import { toAssetView, groupByRole } from "./asset-view";

const REACT_APP_DATA_DIR = path.join(process.cwd(), "demo-app", "public", "data");

/**
 * Bridges the real pipeline (research → analysis → visual profile →
 * asset generation, all in the existing static-HTML engine) into the
 * new Vite/React/WebGL demo-app (see demo-app/README and the commit
 * that introduced it) — reads whatever `generateDemo()` already
 * produced for a lead and writes it out as demo-app's LeadData JSON
 * shape plus the real image files it references. Never generates new
 * content itself: this is purely a format conversion of already-real
 * data, so it can be re-run any time the static demo is regenerated
 * without duplicating any business logic (tagline/service-label
 * derivation is imported from template.ts, not reimplemented).
 *
 * The two engines coexist deliberately — this does not replace or
 * modify anything the static engine writes under public/demos/<slug>/.
 */
export async function exportLeadDataForReactApp(leadId: string): Promise<{ slug: string }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead nicht gefunden.");

  const demo = await prisma.demo.findUnique({ where: { leadId } });
  if (!demo) throw new Error("Für diesen Lead existiert noch keine Demo — zuerst im Dashboard erstellen.");

  const profile = fromJson<VisualProfile>(demo.visualProfile);
  if (!profile) throw new Error("Visual-Profile der Demo konnte nicht gelesen werden.");

  const assetRows = await prisma.demoAsset.findMany({ where: { demoId: demo.id }, orderBy: { order: "asc" } });
  const assets = assetRows.map((a) =>
    toAssetView({
      role: a.role,
      altText: a.altText,
      aspectRatio: a.aspectRatio,
      width: a.width,
      height: a.height,
      localPath: a.localPath,
      formats: a.formats ? fromJson(a.formats) : undefined,
    })
  );
  const byRole = groupByRole(assets);

  const slug = demo.slug;
  const outDir = path.join(REACT_APP_DATA_DIR, slug);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const sourceAssetsDir = path.join(process.cwd(), "public", "demos", slug, "assets");

  async function copyAsset(assetSrc: string | undefined, destName: string): Promise<string | null> {
    if (!assetSrc) return null;
    const sourcePath = path.join(sourceAssetsDir, path.basename(assetSrc));
    const ext = path.extname(sourcePath) || ".webp";
    const destFile = `${destName}${ext}`;
    await fs.copyFile(sourcePath, path.join(outDir, destFile));
    return `/data/${slug}/${destFile}`;
  }

  const heroImage = await copyAsset(byRole.hero?.[0]?.src, "hero");

  const serviceLabels = deriveServiceLabels(profile);
  const serviceAssets = byRole.service ?? [];
  const services: Array<{ label: string; image: string }> = [];
  for (let i = 0; i < serviceLabels.length; i++) {
    const image = await copyAsset(serviceAssets[i]?.src, `service-${i + 1}`);
    if (image) services.push({ label: serviceLabels[i], image });
  }

  const location = lead.location ?? "Ihrer Region";
  const seed = lead.companyName + (lead.location ?? "");

  const data = {
    slug,
    companyName: lead.companyName,
    industry: lead.industry ?? profile.industryKey,
    location,
    address: lead.address ?? "",
    contactEmail: lead.contactEmail ?? "",
    contactPhone: lead.contactPhone ?? "",
    tagline: taglineFor(lead.companyName, location, profile, seed),
    aboutText: buildAboutText(lead.companyName, location, profile.brandImpression, seed),
    brandPromise: buildBrandPromise(lead.companyName, profile.brandImpression, seed),
    servicesLabel: secondaryPageLabel(profile.industryKey),
    latitude: lead.latitude,
    longitude: lead.longitude,
    colors: {
      primary: profile.colors.primary,
      primaryDark: profile.colors.primaryDark,
      secondary: profile.colors.secondary,
      accent: profile.colors.accent,
      background: profile.colors.background,
      foreground: profile.colors.foreground,
    },
    typography: {
      heading: profile.typography.heading,
      body: profile.typography.body,
      googleFontsHref: profile.typography.googleFontsHref,
    },
    heroImage: heroImage ?? "",
    services,
  };

  await fs.mkdir(REACT_APP_DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(REACT_APP_DATA_DIR, `${slug}.json`), JSON.stringify(data, null, 2), "utf8");

  return { slug };
}
