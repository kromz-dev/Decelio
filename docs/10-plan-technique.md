# Plan technique — MVP Decelio

**Branche** : `main` | **Date** : 24 septembre 2026 | **Constitution** : `docs/08-constitution.md` (v1.0.0)
**Entrée** : `docs/09-prd-mvp.md` (exigences EF-xxx / ENF-xxx), `docs/07-design-system.md`, `docs/05-analyse-strategique.md` §3
**Dépôt de code** : `decelio/` (Next.js 16, TypeScript strict, Prisma 5 / PostgreSQL, Inngest, Stripe, Resend)
**Contrainte transverse** : budget **0 €**, fondateur solo, bootstrap à 100 % (PRD §14). Toute dépense n'est engagée qu'une fois couverte par le MRR.

Ce document est le plan **HOW** : il ne redéfinit ni les exigences (PRD `09`) ni les principes (constitution `08`), il documente comment les satisfaire avec l'existant du dépôt et ce qu'il reste à construire.

---

## 1. Résumé

Le moteur de scan (`lib/scanner/*`), l'authentification, la base Prisma, le cron Inngest, Stripe et Resend sont déjà en place. Le travail restant se répartit en trois masses : **(a)** raccorder les écrans à données fictives au réel (rapports, alertes, détail de site, paramètres, onboarding), **(b)** faire exister trois entités manquantes (`Client`, `AlertEvent`/journal réel, `MonthlyReport`) et appliquer le quota par plan, **(c)** choisir une pile d'hébergement à 0 € qui tient les budgets de performance de la constitution (scan isolé < 20 s, lot quotidien < 1 h) sans dépendre d'un service dont l'offre gratuite interdit l'usage commercial ou impose un plafond incompatible avec ces budgets.

## 2. Contexte technique

| Axe | Valeur |
|---|---|
| **Langage / version** | TypeScript strict, Next.js 16 (App Router), React 19 |
| **Dépendances principales** | Prisma 5 / PostgreSQL, NextAuth v5 (`@auth/prisma-adapter`), Inngest 4, Stripe 22, Resend 6, Zod 4, `ipaddr.js` (garde SSRF) |
| **Stockage** | PostgreSQL (Neon, voir §5) ; pas de stockage objet (S3, R2) budgété — les PDF de rapport sont stockés en base (`bytea`/`Buffer`), volume faible à l'échelle MVP |
| **Tests** | Vitest (`npx vitest run`), tests déjà présents sur `lib/scanner/*`, `inngest/functions/daily-scan.ts`, `app/api/scan/route.ts`, `app/api/auth/register/route.ts` |
| **Plateforme cible** | Web, navigateur moderne desktop + mobile ; e-mail transactionnel HTML ; PDF imprimable |
| **Type de projet** | Application web monolithique (Next.js full-stack), pas de micro-services (principe VI) |
| **Objectifs de performance** | ENF-004 (scan isolé < 20 s), ENF-005 (lot quotidien ≤ 1000 sites < 1 h) |
| **Contraintes** | Budget 0 € (ENF-016), hébergement France/UE priorisé, aucune intervention manuelle récurrente (ENF-015) |
| **Échelle** | Cible à 90 jours : 10 agences payantes, ≈ 200-600 sites surveillés au total (plans 10/30/100) |

## 3. Vérification de la constitution

| Principe | Statut du plan | Justification |
|---|---|---|
| I. Honnêteté de la mesure | Conforme | Le plan ne modifie pas le moteur de scan (hors périmètre, "en cours" ailleurs) ; les écrans raccordés au réel n'affichent que des données vérifiées (§7, §9) |
| II. Rien de promis n'est laissé non construit | Conforme, condition du plan | Priorité donnée au remplacement des écrans à données fictives (Phase P2/P3/Onboarding + Phase "Écrans restants" de `tasks/mvp-tasks.md`) avant toute extension de périmètre |
| III. Sécurité par défaut | Conforme | SSRF étendu à `addMonitoredSite` (EF-022, §10) ; rate limit déjà adossé à PostgreSQL, généralisé (§10) ; secrets en variables d'environnement de la plateforme d'hébergement, jamais commités |
| IV. Rigueur technique | Conforme | CI GitHub Actions exécute les 4 portes (`tsc`, `eslint`, `vitest`, `next build`) avant tout déploiement (§14) |
| V. Accessibilité AA | Conforme, à auditer | Les écrans raccordés au réel héritent des primitives `components/ui/*` déjà conformes AA (`docs/07-design-system.md` §6) ; audit explicite en fin de plan (tâche de qualité) |
| VI. Simplicité radicale | Conforme | Une seule application Next.js, un seul orchestrateur de jobs (Inngest), pas de flotte de services ; le rendu headless reste optionnel et non structurant |
| VII. Écriture produit en français | Conforme | Aucun nouveau texte d'interface n'est en anglais ; les gabarits d'e-mail (Resend) et le PDF sont en français |

**Verdict** : aucune violation nécessitant une entrée dans un tableau de complexité. Le plan est une exécution du PRD, pas une extension de périmètre.

## 4. Architecture

```
                                   Visiteur anonyme / agence connectée
                                                 │
                                                 ▼
                                   ┌─────────────────────────┐
                                   │   Application Next.js    │  ← hébergement 0 € (§5)
                                   │  (App Router, TS strict)  │     process persistant, pas de
                                   │                           │     découpage serverless par route
                                   │  app/(marketing)  scan     │
                                   │  app/(app)        portefeuille, alertes, rapports, paramètres │
                                   │  app/api/*         scan, audit, auth, webhooks, inngest         │
                                   └───────┬─────────┬────────┘
                                           │         │
                        SSRF-safe fetch    │         │  Prisma
                        (lib/scanner/*)    │         │
                                           ▼         ▼
                          ┌────────────────────┐   ┌─────────────────────┐
                          │  Sites cibles (tiers)│   │  PostgreSQL (Neon)   │  ← §5
                          │  robots.txt, HTML     │   │  User, MonitoredSite,│
                          │  challenges anti-bot   │   │  ScanLog, Client,    │
                          └────────────────────┘   │  AlertEvent, MonthlyReport, │
                                                     │  RateLimit, BrandSettings   │
                                                     └─────────────────────┘
                                           ▲
                                           │ événements + cron (webhook signé)
                                           │
                          ┌────────────────────────────────┐
                          │            Inngest (SaaS, 0 €)    │
                          │  cron 03:00 → fan-out par lot 500  │
                          │  scan-site (concurrence 10)        │
                          │  send-discovery-email (J+3)         │
                          │  generate-monthly-report (1er du mois)│
                          │  prune-scan-logs (1ᵉʳ du mois)       │
                          └────────────────────────────────┘

     Services annexes (0 €, appelés en sortie, jamais de dépendance bloquante) :
       Resend (e-mails)   Stripe (paiement + portail client)   PostHog UE (erreurs, mesure)
       Rendu headless optionnel (Playwright), seulement si hébergé gratuitement (§5, §9)
```

**Décision structurante** : l'application reste un **processus Next.js persistant** (`next start`), pas une fonction serverless par route. Raison développée en §5.2 : les offres serverless gratuites (Netlify, Cloudflare) plafonnent soit le temps CPU (10 ms sur Cloudflare Workers), soit la durée d'exécution synchrone (10 s sur Netlify), sous le budget ENF-004 (20 s) pour un scan multi-bots incluant `robots.txt`, l'accès et les sondes non vérifiées.

## 5. Pile 0 € retenue

Principe directeur (ENF-016) : chaque service a une offre gratuite qui autorise explicitement un usage commercial, ou son statut est marqué **à vérifier à l'inscription**. Un service dont l'usage commercial est interdit (Vercel Hobby) est exclu par construction.

### 5.1 Tableau récapitulatif

| Catégorie | Retenu | Pourquoi | Usage commercial | Limite structurante | Migration déclenchée par |
|---|---|---|---|---|---|
| Hébergement app | **Render — Free Web Service (région Francfort)** | Processus Node persistant : pas de plafond de temps CPU ni de timeout par requête serverless, compatible avec un scan à 20 s | Non interdit dans les CGU consultées ; Render déconseille seulement la *fiabilité* en production, ce n'est pas une clause d'interdiction — **à confirmer par écrit à l'inscription (ENF-016)** | Mise en veille après 15 min sans trafic, réveil ~1 min ; 750 h gratuites/mois par espace de travail (couvre un service unique 24 h/24) | Passage au plan payant (7 $/mois) dès le 1ᵉʳ client payant si le réveil dégrade la conversion du scan public |
| Hébergement app — repli | Netlify Free | Usage commercial explicitement autorisé (CGU) ; excellent support Next.js officiel | Confirmé | **Timeout synchrone 10 s** sur le plan gratuit — sous le budget ENF-004 (20 s) pour un scan complet ; nécessiterait de réduire le nombre de sondes par appel | À activer seulement si Render s'avère inutilisable (CGU défavorables ou instabilité constatée) |
| Hébergement app — exclu | Vercel Hobby | — | **Interdit explicitement** pour tout usage générant un revenu (paiement, SaaS) | — | Jamais tant que le compte reste Hobby |
| Base de données | **Neon — Free** | Postgres serverless, mise à l'échelle à zéro automatique et **reprise transparente** à la première requête (pas d'action manuelle) | Confirmé, conçu pour une vraie appli en production à trafic faible | 0,5 Go de stockage/projet, 100 CU-h/mois (≈ 400 h à 0,25 CU), mise en veille après 5 min d'inactivité non réglable ; CU-h épuisées = base **suspendue** jusqu'au mois suivant (vérifié le 24/09 sur neon.com) | Palier payant dès que le volume de `ScanLog`/`MonthlyReport` approche 0,5 Go (voir tâche de purge, §15) ou 100 h de calcul consommées |
| Base de données — repli | Supabase Free | Alternative équivalente | Confirmé | Le projet est **mis en pause après 7 jours sans activité base** (pas seulement sans visite) et la reprise peut nécessiter une action dans le tableau de bord — risque plus élevé qu'un simple délai d'autoscale | Non retenu par défaut : le cron quotidien devrait suffire à éviter la pause, mais le risque de blocage manuel est écarté en choisissant Neon |
| Jobs planifiés / événements | **Inngest — Hobby** | Déjà intégré (`inngest/functions/*`) ; cron + fan-out + retries gérés, aucune infrastructure de file à maintenir (principe VI) | Non restreint pour un compte payant à ses propres clients (Inngest facture l'orchestration, pas les revenus de l'app) | 50 000 exécutions/mois, **chaque step compte** (1 lancement + N steps), 5 steps concurrents, 500 000 événements/mois | Plafond vers 330 sites avec le `scan-site` actuel, vers 1 500 sites une fois les scans regroupés par lots (§8.1) : le regroupement doit précéder la prospection à volume |
| Jobs planifiés — repli | `node-cron` sur le même processus Render | Zéro dépendance externe si Inngest devient limitant | — | Perd la reprise sur erreur et l'observabilité par exécution qu'offre Inngest ; à éviter tant qu'Inngest suffit (principe VI : ne pas réinventer une file quand un service gratuit suffit) | Seulement si Inngest devient payant avant tout revenu |
| E-mail transactionnel | **Resend — Free** | Déjà intégré (`lib/alerting/sendAlert.ts`) | Non explicitement restreint ; le fournisseur qualifie le palier gratuit d'adapté au développement et à une "très petite" production — **volume à surveiller** | 3000 e-mails/mois, **100 e-mails/jour** | Palier payant (20 $/mois) dès que les alertes de régression + le questionnaire J+3 + les accusés de rapport mensuel dépassent 100/jour, plausible autour de 30-50 agences actives |
| Rendu headless (dépendance JS) | **Aucun par défaut** ; interface `Renderer` optionnelle (`lib/scanner/renderer.ts`) activable sur une instance Playwright si elle tourne gratuitement | Décision §14.4 du PRD : pas de service payant au stade MVP | — | Oracle Cloud Always Free (Ampere A1) est le seul candidat gratuit capable de faire tourner Chromium, mais **la capacité Ampere A1 a été réduite de moitié (4 → 2 OCPU, 24 → 12 Go) le 15 juin 2026 et son allocation dépend de la disponibilité régionale**, non garantie à l'inscription — **statut à vérifier avant toute dépendance produit** | Passage à un service géré (Browserless, etc.) uniquement une fois financé par le MRR (décision déjà actée) |
| PDF (rapport mensuel, export diagnostic) | **`@react-pdf/renderer`** (rendu par description de mise en page, sans navigateur) | Fonctionne sur un processus Node classique, donc sur l'hébergement retenu, sans dépendre du rendu headless incertain ci-dessus (§9) | Licence MIT, aucun coût | — | — |
| CI / qualité | **GitHub Actions** | Dépôt déjà sur GitHub | Gratuit illimité sur dépôt public ; 2000 min/mois sur dépôt privé | À surveiller si le dépôt reste privé et que les builds s'allongent | — |
| Observabilité / erreurs / mesure produit | **PostHog Cloud UE — gratuit** (remplace Sentry, voir `docs/decisions/ADR-001-posthog-remplace-sentry.md`) | Un seul outil pour les exceptions client et serveur et le parcours produit | Non précisé sur la page de tarifs : **à confirmer (T001)** | Par mois : 1 M d'événements, 100 000 exceptions, 5 000 enregistrements de session | Palier payant à l'usage si un quota est dépassé ; consentement RGPD à trancher avant la mise en ligne (ADR-001) |
| Mesure d'audience (marketing) | **Compteur maison** : route `app/api/beacon/route.ts` + table `PageView` minimaliste, sans cookie ni tiers | Respecte le principe VI (pas de nouvelle dépendance externe) et RGPD par construction (aucune donnée personnelle, pas de traceur tiers) | — | Rudimentaire : pas de tunnel de conversion détaillé | Umami auto-hébergé (MIT, léger, RGPD) dès qu'une instance dédiée existe (ex. si le rendu headless finit par justifier un VPS) |
| Domaine | Sous-domaine gratuit de l'hébergeur (`*.onrender.com` en développement) | Coût nul le temps de valider la traction | — | Image de marque moindre pour la prospection écrite | Achat de `decelio.app` (≈ 10-15 €/an) dès le premier client payant — seule dépense actée du plan |

### 5.2 Sources et vérification

- Vercel Hobby exclu pour usage commercial : [Vercel — Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines), [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby).
- Netlify Free autorise l'usage commercial : [forum Netlify — "I can use netlify free plan for commercial purposes?"](https://answers.netlify.com/t/i-can-use-netlify-free-plan-for-commercial-purposes/85760), [Accord d'abonnement self-serve Netlify](https://www.netlify.com/legal/self-serve-subscription-agreement/) ; timeout synchrone 10 s sur le plan gratuit : [forum Netlify — "Increase function timeout to 26s"](https://answers.netlify.com/t/increase-function-timeout-to-26s/106166).
- Limite de temps CPU Cloudflare Workers (10 ms sur le plan gratuit, le temps d'attente réseau n'est pas compté) : [Cloudflare Workers — Limits](https://developers.cloudflare.com/workers/platform/limits/) — retenu comme raison d'écarter Cloudflare Pages/Workers pour l'hébergement principal malgré son usage commercial non restreint.
- Render : mise en veille après 15 min, ~1 min de réveil, 750 h gratuites/mois par espace de travail, avis officiel déconseillant la production sans engagement contractuel identifié sur l'usage commercial (**à confirmer par écrit auprès de Render à l'inscription**) : agrégation de sources tierces (pas de CGU officielle consultée directement, accès réseau bloqué pendant la rédaction de ce plan) — voir note d'incertitude ci-dessous.
- Neon Free : usage commercial confirmé, autoscale à zéro avec reprise automatique, 0,5 Go/projet, 100 h de calcul/mois : agrégation de sources tierces citant la documentation Neon (accès direct à neon.com bloqué pendant la rédaction) — **à revérifier sur neon.com/docs à l'inscription**.
- Supabase Free : pause après 7 jours d'inactivité **base de données** (pas seulement d'inactivité de visite) : [Supabase Docs — Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).
- Inngest Hobby : 50 000 exécutions/mois, une exécution par lancement et par step, 5 steps concurrents : [Inngest — Pricing](https://www.inngest.com/pricing), consulté le 24/09/2026.
- Neon Free (0,5 Go, 100 CU-h, veille à 5 min non réglable, suspension si CU-h épuisées) : [Neon — Plans](https://neon.com/docs/introduction/plans), consulté le 24/09/2026.
- Resend Free (100 e-mails/jour, 3 000/mois, 10 requêtes/s) : [Resend — Account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits), consulté le 24/09/2026.
- Oracle Always Free — réduction de capacité Ampere A1 (4→2 OCPU, 24→12 Go) au 15 juin 2026 et dépendance à la disponibilité régionale : [InfoQ — "Oracle Quietly Halves Free Tier Ampere A1 Compute Limits"](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/), [Oracle Docs — Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).
- PostHog (gratuit) : 1 M d'événements, 100 000 exceptions, 5 000 enregistrements de session, 100 000 événements LLM par mois : [PostHog — Pricing](https://posthog.com/pricing), consulté le 24/09/2026. Rétention et usage commercial non précisés sur cette page.
- Koyeb : la recherche indique que Koyeb a fermé son palier gratuit "Starter" aux nouvelles inscriptions après son rachat par Mistral AI début 2026 — **écarté de ce plan pour cette raison, à ne pas retenir sans vérifier l'éligibilité d'un nouveau compte**.

**Points non vérifiés à traiter avant l'inscription définitive (ENF-016, tâche dédiée dans `tasks/mvp-tasks.md`)** : les CGU exactes de Render sur l'usage commercial (rien d'officiel consulté directement, accès réseau restreint pendant la rédaction de ce plan), l'usage commercial et la rétention du palier gratuit de PostHog. Les quotas Inngest, Neon, Resend et PostHog ont été relevés le 24/09/2026 sur les pages officielles.

**Nouvelle tentative le 26/09/2026, toujours non concluante par lecture automatisée** : `render.com/terms` et `render.com/acceptable-use` sont des pages construites en JavaScript côté client ; un outil de récupération de page n'y voit que le squelette de navigation, jamais le texte des clauses. Impossible de confirmer ou d'infirmer par ce moyen si le palier gratuit autorise l'usage commercial. Pour PostHog, `posthog.com/pricing` affiche « 97 % des entreprises utilisent PostHog gratuitement » — signal indirect que l'usage commercial est courant — mais ni cette page ni `posthog.com/terms` ne donnent de clause explicite sur l'usage commercial ou la durée de rétention du palier gratuit dans le contenu récupérable automatiquement. **Ces deux points restent donc non vérifiés par une source citable.** Une note ajoutée le 26/09 dans `PROGRESS.md` affirmait ces CGU « vérifiées », sans lien ni citation — à corriger ou à sourcer par qui l'a écrite (probablement une lecture directe dans un navigateur connecté, que les outils automatisés ne reproduisent pas). Vérification définitive : lire les deux pages dans un vrai navigateur, éventuellement écrire au support Render pour obtenir une confirmation écrite (ce que ce plan recommandait déjà en §8).

## 6. Modèle de données cible

Le schéma actuel (`decelio/prisma/schema.prisma`) reste la base. Ajouts nécessaires, sans supprimer les modèles `Site`/`Page`/`BotScan`/`ScanResult` (V2, dormants, PRD §9) :

```prisma
model Client {
  id        String   @id @default(cuid())
  userId    String
  name      String
  createdAt DateTime @default(now())

  user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  sites MonitoredSite[]

  @@index([userId])
}

model MonitoredSite {
  // ... champs existants inchangés ...
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
}

model BrandSettings {
  userId      String   @id
  displayName String?
  logoUrl     String?
  accentColor String?
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

/// Une ligne par alerte réellement envoyée : remplace le tableau fictif de
/// app/(app)/alerts/page.tsx (EF-037) et sert de source à AlertEvent.type
/// pour distinguer régression / retour au vert (EF-036).
model AlertEvent {
  id         String   @id @default(cuid())
  siteId     String
  type       String   // "REGRESSION" | "RECOVERY"
  oldStatus  String
  newStatus  String
  cause      String?  // ex. "robots.txt disallows GPTBot"
  fix        String?  // correctif suggéré, texte court
  channel    String   @default("EMAIL")
  sentAt     DateTime @default(now())

  site MonitoredSite @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@index([siteId, sentAt(sort: Desc)])
}

/// Un rapport généré par client et par période (EF-047 à EF-051).
model MonthlyReport {
  id          String   @id @default(cuid())
  userId      String
  clientId    String?
  periodStart DateTime
  periodEnd   DateTime
  pdf         Bytes    // stocké en base : volume faible au stade MVP, pas de S3 payant
  availability Float
  incidentCount Int
  generatedAt DateTime @default(now())

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  client Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  @@index([userId, periodStart])
}

model User {
  // ... champs existants inchangés ...
  isFounderMember  Boolean   @default(false)
  founderOfferAt   DateTime?

  // Acceptation des CGV : date et version acceptées. Nullables parce que les
  // comptes créés avant cette fonctionnalité n'ont accepté aucune version —
  // `NULL` est ici l'information exacte, pas une valeur manquante à rattraper.
  // La version de référence vit dans `lib/legal/terms.ts` ; la règle qui dit
  // quand l'augmenter est en commentaire dans ce même fichier.
  termsAcceptedAt DateTime?
  termsVersion    String?

  clients        Client[]
  brandSettings  BrandSettings?
  monthlyReports MonthlyReport[]
}
```

**Quotas de plan** : pas de nouvelle table — extension de `lib/billing/plans.ts` avec une table de correspondance `Plan -> { maxSites: number; whiteLabel: boolean }` (`FREE: 0`, `SOLO: 10`, `PRO: 30`, `SCALE: 100`), lue par `addMonitoredSite`/`addMonitoredSitesBulk` (EF-018).

**Stockage du résultat de scan v2** : `ScanLog.payload` (JSON du `CoreScanOutput`, déjà présent) reste la source de vérité brute. Pour permettre des requêtes d'historique efficaces (EF-043 à EF-045) sans reparser le JSON à chaque affichage, `ScanLog` gagne des colonnes dérivées :

```prisma
model ScanLog {
  // ... champs existants inchangés ...
  simpleStatus String? // "OK" | "BLOQUÉ" | "COQUILLE VIDE" | "ERREUR", dupliqué de MonitoredSite.status au moment du scan
  cause        String? // premier élément de ScanCoreResult.reasons
}
```

## 7. Contrats

### 7.1 `/api/scan` (diagnostic public)

Forme actuelle, produite par `runCoreScan` (`lib/scanner/core.ts`) — ce plan ne change pas cette forme, il l'expose pour les tâches d'UI qui en dépendent (EF-001, EF-002) :

```ts
// Réponse de POST /api/scan (après T015 : bots = DEFAULT_PROBE_BOTS au lieu de ["GPTBot"])
interface ScanApiResponse extends ScanCoreResult {
  report: ScanReport; // rapport complet (robots, access, jsDependency, indexing)
}

interface ScanCoreResult {
  agent: BotAgent;                                   // "GPTBot" | "ClaudeBot" | "PerplexityBot" | ...
  simpleStatus: "OK" | "BLOQUÉ" | "COQUILLE VIDE" | "ERREUR";
  reasons: string[];                                 // cause(s), dans l'ordre de gravité
  httpStatus: number;
  durationMs: number;
  wordCount: number;
}
```

Erreurs : `400` (URL invalide), `403` (refus SSRF), `429` (`Retry-After` en en-tête, quota dépassé), `500` (erreur interne, jamais de détail réseau exposé — ENF-001).

### 7.2 Server actions (`"use server"`)

| Action | Fichier | Entrée | Sortie | Sécurité |
|---|---|---|---|---|
| `getMonitoredSites` | `app/actions/sites.ts` | — | `{ data: MonitoredSite[] } \| { error }` | Filtré par `session.user.id` |
| `addMonitoredSite` | `app/actions/sites.ts` | `{ name, url, clientId? }` | `{ data } \| { error }` | Abonnement actif + **quota du plan (EF-018, T019)** + `assertSafeUrl` (EF-022, T020) |
| `addMonitoredSitesBulk` (nouveau) | `app/actions/sites.ts` | `{ lines: string[] } \| { csv: string }` | `{ added: MonitoredSite[]; skipped: { line: string; reason: string }[] }` | Même garde que ci-dessus, dé-duplication avant écriture (EF-019) |
| `deleteMonitoredSite` | `app/actions/sites.ts` | `id` | `{ success: true } \| { error }` | Isolation stricte par `userId` (déjà en place) |
| `generateMonthlyReport` (nouveau) | `app/actions/reports.ts` | `{ clientId?, periodStart, periodEnd }` | `{ data: MonthlyReport } \| { error }` | Réservé aux plans `PRO`/`SCALE` (EF-048) |
| `updateBrandSettings` (nouveau) | `app/actions/settings.ts` | `{ displayName, logoUrl, accentColor }` | `{ data } \| { error }` | Réservé aux plans `PRO`/`SCALE` |
| `createCheckoutSession` | `lib/billing/actions.ts` | `plan: string`, `couponCode?` (nouveau) | Redirection Stripe | Résolution du tarif **côté serveur uniquement** (déjà en place) |
| `createCustomerPortalSession` | `lib/billing/actions.ts` | — | Redirection Stripe | `stripeCustomerId` de l'utilisateur connecté uniquement |

## 8. Jobs planifiés (Inngest)

| Job | Déclencheur | Fichier | Description | EF/ENF |
|---|---|---|---|---|
| `daily-scan-dispatcher` | cron `0 3 * * *` | `inngest/functions/daily-scan.ts` | Répartit tous les `MonitoredSite` actifs en événements `app/scan.site`, par lots de 500 (déjà en place) | EF-024, ENF-005 |
| `scan-single-site` | événement `app/scan.site` | `inngest/functions/scan-site.ts` | Scanne un site (`runCoreScan` étendu à tous les bots de rapport, T023), journalise (`ScanLog` enrichi, §6), met à jour le statut, déclenche l'alerte si changement | EF-025, EF-026, EF-027, EF-030 |
| `send-regression-alert` (logique intégrée à `scan-single-site`) | changement de statut détecté | `lib/alerting/sendAlert.ts` | E-mail avec cause + correctif, distinct régression/retour au vert, journalisé dans `AlertEvent` | EF-033 à EF-037 |
| `send-discovery-email` (nouveau) | cron horaire, filtre `createdAt` à J+3, ou événement différé Inngest (`step.sleepUntil`) déclenché à l'inscription | `inngest/functions/discovery-email.ts` | E-mail des 5 questions de découverte (kit `docs/06`) | EF-064 |
| `generate-monthly-report` (nouveau) | cron `0 6 1 * *` (1ᵉʳ du mois) + déclenchement à la demande via `generateMonthlyReport` | `inngest/functions/monthly-report.ts` | Agrège `ScanLog`/`AlertEvent` de la période close, génère le PDF (§9), écrit `MonthlyReport`, envoie l'e-mail "rapport disponible" | EF-047, EF-049, EF-051 |
| `prune-scan-logs` (T056) | cron `0 4 1 * *` (1ᵉʳ du mois) | `inngest/functions/prune-scan-logs.ts` | Vide `ScanLog.payload` au-delà de 90 jours, une seule requête dans un seul step | ENF-016 (stockage Neon) |

**Pas de `keep-alive` sur Inngest** (décision du 24/09, remplace l'entrée prévue ici) : un ping toutes les 10 min coûterait environ 4 300 exécutions de fonction par mois, plus une par step (voir §8.1). Le réveil de Render passe par un pinger externe gratuit (tâche T003) sur `GET /api/health`, route qui **ne doit jamais interroger la base** : sinon Neon ne se met jamais en veille et consomme 720 h × 0,25 CU = 180 CU-h par mois, au-delà des 100 CU-h gratuites.

### 8.1 Budget d'exécutions Inngest (vérifié le 24/09 sur inngest.com/pricing)

Inngest Hobby compte **une exécution par lancement de fonction et une par step**. Une fonction à 5 `step.run` coûte 6 exécutions. Le plafond est de 50 000 exécutions par mois.

| Poste | Coût par mois | Remarque |
|---|---|---|
| `scan-site`, forme actuelle (1 lancement + 4 steps, + 1 si alerte) | ≈ 150 par site | Plafond atteint vers **330 sites** |
| `scan-site` par lots de 10 sites, 1 step par site | ≈ 33 par site | Plafond vers **1 500 sites** : c'est la forme à viser (T023/T055) |
| `daily-scan-dispatcher` | ≈ 90 + 1 step par tranche de 500 sites | Négligeable |
| `send-discovery-email` (T046) | ≈ 90 + 2 par nouveau compte | Négligeable |
| `prune-scan-logs` (T056) | 2 | Négligeable |

**Dédoublonnage des alertes (EF-034)** : déjà garanti par la comparaison `oldStatus !== newStatus` dans `scan-site.ts` — aucune modification nécessaire, seulement l'enrichissement de la cause (T025).

## 9. Rapport PDF (0 €)

**Choix** : [`@react-pdf/renderer`](https://react-pdf.org/) — composition du PDF par des composants React déclaratifs (`<Document>`, `<Page>`, `<View>`, `<Text>`), rendu par un moteur de mise en page en JavaScript pur, **sans navigateur headless**. Ce choix est délibérément indépendant de la disponibilité incertaine du rendu Playwright (§5.1) : le rapport mensuel — fonctionnalité anti-résiliation numéro un (PRD §12) — ne doit pas dépendre d'une capacité Oracle Cloud qui peut ne jamais être disponible dans une région donnée.

- Fonction pure `lib/reports/renderMonthlyReportPdf.ts` : prend les données agrégées (verdict actuel et historique par domaine, incidents datés, réponse brute en annexe, identité de marque) et retourne un `Buffer`.
- Utilisée à deux endroits : `generateMonthlyReport` (rapport client, marque blanche, EF-047 à EF-051) et l'export du diagnostic public (`app/actions/publicReport.ts`, au logo Decelio, EF-011).
- Le document du diagnostic public **n'inclut jamais** l'identité de l'agence (marque blanche réservée aux comptes payants, cohérent avec EF-011 et EF-048).
- Testable unitairement (rendu déterministe à partir de données figées), sans navigateur ni service externe — cohérent avec la stratégie de test (§13).

## 10. Sécurité

| Sujet | État | Action du plan |
|---|---|---|
| SSRF (scan public, scan planifié) | `assertSafeUrl`/`crawlUrl` déjà robustes (résolution DNS, refus des plages non-unicast, revalidation de chaque redirection) | Réutiliser telle quelle dans `addMonitoredSite`/`addMonitoredSitesBulk` (EF-022, T020) — ne jamais dupliquer la logique |
| Limitation de débit | Adossée à PostgreSQL (`lib/rate-limit.ts`), déjà utilisée par `/api/scan`, `/api/audit`, l'inscription | Étendre à `addMonitoredSitesBulk` (import de masse) pour éviter l'abus par un compte payant |
| Authentification | NextAuth v5, session base de données | Ajouter la réinitialisation de mot de passe par e-mail (EF-014, absente aujourd'hui) |
| Autorisation des tarifs Stripe | Résolution serveur uniquement (`lib/billing/plans.ts`) | Inchangé ; le coupon fondateur (§14 PRD) est un objet Stripe natif, jamais un pourcentage calculé côté client. Coupon créé en mode test le 24/09 (T037) : id `FONDATEUR50` (et non `founder-50`), −50 %, `duration: forever`, `max_redemptions: 10`. Le serveur ne l'accepte que s'il correspond à `STRIPE_FOUNDER_COUPON`. À recréer à l'identique en mode live. |
| Secrets | Variables d'environnement (`.env.example` déjà exhaustif) | Répliquer dans les variables d'environnement Render + GitHub Actions (secrets chiffrés), jamais dans un fichier commité |
| RGPD | Champs `purgeAt`/`dataExportedAt` déjà en base, non exposés | Exposer dans les paramètres (EF-015, T041) ; purge à 60 j déjà programmée par le webhook Stripe (EF-056). L'acceptation des CGV est enregistrée comme une donnée explicite sur `User` (date + version du texte accepté), à l'inscription par e-mail (`app/api/auth/register/route.ts`) et à la première connexion Google (événement `createUser` dans `auth.ts`). La valeur enregistrée n'est jamais réécrite : un compte garde la version qu'il a acceptée ce jour-là |

## 11. Observabilité

- **Erreurs** : PostHog (Cloud UE, gratuit) sur le serveur (`posthog-node`) et le client (`posthog-js`, `capture_exceptions`), capture des échecs de scan, d'envoi d'alerte et de génération de rapport (ENF-009, ADR-001).
- **Journalisation applicative** : remplacer les `console.error`/`console.warn` isolés (`scan-site.ts`, `sendAlert.ts`) par un appel structuré incluant `siteId`, `bot`, `cause` — exploitable sans grep manuel.
- **Suivi des jobs** : le tableau de bord Inngest (inclus dans l'offre gratuite) donne déjà l'historique d'exécution, les retries et les échecs par fonction — pas d'outil supplémentaire nécessaire (principe VI).
- **Alerte sur soi-même** : le pinger externe gratuit qui empêche la mise en veille Render (§8, T003) sert aussi de sonde de disponibilité, avec son propre e-mail d'alerte en cas d'échec répété.

## 12. Stratégie de test

- **Unitaire** (`npx vitest run`) : logique pure (`lib/scanner/*`, déjà couvert), quotas de plan, sélection de règle robots.txt, agrégation du rapport mensuel, rendu du PDF (comparaison de structure, pas de pixel).
- **Intégration** : scénarios Inngest via `step.run` mocké (déjà le patron de `daily-scan.test.ts`) pour `scan-site` (régression → alerte → pas de doublon) et `monthly-report`.
- **Contrat** : réponse de `/api/scan` (forme `ScanApiResponse`, §7.1) et des server actions critiques (`addMonitoredSite` refuse au-delà du quota, `addMonitoredSitesBulk` dé-duplique).
- **Manuel, avant ouverture de la prospection** : les 50 sites vérifiés à la main exigés par le PRD (§10, critère de sortie) — hors périmètre de Vitest, processus documenté séparément par le fondateur.
- **Accessibilité** : vérification manuelle AA (contraste, clavier, cibles tactiles) sur chaque écran nouvellement raccordé au réel, avant qu'il ne quitte l'état "maquette".

## 13. Plan de déploiement

1. **CI** (GitHub Actions, `.github/workflows/ci.yml`) : sur chaque push/PR, exécute dans l'ordre `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`. Aucune fusion sur `main` sans les quatre portes vertes (constitution, portes de qualité).
2. **Migrations** : `npx prisma migrate deploy` exécuté en étape de déploiement (avant le démarrage du nouveau processus), jamais `db push` en production. La base de production n'a aucun historique de migrations Prisma (elle a été montée par `db push`), donc `migrate deploy` ne peut pas tourner tel quel : un baseline est nécessaire au préalable, procédure détaillée dans `docs/runbooks/deploiement-render-neon.md`. Pour un changement additif comme l'acceptation des CGV (§6), la migration doit tourner avant que le nouveau processus ne serve du trafic, sinon le code écrit dans des colonnes absentes — c'est déjà le cas puisque `render.yaml` chaîne `migrate deploy` dans son `buildCommand`.
3. **Déploiement continu** : push sur `main` → build Next.js → déploiement sur Render (service unique, région Francfort). Variables d'environnement répliquées depuis `.env.example`.
4. **Bascule Inngest** : `INNGEST_SIGNING_KEY` et l'URL publique de `/api/inngest` enregistrées dans le tableau de bord Inngest à chaque changement d'hébergeur (pas d'automatisation nécessaire au stade MVP, un seul environnement de production).
5. **Domaine** : sous-domaine `*.onrender.com` jusqu'au premier client payant, puis `decelio.app` (DNS pointé vers Render), TLS géré par l'hébergeur.
6. **Rollback** : Render conserve les déploiements précédents ; un rollback est une action manuelle depuis son tableau de bord (pas d'automatisation dédiée au stade solo-fondateur, cohérent avec le principe VI).

## 14. Risques

| Risque | Impact | Parade |
|---|---|---|
| Les CGU exactes de Render sur l'usage commercial ne sont pas confirmées par écrit (accès direct bloqué pendant la rédaction de ce plan) | Un hébergeur pourrait suspendre le compte en cours de route | Confirmer par écrit (formulaire de support Render) avant tout encaissement Stripe réel ; repli documenté sur Netlify (§5) si la réponse est défavorable |
| Mise en veille Render (15 min d'inactivité) dégrade le premier scan public d'un visiteur après une période creuse | Repousse l'objectif "scan → inscription ≥ 10 %" | Pinger externe gratuit sur `GET /api/health`, route sans accès base (§8), à vérifier en conditions réelles avant la prospection à grande échelle |
| Capacité Oracle Always Free (Ampere A1) non garantie dans une région UE | Le rendu headless (option EF-029) reste indisponible plus longtemps que prévu | Déjà accepté par la décision §14.4 du PRD : l'indicateur de dépendance JS reste étiqueté comme approximatif tant que le rendu n'est pas branché — aucune dépendance produit bloquante |
| Stockage Neon (0,5 Go/projet) atteint par l'accumulation de `ScanLog.payload` (JSON complet par scan) | Blocage des écritures en base | Purge du payload au-delà de 90 jours (T056, livrée) ; n'écrire le payload que si `simpleStatus` ou `cause` change par rapport au scan précédent (T023) |
| Exécutions Inngest (50 000/mois, chaque step compte) épuisées par le scan quotidien | Plus aucun scan ni alerte jusqu'au mois suivant | Regrouper les scans par lots de 10 sites avec 1 step par site (§8.1) avant de dépasser 300 sites ; aucun job récurrent de confort sur Inngest |
| CU-h Neon (100/mois) épuisées par une activité qui empêche la veille | Base suspendue jusqu'au mois suivant | Aucun ping récurrent vers une route qui lit la base ; surveiller la consommation CU-h dans la console Neon chaque semaine après le lancement |
| Volume d'e-mails Resend (100/jour) dépassé par la combinaison alertes + J+3 + rapports mensuels à mesure que le portefeuille grandit | Alertes de régression retardées — risque direct pour le principe I (crédibilité de la mesure) | Un seul e-mail récapitulatif par agence et par passage du scan, jamais un par site (T025/T026) ; suivre le compteur mensuel Resend dès 5 agences actives ; palier payant (20 $/mois) largement couvert par le MRR cible (1000 €) |
| L'usage commercial et la rétention du palier gratuit de PostHog ne sont pas précisés sur sa page de tarifs (les quotas Inngest, Neon, Resend et PostHog ont été relevés le 24/09/2026 sur les pages officielles) | Une restriction découverte tard obligerait à changer d'outil de mesure | Confirmation écrite dans le cadre de T001, avant tout encaissement Stripe réel |

## 15. Traçabilité exigences → sections

| Exigence(s) | Section(s) de ce plan |
|---|---|
| EF-001, EF-002, EF-008 | §4 (architecture), §7.1 (contrat `/api/scan`) |
| EF-010, ENF-001, ENF-002 | §10 (sécurité) |
| EF-011 | §9 (rapport PDF) |
| EF-014, EF-015 | §10 (sécurité), §6 (RGPD déjà en base) |
| EF-018, EF-019, EF-021, EF-022 | §6 (quotas, modèle), §7.2 (contrats server actions) |
| EF-024 à EF-032 | §8 (jobs) |
| EF-033 à EF-038 | §6 (`AlertEvent`), §8 (jobs) |
| EF-039 à EF-046 | §6 (`ScanLog` enrichi) |
| EF-047 à EF-052 | §6 (`Client`, `MonthlyReport`, `BrandSettings`), §9 (PDF) |
| EF-053 à EF-060 | §7.2 (`createCheckoutSession`, coupon), §10 (sécurité Stripe) |
| EF-061 à EF-067 | §8 (`send-discovery-email`), §7.2 (onboarding) |
| ENF-004, ENF-005 | §4 (choix d'hébergement persistant), §14 (risque mise en veille) |
| ENF-007 | §13 (stratégie de test, audit AA) |
| ENF-009 | §11 (observabilité) |
| ENF-010 | §13 (CI, quatre portes) |
| ENF-014, ENF-016 | §5 (pile 0 €) |
| ENF-015 | §8 (jobs planifiés, aucune intervention manuelle) |

---

*Ce plan technique dépend du PRD `docs/09-prd-mvp.md` et de la constitution `docs/08-constitution.md`. Toute évolution des exigences qu'il exécute doit d'abord modifier ces deux documents.*
