# Reprise du projet — état au 28/09/2026

À lire par toute personne ou IA qui reprend le développement, **après** `CLAUDE.md`. Ce fichier décrit ce qui est sur GitHub, ce qui est en cours et ce qui reste à faire. La liste détaillée de la configuration est dans `docs/runbooks/checklist-mise-en-production.md`.

Règle d'or : on ne coche une tâche, dans `tasks/mvp-tasks.md`, que si `main` le prouve.

## 0. Session du 28/09 (matin) — à lire en premier

**Le parcours de bout en bout local est terminé, sauf la purge.** Mené par sous-agents, sur Neon `local-dev` et Stripe en mode test, jamais sur la production.

| Tâche | Verdict | Preuve |
|---|---|---|
| T081 inscription/connexion | réussi | `POST /api/auth/register` → 201, console propre |
| T084 abonnement | réussi | Checkout carte de test, 11 webhooks tous en 200 |
| **T082 scan réel** | **réussi, rejoué** | Run Inngest `Completed`, **2,598 s dans l'étape réseau** — durée d'un vrai aller-retour. Verdict « Vide », plateforme « application JavaScript (React ou Vue), derrière Cloudflare ». La panne `undici` est bien morte. |
| T085 rapport PDF | réussi | `MonthlyReport` de **8235 octets**, `content-type: application/pdf`. Exige un `Client` rattaché au site, sinon la fonction ne produit rien. |
| **T083 alerte** | **réussi** | Voir ci-dessous. |
| T086 purge RGPD | **partiel** | Voir ci-dessous. |
| T087 console/CSP | réussi | 9 écrans, zéro erreur, zéro violation, aucune requête vers `*.posthog.com` |

**T083, prouvée de bout en bout.** La régression a été fabriquée en forçant le statut mémorisé du site à `OK` dans `local-dev`, le vrai verdict étant `COQUILLE VIDE`. Run `01M3KAQGZETWNTV87GCYDT5EA3` : scan initial 2,8 s, puis l'étape `wait-regression-confirmation` a duré **10 m 0 s exactement** — preuve directe que le délai de confirmation est réellement observé, sans raccourci —, puis rescan de confirmation, `INSERT INTO "AlertEvent"`, et **e-mail reçu à 08:30 sur `krom.pro@outlook.com`**. La ligne `AlertEvent` n'est écrite que si l'envoi réussit : elle vaut preuve.

**T086, partiel.** Le portail Stripe programme l'arrêt en fin de période et n'émet pas `customer.subscription.deleted` : `cancelledAt` restait donc `null`. En résiliant **immédiatement** l'abonnement du compte de test par l'API Stripe, le vrai webhook est parti et l'application a réagi correctement — `cancelledAt` posé, plan revenu à `FREE`, `purgeAt` calculé à **+60 jours** (27/11/2026). La purge elle-même reste non exercée : il faut avancer `purgeAt` dans le passé, donc écrire en base, puis déclencher `purge-cancelled-accounts` et vérifier que le client Stripe est bien supprimé.

**Quatre défauts trouvés, corrigés dans #186** (ouverte, non fusionnée) :
1. **Bloquant** — un site fraîchement ajouté affichait « Lu » en vert avant tout scan, parce qu'il était créé avec `status: "ACTIVE"`. Il porte désormais `"À VÉRIFIER"`, que les deux fonctions de correspondance traduisent déjà en « Inconnu — pas encore vérifié ». Aucun changement d'affichage nécessaire.
2. **Découvert en corrigeant le premier** — un site **sans aucun historique de scan** pouvait déclencher une alerte de régression dès son premier scan : on alertait sur la dégradation d'un état jamais mesuré. Ce chemin ne déclenche plus jamais d'alerte ; la régression réelle, avec son délai de dix minutes, est inchangée.
3. `app/(app)/settings/page.tsx` était la seule page de l'espace connecté sans `metadata`.
4. Une résiliation programmée depuis le portail Stripe restait invisible dans l'application. Lue en direct chez Stripe à l'affichage, sans migration.

**Un cinquième défaut, corrigé dans #187** (ouverte) : un e-mail d'alerte réellement reçu dans Outlook affichait « **ecelio** ». Le nom de la marque était coupé en deux, le « D » étant une image. Les clients de messagerie bloquent les images par défaut. Le mot est désormais écrit en entier en texte, le logo devient décoratif.

**Pièges rencontrés, à connaître.**
- Le classifieur de permissions du mode auto **refuse les écritures en base**, même sur `local-dev`. Il refuse aussi qu'un agent s'écrive une règle de permission puis s'en serve. Les écritures de test passent donc par la console Neon, à la main.
- **La console Neon s'ouvre sur la branche `main`, la production.** Une première tentative d'écriture y a été lancée par erreur ; elle n'a touché aucune ligne, la production ne contenant aucun site. Vérifier la branche avant chaque instruction, et préférer un `RETURNING` pour voir ce qui a réellement changé.
- Un **abonnement Stripe orphelin** existe en mode test (`sub_1UKTDK…`, `cus_VL9W8dInYAxYFi`), qu'aucun compte en base ne référence. Sans conséquence en test ; à ne pas reproduire en réel.

**État de `main`** : inchangé depuis la veille, #185 en tête. **Trois demandes ouvertes** : #186, #187, et #180 (plan marketing).

## 0 bis. Session du 28/09 (soir de la veille)

**Quatre demandes fusionnées ce soir.** T089 à T092 sont réglées :
- **#181** (T089, T090) : le bouton « Relancer un scan » émettait un événement (`campaign.run`) qu'aucune fonction n'écoutait. Il émet maintenant `app/scan.site`, sur un `MonitoredSite` réel de l'utilisateur. Le faux message « Scan terminé » en cas d'échec est supprimé : un échec affiche la cause en rouge, un succès dit « Scan lancé » (le scan est asynchrone, il n'est pas déjà « terminé »).
- **#182** (T091, T092) : ajouter un site depuis le tableau de bord déclenche désormais son premier scan (identifiant déterministe, jamais de doublon avec l'onboarding). L'expéditeur des e-mails d'alerte a un repli configurable (`lib/email/from.ts`, variable `ALERT_FROM_EMAIL`), à laisser vide en production.
- **#183 — panne majeure trouvée et corrigée** : depuis la montée de dépendance `undici` 7 → 8 (Dependabot #174), **le scanner ne faisait plus aucune requête réseau**. `lib/scanner/crawler.ts` passe un dispatcher `undici` au `fetch` global de Node pour se protéger du rebinding DNS ; le `fetch` de Node embarque sa propre copie d'`undici` en version 7 et refuse un dispatcher d'une version majeure différente (`UND_ERR_INVALID_ARG`). Tous les scans réels échouaient (`httpStatus: 0`, `error: "fetch failed"`), **sans qu'aucun des 749 tests ne le voie** : ils simulent tous `fetch`, aucun ne parle à un vrai serveur. Corrigé en revenant à `undici: ^7.30.0`, avec un nouveau test qui parle à un vrai serveur local (`lib/scanner/crawler.dispatcher.test.ts`) et qui aurait attrapé la panne. `undici` est ajouté aux montées majeures ignorées de Dependabot, avec la raison écrite dans `.github/dependabot.yml`.
- **#184** : `AUTH_TRUST_HOST` manquait dans `render.yaml` bien que `.env.example` la documente. Sans elle, Auth.js v5 refuse toute connexion derrière le proxy inverse de Render (`MissingAuthTrustHost`) — la connexion aurait été cassée en production après un déploiement pourtant réussi. Ajoutée, avec `TRUSTED_PROXY_HOPS=1` (déjà la valeur par défaut du code, écrite pour être vérifiable).

**Leçon à retenir** : les 749 tests simulent le réseau, Stripe et l'envoi d'e-mails. Ils ne peuvent pas attraper une panne comme celle d'`undici`, qui casse uniquement le vrai réseau. C'est une dette connue, section 5 (« tests de réalité »).

**État de `main` après ces fusions** : `tsc`, `eslint`, `build` verts ; **749 tests sur 92 fichiers** (`npx vitest run`, revérifié ce soir).

**Neon `main` (production)** : le baseline est fait. Les 5 migrations (`20260925000000_init`, `20260926230000_add_updated_at_and_site_unique`, `20260927000000_audit_lead_brand_name_optional`, `20260927120000_add_user_trial_fields`, `20260927180000_add_user_terms_acceptance`) y sont enregistrées. T073 est cochée.

**Render : jamais déployé, contrairement à ce qu'une version antérieure de ce document laissait entendre.** Service `srv-darer6btqb8s73f7d670`, URL actuelle `https://cited-6ihy.onrender.com`. Quatre déploiements, **tous en `build_failed`**, aucun n'a jamais abouti. Le dernier, le 27/09 à 23h55, a échoué sur `Error code: P1012 — Environment variable not found: DIRECT_URL`. `autoDeploy` reste sur `no`. Variables encore à saisir par le fondateur, dans le tableau de bord Render, jamais dans une conversation : `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_SCALE`, `RESEND_API_KEY`, `ENGINE_CACHE_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY` ; puis, après le premier déploiement, `NEXT_PUBLIC_APP_URL` et `STRIPE_WEBHOOK_SECRET`.

**T083 débloqué.** `.env.local` du poste porte désormais `ALERT_FROM_EMAIL="Decelio <onboarding@resend.dev>"` (grâce à #182) : l'alerte peut partir en local, vers `krom.pro@outlook.com`, seule adresse autorisée sans domaine Resend vérifié.

**T082 décoché, à rejouer.** Il avait été validé le 28/09 avant la découverte de la panne `undici` : le scan réel qui a servi de preuve tournait sur un code qui, ensuite, ne fonctionnait plus. À revérifier avec le code corrigé (#183) avant de le recocher.

**Ordre de reprise conseillé** : rejouer T082 (scan réel, code corrigé) ; puis T085, T086, T087, T088 pour finir le parcours local ; puis le déploiement Render, en commençant par saisir les variables manquantes listées ci-dessus et en relançant un déploiement manuel.

**Piège à ne plus refaire** : après une fusion qui touche les dépendances (comme #183), relancer `npm ci` avant tout test local — sinon on teste un `node_modules` périmé, pas le vrai code. C'est ce qui s'est produit ce soir : le dossier local avait encore `undici` 7.29.1 alors que le verrou demandait 8.11.2.

**Tranché, à ne plus rechercher** : Gemini et Groq ne servent pas au scan. Le renommage Neon `cited` → `decelio` a été refusé par le classifieur de permissions de la session ; à faire depuis la console Neon, en dernier, en sachant que les quatre chaînes de connexion seront à recopier ensuite. La demande #180 (plan marketing) reste ouverte, non fusionnée.

## 1. Ce qui est sur `main`

- Code vérifié en fin de soirée du 28/09 : `tsc`, `eslint`, `vitest` (**749 tests sur 92 fichiers**) et `build` au vert. CI verte sur les derniers commits.
- Fusionné le 28/09 (soir) : #181 (T089, T090 — bouton « Relancer un scan »), #182 (T091, T092 — scan à l'ajout, expéditeur de repli), #183 (panne du scanner par montée d'`undici`, corrigée), #184 (`AUTH_TRUST_HOST` dans `render.yaml`). Détail en section 0.
- Fusionné depuis le 27/09 (soir) :
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
- **#159 (hygiène des secrets)** et **#101 (CodeQL v4)** : fusionnées le 28/09 (soir).
- **`claude/upbeat-franklin-3lkvc0`** : branche de compétences d'agent ajoutées le 27/09, toujours non fusionnée, à décider par le fondateur.
- **Dependabot** : #173 (lucide-react, resend, three) fusionnée. #174 (undici 8) a été fusionnée puis a **cassé silencieusement tout le scanner** (voir section 0, #183) : `undici` est revenu en version 7 et est désormais dans les montées majeures ignorées de `.github/dependabot.yml`. #172 (PostgreSQL 18 pour la base locale) fermée — on garde PostgreSQL 17, comme Neon en production. #171 a corrigé l'écosystème docker → docker-compose.
- **#180 (plan marketing)** : toujours ouverte, non fusionnée.
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
| Render | Jamais déployé avec succès : **quatre déploiements, tous en `build_failed`**. Le dernier (27/09, 23h55) a échoué sur `DIRECT_URL` absente (P1012). `DATABASE_URL` et `DIRECT_URL` collées par le fondateur le 28/09. `AUTH_TRUST_HOST` et `TRUSTED_PROXY_HOPS=1` désormais dans `render.yaml` (#184, 28/09 soir). | Saisir les variables encore manquantes (voir section 0), relancer un déploiement manuel et vérifier `/api/health`. Domaine `decelio.fr`. Décider si `autoDeploy` repasse à `yes`. Secrets collés par le fondateur dans le tableau de bord, jamais dans une conversation. | Fondateur |
| Inngest | — | Déclarer l'application avec l'URL de production, puis ajouter les clés | Déploiement |
| Google OAuth | Pas de bouton « Continuer avec Google » à l'écran actuellement. | Ajouter l'URL de retour de production ; poser la mention CGV Google avec le bouton, quand il existera. | Déploiement |
| PostHog | Vérification locale faite par le Design dans un navigateur : aucune requête hors `localhost`, événements bien sur `/ingest`. | Refaire la vérification une fois l'application déployée (T072 reste non cochée). | Déploiement |

### Fondateur

- **Décision du fondateur : on ne déploie pas tant que le MVP n'est pas entièrement testé en local** (Neon `local-dev`, Stripe en mode test). C'est la prochaine étape, avant tout déploiement. Le parcours complet est dans la liste de contrôle, section 4. Prérequis à poser avant de commencer : installer Stripe CLI (absent du poste, nécessaire pour relayer les webhooks avec `stripe listen --forward-to localhost:3000/api/webhooks/stripe`) ; lancer le serveur Inngest local avec `npx inngest-cli@latest dev` ; savoir que les e-mails ne partiront pas tant que le domaine Resend n'est pas vérifié (DNS OVH, voir T068). Une fois le test local réussi : poser l'étiquette Git `v0.1-mvp` sur `main`.
- **Décision du fondateur (28/09) : on n'attend plus le SIREN pour lancer.** On garde Stripe (au lieu d'un MoR) pour conserver l'avantage de la franchise en base de TVA. Les factures porteront la mention "SIREN en cours d'attribution". Stripe bloquera les virements temporairement, mais on peut encaisser.
- Le baseline des migrations Prisma sur Neon `main` est fait (28/09). **Render n'a en revanche jamais été déployé avec succès** — voir section 0 et le tableau de configuration ci-dessous.
- #159 et #101 (droits « workflow ») sont fusionnés. `claude/upbeat-franklin-3lkvc0` existe toujours comme branche distante non fusionnée, à décider par le fondateur.

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
- **Après une fusion qui touche les dépendances, relancer `npm ci` avant tout test local.** Sinon on teste un `node_modules` périmé, pas le vrai code (piège rencontré le 28/09 soir avec `undici`).
- **Piège undici/fetch** : ne jamais construire un dispatcher `undici` (protection SSRF, rebinding DNS) avec une version majeure d'`undici` différente de celle embarquée dans le `fetch` global de Node — Node la refuse silencieusement côté réseau réel (`UND_ERR_INVALID_ARG`), et **aucun test qui simule `fetch` ne peut le voir**. `undici` est verrouillé en version 7 et ignoré par Dependabot pour cette raison (#183).
