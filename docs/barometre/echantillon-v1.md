# Échantillon v1 du baromètre « Les sites français bloquent-ils ChatGPT ? »

> Constitué le 27 septembre 2026. Aucun site listé ici n'a été visité ni scanné : ce document ne fait que rassembler des domaines à partir de classements et annuaires publics, pour validation par le fondateur avant tout scan (`docs/13-barometre-ia.md`). Fichier de travail, jamais publié nommément (`docs/13` §2, `docs/08-constitution.md`).

## 1. Résultat en un coup d'œil

**312 domaines uniques**, très en dessous de la cible de 500 à 700 lignes fixée par `docs/13-barometre-ia.md` §2. Conformément à la consigne reçue, je m'arrête et le documente plutôt que de compléter avec des domaines non sourcés :

| Catégorie | Lignes | Cible (`docs/13`) | Écart |
|---|---:|---:|---|
| Médias et éditeurs | 226 | inclus dans le lot 300–400 (avec PME et e-commerce) | Volume correct pour cette sous-catégorie seule |
| E-commerce | 44 | inclus dans le lot 300–400 | Volume correct pour cette sous-catégorie seule |
| PME / TPE de services | **0** | inclus dans le lot 300–400 | **Non atteint, voir §4** |
| Agences web / SEO / GEO | 42 | 100–150 | **Non atteint, voir §4** |
| **Total** | **312** | 500–700 | Manque ~190 à 390 lignes |

## 2. Sources utilisées, par catégorie

### Médias et éditeurs (226 lignes)

- **Source unique** : [Classement unifié sites web grand public, ACPM, août 2026](https://www.acpm.fr/classements/united-web-sites-gp) — relevé le 27 septembre 2026. L'ACPM (ex-OJD) est l'organisme interprofessionnel de référence pour l'audience de la presse française ; ce classement liste 234 supports mesurés (visites totales, pages vues), triés par audience.
- **Méthode d'extraction** : lecture directe du tableau HTML de la page (234 lignes), sans scan des sites eux-mêmes.
- **Exclusions** (3 domaines retirés du classement ACPM) :
  - `leboncoin.fr` : classifiées / marketplace C2C, déjà compté dans la catégorie e-commerce.
  - `cvdesignr.com` : outil de création de CV, pas un éditeur de contenu.
  - `libramemoria.com` : service d'avis de décès, pas un éditeur de contenu.
- **Sous-catégorie** : affectée par une règle automatique simple (mots-clés dans le nom de domaine : presse régionale/locale, magazine, TV/radio, sinon presse nationale/pure player). **C'est une approximation grossière, à corriger à la main avant publication** — plusieurs cas limites existent (ex. `radiofrance.fr` classé presse nationale faute de règle dédiée, `boursorama.com` classé presse nationale alors que c'est d'abord un site financier avec une rédaction).

### E-commerce (44 lignes)

- [Top 100 E-Commerce France, 2ème semestre 2023, E-Commerce Nation / Similarweb](https://www.ecommerce-nation.fr/top-ecommerce-france/) — article public, chiffres Similarweb ; seul le Top 10 et une quinzaine d'enseignes supplémentaires sont détaillés en clair dans le texte (le classement complet des 100 est réservé au téléchargement, non récupéré ici).
- [Classement FEVAD 2025 des sites e-commerce en nombre de clients](https://www.fevad.com/classement-fevad-2025-des-sites-e-commerce-en-nombre-de-clients/) — la FEVAD (fédération professionnelle du e-commerce, partenaire Médiamétrie/Toluna) publie en accès libre le podium (Top 5) de chacun des 12 secteurs étudiés (mode, culture, électronique, jouets, sport, beauté, meuble, bricolage, alimentaire…) ; le Top 20 complet par secteur est réservé aux adhérents FEVAD et n'a pas été demandé.
- **Domaines reconstitués manuellement** à partir des noms de marque cités dans ces deux articles (ex. « Leroy Merlin » → `leroymerlin.fr`) : ce sont des enseignes très connues, mais je n'ai pas vérifié individuellement chaque domaine par une recherche dédiée — **à valider avant scan**, en particulier les domaines non `.fr` (ex. `zara.com`, `nike.com`, `apple.com`).

### PME / TPE de services (0 ligne — non atteint)

Je n'ai pas trouvé, dans le temps imparti à cette tâche, de source publique qui liste en une fois plusieurs centaines de PME/TPE de services françaises avec leur domaine (contrairement à l'e-commerce ou aux médias, il n'existe pas de palmarès d'audience équivalent pour ce segment). Pistes explorées et écartées ou non exploitées :

- **La Fabrique du Net** (catégories agences) : les pages de profils d'agences citent parfois des clients PME dans leurs études de cas (ex. « Lokizi », « Wealthcome », « Céline Gachet Hypnose », « SSIG Sécurité », « Infini Cycle » ont été vus en cours de recherche), mais le nom de domaine n'apparaît pas en clair dans le texte ni dans un lien exploitable en masse — il faudrait une recherche dédiée par entreprise, non industrialisable dans le temps disponible.
- **Annuaires professionnels génériques** (Pages Jaunes, Kompass, Societe.com) : listent des entreprises mais sans classement public exportable en masse sans compte, et leur usage à ce volume ressemblerait à une extraction automatisée non prévue par la consigne (« pas de scraping massif »).
- Ce qu'il faudrait pour compléter cette catégorie : soit un classement public sourcé (palmarès sectoriel, ex. CCI, ordres professionnels, fédérations de PME), soit un budget de temps pour visiter individuellement une dizaine de pages « études de cas » d'agences et y relever les domaines cités.

### Agences web / SEO / GEO (42 lignes sur 100–150 visés)

- [agencegeo.pro — Les meilleures agences GEO en France](https://agencegeo.pro/) (6 domaines)
- [Webconversion — Classement des meilleures agences GEO 2026](https://www.webconversion.fr/classement-agences-geo/) (5 domaines)
- [Little Big Things — Top 10 des meilleures agences GEO à Paris](https://littlebigthings.fr/agence-geo) (6 domaines)
- [Julien Gourdon — Les meilleures agences GEO en France en 2026](https://julien-gourdon.fr/article/meilleures-agences-geo-france) (8 domaines)
- [Digitiz — Les 20 meilleures agences SEO en France (2026)](https://digitiz.fr/agences-seo/) (14 domaines)
- [SEO Monkey — Top 30 des meilleures agences SEO en France (2026)](https://www.seo-monkey.fr/meilleure-agence-seo/) (3 domaines)

**Pourquoi si peu par rapport à la cible de 100–150 :** `docs/13` cite La Fabrique du Net (« > 1 500 prestataires référencés ») comme source principale. J'ai vérifié cette source (803 agences dans la catégorie « Web » à elle seule, réparties sur 7 pages) : le bouton « Visiter le site » de chaque fiche agence est un élément JavaScript sans lien direct exploitable (pas de `href`), ce qui rend l'extraction automatique du nom de domaine impossible sans ouvrir individuellement chaque fiche (803 pages), une opération que je n'ai pas engagée car hors du temps imparti et proche du scraping massif exclu par la consigne. J'ai donc utilisé six articles indépendants de classement d'agences GEO/SEO qui, eux, publient des liens directs vers le site de chaque agence citée.

**Biais reconnu** : ces six classements se recoupent beaucoup (Eskimoz, Noiise, Jalousie Agency, Oscar Référencement, Primelis, Digimood reviennent dans plusieurs) — le total dédupliqué (42) est donc plus proche de « les agences GEO les plus citées dans les palmarès de blogs spécialisés » que d'un tirage représentatif des 800+ agences web françaises. Aucune agence de maintenance WordPress n'est représentée (le kit de prospection, `docs/06`, cible pourtant aussi ce segment) : à compléter via Malt ou WP Marmite si le fondateur le souhaite.

## 3. Critères d'inclusion et d'exclusion

**Inclusion** : domaine cité nommément dans une source publique listée ci-dessus, avec une activité identifiable (média, marchand, agence), orthographe de domaine plausible (présence d'un TLD reconnu, pas d'espace ni de caractère invalide).

**Exclusion** : doublons (un domaine compté une seule fois, dans sa catégorie la plus pertinente — ex. Leboncoin en e-commerce, pas en médias) ; sites qui ne sont pas des éditeurs de contenu bien qu'apparaissant dans un classement d'audience généraliste (`cvdesignr.com`, `libramemoria.com`) ; aucun site n'a été visité pour vérifier son accessibilité ou l'absence de mention « site privé » — cette vérification, prévue par `docs/13` §2, reste à faire avant le scan, puisque je n'ai pas ouvert les sites eux-mêmes (mission = pas de scan).

## 4. Biais connus

- **Sur-représentation des sites qui optimisent leur visibilité dans les classements** : les agences SEO/GEO retenues sont précisément celles qui savent se faire citer dans les palmarès de blogs spécialisés — un biais de sélection qui favorise les agences déjà très visibles, à l'opposé des petites agences discrètes que le kit de prospection (`docs/06`) cible aussi.
- **Médias** : le classement ACPM mesure l'audience, pas la taille d'entreprise ni la vulnérabilité au blocage IA — de très gros médias nationaux et de très petits titres de presse quotidienne régionale (PQR) cohabitent dans la même liste, ce qui est cohérent avec l'objectif du baromètre (secteur médias dans son ensemble) mais mélange des profils techniques très différents (CMS propriétaire vs WordPress mutualisé).
- **E-commerce** : liste dominée par de grandes enseignes nationales et des marketplaces internationales, pas des PME e-commerce — parce que les seules sources publiques trouvées en une recherche raisonnable sont des classements d'audience (qui favorisent mécaniquement les gros sites), pas des annuaires de petits marchands.
- **Domaines e-commerce reconstitués, pas copiés-collés** : contrairement aux catégories médias et agences (domaine lu directement dans la source), les 44 domaines e-commerce ont été complétés à partir d'un nom de marque cité en texte. Risque d'erreur non nul (ex. bon domaine mais mauvais TLD) — **à vérifier avant scan**, la consigne demandant seulement des domaines « qui ont l'air valides », pas visités.
- **Aucune PME/TPE de services, aucune institution/collectivité** : catégories non couvertes (voir §2). `docs/13-barometre-ia.md` ne prévoit d'ailleurs pas explicitement de catégorie « institutions et collectivités » dans son plan d'échantillonnage (§2) — je ne l'ai donc pas traitée comme un manque, sauf si le fondateur souhaite l'ajouter.
- **Date unique** : toutes les lignes portent la date du 27 septembre 2026 (date de constitution de cette liste), pas une date de relevé individuelle par source — les classements sources eux-mêmes datent d'août-septembre 2026 pour l'essentiel, sauf le FEVAD (étude menée fin octobre-début novembre 2025, publiée février 2026).

## 5. Ce que le fondateur doit valider avant le scan

1. **Le volume** : accepter un échantillon de 312 sites pour un premier scan (au lieu de 500–700), ou financer/planifier le temps nécessaire pour compléter PME/TPE (0 ligne) et agences (42/100–150) — voir pistes au §2.
2. **Les 44 domaines e-commerce reconstitués à la main** : un rapide coup d'œil pour confirmer qu'aucun TLD n'est faux (risque le plus probable : confusion `.com`/`.fr` sur une marque internationale).
3. **La sous-catégorie automatique des 226 médias** : relecture rapide, en particulier des cas ambigus signalés au §2 (`boursorama.com`, `radiofrance.fr`).
4. **Le choix de ne pas inclure d'agences de maintenance WordPress** dans le lot agences (biais signalé au §2), alors que `docs/06-kit-prospection.md` cible aussi ce segment pour la prospection qui suivra le baromètre.
5. **La décision sur « institutions et collectivités »** : absente de `docs/13-barometre-ia.md` §2 et de cet échantillon — à ajouter explicitement si voulue, avec sa propre source (ex. annuaire officiel des collectivités sur data.gouv.fr, non exploré ici).

## 6. Fichier

`docs/barometre/echantillon-v1.csv` — 312 lignes de données + 1 ligne d'en-tête, colonnes `domaine,categorie,sous_categorie,source_url,date_releve`. Domaines uniques (vérifié), sans `www.`, sans chemin.
