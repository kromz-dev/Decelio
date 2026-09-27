# Runbook — Vérifier que l'IP cliente ne se falsifie pas sur Render

Ce runbook est exécuté par **le fondateur**, en production, après un déploiement qui
touche `decelio/lib/rate-limit.ts`. Il ne demande aucun accès à la base ni aucun secret :
seulement des requêtes HTTP contre le site en ligne.

## Pourquoi ce contrôle

`callerKey` (dans `decelio/lib/rate-limit.ts`) construit la clé des limites de débit à
partir de l'en-tête `x-forwarded-for`. Le premier élément de cet en-tête est écrit par le
client lui-même : un attaquant qui envoie `X-Forwarded-For: <IP au choix>` peut donc
changer de clé à chaque requête et contourner toutes les limites, s'il suffit de lire le
premier élément.

Le code prend maintenant le N-ième élément **en partant de la droite** (`N =
TRUSTED_PROXY_HOPS`, 1 par défaut), en supposant qu'il y a exactement un proxy de
confiance entre l'internet et l'application — celui de Render. C'est une hypothèse
raisonnable d'après les constats publics sur le comportement de Render, mais **elle
n'a jamais été vérifiée en conditions réelles sur ce compte Render**. Ce runbook comble
ce manque : il vérifie, sans lire aucun code, que la clé suit bien la vraie IP et pas
l'en-tête envoyé par le client.

## Ce qu'on observe

`/api/scan` limite à 3 requêtes par minute et par clé (voir la constante `MAX_REQUESTS`
dans `decelio/app/api/scan/route.ts` — vérifier qu'elle vaut toujours 3 avant de lancer
ce runbook ; ajuster le nombre de requêtes ci-dessous si elle a changé).

Le principe : envoyer, **depuis un même poste** (donc une seule IP réelle), plus de
requêtes que la limite vers `/api/scan`, chacune avec un `X-Forwarded-For` **différent et
choisi au hasard**.

- Si les dernières requêtes reçoivent **429** malgré des `X-Forwarded-For` tous
  différents : la clé suit bien la vraie IP vue par le proxy de Render, pas l'en-tête du
  client. Le contrôle est bon.
- Si **aucune** requête ne reçoit 429 (toutes passent en 200/400/403) : le proxy de
  Render n'ajoute pas l'IP à la position attendue pour ce compte, ou le nombre de relais
  est différent de ce qu'on suppose. Il faut alors régler la variable d'environnement
  `TRUSTED_PROXY_HOPS` sur Render (l'augmenter ou la diminuer d'un cran) et refaire le
  test, plutôt que de conclure que la protection ne marche pas.

**Important : `/api/scan` lance un vrai scan à chaque requête.** N'utiliser que
l'URL d'un domaine qui nous appartient (par exemple `https://decelio.com` ou un sous-domaine
de test), jamais le site d'un tiers.

## Commandes

Remplacer `https://TON-DOMAINE-DECELIO` par l'URL réelle en production, et
`https://un-domaine-qui-est-le-tien.example` par un domaine dont on est propriétaire.

### PowerShell 5 (Windows — `&&` n'y fonctionne pas, on sépare les lignes)

```powershell
$base = "https://TON-DOMAINE-DECELIO"
$cible = "https://un-domaine-qui-est-le-tien.example"

for ($i = 1; $i -le 5; $i++) {
    $ipFactice = "$(Get-Random -Minimum 1 -Maximum 254).$(Get-Random -Minimum 1 -Maximum 254).$(Get-Random -Minimum 1 -Maximum 254).$(Get-Random -Minimum 1 -Maximum 254)"
    try {
        $reponse = Invoke-WebRequest -Uri "$base/api/scan" -Method Post `
            -Headers @{ "X-Forwarded-For" = $ipFactice; "Content-Type" = "application/json" } `
            -Body (@{ url = $cible } | ConvertTo-Json) `
            -SkipHttpErrorCheck
        Write-Host "Requete $i (X-Forwarded-For: $ipFactice) -> statut $($reponse.StatusCode)"
    } catch {
        Write-Host "Requete $i (X-Forwarded-For: $ipFactice) -> erreur $($_.Exception.Message)"
    }
}
```

### bash

```bash
base="https://TON-DOMAINE-DECELIO"
cible="https://un-domaine-qui-est-le-tien.example"

for i in $(seq 1 5); do
  ip_factice="$((RANDOM % 254 + 1)).$((RANDOM % 254 + 1)).$((RANDOM % 254 + 1)).$((RANDOM % 254 + 1))"
  statut=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$base/api/scan" \
    -H "X-Forwarded-For: $ip_factice" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$cible\"}")
  echo "Requete $i (X-Forwarded-For: $ip_factice) -> statut $statut"
done
```

## Lecture du résultat

- Les 3 premières requêtes en 200 (ou 400/403 selon la réponse du scan), puis les
  suivantes en **429** : attendu, la protection fonctionne.
- Toutes les requêtes en 200/400/403, jamais de 429 : le réglage de
  `TRUSTED_PROXY_HOPS` ne correspond pas à ce que fait le proxy de Render pour ce
  compte. Ajuster la variable dans les paramètres du service sur Render, puis refaire
  le test après le redéploiement qu'elle déclenche.
- Un 429 dès la première requête (avant même d'atteindre la limite) : quelqu'un
  d'autre partage déjà la même clé au même moment (une autre limite en cours, ou un
  test précédent pas encore expiré) — attendre la fin de la fenêtre d'une minute et
  recommencer avant de tirer une conclusion.
