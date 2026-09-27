# Travailler à deux agents sans se marcher dessus

Deux conversations Claude Code travaillent sur Decelio : **Design** (interface, marketing, design system) et **Ingénierie** (scanner, base, facturation, infrastructure). Ce document est le contrat entre elles. Les deux le lisent avant de commencer.

**Elles sont les deux seules à écrire dans le dépôt.** Tout autre outil de code — Antigravity, Cursor, Codex — est un troisième intervenant : soit il est fermé, soit il travaille sur sa propre branche et ne pousse jamais sur celle d'un autre.

Il existe parce que la méthode précédente a échoué : au 26 septembre 2026, le poste portait **dix copies du dépôt** — `Cited-claude`, `Cited-grok`, `Cited-agent`, `cited-antigravity` et six autres. Aucune ne contenait de travail absent des autres, et la vérification automatique était rouge depuis douze heures sans que personne le sache.

## Ce qui s'est déjà produit

Le 27 septembre à 3 h 06, un troisième outil a commité **sur la branche d'un agent en train d'y travailler**. Le commit
`6b84b93` porte le message « refonte AEO, icones locales, corrections constitution », qui décrit le travail de l'agent
design — mais son contenu réel se limite à trois fichiers non suivis ramassés dans le dossier de travail, dont deux que
l'agent venait délibérément de retirer du suivi.

Rien n'a été perdu. Mais un message de commit qui ne décrit pas son contenu rend l'historique inutilisable pour
comprendre ce qui s'est passé, et c'est précisément ce qu'on cherche à préserver quand plusieurs agents travaillent.

**Une branche a un seul propriétaire.** Pas deux, pas « celui qui passe par là ».

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

## Un commit décrit ce qu'il contient

Le message annonce le contenu réel du diff, pas l'intention de la session ni le travail d'un autre. Un commit qui ajoute
trois fichiers de configuration ne s'appelle pas « refonte ». En cas de doute, relire `git show --stat` avant d'écrire le
message.

## Sauvegarde

Pousser sur GitHub à la fin de chaque session, même le travail inachevé, sur sa branche. Le 26 septembre, douze branches n'existaient que sur le disque du fondateur — dont la refonte complète de la page d'accueil. Une panne de disque et c'était perdu.
