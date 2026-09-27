/**
 * Le U-Net du projet `unet-coco`, décrit par ses réglages et recalculé.
 *
 * La note « U-Net, pièce par pièce » ne recopie aucun chiffre d'architecture :
 * tailles des cartes, paramètres par étage, champ réceptif, tout sort d'ici,
 * à la compilation. Le total retombe sur les 7,76 M du projet — convolutions
 * sans biais (la BatchNorm qui suit tient ce rôle), convolutions transposées
 * et tête 1×1 avec biais — et sur les 31,0 M de l'article pour une largeur 64.
 *
 * Les seuls nombres saisis sont les résultats mesurés du projet (`results`) :
 * ceux-là ne se recalculent pas sans relancer l'entraînement.
 */

export const config = {
  /** Côté de l'image d'entrée, en pixels. */
  input: 128,
  inChannels: 3,
  /** Canaux du premier étage ; chaque étage les double. */
  width: 32,
  /** Nombre de poolings. */
  depth: 4,
  classes: 1,
};

/** Résultats du projet sur le jeu de test (496 images). */
export const results = {
  dice: 0.643,
  iou: 0.518,
  accuracy: 0.805,
  /** Part des pixels d'avant-plan, environ. */
  foreground: 0.3,
  split: { train: 3961, val: 495, test: 496 },
};

const conv = (cin: number, cout: number, k: number, bias: boolean) => k * k * cin * cout + (bias ? cout : 0);
const batchNorm = (c: number) => 2 * c;
/** (conv 3×3 → BN → ReLU) × 2, convolutions sans biais. */
const doubleConv = (cin: number, cout: number) =>
  conv(cin, cout, 3, false) + batchNorm(cout) + conv(cout, cout, 3, false) + batchNorm(cout);

/** Une convolution coûte ses poids une fois par pixel de sortie… */
const doubleConvMacs = (cin: number, cout: number, side: number) => 9 * (cin * cout + cout * cout) * side * side;
/** … une convolution transposée, une fois par pixel d'entrée. */
const upMacs = (cin: number, cout: number, inSide: number) => 4 * cin * cout * inSide * inSide;

export interface Stage {
  /** `enc1`…`enc4`, `bottleneck`, `dec4`…`dec1`, `head`. */
  name: string;
  side: 'enc' | 'mid' | 'dec' | 'head';
  /** Niveau : 0 à pleine résolution, `depth` au fond. */
  level: number;
  /** Canaux en sortie de l'étage. */
  channels: number;
  /** Côté de la carte en sortie. */
  size: number;
  params: number;
  /** Multiplications-additions pour une image, convolutions seules. */
  macs: number;
}

/** Les étages, dans l'ordre du calcul. */
export function stages(width = config.width): Stage[] {
  const { input, inChannels, depth, classes } = config;
  const ch = (l: number) => width * 2 ** l;
  const out: Stage[] = [];

  for (let l = 0; l < depth; l++) {
    out.push({
      name: `enc${l + 1}`,
      side: 'enc',
      level: l,
      channels: ch(l),
      size: input / 2 ** l,
      params: doubleConv(l === 0 ? inChannels : ch(l - 1), ch(l)),
      macs: doubleConvMacs(l === 0 ? inChannels : ch(l - 1), ch(l), input / 2 ** l),
    });
  }
  out.push({
    name: 'bottleneck',
    side: 'mid',
    level: depth,
    channels: ch(depth),
    size: input / 2 ** depth,
    params: doubleConv(ch(depth - 1), ch(depth)),
    macs: doubleConvMacs(ch(depth - 1), ch(depth), input / 2 ** depth),
  });
  for (let l = depth - 1; l >= 0; l--) {
    // Convolution transposée C → C/2, concaténation (C/2 + C/2), DoubleConv C → C/2.
    out.push({
      name: `dec${l + 1}`,
      side: 'dec',
      level: l,
      channels: ch(l),
      size: input / 2 ** l,
      params: conv(ch(l + 1), ch(l), 2, true) + doubleConv(ch(l + 1), ch(l)),
      macs: upMacs(ch(l + 1), ch(l), input / 2 ** (l + 1)) + doubleConvMacs(ch(l + 1), ch(l), input / 2 ** l),
    });
  }
  out.push({
    name: 'head',
    side: 'head',
    level: 0,
    channels: classes,
    size: input,
    params: conv(ch(0), classes, 1, true),
    macs: ch(0) * classes * input * input,
  });
  return out;
}

export const totalParams = (width = config.width) => stages(width).reduce((n, s) => n + s.params, 0);
export const totalMacs = (width = config.width) => stages(width).reduce((n, s) => n + s.macs, 0);

export interface Receptive {
  /** Ce qui vient d'être appliqué. */
  layer: string;
  /** Champ réceptif, en pixels d'entrée. */
  r: number;
  /** Écart entre deux unités voisines, en pixels d'entrée. */
  j: number;
}

/**
 * Le champ réceptif le long de l'encodeur : r ← r + (k − 1)·j, puis j ← j·s.
 * Une entrée par couche, pour tracer la croissance couche par couche.
 */
export function receptiveField(): Receptive[] {
  const out: Receptive[] = [{ layer: 'input', r: 1, j: 1 }];
  let r = 1;
  let j = 1;
  const apply = (layer: string, k: number, s: number) => {
    r += (k - 1) * j;
    j *= s;
    out.push({ layer, r, j });
  };
  for (let l = 0; l <= config.depth; l++) {
    if (l > 0) apply(`pool${l}`, 2, 2);
    const name = l === config.depth ? 'bottleneck' : `enc${l + 1}`;
    apply(`${name}.conv1`, 3, 1);
    apply(`${name}.conv2`, 3, 1);
  }
  return out;
}

/** Le champ réceptif en sortie de chaque étage de l'encodeur, fond compris. */
export const stageReceptive = () =>
  receptiveField().filter((e) => e.layer.endsWith('.conv2')).map((e) => ({ stage: e.layer.split('.')[0], r: e.r }));

/** Sur une même image, Dice et IoU sont liés exactement : D = 2J / (1 + J). */
export const diceOfIou = (j: number) => (2 * j) / (1 + j);

/* ── Les exemples des schémas ────────────────────────────────────────── */

/** Une petite carte 4×4, pour le max pooling. */
export const poolInput = [
  [1, 3, 2, 0],
  [4, 2, 1, 5],
  [0, 1, 3, 2],
  [2, 6, 1, 1],
];

export function maxPool2(m: number[][]) {
  const out: { value: number; at: [number, number] }[][] = [];
  for (let i = 0; i < m.length; i += 2) {
    const row: { value: number; at: [number, number] }[] = [];
    for (let j = 0; j < m[0].length; j += 2) {
      let best = { value: -Infinity, at: [i, j] as [number, number] };
      for (const [a, b] of [[i, j], [i, j + 1], [i + 1, j], [i + 1, j + 1]] as [number, number][]) {
        if (m[a][b] > best.value) best = { value: m[a][b], at: [a, b] };
      }
      row.push(best);
    }
    out.push(row);
  }
  return out;
}

/** Un noyau 2×2, et la convolution transposée de pas 2 qu'il définit. */
export const upKernel = [
  [1, 0],
  [1, 2],
];

export function transposedConv2(m: number[][], k: number[][]) {
  const n = m.length * 2;
  const out = Array.from({ length: n }, () => Array<number>(n).fill(0));
  m.forEach((row, i) => row.forEach((v, j) => k.forEach((kr, a) => kr.forEach((kv, b) => (out[2 * i + a][2 * j + b] += v * kv)))));
  return out;
}
