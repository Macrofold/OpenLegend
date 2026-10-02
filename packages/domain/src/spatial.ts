import { countDomainWork } from './diagnostic-counters.js';
import { chargeWork } from './work-budget.js';
import { worldPosition, worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { worldRootEntities } from './entity-index.js';
import { isDraft } from 'immer';
import {
  BODY_PROFILES,
  canStand,
  clearSegment,
  distance3D,
  findSurfaceRoute,
  resolveSupport,
  surfacesInBounds,
  surfaceById,
  surfaceContains,
  surfaceHeight,
  type BodyProfile,
  type SurfacePoint,
  type RoutePlan,
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
export function interactionAnchor(
  entity: Entity,
  position: Position = worldPosition(entity),
): Position {
  return { x: position.x, y: position.y + bodyProfile(entity).interactionHeight, z: position.z };
}
export function hasLineOfEffect(
  world: WorldState,
  actor: Entity,
  target: Entity,
  origin: Position = worldPosition(actor),
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
  origin: Position = worldPosition(actor),
): boolean {
  const from = interactionAnchor(actor, origin),
    to = interactionAnchor(target);
  return distance3D(from, to) <= reach && clearSegment(spatialMap(world), from, to);
}
/** Strict endpoint projection: Y selects a real height, explicit surface IDs disambiguate seams. */
export function findPath(
  world: WorldState,
  from: Position,
  to: Position,
  fromSurfaceId?: string,
  toSurfaceId?: string,
  profile: BodyProfile = BODY_PROFILES.person,
): RoutePlan | null {
  const map = spatialMap(world);
  const start = resolveSupport(map, from, fromSurfaceId),
    destination = resolveSupport(map, to, toSurfaceId);
  if (!start || !destination) return null;
  const result = findSurfaceRoute(map, start, destination, profile);
  return result.status === 'invalid-endpoint' ? null : result;
}
/** Try a bounded set of actual interaction stances. A flying target's center is not a
 * ground destination, and a nearby point under a deck is not a reachable upper-floor stance. */
export function findApproachPath(
  world: WorldState,
  actor: Entity,
  target: Entity,
  reach: number,
): RoutePlan | null {
  const start = supportedPosition(actor);
  if (!start) return null;
  const map = spatialMap(world),
    profile = bodyProfile(actor),
    targetPosition = worldPosition(target),
    goal = interactionAnchor(target, targetPosition);
  // Every candidate uses this call's exact geometry and body state. Capture them once:
  // repeated reads through an Immer draft create avoidable proxies and allocations.
  const anchor = (p: Position): Position => ({
    x: p.x,
    y: p.y + profile.interactionHeight,
    z: p.z,
  });
  const reaches = (p: Position): boolean => {
    const from = anchor(p);
    return distance3D(from, goal) <= reach && clearSegment(map, from, goal);
  };
  const candidates: SurfacePoint[] = [];
  const targetSupport = supportedPosition(target);
  if (targetSupport && canStand(map, targetSupport, profile) && reaches(targetSupport))
    candidates.push(targetSupport);
  const radius = Math.min(12, Math.max(1, reach));
  const footY = goal.y - profile.interactionHeight;
  for (const surface of surfacesInBounds(map, {
    min: {
      x: targetPosition.x - radius,
      y: footY - reach,
      z: targetPosition.z - radius,
    },
    max: {
      x: targetPosition.x + radius,
      y: footY + reach,
      z: targetPosition.z + radius,
    },
  })) {
    for (
      let z = Math.max(Math.ceil(surface.minZ), Math.ceil(targetPosition.z - radius));
      z <= Math.min(Math.floor(surface.maxZ), Math.floor(targetPosition.z + radius));
      z++
    ) {
      for (
        let x = Math.max(Math.ceil(surface.minX), Math.ceil(targetPosition.x - radius));
        x <= Math.min(Math.floor(surface.maxX), Math.floor(targetPosition.x + radius));
        x++
      ) {
        const p = { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
        if (distance3D(anchor(p), goal) <= reach) candidates.push(p);
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
  const destinations: SurfacePoint[] = [];
  for (const candidate of candidates) {
    if (!reaches(candidate) || !canStand(map, candidate, profile)) continue;
    if (destinations.length === 12) break;
    destinations.push(candidate);
    const route = findSurfaceRoute(map, start, candidate, profile);
    if (route.status === 'reached') return route;
  }
  return destinations.length
    ? {
        status: 'pending',
        path: [],
        expanded: 0,
        request: {
          from: start,
          destinations,
          body: { ...profile },
          geometryRevision: map.spatial.revision,
        },
      }
    : null;
}
/** Project a short voluntary movement only onto its existing support, not the floor below. */
export function sameSurfacePoint(
  world: WorldState,
  actor: Entity,
  x: number,
  z: number,
): SurfacePoint | null {
  const map = spatialMap(world),
    surface = surfaceById(map, worldSupport(actor) ?? '');
  if (!surface || !surfaceContains(surface, { x, z })) return null;
  return { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
}

/** Ephemeral 3D point index for observed entity anchors. Exact body/geometry checks follow it.
 * Large static solids use the separate complete, bounded geometry provider, not this index. */
export function spatialCandidates<T extends { position: Position }>(entities: T[], cellSize = 28) {
  type Entry = { entity: T; order: number };
  type Cell = { x: number; y: number; z: number; entries: Entry[] };
  const cells = new Map<string, Cell>();
  countDomainWork('spatialBuilds');
  entities.forEach((entity, order) => {
    const p = entity.position,
      x = Math.floor(p.x / cellSize),
      y = Math.floor(p.y / cellSize),
      z = Math.floor(p.z / cellSize);
    const key = `${x},${y},${z}`;
    let cell = cells.get(key);
    if (!cell) cells.set(key, (cell = { x, y, z, entries: [] }));
    cell.entries.push({ entity, order });
  });
  return (position: Position, radius: number): T[] => {
    const found: Entry[] = [];
    const minX = Math.floor((position.x - radius) / cellSize),
      maxX = Math.floor((position.x + radius) / cellSize),
      minY = Math.floor((position.y - radius) / cellSize),
      maxY = Math.floor((position.y + radius) / cellSize),
      minZ = Math.floor((position.z - radius) / cellSize),
      maxZ = Math.floor((position.z + radius) / cellSize);
    const volume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
    // A large empty envelope should cost occupied cells, not its cubic volume.
    // Both paths return the same conservative cells in original entity order.
    if (volume > cells.size) {
      for (const cell of cells.values()) {
        chargeWork({ tests: 1 });
        if (
          cell.x >= minX &&
          cell.x <= maxX &&
          cell.y >= minY &&
          cell.y <= maxY &&
          cell.z >= minZ &&
          cell.z <= maxZ
        ) {
          chargeWork({ candidates: cell.entries.length });
          found.push(...cell.entries);
        }
      }
    } else {
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++)
          for (let z = minZ; z <= maxZ; z++) {
            const entries = cells.get(`${x},${y},${z}`)?.entries ?? [];
            chargeWork({ tests: 1, candidates: entries.length });
            found.push(...entries);
          }
    }
    countDomainWork('spatialQueries');
    countDomainWork('spatialCandidates', found.length);
    return found.sort((a, b) => a.order - b.order).map(({ entity }) => entity);
  };
}

const entityIndexes = new WeakMap<
  WorldState['entities'],
  ReturnType<typeof spatialCandidates<{ entity: Entity; position: Position }>>
>();
export function nearbyEntities(world: WorldState, position: Position, radius: number): Entity[] {
  let index =
    !isDraft(world.entities) && Object.isFrozen(world.entities)
      ? entityIndexes.get(world.entities)
      : undefined;
  if (!index) {
    index = spatialCandidates(
      worldRootEntities(world)
        .filter(activelyParticipates)
        .map((entity) => ({ entity, position: worldPosition(entity) })),
    );
    if (!isDraft(world.entities) && Object.isFrozen(world.entities))
      entityIndexes.set(world.entities, index);
  }
  return index(position, radius).map(({ entity }) => entity);
}
