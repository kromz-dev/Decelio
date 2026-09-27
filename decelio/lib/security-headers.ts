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
 *
 * PostHog (`instrumentation-client.ts`) passe par `/ingest` sur notre propre
 * domaine (`app/ingest/[...path]/route.ts`), qui relaie côté serveur vers
 * PostHog Cloud UE : `script-src` et `connect-src` n'ont donc besoin
 * d'aucun hôte PostHog, `'self'` suffit. Voir `docs/api-reference.md`.
 */

/**
 * Origines Stripe autorisées comme cible de `form-action`.
 *
 * `lib/billing/actions.ts` (`createCheckoutSession`,
 * `createCustomerPortalSession`) sont des Server Actions appelées depuis de
 * vrais éléments `<form action={...}>` (`app/(marketing)/pricing/page.tsx`,
 * `app/(app)/onboarding/OnboardingPlanStep.tsx`,
 * `app/(app)/settings/SubscriptionSection.tsx`) — pas un gestionnaire
 * `onClick` en JavaScript. Elles se terminent par `redirect(url)` vers
 * `checkout.stripe.com` (paiement) ou `billing.stripe.com` (portail
 * d'abonnement, cf. le SDK Stripe). Chrome applique `form-action` à la
 * redirection qui suit un envoi de formulaire, y compris quand elle est
 * gérée par une Server Action Next.js ; sans ces origines, la redirection
 * vers Stripe serait bloquée. Vérifié dans un vrai navigateur : sans clé
 * Stripe valide, la création de session échoue avant la redirection (« La
 * session Stripe échouera faute de clé, c'est attendu ») — la soumission du
 * formulaire elle-même ne déclenche aucune violation CSP.
 */
export const STRIPE_CHECKOUT_ORIGIN = "https://checkout.stripe.com";
export const STRIPE_BILLING_PORTAL_ORIGIN = "https://billing.stripe.com";

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
    `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' ${STRIPE_CHECKOUT_ORIGIN} ${STRIPE_BILLING_PORTAL_ORIGIN}`,
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
