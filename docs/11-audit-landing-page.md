# Audit de la landing page Decelio

**Date :** 26 septembre 2026
**Périmètre :** page d'accueil `/`, branche `feat/landing-hero`, servie en local sur `http://localhost:3000`
**Cadre :** AEO (E-E-A-T et extractibilité), SEO technique, conversion, et conformité à `docs/08-constitution.md`

## Méthode, et ses limites

Ce qui a été mesuré pour de vrai : le HTML servi par le serveur (149 ko), `robots.txt`, `llms.txt`, les balises `<title>` et `<meta description>`, la présence de données structurées, la hiérarchie des titres, et la présence des réponses FAQ dans le HTML sans JavaScript.

Ce qui n'a **pas** pu être mesuré, et sur quoi ce rapport ne dit rien : les taux de conversion réels, le comportement des visiteurs, les positions dans les moteurs, et les citations effectives par les assistants IA. Il n'y a ni trafic ni historique. Aucun chiffre de performance n'est avancé ici — conformément au principe I de la constitution, on ne présente pas une estimation comme une mesure.

L'audit porte sur une version de développement. La version déployée pourra différer.

## Verdict

La page est bien construite : structure de titres propre, FAQ extractible, tableau comparatif honnête, diagnostic gratuit mis en avant très tôt. Le travail de fond est là.

Mais **elle contredit la constitution du produit à sept endroits**, et deux d'entre eux sont visibles par un prospect en moins de dix secondes. Pour un produit dont l'argument de vente est « nous mesurons honnêtement, nous ne surpromettons pas », c'est le défaut le plus coûteux : il détruit exactement ce qu'on vend.

Le second sujet est plus ironique : **la page est mal optimisée pour les moteurs de réponse alors que c'est le métier du produit**. Zéro donnée structurée, et un fichier `llms.txt` qui décrit un produit qui n'existe pas.

---

## 1. Ce qui contredit la constitution — à corriger en premier

### 1.1 `llms.txt` décrit l'ancien produit abandonné

C'est le défaut le plus grave du lot.

Le fichier servi à `/llms.txt` annonce :

> « Decelio est une plateforme SaaS B2B permettant aux entreprises de mesurer leur visibilité (Share of Voice) sur les systèmes d'Intelligence Artificielle générative tels que ChatGPT, Perplexity, Claude et Gemini. »

Ce n'est pas le produit. C'est le positionnement « visibilité de marque » abandonné lors du pivot, celui dont la constitution dit explicitement qu'il ne doit pas être promis. L'ancienne page d'accueil portait d'ailleurs la mention inverse en pied de page : « Decelio est un outil de vérification technique. Il ne mesure pas vos citations dans les réponses des assistants IA. »

Trois raisons d'en faire la priorité absolue :

1. **C'est le fichier que les assistants IA lisent en premier.** Un produit d'AEO qui donne aux IA une description fausse de lui-même, c'est l'échec le plus visible possible dans sa propre catégorie.
2. **C'est une promesse de fonction non construite**, interdite par la constitution.
3. **Un prospect technique le lira.** Les agences SEO/GEO, votre cible, sont précisément le public qui va ouvrir `/llms.txt` par curiosité professionnelle.

**Correctif :** réécrire `llms.txt` sur le positionnement réel — vérification quotidienne de l'accès des robots IA, cause et correctif, rapport à la marque de l'agence. Y déclarer aussi la limite de mesure, ce qui est un signal de fiabilité pour un moteur de réponse.

### 1.2 « Temps réel » contre « quotidien », dans la même carte de prix

La carte **Freelance** énumère, l'une sous l'autre :

- « Scan AEO quotidien »
- « Alertes temps réel par e-mail »

Les deux ne peuvent pas être vraies. Une alerte issue d'un scan quotidien arrive au plus tôt le lendemain.

Le reste de la page aggrave la contradiction : la section « En pilote automatique » titre **« Surveillance 24/7 »**, et le hero annonce **« Surveillez en temps réel »**.

Ce n'est pas un détail de vocabulaire. Une agence qui lit « temps réel » attend une alerte dans la minute. Au premier incident détecté douze heures plus tard, elle se sentira trompée — et « surveillance quotidienne » est déjà un argument fort face à WP Umbrella ou ManageWP, qui ne font pas ce contrôle du tout.

**Correctif :** « quotidien » partout. « Alerte par e-mail au prochain scan », « Vérification chaque nuit ». La constatation honnête est plus vendeuse que la surenchère, parce qu'elle est tenable.

### 1.3 « Avec preuve à l'appui » contredit le bloc honnête situé juste au-dessus

La page contient, à trois écrans d'intervalle, ces deux affirmations :

| Bloc | Texte |
|---|---|
| Détection WAF | « **Requête non vérifiée se présentant comme GPTBot** — 200 OK » |
| Suivi multi-robots | « Vérifiez chaque jour, **avec preuve à l'appui**, que GPTBot, ClaudeBot et les autres robots IA accèdent bien aux sites de vos clients » |

Le premier est exactement ce qu'exige le principe I. Le second le contredit : une requête non vérifiée n'est pas une preuve, c'est un indice.

Deux autres formulations posent le même problème :

- « **simulant les vrais robots IA** » (section pilote automatique)
- « Analyse du DOM pur — **Sachez exactement quel texte est digéré par l'IA** » — on sait ce que contient le HTML servi, pas ce que le modèle en retient

**Correctif :** aligner sur la formulation honnête, qui existe déjà dans la page. « Vérifiez chaque jour, avec la cause identifiée » plutôt que « avec preuve à l'appui ». « En imitant l'en-tête des robots IA » plutôt que « en simulant les vrais robots ». « Sachez quel texte est présent sans JavaScript » plutôt que « digéré par l'IA ».

### 1.4 Deux badges de popularité sans aucune donnée derrière

- **« LE PLUS CHOISI »** sur le plan Agence
- **« FORTEMENT DEMANDÉ »** sur les rapports marque blanche

Le produit n'a pas encore de clients. Ces deux badges affirment une popularité qui n'existe pas. La constitution interdit les faux chiffres et les faux témoignages ; un faux signal social relève de la même catégorie, et c'est le genre de détail qu'une agence repère.

**Correctif :** les retirer, ou les remplacer par un fait vrai. « Recommandé pour 10 à 30 sites » dit la même chose sans rien inventer. Pour les rapports marque blanche, « Inclus à partir du plan Agence » suffit.

---

## 2. AEO — le point faible, alors que c'est le métier

### 2.1 Aucune donnée structurée

`grep` sur le HTML servi : **zéro bloc `application/ld+json`**.

C'est le manque le plus rentable à combler. Les moteurs de réponse s'appuient sur les données structurées pour identifier une entité, comprendre une offre et extraire une réponse. Quatre schémas manquent, tous justifiés par du contenu **déjà présent** sur la page — donc aucun risque de balisage mensonger :

| Schéma | Ce qui le justifie déjà |
|---|---|
| `Organization` | nom, logo, site, mentions RGPD et hébergement UE |
| `SoftwareApplication` | catégorie, plateforme, description |
| `Offer` ×3 | les trois prix 39 / 99 / 249 € affichés |
| `FAQPage` | les six questions déjà rédigées avec leurs réponses |

Le `FAQPage` est le plus immédiatement utile : il rend les six réponses directement citables.

Point de vigilance de la méthode AEO : ne baliser que ce qui est vrai et visible. Pas de `AggregateRating` tant qu'il n'y a pas d'avis — ce serait exactement le faux chiffre que la constitution interdit, et les moteurs filtrent ce type de balisage.

### 2.2 Aucune identité humaine — le point faible E-E-A-T

Sur les quatre dimensions E-E-A-T, la page est correcte sur trois et vide sur une.

| Dimension | État |
|---|---|
| Expérience | Correct — mécanismes concrets, causes nommées (Cloudflare, Wordfence, `robots.txt`) |
| **Expertise** | **Absente — aucun auteur, aucun fondateur, aucune identité** |
| Autorité | Faible — normal pour un site neuf, pas de backlinks |
| Fiabilité | Correct — limites assumées, RGPD, Stripe, hébergement UE |

Aucun nom humain n'apparaît nulle part. Pour les moteurs de réponse, « qui affirme cela » est un signal de sélection majeur. Pour une agence française qui envisage de confier son portefeuille clients, c'est aussi une question commerciale directe.

**Correctif :** une page « Qui est derrière Decelio » signée, et une mention d'auteur sur la page d'accueil. Le statut de fondateur solo est un atout ici, pas une faiblesse : il rend la promesse « je réponds moi-même » crédible, ce qu'aucun concurrent financé ne peut dire.

### 2.3 Ce qui est déjà juste

Trois choses sont faites correctement et méritent d'être conservées telles quelles :

- **`robots.txt`** déclare des règles par robot — `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot`, `PerplexityBot`, `ChatGPT-User`, `Google-Extended` — au lieu d'un bloc unique. C'est la pratique correcte, et c'est cohérent avec le discours du produit.
- **La FAQ utilise `<details>` natif.** Les six réponses sont présentes dans le HTML servi, vérifié sans JavaScript. C'est précisément ce que le produit vérifie chez les clients. Cohérence respectée.
- **La structure de titres** est propre : un seul `<h1>`, onze `<h2>`, douze `<h3>`.

À vérifier avant la mise en ligne : `robots.txt` publie `Sitemap: http://localhost:3000/sitemap.xml`. Normal en développement, à confirmer une fois le domaine `decelio.fr` branché.

---

## 3. Conversion

### 3.1 Le meilleur atout de la page est sous-exploité

« **Testez avant de nous croire** » suivi du diagnostic gratuit sans compte : c'est l'argument le plus fort de toute la page, parce qu'il retourne l'absence de preuve sociale en preuve directe. Une agence n'a pas besoin de témoignages si elle peut vérifier elle-même en quinze secondes sur un site qu'elle connaît.

Il arrive pourtant tard, après plusieurs écrans de promesses. C'est l'inverse de ce que la situation commande : sans clients à citer, la démonstration doit précéder l'argumentaire.

**Piste :** faire du scan la première chose actionnable, avec un pré-remplissage possible. Le champ existe déjà dans le hero — c'est une question de hiérarchie visuelle, pas de développement.

### 3.2 Deux appels à l'action qui se concurrencent

Le hero propose « **Scanner un site** » et « **Démarrer l'essai** » côte à côte, puis la page alterne entre « Démarrer gratuitement », « Démarrer », « Sécuriser mes clients » et « Choisir Studio ».

Deux actions de poids égal à l'entrée, c'est une décision de plus à prendre pour le visiteur. La logique du produit veut un ordre clair : scanner d'abord, s'inscrire ensuite.

**Piste :** un bouton principal unique — le scan — et l'essai en lien secondaire.

### 3.3 Informations manquantes avant la décision d'achat

La grille tarifaire ne dit pas :

- s'il y a un essai gratuit, et sa durée
- si une carte bancaire est demandée pour commencer
- s'il existe un tarif annuel
- ce qui se passe au dépassement du quota de sites

Ce sont les quatre questions qu'une agence se pose devant trois prix. Chacune sans réponse est une raison de fermer l'onglet. La mention « sans carte » existe pour le diagnostic, mais pas pour l'abonnement.

### 3.4 Le calcul de rentabilité mérite d'être remonté

« Facturez 10 à 20 € par site et par mois, Decelio se rembourse tout seul » est l'argument décisif pour une agence : il transforme une dépense en marge. Il est aujourd'hui enterré dans l'introduction de la grille tarifaire.

C'est un argument de revenu, pas de coût. Il a sa place bien avant les prix.

---

## 4. Plan d'action, par ordre de rentabilité

### À faire avant toute mise en ligne

1. **Réécrire `llms.txt`** sur le vrai positionnement — §1.1
2. **Supprimer « temps réel » et « 24/7 »**, mettre « quotidien » partout — §1.2
3. **Corriger les trois surpromesses de mesure** — §1.3
4. **Retirer les deux faux badges de popularité** — §1.4

Ces quatre points sont des corrections de texte. Aucun développement. Ils protègent la seule chose qu'un produit de mesure ne peut pas se permettre de perdre.

### Ensuite, par impact décroissant

5. **Injecter les quatre schémas JSON-LD** — §2.1. Le plus gros gain AEO pour le moins d'effort, et tout le contenu nécessaire existe déjà.
6. **Ajouter une identité humaine** — §2.2. Le trou E-E-A-T, et une objection commerciale en moins.
7. **Remonter le scan et unifier l'appel à l'action** — §3.1 et §3.2
8. **Répondre aux quatre questions d'achat** dans la grille tarifaire — §3.3
9. **Remonter le calcul de rentabilité** — §3.4

### À vérifier au déploiement

10. `Sitemap:` doit pointer vers le domaine réel et non `localhost`

---

## Ce que cet audit ne dit pas

Il ne dit pas si la page convertit. Personne ne peut le dire sans trafic.

Il ne dit pas non plus si le positionnement est le bon — c'est la question de `docs/05-analyse-strategique.md`, pas celle-ci.

Ce qu'il dit, c'est que la page promet aujourd'hui plus que ce que le produit fait, dans une catégorie où cette promesse excessive est précisément ce que le produit dénonce chez les autres. C'est le défaut à corriger en premier, et c'est le moins cher des dix.


---

## Reprise — décidé le 27 septembre 2026

Sept des dix correctifs de ce rapport sont faits et fusionnés. Voici ce qui attend, par ordre de gravité.

### 1. La section « produits » n'a jamais été auditée (fait, #97)

Ce rapport portait sur l'ensemble de la page ; cette section a été relue en détail après coup et porte **quatre écarts**, dont un sérieux.

- **« Rapports AEO Marque Blanche […] démontrant la visibilité IA des sites de vos clients »** — c'est le positionnement abandonné au pivot, sur la carte qui porte l'argument de facturation du plan Agence. Une agence qui achète pour ce rapport attend une mesure de visibilité et recevra un rapport d'accessibilité technique.
- « Prenez le contrôle de ce que les LLMs voient vraiment » — on ne peut pas savoir ce qu'ils voient.
- « Nous garantissons que vos textes vitaux sont bien présents » — garantie absolue.
- « Soyez alerté avant même que GPTBot ne désindexe le site » — sous-entend une réactivité supérieure au rythme quotidien.

### 2. La navigation est incohérente (fait, #97 et #119 : même navigation partout)

L'en-tête (`HeroConcentric.tsx`) annonce « Solutions / Produits / Tarifs ». Le pied de page (`HomePage.tsx`) annonce « Comment ça marche / Fonctionnalités / Tarifs / Questions fréquentes » — pour les mêmes sections. Deux vocabulaires pour un seul site.

Pire : « Solutions » pointe sur `#solutions`, qui est la section **du problème**, pas des solutions. Le libellé dit l'inverse de la destination.

Le design system impose qu'une même chose porte le même nom partout.

### 3. Les autres pages n'ont pas été touchées (`/pricing`, `/analyse` : #119 ; connexion : #124 ; application et `/design-system` : branche `design/harmonisation-app`)

Seule la page d'accueil a été retravaillée. Restent à mettre en cohérence :

- **`/pricing`** — porte sa propre grille tarifaire, désormais divergente de celle de l'accueil, qui a été rendue comparable. Deux grilles qui se contredisent sur un même site se remarquent.
- **`/design-system`** — la vitrine interne, à jour du jeton `--brand` et du motif du héros.
- Pages légales, `/login`, `/register`, `/forgot-password` — jamais relues sous l'angle du design system.

Le travail est de cohérence, pas de refonte : mêmes jetons, mêmes composants, mêmes libellés d'action, même vocabulaire.

### 4. Deux dettes plus petites

- Les 17 avertissements d'`eslint` (variables déclarées jamais utilisées). Sans danger, mais ils masqueront un vrai avertissement le jour où il arrivera.
- « La cause en 15 secondes » : à confirmer par le fondateur. Si le diagnostic à la demande répond vraiment en 15 secondes, c'est honnête.

### Hors design, mais bloquant avant toute mise en ligne

- **La base de production n'a pas reçu la migration `updatedAt`** (T060). Sans elle, toute création de compte ou de site échouera.
- **`decelio.fr` n'est pas vérifié chez Resend** (T068). Aucun e-mail ne part tant que ce n'est pas fait — ni alerte, ni prospection.
