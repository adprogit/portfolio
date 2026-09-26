/**
 * Réécrit un MP4 en ne gardant que sa piste vidéo.
 *
 * Pourquoi : les captures d'écran embarquent une piste audio (son du bureau ou
 * micro) et des atomes de métadonnées propres à l'enregistreur. `<video muted>`
 * ne fait que taire l'audio — les octets restent téléchargeables. Ici, la piste
 * audio et les métadonnées sont physiquement absentes du fichier produit :
 * on ne réécrit que ftyp + moov(mvhd + trak vidéo) + mdat(chunks vidéo).
 *
 * Aucune réencodage : les échantillons H.264 sont recopiés tels quels, seuls
 * les offsets de chunks (stco/co64) sont recalculés.
 *
 * usage: node tools/mp4-video-only.mjs <entrée.mp4> <sortie.mp4>
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** Découpe une plage d'octets en atomes MP4 (taille + type + contenu). */
function atoms(buf, start, end) {
  const out = [];
  let i = start;

  while (i + 8 <= end) {
    let size = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    let body = i + 8;

    if (size === 1) {
      size = Number(buf.readBigUInt64BE(i + 8));
      body = i + 16;
    } else if (size === 0) {
      size = end - i;
    }
    if (size < 8 || i + size > end) throw new Error(`atome ${type} de taille invalide`);

    out.push({ type, start: i, body, end: i + size, size });
    i += size;
  }
  return out;
}

/** Descend un chemin d'atomes, ex. find(buf, trak, ['mdia', 'minf', 'stbl']). */
function find(buf, node, path) {
  let current = node;
  for (const step of path) {
    const child = atoms(buf, current.body, current.end).find((a) => a.type === step);
    if (!child) return null;
    current = child;
  }
  return current;
}

function handlerOf(buf, trak) {
  const hdlr = find(buf, trak, ['mdia', 'hdlr']);
  return hdlr ? buf.toString('latin1', hdlr.body + 8, hdlr.body + 12) : '';
}

/** Tailles d'échantillons (stsz). */
function sampleSizes(buf, stsz) {
  const uniform = buf.readUInt32BE(stsz.body + 4);
  const count = buf.readUInt32BE(stsz.body + 8);
  if (uniform !== 0) return new Array(count).fill(uniform);

  const sizes = new Array(count);
  for (let i = 0; i < count; i++) sizes[i] = buf.readUInt32BE(stsz.body + 12 + i * 4);
  return sizes;
}

/** Nombre d'échantillons par chunk, déplié depuis stsc. */
function samplesPerChunk(buf, stsc, chunkCount) {
  const entries = buf.readUInt32BE(stsc.body + 4);
  const runs = [];
  for (let i = 0; i < entries; i++) {
    const at = stsc.body + 8 + i * 12;
    runs.push({ firstChunk: buf.readUInt32BE(at), samples: buf.readUInt32BE(at + 4) });
  }

  const perChunk = new Array(chunkCount).fill(0);
  for (let chunk = 1; chunk <= chunkCount; chunk++) {
    let run = runs[0];
    for (const candidate of runs) if (candidate.firstChunk <= chunk) run = candidate;
    perChunk[chunk - 1] = run.samples;
  }
  return perChunk;
}

function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('usage: node tools/mp4-video-only.mjs <entrée.mp4> <sortie.mp4>');
    process.exit(1);
  }

  const buf = readFileSync(input);
  const top = atoms(buf, 0, buf.length);

  const ftyp = top.find((a) => a.type === 'ftyp');
  const moov = top.find((a) => a.type === 'moov');
  if (!ftyp || !moov) throw new Error('ftyp ou moov introuvable');

  const children = atoms(buf, moov.body, moov.end);
  const mvhd = children.find((a) => a.type === 'mvhd');
  const traks = children.filter((a) => a.type === 'trak');
  const video = traks.find((t) => handlerOf(buf, t) === 'vide');
  if (!mvhd || !video) throw new Error('mvhd ou piste vidéo introuvable');

  const dropped = children
    .filter((a) => a !== mvhd && a !== video)
    .map((a) => `${a.type}(${handlerOf(buf, a) || '-'})`);

  // Copie de la piste vidéo : c'est cette copie qu'on patche.
  const trak = Buffer.from(buf.subarray(video.start, video.end));
  const trakNode = atoms(trak, 0, trak.length)[0];

  /*
   * Drapeaux de piste (tkhd). La capture d'origine écrit 0x000001 : la piste
   * est « activée », mais `track_in_movie` (0x2) est absent. ISO/IEC 14496-12
   * réserve ce bit aux pistes qui font partie de la présentation — sans lui,
   * un démuxeur qui suit la norme écarte la piste. Il ne reste alors aucune
   * vidéo dans le fichier et <video> échoue en « source non supportée », ce
   * qui, vu du navigateur, ressemble à un fichier introuvable.
   *
   * On repose la valeur qu'écrit n'importe quel muxeur : activée, dans le
   * film, dans l'aperçu.
   */
  const tkhd = find(trak, trakNode, ['tkhd']);
  if (!tkhd) throw new Error('tkhd introuvable');
  const flagsBefore = trak.readUIntBE(tkhd.body + 1, 3);
  trak.writeUIntBE(0x000007, tkhd.body + 1, 3);

  const stbl = find(trak, trakNode, ['mdia', 'minf', 'stbl']);
  if (!stbl) throw new Error('stbl introuvable');

  const tables = atoms(trak, stbl.body, stbl.end);
  const stsz = tables.find((a) => a.type === 'stsz');
  const stsc = tables.find((a) => a.type === 'stsc');
  const stco = tables.find((a) => a.type === 'stco' || a.type === 'co64');
  if (!stsz || !stsc || !stco) throw new Error('stsz, stsc ou stco/co64 introuvable');

  const wide = stco.type === 'co64';
  const chunkCount = trak.readUInt32BE(stco.body + 4);
  const sizes = sampleSizes(trak, stsz);
  const perChunk = samplesPerChunk(trak, stsc, chunkCount);

  // Où lire chaque chunk dans le fichier d'origine, et sa longueur.
  const chunks = [];
  let sample = 0;
  for (let i = 0; i < chunkCount; i++) {
    const at = stco.body + 8 + i * (wide ? 8 : 4);
    const source = wide ? Number(trak.readBigUInt64BE(at)) : trak.readUInt32BE(at);

    let length = 0;
    for (let s = 0; s < perChunk[i]; s++) length += sizes[sample++] ?? 0;
    if (source + length > buf.length) throw new Error(`chunk ${i} hors du fichier`);

    chunks.push({ source, length, patchAt: at });
  }
  if (sample !== sizes.length) {
    throw new Error(`stsc décrit ${sample} échantillons, stsz en compte ${sizes.length}`);
  }

  // moov reconstruit : en-tête + mvhd + piste vidéo, rien d'autre.
  const moovSize = 8 + mvhd.size + trak.length;
  const payload = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const mdatStart = ftyp.size + moovSize + 8;

  // Les offsets sont absolus dans le fichier : on les réécrit dans l'ordre.
  let cursor = mdatStart;
  for (const chunk of chunks) {
    if (wide) trak.writeBigUInt64BE(BigInt(cursor), chunk.patchAt);
    else trak.writeUInt32BE(cursor, chunk.patchAt);
    cursor += chunk.length;
  }

  const moovHeader = Buffer.alloc(8);
  moovHeader.writeUInt32BE(moovSize, 0);
  moovHeader.write('moov', 4, 'latin1');

  const mdatHeader = Buffer.alloc(8);
  mdatHeader.writeUInt32BE(8 + payload, 0);
  mdatHeader.write('mdat', 4, 'latin1');

  const out = Buffer.concat([
    buf.subarray(ftyp.start, ftyp.end),
    moovHeader,
    buf.subarray(mvhd.start, mvhd.end),
    trak,
    mdatHeader,
    ...chunks.map((chunk) => buf.subarray(chunk.source, chunk.source + chunk.length)),
  ]);

  writeFileSync(output, out);

  /* ── Vérification : on relit le fichier écrit ─────────────────── */

  const check = readFileSync(output);
  const checkTop = atoms(check, 0, check.length);
  const checkMoov = checkTop.find((a) => a.type === 'moov');
  const checkTraks = atoms(check, checkMoov.body, checkMoov.end).filter((a) => a.type === 'trak');

  const assert = (ok, message) => {
    if (!ok) throw new Error(`vérification échouée : ${message}`);
  };

  assert(checkTop.map((a) => a.type).join(',') === 'ftyp,moov,mdat', 'atomes de premier niveau');
  assert(checkTraks.length === 1, 'une seule piste attendue');
  assert(handlerOf(check, checkTraks[0]) === 'vide', 'la piste restante est bien vidéo');

  const checkTkhd = find(check, checkTraks[0], ['tkhd']);
  assert(checkTkhd !== null, 'tkhd présent');
  const flagsAfter = check.readUIntBE(checkTkhd.body + 1, 3);
  assert((flagsAfter & 0x1) !== 0, 'piste activée (track_enabled)');
  assert((flagsAfter & 0x2) !== 0, 'piste intégrée au film (track_in_movie)');

  const checkStbl = find(check, checkTraks[0], ['mdia', 'minf', 'stbl']);
  const checkTables = atoms(check, checkStbl.body, checkStbl.end);
  const checkSizes = sampleSizes(check, checkTables.find((a) => a.type === 'stsz'));
  assert(checkSizes.length === sizes.length, 'nombre d’échantillons conservé');
  assert(checkSizes.every((s, i) => s === sizes[i]), 'tailles d’échantillons conservées');

  const checkStco = checkTables.find((a) => a.type === 'stco' || a.type === 'co64');
  const checkMdat = checkTop.find((a) => a.type === 'mdat');
  assert(checkMdat.end === check.length, 'mdat termine le fichier');
  assert(checkMdat.size === 8 + payload, 'taille de mdat');

  for (let i = 0; i < chunkCount; i++) {
    const at = checkStco.body + 8 + i * (wide ? 8 : 4);
    const offset = wide ? Number(check.readBigUInt64BE(at)) : check.readUInt32BE(at);
    assert(offset >= checkMdat.body, `chunk ${i} pointe dans mdat`);
    assert(offset + chunks[i].length <= check.length, `chunk ${i} tient dans le fichier`);
    assert(
      check.subarray(offset, offset + chunks[i].length).equals(
        buf.subarray(chunks[i].source, chunks[i].source + chunks[i].length)
      ),
      `chunk ${i} recopié à l’identique`
    );
  }

  const saved = buf.length - check.length;
  console.log(`écrit  ${output}`);
  console.log(`  pistes retirées : ${dropped.length ? dropped.join(', ') : 'aucune'}`);
  console.log(
    `  drapeaux tkhd : 0x${flagsBefore.toString(16).padStart(6, '0')}` +
      ` → 0x${flagsAfter.toString(16).padStart(6, '0')}` +
      (flagsBefore === flagsAfter ? ' (inchangés)' : ' (track_in_movie reposé)')
  );
  console.log(`  échantillons vidéo : ${sizes.length} (identiques, octet pour octet)`);
  console.log(`  taille : ${(buf.length / 1024).toFixed(0)} Ko → ${(check.length / 1024).toFixed(0)} Ko (-${(saved / 1024).toFixed(0)} Ko)`);
  console.log('  vérifications : OK');
}

main();
