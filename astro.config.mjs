// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { wgslMinify } from './tools/wgsl-minify.mjs';

/*
 * Pas de `site` : `canonical`, `hreflang` et `og:image` sont écrits en chemins
 * absolus depuis la racine (`/fr/`, `/_astro/…`), jamais en URL complètes. Le
 * site ne contient donc aucun nom de domaine et se sert depuis n'importe quel
 * hôte.
 *
 * Pour le publier dans un sous-dossier — GitHub Pages sert un dépôt de projet
 * sous `utilisateur.github.io/<dépôt>/` —, `BASE_PATH` le dit à la
 * compilation (`BASE_PATH=/<dépôt> npm run build`). Le workflow de
 * `.github/workflows/pages.yml` le renseigne tout seul. Astro préfixe alors
 * les actifs, et `src/i18n/config.ts` les liens entre pages.
 */
// `globalThis` : le projet n'embarque pas les types de Node (`@types/node`),
// que `astro check` réclamerait pour un `process` nu.
const env = /** @type {any} */ (globalThis).process?.env ?? {};
const base = `${(env.BASE_PATH ?? '').replace(/\/+$/, '')}/`;

export default defineConfig({
  base,
  // Les URL se terminent par `/` : cohérent avec les liens générés.
  trailingSlash: 'always',
  build: {
    // Le HTML est écrit en `page/index.html`, servable par n'importe quel hôte
    // statique sans réécriture d'URL.
    format: 'directory',
  },
  vite: {
    // Le WGSL de l'échiquier perd ses commentaires dans le JS livré.
    plugins: [tailwindcss(), wgslMinify()],
  },
});
