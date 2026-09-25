import type { RelationshipNode } from '@open-legend/protocol';
import type { WorldState } from '@open-legend/domain';
import { inspectableEntity } from './live-relationships.js';
import { fingerprint, GRAPH_LIMITS, GraphReadError } from './relationship-index.js';

export interface EntityQuery {
  query: string;
  kind?: string;
  controller?: string;
  limit: number;
  cursor?: string;
}

/** On-demand roster discovery. Cursor identity excludes positions/needs so ordinary ticks do not
 * prevent paging. Returned exact refs describe current inspection data, not a frozen live world.
 * docs/invention-graph.md#live-entity-discovery
 */
export class EntityDirectory {
  private cached?: { source: WorldState['entities']; keys: string[]; revision: string };
  read(world: WorldState, generation: string, input: EntityQuery) {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50)
      throw new GraphReadError('invalid', 'Entity page limit must be 1–50.');
    let roster = this.cached;
    if (!roster || roster.source !== world.entities || !Object.isFrozen(world.entities)) {
      const keys = Object.keys(world.entities).sort();
      if (keys.length > GRAPH_LIMITS.nodes)
        throw new GraphReadError('capacity', 'Entity directory requires a larger indexed reader.');
      roster = {
        source: world.entities,
        keys,
        revision: fingerprint(
          keys.map((id) => {
            const e = world.entities[id]!;
            return [id, e.name, e.kind, e.actor?.controller ?? null];
          }),
        ),
      };
      this.cached = roster;
    }
    const query = input.query.toLowerCase();
    const binding = fingerprint([
      world.id,
      generation,
      roster.revision,
      query,
      input.kind ?? null,
      input.controller ?? null,
    ]);
    let offset = 0;
    if (input.cursor) {
      let cursor: unknown;
      try {
        cursor = JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8'));
      } catch {
        throw new GraphReadError('invalid', 'Invalid entity cursor.');
      }
      if (!Array.isArray(cursor) || cursor.length !== 2 || cursor[0] !== binding)
        throw new GraphReadError('stale', 'Entity roster or query changed. Restart this listing.');
      if (!Number.isSafeInteger(cursor[1]) || cursor[1] < 0 || cursor[1] > roster.keys.length)
        throw new GraphReadError('invalid', 'Invalid entity cursor offset.');
      offset = cursor[1];
    }
    const nodes: RelationshipNode[] = [];
    let examined = 0;
    while (
      offset < roster.keys.length &&
      nodes.length < input.limit &&
      examined++ < GRAPH_LIMITS.examined
    ) {
      const e = world.entities[roster.keys[offset++]!]!;
      if (
        (input.kind && e.kind !== input.kind) ||
        (input.controller && e.actor?.controller !== input.controller)
      )
        continue;
      if (query && !e.name.toLowerCase().includes(query) && !e.id.toLowerCase().includes(query))
        continue;
      nodes.push({
        ref: { kind: 'entity', id: e.id, version: fingerprint(inspectableEntity(world, e)) },
        label: e.name,
        layer: 'live',
        canInspect: true,
      });
    }
    return {
      nodes,
      rosterRevision: roster.revision,
      nextCursor:
        offset < roster.keys.length
          ? Buffer.from(JSON.stringify([binding, offset])).toString('base64url')
          : null,
      coverage:
        'Current world entity roster, not inventory items. Membership/name/controller are cursor-bound; instance state is live at each page. No NPC knowledge or control is granted.',
    };
  }
}
