import { isDraft } from 'immer';
import {
  BODY_PROFILES,
  canStand,
  clearSegment,
  distance3D,
  findSurfaceRoute,
  resolveSupport,
  supportSurfaces,
  surfaceById,
  surfaceContains,
  surfaceHeight,
  type BodyProfile,
  type SurfacePoint,
} from '@open-legend/spatial';
import { bodyProfile, spatialMap, supportedPosition } from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';

/** Existing callers now measure real 3D separation; new code should prefer the explicit name. */
export const distance = distance3D;
export { distance3D };
export function isWalkable(
  world: WorldState,
  position: Position,
  surfaceId?: string,
  profile: BodyProfile = BODY_PROFILES.person,
): boolean {
  const map = spatialMap(world),
    p = resolveSupport(map, position, surfaceId);
  return !!p && canStand(map, p, profile);
}
export function hasLineOfSight(world: WorldState, from: Position, to: Position): boolean {
  return clearSegment(spatialMap(world), from, to);
}
export function interactionAnchor(entity: Entity, position: Position = entity.position): Position {
  return { x: position.x, y: position.y + bodyProfile(entity).interactionHeight, z: position.z };
}
export function hasLineOfEffect(
  world: WorldState,
  actor: Entity,
  target: Entity,
  origin: Position = actor.position,
): boolean {
  return clearSegment(
    spatialMap(world),
    interactionAnchor(actor, origin),
    interactionAnchor(target),
  );
}
export function canReachEntity(
  world: WorldState,
  actor: Entity,
  target: Entity,
  reach: number,
  origin: Position = actor.position,
): boolean {
  return (
    distance3D(interactionAnchor(actor, origin), interactionAnchor(target)) <= reach &&
    hasLineOfEffect(world, actor, target, origin)
  );
}
/** Strict endpoint projection: Y selects a real height, explicit surface IDs disambiguate seams. */
export function findPath(
  world: WorldState,
  from: Position,
  to: Position,
  fromSurfaceId?: string,
  toSurfaceId?: string,
  profile: BodyProfile = BODY_PROFILES.person,
): SurfacePoint[] | null {
  const map = spatialMap(world);
  const start = resolveSupport(map, from, fromSurfaceId),
    destination = resolveSupport(map, to, toSurfaceId);
  if (!start || !destination) return null;
  const result = findSurfaceRoute(map, start, destination, profile);
  return result.status === 'reached' ? result.path : null;
}
/** Try a bounded set of actual interaction stances. A flying target's center is not a
 * ground destination, and a nearby point under a deck is not a reachable upper-floor stance. */
export function findApproachPath(
  world: WorldState,
  actor: Entity,
  target: Entity,
  reach: number,
): SurfacePoint[] | null {
  const start = supportedPosition(actor);
  if (!start) return null;
  const map = spatialMap(world),
    profile = bodyProfile(actor);
  const candidates: SurfacePoint[] = [];
  const targetSupport = supportedPosition(target);
  if (
    targetSupport &&
    canStand(map, targetSupport, profile) &&
    canReachEntity(world, actor, target, reach, targetSupport)
  )
    candidates.push(targetSupport);
  const radius = Math.min(12, Math.max(1, reach));
  for (const surface of supportSurfaces(map)) {
    for (
      let z = Math.max(Math.ceil(surface.minZ), Math.ceil(target.position.z - radius));
      z <= Math.min(Math.floor(surface.maxZ), Math.floor(target.position.z + radius));
      z++
    ) {
      for (
        let x = Math.max(Math.ceil(surface.minX), Math.ceil(target.position.x - radius));
        x <= Math.min(Math.floor(surface.maxX), Math.floor(target.position.x + radius));
        x++
      ) {
        const p = { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
        if (canReachEntity(world, actor, target, reach, p) && canStand(map, p, profile))
          candidates.push(p);
      }
    }
  }
  candidates.sort(
    (a, b) =>
      distance3D(start, a) - distance3D(start, b) ||
      a.surfaceId.localeCompare(b.surfaceId) ||
      a.z - b.z ||
      a.x - b.x,
  );
  for (const candidate of candidates.slice(0, 12)) {
    const route = findSurfaceRoute(map, start, candidate, profile);
    if (route.status === 'reached') return route.path;
  }
  return null;
}
/** Project a short voluntary movement only onto its existing support, not the floor below. */
export function sameSurfacePoint(
  world: WorldState,
  actor: Entity,
  x: number,
  z: number,
): SurfacePoint | null {
  const map = spatialMap(world),
    surface = surfaceById(map, actor.spatial.supportSurfaceId ?? '');
  if (!surface || !surfaceContains(surface, { x, z })) return null;
  return { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
}

/** Ephemeral 3D point index for observed entity anchors. Exact body/geometry checks follow it.
 * Large static solids use the separate complete, bounded geometry provider, not this index. */
export function spatialCandidates<T extends { position: Position }>(entities: T[], cellSize = 28) {
  const cells = new Map<string, { entity: T; order: number }[]>();
  entities.forEach((entity, order) => {
    const p = entity.position,
      key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)},${Math.floor(p.z / cellSize)}`;
    const cell = cells.get(key) ?? [];
    cell.push({ entity, order });
    cells.set(key, cell);
  });
  return (position: Position, radius: number): T[] => {
    const found: { entity: T; order: number }[] = [];
    for (
      let x = Math.floor((position.x - radius) / cellSize);
      x <= Math.floor((position.x + radius) / cellSize);
      x++
    )
      for (
        let y = Math.floor((position.y - radius) / cellSize);
        y <= Math.floor((position.y + radius) / cellSize);
        y++
      )
        for (
          let z = Math.floor((position.z - radius) / cellSize);
          z <= Math.floor((position.z + radius) / cellSize);
          z++
        )
          found.push(...(cells.get(`${x},${y},${z}`) ?? []));
    return found.sort((a, b) => a.order - b.order).map(({ entity }) => entity);
  };
}
const entityIndexes = new WeakMap<
  WorldState['entities'],
  ReturnType<typeof spatialCandidates<Entity>>
>();
export function nearbyEntities(world: WorldState, position: Position, radius: number): Entity[] {
  let index = isDraft(world.entities) ? undefined : entityIndexes.get(world.entities);
  if (!index) {
    index = spatialCandidates(Object.values(world.entities));
    if (!isDraft(world.entities)) entityIndexes.set(world.entities, index);
  }
  return index(position, radius);
}
