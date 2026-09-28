# Kit de prospection — Decelio

> Complément de `05-analyse-strategique.md`. Règle absolue : **n'envoyer un constat que s'il est vérifié** avec la méthode du §3 (cause identifiée, capture datée). Un faux constat envoyé à une agence SEO est irrécupérable.

## 1. Où trouver 150 prospects

| Segment | Source | Requête / filtre |
|---|---|---|
| Maintenance WP | Malt | « développeur WordPress » + « maintenance », France |
| Maintenance WP | Google | `"contrat de maintenance WordPress" agence OR freelance` + ville |
| Maintenance WP | LinkedIn | `"maintenance WordPress"` dans le titre, 1–10 salariés, France |
| Maintenance WP | Communautés | WP Marmite, groupe Facebook « WordPress France », WordCamp Paris (liste des sponsors) |
| SEO/GEO | Google | `"agence" "référencement IA" OR "GEO" OR "IA générative"` + Paris / Lyon / Nantes / Bordeaux |
| SEO/GEO | Classements | [agencegeo.pro](https://agencegeo.pro/), La Fabrique du Net (catégorie SEO), membres SEOCamp |
| SEO/GEO | Malt | « consultant SEO », niveau expert |

**Préparation par prospect (10 minutes) :**
1. Relever 5 à 10 sites clients dans « Réalisations » ou « Études de cas ».
2. Les scanner avec Decelio.
3. Garder uniquement les constats vérifiés.
4. Noter le prénom du fondateur.

## 2. Séquence e-mail — agences de maintenance WordPress

**J0 — Objet : `[site-client.fr] et ChatGPT`**

> Bonjour [Prénom],
>
> En regardant vos réalisations, nous avons testé [site-client.fr] : [son `robots.txt` interdit OAI-SearchBot, le robot qui permet d'être cité dans ChatGPT / le site renvoie une page de challenge aux robots / la page d'accueil est vide sans JavaScript]. Le site reste normal dans un navigateur, donc ni vous ni le client ne le voyez.
>
> Cause probable : [réglage Yoast / `robots.txt` géré par Cloudflare / règle Wordfence / thème JS]. Correction : 5 minutes.
>
> Voici le rapport complet : [lien]. Nous pouvons faire la même vérification sur tout votre parc de maintenance si cela vous intéresse.
>
> L'équipe Decelio
> Decelio · [lien vers les mentions légales] · Pour ne plus recevoir nos messages, répondez simplement « STOP ».

*Toutes les séquences sont signées « L'équipe Decelio » (décision du fondateur, 28/09/2026) et portent la même ligne de pied (identification de l'expéditeur et droit d'opposition, exigés par la CNIL pour la prospection entre professionnels). Envoi à la main depuis `contact@decelio.fr`, 10 à 20 par jour, jamais par Resend ni par l'application : les conditions de Resend interdisent la prospection à froid.*

**J+4 — Objet : `Une ligne de plus dans votre rapport de maintenance`**

> Une idée pour votre contrat de maintenance : une ligne « lisibilité IA » dans votre rapport mensuel, refacturée 10 à 20 € par site. Decelio la vérifie chaque jour sur tous vos sites et génère le rapport à votre logo. Essai gratuit de 14 jours sur vos propres sites (carte demandée, aucun prélèvement avant la fin de l'essai, résiliable depuis votre espace) : [lien]. Exemple de rapport : [lien PDF].

*Correction du 28/09/2026 : l'ancienne version disait « Beaucoup de freelances WP ajoutent maintenant cette ligne » (affirmation non vérifiée, interdite par la constitution) et « essai sans carte » (faux depuis l'ADR-002, qui demande la carte dès le départ).*

**J+9 — Objet : `Je ferme le dossier`**

> Nous n'insistons pas. Le scan gratuit reste ouvert ici : [lien]. Si un client vous demande un jour pourquoi ChatGPT ne parle pas de lui, vous saurez où regarder.

## 3. Séquence e-mail — agences SEO/GEO

**J0 — Objet : `Votre offre GEO et [site-client.fr]`**

> Bonjour [Prénom],
>
> Vous vendez du référencement IA. Nous avons vérifié [site-client.fr], cité dans vos références : [constat vérifié, avec la cause]. Tant que ce blocage existe, aucun travail de contenu ne pourra être cité par [ChatGPT / Perplexity].
>
> Rapport : [lien]. Decelio surveille ce point chaque jour sur tout un portefeuille et produit un rapport mensuel à votre marque, à glisser dans votre reporting GEO.

**J+4 — Objet : `Le livrable technique de votre offre GEO`**

> Vos outils de visibilité (Semrush, Peec, Otterly…) disent si le client est cité. À notre connaissance, aucun ne vous alerte le jour où un pare-feu ou un plugin l'empêche de l'être. C'est la brique technique qui manque au livrable GEO. Exemple de rapport à votre marque : [lien PDF]. Essai gratuit de 14 jours (carte demandée, aucun prélèvement avant la fin de l'essai) : [lien].

**J+9 :** identique à la séquence WP.

## 4. Objections et réponses

| Objection | Réponse |
|---|---|
| « J'ai déjà Semrush / Screaming Frog. » | Semrush signale des pages bloquées lors d'un audit ponctuel. Screaming Frog demande de changer l'User-Agent à la main. Decelio surveille chaque jour, trouve la cause et vous alerte avant le client. Les outils sont complémentaires. |
| « WP Umbrella / ManageWP fait déjà ça. » | Ils surveillent la disponibilité et les mises à jour. Aucun ne teste ce que reçoivent les bots IA. Faites le test sur un site en 30 secondes. |
| « Mes clients s'en fichent. » | Aujourd'hui, peut-être. Mais le jour où un client demande pourquoi ChatGPT recommande son concurrent, vous avez l'historique et la preuve. En attendant, c'est une ligne qui justifie le prix du contrat. |
| « Le GEO, c'est une mode. » | Justement : c'est la partie *technique* du GEO, celle qui reste vraie quelle que soit la mode. Si le bot ne peut pas lire le site, rien d'autre ne compte. |
| « 99 €, c'est cher. » | Pour 30 sites, c'est 3,30 € par site. Refacturé 10 €, cela vous rapporte environ 200 € par mois. Un plan Freelance à 39 € existe aussi. |
| « Je peux le faire moi-même. » | Oui, pour un site, une fois. Pour 40 sites chaque jour, avec 8 bots, le `robots.txt`, Cloudflare et un rapport client, non. |
| « Pourquoi ne pas simplement utiliser Cloudflare AI Crawl Control ? » | Il est gratuit et excellent, mais seulement pour les sites derrière votre compte Cloudflare, un par un, sans rapport client. Decelio couvre tout le portefeuille, quel que soit l'hébergeur. |

## 5. Découverte par écrit (aucun appel)

Ce questionnaire part automatiquement par e-mail 3 jours après l'inscription à l'essai. On le renvoie aussi à toute agence qui répond à la prospection. Réponse libre, par retour d'e-mail ou via un formulaire (Tally, gratuit).

> Objet : `5 questions pour régler Decelio sur votre parc`
>
> 1. Combien de sites avez-vous sous contrat récurrent, et chez quels hébergeurs ?
> 2. Que contient votre rapport mensuel aujourd'hui ? Combien de temps vous prend-il ?
> 3. Un client vous a-t-il déjà parlé de ChatGPT ou de Perplexity ? Qu'avez-vous répondu ?
> 4. Avez-vous déjà découvert un blocage (Cloudflare, plugin, hébergeur) *après* le client ?
> 5. Que devrait contenir le rapport pour que vous l'envoyiez tel quel à vos clients ?

**Relance offre fondatrice** (seulement si au moins 3 réponses montrent un vrai besoin) :

> Merci pour vos réponses. Vous faites partie des 10 premières agences : −50 % à vie sur le plan Agence si vous activez avant [date]. En échange : un retour écrit par mois et l'autorisation de citer votre agence. Lien : [checkout].

**Démo écrite** : un PDF d'exemple de rapport (client fictif, marqué comme tel) et une page « visite guidée » en 5 captures annotées. Aucune réunion nécessaire.
