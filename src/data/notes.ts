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
                'Three rays, three signs of the discriminant. The dots are the roots, computed by the function below.',
            },
            {
              type: 'code',
              snippet: 'courseRaySphere',
              caption:
                'The nearer positive root is the visible surface. The ray marcher has no such function — this one was written for the course.',
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
                'The real loop, run on this scene when the page is built: every circle is a step it actually took. The steps shrink along the box it nearly grazes, then at the surface it hits.',
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
              caption: 'max(n·H, 0)^ns around H, drawn from the formula for ns = 8, 32 and 128.',
            },
            {
              type: 'code',
              snippet: 'courseBlinn',
              caption:
                'One normalisation and one pow per light — cheaper than reflecting the view vector, which is why Blinn’s variant replaced Phong’s.',
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
                'Above the ground: the shadow ray of a penumbra point, marching towards the light; the thick circle is the step where k·h/t is smallest. Below: the light received at each point, same function. k = 32, the renderer’s value, switches almost at once; k = 4 brightens gradually.',
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
                'The origin is pushed off the surface by 2 × SURF_DIST — otherwise the new ray would start inside it and stop at once. kr blends the local colour with the reflection.',
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
                'Trois rayons, trois signes du discriminant. Les points sont les racines, calculées par la fonction ci-dessous.',
            },
            {
              type: 'code',
              snippet: 'courseRaySphere',
              caption:
                'La plus proche racine positive est la surface visible. Le ray marcher n’a pas de telle fonction : celle-ci a été écrite pour le cours.',
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
                'La vraie boucle, exécutée sur cette scène à la compilation de la page : chaque cercle est un pas qu’elle a réellement fait. Les pas rétrécissent le long de la boîte qu’elle frôle, puis contre la surface qu’elle touche.',
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
              caption: 'max(n·H, 0)^ns autour de H, tracé depuis la formule pour ns = 8, 32 et 128.',
            },
            {
              type: 'code',
              snippet: 'courseBlinn',
              caption:
                'Une normalisation et un pow par lumière — moins cher que de réfléchir le vecteur de vue, et c’est pour ça que la variante de Blinn a remplacé celle de Phong.',
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
                'Au-dessus du sol : le rayon d’ombre d’un point de la pénombre, qui marche vers la lumière ; le cercle épais est le pas où k·h/t est le plus petit. Dessous : la lumière reçue en chaque point, même fonction. k = 32, la valeur du moteur, bascule presque d’un coup ; k = 4 s’éclaire progressivement.',
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
                'L’origine est décollée de la surface de 2 × SURF_DIST — sans quoi le nouveau rayon partirait de l’intérieur et s’arrêterait aussitôt. kr mélange la couleur locale et le reflet.',
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
                'Drei Strahlen, drei Vorzeichen der Diskriminante. Die Punkte sind die Wurzeln, berechnet mit der Funktion darunter.',
            },
            {
              type: 'code',
              snippet: 'courseRaySphere',
              caption:
                'Die nächste positive Wurzel ist die sichtbare Fläche. Der Raymarcher hat keine solche Funktion — diese hier wurde für den Kurs geschrieben.',
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
                'Die echte Schleife, beim Bauen der Seite auf dieser Szene ausgeführt: Jeder Kreis ist ein Schritt, den sie wirklich gemacht hat. Die Schritte schrumpfen entlang des Quaders, den sie fast streift, dann an der Fläche, die sie trifft.',
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
              caption: 'max(n·H, 0)^ns um H, aus der Formel gezeichnet für ns = 8, 32 und 128.',
            },
            {
              type: 'code',
              snippet: 'courseBlinn',
              caption:
                'Eine Normalisierung und ein pow pro Licht — billiger, als den Blickvektor zu spiegeln, und deshalb hat Blinns Variante die von Phong abgelöst.',
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
                'Über dem Boden: der Schattenstrahl eines Punkts im Halbschatten auf dem Weg zum Licht; der dicke Kreis ist der Schritt mit dem kleinsten k·h/t. Darunter: das an jedem Punkt empfangene Licht, dieselbe Funktion. k = 32, der Wert des Renderers, wechselt fast schlagartig; k = 4 hellt sich allmählich auf.',
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
                'Der Ursprung wird um 2 × SURF_DIST von der Fläche abgesetzt — sonst begänne der neue Strahl in ihr und hielte sofort an. kr mischt die lokale Farbe mit der Spiegelung.',
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
  if (!ok) throw new Error(`Le texte du banc d'essai affirme « ${what} », que le calcul dément.`);
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
 * L'ordre d'affichage : le cours d'optique, puis le banc d'essai des méthodes
 * de descente. Les notes SVM viendront des deux notebooks de TP (`ocvx/`) une
 * fois ceux-ci complétés.
 */
const all: NoteDef[] = [optics, descent];

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
