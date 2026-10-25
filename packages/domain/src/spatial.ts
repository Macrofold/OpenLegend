import { countDomainWork } from './diagnostic-counters.js';
import { takeNativeChanges } from './native-change-feed.js';
import { chargeWork } from './work-budget.js';
import { entityDraftAudit, entityGet, entityOrdering } from './entity-collection.js';
import { changedDraftEntityIds, readOnlyDraftView } from './draft.js';
import { worldPosition, worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { physicalRoot, worldRootEntities } from './entity-index.js';
import { isDraft, original } from 'immer';
import {
  MOVEMENT,
  spatialBlockerCandidates,
  canStand,
  bodyIntersects,
  bodySweepFraction,
  clearSegment,
  clearPhysicalSegment,
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
  type CollisionSolid,
} from '@open-legend/spatial';
import {
  bodyProfile,
  effectiveBodyProfile,
  bodySpace,
  spatialMap,
  supportedPosition,
} from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';

const CANDIDATE_CELL_SIZE = 28;
// Physical body queries are much shorter than discovery queries. Cell size changes
// only conservative candidates; admitted extents and exact collision remain below.
const BODY_CANDIDATE_CELL_SIZE = 8;
/** Foot-indexed candidates cover either pose, including a wide reclining body.
 * The exact occupied shape remains bodySpace's responsibility. */
function candidateBodyExtent(body: BodyProfile): number {
  return Math.max(body.height + body.radius, 2 * body.radius);
}
function candidateCells(position: Position, radius: number, cellSize: number) {
  return {
    low: [position.x - radius, position.y - radius, position.z - radius].map((v) =>
      Math.floor(v / cellSize),
    ),
    high: [position.x + radius, position.y + radius, position.z + radius].map((v) =>
      Math.floor(v / cellSize),
    ),
  };
}
function inCandidateCells(
  position: Position,
  cells: ReturnType<typeof candidateCells>,
  cellSize: number,
) {
  return [position.x, position.y, position.z].every((value, axis) => {
    const cell = Math.floor(value / cellSize);
    return cell >= cells.low[axis]! && cell <= cells.high[axis]!;
  });
}

/** Owned, unsaved point bins. Changes replace copied inputs; queries preserve the
 * authoritative root order and still require exact geometry and disclosure checks. */
export class SpatialCandidateIndex<T extends { id: string; position: Position; order: number }> {
  private readonly cells = new Map<string, { coordinates: number[]; entries: Map<string, T> }>();
  private readonly entries = new Map<string, T>();
  private readonly rangeWaits = new Map<
    string,
    {
      at: number;
      position: Position;
      speed: number;
      radius: number;
      until: Map<string, number>;
    }
  >();
  constructor(private readonly cellSize = CANDIDATE_CELL_SIZE) {
    countDomainWork('spatialBuilds');
  }
  private key(position: Position) {
    return [position.x, position.y, position.z].map((v) => Math.floor(v / this.cellSize)).join(',');
  }
  delete(id: string): void {
    const old = this.entries.get(id);
    if (!old) return;
    const key = this.key(old.position),
      cell = this.cells.get(key)!;
    cell.entries.delete(id);
    if (!cell.entries.size) this.cells.delete(key);
    this.entries.delete(id);
  }
  set(value: T): void {
    if (this.entries.get(value.id) === value) return;
    this.delete(value.id);
    const key = this.key(value.position);
    let cell = this.cells.get(key);
    if (!cell)
      this.cells.set(key, (cell = { coordinates: key.split(',').map(Number), entries: new Map() }));
    cell.entries.set(value.id, value);
    this.entries.set(value.id, value);
    countDomainWork('spatialEntriesPrepared');
  }
  /** Query an already bounded changed-ID set with the same cell envelope and ordering as
   * the ordinary query. This does not replace the consumer's exact geometry check. */
  querySelected(position: Position, radius: number, ids: ReadonlySet<string>): T[] {
    const cells = candidateCells(position, radius, this.cellSize);
    const found: T[] = [];
    for (const id of ids) {
      chargeWork({ tests: 1 });
      const entry = this.entries.get(id);
      if (!entry) continue;
      if (inCandidateCells(entry.position, cells, this.cellSize)) found.push(entry);
    }
    countDomainWork('spatialQueries');
    countDomainWork('spatialCandidates', found.length);
    return found.sort((a, b) => a.order - b.order);
  }
  /** Cell membership stays live. A body leaving a rejected cell is considered in
   * its new cell; no all-pairs table or assumption about target speed is needed. */
  querySphere(
    position: Position,
    radius: number,
    clock?: { id: string; at: number; speed: number },
  ): T[] {
    let wait = clock ? this.rangeWaits.get(clock.id) : undefined;
    if (clock) {
      const elapsed = wait ? clock.at - wait.at : -1;
      const travel = elapsed * clock.speed;
      if (
        !wait ||
        elapsed < 0 ||
        wait.speed !== clock.speed ||
        wait.radius !== radius ||
        (position.x - wait.position.x) ** 2 +
          (position.y - wait.position.y) ** 2 +
          (position.z - wait.position.z) ** 2 >
          travel ** 2
      ) {
        wait = {
          at: clock.at,
          position: { ...position },
          speed: clock.speed,
          radius,
          until: new Map(),
        };
        if (this.rangeWaits.size >= 128 && !this.rangeWaits.has(clock.id))
          this.rangeWaits.delete(this.rangeWaits.keys().next().value!);
        this.rangeWaits.set(clock.id, wait);
      } else {
        // Validate each inter-query movement, not a growing envelope around an
        // old origin which could conceal a later teleport inside that envelope.
        wait.at = clock.at;
        wait.position = { ...position };
      }
    }
    return this.queryCells(position, radius, (cell) => {
      const key = cell.coordinates.join(',');
      if (clock && wait && clock.at < (wait.until.get(key) ?? -Infinity)) return false;
      const values = [position.x, position.y, position.z];
      const separation = Math.hypot(
        ...cell.coordinates.map((v, i) =>
          Math.max(v * this.cellSize - values[i]!, values[i]! - (v + 1) * this.cellSize, 0),
        ),
      );
      if (separation <= radius) return true;
      if (clock && wait) {
        if (wait.until.size >= 512) wait.until.delete(wait.until.keys().next().value!);
        wait.until.set(key, clock.at + (separation - radius) / clock.speed);
      }
      return false;
    });
  }
  query(position: Position, radius: number): T[] {
    return this.queryCells(position, radius);
  }
  private queryCells(
    position: Position,
    radius: number,
    eligible?: (cell: { coordinates: number[]; entries: Map<string, T> }) => boolean,
  ): T[] {
    const found: T[] = [];
    const min = [position.x - radius, position.y - radius, position.z - radius].map((v) =>
      Math.floor(v / this.cellSize),
    );
    const max = [position.x + radius, position.y + radius, position.z + radius].map((v) =>
      Math.floor(v / this.cellSize),
    );
    const include = (cell: { coordinates: number[]; entries: Map<string, T> } | undefined) => {
      if (cell && eligible && !eligible(cell)) return;
      chargeWork({ tests: 1, candidates: cell?.entries.size ?? 0 });
      // A populated cell has no independent count cap; avoid JS argument limits.
      if (cell) for (const entry of cell.entries.values()) found.push(entry);
    };
    const volume = (max[0]! - min[0]! + 1) * (max[1]! - min[1]! + 1) * (max[2]! - min[2]! + 1);
    if (volume > this.cells.size) {
      for (const cell of this.cells.values()) {
        chargeWork({ tests: 1 });
        if (cell.coordinates.every((v, i) => v >= min[i]! && v <= max[i]!)) include(cell);
      }
    } else {
      for (let x = min[0]!; x <= max[0]!; x++)
        for (let y = min[1]!; y <= max[1]!; y++)
          for (let z = min[2]!; z <= max[2]!; z++) include(this.cells.get(`${x},${y},${z}`));
    }
    countDomainWork('spatialQueries');
    countDomainWork('spatialCandidates', found.length);
    return found.sort((a, b) => a.order - b.order);
  }
}

/** Existing callers now measure real 3D separation; new code should prefer the explicit name. */
export const distance = distance3D;
export { distance3D };
export function isWalkable(
  world: WorldState,
  position: Position,
  surfaceId: string | undefined,
  profile: BodyProfile,
): boolean {
  const map = spatialMap(world),
    p = resolveSupport(map, position, surfaceId);
  return !!p && canStand(map, p, profile);
}
export function hasLineOfSight(world: WorldState, from: Position, to: Position): boolean {
  return clearSegment(spatialMap(world), from, to);
}
/** Geometric center of the current physical body, independent of its work/reach anchors. */
export function bodyCenter(
  world: WorldState,
  entity: Entity,
  position: Position = worldPosition(entity),
): Position {
  return {
    x: position.x,
    y: position.y + effectiveBodyProfile(world, entity).height / 2,
    z: position.z,
  };
}
export function interactionAnchor(
  world: WorldState,
  entity: Entity,
  position: Position = worldPosition(entity),
): Position {
  return {
    x: position.x,
    y: position.y + effectiveBodyProfile(world, entity).interactionHeight,
    z: position.z,
  };
}
/** Roots are indexed at their feet, while reach is measured between interaction anchors.
 * Expand by the current indexed bodies before exact checks, including different body heights. */
export function interactionCandidateBounds(world: WorldState, entity: Entity, reach: number) {
  return {
    position: interactionAnchor(world, entity),
    radius: reach + entityIndex(world).interactionHeight,
  };
}
export function hasLineOfEffect(
  world: WorldState,
  actor: Entity,
  target: Entity,
  origin: Position = worldPosition(actor),
): boolean {
  return clearSegment(
    spatialMap(world),
    interactionAnchor(world, actor, origin),
    interactionAnchor(world, target),
  );
}
export function canReachEntity(
  world: WorldState,
  actor: Entity,
  target: Entity,
  reach: number,
  origin: Position = worldPosition(actor),
  targetPoint: Position = interactionAnchor(world, target),
): boolean {
  const from = interactionAnchor(world, actor, origin);
  return (
    distance3D(from, targetPoint) <= reach && clearSegment(spatialMap(world), from, targetPoint)
  );
}
/** A real work point and its admitted stance, not a proxy entity or a new location. */
export interface PhysicalWorkPoint {
  point: Position;
  stance: SurfacePoint;
  /** A part created only after the work must also leave the builder standing clear. */
  obstruction?: CollisionSolid;
}
/** Conservative occupied-body clearance for chosen short movement. Static support and
 * solids remain canWalkSegment's responsibility; body bounds include their whole height. */
export function occupiedBodySweepClear(
  world: WorldState,
  actor: Entity,
  from: Position,
  to: Position,
): boolean {
  return occupiedBodySweepQuery(world, actor, from, to).clear(to);
}

/** Bind one unchanged physical read. Endpoints must lie on the segment from `from`
 * to `furthest`; do not retain across body, position or participation changes.
 * Static support/solids still belong to canWalkSegment. Lazy shapes preserve the
 * ordinary first-blocker shortcut and are reused by a blocked walk's stopping search.
 * docs/spatial-world.md#what-a-location-means
 */
export function occupiedBodySweepQuery(
  world: WorldState,
  actor: Entity,
  from: Position,
  furthest: Position,
): { clear: (to: Position) => boolean; firstContactFraction: () => number | undefined } {
  return occupiedBodySweepReader(world, actor)(from, furthest);
}
/** Share only one unchanged physical read phase, never across movement, body or
 * membership edits. Lazy preparation preserves unsupported/empty-route shortcuts;
 * each segment still selects conservative candidates and tests exact swept bodies.
 * Includes dead actors; static geometry remains under spatialMap.
 * docs/spatial-world.md#what-a-location-means */
export function occupiedBodySweepReader(
  world: WorldState,
  actor: Entity,
): (from: Position, furthest: Position) => ReturnType<typeof occupiedBodySweepQuery> {
  let profile: BodyProfile | undefined;
  let index: ReturnType<typeof workingBodyIndex> | undefined;
  let solids: WeakMap<Entity, CollisionSolid> | undefined;
  return (from, furthest) => {
    const body = (profile ??= bodyProfile(actor)),
      bodies = (index ??= workingBodyIndex(world, true)),
      origin = { ...from },
      candidates = bodies(
        from,
        distance3D(from, furthest) + Math.max(body.radius, body.height) + bodies.bodyExtent,
      )
        .map(({ entity }) => entity)
        .filter((other) => other.id !== actor.id && other.actor && activelyParticipates(other));
    const solidAt = (index: number) => {
      const entity = candidates[index]!,
        cached = solids?.get(entity);
      if (cached) return cached;
      const solid = { bounds: bodySpace(world, entity) };
      (solids ??= new WeakMap()).set(entity, solid);
      return solid;
    };
    return {
      clear: (to) => {
        for (let index = 0; index < candidates.length; index++) {
          chargeWork({ tests: 1 });
          if (bodyIntersects(solidAt(index), origin, to, body)) return false;
        }
        return true;
      },
      firstContactFraction: () => {
        let first: number | undefined;
        for (let index = 0; index < candidates.length; index++) {
          chargeWork({ tests: 1 });
          const hit = bodySweepFraction(solidAt(index), origin, furthest, body);
          if (hit !== undefined && (first === undefined || hit < first)) first = hit;
        }
        return first;
      },
    };
  };
}
export function physicalWorkPointAvailable(
  world: WorldState,
  actor: Entity,
  candidate: PhysicalWorkPoint,
  reach: number,
  origin: Position = candidate.stance,
): boolean {
  const map = spatialMap(world),
    profile = bodyProfile(actor),
    from = interactionAnchor(world, actor, origin);
  if (
    !canStand(map, candidate.stance, profile) ||
    (origin !== candidate.stance &&
      !canStand(map, { ...origin, surfaceId: candidate.stance.surfaceId }, profile)) ||
    (candidate.obstruction && bodyIntersects(candidate.obstruction, origin, origin, profile)) ||
    distance3D(from, candidate.point) > reach ||
    !clearPhysicalSegment(map, from, candidate.point)
  )
    return false;
  const space = bodySpace(
    world,
    {
      ...actor,
      placement: {
        ...actor.placement!,
        mode: 'world',
        position: origin,
        supportSurfaceId: candidate.stance.surfaceId,
      },
    },
    false,
    0,
    MOVEMENT.skin,
  );
  for (const other of worldRootEntities(world, true)) {
    if (other.id === actor.id || other.assembly) continue;
    const occupied = bodySpace(world, other);
    if (
      space.min.x < occupied.max.x &&
      space.max.x > occupied.min.x &&
      space.min.y < occupied.max.y &&
      space.max.y > occupied.min.y &&
      space.min.z < occupied.max.z &&
      space.max.z > occupied.min.z
    )
      return false;
  }
  return true;
}
/** Bounded continuous-coordinate candidates through the same native route owner.
 * Missing preparation stays pending, rather than becoming proof of no accessible face. */
export function findPhysicalWorkApproach(
  world: WorldState,
  actor: Entity,
  candidates: readonly PhysicalWorkPoint[],
  reach: number,
): { candidate: PhysicalWorkPoint; route: RoutePlan } | null {
  const start = supportedPosition(actor);
  if (!start || candidates.length > 12) return null;
  const ordered = candidates
    .map((candidate, order) => ({ candidate, order }))
    .sort(
      (a, b) =>
        distance3D(start, a.candidate.stance) - distance3D(start, b.candidate.stance) ||
        a.order - b.order,
    );
  let pending: { candidate: PhysicalWorkPoint; route: RoutePlan } | undefined;
  for (const { candidate } of ordered) {
    if (!physicalWorkPointAvailable(world, actor, candidate, reach)) continue;
    const route = findPath(
      world,
      start,
      candidate.stance,
      start.surfaceId,
      candidate.stance.surfaceId,
      bodyProfile(actor),
    );
    if (route?.status === 'reached') return { candidate, route };
    if (route?.status === 'pending') pending ??= { candidate, route };
  }
  return pending ?? null;
}
/** Strict endpoint projection: Y selects a real height, explicit surface IDs disambiguate seams. */
export function findPath(
  world: WorldState,
  from: Position,
  to: Position,
  fromSurfaceId: string | undefined,
  toSurfaceId: string | undefined,
  profile: BodyProfile,
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
  occupiedBodies = false,
  goal: Position = interactionAnchor(world, target),
): RoutePlan | null {
  const start = supportedPosition(actor);
  if (!start) return null;
  const map = spatialMap(world),
    profile = bodyProfile(actor),
    targetPosition = worldPosition(target);
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
  const sweeps = occupiedBodies ? occupiedBodySweepReader(world, actor) : undefined;
  let occupiedRoutes = 0;
  for (const candidate of candidates) {
    if (!reaches(candidate) || !canStand(map, candidate, profile)) continue;
    if (sweeps && !sweeps(candidate, candidate).clear(candidate)) continue;
    if (destinations.length === 12) break;
    if (sweeps && occupiedRoutes++ === 12) break;
    const route = findSurfaceRoute(map, start, candidate, profile);
    if (route.status === 'reached') {
      // Different animals can approach the same food. A static route and a free
      // destination do not prove the body can pass its current neighbours.
      let from = start;
      const clear =
        !sweeps ||
        route.path.every((point) => {
          const result = sweeps(from, point).clear(point);
          from = point;
          return result;
        });
      if (clear) return route;
      continue;
    }
    destinations.push(candidate);
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
export function spatialCandidates<T extends { position: Position }>(
  entities: T[],
  cellSize = CANDIDATE_CELL_SIZE,
) {
  type Entry = { entity: T; order: number };
  type Cell = { x: number; y: number; z: number; entries: Entry[] };
  const cells = new Map<string, Cell>();
  countDomainWork('spatialBuilds');
  countDomainWork('spatialEntriesPrepared', entities.length);
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
  const candidates = (position: Position, radius: number): T[] => {
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
          for (const entry of cell.entries) found.push(entry);
        }
      }
    } else {
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++)
          for (let z = minZ; z <= maxZ; z++) {
            const entries = cells.get(`${x},${y},${z}`)?.entries ?? [];
            chargeWork({ tests: 1, candidates: entries.length });
            for (const entry of entries) found.push(entry);
          }
    }
    countDomainWork('spatialQueries');
    countDomainWork('spatialCandidates', found.length);
    return found.sort((a, b) => a.order - b.order).map(({ entity }) => entity);
  };
  /** Resume conservative candidates in the same original order without collecting the
   * entire local crowd. Existing full queries retain their behavior. */
  candidates.page = (position: Position, radius: number, after = -1, maximum = 201) => {
    const minX = Math.floor((position.x - radius) / cellSize),
      maxX = Math.floor((position.x + radius) / cellSize),
      minY = Math.floor((position.y - radius) / cellSize),
      maxY = Math.floor((position.y + radius) / cellSize),
      minZ = Math.floor((position.z - radius) / cellSize),
      maxZ = Math.floor((position.z + radius) / cellSize);
    const selected: Array<{ entries: Entry[]; offset: number }> = [];
    const include = (cell: Cell | undefined) => {
      if (!cell) return;
      let low = 0,
        high = cell.entries.length;
      while (low < high) {
        chargeWork({ tests: 1 });
        const middle = Math.floor((low + high) / 2);
        if (cell.entries[middle]!.order <= after) low = middle + 1;
        else high = middle;
      }
      if (low < cell.entries.length) selected.push({ entries: cell.entries, offset: low });
    };
    const volume = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
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
        )
          include(cell);
      }
    } else {
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++)
          for (let z = minZ; z <= maxZ; z++) {
            chargeWork({ tests: 1 });
            include(cells.get(`${x},${y},${z}`));
          }
    }
    const values: Array<{ value: T; after: number }> = [];
    while (values.length < maximum) {
      let first: (typeof selected)[number] | undefined;
      for (const cell of selected) {
        chargeWork({ tests: 1 });
        if (
          cell.offset < cell.entries.length &&
          (!first || cell.entries[cell.offset]!.order < first.entries[first.offset]!.order)
        )
          first = cell;
      }
      if (!first) break;
      chargeWork({ candidates: 1 });
      const entry = first.entries[first.offset++]!;
      values.push({ value: entry.entity, after: entry.order });
    }
    countDomainWork('spatialQueries');
    countDomainWork('spatialCandidates', values.length);
    return values;
  };
  // Reuse conservative cells, including original ordinals. Moving an earlier root
  // into the queried cells must expire continuation rather than silently skip it.
  candidates.membership = (position: Position, radius: number, key: (value: T) => unknown) => {
    const minX = Math.floor((position.x - radius) / cellSize),
      maxX = Math.floor((position.x + radius) / cellSize),
      minY = Math.floor((position.y - radius) / cellSize),
      maxY = Math.floor((position.y + radius) / cellSize),
      minZ = Math.floor((position.z - radius) / cellSize),
      maxZ = Math.floor((position.z + radius) / cellSize);
    let keys = '[',
      examined = 0;
    for (const cell of cells.values()) {
      if (
        cell.x < minX ||
        cell.x > maxX ||
        cell.y < minY ||
        cell.y > maxY ||
        cell.z < minZ ||
        cell.z > maxZ
      )
        continue;
      for (const entry of cell.entries) {
        keys += `${examined++ ? ',' : ''}${JSON.stringify([entry.order, key(entry.entity)])}`;
      }
    }
    countDomainWork('spatialMembershipBuilds');
    countDomainWork('spatialMembershipCells', cells.size);
    countDomainWork('spatialMembershipCandidates', examined);
    return `${keys}]`;
  };
  return candidates;
}

type EntityCandidateIndex = ReturnType<
  typeof spatialCandidates<{ entity: Entity; position: Position }>
> & {
  bodyExtent: number;
  livingBodyExtent: number;
  interactionHeight: number;
  order: ReadonlyMap<string, number>;
};
const entityIndexes = new WeakMap<WorldState['entities'], EntityCandidateIndex>();
const actorEntityIndexes = new WeakMap<WorldState['entities'], EntityCandidateIndex>();
function entityIndex(world: WorldState, actorsOnly = false, rebuildRoots = false) {
  const indexes = actorsOnly ? actorEntityIndexes : entityIndexes;
  let index =
    !rebuildRoots && !isDraft(world.entities) && Object.isFrozen(world.entities)
      ? indexes.get(world.entities)
      : undefined;
  if (!index) {
    const entries = worldRootEntities(world, true, rebuildRoots)
      .filter((entity) => activelyParticipates(entity) && (!actorsOnly || !!entity.actor))
      .map((entity) => ({ entity, position: worldPosition(entity) }));
    let bodyExtent = 0,
      livingBodyExtent = 0,
      interactionHeight = 0;
    for (const { entity } of entries) {
      const body = effectiveBodyProfile(world, entity);
      const extent = candidateBodyExtent(body);
      bodyExtent = Math.max(bodyExtent, extent);
      if (entity.actor?.alive) livingBodyExtent = Math.max(livingBodyExtent, extent);
      interactionHeight = Math.max(interactionHeight, body.interactionHeight);
    }
    index = Object.assign(
      spatialCandidates(entries, actorsOnly ? BODY_CANDIDATE_CELL_SIZE : CANDIDATE_CELL_SIZE),
      {
        bodyExtent,
        livingBodyExtent,
        interactionHeight,
        order: new Map(entries.map(({ entity }, order) => [entity.id, order])),
      },
    );
    if (!isDraft(world.entities) && Object.isFrozen(world.entities))
      indexes.set(world.entities, index);
  }
  return index;
}
type BodyCandidatePoint = {
  id: string;
  entity: Entity;
  position: Position;
  order: number;
  extent: number;
  livingExtent: number;
};
type BodyCandidates = ((position: Position, radius: number) => BodyCandidatePoint[]) & {
  bodyExtent: number;
  livingBodyExtent: number;
  order: ReadonlyMap<string, number>;
};
type WorkingBodyIndex = {
  points: Map<string, BodyCandidatePoint>;
  ordering: Map<string, string>;
  bins: SpatialCandidateIndex<BodyCandidatePoint>;
  query: BodyCandidates;
};
const workingActorBodies = new WeakMap<WorldState, WorkingBodyIndex>();
const workingRootBodies = new WeakMap<WorldState, WorkingBodyIndex>();
/** Movement and local perception repeatedly query the same working world. Reuse its bins,
 * updating only proven entity writes; neither copied positions nor draft references
 * escape this draft's lifetime. Unknown/structural edits use actual root enumeration.
 * Exact collision, participation and living-body filters remain with their callers. */
function workingBodyIndex(world: WorldState, actorsOnly: boolean) {
  if (!isDraft(world)) return entityIndex(world, actorsOnly);
  const frames = actorsOnly ? workingActorBodies : workingRootBodies;
  let frame = frames.get(world);
  const changed = (frame && takeNativeChanges(world, frame, true)) ?? changedDraftEntityIds(world),
    entities = readOnlyDraftView(world).entities,
    audit = entityDraftAudit(entities);
  if (!changed) {
    frames.delete(world);
    return entityIndex(world, actorsOnly, true);
  }
  if (!audit) return entityIndex(original(world)!, actorsOnly);
  // Replacing the value at an existing identity preserves root order. Only an
  // actual removal/reinsertion requires fresh ordinals. Recheck the collection
  // owner's exact key, rather than treating every native-value write as a rebuild.
  for (const id of audit.removed ?? [])
    if (frame?.points.has(id) && entityOrdering(entities, id)?.key !== frame.ordering.get(id)) {
      frames.delete(world);
      frame = undefined;
      break;
    }
  let boundsChanged = false;
  if (!frame) {
    const bins = new SpatialCandidateIndex<BodyCandidatePoint>(
        actorsOnly ? BODY_CANDIDATE_CELL_SIZE : CANDIDATE_CELL_SIZE,
      ),
      points = new Map<string, BodyCandidatePoint>(),
      ordering = new Map<string, string>(),
      query = Object.assign(
        (position: Position, radius: number) => {
          const candidates = bins.query(position, radius);
          // Current nonphysical fields belong to the selected entity, not the cached
          // geometric point. Refresh only returned neighbors, without reinserting them.
          for (const point of candidates)
            point.entity = entityGet(readOnlyDraftView(world.entities), point.id)!;
          return candidates;
        },
        {
          bodyExtent: 0,
          livingBodyExtent: 0,
          order: new Map<string, number>(),
        },
      );
    for (const entity of worldRootEntities(world, true, audit.assigned.size > 0)) {
      if ((actorsOnly && !entity.actor) || !activelyParticipates(entity)) continue;
      const body = effectiveBodyProfile(world, entity),
        extent = candidateBodyExtent(body),
        point = {
          id: entity.id,
          entity,
          position: { ...worldPosition(entity) },
          order: points.size,
          extent,
          livingExtent: entity.actor?.alive ? extent : 0,
        };
      points.set(entity.id, point);
      ordering.set(entity.id, entityOrdering(entities, entity.id)!.key);
      query.order.set(entity.id, point.order);
      bins.set(point);
    }
    frame = { bins, points, ordering, query };
    frames.set(world, frame);
    takeNativeChanges(world, frame, true);
    boundsChanged = true;
  }
  for (const id of changed) {
    const value = entityGet(entities, id),
      entity = value && readOnlyDraftView(value),
      previous = frame.points.get(id);
    if (
      !entity ||
      (actorsOnly && !entity.actor) ||
      !physicalRoot(entity) ||
      !activelyParticipates(entity)
    ) {
      if (previous) {
        frame.points.delete(id);
        frame.bins.delete(id);
        boundsChanged = true;
      }
      continue;
    }
    if (!previous) {
      // A contained body becoming a root can change its relative ordering.
      frames.delete(world);
      return entityIndex(world, actorsOnly, true);
    }
    const position = worldPosition(entity),
      body = effectiveBodyProfile(world, entity),
      extent = candidateBodyExtent(body),
      livingExtent = entity.actor?.alive ? extent : 0;
    if (
      previous.position.x !== position.x ||
      previous.position.y !== position.y ||
      previous.position.z !== position.z ||
      previous.extent !== extent ||
      previous.livingExtent !== livingExtent
    ) {
      const point = {
        ...previous,
        entity,
        position: { ...position },
        extent,
        livingExtent,
      };
      frame.points.set(id, point);
      frame.bins.set(point);
      boundsChanged ||= previous.extent !== extent || previous.livingExtent !== livingExtent;
    } else previous.entity = entity;
  }
  if (boundsChanged) {
    frame.query.bodyExtent = 0;
    frame.query.livingBodyExtent = 0;
    for (const point of frame.points.values()) {
      frame.query.bodyExtent = Math.max(frame.query.bodyExtent, point.extent);
      frame.query.livingBodyExtent = Math.max(frame.query.livingBodyExtent, point.livingExtent);
    }
  }
  return frame.query;
}
const entityMembershipKeys = new WeakMap<
  ReturnType<typeof entityIndex>,
  { bounds: string; key: string }
>();
/** Ordered roots and relevant physical evidence in the queried conservative cells
 * fence live continuation. Clock/needs/fuel and distant movement do not invalidate it.
 * One cached region per index bounds retained metadata; row disclosure stays live.
 * Cold metadata is measured separately from page scanning.
 * docs/projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#discovery-contract */
export function spatialCandidateMembershipKey(
  world: WorldState,
  actor: Entity,
  reach: number,
): string {
  const index = entityIndex(world),
    position = interactionAnchor(world, actor),
    radius = reach + index.interactionHeight,
    bounds = JSON.stringify([position, radius]);
  let cached = entityMembershipKeys.get(index);
  if (cached?.bounds !== bounds) {
    const key = index.membership(position, radius, ({ entity, position }) => [
      entity.id,
      position,
      entity.placement?.revision,
      effectiveBodyProfile(world, entity),
      entity.inventoryRevision,
      entity.container?.access,
    ]);
    cached = { bounds, key };
    entityMembershipKeys.set(index, cached);
  }
  return cached.key;
}
/** Structural pieces may be near while their one root anchor is farther away.
 * Read the same full-extent shape index used by collision; never scan all roots. */
export function nearbySolidAssemblies(
  world: WorldState,
  position: Position,
  radius: number,
): Entity[] {
  if (!world.assemblyGeometryRevision) return [];
  const found = new Map<string, Entity>(),
    materials = new Set<string>();
  for (const hit of spatialBlockerCandidates(spatialMap(world), {
    min: { x: position.x - radius, y: position.y - radius, z: position.z - radius },
    max: { x: position.x + radius, y: position.y + radius, z: position.z + radius },
  })) {
    if (materials.has(hit.id)) continue;
    materials.add(hit.id);
    chargeWork({ tests: 1 });
    const material = entityGet(world.entities, hit.id),
      rootId = material?.item?.assemblyClaim?.rootId,
      root = rootId && entityGet(world.entities, rootId);
    if (
      root &&
      root.assembly?.implementation === 'grounded-panel-boundary' &&
      !root.assembly.retired &&
      root.assembly.parts[hit.id] &&
      activelyParticipates(root)
    )
      found.set(root.id, root);
  }
  return [...found.values()];
}
export function nearbyEntities(world: WorldState, position: Position, radius: number): Entity[] {
  const index = workingBodyIndex(world, false),
    ordinary = index(position, radius).map(({ entity }) => entity),
    assemblies = nearbySolidAssemblies(world, position, radius);
  if (!assemblies.length) return ordinary;
  const found = new Map(ordinary.map((entity) => [entity.id, entity]));
  for (const root of assemblies) found.set(root.id, root);
  return [...found.values()].sort((a, b) => index.order.get(a.id)! - index.order.get(b.id)!);
}
/** Exact known identities need no whole-root/index preparation. Keep the ordinary
 * query's conservative cell envelope and assembly extents, then canonical order.
 * This selects physical candidates only; the consumer still proves actual perception. */
export function nearbySelectedEntities(
  world: WorldState,
  position: Position,
  radius: number,
  ids: ReadonlySet<string>,
): Entity[] {
  countDomainWork('spatialQueries');
  if (!ids.size) return [];
  const cells = candidateCells(position, radius, CANDIDATE_CELL_SIZE),
    entities = readOnlyDraftView(world.entities),
    found = new Map<string, Entity>();
  for (const id of ids) {
    chargeWork({ tests: 1 });
    const entity = entityGet(entities, id);
    if (
      entity &&
      physicalRoot(entity) &&
      activelyParticipates(entity) &&
      inCandidateCells(worldPosition(entity), cells, CANDIDATE_CELL_SIZE)
    )
      found.set(id, entity);
  }
  for (const root of nearbySolidAssemblies(world, position, radius))
    if (ids.has(root.id)) found.set(root.id, root);
  countDomainWork('spatialCandidates', found.size);
  return [...found.values()]
    .map((entity) => ({ entity, order: entityOrdering(entities, entity.id)!.key }))
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map((value) => value.entity);
}
/** Expand foot-indexed candidates using their actual full body dimensions. The bound is
 * prepared with the existing root index, so larger authored bodies cannot disappear. */
export function nearbyBodyEntities(
  world: WorldState,
  position: Position,
  radius: number,
  livingOnly = false,
): Entity[] {
  const index = workingBodyIndex(world, livingOnly);
  const bodies = index(
    position,
    radius + (livingOnly ? index.livingBodyExtent : index.bodyExtent),
  ).map(({ entity }) => entity);
  return livingOnly ? bodies.filter((entity) => entity.actor!.alive) : bodies;
}
/** Safety checks need living bodies, not every inert object in conservative grid cells. */
export function nearbyLivingEntities(
  world: WorldState,
  position: Position,
  radius: number,
): Entity[] {
  return workingBodyIndex(world, true)(position, radius).flatMap(({ entity }) =>
    entity.actor!.alive ? [entity] : [],
  );
}
export function nearbyEntityPage(
  world: WorldState,
  position: Position,
  radius: number,
  after = -1,
  maximum = 201,
) {
  return entityIndex(world)
    .page(position, radius, after, maximum)
    .map(({ value, after }) => ({ value: value.entity, after }));
}
