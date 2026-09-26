import { releaseWork } from './work-budget.js';
import { recordSemanticChange } from './dependencies.js';
import { canStand, finitePoint } from '@open-legend/spatial';
import { draftWorld } from './draft.js';
import { finish, emit, outcome } from './events.js';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { releaseInvocationResources } from './resource-claims.js';
import { cancelPlan } from './agency.js';
import { leaveConversation } from './conversations.js';
import { isSafeRecordId } from './records.js';
import type { Transition, WorldEvent, WorldState } from './types.js';
export { activelyParticipates, type ParticipationState } from './participation-state.js';

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
    operation.type === 'return' && previous?.phase === 'inactive'
      ? candidates.find((point) => point && canStand(spatialMap(input), point, bodyProfile(source)))
      : undefined;
  if (operation.type === 'return' && previous?.phase === 'inactive' && !anchor)
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
  } else if (operation.type === 'depart') {
    if (actor.action) releaseInvocationResources(world, actor.action.id);
    cancelPlan(world, actor);
    actor.action = null;
    actor.planGeneration++;
    // Occupation cannot veto departure. Applied work/costs remain; nothing is inverted.
    for (const definition of world.statusEffectPolicy.definitions)
      if (definition.occupiesAction) {
        const effect = entity.statusEffects?.[definition.id];
        if (effect?.active) {
          releaseWork(world, effect.episode);
          effect.active = false;
          if (effect.contribution) effect.contribution.revision++;
        }
      }
    const support = supportedPosition(entity);
    if (support && canStand(spatialMap(world), support, bodyProfile(entity)))
      state.returnAnchor = support;
    emit(world, events, 'departed', `${entity.name} left the clearing.`, entity, undefined, {
      significant: true,
    });
    state.phase = 'inactive';
  } else {
    if (anchor) {
      setSpatialPosition(world, entity, anchor, anchor.surfaceId);
      delete entity.spatial.fallVelocity;
      delete entity.spatial.flight;
    }
    state.phase = 'active';
    delete state.exitAttemptId;
    if (previous?.phase === 'inactive')
      emit(
        world,
        events,
        'returned',
        `${entity.name} returned to the clearing.`,
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
  const anchor = world.participationPolicy?.safeReturnAnchor;
  const validAnchor = (value: unknown): boolean =>
    finitePoint(value) && 'surfaceId' in value && isSafeRecordId(value.surfaceId);
  if (anchor && !validAnchor(anchor)) throw new Error('Invalid authored safe-return anchor.');
  for (const entity of Object.values(world.entities)) {
    const state = entity.actor?.participation;
    if (!state) continue;
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
