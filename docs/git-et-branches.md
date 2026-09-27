# Comment on travaille avec Git

Ce guide s'adresse à quelqu'un qui ne développe pas. Il explique le vocabulaire et la façon de faire du projet, sans jargon non expliqué.

## Le schéma en un coup d'œil

```
main (protégée)
  │
  ├── on crée une branche ──▶ feat/ajout-alerte
  │                              │
  │                        on travaille, on commit
  │                              │
  │                        on pousse sur GitHub
  │                              │
  │                        on ouvre une PR (demande de fusion)
  │                              │
  │                        la CI tourne (4 contrôles)
  │                              │
  │                     verte ──▶ le fondateur fusionne ──▶ retour sur main
  │                     rouge ──▶ on corrige, on repousse
  │
  └── la branche est supprimée automatiquement après la fusion
```

## Lexique

- **`main`** : la version officielle du projet. Elle est **protégée** : personne, pas même l'administrateur, n'a le droit d'y écrire directement. Tout passe par une demande de fusion.
- **Branche** : une copie de travail temporaire, un « brouillon », pour une seule tâche. Elle part toujours de `main` à jour.
- **Commit** : une sauvegarde du travail, avec un message qui décrit ce qui a changé. On commite souvent, par petits pas.
- **Commit conventionnel** : un message qui commence par un mot-clé — `feat` (nouvelle fonctionnalité), `fix` (correction), `docs` (documentation), `chore` (tâche technique sans impact utilisateur). Exemple : `fix: corrige le calcul du quota de sites`.
- **Push** : envoyer les commits de son ordinateur vers GitHub.
- **PR (Pull Request, demande de fusion)** : une demande d'intégrer une branche dans `main`. Elle porte une description en français qui explique ce que contient le changement.
- **CI (intégration continue)** : des contrôles automatiques qui tournent sur une PR de code et disent si tout va bien (vert) ou non (rouge). Les 4 contrôles : `tsc` (types), `lint` (style et pièges), `test` (tests automatisés), `build` (le projet compile). Une PR qui ne touche que des fichiers de documentation n'a pas de CI — rien à vérifier côté code.
- **Fusion (merge)** : le moment où le contenu de la branche rejoint `main`. Fait par le fondateur, une fois la CI verte (ou tout de suite pour une PR de documentation).
- **Branche supprimée automatiquement** : après une fusion, GitHub efface la branche toute seule. Pas de ménage à faire.
- **Réécrire l'historique** : changer des commits déjà poussés (par exemple avec `rebase`). **On ne le fait jamais.** Quand `main` avance pendant qu'une branche est en cours, on ramène `main` dans la branche avec `git merge origin/main`, jamais avec `rebase`.
- **Worktree** : un dossier de travail séparé pour une branche, sans dupliquer tout le dépôt. Utile quand deux agents travaillent en même temps sans se gêner. Détail dans `docs/12-partage-du-travail.md`.
- **Étiquette (tag)** : un repère posé sur un commit précis de `main`, par exemple `v0.1-mvp` pour marquer « le MVP est complet et testé ». Une étiquette ne bouge jamais.

## Les préfixes de branche

- `feat/` : nouvelle fonctionnalité
- `fix/` : correction d'un défaut
- `docs/` : documentation seulement
- `chore/` : tâche technique (dépendances, configuration)
- `design/` : interface et marketing (agent Design)

## Les 4 contrôles avant une fusion

Une PR qui touche du code dans `decelio/` doit passer, depuis ce dossier :

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Tous les quatre au vert. Aucun raccourci n'est accepté pour y arriver (pas de suppression de vérification, pas de test ignoré).

## Deux agents, un seul dépôt

Deux agents (Design et Ingénierie) travaillent en parallèle, chacun dans son propre worktree, chacun avec ses propres fichiers et ses propres préfixes de branche. Le détail complet — qui possède quel fichier, comment se signaler un problème sans le corriger à la place de l'autre — est dans `docs/12-partage-du-travail.md`.

## Dependabot

Un robot ouvre automatiquement une PR quand une dépendance a une nouvelle version. Ces PR passent par la même CI que les autres. Certaines montées majeures sont volontairement mises en pause (`ignore` dans `.github/dependabot.yml`) quand elles demandent une migration à part entière.

## Que faire pour reprendre le projet, à n'importe quel moment

1. Lire dans l'ordre : `README.md`, puis `docs/REPRISE.md`, puis `tasks/mvp-tasks.md`.
2. `git pull` pour récupérer les derniers changements de `main`.
3. Depuis `decelio/` : `npm ci` pour installer les dépendances exactes.
4. `npx prisma migrate deploy` pour mettre la base locale à jour.

## Résumé en une phrase

Une branche, une tâche, une demande de fusion ; `main` ne bouge que par ce chemin, jamais réécrite, toujours vérifiée par les 4 contrôles.
