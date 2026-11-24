/**
 * L'image de repli du hero, produite au build (voir `src/lib/splat/poster.ts`).
 *
 * Un masque : blanc partout, l'alpha porte le tramage. La page le colore avec
 * l'accent du thème courant, en CSS.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { POSTER_SIZE, renderPoster } from '../lib/splat/poster';

export const GET: APIRoute = async () => {
  const alpha = renderPoster();
  const pixels = new Uint8Array(alpha.length * 2).fill(255);
  alpha.forEach((a, i) => (pixels[i * 2 + 1] = a));

  const png = await sharp(pixels, { raw: { width: POSTER_SIZE, height: POSTER_SIZE, channels: 2 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
