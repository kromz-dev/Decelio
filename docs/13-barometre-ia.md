# Baromètre « Les sites français bloquent-ils ChatGPT ? »

> Prépare `docs/05-analyse-strategique.md` §10.1 et §11 (semaines 3–5). Ne rien publier avant que ce document soit relu par le fondateur. Aucun chiffre de ce fichier n'est un résultat définitif : le pilote (§6) porte sur 20 sites, pas sur l'échantillon complet.

## 1. Question et hypothèses

**Question principale :** quelle part des sites web français d'un secteur donné sont-ils illisibles pour les robots IA qui servent à *citer* un site dans une réponse (pas à l'entraîner) ?

On distingue explicitement, comme l'exige `docs/05-analyse-strategique.md` §3.1 :

- **Robots d'entraînement** (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended) : leur blocage ne dit rien sur la citation. Beaucoup de sites les bloquent volontairement (droit d'auteur) tout en voulant être cités. Rapportés à titre informatif seulement.
- **Robots de recherche / citation** (OAI-SearchBot, Claude-SearchBot, PerplexityBot) : ce sont eux qui lisent un site pour le citer dans ChatGPT, Claude ou Perplexity. C'est la statistique qui a de la valeur pour la prospection.
- **Robots déclenchés par l'utilisateur** (ChatGPT-User, Claude-User, Perplexity-User) : rapportés séparément si le temps le permet, moindre priorité (trafic plus faible, moins souvent bloqués spécifiquement).

**Deux sous-hypothèses mesurées séparément** (jamais fusionnées en un score unique, conformément à `docs/05` §3.3) :

1. **Politique déclarée** : part des sites dont `robots.txt` nomme explicitement et interdit un robot de citation (preuve certaine, RFC 9309).
2. **Risque à l'accès** : part des sites où une requête qui se présente comme ce robot reçoit un blocage ou un défi (indice seulement, jamais une preuve — le site peut vérifier ce robot par IP, voir `docs/08-constitution.md`).

## 2. Échantillon

**Méthode reproductible :**

- **Taille cible** : 400 à 600 sites, en deux lots :
  - 300–400 sites de PME / e-commerce / médias français, tirés de classements publics : La Fabrique du Net (agences web, > 1 500 prestataires référencés), FEVAD (top e-commerce français), Alexa/Similarweb archivé ou Semrush gratuit (top domaines `.fr` par trafic, dans la limite du plan gratuit).
  - 100–150 sites vitrines d'agences SEO/GEO et de leurs références clientes (Malt, LinkedIn, La Fabrique du Net catégorie SEO, agencegeo.pro) — sert à la fois le baromètre et amorce la liste de prospection du §5.
- **Critères d'inclusion** : domaine `.fr` ou société immatriculée en France, site vitrine ou marchand public (pas d'intranet), langue française, accessible sans authentification.
- **Critères d'exclusion** : sites qui demandent explicitement de ne pas être indexés (mention publique « site privé », intranet visible), doublons de domaine (`www.` et sans `www.` comptent une fois), sites déjà scannés dans un précédent lot.
- **Date de constitution de la liste** : à figer le jour du lancement du scan (les classements bougent). Le fichier de liste (CSV, source de chaque ligne) est conservé comme preuve de méthode, mais n'est jamais publié nommément (§4).
- **Limite reconnue** : un échantillon tiré de classements de trafic ou de listes d'agences n'est pas un tirage aléatoire de « tous les sites français ». Le baromètre décrit son échantillon précisément (secteur, taille de l'entreprise si connue, source) plutôt que de généraliser à « les sites français » sans qualificatif.

## 3. Méthode de mesure

Le scan repose sur `decelio/lib/scanner/core.ts` (`runCoreScan`), déjà conforme à la constitution :

1. **Requête honnête** (`DecelioBot/1.0 (+https://decelio.fr)`) : sert de référence. Un refus ici (`À VÉRIFIER`) n'est jamais imputé à un robot précis, faute de preuve.
2. **`robots.txt`** analysé par jeton de bot (RFC 9309, groupe le plus spécifique). C'est la seule preuve *certaine* (`decelio/lib/scanner/robots.ts`).
3. **Sonde non vérifiée** : une requête avec le User-Agent public du robot (`decelio/lib/scanner/agents.ts`), un seul lot à la fois par hôte, espacé (voir §3.1). Un écart avec la référence est un **indice**, jamais une preuve : le site peut authentifier ce robot par IP, ce que Decelio ne fait pas depuis un pilote.
4. **Détection de plateforme** (`platform.ts`) : CMS, pare-feu, hébergeur — seulement à partir de signaux concrets déjà lus, jamais par déduction.
5. **Protection SSRF** (`domain.ts`, `crawler.ts` `assertSafeUrl`) : chaque requête et chaque redirection revalidées, IP privées refusées.

**Statuts publiés par bot, jamais un score agrégé** (`SimpleStatus` de `core.ts`) : `OK`, `À VÉRIFIER`, `BLOQUÉ`, `COQUILLE VIDE`, `ERREUR`. Le baromètre publie une répartition en pourcentage de ces statuts, par robot, jamais un chiffre unique de « visibilité IA ».

### 3.1 Limites écrites en clair (à reproduire dans toute publication)

- **Indice, jamais preuve.** Un « BLOQUÉ » sur une sonde usurpée signifie « une requête qui se présente comme ce robot a été bloquée alors que la requête honnête passait ». Le vrai robot, vérifié par IP par le site (Cloudflare notamment), peut très bien passer. C'est noté explicitement à côté de chaque chiffre publié.
- **« À vérifier » est un résultat, pas un échec.** Quand la requête honnête elle-même est bloquée ou challengée, aucun robot précis n'est mis en cause : le statut reste `À VÉRIFIER` et n'est jamais compté comme "bloque ChatGPT". Le pilote (§6) montre que ce cas est fréquent (8/20, un site sur trois environ), donc la part de « à vérifier » doit être publiée comme catégorie à part entière, pas noyée dans les deux autres.
- **Le blocage le plus courant est invisible depuis l'extérieur** (`docs/05` §3.2) : le bouton Cloudflare « Block AI bots » vise les robots *vérifiés*, qu'une sonde usurpée ne peut pas imiter. Le baromètre sous-estime donc probablement le vrai taux de blocage, et le dit.
- **Variation dans le temps.** Un `robots.txt` change ; le pare-feu d'un site peut être activé ou désactivé entre deux scans. Le baromètre date chaque scan et ne prétend pas décrire un état permanent.
- **Un seul point de sortie réseau.** Une IP ou une zone géographique unique peut être elle-même mal vue de certains pare-feu (bien plus rare que pour un vrai bot, mais possible). À signaler si un taux de blocage paraît anormalement élevé sur un sous-ensemble homogène.

### 3.2 Rythme de requêtes (politesse)

- Un site à la fois par lot pour `robots.txt` + sondes (déjà implémenté : `HOST_REQUEST_CONCURRENCY = 2`, pause `HOST_REQUEST_SPACING_MS = 300 ms` dans `core.ts`).
- **Entre deux sites différents** (nouveau, pour le baromètre) : pause d'au moins 2 à 3 secondes, pour rester un usage raisonnable d'un service tiers gratuit et ne jamais ressembler à une attaque. Le script pilote (§6) utilise 3 s.
- User-Agent honnête (`DecelioBot/1.0 (+https://decelio.fr)`) sur la requête de référence et sur `robots.txt` : identifie Decelio, jamais anonyme.
- SSRF : chaque URL de la liste passe par la même validation que le scan public (`assertSafeUrl`), aucune exception.

## 4. Ce qu'on publiera / ne publiera jamais

**Publié :**
- Un pourcentage par statut et par robot (ex. « OAI-SearchBot : 30 % OK, 30 % bloqué, 40 % à vérifier »), avec le **dénominateur** (nombre de sites du lot correspondant) et la date du scan.
- La méthode (ce document, résumé), ses limites (§3.1), la distinction robots d'entraînement / de recherche.
- Des exemples anonymisés ou volontairement génériques de cause (« un site sur cinq a un `robots.txt` géré automatiquement par son pare-feu qui interdit OAI-SearchBot sans que personne l'ait décidé »).
- Format : une page publique `/barometre` (données réelles, pas de faux chiffre avant que le scan complet existe), un post LinkedIn de synthèse, éventuellement un PDF court pour la presse (JDN, BDM, Presse-citron, r/SEO, WebRankInfo — cf. `docs/05` §10.1).

**Jamais publié :**
- Le nom d'un site précis présenté comme fautif, sans son accord écrit. Un cas nommé n'est utilisable qu'en prospection individuelle et vérifiée (`docs/06-kit-prospection.md`), jamais dans une communication publique de masse.
- Une extrapolation au-delà de l'échantillon décrit (« les sites français » sans qualificatif, alors que l'échantillon est un tirage de classements, pas un tirage aléatoire — §2).
- Un score agrégé unique qui mélange politique déclarée et risque à l'accès, ou qui mélange robots d'entraînement et robots de citation.
- Tout chiffre qui n'a pas de dénominateur visible à côté.

**Lien avec la prospection (`docs/06`) :** le lot d'agences SEO/GEO scanné pour le baromètre (§2) sert de point de départ à la liste de 150 prospects — un site d'agence ou un site client visiblement bloqué devient un e-mail individuel avec constat vérifié (méthode §3 du kit de prospection), jamais une citation publique. Le baromètre est l'aimant à visibilité (presse, backlinks, LinkedIn) ; la prospection écrite est la conversion.

## 5. Plan d'exécution

| Étape | Contenu | Temps estimé |
|---|---|---|
| 1 | Constituer et figer la liste de sites (§2), avec sa source par ligne | 1 jour |
| 2 | Scanner en lot avec `runCoreScan`, un site à la fois, espacé (script à écrire à partir du pilote §6, en dehors de `lib/`) | 1 à 2 jours (temps de calcul + surveillance des erreurs) |
| 3 | Agréger les statuts par robot et par statut, vérifier à la main un échantillon de 20 à 30 cas « BLOQUÉ » pour confirmer la cause avant publication | 1 jour |
| 4 | Rédiger l'article, la page `/barometre`, le post LinkedIn | 1 à 2 jours |
| 5 | Diffusion (LinkedIn fondateur, presse, communautés) | 2 à 3 jours d'envois, puis suivi |

**Total estimé : 6 à 9 jours de travail effectif**, en ligne avec la fenêtre de 3 semaines (semaines 3–5) de `docs/05` §11.

**Lien avec le critère d'arrêt (`docs/05` §13) :** le scan du baromètre est la première mesure fiable du taux de blocage *vérifié*. Si, une fois les cas `BLOQUÉ` vérifiés à la main (étape 3), **moins de 5 % des sites scannés ont un problème confirmé** (pas seulement « à vérifier »), c'est le signal du plan B : pivoter vers la visibilité IA plutôt que poursuivre la prospection de portefeuille. Le baromètre sert donc à la fois de contenu de distribution et de test du critère d'arrêt — les deux lectures doivent être faites avant de lancer les 150 prospections.

## 6. Pilote (non publiable, n=20)

**Objectif du pilote :** vérifier que le scanner tourne correctement en lot sur des sites réels avant d'engager le scan complet, et mesurer le temps par site pour dimensionner l'étape 2.

**Méthode :** script local `decelio/scripts/barometre-pilote.ts` (non commité, supprimé après ce pilote), utilisant `runCoreScan` avec les 3 robots de recherche par défaut (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`). 20 sites institutionnels et médias français très connus, un par un, pause de 3 secondes entre chaque site. Aucune base de données requise : `runCoreScan` ne fait que des requêtes réseau, la session n'a donc pas eu besoin d'écrire dans Neon. Exécuté le 27 septembre 2026 via `npx tsx scripts/barometre-pilote.ts` depuis `decelio/`.

**Résultats agrégés (aucun site nommé fautif ci-dessous — comptes seulement) :**

| Statut | OAI-SearchBot | Claude-SearchBot | PerplexityBot |
|---|---|---|---|
| OK | 6/20 (30 %) | 5/20 (25 %) | 5/20 (25 %) |
| BLOQUÉ | 6/20 (30 %) | 7/20 (35 %) | 7/20 (35 %) |
| À VÉRIFIER | 8/20 (40 %) | 8/20 (40 %) | 8/20 (40 %) |
| COQUILLE VIDE / ERREUR | 0/20 | 0/20 | 0/20 |

- **Temps moyen par site : environ 0,7 seconde** (min ~480 ms, max ~1,6 s) pour le scan complet (requête honnête + `robots.txt` + 3 sondes). Le budget de 20 s par site (ENF, `docs/08-constitution.md`) est très large pour ce cas ; à un rythme de 3 s de pause entre sites, un lot de 500 sites prendrait environ 30 minutes de calcul, hors vérification manuelle.
- **Aucune exception JavaScript** sur les 20 sites (0 `ERREUR` d'exécution du script). Le scanner n'a pas planté sur des sites réels à fort trafic, avec des configurations de pare-feu variées.
- **Le taux de « à vérifier » est élevé (40 %)**, y compris sur des sites institutionnels et de grands médias reconnus pour avoir des protections anti-bot actives. C'est cohérent avec `docs/05` §3.2 : la requête honnête elle-même se heurte souvent à un défi générique (Cloudflare, etc.), sans qu'on puisse en déduire qu'un robot précis est visé. **Conséquence méthodologique pour le scan complet : prévoir que 30 à 40 % des résultats bruts ne seront pas exploitables tels quels pour un « X % de sites bloquent Y », et que la vérification manuelle de l'étape 3 du plan d'exécution devra couvrir une part significative de l'échantillon**, pas seulement les cas `BLOQUÉ`.
- Aucun site du pilote n'a renvoyé `COQUILLE VIDE` : les 20 sites choisis sont rendus côté serveur, ce qui est attendu pour des médias et sites institutionnels classiques (pas représentatif des sites en JavaScript pur).
- La détection de plateforme (`platform.ts`) n'a identifié un CMS que sur 2 sites/20 (Drupal, Next.js/Nuxt) — cohérent avec le commentaire du code : la plupart des grands sites n'exposent pas de signal net, ce n'est donc pas un défaut du pilote.

**Ce que ça n'apprend pas :** ces 20 sites sont de grandes organisations avec des équipes techniques dédiées, pas représentatifs des PME et agences visées par le baromètre final (§2). Le taux de blocage réel sur l'échantillon PME/agences reste à mesurer — c'est précisément l'objet du scan complet, pas de ce pilote.

**État du script :** `decelio/scripts/barometre-pilote.ts` n'a pas été commité (conforme à la consigne) et sera supprimé de ce worktree avant la fin de la préparation.
