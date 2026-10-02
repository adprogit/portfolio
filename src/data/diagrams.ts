/**
 * Les schémas des notes — leur clé, et rien d'autre.
 *
 * Chaque clé correspond à un composant de `src/components/diagrams/`, choisi
 * par `Diagram.astro`. Ce fichier est séparé de `projects.ts` et de `notes.ts`
 * pour qu'un bloc `diagram` puisse être typé des deux côtés sans que l'un
 * importe l'autre.
 */
export const diagramKeys = [
  'pinhole',
  'raySphere',
  'sphereTracing',
  'finiteNormal',
  'lambert',
  'blinnLobes',
  'softShadow',
  'mirror',
  // Le banc d'essai des méthodes de descente, recalculé (`src/lib/optim.ts`).
  'frprKappa',
  'frprBatch',
  'frprRosenbrock',
  'frprAnim',
  'benchTrajectories',
  'benchKappa',
  'benchDimension',
  'benchRate',
  'benchLineSearch',
  // U-Net, pièce par pièce — calculés depuis `src/lib/unet.ts`.
  'unetConv',
  'unetResample',
  'unetArchitecture',
  'unetReceptive',
  'unetBudget',
  'unetDiceIou',
  // Cel shading, et l'aparté sur les god rays — calculés depuis `src/lib/toon.ts`.
  'toonSphere',
  'toonRamp',
  'toonRim',
  'toonEdges',
  'godRaysImage',
  'godRaysDecay',
  // Rasterisation, du sommet au pixel — calculés depuis `src/lib/raster.ts`.
  'rasterPipeline',
  'rasterCoverage',
  'rasterPerspective',
  'rasterDepth',
] as const;

export type DiagramKey = (typeof diagramKeys)[number];
