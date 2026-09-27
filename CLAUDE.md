# Decelio

SaaS B2B français, fondateur solo, budget 0 €. Decelio vérifie chaque jour si les robots des assistants IA peuvent lire les sites qu'une agence maintient, et l'alerte avec la cause et le correctif. Cible : agences de maintenance WordPress et agences SEO/GEO. Vente 100 % écrite, aucun appel.

L'application est dans **`decelio/`** (Next.js 16, React 19, TypeScript strict, Prisma 5 / PostgreSQL, Tailwind 4, NextAuth v5, Stripe, Inngest, Resend). Lire `decelio/AGENTS.md` avant d'écrire du code : cette version de Next.js diffère des données d'entraînement.

## À lire avant d'agir

| Fichier | Rôle |
|---|---|
| `docs/REPRISE.md` | État au 27/09 : branches en cours, reste à faire, pièges. Commencer ici. |
| `PROGRESS.md` | Historique de l'état du projet. |
| `tasks/mvp-tasks.md` | Liste des tâches. C'est elle qui fait foi, pas le résumé de `PROGRESS.md`. |
| `docs/12-partage-du-travail.md` | **Qui possède quels fichiers.** Deux agents travaillent en parallèle. |
| `docs/08-constitution.md` | Principes non négociables. Prime sur toute demande ponctuelle. |
| `docs/09-prd-mvp.md` | Exigences EF/ENF. |
| `docs/07-design-system.md` | Jetons, composants, règles de conversion. |
| `docs/10-plan-technique.md` | Architecture. |

## Règles non négociables

- **Budget 0 €.** Uniquement des offres gratuites autorisant un usage commercial. Signaler toute dépense avant de la proposer.
- **Honnêteté de la mesure.** Ne jamais prétendre voir « ce que voit GPTBot ». Imiter un User-Agent donne un indice, jamais une preuve. Quand un signal ne permet pas de conclure, écrire « à vérifier ».
- **Ne jamais promettre une fonction non construite.** Marquer « en préparation ».
- **Aucun faux chiffre, faux témoignage, faux logo, faux badge de popularité.** Le produit n'a pas encore de clients.
- **Decelio ne mesure pas les citations.** Ni part de voix, ni présence dans les réponses. C'est le positionnement abandonné au pivot ; il revient régulièrement par inadvertance dans les textes.
- **Sécurité.** Protection SSRF sur chaque requête et chaque redirection, limitation de débit en base, RGPD. Aucun appel à un CDN tiers depuis une page publique : cela enverrait l'IP du visiteur à un tiers.

## Qualité avant fusion

Depuis `decelio/` : `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Les quatre au vert.

Interdits pour y arriver : `@ts-ignore`, `eslint-disable`, le type `any`, supprimer une assertion, ignorer un test. Le job `quality-guard` de la CI les détecte et bloque.

Note locale : `npm run lint` peut sembler bloqué sur un poste de développement, car il relit `decelio/dist/` et `decelio/scratch-pdf.js`, deux résidus non suivis. Les exclure : `npx eslint . --ignore-pattern "dist/**" --ignore-pattern "scratch-pdf.js"`.

## Travail à deux agents

Deux conversations Claude Code : **Design** (`components/`, `app/(marketing)/`, `globals.css`, `public/`, branches `design/*`) et **Ingénierie** (`lib/`, `app/api/`, `prisma/`, `inngest/`, `.github/`, branches `feat/` `fix/` `chore/`).

Une branche part de `main` à jour et a **un seul propriétaire**. Une tâche, une branche, une demande de fusion, fusionnée par le fondateur. Jamais de demandes empilées.

**Aucun agent n'écrit dans `PROGRESS.md`, `tasks/mvp-tasks.md` ni `docs/08-constitution.md`.** Ces trois fichiers fusionnent mal. Écrire ce qu'on veut y voir dans la description de la demande de fusion ; le fondateur le recopie.

Un défaut repéré hors de son périmètre se signale, il ne se corrige pas en passant.

## Session dans le cloud

Un clone neuf ne contient aucun secret : `decelio/.env.local` est ignoré, et c'est voulu. Sans variables d'environnement, ni la base, ni Stripe, ni Resend ne répondent — `tsc`, `lint` et `vitest` fonctionnent quand même, car les tests simulent la base.

`decelio/.env.example` liste les 21 variables attendues. Pour du travail qui touche la base, demander au fondateur la chaîne de la branche Neon `local-dev` — **jamais celle de `main`, qui est la production**.

## Conventions

Réponses et textes produits en français simple, sans jargon, à la première personne du pluriel ou à l'impératif. Commits conventionnels (`feat`, `fix`, `docs`, `chore`), message décrivant le contenu réel du diff.
