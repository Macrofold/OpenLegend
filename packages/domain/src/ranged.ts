import { countDomainWork, domainCountersEnabled } from './diagnostic-counters.js';
import { tryLocalAvoidance } from './local-avoidance.js';
import { movementTrack } from './action-movement.js';
import {
  attackExecutionEvidence,
  attackExecutionFactor,
  attackExecutionScore,
  attackExecutionCurrent,
  validAttackExecutionProfile,
  validAimPointSubject,
  type AimPointSubject,
  type AttackExecutionProfile,
} from './combat-execution.js';
import { retainCombatRecovery } from './combat-encounters.js';
import { finitePoint } from '@open-legend/spatial';
import { entityGet, entityValues } from './entity-collection.js';
import {
  distance3D,
  interpolate,
  movingBodyContact,
  movingBodyContactInterval,
  movingBodiesDistanceInterval,
  rayHits,
  SPATIAL_LIMITS,
  type WorldPoint,
} from '@open-legend/spatial';
import { rangedTargetAllowed, rangedPolicy } from './ranged-policy.js';
import { nextId } from './data.js';
import { externalAudience } from './event-audience.js';
import { hasMemory } from './living.js';
import { emit, emitObservedOccurrence, outcome } from './events.js';
import { subjectNarration, person } from './narration.js';
import { accessiblePossession } from './object-access.js';
import { itemFor } from './objects.js';
import { equippedItem } from './equipment.js';
import {
  attackFacts,
  validLethalPermission,
  attackPermissionProblem,
  attackReviewProblem,
  type LethalPermission,
} from './combat-consent.js';
import { bodyPolicy } from './body-policy.js';
import { bodyProfile, effectiveBodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import { interactionAnchor, spatialCandidates, nearbyBodyEntities } from './spatial.js';
import { entityVisionQuery, seesEntity, visionQuery } from './perception.js';
import { activelyParticipates } from './participation-state.js';
import { physicalBodyForLife } from './reincarnation.js';
import { BASE_GUARD_TEXT } from './worlds/base/shield-defense.js';
import { commitContactImpact, combatRecoveryDeadline } from './contact-defense.js';
import { projectAttributes, definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin, isDefinitionPin } from './state-owners.js';
import {
  availableItemQuantity,
  applyResourceGroup,
  reserveResource,
  releaseInvocationResources,
} from './resource-claims.js';
import { creditRelease, handlingAccuracy, practiceLaneProblem } from './practical-competence.js';
import { observeCoachedRelease } from './coaching.js';
import { occurrenceFor } from './action-experience.js';
import { noteTerritorialInjury } from './territorial-threat.js';
import { chargeWork } from './work-budget.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import {
  baseObservedAimPoint,
  baseRangedTargetPoint,
  BASE_RANGED_TEXT,
} from './worlds/base/ranged-counterplay.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import {
  flightTracks,
  fallingDisplacement,
  FALL_ACCELERATION,
  motionTrackPosition,
  type MotionTrack,
} from './flight.js';
import { capabilityBlocked } from './status-capabilities.js';
import { TIME_EPSILON } from './simulation-time.js';
import { readOnlyDraftView } from './draft.js';
import { nativeResponseProfile } from './native-response.js';
import {
  motionReach,
  movingPointVisionRuns,
  physicalObservationTracks,
} from './motion-boundaries.js';
import type { Action, Entity, Outcome, WorldEvent, WorldState } from './types.js';

export interface AimState {
  sourceLife: number;
  tool: DefinitionPin;
  ammunition: DefinitionPin;
  reservationId: string;
  manual: boolean;
  ready: boolean;
  /** Current aiming subject; Action.targetId retains the original intended subject. */
  aimTarget?: AimPointSubject;
  aimPoint?: WorldPoint;
  aimPointSubject?: AimPointSubject;
  observedMotion?: {
    fromAt: number;
    at: number;
    from: WorldPoint;
    to: WorldPoint;
  };
}

interface AimMotionPreparation {
  actorId: string;
  actionId: string;
  targetId: string;
  targetLife?: number;
  startedAt: number;
  seconds: number;
  own: MotionTrack[];
  target: MotionTrack[];
  visible: { own: number; target: number; from: number }[];
}

/** Prepare only existing aims and their exact target's physical paths. These are
 * disposable predictions until movement and personal sight establish evidence. */
export function captureAimMotion(
  world: WorldState,
  actorIds: readonly string[],
  seconds: number,
  motion?: ReadonlyMap<string, MotionTrack[]>,
): AimMotionPreparation[] {
  if (seconds <= TIME_EPSILON) return [];
  const prepared: AimMotionPreparation[] = [];
  for (const id of actorIds) {
    const actor = entityGet(world.entities, id),
      action = actor?.actor?.action,
      target = entityGet(world.entities, action?.ranged?.aimTarget?.id ?? '');
    if (!actor || !action?.ranged || action.stage !== 'working' || !target) continue;
    const own = motion?.get(actor.id) ?? physicalObservationTracks(world, actor, seconds),
      targetTracks = motion?.get(target.id) ?? physicalObservationTracks(world, target, seconds);
    if (!own || !targetTracks || !seesEntity(world, actor, target)) continue;
    const lift = baseRangedTargetPoint(world, target).y - worldPosition(target).y;
    const aimed = targetTracks.map((track) => ({
      ...track,
      pose: track.pose.map((point) => ({ ...point, y: point.y + lift })),
    }));
    const visible: AimMotionPreparation['visible'] = [];
    for (let i = 0; i < own.length; i++)
      for (let j = 0; j < aimed.length; j++) {
        const run = movingPointVisionRuns(world, actor, own[i]!, aimed[j]!, seconds).at(-1);
        if (run?.value && run.end === seconds) visible.push({ own: i, target: j, from: run.start });
      }
    prepared.push({
      actorId: id,
      actionId: action.id,
      targetId: target.id,
      targetLife: action.ranged.aimTarget!.life,
      startedAt: world.simTime,
      seconds,
      own,
      target: aimed,
      visible,
    });
  }
  return prepared;
}

/** Call after physical movement and before endpoint releases. No future intention
 * is read here: only a uniquely matched, actually seen executed segment is saved. */
export function observeAimMotion(world: WorldState, prepared: AimMotionPreparation[]): void {
  for (const entry of prepared) {
    const actor = entityGet(world.entities, entry.actorId),
      action = actor?.actor?.action,
      target = entityGet(world.entities, entry.targetId);
    if (!actor || action?.id !== entry.actionId || !action.ranged) continue;
    delete action.ranged.observedMotion;
    if (
      !target ||
      entry.targetId !== action.ranged.aimTarget?.id ||
      entry.targetLife !== action.ranged.aimTarget.life ||
      (entry.targetLife !== undefined && entry.targetLife !== (target.actor?.physicalLife ?? 0)) ||
      !seesEntity(world, actor, target)
    )
      continue;
    const ownPoint = worldPosition(actor),
      targetPoint = baseRangedTargetPoint(world, target);
    const matches = entry.visible.filter(
      (pair) =>
        distance3D(motionTrackPosition(entry.own[pair.own]!, entry.seconds), ownPoint) <
          SPATIAL_LIMITS.epsilon &&
        distance3D(motionTrackPosition(entry.target[pair.target]!, entry.seconds), targetPoint) <
          SPATIAL_LIMITS.epsilon,
    );
    if (matches.length !== 1) continue;
    const match = matches[0]!,
      track = entry.target[match.target]!,
      from = Math.max(match.from, track.at.at(-2)!),
      fromAt = entry.startedAt + from;
    if (entry.seconds - from <= TIME_EPSILON || fromAt >= world.simTime) continue;
    action.ranged.observedMotion = {
      fromAt,
      at: world.simTime,
      from: motionTrackPosition(track, from),
      to: { ...targetPoint },
    };
  }
}
export interface ProjectileFlight {
  nearPassObservedLives?: Record<string, true>;
  id: string;
  actionId: string;
  sourceId: string;
  sourceLife: number;
  sourceController: 'player' | 'npc' | 'native';
  contactPolicy: {
    pin: DefinitionPin | null;
    response: 'injure-vulnerable-body' | 'stop-only';
  };
  sourceExited: boolean;
  targetId?: string;
  targetLife?: number;
  practice: boolean;
  requiresLethalReview: boolean;
  lethalPermission?: LethalPermission;
  attackDigest?: string;
  tool: DefinitionPin;
  ammunition: DefinitionPin;
  position: WorldPoint;
  direction: WorldPoint;
  launchedAt: number;
  advancedAt: number;
  speed: number;
  remainingRange: number;
  injury: number;
  handling: number;
  execution?: AttackExecutionProfile & { score: number };
  encounters?: Record<
    string,
    { bodyId: string; bodyLife: number; enteredAt: number; poseOccurrenceId: string }
  >;
}

const passageLife = (entity: Entity) =>
  JSON.stringify([entity.id, entity.actor?.physicalLife ?? 0]);
function nativePassageDistance(world: WorldState, entity: Entity): number {
  return entity.animal && entity.actor?.alive && entity.actor.controller === 'native'
    ? (nativeResponseProfile(world, entity.animal.episode?.profilePin ?? entity.animal.profile)
        ?.passageDistance ?? 0)
    : 0;
}
/** Query only the path physically traversed before first contact. Predictions
 * bound native time; actual integration calls this again with executed poses. */
function projectilePassage(
  world: WorldState,
  animal: Entity,
  from: WorldPoint,
  to: WorldPoint,
  ownFrom: WorldPoint,
  ownTo: WorldPoint,
  body: ReturnType<typeof bodyProfile>,
  seconds: number,
  separation: number,
): { at: number; point: WorldPoint } | undefined {
  if (!(seconds > 0) || !animal.actor?.alive || !activelyParticipates(animal) || separation <= 0)
    return;
  const close = movingBodiesDistanceInterval(
    from,
    to,
    { radius: 0, height: 0 },
    ownFrom,
    ownTo,
    body,
    separation,
  );
  if (!close) return;
  const own: MotionTrack = { at: [0, seconds], pose: [ownFrom, ownTo] },
    point: MotionTrack = { at: [0, seconds], pose: [from, to] };
  for (const run of movingPointVisionRuns(world, animal, own, point, seconds)) {
    if (!run.value) continue;
    const start = Math.max(close.enter * seconds, run.start),
      end = Math.min(close.exit * seconds, run.end);
    if (start >= end) continue;
    const at = start + Math.min(TIME_EPSILON, (end - start) / 2);
    return { at, point: interpolate(from, to, at / seconds) };
  }
}
export function bindAim(
  world: WorldState,
  actor: Entity,
  action: Action,
  manual = false,
): AimState {
  const tool = itemFor(world, action.weaponItemId!)!;
  const ammunition = itemFor(world, action.ammoItemId!)!;
  return {
    sourceLife: actor.actor!.physicalLife ?? 0,
    tool: definitionPin(world.itemDefinitions[tool.definitionId]!),
    ammunition: definitionPin(world.itemDefinitions[ammunition.definitionId]!),
    reservationId: `${action.id}:projectile`,
    manual,
    ready: false,
    ...(action.targetId
      ? { aimTarget: { id: action.targetId, life: action.targetLife ?? 0 } }
      : {}),
  };
}
/** Change only the final aiming choice, preserving earned motion for the same body. */
export function retargetAim(
  aim: AimState,
  choice: Pick<AimState, 'aimTarget' | 'aimPoint' | 'aimPointSubject'>,
): AimState {
  if (!choice.aimPoint && !choice.aimTarget) return { ...aim };
  const next = { ...aim };
  delete next.aimTarget;
  delete next.aimPoint;
  delete next.aimPointSubject;
  if (choice.aimPoint) {
    next.aimPoint = { ...choice.aimPoint };
    if (choice.aimPointSubject) next.aimPointSubject = { ...choice.aimPointSubject };
    delete next.observedMotion;
  } else {
    next.aimTarget = { ...choice.aimTarget! };
    if (aim.aimTarget?.id !== next.aimTarget.id || aim.aimTarget.life !== next.aimTarget.life)
      delete next.observedMotion;
  }
  return next;
}
export function holdAim(world: WorldState, actor: Entity, action: Action): Outcome | null {
  const ammunition = itemFor(world, action.ammoItemId!);
  if (!ammunition || !action.ranged)
    return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.ammunitionUnavailable);
  const held = reserveResource(
    world,
    {
      id: action.ranged.reservationId,
      invocationId: action.id,
      actorId: actor.id,
      resource: { kind: 'item', itemId: ammunition.id, definition: action.ranged.ammunition },
      amount: 1,
    },
    ammunition.revision ?? 0,
  );
  return held.status === 'applied'
    ? null
    : outcome(false, 'ammunition-unavailable', BASE_RANGED_TEXT.reservationUnavailable);
}
/** Preparation requirements are rechecked before release, never after a physical shot exists. */
export function aimProblem(
  world: WorldState,
  actor: Entity,
  action: Action,
  release = false,
  skipReview = false,
): Outcome | null {
  if (action.type !== 'practice-shot' && !rangedPolicy(world))
    return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.selectedChanged);
  const aim = action.ranged,
    target = entityGet(world.entities, aim?.aimTarget?.id ?? '');
  const tool = itemFor(world, action.weaponItemId ?? ''),
    ammo = itemFor(world, action.ammoItemId ?? '');
  const definition = tool && world.itemDefinitions[tool.definitionId],
    ammunition = ammo && world.itemDefinitions[ammo.definitionId];
  if (
    !aim ||
    aim.sourceLife !== (actor.actor?.physicalLife ?? 0) ||
    !definition?.rangedWeapon ||
    !Number.isFinite(definition.rangedWeapon.flightSpeed) ||
    definition.rangedWeapon.flightSpeed <= 0 ||
    !ammunition?.ammunition ||
    !sameDefinitionPin(aim.tool, definitionPin(definition)) ||
    !sameDefinitionPin(aim.ammunition, definitionPin(ammunition)) ||
    !accessiblePossession(world, actor.id, tool!.id) ||
    !equippedItem(world, actor.id, 'ranged', tool!.id) ||
    !accessiblePossession(world, actor.id, ammo!.id) ||
    availableItemQuantity(world, ammo!.id, action.id) < 1
  )
    return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.selectedChanged);
  if (!attackExecutionCurrent(world, action))
    return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.selectedChanged);
  if (aim.aimPoint) {
    const problem = pointShotProblem(
      world,
      actor,
      aim.aimPoint,
      definition.rangedWeapon.range,
      aim.aimPointSubject,
    );
    if (problem) return problem;
    if (!skipReview && release) {
      for (const subject of pointShotSubjects(world, actor, action)) {
        const permission =
          action.lethalPermission?.targetId === subject.id
            ? { ...action.lethalPermission, additionalTargets: undefined }
            : action.lethalPermission?.additionalTargets?.find((p) => p.targetId === subject.id);
        const problem =
          attackPermissionProblem(world, actor, subject, {
            requiresLethalReview: action.requiresLethalReview,
          }) ??
          attackReviewProblem(world, actor, subject, { ...action, lethalPermission: permission });
        if (problem) return problem;
      }
    }
  } else if (
    release ||
    !aim.manual ||
    !action.attackExecution ||
    action.attackExecution.pendingRelease
  ) {
    if (
      !target ||
      !activelyParticipates(target) ||
      (target.actor?.physicalLife ?? 0) !== aim.aimTarget?.life ||
      !seesEntity(world, actor, target)
    )
      return outcome(false, 'not-visible', BASE_RANGED_TEXT.targetLost);
    if (distance3D(interactionAnchor(world, actor), baseRangedTargetPoint(world, target)) <= 1e-12)
      return outcome(false, 'invalid-aim-point', BASE_RANGED_TEXT.distinctTarget);
    if (action.type === 'practice-shot') {
      if (!target.practiceTarget)
        return outcome(false, 'practice-unavailable', BASE_RANGED_TEXT.practiceChanged);
    } else {
      if (!rangedTargetAllowed(world, target))
        return outcome(false, 'attack-target-unavailable', rangedPolicy(world)!.invalidTargetText);
      if (
        !action.rangedPolicyPin ||
        !world.moduleManifest.rangedPolicyPin ||
        !sameDefinitionPin(action.rangedPolicyPin, world.moduleManifest.rangedPolicyPin)
      )
        return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.selectedChanged);
      for (const subject of pointShotSubjects(world, actor, action)) {
        const permission = attackPermissionProblem(world, actor, subject, action);
        if (permission) return permission;
      }
    }
    if (
      action.stage === 'working' &&
      distance3D(interactionAnchor(world, actor), baseRangedTargetPoint(world, target)) >
        definition.rangedWeapon.range
    )
      return outcome(false, 'out-of-range', BASE_RANGED_TEXT.rangeLost);
  }
  if (!release) return null;
  if (combatRecoveryDeadline(world, actor) > world.simTime)
    return outcome(false, 'combat-recovery', BASE_GUARD_TEXT.recovery);
  const handling = handlingAccuracy(world, actor, definition);
  if (
    action.competencePin &&
    (!handling.definition ||
      !sameDefinitionPin(action.competencePin, definitionPin(handling.definition)))
  )
    return outcome(false, 'handling-changed', BASE_RANGED_TEXT.handlingChanged);
  if (handling.definition && handling.competence === undefined)
    return outcome(false, 'handling-unavailable', BASE_RANGED_TEXT.handlingUnavailable);
  return action.type === 'practice-shot'
    ? practiceLaneProblem(
        world,
        actor,
        target!,
        definition.rangedWeapon.range,
        handling.definition!.practice!,
      )
    : skipReview || aim.aimPoint
      ? null
      : (pointShotSubjects(world, actor, action)
          .map((subject) => attackReviewProblem(world, actor, subject, action))
          .find((problem) => problem !== null) ?? null);
}

/** Point admission uses the actor's permitted view, never a hidden target position. */
export function pointShotProblem(
  world: WorldState,
  actor: Entity,
  point: WorldPoint,
  range: number,
  subject?: AimPointSubject,
): Outcome | null {
  if (!rangedPolicy(world)?.pointFire || !actor.actor?.alive || !activelyParticipates(actor))
    return outcome(false, 'point-fire-unavailable', BASE_RANGED_TEXT.selectedChanged);
  if (
    !finitePoint(point) ||
    (subject !== undefined && !validAimPointSubject(subject)) ||
    distance3D(interactionAnchor(world, actor), point) <= 1e-8 ||
    distance3D(interactionAnchor(world, actor), point) > range
  )
    return outcome(false, 'invalid-aim-point', BASE_RANGED_TEXT.distinctTarget);
  if (visionQuery(world, actor)({ position: point, height: 0 })) return null;
  // A visible body's displayed torso may be behind low cover while its upper body
  // remains visible. Permit only a point inside that exact current observed body;
  // the released ray still encounters the cover through ordinary first contact.
  const body = subject && entityGet(world.entities, subject.id);
  const permittedBodyPoint =
    body &&
    activelyParticipates(body) &&
    (body.actor?.physicalLife ?? 0) === subject.life &&
    seesEntity(world, actor, body) &&
    movingBodyContact(
      point,
      point,
      worldPosition(body),
      worldPosition(body),
      effectiveBodyProfile(world, body),
    ) !== undefined;
  if (!permittedBodyPoint) return outcome(false, 'not-visible', BASE_RANGED_TEXT.targetLost);
  return null;
}
/** Only recognized bodies participate in review. Later hidden collateral stays physical. */
export function pointShotSubjects(world: WorldState, actor: Entity, action: Action): Entity[] {
  const subjects: Entity[] = [];
  const original = entityGet(world.entities, action.targetId ?? '');
  if (
    original?.actor?.alive &&
    (action.targetLife === undefined || (original.actor.physicalLife ?? 0) === action.targetLife)
  )
    subjects.push(original);
  const point = action.ranged?.aimPoint;
  if (!point) {
    const aimed = action.ranged?.aimTarget;
    const target = aimed && entityGet(world.entities, aimed.id);
    if (
      aimed &&
      target?.actor?.alive &&
      (target.actor.physicalLife ?? 0) === aimed.life &&
      !subjects.some((subject) => subject.id === target.id)
    )
      subjects.push(target);
    return subjects;
  }
  const origin = interactionAnchor(world, actor),
    tool = itemFor(world, action.weaponItemId ?? ''),
    range = tool && world.itemDefinitions[tool.definitionId]?.rangedWeapon?.range;
  if (!range) return subjects;
  const length = distance3D(origin, point);
  if (length <= SPATIAL_LIMITS.epsilon) return subjects;
  const end = {
    x: origin.x + ((point.x - origin.x) * range) / length,
    y: origin.y + ((point.y - origin.y) * range) / length,
    z: origin.z + ((point.z - origin.z) * range) / length,
  };
  const solid = rayHits(spatialMap(world), origin, end, 'movement')[0];
  let first: { entity: Entity; fraction: number } | undefined;
  let sees: ReturnType<typeof entityVisionQuery> | undefined;
  // The existing foot index expands by complete body extent, preserving tall and
  // airborne candidates without revisiting unrelated inventory or distant bodies.
  for (const entity of nearbyBodyEntities(world, interpolate(origin, end, 0.5), range / 2, true)) {
    if (entity.id === actor.id || !activelyParticipates(entity)) continue;
    const position = worldPosition(entity),
      fraction = movingBodyContact(
        origin,
        end,
        position,
        position,
        effectiveBodyProfile(world, entity),
      );
    if (
      fraction === undefined ||
      (solid &&
        (fraction > solid.fraction ||
          (fraction === solid.fraction && entity.id.localeCompare(solid.id) >= 0))) ||
      (first &&
        (fraction > first.fraction ||
          (fraction === first.fraction && entity.id.localeCompare(first.entity.id) >= 0))) ||
      !(sees ??= entityVisionQuery(world, actor))(entity)
    )
      continue;
    first = { entity, fraction };
  }
  const indicated = first?.entity;
  if (indicated && !subjects.some((e) => e.id === indicated.id)) subjects.push(indicated);
  return subjects;
}

export function releaseShot(
  world: WorldState,
  actor: Entity,
  action: Action,
  events: WorldEvent[],
): Outcome {
  const problem = aimProblem(world, actor, action, true);
  if (problem) return problem;
  const target = entityGet(world.entities, action.ranged?.aimTarget?.id ?? ''),
    tool = itemFor(world, action.weaponItemId!)!,
    ammo = itemFor(world, action.ammoItemId!)!;
  const definition = world.itemDefinitions[tool.definitionId]!,
    ammunition = world.itemDefinitions[ammo.definitionId]!,
    rangedWeapon = definition.rangedWeapon!;
  const aim = action.ranged!,
    handling = handlingAccuracy(world, actor, definition);
  const facts = attackFacts(world, actor, action);
  if (!facts) return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.selectedChanged);
  // Admit the complete release before consuming stock or drawing randomness. Existing flights
  // are never discarded to admit a new one. Collision work retains the native group's allowance.
  chargeWork({ effects: 1, retainedBytes: 2048 });
  const debit = applyResourceGroup(
    world,
    {
      invocationId: action.id,
      fulfillment: 'all-or-nothing',
      operations: [
        {
          source: { kind: 'item', itemId: ammo.id, definition: aim.ammunition },
          sourceRevision: ammo.revision ?? 0,
          amount: 1,
          reservationId: aim.reservationId,
        },
      ],
    },
    events,
  );
  if (debit.status !== 'applied')
    return outcome(false, 'ammunition-unavailable', BASE_RANGED_TEXT.releaseUnavailable);
  const origin = interactionAnchor(world, actor),
    point =
      aim.aimPoint ??
      baseObservedAimPoint(
        origin,
        baseRangedTargetPoint(world, target!),
        aim.observedMotion,
        world.simTime,
        rangedWeapon.flightSpeed,
        rangedWeapon.range,
      );
  const delta = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
  const steadiness = Math.max(0, Math.min(1, handling.accuracy));
  const length = Math.hypot(delta.x, delta.y, delta.z);
  const direction = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
  actor.actor!.combatReadyAt = Math.max(
    actor.actor!.combatReadyAt ?? 0,
    world.simTime + rangedWeapon.recoverySeconds,
  );
  retainCombatRecovery(world, actor, 'combat', actor.actor!.combatReadyAt);
  const flight: ProjectileFlight = {
    id: nextId(world, 'projectile'),
    actionId: action.id,
    sourceId: actor.id,
    sourceLife: aim.sourceLife,
    sourceController: actor.actor!.controller,
    contactPolicy: {
      pin: world.moduleManifest.bodyPolicyPin && { ...world.moduleManifest.bodyPolicyPin },
      response: bodyPolicy(world)?.combat?.projectileContact ?? 'stop-only',
    },
    sourceExited:
      movingBodyContact(
        origin,
        origin,
        worldPosition(actor),
        worldPosition(actor),
        effectiveBodyProfile(world, actor),
      ) === undefined,
    ...(target ? { targetId: target.id } : {}),
    ...(aim.aimTarget && action.type !== 'practice-shot' ? { targetLife: aim.aimTarget.life } : {}),
    practice: action.type === 'practice-shot',
    requiresLethalReview: !!action.requiresLethalReview || actor.actor!.controller === 'player',
    ...(action.lethalPermission ? { lethalPermission: { ...action.lethalPermission } } : {}),
    attackDigest: facts.digest,
    tool: { ...aim.tool },
    ammunition: { ...aim.ammunition },
    position: origin,
    direction,
    launchedAt: world.simTime,
    advancedAt: world.simTime,
    speed: rangedWeapon.flightSpeed,
    remainingRange: rangedWeapon.range,
    injury: facts.injury,
    handling: steadiness,
    ...(action.attackExecution
      ? {
          execution: {
            profile: action.attackExecution.profile,
            contact: action.attackExecution.contact,
            injury: action.attackExecution.injury,
            score: attackExecutionScore(action),
          },
        }
      : {}),
  };
  (world.projectiles ??= {})[flight.id] = flight;
  const released = emit(
    world,
    events,
    'shot-released',
    subjectNarration(actor, BASE_RANGED_TEXT.released),
    actor,
    target?.id,
    {
      actionId: action.id,
      projectileId: flight.id,
      ammunitionKind: rangedWeapon.ammunitionKind,
      quantity: 1,
      targetReference: true,
      semanticTrigger: true,
    },
  );
  const occurrence = occurrenceFor(world, actor.id, action.id);
  if (occurrence && aim.aimTarget && target)
    occurrence.objects[target.id] ??= { kind: target.kind };
  if (occurrence && action.attackExecution)
    occurrence.attackExecution = attackExecutionEvidence(action, world.simTime);
  if (occurrence)
    occurrence.release = {
      eventId: released.id,
      ...(aim.aimTarget ? { aimTarget: { ...aim.aimTarget } } : {}),
      tool: definitionPin(definition),
      ...(handling.definition ? { family: handling.definition.practice!.family } : {}),
      ...(handling.competence === undefined ? {} : { competence: handling.competence }),
      accuracy: steadiness,
      ammunitionItemId: ammo.id,
      ammunitionDefinitionId: ammo.definitionId,
      quantity: 1,
    };
  const support = creditRelease(world, actor, definition, released, events);
  observeCoachedRelease(world, actor, released, support, events);
  releaseInvocationResources(world, action.id);
  return outcome(true, 'released', BASE_RANGED_TEXT.released);
}

export type ProjectileBodies = Map<
  string,
  {
    entity: Entity;
    life: number | undefined;
    position: WorldPoint;
    profile: ReturnType<typeof bodyProfile>;
    ordinary: ReturnType<typeof bodyProfile>;
  }
>;
/** Exempt only the original launch overlap. Once clear, even the source can intercept.
 * Relative linear capsule motion is convex; native track turns split intervals below. */
function launchOverlap(
  flight: ProjectileFlight,
  entity: Entity,
  position: WorldPoint,
  profile: ReturnType<typeof bodyProfile>,
): boolean {
  return (
    !flight.sourceExited &&
    entity.id === flight.sourceId &&
    (entity.actor?.physicalLife ?? 0) === flight.sourceLife &&
    movingBodyContact(flight.position, flight.position, position, position, profile) !== undefined
  );
}
export function captureProjectileBodies(
  world: WorldState,
  bodyIds: readonly string[],
): ProjectileBodies {
  // Native preparation owns membership; this interval reads current body values without
  // re-enumerating unrelated roots or creating drafts merely to inspect them.
  const entities = readOnlyDraftView(world.entities);
  countDomainWork('projectileBodiesPrepared', bodyIds.length);
  return new Map(
    bodyIds
      .flatMap((id) => entityGet(entities, id) ?? [])
      .filter((e) => activelyParticipates(e))
      .map((entity) => [
        entity.id,
        {
          entity,
          life: entity.actor ? (entity.actor.physicalLife ?? 0) : undefined,
          position: { ...worldPosition(entity) },
          profile: { ...effectiveBodyProfile(world, entity) },
          ordinary: { ...bodyProfile(entity) },
        },
      ]),
  );
}
/** Bounded chords of the admitted falling curve. The acceleration owner's
 * displacement supplies positions; the maximum chord deviation is below the
 * spatial tolerance consumed by current-time settlement. */
function fallingMotion(entity: Entity, seconds: number): MotionTrack {
  const point = worldPosition(entity),
    velocity = entity.spatial.fallVelocity!;
  const segments = Math.max(
    1,
    Math.ceil(seconds / Math.sqrt(SPATIAL_LIMITS.epsilon / FALL_ACCELERATION)),
  );
  const track: MotionTrack = { at: [], pose: [] };
  for (let index = 0; index <= segments; index++) {
    const at = (seconds * index) / segments;
    track.at.push(at);
    track.pose.push({ ...point, y: point.y - fallingDisplacement(velocity, at) });
  }
  return track;
}
/** Contacts become native time boundaries, rather than effects delayed until range expiry.
 * The actual swept movement still decides contact after the body/geometry owners advance. */
export function projectileBoundary(
  world: WorldState,
  before: ProjectileBodies,
  ids: readonly string[],
  seconds: number,
  motion?: ReadonlyMap<string, MotionTrack[]>,
  passages = true,
): number {
  const bodies = [...before.values()].map((entry) => ({
    ...entry,
    restricted: capabilityBlocked(world, entry.entity, 'locomotion'),
    passageDistance: nativePassageDistance(world, entry.entity),
    extent:
      // A low actual body can still own an unresolved crossing of its ordinary
      // envelope. Dropping it here postpones that exit until an arbitrary tick.
      Math.max(
        entry.profile.height + entry.profile.radius,
        entry.ordinary.height + entry.ordinary.radius,
      ) +
      motionReach(world, entry.entity, seconds) +
      (motion
        ?.get(entry.entity.id)
        ?.reduce(
          (max, track) =>
            Math.max(max, ...track.pose.map((point) => distance3D(point, entry.position))),
          0,
        ) ?? 0),
    tracks: undefined as MotionTrack[] | undefined,
  }));
  const retainTracks = (entry: (typeof bodies)[number], tracks: MotionTrack[]): MotionTrack[] => {
    if (domainCountersEnabled()) {
      countDomainWork('projectileMotionBranchesPrepared', tracks.length);
      countDomainWork(
        'projectileMotionPiecesPrepared',
        tracks.reduce((pieces, track) => pieces + Math.max(0, track.at.length - 1), 0),
      );
    }
    return (entry.tracks = tracks);
  };
  const tracksFor = (entry: (typeof bodies)[number]): MotionTrack[] => {
    if (entry.tracks) return entry.tracks;
    countDomainWork('projectileMotionTracksPrepared');
    const entity = entry.entity,
      action = entity.actor?.action;
    if (motion?.has(entity.id)) return retainTracks(entry, motion.get(entity.id)!);
    if (!entry.restricted && entity.spatial.fallVelocity !== undefined)
      return retainTracks(entry, [fallingMotion(entity, seconds)]);
    if (!entry.restricted && entity.spatial.flight)
      entry.tracks = flightTracks(world, entity, seconds);
    if (
      !entry.tracks &&
      !entry.restricted &&
      action?.path.length &&
      (action.stage === 'approaching' || action.strikeMotion)
    ) {
      const speed = nativeMovementSpeed(world, entity),
        budget =
          speed * Math.min(seconds, action.type === 'evade' ? action.remainingSeconds : seconds);
      const occupied =
        !!action.strikeMotion ||
        !!action.nativeLocomotion ||
        (entity.actor!.controller === 'native' && !!entity.animal);
      entry.tracks = [movementTrack(world, entity, action.path, budget, seconds, occupied).track];
    }
    return retainTracks(
      entry,
      entry.tracks ?? [{ at: [0, seconds], pose: [entry.position, entry.position] }],
    );
  };
  const extent = bodies.reduce(
    (maximum, entry) => Math.max(maximum, entry.extent + entry.passageDistance),
    0,
  );
  const query = spatialCandidates(bodies);
  let bound = seconds;
  for (const id of ids) {
    const flight = world.projectiles![id]!;
    let duration = Math.min(seconds, flight.remainingRange / flight.speed);
    bound = Math.min(bound, duration);
    const travel = duration * flight.speed,
      from = flight.position;
    const to = {
      x: from.x + flight.direction.x * travel,
      y: from.y + flight.direction.y * travel,
      z: from.z + flight.direction.z * travel,
    };
    const solid = rayHits(spatialMap(world), from, to, 'movement')[0];
    if (solid) bound = Math.min(bound, duration * solid.fraction);
    const midpoint = interpolate(from, to, 0.5);
    const broad = query(midpoint, travel / 2 + extent);
    countDomainWork('projectileBroadCandidates', broad.length);
    const candidates = broad.filter(
      (entry) =>
        distance3D(midpoint, entry.position) <=
        travel / 2 + entry.extent + entry.passageDistance + TIME_EPSILON,
    );
    // A chord cannot represent a corridor turn. Split only a nearby body's relevant
    // interval; distant birds keep their private turns and paths are prepared once.
    // docs/spatial-world.md#movement
    for (const entry of candidates)
      if (entry.entity.spatial.fallVelocity === undefined)
        for (const track of tracksFor(entry))
          for (const at of track.at)
            if (at > TIME_EPSILON && at < duration - TIME_EPSILON) duration = at;
    bound = Math.min(bound, duration);
    const shortTo = interpolate(from, to, duration / (travel / flight.speed));
    for (const entry of candidates) {
      if (launchOverlap(flight, entry.entity, entry.position, entry.profile)) continue;
      for (const track of tracksFor(entry)) {
        const falling = entry.entity.spatial.fallVelocity !== undefined;
        // Chords refine only the candidate's curved contact arithmetic. Their
        // approximation knots are not global world-time events.
        const cuts = falling
          ? [0, ...track.at.filter((at) => at > 0 && at < duration), duration]
          : [0, duration];
        for (let piece = 1; piece < cuts.length; piece++) {
          const startAt = cuts[piece - 1]!,
            endAt = cuts[piece]!,
            span = endAt - startAt;
          if (startAt >= bound || !(span > 0)) break;
          const start = motionTrackPosition(track, startAt),
            end = motionTrackPosition(track, endAt),
            rayFrom = interpolate(from, shortTo, startAt / duration),
            rayTo = interpolate(from, shortTo, endAt / duration),
            tolerance = falling ? SPATIAL_LIMITS.epsilon / 2 : 0;
          const fraction = movingBodyContact(
            rayFrom,
            rayTo,
            { ...start, y: start.y - tolerance },
            { ...end, y: end.y - tolerance },
            tolerance
              ? {
                  ...entry.profile,
                  radius: entry.profile.radius + tolerance,
                  height: entry.profile.height + 2 * tolerance,
                }
              : entry.profile,
          );
          countDomainWork('projectileExactTests');
          chargeWork({ tests: 1 });
          if (fraction !== undefined) bound = Math.min(bound, startAt + span * fraction);
          if (flight.encounters?.[passageLife(entry.entity)]) {
            const ordinary = entry.ordinary,
              epsilon = SPATIAL_LIMITS.epsilon;
            const envelope = movingBodyContactInterval(
              rayFrom,
              rayTo,
              { ...start, y: start.y - epsilon },
              { ...end, y: end.y - epsilon },
              { radius: ordinary.radius + epsilon, height: ordinary.height + 2 * epsilon },
            );
            if (envelope && envelope.exit < 1)
              bound = Math.min(bound, startAt + span * envelope.exit);
          }
          if (
            passages &&
            entry.passageDistance > 0 &&
            !flight.nearPassObservedLives?.[passageLife(entry.entity)]
          ) {
            const passage = projectilePassage(
              world,
              entry.entity,
              rayFrom,
              rayTo,
              start,
              end,
              entry.profile,
              span,
              entry.passageDistance,
            );
            if (passage) bound = Math.min(bound, startAt + passage.at);
          }
        }
      }
    }
  }
  return bound;
}
/** Share one indexed motion envelope among this interval's flights. Every exact contact
 * retains the admitted body extent; feet being below a ray cannot exclude the body. */
type ProjectileContact = { fraction: number; id: string; body?: Entity };
function finishProjectile(
  world: WorldState,
  flight: ProjectileFlight,
  contact: ProjectileContact | undefined,
  events: WorldEvent[],
): void {
  const id = flight.id;
  const source = entityGet(world.entities, flight.sourceId),
    target = contact?.body;
  // Injury can separate a player's living participant into a corpse. Capture
  // actual contact-time sight before that transition, without learning from it.
  const contactLife = target?.actor ? (target.actor.physicalLife ?? 0) : -1;
  const observedContact = !!target && !!source && seesEntity(world, source, target);
  const knownSource =
    target &&
    source?.actor &&
    (source.actor.physicalLife ?? 0) === flight.sourceLife &&
    seesEntity(world, target, source)
      ? source
      : undefined;
  let result = contact ? 'stopped' : 'missed';
  let damage = 0;
  let contactFacts: Record<string, number> | undefined;
  if (
    target?.actor?.alive &&
    activelyParticipates(target) &&
    flight.contactPolicy.response === 'injure-vulnerable-body'
  ) {
    // Release completed admission and human review. The actual current body supplies
    // susceptibility/defense; historical intention is never a damage allowlist.
    const impact = commitContactImpact(
      world,
      source,
      target,
      flight.injury *
        attackExecutionFactor(flight.execution, flight.execution?.score ?? 0, 'injury'),
      flight.actionId,
      events,
      { x: -flight.direction.x, y: -flight.direction.y, z: -flight.direction.z },
    );
    result = 'hit';
    damage = impact.damage;
    contactFacts = { ...impact };
    if (target.threat)
      noteTerritorialInjury(
        world,
        target,
        source?.actor && (source.actor.physicalLife ?? 0) === flight.sourceLife
          ? source
          : undefined,
        damage,
        events,
      );
  } else if (target?.practiceTarget && target.id === flight.targetId && flight.practice) {
    result = 'hit';
  }
  if (target) {
    // Contact is at the struck body. It does not identify an unseen shooter.
    emit(
      world,
      events,
      'projectile-contact',
      subjectNarration(target, [
        result === 'hit' ? BASE_RANGED_TEXT.contactHit : BASE_RANGED_TEXT.contactStopped,
        ...(knownSource
          ? [BASE_RANGED_TEXT.contactSource, person(knownSource.id, 'object'), '.']
          : []),
      ]),
      target,
      target.id,
      {
        projectileId: flight.id,
        contactLife,
        ...(knownSource
          ? { contactSourceId: knownSource.id, contactSourceLife: flight.sourceLife }
          : {}),
        incomingX: -flight.direction.x,
        incomingY: -flight.direction.y,
        incomingZ: -flight.direction.z,
        contactInjury: true,
        ...(contactFacts ? bodyPolicy(world)?.combat?.impactAttention : {}),
        damage,
        ...contactFacts,
        semanticTrigger: true,
      },
      'external',
      flight.position,
    );
  }
  emit(
    world,
    events,
    'projectile-ended',
    'A committed projectile terminated.',
    source,
    flight.targetId,
    {
      actionId: flight.actionId,
      projectileId: flight.id,
      sourceLife: flight.sourceLife,
      sourceId: flight.sourceId,
      sourceController: flight.sourceController,
      ...(flight.targetId ? { intendedTargetId: flight.targetId } : {}),
      targetLife: flight.targetLife ?? -1,
      ...(target ? { contactLife } : {}),
      incomingX: -flight.direction.x,
      incomingY: -flight.direction.y,
      incomingZ: -flight.direction.z,
      result,
      damage,
      importance: 8,
      ...contactFacts,
      ...(contact ? { interceptionId: contact.id } : {}),
      positionX: flight.position.x,
      positionY: flight.position.y,
      positionZ: flight.position.z,
    },
    'system',
    flight.position,
  );
  // Committed flight outlives its shooter; personal evidence belongs only to
  // that same participating physical life, never a corpse or a returned life.
  if (
    source?.actor?.alive &&
    activelyParticipates(source) &&
    (source.actor.physicalLife ?? 0) === flight.sourceLife
  ) {
    const selected = entityGet(world.entities, flight.targetId ?? '');
    const observedPoint = visionQuery(
      world,
      source,
    )({ id: flight.id, position: flight.position, height: 0 });
    // A miss has no contacted body. Preserve a witnessed outcome for the exact
    // selected life, without substituting an intervening body's identity or condition.
    const reported = observedContact ? target : selected;
    const observed =
      observedContact ||
      (!!selected &&
        (selected.actor?.physicalLife ?? 0) === (flight.targetLife ?? 0) &&
        seesEntity(world, source, selected) &&
        !!observedPoint);
    const reportedHit = observedContact && result === 'hit';

    emit(
      world,
      events,
      'shot-ended',
      observed
        ? subjectNarration(source, [
            reportedHit ? BASE_RANGED_TEXT.observedHit : BASE_RANGED_TEXT.observedNoInjury,
            person(reported!, 'object'),
            '.',
          ])
        : subjectNarration(
            source,
            observedPoint
              ? contact
                ? BASE_RANGED_TEXT.observedCover
                : BASE_RANGED_TEXT.observedRangeEnd
              : BASE_RANGED_TEXT.stopped,
          ),
      source,
      observed ? reported?.id : undefined,
      {
        actionId: flight.actionId,
        projectileId: flight.id,
        result: observedContact
          ? result
          : observedPoint
            ? contact
              ? 'stopped'
              : 'missed'
            : 'unobserved',
        ...(observedContact
          ? { damage, ...contactFacts, contactInjury: true, targetReference: true }
          : {}),
        semanticTrigger: true,
      },
      'private',
    );
    const occurrence = occurrenceFor(world, source.id, flight.actionId);
    if (occurrence?.release && observed) {
      occurrence.release.hit = reportedHit && target?.id === flight.targetId;
      if (
        observedContact &&
        target.id === flight.targetId &&
        projectAttributes(world, target, 'public').some((attribute) => attribute.bodyHealth)
      )
        occurrence.release.damage = damage;
    }
  }
  delete world.projectiles![id];
}
/** Current-time settlement is separate from positive travel: new endpoint releases,
 * shape changes and tied flights observe one actual world before time advances. */
export function settleProjectiles(world: WorldState, events: WorldEvent[]): boolean {
  let changed = false;
  for (const id of Object.keys(world.projectiles ?? {}).sort()) {
    const flight = world.projectiles?.[id];
    if (!flight) continue;
    for (;;) {
      const point = flight.position;
      let contact: ProjectileContact | undefined;
      const solid = rayHits(spatialMap(world), point, point, 'movement')[0];
      if (solid) contact = { fraction: 0, id: solid.id };
      const bodies = nearbyBodyEntities(world, point, 0);
      countDomainWork('projectileCurrentCandidates', bodies.length);
      for (const candidate of bodies) {
        // The neighborhood index may retain an unchanged ancestor snapshot.
        // Resolve identity through this transition before any contact mutation.
        const body = entityGet(world.entities, candidate.id);
        if (!body) continue;
        if ((!body.actor && !body.practiceTarget) || !activelyParticipates(body)) continue;
        const profile = effectiveBodyProfile(world, body),
          position = worldPosition(body);
        if (launchOverlap(flight, body, position, profile)) continue;
        // The shared spatial tolerance covers floating point contact roots and the
        // bounded falling-curve chord error; it never becomes a body exemption.
        const tolerance = SPATIAL_LIMITS.epsilon;
        const intersects =
          movingBodyContact(
            point,
            point,
            { ...position, y: position.y - tolerance },
            { ...position, y: position.y - tolerance },
            {
              ...profile,
              radius: profile.radius + tolerance,
              height: profile.height + 2 * tolerance,
            },
          ) !== undefined;
        chargeWork({ tests: 1 });
        if (intersects && (!contact || body.id.localeCompare(contact.id) < 0))
          contact = { fraction: 0, id: body.id, body };
      }
      const duck = contact?.body && tryLocalAvoidance(world, contact.body, flight, point, events);
      if (duck && contact?.body) {
        const body = contact.body;
        (flight.encounters ??= {})[passageLife(body)] = {
          bodyId: body.id,
          bodyLife: body.actor!.physicalLife ?? 0,
          enteredAt: world.simTime,
          poseOccurrenceId: duck.id,
        };
        changed = true;
        continue;
      }
      if (contact || flight.remainingRange <= SPATIAL_LIMITS.epsilon) {
        finishProjectile(world, flight, contact, events);
        changed = true;
      }
      break;
    }
  }
  for (const flight of Object.values(world.projectiles ?? {}))
    for (const [key, encounter] of Object.entries(flight.encounters ?? {})) {
      const body = entityGet(world.entities, encounter.bodyId);
      if (
        !body?.actor?.alive ||
        !activelyParticipates(body) ||
        (body.actor.physicalLife ?? 0) !== encounter.bodyLife
      ) {
        delete flight.encounters![key];
        changed = true;
        continue;
      }
      // Entry settlement includes the common spatial tolerance. A rounded point just
      // outside the ordinary capsule at that same instant is not a completed crossing.
      if (encounter.enteredAt === world.simTime) continue;
      const position = worldPosition(body);
      if (
        movingBodyContact(
          flight.position,
          flight.position,
          position,
          position,
          bodyProfile(body),
        ) !== undefined
      )
        continue;
      delete flight.encounters![key];
      changed = true;
      const text = rangedPolicy(world)?.localAvoidance?.clearedText;
      if (!text) continue;
      const witnesses = externalAudience(world, body);
      if (hasMemory(body) && !witnesses.includes(body.id)) witnesses.push(body.id);
      const observers = witnesses.filter((id) => {
        const observer = entityGet(world.entities, id);
        return (
          observer?.actor?.alive &&
          activelyParticipates(observer) &&
          seesEntity(world, observer, body) &&
          visionQuery(world, observer)({ position: flight.position, height: 0 })
        );
      });
      emitObservedOccurrence(
        world,
        events,
        'projectile-crossing-cleared',
        subjectNarration(body, text),
        observers,
        body,
        body.id,
        {
          projectileId: flight.id,
          bodyLife: encounter.bodyLife,
          poseOccurrenceId: encounter.poseOccurrenceId,
        },
        flight.position,
      );
    }
  return changed;
}
/** All preexisting flights receive only the globally admitted interval. Contact
 * prediction bounded that interval before any endpoint work; settlement then uses
 * current life, posture and defense, including newly released zero-time flights. */
export function advanceProjectiles(
  world: WorldState,
  before: ProjectileBodies,
  flightIds: readonly string[],
  seconds: number,
  events: WorldEvent[],
): void {
  if (seconds > 0 && flightIds.length) {
    const candidates = [...before.values()].map((entry) => ({
      ...entry,
      id: entry.entity.id,
      end: { ...worldPosition(entityGet(world.entities, entry.entity.id) ?? entry.entity) },
      passageDistance: nativePassageDistance(world, entry.entity),
    }));
    const extent = candidates.reduce(
      (max, entry) =>
        Math.max(
          max,
          entry.profile.height +
            entry.profile.radius +
            distance3D(entry.position, entry.end) +
            entry.passageDistance,
        ),
      0,
    );
    const query = spatialCandidates(candidates);
    for (const id of [...flightIds].sort()) {
      const flight = world.projectiles?.[id];
      if (!flight) continue;
      const travel = Math.min(flight.remainingRange, flight.speed * seconds),
        from = { ...flight.position },
        to = {
          x: from.x + flight.direction.x * travel,
          y: from.y + flight.direction.y * travel,
          z: from.z + flight.direction.z * travel,
        };
      for (const entry of query(interpolate(from, to, 0.5), travel / 2 + extent)) {
        if (
          !entry.entity.animal ||
          entry.passageDistance <= 0 ||
          flight.nearPassObservedLives?.[passageLife(entry.entity)]
        )
          continue;
        const actual = entityGet(world.entities, entry.id);
        if (!actual) continue;
        const passage = projectilePassage(
          world,
          actual,
          from,
          to,
          entry.position,
          entry.end,
          entry.profile,
          seconds,
          entry.passageDistance,
        );
        if (!passage) continue;
        (flight.nearPassObservedLives ??= {})[passageLife(actual)] = true;
        const profile = nativeResponseProfile(
          world,
          actual.animal!.episode?.profilePin ?? actual.animal!.profile,
        );
        if (!profile) continue;
        emit(
          world,
          events,
          'projectile-passage',
          subjectNarration(actual, profile.presentation.alarmed),
          actual,
          actual.id,
          {
            projectileId: flight.id,
            incomingX: -flight.direction.x,
            incomingY: -flight.direction.y,
            incomingZ: -flight.direction.z,
          },
          'external',
          passage.point,
        );
      }
      flight.position = to;
      flight.remainingRange = Math.max(0, flight.remainingRange - travel);
      flight.advancedAt = world.simTime;
      if (!flight.sourceExited) {
        const source = entityGet(world.entities, flight.sourceId);
        flight.sourceExited =
          !source ||
          !launchOverlap(
            flight,
            source,
            worldPosition(source),
            effectiveBodyProfile(world, source),
          );
      }
    }
  }
  settleProjectiles(world, events);
}

/** End only the unresolved observed crossing tied to this physical life. The
 * independently committed projectile still travels after departure or death. */
export function forgetProjectileBodyEncounters(
  world: WorldState,
  bodyId: string,
  physicalLife: number,
): void {
  const key = JSON.stringify([bodyId, physicalLife]);
  for (const flight of Object.values(world.projectiles ?? {}))
    if (flight.encounters?.[key]) delete flight.encounters[key];
}

export function validateRanged(world: WorldState): void {
  const vector = (v: WorldPoint) =>
    !!v && ['x', 'y', 'z'].every((key) => Number.isFinite(v[key as keyof WorldPoint]));
  for (const definition of Object.values(world.itemDefinitions)) {
    const rangedWeapon = definition.rangedWeapon;
    if (definition.execution !== undefined && !validAttackExecutionProfile(definition.execution))
      throw new Error('Invalid attack execution profile.');
    if (
      rangedWeapon &&
      (!Number.isFinite(rangedWeapon.flightSpeed) ||
        rangedWeapon.flightSpeed <= 0 ||
        !Number.isFinite(rangedWeapon.recoverySeconds) ||
        rangedWeapon.recoverySeconds < 0)
    )
      throw new Error('Invalid installed projectile speed.');
  }
  for (const entity of entityValues(world.entities)) {
    const action = entity.actor?.action;
    if (!action || !['hunt', 'practice-shot', 'aim', 'shoot-once'].includes(action.type)) continue;
    const aim = action.ranged;
    const hold = aim && world.resourceReservations?.[aim.reservationId];
    if (
      !aim ||
      !hasRecordFields(
        aim,
        ['sourceLife', 'tool', 'ammunition', 'reservationId', 'manual', 'ready'],
        ['observedMotion', 'aimTarget', 'aimPoint', 'aimPointSubject'],
      ) ||
      !!aim.aimPoint === !!aim.aimTarget ||
      (aim.aimTarget !== undefined && !validAimPointSubject(aim.aimTarget)) ||
      (aim.aimPoint !== undefined && !finitePoint(aim.aimPoint)) ||
      (aim.aimPointSubject !== undefined &&
        (!aim.aimPoint || !validAimPointSubject(aim.aimPointSubject))) ||
      (aim.observedMotion !== undefined &&
        (!hasRecordFields(aim.observedMotion, ['fromAt', 'at', 'from', 'to']) ||
          !Number.isFinite(aim.observedMotion.fromAt) ||
          !Number.isFinite(aim.observedMotion.at) ||
          aim.observedMotion.fromAt < 0 ||
          aim.observedMotion.fromAt >= aim.observedMotion.at ||
          aim.observedMotion.at > world.simTime ||
          !hasRecordFields(aim.observedMotion.from, ['x', 'y', 'z']) ||
          !hasRecordFields(aim.observedMotion.to, ['x', 'y', 'z']) ||
          !vector(aim.observedMotion.from) ||
          !vector(aim.observedMotion.to))) ||
      !Number.isSafeInteger(aim.sourceLife) ||
      aim.sourceLife !== (entity.actor!.physicalLife ?? 0) ||
      typeof aim.manual !== 'boolean' ||
      typeof aim.ready !== 'boolean' ||
      !isDefinitionPin(aim.tool) ||
      !isDefinitionPin(aim.ammunition) ||
      aim.manual !== (action.type === 'aim') ||
      (aim.ready && (!aim.manual || action.remainingSeconds !== 0 || action.stage !== 'working')) ||
      !action.weaponItemId ||
      !action.ammoItemId ||
      hold?.resource.kind !== 'item' ||
      (hold?.resource.kind === 'item' &&
        (hold.resource.itemId !== action.ammoItemId ||
          !sameDefinitionPin(hold.resource.definition, aim.ammunition))) ||
      !entityGet(world.entities, action.weaponItemId)?.item?.definitionPin ||
      !sameDefinitionPin(
        entityGet(world.entities, action.weaponItemId)!.item!.definitionPin,
        aim.tool,
      ) ||
      world.resourceReservations?.[aim.reservationId]?.actorId !== entity.id ||
      world.resourceReservations?.[aim.reservationId]?.amount !== 1 ||
      world.resourceReservations?.[aim.reservationId]?.resource.kind !== 'item' ||
      !isSafeRecordId(aim.reservationId) ||
      world.resourceReservations?.[aim.reservationId]?.invocationId !== action.id ||
      world.resourceReservations[aim.reservationId]!.state !== 'held'
    )
      throw new Error('Invalid held aim continuation.');
  }
  const releases = new Set<string>();
  for (const [id, flight] of Object.entries(world.projectiles ?? {})) {
    if (
      !hasRecordFields(
        flight,
        [
          'id',
          'actionId',
          'sourceId',
          'sourceLife',
          'sourceController',
          'contactPolicy',
          'sourceExited',
          'practice',
          'requiresLethalReview',
          'tool',
          'ammunition',
          'position',
          'direction',
          'launchedAt',
          'advancedAt',
          'speed',
          'remainingRange',
          'injury',
          'handling',
          'attackDigest',
        ],
        [
          'targetId',
          'targetLife',
          'lethalPermission',
          'nearPassObservedLives',
          'execution',
          'encounters',
        ],
      ) ||
      !Number.isFinite(flight.handling) ||
      flight.handling < 0 ||
      flight.handling > 1 ||
      (flight.execution !== undefined &&
        (!hasRecordFields(flight.execution, ['profile', 'score'], ['contact', 'injury']) ||
          !Number.isFinite(flight.execution.score) ||
          Math.abs(flight.execution.score) > 1 ||
          !validAttackExecutionProfile({
            profile: flight.execution.profile,
            contact: flight.execution.contact,
            injury: flight.execution.injury,
          }))) ||
      !isDefinitionPin(flight.tool) ||
      !isDefinitionPin(flight.ammunition) ||
      !flight.contactPolicy ||
      !hasRecordFields(flight.contactPolicy, ['pin', 'response']) ||
      !['injure-vulnerable-body', 'stop-only'].includes(flight.contactPolicy.response) ||
      (flight.contactPolicy.pin === null
        ? flight.contactPolicy.response !== 'stop-only'
        : !isDefinitionPin(flight.contactPolicy.pin)) ||
      (flight.lethalPermission !== undefined &&
        (!validLethalPermission(flight.lethalPermission) ||
          flight.lethalPermission.actorId !== flight.sourceId ||
          flight.lethalPermission.sourceLife !== flight.sourceLife ||
          (flight.targetId !== undefined &&
            ![flight.lethalPermission, ...(flight.lethalPermission.additionalTargets ?? [])].some(
              (permission) =>
                permission.targetId === flight.targetId &&
                (flight.targetLife === undefined || permission.targetLife === flight.targetLife),
            )))) ||
      releases.has(flight.actionId) ||
      flight.id !== id ||
      ![id, flight.actionId, flight.sourceId].every(isSafeRecordId) ||
      (flight.targetId !== undefined && !isSafeRecordId(flight.targetId)) ||
      !['player', 'npc', 'native'].includes(flight.sourceController) ||
      !Number.isSafeInteger(flight.sourceLife) ||
      flight.sourceLife < 0 ||
      !vector(flight.position) ||
      !vector(flight.direction) ||
      Math.abs(Math.hypot(flight.direction.x, flight.direction.y, flight.direction.z) - 1) > 1e-8 ||
      ![
        flight.launchedAt,
        flight.advancedAt,
        flight.speed,
        flight.remainingRange,
        flight.injury,
      ].every(Number.isFinite) ||
      flight.launchedAt < 0 ||
      flight.advancedAt < flight.launchedAt ||
      flight.advancedAt > world.simTime ||
      flight.speed <= 0 ||
      flight.remainingRange <= 0 ||
      flight.injury < 0 ||
      typeof flight.practice !== 'boolean' ||
      typeof flight.sourceExited !== 'boolean' ||
      typeof flight.requiresLethalReview !== 'boolean' ||
      typeof flight.attackDigest !== 'string' ||
      !flight.attackDigest ||
      (flight.practice || flight.targetId === undefined
        ? flight.targetLife !== undefined
        : !Number.isSafeInteger(flight.targetLife) || flight.targetLife! < 0)
    )
      throw new Error('Invalid committed projectile continuation.');
    if (flight.encounters !== undefined) {
      if (
        !flight.encounters ||
        typeof flight.encounters !== 'object' ||
        Array.isArray(flight.encounters)
      )
        throw new Error('Invalid projectile crossing encounters.');
      for (const [key, encounter] of Object.entries(flight.encounters)) {
        if (
          !hasRecordFields(encounter, ['bodyId', 'bodyLife', 'enteredAt', 'poseOccurrenceId']) ||
          !isSafeRecordId(encounter.bodyId) ||
          !Number.isSafeInteger(encounter.bodyLife) ||
          encounter.bodyLife < 0 ||
          !Number.isFinite(encounter.enteredAt) ||
          encounter.enteredAt < flight.launchedAt ||
          encounter.enteredAt > world.simTime ||
          !isSafeRecordId(encounter.poseOccurrenceId) ||
          key !== JSON.stringify([encounter.bodyId, encounter.bodyLife])
        )
          throw new Error('Invalid projectile crossing encounter.');
        const body = entityGet(world.entities, encounter.bodyId),
          pose = world.events.find((event) => event.id === encounter.poseOccurrenceId);
        if (
          !body?.actor?.alive ||
          !activelyParticipates(body) ||
          (body.actor.physicalLife ?? 0) !== encounter.bodyLife ||
          body.spatial.localPose?.startedAt !== encounter.enteredAt ||
          (pose &&
            (pose.type !== 'body-ducked' ||
              pose.at !== encounter.enteredAt ||
              pose.actorId !== body.id ||
              pose.data?.['projectileId'] !== flight.id))
        )
          throw new Error('Invalid projectile crossing identity.');
      }
    }
    if (flight.nearPassObservedLives !== undefined) {
      if (
        !flight.nearPassObservedLives ||
        typeof flight.nearPassObservedLives !== 'object' ||
        Array.isArray(flight.nearPassObservedLives)
      )
        throw new Error('Invalid projectile passage receipts.');
      for (const [key, seen] of Object.entries(flight.nearPassObservedLives)) {
        let parts: unknown;
        try {
          parts = JSON.parse(key);
        } catch {
          throw new Error('Invalid projectile passage identity.');
        }
        if (
          seen !== true ||
          !Array.isArray(parts) ||
          parts.length !== 2 ||
          !isSafeRecordId(parts[0]) ||
          !Number.isSafeInteger(parts[1]) ||
          parts[1] < 0
        )
          throw new Error('Invalid projectile passage receipt.');
      }
    }
    releases.add(flight.actionId);
  }
}
