# Résultats v1 du baromètre « Les médias et sites e-commerce français bloquent-ils les robots des IA ? »

> Édition 1. Scan effectué le 27 septembre 2026 avec `runCoreScan` (`decelio/lib/scanner/core.ts`), depuis un point de sortie réseau unique, une seule fois. Ce document applique les règles de publication et les limites de `docs/13-barometre-ia.md` et `docs/08-constitution.md` : aucun score agrégé, aucun site nommé comme fautif, un dénominateur visible à côté de chaque chiffre.

## 1. Périmètre et échantillon

- **Échantillon scanné** : 270 domaines des deux seules catégories couvertes à ce stade, soit 226 médias et éditeurs et 44 e-commerce (`docs/barometre/echantillon-v1.md`). Les catégories PME/TPE de services (0 ligne) et agences web/SEO/GEO (42 lignes) prévues par `docs/13` §2 n'ont pas été scannées dans cette édition : elles n'existaient pas encore en volume suffisant dans l'échantillon au moment du scan.
- **Biais déjà documentés dans l'échantillon** (`docs/barometre/echantillon-v1.md` §4, à relire en entier avant toute diffusion) : le lot médias vient d'un seul classement d'audience (ACPM) qui mélange de très gros titres nationaux et de petits titres de PQR ; le lot e-commerce est dominé par de grandes enseignes et marketplaces, pas des PME, et ses 44 domaines ont été **reconstitués à la main à partir d'un nom de marque** (pas copiés depuis la source), avec un risque de TLD erroné non exclu.
- Ce baromètre décrit donc « un échantillon de grands médias français et de grandes enseignes e-commerce », pas « les sites français » en général.

## 2. Dénominateur retenu et exclusions

Sur les 270 domaines scannés, **20 ont été exclus du dénominateur** (site injoignable ou réponse invalide, aucune donnée exploitable sur aucun robot) :

| Raison de l'exclusion | Nombre | Catégorie |
|---|---:|---|
| Domaine injoignable (`unreachable`, aucune réponse réseau) | 19 | 16 médias, 3 e-commerce |
| Réponse HTTP invalide pour l'analyse (`http_error`, code 400) | 1 | e-commerce |
| **Total exclu** | **20** | 16 médias, 4 e-commerce |

**Dénominateur retenu pour tous les chiffres ci-dessous : 250 sites** (210 médias, 40 e-commerce).

Un cas particulier est conservé dans le dénominateur sans être une exclusion : un site e-commerce a répondu (code 202) mais son contenu dépend fortement du JavaScript côté client (`jsVerdict = likely_js_dependent`). Le scan ne peut rien affirmer sur ce que verrait un robot texte, statut publié en **COQUILLE VIDE**, jamais compté comme « bloqué » ni comme « ok ».

## 3. Chiffres clés : robots de recherche/citation (OAI-SearchBot, Claude-SearchBot, PerplexityBot)

Ce sont les robots qui lisent un site pour le citer dans une réponse ChatGPT, Claude ou Perplexity, la statistique qui compte pour la prospection (`docs/13` §1).

| Statut | OAI-SearchBot | Claude-SearchBot | PerplexityBot |
|---|---|---|---|
| OK | 158 sur 250, soit 63 % | 171 sur 250, soit 68 % | 132 sur 250, soit 53 % |
| BLOQUÉ | 45 sur 250, soit 18 % | 31 sur 250, soit 12 % | 72 sur 250, soit 29 % |
| À VÉRIFIER | 46 sur 250, soit 18 % | 47 sur 250, soit 19 % | 45 sur 250, soit 18 % |
| COQUILLE VIDE | 1 sur 250, soit 0,4 % | 1 sur 250, soit 0,4 % | 1 sur 250, soit 0,4 % |

**Par catégorie :**

| | Médias (n=210) | E-commerce (n=40) |
|---|---|---|
| OAI-SearchBot OK | 147 sur 210, soit 70 % | 11 sur 40, soit 28 % |
| OAI-SearchBot BLOQUÉ | 43 sur 210, soit 20 % | 2 sur 40, soit 5 % |
| Claude-SearchBot OK | 161 sur 210, soit 77 % | 10 sur 40, soit 25 % |
| Claude-SearchBot BLOQUÉ | 28 sur 210, soit 13 % | 3 sur 40, soit 8 % |
| PerplexityBot OK | 121 sur 210, soit 58 % | 11 sur 40, soit 28 % |
| PerplexityBot BLOQUÉ | 69 sur 210, soit 33 % | 3 sur 40, soit 8 % |

Le lot e-commerce a un taux « À VÉRIFIER » nettement plus élevé (57 à 65 % selon le robot, contre 8 à 10 % pour les médias) : les grandes enseignes et marketplaces de cet échantillon opposent plus souvent un défi générique (anti-bot) à la requête honnête elle-même, avant même de considérer un robot précis (voir §5).

### Preuve (`robots.txt` nomme le robot) contre indice (sonde refusée par le pare-feu)

Sur l'ensemble (n=250), pour les statuts BLOQUÉ ci-dessus :

| | OAI-SearchBot | Claude-SearchBot | PerplexityBot |
|---|---|---|---|
| Preuve (`robots.txt` interdit nommément ce robot) | 34 sur 250, soit 14 % | 27 sur 250, soit 11 % | 65 sur 250, soit 26 % |
| Indice seulement (sonde non vérifiée refusée par un pare-feu, sans règle `robots.txt` correspondante) | 11 sur 250, soit 4 % | 4 sur 250, soit 2 % | 7 sur 250, soit 3 % |

La grande majorité des blocages mesurés sont des **règles écrites dans `robots.txt`**, pas seulement des indices de pare-feu. Rappel de `docs/13` §3.1 : même la part « indice » n'est jamais une preuve, car une sonde qui imite l'User-Agent public du robot depuis un serveur non vérifié peut être bloquée alors que le vrai robot, authentifié par IP par le site, passerait.

## 4. Chiffres clés : robots d'entraînement (GPTBot, ClaudeBot)

Rapportés à titre informatif seulement (`docs/13` §1) : un site peut légitimement bloquer l'entraînement (droit d'auteur) tout en restant lisible par les robots de recherche ci-dessus. Ce n'est jamais imputé à un « blocage de l'IA » au sens de la citation.

| Statut | GPTBot | ClaudeBot |
|---|---|---|
| OK | 96 sur 250, soit 38 % | 121 sur 250, soit 48 % |
| BLOQUÉ | 112 sur 250, soit 45 % | 87 sur 250, soit 35 % |
| À VÉRIFIER | 41 sur 250, soit 16 % | 41 sur 250, soit 16 % |

Preuve contre indice, mêmes catégories que ci-dessus :

| | GPTBot | ClaudeBot |
|---|---|---|
| Preuve (`robots.txt`) | 97 sur 250, soit 39 % | 73 sur 250, soit 29 % |
| Indice seulement (pare-feu) | 15 sur 250, soit 6 % | 14 sur 250, soit 6 % |

## 5. « Bloque l'entraînement mais laisse passer la recherche »

**34 sites sur 250, soit 14 %** de l'échantillon retenu bloquent au moins un robot d'entraînement (GPTBot et/ou ClaudeBot) tout en laissant les trois robots de recherche/citation en statut OK. Rapporté aux seuls sites qui bloquent au moins un robot d'entraînement (116 sur 250, soit 46 %), cela représente 34 sur 116, soit 29 % de ce sous-groupe : un site sur trois qui bloque l'entraînement le fait sans toucher à la citation.

Autres repères sur l'ensemble des robots de recherche :
- **Au moins un des trois robots de recherche BLOQUÉ** : 78 sur 250 sites, soit 31 %.
- **Les trois robots de recherche OK** : 126 sur 250 sites, soit 50 %.
- **Les trois robots de recherche À VÉRIFIER** (requête honnête elle-même bloquée ou challengée, aucun robot précis mis en cause) : 45 sur 250 sites, soit 18 %.

Exemple positif, lisible : sur les sites médias régionaux du lot, plusieurs restent ouverts aux trois robots de recherche sans restriction particulière, dont `gazette-du-midi.fr` dans ce scan. Cité ici uniquement à titre d'exemple de site qui **n'est pas concerné** par un blocage, jamais comme comparaison indirecte avec un site bloqué (`docs/13` §4 : aucun site fautif n'est nommé dans ce document).

## 6. Plateformes et pare-feu détectés (agrégé, n=250)

La détection de plateforme (`decelio/lib/scanner/platform.ts`) ne repose que sur des signaux concrets déjà lus par le scan ; elle reste souvent muette sur de gros sites qui ne l'exposent pas.

**CMS identifié** : 76 sur 250 sites (30 %), soit WordPress 53, Drupal 12, Next.js/Nuxt 11. Non identifié sur les 174 autres (70 %).

**Pare-feu identifié** : 83 sur 250 sites (33 %), soit Cloudflare 74, Imperva 7, Sucuri 2. Non identifié sur les 167 autres (67 %).

**Hébergeur identifié** : 14 sur 250 sites (6 %), soit OVH 11, o2switch 2, Gandi 1. Non identifié sur les 236 autres (94 %).

## 7. Contrôle manuel des cas BLOQUÉ

Conformément à `docs/13` §5 étape 3, un échantillon de sites en statut BLOQUÉ (preuve `robots.txt`) sur un robot de recherche a été vérifié à la main : relecture du vrai `robots.txt` du site (une requête polie par site, User-Agent `DecelioBot/1.0`, espacée de 2 secondes), le 27 septembre 2026.

**6 domaines vérifiés, 13 combinaisons site × robot** (sur les 126 combinaisons BLOQUÉ + preuve mesurées dans l'échantillon, tous robots de recherche confondus) :

| Domaine | Robot(s) vérifié(s) | Résultat de la relecture manuelle |
|---|---|---|
| Un site e-commerce international | OAI-SearchBot, Claude-SearchBot, PerplexityBot | Règle `Disallow: /` confirmée nommément pour les trois, dans le vrai `robots.txt` |
| Un site e-commerce international (2) | PerplexityBot | Groupe de robots (dont PerplexityBot) en `Disallow: /` avec une exception `Allow: /help`, confirmé |
| Un média national (1) | OAI-SearchBot, Claude-SearchBot, PerplexityBot | Les trois regroupés dans un même bloc `User-agent`, `Disallow: /` confirmé |
| Un média national (2) | OAI-SearchBot, Claude-SearchBot | Autorisations partielles par rubrique (voyages, culture…) puis `Disallow: /` sur le reste : confirmé comme blocage majoritaire |
| Un média national (3) | OAI-SearchBot, Claude-SearchBot | Regroupés avec d'autres robots IA dans un bloc `Disallow: /` avec quelques rubriques `Allow` : confirmé |
| Un média national (4) | Claude-SearchBot | `Disallow: /` confirmé nommément |

**Résultat : 6 domaines et 13 combinaisons site × robot vérifiés, 13 sur 13 confirmés** (règle `robots.txt` réelle conforme au statut publié par le scan). Aucun désaccord trouvé sur cet échantillon. Ce contrôle porte sur 13 des 126 combinaisons « BLOQUÉ + preuve » de l'échantillon (10 %), pas sur leur totalité : il donne un indice de fiabilité de la classification `PREUVE_ROBOTS_TXT`, pas une garantie sur les 113 combinaisons restantes.

Aucun des six domaines n'est nommé plus haut dans ce document : conformément à `docs/13` §4, un site n'est cité nommément que comme exemple positif (§5), jamais comme cas bloqué.

## 8. Ce que ça veut dire, en clair

- **Sur ce lot de grands médias et grandes enseignes e-commerce, la moitié environ (50 %, 126/250) reste lisible sans restriction par les trois robots qui servent à citer un site dans ChatGPT, Claude ou Perplexity.** Un tiers (31 %, 78/250) bloque au moins l'un des trois, le plus souvent par une règle explicite du `robots.txt`, pas seulement par un pare-feu générique.
- **Un blocage sur trois observé n'est même pas imputable à un robot précis** : sur 18 % des sites, la requête honnête elle-même se heurte à un défi générique. C'est un résultat en soi (« à vérifier »), pas un échec de mesure, et `docs/13` §3.1 avait anticipé ce cas de figure dès le pilote à 20 sites.
- **Bloquer l'entraînement des modèles est plus fréquent que bloquer la citation** (46 % contre 31 %), et les deux ne se recouvrent pas totalement : 14 % des sites bloquent l'entraînement tout en laissant passer la recherche. C'est un choix cohérent (protéger le droit d'auteur sans se couper de la citation), pas une incohérence.

## 9. Limites (reprises de `docs/13-barometre-ia.md` §3.1, à conserver dans toute republication)

- **Indice, jamais preuve, pour la part « pare-feu ».** Un statut BLOQUÉ obtenu par indice seulement (sonde non vérifiée) signifie qu'une requête *se présentant comme* ce robot a été refusée alors que la requête honnête passait, pas que le vrai robot, authentifié par IP, serait refusé.
- **Le blocage le plus courant reste invisible depuis l'extérieur.** Un bouton de pare-feu du type « bloquer les robots IA vérifiés » vise des robots authentifiés par IP, qu'une sonde usurpée ne peut pas imiter. Ce baromètre sous-estime donc probablement le taux réel de blocage.
- **Photographie à une date donnée.** `robots.txt` et configuration de pare-feu peuvent changer entre deux scans ; ce document décrit l'état du 27 septembre 2026, pas un état permanent.
- **Un seul point de sortie réseau.** Si un sous-ensemble homogène affiche un taux de blocage anormalement élevé, une part peut venir de la réputation de cette IP/zone plutôt que d'une politique ciblée. Ce n'est pas exclu ici, et pas quantifiable avec un seul point de sortie.
- **Échantillon non représentatif des PME françaises** (§1) : ce sont de grands médias et grandes enseignes, pas un tirage aléatoire des sites français, encore moins des PME/TPE ou agences (catégories non couvertes dans cette édition).
- **20 sites exclus du dénominateur** (§2) parce qu'injoignables au moment du scan : ils ne sont ni comptés « ok » ni « bloqués », ils sont absents des pourcentages.

## 10. Brouillon post LinkedIn (≤ 1 200 caractères)

> On a scanné 270 grands médias et sites e-commerce français avec un vrai `robots.txt` et de vraies sondes (pas une estimation) pour savoir si les robots qui *citent* un site dans ChatGPT, Claude ou Perplexity peuvent le lire.
>
> Résultat, sur les 250 sites exploitables (20 injoignables exclus) :
> - 50 % (126/250) sont lisibles sans restriction par les trois robots de citation (OAI-SearchBot, Claude-SearchBot, PerplexityBot).
> - 31 % (78/250) bloquent au moins l'un des trois, le plus souvent par une règle écrite dans leur `robots.txt`, vérifiée à la main sur un échantillon de cas.
> - 18 % (45/250) donnent un résultat qu'on ne peut imputer à aucun robot précis : la page elle-même oppose un défi générique.
>
> Autre chiffre qui surprend : 14 % des sites bloquent l'entraînement (GPTBot, ClaudeBot) tout en laissant passer la citation. Un choix cohérent, pas une erreur : protéger le droit d'auteur sans se couper de la visibilité dans les réponses IA.
>
> Ce chiffre concerne un échantillon de grands médias et grandes enseignes e-commerce, pas « tous les sites français ». Méthode et limites complètes en commentaire.
>
> On ne nomme aucun site précis : ce n'est pas un classement, c'est une mesure.

## 11. Titre et chapeau, page `/barometre`

**Titre :** Un site français sur trois bloque au moins un robot qui pourrait le citer dans ChatGPT, Claude ou Perplexity

**Chapeau :** Sur 250 grands médias et sites e-commerce français scannés le 27 septembre 2026, la moitié reste ouverte aux trois robots qui lisent un site pour le citer dans une réponse IA. Un tiers en bloque au moins un, le plus souvent par une règle explicite de leur `robots.txt`. Méthode reproductible, dénominateurs et limites détaillés ci-dessous ; aucun site n'est nommé comme fautif.
