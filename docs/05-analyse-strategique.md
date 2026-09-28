# Analyse stratégique — Decelio (septembre 2026)

> Synthèse de 8 recherches menées le 24 septembre 2026 (segments, ICP, marché France, canaux, plateformes Lovable/Bolt/Bubble, indépendants, validité technique, concurrence), relue contre le code du dépôt.
> Les chiffres sourcés portent un lien. Les estimations sont signalées comme telles.

---

## 0. Verdict en une page

1. **La cible actuelle (agences no-code Webflow / Framer / Bubble) est la mauvaise.** Webflow, Framer, Wix et Squarespace servent du HTML rendu côté serveur, sur un hébergement que l'agence ne contrôle pas. Le problème que Decelio détecte y est rare. Le vivier est minuscule en France (7 à 27 agences listées par plateforme). Note : 9/25, la plus basse des six cibles évaluées.
2. **Les indépendants et e-commerçants ne sont pas une bonne cible pour le produit actuel.** Leurs plateformes sont rendues côté serveur et laissent passer les bots IA par défaut. Ils ne parlent pas de `robots.txt` : ils veulent savoir si ChatGPT les recommande. Ce marché existe, mais il est déjà occupé à 20–75 €/mois, y compris par des acteurs français.
3. **Cibles recommandées : les agences de maintenance WordPress (19/25) et les agences SEO/GEO (18/25).** Chez les premières, le blocage est réel, récurrent et invisible (Cloudflare, Wordfence, pare-feu d'hébergeurs), et il existe un budget récurrent : le contrat de maintenance. Les secondes vendent déjà du « référencement IA » à 800–5 000 €/mois et n'ont pas d'outil de preuve technique. Un même produit sert les deux.
4. **Bloquant avant toute vente : la méthode de mesure.** Imiter l'User-Agent de GPTBot depuis un datacenter ne reproduit pas ce que voit le vrai GPTBot. Preuve : Lovable ne sert la version pré-rendue qu'aux bots vérifiés ([docs Lovable](https://lovable.dev/faq/deployment/rendering/ssr-prerendering-when-needed)). Decelio déclarerait donc « coquille vide » des sites qui vont bien. Une fausse alerte envoyée à une agence SEO détruit la crédibilité du produit.
5. **Conséquence produit :** le blocage le plus courant (le bouton Cloudflare « Block AI bots ») est invisible depuis l'extérieur. La mesure doit reposer sur des contrôles honnêtes (`robots.txt` par bot, challenge, rendu JavaScript) et sur une **intégration Cloudflare en lecture seule**. C'est la fonctionnalité payante la plus défendable (§3).
6. **Repositionnement proposé :** passer de « le scanner qui se fait passer pour une IA » à « **l'état de lisibilité IA de tout votre portefeuille client, prouvé et rapporté chaque mois en marque blanche** ».

**Les 90 prochains jours :** corriger la mesure (2 semaines), publier un baromètre français (semaines 3 à 5), puis faire de la prospection appuyée sur des preuves vérifiées auprès de 150 agences (semaines 5 à 12). **Objectif : 10 agences payantes, soit environ 1 000 € de MRR. Critère d'arrêt :** si moins de 5 % des sites scannés présentent un problème *vérifié*, le problème est trop rare pour un abonnement. On pivote alors vers la visibilité IA (voir §13).

---

## 1. L'idée telle qu'elle est dans le dépôt

- **Produit :** scanner externe quotidien. Il appelle les URL clientes avec des User-Agents de bots IA et classe chaque site en OK, BLOQUÉ ou COQUILLE VIDE. Il alerte par e-mail, Slack ou webhook.
- **Cible :** agences no-code (Bubble, Webflow, Framer, Lovable, Bolt).
- **Prix :** scan gratuit, puis 99 €/mois pour 20 domaines.
- **État du code :** MVP complet (scan public, authentification, tableau de bord, cron Inngest, alertes, Stripe, paywall). Les plans `SOLO / PRO / SCALE` existent dans `lib/billing/plans.ts`, alors que la page de prix n'en montre qu'un.

Le travail d'ingénierie est fait. La question n'est plus « peut-on le construire ? », mais « **qui a ce problème assez souvent pour payer tous les mois ?** ».

---

## 2. Audit produit : ce que le moteur mesure vraiment

| # | Constat (fichier) | Effet sur la vente | Gravité |
|---|---|---|---|
| P1 | `redirect: "error"` dans `lib/scanner/crawler.ts` : toute URL qui redirige (http→https, apex→www, `/`→`/fr/`) renvoie ERREUR. | Une grosse part des URL tapées dans le scan gratuit échoue. Le lead magnet paraît cassé au premier essai. | Bloquant |
| P2 | Aucune lecture de `robots.txt` par bot. Un site peut répondre 200 à GPTBot tout en l'interdisant (cas du `robots.txt` géré par Cloudflare, du bouton Yoast, de la case Squarespace). | Faux « OK ». | Bloquant |
| P3 | L'User-Agent est imité depuis un datacenter. Les protections modernes vérifient l'identité des bots, donc un faux GPTBot n'est pas traité comme le vrai (cas Lovable prouvé). | Faux positifs et faux négatifs. | Bloquant |
| P4 | Le scan de contrôle « Browser » est aussi un `fetch` sans JavaScript. Il ne mesure pas l'écart entre HTML brut et page rendue. | La coquille vide n'est détectée que sous le seuil absolu de 50 mots. | Élevée |
| P5 | `Google-Extended` est traité comme un User-Agent. C'est un jeton `robots.txt` : Google explore avec Googlebot. | Signal faux, repérable par un expert SEO. | Moyenne |
| P6 | Il manque les bots qui servent à être *cité* : OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, Perplexity-User. GPTBot et ClaudeBot servent surtout à l'entraînement. | On mesure l'entraînement, alors qu'on promet la citation. | Élevée |
| P7 | La FAQ de la landing parle encore de « proxy (Managed Fix) » et de « middleware », abandonnés au pivot. La maquette du hero affiche « A/B Testing SEO ». | Promesse incohérente. | Moyenne |
| P8 | Le rate limit de `/api/scan` est en mémoire, donc inefficace en serverless (le modèle `RateLimit` en base n'est pas utilisé ici). | Abus possible du scan gratuit. | Faible |

---

## 3. Validité technique et méthode de mesure

### 3.1 Les bots qui comptent pour être *cité*

| Éditeur | Entraînement | Index de recherche (citation) | Visite déclenchée par l'utilisateur (citation) |
|---|---|---|---|
| OpenAI | GPTBot | **OAI-SearchBot** | **ChatGPT-User** |
| Anthropic | ClaudeBot | **Claude-SearchBot** | **Claude-User** |
| Perplexity | — | **PerplexityBot** | **Perplexity-User** |
| Google | Google-Extended (*jeton robots.txt, pas un robot*) | Googlebot (AI Overviews) | — |
| Apple | Applebot-Extended (*jeton*) | Applebot | — |

Sources : [OpenAI](https://platform.openai.com/docs/bots), [Anthropic](https://support.anthropic.com/en/articles/8896518), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).
- Bloquer GPTBot n'empêche pas d'être cité par ChatGPT. Bloquer OAI-SearchBot, si.
- Le produit doit rapporter ces bots séparément. Beaucoup de sites bloquent volontairement l'entraînement tout en voulant être cités.

### 3.2 Pourquoi imiter l'User-Agent ne marche pas

- Cloudflare reconnaît un bot « vérifié » par son IP (plages publiées), son reverse DNS et, de plus en plus, par signature HTTP (Web Bot Auth). Il ne se fie **pas** à l'User-Agent ([Cloudflare Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/), [Super Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/super-bot-fight-mode/)).
- **Faux positif :** le faux GPTBot de Decelio, parti d'un datacenter, reçoit un challenge du Bot Fight Mode. Decelio conclut « bloqué », alors que le vrai GPTBot, vérifié, passe.
- Il en va de même pour le pré-rendu réservé aux bots vérifiés (cas Lovable) : Decelio conclut « coquille vide » à tort.
- **Faux négatif :** le site a activé « Block AI bots », qui vise les bots *vérifiés*. Le faux GPTBot n'est pas reconnu comme bot IA et passe, alors que le vrai est bloqué. Decelio conclut « OK » à tort.
- **Conséquence importante :** le blocage le plus courant (le bouton Cloudflare « Block AI bots ») est **invisible depuis l'extérieur**. Seul un accès aux logs, ou à l'API Cloudflare en lecture seule, le révèle.
- *Correction de §5 :* le Bot Fight Mode laisse passer les bots vérifiés. Ce qui bloque vraiment les bots IA légitimes, ce sont le bouton « Block AI bots », les règles WAF sur mesure, les plugins (Wordfence) et `robots.txt`.

### 3.3 Architecture de mesure recommandée

| # | Contrôle | Fiabilité |
|---|---|---|
| 1 | Analyse de `robots.txt` par jeton de bot, conforme à la RFC 9309 (le groupe le plus spécifique l'emporte) | Certaine |
| 2 | Requête honnête (`DecelioBot/1.0 (+https://decelio…)`) : statut, en-tête `cf-mitigated: challenge`, page « Just a moment… » / Turnstile, redirections suivies et revalidées contre le SSRF | Certaine |
| 3 | `meta robots`, `X-Robots-Tag`, `noindex`, `canonical` | Certaine |
| 4 | Écart entre le texte du HTML brut et celui du rendu headless, sous forme de score de *dépendance au JavaScript* (pas « ce que voit GPTBot ») | Probable |
| 5 | Test avec User-Agent imité, **étiqueté** « requête non vérifiée se présentant comme X », jamais « ce que voit GPTBot » | Indicatif |
| 6 | **Intégration Cloudflare en lecture seule** (AI Crawl Control, analytics) ou import de logs : vraies visites des bots vérifiés, vrais blocages | Certaine, mais nécessite l'accès du client |
| 7 | Registre daté des User-Agents et des plages IP publiées, mis à jour chaque semaine | Hygiène |

- **Le rapport doit afficher trois scores distincts :** politique `robots.txt`, risque de blocage à l'accès, dépendance au JavaScript. Pas un « score de visibilité IA » unique qui mélange tout.
- **L'intégration Cloudflare (n°6)** est la fonctionnalité payante la plus défendable. C'est la seule qui voit les vrais blocages, et l'agence qui gère le compte Cloudflare du client peut la brancher en 2 minutes.

*Limite : l'agent de recherche n'a pas pu ouvrir directement les pages OpenAI, Anthropic et Cloudflare (réseau bloqué). Ces constats reposent sur les extraits de recherche qui citent ces pages. La publication des plages IP d'Anthropic reste à vérifier.*

---

## 4. Marché (France d'abord)

| Donnée | Valeur | Source |
|---|---|---|
| Prestataires web référencés (La Fabrique du Net) | > 1 500, dont 803 agences « création de site » | [lafabriquedunet.fr](https://www.lafabriquedunet.fr/agences/pages/agences-web) |
| Développeurs web freelances sur Malt | ~10 000 profils « développement web » (39 800 développeurs au total) | [malt.fr](https://www.malt.fr/a/freelance/tech) |
| Agences Webflow / Framer / Bubble en France | 13–27 / ~9 / 7–11 dans les classements | [La Fabrique du Net](https://www.lafabriquedunet.fr/agences/pages/agences-webflow), [closefuture.io](https://www.closefuture.io/blogs/top-framer-development-agencies-france), [impli.fr](https://www.impli.fr/post/agence-no-code-france) |
| Prix d'un audit GEO | 1 240 à 5 000 € HT | [wecomm.fr](https://wecomm.fr/tarifs-geo/) |
| Abonnement GEO mensuel | dès 800 €/mois, courant 950 à 5 000 €/mois | [developr.fr](https://www.developr.fr/blog/geo/tarifs-agence-geo) |
| Maintenance WordPress | freelance 30–80 €/site/mois ; agence 100–500 €/site/mois | [adrienbouchez.fr](https://adrienbouchez.fr/tarif-maintenance-wordpress-2026/) |
| Rétention des contrats de maintenance WP | 85 % contre 52 % pour les projets ponctuels | [Codeable](https://www.codeable.io/blog/wordpress-website-maintenance-cost/) |

**Lecture :**
- Le budget existe déjà chez les 2 cibles retenues. À 99 €/mois, Decelio représente moins de 10 % d'un abonnement GEO, et moins de 5 €/site pour une agence WordPress qui facture 30–80 €/site.
- Le vivier no-code français se compte en dizaines d'agences. Même à 100 % de conversion, il ne paie pas un SMIC.
- Estimation (non sourcée) : il existe plusieurs centaines d'agences SEO en France qui ont ajouté une offre GEO en 2025–2026. Aucun décompte officiel n'existe, seulement des classements de 10 à 27 noms ([agencegeo.pro](https://agencegeo.pro/)).

---

## 5. Choix de la cible

Notation de 1 à 5 sur cinq critères (5 = favorable), soit 25 au maximum.

| Cible | Douleur | Fréquence | Prix accepté | Accès | Concurrence | **Total** | Verdict |
|---|---|---|---|---|---|---|---|
| Agences de maintenance WordPress | 4 | 4 | 3 | 4 | 4 | **19** | Tête de pont |
| Agences SEO/GEO | 3 | 3 | 5 | 4 | 3 | **18** | Tête de pont, en parallèle |
| Créateurs Lovable / Bolt / Replit | 5 | 2 | 2 | 3 | 3 | 15 | Non : défaut ponctuel, Lovable l'a corrigé gratuitement |
| Équipes marketing internes PME / e-commerce | 2 | 2 | 3 | 2 | 3 | 12 | Non |
| Hébergeurs / plateformes (B2B2B) | 2 | 2 | 5 | 1 | 1 | 11 | Non : Cloudflare le fait déjà avec GoDaddy |
| **Agences no-code (cible actuelle)** | 1 | 1 | 1 | 3 | 3 | **9** | **Abandonner** |

**Preuves principales :**
- **WordPress.** Cloudflare a bloqué les bots IA par défaut sur les nouveaux domaines à partir de juillet 2025, et les refus opposés à GPTBot et ClaudeBot dépassent 22 % ([digitalapplied](https://www.digitalapplied.com/blog/ai-crawler-bot-traffic-statistics-2026-data-reference)). Les réglages anti-bots de Wordfence ralentissent GPTBot, ClaudeBot et PerplexityBot, et il n'existe pas de liste blanche IA ([powerfulcombo](https://powerfulcombo.com/blog/wordfence-ai-bots/)). Les protections de Hostinger bloquent aussi ([stonegatewebsecurity](https://stonegatewebsecurity.com/articles/hostinger-bot-protection-blocking-ai-crawlers/)), de même que les WordPress managés ([Search Engine Land](https://searchengineland.com/managed-wordpress-blocking-ai-bots-476510)). Yoast propose un blocage GPTBot en un clic ([yoast.com](https://yoast.com/features/bot-blocker/)). *Réserve : une partie de ces sources sont des blogs. Le comportement exact de Cloudflare est traité au §3.*
- **SEO/GEO.** Les outils de visibilité IA sont une catégorie payante établie : Otterly à 29 $, Peec AI à 89 €, Profound à 499 $/mois ([aiaethon](https://aiaethon.com/geo-software-pricing/)). Ils mesurent la présence dans les *réponses*, pas la *lisibilité technique*. Decelio vient donc en complément.
- **Lovable.** Depuis le 13 mai 2026, les nouveaux projets sont rendus côté serveur, et les anciens sont pré-rendus pour les bots vérifiés, gratuitement sur tous les plans ([docs Lovable](https://docs.lovable.dev/features/seo-aeo)). Un concurrent l'écrit lui-même : « you don't need to prerender your Lovable site anymore » ([lovableseo.ai](https://lovableseo.ai/blog/you-dont-need-to-prerender-your-lovable-site-anymore)). Bubble reste mal servi ([forum Bubble](https://forum.bubble.io/t/frustration-with-bubbles-seo-and-dynamic-rendering/354113)), mais c'est un marché d'applications, pas de sites vitrines.

### Et les indépendants / business en ligne ?

- **Plateformes :** Shopify, Wix, Webflow et Framer sont rendus côté serveur et autorisent les bots IA par défaut ([Framer](https://www.framer.com/help/articles/make-site-readable-by-ai-agents/)). Squarespace a une case « Block known AI crawlers », désactivée par défaut ([squareranked](https://squareranked.com/squarespace-ai-search/ai-crawlers/)). Des marchands Shopify ont bloqué les bots eux-mêmes en 2023–2024 ([craftshift](https://craftshift.com/dont-block-ai-bots-shopify-robots-txt/)).
- **Demande :** elle est formulée en termes de recommandation (« ChatGPT me recommande-t-il ? »), jamais en `robots.txt`.
- **Concurrence déjà en place :** HubSpot AI Search Grader (gratuit), Rankscale (dès 20 $), Otterly (29 $), HubSpot AEO (49 €), Hikoo (gratuit puis 69 €), Botrank (75 €), Semrush AI (99 $) ([seo.fr](https://www.seo.fr/blog/outils-geo-comparatif-solutions-ia), [otterly.ai](https://otterly.ai/pricing), [semrush.com](https://www.semrush.com/pricing/ai/)).
- **Verdict :** pas avec le produit actuel. C'est viable seulement si Decelio devient « ChatGPT vous recommande-t-il ? + liste de corrections » à 19–39 €/mois. On arriverait alors tard sur un marché encombré, avec beaucoup de résiliations. C'est l'option de repli du §13, pas le plan A.

---

## 6. Profil client idéal (ICP)

### 6.A Agences de maintenance WordPress

| Critère | Idéal | Signal d'alerte |
|---|---|---|
| Taille | 1–10 personnes, souvent freelance senior | Moins de 10 sites en contrat |
| Portefeuille | 20–150 sites sous contrat mensuel | Seulement des projets ponctuels |
| Offre | Maintenance (mises à jour, sauvegardes, sécurité) facturée 30–500 €/site/mois | Aucun reporting client formalisé |
| Outils | WP Umbrella, ManageWP, MainWP, Wordfence, Cloudflare, o2switch / Hostinger / SiteGround | E-commerce Shopify pur |
| Géographie | France, puis Belgique, Suisse et Québec (francophones) | — |

- **Déclencheurs :** migration d'hébergeur, activation de Cloudflare ou du mode « Under Attack », mise à jour de Wordfence, client qui demande « pourquoi ChatGPT ne parle pas de nous ? ».
- **Douleurs, dans leurs mots :**
  - « Je découvre après coup que l'hébergeur a bloqué des trucs. »
  - « Mes clients pensent que la maintenance, ce n'est que des mises à jour. »
  - « Je ne peux pas vérifier 60 sites à la main. »
- **Persona, « Sophie » :** freelance maintenance WP, 45 sites, ex-salariée d'agence. Elle vend de la tranquillité. Elle fréquente WP Marmite et les groupes Facebook WordPress FR. Son indicateur : le taux de renouvellement des contrats.

### 6.B Agences SEO/GEO

| Critère | Idéal | Signal d'alerte |
|---|---|---|
| Taille | 1–15 personnes | Agence 100 % SEA ou réseaux sociaux |
| Portefeuille | 15–60 clients en abonnement | Audits ponctuels uniquement |
| Offre | SEO + nouvelle offre « référencement IA / GEO » | Pas d'offre GEO prévue |
| Outils | Semrush / Ahrefs, Search Console, Screaming Frog, Looker Studio | Outil de crawl IA maison |

- **Déclencheurs :** lancement d'une offre GEO, client qui demande sa visibilité dans ChatGPT, refonte en JavaScript, perte d'un client après un audit raté.
- **Douleurs :**
  - « Je ne sais pas packager le GEO, il me faut un livrable propre. »
  - « Le client a mis Cloudflare et je dois comprendre vite. »
  - « Mes rapports mensuels sont faits à la main. »
- **Persona, « Julien » :** fondateur d'une agence SEO de 3 personnes à Lyon. Il est sous pression pour ajouter « IA » à son offre. Il suit SEOCamp et les groupes LinkedIn SEO FR.

### Grille de qualification rapide (60 secondes)

1. Gère au moins 15 sites en abonnement mensuel ? (O/N)
2. Vend de la maintenance ou du SEO/GEO récurrent ? (O/N)
3. Au moins un de ses sites clients a un problème **vérifié** (§3) ? (O/N)
4. Envoie déjà un rapport mensuel au client ? (O/N)
5. Décideur joignable (fondateur ou freelance) ? (O/N)

5 oui : priorité A. 3–4 oui : B. Moins de 3 : ne pas prospecter.

### Anti-ICP (ne pas vendre)

- Agences no-code Webflow / Framer : pas de problème récurrent.
- Freelances sans portefeuille récurrent.
- Clients qui **veulent** bloquer les bots IA (presse, contenus payants). Pour eux, Decelio devient un outil de vérification du blocage. C'est un autre produit, à garder pour plus tard.
- Grandes agences avec leur propre outillage (cycles longs).
- Sites 100 % Shopify ou Wix : peu de risque technique.

> **Décision du fondateur (28/09/2026) : la cible est élargie à toute agence ou freelance qui maintient des sites clients ou fait leur SEO de façon récurrente, quel que soit l'outil (WordPress, Wix, Shopify, Webflow, PrestaShop, sur mesure).** Les exclusions « agences no-code » et « sites 100 % Shopify ou Wix » ci-dessus sont levées pour le message et le site. Les autres exclusions restent. La prospection active garde sa règle : on n'écrit qu'avec un problème vérifié, et on commence là où il est le plus fréquent (WordPress). Le baromètre v2 inclut des sites Wix, Shopify et Webflow pour mesurer la fréquence réelle par plateforme ; le constat de rareté ci-dessus reste une hypothèse jusqu'à cette mesure.

---

## 7. Concurrence

| Outil | Vérifie l'accès des bots IA | Surveillance + alertes | Marque blanche | Prix |
|---|---|---|---|---|
| WP Umbrella, ManageWP, MainWP, WP Remote, Jetpack | **Non** | Oui (disponibilité, sauvegardes) | Oui (sauf Jetpack) | Par site / plans agence |
| Wordfence, Yoast, Rank Math | Non (Wordfence peut au contraire *bloquer* les bots IA) | — | Non | Gratuit / payant |
| Screaming Frog | Partiel : on change l'User-Agent à la main | Non (crawl ponctuel) | Non | 199 £/an |
| Semrush Site Audit | Partiel : signale les pages bloquées aux bots IA | Crawls planifiés | Non | ~140 $/mois (Guru) |
| Conductor (ex-ContentKing) | **Oui** (« AI Crawler Activity ») | Oui, en temps réel | Grands comptes seulement | Sur devis |
| Little Warden | Indirect : alerte sur les changements de `robots.txt` | Oui (Slack) | Oui | Dès 24,99 £/mois |
| Profound | **Oui** (robots.txt contre 40+ bots, et analyse de logs) | Oui | Non | Grands comptes |
| Peec AI | **Oui** (même type d'audit) | Oui | Limitée | SaaS milieu de gamme |
| Otterly | Partiel (citations « bloquées ») | Oui (citations) | Non | Dès 29 $ |
| Checkers gratuits (Swetrix, LLM Pulse, AI Crawl Test…) | Oui, en ponctuel | **Non** | Non | Gratuit |
| Cloudflare AI Crawl Control | Oui (vrais bots vus dans les logs) | Tableau de bord | **Pas de vue multi-clients** | **Gratuit**, sites Cloudflare seulement |
| BabyLoveGrowth.ai | Partiel : « audit GEO » technique (schéma, métadonnées) plutôt qu'un contrôle quotidien multi-bots dédié | À vérifier : suivi de citations (ChatGPT, Perplexity, Gemini), pas d'alerte de régression documentée | À vérifier (non confirmé dans les sources consultées) | 99 à 399 $/mois (plans « business ») ; **plan agence dès 99 $/site/mois** |

Sources : [Conductor](https://www.conductor.com/platform/features/ai-crawler-activity/), [Profound](https://www.tryprofound.com/features/agent-analytics/crawlability), [Peec](https://docs.peec.ai/crawlability), [Cloudflare](https://developers.cloudflare.com/ai-crawl-control/), [Little Warden](https://littlewarden.com/pricing), [Screaming Frog](https://www.screamingfrog.co.uk/log-file-analyser/tutorials/monitor-ai-bots-in-the-log-file-analyser/), [Search Engine Land](https://searchengineland.com/managed-wordpress-blocking-ai-bots-476510), [BabyLoveGrowth pricing](https://www.babylovegrowth.ai/en/pricing) (page officielle, consultée le 28/09/2026 via des revues tierces — à revérifier directement avant toute citation publique).

*Note sur BabyLoveGrowth : produit surtout orienté génération de contenu automatisée (articles quotidiens, backlinks via un réseau de +4 000 sites partenaires) et suivi de citations IA, pas un moniteur quotidien d'accès des robots par `robots.txt`. Son « audit GEO » touche des facteurs techniques proches (schéma, métadonnées), d'où le chevauchement partiel. Sa tarification à l'agence (99 $/site/mois) est structurellement la plus proche de celle de Decelio parmi tous les concurrents listés ici — à surveiller en priorité si elle ajoute un contrôle `robots.txt` par bot.*

**Espace libre :** aucun produit ne réunit à la fois (1) un contrôle quotidien multi-bots (`robots.txt`, pare-feu, page vide), (2) des alertes, (3) un rapport mensuel en marque blanche et (4) un tableau de bord multi-clients, **à un prix d'agence**.
- Profound et Peec ont le moteur d'audit, mais l'enferment dans des suites chères de suivi de citations.
- Les outils de maintenance WordPress ont la marque blanche et le multi-clients, mais aucune logique IA.
- Les checkers gratuits font un scan ponctuel, sans suivi.

**Menaces, capables de copier en quelques semaines :**
1. **WP Umbrella et ManageWP.** Ils ont déjà le tableau de bord, les alertes et la marque blanche. Il leur suffit d'ajouter un module. *C'est la menace n°1 sur le segment WordPress.* Parade : aller vite, ou leur proposer un partenariat (API).
2. **Peec AI et Profound.** Ils ont déjà le moteur. Il leur manque un planificateur et un PDF en marque blanche.
3. **Little Warden.** Il surveille déjà `robots.txt` pour les agences. Il lui suffit d'étendre ses règles aux bots IA.
4. **BabyLoveGrowth.ai.** Structure tarifaire agence (99 $/site/mois) la plus proche de Decelio de toute la liste. Vend déjà à des agences un « audit GEO » technique. Il lui manque un contrôle quotidien `robots.txt` par bot et des alertes de régression — mais son moteur de contenu et de citations est déjà en place, et l'ajout serait rapide pour une équipe outillée.

**Conséquence :** l'avantage de Decelio ne tiendra pas sur la détection seule, qui sera copiée. Il tiendra sur **(a)** le diagnostic de la *cause* (quelle règle Cloudflare, quel plugin, quel hébergeur) avec la correction pas à pas, **(b)** le rapport client en français et en marque blanche, et **(c)** la distribution : baromètre, communautés WordPress et SEO françaises. Un partenariat ou un rachat par un outil de maintenance WP est une sortie crédible.

---

## 8. Prix

Principe (skill `pricing`) : l'unité de valeur reste **le site surveillé**. Elle suit la valeur pour l'agence, elle est simple, et on ne peut pas la contourner. On fixe le prix entre l'alternative (le contrôle manuel ou un outil gratuit ponctuel) et la valeur perçue (un contrat de maintenance ou GEO conservé).

| Plan | Prix | Contenu | Pour qui |
|---|---|---|---|
| Scan libre | 0 € | 1 URL à la demande, verdict par bot, sans historique | Aimant à prospects, accessible sans compte |
| Freelance | 39 €/mois | 10 sites, scan quotidien, alertes e-mail | Freelance WP qui démarre |
| **Agence** (recommandé) | **99 €/mois** | 30 sites, alertes Slack et webhook, **rapport mensuel PDF en marque blanche** | Cœur de cible |
| Studio | 249 €/mois | 100 sites, plusieurs utilisateurs, API, domaine de rapport personnalisé | Agences de 50 à 150 sites |
| Au-delà | 2 €/site/mois | — | Grosses flottes WordPress |

- **Annuel :** 2 mois offerts.
- **Offre fondatrice :** −50 % à vie pour les 10 premières agences, en échange d'un retour écrit mensuel (5 questions par e-mail) et d'une étude de cas.
- **Pourquoi 30 sites et non 20 au plan Agence :** l'agence WP type gère 20–150 sites. À 20, le plan paraît juste, et on pousse l'agence vers des arbitrages au lieu de l'adoption.
- **Pourquoi pas 9 € :** la leçon de tes propres docs tient toujours. Les petits prix attirent des clients qui partent vite et donnent de faux signaux.
- **Refacturation :** la page de prix doit dire « **refacturez 10 à 20 €/site** dans votre contrat ». L'agence gagne de l'argent avec Decelio. C'est l'argument central.
- **Code :** les plans `SOLO / PRO / SCALE` de `lib/billing/plans.ts` correspondent déjà à Freelance / Agence / Studio. Il suffit de créer les prix Stripe.

---

## 9. Positionnement et message

- **Catégorie :** monitoring de lisibilité IA pour portefeuilles de sites (pas « outil GEO », pas « scanner »).
- **Promesse :** « Sachez avant votre client si ChatGPT, Claude ou Perplexity ne peuvent plus lire son site. Et prouvez-lui chaque mois que vous veillez. »
- **Ennemi nommé :** les blocages silencieux (Cloudflare, plugins de sécurité, pare-feu d'hébergeurs, mise à jour de plugin).
- **Preuve :** une capture « avant / après » par site, datée, avec la cause identifiée (règle Cloudflare, `robots.txt`, plugin).
- **À retirer de la landing :** proxy, middleware, « Managed Fix », A/B testing SEO, et toute promesse de « visibilité » (nombre de citations) tant que le produit ne la mesure pas.

---

## 10. Acquisition et marketing (budget proche de 0 €)

Classés par rapport effet / effort pour un fondateur solo.

1. **Baromètre public « Les sites français bloquent-ils ChatGPT ? ».**
   - **Échantillon :** 300–500 sites (top e-commerce et médias FR), plus 100 sites d'agences SEO/GEO.
   - **Accroche :** « Les agences qui vendent du GEO bloquent-elles ChatGPT sur leur propre site ? ».
   - **Diffusion :** LinkedIn fondateur, JDN, BDM, Presse-citron, r/SEO, WebRankInfo.
   - **Critère d'arrêt :** moins de 5 backlinks qualifiés.
   - **Condition :** méthode du §3 corrigée avant publication.
2. **Prospection appuyée sur des preuves.** On scanne le portefeuille visible d'une agence (réalisations, études de cas), puis on lui écrit avec un constat vérifié. Séquence en 3 e-mails à J0, J+4 et J+9 (voir `06-kit-prospection.md`). Critère d'arrêt : moins de 3 % de réponses sur 100 envois.
3. **Scan gratuit amélioré.** Il doit accepter les redirections (P1) et afficher un verdict par bot avec la cause. Il permet d'exporter un PDF « à envoyer à mon client », avec le logo Decelio. Critère d'arrêt : moins de 20 scans par semaine après 6 semaines.
4. **Contenu SEO pour agences :** « Cloudflare bloque-t-il ChatGPT sur votre site ? », « Wordfence et les bots IA », « GPTBot, OAI-SearchBot, ChatGPT-User : lequel autoriser ? », « Checklist GEO technique pour agence ».
5. **Marketplaces :**
   - Plugin WordPress.org en lecture seule, qui vérifie la configuration locale et renvoie vers Decelio ([guide de soumission](https://freemius.com/blog/submit-plugin-wordpress-repository/)).
   - Chrome Web Store, 5 $ d'inscription ([doc](https://developer.chrome.com/docs/webstore/publish/)).
   - Framer et Webflow : non prioritaires, car ce ne sont plus les cibles.
6. **Programme partenaire :** 20 % récurrents pour les formateurs WordPress et SEO, et pour les communautés du type WP Marmite ou SEOCamp.
7. **Product Hunt et Indie Hackers :** une seule fois, après le baromètre, pour le marché anglophone.

---

## 11. Plan 90 jours

| Semaines | Priorité | Livrables | Indicateur |
|---|---|---|---|
| 1–2 | **Débloquer la mesure** | P1 à P8 corrigés, architecture du §3, 20 cas de test réels | 0 faux positif sur 50 sites vérifiés à la main |
| 3–4 | **Fondations commerciales** | Landing réécrite (§9), plans Stripe (§8), rapport PDF en marque blanche, page de prix « refacturez » | Scan gratuit → inscription ≥ 10 % |
| 3–5 | **Baromètre** | Scan de 400–600 sites, article, visuels, 10 envois presse | ≥ 5 backlinks, ≥ 300 scans gratuits |
| 5–8 | **Prospection** | 150 agences scannées et contactées par écrit (75 WP, 75 SEO/GEO), essais en autonomie | ≥ 5 % de réponses, ≥ 15 essais |
| 9–12 | **Accélérer** | 10 agences payantes, 2 études de cas, plugin WP.org soumis, programme partenaire | **~1 000 € MRR**, résiliation < 5 %/mois |

**Décision à la semaine 6 :** on compare les taux de réponse et d'essai entre WordPress et SEO/GEO, puis on concentre tout sur le meilleur segment.

---

## 12. Économie unitaire (hypothèses)

- **Coût de service par agence (30 sites, 8 bots, scan quotidien) :** environ 7 200 requêtes HTTP et 900 rendus headless par mois, soit **moins de 5 €**. Marge brute > 90 %.
- **Hypothèse ARPA :** 110 €. **Hypothèse de résiliation :** 4 %/mois (produit « assurance » vendu à des PME). Durée de vie ≈ 25 mois, **LTV ≈ 2 600 €**, CAC maximal pour un ratio 3:1 ≈ 870 €.
- **Paliers :** 1 000 € de MRR ≈ 10 agences. 10 000 € ≈ 90 agences, ce qui demande le marché francophone complet ou l'anglophone. 100 000 € ≈ 900 agences, ce qui demande les États-Unis et un canal partenaire.
- **Risque n°1 : la résiliation.** Quand rien ne casse pendant 3 mois, l'agence se demande pourquoi elle paie. Le **rapport mensuel en marque blanche** crée une valeur visible chaque mois, même sans incident. C'est la fonctionnalité anti-résiliation n°1.

---

## 13. Risques, critères d'arrêt et plan B

| Risque | Probabilité | Parade |
|---|---|---|
| Problème trop rare (peu de sites réellement bloqués) | Moyenne | Mesurer pendant le baromètre. **Si < 5 % des sites ont un problème vérifié, passer au plan B.** |
| Cloudflare ou les plateformes rendent l'information gratuite (AI Crawl Control, partenariat GoDaddy) | Élevée à 12–24 mois | Vendre le **portefeuille multi-hébergeur + rapport client**, que Cloudflare ne fera pas pour une agence |
| Faux positifs de mesure | Élevée aujourd'hui | Architecture du §3 ; jamais d'alerte sans cause identifiée |
| Semrush, Ahrefs ou les outils de maintenance WP ajoutent un check IA | Moyenne | Vitesse, spécialisation, marque blanche, français |
| Résiliation « assurance » | Élevée | Rapport mensuel, historique, score de portefeuille, alertes sur les changements de `robots.txt` |

**Plan B (si le critère d'arrêt tombe) :** élargir vers la **visibilité IA pour agences**, en marque blanche (le client est-il cité, face à qui). Le dépôt contient déjà une base : `lib/analysis/mention-detector.ts`, `lib/scoring/share-of-voice.ts`, `lib/prompts/query-generator.ts`. Le scan technique devient alors le module gratuit d'entrée.

**Décisions prises (24 septembre 2026) :**
0. **Budget : 0 €, autofinancement à 100 %.** Aucune dépense fixe avant le premier revenu. Toute la pile technique et marketing repose sur des offres gratuites qui autorisent un usage commercial. Une dépense n'est engagée qu'une fois couverte par le MRR.
1. **Rendu headless : 0 €.** Le moteur mesure le HTML brut (texte utile, racine SPA vide, `noscript`). Le rendu Playwright reste optionnel, et ne tourne que s'il est hébergé gratuitement. Aucun service payant avant que le MRR ne le finance.
2. **Vente 100 % écrite, sans appel.** L'essai est gratuit et sans carte, avec onboarding en autonomie. *(Remplacé le 27/09 par l'ADR-002 : essai de 14 jours avec carte demandée dès le départ. La vente reste 100 % écrite.)* La découverte se fait par un questionnaire de 5 questions envoyé par e-mail (voir `06-kit-prospection.md` §5). Une démo écrite remplace la démo en direct : un exemple de rapport en marque blanche en PDF et une page « visite guidée ». Conséquence : le cycle de vente est plus long, la conversion plus faible. D'où l'objectif de 15 essais au lieu de 15 démos.
3. **Nom : on garde « Decelio ».** Il reste juste si le plan B (visibilité IA) arrive, et changer de nom coûte du temps. La promesse précise vient du slogan : « Decelio — la lisibilité IA de tout votre portefeuille client ».

---

## Sources

Voir les liens en ligne dans chaque section. Données non sourcées = estimations explicitement signalées.
