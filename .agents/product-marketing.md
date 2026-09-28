# Product Marketing Context — Decelio

**Document version:** v2
**Last updated:** 2026-09-28
**Sources :** docs/05-analyse-strategique.md (§6 ICP, §7 concurrence, §9 positionnement), docs/08-constitution.md, instructions du projet. Rien ici n'est inventé : tout point non sourcé est marqué « hypothèse ».

## Règles absolues (priment sur tout conseil d'un skill)
- Budget 0 € : seulement des outils gratuits autorisant l'usage commercial. Toute dépense se signale avant.
- Aucun faux chiffre, faux témoignage, faux logo, faux avis. Pas de « social proof » inventée.
- Ne jamais promettre une fonction non construite : la marquer « en préparation ».
- Honnêteté de la mesure : on ne voit jamais « ce que voit GPTBot ». Imiter un User-Agent ne donne qu'un indice.
- Vente 100 % écrite et libre-service : aucun appel, aucune démo en direct, pas de call de découverte.
- Textes en français simple, sans jargon, à la 1re personne du pluriel ou à l'impératif.
- Aucune vente avant le SIREN (micro-entreprise, franchise TVA art. 293 B).

## Product Overview
**One-liner :** Sachez avant votre client si ChatGPT, Claude ou Perplexity ne peuvent plus lire son site. Et prouvez-lui chaque mois que vous veillez.
**What it does :** vérifie chaque jour un portefeuille de sites : robots.txt par robot IA, pare-feu et challenges (Cloudflare, Wordfence, hébergeur), pages vides sans JavaScript. Alerte e-mail avec cause et correctif, rapport mensuel à la marque de l'agence.
**Product category :** monitoring de lisibilité IA pour portefeuilles de sites (pas « outil GEO », pas « scanner »).
**Product type :** SaaS B2B.
**Business model :** abonnement mensuel — Freelance 39 € (10 sites), Agence 99 € (30 sites), Studio 249 € (100 sites). Essai gratuit 14 jours (en cours de livraison). Porte d'entrée : diagnostic gratuit.

## Target Audience
**Target companies :** toute agence ou freelance qui maintient des sites clients ou fait leur SEO de façon récurrente, quel que soit l'outil (WordPress, Wix, Shopify, Webflow, PrestaShop, sur mesure). Segments : (A) agences de maintenance WordPress, 1–10 personnes, 20–150 sites sous contrat ; (B) agences SEO/GEO, 1–15 personnes, 15–60 clients en abonnement ; (C) agences web et SEO sur d'autres plateformes (Wix, Shopify, Webflow…). Pays : France, Belgique, Suisse et Luxembourg francophones dès le lancement (mêmes textes) ; Québec ensuite ; autres langues après 20 à 30 clients en France.
**Priorité de prospection :** là où le problème est le plus fréquent (WordPress d'abord). On n'écrit à une agence que si l'un de ses sites a un problème vérifié. Le baromètre v2 mesurera la fréquence par plateforme.
**Decision-makers :** fondateur ou freelance senior.
**Primary use case :** ne plus découvrir après coup qu'un site client est devenu illisible par les IA, et le prouver au client.

## Personas
- **Sophie** — freelance maintenance WP, 45 sites. Vend de la tranquillité. WP Marmite, groupes Facebook WordPress FR. Indicateur : taux de renouvellement des contrats.
- **Julien** — fondateur d'agence SEO de 3 personnes à Lyon. Pression pour ajouter « IA » à l'offre. SEOCamp, groupes LinkedIn SEO FR.

## Problems & Pain Points
- « Je découvre après coup que l'hébergeur a bloqué des trucs. »
- « Mes clients pensent que la maintenance, ce n'est que des mises à jour. »
- « Je ne peux pas vérifier 60 sites à la main. »
- « Je ne sais pas packager le GEO, il me faut un livrable propre. »
- « Le client a mis Cloudflare et je dois comprendre vite. »
- « Mes rapports mensuels sont faits à la main. »
(Formulations issues de la recherche du 24/09, à confirmer par les premiers testeurs.)

**Déclencheurs :** migration d'hébergeur, Cloudflare ou mode « Under Attack », mise à jour Wordfence, client qui demande « pourquoi ChatGPT ne parle pas de nous ? », lancement d'une offre GEO, refonte en JavaScript.

## Competitive Landscape
- Maintenance WP (WP Umbrella, ManageWP, MainWP) : tableau de bord et marque blanche, aucune logique IA. Menace n°1 s'ils ajoutent un module.
- Suites GEO (Profound, Peec AI, Otterly) : moteur d'audit mais chères, centrées citations.
- BabyLoveGrowth.ai : rédaction automatique d'articles, liens entrants et suivi de citations, « audit GEO » technique. Plan agence dès 99 $/site/mois, la tarification la plus proche de la nôtre. Pas de contrôle quotidien `robots.txt` par robot ni d'alerte de régression documentés (à vérifier).
- Little Warden : surveille robots.txt pour agences, pas les bots IA.
- Checkers gratuits : scan ponctuel sans suivi. Cloudflare AI Crawl Control : gratuit mais sans vue multi-clients.

## Differentiation
- Diagnostic de la **cause** (quelle règle Cloudflare, quel plugin, quel hébergeur) avec correctif pas à pas.
- Rapport client en français et en marque blanche.
- Multi-clients à prix d'agence.

## Objections (hypothèses à valider)
- « Je peux le vérifier moi-même. » → pas sur 60 sites, pas chaque jour.
- « Mon outil de maintenance le fait. » → aucun ne vérifie les robots IA.
- « Le GEO est une mode. » → le blocage technique est binaire et vérifiable.

## Anti-Personas
Freelances sans récurrent, sites qui veulent bloquer les IA (presse), grandes agences outillées. (Les agences Wix, Shopify, Webflow et no-code ne sont plus exclues depuis le 28/09.)

## Identité publique
Les comptes publics et les signatures sont au nom de Decelio (« L'équipe Decelio »). Le nom du fondateur n'apparaît que là où la loi l'impose : mentions légales, CGV, Stripe, registre du domaine.

## Customer Language
**Utiliser :** lisible, bloqué, robots IA, pare-feu, rapport client, portefeuille de sites, correctif.
**Éviter :** « visibilité IA » promise, nombre de citations, proxy, middleware, « Managed Fix », jargon anglais non expliqué.

## Brand Voice
Expert, sobre, factuel, pédagogique. Français simple. Preuves plutôt qu'adjectifs.

## Proof Points
Aucun client ni témoignage à ce jour. Preuves autorisées : captures datées de diagnostics réels, méthode publiée, baromètre (en préparation).

## Goals
- Court terme : 5 à 10 testeurs réels, puis 10 agences payantes (~1 000 € MRR) sur 90 jours.
- Canaux : baromètre public, prospection écrite appuyée sur des preuves, diagnostic gratuit, contenu SEO pour agences, communautés WordPress et SEO FR.

## Changelog
- v1 (27/09/2026) : création depuis docs/05.
- v2 (28/09/2026) : Belgique, Suisse et Luxembourg dès le lancement ; cible élargie à toutes les agences web et SEO quel que soit l'outil (décision du fondateur) ; BabyLoveGrowth ajouté aux concurrents ; identité publique au nom de Decelio.
