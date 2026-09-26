/**
 * De quoi tracer les figures du banc d'essai en SVG : échelles, graduations,
 * et lignes de niveau.
 *
 * Tout se passe à la compilation. Les composants de `src/components/plots/`
 * reçoivent des nombres et rendent du SVG sans une couleur écrite : les séries
 * prennent une classe (`s-fr`, `s-bfgs`…), et c'est `global.css` qui leur
 * donne la couleur du thème.
 *
 * Chaque panneau est dessiné pour 360 unités de large. C'est la largeur à
 * laquelle il s'affiche à peu près partout — une colonne sur téléphone, un
 * tiers ou une moitié de page sur écran large —, si bien que les libellés
 * gardent une taille lisible sans jamais grossir démesurément.
 */

export const PANEL = { width: 360, height: 250 };

/** Les marges intérieures du panneau, où vivent les axes et le titre. */
export const MARGIN = { top: 26, right: 12, bottom: 38, left: 46 };

export type Scale = ((v: number) => number) & { ticks: number[]; log: boolean };

/** Une échelle linéaire ou logarithmique, de [lo, hi] vers [a, b]. */
export function scale(
  [lo, hi]: [number, number],
  [a, b]: [number, number],
  log = false
): Scale {
  const t = log ? Math.log10 : (v: number) => v;
  const [tl, th] = [t(lo), t(hi)];
  const f = ((v: number) => a + ((t(v) - tl) / (th - tl)) * (b - a)) as Scale;
  f.log = log;
  f.ticks = log ? decadeTicks(lo, hi) : niceTicks(lo, hi);
  return f;
}

/** Les puissances de dix comprises dans l'intervalle, une sur deux si elles sont trop nombreuses. */
function decadeTicks(lo: number, hi: number) {
  const out: number[] = [];
  for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) out.push(10 ** e);
  if (out.length <= 6) return out;
  const step = Math.ceil(out.length / 6);
  return out.filter((_, i) => i % step === 0);
}

/** Des graduations « rondes » — 1, 2 ou 5 fois une puissance de dix. */
function niceTicks(lo: number, hi: number, target = 5) {
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}

/** Un libellé de graduation : 10ⁿ en exposant pour une échelle log, sinon le nombre. */
export function tickLabel(v: number, log: boolean) {
  if (log) {
    const e = Math.round(Math.log10(v));
    if (e >= 0 && e <= 3) return String(10 ** e);
    const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const exp = String(Math.abs(e))
      .split('')
      .map((d) => sup[+d])
      .join('');
    return `10${e < 0 ? '⁻' : ''}${exp}`;
  }
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Une polyligne SVG, en sautant les points hors des nombres finis. */
export const points = (xs: [number, number][]) =>
  xs
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

/* ── Lignes de niveau ──────────────────────────────────────────────── */

/**
 * Les lignes de niveau d'une fonction 2D, par l'algorithme des carrés
 * marchants : la fonction est échantillonnée sur une grille, et dans chaque
 * case on relie les points où elle franchit le niveau, par interpolation
 * linéaire sur les arêtes. Les segments sont rendus tels quels — une ligne
 * de niveau n'a pas besoin d'être un chemin continu pour se lire.
 */
export function contours(
  f: (x: number, y: number) => number,
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
  levels: number[],
  sx: (x: number) => number,
  sy: (y: number) => number,
  resolution = 90
): string[] {
  const nx = resolution;
  const ny = Math.round((resolution * (y1 - y0)) / (x1 - x0)) || resolution;
  const X = (i: number) => x0 + ((x1 - x0) * i) / nx;
  const Y = (j: number) => y0 + ((y1 - y0) * j) / ny;
  const grid = Array.from({ length: nx + 1 }, (_, i) =>
    Array.from({ length: ny + 1 }, (_, j) => f(X(i), Y(j)))
  );

  return levels.map((level) => {
    const segs: string[] = [];
    const at = (xa: number, ya: number, va: number, xb: number, yb: number, vb: number) => {
      const t = (level - va) / (vb - va);
      return [sx(xa + t * (xb - xa)), sy(ya + t * (yb - ya))] as const;
    };
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const [a, b, c, d] = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
        const [xa, xb, ya, yb] = [X(i), X(i + 1), Y(j), Y(j + 1)];
        const cross: (readonly [number, number])[] = [];
        if (a < level !== b < level) cross.push(at(xa, ya, a, xb, ya, b));
        if (b < level !== c < level) cross.push(at(xb, ya, b, xb, yb, c));
        if (c < level !== d < level) cross.push(at(xb, yb, c, xa, yb, d));
        if (d < level !== a < level) cross.push(at(xa, yb, d, xa, ya, a));
        for (let k = 0; k + 1 < cross.length; k += 2)
          segs.push(
            `M${cross[k][0].toFixed(1)},${cross[k][1].toFixed(1)}L${cross[k + 1][0].toFixed(1)},${cross[k + 1][1].toFixed(1)}`
          );
      }
    return segs.join('');
  });
}
