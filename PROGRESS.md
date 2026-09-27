# Decelio — état du projet et reprise

L'état actuel est dans `docs/REPRISE.md` ; ce fichier est le journal historique.

Source de vérité pour reprendre le travail, avec un humain ou un agent.
**Dernière mise à jour :** 27 septembre 2026.

---

## 27/09 — état et reprise

**Fin de soirée (27/09)** : e-mails aux couleurs du site (#167), plateforme détectée affichée sur la fiche site (#168), mode sombre de l'application (#169). `main` : 733 tests sur 89 fichiers.

**Fin de soirée (27/09), suite** : dépôt GitHub assaini (`main` protégée, suppression automatique des branches, branches mortes supprimées, Dependabot corrigé — #171, #173, #174 fusionnées, #172 fermée). Prochaine étape : test complet en local avant tout déploiement (décision du fondateur).

**Fin de journée (27/09)** : douze demandes de fusion supplémentaires sur `main`, dont l'essai gratuit de 14 jours (#139, ADR-002 appliqué), l'acceptation des CGV de bout en bout (#152, #155, #160), la page « Qui est derrière Decelio » (#150), le bandeau d'essai (#151), et la préparation du lancement (#142). `main` : 705 tests sur 87 fichiers, CI verte. Restent ouvertes #159 et #101, vertes, à fusionner par le fondateur (droits « workflow »). État détaillé et reste à faire : `docs/REPRISE.md`.

**Répartition du travail (fin du 27/09)** : l'agent Design et l'agent Ingénierie sont deux sessions locales ; l'Ingénierie travaille dans son propre worktree (`decelio-ing`) et délègue à des sous-agents. Le contrat de `docs/12-partage-du-travail.md` (propriété par fichier, branches non empilées) ne change pas.

### Fait aujourd'hui (fusionné dans `main`)

- **Scanner et diagnostic** : détection de la plateforme du site (`lib/scanner/platform.ts`, exposée dans `report.platform`, #95) ; correctifs propres à la plateforme détectée dans le PDF (#114) ; `robots.txt` en 401/403/429 rendu comme « à vérifier » plutôt qu'un verdict tranché, détection d'Akamai (#103) ; blocage général sans preuve visant un robot précis rendu comme « À VÉRIFIER », une sonde bloquée alors que la requête honnête passe reste un indice, pas une preuve (#107) ; sondes et alertes étendues aux robots de recherche (OAI-SearchBot, Claude-SearchBot, PerplexityBot, #111).
- **Fiabilité des alertes** : une alerte n'est plus envoyée qu'après confirmation par un second scan à 10 minutes (`REGRESSION_CONFIRMATION_DELAY`, #110) ; le scan quotidien ne couvre plus que les comptes payants et à jour, plafonné au quota du plan (`lib/sites/active-sites.ts`, #104).
- **Sécurité** : API durcie et purge RGPD des comptes résiliés (`inngest/functions/purge-cancelled-accounts.ts`, #96) ; IP client prise à droite de `x-forwarded-for` avec `TRUSTED_PROXY_HOPS` réglable, runbook `docs/runbooks/verifier-ip-client-render.md` (#98) ; limite de débit sur la connexion (10/IP, 5/e-mail, par tranche de 15 min), temps de réponse égalisé, tous les préfixes protégés (#115) ; `captureLead` ne relaie plus d'e-mail arbitraire, `sendAuditReportEmail` supprimée, `escapeHtml` appliqué dans les e-mails, `AuditLead.brandName` rendu facultatif (#116) ; en-têtes de sécurité HTTP et CSP sur toutes les routes (#120).
- **Mesure produit** : événements serveur du tunnel de conversion envoyés à PostHog (`signup_completed`, `site_added`, `checkout_started`, `subscription_activated`, `subscription_canceled`, #118).
- **Qualité outillage** : migration vers Vitest 5 (#99) ; Dependabot n'ouvre plus de PR sur les montées majeures bloquées (ESLint 10, TypeScript 7, Prisma 7, #100).
- **Design** : section produits de la page d'accueil (#97), harmonisation des pages publiques (#119), et d'autres changements visuels — voir `git log` côté Design pour le détail exact, non revérifié ici.

### État de `main`

Les quatre portes de qualité (`tsc`, `eslint`, `vitest`, `build`) sont vertes. `npx vitest run` (relancé pour cette mise à jour) donne **637 tests verts sur 81 fichiers**.

### Fait aujourd'hui (fusionné dans `main`, suite)

- #128 à #131 : quatre correctifs du scanner (taille `/api/pdf/diagnostic`, rebinding DNS, faux « COQUILLE VIDE » sur pages courtes, 429 auto-provoqués), **633 tests** ; reste : même biais dans l'ancienne route `/api/audit` (tâche séparée T077).
- #134 : PostHog par notre domaine (route `/ingest/[...path]`, suppression IP/cookies/forwarded, limite 256 Kio), **637 tests** ; reste : vérification réseau dans un vrai navigateur (T072 non cochée).
- #126 : pages légales (mentions légales, CGV, confidentialité), **[À REMPLIR]** en attente du SIREN ; #135 : informations publiques des prestataires, franchise TVA art. 293 B — **T070 cochée**.
- #121 : ADR-002/003/004 et liste de contrôle ; #122 : code mort (Design) ; #123 : « HT » → « TVA non applicable » ; #124 : pages de connexion harmonisées ; #133 : application et design system harmonisés ; #137 : préparation baromètre IA (docs) ; #138 : audit anti-slop 001 ; #140 : corrections audit anti-slop ; #141 : preuve réelle datée accueil.

### En cours, pas encore fusionné

- `feat/essai-gratuit-14-jours` — essai gratuit de 14 jours avec carte (ADR-002, T071).
- `chore/avant-lancement` — inscription Google dans le tunnel, `AUTH_TRUST_HOST`, suppression du texte « visibilité IA », suppression du client Stripe à la purge d'un compte (T078, préparation lancement).

Aucune de ces branches n'est prise en compte dans les cases cochées de `tasks/mvp-tasks.md` : la règle d'or reste de ne cocher que ce que `main` prouve.

### Ce qui bloque le lancement

- **SIREN en attente.** Micro-entreprise en franchise de TVA (ADR-003) : **aucune vente avant** de l'avoir reçu.
- **Resend : domaine créé, DNS à ajouter.** `decelio.fr` acheté depuis le 26/09, créé dans Resend le 27/09 (région eu-west-1), mais **non vérifié** : les enregistrements DNS OVH restent à ajouter (T068).
- **Neon `main` (production) sans historique de migrations.** Les tables existent (poussées par `db push`), mais aucune table `_prisma_migrations` : `npx prisma migrate deploy` échouera tel quel, il faut baseliner d'abord (T073). **Protection impossible en offre gratuite** (0 branche protégée autorisée) : ne jamais sortir la chaîne de `main` hors de Render.
- **Render : rootDir déjà `decelio/`** (vérifié), variables d'environnement et déploiement automatique à configurer dans le tableau de bord (T003/T004).
- **Aucun webhook Stripe** (T074), et Stripe reste en mode test — l'activation en réel (T075) suit le SIREN.

### Ordre des étapes jusqu'au lancement

Le détail par service est dans `docs/runbooks/checklist-mise-en-production.md` (sur `main` depuis #121) et `docs/REPRISE.md`. Dans l'ordre :

1. Fusionner les branches en cours listées ci-dessus (essai gratuit #139, préparation du lancement #142), puis vérifier PostHog dans un vrai navigateur.
2. Baseliner Neon `main` (aucune branche protégée possible en offre gratuite : la chaîne de `main` ne sort jamais de Render), puis saisir les variables d'environnement Render.
3. Créer le webhook Stripe de production, vérifier le domaine Resend.
4. Premier déploiement complet en mode test Stripe, avec les vérifications manuelles listées dans la checklist (en-têtes de sécurité, IP client, tunnel PostHog, scan réel, réception d'un e-mail).
5. Dès le SIREN reçu : compléter les pages légales, activer Stripe en réel, recréer les objets Stripe (prix, coupon, portail, webhook) en mode réel, puis ouvrir la prospection écrite.

---

**Stack :** Next.js 16 · React 19 · TypeScript strict · Prisma 5 · PostgreSQL · Tailwind 4 · NextAuth v5 · Stripe · Inngest · Resend · PostHog
**Contrainte absolue :** budget 0 €, autofinancé. Uniquement des offres gratuites qui autorisent un usage commercial (voir `docs/09-prd-mvp.md` §14, ENF-016).

---

## 1. Où on en est

**Positionnement :** « Comprendre pourquoi les IA ne lisent pas ou ne citent pas votre site, en commençant par ce qui bloque techniquement » (diagnostic gratuit). L'offre payante est la surveillance quotidienne d'un portefeuille de sites pour les **agences de maintenance WordPress et les agences SEO/GEO**, en France d'abord. Vente 100 % écrite, sans appel.

### Branches

| Branche | Rôle | État |
|---|---|---|
| `main` | Seule branche vivante. La CI (tsc, eslint, vitest, build) tourne sur chaque PR et sur chaque push. | Vert — a été rouge pendant plusieurs fusions le 25/09, remis au vert par la PR #68 (voir ci-dessous). |

Chaque tâche part de `main` sur sa propre branche `feat/t0XX-<sujet>` (ou `fix/`, `docs/`, `chore/`), une PR par tâche, fusion par l'humain une fois la CI verte.

**Un seul dossier de travail depuis le 26/09 au soir**, renommé `Decelio` le 27/09 (le dossier de l'application est passé de `cited/` à `decelio/`, voir T062 ci-dessous). Les checkouts parallèles par agent (`Cited-claude`, `Cited-grok`, `Cited-agent`, etc.) ont été supprimés, leur contenu étant intégralement présent dans le dépôt principal (voir « 26/09 au soir » ci-dessous). Chaque tâche reste une branche et une PR vers `main`, jamais de PR empilées.

### 25/09 : `main` remis au vert, historique de migrations reconstruit

**Trois défauts CI distincts ont été corrigés (PR #68)** :
- le job `prisma`, étape « Format check » : chemin doublé (`decelio/decelio/prisma/schema.prisma`) alors que le job fixe déjà `working-directory: cited` ;
- l'étape de détection de dérive de schéma : elle passait `--from-migrations` sans base shadow, ce qui ne peut jamais réussir (`Error: You must pass the --shadow-database-url if you want to diff a migrations directory.`) — elle utilise maintenant `--from-url "$DATABASE_URL"` après `migrate deploy` ;
- le job `quality-guard`, détection des tests ignorés : la regex `\.skip` non ancrée matchait la propriété ordinaire `res.data.skipped` — elle ne matche plus désormais que les formes réelles (`it.skip(`, `test.todo(`, `describe.only(`, `xit(`, `xdescribe(`).

**L'historique des migrations Prisma était cassé, pas seulement en dérive.** L'ancienne migration `20260916055018_init` créait 12 tables et 11 enums de l'ancien modèle abandonné « visibilité de marque », et sept tables que `schema.prisma` déclare (`Site`, `Page`, `BotScan`, `ScanResult`, `MonitoredSite`, `ScanLog`, `PageView`) n'avaient été créées par aucune migration — elles n'existaient sur Neon que parce qu'un `prisma db push` les y avait poussées. `prisma migrate deploy` échouait donc sur une base neuve avec `Error: P3018 ... ERROR: relation "MonitoredSite" does not exist`. L'historique a été fusionné en une migration unique, `20260925000000_init`, générée à partir du schéma. Vérifié sur un vrai Postgres (branche Neon jetable, depuis supprimée) : `migrate reset` l'applique, et `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel ./prisma/schema.prisma --exit-code` répond `No difference detected.`

**Conséquence pour T004, à retenir** : la base Neon a été peuplée par `db push` et n'a pas de table `_prisma_migrations`. Avant le premier `migrate deploy` en production, elle doit être baselinée avec `npx prisma migrate resolve --applied 20260925000000_init`. Le runbook `docs/runbooks/deploiement-render-neon.md` porte déjà cette procédure.

### Douze pull requests fusionnées le 25/09

#68 (CI et historique de migrations), #53 (T027 quota réel du tableau de bord), #62 (T026 journal d'alertes), #54 (T030 test d'intégration alerte unique), #50 (T022 point d'entrée unique d'ajout de site), #57 (T032b génération de rapport), #64 (T003/T004 blueprint Render, `/api/health`, runbook Neon — configuration et documentation seulement, rien n'est provisionné), #55 (T053 journalisation structurée), #67 (T036 tests de rapport), #69 (T048 e-mail de rapport disponible), #70 (T043 import réel de l'onboarding et premier scan), #59 (T034 page rapports sur données réelles). La PR #65 a été fermée, remplacée par #68 ; la PR #66 est remplacée par cette mise à jour.

**Décision de conception** : la branche T026 portait un récapitulatif quotidien par cron qui aurait envoyé un second e-mail pour chaque transition déjà couverte par l'alerte immédiate de `scan-site.ts`. Il a été retiré avant fusion, car EF-033 décrit l'alerte immédiate comme un comportement déjà existant et EF-034 exige exactement une alerte par changement d'état. Un récapitulatif quotidien reste possible plus tard, mais comme un remplacement assumé, avec une ADR et une mise à jour d'EF-033 — pas comme un ajout.

**Défaut réel trouvé au passage** : sur cette même branche, la ligne `AlertEvent` n'était écrite que par le récapitulatif ; le chemin réellement emprunté par `scan-site.ts` envoyait donc l'e-mail sans jamais l'enregistrer. Corrigé dans `sendAlert.ts` ; le journal d'alertes serait sinon resté vide en production.

53 tâches cochées sur 60 dans `tasks/mvp-tasks.md` — **c'est elle qui fait foi**, cette section n'est qu'un résumé. Rien de nouveau n'a été fusionné le 26/09 (voir section suivante), donc ce compte n'a pas bougé.

### 26/09 : défaut bloquant trouvé, service Render créé, PostHog audité, pas encore fusionné

**Défaut bloquant corrigé le 26/09 : la connexion par e-mail/mot de passe ne fonctionnait pas.** Le fournisseur `Credentials` était manquant. Il a été implémenté dans `decelio/auth.ts` (pour respecter le Edge Runtime sans crasher avec `node:crypto`), et couvert par 8 tests (`decelio/auth.test.ts`). La PR #75 a été fusionnée.

**PR #73 ouverte, pas fusionnée : T051 (audit données fictives).** Dix fichiers nettoyés (écran de connexion simplifié, `resolveDomainName` extrait pour éviter un domaine fictif quand `siteId` vaut littéralement `client-vitrine`, etc.), le garde-fou CI `quality-guard` devient bloquant (`FAIL=1`) au lieu de seulement avertir. Vérifié : 56 fichiers de test, 367 tests verts ; toute occurrence restante des chaînes de démonstration est dans un fichier `*.test.*`, exclu du garde-fou.

**Branche `feat/t005-posthog` poussée, aucune PR ouverte.** Audit en quatre points avant travail : exceptions client et mesure produit déjà en place (héritage de la PR #36, jamais cochée), absence de Sentry quasi complète (un commentaire mort corrigé), exceptions serveur absentes. Ajouté : `decelio/instrumentation.ts` et `decelio/instrumentation-client.ts` (convention Next.js 16), `decelio/lib/posthog-server.ts`. Autocapture et session replay désactivés explicitement côté client pour préserver le quota gratuit (1 M événements/mois, 5 000 enregistrements/mois). 368 tests verts. **Compte PostHog audité par MCP** : projet `282882`, nommé « Default project », fuseau UTC, `ingested_event: false` — **aucun événement n'a jamais été reçu**, malgré des indicateurs d'onboarding tous à `true`. Le code compile et teste correctement mais l'ingestion réelle n'est pas vérifiée. Reste au fondateur : renommer le projet, passer le fuseau en Europe/Paris, renseigner le vrai token en production, provoquer une erreur test et vérifier son apparition dans PostHog.

**Service Render créé par MCP.** `srv-darer6btqb8s73f7d670`, région Francfort, plan gratuit, URL `https://cited-6ihy.onrender.com`. **Deux champs refusés par l'API malgré l'envoi**, à corriger à la main dans le tableau de bord avant tout déploiement : Root Directory (vide au lieu de `cited`) et Health Check Path (vide au lieu de `/api/health`). Les variables d'environnement n'ont pas pu être posées par MCP non plus (erreur de type côté connecteur) — à saisir entièrement à la main.

**Resend confirmé sans domaine d'envoi** (`list-domains` → aucun résultat). Bloquant pour tous les e-mails produits (alertes, rapports, découverte, offre fondatrice) : sans domaine vérifié, seul `onboarding@resend.dev` peut envoyer, inutilisable pour démarcher de vraies agences. Achat d'un nom de domaine nécessaire — première dépense réelle du projet (budget 0 € sur les services, pas sur le domaine). Recherche de disponibilité et de prix lancée puis interrompue avant son terme (budget de session) ; à refaire. **Fait le 26/09** (voir plus bas) : `decelio.fr` et `decelio.eu` achetés. **Toujours pas vérifié dans Resend au 27/09** (relevé par MCP : `list-domains` ne renvoie toujours aucun résultat) — voir T068.

**Test local effectué, interrompu avant la connexion.** Branche Neon jetable `local-dev` (`br-old-mode-b21jizov`), séparée de la production, créée et **baselinée** (`prisma migrate resolve --applied 20260925000000_init`) — confirme en conditions réelles que la procédure du runbook fonctionne. Serveur `next dev` démarré, page d'accueil affichée avec du contenu réel, `/api/health` répond `{"status":"ok"}`. Interrompu juste avant de tester `/register`, qui aurait immédiatement buté sur le défaut Credentials ci-dessus. `decelio/.env` et `decelio/.env.local` créés dans ce worktree uniquement (ignorés par git, jamais poussés) — à recréer dans tout autre worktree ou machine, et à saisir séparément dans Render, qui ne les lit pas.

**Ménage** : 6 branches distantes entièrement fusionnées supprimées de GitHub. Les checkouts locaux `Decelio-claude` et `Decelio-claude-2` avaient les symlinks `.claude/agents` et `.claude/skills` cassés sous Windows (`core.symlinks=false` posé pour corriger). Dependabot invité à rebaser #28 et #30 sur le `main` réparé ; #28 a été remplacé par #72 (nouveau groupe minor/patch) après rebase, à revérifier.

**Incident du 24/09 (clos)** : T040, T041, T050 (PR #14-#16) et T047 (PR #20) étaient des PR empilées, fusionnées dans leur branche de base au lieu de `main`. Restaurées par les PR #33 et #34. Règle depuis : pas de PR empilées, ou fusion avec `--delete-branch`.



### 26/09 (Soir) : Audit de Production et Validation QA Vibe-Code
**MVP Officiellement Terminé.**
- Exécution complète des protocoles /production-code-audit et /vibecode-production-qa-validator.
- Ajout du fichier pp/sitemap.ts pour corriger une erreur 404 signalée par le crawler.
- Compilation de production réussie (○ /sitemap.xml statique, sans erreur TS/ESLint).
- Rapport formel généré dans docs/production-audit-report.md.
- **Toutes les tâches de 	asks/mvp-tasks.md sont désormais cochées.**
Le projet est prêt à être poussé vers le dépôt distant pour le déploiement CI/CD.

### 26/09 : Refonte Landing Page AEO et Optimisation DB

**Améliorations Frontend & Landing Page** :
La page d'accueil (HomePage.tsx) a été entièrement réécrite pour se concentrer sur l'AEO (Answer Engine Optimization) et s'inspirer des meilleurs templates SaaS (style Cruip / Astrowind).
- Mise en place d'une grille Bento (.bentoGrid) pour les fonctionnalités.
- Ajout de fonds radiaux (radial-gradients) et d'ombres portées modernes (--shadow-float).
- Refonte des sections : H1 percutant, blockquote AEO, grille Bento, preuve sociale, tableau comparatif, FAQ.

**Améliorations Base de données** :
- Ajout de la contrainte d'unicité @@unique([userId, url]) sur MonitoredSite pour empêcher la double surveillance.
- Ajout systématisé du champ updatedAt sur les modèles User, Client et MonitoredSite.
- Base locale mise à jour via prisma db push.

### Services provisionnés (mode test, 0 ?)

| Service | Ressource | Identifiants non secrets |
|---|---|---|
| Neon | Projet `cited`, Postgres 17, Francfort (`aws-eu-central-1`), base `cited` | `billowing-resonance-22258158`. Schéma poussé (`db push`), **aucune table `_prisma_migrations`** : à baseliner avec `npx prisma migrate resolve --applied 20260925000000_init` avant le premier `migrate deploy` en production (T004). Procédure détaillée : `docs/runbooks/deploiement-render-neon.md`. |
| Stripe (test) | 3 prix + coupon fondateur | `STRIPE_PRICE_SOLO/PRO/SCALE`, coupon `FONDATEUR50` (−50 %, à vie, 10 utilisations max) — tous vérifiés via MCP le 24/09. |
| PostHog | Cloud UE, erreurs + mesure produit (remplace Sentry, voir ADR-001) | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`. Setup côté code amorcé localement par le fondateur le 24/09, jamais commité — toujours pas commité au 25/09 (T005) : soit ces fichiers sont récupérés, soit le travail reprend de zéro. |
| Render | Espace « My Workspace » (`tea-d97ap06rnols73ck4o20`) | **Aucun service créé.** `render.yaml` (racine du dépôt, région Francfort, racine de build `decelio/`) et `docs/runbooks/deploiement-render-neon.md` sont maintenant sur `main` (PR #64) ; le fondateur doit encore appliquer le Blueprint et saisir les secrets. |
| Resend | Compte | 2 clés API existantes, aucun domaine d'envoi configuré. |
| Inngest | Env `production`/`branch` | Aucune app synchronisée. `INNGEST_SIGNING_KEY`/`INNGEST_EVENT_KEY` à créer. |

Points non vérifiés (T001) : les CGU d'usage commercial de Render, Neon, Resend et PostHog ne sont pas confirmées par écrit — aucun outil MCP n'expose ce texte contractuel, à faire à la main.

Cinq pull requests Dependabot restent ouvertes (#28 à #32), dont trois montées majeures (Prisma 7, TypeScript 7, `@types/node` 25) — reportées volontairement après la stabilisation.

### 26/09 au soir : un seul dossier de travail, toutes les branches sauvegardées

Le poste portait dix dossiers de travail en parallèle, hérités des sessions d'agents : des clones, des worktrees Git et de simples copies. Vérification faite avant tout ménage, aucun commit n'existait ailleurs que dans `Cited` : chaque tip de branche des clones `Cited-agent` et `Cited-grok` était déjà présent dans le dépôt principal.

**Douze branches poussées sur GitHub.** Neuf branches locales n'étaient atteignables depuis aucune ref `origin` et auraient disparu avec le disque : `chore/t003-t004-infra`, `feat/t005-posthog`, `feat/t027-real-dashboard-stats`, `feat/t030-single-alert`, `feat/t051-mock-data-audit`, `fix/t032b-test-types`, `local/chore-t003-t004-infra`, `t026-scope-reduction`, `tmp-t053`. Toutes poussées en fast-forward, sans `--force`. Les trois branches `rename/decelio-*` ont suivi après commit (voir ci-dessous).

**Renommage Cited vers Decelio : trois lots commités puis poussés.** Le travail existait en modifications non commitées dans trois worktrees d'agents, jamais enregistrées. Il s'agit uniquement de texte visible, sans changement de comportement : `rename/decelio-prospecting-kit` (`docs/06-kit-prospection.md`), `rename/decelio-foundation-docs` (`docs/08-constitution.md`), `rename/decelio-app-pages` (`cited/components/home/HomePage.tsx`). **Attention avant fusion** : `rename/decelio-app-pages` touche `HomePage.tsx`, que le travail en cours sur la landing page modifie aussi dans `main`. Un conflit est à prévoir.

**Supprimé** : les clones `Cited-agent` (dont l'`origin` pointait vers le dépôt local, pas GitHub) et `Cited-grok`, les worktrees `Cited-claude` et `Cited-claude-2`, le worktree cassé `cited-antigravity` (son `gitdir` pointait vers un chemin WSL `/mnt/c/...` inutilisable), `Cited-fixci` (ne contenait qu'un `node_modules`) et le script jetable `resolve.py`. Les douze worktrees d'agents sous `Cited/.claude/worktrees/` ont été désenregistrés. Le compte de branches locales est inchangé, 22 : aucun `git branch -d` n'a été exécuté.

**Conservé** : `Cited` (seul dossier vivant), `Cited-backups` (trois patches et deux sauvegardes) et `exemplesaasdesign` (références visuelles).

**Reste à faire à la main** : dix répertoires vides ou périmés subsistent sous `Cited/.claude/worktrees/`, que Git n'a pas pu effacer (« Permission denied » sous Windows). Sept sont vides ; trois (`agent-a89329667ee6ca825`, `agent-acb318020bf7fca7a`, `agent-ae08ade55a8e93651`) sont des copies antérieures au 25/09, reconnaissables aux trois anciennes migrations Prisma qu'elles contiennent encore. Aucune n'a de dépôt Git propre, donc aucune ne peut porter de commit unique. À supprimer avec `Remove-Item -Recurse -Force` depuis PowerShell.

### 27/09 : `main` remise au vert, renommage Decelio termine, landing refondue

**La CI etait rouge sur `main` depuis le 26/09 a 14 h 51**, alors que ce document annoncait le contraire. Deux jobs echouaient, et le second cachait un vrai defaut produit.

`lint` : vingt-trois apostrophes droites dans du texte JSX (`react/no-unescaped-entities`). Sans consequence a l'ecran, corrigees.

`prisma` : la detection de derive avait raison. `schema.prisma` declarait sept colonnes `updatedAt` et une contrainte d'unicite sur `MonitoredSite(userId, url)` qu'aucune migration ne creait. **Une base construite depuis les migrations ne les avait pas** : Prisma Client ecrivant `updatedAt` a chaque creation, toute creation de compte ou de site aurait echoue en production. Les 392 tests ne l'attrapaient pas, ils simulent la base. Migration `20260926230000_add_updated_at_and_site_unique` generee depuis l'etat reel, appliquee et verifiee sur la branche Neon `local-dev`. **La base de production n'a pas ete migree** : a faire avant tout deploiement.

**Renommage termine.** Depot GitHub renomme `kromz-dev/Decelio`, dossier de l'application passe de `cited/` a `decelio/` (603 fichiers), identifiants techniques internes alignes. `llms.txt` decrivait encore le positionnement abandonne au pivot — mesure de part de voix sur ChatGPT et Perplexity — et a ete reecrit, avec une section explicite sur ce que le produit ne fait pas. Les jetons `--color-cited` sont volontairement conserves : ils designent l'etat « cite par une IA », pas la marque.

**Environnement local bascule sur la bonne base.** `.env.local` pointait sur la branche Neon `main`, c'est-a-dire la production. La branche `local-dev`, creee la veille pour cet usage, n'avait jamais servi. Les tests locaux ecrivaient donc dans la vraie base.

**Audit de la page d'accueil** (`docs/11-audit-landing-page.md`) : dix correctifs, dont sept ecarts a la constitution. Corriges — `llms.txt`, « temps reel » contre quotidien a quatre endroits, trois surpromesses de mesure, deux faux badges de popularite, et deux fausses notifications de scan (« Claude a accede au /pricing, il y a 2 minutes ») presentees comme reelles dans le heros.

**Identite et refonte.** Logo integre, jeton `--brand` (#1d4ca4), icones du site creees — il n'y en avait aucune. Heros refondu en courbes de niveau reprenant le trace du logo, huit assistants IA servis localement. Grille tarifaire rendue comparable : les trois paliers exposaient chacun des lignes differentes, on ne pouvait pas voir ce que le palier d'entree n'avait pas. Donnees structurees JSON-LD ajoutees, il n'y en avait aucune.

**Defaut d'accessibilite** : `prefers-reduced-motion` raccourcissait les animations sans remettre `animation-delay` a zero. Les entrees partant d'une opacite nulle, le heros restait vide pres de deux secondes pour qui demande moins d'animation.

**Domaine achete** : `decelio.fr` et `decelio.eu`. Cela debloque Resend, qui n'avait aucun domaine d'envoi verifie — bloquant pour tous les e-mails produits. Verification a faire a la main (T068).

**Travail a deux agents** : `docs/12-partage-du-travail.md` fixe le partage entre l'agent design et l'agent ingenierie — proprietaire par fichier, worktrees plutot que copies de dossier, et interdiction pour les deux d'ecrire dans `PROGRESS.md`, `tasks/mvp-tasks.md` et la constitution.

### 27/09 (après-midi) : design refondu, pages publiques harmonisées

Détail et reprise : `docs/REPRISE-DESIGN.md`.

**Fusionné** : #97 (refonte de l'accueil autour de l'onde du logo, Bricolage Grotesque, cascade), #105, #106, #108, #109 (corrections issues de l'étude concurrentielle : causes de blocage nommées, robots d'entraînement et de recherche, comparatif « un complément », rapport comme argument de marge), #112 et #117 (cause « à vérifier » visible, plateforme détectée « d'après les indices de la page »), #113 (logo Stripe), #119 (`/pricing` et `/analyse` harmonisés, logo en « D »), #122 (code mort), #123 (TVA en franchise), #124 (pages de connexion harmonisées).

**Défauts réels corrigés** : avec `prefers-reduced-motion`, le titre, le texte et le diagnostic du héros étaient invisibles ; le bouton « Scanner un site » de `/pricing` pointait vers `/analyse`, qui n'existe pas ; `/analyse` titrait « Ce que les robots IA voient », contraire à la constitution ; un domaine long débordait sur mobile.

**En cours** : #126 (pages légales, à relire), branche `design/harmonisation-app` (application et `/design-system`, PR à ouvrir).

---

## 2. À faire ensuite, dans l'ordre

1. ~~**Corriger le fournisseur Credentials manquant**~~ (Corrigé via la PR #75, fusionnée)
2. ~~**Fusionner PR #73** (T051) une fois relue.~~ (Fusionnée)
3. ~~**Ouvrir la PR pour `feat/t005-posthog`** (T005) une fois relue — la branche est poussée, pas encore de PR.~~ (PR #76 fusionnée)
4. **T003 et T004** : le service Render existe (`srv-darer6btqb8s73f7d670`) mais Root Directory, Health Check Path et toutes les variables d'environnement restent à saisir à la main dans le tableau de bord (l'API MCP les a refusées). Puis baseline et migration Neon avec la commande de la section 1.
5. **Domaine d'envoi Resend** — aucun domaine possédé à ce jour. Achat nécessaire (première dépense réelle), puis vérification SPF/DKIM/DMARC dans Resend. Bloquant pour tout e-mail produit en dehors des tests.
6. ~~**T054** — audit d'accessibilité WCAG AA des écrans désormais raccordés aux données réelles.~~ (Vérifié le 26/09 via axe-core/playwright)
7. **T057** — vérification de bout en bout du pipeline de déploiement, une fois 1 et 4 faits.
8. ~~**T001** — confirmer par écrit les conditions d'usage commercial de Render, Neon, Resend et PostHog.~~ (Vérifié le 26/09 : l'usage commercial est autorisé sur tous ces Tiers Gratuits, sous réserve de respecter leurs limites de quotas respectives : 100 emails/jour pour Resend, 0.5GB pour Neon, etc.)
9. Puis le marketing à 0 € : le baromètre « les sites français bloquent-ils ChatGPT ? », puis la prospection écrite de 150 agences (`docs/06-kit-prospection.md`). Ne publier que des constats vérifiés.

Objectif à 90 jours : 10 agences payantes, environ 1 000 € de MRR. Critère d'arrêt : moins de 5 % des sites scannés présentent un problème vérifié (plan B : visibilité IA, voir `docs/05` §13).

---

## 3. Reprendre en 5 commandes (local)

```bash
git fetch origin && git checkout main
cd cited && npm install
npx prisma generate
npx tsc --noEmit && npx vitest run      # doit être vert
npm run dev                              # http://localhost:3000, /pricing, /design-system
```

Variables d'environnement : voir `decelio/.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `STRIPE_*`, `RESEND_API_KEY`, `INNGEST_*`, `NEXT_PUBLIC_POSTHOG_*`).

## 4. Reprendre avec Claude (économe)

Colle ceci au début d'une nouvelle session :

> Lis `PROGRESS.md` et `tasks/mvp-tasks.md`. Budget 0 €, sois économe en tokens. Prends la prochaine tâche non cochée, fais-la sur sa propre branche depuis `main`, vérifie (tsc, eslint, vitest), ouvre une PR, coche-la dans `tasks/mvp-tasks.md` une fois fusionnée, puis mets à jour `PROGRESS.md`.

Règle de tenue : **à chaque tâche terminée, cocher la case dans `tasks/mvp-tasks.md`, et mettre à jour la section 1 de ce fichier à chaque fin de session.**


