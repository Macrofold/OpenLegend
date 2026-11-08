import { recordSemanticChange } from '../../dependencies.js';
import { recordAnimalClockWrite } from '../../native-response-controller.js';
import type { NativeForagingState } from '../../native-foraging.js';
import type { Entity, WorldState } from '../../types.js';
import type { SurfacePoint } from '@open-legend/spatial';

/** Private review clocks and route preparation wake their existing queues.
 * Only an actual behavior change invalidates physical/status preparation.
 * docs/projects/bookkeeping-simplification-tech-design.md#a1--private-reviews-without-unrelated-physical-rebuilds */
export function foragingBehaviorChanged(world: WorldState, animal: Entity): void {
  recordAnimalClockWrite(world, animal.id);
  recordSemanticChange(world, { kind: 'state', entityId: animal.id, field: 'behavior' });
}

export function setForagingReviewAt(world: WorldState, animal: Entity, at: number): void {
  const state = animal.animal!.foraging!;
  if (state.reviewAt === at) return;
  state.reviewAt = at;
  recordAnimalClockWrite(world, animal.id);
}

export function setForagingMode(
  world: WorldState,
  animal: Entity,
  mode: NativeForagingState['mode'],
): void {
  const state = animal.animal!.foraging!;
  if (state.mode === mode) return;
  state.mode = mode;
  foragingBehaviorChanged(world, animal);
}

export function setForagingDestination(
  world: WorldState,
  animal: Entity,
  destination: SurfacePoint | undefined,
): void {
  const state = animal.animal!.foraging!,
    previous = state.destination;
  if (
    previous === destination ||
    (previous &&
      destination &&
      previous.x === destination.x &&
      previous.y === destination.y &&
      previous.z === destination.z &&
      previous.surfaceId === destination.surfaceId)
  )
    return;
  if (destination) state.destination = { ...destination };
  else delete state.destination;
  // A proposed destination is private preparation. Admitted locomotion records
  // its actual execution and position through the ordinary movement owner.
  recordAnimalClockWrite(world, animal.id);
}
