# Decelio — Plan marketing v1

**Préparé par :** session « lancement, business, marketing » (Claude Code, skill `marketing-plan`)
**Pour :** le fondateur
**Date :** 28/09/2026
**Statut :** en cours. Sections 2 à 5 validées par le fondateur. Sections 6 à 13 et le résumé (section 1) à venir.

Plan en 13 sections, structuré par étape du tunnel (acquisition, activation, rétention, recommandation, revenu). Les demandes qui en découlent pour les agents Ingénierie et Design sont dans `docs/marketing/demandes-aux-agents.md`.

**À savoir avant de lire :** l'application n'est pas encore déployée, l'entreprise est en cours de création (SIREN attendu) et aucun compte de marque n'existe. Le plan suit trois temps : préparer et valider, puis créer les comptes quand `contact@decelio.fr` fonctionne, puis publier quand le site est en ligne.

---

## 2. Cadre stratégique

*Statut : validé par le fondateur le 28/09/2026, avec élargissement de la cible (voir « Pour qui »).*

### Decelio en une phrase

Decelio vérifie chaque jour si les robots de ChatGPT, Claude et Perplexity peuvent lire les sites qu'une agence maintient. En cas de blocage, il alerte l'agence avec la cause et le correctif, et lui fournit chaque mois un rapport à sa marque pour le montrer au client.

Promesse publique (`.claude/product-marketing.md`) : « Sachez avant votre client si ChatGPT, Claude ou Perplexity ne peuvent plus lire son site. Et prouvez-lui chaque mois que vous veillez. »

### La catégorie que nous revendiquons

**La surveillance de la lisibilité IA d'un portefeuille de sites.** Ce n'est ni un « outil GEO », ni un « scanner ».

Nous ne créons pas une catégorie de zéro. Nous prenons une place précise entre deux catégories qui existent déjà :

- **Les outils de maintenance WordPress** (WP Umbrella, ManageWP, MainWP) ont le multi-clients, les alertes et la marque blanche, mais aucun contrôle des robots IA.
- **Les outils de visibilité IA** (Profound, Peec AI, Otterly, BabyLoveGrowth) mesurent si une marque est *citée*. Ils sont chers, centrés sur les citations, et aucun ne surveille chaque jour, site par site, ce qui empêche un robot de lire la page.

Decelio se présente comme **le complément technique** de ces outils, pas comme leur concurrent : « Vos outils disent si le client est cité. Decelio vous alerte le jour où un pare-feu ou un plugin l'empêche de l'être. » (`docs/06-kit-prospection.md`, séquence SEO/GEO, J+4).

**Ce que nous ne revendiquons jamais :** la mesure des citations, la part de voix, la présence dans les réponses. C'est le positionnement abandonné au pivot. Il revient régulièrement par erreur dans les textes (`llms.txt`, page d'accueil) et doit être traqué à chaque publication.

**Nouveau concurrent à surveiller : BabyLoveGrowth.ai.** Sa formule agence (dès 99 $ par site et par mois) est la plus proche de la nôtre. Il vend déjà un « audit GEO » technique aux agences, mais pas de contrôle quotidien du `robots.txt` par robot ni d'alerte de régression (à vérifier). Notre défense ne tiendra pas sur la détection seule, qui se copie en quelques semaines. Elle tient sur trois points : **la cause précise avec le correctif pas à pas**, **le rapport client en français à la marque de l'agence**, et **la distribution** (baromètre, communautés WordPress et SEO françaises).

### Pour qui (profil client, en bref)

**Décision du fondateur (28/09) : la cible est toute agence ou freelance qui maintient des sites clients ou fait leur SEO de façon récurrente, quel que soit l'outil** (WordPress, Wix, Shopify, Webflow, PrestaShop, sites sur mesure). L'analyse du 24/09 excluait Wix, Shopify et les agences no-code. Cette exclusion est levée.

Ce qui change, et ce qui ne change pas :
- **Le message et le site s'adressent à toutes les agences web et SEO**, sans nommer un seul outil comme condition.
- **La prospection active commence là où le problème est le plus fréquent.** Wix, Shopify, Webflow et Framer laissent passer les robots IA par défaut, et l'agence ne contrôle pas le pare-feu de l'hébergeur : un blocage y est probablement plus rare que sur WordPress (Cloudflare, Wordfence, hébergeurs). La règle du kit de prospection s'applique telle quelle : on n'écrit à une agence que si l'un de ses sites a un problème vérifié. Le tri se fait donc par les faits, pas par l'outil.
- **Le baromètre v2 le mesurera.** Le lot « agences » inclura des sites Wix, Shopify et Webflow, et on comparera le taux de problèmes vérifiés par plateforme (la détection de plateforme existe déjà dans le scanner). Si un segment montre autant de problèmes que WordPress, il passe en priorité.

- **Cible A, agences de maintenance WordPress** (note 19/25) : 1 à 10 personnes, 20 à 150 sites sous contrat mensuel, facturés 30 à 500 € par site. Outils : WP Umbrella, ManageWP, Wordfence, Cloudflare, o2switch, Hostinger. Persona : **Sophie**, freelance, 45 sites, présente sur WP Marmite et les groupes Facebook WordPress.
- **Cible B, agences SEO/GEO** (note 18/25) : 1 à 15 personnes, 15 à 60 clients en abonnement, qui vendent déjà du « référencement IA » de 800 à 5 000 € par mois sans outil de preuve technique. Persona : **Julien**, fondateur d'une agence de 3 personnes à Lyon, présent à SEOCamp et dans les groupes LinkedIn SEO.
- **Problème exprimé :** « Je ne peux pas vérifier 60 sites à la main. » « Je ne sais pas packager le GEO. »
- **Problème réel :** le risque de perdre un contrat quand le client découvre avant l'agence qu'une IA ne peut plus lire son site. Et le besoin d'un livrable mensuel qui justifie le prix du contrat.
- **Ce qu'ils achètent vraiment :** de la tranquillité, et une ligne de plus dans le rapport mensuel, **refacturable 10 à 20 € par site**. L'agence gagne de l'argent avec Decelio : c'est l'argument central.
- **Cible C, agences web et SEO sur d'autres plateformes** (Wix, Shopify, Webflow, PrestaShop) : même profil que A et B (portefeuille récurrent, décideur joignable). Pas encore notée : le baromètre v2 donnera la fréquence réelle du problème.
- **Hors cible :** freelances sans clients récurrents, sites qui veulent bloquer les IA (presse, contenus payants), grandes agences avec leur propre outillage. Ces exclusions ne dépendent pas de l'outil utilisé, elles restent.

### La qualité du marché : taille × fréquence du problème

Pour un seul site, un blocage est un événement **moyen et intermittent** : une mise à jour de plugin, un réglage Cloudflare. Mais nous vendons au **portefeuille**. Sur 30 à 150 sites, la probabilité qu'au moins un soit bloqué à un instant donné est élevée.

Le baromètre v1 (250 grands sites français de médias et d'e-commerce, scannés le 27/09) le confirme : **29 % bloquent PerplexityBot, 18 % OAI-SearchBot, 12 % Claude-SearchBot**, en grande majorité par une règle écrite dans `robots.txt` (preuve certaine, pas un simple indice).

Cela place Decelio dans le bon quadrant : **problème important, fréquent à l'échelle d'un portefeuille.**

**Réserve à ne pas masquer :** cet échantillon est composé de médias et d'e-commerce, **pas de sites clients d'agences WordPress ou SEO**. Le lot « agences » (42 domaines, `docs/barometre/echantillon-v2.md`) est prêt mais n'a pas été scanné. Le critère d'arrêt fixé par le fondateur (`docs/05-analyse-strategique.md` §13) reste valable : si moins de 5 % des sites de la cible ont un problème *vérifié*, on bascule sur le plan B (visibilité IA). Cette mesure passe en premier dans le plan de 90 jours (§9) et en tête des décisions ouvertes (§13).

### La logique économique

- **Abonnement mensuel par nombre de sites surveillés.** Freelance 39 € (10 sites), **Agence 99 € (30 sites, recommandé)**, Studio 249 € (100 sites), puis 2 € par site au-delà. Essai gratuit de 14 jours. Porte d'entrée : le diagnostic gratuit, sans compte.
- **Offre fondatrice :** −50 % à vie pour les 10 premières agences, contre un retour écrit mensuel et l'autorisation de citer l'agence. Coupon Stripe `FONDATEUR50`, plafonné à 10 utilisations.
- **Économie unitaire (hypothèses, rien n'est mesuré) :** revenu moyen par agence ≈ 110 €/mois, résiliation ≈ 4 %/mois, valeur vie client ≈ 2 600 €, coût d'acquisition maximal ≈ 870 € pour un ratio de 3 pour 1. Coût de service < 5 € par agence, marge brute > 90 %.
- **Thèse de canal qui se cumule :**
  1. Le **baromètre** attire l'attention (presse, liens, LinkedIn).
  2. La **prospection écrite appuyée sur un constat vérifié** convertit.
  3. Le **rapport mensuel à la marque de l'agence** retient le client, en créant de la valeur visible chaque mois, même quand rien ne casse.
- **Risque n°1 : la résiliation « assurance ».** Après trois mois sans incident, l'agence se demande pourquoi elle paie. Le rapport mensuel y répond.

### Voix de marque (non négociable)

Ces règles viennent de `docs/08-constitution.md` et de `.claude/product-marketing.md`. Toutes les autres sections du plan les respectent, y compris les publicités futures, les posts et les e-mails.

**OUI :**
- Français simple, sans jargon, à la 1re personne du pluriel (« nous ») ou à l'impératif.
- Tout terme technique (`robots.txt`, pare-feu, User-Agent) est expliqué en une phrase à côté.
- « À vérifier » quand un signal ne permet pas de conclure.
- « Requête non vérifiée se présentant comme GPTBot » pour une sonde imitée.
- « En préparation » pour toute fonction non livrée.
- « Quotidien » et « à chaque scan », jamais « temps réel ».
- Chaque chiffre publié avec son dénominateur et sa date.

**NON :**
- Jamais « ce que voit GPTBot », « avec preuve à l'appui » pour une sonde, « simulant les vrais robots ».
- Aucun faux chiffre, faux témoignage, faux logo, faux badge (« le plus choisi », « fortement demandé »). Le produit n'a pas encore de clients.
- Aucune promesse de mesure des citations ou de la part de voix.
- Aucun score unique qui mélange robots d'entraînement et robots de citation, ou `robots.txt` et dépendance au JavaScript.
- Aucun appel, aucune démo en direct : la vente et l'onboarding sont 100 % écrits.
- Aucun site nommé comme fautif en public sans son accord écrit.
- Aucun script ou CDN tiers sur une page publique : cela transmettrait l'IP du visiteur à un tiers.
- Aucune dépense sans l'avoir signalée d'abord : budget 0 € tant que le revenu ne la couvre pas.

**Identité publique (décision du 28/09) :** la marque parle en son nom. Les comptes publics sont des comptes **Decelio** (page LinkedIn entreprise, comptes de marque, signature « L'équipe Decelio »). Le nom du fondateur n'apparaît que là où la loi l'impose : mentions légales, CGV, Stripe, registre du domaine.

Ce choix a un coût, nommé ici pour qu'il soit assumé : en B2B, les petites agences achètent souvent parce qu'elles voient une vraie personne derrière un petit outil, et un e-mail signé d'un prénom obtient en général plus de réponses qu'un e-mail d'équipe. Deux conséquences :
- la page « Qui est derrière Decelio » (T067), déjà en ligne sur `main`, est à relire à la lumière de ce choix ;
- la signature des e-mails de prospection sera testée (§4), et l'arbitrage reste une décision ouverte (§13).

---

## 3. État des lieux

*Statut : validé par le fondateur le 28/09/2026. Noté à partir des documents du dépôt (aucun audit chiffré antérieur).*

**Point de départ réel (précisé par le fondateur le 28/09) :** l'application n'est pas déployée, on est en pré-déploiement. L'entreprise est en cours de création : les documents légaux sont déposés, le SIREN n'est pas encore attribué. **Aucun compte d'entreprise ni de marque n'existe** (réseaux sociaux, annuaires, communautés, boîte mail de marque). Seuls existent les comptes techniques de développement cités dans `docs/REPRISE.md` (Stripe en mode test, Resend, Neon, Render, PostHog). Le fondateur veut **valider tout le volet marketing avant de créer quoi que ce soit**. Le plan suit donc trois temps : préparer et valider, puis créer, puis publier (§4, §9).

### Équipe (qui touche au marketing)

| Qui | Rôle | Surface marketing |
|---|---|---|
| Fondateur | Seul humain du projet : produit, décisions, validations, fusions | Tout : décide, valide, crée les comptes, envoie. Profil technique, marketing « tactique par nécessité ». Veut rester en retrait de la marque publique. |
| Agent Design (Claude Code) | Pages marketing, composants, `globals.css` | Page d'accueil, page de prix, pages publiques. Occupé par le lancement technique. |
| Agent Ingénierie (Claude Code) | `lib/`, API, base, Inngest, CI | E-mails transactionnels, suivi PostHog. Occupé par le déploiement et les tests de bout en bout. |
| Session lancement (celle-ci) | Business, marketing, création de comptes | Ce plan, les textes, les listes de prospection, la préparation des comptes. |

**Manque principal :** personne ne fait le marketing à plein temps, et le fondateur ne veut pas être la voix publique. Toute la diffusion repose donc sur la marque Decelio et sur des tâches que le fondateur peut exécuter en peu de temps (copier-coller un texte préparé, créer un compte, valider un envoi).

**Premier recrutement :** pas avant un revenu récurrent qui le finance. Quand ce sera le cas, le premier profil utile est un freelance marketing de contenu et de croissance à temps partiel, pas un « directeur marketing » (§10).

### Budget marketing actuel

| Poste | Montant |
|---|---|
| Publicité payante | 0 € |
| Outils | 0 € (offres gratuites autorisant l'usage commercial uniquement) |
| Prestataires | 0 € |
| Salaires | 0 € |
| **Total** | **0 €/mois**, règle ferme, pas un point de départ |

- **Coût d'acquisition réel :** inconnu, aucun client. C'est la première décision ouverte (§13).
- **Palier :** « pré-amorçage autofinancé », et même en dessous (la fourchette habituelle va de 0 à 2 000 € par mois).
- **Conséquence :** tout le plan de 90 jours doit produire des résultats sans aucune dépense. Une dépense n'est proposée qu'une fois couverte par le revenu, et toujours signalée avant.

**Seule dépense déjà engagée à connaître :** le nom de domaine `decelio.fr` (OVH), acheté le 26/09.

### Stade de croissance

**0 € de revenu, avant lancement.** On est au tout début de la phase « 0 à 10 000 € de revenu annuel », la plus ingrate : chaque client se gagne un par un, à la main. La contrainte qui bloque tout à ce stade n'est ni l'acquisition ni la conversion, mais **la preuve** : que la cible a vraiment le problème, puis que 10 agences paient.

### Ce qui est déjà fait (à reconnaître et à réutiliser)

| Élément | État | Levier marketing |
|---|---|---|
| Analyse stratégique (`docs/05`) | Faite le 24/09, mise à jour le 28/09 | Base de tout le plan : cible, prix, concurrence, message |
| Contexte marketing (`.claude/product-marketing.md`) | v2 du 28/09 | Lu par tous les skills marketing du dépôt |
| Kit de prospection (`docs/06`) | Rédigé : 2 séquences de 3 e-mails, objections, questionnaire | Prêt à l'emploi dès que les e-mails peuvent partir |
| Baromètre v1 (`docs/barometre/resultats-v1.md`) | **Scanné, non publié** : 250 grands sites médias et e-commerce | Contenu presse et LinkedIn, avec de vrais chiffres |
| Page d'accueil | Refondue, auditée, données structurées ajoutées | Prête, pas encore en ligne |
| Diagnostic gratuit + export PDF | Construit | Porte d'entrée, sans compte |
| Rapport mensuel en marque blanche | Construit | Argument anti-résiliation n°1, démo écrite |
| Essai gratuit 14 jours, coupon fondateur | Construits (Stripe mode test) | Offre de lancement |
| E-mails automatiques (alertes, rapport, questionnaire J+3, offre fondatrice) | Construits | Bloqués par le domaine |
| Pages légales, page « Qui est derrière Decelio » | En ligne sur `main` | À relire : SIREN manquant, choix d'identité publique |
| Suivi PostHog du tunnel | Branché, par notre propre domaine | Mesure prête dès le premier visiteur |

### En cours (préparé mais pas lancé)

| Élément | État | Ce qui bloque |
|---|---|---|
| Vérification du domaine chez Resend | Enregistrements saisis chez OVH | Propagation DNS (déjà plus de 48 h) |
| Mise en ligne de l'application | Prête côté code | Test complet en local, puis déploiement (autres agents) |
| Webhook Stripe de production, Stripe en réel | À faire | Déploiement (autres agents) |
| Baromètre v2 (agences) | Liste de 42 domaines prête, **pas scannée** | Rien : peut être lancé tout de suite |
| Publication du baromètre v1 | Chiffres prêts | Pas de site en ligne où le publier |

### Ce qui coince (à débloquer ce trimestre)

| Problème | Coût si on ne fait rien | Action |
|---|---|---|
| On ne sait pas encore si **la cible** a le problème | On prospecte à l'aveugle ; risque de découvrir trop tard qu'il faut pivoter | Scanner le lot « agences » tout de suite (§9, semaine 1) |
| Aucune présence publique | Au lancement, personne ne peut vérifier que Decelio existe | Créer les comptes de marque maintenant, sans attendre le domaine (§4) |
| Le fondateur ne veut pas être la voix publique | Moins de confiance et moins de réponses en prospection | Signature « L'équipe Decelio », tester la signature (§4, §13) |
| Tous les e-mails dépendent du domaine | Aucun envoi possible | Tout préparer pour envoyer le jour même où le DNS passe ; vérifier la propagation régulièrement |
| SIREN non reçu | Pages légales incomplètes | Décision prise : lancer avec « SIREN en cours d'attribution » |

### Grille des 17 points (notée d'après les documents)

| # | Domaine | Note /5 | Commentaire |
|---|---|---|---|
| 1 | Positionnement | 3 | Clair et écrit, mais l'ancien positionnement « visibilité de marque » revient régulièrement dans les textes. Le choix d'identité publique n'est pas encore reflété partout. |
| 2 | Connaissance client | 3 | Recherche récente et solide, deux personas, grille de qualification. Aucune conversation client réelle encore. |
| 3 | Page d'accueil | 3 | Refondue et auditée, mais pas en ligne : aucune donnée de conversion. |
| 4 | Pages produit et prix | 3 | Prix clairs et honnêtes. L'argument « refacturez 10 à 20 € par site » reste à confirmer dans le texte. |
| 5 | Pages de conversion | 1 | Seul le diagnostic public existe. Pas de page par cible, pas de page baromètre. |
| 6 | Comparaison concurrents | 1 | Un tableau sur la page de prix, aucune page « Decelio ou WP Umbrella ». |
| 7 | Contenus | 1 | Rien de publié. Le baromètre est un vrai atout, mais pas encore sorti. |
| 8 | Onboarding | 3 | Construit sur de vraies données. Pas de mesure réelle. |
| 9 | E-mails automatiques | 2 | Tous construits, aucun ne peut partir (domaine). |
| 10 | Supports de vente | 3 | Kit écrit complet et adapté à une vente sans appel. |
| 11 | Messages et voix | 4 | Voix documentée et contrôlée par audit. L'honnêteté de la mesure est un vrai trait distinctif. |
| 12 | Prix | 3 | Structure raisonnée face au marché. Économie unitaire non mesurée. |
| 13 | Optimisation de conversion | 0 | Pas de trafic, normal à ce stade. |
| 14 | Lancements | 1 | Aucun lancement fait, mais le baromètre est prêt. |
| 15 | Publicité | 0 | Budget 0 € voulu, pas une faiblesse. |
| 16 | Référencement | 0 | Domaine pas encore en ligne. |
| 17 | International | 0 | France d'abord, choix assumé. |

**Total : 31/85.**

**Lecture :** c'est un profil « avant marketing » inhabituellement solide. D'ordinaire, une jeune entreprise qui n'a ni référencement, ni publicité, ni lancement a aussi un positionnement flou. Ici, le positionnement, la voix et les prix sont déjà à 3–4, parce que la recherche et l'audit d'honnêteté ont été faits avant d'écrire la moindre publicité. Le plan n'a donc pas à tout inventer. Il doit **publier ce qui existe** (baromètre, pages par cible, e-mails), **ouvrir les comptes publics**, et **lever la seule vraie inconnue** : la fréquence du problème chez les agences. L'acquisition (§4) et les décisions ouvertes (§13) sont les sections les plus lourdes du plan.

---

## 4. Acquisition — comment des inconnus découvrent Decelio

*Statut : validé par le fondateur le 28/09/2026.*

**Décisions prises à la validation :**
- La page LinkedIn entreprise est créée depuis le profil LinkedIn personnel du fondateur (les administrateurs ne sont pas affichés sur la page).
- Signature des e-mails de prospection : **« L'équipe Decelio »**. Pas de test avec un prénom.
- YouTube, Instagram et TikTok : pas maintenant, mais prévus plus tard (A9).

### Où on en est

Rien n'est public : ni site, ni compte, ni contenu. En revanche, l'essentiel de la matière existe déjà : le baromètre v1, le kit de prospection, la page d'accueil auditée, le diagnostic gratuit, le rapport en marque blanche. L'acquisition ne demande donc pas d'inventer, mais de **valider, puis ouvrir, puis publier**, dans cet ordre.

### Les trois temps, et ce qui fait passer de l'un à l'autre

| Temps | Condition pour y entrer | Ce qu'on fait | Ce qu'on ne fait pas |
|---|---|---|---|
| **1. Préparer et valider** | Maintenant | Scanner les agences (baromètre v2), écrire et valider le kit de marque, les textes de chaque compte, les pages, les e-mails, la liste de prospects | Créer un compte, publier quoi que ce soit |
| **2. Créer les comptes** | Le DNS de `decelio.fr` fonctionne et la boîte `contact@decelio.fr` reçoit du courrier | Ouvrir les comptes avec l'adresse de marque, remplir les profils avec les textes validés | Publier, prospecter, s'inscrire dans les annuaires |
| **3. Publier** | L'application est en ligne sur `decelio.fr`, le diagnostic gratuit marche, Stripe est en mode réel | Baromètre, annuaires, prospection, contenus | — |

**Pourquoi attendre la boîte mail pour créer les comptes :** chaque compte ouvert avec ton adresse personnelle te relierait publiquement à la marque, et serait pénible à transférer ensuite. Avec `contact@decelio.fr`, tout appartient à Decelio dès le départ. L'offre MX Plan, incluse avec le domaine OVH, fournit cette boîte gratuitement. Pas de conflit avec Resend : Resend utilise le sous-domaine `send.decelio.fr`, la boîte mail utilise le domaine principal.

**Pourquoi attendre le site pour publier :** un compte qui renvoie vers un site vide ou en erreur gâche la première impression, et les annuaires refusent ou pénalisent un produit qui n'est pas accessible (skill `directory-submissions`, règle 1).

### Les actions

Chaque action indique : son temps, son mécanisme, son indicateur, son critère d'arrêt, et le skill qui l'exécute.

#### A1. Scanner les agences : baromètre v2 — **temps 1, en premier**

- **Quoi :** scanner les sites *clients* des agences (les « réalisations » affichées sur leurs sites), pas seulement le site de l'agence. Partir du lot de 42 agences (`docs/barometre/echantillon-v2.md`), avec 5 à 10 sites clients chacune, soit environ 200 à 400 sites. **Inclure des agences Wix, Shopify et Webflow**, suite à l'élargissement de la cible.
- **Pourquoi en premier :** c'est la seule action qui dit si le plan tient. Elle ne demande ni domaine, ni compte, ni site en ligne : le scanner tourne en local, sans base de données, comme pour le pilote du 27/09.
- **Ce qu'elle produit :** (1) le taux de problèmes **vérifiés** par plateforme (WordPress, Wix, Shopify…) ; (2) la première liste de prospects qualifiés, chaque constat vérifié devenant un e-mail individuel (A7) ; (3) un deuxième volet du baromètre, cette fois sur la cible.
- **Indicateur :** part des sites avec un problème vérifié à la main (cause identifiée, capture datée).
- **Critère d'arrêt (fixé par le fondateur, `docs/05` §13) :** moins de 5 % de problèmes vérifiés sur la cible, et on passe au plan B (visibilité IA).
- **Skills :** `prospecting` (constituer et qualifier la liste), `customer-research`.
- **Qui :** cette session prépare la liste et le script, le fondateur valide avant le lancement.
- **Règles :** politesse réseau identique au pilote (3 s entre deux sites, User-Agent honnête `DecelioBot`) ; aucun site nommé en public comme fautif.

#### A2. Kit de marque à valider — **temps 1**

Un seul document, à valider une fois, qui sert ensuite pour chaque compte et chaque annuaire :
- nom et identifiant voulu (`decelio` partout si disponible, à vérifier avant la création) ;
- accroche en moins de 10 mots, description de 60 caractères, description de 150 mots ;
- **plusieurs variantes** selon le type de support (annuaire startup, annuaire SaaS, réseau professionnel) : les annuaires et les moteurs IA pénalisent un texte copié partout à l'identique ;
- bio de chaque réseau ;
- logo en PNG, SVG, carré 1024 × 1024 et favicon (le logo existe, il faut vérifier les formats) ;
- 5 à 8 vraies captures de l'application (prises en local, avant le déploiement) ;
- optionnel : une vidéo de 60 à 90 secondes, enregistrée depuis l'écran, sans voix et sans visage.

**Skills :** `product-marketing`, `copywriting`, `copy-editing`, `directory-submissions` (variantes de positionnement), `social`.

#### A3. Les comptes à créer — **préparés au temps 1, créés au temps 2**

**Prérequis, avant tout compte :**
1. La boîte `contact@decelio.fr` (MX Plan OVH, gratuite).
2. Un gestionnaire de mots de passe gratuit, avec double authentification activée sur chaque compte.

| Compte | Pourquoi | Priorité | Contrainte à connaître |
|---|---|---|---|
| **Page LinkedIn entreprise « Decelio »** | La cible SEO/GEO est sur LinkedIn. Canal principal du baromètre. | Haute | LinkedIn exige un profil personnel pour créer et gérer une page. **Décidé :** la page est créée depuis le profil personnel du fondateur ; les administrateurs ne sont pas affichés sur la page. |
| **Compte X / Twitter `@decelio`** | Une partie de la communauté SEO française y est active. Utile pour la veille et les réponses. | Moyenne | Compte de marque autorisé, aucune contrainte particulière. |
| **Compte Reddit de marque** | r/SEO, r/Wordpress, r/webdev : questions fréquentes sur les robots IA. | Basse | Les règles de ces communautés interdisent l'autopromotion : il faut participer utilement longtemps avant de citer Decelio. |
| **Page Facebook « Decelio »** | Seulement pour exister auprès des groupes WordPress FR. | Basse, conditionnelle | Les groupes acceptent rarement une page. La participation y est surtout personnelle. |
| **Communautés WordPress et SEO FR** (WP Marmite, groupe Facebook WordPress France, WebRankInfo, SEOCamp) | C'est là que se trouvent Sophie et Julien (§2). | À décider | **La participation y est personnelle par nature.** Une marque seule y est peu crue, et SEOCamp est une adhésion payante (à vérifier). Voir le compromis en §13. |
| **Annuaires** (liste dans `directory-submissions/references/directory-list.md`, gratuits uniquement) | Liens entrants, citations par les IA, découverte. | Temps 3 seulement | Le site et les pages de destination (A4) doivent être en ligne avant. |
| **Product Hunt, Indie Hackers** | Marché anglophone, une seule fois, après le baromètre. | Plus tard (T2) | Product Hunt affiche le profil personnel du « maker ». Conflit direct avec le choix d'identité. |

**Pas maintenant :** fiche Google Business (pas de commerce local, inutile). YouTube, Instagram et TikTok sont prévus plus tard (A9) ; réserver les identifiants `decelio` dès le temps 2 évite qu'ils soient pris d'ici là.

**Livrable :** pour chaque compte, une fiche prête à copier-coller (nom, identifiant, bio, lien, catégorie, visuel), validée par toi avant la création.

#### A4. Les pages de destination — **temps 1 pour les textes, intégrées par l'agent Design**

Les annuaires et les réseaux envoient du trafic ; il faut des pages qui le convertissent (skill `directory-submissions`, règle 2). Les textes sont écrits dans cette session. Leur intégration dans `app/(marketing)/` revient à l'agent Design, qui possède ces fichiers.

- **Pages par cible :** agences de maintenance WordPress, agences SEO/GEO, agences Wix / Shopify / Webflow.
- **Pages de comparaison honnêtes :** Decelio ou Cloudflare AI Crawl Control ; Decelio ou WP Umbrella / ManageWP ; Decelio et les outils de citation (Peec AI, Otterly, BabyLoveGrowth), présentés comme **complémentaires**. Aucune fausse affirmation sur un concurrent ; ce qui n'est pas vérifié est marqué « à vérifier ».
- **Page `/barometre`** : chiffres réels, dénominateur et date à côté de chaque chiffre, méthode et limites.
- **Skills :** `competitors`, `competitor-profiling`, `copywriting`, `schema`, `ai-seo`.

#### A5. Contenus pour le référencement et les IA — **rédaction au temps 1, publication au temps 3**

Cinq articles de départ, qui répondent aux questions que la cible tape vraiment :
1. « Cloudflare bloque-t-il ChatGPT sur votre site ? »
2. « Wordfence et les robots IA : ce qu'il faut régler »
3. « GPTBot, OAI-SearchBot, ChatGPT-User : lequel autoriser ? »
4. « Checklist technique GEO pour une agence »
5. **Nouveau, suite à l'élargissement :** « Votre site Wix ou Shopify est-il lisible par ChatGPT ? »

- **Rythme réaliste pour un fondateur seul :** 2 articles par mois après les 5 premiers.
- **Prérequis technique :** une section blog sur le site. À demander à l'agent Design, car elle n'existe pas aujourd'hui.
- **Indicateur :** pages indexées, puis requêtes qui amènent des visites (PostHog, Search Console).
- **Skills :** `content-strategy`, `content-research-writer`, `ai-seo`, `seo-audit`, `schema`.

#### A6. Publier le baromètre — **temps 3**

- La page `/barometre`, un post sur la page LinkedIn Decelio, puis un envoi individuel aux médias cités dans `docs/05` §10.1 (JDN, BDM, Presse-citron, WebRankInfo, r/SEO). L'envoi se fait à la main depuis `contact@decelio.fr`.
- **Angle d'accroche, désormais mesurable grâce à A1 :** « Les sites que gèrent les agences web sont-ils lisibles par ChatGPT ? », en complément des chiffres médias et e-commerce déjà en main.
- **Indicateur :** au moins 5 liens entrants de qualité et 300 diagnostics gratuits (objectif de `docs/05` §11). En dessous, on n'insiste pas avec ce format.
- **Skills :** `public-relations`, `social`, `launch`.

#### A7. Prospection écrite appuyée sur un constat vérifié — **temps 3**

- **Volume :** 150 agences en 8 semaines, venues du baromètre v2 (A1) puis des sources de `docs/06` §1.
- **Envoi :** **à la main, depuis `contact@decelio.fr`**, 10 à 20 e-mails par jour au maximum. **Jamais par Resend ni par l'application** : les conditions d'utilisation de Resend interdisent la prospection à froid et prévoient la suspension du compte, ce qui couperait aussi les alertes des clients.
- **Cadre légal (CNIL, prospection entre professionnels) :** pas besoin de consentement préalable si le message concerne l'activité professionnelle du destinataire, est envoyé à son adresse professionnelle nominative, identifie clairement l'expéditeur et offre un moyen simple de refuser les prochains messages. Chaque e-mail porte donc un lien vers les mentions légales et une phrase de désinscription. Les données de prospection sont supprimées 3 ans après le dernier contact. *À faire relire si tu as un doute juridique : ce plan n'est pas un avis d'avocat.*
- **Textes :** séquences déjà rédigées dans `docs/06` (J0, J+4, J+9), à mettre à jour pour la cible élargie et pour la signature de marque.
- **Signature :** « L'équipe Decelio » (décision du fondateur). Pour compenser l'absence de prénom, l'e-mail doit sonner humain par son contenu : constat précis sur un site de l'agence, ton direct, une seule question. Si le taux de réponse passe sous le critère d'arrêt, la signature sera l'une des premières pistes à réexaminer.
- **Indicateurs :** taux de réponse, puis essais démarrés. **Critère d'arrêt (fixé dans `docs/06`) :** moins de 3 % de réponses sur 100 envois, et on revoit le message ou la cible avant de continuer.
- **Skills :** `prospecting`, `cold-email`, `marketing-psychology`, `copy-editing`.

#### A8. Plus tard (après les 90 jours)

- **Extension WordPress gratuite (WordPress.org)**, en lecture seule, qui vérifie la configuration locale et renvoie vers Decelio : un canal de découverte fort pour la cible A, mais du développement (agent Ingénierie).
- **Product Hunt et Indie Hackers**, une seule fois, pour le marché anglophone.
- **Extension Chrome :** 5 $ d'inscription, donc une dépense à signaler. Pas avant un revenu.

#### A9. Vidéo courte : YouTube d'abord, puis Instagram et TikTok — **plus tard (T2)**

- **Idée du fondateur :** des shorts faits avec l'IA, qui ne montrent que le logiciel, sans visage ni voix du fondateur. Compatible avec le choix d'identité publique.
- **Pourquoi YouTube en premier :** c'est aussi un moteur de recherche, et les assistants IA citent souvent des vidéos YouTube. Instagram et TikTok touchent moins la cible (agences B2B), donc on les ajoute en réutilisant les mêmes vidéos, sans production spécifique.
- **Formats :** « un blocage en 30 secondes » (un vrai cas anonymisé : le symptôme, la cause, le correctif) ; « ce que dit le baromètre » (un chiffre, son dénominateur, sa date) ; démo du rapport mensuel.
- **Règle non négociable :** chaque écran vient d'un vrai scan. L'IA peut monter, sous-titrer et faire la voix de synthèse, jamais inventer un résultat, un chiffre ou un client. Aucun site client nommé sans accord écrit.
- **Un effort, plusieurs usages :** la même vidéo sert de démo pour les annuaires (A2) et la page d'accueil.
- **Coût :** 0 € si l'outil de montage est gratuit et autorise l'usage commercial ; toute dépense est signalée avant.
- **Condition de départ :** le site est en ligne et au moins 10 vrais cas sont disponibles.
- **Skills :** `social`, `copywriting`.

### Ce qu'on ne fait pas, et pourquoi

| Canal | Raison |
|---|---|
| Publicité payante | Budget 0 €. À reconsidérer quand le revenu couvre un test (§10). |
| Achat ou extraction automatique de listes d'e-mails | Interdit par Resend, risqué au regard de la CNIL, et contraire à la règle « un constat vérifié par e-mail ». |
| Outils d'envoi automatisé de prospection | Payants, et inutiles à 10–20 envois par jour. |
| Faux avis, faux témoignages, faux badges | Interdit par la constitution. |
| Vidéo avec visage ou voix du fondateur | Contraire au choix d'identité publique. Les vidéos sans visage (A9) restent prévues. |

### 90 jours (acquisition seulement)

| Semaines | Actions |
|---|---|
| 1–2 | A1 baromètre v2 lancé et vérifié à la main ; A2 kit de marque validé ; fiches de comptes (A3) validées |
| 2–4 | Textes des pages (A4) et des 5 articles (A5) rédigés et transmis à l'agent Design ; dès que le DNS passe : boîte mail puis comptes |
| Dès la mise en ligne | A6 publication du baromètre ; annuaires ; début de A7 (prospection) |
| 5–12 | A7 à 10–20 envois par jour ; 2 articles par mois ; bilan de la semaine 6 : WordPress, SEO/GEO ou autres plateformes, on concentre l'effort sur le segment qui répond le mieux |

### 12 mois

- **T1 :** preuve de la cible, premiers clients, comptes et baromètre en ligne.
- **T2 :** extension WordPress.org, vidéos courtes sur YouTube puis Instagram et TikTok (A9), Product Hunt (si le choix d'identité le permet), deuxième édition du baromètre, pages par plateforme selon les résultats.
- **T3–T4 :** baromètre semestriel devenu une référence, programme partenaires (§7), premier test payant si le revenu le couvre (§10).

### Skills et outils

| Action | Skills du dépôt | Outils (0 €) |
|---|---|---|
| A1 baromètre v2 | `prospecting`, `customer-research` | Scanner Decelio en local, tableur |
| A2 kit de marque | `product-marketing`, `copywriting`, `directory-submissions`, `social` | — |
| A3 comptes | `social`, `community-marketing`, `directory-submissions` | MX Plan OVH, gestionnaire de mots de passe |
| A4 pages | `competitors`, `competitor-profiling`, `copywriting`, `schema`, `ai-seo` | Agent Design |
| A5 contenus | `content-strategy`, `content-research-writer`, `ai-seo`, `seo-audit` | Google Search Console |
| A6 baromètre public | `public-relations`, `launch`, `social` | Page LinkedIn |
| A7 prospection | `prospecting`, `cold-email`, `marketing-psychology`, `copy-editing` | Boîte `contact@decelio.fr`, tableur de suivi |
| Mesure | `analytics` | PostHog (déjà branché) |

---

## 5. Activation : de l'inscription au premier moment utile

*Statut : validé par le fondateur le 28/09/2026. Le diagnostic de portefeuille (A-1) est validé et transmis à l'agent Ingénierie via `docs/marketing/demandes-aux-agents.md`.*

### Le parcours tel qu'il est codé aujourd'hui

1. **Diagnostic gratuit, sans compte** (page d'accueil et `/analyse/[domain]`) : un site à la fois, un verdict par robot avec la cause, export PDF. Suivi PostHog : `scan_completed`.
2. **Inscription** (e-mail et mot de passe, case CGV obligatoire). Suivi : `signup_completed`. Le bouton « Continuer avec Google » n'est pas affiché pour l'instant.
3. **Choix d'une formule, carte bancaire demandée** (Stripe Checkout, essai de 14 jours, ADR-002). Suivi : `checkout_started`, `trial_started`. **Le plan gratuit donne droit à 0 site** : on ne peut rien surveiller sans passer par cette étape.
4. **Ajout des sites** (collage de domaines ou CSV, quota du plan appliqué). Suivi : `site_added`.
5. **Premier scan réel** lancé tout de suite. Suivi : `onboarding_scan_completed`.
6. **Tableau de bord** : état de chaque site, fiche par site avec cause, correctif et plateforme détectée.
7. **E-mails automatiques pendant l'essai :** questionnaire de découverte à J+3 ; rappel de fin d'essai à J-3 (écrit, mais il dépend du webhook Stripe, pas encore enregistré) ; alertes en cas de régression ; rapport mensuel.
8. **Fin de l'essai :** prélèvement automatique, sauf résiliation. Suivi : `trial_converted`.

Tous les e-mails sont bloqués tant que le domaine n'est pas vérifié chez Resend.

### Le moment utile (« aha »)

**L'agence voit, sur ses propres sites, un blocage réel avec sa cause et son correctif, ou la confirmation que tout son portefeuille est lisible, puis un rapport à son logo prêt à envoyer au client.**

Les deux moitiés comptent. Le constat de blocage crée l'urgence. Le rapport crée la valeur récurrente, même quand rien ne casse (§2, risque de résiliation).

**Définition proposée d'une agence « activée » :** essai démarré, **au moins 5 sites ajoutés**, premier scan terminé **dans les 48 h** suivant l'inscription. C'est une hypothèse, à ajuster sur les 20 premiers comptes.

### Ce qui freine, par ordre d'impact

| Frein | Pourquoi | Piste |
|---|---|---|
| **Carte demandée avant d'avoir vu ses propres sites** | L'agence n'a vu que le diagnostic d'un seul site quand on lui demande sa carte. C'est le choix assumé de l'ADR-002 (moins d'inscrits, mais mieux qualifiés, et pas de relances manuelles). | Garder la carte. Mais donner plus de valeur **avant** la carte (A-1 ci-dessous) et rassurer au moment de la demander (A-2). |
| **Aucun e-mail entre l'inscription et J+3** | Il n'existe pas d'e-mail de bienvenue (`docs/REPRISE.md`). Une agence qui abandonne après l'étape carte ne reçoit rien. | A-3 : e-mails d'essai. |
| **Aucun e-mail ne part aujourd'hui** | Domaine pas encore vérifié. | Dépend du DNS (autres agents). |
| **Rappel de fin d'essai non relié** | Pas de webhook Stripe enregistré. Envoyer un prélèvement sans prévenir serait à la fois une perte de confiance et un risque de litige. | À vérifier avant le lancement (autres agents, T074). |
| **Le rapport en marque blanche n'est accessible qu'à partir du plan Agence** | Une agence en essai Freelance ne voit jamais la moitié du moment utile. | A-4 : montrer un rapport d'exemple à tous. |

### Les actions

#### A-1. Plus de valeur avant la carte — *validé par le fondateur, demande D-01 à l'agent Ingénierie*

- **Diagnostic de portefeuille gratuit, sans compte :** jusqu'à 5 sites d'un coup au lieu d'un, avec un récapitulatif « X sites sur 5 ont un point à vérifier ». C'est exactement ce qu'une agence veut savoir avant de payer. La limite de débit existe déjà en base.
- **Pourquoi c'est prioritaire :** c'est le moyen le moins cher de déplacer le moment utile *avant* la carte, sans renoncer à l'ADR-002.
- **Coût :** du développement, pas d'argent. Hors périmètre de cette session : à transmettre à l'agent Ingénierie sous forme de tâche, si tu la valides.
- **Indicateur :** part des diagnostics suivis d'une inscription (objectif du PRD : au moins 10 %).
- **Skills :** `cro`, `lead-magnets`.

#### A-2. Rassurer au moment de la carte — *textes écrits ici, intégrés par l'agent Design*

À côté du bouton de paiement, trois phrases vraies, sans pression :
- « Rien n'est prélevé avant le [date de fin d'essai]. »
- « Nous vous prévenons par e-mail 3 jours avant. » *(à n'afficher qu'une fois le rappel relié au webhook Stripe : sinon, promesse non tenue)*
- « Résiliable en deux clics depuis votre espace. »

**Skills :** `signup`, `cro`, `copywriting`, `marketing-psychology`.

#### A-3. Les e-mails d'essai — *textes écrits ici, envoi par l'agent Ingénierie*

| Moment | E-mail | Existe ? |
|---|---|---|
| J0, après l'inscription | Bienvenue : 3 étapes pour tirer parti de l'essai (ajouter ses sites, lire la première fiche, générer un rapport) | **Non, à créer** |
| J0, si la carte n'a pas été saisie dans l'heure | « Votre compte est prêt, il reste une étape » : lien direct vers le choix de formule, sans insister | **Non, à créer** |
| J+1 | Résultat du premier scan de tout le portefeuille, en une phrase et un lien | **Non, à créer** |
| J+3 | Questionnaire de découverte (5 questions) | Oui |
| J+7 | « Votre premier rapport client » : générer le rapport, l'envoyer à un client test | **Non, à créer** |
| J-3 avant la fin | Rappel de fin d'essai : date, montant, lien pour résilier | Oui, mais pas encore relié |
| En continu | Alertes de régression | Oui |

- **Règles :** envoyés par Resend (c'est permis : ce sont des e-mails liés au compte, pas de la prospection), signés « L'équipe Decelio », désinscription possible pour tout ce qui n'est pas strictement lié au service.
- **Skills :** `emails`, `onboarding`, `resend-email-best-practices`, `resend-react-email`.

#### A-4. Montrer le rapport à tous — *textes ici, intégration par l'agent Design*

- Un **rapport d'exemple en PDF**, clairement marqué « exemple, client fictif » comme le prévoit le kit de prospection, visible depuis le tableau de bord de chaque compte, y compris au plan Freelance.
- Sur le plan Freelance, un rappel sobre : « Le rapport à votre logo est inclus à partir du plan Agence. » C'est aussi le premier levier de montée en gamme (§8).
- **Skills :** `onboarding`, `copywriting`.

#### A-5. Le questionnaire J+3 devient la porte de l'offre fondatrice — *déjà prévu, à exécuter*

Comme prévu dans `docs/06` §5 : quand au moins 3 réponses montrent un vrai besoin, envoi manuel de l'offre fondatrice (−50 % à vie, 10 places, date limite claire). C'est à la fois un outil de conversion et la source des premières études de cas.

### Mesure (tunnel d'activation dans PostHog)

`scan_completed` → `signup_completed` → `checkout_started` → `trial_started` → `site_added` (≥ 5) → `onboarding_scan_completed` → `trial_converted`

- Tous ces événements existent déjà dans le code.
- **À ajouter** (agent Ingénierie) : un événement quand un rapport est généré ou téléchargé. C'est la seconde moitié du moment utile, et aujourd'hui on ne la voit pas.
- **Objectifs de départ (hypothèses, à corriger après 20 comptes) :** diagnostic → inscription ≥ 10 % (PRD) ; inscription → essai démarré ≥ 50 % ; essai → agence activée ≥ 60 % ; essai → payant, à mesurer, sans objectif inventé.
- **Skill :** `analytics`.

### 90 jours

| Semaines | Action |
|---|---|
| 1–2 | Textes A-2, A-3, A-4 rédigés et validés ; A-1 validé ou écarté par le fondateur, puis transmis à l'agent Ingénierie |
| Avant la mise en ligne | Vérifier que le rappel de fin d'essai part vraiment (webhook Stripe), sinon retirer la phrase « nous vous prévenons » |
| Après la mise en ligne | Lire le tunnel chaque semaine ; corriger d'abord l'étape où l'on perd le plus |
| Semaine 6 | Premier bilan sur les vrais chiffres ; ajuster la définition d'« agence activée » |

### 12 mois

- Inscription avec Google, si le bouton est remis en place (moins de friction).
- Visite guidée dans l'application, seulement si les données montrent que les agences se perdent après l'ajout des sites.
- Réexaminer l'ADR-002 (carte dès le départ) avec les vrais chiffres, comme l'ADR le prévoit déjà.

### Skills et outils

| Action | Skills du dépôt | Qui intègre |
|---|---|---|
| A-1 diagnostic de portefeuille | `cro`, `lead-magnets` | Agent Ingénierie |
| A-2 textes au moment de la carte | `signup`, `cro`, `copywriting`, `marketing-psychology` | Agent Design |
| A-3 e-mails d'essai | `emails`, `onboarding`, `resend-email-best-practices`, `resend-react-email` | Agent Ingénierie |
| A-4 rapport d'exemple | `onboarding`, `copywriting` | Agent Design |
| Mesure | `analytics` | PostHog (déjà branché) |

---

