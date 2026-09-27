# Travailler à deux agents sans se marcher dessus

Deux agents de code travaillent sur Decelio : **Design** (interface, marketing, design system) et **Ingénierie** (scanner, base, facturation, infrastructure). Ce document est le contrat entre eux. Les deux le lisent avant de commencer.

Il existe parce que la méthode précédente a échoué : au 26 septembre 2026, le poste portait **dix copies du dépôt** — `Cited-claude`, `Cited-grok`, `Cited-agent`, `cited-antigravity` et six autres. Aucune ne contenait de travail absent des autres, et la vérification automatique était rouge depuis douze heures sans que personne le sache.

## La règle qui compte le plus

**Un seul dépôt. Jamais une copie de dossier.**

Dupliquer le dossier pour donner un bac à sable à un agent est la cause de tout le désordre qu'on vient de nettoyer : les copies divergent en silence, personne ne sait laquelle fait foi, et le travail se perd.

Quand deux agents doivent écrire en même temps, la bonne réponse est un **worktree Git** : même historique, dossiers de travail séparés.

```bash
git worktree add ../decelio-design   design/<sujet>
git worktree add ../decelio-ingenierie feat/<sujet>
```

Et la contrepartie, non négociable : **on le retire quand la tâche est finie.**

```bash
git worktree remove ../decelio-design
```

Un worktree abandonné devient exactement la copie obsolète qu'on cherchait à éviter.

## Qui possède quoi

Un fichier a un propriétaire. L'autre agent peut le lire, jamais l'écrire sans passer par lui.

### Design

```
decelio/components/home/**
decelio/components/ui/**
decelio/app/(marketing)/**
decelio/app/globals.css
decelio/app/**/**.module.css
decelio/public/**
decelio/app/icon.png, decelio/app/apple-icon.png
docs/07-design-system.md
docs/11-audit-landing-page.md
```

### Ingénierie

```
decelio/lib/**
decelio/app/api/**
decelio/inngest/**
decelio/prisma/**
decelio/auth.ts, decelio/proxy.ts
.github/**
render.yaml, decelio/docker-compose.yml
docs/10-plan-technique.md
docs/runbooks/**
```

### Zone partagée, à négocier avant d'écrire

`decelio/app/(app)/**` — les écrans de l'application mêlent structure de données et interface. Par défaut : l'ingénierie possède les `page.tsx` et les `actions.ts`, le design possède les composants client d'affichage. Dans le doute, on demande.

`decelio/components/ui/**` appartient au design, mais l'ingénierie s'en sert partout. Une modification de signature ou de variante s'annonce avant d'être faite : elle casse des écrans que le design ne regarde pas.

## Les trois fichiers qui provoquent le plus de conflits

`PROGRESS.md`, `tasks/mvp-tasks.md` et `docs/08-constitution.md` sont modifiés par tout le monde et fusionnent mal, parce que chacun ajoute des lignes au même endroit.

**Règle : aucun agent n'écrit dans ces trois fichiers.** C'est le fondateur qui les met à jour, au moment de fusionner. Un agent qui veut y faire figurer quelque chose l'écrit dans la description de sa demande de fusion, et le fondateur recopie.

La constitution ne change que par amendement explicite, jamais dans une branche de travail.

## Le rythme

1. Une branche part toujours de `main` à jour, jamais d'une autre branche de travail. Pas de demandes de fusion empilées.
2. Préfixe de branche : `design/<sujet>` ou `feat/`, `fix/`, `chore/` pour l'ingénierie. On voit d'un coup d'œil à qui appartient une branche.
3. Une tâche, une branche, une demande de fusion. Petite et fusionnée vite : c'est le seul vrai remède aux conflits.
4. Les quatre contrôles au vert avant de demander la fusion — `tsc`, `eslint`, `vitest`, `build`. Pas de `@ts-ignore`, pas de `eslint-disable`, pas de `any` pour y arriver.
5. La fusion est faite par le fondateur, jamais par un agent.
6. Après chaque fusion, l'autre agent ramène `main` dans sa branche avant de continuer.

## Avant de commencer une session

```bash
git fetch --prune origin
git worktree list          # un worktree inconnu = quelqu'un travaille dessus
gh pr list                 # ce qui est déjà en vol
```

Une branche distante avec des commits récents signifie que l'autre agent y est. On ne la touche pas.

## Ce qu'on fait quand on trouve un défaut chez l'autre

On ne le corrige pas en passant. Le design qui repère une requête non protégée, l'ingénierie qui repère un contraste insuffisant : on le signale, on ne le répare pas dans sa propre branche. Une correction hors périmètre transforme une demande de fusion lisible en champ de mines, et prive l'autre du contexte.

Sauf si la correction est bloquante pour son propre travail. Dans ce cas, elle part dans un commit séparé, dont le message dit pourquoi elle est là.

## Sauvegarde

Pousser sur GitHub à la fin de chaque session, même le travail inachevé, sur sa branche. Le 26 septembre, douze branches n'existaient que sur le disque du fondateur — dont la refonte complète de la page d'accueil. Une panne de disque et c'était perdu.
