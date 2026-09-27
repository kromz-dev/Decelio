# ADR-002 : essai gratuit de 14 jours, carte bancaire demandée dès le départ

## Statut

Accepté par le fondateur, et **appliqué**. Le code est sur `main` depuis la fusion de #139 le 27/09/2026, et le texte affiché au client depuis celle de #151 le même jour : l'accueil, `/pricing` et les CGV annoncent l'essai, et le bandeau « Essai : X jours restants » est dans l'espace client.

La consigne « le site doit continuer d'afficher pas de période d'essai », valable tant que le code n'était pas fusionné, est donc caduque. Elle est conservée ici pour mémoire, barrée : ~~tant que le code n'est pas fusionné, le site doit continuer d'afficher « pas de période d'essai »~~.

## Date

2026-09-27

## Contexte

L'étude concurrentielle de septembre 2026 relève que la cible (agences WordPress) est habituée à un essai de 10 à 14 jours (WP Umbrella, Oh Dear). Sans essai, une agence doit payer avant d'avoir reçu une seule alerte ou un seul rapport : le scan gratuit prouve le problème, pas le service. Avant cette décision, `/pricing` et l'accueil affichaient « pas de période d'essai », ce qui était exact.

## Décision

- Essai de **14 jours** (constante `TRIAL_DAYS` dans `lib/billing/plans.ts`), sur les trois formules.
- **Carte bancaire demandée dès le départ**, par Stripe Checkout (`subscription_data.trial_period_days`). Le premier prélèvement a lieu à la fin de l'essai, sauf résiliation avant.
- **Un seul essai par compte.**
- **E-mail 3 jours avant la fin** (`customer.subscription.trial_will_end`), avec la date, le montant et le lien vers le portail client pour résilier.
- Le statut Stripe `trialing` donne accès à la formule comme `active`. Un essai terminé sans paiement renvoie au plan gratuit.
- Compatible avec le coupon fondateur `FONDATEUR50` (−50 % à vie, 10 utilisations).
- Événements PostHog côté serveur : `trial_started` et `trial_converted`, sans donnée personnelle.

## Conséquences

- `/pricing`, l'accueil et les CGV ont été mis à jour après la fusion du code, jamais avant (constitution, principe II) : #151.
- Le bandeau « Essai : X jours restants » est en place, `components/TrialBanner.tsx`, alimenté par `getTrialEndsAt`. Son décompte et la date du premier prélèvement sont calculés en heure de Paris et non en heure du serveur, qui est en UTC.
- Le portail client Stripe (mode test) est configuré avec `trial_update_behavior: continue_trial` : changer de formule pendant l'essai ne le coupe pas. Vérifié le 27/09 sur le compte de test, l'annulation y est bien ouverte, en fin de période.
- Reste à faire, côté Ingénierie : **aucun endpoint webhook n'est enregistré sur le compte Stripe de test** au 27/09 (`GET /v1/webhook_endpoints` renvoie une liste vide). En l'état, `customer.subscription.trial_will_end` n'atteint jamais l'application en test, donc l'e-mail de rappel à J-3, pourtant écrit, n'est pas exerçable de bout en bout. À vérifier aussi en production.
- Reste à faire, côté Ingénierie : `getTrialEndsAt` rend `stripeTrialEnd` tel quel et peut donc rendre une date passée si le webhook `customer.subscription.updated` se perd, aucune tâche ne réconciliant ce champ. Le bandeau s'en protège à l'affichage, la donnée reste fausse pour tout autre usage.

## Alternatives écartées

- **Essai sans carte** : plus d'inscrits, mais moins qualifiés, avec des relances manuelles, et un fondateur seul ne peut pas les faire. Écarté.
- **Tarif à l'usage par site** (3,50 €/site, minimum 35 €) : écarté pour le lancement, faute de données clients. À réévaluer sur les premiers abonnements.
