/**
 * Retire de `dist/` les médias que rien ne référence.
 *
 * Pourquoi : les images sont importées depuis un module `.ts`, et Vite émet
 * alors le fichier d'origine en plus des variantes webp générées par
 * `astro:assets`. Personne ne les télécharge — aucun HTML n'y renvoie — mais
 * elles sont publiées quand même (~1,9 Mo ici).
 *
 * Le script ne touche qu'aux médias, et seulement à ceux dont le nom
 * n'apparaît dans aucun HTML, CSS ou JS produit.
 *
 * usage: node tools/prune-dist.mjs [dossier]
 */

import { readFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
if (!existsSync(root)) {
  console.error(`${root} est introuvable — lance d'abord \`npm run build\`.`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const MEDIA = /\.(png|jpe?g|gif|webp|avif|mp4|webm|woff2?)$/i;

const files = walk(root);

// Tout ce qui peut citer un média : pages, styles, scripts.
const haystack = files
  .filter((file) => /\.(html|css|js|mjs|json|txt|xml)$/i.test(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

let removed = 0;
let bytes = 0;

for (const file of files.filter((file) => MEDIA.test(file))) {
  const name = basename(file);
  if (haystack.includes(name)) continue;

  bytes += statSync(file).size;
  removed++;
  unlinkSync(file);
  console.log(`  retiré  ${relative(root, file)}`);
}

console.log(
  removed === 0
    ? 'Aucun média orphelin.'
    : `${removed} média(s) orphelin(s) retiré(s), ${(bytes / 1024 / 1024).toFixed(2)} Mo libérés.`
);
