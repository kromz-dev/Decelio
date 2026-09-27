# Reprise du travail Design (27 septembre 2026)

État du périmètre Design (interface, pages publiques, design system) à la fin de la session du 27/09, et marche à suivre pour reprendre. Le reste du projet est dans `docs/REPRISE.md`.

## 1. Ce qui est sur `main`

| PR | Contenu |
|---|---|
| #97 | Refonte de la page d'accueil autour de « l'onde » du logo : titres en Bricolage Grotesque, anneaux qui se tracent, mots en cascade, onde de radar, cascade au défilement, en-tête collant, sections « Pour qui » et fondateur (avatar et GitHub kromz-dev), FAQ, appel final |
| #105 | Causes de blocage nommées : Cloudflare (Bot Fight Mode), Wordfence (limitation de débit), pare-feu de l'hébergeur, au conditionnel |
| #106 | Section « Refuser l'entraînement, rester lisible pour la recherche » (GPTBot / OAI-SearchBot, ClaudeBot / Claude-SearchBot) |
| #108 | Comparatif « Un complément, pas un remplaçant » : outils de maintenance WordPress et outils de visibilité IA, prix relevés le 27/09/2026 |
| #109 | Le rapport mensuel comme argument de marge, calcul présenté comme un exemple |
| #112, #117 | Résultat de scan : cause « à vérifier » visible, plateforme détectée avec « d'après les indices de la page » (`components/scan/PlatformLine.tsx`) |
| #113 | Logo officiel Stripe (`components/ui/stripe-logo.tsx`) |
| #119 | Harmonisation 1/3 : `SiteChrome` (`SiteHeader`, `SiteFooter`, `Wordmark`), `PublicPage`, `MarketingBits` ; `/pricing` et `/analyse` au style de l'accueil ; logo en « D » ; défaut d'accessibilité corrigé ; retard de l'onde corrigé |
| #122 | Nettoyage : `CoverageGrid`, `AuditForm`, `MarketingHeader`, `pricing.module.css`, 75 classes CSS mortes |
| #123 | « TVA non applicable (art. 293 B du CGI) » au lieu de « HT » |
| #124 | Harmonisation 2/3 : `/login`, `/register`, `/forgot-password`, `/reset-password` (`components/home/AuthShell.tsx`) |

## 2. En cours, non fusionné

| Branche | PR | État | Pour reprendre |
|---|---|---|---|
| `design/pages-legales` | #126 | Ouverte. `/mentions-legales`, `/cgv`, `/confidentialite`, liens dans le pied de page. Contrôles verts en local d'après l'agent. **Pas encore relue.** | Relire la PR (liste des `[À REMPLIR]` dans sa description), vérifier la CI, fusionner. Puis remplir les `[À REMPLIR]` avec le fondateur. |
| `design/harmonisation-app` | aucune | 4 commits poussés : coque de l'application harmonisée, vitrine `/design-system` à jour, `PlatformLine` réel. Agent arrêté avant l'ouverture de la PR. **Contrôles non confirmés.** | `git fetch && git switch design/harmonisation-app && git merge origin/main`, lancer les 4 contrôles, prendre des captures, ouvrir la PR. |

La branche `design/harmonisation` est fusionnée : elle peut être supprimée.

## 3. À faire, dans l'ordre

1. Fusionner #126 (pages légales) puis finir `design/harmonisation-app` (harmonisation 3/3).
2. **Après la fusion de `feat/essai-gratuit-14-jours` (Ingénierie)** : mettre à jour `/pricing` et l'accueil (« Pas de période d'essai » devient faux), la clause d'essai des CGV, et créer le bandeau « Essai : X jours restants » dans l'application (prop `trialEndsAt`, à confirmer avec l'Ingénierie). **Jamais avant.**
3. **Après la fusion de `fix/posthog-proxy-domaine`** : retirer le `[À REMPLIR]` de la mesure d'audience dans `/confidentialite`, avec la formulation confirmée par l'Ingénierie.
4. Brancher `PlatformLine` sur la fiche site quand l'Ingénierie aura passé la prop depuis `sites/[siteId]/page.tsx`.
5. Ne rien créer pour les alertes Slack / Teams tant que l'Ingénierie ne les a pas construites.

## 4. Décisions attendues du fondateur

- Un site public connu à scanner pour une preuve réelle et datée sur l'accueil.
- La promesse « résultat en 15 secondes » : à confirmer ou à retirer (elle apparaît plusieurs fois).
- Exemple de rapport sur l'accueil : il montre le logo Decelio, alors que `/pricing` dit que le rapport porte le logo de l'agence.
- Les `[À REMPLIR]` des pages légales : identité et SIREN, adresse, directeur de la publication, pays des sous-traitants, plafond de responsabilité, tribunal, remboursement, dates. Ces textes sont un modèle à faire relire par un professionnel du droit.

## 5. Signalé à l'Ingénierie, non corrigé côté Design

- `sites/[siteId]/page.tsx` : « Coquille vide » s'affiche « Inconnu » ; utiliser `verdictForSiteStatus` et le détail « à vérifier ».
- `lib/scanner/verdicts.ts` : « robots.txt autorise … à **citer** ce site » ; `accessSummary` affiche « Refusé » pour un blocage général.
- `app/(app)/reports/page.tsx` : meta description « visibilité IA ».
- `LoginForm.tsx` : `console.log` de débogage et `router` inutilisé.
- Inscription : « Étape 1 sur 3 » alors que tout tient sur un écran.
- PostHog charge des scripts depuis `eu-assets.i.posthog.com` sur les pages publiques (correction en cours, `fix/posthog-proxy-domaine`).
- Case « J'accepte les CGV » à l'inscription (colonne en base et action serveur).
- Un test instable : échoue parfois, réussit au lancement suivant.

## 6. Règles de travail retenues

- Une tâche, une branche `design/*` depuis `main` à jour, une PR ; fusion quand la CI est verte (le fondateur a autorisé l'agent Design à fusionner lui-même ses PR vertes).
- Filtre anti-slop en mode « pendant » (skill `antislop`) : pas de tiret cadratin, pas de chiffre sans source, pas de promesse de citation, rapport PASS/FAIL dans chaque PR.
- Mots proscrits : « garantit », « visibilité IA » comme promesse, « être cité », « score GEO », statistiques non sourcées. La mesure des citations est « en préparation ».
- Captures bureau (1440 px) et mobile (375 px) pour chaque PR, sans débordement horizontal. Tout doit rester visible avec `prefers-reduced-motion`.
- Aucun appel à un CDN tiers depuis une page publique : polices, icônes, logos et avatar sont servis depuis `public/` ou en SVG inline.
- Un seul sous-agent à la fois (demande du fondateur, économie).
