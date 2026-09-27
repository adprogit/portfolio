/**
 * L'échiquier côté processeur : un état de 64 cases, et de quoi le faire
 * avancer d'un demi-coup.
 *
 * Ce n'est **pas** un moteur d'échecs. Les coups sont donnés en notation
 * algébrique longue (`e2e4`), c'est-à-dire départ et arrivée : il n'y a donc
 * ni génération de coups, ni test de légalité, ni levée d'ambiguïté — la part
 * réellement coûteuse d'un analyseur SAN. Roque, prise en passant et promotion
 * sont reconnus à la forme du coup, ce qui suffit à rejouer une partie écrite.
 *
 * Le C++ délègue tout ça à `chess.hpp` (5 800 lignes) via
 * `src/sdf/chess/pgn_raymarcher.hh` ; ici on reste sur ce qui tient en une
 * page tant qu'on ne lit pas de PGN.
 */

/** Doit correspondre au `switch (piece.kind)` du shader. */
export const PAWN = 0;
export const ROOK = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const QUEEN = 4;
export const KING = 5;

export type Kind = 0 | 1 | 2 | 3 | 4 | 5;

/** Case vide. Sinon : `((kind + 1) << 1) | blanc`. */
const EMPTY = 0;

const encode = (kind: Kind, white: boolean) => ((kind + 1) << 1) | (white ? 1 : 0);
const kindOf = (cell: number) => ((cell >> 1) - 1) as Kind;
const isWhite = (cell: number) => (cell & 1) === 1;

/** Index d'une case : `rangée * 8 + colonne`, colonne a = 0, rangée 1 = 0. */
const squareIndex = (name: string) =>
  (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);

/** Position de départ, rangée par rangée depuis la première des blancs. */
function startPosition(): Uint8Array {
  const board = new Uint8Array(64);
  const back: Kind[] = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];

  for (let file = 0; file < 8; file++) {
    board[file] = encode(back[file]!, true);
    board[8 + file] = encode(PAWN, true);
    board[48 + file] = encode(PAWN, false);
    board[56 + file] = encode(back[file]!, false);
  }
  return board;
}

const PROMOTIONS: Record<string, Kind> = { q: QUEEN, r: ROOK, b: BISHOP, n: KNIGHT };

/**
 * Joue un demi-coup en algébrique longue : `e2e4`, `e1c1` (roque),
 * `e7e8q` (promotion). Modifie le plateau sur place.
 */
export function applyMove(board: Uint8Array, move: string): void {
  const from = squareIndex(move.slice(0, 2));
  const to = squareIndex(move.slice(2, 4));

  const cell = board[from]!;
  if (cell === EMPTY) return;

  const kind = kindOf(cell);
  const white = isWhite(cell);
  board[from] = EMPTY;

  // Prise en passant : un pion change de colonne pour arriver sur du vide.
  // Le pion capturé est resté sur la rangée de départ.
  if (kind === PAWN && from % 8 !== to % 8 && board[to] === EMPTY) {
    board[from - (from % 8) + (to % 8)] = EMPTY;
  }

  // Roque : le roi saute deux colonnes, la tour l'accompagne.
  if (kind === KING && Math.abs((to % 8) - (from % 8)) === 2) {
    const rank = to - (to % 8);
    const kingside = to % 8 === 6;
    board[rank + (kingside ? 5 : 3)] = board[rank + (kingside ? 7 : 0)]!;
    board[rank + (kingside ? 7 : 0)] = EMPTY;
  }

  const promoted = move.length > 4 ? PROMOTIONS[move[4]!] : undefined;
  board[to] = encode(promoted ?? kind, white);
}

/** Une pièce posée sur le plateau, prête à partir dans le tampon GPU. */
export interface Placement {
  /** 0 = colonne a … 7 = colonne h. */
  file: number;
  /** 0 = rangée 1 … 7 = rangée 8. */
  rank: number;
  kind: Kind;
  white: boolean;
}

/** Les pièces d'une position, dans l'ordre des cases. */
export function placements(board: Uint8Array): Placement[] {
  const out: Placement[] = [];
  for (let square = 0; square < 64; square++) {
    const cell = board[square]!;
    if (cell === EMPTY) continue;
    out.push({
      file: square % 8,
      rank: Math.floor(square / 8),
      kind: kindOf(cell),
      white: isWhite(cell),
    });
  }
  return out;
}

export interface HalfMove {
  /** Notation algébrique longue, ce que `applyMove` consomme. */
  lan: string;
  /** Notation algébrique standard, ce qui s'affiche. */
  san: string;
}

/**
 * Une partie de Paris, 1858 — trente-trois demi-coups, un sacrifice de dame
 * et un mat. Choisie parce qu'elle vide le plateau vite : les pièces
 * disparaissent, l'échiquier change beaucoup d'un coup à l'autre.
 */
export const GAME: HalfMove[] = [
  { lan: 'e2e4', san: 'e4' },      { lan: 'e7e5', san: 'e5' },
  { lan: 'g1f3', san: 'Nf3' },     { lan: 'd7d6', san: 'd6' },
  { lan: 'd2d4', san: 'd4' },      { lan: 'c8g4', san: 'Bg4' },
  { lan: 'd4e5', san: 'dxe5' },    { lan: 'g4f3', san: 'Bxf3' },
  { lan: 'd1f3', san: 'Qxf3' },    { lan: 'd6e5', san: 'dxe5' },
  { lan: 'f1c4', san: 'Bc4' },     { lan: 'g8f6', san: 'Nf6' },
  { lan: 'f3b3', san: 'Qb3' },     { lan: 'd8e7', san: 'Qe7' },
  { lan: 'b1c3', san: 'Nc3' },     { lan: 'c7c6', san: 'c6' },
  { lan: 'c1g5', san: 'Bg5' },     { lan: 'b7b5', san: 'b5' },
  { lan: 'c3b5', san: 'Nxb5' },    { lan: 'c6b5', san: 'cxb5' },
  { lan: 'c4b5', san: 'Bxb5+' },   { lan: 'b8d7', san: 'Nbd7' },
  { lan: 'e1c1', san: 'O-O-O' },   { lan: 'a8d8', san: 'Rd8' },
  { lan: 'd1d7', san: 'Rxd7' },    { lan: 'd8d7', san: 'Rxd7' },
  { lan: 'h1d1', san: 'Rd1' },     { lan: 'e7e6', san: 'Qe6' },
  { lan: 'b5d7', san: 'Bxd7+' },   { lan: 'f6d7', san: 'Nxd7' },
  { lan: 'b3b8', san: 'Qb8+' },    { lan: 'd7b8', san: 'Nxb8' },
  { lan: 'd1d8', san: 'Rd8#' },
];

/**
 * Toutes les positions de la partie, de la position initiale au mat.
 * `positions[n]` est l'échiquier **après** `n` demi-coups.
 */
export function replay(moves: HalfMove[] = GAME, start: Uint8Array = startPosition()): Uint8Array[] {
  const board = start.slice();
  const out: Uint8Array[] = [board.slice()];

  for (const move of moves) {
    applyMove(board, move.lan);
    out.push(board.slice());
  }
  return out;
}
