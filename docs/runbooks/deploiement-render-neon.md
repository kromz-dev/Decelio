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
`aws-eu-central-1`, base `cited`) a été appliqué par `db push` : il n'existe **aucune
table `_prisma_migrations`**. Il faut donc "baseliner" la base — dire à Prisma Migrate
quelles migrations sont déjà appliquées — avant le premier vrai `migrate deploy`.

L'historique des migrations a été fusionné une première fois (PR #68, `main`) en une
migration unique `20260925000000_init` — les trois anciennes migrations
(`20260916055018_init`, `20260916181000_add_password_hash`, `20260924040100_mvp_entities`)
n'existent plus dans `decelio/prisma/migrations/`. **Depuis, une seconde migration a été
ajoutée par le commit `95e9dc2`** : `20260926230000_add_updated_at_and_site_unique`, qui
ajoute la colonne `updatedAt` sur `User`, `Site`, `Page`, `PageView`, `AuditLead`, `Client`
et `MonitoredSite`, ainsi que l'index unique `MonitoredSite(userId, url)` — ces éléments
sont dans `schema.prisma` mais aucune des migrations précédentes ne les créait. Le
répertoire `decelio/prisma/migrations/` contient donc aujourd'hui **deux** migrations, pas
une seule, et le baseline ci-dessous doit couvrir les deux :

```
decelio/prisma/migrations/
├── 20260925000000_init/
└── 20260926230000_add_updated_at_and_site_unique/
```

1. **Récupérer les deux URL de connexion** dans la console Neon (Dashboard → projet
   `cited` → onglet **Connect** → sélectionner la base `cited`) :
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

3. **Vérifier qu'il n'y a aucune dérive** entre la base réelle (poussée par `db push`)
   et le schéma versionné, en comparant la base (via `DIRECT_URL`) au schéma :

   ```bash
   cd decelio
   npx prisma migrate diff \
     --from-url "$DIRECT_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --exit-code
   ```

   Le résultat de cette commande détermine **lesquelles** des deux migrations peuvent
   être baselinées (étape 4) — ce n'est pas le même geste selon que Neon porte déjà ou
   non les colonnes `updatedAt` et l'index unique de la seconde migration
   (`20260926230000_add_updated_at_and_site_unique`), ajoutés après coup par le commit
   `95e9dc2` :

   - **Cas 1 — `No difference detected.`** (code de sortie 0) : la base contient déjà
     tout ce que les deux migrations créent ensemble, `updatedAt` et l'index unique
     compris — un `db push` ultérieur les aura vraisemblablement poussés en prod avant
     que la migration ne soit écrite. Dans ce cas, **baseliner les deux migrations**
     (étape 4, cas 1) : aucune des deux ne doit être rejouée par `migrate deploy`, elle
     ne ferait qu'échouer sur des colonnes/index déjà existants
     (`column "updatedAt" of relation "User" already exists`, ou équivalent sur l'index).
   - **Cas 2 — le diff ne montre *que* les sept colonnes `updatedAt` et l'index unique
     `MonitoredSite_userId_url_key` manquants** (exactement le contenu de
     `decelio/prisma/migrations/20260926230000_add_updated_at_and_site_unique/migration.sql`,
     rien d'autre) : la base n'a pas reçu ce `db push`-là. Dans ce cas, **ne baseliner
     que la première migration** (étape 4, cas 2) et laisser la seconde en attente — le
     `prisma migrate deploy` de l'étape b l'appliquera pour de vrai au premier build, ce
     qui est le comportement voulu : la base rattrape réellement les colonnes qui lui
     manquent.
   - **Si le diff montre autre chose** (code de sortie non nul, contenu différent des
     deux cas ci-dessus) : ne baseliner ni l'une ni l'autre migration. La base de
     production contient des colonnes/tables qu'aucune des deux migrations locales ne
     recréerait à l'identique. Dans ce cas :
     a. Ne PAS lancer `migrate resolve` tant que le diff n'est pas expliqué.
     b. Comparer le diff ligne à ligne avec le contenu des deux migrations locales
        (`decelio/prisma/migrations/20260925000000_init/migration.sql` et
        `decelio/prisma/migrations/20260926230000_add_updated_at_and_site_unique/migration.sql`)
        pour identifier ce qui manque ou diffère.
     c. Si le diff révèle un oubli côté schéma (colonne ajoutée manuellement en base,
        jamais migrée), générer la migration manquante en local
        (`npx prisma migrate dev --name <nom>` contre une base de test, jamais contre
        la prod) puis rejouer cette étape avant de continuer.
     d. Si le diff est cosmétique uniquement (ordre de colonnes, index générés
        différemment par `db push`), documenter la décision ici avant de baseliner
        quand même — ne pas baseliner en silence sur un diff non expliqué.

4. **Baseliner les migrations** (inscrit une migration comme "déjà appliquée" dans
   `_prisma_migrations`, sans rejouer son SQL) — le geste dépend du cas identifié à
   l'étape 3 :

   - **Cas 1** (Neon a déjà les colonnes `updatedAt` et l'index unique) : baseliner
     les deux migrations, dans l'ordre :

     ```bash
     npx prisma migrate resolve --applied 20260925000000_init
     npx prisma migrate resolve --applied 20260926230000_add_updated_at_and_site_unique
     ```

   - **Cas 2** (Neon ne les a pas encore) : baseliner **uniquement** la première.
     Ne pas baseliner la seconde — elle doit rester en attente pour que
     `prisma migrate deploy` l'applique réellement au premier build Render (étape b) :

     ```bash
     npx prisma migrate resolve --applied 20260925000000_init
     ```

   Se tromper de cas casse le prochain déploiement : baseliner la seconde migration
   alors que Neon ne l'a pas reçue laisse la base sans `updatedAt` ni contrainte
   d'unicité (Prisma Client échoue à chaque écriture qui fixe `updatedAt`, et un même
   site peut être ajouté deux fois) ; ne pas la baseliner alors que Neon l'a déjà reçue
   fait échouer `migrate deploy` sur des colonnes/index déjà existants, ce qui bloque
   le build Render (§b, `buildCommand` chaîné par `&&`).

5. **Vérifier** :

   ```bash
   npx prisma migrate status
   ```

   - **Cas 1** (les deux migrations baselinées) : doit afficher
     `Database schema is up to date!`, aucune migration en attente. Un
     `npx prisma migrate deploy` sera alors un no-op — c'est le comportement attendu.
   - **Cas 2** (seule la première migration baselinée) : la sortie liste
     `20260926230000_add_updated_at_and_site_unique` comme migration non appliquée,
     ce qui est normal et attendu ici — c'est elle que `npx prisma migrate deploy`
     appliquera pour de vrai au premier build Render (§b). Ne pas confondre cette
     sortie avec une dérive : c'est exactement le rattrapage recherché dans ce cas.

   Ces deux comportements ont été vérifiés sur un Postgres réel (voir la note de
   maintenance en fin de section).

6. Une fois la base baselinée, **désexporter les variables** du terminal (fermer la
   session, ou `unset DATABASE_URL DIRECT_URL` / `Remove-Item Env:DATABASE_URL,Env:DIRECT_URL`)
   pour ne pas les laisser traîner dans l'historique du shell plus longtemps que
   nécessaire.

> **Note de maintenance — éviter que ce runbook ne se périme à nouveau.** Cette
> section a déjà pris du retard une fois (le commit `95e9dc2` a ajouté la migration
> `20260926230000_add_updated_at_and_site_unique` sans que le runbook soit mis à jour).
> Avant d'exécuter ce runbook, ou en le relisant après un moment, vérifier rapidement
> qu'il est toujours exact :
>
> ```bash
> ls decelio/prisma/migrations/
> ```
>
> Comparer la liste obtenue avec les noms de migrations cités dans cette section (au
> moment d'écrire ces lignes : `20260925000000_init` et
> `20260926230000_add_updated_at_and_site_unique`, dans cet ordre). Si `ls` révèle une
> migration supplémentaire non mentionnée ici, ou un nom différent, ce runbook est de
> nouveau périmé : ne pas baseliner à l'aveugle, mettre à jour la liste et les commandes
> `migrate resolve` de l'étape 4 pour couvrir exactement les migrations présentes dans
> `decelio/prisma/migrations/` avant de continuer. La confirmation qu'un jeu de
> migrations reconstruit bien le schéma versionné se fait sans toucher à Neon, sur un
> Postgres jetable (local ou Docker) :
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
> du dossier reconstruit exactement `schema.prisma` — c'est la vérification à refaire
> à chaque fois qu'une migration est ajoutée ou que ce runbook est révisé.

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
