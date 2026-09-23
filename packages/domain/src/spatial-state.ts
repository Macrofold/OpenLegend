import {
  BODY_PROFILES,
  canFlySegment,
  canStand,
  finitePoint,
  horizontalDistance,
  resolveSupport,
  surfaceById,
  SPATIAL_LIMITS,
  validateSpatialMap,
  type BodyProfileId,
  type SpatialLayout,
  type SurfacePoint,
  type WorldPoint,
} from '@open-legend/spatial';
import type { Entity, WorldState } from './types.js';
import { current, isDraft } from 'immer';

export interface FlightProgress {
  routeId: string;
  next: number;
  waitSeconds: number;
}
export interface EntitySpatial {
  bodyProfileId: BodyProfileId;
  heading: number;
  supportSurfaceId: string | null;
  /** A native flight routine is saved work; it never grants a capability from sprite artwork. */
  flight?: FlightProgress;
  fallVelocity?: number;
}
export interface FlightRoute {
  id: string;
  speed: number;
  climbSpeed: number;
  points: Array<{ position: WorldPoint; landingSurfaceId?: string; waitSeconds: number }>;
}
export function groundedSpatial(
  bodyProfileId: BodyProfileId = 'person',
  supportSurfaceId = 'terrain',
): EntitySpatial {
  return { bodyProfileId, supportSurfaceId, heading: 0 };
}
export function bodyProfile(entity: Entity) {
  const profile = BODY_PROFILES[entity.spatial.bodyProfileId];
  return entity.actor && !entity.actor.alive
    ? {
        ...profile,
        height: Math.min(0.3, profile.height),
        eyeHeight: 0.15,
        earHeight: 0.15,
        interactionHeight: 0.15,
      }
    : profile;
}
export function supportedPosition(entity: Entity): SurfacePoint | null {
  const surfaceId = entity.spatial.supportSurfaceId;
  return surfaceId === null ? null : { ...entity.position, surfaceId };
}
/** All positional writers use this assignment boundary after their native geometry checks.
 * Appearance and animation never write it. docs/spatial-world.md#what-a-location-means
 */
export function setSpatialPosition(
  entity: Entity,
  point: WorldPoint,
  supportSurfaceId: string | null,
): void {
  if (!finitePoint(point)) throw new Error('Invalid authoritative position.');
  const dx = point.x - entity.position.x,
    dz = point.z - entity.position.z;
  if (Math.hypot(dx, dz) > 1e-8) entity.spatial.heading = Math.atan2(dx, dz);
  entity.position = { x: point.x, y: point.y, z: point.z };
  entity.spatial.supportSurfaceId = supportSurfaceId;
}
/** Unchanged Immer map branches reuse derived geometry/navigation caches. A modified candidate
 * receives its own snapshot; querying an original map would ignore uncommitted geometry edits. */
export const spatialMap = (world: WorldState) =>
  isDraft(world.map) ? current(world.map) : world.map;

export { starterSpatialLayout, starterFlightRoutes } from './worlds/base/spatial.js';

export function validateSpatialWorld(world: WorldState): void {
  const map = spatialMap(world);
  validateSpatialMap(map);
  if (!world.flightRoutes || Object.keys(world.flightRoutes).length > 16)
    throw new Error('Invalid flight route registry.');
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
      !Array.isArray(route.points) ||
      route.points.length < 2 ||
      route.points.length > 32 ||
      route.points.some(
        (p) =>
          !finitePoint(p.position) ||
          !Number.isFinite(p.waitSeconds) ||
          p.waitSeconds < 0 ||
          p.waitSeconds > 86400 ||
          (p.landingSurfaceId !== undefined &&
            !resolveSupport(map, p.position, p.landingSurfaceId)),
      )
    )
      throw new Error('Invalid native flight route.');
    for (let index = 0; index < route.points.length; index++) {
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
          map,
          from.position,
          to.position,
          BODY_PROFILES.bird,
          [from.landingSurfaceId, to.landingSurfaceId].filter((id): id is string => !!id),
        )
      )
        throw new Error('Flight corridor intersects geometry.');
      if (
        to.landingSurfaceId &&
        !canStand(map, { ...to.position, surfaceId: to.landingSurfaceId }, BODY_PROFILES.bird)
      )
        throw new Error('Flight landing has no valid stance.');
    }
  }
  for (const entity of Object.values(world.entities)) {
    const s = entity.spatial;
    if (
      !finitePoint(entity.position) ||
      !s ||
      !Object.hasOwn(BODY_PROFILES, s.bodyProfileId) ||
      !Number.isFinite(s.heading) ||
      (s.supportSurfaceId !== null && !resolveSupport(map, entity.position, s.supportSurfaceId))
    )
      throw new Error(
        `Invalid spatial state for ${entity.id}. A current 3D-format world is required.`,
      );
    if (
      s.fallVelocity !== undefined &&
      (!Number.isFinite(s.fallVelocity) ||
        s.fallVelocity > 0 ||
        s.fallVelocity < -100 ||
        s.supportSurfaceId !== null ||
        !!s.flight)
    )
      throw new Error('Invalid falling state.');
    if (s.supportSurfaceId === null && !s.flight && s.fallVelocity === undefined)
      throw new Error('Unsupported airborne state.');
    if (s.flight) {
      const route = Object.hasOwn(world.flightRoutes, s.flight.routeId)
        ? world.flightRoutes[s.flight.routeId]
        : undefined;
      if (
        s.bodyProfileId !== 'bird' ||
        !route ||
        !Number.isSafeInteger(s.flight.next) ||
        s.flight.next < 0 ||
        s.flight.next >= route.points.length ||
        !Number.isFinite(s.flight.waitSeconds) ||
        s.flight.waitSeconds < 0 ||
        s.flight.waitSeconds > 86400
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
      // Pending preparation is saved intent, never a saved WASM ref or worker handle.
      // Old geometry may legitimately await replanning; bound/validate its plain data here.
      if (a.navigation) {
        const request = a.navigation.request;
        if (
          !request ||
          !finitePoint(request.from) ||
          typeof request.from.surfaceId !== 'string' ||
          !Number.isSafeInteger(request.geometryRevision) ||
          request.geometryRevision < 0 ||
          !Array.isArray(request.destinations) ||
          !request.destinations.length ||
          request.destinations.length > 12 ||
          request.destinations.some(
            (p) => !finitePoint(p) || typeof p.surfaceId !== 'string' || p.surfaceId.length > 120,
          ) ||
          !request.body ||
          !Object.values(BODY_PROFILES).some(
            (p) =>
              p.id === request.body.id &&
              p.radius === request.body.radius &&
              p.height === request.body.height &&
              p.maxSlope === request.body.maxSlope,
          ) ||
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
