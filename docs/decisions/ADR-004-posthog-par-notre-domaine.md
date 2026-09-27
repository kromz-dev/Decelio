# ADR-004 : PostHog passe par notre propre domaine

## Statut

Accepté. Mis en œuvre par la demande de fusion #134, fusionnée le 27/09/2026 : relais `app/ingest/[...path]/route.ts`, qui retire les en-têtes d'IP et les cookies. Complète l'ADR-001.

## Date

2026-09-27

## Contexte

Règle du projet (`CLAUDE.md`) : aucun appel à un service tiers depuis une page publique, parce que cela enverrait l'IP du visiteur à un tiers.

Constat de l'agent Design, confirmé par l'Ingénierie en navigateur réel : sur les pages publiques, le navigateur du visiteur appelle directement `eu.i.posthog.com` (événements) et `eu-assets.i.posthog.com` (scripts `config.js` et `exception-autocapture.js`, chargés parce que `capture_exceptions` est activé). La CSP posée par la PR #120 autorisait ces deux hôtes.

## Décision

- PostHog passe par un **proxy inverse sur notre domaine** : `/ingest/*` vers `eu.i.posthog.com`, et `/ingest/static/*` vers `eu-assets.i.posthog.com`. C'est la méthode documentée par PostHog pour Next.js.
- `instrumentation-client.ts` : `api_host: "/ingest"`. Les réglages de vie privée restent : persistance en mémoire (aucun cookie), pas d'autocapture, pas d'enregistrement de session, identifiant interne et jamais l'e-mail.
- **L'IP du visiteur ne doit pas être transmise à PostHog.** Le mécanisme exact (retrait de `x-forwarded-for` dans un relais, ou réglage « Discard client IP data » dans PostHog) est choisi et vérifié par la PR de correction. Voir sa description.
- La CSP revient à `'self'` pour PostHog : `eu.i.posthog.com` et `eu-assets.i.posthog.com` sont retirés de `script-src` et `connect-src`.

## Conséquences

- La politique de confidentialité peut écrire « les données transitent par notre propre domaine ; votre adresse IP n'est pas transmise à PostHog », **une fois la vérification dans un vrai navigateur faite** (la demande de fusion est fusionnée).
- PostHog reste un sous-traitant (Union européenne), à citer dans la politique de confidentialité.
- Les événements serveur (`captureServerEvent`, `captureServerException`) ne passent pas par le navigateur et ne sont pas concernés.
