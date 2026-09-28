# Relecture du rapport P5 — Acquisition à 0 € — 28/09/2026

Rapport relu : « Stratégie Acquisition B2B Sans Budget » (Gemini Deep Research, Google Drive, 27/09/2026 22:45).
Relecture faite contre `CLAUDE.md`, `.agents/product-marketing.md`, `docs/recherches/2026-09-27-relecture.md` et l'ADR-002.
Ce rapport complète la série P1 à P4. Il a été lancé avec le prompt v3, pas avec la version v4 (`../prompts-gemini-v4.md`).

## À retenir (utile et plausible)

- **La méthode centrale est confirmée** : partir de la page « réalisations » d'une agence, lancer un diagnostic sur un site client, écrire avec un constat précis et le correctif. L'offre du premier e-mail est le correctif gratuit, pas le logiciel. C'est notre canal n° 1.
- **Sources de prospects à 0 € et sans scraping** : pages partenaires d'hébergeurs et d'outils (Rocket.net, WP Umbrella, ToggleWP, Weglot, Elementor), annuaires Sortlist et Trustfolio consultés à la main. Malt et LinkedIn servent à repérer une agence, puis on la contacte hors plateforme. **On ne scrape rien** : c'est interdit par les CGU et contraire au budget 0 €.
- **Signaux qui qualifient une agence** : offre de maintenance ou d'infogérance WordPress, offre SEO / GEO / AEO, page réalisations qui liste des sites clients.
- **Règles de prospection en B2B** (source CNIL citée, à relire nous-mêmes) : le message doit avoir un lien avec le métier du destinataire, dire d'où vient l'adresse, identifier clairement l'expéditeur, porter un objet non trompeur, et proposer une opposition simple dans chaque e-mail. Tenir une liste des oppositions séparée de toute autre liste.
- **Repères de réponse** : les chiffres viennent d'éditeurs d'outils d'envoi (Belkins, Instantly, Lemlist, Woodpecker), qui ont intérêt à les publier. Ce sont des ordres de grandeur internes, **jamais à publier**. On retient seulement ceci : un e-mail personnalisé fait beaucoup mieux qu'un envoi en masse, et on vise plus de 5 % de réponses positives.
- **Critères d'arrêt** : repris tels quels, ils sont bons.
  - Prospection : moins de 3 % de réponses positives après 50 e-mails personnalisés.
  - Réponses dans les communautés : aucun clic après 10 réponses détaillées.
  - Partenariats : 20 refus.
  - Contenu : aucun trafic 90 jours après la publication.
- **La confusion entre robots d'entraînement et robots de recherche** est le meilleur sujet de contenu. OpenAI : GPTBot, OAI-SearchBot, ChatGPT-User. Anthropic : ClaudeBot, Claude-SearchBot, Claude-User. Ce constat recoupe P2 et la relecture du 27/09.
- **Forums WordPress.org** : on n'y fait aucune promotion. On répond dans le fil, sans demander de coordonnées et sans renvoyer vers une offre payante (source : Forum Guidelines de WordPress.org).
- **Plan de 5 h par semaine** : utilisable tel quel dans sa structure, soit 2 h de prospection (5 agences), 1 h 30 de contenu, 1 h de veille et 30 min de partenariats.

## Corrigé après vérification

- **Cloudflare « Block AI Scrapers » activé par défaut sur les offres gratuites** : c'est la même erreur que dans P1 à P4. Le rapport la tire d'un message Reddit (source 37). Le changelog officiel du 01/07/2026 dit autre chose : le blocage vaut pour les nouveaux domaines seulement, sur les pages qui affichent de la publicité, et laisse passer les robots de recherche. Il est aussi désactivable. **L'e-mail n° 2 et l'article n° 1 doivent être réécrits.**
- **Arrêt CJUE Inteligo Media (C‑654/23, 13/11/2025)** : l'arrêt existe bien (EUR-Lex). Il porte sur les e-mails qu'un service envoie à ses propres utilisateurs, pas sur la prospection à froid entre professionnels. Le rapport en tire une règle générale (« la finalité réelle prime »), ce qui est plausible mais reste une extrapolation. À ne pas citer sans l'avis d'un juriste.
- **« Désinscription traitée sous 72 heures »** et **« l'absence d'analyse d'intérêt légitime suffit à caractériser une non-conformité »** : ces deux règles viennent de blogs, pas de la CNIL. On les traite comme des bonnes pratiques, sans dire que c'est la loi.
- **« Scraping Google Maps : légal, confiance haute »** : c'est faux dans cette forme. Les sources sont des vendeurs de scrapers, et l'affaire hiQ contre LinkedIn s'est finalement conclue en défaveur de hiQ (2022). Écarté.
- **« 20 à 50 e-mails par jour »** : c'est trop pour une boîte neuve et un fondateur seul. Le plan du même rapport prévoit d'ailleurs 5 e-mails par semaine, et c'est ce plan qu'on garde. Il faut envoyer depuis une boîte personnelle, jamais depuis le sous-domaine d'envoi Resend du transactionnel. P6 (v4) tranche ce point.
- **Les 15 requêtes de veille** : `AND` n'est pas un opérateur Google. Il faut l'enlever, les mots sont déjà combinés par défaut. `OR` fonctionne. Les requêtes restent utilisables après ce nettoyage.
- **ChatGPT-User et robots.txt** : OpenAI indique que ce robot agit à la demande d'un utilisateur. Il faut vérifier sur `platform.openai.com/docs/bots` si les règles du robots.txt s'appliquent encore à lui avant de l'écrire dans un article (page inaccessible lors de cette relecture).

## À ne pas reprendre (contraire à nos règles)

La séquence de 3 e-mails n'est pas utilisable en l'état. Les problèmes :
- **Objet « Le site [client] est illisible pour ChatGPT »** : c'est une affirmation que nous ne pouvons pas prouver. Nous imitons un User-Agent, ce qui donne un indice et non une preuve. L'objet expose aussi le nom du client de l'agence sur un défaut.
- **« L'analyse réseau indique… les pages renvoient une erreur 403 à l'IA »** : cela prétend voir ce que voit le robot. Il faut écrire : « quand notre outil se présente comme ChatGPT-User, le serveur répond 403 ; c'est un indice fort, pas une certitude. »
- **« Empêche le site d'être cité en source »** : c'est l'angle des citations, abandonné au pivot. On parle de lecture, jamais de citation.
- **« Cela prend deux minutes »** : c'est invérifiable.
- **« Seriez-vous ouvert à échanger »** : cela sous-entend un appel. Notre vente est 100 % écrite, donc on propose une réponse écrite ou un lien.
- **E-mail n° 3** : il joue sur la peur de rater quelque chose et parle de « rapports de conformité », ce qui est faux. Il annonce aussi un « essai libre », alors que l'essai demande une carte (ADR-002).
- **Titres d'articles** : « vérificateur ultime » (n° 8) et « détruit la visibilité GEO » (n° 2) sont à retirer. L'article n° 4 (« Comment vérifier si Perplexity lit votre site ? ») peut rester, à condition de dire qu'il faut lire les journaux du serveur et que nous ne pouvons pas le savoir de l'extérieur.
- **Hébergeurs** : les démarcher « avec une documentation prouvant que leurs règles génèrent des faux positifs » demande des preuves réelles. On attend donc le baromètre, sans affirmation avant.
- **Sollicitation d'une agence avant le SIREN** : prospecter des testeurs est possible, vendre ne l'est pas. Tant qu'il n'y a pas de SIREN, l'e-mail n° 3 renvoie vers le diagnostic gratuit, pas vers l'essai payant.

## Manques du rapport

- Les 3 exemples de réponse utile dans une communauté n'ont pas été produits (demandés dans le prompt v4 seulement).
- Pas de règle d'autopromotion détaillée par subreddit ni par groupe LinkedIn. P3 du 27/09 en donnait une partie.
- La liste des partenaires est mince, et aucune page partenaire o2switch n'est sourcée. À vérifier à la main.

## Proposition de séquence corrigée (à valider par Kamal)

**J0 — Objet : Une question sur le site [domaine du client]**
> Bonjour [Prénom],
> J'ai trouvé [domaine] dans les réalisations de [Agence]. En le testant avec notre outil, qui se présente comme le robot de ChatGPT (ChatGPT-User), le serveur répond 403, alors qu'un navigateur normal passe. D'après les en-têtes, la cause probable est [Cloudflare / Wordfence / l'hébergeur]. C'est un indice, pas une certitude : seuls vos journaux le confirment.
> J'ai rédigé le correctif pas à pas. Voulez-vous que je vous l'envoie ici ?
> Kamal, fondateur de Decelio (outil en test)
> J'ai trouvé votre adresse sur [page source]. Pour ne plus recevoir de message de ma part, répondez « stop ».

**J+4 — même fil**
> Bonjour [Prénom], je me permets une relance. Ce type de blocage passe souvent inaperçu, car un humain voit le site normalement : seules les requêtes des robots sont filtrées. Le correctif est prêt si vous le voulez. C'est pour vérifier cela chaque jour sur tout un parc de sites que je construis Decelio.

**J+9 — même fil**
> Dernier message de ma part. Si le sujet revient, le diagnostic gratuit est sur decelio.fr, sans compte. Bonne continuation à [Agence].

## Décisions proposées (à valider par Kamal)

1. Adopter la séquence corrigée ci-dessus, à 5 agences par semaine, avec un suivi dans un tableau (agence, source de l'adresse, date, réponse, opposition).
2. Rédiger en premier les articles n° 2 (GPTBot, OAI-SearchBot, ChatGPT-User), n° 3 (Wordfence) et n° 5 (robots.txt), qui n'ont pas besoin du baromètre. Le n° 1 (Cloudflare) sera réécrit à partir du changelog officiel.
3. Garder les 15 requêtes de veille après avoir retiré les `AND`, et les ajouter à `docs/06-kit-prospection.md`.
4. Mettre à jour `.agents/product-marketing.md` : canaux validés, critères d'arrêt, règle « pas de prospection vendeuse avant le SIREN ».
