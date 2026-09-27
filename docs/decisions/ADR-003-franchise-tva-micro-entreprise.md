# ADR-003 : micro-entreprise, franchise en base de TVA

## Statut

Accepté par le fondateur le 27/09/2026. Immatriculation (SIREN) en cours : **aucune vente avant de l'avoir reçue.**

## Date

2026-09-27

## Contexte

Les prix Stripe (39, 99 et 249 €/mois) sont configurés en `tax_behavior: exclusive`, sans taxe appliquée ni Stripe Tax. Le site affichait « HT ».

## Décision

- Le fondateur exerce en **micro-entreprise, en franchise en base de TVA**.
- Les montants restent **39, 99 et 249 € par mois, nets** : aucune TVA ajoutée. **Aucun réglage Stripe à changer** pour les prix.
- Toutes les factures portent la mention « **TVA non applicable, art. 293 B du CGI** », les **pénalités de retard** et l'**indemnité forfaitaire de 40 €** pour frais de recouvrement (vente entre professionnels). C'est un réglage du tableau de bord Stripe (Paramètres, puis Factures, puis pied de page par défaut) :

  > TVA non applicable, art. 293 B du CGI. Paiement à réception. En cas de retard : pénalités au taux d'intérêt légal majoré de 10 points, et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).

- Sur le site (agent Design) : « HT » est remplacé par « TVA non applicable (art. 293 B du CGI) » partout où un prix apparaît.

## Conséquences

- Surveiller le **plafond de chiffre d'affaires de la franchise**, au montant en vigueur. Au-delà, la TVA devient due. Il faudra alors activer Stripe Tax ou un taux de 20 %, et changer l'affichage des prix.
- L'activation de Stripe en mode réel demande le SIREN et l'adresse : elle est bloquée tant que l'immatriculation n'est pas reçue.
- Les mentions légales et les CGV gardent des emplacements `[À REMPLIR]` pour l'identité de l'éditeur tant que le SIREN n'est pas connu.
