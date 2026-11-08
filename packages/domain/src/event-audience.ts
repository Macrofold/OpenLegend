import { entityGet, entityOrdering } from './entity-collection.js';
import { countDomainWork } from './diagnostic-counters.js';
import { nativeEntityGroups } from './entity-index.js';
import { takeNativeChanges } from './native-change-feed.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity, visionRadius } from './perception.js';
import { SpatialCandidateIndex } from './spatial.js';
import { worldPosition } from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';

type Receiver = { id: string; position: Position; radius: number; order: number; key: string };
type ReceiverIndex = {
  manifestRevision: number;
  receivers: Map<string, Receiver>;
  buckets: Map<number, SpatialCandidateIndex<Receiver>>;
};
const frames = new WeakMap<WorldState, ReceiverIndex>();
const bucketRadius = (radius: number) => 2 ** Math.ceil(Math.log2(Math.max(1, radius)));
function refreshReceiver(world: WorldState, index: ReceiverIndex, id: string): void {
  const entity = entityGet(world.entities, id),
    previous = index.receivers.get(id),
    radius =
      entity && hasMemory(entity) && entity.actor?.alive && activelyParticipates(entity)
        ? visionRadius(world, entity)
        : 0,
    key = radius > 0 ? entityOrdering(world.entities, id)?.key : undefined,
    position = key && entity ? worldPosition(entity) : undefined;
  if (
    previous &&
    position &&
    previous.radius === radius &&
    previous.key === key &&
    previous.position.x === position.x &&
    previous.position.y === position.y &&
    previous.position.z === position.z
  )
    return;
  if (previous) {
    const size = bucketRadius(previous.radius),
      bucket = index.buckets.get(size)!;
    bucket.delete(id);
    index.receivers.delete(id);
    if (!bucket.size) index.buckets.delete(size);
  }
  if (!position || !key) return;
  const receiver: Receiver = {
    id,
    position: { x: position.x, y: position.y, z: position.z },
    radius,
    key,
    order: 0,
  };
  const size = bucketRadius(radius);
  let bucket = index.buckets.get(size);
  if (!bucket) index.buckets.set(size, (bucket = new SpatialCandidateIndex<Receiver>(size)));
  bucket.set(receiver);
  index.receivers.set(id, receiver);
  countDomainWork('audienceReceiverUpdates');
}
/** The existing receiver inventory follows actual native writes. It grants no
 * visibility: every occurrence still proves current sight after spatial selection.
 * Unknown editors/global changes rebuild through the existing actor role owner.
 * docs/projects/bookkeeping-simplification-tech-design.md#r5r7--scope-event-and-received-phase-preparation-before-materializing-it */
function nearbyReceivers(world: WorldState, source: Entity): Receiver[] {
  if (!activelyParticipates(source)) return [];
  let index = frames.get(world);
  const changed = index ? takeNativeChanges(world, index) : undefined;
  if (!index || !changed || index.manifestRevision !== world.moduleManifest.revision) {
    index = {
      manifestRevision: world.moduleManifest.revision,
      receivers: new Map(),
      buckets: new Map(),
    };
    frames.set(world, index);
    // Establish the cursor before preparing scalars; sensing does not mutate receivers.
    takeNativeChanges(world, index);
    countDomainWork('audienceScans');
    for (const id of nativeEntityGroups(world).actors) refreshReceiver(world, index, id);
  } else for (const id of changed) refreshReceiver(world, index, id);
  const origin = worldPosition(source);
  const candidates = [...index.buckets].flatMap(([radius, bucket]) => bucket.query(origin, radius));
  countDomainWork('audienceCandidates', candidates.length);
  return candidates
    .filter(
      (receiver) =>
        Math.hypot(
          receiver.position.x - origin.x,
          receiver.position.y - origin.y,
          receiver.position.z - origin.z,
        ) <= receiver.radius,
    )
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
export function externalAudience(world: WorldState, source: Entity): string[] {
  return nearbyReceivers(world, source)
    .filter((receiver) => {
      const observer = entityGet(world.entities, receiver.id);
      return !!observer && seesEntity(world, observer, source);
    })
    .map((receiver) => receiver.id);
}

/** A world may retain an occurrence for a real receiving consumer. Candidate
 * eligibility precedes exact sight; an old encounter never grants visibility. */
export function hasExternalAudience(
  world: WorldState,
  source: Entity,
  qualifies: (observer: Entity) => boolean,
): boolean {
  for (const receiver of nearbyReceivers(world, source)) {
    const observer = entityGet(world.entities, receiver.id);
    if (observer && qualifies(observer) && seesEntity(world, observer, source)) return true;
  }
  return false;
}
