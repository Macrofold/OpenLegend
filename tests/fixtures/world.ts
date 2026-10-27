import { createBaseDiagnosticWorld } from '../../packages/domain/src/worlds/base/world.js';
import type { WorldCreationAccounts } from '../../packages/domain/src/invention-attribution.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';

// Browser fixtures construct their opening before the server can initialize physics.
await initializeCollisionRuntime();

/** Explicit supplied camp for isolated native-action examples. The real ordinary
 * Main is empty handed; these specimens need chosen stock and no roaming ecology. */
export function stockedCamp(seed = 73, accounts?: WorldCreationAccounts) {
  return createBaseDiagnosticWorld(seed, accounts);
}
