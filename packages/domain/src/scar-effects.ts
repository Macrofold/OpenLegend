import type { Entity, WorldState } from './types.js';

/** Read the selected saved rules without importing lifecycle execution. */
export function scarFactor(
  world: WorldState,
  entity: Entity,
  effect: 'movementFactor' | 'outgoingInjuryFactor' | 'incomingInjuryFactor',
): number {
  return (world.moduleManifest.bodyPolicy?.reincarnation?.scars ?? []).reduce(
    (factor, scar) => factor * (entity.actor?.scars?.[scar.id] ? scar[effect] : 1),
    1,
  );
}
