/**
 * Cours rasterisation — le pipeline OpenGL du sommet au pixel, recalculé.
 *
 * Ce que le cours affirme, ce module le refait : la matrice de projection de
 * POGL (`src/core/matrix4.cc`, `frustum`), la profondeur qu'elle produit, la
 * couverture d'un triangle par fonctions d'arête avec la règle haut-gauche,
 * et l'interpolation des attributs, affine ou corrigée en perspective. Les
 * schémas et les chiffres de la note sortent d'ici ; rien n'est dessiné à la
 * main.
 */

/* ── La caméra de POGL ─────────────────────────────────────────────── */

/** `mygl::frustum(-aspect, aspect, -1, 1, 1.0f, 250.0f)` — `src/core/camera.cc`. */
export const POGL = { near: 1, far: 250, top: 1 } as const;

/** Champ vertical, en degrés, d'un frustum symétrique : 2·atan(top / near). */
export const verticalFov = (top: number, near: number) => (2 * Math.atan(top / near) * 180) / Math.PI;

/** Les coefficients de profondeur de `frustum` : z_clip = k·z_vue + l, w_clip = −z_vue. */
export const depthCoefficients = (near: number, far: number) => ({
  k: -(far + near) / (far - near),
  l: -(2 * far * near) / (far - near),
});

/** z en NDC pour un point à la distance `d` devant la caméra (z_vue = −d). */
export function zNdc(d: number, near: number, far: number): number {
  const { k, l } = depthCoefficients(near, far);
  return (k * -d + l) / d;
}

/** La valeur écrite dans le depth buffer : glDepthRange(0, 1) par défaut. */
export const windowDepth = (d: number, near: number, far: number) => (zNdc(d, near, far) + 1) / 2;

/** La distance à laquelle la moitié de [0, 1] est déjà dépensée : z_ndc = 0. */
export const halfDepthDistance = (near: number, far: number) => (2 * far * near) / (far + near);

/**
 * Le plus petit écart de distance qu'un depth buffer de `bits` bits sait
 * encore séparer à la distance `d` : un pas de 2⁻ᵇⁱᵗˢ divisé par la pente
 * dz_w/dd = f·n / ((f − n)·d²).
 */
export const depthStep = (d: number, near: number, far: number, bits = 24) =>
  (2 ** -bits * (far - near) * d * d) / (far * near);

/* ── Couverture : fonctions d'arête ────────────────────────────────── */

export type P = { x: number; y: number };

/**
 * La fonction d'arête de Pineda : le produit vectoriel (b − a) × (p − a).
 * Elle vaut le double de l'aire signée du triangle (a, b, p) — positive d'un
 * côté de l'arête, négative de l'autre, nulle dessus. Affine en p : d'un
 * pixel au suivant, elle augmente d'une constante.
 */
export const edge = (a: P, b: P, p: P) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

/** Le double de l'aire signée : son signe donne le sens de parcours (le culling). */
export const area2 = (a: P, b: P, c: P) => edge(a, b, c);

/**
 * L'arête (a → b) est-elle « haut » ou « gauche » ? Repère écran, y vers le
 * bas, triangle orienté pour que les fonctions d'arête soient positives à
 * l'intérieur. Une arête haute est horizontale et parcourue vers la gauche,
 * une arête gauche descend vers le haut.
 */
export const isTopLeft = (a: P, b: P) => (a.y === b.y && b.x < a.x) || b.y < a.y;

/** Les sommets dans l'ordre où l'intérieur est positif. */
function oriented(tri: [P, P, P]): [P, P, P] {
  return area2(...tri) > 0 ? tri : [tri[0], tri[2], tri[1]];
}

/**
 * Le centre du pixel (x, y) est-il couvert ? Strictement à l'intérieur, ou
 * posé sur une arête haute ou gauche : un centre sur une arête partagée
 * appartient ainsi à un seul des deux triangles.
 */
export function covers(tri: [P, P, P], x: number, y: number): boolean {
  const [a, b, c] = oriented(tri);
  const p = { x: x + 0.5, y: y + 0.5 };
  return ([[a, b], [b, c], [c, a]] as [P, P][]).every(([u, v]) => {
    const e = edge(u, v, p);
    return e > 0 || (e === 0 && isTopLeft(u, v));
  });
}

/** Le même test, sans règle : un centre sur une arête compte pour les deux. */
export function coversInclusive(tri: [P, P, P], x: number, y: number): boolean {
  const [a, b, c] = oriented(tri);
  const p = { x: x + 0.5, y: y + 0.5 };
  return ([[a, b], [b, c], [c, a]] as [P, P][]).every(([u, v]) => edge(u, v, p) >= 0);
}

/** Coordonnées barycentriques du point p : chaque fonction d'arête sur l'aire. */
export function barycentric(tri: [P, P, P], p: P): [number, number, number] {
  const [a, b, c] = tri;
  const A = area2(a, b, c);
  return [edge(b, c, p) / A, edge(c, a, p) / A, edge(a, b, p) / A];
}

/** La scène du schéma de couverture : deux triangles qui partagent une arête. */
export const coverageScene = () => {
  const w = 16;
  const h = 11;
  // L'arête partagée suit x + y = 14 : elle passe par dix centres de pixel,
  // tous strictement entre ses extrémités (posées hors des centres).
  const q = { x: 12.75, y: 1.25 };
  const p = { x: 3.25, y: 10.75 };
  const t1: [P, P, P] = [{ x: 1.2, y: 1.3 }, q, p];
  const t2: [P, P, P] = [q, { x: 15.4, y: 9.7 }, p];
  // Pour chaque pixel : 0 vide, 1 ou 2 le triangle qui le produit, 3 les deux.
  const owner: number[][] = [];
  let onShared = 0;
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const a = covers(t1, x, y);
      const b = covers(t2, x, y);
      row.push((a ? 1 : 0) + (b ? 2 : 0));
      // Les centres posés sur l'arête partagée, extrémités comprises.
      if (edge(q, p, { x: x + 0.5, y: y + 0.5 }) === 0 && y + 0.5 >= q.y && y + 0.5 <= p.y) onShared++;
    }
    owner.push(row);
  }
  return { w, h, t1, t2, q, p, owner, onShared };
};

/* ── Interpolation : affine ou corrigée en perspective ─────────────── */

/**
 * Un sol en damier vu en perspective, deux triangles, rasterisé en `w × h`.
 * Pour chaque pixel couvert, la case du damier lue avec des (u, v) :
 * - interpolés linéairement à l'écran (ce que faisait la PlayStation) ;
 * - interpolés en u/w, v/w et 1/w, puis divisés (ce que fait OpenGL).
 */
export function perspectiveScene(w = 72, h = 40, checks = 6) {
  const near = 1;
  // Le sol, en repère vue : y = −1, de z = −1,05 (près) à z = −6 (loin).
  const corners = [
    { x: -1, z: -1.05, u: 0, v: 0 },
    { x: 1, z: -1.05, u: 1, v: 0 },
    { x: 1, z: -6, u: 1, v: 1 },
    { x: -1, z: -6, u: 0, v: 1 },
  ];
  // La division perspective, puis un viewport qui cadre le sol dans l'image.
  // Un viewport est affine : il ne change rien aux barycentres à l'écran, ni
  // donc à la comparaison qui suit.
  const ndc = corners.map((c) => ({ x: (c.x * near) / -c.z, y: (-1 * near) / -c.z, w: -c.z, u: c.u, v: c.v }));
  const [x0, x1] = [Math.min(...ndc.map((c) => c.x)), Math.max(...ndc.map((c) => c.x))];
  const [y0, y1] = [Math.min(...ndc.map((c) => c.y)), Math.max(...ndc.map((c) => c.y))];
  const k = Math.min((w - 2) / (x1 - x0), (h - 2) / (y1 - y0));
  const s = ndc.map((c) => ({
    ...c,
    x: w / 2 + (c.x - (x0 + x1) / 2) * k,
    y: h / 2 - (c.y - (y0 + y1) / 2) * k,
  }));
  const tris = [
    [s[0], s[1], s[2]],
    [s[0], s[2], s[3]],
  ] as const;

  const affine: (number | null)[][] = [];
  const correct: (number | null)[][] = [];
  let maxError = 0;
  for (let y = 0; y < h; y++) {
    const ra: (number | null)[] = [];
    const rc: (number | null)[] = [];
    for (let x = 0; x < w; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };
      const tri = tris.find((t) => barycentric([t[0], t[1], t[2]], p).every((l) => l >= 0));
      if (!tri) {
        ra.push(null);
        rc.push(null);
        continue;
      }
      const l = barycentric([tri[0], tri[1], tri[2]], p);
      const ua = l[0] * tri[0].u + l[1] * tri[1].u + l[2] * tri[2].u;
      const va = l[0] * tri[0].v + l[1] * tri[1].v + l[2] * tri[2].v;
      const inv = l[0] / tri[0].w + l[1] / tri[1].w + l[2] / tri[2].w;
      const uc = (l[0] * tri[0].u / tri[0].w + l[1] * tri[1].u / tri[1].w + l[2] * tri[2].u / tri[2].w) / inv;
      const vc = (l[0] * tri[0].v / tri[0].w + l[1] * tri[1].v / tri[1].w + l[2] * tri[2].v / tri[2].w) / inv;
      maxError = Math.max(maxError, Math.hypot(ua - uc, va - vc));
      const cell = (u: number, v: number) =>
        (Math.floor(Math.min(0.9999, u) * checks) + Math.floor(Math.min(0.9999, v) * checks)) % 2;
      ra.push(cell(ua, va));
      rc.push(cell(uc, vc));
    }
    affine.push(ra);
    correct.push(rc);
  }
  return { affine, correct, maxError, checks, diagonal: [s[0], s[2]] };
}
