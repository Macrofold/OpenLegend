import { namePhrase } from '@open-legend/language';
import { releaseWork } from './work-budget.js';
import { recordSemanticChange } from './dependencies.js';
import { canStand, finitePoint } from '@open-legend/spatial';
import { draftWorld } from './draft.js';
import { finish, emit, outcome } from './events.js';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { releaseInvocationResources } from './resource-claims.js';
import { cancelPlan, discardSuspended } from './agency.js';
import { leaveConversation } from './conversations.js';
import { isSafeRecordId } from './records.js';
import { TIME_EPSILON } from './simulation-time.js';
import type { Transition, WorldEvent, WorldState } from './types.js';
import type { Entity } from './types.js';
export { activelyParticipates, type ParticipationState } from './participation-state.js';

function interruptDepartureWork(world: WorldState, entity: Entity): void {
  const actor = entity.actor!;
  if (actor.action) releaseInvocationResources(world, actor.action.id);
  cancelPlan(world, actor, entity.id);
  discardSuspended(world, actor, entity.id);
  actor.action = null;
  actor.planGeneration++;
  for (const definition of world.statusEffectPolicy.definitions)
    if (definition.occupiesAction) {
      const effect = entity.statusEffects?.[definition.id];
      if (effect?.active) {
        releaseWork(world, effect.episode);
        effect.active = false;
        if (effect.contribution) effect.contribution.revision++;
      }
    }
}
function departActor(world: WorldState, entity: Entity, events: WorldEvent[]): void {
  leaveConversation(world, entity.id, 'disconnect');
  interruptDepartureWork(world, entity);
  const state = entity.actor!.participation!;
  const support = supportedPosition(entity);
  if (support && canStand(spatialMap(world), support, bodyProfile(entity)))
    state.returnAnchor = support;
  state.phase = 'inactive';
  if (world.exitExposures) delete world.exitExposures[entity.id];
  emit(
    world,
    events,
    'departed',
    `${namePhrase(entity, 'definite', { capitalize: true })} left the clearing.`,
    entity,
    undefined,
    { significant: true },
  );
}
/** This boundary precedes effects at the same simulation instant. An absent character
 * remains fully damageable until here, even if the server's wall-clock timer has expired. */
export function finishSimulatedExits(world: WorldState, events: WorldEvent[]): boolean {
  let changed = false;
  for (const [id, deadline] of Object.entries(world.exitExposures ?? {})) {
    // Action remainders and absolute deadlines can differ by floating-point residue.
    // Use the executor's existing time resolution so a tied hit cannot beat protection.
    if (deadline - world.simTime > TIME_EPSILON) continue;
    const entity = world.entities[id]!;
    const state = entity.actor!.participation!;
    if (!Number.isSafeInteger(state.revision + 1))
      throw new Error('Participation revision exhausted.');
    state.revision++;
    departActor(world, entity, events);
    recordSemanticChange(world, { kind: 'state', entityId: id, field: 'participation' });
    changed = true;
  }
  return changed;
}

/** Operational deadlines are supplied as facts by the server, never read by the domain.
 * docs/projects/multiplayer-authority-tech-design.md#7-presence-exit-and-return
 */
export function changeParticipation(
  input: WorldState,
  actorId: string,
  expectedRevision: number,
  operation: { type: 'begin-exit' | 'depart'; attemptId: string } | { type: 'return' },
): Transition {
  const source = input.entities[actorId],
    previous = source?.actor?.participation;
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'participation-unavailable', message),
  });
  if (
    !source?.actor ||
    (previous?.revision ?? 0) !== expectedRevision ||
    !Number.isSafeInteger(expectedRevision + 1)
  )
    return reject('Participation changed. Refresh before continuing.');
  if (operation.type !== 'return' && !isSafeRecordId(operation.attemptId))
    return reject('Invalid exit attempt.');
  if (
    operation.type === 'depart' &&
    (previous?.phase !== 'exiting' || previous.exitAttemptId !== operation.attemptId)
  )
    return reject('This exit attempt is no longer current.');
  if (
    operation.type === 'begin-exit' &&
    previous?.phase !== undefined &&
    previous.phase !== 'active'
  )
    return previous.exitAttemptId === operation.attemptId
      ? {
          world: input,
          events: [],
          outcome: outcome(true, 'unchanged', 'Exit is already pending.'),
        }
      : reject('Participation changed.');
  if (operation.type === 'return' && (!previous || previous.phase === 'active'))
    return {
      world: input,
      events: [],
      outcome: outcome(true, 'unchanged', 'Already participating.'),
    };
  const candidates = [
    previous?.returnAnchor ?? supportedPosition(source),
    input.participationPolicy?.safeReturnAnchor,
  ];
  const anchor =
    operation.type === 'return' && previous?.phase === 'inactive' && !source.actor.pendingDeath
      ? candidates.find((point) => point && canStand(spatialMap(input), point, bodyProfile(source)))
      : undefined;
  if (
    operation.type === 'return' &&
    previous?.phase === 'inactive' &&
    !source.actor.pendingDeath &&
    !anchor
  )
    return reject(
      'The saved location and configured return location are unavailable. A safe return location must be restored.',
    );
  const world = draftWorld(input);
  if (operation.type === 'depart') leaveConversation(world, actorId, 'disconnect');
  const entity = world.entities[actorId]!,
    actor = entity.actor!,
    events: WorldEvent[] = [];
  const state = (actor.participation ??= { phase: 'active', revision: 0 });
  state.revision++;
  recordSemanticChange(world, { kind: 'state', entityId: actorId, field: 'participation' });
  if (operation.type === 'begin-exit') {
    state.phase = 'exiting';
    state.exitAttemptId = operation.attemptId;
    const exposure = world.participationPolicy?.exitExposureSeconds;
    if (exposure !== undefined) {
      (world.exitExposures ??= {})[actorId] = world.simTime + exposure;
      interruptDepartureWork(world, entity);
    }
  } else if (operation.type === 'depart') {
    departActor(world, entity, events);
  } else {
    if (anchor) {
      setSpatialPosition(world, entity, anchor, anchor.surfaceId);
      delete entity.spatial.fallVelocity;
      delete entity.spatial.flight;
    }
    state.phase = 'active';
    delete state.exitAttemptId;
    if (world.exitExposures) delete world.exitExposures[actorId];
    if (previous?.phase === 'inactive')
      emit(
        world,
        events,
        'returned',
        `${namePhrase(entity, 'definite', { capitalize: true })} returned to the clearing.`,
        entity,
        undefined,
        { significant: true },
      );
  }
  return finish(
    world,
    events,
    outcome(
      true,
      state.phase,
      state.phase === 'inactive'
        ? 'You have left the active world. Your belongings and history are retained.'
        : state.phase === 'exiting'
          ? 'Departure is pending.'
          : 'You have returned.',
    ),
  );
}

export function validateParticipation(world: WorldState): void {
  const exposure = world.participationPolicy?.exitExposureSeconds;
  if (exposure !== undefined && (!Number.isFinite(exposure) || exposure <= 0))
    throw new Error('Invalid simulated departure exposure.');
  for (const [id, deadline] of Object.entries(world.exitExposures ?? {}))
    if (
      exposure === undefined ||
      !Number.isFinite(deadline) ||
      deadline < 0 ||
      world.entities[id]?.actor?.participation?.phase !== 'exiting'
    )
      throw new Error('Invalid saved departure exposure.');
  const description = world.participationPolicy?.exitDescription;
  if (
    description !== undefined &&
    (typeof description !== 'string' || !description || description.length > 500)
  )
    throw new Error('Invalid departure description.');
  const anchor = world.participationPolicy?.safeReturnAnchor;
  const validAnchor = (value: unknown): boolean =>
    finitePoint(value) && 'surfaceId' in value && isSafeRecordId(value.surfaceId);
  if (anchor && !validAnchor(anchor)) throw new Error('Invalid authored safe-return anchor.');
  for (const entity of Object.values(world.entities)) {
    const state = entity.actor?.participation;
    if (!state) continue;
    if (
      exposure !== undefined &&
      state.phase === 'exiting' &&
      world.exitExposures?.[entity.id] === undefined
    )
      throw new Error('Missing saved departure exposure.');
    if (
      !['active', 'exiting', 'inactive'].includes(state.phase) ||
      !Number.isSafeInteger(state.revision) ||
      state.revision < 0 ||
      (state.phase !== 'active' && !isSafeRecordId(state.exitAttemptId)) ||
      (state.phase === 'active' && state.exitAttemptId !== undefined) ||
      (state.returnAnchor !== undefined && !validAnchor(state.returnAnchor)) ||
      (state.phase === 'inactive' && entity.actor?.action)
    )
      throw new Error('Invalid saved embodiment participation.');
  }
}
