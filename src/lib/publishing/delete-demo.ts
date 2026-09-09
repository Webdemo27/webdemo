import { promises as fs } from "fs";
import path from "path";
import { prisma, logActivity } from "../db";
import { CloudflarePagesPublisher } from "./cloudflare-publisher";

export interface DeleteDemoOutcome {
  ok: boolean;
  cloudflareDeleted: boolean;
  cloudflareWarning?: string;
  error?: string;
}

/**
 * Deletes one demo completely: tears down its Cloudflare Pages project
 * (if it was ever published there), removes the local
 * public/demos/<slug>/ directory, and removes the Demo row (cascading
 * DemoAsset rows per the schema). The lead itself is untouched — only
 * its demo goes away, reverting it to "no demo yet" rather than
 * removing the lead's research/analysis history too.
 *
 * Cloudflare teardown is best-effort and never blocks local cleanup: if
 * it fails (Cloudflare not configured, API error, etc.) the local
 * record is still removed so the dashboard's list stays accurate, but
 * the outcome reports the Cloudflare failure so the user knows to check
 * Cloudflare's own dashboard for a possibly still-live deployment.
 */
export async function deleteDemo(demoId: string): Promise<DeleteDemoOutcome> {
  const demo = await prisma.demo.findUnique({ where: { id: demoId } });
  if (!demo) return { ok: false, cloudflareDeleted: false, error: "Demo nicht gefunden." };

  let cloudflareDeleted = false;
  let cloudflareWarning: string | undefined;

  if (demo.publicUrl) {
    const publisher = new CloudflarePagesPublisher();
    const result = await publisher.deleteProject(demo.slug);
    if (result.ok) {
      cloudflareDeleted = true;
    } else {
      cloudflareWarning = result.error ?? "Cloudflare-Projekt konnte nicht gelöscht werden.";
    }
  }

  const demoDir = path.join(process.cwd(), "public", "demos", demo.slug);
  await fs.rm(demoDir, { recursive: true, force: true });

  await logActivity(
    demo.leadId,
    "DEMO_DELETED",
    cloudflareWarning
      ? `Demo gelöscht (lokale Dateien + Datenbankeintrag). Cloudflare-Projekt konnte NICHT gelöscht werden: ${cloudflareWarning}`
      : demo.publicUrl
      ? "Demo gelöscht (lokale Dateien, Datenbankeintrag und Cloudflare-Projekt)."
      : "Demo gelöscht (lokale Dateien und Datenbankeintrag; war nie öffentlich veröffentlicht)."
  );

  await prisma.demo.delete({ where: { id: demoId } });

  return { ok: true, cloudflareDeleted, cloudflareWarning };
}
