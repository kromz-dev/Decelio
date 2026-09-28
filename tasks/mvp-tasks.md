# Tâches : MVP Decelio

**Entrées** : `docs/09-prd-mvp.md` (exigences EF-xxx/ENF-xxx), `docs/10-plan-technique.md` (architecture, pile 0 €, contrats), `docs/08-constitution.md` (portes de qualité)
**Constitution** : quatre portes obligatoires avant toute fusion — `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
**Hors périmètre** : le moteur de scan de bas niveau (`lib/scanner/crawler.ts`, `robots.ts`, `analyzer.ts`, `agents.ts`) est corrigé par un autre ingénieur (statut *En cours* du PRD) — aucune tâche ci-dessous ne le modifie, seulement les points d'appel (`runCoreScan`, nombre de bots demandés).

## Format

`[ID] [P?] [PHASE] Description` — `fichier(s) principaux`
- **Dépendances** : tâches devant être terminées avant celle-ci, ou "Aucune"
- **EF/ENF** : exigences du PRD couvertes
- **Vérification** : ce qui prouve que la tâche est faite
- **Taille** : S (1-2 fichiers) / M (3-5 fichiers) / L (5-8 fichiers, à éviter — déjà scindée ci-dessous si besoin)

`[P]` = parallélisable (fichiers différents, aucune dépendance entre elles).

**Priorité annoncée par le PRD (risque n°1)** : le quota de sites non appliqué (EF-018) et les écrans à données fictives perçus comme fonctionnels sont le risque de crédibilité et de fuite de revenu le plus immédiat. En conséquence : **T019 (quota)** ouvre la phase P2 avant toute tâche de confort, et chaque écran à données fictives est raccordé au réel **dans la même phase que la fonctionnalité qu'il affiche** plutôt que reporté à la fin — la Phase 8 ne couvre que les écrans restants qui ne rentrent dans aucune fonctionnalité verticale.

---

## Phase 1 : Setup / infra 0 €

**But** : rendre le dépôt déployable en continu sur la pile décrite dans `docs/10-plan-technique.md` §5, avant d'écrire la moindre fonctionnalité produit.

- [ ] **T001** [P] [SETUP] Créer les comptes des services 0 € retenus (Render, Neon, Inngest, Resend, PostHog, Stripe en mode test) et consigner les identifiants de projet (pas les secrets) dans une note d'exploitation privée du fondateur — `docs/10-plan-technique.md` (mise à jour de la section "points non vérifiés" une fois confirmée)
  - **Dépendances** : Aucune
  - **EF/ENF** : ENF-016
  - **Vérification** : chaque service confirme par écrit (support ou CGU consultées directement) l'autorisation d'usage commercial de son offre gratuite ; le plan technique est mis à jour si un chiffre diffère de ce qui y est documenté
  - **Taille** : S

- [x] **T002** [P] [SETUP] Pipeline CI GitHub Actions exécutant les quatre portes de qualité — `.github/workflows/ci.yml`
  - **Dépendances** : Aucune
  - **EF/ENF** : ENF-010
  - **Vérification** : une pull request avec une erreur de typage volontaire échoue le job CI ; une PR propre passe les quatre étapes (`tsc --noEmit`, `lint`, `vitest run`, `build`)
  - **Taille** : S

- [ ] **T003** [SETUP] Déploiement continu Render (région Francfort) branché sur `main` — `render.yaml` (ou configuration via tableau de bord, documentée dans `docs/10-plan-technique.md`)
  - **Dépendances** : T001
  - **EF/ENF** : ENF-016
  - **Vérification** : un push sur `main` déclenche un déploiement visible et le service répond sur son URL `*.onrender.com`
  - **Taille** : S

- [ ] **T004** [P] [SETUP] Provisionner la base Neon et pointer `DATABASE_URL` de production, exécuter `npx prisma migrate deploy` — variables d'environnement Render
  - **Dépendances** : T001
  - **EF/ENF** : —
  - **Vérification** : `npx prisma migrate status` ne signale aucune migration en attente sur l'environnement de production
  - **Taille** : S

- [x] **T005** [P] [SETUP] Intégrer PostHog (Cloud UE) pour les exceptions client et serveur et la mesure produit, en remplacement de Sentry (`docs/decisions/ADR-001-posthog-remplace-sentry.md`) — `decelio/app/providers.tsx`, `decelio/app/global-error.tsx`, `decelio/lib/posthog-ai.ts`, `decelio/app/layout.tsx` (amorcé en local par le fondateur, non commité au 24/09)
  - **Dépendances** : T001
  - **EF/ENF** : ENF-009
  - **Vérification** : une erreur provoquée manuellement côté client et côté serveur apparaît dans PostHog sous 1 minute ; sur les pages marketing, aucun cookie ni `localStorage` PostHog n'est écrit avant consentement (ou le mode sans persistance est actif), comme le prévoit l'ADR-001
  - **Taille** : S

- [x] **T006** [P] [SETUP] Route de compteur d'audience RGPD-safe (pas de cookie, pas de tiers) — `app/api/beacon/route.ts`, appel `navigator.sendBeacon` depuis `app/(marketing)/layout.tsx`
  - **Dépendances** : Aucune
  - **EF/ENF** : —
  - **Vérification** : une visite sur une page marketing incrémente une ligne agrégée en base, aucune requête sortante vers un domaine tiers n'apparaît dans l'onglet réseau
  - **Taille** : S

**Point de contrôle Phase 1** : le dépôt se déploie automatiquement sur Render à chaque push sur `main`, la base de production est migrée, les erreurs et le trafic marketing sont visibles quelque part. Aucune fonctionnalité produit n'a encore été touchée.

---

## Phase 2 : Fondations données

**But** : faire exister en base les entités qui manquent avant que les phases fonctionnelles ne puissent les utiliser.

- [x] **T007** [FONDATIONS] Ajouter le modèle `Client` et le lien optionnel `MonitoredSite.clientId` — `decelio/prisma/schema.prisma`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-047, EF-052
  - **Vérification** : `npx prisma format` et `npx prisma validate` passent ; un site sans client reste valide (champ optionnel)
  - **Taille** : S

- [x] **T008** [FONDATIONS] Table de correspondance quota par plan — `decelio/lib/billing/plans.ts` (`PLAN_LIMITS: Record<Plan, { maxSites: number; whiteLabel: boolean }>`)
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-018
  - **Vérification** : test unitaire `lib/billing/plans.test.ts` couvrant `FREE` (0 site), `SOLO` (10), `PRO` (30), `SCALE` (100)
  - **Taille** : S

- [x] **T009** [P] [FONDATIONS] Ajouter le modèle `BrandSettings` (1-1 avec `User`) — `decelio/prisma/schema.prisma`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-048, EF-050
  - **Vérification** : `npx prisma validate` passe
  - **Taille** : S

- [x] **T010** [P] [FONDATIONS] Ajouter les champs `isFounderMember`/`founderOfferAt` sur `User` — `decelio/prisma/schema.prisma`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-058, EF-067
  - **Vérification** : `npx prisma validate` passe
  - **Taille** : S

- [x] **T011** [FONDATIONS] Ajouter le modèle `AlertEvent` (type régression/résolution, cause, correctif, canal, date) — `decelio/prisma/schema.prisma`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-036, EF-037
  - **Vérification** : `npx prisma validate` passe ; un index `(siteId, sentAt desc)` existe pour l'historique
  - **Taille** : S

- [x] **T012** [FONDATIONS] Ajouter le modèle `MonthlyReport` (rapport par client/période, PDF en `Bytes`, disponibilité, incidents) — `decelio/prisma/schema.prisma`
  - **Dépendances** : T007
  - **EF/ENF** : EF-047, EF-049, EF-051
  - **Vérification** : `npx prisma validate` passe
  - **Taille** : S

- [x] **T013** [FONDATIONS] Étendre `ScanLog` avec `simpleStatus` et `cause` dérivés du `CoreScanOutput` — `decelio/prisma/schema.prisma`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-043, EF-044, EF-045
  - **Vérification** : `npx prisma validate` passe ; les colonnes sont nullables (compatibles avec les lignes existantes)
  - **Taille** : S

- [x] **T014** [FONDATIONS] Migration Prisma unique regroupant T007-T013 et application en local puis en production — `decelio/prisma/migrations/` — migration générée, `migrate deploy` en prod reste à faire avec T004
  - **Dépendances** : T007, T008, T009, T010, T011, T012, T013
  - **EF/ENF** : —
  - **Vérification** : `npx prisma migrate dev --name mvp-entities` en local sans erreur ; `npx prisma migrate deploy` en production (via T004) sans perte de données existantes
  - **Taille** : S

**Point de contrôle Phase 2** : le schéma cible existe en base, en local et en production, sans qu'aucune fonctionnalité ne l'utilise encore. Les quatre portes de qualité passent toujours.

---

## Phase 3 : P1 — Diagnostic public

**But** : afficher un verdict honnête par assistant sur le diagnostic gratuit, condition de l'objectif "scan → inscription ≥ 10 %". Dépend du moteur de scan déjà livré dans `lib/scanner/*` (hors périmètre de ces tâches).

- [x] **T015** [P1] Adapter `POST /api/scan` pour retourner un rapport multi-bots (`runCoreScan(url, DEFAULT_PROBE_BOTS)` au lieu de `["GPTBot"]`) — `decelio/app/api/scan/route.ts`
  - **Dépendances** : Aucune (le moteur `runCoreScan` gère déjà plusieurs bots)
  - **EF/ENF** : EF-001, EF-002
  - **Vérification** : la réponse contient un tableau de résultats pour ChatGPT (GPTBot), Claude (ClaudeBot) et Perplexity (PerplexityBot), chacun avec ses propres `reasons`
  - **Taille** : S

- [x] **T016** [P1] Afficher un verdict par assistant avec cause et correctif sur la page de résultat — `decelio/components/home/ScanForm.tsx`
  - **Dépendances** : T015
  - **EF/ENF** : EF-001, EF-002, décision §14.3 du PRD
  - **Vérification** : test manuel sur un site avec `robots.txt` bloquant un seul bot — les trois verdicts restent visuellement distincts (composant `Verdict`, jamais fondus)
  - **Taille** : M

- [x] **T017** [P1] Export PDF du diagnostic public, au logo Decelio — `decelio/app/actions/publicReport.ts`, `decelio/lib/reports/renderDiagnosticPdf.ts`
  - **Dépendances** : T016, T031 (moteur PDF partagé — voir Phase 5, réutilisé ici en avance)
  - **EF/ENF** : EF-011
  - **Vérification** : le PDF généré contient les trois verdicts et ne porte aucune marque blanche cliente
  - **Taille** : M

- [x] **T018** [P] [P1] Étendre le test de contrat de `/api/scan` à la forme multi-bots — `decelio/app/api/scan/route.test.ts`
  - **Dépendances** : T015
  - **EF/ENF** : EF-001, EF-002
  - **Vérification** : `npx vitest run app/api/scan/route.test.ts` vert, couvre au moins un cas "robots.txt bloque un bot mais pas les autres"
  - **Taille** : S

**Point de contrôle Phase 3** : un visiteur anonyme obtient un verdict honnête par assistant, exportable en PDF, sans compte. Scénarios d'acceptation P1 du PRD vérifiables manuellement.

---

## Phase 4 : P2 — Portefeuille, scan quotidien, alertes

**But** : la valeur payante centrale. **T019 ouvre cette phase avant tout confort d'interface**, conformément au risque n°1 du PRD (quota non appliqué = fuite de revenu).

- [x] **T019** [P2] **Appliquer le quota de sites par plan** — `decelio/app/actions/sites.ts::addMonitoredSite`
  - **Dépendances** : T008
  - **EF/ENF** : EF-018
  - **Vérification** : test `app/actions/sites.test.ts` — un compte `SOLO` avec 10 sites déjà actifs reçoit une erreur orientant vers le palier supérieur au 11ᵉ ajout, jamais une erreur technique générique
  - **Taille** : S

- [x] **T020** [P2] Valider l'URL (format + garde SSRF, réutilisation de `assertSafeUrl`) avant création d'un `MonitoredSite` — `decelio/app/actions/sites.ts`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-022
  - **Vérification** : test — une URL résolvant vers une IP privée est refusée sans créer de ligne en base
  - **Taille** : S

- [x] **T021** [P2] Ajout en masse (collage de domaines ou CSV), dé-duplication, quota — `decelio/app/actions/sites.ts::addMonitoredSitesBulk`
  - **Dépendances** : T019, T020
  - **EF/ENF** : EF-019
  - **Vérification** : test — 25 lignes dont 3 doublons et 2 invalides sur un plan à 10 sites restants ajoute exactement 10 sites valides et rapporte les 15 lignes ignorées avec leur raison
  - **Taille** : M

- [x] **T022** [P2] Unifier le point d'entrée d'ajout : supprimer `app/(app)/sites/new/` (doublon sur l'ancien modèle `Site`) au profit du formulaire de `DashboardSites` + import en masse — `decelio/app/(app)/sites/new/` (suppression), `decelio/components/DashboardSites.tsx`
  - **Dépendances** : T021
  - **EF/ENF** : EF-021
  - **Vérification** : aucun lien restant dans l'application vers `/sites/new` ; `npm run build` ne référence plus le dossier supprimé
  - **Taille** : S

- [x] **T023** [P2] Étendre le scan quotidien au jeu complet de bots de rapport et au `ScanLog` enrichi — `decelio/inngest/functions/scan-site.ts`
  - **Dépendances** : T013 (colonnes `ScanLog`)
  - **EF/ENF** : EF-026
  - **Vérification** : test `inngest/functions/scan-site.test.ts` — le `ScanLog` créé porte `simpleStatus` et `cause` pour chaque bot du rapport, pas seulement GPTBot
  - **Taille** : M

- [x] **T024** [P2] Distinguer `ERREUR` de `BLOQUÉ` dans `MonitoredSite.status` et son affichage — `decelio/inngest/functions/scan-site.ts`, `decelio/components/DashboardSites.tsx`
  - **Dépendances** : T023
  - **EF/ENF** : EF-030
  - **Vérification** : un site en timeout DNS simulé prend le statut `ERREUR`, un site avec `robots.txt` disallow prend `BLOQUÉ`, avec un badge visuellement différent
  - **Taille** : S

- [x] **T025** [P2] Cause et correctif dans l'e-mail d'alerte, gabarit distinct régression/retour au vert — `decelio/lib/alerting/sendAlert.ts`
  - **Dépendances** : T023
  - **EF/ENF** : EF-035, EF-036
  - **Vérification** : deux gabarits testés (`sendAlert.test.ts`, nouveau) — objet et ton différents entre régression et résolution ; le corps cite la cause identifiée (ex. "robots.txt interdit GPTBot") et un correctif
  - **Taille** : M

- [x] **T026** [P2] Journaliser chaque alerte envoyée dans `AlertEvent` et raccorder `app/(app)/alerts/page.tsx` au réel — `decelio/lib/alerting/sendAlert.ts`, `decelio/app/(app)/alerts/page.tsx`
  - **Dépendances** : T011, T025
  - **EF/ENF** : EF-037
  - **Vérification** : la page n'importe plus `initialAlerts` (tableau fictif) ; une alerte envoyée en test apparaît dans la liste au rechargement
  - **Taille** : M

- [x] **T027** [P2] Remplacer les indicateurs fictifs du tableau de bord (quota "/20" en dur, "texte utile", "prochain scan") par les données réelles — `decelio/components/DashboardSites.tsx`
  - **Dépendances** : T008, T023
  - **EF/ENF** : EF-040, EF-041
  - **Vérification** : le quota affiché change réellement selon le plan de l'utilisateur connecté (vérifié avec deux comptes de plans différents en test manuel)
  - **Taille** : M

- [x] **T028** [P2] Retirer le bouton "Exporter" du tableau de bord ou lui donner un effet réel — `decelio/components/DashboardSites.tsx`
  - **Dépendances** : Aucune (retrait) ou T031 (si implémenté)
  - **EF/ENF** : EF-042
  - **Vérification** : aucun bouton sans effet ne subsiste dans l'interface authentifiée (principe II)
  - **Taille** : S

- [x] **T029a** [P2] Historique réel des scans sur la page de détail (remplace le graphique en barres fictif) — `decelio/app/(app)/sites/[siteId]/page.tsx`
  - **Dépendances** : T023
  - **EF/ENF** : EF-043
  - **Vérification** : la série affichée correspond aux vrais `ScanLog` du site consulté, pas à une donnée commune à tous les sites
  - **Taille** : M

- [x] **T029b** [P2] Détail par assistant (dernier code HTTP, cause, correctif) relié aux vrais `ScanLog` — `decelio/app/(app)/sites/[siteId]/page.tsx`
  - **Dépendances** : T029a
  - **EF/ENF** : EF-044
  - **Vérification** : les codes HTTP et la trace affichés changent selon le dernier scan réel, plus de valeurs `403`/`200` codées en dur
  - **Taille** : M

- [x] **T029c** [P] [P2] Jours consécutifs en état dégradé, calculé depuis l'historique réel — `decelio/app/(app)/sites/[siteId]/page.tsx`
  - **Dépendances** : T029a
  - **EF/ENF** : EF-045
  - **Vérification** : test unitaire de la fonction de calcul (`lib/reports/consecutiveDaysDown.ts` ou équivalent) sur une série de statuts connue
  - **Taille** : S

- [x] **T030** [P] [P2] Test d'intégration du parcours P2 complet (ajout → scan → changement de statut → une seule alerte) — `decelio/inngest/functions/scan-site.test.ts`
  - **Dépendances** : T019, T023, T025
  - **EF/ENF** : EF-034 (non-régression du dédoublonnage déjà en place)
  - **Vérification** : `npx vitest run` — deux scans identiques consécutifs après une régression n'appellent `sendRegressionAlert` qu'une seule fois (T026, qui ajoutera `AlertEvent`, n'est pas encore fusionnée)
  - **Taille** : M

**Point de contrôle Phase 4** : une agence abonnée gère son portefeuille dans la limite de son plan, voit un état réel et à jour, et reçoit une alerte exploitable en cas de régression — sans aucune donnée fictive dans ce chemin.

---

## Phase 5 : P3 — Rapport mensuel en marque blanche

**But** : la fonctionnalité anti-résiliation numéro un du PRD (§12).

- [x] **T031** [P3] Moteur de génération PDF (`@react-pdf/renderer`), fonction pure — `decelio/lib/reports/renderMonthlyReportPdf.tsx`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-047 à EF-051 (fondation)
  - **Vérification** : test unitaire — à partir de données figées, le PDF généré contient les sections attendues (verdict actuel, historique, incidents, annexe technique)
  - **Taille** : M

- [x] **T032a** [P3] Agrégation des données d'un client sur une période (`ScanLog`, `AlertEvent`) — `decelio/app/actions/reports.ts`
  - **Dépendances** : T007, T011, T023, T026
  - **EF/ENF** : EF-047
  - **Vérification** : test — un client avec deux sites et un incident résolu produit une disponibilité et une liste d'incidents cohérentes avec les données de test
  - **Taille** : M

- [x] **T032b** [P3] Génération et persistance du `MonthlyReport` (appel du moteur PDF, écriture en base) — `decelio/app/actions/reports.ts::generateMonthlyReport`, `decelio/inngest/functions/monthly-report.ts`
  - **Dépendances** : T012, T031, T032a
  - **EF/ENF** : EF-049, EF-051
  - **Vérification** : l'action peut être appelée à la demande (pas seulement le 1ᵉʳ du mois) et produit un `MonthlyReport` téléchargeable
  - **Taille** : M

- [x] **T033** [P3] Appliquer `BrandSettings` (logo, couleur, nom) au rendu PDF, restreint aux plans `PRO`/`SCALE` — `decelio/lib/reports/renderMonthlyReportPdf.ts`, `decelio/app/actions/settings.ts::updateBrandSettings`
  - **Dépendances** : T009, T031
  - **EF/ENF** : EF-048, EF-050
  - **Vérification** : un compte `SOLO` ne peut pas générer de rapport en marque blanche (erreur explicite) ; un compte `PRO` voit son logo dans le PDF généré
  - **Taille** : M

- [x] **T034** [P3] Raccorder `app/(app)/reports/page.tsx` aux vraies données (`Client`, `MonthlyReport`), export réel au lieu de `window.print()` — `decelio/app/(app)/reports/page.tsx`
  - **Dépendances** : T032b, T033
  - **EF/ENF** : EF-049
  - **Vérification** : la liste "six clients fictifs" disparaît du code source ; le bouton télécharge un vrai fichier PDF
  - **Taille** : M

- [x] **T035** [P] [P3] Regroupement des sites par `Client` depuis les paramètres ou le portefeuille — `decelio/app/actions/clients.ts` (nouveau), UI d'association dans `DashboardSites.tsx`
  - **Dépendances** : T007
  - **EF/ENF** : EF-052
  - **Vérification** : un site peut être associé à un client existant ou rester sans client (champ optionnel respecté)
  - **Taille** : M

- [x] **T036** [P] [P3] Tests du moteur PDF et test d'intégration bout-en-bout de génération de rapport — `decelio/lib/reports/renderMonthlyReportPdf.test.ts`, `decelio/inngest/functions/monthly-report.test.ts`
  - **Dépendances** : T031, T032b
  - **EF/ENF** : EF-047 à EF-051
  - **Vérification** : `npx vitest run` vert sur les deux fichiers
  - **Taille** : M

**Point de contrôle Phase 5** : un compte Agence/Studio de démonstration génère un rapport mensuel à son logo, à la demande, avec de vraies données — condition de sortie n°5 du PRD.

---

## Phase 6 : Facturation, plans, quotas, coupon fondateur

- [x] **T037** [FACT] Créer le coupon Stripe natif `founder-50` (`duration: forever`, `percent_off: 50`, `max_redemptions: 10`) — opération dans le tableau de bord Stripe, référence documentée dans `docs/10-plan-technique.md`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-058
  - **Vérification** : le coupon existe côté Stripe et refuse toute application au-delà de 10 utilisations (comportement natif Stripe)
  - **Taille** : S

- [x] **T038** [FACT] Accepter un code promo optionnel dans `createCheckoutSession` — `decelio/lib/billing/actions.ts` (livré sur `main`, PR #13, tests dans `lib/billing/actions.test.ts`)
  - **Dépendances** : T037
  - **EF/ENF** : EF-058, EF-066
  - **Vérification** : un Checkout créé avec le coupon affiche bien la réduction côté Stripe (test manuel en mode test Stripe)
  - **Taille** : S

- [x] **T039** [FACT] Marquer `isFounderMember`/`founderOfferAt` au moment du webhook si un coupon a été appliqué — `decelio/app/api/webhooks/stripe/route.ts` (livré sur `main`, PR #13, tests dans `app/api/webhooks/stripe/route.test.ts`)
  - **Dépendances** : T010, T037
  - **EF/ENF** : EF-067
  - **Vérification** : un abonnement de test payé avec le coupon fondateur met à jour ces deux champs, un abonnement sans coupon ne les touche pas
  - **Taille** : M

- [x] **T040** [FACT] Raccorder la section Abonnement des paramètres au vrai plan/quota/date de prélèvement + bouton vers `createCustomerPortalSession` — `decelio/app/(app)/settings/page.tsx`
  - **Dépendances** : T008
  - **EF/ENF** : EF-059
  - **Vérification** : "Offre agence — 20 domaines" et "18/20" codés en dur disparaissent ; les valeurs affichées changent selon le compte connecté
  - **Taille** : M

- [x] **T041** [P] [FACT] Exposer l'export RGPD et la date de purge dans les paramètres — `decelio/app/(app)/settings/page.tsx`, nouvelle action `decelio/app/actions/gdpr.ts::exportUserData`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-015
  - **Vérification** : un utilisateur connecté peut déclencher un export et voir sa date de purge si son compte est résilié
  - **Taille** : S

- [x] **T042** [P] [FACT] Vérifier que la page de tarifs ne présente le dépassement 100 sites (EF-057) et la facturation annuelle (EF-060) que comme non actifs, jamais comme activables — `decelio/app/(marketing)/pricing/page.tsx` (déjà largement conforme, vérification et ajustement de libellé)
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-057, EF-060, principe II
  - **Vérification** : relecture manuelle de la page — aucun texte ne laisse croire à une activation en libre-service de ces deux mécanismes
  - **Taille** : S

**Point de contrôle Phase 6** : le paiement Stripe débloque réellement l'ajout de sites dans la limite du plan (condition de sortie n°4 du PRD), le coupon fondateur fonctionne de bout en bout en mode test.

---

## Phase 7 : Onboarding self-serve et e-mails automatisés

- [x] **T043** [ONB] Raccorder l'onboarding à `addMonitoredSitesBulk` et au lancement d'un vrai premier scan (événement Inngest) — `decelio/app/(app)/onboarding/page.tsx`
  - **Dépendances** : T021
  - **EF/ENF** : EF-061, EF-062
  - **Vérification** : le délai artificiel (`setTimeout(800ms)`) disparaît ; les domaines collés créent réellement des `MonitoredSite` et un scan est déclenché
  - **Taille** : M

- [x] **T044** [ONB] N'afficher que les canaux d'alerte réellement actifs (e-mail) dans l'onboarding, retirer ou marquer "en préparation" Slack/webhook — `decelio/app/(app)/onboarding/page.tsx`
  - **Dépendances** : T043
  - **EF/ENF** : EF-038, principe II
  - **Vérification** : aucune case à cocher sans effet réel ne subsiste (cohérent avec T050)
  - **Taille** : S

- [x] **T045** [ONB] Choix du plan pendant l'onboarding, redirection Stripe Checkout — `decelio/app/(app)/onboarding/page.tsx`
  - **Dépendances** : T038
  - **EF/ENF** : EF-063
  - **Vérification** : un utilisateur sans abonnement actif est redirigé vers Checkout avant de pouvoir dépasser le scan gratuit
  - **Taille** : S

- [x] **T046** [ONB] Job planifié `send-discovery-email` (5 questions du kit de prospection, à J+3) — `decelio/inngest/functions/discovery-email.ts`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-064
  - **Vérification** : test — un compte créé il y a 3 jours reçoit l'événement, un compte créé il y a 1 jour ne le reçoit pas
  - **Taille** : M

- [x] **T047** [P] [ONB] Gabarit et déclenchement (semi-manuel, sur décision qualitative du fondateur) de l'e-mail d'offre fondatrice — `decelio/lib/alerting/sendFounderOffer.ts` (nouveau), action déclenchable depuis un script ou une commande interne
  - **Dépendances** : T037, T046
  - **EF/ENF** : EF-066
  - **Vérification** : l'e-mail envoyé affiche une date limite d'activation claire ; aucune automatisation de la lecture des réponses au questionnaire n'est requise (EF-065)
  - **Taille** : S

- [x] **T048** [P] [ONB] E-mail "votre rapport mensuel est disponible" à la génération d'un `MonthlyReport` — `decelio/lib/alerting/sendReportReady.ts` (nouveau)
  - **Dépendances** : T032b
  - **EF/ENF** : —
  - **Vérification** : test — la génération d'un rapport en test déclenche l'envoi (mock Resend)
  - **Taille** : S

**Point de contrôle Phase 7** : une agence peut s'inscrire, importer son portefeuille, payer et recevoir le questionnaire de découverte sans intervention humaine (condition de sortie liée au parcours P3 du PRD).

---

## Phase 8 : Écrans maquettes restants et cohérence produit

**Note** : la plupart des écrans à données fictives ont déjà été raccordés au réel dans les phases fonctionnelles ci-dessus (alertes en Phase 4, rapports en Phase 5, abonnement en Phase 6, onboarding en Phase 7) — délibérément, pour ne pas laisser cette dette en fin de parcours. Cette phase couvre ce qui reste : la double expérience de scan public et les sections de paramètres hors périmètre MVP.

- [x] **T049** [MOCK] Faire de `/analyse/[domain]` la page de résultat partageable du diagnostic (réutilise T015/T016), retirer toute trace visible de l'ancien positionnement "visibilité de marque" — `decelio/app/(marketing)/analyse/[domain]/page.tsx`
  - **Dépendances** : T016
  - **EF/ENF** : décision §14.3 du PRD
  - **Vérification** : la page ne mentionne plus de "score de visibilité" agrégé ; elle affiche les mêmes verdicts par assistant que `ScanForm`
  - **Taille** : M

- [x] **T050** [P] [MOCK] Nettoyer les sections hors périmètre MVP de `app/(app)/settings/page.tsx` (Équipe, Accès API, canal Slack "Actif") : retirer ou marquer "en préparation" — `decelio/app/(app)/settings/page.tsx`
  - **Dépendances** : T040, T041
  - **EF/ENF** : EF-038, §11 hors périmètre du PRD, principe II
  - **Vérification** : aucune section n'affiche une fonctionnalité inactive comme "Actif" (le badge Slack actuel, notamment) ; multi-utilisateur et clé API sont soit absents, soit "en préparation"
  - **Taille** : M

- [x] **T051** [MOCK] Audit final "aucune donnée fictive dans le chemin critique" — recherche des chaînes de démonstration restantes (`Atelier Boréal`, `client-vitrine`, `Laura Bréa`, etc.) hors fixtures de test, dans toute l'application authentifiée
  - **Dépendances** : T026, T027, T029a, T029b, T029c, T034, T040, T043, T049, T050
  - **EF/ENF** : principe II
  - **Vérification** : `grep -r "Atelier Boréal\|client-vitrine\|Laura Bréa" decelio/app decelio/components` ne retourne plus rien en dehors de `decelio/**/*.test.ts` et des fixtures explicitement documentées comme telles
  - **Taille** : S

**Point de contrôle Phase 8** : condition de sortie n°3 du PRD — le parcours P2 fonctionne de bout en bout "sans page à données fictives dans le chemin critique".

---

## Phase 9 : Qualité, sécurité transverse, observabilité, déploiement

- [x] **T052** [P] [QUAL] Réinitialisation de mot de passe par e-mail — `decelio/app/api/auth/reset-password/route.ts` (nouveau), gabarit Resend
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-014
  - **Vérification** : test d'intégration — un jeton de réinitialisation à usage unique expire après un délai raisonnable et ne peut être rejoué
  - **Taille** : M

- [x] **T053** [P] [QUAL] Journalisation structurée des échecs de scan et d'envoi d'alerte (remplace les `console.error` isolés) — `decelio/inngest/functions/scan-site.ts`, `decelio/lib/alerting/sendAlert.ts`
  - **Dépendances** : T005
  - **EF/ENF** : ENF-009
  - **Vérification** : un échec simulé d'envoi Resend apparaît dans PostHog (`posthog-node`) avec `siteId` et cause, pas seulement un message générique
  - **Taille** : S

- [x] **T054** [P] [QUAL] Audit d'accessibilité AA des écrans raccordés au réel (contraste, clavier, cibles tactiles 44 px) — checklist `docs/07-design-system.md` §6, appliquée à `DashboardSites.tsx`, `alerts/page.tsx`, `reports/page.tsx`, `sites/[siteId]/page.tsx`, `settings/page.tsx`, `onboarding/page.tsx`
  - **Dépendances** : T026, T027, T029a-c, T034, T040, T043
  - **EF/ENF** : ENF-007
  - **Vérification** : navigation clavier complète sur chaque écran listé, contrôle de contraste ≥ 4.5:1 sur le texte courant
  - **Taille** : M

- [x] **T055** [QUAL] Revérifier le budget ENF-005 (1000 sites/heure) une fois EF-026 (multi-bots) livré, ajuster la concurrence Inngest si besoin — `decelio/inngest/functions/scan-site.ts`
  - **Dépendances** : T023
  - **EF/ENF** : ENF-005, EF-028
  - **Vérification** : un test de charge simulé (ou un calcul documenté à partir de la durée moyenne observée par site) montre que 1000 sites tiennent dans une fenêtre d'une heure avec la concurrence configurée
  - **Taille** : S

- [x] **T056** [QUAL] Purge/compression de `ScanLog.payload` au-delà de 90 jours (protection du quota de stockage Neon, §14 du plan technique) — `decelio/inngest/functions/prune-scan-logs.ts` (nouveau), cron mensuel
  - **Dépendances** : T004
  - **EF/ENF** : ENF-016 (budget), risque §14 du plan technique
  - **Vérification** : test — un `ScanLog` de plus de 90 jours voit son `payload` vidé, ses colonnes dérivées (`simpleStatus`, `cause`) restent intactes pour l'historique
  - **Taille** : S

- [x] **T057** [QUAL] Vérification de bout en bout du pipeline de déploiement (CI → migration → déploiement Render) sur un environnement de préproduction — exécution documentée dans docs/production-audit-report.md
  - **Dépendances** : T002, T003, T004
  - **EF/ENF** : —
  - **Vérification** : un déploiement complet depuis une PR de test jusqu'à la disponibilité en préproduction, sans intervention manuelle autre que la fusion de la PR
  - **Taille** : M

**Point de contrôle final** : les quatre portes de qualité passent sur l'ensemble du dépôt (condition de sortie n°6 du PRD) ; les six conditions de sortie du MVP (§15 du PRD) sont vérifiables.

---

## Dépendances entre phases

```
Phase 1 (Setup)  ──▶  Phase 2 (Fondations données)  ──▶  Phase 3 (P1)
                                                     ├──▶  Phase 4 (P2)  ──▶  Phase 5 (P3)
                                                     │                         │
                                                     └──▶  Phase 6 (Facturation) ┘
                                                                    │
                                                     Phase 7 (Onboarding) ◀────┘
                                                                    │
                                                     Phase 8 (Écrans restants)
                                                                    │
                                                     Phase 9 (Qualité + déploiement)
```

Les phases 3 (P1), 4 (P2) et 6 (Facturation) peuvent être menées en parallèle par des sessions différentes une fois la Phase 2 terminée — elles touchent des fichiers disjoints à l'exception de `lib/billing/plans.ts` (T008, lu par T019). La Phase 5 (P3) dépend de la Phase 4 (données de scan réelles à agréger). La Phase 9 s'applique en continu mais son point de contrôle final vient après tout le reste.

## Stratégie de livraison

1. **Socle** : Phases 1-2. Rien de visible pour un utilisateur, mais le dépôt est déployable et le schéma cible existe.
2. **MVP minimal démontrable** : Phase 3 (P1) seule — le diagnostic public honnête peut déjà être montré à un prospect.
3. **Produit payant** : Phases 4 et 6 — portefeuille borné par un vrai quota, alertes réelles, paiement qui débloque réellement.
4. **Anti-résiliation** : Phase 5 — rapport mensuel en marque blanche.
5. **Vente autonome** : Phase 7 — onboarding et e-mails sans intervention humaine.
6. **Fermeture** : Phases 8-9 — plus aucune donnée fictive, qualité et déploiement vérifiés avant la prospection à grande échelle (critères de sortie du MVP, PRD §15).

Chaque phase se termine par son point de contrôle avant de passer à la suivante ; les quatre portes de qualité (`tsc`, `eslint`, `vitest`, `build`) sont vérifiées après chaque tâche qui touche du code, pas seulement en fin de phase.


## Phase 10 : Améliorations post-MVP (26/09)
- [x] **T058** [MARKETING] Refonte de la page d'accueil (AEO, Bento Grid, Gradients style SaaS) - `HomePage.tsx`, `home.module.css`
  - **Dépendances** : Aucune
  - **EF/ENF** : -
  - **Vérification** : La page d'accueil affiche le nouveau design.
  - **Taille** : S

- [x] **T059** [DB] Robustesse du schéma : unicité de la surveillance par URL et utilisateur, ajout de `updatedAt` - `schema.prisma`
  - **Dépendances** : Aucune
  - **EF/ENF** : -
  - **Vérification** : Impossible d'insérer deux fois la même URL pour un même utilisateur.
  - **Taille** : S


- [x] **T060** [DB] Migration manquante pour `updatedAt` et l'unicité `MonitoredSite(userId, url)` - `prisma/migrations/20260926230000_add_updated_at_and_site_unique`
  - **Dépendances** : T059
  - **Note** : T059 avait été cochée alors que `schema.prisma` déclarait ces objets qu'aucune migration ne créait. Une base construite depuis les migrations ne les avait donc pas, le job `prisma` de la CI échouait, et toute création de compte ou de site aurait échoué en production. Les tests ne l'attrapaient pas : ils simulent la base.
  - **Vérification** : `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel ./prisma/schema.prisma --exit-code` répond `No difference detected.`
  - **Taille** : S

- [x] **T061** [QUALITÉ] Remettre la CI au vert sur `main` - `components/home/HomePage.tsx`, `app/(app)/sources/page.tsx`
  - **Dépendances** : Aucune
  - **Note** : `main` était rouge depuis le 26/09 14 h 51 alors que `PROGRESS.md` annonçait le contraire. Deux jobs échouaient : `lint` (23 apostrophes non échappées) et `prisma` (voir T060).
  - **Vérification** : les dix jobs de la CI passent sur `main`.
  - **Taille** : S

- [x] **T062** [MARKETING] Renommer Cited en Decelio partout - dépôt GitHub, dossier `decelio/`, identifiants techniques, `llms.txt`
  - **Dépendances** : Aucune
  - **Note** : `llms.txt` décrivait encore le positionnement abandonné au pivot (mesure de part de voix). Les jetons `--color-cited` sont conservés : ils désignent l'état « cité par une IA », pas la marque.
  - **Vérification** : plus aucune occurrence de `cited` hors état « cité » et noms réels des ressources Neon et Render.
  - **Taille** : M

- [x] **T063** [MARKETING] Audit de la page d'accueil et correction des écarts à la constitution - `docs/11-audit-landing-page.md`
  - **Dépendances** : Aucune
  - **EF/ENF** : Constitution I (honnêteté de la mesure), III (ne rien promettre de non construit)
  - **Note** : sept écarts corrigés — `llms.txt`, « temps réel » contre quotidien, trois surpromesses de mesure, deux faux badges de popularité, et deux fausses notifications de scan dans le héros.
  - **Vérification** : aucune des formulations relevées ne subsiste dans le HTML servi.
  - **Taille** : M

- [x] **T064** [MARKETING] Données structurées JSON-LD de la page d'accueil - `components/home/StructuredData.tsx`
  - **Dépendances** : T063
  - **Note** : un seul bloc, trois nœuds — `Organization`, `SoftwareApplication` avec les trois offres, `FAQPage` alimenté par le tableau déjà affiché. Pas d'`aggregateRating` : aucun avis n'existe.
  - **Vérification** : le bloc `application/ld+json` est présent et se parse ; les six questions y figurent.
  - **Taille** : S

- [x] **T065** [DESIGN] Identité visuelle : logo, jeton `--brand`, icônes du site - `public/logo-decelio*.png`, `app/icon.png`, `app/globals.css`
  - **Dépendances** : Aucune
  - **Note** : le site n'avait aucun favicon. Défaut d'accessibilité corrigé au passage : `prefers-reduced-motion` ne remettait pas `animation-delay` à zéro, laissant le héros vide près de deux secondes.
  - **Vérification** : logo visible en en-tête et en pied de page, favicon dans l'onglet.
  - **Taille** : M

- [x] **T066** [DESIGN] Refonte du héros et des sections de conversion - `HeroConcentric.tsx`, `HomePage.tsx`
  - **Dépendances** : T065
  - **EF/ENF** : `docs/07-design-system.md` §5
  - **Note** : anneaux en courbes de niveau reprenant le logo, huit assistants IA servis localement, grille tarifaire rendue comparable, douze puces ramenées à quatre paires alignées.
  - **Vérification** : `tsc`, `eslint`, `vitest` au vert ; rendu vérifié à 1440 px et à 375 px.
  - **Taille** : L

- [x] **T067** [MARKETING] Page « Qui est derrière Decelio », signée - `app/(marketing)/a-propos/page.tsx`
  - **Dépendances** : Aucune
  - **EF/ENF** : `docs/11-audit-landing-page.md` §2.2
  - **Note** : preuve : #150. Fusionnée sur `main` le 27/09.
  - **Vérification** : la page existe, elle est liée depuis le pied de page, et porte un nom.
  - **Taille** : S

- [ ] **T068** [MARKETING] Vérifier le domaine `decelio.fr` chez Resend - tableau de bord Resend
  - **Dépendances** : Aucune
  - **Note** : (BLOQUÉ) En attente de la propagation des DNS OVH (48h). Bloquant pour tous les e-mails produits. Domaine créé dans Resend, statut `not_started`.
  - **Vérification** : `list-domains` renvoie `decelio.fr` avec le statut vérifié.
  - **Taille** : S

## Phase 11 : Avant le lancement (27/09)

- [x] **T069** [QUAL] Acceptation des CGV à l'inscription (case à cocher, horodatage, version acceptée) - `decelio/app/api/auth/register/route.ts`, `decelio/prisma/schema.prisma` (`User.termsAcceptedAt`)
  - **Dépendances** : T070 (les CGV doivent exister pour qu'on puisse en accepter une version)
  - **EF/ENF** : constitution (honnêteté), obligation légale française
  - **Note** : preuve : #152 (colonnes `User.termsAcceptedAt`/`termsVersion`, `lib/legal/terms.ts`), #155 (case à cocher côté formulaire), #160 (date et version en tête des CGV, `TERMS_VERSION = "2026-09-27-2"`).
  - **Vérification** : un compte créé sans cocher la case est refusé ; le compte créé porte `termsAcceptedAt` et la version acceptée.
  - **Taille** : S

- [x] **T070** [DESIGN] Pages légales (mentions légales, CGV, politique de confidentialité) - `decelio/app/(marketing)/mentions-legales/`, `.../cgv/`, `.../confidentialite/`
  - **Dépendances** : Aucune (mais porte des `[À REMPLIR]` tant que le SIREN manque)
  - **Note** : fusionnée par #126 (pages légales) et #135 (franchise TVA art. 293 B). Les trois pages existent et sont liées depuis le pied de page ; `[À REMPLIR]` en attente du SIREN.
  - **Vérification** : les trois pages existent, liées depuis le pied de page ; aucune mention inventée (numéro SIREN, adresse) tant que non disponible.
  - **Taille** : M

- [x] **T071** [FACT] Essai gratuit de 14 jours avec carte bancaire dès l'inscription (ADR-002) - `decelio/lib/billing/actions.ts`, webhook Stripe
  - **Dépendances** : Aucune
  - **Note** : preuve : #139 (fusion sur `main`), #151 (bandeau d'essai et annonce, Design). `docs/decisions/ADR-002-essai-gratuit-14-jours.md` passé au statut « appliqué » (#157).
  - **Vérification** : un Checkout de test crée un abonnement `trialing` de 14 jours ; à l'échéance sans annulation, le prélèvement se déclenche.
  - **Taille** : M

- [ ] **T072** [ING] Proxy PostHog par notre propre domaine (ADR-004) - `decelio/next.config.ts` (rewrites), `decelio/instrumentation-client.ts`
  - **Dépendances** : Aucune
  - **Note** : fusionnée par #134 (route `/ingest/[...path]`, IP/cookies/forwarded retirés, limite 256 Kio). Vérification locale faite par le Design dans un navigateur le 27/09 : aucune requête hors `localhost`, événements bien sur `/ingest`. Reste : refaire cette vérification une fois l'application déployée.
  - **Vérification** : les requêtes PostHog partent du domaine `decelio.fr` dans l'onglet réseau, jamais de `*.posthog.com` directement.
  - **Taille** : S

- [x] **T073** [ING] Baseline des migrations Prisma sur Neon `main` (production) - `docs/runbooks/deploiement-render-neon.md`
  - **Dépendances** : Aucune
  - **Note** : les tables existent sur `main` mais aucune table `_prisma_migrations` — la base a été peuplée par `db push`. `npx prisma migrate deploy` échouera tel quel. **Protection de branche impossible en offre gratuite Neon** (0 branche protégée autorisée) : ne jamais sortir la chaîne de `main` hors de Render.
  - **Fait, vérifié le 28/09** : les 5 migrations (`20260925000000_init`, `20260926230000_add_updated_at_and_site_unique`, `20260927000000_audit_lead_brand_name_optional`, `20260927120000_add_user_trial_fields`, `20260927180000_add_user_terms_acceptance`) sont enregistrées sur Neon `main`.
  - **Vérification** : `npx prisma migrate resolve --applied <dernière migration>` exécuté sur `main`, puis `npx prisma migrate status` ne signale plus aucune migration en attente.
  - **Taille** : S

- [ ] **T074** [ING] Webhook Stripe de production - tableau de bord Stripe, variables Render
  - **Dépendances** : T003 (Render déployé, URL de production connue)
  - **Note** : relevé par MCP le 27/09 : aucun webhook n'existe, ni en test ni en réel. Sans lui, les changements d'abonnement (paiement, résiliation, coupon) ne mettent jamais à jour la base.
  - **Vérification** : un événement `checkout.session.completed` envoyé depuis le tableau de bord Stripe en test met à jour l'abonnement de l'utilisateur correspondant.
  - **Taille** : S

- [ ] **T075** [FACT] Activer Stripe en mode réel - tableau de bord Stripe
  - **Dépendances** : T074
  - **Note** : On n'attend plus le SIREN (décision du 28/09). Stripe bloquera les virements, mais on peut encaisser. Recréer à l'identique en mode réel les 3 prix, le coupon `FONDATEUR50`, le portail client et le webhook. Ajouter le pied de page des factures (mention art. 293 B du CGI, franchise de TVA, et "SIREN en cours d'attribution").
  - **Vérification** : un paiement réel de test (carte du fondateur, remboursé ensuite) aboutit à un abonnement actif.
  - **Taille** : M

- [x] **T076** [ING] Fiabilité restante du scanner - `decelio/lib/scanner/*`
  - **Dépendances** : Aucune
  - **Note** : fusionnées par #128-#131 (taille `/api/pdf/diagnostic` 256 Kio, IP épinglée contre rebinding DNS, page courte sans indice JS n'est plus « COQUILLE VIDE », scanner ne provoque plus lui-même de 429). Reste mineur : même biais « COQUILLE VIDE » dans l'ancienne route `/api/audit` (lib/scanner/analyzer.ts, tâche séparée T077).
  - **Vérification** : les quatre branches ci-dessus fusionnées sur main avec leurs tests verts.
  - **Taille** : M

- [x] **T077** [ING] Même faux « COQUILLE VIDE » dans `/api/audit` - `decelio/lib/scanner/analyzer.ts` (analyzeResponse / EMPTY_JS_REQUIRED)
  - **Dépendances** : T076
  - **Note** : preuve : #146. La route `/api/audit` compte désormais le statut `LOW_TEXT` comme accessible, comme le scanner principal.
  - **Vérification** : une page courte sans indice de rendu JavaScript n'est plus classée « COQUILLE VIDE » par `/api/audit`.
  - **Taille** : S

- [x] **T078** [ING] Préparation du lancement - `decelio/auth.ts`, `.env.example`
  - **Dépendances** : Aucune
  - **Note** : preuve : #142, fusionnée sur `main`. `AUTH_TRUST_HOST=true` dans `.env.example`, `signup_completed` après connexion Google, suppression du texte « visibilité IA » du formulaire de prospection, suppression du client Stripe à la purge RGPD d'un compte.
  - **Vérification** : les quatre changements sont présents dans `main` ; `tsc`, `eslint`, `vitest` au vert.
  - **Taille** : S

- [x] **T079** [ING] Dépôt GitHub sain - réglages GitHub (branche `main`, Dependabot)
  - **Dépendances** : Aucune
  - **Note** : preuve : #171 (correction de l'écosystème Dependabot docker → docker-compose), réglages du 27/09 (soir) : `main` protégée (PR obligatoire, même pour l'administrateur), suppression automatique des branches après fusion, branches mortes supprimées.
  - **Vérification** : une tentative d'écriture directe sur `main` est refusée par GitHub ; une branche fusionnée disparaît automatiquement de la liste des branches distantes.
  - **Taille** : S

## Phase 12 : Test complet en local avant déploiement

**But** : appliquer la décision du fondateur — aucun déploiement tant que le MVP n'est pas entièrement vérifié en local, sur Neon `local-dev` et Stripe en mode test. Le détail du parcours est dans `docs/runbooks/checklist-mise-en-production.md` §4.

- [x] **T080** [FONDATEUR] Installer Stripe CLI - poste du fondateur
  - **Dépendances** : Aucune
  - **Fait le 28/09** : `winget install Stripe.StripeCli`, version 1.52.0, autorisé sur le compte `environnement de test decelio · sandbox`.
  - **Deux pièges** : le PATH n'est pas rechargé dans les terminaux déjà ouverts, il faut en rouvrir un. Et cette version exige de préciser les événements : la commande est `stripe listen --all-snapshot --forward-to localhost:3000/api/webhooks/stripe`.
  - **Vérification** : `stripe --version` répond dans un terminal.
  - **Taille** : S

- [x] **T081** [FONDATEUR] Inscription, acceptation des CGV, connexion et limite de tentatives - parcours manuel sur `http://localhost:3000`
  - **Dépendances** : T080 non requise pour cette étape
  - **EF/ENF** : constitution (honnêteté), EF-014
  - **Vérification** : un compte se crée avec la case CGV cochée et refuse la création sans elle ; la limite de tentatives bloque au seuil prévu par le code.
  - **Fait le 28/09** : inscription refusée sans la case CGV, bloquée côté client et exigée aussi côté serveur par `registerSchema.acceptTerms` — double barrière. Inscription acceptée ensuite (`201 Created`), `termsAcceptedAt` et `termsVersion = "2026-09-27-2"` écrits en base. Limite conforme à `lib/auth-login-policy.ts` : 5 échecs par e-mail, 10 par IP, sur 15 minutes, lignes `RateLimit` créées. Le message d'erreur reste identique qu'on se trompe de mot de passe ou qu'on soit bloqué, ce qui est voulu et ne révèle rien à un attaquant.
  - **Correction du libellé** : l'ancienne vérification annonçait « 10 échecs, le 11ᵉ bloqué ». Le code applique 5 par e-mail. C'était le libellé qui était faux, pas le code.
  - **Taille** : S

- [x] **T082** [FONDATEUR] Ajout de site, scan, fiche avec plateforme détectée - parcours manuel
  - **Dépendances** : T081, **puis T084** — voir l'ordre corrigé ci-dessous
  - **EF/ENF** : EF-001, EF-002, EF-018
  - **Vérification** : un site ajouté apparaît dans le portefeuille ; après scan, sa fiche affiche un verdict par assistant et la plateforme détectée (#168).
  - **Ordre corrigé (28/09)** : le plan `FREE` a `maxSites: 0` (`lib/billing/plans.ts`), donc un compte neuf ne peut ajouter aucun site avant d'avoir souscrit. L'ordre réel du parcours est T081, T084, T082, T083. Le refus « Domaine non ajouté — Abonnement requis » est le quota qui fonctionne, pas un défaut.
  - **Décochée le 28/09 (soir) : à rejouer.** Le scan réel sur `juliusmason.com` qui avait servi de preuve à cette tâche tournait sur un code où le scanner ne faisait en réalité plus aucune requête réseau (panne `undici`, voir #183 et `docs/REPRISE.md` section 0). Le verdict « COQUILLE VIDE » obtenu ce jour-là n'est donc pas fiable comme preuve : il faut refaire le scan avec le code corrigé avant de recocher cette tâche.
  - **Fait (puis invalidé) le 28/09** sur `juliusmason.com` : `MonitoredSite` créé, scan déclenché par l'événement `app/scan.site`. `ScanLog` écrit avec `simpleStatus` et `cause` renseignés, charge utile `platform` = `{cms:"customReactVue", firewall:"cloudflare"}` — à revérifier.
  - **Rejouée et recochée le 28/09 (matin), code corrigé.** Run Inngest `Completed` sur `juliusmason.com`, dont **2,598 s dans l'étape réseau** — la durée d'un vrai aller-retour, ce qui prouve que la panne `undici` est bien morte : au plus fort du défaut, la même étape échouait instantanément en `httpStatus: 0`. Fiche du site, mot pour mot : verdict « Vide », code 200, « Plateforme détectée : application JavaScript (React ou Vue), derrière Cloudflare (d'après les indices de la page) », cause pour les trois robots « la page dépend probablement de JavaScript ». Formulation conforme à l'article I : « probablement », « d'après les indices », aucune prétention à voir ce que voit le robot.
  - **Taille** : S

- [x] **T083** [FONDATEUR] Alerte confirmée par le serveur Inngest local (délai de confirmation de 10 minutes) - `npx inngest-cli@latest dev` + parcours manuel
  - **Fait le 28/09 (matin), prouvé de bout en bout.** Régression fabriquée en forçant le statut mémorisé du site à `OK` dans `local-dev`, son vrai verdict étant `COQUILLE VIDE` — le site lui-même n'a pas été touché, seule la mémoire de l'application. Run `01M3KAQGZETWNTV87GCYDT5EA3` : scan initial 2,8 s, puis l'étape `wait-regression-confirmation` a duré **10 m 0 s exactement**, ce qui prouve que le délai est réellement observé et non contourné, puis rescan de confirmation 3,3 s. `INSERT INTO "AlertEvent"` visible dans les journaux, aucune erreur Resend. **E-mail reçu à 08:30 sur `krom.pro@outlook.com`.** La ligne `AlertEvent` n'étant écrite qu'après un envoi réussi, sa présence en base vaut preuve de l'envoi.
  - **Dépendances** : T082. **T068 n'est plus bloquant** : l'expéditeur de repli `onboarding@resend.dev` fonctionne sans domaine vérifié, vers l'adresse du titulaire du compte Resend.
  - **Débloqué le 28/09 (soir) par #182** : `lib/email/from.ts` (`emailFrom()`) lit `ALERT_FROM_EMAIL` à chaque appel, avec repli sur `Decelio <bonjour@decelio.fr>`. `.env.local` du poste porte désormais `ALERT_FROM_EMAIL="Decelio <onboarding@resend.dev>"` : cet expéditeur fonctionne sans domaine Resend vérifié et écrit vers `krom.pro@outlook.com`. La tâche n'attend donc plus T068 pour être testée en local — reste à rejouer le parcours pour la cocher.
  - **Bloqué au 28/09 (avant #182)** : la chaîne Inngest fonctionne, mais l'envoi Resend était refusé en **HTTP 403** — « The decelio.fr domain is not verified ». `lib/alerting/sendAlert.ts:33` figeait l'expéditeur à `Decelio <bonjour@decelio.fr>` sans repli. Aucun `AlertEvent` n'était écrit, et **c'était le comportement correct** : `recordAlerts()` n'écrit qu'après un envoi réussi, pour ne jamais enregistrer un « client prévenu » qui serait faux.
  - **Piège (28/09)** : il faut `INNGEST_DEV=1` dans `.env.local`. Sans lui, `inngest/client.ts` transmet `INNGEST_SIGNING_KEY` au SDK, qui exige alors une signature sur chaque appel à `/api/inngest`, y compris les sondes du serveur local qui ne peuvent pas la fournir. Symptôme : `No x-inngest-signature provided`, `GET /api/inngest 401`, zéro application synchronisée. Avec la variable, les 8 fonctions se déclarent.
  - **EF/ENF** : EF-035, EF-036, EF-037
  - **Vérification** : une régression provoquée déclenche une alerte seulement après confirmation par un second scan à 10 minutes ; l'alerte apparaît dans le journal (`AlertEvent`).
  - **Taille** : S

- [x] **T084** [FONDATEUR] Essai gratuit et paiement test Stripe avec Stripe CLI, bandeau d'essai visible - parcours manuel
  - **Dépendances** : T080, T081. **À faire avant T082**, bloqué par le quota du plan gratuit.
  - **Fait le 28/09** : Checkout de test avec `FONDATEUR50` — sous-total 99,00 €, « Offre fondatrice -50% à vie » -49,50 €, **0,00 € dû aujourd'hui**, 14 jours d'essai. Carte de test `4242 4242 4242 4242`. Les **13 événements** relayés par `stripe listen` répondent tous **HTTP 200**, 13 lignes `ProcessedWebhook` écrites. En base : `plan` FREE → PRO, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `stripeCurrentPeriodEnd` et `stripeTrialEnd` (12/10/2026) tous renseignés. Le portail de facturation confirme : Decelio Agence 49,50 €/mois, remise -50% à vie, Visa •••• 4242.
  - **Piège (28/09)** : `STRIPE_WEBHOOK_SECRET` doit contenir la valeur `whsec_...` affichée par le `stripe listen` **en cours d'exécution**. Tant qu'elle est absente ou fausse, tous les événements repartent en HTTP 400 (« No signatures found matching the expected signature for payload », `app/api/webhooks/stripe/route.ts:75`), aucun abonnement n'est enregistré et toute la suite du parcours est bloquée. Le secret change à chaque relance de `stripe listen`.
  - **EF/ENF** : EF-063, ADR-002
  - **Vérification** : un Checkout de test avec `stripe listen` actif crée un abonnement `trialing` de 14 jours ; le bandeau d'essai s'affiche dans l'application.
  - **Taille** : S

- [x] **T085** [FONDATEUR] Rapport mensuel PDF - parcours manuel
  - **Dépendances** : T082
  - **Fait le 28/09 (matin)** : événement `app/monthly-report.generate` déclenché depuis Inngest, run `Completed` en 1,3 s. Téléchargement `GET /api/reports/<id>/pdf` → HTTP 200, `content-type: application/pdf`, en-tête `%PDF-`, **8235 octets**. Un vrai fichier, pas une page d'erreur.
  - **Piège** : la fonction exige un `Client` auquel le site est rattaché. Un site « Sans client » ne produit aucun rapport, sans message d'erreur explicite. À garder en tête pour l'onboarding d'une agence.
  - **EF/ENF** : EF-047 à EF-051
  - **Vérification** : un rapport généré à la demande produit un PDF téléchargeable avec de vraies données.
  - **Taille** : S

- [ ] **T086** [FONDATEUR] Purge RGPD avec suppression du client Stripe - parcours manuel
  - **Dépendances** : T084
  - **EF/ENF** : EF-015
  - **Vérification** : un compte résilié puis purgé n'a plus de client Stripe associé (vérifié dans le tableau de bord Stripe en mode test).
  - **Taille** : S

- [ ] **T087** [FONDATEUR] Console du navigateur sans erreur CSP pendant tout le parcours - vérification manuelle continue
  - **Dépendances** : T081, T082, T083, T084, T085, T086
  - **Partiel au 28/09, aucun défaut trouvé** : zéro erreur console et **zéro violation CSP** sur `/`, `/register`, `/login`, `/onboarding`, `/dashboard`, `/dashboard?checkout=success`, `/sites/[siteId]`, `/alerts`, `/reports`, `/sources`, `/settings`, le Checkout et le portail de facturation Stripe. PostHog passe systématiquement par `/ingest/*`, **jamais** d'appel direct à `eu.i.posthog.com` — ADR-004 respecté. Reste à couvrir : les écrans de T085 et T086.
  - **Mise à jour du 28/09 (matin)** : les écrans de T085 sont désormais couverts, toujours sans erreur ni violation. **Reste uniquement T086.** La tâche n'est volontairement pas cochée : sa liste de dépendances inclut T086, qui n'est pas terminée, et on ne coche que ce qui est prouvé.
  - **EF/ENF** : sécurité (constitution)
  - **Vérification** : aucune erreur « Content Security Policy » n'apparaît dans la console du navigateur pendant l'ensemble du parcours ci-dessus.
  - **Taille** : S

- [ ] **T088** [FONDATEUR] Étiquette `v0.1-mvp` sur `main` une fois tout vérifié - `git tag`
  - **Dépendances** : T080, T081, T082, T083, T084, T085, T086, T087
  - **Note** : les e-mails du parcours (alerte, rapport) ne partiront pas tant que le domaine Resend n'est pas vérifié (T068, DNS OVH) — à noter comme limite connue si le test local est fait avant.
  - **Vérification** : `git tag v0.1-mvp` posé sur le commit de `main` correspondant au test local réussi, poussé sur GitHub.
  - **Taille** : S

## Phase 13 : Défauts trouvés au test local (28/09)

**But** : corriger ce que le parcours de la phase 12 a mis au jour. Les deux premiers bloquent le lancement.

- [x] **T089** [ING] Le bouton « Relancer un scan » ne fait rien - `decelio/app/(app)/sites/[siteId]/actions.ts:34`, `decelio/inngest/functions.ts`
  - **Dépendances** : Aucune
  - **EF/ENF** : EF-002
  - **Défaut** : `launchAuditCampaign` émet l'événement Inngest `campaign.run`. Aucune fonction ne s'abonne à cet événement — seul `app/scan.site` est enregistré. Reproduction : ouvrir la fiche d'un site, cliquer « Relancer un scan » ; la requête renvoie 200, l'interface annonce « Scan lancé. », aucun `ScanLog` n'est écrit et aucune exécution n'apparaît dans Inngest.
  - **Preuve : #181.** Le bouton émet désormais `app/scan.site` sur un `MonitoredSite` réel de l'utilisateur (le modèle hérité `Site` est refusé explicitement). Pas d'identifiant de déduplication, pour qu'une relance manuelle répétée fonctionne. Nouveau fichier de tests `app/(app)/sites/[siteId]/actions.test.ts`.
  - **Vérification** : le bouton déclenche un scan réel, une nouvelle ligne `ScanLog` apparaît, et l'exécution est visible dans le tableau de bord Inngest.
  - **Taille** : S

- [x] **T090** [ING] Faux message de succès sur la fiche d'un site - `decelio/app/(app)/sites/[siteId]/SiteActions.tsx:19-24`
  - **Dépendances** : Aucune
  - **EF/ENF** : constitution, article I (honnêteté de la mesure)
  - **Défaut** : le bloc `catch` affiche « Scan terminé, données actualisées. » quelle que soit l'erreur, avec un commentaire assumé dans le code (« simulate success for UI feedback »). Combiné à T089, l'utilisateur ne peut jamais apprendre que son scan a échoué. C'est exactement ce que la constitution interdit : ne jamais afficher un scan comme lancé s'il ne l'est pas réellement.
  - **Preuve : #181.** Le faux message est supprimé : un échec affiche la cause en rouge et reste à l'écran, un succès dit « Scan lancé » (jamais « terminé », le scan est asynchrone). Messages annoncés aux lecteurs d'écran.
  - **Vérification** : une erreur de relance affiche un message d'échec explicite, avec la cause.
  - **Taille** : S

- [x] **T091** [ING] Ajouter un domaine depuis le tableau de bord ne déclenche aucun scan - `decelio/app/actions/sites.ts`
  - **Dépendances** : Aucune
  - **Défaut** : `addMonitoredSite` et `addMonitoredSitesBulk` n'appellent jamais `inngest.send`. Seul `app/(app)/onboarding/actions.ts` émet `app/scan.site`. Un site ajouté depuis le tableau de bord reste sans aucun scan jusqu'au passage du cron quotidien.
  - **Décision du fondateur (28/09) : à corriger.** Un domaine ajouté depuis le tableau de bord doit déclencher un scan, comme dans l'onboarding.
  - **Preuve : #182.** Helper `triggerSiteScans`, identifiant déterministe `scan-site-<id>`, ne lève jamais. `addMonitoredSite` et `addMonitoredSitesBulk` renvoient `scanTriggered` ; le tableau de bord n'annonce un scan que s'il a réellement démarré. L'onboarding appelle le lot avec `{ triggerScan: false }` pour éviter un double scan.
  - **Vérification** : un site ajouté depuis le tableau de bord est scanné, une ligne `ScanLog` apparaît, et l'interface n'annonce un scan que lorsqu'il a réellement démarré.
  - **Taille** : S

- [x] **T092** [ING] Aucun repli d'expéditeur pour les e-mails d'alerte hors production - `decelio/lib/alerting/sendAlert.ts:33`
  - **Dépendances** : Aucune
  - **Défaut** : l'expéditeur est figé à `Decelio <bonjour@decelio.fr>`. Tant que le domaine n'est pas vérifié chez Resend, tout envoi d'alerte échoue en 403 et la fonctionnalité ne peut être vérifiée de bout en bout, même en local. Le refus lui-même est sain — on n'enregistre pas d'alerte non envoyée — mais il rend le test impossible.
  - **Décision du fondateur (28/09) : ajouter un expéditeur de repli**, pour rendre T083 testable sans attendre le DNS.
  - **Preuve : #182.** Nouveau `lib/email/from.ts` : `emailFrom()` lit `ALERT_FROM_EMAIL` à chaque appel, sinon garde `Decelio <bonjour@decelio.fr>`. Les six expéditeurs figés sont remplacés. `ALERT_FROM_EMAIL` documentée dans `.env.example`, à laisser vide en production. La production ne change pas tant que la variable n'est pas définie.
  - **Vérification** : en local, une alerte part vers l'adresse du compte Resend et `AlertEvent` est écrit.
  - **Taille** : S

- [x] **T093** [ING] Panne du scanner par montée d'undici : corrigée, garde posée - `decelio/lib/scanner/crawler.ts`, `.github/dependabot.yml`
  - **Dépendances** : Aucune
  - **Défaut** : la demande Dependabot #174 avait monté `undici` de 7.30.0 à 8.11.2. Depuis, **aucune requête du scanner ne partait** : `lib/scanner/crawler.ts` passe au `fetch` global un dispatcher construit avec la classe `Agent` d'undici (protection contre le rebinding DNS), et le `fetch` global de Node embarque sa propre copie d'undici en 7.x — il refuse un dispatcher venant d'un undici majeur différent (`UND_ERR_INVALID_ARG`). Reproduit : un scan réel d'example.com renvoyait `simpleStatus: "ERREUR"`, `httpStatus: 0`, `error: "fetch failed"` pour tous les robots. Les 749 tests n'ont rien vu : ils simulent tous `fetch`.
  - **Preuve : #183.** Retour à `undici: ^7.30.0` ; nouveau test sans réseau externe `lib/scanner/crawler.dispatcher.test.ts` (serveur `node:http` local, vrai `fetch`, vrai dispatcher épinglé), vérifié qu'il échoue sous undici 8 et passe sous undici 7 ; `undici` ajouté aux montées majeures ignorées de `.github/dependabot.yml`, avec la raison écrite. `createPinnedDispatcher` inchangée, protection SSRF intacte. Preuve après correction : scan réel d'example.com, les trois robots répondent HTTP 200.
  - **Vérification** : `lib/scanner/crawler.dispatcher.test.ts` vert ; un scan réel aboutit avec un code HTTP non nul.
  - **Taille** : S

- [ ] **T094** [ING] Tests de réalité : sortir la couche réseau, Stripe et l'e-mail de la simulation - `decelio/lib/scanner/*`, CI
  - **Dépendances** : Aucune
  - **Angle mort identifié le 28/09** : les 749 tests simulent le réseau, Stripe et l'envoi d'e-mails. Seule la base de données est réelle en CI (service PostgreSQL 17). C'est ce qui a laissé passer la panne `undici` de T093 sans qu'aucun test ne l'attrape.
  - **Note** : trois pistes retenues, par ordre de rentabilité — (1) des « tests de réalité » sans simulation, contre un serveur local, pour la couche réseau sortante (c'est ce qui aurait attrapé la panne undici) ; (2) une commande « vérification avant mise en ligne » lancée à la main, avec de vrais appels (scan réel, base, Stripe en mode test, envoi d'e-mail de test), qui ne peut pas tourner en CI faute de clés ; (3) un parcours client rejoué par Playwright, à faire seulement quand il y aura des clients.
  - **Décision du fondateur (28/09) : à traiter après le MVP**, pas maintenant.
  - **Vérification** : au moins la piste (1) est en place et aurait attrapé une régression du type undici/fetch.
  - **Taille** : M
