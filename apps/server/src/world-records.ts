import { sqlRecordBatches, SqlWriteBatch } from './sql-rows.js';
import { tableRows } from './record-pages.js';
import { hotEventDependencies } from './hot-events.js';
import {
  HISTORY_TABLES,
  HOT_AWARENESS_ROWS,
  historyPositions,
  historyKey,
  materializedObjectHistory,
  HISTORY_MAP_TABLES,
  historyMapPositions,
} from './history-residency.js';
import { randomUUID, createHash } from 'node:crypto';
import {
  EXPERIENCE_LIMITS,
  RESPONSE_LIMITS,
  orderedRecordEntries,
  orderedRecordGet,
  orderedRecordChangedKeys,
  orderedRecordSet,
  type OrderedRecord,
  updateWorld,
  appendedRecordCount,
  entityChangesBetween,
  recordMapChangesBetween,
  entityGet,
  entityHas,
  entityOrdering,
  entityKeys,
  entityValues,
  entityEntries,
  entitySet,
  emptyEntities,
  cloneEntities,
  completeAppraisalHistory,
  markPartialAppraisals,
  completeContributionHistory,
  markPartialContributions,
  markPartialObjectHistory,
  completeObjectHistory,
  isSafeRecordId,
  isImmutableData,
  type Appraisal,
  type Entity,
  type ItemInstance,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import {
  RECORD_NODES,
  WORLD_RECORD_SCHEMA,
  RECORD_PARENTS,
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
const entityPositions = new WeakMap<object, { values: OrderedRecord<number>; next: number }>();
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
// Only small frequently changed projections are retained, weakly by immutable
// source identity. Excluded child records are not traversed or copied to prove
// this projection immutable; their own records keep their existing owner.
const encodedRecords = new WeakMap<object, WeakMap<RecordNode, string>>();
const reusableTables = new Set([
  'sim_placements',
  'sim_entity_geometry',
  'sim_actors',
  'sim_processes',
  'sim_actor_attributes',
  'sim_actor_conditions',
  'sim_status_effects',
  'sim_work_invocations',
  'sim_native_response_episodes',
]);
function encodedBody(node: RecordNode, value: Value): string {
  const reusable =
    !!value &&
    typeof value === 'object' &&
    Object.isFrozen(value) &&
    reusableTables.has(node.table);
  const cached = reusable ? encodedRecords.get(value)?.get(node) : undefined;
  if (cached !== undefined) return cached;
  const projected = body(node, value),
    payload = JSON.stringify(projected);
  if (
    reusable &&
    payload.length <= 65536 &&
    Object.entries(projected as JsonRecord).every(
      ([key, field]) =>
        !!node.children?.[key] || !field || typeof field !== 'object' || isImmutableData(field),
    )
  ) {
    let entries = encodedRecords.get(value);
    if (!entries) encodedRecords.set(value, (entries = new WeakMap()));
    entries.set(node, payload);
  }
  return payload;
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
function recordIndexName(table: string, columns: string[], unique = false): string {
  const name = `${table}_${columns.join('_')}_${unique ? 'key' : 'idx'}`;
  return name.length <= 63
    ? name
    : `${name.slice(0, 50)}_${createHash('sha256').update(name).digest('hex').slice(0, 12)}`;
}

export class WorldRecords {
  constructor(readonly db: SqlDatabase) {}
  needsHotPrune = false;
  private currentContributionsPredicate(alias = ''): string {
    const json = (field: string) => `${alias}payload::jsonb ->> '${field}'`;
    // Only explicit terminal independent instances leave the current working set;
    // singleton cooldowns remain present. Complete capture validates cold rows too.
    return `(${json('contribution')} IS NULL OR ${json('active')} IS NULL OR CAST(${json('active')} AS TEXT) NOT IN ('false','0'))`;
  }
  private currentEntityPredicate(table: string): string {
    if (table === 'sim_entities')
      return ' AND NOT EXISTS (SELECT 1 FROM sim_object_retirements retired WHERE retired.world_id=t.world_id AND retired.parent_id=t.id)';
    const parents: string[] = [];
    let parent = RECORD_PARENTS.get(table);
    while (parent && parent !== 'sim_entities') {
      parents.push(parent);
      parent = RECORD_PARENTS.get(parent);
    }
    if (!parent) return '';
    // A consumed material may retain attributes as cold history. Every owned component
    // follows its entity's residency, rather than leaving children without a loaded parent.
    // docs/projects/completed/persistent-objects-tech-design.md#2-identity-and-canonical-representation
    const joins = parents
      .map((table, index) => {
        const previous = index ? `owner${index - 1}` : 't';
        return ` JOIN ${table} owner${index} ON owner${index}.world_id=${previous}.world_id AND owner${index}.id=${previous}.parent_id`;
      })
      .join('');
    const owner = parents.length ? `owner${parents.length - 1}` : 't';
    return ` AND NOT EXISTS (SELECT 1 FROM sim_object_retirements retired${joins} WHERE retired.world_id=t.world_id AND retired.parent_id=${owner}.parent_id)`;
  }
  private async validateHistoricalMaterialOrigins(state: SavedWorld): Promise<void> {
    const absent = new Set<string>();
    for (const entity of entityValues(state.world.entities)) {
      for (const origins of [
        entity.item?.materialOriginIds,
        entity.actor?.action?.materialOriginIds,
      ]) {
        if (origins === undefined) continue;
        if (!Array.isArray(origins)) throw new Error('Invalid physical material provenance.');
        for (const origin of origins) {
          if (!isSafeRecordId(origin)) throw new Error('Invalid physical material provenance.');
          if (!entityHas(state.world.entities, origin)) absent.add(origin);
        }
      }
    }
    // Only missing historical identities need SQL. Keep the lookup in this same read
    // snapshot and select existence through the owning (world, entity) unique index.
    // A partial working set cannot excuse a missing canonical source record.
    // docs/save-and-load.md#continuation-and-identity
    const ids = [...absent];
    for (let offset = 0; offset < ids.length; offset += 256) {
      const missing = await this.db
        .prepare(
          `SELECT source.value AS id FROM jsonb_array_elements_text(?::jsonb) source
           WHERE NOT EXISTS (SELECT 1 FROM sim_entities entity
             JOIN sim_object_retirements retirement
               ON retirement.world_id=entity.world_id AND retirement.parent_id=entity.id
             WHERE entity.world_id=? AND entity.entity_id=source.value) LIMIT 1`,
        )
        .get(JSON.stringify(ids.slice(offset, offset + 256)), state.world.id);
      if (missing)
        throw new Error('Physical material provenance references a missing source identity.');
    }
  }
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS world_head (
      id BIGINT PRIMARY KEY CHECK (id=1), world_id TEXT NOT NULL UNIQUE,
      revision BIGINT NOT NULL CHECK (revision>=0), generation TEXT NOT NULL,
      applied_revision BIGINT NOT NULL CHECK (applied_revision>=0 AND applied_revision<=revision)
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
        revision BIGINT NOT NULL, payload TEXT NOT NULL${extra}, PRIMARY KEY(world_id,id)${foreign}${node.constraints?.length ? ',' + node.constraints.join(',') : ''}
      ); CREATE INDEX IF NOT EXISTS ${node.table}_parent ON ${node.table}(world_id,parent_id,position);
      ${(node.uniqueIndexes ?? []).map((columns) => `CREATE UNIQUE INDEX IF NOT EXISTS ${recordIndexName(node.table, columns, true)} ON ${node.table}(world_id,${columns.join(',')});`).join('\n')}
      ${(node.indexes ?? []).map((columns) => `CREATE INDEX IF NOT EXISTS ${recordIndexName(node.table, columns)} ON ${node.table}(world_id,${columns.join(',')});`).join('\n')}
      ${Object.values(node.children ?? {})
        .map((child) => create(child.node, node))
        .join('\n')}`;
    };
    await this.db.exec(create(WORLD_RECORD_SCHEMA));
    const lineageCustodian = "(payload::jsonb ->> 'custodianId')";
    await this.db.exec(`CREATE INDEX IF NOT EXISTS sim_object_lineage_custodian
      ON sim_object_lineage(world_id,(${lineageCustodian}),slot)`);
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS mind_memories_recent ON mind_memories(world_id,at);
      CREATE INDEX IF NOT EXISTS mind_memories_unresolved ON mind_memories(world_id,parent_id,position) WHERE unresolved=1;
      CREATE INDEX IF NOT EXISTS mind_corrections_world_source ON mind_corrections(world_id,source_id,actor_id);
      CREATE INDEX IF NOT EXISTS mind_corrections_world_evidence ON mind_corrections(world_id,correction_id,actor_id);
      CREATE INDEX IF NOT EXISTS mind_corrections_evidence ON mind_corrections(world_id,actor_id,correction_id);
    `);
    const appraisalState = "payload::jsonb ->> 'state'";
    await this.db.exec(
      `CREATE INDEX IF NOT EXISTS mind_appraisals_current ON mind_appraisals(world_id,parent_id,position) WHERE ${appraisalState}='active' OR ${appraisalState} IS NULL`,
    );
    await this.db.exec(
      `CREATE INDEX IF NOT EXISTS sim_status_effects_current ON sim_status_effects(world_id,parent_id,position) WHERE ${this.currentContributionsPredicate()}`,
    );
  }
  async head() {
    const row = await this.db
      .prepare('SELECT world_id,revision,generation,applied_revision FROM world_head WHERE id=1')
      .get();
    return row
      ? {
          worldId: String(row['world_id']),
          revision: Number(row['revision']),
          generation: String(row['generation']),
          appliedRevision: Number(row['applied_revision']),
        }
      : null;
  }
  /** Acquire the write fence before touching any effects. Caller owns the transaction. */
  async advance(worldId: string, expected: number, restore = false): Promise<number> {
    if (expected === 0)
      await this.db
        .prepare('INSERT INTO world_head VALUES (1,?,0,?,0) ON CONFLICT(id) DO NOTHING')
        .run(worldId, randomUUID());
    const row = await this.db
      .prepare(
        `UPDATE world_head SET revision=revision+1,applied_revision=revision+1${restore ? ',generation=?' : ''}
      WHERE id=1 AND world_id=? AND revision=? AND applied_revision=revision RETURNING revision`,
      )
      .get(...(restore ? [randomUUID()] : []), worldId, expected);
    if (!row) throw new Error('Save conflict: another writer changed this world.');
    return Number(row['revision']);
  }
  /** Establishes derived storage-position metadata on the supplied collections.
   * A complete reference encoding for diagnostics must use an independent copy:
   * recapturing an accepted collection can overwrite its live storage ordinals. */
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
      const payload = encodedBody(node, next);
      if (
        old === undefined ||
        (this.needsHotPrune && node.table === 'world_settings') ||
        oldPosition !== position ||
        payload !== encodedBody(node, old)
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
          if (child.mode === 'indexed-map' && child.unordered && previous && current) {
            const touched = orderedRecordChangedKeys(
              previous as OrderedRecord<Value>,
              current as OrderedRecord<Value>,
            );
            if (touched) {
              for (const key of touched)
                visit(
                  child.node,
                  orderedRecordGet(previous as OrderedRecord<Value>, key),
                  orderedRecordGet(current as OrderedRecord<Value>, key),
                  [...childPath, key],
                  id,
                  key,
                  0,
                );
              continue;
            }
          }
          if (child.unordered && previous && current) {
            const touched = recordMapChangesBetween(previous as object, current as object);
            if (touched) {
              for (const key of touched)
                visit(
                  child.node,
                  own(previous, key),
                  own(current, key),
                  [...childPath, key],
                  id,
                  key,
                  0,
                );
              continue;
            }
          }
          if (child.node.table === 'sim_entities' && previous && current && !this.needsHotPrune) {
            const positions = entityPositions.get(previous as object);
            const touched =
              positions &&
              entityChangesBetween(
                previous as SavedWorld['world']['entities'],
                current as SavedWorld['world']['entities'],
              );
            // Appended string keys cannot shift prior ordinals. A delete/reinsert can
            // reorder an existing ID, so presence alone is not an ordering proof.
            const ordering =
              touched &&
              [...touched].map((key) => ({
                key,
                before: entityOrdering(previous as SavedWorld['world']['entities'], key),
                after: entityOrdering(current as SavedWorld['world']['entities'], key),
              }));
            if (
              ordering &&
              ordering.every(({ before, after }) =>
                before ? before.key === after?.key : after && !after.numeric,
              ) &&
              Number.isSafeInteger(positions!.next + ordering.length)
            ) {
              const added = ordering
                .filter(({ before }) => !before)
                .sort((a, b) => a.after!.key.localeCompare(b.after!.key));
              const next = added.length
                ? { values: { ...positions!.values }, next: positions!.next }
                : positions!;
              for (const { key } of added) orderedRecordSet(next.values, key, next.next++);
              for (const { key } of ordering)
                visit(
                  child.node,
                  entityGet(previous as SavedWorld['world']['entities'], key),
                  entityGet(current as SavedWorld['world']['entities'], key),
                  [...childPath, key],
                  id,
                  key,
                  orderedRecordGet(next.values, key)!,
                  orderedRecordGet(positions!.values, key),
                );
              entityPositions.set(current as object, next);
              continue;
            }
          }
          const oldEntries = new Map(
            (child.mode === 'entity-map'
              ? [...entityEntries((previous as SavedWorld['world']['entities']) ?? emptyEntities())]
              : child.mode === 'indexed-map'
                ? [...orderedRecordEntries((previous as OrderedRecord<Value>) ?? { size: 0 })]
                : members(previous)
            ).map(([key, entry], index) => [key, { entry, index }]),
          );
          let index = 0;
          const mapHistory = HISTORY_MAP_TABLES.has(child.node.table);
          const positionedMap = mapHistory || child.stablePositions;
          const priorPlacement =
            previous && positionedMap ? historyMapPositions.get(previous as object) : undefined;
          const currentPlacement =
            current && positionedMap ? historyMapPositions.get(current as object) : undefined;
          const nextPlacement = positionedMap
            ? {
                positions: new Map<string, number>(),
                next: Math.max(
                  priorPlacement?.next ?? oldEntries.size,
                  child.stablePositions ? 0 : (currentPlacement?.next ?? 0),
                ),
              }
            : undefined;
          const currentEntries = child.stablePositions ? members(current) : undefined;
          if (currentEntries && nextPlacement) {
            let last = -1;
            let renumber = false;
            for (const [key] of currentEntries) {
              let position = priorPlacement?.positions.get(key) ?? oldEntries.get(key)?.index;
              if (position === undefined) {
                position = nextPlacement.next;
                if (!Number.isSafeInteger(position) || position === Number.MAX_SAFE_INTEGER) {
                  renumber = true;
                  break;
                }
                nextPlacement.next++;
              }
              if (!Number.isSafeInteger(position) || position <= last) renumber = true;
              nextPlacement.positions.set(key, position);
              last = position;
            }
            // Numeric object keys and explicit reorders follow actual Object.entries
            // order. A discarded preparation never changes its predecessor's ordinals.
            if (renumber) {
              nextPlacement.positions = new Map(currentEntries.map(([key], i) => [key, i]));
              nextPlacement.next = currentEntries.length;
            }
          }
          const positions =
            child.node.table === 'sim_entities'
              ? { values: { size: 0 } as OrderedRecord<number>, next: 0 }
              : undefined;
          for (const [key, entry] of currentEntries ??
            (child.mode === 'entity-map'
              ? entityEntries((current as SavedWorld['world']['entities']) ?? emptyEntities())
              : child.mode === 'indexed-map'
                ? orderedRecordEntries((current as OrderedRecord<Value>) ?? { size: 0 })
                : members(current))) {
            if (positions) {
              orderedRecordSet(positions.values, key, index);
              positions.next = index + 1;
            }
            const prior = oldEntries.get(key);
            const oldPosition = child.unordered
              ? 0
              : (priorPlacement?.positions.get(key) ?? prior?.index);
            const position = child.unordered
              ? 0
              : child.stablePositions
                ? nextPlacement!.positions.get(key)!
                : nextPlacement
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
  async write(
    worldId: string,
    revision: number,
    changes: RecordChanges,
    writes = new SqlWriteBatch(this.db),
  ) {
    // This metadata is derived from canonical personal records, inside the same
    // transaction. Journal replay takes this path too. A new ordinary observation
    // needs no relationship query; only changed social sources/revocations do.
    const agreementGroups = new Map<string, { actor_id: string; agreement_key: string }>(),
      sourceRefs: Array<{ actor_id: string; source_id: string }> = [];
    const group = (actor: unknown, key: unknown) => {
      if (typeof actor === 'string' && typeof key === 'string')
        agreementGroups.set(JSON.stringify([actor, key]), { actor_id: actor, agreement_key: key });
    };
    for (const table of ['mind_awareness', 'mind_forgotten', 'mind_corrections']) {
      const rows = changes.writes.get(table) ?? [],
        fields = Object.keys(RECORD_NODES.get(table)!.columns!),
        actor = fields.indexOf('actor_id');
      for (const row of rows)
        if (table === 'mind_awareness')
          group(row.extra[actor], row.extra[fields.indexOf('agreement_key')]);
        else
          sourceRefs.push({
            actor_id: String(row.extra[actor]),
            source_id: String(row.extra[fields.indexOf('source_id')]),
          });
      const priorIds = [
        ...(changes.deletes.get(table) ?? []),
        ...rows.filter((row) => !row.create).map((row) => row.id),
      ];
      for (let offset = 0; offset < priorIds.length; offset += 800) {
        const prior = await this.db
          .prepare(
            `SELECT a.actor_id,a.agreement_key FROM ${table} t
             JOIN mind_awareness a ON a.world_id=t.world_id AND ${
               table === 'mind_awareness'
                 ? 'a.id=t.id'
                 : 'a.actor_id=t.actor_id AND a.source_id=t.source_id'
             }
             WHERE t.world_id=? AND t.id IN (SELECT jsonb_array_elements_text(?::jsonb))
             AND a.agreement_key IS NOT NULL`,
          )
          .all(worldId, JSON.stringify(priorIds.slice(offset, offset + 800)));
        for (const row of prior) group(row['actor_id'], row['agreement_key']);
      }
      if (table !== 'mind_awareness') {
        // Clearing the whole correction/forgetting owner cascades its children;
        // those sources can become eligible even without individual leaf deletes.
        const parents = changes.deletes.get(`${table}_owners`) ?? [];
        for (let offset = 0; offset < parents.length; offset += 800) {
          const rows = await this.db
            .prepare(
              `SELECT a.actor_id,a.agreement_key FROM ${table} t JOIN mind_awareness a
               ON a.world_id=t.world_id AND a.actor_id=t.actor_id AND a.source_id=t.source_id
               WHERE t.world_id=? AND t.parent_id IN (SELECT jsonb_array_elements_text(?::jsonb))
               AND a.agreement_key IS NOT NULL`,
            )
            .all(worldId, JSON.stringify(parents.slice(offset, offset + 800)));
          for (const row of rows) group(row['actor_id'], row['agreement_key']);
        }
      }
    }
    // Schema preorder guarantees parents exist before children, including brand-new actors.
    for (const [table, node] of RECORD_NODES) {
      const changed = changes.writes.get(table);
      if (!changed?.length) continue;
      // Returning entities interleave new and updated visibility rows per observer.
      // Group those operations instead of paying two SQL round trips per observer.
      // Keep insert-only conflict detection, parent-table order, and original row
      // order where a secondary uniqueness constraint can make ordering meaningful.
      const rows =
        node.uniqueIndexes?.length || changed.every((row) => row.create === changed[0]!.create)
          ? changed
          : [...changed.filter((row) => row.create), ...changed.filter((row) => !row.create)];
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
        const create = rows[offset]!.create;
        function* values() {
          while (offset < rows.length && rows[offset]!.create === create) {
            const row = rows[offset++]!;
            yield [
              worldId,
              row.id,
              row.parent,
              row.slot,
              row.position,
              revision,
              row.payload,
              ...row.extra,
            ];
          }
        }
        for (const batch of sqlRecordBatches(columns, values()))
          await writes.add(
            table,
            `INSERT INTO ${table} (${columns.join(',')})
          SELECT ${columns.map((column) => `incoming.${column}`).join(',')}
          FROM jsonb_populate_recordset(NULL::${table}, ?::jsonb) WITH ORDINALITY AS incoming
          WHERE TRUE ORDER BY incoming.ordinality
          ${
            create
              ? ''
              : `ON CONFLICT(world_id,id) DO UPDATE SET ${columns
                  .slice(2)
                  .map((column) => `${column}=excluded.${column}`)
                  .join(',')}`
          }`,
            [batch],
          );
      }
    }
    // Move physical children before deleting their old parent. Semantic containment
    // is restrictive; structural cascade ownership must never destroy those objects.
    await writes.flush();
    // Deleted objects may contain one another across separate delete batches.
    // Clear only their own placement records first, using the structural owner
    // index. A surviving child's placement remains restrictive unless its admitted
    // reparenting write above moved it; never cascade through physical_parent_id.
    // docs/save-and-load.md#current-subsystem-integration
    const deletedEntities = changes.deletes.get('sim_entities') ?? [];
    for (let offset = 0; offset < deletedEntities.length; offset += 800) {
      const batch = deletedEntities.slice(offset, offset + 800);
      await this.db
        .prepare(
          `DELETE FROM sim_placements WHERE world_id=? AND parent_id IN (${batch.map(() => '?').join(',')})`,
        )
        .run(worldId, ...batch);
    }
    for (const [table, ids] of changes.deletes)
      for (let offset = 0; offset < ids.length; offset += 800) {
        const batch = ids.slice(offset, offset + 800);
        await this.db
          .prepare(
            `DELETE FROM ${table} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .run(worldId, ...batch);
      }
    if (sourceRefs.length)
      for (let offset = 0; offset < sourceRefs.length; offset += 800) {
        const rows = await this.db
          .prepare(
            `SELECT a.actor_id,a.agreement_key FROM
             jsonb_to_recordset(?::jsonb) r(actor_id TEXT,source_id TEXT)
             JOIN mind_awareness a ON a.world_id=? AND a.actor_id=r.actor_id AND a.source_id=r.source_id
             WHERE a.agreement_key IS NOT NULL`,
          )
          .all(JSON.stringify(sourceRefs.slice(offset, offset + 800)), worldId);
        for (const row of rows) group(row['actor_id'], row['agreement_key']);
      }
    const groups = [...agreementGroups.values()];
    for (let offset = 0; offset < groups.length; offset += 800) {
      const keys = JSON.stringify(groups.slice(offset, offset + 800));
      await this.db
        .prepare(
          `UPDATE mind_awareness a SET agreement_head=0 FROM
           jsonb_to_recordset(?::jsonb) g(actor_id TEXT,agreement_key TEXT)
           WHERE a.world_id=? AND a.actor_id=g.actor_id AND a.agreement_key=g.agreement_key AND a.agreement_head=1`,
        )
        .run(keys, worldId);
      await this.db
        .prepare(
          `UPDATE mind_awareness SET agreement_head=1 WHERE world_id=? AND id IN (
           SELECT a.id FROM jsonb_to_recordset(?::jsonb) g(actor_id TEXT,agreement_key TEXT)
           CROSS JOIN LATERAL (
             SELECT a.id FROM mind_awareness a WHERE a.world_id=? AND a.actor_id=g.actor_id AND a.agreement_key=g.agreement_key
             AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=a.world_id AND f.actor_id=a.actor_id AND f.source_id=a.source_id)
             AND NOT EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=a.world_id AND c.actor_id=a.actor_id AND c.source_id=a.source_id)
             ORDER BY a.position DESC LIMIT 1
           ) a)`,
        )
        .run(worldId, keys, worldId);
    }
  }
  /** `active` selects only the working set; cold history/retirements remain in SQL.
   * Portable copies use GameSaves, including the other repositories.
   * docs/save-and-load.md#current-history-capture-boundary */
  async load(active = false): Promise<{ revision: number; state: SavedWorld } | null> {
    return this.db.readTransaction
      ? this.db.readTransaction(() => this.readRecords(active))
      : this.db.transaction(() => this.readRecords(active));
  }
  /** Journal recovery reads the complete applied prefix inside its owned transaction. */
  async loadApplied(): Promise<{ revision: number; state: SavedWorld } | null> {
    if (!this.db.transactionActive) throw new Error('Applied recovery requires its transaction.');
    return this.readRecords(false, true);
  }
  private async readRecords(
    active: boolean,
    applied = false,
  ): Promise<{ revision: number; state: SavedWorld } | null> {
    const head = await this.head();
    if (!head) return null;
    if (!applied && head.appliedRevision !== head.revision)
      throw new Error('World tables have not applied the committed revision.');
    const settings = active
      ? await this.db
          .prepare('SELECT payload FROM world_settings WHERE world_id=?')
          .get(head.worldId)
      : undefined;
    const simTime = settings ? Number(JSON.parse(String(settings['payload'])).simTime) : 0,
      cutoff = simTime - EXPERIENCE_LIMITS.rawHours * 3600;
    const groups = new Map<string, Map<string, JsonRecord[]>>();
    // Startup recovery loads the simulation working set. Ordinary feature reads use
    // scoped repositories below, not this complete reconstruction path.
    for (const table of RECORD_NODES.keys()) {
      if (active && table === 'world_hot_events') {
        groups.set(table, new Map());
        continue;
      }
      const eventId = "(t.payload::jsonb ->> 'id')";
      const partial = active && HISTORY_TABLES.has(table);
      const currentPredicate = !active
        ? ''
        : table === 'sim_status_effects'
          ? ` AND ${this.currentContributionsPredicate('t.')}`
          : table === 'mind_appraisals'
            ? ` AND (t.payload::jsonb ->> 'state'='active' OR t.payload::jsonb ->> 'state' IS NULL)`
            : ['sim_object_lineage', 'sim_object_retirements'].includes(table)
              ? ' AND 1=0'
              : '';
      const objectPredicate =
        currentPredicate +
        (active && !['sim_object_lineage', 'sim_object_retirements'].includes(table)
          ? this.currentEntityPredicate(table)
          : '');
      let rows: JsonRecord[] = [];
      if (partial && table === 'activity_occurrences') {
        rows = await this.db
          .prepare(
            `SELECT a.id,a.parent_id,a.slot,a.position,a.payload
          FROM activity_occurrences_owners o CROSS JOIN LATERAL (
            SELECT id,parent_id,slot,position,payload FROM activity_occurrences
            WHERE world_id=o.world_id AND actor_id=o.slot ORDER BY position DESC LIMIT 128
          ) a WHERE o.world_id=?
          UNION SELECT id,parent_id,slot,position,payload FROM activity_occurrences WHERE world_id=? AND status='running'`,
          )
          .all(head.worldId, head.worldId);
      } else if (partial && table === 'mind_awareness') {
        // Owner rows are independent of retained history size; each lateral read seeks
        // one actor's indexed tail. docs/performance.md#inactive-history-residency
        rows = await this.db
          .prepare(
            `SELECT a.id,a.parent_id,a.slot,a.position,a.payload
          FROM mind_awareness_owners o CROSS JOIN LATERAL (
            SELECT id,parent_id,slot,position,payload FROM mind_awareness
            WHERE world_id=o.world_id AND actor_id=o.slot ORDER BY position DESC LIMIT ${HOT_AWARENESS_ROWS}
          ) a WHERE o.world_id=?
          UNION SELECT id,parent_id,slot,position,payload FROM mind_awareness
          WHERE world_id=? AND agreement_head=1 AND agreement_open=1
            AND (agreement_until IS NULL OR agreement_until>?)`,
          )
          .all(head.worldId, head.worldId, simTime);
      } else if (partial && table === 'mind_memories') {
        rows = await this.db
          .prepare(
            `
          SELECT id,parent_id,slot,position,payload FROM mind_memories WHERE world_id=? AND at>=?
          UNION ALL
          SELECT id,parent_id,slot,position,payload FROM mind_memories WHERE world_id=? AND unresolved=1 AND at<?
          ORDER BY parent_id,position`,
          )
          .all(head.worldId, cutoff, head.worldId, cutoff);
      } else if (!partial && !objectPredicate && table !== 'world_hot_events') {
        // Full recovery remains explicit, but each database transfer stays bounded.
        // Large PostgreSQL histories must not become one timeout-sized result.
        for await (const row of tableRows(this.db, table, head.worldId)) rows.push(row);
      } else {
        rows = await this.db
          .prepare(
            table === 'world_hot_events'
              ? `SELECT t.id,t.parent_id,t.slot,t.position,h.payload FROM world_hot_events t LEFT JOIN history_events h ON h.world_id=t.world_id AND h.id=${eventId} WHERE t.world_id=? ORDER BY t.parent_id,t.position`
              : `SELECT id,parent_id,slot,position,payload FROM ${table} t WHERE world_id=?${objectPredicate}${partial ? ' AND 1=0' : ''} ORDER BY parent_id,position`,
          )
          .all(head.worldId);
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
            `SELECT o.id AS parent_id,t.position+1 AS next FROM ${RECORD_PARENTS.get(table)!} o
             CROSS JOIN LATERAL (SELECT position FROM ${table} WHERE world_id=o.world_id AND parent_id=o.id ORDER BY position DESC LIMIT 1) t
             WHERE o.world_id=?`,
          )
          .all(head.worldId))
          nextPositions.set(`${table}:${row['parent_id']}`, Number(row['next']));
      }
    const state = assembleWorldRecords(
      groups,
      head.worldId,
      active,
      nextPositions,
      WORLD_RECORD_SCHEMA,
    );
    if (active) {
      await this.validateHistoricalMaterialOrigins(state);
      markPartialObjectHistory(state.world.entities);
      const missing = await this.db
        .prepare(
          `SELECT 1 AS missing FROM world_hot_events t LEFT JOIN history_events h ON h.world_id=t.world_id AND h.id=t.payload::jsonb ->> 'id' WHERE t.world_id=? AND h.id IS NULL LIMIT 1`,
        )
        .get(head.worldId);
      if (missing) throw new Error('Active history references a missing source; recovery refused.');
      const ids = [...hotEventDependencies(state.world)];
      const selector = 'SELECT value FROM jsonb_array_elements_text(?::jsonb)';
      const rows = await this.db
        .prepare(
          `SELECT t.position,h.payload FROM world_hot_events t JOIN history_events h ON h.world_id=t.world_id AND h.id=t.payload::jsonb ->> 'id' WHERE t.world_id=? AND (t.position IN (SELECT position FROM world_hot_events WHERE world_id=? ORDER BY position DESC LIMIT 512) OR h.id IN (${selector})) ORDER BY t.position`,
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
    return { revision: applied ? head.appliedRevision : head.revision, state };
  }
  async pruneActiveEvents(state: SavedWorld): Promise<void> {
    const selector = 'SELECT value FROM jsonb_array_elements_text(?::jsonb)';
    await this.db
      .prepare(`DELETE FROM world_hot_events WHERE world_id=? AND id NOT IN (${selector})`)
      .run(
        state.world.id,
        JSON.stringify(state.world.events.map((event) => recordId(['world', 'events', event.id]))),
      );
  }
  /** Explicit dependency materialization for maintenance/edit/save, never a tick read. */
  async activityPage(
    worldId: string,
    actorId: string,
    after = -1,
    ids?: string[],
    limit = 128,
    maxBytes = 4194304,
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 4194304)
      throw new Error('Invalid activity hydration allowance.');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 128)
      throw new Error('Invalid activity page size.');
    if (!Number.isSafeInteger(after) || after < -1 || (ids && ids.length > 512))
      throw new Error('Invalid activity history scope.');
    if (ids && !ids.length) return [];
    // Count bytes inside PostgreSQL before transferring or decoding row bodies.
    // A contiguous prefix preserves a usable position cursor under byte pressure.
    const rows = await this.db
      .prepare(
        `WITH page AS (
      SELECT position,payload FROM activity_occurrences WHERE world_id=? AND actor_id=?${ids ? ` AND source_id IN (${ids.map(() => '?').join(',')})` : ' AND position>?'} ORDER BY position LIMIT ${ids ? 512 : limit}
    ), bounded AS (SELECT position,payload,SUM(octet_length(payload)) OVER (ORDER BY position) AS bytes FROM page)
    SELECT position,payload FROM bounded WHERE bytes<=? ORDER BY position`,
      )
      .all(worldId, actorId, ...(ids ?? [after]), maxBytes);
    return rows.map((row) => ({
      position: Number(row['position']),
      entry: JSON.parse(String(row['payload'])) as import('@open-legend/domain').ActivityOccurrence,
    }));
  }

  withActivityPage(
    state: SavedWorld,
    actorId: string,
    rows: { position: number; entry: import('@open-legend/domain').ActivityOccurrence }[],
  ): SavedWorld {
    const old = state.world.actionExperience.occurrences[actorId] ?? [];
    const placement = historyPositions.get(old);
    const loaded = new Map(rows.map((row) => [row.entry.id, row]));
    const entries = [
      ...old.filter((entry) => !loaded.has(entry.id)),
      ...rows.map((row) => row.entry),
    ];
    const positions = new Map(
      old.map((entry, index) => [entry.id, placement?.positions.get(entry.id) ?? index]),
    );
    for (const row of rows) positions.set(row.entry.id, row.position);
    entries.sort((a, b) => positions.get(a.id)! - positions.get(b.id)!);
    historyPositions.set(entries, {
      positions,
      next: Math.max(placement?.next ?? old.length, ...rows.map((row) => row.position + 1)),
    });
    return {
      ...state,
      world: {
        ...state.world,
        actionExperience: {
          ...state.world.actionExperience,
          occurrences: { ...state.world.actionExperience.occurrences, [actorId]: entries },
        },
      },
    };
  }

  async withHistory(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld> {
    return this.db.readTransaction
      ? this.db.readTransaction(() => this.readHistory(state, actorIds, sourceIds))
      : this.db.transaction(() => this.readHistory(state, actorIds, sourceIds));
  }

  /** Definition edits need every retained condition pin, without unrelated mind history. */
  async withStatusEffectHistory(state: SavedWorld): Promise<SavedWorld> {
    return this.db.readTransaction
      ? this.db.readTransaction(() => this.readStatusEffectHistory(state))
      : this.db.transaction(() => this.readStatusEffectHistory(state));
  }

  /** Retained references may name cold consumed objects. Read only their canonical
   * custody, through exact entity and retirement indexes; never hydrate all history.
   * The unique-identity LIMIT keeps requested IDs ahead of retirement joins; a plain
   * outer join allowed PostgreSQL to visit retirement for every world entity.
   * docs/memory-architecture.md#private-retrieval-fencing */
  async readRetainedObjectCustody(worldId: string, ids: string[]) {
    const batchSize = 256;
    const read = async () => {
      const result = new Map<string, { custodianId?: string } | null>();
      for (let offset = 0; offset < ids.length; offset += batchSize) {
        const rows = await this.db
          .prepare(
            `SELECT requested.value AS entity_id,
          entity.id AS record_id, retirement.parent_id AS retired_parent,
          retirement.payload::jsonb ->> 'custodianId' AS custodian_id
          FROM jsonb_array_elements_text(?::jsonb) requested
          LEFT JOIN LATERAL (
            SELECT id,world_id FROM sim_entities
            WHERE world_id=? AND entity_id=requested.value LIMIT 1
          ) entity ON true
          LEFT JOIN sim_object_retirements retirement
            ON retirement.world_id=entity.world_id AND retirement.parent_id=entity.id`,
          )
          .all(JSON.stringify(ids.slice(offset, offset + batchSize)), worldId);
        for (const row of rows) {
          if (row['record_id'] && !row['retired_parent'])
            throw new Error('A live historical subject is missing from the current world.');
          result.set(
            String(row['entity_id']),
            row['retired_parent']
              ? { ...(row['custodian_id'] ? { custodianId: String(row['custodian_id']) } : {}) }
              : null,
          );
        }
      }
      return result;
    };
    // One SELECT already has a consistent snapshot and uses the adapter's reader;
    // multiple transport batches need one explicit snapshot, not repeated transactions.
    if (ids.length <= batchSize) return read();
    return this.db.readTransaction ? this.db.readTransaction(read) : this.db.transaction(read);
  }

  private async readStatusEffectHistory(
    state: SavedWorld,
    entityIds?: string[],
  ): Promise<SavedWorld> {
    if (!entityIds && !completeObjectHistory(state.world.entities)) {
      // Lawful consumption refuses objects with conditions, but current-format restored
      // terminal objects may retain an inactive condition. Never approve an omitted owner.
      const absentOwner = await this.db
        .prepare(
          `SELECT 1 FROM sim_status_effects conditions
           JOIN sim_entities entity ON entity.world_id=conditions.world_id AND entity.id=conditions.parent_id
           JOIN sim_object_retirements retired ON retired.world_id=entity.world_id AND retired.parent_id=entity.id
           WHERE conditions.world_id=? AND entity.entity_id <> ALL(?::text[]) LIMIT 1`,
        )
        .get(state.world.id, entityKeys(state.world.entities));
      if (absentOwner)
        throw new Error(
          'Condition history is unavailable for a retained physical record; the complete edit cannot be established.',
        );
    }
    const incomplete = (entityIds ?? entityKeys(state.world.entities)).filter((id) => {
      const entity = entityGet(state.world.entities, id);
      return entity && !completeContributionHistory(entity.statusEffects);
    });
    if (!incomplete.length) return state;
    const entities = cloneEntities(state.world.entities);
    // Loading conditions does not materialize omitted physical identities.
    if (!completeObjectHistory(state.world.entities)) markPartialObjectHistory(entities);
    for (let offset = 0; offset < incomplete.length; offset += 800) {
      const ids = incomplete.slice(offset, offset + 800);
      const parents = ids.map((id) => recordId(['world', 'entities', id]));
      const rows = await this.db
        .prepare(
          `SELECT parent_id,slot,position,payload FROM sim_status_effects
           WHERE world_id=? AND parent_id IN (${parents.map(() => '?').join(',')})
           ORDER BY parent_id,position,id`,
        )
        .all(state.world.id, ...parents);
      const grouped = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const parent = String(row['parent_id']);
        let group = grouped.get(parent);
        if (!group) grouped.set(parent, (group = []));
        group.push(row);
      }
      for (const [index, id] of ids.entries()) {
        const records = grouped.get(parents[index]!) ?? [];
        const statusEffects = Object.fromEntries(
          records.map((row) => [String(row['slot']), JSON.parse(String(row['payload']))]),
        );
        entitySet(entities, id, { ...entityGet(entities, id)!, statusEffects });
        historyMapPositions.set(statusEffects, {
          positions: new Map(records.map((row) => [String(row['slot']), Number(row['position'])])),
          next: records.length ? Number(records.at(-1)!['position']) + 1 : 0,
        });
      }
    }
    return { ...state, world: { ...state.world, entities } };
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
      state = await this.readStatusEffectHistory(state, actorIds);
      const entities = state.world.entities;
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
    if (ids.length > RESPONSE_LIMITS.operations)
      throw new Error('Too many appraisal outcome bindings.');
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
    const entities = cloneEntities(state.world.entities),
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
      if (entityHas(entities, entity.id)) continue;
      entity.retirement = JSON.parse(String(row['retirement']));
      entity.spatial = JSON.parse(String(row['spatial']));
      if (row['declared_owner']) entity.declaredOwner = JSON.parse(String(row['declared_owner']));
      entitySet(entities, entity.id, entity);
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
    const custodian = "(l.payload::jsonb ->> 'custodianId')";
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
        const target =
          field === '$'
            ? value
            : child.mode === 'list'
              ? []
              : child.mode === 'entity-map'
                ? emptyEntities()
                : child.mode === 'indexed-map'
                  ? { size: 0 }
                  : {};
        const slots = new Set<string>();
        for (const entry of children) {
          const slot = String(entry[child.mode === 'list' ? 'position' : 'slot']);
          if (slots.has(slot))
            throw new Error('Duplicate gameplay record placement; recovery refused.');
          slots.add(slot);
          const entryValue = assemble(child.node, entry);
          if (child.mode === 'entity-map') {
            entitySet(
              target as SavedWorld['world']['entities'],
              String(entry['slot']),
              entryValue as Entity,
            );
            continue;
          }
          if (child.mode === 'indexed-map') {
            orderedRecordSet(target as OrderedRecord<Value>, String(entry['slot']), entryValue);
            continue;
          }
          put(
            target,
            HISTORY_TABLES.has(child.node.table) || child.node.table === 'world_hot_events'
              ? String((target as unknown[]).length)
              : String(entry['slot']),
            entryValue,
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
        if (HISTORY_MAP_TABLES.has(child.node.table) || child.stablePositions)
          historyMapPositions.set(target as object, {
            positions: new Map(
              children.map((entry) => [String(entry['slot']), Number(entry['position'])]),
            ),
            next:
              active && HISTORY_MAP_TABLES.has(child.node.table)
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
    for (const entity of entityValues(state.world.entities))
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
