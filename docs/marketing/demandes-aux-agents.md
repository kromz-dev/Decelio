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
| D-10 | Design | Phrases rassurantes au moment du paiement | Haute | D-04 pour la 2e phrase |
| D-11 | Design | Rapport d'exemple visible par tous les comptes | Moyenne | — |
| D-12 | Design | Vérifier que le site ne se limite pas aux agences WordPress | Haute | — |
| D-13 | Design | Relire la page « Qui est derrière Decelio » | Haute | Décision du fondateur |
| D-14 | Design | Pages de destination (par cible, comparaisons, baromètre) | Moyenne | Textes à venir |
| D-15 | Design | Section blog | Moyenne | Textes à venir |
| D-16 | Design | Formulaire du diagnostic de portefeuille | Après D-01 | D-01 fusionnée |

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

### D-16. Formulaire du diagnostic de portefeuille

**Après la fusion de D-01.** Brancher un formulaire « jusqu'à 5 sites » sur le contrat d'API décrit dans la PR de D-01. Afficher un verdict par site et le récapitulatif en comptes par statut, jamais un score unique. Appel à l'action : essai gratuit de 14 jours.
