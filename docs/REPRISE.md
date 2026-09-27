# Reprise du projet — état au 27/09/2026

À lire par toute personne ou IA qui reprend le développement, **après** `CLAUDE.md`. Ce fichier décrit ce qui est sur GitHub, ce qui est en cours et ce qui reste à faire. La liste détaillée de la configuration est dans `docs/runbooks/checklist-mise-en-production.md`.

## 1. Ce qui est sur `main`

- Code vérifié : `tsc`, `eslint`, `vitest` (608 tests) et `build` au vert après la demande de fusion #120. `npm audit` : 0 faille.
- Fusionné le 26 et le 27/09 : #95 à #121.
  - Scanner : détection de plateforme, robots 403, blocage général → « À VÉRIFIER », alerte confirmée par un second scan au bout de 10 min, sondes des robots de recherche.
  - Sécurité : IP d'appel la plus à droite, limite de connexion, en-têtes et CSP, plus aucun e-mail envoyé depuis le formulaire public.
  - PDF de remédiation par plateforme, événements PostHog côté serveur, Vitest 5.
- Décisions : `docs/decisions/ADR-002` (essai de 14 jours), `ADR-003` (franchise de TVA), `ADR-004` (PostHog par notre domaine).
- La CI ne tourne que si une demande de fusion touche `decelio/**` ou `.github/workflows/**`. Une demande qui ne change que des docs n'a pas de contrôles.

## 2. Branches en cours (non fusionnées)

| Branche | Contenu | État |
|---|---|---|
| Scanner #128 à #131 | Faux « COQUILLE VIDE », 429 provoqués par le scanner, rebinding DNS (IP épinglée, dépendance `undici`), 413 sur `/api/pdf/diagnostic` | **Fusionnées le 27/09**, 633 tests |
| `fix/posthog-proxy-domaine` | ADR-004 : route `/ingest/[...path]`, qui retire IP, cookies et `forwarded`, limite de 256 Kio, hôtes fixes. CSP sans hôte PostHog. `skipTrailingSlashRedirect: true`. | Demande de fusion ouverte avec cette mise à jour. Après fusion : vérifier dans un vrai navigateur qu'aucune requête ne part vers `*.posthog.com`. |
| `feat/essai-gratuit-14-jours` | ADR-002 : essai avec carte dès le départ | Un commit poussé, à relire : e-mail `trial_will_end`, événements PostHog, prop `trialEndsAt` pour le Design |
| `chore/avant-lancement` | `AUTH_TRUST_HOST` dans `.env.example`, `signup_completed` après une connexion Google, retrait du texte « visibilité IA », suppression du client Stripe à la purge. **Commit `wip`, non vérifié.** | À terminer et vérifier |
| `docs/etat-2026-09-27` | Mise à jour de `PROGRESS.md` et des tâches. **Commit `wip`, incomplet.** | À terminer. Ce fichier-ci la remplace en partie. |
| `chore/design-code-mort` (#122) | Design : suppression de code mort | Au fondateur |
| Dependabot #81, #84, #86, #101 | Montées de version | #81 : `@dependabot rebase`, puis fusion. #84 et #86 : fusion. #101 (codeql v4) : à vérifier |

Anciennes branches à examiner avant suppression : `feat/t020-ssrf`, `feat/t021-bulk`, `feat/grok-t020-t021-unstacked`, `tmp-t053`, `docs/sync-etat`, `docs/progress-2026-09-25`, `claude/*`.

Branches déjà fusionnées, à supprimer : 17 branches de ce lot. La session cloud ne peut pas supprimer de branche (refus 403). Le fondateur les supprime depuis son clone.

## 3. Reste à faire

### Code (Ingénierie), dans l'ordre
1. **Prochaine tâche : essai gratuit** (`feat/essai-gratuit-14-jours`), puis `chore/avant-lancement`, puis les docs, puis Dependabot. Tâche à part, plus petite : le même biais reste dans l'ancienne route : `analyzeResponse` / `EMPTY_JS_REQUIRED` (`lib/scanner/analyzer.ts`, utilisé par `/api/audit`). Tâche à part.
2. PostHog : vérification dans un navigateur après la fusion.
3. Essai gratuit de 14 jours, puis `chore/avant-lancement`.
4. Mettre à jour `PROGRESS.md` et `tasks/mvp-tasks.md` depuis ce fichier.
5. Dependabot.
6. **Après les pages légales du Design** :
   - colonne `termsAcceptedAt`, avec la version, à l'inscription ;
   - liens des CGV et de la confidentialité dans le portail Stripe (`bpc_1UK9qEE0KhuxlY8ktCu3wqFY`).

### Design
Détail complet : `docs/REPRISE-DESIGN.md`.
- Pages légales : PR #126 ouverte (`design/pages-legales`), à relire et fusionner, puis remplir les `[À REMPLIR]`.
- Harmonisation de l'application et de `/design-system` : branche `design/harmonisation-app` poussée, PR à ouvrir après les 4 contrôles.
- « HT » → « TVA non applicable (art. 293 B du CGI) » : fait (#123).
- Après la fusion de l'essai : `/pricing`, l'accueil, la clause d'essai des CGV et le bandeau d'essai. **Jamais avant.**

### Configuration
| Service | À faire | Bloqué par |
|---|---|---|
| Resend | Domaine `decelio.fr` **créé** (région eu-west-1, suivi désactivé). Ajouter chez OVH : TXT `resend._domainkey` (valeur dans le tableau de bord Resend), MX `send` → `feedback-smtp.eu-west-1.amazonses.com` (priorité 10), TXT `send` → `v=spf1 include:amazonses.com ~all`, CNAME `rsend` → `send.forge.rmta.net`. Ensuite, lancer la vérification. | Accès OVH |
| Stripe (test) | Fait : prix, coupon `FONDATEUR50`, produits « Decelio », portail. Reste pour le fondateur, dans le tableau de bord : pied de page des factures (texte dans ADR-003), et renommer le compte « Cited » en « Decelio ». Le webhook est créé au déploiement. | — |
| Stripe (réel) | Activer, puis recréer prix, coupon, portail et webhook | SIREN |
| Neon `main` | **Protection impossible en offre gratuite** (0 branche protégée autorisée) : ne jamais sortir la chaîne de `main` hors de Render. **Baseline** : relevé en lecture seule, la base contient les migrations 1 et 2 sans historique, pas la 3. Avant le premier déploiement, lancer avec la chaîne de `main` : `npx prisma migrate resolve --applied 20260925000000_init`, puis `npx prisma migrate resolve --applied 20260926230000_add_updated_at_and_site_unique`. Le build Render appliquera ensuite la 3ᵉ (`migrate deploy`). Sans ce baseline, le build échoue. | Fondateur, au déploiement |
| Render | Root Directory **déjà `decelio/`** (vérifié), région Francfort, `healthCheckPath` `/api/health`, déploiement automatique coupé. Le build lance `prisma migrate deploy` : faire le baseline Neon avant. Variables de `.env.example`, dont `DIRECT_URL`, `AUTH_TRUST_HOST=true`, `TRUSTED_PROXY_HOPS=1`, `RESEND_API_KEY`. Domaine `decelio.fr`. Les secrets sont collés par le fondateur dans le tableau de bord, jamais dans une conversation. | Fondateur |
| Inngest | Déclarer l'application avec l'URL de production, puis ajouter les clés | Déploiement |
| Google OAuth | Ajouter l'URL de retour de production | Déploiement |

### Fondateur
- Test complet en local sur Neon `local-dev`, après `npx prisma migrate deploy`. Le parcours est dans la liste de contrôle, section 4.
- SIREN : ensuite, compléter les pages légales et activer Stripe en paiement réel.

## 4. Façon de travailler (fin septembre)

- Crédits limités : **un seul sous-agent à la fois**, sur un modèle économique. Ordre prévu : l'essai et `chore/avant-lancement`, puis les docs et les tâches, puis Dependabot.
- La session cloud ne peut pas supprimer de branche distante : le fondateur le fait depuis son clone.

## 5. Pièges connus

- Dans une session cloud, Node ignore le proxy sortant tant que `NODE_USE_ENV_PROXY=1` n'est pas défini.
- Une IA qui travaille dans un worktree doit y lancer `npm ci`. Un lien symbolique vers `node_modules` casse le build Turbopack.
- Ne jamais réécrire l'historique d'une branche poussée : `git merge origin/main`, pas de rebase.
- La mesure des citations (`lib/engines`, `llm-judge`, `query-generator`, `visibility`, `posthog-ai`) est en test local. Ne pas la supprimer, ne pas la brancher sans le fondateur.
