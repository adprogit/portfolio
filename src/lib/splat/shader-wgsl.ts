/**
 * Les shaders du hero, en deux passes.
 *
 * 1. `SPLAT` : le moteur OpenGL du projet Gaussian Splatting, porté en WGSL.
 *    WebGPU n'a pas de geometry shader : le quad que `geometry.shd` émettait
 *    pour chaque point devient ici une instance de quatre sommets, et chaque
 *    sommet refait la projection de la covariance de `vertex.shd`. Les
 *    gaussiennes sont lues dans l'ordre du tri (`order`), de l'arrière vers
 *    l'avant, et composées par l'opérateur « over ».
 *
 *    Deux cibles flottantes, mélangées de la même façon :
 *    - `color`  : la couleur ombrée, prémultipliée, et la couverture ;
 *    - `gbuf`   : la normale (x, y) et la profondeur en vue, prémultipliées,
 *                 et la couverture du nœud seul en alpha. La poussière n'y
 *                 écrit rien : la différence des deux alphas la retrouve, et
 *                 ses points ne se mêlent pas aux contours du nœud. La normale z se déduit :
 *                 elle regarde toujours la caméra.
 *
 * 2. `POST` : un triangle plein écran qui lit ces deux cibles et dessine le
 *    mode choisi — la référence telle quelle, le tramage de Bayer, ou les
 *    hachures avec leurs contours de Sobel.
 *
 * Les constantes sont celles du moteur : le filtre passe-bas de 0,3 px² sur la
 * diagonale de Σ′, les axes de l'ellipse étirés à 3σ, le seuil de 1/255.
 */

/** Uniformes partagés, 176 octets, remplis par `draw` dans `hero.ts`. */
export const UNIFORMS = `
struct U {
  view: mat4x4f,
  focal: vec2f,
  viewport: vec2f,
  brand: vec4f,
  accent: vec4f,
  ink: vec4f,
  soft: vec4f,
  light: vec3f,
  mode: u32,
  cell: f32,
  dpr: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> u: U;
`;

export const SPLAT = `
${UNIFORMS}

struct Splat {
  p: vec4f,   // position, teinte
  c0: vec4f,  // Σxx Σxy Σxz Σyy
  c1: vec4f,  // Σyz Σzz opacité -
  n: vec4f,   // normale, poussière (1) ou nœud (0)
}
@group(0) @binding(1) var<storage, read> splats: array<Splat>;
@group(0) @binding(2) var<storage, read> order: array<u32>;

struct V {
  @builtin(position) pos: vec4f,
  // Écart au centre de l'ellipse, en pixels : interpolé sur le quad.
  @location(0) d: vec2f,
  // Σ′⁻¹ en trois termes : (a, b, c) pour a dx² + 2b dx dy + c dy².
  @location(1) @interpolate(flat) conic: vec3f,
  @location(2) @interpolate(flat) color: vec4f,
  // Normale (x, y) et profondeur en repère vue ; négative pour la poussière.
  @location(3) @interpolate(flat) geo: vec3f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  var o: V;
  // Hors du volume de vue : le quad est rejeté par le découpage.
  o.pos = vec4f(2.0, 2.0, 2.0, 1.0);

  let s = splats[order[ii]];
  let t = (u.view * vec4f(s.p.xyz, 1.0)).xyz;
  let depth = -t.z;
  // geometry.shd : origin.w <= 0.2
  if (depth <= 0.2) { return o; }

  // vertex.shd : la jacobienne est évaluée en un point ramené à 1,3 fois le
  // champ, pour qu'une gaussienne au bord ne s'étire pas à l'infini.
  let lim = 1.3 * u.viewport / (2.0 * u.focal);
  let tx = clamp(t.x / depth, -lim.x, lim.x) * depth;
  let ty = clamp(t.y / depth, -lim.y, lim.y) * depth;

  // J, la jacobienne de la projection perspective : deux lignes, trois
  // colonnes. La troisième ligne (la profondeur) ne compte pas à l'écran.
  let J = mat3x2f(
    vec2f(u.focal.x / depth, 0.0),
    vec2f(0.0, u.focal.y / depth),
    vec2f(u.focal.x * tx / (depth * depth), u.focal.y * ty / (depth * depth)),
  );
  let W = mat3x3f(u.view[0].xyz, u.view[1].xyz, u.view[2].xyz);
  let sigma = mat3x3f(
    s.c0.x, s.c0.y, s.c0.z,
    s.c0.y, s.c0.w, s.c1.x,
    s.c0.z, s.c1.x, s.c1.y,
  );

  // Σ′ = J W Σ Wᵀ Jᵀ, puis le passe-bas : 0,3 px² sur la diagonale.
  let T = J * W;
  let cov = T * sigma * transpose(T);
  let a = cov[0][0] + 0.3;
  let b = cov[0][1];
  let c = cov[1][1] + 0.3;

  // Valeurs propres de la 2×2 : demi-trace ± racine du discriminant.
  let det = a * c - b * b;
  if (det <= 0.0) { return o; }
  let mid = 0.5 * (a + c);
  let disc = sqrt(max(mid * mid - det, 0.0));
  let l1 = mid + disc;
  let l2 = max(mid - disc, 0.0);

  // Le vecteur propre de λ₁, et son orthogonal.
  var dir = vec2f(b, l1 - a);
  if (length(dir) < 1e-3) { dir = vec2f(1.0, 0.0); } else { dir = normalize(dir); }
  let ortho = vec2f(-dir.y, dir.x);
  let ax = dir * 3.0 * sqrt(l1);
  let ay = ortho * 3.0 * sqrt(l2);

  // Centre en pixels depuis le milieu du cadre ; rejet hors champ.
  let center = vec2f(u.focal.x * t.x, u.focal.y * t.y) / depth;
  let extent = abs(ax) + abs(ay);
  if (any(abs(center) - extent > 0.5 * u.viewport)) { return o; }

  // Les quatre coins de la bande : (±1, ±1) le long des deux axes.
  let corner = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2.0 - 1.0;
  let off = corner.x * ax + corner.y * ay;
  o.pos = vec4f((center + off) * 2.0 / u.viewport, 0.5, 1.0);
  o.d = off;
  o.conic = vec3f(c, -b, a) / det;

  // Ombrage : Lambert, la normale retournée vers la caméra (un disque n'a pas
  // d'envers).
  var n = normalize(W * s.n.xyz);
  if (dot(n, t) > 0.0) { n = -n; }
  let lambert = max(dot(n, u.light), 0.0);
  let base = mix(u.brand.rgb, u.accent.rgb, s.p.w);
  o.color = vec4f(base * (0.35 + 0.8 * lambert), s.c1.z);
  o.geo = vec3f(n.xy, select(depth, -depth, s.n.w > 0.5));
  return o;
}

struct F {
  @location(0) color: vec4f,
  @location(1) gbuf: vec4f,
}

@fragment
fn fs(v: V) -> F {
  // fragment.shd : opacité × exp(−½ dᵀ Σ′⁻¹ d), et rien sous 1/255.
  let d = v.d;
  let power = v.conic.x * d.x * d.x + 2.0 * v.conic.y * d.x * d.y + v.conic.z * d.y * d.y;
  let alpha = min(v.color.a * exp(-0.5 * power), 0.99);
  if (alpha < 1.0 / 255.0) { discard; }

  var f: F;
  f.color = vec4f(v.color.rgb * alpha, alpha);
  // Alpha nul : l'opérateur « over » laisse le G-buffer tel qu'il était.
  f.gbuf = select(vec4f(v.geo * alpha, alpha), vec4f(0.0), v.geo.z < 0.0);
  return f;
}
`;

export const POST = `
${UNIFORMS}
@group(0) @binding(1) var colorTex: texture_2d<f32>;
@group(0) @binding(2) var gbufTex: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

// Seuil de Bayer 8×8 : l'indice entrelace les bits de (x xor y) et de y, à
// rebours. Valeur dans ]0, 1[.
fn bayer(p: vec2u) -> f32 {
  let x = p.x & 7u;
  let y = p.y & 7u;
  let q = x ^ y;
  let v = ((q & 1u) << 5u) | ((y & 1u) << 4u) | ((q & 2u) << 2u)
        | ((y & 2u) << 1u) | ((q & 4u) >> 1u) | ((y & 4u) >> 2u);
  return (f32(v) + 0.5) / 64.0;
}

// Normale, profondeur et couverture du nœud en un pixel, démultipliées.
struct G { n: vec3f, depth: f32, cover: f32 }

fn gbuf(q: vec2i) -> G {
  let size = vec2i(textureDimensions(gbufTex));
  let g = textureLoad(gbufTex, clamp(q, vec2i(0), size - 1), 0);
  var r: G;
  r.cover = g.w;
  if (g.w < 0.02) {
    r.n = vec3f(0.0, 0.0, 1.0);
    r.depth = 0.0;
    return r;
  }
  let xy = g.xy / g.w;
  r.n = vec3f(xy, sqrt(max(1.0 - dot(xy, xy), 0.0)));
  r.depth = g.z / g.w;
  return r;
}

// La couverture de la poussière : la couleur compte tout, le G-buffer le nœud
// seul. Devant le nœud, c = d + g (1 − d), d'où d.
fn dust(q: vec2i) -> f32 {
  let c = textureLoad(colorTex, q, 0).a;
  let g = textureLoad(gbufTex, q, 0).a;
  return clamp((c - g) / max(1.0 - g, 1e-3), 0.0, 1.0);
}

fn tone(g: G) -> f32 {
  return 0.06 + 0.94 * max(dot(g.n, u.light), 0.0);
}

// Distance, en pixels, au trait le plus proche d'une famille de traits
// parallèles espacés de « gap » ; renvoie l'encre du trait, adoucie d'un pixel.
fn hatch(v: f32, gap: f32) -> f32 {
  let dist = abs(fract(v / gap + 0.5) - 0.5) * gap;
  return clamp(0.55 * u.dpr + 0.5 - dist, 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let q = vec2i(pos.xy);

  // Référence : la composition telle quelle, déjà prémultipliée.
  if (u.mode == 0u) {
    return textureLoad(colorTex, q, 0);
  }

  // Tramage : un pixel logique de « cell » pixels, éclairé ou non selon que
  // son ton dépasse le seuil de Bayer. Une seule encre, l'accent du site.
  if (u.mode == 1u) {
    let cell = i32(u.cell);
    let c = q / cell;
    let at = c * cell + cell / 2;
    let g = gbuf(at);
    let b = bayer(vec2u(c));
    let lit = (g.cover > 0.35 && g.cover * tone(g) > b) || dust(at) > 0.5;
    return select(vec4f(0.0), vec4f(u.brand.rgb, 1.0), lit);
  }

  // Hachures : jusqu'à trois familles de traits, ajoutées à mesure que le ton
  // descend, puis les contours, par Sobel sur la profondeur, la normale et la
  // couverture.
  let g = gbuf(q);
  let t = tone(g);
  let gap = 4.5 * u.dpr;
  let x = f32(q.x);
  let y = f32(q.y);
  var ink = 0.0;
  if (t < 0.85) { ink = max(ink, hatch(x + y, gap)); }
  if (t < 0.55) { ink = max(ink, hatch(x - y, gap)); }
  if (t < 0.3) { ink = max(ink, hatch(x, gap * 0.8)); }
  ink *= smoothstep(0.35, 0.7, g.cover);

  // Sobel 3×3 : gx, gy sur chaque grandeur, à la distance d'un pixel logique.
  let k = i32(max(1.0, round(u.dpr)));
  var sd = vec2f(0.0);
  var sc = vec2f(0.0);
  var sn = vec2f(0.0);
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      if (i == 0 && j == 0) { continue; }
      let s = gbuf(q + vec2i(i, j) * k);
      let w = vec2f(f32(i) * select(1.0, 2.0, j == 0), f32(j) * select(1.0, 2.0, i == 0));
      // Une profondeur n'a de sens que là où il y a de la matière.
      let d = select(g.depth, s.depth, s.cover > 0.5);
      sd += w * d;
      sc += w * s.cover;
      sn += w * dot(s.n, g.n);
    }
  }
  let edge = max(max(length(sd) * 3.0, length(sc) * 0.6), length(sn) * 0.3) * step(0.25, g.cover + length(sc));
  let line = smoothstep(0.45, 0.9, edge);

  let alpha = ink * (1.0 - line) + line;
  let knot = vec4f(u.soft.rgb * ink * (1.0 - line) + u.ink.rgb * line, alpha);
  // La poussière par-dessus : un point d'encre, sans trait ni contour.
  let speck = smoothstep(0.3, 0.6, dust(q));
  return vec4f(u.soft.rgb * speck, speck) + knot * (1.0 - speck);
}
`;
