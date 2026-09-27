/**
 * Les sprites des cartes de projet — un par projet, 32 × 32 pixels, 16 images.
 *
 * Chacun rejoue ce que fait le projet, et le calcule plutôt que de le
 * dessiner : le rayon avance par une vraie marche de sphères, les bandes du
 * cel shading suivent une lumière qui tourne, le masque du U-Net s'affine
 * comme remonte le décodeur, la case du sudoku est résolue. La dernière image
 * résume la scène : c'est elle qui reste affichée quand le mouvement est réduit.
 *
 * Les rôles de couleur sont ceux de `pixel.ts` : `a` accent, `i` encre, `l`
 * trait, `r` filet. L'accent ne prend la couleur du projet qu'au survol.
 */
import { dither, FRAMES, Layer, type Role, type Sprite } from './pixel';

const SIZE = 32;

const frames = (draw: (layer: Layer, f: number) => void) =>
  Array.from({ length: FRAMES }, (_, f) => {
    const layer = new Layer(SIZE);
    draw(layer, f);
    return layer;
  });

const normalize = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
};

/** Trois tons tramés pour une valeur de 0 à 1 : filet, trait, accent. */
const shade = (x: number, y: number, v: number): Role =>
  dither(x, y, v) ? 'a' : dither(x, y, Math.min(1, v * 2.2)) ? 'l' : 'r';

/* ── Rendu & GPU ──────────────────────────────────────────────────────── */

function raymarcher(): Sprite {
  const sphere = { x: 24, y: 14, r: 6 };
  // Un obstacle au-dessus du chemin : le rayon le frôle, ses pas rétrécissent.
  const obstacle = { x: 12, y: 12, r: 4 };
  const groundY = 28;
  const eye = { x: 2, y: 24 };
  const sdf = (x: number, y: number) =>
    Math.min(
      Math.hypot(x - sphere.x, y - sphere.y) - sphere.r,
      Math.hypot(x - obstacle.x, y - obstacle.y) - obstacle.r,
      groundY - y
    );

  const [dx, dy] = normalize([sphere.x - eye.x, sphere.y - eye.y]);
  const steps: { x: number; y: number; d: number }[] = [];
  let t = 0;
  for (let i = 0; i < 16; i++) {
    const x = eye.x + dx * t;
    const y = eye.y + dy * t;
    const d = sdf(x, y);
    steps.push({ x, y, d });
    if (d < 0.6) break;
    t += d;
  }
  const hitAt = steps.at(-1)!;
  if (hitAt.d >= 0.6 || Math.hypot(hitAt.x - sphere.x, hitAt.y - sphere.y) > sphere.r + 1) {
    throw new Error('sprites : le rayon du ray marcher ne touche plus la sphère.');
  }
  const hit = steps.length - 1;
  const ramp = 3;
  if (hit + ramp + 1 > FRAMES) throw new Error('sprites : trop de pas pour tenir en 16 images.');

  const base = new Layer(SIZE)
    .rect(0, groundY, SIZE, 1, 'r')
    .circle(sphere.x, sphere.y, sphere.r, 'l')
    .circle(obstacle.x, obstacle.y, obstacle.r, 'l')
    .rect(eye.x - 1, eye.y, 2, 2, 'i');

  const L = normalize([-0.55, -0.65, 0.52]);
  const lit = (layer: Layer, level: number) => {
    layer.disc(sphere.x, sphere.y, sphere.r, (x, y) => {
      const nx = (x - sphere.x) / sphere.r;
      const ny = (y - sphere.y) / sphere.r;
      const q = Math.min(1, nx * nx + ny * ny);
      return shade(x, y, level * Math.max(0, nx * L[0] + ny * L[1] + Math.sqrt(1 - q) * L[2]));
    });
    for (let x = sphere.x; x <= sphere.x + sphere.r + 3; x++) layer.set(x, groundY, 'l');
  };

  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      const k = Math.min(f, hit);
      for (let s = 0; s < k; s++) layer.set(steps[s].x, steps[s].y, 'l');
      if (f < hit) {
        layer.circle(steps[k].x, steps[k].y, steps[k].d, 'r');
        layer.rect(steps[k].x, steps[k].y, 1, 1, 'a');
      } else {
        lit(layer, Math.min(1, (f - hit + 1) / ramp));
        layer.set(steps[hit].x, steps[hit].y, 'a');
      }
    }),
  };
}

function toongl(): Sprite {
  // Une sphère en cel shading : trois aplats et un contour à l'encre. La
  // lumière fait un tour complet en 16 images, et les bandes la suivent.
  const c = { x: 16, y: 17, r: 10 };
  const base = new Layer(SIZE).rect(0, 29, SIZE, 1, 'r');
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      const a = (2 * Math.PI * f) / FRAMES - Math.PI / 2;
      const L = normalize([Math.cos(a), Math.sin(a) * 0.6 - 0.3, 0.7]);
      layer.disc(c.x, c.y, c.r, (x, y) => {
        const nx = (x - c.x) / c.r;
        const ny = (y - c.y) / c.r;
        const q = nx * nx + ny * ny;
        if (q > 0.8) return 'i';
        const v = nx * L[0] + ny * L[1] + Math.sqrt(1 - q) * L[2];
        return v > 0.72 ? 'a' : v > 0.3 ? 'l' : 'r';
      });
      // Le soleil, sur son orbite.
      const sx = c.x + Math.cos(a) * 14;
      const sy = c.y + (Math.sin(a) * 0.6 - 0.3) * 14;
      layer.rect(sx - 1, sy - 1, 2, 2, 'a');
    }),
  };
}

function cudaMotion(): Sprite {
  // Une scène fixe, une silhouette qui la traverse. Le filtre ne marque que ce
  // qui a bougé : la silhouette en accent, sa position précédente en filet.
  const base = new Layer(SIZE).rect(0, 27, SIZE, 1, 'r');
  // La grille des blocs CUDA (8 × 8), en pointillés discrets.
  for (let y = 4; y < SIZE; y += 8) for (let x = 4; x < SIZE; x += 8) base.set(x, y, 'r');
  // Le décor : un arbre, qui ne bouge pas, donc n'est jamais marqué.
  base.rect(25, 16, 2, 11, 'l').disc(25.5, 13, 4, 'l');

  const walker = (layer: Layer, x: number, f: number, role: Role) => {
    layer.rect(x + 1, 13, 3, 3, role); // tête
    layer.rect(x + 1, 17, 3, 5, role); // corps
    const s = f % 2 === 0 ? 1 : 0; // les jambes alternent
    layer.rect(x + s, 22, 1, 5, role).rect(x + 4 - s, 22, 1, 5, role);
  };
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      // Décalé pour que la dernière image — l'image fixe — la montre au milieu.
      const x = ((f * 2 + 14) % SIZE) - 2;
      walker(layer, x - 2, f + 1, 'r');
      walker(layer, x, f, 'a');
    }),
  };
}

function neuralTexture(): Sprite {
  // À gauche la grille latente (3 × 3 cellules), à droite la texture décodée
  // ligne par ligne, une évaluation du MLP par pixel.
  const latent = { x: 2, y: 11, cell: 3, n: 3 };
  const tex = { x: 15, y: 8, w: 16, h: 16 };
  const wood = (x: number, y: number) => 0.5 + 0.5 * Math.sin(x * 0.55 + 2.2 * Math.sin(y * 0.35));
  const base = new Layer(SIZE).frame(tex.x - 1, tex.y - 1, tex.w + 2, tex.h + 2, 'l');
  for (let j = 0; j < latent.n; j++) {
    for (let i = 0; i < latent.n; i++) {
      const v = wood(i * 5, j * 5);
      base.rect(latent.x + i * latent.cell, latent.y + j * latent.cell, latent.cell, latent.cell, v > 0.5 ? 'l' : 'r');
    }
  }
  base.frame(latent.x - 1, latent.y - 1, latent.n * latent.cell + 2, latent.n * latent.cell + 2, 'i');
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      const rows = Math.min(tex.h, f + 1);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < tex.w; x++) layer.set(tex.x + x, tex.y + y, shade(x, y, wood(x, y)));
      }
      if (f < tex.h) {
        // La ligne en cours de décodage, et la cellule latente qu'elle lit.
        layer.rect(tex.x, tex.y + f, tex.w, 1, 'a');
        const j = Math.min(latent.n - 1, Math.floor((f / tex.h) * latent.n));
        layer.frame(latent.x - 1, latent.y + j * latent.cell - 1, latent.n * latent.cell + 2, latent.cell + 2, 'a');
        layer.rect(13, tex.y + f, 1, 1, 'a');
      }
    }),
  };
}

/* ── Vision & imagerie ────────────────────────────────────────────────── */

function pulmonix(): Sprite {
  // Une coupe de scanner : le thorax, deux poumons (l'air, sombre), la colonne.
  // Une ligne la balaie ; au passage du nodule, il est encadré et scoré.
  const body = { x: 16, y: 16, rx: 14, ry: 10 };
  const nodule = { x: 21, y: 13 };
  const base = new Layer(SIZE);
  for (let k = 0; k < 120; k++) {
    const a = (2 * Math.PI * k) / 120;
    base.set(body.x + body.rx * Math.cos(a), body.y + body.ry * Math.sin(a), 'l');
  }
  const lung = (cx: number) => (x: number, y: number) =>
    ((x - cx) / 5) ** 2 + ((y - 15) / 6.5) ** 2 <= 1 ? (dither(x, y, 0.25) ? 'l' : 'r') : null;
  base.disc(10, 15, 7, lung(10)).disc(22, 15, 7, lung(22));
  base.disc(16, 23, 1.6, 'i');
  base.rect(nodule.x, nodule.y, 2, 2, 'i');

  const scanFrames = 10;
  const scanY = (f: number) => 5 + f * 2.2;
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      if (f < scanFrames) layer.rect(2, scanY(f), 28, 1, 'a');
      if (f >= scanFrames || scanY(f) > nodule.y + 2) {
        layer.frame(nodule.x - 2, nodule.y - 2, 6, 6, 'a');
        const score = Math.min(8, Math.max(1, f - 3));
        layer.rect(nodule.x + 5, nodule.y - 2, score, 1, 'a');
      }
    }),
  };
}

function unet(): Sprite {
  // L'image, puis le masque qui s'affine comme remonte le décodeur : blocs de
  // 8, de 4, de 2, puis au pixel — la résolution de chaque niveau.
  const inside = (x: number, y: number) =>
    ((x - 15) / 9) ** 2 + ((y - 19) / 7) ** 2 <= 1 || // corps
    ((x - 21) / 5) ** 2 + ((y - 11) / 5) ** 2 <= 1 || // tête
    (y >= 4 && y <= 7 && x >= 18 && x <= 19) || // oreilles
    (y >= 4 && y <= 7 && x >= 23 && x <= 24);
  const base = new Layer(SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (inside(x, y)) base.set(x, y, dither(x, y, 0.55) ? 'l' : 'r');
      else if (dither(x * 7 + 3, y * 5 + 1, 0.08)) base.set(x, y, 'r');
    }
  }
  const coverage = (bx: number, by: number, b: number) => {
    let n = 0;
    for (let y = by; y < by + b; y++) for (let x = bx; x < bx + b; x++) n += inside(x, y) ? 1 : 0;
    return n / (b * b);
  };
  const levels = [8, 4, 2, 1];
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      if (f < 4) return;
      const level = levels[Math.min(levels.length - 1, Math.floor((f - 4) / 3))];
      for (let by = 0; by < SIZE; by += level) {
        for (let bx = 0; bx < SIZE; bx += level) {
          if (coverage(bx, by, level) >= 0.5) layer.rect(bx, by, level, level, 'a');
        }
      }
    }),
  };
}

function automata(): Sprite {
  // Trois états, leurs transitions ; un jeton les parcourt. L'état acceptant
  // est cerclé deux fois, comme sur le rendu Graphviz que le projet relit.
  const q = [
    { x: 7, y: 9 },
    { x: 25, y: 9 },
    { x: 16, y: 24 },
  ];
  const r = 4;
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const [ux, uy] = normalize([b.x - a.x, b.y - a.y]);
    return { x0: a.x + ux * (r + 1), y0: a.y + uy * (r + 1), x1: b.x - ux * (r + 1), y1: b.y - uy * (r + 1) };
  };
  const edges = [edge(q[0], q[1]), edge(q[1], q[2]), edge(q[2], q[0])];
  const base = new Layer(SIZE);
  q.forEach((s) => base.circle(s.x, s.y, r, 'l'));
  base.circle(q[2].x, q[2].y, r - 2, 'l');
  edges.forEach((e) => {
    base.line(e.x0, e.y0, e.x1, e.y1, 'r');
    base.rect(e.x1 - 1, e.y1 - 1, 2, 2, 'l');
  });
  base.line(0, q[0].y, q[0].x - r - 1, q[0].y, 'r');
  base.glyph('a', 15, 4, 'i').glyph('b', 23, 17, 'i').glyph('a', 5, 17, 'i');

  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      // Quatre images par transition, puis une pause sur l'état atteint.
      const leg = Math.floor(f / 5) % 3;
      const u = (f % 5) / 4;
      const e = edges[leg];
      if (f % 5 < 4) {
        layer.rect(e.x0 + (e.x1 - e.x0) * u - 1, e.y0 + (e.y1 - e.y0) * u - 1, 2, 2, 'a');
        layer.circle(q[leg].x, q[leg].y, r, 'a');
      } else {
        layer.circle(q[(leg + 1) % 3].x, q[(leg + 1) % 3].y, r, 'a');
      }
      if (f === FRAMES - 1) layer.circle(q[2].x, q[2].y, r, 'a').circle(q[2].x, q[2].y, r - 2, 'a');
    }),
  };
}

function sudoku(): Sprite {
  // Un bloc 3 × 3 : quatre chiffres lus sur la photo, cinq trouvés par le
  // solveur — chaque case vide prend le plus petit chiffre encore libre, ce que
  // le retour arrière trouve en premier sur un bloc isolé.
  const given: (number | null)[] = [5, null, 3, null, 7, null, 9, null, null];
  const free = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !given.includes(d));
  const solved = given.map((d) => d ?? free.shift()!);
  if (new Set(solved).size !== 9) throw new Error('sprites : la case du sudoku n’est pas résolue.');
  const empties = given.flatMap((d, i) => (d === null ? [i] : []));

  const cell = 10;
  const at = (i: number) => ({ x: 1 + (i % 3) * cell + 3, y: 1 + Math.floor(i / 3) * cell + 3 });
  const base = new Layer(SIZE);
  for (const p of [cell, 2 * cell]) base.rect(p, 1, 1, 3 * cell - 1, 'l').rect(1, p, 3 * cell - 1, 1, 'l');
  base.frame(0, 0, 3 * cell + 1, 3 * cell + 1, 'i');
  given.forEach((d, i) => d !== null && base.glyph(String(d), at(i).x, at(i).y, 'i'));

  const scan = 6;
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      if (f < scan) layer.rect(1, 3 + f * 5, 3 * cell - 1, 1, 'a');
      const shown = Math.max(0, Math.min(empties.length, f - scan + 1));
      empties.slice(0, shown).forEach((i) => layer.glyph(String(solved[i]), at(i).x, at(i).y, 'a'));
    }),
  };
}

/* ── Langages & systèmes ──────────────────────────────────────────────── */

function tiger(): Sprite {
  // L'arbre de « a * 2 + 1 » : il se construit du haut vers le bas, puis la
  // vérification de types le remonte, des feuilles à la racine.
  const nodes = [
    { ch: '+', x: 15, y: 3, depth: 0, parent: -1 },
    { ch: '*', x: 8, y: 13, depth: 1, parent: 0 },
    { ch: '1', x: 23, y: 13, depth: 1, parent: 0 },
    { ch: 'a', x: 3, y: 24, depth: 2, parent: 1 },
    { ch: '2', x: 13, y: 24, depth: 2, parent: 1 },
  ];
  const maxDepth = 2;
  const built = (d: number, f: number) => f >= d * 2;
  const typed = (d: number, f: number) => f >= 7 + (maxDepth - d) * 3;
  return {
    size: SIZE,
    base: new Layer(SIZE),
    frames: frames((layer, f) => {
      for (const n of nodes) {
        if (!built(n.depth, f)) continue;
        if (n.parent >= 0) {
          const p = nodes[n.parent];
          layer.line(p.x + 1, p.y + 7, n.x + 1, n.y - 2, typed(n.depth, f) ? 'l' : 'r');
        }
        const role: Role = typed(n.depth, f) ? 'a' : 'i';
        layer.frame(n.x - 2, n.y - 2, 7, 9, typed(n.depth, f) ? 'a' : 'l');
        layer.glyph(n.ch, n.x, n.y, role);
      }
    }),
  };
}

function shell(): Sprite {
  // La commande se tape, puis les octets passent dans le tube et la sortie
  // de b s'allonge. Le prompt est un `>` : un `$` ne se lit pas en 3 × 5.
  const command = '> a|b';
  const typed = command.length;
  const pipe = { x0: 11, x1: 20, y: 17 };
  const base = new Layer(SIZE)
    .frame(1, 12, 10, 11, 'l')
    .frame(21, 12, 10, 11, 'l')
    .glyph('a', 5, 15, 'i')
    .glyph('b', 25, 15, 'i')
    .rect(pipe.x0, pipe.y - 1, pipe.x1 - pipe.x0 + 1, 1, 'r')
    .rect(pipe.x0, pipe.y + 1, pipe.x1 - pipe.x0 + 1, 1, 'r');
  const length = pipe.x1 - pipe.x0 + 1;
  return {
    size: SIZE,
    base,
    frames: frames((layer, f) => {
      const n = Math.min(typed, f + 1);
      layer.text(command.slice(0, n), 2, 3, 'i');
      if (f % 2 === 0 || f >= typed) layer.rect(2 + 4 * n, 3, 2, 5, 'a');
      if (f >= typed) {
        const run = f - typed;
        for (let p = 0; p < 3; p++) layer.set(pipe.x0 + ((run + 4 * p) % length), pipe.y, 'a');
        const out = Math.min(9, run + 1);
        layer.rect(21, 25, Math.min(out, 9), 1, 'i');
        if (out > 3) layer.rect(21, 27, out - 3, 1, 'i');
        if (out > 6) layer.rect(21, 29, out - 6, 1, 'i');
      }
    }),
  };
}

/** Les sprites par projet. Un projet absent n'a pas de sprite. */
export const sprites: Record<string, () => Sprite> = {
  raymarcher,
  toongl,
  'cuda-motion': cudaMotion,
  'neural-texture': neuralTexture,
  pulmonix,
  'unet-coco': unet,
  'automata-vision': automata,
  'raiders-sudoku': sudoku,
  tiger,
  '42sh': shell,
};
