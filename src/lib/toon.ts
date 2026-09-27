/**
 * Le cel shading de ToonGL (`pogl/`), recalculé pour le cours.
 *
 * Chaque fonction reproduit un morceau du code du projet, avec ses constantes :
 * la rampe de `build_lightness_ramp` (quantification sur 8 bits et lecture au
 * plus proche comprises), le terme de rim de `fragment.shd`, les deux filtres
 * de contour et la passe de god rays de `post_fragment.shd`. Les schémas sont
 * rendus avec ces fonctions, sur de petites scènes calculées ici — ils montrent
 * ce que fait le code, pas ce qu'on croit qu'il fait.
 */

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const normalize = (a: V3): V3 => {
  const n = Math.hypot(...a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

/* ── La rampe ─────────────────────────────────────────────────────────── */

/** Les réglages du projet (`main.cc`) : 4 niveaux, plancher 0,2 pour l'écorce, 0,4 ailleurs. */
export const RAMP = { levels: 4, barkFloor: 0.2, foliageFloor: 0.4, texels: 256 };

/** `build_lightness_ramp`, texel par texel : ce que contient la texture 256 × 1. */
export function rampTexels(levels = RAMP.levels, minShade = RAMP.barkFloor): number[] {
  return Array.from({ length: RAMP.texels }, (_, x) => {
    const t = x / 255;
    const q = Math.min(1, Math.floor(t * levels) / (levels - 1));
    const factor = minShade + (1 - minShade) * q;
    return Math.trunc(Math.min(255, factor * 255)) / 255; // stocké sur 8 bits
  });
}

/** Lecture `GL_NEAREST` de la rampe en u = N·L : le texel qui contient u. */
export function sampleRamp(ndotl: number, texels = rampTexels()): number {
  const u = Math.min(1, Math.max(0, ndotl));
  return texels[Math.min(RAMP.texels - 1, Math.floor(u * RAMP.texels))];
}

/** Les seuils de N·L où la bande change, et la valeur de chaque bande. */
export function bands(texels = rampTexels()) {
  const out: { from: number; value: number }[] = [];
  texels.forEach((v, x) => {
    if (!out.length || out.at(-1)!.value !== v) out.push({ from: x / RAMP.texels, value: v });
  });
  return out;
}

/* ── Le rim ───────────────────────────────────────────────────────────── */

export const RIM = { low: 0.6, high: 0.8 };

/** L'assombrissement de bord, pour un angle θ (degrés) entre la normale et la vue. */
export const rimEdge = (thetaDeg: number) => smoothstep(RIM.low, RIM.high, 1 - Math.cos((thetaDeg * Math.PI) / 180));

/** L'angle où rim = s : 1 − cos θ = s. */
export const rimAngle = (s: number) => (Math.acos(1 - s) * 180) / Math.PI;

/* ── Les contours ─────────────────────────────────────────────────────── */

export const OUTLINE = { edgeLow: 0.12, edgeHigh: 0.35, normalLow: 0.3, normalHigh: 0.8 };

export interface Pixel {
  /** Position en repère caméra (z < 0 devant la caméra). */
  p: V3;
  /** Profondeur linéaire, −z : ce que rend `linearize()`. */
  lin: number;
  /** Normale vraie de la surface touchée, pour l'ombrage. */
  n: V3;
  /** 0 fond, 1 sol, 2 cube. */
  id: number;
}

/**
 * Une petite scène lancée en rayons, en perspective : un mur au fond, un sol,
 * et un cube tourné de 45° dont l'arête verticale fait face à la caméra. Le
 * contour de l'arête n'a pas de saut de profondeur — seul le filtre des
 * normales la voit ; la silhouette du cube sur le mur, elle, est un saut de
 * profondeur. C'est ce qui justifie les deux filtres.
 */
export function edgeScene(w = 64, h = 40): Pixel[][] {
  const fov = (50 * Math.PI) / 180;
  const k = Math.tan(fov / 2);
  const aspect = w / h;
  const cube = { c: [0.2, -0.35, -6] as V3, half: 1, angle: Math.PI / 4 };
  const cosA = Math.cos(cube.angle);
  const sinA = Math.sin(cube.angle);
  const toCube = (v: V3): V3 => [cosA * v[0] - sinA * v[2], v[1], sinA * v[0] + cosA * v[2]];
  const fromCube = (v: V3): V3 => [cosA * v[0] + sinA * v[2], v[1], -sinA * v[0] + cosA * v[2]];
  const floorY = -1.35;
  const wallZ = -13;

  return Array.from({ length: h }, (_, j) =>
    Array.from({ length: w }, (_, i) => {
      const x = (2 * (i + 0.5) / w - 1) * k * aspect;
      const y = (1 - 2 * (j + 0.5) / h) * k;
      const d = normalize([x, y, -1]);
      let best = { t: Infinity, n: [0, 0, 1] as V3, id: 0 };

      // Le mur du fond.
      const tw = wallZ / d[2];
      if (tw > 0) best = { t: tw, n: [0, 0, 1], id: 0 };
      // Le sol.
      if (d[1] < 0) {
        const tf = floorY / d[1];
        if (tf > 0 && tf < best.t) best = { t: tf, n: [0, 1, 0], id: 1 };
      }
      // Le cube, par la méthode des dalles dans son repère.
      const o = toCube(sub([0, 0, 0], cube.c));
      const dd = toCube(d);
      let t0 = -Infinity;
      let t1 = Infinity;
      let axis = 0;
      for (let a = 0; a < 3; a++) {
        const inv = 1 / dd[a];
        let ta = (-cube.half - o[a]) * inv;
        let tb = (cube.half - o[a]) * inv;
        if (ta > tb) [ta, tb] = [tb, ta];
        if (ta > t0) {
          t0 = ta;
          axis = a;
        }
        t1 = Math.min(t1, tb);
      }
      if (t0 <= t1 && t0 > 0 && t0 < best.t) {
        const nl: V3 = [0, 0, 0];
        nl[axis] = -Math.sign(dd[axis]);
        best = { t: t0, n: fromCube(nl), id: 2 };
      }
      const p: V3 = [d[0] * best.t, d[1] * best.t, d[2] * best.t];
      return { p, lin: -p[2], n: best.n, id: best.id };
    })
  );
}

const at = (g: Pixel[][], i: number, j: number) =>
  g[Math.min(g.length - 1, Math.max(0, j))][Math.min(g[0].length - 1, Math.max(0, i))];

/** `edge_strength` : somme des écarts de profondeur linéaire aux 4 voisins, divisée par la profondeur. */
export function depthEdge(g: Pixel[][], i: number, j: number) {
  const dc = at(g, i, j).lin;
  const nb = [at(g, i + 1, j), at(g, i - 1, j), at(g, i, j + 1), at(g, i, j - 1)];
  return nb.reduce((e, q) => e + Math.abs(q.lin - dc), 0) / dc;
}

/** `reconstruct_normal` : la plus proche des deux différences, sur chaque axe. */
export function reconstructNormal(g: Pixel[][], i: number, j: number): V3 {
  const P = at(g, i, j).p;
  const Pr = at(g, i + 1, j).p;
  const Pl = at(g, i - 1, j).p;
  // En texture, +y est vers le haut de l'image : la ligne du dessus.
  const Pu = at(g, i, j - 1).p;
  const Pd = at(g, i, j + 1).p;
  const ddx = Math.abs(Pr[2] - P[2]) < Math.abs(P[2] - Pl[2]) ? sub(Pr, P) : sub(P, Pl);
  const ddy = Math.abs(Pu[2] - P[2]) < Math.abs(P[2] - Pd[2]) ? sub(Pu, P) : sub(P, Pd);
  return normalize(cross(ddx, ddy));
}

/** `normal_edge_strength` : somme de 1 − n·n' aux 4 voisins. */
export function normalEdge(g: Pixel[][], i: number, j: number) {
  const nc = reconstructNormal(g, i, j);
  const nb = [
    reconstructNormal(g, i + 1, j),
    reconstructNormal(g, i - 1, j),
    reconstructNormal(g, i, j + 1),
    reconstructNormal(g, i, j - 1),
  ];
  return nb.reduce((e, n) => e + 1 - dot(nc, n), 0);
}

/** Les trois cartes du post-traitement, et le contour final = max des deux. */
export function outlines(g: Pixel[][]) {
  const map = (f: (i: number, j: number) => number) => g.map((row, j) => row.map((_, i) => f(i, j)));
  const depth = map((i, j) => smoothstep(OUTLINE.edgeLow, OUTLINE.edgeHigh, depthEdge(g, i, j)));
  const normal = map((i, j) => smoothstep(OUTLINE.normalLow, OUTLINE.normalHigh, normalEdge(g, i, j)));
  const outline = depth.map((row, j) => row.map((v, i) => Math.max(v, normal[j][i])));
  return { depth, normal, outline };
}

/* ── Les god rays ─────────────────────────────────────────────────────── */

/** Les réglages par défaut de `post_fragment.shd`. */
export const RAYS = { samples: 100, density: 0.9, decay: 0.96, weight: 0.5, exposure: 0.25 };

/** Le poids de l'échantillon i, avant exposition : weight · decayⁱ. */
export const rayWeight = (i: number, decay = RAYS.decay) => RAYS.weight * decay ** i;

/** Somme des decayⁱ sur la marche : le nombre d'échantillons « à plein poids » qu'elle vaut. */
export const effectiveSamples = (decay = RAYS.decay, n = RAYS.samples) => (1 - decay ** n) / (1 - decay);

/**
 * Une scène au couchant, en luminance HDR : un ciel en dégradé, un soleil et
 * son halo au-dessus de 1, une ligne de pins et le sol, sombres. Seul ce qui
 * dépasse 1 éclaire les rayons — c'est la raison du tampon RGB16F.
 */
export function raysScene(w = 80, h = 50) {
  // Le soleil bas, derrière la canopée : les trouées entre les pins font les
  // faisceaux, comme sur le rendu du projet au couchant.
  const sun = { x: 44, y: 20 };
  const groundY = 42;
  const pines = [
    { x: 6, top: 14, half: 6 },
    { x: 17, top: 8, half: 7 },
    { x: 29, top: 15, half: 5 },
    { x: 38, top: 6, half: 6 },
    { x: 51, top: 14, half: 7 },
    { x: 60, top: 9, half: 6 },
    { x: 66, top: 16, half: 5 },
    { x: 75, top: 10, half: 6 },
  ];
  // Des branches par étages : un pin plein ne laisserait passer aucun rayon.
  const tree = (x: number, y: number) =>
    pines.some((p) => {
      if (y < p.top || y >= groundY) return false;
      const t = (y - p.top) / (groundY - p.top);
      const tier = ((y - p.top) % 5) / 5;
      const half = t * p.half * (0.55 + 0.45 * tier) + 0.6;
      return Math.abs(x - p.x) <= half || Math.abs(x - p.x) <= 0.6;
    });
  const img = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      if (y >= groundY) return 0.1;
      if (tree(x + 0.5, y + 0.5)) return 0.05;
      const d2 = (x + 0.5 - sun.x) ** 2 + (y + 0.5 - sun.y) ** 2;
      const sky = 0.3 + 0.45 * (1 - y / groundY);
      return d2 <= 9 ? 3 : sky + 1.7 * Math.exp(-d2 / 110);
    })
  );
  return { img, sun, w, h };
}

/** La passe du projet, pixel par pixel : 100 pas vers le soleil, seul l'excès au-dessus de 1 compte. */
export function godRays(scene: ReturnType<typeof raysScene>) {
  const { img, sun, w, h } = scene;
  const sample = (u: number, v: number) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor(v * h)));
    return img[y][x];
  };
  const su = sun.x / w;
  const sv = sun.y / h;
  return img.map((row, y) =>
    row.map((_, x) => {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      const du = ((u - su) * RAYS.density) / RAYS.samples;
      const dv = ((v - sv) * RAYS.density) / RAYS.samples;
      let cu = u;
      let cv = v;
      let illum = 1;
      let rays = 0;
      for (let i = 0; i < RAYS.samples; i++) {
        cu -= du;
        cv -= dv;
        const s = sample(cu, cv);
        const bright = Math.max(0, s - 1);
        rays += s * bright * illum * RAYS.weight;
        illum *= RAYS.decay;
      }
      return rays * RAYS.exposure;
    })
  );
}

/* ── Les images en pixels ─────────────────────────────────────────────── */

/**
 * Une grille de niveaux (0, 1, 2…) en chemins SVG, un par niveau : chaque
 * plage horizontale d'un même niveau devient un rectangle. `null` = rien.
 */
export function levelPaths(grid: (number | null)[][], scale: number, ox: number, oy: number) {
  const byLevel = new Map<number, string[]>();
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const v = row[x];
      if (v === null) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === v) w++;
      if (!byLevel.has(v)) byLevel.set(v, []);
      byLevel.get(v)!.push(`M${ox + x * scale} ${oy + y * scale}h${w * scale}v${scale}h-${w * scale}z`);
      x += w;
    }
  });
  return [...byLevel].map(([level, d]) => ({ level, d: d.join('') }));
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Une valeur continue en niveau entier 0..n−1, tramée (Bayer 4 × 4) entre les deux voisins. */
export function ditherLevel(v: number, n: number, x: number, y: number) {
  const s = Math.min(n - 1, Math.max(0, v * (n - 1)));
  const base = Math.floor(s);
  return base + (s - base) * 16 > BAYER[y & 3][x & 3] + 0.5 ? Math.min(n - 1, base + 1) : base;
}
