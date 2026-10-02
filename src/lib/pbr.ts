/**
 * Chapitre PBR de la note rasterisation — Cook-Torrance, GGX, IBL, recalculés.
 *
 * Les formules sont celles que la note écrit : la distribution GGX (Walter et
 * al. 2007) et Beckmann pour comparer, Fresnel exact et son approximation de
 * Schlick, le masquage de Smith en Schlick-GGX, et la BRDF intégrée de la
 * « split sum » (Karis 2013), obtenue ici comme dans son code : échantillonnage
 * d'importance de GGX sur une suite de Hammersley.
 */

/** Échantillons par point de la BRDF intégrée : partagé par la figure et le texte. */
export const LUT_SAMPLES = 1024;

/** La reparamétrisation de Disney : α = roughness². */
export const alphaOf = (roughness: number) => roughness * roughness;

/** GGX / Trowbridge-Reitz : D(h) = α² / (π · ((n·h)²(α² − 1) + 1)²). */
export function ggx(nh: number, alpha: number): number {
  const a2 = alpha * alpha;
  const d = nh * nh * (a2 - 1) + 1;
  return a2 / (Math.PI * d * d);
}

/** Beckmann : D(h) = exp((cos²θ − 1)/(α² cos²θ)) / (π α² cos⁴θ). */
export function beckmann(nh: number, alpha: number): number {
  if (nh <= 0) return 0;
  const c2 = nh * nh;
  return Math.exp((c2 - 1) / (alpha * alpha * c2)) / (Math.PI * alpha * alpha * c2 * c2);
}

/** Schlick : F = F₀ + (1 − F₀)(1 − cos)⁵. */
export const schlick = (cos: number, f0: number) => f0 + (1 - f0) * Math.pow(1 - cos, 5);

/** F₀ d'un diélectrique d'indice n, dans l'air : ((n − 1)/(n + 1))². */
export const f0FromIor = (n: number) => ((n - 1) / (n + 1)) ** 2;

/** Fresnel exact, lumière non polarisée, de l'air vers un milieu d'indice n. */
export function fresnelDielectric(cos: number, n: number): number {
  const sin2t = (1 - cos * cos) / (n * n);
  if (sin2t >= 1) return 1;
  const cost = Math.sqrt(1 - sin2t);
  const rs = (cos - n * cost) / (cos + n * cost);
  const rp = (n * cos - cost) / (n * cos + cost);
  return (rs * rs + rp * rp) / 2;
}

/** Le plus grand écart entre Schlick et Fresnel exact, sur tous les angles. */
export function schlickMaxError(n: number, steps = 2000): number {
  const f0 = f0FromIor(n);
  let worst = 0;
  for (let i = 0; i <= steps; i++) {
    const c = i / steps;
    worst = Math.max(worst, Math.abs(schlick(c, f0) - fresnelDielectric(c, n)));
  }
  return worst;
}

/** Smith, en Schlick-GGX : G₁(x) = x / (x(1 − k) + k). */
export const smithG1 = (ndotx: number, k: number) => ndotx / (ndotx * (1 - k) + k);

/** k pour une lumière directe (Karis) : (roughness + 1)² / 8. */
export const kDirect = (roughness: number) => (roughness + 1) ** 2 / 8;

/** k pour l'IBL (Karis) : α / 2. */
export const kIbl = (roughness: number) => alphaOf(roughness) / 2;

/** Le i-ème point de Hammersley sur N : (i/N, inverse binaire de i). */
function hammersley(i: number, n: number): [number, number] {
  let bits = i >>> 0;
  bits = ((bits << 16) | (bits >>> 16)) >>> 0;
  bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
  bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
  bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
  bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;
  return [i / n, bits / 4294967296];
}

/**
 * La BRDF intégrée de la split sum, pour un (n·v, roughness) : renvoie
 * (A, B) tels que ∫ f_spec · (n·l) dl ≈ F₀ · A + B. Même boucle que
 * `IntegrateBRDF` de Karis, en repère tangent (n = z).
 */
export function integrateBrdf(nv: number, roughness: number, samples = 512): [number, number] {
  const v = [Math.sqrt(1 - nv * nv), 0, nv];
  const a = alphaOf(roughness);
  const k = kIbl(roughness);
  let A = 0;
  let B = 0;
  for (let i = 0; i < samples; i++) {
    const [u1, u2] = hammersley(i, samples);
    // Une normale de microfacette tirée selon GGX.
    const phi = 2 * Math.PI * u1;
    const cosT = Math.sqrt((1 - u2) / (1 + (a * a - 1) * u2));
    const sinT = Math.sqrt(1 - cosT * cosT);
    const h = [sinT * Math.cos(phi), sinT * Math.sin(phi), cosT];
    const vh = v[0]! * h[0]! + v[1]! * h[1]! + v[2]! * h[2]!;
    const l = [2 * vh * h[0]! - v[0]!, 2 * vh * h[1]! - v[1]!, 2 * vh * h[2]! - v[2]!];
    const nl = l[2]!;
    const nh = h[2]!;
    if (nl > 0) {
      const g = smithG1(nv, k) * smithG1(nl, k);
      const gVis = (g * vh) / (nh * nv);
      const fc = Math.pow(1 - vh, 5);
      A += (1 - fc) * gVis;
      B += fc * gVis;
    }
  }
  return [A / samples, B / samples];
}
