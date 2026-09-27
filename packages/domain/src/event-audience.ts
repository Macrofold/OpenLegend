import { worldRootEntities } from './entity-index.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { hearsEntity, seesEntity, sensesFor } from './perception.js';
import { spatialCandidates } from './spatial.js';
import { bodyProfile, worldPosition } from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';

type Receiver = { id: string; position: Position; radius: number; order: number };
type ReceiverIndex = {
  inputs: Receiver[];
  buckets: Array<{ radius: number; near: ReturnType<typeof spatialCandidates<Receiver>> }>;
};
const frames = new WeakMap<WorldState, Map<boolean, ReceiverIndex>>();
const stableFrames = new WeakMap<WorldState, Map<boolean, ReceiverIndex>>();
/** Synchronous native flight evidence changes experience, not receiver poses/senses/bodies.
 * Only that explicitly fixed phase may skip rereading inputs for simultaneous occurrences. */
export function withStableAudience(world: WorldState, emitOccurrences: () => void): void {
  const previous = stableFrames.get(world);
  stableFrames.set(world, new Map());
  try {
    emitOccurrences();
  } finally {
    if (previous) stableFrames.set(world, previous);
    else stableFrames.delete(world);
  }
}
/** Receiver extents, not the speaker's hearing radius, bound candidates. Revalidate scalar
 * inputs on every emission; only the exact immutable geometry query may be memoized.
 * No TTL, stale draft reference or pre-movement audience becomes authority.
 * docs/events-perception-and-reactions.md#perception-acquisition-is-normally-private */
export function externalAudience(world: WorldState, source: Entity, speech: boolean): string[] {
  if (!activelyParticipates(source)) return [];
  const stable = stableFrames.get(world);
  let index = stable?.get(speech);
  if (!index) {
    const roots = worldRootEntities(world, true);
    const inputs: Receiver[] = [];
    for (const [order, entity] of roots.entries()) {
      if (!hasMemory(entity) || !entity.actor?.alive || !activelyParticipates(entity)) continue;
      const radius =
        sensesFor(world, entity).find(
          (s) => s.implementation === (speech ? 'hearing-transmission-v1' : 'vision-geometry-v1'),
        )?.radius ?? 0;
      if (radius <= 0) continue;
      const p = worldPosition(entity);
      inputs.push({
        id: entity.id,
        order,
        radius,
        position: { x: p.x, y: p.y + (speech ? bodyProfile(entity).earHeight : 0), z: p.z },
      });
    }
    let frame = frames.get(world);
    if (!frame) frames.set(world, (frame = new Map()));
    index = frame.get(speech);
    if (
      !index ||
      index.inputs.length !== inputs.length ||
      inputs.some((input, i) => {
        const old = index!.inputs[i]!;
        return (
          input.id !== old.id ||
          input.radius !== old.radius ||
          input.order !== old.order ||
          input.position.x !== old.position.x ||
          input.position.y !== old.position.y ||
          input.position.z !== old.position.z
        );
      })
    ) {
      const buckets = new Map<number, Receiver[]>();
      for (const input of inputs) {
        // Logarithmic extents avoid either expanding huge volumes into tiny cells or
        // forcing every short-range receiver through the largest receiver's search.
        const radius = 2 ** Math.ceil(Math.log2(Math.max(1, input.radius)));
        const bucket = buckets.get(radius) ?? [];
        bucket.push(input);
        buckets.set(radius, bucket);
      }
      index = {
        inputs,
        buckets: [...buckets].map(([radius, receivers]) => ({
          radius,
          near: spatialCandidates(receivers, radius),
        })),
      };
      frame.set(speech, index);
    }
    stable?.set(speech, index);
  }
  const p = worldPosition(source);
  const origin = { x: p.x, y: p.y + (speech ? bodyProfile(source).earHeight : 0), z: p.z };
  return index.buckets
    .flatMap((bucket) => bucket.near(origin, bucket.radius))
    .filter(
      (receiver) =>
        Math.hypot(
          receiver.position.x - origin.x,
          receiver.position.y - origin.y,
          receiver.position.z - origin.z,
        ) <= receiver.radius,
    )
    .sort((a, b) => a.order - b.order)
    .filter((receiver) =>
      speech
        ? hearsEntity(world, world.entities[receiver.id]!, source)
        : seesEntity(world, world.entities[receiver.id]!, source),
    )
    .map((receiver) => receiver.id);
}
