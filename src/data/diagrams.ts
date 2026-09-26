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
] as const;

export type DiagramKey = (typeof diagramKeys)[number];
