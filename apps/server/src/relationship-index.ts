import { createHash } from 'node:crypto';
import type {
  RelationshipRef,
  RelationshipNode,
  RelationshipEdge,
  RelationshipKind,
  RelationshipPage,
} from '@open-legend/protocol';

export const GRAPH_LIMITS = { nodes: 50000, edges: 200000, page: 100, examined: 1024 } as const;
export const refKey = (ref: RelationshipRef): string =>
  JSON.stringify([ref.kind, ref.id, ref.version]);
export const fingerprint = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export class GraphReadError extends Error {
  constructor(
    readonly code: 'stale' | 'unavailable' | 'invalid' | 'capacity',
    message: string,
  ) {
    super(message);
  }
}
export interface NeighborhoodQuery {
  root: RelationshipRef;
  direction: 'out' | 'in' | 'both';
  relations?: RelationshipKind[];
  limit?: number;
  cursor?: string;
}

/** Immutable, source-owned projection with bounded adjacency paging, not transitive closure.
 * docs/invention-graph.md#graph-reader-implementation
 */
export class RelationshipIndex {
  private readonly nodes = new Map<string, RelationshipNode>();
  private readonly outgoing = new Map<string, RelationshipEdge[]>();
  private readonly incoming = new Map<string, RelationshipEdge[]>();
  readonly snapshot: string;
  constructor(
    scope: string,
    nodes: readonly RelationshipNode[],
    edges: readonly RelationshipEdge[],
    readonly limitations: readonly string[],
  ) {
    if (nodes.length > GRAPH_LIMITS.nodes || edges.length > GRAPH_LIMITS.edges)
      throw new GraphReadError('capacity', 'Projection exceeds the synchronous graph envelope.');
    for (const node of nodes) {
      const key = refKey(node.ref);
      if (this.nodes.has(key)) throw new GraphReadError('invalid', 'Duplicate graph node.');
      this.nodes.set(key, node);
    }
    const ids = new Set<string>();
    for (const edge of edges) {
      if (ids.has(edge.id)) throw new GraphReadError('invalid', 'Duplicate graph edge.');
      ids.add(edge.id);
      const source = refKey(edge.source),
        target = refKey(edge.target);
      if (!this.nodes.has(source) || !this.nodes.has(target))
        throw new GraphReadError('invalid', 'Projection has an unresolved endpoint.');
      const out = this.outgoing.get(source) ?? [];
      out.push(edge);
      this.outgoing.set(source, out);
      const incoming = this.incoming.get(target) ?? [];
      incoming.push(edge);
      this.incoming.set(target, incoming);
    }
    for (const list of [...this.outgoing.values(), ...this.incoming.values()])
      list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    this.snapshot = fingerprint([
      scope,
      nodes.map((n) => n.ref),
      edges.map((e) => e.id),
      limitations,
    ]);
  }

  has(ref: RelationshipRef): boolean {
    return this.nodes.has(refKey(ref));
  }

  neighborhood(query: NeighborhoodQuery): RelationshipPage {
    const limit = query.limit ?? 40;
    if (!Number.isInteger(limit) || limit < 1 || limit > GRAPH_LIMITS.page)
      throw new GraphReadError('invalid', 'Graph page limit must be 1–100.');
    const key = refKey(query.root),
      node = this.nodes.get(key);
    if (!node)
      throw new GraphReadError('unavailable', 'Graph reference is unavailable or changed.');
    const relations = [...new Set(query.relations ?? [])].sort();
    const binding = fingerprint([this.snapshot, key, query.direction, relations]);
    let offset = 0;
    if (query.cursor) {
      if (query.cursor.length > 512) throw new GraphReadError('invalid', 'Invalid graph cursor.');
      try {
        const decoded: unknown = JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString('utf8'),
        );
        if (!Array.isArray(decoded) || decoded.length !== 2 || decoded[0] !== binding)
          throw new GraphReadError(
            'stale',
            'The graph or query changed. Restart this neighborhood.',
          );
        if (!Number.isSafeInteger(decoded[1]) || decoded[1] < 0)
          throw new GraphReadError('invalid', 'Invalid graph cursor.');
        offset = decoded[1];
      } catch (error) {
        if (error instanceof GraphReadError) throw error;
        throw new GraphReadError('invalid', 'Invalid graph cursor.');
      }
    }
    // Do not concatenate/sort an arbitrarily large neighborhood on every page.
    const out = query.direction === 'in' ? [] : (this.outgoing.get(key) ?? []);
    const incoming = query.direction === 'out' ? [] : (this.incoming.get(key) ?? []);
    const total = out.length + incoming.length;
    if (offset > total) throw new GraphReadError('invalid', 'Cursor is outside this neighborhood.');
    const edges: RelationshipEdge[] = [],
      selected = new Map([[key, node]]);
    let examined = 0;
    while (offset < total && edges.length < limit && examined++ < GRAPH_LIMITS.examined) {
      const edge = offset < out.length ? out[offset]! : incoming[offset - out.length]!;
      const secondLeg = offset++ >= out.length;
      if (query.direction === 'both' && secondLeg && refKey(edge.source) === key) continue;
      if (relations.length && !relations.includes(edge.relation)) continue;
      edges.push(edge);
      selected.set(refKey(edge.source), this.nodes.get(refKey(edge.source))!);
      selected.set(refKey(edge.target), this.nodes.get(refKey(edge.target))!);
    }
    const more = offset < total;
    return {
      snapshot: this.snapshot,
      nodes: structuredClone([...selected.values()]),
      edges: structuredClone(edges),
      coverage: {
        scope: 'projected-neighborhood',
        status: more ? 'page' : 'complete',
        impact: 'not-evaluated',
        limitations: [...this.limitations],
      },
      nextCursor: more
        ? Buffer.from(JSON.stringify([binding, offset])).toString('base64url')
        : null,
    };
  }
}
