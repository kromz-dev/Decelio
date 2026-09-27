# Runbook — Déploiement Render + baseline Neon (T003, T004, T057)

Ce document est la procédure que **le fondateur** exécute lui-même : elle manipule des
identifiants (chaîne de connexion Neon, clés API tierces) qu'aucun agent automatisé ne
doit récupérer ni afficher. Rien de ce runbook n'est exécuté par un outil MCP en écriture.

Prérequis avant de commencer : `render.yaml` (racine du dépôt) et ce runbook sont
mergés sur `main`. Voir aussi `docs/10-plan-technique.md` §5 (pile 0 €), §8/§8.1 (pas de
keep-alive Inngest, budget d'exécutions) et `PROGRESS.md` (état des services provisionnés).

---

## a. Baseline Neon (T004)

Le schéma de production (projet Neon `billowing-resonance-22258158`, Postgres 17,
`aws-eu-central-1`, base `cited`, branche Neon `main` = production, identifiant
`br-floral-bar-b2li0kvj`, compute `ep-morning-scene-b2pj6r6t`) a été appliqué par
`db push` : il n'existe **aucune table `_prisma_migrations`**. Il faut donc "baseliner"
la base — dire à Prisma Migrate quelles migrations sont déjà appliquées — avant le
premier vrai `migrate deploy`.

Le dossier `decelio/prisma/migrations/` contient aujourd'hui **cinq** migrations :

```
decelio/prisma/migrations/
├── 20260925000000_init/
├── 20260926230000_add_updated_at_and_site_unique/
├── 20260927000000_audit_lead_brand_name_optional/
├── 20260927120000_add_user_trial_fields/
└── 20260927180000_add_user_terms_acceptance/
```

La dernière, `20260927180000_add_user_terms_acceptance`, n'est pas encore fusionnée sur
`main` : elle arrive avec la demande de fusion #152. Le constat et les commandes
ci-dessous couvrent quand même les cinq, pour ne pas avoir à refaire ce travail au
prochain merge.

### Constat du 27/09/2026 : nous sommes dans le cas 1

Un relevé direct de la base de production (via le MCP Neon) tranche définitivement :
**cas 1** — les deux premières migrations sont déjà physiquement appliquées en base, les
trois suivantes ne le sont pas. Voici ce qui a été vérifié, pour que quelqu'un puisse
refaire le même constat si la base venait à changer entre-temps :

- Aucune table `_prisma_migrations` en production (confirmé). 18 tables présentes,
  **3 utilisateurs**, **0 abonné** (aucun `stripeCustomerId` ni `stripeSubscriptionId`
  renseigné), **0 ligne** dans `AuditLead`, **0 ligne** dans `MonitoredSite`.
- La colonne `updatedAt` existe déjà sur `AuditLead`, `BrandSettings`, `Client`,
  `MonitoredSite`, `Page`, `PageView`, `Site` et `User`, et l'index unique
  `MonitoredSite_userId_url_key` existe déjà. Autrement dit, tout le contenu de
  `20260925000000_init` **et** de `20260926230000_add_updated_at_and_site_unique` est
  déjà en base.
- Ces colonnes-là, en revanche, n'existent **pas** en production : `User.trialUsedAt`,
  `User.stripeTrialEnd`, `User.termsAcceptedAt`, `User.termsVersion`. Et
  `AuditLead.brandName` y est encore `NOT NULL` (pas encore nullable).
- Comptage de colonnes : **124 en production contre 128** sur la branche Neon
  `local-dev` (hors `_prisma_migrations`). L'écart correspond exactement à ces quatre
  colonnes, plus la nullabilité de `AuditLead.brandName` — rien d'autre.
- La branche Neon `local-dev` (identifiant `br-old-mode-b21jizov`, compute
  `ep-sweet-cherry-b282rxpt`) porte, elle, les cinq migrations enregistrées dans
  `_prisma_migrations`.
- Sur `local-dev` : `npx prisma migrate diff` (dossier `migrations/` vers
  `schema.prisma`, rejoué sur une base fantôme temporaire créée puis supprimée pour
  l'occasion ; puis rejoué dans l'autre sens, base `local-dev` vers le schéma) répond
  `No difference detected.` dans les deux cas, et `npx prisma migrate status` répond
  `Database schema is up to date!`. Le dossier de migrations reconstruit donc bien
  exactement le schéma versionné — les migrations elles-mêmes ne sont pas en cause.

**Si ce constat doit être refait** (nouvelle migration ajoutée, doute sur une
modification manuelle de la base de production, ou simplement pour revérifier avant
d'agir) : relever à nouveau, via le MCP Neon ou
`npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code`,
l'écart exact entre la base réelle et `schema.prisma`, colonne par colonne, avant de
baseliner quoi que ce soit. Un diff qui ne correspond pas exactement au contenu attendu
d'une ou plusieurs migrations ne doit jamais être baseliné à l'aveugle : il faut d'abord
l'expliquer (comparer ligne à ligne avec le SQL des migrations locales, dans
`decelio/prisma/migrations/<nom>/migration.sql`).

1. **Récupérer les deux URL de connexion** dans la console Neon (Dashboard → projet
   `cited` → branche `main` → onglet **Connect** → sélectionner la base `cited`) :
   - URL **poolée** (hôte se terminant par `-pooler`) → deviendra `DATABASE_URL`.
   - URL **directe / non poolée** (même hôte, sans `-pooler`) → deviendra `DIRECT_URL`.
     C'est celle-ci qu'il faut utiliser pour toutes les commandes `prisma migrate *`
     ci-dessous : la connexion poolée passe par PgBouncer en mode transaction, qui ne
     supporte pas les verrous de session utilisés par Prisma Migrate (erreurs typiques :
     `prepared statement "s0" already exists`, `SET search_path` qui ne persiste pas).

2. **Exporter les variables dans le terminal seulement** — ne jamais les coller dans un
   fichier commité (`.env`, `.env.local` compris s'il est suivi par erreur) :

   ```bash
   # PowerShell
   $env:DATABASE_URL = "postgresql://...-pooler.../cited?sslmode=require"
   $env:DIRECT_URL   = "postgresql://.../cited?sslmode=require"   # sans -pooler
   ```

   ```bash
   # bash
   export DATABASE_URL="postgresql://...-pooler.../cited?sslmode=require"
   export DIRECT_URL="postgresql://.../cited?sslmode=require"     # sans -pooler
   ```

3. **Baseliner les deux premières migrations, puis appliquer les suivantes pour de
   vrai**, dans cet ordre exact, `DATABASE_URL` et `DIRECT_URL` pointés sur Neon `main` :

   ```bash
   cd decelio
   npx prisma migrate resolve --applied 20260925000000_init
   npx prisma migrate resolve --applied 20260926230000_add_updated_at_and_site_unique
   npx prisma migrate deploy
   ```

   Les deux premières commandes ne rejouent **aucun SQL** : elles se contentent
   d'inscrire dans `_prisma_migrations` ce qui est déjà physiquement en base (constat
   ci-dessus). La troisième, `migrate deploy`, applique réellement les migrations qui
   restent :

   | Migration | Effet | Risque |
   |---|---|---|
   | `20260927000000_audit_lead_brand_name_optional` | `AuditLead.brandName` passe en nullable | Aucun : 0 ligne dans `AuditLead` en production. |
   | `20260927120000_add_user_trial_fields` | Ajoute `User.trialUsedAt` et `User.stripeTrialEnd`, puis un `UPDATE` qui marque `trialUsedAt` pour les abonnés déjà existants | Aucun : 0 abonné en production. |
   | `20260927180000_add_user_terms_acceptance` | Ajoute `User.termsAcceptedAt` et `User.termsVersion`, deux colonnes nullables sans valeur par défaut | Aucun : les 3 utilisateurs existants restent à `NULL` sur ces deux colonnes. |

   La troisième n'est pas encore fusionnée sur `main` (demande de fusion #152). Tant
   qu'elle n'y est pas, `migrate deploy` n'appliquera que les deux premières lignes de
   ce tableau.

4. **Vérifier** :

   ```bash
   npx prisma migrate status
   ```

   Avec seulement les deux premières migrations baselinées à l'instant, cette commande
   **ne dira pas** `Database schema is up to date!` : elle listera comme non appliquées
   les migrations du tableau ci-dessus (deux ou trois, selon que #152 est fusionnée au
   moment où l'étape 3 a été jouée). C'est normal et attendu, ce n'est pas une dérive —
   c'est le rattrapage volontaire que l'étape 3 vient d'effectuer avec `migrate deploy`.
   Une fois l'étape 3 terminée avec succès, ce `migrate status` doit à nouveau afficher
   `Database schema is up to date!`, cette fois avec toutes les migrations présentes
   dans `decelio/prisma/migrations/` enregistrées comme appliquées.

5. Une fois la base baselinée et à jour, **désexporter les variables** du terminal
   (fermer la session, ou `unset DATABASE_URL DIRECT_URL` /
   `Remove-Item Env:DATABASE_URL,Env:DIRECT_URL`) pour ne pas les laisser traîner dans
   l'historique du shell plus longtemps que nécessaire.

> **Sans ce baseline, le premier déploiement Render échoue.** `render.yaml` chaîne
> `npx prisma migrate deploy` dans son `buildCommand` :
> `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`. Le plan
> `free` de Render n'a pas de `preDeployCommand`, donc la migration tourne en fin de
> build, avant `npm run build`. Sans baseline, `migrate deploy` tenterait de rejouer
> `20260925000000_init` sur des tables déjà existantes et échouerait immédiatement — et
> comme `buildCommand` est une seule commande chaînée par `&&`, tout le build échoue
> avec lui (voir §b, étape 5, pour le détail des conséquences sur le déploiement).

> **Deux mises en garde à garder en tête pour toute la manipulation ci-dessus :**
> - **Impossible de protéger la branche Neon `main` en offre gratuite** (la protection
>   de branche est réservée aux offres payantes de Neon) : la seule protection réelle
>   ici est humaine — ne jamais donner la chaîne de connexion de `main` à un outil ou un
>   agent automatisé, seulement au fondateur lui-même dans un terminal manuel.
> - **Ne jamais faire sortir la chaîne de connexion de `main` de Render** une fois
>   saisie dans les variables d'environnement du service (§b) : ne pas la recopier dans
>   un fichier commité, un outil MCP, ou une conversation avec un agent, y compris pour
>   du débogage.

> **Note de maintenance — éviter que ce runbook ne se périme à nouveau.** Cette section
> a déjà pris du retard deux fois : une première fois quand le commit `95e9dc2` a ajouté
> la migration `20260926230000_add_updated_at_and_site_unique` sans que le runbook soit
> mis à jour (on est passé de 1 à 2 migrations sans le documenter), puis une seconde
> fois avec l'ajout de `20260927000000_audit_lead_brand_name_optional`,
> `20260927120000_add_user_trial_fields` et `20260927180000_add_user_terms_acceptance`
> (on est passé de 2 à 5). **Au 27/09/2026, ce runbook a été vérifié pour 5 migrations**
> — c'est le chiffre à comparer pour repérer un retard futur :
>
> ```bash
> ls decelio/prisma/migrations/
> ```
>
> Comparer la liste obtenue avec les cinq noms cités plus haut. Si `ls` révèle une
> migration supplémentaire non mentionnée ici, ou un nom différent, ce runbook est de
> nouveau périmé : ne pas baseliner à l'aveugle, refaire le constat (voir l'encadré
> « Si ce constat doit être refait » ci-dessus) puis mettre à jour la liste des
> migrations, le tableau des effets/risques et les commandes `migrate resolve` /
> `migrate deploy` avant de continuer. La confirmation qu'un jeu de migrations
> reconstruit bien le schéma versionné se fait sans toucher à Neon, sur un Postgres
> jetable (local ou Docker) :
>
> ```bash
> npx prisma migrate diff \
>   --from-migrations prisma/migrations \
>   --to-schema-datamodel prisma/schema.prisma \
>   --shadow-database-url "postgresql://<user>:<password>@localhost:<port>/<db>" \
>   --exit-code
> ```
>
> `No difference detected.` (code de sortie 0) confirme que l'ensemble des migrations
> du dossier reconstruit exactement `schema.prisma` — c'est la vérification à refaire à
> chaque fois qu'une migration est ajoutée ou que ce runbook est révisé.

---

## b. Créer le service Render (T003)

1. Dashboard Render → espace **My Workspace** → **New** → **Blueprint**.
2. Connecter le dépôt GitHub `kromz-dev/Decelio` (OAuth Git si demandé).
3. Render détecte `render.yaml` à la racine du dépôt — le sélectionner. Il décrit un
   service web unique `cited` (`rootDir: decelio`, runtime Node 22, région Francfort,
   plan `free`, branche `main`, déploiement auto à chaque commit).
4. Renseigner chaque variable marquée `sync: false` dans le formulaire de Blueprint
   (ou ensuite dans Dashboard → service `cited` → **Environment**) :

   | Variable | Où la trouver |
   |---|---|
   | `DATABASE_URL` | Neon → Connect → URL **poolée** (hôte `-pooler`), même valeur qu'à l'étape a |
   | `DIRECT_URL` | Neon → Connect → URL **directe** (sans `-pooler`) |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → APIs & Services → Identifiants → client OAuth existant (ou à créer, type "Application Web", origine `https://<service>.onrender.com`, URI de redirection `https://<service>.onrender.com/api/auth/callback/google`) |
   | `NEXT_PUBLIC_APP_URL` | À renseigner **après** le premier déploiement, une fois l'URL `*.onrender.com` connue (Dashboard → service → en haut de la page). Retourner dans Environment pour la mettre à jour et redéployer. |
   | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | PostHog Cloud UE → Project Settings → Project API Key |
   | `INNGEST_SIGNING_KEY` | Inngest Cloud → app `cited` → Manage → Signing key |
   | `INNGEST_EVENT_KEY` | Inngest Cloud → app `cited` → Manage → Event keys |
   | `STRIPE_SECRET_KEY` | Stripe Dashboard (mode **test** tant que le MVP n'est pas lancé) → Developers → API keys → Secret key |
   | `STRIPE_WEBHOOK_SECRET` | Créé à l'étape c ci-dessous (Stripe → Webhooks → signing secret de l'endpoint) |
   | `STRIPE_PRICE_SOLO` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_SCALE` | Stripe Dashboard → Product catalog → chaque prix récurrent → Price ID |
   | `RESEND_API_KEY` | Resend Dashboard → API Keys |
   | `GEMINI_API_KEY` | Google AI Studio → Get API key |
   | `GROQ_API_KEY` | Groq Console → API Keys |
   | `ENGINE_CACHE_SECRET` | Valeur aléatoire ≥ 32 caractères, générée localement (ex. `openssl rand -base64 32`) — jamais partagée avec un outil automatisé |

   `AUTH_SECRET` est générée automatiquement par Render (`generateValue: true` dans
   `render.yaml`) — rien à saisir. `NEXT_PUBLIC_POSTHOG_HOST`, `GEMINI_BILLING_TIER` et
   `STRIPE_FOUNDER_COUPON` sont déjà fixées dans `render.yaml` (valeurs non secrètes).

5. Cliquer **Apply**. Le premier déploiement construit avec :
   `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`,
   puis démarre avec `npm start`.

   **Note sur `migrate deploy`** : le plan `free` de Render ne propose pas de
   `preDeployCommand` (réservé aux plans payants d'après la doc du skill
   `render-render-web-services`, qui ne documente d'ailleurs pas explicitement cette
   restriction du plan gratuit — comportement à confirmer dans le Dashboard au moment
   de configurer le service). Par prudence, `prisma migrate deploy` est donc exécuté à
   la fin de `buildCommand`, après `npm ci` et `prisma generate` (il a besoin du CLI
   Prisma installé) et avant `npm run build`.

   **Conséquence importante : `buildCommand` est une seule commande chaînée par `&&`,
   donc si `npx prisma migrate deploy` échoue (pour n'importe quelle raison — base non
   baselinée, migration invalide, base injoignable), tout le build échoue immédiatement**
   : `npm run build` ne s'exécute pas, le déploiement Render reste sur l'ancienne
   version déjà en ligne (pas de coupure de service), mais le nouveau code n'est jamais
   servi. Si `DATABASE_URL`/`DIRECT_URL` ne pointent pas encore vers la base baselinée à
   l'étape a, ce build échouera — faire l'étape a en premier. En cas d'échec, consulter
   les logs de build dans le Dashboard Render pour voir la sortie exacte de
   `prisma migrate deploy`.

6. Une fois le premier déploiement `live`, copier l'URL `https://<service>.onrender.com`
   et la coller dans la variable `NEXT_PUBLIC_APP_URL` (Environment → modifier → Save,
   déclenche un redéploiement).

---

## c. Webhooks

### Stripe

1. Stripe Dashboard (mode test) → **Developers → Webhooks → Add endpoint**.
2. URL : `https://<service>.onrender.com/api/webhooks/stripe`.
3. Événements à sélectionner — exactement ceux gérés par
   `decelio/app/api/webhooks/stripe/route.ts` :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Une fois l'endpoint créé, copier son **Signing secret** (`whsec_...`) dans la
   variable Render `STRIPE_WEBHOOK_SECRET`.

### Inngest

1. Inngest Cloud → app **cited** → **Sync new app**.
2. URL de synchronisation : `https://<service>.onrender.com/api/inngest`.
3. Inngest appelle cette URL en `PUT` pour découvrir les fonctions (`daily-scan-dispatcher`,
   `scan-single-site`, etc., cf. `docs/10-plan-technique.md` §8) ; `INNGEST_SIGNING_KEY`
   et `INNGEST_EVENT_KEY` (déjà saisies à l'étape b) doivent être renseignées côté Render
   **avant** de lancer le sync, sinon `app/api/inngest/route.ts` refuse la requête
   (`throw new Error("INNGEST_SIGNING_KEY est obligatoire en production…")`).
4. Vérifier dans Inngest Cloud que les fonctions apparaissent avec leur cron respectif.

---

## d. Réveil du service (Render free tier)

Le service `free` se met en veille après ~15 min sans trafic (réveil ~1 min à la
requête suivante). Un scan public déclenché pendant la veille subirait ce délai. La
route `GET /api/health` (voir `decelio/app/api/health/route.ts`) ne touche **jamais** la
base — c'est volontaire (§8 du plan technique) : un ping fréquent qui interrogerait Neon
empêcherait Neon de se mettre en veille à son tour et consommerait tout le quota gratuit
de calcul (100 CU-h/mois).

Mettre en place un pinger externe gratuit sur `https://<service>.onrender.com/api/health`,
toutes les **10 à 14 minutes** (sous les 15 min de mise en veille, avec de la marge).
Deux options gratuites qui autorisent explicitement un usage commercial — **à vérifier
soi-même dans leurs CGU au moment de l'inscription**, elles peuvent changer :

- **UptimeRobot** (plan gratuit, jusqu'à 50 moniteurs, intervalle minimum 5 min) —
  https://uptimerobot.com
- **cron-job.org** (gratuit, intervalle configurable jusqu'à la minute) —
  https://cron-job.org

Rappel budget Render : 750 h gratuites par espace de travail et par mois couvrent un
**seul** service tournant 24 h/24 (24 × 31 ≈ 744 h) — ne pas ajouter d'autre service
`free` à `My Workspace` sans recompter ce budget.

---

## e. Vérifications de fin (T003, T004, T057)

- [ ] Un `git push` sur `main` déclenche un déploiement visible dans Render (T003).
- [ ] `https://<service>.onrender.com/api/health` répond `200 { "status": "ok" }`
      (T003 — le service répond sur son URL `*.onrender.com`).
- [ ] `npx prisma migrate status` (avec `DIRECT_URL` de production exportée dans le
      terminal) répond `Database schema is up to date!`, aucune migration en attente
      (T004).
- [ ] Les 4 portes de qualité restent vertes en CI sur `main`
      (`npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`).
- [ ] T057 : depuis une PR de test (changement trivial dans `decelio/`), vérifier que la
      CI passe, que la fusion sur `main` déclenche automatiquement un déploiement
      Render, et que `/api/health` répond une fois le déploiement `live` — sans
      intervention manuelle autre que la fusion de la PR.
