/**
 * L'image de repli du hero, calculée au build : le même nuage, la même
 * caméra, la même projection que `shader-wgsl.ts`, refaits sur le CPU.
 *
 * Elle sert quand WebGPU manque, et pendant le chargement du module. C'est le
 * mode tramage, en masque à un bit : la page la colore avec l'accent du thème
 * (`mask-image` dans `global.css`), si bien qu'une seule image vaut pour les
 * deux thèmes.
 *
 * Le rendu suit `SPLAT` et le mode 1 de `POST` ligne à ligne — Σ′ = J W Σ Wᵀ Jᵀ, le passe-bas de
 * 0,3 px², les axes à 3σ, l'opérateur « over » de l'arrière vers l'avant —
 * sans la jacobienne bornée au bord du champ, inutile sur une image carrée où
 * tout le nœud tient.
 */

import { buildScene, createSorter, focalFor, FLOATS, LIGHT, START_SPIN, TILT, tone, viewMatrix } from './scene';

/** Côté de l'image, et taille d'un pixel de tramage, en pixels. */
export const POSTER_SIZE = 768;
export const POSTER_CELL = 2;

/** Le même seuil de Bayer que `bayer()` en WGSL. */
function bayer(x: number, y: number): number {
  x &= 7;
  y &= 7;
  const q = x ^ y;
  const v =
    ((q & 1) << 5) | ((y & 1) << 4) | ((q & 2) << 2) | ((y & 2) << 1) | ((q & 4) >> 1) | ((y & 4) >> 2);
  return (v + 0.5) / 64;
}

/**
 * Renvoie l'alpha du masque, un octet par pixel (0 ou 255), en lignes de
 * haut en bas.
 */
export function renderPoster(): Uint8Array {
  const size = POSTER_SIZE;
  const scene = buildScene();
  const view = viewMatrix(START_SPIN, TILT);
  const order = createSorter(scene)(view);
  const focal = focalFor(size);
  const half = size / 2;

  // Accumulateurs prémultipliés, comme les deux cibles de `SPLAT` : normale
  // (x, y) et couverture du nœud seul ; couverture de tout, poussière comprise.
  const nx = new Float32Array(size * size);
  const ny = new Float32Array(size * size);
  const cover = new Float32Array(size * size);
  const total = new Float32Array(size * size);

  const m = view;
  const d = scene.data;

  for (let k = 0; k < scene.count; k++) {
    const o = order[k]! * FLOATS;
    const px = d[o]!;
    const py = d[o + 1]!;
    const pz = d[o + 2]!;
    const tx = m[0]! * px + m[4]! * py + m[8]! * pz + m[12]!;
    const ty = m[1]! * px + m[5]! * py + m[9]! * pz + m[13]!;
    const tz = m[2]! * px + m[6]! * py + m[10]! * pz + m[14]!;
    const depth = -tz;
    if (depth <= 0.2) continue;

    // T = J W, deux lignes de trois.
    const j0 = [focal / depth, 0, (focal * tx) / (depth * depth)];
    const j1 = [0, focal / depth, (focal * ty) / (depth * depth)];
    // W en colonnes : W[r][c] = m[c * 4 + r] ; (J W)[i][c] = Σ_r J[i][r] W[r][c].
    const t0 = [0, 1, 2].map((c) => j0[0]! * m[c * 4]! + j0[1]! * m[c * 4 + 1]! + j0[2]! * m[c * 4 + 2]!);
    const t1 = [0, 1, 2].map((c) => j1[0]! * m[c * 4]! + j1[1]! * m[c * 4 + 1]! + j1[2]! * m[c * 4 + 2]!);

    const s = [
      [d[o + 4]!, d[o + 5]!, d[o + 6]!],
      [d[o + 5]!, d[o + 7]!, d[o + 8]!],
      [d[o + 6]!, d[o + 8]!, d[o + 9]!],
    ];
    const ts = (t: number[]) => [0, 1, 2].map((c) => t[0]! * s[0]![c]! + t[1]! * s[1]![c]! + t[2]! * s[2]![c]!);
    const dot3 = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    const a = dot3(ts(t0), t0) + 0.3;
    const b = dot3(ts(t0), t1);
    const c = dot3(ts(t1), t1) + 0.3;
    const det = a * c - b * b;
    if (det <= 0) continue;

    // Boîte englobante de l'ellipse à 3σ.
    const rx = 3 * Math.sqrt(a);
    const ry = 3 * Math.sqrt(c);
    const cx = half + (focal * tx) / depth;
    // L'écran va vers le bas, la vue vers le haut.
    const cy = half - (focal * ty) / depth;

    // Normale en vue, retournée vers la caméra.
    let n = [0, 1, 2].map((r) => m[r]! * d[o + 12]! + m[4 + r]! * d[o + 13]! + m[8 + r]! * d[o + 14]!);
    if (n[0]! * tx + n[1]! * ty + n[2]! * tz > 0) n = n.map((v) => -v);
    const len = Math.hypot(n[0]!, n[1]!, n[2]!);

    const ia = c / det;
    const ib = -b / det;
    const ic = a / det;
    const opacity = d[o + 10]!;
    const isDust = d[o + 15]! > 0.5;

    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(size - 1, Math.ceil(cy + ry)); y++) {
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(size - 1, Math.ceil(cx + rx)); x++) {
        const dx = x + 0.5 - cx;
        // Retour en repère vue (y vers le haut) pour la forme quadratique.
        const dy = cy - (y + 0.5);
        const power = ia * dx * dx + 2 * ib * dx * dy + ic * dy * dy;
        const alpha = Math.min(opacity * Math.exp(-0.5 * power), 0.99);
        if (alpha < 1 / 255) continue;
        const p = y * size + x;
        total[p] = alpha + total[p]! * (1 - alpha);
        if (isDust) continue;
        nx[p] = (n[0]! / len) * alpha + nx[p]! * (1 - alpha);
        ny[p] = (n[1]! / len) * alpha + ny[p]! * (1 - alpha);
        cover[p] = alpha + cover[p]! * (1 - alpha);
      }
    }
  }

  // Le tramage de `POST`, mode 1 : un pixel logique par cellule, lu en son
  // centre.
  const mask = new Uint8Array(size * size);
  const cell = POSTER_CELL;
  for (let cy = 0; cy < size / cell; cy++) {
    for (let cx = 0; cx < size / cell; cx++) {
      const p = (cy * cell + cell / 2) * size + cx * cell + cell / 2;
      const w = cover[p]!;
      const dust = (total[p]! - w) / Math.max(1 - w, 1e-3);
      let lit = dust > 0.5;
      if (w > 0.35) {
        const gx = nx[p]! / w;
        const gy = ny[p]! / w;
        const gz = Math.sqrt(Math.max(1 - gx * gx - gy * gy, 0));
        lit ||= w * tone(Math.max(gx * LIGHT[0] + gy * LIGHT[1] + gz * LIGHT[2], 0)) > bayer(cx, cy);
      }
      if (!lit) continue;
      for (let y = 0; y < cell; y++) {
        const start = (cy * cell + y) * size + cx * cell;
        mask.fill(255, start, start + cell);
      }
    }
  }
  return mask;
}
