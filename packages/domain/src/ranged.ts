import { entityGet, entityValues } from './entity-collection.js';
import {
  distance3D,
  interpolate,
  movingBodyContact,
  rayHits,
  type WorldPoint,
} from '@open-legend/spatial';
import { rangedTargetAllowed, rangedAccuracy, rangedPolicy } from './ranged-policy.js';
import { nextId } from './data.js';
import { emit, outcome } from './events.js';
import { subjectNarration, person } from './narration.js';
import { accessiblePossession } from './object-access.js';
import { itemFor } from './objects.js';
import { equippedItem } from './equipment.js';
import {
  attackFacts,
  attackPermissionProblem,
  attackReviewProblem,
  type LethalPermission,
} from './combat-consent.js';
import { bodyPolicy } from './body-policy.js';
import { bodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import { interactionAnchor, spatialCandidates } from './spatial.js';
import { seesEntity, visionQuery } from './perception.js';
import { activelyParticipates } from './participation-state.js';
import { commitContactImpact } from './contact-defense.js';
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
import { baseShotDirection, BASE_RANGED_TEXT } from './worlds/base/ranged-counterplay.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { rememberAttack } from './worlds/base/animal-behavior.js';
import { appraiseProjectileContact } from './worlds/base/appraisals.js';
import { flightTracks, motionTrackPosition, type MotionTrack } from './flight.js';
import { capabilityBlocked } from './status-capabilities.js';
import { TIME_EPSILON } from './simulation-time.js';
import { readOnlyDraftView } from './draft.js';
import type { Action, Entity, Outcome, WorldEvent, WorldState } from './types.js';

export interface AimState {
  sourceLife: number;
  tool: DefinitionPin;
  ammunition: DefinitionPin;
  reservationId: string;
  manual: boolean;
  ready: boolean;
}
export interface ProjectileFlight {
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
  targetId: string;
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
  };
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
    target = entityGet(world.entities, action.targetId ?? '');
  const tool = itemFor(world, action.weaponItemId ?? ''),
    ammo = itemFor(world, action.ammoItemId ?? '');
  const definition = tool && world.itemDefinitions[tool.definitionId],
    ammunition = ammo && world.itemDefinitions[ammo.definitionId];
  if (
    !aim ||
    aim.sourceLife !== (actor.actor?.physicalLife ?? 0) ||
    !definition?.launcher ||
    !Number.isFinite(definition.launcher.flightSpeed) ||
    definition.launcher.flightSpeed <= 0 ||
    !ammunition?.ammunition ||
    !sameDefinitionPin(aim.tool, definitionPin(definition)) ||
    !sameDefinitionPin(aim.ammunition, definitionPin(ammunition)) ||
    !accessiblePossession(world, actor.id, tool!.id) ||
    !equippedItem(world, actor.id, 'ranged', tool!.id) ||
    !accessiblePossession(world, actor.id, ammo!.id) ||
    availableItemQuantity(world, ammo!.id, action.id) < 1
  )
    return outcome(false, 'aim-unavailable', BASE_RANGED_TEXT.selectedChanged);
  if (!target || !seesEntity(world, actor, target))
    return outcome(false, 'not-visible', BASE_RANGED_TEXT.targetLost);
  if (distance3D(interactionAnchor(actor), interactionAnchor(target)) <= 1e-12)
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
    const permission = attackPermissionProblem(world, actor, target, action);
    if (permission) return permission;
  }
  if (
    action.stage === 'working' &&
    distance3D(interactionAnchor(actor), interactionAnchor(target)) > definition.launcher.range
  )
    return outcome(false, 'out-of-range', BASE_RANGED_TEXT.rangeLost);
  if (!release) return null;
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
        target,
        definition.launcher.range,
        handling.definition!.practice!,
      )
    : skipReview
      ? null
      : attackReviewProblem(world, actor, target, action);
}
export function releaseShot(
  world: WorldState,
  actor: Entity,
  action: Action,
  events: WorldEvent[],
): Outcome {
  const problem = aimProblem(world, actor, action, true);
  if (problem) return problem;
  const target = entityGet(world.entities, action.targetId!)!,
    tool = itemFor(world, action.weaponItemId!)!,
    ammo = itemFor(world, action.ammoItemId!)!;
  const definition = world.itemDefinitions[tool.definitionId]!,
    ammunition = world.itemDefinitions[ammo.definitionId]!,
    launcher = definition.launcher!;
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
  const origin = interactionAnchor(actor),
    point = interactionAnchor(target);
  const delta = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
  const steadiness = Math.max(
    0,
    Math.min(
      1,
      action.type === 'practice-shot'
        ? handling.accuracy
        : rangedAccuracy(world, target, handling.accuracy),
    ),
  );
  const direction = baseShotDirection(world, delta, bodyProfile(target).radius, steadiness);
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
        bodyProfile(actor),
      ) === undefined,
    targetId: target.id,
    ...(action.targetLife === undefined ? {} : { targetLife: action.targetLife }),
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
    speed: launcher.flightSpeed,
    remainingRange: launcher.range,
    injury: facts.injury,
  };
  (world.projectiles ??= {})[flight.id] = flight;
  const released = emit(
    world,
    events,
    'shot-released',
    subjectNarration(actor, BASE_RANGED_TEXT.released),
    actor,
    target.id,
    {
      actionId: action.id,
      projectileId: flight.id,
      ammunitionKind: launcher.ammunitionKind,
      quantity: 1,
      targetReference: true,
      semanticTrigger: true,
    },
  );
  const occurrence = occurrenceFor(world, actor.id, action.id);
  if (occurrence)
    occurrence.release = {
      eventId: released.id,
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
  if (target.animal && !target.threat && seesEntity(world, target, actor))
    rememberAttack(world, target, actor);
  releaseInvocationResources(world, action.id);
  return outcome(true, 'released', BASE_RANGED_TEXT.released);
}

export type ProjectileBodies = Map<
  string,
  { entity: Entity; position: WorldPoint; profile: ReturnType<typeof bodyProfile> }
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
  return new Map(
    bodyIds
      .flatMap((id) => entityGet(entities, id) ?? [])
      .filter((e) => activelyParticipates(e))
      .map((entity) => [
        entity.id,
        { entity, position: { ...worldPosition(entity) }, profile: { ...bodyProfile(entity) } },
      ]),
  );
}
function predictedPosition(world: WorldState, entity: Entity, seconds: number): WorldPoint {
  const from = worldPosition(entity),
    action = entity.actor?.action;
  if (action?.stage === 'approaching' && action.path.length) {
    const to = action.path[0]!;
    const distance = distance3D(from, to);
    return interpolate(
      from,
      to,
      distance > 0 ? Math.min(1, (nativeMovementSpeed(world, entity) * seconds) / distance) : 1,
    );
  }
  if (
    entity.animal?.danger &&
    entity.animal.escapeHeading !== null &&
    entity.animal.escapeHeading !== undefined
  ) {
    const travel = nativeMovementSpeed(world, entity, true) * seconds;
    return {
      x: from.x + Math.cos(entity.animal.escapeHeading) * travel,
      y: from.y,
      z: from.z + Math.sin(entity.animal.escapeHeading) * travel,
    };
  }
  return from;
}
/** Contacts become native time boundaries, rather than effects delayed until range expiry.
 * The actual swept movement still decides contact after the body/geometry owners advance. */
export function projectileBoundary(
  world: WorldState,
  before: ProjectileBodies,
  ids: readonly string[],
  seconds: number,
): number {
  const bodies = [...before.values()].map((entry) => {
    const restricted = capabilityBlocked(world, entry.entity, 'locomotion');
    const end =
      restricted || entry.entity.spatial.flight
        ? entry.position
        : predictedPosition(world, entry.entity, seconds);
    return {
      ...entry,
      end,
      restricted,
      extent:
        entry.profile.height +
        entry.profile.radius +
        (restricted
          ? 0
          : entry.entity.spatial.flight
            ? world.flightRoutes[entry.entity.spatial.flight.routeId]!.speed * seconds
            : distance3D(entry.position, end)),
      tracks: undefined as MotionTrack[] | undefined,
    };
  });
  const tracksFor = (entry: (typeof bodies)[number]): MotionTrack[] => {
    if (!entry.tracks) {
      entry.tracks = !entry.restricted ? flightTracks(world, entry.entity, seconds) : undefined;
      entry.tracks ??= [
        {
          at: [0, seconds],
          pose: [entry.position, entry.end],
        },
      ];
    }
    return entry.tracks;
  };
  const extent = bodies.reduce((maximum, entry) => Math.max(maximum, entry.extent), 0);
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
    if (solid) bound = Math.min(bound, Math.max(TIME_EPSILON, duration * solid.fraction));
    const midpoint = interpolate(from, to, 0.5);
    const candidates = query(midpoint, travel / 2 + extent).filter(
      (entry) => distance3D(midpoint, entry.position) <= travel / 2 + entry.extent + TIME_EPSILON,
    );
    // A chord cannot represent a corridor turn. Split only a nearby body's relevant
    // interval; distant birds keep their private turns and paths are prepared once.
    // docs/spatial-world.md#movement
    for (const entry of candidates)
      for (const track of tracksFor(entry))
        for (const at of track.at)
          if (at > TIME_EPSILON && at < duration - TIME_EPSILON) duration = at;
    bound = Math.min(bound, duration);
    const shortTo = interpolate(from, to, duration / (travel / flight.speed));
    for (const entry of candidates) {
      if (launchOverlap(flight, entry.entity, entry.position, entry.profile)) continue;
      for (const track of tracksFor(entry)) {
        const fraction = movingBodyContact(
          from,
          shortTo,
          entry.position,
          motionTrackPosition(track, duration),
          entry.profile,
        );
        chargeWork({ tests: 1 });
        if (fraction !== undefined)
          bound = Math.min(bound, Math.max(TIME_EPSILON, duration * fraction));
      }
    }
  }
  return bound;
}
/** Share one indexed motion envelope among this interval's flights. Every exact contact
 * retains the admitted body extent; feet being below a ray cannot exclude the body. */
export function advanceProjectiles(
  world: WorldState,
  before: ProjectileBodies,
  flightIds: readonly string[],
  seconds: number,
  events: WorldEvent[],
): void {
  if (!seconds || !flightIds.length) return;
  const candidates = [...before.values()].map((entry, order) => ({
    ...entry,
    id: entry.entity.id,
    order,
    end: { ...worldPosition(entityGet(world.entities, entry.entity.id) ?? entry.entity) },
  }));
  const maximum = candidates.reduce(
    (max, entry) =>
      Math.max(
        max,
        entry.profile.height + entry.profile.radius + distance3D(entry.position, entry.end),
      ),
    0,
  );
  const query = spatialCandidates(candidates);
  for (const id of [...flightIds].sort()) {
    const flight = world.projectiles?.[id];
    if (!flight) continue;
    const travel = Math.min(flight.remainingRange, flight.speed * seconds);
    const from = { ...flight.position },
      to = {
        x: from.x + flight.direction.x * travel,
        y: from.y + flight.direction.y * travel,
        z: from.z + flight.direction.z * travel,
      };
    let contact: { fraction: number; id: string; body?: Entity } | undefined;
    const solid = rayHits(spatialMap(world), from, to, 'movement')[0];
    if (solid) contact = { fraction: solid.fraction, id: solid.id };
    for (const entry of query(interpolate(from, to, 0.5), travel / 2 + maximum)) {
      if (launchOverlap(flight, entry.entity, entry.position, entry.profile)) continue;
      const fraction = movingBodyContact(from, to, entry.position, entry.end, entry.profile);
      chargeWork({ tests: 1 });
      if (
        fraction !== undefined &&
        (!contact ||
          fraction < contact.fraction ||
          (fraction === contact.fraction && entry.id.localeCompare(contact.id) < 0))
      )
        contact = { fraction, id: entry.id, body: entityGet(world.entities, entry.id) };
    }
    flight.position = interpolate(from, to, contact?.fraction ?? 1);
    flight.remainingRange = Math.max(0, flight.remainingRange - travel * (contact?.fraction ?? 1));
    flight.advancedAt = world.simTime;
    if (!flight.sourceExited) {
      const source = entityGet(world.entities, flight.sourceId);
      flight.sourceExited =
        !source || !launchOverlap(flight, source, worldPosition(source), bodyProfile(source));
    }
    if (!contact && flight.remainingRange > 1e-8) continue;
    const source = entityGet(world.entities, flight.sourceId),
      target = contact?.body;
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
        flight.injury,
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
          source?.actor?.physicalLife === flight.sourceLife ? source : undefined,
          damage,
          events,
        );
    } else if (target?.practiceTarget && target.id === flight.targetId && flight.practice) {
      result = 'hit';
    }
    if (target) {
      // Contact is at the struck body. It does not identify an unseen shooter.
      const contactEvent = emit(
        world,
        events,
        'projectile-contact',
        subjectNarration(
          target,
          result === 'hit' ? BASE_RANGED_TEXT.contactHit : BASE_RANGED_TEXT.contactStopped,
        ),
        target,
        target.id,
        {
          projectileId: flight.id,
          contactLife: target.actor?.physicalLife ?? -1,
          ...(source?.actor &&
          (source.actor.physicalLife ?? 0) === flight.sourceLife &&
          seesEntity(world, target, source)
            ? { contactSourceId: source.id, contactSourceLife: flight.sourceLife }
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
      if (
        source &&
        (source.actor?.physicalLife ?? 0) === flight.sourceLife &&
        seesEntity(world, target, source)
      )
        appraiseProjectileContact(world, contactEvent, source, target);
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
        intendedTargetId: flight.targetId,
        targetLife: flight.targetLife ?? -1,
        ...(target ? { contactLife: target.actor?.physicalLife ?? -1 } : {}),
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
      const selected = entityGet(world.entities, flight.targetId);
      const observedPoint = visionQuery(
        world,
        source,
      )({ id: flight.id, position: flight.position, height: 0 });
      // A miss has no contacted body. Preserve a witnessed outcome for the exact
      // selected life, without substituting an intervening body's identity or condition.
      const observedContact = !!target && seesEntity(world, source, target);
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
}
export function validateRanged(world: WorldState): void {
  for (const definition of Object.values(world.itemDefinitions)) {
    const launcher = definition.launcher;
    if (launcher && (!Number.isFinite(launcher.flightSpeed) || launcher.flightSpeed <= 0))
      throw new Error('Invalid installed projectile speed.');
  }
  for (const entity of entityValues(world.entities)) {
    const action = entity.actor?.action;
    if (!action || !['hunt', 'practice-shot', 'aim', 'shoot-once'].includes(action.type)) continue;
    const aim = action.ranged;
    const hold = aim && world.resourceReservations?.[aim.reservationId];
    if (
      !aim ||
      !hasRecordFields(aim, [
        'sourceLife',
        'tool',
        'ammunition',
        'reservationId',
        'manual',
        'ready',
      ]) ||
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
    const vector = (v: WorldPoint) =>
      !!v && ['x', 'y', 'z'].every((key) => Number.isFinite(v[key as keyof WorldPoint]));
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
          'targetId',
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
          'attackDigest',
        ],
        ['targetLife', 'lethalPermission'],
      ) ||
      !isDefinitionPin(flight.tool) ||
      !isDefinitionPin(flight.ammunition) ||
      !flight.contactPolicy ||
      !hasRecordFields(flight.contactPolicy, ['pin', 'response']) ||
      !['injure-vulnerable-body', 'stop-only'].includes(flight.contactPolicy.response) ||
      (flight.contactPolicy.pin === null
        ? flight.contactPolicy.response !== 'stop-only'
        : !isDefinitionPin(flight.contactPolicy.pin)) ||
      (flight.lethalPermission !== undefined &&
        (!hasRecordFields(flight.lethalPermission, [
          'actorId',
          'sourceLife',
          'targetId',
          'targetLife',
          'attackDigest',
        ]) ||
          flight.lethalPermission.actorId !== flight.sourceId ||
          flight.lethalPermission.sourceLife !== flight.sourceLife ||
          flight.lethalPermission.targetId !== flight.targetId ||
          flight.lethalPermission.targetLife !== flight.targetLife ||
          typeof flight.lethalPermission.attackDigest !== 'string' ||
          !flight.lethalPermission.attackDigest)) ||
      releases.has(flight.actionId) ||
      flight.id !== id ||
      ![id, flight.actionId, flight.sourceId, flight.targetId].every(isSafeRecordId) ||
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
      (flight.practice
        ? flight.targetLife !== undefined
        : !Number.isSafeInteger(flight.targetLife) || flight.targetLife! < 0)
    )
      throw new Error('Invalid committed projectile continuation.');
    releases.add(flight.actionId);
  }
}
