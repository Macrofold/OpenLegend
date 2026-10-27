import { createBaseDiagnosticWorld } from '../../packages/domain/src/worlds/base/world.js';
import type { WorldCreationAccounts } from '../../packages/domain/src/invention-attribution.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { prepareBaseInitialWorldState } from '../../packages/domain/src/worlds/base/initial-opening.js';

// Browser fixtures construct their opening before the server can initialize physics.
await initializeCollisionRuntime();

/** Explicit supplied camp for isolated native-action examples. The real ordinary
 * Main is empty handed; these specimens need chosen stock and no roaming ecology. */
export function stockedCamp(seed = 73, accounts?: WorldCreationAccounts) {
  const world = createBaseDiagnosticWorld(seed, accounts);
  // This is fresh authored state, not a restored world. Stored fixtures need the
  // same actual starting reception and bodily concerns as ordinary creation.
  prepareBaseInitialWorldState(world);
  // These isolated action specimens start running rather than awaiting review
  // of a newly created playable opening.
  world.paused = false;
  return world;
}
