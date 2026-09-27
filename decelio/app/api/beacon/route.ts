import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { callerKey, rateLimit } from "@/lib/rate-limit";

const payloadSchema = z.object({
  path: z.string().max(500).default("/"),
  referrer: z.string().max(500).nullable().default(null),
});

// Endpoint public et non authentifié : le seul filtre applicatif (regex sur
// le User-Agent ci-dessous) est trivialement contournable, donc c'est cette
// limite par IP qui protège réellement la table PageView contre une boucle
// de script. C'est un simple compteur de visites (une requête par
// changement de page, voir app/(marketing)/beacon.tsx), pas une opération
// coûteuse comme /api/scan (3/min) : on reste donc largement plus permissif
// pour ne jamais bloquer un visiteur légitime, y compris derrière une IP
// partagée (NAT, bureau). 60 requêtes/minute/IP correspond à une visite de
// page par seconde en continu — bien au-delà de toute navigation humaine
// réelle — tout en bornant la croissance de la base en cas d'abus (quota
// Neon gratuit : 0,5 Go de stockage, 100 CU-h/mois).
const BEACON_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const BEACON_MAX_REQUESTS = 60;

export async function POST(request: Request) {
  try {
    const quota = await rateLimit(callerKey(request, "beacon"), BEACON_MAX_REQUESTS, BEACON_RATE_LIMIT_WINDOW_MS);
    if (!quota.allowed) {
      // Le client (app/(marketing)/beacon.tsx) envoie en "fire-and-forget" et
      // ignore la réponse (fetch(...).catch(() => {})) : un 429 ici ne casse
      // jamais l'affichage du site, il arrête juste silencieusement le comptage.
      return NextResponse.json(
        { error: "Trop de requêtes." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil((quota.resetAt.getTime() - Date.now()) / 1000))) },
        },
      );
    }

    const userAgent = request.headers.get("user-agent") || "";
    const isBot = /bot|crawler|spider|crawling|lighthouse/i.test(userAgent);

    if (isBot) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await request.text();
    let path: string = "/";
    let referrer: string | null = null;
    
    if (data) {
      try {
        const payload = JSON.parse(data);
        const parsed = payloadSchema.safeParse(payload);
        if (parsed.success) {
          path = parsed.data.path;
          referrer = parsed.data.referrer;
        }
      } catch {
        // Ignorer les erreurs de parse, on garde les valeurs par défaut
      }
    }

    await db.pageView.create({
      data: {
        path,
        referrer,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erreur api/beacon:", error);
    return new NextResponse(null, { status: 500 });
  }
}
