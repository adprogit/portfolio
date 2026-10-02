/**
 * Les notes — des textes qui expliquent plutôt qu'ils ne montrent.
 *
 * Un projet dit ce qui a été construit ; une note dit comment ça marche. La
 * première est un petit cours d'optique de rendu raconté par le code du ray
 * marcher d'échecs : chaque extrait vient du dépôt `raymarcher/`, ligne citée,
 * sauf un, écrit pour le cours et marqué comme tel.
 *
 * Une note porte du texte, du code, des graphiques, des schémas calculés
 * (`src/components/diagrams/`) et, au besoin, des images — celles d'un rapport,
 * déclarées dans sa propre table `shots`. Ni vidéo ni rendu en direct :
 * `resolveSections` les refuse à la compilation.
 *
 * ── Pour ajouter le chapitre Cook-Torrance ──────────────────────────────
 * Quand le code des projets annexes sera dans l'arborescence : ajouter ses
 * extraits à `snippets` (`src/data/projects.ts`) avec leur `source`, un schéma
 * dans `src/data/diagrams.ts` + `src/components/diagrams/`, puis une section 10
 * dans les trois langues ci-dessous. Rien d'autre à brancher.
 */

import type { Locale } from '../i18n/config';
import { locales } from '../i18n/config';
import {
  resolveSections,
  type ResolvedSection,
  type ResolvedShot,
  type Section,
  type Shot,
  type Tag,
  type Tone,
} from './projects';

// Le banc d'essai des méthodes de descente, recalculé à la compilation.
import * as optim from '../lib/optim';
// L'architecture du U-Net, recalculée à la compilation.
import * as unetLib from '../lib/unet';
// Le cel shading de ToonGL, recalculé à la compilation.
import * as toonLib from '../lib/toon';
import * as rasterLib from '../lib/raster';

interface NoteText {
  /** Surtitre en mono, sans le `//`. */
  kicker: string;
  /** Le titre, en deux morceaux : la base, puis la fin d'une autre main. */
  title: string;
  titleAccent: string;
  /** Une ou deux phrases — c'est aussi la méta-description. */
  description: string;
  /** Texte de remplacement et légende de chaque image de la note. */
  shots?: Record<string, { alt: string; caption: string }>;
  sections: Section[];
}

interface NoteDef {
  slug: string;
  tone: Tone;
  /** Le tag qui la classe sur l'accueil. */
  category: Tag;
  /** Le projet dont elle tire son code, lié dans les deux sens. */
  project?: string;
  /**
   * Brouillon : la note n'existe qu'en développement. Elle est listée et
   * servie par `npm run dev`, et n'est ni compilée ni liée en production —
   * une page « figure à venir » n'a rien à faire devant un recruteur.
   */
  draft?: boolean;
  /** Ses images, s'il en a — les figures d'un rapport, par exemple. */
  shots?: Record<string, Shot>;
  /**
   * Les chiffres que cite son texte, calculés plutôt que recopiés. Chaque
   * `{{clé}}` des textes, légendes et listes est remplacée à la résolution.
   */
  facts?: () => Record<string, Fact>;
  text: Record<Locale, NoteText>;
}

export interface ResolvedNote {
  slug: string;
  tone: Tone;
  category: Tag;
  project?: string;
  draft: boolean;
  kicker: string;
  title: string;
  titleAccent: string;
  description: string;
  /** Calculé, jamais saisi : un chiffre saisi se périme dès qu'on réécrit. */
  minutes: number;
  sections: ResolvedSection[];
}

/* ── Du rayon au pixel ─────────────────────────────────────────────── */

const optics: NoteDef = {
  slug: 'optics-from-ray-to-pixel',
  tone: 'pink',
  category: 'rendering',
  project: 'raymarcher',

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      kicker: 'a short course in optics',
      title: 'From ray',
      titleAccent: 'to pixel',
      description:
        'A short course in rendering optics, told through the code of the chess ray marcher: from the pinhole camera to soft shadows and mirrors.',
      sections: [
        {
          id: 'camera',
          kicker: '01',
          title: 'One ray per pixel',
          blocks: [
            {
              type: 'text',
              content:
                'A renderer answers one question per pixel: what does the eye see in that direction? The camera turns a pixel index into a direction. The image plane sits one unit in front of the camera centre, its half-width is tan(hfov / 2) — the field of view is nothing more than how wide that plane is.',
            },
            {
              type: 'diagram',
              diagram: 'pinhole',
              caption:
                'Every pixel of the image plane gives one ray. The highlighted one reaches a sphere; the others go on to the background.',
            },
            {
              type: 'code',
              snippet: 'coursePixel',
              caption:
                '(i, j) is mapped to [−1, 1] on both axes, then to a point of the plane. render() passes x + 0.5, so the ray leaves through the centre of the pixel.',
            },
            {
              type: 'text',
              content:
                'At 16 samples per pixel, render() passes a jittered position on a 4 × 4 grid instead: sixteen rays through each pixel, averaged. That is all the anti-aliasing of the final images.',
            },
          ],
        },
        {
          id: 'casting',
          kicker: '02',
          title: 'Ray casting: the exact intersection',
          blocks: [
            {
              type: 'text',
              content:
                'The classical answer is algebraic. A point on the ray is o + t·d; a point on a sphere satisfies |p − c| = r. Substituting one into the other gives a quadratic in t, and its discriminant says everything: negative, the ray misses; zero, it grazes; positive, it enters and leaves.',
            },
            {
              type: 'diagram',
              diagram: 'raySphere',
              caption:
                'Three rays, three signs of the discriminant. The dots are the roots, computed with the same formula as the function below.',
            },
            {
              type: 'code',
              snippet: 'courseRaySphere',
              caption:
                'The nearest positive root is the visible surface: the entry point, or the exit when the ray starts inside the sphere. The ray marcher has no such function — this one was written for the course.',
            },
          ],
        },
        {
          id: 'limits',
          kicker: '03',
          title: 'When the formula runs out',
          blocks: [
            {
              type: 'text',
              content:
                'Ray casting needs one intersection formula per shape. A sphere has one, a plane has one, a box has one. A chess knight does not: it is dozens of primitives blended with smooth minima, and that blend has no closed-form intersection with a line.',
            },
            {
              type: 'text',
              content:
                'That is where the ray marcher starts. It never asks where the ray meets the surface. It asks a cheaper question, valid anywhere in space: how far away is the nearest surface?',
            },
          ],
        },
        {
          id: 'marching',
          kicker: '04',
          title: 'Ray marching: moving without touching',
          blocks: [
            {
              type: 'text',
              content:
                'A distance field gives, at every point, the distance to the nearest surface. That distance is a guarantee: a sphere of that radius around the point is empty. The ray can jump that far without crossing anything, read the distance again, and jump again. This is sphere tracing.',
            },
            {
              type: 'diagram',
              diagram: 'sphereTracing',
              caption:
                'The real loop, run on this scene when the page is built: every circle is a step it actually took. The steps shrink as it passes the upper disc, stay short all along the box, then shrink to nothing at the surface it hits.',
            },
            {
              type: 'code',
              snippet: 'courseMarch',
              caption:
                'Stop under SURF_DIST = 0.001, give up beyond MAX_DIST = 200 or after 256 steps. The 0.7 factor trades speed for safety on fields that are not exact distances — the blended pieces among them.',
            },
          ],
        },
        {
          id: 'normal',
          kicker: '05',
          title: 'A normal without a formula',
          blocks: [
            {
              type: 'text',
              content:
                'Shading needs the orientation of the surface. A distance field grows fastest straight away from the surface, so its gradient is the normal. No derivative is ever written down: the field is read a small step ε further along each axis, and the differences are the gradient.',
            },
            {
              type: 'diagram',
              diagram: 'finiteNormal',
              caption:
                'Two probes at ε from the hit point, ε enlarged here to be seen. The differences in what they read point away from the surface.',
            },
            {
              type: 'code',
              snippet: 'courseNormal',
              caption:
                'Forward differences with ε = 0.001: three extra reads of the field per hit. dp is the distance already read at p, reused rather than recomputed.',
            },
          ],
        },
        {
          id: 'lambert',
          kicker: '06',
          title: 'Lambert: light that spreads',
          blocks: [
            {
              type: 'text',
              content:
                'A matte surface looks equally bright from every side. What changes its brightness is the angle of the light: a beam arriving at a slant spreads over more area, so each point receives less. The factor is exactly cos θ — the dot product of the normal and the light direction.',
            },
            {
              type: 'diagram',
              diagram: 'lambert',
              caption:
                'The same beam, face-on and tilted by 60°. Spread over twice the area, each point receives half the light: cos 60° = 0.5.',
            },
            {
              type: 'code',
              snippet: 'courseLambert',
              caption:
                'Negative when the light is behind the surface, hence the clamp to 0. shadow_term comes from chapter 08.',
            },
          ],
        },
        {
          id: 'blinn',
          kicker: '07',
          title: 'Blinn-Phong: the half vector',
          blocks: [
            {
              type: 'text',
              content:
                'A highlight is light bouncing towards the eye. Rather than computing the reflected ray, Blinn-Phong takes the vector halfway between the light and the eye, H. When H lines up with the normal, the eye sits in the mirror direction and the highlight peaks.',
            },
            {
              type: 'text',
              content:
                'The exponent ns sets how fast it fades: a low ns gives a wide, soft highlight, a high ns a small, sharp one — plastic against polished wood.',
            },
            {
              type: 'diagram',
              diagram: 'blinnLobes',
              caption:
                'max(n·H, 0)^ns seen from each direction, drawn from the formula for ns = 8, 32 and 128. The lobe points to R, the mirror direction of L, where H meets n; the higher ns, the less of it V still catches.',
            },
            {
              type: 'code',
              snippet: 'courseBlinn',
              caption:
                'One normalisation and one pow per light — no cheaper than Phong’s reflected vector per pixel. Blinn’s variant won elsewhere: H stays constant when light and eye are far away, and the highlight is not cut off at grazing angles.',
            },
          ],
        },
        {
          id: 'shadows',
          kicker: '08',
          title: 'Soft shadows',
          blocks: [
            {
              type: 'text',
              content:
                'A shadow ray marches from the hit point towards the light; if it hits something, the point is in shadow. That alone gives hard edges. The ray marcher gets penumbrae almost for free by keeping one more number along the way: the smallest k·h/t — how close the ray passed to an obstacle, relative to how far it had travelled.',
            },
            {
              type: 'diagram',
              diagram: 'softShadow',
              caption:
                'Above the ground: the shadow ray of a penumbra point, marching towards the light with k = 4; the thick circle is the step where k·h/t is smallest. Below: the light received at each point, same function. k = 32, the renderer’s value, switches almost at once; k = 4 brightens gradually.',
            },
            {
              type: 'code',
              snippet: 'courseShadow',
              caption:
                'softness = 32 in the renderer: higher is harder. The step never falls below 0.02, so a ray running along a surface cannot stall.',
            },
          ],
        },
        {
          id: 'mirror',
          kicker: '09',
          title: 'The mirror, by recursion',
          blocks: [
            {
              type: 'text',
              content:
                'A reflective surface sends the ray on. The new direction mirrors the incoming one about the normal, r = d − 2(d·n)n, and it is marched by the same function: march calls itself with one level of depth less. At zero it stops, however many mirrors are left.',
            },
            {
              type: 'diagram',
              diagram: 'mirror',
              caption: 'Two bounces, then the depth budget runs out.',
            },
            {
              type: 'code',
              snippet: 'courseMirror',
              caption:
                'The origin is pushed off the surface by 2 × SURF_DIST — otherwise the new ray would start less than SURF_DIST away and count as a hit on its very first step. kr blends the local colour with the reflection.',
            },
            {
              type: 'text',
              content:
                'One honest detail: the default build sets REFLECTION_DEPTH = 0. The code is there, but the pieces render without reflections unless it is raised.',
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      kicker: 'petit cours d’optique',
      title: 'Du rayon',
      titleAccent: 'au pixel',
      description:
        'Un petit cours d’optique de rendu, raconté par le code du ray marcher d’échecs : de la caméra sténopé aux ombres douces et aux miroirs.',
      sections: [
        {
          id: 'camera',
          kicker: '01',
          title: 'Un rayon par pixel',
          blocks: [
            {
              type: 'text',
              content:
                'Un moteur de rendu répond à une question par pixel : que voit l’œil dans cette direction ? La caméra transforme un indice de pixel en direction. Le plan image est posé à une unité devant le centre de la caméra, sa demi-largeur vaut tan(hfov / 2) — le champ de vision n’est rien d’autre que la largeur de ce plan.',
            },
            {
              type: 'diagram',
              diagram: 'pinhole',
              caption:
                'Chaque pixel du plan image donne un rayon. Celui qui est mis en avant touche une sphère ; les autres filent vers le fond.',
            },
            {
              type: 'code',
              snippet: 'coursePixel',
              caption:
                '(i, j) est ramené à [−1, 1] sur chaque axe, puis à un point du plan. render() passe x + 0,5 : le rayon sort par le centre du pixel.',
            },
            {
              type: 'text',
              content:
                'À 16 échantillons par pixel, render() passe à la place une position décalée au hasard dans une grille 4 × 4 : seize rayons par pixel, moyennés. C’est tout l’anticrénelage des images finales.',
            },
          ],
        },
        {
          id: 'casting',
          kicker: '02',
          title: 'Le ray casting : l’intersection exacte',
          blocks: [
            {
              type: 'text',
              content:
                'La réponse classique est algébrique. Un point du rayon s’écrit o + t·d ; un point d’une sphère vérifie |p − c| = r. En remplaçant l’un dans l’autre, on obtient une équation du second degré en t, et son discriminant dit tout : négatif, le rayon passe à côté ; nul, il frôle ; positif, il entre et ressort.',
            },
            {
              type: 'diagram',
              diagram: 'raySphere',
              caption:
                'Trois rayons, trois signes du discriminant. Les points sont les racines, calculées avec la même formule que la fonction ci-dessous.',
            },
            {
              type: 'code',
              snippet: 'courseRaySphere',
              caption:
                'La plus petite racine positive est la surface visible : le point d’entrée, ou la sortie quand le rayon part de l’intérieur de la sphère. Le ray marcher n’a pas de telle fonction : celle-ci a été écrite pour le cours.',
            },
          ],
        },
        {
          id: 'limits',
          kicker: '03',
          title: 'Quand la formule manque',
          blocks: [
            {
              type: 'text',
              content:
                'Le ray casting demande une formule d’intersection par forme. Une sphère en a une, un plan aussi, une boîte aussi. Un cavalier d’échecs, non : ce sont des dizaines de primitives fondues par des minimums lissés, et ce fondu n’a pas d’intersection exprimable avec une droite.',
            },
            {
              type: 'text',
              content:
                'C’est là que commence le ray marcher. Il ne demande jamais où le rayon rencontre la surface. Il pose une question moins chère, valable partout dans l’espace : à quelle distance est la surface la plus proche ?',
            },
          ],
        },
        {
          id: 'marching',
          kicker: '04',
          title: 'Le ray marching : avancer sans toucher',
          blocks: [
            {
              type: 'text',
              content:
                'Un champ de distance donne, en tout point, la distance à la surface la plus proche. Cette distance est une garantie : une sphère de ce rayon autour du point est vide. Le rayon peut donc sauter d’autant sans rien traverser, relire la distance, et sauter encore. C’est le sphere tracing.',
            },
            {
              type: 'diagram',
              diagram: 'sphereTracing',
              caption:
                'La vraie boucle, exécutée sur cette scène à la compilation de la page : chaque cercle est un pas qu’elle a réellement fait. Les pas rétrécissent en passant le disque du haut, restent courts tout le long de la boîte, puis s’écrasent contre la surface qu’elle touche.',
            },
            {
              type: 'code',
              snippet: 'courseMarch',
              caption:
                'Arrêt sous SURF_DIST = 0,001, abandon au-delà de MAX_DIST = 200 ou après 256 pas. Le facteur 0,7 échange de la vitesse contre de la sûreté sur les champs qui ne sont pas des distances exactes — dont les pièces fondues.',
            },
          ],
        },
        {
          id: 'normal',
          kicker: '05',
          title: 'Une normale sans formule',
          blocks: [
            {
              type: 'text',
              content:
                'L’ombrage a besoin de l’orientation de la surface. Un champ de distance croît le plus vite droit en s’éloignant de la surface : son gradient est donc la normale. Aucune dérivée n’est écrite : on relit le champ un petit pas ε plus loin sur chaque axe, et les écarts forment le gradient.',
            },
            {
              type: 'diagram',
              diagram: 'finiteNormal',
              caption:
                'Deux sondes à ε du point touché, ε agrandi ici pour se voir. Les écarts entre ce qu’elles lisent pointent hors de la surface.',
            },
            {
              type: 'code',
              snippet: 'courseNormal',
              caption:
                'Différences avant avec ε = 0,001 : trois lectures du champ en plus par impact. dp est la distance déjà lue en p, réutilisée plutôt que recalculée.',
            },
          ],
        },
        {
          id: 'lambert',
          kicker: '06',
          title: 'Lambert : la lumière qui s’étale',
          blocks: [
            {
              type: 'text',
              content:
                'Une surface mate paraît aussi claire de tous les côtés. Ce qui change sa luminosité, c’est l’angle de la lumière : un faisceau qui arrive en biais s’étale sur plus de surface, et chaque point en reçoit moins. Le facteur est exactement cos θ — le produit scalaire de la normale et de la direction de la lumière.',
            },
            {
              type: 'diagram',
              diagram: 'lambert',
              caption:
                'Le même faisceau, de face et incliné de 60°. Étalé sur deux fois plus de surface, chaque point reçoit deux fois moins de lumière : cos 60° = 0,5.',
            },
            {
              type: 'code',
              snippet: 'courseLambert',
              caption:
                'Négatif quand la lumière est derrière la surface, d’où le plancher à 0. shadow_term vient du chapitre 08.',
            },
          ],
        },
        {
          id: 'blinn',
          kicker: '07',
          title: 'Blinn-Phong : le demi-vecteur',
          blocks: [
            {
              type: 'text',
              content:
                'Un reflet brillant, c’est la lumière qui rebondit vers l’œil. Plutôt que de calculer le rayon réfléchi, Blinn-Phong prend le vecteur à mi-chemin entre la lumière et l’œil, H. Quand H s’aligne sur la normale, l’œil est dans la direction miroir et le reflet est à son maximum.',
            },
            {
              type: 'text',
              content:
                'L’exposant ns règle la vitesse à laquelle il s’éteint : un ns faible donne un reflet large et doux, un ns fort un reflet petit et net — du plastique contre du bois ciré.',
            },
            {
              type: 'diagram',
              diagram: 'blinnLobes',
              caption:
                'max(n·H, 0)^ns vu de chaque direction, tracé depuis la formule pour ns = 8, 32 et 128. Le lobe pointe vers R, la direction miroir de L, là où H rejoint n ; plus ns monte, moins V en reçoit.',
            },
            {
              type: 'code',
              snippet: 'courseBlinn',
              caption:
                'Une normalisation et un pow par lumière — pas moins cher, par pixel, que le vecteur réfléchi de Phong. La variante de Blinn l’a emporté ailleurs : H reste constant quand lumière et œil sont lointains, et le reflet n’est pas coupé aux angles rasants.',
            },
          ],
        },
        {
          id: 'shadows',
          kicker: '08',
          title: 'Les ombres douces',
          blocks: [
            {
              type: 'text',
              content:
                'Un rayon d’ombre marche du point touché vers la lumière ; s’il rencontre quelque chose, le point est dans l’ombre. Seul, ça donne des bords francs. Le ray marcher obtient la pénombre presque gratuitement en retenant un nombre de plus en chemin : le plus petit k·h/t — à quel point le rayon a frôlé un obstacle, rapporté au chemin déjà parcouru.',
            },
            {
              type: 'diagram',
              diagram: 'softShadow',
              caption:
                'Au-dessus du sol : le rayon d’ombre d’un point de la pénombre, qui marche vers la lumière avec k = 4 ; le cercle épais est le pas où k·h/t est le plus petit. Dessous : la lumière reçue en chaque point, même fonction. k = 32, la valeur du moteur, bascule presque d’un coup ; k = 4 s’éclaire progressivement.',
            },
            {
              type: 'code',
              snippet: 'courseShadow',
              caption:
                'softness = 32 dans le moteur : plus haut, plus franc. Le pas ne descend jamais sous 0,02, pour qu’un rayon qui longe une surface ne s’y enlise pas.',
            },
          ],
        },
        {
          id: 'mirror',
          kicker: '09',
          title: 'Le miroir, par récursion',
          blocks: [
            {
              type: 'text',
              content:
                'Une surface réfléchissante renvoie le rayon. La nouvelle direction est le miroir de l’ancienne par rapport à la normale, r = d − 2(d·n)n, et elle est parcourue par la même fonction : march s’appelle elle-même avec un niveau de profondeur en moins. À zéro, elle s’arrête, quel que soit le nombre de miroirs restants.',
            },
            {
              type: 'diagram',
              diagram: 'mirror',
              caption: 'Deux rebonds, puis le budget de profondeur est épuisé.',
            },
            {
              type: 'code',
              snippet: 'courseMirror',
              caption:
                'L’origine est décollée de la surface de 2 × SURF_DIST — sans quoi le nouveau rayon partirait à moins de SURF_DIST et compterait comme un impact dès son premier pas. kr mélange la couleur locale et le reflet.',
            },
            {
              type: 'text',
              content:
                'Un détail honnête : la compilation par défaut fixe REFLECTION_DEPTH = 0. Le code est là, mais les pièces sont rendues sans reflets tant qu’on ne le relève pas.',
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      kicker: 'kleiner Optik-Kurs',
      title: 'Vom Strahl',
      titleAccent: 'zum Pixel',
      description:
        'Ein kleiner Kurs in Rendering-Optik, erzählt am Code des Schach-Raymarchers: von der Lochkamera bis zu weichen Schatten und Spiegeln.',
      sections: [
        {
          id: 'camera',
          kicker: '01',
          title: 'Ein Strahl pro Pixel',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Renderer beantwortet eine Frage pro Pixel: Was sieht das Auge in dieser Richtung? Die Kamera macht aus einem Pixelindex eine Richtung. Die Bildebene liegt eine Einheit vor dem Kamerazentrum, ihre halbe Breite ist tan(hfov / 2) — das Sichtfeld ist nichts anderes als die Breite dieser Ebene.',
            },
            {
              type: 'diagram',
              diagram: 'pinhole',
              caption:
                'Jedes Pixel der Bildebene ergibt einen Strahl. Der hervorgehobene trifft eine Kugel, die anderen laufen in den Hintergrund.',
            },
            {
              type: 'code',
              snippet: 'coursePixel',
              caption:
                '(i, j) wird auf beiden Achsen auf [−1, 1] abgebildet, dann auf einen Punkt der Ebene. render() übergibt x + 0,5: Der Strahl verlässt das Pixel durch seine Mitte.',
            },
            {
              type: 'text',
              content:
                'Bei 16 Samples pro Pixel übergibt render() stattdessen eine zufällig versetzte Position in einem 4 × 4-Raster: sechzehn Strahlen pro Pixel, gemittelt. Das ist das ganze Antialiasing der fertigen Bilder.',
            },
          ],
        },
        {
          id: 'casting',
          kicker: '02',
          title: 'Ray Casting: der exakte Schnitt',
          blocks: [
            {
              type: 'text',
              content:
                'Die klassische Antwort ist algebraisch. Ein Punkt des Strahls ist o + t·d; ein Punkt einer Kugel erfüllt |p − c| = r. Setzt man das eine ins andere ein, erhält man eine quadratische Gleichung in t, und ihre Diskriminante sagt alles: negativ, der Strahl verfehlt; null, er streift; positiv, er tritt ein und wieder aus.',
            },
            {
              type: 'diagram',
              diagram: 'raySphere',
              caption:
                'Drei Strahlen, drei Vorzeichen der Diskriminante. Die Punkte sind die Wurzeln, berechnet mit derselben Formel wie die Funktion darunter.',
            },
            {
              type: 'code',
              snippet: 'courseRaySphere',
              caption:
                'Die kleinste positive Wurzel ist die sichtbare Fläche: der Eintrittspunkt, oder der Austritt, wenn der Strahl im Inneren der Kugel beginnt. Der Raymarcher hat keine solche Funktion — diese hier wurde für den Kurs geschrieben.',
            },
          ],
        },
        {
          id: 'limits',
          kicker: '03',
          title: 'Wenn die Formel fehlt',
          blocks: [
            {
              type: 'text',
              content:
                'Ray Casting braucht eine Schnittformel pro Form. Eine Kugel hat eine, eine Ebene auch, ein Quader auch. Ein Springer nicht: Er besteht aus Dutzenden Primitiven, die über geglättete Minima verschmolzen sind, und diese Verschmelzung hat keinen geschlossenen Schnitt mit einer Geraden.',
            },
            {
              type: 'text',
              content:
                'Dort beginnt der Raymarcher. Er fragt nie, wo der Strahl die Fläche trifft. Er stellt eine billigere Frage, die überall im Raum gilt: Wie weit ist die nächste Fläche entfernt?',
            },
          ],
        },
        {
          id: 'marching',
          kicker: '04',
          title: 'Ray Marching: vorankommen, ohne zu berühren',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Distanzfeld liefert an jedem Punkt den Abstand zur nächsten Fläche. Dieser Abstand ist eine Garantie: Eine Kugel mit diesem Radius um den Punkt ist leer. Der Strahl kann also so weit springen, ohne etwas zu durchqueren, den Abstand neu lesen und wieder springen. Das ist Sphere Tracing.',
            },
            {
              type: 'diagram',
              diagram: 'sphereTracing',
              caption:
                'Die echte Schleife, beim Bauen der Seite auf dieser Szene ausgeführt: Jeder Kreis ist ein Schritt, den sie wirklich gemacht hat. Die Schritte schrumpfen an der oberen Scheibe, bleiben entlang des ganzen Quaders kurz und werden an der getroffenen Fläche verschwindend klein.',
            },
            {
              type: 'code',
              snippet: 'courseMarch',
              caption:
                'Stopp unter SURF_DIST = 0,001, Abbruch jenseits von MAX_DIST = 200 oder nach 256 Schritten. Der Faktor 0,7 tauscht Tempo gegen Sicherheit bei Feldern, die keine exakten Abstände sind — darunter die verschmolzenen Figuren.',
            },
          ],
        },
        {
          id: 'normal',
          kicker: '05',
          title: 'Eine Normale ohne Formel',
          blocks: [
            {
              type: 'text',
              content:
                'Die Schattierung braucht die Ausrichtung der Fläche. Ein Distanzfeld wächst am schnellsten senkrecht von der Fläche weg, sein Gradient ist also die Normale. Keine Ableitung wird hingeschrieben: Man liest das Feld einen kleinen Schritt ε weiter auf jeder Achse, und die Differenzen ergeben den Gradienten.',
            },
            {
              type: 'diagram',
              diagram: 'finiteNormal',
              caption:
                'Zwei Sonden im Abstand ε vom Trefferpunkt, ε hier zur Sichtbarkeit vergrößert. Die Differenzen dessen, was sie lesen, zeigen von der Fläche weg.',
            },
            {
              type: 'code',
              snippet: 'courseNormal',
              caption:
                'Vorwärtsdifferenzen mit ε = 0,001: drei zusätzliche Feldabfragen pro Treffer. dp ist der bereits in p gelesene Abstand, wiederverwendet statt neu berechnet.',
            },
          ],
        },
        {
          id: 'lambert',
          kicker: '06',
          title: 'Lambert: Licht, das sich verteilt',
          blocks: [
            {
              type: 'text',
              content:
                'Eine matte Fläche wirkt von allen Seiten gleich hell. Was ihre Helligkeit ändert, ist der Einfallswinkel des Lichts: Ein schräg einfallender Strahl verteilt sich auf mehr Fläche, jeder Punkt erhält weniger. Der Faktor ist genau cos θ — das Skalarprodukt von Normale und Lichtrichtung.',
            },
            {
              type: 'diagram',
              diagram: 'lambert',
              caption:
                'Derselbe Strahl, frontal und um 60° geneigt. Auf die doppelte Fläche verteilt, erhält jeder Punkt halb so viel Licht: cos 60° = 0,5.',
            },
            {
              type: 'code',
              snippet: 'courseLambert',
              caption:
                'Negativ, wenn das Licht hinter der Fläche liegt, daher die Untergrenze bei 0. shadow_term kommt aus Kapitel 08.',
            },
          ],
        },
        {
          id: 'blinn',
          kicker: '07',
          title: 'Blinn-Phong: der Halbvektor',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Glanzlicht ist Licht, das zum Auge zurückprallt. Statt den reflektierten Strahl zu berechnen, nimmt Blinn-Phong den Vektor auf halbem Weg zwischen Licht und Auge, H. Liegt H auf der Normalen, befindet sich das Auge in Spiegelrichtung, und das Glanzlicht ist am hellsten.',
            },
            {
              type: 'text',
              content:
                'Der Exponent ns bestimmt, wie schnell es abklingt: Ein kleines ns gibt ein breites, weiches Glanzlicht, ein großes ein kleines, scharfes — Kunststoff gegen poliertes Holz.',
            },
            {
              type: 'diagram',
              diagram: 'blinnLobes',
              caption:
                'max(n·H, 0)^ns aus jeder Richtung gesehen, aus der Formel gezeichnet für ns = 8, 32 und 128. Die Keule zeigt nach R, der Spiegelrichtung von L, wo H auf n trifft; je größer ns, desto weniger davon erreicht V.',
            },
            {
              type: 'code',
              snippet: 'courseBlinn',
              caption:
                'Eine Normalisierung und ein pow pro Licht — pro Pixel nicht billiger als Phongs gespiegelter Vektor. Blinns Variante gewann anderswo: H bleibt konstant, wenn Licht und Auge weit entfernt sind, und das Glanzlicht wird bei streifendem Einfall nicht abgeschnitten.',
            },
          ],
        },
        {
          id: 'shadows',
          kicker: '08',
          title: 'Weiche Schatten',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Schattenstrahl läuft vom Trefferpunkt zum Licht; trifft er etwas, liegt der Punkt im Schatten. Allein ergibt das harte Kanten. Der Raymarcher bekommt den Halbschatten fast umsonst, indem er unterwegs eine Zahl mehr festhält: das kleinste k·h/t — wie knapp der Strahl an einem Hindernis vorbeiging, bezogen auf den zurückgelegten Weg.',
            },
            {
              type: 'diagram',
              diagram: 'softShadow',
              caption:
                'Über dem Boden: der Schattenstrahl eines Punkts im Halbschatten auf dem Weg zum Licht, mit k = 4; der dicke Kreis ist der Schritt mit dem kleinsten k·h/t. Darunter: das an jedem Punkt empfangene Licht, dieselbe Funktion. k = 32, der Wert des Renderers, wechselt fast schlagartig; k = 4 hellt sich allmählich auf.',
            },
            {
              type: 'code',
              snippet: 'courseShadow',
              caption:
                'softness = 32 im Renderer: höher heißt härter. Der Schritt fällt nie unter 0,02, damit ein Strahl, der an einer Fläche entlangläuft, nicht stecken bleibt.',
            },
          ],
        },
        {
          id: 'mirror',
          kicker: '09',
          title: 'Der Spiegel, per Rekursion',
          blocks: [
            {
              type: 'text',
              content:
                'Eine spiegelnde Fläche schickt den Strahl weiter. Die neue Richtung spiegelt die alte an der Normalen, r = d − 2(d·n)n, und wird von derselben Funktion verfolgt: march ruft sich selbst mit einer Tiefenstufe weniger auf. Bei null hört sie auf, egal wie viele Spiegel noch folgen.',
            },
            {
              type: 'diagram',
              diagram: 'mirror',
              caption: 'Zwei Reflexionen, dann ist das Tiefenbudget aufgebraucht.',
            },
            {
              type: 'code',
              snippet: 'courseMirror',
              caption:
                'Der Ursprung wird um 2 × SURF_DIST von der Fläche abgesetzt — sonst begänne der neue Strahl weniger als SURF_DIST entfernt und zählte schon beim ersten Schritt als Treffer. kr mischt die lokale Farbe mit der Spiegelung.',
            },
            {
              type: 'text',
              content:
                'Ein ehrliches Detail: Der Standard-Build setzt REFLECTION_DEPTH = 0. Der Code ist da, aber die Figuren werden ohne Spiegelungen gerendert, solange man den Wert nicht anhebt.',
            },
          ],
        },
      ],
    },
  },
};

/* ── Résolution ────────────────────────────────────────────────────── */

/* ── Les méthodes de descente, au banc d'essai ─────────────────────── */

/*
 * Tirée des parties 2 et 3 du rapport OCVX (`ocvx/rapport_final.tex`). Les
 * figures ne sont pas celles du rapport : elles sont recalculées à chaque
 * compilation par `src/lib/optim.ts`, selon son protocole, et tracées en SVG.
 *
 * Aucun chiffre n'est écrit à la main dans le texte : chaque `{{clé}}` est
 * remplacé par la valeur calculée (voir `benchFacts`). Une clé absente fait
 * échouer la compilation, et les affirmations qualitatives du texte — « tous
 * convergent », « les évaluations sont maximales à τ = 0,9 » — sont vérifiées
 * au même endroit. Le texte ne peut donc pas dire autre chose que les figures.
 */
const descent: NoteDef = {
  slug: 'descent-methods-benchmark',
  tone: 'cyan',
  category: 'optimization',
  facts: () => benchFacts(),

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      kicker: 'convex optimisation · report',
      title: 'Descent methods,',
      titleAccent: 'on the bench',
      description:
        'Nonlinear conjugate gradient (Fletcher–Reeves, Polak–Ribière), Newton and BFGS, compared on quadratics and non-convex functions. Figures recomputed at build time.',
      sections: [
        {
          id: 'protocol',
          kicker: '01',
          title: 'Protocol',
          blocks: [
            {
              type: 'list',
              items: [
                'Nonlinear conjugate gradient: d ← −g + β·d, with β from Fletcher–Reeves (FR) or Polak–Ribière floored at 0 (PR+). Restart on −∇f if d is not a descent direction.',
                'BFGS on the inverse Hessian, H₀ = I. Newton on quadratics only.',
                'Exact step on quadratics; elsewhere Armijo backtracking, c = 0.4, τ = 0.8.',
                'Stop: ‖∇f‖ ≤ 10⁻⁵ (sections 02–04), ‖∇f‖ ≤ 10⁻⁸ (sections 05–08).',
                'Figures recomputed from the report’s protocol; values may differ slightly from the report’s.',
              ],
            },
          ],
        },
        {
          id: 'quadratics',
          kicker: '02',
          title: 'FR and PR on quadratics',
          blocks: [
            {
              type: 'text',
              content:
                'With an exact step, successive gradients are orthogonal (gₖ₊₁ᵀgₖ = 0), so β_FR = β_PR: both formulas define the same method.',
            },
            {
              type: 'diagram',
              diagram: 'frprKappa',
              caption: 'Mean iterations over 5 random matrices per point, tolerance 10⁻⁵.',
            },
            {
              type: 'list',
              items: [
                'n = 5: {{q5}} iterations for every κ.',
                'n = 75: {{q75lo}} iterations at κ = 10, {{q75hi}} at κ = 1 000.',
                'The count depends on κ, and stays below n while κ is moderate.',
              ],
            },
          ],
        },
        {
          id: 'non-convex',
          kicker: '03',
          title: 'FR and PR on non-convex functions',
          blocks: [
            {
              type: 'diagram',
              diagram: 'frprBatch',
              caption:
                '100 random starts per function. Success: ‖∇f‖ ≤ 10⁻⁵ within 1 000 iterations, less than 10⁻² from a global minimum. Iterations averaged over successful runs.',
            },
            {
              type: 'list',
              items: [
                'Success rate: FR higher on {{frWins}}; PR+ higher on {{prWins}}.',
                'Neither method succeeds on {{bothFail}}.',
                'On successful runs, PR+ needs {{itRatioMin}} to {{itRatioMax}} times fewer iterations than FR.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'frprRosenbrock',
              caption: 'Rosenbrock, 100 starts in [−2, 2] × [−1, 3]. x̃ median, x̄ mean.',
            },
            {
              type: 'list',
              items: [
                'Converged: FR {{rfConv}}/100, PR+ {{rpConv}}/100.',
                'Median {{rfMed}} vs {{rpMed}}; mean {{rfMean}} vs {{rpMean}}; maximum {{rfMax}} vs {{rpMax}}.',
              ],
            },
          ],
        },
        {
          id: 'jamming',
          kicker: '04',
          title: 'Fletcher–Reeves jamming',
          blocks: [
            {
              type: 'text',
              content:
                'When accepted steps become small, gₖ₊₁ ≈ gₖ. Then β_FR → 1: the new direction repeats the previous one and steps stay small. β_PR → 0: the direction resets to −∇f.',
            },
            {
              type: 'diagram',
              diagram: 'frprAnim',
              caption:
                'Rosenbrock from (−1.2, 1): FR {{animFr}} iterations, PR+ {{animPr}}. Same display rate for both panels.',
            },
          ],
        },
        {
          id: 'methods',
          kicker: '05',
          title: 'Newton, conjugate gradient, BFGS',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchTrajectories',
              caption: 'Tolerance 10⁻⁸. Newton is run on the quadratics only.',
            },
            {
              type: 'list',
              items: [
                'Quadratics: Newton 1 iteration; CG {{cgWell}} (= n); BFGS {{bfgsWell}} at κ = 2 and {{bfgsIll}} at κ = 1 000.',
                'BFGS terminates in at most n steps on a quadratic only with an exact line search; with Armijo, the property does not apply.',
                'Rosenbrock from (−1.2, 1): FR {{rosFr}}, PR+ {{rosPr}}, BFGS {{rosBfgs}}.',
                'Sensitivity to the line search: from the same start, PR+ does not converge within 500 iterations with {{prFailsAt}}, FR does not with {{frFailsAt}}.',
              ],
            },
          ],
        },
        {
          id: 'scaling',
          kicker: '06',
          title: 'Conditioning and dimension',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchKappa',
              caption:
                'Random quadratic, n = 30, eigenvalues spread geometrically from 1 to κ. Open circles: gradient descent stopped at 20 000 iterations. Dotted line: y = n.',
            },
            {
              type: 'list',
              items: [
                'Newton: 1 iteration.',
                'CG: {{cgKlo}} iterations at κ = 3, {{cgKhi}} at κ = 10⁴; log-log slope ≈ {{cgSlope}}.',
                'BFGS: {{bfgsKmin}} to {{bfgsKmax}} iterations for κ ≥ 3.',
                'Gradient descent: log-log slope ≈ {{gdSlope}}, i.e. proportional to κ; fails from κ = {{gdFail}}.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'benchDimension',
              caption: 'CG-PR+ at κ = 30, tolerance 10⁻⁸.',
            },
            {
              type: 'list',
              items: [
                'Iterations = n up to n = {{dimExact}}.',
                'n = 200: {{dim200}} iterations. At fixed κ, the count levels off.',
              ],
            },
          ],
        },
        {
          id: 'local-rate',
          kicker: '07',
          title: 'Local rate',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchRate',
              caption: 'Rosenbrock from (−1.2, 1). Dotted line: r = 1.',
            },
            {
              type: 'list',
              items: [
                'BFGS: rₖ ≤ {{bfgsRatio}} over its last {{bfgsRatioN}} steps — superlinear convergence (rₖ → 0).',
                'FR, PR+: mean rate (geometric mean of rₖ) {{frGeo}} and {{prGeo}} over the last 10 steps — linear convergence.',
              ],
            },
          ],
        },
        {
          id: 'line-search',
          kicker: '08',
          title: 'Line search for BFGS',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchLineSearch',
              caption: 'BFGS on Rosenbrock from (−1.2, 1), tolerance 10⁻⁸, 5 × 5 Armijo settings.',
            },
            {
              type: 'list',
              items: [
                'Converged: {{lsConv}}/25 settings.',
                'Iterations: {{lsItMin}} to {{lsItMax}}. Evaluations of f: {{lsEvMin}} to {{lsEvMax}}, highest at τ = 0.9 for every c.',
                'Fewest iterations ({{lsBestIt}}): c = {{lsBestC}}, τ = {{lsBestTau}}, for {{lsBestEv}} evaluations.',
              ],
            },
          ],
        },
        {
          id: 'limits',
          kicker: '09',
          title: 'Limits',
          blocks: [
            {
              type: 'list',
              items: [
                'Exact gradients; no noise.',
                'n ≤ 200; no sparse problem, no L-BFGS.',
                'Armijo only: FR and PR+ run outside the strong Wolfe conditions their guarantees assume.',
                'A single non-convex function (Rosenbrock) in the Newton / BFGS comparison.',
                'Reference: J. Nocedal, S. J. Wright, Numerical Optimization, 2nd ed., Springer, 2006.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      kicker: 'optimisation convexe · rapport',
      title: 'Méthodes de descente,',
      titleAccent: 'au banc d’essai',
      description:
        'Gradient conjugué non linéaire (Fletcher-Reeves, Polak-Ribière), Newton et BFGS, comparés sur quadratiques et fonctions non convexes. Figures recalculées à la compilation.',
      sections: [
        {
          id: 'protocol',
          kicker: '01',
          title: 'Protocole',
          blocks: [
            {
              type: 'list',
              items: [
                'Gradient conjugué non linéaire : d ← −g + β·d, β de Fletcher-Reeves (FR) ou de Polak-Ribière tronqué à 0 (PR+). Redémarrage sur −∇f si d n’est pas une direction de descente.',
                'BFGS sur l’inverse de la hessienne, H₀ = I. Newton sur quadratiques seulement.',
                'Pas exact sur quadratique ; ailleurs Armijo par rebroussement, c = 0,4, τ = 0,8.',
                'Arrêt : ‖∇f‖ ≤ 10⁻⁵ (sections 02 à 04), ‖∇f‖ ≤ 10⁻⁸ (sections 05 à 08).',
                'Figures recalculées selon le protocole du rapport ; les valeurs peuvent différer légèrement des siennes.',
              ],
            },
          ],
        },
        {
          id: 'quadratics',
          kicker: '02',
          title: 'FR et PR sur quadratiques',
          blocks: [
            {
              type: 'text',
              content:
                'À pas exact, les gradients successifs sont orthogonaux (gₖ₊₁ᵀgₖ = 0), donc β_FR = β_PR : les deux formules définissent la même méthode.',
            },
            {
              type: 'diagram',
              diagram: 'frprKappa',
              caption: 'Itérations moyennes sur 5 matrices aléatoires par point, tolérance 10⁻⁵.',
            },
            {
              type: 'list',
              items: [
                'n = 5 : {{q5}} itérations pour tout κ.',
                'n = 75 : {{q75lo}} itérations à κ = 10, {{q75hi}} à κ = 1 000.',
                'Le nombre d’itérations dépend de κ, et reste sous n tant que κ est modéré.',
              ],
            },
          ],
        },
        {
          id: 'non-convex',
          kicker: '03',
          title: 'FR et PR sur fonctions non convexes',
          blocks: [
            {
              type: 'diagram',
              diagram: 'frprBatch',
              caption:
                '100 départs aléatoires par fonction. Réussite : ‖∇f‖ ≤ 10⁻⁵ en au plus 1 000 itérations, à moins de 10⁻² d’un minimum global. Itérations moyennées sur les runs réussis.',
            },
            {
              type: 'list',
              items: [
                'Taux de réussite : FR supérieur sur {{frWins}} ; PR+ supérieur sur {{prWins}}.',
                'Aucune des deux méthodes ne réussit sur {{bothFail}}.',
                'Sur les runs réussis, PR+ demande {{itRatioMin}} à {{itRatioMax}} fois moins d’itérations que FR.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'frprRosenbrock',
              caption: 'Rosenbrock, 100 départs dans [−2, 2] × [−1, 3]. x̃ médiane, x̄ moyenne.',
            },
            {
              type: 'list',
              items: [
                'Convergés : FR {{rfConv}}/100, PR+ {{rpConv}}/100.',
                'Médiane {{rfMed}} contre {{rpMed}} ; moyenne {{rfMean}} contre {{rpMean}} ; maximum {{rfMax}} contre {{rpMax}}.',
              ],
            },
          ],
        },
        {
          id: 'jamming',
          kicker: '04',
          title: 'Enlisement de Fletcher-Reeves',
          blocks: [
            {
              type: 'text',
              content:
                'Quand les pas acceptés deviennent petits, gₖ₊₁ ≈ gₖ. Alors β_FR → 1 : la nouvelle direction répète la précédente et les pas restent petits. β_PR → 0 : la direction repart sur −∇f.',
            },
            {
              type: 'diagram',
              diagram: 'frprAnim',
              caption:
                'Rosenbrock depuis (−1,2 ; 1) : FR {{animFr}} itérations, PR+ {{animPr}}. Même cadence d’affichage pour les deux panneaux.',
            },
          ],
        },
        {
          id: 'methods',
          kicker: '05',
          title: 'Newton, gradient conjugué, BFGS',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchTrajectories',
              caption: 'Tolérance 10⁻⁸. Newton n’est lancé que sur les quadratiques.',
            },
            {
              type: 'list',
              items: [
                'Quadratiques : Newton 1 itération ; CG {{cgWell}} (= n) ; BFGS {{bfgsWell}} à κ = 2 et {{bfgsIll}} à κ = 1 000.',
                'La terminaison de BFGS en au plus n pas sur une quadratique suppose une recherche linéaire exacte ; avec Armijo, elle ne s’applique pas.',
                'Rosenbrock depuis (−1,2 ; 1) : FR {{rosFr}}, PR+ {{rosPr}}, BFGS {{rosBfgs}}.',
                'Sensibilité à la recherche linéaire : depuis le même point, PR+ ne converge pas en 500 itérations avec {{prFailsAt}}, FR non plus avec {{frFailsAt}}.',
              ],
            },
          ],
        },
        {
          id: 'scaling',
          kicker: '06',
          title: 'Conditionnement et dimension',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchKappa',
              caption:
                'Quadratique aléatoire, n = 30, valeurs propres réparties géométriquement de 1 à κ. Cercles creux : descente de gradient arrêtée à 20 000 itérations. Pointillés : y = n.',
            },
            {
              type: 'list',
              items: [
                'Newton : 1 itération.',
                'CG : {{cgKlo}} itérations à κ = 3, {{cgKhi}} à κ = 10⁴ ; pente log-log ≈ {{cgSlope}}.',
                'BFGS : de {{bfgsKmin}} à {{bfgsKmax}} itérations pour κ ≥ 3.',
                'Descente de gradient : pente log-log ≈ {{gdSlope}}, soit proportionnelle à κ ; échoue à partir de κ = {{gdFail}}.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'benchDimension',
              caption: 'CG-PR+ à κ = 30, tolérance 10⁻⁸.',
            },
            {
              type: 'list',
              items: [
                'Itérations = n jusqu’à n = {{dimExact}}.',
                'n = 200 : {{dim200}} itérations. À κ fixé, le compte plafonne.',
              ],
            },
          ],
        },
        {
          id: 'local-rate',
          kicker: '07',
          title: 'Vitesse locale',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchRate',
              caption: 'Rosenbrock depuis (−1,2 ; 1). Pointillés : r = 1.',
            },
            {
              type: 'list',
              items: [
                'BFGS : rₖ ≤ {{bfgsRatio}} sur ses {{bfgsRatioN}} derniers pas — convergence superlinéaire (rₖ → 0).',
                'FR, PR+ : taux moyen (moyenne géométrique de rₖ) {{frGeo}} et {{prGeo}} sur les 10 derniers pas — convergence linéaire.',
              ],
            },
          ],
        },
        {
          id: 'line-search',
          kicker: '08',
          title: 'Recherche linéaire de BFGS',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchLineSearch',
              caption: 'BFGS sur Rosenbrock depuis (−1,2 ; 1), tolérance 10⁻⁸, 5 × 5 réglages d’Armijo.',
            },
            {
              type: 'list',
              items: [
                'Convergés : {{lsConv}}/25 réglages.',
                'Itérations : de {{lsItMin}} à {{lsItMax}}. Évaluations de f : de {{lsEvMin}} à {{lsEvMax}}, maximales à τ = 0,9 pour tout c.',
                'Moins d’itérations ({{lsBestIt}}) : c = {{lsBestC}}, τ = {{lsBestTau}}, pour {{lsBestEv}} évaluations.',
              ],
            },
          ],
        },
        {
          id: 'limits',
          kicker: '09',
          title: 'Limites',
          blocks: [
            {
              type: 'list',
              items: [
                'Gradients exacts ; pas de bruit.',
                'n ≤ 200 ; pas de problème creux, pas de L-BFGS.',
                'Armijo seul : FR et PR+ hors des conditions de Wolfe fortes que supposent leurs garanties.',
                'Une seule fonction non convexe (Rosenbrock) dans la comparaison Newton / BFGS.',
                'Référence : J. Nocedal, S. J. Wright, Numerical Optimization, 2ᵉ éd., Springer, 2006.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      kicker: 'konvexe Optimierung · Bericht',
      title: 'Abstiegsverfahren',
      titleAccent: 'auf dem Prüfstand',
      description:
        'Nichtlineare konjugierte Gradienten (Fletcher–Reeves, Polak–Ribière), Newton und BFGS, verglichen auf Quadriken und nichtkonvexen Funktionen. Abbildungen beim Build neu berechnet.',
      sections: [
        {
          id: 'protocol',
          kicker: '01',
          title: 'Protokoll',
          blocks: [
            {
              type: 'list',
              items: [
                'Nichtlineare konjugierte Gradienten: d ← −g + β·d, β nach Fletcher–Reeves (FR) oder Polak–Ribière, bei 0 begrenzt (PR+). Neustart mit −∇f, wenn d keine Abstiegsrichtung ist.',
                'BFGS auf der inversen Hesse-Matrix, H₀ = I. Newton nur auf Quadriken.',
                'Exakte Schrittweite auf Quadriken; sonst Armijo-Backtracking, c = 0,4, τ = 0,8.',
                'Abbruch: ‖∇f‖ ≤ 10⁻⁵ (Abschnitte 02–04), ‖∇f‖ ≤ 10⁻⁸ (Abschnitte 05–08).',
                'Abbildungen nach dem Protokoll des Berichts neu berechnet; die Werte können leicht von dessen Werten abweichen.',
              ],
            },
          ],
        },
        {
          id: 'quadratics',
          kicker: '02',
          title: 'FR und PR auf Quadriken',
          blocks: [
            {
              type: 'text',
              content:
                'Mit exakter Schrittweite sind aufeinanderfolgende Gradienten orthogonal (gₖ₊₁ᵀgₖ = 0), also β_FR = β_PR: Beide Formeln definieren dasselbe Verfahren.',
            },
            {
              type: 'diagram',
              diagram: 'frprKappa',
              caption: 'Mittlere Iterationen über 5 Zufallsmatrizen je Punkt, Toleranz 10⁻⁵.',
            },
            {
              type: 'list',
              items: [
                'n = 5: {{q5}} Iterationen für jedes κ.',
                'n = 75: {{q75lo}} Iterationen bei κ = 10, {{q75hi}} bei κ = 1 000.',
                'Die Zahl hängt von κ ab und bleibt unter n, solange κ mäßig ist.',
              ],
            },
          ],
        },
        {
          id: 'non-convex',
          kicker: '03',
          title: 'FR und PR auf nichtkonvexen Funktionen',
          blocks: [
            {
              type: 'diagram',
              diagram: 'frprBatch',
              caption:
                '100 zufällige Starts je Funktion. Erfolg: ‖∇f‖ ≤ 10⁻⁵ in höchstens 1 000 Iterationen, weniger als 10⁻² von einem globalen Minimum. Iterationen gemittelt über erfolgreiche Läufe.',
            },
            {
              type: 'list',
              items: [
                'Erfolgsquote: FR höher auf {{frWins}}; PR+ höher auf {{prWins}}.',
                'Keines der beiden Verfahren ist auf {{bothFail}} erfolgreich.',
                'Bei erfolgreichen Läufen braucht PR+ {{itRatioMin}}- bis {{itRatioMax}}-mal weniger Iterationen als FR.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'frprRosenbrock',
              caption: 'Rosenbrock, 100 Starts in [−2, 2] × [−1, 3]. x̃ Median, x̄ Mittelwert.',
            },
            {
              type: 'list',
              items: [
                'Konvergiert: FR {{rfConv}}/100, PR+ {{rpConv}}/100.',
                'Median {{rfMed}} gegen {{rpMed}}; Mittelwert {{rfMean}} gegen {{rpMean}}; Maximum {{rfMax}} gegen {{rpMax}}.',
              ],
            },
          ],
        },
        {
          id: 'jamming',
          kicker: '04',
          title: 'Festfahren von Fletcher–Reeves',
          blocks: [
            {
              type: 'text',
              content:
                'Werden die angenommenen Schritte klein, gilt gₖ₊₁ ≈ gₖ. Dann β_FR → 1: Die neue Richtung wiederholt die vorige, die Schritte bleiben klein. β_PR → 0: Die Richtung springt auf −∇f zurück.',
            },
            {
              type: 'diagram',
              diagram: 'frprAnim',
              caption:
                'Rosenbrock ab (−1,2; 1): FR {{animFr}} Iterationen, PR+ {{animPr}}. Gleiche Anzeigerate für beide Felder.',
            },
          ],
        },
        {
          id: 'methods',
          kicker: '05',
          title: 'Newton, konjugierte Gradienten, BFGS',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchTrajectories',
              caption: 'Toleranz 10⁻⁸. Newton läuft nur auf den Quadriken.',
            },
            {
              type: 'list',
              items: [
                'Quadriken: Newton 1 Iteration; CG {{cgWell}} (= n); BFGS {{bfgsWell}} bei κ = 2 und {{bfgsIll}} bei κ = 1 000.',
                'BFGS terminiert auf einer Quadrik nur mit exakter Liniensuche nach höchstens n Schritten; mit Armijo gilt die Eigenschaft nicht.',
                'Rosenbrock ab (−1,2; 1): FR {{rosFr}}, PR+ {{rosPr}}, BFGS {{rosBfgs}}.',
                'Empfindlichkeit gegenüber der Liniensuche: Vom selben Start konvergiert PR+ mit {{prFailsAt}} nicht in 500 Iterationen, FR nicht mit {{frFailsAt}}.',
              ],
            },
          ],
        },
        {
          id: 'scaling',
          kicker: '06',
          title: 'Konditionierung und Dimension',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchKappa',
              caption:
                'Zufällige Quadrik, n = 30, Eigenwerte geometrisch von 1 bis κ verteilt. Offene Kreise: Gradientenabstieg bei 20 000 Iterationen abgebrochen. Punktiert: y = n.',
            },
            {
              type: 'list',
              items: [
                'Newton: 1 Iteration.',
                'CG: {{cgKlo}} Iterationen bei κ = 3, {{cgKhi}} bei κ = 10⁴; Log-Log-Steigung ≈ {{cgSlope}}.',
                'BFGS: {{bfgsKmin}} bis {{bfgsKmax}} Iterationen für κ ≥ 3.',
                'Gradientenabstieg: Log-Log-Steigung ≈ {{gdSlope}}, also proportional zu κ; scheitert ab κ = {{gdFail}}.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'benchDimension',
              caption: 'CG-PR+ bei κ = 30, Toleranz 10⁻⁸.',
            },
            {
              type: 'list',
              items: [
                'Iterationen = n bis n = {{dimExact}}.',
                'n = 200: {{dim200}} Iterationen. Bei festem κ flacht die Zahl ab.',
              ],
            },
          ],
        },
        {
          id: 'local-rate',
          kicker: '07',
          title: 'Lokale Rate',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchRate',
              caption: 'Rosenbrock ab (−1,2; 1). Punktiert: r = 1.',
            },
            {
              type: 'list',
              items: [
                'BFGS: rₖ ≤ {{bfgsRatio}} über seine letzten {{bfgsRatioN}} Schritte — superlineare Konvergenz (rₖ → 0).',
                'FR, PR+: mittlere Rate (geometrisches Mittel von rₖ) {{frGeo}} und {{prGeo}} über die letzten 10 Schritte — lineare Konvergenz.',
              ],
            },
          ],
        },
        {
          id: 'line-search',
          kicker: '08',
          title: 'Liniensuche für BFGS',
          blocks: [
            {
              type: 'diagram',
              diagram: 'benchLineSearch',
              caption: 'BFGS auf Rosenbrock ab (−1,2; 1), Toleranz 10⁻⁸, 5 × 5 Armijo-Einstellungen.',
            },
            {
              type: 'list',
              items: [
                'Konvergiert: {{lsConv}}/25 Einstellungen.',
                'Iterationen: {{lsItMin}} bis {{lsItMax}}. Auswertungen von f: {{lsEvMin}} bis {{lsEvMax}}, am höchsten bei τ = 0,9 für jedes c.',
                'Wenigste Iterationen ({{lsBestIt}}): c = {{lsBestC}}, τ = {{lsBestTau}}, bei {{lsBestEv}} Auswertungen.',
              ],
            },
          ],
        },
        {
          id: 'limits',
          kicker: '09',
          title: 'Grenzen',
          blocks: [
            {
              type: 'list',
              items: [
                'Exakte Gradienten; kein Rauschen.',
                'n ≤ 200; kein dünnbesetztes Problem, kein L-BFGS.',
                'Nur Armijo: FR und PR+ laufen außerhalb der starken Wolfe-Bedingungen, die ihre Garantien voraussetzen.',
                'Eine einzige nichtkonvexe Funktion (Rosenbrock) im Vergleich Newton / BFGS.',
                'Referenz: J. Nocedal, S. J. Wright, Numerical Optimization, 2. Aufl., Springer, 2006.',
              ],
            },
          ],
        },
      ],
    },
  },
};

/* ── Les chiffres du texte, calculés ───────────────────────────────── */

type Fact = number | string | ((locale: Locale) => string);

/** Affirmation du texte vérifiée sur les résultats : fausse, elle arrête la compilation. */
function claim(ok: boolean, what: string) {
  if (!ok) throw new Error(`Le texte d'une note affirme « ${what} », que le calcul dément.`);
}

/**
 * Toutes les valeurs que le texte cite, lues dans les résultats de
 * `src/lib/optim.ts`. Les listes de noms sont rendues en toutes lettres par
 * langue ; les nombres sont formatés au moment de l'injection.
 */
const benchFacts = (): Record<string, Fact> => {
  const kap = optim.frprKappa();
  const at = (n: number, kappa: number) => {
    const p = kap.find((d) => d.n === n)!.points.find((q) => q.kappa === kappa)!;
    return (p.fr + p.pr) / 2;
  };
  const n5 = kap.find((d) => d.n === 5)!.points;
  claim(n5.every((p) => p.fr === 5 && p.pr === 5), 'n = 5 : 5 itérations pour tout κ');
  claim(kap.every((d) => d.points.every((p) => Math.abs(p.fr - p.pr) <= 0.05 * p.fr + 1)), 'FR et PR se superposent');

  const batch = optim.frprBatch();
  const names = (pick: (d: (typeof batch)[number]) => boolean) =>
    batch.filter(pick).map((d) => d.name);
  const frWins = names((d) => d.fr.rate > d.pr.rate);
  const prWins = names((d) => d.pr.rate > d.fr.rate);
  const bothFail = names((d) => d.fr.rate === 0 && d.pr.rate === 0);
  const ratios = batch
    .filter((d) => Number.isFinite(d.fr.iterations) && Number.isFinite(d.pr.iterations))
    .map((d) => d.fr.iterations / d.pr.iterations);
  claim(frWins.length > 0 && prWins.length > 0 && bothFail.length > 0, 'FR gagne sur certaines fonctions, PR+ sur d’autres, aucune sur une');
  claim(ratios.every((r) => r > 1), 'PR+ demande moins d’itérations que FR');

  const ros = optim.frprRosenbrock();
  const anim = optim.frprPaths();
  const P = optim.benchPaths();
  claim(P.well.fr.iterations === 2 && P.well.pr.iterations === 2, 'CG : 2 itérations sur les quadratiques 2D');

  const frag = optim.lineSearchFragility();
  const failsAt = (k: 'fr' | 'pr') => (locale: Locale) =>
    frag
      .filter((r) => r[k] === null)
      .map((r) => `c = ${num(r.c, locale)}, τ = ${num(r.tau, locale)}`)
      .join(locale === 'en' ? ' or ' : locale === 'fr' ? ' ou ' : ' oder ');
  claim(frag.some((r) => r.pr === null) && frag.some((r) => r.fr === null), 'PR+ et FR échouent chacun pour un réglage');
  claim(frag.every((r) => r.c !== 0.4 || (r.fr !== null && r.pr !== null)), 'le réglage retenu converge pour les deux');

  const K = optim.benchKappa().filter((r) => r.kappa >= 3);
  const logs = K.map((r) => [Math.log(r.kappa), Math.log((r.fr + r.pr) / 2)]);
  const mx = logs.reduce((s, [x]) => s + x, 0) / logs.length;
  const my = logs.reduce((s, [, y]) => s + y, 0) / logs.length;
  const slope =
    logs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) /
    logs.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  const gdFail = K.find((r) => r.gd === null)?.kappa;
  const gdLogs = K.filter((r) => r.gd !== null).map((r) => [Math.log(r.kappa), Math.log(r.gd!)]);
  const gmx = gdLogs.reduce((a, [x]) => a + x, 0) / gdLogs.length;
  const gmy = gdLogs.reduce((a, [, y]) => a + y, 0) / gdLogs.length;
  const gdSlope =
    gdLogs.reduce((a, [x, y]) => a + (x - gmx) * (y - gmy), 0) /
    gdLogs.reduce((a, [x]) => a + (x - gmx) ** 2, 0);
  claim(gdFail !== undefined && K.filter((r) => r.kappa >= gdFail).every((r) => r.gd === null), 'la descente de gradient échoue au-delà d’un κ');

  const D = optim.benchDimension();
  const exact = D.filter((d) => d.iterations === d.n).map((d) => d.n);

  const R = optim.benchRate();
  const tail = R.bfgs.ratio;
  let trailing = 0;
  while (trailing < tail.length && tail[tail.length - 1 - trailing] < 0.1) trailing++;
  /** Le taux moyen par pas : la moyenne géométrique des rₖ. */
  const geo = (xs: number[]) => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
  const frGeo = geo(R.fr.ratio.slice(-10));
  const prGeo = geo(R.pr.ratio.slice(-10));
  claim(trailing >= 2, 'rₖ de BFGS tombe sous 0,1 sur ses derniers pas');
  claim(frGeo > 0.1 && frGeo < 1 && prGeo > 0.1 && prGeo < 1, 'FR et PR+ convergent linéairement (taux moyen entre 0,1 et 1)');

  const LS = optim.benchLineSearch();
  const cells = LS.cells.flatMap((row, i) => row.map((c, j) => ({ ...c, c: LS.cs[i], tau: LS.taus[j] })));
  const best = cells.reduce((a, b) => (b.iterations < a.iterations ? b : a));
  claim(
    LS.cells.every((row) => row[row.length - 1].evaluations === Math.max(...row.map((c) => c.evaluations))),
    'évaluations maximales à τ = 0,9 pour tout c'
  );

  return {
    q5: 5,
    q75lo: Math.round(at(75, 10)),
    q75hi: Math.round(at(75, 1000)),
    frWins: (l) => list(frWins, l),
    prWins: (l) => list(prWins, l),
    bothFail: (l) => list(bothFail, l),
    itRatioMin: Math.min(...ratios).toFixed(1),
    itRatioMax: Math.max(...ratios).toFixed(1),
    rfConv: ros.fr.converged,
    rpConv: ros.pr.converged,
    rfMed: ros.fr.median,
    rpMed: ros.pr.median,
    rfMean: Math.round(ros.fr.mean),
    rpMean: Math.round(ros.pr.mean),
    rfMax: ros.fr.max,
    rpMax: ros.pr.max,
    animFr: anim.fr.iterations,
    animPr: anim.pr.iterations,
    cgWell: P.well.fr.iterations,
    bfgsWell: P.well.bfgs.iterations,
    bfgsIll: P.ill.bfgs.iterations,
    rosFr: P.rosenbrock.fr.iterations,
    rosPr: P.rosenbrock.pr.iterations,
    rosBfgs: P.rosenbrock.bfgs.iterations,
    prFailsAt: failsAt('pr'),
    frFailsAt: failsAt('fr'),
    cgKlo: Math.round((K[0].fr + K[0].pr) / 2),
    cgKhi: Math.round((K.at(-1)!.fr + K.at(-1)!.pr) / 2),
    cgSlope: +slope.toFixed(2),
    bfgsKmin: Math.min(...K.map((r) => r.bfgs)),
    bfgsKmax: Math.max(...K.map((r) => r.bfgs)),
    gdFail: gdFail!,
    dimExact: Math.max(...exact),
    dim200: D.find((d) => d.n === 200)!.iterations,
    bfgsRatio: Math.max(...tail.slice(-trailing)),
    bfgsRatioN: trailing,
    frGeo: frGeo,
    prGeo: prGeo,
    gdSlope: +gdSlope.toFixed(2),
    lsConv: cells.filter((c) => c.converged).length,
    lsItMin: Math.min(...cells.map((c) => c.iterations)),
    lsItMax: Math.max(...cells.map((c) => c.iterations)),
    lsEvMin: Math.min(...cells.map((c) => c.evaluations)),
    lsEvMax: Math.max(...cells.map((c) => c.evaluations)),
    lsBestIt: best.iterations,
    lsBestC: best.c,
    lsBestTau: best.tau,
    lsBestEv: best.evaluations,
  };
};

/* ── U-Net, pièce par pièce ────────────────────────────────────────── */

/*
 * Des notes de cours sur le U-Net du projet `unet-coco`, en listes et en
 * formules plutôt qu'en récit. Les chiffres d'architecture — tailles, paramètres,
 * calcul, champ réceptif — sont recalculés par `src/lib/unet.ts` et injectés
 * par `{{clé}}` ; seuls les résultats mesurés du projet (`results`) sont saisis.
 * Les extraits sont ceux de la page du projet.
 */
const unet: NoteDef = {
  slug: 'unet-piece-by-piece',
  tone: 'orange',
  category: 'deep-learning',
  project: 'unet-coco',
  facts: () => unetFacts(),

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      kicker: 'deep learning · segmentation',
      title: 'U-Net,',
      titleAccent: 'piece by piece',
      description:
        'Course notes on the U-Net of the COCO project: padded convolutions, pooling and transposed convolutions, skip connections, receptive field, parameter and compute budget, Dice and IoU. Every number recomputed from the architecture.',
      sections: [
        {
          id: 'task',
          kicker: '01',
          title: 'The task',
          blocks: [
            {
              type: 'list',
              items: [
                'Input: an RGB image, 3 × {{input}} × {{input}}, values in [0, 1].',
                'Output: one logit z per pixel, 1 × {{input}} × {{input}}. p = σ(z) is the probability of foreground; mask = p > 0.5.',
                'Ground truth: the union of all annotated COCO instances; everything else is background. About {{fg}} % of pixels are foreground.',
                'Data: COCO val2017, the {{nImages}} images with at least one annotation → {{nTrain}} train, {{nVal}} validation, {{nTest}} test. The test split is read once, at the end.',
                'Resizing: image and mask to {{input}} × {{input}}; the mask by nearest neighbour — interpolating a binary mask creates values that are neither 0 nor 1.',
              ],
            },
          ],
        },
        {
          id: 'convolution',
          kicker: '02',
          title: 'Padded 3×3 convolution',
          blocks: [
            {
              type: 'text',
              content: 'Output side: o = ⌊(i + 2p − k) / s⌋ + 1. With k = 3, p = 1, s = 1: o = i.',
            },
            {
              type: 'diagram',
              diagram: 'unetConv',
              caption:
                'Centred on the first pixel, the kernel reaches into the padding: zeros stand in for the missing neighbours. Five positions per row, five outputs.',
            },
            {
              type: 'list',
              items: [
                'Weights of one convolution: k²·C_in·C_out. No bias: the BatchNorm that follows subtracts the mean, which would cancel it, and adds its own shift β.',
                'DoubleConv = (conv 3×3 → BatchNorm → ReLU) × 2 — the block of every stage.',
                'Padding keeps each map at exactly half the side of the level above, so encoder and decoder maps align without cropping. The original paper uses unpadded convolutions and crops the skip maps instead.',
              ],
            },
          ],
        },
        {
          id: 'resampling',
          kicker: '03',
          title: 'Going down, coming back up',
          blocks: [
            {
              type: 'diagram',
              diagram: 'unetResample',
              caption:
                'Left: each 2×2 block keeps its maximum. Right: each input value is multiplied by the 2×2 kernel and written into its own block — highlighted, the largest value and the block it paints.',
            },
            {
              type: 'list',
              items: [
                'Max pool 2×2, stride 2: H × W → H/2 × W/2, channels unchanged, no parameters. It keeps the strongest response of each block and forgets where in the block it was.',
                'Transposed convolution 2×2, stride 2: o = (i − 1)·s − 2p + k = 2i. It also halves the channels, C → C/2: 4·C·C/2 weights and C/2 biases.',
                'Kernel = stride: the output blocks do not overlap, so every output pixel gets exactly one contribution — no checkerboard pattern from uneven overlap.',
                'Four poolings: the input side must be a multiple of 2⁴ = 16, hence {{input}}.',
              ],
            },
          ],
        },
        {
          id: 'architecture',
          kicker: '04',
          title: 'The whole network',
          blocks: [
            {
              type: 'diagram',
              diagram: 'unetArchitecture',
              caption:
                'Drawn from the layer list: box width grows with the channels, each level halves the side. Solid arrows change the resolution; dashed arrows carry an encoder map across to the decoder.',
            },
            {
              type: 'list',
              items: [
                'Encoder: {{encChannels}} channels at {{encSides}} — the channels double when the side halves.',
                'Bottleneck: {{midChannels}} channels at {{midSide}}².',
                'Decoder stage: transposed convolution (C → C/2) → concatenation with the encoder map of the same side (C/2 + C/2 = C) → DoubleConv (C → C/2).',
                'Head: 1×1 convolution, {{width}} → 1, one logit per pixel. No sigmoid inside the network: it is applied in the loss, where log σ(z) is computed stably.',
              ],
            },
            {
              type: 'code',
              snippet: 'unetUp',
              caption: 'One decoder stage. torch.cat along dim 1 stacks the channels: C/2 from the skip, C/2 from below.',
            },
            {
              type: 'diagram',
              diagram: 'unetBudget',
              caption:
                'Share of the total, per stage. Parameters: weights, biases and BatchNorm. Multiply-adds: the convolutions, for one {{input}} × {{input}} image.',
            },
            {
              type: 'list',
              items: [
                'Total: {{params}} parameters; {{gmac}} GMAC per image.',
                'Bottleneck and deepest decoder stage: {{deepShare}} % of the parameters. A 3×3 convolution holds 9·C_in·C_out weights, and C is largest at the bottom.',
                'Compute is spread evenly: from one level to the next, C_in·C_out is multiplied by 4 and the area divided by 4. Each encoder level ≈ {{encLevel}} %, each decoder level ≈ {{decLevel}} %; the first stage is lighter, with 3 input channels.',
                'Width 64, as in the paper: {{params64}} parameters, ×{{paramsRatio}}. Parameters grow with the square of the width.',
              ],
            },
          ],
        },
        {
          id: 'receptive-field',
          kicker: '05',
          title: 'Receptive field',
          blocks: [
            {
              type: 'text',
              content:
                'r ← r + (k − 1)·j, then j ← j·s. r: side of the receptive field; j: distance between two neighbouring units. Both in input pixels.',
            },
            {
              type: 'diagram',
              diagram: 'unetReceptive',
              caption:
                'To scale on the {{input}} × {{input}} input. Each square is what one unit sees at the end of a stage; at the bottleneck it is larger than the image.',
            },
            {
              type: 'list',
              items: [
                'End of each encoder stage: {{rf1}}, {{rf2}}, {{rf3}} and {{rf4}} px. Bottleneck: {{rfB}} px ≥ {{input}} — every bottleneck unit depends on the whole image, padding included.',
                'The same {{convs}} convolutions without pooling: 1 + 2 × {{convs}} = {{rfNoPool}} px. Pooling doubles j, so every later 3×3 convolution adds twice as much context.',
                'What the bottleneck gains in context it loses in position: one unit per {{cellSide}} × {{cellSide}} block. The skip connections bring the full-resolution position back.',
              ],
            },
          ],
        },
        {
          id: 'losses',
          kicker: '06',
          title: 'Losses and metrics',
          blocks: [
            {
              type: 'list',
              items: [
                'BCE: L = −(1/N) Σ [y log p + (1 − y) log(1 − p)]. Gradient per logit: ∂L/∂z = (p − y)/N — bounded, and never zero while the pixel is wrong.',
                'Soft Dice: D = (2 Σ p·y + ε) / (Σ p + Σ y + ε); loss 1 − D, per image, then averaged.',
                'ε = 1: an empty target with an empty prediction gives D = 1 instead of 0/0.',
                'BCE counts pixels: with {{fg}} % foreground, background pixels carry most of the loss. Dice counts overlap relative to the object: a small object weighs as much as a large one.',
                'Training minimises BCE + Dice: smooth gradients from the first, the target metric from the second.',
              ],
            },
            {
              type: 'code',
              snippet: 'diceLoss',
              caption: 'Sums over dims (2, 3): one Dice per image, then the mean over the batch.',
            },
            {
              type: 'text',
              content: 'IoU: J = |P ∩ Y| / |P ∪ Y|. Dice: D = 2 |P ∩ Y| / (|P| + |Y|).',
            },
            {
              type: 'diagram',
              diagram: 'unetDiceIou',
              caption:
                'The exact curve holds for one image. The grey dot is the pair of test-set means; the dashed segment is the gap between it and the curve.',
            },
            {
              type: 'list',
              items: [
                'One image: D = 2J / (1 + J), so D ≥ J, equal at 0 and 1. Dice and IoU rank images the same way.',
                'Averages: f(mean J) = f({{iou}}) = {{diceOfIou}}, but mean D = {{dice}}. f is concave, so mean f(J) ≤ f(mean J) (Jensen); the gap grows with the spread of the per-image scores.',
                'Consequence: report both from the same per-image scores; never convert one mean into the other.',
              ],
            },
          ],
        },
        {
          id: 'training',
          kicker: '07',
          title: 'Training',
          blocks: [
            {
              type: 'list',
              items: [
                'Adam, learning rate 3·10⁻⁴.',
                'ReduceLROnPlateau on validation Dice: learning rate × 0.2 after 2 epochs without improvement.',
                '20 epochs; the weights kept are those of the best validation Dice (epoch 12), copied to the CPU when reached.',
                'Augmentation: horizontal flip only, one draw for image and mask together.',
              ],
            },
            {
              type: 'code',
              snippet: 'unetEpoch',
              caption:
                'model.train() and model.eval() switch BatchNorm between batch statistics and running statistics; set_grad_enabled(False) builds no graph during validation.',
            },
          ],
        },
        {
          id: 'results',
          kicker: '08',
          title: 'Reading the results',
          blocks: [
            {
              type: 'list',
              items: [
                'Test ({{nTest}} images): Dice {{dice}}, IoU {{iou}}, pixel accuracy {{acc}}.',
                'Predicting background everywhere: accuracy ≈ {{trivialAcc}}, Dice 0 on every image that has an object. Pixel accuracy is not a segmentation metric.',
                'Failures: small or ambiguous foreground; salient objects outside COCO’s 80 categories, which count as background in the ground truth.',
                'Limits: {{input}} × {{input}} input, where thin structures vanish; one binary class; no test-time augmentation.',
                'Reference: O. Ronneberger, P. Fischer, T. Brox, U-Net: Convolutional Networks for Biomedical Image Segmentation, MICCAI 2015.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      kicker: 'deep learning · segmentation',
      title: 'U-Net,',
      titleAccent: 'pièce par pièce',
      description:
        'Notes de cours sur le U-Net du projet COCO : convolutions avec bourrage, pooling et convolutions transposées, connexions de saut, champ réceptif, budget de paramètres et de calcul, Dice et IoU. Chaque chiffre est recalculé depuis l’architecture.',
      sections: [
        {
          id: 'task',
          kicker: '01',
          title: 'La tâche',
          blocks: [
            {
              type: 'list',
              items: [
                'Entrée : une image RVB, 3 × {{input}} × {{input}}, valeurs dans [0, 1].',
                'Sortie : un logit z par pixel, 1 × {{input}} × {{input}}. p = σ(z) est la probabilité d’avant-plan ; masque = p > 0,5.',
                'Vérité terrain : l’union de toutes les instances annotées de COCO ; tout le reste est du fond. Environ {{fg}} % des pixels sont de l’avant-plan.',
                'Données : COCO val2017, les {{nImages}} images qui ont au moins une annotation → {{nTrain}} en entraînement, {{nVal}} en validation, {{nTest}} en test. Le test n’est lu qu’une fois, à la fin.',
                'Redimensionnement : image et masque en {{input}} × {{input}} ; le masque au plus proche voisin — interpoler un masque binaire crée des valeurs qui ne sont ni 0 ni 1.',
              ],
            },
          ],
        },
        {
          id: 'convolution',
          kicker: '02',
          title: 'Convolution 3×3 avec bourrage',
          blocks: [
            {
              type: 'text',
              content: 'Côté de sortie : o = ⌊(i + 2p − k) / s⌋ + 1. Avec k = 3, p = 1, s = 1 : o = i.',
            },
            {
              type: 'diagram',
              diagram: 'unetConv',
              caption:
                'Centré sur le premier pixel, le noyau déborde sur le bourrage : des zéros remplacent les voisins absents. Cinq positions par ligne, cinq sorties.',
            },
            {
              type: 'list',
              items: [
                'Poids d’une convolution : k²·C_in·C_out. Pas de biais : la BatchNorm qui suit retire la moyenne, ce qui l’annulerait, et ajoute son propre décalage β.',
                'DoubleConv = (conv 3×3 → BatchNorm → ReLU) × 2 — le bloc de chaque étage.',
                'Le bourrage garde chaque carte à exactement la moitié du côté du niveau au-dessus : cartes d’encodeur et de décodeur s’alignent sans recadrage. L’article d’origine utilise des convolutions sans bourrage et recadre les cartes de saut.',
              ],
            },
          ],
        },
        {
          id: 'resampling',
          kicker: '03',
          title: 'Descendre, remonter',
          blocks: [
            {
              type: 'diagram',
              diagram: 'unetResample',
              caption:
                'À gauche : chaque bloc 2×2 garde son maximum. À droite : chaque valeur d’entrée est multipliée par le noyau 2×2 et écrite dans son propre bloc — en avant, la plus grande valeur et le bloc qu’elle peint.',
            },
            {
              type: 'list',
              items: [
                'Max pooling 2×2, pas 2 : H × W → H/2 × W/2, canaux inchangés, aucun paramètre. Il garde la plus forte réponse de chaque bloc et oublie où elle était dans le bloc.',
                'Convolution transposée 2×2, pas 2 : o = (i − 1)·s − 2p + k = 2i. Elle divise aussi les canaux par deux, C → C/2 : 4·C·C/2 poids et C/2 biais.',
                'Noyau = pas : les blocs de sortie ne se chevauchent pas, chaque pixel de sortie reçoit exactement une contribution — pas de damier dû à un chevauchement inégal.',
                'Quatre poolings : le côté d’entrée doit être un multiple de 2⁴ = 16, d’où {{input}}.',
              ],
            },
          ],
        },
        {
          id: 'architecture',
          kicker: '04',
          title: 'Le réseau entier',
          blocks: [
            {
              type: 'diagram',
              diagram: 'unetArchitecture',
              caption:
                'Tracé depuis la liste des couches : la largeur d’un bloc suit ses canaux, chaque niveau divise le côté par deux. Flèches pleines : changement de résolution ; flèches en tirets : une carte d’encodeur portée jusqu’au décodeur.',
            },
            {
              type: 'list',
              items: [
                'Encodeur : {{encChannels}} canaux à {{encSides}} — les canaux doublent quand le côté est divisé par deux.',
                'Goulot : {{midChannels}} canaux à {{midSide}}².',
                'Étage de décodeur : convolution transposée (C → C/2) → concaténation avec la carte d’encodeur de même côté (C/2 + C/2 = C) → DoubleConv (C → C/2).',
                'Tête : convolution 1×1, {{width}} → 1, un logit par pixel. Pas de sigmoïde dans le réseau : elle est appliquée dans la perte, où log σ(z) se calcule de façon stable.',
              ],
            },
            {
              type: 'code',
              snippet: 'unetUp',
              caption: 'Un étage de décodeur. torch.cat sur la dimension 1 empile les canaux : C/2 venus du saut, C/2 venus d’en dessous.',
            },
            {
              type: 'diagram',
              diagram: 'unetBudget',
              caption:
                'Part du total, par étage. Paramètres : poids, biais et BatchNorm. Multiplications-additions : les convolutions, pour une image {{input}} × {{input}}.',
            },
            {
              type: 'list',
              items: [
                'Total : {{params}} paramètres ; {{gmac}} GMAC par image.',
                'Goulot et étage de décodeur le plus profond : {{deepShare}} % des paramètres. Une convolution 3×3 porte 9·C_in·C_out poids, et C est maximal au fond.',
                'Le calcul est réparti également : d’un niveau au suivant, C_in·C_out est multiplié par 4 et la surface divisée par 4. Chaque niveau d’encodeur ≈ {{encLevel}} %, chaque niveau de décodeur ≈ {{decLevel}} % ; le premier étage est plus léger, avec 3 canaux d’entrée.',
                'Largeur 64, comme dans l’article : {{params64}} paramètres, ×{{paramsRatio}}. Les paramètres croissent comme le carré de la largeur.',
              ],
            },
          ],
        },
        {
          id: 'receptive-field',
          kicker: '05',
          title: 'Champ réceptif',
          blocks: [
            {
              type: 'text',
              content:
                'r ← r + (k − 1)·j, puis j ← j·s. r : côté du champ réceptif ; j : distance entre deux unités voisines. Les deux en pixels d’entrée.',
            },
            {
              type: 'diagram',
              diagram: 'unetReceptive',
              caption:
                'À l’échelle de l’entrée {{input}} × {{input}}. Chaque carré est ce que voit une unité en fin d’étage ; au goulot, il est plus grand que l’image.',
            },
            {
              type: 'list',
              items: [
                'Fin de chaque étage d’encodeur : {{rf1}}, {{rf2}}, {{rf3}} et {{rf4}} px. Goulot : {{rfB}} px ≥ {{input}} — chaque unité du goulot dépend de toute l’image, bourrage compris.',
                'Les mêmes {{convs}} convolutions sans pooling : 1 + 2 × {{convs}} = {{rfNoPool}} px. Le pooling double j : chaque convolution 3×3 suivante ajoute deux fois plus de contexte.',
                'Ce que le goulot gagne en contexte, il le perd en position : une unité par bloc de {{cellSide}} × {{cellSide}}. Les connexions de saut ramènent la position à pleine résolution.',
              ],
            },
          ],
        },
        {
          id: 'losses',
          kicker: '06',
          title: 'Pertes et métriques',
          blocks: [
            {
              type: 'list',
              items: [
                'BCE : L = −(1/N) Σ [y log p + (1 − y) log(1 − p)]. Gradient par logit : ∂L/∂z = (p − y)/N — borné, et jamais nul tant que le pixel est faux.',
                'Dice doux : D = (2 Σ p·y + ε) / (Σ p + Σ y + ε) ; perte 1 − D, par image, puis moyennée.',
                'ε = 1 : une cible vide avec une prédiction vide donne D = 1 au lieu de 0/0.',
                'La BCE compte des pixels : avec {{fg}} % d’avant-plan, les pixels de fond portent l’essentiel de la perte. Le Dice compte le recouvrement rapporté à l’objet : un petit objet pèse autant qu’un grand.',
                'L’entraînement minimise BCE + Dice : des gradients lisses pour la première, la métrique visée pour le second.',
              ],
            },
            {
              type: 'code',
              snippet: 'diceLoss',
              caption: 'Sommes sur les dimensions (2, 3) : un Dice par image, puis la moyenne sur le lot.',
            },
            {
              type: 'text',
              content: 'IoU : J = |P ∩ Y| / |P ∪ Y|. Dice : D = 2 |P ∩ Y| / (|P| + |Y|).',
            },
            {
              type: 'diagram',
              diagram: 'unetDiceIou',
              caption:
                'La courbe exacte vaut pour une image. Le point gris est le couple des moyennes du jeu de test ; le segment en tirets, l’écart qui le sépare de la courbe.',
            },
            {
              type: 'list',
              items: [
                'Une image : D = 2J / (1 + J), donc D ≥ J, avec égalité en 0 et en 1. Dice et IoU classent les images dans le même ordre.',
                'Moyennes : f(moyenne J) = f({{iou}}) = {{diceOfIou}}, mais moyenne D = {{dice}}. f est concave, donc moyenne f(J) ≤ f(moyenne J) (Jensen) ; l’écart croît avec la dispersion des scores par image.',
                'Conséquence : donner les deux à partir des mêmes scores par image ; ne jamais convertir une moyenne en l’autre.',
              ],
            },
          ],
        },
        {
          id: 'training',
          kicker: '07',
          title: 'Entraînement',
          blocks: [
            {
              type: 'list',
              items: [
                'Adam, pas d’apprentissage 3·10⁻⁴.',
                'ReduceLROnPlateau sur le Dice de validation : pas × 0,2 après 2 époques sans progrès.',
                '20 époques ; les poids gardés sont ceux du meilleur Dice de validation (époque 12), copiés sur le CPU au moment où il est atteint.',
                'Augmentation : retournement horizontal seulement, un seul tirage pour l’image et le masque.',
              ],
            },
            {
              type: 'code',
              snippet: 'unetEpoch',
              caption:
                'model.train() et model.eval() font passer la BatchNorm des statistiques du lot aux statistiques glissantes ; set_grad_enabled(False) ne construit aucun graphe pendant la validation.',
            },
          ],
        },
        {
          id: 'results',
          kicker: '08',
          title: 'Lire les résultats',
          blocks: [
            {
              type: 'list',
              items: [
                'Test ({{nTest}} images) : Dice {{dice}}, IoU {{iou}}, exactitude par pixel {{acc}}.',
                'Prédire du fond partout : exactitude ≈ {{trivialAcc}}, Dice 0 sur chaque image qui contient un objet. L’exactitude par pixel n’est pas une métrique de segmentation.',
                'Échecs : avant-plan petit ou ambigu ; objets saillants hors des 80 catégories de COCO, comptés comme du fond dans la vérité terrain.',
                'Limites : entrée {{input}} × {{input}}, où les structures fines disparaissent ; une seule classe binaire ; pas d’augmentation au test.',
                'Référence : O. Ronneberger, P. Fischer, T. Brox, U-Net: Convolutional Networks for Biomedical Image Segmentation, MICCAI 2015.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      kicker: 'Deep Learning · Segmentierung',
      title: 'U-Net,',
      titleAccent: 'Stück für Stück',
      description:
        'Kursnotizen zum U-Net des COCO-Projekts: Faltungen mit Padding, Pooling und transponierte Faltungen, Skip-Verbindungen, rezeptives Feld, Parameter- und Rechenbudget, Dice und IoU. Jede Zahl aus der Architektur neu berechnet.',
      sections: [
        {
          id: 'task',
          kicker: '01',
          title: 'Die Aufgabe',
          blocks: [
            {
              type: 'list',
              items: [
                'Eingabe: ein RGB-Bild, 3 × {{input}} × {{input}}, Werte in [0, 1].',
                'Ausgabe: ein Logit z pro Pixel, 1 × {{input}} × {{input}}. p = σ(z) ist die Vordergrund-Wahrscheinlichkeit; Maske = p > 0,5.',
                'Ground Truth: die Vereinigung aller annotierten COCO-Instanzen; alles andere ist Hintergrund. Etwa {{fg}} % der Pixel sind Vordergrund.',
                'Daten: COCO val2017, die {{nImages}} Bilder mit mindestens einer Annotation → {{nTrain}} Training, {{nVal}} Validierung, {{nTest}} Test. Der Testsplit wird ein einziges Mal gelesen, am Ende.',
                'Skalierung: Bild und Maske auf {{input}} × {{input}}; die Maske per nächstem Nachbarn — eine binäre Maske zu interpolieren erzeugt Werte, die weder 0 noch 1 sind.',
              ],
            },
          ],
        },
        {
          id: 'convolution',
          kicker: '02',
          title: '3×3-Faltung mit Padding',
          blocks: [
            {
              type: 'text',
              content: 'Ausgabeseite: o = ⌊(i + 2p − k) / s⌋ + 1. Mit k = 3, p = 1, s = 1: o = i.',
            },
            {
              type: 'diagram',
              diagram: 'unetConv',
              caption:
                'Auf dem ersten Pixel zentriert, reicht der Kern ins Padding: Nullen ersetzen die fehlenden Nachbarn. Fünf Positionen pro Zeile, fünf Ausgaben.',
            },
            {
              type: 'list',
              items: [
                'Gewichte einer Faltung: k²·C_in·C_out. Kein Bias: Die folgende BatchNorm zieht den Mittelwert ab, was ihn aufheben würde, und addiert ihre eigene Verschiebung β.',
                'DoubleConv = (Conv 3×3 → BatchNorm → ReLU) × 2 — der Block jeder Stufe.',
                'Das Padding hält jede Karte auf genau der halben Seite der Ebene darüber: Encoder- und Decoder-Karten liegen ohne Zuschneiden übereinander. Das Originalpaper faltet ohne Padding und schneidet dafür die Skip-Karten zu.',
              ],
            },
          ],
        },
        {
          id: 'resampling',
          kicker: '03',
          title: 'Hinunter und wieder hinauf',
          blocks: [
            {
              type: 'diagram',
              diagram: 'unetResample',
              caption:
                'Links: Jeder 2×2-Block behält sein Maximum. Rechts: Jeder Eingabewert wird mit dem 2×2-Kern multipliziert und in seinen eigenen Block geschrieben — hervorgehoben der größte Wert und der Block, den er malt.',
            },
            {
              type: 'list',
              items: [
                'Max-Pooling 2×2, Schritt 2: H × W → H/2 × W/2, Kanäle unverändert, keine Parameter. Es behält die stärkste Antwort jedes Blocks und vergisst, wo im Block sie lag.',
                'Transponierte Faltung 2×2, Schritt 2: o = (i − 1)·s − 2p + k = 2i. Sie halbiert auch die Kanäle, C → C/2: 4·C·C/2 Gewichte und C/2 Biases.',
                'Kern = Schritt: Die Ausgabeblöcke überlappen nicht, jedes Ausgabepixel erhält genau einen Beitrag — kein Schachbrettmuster durch ungleichmäßige Überlappung.',
                'Vier Poolings: Die Eingabeseite muss ein Vielfaches von 2⁴ = 16 sein, daher {{input}}.',
              ],
            },
          ],
        },
        {
          id: 'architecture',
          kicker: '04',
          title: 'Das ganze Netz',
          blocks: [
            {
              type: 'diagram',
              diagram: 'unetArchitecture',
              caption:
                'Aus der Schichtliste gezeichnet: Die Blockbreite folgt den Kanälen, jede Ebene halbiert die Seite. Durchgezogene Pfeile ändern die Auflösung; gestrichelte tragen eine Encoder-Karte hinüber zum Decoder.',
            },
            {
              type: 'list',
              items: [
                'Encoder: {{encChannels}} Kanäle bei {{encSides}} — die Kanäle verdoppeln sich, wenn sich die Seite halbiert.',
                'Engpass: {{midChannels}} Kanäle bei {{midSide}}².',
                'Decoder-Stufe: transponierte Faltung (C → C/2) → Verkettung mit der Encoder-Karte gleicher Seite (C/2 + C/2 = C) → DoubleConv (C → C/2).',
                'Kopf: 1×1-Faltung, {{width}} → 1, ein Logit pro Pixel. Kein Sigmoid im Netz: Es wird im Verlust angewendet, wo log σ(z) stabil berechnet wird.',
              ],
            },
            {
              type: 'code',
              snippet: 'unetUp',
              caption: 'Eine Decoder-Stufe. torch.cat entlang Dimension 1 stapelt die Kanäle: C/2 aus dem Skip, C/2 von unten.',
            },
            {
              type: 'diagram',
              diagram: 'unetBudget',
              caption:
                'Anteil am Gesamten, pro Stufe. Parameter: Gewichte, Biases und BatchNorm. Multiply-Adds: die Faltungen, für ein Bild von {{input}} × {{input}}.',
            },
            {
              type: 'list',
              items: [
                'Gesamt: {{params}} Parameter; {{gmac}} GMAC pro Bild.',
                'Engpass und tiefste Decoder-Stufe: {{deepShare}} % der Parameter. Eine 3×3-Faltung hält 9·C_in·C_out Gewichte, und C ist unten am größten.',
                'Die Rechenlast ist gleichmäßig verteilt: Von einer Ebene zur nächsten wird C_in·C_out mit 4 multipliziert und die Fläche durch 4 geteilt. Jede Encoder-Ebene ≈ {{encLevel}} %, jede Decoder-Ebene ≈ {{decLevel}} %; die erste Stufe ist mit 3 Eingangskanälen leichter.',
                'Breite 64, wie im Paper: {{params64}} Parameter, ×{{paramsRatio}}. Die Parameter wachsen mit dem Quadrat der Breite.',
              ],
            },
          ],
        },
        {
          id: 'receptive-field',
          kicker: '05',
          title: 'Rezeptives Feld',
          blocks: [
            {
              type: 'text',
              content:
                'r ← r + (k − 1)·j, dann j ← j·s. r: Seite des rezeptiven Felds; j: Abstand zweier benachbarter Einheiten. Beide in Eingabepixeln.',
            },
            {
              type: 'diagram',
              diagram: 'unetReceptive',
              caption:
                'Maßstabsgetreu auf der Eingabe {{input}} × {{input}}. Jedes Quadrat ist, was eine Einheit am Ende einer Stufe sieht; im Engpass ist es größer als das Bild.',
            },
            {
              type: 'list',
              items: [
                'Ende jeder Encoder-Stufe: {{rf1}}, {{rf2}}, {{rf3}} und {{rf4}} px. Engpass: {{rfB}} px ≥ {{input}} — jede Einheit des Engpasses hängt vom ganzen Bild ab, Padding eingeschlossen.',
                'Dieselben {{convs}} Faltungen ohne Pooling: 1 + 2 × {{convs}} = {{rfNoPool}} px. Pooling verdoppelt j: Jede spätere 3×3-Faltung fügt doppelt so viel Kontext hinzu.',
                'Was der Engpass an Kontext gewinnt, verliert er an Position: eine Einheit pro Block von {{cellSide}} × {{cellSide}}. Die Skip-Verbindungen bringen die Position in voller Auflösung zurück.',
              ],
            },
          ],
        },
        {
          id: 'losses',
          kicker: '06',
          title: 'Verluste und Metriken',
          blocks: [
            {
              type: 'list',
              items: [
                'BCE: L = −(1/N) Σ [y log p + (1 − y) log(1 − p)]. Gradient pro Logit: ∂L/∂z = (p − y)/N — beschränkt und nie null, solange das Pixel falsch ist.',
                'Weicher Dice: D = (2 Σ p·y + ε) / (Σ p + Σ y + ε); Verlust 1 − D, pro Bild, dann gemittelt.',
                'ε = 1: Ein leeres Ziel mit leerer Vorhersage ergibt D = 1 statt 0/0.',
                'BCE zählt Pixel: Bei {{fg}} % Vordergrund tragen die Hintergrundpixel den Großteil des Verlusts. Dice zählt die Überlappung relativ zum Objekt: Ein kleines Objekt wiegt so viel wie ein großes.',
                'Trainiert wird auf BCE + Dice: glatte Gradienten vom ersten, die Zielmetrik vom zweiten.',
              ],
            },
            {
              type: 'code',
              snippet: 'diceLoss',
              caption: 'Summen über die Dimensionen (2, 3): ein Dice pro Bild, dann der Mittelwert über den Batch.',
            },
            {
              type: 'text',
              content: 'IoU: J = |P ∩ Y| / |P ∪ Y|. Dice: D = 2 |P ∩ Y| / (|P| + |Y|).',
            },
            {
              type: 'diagram',
              diagram: 'unetDiceIou',
              caption:
                'Die exakte Kurve gilt für ein Bild. Der graue Punkt ist das Paar der Testset-Mittelwerte; die gestrichelte Strecke der Abstand zur Kurve.',
            },
            {
              type: 'list',
              items: [
                'Ein Bild: D = 2J / (1 + J), also D ≥ J, Gleichheit bei 0 und 1. Dice und IoU ordnen Bilder gleich.',
                'Mittelwerte: f(Mittel J) = f({{iou}}) = {{diceOfIou}}, aber Mittel D = {{dice}}. f ist konkav, also Mittel f(J) ≤ f(Mittel J) (Jensen); der Abstand wächst mit der Streuung der Werte pro Bild.',
                'Folge: beide aus denselben Werten pro Bild angeben; nie einen Mittelwert in den anderen umrechnen.',
              ],
            },
          ],
        },
        {
          id: 'training',
          kicker: '07',
          title: 'Training',
          blocks: [
            {
              type: 'list',
              items: [
                'Adam, Lernrate 3·10⁻⁴.',
                'ReduceLROnPlateau auf dem Validierungs-Dice: Lernrate × 0,2 nach 2 Epochen ohne Verbesserung.',
                '20 Epochen; behalten werden die Gewichte des besten Validierungs-Dice (Epoche 12), beim Erreichen auf die CPU kopiert.',
                'Augmentierung: nur horizontales Spiegeln, ein Zug für Bild und Maske zusammen.',
              ],
            },
            {
              type: 'code',
              snippet: 'unetEpoch',
              caption:
                'model.train() und model.eval() schalten die BatchNorm zwischen Batch-Statistiken und laufenden Statistiken um; set_grad_enabled(False) baut während der Validierung keinen Graphen.',
            },
          ],
        },
        {
          id: 'results',
          kicker: '08',
          title: 'Die Ergebnisse lesen',
          blocks: [
            {
              type: 'list',
              items: [
                'Test ({{nTest}} Bilder): Dice {{dice}}, IoU {{iou}}, Pixelgenauigkeit {{acc}}.',
                'Überall Hintergrund vorhersagen: Genauigkeit ≈ {{trivialAcc}}, Dice 0 auf jedem Bild mit einem Objekt. Pixelgenauigkeit ist keine Segmentierungsmetrik.',
                'Fehlschläge: kleiner oder mehrdeutiger Vordergrund; auffällige Objekte außerhalb der 80 COCO-Kategorien, die in der Ground Truth als Hintergrund zählen.',
                'Grenzen: Eingabe {{input}} × {{input}}, in der dünne Strukturen verschwinden; eine einzige binäre Klasse; keine Test-Time-Augmentierung.',
                'Referenz: O. Ronneberger, P. Fischer, T. Brox, U-Net: Convolutional Networks for Biomedical Image Segmentation, MICCAI 2015.',
              ],
            },
          ],
        },
      ],
    },
  },
};

/** Un nombre à décimales fixes, avec le séparateur de la langue. */
const fixed = (x: number, digits: number) => (locale: Locale) =>
  x.toFixed(digits).replace('.', locale === 'en' ? '.' : ',');

/** Une liste de valeurs séparées par des virgules, avec la conjonction de la langue. */
const joined = (values: string[]) => (locale: Locale) => list(values, locale);

/**
 * Les chiffres de la note U-Net : l'architecture recalculée par
 * `src/lib/unet.ts`, et les résultats mesurés du projet. Chaque affirmation
 * du texte qui en dépend est vérifiée ici.
 */
const unetFacts = (): Record<string, Fact> => {
  const { input, width, depth } = unetLib.config;
  const all = unetLib.stages();
  const enc = all.filter((s) => s.side === 'enc');
  const mid = all.find((s) => s.side === 'mid')!;
  const P = unetLib.totalParams();
  const P64 = unetLib.totalParams(64);
  const M = unetLib.totalMacs();
  const deep = all.filter((s) => s.side === 'mid' || (s.side === 'dec' && s.level === depth - 1));
  const deepShare = (100 * deep.reduce((n, s) => n + s.params, 0)) / P;
  const share = (s: unetLib.Stage) => (100 * s.macs) / M;
  const encLevels = enc.slice(1).map(share);
  const decLevels = all.filter((s) => s.side === 'dec').map(share);
  const rf = unetLib.stageReceptive();
  const convs = unetLib.receptiveField().filter((e) => e.layer.includes('conv')).length;
  const r = unetLib.results;
  const f = unetLib.diceOfIou(r.iou);

  claim(Math.round(P / 1e4) === 776, 'le réseau compte 7,76 M de paramètres, comme dans le projet');
  claim(Math.round(P64 / 1e6) === 31, 'à largeur 64, le réseau de l’article compte 31 M de paramètres');
  claim(deepShare > 50, 'le goulot et l’étage de décodeur le plus profond portent la majorité des paramètres');
  claim(Math.max(...encLevels) - Math.min(...encLevels) < 0.5, 'chaque niveau d’encodeur (hors le premier) coûte autant');
  claim(Math.max(...decLevels) - Math.min(...decLevels) < 0.5, 'chaque niveau de décodeur coûte autant');
  claim(rf.at(-1)!.r >= input, 'chaque unité du goulot voit toute l’image');
  claim(f >= r.dice, 'la moyenne des Dice ne dépasse pas f(moyenne des IoU) — Jensen');
  claim(r.accuracy > 1 - r.foreground, 'le modèle fait mieux que « tout est du fond »');
  claim(r.split.train + r.split.val + r.split.test === 4952, 'les trois jeux font les 4 952 images annotées de val2017');

  return {
    input,
    width,
    fg: Math.round(r.foreground * 100),
    nImages: r.split.train + r.split.val + r.split.test,
    nTrain: r.split.train,
    nVal: r.split.val,
    nTest: r.split.test,
    encChannels: joined(enc.map((s) => String(s.channels))),
    encSides: joined(enc.map((s) => `${s.size}²`)),
    midChannels: mid.channels,
    midSide: mid.size,
    params: P,
    params64: P64,
    paramsRatio: fixed(P64 / P, 1),
    gmac: fixed(M / 1e9, 2),
    deepShare: Math.round(deepShare),
    encLevel: fixed(encLevels[0], 1),
    decLevel: fixed(decLevels[0], 1),
    rf1: rf[0].r,
    rf2: rf[1].r,
    rf3: rf[2].r,
    rf4: rf[3].r,
    rfB: rf.at(-1)!.r,
    convs,
    rfNoPool: 1 + 2 * convs,
    cellSide: 2 ** depth,
    dice: fixed(r.dice, 3),
    iou: fixed(r.iou, 3),
    acc: fixed(r.accuracy, 3),
    diceOfIou: fixed(f, 3),
    trivialAcc: fixed(1 - r.foreground, 2),
  };
};

/* ── Cel shading, bande par bande ──────────────────────────────────── */

/*
 * Un cours sur le cel shading en général, à partir de ToonGL (`pogl/`), avec
 * un aparté sur les god rays. En listes et en formules, comme les notes U-Net.
 * Les extraits sont ceux du dépôt, ligne citée ; les chiffres viennent de
 * `src/lib/toon.ts`, qui reproduit la rampe, le rim, les contours et la passe
 * de god rays du projet, et sont vérifiés ici.
 */
const cel: NoteDef = {
  slug: 'cel-shading',
  tone: 'cyan',
  category: 'rendering',
  project: 'toongl',
  facts: () => toonFacts(),

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      kicker: 'rendering · stylisation',
      title: 'Cel shading,',
      titleAccent: 'band by band',
      description:
        'Course notes on cel shading, from the ToonGL renderer: quantized lighting through a ramp texture, rim, screen-space outlines from depth and normals, the order of the passes — and an aside on god rays. Figures computed with the project’s own formulas.',
      sections: [
        {
          id: 'what',
          kicker: '01',
          title: 'What cel shading is',
          blocks: [
            {
              type: 'list',
              items: [
                'Goal: the look of cel animation, painted on celluloid — flat colour areas, a hard boundary between light and shadow, ink lines.',
                'Three ingredients: quantized diffuse lighting; outlines; optionally a stylized highlight or rim.',
                'In ToonGL: the ramp and the rim in each object’s fragment shader; outlines and god rays in one post-process pass over an offscreen HDR framebuffer.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'toonSphere',
              caption:
                'One sphere, the project’s formulas: continuous Lambert; the 4-band ramp, read without filtering; then the rim, which darkens the silhouette.',
            },
          ],
        },
        {
          id: 'bands',
          kicker: '02',
          title: 'From Lambert to bands',
          blocks: [
            {
              type: 'text',
              content:
                'Lambert: I = albedo · max(N·L, 0). Cel shading keeps N·L but passes it through a step function: I = albedo · f(N·L).',
            },
            {
              type: 'list',
              items: [
                'f in the shader: floor(N·L · n) / (n − 1) — n equal bands, no artist control.',
                'f in a 1D ramp texture indexed by N·L — ToonGL’s choice: bands of any width and colour, changed without recompiling.',
                'f with a smoothstep around each threshold, one pixel wide (fwidth(N·L)): antialiased band edges.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonRampBuild',
              caption:
                'The ramp: 256 texels, levels bands. The floor min_shade keeps the darkest band above black — 0.2 for bark, 0.4 for foliage and grass.',
            },
            {
              type: 'diagram',
              diagram: 'toonRamp',
              caption:
                'Computed with the same function, read as the GPU reads it. Thresholds at N·L = {{t1}}, {{t2}} and {{t3}}.',
            },
            {
              type: 'list',
              items: [
                'Bark: {{barkBands}}. Foliage and grass: {{foliageBands}}.',
                'GL_NEAREST on the ramp: a band boundary is a hard step. With GL_LINEAR, the GPU would blend two texels and soften every edge.',
                'GL_CLAMP_TO_EDGE: N·L = 1 reads the last texel instead of wrapping round to the first.',
                'The ramp is uniform and grey: generate_toon_ramp receives the bark texture but does not use it. Colour comes from the albedo that multiplies the ramp.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonShade',
              caption:
                'The whole object shader: N·L indexes the ramp, the albedo and the sun colour multiply it, the rim darkens the edge.',
            },
          ],
        },
        {
          id: 'rim',
          kicker: '03',
          title: 'Rim',
          blocks: [
            {
              type: 'text',
              content:
                'rim = 1 − N·V: 0 facing the camera, 1 at the silhouette. smoothstep({{rimLowC}}, {{rimHighC}}, rim) turns it into a dark border where the surface turns away.',
            },
            {
              type: 'diagram',
              diagram: 'toonRim',
              caption: 'Zero up to θ = {{rimA0}}°, full from θ = {{rimA1}}° — where 1 − cos θ reaches {{rimLow}} and {{rimHigh}}.',
            },
            {
              type: 'list',
              items: [
                'Cost: one dot product and one smoothstep per fragment, no extra pass.',
                'Limit: the width follows the curvature. On a flat face N·V is constant — all or nothing. A real outline pass is still needed.',
              ],
            },
          ],
        },
        {
          id: 'outlines',
          kicker: '04',
          title: 'Outlines',
          blocks: [
            {
              type: 'list',
              items: [
                'Inverted hull: redraw each mesh inflated along its normals, back faces only, in ink. Thickness in object space; one extra draw per object.',
                'Rim, above: free, but tied to curvature.',
                'Edge detection in screen space, on depth and normals — ToonGL’s choice: one pass for the whole image, whatever the meshes.',
              ],
            },
            {
              type: 'text',
              content:
                'Depth edge: e = Σ |lin(q) − lin(c)| / lin(c) over the 4 neighbours q. Normal edge: e = Σ (1 − n_c·n_q). Outline = max(smoothstep({{edgeLowC}}, {{edgeHighC}}, e_depth), smoothstep({{normalLowC}}, {{normalHighC}}, e_normal)).',
            },
            {
              type: 'code',
              snippet: 'toonDepthEdges',
              caption:
                'Depth is linearized first — the depth buffer stores a hyperbolic value. Dividing by the centre depth keeps the threshold valid at any distance.',
            },
            {
              type: 'code',
              snippet: 'toonNormalEdges',
              caption:
                'Normals rebuilt from depth: on each axis, the one-sided difference with the smaller depth change, so a neighbour across a silhouette does not bend the normal.',
            },
            {
              type: 'diagram',
              diagram: 'toonEdges',
              caption:
                'The shader’s thresholds, on a scene ray-cast at build time. Depth finds the cube against the wall; normals find the floor–wall line and the cube’s front edge — at half ink ({{creaseRaw}} before the threshold): there, the smaller one-sided difference crosses the edge.',
            },
            {
              type: 'list',
              items: [
                'Depth alone misses creases within one surface; normals alone miss a silhouette in front of a parallel surface. max() keeps both.',
                'Thickness: outline_thickness scales the neighbour offset — one pixel by default.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonOutlineMix',
              caption:
                'The ink colour is raised to the gamma, so it is still the chosen colour after the final pow(1/γ).',
            },
          ],
        },
        {
          id: 'passes',
          kicker: '05',
          title: 'Order of the passes',
          blocks: [
            {
              type: 'list',
              items: [
                'Scene passes into an offscreen framebuffer: RGB16F colour and depth. RGB16F because god rays need values above 1.',
                'Post pass: outlines → god rays → warm/cool grading → vignette → gamma.',
                'Outlines before rays: the ink stays crisp, the light passes over it.',
                'Ground: no shadow map. Wrapped diffuse, (N·L + w) / (1 + w) with w = 0.5, softens the terminator instead of casting shadows.',
              ],
            },
          ],
        },
        {
          id: 'god-rays',
          kicker: '06',
          title: 'Aside: god rays',
          blocks: [
            {
              type: 'list',
              items: [
                'Crepuscular rays: sunlight scattered towards the eye by particles in the air, interrupted by occluders. The shafts are lit air between shadows.',
                'Volumetric methods march in 3D through a shadow map. The screen-space version (Mitchell, 2007) only has the image: it blurs bright pixels radially towards the sun.',
                'Per pixel: {{samples}} samples towards the sun’s projection, over {{densityPct}} % of the distance. Each adds s · max(0, max(s) − 1) · weight · decayⁱ; the sum is multiplied by the exposure.',
              ],
            },
            {
              type: 'code',
              snippet: 'godRaysPass',
              caption:
                'sclip.w > 0: the sun is in front of the camera. Only the part of a sample above 1 counts — hence the HDR framebuffer.',
            },
            {
              type: 'diagram',
              diagram: 'godRaysImage',
              caption:
                'The project’s pass on an 80 × 50 sunset. The dots: one ground pixel’s march, every tenth sample. Only the white area — above 1 — gives light. It spreads as a halo towards the ground, darker behind the trunks that cut the sun: at this size the shafts stay faint.',
            },
            {
              type: 'diagram',
              diagram: 'godRaysDecay',
              caption:
                'weight · decayⁱ. At {{decay}}, the last sample weighs {{lastWeight}} of the first, and the march is worth {{effective}} full samples — {{eff90}} at 0.9, {{eff99}} at 0.99.',
            },
            {
              type: 'list',
              items: [
                'An occluder does not stop the march: it is one dark sample among others. A small, unbroken bright area gives a round halo, not shafts.',
                'Cost: {{samples}} texture reads per pixel, {{reads1080}} per 1080p frame. The usual fix: half resolution, then upsample.',
                'Sun behind the camera: nothing (the sclip.w guard). Sun off screen: the samples clamp at the border.',
                'Reference: K. Mitchell, “Volumetric Light Scattering as a Post-Process”, GPU Gems 3, ch. 13, 2007.',
              ],
            },
          ],
        },
        {
          id: 'further',
          kicker: '07',
          title: 'Going further',
          blocks: [
            {
              type: 'list',
              items: [
                'Hard specular: step(threshold, N·H) — a flat highlight instead of a lobe.',
                'Banded shadows: quantize a shadow map too, so cast shadows keep the flat look.',
                'Antialiased bands: smoothstep over fwidth(N·L) at each threshold.',
                'Hatching instead of flat tones: tonal art maps (Praun et al., 2001).',
                'A ramp per material, picked from the texture: the argument generate_toon_ramp already receives.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      kicker: 'rendu · stylisation',
      title: 'Cel shading,',
      titleAccent: 'bande par bande',
      description:
        'Notes de cours sur le cel shading, à partir du moteur ToonGL : éclairage quantifié par une texture-rampe, rim, contours en espace écran depuis la profondeur et les normales, ordre des passes — et un aparté sur les god rays. Figures calculées avec les formules du projet.',
      sections: [
        {
          id: 'what',
          kicker: '01',
          title: 'Ce qu’est le cel shading',
          blocks: [
            {
              type: 'list',
              items: [
                'But : l’aspect de l’animation sur cellulo — des aplats, une frontière nette entre lumière et ombre, des traits d’encre.',
                'Trois ingrédients : un éclairage diffus quantifié ; des contours ; au choix un reflet ou un bord stylisés.',
                'Dans ToonGL : la rampe et le rim dans le fragment shader de chaque objet ; contours et god rays dans une seule passe de post-traitement, sur un framebuffer HDR hors écran.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'toonSphere',
              caption:
                'Une sphère, les formules du projet : Lambert continu ; la rampe à 4 bandes, lue sans filtrage ; puis le rim, qui assombrit la silhouette.',
            },
          ],
        },
        {
          id: 'bands',
          kicker: '02',
          title: 'De Lambert aux bandes',
          blocks: [
            {
              type: 'text',
              content:
                'Lambert : I = albédo · max(N·L, 0). Le cel shading garde N·L mais le fait passer par une fonction en escalier : I = albédo · f(N·L).',
            },
            {
              type: 'list',
              items: [
                'f dans le shader : floor(N·L · n) / (n − 1) — n bandes égales, aucun contrôle artistique.',
                'f dans une texture-rampe 1D indexée par N·L — le choix de ToonGL : des bandes de largeur et de couleur libres, modifiables sans recompiler.',
                'f avec un smoothstep autour de chaque seuil, large d’un pixel (fwidth(N·L)) : des bords de bande anticrénelés.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonRampBuild',
              caption:
                'La rampe : 256 texels, levels bandes. Le plancher min_shade garde la bande la plus sombre au-dessus du noir — 0,2 pour l’écorce, 0,4 pour le feuillage et l’herbe.',
            },
            {
              type: 'diagram',
              diagram: 'toonRamp',
              caption:
                'Calculée par la même fonction, lue comme la lit le GPU. Seuils en N·L = {{t1}}, {{t2}} et {{t3}}.',
            },
            {
              type: 'list',
              items: [
                'Écorce : {{barkBands}}. Feuillage et herbe : {{foliageBands}}.',
                'GL_NEAREST sur la rampe : une frontière de bande est une marche franche. Avec GL_LINEAR, le GPU mélangerait deux texels et adoucirait chaque bord.',
                'GL_CLAMP_TO_EDGE : N·L = 1 lit le dernier texel au lieu de reboucler sur le premier.',
                'La rampe est uniforme et grise : generate_toon_ramp reçoit la texture d’écorce mais ne s’en sert pas. La couleur vient de l’albédo qui multiplie la rampe.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonShade',
              caption:
                'Tout le shader d’objet : N·L indexe la rampe, l’albédo et la couleur du soleil la multiplient, le rim assombrit le bord.',
            },
          ],
        },
        {
          id: 'rim',
          kicker: '03',
          title: 'Le rim',
          blocks: [
            {
              type: 'text',
              content:
                'rim = 1 − N·V : 0 face à la caméra, 1 sur la silhouette. smoothstep({{rimLowC}}, {{rimHighC}}, rim) en fait un bord sombre là où la surface se détourne.',
            },
            {
              type: 'diagram',
              diagram: 'toonRim',
              caption: 'Nul jusqu’à θ = {{rimA0}}°, plein à partir de θ = {{rimA1}}° — là où 1 − cos θ atteint {{rimLow}} et {{rimHigh}}.',
            },
            {
              type: 'list',
              items: [
                'Coût : un produit scalaire et un smoothstep par fragment, aucune passe de plus.',
                'Limite : la largeur suit la courbure. Sur une face plane, N·V est constant — tout ou rien. Une vraie passe de contours reste nécessaire.',
              ],
            },
          ],
        },
        {
          id: 'outlines',
          kicker: '04',
          title: 'Les contours',
          blocks: [
            {
              type: 'list',
              items: [
                'Coque inversée : redessiner chaque maillage gonflé le long de ses normales, faces arrière seulement, à l’encre. Épaisseur en espace objet ; un tracé de plus par objet.',
                'Le rim, ci-dessus : gratuit, mais lié à la courbure.',
                'Détection de bords en espace écran, sur la profondeur et les normales — le choix de ToonGL : une passe pour toute l’image, quels que soient les maillages.',
              ],
            },
            {
              type: 'text',
              content:
                'Bord de profondeur : e = Σ |lin(q) − lin(c)| / lin(c) sur les 4 voisins q. Bord de normales : e = Σ (1 − n_c·n_q). Contour = max(smoothstep({{edgeLowC}}, {{edgeHighC}}, e_prof), smoothstep({{normalLowC}}, {{normalHighC}}, e_norm)).',
            },
            {
              type: 'code',
              snippet: 'toonDepthEdges',
              caption:
                'La profondeur est d’abord linéarisée — le tampon de profondeur stocke une valeur hyperbolique. Diviser par la profondeur du centre garde le seuil valable à toute distance.',
            },
            {
              type: 'code',
              snippet: 'toonNormalEdges',
              caption:
                'Normales reconstruites depuis la profondeur : sur chaque axe, la différence d’un seul côté dont l’écart de profondeur est le plus faible, pour qu’un voisin de l’autre côté d’une silhouette ne torde pas la normale.',
            },
            {
              type: 'diagram',
              diagram: 'toonEdges',
              caption:
                'Les seuils du shader, sur une scène lancée en rayons à la compilation. La profondeur trouve le cube devant le mur ; les normales trouvent la ligne sol–mur et l’arête avant du cube — à demi-encre ({{creaseRaw}} avant le seuil) : là, la plus faible des deux différences traverse l’arête.',
            },
            {
              type: 'list',
              items: [
                'La profondeur seule manque les plis d’une même surface ; les normales seules manquent une silhouette devant une surface parallèle. max() garde les deux.',
                'Épaisseur : outline_thickness multiplie le décalage des voisins — un pixel par défaut.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonOutlineMix',
              caption:
                'La couleur d’encre est élevée au gamma, pour être encore la couleur choisie après le pow(1/γ) final.',
            },
          ],
        },
        {
          id: 'passes',
          kicker: '05',
          title: 'L’ordre des passes',
          blocks: [
            {
              type: 'list',
              items: [
                'Passes de scène dans un framebuffer hors écran : couleur RGB16F et profondeur. RGB16F parce que les god rays ont besoin de valeurs au-dessus de 1.',
                'Passe de post-traitement : contours → god rays → étalonnage chaud/froid → vignette → gamma.',
                'Les contours avant les rayons : l’encre reste nette, la lumière passe par-dessus.',
                'Le sol : pas de shadow map. Un diffus enveloppé, (N·L + w) / (1 + w) avec w = 0,5, adoucit la limite d’ombre au lieu de projeter des ombres.',
              ],
            },
          ],
        },
        {
          id: 'god-rays',
          kicker: '06',
          title: 'Aparté : les god rays',
          blocks: [
            {
              type: 'list',
              items: [
                'Rayons crépusculaires : la lumière du soleil diffusée vers l’œil par les particules de l’air, interrompue par les obstacles. Les faisceaux sont de l’air éclairé entre deux ombres.',
                'Les méthodes volumétriques marchent en 3D à travers une shadow map. La version en espace écran (Mitchell, 2007) n’a que l’image : elle floute radialement les pixels lumineux vers le soleil.',
                'Par pixel : {{samples}} échantillons vers la projection du soleil, sur {{densityPct}} % de la distance. Chacun ajoute s · max(0, max(s) − 1) · weight · decayⁱ ; la somme est multipliée par l’exposition.',
              ],
            },
            {
              type: 'code',
              snippet: 'godRaysPass',
              caption:
                'sclip.w > 0 : le soleil est devant la caméra. Seule la part d’un échantillon au-dessus de 1 compte — d’où le framebuffer HDR.',
            },
            {
              type: 'diagram',
              diagram: 'godRaysImage',
              caption:
                'La passe du projet sur un couchant de 80 × 50. Les points : la marche d’un pixel du sol, un échantillon sur dix. Seule la zone blanche — au-dessus de 1 — éclaire. Elle s’étale en halo vers le sol, plus sombre derrière les troncs qui coupent le soleil : à cette taille, les faisceaux restent discrets.',
            },
            {
              type: 'diagram',
              diagram: 'godRaysDecay',
              caption:
                'weight · decayⁱ. À {{decay}}, le dernier échantillon pèse {{lastWeight}} du premier, et la marche vaut {{effective}} échantillons pleins — {{eff90}} à 0,9, {{eff99}} à 0,99.',
            },
            {
              type: 'list',
              items: [
                'Un obstacle n’arrête pas la marche : c’est un échantillon sombre parmi d’autres. Une zone lumineuse petite et d’un seul tenant donne un halo rond, pas des faisceaux.',
                'Coût : {{samples}} lectures de texture par pixel, {{reads1080}} par image 1080p. La parade habituelle : demi-résolution, puis suréchantillonnage.',
                'Soleil derrière la caméra : rien (la garde sur sclip.w). Soleil hors écran : les échantillons se bloquent au bord.',
                'Référence : K. Mitchell, « Volumetric Light Scattering as a Post-Process », GPU Gems 3, chap. 13, 2007.',
              ],
            },
          ],
        },
        {
          id: 'further',
          kicker: '07',
          title: 'Pour aller plus loin',
          blocks: [
            {
              type: 'list',
              items: [
                'Spéculaire franc : step(seuil, N·H) — un reflet en aplat au lieu d’un lobe.',
                'Ombres en bandes : quantifier aussi une shadow map, pour que les ombres portées gardent l’aspect en aplats.',
                'Bandes anticrénelées : un smoothstep sur fwidth(N·L) à chaque seuil.',
                'Des hachures au lieu des aplats : les tonal art maps (Praun et al., 2001).',
                'Une rampe par matériau, tirée de la texture : l’argument que generate_toon_ramp reçoit déjà.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      kicker: 'Rendering · Stilisierung',
      title: 'Cel Shading,',
      titleAccent: 'Band für Band',
      description:
        'Kursnotizen zum Cel Shading, ausgehend vom Renderer ToonGL: über eine Rampentextur quantisierte Beleuchtung, Rim, Konturen im Bildraum aus Tiefe und Normalen, die Reihenfolge der Passes — und ein Exkurs zu God Rays. Abbildungen mit den Formeln des Projekts berechnet.',
      sections: [
        {
          id: 'what',
          kicker: '01',
          title: 'Was Cel Shading ist',
          blocks: [
            {
              type: 'list',
              items: [
                'Ziel: der Look des Zeichentrickfilms auf Folie — Farbflächen, eine harte Grenze zwischen Licht und Schatten, Tuschelinien.',
                'Drei Zutaten: quantisierte diffuse Beleuchtung; Konturen; wahlweise ein stilisiertes Glanzlicht oder ein Rand.',
                'In ToonGL: Rampe und Rim im Fragment-Shader jedes Objekts; Konturen und God Rays in einem einzigen Post-Processing-Pass über einem HDR-Framebuffer außerhalb des Bildschirms.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'toonSphere',
              caption:
                'Eine Kugel, die Formeln des Projekts: stetiger Lambert; die Rampe mit 4 Bändern, ungefiltert gelesen; dann der Rim, der die Silhouette abdunkelt.',
            },
          ],
        },
        {
          id: 'bands',
          kicker: '02',
          title: 'Von Lambert zu Bändern',
          blocks: [
            {
              type: 'text',
              content:
                'Lambert: I = Albedo · max(N·L, 0). Cel Shading behält N·L, schickt es aber durch eine Treppenfunktion: I = Albedo · f(N·L).',
            },
            {
              type: 'list',
              items: [
                'f im Shader: floor(N·L · n) / (n − 1) — n gleiche Bänder, keine künstlerische Kontrolle.',
                'f in einer 1D-Rampentextur, indiziert mit N·L — die Wahl von ToonGL: Bänder beliebiger Breite und Farbe, ohne Neukompilieren änderbar.',
                'f mit einem smoothstep um jede Schwelle, ein Pixel breit (fwidth(N·L)): geglättete Bandkanten.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonRampBuild',
              caption:
                'Die Rampe: 256 Texel, levels Bänder. Der Boden min_shade hält das dunkelste Band über Schwarz — 0,2 für Rinde, 0,4 für Laub und Gras.',
            },
            {
              type: 'diagram',
              diagram: 'toonRamp',
              caption:
                'Mit derselben Funktion berechnet, so gelesen, wie die GPU sie liest. Schwellen bei N·L = {{t1}}, {{t2}} und {{t3}}.',
            },
            {
              type: 'list',
              items: [
                'Rinde: {{barkBands}}. Laub und Gras: {{foliageBands}}.',
                'GL_NEAREST auf der Rampe: Eine Bandgrenze ist eine harte Stufe. Mit GL_LINEAR würde die GPU zwei Texel mischen und jede Kante weicher machen.',
                'GL_CLAMP_TO_EDGE: N·L = 1 liest das letzte Texel, statt auf das erste umzubrechen.',
                'Die Rampe ist gleichmäßig und grau: generate_toon_ramp erhält die Rinden-Textur, verwendet sie aber nicht. Die Farbe kommt von der Albedo, die die Rampe multipliziert.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonShade',
              caption:
                'Der ganze Objekt-Shader: N·L indiziert die Rampe, Albedo und Sonnenfarbe multiplizieren sie, der Rim dunkelt den Rand ab.',
            },
          ],
        },
        {
          id: 'rim',
          kicker: '03',
          title: 'Rim',
          blocks: [
            {
              type: 'text',
              content:
                'rim = 1 − N·V: 0 zur Kamera hin, 1 an der Silhouette. smoothstep({{rimLowC}}, {{rimHighC}}, rim) macht daraus einen dunklen Rand, wo sich die Fläche abwendet.',
            },
            {
              type: 'diagram',
              diagram: 'toonRim',
              caption: 'Null bis θ = {{rimA0}}°, voll ab θ = {{rimA1}}° — dort, wo 1 − cos θ {{rimLow}} und {{rimHigh}} erreicht.',
            },
            {
              type: 'list',
              items: [
                'Kosten: ein Skalarprodukt und ein smoothstep pro Fragment, kein zusätzlicher Pass.',
                'Grenze: Die Breite folgt der Krümmung. Auf einer ebenen Fläche ist N·V konstant — alles oder nichts. Ein echter Kontur-Pass bleibt nötig.',
              ],
            },
          ],
        },
        {
          id: 'outlines',
          kicker: '04',
          title: 'Konturen',
          blocks: [
            {
              type: 'list',
              items: [
                'Inverted Hull: jedes Mesh entlang seiner Normalen aufgebläht erneut zeichnen, nur Rückseiten, in Tusche. Dicke im Objektraum; ein zusätzlicher Draw pro Objekt.',
                'Der Rim, oben: kostenlos, aber an die Krümmung gebunden.',
                'Kantenerkennung im Bildraum, auf Tiefe und Normalen — die Wahl von ToonGL: ein Pass für das ganze Bild, unabhängig von den Meshes.',
              ],
            },
            {
              type: 'text',
              content:
                'Tiefenkante: e = Σ |lin(q) − lin(c)| / lin(c) über die 4 Nachbarn q. Normalenkante: e = Σ (1 − n_c·n_q). Kontur = max(smoothstep({{edgeLowC}}, {{edgeHighC}}, e_Tiefe), smoothstep({{normalLowC}}, {{normalHighC}}, e_Normale)).',
            },
            {
              type: 'code',
              snippet: 'toonDepthEdges',
              caption:
                'Die Tiefe wird zuerst linearisiert — der Tiefenpuffer speichert einen hyperbolischen Wert. Die Division durch die Tiefe im Zentrum hält die Schwelle in jeder Entfernung gültig.',
            },
            {
              type: 'code',
              snippet: 'toonNormalEdges',
              caption:
                'Normalen aus der Tiefe rekonstruiert: auf jeder Achse die einseitige Differenz mit der kleineren Tiefenänderung, damit ein Nachbar jenseits einer Silhouette die Normale nicht verbiegt.',
            },
            {
              type: 'diagram',
              diagram: 'toonEdges',
              caption:
                'Die Schwellen des Shaders, auf einer beim Bauen per Raycasting erzeugten Szene. Die Tiefe findet den Würfel vor der Wand; die Normalen finden die Linie Boden–Wand und die vordere Würfelkante — mit halber Tusche ({{creaseRaw}} vor der Schwelle): Dort überquert die kleinere einseitige Differenz die Kante.',
            },
            {
              type: 'list',
              items: [
                'Die Tiefe allein übersieht Falten innerhalb einer Fläche; die Normalen allein übersehen eine Silhouette vor einer parallelen Fläche. max() behält beide.',
                'Dicke: outline_thickness skaliert den Versatz der Nachbarn — standardmäßig ein Pixel.',
              ],
            },
            {
              type: 'code',
              snippet: 'toonOutlineMix',
              caption:
                'Die Tuschefarbe wird mit dem Gamma potenziert, damit sie nach dem abschließenden pow(1/γ) noch die gewählte Farbe ist.',
            },
          ],
        },
        {
          id: 'passes',
          kicker: '05',
          title: 'Die Reihenfolge der Passes',
          blocks: [
            {
              type: 'list',
              items: [
                'Szenen-Passes in einen Framebuffer außerhalb des Bildschirms: Farbe RGB16F und Tiefe. RGB16F, weil God Rays Werte über 1 brauchen.',
                'Post-Pass: Konturen → God Rays → warm/kalt-Grading → Vignette → Gamma.',
                'Konturen vor den Strahlen: Die Tusche bleibt scharf, das Licht legt sich darüber.',
                'Boden: keine Shadow Map. Ein Wrapped Diffuse, (N·L + w) / (1 + w) mit w = 0,5, macht die Schattengrenze weicher, statt Schatten zu werfen.',
              ],
            },
          ],
        },
        {
          id: 'god-rays',
          kicker: '06',
          title: 'Exkurs: God Rays',
          blocks: [
            {
              type: 'list',
              items: [
                'Dämmerungsstrahlen: Sonnenlicht, das von Teilchen in der Luft zum Auge gestreut und von Hindernissen unterbrochen wird. Die Strahlen sind beleuchtete Luft zwischen Schatten.',
                'Volumetrische Verfahren marschieren in 3D durch eine Shadow Map. Die Bildraum-Variante (Mitchell, 2007) hat nur das Bild: Sie verwischt helle Pixel radial zur Sonne hin.',
                'Pro Pixel: {{samples}} Samples zur Projektion der Sonne, über {{densityPct}} % der Strecke. Jedes addiert s · max(0, max(s) − 1) · weight · decayⁱ; die Summe wird mit der Belichtung multipliziert.',
              ],
            },
            {
              type: 'code',
              snippet: 'godRaysPass',
              caption:
                'sclip.w > 0: Die Sonne liegt vor der Kamera. Nur der Anteil eines Samples über 1 zählt — daher der HDR-Framebuffer.',
            },
            {
              type: 'diagram',
              diagram: 'godRaysImage',
              caption:
                'Der Pass des Projekts auf einem Sonnenuntergang von 80 × 50. Die Punkte: der Weg eines Bodenpixels, jedes zehnte Sample. Nur die weiße Fläche — über 1 — spendet Licht. Sie breitet sich als Halo zum Boden aus, dunkler hinter den Stämmen, die die Sonne schneiden: in dieser Größe bleiben die Strahlen schwach.',
            },
            {
              type: 'diagram',
              diagram: 'godRaysDecay',
              caption:
                'weight · decayⁱ. Bei {{decay}} wiegt das letzte Sample {{lastWeight}} des ersten, und der Marsch ist {{effective}} volle Samples wert — {{eff90}} bei 0,9, {{eff99}} bei 0,99.',
            },
            {
              type: 'list',
              items: [
                'Ein Hindernis stoppt den Marsch nicht: Es ist ein dunkles Sample unter anderen. Eine kleine, zusammenhängende helle Fläche ergibt einen runden Halo, keine Strahlen.',
                'Kosten: {{samples}} Texturzugriffe pro Pixel, {{reads1080}} pro 1080p-Bild. Die übliche Abhilfe: halbe Auflösung, dann hochskalieren.',
                'Sonne hinter der Kamera: nichts (die Prüfung auf sclip.w). Sonne außerhalb des Bildes: Die Samples klemmen am Rand.',
                'Referenz: K. Mitchell, „Volumetric Light Scattering as a Post-Process“, GPU Gems 3, Kap. 13, 2007.',
              ],
            },
          ],
        },
        {
          id: 'further',
          kicker: '07',
          title: 'Weiterführend',
          blocks: [
            {
              type: 'list',
              items: [
                'Harter Glanz: step(Schwelle, N·H) — ein flaches Glanzlicht statt einer Keule.',
                'Schatten in Bändern: auch eine Shadow Map quantisieren, damit Schlagschatten den Flächenlook behalten.',
                'Geglättete Bänder: ein smoothstep über fwidth(N·L) an jeder Schwelle.',
                'Schraffur statt Farbflächen: Tonal Art Maps (Praun et al., 2001).',
                'Eine Rampe pro Material, aus der Textur gewonnen: das Argument, das generate_toon_ramp bereits erhält.',
              ],
            },
          ],
        },
      ],
    },
  },
};

/**
 * Les chiffres du cours de cel shading, recalculés par `src/lib/toon.ts` avec
 * les constantes du projet. Chaque affirmation du texte qui en dépend est
 * vérifiée ici.
 */
/* ── Du triangle au pixel ──────────────────────────────────────────── */

const raster: NoteDef = {
  slug: 'rasterization',
  tone: 'green',
  category: 'rendering',
  project: 'toongl',
  facts: () => rasterFacts(),

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      kicker: 'rendering · GPU pipeline',
      title: 'From triangle',
      titleAccent: 'to pixel',
      description:
        'Revision notes on rasterization and the OpenGL pipeline, from vertex to pixel: coordinate spaces, clipping, edge functions, perspective-correct interpolation, depth, per-fragment tests — and the interview questions that go with them. Figures recomputed with the POGL camera.',
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'The whole chain in one figure',
          blocks: [
            {
              type: 'list',
              items: [
                'Input: vertices (attributes stored in VBOs, described by a VAO) and a primitive type — glDrawArrays(GL_TRIANGLES, …), or glDrawElements with an index buffer.',
                'Two mandatory programmable stages: the vertex shader, one invocation per vertex; the fragment shader, one per fragment. Tessellation and geometry shaders, optional, sit in between.',
                'Everything else is fixed function: you do not program it, you set state — glViewport, glCullFace, glDepthFunc, glBlendFunc, glEnable.',
                'Output: values in the framebuffer (colour, depth, stencil), on screen or in a texture through an FBO.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterPipeline',
              caption:
                'The ten stages of a draw call. First row: vertices. Second: pixels. Rasterization is the hinge between them.',
            },
          ],
        },
        {
          id: 'spaces',
          kicker: '02',
          title: 'From vertex to clip space',
          blocks: [
            {
              type: 'list',
              items: [
                'Object → world: the model matrix M. World → view: the view matrix V (a lookAt). View → clip: the projection P.',
                'The vertex shader must write gl_Position in clip coordinates: a homogeneous vec4 (x, y, z, w). The divide by w has not happened yet.',
                'OpenGL view space: the camera looks down −z. The projection puts −z_view into w: w_clip is the distance in front of the camera.',
              ],
            },
            {
              type: 'code',
              snippet: 'glVertexShader',
              caption:
                'The POGL vertex shader: attributes arrive through layout(location), and gl_Position = P · MV · position.',
            },
            {
              type: 'list',
              items: [
                'Normals do not transform like points: the right matrix is the inverse transpose, ((MV)⁻¹)ᵀ — the “normal matrix”.',
                'mat3(model_view_matrix), as above, is only right (up to length) with rotations, translations and uniform scales. A non-uniform scale tilts the normals.',
              ],
            },
            {
              type: 'code',
              snippet: 'glFrustum',
              caption:
                'The POGL projection, in glFrustum form. Last row: w = −z_view. Third: z_clip = k · z_view + l. POGL calls it with near = {{near}}, far = {{far}} and top = 1: a {{vfov}}° vertical field of view.',
            },
            {
              type: 'list',
              items: [
                'After the divide: z_ndc = (f + n)/(f − n) − 2fn / ((f − n) · d), d the distance. Near gives −1, far gives +1.',
                'A hyperbola in d, not a line: all of section 06 follows from it.',
              ],
            },
          ],
        },
        {
          id: 'clip',
          kicker: '03',
          title: 'Assembly, clipping, divide, viewport',
          blocks: [
            {
              type: 'list',
              items: [
                'Assembly: transformed vertices are grouped into primitives — three per triangle with GL_TRIANGLES, one more per triangle with GL_TRIANGLE_STRIP. A post-transform cache avoids re-running the vertex shader on an index already seen.',
                'Clipping, in clip coordinates: visible means −w ≤ x ≤ w, −w ≤ y ≤ w and −w ≤ z ≤ w. A triangle crossing the volume is cut into a polygon, then re-triangulated.',
                'Why before the divide: behind the camera, w ≤ 0. Dividing first would flip the signs and send the point to the other side of the screen. The near plane is what cuts those triangles.',
                'In practice GPUs only truly clip against near and far: for x and y, a “guard band” lets the rasterizer ignore whatever overflows the screen.',
                'Perspective divide: NDC = (x/w, y/w, z/w), inside the cube [−1, 1]³.',
                'Viewport: x_w = (x_ndc + 1)/2 · width + x₀, likewise for y; z_w = (z_ndc + 1)/2 with glDepthRange(0, 1). The origin is bottom-left.',
                'Culling: the sign of the triangle’s area in window coordinates tells whether it faces the camera. glFrontFace(GL_CCW) by default: counter-clockwise = front. glCullFace(GL_BACK) discards the other side before any rasterization.',
                'In POGL: GL_CULL_FACE enabled at initialisation, with glCullFace(GL_BACK), and disabled for the ground pass.',
              ],
            },
          ],
        },
        {
          id: 'raster',
          kicker: '04',
          title: 'Rasterizing: which pixels?',
          blocks: [
            {
              type: 'text',
              content:
                'The question: which pixels does the triangle cover? OpenGL’s answer: those whose centre, (x + ½, y + ½), lies inside. Each one becomes a fragment.',
            },
            {
              type: 'list',
              items: [
                'Edge function (Pineda, 1988): E_ab(p) = (b − a) × (p − a) = (b_x − a_x)(p_y − a_y) − (b_y − a_y)(p_x − a_x).',
                'E_ab(p) is twice the signed area of triangle (a, b, p): positive on one side of the edge, negative on the other, zero on it.',
                'p is inside when all three edge functions share the sign of the triangle’s area.',
                'E is affine in p: from one pixel to the next it grows by a constant. The test costs three additions per pixel, and thousands of pixels are tested in parallel — which is why it won over scanline traversal.',
                'Traversal: the bounding box, split into tiles; a tile fully outside one edge is rejected at once (hierarchical rasterization).',
                'Barycentrics: λ_a = E_bc(p) / E_bc(a), likewise for b and c — the edge functions divided by the area. They drive interpolation.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterCoverage',
              caption:
                'Two triangles, a shared edge running through {{shared}} pixel centres. With the top-left rule each is produced by one triangle only: {{n1}} pixels for the first, {{n2}} for the second, none twice.',
            },
            {
              type: 'list',
              items: [
                'The edge case: a centre exactly on an edge. Counted twice, the pixel would be blended twice (transparency, stencil counters); dropped, it would leave a hole.',
                'OpenGL requires such a centre to be produced by exactly one of the triangles sharing the edge. Direct3D names the rule: “top-left” — the centre counts if it lies on a top edge (horizontal, above) or a left edge.',
                'Without a rule, testing ≥ 0 on both sides, the {{dupNoRule}} centres on the edge would be produced twice.',
                'Vertices are snapped to a sub-pixel grid (GL_SUBPIXEL_BITS, at least 4 bits) and the test runs in integers: exact, with no rounding to make an edge flicker.',
              ],
            },
          ],
        },
        {
          id: 'interpolation',
          kicker: '05',
          title: 'Interpolating: perspective',
          blocks: [
            {
              type: 'list',
              items: [
                'A fragment receives the vertex shader outputs (uv_, frag_normal…) interpolated between the three vertices.',
                'Linear interpolation in screen space, a = λ_a · a_a + λ_b · a_b + λ_c · a_c, is wrong: projection is not affine, and screen-space barycentrics are not the 3D ones.',
                'What is affine in screen space is a/w and 1/w. Hence the correction: a = (Σ λᵢ · aᵢ / wᵢ) / (Σ λᵢ / wᵢ).',
                'It is the default for GLSL outputs (the smooth qualifier). noperspective gives affine interpolation; flat takes one vertex’s value, with no interpolation.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterPerspective',
              caption:
                'A checkerboard floor, two triangles. Left, (u, v) interpolated in screen space: the texture breaks along the diagonal, off by up to {{uvError}} % of its width. Right, the corrected formula.',
            },
            {
              type: 'list',
              items: [
                'Depth, on the other hand, is interpolated without correction: z_ndc is already affine in screen space. Hence a depth buffer that is non-linear in distance.',
                'Fragments are launched in 2 × 2 blocks (“quads”). dFdx and dFdy are differences between quad neighbours, and the mipmap level depends on them. At a triangle’s border, “helper” invocations run for nothing, just to provide those neighbours.',
              ],
            },
          ],
        },
        {
          id: 'depth',
          kicker: '06',
          title: 'Depth',
          blocks: [
            {
              type: 'list',
              items: [
                'Stored: z_w = (z_ndc + 1)/2, with z_ndc = (f + n)/(f − n) − 2fn / ((f − n) · d).',
                'A hyperbola in d: precision is concentrated near the near plane.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterDepth',
              caption:
                'With the POGL camera (near = {{near}}, far = {{far}}), half of the [0, 1] range is spent before distance {{halfDist}} — within the first {{halfPct}} % of the scene’s depth.',
            },
            {
              type: 'list',
              items: [
                'Step of a 24-bit depth buffer: Δd ≈ 2⁻²⁴ · (f − n) · d² / (f · n). In POGL, {{step10}} unit at distance 10, {{step250}} at distance 250: {{ratio}} times coarser, the square of the distance ratio.',
                'Z-fighting: two surfaces closer than Δd land on the same value, and the depth test picks between them at random from pixel to pixel.',
                'The lever is near, not far: for f ≫ n, Δd ≈ 2⁻²⁴ · d² / n. Moving near from 1 to 0.1 makes everything 10 times worse; pushing far out barely changes anything.',
                'Reverse-Z: glClipControl(GL_LOWER_LEFT, GL_ZERO_TO_ONE), a float depth buffer (GL_DEPTH_COMPONENT32F), near → 1, far → 0, glDepthFunc(GL_GREATER). The density of floats near 0 cancels the hyperbola: almost uniform precision.',
              ],
            },
          ],
        },
        {
          id: 'fragment',
          kicker: '07',
          title: 'From fragment to pixel',
          blocks: [
            {
              type: 'list',
              items: [
                'Fragment: a candidate pixel, with its position, its depth and its interpolated inputs. The fragment shader turns it into a colour (out vec4), or drops it (discard).',
                'Then, in order: pixel ownership, scissor test, stencil test, depth test, then blending, sRGB conversion and write masks.',
                'Early-Z: the GPU runs the depth test before the fragment shader and does not shade hidden fragments. Impossible if the shader writes gl_FragDepth; discard prevents writing depth early. layout(early_fragment_tests) in; forces the test upstream.',
                'Consequence: drawing opaque objects front to back, or a depth pre-pass, reduces overdraw.',
                'Blending: colour = src · src_factor + dst · dst_factor. Classic transparency: glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA). Transparent objects come after opaque ones, back to front, with depth writes off (glDepthMask(GL_FALSE)).',
                'MSAA: coverage and depth tested per sample (4 per pixel at 4×), but one fragment shader invocation per pixel and per triangle; samples are averaged at the end (“resolve”). Edges are smoothed at almost no shading cost — not the aliasing inside a texture or a shader.',
                'In POGL: GL_DEPTH_TEST enabled, the scene rendered into an RGB16F FBO, then a post-process pass for outlines and god rays (see the cel shading note).',
              ],
            },
          ],
        },
        {
          id: 'questions',
          kicker: '08',
          title: 'Interview questions',
          blocks: [
            {
              type: 'list',
              items: [
                'Why triangles? Always planar and convex, fixed by three points: inside is three edge-function tests, and barycentric interpolation is unique.',
                'What does gl_Position hold? Homogeneous clip coordinates; the divide by w happens afterwards, in hardware.',
                'Why clip before dividing? Behind the camera w ≤ 0: the divide would send the point to the other side.',
                'Why near > 0? At d = 0 the divide is impossible, and depth precision is proportional to near.',
                'Z-fighting, and its remedies? Two depths within one step Δd. Pull near back, reduce far / near, switch to reverse-Z, or glPolygonOffset for a decal lying on a surface.',
                'Why correct the interpolation? Attributes are affine in space, not on screen; a/w and 1/w are.',
                'A pixel on the edge of two triangles? The fill rule (top-left) gives it to exactly one.',
                'When is early-Z lost? When writing gl_FragDepth; discard and alpha-to-coverage also prevent the early depth update.',
                'MSAA or SSAA? MSAA: coverage per sample, shading per pixel. SSAA: everything per sample, cost multiplied by the sample count.',
                'Forward or deferred? Forward: lighting in each object’s fragment shader. Deferred: one pass writes normals, albedo and depth (the G-buffer), lighting comes afterwards, per pixel — many lights, but transparency and MSAA get harder.',
                'Rasterization or ray tracing? Rasterization: for each triangle, which pixels — object first. Ray tracing: for each pixel, which object — image first. The portfolio’s ray marcher sits on that side.',
              ],
            },
          ],
        },
        {
          id: 'further',
          kicker: '09',
          title: 'Further reading',
          blocks: [
            {
              type: 'list',
              items: [
                'The OpenGL 4.6 Core Profile Specification — the chapters on vertex post-processing, rasterization and per-fragment operations.',
                'Fabian Giesen, A trip through the Graphics Pipeline (2011) — the same path, from the hardware side.',
                'Juan Pineda, A Parallel Algorithm for Polygon Rasterization (SIGGRAPH 1988) — edge functions.',
                'Nathan Reed, Depth Precision Visualized (2015) — reverse-Z, with curves.',
                'Scratchapixel, Rasterization: a Practical Implementation — a software rasterizer step by step.',
              ],
            },
          ],
        },
      ],
    },
    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      kicker: 'rendu · pipeline GPU',
      title: 'Du triangle',
      titleAccent: 'au pixel',
      description:
        'Fiche de révision sur la rasterisation et le pipeline OpenGL, du sommet au pixel : espaces de coordonnées, clipping, fonctions d’arête, interpolation corrigée en perspective, profondeur, tests par fragment — et les questions d’entretien qui vont avec. Chiffres recalculés avec la caméra de POGL.',
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'La chaîne en une figure',
          blocks: [
            {
              type: 'list',
              items: [
                'Entrée : des sommets (attributs rangés dans des VBO, décrits par un VAO) et un type de primitive — glDrawArrays(GL_TRIANGLES, …), ou glDrawElements avec un tampon d’indices.',
                'Deux étapes programmables obligatoires : le vertex shader, un appel par sommet ; le fragment shader, un appel par fragment. Tessellation et geometry shader, optionnels, se glissent entre les deux.',
                'Tout le reste est câblé : on ne le programme pas, on le règle par des états — glViewport, glCullFace, glDepthFunc, glBlendFunc, glEnable.',
                'Sortie : des valeurs dans le framebuffer (couleur, profondeur, stencil), à l’écran ou dans une texture par un FBO.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterPipeline',
              caption:
                'Les dix étapes d’un draw call. Première rangée : des sommets. Seconde : des pixels. La rasterisation est la charnière entre les deux.',
            },
          ],
        },
        {
          id: 'spaces',
          kicker: '02',
          title: 'Du sommet au clip space',
          blocks: [
            {
              type: 'list',
              items: [
                'Objet → monde : la matrice model M. Monde → vue : la matrice view V (un lookAt). Vue → clip : la projection P.',
                'Le vertex shader doit écrire gl_Position en coordonnées de clip : un vec4 homogène (x, y, z, w). La division par w n’a pas encore eu lieu.',
                'Repère vue d’OpenGL : la caméra regarde vers −z. La projection range −z_vue dans w : w_clip est la distance devant la caméra.',
              ],
            },
            {
              type: 'code',
              snippet: 'glVertexShader',
              caption:
                'Le vertex shader de POGL : les attributs arrivent par layout(location), et gl_Position = P · MV · position.',
            },
            {
              type: 'list',
              items: [
                'Les normales ne se transforment pas comme les points : la bonne matrice est la transposée de l’inverse, ((MV)⁻¹)ᵀ — la « normal matrix ».',
                'mat3(model_view_matrix), comme ci-dessus, n’est juste (à la norme près) qu’avec des rotations, des translations et des échelles uniformes. Une échelle non uniforme penche les normales.',
              ],
            },
            {
              type: 'code',
              snippet: 'glFrustum',
              caption:
                'La projection de POGL, au format de glFrustum. Dernière ligne : w = −z_vue. Troisième : z_clip = k · z_vue + l. POGL l’appelle avec near = {{near}}, far = {{far}} et top = 1 : un champ vertical de {{vfov}}°.',
            },
            {
              type: 'list',
              items: [
                'Après division : z_ndc = (f + n)/(f − n) − 2fn / ((f − n) · d), d la distance. Near donne −1, far donne +1.',
                'C’est une hyperbole en d, pas une droite : toute la section 06 en découle.',
              ],
            },
          ],
        },
        {
          id: 'clip',
          kicker: '03',
          title: 'Assemblage, clipping, division, viewport',
          blocks: [
            {
              type: 'list',
              items: [
                'Assemblage : les sommets transformés sont regroupés en primitives — trois par triangle avec GL_TRIANGLES, un de plus par triangle avec GL_TRIANGLE_STRIP. Un cache post-transformation évite de relancer le vertex shader sur un indice déjà vu.',
                'Clipping, en coordonnées de clip : est visible ce qui vérifie −w ≤ x ≤ w, −w ≤ y ≤ w et −w ≤ z ≤ w. Un triangle qui coupe le volume est découpé en polygone, puis re-triangulé.',
                'Pourquoi avant la division : derrière la caméra, w ≤ 0. Diviser d’abord inverserait les signes et renverrait le point de l’autre côté de l’écran. C’est le plan near qui tranche ces triangles.',
                'En pratique, les GPU ne découpent vraiment que contre near et far : pour x et y, une « guard band » laisse le rasteriseur ignorer ce qui déborde de l’écran.',
                'Division perspective : NDC = (x/w, y/w, z/w), dans le cube [−1, 1]³.',
                'Viewport : x_f = (x_ndc + 1)/2 · largeur + x₀, de même pour y ; z_f = (z_ndc + 1)/2 avec glDepthRange(0, 1). L’origine est en bas à gauche.',
                'Culling : le signe de l’aire du triangle en coordonnées fenêtre dit s’il est vu de face. glFrontFace(GL_CCW) par défaut : sens trigonométrique = face avant. glCullFace(GL_BACK) jette l’autre avant toute rasterisation.',
                'Dans POGL : GL_CULL_FACE activé dès l’initialisation, avec glCullFace(GL_BACK), et désactivé pour la passe du sol.',
              ],
            },
          ],
        },
        {
          id: 'raster',
          kicker: '04',
          title: 'Rasteriser : quels pixels ?',
          blocks: [
            {
              type: 'text',
              content:
                'La question : quels pixels le triangle couvre-t-il ? La réponse d’OpenGL : ceux dont le centre, (x + ½, y + ½), est à l’intérieur. Chacun devient un fragment.',
            },
            {
              type: 'list',
              items: [
                'Fonction d’arête (Pineda, 1988) : E_ab(p) = (b − a) × (p − a) = (b_x − a_x)(p_y − a_y) − (b_y − a_y)(p_x − a_x).',
                'E_ab(p) vaut le double de l’aire signée du triangle (a, b, p) : positive d’un côté de l’arête, négative de l’autre, nulle dessus.',
                'p est dans le triangle si les trois fonctions d’arête ont le signe de l’aire du triangle.',
                'E est affine en p : d’un pixel au voisin, elle augmente d’une constante. Le test coûte trois additions par pixel, et des milliers de pixels se testent en parallèle — c’est ce qui l’a imposé face au balayage ligne par ligne.',
                'Parcours : la boîte englobante, découpée en tuiles ; une tuile entièrement hors d’une arête est rejetée d’un coup (rasterisation hiérarchique).',
                'Barycentres : λ_a = E_bc(p) / E_bc(a), et de même pour b et c — les fonctions d’arête divisées par l’aire. Ils servent à l’interpolation.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterCoverage',
              caption:
                'Deux triangles, une arête partagée qui passe par {{shared}} centres de pixel. Avec la règle haut-gauche, chacun est produit par un seul triangle : {{n1}} pixels pour le premier, {{n2}} pour le second, aucun en double.',
            },
            {
              type: 'list',
              items: [
                'Le cas limite : un centre exactement sur une arête. Compté deux fois, le pixel serait mélangé deux fois (transparence, compteur de stencil) ; oublié, il laisserait un trou.',
                'OpenGL exige qu’un tel centre soit produit par un seul des triangles qui partagent l’arête. Direct3D nomme la règle : « haut-gauche » — le centre compte s’il est sur une arête haute (horizontale, au-dessus) ou gauche.',
                'Sans règle, avec un test ≥ 0 des deux côtés, les {{dupNoRule}} centres de l’arête seraient produits deux fois.',
                'Les sommets sont arrondis sur une grille sous-pixel (GL_SUBPIXEL_BITS, au moins 4 bits) et le test se fait en entiers : exact, sans arrondi qui ferait scintiller une arête.',
              ],
            },
          ],
        },
        {
          id: 'interpolation',
          kicker: '05',
          title: 'Interpoler : la perspective',
          blocks: [
            {
              type: 'list',
              items: [
                'Un fragment reçoit les sorties du vertex shader (uv_, frag_normal…) interpolées entre les trois sommets.',
                'L’interpolation linéaire à l’écran, a = λ_a · a_a + λ_b · a_b + λ_c · a_c, est fausse : la projection n’est pas affine, et les barycentres à l’écran ne sont pas ceux de l’espace.',
                'Ce qui est affine à l’écran, c’est a/w et 1/w. D’où la correction : a = (Σ λᵢ · aᵢ / wᵢ) / (Σ λᵢ / wᵢ).',
                'C’est le défaut des sorties en GLSL (qualificatif smooth). noperspective donne l’interpolation affine ; flat prend la valeur d’un seul sommet, sans interpoler.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterPerspective',
              caption:
                'Un sol en damier, deux triangles. À gauche, (u, v) interpolés à l’écran : la texture se casse sur la diagonale, avec un écart qui atteint {{uvError}} % de sa largeur. À droite, la formule corrigée.',
            },
            {
              type: 'list',
              items: [
                'La profondeur, elle, s’interpole sans correction : z_ndc est déjà affine à l’écran. D’où un depth buffer non linéaire en distance.',
                'Les fragments sont lancés par blocs de 2 × 2 pixels (des « quads »). dFdx et dFdy sont des différences entre voisins du quad, et le niveau de mipmap en dépend. Au bord d’un triangle, des invocations « helper » tournent pour rien, juste pour fournir ces voisins.',
              ],
            },
          ],
        },
        {
          id: 'depth',
          kicker: '06',
          title: 'La profondeur',
          blocks: [
            {
              type: 'list',
              items: [
                'Stocké : z_f = (z_ndc + 1)/2, avec z_ndc = (f + n)/(f − n) − 2fn / ((f − n) · d).',
                'Une hyperbole en d : la précision est concentrée près du plan near.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterDepth',
              caption:
                'Avec la caméra de POGL (near = {{near}}, far = {{far}}), la moitié de la plage [0, 1] est dépensée avant la distance {{halfDist}} — dans les premiers {{halfPct}} % de la profondeur de la scène.',
            },
            {
              type: 'list',
              items: [
                'Pas d’un depth buffer 24 bits : Δd ≈ 2⁻²⁴ · (f − n) · d² / (f · n). Dans POGL, {{step10}} unité à la distance 10, {{step250}} à la distance 250 : {{ratio}} fois plus grossier, le carré du rapport des distances.',
                'Z-fighting : deux surfaces plus proches que Δd tombent sur la même valeur, et le test de profondeur les départage au hasard du pixel.',
                'Le levier, c’est near, pas far : pour f ≫ n, Δd ≈ 2⁻²⁴ · d² / n. Passer near de 1 à 0,1 dégrade tout d’un facteur 10 ; repousser far ne change presque rien.',
                'Reverse-Z : glClipControl(GL_LOWER_LEFT, GL_ZERO_TO_ONE), depth buffer flottant (GL_DEPTH_COMPONENT32F), near → 1, far → 0, glDepthFunc(GL_GREATER). La densité des flottants près de 0 compense l’hyperbole : une précision presque uniforme.',
              ],
            },
          ],
        },
        {
          id: 'fragment',
          kicker: '07',
          title: 'Du fragment au pixel',
          blocks: [
            {
              type: 'list',
              items: [
                'Fragment : un pixel candidat, avec sa position, sa profondeur et ses entrées interpolées. Le fragment shader en fait une couleur (out vec4), ou le jette (discard).',
                'Ensuite, dans l’ordre : propriété du pixel, test de scissor, test de stencil, test de profondeur, puis mélange, conversion sRGB et masques d’écriture.',
                'Early-Z : le GPU fait le test de profondeur avant le fragment shader, et n’ombre pas les fragments cachés. Impossible si le shader écrit gl_FragDepth ; discard empêche d’écrire la profondeur en avance. layout(early_fragment_tests) in; force le test en amont.',
                'Conséquence : dessiner les opaques de l’avant vers l’arrière, ou faire une pré-passe de profondeur, réduit l’overdraw.',
                'Mélange : couleur = src · facteur_src + dst · facteur_dst. Transparence classique : glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA). Les objets transparents passent après les opaques, de l’arrière vers l’avant, écriture de profondeur coupée (glDepthMask(GL_FALSE)).',
                'MSAA : couverture et profondeur testées par échantillon (4 par pixel en 4×), mais un seul appel du fragment shader par pixel et par triangle ; la moyenne se fait à la fin (« resolve »). Les arêtes sont lissées pour un coût d’ombrage presque inchangé — pas l’aliasing d’une texture ou d’un shader.',
                'Dans POGL : GL_DEPTH_TEST activé, la scène rendue dans un FBO RGB16F, puis une passe de post-traitement pour les contours et les god rays (voir la note sur le cel shading).',
              ],
            },
          ],
        },
        {
          id: 'questions',
          kicker: '08',
          title: 'Questions d’entretien',
          blocks: [
            {
              type: 'list',
              items: [
                'Pourquoi des triangles ? Toujours plans et convexes, fixés par trois points : l’intérieur se teste avec trois fonctions d’arête, et l’interpolation barycentrique est unique.',
                'Que contient gl_Position ? Des coordonnées de clip homogènes ; la division par w est faite après, par le matériel.',
                'Pourquoi clipper avant de diviser ? Derrière la caméra, w ≤ 0 : la division renverrait le point de l’autre côté.',
                'Pourquoi near > 0 ? À d = 0, la division est impossible, et la précision de profondeur est proportionnelle à near.',
                'Le z-fighting, et ses remèdes ? Deux profondeurs à moins d’un pas Δd. Reculer near, réduire far / near, passer en reverse-Z, ou glPolygonOffset pour une décalcomanie posée sur une surface.',
                'Pourquoi corriger l’interpolation ? Les attributs sont affines dans l’espace, pas à l’écran ; a/w et 1/w le sont.',
                'Un pixel sur l’arête de deux triangles ? La règle de remplissage (haut-gauche) le donne à un seul.',
                'Quand perd-on l’early-Z ? En écrivant gl_FragDepth ; discard et alpha-to-coverage empêchent aussi la mise à jour anticipée de la profondeur.',
                'MSAA ou SSAA ? MSAA : couverture par échantillon, ombrage par pixel. SSAA : tout par échantillon, coût multiplié par le nombre d’échantillons.',
                'Forward ou deferred ? Forward : l’éclairage dans le fragment shader de chaque objet. Deferred : une passe écrit normales, albédo et profondeur (le G-buffer), l’éclairage vient ensuite, par pixel — beaucoup de lumières, mais transparence et MSAA plus difficiles.',
                'Rasterisation ou lancer de rayons ? Rasterisation : pour chaque triangle, quels pixels — l’objet d’abord. Lancer de rayons : pour chaque pixel, quel objet — l’image d’abord. Le ray marcher du portfolio est de ce côté-là.',
              ],
            },
          ],
        },
        {
          id: 'further',
          kicker: '09',
          title: 'Pour aller plus loin',
          blocks: [
            {
              type: 'list',
              items: [
                'The OpenGL 4.6 Core Profile Specification — les chapitres sur le post-traitement des sommets, la rasterisation et les opérations par fragment.',
                'Fabian Giesen, A trip through the Graphics Pipeline (2011) — le même chemin, côté matériel.',
                'Juan Pineda, A Parallel Algorithm for Polygon Rasterization (SIGGRAPH 1988) — les fonctions d’arête.',
                'Nathan Reed, Depth Precision Visualized (2015) — le reverse-Z, courbes à l’appui.',
                'Scratchapixel, Rasterization: a Practical Implementation — un rasteriseur logiciel pas à pas.',
              ],
            },
          ],
        },
      ],
    },
    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      kicker: 'Rendering · GPU-Pipeline',
      title: 'Vom Dreieck',
      titleAccent: 'zum Pixel',
      description:
        'Lernnotizen zu Rasterung und OpenGL-Pipeline, vom Vertex zum Pixel: Koordinatenräume, Clipping, Kantenfunktionen, perspektivisch korrekte Interpolation, Tiefe, Tests pro Fragment — und die passenden Interviewfragen. Zahlen mit der POGL-Kamera nachgerechnet.',
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Die ganze Kette in einer Abbildung',
          blocks: [
            {
              type: 'list',
              items: [
                'Eingabe: Vertices (Attribute in VBOs, beschrieben durch ein VAO) und ein Primitivtyp — glDrawArrays(GL_TRIANGLES, …) oder glDrawElements mit Indexpuffer.',
                'Zwei programmierbare Pflichtstufen: der Vertex-Shader, ein Aufruf pro Vertex; der Fragment-Shader, einer pro Fragment. Tessellation und Geometry-Shader sind optional und liegen dazwischen.',
                'Alles andere ist feste Funktion: Man programmiert es nicht, man setzt Zustände — glViewport, glCullFace, glDepthFunc, glBlendFunc, glEnable.',
                'Ausgabe: Werte im Framebuffer (Farbe, Tiefe, Stencil), auf dem Bildschirm oder über ein FBO in einer Textur.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterPipeline',
              caption:
                'Die zehn Stufen eines Draw Calls. Erste Reihe: Vertices. Zweite: Pixel. Die Rasterung ist das Gelenk dazwischen.',
            },
          ],
        },
        {
          id: 'spaces',
          kicker: '02',
          title: 'Vom Vertex in den Clip Space',
          blocks: [
            {
              type: 'list',
              items: [
                'Objekt → Welt: die Model-Matrix M. Welt → Ansicht: die View-Matrix V (ein lookAt). Ansicht → Clip: die Projektion P.',
                'Der Vertex-Shader muss gl_Position in Clip-Koordinaten schreiben: ein homogener vec4 (x, y, z, w). Die Division durch w ist noch nicht geschehen.',
                'OpenGL-Ansichtsraum: Die Kamera blickt entlang −z. Die Projektion legt −z_Ansicht in w: w_clip ist der Abstand vor der Kamera.',
              ],
            },
            {
              type: 'code',
              snippet: 'glVertexShader',
              caption:
                'Der Vertex-Shader von POGL: Die Attribute kommen über layout(location), und gl_Position = P · MV · position.',
            },
            {
              type: 'list',
              items: [
                'Normalen transformieren sich nicht wie Punkte: Die richtige Matrix ist die Transponierte der Inversen, ((MV)⁻¹)ᵀ — die „Normal Matrix“.',
                'mat3(model_view_matrix) wie oben ist nur (bis auf die Länge) richtig bei Rotationen, Translationen und gleichmäßigen Skalierungen. Eine ungleichmäßige Skalierung kippt die Normalen.',
              ],
            },
            {
              type: 'code',
              snippet: 'glFrustum',
              caption:
                'Die Projektion von POGL im Format von glFrustum. Letzte Zeile: w = −z_Ansicht. Dritte: z_clip = k · z_Ansicht + l. POGL ruft sie mit near = {{near}}, far = {{far}} und top = 1 auf: ein vertikales Sichtfeld von {{vfov}}°.',
            },
            {
              type: 'list',
              items: [
                'Nach der Division: z_ndc = (f + n)/(f − n) − 2fn / ((f − n) · d), d der Abstand. Near ergibt −1, far ergibt +1.',
                'Eine Hyperbel in d, keine Gerade: Abschnitt 06 folgt ganz daraus.',
              ],
            },
          ],
        },
        {
          id: 'clip',
          kicker: '03',
          title: 'Assemblierung, Clipping, Division, Viewport',
          blocks: [
            {
              type: 'list',
              items: [
                'Assemblierung: Die transformierten Vertices werden zu Primitiven gruppiert — drei pro Dreieck bei GL_TRIANGLES, einer mehr pro Dreieck bei GL_TRIANGLE_STRIP. Ein Post-Transform-Cache erspart den erneuten Vertex-Shader-Aufruf für einen schon gesehenen Index.',
                'Clipping in Clip-Koordinaten: Sichtbar ist, was −w ≤ x ≤ w, −w ≤ y ≤ w und −w ≤ z ≤ w erfüllt. Ein Dreieck, das das Volumen schneidet, wird zu einem Polygon zugeschnitten und neu trianguliert.',
                'Warum vor der Division: Hinter der Kamera ist w ≤ 0. Zuerst zu dividieren würde die Vorzeichen umkehren und den Punkt auf die andere Bildseite schicken. Die Near-Ebene schneidet diese Dreiecke.',
                'In der Praxis clippen GPUs nur gegen near und far wirklich: Für x und y lässt ein „Guard Band“ den Rasterizer ignorieren, was über den Bildschirm hinausragt.',
                'Perspektivische Division: NDC = (x/w, y/w, z/w), im Würfel [−1, 1]³.',
                'Viewport: x_f = (x_ndc + 1)/2 · Breite + x₀, ebenso für y; z_f = (z_ndc + 1)/2 mit glDepthRange(0, 1). Der Ursprung liegt unten links.',
                'Culling: Das Vorzeichen der Dreiecksfläche in Fensterkoordinaten zeigt, ob es zur Kamera zeigt. glFrontFace(GL_CCW) als Vorgabe: gegen den Uhrzeigersinn = Vorderseite. glCullFace(GL_BACK) verwirft die andere vor jeder Rasterung.',
                'In POGL: GL_CULL_FACE ab der Initialisierung aktiv, mit glCullFace(GL_BACK), und für den Boden-Pass deaktiviert.',
              ],
            },
          ],
        },
        {
          id: 'raster',
          kicker: '04',
          title: 'Rastern: welche Pixel?',
          blocks: [
            {
              type: 'text',
              content:
                'Die Frage: Welche Pixel deckt das Dreieck? Die Antwort von OpenGL: die, deren Zentrum (x + ½, y + ½) innen liegt. Jedes davon wird ein Fragment.',
            },
            {
              type: 'list',
              items: [
                'Kantenfunktion (Pineda, 1988): E_ab(p) = (b − a) × (p − a) = (b_x − a_x)(p_y − a_y) − (b_y − a_y)(p_x − a_x).',
                'E_ab(p) ist die doppelte vorzeichenbehaftete Fläche des Dreiecks (a, b, p): positiv auf einer Seite der Kante, negativ auf der anderen, null darauf.',
                'p liegt innen, wenn alle drei Kantenfunktionen das Vorzeichen der Dreiecksfläche haben.',
                'E ist affin in p: Von einem Pixel zum nächsten wächst sie um eine Konstante. Der Test kostet drei Additionen pro Pixel, und Tausende Pixel werden parallel getestet — deshalb hat er die Zeilenabtastung verdrängt.',
                'Durchlauf: die Bounding Box, in Kacheln geteilt; eine Kachel ganz außerhalb einer Kante wird auf einmal verworfen (hierarchische Rasterung).',
                'Baryzentrische Koordinaten: λ_a = E_bc(p) / E_bc(a), ebenso für b und c — die Kantenfunktionen geteilt durch die Fläche. Sie steuern die Interpolation.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterCoverage',
              caption:
                'Zwei Dreiecke, eine gemeinsame Kante durch {{shared}} Pixelzentren. Mit der Top-Left-Regel erzeugt jedes nur ein Dreieck: {{n1}} Pixel für das erste, {{n2}} für das zweite, keines doppelt.',
            },
            {
              type: 'list',
              items: [
                'Der Grenzfall: ein Zentrum genau auf einer Kante. Doppelt gezählt, würde das Pixel zweimal geblendet (Transparenz, Stencil-Zähler); ausgelassen, entstünde ein Loch.',
                'OpenGL verlangt, dass ein solches Zentrum von genau einem der Dreiecke an der Kante erzeugt wird. Direct3D benennt die Regel: „Top-Left“ — das Zentrum zählt, wenn es auf einer oberen (waagerecht, oben) oder linken Kante liegt.',
                'Ohne Regel, mit einem Test ≥ 0 auf beiden Seiten, würden die {{dupNoRule}} Zentren der Kante doppelt erzeugt.',
                'Die Vertices werden auf ein Subpixel-Raster gerundet (GL_SUBPIXEL_BITS, mindestens 4 Bit), und der Test läuft in Ganzzahlen: exakt, ohne Rundung, die eine Kante flackern ließe.',
              ],
            },
          ],
        },
        {
          id: 'interpolation',
          kicker: '05',
          title: 'Interpolieren: die Perspektive',
          blocks: [
            {
              type: 'list',
              items: [
                'Ein Fragment erhält die Ausgaben des Vertex-Shaders (uv_, frag_normal…), zwischen den drei Vertices interpoliert.',
                'Lineare Interpolation im Bildraum, a = λ_a · a_a + λ_b · a_b + λ_c · a_c, ist falsch: Die Projektion ist nicht affin, und die baryzentrischen Koordinaten im Bild sind nicht die im Raum.',
                'Affin im Bildraum sind a/w und 1/w. Daher die Korrektur: a = (Σ λᵢ · aᵢ / wᵢ) / (Σ λᵢ / wᵢ).',
                'Das ist die Vorgabe für GLSL-Ausgaben (Qualifier smooth). noperspective ergibt affine Interpolation; flat nimmt den Wert eines einzigen Vertex, ohne Interpolation.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterPerspective',
              caption:
                'Ein Schachbrettboden, zwei Dreiecke. Links (u, v) im Bildraum interpoliert: Die Textur bricht an der Diagonale, mit einer Abweichung von bis zu {{uvError}} % ihrer Breite. Rechts die korrigierte Formel.',
            },
            {
              type: 'list',
              items: [
                'Die Tiefe dagegen wird ohne Korrektur interpoliert: z_ndc ist im Bildraum bereits affin. Daher ein im Abstand nichtlinearer Tiefenpuffer.',
                'Fragmente werden in 2 × 2-Blöcken („Quads“) gestartet. dFdx und dFdy sind Differenzen zwischen Quad-Nachbarn, und die Mipmap-Stufe hängt davon ab. Am Dreiecksrand laufen „Helper“-Aufrufe umsonst, nur um diese Nachbarn zu liefern.',
              ],
            },
          ],
        },
        {
          id: 'depth',
          kicker: '06',
          title: 'Die Tiefe',
          blocks: [
            {
              type: 'list',
              items: [
                'Gespeichert: z_f = (z_ndc + 1)/2, mit z_ndc = (f + n)/(f − n) − 2fn / ((f − n) · d).',
                'Eine Hyperbel in d: Die Genauigkeit ballt sich nahe der Near-Ebene.',
              ],
            },
            {
              type: 'diagram',
              diagram: 'rasterDepth',
              caption:
                'Mit der POGL-Kamera (near = {{near}}, far = {{far}}) ist die Hälfte des Bereichs [0, 1] vor dem Abstand {{halfDist}} verbraucht — in den ersten {{halfPct}} % der Szenentiefe.',
            },
            {
              type: 'list',
              items: [
                'Schrittweite eines 24-Bit-Tiefenpuffers: Δd ≈ 2⁻²⁴ · (f − n) · d² / (f · n). In POGL {{step10}} Einheiten im Abstand 10, {{step250}} im Abstand 250: {{ratio}}-mal gröber, das Quadrat des Abstandsverhältnisses.',
                'Z-Fighting: Zwei Flächen, die näher beieinander liegen als Δd, landen auf demselben Wert, und der Tiefentest entscheidet von Pixel zu Pixel zufällig.',
                'Der Hebel ist near, nicht far: Für f ≫ n gilt Δd ≈ 2⁻²⁴ · d² / n. Near von 1 auf 0,1 zu senken verschlechtert alles um den Faktor 10; far hinauszuschieben ändert kaum etwas.',
                'Reverse-Z: glClipControl(GL_LOWER_LEFT, GL_ZERO_TO_ONE), Gleitkomma-Tiefenpuffer (GL_DEPTH_COMPONENT32F), near → 1, far → 0, glDepthFunc(GL_GREATER). Die Dichte der Gleitkommazahlen nahe 0 gleicht die Hyperbel aus: nahezu gleichmäßige Genauigkeit.',
              ],
            },
          ],
        },
        {
          id: 'fragment',
          kicker: '07',
          title: 'Vom Fragment zum Pixel',
          blocks: [
            {
              type: 'list',
              items: [
                'Fragment: ein Pixelkandidat mit Position, Tiefe und interpolierten Eingaben. Der Fragment-Shader macht daraus eine Farbe (out vec4) oder verwirft ihn (discard).',
                'Danach, der Reihe nach: Pixel Ownership, Scissor-Test, Stencil-Test, Tiefentest, dann Blending, sRGB-Umwandlung und Schreibmasken.',
                'Early-Z: Die GPU macht den Tiefentest vor dem Fragment-Shader und schattiert verdeckte Fragmente nicht. Unmöglich, wenn der Shader gl_FragDepth schreibt; discard verhindert das vorzeitige Schreiben der Tiefe. layout(early_fragment_tests) in; erzwingt den Test vorab.',
                'Folge: Opake Objekte von vorn nach hinten zu zeichnen oder ein Tiefen-Pre-Pass reduziert Overdraw.',
                'Blending: Farbe = src · Faktor_src + dst · Faktor_dst. Klassische Transparenz: glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA). Transparente Objekte kommen nach den opaken, von hinten nach vorn, ohne Tiefenschreiben (glDepthMask(GL_FALSE)).',
                'MSAA: Abdeckung und Tiefe pro Sample getestet (4 pro Pixel bei 4×), aber ein Fragment-Shader-Aufruf pro Pixel und Dreieck; der Mittelwert entsteht am Ende („Resolve“). Kanten werden fast ohne Shading-Kosten geglättet — nicht das Aliasing innerhalb einer Textur oder eines Shaders.',
                'In POGL: GL_DEPTH_TEST aktiv, die Szene in ein RGB16F-FBO gerendert, dann ein Post-Process-Pass für Konturen und God Rays (siehe die Notiz zum Cel Shading).',
              ],
            },
          ],
        },
        {
          id: 'questions',
          kicker: '08',
          title: 'Interviewfragen',
          blocks: [
            {
              type: 'list',
              items: [
                'Warum Dreiecke? Immer eben und konvex, durch drei Punkte festgelegt: Innen ist ein Test mit drei Kantenfunktionen, und die baryzentrische Interpolation ist eindeutig.',
                'Was enthält gl_Position? Homogene Clip-Koordinaten; die Division durch w erfolgt danach, in Hardware.',
                'Warum vor der Division clippen? Hinter der Kamera ist w ≤ 0: Die Division schickte den Punkt auf die andere Seite.',
                'Warum near > 0? Bei d = 0 ist die Division unmöglich, und die Tiefengenauigkeit ist proportional zu near.',
                'Z-Fighting und Abhilfe? Zwei Tiefen innerhalb eines Schritts Δd. Near weiter weg, far / near verkleinern, Reverse-Z, oder glPolygonOffset für ein Decal auf einer Fläche.',
                'Warum die Interpolation korrigieren? Die Attribute sind im Raum affin, nicht im Bild; a/w und 1/w sind es.',
                'Ein Pixel auf der Kante zweier Dreiecke? Die Füllregel (Top-Left) gibt es genau einem.',
                'Wann geht Early-Z verloren? Beim Schreiben von gl_FragDepth; discard und Alpha-to-Coverage verhindern ebenfalls das vorzeitige Tiefen-Update.',
                'MSAA oder SSAA? MSAA: Abdeckung pro Sample, Shading pro Pixel. SSAA: alles pro Sample, Kosten mal Sample-Anzahl.',
                'Forward oder Deferred? Forward: Beleuchtung im Fragment-Shader jedes Objekts. Deferred: Ein Pass schreibt Normalen, Albedo und Tiefe (den G-Buffer), die Beleuchtung folgt pro Pixel — viele Lichter, aber Transparenz und MSAA werden schwieriger.',
                'Rasterung oder Raytracing? Rasterung: für jedes Dreieck, welche Pixel — zuerst das Objekt. Raytracing: für jedes Pixel, welches Objekt — zuerst das Bild. Der Ray Marcher des Portfolios steht auf dieser Seite.',
              ],
            },
          ],
        },
        {
          id: 'further',
          kicker: '09',
          title: 'Weiterführend',
          blocks: [
            {
              type: 'list',
              items: [
                'The OpenGL 4.6 Core Profile Specification — die Kapitel zur Vertex-Nachverarbeitung, zur Rasterung und zu den Operationen pro Fragment.',
                'Fabian Giesen, A trip through the Graphics Pipeline (2011) — derselbe Weg, aus Sicht der Hardware.',
                'Juan Pineda, A Parallel Algorithm for Polygon Rasterization (SIGGRAPH 1988) — die Kantenfunktionen.',
                'Nathan Reed, Depth Precision Visualized (2015) — Reverse-Z, mit Kurven.',
                'Scratchapixel, Rasterization: a Practical Implementation — ein Software-Rasterizer Schritt für Schritt.',
              ],
            },
          ],
        },
      ],
    },
  },
};

/**
 * Les chiffres de la note rasterisation : la caméra de POGL, la profondeur
 * qu'elle produit, la couverture et l'interpolation, tous recalculés par
 * `src/lib/raster.ts`.
 */
const rasterFacts = (): Record<string, Fact> => {
  const { near, far, top } = rasterLib.POGL;
  const vfov = rasterLib.verticalFov(top, near);
  const half = rasterLib.halfDepthDistance(near, far);
  const step10 = rasterLib.depthStep(10, near, far);
  const step250 = rasterLib.depthStep(250, near, far);

  const scene = rasterLib.coverageScene();
  const cells = scene.owner.flat();
  const twice = cells.filter((o) => o === 3).length;
  let noRule = 0;
  let sharedOnce = 0;
  for (let y = 0; y < scene.h; y++) {
    for (let x = 0; x < scene.w; x++) {
      if (rasterLib.coversInclusive(scene.t1, x, y) && rasterLib.coversInclusive(scene.t2, x, y)) {
        noRule++;
        if (scene.owner[y]![x] === 1 || scene.owner[y]![x] === 2) sharedOnce++;
      }
    }
  }
  const persp = rasterLib.perspectiveScene(64, 32);

  claim(Math.round(vfov) === 90, 'le champ vertical de POGL est de 90°');
  claim(Math.abs(rasterLib.zNdc(near, near, far) + 1) < 1e-9 && Math.abs(rasterLib.zNdc(far, near, far) - 1) < 1e-9, 'near donne −1 et far +1');
  claim(Math.abs(rasterLib.windowDepth(half, near, far) - 0.5) < 1e-9 && half < 2, 'la moitié de la profondeur est dépensée avant 2');
  claim(Math.abs(step250 / step10 - 625) < 1e-6, 'le pas de profondeur croît comme le carré de la distance');
  claim(twice === 0, 'aucun pixel n’est produit deux fois avec la règle haut-gauche');
  claim(noRule === scene.onShared && sharedOnce === noRule, 'sans règle, chaque centre de l’arête partagée serait produit deux fois ; avec, une seule');
  claim(rasterLib.area2(...scene.t1) !== 0 && rasterLib.area2(...scene.t2) !== 0, 'les deux triangles ne sont pas dégénérés');
  claim(persp.maxError > 0.3, 'l’interpolation affine s’écarte nettement de la correcte');

  return {
    near,
    far,
    vfov: Math.round(vfov),
    halfDist: fixed(half, 2),
    halfPct: fixed(((half - near) / (far - near)) * 100, 1),
    step10: (locale: Locale) => num(step10, locale),
    step250: fixed(step250, 4),
    ratio: Math.round(step250 / step10),
    shared: scene.onShared,
    dupNoRule: noRule,
    n1: cells.filter((o) => o === 1).length,
    n2: cells.filter((o) => o === 2).length,
    uvError: Math.round(persp.maxError * 100),
  };
};

const toonFacts = (): Record<string, Fact> => {
  const barkTexels = toonLib.rampTexels(toonLib.RAMP.levels, toonLib.RAMP.barkFloor);
  const foliageTexels = toonLib.rampTexels(toonLib.RAMP.levels, toonLib.RAMP.foliageFloor);
  const bark = toonLib.bands(barkTexels);
  const foliage = toonLib.bands(foliageTexels);
  const values = (b: { value: number }[]) => (locale: Locale) =>
    list(b.map((x) => fixed(x.value, 2)(locale).replace(/0$/, '').replace(/[.,]0$/, '')), locale);

  // La valeur brute du filtre des normales sur l'arête avant du cube : le pixel
  // de cube dont les quatre voisins sont du cube et qui répond le plus.
  const scene = toonLib.edgeScene(64, 40);
  let crease = 0;
  for (let j = 1; j < scene.length - 1; j++) {
    for (let i = 1; i < scene[0].length - 1; i++) {
      const inside = [scene[j][i], scene[j][i + 1], scene[j][i - 1], scene[j + 1][i], scene[j - 1][i]].every((p) => p.id === 2);
      if (inside) crease = Math.max(crease, toonLib.normalEdge(scene, i, j));
    }
  }
  const O = toonLib.OUTLINE;
  const R = toonLib.RAYS;
  const eff = toonLib.effectiveSamples();
  const eff90 = toonLib.effectiveSamples(0.9);
  const eff99 = toonLib.effectiveSamples(0.99);
  const reads = 1920 * 1080 * R.samples;

  claim(bark.length === toonLib.RAMP.levels && foliage.length === toonLib.RAMP.levels, 'la rampe a 4 bandes');
  claim(bark[0].value < foliage[0].value, 'le plancher de l’écorce est plus bas que celui du feuillage');
  claim(bark.at(-1)!.value === 1 && foliage.at(-1)!.value === 1, 'la bande la plus claire vaut 1');
  claim(toonLib.sampleRamp(1, barkTexels) === 1, 'N·L = 1 lit le dernier texel');
  claim(crease > O.normalLow && crease < O.normalHigh, 'l’arête avant du cube sort à demi-encre');
  claim(eff < R.samples && eff90 < eff && eff < eff99, 'la marche vaut moins que ses 100 échantillons');

  return {
    t1: bark[1].from,
    t2: bark[2].from,
    t3: bark[3].from,
    barkBands: values(bark),
    foliageBands: values(foliage),
    // Dans une formule de code, les constantes s'écrivent comme dans le code,
    // avec un point : « smoothstep(0,6, 0,8, x) » serait illisible.
    rimLowC: () => String(toonLib.RIM.low),
    rimHighC: () => String(toonLib.RIM.high),
    edgeLowC: () => String(O.edgeLow),
    edgeHighC: () => String(O.edgeHigh),
    normalLowC: () => String(O.normalLow),
    normalHighC: () => String(O.normalHigh),
    rimLow: toonLib.RIM.low,
    rimHigh: toonLib.RIM.high,
    rimA0: fixed(toonLib.rimAngle(toonLib.RIM.low), 1),
    rimA1: fixed(toonLib.rimAngle(toonLib.RIM.high), 1),
    edgeLow: O.edgeLow,
    edgeHigh: O.edgeHigh,
    normalLow: O.normalLow,
    normalHigh: O.normalHigh,
    creaseRaw: fixed(crease, 2),
    samples: R.samples,
    densityPct: Math.round(R.density * 100),
    decay: R.decay,
    lastWeight: (locale: Locale) => `${fixed(R.decay ** (R.samples - 1) * 100, 1)(locale)} %`,
    effective: fixed(eff, 1),
    eff90: fixed(eff90, 1),
    eff99: fixed(eff99, 1),
    reads1080: (locale: Locale) =>
      locale === 'en' ? `${Math.round(reads / 1e6)} million` : `${Math.round(reads / 1e6)} millions`.replace('millions', locale === 'de' ? 'Millionen' : 'millions'),
  };
};

/** Un nombre à la manière de la langue ; les très petits en notation 10⁻ⁿ. */
function num(x: number | string, locale: Locale): string {
  if (typeof x === 'string') x = Number(x);
  const sep = locale === 'en' ? '.' : ',';
  if (x !== 0 && Math.abs(x) < 0.01) {
    const e = Math.floor(Math.log10(Math.abs(x)));
    const m = (x / 10 ** e).toFixed(1);
    const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const exp = String(-e).split('').map((d) => sup[+d]).join('');
    return m === '1.0' ? `10⁻${exp}` : `${m.replace('.', sep)}·10⁻${exp}`;
  }
  // Les milliers séparés d'une espace fine, comme dans les figures (« 1 000 »).
  if (Number.isInteger(x) && Math.abs(x) >= 1000) return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const r = Math.abs(x) < 1 ? +x.toFixed(2) : Number.isInteger(x) ? x : +x.toFixed(1);
  return String(r).replace('.', sep);
}

/** Une liste de noms, avec la conjonction de la langue. */
function list(items: string[], locale: Locale): string {
  const and = locale === 'en' ? 'and' : locale === 'fr' ? 'et' : 'und';
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`;
}

/** Remplace chaque `{{clé}}` ; une clé inconnue arrête la compilation. */
function fill(text: string, facts: Record<string, Fact>, locale: Locale): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const f = facts[key];
    if (f === undefined) throw new Error(`Chiffre « ${key} » absent des résultats du banc d'essai.`);
    return typeof f === 'function' ? f(locale) : num(f, locale);
  });
}

/*
 * L'ordre d'affichage : le cours d'optique, puis le cel shading (le rendu
 * ensemble), le banc d'essai des méthodes de descente, puis les notes U-Net. Les notes SVM viendront des deux notebooks de TP (`ocvx/`) une
 * fois ceux-ci complétés.
 */
const all: NoteDef[] = [optics, raster, cel, descent, unet];

/** En production, les brouillons n'existent pas : ni page, ni ligne, ni lien. */
const definitions = all.filter((def) => !def.draft || import.meta.env.DEV);

/** Les mots d'un texte en prose, pour le temps de lecture. */
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Deux cents mots de prose à la minute, et une demi-minute par bloc de code —
 * un extrait ne se lit pas comme une phrase. Arrondi au-dessus : un « 4 min »
 * qui en prend cinq est une promesse tenue de travers.
 */
function readingTime(sections: Section[]): number {
  let prose = 0;
  let code = 0;
  for (const section of sections) {
    prose += words(section.title);
    for (const block of section.blocks) {
      if (block.type === 'text') prose += words(block.content);
      else if (block.type === 'list') prose += block.items.reduce((n, item) => n + words(item), 0);
      else if (block.type === 'diagram') prose += words(block.caption);
      else if (block.type === 'code') code += 1;
    }
  }
  return Math.max(1, Math.ceil(prose / 200 + code * 0.5));
}

/** Injecte les chiffres calculés dans tout le texte d'une note. */
function withFacts(text: NoteText, facts: Record<string, Fact>, locale: Locale): NoteText {
  const f = (s: string) => fill(s, facts, locale);
  return {
    ...text,
    description: f(text.description),
    sections: text.sections.map((section) => ({
      ...section,
      title: f(section.title),
      blocks: section.blocks.map((block) => {
        switch (block.type) {
          case 'text':
            return { ...block, content: f(block.content) };
          case 'list':
            return { ...block, items: block.items.map(f) };
          case 'diagram':
            return { ...block, caption: f(block.caption) };
          case 'chart':
            return { ...block, title: f(block.title), note: block.note && f(block.note) };
          case 'code':
            return { ...block, caption: block.caption && f(block.caption) };
          default:
            return block;
        }
      }),
    })),
  };
}

function resolveNote(def: NoteDef, locale: Locale): ResolvedNote {
  const text = def.facts ? withFacts(def.text[locale], def.facts(), locale) : def.text[locale];
  return {
    slug: def.slug,
    tone: def.tone,
    category: def.category,
    project: def.project,
    draft: def.draft ?? false,
    kicker: text.kicker,
    title: text.title,
    titleAccent: text.titleAccent,
    description: text.description,
    minutes: readingTime(text.sections),
    sections: resolveSections(text.sections, `la note « ${def.slug} » (${locale})`, (key) => {
      const shot = def.shots?.[key];
      const words = text.shots?.[key];
      if (!shot || !words) {
        throw new Error(`Visuel « ${key} » incomplet pour la note ${def.slug} (${locale}).`);
      }
      return { ...shot, ...words, animated: shot.image.format === 'gif' } satisfies ResolvedShot;
    }),
  };
}

export function getNotes(locale: Locale): ResolvedNote[] {
  return definitions.map((def) => resolveNote(def, locale));
}

/** Les notes qui tirent leur code d'un projet donné. */
export function notesForProject(locale: Locale, slug: string): ResolvedNote[] {
  return getNotes(locale).filter((note) => note.project === slug);
}

/** Une entrée par note et par langue — sert aux `getStaticPaths`. */
export const noteRoutes = definitions.flatMap((def) =>
  locales.map((locale) => ({ slug: def.slug, locale, note: resolveNote(def, locale) }))
);
