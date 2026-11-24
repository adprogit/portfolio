/**
 * Le hero de l'accueil : un nuage de gaussiennes rendu en WebGPU, et trois
 * façons de le montrer.
 *
 * Le module ne descend qu'une fois la page chargée (voir `HeroScene.astro`).
 * Il ne dessine que lorsque le cadre est à l'écran et l'onglet visible ; sans
 * mouvement demandé (`prefers-reduced-motion`), il dessine une image, puis
 * seulement quand quelque chose change — le mode, le thème, la taille.
 *
 * La résolution suit la densité de l'écran, plafonnée à 2 : au-delà, le coût
 * grandit et l'œil ne voit plus rien de plus.
 */

import { compileModule, requestSharedGpu } from '../gpu/device';
import { buildScene, createSorter, focalFor, LIGHT, START_SPIN, TILT, viewMatrix } from './scene';
import { POST, SPLAT } from './shader-wgsl';

export type HeroMode = 'splat' | 'dither' | 'hatch';

const MODES: HeroMode[] = ['splat', 'dither', 'hatch'];

export interface HeroHandle {
  setMode(mode: HeroMode): void;
  destroy(): void;
}

const UNIFORM_BYTES = 176;
const TARGET_FORMAT: GPUTextureFormat = 'rgba16float';
/** Un tour en trois minutes : on le voit tourner, on ne le suit pas. */
const SPIN_SPEED = (2 * Math.PI) / 180;

/** `#rrggbb` → [r, g, b, 1], dans [0, 1]. Les couleurs du site sont en hex. */
function cssColor(name: string): number[] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  const v = m ? parseInt(m[1]!, 16) : 0x808080;
  return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, 1];
}

export async function mountSplatHero(
  canvas: HTMLCanvasElement,
  initial: HeroMode,
  onFirstFrame: () => void
): Promise<HeroHandle | null> {
  const shared = await requestSharedGpu();
  if (!shared || shared.lost) return null;
  const { device, format } = shared;

  const [splatModule, postModule] = await Promise.all([
    compileModule(device, SPLAT, 'hero splat'),
    compileModule(device, POST, 'hero post'),
  ]);
  if (!splatModule || !postModule) return null;

  const context = canvas.getContext('webgpu');
  if (!context) return null;
  try {
    // Prémultiplié : le fond de la page passe entre les gaussiennes.
    context.configure({ device, format, alphaMode: 'premultiplied' });
  } catch {
    return null;
  }

  /* ── Pipelines ────────────────────────────────────────────────── */

  // L'opérateur « over » sur des couleurs prémultipliées.
  const over: { color: GPUBlendComponent; alpha: GPUBlendComponent } = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
  };

  // Un pipeline refusé rejette la promesse : on laisse alors l'image de repli.
  const pipelines = await Promise.all([
    device.createRenderPipelineAsync({
      label: 'hero splat',
      layout: 'auto',
      vertex: { module: splatModule, entryPoint: 'vs' },
      fragment: {
        module: splatModule,
        entryPoint: 'fs',
        targets: [
          { format: TARGET_FORMAT, blend: over },
          { format: TARGET_FORMAT, blend: over },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    }),
    device.createRenderPipelineAsync({
      label: 'hero post',
      layout: 'auto',
      vertex: { module: postModule, entryPoint: 'vs' },
      fragment: { module: postModule, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    }),
  ]).catch(() => null);
  if (!pipelines) {
    context.unconfigure();
    return null;
  }
  const [splatPipeline, postPipeline] = pipelines;

  /* ── Tampons ──────────────────────────────────────────────────── */

  const scene = buildScene();
  const sort = createSorter(scene);

  const splatBuffer = device.createBuffer({
    label: 'hero splats',
    size: scene.data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(splatBuffer, 0, scene.data);

  const orderBuffer = device.createBuffer({
    label: 'hero order',
    size: scene.count * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const uniformBuffer = device.createBuffer({
    label: 'hero uniforms',
    size: UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const splatBind = device.createBindGroup({
    layout: splatPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: splatBuffer } },
      { binding: 2, resource: { buffer: orderBuffer } },
    ],
  });

  const uniforms = new ArrayBuffer(UNIFORM_BYTES);
  const f32 = new Float32Array(uniforms);
  const u32 = new Uint32Array(uniforms);

  /** Les encres viennent du thème ; relues quand il change. */
  const readColors = () => {
    f32.set(cssColor('--color-brand'), 20);
    f32.set(cssColor('--color-accent-pink'), 24);
    f32.set(cssColor('--color-ink-strong'), 28);
    f32.set(cssColor('--color-ink-soft'), 32);
  };
  readColors();
  f32.set(LIGHT, 36);

  let mode = initial;

  /* ── Cibles ───────────────────────────────────────────────────── */

  let width = 0;
  let height = 0;
  let dpr = 1;
  let targets: { textures: GPUTexture[]; views: GPUTextureView[]; post: GPUBindGroup } | null = null;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (targets && w === width && h === height) return;
    width = canvas.width = w;
    height = canvas.height = h;

    targets?.textures.forEach((texture) => texture.destroy());
    const textures = [0, 1].map(() =>
      device.createTexture({
        size: { width, height },
        format: TARGET_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      })
    );
    const views = textures.map((texture) => texture.createView());
    const post = device.createBindGroup({
      layout: postPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: views[0]! },
        { binding: 2, resource: views[1]! },
      ],
    });
    targets = { textures, views, post };
  };

  /* ── Image ────────────────────────────────────────────────────── */

  let spin = START_SPIN;
  let painted = false;

  const draw = () => {
    resize();
    if (!targets) return;

    const view = viewMatrix(spin, TILT);
    device.queue.writeBuffer(orderBuffer, 0, sort(view));

    const focal = focalFor(height);
    f32.set(view, 0);
    f32.set([focal, focal, width, height], 16);
    u32[39] = MODES.indexOf(mode);
    // Le pixel du tramage : 2 pixels CSS, pour qu'il se voie comme tel.
    f32[40] = Math.max(2, Math.round(2 * dpr));
    f32[41] = dpr;
    device.queue.writeBuffer(uniformBuffer, 0, uniforms);

    const encoder = device.createCommandEncoder();
    const splatPass = encoder.beginRenderPass({
      colorAttachments: targets.views.map((view) => ({
        view,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear' as const,
        storeOp: 'store' as const,
      })),
    });
    splatPass.setPipeline(splatPipeline);
    splatPass.setBindGroup(0, splatBind);
    splatPass.draw(4, scene.count);
    splatPass.end();

    const postPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    postPass.setPipeline(postPipeline);
    postPass.setBindGroup(0, targets.post);
    postPass.draw(3);
    postPass.end();

    device.queue.submit([encoder.finish()]);

    if (!painted) {
      painted = true;
      onFirstFrame();
    }
  };

  /* ── Boucle ───────────────────────────────────────────────────── */

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let last = 0;
  let onScreen = true;
  let alive = true;

  const animated = () => !reduced.matches && onScreen && !document.hidden;

  const tick = (now: number) => {
    frame = 0;
    if (!alive || shared.lost) return;
    // Pas de rattrapage après une pause : on reprend où l'on était.
    const dt = last ? Math.min(now - last, 100) / 1000 : 0;
    last = now;
    spin += dt * SPIN_SPEED;
    draw();
    if (animated()) frame = requestAnimationFrame(tick);
    else last = 0;
  };

  /** Une image maintenant, puis la boucle si le mouvement est permis. */
  const wake = () => {
    if (!alive || frame) return;
    frame = requestAnimationFrame(tick);
  };

  const visibility = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    if (onScreen) wake();
  });
  visibility.observe(canvas);

  const sizes = new ResizeObserver(() => wake());
  sizes.observe(canvas);

  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  const onTheme = () => {
    readColors();
    wake();
  };
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('themechange', onTheme);
  reduced.addEventListener('change', wake);

  wake();

  return {
    setMode(next) {
      mode = next;
      wake();
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      sizes.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('themechange', onTheme);
      reduced.removeEventListener('change', wake);
      targets?.textures.forEach((texture) => texture.destroy());
      splatBuffer.destroy();
      orderBuffer.destroy();
      uniformBuffer.destroy();
      context.unconfigure();
    },
  };
}
