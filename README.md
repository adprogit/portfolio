# Portfolio

Site statique en trois langues : on y arrive depuis un CV, on y lit un cours
et dix projets, on repart. Astro + Tailwind, une palette charbon, papier et
ambre vérifiée au contraste, et un échiquier calculé en direct par le GPU sur la
page du ray marcher.

Deux espèces de liens sortants, et rien d'autre : les dépôts publics, un par
page projet — les projets dont le dépôt est privé le disent à la place — et le
profil professionnel, sur l'accueil et dans le pied de page.
`tools/audit-dist.mjs` connaît ces deux formes exactes et refuse toutes les
autres, y compris vers les mêmes domaines.

## Démarrer

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # écrit dans dist/
npm run preview    # sert dist/ localement
```

| Script | Ce qu'il fait |
|---|---|
| `npm run check` | Types (`astro check`) |
| `npm run prune` | Retire de `dist/` les médias que rien ne référence (~1,8 Mo) |
| `npm run contrast` | Contrastes WCAG de la palette, accents compris |
| `npm run shaders` | Compare les shaders WGSL au C++ dont ils sont le portage |
| `npm run csp` | Durcit la CSP de `dist/` : empreintes des scripts inline |
| `npm run audit` | Contrôle `dist/` : rien qui sorte, budget JS, documents bien formés |
| `npm run smoke` | Démarre le serveur de dev et suit les 20 routes, scripts inclus |
| `npm run verify` | Tout l'enchaînement — à lancer avant de publier |

**Node 22.12 ou plus** — Astro 7 refuse de démarrer en dessous, `build` comme
`dev`. Debian 13 livre Node 20 ; voir la section dépendances.

> Sous WSL, `node` n'est pas forcément installé côté Linux même si `npm` répond
> (c'est alors le npm de Windows, via l'interop). Vérifie avec `which node`.

## Contenu

Tout le texte du site vit dans deux fichiers :

- `src/data/profile.ts` — présentation, compétences, la phrase « je cherche un
  stage ». Trois langues côte à côte.
- `src/data/projects.ts` — les projets. Un projet = un bloc de médias (importés,
  non traduits) + un bloc de texte par langue. Les extraits de code et les
  séries chiffrées sont partagés et référencés par clé, pour ne pas les recopier
  trois fois.

Les valeurs à corriger sont marquées `TODO` (ville, années des projets).

### Ajouter un projet

1. Dépose les images dans `src/assets/<slug>/` et importe-les en haut de
   `src/data/projects.ts` (Astro lit leurs dimensions et les optimise).
2. Copie un objet `ProjectDef`, remplis `shots`, `cover`, `gallery`, puis les
   trois blocs `text`.
3. Ajoute-le à `definitions`, **à la place où il doit apparaître**. Les routes
   des trois langues se génèrent seules.

> **L'ordre d'affichage est celui de `definitions`, et rien d'autre.** Il n'y a
> plus aucun tri : `getProjects` rend le tableau tel quel, `getProjectGroups` se
> contente de répartir par famille en conservant les rangs. Réordonner la liste,
> c'est déplacer une ligne dans le fichier.
>
> Les projets étaient rangés par année. Les années ne s'affichant plus, un tri
> qu'on ne peut pas lire sur la page est un tri qu'on ne peut pas corriger.
> `featured`, qui ne servait plus qu'à départager deux projets de même famille
> et même année, a disparu avec lui.

**Pas de dates sur les projets.** Une année vieillit un travail sans rien en
dire — « 2023 » ne raconte pas si le code est bon. Un projet encore ouvert porte
en revanche une mention `status: 'wip'`, affichée sur sa ligne et sur sa page :
celle-là se vérifie, là où une année se périme. Le champ `year` ne sert plus
qu'à la période affichée sur l'accueil.

Types de blocs disponibles dans une section : `text`, `list`, `code` (extrait
partagé), `media` (image), `video`, `chart` (barres), `live` (l'échiquier
WebGPU — voir plus bas).

## Trois langues

L'anglais est la langue de base et n'a pas de préfixe :

```
/                     /fr/                     /de/
/projects/<slug>/     /fr/projects/<slug>/     /de/projects/<slug>/
```

`src/i18n/config.ts` porte la liste des langues et la traduction d'un chemin ;
`src/i18n/ui.ts` porte les libellés d'interface — les trois dictionnaires ont
les mêmes clés, TypeScript le vérifie. Chaque page déclare son `lang`, ses
`hreflang` et son `canonical`.

Une page = un fichier de route par famille (`src/pages/index.astro` pour
l'anglais, `src/pages/[lang]/index.astro` pour les autres), tous deux montés sur
le même corps dans `src/components/`. Pas de duplication de mise en page.

## Ce qui bouge

**Aucune bibliothèque d'animation.** Tout ce qui suit est natif.

- **Les apparitions au scroll** : `IntersectionObserver` pour le déclenchement,
  `Element.animate()` — les Web Animations du navigateur — pour le mouvement, et
  un décalage en file qui est une multiplication. Les titres arrivent avec un
  flou qui se résorbe ; c'est le seul endroit du site où `filter` est animé,
  parce qu'il coûte un repaint par image sur la surface floutée : tenable sur un
  titre court joué une fois, pas sur une liste entière.
- **La parallaxe des figures** est en CSS pur, sur `animation-timeline: view()`,
  sous garde `@supports`. Une timeline de défilement tourne sur le compositeur,
  sans repasser par le fil principal : elle ne peut pas saccader quand la page
  travaille. C'est le seul effet porté en CSS plutôt qu'en JS, et pour une raison
  précise — une timeline ne gagne que là où le JS est mauvais, le mouvement
  continu image par image. Porter aussi les apparitions voudrait dire tenir deux
  chemins pour un seul effet.
- **Le survol d'une ligne de projet** : le filet de gauche s'épaissit et prend
  l'accent du projet, un reflet traverse la ligne en `transform` seul, et les
  chiffres du projet remontent à la place de sa pile technique — un relevé, comme
  un affichage de debug par-dessus un rendu. Les deux partagent la même cellule
  de grille, donc rien ne se décale.
- **La navigation** passe par les transitions de vue d'Astro (`ClientRouter`).
- **La poussière du fond** suit le défilement en parallaxe et s'écarte devant le
  curseur — voir sa propre section plus bas.

Tout ce qui bouge s'arrête sous `prefers-reduced-motion`. La poussière, elle, est
alors posée une fois et ne bouge plus : c'est le seul mouvement du site qui
laisse une trace visible quand on le coupe.

## L'échiquier : le moteur C++ dans le navigateur

`src/lib/chess/` porte sur GPU le moteur complet du projet ray marcher, et pas
seulement une pièce. Il vit dans la page du projet, section 04, derrière un
bloc `{ type: 'live' }`.

| WGSL (`shader-wgsl.ts`) | C++ (`../raymarcher/src/`) |
|---|---|
| `ellipse2` `box2` `sphere2` | `sdf/sdf_2d.cpp` |
| `ellipse3` `box3` `round_cone` | `sdf/sdf_3d.cpp` |
| `blend` `piece_base` `piece_base_large` | `sdf/sdf.hh` |
| `sdf_pawn` … `sdf_king` | `sdf/chess/*_sdf.cpp` |
| `board_distance` `board_material` | `sdf/chess/chess_board.hh` |
| `scene_hit` `scene_distance` `shadow` `march` | `scene/scene.cpp` |
| `fs_main` | `core/camera.cpp` + `Scene::render` |

Mêmes formules, mêmes constantes, palette « Wood » de `main.cpp` comprise.

**Ce qui a dû changer de forme.** Le C++ garde les pièces dans
`std::vector<std::shared_ptr<SDF>> grid_[64]` : un GPU n'a ni allocation ni
fonction virtuelle. Les pièces deviennent un tableau de 32 enregistrements, et
la grille 8×8 devient 64 masques de bits — un bit par pièce dont la boîte
englobante touche la case, ce que `Scene::add_piece` calculait déjà. C'est la
même structure d'accélération ; le shader lit `firstTrailingBit` au lieu de
parcourir un vecteur.

**Ce que ça donne.** Avancer d'un coup ne reconstruit aucune scène : deux
tampons sont réécrits (1 Ko de pièces, 256 octets de grille) et une image est
redemandée. Le shader, lui, ne bouge pas. Le rendu est **à la demande** — rien
n'est dessiné tant que la position, la taille ou le curseur ne changent pas.

**Deux écarts assumés.** `ellipse2`/`ellipse3` divisent par `k1` sans le
protéger en C++ ; au centre exact d'une ellipse, un NaN dans un shader
contamine le pixel, donc le dénominateur est borné à `1e-5`. Et il n'y a pas de
réflexion : `main.cpp` rend avec `REFLECTION_DEPTH = 0`, et WGSL interdit la
récursion de `Scene::march`, qu'il faudrait déplier.

**Les coups.** `game.ts` n'est pas un moteur d'échecs : les coups sont donnés
en algébrique longue (`e2e4`), donc sans génération de coups ni levée
d'ambiguïté — la part réellement coûteuse d'un analyseur SAN. Roque, prise en
passant et promotion sont reconnus à la forme du coup. Le C++ délègue tout ça à
`chess.hpp` (5 800 lignes) ; lire un PGN collé par le visiteur demanderait un
générateur de coups légaux, ce qui reste à faire.

**Le poids.** La page du projet charge 2,6 ko de commandes ; le rendu lui-même
(22 ko, 8 ko compressés, WGSL compris) ne descend que quand la figure approche
de l'écran. La plupart des visiteurs ne le téléchargeront jamais.

**WebGPU seul.** Cette scène ne rentre pas dans WebGL 1 :
ni tampons de stockage, ni bornes de boucle variables, et les tableaux
d'uniformes y sont trop courts. Sans WebGPU, la figure affiche pourquoi et le
reste de la page continue.

## Le GPU, une fois pour tout l'onglet

Le `GPUDevice` est partagé par tout l'onglet (`src/lib/gpu/device.ts`) et
survit aux navigations : le demander coûte bien plus cher que dessiner.
`destroy()` ne libère donc que ce qui appartient au canvas — tampons et
pipeline. S'il est perdu (veille, pilote qui tombe), la boucle s'arrête et le
montage suivant retente.

Le montage est asynchrone — WebGPU demande un adaptateur, puis un périphérique,
puis compile un pipeline — et le module de rendu n'est importé qu'au moment où
la figure entre à l'écran (`ChessLab.astro`). Une page qui ne descend jamais
jusqu'à l'échiquier ne télécharge pas une ligne de WGSL.

Les types WebGPU ne sont pas dans `lib.dom` (TypeScript 5.9) : plutôt que
d'ajouter `@webgpu/types`, `src/types/webgpu.d.ts` déclare à la main les
quelques interfaces appelées. Une page, aucune dépendance, aucun code exécuté.

> Attention : WebGPU n'a pas pu être exécuté ici (pas de GPU dans
> l'environnement de compilation). Le shader n'a donc pas été validé
> par un vrai compilateur. `npm run shaders` fait ce qu'un script peut faire
> sans GPU — parenthésage, mots réservés, appels inconnus, points d'entrée, et
> surtout **comparaison des constantes avec le C++, fonction par fonction**.
> C'est ainsi qu'a été trouvé `target`, mot réservé par WGSL, utilisé comme nom
> de champ. Ça ne remplace pas Tint ou Naga : à confirmer dans un navigateur.

## Palette

**Charbon et papier, et de l'ambre.** Le thème sombre est un charbon chaud
(`#141210`), le clair un papier crème (`#f5efe3`) ; le texte suit, ivoire sur le
charbon, brun d'encre sur le papier. Aucun des deux fonds n'est un gris : teinté,
un fond se lit comme une surface ; neutre, comme un écran éteint.

L'accent du site est l'**ambre** (`#dca55a` en sombre, `#7d5a26` en clair) : le
mot en italique des titres, les surtitres, les liens, la lueur, la poussière du
fond. C'est la seule couleur chaude saturée de la page, posée sur un fond déjà
chaud — elle s'y accorde au lieu de s'y détacher.

Les six accents de projet gardent leurs noms de famille — cyan, vert, orange,
rose, violet, jaune — mais plus les valeurs de Dracula, saturées et froides, qui
criaient sur un fond chaud. Ce sont des teintes de terre : sarcelle, sauge, terre
cuite, rose poudré, prune, ocre. Elles distinguent encore les projets entre eux,
mais elles appartiennent à la même page que l'ambre. **Aucun texte n'a de couleur
fixe hors de ces jetons** — « À la recherche d'un stage » et le badge « en
direct » de l'échiquier, longtemps en vert Dracula, portent l'ambre du thème.

> Le site a d'abord été entièrement en Dracula, fond bleuté compris. La palette
> chaude l'a remplacé ; les blocs de code sont passés du thème Shiki `dracula`,
> dont le fond bleuté jurait sur le charbon, à **Gruvbox** en double thème
> (`gruvbox-light-medium` / `gruvbox-dark-medium`), basculé par la classe
> `.dark` comme le reste de la page.

**Un accent ne remplit rien.** Il colore du texte, un filet, un numéro — jamais
un bloc. C'est la règle qui tient tout le reste : il n'y a plus d'encre sombre à
poser sur des aplats clairs, donc plus qu'une seule direction de contraste à
vérifier, et la page reste sobre quel que soit le nombre de projets.

| Famille | Jetons | Bascule ? |
|---|---|---|
| Accents | `accent-cyan`, `accent-green`, `accent-orange`, `accent-pink`, `accent-purple`, `accent-yellow` | oui |
| Surfaces | `paper`, `paper-raised`, `paper-sunken` | oui |
| Traits | `line` (cadres, 3:1), `rule` (filets, décoratif) | oui |
| Texte | `ink`, `ink-strong`, `ink-soft` | oui |
| Accent du site | `brand`, `brand-strong` | oui |

Chaque projet reçoit l'un des six accents (`tone` dans `ProjectDef`), distinct
de celui de ses voisins de famille. Il ne se voit qu'au survol de sa ligne, puis
sur sa page : le numéro de chaque section, la phrase d'accroche, le filet
d'en-tête.

### Ni blanc ni noir purs

`ink-strong` vaut `#f2ebdc` en sombre et `#1d1812` en clair — jamais `#ffffff`
ni `#000000`. Les deux extrêmes sont les seules valeurs qui n'appartiennent à
aucune palette : un titre qui les porte se détache du site au lieu d'en faire
partie. La teinte est celle du fond, poussée à l'extrême : un ivoire sur le
charbon, un brun d'encre sur le papier.

Les `h1` vont plus loin : ils prennent franchement une couleur, avec leur lueur.
L'accroche de l'accueil prend l'accent du site ; le titre d'un projet prend
**son** accent, celui de sa ligne et de sa bande d'en-tête. L'accroche du projet
est repassée en encre neutre du même coup — les deux portaient la même couleur,
et la hiérarchie s'y perdait.

> **La lueur ne se met pas à l'échelle toute seule.** Elle est en `em`, donc un
> titre de 2,75 rem porterait un halo de 45 pixels : proportionnel, mais
> illisible. D'où `--glow-title`, au rayon relatif plus court (0,28 em). Ce
> qu'on veut n'est pas « la même lueur », c'est « la même impression ».

### Deux traits, pas un

`line` cerne ce qui doit se voir — un cadre, une figure — et tient le seuil
« interface » de 3:1. `rule` ne fait que séparer, et a le droit d'être presque
invisible : c'est lui qui donne au site ses filets d'un pixel. Les confondre,
c'est soit cerner la page de gris foncé, soit rendre un cadre invisible.

### Aucune transparence, sauf une

Pas d'alpha, pas de `color-mix`, pas de `backdrop-filter`. Le pixel affiché est
exactement la couleur écrite dans `global.css` — ce qui rend le contrôle de
contraste exact, puisqu'il n'y a aucune superposition à simuler.

L'exception est **la lueur**. Sur fond sombre, un caractère clair s'étale déjà
un peu de lui-même : c'est la diffusion de l'écran, et c'est ce qui fait qu'un
éditeur en thème sombre paraît lumineux. Les classes `.glow` et `.glow-strong`
le posent franchement — deux `text-shadow` en `currentColor`, l'une serrée pour
épaissir le trait, l'autre large pour le halo. Un flou n'existe pas sans
mélange, d'où l'exception. En thème clair, `--glow` vaut `none` : sur du papier,
un halo salit.

La lueur ne porte jamais d'information, et rien ne se lit *dedans* : le
contrôle de contraste peut l'ignorer sans mentir.

### Le relief

Il n'y en a pas. Ni ombre portée, ni trame, ni carte. Ce qui distingue un bloc
d'un autre est l'espace entre eux et, au besoin, un filet d'un pixel.

Le seul mouvement de survol est celui d'une ligne de projet (`.row`) : son filet
de gauche s'épaissit de 2 à 4 px, prend l'accent du projet, et la ligne se
décale d'autant. Le décalage est en `padding`, pas en `transform` — le texte
reste sur la grille de pixels, donc parfaitement net pendant le geste.

## L'échelle

Un seul réglage tient l'échelle du site : `font-size` sur `html`, en
`clamp(16px, 0.875rem + 0.3vw, 22px)`. Toute la mise en page étant en `rem`,
régler cette valeur règle tout — largeurs, marges, titres, code. 16px sur un
téléphone, ~18 sur un portable, 22 sur un écran de 2 880.

**Corollaire, et c'est la règle à tenir :** tout ce qui doit rester d'accord
avec le texte se mesure en `rem`, sans exception. Un bloc de code en `px`
rapetisse à vue d'œil à mesure que la page grandit ; c'était l'incohérence la
plus visible du site. Le jeton `--text-2xs` (0,6875rem) existe pour cette
raison — les libellés en petite capitale étaient écrits `text-[11px]`, et onze
pixels restent onze pixels quand le reste passe de 16 à 22. La lueur est en
`em`, pour la même raison : douze pixels autour d'un titre de 48 font un
liseré, autour d'un libellé de 11 une tache.

### Ce qui porte quoi, sur l'accueil

Les projets sont la substance ; les compétences sont un index. Elles avaient
pourtant la même tête de section numérotée — `01` et `02`, même poids pour les
deux. Les compétences sont donc passées en **annexe** : derrière un filet, un
libellé en petite capitale au lieu d'un titre de rang, et deux colonnes serrées.
C'est une liste qu'on parcourt, pas quelque chose qu'on lit.

La numérotation est partie avec elles. Il ne restait qu'un `01` — un ordinal
seul, qui annonce un `02` qui n'existe plus. Les pages projet gardent la leur,
où elle compte : quatre à six sections, et un sommaire qui y renvoie.

### L'échelle typographique

Quatre crans nommés au-dessus du corps de texte, en jetons Tailwind
(`text-display`, `text-lead`, `text-title`, `text-heading`) :

| Jeton | Taille | Pour |
|---|---|---|
| `display` | 2,75 rem | l'accroche de l'accueil |
| `lead` | 2,40 rem | le titre d'un projet |
| `title` | 1,63 rem | une section de l'accueil |
| `heading` | 1,30 rem | une section d'une page projet |
| *(corps)* | 1,00 rem | |

Ils existent parce que l'échelle avait **un creux au milieu** : 47 usages en
petit (`2xs`/`xs`/`sm`), 4 en display, et presque rien entre les deux. Sur une
page projet, un titre de section faisait 1,25 rem contre 1 rem pour le corps —
25 % d'écart, donc un titre qui ne s'impose pas — pendant que le saut du `h1` au
`h2` était du simple au double.

**Pas de `vw` dans ces valeurs, et pas de variante au point d'arrêt.** La taille
de base est déjà fluide (16 → 22 px selon la fenêtre) : tout suit déjà. Les deux
plus gros sont seulement bornés par un `min()` en `vw`, pour qu'une accroche de
quarante caractères ne déborde pas d'un téléphone.

### Deux largeurs

| Largeur | Pour quoi |
|---|---|
| `shell` | la colonne de la page — bandeau, pied, figures, listes de projets |
| `measure` | ce qui se lit dedans : texte, listes, **et code** |

Il y en a eu trois un temps : la page plus large que les figures, elles-mêmes
plus larges que le texte. Trois alignements, donc deux décrochements, et l'œil
les sentait sans pouvoir les nommer. Tout commence maintenant au même pixel — le
bandeau, une figure, une ligne de projet — et seul le texte est rentré.

Le code est du texte : il partage la colonne du texte, exactement. Une ligne de
commentaire et une ligne de paragraphe commencent au même pixel. Ce qui se
regarde n'a pas de classe de largeur du tout : ça remplit la page, ce qui est
déjà le comportement par défaut d'un bloc.

## L'accueil, en deux panneaux

La bio et les projets ne se suivent pas : ils se succèdent. Ce ne sont pas deux
blocs d'une même colonne qu'on déroule, ce sont deux écrans, et on passe de l'un
à l'autre — il n'y a pas d'état intermédiaire à regarder.

Il y a eu un fondu ici, la bio pâlissant sur place pendant qu'on scrollait.
C'était l'inverse de ce qu'il faut : **un fondu relie**. Pendant toute sa durée
on voyait les deux à la fois, à demi, et la page redevenait une seule chose qui
défile. La rupture tient en trois traits :

1. la bio fait **exactement un écran** — pas de course, pas de collant ;
2. elle se termine sur une **couture pleine largeur** (`.seam`). C'est pour
   elle que la bio est hors de la colonne de la page : ce trait doit aller d'un
   bord de l'écran à l'autre, et c'est le seul du site dans ce cas. Un filet
   gris d'un pixel n'y suffisait pas — posé au bas d'un écran presque vide, on
   ne le voyait pas passer. Il est donc de la couleur de l'accent, s'éteint à
   ses deux extrémités, éclaire ce qui l'entoure, et une lumière le parcourt
   une fois au chargement : il est en bas du premier écran, donc on la voit
   sans avoir rien fait, et on sait qu'il y a un dessous ;
3. le défilement **s'y arrête** (`scroll-snap-align` sur `.hero` et `.panel`) :
   le geste mène d'un écran au suivant, pas à un entre-deux.

`svh` et non `vh` : sur un téléphone, la barre d'adresse mange `vh` et la bio
dépasserait de l'écran au premier chargement.

Le cran vit sur `<html>`, le conteneur de défilement d'une page — il ne peut pas
vivre plus bas. D'où la classe `snap`, posée par `BaseLayout.astro` sur la seule
prop `home` : les pages projet n'en veulent pas. `proximity` et non `mandatory` :
la liste des projets est longue, et un cran obligatoire sur un bloc plus haut que
l'écran emprisonne le défilement à l'intérieur.

Deux garde-fous, parce qu'un premier plan qui coupe son propre texte est pire
que pas de premier plan du tout :

- le contenu est aligné **en tête**, pas centré. Centré, il déborderait des deux
  côtés dès qu'il dépasse la hauteur de l'écran, et le titre partirait au-dessus
  du bord ;
- sous `38rem` de hauteur de fenêtre, le cran est désarmé et la bio reprend sa
  hauteur naturelle : la page redevient une page.

**Il n'y a aucun script d'accueil.** Tout est en CSS, y compris le titre dont
les mots se lèvent l'un après l'autre (`.word`, un `--i` par mot). Le script
qu'il y avait était celui du fondu, et le fondu était l'erreur.

> Piège, sur ce titre : l'espace qui sépare deux mots est **hors** du `<span>`.
> Un `inline-block` est son propre contexte de mise en forme, et une espace
> collée à sa fin y est supprimée comme en fin de ligne. Mise dedans, elle
> disparaît — et le titre s'écrit d'un seul tenant.

La liste des projets a sa propre entrée (`data-reveal-rows`) : ses lignes
arrivent par la gauche, en file, du côté où leur filet d'accent est posé. Elle
arrive après la couture, donc *à la place de quelque chose* — une montée de huit
pixels y passerait inaperçue.

### La ligne qui s'écrit

Une seule ligne du site se découvre caractère par caractère, curseur clignotant
au bout : « À la recherche d'un stage », la plus courte de la page. C'est le
geste d'un terminal, et la seule chose du site qui imite quelque chose.

**Une seule**, et c'est le point. Un effet de machine à écrire sur un paragraphe
se paie en attente : on attend que la machine finisse pour lire, et on la déteste
à la deuxième visite.

Trois décisions dans l'implémentation :

- **Le texte est entier dans le DOM.** C'est un masque qui se retire, pas des
  caractères qu'on ajoute : un lecteur d'écran lit la phrase d'un coup, et rien
  ne dépend d'un script.
- **`clip-path`, pas `width`.** Une largeur animée recalcule la mise en page à
  chaque pas ; un masque ne coûte qu'une passe de composition. Et
  `steps(var(--chars))` plutôt qu'une progression continue, sans quoi le masque
  couperait un caractère en deux au lieu de le découvrir entier. Le nombre de
  caractères est posé en style inline par le composant — il change avec la
  langue.
- **Le curseur n'arrive qu'à la fin.** Le masque ne change pas la largeur du
  texte : posé après lui, le curseur se tiendrait dès la première image à la fin
  d'une phrase qu'on n'a pas encore lue. Plutôt que de le faire courir — ce qui
  supposerait de connaître l'avance exacte d'un caractère, interlettrage
  compris — il reste invisible pendant la frappe. Son animation n'a **pas** de
  `fill` : avant son délai, l'élément garde donc son `opacity: 0` de base. C'est
  tout le mécanisme.

Sous `prefers-reduced-motion`, la ligne est écrite d'emblée et le curseur reste
posé sans clignoter : il dit encore « terminal » sans être un mouvement.

## Les notes

Un projet dit ce qui a été construit ; une **note** dit comment ça marche. Elles
vivent dans `src/data/notes.ts`, sont listées sur l'accueil dans une section
**Notes** (catégorie · titre · temps de lecture, comme une table des matières de
carnet), et ont leur page sous `/notes/<slug>/` dans les trois langues.

La première est un petit cours d'optique, **Du rayon *au pixel*** : caméra
sténopé, ray casting, ray marching, normales, Lambert, Blinn-Phong, ombres
douces, miroir. Il est raconté par le code du ray marcher d'échecs, et la page
du projet renvoie au cours comme le cours renvoie au projet.

**Chaque extrait dit d'où il vient.** Les extraits du cours portent un champ
`source` — `raymarcher/src/scene/scene.cpp:140` —, affiché dans leur légende. Un
seul est marqué `source: 'course'` : l'intersection rayon-sphère, que le ray
marcher n'a pas, écrite pour le chapitre ray casting. La page le dit. Les autres
sont recopiés ligne à ligne ; une élision s'écrit en commentaire, jamais en
ligne réécrite.

Le temps de lecture est **calculé** (200 mots de prose à la minute, une
demi-minute par extrait, arrondi au-dessus), jamais saisi : un chiffre saisi se
périme dès qu'on réécrit un paragraphe.

Une note peut porter des images — les figures d'un rapport —, déclarées dans sa
propre table `shots`, comme un projet. Ni vidéo ni rendu en direct :
`resolveSections` refuse ces blocs à la compilation plutôt que de casser la page.
Images et schémas partagent **une seule numérotation**, dans l'ordre de lecture ;
seules les images vont au lightbox, et chacune y garde le numéro de sa figure.

### Les schémas

Les figures d'une note sont du **SVG calculé à la compilation**
(`src/components/diagrams/`, géométrie dans `src/lib/diagram-geometry.ts`), pas
des images. C'est ce qui leur permet de prendre les couleurs du thème, de
basculer avec lui, et de porter des libellés traduits — un PNG produit à part
resterait blanc en thème sombre et anglais en allemand. Aucune couleur n'y est
écrite : trois registres seulement, neutre pour la géométrie, l'accent de la
note pour ce qu'explique le chapitre, le jaune pour la lumière.

**Ils sont calculés, pas dessinés.** Le schéma du sphere tracing exécute une
vraie boucle de marche 2D, avec le pas relaxé à 0,7 du moteur, et trace les
cercles qu'elle a réellement parcourus (`data-steps` en donne le nombre). Le
lobe de Blinn-Phong est tracé depuis `max(cos φ, 0)^ns`. Le schéma d'ombre
montre les deux faces de `softShadow` : au-dessus du sol, la marche du rayon
d'ombre d'un point de la pénombre (`softShadowTrace`), le cercle épais marquant
le pas où `k·h/t` est minimal ; sous le sol, la lumière reçue en chaque point,
une case de 3 unités par échantillon, en opacité du jaune — la donnée, comme
dans les cartes de chaleur du banc d'essai.

> **Un schéma calculé ne peut pas tricher, et c'est parfois gênant.** Avec
> `k = 32` — la valeur du moteur —, la pénombre tient en quelques cases : exact,
> et presque invisible. Plutôt que de truquer `k`, une seconde bande montre
> `k = 4`. Les deux bandes l'une sous l'autre disent ce que dit le code : plus
> `k` est haut, plus l'ombre est franche.

Les rayons s'arrêtent au bord du cadre (`toFrame`) : le SVG est en
`overflow: visible` pour ne pas rogner une pointe de flèche, et un rayon
« prolongé de 600 » irait sinon se poser sur le texte de la page.

Les animations sont en CSS, sans une ligne de JavaScript : apparitions en file
(`.d-anim`, rang `--i`) et tracés (`.d-draw`, sur un chemin de longueur 1). Elles
attendent en pause que le révélateur pose `.is-visible` sur la figure. Tout est
gardé par `.js` — sans script, une animation en pause resterait invisible pour
toujours — et par `prefers-reduced-motion` : dans les deux cas, le schéma est
simplement affiché, complet.

### Le banc d'essai des méthodes de descente

La deuxième note, **Méthodes de descente, *au banc d'essai***, reprend les parties
2 et 3 du rapport d'optimisation convexe (`ocvx/rapport_final.tex`) : gradient
conjugué Fletcher-Reeves contre Polak-Ribière, puis Newton, gradient conjugué et
BFGS. La partie Armijo n'est pas reprise.

**Ses figures sont recalculées, pas copiées.** Le rapport n'a pas laissé de code,
et ses figures étaient des PNG sur fond blanc. `src/lib/optim.ts` refait les
expériences selon le protocole du rapport — gradient conjugué FR / PR+, BFGS,
Newton, descente de gradient, Armijo c = 0,4, τ = 0,8 — et
`src/components/plots/` les trace en SVG : fond transparent, couleurs du thème,
nettes à toute taille. Le module ne dépend de rien et tourne aussi seul
(`node --experimental-strip-types src/lib/optim.ts`). Tout est déterministe
(générateur à graine fixe) : deux compilations donnent les mêmes figures. Les
chiffres sont donc les nôtres ; proches de ceux du rapport, pas identiques, et
la note le dit.

**Le texte ne contient aucun chiffre écrit à la main.** Chaque `{{clé}}` est
remplacée par la valeur calculée (`benchFacts` dans `src/data/notes.ts`), et les
affirmations qualitatives — « FR et PR se superposent », « les évaluations sont
maximales à τ = 0,9 », « la descente de gradient échoue au-delà d'un κ » — sont
vérifiées sur les résultats par `claim()`. Une clé absente ou une affirmation
démentie **arrête la compilation**. Le texte ne peut pas dire autre chose que les
figures : c'était le reproche central fait au rapport.

Trois choses que le recalcul a fait apparaître, et que la note dit :

- sur une quadratique à κ fixé, le gradient conjugué fait exactement n
  itérations pour n petit, puis **plafonne** (58 itérations à n = 200, κ = 30) :
  le compte dépend de κ, pas de n ;
- sans conditions de Wolfe, le gradient conjugué non linéaire dépend du réglage
  d'Armijo — PR+ s'enlise sur Rosenbrock avec c = 10⁻⁴, FR avec c = 0,3 ;
- BFGS descend à rₖ ≈ 3·10⁻³ sur ses derniers pas (superlinéaire), là où FR et
  PR+ gardent un taux moyen de 0,4 à 0,7 (linéaire).

Deux corrections du calcul lui-même, notées dans le code parce qu'elles sont le
genre d'erreur qu'on refait : une quadratique écrite ½xᵀAx − bᵀx a un minimum
de l'ordre de −10, et près de l'optimum la décroissance qu'exige Armijo passe
sous la précision de f — elle est donc écrite ½(x − x*)ᵀA(x − x*) ; et le départ
(−1 ; 1) sur Rosenbrock est dégénéré (le gradient y pointe pile vers (1, 1)),
d'où (−1,2 ; 1).

**Mise en page des figures.** Chaque panneau est dessiné pour 360 unités de
large, la largeur à laquelle il s'affiche à peu près partout : une colonne sur
téléphone, deux ou trois côte à côte sur écran large (`.plot-grid`). Un panneau
seul est borné à 30 rem, sinon ses libellés deviendraient deux fois plus gros
que le texte. La légende est en HTML au-dessus des panneaux, une fois par
figure, et se replie quand la place manque.

**L'animation FR / PR** remplace le GIF de 2 Mo et tourne en boucle comme
lui : chaque itération apparaît toutes les 0,07 s, dans les deux panneaux à la
fois, si bien que PR+ a fini quand FR est encore à mi-chemin ; les deux tracés
restent affichés deux secondes, puis tout repart. C'est du SMIL
(`<animate calcMode="discrete">` par segment, dans `PathPanel`) : une horloge
commune aux deux panneaux, sans JavaScript. En mouvement réduit, le tracé
complet et immobile remplace la boucle.

**Les figures n'ont pas de cadre.** Elles reposent sur le fond de la page, à la
largeur du texte : un aplat plus sombre et plus large qu'elles faisait une
seconde surface au milieu de la lecture.

La compilation prend une quinzaine de secondes de plus : c'est le temps du banc,
exécuté une seule fois pour les trois langues.

### Les brouillons

Une note marquée `draft: true` n'existe **qu'en développement** : listée sur
l'accueil et servie par `npm run dev`, elle n'est ni compilée ni liée en
production. Un bloc `{ type: 'placeholder' }` y marque la place d'une figure à
venir. Aucune note n'est en brouillon aujourd'hui ; le mécanisme attend les notes
SVM, qui viendront des deux notebooks de TP d'`ocvx/`.

### Ajouter le chapitre Cook-Torrance

Il attend le code des projets annexes : le site ne montre que du code qui
existe. Quand il sera dans l'arborescence :

1. ses extraits dans `snippets` (`src/data/projects.ts`), avec leur `source` ;
2. son schéma — une clé dans `src/data/diagrams.ts`, un composant dans
   `src/components/diagrams/`, une entrée dans l'aiguillage de `Diagram.astro` ;
3. une section `10` dans les trois langues de la note, dans `src/data/notes.ts`.

Rien d'autre à brancher : sommaire, numérotation des figures, temps de lecture
et jauge d'avancement suivent seuls.

## Les tags

Une famille (`Category`) range un projet une fois pour toutes : c'est le plan de
la page. Un tag le range autant de fois qu'il le mérite — et c'est ce qui permet
de demander « les projets en C++ » ou « ceux qui touchent au GPU » sans que ces
questions aient à redécouper la page.

Le vocabulaire est dans `src/data/projects.ts`, en deux groupes, parce qu'on ne
cherche pas de la même façon :

| Groupe | Tags |
|---|---|
| Langages | `cpp`, `c`, `python` |
| Domaines | `rendering`, `gpu`, `imaging`, `vision`, `deep-learning`, `machine-learning`, `systems` |

**Pour en ajouter un :** une entrée dans `tagGroups`, sa traduction dans
`src/i18n/ui.ts` sous `tag.<nom>` si c'est un domaine (les langages ne se
traduisent pas — voir `tagLabels`), puis le tag sur les projets concernés. Il
apparaît alors de lui-même dans le filtre, avec son compte.

Le filtre (`ProjectFilter.astro`) ne propose **que les tags réellement portés par
un projet** : un filtre qui ne rendrait rien n'est jamais offert. Il ne
reconstruit pas la liste, il pose `hidden` sur les lignes qui ne correspondent
pas, puis sur les familles devenues vides. L'adresse porte la sélection
(`…/#tag-cpp`), en `replaceState` : une sélection se partage sans remplir
l'historique. Sans JS, le panneau ne s'affiche pas du tout — il vaut mieux pas de
filtre que dix boutons morts, et la liste complète reste entière en dessous.

## La poussière

Un canvas derrière toute la page (`Particles.astro`), et la seule chose du site
qui bouge sans qu'on la provoque. Elle est réglée pour qu'on ne la remarque pas
d'abord : on la voit en s'arrêtant de lire, pas en lisant.

- **Une seule couleur**, celle de `--color-brand`, lue sur `documentElement` —
  six teintes mélangées derrière le texte faisaient un confetti, pas une
  ambiance. En sombre elle porte le même halo que les titres ; en clair, aucun.
- **Une densité, pas un compte** : un point par 26 000 pixels carrés, entre 24 et
  110. Un nombre fixe serait dense sur un téléphone et vide sur un écran de
  2 880 pixels.
- **Trois mouvements s'y superposent**, dont aucun n'est assez rapide pour qu'on
  le suive du regard : une dérive propre à chaque point ; un **courant** — deux
  sinusoïdes croisées lues à la position du point, donc un champ de vitesses
  continu, et c'est la continuité qui fait lire un fluide plutôt qu'une pluie ;
  et une **parallaxe** au défilement, à la profondeur de chaque point. Les plus
  gros suivent la page, les plus fins se laissent porter par le courant.
- **Elle s'écarte devant le curseur** et se rallume à son approche — la seule
  chose du site qui réponde au simple fait de passer dessus. L'écart déplace la
  position, pas la vitesse : un point poussé revient de lui-même dès qu'on
  s'éloigne, porté par le courant, au lieu de garder son élan et de partir pour
  toujours. Ignoré sous `(pointer: coarse)` : un doigt n'a pas de position au
  repos, et la poussière s'écarterait d'un point où il ne se passe plus rien.
- Elle s'arrête quand l'onglet est caché, et en `prefers-reduced-motion` elle est
  posée une fois puis ne bouge plus : elle reste une ambiance, elle cesse d'être
  un mouvement.

C'est, avec la lueur, le seul endroit du site où des couleurs se mélangent.
L'alpha vit dans le canvas, jamais dans la palette — le contrôle de contraste
reste donc exact, et rien ne se lit par-dessus un point.

## Polices

IBM Plex, une seule famille, deux dessins. Le **mono** porte toute la structure
— titres, numéros, libellés, années, code — et le **sans** ne sert qu'au texte
courant. Comme les deux sortent du même atelier, ils partagent leurs proportions
et leur axe : une ligne de mono posée sous un paragraphe de sans ne change pas
de voix, seulement de rythme.

Un titre en chasse fixe se cale sur la même grille que les numéros de section et
le code qui l'entourent, et la page entière semble alignée sur une seule mesure.
L'interlettrage des titres est resserré (`-0.035em`, `-0.045em` pour le `h1`),
sans quoi la chasse fixe s'étale.

### Le mot d'une autre main

Une troisième famille, pour un seul usage : **un mot par titre**. Instrument
Serif, en italique et en une seule graisse — 22 ko. C'est une didone à fort
contraste, tout le contraire du Plex, et c'est exactement ce qu'on lui demande :
un mot de cette main au milieu d'une ligne en chasse fixe ne se lit pas comme
une variante, il se lit comme **une autre voix**.

L'accroche de l'accueil est donc coupée en deux champs, `headline` et
`headlineAccent` — « Rendu, traitement d'images & *optimisation GPU* ». Le
découpage est écrit langue par langue parce qu'il est **sémantique** : on met en
relief le sujet, pas les trois derniers mots. En français la spécialité finit la
phrase, en allemand elle la commence ; un découpage automatique se tromperait
quelque part.

Deux détails qui se voient si on les oublie : l'interlettrage revient à zéro
(les titres en Plex Mono sont resserrés à −0,045 em pour compenser la chasse
fixe, ce qui écraserait une italique dessinée avec ses approches), et un soupçon
de `padding` à droite, parce qu'une italique finit penchée et se ferait couper
par le bord de sa boîte.

Elle n'est chargée qu'en italique parce qu'elle ne sert qu'à ça. Une romaine en
plus serait une famille de texte, et le site en a déjà deux.

### Le surtitre en `//`

Les têtes de section s'ouvrent sur `// travaux choisis`. Ce n'est pas une
décoration de terminal posée là pour le genre : `//` est la marque de commentaire
de tous les langages du site, et elle dit exactement ce qu'elle dit dans le code
— la ligne qui suit n'est pas le propos, elle l'annonce. Elle sépare l'étiquette
du titre sans avoir à les éloigner ni à changer leur corps.

Le sans est chargé en variable (`@fontsource-variable/ibm-plex-sans`), le mono
en quatre graisses statiques du sous-ensemble latin (`@fontsource/ibm-plex-mono`
— il n'existe pas en variable, et quatre fichiers de 25 ko pèsent moins qu'un
axe complet). Les sous-ensembles cyrillique, grec et vietnamien du sans sont
émis mais jamais téléchargés : les `unicode-range` des `@font-face` s'en
chargent.

## Médias

Les images vivent dans `src/assets/` et passent par `astro:assets` : webp,
`srcset` en quatre largeurs, dimensions inscrites dans le HTML. Les GIF animés
sont servis tels quels (le pipeline n'en garderait que la première image), ce
que `Figure.astro` détecte au format du fichier.

**Aucune image n'est un aperçu.** L'accueil n'a pas de vignettes et les pages
projet n'ont pas d'image d'en-tête : une capture de 300 px ne dit rien d'un
rendu ni d'une chaîne de vision, et neuf vignettes empilées font une page
bavarde. Les visuels ne reviennent que dans les sections, là où ils prouvent un
résultat.

`cover` n'est donc plus affiché nulle part : il ne sert plus qu'à l'`og:image`,
et il garde la place 0 dans le lightbox pour que les numéros de figure restent
stables d'une langue à l'autre.

La vidéo de démonstration a été retraitée avant d'entrer dans le dépôt :

```sh
node tools/mp4-video-only.mjs "source.mp4" src/assets/cuda-motion/detection.mp4
```

Le script réécrit le MP4 sans sa piste audio (une capture d'écran embarque le
son du bureau ou du micro) et sans les atomes de métadonnées de l'enregistreur.
`<video muted>` n'aurait fait que taire l'audio : là, les octets ne sont plus
dans le fichier. Les échantillons vidéo sont recopiés à l'identique, sans
réencodage, et le résultat est relu et vérifié.

Il répare aussi les drapeaux de piste. La capture d'origine écrit
`tkhd flags = 0x000001` : la piste est « activée », mais `track_in_movie`
(`0x2`) manque. ISO/IEC 14496-12 réserve ce bit aux pistes qui font partie de
la présentation — sans lui, un démuxeur qui suit la norme écarte la piste, il
ne reste aucune vidéo dans le fichier, et `<video>` échoue en « source non
supportée ». Vu du navigateur, ça ressemble à un fichier introuvable, alors que
la requête renvoie bien 200 et `video/mp4`. Le script repose `0x000007`
(activée, dans le film, dans l'aperçu) et refuse d'écrire un fichier qui ne les
porte pas.

Côté page, une vidéo d'ouverture porte l'attribut `autoplay` : elle est visible
d'emblée, sa lecture ne doit dépendre ni d'un script chargé ni d'un
IntersectionObserver. Le script ne sert plus qu'à mettre en pause hors écran, à
rendre la main sous `prefers-reduced-motion` (où il retire `autoplay` et met en
pause, puisque la lecture a pu commencer avant lui) et à afficher les contrôles
si la source est refusée — plutôt qu'un cadre noir muet.

Elle reste lourde (2,4 Mo pour 3 s, faute d'encodeur dans l'environnement) et
n'est téléchargée que quand la figure approche de l'écran. Avec ffmpeg sous la
main :

```sh
ffmpeg -i detection.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 detection.webm
```

## Sécurité et vie privée

Le site est volontairement muet sur son auteur et fermé sur lui-même.

- **Aucun nom, aucune adresse, aucun identifiant.** Le bandeau affiche `./`, pas
  des initiales. Le CV porte l'identité.
- **Aucun lien sortant** : ni GitHub, ni LinkedIn, ni `mailto:`. `npm run audit`
  échoue si l'un réapparaît.
- **Aucune requête réseau tierce** : polices, icônes (SVG inline), grain
  (data-URI), images et vidéo sont servis par le site. Pas d'analytics.
- **Aucun domaine dans le HTML** : pas de `site` dans la config Astro, et
  `canonical`, `hreflang` et `og:image` s'écrivent en chemins depuis la racine.
  Le site se sert depuis n'importe quel hôte, à la racine de celui-ci ; pour un
  sous-dossier, voir `base` dans `astro.config.mjs`.
- **Aucune indexation** : `noindex, nofollow, noarchive` en `<meta>` sur chaque
  page et en en-tête `X-Robots-Tag` (`public/_headers`). `npm run audit` refuse
  une page qui n'en porte pas.
- **CSP** posée en `<meta>` en production (`default-src 'self'`, `form-action
  'none'`, `base-uri 'none'`, `object-src 'none'`), plus `referrer: no-referrer`.
  `'unsafe-inline'` reste nécessaire pour le script de thème du `<head>`.
- **Le JSON du lightbox** est échappé (`<` et les séparateurs de ligne
  Unicode) : une légende ne peut pas fermer la balise `<script>`.
- **Contrastes** vérifiés par script, pas à l'œil : `npm run contrast` relit la
  palette dans `global.css` et compare chaque couleur de texte — encre, accent
  du site, et les six accents de projet — à chaque surface réelle, papier,
  surfaces surélevée et creusée, thème par thème, puis le trait des cadres au
  seuil des éléments d'interface. Aucune couleur n'ayant d'alpha, ces
  comparaisons sont exactes : il n'y a rien à composer pour connaître la
  couleur d'un fond.

### La CSP, sans `'unsafe-inline'`

`script-src 'self' 'unsafe-inline'` autorise l'exécution de **n'importe quel**
script écrit dans la page. C'est la ligne qui neutralise à peu près tout
l'intérêt d'une CSP contre le XSS : un attaquant qui parvient à insérer une
balise `<script>` n'a plus rien à contourner.

Le site n'a que **six scripts inline distincts**, tous écrits à la main et
stables d'un rendu à l'autre. `tools/csp-hashes.mjs` les nomme donc un par un
par leur empreinte SHA-256, et retire `'unsafe-inline'` : un script inline qui
ne figure pas dans la liste ne s'exécute plus.

Les empreintes changent dès qu'un de ces scripts bouge — elles ne peuvent donc
pas être écrites à la main. Le script tourne après `astro build` et réécrit la
directive à deux endroits : `dist/_headers` (l'en-tête HTTP, celle qui compte)
et la balise `<meta>` de chaque page (pour les hôtes qui ignorent `_headers`).

**Ce qui n'est pas haché, et pourquoi.** Les 63 blocs `<style>` inline — les
styles scopés des composants Astro — bougent à chaque retouche de CSS, et un
style ne peut pas exécuter de code : `style-src 'unsafe-inline'` reste, et c'est
un choix, pas un oubli. Les blocs `<script type="application/json">` du lightbox
ne sont jamais exécutés, donc la CSP ne les évalue pas.

> **Le garde-fou compte autant que la mesure.** Une CSP trop stricte ne casse
> qu'**en production** : le serveur de développement ne pose pas la balise
> (`import.meta.env.PROD`), donc le smoke test ne verrait rien. Le script se
> relit donc lui-même à la fin et échoue si une seule page contient un script
> inline que la CSP qu'il vient d'écrire ne couvre pas.

### Dépendances

**Trois paquets en production** : `astro` et les deux dessins d'IBM Plex. Et
**aucune dépendance JavaScript à l'exécution** — tout ce qui est livré au
navigateur est écrit dans ce dépôt, plus le routeur d'Astro.

`npm audit` doit rester vide ; tout avis qui apparaît doit être traité.

**Node ≥ 22.12 est obligatoire** — c'est ce qu'exige Astro 7, et Astro refuse de
démarrer en dessous, `build` comme `dev`. Debian 13 livre Node 20 : il faut donc
passer par NodeSource ou un gestionnaire de versions. La contrainte est écrite
dans `engines`, mais npm ne fait que la signaler, il ne la fait pas respecter.

#### Versions exactes, sans exception

Aucune plage, pas un `^`, pas un `~`. Une plage est une surface d'attaque : elle
laisse `npm install` ramener du code qu'on n'a pas relu. `save-exact=true` dans
`.npmrc` évite qu'un `npm install <paquet>` en réintroduise une par distraction.

Ce n'est pas théorique : c'est un `npm audit fix --force` sur des plages `^` qui
a fait sauter Astro de 5.18.2 à 7.3.5 et cassé la compilation pendant deux
sessions, sans que personne l'ait demandé.

#### Scripts d'installation bloqués

`ignore-scripts=true` dans `.npmrc`. Un paquet npm peut exécuter du code à
l'installation (`preinstall`, `install`, `postinstall`) : c'est le vecteur
classique de compromission de chaîne d'approvisionnement.

> **Le chiffre qui compte n'est pas celui qu'on croit.** Trente-six paquets de
> cet arbre déclarent un script d'installation. Mais `prepare` et `prepublish`
> **ne s'exécutent pas** depuis un tarball du registre : ils ne concernent que
> les installations depuis git et la publication. Un seul paquet exécute
> vraiment quelque chose : `esbuild`, dont le `postinstall` lie le binaire natif
> de la plateforme.

Après un `npm install`, si quelque chose se plaint d'esbuild :

```sh
npm rebuild esbuild
```

En pratique, esbuild 0.28 retrouve son binaire tout seul dans le paquet de
plateforme, et le rebuild n'a pas été nécessaire ici — mais il reste la porte de
sortie si une version future redevient dépendante de son `postinstall`.

#### Aucun `override`

Il n'y en a plus. Les deux qui ont existé ont chacun coûté une panne :

1. `esbuild ^0.28.1` forcé pour un avis de faible gravité, alors que Vite 6
   déclarait `^0.25.0`. La compilation passait, mais le serveur de développement
   mourait sur 194 erreurs « Transforming destructuring to the configured target
   environment is not supported yet ».
2. `vite ^6.4.3` forcé « pour n'avoir qu'une seule copie de Vite dans l'arbre ».
   À la montée en Astro 7, qui déclare `vite ^8`, l'`override` maintenait
   silencieusement Vite **deux majeures en arrière**.

Un troisième, `sharp`, a été retiré sans panne : Astro 7 déclare déjà `^0.35.4`,
au-dessus du correctif libvips qu'il protégeait. **Un `override` redondant est
une mine qui n'a pas encore sauté** — il survit aux montées de version du parent
sans rien dire. Avant d'en ajouter un : vérifier qu'il est dans la plage
déclarée par le parent, et le relire après chaque montée majeure.

#### Le budget JavaScript

`tools/audit-dist.mjs` refuse de passer au-delà de **48 Ko de JavaScript livré**
(41,2 Ko aujourd'hui). Il ne mesure pas la performance, il mesure la **dérive de
dépendances** : le jour où quelqu'un ajoute une bibliothèque d'animation « juste
pour essayer », le contrôle le dit avant la publication.

Il y avait 52,3 Ko quand `motion` était encore là — 10,1 Ko pour lui et ses trois
paquets transitifs (`framer-motion`, `motion-dom`, `motion-utils`), au service de
trois fonctions : `inView`, `animate`, `stagger`. Les trois sont natives, et
`motion/mini` appelait de toute façon les Web Animations du navigateur en
dessous.

> **Historique.** Astro a longtemps été épinglé en 5.18.2, faute de Node ≥ 22.12
> sur la machine de développement. Cette branche portait des avis de sécurité
> (XSS via `define:vars`, noms de slots, attributs étalés, directives
> `transition:*`, SSRF sur page d'erreur, rejeu de paramètres de server islands)
> qui supposaient tous soit du rendu serveur, soit une donnée contrôlée par un
> tiers arrivant dans un gabarit — donc sans portée sur un site entièrement
> statique. Ils sont clos depuis la montée en Astro 7.

## Publier

`dist/` est du statique pur, servable tel quel.

- **Cloudflare Pages** — `npx wrangler pages deploy dist --project-name=<nom>`.
  Lit `public/_headers`. Aucun dépôt Git nécessaire : l'envoi se fait depuis la
  machine, donc rien ne relie le site à un compte public.
- **Netlify** — commande `npm run build`, dossier `dist`. Lit `_headers` aussi.
- **Vercel** — le préréglage Astro fait tout ; les en-têtes se déclarent alors
  dans `vercel.json`, pas dans `_headers`.
- **GitHub Pages** — `.github/workflows/pages.yml` vérifie, compile et publie à
  chaque push sur `main`. Une seule chose à régler, une fois : *Settings → Pages
  → Source : GitHub Actions*. Le site d'un dépôt de projet vit sous
  `/<dépôt>/` : le workflow passe ce préfixe en `BASE_PATH`, et liens comme
  actifs le portent (`base` dans `src/i18n/config.ts`) — l'audit refuse tout
  lien qui l'oublierait. Pour tester localement :
  `BASE_PATH=/<dépôt> npm run build`. `_headers` y est ignoré : seule la CSP
  des `<meta>` s'applique, sans `frame-ancestors` (une `<meta>` ne peut pas
  l'exprimer).
- **N'importe quel autre hôte** — copie `dist/`. Aucune réécriture d'URL à
  configurer (`build.format: 'directory'`), aucun domaine à déclarer.

Avant chaque publication :

```sh
npm run verify
```

### Un lien dans un CV, et nulle part ailleurs

Le besoin : un recruteur clique depuis le PDF et arrive sur le site ; personne
d'autre ne tombe dessus. **Ce n'est pas un contrôle d'accès, et ça ne peut pas
l'être** : un PDF n'envoie pas de `Referer`, et un référent se falsifie. Ce qui
tient vraiment :

1. **Une adresse qu'on ne devine pas.** Un nom de projet tiré au hasard —
   `rendu-vision-7f3a9c2e.pages.dev` — plutôt qu'un mot lisible. Rien à
   configurer dans le site : il ignore son propre domaine.
2. **Pas d'indexation.** `noindex` en `<meta>` et en en-tête. C'est ce qui
   empêche l'adresse d'apparaître dans une recherche si le PDF est déposé sur
   une plateforme qui suit les liens. Ne pas y ajouter un `Disallow: /` dans
   `robots.txt` : il empêcherait le robot de lire le `noindex`.
3. **Révocable.** Si l'adresse circule trop, on republie sous un autre nom et on
   met le CV à jour. D'où le `Cache-Control` court sur le HTML.
4. **Rien à voler si ça fuit.** C'est la vraie protection, et elle est déjà là :
   ni nom, ni adresse, ni lien sortant, ni traceur.

Une porte fermée (mot de passe, Cloudflare Access, `Basic Auth`) est possible
mais se retourne contre l'objectif : le recruteur qui doit taper un mot de passe
lu dans un PDF ne le tape pas, et ce mot de passe voyagerait de toute façon dans
le même document que le lien.

Pour savoir si le lien a été ouvert, lire les journaux de l'hébergeur — côté
serveur, donc sans traceur dans la page, ce qui laisse la CSP intacte.

### Les fichiers sources, eux, ne sont pas nettoyés

Le dossier `../pictures/` reste tel quel : la vidéo d'origine y garde sa piste
audio, et le `meta.xml` de la présentation ODP contient encore des champs
d'auteur. Rien de tout cela n'est publié — seul `dist/` l'est — mais si ce
dossier doit être versionné ou partagé, il faut le traiter à part.

## Reste à faire

- Ouvrir le site dans un navigateur : le shader WGSL n'a pas pu être exécuté ici
  (pas de GPU dans l'environnement de compilation). L'échiquier de la page du
  ray marcher dit lui-même s'il tourne ou non.
- Corriger les `TODO` de `src/data/` (ville, années des projets).
- Réencoder la vidéo si ffmpeg est disponible.
