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
}
const graphs = new WeakMap<SpatialMap, Map<string, Graph>>();
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
function graphFor(map: SpatialMap, body: BodyProfile): Graph {
  const profileKey = `${body.id}:${body.radius}:${body.height}:${body.maxSlope}`;
  let profiles = graphs.get(map);
  const cached = profiles?.get(profileKey);
  if (cached?.revision === map.spatial.revision) return cached;
  validateSpatialMap(map);
  const graph: Graph = {
    nodes: [],
    lookup: new Map(),
    revision: map.spatial.revision,
    components: new Int32Array(),
  };
  const columns = new Map<string, number[]>();
  for (const s of [...supportSurfaces(map)].sort((a, b) => a.id.localeCompare(b.id))) {
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
    for (let i = lo; i < column.length; i++) {
      const next = column[i]!;
      if (graph.nodes[next]!.point.y > p.y + SPATIAL_LIMITS.supportTolerance) break;
      candidates.push(next);
    }
    for (const next of candidates) {
      if (next === undefined || next === index) continue;
      const target = graph.nodes[next]!.point;
      if (canWalkSegment(map, p, target, body))
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
  const graph = graphFor(map, body);
  const starts = endpointNodes(map, graph, from, body),
    ends = endpointNodes(map, graph, to, body);
  if (!starts.length || !ends.length) return fail('no-route');
  const startComponents = new Set(starts.map((i) => graph.components[i]));
  if (!ends.some((i) => startComponents.has(graph.components[i]))) return fail('no-route');
  const endCosts = new Map(ends.map((i) => [i, distance3D(graph.nodes[i]!.point, to)]));
  const costs = new Float64Array(graph.nodes.length).fill(Infinity),
    parent = new Int32Array(graph.nodes.length).fill(-1);
  const queue = new MinQueue();
  for (const index of starts) {
    const cost = distance3D(from, graph.nodes[index]!.point);
    costs[index] = cost;
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
      if (cost >= costs[edge.index]! - 1e-9) continue;
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
