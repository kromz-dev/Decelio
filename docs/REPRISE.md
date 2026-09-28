# Reprise du projet — état au 28/09/2026

À lire par toute personne ou IA qui reprend le développement, **après** `CLAUDE.md`. Ce fichier décrit ce qui est sur GitHub, ce qui est en cours et ce qui reste à faire. La liste détaillée de la configuration est dans `docs/runbooks/checklist-mise-en-production.md`.

Règle d'or : on ne coche une tâche, dans `tasks/mvp-tasks.md`, que si `main` le prouve.

## 0. Session du 28/09 — à lire en premier

**Le dépôt a déménagé.** Un seul dossier désormais : `business/saas/decelio`, avec le `.git` dedans, l'application dans `decelio/decelio`. C'est l'ancien `Cited` renommé ; le worktree `decelio-ing` n'existe plus. Les dossiers morts sont dans `business/saas/_archive/`, et une sauvegarde complète d'avant l'opération est dans `business/saas-backup-2026-09-28/` — ne pas la supprimer sans vérification. Fusionné par #178.

**Pourquoi Render échouait depuis le 25/09** : `DIRECT_URL` n'était pas définie sur le service. `prisma migrate deploy` tourne dans le `buildCommand` et lit `directUrl` ; `render.yaml` la déclare `sync: false`, donc Render ne la remplit jamais seul. Les variables ont été collées par le fondateur le 28/09. **Aucun déploiement n'a encore été relancé** — c'est la prochaine action côté Render.

**Test local du MVP** : T080, T081, T082, T084 validés. T083 bloqué par Resend (403, domaine non vérifié) — comportement correct du code, qui n'enregistre pas une alerte non envoyée. T087 partiel, aucun défaut : zéro erreur console, zéro violation CSP sur treize écrans, PostHog toujours par `/ingest`. Restent T085, T086, T088.

**L'ordre du parcours n'est pas l'ordre numérique** : le plan gratuit a `maxSites: 0`, donc T084 (souscription) doit précéder T082 (ajout de site).

**Quatre défauts ouverts en phase 13.** T089 et T090 bloquent le lancement : le bouton « Relancer un scan » émet un événement qu'aucune fonction n'écoute, et il affiche « Scan terminé » même en échec. T091 et T092 appellent une décision du fondateur.

**Tranché, à ne plus rechercher** : Gemini et Groq ne servent pas au scan. Le renommage Neon `cited` → `decelio` a été refusé par le classifieur de permissions de la session ; à faire depuis la console Neon, en dernier, en sachant que les quatre chaînes de connexion seront à recopier ensuite.

## 1. Ce qui est sur `main`

- Code vérifié en fin de journée : `tsc`, `eslint`, `vitest` (**733 tests sur 89 fichiers**) et `build` au vert. CI verte sur les derniers commits.
- Fusionné depuis hier soir :
  - **E-mails aux couleurs du site** (#167) : gabarit commun `lib/email/layout.ts` (logo servi depuis `https://decelio.fr`, couleurs du site, bouton en pilule, polices système, pied `contact@decelio.fr` + `/confidentialite`, verdicts avec forme et mot), appliqué à la réinitialisation du mot de passe, la découverte, le rapport mensuel, la fin d'essai, l'alerte et le récapitulatif, l'offre fondatrice. Pas d'e-mail de bienvenue, il n'existe pas.
  - **Plateforme détectée affichée sur la fiche d'un site** (#168) : lue dans le payload du `ScanLog`, sans migration (`lib/sites/latest-platform.ts`, schéma partagé `lib/scanner/platform-schema.ts`).
  - **Mode sombre de l'application** (#169, Design).
  - **Essai gratuit de 14 jours** (#139, ADR-002, maintenant « appliqué », #157).
  - **Préparation du lancement** (#142) : `AUTH_TRUST_HOST` dans `.env.example`, `signup_completed` après une connexion Google, texte « visibilité IA » retiré, suppression du client Stripe à la purge RGPD.
  - **PROGRESS.md et tâches à jour** (#143).
  - **Correctif scanner** (#146) : le faux « COQUILLE VIDE » de l'ancienne route `/api/audit` est corrigé (statut `LOW_TEXT` compté comme accessible).
  - **Textes et verdicts** (#148) : plus de promesse de citation, blocage général rendu « à vérifier », fiche site, mentions « en préparation ».
  - **Page « Qui est derrière Decelio »** (#150, T067).
  - **Bandeau d'essai et annonce de l'essai** (#151, Design).
  - **Acceptation des CGV côté serveur** (#152) : `User.termsAcceptedAt`, `termsVersion`, `lib/legal/terms.ts`.
  - **Case « J'accepte les CGV » à l'inscription** (#155).
  - **CGV : carte demandée à la souscription** (#156).
  - **Date et version en tête des CGV** (#160) : `TERMS_VERSION = "2026-09-27-2"`.
  - **Baseline Neon répété et documenté** (#161, dans `docs/runbooks/deploiement-render-neon.md`).
  - Fichiers versionnés (#162, #163), Dependabot (#81, #84, #86), baromètre marketing (#144, #147, #149).
- Décisions : `docs/decisions/ADR-002` (essai de 14 jours, appliqué), `ADR-003` (franchise de TVA), `ADR-004` (PostHog par notre domaine).
- La CI ne tourne que si une demande de fusion touche `decelio/**` ou `.github/workflows/**`. Une demande qui ne change que des docs n'a pas de contrôles.

## 2. En cours

- **Dépôt GitHub assaini (27/09, soir)** : `main` est désormais **protégée** — toute modification passe par une demande de fusion (PR), même pour l'administrateur ; pas d'écrasement (force push) ni de suppression de `main` ; aucune approbation obligatoire (fondateur seul). Les branches sont **supprimées automatiquement** après fusion. Les branches mortes ont été supprimées.
- **#159 (hygiène des secrets)** et **#101 (CodeQL v4)** : vertes, mais touchent `.github/workflows` — fusion par le fondateur, l'agent n'a pas l'autorisation « workflow ».
- **`claude/upbeat-franklin-3lkvc0`** : branche de compétences d'agent ajoutées le 27/09, non fusionnée, à décider par le fondateur.
- **Dependabot** : #173 (lucide-react, resend, three) et #174 (undici 8, compatible Node 22.19+, Render sur Node 22) fusionnées ; #172 (PostgreSQL 18 pour la base locale) fermée — on garde PostgreSQL 17, comme Neon en production. #171 a corrigé l'écosystème docker → docker-compose.
- Aucune autre branche ouverte connue à cette date.

## 3. Reste à faire

### Code (Ingénierie)

Rien en attente côté code ; suite : configuration et déploiement ci-dessous.

### Design

Détail complet : `docs/REPRISE-DESIGN.md`.

### Configuration

| Service | État vérifié le 27/09 | Reste à faire | Bloqué par |
|---|---|---|---|
| Resend | Domaine `decelio.fr` **créé** dans Resend (région eu-west-1), statut **`not_started`** : la vérification n'a pas commencé. | Ajouter chez OVH : TXT `resend._domainkey` (valeur dans le tableau de bord Resend), MX `send` → `feedback-smtp.eu-west-1.amazonses.com` (priorité 10), TXT `send` → `v=spf1 include:amazonses.com ~all`, CNAME `rsend` → `send.forge.rmta.net`. Puis lancer la vérification. | Accès OVH |
| Stripe (test) | Portail client (`bpc_1UK9qEE0KhuxlY8ktCu3wqFY`) porte maintenant `privacy_policy_url` (`https://decelio.fr/confidentialite`) et `terms_of_service_url` (`https://decelio.fr/cgv`). | Toujours aucun webhook. Pied de page des factures (ADR-003). Renommer le compte « Cited » en « Decelio ». | Déploiement pour le webhook |
| Stripe (réel) | Non activé, un seul compte visible (mode test). | Activer, puis recréer prix, coupon, portail et webhook | SIREN |
| Neon `main` (production) | Baseline documenté et rejoué sans risque sur une branche jetable (voir `docs/runbooks/deploiement-render-neon.md`, section a). | Lancer le baseline pour de vrai au déploiement, avec la chaîne de `main`, jamais avant. | Fondateur, au déploiement |
| Neon `local-dev` | Toutes les migrations appliquées, schéma identique à `schema.prisma`. Confirmé le 28/09 : `migrate status` répond « Database schema is up to date! ». | — | — |
| Render | Root Directory `decelio/`, région Francfort, `healthCheckPath` `/api/health`, déploiement automatique coupé. Quatre déploiements en échec (`build_failed`) entre le 25 et le 27/09, cause identifiée : `DIRECT_URL` absente. `DATABASE_URL` et `DIRECT_URL` collées par le fondateur le 28/09. | Relancer un déploiement manuel et vérifier `/api/health`. Compléter les autres variables de `.env.example` (`AUTH_TRUST_HOST=true`, `TRUSTED_PROXY_HOPS=1`, `RESEND_API_KEY`, clés Inngest, Stripe, PostHog). Domaine `decelio.fr`. Décider si `autoDeploy` repasse à `yes`. Secrets collés par le fondateur dans le tableau de bord, jamais dans une conversation. | Fondateur |
| Inngest | — | Déclarer l'application avec l'URL de production, puis ajouter les clés | Déploiement |
| Google OAuth | Pas de bouton « Continuer avec Google » à l'écran actuellement. | Ajouter l'URL de retour de production ; poser la mention CGV Google avec le bouton, quand il existera. | Déploiement |
| PostHog | Vérification locale faite par le Design dans un navigateur : aucune requête hors `localhost`, événements bien sur `/ingest`. | Refaire la vérification une fois l'application déployée (T072 reste non cochée). | Déploiement |

### Fondateur

- **Décision du fondateur : on ne déploie pas tant que le MVP n'est pas entièrement testé en local** (Neon `local-dev`, Stripe en mode test). C'est la prochaine étape, avant tout déploiement. Le parcours complet est dans la liste de contrôle, section 4. Prérequis à poser avant de commencer : installer Stripe CLI (absent du poste, nécessaire pour relayer les webhooks avec `stripe listen --forward-to localhost:3000/api/webhooks/stripe`) ; lancer le serveur Inngest local avec `npx inngest-cli@latest dev` ; savoir que les e-mails ne partiront pas tant que le domaine Resend n'est pas vérifié (DNS OVH, voir T068). Une fois le test local réussi : poser l'étiquette Git `v0.1-mvp` sur `main`.
- **Décision du fondateur (28/09) : on n'attend plus le SIREN pour lancer.** On garde Stripe (au lieu d'un MoR) pour conserver l'avantage de la franchise en base de TVA. Les factures porteront la mention "SIREN en cours d'attribution". Stripe bloquera les virements temporairement, mais on peut encaisser.
- Le déploiement complet via Render a été lancé (migrations Prisma baselines appliquées le 28/09).
- Fusionner #159 et #101 (droits « workflow » que l'agent n'a pas), et décider du sort de `claude/upbeat-franklin-3lkvc0`.

## 4. Façon de travailler

- L'Ingénierie est une session locale, dans le dossier `business/saas/decelio`, qui délègue à des sous-agents Sonnet. Le worktree `decelio-ing` a été supprimé le 28/09.
- Crédits limités : peu d'agents en parallèle, sur un modèle économique.
- Les fusions sont faites par le fondateur, ou par l'agent quand tout est vert et que le fondateur a donné son accord.
- La session cloud ne peut pas supprimer de branche distante : le fondateur le fait depuis son clone.
- Le détail de la façon de travailler avec Git (branches, commits, PR, CI) est dans `docs/git-et-branches.md`.

## 5. Pièges connus

- Dans une session cloud, Node ignore le proxy sortant tant que `NODE_USE_ENV_PROXY=1` n'est pas défini.
- Une IA qui travaille dans un worktree doit y lancer `npm ci`. Un lien symbolique vers `node_modules` casse le build Turbopack.
- Ne jamais réécrire l'historique d'une branche poussée : `git merge origin/main`, pas de rebase.
- La mesure des citations (`lib/engines`, `llm-judge`, `query-generator`, `visibility`, `posthog-ai`) est en test local. Ne pas la supprimer, ne pas la brancher sans le fondateur.
- Un test instable a été signalé par le Design le 27/09 : non reproduit après six passages complets, aucun échec dans l'historique CI du jour hors Dependabot. À surveiller, pas encore un défaut confirmé.
- Le logo des e-mails pointe vers `https://decelio.fr` et restera cassé tant que le site n'est pas déployé — c'est normal.
- Dans un gabarit d'e-mail, ne jamais mettre de guillemets doubles dans une valeur de style (ex. police `"Segoe UI"`) : ils coupent l'attribut `style="…"` en plein milieu (corrigé dans #167).
