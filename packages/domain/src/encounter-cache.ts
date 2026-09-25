import { capabilityBlocked } from './status-capabilities.js';
import { hasMemory } from './living.js';
import { sensesFor } from './perception.js';
import type { Entity, Position, WorldState } from './types.js';

type Footprint = {
  entity: Entity;
  id: string;
  position: Position;
  body: string;
  alive: boolean;
  observer: boolean;
  object: boolean;
  bindings: string;
  blocked: boolean;
};
type ExposureStamp = {
  map: WorldState['map'];
  manifest: WorldState['moduleManifest'];
  restrictions: WorldState['statusEffectPolicy'];
  entities: Footprint[];
  touch: boolean;
};
const completed = new WeakMap<WorldState, ExposureStamp>();
function footprint(entity: Entity, world: WorldState): Footprint {
  const observer = !!entity.actor?.alive && hasMemory(entity);
  return {
    entity,
    id: entity.id,
    position: entity.position,
    body: entity.spatial.bodyProfileId,
    alive: !!entity.actor?.alive,
    observer,
    object: !entity.actor && !entity.animal,
    bindings: observer ? (entity.actor?.senses?.join('|') ?? 'default') : '',
    blocked: observer && capabilityBlocked(world, entity, 'perception'),
  };
}
/** This proof only skips rediscovery of unchanged visual exposures, never speech admission.
 * Every footprint and live restriction is read from the finalized physical phase. A new
 * world root without a completed proof (command, edit or restore) takes the exact path.
 * Touch remains exact each step because moving -> present depends on the previous interval.
 * docs/performance.md#simulation-cpu-and-growing-history
 */
export function encounterPhase(previous: WorldState, snapshot: WorldState) {
  if (!Object.isFrozen(previous) || !Object.isFrozen(snapshot.entities))
    return { unchanged: false, complete: (_world: WorldState) => {} };
  const entities = Object.values(snapshot.entities);
  const prior = completed.get(previous);
  // Inert objects dominate most scenes. Their unchanged immutable record already proves
  // every footprint field; only changed records/rules need another live restriction read.
  const footprints = entities.map((entity, i) => {
    const old = prior?.entities[i];
    return old?.entity === entity && prior?.restrictions === snapshot.statusEffectPolicy
      ? old
      : footprint(entity, snapshot);
  });
  const unchanged =
    !!prior &&
    !prior.touch &&
    prior.map === snapshot.map &&
    prior.manifest === snapshot.moduleManifest &&
    prior.entities.length === footprints.length &&
    footprints.every((next, i) => {
      const old = prior.entities[i]!;
      return (
        old.id === next.id &&
        old.position === next.position &&
        old.body === next.body &&
        old.alive === next.alive &&
        old.observer === next.observer &&
        old.object === next.object &&
        old.bindings === next.bindings &&
        old.blocked === next.blocked
      );
    });
  const stamp: ExposureStamp = unchanged
    ? prior
    : {
        map: snapshot.map,
        manifest: snapshot.moduleManifest,
        restrictions: snapshot.statusEffectPolicy,
        entities: footprints,
        touch: entities.some(
          (entity, i) =>
            footprints[i]!.observer &&
            sensesFor(snapshot, entity).some(
              (sense) => sense.implementation === 'body-contact-v1',
            ),
        ),
      };
  return { unchanged, complete: (world: WorldState) => completed.set(world, stamp) };
}
