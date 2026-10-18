import { isDraft } from 'immer';
import { readOnlyDraftView } from './draft.js';
import { countDomainWork } from './diagnostic-counters.js';
import { capabilityBlocked } from './status-capabilities.js';
import { TIME_EPSILON } from './simulation-time.js';
import type { AnimalComponent, Entity, WorldState, WorldEvent } from './types.js';
import { entityGet } from './entity-collection.js';
import { bodyProfile, spatialMap, supportedPosition, worldPosition } from './spatial-state.js';
import { distance3D, walkSurfaceLine } from '@open-legend/spatial';
import { nativeResponseProfile } from './native-response.js';
import {
  nativeRegionDangerKey,
  nativeDangerExpiresAt,
  nativeDangerSeparation,
  reconcileNativeDangers,
} from './native-response-danger.js';
import {
  nativeRefugeCandidates,
  nativeRefugeChoices,
  type NativeRefugeRoute,
} from './native-response-refuge.js';
import {
  nativeRefugeBatch,
  preparedNativeRefugeRoutes,
  type NativeRefugePreparations,
} from './native-response-navigation.js';
import { attackPreparation } from './combat-encounters.js';
import { seesEntity } from './perception.js';
import { recordSemanticChange } from './dependencies.js';
import { canonicalJson, contentLabel, emit } from './events.js';
import { subjectNarration } from './narration.js';
import { interruptStatusEffects } from './status-effects.js';
import { readEntityAttribute } from './status-effects.js';
import { nextRandom } from './data.js';
import { activelyParticipates } from './participation-state.js';

function changed(world: WorldState, animal: Entity): void {
  recordAnimalClockWrite(world, animal.id);
  recordSemanticChange(world, { kind: 'state', entityId: animal.id, field: 'behavior' });
}

/** Receives the exact committed occurrence, with independently checked sight or
 * actual bodily contact. It never asks hidden source state for a location. */
export function acquireNativeResponseEvent(
  world: WorldState,
  event: Readonly<WorldEvent>,
  events: WorldEvent[],
): void {
  if (
    !['struck', 'projectile-contact', 'shot-released', 'attack-cue', 'action-started'].includes(
      event.type,
    )
  )
    return;
  const animal = event.targetId ? entityGet(world.entities, event.targetId) : undefined;
  if (
    !animal?.animal ||
    !animal.actor?.alive ||
    !activelyParticipates(animal) ||
    (animal.threat && !animal.threat.relinquished)
  )
    return;
  if (event.scope === 'private' && !event.audience.includes(animal.id)) return;
  const source = event.actorId ? entityGet(world.entities, event.actorId) : undefined;
  const felt =
    event.type === 'projectile-contact' ||
    (event.type === 'struck' && event.data?.['contactInjury'] === true);
  const preparation = event.type === 'action-started' || event.type === 'attack-cue';
  if (
    preparation &&
    (!source || !attackPreparation(world, source) || source.actor?.action?.targetId !== animal.id)
  )
    return;
  if (!felt && (!source || source.id === animal.id || !seesEntity(world, animal, source))) return;
  const state = animal.animal;
  const profile = nativeResponseProfile(world, state.episode?.profilePin ?? state.profile);
  if (!profile) return;
  const episode = (state.episode ??= {
    id: event.id,
    startedAt: event.at,
    latestCause: { id: event.id, at: event.at },
    profilePin: { ...state.profile },
    locomotion: state.locomotion,
    mode: 'escaping',
    dangers: {},
    reviewAt: world.simTime,
    proposalGeneration: 0,
  });
  // Multiple observer accounts of one occurrence do not renew its deadline.
  if (
    episode.latestCause.id === event.id &&
    episode.latestCause.at === event.at &&
    episode.proposalGeneration > 0
  )
    return;
  episode.latestCause = { id: event.id, at: event.at };
  episode.mode = 'escaping';
  episode.reviewAt = world.simTime;
  delete episode.clearSince;
  delete episode.proposal;
  delete episode.blocked;
  if (felt) {
    const projectileId = event.data?.['projectileId'];
    const origin =
      event.type === 'projectile-contact'
        ? (event.origin ?? worldPosition(animal))
        : worldPosition(animal);
    const regionSource =
      typeof projectileId === 'string'
        ? { kind: 'projectile' as const, id: projectileId }
        : { kind: 'event' as const, id: event.id };
    const x = event.data?.['incomingX'],
      y = event.data?.['incomingY'],
      z = event.data?.['incomingZ'];
    episode.dangers[nativeRegionDangerKey(regionSource)] = {
      kind: 'region',
      source: regionSource,
      point: { ...origin },
      observedAt: event.at,
      ...(typeof x === 'number' && typeof y === 'number' && typeof z === 'number'
        ? { incoming: { x, y, z } }
        : {}),
    };
  }
  const wake = profile.wake;
  const energy = wake && readEntityAttribute(world, animal, wake.attributeId);
  if (wake && !animal.actor.incapacitated && typeof energy === 'number' && energy > wake.above)
    interruptStatusEffects(world, animal, events, wake.reason);
  changed(world, animal);
}

export type NativeResponseDecision =
  | { status: 'none' | 'pending' }
  | { status: 'choices'; routes: NativeRefugeRoute[] }
  | { status: 'stop' };

/** Native decisions prepare intentions only. The kernel admits a chosen ordinary
 * movement and its saved random draw in one atomic transition. */
export function nativeResponseDecision(
  world: WorldState,
  animal: Entity,
  events: WorldEvent[],
  prepared?: NativeRefugePreparations,
): NativeResponseDecision {
  const state = animal.animal,
    actor = animal.actor;
  if (!state || !actor) return { status: 'none' };
  if (!actor.alive || state.physicalLife !== (actor.physicalLife ?? 0)) {
    delete state.episode;
    state.physicalLife = actor.physicalLife ?? 0;
    changed(world, animal);
    return { status: 'none' };
  }
  const episode = state.episode;
  if (!episode || (episode.reviewAt > world.simTime && !episode.proposal))
    return { status: 'none' };
  const profile = nativeResponseProfile(world, episode.profilePin);
  if (!profile) return { status: 'none' };
  if (
    actor.incapacitated ||
    !activelyParticipates(animal) ||
    capabilityBlocked(world, animal, 'locomotion') ||
    capabilityBlocked(world, animal, 'actions') ||
    animal.spatial.fallVelocity !== undefined ||
    animal.spatial.flight ||
    !supportedPosition(animal)
  ) {
    episode.mode = 'blocked';
    episode.reviewAt = world.simTime + profile.blockedReviewSeconds;
    episode.blocked = { reason: 'capability-unavailable', basis: 'physical-capability' };
    delete episode.clearSince;
    delete episode.proposal;
    changed(world, animal);
    return { status: 'none' };
  }
  const frame = reconcileNativeDangers(world, animal, episode);
  if (frame.status !== 'complete') {
    episode.mode = 'blocked';
    episode.reviewAt = world.simTime + profile.blockedReviewSeconds;
    episode.blocked = { reason: frame.reason, basis: 'perception' };
    delete episode.clearSince;
    delete episode.proposal;
    changed(world, animal);
    return { status: 'none' };
  }
  const action = actor.action;
  const owned =
    !!action &&
    action.id === episode.movement?.id &&
    action.nativeLocomotion?.episodeId === episode.id;
  if (episode.movement && !owned) delete episode.movement;
  const clear = frame.records.every(
    ({ danger }) =>
      nativeDangerSeparation(animal, worldPosition(animal), danger, profile, world.simTime) >=
      profile.avoidanceDistance + profile.clearanceMargin,
  );
  const nextReview = () =>
    Math.min(
      world.simTime +
        (episode.mode === 'blocked' ? profile.blockedReviewSeconds : profile.reviewSeconds),
      episode.clearSince === undefined ? Infinity : episode.clearSince + profile.settlingSeconds,
      ...frame.records.map(({ danger }) => nativeDangerExpiresAt(profile, danger)),
    );
  if (!owned && !action && clear) {
    if (episode.clearSince === undefined) {
      episode.clearSince = world.simTime;
      episode.mode = 'settling';
      emit(
        world,
        events,
        'animal-response',
        subjectNarration(animal, profile.presentation.settling),
        animal,
      );
    }
    delete episode.proposal;
    delete episode.blocked;
    if (world.simTime >= episode.clearSince + profile.settlingSeconds) {
      delete state.episode;
      emit(
        world,
        events,
        'animal-response',
        subjectNarration(animal, profile.presentation.routine),
        animal,
      );
      changed(world, animal);
      return { status: 'none' };
    }
    episode.reviewAt = nextReview();
    changed(world, animal);
    return { status: 'none' };
  }
  if (!clear) delete episode.clearSince;
  if (action && !owned) {
    episode.reviewAt = nextReview();
    changed(world, animal);
    return { status: 'none' };
  }
  if (episode.proposal && !nativeRefugeBatch(world, animal)) delete episode.proposal;
  if (!episode.proposal) {
    const retained =
      owned &&
      episode.refuge &&
      action?.destination &&
      distance3D(worldPosition(animal), episode.refuge.point) > 1e-6
        ? { id: 'retained', point: { ...episode.refuge.point }, retained: true as const }
        : undefined;
    const candidates = nativeRefugeCandidates(world, animal, frame, retained);
    const from = supportedPosition(animal)!;
    const body = bodyProfile(animal);
    episode.proposal = {
      generation: ++episode.proposalGeneration,
      geometryRevision: spatialMap(world).spatial.revision,
      at: world.simTime,
      origin: { ...from },
      movementId: action?.id ?? null,
      body: { radius: body.radius, height: body.height, maxSlope: body.maxSlope },
      candidates: candidates.candidates,
    };
  }
  const routes = preparedNativeRefugeRoutes(world, animal, frame, prepared);
  if (routes === undefined) {
    changed(world, animal);
    return { status: 'pending' };
  }
  if (routes === 'unavailable') {
    episode.mode = 'blocked';
    episode.blocked = {
      reason: 'navigation-unavailable',
      basis: contentLabel(
        canonicalJson([
          spatialMap(world).spatial.revision,
          episode.proposal?.origin,
          episode.proposal?.body,
          episode.proposal?.candidates,
          frame.records,
        ]),
      ),
    };
    delete episode.proposal;
    episode.reviewAt = world.simTime + profile.blockedReviewSeconds;
    changed(world, animal);
    return { status: 'none' };
  }
  const choices = nativeRefugeChoices(routes, profile);
  if (!choices.length) {
    const basis = contentLabel(
      canonicalJson([
        spatialMap(world).spatial.revision,
        episode.proposal?.candidates,
        frame.records,
      ]),
    );
    if (episode.blocked?.basis !== basis)
      emit(
        world,
        events,
        'animal-response',
        subjectNarration(animal, profile.presentation.blocked),
        animal,
      );
    episode.mode = 'blocked';
    episode.blocked = { reason: 'no-usable-route', basis };
    delete episode.proposal;
    episode.reviewAt = world.simTime + profile.blockedReviewSeconds;
    changed(world, animal);
    return { status: owned ? 'stop' : 'none' };
  }
  if (choices.length === 1 && choices[0]!.candidate.retained) {
    delete episode.proposal;
    episode.reviewAt = nextReview();
    changed(world, animal);
    return { status: 'none' };
  }
  return { status: 'choices', routes: choices };
}

export function nativeWanderRoute(
  world: WorldState,
  animal: Entity,
): NativeRefugeRoute | undefined {
  reconcileAnimalWander(world, animal);
  const state = animal.animal,
    from = supportedPosition(animal);
  if (
    !state ||
    !from ||
    !animal.actor?.alive ||
    animal.actor.incapacitated ||
    !activelyParticipates(animal) ||
    capabilityBlocked(world, animal, 'actions') ||
    state.episode ||
    animal.threat ||
    animal.actor?.action ||
    animal.spatial.flight ||
    animal.spatial.fallVelocity !== undefined ||
    capabilityBlocked(world, animal, 'locomotion') ||
    animalWanderRemaining(world, animal)! > TIME_EPSILON
  )
    return;
  const profile = nativeResponseProfile(world, state.profile);
  if (!profile) return;
  const angle = nextRandom(world) * Math.PI * 2;
  const path = walkSurfaceLine(
    spatialMap(world),
    from,
    from.x + Math.cos(angle) * profile.wander.distance,
    from.z + Math.sin(angle) * profile.wander.distance,
    bodyProfile(animal),
  );
  const wait =
    profile.wander.minimumWaitSeconds + Math.floor(nextRandom(world) * profile.wander.waitChoices);
  const clock = state.wander;
  state.wander =
    'dueAt' in clock
      ? { dueAt: clock.dueAt + wait }
      : {
          remainingSeconds: clock.remainingSeconds + wait,
          ...(clock.running ? { running: true as const } : {}),
        };
  recordAnimalClockWrite(world, animal.id);
  if (!path) return;
  const point = path.at(-1);
  if (!point) return;
  let previous = from,
    length = 0;
  for (const next of path) {
    length += distance3D(previous, next);
    previous = next;
  }
  return {
    candidate: { id: 'routine', point: { ...point } },
    path,
    length,
    worsening: 0,
    arrivalMargin: 0,
  };
}
const wanderClockWrites = new WeakMap<WorldState, { owner: object; ids: Set<string> }>();
/** Only the native caller owns every clock writer in a working draft. An unknown draft,
 * builder or another queue owner needs a full capture before this proof can be reused.
 * No publication or predecessor world is retained by this disposable notification set. */
export function takeAnimalWanderClockWrites(
  world: WorldState,
  owner: object,
  beginNative = false,
): ReadonlySet<string> | undefined {
  if (!isDraft(world)) return;
  const previous = wanderClockWrites.get(world);
  if (!previous || previous.owner !== owner) {
    const next = { owner, ids: new Set<string>() };
    wanderClockWrites.set(world, next);
    return beginNative && !previous ? next.ids : undefined;
  }
  const ids = previous.ids;
  if (ids.size) previous.ids = new Set();
  return ids;
}
export function recordAnimalClockWrite(world: WorldState, id: string): void {
  wanderClockWrites.get(world)?.ids.add(id);
}
/** A waiting animal's clock stops whenever ordinary wandering cannot run. The two modes
 * share one authority, rather than retaining a second writable countdown beside a deadline. */
export function animalWanderNeedsCountdown(world: WorldState): boolean {
  // Leave generous room below the shared time tolerance. At ancient clock values,
  // adding a short wait can round all the way back to now; serial subtraction avoids it.
  return Math.abs(world.simTime) * Number.EPSILON > TIME_EPSILON / 4;
}
export function animalWanderRemaining(world: WorldState, entity: Entity): number | undefined {
  const record = readOnlyDraftView(entity);
  const animal = record.animal && readOnlyDraftView(record.animal);
  const clock = animal?.wander && readOnlyDraftView(animal.wander);
  return clock && ('dueAt' in clock ? clock.dueAt - world.simTime : clock.remainingSeconds);
}
export function reconcileAnimalWander(world: WorldState, entity: Entity): void {
  const record = readOnlyDraftView(entity);
  const animal = record.animal && readOnlyDraftView(record.animal);
  if (!animal) return;
  countDomainWork('animalWanderEligibilityChecks');
  const actor = record.actor && readOnlyDraftView(record.actor);
  const spatial = readOnlyDraftView(record.spatial);
  const eligible =
    !record.threat &&
    !!actor?.alive &&
    !actor.incapacitated &&
    !actor.action &&
    !spatial.flight &&
    spatial.fallVelocity === undefined &&
    !animal.episode &&
    !capabilityBlocked(world, entity, 'locomotion');
  const clock = readOnlyDraftView(animal.wander);
  let next: AnimalComponent['wander'] | undefined;
  if (eligible) {
    if (animalWanderNeedsCountdown(world)) {
      if ('dueAt' in clock) next = { remainingSeconds: clock.dueAt - world.simTime, running: true };
      else if (!clock.running) next = { remainingSeconds: clock.remainingSeconds, running: true };
    } else if ('remainingSeconds' in clock)
      next = { dueAt: world.simTime + clock.remainingSeconds };
  } else if ('dueAt' in clock) next = { remainingSeconds: clock.dueAt - world.simTime };
  else if (clock.running) next = { remainingSeconds: clock.remainingSeconds };
  if (next) {
    entity.animal!.wander = next;
    recordAnimalClockWrite(world, entity.id);
  }
}
/** The native caller advances only running precision-fallback clocks for the interval
 * during which wandering was eligible. Landing and newly removed restrictions therefore
 * grant future time, exactly as with the ordinary paused/absolute modes. */
export function advanceAnimalWanderClock(entity: Entity, seconds: number): void {
  const animal = readOnlyDraftView(entity).animal;
  const stored = animal && readOnlyDraftView(animal).wander;
  const clock = stored && readOnlyDraftView(stored);
  // The queue keeps only running membership; due selection reads this value live.
  if (clock && 'remainingSeconds' in clock && clock.running)
    (entity.animal!.wander as { remainingSeconds: number }).remainingSeconds -= seconds;
}
