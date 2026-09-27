/**
 * Minifie le WGSL de l'échiquier à la compilation.
 *
 * Le shader est écrit pour être lu : chaque fonction dit de quel fichier C++
 * elle vient, chaque écart est expliqué. Ces commentaires n'ont rien à faire
 * dans le JavaScript livré — c'est plus de la moitié du module, et le budget
 * JS du site est serré. Le plugin Vite ne touche qu'aux gabarits
 * `export const NOM = `…`` de `src/lib/chess/shader-wgsl.ts`, et seulement
 * pour `astro build` : en développement, le shader reste tel quel.
 *
 * Les commentaires se retirent **comme WGSL les lit** : les commentaires de
 * bloc s'imbriquent (voir `shader-parity.mjs`). Les sauts de ligne restent, pour
 * qu'une erreur de compilation dans le navigateur garde un numéro de ligne
 * utilisable.
 */

/** Le WGSL sans commentaires ni blancs superflus. */
export function minifyWgsl(code) {
  let out = '';
  let depth = 0;
  for (let i = 0; i < code.length; i++) {
    const pair = code.slice(i, i + 2);
    if (pair === '/*') {
      depth++;
      i++;
    } else if (depth && pair === '*/') {
      depth--;
      i++;
    } else if (!depth && pair === '//') {
      while (i < code.length && code[i] !== '\n') i++;
      out += '\n';
    } else if (!depth) {
      out += code[i];
    }
  }
  if (depth) throw new Error('WGSL : commentaire jamais refermé');

  return out
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');
}

const TARGET = /\/src\/lib\/chess\/shader-wgsl\.ts$/;

/** Plugin Vite : minifie les gabarits WGSL du module de l'échiquier. */
export function wgslMinify() {
  return {
    name: 'wgsl-minify',
    apply: 'build',
    transform(code, id) {
      if (!TARGET.test(id.split('?')[0])) return null;
      return {
        code: code.replace(
          /(export const \w+ = `)([\s\S]*?)(`;)/g,
          (_, open, body, close) => open + minifyWgsl(body) + close
        ),
        map: null,
      };
    },
  };
}
