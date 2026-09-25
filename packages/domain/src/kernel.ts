import { actionTargetsCurrent } from './action-targets.js';
import { observerDescription } from './worlds/base/knowledge.js';
import { BASE_ACTION_DEFAULTS } from './worlds/base/actions.js';
import {
} from './item-handling.js';
import { strikeDefinition } from './strikes.js';
import { gatheringYield } from './gathering.js';
import { createPerceptionFrame } from './perception-frame.js';
import { confirmActionRevision } from './agency.js';
import { current, isDraft } from 'immer';
import { canWalkSegment, finitePoint, interpolate, type SurfacePoint } from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { FOLLOW_RULES, updateFollowPath } from './follow.js';
import { advanceFlight, LandingOccupancy } from './flight.js';
import {
  withdrawAttempt,
  commitBodyEffects,
} from './living.js';
import { draftWorld, cloneValue } from './draft.js';
import { experiences, sealNativeEvidence } from './experience.js';
import {
  advanceStatusEffects,
  activateStatusEffect,
  hearsEntity,
  seesEntity,
  visionRadius,
  sensesFor,
  contactViews,
  directProbe,
import {
  distance,
  findPath,
  hasLineOfEffect,
  canReachEntity,
  findApproachPath,
  const scopedTargetId =
    command.type === 'cook'
      ? command.heatId
      : ['gather', 'harvest', 'hunt', 'replenish', 'strike', 'pickup', 'follow'].includes(
            command.type,
          ) && 'targetId' in command
        ? command.targetId
        : undefined;
  if (scopedTargetId) {
      const reason = dropItems(world, actor, command.itemId, command.quantity, events);
      if (reason) return reject('cannot-drop', reason);
      result = outcome(true, 'dropped', 'Items dropped on the ground.');
      break;
    }
    case 'follow': {
      const desiredDistance = command.distance ?? FOLLOW_RULES.defaultDistance;
      if (
        command.targetId === actor.id ||
        !Number.isFinite(desiredDistance) ||
        desiredDistance < FOLLOW_RULES.minimumDistance ||
        desiredDistance > FOLLOW_RULES.maximumDistance
      )
        return reject(
          'invalid-follow',
          'Choose another perceived actor and a following distance between 1.5 and 12 world units.',
        );
      action = createAction(world, 'follow', 0);
      action.targetId = command.targetId;
      action.follow = { distance: desiredDistance, nextRepathAt: 0 };
      const error = updateFollowPath(world, actor, action);
      if (error) return reject('follow-unavailable', error);
      break;
    }
    case 'move': {
      );
      break;
    }
    case 'confirm-attempt': {
      const alternative = component.agency.attempts.find(
        (attempt) => attempt.id === command.attemptId,
      )?.alternative;
      const first = alternative?.commands[0];
      if (first && alternative?.mode === 'replace') {
        // Disposable native admission, just like menu preview: no effects or RNG are published.
        const preview = executeCommand(original, {
          ...first,
          actorId: actor.id,
          id: `${command.id}:preview`,
        });
        if (!preview.outcome.ok) return reject(preview.outcome.code, preview.outcome.message);
      }
      result = confirmActionRevision(world, actor.id, command.attemptId, command.id);
      break;
    }
    case 'withdraw-attempt': {
      result = withdrawAttempt(component, command.attemptId);
      break;
      const error = approach(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    if (action.stage === 'working' && action.type !== 'follow') {
      const error = startWork(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    failAction(world, actor, events, 'the strike definition is unavailable or changed.');
    return;
  }
  if (action.type === 'follow') {
    if (
      capabilityBlocked(world, actor, 'actions') ||
      capabilityBlocked(world, actor, 'locomotion')
    ) {
      failAction(world, actor, events, 'following is no longer available to this body.');
      return;
    }
    const error = updateFollowPath(world, actor, action);
    if (error) {
      failAction(world, actor, events, error);
      return;
    }
    if (
      action.stage === 'approaching' &&
      !moveAlongPath(
        world,
        actor,
        action.path,
        SIMULATION_RULES.movementTilesPerSecond *
          seconds *
          (1 - (actor.actor?.body?.conditions.injury ?? 0) / 200),
      )
    )
      failAction(world, actor, events, 'the following route became physically blocked.');
    return; // Holding is still an active activity, never a completed arrival.
  }
  if (action.stage === 'approaching') {
    const destination = targetPosition(world, action);
    if (!destination) {

/** Advance bounded one-second native steps. Paused time and absent-player catch-up are never inferred. */
export function advanceWorld(original: WorldState, elapsedSimSeconds: number): Transition {
  const work = advanceWorldWork(original, elapsedSimSeconds);
  let result = work.next();
  while (!result.done) result = work.next();
  return result.value;
}

/** Cooperative checkpoints expose no candidate state. Draining synchronously and yielding
 * between checkpoints have identical native ordering and simulation time. The application
 * must hold exclusive mutation ownership until completion or discard the whole candidate.
 * docs/architecture.md#cooperative-native-burst-handling
 */
export function* advanceWorldWork(
  original: WorldState,
  elapsedSimSeconds: number,
): Generator<void, Transition, void> {
  if (
    !Number.isFinite(elapsedSimSeconds) ||
    elapsedSimSeconds < 0 ||
    remaining -= seconds;
    world.simTime += seconds;
    // Status operations also apply to non-actor entities, in saved entity/definition order.
    for (const [index, entity] of Object.values(world.entities).entries()) {
      advanceStatusEffects(world, entity, seconds, events);
      // Retain saved definition/entity order while letting I/O run during large status phases.
      if ((index + 1) % 32 === 0) yield;
    }
    // Stable actor order resolves finite-resource claims; no asynchronous writer mutates a step.
    for (const actorId of participants.actors) {
      let actor = world.entities[actorId]!;
        const stepId = step.id;
        const command = resolvePlanCommand(component.agency.plan!, step);
        const transition = command
          ? actionTargetsCurrent(world, actorId, [command], step.targetEpisodes)
            ? executeCommand(world, command)
            : {
                world,
                events: [],
                outcome: outcome(
                  false,
                  'stale-encounter',
                  'The queued target encounter changed. Revise the plan.',
                ),
              }
          : {
              world,
              events: [],
      if (
        !capabilityBlocked(world, actor, 'locomotion') ||
        component.action?.type === 'status-effect' ||
        component.action?.type === 'pickup' ||
        component.action?.type === 'follow'
      )
        advanceAction(world, actor, seconds, events);
      yield;
    }
    // Only landing needs this index; rebuild once at that phase, then track subsequent moves.
    let occupancy: LandingOccupancy | undefined;
          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);
        }
      }
      yield;
    }
  }
  const perception = yield* updateEncounters(world, original, events, participants.actors);
  yield* sealNativeEvidence(world, events);
  yield;
  const result = finish(
    world,
    events,
    outcome(true, 'advanced', `Advanced ${elapsedSimSeconds} simulation seconds.`),
  );
  perception?.retain(result.world);
  return result;
}

/** Positions stay fixed during this phase; never reuse a frame across intervening motion. */
function* updateEncounters(
  world: WorldState,
  original: WorldState,
  events: WorldEvent[],
  actorIds: readonly string[],
): Generator<void, ReturnType<typeof createPerceptionFrame> | undefined, void> {
  if (!actorIds.some((id) => world.entities[id]?.actor?.alive && hasMemory(world.entities[id])))
    return;
  const frame = createPerceptionFrame(world, original);
  const entities = frame.sources;
  const encounter = encounterEmitter(world, events);
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  for (const actor of entities.filter((source) => source.alive && source.memory)) {
    const observer = world.entities[actor.id]!;
    const radius = actor.radius;
    const clearSight = () => {
      if (world.visiblePeople?.[actor.id]?.length) world.visiblePeople[actor.id] = [];
      if (world.visibleObjects?.[actor.id]?.length) world.visibleObjects[actor.id] = [];
      // Perception loss ends continuous recognition too; an old episode is not a live identity grant.
      if (Object.keys(world.perceptionEpisodes?.[actor.id] ?? {}).length)
        world.perceptionEpisodes![actor.id] = {};
    };
    // Sleeping does not manufacture conscious acquisitions. Waking reacquires actual evidence.
    if (actor.sleeping) {
      clearSight();
      continue;
    }
    const touch = sensesFor(world, observer).find(
      (s) => s.implementation === 'contact-proximity-v1',
    );
    if (touch) {
      nearbyAll ??= spatialCandidates(entities);
      const prior = observer.actor!.contacts ?? {};
      const contacts: NonNullable<ActorComponent['contacts']> = {};
      // Source IDs stay in private state; acquisition is owner-scoped, never a public encounter.
      // docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling owns intake.
          (e) =>
            e.id !== actor.id &&
            distance(actor.position, e.position) <= touch.radius &&
            hasLineOfEffect(world, observer, world.entities[e.id]!),
        )
        .slice(0, 32)) {
        const oldPosition = original.entities[source.id]?.position;
            detail === 'moving'
              ? 'I feel an unidentified moving contact.'
              : 'I feel an unidentified contact.',
            observer,
            undefined,
            {
              contactId: contacts[source.id]!.id,
            events,
            'contact',
            'A contact is no longer present.',
            observer,
            undefined,
            {
              contactId: episode.id,
        Object.keys(contacts).length !== Object.keys(prior).length ||
        Object.entries(contacts).some(([id, c]) => c !== prior[id])
      )
        observer.actor!.contacts = contacts;
    }
    if (radius === 0) {
      clearSight();
      continue;
    }
    const visible = yield* frame.query(actor);
    const seen = visible.people;
    // Stable exposure is current knowledge, not a fresh acquisition. Skip all per-object
    // set construction and episode rebuilding when neither membership nor detail changed.
    if (
      original.perceptionEpisodes?.[actor.id] &&
      seen === original.visiblePeople?.[actor.id] &&
      visible.objects === original.visibleObjects?.[actor.id] &&
      frame.changedFeatures.size === 0
    ) {
      encounter.flush();
      yield;
      continue;
    }
    const objectIds = visible.objects;
    // Persistent exposure episodes do not imply identity recognition across a disappearance.
    // docs/knowledge.md#subject-binding
    const priorEpisodes = original.perceptionEpisodes?.[actor.id] ?? {};
      (world.perceptionEpisodes ??= {})[actor.id] = Object.fromEntries(
        exposed.map((id) => [id, priorEpisodes[id] ?? `${world.sequence}:${world.simTime}:${id}`]),
      );
    const previous = original.visiblePeople?.[actor.id] ?? [];
    const previouslySeen = new Set(previous);
    const acquired = seen.filter((id) => !previouslySeen.has(id));
    const recent = new Set(
      acquired.length
        ? (world.memories[actor.id] ?? [])
            .filter(
              (m) =>
                m.kind === 'episode' &&
                (m.summary.startsWith('I saw ') || m.eventType === 'encounter') &&
                world.simTime - m.at < 3600,
            )
            .flatMap((m) => m.entityIds)
        : [],
    );
    for (const [index, id] of acquired.entries()) {
      if (!recent.has(id)) encounter(observer, id, true);
      if ((index + 1) % 64 === 0) yield;
    }
    for (const id of seen)
      if (previouslySeen.has(id) && frame.changedFeatures.has(id))
        encounter(observer, id, true, frame.source(id)!.detail);
    if (
      !original.visiblePeople?.[actor.id] ||
      seen.length !== previous.length ||
      seen.some((id, i) => id !== previous[i])
    )
      (world.visiblePeople ??= {})[actor.id] = seen;
    const previousObjects = original.visibleObjects?.[actor.id] ?? [];
    const priorObjects = new Set(previousObjects);
    for (const [index, id] of objectIds.entries()) {
      if (index && index % 64 === 0) yield;
      if (!priorObjects.has(id)) encounter(observer, id, false);
      else if (frame.changedFeatures.has(id))
        encounter(observer, id, false, frame.source(id)!.detail);
    }
    if (
      !original.visibleObjects?.[actor.id] ||
      objectIds.length !== previousObjects.length ||
      objectIds.some((id, i) => id !== previousObjects[i])
    )
      (world.visibleObjects ??= {})[actor.id] = objectIds;
    encounter.flush();
    yield;
  }
  frame.finish();
  return frame;
}

/** Private records are returned only for the supplied actor; bind this ID to authorization in the application. */
      delete copy.spatial.flight;
      delete copy.statusEffects;
      delete copy.attributes;
      if (copy.actor?.action) {
        delete copy.actor.action.destination;
        delete copy.actor.action.follow;
      }
      if (copy.actor) {
        // Sparse state is owner-private; explicit permitted projections carry public values.
        delete copy.actor.attributes;
