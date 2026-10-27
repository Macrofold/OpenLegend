import { receivedEventObservation } from './perception-evidence.js';
import { navigationMembershipChanged } from './entity-index.js';
import { stopOwnedOffense, finishPlanAction } from './agency.js';
import { outcome } from './events.js';
import { isDraft } from 'immer';
import { readOnlyDraftView, cloneValue } from './draft.js';
import { countDomainWork } from './diagnostic-counters.js';
import { capabilityBlocked } from './status-capabilities.js';
import { TIME_EPSILON } from './simulation-time.js';
import type { AnimalComponent, Entity, WorldState, WorldEvent } from './types.js';
import { entityGet } from './entity-collection.js';
import { bodyProfile, spatialMap, supportedPosition, worldPosition } from './spatial-state.js';
import { distance3D, walkSurfaceLine, SPATIAL_LIMITS } from '@open-legend/spatial';
import {
  nativeResponseProfile,
  nativeAcousticPatternKey,
  nativeAcousticPreference,
  type NativeAcousticCue,
  type NativeRefugeProposal,
} from './native-response.js';
import type { Awareness } from './experience.js';
import { chargeWork } from './work-budget.js';
import { byteCount } from './mind.js';
import {
  nativeRegionDangerKey,
  nativeDangerExpiresAt,
  nativeDangerSeparation,
  nativeRouteDangerSeparation,
  reconcileNativeDangers,
  type NativeDangerFrame,
} from './native-response-danger.js';
import {
  nativeRefugeCandidate,
  nativeRefugePrefixRoute,
  nativeEscapeBearing,
  nativeRefugeChoices,
  scoreNativeRefugeRoute,
  type NativeRefugeRoute,
} from './native-response-refuge.js';
import {
  nativeRefugeBatch,
  nativeRefugePreparationReady,
  preparedNativeRefugeRoutes,
  type NativeRefugePreparations,
  type NativeRefugeBatch,
} from './native-response-navigation.js';
import { attackPreparation } from './combat-encounters.js';
import { seesEntity } from './perception.js';
import { recordSemanticChange, recordSensoryChange } from './dependencies.js';
import { canonicalJson, contentLabel, emit } from './events.js';
import { subjectNarration } from './narration.js';
import { interruptStatusEffects } from './status-effects.js';
import { readEntityAttribute } from './status-effects.js';
import { nextRandom } from './data.js';
import { activelyParticipates } from './participation-state.js';
import { releaseInvocationResources } from './resource-claims.js';
import type { SurfacePoint } from '@open-legend/spatial';
import { retireTerritorialControl, interruptTerritorialPursuit } from './territorial-threat.js';
import {
  prepareNativeFlightChoices,
  nativeFlightBasis,
  type NativeFlightPreparation,
} from './native-response-flight.js';
import {
  retireNativeFlight,
  finishNativeFlightResponse,
  holdNativeFlightPerch,
  recoverUnavailableNativeFlight,
  startNativeFlight,
  advanceFlight,
} from './flight.js';

function changed(world: WorldState, animal: Entity): void {
  recordAnimalClockWrite(world, animal.id);
  recordSensoryChange(world, animal.id, true);
  recordSemanticChange(world, { kind: 'state', entityId: animal.id, field: 'behavior' });
}

/** Control and body-life writers retire only this controller's uncommitted
 * movement. A released projectile or physical flight retains its own owner. */
export function reconcileNativeControl(world: WorldState, entity: Entity): void {
  retireTerritorialControl(world, entity);
  const state = entity.animal,
    actor = entity.actor;
  if (
    !state ||
    !actor ||
    (actor.controller === 'native' &&
      actor.alive &&
      state.physicalLife === (actor.physicalLife ?? 0))
  )
    return;
  const owned =
    actor.action?.nativeLocomotion ||
    (actor.action && state.foraging?.work?.actionId === actor.action.id);
  if (
    !state.episode &&
    !state.foraging?.proposal &&
    !state.foraging?.work &&
    !owned &&
    !entity.spatial.flight?.nativeLocomotion &&
    !Object.keys(state.acousticPatterns).length &&
    state.physicalLife === (actor.physicalLife ?? 0)
  )
    return;
  retireNativeFlight(world, entity);
  delete state.episode;
  if (state.foraging) {
    delete state.foraging.proposal;
    delete state.foraging.work;
    state.foraging.mode = 'resting';
    state.foraging.reviewAt = world.simTime;
  }
  state.acousticPatterns = {};
  if (world.perceptionEpisodes?.[entity.id]) delete world.perceptionEpisodes[entity.id];
  state.physicalLife = actor.physicalLife ?? 0;
  if (owned && actor.action) {
    releaseInvocationResources(world, actor.action.id);
    actor.action = null;
    actor.planGeneration++;
  }
  reconcileAnimalWander(world, entity);
  changed(world, entity);
}

/** Receives the exact committed occurrence, with independently checked sight or
 * actual bodily contact. It never asks hidden source state for a location. */
export function acquireNativeResponseEvent(
  world: WorldState,
  event: Readonly<WorldEvent>,
  events: WorldEvent[],
): void {
  if (
    ![
      'struck',
      'projectile-contact',
      'projectile-passage',
      'shot-released',
      'attack-cue',
      'action-started',
    ].includes(event.type)
  )
    return;
  const animal = event.targetId ? entityGet(world.entities, event.targetId) : undefined;
  if (
    !animal?.animal ||
    !animal.actor?.alive ||
    animal.actor.controller !== 'native' ||
    !activelyParticipates(animal) ||
    (animal.threat && !animal.threat.relinquished && !animal.animal.foraging)
  )
    return;
  if (event.scope === 'private' && !event.audience.includes(animal.id)) return;
  const observation = receivedEventObservation(world, animal.id, event.id);
  if (!observation) return;
  const permittedEvent = observation.facets.find((facet) => facet.value.kind === 'event')?.value;
  const sourcePermitted =
    permittedEvent?.kind === 'event' &&
    permittedEvent.references.some(
      (reference) => reference.role === 'actor' && reference.id === event.actorId,
    );
  const source =
    sourcePermitted && event.actorId ? entityGet(world.entities, event.actorId) : undefined;
  const felt = observation.modality === 'touch';
  const regional =
    felt || (event.type === 'projectile-passage' && observation.modality === 'sight');
  const preparation = event.type === 'action-started' || event.type === 'attack-cue';
  if (
    preparation &&
    (!source || !attackPreparation(world, source) || source.actor?.action?.targetId !== animal.id)
  )
    return;
  if (!regional && (!source || source.id === animal.id || !seesEntity(world, animal, source)))
    return;
  if (preparation && source) {
    observeNativeAttackPreparation(world, source, events);
    return;
  }
  const episode = beginNativeAlarm(
    world,
    animal,
    { kind: 'event', id: event.id, at: event.at },
    events,
  );
  if (!episode) return;
  if (source && source.id !== animal.id && seesEntity(world, animal, source)) {
    const extent = bodyProfile(source),
      life = source.actor?.physicalLife ?? 0;
    episode.dangers[JSON.stringify(['body', source.id, life])] = {
      kind: 'body',
      sourceId: source.id,
      physicalLife: life,
      point: { ...worldPosition(source) },
      extent: { radius: extent.radius, height: extent.height },
      observedAt: world.simTime,
      visible: true,
    };
  }
  if (regional) {
    const projectileId = event.data?.['projectileId'];
    const receivedLocation = observation.facets.find(
      (facet) => facet.value.kind === 'location',
    )?.value;
    const origin =
      receivedLocation?.kind === 'location' && receivedLocation.location.kind === 'point'
        ? receivedLocation.location.point
        : worldPosition(animal);
    const regionSource =
      typeof projectileId === 'string'
        ? { kind: 'projectile' as const, id: projectileId }
        : { kind: 'event' as const, id: event.id };
    const x = permittedEvent?.kind === 'event' ? permittedEvent.data['incomingX'] : undefined,
      y = permittedEvent?.kind === 'event' ? permittedEvent.data['incomingY'] : undefined,
      z = permittedEvent?.kind === 'event' ? permittedEvent.data['incomingZ'] : undefined;
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
  changed(world, animal);
}

function beginNativeAlarm(
  world: WorldState,
  animal: Entity,
  cause: NonNullable<AnimalComponent['episode']>['latestCause'],
  events: WorldEvent[],
  wakeBody = true,
) {
  const state = animal.animal!;
  const profile = nativeResponseProfile(world, state.episode?.profilePin ?? state.profile);
  if (!profile) return undefined;
  if (state.foraging) interruptTerritorialPursuit(world, animal);
  const forage = state.foraging,
    current = animal.actor?.action;
  if (forage?.work && current?.id === forage.work.actionId) {
    if (current.type === 'strike')
      stopOwnedOffense(world, animal.id, current.targetId!, current.targetLife!, {
        invocationId: current.id,
      });
    else {
      finishPlanAction(
        world,
        animal.id,
        current.id,
        outcome(false, 'cancelled', 'Interrupted by personally perceived danger.'),
      );
      releaseInvocationResources(world, current.id);
      animal.actor!.action = null;
      animal.actor!.planGeneration++;
    }
  }
  if (forage) {
    delete forage.proposal;
    delete forage.work;
    forage.mode = 'resting';
    forage.reviewAt = world.simTime;
  }
  const fresh = !state.episode;
  const episode = (state.episode ??= {
    id: cause.id,
    startedAt: cause.at,
    latestCause: cause,
    profilePin: { ...state.profile },
    ...((state.aerialRouteId ?? animal.spatial.flight?.routeId)
      ? { aerialRouteId: state.aerialRouteId ?? animal.spatial.flight!.routeId }
      : {}),
    locomotion: state.locomotion,
    mode: 'escaping',
    dangers: {},
    reviewAt: world.simTime,
    proposalGeneration: 0,
  });
  if (!fresh && episode.latestCause.kind === cause.kind && episode.latestCause.id === cause.id)
    return episode;
  episode.latestCause = { ...cause };
  episode.mode = episode.movement ? 'blocked' : 'escaping';
  episode.reviewAt = world.simTime;
  delete episode.clearSince;
  delete episode.proposal;
  delete episode.blocked;
  const wake = profile.wake,
    energy = wake && readEntityAttribute(world, animal, wake.attributeId);
  if (
    wakeBody &&
    wake &&
    !animal.actor!.incapacitated &&
    typeof energy === 'number' &&
    energy > wake.above
  )
    interruptStatusEffects(world, animal, events, wake.reason);
  if (fresh)
    emit(
      world,
      events,
      'animal-response',
      subjectNarration(animal, profile.presentation.alarmed),
      animal,
    );
  changed(world, animal);
  return episode;
}

/** Optional pattern housekeeping cannot start another response or renew an alarm. */
export function expireNativeAcousticPatterns(world: WorldState, animal: Entity): void {
  const state = animal.animal;
  if (!state) return;
  let expired = false;
  for (const [key, pattern] of Object.entries(state.acousticPatterns))
    if (pattern.idleExpiresAt <= world.simTime) {
      delete state.acousticPatterns[key];
      expired = true;
    }
  if (expired) recordAnimalClockWrite(world, animal.id);
}

/** Consumes a newly admitted observer record once; no raw emitter or utterance lookup. */
export function acquireNativeSound(
  world: WorldState,
  awareness: Awareness,
  events: WorldEvent[],
): void {
  const sound = awareness.sound;
  const animal = entityGet(world.entities, awareness.actorId),
    state = animal?.animal;
  if (
    !sound ||
    !animal?.actor?.alive ||
    animal.actor.controller !== 'native' ||
    !state ||
    !activelyParticipates(animal) ||
    capabilityBlocked(world, animal, 'perception') ||
    state.physicalLife !== sound.physicalLife ||
    sound.physicalLife !== (animal.actor.physicalLife ?? 0) ||
    sound.acquisition === 'self'
  )
    return;
  const profile = nativeResponseProfile(world, state.episode?.profilePin ?? state.profile);
  if (!profile || profile.soundAlarmMinimumBand === null) return;
  const band = Math.floor(
    (sound.clarityMarginDb - sound.detectThresholdDb) / profile.acousticChangeBandDb,
  );
  if (band < profile.soundAlarmMinimumBand) return;
  expireNativeAcousticPatterns(world, animal);
  const cue: NativeAcousticCue = {
    eventId: awareness.eventId,
    sequence: awareness.sequence,
    at: awareness.at,
    physicalLife: sound.physicalLife,
    sound: cloneValue(sound),
  };
  const key = nativeAcousticPatternKey(cue, profile),
    prior = state.acousticPatterns[key];
  chargeWork({ effects: 1, outputBytes: byteCount(cue) });
  state.acousticPatterns[key] = { idleExpiresAt: cue.at + profile.acousticPatternIdleSeconds, cue };
  recordAnimalClockWrite(world, animal.id);
  if (prior) return;
  const priorEpisode = state.episode;
  const blocked =
    priorEpisode?.mode === 'blocked' && priorEpisode.blocked
      ? cloneValue(priorEpisode.blocked)
      : undefined;
  const moving =
    priorEpisode?.movement &&
    (animal.actor.action?.id === priorEpisode.movement.id ||
      animal.spatial.flight?.nativeLocomotion?.id === priorEpisode.movement.id);
  const episode = beginNativeAlarm(
    world,
    animal,
    { kind: 'event', id: cue.eventId, at: cue.at },
    events,
    false,
  );
  if (!episode) return;
  if (blocked) {
    episode.mode = 'blocked';
    episode.blocked = blocked;
  }
  episode.acousticCue = cue;
  episode.acousticLegRequired = true;
  if (!moving) delete episode.refuge;
  changed(world, animal);
}

/** An existing native policy may hand over a chosen withdrawal, with its exact
 * committed cause. The preferred point grants neither terrain sight nor a route. */
export function beginNativeEscape(
  world: WorldState,
  animal: Entity,
  cause: Readonly<WorldEvent>,
  preferredRefuge: SurfacePoint,
  events: WorldEvent[],
): void {
  if (!animal.animal || !animal.actor?.alive || animal.actor.controller !== 'native') return;
  const episode = beginNativeAlarm(
    world,
    animal,
    { kind: 'event', id: cause.id, at: cause.at },
    events,
  );
  if (episode) {
    episode.preferredRefuge = { ...preferredRefuge };
    changed(world, animal);
  }
}

/** A real committed windup/aim can begin after travel, without another command.
 * Its action identity is evidence of preparation, never a fabricated world event. */
export function observeNativeAttackPreparation(
  world: WorldState,
  source: Entity,
  events: WorldEvent[],
): void {
  const action = attackPreparation(world, source),
    animal = action?.targetId && entityGet(world.entities, action.targetId);
  if (
    !animal ||
    !animal.animal ||
    !animal.actor?.alive ||
    animal.actor.controller !== 'native' ||
    !activelyParticipates(animal) ||
    (animal.threat && !animal.threat.relinquished && !animal.animal.foraging) ||
    action?.targetLife !== (animal.actor.physicalLife ?? 0) ||
    !seesEntity(world, animal, source)
  )
    return;
  const profile = nativeResponseProfile(
    world,
    animal.animal.episode?.profilePin ?? animal.animal.profile,
  );
  if (!profile?.dangers.attackPreparation) return;
  const key = JSON.stringify([source.id, source.actor?.physicalLife ?? 0]);
  if (animal.animal.episode?.preparations?.[key] === action.id) return;
  const episode = beginNativeAlarm(
    world,
    animal,
    { kind: 'action', id: action.id, at: world.simTime },
    events,
  );
  if (episode) {
    (episode.preparations ??= {})[key] = action.id;
    changed(world, animal);
  }
}

export type NativeResponseDecision =
  | { status: 'none' | 'pending' }
  | { status: 'choices'; routes: NativeRefugeRoute[] }
  | { status: 'flight-choices'; preparation: NativeFlightPreparation }
  | { status: 'stop' };

/** One proposal producer for ordinary admission and optional route preparation.
 * Generation is committed only by the ordinary native turn. */
function groundRefugeProposal(
  world: WorldState,
  animal: Entity,
  frame: Extract<NativeDangerFrame, { status: 'complete' }>,
): NativeRefugeProposal {
  const episode = animal.animal!.episode!,
    body = bodyProfile(animal),
    rule = frame.profile.candidates;
  const bearing = nativeEscapeBearing(animal, frame, nextRandom(world));
  const proposal: NativeRefugeProposal = {
    generation: episode.proposalGeneration + 1,
    geometryRevision: spatialMap(world).spatial.revision,
    at: world.simTime,
    origin: supportedPosition(animal)!,
    movementId: animal.actor?.action?.id ?? null,
    wait: rule.navigationWait,
    body: { radius: body.radius, height: body.height, maxSlope: body.maxSlope },
    search: {
      bearing,
      distance:
        rule.distance.minimum + nextRandom(world) * (rule.distance.maximum - rule.distance.minimum),
      side: nextRandom(world) < 0.5 ? -1 : 1,
      attempted: 0,
    },
    candidates: [],
  };
  const candidate = nativeRefugeCandidate(world, animal, proposal);
  if (candidate) proposal.candidates = [candidate];
  return proposal;
}

/** The existing sensory phase selects changed observers and supplies its complete
 * local candidates. Native animals retain physical evidence without the person's
 * sighting, recognition, memory or model-decision machinery. */
export function reconcileNativeExposure(
  world: WorldState,
  animal: Entity,
  candidates?: Iterable<Entity>,
): void {
  // Only previously seen acoustic sources need continuity checks during routine
  // behavior; no human recognition, sighting memory or whole-neighborhood scan.
  const episodes = world.perceptionEpisodes?.[animal.id];
  if (episodes)
    for (const id of Object.keys(episodes)) {
      const source = entityGet(world.entities, id);
      if (!source || !seesEntity(world, animal, source)) delete episodes[id];
    }
  const episode = animal.animal?.episode;
  if (!episode || !animal.actor?.alive || animal.actor.controller !== 'native') return;
  const frame = reconcileNativeDangers(world, animal, episode, candidates);
  let reconsider = false,
    meaningful = false;
  if (frame.status !== 'complete') {
    meaningful = episode.clearSince !== undefined;
    delete episode.clearSince;
    reconsider = episode.mode !== 'blocked';
  } else {
    const profile = frame.profile,
      clear = profile.avoidanceDistance + profile.clearanceMargin,
      from = supportedPosition(animal);
    for (const { key, danger } of frame.records) {
      const inside =
        nativeDangerSeparation(animal, worldPosition(animal), danger, profile, world.simTime) <
        profile.avoidanceDistance - SPATIAL_LIMITS.epsilon;
      if (danger.insideAvoidance === false && inside) reconsider = true;
      if (danger.insideAvoidance !== inside) episode.dangers[key]!.insideAvoidance = inside;
    }
    const nearest = frame.records.reduce(
      (minimum, { danger }) =>
        Math.min(
          minimum,
          nativeDangerSeparation(animal, worldPosition(animal), danger, profile, world.simTime),
        ),
      Infinity,
    );
    if (nearest < clear - SPATIAL_LIMITS.epsilon && episode.clearSince !== undefined) {
      delete episode.clearSince;
      meaningful = true;
      reconsider = true;
    }
    if (nearest < profile.avoidanceDistance && episode.mode === 'settling') reconsider = true;
    const action = animal.actor.action;
    if (frame.newlyVisible.length) {
      const fresh = new Set(frame.newlyVisible);
      reconsider ||= frame.records.some(
        ({ key, danger }) =>
          fresh.has(key) &&
          (nativeDangerSeparation(animal, worldPosition(animal), danger, profile, world.simTime) <
            clear ||
            (action?.path.length &&
              from &&
              nativeRouteDangerSeparation(
                animal,
                from,
                action.path,
                danger,
                profile,
                world.simTime,
              ) < profile.avoidanceDistance)),
      );
    }
    if (episode.movement?.kind === 'action' && action?.id !== episode.movement.id)
      reconsider = true;
    if (
      !action &&
      episode.mode === 'blocked' &&
      nearest >= clear &&
      !capabilityBlocked(world, animal, 'actions') &&
      !capabilityBlocked(world, animal, 'locomotion')
    )
      reconsider = true;
  }
  if (reconsider && episode.reviewAt > world.simTime) {
    episode.reviewAt = world.simTime;
    episode.mode = 'blocked';
    delete episode.proposal;
    meaningful = true;
  }
  if (meaningful) changed(world, animal);
}

/** Native decisions prepare intentions only. The kernel admits a chosen ordinary
 * movement and its saved random draw in one atomic transition. */
export function nativeResponseDue(
  world: WorldState,
  animal: Entity,
  prepared?: NativeRefugePreparations,
): boolean {
  const state = animal.animal,
    actor = animal.actor,
    episode = state?.episode;
  return !!(
    episode &&
    actor &&
    (actor.controller !== 'native' ||
      !actor.alive ||
      state.physicalLife !== (actor.physicalLife ?? 0) ||
      episode.reviewAt <= world.simTime ||
      (episode.proposal &&
        (episode.proposal.wait !== 'entity' ||
          prepared?.has(animal.id) ||
          !nativeRefugeBatch(world, animal))) ||
      Object.values(state.acousticPatterns).some(
        (pattern) => pattern.idleExpiresAt <= world.simTime,
      ))
  );
}
export function nativeResponseDecision(
  world: WorldState,
  animal: Entity,
  events: WorldEvent[],
  prepared?: NativeRefugePreparations,
): NativeResponseDecision {
  const state = animal.animal,
    actor = animal.actor;
  if (!state || !actor) return { status: 'none' };
  expireNativeAcousticPatterns(world, animal);
  if (actor.controller !== 'native') {
    reconcileNativeControl(world, animal);
    return { status: 'none' };
  }
  if (!actor.alive || state.physicalLife !== (actor.physicalLife ?? 0)) {
    delete state.episode;
    state.acousticPatterns = {};
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
    episode.proposal?.wait === 'entity' &&
    nativeRefugeBatch(world, animal) &&
    !nativeRefugePreparationReady(world, animal, prepared)
  ) {
    if (episode.reviewAt <= world.simTime) {
      episode.reviewAt = world.simTime + profile.reviewSeconds;
      changed(world, animal);
    }
    return { status: 'pending' };
  }
  if (
    actor.incapacitated ||
    !activelyParticipates(animal) ||
    capabilityBlocked(world, animal, 'locomotion') ||
    capabilityBlocked(world, animal, 'actions') ||
    animal.spatial.fallVelocity !== undefined ||
    (!animal.spatial.flight && !supportedPosition(animal))
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
  const flight = animal.spatial.flight;
  const ownedFlight = flight?.nativeLocomotion?.episodeId === episode.id;
  if (episode.movement && !owned && !ownedFlight) delete episode.movement;
  const clear = frame.records.every(
    ({ danger }) =>
      nativeDangerSeparation(animal, worldPosition(animal), danger, profile, world.simTime) >=
      profile.avoidanceDistance + profile.clearanceMargin,
  );
  if (
    episode.acousticLegRequired &&
    episode.refuge &&
    distance3D(worldPosition(animal), episode.refuge.point) <= SPATIAL_LIMITS.epsilon
  )
    delete episode.acousticLegRequired;
  const nextReview = () =>
    Math.min(
      world.simTime +
        (episode.mode === 'blocked' ? profile.blockedReviewSeconds : profile.reviewSeconds),
      episode.clearSince === undefined ? Infinity : episode.clearSince + profile.settlingSeconds,
      ...frame.records.map(({ danger }) => nativeDangerExpiresAt(profile, danger)),
    );
  if (
    !owned &&
    !action &&
    clear &&
    !episode.acousticLegRequired &&
    supportedPosition(animal) &&
    (!flight || flight.atRest || flight.waitSeconds > 0)
  ) {
    holdNativeFlightPerch(world, animal);
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
      finishNativeFlightResponse(animal);
      delete state.episode;
      emit(
        world,
        events,
        'animal-response',
        subjectNarration(animal, profile.presentation.routine),
        animal,
      );
      advanceFlight(world, animal, 0, events);
      changed(world, animal);
      return { status: 'none' };
    }
    episode.reviewAt = nextReview();
    changed(world, animal);
    return { status: 'none' };
  }
  if (!clear) delete episode.clearSince;
  if (action && !owned && action.nativeLocomotion?.mode !== 'travel') {
    episode.reviewAt = nextReview();
    changed(world, animal);
    return { status: 'none' };
  }
  if (
    profile.locomotion[episode.locomotion]?.flightEscape !== undefined &&
    (flight || episode.aerialRouteId)
  ) {
    const retained =
      flight && !flight.atRest && !flight.awaitingChoice
        ? {
            kind:
              flight.nativeLocomotion?.stopAt === undefined &&
              world.flightRoutes[flight.routeId]?.continuation.kind === 'land'
                ? ('landing' as const)
                : ('transit' as const),
            routeId: flight.routeId,
            next: flight.next,
          }
        : undefined;
    const preparation = prepareNativeFlightChoices(world, animal, frame, retained);
    if (preparation.choices.length) {
      delete episode.proposal;
      if (
        ownedFlight &&
        preparation.choices.length === 1 &&
        preparation.choices[0]!.candidate.retained
      ) {
        episode.reviewAt = nextReview();
        changed(world, animal);
        return { status: 'none' };
      }
      return { status: 'flight-choices', preparation };
    }
    if (!supportedPosition(animal)) {
      delete episode.proposal;
      recoverUnavailableNativeFlight(animal);
      episode.mode = 'blocked';
      episode.blocked = { reason: 'no-usable-flight', basis: preparation.basis };
      episode.reviewAt = world.simTime + profile.blockedReviewSeconds;
      changed(world, animal);
      return { status: 'none' };
    }
  }
  if (owned && !episode.proposal) {
    if (
      episode.mode === 'escaping' &&
      episode.reviewAt <= world.simTime &&
      episode.refuge &&
      distance3D(worldPosition(animal), episode.refuge.point) > SPATIAL_LIMITS.epsilon
    ) {
      episode.reviewAt = nextReview();
      changed(world, animal);
      return { status: 'none' };
    }
  }
  if (episode.proposal && !nativeRefugeBatch(world, animal)) {
    countDomainWork('nativeResponseStaleProposals');
    delete episode.proposal;
  }
  if (!episode.proposal) {
    // Stop only this controller's uncommitted locomotion before entity-local waiting.
    if (owned && actor.action) {
      releaseInvocationResources(world, actor.action.id);
      actor.action = null;
      delete episode.movement;
    }
    episode.proposal = groundRefugeProposal(world, animal, frame);
    navigationMembershipChanged(world, animal.id, episode.proposal.wait ?? 'world');
    episode.proposalGeneration = episode.proposal.generation;
  }
  const proposal = episode.proposal,
    search = proposal.search!,
    rule = profile.candidates;
  while (search.attempted < rule.angles.length) {
    const routes = preparedNativeRefugeRoutes(world, animal, frame, prepared);
    if (routes === undefined) {
      episode.reviewAt = world.simTime + profile.reviewSeconds;
      changed(world, animal);
      return { status: 'pending' };
    }
    let route = routes === 'unavailable' ? undefined : routes[0];
    if (
      (!route || route.length > search.distance * rule.maximumDetourFactor) &&
      proposal.candidates[0]
    )
      route = nativeRefugePrefixRoute(world, animal, frame, proposal.candidates[0]);
    if (
      route &&
      route.length <= search.distance * rule.maximumDetourFactor + SPATIAL_LIMITS.epsilon
    ) {
      const progress = Math.hypot(
        route.candidate.point.x - proposal.origin.x,
        route.candidate.point.z - proposal.origin.z,
      );
      if (progress > (search.best?.progress ?? 0))
        search.best = {
          point: { ...route.candidate.point },
          path: route.path.map((point) => ({ ...point })),
          length: route.length,
          progress,
        };
      if (progress >= search.distance * rule.preferredProgress - SPATIAL_LIMITS.epsilon)
        return { status: 'choices', routes: [route] };
    }
    search.attempted++;
    if (
      search.best &&
      (search.attempted >= rule.angles.length ||
        (search.attempted >= rule.minimumAttempts &&
          search.best.progress >= search.distance * rule.minimumProgress - SPATIAL_LIMITS.epsilon))
    ) {
      const best = search.best;
      // Other bodies can move while the worker runs. Recheck the chosen stored path now.
      const scored = scoreNativeRefugeRoute(
        world,
        animal,
        frame,
        { id: 'best', point: best.point },
        proposal.origin,
        best.path,
        best.length,
      );
      if (scored.status === 'complete') return { status: 'choices', routes: [scored.route] };
      delete search.best;
    }
    if (search.attempted >= rule.angles.length) break;
    const candidate = nativeRefugeCandidate(world, animal, proposal);
    proposal.candidates = candidate ? [candidate] : [];
  }
  episode.mode = 'blocked';
  episode.blocked = { reason: 'no-usable-route', basis: String(proposal.generation) };
  delete episode.proposal;
  episode.reviewAt = world.simTime + profile.blockedReviewSeconds;
  changed(world, animal);
  return { status: owned ? 'stop' : 'none' };
}

/** Complete current preparation and the single saved draw are committed together.
 * An asynchronous yield cannot admit a choice made for a different body or danger. */
export function admitNativeFlightChoices(
  world: WorldState,
  animal: Entity,
  prepared: NativeFlightPreparation,
  events: WorldEvent[],
): boolean {
  const episode = animal.animal?.episode;
  if (!episode || animal.actor?.controller !== 'native' || !animal.actor.alive) return false;
  const frame = reconcileNativeDangers(world, animal, episode);
  if (
    frame.status !== 'complete' ||
    nativeFlightBasis(world, animal, frame) !== prepared.basis ||
    !prepared.choices.length
  )
    return false;
  const action = animal.actor.action;
  if (
    action &&
    action.nativeLocomotion?.mode !== 'travel' &&
    action.nativeLocomotion?.episodeId !== episode.id
  )
    return false;
  let selected = prepared.choices[0]!,
    draw: number | undefined;
  if (prepared.choices.length > 1) {
    draw = nextRandom(world);
    const weights = prepared.choices.map(
      (choice) => 1 / (1 + choice.length / frame.profile.candidates.distanceWeightScale),
    );
    let remainder = draw * weights.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < prepared.choices.length; i++) {
      selected = prepared.choices[i]!;
      remainder -= weights[i]!;
      if (remainder < 0) break;
    }
  }
  if (action) {
    releaseInvocationResources(world, action.id);
    animal.actor.action = null;
    animal.actor.planGeneration++;
  }
  const generation = ++episode.proposalGeneration;
  const id = `native-flight-${world.nextId++}`;
  startNativeFlight(animal, selected.connection, {
    id,
    physicalLife: animal.actor.physicalLife ?? 0,
    profile: { ...episode.profilePin },
    locomotion: episode.locomotion,
    mode: 'escape',
    episodeId: episode.id,
    generation,
    routeDigest: selected.routeDigest,
    selectedAt: world.simTime,
    geometryRevision: spatialMap(world).spatial.revision,
    ...(draw === undefined ? {} : { draw }),
    ...(selected.connection.kind === 'transit' ? { stopAt: selected.connection.next } : {}),
  });
  if (selected.connection.kind === 'landing') {
    const route = world.flightRoutes[selected.connection.routeId]!,
      terminal = route.points.at(-1)!;
    episode.refuge = {
      ...(episode.acousticCue
        ? { acousticDirection: cloneValue(episode.acousticCue.sound.direction) }
        : {}),
      point: { ...terminal.position, surfaceId: terminal.landingSurfaceId! },
      selectedAt: world.simTime,
      generation,
      flightRouteId: route.id,
      ...(draw === undefined ? {} : { draw }),
    };
  } else delete episode.refuge;
  episode.movement = { kind: 'flight', id };
  episode.mode = 'escaping';
  episode.reviewAt = world.simTime + frame.profile.reviewSeconds;
  delete episode.proposal;
  delete episode.blocked;
  delete episode.clearSince;
  emit(
    world,
    events,
    'animal-response',
    subjectNarration(animal, frame.profile.presentation.escaping),
    animal,
  );
  reconcileAnimalWander(world, animal);
  changed(world, animal);
  advanceFlight(world, animal, 0, events);
  return true;
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
    animal.actor.controller !== 'native' ||
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
    actor.controller === 'native' &&
    !actor.incapacitated &&
    !actor.action &&
    !spatial.flight &&
    spatial.fallVelocity === undefined &&
    !animal.episode &&
    !animal.foraging &&
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
