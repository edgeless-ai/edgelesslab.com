// Logistic map noise helper for tartanism
// Uses the existing LogisticMap implementation from the Hermes workspace.
import { LogisticMap } from '../../../../../.hermes/kanban/boards/edgeless/workspaces/t_6858e33a/logistic_map.js';

/**
 * Generate a seed value using the logistic map.
 * Returns a number suitable for use as a base seed in the tartan generator.
 */
export function getSeed() {
  // Initialize logistic map with a seed derived from the current time.
  const lm = new LogisticMap({ r: 3.9, x0: (Date.now() % 1) });
  // Produce a pseudo‑random value in (0,1) and scale it.
  const noise = lm.next();
  return Date.now() + Math.floor(noise * 1e6);
}
