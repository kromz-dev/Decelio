# Référence API — Decelio

Documentation route par route de `decelio/app/api/**` et `decelio/app/llms.txt`. Générée par audit de code (lecture directe des routes, de `lib/rate-limit.ts`, `lib/billing/plans.ts`, `auth.ts`/`auth.config.ts`, `prisma/schema.prisma`), pas de la documentation produit — un comportement marqué **⚠️ douteux** est un constat de code, pas une intention confirmée par l'équipe.

Convention : « session requise » = `auth()` (NextAuth v5, JWT) doit renvoyer un `session.user.id`, sinon 401. Le middleware racine (`middleware.ts`) protège les pages mais **exclut `/api/**`** (`matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]`) : chaque route API est donc seule responsable de vérifier sa propre authentification. Toutes les routes listées ci-dessous font bien cette vérification là où elle est nécessaire, sauf mention contraire.

---

## POST /api/scan

Scan technique complet d'une URL (robots.txt par bot, pare-feu/challenge, dépendance JS, directives d'indexation). Outil public, sans compte.

- **Authentification** : aucune (public, intentionnel).
- **Entrée** : JSON `{ url: string }`. Validation Zod stricte (`z.string().url()` + doit commencer par `http://`/`https://`).
- **Protection SSRF** : `assertSafeUrl` (résolution DNS + refus des plages non-unicast : privées, loopback, link-local, etc.) est appliquée à l'URL initiale **et à chaque saut de redirection** dans `crawlUrl` (`lib/scanner/crawler.ts`), donc aussi bien pour l'appel explicite dans la route que pour les redirections suivies pendant le scan.
- **Limitation de débit** : oui — 3 requêtes/minute par IP (`callerKey` sur `x-forwarded-for`, table `RateLimit`). Vérifiée **avant** le parsing du corps.
- **Sortie (200)** : `{ report: ScanReport, results: ScanCoreResult[] }`. `results[i]` = `{ agent, simpleStatus: "OK"|"BLOQUÉ"|"COQUILLE VIDE"|"ERREUR", reasons: string[], httpStatus, durationMs, wordCount }`, un par robot de `DEFAULT_PROBE_BOTS` (`GPTBot`, `ClaudeBot`, `PerplexityBot`).
- **Codes d'erreur** :
  - `400` — URL invalide (message Zod).
  - `403` — URL rejetée par `assertSafeUrl` (message générique, ne révèle pas la raison technique exacte contrairement à `app/actions/sites.ts`).
  - `429` — quota dépassé, en-tête `Retry-After` (secondes).
  - `500` — erreur interne générique (`"Une erreur interne est survenue lors de l'analyse."`), aucune fuite de détail.
- **Effets de bord** : aucune écriture en base (le scan est calculé à la volée, non persisté). Requêtes HTTP sortantes vers le domaine cible.

## POST /api/audit

Audit "V3" utilisé par la page de diagnostic public (scan de `/`, `/pricing`, `/blog`).

- **Authentification** : aucune (public, intentionnel).
- **Entrée** : JSON `{ domain: string }`. Validation Zod par regex (accepte soit une URL `http(s)://…`, soit un domaine nu auto-préfixé en `https://`). La regex n'exclut pas les adresses IP littérales (ex. `http://127.0.0.1/`) ni les domaines internes bien formés : c'est **`assertSafeUrl`, appelé à l'intérieur de `crawlUrl`** à chaque étape (voir ci-dessus) qui bloque effectivement le SSRF, pas la regex Zod.
- **Limitation de débit** : oui — 10 requêtes/heure par IP. Vérifiée **après** le parsing Zod (le corps invalide ne consomme pas de quota, différence mineure et cohérente avec `/api/scan`).
- **Sortie (200)** : `{ domain, score: number (0-100), pages: [{ path, runs: [{ agent, status, wordCount, hasAppRoot, httpStatus, durationMs }] }] }`. `runs[0]` est toujours la requête de référence `DecelioBot`, suivie d'une requête par bot de `DEFAULT_PROBE_BOTS`.
- **Codes d'erreur** :
  - `400` — domaine invalide, ou page d'accueil inaccessible (HTTP 0/5xx).
  - `429` — quota dépassé, `Retry-After`.
  - `500` — erreur interne générique.
- **Effets de bord** : aucune écriture en base. `console.log` verbeux à chaque étape (pas un problème de sécurité, juste du bruit en production).
- **⚠️ Point d'attention** : contrairement à `/api/scan`, le scan porte sur jusqu'à 3 pages × 4 requêtes (référence + 3 bots) séquentiellement — un audit peut prendre plusieurs secondes ; `maxDuration = 30` est déclaré en conséquence.

## GET /api/health

Ping de disponibilité pour Render.

- **Authentification** : aucune.
- **Entrée** : aucune.
- **Sortie (200)** : `{ status: "ok" }`.
- **Effets de bord** : **aucun** — n'importe jamais `@/lib/db`, vérifié par un test dédié qui lit le code source pour l'interdire explicitement (`route.test.ts`, test n°3). C'est volontaire : un ping qui toucherait la base empêcherait Neon de se mettre en veille (coût).
- **Limitation de débit** : aucune, sans objet (endpoint gratuit à interroger, pas de ressource protégée).

## POST /api/beacon

Compteur de vues de pages marketing, sans cookie.

- **Authentification** : aucune (public, intentionnel).
- **Entrée** : corps texte brut, parsé en JSON tolérant. Schéma Zod `{ path: string.max(500).default("/"), referrer: string.max(500).nullable().default(null) }`. Un corps non-JSON ou invalide **ne fait pas échouer la requête** : les valeurs par défaut (`"/"`, `null`) sont utilisées silencieusement.
- **Filtrage bot** : détection naïve par regex sur `User-Agent` (`/bot|crawler|spider|crawling|lighthouse/i`) → `204` immédiat sans écriture. Trivialement contournable (l'attaquant choisit son propre User-Agent), donc ne protège que contre les crawlers bien élevés, pas contre un flux volontairement malveillant.
- **Sortie** : `204 No Content` dans tous les cas de succès (payload valide, invalide, ou bot détecté).
- **Codes d'erreur** : `500` (texte vide, pas de JSON) si l'écriture en base échoue.
- **Effets de bord** : `INSERT` dans `PageView` à chaque appel non filtré.
- **Limitation de débit** : **aucune.** ⚠️ Contrairement à `/api/scan` et `/api/audit`, cette route publique et non authentifiée n'a aucun `rateLimit()`. Voir Constat n°2 du rapport d'audit.

## GET/POST/PUT /api/inngest

Point d'entrée du worker Inngest (scans planifiés, rapports mensuels, e-mails de découverte, purge des logs).

- **Authentification** : gérée par la bibliothèque `inngest` elle-même (vérification de signature HMAC via `INNGEST_SIGNING_KEY`, portée par `inngest/client.ts`), **pas par un `auth()` applicatif** — cet endpoint n'est pas destiné à un navigateur.
- **Garde-fou explicite** : si `INNGEST_SIGNING_KEY` est absente **et** `NODE_ENV === "production"`, chaque requête (pas le chargement du module) reçoit `503` avec un message d'erreur explicite, plutôt que d'accepter un appel non signé. Ce choix (vérification à la requête, pas au chargement) est documenté en commentaire : un `throw` au chargement du module casserait `next build`, qui évalue ce fichier en `NODE_ENV=production`.
- **Effets de bord** : selon la fonction Inngest invoquée — écritures `ScanLog`/`AlertEvent`/`MonthlyReport`, envois d'e-mails (Resend), purge de `ScanLog.payload` après 90 jours.
- **Limitation de débit** : aucune (endpoint interne, protégé par signature, pas par IP).

## Webhooks/Stripe — POST /api/webhooks/stripe

Réception des événements de facturation Stripe.

- **Authentification** : vérification de signature Stripe (`stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`). Requête sans en-tête `stripe-signature` → `400`. Signature invalide → `400`. `STRIPE_WEBHOOK_SECRET` absente → `500` (refus explicite, log serveur).
- **Idempotence** : **oui, réellement appliquée.** Le modèle `ProcessedWebhook` (clé = `event.id` Stripe) est inséré **dans la même transaction Prisma** que l'écriture métier (`db.$transaction`). Une livraison dupliquée par Stripe (garanti "at-least-once") provoque une violation de contrainte unique (`P2002`), interceptée explicitement et renvoyée comme succès (`{ received: true, duplicate: true }`) plutôt que rejouée. Un échec métier après l'insertion du marqueur fait échouer toute la transaction (marqueur inclus), donc Stripe rejouera l'événement — pas de perte silencieuse.
- **Événements traités** :
  - `checkout.session.completed` : relit l'abonnement Stripe (`subscriptions.retrieve`, jamais fait confiance à ce que le client aurait pu injecter), déduit le plan **uniquement** via `planForPriceId` (table serveur `PRICE_ID_BY_PLAN`, jamais un tarif transmis par le client) ; un tarif Stripe non répertorié n'accorde **aucun** plan par défaut (log d'erreur + `break`). Attribution du statut "fondateur" si le coupon `STRIPE_FOUNDER_COUPON` a été appliqué à la session.
  - `customer.subscription.updated` : met à jour `plan` (repasse à `"FREE"` si le statut n'est ni `active` ni `trialing`, ou si le tarif est inconnu) — **repasse aussi en `FREE` une rétrogradation**, pas seulement une mise à niveau.
  - `customer.subscription.deleted` : `plan = "FREE"`, `cancelledAt = now`, `purgeAt = now + 60 jours` (cycle RGPD).
- **Sortie** : `200 { received: true }` (ou `{ received: true, duplicate: true }`).
- **Codes d'erreur** : `400` (signature absente/invalide), `500` (secret non configuré, ou échec métier — le marqueur d'idempotence est annulé avec la transaction, donc Stripe rejouera).
- **Limitation de débit** : sans objet (authentifié par signature Stripe, pas par IP).
- **⚠️ Point d'attention (non vérifié, à surveiller)** : `customer.subscription.updated` peut ramener le plan à `FREE` sans jamais positionner `cancelledAt`/`purgeAt` (ces deux champs ne sont écrits que par le handler `.deleted`). Si Stripe envoie un jour un `.updated` avec `status: "canceled"` sans `.deleted` correspondant (cas non observé dans ce code, mais pas structurellement impossible côté Stripe), l'utilisateur repasserait en FREE sans jamais entrer dans le cycle de purge RGPD à 60 jours. À confirmer avec la doc Stripe / les logs de production plutôt qu'à corriger à l'aveugle.

## POST /api/auth/register

Création de compte par e-mail/mot de passe.

- **Authentification** : aucune (c'est l'inscription).
- **Entrée** : `{ email, name, password }`. Validation Zod (`lib/auth-validation.ts`) : email normalisé (`trim().toLowerCase()`, max 254), mot de passe **12 caractères minimum**, 128 max ; nom 1-100 caractères.
- **Limitation de débit** : oui — 5 tentatives/heure par IP.
- **Anti-doublon** : vérifie l'existence par e-mail avant insertion, **et** rattrape la contrainte unique Prisma (`P2002`) en cas de course entre la vérification et l'insertion → toujours `409`, jamais de fuite d'un plantage 500 sur une collision concurrente.
- **Hachage** : `scrypt` (`node:crypto`), sel 16 octets, clé 64 octets, format stocké `scrypt:<sel>:<clé>` — pas de bcrypt malgré ce qu'affirme `docs/production-audit-report.md`.
- **Sortie (201)** : `{ success: true }`.
- **Codes d'erreur** : `400` (validation), `409` (compte existant), `429` (quota).
- **Effets de bord** : `INSERT` dans `User`.

## POST /api/auth/reset-password/request

Demande d'e-mail de réinitialisation de mot de passe.

- **Authentification** : aucune.
- **Entrée** : `{ email }`. Validation Zod.
- **Limitation de débit** : oui — 5/heure par IP.
- **Anti-énumération de comptes** : réponse **identique** (`200 { success: true, message: "Si un compte existe…" }`) que le compte existe ou non, et que l'e-mail parte réellement ou non. Toute demande précédente est invalidée (`deleteMany` sur l'identifiant) avant d'en émettre une nouvelle, y compris si le compte n'existe pas — pas de différence de timing exploitable par ce chemin.
- **Jeton** : 32 octets aléatoires (`base64url`), **seule l'empreinte SHA-256 est stockée** en base (`VerificationToken.token`), TTL 1 heure. Le jeton en clair ne quitte le serveur que dans le lien e-mail.
- **Sortie (200)** : toujours `{ success: true, message }`, même en cas de compte inexistant.
- **Codes d'erreur** : `400` (validation), `429` (quota).
- **Effets de bord** : `DELETE` puis éventuel `INSERT` dans `VerificationToken`, envoi d'e-mail (Resend) si le compte existe et a un mot de passe (les comptes OAuth-only n'en reçoivent pas).

## POST /api/auth/reset-password/confirm

Choix d'un nouveau mot de passe à partir du jeton reçu par e-mail.

- **Authentification** : aucune (le jeton en fait office).
- **Entrée** : `{ token, password }`. Mot de passe : mêmes règles que l'inscription (12-128 caractères).
- **Limitation de débit** : oui — 10/heure par IP.
- **Vérification du jeton** : recherche par empreinte SHA-256 (jamais le jeton en clair) ; jeton absent **ou expiré** → `400` message générique (`"Ce lien de réinitialisation est invalide ou a expiré."`), sans distinguer les deux cas (bonne pratique). Un jeton expiré trouvé est supprimé immédiatement (nettoyage).
- **Mise à jour** : hachage du nouveau mot de passe + suppression du jeton (usage unique) **dans une seule transaction** Prisma.
- **Sortie (200)** : `{ success: true }`.
- **Codes d'erreur** : `400` (validation, ou jeton invalide/expiré), `429` (quota).
- **Effets de bord** : `UPDATE User.passwordHash`, `DELETE VerificationToken`.
- **⚠️ Point d'attention documenté dans le code lui-même** : les sessions sont des JWT (pas de session en base) ; une réinitialisation de mot de passe **ne révoque pas** les sessions déjà ouvertes ailleurs. C'est un choix assumé (commentaire explicite dans la route), pas un oubli — mais ça mérite d'être su du produit : si un compte est compromis et que la victime réinitialise son mot de passe, une session déjà volée reste valide jusqu'à son expiration naturelle.

## Auth NextAuth — /api/auth/[...nextauth]

Délègue entièrement à `handlers` de `auth.ts` (NextAuth v5 + adaptateur Prisma). Fournisseurs : Google (OAuth) et Credentials (e-mail/mot de passe, `authorizeCredentials` dans `auth.ts`).

- **Authentification** : c'est la route d'authentification elle-même.
- **Session** : stratégie JWT (`auth.config.ts`), `session.user.id` peuplé depuis `token.sub` dans le callback `session`.
- **Mot de passe** : vérifié via `verifyPassword` (scrypt + `timingSafeEqual`, résistant au timing attack sur la comparaison elle-même).
- **⚠️ Constat n°1 du rapport d'audit — pas de limitation de débit sur la tentative de connexion.** `authorizeCredentials` interroge la base et vérifie le mot de passe sans passer par `rateLimit()`/`callerKey()` (confirmé par recherche exhaustive : ces deux fonctions ne sont utilisées que dans `register`, `reset-password/*` et `audit`/`scan`). Voir le rapport d'audit pour la gravité et le scénario.
- **Effets de bord** : `INSERT`/`UPDATE` dans `Account`/`Session`/`User` selon le fournisseur (adaptateur Prisma), pour OAuth uniquement — Credentials est stateless (JWT).

## GET /api/account/export

Export RGPD (EF-015) des données personnelles du compte connecté.

- **Authentification** : session requise. `401 { error: "Unauthorized" }` sinon.
- **Entrée** : aucune (GET simple, pensé pour un lien `<a href download>` sans JS).
- **Portée des données** : profil (sans `passwordHash`), sites surveillés (avec jusqu'à 90 derniers `ScanLog` par site et tous les `AlertEvent`), clients, réglages de marque, anciens `Site`/`Page` (V1). Toujours **l'utilisateur de la session**, jamais un identifiant transmis par le client.
- **Champs explicitement exclus** (voir commentaire du code) : `passwordHash`, toute ligne `Account`/`Session` (jetons OAuth/session), secrets Stripe (seuls les identifiants et dates sont exposés).
- **Sortie (200)** : fichier `application/json` téléchargeable (`Content-Disposition: attachment`), `{ exportedAt, profile, monitoredSites, clients, brandSettings, legacySites }`.
- **Codes d'erreur** : `401` (pas de session), `500` (erreur interne générique).
- **Effets de bord** : `UPDATE User.dataExportedAt = now()` à **chaque** appel (pas seulement au premier).
- **Limitation de débit** : aucune. Risque réduit par l'authentification requise (pas un vecteur anonyme), mais un compte compromis ou un script maladroit côté client pourrait déclencher des exports répétés coûteux en base.

## POST /api/pdf/diagnostic

Génère le PDF téléchargeable du diagnostic public (`/api/scan`).

- **Authentification** : aucune (public, cohérent avec `/api/scan`).
- **Entrée** : `{ report: ScanReport, results: ScanCoreResult[] }`, castés directement depuis `body as {...}` — **aucune validation Zod, aucune limite de taille ou de forme.** `results.map(...)` est appelé sans borne sur la longueur du tableau ni sur la taille des chaînes qu'il contient.
- **Limitation de débit** : **aucune.** ⚠️ Voir Constat n°3 du rapport d'audit : rendu PDF (`@react-pdf/renderer`) coûteux en CPU, déclenchable sans compte et sans limite, avec un corps de forme libre.
- **Sortie (200)** : `application/pdf`, `Content-Disposition: attachment; filename="diagnostic-<domaine>.pdf"`.
- **Codes d'erreur** : `400` (`report`/`results` absents — vérification de présence seulement, pas de forme), `500` (erreur interne générique, y compris si le rendu PDF plante sur une entrée mal formée).
- **Effets de bord** : aucun (pas d'écriture en base).

## GET /api/reports/[id]/pdf

Téléchargement d'un rapport mensuel en marque blanche déjà généré.

- **Authentification** : session requise (`401` sinon).
- **Autorisation (IDOR)** : **vérifiée correctement.** `MonthlyReport` n'a pas de `userId` propre ; la propriété remonte par `report.client.userId`. La route compare explicitement `report.client.userId !== userId` et renvoie **404** (pas 403) aussi bien pour un rapport inexistant que pour un rapport d'un autre compte — pas de fuite d'existence par le code de statut. Couvert par un test dédié (`route.test.ts`, "returns 404 for a report belonging to another account (no existence leak)").
- **Entrée** : `id` dans l'URL (aucune autre entrée).
- **Sortie (200)** : `application/pdf`, `Content-Disposition: attachment; filename="rapport-<client-slugifié>-<période>.pdf"`.
- **Codes d'erreur** : `401` (pas de session), `404` (rapport introuvable, sans PDF stocké, ou appartenant à un autre compte), `500` (erreur interne générique).
- **Effets de bord** : aucun.
- **Limitation de débit** : aucune ; risque faible (authentifié, coûte une lecture, pas un rendu).

## GET /llms.txt

Fichier statique destiné aux agents IA (description du produit, ce qu'il fait/ne fait pas, offre, liens).

- **Authentification** : aucune (public par nature).
- **Sortie (200)** : `text/plain; charset=utf-8`, `Cache-Control: public, max-age=86400`. Contenu généré en dur dans le code (pas de lecture base ni fichier).
- **Effets de bord** : aucun.

---

## Quotas de plan (EF-018) — appliqués côté serveur, pas seulement affichés

**Réponse : oui**, le quota de sites par plan est réellement appliqué côté serveur, pas seulement un affichage. Autorité unique : `PLAN_LIMITS` dans `decelio/lib/billing/plans.ts` (`FREE: 0`, `SOLO: 10`, `PRO: 30`, `SCALE: 100`).

Deux points d'application, tous deux dans `decelio/app/actions/sites.ts` (server actions, appelées depuis le tableau de bord — il n'y a pas de route `/api` dédiée à la création de site) :

- **`addMonitoredSite`** (ajout unitaire) : vérifie l'abonnement actif (`plan !== FREE`, `stripeCurrentPeriodEnd` dans le futur), compte les sites existants, compare à `maxSitesFor(plan)`, le tout **dans une transaction Prisma avec verrou explicite de ligne** (`SELECT 1 FROM "User" WHERE id = … FOR UPDATE`) — deux ajouts concurrents du même compte sont sérialisés, donc ne peuvent pas dépasser le quota ensemble.
- **`addMonitoredSitesBulk`** (import en masse, jusqu'à 100 lignes) : applique la **même** logique de quota (mêmes vérifications d'abonnement, même `maxSitesFor`), mais **sans le verrou `FOR UPDATE`** que possède `addMonitoredSite`. Voir Constat n°4 du rapport d'audit pour la conséquence exacte (course possible entre deux imports en masse concurrents du même compte).

Le prix payé ne peut pas non plus être choisi par le client : `priceIdForPlan`/`planForPriceId` (mêmes `lib/billing/plans.ts`) font de la table serveur `PRICE_ID_BY_PLAN` la seule autorité, et le webhook Stripe déduit toujours le plan du tarif que Stripe confirme avoir facturé (`fetchedSubscription`), jamais d'une valeur transmise par le client.
