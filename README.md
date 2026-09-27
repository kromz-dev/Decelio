# Decelio

Decelio vérifie chaque jour si les robots des assistants IA (ChatGPT, Claude, Perplexity...) arrivent à lire les sites qu'une agence maintient. En cas de blocage, il alerte avec la cause probable et le correctif à appliquer. Il cible les agences de maintenance WordPress et les agences SEO/GEO, en France d'abord. La vente se fait par écrit, sans appel commercial.

## Où lire quoi

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Règles non négociables du projet (budget, honnêteté, sécurité). |
| `docs/REPRISE.md` | État actuel du projet : ce qui est fait, ce qui reste, les pièges connus. À lire en premier pour reprendre le travail. |
| `tasks/mvp-tasks.md` | Liste des tâches. C'est elle qui fait foi, pas un résumé. |
| `PROGRESS.md` | Journal historique de l'avancement, daté. |
| `docs/decisions/` | Décisions techniques argumentées (ADR). |
| `docs/runbooks/` | Procédures pas à pas (déploiement, vérifications). |
| `docs/git-et-branches.md` | Comment on travaille avec Git : branches, commits, demandes de fusion. |

## Lancer le projet en local

Prérequis : Node 22 et npm.

```bash
cd decelio
npm ci
```

Copier `decelio/.env.example` en `decelio/.env.local` et remplir les variables. Jamais de secret dans le dépôt. La base pointée doit être la branche Neon `local-dev` — jamais `main`, qui est la production.

```bash
npx prisma migrate deploy
npm run dev
```

L'application répond sur `http://localhost:3000`.

Pour tester les parcours complets (alertes, paiement), il faut en plus :
- un serveur Inngest local : `npx inngest-cli@latest dev` ;
- le relais des webhooks Stripe : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

## Les 4 contrôles avant une fusion

Depuis `decelio/` :

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Les quatre doivent être au vert avant toute demande de fusion.

## Pile technique

Next.js 16, React 19, TypeScript strict, Prisma 5 / PostgreSQL, Tailwind 4, NextAuth v5, Stripe, Inngest, Resend.
