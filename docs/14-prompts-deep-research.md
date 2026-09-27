# Prompts Gemini Deep Research — démarrage de Decelio (v3, 5 prompts)

> 27/09/2026. Hypothèse : le SaaS est en ligne. Aucune automatisation pour l'instant.
> Chaque prompt est autonome : copier le bloc entier dans Gemini (mode Deep Research).
> Ancienne version (12 prompts, dont délivrabilité, légal, indexation) : `docs/14-annexe-prompts-v2.md`.

| # | Sujet | Sert à | Skill pour exploiter le rapport |
|---|---|---|---|
| 1 | Marché et concurrence | Savoir où on se place et ce qui a changé depuis le 24/09 | `competitor-profiling`, `product-marketing` |
| 2 | Voix du client | Réécrire la landing avec les mots des agences | `customer-research`, `copywriting` |
| 3 | Soft launch | Recruter 5 à 10 testeurs et apprendre d'eux | `community-marketing`, `onboarding` |
| 4 | Lancement | Annuaires, Product Hunt, presse, baromètre | `directory-submissions`, `launch`, `public-relations` |
| 5 | Acquisition à 0 € | Prospection écrite, réponses dans les communautés, contenu | `prospecting`, `cold-email`, `content-strategy` |

Ordre : 1 → 2 → 3, puis 4 et 5 après les retours des testeurs.
Après chaque rapport : le déposer dans `docs/recherches/`, le faire relire par l'agent avec le skill indiqué, mettre à jour `.agents/product-marketing.md`.

---

## Prompt 1 — Marché et concurrence

```
<contexte>
Decelio (decelio.fr) est un SaaS B2B français en ligne : il vérifie chaque jour que les sites
clients des agences restent lisibles par ChatGPT, Claude et Perplexity (robots.txt par robot IA,
pare-feu et challenges Cloudflare / Wordfence / hébergeur, pages vides sans JavaScript).
Il alerte par e-mail avec la cause et le correctif, et produit un rapport mensuel à la marque
de l'agence. Prix : 39 €/mois (10 sites), 99 € (30 sites), 249 € (100 sites), essai 14 jours,
diagnostic gratuit. Cibles : agences de maintenance WordPress (1–10 pers., 20–150 sites sous
contrat) et agences SEO/GEO (1–15 pers., 15–60 clients en abonnement), France d'abord, puis
Belgique, Suisse, Québec. Vente 100 % écrite et libre-service, sans appel ni démo.
Fondateur solo, budget 0 €. Aucun client ni témoignage pour l'instant.
</contexte>
<regles>
Cite chaque affirmation avec URL et date. Sources officielles et de moins de 12 mois en priorité.
Sépare « vérifié » et « déduit ». Donne un niveau de confiance (élevé : 3 sources ou plus,
moyen : 2, faible : 1). N'invente aucun chiffre, nom ou URL ; si tu ne trouves pas, dis-le.
Rédige en français.
</regles>

Agis comme un analyste marché et marketing produit spécialisé SaaS B2B.

1. Taille du marché en France (puis Belgique, Suisse, Québec) : nombre d'agences web, d'agences
   de maintenance WordPress et d'agences SEO, part des sites français sous WordPress, part des
   sites derrière Cloudflare, part des sites qui bloquent déjà des robots IA. Chiffres sourcés
   uniquement.
2. Tendance : adoption de ChatGPT, Perplexity et des réponses IA de Google en France en 2025-2026,
   et part du trafic des sites qui en vient. Les agences commencent-elles à vendre du « GEO » ?
   Exemples d'offres et de prix.
3. Concurrence : pour WP Umbrella, ManageWP, MainWP, Little Warden, Screaming Frog, Semrush,
   Profound, Peec AI, Otterly, Cloudflare AI Crawl Control, les checkers gratuits, et tout
   nouvel entrant (surtout français ou européen) : ce qu'il vérifie vraiment, alertes,
   multi-clients, marque blanche, langue, prix public, dernière nouveauté datée.
4. Menaces : lesquels ont annoncé ou livré depuis 2025 un contrôle des robots IA ? Avec lien et date.
5. Nos prix face aux leurs, ramenés au prix par site surveillé.
6. Espace libre pour une agence française, et combien de temps un concurrent mettrait à le copier.

Livrable : chiffres clés du marché (tableau sourcé), tableau comparatif des concurrents,
carte de positionnement sur deux axes justifiés, menaces datées, 3 angles de différenciation
avec niveau de confiance, et risques qui pourraient invalider le projet.
```

---

## Prompt 2 — Voix du client

```
<contexte>
Decelio (decelio.fr) est un SaaS B2B français en ligne : il vérifie chaque jour que les sites
clients des agences restent lisibles par ChatGPT, Claude et Perplexity (robots.txt par robot IA,
pare-feu et challenges Cloudflare / Wordfence / hébergeur, pages vides sans JavaScript).
Il alerte par e-mail avec la cause et le correctif, et produit un rapport mensuel à la marque
de l'agence. Cibles : agences de maintenance WordPress et agences SEO/GEO, France d'abord.
Vente 100 % écrite et libre-service. Fondateur solo, budget 0 €. Aucun client pour l'instant.
</contexte>
<regles>
Cite chaque extrait avec URL et date. Citations exactes uniquement, jamais reformulées.
Sources de moins de 18 mois en priorité. Donne un niveau de confiance par thème.
N'invente aucune citation, aucun chiffre, aucune URL. Rédige en français.
</regles>

Agis comme un chercheur en « voice of customer » pour le copywriting B2B.
Méthode : chercher là où les gens parlent sans filtre (forums, Reddit, groupes, commentaires,
avis clients), avant toute interview.

Objectif : collecter les mots exacts des agences web et des propriétaires de sites quand leur
site n'est pas lu ou pas cité par ChatGPT, Perplexity ou Claude, ou quand un pare-feu, un plugin
de sécurité ou un hébergeur bloque des robots.

1. Verbatims en français d'abord (WP-FR, WP Marmite, WebRankInfo, groupes Facebook et LinkedIn,
   Reddit francophone), puis en anglais (r/SEO, r/Wordpress, r/bigseo, forums Cloudflare et
   Wordfence). Pour chaque extrait : citation, URL, date, contexte, émotion, type (douleur /
   déclencheur / résultat attendu / alternative essayée / vocabulaire), profil (agence,
   freelance, propriétaire).
2. Avis sur les outils voisins (WP Umbrella, ManageWP, MainWP, Little Warden, Otterly, Peec AI) :
   ce qui est loué, ce qui manque, surtout dans les avis à 3-4 étoiles.
3. Tâches à accomplir : fonctionnelle (vérifier), émotionnelle (être tranquille),
   sociale (prouver au client). Que veut prouver l'agence à son client ?
4. Objections à un abonnement de surveillance et alternatives citées
   (« je vérifie moi-même », « mon plugin le fait », « le GEO est une mode »).
5. Biais d'échantillon à signaler.

Livrable : thèmes classés par fréquence × intensité avec 5 à 10 citations chacun,
15 expressions à reprendre telles quelles sur une page d'accueil, objections avec une réponse
suggérée, déclencheurs d'achat, niveau de confiance par thème.
```

---

## Prompt 3 — Soft launch : premiers testeurs

```
<contexte>
Decelio (decelio.fr) est un SaaS B2B français en ligne : il vérifie chaque jour que les sites
clients des agences restent lisibles par ChatGPT, Claude et Perplexity (robots.txt par robot IA,
pare-feu Cloudflare / Wordfence / hébergeur, pages vides sans JavaScript), alerte avec la cause
et le correctif, et produit un rapport mensuel à la marque de l'agence. Diagnostic gratuit,
essai 14 jours. Cibles : agences de maintenance WordPress et agences SEO/GEO, France d'abord.
Tout se fait par écrit : aucun appel, aucune démo. Fondateur solo, budget 0 €, pas
d'automatisation. Objectif : 5 à 10 premiers testeurs réels.
</contexte>
<regles>
Cite chaque affirmation avec URL et date. Ne cite que des communautés dont tu as vérifié
l'existence et l'activité récente. Donne un niveau de confiance. N'invente rien.
Écarte toute tactique qui suppose des appels, des faux avis ou du spam. Rédige en français.
</regles>

Agis comme un stratège de lancement et de communautés B2B en France.
Principe : participer et apporter de la valeur avant toute mention du produit.

1. Communautés actives en 2026 fréquentées par ces agences : forums, groupes Facebook et
   LinkedIn, Slack, Discord, subreddits, espaces membres de formations ou newsletters.
   Pistes à vérifier : WP-FR, WP Marmite, WebRankInfo, SEOCamp, r/SEO, r/Wordpress.
   Pour chacune : lien, activité visible, date d'un message récent, règle d'autopromotion
   (interdite, jour dédié, accord du modérateur), angle d'approche adapté.
2. Personnes relais : formateurs WordPress et SEO francophones, créateurs de contenu,
   animateurs de groupes susceptibles de relayer un appel à testeurs sans paiement.
3. Comment des SaaS B2B francophones ont recruté leurs premiers testeurs par écrit :
   message publié, contrepartie (mois offert, tarif fondateur), résultats rapportés.
4. Retour d'expérience écrit : questionnaire court pour les testeurs (déclencheur, alternatives
   essayées, résultat attendu, ce qui a bloqué) et la question Sean Ellis
   « Comment vous sentiriez-vous si vous ne pouviez plus utiliser Decelio ? ».
   Repères publiés pour interpréter les réponses.
5. Premier usage : quel « moment de valeur » viser dans les 10 premières minutes pour un outil
   de surveillance B2B, et exemples de SaaS comparables.
6. Erreurs qui font bannir ou ignorer un fondateur dans ces communautés.

Livrable : tableau des communautés classé par pertinence, liste de relais, 3 messages
d'invitation adaptés à des lieux différents, questionnaire de 10 questions maximum,
plan sur 3 semaines pour obtenir 5 à 10 testeurs.
```

---

## Prompt 4 — Lancement

```
<contexte>
Decelio (decelio.fr) est un SaaS B2B français en ligne : il vérifie chaque jour que les sites
clients des agences restent lisibles par ChatGPT, Claude et Perplexity, alerte avec la cause
et le correctif, et produit un rapport mensuel à la marque de l'agence. Prix : 39 à 249 €/mois.
Cibles : agences de maintenance WordPress et SEO/GEO, France d'abord. Fondateur solo,
budget 0 €, pas d'automatisation. Nous préparons aussi un baromètre public « Les sites
français bloquent-ils ChatGPT ? » (300 à 500 sites scannés, méthode publiée).
</contexte>
<regles>
Cite chaque affirmation avec URL et date. Signale toute option payante avec son prix.
Donne un niveau de confiance. N'invente aucun annuaire, média, contact ou chiffre.
Jamais d'achat ni de demande de votes. Rédige en français.
</regles>

Agis comme un spécialiste des lancements de SaaS et des relations presse tech en France.
Principes : les annuaires sont une fondation (liens, découverte, citations par les IA), pas
toute la stratégie ; on ne soumet que quand les pages de destination sont prêtes ; la
description change selon le type d'annuaire.

1. Annuaires gratuits actifs en 2026, francophones et internationaux : lancement (Product Hunt,
   BetaList, Microlaunch, Uneed, Fazier...), SaaS (AlternativeTo, SaaSHub...), outils SEO,
   WordPress et IA, annuaires de startups françaises. Pour chacun : coût (et prix de la file
   rapide), lien dofollow ou nofollow, audience, délai, critères d'acceptation, pertinence.
2. Prérequis avant soumission (page de prix, pages légales, captures, vidéo courte, logos).
3. Product Hunt : règles actuelles, préparation du compte, jour et heure, et intérêt réel
   pour un produit en français ciblant la France. Équivalents francophones.
4. Presse et newsletters francophones qui couvrent SEO, WordPress et IA (ex. JDN, BDM,
   Presse-citron, Abondance, WebRankInfo) : rubrique, contact public, sujets repris récemment.
5. Études similaires déjà publiées sur le blocage des robots IA : qui, quand, méthode,
   reprises obtenues, et ce qui reste inédit pour un baromètre français.
6. Plateformes d'avis (G2, Capterra, Trustpilot) : conditions gratuites et règles sur les
   incitations.

Livrable : tableau des annuaires trié par intérêt (nom, lien, coût, type de lien, audience,
délai, angle de description), checklist des prérequis, 20 cibles presse avec angle,
calendrier de lancement sur 6 semaines.
```

---

## Prompt 5 — Acquisition à 0 €

```
<contexte>
Decelio (decelio.fr) est un SaaS B2B français en ligne : il vérifie chaque jour que les sites
clients des agences restent lisibles par ChatGPT, Claude et Perplexity (robots.txt par robot IA,
pare-feu Cloudflare / Wordfence / hébergeur, pages vides sans JavaScript), alerte avec la cause
et le correctif, et produit un rapport mensuel à la marque de l'agence. Diagnostic gratuit,
essai 14 jours, 39 à 249 €/mois. Cibles : agences de maintenance WordPress et SEO/GEO,
France d'abord. Vente 100 % écrite, sans appel. Fondateur solo, budget 0 €, tout à la main,
quelques heures par semaine. Canal principal prévu : scanner le portefeuille visible d'une
agence puis lui écrire avec un constat vérifié sur un de ses sites clients.
</contexte>
<regles>
Cite chaque affirmation avec URL et date. Donne des repères chiffrés seulement s'ils sont
sourcés. Donne un niveau de confiance. N'invente rien. Écarte le spam, l'achat de listes et
toute tactique contraire aux règles des plateformes. Rédige en français.
</regles>

Agis comme un spécialiste de l'acquisition B2B à budget nul pour un fondateur solo.

1. Prospection écrite :
   a. Sources gratuites pour lister les agences WordPress et SEO en France (annuaires d'agences,
      pages partenaires d'hébergeurs et d'outils, Malt, LinkedIn, Google Maps) et leurs
      conditions d'usage.
   b. Signaux publics qui qualifient une agence (offre de maintenance, offre GEO récente,
      page réalisations).
   c. Règles CNIL pour la prospection e-mail B2B en France (intérêt légitime, opposition,
      mentions), et volumes d'envoi raisonnables pour ne pas nuire au domaine.
   d. Repères publiés 2025-2026 sur les e-mails à froid B2B qui obtiennent des réponses
      (longueur, objet, personnalisation), avec source.
2. Réponses dans les communautés : où les gens demandent pourquoi ChatGPT ou Perplexity ne
   voient pas leur site (français et anglais), requêtes de recherche manuelles pour les trouver
   chaque semaine, règles d'autopromotion et de divulgation par plateforme.
3. Contenu : les 10 sujets d'articles à écrire en premier pour ces agences (ex. « Cloudflare
   bloque-t-il ChatGPT ? », « Wordfence et les robots IA »), avec la requête visée, la
   concurrence sur la requête et le format.
4. Partenariats gratuits : formateurs, communautés, outils complémentaires (maintenance WP,
   hébergeurs) ouverts à un échange de visibilité ou un programme d'affiliation.
5. Priorisation : classe ces canaux par effet / effort pour un fondateur seul, avec un
   indicateur et un critère d'arrêt pour chacun.

Livrable : tableau des sources de prospects, séquence de 3 e-mails commentée (J0, J+4, J+9,
sans faux client ni fausse statistique), 15 requêtes de veille manuelle, 10 sujets
d'articles, liste de partenaires, plan hebdomadaire réaliste pour 5 heures par semaine.
```
