"use server";

import { auth } from "@/auth";
import { PLAN_LIMITS, maxSitesFor } from "@/lib/billing/plans";
import { db } from "@/lib/db";
import { captureServerEvent } from "@/lib/posthog-server";
import { assertSafeUrl } from "@/lib/scanner/crawler";
import { revalidatePath } from "next/cache";

export async function getMonitoredSites() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const sites = await db.monitoredSite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return { data: sites };
  } catch (error) {
    return { error: "Internal server error" };
  }
}

function quotaReachedMessage(plan: string, maxSites: number): string {
  if (plan === "SOLO") {
    return `Vous surveillez déjà ${maxSites} sites, le maximum du palier Freelance. Passez au palier Agence (${PLAN_LIMITS.PRO.maxSites} sites) pour en ajouter.`;
  }
  if (plan === "PRO") {
    return `Vous surveillez déjà ${maxSites} sites, le maximum du palier Agence. Passez au palier Studio (${PLAN_LIMITS.SCALE.maxSites} sites) pour en ajouter.`;
  }
  return `Vous surveillez déjà ${maxSites} sites, le maximum du palier Studio. Au-delà, chaque site coûte 2 € par mois : contactez-nous pour l'activer.`;
}

export async function addMonitoredSite(data: { name: string; url: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    if (!data.name || !data.url) {
      return { error: "Name and URL are required" };
    }

    const userId = session.user.id;

    let safeUrl: string;
    try {
      safeUrl = await assertSafeUrl(data.url);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "URL refusée",
      };
    }

    // Capturé depuis l'intérieur de la transaction pour l'événement de
    // tunnel émis après coup : le décompte fait ici est celui qui a
    // effectivement autorisé l'ajout, pas une nouvelle lecture après coup
    // qui pourrait avoir changé entre-temps.
    let sitesBeforeAdd = 0;

    // Le décompte et l'insertion sont dans la même transaction : deux ajouts
    // simultanés ne peuvent pas tous les deux passer sous la limite.
    // Postgres est en READ COMMITTED : deux ajouts simultanés peuvent lire
    // le même count et insérer tous les deux. Le verrou de la ligne User
    // sérialise les ajouts d'un même compte avant le décompte.
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { stripeCurrentPeriodEnd: true, plan: true },
      });

      if (
        !user ||
        user.plan === "FREE" ||
        !user.stripeCurrentPeriodEnd ||
        user.stripeCurrentPeriodEnd.getTime() < Date.now()
      ) {
        return { error: "Abonnement requis" };
      }

      const maxSites = maxSitesFor(user.plan);
      const count = await tx.monitoredSite.count({ where: { userId } });
      if (count >= maxSites) {
        return { error: quotaReachedMessage(user.plan, maxSites) };
      }
      sitesBeforeAdd = count;

      const site = await tx.monitoredSite.create({
        data: {
          name: data.name,
          url: safeUrl,
          userId,
          status: "ACTIVE",
        },
      });

      return { data: site };
    });

    if ("error" in result) {
      return result;
    }

    revalidatePath("/dashboard");
    await captureServerEvent(userId, "site_added", {
      count: 1,
      total_sites: sitesBeforeAdd + 1,
      is_first_site: sitesBeforeAdd === 0,
    });
    return result;
  } catch (error) {
    return { error: "Internal server error" };
  }
}

export async function deleteMonitoredSite(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const result = await db.monitoredSite.deleteMany({
      where: { 
        id: id,
        userId: session.user.id 
      },
    });

    if (result.count === 0) {
      return { error: "Site not found or forbidden" };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Internal server error" };
  }
}

const BULK_LINE_CAP = 100;
const HAS_PROTOCOL = /^https?:\/\//i;

function withProtocol(value: string): string {
  return HAS_PROTOCOL.test(value) ? value : `https://${value}`;
}

function parseBulkLine(line: string): { name: string; url: string } {
  const comma = line.indexOf(",");
  if (comma === -1) {
    const name = line.replace(HAS_PROTOCOL, "").split("/")[0] || line;
    return { name, url: withProtocol(line) };
  }
  const name = line.slice(0, comma).trim();
  const rawUrl = line.slice(comma + 1).trim();
  return { name: name || rawUrl, url: withProtocol(rawUrl) };
}

export async function addMonitoredSitesBulk(raw: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const userId = session.user.id;
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const skipped: { line: string; reason: string }[] = [];
    const capped = lines.slice(0, BULK_LINE_CAP);
    for (const line of lines.slice(BULK_LINE_CAP)) {
      skipped.push({ line, reason: "Trop de lignes (maximum 100)." });
    }

    const checked = await Promise.all(
      capped.map(async (line) => {
        const parsed = parseBulkLine(line);
        try {
          const safe = await assertSafeUrl(parsed.url);
          return { ok: true as const, line, name: parsed.name, safe };
        } catch (error) {
          return {
            ok: false as const,
            line,
            error: error instanceof Error ? error.message : "URL refusée",
          };
        }
      }),
    );

    const seen = new Set<string>();
    const candidates: { line: string; name: string; url: string }[] = [];
    for (const row of checked) {
      if (!row.ok) {
        skipped.push({ line: row.line, reason: row.error });
        continue;
      }
      if (seen.has(row.safe)) {
        skipped.push({ line: row.line, reason: "Doublon dans la liste." });
        continue;
      }
      seen.add(row.safe);
      candidates.push({ line: row.line, name: row.name, url: row.safe });
    }

    if (candidates.length === 0) {
      return { data: { created: [], skipped } };
    }

    // Capturé depuis l'intérieur de la transaction, pour la même raison que
    // dans `addMonitoredSite` : c'est le décompte qui a réellement autorisé
    // l'ajout, pas une relecture après coup.
    let sitesBeforeAdd = 0;

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { stripeCurrentPeriodEnd: true, plan: true },
      });

      if (
        !user ||
        user.plan === "FREE" ||
        !user.stripeCurrentPeriodEnd ||
        user.stripeCurrentPeriodEnd.getTime() < Date.now()
      ) {
        return { error: "Abonnement requis" };
      }

      const existing = await tx.monitoredSite.findMany({
        where: { userId },
        select: { url: true },
      });
      sitesBeforeAdd = existing.length;
      const owned = new Set(existing.map((site) => site.url));
      const heldBack: { line: string; reason: string }[] = [];
      const fresh = candidates.filter((candidate) => {
        if (!owned.has(candidate.url)) return true;
        heldBack.push({ line: candidate.line, reason: "Déjà surveillé." });
        return false;
      });

      const maxSites = maxSitesFor(user.plan);
      const room = Math.max(0, maxSites - existing.length);
      const accepted = fresh.slice(0, room);
      for (const candidate of fresh.slice(room)) {
        heldBack.push({ line: candidate.line, reason: quotaReachedMessage(user.plan, maxSites) });
      }

      const created =
        accepted.length === 0
          ? []
          : await tx.monitoredSite.createManyAndReturn({
              data: accepted.map((candidate) => ({
                name: candidate.name,
                url: candidate.url,
                userId,
                status: "ACTIVE",
              })),
            });

      return { data: { created, skipped: heldBack } };
    });

    if ("error" in result) {
      return result;
    }

    if (result.data.created.length > 0) {
      revalidatePath("/dashboard");
      await captureServerEvent(userId, "site_added", {
        count: result.data.created.length,
        total_sites: sitesBeforeAdd + result.data.created.length,
        is_first_site: sitesBeforeAdd === 0,
      });
    }
    return {
      data: {
        created: result.data.created,
        skipped: [...skipped, ...result.data.skipped],
      },
    };
  } catch (error) {
    return { error: "Internal server error" };
  }
}
