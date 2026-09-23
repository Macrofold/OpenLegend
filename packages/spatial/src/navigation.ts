import {
  canStand,
  canWalkSegment,
  distance3D,
  horizontalDistance,
  supportSurfaces,
  surfaceHeight,
} from './geometry.js';
import { validateSpatialMap } from './validation.js';
import {
  BODY_PROFILES,
  SPATIAL_LIMITS,
  type BodyProfile,
  type RouteResult,
  type SpatialMap,
  type SurfacePoint,
  type WalkableSurface,
} from './types.js';

interface Node {
  point: SurfacePoint;
  edges: Array<{ index: number; cost: number }>;
}
interface Graph {
  nodes: Node[];
  lookup: Map<string, number>;
  revision: number;
  components: Int32Array;
  search: { costs: Float64Array; parents: Int32Array; stamps: Uint32Array; generation: number };
}
const graphs = new WeakMap<SpatialMap, Map<string, Graph>>();
const surfaceGroups = new WeakMap<
  SpatialMap,
  {
    revision: number;
    bySurface: Map<string, WalkableSurface[]>;
  }
>();
/** Coarse connectivity only: plane-height overlap at shared grid coordinates may connect
 * supports, but never proves clearance. Disconnected upper floors need no ground graph bake.
 * docs/architecture.md#spatial-world-foundation
 */
function groupsFor(map: SpatialMap): Map<string, WalkableSurface[]> {
  const cached = surfaceGroups.get(map);
  if (cached?.revision === map.spatial.revision) return cached.bySurface;
  validateSpatialMap(map);
  const surfaces = [...supportSurfaces(map)].sort((a, b) => a.id.localeCompare(b.id));
  const parents = surfaces.map((_, i) => i);
  const root = (i: number): number => {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]!]!;
      i = parents[i]!;
    }
    return i;
  };
  for (let i = 0; i < surfaces.length; i++) {
    const a = surfaces[i]!;
    for (let j = i + 1; j < surfaces.length; j++) {
      const b = surfaces[j]!;
      const minX = Math.ceil(Math.max(a.minX, b.minX)),
        maxX = Math.floor(Math.min(a.maxX, b.maxX));
      const minZ = Math.ceil(Math.max(a.minZ, b.minZ)),
        maxZ = Math.floor(Math.min(a.maxZ, b.maxZ));
      if (minX > maxX || minZ > maxZ) continue;
      // The difference of two support planes is linear, so its extrema lie at corners.
      const delta = surfaceHeight(a, minX, minZ) - surfaceHeight(b, minX, minZ);
      const dx = (maxX - minX) * (a.slopeX - b.slopeX);
      const dz = (maxZ - minZ) * (a.slopeZ - b.slopeZ);
      // Coarse rejection must remain conservative at floating-point seam boundaries.
      const tolerance = SPATIAL_LIMITS.supportTolerance + SPATIAL_LIMITS.epsilon;
      if (
        delta + Math.min(0, dx) + Math.min(0, dz) > tolerance ||
        delta + Math.max(0, dx) + Math.max(0, dz) < -tolerance
      )
        continue;
      const first = root(i),
        second = root(j);
      if (first !== second) parents[Math.max(first, second)] = Math.min(first, second);
    }
  }
  const groups = new Map<number, WalkableSurface[]>(),
    bySurface = new Map<string, WalkableSurface[]>();
  for (let i = 0; i < surfaces.length; i++) {
    const id = root(i),
      surface = surfaces[i]!;
    let group = groups.get(id);
    if (!group) groups.set(id, (group = []));
    group.push(surface);
    bySurface.set(surface.id, group);
  }
  surfaceGroups.set(map, { revision: map.spatial.revision, bySurface });
  return bySurface;
}
const key = (surface: string, x: number, z: number) => `${surface}:${x},${z}`;
const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** The first world has a small public, layered grid. This provider can be replaced by a
 * qualified Recast adapter without changing destinations or the authoritative movement owner.
 * archive/07-technical-architecture/spatial-world-runtime.md#initial-native-provider
 */
function graphFor(map: SpatialMap, body: BodyProfile, surfaces: WalkableSurface[]): Graph {
  const profileKey = `${body.id}:${body.radius}:${body.height}:${body.maxSlope}:${surfaces[0]!.id}`;
  let profiles = graphs.get(map);
  const cached = profiles?.get(profileKey);
  if (cached?.revision === map.spatial.revision) return cached;
  const graph: Graph = {
    nodes: [],
    lookup: new Map(),
    revision: map.spatial.revision,
    components: new Int32Array(),
    search: {
      costs: new Float64Array(),
      parents: new Int32Array(),
      stamps: new Uint32Array(),
      generation: 0,
    },
  };
  const columns = new Map<string, number[]>();
  for (const s of surfaces) {
    for (let z = Math.ceil(s.minZ); z <= Math.floor(s.maxZ); z++) {
      for (let x = Math.ceil(s.minX); x <= Math.floor(s.maxX); x++) {
        const point = { x, y: surfaceHeight(s, x, z), z, surfaceId: s.id };
        if (!canStand(map, point, body)) continue;
        const index = graph.nodes.length;
        if (index >= SPATIAL_LIMITS.maxGraphNodes)
          throw new Error('Spatial graph exceeds its native node budget.');
        graph.nodes.push({ point, edges: [] });
        graph.lookup.set(key(s.id, x, z), index);
        const column = `${x},${z}`;
        const entries = columns.get(column) ?? [];
        entries.push(index);
        columns.set(column, entries);
      }
    }
  }
  for (const column of columns.values())
    column.sort((a, b) => graph.nodes[a]!.point.y - graph.nodes[b]!.point.y || a - b);
  for (const [index, node] of graph.nodes.entries()) {
    const p = node.point;
    const candidates = DIRECTIONS.map(([dx, dz]) =>
      graph.lookup.get(key(p.surfaceId, p.x + dx, p.z + dz)),
    );
    const column = columns.get(`${p.x},${p.z}`)!;
    // Only coincident heights can form a seam; stacked floors are not all-to-all edges.
    let lo = 0,
      hi = column.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (graph.nodes[column[mid]!]!.point.y < p.y - SPATIAL_LIMITS.supportTolerance) lo = mid + 1;
      else hi = mid;
    }
    let seamHub: number | undefined;
    for (let i = lo; i < column.length; i++) {
      const next = column[i]!,
        height = graph.nodes[next]!.point.y;
      if (height > p.y + SPATIAL_LIMITS.supportTolerance) break;
      if (height === p.y) {
        // Valid exact-coincident stances in this finite family connect at zero cost.
        // A star preserves connectivity without a quadratic clique; native links need their own rules.
        // Keep tolerance-height seams explicit: those carry real distance and may be directional.
        seamHub ??= next;
        if (index !== seamHub && next !== seamHub) continue;
      }
      candidates.push(next);
    }
    for (const next of candidates) {
      if (next === undefined || next === index) continue;
      const target = graph.nodes[next]!.point;
      // Same-surface geometry is reversible. Reuse the earlier direction's result; seam
      // contact allowances can differ by source slope and must still be checked both ways.
      if (next < index && p.surfaceId === target.surfaceId) {
        const reverse = graph.nodes[next]!.edges.find((edge) => edge.index === index);
        if (reverse) node.edges.push({ index: next, cost: reverse.cost });
      } else if (canWalkSegment(map, p, target, body))
        node.edges.push({ index: next, cost: distance3D(p, target) });
    }
  }
  const components = new Int32Array(graph.nodes.length);
  for (let i = 0; i < components.length; i++) components[i] = i;
  const root = (i: number): number => {
    while (components[i] !== i) {
      components[i] = components[components[i]!]!;
      i = components[i]!;
    }
    return i;
  };
  for (const [i, node] of graph.nodes.entries())
    for (const edge of node.edges) {
      const a = root(i),
        b = root(edge.index);
      if (a !== b) components[Math.max(a, b)] = Math.min(a, b);
    }
  for (let i = 0; i < components.length; i++) components[i] = root(i);
  graph.components = components;
  graph.search = {
    costs: new Float64Array(graph.nodes.length),
    parents: new Int32Array(graph.nodes.length),
    stamps: new Uint32Array(graph.nodes.length),
    generation: 0,
  };
  profiles ??= new Map();
  profiles.set(profileKey, graph);
  graphs.set(map, profiles);
  return graph;
}
interface QueueEntry {
  index: number;
  cost: number;
  estimate: number;
}
class MinQueue {
  private heap: QueueEntry[] = [];
  get size() {
    return this.heap.length;
  }
  private less(a: QueueEntry, b: QueueEntry) {
    return a.estimate < b.estimate || (a.estimate === b.estimate && a.index < b.index);
  }
  push(entry: QueueEntry): void {
    const h = this.heap;
    h.push(entry);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >>> 1;
      if (!this.less(h[i]!, h[p]!)) break;
      [h[i], h[p]] = [h[p]!, h[i]!];
      i = p;
    }
  }
  pop(): QueueEntry | undefined {
    const h = this.heap,
      first = h[0],
      last = h.pop();
    if (!h.length || !last) return first;
    h[0] = last;
    let i = 0;
    while (true) {
      const left = i * 2 + 1,
        right = left + 1;
      if (left >= h.length) break;
      const child = right < h.length && this.less(h[right]!, h[left]!) ? right : left;
      if (!this.less(h[child]!, h[i]!)) break;
      [h[i], h[child]] = [h[child]!, h[i]!];
      i = child;
    }
    return first;
  }
}
function endpointNodes(
  map: SpatialMap,
  graph: Graph,
  point: SurfacePoint,
  body: BodyProfile,
): number[] {
  const result: number[] = [];
  for (let z = Math.floor(point.z) - 1; z <= Math.ceil(point.z) + 1; z++) {
    for (let x = Math.floor(point.x) - 1; x <= Math.ceil(point.x) + 1; x++) {
      const index = graph.lookup.get(key(point.surfaceId, x, z));
      if (index === undefined) continue;
      const target = graph.nodes[index]!.point;
      if (
        horizontalDistance(point, target) <= SPATIAL_LIMITS.maxConnectorDistance &&
        canWalkSegment(map, point, target, body)
      )
        result.push(index);
    }
  }
  return result
    .sort(
      (a, b) =>
        distance3D(point, graph.nodes[a]!.point) - distance3D(point, graph.nodes[b]!.point) ||
        a - b,
    )
    .slice(0, 8);
}
export function findSurfaceRoute(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body: BodyProfile = BODY_PROFILES.person,
  maxExpansions: number = SPATIAL_LIMITS.maxSearchExpansions,
): RouteResult {
  const fail = (
    status: 'invalid-endpoint' | 'no-route' | 'budget-exceeded',
    expanded = 0,
  ): RouteResult => ({ status, path: [], expanded });
  if (
    !Number.isSafeInteger(maxExpansions) ||
    maxExpansions < 1 ||
    maxExpansions > SPATIAL_LIMITS.maxSearchExpansions
  )
    return fail('budget-exceeded');
  if (!canStand(map, from, body) || !canStand(map, to, body)) return fail('invalid-endpoint');
  if (from.surfaceId === to.surfaceId && distance3D(from, to) < SPATIAL_LIMITS.supportTolerance)
    return { status: 'reached', path: [], length: 0, expanded: 0 };
  if (from.surfaceId === to.surfaceId && canWalkSegment(map, from, to, body))
    return { status: 'reached', path: [{ ...to }], length: distance3D(from, to), expanded: 0 };
  if (from.surfaceId !== to.surfaceId) {
    // Overlapping supports can share an endpoint. Validate both legs instead of baking a
    // dense graph just to change the semantic support; blocked legs still use normal search.
    for (const seam of [
      { ...from, surfaceId: to.surfaceId },
      { ...to, surfaceId: from.surfaceId },
    ]) {
      if (canWalkSegment(map, from, seam, body) && canWalkSegment(map, seam, to, body))
        return {
          status: 'reached',
          path:
            seam.surfaceId === to.surfaceId && distance3D(seam, to) < 1e-6
              ? [{ ...to }]
              : [seam, { ...to }],
          length: distance3D(from, seam) + distance3D(seam, to),
          expanded: 0,
        };
    }
  }
  const groups = groupsFor(map),
    group = groups.get(from.surfaceId);
  if (!group || group !== groups.get(to.surfaceId)) return fail('no-route');
  const graph = graphFor(map, body, group);
  const starts = endpointNodes(map, graph, from, body),
    ends = endpointNodes(map, graph, to, body);
  if (!starts.length || !ends.length) return fail('no-route');
  const startComponents = new Set(starts.map((i) => graph.components[i]));
  if (!ends.some((i) => startComponents.has(graph.components[i]))) return fail('no-route');
  const endCosts = new Map(ends.map((i) => [i, distance3D(graph.nodes[i]!.point, to)]));
  // Queries are synchronous/non-reentrant. Generation stamps reuse bounded graph-local
  // scratch without clearing every unrelated floor on each short route. Never saved state.
  const { costs, parents: parent, stamps } = graph.search;
  let generation = (graph.search.generation + 1) >>> 0;
  if (generation === 0) {
    stamps.fill(0);
    generation = 1;
  }
  graph.search.generation = generation;
  const queue = new MinQueue();
  for (const index of starts) {
    const cost = distance3D(from, graph.nodes[index]!.point);
    costs[index] = cost;
    parent[index] = -1;
    stamps[index] = generation;
    queue.push({ index, cost, estimate: cost + distance3D(graph.nodes[index]!.point, to) });
  }
  let expanded = 0,
    bestEnd = -1,
    bestCost = Infinity;
  while (queue.size) {
    const entry = queue.pop()!;
    if (entry.cost !== costs[entry.index]) continue;
    if (entry.estimate >= bestCost) break;
    if (++expanded > maxExpansions) return fail('budget-exceeded', expanded - 1);
    const ending = endCosts.get(entry.index);
    if (ending !== undefined && entry.cost + ending < bestCost) {
      bestEnd = entry.index;
      bestCost = entry.cost + ending;
    }
    for (const edge of graph.nodes[entry.index]!.edges) {
      const cost = entry.cost + edge.cost;
      if (stamps[edge.index] === generation && cost >= costs[edge.index]! - 1e-9) continue;
      stamps[edge.index] = generation;
      costs[edge.index] = cost;
      parent[edge.index] = entry.index;
      queue.push({
        index: edge.index,
        cost,
        estimate: cost + distance3D(graph.nodes[edge.index]!.point, to),
      });
    }
  }
  if (bestEnd < 0) return fail('no-route', expanded);
  const path: SurfacePoint[] = [];
  for (let index = bestEnd; index >= 0; index = parent[index]!) {
    if (path.length >= SPATIAL_LIMITS.maxPathPoints) return fail('budget-exceeded', expanded);
    path.push({ ...graph.nodes[index]!.point });
  }
  path.reverse();
  if (path[0]?.surfaceId === from.surfaceId && distance3D(path[0], from) < 1e-6) path.shift();
  if (
    !path.length ||
    path.at(-1)!.surfaceId !== to.surfaceId ||
    distance3D(path.at(-1)!, to) > 1e-6
  )
    path.push({ ...to });
  if (path.length > SPATIAL_LIMITS.maxPathPoints) return fail('budget-exceeded', expanded);
  return { status: 'reached', path, length: bestCost, expanded };
}
