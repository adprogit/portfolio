/**
 * Compare les shaders WGSL au C++ dont ils sont le portage.
 *
 * Il n'y a pas de GPU dans cet environnement : ni le WGSL ni le GLSL ne
 * peuvent être compilés ici. Ce script ne remplace pas Tint ou Naga, mais il
 * attrape ce qui casse vraiment un portage à la main :
 *
 * 1. le parenthésage et les points d'entrée ;
 * 2. un identifiant réservé par WGSL utilisé comme nom ;
 * 3. un appel vers une fonction qui n'existe pas ;
 * 4. **une constante mal recopiée** — le shader et sa source C++ doivent
 *    contenir exactement les mêmes nombres, à des écarts déclarés près.
 *
 * Le C++ vit hors du dépôt (`../../raymarcher/`). S'il est absent, le script
 * fait les contrôles internes et passe la comparaison.
 *
 * usage: node tools/shader-parity.mjs
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { minifyWgsl } from './wgsl-minify.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cxx = join(root, '..', 'raymarcher', 'src');

/* ── Vocabulaire WGSL ───────────────────────────────────────────── */

const RESERVED = new Set(
  `NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become
   binding_array cast catch class co_await co_return co_yield coherent column_major common compile
   compile_fragment concept const_cast consteval constexpr constinit crate debugger decltype delete
   demote demote_to_helper do dynamic_cast enum explicit export extends extern external fallthrough
   filter final finally friend from fxgroup get goto groupshared highp impl implements import inline
   instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut mutable
   namespace new nil noexcept noinline nointerpolation noperspective null nullptr of operator package
   packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public
   readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof
   smooth snorm static static_assert static_cast std subroutine super target template this thread_local
   throw trait try type typedef typeid typename union unless unorm unsafe unsized use using varying
   virtual volatile wgsl where with writeonly yield`.split(/\s+/)
);

const BUILTINS = new Set(
  `abs acos asin atan atan2 ceil clamp cos cosh countOneBits cross degrees determinant distance dot exp
   exp2 faceForward firstLeadingBit firstTrailingBit floor fma fract inverseSqrt length log log2 max min
   mix modf normalize pow quantizeToF16 radians reflect refract reverseBits round saturate select sign
   sin sinh smoothstep sqrt step tan tanh transpose trunc array bool f32 i32 u32 vec2 vec3 vec4 vec2f
   vec3f vec4f vec2u vec3u vec4u vec2i vec3i vec4i mat2x2f mat3x3f mat4x4f textureSample`.split(/\s+/)
);

const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'case', 'else', 'loop']);

/* ── Outils ─────────────────────────────────────────────────────── */

const read = (path) => readFileSync(join(root, path), 'utf8');

/** Le contenu d'un `export const NOM = \`…\`;`. */
function extract(source, name) {
  const match = source.match(new RegExp(`export const ${name} = \\\`([\\s\\S]*?)\\\`;`));
  if (!match) throw new Error(`${name} introuvable`);
  return match[1];
}

const stripComments = (text) =>
  text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Les commentaires d'un WGSL, lus comme WGSL les lit : **les blocs s'imbriquent**.
 * Une ouverture de bloc égarée dans un commentaire (un chemin du genre
 * « chess/<étoile>_sdf.cpp ») en ouvre un second, et la première fermeture ne
 * referme plus que celui-là. Le reste du shader disparaît dans le
 * commentaire, et le module est refusé. La regex du C++ ne voit pas ce cas.
 *
 * Renvoie le code sans ses commentaires, ou `null` si un bloc reste ouvert.
 */
function stripWgslComments(text) {
  let out = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === '/*') {
      depth++;
      i++;
    } else if (depth && pair === '*/') {
      depth--;
      i++;
    } else if (!depth && pair === '//') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (!depth) {
      out += text[i];
    }
  }
  return depth ? null : out;
}

/**
 * Les nombres d'un morceau de code, sans les entiers nus : un `2` d'indice ou
 * un compteur de boucle n'a rien à voir avec une constante de géométrie, et
 * les comparer produirait du bruit.
 */
function constants(text) {
  const found = stripComments(text).match(/\d+\.\d+(?:e-?\d+)?/g) ?? [];
  // Zéro n'est jamais une constante de géométrie : c'est un axe qu'on annule.
  // Le C++ l'écrit `0`, le WGSL `0.0` — les comparer n'apprendrait rien.
  return new Set(found.map(Number).filter((value) => value !== 0));
}

const difference = (a, b) => [...a].filter((value) => !b.has(value)).sort((x, y) => x - y);

/* ── Contrôles internes à un shader ─────────────────────────────── */

function checkStructure(label, wgsl, entries) {
  const problems = [];
  const stripped = stripWgslComments(wgsl);
  if (stripped === null) return [`${label} — commentaire /* … */ jamais refermé (les blocs s'imbriquent en WGSL)`];
  const code = stripped.replace(/@[A-Za-z_]\w*(\s*\([^)]*\))?/g, '');

  for (const [open, close] of [
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ]) {
    const a = (code.match(new RegExp('\\' + open, 'g')) ?? []).length;
    const b = (code.match(new RegExp('\\' + close, 'g')) ?? []).length;
    if (a !== b) problems.push(`déséquilibre ${open}${close} : ${a} / ${b}`);
  }

  const declared = new Set();
  for (const m of code.matchAll(/\bfn\s+([A-Za-z_]\w*)/g)) declared.add(m[1]);
  for (const m of code.matchAll(/\b(?:let|var|const)\s+([A-Za-z_]\w*)/g)) declared.add(m[1]);
  for (const m of code.matchAll(/\bstruct\s+([A-Za-z_]\w*)/g)) declared.add(m[1]);
  for (const m of code.matchAll(/([A-Za-z_]\w*)\s*:\s*[A-Za-z_]/g)) declared.add(m[1]);

  for (const name of declared) {
    if (RESERVED.has(name)) problems.push(`identifiant réservé par WGSL : « ${name} »`);
  }

  for (const m of code.matchAll(/([A-Za-z_]\w*)\s*\(/g)) {
    const name = m[1];
    if (KEYWORDS.has(name) || BUILTINS.has(name) || declared.has(name)) continue;
    problems.push(`appel vers une fonction inconnue : « ${name} »`);
  }

  for (const [stage, entry] of entries) {
    if (!new RegExp(`@${stage}\\s*\\n?\\s*fn\\s+${entry}\\b`).test(wgsl))
      problems.push(`point d'entrée manquant : @${stage} fn ${entry}`);
  }

  return problems.map((text) => `${label} — ${text}`);
}

/* ── Comparaison avec le C++ ────────────────────────────────────── */

/**
 * Un appariement : un morceau de WGSL, les sources C++ correspondantes, et
 * les écarts qu'on accepte. Chaque écart déclaré est une décision de portage,
 * pas un oubli — d'où le commentaire qui l'accompagne.
 */
function comparePair({ label, wgsl, sources, inline = '', allowInCxx = [], allowInWgsl = [] }) {
  const pieces = inline ? [inline] : [];
  for (const source of sources) {
    if (!existsSync(join(cxx, source))) return [`${label} — source C++ absente : ${source}`];
    pieces.push(readFileSync(join(cxx, source), 'utf8'));
  }

  const fromCxx = constants(pieces.join('\n'));
  const fromWgsl = constants(wgsl);

  const allowedCxx = new Set(allowInCxx);
  const allowedWgsl = new Set(allowInWgsl);

  const lost = difference(fromCxx, fromWgsl).filter((value) => !allowedCxx.has(value));
  const extra = difference(fromWgsl, fromCxx).filter((value) => !allowedWgsl.has(value));

  const problems = [];
  if (lost.length) problems.push(`${label} — constantes du C++ absentes du WGSL : ${lost.join(', ')}`);
  if (extra.length) problems.push(`${label} — constantes du WGSL absentes du C++ : ${extra.join(', ')}`);
  return problems;
}

/** Une tranche d'un fichier C++, entre deux repères. */
function slice(file, from, to) {
  const source = readFileSync(join(cxx, file), 'utf8');
  const start = source.indexOf(from);
  const end = source.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error(`repères introuvables dans ${file}`);
  return source.slice(start, end);
}

/**
 * Vérifie qu'une valeur du shader existe bien dans le C++. Sert aux constantes
 * dont la source contient trop d'autre chose pour une comparaison d'ensembles
 * (scene.cpp porte aussi le suréchantillonnage et la boucle OpenMP).
 */
function assertPresent(label, file, values) {
  const source = stripComments(readFileSync(join(cxx, file), 'utf8'));
  return values
    .filter((value) => !new RegExp(`(?<![\\d.])${String(value).replace('.', '\\.')}f?(?![\\d])`).test(source))
    .map((value) => `${label} — ${value} introuvable dans ${file}`);
}

/** Le corps d'une fonction WGSL, accolades comprises. */
function body(wgsl, name) {
  const start = wgsl.indexOf(`fn ${name}(`);
  if (start < 0) throw new Error(`fn ${name} introuvable`);

  let depth = 0;
  for (let i = wgsl.indexOf('{', start); i < wgsl.length; i++) {
    if (wgsl[i] === '{') depth++;
    else if (wgsl[i] === '}' && --depth === 0) return wgsl.slice(start, i + 1);
  }
  throw new Error(`fn ${name} non refermée`);
}

/* ── Programme ──────────────────────────────────────────────────── */

const problems = [];

/*
 * Le seul shader du site est celui de l'échiquier. Le pion de l'accueil a
 * disparu avec son rendu WebGPU — le hero est aujourd'hui un volume CSS — et
 * la comparaison WGSL/GLSL qui lui était consacrée est partie avec lui.
 */

/* L'échiquier : WGSL contre les sources C++, fonction par fonction. */
const chess = extract(read('src/lib/chess/shader-wgsl.ts'), 'SHADER');

const present = extract(read('src/lib/chess/shader-wgsl.ts'), 'PRESENT');

// Le source, et ce que le build livre réellement : le WGSL minifié.
for (const [label, code] of [
  ['échiquier (WGSL)', chess],
  ['échiquier (WGSL minifié)', minifyWgsl(chess)],
]) {
  problems.push(
    ...checkStructure(label, code, [
      ['vertex', 'vs_main'],
      ['fragment', 'fs_main'],
    ])
  );
}
for (const [label, code] of [
  ['présentation (WGSL)', present],
  ['présentation (WGSL minifié)', minifyWgsl(present)],
]) {
  problems.push(
    ...checkStructure(label, code, [
      ['vertex', 'vs_present'],
      ['fragment', 'fs_present'],
    ])
  );
}

if (!existsSync(cxx)) {
  console.log('⚠ sources C++ absentes — comparaison des constantes passée');
} else {
  // Le bloc de `const` du shader : les valeurs qui ne vivent dans aucun corps
  // de fonction (marche, plateau, palette, angles précalculés).
  const constBlock = (chess.match(/^const .*$/gm) ?? []).join('\n');

  const pairs = [
    {
      label: 'primitives 2D',
      wgsl: [body(chess, 'ellipse2'), body(chess, 'sphere2'), body(chess, 'box2')].join('\n'),
      sources: ['sdf/sdf_2d.cpp'],
      // Le garde-fou contre la division par zéro n'existe pas en C++.
      allowInWgsl: [1e-5],
    },
    {
      label: 'primitives 3D',
      wgsl: [
        body(chess, 'sphere3'),
        body(chess, 'ellipse3'),
        body(chess, 'box3'),
        body(chess, 'round_cone'),
      ].join('\n'),
      sources: ['sdf/sdf_3d.cpp'],
      allowInWgsl: [1e-5],
    },
    {
      label: 'socles',
      wgsl: [body(chess, 'blend'), body(chess, 'piece_base'), body(chess, 'piece_base_large')].join('\n'),
      sources: ['sdf/sdf.hh'],
    },
    {
      label: 'pion',
      wgsl: body(chess, 'sdf_pawn'),
      sources: ['sdf/chess/pawn_sdf.cpp'],
      // Sphère englobante et rayon du socle : déplacés dans piece_radius /
      // piece_distance, qui sont comparés à part.
      allowInCxx: [1.25, 6.0, 2.0],
    },
    {
      label: 'tour',
      wgsl: body(chess, 'sdf_rook'),
      sources: ['sdf/chess/rook_sdf.cpp'],
      // 2.0 / 3.0 / 3.141593 : l'angle des créneaux, précalculé en cos/sin.
      allowInCxx: [1.25, 8.0, 3.141593, 3.0, 2.0, 1.0],
    },
    {
      label: 'fou',
      wgsl: body(chess, 'sdf_bishop'),
      sources: ['sdf/chess/bishop_sdf.cpp'],
      // 0.4 : l'angle d'inclinaison de la mitre, précalculé en cos/sin.
      allowInCxx: [1.25, 8.0, 0.4, 2.0],
    },
    {
      label: 'cavalier',
      wgsl: body(chess, 'sdf_knight'),
      sources: ['sdf/chess/knight_sdf.cpp'],
      // 1.3 : l'angle du museau, précalculé en cos/sin.
      allowInCxx: [1.25, 7.0, 1.3, 2.0],
    },
    {
      label: 'dame',
      wgsl: body(chess, 'sdf_queen'),
      sources: ['sdf/chess/queen_sdf.cpp'],
      allowInCxx: [1.25, 9.0, 2.0],
    },
    {
      label: 'roi',
      wgsl: body(chess, 'sdf_king'),
      sources: ['sdf/chess/king_sdf.cpp'],
      allowInCxx: [1.25, 9.0, 2.0],
    },
    {
      label: 'plateau',
      // board_material ne porte que des couleurs : c'est l'appariement
      // « palette » qui s'en charge.
      wgsl: [constBlock, body(chess, 'board_distance')].join('\n'),
      sources: ['sdf/chess/chess_board.hh'],
      // BORDER n'apparaît pas dans le shader : il est déjà fondu dans
      // HALF_TOTAL, que le C++ calcule (HALF_PLAY + BORDER) au lieu de l'écrire.
      allowInCxx: [4.0],
      allowInWgsl: [
        // Valeurs que le C++ calcule au lieu de les écrire :
        32.0, // HALF_PLAY  = CELL_SIZE * NUM_CELLS * 0.5
        36.0, // HALF_TOTAL = HALF_PLAY + BORDER
        // Constantes portées par d'autres fichiers, contrôlées plus bas :
        1.0, 24.0, 200.0, 0.001, 0.4, 0.6, 0.1,
        // Cosinus et sinus précalculés des trois angles de pièces :
        0.5, 0.8660254, 0.921061, 0.3894183, 0.2674988, 0.9635582,
      ],
      // Les couleurs viennent de main.cpp, comparées à part.
    },
    {
      label: 'palette',
      wgsl: [body(chess, 'board_material'), body(chess, 'piece_material'), constBlock].join('\n'),
      sources: [],
      inline: [
        slice('main.cpp', 'if (THEME == Theme::Wood)', 'else'),
        slice('main.cpp', 'auto board_dark', '// ── Plateau'),
      ].join('\n'),
      // kr : coefficients de réflexion, inutilisés — main.cpp rend en depth 0.
      allowInCxx: [0.05],
      allowInWgsl: [
        // Géométrie et marche, contrôlées par les autres appariements :
        8.0, 32.0, 36.0, 2.0, 1.0, 24.0, 200.0, 0.001, 0.5, 0.8660254,
        0.921061, 0.3894183, 0.2674988, 0.9635582,
      ],
    },
  ];

  for (const pair of pairs) problems.push(...comparePair(pair));

  // Constantes de marche et d'ombrage : scene.cpp porte aussi le
  // suréchantillonnage adaptatif et la boucle OpenMP, qu'on ne porte pas.
  // Comparer les ensembles ferait du bruit ; on vérifie la présence.
  problems.push(
    ...assertPresent('marche', 'scene/scene.hh', [200.0, 0.001, 256]),
    ...assertPresent('marche', 'scene/scene.cpp', [
      0.7,   // pas de sécurité de Scene::march
      24.0,  // PIECE_HEIGHT, volume de jeu
      40,    // demi-côté du volume de jeu
      0.05,  // décalage d'origine des ombres
      0.02,  // pas minimal des ombres
      0.001, // epsilon des normales
      2.2,   // gamma
    ]),
    ...assertPresent('éclairage', 'main.cpp', [50, 80, 100, 0.8])
  );
}

if (problems.length) {
  console.error(`✘ ${problems.length} point(s) à regarder :`);
  problems.forEach((problem) => console.error('  - ' + problem));
  process.exit(1);
}

console.log('Shaders : structure, identifiants, appels et constantes conformes au C++.');
