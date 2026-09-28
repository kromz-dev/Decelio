# Liste de contrôle avant la mise en production

État relevé le **28/09/2026 (soir)**. **Revérifiés ce soir** : le nombre de tests, Neon `main` (baseline), `AUTH_TRUST_HOST` dans `render.yaml`. **Non revérifiés dans cette passe** : PostHog — sa ligne reflète un relevé antérieur, à ne pas prendre pour un état frais. À mettre à jour à chaque étape franchie. Une case cochée doit avoir été **vérifiée**, pas seulement supposée.

Légende : ✅ fait et vérifié · ⚠️ partiel · ❌ à faire · 🔒 bloqué par un prérequis.

## 1. Prérequis administratifs (fondateur)

| | Élément | État |
|---|---|---|
| 🔒 | Immatriculation en micro-entreprise (SIREN) | En cours. **Aucune vente avant.** |
| ⚠️ | Mentions légales, CGV, politique de confidentialité | Pages fusionnées (#126, puis #135 pour la franchise de TVA) : elles existent sur `main` et sont liées depuis le pied de page. Reste les `[À REMPLIR]` tant que le SIREN manque, et la relecture juridique. |
| ✅ | Régime fiscal | Micro-entreprise, franchise de TVA (ADR-003). |

## 2. Code (`main`)

| | Élément | État |
|---|---|---|
| ✅ | 4 contrôles : tsc, eslint, vitest, build | Verts sur `main` (749 tests, 92 fichiers, en fin de soirée le 28/09). |
| ✅ | Audit de sécurité | Critique et hauts corrigés : #115, #116, #120. Aucune faille de contrôle d'accès entre comptes trouvée. |
| ✅ | Fiabilité du scanner | Corrections fusionnées : #103, #107, #110, #111, #128 à #131 (faux « COQUILLE VIDE », 429 provoqués par le scanner, rebinding DNS, taille du corps de `/api/pdf/diagnostic`), puis #146 (le même faux « COQUILLE VIDE » dans l'ancienne route `/api/audit`, qui compte désormais `LOW_TEXT` comme accessible). |
| ✅ | Essai gratuit de 14 jours (ADR-002) | Fusionné (#139). L'ADR-002 est passé au statut « appliqué » (#157). |
| ⚠️ | PostHog par notre domaine (ADR-004) | Fusionné (#134). Vérification statique faite aujourd'hui : `api_host: "/ingest"` est écrit en dur dans `instrumentation-client.ts` (pas lu depuis l'environnement), le relais `app/ingest/[...path]/route.ts` retire `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` et `host` avant de transmettre, et même les fichiers statiques de `posthog-js` passent par `/ingest/static`. Aucun appel visiteur vers un tiers dans le code. Reste une confirmation dans l'onglet réseau d'un vrai navigateur, qui exige l'application déployée. |
| ✅ | Acceptation des CGV à l'inscription | La case à cocher est fusionnée (#155, `app/register/page.tsx` envoie `acceptTerms: true`, case non pré-cochée). Le côté serveur est fusionné (#152) : colonnes `User.termsAcceptedAt` / `termsVersion`, migration `20260927180000_add_user_terms_acceptance`, version des CGV dans `lib/legal/terms.ts`. Date et version en tête des CGV fusionnées (#160, `TERMS_VERSION = "2026-09-27-2"`). |

## 3. Services externes

| | Service | État relevé | Reste à faire |
|---|---|---|---|
| ⚠️ | **Resend** | Relevé aujourd'hui par le MCP Resend : domaine `decelio.fr` **créé** (région eu-west-1), statut **`not_started`** — la vérification n'a pas commencé. | Ajouter chez OVH : TXT `resend._domainkey`, MX `send` → `feedback-smtp.eu-west-1.amazonses.com` (priorité 10), TXT `send` → `v=spf1 include:amazonses.com ~all`, CNAME `rsend` → `send.forge.rmta.net`. Puis lancer la vérification. **Sans ça, aucun e-mail ne part** : alertes, rapports, rappel de fin d'essai, réinitialisation du mot de passe. |
| ⚠️ | **Stripe (test)** | Relevé aujourd'hui par le MCP Stripe (compte `acct_1UJ3taE0KhuxlY8k`, mode test). ✅ 3 prix actifs (SOLO 39 €, PRO 99 €, SCALE 249 €/mois, en euros), tous à `trial_period_days: null` (l'essai de 14 jours est posé par le code au moment du Checkout, pas par le prix) ; ✅ coupon `FONDATEUR50` (−50 %, `duration: forever`, 10 utilisations maximum, 0 utilisée) ; ✅ produits renommés « Decelio » (ils s'appelaient « Cited ») ; ✅ portail client créé (résiliation en fin de période, carte, factures, changement de formule), et il porte maintenant `privacy_policy_url` (`https://decelio.fr/confidentialite`) et `terms_of_service_url` (`https://decelio.fr/cgv`). **Aucun point de terminaison de webhook** (`/v1/webhook_endpoints` renvoie une liste vide) — c'est le point dur : sans lui, un paiement, une résiliation ou un coupon ne met jamais la base à jour. | Créer le webhook `https://decelio.fr/api/webhooks/stripe` et son secret, au déploiement. Pied de page des factures (ADR-003). Point de vigilance : les 3 prix sont en `tax_behavior: "exclusive"` alors que le régime est la franchise de TVA (art. 293 B, ADR-003) — à 0 % de taxe le montant affiché est bien le montant payé, donc aucun défaut de calcul, mais « exclusive » annonce « hors taxes » et la facture devra porter la mention de franchise ; à trancher au moment de l'activation en mode réel. |
| 🔒 | **Stripe (réel)** | Non activé. Revérifié aujourd'hui : le MCP Stripe ne voit qu'un seul compte, en mode test. Aucun compte en mode réel. | Activation avec le SIREN, puis recréer les prix, le coupon, le portail et le webhook en mode réel. |
| ✅ | **Neon `main` (production)** | **Baseline fait et vérifié le 28/09.** Les 5 migrations (`20260925000000_init`, `20260926230000_add_updated_at_and_site_unique`, `20260927000000_audit_lead_brand_name_optional`, `20260927120000_add_user_trial_fields`, `20260927180000_add_user_terms_acceptance`) sont enregistrées en base, `_prisma_migrations` existe. **Branche non protégée** (offre gratuite Neon) — ne jamais sortir sa chaîne de connexion de Render. | Rien côté migrations ; ne jamais donner la chaîne de `main` à un outil automatisé. |
| ✅ | **Neon `local-dev`** | Les 5 migrations du dossier `decelio/prisma/migrations/` y sont appliquées. `npx prisma migrate status` répond « Database schema is up to date! », et `npx prisma migrate diff` répond « No difference detected » dans les deux sens (dossier des migrations vers le schéma, et base vers le schéma). | — |
| ❌ | **Render** | **Jamais déployé avec succès, vérifié le 28/09** : service `srv-darer6btqb8s73f7d670`, URL actuelle `https://cited-6ihy.onrender.com`. Quatre déploiements, **tous en `build_failed`**. Le dernier (27/09, 23h55) a échoué sur `Error code: P1012 — Environment variable not found: DIRECT_URL`. `DATABASE_URL` et `DIRECT_URL` collées par le fondateur le 28/09. `AUTH_TRUST_HOST` et `TRUSTED_PROXY_HOPS=1` **désormais dans `render.yaml`** (#184, 28/09 soir). `autoDeploy` reste sur `no`. | Saisir les variables encore manquantes : `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SOLO/PRO/SCALE`, `RESEND_API_KEY`, `ENGINE_CACHE_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY` ; puis relancer un déploiement manuel. Domaine `decelio.fr`. |
| ❌ | **Inngest** | — (non revérifié le 27/09) | Déclarer l'application avec l'URL de production, puis `INNGEST_SIGNING_KEY` et `INNGEST_EVENT_KEY`. |
| ❌ | **Google OAuth** | — (non revérifié le 27/09) | Ajouter l'URL de redirection de production. |
| ⚠️ | **PostHog** | Ingestion vérifiée ; tableau de bord « Decelio — lancement » créé (tunnel, activité, erreurs). Non revérifié le 27/09 dans cette passe. | Jeton de production ; fuseau Europe/Paris ; réglage éventuel « Discard client IP data » (ADR-004). |

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
