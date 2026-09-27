# Reprise du travail Design (27 septembre 2026)

État du périmètre Design (interface, pages publiques, design system) et marche à suivre pour reprendre. Le reste du projet est dans `docs/REPRISE.md`.

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
| #126 | Pages légales : `/mentions-legales`, `/cgv`, `/confidentialite`, liens dans le pied de page. Les `[À REMPLIR]` restants sont listés en §4 |
| #133 | Harmonisation 3/3 : coque de l'application, vitrine `/design-system` à jour, `PlatformLine` réel |
| #140 | Corrections de l'audit anti-slop 001 |
| #141 | Preuve réelle datée sur l'accueil, IP du visiteur non transmise à PostHog |
| #145 | Corrections signalées par l'Ingénierie : erreur console des réglages, « Étape 1 sur 3 », débogage de la connexion |
| #150 | Page « Qui est derrière Decelio » (T067) |
| #151 | Essai gratuit de 14 jours annoncé sur l'accueil, `/pricing` et les CGV ; bandeau « Essai : X jours restants » dans l'espace client (`components/TrialBanner.tsx`), calculé en heure de Paris |
| #155 | Case « J'accepte les conditions générales de vente » à l'inscription, qui envoie `acceptTerms: true`. Débloque #152 |
| #156 | CGV : la carte est demandée à la souscription et non à la création du compte. La formulation de #151 était inexacte |
| #157 | ADR-002 passé en « appliqué » : son statut demandait encore d'afficher « pas de période d'essai » |

## 2. En cours, non fusionné

**Rien côté Design.** Tout ce qui était en cours est fusionné.

À surveiller, hors périmètre Design :

| Branche | PR | État |
|---|---|---|
| `feat/acceptation-cgv` | #152 | Ouverte, Ingénierie. **Débloquée** : la case existe désormais dans l'interface depuis #155. Avant de fusionner, l'Ingénierie doit poser la bonne valeur de `TERMS_VERSION` : #151 et #156 ont tous deux changé le texte des CGV, une seule valeur postérieure à ces deux fusions les couvre. |

Un worktree `decelio-design-sombre` existe sur la branche `design/mode-sombre-app`. Elle n'a aucun commit au-dessus de `main` et n'est pas poussée : soit une session démarre dessus, soit c'est un worktree abandonné à retirer (`git worktree remove`).

## 3. À faire, dans l'ordre

1. **Après la fusion de #152** : afficher la version des CGV en tête de `/cgv`. L'Ingénierie expose `TERMS_UPDATED_LABEL` depuis `lib/legal/terms.ts`, à côté de `TERMS_VERSION`, pour que les deux ne puissent pas diverger. L'étiquette remplace le `<ToFill>date</ToFill>` de `app/(marketing)/cgv/page.tsx:43`. **Jamais avant** : le fichier n'existe pas encore sur `main`.
2. Brancher `PlatformLine` sur la fiche site quand l'Ingénierie aura passé la donnée. Vérifié le 27/09 : `app/(app)/sites/[siteId]/page.tsx` ne charge aucune détection de plateforme, ni depuis `monitoredSite.scanLogs` ni ailleurs. Il ne s'agit donc pas seulement d'ajouter le composant, il faut d'abord que la donnée existe dans la page. Le composant est prêt et sert déjà dans `ScanResultPanel` et `/design-system`.
3. Ne rien créer pour les alertes Slack / Teams tant que l'Ingénierie ne les a pas construites.

**Le bouton « Continuer avec Google » n'existe toujours pas dans l'interface**, ni sur `/login` ni sur `/register`, alors que le fournisseur est configuré côté serveur (`auth.config.ts`). Il n'est pas prévu pour l'instant : l'exposer demande de vérifier le flux OAuth de bout en bout, et le principe II interdit d'afficher un bouton dont on ne sait pas s'il fonctionne. Aucune faille n'en découle, `createUser` n'enregistrant l'acceptation que si quelqu'un se connecte par Google, ce que personne ne peut faire. Le jour où le bouton arrive, la mention « En continuant avec Google, vous acceptez les conditions générales de vente » doit arriver dans la même fusion : le code serveur enregistre l'acceptation sans rien afficher, donc sans la mention l'acceptation enregistrée ne vaut rien.

## 4. Décisions attendues du fondateur

- Les `[À REMPLIR]` des pages légales, treize au 27/09. Ces textes sont un modèle, à faire relire par un professionnel du droit.
  - `mentions-legales` : date, nom ou raison sociale, SIREN/SIRET, RCS ou RNE, adresse du siège, directeur de la publication.
  - `cgv` : date, politique de remboursement, plafond de responsabilité, ville du siège.
  - `confidentialite` : date, identité du responsable de traitement, cadre du transfert Inngest, suppression de la fiche Stripe à la purge.
  - `a-propos` : l'histoire du fondateur en deux ou trois phrases.
- Exemple de rapport sur l'accueil : il montre le logo Decelio, alors que `/pricing` dit que le rapport porte le logo de l'agence. La marque de l'agence est bien réelle dans le code (`lib/reports/renderMonthlyReportPdf.tsx`, `resolveBrandName` et `resolveAccentColor`) : il ne s'agit pas d'une promesse non tenue, seulement de savoir ce que l'exemple doit montrer.
- Clause « Paiement » des CGV : les pénalités de retard et l'indemnité de 40 € « sont appliquées », au présent, alors qu'aucun code ne les applique. C'est une clause légale obligatoire entre professionnels (article L441-10 du Code de commerce), donc sa présence est normale sans automatisation, mais le présent de l'indicatif se lit comme un fait constaté. À verser à la relecture juridique.

Deux points de la liste précédente sont réglés et retirés : la promesse « résultat en 15 secondes » n'existe plus nulle part dans l'interface (vérifié le 27/09), et le statut de l'ADR-002 est corrigé par #157.

## 5. Signalé à l'Ingénierie, non corrigé côté Design

- `lib/billing/trial.ts` : `getTrialEndsAt` lit `stripeTrialEnd` tel quel et peut donc rendre une date passée. Le champ n'est remis à `null` que par le webhook `customer.subscription.updated`, et aucune tâche de réconciliation ne rattrape un webhook perdu. Le bandeau d'essai se protège à l'affichage, mais la donnée reste fausse pour tout autre usage.
- **Aucun endpoint webhook n'est enregistré sur le compte Stripe de test** (`GET /v1/webhook_endpoints` renvoie une liste vide au 27/09). En l'état, `customer.subscription.trial_will_end` n'atteint jamais l'application en test : l'e-mail de rappel à J-3, pourtant écrit (`lib/email/resend.ts`), n'est pas exerçable de bout en bout. À vérifier aussi en production.
- `TERMS_VERSION` (`lib/legal/terms.ts`, branche #152) doit être porté à une valeur postérieure à **#151 et #156**, qui ont tous deux changé le texte des CGV : la clause d'essai crée désormais une obligation de prélèvement automatique, et #156 a corrigé le moment où la carte est demandée. Les deux fusions étant faites, une seule valeur les couvre. `TERMS_UPDATED_LABEL` et le `LastUpdated` en tête de `app/(marketing)/cgv/page.tsx` doivent porter la même date.
- **Règle de coordination convenue le 27/09** : toute demande de fusion qui change le fond de `/cgv` (une clause, un prix, une durée, un engagement, le responsable du traitement, une adresse de contact) annonce la nouvelle version dans sa description, et l'Ingénierie la pose dans `lib/legal/terms.ts` dans la même fusion. Mise en forme seule : pas de nouvelle version.
- `data-trial-ends-at` est du code mort depuis #151 : le bandeau reçoit la prop directement. Présent en double, dans `app/(app)/layout.tsx` et `app/(app)/settings/SettingsClient.tsx`.
- `lib/scanner/verdicts.ts` : « robots.txt autorise … à **citer** ce site » ; `accessSummary` affiche « Refusé » pour un blocage général.
- `app/(app)/reports/page.tsx` : meta description « visibilité IA ».
- Un test instable : échoue parfois, réussit au lancement suivant.

## 6. Règles de travail retenues

- Une tâche, une branche `design/*` depuis `main` à jour, une PR ; fusion quand la CI est verte (le fondateur a autorisé l'agent Design à fusionner lui-même ses PR vertes).
- Filtre anti-slop en mode « pendant » (skill `antislop`) : pas de tiret cadratin, pas de chiffre sans source, pas de promesse de citation, rapport PASS/FAIL dans chaque PR.
- Mots proscrits : « garantit », « visibilité IA » comme promesse, « être cité », « score GEO », statistiques non sourcées. La mesure des citations est « en préparation ».
- Captures bureau (1440 px) et mobile (375 px) pour chaque PR, sans débordement horizontal. Tout doit rester visible avec `prefers-reduced-motion`.
- Aucun appel à un CDN tiers depuis une page publique : polices, icônes, logos et avatar sont servis depuis `public/` ou en SVG inline.
- Un seul sous-agent à la fois (demande du fondateur, économie).
