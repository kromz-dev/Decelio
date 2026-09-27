# Échantillon v2 du baromètre « Les sites français bloquent-ils ChatGPT ? »

> Constitué le 27 septembre 2026, à partir de `echantillon-v1.md`. Complète la v1 sur la catégorie « agences » ; la catégorie « PME/TPE de services » reste à 0 malgré une recherche plus large, documentée au §3. Comme la v1 : aucun site listé ici n'a été visité ni scanné. Fichier de travail, jamais publié nommément (`docs/13-barometre-ia.md` §2, `docs/08-constitution.md`).

## 1. Résultat en un coup d'œil

| Catégorie | v1 | v2 (ajouts) | Total v2 | Cible (`docs/13`) | Écart |
|---|---:|---:|---:|---:|---|
| Médias et éditeurs | 226 | 0 | 226 | inclus dans le lot 300–400 | Inchangé, non retravaillé dans cette tâche |
| E-commerce | 44 | 0 | 44 | inclus dans le lot 300–400 | Inchangé, non retravaillé dans cette tâche |
| Agences web/SEO/GEO | 42 | **+82** | **124** | 100–150 | **Atteint** |
| PME / TPE de services | 0 | 0 | **0** | inclus dans le lot 300–400 | **Toujours non atteint, voir §3** |
| **Total** | **312** | **+82** | **394** | 500–700 | Manque ~106 à 306 lignes, entièrement imputable à PME/TPE |

Aucun domaine n'a été inventé. Chaque ligne ajoutée provient d'un lien direct (`href`) trouvé dans une page publique listée au §2, vérifié un par un (pas d'extraction automatisée en masse). Zéro doublon avec la v1 (vérifié par comparaison exacte des 312 domaines existants).

## 2. Sources ajoutées — agences (82 nouveaux domaines)

### Agences de maintenance WordPress (39 domaines) — absentes de la v1

| Source | Date | Contenu | Domaines retenus |
|---|---|---|---|
| [WP Marmite — 18 agences WordPress incontournables en France (2026)](https://wpmarmite.com/wordpress/agence/) | 27/09/2026 | Article de classement, liens directs vers le site de chaque agence | 19 (BSA Web, AmphiBee, Digital Korner, Pilot'in, Churchill, Youdemus, DDESIGN, BeAPI, Maintenance WP, Web Performance, Globalis, Weare[WP], Swat, Inovagora, Whodunit, SeoMix, Ingenius, WP channel, Lynx Communication — `agencegalopins.com` déjà en v1, exclu) |
| [Digitiz — Les 20 meilleures agences WordPress (2026)](https://digitiz.fr/agences-wordpress/) | 27/09/2026 | Classement, liens directs | 9 nouveaux (ONI, Beeween, Fullstack, Limbus, Gradiweb, Kromaweb, Agence Debord, Phenix Info, Agence2Web — le reste recoupe la source WP Marmite) |
| [Kicklox — Les 10 meilleures agences WordPress (2024)](https://www.kicklox.com/blog-client/selection-meilleures-agences-wordpress/) | 27/09/2026 | Classement, liens directs | 8 nouveaux (RG Design, L'Agence 123, Digibase Web, Sixtrone, TheTribe, Ewolis, Emencia Lab, TKT Paris) |
| [AmphiBee — Meilleures agences WordPress (2026)](https://amphibee.fr/blog/meilleure-agence-wordpress) | 27/09/2026 | Classement (agence elle-même incluse en source, biais assumé) | 2 nouveaux (4Beez, Adexos) |
| [Pimptonseo — Meilleures agences de maintenance WordPress](https://pimptonseo.com/blog/meilleures-agences-maintenance-wordpress/) | 27/09/2026 | Classement | 0 nouveau (recoupe intégralement les sources précédentes) |

### Agences SEO/GEO (43 domaines) — en complément des 42 de la v1

| Source | Date | Contenu | Domaines retenus |
|---|---|---|---|
| [FePSeM — Annuaire officiel des agences membres de la fédération](https://fepsem.org/annuaire/agences/) | 27/09/2026 | Annuaire d'une fédération professionnelle (source institutionnelle, pas un blog de classement) ; liens directs vers chaque agence | 11 nouveaux (410 Gone, Zooka, Neper, Empirik, Dahive, Agence WAM, Rocketlinks, Areta, Première Page, La Mandrette, Poliris — Noiise, Resoneo, CyberCité, Net Strategy, Astrak déjà en v1) |
| [Webmarketing Conseil — Top agences référencement/SEO](https://www.webmarketing-conseil.fr/agences-referencement/) | 27/09/2026 | Page annuaire d'un média spécialisé, longue liste avec liens directs | 28 nouveaux (Webmarketing Conseil, Luneos, 1789, 1ère Position, 1min30, 209 Agency, Agence 404, Alioze, Axecibles, Cibleweb, Eventus Communication, Facem, Futur Digital, Indixit, Jalis, Keacréa, Korleon Biz, L'Agence Web, Laurent Bourrelly, Let's Clic, Meosis, Moov'up, Net Audience, Radis Noir, Seone, Tactee, Ydyle, Zaacom — Agence Ska, Brioude Internet, ID Interactive, Oscar, Yumens déjà en v1) |
| [Ad's Up Consulting — Meilleures agences SEO en France (2026)](https://ads-up.fr/publications/seo/meilleures-agences-seo-en-france-classement-2026/) | 27/09/2026 | Classement | 1 nouveau (ads-up.fr, seul lien direct sur cette page) |
| [Beetle SEO — Top 10 agences SEO](https://www.beetle-seo.com/les-10-meilleures-agences-seo-en-france/) | 27/09/2026 | Classement | 1 nouveau (Le Filon) |
| [Apsodia — Meilleures agences SEO en France 2026](https://www.apsodia.com/blog/les-meilleures-agences-seo-en-france-en-2026) | 27/09/2026 | Classement (auto-référencement de l'auteur, biais assumé) | 1 nouveau (apsodia.com) |
| [Sodigix — Meilleure agence SEO 2026](https://sodigix.com/blog/meilleure-agence-seo/) | 27/09/2026 | Classement (idem, auto-référencement) | 2 nouveaux (sodigix.com, seo.fr) |

**Méthode** : chaque page a été ouverte individuellement (11 pages au total pour les agences), le texte affiché et ses liens `href` lus directement — aucune extraction automatisée en masse, aucun contournement de protection anti-bot (2 pages ont renvoyé une erreur d'accès et ont été abandonnées, voir §4). Un domaine n'est retenu que s'il apparaît comme lien direct cliquable vers le site de l'agence elle-même, jamais reconstitué à partir d'un nom cité en texte seul (contrairement à l'e-commerce en v1).

## 3. PME / TPE de services — toujours 0 ligne, pistes élargies et toutes écartées

La v1 avait déjà cherché sans succès un palmarès d'audience équivalent à celui des médias ou du e-commerce pour ce segment. Cette tâche a exploré des pistes supplémentaires, documentées ici pour éviter de les retester inutilement :

| Piste explorée | Résultat |
|---|---|
| Palmarès régionaux d'artisanat (« Stars et Métiers » BPCE/CMA) | Lauréats cités par prénom/nom de commerce dans des articles de presse locale, sans lien vers un site web exploitable en masse. |
| Label « Entreprise du Patrimoine Vivant » (EPV, État, 1 448 entreprises) | Jeu de données public (`data.economie.gouv.fr`) confirmé, mais son schéma de colonnes n'a pas pu être vérifié à distance (pas de champ « site web » visible sans ouvrir le fichier) — à retester si le fondateur veut investir le temps de télécharger et inspecter le CSV source. |
| Bpifrance Excellence, Talents des Cités, 101 Femmes Entrepreneures | Lauréats cités par nom de personne et de commerce, sans domaine ; usage direct impossible sans recherche individuelle par entreprise (non industrialisable, comme la piste « études de cas d'agences » déjà écartée en v1). |
| Trophées CCI France International 2026 | Seulement 7 lauréats, essentiellement des groupes internationaux (Sodexo, Nidec, Socomec) — hors profil PME/TPE, écarté. |
| « Meilleur Commerce de France » (Wizville, 6 458 enseignes) | Classement confirmé volumineux, mais chaque ligne ne pointe que vers une fiche Google Maps, jamais vers le site web de l'enseigne — vérifié explicitement, aucun domaine récupérable. |
| Annuaires d'ordres professionnels (experts-comptables, architectes) | Annuaires officiels réels et publics, mais organisés en pages régionales puis fiches individuelles par cabinet (des dizaines de milliers d'entrées) : en extraire quelques centaines exigerait d'ouvrir un grand nombre de fiches une par une, ce qui déborde la limite « quelques dizaines de pages » de la consigne et s'apparenterait à une extraction automatisée non prévue. |
| Pages « études de cas / références clients » de 5 agences du §2 (Be API, Noiise, Empirik, Resoneo, Whodunit) | 3 pages en erreur d'accès (404/403), 1 page sans lien direct vers les sites clients (AmphiBee : 23 clients cités par nom seul, aucun domaine cliquable) — confirme le constat déjà fait en v1. |

**Conclusion honnête** : aucune ligne PME/TPE n'a pu être ajoutée dans le temps et le périmètre de cette tâche (pas de scan, pas d'extraction automatisée en masse, pas de fabrication de domaine). La piste la plus prometteuse non épuisée est le jeu de données EPV (`data.economie.gouv.fr`), à vérifier en le téléchargeant directement plutôt qu'en l'interrogeant à distance — décision à prendre par le fondateur (§5).

## 4. Incidents et limites de la collecte

- **La Fabrique du Net** (page « agences-wordpress ») a renvoyé une erreur 403 (accès refusé) lors de la tentative de lecture — abandonné, pas de contournement tenté (pas de bypass anti-bot, conforme à la consigne).
- **WP Community** (annuaire) ne liste que des profils individuels (freelances nommés) avec des liens vers des fiches internes au site, pas vers leur propre domaine professionnel — écarté pour éviter tout usage de données personnelles nominatives dans le fichier.
- Deux sources (AmphiBee, Apsodia, Sodigix) sont des articles où l'auteur se cite lui-même en tête de son propre classement — domaine retenu (l'agence existe réellement et le lien est direct), mais le biais est signalé explicitement au §5.

## 5. Biais connus (complète `echantillon-v1.md` §4)

- **Recoupement des classements de blogs SEO/GEO** : comme en v1, plusieurs agences (Eskimoz, Noiise, Digimood…) reviennent dans de nombreux articles ; les 82 nouveaux domaines viennent en grande partie d'un annuaire institutionnel (FePSeM, fédération professionnelle) et d'un annuaire de média spécialisé (Webmarketing Conseil) plutôt que de blogs de classement seuls, ce qui réduit un peu ce biais par rapport à la v1 mais ne l'élimine pas.
- **Auto-citation** : 3 domaines (amphibee.fr, apsodia.com, sodigix.com) proviennent d'un article où l'auteur inclut sa propre agence dans son propre classement — inclus car le domaine est réel et vérifiable, mais à noter si le fondateur veut les traiter différemment en prospection.
- **WordPress vs SEO/GEO, même catégorie** : les 39 agences de maintenance WordPress sont classées dans la même catégorie CSV que les 43 agences SEO/GEO (`agences web/SEO/GEO`), avec une sous-catégorie distincte (`agence maintenance WordPress` vs `agence SEO/GEO`) pour permettre de les filtrer séparément — décision prise pour rester compatible avec le schéma existant de la v1 (une seule colonne `categorie` pour les agences), à valider par le fondateur.
- **Aucune vérification d'activité** : comme en v1, aucun site n'a été visité pour confirmer qu'il est toujours en ligne, accessible sans authentification, ou toujours une agence en activité — à faire avant le scan (`docs/13` §2).
- **PME/TPE toujours à 0** : voir §3. Le baromètre reste, pour l'instant, un baromètre « médias + e-commerce + agences », pas un baromètre représentatif de toutes les tailles d'entreprises françaises — à dire explicitement dans toute publication, comme le prévoit déjà `docs/13-barometre-ia.md` §2.

## 6. Utilité pour la prospection (`docs/06-kit-prospection.md`)

Le kit de prospection cible explicitement les agences de maintenance WordPress et les agences SEO/GEO (§1 de `docs/06`). Les 82 domaines d'agences ajoutés ici en sont un point de départ direct, sans donnée personnelle :

- **39 agences de maintenance WordPress** identifiées par des classements spécialisés (WP Marmite, Digitiz, Kicklox, AmphiBee) — c'est exactement le segment que la v1 signalait comme totalement absent (`echantillon-v1.md` §2, §4).
- **43 agences SEO/GEO** supplémentaires, dont 11 issues d'un annuaire de fédération professionnelle (FePSeM) plutôt que de classements de blogs — un point d'entrée un peu plus « représentatif » que la v1 pour cette sous-catégorie.
- Aucun nom de client ni de contact individuel n'a été collecté à ce stade : seule l'étape « préparation par prospect » du kit (`docs/06` §1, relever 5 à 10 sites clients par agence) reste à faire, agence par agence, une fois le fondateur d'accord sur la liste.

## 7. Ce que le fondateur doit valider avant le scan

1. **Le choix de catégorie unique** (§5) pour WordPress et SEO/GEO — accepter la sous-catégorie comme distinction suffisante, ou scinder en deux catégories CSV séparées.
2. **Les 3 domaines issus d'auto-citation** (amphibee.fr, apsodia.com, sodigix.com) — les garder tels quels ou les retirer par prudence avant tout usage public.
3. **Le volume total de 394 sites** (au lieu de 500–700) — accepter ce volume pour un premier scan, ou financer le temps d'investigation du jeu de données EPV (§3) pour tenter d'atteindre la catégorie PME/TPE.
4. **La décision sur PME/TPE** : accepter l'absence totale de cette catégorie dans le baromètre, la traiter comme un axe de suivi séparé (hors baromètre initial), ou allouer un budget de temps dédié à une extraction manuelle plus lente (ordres professionnels, un cabinet à la fois) que le fondateur jugerait acceptable.
5. **Vérification technique** : comme en v1, aucun des 82 nouveaux domaines n'a été visité — à faire avant le scan (`docs/13` §2), en particulier pour écarter d'éventuels sites fermés depuis la publication des classements sources.

## 8. Fichier

`docs/barometre/echantillon-v2.csv` = 312 lignes de la v1 (inchangées) + 82 lignes ajoutées = **394 lignes de données + 1 ligne d'en-tête**, mêmes colonnes `domaine,categorie,sous_categorie,source_url,date_releve`. Domaines uniques (vérifié par comparaison exacte, aucun doublon avec la v1 ni entre les ajouts), sans `www.`, sans chemin.

## Décisions du fondateur (27/09/2026)

- Les 3 domaines issus d'articles écrits par leur propre agence (amphibee.fr, apsodia.com, sodigix.com) sont **conservés** dans l'échantillon.
- La catégorie **PME / TPE de services est laissée de côté** pour cette édition : aucune source publique exploitable sans recherche site par site. L'échantillon v2 compte donc 394 domaines (226 médias, 44 e-commerce, 124 agences).
