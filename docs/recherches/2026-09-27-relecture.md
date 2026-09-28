# Relecture des rapports Gemini Deep Research — 27/09/2026

Rapports relus : P1 marché et concurrence, P2 voix du client, P3 soft launch, P4 lancement.
Manquant : P5 acquisition. Relecture faite contre `docs/05`, `.agents/product-marketing.md` et les règles du projet.

## À retenir (utile et plausible)

- **Ennemi à nommer : le blocage silencieux.** P2 le confirme par des verbatims (surtout anglophones, Reddit avril 2026) : « Cloudflare has been quietly blocking GPTBot and PerplexityBot on my site for months ». Confiance moyenne tant qu'on n'a pas de verbatims français.
- **La confusion entraînement / recherche** est un sujet pédagogique fort : beaucoup bloquent GPTBot pour se protéger et bloquent aussi les robots de recherche sans le savoir. Angle de baromètre et de contenu.
- **Positionnement « déterministe, pas magique »** : les techniciens rejettent le « GEO snake oil » et le llms.txt vendu cher. On vend un contrôle d'infrastructure vérifiable, pas une promesse de citation. Cohérent avec docs/05 §9.
- **Le rapport en marque blanche est l'argument d'achat** (tâche sociale : justifier le forfait de maintenance). Les reproches faits aux rapports ManageWP sont une ouverture.
- **Prix par site** : 3,90 € → 2,49 € par site et par mois, face à des forfaits de maintenance de 50 à 250 €/mois. Argument « coût marginal » à tester.
- **Soft launch** : conciergerie (on lance les diagnostics pour le testeur et on envoie le PDF), questionnaire écrit de 10 questions avec la question Sean Ellis, participation avant promotion, statut « fondateur » pour les 10 premiers.
- **Moment de valeur** : un problème réel découvert dans les 30 secondes d'un diagnostic, avec le correctif.
- **Lancement** : Product Hunt = signal, pas clients (page en anglais, liens nofollow, ne jamais demander de votes). Commencer par AlternativeTo, SaaSHub, Les Pépites Tech, DevHunt, Uneed (gratuit).

## Corrigé après vérification

- **Cloudflare au 15/09/2026** : les rapports disent « bloque GPTBot par défaut ». Faux dans cette forme. Le changelog officiel dit : nouveaux domaines seulement, robots d'entraînement et agents bloqués **sur les pages qui affichent de la publicité**, robots de recherche autorisés, désactivable. Source : https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/ (consulté le 27/09/2026). Ne jamais reprendre le titre du message Reddit proposé en P3.
- **Otterly** : P1 le décrit comme le concurrent le plus proche (audit d'URL qui vérifie robots.txt, accès serveur, contenu statique/dynamique). Leur doc confirme l'audit ponctuel ; rien sur surveillance planifiée, alertes, multi-clients ou marque blanche. Source : https://help.otterly.ai/what-does-the-geo-audit-do. Conséquence : le diagnostic gratuit n'est pas un différenciateur ; la surveillance quotidienne + cause + rapport agence l'est.
- **« 69 % des crawlers IA ne lisent pas le JavaScript »** (P1) : chiffre non retrouvé tel quel. Source solide à citer à la place : étude Vercel / MERJ de décembre 2024 (les robots d'OpenAI, Anthropic et Perplexity n'exécutent pas le JavaScript).

## À ne pas reprendre (contraire à nos règles)

- Formules qui prétendent voir ce que voit le robot : « exactement comme le lisent GPTBot, Claude et Perplexity », « analysez la réalité du crawl sur vos serveurs », « preuve irréfutable ». On imite un User-Agent : c'est un indice, pas une preuve.
- Promesses de temps réel : « à la minute », « en temps réel ». Le scan est quotidien, confirmé par un second scan à 10 minutes.
- Chiffres non mesurés placés dans des titres presse : « 40 % des agences françaises invisibles sur ChatGPT ». Aucun chiffre avant le baromètre.
- Messages qui cachent l'intention commerciale : « je n'ai aucune démarche commerciale », « c'est un projet personnel ». Dire que c'est un SaaS en test.
- Dépenses : cartes-cadeaux Amazon de 25 € contre des avis, files rapides payantes des annuaires (Uneed, Fazier, Smol Launch, SaaSCity), BetaList désormais payant. Budget 0 € : exclus sauf décision explicite.
- « Premier outil » ou « solution souveraine » : non démontré.
- Contact « Presse-citron : prixcharlie@charliehebdo.fr » : incohérent. **Tous les noms et adresses de journalistes, formateurs et relais sont à vérifier à la main avant tout envoi.**
- Auditer puis démarcher des personnes nommées (formateurs, fondateurs) avec un « audit de votre site » non sollicité : possible, mais d'abord relire les règles CNIL de prospection (P3 de l'annexe v2).

## Décisions proposées (à valider par Kamal)

1. Garder le cap « 10 agences d'abord » ; la conciergerie de P3 est la méthode.
2. Réécrire la landing avec les expressions 1, 2, 3, 6, 11, 12, 14 de P2 (les autres enfreignent nos règles).
3. Mettre à jour `docs/05` §7 : Otterly passe de « partiel » à « audit d'URL comparable, sans surveillance ni marque blanche documentées » ; ajouter WPMU DEV AntiBot comme cause de blocage à détecter.
4. Baromètre : ajouter la distinction robots d'entraînement / de recherche et l'adoption du llms.txt comme mesures.
