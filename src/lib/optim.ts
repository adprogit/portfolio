/**
 * Le banc d'essai des méthodes de descente, recalculé à la compilation.
 *
 * Le rapport OCVX n'a pas laissé de code : ses figures étaient des PNG sur fond
 * blanc, figées. Ce module refait les expériences de ses parties 2 et 3 en
 * suivant le protocole qu'il décrit, et les schémas de la note les tracent en
 * SVG, dans les couleurs du thème. Les chiffres de la note sont ceux calculés
 * ici — proches de ceux du rapport, pas forcément identiques.
 *
 * Tout est déterministe : un générateur pseudo-aléatoire à graine fixe
 * (mulberry32) tire les matrices et les points de départ, donc deux
 * compilations donnent les mêmes figures au bit près.
 *
 * Le module n'importe rien : il peut tourner seul sous Node
 * (`node --experimental-strip-types src/lib/optim.ts`) pour lire les chiffres.
 */

/* ── Vecteurs ──────────────────────────────────────────────────────── */

export type V = Float64Array;

const vec = (n: number) => new Float64Array(n);
const dot = (a: V, b: V) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};
const norm = (a: V) => Math.sqrt(dot(a, a));
/** a + k·b, dans un nouveau vecteur. */
const axpy = (a: V, k: number, b: V) => {
  const r = vec(a.length);
  for (let i = 0; i < a.length; i++) r[i] = a[i] + k * b[i];
  return r;
};
const scaled = (a: V, k: number) => axpy(vec(a.length), k, a);
const sub = (a: V, b: V) => axpy(a, -1, b);

/* ── Hasard reproductible ──────────────────────────────────────────── */

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Une gaussienne par Box-Muller, à partir d'un tirage uniforme. */
const gauss = (rand: () => number) =>
  Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

/* ── Problèmes ─────────────────────────────────────────────────────── */

export interface Problem {
  n: number;
  f: (x: V) => number;
  g: (x: V) => V;
  /** Minimum(s) global(aux) connu(s), pour mesurer l'erreur. */
  minima: V[];
}

const v = (...xs: number[]) => Float64Array.from(xs);

/** Quadratique ½xᵀAx − bᵀx, A dense symétrique définie positive. */
export interface Quadratic extends Problem {
  A: Float64Array[];
  b: V;
}

function quadratic(A: Float64Array[], xStar: V): Quadratic {
  const n = A.length;
  const mul = (x: V) => {
    const r = vec(n);
    for (let i = 0; i < n; i++) r[i] = dot(A[i], x);
    return r;
  };
  const b = mul(xStar);
  return {
    n,
    A,
    b,
    /*
     * ½(x − x*)ᵀA(x − x*), et non ½xᵀAx − bᵀx : même gradient, mais un minimum
     * qui vaut 0. Sous la seconde forme, f* est de l'ordre de −10 et, près de
     * l'optimum, la décroissance qu'exige Armijo (~‖∇f‖², soit 10⁻¹⁶) passe
     * sous la précision de f — la recherche linéaire refuse tout, et BFGS comme
     * la descente de gradient semblaient échouer sur des problèmes faciles.
     */
    f: (x) => {
      const e = sub(x, xStar);
      return 0.5 * dot(e, mul(e));
    },
    g: (x) => sub(mul(x), b),
    minima: [xStar],
  };
}

export const diagQuadratic = (d: number[], xStar: V) =>
  quadratic(
    d.map((di, i) => {
      const row = vec(d.length);
      row[i] = di;
      return row;
    }),
    xStar
  );

/**
 * Une quadratique de dimension n et de conditionnement κ exact : A = Q Λ Qᵀ,
 * valeurs propres réparties géométriquement de 1 à κ, Q orthogonale tirée au
 * hasard (Gram-Schmidt sur une matrice gaussienne). Le rapport tirait A = UᵀU
 * avec U triangulaire aléatoire, ce qui ne fixe pas κ ; ici le conditionnement
 * est le paramètre, donc il est posé.
 */
export function randomQuadratic(n: number, kappa: number, seed: number): Quadratic {
  const rand = mulberry32(seed);
  const Q: V[] = [];
  for (let j = 0; j < n; j++) {
    let q = vec(n);
    for (let i = 0; i < n; i++) q[i] = gauss(rand);
    for (const p of Q) q = axpy(q, -dot(q, p), p);
    Q.push(scaled(q, 1 / norm(q)));
  }
  const lambda = Array.from({ length: n }, (_, i) =>
    n === 1 ? 1 : Math.pow(kappa, i / (n - 1))
  );
  const A = Array.from({ length: n }, () => vec(n));
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += Q[j][i] * lambda[j] * Q[j][k];
      A[i][k] = s;
    }
  const xStar = vec(n);
  for (let i = 0; i < n; i++) xStar[i] = gauss(rand);
  return quadratic(A, xStar);
}

export const rosenbrock: Problem = {
  n: 2,
  f: (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
  g: (x) =>
    v(-2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] ** 2), 200 * (x[1] - x[0] ** 2)),
  minima: [v(1, 1)],
};

/** Gradient par différences centrées, pour la seule fonction sans dérivée écrite. */
const numeric = (f: (x: V) => number) => (x: V) => {
  const h = 1e-6;
  const r = vec(x.length);
  for (let i = 0; i < x.length; i++) {
    const a = Float64Array.from(x);
    const b = Float64Array.from(x);
    a[i] += h;
    b[i] -= h;
    r[i] = (f(a) - f(b)) / (2 * h);
  }
  return r;
};

/** Les fonctions non convexes du banc FR / PR, avec leur boîte de tirage. */
export const nonConvex: { name: string; problem: Problem; box: [number, number][] }[] = [
  {
    name: 'Himmelblau',
    box: [[-5, 5], [-5, 5]],
    problem: {
      n: 2,
      f: (x) => (x[0] ** 2 + x[1] - 11) ** 2 + (x[0] + x[1] ** 2 - 7) ** 2,
      g: (x) => {
        const a = x[0] ** 2 + x[1] - 11;
        const b = x[0] + x[1] ** 2 - 7;
        return v(4 * x[0] * a + 2 * b, 2 * a + 4 * x[1] * b);
      },
      minima: [v(3, 2), v(-2.805118, 3.131312), v(-3.77931, -3.283186), v(3.584428, -1.848126)],
    },
  },
  {
    name: 'Beale',
    box: [[-4.5, 4.5], [-4.5, 4.5]],
    problem: {
      n: 2,
      f: (x) =>
        (1.5 - x[0] + x[0] * x[1]) ** 2 +
        (2.25 - x[0] + x[0] * x[1] ** 2) ** 2 +
        (2.625 - x[0] + x[0] * x[1] ** 3) ** 2,
      g: (x) => {
        const [a, b] = [x[0], x[1]];
        const t1 = 1.5 - a + a * b;
        const t2 = 2.25 - a + a * b * b;
        const t3 = 2.625 - a + a * b ** 3;
        return v(
          2 * t1 * (b - 1) + 2 * t2 * (b * b - 1) + 2 * t3 * (b ** 3 - 1),
          2 * t1 * a + 2 * t2 * 2 * a * b + 2 * t3 * 3 * a * b * b
        );
      },
      minima: [v(3, 0.5)],
    },
  },
  {
    name: 'Rastrigin',
    box: [[-5.12, 5.12], [-5.12, 5.12]],
    problem: {
      n: 2,
      f: (x) => 20 + x.reduce((s, xi) => s + xi * xi - 10 * Math.cos(2 * Math.PI * xi), 0),
      g: (x) => x.map((xi) => 2 * xi + 20 * Math.PI * Math.sin(2 * Math.PI * xi)),
      minima: [v(0, 0)],
    },
  },
  {
    name: 'Ackley',
    box: [[-5, 5], [-5, 5]],
    problem: {
      n: 2,
      f: (x) =>
        -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x[0] ** 2 + x[1] ** 2))) -
        Math.exp(0.5 * (Math.cos(2 * Math.PI * x[0]) + Math.cos(2 * Math.PI * x[1]))) +
        Math.E +
        20,
      g: (x) => {
        const r = Math.sqrt(0.5 * (x[0] ** 2 + x[1] ** 2)) || 1e-12;
        const e1 = Math.exp(-0.2 * r);
        const e2 = Math.exp(0.5 * (Math.cos(2 * Math.PI * x[0]) + Math.cos(2 * Math.PI * x[1])));
        return x.map((xi) => (2 * e1 * xi) / r + e2 * Math.PI * Math.sin(2 * Math.PI * xi));
      },
      minima: [v(0, 0)],
    },
  },
  {
    name: 'Three-Hump-Camel',
    box: [[-5, 5], [-5, 5]],
    problem: {
      n: 2,
      f: (x) => 2 * x[0] ** 2 - 1.05 * x[0] ** 4 + x[0] ** 6 / 6 + x[0] * x[1] + x[1] ** 2,
      g: (x) => v(4 * x[0] - 4.2 * x[0] ** 3 + x[0] ** 5 + x[1], x[0] + 2 * x[1]),
      minima: [v(0, 0)],
    },
  },
  {
    name: 'Goldstein-Price',
    box: [[-2, 2], [-2, 2]],
    problem: (() => {
      const f = (x: V) => {
        const [a, b] = [x[0], x[1]];
        return (
          (1 + (a + b + 1) ** 2 * (19 - 14 * a + 3 * a * a - 14 * b + 6 * a * b + 3 * b * b)) *
          (30 + (2 * a - 3 * b) ** 2 * (18 - 32 * a + 12 * a * a + 48 * b - 36 * a * b + 27 * b * b))
        );
      };
      return { n: 2, f, g: numeric(f), minima: [v(0, -1)] };
    })(),
  },
];

/* ── Recherche linéaire et méthodes ────────────────────────────────── */

export interface Run {
  xs: V[];
  grads: number[];
  iterations: number;
  evaluations: number;
  converged: boolean;
}

interface Options {
  tol: number;
  maxIter: number;
  /** Constante d'Armijo et facteur de rétrécissement. */
  c?: number;
  tau?: number;
  /** Pas exact sur quadratique, si fourni. */
  quad?: Quadratic;
}

/**
 * Armijo par rebroussement : on part de η = 1 et on multiplie par τ tant que
 * f(x + ηd) > f(x) + c·η·gᵀd. Au plus 60 essais — au-delà, le pas vaut moins
 * de 10⁻⁶ fois le départ et la direction n'apporte plus rien.
 */
function armijo(p: Problem, x: V, fx: number, g: V, d: V, c: number, tau: number, count: { n: number }) {
  const slope = dot(g, d);
  let eta = 1;
  for (let k = 0; k < 60; k++) {
    count.n++;
    if (p.f(axpy(x, eta, d)) <= fx + c * eta * slope) return eta;
    eta *= tau;
  }
  return eta;
}

function exactStep(q: Quadratic, g: V, d: V) {
  let dAd = 0;
  for (let i = 0; i < q.n; i++) dAd += d[i] * dot(q.A[i], d);
  return -dot(g, d) / dAd;
}

function finish(xs: V[], grads: number[], evaluations: number, tol: number): Run {
  return {
    xs,
    grads,
    iterations: xs.length - 1,
    evaluations,
    converged: grads[grads.length - 1] <= tol,
  };
}

/**
 * Gradient conjugué non linéaire, formule de Fletcher-Reeves ou Polak-Ribière,
 * avec la troncature β ← max(β, 0). Une garde en plus du rapport : si la
 * direction n'est plus une direction de descente (gᵀd ≥ 0), on repart de
 * −g. Sans elle, Armijo n'a rien à trouver le long d'une montée.
 */
export function conjugateGradient(p: Problem, x0: V, beta: 'FR' | 'PR', o: Options): Run {
  let x = Float64Array.from(x0);
  let g = p.g(x);
  let d = scaled(g, -1);
  const xs = [x];
  const grads = [norm(g)];
  const count = { n: 0 };
  const { c = 1e-4, tau = 0.5 } = o;

  for (let k = 0; k < o.maxIter && grads[grads.length - 1] > o.tol; k++) {
    if (dot(g, d) >= 0) d = scaled(g, -1);
    const eta = o.quad ? exactStep(o.quad, g, d) : armijo(p, x, p.f(x), g, d, c, tau, count);
    x = axpy(x, eta, d);
    const g1 = p.g(x);
    const b =
      beta === 'FR' ? dot(g1, g1) / dot(g, g) : dot(g1, sub(g1, g)) / dot(g, g);
    d = axpy(scaled(g1, -1), Math.max(b, 0), d);
    g = g1;
    xs.push(x);
    grads.push(norm(g));
  }
  return finish(xs, grads, count.n, o.tol);
}

/** BFGS sur l'inverse de la hessienne, H₀ = I, recherche d'Armijo. */
export function bfgs(p: Problem, x0: V, o: Options): Run {
  const n = p.n;
  let H = Array.from({ length: n }, (_, i) => {
    const r = vec(n);
    r[i] = 1;
    return r;
  });
  let x = Float64Array.from(x0);
  let g = p.g(x);
  const xs = [x];
  const grads = [norm(g)];
  const count = { n: 0 };
  const { c = 1e-4, tau = 0.5 } = o;

  for (let k = 0; k < o.maxIter && grads[grads.length - 1] > o.tol; k++) {
    const d = vec(n);
    for (let i = 0; i < n; i++) d[i] = -dot(H[i], g);
    const eta = armijo(p, x, p.f(x), g, d, c, tau, count);
    const x1 = axpy(x, eta, d);
    const g1 = p.g(x1);
    const s = sub(x1, x);
    const y = sub(g1, g);
    const sy = dot(s, y);
    if (sy > 1e-12) {
      // H ← (I − ρsyᵀ) H (I − ρysᵀ) + ρssᵀ
      const rho = 1 / sy;
      const Hy = vec(n);
      for (let i = 0; i < n; i++) Hy[i] = dot(H[i], y);
      const yHy = dot(y, Hy);
      H = H.map((row, i) => {
        const r = vec(n);
        for (let j = 0; j < n; j++)
          r[j] = row[j] - rho * (Hy[i] * s[j] + s[i] * Hy[j]) + (rho * rho * yHy + rho) * s[i] * s[j];
        return r;
      });
    }
    x = x1;
    g = g1;
    xs.push(x);
    grads.push(norm(g));
  }
  return finish(xs, grads, count.n, o.tol);
}

/** Descente de gradient, recherche d'Armijo. */
export function gradientDescent(p: Problem, x0: V, o: Options): Run {
  let x = Float64Array.from(x0);
  let g = p.g(x);
  const xs = [x];
  const grads = [norm(g)];
  const count = { n: 0 };
  const { c = 1e-4, tau = 0.5 } = o;
  for (let k = 0; k < o.maxIter && grads[grads.length - 1] > o.tol; k++) {
    const d = scaled(g, -1);
    const eta = armijo(p, x, p.f(x), g, d, c, tau, count);
    x = axpy(x, eta, d);
    g = p.g(x);
    // On ne garde pas tous les points : sur 10⁴ itérations, seul le compte sert.
    grads.push(norm(g));
  }
  xs.push(x);
  return { xs, grads, iterations: grads.length - 1, evaluations: count.n, converged: grads[grads.length - 1] <= o.tol };
}

/** Newton sur quadratique : un pas, x₁ = A⁻¹b (élimination de Gauss). */
export function newton(q: Quadratic, x0: V): Run {
  const n = q.n;
  const M = q.A.map((row, i) => [...row, q.b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const k = M[r][col] / M[col][col];
      for (let j = col; j <= n; j++) M[r][j] -= k * M[col][j];
    }
  }
  const x1 = v(...M.map((row, i) => row[n] / row[i]));
  return {
    xs: [Float64Array.from(x0), x1],
    grads: [norm(q.g(x0)), norm(q.g(x1))],
    iterations: 1,
    evaluations: 0,
    converged: true,
  };
}

/* ── Les expériences ───────────────────────────────────────────────── */

/** Une seule exécution par compilation : les trois langues lisent le même résultat. */
const memo = new Map<string, unknown>();
function once<T>(key: string, run: () => T): T {
  if (!memo.has(key)) memo.set(key, run());
  return memo.get(key) as T;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/** Partie 2, paramètres d'Armijo du rapport : c = 0,4, τ = 0,8. */
const PART2 = { c: 0.4, tau: 0.8 };

/**
 * FR et PR sur quadratiques à pas exact : itérations moyennes (5 matrices par
 * point) en fonction de κ, pour n = 5, 25, 75. Tolérance 10⁻⁵, au plus 2n
 * itérations, comme dans le rapport.
 */
export const frprKappa = () =>
  once('frprKappa', () => {
    const kappas = [10, 30, 100, 300, 1000];
    return [5, 25, 75].map((n) => ({
      n,
      points: kappas.map((kappa) => {
        const runs = (['FR', 'PR'] as const).map((beta) =>
          mean(
            Array.from({ length: 5 }, (_, s) => {
              const q = randomQuadratic(n, kappa, 1000 * n + 17 * s + Math.round(kappa));
              return conjugateGradient(q, vec(n), beta, { tol: 1e-5, maxIter: 2 * n, quad: q }).iterations;
            })
          )
        );
        return { kappa, fr: runs[0], pr: runs[1] };
      }),
    }));
  });

/**
 * FR et PR sur les fonctions non convexes, 100 départs tirés dans la boîte de
 * chaque fonction. Un run réussit s'il atteint ‖∇f‖ ≤ 10⁻⁵ en au plus 1 000
 * itérations **et** à moins de 10⁻² d'un minimum global — un point critique
 * local ne compte pas.
 */
export const frprBatch = () =>
  once('frprBatch', () =>
    nonConvex.map(({ name, problem, box }, fi) => {
      const rand = mulberry32(4242 + fi);
      const starts = Array.from({ length: 100 }, () =>
        v(...box.map(([lo, hi]) => lo + (hi - lo) * rand()))
      );
      const stats = (beta: 'FR' | 'PR') => {
        const ok: { err: number; it: number }[] = [];
        for (const x0 of starts) {
          const r = conjugateGradient(problem, x0, beta, { tol: 1e-5, maxIter: 1000, ...PART2 });
          const x = r.xs[r.xs.length - 1];
          const err = Math.min(...problem.minima.map((m) => norm(sub(x, m))));
          if (r.converged && err < 1e-2) ok.push({ err, it: r.iterations });
        }
        return {
          rate: ok.length / starts.length,
          error: ok.length ? mean(ok.map((o) => o.err)) : NaN,
          iterations: ok.length ? mean(ok.map((o) => o.it)) : NaN,
        };
      };
      return { name, fr: stats('FR'), pr: stats('PR') };
    })
  );

/** FR et PR sur Rosenbrock, 100 départs dans [−2, 2] × [−1, 3]. */
export const frprRosenbrock = () =>
  once('frprRosenbrock', () => {
    const rand = mulberry32(777);
    const starts = Array.from({ length: 100 }, () => v(-2 + 4 * rand(), -1 + 4 * rand()));
    const collect = (beta: 'FR' | 'PR') => {
      const its = starts.map(
        (x0) => conjugateGradient(rosenbrock, x0, beta, { tol: 1e-5, maxIter: 1000, ...PART2 })
      );
      const converged = its.filter((r) => r.converged).map((r) => r.iterations);
      return {
        converged: converged.length,
        median: median(converged),
        mean: mean(converged),
        max: Math.max(...converged),
      };
    };
    return { fr: collect('FR'), pr: collect('PR') };
  });

/** Les deux trajectoires de l'animation, depuis (−1,2 ; 1). */
export const frprPaths = () =>
  once('frprPaths', () => {
    const x0 = v(-1.2, 1);
    const o = { tol: 1e-5, maxIter: 1000, ...PART2 };
    return {
      fr: conjugateGradient(rosenbrock, x0, 'FR', o),
      pr: conjugateGradient(rosenbrock, x0, 'PR', o),
    };
  });

/**
 * Partie 3 : tolérance ‖∇f‖ < 10⁻⁸, et les mêmes réglages d'Armijo que la
 * partie 2 (c = 0,4, τ = 0,8) — un seul protocole pour toute la note. Avec
 * c = 10⁻⁴ et τ = 0,5, PR+ s'enlise sur Rosenbrock à ‖∇f‖ ≈ 1,5·10⁻³ ; avec
 * c = 0,3, c'est FR : voir `lineSearchFragility`.
 */
const PART3 = { tol: 1e-8, maxIter: 500, ...PART2 };

export const quadWell = diagQuadratic([1, 2], v(1, 1));
export const quadIll = diagQuadratic([1, 1000], v(1, 1));

/** Les trajectoires des trois méthodes sur les trois problèmes 2D. */
export const benchPaths = () =>
  once('benchPaths', () => {
    const onQuad = (q: Quadratic, x0: V) => ({
      newton: newton(q, x0),
      fr: conjugateGradient(q, x0, 'FR', { ...PART3, quad: q }),
      pr: conjugateGradient(q, x0, 'PR', { ...PART3, quad: q }),
      bfgs: bfgs(q, x0, PART3),
    });
    /*
     * (−1,2 ; 1), le départ classique. Depuis (−1 ; 1), le gradient pointe
     * exactement vers (1, 1) et le pas coupé en deux y tombe pile : une
     * itération, et rien à comparer.
     */
    const x0r = v(-1.2, 1);
    return {
      well: onQuad(quadWell, v(5, -3)),
      ill: onQuad(quadIll, v(5, 2)),
      rosenbrock: {
        fr: conjugateGradient(rosenbrock, x0r, 'FR', PART3),
        pr: conjugateGradient(rosenbrock, x0r, 'PR', PART3),
        bfgs: bfgs(rosenbrock, x0r, PART3),
      },
    };
  });

/**
 * Itérations en fonction de κ, quadratique de dimension 30. La descente de
 * gradient est plafonnée à 20 000 itérations : au-delà, c'est un échec.
 */
export const benchKappa = () =>
  once('benchKappa', () => {
    const kappas = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000];
    const n = 30;
    return kappas.map((kappa) => {
      const q = randomQuadratic(n, kappa, 30 + kappa);
      const x0 = vec(n);
      const gd = gradientDescent(q, x0, { ...PART3, maxIter: 20000 });
      return {
        kappa,
        newton: 1,
        fr: conjugateGradient(q, x0, 'FR', { ...PART3, quad: q }).iterations,
        pr: conjugateGradient(q, x0, 'PR', { ...PART3, quad: q }).iterations,
        bfgs: bfgs(q, x0, PART3).iterations,
        gd: gd.converged ? gd.iterations : null,
      };
    });
  });

/** Le gradient conjugué à κ = 30, en fonction de la dimension. */
export const benchDimension = () =>
  once('benchDimension', () =>
    [2, 5, 10, 20, 30, 50, 100, 200].map((n) => {
      const q = randomQuadratic(n, 30, 500 + n);
      return {
        n,
        iterations: conjugateGradient(q, vec(n), 'PR', { tol: 1e-8, maxIter: 10 * n, quad: q }).iterations,
      };
    })
  );

/** Erreur et rapport d'erreurs successives sur Rosenbrock, depuis (−1,2 ; 1). */
export const benchRate = () =>
  once('benchRate', () => {
    const { rosenbrock: r } = benchPaths();
    const series = (run: Run) => {
      const e = run.xs.map((x) => norm(sub(x, v(1, 1))));
      const ratio = e.slice(1).map((ek, k) => ek / e[k]);
      return { e, ratio };
    };
    return { fr: series(r.fr), pr: series(r.pr), bfgs: series(r.bfgs) };
  });

/** BFGS sur Rosenbrock depuis (−1,2 ; 1), grille 5 × 5 de réglages d'Armijo. */
export const benchLineSearch = () =>
  once('benchLineSearch', () => {
    const cs = [0.05, 0.1, 0.2, 0.4, 0.49];
    const taus = [0.3, 0.5, 0.7, 0.8, 0.9];
    return {
      cs,
      taus,
      cells: cs.map((c) =>
        taus.map((tau) => {
          const r = bfgs(rosenbrock, v(-1.2, 1), { tol: 1e-8, maxIter: 500, c, tau });
          return { iterations: r.iterations, evaluations: r.evaluations, converged: r.converged };
        })
      ),
    };
  });

/**
 * La fragilité du gradient conjugué non linéaire à la recherche linéaire :
 * FR et PR+ sur Rosenbrock depuis (−1,2 ; 1), pour quelques réglages
 * d'Armijo. Sans les conditions de Wolfe, un réglage raisonnable suffit à
 * faire s'enliser l'une ou l'autre formule.
 */
export const lineSearchFragility = () =>
  once('lineSearchFragility', () =>
    [
      [1e-4, 0.5],
      [0.1, 0.5],
      [0.3, 0.5],
      [0.4, 0.8],
    ].map(([c, tau]) => {
      const o = { tol: 1e-8, maxIter: 500, c, tau };
      const x0 = v(-1.2, 1);
      const fr = conjugateGradient(rosenbrock, x0, 'FR', o);
      const pr = conjugateGradient(rosenbrock, x0, 'PR', o);
      return {
        c,
        tau,
        fr: fr.converged ? fr.iterations : null,
        pr: pr.converged ? pr.iterations : null,
      };
    })
  );
