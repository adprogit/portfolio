/**
 * Lire une partie PGN : ce que `pgn_raymarcher.hh` délègue à `chess.hpp`,
 * réduit à ce qu'il faut pour rejouer un fichier.
 *
 * Le SAN (`Nbd7`, `exd6`, `Qh4+`) ne dit que la pièce et l'arrivée. Retrouver
 * le départ demande les coups **légaux** de la position : deux cavaliers qui
 * visent la même case, un fou cloué qui ne compte pas, une prise en passant.
 * D'où un petit générateur de coups, sans évaluation ni recherche — il ne joue
 * pas, il vérifie.
 *
 * Sortie : la même algébrique longue que `GAME`, que `applyMove` consomme.
 *
 * Le texte vient d'un fichier que le visiteur dépose : il n'est jamais
 * interprété autrement que par ce lecteur, et ce qui en ressort (noms des
 * joueurs, coups) ne s'affiche qu'en `textContent`.
 */

import { applyMove, BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK, type HalfMove, type Kind } from './game';

/** Au-delà, ce n'est plus une partie : on refuse plutôt que de ramer. */
export const MAX_PGN_BYTES = 512 * 1024;
const MAX_PLIES = 1200;

interface Position {
  board: Uint8Array;
  white: boolean;
  /** Droits de roque, sous-ensemble de `KQkq`. */
  castle: string;
  /** Case de prise en passant, ou -1. */
  ep: number;
}

export interface Game {
  moves: HalfMove[];
  start: Uint8Array;
  /** « Blancs – Noirs », si l'en-tête les nomme. */
  players: string;
  result: string;
}

/*
 * ── Garde ─────────────────────────────────────────────────────────────
 * Le fichier vient de n'importe qui. Il n'atteint ni serveur ni base (rien
 * n'est envoyé : pas d'injection SQL possible, il n'y a pas de requête), et
 * rien de ce qui en sort n'est interprété comme du HTML ou du code : le
 * composant l'écrit en `textContent`, et la CSP refuse tout script inline.
 * Cette garde ajoute ce qui reste :
 *
 * - **liste blanche** : seuls quatre en-têtes sont lus (White, Black, Result,
 *   FEN), chacun validé ; les coups passent par une grammaire SAN stricte ;
 * - **texte affiché nettoyé** : caractères de contrôle et de mise en forme
 *   bidirectionnelle retirés (un nom ne peut pas se retourner à l'écran ni
 *   déborder sur l'interface), longueur bornée ;
 * - **coût borné** : taille du fichier, nombre de coups, et une lecture en
 *   une passe — aucune expression régulière qui puisse devenir quadratique ;
 * - **pas de prototype** : les en-têtes vivent dans une `Map`, une clé
 *   `__proto__` n'est qu'une clé ignorée.
 */

/** Contrôles C0/C1, formats invisibles et bidi (U+200B–200F, 202A–202E, 2066–2069, FEFF). */
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

/** Un texte venu du fichier, rendu inoffensif à l'affichage : une ligne, bornée. */
export function cleanText(value: string, max = 60): string {
  // `<`, `>` et l'accent grave n'ont rien à faire dans un nom de joueur : ils
  // sont inoffensifs en `textContent`, mais on ne parie pas sur l'avenir.
  const flat = value.replace(UNSAFE_CHARS, ' ').replace(/[<>`]/g, '').replace(/ {2,}/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

/** Le coup qui a cassé la lecture, pour le dire au visiteur. */
export class PgnError extends Error {
  readonly san: string;
  constructor(readonly ply: number, san: string) {
    super(`${ply}`);
    this.san = cleanText(san, 16);
  }
}

const HEADERS = new Set(['White', 'Black', 'Result', 'FEN']);
const FEN = /^[pnbrqkPNBRQK1-8]{1,8}(\/[pnbrqkPNBRQK1-8]{1,8}){7} [wb] (-|K?Q?k?q?) (-|[a-h][36])( \d{1,4} \d{1,4})?$/;
const RESULT = /^(1-0|0-1|1\/2-1\/2)$/;

/**
 * Sépare en-têtes et coups en **une seule passe** : commentaires `{…}` et
 * `;…`, variantes `(…)` à toute profondeur, lignes d'en-tête `[Clé "valeur"]`.
 * Linéaire quoi qu'on lui donne — un fichier piégé ne peut pas faire ramer.
 */
function split(text: string): { headers: Map<string, string>; body: string } {
  const headers = new Map<string, string>();
  let body = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '{') {
      const end = text.indexOf('}', i);
      i = end < 0 ? text.length : end;
    } else if (ch === ';') {
      const end = text.indexOf('\n', i);
      i = end < 0 ? text.length : end;
    } else if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth) continue;
    else if (ch === '[') {
      const end = text.indexOf(']', i);
      const line = /^\[([A-Za-z]+)\s+"([^"\n]*)"\s*\]$/.exec(text.slice(i, end < 0 ? i + 1 : end + 1));
      if (line && HEADERS.has(line[1]!)) headers.set(line[1]!, line[2]!);
      i = end < 0 ? text.length : end;
    } else body += ch;
  }
  return { headers, body };
}

const LETTERS: Record<string, Kind> = { P: PAWN, N: KNIGHT, B: BISHOP, R: ROOK, Q: QUEEN, K: KING };

const cell = (kind: Kind, white: boolean) => ((kind + 1) << 1) | (white ? 1 : 0);
const kindOf = (c: number) => ((c >> 1) - 1) as Kind;
const whiteOf = (c: number) => (c & 1) === 1;
const name = (sq: number) => 'abcdefgh'[sq & 7]! + ((sq >> 3) + 1);

const KNIGHT_STEPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_STEPS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK_DIRS = KING_STEPS.filter(([f, r]) => !f || !r);
const BISHOP_DIRS = KING_STEPS.filter(([f, r]) => f && r);

/** La case `(file, rank)` si elle est sur le plateau, sinon -1. */
const at = (file: number, rank: number) =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8 ? rank * 8 + file : -1;

/** `sq` est-elle attaquée par le camp `byWhite` ? */
function attacked(board: Uint8Array, sq: number, byWhite: boolean): boolean {
  const f = sq & 7;
  const r = sq >> 3;
  const is = (s: number, ...kinds: Kind[]) =>
    s >= 0 && board[s] !== 0 && whiteOf(board[s]!) === byWhite && kinds.includes(kindOf(board[s]!));

  const back = byWhite ? -1 : 1;
  if (is(at(f - 1, r + back), PAWN) || is(at(f + 1, r + back), PAWN)) return true;
  if (KNIGHT_STEPS.some(([df, dr]) => is(at(f + df!, r + dr!), KNIGHT))) return true;
  if (KING_STEPS.some(([df, dr]) => is(at(f + df!, r + dr!), KING))) return true;

  const ray = (dirs: number[][], ...kinds: Kind[]) =>
    dirs.some(([df, dr]) => {
      for (let i = 1; ; i++) {
        const s = at(f + df! * i, r + dr! * i);
        if (s < 0) return false;
        if (board[s]) return is(s, ...kinds);
      }
    });
  return ray(ROOK_DIRS, ROOK, QUEEN) || ray(BISHOP_DIRS, BISHOP, QUEEN);
}

/** Les coups légaux du camp au trait, en algébrique longue. */
function legalMoves(pos: Position): string[] {
  const { board, white } = pos;
  const out: string[] = [];
  const push = (from: number, to: number, promote = false) => {
    for (const p of promote ? 'qrbn' : ['']) out.push(name(from) + name(to) + p);
  };

  for (let from = 0; from < 64; from++) {
    const c = board[from]!;
    if (!c || whiteOf(c) !== white) continue;
    const kind = kindOf(c);
    const f = from & 7;
    const r = from >> 3;
    const free = (s: number) => s >= 0 && !board[s];
    const enemy = (s: number) => s >= 0 && board[s] !== 0 && whiteOf(board[s]!) !== white;

    if (kind === PAWN) {
      const dir = white ? 1 : -1;
      const last = r + dir === (white ? 7 : 0);
      const one = at(f, r + dir);
      if (free(one)) {
        push(from, one, last);
        const two = at(f, r + 2 * dir);
        if (r === (white ? 1 : 6) && free(two)) push(from, two);
      }
      for (const df of [-1, 1]) {
        const s = at(f + df, r + dir);
        if (enemy(s) || (s >= 0 && s === pos.ep)) push(from, s, last);
      }
    } else if (kind === KNIGHT || kind === KING) {
      for (const [df, dr] of kind === KNIGHT ? KNIGHT_STEPS : KING_STEPS) {
        const s = at(f + df!, r + dr!);
        if (free(s) || enemy(s)) push(from, s);
      }
    } else {
      const dirs = kind === ROOK ? ROOK_DIRS : kind === BISHOP ? BISHOP_DIRS : KING_STEPS;
      for (const [df, dr] of dirs) {
        for (let i = 1; ; i++) {
          const s = at(f + df! * i, r + dr! * i);
          if (free(s)) push(from, s);
          else {
            if (enemy(s)) push(from, s);
            break;
          }
        }
      }
    }
  }

  // Roques : droits, cases libres, et le roi ne traverse aucune case attaquée.
  const home = white ? 0 : 56;
  if (board[home + 4] === cell(KING, white) && !attacked(board, home + 4, !white)) {
    const side = (flag: string, rook: number, empty: number[], safe: number[], to: number) => {
      if (
        pos.castle.includes(flag) &&
        board[home + rook] === cell(ROOK, white) &&
        empty.every((s) => !board[home + s]) &&
        safe.every((s) => !attacked(board, home + s, !white))
      )
        out.push(name(home + 4) + name(home + to));
    };
    side(white ? 'K' : 'k', 7, [5, 6], [5, 6], 6);
    side(white ? 'Q' : 'q', 0, [1, 2, 3], [3, 2], 2);
  }

  // Un coup qui laisse son roi en prise n'en est pas un.
  return out.filter((lan) => {
    const next = pos.board.slice();
    applyMove(next, lan);
    const king = next.indexOf(cell(KING, white));
    return king >= 0 && !attacked(next, king, !white);
  });
}

/** Joue un coup déjà légal et met à jour trait, roques et prise en passant. */
function play(pos: Position, lan: string): void {
  const from = (lan.charCodeAt(1) - 49) * 8 + lan.charCodeAt(0) - 97;
  const to = (lan.charCodeAt(3) - 49) * 8 + lan.charCodeAt(2) - 97;
  const pawn = kindOf(pos.board[from]!) === PAWN;

  applyMove(pos.board, lan);
  pos.ep = pawn && Math.abs(to - from) === 16 ? (from + to) / 2 : -1;
  // Un roi ou une tour qui part, une tour prise : le droit tombe.
  for (const [sq, flag] of [[4, 'KQ'], [7, 'K'], [0, 'Q'], [60, 'kq'], [63, 'k'], [56, 'q']] as const) {
    if (from === sq || to === sq) pos.castle = pos.castle.replace(new RegExp(`[${flag}]`, 'g'), '');
  }
  pos.white = !pos.white;
}

/** La position de départ, ou celle d'un en-tête `[FEN "…"]`. */
function fromFen(fen: string | undefined): Position {
  const [placement, side, castle, ep] = (
    fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
  ).split(/\s+/);
  const rows = placement?.split('/') ?? [];
  if (rows.length !== 8) throw new PgnError(0, 'FEN');

  const board = new Uint8Array(64);
  rows.forEach((row, i) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch);
      else {
        const kind = LETTERS[ch.toUpperCase()];
        if (kind === undefined || file > 7) throw new PgnError(0, 'FEN');
        board[(7 - i) * 8 + file++] = cell(kind, ch === ch.toUpperCase());
      }
    }
  });
  return {
    board,
    white: side !== 'b',
    castle: castle === '-' || !castle ? '' : castle,
    ep: ep && /^[a-h][36]$/.test(ep) ? (ep.charCodeAt(1) - 49) * 8 + ep.charCodeAt(0) - 97 : -1,
  };
}

/**
 * Lit la **première** partie d'un texte PGN. Les commentaires, variantes,
 * annotations et numéros de coups sont écartés ; chaque coup SAN est résolu
 * contre les coups légaux de la position.
 */
export function parsePgn(text: string): Game {
  // Un fichier binaire (image, archive renommée) n'est pas un PGN.
  if (text.includes('\u0000')) throw new PgnError(0, '');

  const parts = split(text.slice(0, MAX_PGN_BYTES));
  const headers = parts.headers;
  const body = parts.body.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ');

  const fen = headers.get('FEN');
  if (fen !== undefined && !FEN.test(fen.trim())) throw new PgnError(0, 'FEN');
  const pos = fromFen(fen?.trim());
  const start = pos.board.slice();
  const moves: HalfMove[] = [];

  for (const token of body.split(/\s+/)) {
    if (!token || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      if (token) break; // le résultat clôt la partie : la suivante n'est pas lue
      continue;
    }
    if (moves.length >= MAX_PLIES) break;
    if (/^e\.p\.?$/.test(token)) continue; // « e.p. » annote la prise, ce n'est pas un coup

    const san = token.replace(/[+#!?]+$/, '');
    const legal = legalMoves(pos);
    let found: string[];

    const castle = /^[O0]-[O0](-[O0])?$/.exec(san);
    if (castle) {
      const home = pos.white ? 0 : 56;
      const lan = name(home + 4) + name(home + (castle[1] ? 2 : 6));
      found = pos.board[home + 4] === cell(KING, pos.white) ? legal.filter((move) => move === lan) : [];
    } else {
      const m = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQ]))?$/.exec(san);
      if (!m) throw new PgnError(moves.length + 1, token);
      const kind = LETTERS[m[1] ?? 'P']!;
      const promo = m[5]?.toLowerCase() ?? '';
      found = legal.filter((lan) => {
        const from = (lan.charCodeAt(1) - 49) * 8 + lan.charCodeAt(0) - 97;
        return (
          kindOf(pos.board[from]!) === kind &&
          lan.slice(2, 4) === m[4] &&
          (!m[2] || lan[0] === m[2]) &&
          (!m[3] || lan[1] === m[3]) &&
          lan.slice(4) === (kind === PAWN ? promo : '')
        );
      });
    }

    if (found.length !== 1) throw new PgnError(moves.length + 1, token);
    play(pos, found[0]!);
    moves.push({ lan: found[0]!, san: cleanText(token, 12) });
  }

  const player = (key: string) => {
    const value = cleanText(headers.get(key) ?? '');
    return value === '?' ? '' : value;
  };
  const result = headers.get('Result') ?? '';
  return {
    moves,
    start,
    players: [player('White'), player('Black')].filter(Boolean).join(' – '),
    result: RESULT.test(result) ? result : '',
  };
}
