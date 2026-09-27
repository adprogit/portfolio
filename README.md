# Portfolio

Site statique en trois langues (en, fr, de) : on y arrive depuis un CV, on y lit
dix projets et quatre notes de cours, on repart. Astro 7 + Tailwind 4, aucune
dépendance JavaScript à l'exécution, et un échiquier rendu en direct par WebGPU
sur la page du ray marcher.

Les choix de design (palette, échelle, animations, poussière du fond, polices)
sont expliqués là où ils sont écrits : en tête de `src/styles/global.css` et de
chaque composant.

## Démarrer

**Node ≥ 22.12** — Astro 7 refuse de démarrer en dessous. Debian 13 livre
Node 20 : passer par NodeSource ou un gestionnaire de versions.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # écrit dans dist/
npm run preview    # sert dist/
npm run verify     # tous les contrôles — à lancer avant de publier
```

| Script | Ce qu'il fait |
|---|---|
| `check` | Types (`astro check`) |
| `shaders` | Compare le WGSL de l'échiquier au C++ dont il est le portage ([zugzwang](https://github.com/Neww3r/zugzwang) cloné en `../raymarcher/`, ignoré s'il est absent) |
| `prune` | Retire de `dist/` les médias que rien ne référence |
| `csp` | Remplace `'unsafe-inline'` par les empreintes des scripts inline |
| `contrast` | Contrastes WCAG AA de la palette, dans les deux thèmes |
| `audit` | Contrôle `dist/` : liens sortants, `noindex`, budget JS (48 Ko), HTML bien formé |
| `smoke` | Démarre le serveur de dev et parcourt toutes les routes |

## Contenu

Tout le texte vit dans `src/data/`, les trois langues côte à côte :

| Fichier | Contenu |
|---|---|
| `profile.ts` | Présentation, compétences |
| `projects.ts` | Projets, extraits de code partagés (`snippets`), séries chiffrées, tags |
| `notes.ts` | Notes de cours |
| `diagrams.ts` | Clés des schémas des notes |

Les libellés d'interface sont dans `src/i18n/ui.ts` ; les trois dictionnaires ont
les mêmes clés, TypeScript le vérifie. L'anglais n'a pas de préfixe d'URL
(`/projects/<slug>/`), les autres oui (`/fr/…`, `/de/…`).

### Ajouter un projet

1. Déposer les images dans `src/assets/<slug>/` et les importer en haut de
   `projects.ts`.
2. Copier un `ProjectDef`, remplir médias, `tone` (un des six accents) et les
   trois blocs `text`.
3. L'ajouter à `definitions` **à sa place** : l'ordre d'affichage est celui du
   tableau, il n'y a aucun tri.

Blocs disponibles dans une section : `text`, `list`, `code`, `media`, `video`,
`chart`, `live` (l'échiquier). Aucune année, nulle part ; un projet en cours
porte `status: 'wip'`.

Sur l'accueil, chaque projet est une carte avec un **sprite en pixels**
(32 × 32, 16 images) qui rejoue ce qu'il fait. Les scènes sont calculées dans
`src/lib/sprites.ts` sur le moteur de `src/lib/pixel.ts`. Les pixels portent
un rôle, pas une couleur, donc le sprite suit le thème et ne prend l'accent du
projet qu'au survol. Le rendu est du SVG statique (`svg`, `g`, `path`), sans
script, animé en CSS ; en mouvement réduit, la dernière image reste. Un projet
sans entrée dans `sprites` garde une case vide : ajouter un projet, c'est aussi
lui écrire sa scène.

Un tag s'ajoute dans `tagGroups`, avec sa traduction `tag.<nom>` dans `ui.ts`
s'il s'agit d'un domaine. Le filtre de l'accueil ne propose que les tags portés
par au moins un projet.

### Les notes

Une note explique comment marche un projet : **Du rayon au pixel** (optique de
rendu, racontée par le code du ray marcher), **Méthodes de descente au banc
d'essai** (rapport d'optimisation convexe), **U-Net, pièce par pièce** (notes
de cours en listes et formules ; tailles, paramètres, calcul et champ réceptif
recalculés par `src/lib/unet.ts`) et **Cel shading, bande par bande** (partie
du projet ToonGL, avec un aparté sur les god rays ; rampe, contours et rayons
rejoués par `src/lib/toon.ts` avec les constantes des shaders).

- **Les extraits disent d'où ils viennent** : champ `source` avec fichier et
  ligne. Un seul, marqué `source: 'course'`, a été écrit pour le cours.
- **Les schémas sont calculés à la compilation**, pas dessinés : SVG dans
  `src/components/diagrams/`, géométrie dans `src/lib/diagram-geometry.ts`. Le
  sphere tracing exécute une vraie marche, le lobe de Blinn-Phong est tracé
  depuis `max(n·H, 0)^ns`. Une couleur par rôle, qui suit le thème : l'accent de
  la note pour le rayon, cyan pour les sondes, vert pour les normales, violet
  pour la vue, jaune pour la lumière (`--d-*` dans `global.css`).
- **Le banc d'essai est recalculé** par `src/lib/optim.ts` (déterministe) et
  tracé par `src/components/plots/`. Le texte ne contient aucun chiffre écrit à
  la main : chaque `{{clé}}` est remplacée par la valeur calculée, et les
  affirmations sont vérifiées par `claim()`. Une affirmation démentie arrête la
  compilation.
- Le temps de lecture est calculé. Une note `draft: true` n'existe qu'en
  développement.

Pour ajouter un chapitre : ses extraits dans `snippets`, un schéma (clé dans
`diagrams.ts`, composant, entrée dans `Diagram.astro`), puis la section dans les
trois langues de `notes.ts`. Sommaire, numéros de figure et jauge suivent seuls.

## L'échiquier WebGPU

`src/lib/chess/` porte sur GPU le moteur C++ complet du ray marcher : mêmes
formules, mêmes constantes. Les pièces deviennent un tableau de 32
enregistrements et la grille 8×8 des masques de bits ; jouer un coup réécrit
deux tampons, le shader ne change pas. Le rendu est à la demande. Pas de
réflexions : WGSL interdit la récursion (et le moteur rend de toute façon avec
`REFLECTION_DEPTH = 0`).

Le `GPUDevice` est partagé par tout l'onglet (`src/lib/gpu/device.ts`) et le
module n'est chargé que quand la figure approche de l'écran. Sans WebGPU, la
figure dit pourquoi et le reste de la page fonctionne.

Sans GPU, le rendu se vérifie dans Chromium avec l'adaptateur logiciel
SwiftShader (`--enable-unsafe-webgpu --use-webgpu-adapter=swiftshader
--use-vulkan=swiftshader`) : c'est ainsi qu'a été trouvé le seul bug du
portage. Les commentaires `/* */` **s'imbriquent** en WGSL, et un
`chess/*_sdf.cpp` dans un commentaire avalait tout le reste du shader.
`npm run shaders` lit maintenant les commentaires comme WGSL.

La partie affichée se remplace par un **PGN** déposé sur la figure ou choisi
avec « Charger un PGN ». `src/lib/chess/pgn.ts` le lit dans le navigateur (rien
n'est envoyé) : un petit générateur de coups légaux résout chaque coup SAN,
roques, prise en passant, promotions et en-tête `[FEN]` compris. Commentaires,
variantes et NAG sont ignorés, et seule la première partie du fichier est lue.
Il a été vérifié contre le `chess.hpp` de zugzwang, avec la même position
finale sur les parties de `assets/`.

Un échec de rendu (shader refusé, périphérique perdu) ne s'affiche pas comme un
navigateur sans WebGPU : les deux ont leur phrase.

## Sécurité et vie privée

- **Liens sortants** : seulement les dépôts publics des projets et le profil
  LinkedIn. `npm run audit` refuse toute autre forme, y compris vers les mêmes
  domaines.
- **Aucune requête tierce**, aucun traceur : polices, icônes, images et vidéo
  sont servies par le site.
- **Aucune indexation** : `noindex` en `<meta>` et en en-tête
  (`public/_headers`). Ne pas ajouter `Disallow: /` à `robots.txt`, qui
  empêcherait de lire le `noindex`.
- **Aucun domaine dans le HTML** : le site se sert depuis n'importe quel hôte.
- **CSP stricte** : `tools/csp-hashes.mjs` remplace `'unsafe-inline'` par les
  empreintes des scripts inline, puis se relit et échoue si un script n'est pas
  couvert. `style-src 'unsafe-inline'` reste pour les styles scopés d'Astro.
- **Dépendances** : versions exactes (`save-exact`), scripts d'installation
  bloqués (`ignore-scripts`, voir `.npmrc`), aucun `override`. Si esbuild se
  plaint après un `npm install` : `npm rebuild esbuild`. `npm audit` doit rester
  vide.

La vidéo a été nettoyée de sa piste audio et de ses métadonnées par
`tools/mp4-video-only.mjs`. Les fichiers d'origine (`../pictures/`) ne le sont
pas : ne pas les publier tels quels.

## Publier

`dist/` est du statique pur.

- **Cloudflare Pages** : `npx wrangler pages deploy dist --project-name=<nom>`
  (lit `_headers`). Un nom de projet tiré au hasard donne une adresse qu'on ne
  devine pas.
- **Netlify** : `npm run build`, dossier `dist`.
- **GitHub Pages** : `.github/workflows/pages.yml` publie à chaque push sur
  `main` (*Settings → Pages → Source : GitHub Actions*). Le préfixe `/<dépôt>/`
  passe par `BASE_PATH` ; `_headers` y est ignoré, seule la CSP des `<meta>`
  s'applique.
- **Autre hôte** : copier `dist/`, aucune réécriture d'URL à configurer.

## Reste à faire

- Vérifier l'échiquier sur un vrai GPU (vérifié jusqu'ici sous SwiftShader).
- Réencoder la vidéo (2,4 Mo pour 3 s) si ffmpeg est disponible :
  `ffmpeg -i detection.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 detection.webm`.
