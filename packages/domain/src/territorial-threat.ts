import { entityGet, entityValues } from './entity-collection.js';
import { distance3D, finitePoint, type SurfacePoint } from '@open-legend/spatial';
import { seesEntity } from './perception.js';
import { nearbyEntities, canReachEntity } from './spatial.js';
import { worldPosition, supportedPosition } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { recordSemanticChange } from './dependencies.js';
import { emit } from './events.js';
import { strikeDefinition } from './strikes.js';
import { isSafeRecordId } from './records.js';
import { releaseInvocationResources } from './resource-claims.js';
import { finishPlanAction } from './agency.js';
import { outcome } from './events.js';
import type { Command, Entity, WorldState, WorldEvent } from './types.js';
import { countDomainWork } from './diagnostic-counters.js';
import { beginNativeEscape } from './native-response-controller.js';

export interface TerritorialPolicy {
  activation?: 'feeding-or-resting';
  pursuitMetres?: number;
  id: string;
  version: number;
  home: SurfacePoint;
  refuge: SurfacePoint;
  entryRadius: number;
  territoryRadius: number;
  pursuitSeconds: number;
  reentryAfterTimeout: boolean;
  searchSeconds: number;
  reviewSeconds: number;
  refreshSeconds: number;
  refreshDisplacement: number;
  detours: number;
  relinquishHealthFraction?: number;
  strikeDefinitionId: string;
  attackRange: number;
  movementFactor: number;
  targetControllers: Array<'player' | 'npc' | 'native'>;
  targetBodyPlans: Array<'biped' | 'quadruped' | 'avian'>;
  windupText: string;
  withdrawalText: string;
  stopText: string;
}
export interface TerritorialThreat {
  travelledMetres?: number;
  policy: TerritorialPolicy;
  mode: 'idle' | 'pursuit' | 'search' | 'return';
  relinquished: boolean;
  reviewAt: number;
  episodeUntil?: number;
  searchUntil?: number;
  targetId?: string;
  targetLife?: number;
  exhaustedTarget?: { id: string; life: number };
  lastSeen?: SurfacePoint;
  detoursSpent: number;
  repathAt: number;
}
function eligible(entity: Entity | undefined, policy: TerritorialPolicy): entity is Entity {
  return (
    !!entity?.actor?.alive &&
    !entity.actor.incapacitated &&
    !!entity.actor.body &&
    policy.targetBodyPlans.includes(entity.actor.body.plan) &&
    policy.targetControllers.includes(entity.actor.controller) &&
    activelyParticipates(entity)
  );
}
function stopAction(world: WorldState, entity: Entity): void {
  const action = entity.actor!.action;
  if (!action) return;
  releaseInvocationResources(world, action.id);
  finishPlanAction(
    world,
    entity.id,
    action.id,
    outcome(false, 'disengaged', 'The animal stopped this attempt.'),
  );
  entity.actor!.action = null;
}
/** Called at the control boundary, before another mind/player can choose work. */
export function retireTerritorialControl(world: WorldState, entity: Entity): void {
  const threat = entity.threat;
  if (!threat || entity.actor?.controller === 'native' || threat.mode === 'idle') return;
  stopAction(world, entity);
  threat.mode = 'idle';
  delete threat.targetId;
  delete threat.targetLife;
  delete threat.lastSeen;
  delete threat.searchUntil;
  delete threat.episodeUntil;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
}
function returnToSafety(world: WorldState, entity: Entity, events: WorldEvent[]): void {
  const threat = entity.threat!;
  const delegate = threat.relinquished && entity.animal && !entity.animal.episode;
  if (threat.mode !== 'return' || delegate) {
    stopAction(world, entity);
    threat.mode = 'return';
    delete threat.targetId;
    delete threat.targetLife;
    delete threat.lastSeen;
    delete threat.searchUntil;
    const event = emit(
      world,
      events,
      'threat-withdrew',
      threat.policy.withdrawalText,
      entity,
      undefined,
      {
        significant: true,
      },
    );
    if (delegate) beginNativeEscape(world, entity, event, threat.policy.refuge, events);
  }
}
/** A hit supplies no hidden identity/position. Misses do not invoke this controller at all. */
export function noteTerritorialInjury(
  world: WorldState,
  entity: Entity,
  source: Entity | undefined,
  damage: number,
  events: WorldEvent[],
): void {
  const threat = entity.threat;
  if (!threat || damage <= 0 || !entity.actor?.alive || entity.actor.controller !== 'native')
    return;
  if (
    threat.policy.relinquishHealthFraction !== undefined &&
    entity.actor.health <= entity.actor.body!.maxHealth * threat.policy.relinquishHealthFraction
  )
    threat.relinquished = true;
  if (
    threat.relinquished ||
    !source ||
    !eligible(source, threat.policy) ||
    !seesEntity(world, entity, source) ||
    distance3D(worldPosition(source), threat.policy.home) > threat.policy.territoryRadius
  ) {
    returnToSafety(world, entity, events);
  } else if (threat.mode !== 'return') {
    threat.targetId = source.id;
    threat.targetLife = source.actor!.physicalLife ?? 0;
    threat.lastSeen = supportedPosition(source) ?? undefined;
    threat.episodeUntil ??= world.simTime + threat.policy.pursuitSeconds;
    threat.mode = 'pursuit';
  }
  threat.reviewAt = world.simTime;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
}

/** Select one existing native intention, never move or damage here. Only actual sight feeds
 * positions; lifecycle checks may end pursuit without revealing a departed body's location. */
export function territorialReviewDue(world: WorldState, entity: Entity): boolean {
  const threat = entity.threat;
  return (
    !!threat &&
    entity.actor?.controller === 'native' &&
    (world.simTime >= threat.reviewAt ||
      (['pursuit', 'search'].includes(threat.mode) &&
        threat.policy.pursuitMetres !== undefined &&
        (threat.travelledMetres ?? 0) >= threat.policy.pursuitMetres) ||
      (['pursuit', 'search'].includes(threat.mode) &&
        threat.episodeUntil !== undefined &&
        world.simTime >= threat.episodeUntil) ||
      (threat.mode === 'search' &&
        threat.searchUntil !== undefined &&
        world.simTime >= threat.searchUntil))
  );
}
/** A due review can be a private wake-up when its sole change is scheduling the next
 * look. Any possible entrant or retained pursuit/action uses the full existing owner.
 * No pending linear body rate affects this guard: it reads only current life/health,
 * supported positions and admitted controller/body applicability. */
export function renewQuietTerritorialReview(world: WorldState, entity: Entity): boolean {
  const threat = entity.threat,
    actor = entity.actor;
  if (
    !threat ||
    !actor?.alive ||
    actor.controller !== 'native' ||
    actor.incapacitated ||
    !activelyParticipates(entity) ||
    !territorialReviewDue(world, entity) ||
    threat.mode !== 'idle' ||
    threat.relinquished ||
    actor.action ||
    threat.targetId ||
    threat.exhaustedTarget ||
    threat.episodeUntil !== undefined ||
    threat.searchUntil !== undefined ||
    threat.lastSeen ||
    !actor.body ||
    (threat.policy.relinquishHealthFraction !== undefined &&
      actor.health <= actor.body.maxHealth * threat.policy.relinquishHealthFraction) ||
    distance3D(worldPosition(entity), threat.policy.home) > threat.policy.territoryRadius
  )
    return false;
  for (const candidate of nearbyEntities(world, threat.policy.home, threat.policy.entryRadius)) {
    if (
      candidate.id !== entity.id &&
      eligible(candidate, threat.policy) &&
      distance3D(worldPosition(candidate), threat.policy.home) <= threat.policy.entryRadius
    )
      return false;
  }
  threat.reviewAt = world.simTime + threat.policy.reviewSeconds;
  countDomainWork('nativeTerritorialDeadlineReuses');
  return true;
}
/** Absolute private wake-up, separate from body/action/interaction forecast expiry. */
export function nextTerritorialReview(world: WorldState, ids: readonly string[]): number {
  let next = Infinity;
  for (const id of ids) {
    const entity = entityGet(world.entities, id),
      threat = entity?.threat;
    if (
      !threat ||
      !entity.actor?.alive ||
      entity.actor.controller !== 'native' ||
      entity.actor.incapacitated ||
      !activelyParticipates(entity) ||
      (threat.relinquished && threat.mode === 'idle') ||
      threat.reviewAt <= world.simTime
    )
      continue;
    next = Math.min(next, threat.reviewAt);
  }
  return next;
}
export function territorialIntention(
  world: WorldState,
  entity: Entity,
  events: WorldEvent[],
): Command | null {
  const threat = entity.threat,
    actor = entity.actor;
  if (threat?.relinquished && threat.mode === 'idle') return null;
  if (
    !threat ||
    !actor?.alive ||
    actor.incapacitated ||
    !activelyParticipates(entity) ||
    !territorialReviewDue(world, entity)
  )
    return null;
  const policy = threat.policy;
  if (
    policy.activation &&
    threat.mode === 'idle' &&
    !(entity.actor?.action?.type === 'feed' && entity.actor.action.stage === 'working') &&
    !(entity.animal?.foraging?.mode === 'resting' && !entity.actor?.action)
  ) {
    threat.reviewAt = world.simTime + policy.reviewSeconds;
    return null;
  }
  threat.reviewAt = world.simTime + policy.reviewSeconds;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
  if (threat.exhaustedTarget) {
    const prior = entityGet(world.entities, threat.exhaustedTarget.id);
    if (
      !eligible(prior, policy) ||
      (prior.actor!.physicalLife ?? 0) !== threat.exhaustedTarget.life ||
      (seesEntity(world, entity, prior) &&
        distance3D(worldPosition(prior), policy.home) > policy.entryRadius)
    )
      delete threat.exhaustedTarget;
  }
  if (
    policy.reentryAfterTimeout &&
    threat.targetId &&
    threat.episodeUntil !== undefined &&
    world.simTime >= threat.episodeUntil &&
    ['pursuit', 'search'].includes(threat.mode)
  )
    threat.exhaustedTarget = { id: threat.targetId, life: threat.targetLife! };
  const newlyRelinquished =
    !threat.relinquished &&
    policy.relinquishHealthFraction !== undefined &&
    actor.health <= actor.body!.maxHealth * policy.relinquishHealthFraction;
  if (newlyRelinquished) threat.relinquished = true;
  // The response owner now owns all escape movement and settling. Territorial
  // pursuit cannot overwrite that action or restart the alarm after it ends.
  if (threat.relinquished && entity.animal) {
    if (newlyRelinquished || threat.mode === 'pursuit' || threat.mode === 'search')
      returnToSafety(world, entity, events);
    if (!entity.animal.episode) {
      threat.mode = 'idle';
      delete threat.episodeUntil;
      delete threat.searchUntil;
      delete threat.targetId;
      delete threat.targetLife;
      delete threat.lastSeen;
      threat.detoursSpent = 0;
    }
    return null;
  }
  if (
    threat.relinquished ||
    (policy.pursuitMetres !== undefined &&
      (threat.travelledMetres ?? 0) >= policy.pursuitMetres &&
      ['pursuit', 'search'].includes(threat.mode)) ||
    distance3D(worldPosition(entity), policy.home) > policy.territoryRadius ||
    (threat.episodeUntil !== undefined &&
      world.simTime >= threat.episodeUntil &&
      ['pursuit', 'search'].includes(threat.mode))
  )
    returnToSafety(world, entity, events);
  let target = threat.targetId ? entityGet(world.entities, threat.targetId) : undefined;
  if (threat.mode === 'idle' && !threat.relinquished) {
    let nearest = Infinity;
    for (const candidate of nearbyEntities(world, policy.home, policy.entryRadius)) {
      if (
        !eligible(candidate, policy) ||
        (candidate.id === threat.exhaustedTarget?.id &&
          (candidate.actor!.physicalLife ?? 0) === threat.exhaustedTarget.life) ||
        candidate.id === entity.id ||
        distance3D(worldPosition(candidate), policy.home) > policy.entryRadius
      )
        continue;
      const distance = distance3D(worldPosition(entity), worldPosition(candidate));
      if (
        distance > nearest ||
        (distance === nearest && target && candidate.id.localeCompare(target.id) >= 0) ||
        !seesEntity(world, entity, candidate)
      )
        continue;
      target = candidate;
      nearest = distance;
    }
    if (target) {
      threat.targetId = target.id;
      threat.targetLife = target.actor!.physicalLife ?? 0;
      threat.mode = 'pursuit';
      threat.episodeUntil = world.simTime + policy.pursuitSeconds;
      if (policy.pursuitMetres !== undefined) threat.travelledMetres = 0;
      threat.detoursSpent = 0;
    }
  }
  const referenceCurrent =
    target && eligible(target, policy) && (target.actor!.physicalLife ?? 0) === threat.targetLife;
  const seen = !!target && referenceCurrent && seesEntity(world, entity, target);
  if (['pursuit', 'search'].includes(threat.mode)) {
    if (
      !referenceCurrent ||
      (seen && target && distance3D(worldPosition(target), policy.home) > policy.territoryRadius)
    )
      returnToSafety(world, entity, events);
    else if (seen && target) {
      threat.mode = 'pursuit';
      delete threat.searchUntil;
      const observed = supportedPosition(target);
      if (observed) threat.lastSeen = { ...observed };
      else returnToSafety(world, entity, events);
    } else if (threat.mode === 'pursuit') {
      stopAction(world, entity);
      threat.mode = 'search';
      threat.searchUntil = world.simTime + policy.searchSeconds;
    } else if (world.simTime >= threat.searchUntil!) returnToSafety(world, entity, events);
  }
  const destination =
    threat.mode === 'return'
      ? threat.relinquished
        ? policy.refuge
        : policy.home
      : threat.mode === 'search' || threat.mode === 'pursuit'
        ? threat.lastSeen
        : undefined;
  if (!destination) return null;
  if (threat.mode === 'return' && distance3D(worldPosition(entity), destination) <= 0.15) {
    stopAction(world, entity);
    threat.mode = 'idle';
    delete threat.episodeUntil;
    threat.detoursSpent = 0;
    return null;
  }
  if (actor.action?.type === 'strike') return null;
  const envelope = {
    id: `threat:${entity.id}:${world.sequence}:${world.simTime}`,
    actorId: entity.id,
  };
  if (
    threat.mode === 'pursuit' &&
    seen &&
    target &&
    (actor.combatReadyAt ?? 0) <= world.simTime &&
    canReachEntity(world, entity, target, policy.attackRange)
  ) {
    stopAction(world, entity);
    return {
      ...envelope,
      type: 'strike',
      definitionId: policy.strikeDefinitionId,
      targetId: target.id,
    };
  }
  if (actor.action) {
    const current = actor.action.destination;
    if (
      actor.action.type !== 'move' ||
      world.simTime < threat.repathAt ||
      (current && distance3D(current, destination) < policy.refreshDisplacement)
    )
      return null;
    stopAction(world, entity);
  }
  if (distance3D(worldPosition(entity), destination) <= 0.15) return null;
  threat.repathAt = world.simTime + policy.refreshSeconds;
  return { ...envelope, type: 'move', destination: { ...destination } };
}
/** Only expensive detours spend the shared episode allowance. Returning gets one terminal
 * attempt; failure leaves the animal at its actual supported stop, never a teleport. */
export function admitTerritorialDetour(entity: Entity): boolean {
  const threat = entity.threat;
  // Ordinary travel outside an episode must not spend (or be blocked by) the
  // finite pursuit allowance retained from earlier territorial work.
  if (!threat || threat.mode === 'idle') return true;
  const limit = threat.policy.detours + (threat.mode === 'return' ? 1 : 0);
  if (threat.detoursSpent >= limit) return false;
  threat.detoursSpent++;
  return true;
}
export function territorialRefusal(world: WorldState, entity: Entity, events: WorldEvent[]): void {
  const threat = entity.threat!;
  if (threat.mode !== 'return') returnToSafety(world, entity, events);
  else {
    stopAction(world, entity);
    threat.mode = 'idle';
    threat.relinquished = true;
    emit(world, events, 'threat-stopped', threat.policy.stopText, entity);
  }
}
export function validateTerritorialThreats(world: WorldState): void {
  for (const entity of entityValues(world.entities)) {
    const threat = entity.threat;
    if (!threat) continue;
    const p = threat.policy,
      strike = strikeDefinition(p.strikeDefinitionId, world);
    if (
      !entity.actor?.body ||
      !isSafeRecordId(p.id) ||
      p.version !== 1 ||
      (p.activation !== undefined && p.activation !== 'feeding-or-resting') ||
      (p.pursuitMetres !== undefined &&
        (!Number.isFinite(p.pursuitMetres) ||
          p.pursuitMetres <= 0 ||
          !Number.isFinite(threat.travelledMetres) ||
          threat.travelledMetres! < 0)) ||
      typeof p.reentryAfterTimeout !== 'boolean' ||
      !strike ||
      strike.requiredBodyPlan !== entity.actor.body.plan ||
      strike.range !== p.attackRange ||
      !finitePoint(p.home) ||
      !finitePoint(p.refuge) ||
      !isSafeRecordId(p.home.surfaceId) ||
      !isSafeRecordId(p.refuge.surfaceId) ||
      ![
        p.entryRadius,
        p.territoryRadius,
        p.pursuitSeconds,
        p.searchSeconds,
        p.reviewSeconds,
        p.refreshSeconds,
        p.refreshDisplacement,
        p.movementFactor,
      ].every((n) => Number.isFinite(n) && n > 0) ||
      p.entryRadius > p.territoryRadius ||
      !Number.isSafeInteger(p.detours) ||
      p.detours < 0 ||
      p.detours > 16 ||
      (p.relinquishHealthFraction !== undefined &&
        (!Number.isFinite(p.relinquishHealthFraction) ||
          p.relinquishHealthFraction <= 0 ||
          p.relinquishHealthFraction >= 1)) ||
      !Array.isArray(p.targetControllers) ||
      !p.targetControllers.length ||
      new Set(p.targetControllers).size !== p.targetControllers.length ||
      p.targetControllers.some((value) => !['player', 'npc', 'native'].includes(value)) ||
      !Array.isArray(p.targetBodyPlans) ||
      !p.targetBodyPlans.length ||
      new Set(p.targetBodyPlans).size !== p.targetBodyPlans.length ||
      p.targetBodyPlans.some((value) => !['biped', 'quadruped', 'avian'].includes(value)) ||
      !['idle', 'pursuit', 'search', 'return'].includes(threat.mode) ||
      typeof threat.relinquished !== 'boolean' ||
      ![threat.reviewAt, threat.repathAt].every((n) => Number.isFinite(n) && n >= 0) ||
      !Number.isSafeInteger(threat.detoursSpent) ||
      threat.detoursSpent < 0 ||
      threat.detoursSpent > p.detours + 1 ||
      [threat.episodeUntil, threat.searchUntil].some(
        (n) => n !== undefined && (!Number.isFinite(n) || n < 0),
      ) ||
      (threat.lastSeen &&
        (!finitePoint(threat.lastSeen) || !isSafeRecordId(threat.lastSeen.surfaceId))) ||
      (threat.targetId &&
        (!isSafeRecordId(threat.targetId) ||
          !Number.isSafeInteger(threat.targetLife) ||
          threat.targetLife! < 0)) ||
      (threat.exhaustedTarget &&
        (!isSafeRecordId(threat.exhaustedTarget.id) ||
          !Number.isSafeInteger(threat.exhaustedTarget.life) ||
          threat.exhaustedTarget.life < 0)) ||
      ![p.windupText, p.withdrawalText, p.stopText].every(
        (text) => typeof text === 'string' && text.length > 0 && text.length <= 500,
      )
    )
      throw new Error('Invalid saved territorial controller.');
  }
}

export function interruptTerritorialPursuit(world: WorldState, entity: Entity): void {
  const threat = entity.threat;
  if (!threat || threat.mode === 'idle') return;
  stopAction(world, entity);
  threat.mode = 'idle';
  delete threat.targetId;
  delete threat.targetLife;
  delete threat.lastSeen;
  delete threat.searchUntil;
  delete threat.episodeUntil;
  threat.detoursSpent = 0;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
}
/** The selected territorial family may bind its region to a real feeding or
 * resting place. Moving foragers acquire no remote territory or player location. */
export function updateTerritorialPlace(world: WorldState, entity: Entity): void {
  const threat = entity.threat,
    point = supportedPosition(entity);
  if (!point || threat?.policy.activation !== 'feeding-or-resting' || threat.mode !== 'idle')
    return;
  if (
    entity.actor?.action?.type !== 'feed' &&
    !(entity.animal?.foraging?.mode === 'resting' && !entity.actor?.action)
  )
    return;
  if (distance3D(threat.policy.home, point) > 0) {
    threat.policy.home = { ...point };
    threat.policy.refuge = { ...point };
  }
}
