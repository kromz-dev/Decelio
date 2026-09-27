# Prompts Gemini Deep Research — après déploiement

> Version 2 du 27/09/2026. Réécrite avec les méthodes des skills marketing installés dans
> `.agents/skills/` et `.claude/skills/` (dépôt coreyhaines31/marketingskills, licence MIT).
> Contexte produit commun : `.agents/product-marketing.md`.

## Mode d'emploi

1. Colle le **bloc contexte**, puis **un** prompt, dans le même message. Une recherche par prompt.
2. Au plan de recherche proposé : « Modifier le plan », retire les étapes hors sujet (marché US seul, outils payants, grandes entreprises).
3. Sources : décoche Gmail et Drive, garde la recherche web.
4. Exporte vers Google Docs, dépose le rapport dans `docs/recherches/AAAA-MM-JJ-pXX.md`.
5. Fais exploiter le rapport par l'agent local avec le skill indiqué (colonne « Skill » du tableau final). Il le relit contre le code et les docs avant toute action.
6. Tout chiffre sans lien ni date : ignoré. Tout insight de confiance « faible » : à revalider avant d'agir.

---

## Bloc contexte (en tête de chaque prompt)

```
<contexte>
Produit : Decelio (decelio.fr), SaaS B2B français, catégorie « monitoring de lisibilité IA
pour portefeuilles de sites ». Il vérifie chaque jour que les sites clients des agences
restent lisibles par ChatGPT, Claude et Perplexity : robots.txt par robot IA, pare-feu et
challenges (Cloudflare, Wordfence, hébergeur), pages vides sans JavaScript. Alerte e-mail
avec cause et correctif, rapport mensuel à la marque de l'agence.
Promesse : « Sachez avant votre client si ChatGPT, Claude ou Perplexity ne peuvent plus lire
son site. Et prouvez-lui chaque mois que vous veillez. »
Prix : 39 €/mois (10 sites), 99 € (30 sites), 249 € (100 sites). Essai 14 jours. Diagnostic gratuit.
Cible A : agences de maintenance WordPress, 1–10 personnes, 20–150 sites sous contrat
(outils : WP Umbrella, ManageWP, MainWP, Wordfence, Cloudflare, o2switch, Hostinger).
Cible B : agences SEO/GEO, 1–15 personnes, 15–60 clients en abonnement.
France d'abord, puis Belgique, Suisse, Québec.
Hors cible : agences no-code, freelances sans récurrent, grandes agences, sites Shopify/Wix.
Concurrents : outils de maintenance WP (aucune logique IA), Profound / Peec AI / Otterly
(chers, centrés citations), Little Warden, checkers gratuits ponctuels, Cloudflare AI Crawl Control.
Différence : on donne la cause (quelle règle, quel plugin, quel hébergeur) et le correctif,
en rapport français à la marque de l'agence, multi-clients, à prix d'agence.
Vente 100 % écrite et en libre-service : aucun appel, aucune démo.
Fondateur solo, micro-entreprise en franchise de TVA, SIREN en attente. Budget : 0 €.
Stack : Next.js 16 sur Render, PostgreSQL Neon, Stripe, Resend (eu-west-1),
PostHog Cloud UE via proxy sur notre domaine, domaine chez OVH, n8n auto-hébergé.
Stade : aucun client, aucun témoignage. On cherche les 5 à 10 premiers testeurs.
</contexte>

<regles>
- Cite chaque affirmation avec son URL et la date de la page.
- Privilégie les sources officielles (éditeurs, CNIL, service-public.fr, Légifrance,
  règles des plateformes) et les sources de moins de 12 mois.
- Sépare « vérifié par une source » et « déduit / non vérifié ».
- Donne un niveau de confiance à chaque conclusion : élevé (3 sources indépendantes ou plus),
  moyen (2 sources), faible (1 source).
- N'invente aucun chiffre, aucun nom de communauté, aucune URL, aucune citation.
  Si tu ne trouves pas, écris-le.
- Signale toute option payante avec son prix et tout piège d'usage commercial des offres gratuites.
- Écarte toute tactique qui suppose des appels, des démos, des faux avis ou des achats de votes.
- Rédige en français.
</regles>
```

---

## 1. Ops et hygiène (semaine du déploiement)

### P1 — Délivrabilité et boîte pro

```
Agis comme un spécialiste de la délivrabilité e-mail pour petits SaaS.

Objectif : que nos e-mails transactionnels (alertes, lien de connexion, reçus, rapport
mensuel) arrivent en boîte de réception chez Gmail, Outlook et Orange/Free/SFR, et avoir
une adresse contact@decelio.fr pour recevoir et répondre, à 0 €.

1. Enregistrements DNS exacts demandés par Resend (SPF, DKIM, MX de retour, sous-domaine
   d'envoi) et saisie dans la zone DNS OVH : pièges connus (un seul SPF par nom, point final,
   TTL, propagation, conflit avec les MX de réception).
2. DMARC progressif (p=none → quarantine → reject) : valeurs, durée par palier, service gratuit
   de lecture des rapports utilisable commercialement.
3. Exigences actuelles de Google, Yahoo et Microsoft pour les expéditeurs (alignement,
   désinscription en un clic, taux de plainte) et ce qui s'applique à un petit volume
   transactionnel ; faut-il séparer transactionnel et prospection sur des sous-domaines ?
4. Options gratuites pour une vraie boîte contact@decelio.fr compatible avec l'envoi Resend :
   e-mail inclus avec le domaine OVH, redirection vers Gmail + « Envoyer en tant que »,
   Zoho Mail gratuit, réception entrante Resend, autres. Pour chacune : usage commercial,
   limites, conflit MX/SPF.
5. Tests avant lancement (mail-tester, en-têtes « Afficher l'original », Postmaster Tools).

Livrable : tableau DNS final (type, nom, valeur, rôle), comparatif des boîtes pro,
checklist ordonnée avec critère de réussite pour chaque étape.
```

### P2 — Mesure du tunnel et paiements

```
Agis comme un consultant RGPD et un spécialiste de l'analytics produit SaaS.

Objectif : une mesure conforme sans bannière cookies sur la vitrine, un tunnel d'activation
fiable dans l'application, et des webhooks Stripe sans perte.

1. CNIL : conditions exactes de l'exemption de consentement pour la mesure d'audience, et si
   PostHog sans cookie ni stockage local (IP non stockée, proxy sur notre domaine) peut y
   prétendre. Distingue vitrine (anonyme) et application (clients connectés, événements liés
   au compte).
2. Réglages PostHog documentés pour ce mode et ce qu'on perd (visiteurs uniques, sessions,
   replays). Les replays de session sont-ils possibles sans consentement ?
3. Plan de suivi minimal pour un SaaS B2B en essai gratuit : événements à nommer (diagnostic
   lancé, inscription, premier site ajouté, première alerte reçue, rapport ouvert, paiement),
   définition d'un « événement d'activation », et repères publiés de conversion essai → payant
   en B2B avec carte demandée (avec source et date).
4. Stripe : événements webhook minimaux pour un abonnement avec essai de 14 jours et carte
   (création, fin d'essai, paiement échoué, résiliation), bonnes pratiques officielles
   (signature, idempotence, 2xx rapide, rejeu), passage du mode test au réel.
5. Ce que la politique de confidentialité doit dire sur PostHog UE et si un DPA existe sur
   l'offre gratuite.

Livrable : checklist « conforme / à corriger », plan de suivi (événement, propriétés,
question métier), tableau Stripe (événement, action en base, risque si raté).
```

### P3 — Pages légales et prospection écrite conforme

```
Agis comme un juriste en droit du numérique français (précise ce qui exige un professionnel).

Objectif : des mentions légales, CGV et politique de confidentialité correctes pour une
micro-entreprise qui vend un abonnement SaaS à des professionnels, et une prospection par
e-mail B2B conforme.

1. Mentions légales (LCEN art. 6) d'un entrepreneur individuel, et ce qu'on peut publier
   pendant l'attente du SIREN.
2. CGV B2B d'abonnement SaaS : clauses indispensables (essai, reconduction, résiliation, prix
   « TVA non applicable, art. 293 B du CGI », pénalités et indemnité de 40 €, responsabilité,
   disponibilité, données du client). CGU en plus : utiles ou non ?
3. Droit de rétractation pour un client professionnel de moins de 5 salariés hors de son
   activité principale (art. L221-3 du Code de la consommation) : s'applique-t-il ici ?
4. RGPD : registre minimal, sous-traitants à nommer (Render, Neon, Stripe, Resend, PostHog,
   Inngest), transferts hors UE, durées de conservation.
5. Prospection e-mail B2B en France : position CNIL (intérêt légitime, lien avec la fonction
   de la personne, droit d'opposition), adresses génériques vs nominatives, mentions
   obligatoires, source des adresses. Même question pour la Belgique et la Suisse.
6. Scanner des sites tiers (ceux des agences prospectées) : risques et précautions.

Livrable : checklist par page (clause, obligatoire ou recommandée, source), règles de
prospection en 10 points, liste des points à faire valider par un professionnel.
```

### P4 — Indexation, miniatures et pages de destination

```
Agis comme un consultant SEO technique spécialiste des SaaS récents.

Objectif : indexation propre de decelio.fr, belles miniatures de partage, et les pages
vers lesquelles pointeront les liens des annuaires.

1. Google Search Console pour un nouveau domaine (propriété DNS chez OVH, sitemap,
   inspection d'URL) ; Bing Webmaster Tools (import GSC, IndexNow).
2. Next.js 16 App Router : sitemap.ts, robots.ts, metadata, opengraph-image avec
   ImageResponse ; pièges (metadataBase, URL absolues, cache).
3. Spécifications actuelles des aperçus LinkedIn, X, Slack, WhatsApp et outils officiels pour
   vider leur cache.
4. Données structurées utiles et encore affichées en 2026 pour un SaaS
   (Organization, SoftwareApplication, FAQPage) et leur effet mesuré sur les réponses des IA.
5. Pages de destination qui convertissent le mieux pour un SaaS B2B de niche : pages
   « alternative à [concurrent] », pages par audience (« pour agences WordPress »,
   « pour agences SEO »), pages problème (« Cloudflare bloque ChatGPT »). Pour chacune :
   exemples réels de SaaS, structure, requêtes françaises visées et volume si disponible.

Livrable : checklist ordonnée, tableau balises par plateforme, liste de 10 pages de
destination à créer, par priorité, avec la requête visée.
```

---

## 2. Marque et canaux

### P5 — Pseudos, profils, canaux possédés et annonces automatisées

```
Agis comme un responsable marque et lancement pour un SaaS B2B solo.
Utilise le cadre ORB : canaux possédés (liste e-mail, blog, site), loués (réseaux sociaux,
places de marché), empruntés (médias, newsletters, podcasts, communautés d'autrui).

Objectif : réserver « decelio » là où les agences web françaises sont réellement, préparer
les pages entreprise, choisir 1 ou 2 canaux possédés, et automatiser les annonces de mises à
jour avec n8n auto-hébergé.

1. Où les agences WordPress et SEO françaises sont-elles actives en 2026 ? Classe LinkedIn, X,
   Bluesky, YouTube, Discord, Slack, Malt, groupes Facebook, GitHub, WordPress.org par utilité
   réelle, avec preuves.
2. Pour chaque plateforme retenue : règles de création d'une page entreprise, pseudo, tailles
   de logo et de bannière, risque de suspension d'un compte marque peu actif.
3. Canaux possédés à 0 € : newsletter (outils gratuits autorisant l'usage commercial,
   limites), blog sur le site, journal des nouveautés public. Lequel lancer en premier pour
   cette cible ?
4. Canaux empruntés : newsletters, podcasts et médias francophones sur WordPress, SEO et IA
   qui acceptent des contributions ou des outils à tester.
5. n8n : nœuds et accès API pour publier sur une page LinkedIn entreprise, X, Bluesky,
   Discord (webhook). Pour chaque API : gratuite ou payante, approbation, limites.

Livrable : tableau des plateformes (priorité, action, lien, formats visuels), plan ORB sur
90 jours, tableau « automatisation à 0 € : oui / non / limite ».
```

---

## 3. Soft launch : 5 à 10 testeurs, puis ajustement du message

### P6 — Communautés et recrutement des premiers testeurs

```
Agis comme un stratège de croissance communautaire B2B en France.
Principe : participer et apporter de la valeur avant toute mention du produit.

Objectif : trouver où recruter à la main, par écrit et sans appel, 5 à 10 agences de
maintenance WordPress ou SEO/GEO pour tester Decelio gratuitement.

1. Communautés actives en 2026 fréquentées par ces agences : forums, groupes Facebook et
   LinkedIn, Slack, Discord, subreddits, espaces membres de newsletters ou formations.
   Pistes à vérifier : WP-FR, WP Marmite, WebRankInfo, SEOCamp, r/SEO, r/Wordpress.
   Pour chacune : lien, taille ou activité visible, date d'un message récent, règle
   d'autopromotion (interdite, jour dédié, accord du modérateur), identité partagée des membres.
2. Personnes relais : formateurs WordPress et SEO francophones, créateurs de contenu,
   animateurs de groupes, susceptibles de relayer un appel à testeurs (sans paiement).
3. Comment des SaaS B2B francophones ont recruté leurs premiers testeurs par écrit : message
   publié, contrepartie (mois offert, tarif fondateur), résultats rapportés, avec source.
4. Recherche client écrite : questionnaire court à envoyer aux testeurs (questions pour
   comprendre déclencheur, alternatives essayées, résultat attendu) et la question
   Sean Ellis « Comment vous sentiriez-vous si vous ne pouviez plus utiliser... ? ».
5. Erreurs qui font bannir ou ignorer un fondateur dans ces communautés.

Livrable : tableau classé (communauté, lien, public, règle, angle d'approche, confiance),
liste de relais, 3 messages d'invitation adaptés à des lieux différents, questionnaire de
10 questions maximum.
```

### P7 — Voix du client : mots, douleurs, déclencheurs

```
Agis comme un chercheur en « voice of customer » pour le copywriting B2B.
Méthode : recherche dans les « points d'eau » (forums, Reddit, avis, commentaires), avant
toute interview.

Objectif : collecter les mots exacts des agences web et des propriétaires de sites quand
leur site n'est pas lu ou pas cité par ChatGPT, Perplexity ou Claude, ou quand un pare-feu
ou un plugin bloque des robots, pour réécrire notre page d'accueil.

1. Verbatims 2025-2026, français d'abord puis anglais. Pour chaque extrait : citation exacte,
   URL, date, contexte, émotion, type (douleur / déclencheur / résultat attendu / alternative
   essayée / vocabulaire), indices sur le profil (agence, freelance, propriétaire).
2. Avis des concurrents et outils voisins (WP Umbrella, ManageWP, MainWP, Little Warden,
   Otterly, Peec AI) : ce qui est loué, ce qui manque, en particulier les avis à 3-4 étoiles.
3. Tâches à accomplir (fonctionnelle, émotionnelle, sociale) : que veut prouver l'agence à
   son client ?
4. Objections probables à un abonnement de surveillance et alternatives citées
   (« je vérifie moi-même », « mon plugin le fait », « c'est une mode »).
5. Biais d'échantillon à signaler (Reddit plus technique et sceptique, avis tirés par les
   utilisateurs intensifs, etc.).

Livrable : thèmes classés par fréquence × intensité, 5 à 10 citations clés par thème,
15 expressions à reprendre telles quelles, objections avec réponse suggérée, confiance
par thème. Aucune citation reformulée.
```

---

## 4. Lancement et acquisition organique

### P8 — Annuaires et lancement

```
Agis comme un spécialiste des lancements de SaaS et des soumissions aux annuaires.
Principes : les annuaires sont une fondation (liens, découverte, citations par les IA),
jamais toute la stratégie ; on ne soumet qu'une fois les pages de destination prêtes ;
la description change selon le type d'annuaire ; on ne demande jamais de votes.

Objectif : choisir et ordonner les annuaires gratuits utiles à un SaaS B2B dont le marché
principal est la France.

1. Annuaires actifs en 2026, francophones et internationaux : lancement (Product Hunt,
   BetaList, Microlaunch, Uneed, Fazier...), SaaS (AlternativeTo, SaaSHub...), outils IA,
   outils SEO et WordPress, annuaires de startups françaises. Pour chacun : gratuit ou payant
   (prix de la file rapide), lien dofollow ou nofollow, audience (langue, B2B), délai,
   critères d'acceptation, pertinence pour nous.
2. Prérequis avant soumission demandés par ces annuaires (page de prix, pages légales,
   captures, vidéo courte, logos) : liste consolidée.
3. Product Hunt : règles actuelles (ce qui est interdit, préparation du compte, page
   « à venir », jour et heure), et intérêt réel pour un produit en français ciblant la
   France. Alternatives francophones équivalentes.
4. Angle de description à privilégier par type d'annuaire (résultat, alternative à un
   concurrent, technique, IA).
5. Plateformes d'avis B2B (G2, Capterra, Trustpilot, avis Google) : conditions gratuites,
   règles sur les incitations, seuil utile d'avis.

Livrable : tableau trié (nom, lien, coût, type de lien, audience, délai, effort, angle),
checklist des prérequis, calendrier sur 6 semaines, modèle de suivi (colonnes CSV).
```

### P9 — Veille « sniper » et réponses utiles

```
Agis comme un spécialiste du marketing de réponse, sans spam.

Objectif : repérer chaque semaine les personnes qui demandent pourquoi ChatGPT, Perplexity
ou Claude ne voient pas leur site, et leur répondre en expert, en citant Decelio seulement
quand c'est pertinent et permis.

1. Où apparaissent ces questions (Reddit, X, Bluesky, LinkedIn, forums WordPress,
   WebRankInfo, Quora, groupes) et requêtes exactes pour les trouver, en français et en anglais.
2. Outils gratuits de veille utilisables commercialement (alertes Reddit, RSS, Google Alerts,
   recherche X et Bluesky, n8n avec flux RSS) : ce qui marche encore en 2026 après les
   changements d'API de Reddit et X.
3. Règles officielles d'autopromotion de Reddit et des subreddits visés ; règles de
   divulgation (« je suis le créateur de... »).
4. Exemples de réponses bien reçues vs sanctionnées, avec lien.

Livrable : 20 requêtes de veille, tableau des outils (coût, limite, automatisable n8n),
règles par plateforme, modèle de réponse en 3 temps (diagnostic utile dans le message,
correctif, mention transparente de l'outil).
```

### P10 — Prospection écrite appuyée sur des preuves

```
Agis comme un expert en prospection B2B par e-mail pour SaaS, sans appel.
Principe : on scanne le portefeuille visible d'une agence (réalisations, études de cas),
puis on lui écrit avec un constat vérifié sur un de ses sites clients.

Objectif : construire une liste qualifiée d'agences françaises et une séquence de 3 e-mails
(J0, J+4, J+9) qui obtient des réponses.

1. Sources gratuites pour lister les agences WordPress et SEO en France : annuaires
   d'agences, pages partenaires (hébergeurs, WP Umbrella, Yoast...), Malt, LinkedIn, Google
   Maps. Conditions d'usage de chaque source.
2. Signaux publics qui qualifient une agence (offre de maintenance, offre GEO récente,
   page réalisations, nombre de sites visibles).
3. Repères publiés sur la prospection e-mail B2B à froid en 2025-2026 : longueur, objet,
   personnalisation, taux de réponse réalistes, avec source et date.
4. Infrastructure : faut-il un domaine ou sous-domaine séparé, un préchauffage, quels volumes
   par jour pour ne pas nuire à decelio.fr ? Outils gratuits.
5. Contraintes légales rappelées (CNIL, opposition, mentions).

Livrable : tableau des sources, grille de qualification, règles d'infrastructure,
3 exemples de séquences commentées (sans fausse statistique ni faux client).
```

### P11 — Baromètre public et relations presse

```
Agis comme un attaché de presse spécialisé tech et marketing digital en France.

Objectif : faire reprendre notre baromètre « Les sites français bloquent-ils ChatGPT ? »
(300 à 500 sites scannés, méthode publiée) par des médias et des newsletters pour obtenir
au moins 5 liens de qualité.

1. Médias, newsletters, podcasts et journalistes francophones qui couvrent SEO, WordPress
   et IA générative (ex. JDN, BDM, Presse-citron, Abondance, WebRankInfo) : rubrique,
   contact public, type de sujet repris récemment, avec lien.
2. Études similaires déjà publiées (blocage des robots IA par les sites, en France ou
   ailleurs) : qui, quand, méthode, reprises obtenues. Qu'est-ce qui reste inédit ?
3. Ce qui fait reprendre une étude de données : format, visuels, angle local, exclusivité,
   moment de l'envoi.
4. Données publiques utilisables pour l'échantillon (classements de sites français) et leurs
   conditions d'usage.

Livrable : liste de 20 cibles presse (priorité, angle), analyse des études existantes,
modèle de communiqué court, calendrier d'envoi.
```

---

### P12 — Concurrence et positionnement (mise à jour de docs/05)

```
Agis comme un analyste marketing produit spécialisé SaaS B2B.
Point de départ : une analyse du 24/09/2026 (résumée dans le contexte). Ne la recopie pas :
vérifie-la, complète-la et signale ce qui a changé.

1. Pour chaque concurrent cité dans le contexte, et pour tout nouvel entrant trouvé
   (surtout français ou européens) : ce qu'il vérifie réellement (robots.txt, pare-feu,
   rendu JavaScript, citations), surveillance et alertes, multi-clients, marque blanche,
   langue, prix public actuel, cible, date de la dernière nouveauté. Tableau comparatif sourcé.
2. Menaces : WP Umbrella, ManageWP, MainWP, Little Warden, Peec AI, Profound ou Cloudflare
   ont-ils annoncé ou livré depuis 2025 une fonction de contrôle des robots IA ? Avec lien et date.
3. Ce que les clients de ces outils louent et reprochent (avis G2, Capterra, Trustpilot,
   forums), surtout les avis à 3-4 étoiles.
4. Positionnement et prix : comment chacun se présente (titre de page d'accueil, promesse),
   et où se situent nos prix (39 / 99 / 249 €) face aux leurs, par site surveillé.
5. Espace libre : ce qu'aucun ne fait encore pour une agence française, et combien de temps
   un concurrent mettrait à le copier (avec justification).

Livrable : tableau comparatif, carte de positionnement (deux axes proposés et justifiés),
liste des menaces datées, 3 angles de différenciation avec niveau de confiance,
et la liste de ce qui contredit l'analyse du 24/09.
```

---

## Ordre conseillé et exploitation

| Quand | Prompt | Skill pour exploiter le rapport |
|---|---|---|
| Avant le déploiement | P1 | `resend-email-best-practices`, `emails` |
| Avant le déploiement | P2 | `analytics`, `stripe-stripe-best-practices` |
| Avant le déploiement | P3 | `cold-email` (partie légale) |
| Pendant le déploiement | P4 | `seo-audit`, `schema`, `ai-seo`, `programmatic-seo` |
| Pendant le déploiement | P5 | `launch`, `social` |
| Prod en mode test | P6 | `community-marketing`, `customer-research`, `onboarding` |
| Prod en mode test | P7 | `customer-research`, `copywriting`, `product-marketing` |
| Après retours testeurs | P8 | `directory-submissions`, `launch`, `competitors` |
| Après retours testeurs | P9 | `community-marketing`, `social` |
| Dès le SIREN | P10 | `prospecting`, `cold-email` |
| Baromètre prêt | P11 | `public-relations`, `content-strategy` |
| Avant de réécrire la landing | P12 | `competitor-profiling`, `competitors`, `product-marketing` |

Après chaque recherche : mettre à jour `.agents/product-marketing.md` (skill `product-marketing`) avec ce qui est confirmé, et noter la source.
