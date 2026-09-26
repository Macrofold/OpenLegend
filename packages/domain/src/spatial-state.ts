import { recordSemanticChange } from './dependencies.js';
import { activelyParticipates } from './participation-state.js';
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
export type Placement =
  | { mode: 'world'; position: WorldPoint; supportSurfaceId: string | null; revision: number }
  | { mode: 'contained'; parentEntityId: string; revision: number }
  | { mode: 'attached'; parentEntityId: string; portId: 'equipment'; revision: number };
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
export function groundedSpatial(bodyProfileId: BodyProfileId = 'person'): EntitySpatial {
  return { bodyProfileId, heading: 0 };
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
  const placement = entity?.placement;
  return placement?.mode === 'world' ? placement.supportSurfaceId : null;
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
): void {
  if (!finitePoint(point)) throw new Error('Invalid authoritative position.');
  const dx = point.x - worldPosition(entity).x,
    dz = point.z - worldPosition(entity).z;
  if (Math.hypot(dx, dz) > 1e-8) entity.spatial.heading = Math.atan2(dx, dz);
  const placement = entity.placement;
  if (placement?.mode !== 'world' || !Number.isSafeInteger(placement.revision + 1))
    throw new Error('Invalid spatial placement revision.');
  if (
    point.x === placement.position.x &&
    point.y === placement.position.y &&
    point.z === placement.position.z &&
    supportSurfaceId === placement.supportSurfaceId
  )
    return;
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: entity.id,
    before: placement.position,
    after: point,
  });
  placement.position = { x: point.x, y: point.y, z: point.z };
  placement.supportSurfaceId = supportSurfaceId;
  placement.revision++;
}
/** Unchanged Immer map branches reuse derived geometry/navigation caches. A modified candidate
 * receives its own snapshot; querying an original map would ignore uncommitted geometry edits. */
export const spatialMap = (world: WorldState) =>
  isDraft(world.map) ? current(world.map) : world.map;

export { starterSpatialLayout, starterFlightRoutes } from './worlds/base/spatial.js';

export function validateSpatialWorld(world: WorldState): void {
  const map = spatialMap(world);
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
      !Array.isArray(route.points) ||
      route.points.length < 2 ||
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
    if (
      entity.retirement ||
      entity.placement?.mode === 'contained' ||
      entity.placement?.mode === 'attached'
    )
      continue;
    const s = entity.spatial;
    if (
      !finitePoint(worldPosition(entity)) ||
      !s ||
      !Object.hasOwn(BODY_PROFILES, s.bodyProfileId) ||
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
      if (a.destination && !resolveSupport(map, a.destination, a.destination.surfaceId))
        throw new Error('Invalid saved spatial destination.');
    }
  }
}
