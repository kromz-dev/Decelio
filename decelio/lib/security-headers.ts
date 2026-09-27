/**
 * En-têtes de sécurité HTTP pour toutes les routes de l'application.
 *
 * Contexte (audit sécurité) : `next.config.ts` ne posait aucun en-tête de
 * sécurité, laissant l'application exposée au clickjacking (aucun
 * `X-Frame-Options` ni `frame-ancestors`), sans HSTS ni CSP.
 *
 * Stratégie CSP : PAS de nonce par requête. Le guide Next.js 16
 * (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)
 * recommande un nonce généré dans `proxy.ts`, mais cela force le rendu
 * dynamique de **toutes** les pages (plus de génération statique/ISR — par
 * exemple `/design-system`, `/register`, `/login`, `/forgot-password` et
 * `/reset-password` sont aujourd'hui statiques), ce qui casserait la
 * performance et le référencement des pages marketing publiques — le cœur
 * de la stratégie d'acquisition de Decelio (budget 0 €, pas de CDN tiers
 * pour compenser). On retient donc l'option « sans nonce » documentée par
 * le même guide.
 *
 * Dette documentée (vérifiée dans un vrai navigateur, cf. rapport de
 * l'agent) :
 * - `script-src` autorise `'unsafe-inline'`. Next.js 16 (Turbopack) injecte
 *   sur chaque page un `<script>` inline (le bootstrap RSC/hydratation), qui
 *   n'a pas de nonce sans `proxy.ts` : sans `'unsafe-inline'`, TOUTES les
 *   pages échouaient en console (« Refused to execute inline script »),
 *   vérifié sur `/`, `/pricing`, `/login`, `/register`, `/design-system` et
 *   `/analyse/[domain]`. Aucun composant applicatif n'ajoute lui-même de
 *   script inline exécutable (aucun `next/script`) ; le seul `<script>`
 *   écrit dans le code est le JSON-LD de
 *   `components/home/StructuredData.tsx`, de type `application/ld+json`,
 *   non exécutable et non concerné par `script-src`. Durcir cette
 *   directive nécessiterait de passer par un nonce généré dans `proxy.ts`
 *   (voir ci-dessus) ou par la génération de hash (SRI expérimental côté
 *   Next.js), au prix de la dynamisation forcée déjà écartée.
 * - `style-src` autorise `'unsafe-inline'` car de nombreux composants
 *   posent des styles inline (`style={{ ... }}`) pour des valeurs calculées
 *   (angles, délais d'animation, largeurs de colonnes). Remplacer ces
 *   styles inline par des variables CSS/classes utilitaires permettrait de
 *   durcir `style-src` plus tard ; ce n'est pas fait ici pour rester dans le
 *   périmètre « en-têtes de sécurité ».
 */

/** Hôte PostHog Cloud UE réellement utilisé côté navigateur (voir
 * `instrumentation-client.ts` et `NEXT_PUBLIC_POSTHOG_HOST` dans
 * `.env.example`). PostHog est chargé comme dépendance npm (`posthog-js`),
 * jamais comme script depuis un CDN tiers : seule une autorisation
 * `connect-src` est nécessaire, aucune autorisation `script-src`. */
export const POSTHOG_CONNECT_SRC =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

/**
 * Construit la valeur de l'en-tête `Content-Security-Policy`.
 *
 * @param isProduction en développement, le serveur de dev de Next.js exige
 *   `'unsafe-eval'` (React reconstruit les piles d'erreur côté serveur dans
 *   le navigateur) et une connexion WebSocket pour le rechargement à chaud.
 *   Ces autorisations ne sont jamais posées en production.
 */
export function buildContentSecurityPolicy(isProduction: boolean): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${POSTHOG_CONNECT_SRC}${isProduction ? "" : " ws: wss:"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * En-têtes de sécurité posés sur toutes les routes (pages, assets, API).
 * Sans `preload` sur le HSTS : au fondateur de décider de le soumettre à la
 * liste de préchargement des navigateurs, décision irréversible pendant la
 * durée du `max-age`.
 */
export function getSecurityHeaders(isProduction: boolean): SecurityHeader[] {
  return [
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isProduction),
    },
  ];
}
