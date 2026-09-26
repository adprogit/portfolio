/**
 * Le texte de présentation, en trois langues.
 *
 * Une règle tenue, et une levée.
 *
 * Tenue : aucun nom écrit dans le corps du site, aucune adresse, aucun numéro.
 * Le monogramme du bandeau est `./` — un chemin relatif, pas une initiale.
 *
 * Levée : il y a désormais des liens sortants, et exactement deux espèces. Les
 * dépôts, un par page projet ; et le profil professionnel ci-dessous, qui est
 * le seul endroit d’où l’on peut écrire à quelqu’un. Un site qui annonce
 * chercher un stage et ne donne aucun moyen de répondre demande au lecteur de
 * faire l’effort à sa place.
 *
 * `tools/audit-dist.mjs` connaît ces deux formes et refuse toutes les autres.
 */

import type { Locale } from '../i18n/config';

export interface SkillGroup {
  /** Titre traduit du groupe. */
  title: string;
  /** Noms techniques — non traduits. */
  items: string[];
}

interface LocalizedProfile {
  /**
   * Titre de la page d’accueil (le <h1>), en deux morceaux.
   *
   * `headline` porte la ligne en encre neutre ; `headlineAccent` la termine,
   * d’une autre main — didone italique, dans l’accent du site. Le découpage est
   * écrit langue par langue parce qu’il est **sémantique** : on met en relief le
   * sujet, pas les trois derniers mots. En français la spécialité finit la
   * phrase, en allemand elle la commence — un découpage automatique se
   * tromperait quelque part.
   */
  headline: string;
  headlineAccent: string;
  /** Le métier, en mono. Repris tel quel dans le pied de page et le <title>. */
  role: string;
  /**
   * Une phrase, deux au plus. C'est aussi la méta-description de la page et le
   * texte de partage : elle doit tenir seule, et rester courte.
   */
  description: string;
  /**
   * Le second paragraphe de l'accueil. Lui ne part nulle part ailleurs : il ne
   * dit pas ce que je fais — c'est le travail de `description` — mais comment,
   * ce qui est la seule chose qu'une liste de projets ne montre pas d'elle-même.
   */
  approach: string;
  /** Les pays visés, en toutes lettres : c’est le badge de l’accueil. */
  location: string;
  /** Ce que je cherche — la raison d’être du site. */
  seeking: string;
  skills: SkillGroup[];
}

/** Affiché dans le bandeau à la place d’un nom. */
export const monogram = './';

/**
 * Un lien sortant, et sa marque. Le libellé ne se traduit pas : c’est un nom
 * propre. L’icône doit exister dans `Icon.astro`.
 */
export interface ProfileLink {
  label: string;
  href: string;
  icon: 'linkedin' | 'github';
}

/** Par où l’on me joint. Vérifié par `tools/audit-dist.mjs`. */
export const links: ProfileLink[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/alex-d-6a42692b8', icon: 'linkedin' },
];

/**
 * Les mêmes pays, en codes, pour le titre de l’onglet : « Développeur rendu &
 * vision · France, Allemagne, Autriche, Suisse » passerait la longueur qu’un
 * navigateur ou un résultat de recherche affiche. Les codes ne se traduisent
 * pas, d’où la constante unique — et ils disent aussi pourquoi le site parle
 * trois langues.
 */
export const regions = 'FR · DE · AT · CH';

export const profile: Record<Locale, LocalizedProfile> = {
  en: {
    headline: 'Rendering, image processing &',
    headlineAccent: 'GPU optimisation',
    role: 'Rendering, image processing and GPU optimisation',
    description:
      'I am an engineer specialised in rendering, image processing and GPU optimisation. I write C++, CUDA and Python to compute images and to make them compute faster. I am looking for an internship.',
    approach:
      'Most of what is here was rebuilt rather than assembled: a ray marcher with no graphics API, a U-Net with no reference implementation, a neural texture codec decoded on the GPU. It is the long way round, and the only one that shows where the time actually goes — so every page states its numbers, including the ones that did not come out well.',
    location: 'France, Germany, Austria, Switzerland',
    seeking: 'Looking for an internship',
    skills: [
      {
        title: 'Languages & systems',
        items: ['C++20', 'C', 'CUDA', 'Python', 'CMake', 'Linux'],
      },
      {
        title: 'Rendering & GPU',
        items: ['OpenGL', 'Ray marching', 'Signed distance fields', 'GLSL', 'OpenMP', 'Nsight', 'Profiling'],
      },
      {
        title: 'Vision & maths',
        items: ['OpenCV', 'NumPy', 'PyTorch', 'Morphology', 'HOG / k-NN', 'XGBoost', '3D linear algebra'],
      },
      {
        title: 'Services & data',
        items: ['FastAPI', 'PostgreSQL', 'Docker', 'REST APIs'],
      },
      {
        title: 'Tools',
        items: ['Git', 'GStreamer', 'clang-format', 'ffmpeg', 'CI'],
      },
    ],
  },

  fr: {
    headline: 'Rendu, traitement d’images &',
    headlineAccent: 'optimisation GPU',
    role: 'Rendu, traitement d’images et optimisation GPU',
    description:
      'Je suis ingénieur spécialisé en rendu, traitement d’images et optimisation GPU. J’écris du C++, du CUDA et du Python pour faire calculer des images — et pour les faire calculer plus vite. Je cherche un stage.',
    approach:
      'L’essentiel de ce qui est ici a été refait plutôt qu’assemblé : un ray marcher sans API graphique, un U-Net sans implémentation de référence, un codec neural de textures décodé sur le GPU. C’est le chemin long, et le seul qui montre où passe vraiment le temps — alors chaque page donne ses chiffres, y compris ceux qui ne sont pas bons.',
    location: 'France, Allemagne, Autriche, Suisse',
    seeking: 'À la recherche d’un stage',
    skills: [
      {
        title: 'Langages & systèmes',
        items: ['C++20', 'C', 'CUDA', 'Python', 'CMake', 'Linux'],
      },
      {
        title: 'Rendu & GPU',
        items: ['OpenGL', 'Ray marching', 'Signed distance fields', 'GLSL', 'OpenMP', 'Nsight', 'Profilage'],
      },
      {
        title: 'Vision & mathématiques',
        items: ['OpenCV', 'NumPy', 'PyTorch', 'Morphologie', 'HOG / k-NN', 'XGBoost', 'Algèbre linéaire 3D'],
      },
      {
        title: 'Services & données',
        items: ['FastAPI', 'PostgreSQL', 'Docker', 'API REST'],
      },
      {
        title: 'Outils',
        items: ['Git', 'GStreamer', 'clang-format', 'ffmpeg', 'CI'],
      },
    ],
  },

  de: {
    headline: 'Rendering, Bildverarbeitung &',
    headlineAccent: 'GPU-Optimierung',
    role: 'Rendering, Bildverarbeitung und GPU-Optimierung',
    description:
      'Ich bin Ingenieur mit Schwerpunkt Rendering, Bildverarbeitung und GPU-Optimierung. Ich schreibe C++, CUDA und Python, um Bilder zu berechnen — und sie schneller berechnen zu lassen. Ich suche ein Praktikum.',
    approach:
      'Das meiste hier ist nachgebaut statt zusammengesetzt: ein Ray Marcher ohne Grafik-API, ein U-Net ohne Referenzimplementierung, ein neuronaler Texturcodec, auf der GPU dekodiert. Das ist der lange Weg und der einzige, der zeigt, wohin die Zeit wirklich geht — deshalb nennt jede Seite ihre Zahlen, auch die, die nicht gut ausgefallen sind.',
    location: 'Frankreich, Deutschland, Österreich, Schweiz',
    seeking: 'Auf der Suche nach einem Praktikum',
    skills: [
      {
        title: 'Sprachen & Systeme',
        items: ['C++20', 'C', 'CUDA', 'Python', 'CMake', 'Linux'],
      },
      {
        title: 'Rendering & GPU',
        items: ['OpenGL', 'Ray Marching', 'Signed Distance Fields', 'GLSL', 'OpenMP', 'Nsight', 'Profiling'],
      },
      {
        title: 'Bildverarbeitung & Mathematik',
        items: ['OpenCV', 'NumPy', 'PyTorch', 'Morphologie', 'HOG / k-NN', 'XGBoost', 'Lineare Algebra 3D'],
      },
      {
        title: 'Dienste & Daten',
        items: ['FastAPI', 'PostgreSQL', 'Docker', 'REST-APIs'],
      },
      {
        title: 'Werkzeuge',
        items: ['Git', 'GStreamer', 'clang-format', 'ffmpeg', 'CI'],
      },
    ],
  },
};
