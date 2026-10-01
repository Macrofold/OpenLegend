import type { RelationshipEdge, RelationshipNode, RelationshipRef } from '@open-legend/protocol';
import {
  GraphReadError,
  refKey,
  type NeighborhoodQuery,
  type RelationshipIndex,
} from './relationship-index.js';

export const TRACE_LIMITS = { nodes: 100, depth: 12, pages: 16 } as const;
export interface TraceQuery extends Pick<NeighborhoodQuery, 'root' | 'direction' | 'relations'> {
  target?: RelationshipRef;
  maxDepth?: number;
  maxNodes?: number;
}

/** Bounded breadth-first investigation over the existing projection, never an acceptance proof.
 * Return witness edges, not every path/cycle. Frontier refs remain inspectable with ol_graph.
 * docs/world-agent-inspection-and-edits.md#bounded-relationship-traces
 */
export function traceRelationships(index: RelationshipIndex, query: TraceQuery) {
  const maxDepth = query.maxDepth ?? 4,
    maxNodes = query.maxNodes ?? 40;
  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 1 ||
    maxDepth > TRACE_LIMITS.depth ||
    !Number.isInteger(maxNodes) ||
    maxNodes < 2 ||
    maxNodes > TRACE_LIMITS.nodes
  )
    throw new GraphReadError('invalid', 'Trace limits exceed the supported envelope.');
  if (!index.has(query.root) || (query.target && !index.has(query.target)))
    throw new GraphReadError('unavailable', 'Trace reference is unavailable or changed.');
  const rootKey = refKey(query.root),
    targetKey = query.target && refKey(query.target);
  const queue: { ref: RelationshipRef; depth: number }[] = [{ ref: query.root, depth: 0 }];
  const seen = new Set([rootKey]);
  const parents = new Map<string, { previous: string; edge: RelationshipEdge }>();
  const nodes = new Map<string, RelationshipNode>();
  const edges: RelationshipEdge[] = [];
  const frontier: { ref: RelationshipRef; depth: number; cursor?: string }[] = [];
  let pages = 0,
    examinedNodes = 0,
    found = targetKey === rootKey;
  let limited: 'node-limit' | 'page-limit' | null = null;
  // Even a root-to-itself path resolves a real node, without expanding the whole graph.
  const root = index.neighborhood({ root: query.root, direction: query.direction, limit: 1 });
  nodes.set(rootKey, root.nodes.find((node) => refKey(node.ref) === rootKey)!);
  while (examinedNodes < queue.length && !found && !limited) {
    const current = queue[examinedNodes++]!;
    if (current.depth >= maxDepth) {
      frontier.push(current);
      continue;
    }
    let cursor: string | undefined;
    do {
      if (pages >= TRACE_LIMITS.pages) {
        limited = 'page-limit';
        frontier.push({ ...current, ...(cursor ? { cursor } : {}) });
        break;
      }
      pages++;
      const page = index.neighborhood({
        root: current.ref,
        direction: query.direction,
        relations: query.relations,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      const pageNodes = new Map(page.nodes.map((node) => [refKey(node.ref), node]));
      for (const edge of page.edges) {
        const next = refKey(edge.source) === refKey(current.ref) ? edge.target : edge.source;
        const key = refKey(next);
        if (seen.has(key)) continue;
        if (seen.size >= maxNodes) {
          limited = 'node-limit';
          // Reopening this page can repeat evidence, but cannot skip unexamined neighbors.
          frontier.push({ ...current, ...(cursor ? { cursor } : {}) });
          break;
        }
        seen.add(key);
        nodes.set(key, pageNodes.get(key)!);
        edges.push(edge);
        parents.set(key, { previous: refKey(current.ref), edge });
        queue.push({ ref: next, depth: current.depth + 1 });
        if (key === targetKey) {
          found = true;
          break;
        }
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor && !found && !limited);
  }
  if (!found) frontier.push(...queue.slice(examinedNodes));
  const path: RelationshipEdge[] = [];
  if (found && targetKey) {
    let key = targetKey;
    while (key !== rootKey) {
      const parent = parents.get(key)!;
      path.push(parent.edge);
      key = parent.previous;
    }
    path.reverse();
  }
  return {
    snapshot: index.snapshot,
    nodes: [...nodes.values()],
    edges,
    path: query.target
      ? {
          status: found ? 'found' : frontier.length ? 'unresolved' : 'not-found-in-projection',
          edges: path,
        }
      : null,
    coverage: {
      scope: 'projected-reachability-witnesses',
      status: found ? 'target-found' : frontier.length ? 'bounded' : 'complete',
      reason: found ? null : (limited ?? (frontier.length ? 'depth-limit' : null)),
      impact: 'not-evaluated',
      limitations: [
        ...index.limitations,
        'Edges are reachability witnesses, not an induced graph or all alternative paths. A missing projected path does not prove mechanics cannot interact.',
      ],
    },
    frontier: found ? [] : frontier,
    work: { pages, visitedNodes: seen.size, maxDepth, maxNodes },
  };
}
