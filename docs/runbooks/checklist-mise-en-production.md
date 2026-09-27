# Liste de contrôle avant la mise en production

État relevé le **27/09/2026** par les MCP (Stripe, Neon, Resend, Render, PostHog) et par la CI. À mettre à jour à chaque étape franchie. Une case cochée doit avoir été **vérifiée**, pas seulement supposée.

Légende : ✅ fait et vérifié · ⚠️ partiel · ❌ à faire · 🔒 bloqué par un prérequis.

## 1. Prérequis administratifs (fondateur)

| | Élément | État |
|---|---|---|
| 🔒 | Immatriculation en micro-entreprise (SIREN) | En cours. **Aucune vente avant.** |
| 🔒 | Mentions légales, CGV, politique de confidentialité | Pages en cours (Design, branche `design/pages-legales`), avec des `[À REMPLIR]` tant que le SIREN manque. Relecture juridique conseillée. |
| ✅ | Régime fiscal | Micro-entreprise, franchise de TVA (ADR-003). |

## 2. Code (`main`)

| | Élément | État |
|---|---|---|
| ✅ | 4 contrôles : tsc, eslint, vitest, build | Verts sur `main` (608 tests au 27/09, après #120). |
| ✅ | Audit de sécurité | Critique et hauts corrigés : #115, #116, #120. Aucune faille de contrôle d'accès entre comptes trouvée. |
| ⚠️ | Fiabilité du scanner | Principales corrections fusionnées (#103, #107, #110, #111). En cours : faux « COQUILLE VIDE », 429 provoqués par le scanner, rebinding DNS, taille du corps de `/api/pdf/diagnostic`. |
| ⚠️ | Essai gratuit de 14 jours (ADR-002) | Branche `feat/essai-gratuit-14-jours` en cours. |
| ⚠️ | PostHog par notre domaine (ADR-004) | Branche `fix/posthog-proxy-domaine` en cours. |
| ❌ | Acceptation des CGV à l'inscription | À faire après la fusion des pages légales : colonne `termsAcceptedAt` avec la version. |

## 3. Services externes

| | Service | État relevé | Reste à faire |
|---|---|---|---|
| ❌ | **Resend** | **Aucun domaine** | Ajouter `decelio.fr`, créer les enregistrements DNS SPF et DKIM chez le registraire, attendre la vérification. **Sans ça, aucun e-mail ne part** : alertes, rapports, rappel de fin d'essai, réinitialisation du mot de passe. |
| ⚠️ | **Stripe (test)** | ✅ 3 prix (39, 99 et 249 €/mois) ; ✅ coupon `FONDATEUR50` ; ✅ produits renommés « Decelio » (ils s'appelaient « Cited ») ; ✅ portail client créé (résiliation en fin de période, carte, factures, changement de formule) | Pied de page des factures (ADR-003). Webhook `https://decelio.fr/api/webhooks/stripe` et son secret, au déploiement. URL des CGV et de la confidentialité dans le portail, après les pages légales. |
| 🔒 | **Stripe (réel)** | Non activé | Activation avec le SIREN, puis recréer les prix, le coupon, le portail et le webhook en mode réel. |
| ⚠️ | **Neon `main` (production)** | Tables présentes, **mais aucun historique de migrations Prisma** (pas de table `_prisma_migrations`). 3 utilisateurs de test. **Branche non protégée.** | Protéger la branche. Faire le « baseline » (voir `deploiement-render-neon.md`) avant `prisma migrate deploy`. |
| ⚠️ | **Neon `local-dev`** | 2 migrations sur 3 appliquées | `npx prisma migrate deploy` avant les tests locaux (la migration `AuditLead.brandName` manque, et celle de l'essai gratuit est à venir). |
| ❌ | **Render** | Service `decelio` jamais déployé : `rootDir: cited`, variables absentes, déploiement automatique coupé | Root Directory `decelio`. Variables de `.env.example`, dont `DIRECT_URL`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_APP_URL=https://decelio.fr`, `TRUSTED_PROXY_HOPS=1`. Domaine `decelio.fr`. |
| ❌ | **Inngest** | — | Déclarer l'application avec l'URL de production, puis `INNGEST_SIGNING_KEY` et `INNGEST_EVENT_KEY`. |
| ❌ | **Google OAuth** | — | Ajouter l'URL de redirection de production. |
| ⚠️ | **PostHog** | Ingestion vérifiée ; tableau de bord « Decelio — lancement » créé (tunnel, activité, erreurs) | Jeton de production ; fuseau Europe/Paris ; réglage éventuel « Discard client IP data » (ADR-004). |

## 4. Tests locaux (fondateur, Neon `local-dev`)

Parcours complet :
- inscription, puis connexion (11 échecs pour vérifier la limite) ;
- ajout d'un site, puis scan ;
- alerte, avec le serveur Inngest local et la confirmation au bout de 10 minutes ;
- essai et paiement Stripe en mode test (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) ;
- rapport mensuel ;
- purge RGPD ;
- pendant tout ce temps, aucune erreur « Content Security Policy » dans la console du navigateur.

## 5. Premier déploiement, dans l'ordre

1. Tout ce qui précède, sauf Stripe réel.
2. Déploiement Render en mode test Stripe, puis vérifier :
   - `curl -I https://decelio.fr` : en-têtes de sécurité présents ;
   - `docs/runbooks/verifier-ip-client-render.md` : IP client non falsifiable ;
   - événements du tunnel dans PostHog ;
   - vrai scan d'un site ;
   - réception d'un e-mail.
3. SIREN reçu : compléter les pages légales, activer Stripe en réel, recréer les objets Stripe, basculer les clés.
4. Lancement.
