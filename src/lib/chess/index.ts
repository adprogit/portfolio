/**
 * L'échiquier du projet ray marcher, calculé en direct par le GPU.
 *
 * Le C++ met des minutes à sortir une image 800×600 en 16 échantillons par
 * pixel ; ici la même scène, le même champ de distance et le même éclairage
 * tiennent dans une image par rafraîchissement. Avancer d'un coup ne
 * reconstruit rien : deux tampons sont réécrits — les 32 pièces et les 64
 * cases de la grille — et l'image est redemandée.
 *
 * Le rendu est **à la demande** : rien n'est dessiné tant que la position, la
 * taille ou le curseur ne bougent pas. Un échiquier immobile ne coûte rien.
 */

import { compileModule, requestSharedGpu, type SharedGpu } from '../gpu/device';
import {
  CELL_BYTES,
  MAX_PIECES,
  PIECE_BYTES,
  SHADER,
  UNIFORM_BYTES,
} from './shader-wgsl';
import { GAME, KNIGHT, placements, replay } from './game';

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

/**
 * Budget de pixels. La scène est bien plus lourde que le pion de l'accueil
 * (six champs composés, une marche d'ombre par impact) : on vise plus bas et
 * on laisse le CSS agrandir.
 */
const MAX_PIXELS = 180_000;

/** Au-delà, la première image est jugée trop chère et la résolution baisse. */
const SLOW_FIRST_FRAME_MS = 120;

export interface ChessHandle {
  /** Nombre de demi-coups jouables, position initiale comprise. */
  readonly plyCount: number;
  /** Demi-coup affiché, de 0 (position initiale) à `plyCount - 1`. */
  readonly ply: number;
  setPly(ply: number): void;
  destroy(): void;
}

/** Pipeline de l'échiquier, construit une fois pour le périphérique partagé. */
let pipeline: Promise<GPURenderPipeline | null> | null = null;

async function buildPipeline(shared: SharedGpu): Promise<GPURenderPipeline | null> {
  try {
    const module = await compileModule(shared.device, SHADER, 'chess-board');
    if (!module) return null;

    return await shared.device.createRenderPipelineAsync({
      label: 'chess-board',
      layout: 'auto',
      vertex: { module, entryPoint: 'vs_main' },
      fragment: { module, entryPoint: 'fs_main', targets: [{ format: shared.format }] },
      primitive: { topology: 'triangle-list' },
    });
  } catch {
    return null;
  }
}

/**
 * Monte l'échiquier sur un canvas. Résout sur `null` si WebGPU manque —
 * l'appelant affiche alors son repli.
 */
export async function mountChessBoard(
  canvas: HTMLCanvasElement
): Promise<ChessHandle | null> {
  const shared = await requestSharedGpu();
  if (!shared || shared.lost) return null;

  pipeline ??= buildPipeline(shared);
  const built = await pipeline;
  if (!built) return null;

  const context = canvas.getContext('webgpu');
  if (!context) return null;

  const { device, format } = shared;

  try {
    context.configure({ device, format, alphaMode: 'opaque' });
  } catch {
    return null;
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
    layout: built.getBindGroupLayout(0),
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

  const positions = replay(GAME);
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

  /* ── Boucle ───────────────────────────────────────────────────── */

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  let scale = Math.min(window.devicePixelRatio || 1, 1.5);
  let frame = 0;
  let alive = true;
  let visible = true;
  let running = false;
  let dirty = true;
  let painted = false;
  let calibrated = false;

  const pointer = { x: 0, y: 0 };
  const aim = { x: 0, y: 0 };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const budget = Math.sqrt(MAX_PIXELS / (rect.width * rect.height));
    const ratio = Math.min(scale, Math.max(budget, 0.3));
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      dirty = true;
    }
  };

  const draw = () => {
    if (!alive || shared.lost) return;
    if (canvas.width < 1 || canvas.height < 1) return;

    // La caméra du C++ est fixe ; le curseur ne fait que la décaler autour du
    // plateau, ce qui laisse voir le relief des pièces.
    const angle = pointer.x * 0.6;
    const halfWidth = Math.tan(((HFOV * 0.5) * Math.PI) / 180);
    const halfHeight = (halfWidth * canvas.height) / canvas.width;

    uniformF32[0] = canvas.width;
    uniformF32[1] = canvas.height;
    uniformF32[2] = pointer.x;
    uniformF32[3] = pointer.y;
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
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    pass.setPipeline(built);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);

    if (!painted) {
      painted = true;
      canvas.dataset.ready = 'true';
    }

    // Une seule mesure, sur la première image : le coût d'un dessin ne se lit
    // pas côté processeur, il faut attendre que le GPU ait fini.
    if (!calibrated) {
      calibrated = true;
      const started = performance.now();
      void device.queue.onSubmittedWorkDone().then(() => {
        if (!alive) return;
        if (performance.now() - started > SLOW_FIRST_FRAME_MS && scale > 0.5) {
          scale = Math.max(0.5, scale * 0.7);
          request();
        }
      });
    }
  };

  const loop = () => {
    if (!alive || !visible) {
      running = false;
      return;
    }

    const dx = aim.x - pointer.x;
    const dy = aim.y - pointer.y;
    const moving = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;

    if (moving) {
      pointer.x += dx * 0.09;
      pointer.y += dy * 0.09;
      dirty = true;
    }

    if (dirty) {
      dirty = false;
      resize();
      draw();
    }

    if (moving) {
      frame = requestAnimationFrame(loop);
    } else {
      running = false;
    }
  };

  /** Demande une image. Sans rien à animer, la boucle s'arrête aussitôt. */
  function request() {
    dirty = true;
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

  const onResize = () => request();

  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          ([entry]) => {
            visible = entry?.isIntersecting ?? true;
            if (visible) request();
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
    plyCount: positions.length,

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
      // Le périphérique et le pipeline restent : le pion de l'accueil s'en sert.
      try {
        context.unconfigure();
      } catch {
        // Contexte déjà détaché avec son canvas : rien à faire.
      }
    },
  };
}
