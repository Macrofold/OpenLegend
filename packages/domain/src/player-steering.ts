import { traceSupportLine, type SurfacePoint } from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { spatialMap, supportedPosition } from './spatial-state.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import type { AdmittedWorldInput } from './execution-input.js';
import type { Entity, WorldState } from './types.js';

export interface PreparedPlayerSteering {
  path: SurfacePoint[];
  distance: number;
}
export function canSteer(world: WorldState, actor: Entity): boolean {
  const action = actor.actor?.action;
  return (
    !!actor.actor?.alive &&
    !actor.actor.incapacitated &&
    activelyParticipates(actor) &&
    !capabilityBlocked(world, actor, 'locomotion') &&
    !actor.spatial.flight &&
    actor.spatial.fallVelocity === undefined &&
    // Committed weapon recovery permits retreat independently of optional timing.
    // Its body deadline still blocks another attack through the combat owner.
    // docs/worlds/base/skilled-action-execution.md#native-weapon-baselines-and-recovery
    (!action ||
      !!action.attackExecution ||
      (action.type === 'strike' && action.strikePhase === 'recovery'))
  );
}
/** One input window belongs only to its admitted future interval, never older debt. */
export function playerInputBoundary(
  world: WorldState,
  inputs: readonly AdmittedWorldInput[],
  seconds: number,
  travelFor: (id: string) => number,
): number {
  let bound = seconds;
  for (const input of inputs) {
    for (const window of [input.steering, input.release]) {
      if (!window) continue;
      if (window.startsAt > world.simTime) bound = Math.min(bound, window.startsAt - world.simTime);
      else if (window.endsAt > world.simTime)
        bound = Math.min(bound, window.endsAt - world.simTime);
    }
    if (
      input.steering &&
      input.steering.startsAt <= world.simTime &&
      input.steering.endsAt > world.simTime
    ) {
      const actor = entityGet(world.entities, input.actorId);
      if (actor && canSteer(world, actor))
        bound = Math.min(bound, travelFor(actor.id) / nativeMovementSpeed(world, actor));
    }
  }
  return bound;
}
export function preparePlayerSteering(
  world: WorldState,
  inputs: readonly AdmittedWorldInput[],
  seconds: number,
): Map<string, PreparedPlayerSteering> {
  const result = new Map<string, PreparedPlayerSteering>();
  for (const input of inputs) {
    const steering = input.steering,
      actor = entityGet(world.entities, input.actorId);
    if (
      !steering ||
      !actor ||
      !canSteer(world, actor) ||
      steering.startsAt > world.simTime ||
      steering.endsAt <= world.simTime
    )
      continue;
    const start = supportedPosition(actor);
    if (!start) continue;
    const duration = Math.min(seconds, steering.endsAt - world.simTime),
      distance = nativeMovementSpeed(world, actor) * duration;
    const path = traceSupportLine(
      spatialMap(world),
      start,
      start.x + steering.direction.x * distance,
      start.z + steering.direction.z * distance,
    );
    if (!path?.length) continue;
    result.set(actor.id, {
      path,
      distance,
    });
  }
  return result;
}
