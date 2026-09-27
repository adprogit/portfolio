/**
 * Met la garde du lecteur PGN (`src/lib/chess/pgn.ts`) à l'épreuve.
 *
 * Un PGN déposé sur l'échiquier vient de n'importe qui. Ce script lui fait
 * lire ce qu'un fichier hostile pourrait contenir et vérifie trois choses :
 *
 * 1. **rien de dangereux ne ressort** : balises, `javascript:`, gabarits,
 *    SQL, caractères bidi ou de contrôle, en-têtes hors liste blanche,
 *    pollution de prototype — ce qui sort (noms, résultat, coups, message
 *    d'erreur) est une ligne de texte bornée, sans balise ni contrôle ;
 * 2. **rien ne peut faire ramer** : fichiers piégés de 512 Ko (imbrication
 *    profonde, en-têtes sans fin, lignes vides) lus en temps linéaire ;
 * 3. **les vraies parties passent toujours** : positions finales comparées à
 *    celles que donne `chess.hpp`, la bibliothèque du projet C++.
 *
 * Le module TypeScript est compilé à la volée par esbuild (déjà présent,
 * c'est lui qui compile le site pour Vite).
 *
 * usage: node tools/pgn-guard.mjs
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const bundle = await build({
  stdin: {
    contents: `export * from './src/lib/chess/pgn'; export { replay } from './src/lib/chess/game';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  logLevel: 'silent',
});
const { parsePgn, PgnError, MAX_PGN_BYTES, replay } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

const problems = [];
const fail = (label, text) => problems.push(`${label} — ${text}`);

/** Ce qui peut s'afficher : une ligne, bornée, sans balise ni contrôle. */
const UNSAFE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿<>`]/;
const SAN = /^[A-Za-z0-9=+#!?-]{1,12}$/;

function outputs(label, text) {
  try {
    return { game: parsePgn(text) };
  } catch (error) {
    if (!(error instanceof PgnError)) fail(label, `erreur non maîtrisée : ${error}`);
    return { error };
  }
}

function checkSafe(label, { game, error }) {
  const shown = game ? [game.players, game.result, ...game.moves.map((m) => m.san)] : [error?.san ?? ''];
  for (const text of shown) {
    if (UNSAFE.test(text)) fail(label, `texte dangereux affichable : ${JSON.stringify(text)}`);
    if (text.length > 125) fail(label, `texte non borné (${text.length} caractères)`);
  }
  if (game && !['', '1-0', '0-1', '1/2-1/2'].includes(game.result))
    fail(label, `résultat hors liste blanche : ${JSON.stringify(game.result)}`);
  for (const move of game?.moves ?? []) {
    if (!SAN.test(move.san)) fail(label, `coup affiché hors grammaire : ${JSON.stringify(move.san)}`);
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move.lan)) fail(label, `coup interne invalide : ${move.lan}`);
  }
}

/* ── 1. Charges hostiles ───────────────────────────────────────────── */

const PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(document.cookie)',
  "'; DROP TABLE players; --",
  "1' OR '1'='1",
  '${alert(1)}',
  '{{constructor.constructor("alert(1)")()}}',
  '`${fetch("//evil")}`',
  '‮gnp.exe',
  'Ma​gnus\u0000\u0007',
  '$& $` $\' $1',
  'A'.repeat(5000),
];

for (const payload of PAYLOADS) {
  const label = `charge ${JSON.stringify(payload.slice(0, 24))}`;
  const quoted = payload.replace(/"/g, "'");
  // Dans les en-têtes lus, dans un en-tête ignoré, dans un commentaire, à la place d'un coup.
  checkSafe(label, outputs(label, `[White "${quoted}"]\n[Black "${quoted}"]\n[Result "${quoted}"]\n[Event "${quoted}"]\n\n1. e4 {${payload}} e5 *`));
  checkSafe(label, outputs(label, `1. e4 e5 2. ${payload} Nc6 *`));
  checkSafe(label, outputs(label, `[FEN "${quoted}"]\n\n1. e4 *`));
}

// Pollution de prototype : une clé d'en-tête ne touche pas Object.prototype.
outputs('prototype', '[__proto__ "{\\"polluted\\":1}"]\n[constructor "x"]\n[toString "x"]\n\n1. e4 *');
if ({}.polluted !== undefined || Object.prototype.polluted !== undefined)
  fail('prototype', 'Object.prototype a été modifié');

// Fichier binaire.
if (!outputs('binaire', 'PK\u0003\u0004\u0000\u0000garbage').error) fail('binaire', 'accepté comme une partie');

/* ── 2. Fichiers piégés : temps linéaire ───────────────────────────── */

const N = MAX_PGN_BYTES;
const TRAPS = {
  'variantes imbriquées': '('.repeat(N / 2) + ')'.repeat(N / 2) + ' 1. e4 *',
  'variantes jamais refermées': '1. e4 ' + '('.repeat(N),
  'crochets sans fin': '['.repeat(N),
  'en-tête interminable': '[White "' + 'x'.repeat(N) + '"]',
  'lignes vides et crochets': '\n'.repeat(N / 2) + '[' + ' '.repeat(N / 2),
  'accolades': '{'.repeat(N),
  'coups en boucle': '1. Nf3 Nf6 2. Ng1 Ng8 '.repeat(N / 24),
  'nombres': '1.'.repeat(N / 2),
};

for (const [label, text] of Object.entries(TRAPS)) {
  const started = performance.now();
  checkSafe(label, outputs(label, text));
  const ms = performance.now() - started;
  if (ms > 1500) fail(label, `${ms.toFixed(0)} ms pour ${(text.length / 1024).toFixed(0)} Ko`);
}

/* ── 3. Les vraies parties passent toujours ───────────────────────── */

const LETTERS = 'PRNBQK';
function fen(board) {
  let out = '';
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const c = board[r * 8 + f];
      if (!c) { empty++; continue; }
      if (empty) { out += empty; empty = 0; }
      const l = LETTERS[(c >> 1) - 1];
      out += c & 1 ? l : l.toLowerCase();
    }
    if (empty) out += empty;
    if (r) out += '/';
  }
  return out;
}

// Positions finales obtenues avec external/chess.hpp de zugzwang.
const GAMES = [
  {
    label: 'Opéra, avec commentaires, variantes imbriquées et NAG',
    pgn: `[White "Morphy, Paul"]\n[Black "Duke Karl / Count Isouard"]\n[Result "1-0"]\n\n1.e4 e5 2.Nf3 d6 3.d4 Bg4 {weak} 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 (9...Qb4 10.Qxb4 (10.O-O-O) Bxb4) 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 $4 15.Bxd7+ Nxd7 16.Qb8+! Nxb8 17.Rd8# 1-0`,
    plies: 33,
    fen: '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5',
    players: 'Morphy, Paul – Duke Karl / Count Isouard',
  },
  {
    label: 'promotions, roques, prise en passant, désambiguïsation',
    pgn: '1. e4 d5 2. e5 f5 3. exf6 Nc6 4. fxg7 Bf5 5. gxh8=N Qd6 6. Nf3 O-O-O 7. Bc4 Nb4 8. O-O Na6 9. Nc3 Nb8 10. d3 Nd7 11. Ng5 Ngf6 12. Nhf7 Nb6 13. Nge4 dxe4 14. dxe4 Bxe4 15. a4 Nbd5 16. a5 b5 17. axb6 e.p. Kb8 *',
    plies: 34,
    fen: '1k1r1b2/p1p1pN1p/1P1q1n2/3n4/2B1b3/2N5/1PP2PPP/R1BQ1RK1',
  },
  {
    label: 'départ depuis un FEN',
    pgn: '[FEN "4k3/1P6/8/8/8/8/6p1/R3K2R w KQ - 0 1"]\n\n1. b8=Q+ Kd7 2. O-O-O+ Kc6 3. Kb1 g1=N 4. Rh8 *',
    plies: 7,
    fen: '1Q5R/8/2k5/8/8/8/8/1K1R2n1',
  },
];

for (const { label, pgn, plies, fen: expected, players } of GAMES) {
  const { game, error } = outputs(label, pgn);
  if (!game) {
    fail(label, `refusée au demi-coup ${error?.ply} (${error?.san})`);
    continue;
  }
  const last = replay(game.moves, game.start).at(-1);
  if (game.moves.length !== plies) fail(label, `${game.moves.length} demi-coups au lieu de ${plies}`);
  if (fen(last) !== expected) fail(label, `position finale ${fen(last)} au lieu de ${expected}`);
  if (players && game.players !== players) fail(label, `joueurs « ${game.players} »`);
}

// Un coup illégal est refusé, et le message dit lequel.
const illegal = outputs('coup illégal', '1. e4 e5 2. Ke3 *').error;
if (!(illegal instanceof PgnError) || illegal.ply !== 3 || illegal.san !== 'Ke3')
  fail('coup illégal', 'non signalé au bon demi-coup');

/* ── Verdict ───────────────────────────────────────────────────────── */

if (problems.length) {
  console.error(`✘ ${problems.length} point(s) dans la garde PGN :`);
  problems.forEach((problem) => console.error('  - ' + problem));
  process.exit(1);
}

console.log(
  `Garde PGN : ${PAYLOADS.length} charges hostiles neutralisées, ${Object.keys(TRAPS).length} fichiers piégés lus en temps linéaire, ${GAMES.length} parties conformes à chess.hpp.`
);
