import { hotEventDependencies } from './hot-events.js';
import { HISTORY_TABLES, historyPositions, historyKey } from './history-residency.js';
import { randomUUID } from 'node:crypto';
import {
  EXPERIENCE_LIMITS,
  appendedRecordCount,
  type Entity,
  type ItemInstance,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import {
  RECORD_NODES,
  WORLD_RECORD_SCHEMA,
  type JsonRecord,
  type RecordNode,
} from './world-record-schema.js';

type Value = unknown;
export interface RowChange {
  id: string;
  parent: string;
  slot: string;
  position: number;
  payload: string;
  extra: unknown[];
  create: boolean;
}
export interface RecordChanges {
  writes: Map<string, RowChange[]>;
  deletes: Map<string, string[]>;
  rows: number;
}
const own = (value: Value, key: string): Value =>
  value && typeof value === 'object' && Object.hasOwn(value, key)
    ? (value as JsonRecord)[key]
    : undefined;
const recordId = (path: string[]) => JSON.stringify(path);
const members = (value: Value): [string, Value][] =>
  value && typeof value === 'object' ? Object.entries(value) : [];
function body(node: RecordNode, value: Value): Value {
  if (!value || typeof value !== 'object') return value;
  // Durable history owns event content. The active feed persists only membership.
  if (node.table === 'world_hot_events') return { id: own(value, 'id') };
  if (node.children?.['$']) return Array.isArray(value) ? [] : {};
  if (Array.isArray(value)) return value;
  const copy: JsonRecord = { ...value };
  for (const [field, child] of Object.entries(node.children ?? {})) {
    const part = own(value, field);
    if (part !== undefined && part !== null) copy[field] = child.mode === 'list' ? [] : {};
  }
  return copy;
}
function put(object: Value, key: string, value: Value) {
  if (!object || typeof object !== 'object') throw new Error('Invalid record parent.');
  Object.defineProperty(object, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

/** Canonical current records. Domain objects are an active simulation working set;
 * only the existing world transaction publishes their changed records.
 */
export class WorldRecords {
  constructor(readonly db: SqlDatabase) {}
  needsHotPrune = false;
  private get legacyAwarenessPredicate(): string {
    const field = (name: string) =>
      this.db.dialect === 'postgres'
        ? `(payload::jsonb ->> '${name}')`
        : `json_extract(payload, '$.${name}')`;
    return `(${field('eventType')} IS NULL OR ${field('triggerKind')} IS NULL OR (CAST(${field('intelligible')} AS TEXT) IN ('true','1') AND ${field('content')} IS NULL))`;
  }
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS world_head (
      id BIGINT PRIMARY KEY CHECK (id=1), world_id TEXT NOT NULL UNIQUE,
      revision BIGINT NOT NULL CHECK (revision>=0), generation TEXT NOT NULL
    )`);
    const create = (node: RecordNode, parent?: RecordNode): string => {
      const extra = Object.entries(node.columns ?? {})
        .map(([name, column]) => `,${name} ${column.sql}`)
        .join('');
      const foreign = parent
        ? `,FOREIGN KEY(world_id,parent_id) REFERENCES ${parent.table}(world_id,id) ON DELETE CASCADE`
        : '';
      return `CREATE TABLE IF NOT EXISTS ${node.table} (
        world_id TEXT NOT NULL REFERENCES world_head(world_id), id TEXT NOT NULL,
        parent_id TEXT NOT NULL, slot TEXT NOT NULL, position BIGINT NOT NULL,
        revision BIGINT NOT NULL, payload TEXT NOT NULL${extra}, PRIMARY KEY(world_id,id)${foreign}
      ); CREATE INDEX IF NOT EXISTS ${node.table}_parent ON ${node.table}(world_id,parent_id,position);
      ${(node.indexes ?? []).map((columns, index) => `CREATE INDEX IF NOT EXISTS ${node.table}_query${index} ON ${node.table}(world_id,${columns.join(',')});`).join('\n')}
      ${Object.values(node.children ?? {})
        .map((child) => create(child.node, node))
        .join('\n')}`;
    };
    await this.db.exec(create(WORLD_RECORD_SCHEMA));
    await this.db.exec(
      `CREATE INDEX IF NOT EXISTS mind_awareness_legacy_trigger ON mind_awareness(world_id,source_id) WHERE ${this.legacyAwarenessPredicate}`,
    );
  }
  async head() {
    const row = await this.db
      .prepare('SELECT world_id,revision,generation FROM world_head WHERE id=1')
      .get();
    return row
      ? {
          worldId: String(row['world_id']),
          revision: Number(row['revision']),
          generation: String(row['generation']),
        }
      : null;
  }
  /** Acquire the write fence before touching any effects. Caller owns the transaction. */
  async advance(worldId: string, expected: number, restore = false): Promise<number> {
    if (expected === 0)
      await this.db
        .prepare('INSERT INTO world_head VALUES (1,?,0,?) ON CONFLICT(id) DO NOTHING')
        .run(worldId, randomUUID());
    const row = await this.db
      .prepare(
        `UPDATE world_head SET revision=revision+1${restore ? ',generation=?' : ''}
      WHERE id=1 AND world_id=? AND revision=? RETURNING revision`,
      )
      .get(...(restore ? [randomUUID()] : []), worldId, expected);
    if (!row) throw new Error('Save conflict: another writer changed this world.');
    return Number(row['revision']);
  }
  prepare(before: SavedWorld | undefined, after: SavedWorld): RecordChanges {
    const changes: RecordChanges = { writes: new Map(), deletes: new Map(), rows: 0 };
    const visit = (
      node: RecordNode,
      old: Value,
      next: Value,
      path: string[],
      parent: string,
      slot: string,
      position: number,
      oldPosition = position,
    ) => {
      if (old === next && oldPosition === position && !this.needsHotPrune) return;
      const id = recordId(path);
      if (next === undefined) {
        // Foreign keys remove this owned subtree, never another actor's records.
        const ids = changes.deletes.get(node.table) ?? [];
        ids.push(id);
        changes.deletes.set(node.table, ids);
        return;
      }
      const payload = JSON.stringify(body(node, next));
      if (
        old === undefined ||
        (this.needsHotPrune && node.table === 'world_settings') ||
        oldPosition !== position ||
        payload !== JSON.stringify(body(node, old))
      ) {
        const rows = changes.writes.get(node.table) ?? [];
        rows.push({
          id,
          parent,
          slot,
          position,
          payload,
          create: old === undefined,
          extra: Object.values(node.columns ?? {}).map((column) =>
            column.value(next as JsonRecord, path),
          ),
        });
        changes.writes.set(node.table, rows);
        changes.rows++;
      }
      for (const [field, child] of Object.entries(node.children ?? {})) {
        const previous = field === '$' ? old : own(old, field);
        const current = field === '$' ? next : own(next, field);
        if (previous === current && !(this.needsHotPrune && child.node.table === 'world_settings'))
          continue;
        const childPath = field === '$' ? path : [...path, field];
        if (child.mode === 'one') {
          visit(child.node, previous ?? undefined, current ?? undefined, childPath, id, field, 0);
          continue;
        }
        if (child.mode === 'list') {
          const a = Array.isArray(previous) ? previous : [];
          const b = Array.isArray(current) ? current : [];
          const placement = historyPositions.get(a);
          const appended = appendedRecordCount(a, b);
          const nextPlacement = placement
            ? {
                positions: new Map<string, number>(
                  appended === undefined ? [] : placement.positions,
                ),
                next: placement.next,
              }
            : undefined;
          const start = appended === undefined ? 0 : a.length;
          const key = (entry: Value, index: number) =>
            child.key ? String(own(entry, child.key) ?? index) : String(index);
          const prior = new Map(
            a.slice(start).map((entry, i) => [key(entry, start + i), { entry, index: start + i }]),
          );
          const seen = new Set<string>();
          for (let i = start; i < b.length; i++) {
            const entry = b[i],
              entryId = key(entry, i);
            if (seen.has(entryId))
              throw new Error(`Duplicate record identity in ${child.node.table}.`);
            seen.add(entryId);
            const previousEntry = prior.get(entryId);
            const oldIndex = placement?.positions.get(entryId) ?? previousEntry?.index;
            const position =
              nextPlacement && !(placement?.complete && child.node.table === 'mind_summaries')
                ? (oldIndex ?? nextPlacement.next++)
                : i;
            nextPlacement?.positions.set(entryId, position);
            visit(
              child.node,
              previousEntry?.entry,
              entry,
              [...childPath, entryId],
              id,
              String(position),
              position,
              oldIndex,
            );
            prior.delete(entryId);
          }
          if (nextPlacement)
            historyPositions.set(b, {
              ...nextPlacement,
              complete: placement?.complete,
              next:
                placement?.complete && child.node.table === 'mind_summaries'
                  ? b.length
                  : nextPlacement.next,
            });
          for (const [entryId, entry] of prior)
            visit(child.node, entry.entry, undefined, [...childPath, entryId], id, '', entry.index);
        } else {
          const oldEntries = new Map(
            members(previous).map(([key, entry], index) => [key, { entry, index }]),
          );
          let index = 0;
          for (const [key, entry] of members(current)) {
            const prior = oldEntries.get(key);
            visit(
              child.node,
              prior?.entry,
              entry,
              [...childPath, key],
              id,
              key,
              index++,
              prior?.index,
            );
            oldEntries.delete(key);
          }
          for (const [key, prior] of oldEntries)
            visit(child.node, prior.entry, undefined, [...childPath, key], id, key, prior.index);
        }
      }
    };
    visit(WORLD_RECORD_SCHEMA, before, after, [], '', '', 0);
    return changes;
  }
  async write(worldId: string, revision: number, changes: RecordChanges) {
    for (const [table, ids] of changes.deletes)
      for (let offset = 0; offset < ids.length; offset += 800) {
        const batch = ids.slice(offset, offset + 800);
        await this.db
          .prepare(
            `DELETE FROM ${table} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .run(worldId, ...batch);
      }
    // Schema preorder guarantees parents exist before children, including brand-new actors.
    for (const [table, node] of RECORD_NODES) {
      const rows = changes.writes.get(table);
      if (!rows?.length) continue;
      const columns = [
        'world_id',
        'id',
        'parent_id',
        'slot',
        'position',
        'revision',
        'payload',
        ...Object.keys(node.columns ?? {}),
      ];
      for (let offset = 0; offset < rows.length; ) {
        const batch: unknown[][] = [];
        const create = rows[offset]!.create;
        let bytes = 0;
        while (offset < rows.length && (batch.length + 1) * columns.length <= 900) {
          const row = rows[offset]!;
          if (row.create !== create) break;
          if (batch.length && bytes + Buffer.byteLength(row.payload) > 262144) break;
          bytes += Buffer.byteLength(row.payload);
          offset++;
          batch.push([
            worldId,
            row.id,
            row.parent,
            row.slot,
            row.position,
            revision,
            row.payload,
            ...row.extra,
          ]);
        }
        await this.db
          .prepare(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES ${batch.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}
          ${
            create
              ? ''
              : `ON CONFLICT(world_id,id) DO UPDATE SET ${columns
                  .slice(2)
                  .map((column) => `${column}=excluded.${column}`)
                  .join(',')}`
          }`,
          )
          .run(...batch.flat());
      }
    }
  }
  async load(active = false): Promise<{ revision: number; state: SavedWorld } | null> {
    return this.db.readTransaction
      ? this.db.readTransaction(() => this.readRecords(active))
      : this.db.transaction(() => this.readRecords(active));
  }
  private async readRecords(
    active: boolean,
  ): Promise<{ revision: number; state: SavedWorld } | null> {
    const head = await this.head();
    if (!head) return null;
    if (active) {
      const experience = await this.db
        .prepare('SELECT payload FROM experience_state WHERE world_id=?')
        .get(head.worldId);
      // Legacy perspective migration needs every source once; subsequent boots are scoped.
      if (!experience || JSON.parse(String(experience['payload'])).perspectiveVersion !== 1)
        active = false;
    }
    const settings = active
      ? await this.db
          .prepare('SELECT payload FROM world_settings WHERE world_id=?')
          .get(head.worldId)
      : undefined;
    const cutoff = settings
      ? Number(JSON.parse(String(settings['payload'])).simTime) - EXPERIENCE_LIMITS.rawHours * 3600
      : 0;
    const groups = new Map<string, Map<string, JsonRecord[]>>();
    // Startup recovery loads the simulation working set. Ordinary feature reads use
    // scoped repositories below, not this complete reconstruction path.
    for (const table of RECORD_NODES.keys()) {
      if (active && table === 'world_hot_events') {
        groups.set(table, new Map());
        continue;
      }
      const eventId =
        this.db.dialect === 'postgres'
          ? "(t.payload::jsonb ->> 'id')"
          : "json_extract(t.payload, '$.id')";
      const partial = active && HISTORY_TABLES.has(table);
      const json = (field: string) =>
        this.db.dialect === 'postgres'
          ? `payload::jsonb ->> '${field}'`
          : `json_extract(payload, '$.${field}')`;
      const predicate =
        table === 'mind_memories'
          ? `(at>=? OR (kind='commitment' AND COALESCE(CAST(${json('resolved')} AS TEXT),'false') IN ('false','0')))`
          : table === 'mind_awareness'
            ? `(at>=? OR position IN (SELECT position FROM mind_awareness recent WHERE recent.world_id=t.world_id AND recent.actor_id=t.actor_id ORDER BY position DESC LIMIT 24))`
            : '1=0';
      // Migration must precede eviction. Keep only legacy records whose source event
      // is still available to the existing domain migration; the partial index avoids
      // parsing every cold payload at each boot. Migration commits before release.
      const migrateAwareness = partial && table === 'mind_awareness';
      const legacy = migrateAwareness
        ? ` UNION SELECT id,parent_id,slot,position,payload FROM mind_awareness
          WHERE world_id=? AND ${this.legacyAwarenessPredicate} AND source_id IN
          (SELECT ${this.db.dialect === 'postgres' ? "payload::jsonb ->> 'id'" : "json_extract(payload, '$.id')"} FROM world_hot_events WHERE world_id=?)`
        : '';
      const rows = await this.db
        .prepare(
          table === 'world_hot_events'
            ? `SELECT t.id,t.parent_id,t.slot,t.position,h.payload FROM world_hot_events t LEFT JOIN history_events h ON h.world_id=t.world_id AND h.id=${eventId} WHERE t.world_id=? ORDER BY t.parent_id,t.position`
            : `SELECT id,parent_id,slot,position,payload FROM ${table} t WHERE world_id=?${partial ? ` AND ${predicate}` : ''}${legacy} ORDER BY parent_id,position`,
        )
        .all(
          head.worldId,
          ...(partial && table !== 'mind_summaries' ? [cutoff] : []),
          ...(migrateAwareness ? [head.worldId, head.worldId] : []),
        );
      const parents = new Map<string, JsonRecord[]>();
      for (const row of rows) {
        if (typeof row['payload'] !== 'string')
          throw new Error('Active history references a missing source; recovery refused.');
        const parent = String(row['parent_id']),
          siblings = parents.get(parent) ?? [];
        siblings.push(row);
        parents.set(parent, siblings);
      }
      groups.set(table, parents);
    }
    const nextPositions = new Map<string, number>();
    if (active)
      for (const table of HISTORY_TABLES) {
        for (const row of await this.db
          .prepare(
            `SELECT parent_id,MAX(position)+1 AS next FROM ${table} WHERE world_id=? GROUP BY parent_id`,
          )
          .all(head.worldId))
          nextPositions.set(`${table}:${row['parent_id']}`, Number(row['next']));
      }
    let consumed = 0;
    const assemble = (node: RecordNode, row: JsonRecord): Value => {
      consumed++;
      const value: Value = JSON.parse(String(row['payload']));
      for (const [field, child] of Object.entries(node.children ?? {})) {
        const placeholder = field === '$' ? value : own(value, field);
        const children = groups.get(child.node.table)?.get(String(row['id'])) ?? [];
        if (placeholder === undefined || placeholder === null) {
          if (children.length) throw new Error('Orphaned gameplay records; recovery refused.');
          continue;
        }
        if (child.mode === 'one') {
          if (children.length !== 1)
            throw new Error(`Missing ${child.node.table} record; recovery refused.`);
          put(value, field, assemble(child.node, children[0]!));
        } else {
          const target = field === '$' ? value : child.mode === 'list' ? [] : {};
          for (const entry of children)
            put(
              target,
              HISTORY_TABLES.has(child.node.table) || child.node.table === 'world_hot_events'
                ? String((target as unknown[]).length)
                : String(entry['slot']),
              assemble(child.node, entry),
            );
          if (HISTORY_TABLES.has(child.node.table) || child.node.table === 'world_hot_events') {
            const entries = target as unknown[];
            historyPositions.set(entries, {
              complete: !active,
              positions: new Map(
                entries.map((entry, i) => [historyKey(entry), Number(children[i]!['position'])]),
              ),
              next: active
                ? (nextPositions.get(`${child.node.table}:${row['id']}`) ?? 0)
                : children.length
                  ? Number(children.at(-1)!['position']) + 1
                  : 0,
            });
          }
          if (field !== '$') put(value, field, target);
        }
      }
      return value;
    };
    const roots = groups.get(WORLD_RECORD_SCHEMA.table)?.get('') ?? [];
    if (roots.length !== 1) throw new Error('Missing world control record; recovery refused.');
    const state = assemble(WORLD_RECORD_SCHEMA, roots[0]!) as SavedWorld;
    const total = [...groups.values()].reduce(
      (sum, parents) => sum + [...parents.values()].reduce((count, rows) => count + rows.length, 0),
      0,
    );
    if (consumed !== total || state.world.id !== head.worldId)
      throw new Error('Gameplay record coverage mismatch; recovery refused.');
    if (active) {
      const missing = await this.db
        .prepare(
          `SELECT 1 AS missing FROM world_hot_events t LEFT JOIN history_events h ON h.world_id=t.world_id AND h.id=${this.db.dialect === 'postgres' ? "t.payload::jsonb ->> 'id'" : "json_extract(t.payload, '$.id')"} WHERE t.world_id=? AND h.id IS NULL LIMIT 1`,
        )
        .get(head.worldId);
      if (missing) throw new Error('Active history references a missing source; recovery refused.');
      const ids = [...hotEventDependencies(state.world)];
      const selector =
        this.db.dialect === 'postgres'
          ? 'SELECT value FROM jsonb_array_elements_text(?::jsonb)'
          : 'SELECT value FROM json_each(?)';
      const rows = await this.db
        .prepare(
          `SELECT t.position,h.payload FROM world_hot_events t JOIN history_events h ON h.world_id=t.world_id AND h.id=${this.db.dialect === 'postgres' ? "t.payload::jsonb ->> 'id'" : "json_extract(t.payload, '$.id')"} WHERE t.world_id=? AND (t.position IN (SELECT position FROM world_hot_events WHERE world_id=? ORDER BY position DESC LIMIT 512) OR h.id IN (${selector})) ORDER BY t.position`,
        )
        .all(head.worldId, head.worldId, JSON.stringify(ids));
      state.world.events = rows.map((row) => JSON.parse(String(row['payload'])));
      historyPositions.set(state.world.events, {
        positions: new Map(
          state.world.events.map((entry, i) => [entry.id, Number(rows[i]!['position'])]),
        ),
        next: rows.length ? Number(rows.at(-1)!['position']) + 1 : 0,
      });
      const count = Number(
        (
          await this.db
            .prepare('SELECT COUNT(*) AS n FROM world_hot_events WHERE world_id=?')
            .get(head.worldId)
        )?.['n'],
      );
      const removed = count - state.world.events.length;
      if (removed < 0) throw new Error('Invalid active event coverage.');
      if (removed) state.world.archivedEventCount = (state.world.archivedEventCount ?? 0) + removed;
      this.needsHotPrune ||= removed > 0;
    }
    return { revision: head.revision, state };
  }
  async pruneActiveEvents(state: SavedWorld): Promise<void> {
    const selector =
      this.db.dialect === 'postgres'
        ? 'SELECT value FROM jsonb_array_elements_text(?::jsonb)'
        : 'SELECT value FROM json_each(?)';
    await this.db
      .prepare(`DELETE FROM world_hot_events WHERE world_id=? AND id NOT IN (${selector})`)
      .run(
        state.world.id,
        JSON.stringify(state.world.events.map((event) => recordId(['world', 'events', event.id]))),
      );
  }
  /** Explicit dependency materialization for maintenance/edit/save, never a tick read. */
  async withHistory(state: SavedWorld, actorIds?: string[]): Promise<SavedWorld> {
    return this.db.readTransaction
      ? this.db.readTransaction(() => this.readHistory(state, actorIds))
      : this.db.transaction(() => this.readHistory(state, actorIds));
  }
  private async readHistory(state: SavedWorld, actorIds?: string[]): Promise<SavedWorld> {
    const world = state.world;
    if (!world.experience) return state;
    const memories = { ...world.memories },
      awareness = { ...world.experience.awareness },
      summaries = { ...world.experience.summaries };
    for (const [table, target] of [
      ['mind_memories', memories],
      ['mind_awareness', awareness],
      ['mind_summaries', summaries],
    ] as const) {
      const ids = actorIds ?? Object.keys(target);
      for (const actorId of ids) {
        const rows = await this.db
          .prepare(
            `SELECT payload,position FROM ${table} WHERE world_id=? AND actor_id=? ORDER BY position`,
          )
          .all(world.id, actorId);
        if (!rows.length && !Object.hasOwn(target, actorId)) continue;
        target[actorId] = rows.map((row) => JSON.parse(String(row['payload'])));
        historyPositions.set(target[actorId]!, {
          complete: true,
          positions: new Map(
            target[actorId]!.map((entry, i) => [historyKey(entry), Number(rows[i]!['position'])]),
          ),
          next: rows.length ? Number(rows.at(-1)!['position']) + 1 : 0,
        });
      }
    }
    return {
      ...state,
      world: { ...world, memories, experience: { ...world.experience, awareness, summaries } },
    };
  }
  async inventory(
    worldId: string,
    ownerId: string,
    limit = 100,
    afterId = '',
  ): Promise<ItemInstance[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new Error('Invalid inventory page size.');
    const rows = await this.db
      .prepare(
        'SELECT payload FROM sim_items WHERE world_id=? AND owner_id=? AND item_id>? ORDER BY item_id LIMIT ?',
      )
      .all(worldId, ownerId, afterId, limit);
    return rows.map((row) => JSON.parse(String(row['payload'])) as ItemInstance);
  }
  async entitySummary(
    worldId: string,
    entityId: string,
  ): Promise<Pick<Entity, 'id' | 'name' | 'kind'> | undefined> {
    const row = await this.db
      .prepare('SELECT entity_id,name,kind FROM sim_entities WHERE world_id=? AND entity_id=?')
      .get(worldId, entityId);
    return row
      ? {
          id: String(row['entity_id']),
          name: String(row['name']),
          kind: row['kind'] as Entity['kind'],
        }
      : undefined;
  }
}
