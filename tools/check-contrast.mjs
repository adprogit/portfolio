/**
 * Vérifie les contrastes de la palette.
 *
 * Les valeurs sont lues dans `src/styles/global.css` : le script reste vrai
 * quand la palette change. Aucune couleur du site n'a d'alpha — le pixel
 * affiché est exactement celui qui est écrit — donc il n'y a rien à composer
 * ici, seulement des paires à comparer. (La lueur des titres en thème sombre
 * est la seule exception du site ; elle ne porte aucune information, et rien
 * ne se lit *dedans*.)
 *
 * Dans cette palette, un accent ne remplit jamais un bloc : il colore du
 * texte. Il n'y a donc qu'une direction à vérifier — de l'accent vers la
 * surface — au lieu des deux qu'imposait une pastille pleine.
 *
 * Trois blocs de contrôle, pour chacun des deux thèmes :
 *
 * 1. les couleurs de texte sur les trois surfaces neutres ;
 * 2. les six accents, comme texte, sur ces mêmes surfaces ;
 * 3. le papier posé SUR l'accent — le seul endroit où l'accent remplit
 *    quelque chose : la langue active du sélecteur.
 *
 * Le trait qui cerne un cadre est vérifié à part, au seuil des éléments
 * d'interface. `--color-rule`, lui, n'est pas vérifié : il ne sépare que des
 * blocs de texte déjà lisibles, et n'est porteur d'aucune information (WCAG
 * 1.4.11 ne couvre pas les filets décoratifs).
 *
 * Seuils WCAG 2.1 AA : 4,5:1 pour du texte normal, 3:1 pour du gros texte et
 * les bordures d'éléments d'interface.
 *
 * usage: node tools/check-contrast.mjs
 */

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

/**
 * Relève les `--variable: valeur` d'un bloc CSS, par son sélecteur.
 * Le sélecteur doit ouvrir une ligne : sinon `.dark` tomberait sur le
 * `@custom-variant dark (&:where(.dark, .dark *))` qui le précède.
 */
function block(selector, { optional = false } = {}) {
  const anchor = new RegExp(`^${selector.replace(/[.@]/g, '\\$&')}\\s*\\{`, 'm');
  const found = anchor.exec(css);
  if (!found) {
    if (optional) return {};
    throw new Error(`bloc ${selector} introuvable`);
  }
  const start = found.index;
  const open = css.indexOf('{', start);
  let depth = 0;
  let i = open;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) break;
  }

  const body = css.slice(open + 1, i);
  const vars = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

/* ── Couleurs ──────────────────────────────────────────────────────── */

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function parseHex(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ── Vérification ──────────────────────────────────────────────────── */

// Le thème clair vit dans `@theme` ; `:root` ne sert qu'aux jetons ajoutés
// hors palette, et peut très bien être absent.
const light = { ...block('@theme'), ...block(':root', { optional: true }) };
const dark = { ...light, ...block('.dark') };

const themes = [
  { name: 'clair', vars: light },
  { name: 'sombre', vars: dark },
];

const targets = [
  { token: '--color-ink', label: 'texte courant' },
  { token: '--color-ink-strong', label: 'titres' },
  { token: '--color-ink-soft', label: 'texte secondaire' },
  { token: '--color-brand', label: 'accent sur texte' },
  { token: '--color-brand-strong', label: 'accent survolé' },
];

const ACCENTS = ['cyan', 'green', 'orange', 'pink', 'purple', 'yellow'];

let failures = 0;

/** Compare, affiche, et compte les échecs. */
function assess(label, token, pairs, min) {
  const results = pairs.map(([name, bg, fg]) => {
    const ratio = contrast(fg, bg);
    const ok = ratio >= min;
    if (!ok) failures++;
    return `${name} ${ratio.toFixed(2)}:1 ${ok ? 'ok' : 'ÉCHEC'}`;
  });
  console.log(`  ${label.padEnd(18)} ${token.padEnd(20)} ${results.join(' · ')}`);
}

/* 1, 2 & 3. Thème par thème. */

for (const theme of themes) {
  console.log(`\n── thème ${theme.name} ${'─'.repeat(46 - theme.name.length)}`);

  const paper = parseHex(theme.vars['--color-paper']);

  const surfaces = [
    ['paper', paper],
    ['paper-raised', parseHex(theme.vars['--color-paper-raised'])],
    ['paper-sunken', parseHex(theme.vars['--color-paper-sunken'])],
  ];

  for (const { token, label } of targets) {
    const fg = parseHex(theme.vars[token]);
    assess(label, token, surfaces.map(([name, bg]) => [name, bg, fg]), 4.5);
  }

  // Les six accents, en texte, sur les trois surfaces.
  for (const name of ACCENTS) {
    const token = `--color-accent-${name}`;
    const fg = parseHex(theme.vars[token]);
    assess(`accent ${name}`, token, surfaces.map(([surface, bg]) => [surface, bg, fg]), 4.5);
  }

  // Le seul endroit où l'accent remplit : la langue active du sélecteur.
  assess('paper sur accent', '--color-brand', [['plein', parseHex(theme.vars['--color-brand']), paper]], 4.5);

  // Le trait des cadres doit se voir sur le papier : seuil « interface ».
  assess('trait des cadres', '--color-line', [['paper', paper, parseHex(theme.vars['--color-line'])]], 3);
}

console.log(
  failures === 0
    ? '\nTous les contrastes atteignent le minimum WCAG AA.\n'
    : `\n${failures} contraste(s) sous le seuil.\n`
);
process.exit(failures === 0 ? 0 : 1);
