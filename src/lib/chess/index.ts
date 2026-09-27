/**
 * L'échiquier du projet ray marcher, calculé en direct par le GPU.
 *
 * Le C++ met des minutes à sortir une image 800×600 en 16 échantillons par
 * pixel ; ici la même scène, le même champ de distance et le même éclairage
 * tiennent dans une image par rafraîchissement. Avancer d'un coup ne
 * reconstruit rien : deux tampons sont réécrits — les 32 pièces et les 64
 * cases de la grille — et l'image est redemandée.
 *
 * Le rendu est **à la demande** et **progressif** : la scène ne bouge
 * qu'entre deux interactions, alors chaque image ajoute un échantillon à une
 * texture d'accumulation, à la résolution native de l'écran, jusqu'aux 16
 * échantillons par pixel du C++. Pendant un mouvement du curseur, un seul
 * échantillon à une résolution calibrée sur le temps GPU mesuré ; à l'arrêt,
 * la qualité remonte d'elle-même. Un échiquier immobile et affiné ne coûte
 * plus rien.
 */

import { compileModule, requestSharedGpu, type SharedGpu } from '../gpu/device';
import {
  CELL_BYTES,
  MAX_PIECES,
  PIECE_BYTES,
  PRESENT,
  SHADER,
  UNIFORM_BYTES,
} from './shader-wgsl';
import { GAME, KNIGHT, placements, replay, type HalfMove } from './game';

/* ── Cadrage, repris tel quel de src/main.cpp ───────────────────── */

/** `Point3 eye(0, 100 * 0.8, -80 * 0.8)`. */
const EYE_HEIGHT = 80;
const EYE_RADIUS = 64;
const TARGET: readonly [number, number, number] = [0, 0, -5];
const LIGHT: readonly [number, number, number] = [-50, 50, -50];
/** `hfov` en degrés. */
const HFOV = 50;

/** Côté du plateau, en unités monde (`chess_board::CELL_SIZE`). */
const CELL_SIZE = 8;
/** Hauteur à laquelle les pièces sont posées (`square_to_world`). */
const PIECE_Y = 4;
/** `BBOX_R` de `main.cpp` : rayon utilisé pour remplir la grille. */
const BBOX_R = 8;

/* ── Qualité ─────────────────────────────────────────────────────── */

/** Au-delà de deux pixels physiques par pixel CSS, l'œil ne gagne plus rien. */
const MAX_DPR = 2;
/** Plafond absolu : un canvas très large sur un écran 5K. */
const MAX_PIXELS = 4_000_000;
/** `SAMPLES_PER_PIXEL` de main.cpp : l'image au repos est finie à 16. */
const SAMPLES = 16;
/** Budget d'une image pendant un mouvement du curseur. */
const INTERACTIVE_MS = 20;
/**
 * Un échantillon pleine résolution plus long que ça fait saccader la page (et
 * un pilote peut couper un shader trop long) : la résolution de repos baisse.
 */
const MAX_SAMPLE_MS = 90;
/** Plancher de la résolution de repos, en part de la résolution native. */
const MIN_QUALITY = 0.35;
/** Somme de 16 couleurs linéaires : un demi-flottant suffit, et se mélange partout. */
const ACCUM_FORMAT: GPUTextureFormat = 'rgba16float';

/** Suite de Halton : des décalages sous-pixel bien répartis, sans hasard. */
function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  for (let i = index; i > 0; i = Math.floor(i / base)) {
    f /= base;
    r += f * (i % base);
  }
  return r;
}

export interface ChessHandle {
  /** Nombre de demi-coups jouables, position initiale comprise. */
  readonly plyCount: number;
  /** Demi-coup affiché, de 0 (position initiale) à `plyCount - 1`. */
  readonly ply: number;
  setPly(ply: number): void;
  /** Remplace la partie (un PGN déposé, par exemple) et revient à son début. */
  load(moves: HalfMove[], start?: Uint8Array): void;
  destroy(): void;
}

/**
 * Pourquoi l'échiquier n'a pas démarré. Les deux cas ne se disent pas pareil :
 * sans WebGPU, c'est le navigateur ; avec, c'est le rendu qui a échoué — un
 * shader refusé ne doit pas se faire passer pour un navigateur trop vieux.
 */
export type ChessFailure = 'unsupported' | 'failed';

interface Pipelines {
  /** La marche : un échantillon, **ajouté** à la texture d'accumulation. */
  march: GPURenderPipeline;
  /** La moyenne et le gamma, vers le canvas. */
  present: GPURenderPipeline;
  sampler: GPUSampler;
}

/** Pipelines de l'échiquier, construits une fois pour le périphérique partagé. */
let pipelines: Promise<Pipelines | null> | null = null;

async function buildPipelines(shared: SharedGpu): Promise<Pipelines | null> {
  try {
    const { device } = shared;
    const [marchModule, presentModule] = await Promise.all([
      compileModule(device, SHADER, 'chess-board'),
      compileModule(device, PRESENT, 'chess-present'),
    ]);
    if (!marchModule || !presentModule) return null;

    const add: GPUBlendComponent = { srcFactor: 'one', dstFactor: 'one', operation: 'add' };
    const [march, present] = await Promise.all([
      device.createRenderPipelineAsync({
        label: 'chess-board',
        layout: 'auto',
        vertex: { module: marchModule, entryPoint: 'vs_main' },
        fragment: {
          module: marchModule,
          entryPoint: 'fs_main',
          targets: [{ format: ACCUM_FORMAT, blend: { color: add, alpha: add } }],
        },
        primitive: { topology: 'triangle-list' },
      }),
      device.createRenderPipelineAsync({
        label: 'chess-present',
        layout: 'auto',
        vertex: { module: presentModule, entryPoint: 'vs_present' },
        fragment: { module: presentModule, entryPoint: 'fs_present', targets: [{ format: shared.format }] },
        primitive: { topology: 'triangle-list' },
      }),
    ]);
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    return { march, present, sampler };
  } catch {
    return null;
  }
}

/**
 * Monte l'échiquier sur un canvas. Résout sur la raison de l'échec si le
 * rendu ne peut pas démarrer — l'appelant affiche alors son repli.
 */
export async function mountChessBoard(
  canvas: HTMLCanvasElement
): Promise<ChessHandle | ChessFailure> {
  const shared = await requestSharedGpu();
  if (!shared) return 'unsupported';
  if (shared.lost) return 'failed';

  pipelines ??= buildPipelines(shared);
  const built = await pipelines;
  if (!built) return 'failed';

  const context = canvas.getContext('webgpu');
  if (!context) return 'unsupported';

  const { device, format } = shared;

  try {
    context.configure({ device, format, alphaMode: 'opaque' });
  } catch {
    return 'failed';
  }

  /* ── Tampons ──────────────────────────────────────────────────── */

  const uniformBuffer = device.createBuffer({
    label: 'chess uniforms',
    size: UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pieceBuffer = device.createBuffer({
    label: 'chess pieces',
    size: PIECE_BYTES,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const cellBuffer = device.createBuffer({
    label: 'chess grid',
    size: CELL_BYTES,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    label: 'chess',
    layout: built.march.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: pieceBuffer } },
      { binding: 2, resource: { buffer: cellBuffer } },
    ],
  });

  // Un seul bloc d'octets, deux lectures : les positions sont des flottants,
  // le type et la couleur des entiers.
  const uniformData = new ArrayBuffer(UNIFORM_BYTES);
  const uniformF32 = new Float32Array(uniformData);
  const uniformU32 = new Uint32Array(uniformData);

  const pieceData = new ArrayBuffer(PIECE_BYTES);
  const pieceF32 = new Float32Array(pieceData);
  const pieceU32 = new Uint32Array(pieceData);

  const cellData = new Uint32Array(CELL_BYTES / 4);

  /* ── Position ─────────────────────────────────────────────────── */

  let positions = replay(GAME);
  let ply = 0;
  let pieceCount = 0;

  /**
   * Remplit les deux tampons de scène à partir d'un échiquier.
   *
   * La grille reprend `Scene::add_piece` : une pièce est inscrite dans toutes
   * les cases que sa boîte englobante touche. Ici « inscrite » veut dire un
   * bit posé dans le masque de la case — 32 pièces tiennent dans un `u32`.
   */
  const uploadPosition = (index: number) => {
    const pieces = placements(positions[index]!).slice(0, MAX_PIECES);
    pieceCount = pieces.length;

    pieceF32.fill(0);
    cellData.fill(0);

    pieces.forEach((piece, i) => {
      const x = (piece.file - 3.5) * CELL_SIZE;
      const z = (piece.rank - 3.5) * CELL_SIZE;
      const at = i * 8;

      pieceF32[at] = x;
      pieceF32[at + 1] = PIECE_Y;
      pieceF32[at + 2] = z;
      pieceU32[at + 3] = piece.kind;
      pieceU32[at + 4] = piece.white ? 1 : 0;
      // `KnightSDF(pos, mat, !is_white)` : le cavalier noir fait face.
      pieceU32[at + 5] = piece.kind === KNIGHT && !piece.white ? 1 : 0;

      const minFile = Math.max(0, Math.floor((x - BBOX_R) / CELL_SIZE + 4));
      const maxFile = Math.min(7, Math.floor((x + BBOX_R) / CELL_SIZE + 4));
      const minRank = Math.max(0, Math.floor((z - BBOX_R) / CELL_SIZE + 4));
      const maxRank = Math.min(7, Math.floor((z + BBOX_R) / CELL_SIZE + 4));

      for (let rank = minRank; rank <= maxRank; rank++) {
        for (let file = minFile; file <= maxFile; file++) {
          cellData[rank * 8 + file]! |= 1 << i;
        }
      }
    });

    device.queue.writeBuffer(pieceBuffer, 0, pieceData);
    device.queue.writeBuffer(cellBuffer, 0, cellData);
  };

  /* ── Cibles d'accumulation ────────────────────────────────────── */

  interface Target {
    texture: GPUTexture;
    view: GPUTextureView;
    /** Lue par la présentation. */
    bind: GPUBindGroup;
    width: number;
    height: number;
  }

  /** Une texture flottante où les échantillons s'additionnent. */
  const makeTarget = (width: number, height: number): Target => {
    const texture = device.createTexture({
      label: 'chess accumulation',
      size: { width, height },
      format: ACCUM_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const view = texture.createView();
    const bind = device.createBindGroup({
      layout: built.present.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: view },
        { binding: 1, resource: built.sampler },
      ],
    });
    return { texture, view, bind, width, height };
  };

  /** Renvoie `current` s'il a déjà la bonne taille, sinon une cible neuve. */
  const sized = (current: Target | null, width: number, height: number): Target => {
    if (current && current.width === width && current.height === height) return current;
    current?.texture.destroy();
    return makeTarget(width, height);
  };

  /** Au repos : résolution native, affinée jusqu'à 16 échantillons. */
  let still: Target | null = null;
  /** En mouvement : un échantillon, plus petit, agrandi par la présentation. */
  let moving: Target | null = null;

  /* ── Boucle ───────────────────────────────────────────────────── */

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  let frame = 0;
  let alive = true;
  let visible = true;
  let running = false;
  let painted = false;

  /** Échantillons déjà accumulés dans `still` pour la vue courante. */
  let samples = 0;
  /** Un échantillon est en vol : on n'en empile pas un second derrière. */
  let busy = false;
  /** Part de la résolution native gardée au repos ; fixée par la mesure. */
  let quality = 1;
  /**
   * La première image se fait petite, et sert de mesure : on ne lance pas un
   * échantillon pleine résolution sans savoir ce qu'il coûtera. Sur un GPU
   * intégré, il pourrait figer la page.
   */
  let calibrated = false;
  /** Part de la résolution du canvas pendant un mouvement ; calibrée à la mesure. */
  let motionScale = 0.35;

  const pointer = { x: 0, y: 0 };
  const aim = { x: 0, y: 0 };

  /** Le canvas prend la résolution native de l'écran, dans la limite du plafond. */
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const cap = Math.sqrt(MAX_PIXELS / (rect.width * rect.height));
    const ratio = Math.min(dpr, cap);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      samples = 0;
    }
  };

  /** Ajoute un échantillon à `target`, puis présente sa moyenne. */
  const render = (target: Target, sample: number, onDone: (ms: number) => void) => {
    // La caméra du C++ est fixe ; le curseur ne fait que la décaler autour du
    // plateau, ce qui laisse voir le relief des pièces.
    const angle = pointer.x * 0.6;
    const halfWidth = Math.tan(((HFOV * 0.5) * Math.PI) / 180);
    const halfHeight = (halfWidth * target.height) / target.width;

    uniformF32[0] = target.width;
    uniformF32[1] = target.height;
    // Premier échantillon au centre du pixel, comme la première passe du C++.
    uniformF32[2] = sample ? halton(sample, 2) - 0.5 : 0;
    uniformF32[3] = sample ? halton(sample, 3) - 0.5 : 0;
    uniformF32[4] = Math.sin(angle) * EYE_RADIUS;
    uniformF32[5] = EYE_HEIGHT + pointer.y * 22;
    uniformF32[6] = -Math.cos(angle) * EYE_RADIUS;
    uniformU32[7] = pieceCount;
    uniformF32[8] = TARGET[0];
    uniformF32[9] = TARGET[1];
    uniformF32[10] = TARGET[2];
    uniformF32[11] = halfWidth;
    uniformF32[12] = LIGHT[0];
    uniformF32[13] = LIGHT[1];
    uniformF32[14] = LIGHT[2];
    uniformF32[15] = halfHeight;
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = device.createCommandEncoder();

    const march = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.view,
          // Le premier échantillon remplace, les suivants s'ajoutent.
          loadOp: sample ? 'load' : 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });
    march.setPipeline(built.march);
    march.setBindGroup(0, bindGroup);
    march.draw(3);
    march.end();

    const present = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    present.setPipeline(built.present);
    present.setBindGroup(0, target.bind);
    present.draw(3);
    present.end();

    device.queue.submit([encoder.finish()]);

    if (!painted) {
      painted = true;
      canvas.dataset.ready = 'true';
    }

    // Le coût d'un dessin ne se lit pas côté processeur : il faut attendre que
    // le GPU ait fini. C'est aussi ce qui empêche d'empiler du travail.
    busy = true;
    const started = performance.now();
    void device.queue.onSubmittedWorkDone().then(() => {
      busy = false;
      if (alive) onDone(performance.now() - started);
    });
  };

  const loop = () => {
    if (!alive || !visible || shared.lost) {
      running = false;
      return;
    }

    const dx = aim.x - pointer.x;
    const dy = aim.y - pointer.y;
    const inMotion = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;

    if (!busy) {
      resize();
      if (inMotion) {
        pointer.x += dx * 0.09;
        pointer.y += dy * 0.09;
        samples = 0;

        const scale = Math.min(motionScale, quality);
        moving = sized(
          moving,
          Math.max(1, Math.round(canvas.width * scale)),
          Math.max(1, Math.round(canvas.height * scale))
        );
        const pixels = moving.width * moving.height;
        render(moving, 0, (ms) => calibrate(ms, pixels));
      } else if (!calibrated) {
        moving = sized(
          moving,
          Math.max(1, Math.round(canvas.width * motionScale)),
          Math.max(1, Math.round(canvas.height * motionScale))
        );
        const pixels = moving.width * moving.height;
        render(moving, 0, (ms) => {
          calibrate(ms, pixels);
          calibrated = true;
          request();
        });
      } else if (samples < SAMPLES) {
        still = sized(
          still,
          Math.max(1, Math.round(canvas.width * quality)),
          Math.max(1, Math.round(canvas.height * quality))
        );
        const pixels = still.width * still.height;
        render(still, samples++, (ms) => {
          calibrate(ms, pixels);
          // Nettement trop lent pour la page (la mesure a de la marge) : on
          // baisse la résolution de repos et on reprend l'affinage.
          if (ms > MAX_SAMPLE_MS * 1.5 && quality > MIN_QUALITY) {
            quality = Math.max(MIN_QUALITY, quality * Math.sqrt(MAX_SAMPLE_MS / ms));
            samples = 0;
            request();
          }
        });
      }
    }

    if (busy || inMotion || samples < SAMPLES) {
      frame = requestAnimationFrame(loop);
    } else {
      running = false;
    }
  };

  /**
   * Le temps d'un échantillon donne le coût d'un pixel ; on en déduit la
   * résolution qui tient dans le budget d'une image en mouvement.
   */
  const calibrate = (ms: number, pixels: number) => {
    const full = (ms / pixels) * canvas.width * canvas.height;
    motionScale = Math.min(1, Math.max(0.2, Math.sqrt(INTERACTIVE_MS / full)));
    // Première mesure : la résolution de repos qui tient dans le budget d'un
    // échantillon. Ensuite, seul un échantillon trop lent la fait baisser.
    if (!calibrated) quality = Math.min(1, Math.max(MIN_QUALITY, Math.sqrt(MAX_SAMPLE_MS / full)));
  };

  /**
   * Relance la boucle si elle dort. `restart` : la vue a changé, l'affinage
   * repart de zéro ; sinon il reprend où il en était (le canvas garde sa
   * dernière image, revenir à l'écran ne coûte rien).
   */
  function request(restart = true) {
    if (restart) samples = 0;
    if (!running && alive && visible) {
      running = true;
      frame = requestAnimationFrame(loop);
    }
  }

  /* ── Écoutes ──────────────────────────────────────────────────── */

  const onPointerMove = (event: PointerEvent) => {
    if (!finePointer.matches) return;
    const rect = canvas.getBoundingClientRect();
    aim.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    aim.y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
    request();
  };

  const onPointerLeave = () => {
    aim.x = 0;
    aim.y = 0;
    request();
  };

  // La taille change-t-elle vraiment ? `resize()` le dira, et remettra à zéro.
  const onResize = () => request(false);

  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          ([entry]) => {
            visible = entry?.isIntersecting ?? true;
            if (visible) request(false);
          },
          { rootMargin: '120px' }
        )
      : null;
  observer?.observe(canvas);

  if (!reduced.matches) {
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
  }
  window.addEventListener('resize', onResize);

  uploadPosition(0);
  resize();
  request();

  return {
    get plyCount() {
      return positions.length;
    },

    get ply() {
      return ply;
    },

    setPly(next: number) {
      const clamped = Math.max(0, Math.min(positions.length - 1, Math.trunc(next)));
      if (clamped === ply) return;
      ply = clamped;
      uploadPosition(ply);
      request();
    },

    load(moves, start) {
      positions = replay(moves, start);
      ply = 0;
      uploadPosition(0);
      request();
    },

    destroy() {
      alive = false;
      running = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);

      uniformBuffer.destroy();
      pieceBuffer.destroy();
      cellBuffer.destroy();
      still?.texture.destroy();
      moving?.texture.destroy();
      // Le périphérique et les pipelines restent : le pion de l'accueil s'en sert.
      try {
        context.unconfigure();
      } catch {
        // Contexte déjà détaché avec son canvas : rien à faire.
      }
    },
  };
}
