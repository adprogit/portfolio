/**
 * Contrôle le site compilé avant publication.
 *
 * Ce que le script refuse de laisser passer :
 * - une référence réseau sortante (script, style, police, image, lien, fetch) ;
 * - un nom de domaine, une adresse e-mail, un `mailto:` ;
 * - un document mal formé (pas de <html lang>, pas de <body>, zéro ou
 *   plusieurs <h1>) ;
 * - une image sans attribut `alt`, ou qui embarque encore ses métadonnées
 *   (EXIF, IPTC, XMP — appareil, logiciel, parfois un nom ou un lieu) ;
 * - un lien interne qui ne mène nulle part ;
 * - une valeur non résolue (`undefined`, `NaN`, `[object Object]`) laissée
 *   dans le HTML.
 *
 * usage: node tools/audit-dist.mjs [dossier]
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(process.argv[2] ?? 'dist');
// Le préfixe de compilation, comme dans `astro.config.mjs`.
const base = `${(process.env.BASE_PATH ?? '').replace(/\/+$/, '')}/`;
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

const files = walk(root);
const pages = files.filter((file) => file.endsWith('.html'));
const assets = new Set(files.map((file) => '/' + relative(root, file).replaceAll('\\', '/')));

const problems = [];
const report = (file, message) => problems.push(`${relative(root, file) || '.'} — ${message}`);

/**
 * Ce qui a le droit de sortir.
 *
 * `tailwindcss.com` et `w3.org` sont du texte inerte dans un commentaire, pas
 * une requête. Les liens de dépôt et le profil professionnel, eux, sont voulus :
 * chaque page projet porte son dépôt ou dit qu'il est privé, et l'accueil porte
 * le profil. La règle reste stricte — seuls `github.com/<compte>/<dépôt>` et
 * `www.linkedin.com/in/<profil>` passent, rien d'autre, et surtout aucune
 * ressource *chargée* depuis l'extérieur (voir le contrôle 2, qui interdit
 * toujours `src` et `srcset` distants).
 */
const ALLOWED_TEXT = [/tailwindcss\.com/, /w3\.org/, /^github\.com$/i, /^linkedin\.com$/i];

/*
 * Deux formes, et rien d'autre : un dépôt, et un profil. Pas de page d'accueil
 * de service, pas de paramètre de suivi — un lien qui n'a pas exactement cette
 * forme est refusé, même vers le bon domaine.
 */
const ALLOWED_LINKS = [
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
  /^https:\/\/www\.linkedin\.com\/in\/[\w-]+\/?$/,
];

const isAllowed = (value) =>
  ALLOWED_TEXT.some((pattern) => pattern.test(value)) ||
  ALLOWED_LINKS.some((pattern) => pattern.test(value));

/* ── 1. Aucune sortie réseau, aucun identifiant ────────────────────── */

for (const file of files) {
  if (/\.(mp4|woff2?|png|jpe?g|webp|avif|gif|ico)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');

  for (const match of text.matchAll(/(?:href|action)\s*=\s*"((?:https?:)?\/\/[^"]*)"/g)) {
    if (!isAllowed(match[1])) report(file, `lien sortant : ${match[1]}`);
  }

  // Une ressource chargée depuis l'extérieur n'a, elle, aucune exception.
  for (const match of text.matchAll(/(?:src|srcset)\s*=\s*"((?:https?:)?\/\/[^"]*)"/g)) {
    report(file, `ressource distante : ${match[1]}`);
  }

  for (const match of text.matchAll(/\b(?:mailto|tel):[^\s"'<>)]+/g)) {
    report(file, `lien de contact : ${match[0]}`);
  }

  for (const match of text.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) {
    report(file, `adresse e-mail : ${match[0]}`);
  }

  // Un domaine en clair, même sans protocole (hors noms de fichiers connus).
  for (const match of text.matchAll(/\b[a-z0-9-]+\.(?:com|net|org|io|dev|fr|co|me)\b/gi)) {
    if (!isAllowed(match[0]) && !/\.(webp|png|css|js|mjs|json|svg)$/.test(match[0])) {
      report(file, `domaine en clair : ${match[0]}`);
    }
  }

  if (/\b(?:google|gtag|analytics|facebook|hotjar|sentry|cdn)\b/i.test(text)) {
    report(file, 'mention d’un service tiers');
  }
}

/* ── 2. Documents bien formés et accessibles ───────────────────────── */

for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  const lang = html.match(/<html[^>]*\slang="([a-z-]+)"/);
  if (!lang) report(page, 'pas de <html lang="…">');
  if (!/<body[\s>]/.test(html)) report(page, 'pas de <body>');
  if (!/<title>[^<]+<\/title>/.test(html)) report(page, 'pas de <title>');
  if (!/<meta name="description" content="[^"]+"/.test(html)) report(page, 'pas de description');
  if (!/<link rel="canonical"/.test(html)) report(page, 'pas de canonical');

  const h1 = html.match(/<h1[\s>]/g) ?? [];
  if (h1.length !== 1) report(page, `${h1.length} <h1> (il en faut exactement un)`);

  // La langue de la page doit correspondre à son chemin.
  const path = '/' + relative(root, page).replaceAll('\\', '/');
  const expected = path.startsWith('/fr/') ? 'fr' : path.startsWith('/de/') ? 'de' : 'en';
  if (lang && lang[1] !== expected) {
    report(page, `lang="${lang[1]}" alors que l'URL annonce « ${expected} »`);
  }

  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    // `alt` seul (sans valeur) équivaut à alt="" : c'est une image décorative.
    if (!/\salt(?:=|[\s>])/.test(img[0])) {
      report(page, `<img> sans alt : ${img[0].slice(0, 70)}…`);
    }
  }

  for (const video of html.matchAll(/<video\b[^>]*>/g)) {
    if (!/aria-label=/.test(video[0])) report(page, '<video> sans aria-label');
    if (!/\smuted\b/.test(video[0])) report(page, '<video> non muet');
  }

  for (const leak of html.matchAll(/(?:>|")(?:undefined|NaN|\[object Object\])(?:<|")/g)) {
    report(page, `valeur non résolue dans le HTML : ${leak[0]}`);
  }

  /* ── 3. Les liens internes mènent quelque part ─────────────────── */

  for (const link of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    // Sous un préfixe (GitHub Pages), un lien qui ne le porte pas est mort,
    // même si `dist/` contient le fichier.
    if (!link[1].startsWith(base)) {
      report(page, `lien hors du préfixe ${base} : ${link[1]}`);
      continue;
    }
    const target = link[1].slice(base.length - 1);
    const candidates = [target, target.replace(/\/$/, '/index.html'), target + '/index.html'];
    if (!candidates.some((candidate) => assets.has(candidate))) {
      report(page, `lien mort : ${target}`);
    }
  }

  for (const ref of html.matchAll(/(?:src|content)="(\/[^"]*_astro\/[^"]+)"/g)) {
    const target = ref[1].startsWith(base) ? ref[1].slice(base.length - 1) : ref[1];
    if (!ref[1].startsWith(base) || !assets.has(target)) report(page, `ressource absente : ${ref[1]}`);
  }
}

/* ── 4. Politique de sécurité présente ─────────────────────────────── */

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  if (!/http-equiv="content-security-policy"/i.test(html)) {
    report(page, 'pas de Content-Security-Policy');
  }
  if (!/name="referrer" content="no-referrer"/.test(html)) {
    report(page, 'pas de politique de référent');
  }
  if (!/name="robots" content="noindex/.test(html)) {
    report(page, 'pas de refus d’indexation');
  }
}

/* ── 4 bis. En-têtes d'hébergement présents ────────────────────────── */

for (const file of ['_headers', 'robots.txt']) {
  if (!assets.has(`/${file}`)) report(root, `${file} manquant dans dist/`);
}

const headers = assets.has('/_headers') ? readFileSync(join(root, '_headers'), 'utf8') : '';
for (const directive of ['X-Robots-Tag: noindex', "frame-ancestors 'none'", 'Referrer-Policy: no-referrer']) {
  if (!headers.includes(directive)) report(root, `_headers : ${directive} absent`);
}

/* ── 5. Aucune métadonnée dans les images ──────────────────────────── */

/*
 * Une capture d'écran ou une photo transporte volontiers un bloc EXIF, IPTC ou
 * XMP : appareil, logiciel, parfois un nom ou des coordonnées. Les dérivées
 * produites par Astro sont propres, mais l'original est copié tel quel dans
 * `_astro/` — c'est lui qu'on vérifie ici, avant qu'il ne parte en ligne.
 */
const images = files.filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file));

for (const file of images) {
  const meta = await sharp(file).metadata();
  const carried = [
    meta.exif && 'EXIF',
    meta.iptc && 'IPTC',
    meta.xmp && 'XMP',
  ].filter(Boolean);

  if (carried.length > 0) {
    report(file, `métadonnées embarquées : ${carried.join(', ')}`);
  }
}

/* ── Budget JavaScript ─────────────────────────────────────────────── */

/*
 * Un plafond sur le JavaScript livré, vérifié mécaniquement.
 *
 * Il ne mesure pas la performance : il mesure la **dérive de dépendances**. Le
 * site n'a aucune dépendance JavaScript à l'exécution — les apparitions sont en
 * IntersectionObserver et Web Animations, la poussière en Canvas, le filtre en
 * Vanilla. Tout ce qui est livré est écrit ici, plus le routeur d'Astro.
 *
 * Le jour où quelqu'un ajoute une bibliothèque d'animation « juste pour
 * essayer », ce contrôle le dit avant la publication, sans qu'on ait à y
 * penser. C'est la raison d'être du plafond : le poids n'est qu'un indicateur
 * de ce qu'on a laissé entrer.
 *
 * Il y avait 52,3 Ko quand `motion` était encore là (10,1 Ko pour lui et ses
 * trois paquets transitifs). La marge est volontairement étroite.
 */
const JS_BUDGET = 48 * 1024;

const scripts = files.filter((file) => file.endsWith('.js'));
const jsBytes = scripts.reduce((total, file) => total + statSync(file).size, 0);

if (jsBytes > JS_BUDGET) {
  problems.push(
    `budget JS dépassé : ${(jsBytes / 1024).toFixed(1)} Ko livrés pour ` +
      `${(JS_BUDGET / 1024).toFixed(0)} Ko autorisés — une dépendance est-elle entrée ?`
  );
}

/* ── Sinks HTML et évaluation de code ─────────────────────────────── */

/*
 * Le JavaScript du site n'écrit jamais de HTML et n'évalue jamais de texte :
 * tout ce qui vient d'ailleurs (un PGN déposé, un fragment d'URL) passe par
 * `textContent`. Ce contrôle le garantit pour la suite. Seul le routeur
 * d'Astro est exempté : il remplace la page par du HTML qu'il vient de
 * charger depuis le site lui-même, sous la même CSP.
 */
const SINKS = /\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function\b|srcdoc|parseFromString/;

for (const file of scripts) {
  if (/ClientRouter\.astro_astro_type_script/.test(file)) continue;
  const found = readFileSync(file, 'utf8').match(SINKS);
  if (found) problems.push(`${relative(root, file)} : « ${found[0]} » — le site n'écrit pas de HTML depuis JS`);
}

/* ── Verdict ───────────────────────────────────────────────────────── */

const unique = [...new Set(problems)];

console.log(
  `${pages.length} pages, ${files.length} fichiers examinés dans ${relative(process.cwd(), root)}/ · ` +
    `JS livré ${(jsBytes / 1024).toFixed(1)} Ko / ${(JS_BUDGET / 1024).toFixed(0)} Ko`
);

if (unique.length === 0) {
  console.log('Aucun problème : rien ne sort du site, tout est bien formé.\n');
  process.exit(0);
}

console.log(`\n${unique.length} problème(s) :`);
for (const problem of unique) console.log(`  · ${problem}`);
console.log();
process.exit(1);
