import { countDomainWork } from './diagnostic-counters.js';
import {
  canStand,
  movingBodyContact,
  SPATIAL_LIMITS,
  type BodyProfile,
  type WorldPoint,
} from '@open-legend/spatial';
import { rangedAccuracy, rangedPolicy } from './ranged-policy.js';
import {
  bodyProfile,
  spatialMap,
  spatialShapeChanged,
  supportedPosition,
  worldPosition,
} from './spatial-state.js';
import { nearbyBodyEntities, occupiedBodySweepClear } from './spatial.js';
import { entityGet } from './entity-collection.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { visionQuery } from './perception.js';
import { combatRecoveryDeadline } from './contact-defense.js';
import { attackExecutionFactor } from './combat-execution.js';
import { nextRandom } from './data.js';
import { emit } from './events.js';
import { subjectNarration } from './narration.js';
import { definitionPin } from './world-modules.js';
import { takeNativeChanges } from './native-change-feed.js';
import type { ProjectileFlight } from './ranged.js';
import type { Entity, WorldEvent, WorldState } from './types.js';

interface PosePreparation {
  ids: Set<string>;
  holding: Map<string, number>;
  blockers: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  geometry: number;
  initialized: boolean;
}
const poses = new WeakMap<WorldState, PosePreparation>();
function preparation(world: WorldState, bodyIds: readonly string[] = []): PosePreparation {
  let value = poses.get(world);
  if (!value)
    poses.set(
      world,
      (value = {
        ids: new Set(),
        holding: new Map(),
        blockers: new Map(),
        dependents: new Map(),
        geometry: -1,
        initialized: false,
      }),
    );
  if (!value.initialized && bodyIds.length) {
    for (const id of bodyIds) {
      const pose = entityGet(world.entities, id)?.spatial.localPose;
      if (!pose) continue;
      value.ids.add(id);
      if (pose.phase === 'holding') value.holding.set(id, pose.restoreAt);
    }
    value.initialized = true;
  }
  return value;
}
function forgetBlockers(state: PosePreparation, id: string): void {
  for (const blocker of state.blockers.get(id) ?? []) {
    const dependents = state.dependents.get(blocker);
    dependents?.delete(id);
    if (!dependents?.size) state.dependents.delete(blocker);
  }
  state.blockers.delete(id);
}
function forgetPose(state: PosePreparation, id: string): void {
  state.ids.delete(id);
  state.holding.delete(id);
  forgetBlockers(state, id);
}
function retainBlockers(world: WorldState, state: PosePreparation, entity: Entity): void {
  forgetBlockers(state, entity.id);
  const ordinary = bodyProfile(entity),
    blockers = new Set(
      nearbyBodyEntities(world, worldPosition(entity), ordinary.height + ordinary.radius).map(
        (body) => body.id,
      ),
    );
  state.blockers.set(entity.id, blockers);
  for (const id of blockers) {
    let dependents = state.dependents.get(id);
    if (!dependents) state.dependents.set(id, (dependents = new Set()));
    dependents.add(entity.id);
  }
}

function clearPose(world: WorldState, entity: Entity, profile: BodyProfile): boolean {
  const support = supportedPosition(entity);
  if (!support || !canStand(spatialMap(world), support, profile)) return false;
  // Reuse ordinary movement's conservative body-clearance owner with the proposed
  // capsule; no position, navigation or duplicate mutable geometry is committed.
  const proposed = {
    ...entity,
    spatial: { ...entity.spatial, body: profile, localPose: undefined },
  };
  return occupiedBodySweepClear(world, proposed, support, support);
}

/** The actual sensed crossing, useful contraction and current ability precede RNG. */
export function tryLocalAvoidance(
  world: WorldState,
  defender: Entity,
  flight: ProjectileFlight,
  contactPoint: WorldPoint,
  events: WorldEvent[],
): Readonly<WorldEvent> | undefined {
  const policy = rangedPolicy(world),
    response = policy?.localAvoidance,
    actor = defender.actor,
    action = actor?.action,
    ordinary = bodyProfile(defender),
    position = worldPosition(defender);
  if (
    !policy ||
    !response ||
    !actor?.alive ||
    actor.incapacitated ||
    !activelyParticipates(defender) ||
    defender.spatial.localPose ||
    defender.spatial.flight ||
    defender.spatial.fallVelocity !== undefined ||
    !supportedPosition(defender) ||
    !response.bodyProfiles.includes(ordinary.id) ||
    (defender.spatial.localAvoidanceReadyAt ?? 0) > world.simTime ||
    combatRecoveryDeadline(world, defender) > world.simTime ||
    (action && !['move', 'follow', 'evade'].includes(action.type)) ||
    ['actions', 'locomotion', 'perception'].some((capability) =>
      capabilityBlocked(world, defender, capability as 'actions' | 'locomotion' | 'perception'),
    ) ||
    !visionQuery(world, defender)({ id: flight.id, position: contactPoint, height: 0 })
  )
    return;
  const height = Math.max(
    2 * ordinary.radius + SPATIAL_LIMITS.epsilon,
    response.heightFactor * ordinary.height,
  );
  if (height >= ordinary.height) return;
  const ratio = height / ordinary.height;
  const contracted = {
    ...ordinary,
    height,
    eyeHeight: ordinary.eyeHeight * ratio,
    earHeight: ordinary.earHeight * ratio,
    interactionHeight: ordinary.interactionHeight * ratio,
  };
  // A contraction must clear this real crossing. A low projectile stays solidly
  // intercepted, even with zero handling. Its current point is already a genuine
  // ordinary-body contact, not a broad-phase proximity result.
  if (
    movingBodyContact(
      contactPoint,
      contactPoint,
      { ...position, y: position.y - SPATIAL_LIMITS.epsilon },
      { ...position, y: position.y - SPATIAL_LIMITS.epsilon },
      {
        ...contracted,
        radius: contracted.radius + SPATIAL_LIMITS.epsilon,
        height: contracted.height + 2 * SPATIAL_LIMITS.epsilon,
      },
    ) !== undefined ||
    !clearPose(world, defender, contracted)
  )
    return;
  defender.spatial.localAvoidanceReadyAt = world.simTime + response.cooldownSeconds;
  const score = flight.execution?.score ?? 0;
  const contact = Math.max(
    0,
    Math.min(
      1,
      rangedAccuracy(world, defender, flight.handling) *
        attackExecutionFactor(flight.execution, score, 'contact') *
        response.contextFactor,
    ),
  );
  if (contact >= 1 || (contact > 0 && nextRandom(world) < contact)) return;
  defender.spatial.localPose = {
    kind: 'duck',
    profile: definitionPin(policy),
    physicalLife: actor.physicalLife ?? 0,
    startedAt: world.simTime,
    restoreAt: world.simTime + response.holdSeconds,
    phase: 'holding',
  };
  const state = preparation(world);
  state.ids.add(defender.id);
  state.holding.set(defender.id, defender.spatial.localPose.restoreAt);
  spatialShapeChanged(world, defender);
  return emit(
    world,
    events,
    'body-ducked',
    subjectNarration(defender, response.contractedText),
    defender,
    defender.id,
    {
      projectileId: flight.id,
      observedX: contactPoint.x,
      observedY: contactPoint.y,
      observedZ: contactPoint.z,
    },
    'external',
    position,
  );
}

export function localPoseBoundary(
  world: WorldState,
  bodyIds: readonly string[],
  seconds: number,
): number {
  let bound = seconds;
  for (const restoreAt of preparation(world, bodyIds).holding.values()) {
    if (restoreAt > world.simTime) bound = Math.min(bound, restoreAt - world.simTime);
  }
  return bound;
}

/** One owner restores both due native boundaries and a newly admitted incompatible
 * action. Read-only admission uses the identical clearance rule. */
export function restoreLocalPose(world: WorldState, entity: Entity, events: WorldEvent[]): boolean {
  const pose = entity.spatial.localPose;
  if (!pose || pose.restoreAt > world.simTime || !clearPose(world, entity, bodyProfile(entity)))
    return false;
  delete entity.spatial.localPose;
  forgetPose(preparation(world), entity.id);
  spatialShapeChanged(world, entity);
  const text = rangedPolicy(world)?.localAvoidance?.restoredText;
  if (text)
    emit(world, events, 'local-pose-ended', subjectNarration(entity, text), entity, entity.id);
  return true;
}

/** Saved posture is authoritative; these disposable reverse dependencies only
 * wake obstructed expansions. A blocker leaving the neighborhood must wake the
 * posture just as entering it does; retaining its old membership is essential. */
export function settleLocalPoses(
  world: WorldState,
  bodyIds: readonly string[],
  events: WorldEvent[],
): boolean {
  const state = preparation(world, bodyIds),
    changes = takeNativeChanges(world, state, true);
  // Keep the change cursor current, but ordinary movement needs no posture
  // neighborhood work when there is no retained shape waiting to return.
  if (!state.ids.size) return false;
  const geometry = spatialMap(world).spatial.revision,
    geometryChanged = geometry !== state.geometry;
  state.geometry = geometry;
  const candidates = new Set<string>();
  if (!changes || geometryChanged) for (const id of state.ids) candidates.add(id);
  else {
    for (const [id, restoreAt] of state.holding) if (restoreAt <= world.simTime) candidates.add(id);
    for (const id of changes) {
      if (state.ids.has(id)) candidates.add(id);
      for (const dependent of state.dependents.get(id) ?? []) candidates.add(dependent);
      const body = entityGet(world.entities, id);
      if (!body || !activelyParticipates(body)) continue;
      const shape = bodyProfile(body);
      for (const nearby of nearbyBodyEntities(
        world,
        worldPosition(body),
        shape.height + shape.radius,
      ))
        if (state.ids.has(nearby.id)) candidates.add(nearby.id);
    }
  }
  let changed = false;
  countDomainWork('localPoseReturnCandidates', candidates.size);
  for (const id of candidates) {
    const entity = entityGet(world.entities, id),
      pose = entity?.spatial.localPose;
    if (!entity || !pose) {
      forgetPose(state, id);
      continue;
    }
    if (
      !entity.actor?.alive ||
      !activelyParticipates(entity) ||
      pose.physicalLife !== (entity.actor.physicalLife ?? 0)
    ) {
      delete entity.spatial.localPose;
      forgetPose(state, id);
      spatialShapeChanged(world, entity);
      changed = true;
      continue;
    }
    if (pose.restoreAt > world.simTime) continue;
    state.holding.delete(id);
    if (restoreLocalPose(world, entity, events)) {
      changed = true;
      continue;
    }
    pose.phase = 'restore-blocked';
    retainBlockers(world, state, entity);
  }
  return changed;
}

/** Incompatible work cannot erase a held or obstructed physical posture. */
export function localPoseBlocksWork(world: WorldState, entity: Entity): boolean {
  const pose = entity.spatial.localPose;
  return (
    !!pose && (pose.restoreAt > world.simTime || !clearPose(world, entity, bodyProfile(entity)))
  );
}
