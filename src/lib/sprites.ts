/**
 * Les sprites des lignes de projet — un par famille, en prototype.
 *
 * Chacun rejoue en 16 images, sur une grille de 24 ou 25 pixels, ce que fait
 * le projet, et le calcule plutôt que de le dessiner : le rayon du ray marcher
 * avance par une vraie marche de sphères, la case du sudoku est résolue, le
 * tube du shell a un débit. La dernière image résume la scène : c'est elle
 * qui reste affichée quand le mouvement est réduit.
 */
import { dither, FRAMES, Layer, type Sprite } from './pixel';

const frames = (size: number, draw: (layer: Layer, f: number) => void) =>
  Array.from({ length: FRAMES }, (_, f) => {
    const layer = new Layer(size);
    draw(layer, f);
    return layer;
  });

/* ── Rendu : le ray marcher ───────────────────────────────────────────── */

function raymarcher(): Sprite {
  const size = 24;
  const sphere = { x: 18, y: 11, r: 4 };
  // Un obstacle au-dessus du chemin : le rayon le frôle, ses pas rétrécissent
  // — ce que montre la fig. 03 du cours, en 24 pixels.
  const obstacle = { x: 9, y: 10, r: 3 };
  const groundY = 20;
  const eye = { x: 1, y: 17 };
  const sdf = (x: number, y: number) =>
    Math.min(
      Math.hypot(x - sphere.x, y - sphere.y) - sphere.r,
      Math.hypot(x - obstacle.x, y - obstacle.y) - obstacle.r,
      groundY - y
    );

  // La marche, pour de vrai : on avance de la distance lue, jusqu'à la surface.
  const dir = (() => {
    const dx = sphere.x - eye.x;
    const dy = sphere.y - eye.y;
    const n = Math.hypot(dx, dy);
    return { x: dx / n, y: dy / n };
  })();
  const steps: { x: number; y: number; d: number }[] = [];
  let t = 0;
  for (let i = 0; i < 14; i++) {
    const x = eye.x + dir.x * t;
    const y = eye.y + dir.y * t;
    const d = sdf(x, y);
    steps.push({ x, y, d });
    if (d < 0.6) break;
    t += d;
  }
  if (steps.at(-1)!.d >= 0.6) throw new Error('sprites : le rayon du ray marcher ne touche plus la sphère.');
  const hit = steps.length - 1;
  const ramp = 3;
  if (hit + ramp + 1 > FRAMES) throw new Error('sprites : trop de pas pour tenir en 16 images.');

  const base = new Layer(size)
    .rect(0, groundY, size, 1, 'r')
    .circle(sphere.x, sphere.y, sphere.r, 'l')
    .circle(obstacle.x, obstacle.y, obstacle.r, 'l')
    .set(eye.x, eye.y, 'i');

  // La sphère éclairée (Lambert), tramée en trois tons ; `level` fait monter
  // la lumière sur quelques images après l'impact.
  const L = (() => {
    const v = [-0.55, -0.65, 0.52];
    const n = Math.hypot(...v);
    return v.map((c) => c / n);
  })();
  const lit = (layer: Layer, level: number) => {
    for (let y = sphere.y - sphere.r; y <= sphere.y + sphere.r; y++) {
      for (let x = sphere.x - sphere.r; x <= sphere.x + sphere.r; x++) {
        const nx = (x - sphere.x) / sphere.r;
        const ny = (y - sphere.y) / sphere.r;
        const q = nx * nx + ny * ny;
        if (q > 1) continue;
        const v = level * Math.max(0, nx * L[0] + ny * L[1] + Math.sqrt(1 - q) * L[2]);
        layer.set(x, y, dither(x, y, v) ? 'a' : dither(x, y, Math.min(1, v * 2.2)) ? 'l' : 'r');
      }
    }
    // Son ombre portée sur le sol, du côté opposé à la lumière.
    for (let x = sphere.x + 1; x <= sphere.x + sphere.r + 2; x++) layer.set(x, groundY, 'l');
  };

  return {
    size,
    base,
    frames: frames(size, (layer, f) => {
      const k = Math.min(f, hit);
      for (let s = 0; s < k; s++) layer.set(steps[s].x, steps[s].y, 'l');
      if (f < hit) {
        // Le pas en cours : le point, et la sphère de distance qu'il a lue.
        layer.circle(steps[k].x, steps[k].y, steps[k].d, 'r');
        layer.set(steps[k].x, steps[k].y, 'a');
      } else {
        lit(layer, Math.min(1, (f - hit + 1) / ramp));
        layer.set(steps[hit].x, steps[hit].y, 'a');
      }
    }),
  };
}

/* ── Vision : le sudoku ───────────────────────────────────────────────── */

function sudoku(): Sprite {
  const size = 25;
  // Une case du sudoku (un bloc 3 × 3) : quatre chiffres lus sur la photo.
  const given: (number | null)[] = [5, null, 3, null, 7, null, 9, null, null];
  // Le solveur, réduit à un bloc : chaque case vide prend le plus petit
  // chiffre encore libre — ce que le retour arrière trouve en premier.
  const free = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !given.includes(d));
  const solved = given.map((d) => d ?? free.shift()!);
  if (new Set(solved).size !== 9) throw new Error('sprites : la case du sudoku n’est pas résolue.');
  const empties = given.flatMap((d, i) => (d === null ? [i] : []));

  const at = (i: number) => ({ x: 1 + (i % 3) * 8 + 2, y: 1 + Math.floor(i / 3) * 8 + 1 });
  const base = new Layer(size);
  for (const p of [8, 16]) base.rect(p, 1, 1, size - 2, 'l').rect(1, p, size - 2, 1, 'l');
  base.frame(0, 0, size, size, 'i');
  given.forEach((d, i) => d !== null && base.glyph(String(d), at(i).x, at(i).y, 'i'));

  const scan = 5;
  return {
    size,
    base,
    frames: frames(size, (layer, f) => {
      // D'abord la lecture : une ligne balaie la grille, comme la transformée
      // de Hough la parcourt. Puis les chiffres manquants, un par image.
      if (f < scan) layer.rect(1, 2 + f * 5, size - 2, 1, 'a');
      const shown = Math.max(0, Math.min(empties.length, f - scan + 1));
      empties.slice(0, shown).forEach((i) => layer.glyph(String(solved[i]), at(i).x, at(i).y, 'a'));
    }),
  };
}

/* ── Langages & systèmes : 42sh ───────────────────────────────────────── */

function shell(): Sprite {
  const size = 24;
  // Le prompt en `>` : un `$` ne se lit pas en 3 × 5 pixels.
  const command = '> a|b';
  const typed = command.length;
  const pipe = { x0: 8, x1: 15, y: 12 };

  const base = new Layer(size)
    .frame(1, 8, 7, 9, 'l')
    .frame(16, 8, 7, 9, 'l')
    .glyph('a', 3, 10, 'i')
    .glyph('b', 18, 10, 'i')
    .rect(pipe.x0, pipe.y - 1, pipe.x1 - pipe.x0 + 1, 1, 'r')
    .rect(pipe.x0, pipe.y + 1, pipe.x1 - pipe.x0 + 1, 1, 'r');

  return {
    size,
    base,
    frames: frames(size, (layer, f) => {
      // La commande se tape, un caractère par image, curseur au bout.
      const n = Math.min(typed, f + 1);
      layer.text(command.slice(0, n), 1, 1, 'i');
      if (f % 2 === 0 || f >= typed) layer.rect(1 + 4 * n, 1, 2, 5, 'a');

      // Puis les octets passent dans le tube, et la sortie de b s'allonge.
      if (f >= typed) {
        const run = f - typed;
        for (let p = 0; p < 2; p++) layer.set(pipe.x0 + ((run + 4 * p) % 8), pipe.y, 'a');
        const out = Math.min(6, Math.floor(run / 2) + 1);
        layer.rect(16, 19, out, 1, 'i');
        if (out > 3) layer.rect(16, 21, out - 3, 1, 'i');
      }
    }),
  };
}

/** Les sprites par projet. Un projet absent n'a pas de case. */
export const sprites: Record<string, () => Sprite> = {
  raymarcher,
  'raiders-sudoku': sudoku,
  '42sh': shell,
};
