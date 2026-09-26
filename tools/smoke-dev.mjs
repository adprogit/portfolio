/**
 * Démarre le serveur de développement et vérifie qu'il sert vraiment le site.
 *
 * Pourquoi : `astro build` et `astro dev` ne suivent pas le même chemin. Le dev
 * pré-optimise les dépendances avec esbuild, et une version d'esbuild hors de
 * la plage déclarée par Vite y échoue alors que la compilation, elle, passe.
 * Un site qui compile n'est donc pas la preuve qu'il tourne en local.
 *
 * Le script suit chaque page ET les scripts et feuilles de style qu'elle
 * charge : c'est là que se voient les erreurs de dépendances.
 *
 * ── Astro 7 ──────────────────────────────────────────────────────────
 * `astro dev` ne reste plus au premier plan hors terminal interactif : il
 * démonise, écrit un verrou, et rend la main aussitôt. L'ancien script
 * attendait un « ready in » sur la sortie d'un processus qui venait de sortir,
 * et tuait un groupe de processus que le serveur avait déjà quitté.
 *
 * On suit donc l'API que le CLI expose désormais, au lieu de lire sa sortie :
 *
 *   astro dev --background   démarre et rend la main
 *   astro dev status         dit s'il tourne
 *   astro dev logs           donne sa sortie, où vivent les erreurs de Vite
 *   astro dev stop           l'arrête, en le retrouvant par son verrou
 *
 * Le verrou est ce qui permet à `stop` de retrouver le serveur : d'où l'absence
 * de `--ignore-lock`, et le `stop` préalable qui nettoie un serveur resté d'un
 * passage précédent.
 *
 * On n'attend plus une phrase sur une sortie, on interroge le port jusqu'à ce
 * qu'il réponde — c'est la seule preuve qui compte, et elle ne dépend pas du
 * format des messages.
 *
 * usage: node tools/smoke-dev.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUTES = [
  '/',
  '/fr/',
  '/de/',
  '/projects/raymarcher/',
  '/projects/cuda-motion/',
  '/projects/automata-vision/',
  '/projects/toongl/',
  '/projects/pulmonix/',
  '/projects/unet-coco/',
  '/fr/projects/toongl/',
  '/fr/projects/pulmonix/',
  '/fr/projects/cuda-motion/',
  '/de/projects/unet-coco/',
  '/de/projects/automata-vision/',
  '/projects/raiders-sudoku/',
  '/projects/42sh/',
  '/fr/projects/raiders-sudoku/',
  '/de/projects/42sh/',
  '/projects/tiger/',
  '/fr/projects/tiger/',
  '/projects/neural-texture/',
  '/fr/projects/neural-texture/',
  '/de/projects/neural-texture/',
  '/notes/optics-from-ray-to-pixel/',
  '/fr/notes/optics-from-ray-to-pixel/',
  '/de/notes/optics-from-ray-to-pixel/',
  '/notes/descent-methods-benchmark/',
  '/fr/notes/descent-methods-benchmark/',
  '/de/notes/descent-methods-benchmark/',
];

const PORT = 4331 + (process.pid % 200);
const base = `http://localhost:${PORT}`;

const binary = resolve('node_modules/.bin/astro');
if (!existsSync(binary)) {
  console.error('node_modules/.bin/astro est introuvable — lance `npm install`.');
  process.exit(1);
}

/** Lance une sous-commande du CLI. Rend sa sortie, ou `null` si elle échoue. */
function astro(args, { quiet = true } = {}) {
  try {
    return execFileSync(binary, args, {
      encoding: 'utf8',
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      timeout: 90_000,
    });
  } catch (error) {
    return quiet ? (error.stdout ?? '') + (error.stderr ?? '') : null;
  }
}

let started = false;
const stop = () => {
  if (!started) return;
  started = false;
  astro(['dev', 'stop']);
};

// Y compris si le script est interrompu : sinon le serveur squatte son port.
process.on('exit', stop);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stop();
    process.exit(1);
  });
}

/** Interroge le port jusqu'à ce qu'il réponde. La seule preuve qui compte. */
async function waitForReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base + '/', { signal: AbortSignal.timeout(4000) });
      if (response.ok) return true;
    } catch {
      /* pas encore levé */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

const problems = [];

// Un serveur laissé par un passage précédent tiendrait le verrou.
astro(['dev', 'stop']);

astro(['dev', '--background', '--port', String(PORT)]);
started = true;

if (!(await waitForReady())) {
  console.error('Le serveur de développement n’a pas démarré :\n');
  console.error((astro(['dev', 'logs']) || '(aucun journal)').split('\n').slice(-25).join('\n'));
  stop();
  process.exit(1);
}

/** Récupère une URL et signale tout ce qui n'est pas un 200 non vide. */
async function get(url, label) {
  try {
    const response = await fetch(url);
    const body = await response.text();
    if (!response.ok) problems.push(`${label} → HTTP ${response.status}`);
    else if (body.length === 0) problems.push(`${label} → réponse vide`);
    return body;
  } catch (error) {
    problems.push(`${label} → ${error.message}`);
    return '';
  }
}

for (const route of ROUTES) {
  const html = await get(base + route, route);
  if (!html) continue;

  // Les scripts et styles de la page : c'est eux qui traversent esbuild.
  const refs = [
    ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
    ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  ].map((match) => match[1]);

  for (const ref of new Set(refs)) {
    if (/^https?:/.test(ref)) {
      problems.push(`${route} charge une ressource distante : ${ref}`);
      continue;
    }
    await get(base + ref, `${route} → ${ref.split('?')[0]}`);
  }
}

/*
 * Vite et esbuild rapportent leurs erreurs sur la sortie sans changer le code
 * HTTP : une page peut répondre 200 tout en étant cassée. Le journal du serveur
 * est donc relu en entier avant de conclure.
 */
const output = astro(['dev', 'logs']) || '';

for (const line of output.split('\n')) {
  if (/✘|\[ERROR\]|Build failed|Pre-transform error|Failed to resolve/i.test(line)) {
    problems.push(`sortie du serveur : ${line.trim().slice(0, 160)}`);
  }
}

stop();

const unique = [...new Set(problems)];

if (unique.length === 0) {
  console.log(`Serveur de développement : ${ROUTES.length} routes servies, scripts et styles compris.`);
  process.exit(0);
}

console.log(`\n${unique.length} problème(s) au démarrage :`);
for (const problem of unique) console.log(`  · ${problem}`);
console.log();
process.exit(1);
