# Crédits et licences des assets

Inventaire de tout ce que le site embarque ou affiche et qui n'est pas du code
écrit pour lui : polices, icônes, images, vidéo, données. État au 24 octobre
2026, branche `redesign`.

Légende :
- ✅ licence connue et compatible avec un usage public ;
- ⚠️ à vérifier par le propriétaire du site avant publication ;
- ❓ source ou licence inconnue.

Le **code** du site a sa propre licence (voir `LICENSE`, choix en attente). Les
**contenus** (textes, captures, figures) peuvent relever d'une licence
différente, précisée ci-dessous quand elle ne vous appartient pas entièrement.

## Polices (auto-hébergées, servies depuis le site)

| Police | Source | Licence | État |
|---|---|---|---|
| IBM Plex Sans (variable) | `@fontsource-variable/ibm-plex-sans` 5.3.0 — © 2017 IBM Corp. | SIL Open Font License 1.1 | ✅ |
| IBM Plex Mono | `@fontsource/ibm-plex-mono` 5.3.0 — © 2017 IBM Corp. | SIL Open Font License 1.1 | ✅ |
| Instrument Serif | `@fontsource/instrument-serif` 5.3.0 — © 2022 The Instrument Serif Project Authors | SIL Open Font License 1.1 | ✅ |

L'OFL autorise l'intégration et la redistribution web. Le texte de la licence
accompagne chaque paquet dans `node_modules/@fontsource*/*/LICENSE`.

## Icônes

| Asset | Source | Licence | État |
|---|---|---|---|
| Icônes en tracé (flèches, soleil, lune, chevrons, cadenas…) — `src/components/Icon.astro` | [Lucide](https://lucide.dev) — © Lucide Contributors, en partie dérivé de Feather (© Cole Bemis) | ISC (Lucide), MIT (Feather) | ✅ voir notice ci-dessous |
| Marque GitHub (aplat) | GitHub, Inc. | Marque déposée : usage limité au lien vers le profil et les dépôts | ✅ |
| Marque LinkedIn | LinkedIn Corp. (tracé Lucide) | Marque déposée : usage limité au lien vers le profil | ✅ |
| `public/favicon.svg` | Dessiné pour le site | Celle du site | ✅ |

Les tracés Lucide sont recopiés dans le code : la licence ISC demande que sa
notice accompagne les copies.

> ISC License — Copyright (c) for portions of Lucide are held by Cole Bemis
> 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are
> held by Lucide Contributors 2022.
> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.

## Images, vidéo et données des projets (`src/assets/`)

Les figures **calculées** du site (schémas des notes, sprites en pixels,
courbes) sont générées par son propre code au moment du build : elles relèvent
de la licence du site.

| Projet | Fichiers | Contenu et source | Licence / droits | État |
|---|---|---|---|---|
| Ray marcher | `raymarcher/board.png`, `pawn.gif`, `knight.gif` | Rendus du moteur [zugzwang](https://github.com/Neww3r/zugzwang), projet d'équipe (Erwan Le Grand et contributeurs) | Code MIT ; rendus produits par l'équipe | ✅ |
| CUDA motion | `cuda-motion/mask.png` | Image d'une vidéo de trafic routier passée au filtre | Vidéo source inconnue | ❓ |
| CUDA motion | `cuda-motion/detection.mp4` | Capture d'écran de 3 s du filtre sur un flux en direct, avec un « sujet » en mouvement (piste audio et métadonnées déjà retirées) | Source inconnue. Si une personne est identifiable, il faut son accord (droit à l'image). | ⚠️ |
| CUDA motion | `cuda-motion/kernel-time.png` | Graphique produit par le projet | — | ✅ |
| Automata vision | `automata-vision/*.png` | Rendus Graphviz synthétiques et visualisations du projet | — | ✅ |
| ToonGL | `toongl/sunrays.png`, `outlines.png`, `pines.png` | Rendus de [POGL](https://github.com/adprogit/POGL) | — | ✅ |
| ToonGL | `toongl/bark.png` | Texture d'écorce (`assets/texture.tga` du dépôt POGL) | Origine de la texture inconnue | ❓ |
| Pulmonix | `pulmonix/*.png` | Captures de l'application d'équipe [medviz-metastazix](https://github.com/Evrard11/medviz-metastazix), affichant des scanners thoraciques | Images du jeu **LIDC-IDRI** (The Cancer Imaging Archive), **CC BY 3.0** : citation obligatoire, absente aujourd'hui | ⚠️ |
| U-Net COCO | `unet-coco/predictions.png`, `best.png`, `worst.png` | Images du jeu **COCO val2017** avec masques prédits | Annotations COCO en CC BY 4.0. Les **images** viennent de Flickr, chacune sous sa propre licence Creative Commons, dont certaines NC ou ND. Attribution nécessaire, et une image ND ne devrait pas être montrée modifiée (masque superposé). | ⚠️ |
| U-Net COCO | `unet-coco/curves.png` | Courbes d'entraînement du projet | — | ✅ |
| Raiders Sudoku | `raiders-sudoku/scan.jpg` (et images dérivées `binary`, `hough`, `cell`, `solved`, `app`) | Photographie d'une grille de sudoku imprimée dans un journal | Auteur de la photo et droits du journal sur la grille inconnus | ❓ |
| Raiders Sudoku | `raiders-sudoku/training.png` | Journal d'entraînement du projet | — | ✅ |
| 42sh, Tiger | `42sh/*.png`, `tiger/*.png` | Captures et schémas du projet | Projets d'école : voir `SECURITY_AUDIT.md` § Propriété intellectuelle | ⚠️ |
| Neural Texture | `neural-texture/viewer.jpg` | Rendu du matériau [WoodFloor051](https://ambientcg.com/view?id=WoodFloor051) d'ambientCG | **CC0** (domaine public) | ✅ |
| Neural Texture | `neural-texture/rate-distortion.png` | Graphique du projet | — | ✅ |
| Tumor Follow-up | `itk-vtk/*.png` | Coupes et rendus d'IRM cérébrales (`case6_gre1.nrrd`, `case6_gre2.nrrd`) du dépôt [itk-vtk](https://github.com/adprogit/itk-vtk) | Source et licence des IRM non indiquées. Données de santé : vérifier qu'elles sont anonymisées et publiables. | ❓ |

## Données sans droit d'auteur

- **Parties d'échecs** : la partie de l'Opéra (Morphy, 1858) et les PGN de
  zugzwang sont des suites de coups, des faits non protégés.
- **Articles cités dans les notes** (Pineda 1988, Karis 2013, Kerbl 2023…) :
  ils sont cités, jamais reproduits.

## Ce qui reste à faire

Chaque ligne ⚠️ ou ❓ ci-dessus attend une vérification du propriétaire du site.
Pour chacune, il faut soit retrouver la source et sa licence, soit remplacer
l'image par une capture dont vous détenez les droits, soit la retirer. Le détail
et les priorités sont dans `SECURITY_AUDIT.md`.
