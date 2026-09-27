"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { rateLimit, callerKeyFromHeaders } from "@/lib/rate-limit";
import { z } from "zod";

// 5 pistes par heure et par IP : cette action est publique et non
// authentifiée (voir components/CoverageGrid.tsx, seul appelant), donc
// ouverte à quiconque sait l'appeler directement.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 5;

// Domaine attendu : nom d'hôte simple, sans schéma ni chemin, borné en
// longueur. Decelio ne mesure pas les citations (docs/08-constitution.md) :
// ce schéma ne porte plus aucun champ lié aux mentions de marque.
const domainSchema = z
  .string()
  .min(3)
  .max(253)
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i, {
    message: "Domaine invalide",
  });

const leadSchema = z.object({
  email: z.string().email().max(254),
  domain: domainSchema,
  score: z.number().min(0).max(100),
  type: z.string().min(1).max(100),
});

export async function captureLead(formData: FormData, auditDataStr: string) {
  try {
    const requestHeaders = await headers();
    const quota = await rateLimit(
      callerKeyFromHeaders(requestHeaders, "lead"),
      MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS
    );
    if (!quota.allowed) {
      return { success: false, error: "Trop de requêtes. Veuillez réessayer plus tard." };
    }

    const email = formData.get("email") as string;
    const auditData = JSON.parse(auditDataStr);

    // Validate inputs
    const parsed = leadSchema.parse({
      email,
      ...auditData,
    });

    // Save lead to DB. Aucun e-mail n'est envoyé depuis cette action : voir
    // docs/08-constitution.md — un appelant public choisissant librement le
    // destinataire et le contenu ne doit jamais faire relayer un e-mail par
    // Decelio (T-lead-sans-relais-email).
    await db.auditLead.upsert({
      where: {
        email_domain: {
          email: parsed.email,
          domain: parsed.domain,
        },
      },
      update: {
        score: parsed.score,
        createdAt: new Date(),
      },
      create: {
        email: parsed.email,
        domain: parsed.domain,
        score: parsed.score,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to capture lead", error);
    return { success: false, error: "Une erreur est survenue." };
  }
}
