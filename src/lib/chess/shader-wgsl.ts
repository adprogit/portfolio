/**
 * L'échiquier complet, en WGSL : le moteur C++ du projet ray marcher porté
 * sur GPU.
 *
 * Correspondance avec les sources C++ :
 *
 * | WGSL                       | C++                                        |
 * |----------------------------|--------------------------------------------|
 * | `ellipse2` `box2` `sphere2`| `src/sdf/sdf_2d.cpp`                       |
 * | `ellipse3` `box3` `round_cone` | `src/sdf/sdf_3d.cpp`                    |
 * | `blend` `piece_base` `piece_base_large` | `src/sdf/sdf.hh`              |
 * | `sdf_pawn` … `sdf_king`    | `src/sdf/chess/*_sdf.cpp`                  |
 * | `board_distance` `board_material` | `src/sdf/chess/chess_board.hh`      |
 * | `scene_hit` `scene_distance` | `Scene::get_scene_data` / `get_min_distance` |
 * | `shadow`                   | `Scene::get_shadows`                       |
 * | `march`                    | `Scene::march`                             |
 * | `fs_main`                  | `Camera::pixel_position` + `Scene::render` |
 *
 * Toutes les constantes sont celles du C++, y compris la palette « Wood » de
 * `main.cpp`. Trois écarts, tous délibérés :
 *
 * 1. Le C++ garde les pièces dans `std::vector<std::shared_ptr<SDF>> grid_[64]`.
 *    Un GPU n'a ni allocation ni fonction virtuelle : les pièces vivent dans un
 *    tableau de 32 enregistrements, et la grille 8×8 devient 64 masques de bits
 *    — un bit par pièce présente dans la case. Même structure d'accélération,
 *    forme adaptée. Un coup joué réécrit ces deux tampons ; le shader, lui, ne
 *    bouge pas.
 * 2. `ellipse2` / `ellipse3` divisent par `k1` sans le protéger en C++. Au
 *    centre exact d'une ellipse, un NaN dans un shader contamine le pixel : on
 *    borne le dénominateur à 1e-5. Même correction que pour le pion.
 * 3. Pas de réflexion. `main.cpp` rend avec `REFLECTION_DEPTH = 0`, donc les
 *    images de référence n'en ont pas — et WGSL interdit la récursion de
 *    `Scene::march`, qu'il faudrait déplier.
 */

export const SHADER = `
// eye, look_at et light_pos sont des vec3f : chacun s'aligne sur 16 octets et
// n'en occupe que 12. Les trois champs qui les suivent logent dans les trous
// que l'alignement aurait laissés vides de toute façon.
struct Uniforms {
  res: vec2f,           // taille du framebuffer
  pointer: vec2f,       // curseur, -1..1 ; la caméra est calculée côté CPU,
                        // il n'est lu qu'au débogage
  eye: vec3f,           // Camera::center_
  piece_count: u32,     // renseigné, non lu : la grille dit déjà quoi évaluer
  look_at: vec3f,       // Camera::target_ — « target » est réservé par WGSL
  half_width: f32,      // tan(hfov / 2)
  light_pos: vec3f,     // PointLight
  half_height: f32,     // tan(vfov / 2)
};

// Une pièce : sa case en coordonnées monde, son type, sa couleur.
struct Piece {
  position: vec3f,
  kind: u32,
  white: u32,
  flip_z: u32,          // le cavalier noir regarde dans l'autre sens
  pad0: u32,
  pad1: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> pieces: array<Piece, 32>;
// grid_[64] du C++ : un bit par pièce dont la boîte englobante touche la case.
@group(0) @binding(2) var<storage, read> cells: array<u32, 64>;

/* ── Constantes de marche (Scene) ───────────────────────────────── */

const MAX_STEPS: i32 = 256;
const MAX_DIST: f32 = 200.0;
const SURF_DIST: f32 = 0.001;

/* ── Plateau (chess_board) ──────────────────────────────────────── */

const CELL_SIZE: f32 = 8.0;
const HALF_PLAY: f32 = 32.0;
const HALF_TOTAL: f32 = 36.0;
const THICKNESS: f32 = 2.0;
const BOARD_Y: f32 = -1.0;
const PIECE_HEIGHT: f32 = 24.0;

/* ── Palette « Wood » (main.cpp) ────────────────────────────────── */

const BACKGROUND: vec3f = vec3f(0.4, 0.6, 1.0);
const AMBIENT: vec3f = vec3f(0.1, 0.1, 0.1);
const LIGHT_COLOR: vec3f = vec3f(1.0, 1.0, 1.0);

/* ── Angles précalculés (constructeurs C++) ─────────────────────── */

const ROOK_COS: f32 = -0.5;              // cos(2π/3)
const ROOK_SIN: f32 = 0.8660254;         // sin(2π/3)
const BISHOP_COS: f32 = 0.9210610;       // cos(-0.4)
const BISHOP_SIN: f32 = -0.3894183;      // sin(-0.4)
const KNIGHT_COS: f32 = 0.2674988;       // cos(1.3)
const KNIGHT_SIN: f32 = 0.9635582;       // sin(1.3)

/* ── Primitives 2D (src/sdf/sdf_2d.cpp) ─────────────────────────── */

fn ellipse2(p: vec2f, r: vec2f) -> f32 {
  let k0 = length(p / r);
  let k1 = max(length(p / (r * r)), 1e-5);
  return k0 * (k0 - 1.0) / k1;
}

fn sphere2(p: vec2f, r: f32) -> f32 {
  return length(p) - r;
}

fn box2(p: vec2f, r: vec2f) -> f32 {
  let d = abs(p) - r;
  return min(max(d.x, d.y), 0.0) + length(max(d, vec2f(0.0)));
}

/* ── Primitives 3D (src/sdf/sdf_3d.cpp) ─────────────────────────── */

fn sphere3(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn ellipse3(p: vec3f, r: vec3f) -> f32 {
  let k0 = length(p / r);
  let k1 = max(length(p / (r * r)), 1e-5);
  return k0 * (k0 - 1.0) / k1;
}

fn box3(p: vec3f, r: vec3f) -> f32 {
  let d = abs(p) - r;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, vec3f(0.0)));
}

fn round_cone(p: vec3f, r1: f32, r2: f32, h: f32) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let b = (r1 - r2) / h;
  let a = sqrt(1.0 - b * b);
  let k = dot(q, vec2f(-b, a));
  if (k < 0.0) {
    return length(q) - r1;
  }
  if (k > a * h) {
    return length(q - vec2f(0.0, h)) - r2;
  }
  return dot(q, vec2f(a, b)) - r1;
}

/* ── Opérateurs et socles communs (src/sdf/sdf.hh) ──────────────── */

fn blend(d1: f32, d2: f32, k: f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn piece_base(p: vec3f, r: f32) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let db0 = ellipse2(vec2f(0.0, -2.3) - q, vec2f(1.6 * r, 0.6));
  let db1 = ellipse2(vec2f(0.0, -3.3) - q, vec2f(2.5 * r, 0.6));
  let db2 = ellipse2(vec2f(0.0, -3.8) - q, vec2f(2.6 * r, 0.5));
  let dw = ellipse2(vec2f(0.0, -2.1) - q, vec2f(1.8 * r, 0.3));
  return min(blend(blend(db0, db1, 1.0), db2, 0.3), dw);
}

fn piece_base_large(p: vec3f) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  var r = piece_base(p, 1.2);

  let dn = ellipse2(vec2f(0.0, -1.4) - q, vec2f(1.15, 2.7));
  let dc = ellipse2(vec2f(0.0, 2.0) - q, vec2f(1.6, 0.3));
  let dc1 = ellipse2(vec2f(0.0, 2.2) - q, vec2f(1.5, 0.2));
  let dc2 = ellipse2(vec2f(0.0, 2.8) - q, vec2f(1.2, 0.2));
  let ds = ellipse2(vec2f(0.0, 5.9) - q, vec2f(1.9, 2.8));
  let dcut = box2(vec2f(0.0, 7.2) - q, vec2f(3.0, 2.5));

  r = blend(r, dn, 1.8);
  r = blend(r, dc, 1.8);
  r = min(r, dc1);
  r = blend(r, dc2, 0.55);
  r = blend(r, ds, 1.1);
  return max(r, -dcut);
}

/* ── Les six pièces (src/sdf/chess/*_sdf.cpp) ───────────────────── */

fn sdf_pawn(p: vec3f) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let head = sphere2(vec2f(0.0, 1.0) - q, 1.0);
  let neck = ellipse2(vec2f(0.0, -0.15) - q, vec2f(1.0, 0.3));
  let body_upper = ellipse2(vec2f(0.0, 0.0) - q, vec2f(0.5, 0.8));
  let body_mid = ellipse2(vec2f(0.0, -2.3) - q, vec2f(0.9, 0.3));
  let body_lower = ellipse2(vec2f(0.0, -2.1) - q, vec2f(1.4, 0.3));

  var r = blend(head, neck, 0.3);
  r = min(r, blend(body_upper, body_mid, 3.0));
  r = min(r, body_lower);
  return min(r, piece_base(p, 0.8));
}

fn sdf_rook(p: vec3f) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let dn = ellipse2(vec2f(0.0, -1.0) - q, vec2f(1.2, 1.3));
  let dc = ellipse2(vec2f(0.0, 0.5) - q, vec2f(1.7, 0.2));

  var r = blend(piece_base(p, 1.0), dn, 1.0);
  r = blend(r, dc, 1.4);
  r = min(r, box2(vec2f(1.4, 1.1) - q, vec2f(0.2, 0.6)));

  // Créneaux : trois boîtes, la même tournée d'un tiers de tour à chaque fois.
  // La soustraction n'a lieu qu'à proximité, sinon elle ronge toute la pièce.
  var b = p;
  for (var i = 0; i < 3; i++) {
    let crenel = box3(vec3f(0.0, 1.4, 0.0) - b, vec3f(2.0, 0.6, 0.2));
    if (crenel < 0.5) {
      r = max(r, -crenel);
    }
    b = vec3f(b.x * ROOK_COS + b.z * ROOK_SIN, b.y, -b.x * ROOK_SIN + b.z * ROOK_COS);
  }
  return r;
}

fn sdf_bishop(p: vec3f) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let dn = ellipse2(vec2f(0.0, -1.4) - q, vec2f(1.0, 1.6));
  let dc = ellipse2(vec2f(0.0, 0.7) - q, vec2f(1.6, 0.3));
  let dc1 = ellipse2(vec2f(0.0, 0.9) - q, vec2f(1.5, 0.2));
  let dc2 = ellipse2(vec2f(0.0, 1.5) - q, vec2f(1.2, 0.2));
  let dh = ellipse2(vec2f(0.0, 2.6) - q, vec2f(1.3, 1.5));
  let dt = ellipse2(vec2f(0.0, 4.2) - q, vec2f(0.4, 0.4));

  // La mitre : une boîte fine, inclinée, soustraite en biais.
  let c = vec3f(0.8, 3.7, 0.0) - p;
  let cut = box3(
    vec3f(c.x * BISHOP_COS + c.y * BISHOP_SIN, -c.x * BISHOP_SIN + c.y * BISHOP_COS, c.z),
    vec3f(0.2, 1.0, 2.0));

  var r = blend(piece_base(p, 1.0), dn, 0.9);
  r = blend(r, dc, 1.5);
  r = min(r, dc1);
  r = blend(r, dc2, 0.55);
  r = min(r, dh);
  r = min(r, dt);
  return max(r, -cut);
}

fn sdf_knight(p_in: vec3f) -> f32 {
  // Pas de symétrie de révolution ici : on plie l'espace en deux et on taille.
  var p = p_in;
  p.x = abs(p.x);

  let ds1 = sphere3(vec3f(0.0, 1.8, 0.0) - p, 4.0);
  let ds2 = ellipse3(vec3f(0.0, 1.5, 0.0) - p, vec3f(2.0, 5.0, 2.5));
  let dn = round_cone(vec3f(-0.3, 1.0, 0.5) - p, 0.8, 2.2, 2.2);
  let dncut = ellipse3(vec3f(2.2, 0.0, 0.0) - p, vec3f(1.5, 2.5, 5.0));

  let pr = vec3f(0.0, 2.5, 0.5) - p;
  let dh = round_cone(
    vec3f(pr.x, pr.y * KNIGHT_COS - pr.z * KNIGHT_SIN, pr.y * KNIGHT_SIN + pr.z * KNIGHT_COS),
    1.2, 0.6, 1.9);

  let de = ellipse3(vec3f(0.5, 3.5, 0.5) - p, vec3f(0.4, 0.5, 0.35));
  let dhcut1 = 0.5 - p.x;
  let dhcut2 = sphere3(vec3f(1.1, 2.4, 2.7) - p, 0.9);
  let dhs = ellipse3(vec3f(0.0, 2.2, 0.0) - p, vec3f(2.0, 1.3, 3.5));

  var h = dh;
  h = max(h, -dhcut1);
  h = max(h, -dhcut2);
  h = max(h, dhs);
  h = min(h, max(de, -dhcut1));

  var r2 = max(dn, -dncut);
  r2 = blend(r2, h, 0.7);

  // Le socle est de révolution : le pli et le miroir ne le changent pas.
  return min(piece_base(p_in, 1.0), max(max(r2, ds1), ds2));
}

fn sdf_queen(p: vec3f) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let dh = ellipse2(vec2f(0.0, 4.0) - q, vec2f(1.3, 1.5));
  let dhcut = box2(vec2f(0.0, 2.0) - q, vec2f(3.0, 2.0));
  let dt = ellipse2(vec2f(0.0, 5.6) - q, vec2f(0.5, 0.5));

  // Une seule sphère creuse les quatre encoches de la couronne : on replie
  // l'espace sur un huitième de tour (miroirs + échange des axes).
  var pc = vec3f(abs(p.x), p.y, abs(p.z));
  if (pc.x > pc.z) {
    pc = vec3f(pc.z, pc.y, pc.x);
  }
  let dccut = sphere3(vec3f(1.0, 4.7, 2.2) - pc, 1.1);

  let r = min(piece_base_large(p), max(dh, -dhcut));
  return max(min(r, dt), -dccut);
}

fn sdf_king(p: vec3f) -> f32 {
  let q = vec2f(length(p.xz), p.y);
  let dh = ellipse2(vec2f(0.0, 4.6) - q, vec2f(1.8, 0.4));
  let dt1 = box3(vec3f(0.0, 5.2, 0.0) - p, vec3f(0.3, 1.5, 0.25));
  let dt2 = box3(vec3f(0.0, 5.8, 0.0) - p, vec3f(1.0, 0.3, 0.25));

  var r = min(piece_base_large(p), dh);
  r = min(r, dt1);
  return min(r, dt2);
}

/* ── Répartition, avec la sphère englobante de chaque pièce ─────── */

fn piece_radius(kind: u32) -> f32 {
  switch (kind) {
    case 0u: { return 6.0; }   // pion
    case 1u: { return 8.0; }   // tour
    case 2u: { return 7.0; }   // cavalier
    case 3u: { return 8.0; }   // fou
    default: { return 9.0; }   // dame, roi
  }
}

fn piece_distance(index: u32, world: vec3f) -> f32 {
  let piece = pieces[index];
  var p = world - piece.position;
  if (piece.flip_z == 1u) {
    p.z = -p.z;
  }

  // Loin de la pièce, une seule longueur suffit — comme en C++.
  let radius = piece_radius(piece.kind);
  let to_centre = length(p - vec3f(0.0, -1.25, 0.0));
  if (to_centre > radius * 2.0) {
    return to_centre - radius;
  }

  switch (piece.kind) {
    case 0u: { return sdf_pawn(p); }
    case 1u: { return sdf_rook(p); }
    case 2u: { return sdf_knight(p); }
    case 3u: { return sdf_bishop(p); }
    case 4u: { return sdf_queen(p); }
    default: { return sdf_king(p); }
  }
}

/* ── Le plateau ─────────────────────────────────────────────────── */

fn board_distance(world: vec3f) -> f32 {
  return box3(world - vec3f(0.0, BOARD_Y, 0.0),
              vec3f(HALF_TOTAL, THICKNESS * 0.5, HALF_TOTAL));
}

struct Material {
  kd: vec3f,
  ks: vec3f,
  ns: f32,
};

fn board_material(world: vec3f) -> Material {
  let p = world - vec3f(0.0, BOARD_Y, 0.0);
  if (abs(p.x) > HALF_PLAY || abs(p.z) > HALF_PLAY) {
    return Material(vec3f(0.25, 0.12, 0.05), vec3f(0.3), 20.0);
  }
  let ix = i32(floor(p.x / CELL_SIZE));
  let iz = i32(floor(p.z / CELL_SIZE));
  // Le reste d'un entier négatif est négatif en WGSL comme en C++ : les cases
  // du quadrant négatif tombent donc du même côté qu'à l'origine.
  if (((ix + iz) % 2) == 0) {
    return Material(vec3f(0.35, 0.2, 0.1), vec3f(0.2), 15.0);
  }
  return Material(vec3f(0.85, 0.75, 0.55), vec3f(0.2), 15.0);
}

fn piece_material(white: u32) -> Material {
  if (white == 1u) {
    return Material(vec3f(0.9, 0.9, 0.8), vec3f(0.5), 30.0);
  }
  return Material(vec3f(0.1, 0.1, 0.1), vec3f(0.4), 20.0);
}

/* ── Interrogation de la scène (Scene::get_scene_data) ──────────── */

// Quelles pièces peuvent compter, à cet endroit ? Hors du volume de jeu,
// aucune : la marche traverse surtout du vide, autant le dire tout de suite.
fn cell_mask(world: vec3f) -> u32 {
  let p = world - vec3f(0.0, BOARD_Y, 0.0);
  if (abs(p.x) > 40.0 || abs(p.z) > 40.0 || p.y < 0.0 || p.y > PIECE_HEIGHT) {
    return 0u;
  }
  let file = clamp(i32(floor(world.x / CELL_SIZE + 4.0)), 0, 7);
  let rank = clamp(i32(floor(world.z / CELL_SIZE + 4.0)), 0, 7);
  return cells[rank * 8 + file];
}

struct Hit {
  distance: f32,
  /** 0 = plateau, 1 = pièce. */
  kind: i32,
  index: u32,
};

fn scene_hit(world: vec3f) -> Hit {
  var best = Hit(board_distance(world), 0, 0u);
  if (best.distance < SURF_DIST) {
    return best;
  }

  var mask = cell_mask(world);
  while (mask != 0u) {
    let index = firstTrailingBit(mask);
    mask &= mask - 1u;

    let d = piece_distance(index, world);
    if (d < best.distance) {
      best = Hit(d, 1, index);
      if (d < SURF_DIST) {
        return best;
      }
    }
  }
  return best;
}

fn scene_distance(world: vec3f) -> f32 {
  var d = board_distance(world);
  var mask = cell_mask(world);
  while (mask != 0u) {
    let index = firstTrailingBit(mask);
    mask &= mask - 1u;
    d = min(d, piece_distance(index, world));
  }
  return d;
}

// La normale se prend sur l'objet touché, pas sur le minimum de la scène :
// à la jonction de deux volumes, le minimum saute et la normale part de biais.
fn hit_distance(kind: i32, index: u32, world: vec3f) -> f32 {
  if (kind == 0) {
    return board_distance(world);
  }
  return piece_distance(index, world);
}

fn normal_at(kind: i32, index: u32, p: vec3f, d0: f32) -> vec3f {
  let e = 0.001;
  return normalize(vec3f(
    hit_distance(kind, index, p + vec3f(e, 0.0, 0.0)) - d0,
    hit_distance(kind, index, p + vec3f(0.0, e, 0.0)) - d0,
    hit_distance(kind, index, p + vec3f(0.0, 0.0, e)) - d0));
}

/* ── Ombres douces (Scene::get_shadows) ─────────────────────────── */

// On marche vers la lumière et on retient la plus petite distance frôlée,
// pondérée par le chemin parcouru : un rayon qui passe tout près d'un volume
// assombrit sans que rien ne le bloque vraiment.
fn shadow(p: vec3f, light_dir: vec3f, dist_to_light: f32, n: vec3f, softness: f32) -> f32 {
  let ro = p + n * 0.05;
  var t = 0.05;
  var min_h = 1e20;

  for (var i = 0; i < MAX_STEPS; i++) {
    let h = scene_distance(ro + light_dir * t);
    if (h < SURF_DIST) {
      return 0.0;
    }
    min_h = min(min_h, softness * h / t);
    t += max(h, 0.02);
    if (t >= dist_to_light - 0.05 || t > MAX_DIST) {
      break;
    }
  }
  return clamp(min_h, 0.0, 1.0);
}

/* ── La marche (Scene::march, depth = 0) ────────────────────────── */

fn march(ro: vec3f, rd: vec3f) -> vec3f {
  var d = 0.0;

  for (var i = 0; i < MAX_STEPS; i++) {
    let p = ro + rd * d;
    let hit = scene_hit(p);

    if (hit.distance < SURF_DIST) {
      var mat: Material;
      if (hit.kind == 0) {
        mat = board_material(p);
      } else {
        mat = piece_material(pieces[hit.index].white);
      }

      let n = normal_at(hit.kind, hit.index, p, hit.distance);
      let view = -rd;
      var col = mat.kd * AMBIENT;

      let to_light = u.light_pos - p;
      let dist_to_light = length(to_light);
      let light_dir = to_light / dist_to_light;

      // Lumière derrière la surface : rien à ajouter.
      if (dot(n, light_dir) >= 0.0) {
        let sh = shadow(p, light_dir, dist_to_light, n, 32.0);

        let diff = max(dot(n, light_dir), 0.0);
        col += mat.kd * LIGHT_COLOR * diff * sh;

        let half_dir = normalize(light_dir + view);
        let spec = pow(max(dot(n, half_dir), 0.0), mat.ns);
        col += mat.ks * LIGHT_COLOR * spec * sh;
      }
      return col;
    }

    // 0.7 : les champs composés surestiment un peu la distance, on avance court.
    d += hit.distance * 0.7;
    if (d > MAX_DIST) {
      break;
    }
  }
  return BACKGROUND;
}

/* ── Un triangle qui couvre l'écran, sans tampon de sommets ─────── */

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(corners[index], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  // Camera::pixel_position compte j depuis le haut de l'image, et WebGPU place
  // aussi son origine en haut à gauche : contrairement au pion, rien à
  // retourner ici.
  let ux = 2.0 * (position.x / u.res.x - 0.5);
  let vy = 2.0 * (0.5 - position.y / u.res.y);

  let w = normalize(u.look_at - u.eye);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), w));
  let up = normalize(cross(w, right));

  let pixel = u.eye + w + right * (ux * u.half_width) + up * (vy * u.half_height);
  let rd = normalize(pixel - u.eye);

  var col = march(u.eye, rd);
  col = pow(max(col, vec3f(0.0)), vec3f(1.0 / 2.2));   // correction gamma
  return vec4f(col, 1.0);
}
`;

/** `Uniforms` : 64 octets. La disposition exacte est écrite dans `draw()`. */
export const UNIFORM_BYTES = 64;

/** Nombre maximal de pièces — la taille du masque de bits d'une case. */
export const MAX_PIECES = 32;

/** `array<Piece, 32>`, 32 octets par pièce. */
export const PIECE_BYTES = MAX_PIECES * 32;

/** `array<u32, 64>`. */
export const CELL_BYTES = 64 * 4;
