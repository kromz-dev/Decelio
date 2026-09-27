import { db } from "@/lib/db";

/**
 * Limitation de débit à fenêtre fixe, adossée à PostgreSQL.
 *
 * Un compteur en mémoire ne tient pas ici : en exécution sans serveur, chaque
 * instance a sa propre mémoire, donc la limite est multipliée par le nombre
 * d'instances. La base est la seule ressource partagée dont on dispose.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  // Fenêtre fixe : toutes les requêtes d'un même intervalle partagent une ligne.
  const window = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const resetAt = new Date(window.getTime() + windowMs);

  // L'incrément est atomique côté base : deux requêtes simultanées ne peuvent
  // pas lire la même valeur et dépasser la limite toutes les deux.
  const row = await db.rateLimit.upsert({
    where: { key_window: { key, window } },
    create: { key, window, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    resetAt,
  };
}

/**
 * Adresse de l'appelant, pour servir de clé.
 *
 * `x-forwarded-for` est une liste que chaque relais complète en ajoutant sa
 * propre observation à la fin. Le premier élément est écrit par le client
 * lui-même : le lire donnerait à n'importe quel attaquant un en-tête
 * `X-Forwarded-For: <IP au choix>` pour changer de clé à volonté et
 * contourner toutes les limites de débit.
 *
 * L'application tourne sur Render (`render.yaml`), pas sur Vercel. D'après
 * les constats publics disponibles, le proxy de Render ajoute l'IP qu'il
 * voit à la fin de la liste (relevé empirique de 2024) ; une ancienne
 * réponse de Render (2021) affirmait qu'il remplace la première IP. Dans les
 * deux cas, quand il y a exactement un proxy de confiance entre l'internet
 * et l'application, la **dernière** IP de la liste est celle que ce proxy a
 * observée, donc la seule qu'on ne peut pas falsifier depuis l'extérieur.
 *
 * `TRUSTED_PROXY_HOPS` (entier ≥ 1, 1 par défaut) donne le nombre de relais
 * de confiance à remonter depuis la droite ; une valeur absente, non
 * entière ou inférieure à 1 revient à 1. Risque si la valeur est trop
 * grande : au-delà du nombre réel de relais, tous les appelants partagent
 * la même IP de proxy et donc la même clé — des faux positifs visibles
 * (tout le monde limité ensemble), jamais une faille de sécurité. Risque
 * inverse, si elle est trop petite : on retombe sur une IP écrite par un
 * relais intermédiaire non fiable, donc de nouveau falsifiable.
 */
export function callerKey(req: Request, prefix: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ips = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!ips || ips.length === 0) {
    return `${prefix}:inconnu`;
  }

  const parsedHops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10);
  const hops = Number.isInteger(parsedHops) && parsedHops >= 1 ? parsedHops : 1;
  const index = Math.max(0, ips.length - hops);

  return `${prefix}:${ips[index]}`;
}
