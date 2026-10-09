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

export interface TerritorialPolicy {
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
  relinquishHealthFraction: number;
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
function returnToSafety(world: WorldState, entity: Entity, events: WorldEvent[]): void {
  const threat = entity.threat!;
  if (threat.mode !== 'return') {
    stopAction(world, entity);
    threat.mode = 'return';
    delete threat.targetId;
    delete threat.targetLife;
    delete threat.lastSeen;
    delete threat.searchUntil;
    emit(world, events, 'threat-withdrew', threat.policy.withdrawalText, entity, undefined, {
      significant: true,
    });
  }
}
/** A hit supplies no hidden identity/position. Misses do not invoke this controller at all. */
export function noteTerritorialInjury(
  world: WorldState,
  entity: Entity,
  source: Entity,
  damage: number,
  events: WorldEvent[],
): void {
  const threat = entity.threat;
  if (!threat || damage <= 0 || !entity.actor?.alive) return;
  if (entity.actor.health <= entity.actor.body!.maxHealth * threat.policy.relinquishHealthFraction)
    threat.relinquished = true;
  if (
    threat.relinquished ||
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
    (world.simTime >= threat.reviewAt ||
      (['pursuit', 'search'].includes(threat.mode) &&
        threat.episodeUntil !== undefined &&
        world.simTime >= threat.episodeUntil) ||
      (threat.mode === 'search' &&
        threat.searchUntil !== undefined &&
        world.simTime >= threat.searchUntil))
  );
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
  threat.reviewAt = world.simTime + policy.reviewSeconds;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
  if (threat.exhaustedTarget) {
    const prior = world.entities[threat.exhaustedTarget.id];
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
  if (actor.health <= actor.body!.maxHealth * policy.relinquishHealthFraction)
    threat.relinquished = true;
  if (
    threat.relinquished ||
    distance3D(worldPosition(entity), policy.home) > policy.territoryRadius ||
    (threat.episodeUntil !== undefined &&
      world.simTime >= threat.episodeUntil &&
      ['pursuit', 'search'].includes(threat.mode))
  )
    returnToSafety(world, entity, events);
  let target = threat.targetId ? world.entities[threat.targetId] : undefined;
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
  if (!threat) return true;
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
  for (const entity of Object.values(world.entities)) {
    const threat = entity.threat;
    if (!threat) continue;
    const p = threat.policy,
      strike = strikeDefinition(p.strikeDefinitionId, world);
    if (
      !entity.actor?.body ||
      !isSafeRecordId(p.id) ||
      p.version !== 1 ||
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
      !Number.isFinite(p.relinquishHealthFraction) ||
      p.relinquishHealthFraction <= 0 ||
      p.relinquishHealthFraction >= 1 ||
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
