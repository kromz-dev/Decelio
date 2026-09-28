# Demandes aux agents Ingénierie et Design — issues du plan marketing

**Date :** 28/09/2026
**Origine :** session « lancement, business, marketing », plan dans `docs/marketing/plan-marketing-v1.md`.
**Validation :** chaque demande ci-dessous a été validée par le fondateur. Chaque agent examine celles de son périmètre (`docs/12-partage-du-travail.md`), propose une branche et une PR par demande, et signale au fondateur toute raison sérieuse de ne pas la faire.

**Priorité générale :** le déploiement et le test complet en local passent **avant** toutes ces demandes. Aucune ne doit retarder la mise en ligne, sauf mention contraire du fondateur.

Rappels valables pour toutes les demandes : quatre portes au vert (`tsc`, `lint`, `test`, `build`) ; pas d'écriture dans `PROGRESS.md`, `tasks/mvp-tasks.md` ni `docs/08-constitution.md` (mettre la proposition d'entrée dans la description de la PR) ; budget 0 € ; aucune promesse d'une fonction non construite.

| ID | Agent | Demande | Priorité | Dépend de |
|---|---|---|---|---|
| D-01 | Ingénierie | Diagnostic de portefeuille gratuit (1 à 5 sites, sans compte), côté API | Haute, après le déploiement | — |
| D-02 | Ingénierie | E-mails d'essai (bienvenue, relance carte, premier scan, premier rapport) | Haute | Textes à venir (`docs/marketing/emails-essai.md`), domaine Resend vérifié |
| D-03 | Ingénierie | Événement PostHog quand un rapport est généré ou téléchargé | Moyenne | — |
| D-04 | Ingénierie | Confirmer que le rappel de fin d'essai (J-3) part vraiment | Haute, avant la mise en ligne | Webhook Stripe (T074) |
| D-05 | Ingénierie | Rapport mensuel aussi pour les sites rattachés à aucun client | Haute | Décision du fondateur sur l'option |
| D-06 | Ingénierie | Les réponses aux alertes arrivent sur `contact@decelio.fr` | Moyenne | Boîte mail créée |
| D-07 | Ingénierie | Comportement en cas d'impayé : délai de grâce et bandeau | Haute, avant Stripe réel | — |
| D-08 | Ingénierie | E-mail avant la purge RGPD d'un compte résilié | Moyenne | Textes à venir |
| D-09 | Déploiement | Réglages Stripe de rétention au passage en mode réel | Haute, avec T075 | T075 |
| D-18 | Ingénierie | Ligne « Diagnostic réalisé avec Decelio » dans le PDF gratuit et le rapport Freelance | Basse | — |
| D-10 | Design | Phrases rassurantes au moment du paiement | Haute | D-04 pour la 2e phrase |
| D-11 | Design | Rapport d'exemple visible par tous les comptes | Moyenne | — |
| D-12 | Design | Vérifier que le site ne se limite pas aux agences WordPress | Haute | — |
| D-13 | Design | Relire la page « Qui est derrière Decelio » | Haute | Décision du fondateur |
| D-14 | Design | Pages de destination (par cible, comparaisons, baromètre) | Moyenne | Textes à venir |
| D-15 | Design | Section blog | Moyenne | Textes à venir |
| D-16 | Design | Formulaire du diagnostic de portefeuille | Après D-01 | D-01 fusionnée |
| D-17 | Design | Étape « Regroupez vos sites par client » et rappel dans le tableau de bord | Haute | Coordination avec D-05 |
| D-19 | Design | Page de prix : ne plus renvoyer vers un « e-mail de bienvenue » qui n'existe pas | **Haute, avant la mise en ligne** | — |

---

## Agent Ingénierie

### D-01. Diagnostic de portefeuille gratuit, côté API

**Pourquoi.** Aujourd'hui, une agence ne voit Decelio que sur un seul site (diagnostic public) avant qu'on lui demande sa carte bancaire (ADR-002 : essai de 14 jours avec carte, plan gratuit = 0 site). On veut qu'elle voie son vrai problème sur plusieurs de ses sites avant la carte, sans renoncer à l'ADR-002. Indicateur visé : part des diagnostics suivis d'une inscription (objectif du PRD : au moins 10 %).

**À lire avant :** `CLAUDE.md`, `decelio/AGENTS.md`, `docs/08-constitution.md` (principes I et III), `decelio/app/api/scan/route.ts` et son test, `decelio/lib/rate-limit`, `decelio/lib/scanner/core.ts`.

**Attendu (API uniquement) :**
- Un point d'entrée public (nouvelle route ou extension de `/api/scan` : à choisir et justifier) qui accepte 1 à 5 URL.
- Refus propre au-delà de 5 ; dédoublonnage (`www` et sans `www` comptent une fois) ; une URL invalide est refusée seule, sans faire échouer le lot.
- Réutiliser `runCoreScan(url, DEFAULT_PROBE_BOTS)` sans modifier `lib/scanner/crawler.ts`, `robots.ts`, `analyzer.ts` ni `agents.ts`.
- **Sécurité (constitution III) :** garde SSRF sur chaque URL et chaque redirection (à vérifier, pas à supposer) ; limitation de débit en base, jamais en mémoire. Un lot de 5 compte pour 5 scans, ou une limite dédiée plus stricte, par IP, par minute et par jour : proposer des valeurs et les justifier. Le point d'entrée ne doit pas pouvoir servir à faire frapper des sites tiers en masse par Decelio.
- **Politesse et budget :** 20 s maximum par URL (ENF-004, même `Promise.race` que `/api/scan`). Choisir la concurrence (séquentiel ou 2 en parallèle) en tenant compte du plan gratuit Render, et documenter le temps total attendu.
- **Réponse :** un résultat par site, dans la même forme que le diagnostic actuel, plus un récapitulatif en **comptes** par statut (OK, À VÉRIFIER, BLOQUÉ, COQUILLE VIDE, ERREUR). Jamais de score agrégé unique. « À vérifier » reste une catégorie à part, jamais comptée comme bloquée (constitution I).
- **Suivi PostHog côté serveur :** événement `portfolio_scan_completed` avec le nombre de sites et les comptes par statut. Aucune URL, aucune donnée personnelle.
- Aucun nouveau service payant.

**Tests minimum :** cas nominal à 3 sites ; 6 URL refusées ; doublons fusionnés ; une URL résolvant vers une IP privée refusée sans bloquer les autres ; dépassement de la limite de débit ; délai dépassé sur un site sans faire échouer le lot.

**Livraison :** branche `feat/diagnostic-portefeuille`. Dans la description de la PR : le contrat de l'API (entrée, sortie, codes d'erreur, limites) pour l'agent Design (D-16), et une proposition d'entrée de tâche. Ne pas toucher `components/` ni `app/(marketing)/`.

### D-02. E-mails d'essai

**Pourquoi.** Entre l'inscription et le questionnaire J+3, rien ne part. Une agence qui abandonne à l'étape de la carte ne reçoit rien.

**Attendu :** le mécanisme d'envoi (Inngest + Resend, gabarit commun `lib/email/layout.ts`) de quatre e-mails :

| Moment | E-mail | Condition |
|---|---|---|
| Juste après l'inscription | Bienvenue : 3 étapes pour tirer parti de l'essai | Toujours |
| 1 h après l'inscription | « Il reste une étape » : lien vers le choix de formule | Seulement si aucun essai n'a démarré |
| Après le premier scan du portefeuille | Résultat en une phrase et un lien | Seulement si des sites ont été ajoutés |
| J+7 de l'essai | « Votre premier rapport client » | Seulement si aucun rapport n'a été généré |

- Les **textes** seront fournis dans `docs/marketing/emails-essai.md` (à venir). Ne pas les rédiger à la place de la session marketing.
- Signature « L'équipe Decelio ». Désinscription possible pour tout e-mail qui n'est pas strictement lié au service.
- Tests : chaque condition d'envoi et de non-envoi.

### D-03. Événement PostHog « rapport généré »

**Pourquoi.** Le moment utile a deux moitiés : voir un blocage sur ses sites, et obtenir un rapport à envoyer au client. La seconde n'est pas mesurée aujourd'hui.

**Attendu :** événement serveur `report_generated` (et `report_downloaded` si c'est simple), avec le plan et le nombre de sites couverts. Aucune donnée personnelle, aucun nom de client ni URL.

### D-04. Rappel de fin d'essai

**Pourquoi.** L'ADR-002 prévoit un e-mail 3 jours avant la fin de l'essai, mais il dépend de `customer.subscription.trial_will_end`, qui n'atteint pas l'application tant que le webhook Stripe n'est pas enregistré (T074). Prélever sans prévenir serait une perte de confiance et un risque de litige.

**Attendu :** au moment du déploiement, confirmer par un test réel (Stripe CLI ou mode test) que cet e-mail part. Dire au fondateur et à l'agent Design si c'est le cas : la phrase « Nous vous prévenons par e-mail 3 jours avant » (D-10) n'est affichée qu'à cette condition.

### D-05. Rapport mensuel pour les sites sans client

**Pourquoi.** Le répartiteur `monthlyReportDispatcher` (`inngest/functions/monthly-report.ts`) ne génère un rapport que pour les `Client` ayant au moins un site. L'import en masse de l'onboarding crée des sites **sans** client. Une agence qui ne range pas ses sites ne reçoit donc jamais son rapport mensuel, la fonction anti-résiliation n°1 du produit (plan §6).

**Attendu :** proposer au fondateur l'une de ces options, avec ses conséquences, avant de coder :
- un rapport « portefeuille » regroupant tous les sites sans client ;
- ou un client par défaut créé et rattaché automatiquement.

Contraintes : ne pas casser la clé unique `(clientId, period)` de `MonthlyReport` ; ne générer aucun rapport vide ; respecter la marque blanche selon le plan. Tests sur le cas « aucun client » et le cas mixte.

### D-06. Réponses aux alertes vers `contact@decelio.fr`

**Pourquoi.** Chaque alerte se terminera par « Cette alerte vous semble fausse ? Répondez simplement à cet e-mail, nous vérifions à la main » (plan §6, R3). Il faut que la réponse arrive dans une boîte lue.

**Attendu :** en-tête `Reply-To: contact@decelio.fr` sur les alertes (et sur les autres e-mails transactionnels, si c'est cohérent), et ajout de cette phrase au gabarit d'alerte. À activer seulement quand la boîte existe.

### D-07. Comportement en cas d'impayé

**Pourquoi.** Le webhook Stripe ne traite pas `invoice.payment_failed`, et le comportement de l'application quand un abonnement passe en `past_due` n'est pas documenté. Couper la surveillance au premier échec de carte serait la pire réponse pour un produit « assurance » (plan §6, R4).

**Attendu :**
- Documenter ce qui se passe aujourd'hui (accès, scans quotidiens, quota) quand l'abonnement est `past_due`.
- Proposer puis coder : scans maintenus pendant une période de grâce (durée alignée sur les relances Stripe), et bandeau clair dans l'application avec un lien vers le portail client pour mettre la carte à jour.
- Tests sur les transitions `active → past_due → active` et `past_due → canceled`.

### D-08. E-mail avant la purge RGPD

**Pourquoi.** Les comptes résiliés sont purgés automatiquement (`purge-cancelled-accounts`). Un dernier e-mail avant la purge est à la fois une obligation de transparence et la seule relance de reconquête utile (plan §6, R6).

**Attendu :** un e-mail quelques jours avant la purge : date de suppression, lien d'export des données, lien de réactivation. Textes fournis dans `docs/marketing/` (à venir). Tests : envoyé une seule fois, jamais après la purge, jamais à un compte réactivé.

### D-18. Ligne de signature dans les PDF non marqués

**Pourquoi.** Le PDF du diagnostic gratuit porte déjà le logo Decelio et il est fait pour être transmis au client de l'agence. C'est la meilleure exposition naturelle de Decelio (plan §7, P1).

**Attendu :** une seule ligne sobre en pied de page du PDF du diagnostic gratuit et du rapport mensuel **du plan Freelance uniquement** : « Diagnostic réalisé avec Decelio — la vérification quotidienne de la lisibilité IA de vos sites. decelio.fr ». **Jamais dans un rapport en marque blanche** (plans Agence et Studio) : ce serait contraire à la promesse faite au client. Test : la ligne est absente de tout rapport en marque blanche.

---

## Déploiement (agent qui passe Stripe en mode réel)

### D-09. Réglages Stripe de rétention

À faire au moment de T075 (Stripe en mode réel), sans code, dans le tableau de bord Stripe :
- **Relances intelligentes** des paiements échoués (Smart Retries).
- **E-mails automatiques de Stripe** en cas d'échec de carte et de carte bientôt expirée, avec le lien vers le portail.
- **Portail client :** activer la question sur la raison de la résiliation (trop cher ; je ne l'utilise pas assez ; il manque une fonction ; je passe à un autre outil ; mon activité change ; autre) ; laisser ouvert le passage au plan inférieur ; résiliation en fin de période (déjà le cas en test).
- **À vérifier dans le portail**, et à signaler au fondateur sans l'activer : l'offre de réduction proposée au moment de résilier (si elle existe : 20 à 30 % pendant 2 mois au maximum), et la pause d'abonnement.
- Vérifier que ces réglages n'ajoutent **aucun coût** Stripe. Sinon, le signaler avant de les activer.

---

## Agent Design

### D-10. Phrases rassurantes au moment du paiement

**Pourquoi.** La carte est demandée avant que l'agence ait vu Decelio sur ses propres sites. On garde ce choix (ADR-002), mais on rassure, sans pression.

**Textes, à placer près du bouton de l'étape de choix de formule** (`OnboardingPlanStep`) :
- « Rien n'est prélevé avant le [date de fin d'essai]. »
- « Nous vous prévenons par e-mail 3 jours avant. » — **seulement quand D-04 est confirmé**, sinon cette phrase promet une chose qui n'arrive pas.
- « Résiliable en deux clics depuis votre espace. »

La date est calculée en heure de Paris, comme le bandeau d'essai.

### D-11. Rapport d'exemple visible par tous les comptes

**Pourquoi.** Au plan Freelance, l'agence ne voit jamais le rapport à sa marque, qui est la moitié du moment utile et le premier levier pour passer au plan Agence.

**Attendu :**
- Un lien vers un rapport d'exemple en PDF depuis le tableau de bord, pour tous les plans. Le rapport est **clairement marqué « Exemple — client fictif »** (constitution : aucune fausse donnée présentée comme réelle). Réutiliser le PDF d'exemple du kit de prospection s'il existe, sinon le générer avec le moteur existant et des données fictives signalées comme telles.
- Au plan Freelance, une mention sobre : « Le rapport à votre logo est inclus à partir du plan Agence. »

### D-12. Cible élargie : vérifier les textes du site

**Décision du fondateur (28/09/2026) :** la cible est **toute agence ou freelance qui maintient des sites clients ou fait leur SEO**, quel que soit l'outil (WordPress, Wix, Shopify, Webflow, PrestaShop, sur mesure). Voir `docs/05-analyse-strategique.md` §6 et `.claude/product-marketing.md` v2.

**Attendu :** relire la page d'accueil, `/pricing`, la FAQ et `decelio/app/llms.txt`, et corriger toute formulation qui réserverait Decelio aux seules agences WordPress ou exclurait les autres plateformes. Sans promettre plus que le scanner ne fait : il est indépendant de la plateforme, mais les correctifs pas à pas les plus détaillés concernent aujourd'hui WordPress et Cloudflare.

### D-13. Relire la page « Qui est derrière Decelio »

**Décision du fondateur (28/09/2026) :** la marque parle en son nom. Les comptes publics et les signatures sont au nom de Decelio (« L'équipe Decelio »). Le nom du fondateur n'apparaît que là où la loi l'impose : mentions légales, CGV, Stripe, registre du domaine.

**Attendu :** relire `app/(marketing)/a-propos/` (T067) et proposer au fondateur une version cohérente avec ce choix. **Ne rien retirer sans son accord :** c'est lui qui décide de ce qui reste sur cette page.

### D-14. Pages de destination

**Pourquoi.** Les annuaires et les réseaux envoient du trafic. Il faut des pages qui le convertissent **avant** de s'inscrire dans les annuaires.

**Pages prévues :**
- par cible : agences de maintenance WordPress ; agences SEO/GEO ; agences Wix, Shopify et Webflow ;
- comparaisons honnêtes : Decelio ou Cloudflare AI Crawl Control ; Decelio ou WP Umbrella / ManageWP ; Decelio et les outils de citation (Peec AI, Otterly, BabyLoveGrowth), présentés comme complémentaires ;
- `/barometre` : chiffres réels avec dénominateur et date, méthode et limites (`docs/13-barometre-ia.md` §4).

Les **textes** seront fournis dans `docs/marketing/` (à venir). En attendant, l'agent Design peut préparer la structure commune de ces pages (un seul `h1`, hiérarchie de titres, données structurées, FAQ).

### D-15. Section blog

**Pourquoi.** Cinq articles de départ sont prévus (plan §4, A5). Il n'existe pas de section blog aujourd'hui.

**Attendu :** une section blog dans `app/(marketing)/`, compatible avec le référencement et la lecture par les IA (rendu côté serveur, un `h1`, date, données structurées `Article`), sans dépendance à un service payant ni appel à un CDN tiers. Si une configuration relève de l'Ingénierie (`next.config.ts`), la demander.

### D-17. « Regroupez vos sites par client »

**Pourquoi.** Voir D-05 : sans client, pas de rapport mensuel.

**Attendu :**
- Une étape facultative dans l'onboarding, après l'ajout des sites : « Regroupez vos sites par client : chaque client recevra son propre rapport mensuel », avec un exemple et un bouton « Plus tard ».
- Dans le tableau de bord, tant que des sites ne sont rattachés à aucun client, un rappel sobre, par exemple : « 12 sites ne sont rattachés à aucun client : ils n'apparaîtront dans aucun rapport mensuel. » Ce texte est à adapter si D-05 change ce comportement.
- Se coordonner avec l'agent Ingénierie sur D-05, pour que le texte dise ce qui se passe vraiment.

### D-19. Page de prix : pas d'« e-mail de bienvenue » qui n'existe pas

**Pourquoi.** `app/(marketing)/pricing/page.tsx` dit, à deux endroits (encadré « au-delà de 100 sites » et FAQ), de « répondre à l'e-mail de bienvenue » pour activer les sites au-delà de 100. **Cet e-mail n'existe pas** (`docs/REPRISE.md` : « Pas d'e-mail de bienvenue, il n'existe pas »). C'est une promesse non tenue au sens de la constitution (principe II).

**Attendu :** remplacer par « écrivez-nous à contact@decelio.fr ». Quand l'e-mail de bienvenue existera (D-02), le texte pourra y revenir. **À faire avant la mise en ligne.**

### D-16. Formulaire du diagnostic de portefeuille

**Après la fusion de D-01.** Brancher un formulaire « jusqu'à 5 sites » sur le contrat d'API décrit dans la PR de D-01. Afficher un verdict par site et le récapitulatif en comptes par statut, jamais un score unique. Appel à l'action : essai gratuit de 14 jours.
