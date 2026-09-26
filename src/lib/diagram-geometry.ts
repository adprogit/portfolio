/**
 * La géométrie des schémas du cours, exécutée à la compilation.
 *
 * Un schéma de sphere tracing dessiné à la main montre ce que son auteur croit
 * que fait l'algorithme. Celui-ci montre ce qu'il fait : les cercles tracés
 * sont ceux qu'une vraie boucle de marche a parcourus, sur une vraie scène de
 * distances, avec les mêmes constantes que `raymarcher/` (pas relaxé à 0,7,
 * pénombre à k = 32). Si l'algorithme changeait, le schéma changerait avec lui.
 *
 * Tout est en 2D et dans le repère du SVG (y vers le bas) : les schémas sont
 * des coupes, pas des rendus.
 */

export type Vec = readonly [number, number];

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
export const length = (a: Vec) => Math.hypot(a[0], a[1]);
export const normalize = (a: Vec): Vec => scale(a, 1 / (length(a) || 1));

/** Un point formaté pour un attribut SVG, arrondi au dixième. */
export const pt = (p: Vec) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/* ── Champs de distance ──────────────────────────────────────────────── */

export interface Circle {
  c: Vec;
  r: number;
}

export interface Box {
  /** Centre, et demi-côtés. */
  c: Vec;
  h: Vec;
}

export const circleSdf = ({ c, r }: Circle) => (p: Vec) => length(sub(p, c)) - r;

export const boxSdf = ({ c, h }: Box) => (p: Vec) => {
  const q: Vec = [Math.abs(p[0] - c[0]) - h[0], Math.abs(p[1] - c[1]) - h[1]];
  const outside = length([Math.max(q[0], 0), Math.max(q[1], 0)]);
  return outside + Math.min(Math.max(q[0], q[1]), 0);
};

/** L'union : la plus proche des surfaces — ce que fait `get_min_distance`. */
export const union =
  (...fields: ((p: Vec) => number)[]) =>
  (p: Vec) =>
    Math.min(...fields.map((f) => f(p)));

/* ── Sphere tracing ──────────────────────────────────────────────────── */

export interface MarchStep {
  /** Où l'on était. */
  p: Vec;
  /** La distance garantie libre à cet endroit : le rayon du cercle. */
  r: number;
}

/**
 * La boucle de `Scene::march`, en 2D. Mêmes gestes : on lit la distance, on
 * avance de 70 % de cette distance, on s'arrête sous le seuil ou trop loin.
 */
export function sphereTrace(
  origin: Vec,
  direction: Vec,
  sdf: (p: Vec) => number,
  { maxSteps = 64, surfDist = 0.6, maxDist = 2000, relax = 0.7 } = {}
): { steps: MarchStep[]; hit: Vec | null } {
  const dir = normalize(direction);
  const steps: MarchStep[] = [];
  let d = 0;

  for (let i = 0; i < maxSteps; i++) {
    const p = add(origin, scale(dir, d));
    const h = sdf(p);
    if (h < surfDist) return { steps, hit: p };
    steps.push({ p, r: h });
    d += h * relax;
    if (d > maxDist) break;
  }
  return { steps, hit: null };
}

/* ── Ombres douces ───────────────────────────────────────────────────── */

/**
 * La fonction de `Scene::get_shadows`, en 2D : on marche vers la lumière et on
 * retient le plus petit `k·h/t` — à quel point le rayon a frôlé un obstacle,
 * rapporté au chemin déjà fait. 0 = ombre franche, 1 = pleine lumière.
 */
export function softShadow(
  p: Vec,
  light: Vec,
  sdf: (p: Vec) => number,
  { softness = 32, start = 1, surfDist = 0.05, maxSteps = 256 } = {}
): number {
  const toLight = sub(light, p);
  const distToLight = length(toLight);
  const dir = normalize(toLight);
  let t = start;
  let minH = 1e20;

  for (let i = 0; i < maxSteps; i++) {
    const h = sdf(add(p, scale(dir, t)));
    if (h < surfDist) return 0;
    minH = Math.min(minH, (softness * h) / t);
    t += Math.max(h, 0.4);
    if (t >= distToLight - start) break;
  }
  return Math.min(Math.max(minH, 0), 1);
}

/* ── Le lobe de Blinn-Phong ──────────────────────────────────────────── */

/**
 * Le lobe spéculaire `max(cos φ, 0)^ns`, en coordonnées polaires autour d'un
 * axe. Plus `ns` monte, plus il se resserre : c'est tout ce que dit l'exposant.
 */
export function lobePath(center: Vec, axisAngle: number, ns: number, radius: number): string {
  const points: string[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / n;
    const r = radius * Math.pow(Math.max(Math.cos(phi), 0), ns);
    const a = axisAngle + phi;
    points.push(pt([center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)]));
  }
  return `M${points.join(' L')}Z`;
}

/* ── Intersection analytique ─────────────────────────────────────────── */

/** Rayon / cercle, exactement comme l'extrait `courseRaySphere`, en 2D. */
export function raycastCircle(
  origin: Vec,
  direction: Vec,
  { c, r }: Circle
): { disc: number; hits: number[] } {
  const dir = normalize(direction);
  const oc = sub(origin, c);
  const b = dot(oc, dir);
  const cc = dot(oc, oc) - r * r;
  const disc = b * b - cc;
  if (disc < -1e-6) return { disc, hits: [] };
  if (Math.abs(disc) <= 1e-6) return { disc: 0, hits: [-b] };
  const s = Math.sqrt(disc);
  return { disc, hits: [-b - s, -b + s] };
}

/* ── Flèches ─────────────────────────────────────────────────────────── */

/**
 * La pointe d'une flèche, en triangle plein. Dessinée à la main plutôt qu'en
 * `<marker>` : un marqueur SVG ne sait pas prendre la couleur du trait qu'il
 * termine partout (`context-stroke` n'est pas universel), et les flèches
 * doivent suivre le thème comme le reste.
 */
export function arrowHead(from: Vec, to: Vec, size = 7): string {
  const d = normalize(sub(to, from));
  const n: Vec = [-d[1], d[0]];
  const base = sub(to, scale(d, size));
  return [to, add(base, scale(n, size * 0.5)), sub(base, scale(n, size * 0.5))].map(pt).join(' ');
}

/* ── Le cadre ────────────────────────────────────────────────────────── */

/**
 * Où un rayon sort du cadre du schéma. Un rayon « prolongé de 600 » sort du
 * `viewBox` dès qu'il est un peu incliné, et le SVG étant en `overflow:
 * visible`, il irait se poser sur le texte de la page. On le coupe donc au
 * bord, à `margin` près.
 */
export function toFrame(origin: Vec, direction: Vec, [w, h]: Vec, margin = 8): Vec {
  const d = normalize(direction);
  const limits: number[] = [];
  if (d[0] > 0) limits.push((w - margin - origin[0]) / d[0]);
  if (d[0] < 0) limits.push((margin - origin[0]) / d[0]);
  if (d[1] > 0) limits.push((h - margin - origin[1]) / d[1]);
  if (d[1] < 0) limits.push((margin - origin[1]) / d[1]);
  return add(origin, scale(d, Math.min(...limits)));
}

/**
 * `softShadow`, avec sa trace : chaque pas de la marche vers la lumière, et
 * celui où k·h/t a été le plus petit — c'est lui qui fixe la pénombre.
 */
export function softShadowTrace(
  p: Vec,
  light: Vec,
  sdf: (p: Vec) => number,
  { softness = 32, start = 1, surfDist = 0.05, maxSteps = 256 } = {}
): { s: number; steps: MarchStep[]; minIndex: number } {
  const toLight = sub(light, p);
  const distToLight = length(toLight);
  const dir = normalize(toLight);
  const steps: MarchStep[] = [];
  let t = start;
  let minH = 1e20;
  let minIndex = 0;

  for (let i = 0; i < maxSteps; i++) {
    const q = add(p, scale(dir, t));
    const h = sdf(q);
    if (h < surfDist) return { s: 0, steps, minIndex };
    steps.push({ p: q, r: h });
    const ratio = (softness * h) / t;
    if (ratio < minH) {
      minH = ratio;
      minIndex = steps.length - 1;
    }
    t += Math.max(h, 0.4);
    if (t >= distToLight - start) break;
  }
  return { s: Math.min(Math.max(minH, 0), 1), steps, minIndex };
}
