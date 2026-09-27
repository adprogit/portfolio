/**
 * Des sprites en pixels, calculés à la compilation.
 *
 * Un sprite est une petite grille (32 × 32) et une suite d'images.
 * Chaque pixel porte un rôle, jamais une couleur : `a` l'accent du projet,
 * `i` l'encre douce, `l` le trait des cadres, `r` le filet. C'est la feuille
 * de style qui leur donne une couleur, dans le thème courant — un GIF, lui,
 * aurait ses couleurs figées et jurerait dans l'un des deux thèmes.
 *
 * Rien ne s'exécute dans la page : le composant rend du SVG statique, et
 * l'animation est du CSS (une image visible à la fois). Pas de transparence :
 * les demi-teintes sont tramées (matrice de Bayer), comme sur un vieil écran.
 */

export type Role = 'a' | 'i' | 'l' | 'r';

/** Une image : des pixels, chacun avec son rôle. Le dernier posé gagne. */
export class Layer {
  readonly px = new Map<string, Role>();
  constructor(readonly size: number) {}

  set(x: number, y: number, role: Role) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return this;
    this.px.set(`${x},${y}`, role);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, role: Role) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, role);
    return this;
  }

  /** Le contour d'un rectangle, d'un pixel d'épaisseur. */
  frame(x: number, y: number, w: number, h: number, role: Role) {
    this.rect(x, y, w, 1, role).rect(x, y + h - 1, w, 1, role);
    return this.rect(x, y, 1, h, role).rect(x + w - 1, y, 1, h, role);
  }

  /** Un cercle tracé pixel par pixel (point milieu). */
  circle(cx: number, cy: number, r: number, role: Role) {
    const steps = Math.max(16, Math.ceil(2 * Math.PI * r * 2));
    for (let k = 0; k < steps; k++) {
      const a = (2 * Math.PI * k) / steps;
      this.set(cx + r * Math.cos(a), cy + r * Math.sin(a), role);
    }
    return this;
  }

  /** Un disque plein ; `role` peut dépendre du pixel (ombrage, tramage). */
  disc(cx: number, cy: number, r: number, role: Role | ((x: number, y: number) => Role | null)) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        const v = typeof role === 'function' ? role(x, y) : role;
        if (v) this.set(x, y, v);
      }
    }
    return this;
  }

  /** Un segment (Bresenham). */
  line(x0: number, y0: number, x1: number, y1: number, role: Role) {
    [x0, y0, x1, y1] = [x0, y0, x1, y1].map(Math.round);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, role);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Un glyphe de la police 3 × 5 ci-dessous, coin haut gauche en (x, y). */
  glyph(ch: string, x: number, y: number, role: Role) {
    const rows = FONT[ch];
    if (!rows) throw new Error(`pixel : pas de glyphe pour « ${ch} ».`);
    rows.forEach((row, j) => [...row].forEach((c, i) => c === '#' && this.set(x + i, y + j, role)));
    return this;
  }

  text(s: string, x: number, y: number, role: Role) {
    [...s].forEach((ch, k) => ch !== ' ' && this.glyph(ch, x + 4 * k, y, role));
    return this;
  }

  /**
   * Un chemin SVG par rôle : chaque plage horizontale de pixels devient un
   * rectangle `M x y h w v 1 h -w z`. Un `<path>` par couleur et par image
   * pèse bien moins qu'un `<rect>` par plage, et ne contient que des entiers.
   */
  paths() {
    const byRole = new Map<Role, string[]>();
    for (const { x, y, w, role } of this.runs()) {
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(`M${x} ${y}h${w}v1h-${w}z`);
    }
    return [...byRole].map(([role, d]) => ({ role, d: d.join('') }));
  }

  /** Les pixels regroupés en rectangles horizontaux : un `<rect>` par plage. */
  runs() {
    const out: { x: number; y: number; w: number; role: Role }[] = [];
    for (let y = 0; y < this.size; y++) {
      let x = 0;
      while (x < this.size) {
        const role = this.px.get(`${x},${y}`);
        if (!role) {
          x++;
          continue;
        }
        let w = 1;
        while (this.px.get(`${x + w},${y}`) === role) w++;
        out.push({ x, y, w, role });
        x += w;
      }
    }
    return out;
  }
}

export interface Sprite {
  size: number;
  /** Ce qui ne bouge pas, dessous. */
  base: Layer;
  /** Les images, dans l'ordre. La dernière est aussi l'image fixe (mouvement réduit). */
  frames: Layer[];
}

/** Toutes les animations ont le même nombre d'images : une seule règle CSS les joue. */
export const FRAMES = 16;

/** Matrice de Bayer 4 × 4 : le seuil de tramage de chaque pixel. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export const dither = (x: number, y: number, v: number) => v * 16 > BAYER[y & 3][x & 3] + 0.5;

/** Police 3 × 5, juste les caractères dont les sprites ont besoin. */
const FONT: Record<string, string[]> = {
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  a: ['...', '##.', '.##', '#.#', '###'],
  b: ['#..', '#..', '##.', '#.#', '##.'],
  '|': ['.#.', '.#.', '.#.', '.#.', '.#.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '*': ['...', '#.#', '.#.', '#.#', '...'],
};
