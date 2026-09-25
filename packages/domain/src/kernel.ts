import { observerDescription } from './worlds/base/knowledge.js';
import { BASE_ACTION_DEFAULTS } from './worlds/base/actions.js';
import {
} from './item-handling.js';
import { strikeDefinition } from './strikes.js';
import { gatheringYield } from './gathering.js';
import { current, isDraft } from 'immer';
import { canWalkSegment, finitePoint, interpolate, type SurfacePoint } from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { advanceFlight, LandingOccupancy } from './flight.js';
import {
  withdrawAttempt,
  commitBodyEffects,
} from './living.js';
import { draftWorld, cloneValue } from './draft.js';
import { experiences } from './experience.js';
import {
  advanceStatusEffects,
  activateStatusEffect,
  hearsEntity,
  seesEntity,
  visionRadius,
  visionQuery,
  sensesFor,
  contactViews,
  directProbe,
import {
  distance,
  findPath,
  hasLineOfSight,
  hasLineOfEffect,
  canReachEntity,
  findApproachPath,
  const scopedTargetId =
    command.type === 'cook'
      ? command.heatId
      : ['gather', 'harvest', 'hunt', 'replenish', 'strike', 'pickup'].includes(command.type) &&
          'targetId' in command
        ? command.targetId
        : undefined;
  if (scopedTargetId) {
      const reason = dropItems(world, actor, command.itemId, command.quantity, events);
      if (reason) return reject('cannot-drop', reason);
      result = outcome(true, 'dropped', 'Items dropped on the ground.');
      break;
    }
    case 'move': {
      );
      break;
    }
    case 'withdraw-attempt': {
      result = withdrawAttempt(component, command.attemptId);
      break;
      const error = approach(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    if (action.stage === 'working') {
      const error = startWork(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    failAction(world, actor, events, 'the strike definition is unavailable or changed.');
    return;
  }
  if (action.stage === 'approaching') {
    const destination = targetPosition(world, action);
    if (!destination) {

/** Advance bounded one-second native steps. Paused time and absent-player catch-up are never inferred. */
export function advanceWorld(original: WorldState, elapsedSimSeconds: number): Transition {
  if (
    !Number.isFinite(elapsedSimSeconds) ||
    elapsedSimSeconds < 0 ||
    remaining -= seconds;
    world.simTime += seconds;
    // Status operations also apply to non-actor entities, in saved entity/definition order.
    for (const entity of Object.values(world.entities))
      advanceStatusEffects(world, entity, seconds, events);
    // Stable actor order resolves finite-resource claims; no asynchronous writer mutates a step.
    for (const actorId of participants.actors) {
      let actor = world.entities[actorId]!;
        const stepId = step.id;
        const command = resolvePlanCommand(component.agency.plan!, step);
        const transition = command
          ? executeCommand(world, command)
          : {
              world,
              events: [],
      if (
        !capabilityBlocked(world, actor, 'locomotion') ||
        component.action?.type === 'status-effect' ||
        component.action?.type === 'pickup'
      )
        advanceAction(world, actor, seconds, events);
    }
    // Only landing needs this index; rebuild once at that phase, then track subsequent moves.
    let occupancy: LandingOccupancy | undefined;
          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);
        }
      }
    }
  }
  updateEncounters(world, original, events, participants.actors);
  return finish(
    world,
    events,
    outcome(true, 'advanced', `Advanced ${elapsedSimSeconds} simulation seconds.`),
  );
}

/** Positions stay fixed during this phase; preserve event-time audiences and actor order. */
function updateEncounters(
  world: WorldState,
  original: WorldState,
  events: WorldEvent[],
  actorIds: readonly string[],
): void {
  if (!actorIds.some((id) => world.entities[id]?.actor?.alive && hasMemory(world.entities[id])))
    return;
  const hadObjectExposures = original.visibleObjects !== undefined;
  const encounter = encounterEmitter(world, events);

  // Read-only perception captures transforms once after movement, avoiding repeated proxy walks.
  // Snapshot identity, transforms and body height; event mutations still use the authoritative draft.
  const entities = Object.values(world.entities).map((entity) => ({
    entity,
    id: entity.id,
    position: isDraft(entity.position) ? current(entity.position) : entity.position,
    height: bodyProfile(entity).height,
    alive: !!entity.actor?.alive,
    memory: hasMemory(entity),
    object: !entity.actor && !entity.animal,
  }));
  const nearby = spatialCandidates(entities.filter((e) => e.alive));
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  const nearbyObjects = spatialCandidates(entities.filter((e) => e.object));
  for (const actor of entities.filter((e) => e.alive && e.memory)) {
    const radius = visionRadius(world, actor.entity);
    const sees = visionQuery(world, actor.entity);
    const touch = sensesFor(world, actor.entity).find(
      (s) => s.implementation === 'contact-proximity-v1',
    );
    if (touch) {
      nearbyAll ??= spatialCandidates(entities);
      const prior = actor.entity.actor!.contacts ?? {};
      const contacts: NonNullable<ActorComponent['contacts']> = {};
      // Source IDs stay in private state; acquisition is owner-scoped, never a public encounter.
      // docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling owns intake.
          (e) =>
            e.id !== actor.id &&
            distance(actor.position, e.position) <= touch.radius &&
            hasLineOfEffect(world, actor.entity, e.entity),
        )
        .slice(0, 32)) {
        const oldPosition = original.entities[source.id]?.position;
            detail === 'moving'
              ? 'I feel an unidentified moving contact.'
              : 'I feel an unidentified contact.',
            actor.entity,
            undefined,
            {
              contactId: contacts[source.id]!.id,
            events,
            'contact',
            'A contact is no longer present.',
            actor.entity,
            undefined,
            {
              contactId: episode.id,
        Object.keys(contacts).length !== Object.keys(prior).length ||
        Object.entries(contacts).some(([id, c]) => c !== prior[id])
      )
        actor.entity.actor!.contacts = contacts;
    }
    if (radius === 0) {
      if (
        world.perceptionEpisodes?.[actor.id] &&
        Object.keys(world.perceptionEpisodes[actor.id]!).length
      )
        world.perceptionEpisodes[actor.id] = {};
      continue;
    }
    const previous = original.visiblePeople?.[actor.id] ?? [];
    const previouslySeen = new Set(previous);
    const seen = nearby(actor.position, radius + 2)
      .filter((e) => e.id !== actor.id && e.alive && sees(e))
      .map((e) => e.id);
    const objects = nearbyObjects(actor.position, radius).filter((entity) => sees(entity));
    const objectIds = objects.map((entity) => entity.id);
    // Persistent exposure episodes do not imply identity recognition across a disappearance.
    // docs/knowledge.md#subject-binding
    const priorEpisodes = original.perceptionEpisodes?.[actor.id] ?? {};
      (world.perceptionEpisodes ??= {})[actor.id] = Object.fromEntries(
        exposed.map((id) => [id, priorEpisodes[id] ?? `${world.sequence}:${world.simTime}:${id}`]),
      );
    for (const id of seen.filter((id) => !previouslySeen.has(id))) {
      const recent = (world.memories[actor.id] ?? []).some(
        (m) =>
          m.kind === 'episode' &&
          m.entityIds.includes(id) &&
          (m.summary.startsWith('I saw ') || m.eventType === 'encounter') &&
          world.simTime - m.at < 3600,
      );
      if (!recent) encounter(actor.entity, id, true);
    }
    if (
      !original.visiblePeople?.[actor.id] ||
      seen.length !== previous.length ||
      seen.some((id, index) => id !== previous[index])
    )
      (world.visiblePeople ??= {})[actor.id] = seen;
    // Object exposures use the same committed awareness path without a cognition trigger.
    const priorObjects = new Set(
      original.visibleObjects?.[actor.id] ??
        (hadObjectExposures ? [] : objects.map((entity) => entity.id)),
    );
    for (const entity of objects)
      if (!priorObjects.has(entity.id)) encounter(actor.entity, entity.id, false);
    const previousObjects = original.visibleObjects?.[actor.id];
    // Retain identity when membership is unchanged (docs/performance.md#simulation-cpu-and-growing-history).
    if (
      !previousObjects ||
      objectIds.length !== previousObjects.length ||
      objectIds.some((id, index) => id !== previousObjects[index])
    )
      (world.visibleObjects ??= {})[actor.id] = objectIds;
  }
}

/** Private records are returned only for the supplied actor; bind this ID to authorization in the application. */
      delete copy.spatial.flight;
      delete copy.statusEffects;
      delete copy.attributes;
      if (copy.actor?.action) delete copy.actor.action.destination;
      if (copy.actor) {
        // Sparse state is owner-private; explicit permitted projections carry public values.
        delete copy.actor.attributes;
