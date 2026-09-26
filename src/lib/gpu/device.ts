/**
 * Le périphérique WebGPU du site, partagé par tout l'onglet.
 *
 * Deux rendus s'en servent (le pion de l'accueil, l'échiquier du projet ray
 * marcher) et une page peut les monter puis les démonter plusieurs fois.
 * Demander un `GPUDevice` coûte bien plus cher que dessiner : on le demande
 * une fois, on le garde, et personne ne le détruit — seuls les tampons et les
 * contextes propres à chaque canvas sont libérés.
 */

export interface SharedGpu {
  device: GPUDevice;
  /** Format de canvas préféré de la plateforme. */
  format: GPUTextureFormat;
  /** Passe à `true` si le périphérique est perdu (veille, pilote qui tombe). */
  lost: boolean;
}

let pending: Promise<SharedGpu | null> | null = null;

async function initialise(gpu: GPU): Promise<SharedGpu | null> {
  try {
    // `low-power` : ce sont des décors, pas une raison de réveiller la carte
    // dédiée d'un portable.
    const adapter = await gpu.requestAdapter({ powerPreference: 'low-power' });
    if (!adapter) return null;

    const device = await adapter.requestDevice();
    const shared: SharedGpu = { device, format: gpu.getPreferredCanvasFormat(), lost: false };

    // Périphérique perdu : on marque l'état et on autorise une nouvelle
    // tentative au prochain montage.
    void device.lost.then(() => {
      shared.lost = true;
      pending = null;
    });

    if (import.meta.env.DEV) {
      device.addEventListener('uncapturederror', (event) => {
        console.warn((event as GPUUncapturedErrorEvent).error.message);
      });
    }

    return shared;
  } catch {
    // Adaptateur refusé, périphérique indisponible : l'appelant bascule.
    return null;
  }
}

/**
 * Renvoie le périphérique partagé, ou `null` si WebGPU n'est pas disponible.
 *
 * À appeler **avant** `canvas.getContext('webgpu')` : un canvas n'accepte
 * qu'un seul type de contexte, et il ne faut pas le griller pour rien.
 */
export function requestSharedGpu(): Promise<SharedGpu | null> {
  const gpu = navigator.gpu;
  if (!gpu) return Promise.resolve(null);
  pending ??= initialise(gpu);
  return pending;
}

/**
 * Compile un shader et **vérifie qu'il compile**.
 *
 * Un module refusé ne dessine rien : mieux vaut le savoir ici, et laisser
 * l'appelant se rabattre, que peindre un cadre noir sans explication.
 */
export async function compileModule(
  device: GPUDevice,
  code: string,
  label: string
): Promise<GPUShaderModule | null> {
  const module = device.createShaderModule({ code, label });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === 'error');

  if (errors.length) {
    if (import.meta.env.DEV) {
      errors.forEach((error) =>
        console.warn(`WGSL ${label} ${error.lineNum}:${error.linePos} — ${error.message}`)
      );
    }
    return null;
  }
  return module;
}
