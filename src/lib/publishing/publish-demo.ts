import { promises as fs } from "fs";
import path from "path";
import { prisma, logActivity } from "../db";
import { CloudflarePagesPublisher, isCloudflareConfigured } from "./cloudflare-publisher";
import { verifyPublicUrl } from "./verify";
import { insertDemoLink } from "../messaging";

export interface PublishDemoOutcome {
  ok: boolean;
  publicUrl?: string;
  error?: string;
  configured: boolean;
  /** Demos that were publicly reachable without ever having been
   * published successfully, and have now been removed from the
   * deployment. See reconcileStaging() for how they got there. */
  removedFromDeployment?: string[];
}

/**
 * The real HAUPTZIEL deploy step: publish → verify the returned URL is
 * actually reachable over HTTPS → only then record Demo.publicUrl. A
 * lead never gets a link in an outreach message that hasn't passed this
 * check (see messaging/index.ts, which omits the link entirely when
 * publicUrl is null). Fails closed with a clear reason when Cloudflare
 * isn't configured — this project has no credentials set.
 */
export async function publishDemoPublicly(leadId: string): Promise<PublishDemoOutcome> {
  const configured = isCloudflareConfigured();
  if (!configured) {
    return {
      ok: false,
      configured: false,
      error: "Cloudflare ist nicht konfiguriert (CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID fehlen in .env).",
    };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { demo: true, message: true } });
  if (!lead) return { ok: false, configured, error: "Lead nicht gefunden." };
  if (!lead.demo) return { ok: false, configured, error: "Für diesen Lead wurde noch keine Demo erstellt." };

  const demoDir = path.join(process.cwd(), "public", "demos", lead.demo.slug);
  try {
    await fs.access(path.join(demoDir, "index.html"));
  } catch {
    return { ok: false, configured, error: "Demo-HTML nicht gefunden — Demo zuerst (neu) erstellen." };
  }

  // Everything already live. The shared project deploys as one tree, so
  // this deploy republishes all of them anyway — passing them along lets
  // their staged copies be refreshed from source instead of going live
  // again at whatever state they were in on their own publish date.
  const alreadyPublished = await prisma.demo.findMany({
    where: { publicUrl: { not: null }, NOT: { slug: lead.demo.slug } },
    select: { slug: true },
  });

  const publisher = new CloudflarePagesPublisher();
  const result = await publisher.publish({
    slug: lead.demo.slug,
    directory: demoDir,
    alsoPublished: alreadyPublished.map((d) => ({
      slug: d.slug,
      directory: path.join(process.cwd(), "public", "demos", d.slug),
    })),
  });
  if (!result.ok || !result.publicUrl) {
    await logActivity(leadId, "PUBLISH_FAILED", result.error ?? "Cloudflare-Veröffentlichung fehlgeschlagen");
    return { ok: false, configured, error: result.error };
  }

  if (result.removedFromDeployment?.length) {
    await logActivity(
      leadId,
      "PUBLISH_CLEANUP",
      `Aus dem Deployment entfernt, weil nie erfolgreich veröffentlicht: ${result.removedFromDeployment.join(", ")}`
    );
  }

  const verification = await verifyPublicUrl(result.publicUrl, lead.companyName);
  if (!verification.reachable) {
    await logActivity(
      leadId,
      "PUBLISH_FAILED",
      `Deployment erstellt (${result.publicUrl}), aber URL-Verifikation fehlgeschlagen: ${verification.error ?? `HTTP ${verification.status}`}`
    );
    return {
      ok: false,
      configured,
      error: `Demo wurde deployt (${result.publicUrl}), aber die URL ist innerhalb der Wartezeit nicht erreichbar geworden (${verification.error ?? `HTTP ${verification.status}`}). publicUrl wurde NICHT gespeichert — bei einem brandneuen Projekt kann die DNS-Freischaltung vereinzelt länger dauern als das Wartefenster; einfach erneut auf „Öffentlich bereitstellen" klicken.`,
    };
  }
  if (!verification.contentMatches) {
    await logActivity(
      leadId,
      "PUBLISH_FAILED",
      `URL erreichbar, zeigt aber nicht die erwartete Demo (Firmenname "${lead.companyName}" nicht im Inhalt gefunden).`
    );
    return {
      ok: false,
      configured,
      error: `Die URL ist erreichbar, zeigt aber offenbar nicht diese Demo — bitte manuell prüfen, bevor sie verschickt wird. publicUrl wurde NICHT gespeichert.`,
    };
  }

  await prisma.demo.update({
    where: { id: lead.demo.id },
    data: { publicUrl: result.publicUrl, publishedAt: new Date() },
  });
  await logActivity(leadId, "PUBLISHED", `Demo öffentlich unter ${result.publicUrl} verifiziert und veröffentlicht`);

  if (lead.message) {
    const updatedBody = insertDemoLink(lead.message.body, result.publicUrl, {
      companyName: lead.companyName,
      location: lead.location,
    });
    if (updatedBody !== lead.message.body) {
      await prisma.message.update({ where: { leadId }, data: { body: updatedBody } });
      await logActivity(leadId, "MESSAGE_LINK_INSERTED", "Nachricht automatisch mit dem echten Demo-Link aktualisiert.");
    }
  }

  return {
    ok: true,
    configured,
    publicUrl: result.publicUrl,
    removedFromDeployment: result.removedFromDeployment,
  };
}
