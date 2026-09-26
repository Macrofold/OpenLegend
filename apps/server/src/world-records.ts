import { tableRows } from './record-pages.js';
import { hotEventDependencies } from './hot-events.js';
import {
  HISTORY_TABLES,
  historyPositions,
  historyKey,
  materializedObjectHistory,
  HISTORY_MAP_TABLES,
  historyMapPositions,
} from './history-residency.js';
import { randomUUID, createHash } from 'node:crypto';
import { upgradeWorldState } from './upgrade-world.js';
import {
  EXPERIENCE_LIMITS,
  updateWorld,
  validateWorldModules,
  appendedRecordCount,
  entityChangesBetween,
  completeAppraisalHistory,
  markPartialAppraisals,
  completeContributionHistory,
  markPartialContributions,
  type Appraisal,
  type Entity,
  type ItemInstance,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import {
  RECORD_NODES,
  WORLD_RECORD_SCHEMA,
  legacyObjectRecordSchema,
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
const entityPositions = new WeakMap<object, ReadonlyMap<string, number>>();
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
  private readSchema = WORLD_RECORD_SCHEMA;
  private currentContributionsPredicate(alias = ''): string {
    const json = (field: string) =>
      this.db.dialect === 'postgres'
        ? `${alias}payload::jsonb ->> '${field}'`
        : `json_extract(${alias}payload, '$.${field}')`;
    // Only explicit terminal independent instances leave the current working set;
    // singleton cooldowns remain present. Complete capture validates cold rows too.
    return `(${json('contribution')} IS NULL OR ${json('active')} IS NULL OR CAST(${json('active')} AS TEXT) NOT IN ('false','0'))`;
  }
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
    const columns =
      this.db.dialect === 'postgres'
        ? await this.db
            .prepare(
              "SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='sim_placements'",
            )
            .all()
        : await this.db.prepare('PRAGMA table_info(sim_placements)').all();
    const legacyObjects =
      columns.length > 0 && !columns.some((column) => column['name'] === 'placement_mode');
    const create = (node: RecordNode, parent?: RecordNode): string => {
      const rebuilding = legacyObjects && ['sim_items', 'sim_placements'].includes(node.table);
      const extra = Object.entries(node.columns ?? {})
        .map(([name, column]) => `,${name} ${column.sql}`)
        .join('');
      const foreign = parent
        ? `,FOREIGN KEY(world_id,parent_id) REFERENCES ${parent.table}(world_id,id) ON DELETE CASCADE`
        : '';
      return `CREATE TABLE IF NOT EXISTS ${node.table} (
        world_id TEXT NOT NULL REFERENCES world_head(world_id), id TEXT NOT NULL,
        parent_id TEXT NOT NULL, slot TEXT NOT NULL, position BIGINT NOT NULL,
        revision BIGINT NOT NULL, payload TEXT NOT NULL${extra}, PRIMARY KEY(world_id,id)${foreign}${node.constraints?.length ? ',' + node.constraints.join(',') : ''}
      ); CREATE INDEX IF NOT EXISTS ${node.table}_parent ON ${node.table}(world_id,parent_id,position);
      ${(rebuilding ? [] : (node.uniqueIndexes ?? [])).map((columns, index) => `CREATE UNIQUE INDEX IF NOT EXISTS ${node.table}_identity${index} ON ${node.table}(world_id,${columns.join(',')});`).join('\n')}
      ${(rebuilding ? [] : (node.indexes ?? [])).map((columns, index) => `CREATE INDEX IF NOT EXISTS ${node.table}_query${index} ON ${node.table}(world_id,${columns.join(',')});`).join('\n')}
      ${Object.values(node.children ?? {})
        .map((child) => create(child.node, node))
        .join('\n')}`;
    };
    await this.db.exec(create(WORLD_RECORD_SCHEMA));
    const lineageCustodian =
      this.db.dialect === 'postgres'
        ? "(payload::jsonb ->> 'custodianId')"
        : "json_extract(payload, '$.custodianId')";
    await this.db.exec(`CREATE INDEX IF NOT EXISTS sim_object_lineage_custodian
      ON sim_object_lineage(world_id,(${lineageCustodian}),slot)`);
    if (legacyObjects) {
      // Read and validate before replacing either physical table. A failure rolls back
      // the whole schema/data cutover; no stale inventory representation is left writable.
      this.readSchema = legacyObjectRecordSchema();
      try {
        await this.db.transaction(async () => {
          const previous = await this.load(false);
          const state = previous && {
            ...previous.state,
            world: updateWorld(previous.state.world, upgradeWorldState),
          };
          if (state) validateWorldModules(state.world);
          await this.db.exec('DROP TABLE sim_items; DROP TABLE sim_placements;');
          // Recreate only the two changed ownership boundaries. Existing actor/entity
          // rows and unrelated history/authority/accounting remain in their tables.
          const entity = RECORD_NODES.get('sim_entities')!;
          for (const name of ['item', 'placement']) {
            const child = entity.children![name]!.node;
            await this.db.exec(create(child, entity));
            for (const [index, cols] of (child.uniqueIndexes ?? []).entries())
              await this.db.exec(
                `CREATE UNIQUE INDEX IF NOT EXISTS ${child.table}_identity${index} ON ${child.table}(world_id,${cols.join(',')})`,
              );
            for (const [index, cols] of (child.indexes ?? []).entries())
              await this.db.exec(
                `CREATE INDEX IF NOT EXISTS ${child.table}_query${index} ON ${child.table}(world_id,${cols.join(',')})`,
              );
          }
          if (previous && state) {
            const revision = await this.advance(state.world.id, previous.revision);
            // This full physical cutover also upgrades positional appraisal rows.
            // Remove those old identities inside the same rollback boundary before
            // inserting their stable replacements; no second writable store remains.
            if (Object.values(previous.state.world.appraisals ?? {}).some(Array.isArray))
              await this.db
                .prepare('DELETE FROM mind_appraisals WHERE world_id=?')
                .run(state.world.id);
            const changes = this.prepare(undefined, state);
            for (const rows of changes.writes.values()) for (const row of rows) row.create = false;
            await this.write(state.world.id, revision, changes);
            const checksum = (value: unknown) =>
              createHash('sha256').update(JSON.stringify(value)).digest('hex');
            await this.db
              .prepare(
                'INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
              )
              .run(
                `integration:object-placement-conversion:${state.world.id}`,
                JSON.stringify({
                  sourceRevision: previous.revision,
                  revision,
                  sourceChecksum: checksum(previous.state),
                  resultChecksum: checksum(state),
                  entities: Object.keys(state.world.entities).length,
                }),
              );
          }
        });
      } finally {
        this.readSchema = WORLD_RECORD_SCHEMA;
      }
    }
    await this.db.exec(
      `CREATE INDEX IF NOT EXISTS mind_awareness_legacy_trigger ON mind_awareness(world_id,source_id) WHERE ${this.legacyAwarenessPredicate}`,
    );
    const appraisalState =
      this.db.dialect === 'postgres'
        ? "payload::jsonb ->> 'state'"
        : "json_extract(payload, '$.state')";
    await this.db.exec(
      `CREATE INDEX IF NOT EXISTS mind_appraisals_current ON mind_appraisals(world_id,parent_id,position) WHERE ${appraisalState}='active' OR ${appraisalState} IS NULL`,
    );
    await this.db.exec(
      `CREATE INDEX IF NOT EXISTS sim_status_effects_current ON sim_status_effects(world_id,parent_id,position) WHERE ${this.currentContributionsPredicate()}`,
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
          if (child.node.table === 'sim_entities' && previous && current && !this.needsHotPrune) {
            const positions = entityPositions.get(previous as object);
            const touched =
              positions &&
              entityChangesBetween(
                previous as SavedWorld['world']['entities'],
                current as SavedWorld['world']['entities'],
              );
            // A membership change can shift canonical iteration order; retain the full
            // ordered diff for insert/delete. Value-only changes preserve every ordinal.
            if (
              touched &&
              [...touched].every(
                (key) => own(previous, key) !== undefined && own(current, key) !== undefined,
              )
            ) {
              for (const key of touched)
                visit(
                  child.node,
                  own(previous, key),
                  own(current, key),
                  [...childPath, key],
                  id,
                  key,
                  positions!.get(key)!,
                );
              entityPositions.set(current as object, positions!);
              continue;
            }
          }
          const oldEntries = new Map(
            members(previous).map(([key, entry], index) => [key, { entry, index }]),
          );
          let index = 0;
          const mapHistory = HISTORY_MAP_TABLES.has(child.node.table);
          const priorPlacement =
            previous && mapHistory ? historyMapPositions.get(previous as object) : undefined;
          const currentPlacement =
            current && mapHistory ? historyMapPositions.get(current as object) : undefined;
          const nextPlacement = mapHistory
            ? {
                positions: new Map<string, number>(),
                next: Math.max(
                  priorPlacement?.next ?? oldEntries.size,
                  currentPlacement?.next ?? 0,
                ),
              }
            : undefined;
          const positions =
            child.node.table === 'sim_entities' ? new Map<string, number>() : undefined;
          for (const [key, entry] of members(current)) {
            positions?.set(key, index);
            const prior = oldEntries.get(key);
            const oldPosition = priorPlacement?.positions.get(key) ?? prior?.index;
            const position = nextPlacement
              ? (oldPosition ?? currentPlacement?.positions.get(key) ?? nextPlacement.next++)
              : index;
            nextPlacement?.positions.set(key, position);
            visit(
              child.node,
              prior?.entry,
              entry,
              [...childPath, key],
              id,
              key,
              position,
              oldPosition,
            );
            index++;
            oldEntries.delete(key);
          }
          if (
            (child.node.table !== 'mind_appraisals' ||
              completeAppraisalHistory(current as Record<string, Appraisal> | undefined)) &&
            (child.node.table !== 'sim_status_effects' ||
              completeContributionHistory(current as Entity['statusEffects']))
          )
            for (const [key, prior] of oldEntries)
              visit(child.node, prior.entry, undefined, [...childPath, key], id, key, prior.index);
          if (positions && current && Object.isFrozen(current))
            entityPositions.set(current as object, positions);
          if (nextPlacement && current) historyMapPositions.set(current as object, nextPlacement);
        }
      }
    };
    visit(WORLD_RECORD_SCHEMA, before, after, [], '', '', 0);
    return changes;
  }
  async write(worldId: string, revision: number, changes: RecordChanges) {
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
    // Move physical children before deleting their old parent. Semantic containment
    // is restrictive; structural cascade ownership must never destroy those objects.
    for (const [table, ids] of changes.deletes)
      for (let offset = 0; offset < ids.length; offset += 800) {
        const batch = ids.slice(offset, offset + 800);
        await this.db
          .prepare(
            `DELETE FROM ${table} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .run(worldId, ...batch);
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
      const objectPredicate = !active
        ? ''
        : table === 'sim_status_effects'
          ? ` AND ${this.currentContributionsPredicate('t.')}`
          : table === 'mind_appraisals'
            ? ` AND (${this.db.dialect === 'postgres' ? "t.payload::jsonb ->> 'state'" : "json_extract(t.payload, '$.state')"}='active' OR ${this.db.dialect === 'postgres' ? "t.payload::jsonb ->> 'state'" : "json_extract(t.payload, '$.state')"} IS NULL)`
            : ['sim_object_lineage', 'sim_object_retirements'].includes(table)
              ? ' AND 1=0'
              : ['sim_entities', 'sim_entity_geometry', 'sim_declared_owners'].includes(table)
                ? ` AND NOT EXISTS (SELECT 1 FROM sim_object_retirements retired WHERE retired.world_id=t.world_id AND retired.parent_id=t.${table === 'sim_entities' ? 'id' : 'parent_id'})`
                : '';
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
      let rows: JsonRecord[] = [];
      if (!partial && !objectPredicate && table !== 'world_hot_events') {
        // Full recovery remains explicit, but each database transfer stays bounded.
        // Large PostgreSQL histories must not become one timeout-sized result.
        for await (const row of tableRows(this.db, table, head.worldId)) rows.push(row);
      } else {
        rows = await this.db
          .prepare(
            table === 'world_hot_events'
              ? `SELECT t.id,t.parent_id,t.slot,t.position,h.payload FROM world_hot_events t LEFT JOIN history_events h ON h.world_id=t.world_id AND h.id=${eventId} WHERE t.world_id=? ORDER BY t.parent_id,t.position`
              : `SELECT id,parent_id,slot,position,payload FROM ${table} t WHERE world_id=?${objectPredicate}${partial ? ` AND ${predicate}` : ''}${legacy} ORDER BY parent_id,position`,
          )
          .all(
            head.worldId,
            ...(partial && table !== 'mind_summaries' ? [cutoff] : []),
            ...(migrateAwareness ? [head.worldId, head.worldId] : []),
          );
      }
      const parents = new Map<string, JsonRecord[]>();
      for (const row of rows) {
        if (typeof row['payload'] !== 'string')
          throw new Error('Active history references a missing source; recovery refused.');
        const parent = String(row['parent_id']),
          siblings = parents.get(parent) ?? [];
        siblings.push(row);
        parents.set(parent, siblings);
      }
      for (const siblings of parents.values())
        siblings.sort((a, b) => Number(a['position']) - Number(b['position']));
      groups.set(table, parents);
    }
    const nextPositions = new Map<string, number>();
    if (active)
      for (const table of [...HISTORY_TABLES, ...HISTORY_MAP_TABLES]) {
        for (const row of await this.db
          .prepare(
            `SELECT parent_id,MAX(position)+1 AS next FROM ${table} WHERE world_id=? GROUP BY parent_id`,
          )
          .all(head.worldId))
          nextPositions.set(`${table}:${row['parent_id']}`, Number(row['next']));
      }
    const state = assembleWorldRecords(
      groups,
      head.worldId,
      active,
      nextPositions,
      this.readSchema,
    );
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
  async withHistory(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld> {
    return this.db.readTransaction
      ? this.db.readTransaction(() => this.readHistory(state, actorIds, sourceIds))
      : this.db.transaction(() => this.readHistory(state, actorIds, sourceIds));
  }
  private async readHistory(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld> {
    if (sourceIds && (!sourceIds.length || sourceIds.length > 128 || actorIds?.length !== 1))
      throw new Error('Invalid bounded history scope.');
    // Consolidation changes only its selected evidence. Current appraisal/contribution
    // state stays resident; terminal records are needed for full owner edits, not grouping.
    let world = state.world;
    if (!sourceIds) {
      // Unscoped materialization is the save/restore boundary; actor maintenance does
      // not need unrelated physical history. Never infer completeness from a hot map.
      if (!actorIds) state = await this.withObjectHistory(state);
      const entities = { ...state.world.entities };
      for (const actorId of actorIds ?? Object.keys(entities)) {
        const entity = entities[actorId];
        if (!entity || completeContributionHistory(entity.statusEffects)) continue;
        const rows = await this.db
          .prepare(
            'SELECT slot,position,payload FROM sim_status_effects WHERE world_id=? AND parent_id=? ORDER BY position,id',
          )
          .all(state.world.id, recordId(['world', 'entities', actorId]));
        entities[actorId] = {
          ...entity,
          statusEffects: Object.fromEntries(
            rows.map((row) => [String(row['slot']), JSON.parse(String(row['payload']))]),
          ),
        };
        historyMapPositions.set(entities[actorId]!.statusEffects!, {
          positions: new Map(rows.map((row) => [String(row['slot']), Number(row['position'])])),
          next: rows.length ? Number(rows.at(-1)!['position']) + 1 : 0,
        });
      }
      const appraisals = { ...state.world.appraisals };
      for (const actorId of actorIds ?? Object.keys(appraisals)) {
        const rows = await this.db
          .prepare(
            'SELECT slot,position,payload FROM mind_appraisals WHERE world_id=? AND parent_id=? ORDER BY position,id',
          )
          .all(state.world.id, recordId(['world', 'appraisals', actorId]));
        if (rows.length || Object.hasOwn(appraisals, actorId)) {
          appraisals[actorId] = Object.fromEntries(
            rows.map((row) => {
              const value = JSON.parse(String(row['payload'])) as Appraisal;
              return [value.id, value];
            }),
          );
          historyMapPositions.set(appraisals[actorId]!, {
            positions: new Map(rows.map((row) => [String(row['slot']), Number(row['position'])])),
            next: rows.length ? Number(rows.at(-1)!['position']) + 1 : 0,
          });
        }
      }
      world = {
        ...state.world,
        entities,
        ...(state.world.appraisals || Object.keys(appraisals).length ? { appraisals } : {}),
      };
    }
    if (!world.experience) return { ...state, world };
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
            `SELECT payload,position FROM ${table} WHERE world_id=? AND actor_id=?${sourceIds ? ` AND source_id IN (${sourceIds.map(() => '?').join(',')})${table === 'mind_memories' ? ` UNION SELECT payload,position FROM ${table} WHERE world_id=? AND actor_id=? AND event_id IN (${sourceIds.map(() => '?').join(',')})` : ''}` : ''} ORDER BY position${sourceIds ? ' LIMIT 513' : ''}`,
          )
          .all(
            world.id,
            actorId,
            ...(sourceIds ?? []),
            ...(sourceIds && table === 'mind_memories' ? [world.id, actorId, ...sourceIds] : []),
          );
        if (sourceIds && rows.length > 512)
          throw new Error(
            'Maintenance source aliases exceed the bounded publication allowance; originals retained.',
          );
        if (!rows.length && !Object.hasOwn(target, actorId)) continue;
        const old = target[actorId] ?? [];
        const placement = historyPositions.get(old);
        const loaded = rows.map((row) => JSON.parse(String(row['payload'])));
        const selected = new Set(loaded.map(historyKey));
        target[actorId] = sourceIds
          ? [...old.filter((entry) => !selected.has(historyKey(entry))), ...loaded]
          : loaded;
        const next = sourceIds
          ? Number(
              (
                await this.db
                  .prepare(
                    `SELECT MAX(position) AS position FROM ${table} WHERE world_id=? AND actor_id=?`,
                  )
                  .get(world.id, actorId)
              )?.['position'] ?? -1,
            ) + 1
          : rows.length
            ? Number(rows.at(-1)!['position']) + 1
            : 0;
        historyPositions.set(target[actorId]!, {
          complete: !sourceIds,
          positions: new Map([
            ...(sourceIds
              ? old.map(
                  (entry, i) =>
                    [historyKey(entry), placement?.positions.get(historyKey(entry)) ?? i] as const,
                )
              : []),
            ...loaded.map((entry, i) => [historyKey(entry), Number(rows[i]!['position'])] as const),
          ]),
          next,
        });
      }
    }
    return {
      ...state,
      world: { ...world, memories, experience: { ...world.experience, awareness, summaries } },
    };
  }
  /** Canonical terminal outcomes for exactly the proposed create identities. The
   * principal/source/timeline fence is checked by WorldService's publication lane. */
  async appraisalOutcomes(
    worldId: string,
    actorId: string,
    ids: readonly string[],
  ): Promise<Record<string, Appraisal>> {
    if (ids.length > 8) throw new Error('Too many appraisal outcome bindings.');
    if (!ids.length) return {};
    const rows = await this.db
      .prepare(
        `SELECT payload FROM mind_appraisals WHERE world_id=? AND parent_id=? AND id IN (${ids.map(() => '?').join(',')})`,
      )
      .all(
        worldId,
        recordId(['world', 'appraisals', actorId]),
        ...ids.map((id) => recordId(['world', 'appraisals', actorId, id])),
      );
    return Object.fromEntries(
      rows.map((row) => {
        const value = JSON.parse(String(row['payload'])) as Appraisal;
        return [value.id, value];
      }),
    );
  }
  private async withObjectHistory(state: SavedWorld): Promise<SavedWorld> {
    materializedObjectHistory(state.world);
    const entities = { ...state.world.entities },
      objectLineage = { ...state.world.objectLineage };
    const rows = await this.db
      .prepare(
        `SELECT e.payload AS entity,r.payload AS retirement,g.payload AS spatial,o.payload AS declared_owner
      FROM sim_object_retirements r JOIN sim_entities e ON e.world_id=r.world_id AND e.id=r.parent_id
      JOIN sim_entity_geometry g ON g.world_id=e.world_id AND g.parent_id=e.id
      LEFT JOIN sim_declared_owners o ON o.world_id=e.world_id AND o.parent_id=e.id WHERE r.world_id=?`,
      )
      .all(state.world.id);
    for (const row of rows) {
      const entity = JSON.parse(String(row['entity'])) as Entity;
      if (entities[entity.id]) continue;
      entity.retirement = JSON.parse(String(row['retirement']));
      entity.spatial = JSON.parse(String(row['spatial']));
      if (row['declared_owner']) entity.declaredOwner = JSON.parse(String(row['declared_owner']));
      entities[entity.id] = entity;
    }
    for (const row of await this.db
      .prepare('SELECT slot,payload FROM sim_object_lineage WHERE world_id=?')
      .all(state.world.id)) {
      const id = String(row['slot']);
      if (!Object.hasOwn(objectLineage, id)) objectLineage[id] = JSON.parse(String(row['payload']));
    }
    return {
      ...state,
      world: {
        ...state.world,
        entities,
        ...(Object.keys(objectLineage).length || state.world.objectLineage
          ? { objectLineage }
          : {}),
      },
    };
  }
  /** Cold historical identities stay outside the live simulation set. Current request
   * authority is checked by the service; this query requires occurrence-time custody. */
  async objectHistory(worldId: string, actorId: string, after = '', objectId?: string) {
    const custodian =
      this.db.dialect === 'postgres'
        ? "(l.payload::jsonb ->> 'custodianId')"
        : "json_extract(l.payload, '$.custodianId')";
    const rows = await this.db
      .prepare(
        `SELECT l.payload, e.payload AS entity
      FROM sim_object_lineage l JOIN sim_entities e ON e.world_id=l.world_id AND e.entity_id=l.source_id
      WHERE l.world_id=? AND ${custodian}=? AND l.slot>?
      ${objectId ? 'AND (l.source_id=? OR l.target_id=?)' : ''}
      ORDER BY l.slot LIMIT 41`,
      )
      .all(worldId, actorId, after, ...(objectId ? [objectId, objectId] : []));
    const entries = rows.slice(0, 40).map((row) => {
      const record = JSON.parse(
        String(row['payload']),
      ) as import('@open-legend/domain').ObjectLineage;
      const entity = JSON.parse(String(row['entity'])) as Entity;
      return {
        id: record.id,
        at: record.at,
        type: record.type,
        quantity: record.quantity,
        name: entity.name,
        sourceId: record.sourceId,
        targetId: record.targetId,
      };
    });
    return { entries, after: rows.length > 40 ? entries.at(-1)!.id : undefined };
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
        'SELECT i.payload,i.item_id,p.payload AS placement FROM sim_items i JOIN sim_placements p ON p.world_id=i.world_id AND p.entity_id=i.item_id WHERE i.world_id=? AND p.physical_parent_id=? AND i.item_id>? ORDER BY i.item_id LIMIT ?',
      )
      .all(worldId, ownerId, afterId, limit);
    return rows.map((row) => {
      const lot = JSON.parse(
        String(row['payload']),
      ) as import('@open-legend/domain').Entity['item'];
      const placement = JSON.parse(
        String(row['placement']),
      ) as import('@open-legend/domain').Entity['placement'];
      return {
        id: String(row['item_id']),
        ownerId,
        definitionId: lot!.definitionPin.id,
        quantity: lot!.quantity,
        revision: lot!.revision,
        individuality: lot!.individuality,
        placementRevision: placement!.revision,
      };
    });
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

/** Reuse the canonical codec for database recovery and streamed checkpoints. */
export function assembleWorldRecords(
  groups: Map<string, Map<string, JsonRecord[]>>,
  worldId: string,
  active = false,
  nextPositions = new Map<string, number>(),
  schema = WORLD_RECORD_SCHEMA,
): SavedWorld {
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
        const slots = new Set<string>();
        for (const entry of children) {
          const slot = String(entry[child.mode === 'list' ? 'position' : 'slot']);
          if (slots.has(slot))
            throw new Error('Duplicate gameplay record placement; recovery refused.');
          slots.add(slot);
          put(
            target,
            HISTORY_TABLES.has(child.node.table) || child.node.table === 'world_hot_events'
              ? String((target as unknown[]).length)
              : String(entry['slot']),
            assemble(child.node, entry),
          );
        }
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
        if (HISTORY_MAP_TABLES.has(child.node.table))
          historyMapPositions.set(target as object, {
            positions: new Map(
              children.map((entry) => [String(entry['slot']), Number(entry['position'])]),
            ),
            next: active
              ? (nextPositions.get(`${child.node.table}:${row['id']}`) ?? 0)
              : children.length
                ? Number(children.at(-1)!['position']) + 1
                : 0,
          });
        if (field !== '$') put(value, field, target);
      }
    }
    return value;
  };
  const roots = groups.get(schema.table)?.get('') ?? [];
  if (roots.length !== 1) throw new Error('Missing world control record; recovery refused.');
  const state = assemble(schema, roots[0]!) as SavedWorld;
  if (active) {
    for (const records of Object.values(state.world.appraisals ?? {}))
      markPartialAppraisals(records);
    for (const entity of Object.values(state.world.entities))
      if (entity.statusEffects) markPartialContributions(entity.statusEffects);
  }
  const total = [...groups.values()].reduce(
    (sum, parents) => sum + [...parents.values()].reduce((count, rows) => count + rows.length, 0),
    0,
  );
  if (consumed !== total || state.world.id !== worldId)
    throw new Error('Gameplay record coverage mismatch; recovery refused.');
  return state;
}
