# Système de design Decelio (septembre 2026)

Source unique : `decelio/app/globals.css`. Vitrine : `/design-system` (noindex). Primitives : `decelio/components/ui/`.

## 1. Direction

**Chrome silencieux, verdicts parlants.** Decelio vend de la tranquillité à des agences qui doivent savoir *avant leur client*. L'interface se tait : papier froid, encre marine, filets fins. La couleur n'a qu'un sens, le verdict d'un site pour un assistant (Lu, Refusé, Vide, Inconnu). Tout état porte sa date, comme sur un rapport imprimé.

Cinq principes :

1. **Une action principale par écran.** Un seul bouton en encre pleine ; le reste est en contour ou en texte.
2. **Un verdict, c'est une forme et un mot.** Jamais une couleur seule : cercle plein + coche, octogone + croix, anneau pointillé, anneau + point d'interrogation.
3. **Filets avant ombres.** Les cartes sont délimitées par un filet 1 px et le contraste papier / surface. L'ombre n'existe que pour ce qui flotte (menu, dialogue).
4. **Tout état porte sa date.** « Vérifié à 04:12 », « stable depuis 41 j ». C'est la preuve que l'agence revend.
5. **Le mouvement répond, il n'accueille pas — sauf l'onde de la page d'accueil.** Dans l'application, aucune animation d'entrée ; les transitions montrent ce qui a changé après une action. Sur la page d'accueil marketing (décision du fondateur, 27/09/2026), une seule idée de mouvement, reprise du logo : l'onde. Les anneaux du héros se tracent du centre vers l'extérieur, les mots du titre arrivent en cascade, une onde lente repart du centre, et au défilement les blocs marqués `.reveal` montent en cascade selon leur rang (`--i`). Défilement en CSS pur (`animation-timeline: view()`) : sans prise en charge, le contenu est simplement visible. Tout est coupé par `prefers-reduced-motion`. Voir `globals.css`, section 6.

Choix revus lors de la passe anti-cliché : bouton principal en encre marine plutôt qu'en bleu (le bleu ne signale que l'interactif dans le texte) ; pas de mono pour les domaines et codes HTTP (chiffres tabulaires du sans, mono réservé aux extraits `robots.txt`) ; en-têtes et libellés en casse de phrase, sans capitales espacées ; aucun dégradé, sauf le halo radial bleu du héros de la page d'accueil, qui reprend `--brand-soft` ; rayons hiérarchisés (4 / 6 / 10 / 14 ; la page d'accueil utilise des rayons plus généreux, 20 à 32, pour ses blocs) au lieu d'un rayon unique ; pas de flèche dans les boutons ; encre visiblement bleutée (#18213a) plutôt qu'un noir teinté.

## 2. Jetons

### Couleurs

| Rôle | Jeton | Clair | Sombre | Contraste (clair) |
|---|---|---|---|---|
| Fond de page | `--paper` | `#f3f5f8` | `#0e131d` | — |
| Surface (cartes, champs) | `--surface` | `#ffffff` | `#151c29` | — |
| Surface discrète (survol, en-têtes) | `--surface-2` | `#e9edf2` | `#1e2736` | — |
| Encre (texte, action principale) | `--ink` | `#18213a` | `#e6eaf2` | 15.9:1 sur blanc |
| Encre 2 (texte secondaire) | `--ink-2` | `#5a6478` | `#a2acbf` | 5.9:1 |
| Encre 3 (placeholder, désactivé) | `--ink-3` | `#8a93a6` | `#6e7a90` | 3.1:1, jamais pour du texte courant |
| Filet | `--line` | `#d9dfe7` | `#273142` | — |
| Filet fort (bordure de contrôle) | `--line-strong` | `#8390a3` | `#5f6b82` | 3.2:1 (WCAG 1.4.11) |
| Marque (logo, accents de marque) | `--brand` / `--brand-soft` | `#1d4ca4` / `#e8eefb` | `#7ea6f0` / `#16233d` | 8,0:1 sur blanc, 7,3:1 sur `--paper` |
| Cobalt (liens, focus, sélection) | `--cobalt` / `--cobalt-soft` | `#2b55d0` / `#e6ecfb` | `#8caaff` / `#1b2a4f` | 6.3:1 |
| Lu | `--ok` / `--ok-soft` | `#177249` / `#e1f3ea` | `#4fcb8e` / `#12331f` | 5.9:1 blanc, 5.1:1 sur soft |
| Refusé | `--stop` / `--stop-soft` | `#be2b2b` / `#fbe7e7` | `#f2716a` / `#3e1a1a` | 5.6:1, 5.0:1 sur soft |
| Vide | `--warn` / `--warn-soft` | `#8f5a00` / `#fbf0d9` | `#e8a93f` / `#3a2a0e` | 5.1:1, 5.1:1 sur soft |
| Inconnu | `--unknown` / `--unknown-soft` | `#5d6880` / `#edf0f4` | `#9aa4b8` / `#242c3a` | 4.9:1, 4.9:1 sur soft |

Classes Tailwind : `bg-paper`, `text-ink-2`, `border-line-strong`, `text-ok`, `bg-stop-soft`, etc. Les alias shadcn (`bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring`) pointent sur ces jetons. Le thème sombre s'active avec la classe `.dark` sur `<html>` ou sur un conteneur ; il est prévu pour l'application, le marketing reste clair.

`--brand` est le bleu du logo. Il sert à l'identité — marque déposée, accents, tracé du héros — jamais à un verdict : un site lu reste `--ok`, un site bloqué reste `--stop`. En sombre, le bleu d'origine tombe à 1,4:1 sur `--paper` ; la variante `#7ea6f0` le remonte à 7,6:1.

**Attention au faux ami.** `--color-cited` et l'alias `cited` désignent l'état « cité par une IA », hérité du nom précédent du produit. Ce n'est pas la couleur de la marque. Les renommer en `--color-brand` casserait le sens.

Alias historiques conservés le temps de la migration : `paper-deep` → surface-2, `cited` → ok, `rival` → stop, `signal` → warn, `muted` → ink-2 (texte gris : **ne pas utiliser `bg-muted`**), `line` → line.

### Typographie

Texte : **Schibsted Grotesk** (`next/font/google`, variable `--font-marketing`, exposée comme `font-sans`). Titres d'affichage : **Bricolage Grotesque** à taille optique (variable `--font-bricolage`, classe `font-display`), jamais pour du texte courant. Depuis l'harmonisation de septembre 2026 (décision du fondateur), `font-display` couvre aussi le Titre 1 de chaque page de l'application (Portefeuille, Alertes, Rapports, Paramètres) : c'est le seul usage de Bricolage dans l'application, tout le reste du texte applicatif reste en Schibsted. Les deux familles sont servies depuis notre domaine par `next/font` (aucune requête vers Google depuis le navigateur). Mono : Geist Mono (`font-mono`), uniquement pour du code.

| Rôle | Taille / interligne | Graisse | Classe |
|---|---|---|---|
| Affichage (héros marketing) | clamp(36, 56) / 1.05, -0.025em | 700 | `type-display` |
| Titre 1 (page) | 28 / 34, -0.02em | 600 | `font-display text-[28px] leading-[34px] font-semibold` |
| Titre 2 (section) | 22 / 28 | 600 | `text-[22px] leading-7 font-semibold` |
| Titre 3 (carte) | 17 / 24 | 600 | `text-[17px] leading-6 font-semibold` |
| Corps marketing | 17 / 26 | 400 | `.root` de `tokens.module.css` |
| Corps application | 14 / 20 | 400 | `text-sm` |
| Interface, libellés | 14 / 20 | 500 | `text-sm font-medium` |
| Tableau | 13 / 18 | 400 / 500 | `type-table` |
| Légende, aide | 12 / 16 | 400 | `type-caption` |

`tnum` (chiffres tabulaires) sur les cellules numériques et les heures seulement : dans Schibsted, la fonction élargit aussi la ponctuation. Lignes de 45 à 75 caractères (`max-w-[60ch]`).

Les rôles `type-*` sont des utilitaires (`@utility`) et non des tailles `text-*` : le fusionneur de classes prendrait `text-table` pour une couleur et supprimerait `text-primary-foreground`.

### Espacement, rayons, élévation, mouvement

- **Espacement** : base 4 px. Rythme : 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Marge de page : 16 (mobile), 24 (tablette), 40 (bureau). Écart entre sections d'application : 32. Rembourrage de carte : 20 (16 en `size="sm"`). Cellule de tableau : 12 × 10.
- **Rayons** par niveau : `rounded-xs` 4 (puces, tampons, cases), `rounded-sm` 6 (boutons, champs), `rounded-lg` 10 (cartes, tableaux), `rounded-xl` 14 (dialogues, grands blocs marketing), `rounded-full` (avatars).
- **Élévation** : niveau 0 papier ; niveau 1 surface + filet ; niveau 2 flottant, `shadow-float` (`0 1px 2px / 0 12px 32px -12px` d'encre à 22 %). Rien d'autre.
- **Mouvement** : `--duration-1` 120 ms (survol, focus), `--duration-2` 200 ms (ouverture, dépliage), `--duration-3` 320 ms (un seul moment d'entrée par page, classe `animate-fade-in`). Courbe `--ease-brand` `cubic-bezier(.2,.7,.2,1)`. `prefers-reduced-motion` neutralise tout.

### Verdicts

| Valeur | Mot | Forme | Ton | Sens |
|---|---|---|---|---|
| `lu` | Lu | cercle plein + coche | `ok` | l'assistant lit la page |
| `refuse` | Refusé | octogone plein + croix | `stop` | bloqué : robots.txt, pare-feu, code HTTP |
| `vide` | Vide | anneau en pointillés | `warn` | répond mais pas assez de texte utile |
| `inconnu` | Inconnu | anneau + point d'interrogation | `unknown` | pas vérifié, mesure impossible |

Les quatre silhouettes restent distinctes en niveaux de gris (contrôle visible sur `/design-system`). Un PDF imprimé en noir et blanc reste lisible.

### Densité des tableaux

Ligne de 44 px (`h-11`), texte 13 px, en-tête 12 px 500 en casse de phrase avec une règle d'encre (`border-b border-ink`) ; filets `line` entre les lignes, pas de filet vertical, pas de zébrage, survol `bg-paper`. Colonne site : domaine en 500 + client en légende. Verdicts en `variant="inline"` ; passer en `variant="glyph"` sous 900 px de large ou au-delà de 5 colonnes d'assistants. Nombres et heures à droite avec `tnum`. Actions de ligne en `Button size="sm" variant="ghost"`. Largeur minimale 720 px, défilement horizontal du conteneur sur mobile.

## 3. Composants

| Composant | Fichier | Variantes | Notes |
|---|---|---|---|
| `Button` | `components/ui/button.tsx` | `default` encre, `outline`, `secondary`, `ghost`, `destructive`, `link` ; tailles `sm` 32, `default` 36, `lg` 44, `xl` 48, `icon*` | Libellé = verbe. Icône avec `data-icon="inline-start"`. `sm` réservé aux tableaux de bureau (cible tactile 44 px ailleurs). |
| `Input` | `components/ui/input.tsx` | `fieldSize="default"` 36, `"lg"` 44 | Toujours un `<label htmlFor>` visible. Erreur : `aria-invalid` + `aria-describedby` vers un texte en `text-stop`. |
| `Badge` | `components/ui/badge.tsx` | `default`, `ink`, `outline`, `info`, `ok`, `stop`, `warn` | Plan, canal, compteur. Jamais pour un verdict. |
| `Verdict` | `components/ui/verdict.tsx` | `variant` `stamp` / `inline` / `glyph`, `size` sm / md / lg, `detail` | `verdictFromStatus()` traduit les statuts historiques (`OK`, `BLOQUÉ`, `COQUILLE VIDE`, `ACTIVE`). `glyph` garde le mot en `sr-only`. |
| `Card` | `components/ui/card.tsx` | `size` default / sm ; `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | Filet, rayon 10, aucune ombre. Le pied se cale en bas. |
| `Accordion` | `components/ui/accordion.tsx` | — | FAQ, détails d'alerte. Un chevron qui pivote. |
| `Avatar` | `components/ui/avatar.tsx` | `size` sm / default / lg, `AvatarGroup`, `AvatarGroupCount`, `AvatarBadge` | Initiales en 12 px 600. |
| `Separator` | `components/ui/separator.tsx` | `strong` | `strong` = règle d'encre. |

Modèle d'une alerte (voir `/design-system`) : glyphe du verdict, titre en 15 px 600 qui nomme l'assistant et le site, puis deux lignes `Cause` et `Correctif`, l'heure à droite, deux actions au plus (« Voir le site », « Marquer traité »). Une alerte résolue reste listée à 70 % d'opacité.

### Logo

| Fichier | Usage |
|---|---|
| `public/logo-decelio.png` | Fonds clairs. Détouré, fond transparent, recadré au contenu. |
| `public/logo-decelio-blanc.png` | Fonds sombres (pied de page en `--ink`), où le bleu tombe sous le seuil. |
| `app/icon.png` | Favicon, 512 px, transparent. Convention de fichiers Next.js. |
| `app/apple-icon.png` | Écran d'accueil iOS, 180 px, fond blanc (iOS n'accepte pas la transparence). |

Le logo est un D tracé en lignes concentriques irrégulières. Toujours accompagné du mot « Decelio » : seul, il n'est pas encore
reconnaissable. Dans une pastille, utiliser `--brand-soft` en fond et `--brand` à 15 % en filet.

### Motif du héros

Le fond du héros reprend le logo : des anneaux concentriques légèrement ondulés, chacun avec son propre nombre de lobes et sa
propre phase, de sorte qu'aucun ne se superpose exactement à un autre (`contourPath()` dans `components/home/HeroConcentric.tsx`).
L'amplitude reste sous 2 % du rayon — au-delà, l'anneau cesse de se lire comme un cercle. Les deux anneaux intérieurs restent
nus : le centre appartient au contenu.

## 4. Faire / ne pas faire

| Faire | Ne pas faire |
|---|---|
| Un bouton `default` par écran | Deux boutons en encre côte à côte |
| Verdict = `<Verdict>` (forme + mot) | Une pastille de couleur seule, ou `<Badge variant="ok">Lu</Badge>` |
| Dater chaque état (« vérifié à 04:12 ») | Un état sans horodatage |
| Cartes en filet 1 px, rayon 10 | Ombre portée sous chaque carte, dégradés |
| Libellés en casse de phrase | Capitales espacées, « eyebrow » au-dessus de chaque titre |
| Verbes sur les boutons (« Ajouter un site ») | « Soumettre », « → », icône décorative |
| Séparer les métadonnées par un espace ou une virgule | Points médians « A · B · C » |
| `tnum` sur les nombres | `tnum` sur un domaine ou une phrase |
| `font-mono` sur un extrait `robots.txt` | Mono pour un domaine, un code HTTP ou un libellé |
| Erreur : quoi, pourquoi, comment corriger | « Une erreur est survenue » |
| État vide : ce que c'est, pourquoi vide, quoi faire | Illustration sans action |

## 5. Règles de conversion (pages marketing)

Cible : freelances et agences de maintenance WordPress, fondateurs d'agences SEO/GEO. Ils achètent la confiance et la précision ; ils se méfient des promesses de « visibilité IA ».

1. **Clarté du héros.** Le titre dit ce que fait le produit et pour qui, en une phrase sans métaphore (« Sachez avant votre client si ChatGPT, Claude ou Perplexity ne lisent plus son site »). Sous-titre : le mécanisme (vérification quotidienne, alerte avec cause et correctif, rapport mensuel à votre logo). Pas de mot en couleur dans le titre.
2. **Une seule action principale au-dessus de la ligne de flottaison.** Le scan gratuit (`ScanForm`) ou l'essai. Le second bouton est en contour et mène à une preuve (rapport d'exemple), pas à une autre conversion.
3. **La preuve à côté de l'action.** Sous ou à côté du formulaire : un verdict réel et daté (capture avant / après), le nombre de sites surveillés, un nom d'agence identifiable. Pas de logos génériques, pas de chiffres inventés.
4. **Nommer l'ennemi.** Les blocages silencieux : règle Cloudflare, Wordfence, pare-feu d'hébergeur, mise à jour de plugin. Montrer une alerte réelle avec cause et correctif : c'est l'argument le plus concret.
5. **Lisibilité des tarifs.** Trois formules au plus, prix mensuel en gros chiffres tabulaires, ce qui change entre formules en une ligne (nombre de sites, rapport en marque blanche, intégration Cloudflare), la formule recommandée signalée par un filet d'encre et non par une couleur. Indiquer « sans engagement » et « sans installation chez vos clients » près du bouton. Pas de « Contactez-nous » pour la formule de base.
6. **Friction du formulaire.** Scan gratuit : un champ (domaine), pas de compte. Inscription : trois champs (agence, e-mail, mot de passe), le nombre de sites en second écran ; carte bancaire à la dernière étape et dit clairement. Étiquette visible, aide sous le champ, erreur en texte, validation au blur et non à la frappe.
7. **Copie.** Phrases courtes, verbes actifs, vocabulaire du client (« pare-feu », « plugin », « rapport mensuel ») plutôt que « GEO », « AEO ». Aucun tiret cadratin décoratif, aucune flèche.
8. **Une grille tarifaire se compare ou ne sert à rien.** Les trois paliers exposent les mêmes lignes, dans le même ordre. Ce qui manque à un palier s'écrit avec un tiret et un `sr-only` « non inclus », jamais par omission : c'est le manque visible qui vend le palier supérieur. Le même verbe sur les trois boutons, et le même que dans l'application (« Choisir Agence »).
9. **Répondre aux quatre questions d'achat près du bouton.** Engagement, moyen de paiement, essai, dépassement de quota. Chaque réponse se vérifie dans `lib/billing/` avant d'être écrite : au 27 septembre 2026, abonnement Stripe mensuel, sans `trial_period_days`, carte obligatoire, quota appliqué par `PLAN_LIMITS`.
10. **Une comparaison à un concurrent se date.** Un prix relevé chez un tiers vieillit et devient faux tout seul. Indiquer le mois du relevé et inviter à vérifier chez l'éditeur.
11. **Pas de liste de plus de cinq points opposée à une autre liste.** Deux colonnes de six puces ne se comparent pas : on lit les six premières, puis les six suivantes. Aligner les paires sur une même ligne, et en garder quatre au plus.

## 6. Accessibilité (plancher)

- Contraste : texte ≥ 4.5:1, texte large et composants ≥ 3:1 (voir tableau des couleurs). `ink-3` seulement pour placeholders et états désactivés.
- Focus : contour cobalt 2 px, décalé de 2 px, sur tout élément interactif (`:focus-visible` global).
- Cibles tactiles : 44 px minimum sur mobile (`Button size="lg"`, `Input fieldSize="lg"`). `sm` réservé aux tableaux de bureau.
- Verdicts : forme + mot ; `variant="glyph"` conserve le mot en `sr-only`.
- Formulaires : `<label htmlFor>` visible, `aria-invalid`, `aria-describedby` vers le message, erreur qui dit quoi corriger.
- Tableaux : `<caption>` (`sr-only` accepté), `scope="col"`, colonne d'actions avec en-tête `sr-only`.
- Mouvement : `prefers-reduced-motion` respecté globalement. La règle remet aussi `animation-delay` à zéro — raccourcir la durée ne suffit pas quand l'animation part d'une opacité nulle : la page resterait vide pendant toute l'attente.
- Langue : `lang="fr"` sur `<html>` ; sentence case ; guillemets « » et espaces insécables devant `: ; ? !`.

## 7. Migration

Fait : `globals.css`, polices (`lib/fonts.ts`, `components/home/fonts.ts`), `tokens.module.css`, primitives `components/ui/*`, `Verdict`, vitrine `/design-system`, `app/(app)/layout.tsx` (Wordmark), `components/DashboardSites.tsx`, `app/(app)/reports/ReportsClient.tsx`, `app/(app)/alerts/AlertsJournal.tsx`, `app/(app)/settings/SettingsClient.tsx`, `app/(app)/onboarding/OnboardingClient.tsx` et `OnboardingPlanStep.tsx` (Wordmark, Titre 1 en `font-display`, jetons `--stop` au lieu du rouge codé en dur). `components/MarketingHeader.tsx`, doublon inutilisé de `SiteChrome`, a été supprimé.

À migrer : `app/login/page.tsx` et `app/register/page.tsx` (rouge `#ec3013` codé en dur, capitales espacées, fond de champ gris), `app/login/LoginForm.tsx` (flèche dans le bouton), `components/ui.tsx` (ancien `Badge` en capitales, `StatusDot` couleur seule, `ArrowLink`), `components/landing/*` hérités, `app/(marketing)/analyse/[domain]`, et le Titre 1 de `app/(app)/dashboard/page.tsx` et `app/(app)/sources/page.tsx` (JSX porté par ces `page.tsx`, propriété Ingénierie : passer leur `<h1>` en `font-display` comme les autres pages de l'application). Une fois migrés, supprimer `app/ds/`, `app/_ds/` et les alias historiques de `globals.css`.
