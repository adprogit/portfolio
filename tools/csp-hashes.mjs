/**
 * Remplace `'unsafe-inline'` par les empreintes des scripts inline, dans la CSP.
 *
 * ── Pourquoi ─────────────────────────────────────────────────────────
 *
 * `script-src 'self' 'unsafe-inline'` autorise l'exécution de **n'importe
 * quel** script écrit dans la page. C'est la ligne qui neutralise à peu près
 * tout l'intérêt d'une CSP contre le XSS : un attaquant qui parvient à insérer
 * une balise `<script>` dans le document n'a plus rien à contourner.
 *
 * Ce site n'a que **six scripts inline distincts**, tous écrits à la main et
 * tous stables d'un rendu à l'autre. On peut donc les nommer un par un, par
 * leur empreinte SHA-256, et retirer `'unsafe-inline'` : un script inline qui
 * ne figure pas dans cette liste ne s'exécute plus.
 *
 * Les empreintes changent à chaque modification d'un de ces scripts. Elles ne
 * peuvent donc pas être écrites à la main — d'où ce script, qui tourne après
 * `astro build` et réécrit la CSP à deux endroits :
 *
 *   1. `dist/_headers`, l'en-tête HTTP (celle qui compte vraiment) ;
 *   2. la balise `<meta>` de chaque page, pour les hôtes qui ignorent
 *      `_headers` — GitHub Pages, par exemple.
 *
 * ── Ce qui n'est pas haché, et pourquoi ──────────────────────────────
 *
 * **Les styles.** Il y a 63 blocs `<style>` inline (les styles scopés des
 * composants Astro), et ils bougent à chaque retouche de CSS. Les hacher
 * rendrait la CSP illisible pour un gain faible : un style inline ne peut pas
 * exécuter de code. `style-src 'unsafe-inline'` reste donc, et c'est un choix,
 * pas un oubli.
 *
 * **Les blocs `<script type="application/json">`** (les données du lightbox).
 * Ils ne sont jamais exécutés, donc la CSP ne les évalue pas — et comme leur
 * contenu diffère d'une page à l'autre, les hacher produirait une empreinte par
 * page.
 *
 * ── Le garde-fou ─────────────────────────────────────────────────────
 *
 * Une CSP trop stricte casse le site **en production seulement** : le serveur
 * de développement ne pose pas la balise (`import.meta.env.PROD`), donc le
 * smoke test ne verrait rien. Ce script se relit donc lui-même à la fin, et
 * échoue si une seule page contient un script inline dont l'empreinte n'est pas
 * dans la CSP qu'il vient d'écrire.
 *
 * usage: node tools/csp-hashes.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'dist';

if (!existsSync(root)) {
  console.error('dist/ est introuvable — lance `astro build` d’abord.');
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const pages = walk(root).filter((file) => file.endsWith('.html'));

/**
 * Les scripts inline d'une page, hors données.
 *
 * Le filtre sur `src` sépare les scripts inline des scripts externes, que
 * `'self'` couvre déjà. Le filtre sur `application/json` écarte les données.
 */
function inlineScripts(html) {
  const found = [];
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attributes, body] = match;
    if (/\ssrc\s*=/.test(attributes)) continue;
    if (/type\s*=\s*["']application\/(ld\+)?json["']/.test(attributes)) continue;
    found.push(body);
  }
  return found;
}

const digest = (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

/* ── 1. Relever toutes les empreintes ──────────────────────────────── */

const hashes = new Set();
for (const page of pages) {
  for (const body of inlineScripts(readFileSync(page, 'utf8'))) hashes.add(digest(body));
}

if (hashes.size === 0) {
  console.error('Aucun script inline trouvé : la CSP serait réécrite à tort.');
  process.exit(1);
}

const sorted = [...hashes].sort();

/* ── 2. Réécrire la directive ──────────────────────────────────────── */

/** Remplace `script-src …` par la même, empreintes comprises et sans joker. */
function harden(policy) {
  return policy.replace(/script-src [^;]*/, `script-src 'self' ${sorted.join(' ')}`);
}

let touched = 0;

// La balise <meta> de chaque page.
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const meta = /(<meta http-equiv="content-security-policy" content=")([^"]+)(")/i;
  if (!meta.test(html)) continue;
  writeFileSync(page, html.replace(meta, (_, open, policy, close) => open + harden(policy) + close));
  touched++;
}

// L'en-tête HTTP, la seule qui compte quand l'hôte la lit.
const headers = join(root, '_headers');
let headersDone = false;
if (existsSync(headers)) {
  const text = readFileSync(headers, 'utf8');
  const line = /^(\s*Content-Security-Policy:\s*)(.+)$/m;
  if (line.test(text)) {
    writeFileSync(headers, text.replace(line, (_, label, policy) => label + harden(policy)));
    headersDone = true;
  }
}

/* ── 3. Se relire : une CSP trop stricte ne casse qu'en production ─── */

const problems = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const policy = /<meta http-equiv="content-security-policy" content="([^"]+)"/i.exec(html)?.[1];
  if (!policy) continue;

  if (/script-src[^;]*'unsafe-inline'/.test(policy)) {
    problems.push(`${relative(root, page)} — 'unsafe-inline' toujours présent sur script-src`);
  }

  for (const body of inlineScripts(html)) {
    if (!policy.includes(digest(body).slice(1, -1))) {
      problems.push(`${relative(root, page)} — un script inline n’est pas couvert par la CSP`);
      break;
    }
  }
}

if (problems.length > 0) {
  console.log(`\n${problems.length} problème(s) de CSP :`);
  for (const problem of [...new Set(problems)]) console.log(`  · ${problem}`);
  console.log();
  process.exit(1);
}

console.log(
  `CSP durcie : ${sorted.length} empreintes de scripts inline, ` +
    `'unsafe-inline' retiré de script-src — ${touched} page(s)` +
    `${headersDone ? ' et _headers' : ' (⚠ _headers non modifié)'}.`
);
