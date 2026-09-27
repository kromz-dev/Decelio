# ADR-002 : essai gratuit de 14 jours, carte bancaire demandée dès le départ

## Statut

Accepté par le fondateur. Code en cours sur la branche `feat/essai-gratuit-14-jours`, pas encore fusionné dans `main` au 27/09/2026. Tant qu'il ne l'est pas, le site doit continuer d'afficher « pas de période d'essai ».

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

- Il faut mettre à jour `/pricing`, l'accueil et les CGV (agent Design) **après** la fusion, jamais avant (constitution, principe II).
- Le bandeau « Essai : X jours restants » dans l'application attend la prop de fin d'essai exposée par l'Ingénierie.
- Le portail client Stripe (mode test) est configuré avec `trial_update_behavior: continue_trial` : changer de formule pendant l'essai ne le coupe pas.

## Alternatives écartées

- **Essai sans carte** : plus d'inscrits, mais moins qualifiés, avec des relances manuelles, et un fondateur seul ne peut pas les faire. Écarté.
- **Tarif à l'usage par site** (3,50 €/site, minimum 35 €) : écarté pour le lancement, faute de données clients. À réévaluer sur les premiers abonnements.
