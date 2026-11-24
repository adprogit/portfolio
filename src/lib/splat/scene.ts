/**
 * La scène du hero : un nœud de trèfle couvert de gaussiennes plates.
 *
 * Rien n'est chargé : le nuage se calcule ici, au même endroit pour le rendu
 * WebGPU (`hero.ts`) et pour l'image de repli faite au build (`poster.ts`).
 * Pas de fichier .ply à licencier, et les deux rendus voient exactement les
 * mêmes gaussiennes — un générateur pseudo-aléatoire à graine fixe.
 *
 * Chaque gaussienne de surface est un disque : deux axes dans le plan tangent
 * du tube, un troisième, très court, sur la normale. C'est ce troisième axe
 * qui donne une normale au nuage, et donc les hachures et le tramage, qui
 * ombrent selon la lumière.
 *
 * Le tri est celui du moteur OpenGL (`main.cpp`, `sort_splats`) : un tri par
 * dénombrement sur la profondeur quantifiée en 16 bits, entre les bornes de la
 * sphère englobante.
 */

/** Flottants par gaussienne : position + teinte, covariance (6), opacité, normale. */
export const FLOATS = 16;

/**
 * Disposition d'une gaussienne dans le tampon, en quatre `vec4f` :
 *
 *   p  = (x, y, z, teinte)       teinte : 0 = accent du site, 1 = rose
 *   c0 = (Σxx, Σxy, Σxz, Σyy)
 *   c1 = (Σyz, Σzz, opacité, 0)
 *   n  = (nx, ny, nz, poussière)  1 pour la poussière, 0 pour le nœud
 */
export interface Scene {
  data: Float32Array<ArrayBuffer>;
  count: number;
  /** Rayon de la sphère englobante, centrée à l'origine. */
  radius: number;
}

/** mulberry32 : 32 bits d'état, assez pour placer quelques milliers de points. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const normalize = (a: V3) => scale(a, 1 / Math.hypot(...a));

/** Le nœud (2, 3), ramené dans la sphère unité. */
function knot(t: number): V3 {
  const r = (2 + Math.cos(3 * t)) / 3.2;
  return [r * Math.cos(2 * t), r * Math.sin(2 * t), -Math.sin(3 * t) / 3.2];
}

const ALONG = 360;
const AROUND = 18;
const TUBE = 0.075;
const DUST = 1400;

export function buildScene(): Scene {
  const rand = random(7);
  const count = ALONG * AROUND + DUST;
  const data = new Float32Array(count * FLOATS);
  let radius = 0;
  let i = 0;

  /** Écrit une gaussienne d'axes (a, b, c) et d'écarts types (sa, sb, sc). */
  const push = (p: V3, hue: number, axes: [V3, V3, V3], sigmas: V3, opacity: number, dust = 0) => {
    const o = i++ * FLOATS;
    // Σ = R S Sᵀ Rᵀ, écrit comme une somme : Σ = Σₖ σₖ² aₖ aₖᵀ.
    const cov = [0, 0, 0, 0, 0, 0];
    axes.forEach((a, k) => {
      const s2 = sigmas[k]! ** 2;
      cov[0]! += s2 * a[0] * a[0];
      cov[1]! += s2 * a[0] * a[1];
      cov[2]! += s2 * a[0] * a[2];
      cov[3]! += s2 * a[1] * a[1];
      cov[4]! += s2 * a[1] * a[2];
      cov[5]! += s2 * a[2] * a[2];
    });
    data.set([...p, hue, cov[0]!, cov[1]!, cov[2]!, cov[3]!, cov[4]!, cov[5]!, opacity, 0, ...axes[2], dust], o);
    radius = Math.max(radius, Math.hypot(...p) + 3 * Math.max(...sigmas));
  };

  const step = (2 * Math.PI) / ALONG;
  for (let j = 0; j < ALONG; j++) {
    const t = j * step;
    const c = knot(t);
    const tangent = normalize(sub(knot(t + 1e-3), knot(t - 1e-3)));
    // Repère du tube : la part de la position orthogonale à la tangente. Le
    // nœud ne passe jamais par l'origine, elle n'est donc jamais nulle.
    const normal = normalize(sub(c, scale(tangent, dot(c, tangent))));
    const binormal = cross(tangent, normal);
    // La teinte fait un aller-retour le long du nœud, sans couture.
    const hue = 0.5 - 0.5 * Math.cos(t * 3);

    for (let k = 0; k < AROUND; k++) {
      const theta = ((k + 0.5 * (j % 2) + 0.3 * (rand() - 0.5)) / AROUND) * 2 * Math.PI;
      const n = normalize([
        Math.cos(theta) * normal[0] + Math.sin(theta) * binormal[0],
        Math.cos(theta) * normal[1] + Math.sin(theta) * binormal[1],
        Math.cos(theta) * normal[2] + Math.sin(theta) * binormal[2],
      ]);
      const around = cross(n, tangent);
      const p: V3 = [c[0] + TUBE * n[0], c[1] + TUBE * n[1], c[2] + TUBE * n[2]];
      const size = 0.75 + 0.5 * rand();
      push(p, hue, [tangent, around, n], [0.011 * size, 0.017 * size, 0.0025], 0.9);
    }
  }

  // La poussière : de petites gaussiennes rondes, étalées en largeur pour
  // occuper le bandeau, plus rares près du nœud.
  for (let k = 0; k < DUST; k++) {
    const u = rand() * 2 * Math.PI;
    const v = Math.acos(2 * rand() - 1);
    const r = 1.15 + 1.4 * rand() ** 1.5;
    const p: V3 = [2.2 * r * Math.sin(v) * Math.cos(u), 0.75 * r * Math.cos(v), r * Math.sin(v) * Math.sin(u)];
    const n = normalize([rand() - 0.5, rand() - 0.5, rand() - 0.5]);
    const a = normalize(cross(n, [0, 1, 0]));
    const s = 0.004 + 0.008 * rand();
    push(p, rand(), [a, cross(n, a), n], [s, s, s], 0.35 + 0.5 * rand(), 1);
  }

  return { data, count, radius };
}

/**
 * Le tri du moteur OpenGL, sans un changement de méthode : profondeur en vue
 * quantifiée sur 65 536 cases, histogramme, somme préfixe, répartition. Les
 * plus lointaines d'abord — l'opérateur « over » compose de l'arrière vers
 * l'avant. `view` est une matrice 4×4 en colonnes, comme en WGSL.
 */
export function createSorter(scene: Scene) {
  const bins = new Uint16Array(scene.count);
  const counts = new Uint32Array(65536);
  const order = new Uint32Array(scene.count);

  return (view: Float32Array): Uint32Array<ArrayBuffer> => {
    const { data, count, radius } = scene;
    // Centre de la scène à l'origine : sa profondeur est la translation.
    const zMin = view[14]! - radius;
    const zScale = 65535 / Math.max(2 * radius, 1e-6);

    for (let i = 0; i < count; i++) {
      const o = i * FLOATS;
      const z = view[2]! * data[o]! + view[6]! * data[o + 1]! + view[10]! * data[o + 2]! + view[14]!;
      bins[i] = Math.min(Math.max((z - zMin) * zScale, 0), 65535);
    }

    counts.fill(0);
    for (let i = 0; i < count; i++) counts[bins[i]!]!++;

    let offset = 0;
    for (let b = 0; b < 65536; b++) {
      const c = counts[b]!;
      counts[b] = offset;
      offset += c;
    }

    for (let i = 0; i < count; i++) order[counts[bins[i]!]!++] = i;
    return order;
  };
}

/**
 * La caméra : le nœud tourne sur son axe, vu en plongée. Renvoie la matrice
 * de vue (en colonnes) — rotation `spin` autour de z, inclinaison `tilt`
 * autour de x, puis recul de `DISTANCE`.
 */
export const DISTANCE = 4;
/** L'inclinaison, et la pose de départ — celle de l'image de repli aussi. */
export const TILT = -0.95;
export const START_SPIN = 0.4;

export function viewMatrix(spin: number, tilt: number): Float32Array<ArrayBuffer> {
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  // Rx(tilt) · Rz(spin), puis translation (0, 0, −DISTANCE).
  return new Float32Array([
    cs, ct * ss, st * ss, 0,
    -ss, ct * cs, st * cs, 0,
    0, -st, ct, 0,
    0, 0, -DISTANCE, 1,
  ]);
}

/** La focale, en pixels, pour que le nœud tienne dans la hauteur du cadre. */
export const focalFor = (height: number) => height * 1.55;

/** La lumière, en repère vue : en haut à gauche, un peu devant. */
export const LIGHT: V3 = normalize([-0.7, 0.6, 0.4]);

/** Le ton qu'ombrent le tramage et les hachures : 0 = ombre, 1 = plein jour. */
export const tone = (lambert: number) => 0.06 + 0.94 * lambert;
