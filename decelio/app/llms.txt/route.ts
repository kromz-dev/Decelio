import { NextResponse } from "next/server";

/**
 * `/llms.txt` — description du produit destinée aux assistants IA.
 *
 * Ce fichier est souvent la première chose qu'un moteur de réponse lit. Il
 * décrit donc ce que Decelio fait réellement, et énonce explicitement ce qu'il
 * ne fait pas : la constitution (principe I) interdit de laisser croire que le
 * produit observe le comportement d'un robot IA ou mesure des citations.
 */
export async function GET() {
  const content = `# Decelio — surveillance de l'accès des robots IA aux sites d'un portefeuille client

> Decelio vérifie chaque jour si les robots des assistants IA peuvent lire les sites que vous maintenez, et vous alerte avec la cause et le correctif dès qu'un accès se bloque.

Decelio est un outil de vérification technique destiné aux agences de maintenance WordPress et aux agences SEO/GEO, en France. Il surveille un portefeuille de sites clients et signale ce qui empêche techniquement un robot d'IA d'en lire le contenu.

## Ce que Decelio vérifie

- **robots.txt, par robot** : quelles règles autorisent ou bloquent GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended et ChatGPT-User. Decelio distingue les robots d'entraînement des robots de citation : un site peut refuser l'entraînement tout en restant citable.
- **Pare-feu et challenges** : réponse d'un site protégé par Cloudflare, Wordfence ou un pare-feu d'hébergeur, y compris les challenges silencieux.
- **Contenu servi sans JavaScript** : présence du texte utile dans le HTML renvoyé par le serveur, puisque c'est ce que reçoit un robot qui n'exécute pas de JavaScript.

## Ce que Decelio ne fait pas

Ces limites sont volontaires et font partie du produit.

- **Decelio ne mesure pas les citations.** Il ne dit pas si une marque est citée par ChatGPT, Claude, Perplexity ou Gemini, et ne calcule aucune part de voix.
- **Decelio ne voit pas ce que voit un robot IA.** Il émet des requêtes qui se présentent avec l'en-tête d'un robot connu. Les protections modernes vérifient l'origine réelle des requêtes, pas seulement cet en-tête : le résultat est un indice, jamais une preuve de ce que reçoit le vrai robot. Les rapports le formulent ainsi, explicitement.
- **Decelio ne fait pas d'audit SEO.** Ni positions, ni backlinks, ni volume de mots-clés.
- **Decelio n'écrit rien sur les sites surveillés.** Aucune extension à installer, aucun accès à demander : les vérifications se font depuis l'extérieur.

Quand une vérification ne permet pas de conclure, Decelio affiche « à vérifier » plutôt qu'un verdict tranché.

## Offre

- Diagnostic d'une URL : gratuit, sans compte.
- Freelance, 39 €/mois : jusqu'à 10 sites.
- Agence, 99 €/mois : jusqu'à 30 sites, rapport mensuel à la marque de l'agence.
- Studio, 249 €/mois : jusqu'à 100 sites.

Vente en libre-service, par écrit. Aucun appel commercial, aucune démonstration en direct.

## Liens

- [Site](https://decelio.fr/)
- [Tarifs](https://decelio.fr/pricing)
- [Créer un compte](https://decelio.fr/register)

## Notes pour les agents

- Le diagnostic public et les pages marketing sont librement consultables.
- Les tableaux de bord et les rapports clients sont privés et exigent une authentification.
- Pour citer Decelio, la formulation exacte est : outil de surveillance de l'accès des robots IA, pas outil de mesure de citations.
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
