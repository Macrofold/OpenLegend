import { rangedPolicy } from './ranged-policy.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './definition-pins.js';
import { entityValues } from './entity-collection.js';
import { recordSemanticChange } from './dependencies.js';
import { isStatusDefinitionActive, statusDefinitions } from './status-capabilities.js';
import { assemblySpatialMap } from './assembly-geometry.js';
import { activelyParticipates } from './participation-state.js';
import { hasRecordFields, isImmutableData } from './records.js';
import { canonicalJson, contentLabel } from './events.js';
import { NATIVE_RESPONSE_LIMITS } from './native-response.js';
import {
  canFlySegment,
  canStand,
  finitePoint,
  horizontalDistance,
  distance3D,
  resolveSupport,
  surfaceById,
  SPATIAL_LIMITS,
  validateSpatialMap,
  type Bounds3,
  type BodyProfile,
  validateBodyProfile,
  type SpatialLayout,
  type SurfacePoint,
  type WorldPoint,
} from '@open-legend/spatial';
import type { Entity, WorldState } from './types.js';
import { current, isDraft } from 'immer';
import { readOnlyDraftView } from './draft.js';

export interface FlightProgress {
  routeId: string;
  next: number;
  waitSeconds: number;
  /** A finite admitted flight has actually reached supported rest. */
  atRest?: true;
  nativeLocomotion?: import('./native-response.js').NativeFlightLocomotion;
  awaitingChoice?: true;
  stopAtLanding?: true;
}
export interface FlightConnection {
  kind: 'landing' | 'transit';
  routeId: string;
  next: number;
}
const flightDigests = new WeakMap<FlightRoute, string>();
/** Reuse only exact deeply immutable definitions; authoring drafts and mutable
 * builders must see current corridor edits. No world or body is retained. */
export function flightRouteDigest(route: FlightRoute): string {
  const snapshot = isDraft(route) ? current(route) : route;
  const cached = flightDigests.get(snapshot);
  if (cached) return cached;
  const digest = contentLabel(canonicalJson(snapshot));
  if (isImmutableData(snapshot)) flightDigests.set(snapshot, digest);
  return digest;
}
export interface EntitySpatial {
  /** Ordinary shape, initialized from authored content and saved with this body.
   * The effective reader derives any admitted temporary local contraction. */
  body: BodyProfile;
  /** Authored inactive posture, if this body changes shape when its actor dies. */
  inactiveBody?: BodyProfile;
  /** A qualified non-solid exposed form, independent of rendered artwork. */
  softFootprint?: { width: number; length: number; height: number };
  heading: number;
  /** Native contraction pins its authored policy; geometry remains derived, never duplicated. */
  localPose?: {
    kind: 'duck';
    profile: DefinitionPin;
    physicalLife: number;
    startedAt: number;
    restoreAt: number;
    phase: 'holding' | 'restore-blocked';
  };
  localAvoidanceReadyAt?: number;
  /** A native flight routine is saved work; it never grants a capability from sprite artwork. */
  flight?: FlightProgress;
  fallVelocity?: number;
}
export interface FlightRoute {
  id: string;
  body: BodyProfile;
  speed: number;
  climbSpeed: number;
  continuation:
    | { kind: 'loop' }
    | { kind: 'land'; resumeRouteId?: string }
    | { kind: 'join'; routeId: string; next: number };
  responseConnections?: FlightConnection[];
  points: Array<{ position: WorldPoint; landingSurfaceId?: string; waitSeconds: number }>;
}
export type Placement =
  | {
      mode: 'world';
      position: WorldPoint;
      supportSurfaceId: string | null;
      revision: number;
      motionContinuityRevision?: number;
    }
  | { mode: 'contained'; parentEntityId: string; revision: number }
  | { mode: 'attached'; parentEntityId: string; portId: string; revision: number }
  | ({
      mode: 'attached';
      parentEntityId: string;
      revision: number;
    } & import('./assembly-types.js').AssemblyAttachment);
/** Registered assembly attachments have local part coordinates; equipment ports do not. */
export function isAssemblyPlacement(
  placement: Placement | undefined,
): placement is Extract<Placement, import('./assembly-types.js').AssemblyAttachment> {
  return (
    !!placement &&
    placement.mode === 'attached' &&
    placement.portId === 'assembly' &&
    'slot' in placement &&
    'local' in placement
  );
}
export function worldPlacement(
  point: WorldPoint,
  supportSurfaceId: string | null = 'terrain',
): Placement {
  return {
    mode: 'world',
    position: { x: point.x, y: point.y, z: point.z },
    supportSurfaceId,
    revision: 0,
  };
}
export function groundedSpatial(body: BodyProfile): EntitySpatial {
  return { body: { ...body }, heading: 0 };
}
export function hasWorldPlacement(entity: Entity | undefined): boolean {
  return !!entity && !entity.retirement && entity.placement?.mode === 'world';
}
/** Native spatial consumers admit exposed roots before reading geometry. Containment
 * resolution is a separate bounded read; contained objects never acquire fake XYZ state. */
export function worldPosition(entity: Entity): WorldPoint;
export function worldPosition(entity: Entity | undefined): WorldPoint | undefined;
export function worldPosition(entity: Entity | undefined): WorldPoint | undefined {
  if (!entity) return undefined;
  const placement = entity.placement;
  if (placement?.mode !== 'world')
    throw new Error('This object has no independent world position.');
  return placement.position;
}
export function worldSupport(entity: Entity | undefined): string | null {
  const stored = entity && readOnlyDraftView(entity).placement;
  const placement = stored && readOnlyDraftView(stored);
  return placement?.mode === 'world' ? placement.supportSurfaceId : null;
}
export function bodyProfile(entity: Entity): BodyProfile {
  entity = readOnlyDraftView(entity);
  const spatial = readOnlyDraftView(entity.spatial);
  const actor = entity.actor && readOnlyDraftView(entity.actor);
  const base = actor && !actor.alive && spatial.inactiveBody ? spatial.inactiveBody : spatial.body;
  // Navigation requests and reusable reads must never retain a live Immer proxy.
  const resolved = isDraft(base) ? current(base) : base;
  const storedForm = spatial.softFootprint;
  const form = storedForm && readOnlyDraftView(storedForm);
  return form
    ? {
        ...resolved,
        radius: Math.max(form.width, form.length) / 2,
        height: form.height,
        eyeHeight: form.height,
        earHeight: form.height,
        interactionHeight: form.height,
      }
    : resolved;
}
/** Actual shared capsule and anchors. Route admission deliberately retains bodyProfile. */
export function effectiveBodyProfile(world: WorldState, entity: Entity): BodyProfile {
  const ordinary = bodyProfile(entity),
    pose = entity.spatial.localPose;
  if (!pose || !entity.actor?.alive || pose.physicalLife !== (entity.actor.physicalLife ?? 0))
    return ordinary;
  const policy = rangedPolicy(world),
    response = policy?.localAvoidance;
  if (!policy || !response || !sameDefinitionPin(pose.profile, definitionPin(policy)))
    return ordinary;
  const height = Math.max(
      2 * ordinary.radius + SPATIAL_LIMITS.epsilon,
      response.heightFactor * ordinary.height,
    ),
    ratio = height / ordinary.height;
  return {
    ...ordinary,
    height,
    eyeHeight: ordinary.eyeHeight * ratio,
    earHeight: ordinary.earHeight * ratio,
    interactionHeight: ordinary.interactionHeight * ratio,
  };
}
/** Shape changes share spatial invalidation/revision with placement; they never move feet. */
export function spatialShapeChanged(world: WorldState, entity: Entity): void {
  const placement = entity.placement;
  if (placement?.mode !== 'world' || !Number.isSafeInteger(placement.revision + 1))
    throw new Error('Invalid spatial shape revision.');
  const position = worldPosition(entity);
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: entity.id,
    before: position,
    after: position,
  });
  placement.revision++;
}
export function sameBodyProfile(a: BodyProfile, b: BodyProfile): boolean {
  return (
    a.id === b.id &&
    a.radius === b.radius &&
    a.height === b.height &&
    a.maxSlope === b.maxSlope &&
    a.eyeHeight === b.eyeHeight &&
    a.earHeight === b.earHeight &&
    a.interactionHeight === b.interactionHeight
  );
}
export function supportedPosition(entity: Entity): SurfacePoint | null {
  const surfaceId = worldSupport(entity);
  return surfaceId === null ? null : { ...worldPosition(entity), surfaceId };
}
/** All positional writers use this assignment boundary after their native geometry checks.
 * Appearance and animation never write it. docs/spatial-world.md#what-a-location-means
 */
export function setSpatialPosition(
  world: WorldState,
  entity: Entity,
  point: WorldPoint,
  supportSurfaceId: string | null,
  movement?: { steps?: number; heading?: number; continuity?: 'physical' | 'relocation' },
): void {
  if (!finitePoint(point)) throw new Error('Invalid authoritative position.');
  const before = worldPosition(entity),
    dx = point.x - before.x,
    dz = point.z - before.z,
    heading =
      movement?.heading ??
      (Math.hypot(dx, dz) > 1e-8 ? Math.atan2(dx, dz) : entity.spatial.heading),
    steps = movement?.steps ?? 1,
    placement = entity.placement;
  if (
    placement?.mode !== 'world' ||
    !Number.isSafeInteger(placement.revision + steps) ||
    !Number.isSafeInteger(steps) ||
    steps < 1 ||
    !Number.isFinite(heading)
  )
    throw new Error('Invalid spatial placement revision.');
  const changed =
    point.x !== before.x ||
    point.y !== before.y ||
    point.z !== before.z ||
    supportSurfaceId !== placement.supportSurfaceId;
  if (!changed && !movement) {
    if (heading !== entity.spatial.heading) entity.spatial.heading = heading;
    return;
  }
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: entity.id,
    before,
    after: point,
    ...(movement?.continuity === 'physical' ? {} : { discontinuity: true as const }),
  });
  // One owned placement avoids proxy writes at every waypoint. Keep the physical
  // component attached: flight/fall controllers may hold its mutable progress.
  // Previously published poses stay immutable through the existing draft owner.
  // docs/projects/performance-overhaul/animal-execution.md#42-current-read-views-and-cheaper-physical-writes
  entity.placement = {
    ...readOnlyDraftView(placement),
    position: { x: point.x, y: point.y, z: point.z },
    supportSurfaceId,
    revision: placement.revision + steps,
    motionContinuityRevision:
      movement?.continuity === 'physical'
        ? placement.motionContinuityRevision
        : placement.revision + steps,
  };
  if (heading !== entity.spatial.heading) entity.spatial.heading = heading;
  releaseGroundedFlight(entity);
}

/** A newly chosen ground approach or actual relocation replaces a finished
 * perched routine; its old route cannot restart from a different ground point. */
export function releaseGroundedFlight(entity: Entity, approaching = false): void {
  if (entity.spatial.flight?.atRest || (approaching && worldSupport(entity) !== null))
    delete entity.spatial.flight;
}
/** Unchanged Immer map branches reuse derived geometry/navigation caches. A modified candidate
 * receives its own snapshot; querying an original map would ignore uncommitted geometry edits. */
export const spatialMap = (world: WorldState) =>
  assemblySpatialMap(world, isDraft(world.map) ? current(world.map) : world.map);

export { starterSpatialLayout, starterFlightRoutes } from './worlds/base/spatial.js';

export function validateSpatialWorld(world: WorldState): void {
  const map = spatialMap(world);
  // A later wall can obstruct an authored corridor without corrupting its
  // definition. Flight execution checks current sweeps and landing clearance;
  // saved definitions retain their original world geometry requirements.
  const flightMap = world.map;
  validateSpatialMap(map);
  if (!world.flightRoutes) throw new Error('Invalid flight route registry.');
  for (const [routeId, route] of Object.entries(world.flightRoutes)) {
    if (
      !route ||
      typeof route.id !== 'string' ||
      route.id !== routeId ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(route.id) ||
      ['constructor', 'prototype', '__proto__'].includes(route.id) ||
      route.id.length > 120 ||
      !Number.isFinite(route.speed) ||
      route.speed <= 0 ||
      route.speed > 1 ||
      !Number.isFinite(route.climbSpeed) ||
      route.climbSpeed <= 0 ||
      route.climbSpeed > route.speed ||
      !route.continuation ||
      !['loop', 'land', 'join'].includes(route.continuation.kind) ||
      !hasRecordFields(
        route.continuation,
        route.continuation.kind === 'join' ? ['kind', 'routeId', 'next'] : ['kind'],
        route.continuation.kind === 'land' ? ['resumeRouteId'] : [],
      ) ||
      !Array.isArray(route.points) ||
      route.points.length < 2 ||
      route.points.some(
        (p) =>
          !finitePoint(p.position) ||
          !Number.isFinite(p.waitSeconds) ||
          p.waitSeconds < 0 ||
          p.waitSeconds > 86400 ||
          (p.landingSurfaceId !== undefined &&
            !resolveSupport(flightMap, p.position, p.landingSurfaceId)),
      )
    )
      throw new Error('Invalid native flight route.');
    validateBodyProfile(route.body);
    const connections = route.responseConnections;
    if (connections !== undefined) {
      if (
        !Array.isArray(connections) ||
        connections.length + 1 > NATIVE_RESPONSE_LIMITS.maximumCandidates ||
        new Set(
          connections.map((connection) =>
            JSON.stringify([connection.kind, connection.routeId, connection.next]),
          ),
        ).size !== connections.length
      )
        throw new Error('Invalid native flight connections.');
      for (const connection of connections) {
        const destination =
          typeof connection.routeId === 'string' &&
          Object.hasOwn(world.flightRoutes, connection.routeId)
            ? world.flightRoutes[connection.routeId]
            : undefined;
        if (
          !hasRecordFields(connection, ['kind', 'routeId', 'next']) ||
          !destination ||
          !sameBodyProfile(route.body, destination.body) ||
          !Number.isSafeInteger(connection.next) ||
          connection.next < 0 ||
          connection.next >= destination.points.length ||
          !['landing', 'transit'].includes(connection.kind) ||
          (connection.kind === 'landing'
            ? destination.continuation.kind !== 'land'
            : destination.points[connection.next]!.landingSurfaceId !== undefined)
        )
          throw new Error('Invalid native flight connection target.');
      }
    }
    for (const point of route.points)
      if (
        point.landingSurfaceId &&
        !canStand(flightMap, { ...point.position, surfaceId: point.landingSurfaceId }, route.body)
      )
        throw new Error('Flight landing has no valid stance.');
    const terminal = route.points.at(-1)!;
    if (route.continuation.kind === 'land') {
      if (!terminal.landingSurfaceId || terminal.waitSeconds !== 0)
        throw new Error('A finite flight must end at supported rest.');
      const resumeId = route.continuation.resumeRouteId,
        resume =
          typeof resumeId === 'string' && Object.hasOwn(world.flightRoutes, resumeId)
            ? world.flightRoutes[resumeId]
            : undefined;
      if (
        resumeId !== undefined &&
        (!resume ||
          !sameBodyProfile(route.body, resume.body) ||
          !resume.points.length ||
          distance3D(terminal.position, resume.points[0]!.position) > SPATIAL_LIMITS.epsilon ||
          terminal.landingSurfaceId !== resume.points[0]!.landingSurfaceId)
      )
        throw new Error('A resting flight continuation must begin on its actual perch.');
    } else if (route.continuation.kind === 'join') {
      const join = route.continuation,
        destination =
          typeof join.routeId === 'string' && Object.hasOwn(world.flightRoutes, join.routeId)
            ? world.flightRoutes[join.routeId]
            : undefined,
        previous =
          destination?.points[join.next === 0 ? destination.points.length - 1 : join.next - 1];
      if (
        terminal.landingSurfaceId !== undefined ||
        !destination ||
        !sameBodyProfile(route.body, destination.body) ||
        !Number.isSafeInteger(join.next) ||
        join.next < 0 ||
        join.next >= destination.points.length ||
        (join.next === 0 && destination.continuation.kind !== 'loop') ||
        !previous ||
        distance3D(terminal.position, previous.position) > SPATIAL_LIMITS.epsilon ||
        terminal.landingSurfaceId !== previous.landingSurfaceId
      )
        throw new Error('A flight join must retain its exact physical position and support.');
    }
    const edgeCount = route.points.length - (route.continuation.kind === 'loop' ? 0 : 1);
    for (let index = 0; index < edgeCount; index++) {
      const from = route.points[index]!,
        to = route.points[(index + 1) % route.points.length]!;
      // This small family uses vertical takeoff/landing and prevalidated public corridors.
      // Other profiles need their own traversal policy; an arbitrary link cannot teleport.
      if (
        (from.landingSurfaceId || to.landingSurfaceId) &&
        horizontalDistance(from.position, to.position) > 1e-5
      )
        throw new Error('Native takeoff and landing must be vertical.');
      if (
        !canFlySegment(
          flightMap,
          from.position,
          to.position,
          route.body,
          [from.landingSurfaceId, to.landingSurfaceId].filter((id): id is string => !!id),
        )
      )
        throw new Error('Flight corridor intersects geometry.');
    }
  }
  for (const entity of entityValues(world.entities)) {
    validateBodyProfile(entity.spatial?.body);
    if (entity.spatial.inactiveBody !== undefined) validateBodyProfile(entity.spatial.inactiveBody);
    const s = entity.spatial,
      pose = s.localPose,
      policy = rangedPolicy(world),
      response = policy?.localAvoidance;
    if (
      s.localAvoidanceReadyAt !== undefined &&
      (!entity.actor?.alive ||
        !Number.isFinite(s.localAvoidanceReadyAt) ||
        s.localAvoidanceReadyAt < 0)
    )
      throw new Error('Invalid local response cooldown.');
    if (
      pose !== undefined &&
      (!hasRecordFields(pose, [
        'kind',
        'profile',
        'physicalLife',
        'startedAt',
        'restoreAt',
        'phase',
      ]) ||
        !entity.actor?.alive ||
        !activelyParticipates(entity) ||
        !!s.softFootprint ||
        pose.kind !== 'duck' ||
        !Number.isSafeInteger(pose.physicalLife) ||
        pose.physicalLife !== (entity.actor.physicalLife ?? 0) ||
        !isDefinitionPin(pose.profile) ||
        !policy ||
        !sameDefinitionPin(pose.profile, definitionPin(policy)) ||
        !response?.bodyProfiles.includes(bodyProfile(entity).id) ||
        ![pose.startedAt, pose.restoreAt].every(Number.isFinite) ||
        pose.startedAt < 0 ||
        pose.startedAt > world.simTime ||
        pose.restoreAt !== pose.startedAt + response.holdSeconds ||
        s.localAvoidanceReadyAt !== pose.startedAt + response.cooldownSeconds ||
        !['holding', 'restore-blocked'].includes(pose.phase) ||
        (pose.phase === 'holding'
          ? pose.restoreAt < world.simTime
          : pose.restoreAt > world.simTime))
    )
      throw new Error('Invalid native local posture.');
    if (
      entity.retirement ||
      entity.assembly?.retired ||
      entity.placement?.mode === 'contained' ||
      entity.placement?.mode === 'attached'
    )
      continue;
    if (
      s?.softFootprint &&
      (entity.actor ||
        entity.kind !== 'item-pile' ||
        ![s.softFootprint.width, s.softFootprint.length, s.softFootprint.height].every(
          (v) => Number.isFinite(v) && v > 0 && v <= 1,
        ))
    )
      throw new Error('Invalid non-solid material form.');
    if (
      !finitePoint(worldPosition(entity)) ||
      !s ||
      !Number.isFinite(s.heading) ||
      (activelyParticipates(entity) &&
        worldSupport(entity) !== null &&
        !resolveSupport(map, worldPosition(entity), worldSupport(entity)!))
    )
      throw new Error(
        `Invalid spatial state for ${entity.id}. A current 3D-format world is required.`,
      );
    if (
      s.fallVelocity !== undefined &&
      (!Number.isFinite(s.fallVelocity) ||
        s.fallVelocity > 0 ||
        s.fallVelocity < -100 ||
        worldSupport(entity) !== null ||
        !!s.flight)
    )
      throw new Error('Invalid falling state.');
    if (worldSupport(entity) === null && !s.flight && s.fallVelocity === undefined)
      throw new Error('Unsupported airborne state.');
    if (s.flight) {
      const route = Object.hasOwn(world.flightRoutes, s.flight.routeId)
        ? world.flightRoutes[s.flight.routeId]
        : undefined;
      if (
        !hasRecordFields(
          s.flight,
          ['routeId', 'next', 'waitSeconds'],
          ['atRest', 'nativeLocomotion', 'awaitingChoice', 'stopAtLanding'],
        ) ||
        !route ||
        !sameBodyProfile(bodyProfile(entity), route.body) ||
        !Number.isSafeInteger(s.flight.next) ||
        s.flight.next < 0 ||
        s.flight.next >= route.points.length ||
        !Number.isFinite(s.flight.waitSeconds) ||
        s.flight.waitSeconds < 0 ||
        s.flight.waitSeconds > 86400 ||
        (s.flight.awaitingChoice !== undefined &&
          (s.flight.awaitingChoice !== true ||
            !s.flight.nativeLocomotion ||
            !!s.flight.atRest ||
            !!s.flight.stopAtLanding)) ||
        (s.flight.stopAtLanding !== undefined && s.flight.stopAtLanding !== true) ||
        (s.flight.atRest !== undefined &&
          (s.flight.atRest !== true ||
            (route.continuation.kind === 'land' &&
              !s.flight.stopAtLanding &&
              s.flight.next !== route.points.length - 1) ||
            s.flight.waitSeconds !== 0 ||
            worldSupport(entity) !== route.points[s.flight.next]!.landingSurfaceId ||
            distance3D(worldPosition(entity), route.points[s.flight.next]!.position) >
              SPATIAL_LIMITS.epsilon))
      )
        throw new Error('Invalid flight progress.');
    }
    if (entity.actor?.action) {
      const a = entity.actor.action;
      if (
        a.path.length > SPATIAL_LIMITS.maxPathPoints ||
        a.path.some((p) => !finitePoint(p) || !resolveSupport(map, p, p.surfaceId))
      )
        throw new Error('Invalid saved spatial route.');
      if (
        a.motionSampleRemainingMetres !== undefined &&
        (a.type !== 'move' ||
          a.stage !== 'approaching' ||
          !Number.isFinite(a.motionSampleRemainingMetres) ||
          a.motionSampleRemainingMetres <= 0)
      )
        throw new Error('Invalid saved movement sampling progress.');
      // Pending preparation is saved intent, never a saved WASM ref or worker handle.
      // Old geometry may legitimately await replanning; bound/validate its plain data here.
      if (a.navigation) {
        const request = a.navigation.request;
        if (
          !request ||
          (request.wait !== undefined && !['world', 'entity'].includes(request.wait)) ||
          !finitePoint(request.from) ||
          typeof request.from.surfaceId !== 'string' ||
          !Number.isSafeInteger(request.geometryRevision) ||
          request.geometryRevision < 0 ||
          request.outsideBounds !== undefined ||
          !Array.isArray(request.destinations) ||
          !request.destinations.length ||
          request.destinations.length > 12 ||
          request.destinations.some(
            (p) => !finitePoint(p) || typeof p.surfaceId !== 'string' || p.surfaceId.length > 120,
          ) ||
          !request.body ||
          !sameBodyProfile(request.body, bodyProfile(entity)) ||
          (a.navigation.failure !== undefined &&
            (typeof a.navigation.failure !== 'string' || a.navigation.failure.length > 300))
        )
          throw new Error('Invalid saved navigation request.');
      }
      if (
        a.replans !== undefined &&
        (!Number.isSafeInteger(a.replans) || a.replans < 0 || a.replans > 2)
      )
        throw new Error('Invalid saved navigation retry count.');
      if (a.destination && !resolveSupport(map, a.destination, a.destination.surfaceId))
        throw new Error('Invalid saved spatial destination.');
    }
  }
}

/** Full occupied posture for construction/rest clearance; locomotion keeps its existing body owner. */
export function bodySpace(
  world: WorldState,
  entity: Entity,
  horizontal = statusDefinitions(world).some(
    (d) => d.presentation?.pose === 'horizontal' && isStatusDefinitionActive(entity, d.id),
  ),
  heading = entity.spatial.heading,
  margin = 0,
): Bounds3 {
  const point = worldPosition(entity),
    profile = effectiveBodyProfile(world, entity);
  const width = profile.radius * 2 + margin * 2,
    length = (horizontal ? profile.height : profile.radius * 2) + margin * 2;
  // Upright bodies have a round footprint. Rotating its bounding square would
  // enlarge occupancy when a builder turns and invalidate an admitted stance.
  // A horizontal body's longer footprint really does rotate with its heading.
  const x = horizontal
    ? (Math.abs(Math.cos(heading)) * width + Math.abs(Math.sin(heading)) * length) / 2
    : width / 2;
  const z = horizontal
    ? (Math.abs(Math.sin(heading)) * width + Math.abs(Math.cos(heading)) * length) / 2
    : width / 2;
  return {
    min: { x: point.x - x, y: point.y, z: point.z - z },
    max: {
      x: point.x + x,
      y: point.y + (horizontal ? profile.radius * 2 : profile.height),
      z: point.z + z,
    },
  };
}
