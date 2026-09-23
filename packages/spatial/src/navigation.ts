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
  edges?: Array<{ index: number; cost: number }>;
  walkable?: boolean;
}
interface Graph {
  nodes: Node[];
  lookup: Map<string, number>;
  revision: number;
  columns: Map<string, number[]>;
  closedRegions: Uint8Array[];
  search: { costs: Float64Array; parents: Int32Array; stamps: Uint32Array; generation: number };
}
const graphs = new WeakMap<SpatialMap, Map<string, Graph>>();
const surfaceGroups = new WeakMap<
  SpatialMap,
  {
    revision: number;
    bySurface: Map<string, WalkableSurface[]>;
    representative: Map<string, string>;
  }
>();
/** Coarse connectivity only: plane-height overlap at shared grid coordinates may connect
 * supports, but never proves clearance. Disconnected upper floors need no ground graph bake.
 * docs/architecture.md#spatial-world-foundation
 */
function groupsFor(map: SpatialMap) {
  const cached = surfaceGroups.get(map);
  if (cached?.revision === map.spatial.revision) return cached;
  validateSpatialMap(map);
  const surfaces: WalkableSurface[] = [];
  const representative = new Map<string, string>(),
    equivalent = new Map<string, string>();
  for (const s of [...supportSurfaces(map)].sort((a, b) => a.id.localeCompare(b.id))) {
    // Quotient only identical public movement patches, not merely coincident points.
    // Physical/acoustic solids stay separate; returned routes restore exact endpoint IDs.
    // Directed/permission-bearing traversal families must not inherit this equivalence.
    const signature = s.id.startsWith('terrain-rock:')
      ? s.id
      : JSON.stringify([
          s.minX,
          s.maxX,
          s.minZ,
          s.maxZ,
          s.y,
          s.slopeX,
          s.slopeZ,
          s.thickness,
          s.solidBase ?? null,
          s.material,
        ]);
    const id = equivalent.get(signature);
    representative.set(s.id, id ?? s.id);
    if (!id) {
      equivalent.set(signature, s.id);
      surfaces.push(s);
    }
  }
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
  for (const [id, canonical] of representative) bySurface.set(id, bySurface.get(canonical)!);
  const result = { revision: map.spatial.revision, bySurface, representative };
  surfaceGroups.set(map, result);
  return result;
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
  // Allocate only bounded lattice metadata. Exact clearance and edges are discovered by A*,
  // not baked for every square of every overlapping floor before the first query.
  const nodes: Node[] = [],
    lookup = new Map<string, number>();
  const columns = new Map<string, number[]>();
  for (const surface of surfaces) {
    for (let z = Math.ceil(surface.minZ); z <= Math.floor(surface.maxZ); z++) {
      for (let x = Math.ceil(surface.minX); x <= Math.floor(surface.maxX); x++) {
        const index = nodes.length;
        // Authored patch samples are admission-bounded; each derived rock adds at most one.
        if (index >= SPATIAL_LIMITS.maxGraphNodes + SPATIAL_LIMITS.maxBlockers)
          throw new Error('Spatial graph exceeds its native candidate budget.');
        nodes.push({
          point: Object.freeze({ x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id }),
        });
        lookup.set(key(surface.id, x, z), index);
        const column = `${x},${z}`;
        let entries = columns.get(column);
        if (!entries) columns.set(column, (entries = []));
        entries.push(index);
      }
    }
  }
  for (const column of columns.values())
    column.sort((a, b) => nodes[a]!.point.y - nodes[b]!.point.y || a - b);
  const graph: Graph = {
    nodes,
    lookup,
    columns,
    revision: map.spatial.revision,
    closedRegions: [],
    search: {
      costs: new Float64Array(nodes.length),
      parents: new Int32Array(nodes.length),
      stamps: new Uint32Array(nodes.length),
      generation: 0,
    },
  };
  profiles ??= new Map();
  profiles.set(profileKey, graph);
  graphs.set(map, profiles);
  return graph;
}
/** These memoized facts belong to one immutable map/profile, never an in-flight world edit.
 * An unexplored edge is unknown, not blocked. Exhausting the budget is not proof of no route.
 * archive/07-technical-architecture/spatial-world-runtime.md#initial-native-provider
 */
function walkableNode(map: SpatialMap, graph: Graph, index: number, body: BodyProfile): boolean {
  const node = graph.nodes[index]!;
  return (node.walkable ??= canStand(map, node.point, body));
}
function edgesFor(
  map: SpatialMap,
  graph: Graph,
  index: number,
  body: BodyProfile,
): NonNullable<Node['edges']> {
  const node = graph.nodes[index]!;
  if (node.edges) return node.edges;
  const p = node.point;
  const candidates = DIRECTIONS.map(([dx, dz]) =>
    graph.lookup.get(key(p.surfaceId, p.x + dx, p.z + dz)),
  );
  const column = graph.columns.get(`${p.x},${p.z}`)!;
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
    if (!walkableNode(map, graph, next, body)) continue;
    if (height === p.y) {
      // Exact-coincident valid stances retain the same zero-cost star, including its hub.
      // Tolerance-height seams carry real distance and require both directional checks.
      seamHub ??= next;
      if (index !== seamHub && next !== seamHub) continue;
    }
    candidates.push(next);
  }
  const edges: NonNullable<Node['edges']> = [];
  for (const next of candidates) {
    if (next === undefined || next === index || !walkableNode(map, graph, next, body)) continue;
    const target = graph.nodes[next]!;
    if (p.surfaceId === target.point.surfaceId && target.edges) {
      const reverse = target.edges.find((edge) => edge.index === index);
      if (reverse) edges.push({ index: next, cost: reverse.cost });
    } else if (canWalkSegment(map, p, target.point, body))
      edges.push({ index: next, cost: distance3D(p, target.point) });
  }
  // Publish only the complete list. Reusing a partially generated neighbor would erase edges.
  node.edges = edges;
  return edges;
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
    // Prefer progress on equal-cost plateaus, then stable identity; never inflate the heuristic.
    return (
      a.estimate < b.estimate ||
      (a.estimate === b.estimate && (a.cost > b.cost || (a.cost === b.cost && a.index < b.index)))
    );
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
      if (index === undefined || !walkableNode(map, graph, index, body)) continue;
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
  const topology = groupsFor(map),
    group = topology.bySurface.get(from.surfaceId);
  if (!group || group !== topology.bySurface.get(to.surfaceId)) return fail('no-route');
  const startPoint = { ...from, surfaceId: topology.representative.get(from.surfaceId)! };
  const endPoint = { ...to, surfaceId: topology.representative.get(to.surfaceId)! };
  if (
    (startPoint.surfaceId !== from.surfaceId && !canWalkSegment(map, from, startPoint, body)) ||
    (endPoint.surfaceId !== to.surfaceId && !canWalkSegment(map, endPoint, to, body))
  )
    return fail('no-route');
  const graph = graphFor(map, body, group);
  const starts = endpointNodes(map, graph, startPoint, body),
    ends = endpointNodes(map, graph, endPoint, body);
  if (!starts.length || !ends.length) return fail('no-route');
  // A fully exhausted search proves its reached set has no outgoing edge. Reuse only that
  // negative fact (also safe for directional seams), not an assumed connected-component label.
  if (
    graph.closedRegions.some(
      (region) => starts.every((i) => region[i]) && ends.every((i) => !region[i]),
    )
  )
    return fail('no-route');
  const endCosts = new Map(ends.map((i) => [i, distance3D(graph.nodes[i]!.point, to)]));
  // Every internal edge is cardinal in XZ or a coincident seam. Manhattan distance to an
  // end connector plus that connector's actual cost is a lower bound, unlike Manhattan to
  // the freeform click itself. Euclidean also bounds vertical travel. Keep both admissible;
  // future diagonal/discounted traversal families must revise this bound before using it.
  const heuristic = (point: SurfacePoint): number => {
    let horizontal = Infinity;
    for (const [index, cost] of endCosts) {
      const end = graph.nodes[index]!.point;
      horizontal = Math.min(
        horizontal,
        Math.abs(point.x - end.x) + Math.abs(point.z - end.z) + cost,
      );
    }
    return Math.max(distance3D(point, to), horizontal);
  };
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
    queue.push({ index, cost, estimate: cost + heuristic(graph.nodes[index]!.point) });
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
    for (const edge of edgesFor(map, graph, entry.index, body)) {
      const cost = entry.cost + edge.cost;
      if (stamps[edge.index] === generation && cost >= costs[edge.index]! - 1e-9) continue;
      stamps[edge.index] = generation;
      costs[edge.index] = cost;
      parent[edge.index] = entry.index;
      queue.push({
        index: edge.index,
        cost,
        estimate: cost + heuristic(graph.nodes[edge.index]!.point),
      });
    }
  }
  if (bestEnd < 0) {
    // Queue exhaustion only: an expansion-budget return above must never create this proof.
    // Four bounded byte sets amortize repeated failed goals without retaining request history.
    const region = Uint8Array.from(stamps, (stamp) => Number(stamp === generation));
    if (graph.closedRegions.length === 4) graph.closedRegions.shift();
    graph.closedRegions.push(region);
    return fail('no-route', expanded);
  }
  const path: SurfacePoint[] = [];
  for (let index = bestEnd; index >= 0; index = parent[index]!) {
    if (path.length >= SPATIAL_LIMITS.maxPathPoints) return fail('budget-exceeded', expanded);
    path.push({ ...graph.nodes[index]!.point });
  }
  path.reverse();
  if (path[0]?.surfaceId === startPoint.surfaceId && distance3D(path[0], startPoint) < 1e-6)
    path.shift();
  if (startPoint.surfaceId !== from.surfaceId) path.unshift(startPoint);
  if (
    !path.length ||
    path.at(-1)!.surfaceId !== endPoint.surfaceId ||
    distance3D(path.at(-1)!, endPoint) > 1e-6
  )
    path.push(endPoint);
  if (endPoint.surfaceId !== to.surfaceId) path.push({ ...to });
  if (path.length > SPATIAL_LIMITS.maxPathPoints) return fail('budget-exceeded', expanded);
  return { status: 'reached', path, length: bestCost, expanded };
}
