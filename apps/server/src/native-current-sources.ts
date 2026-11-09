import { coldEntityOrdering, temporalPageReferences } from '@open-legend/domain';
import { HISTORY_TABLES, HISTORY_MAP_TABLES, HOT_TEMPORAL_BYTES } from './history-residency.js';
import { hotEventRecordDependencies, HOT_EVENT_RECENT_ROWS } from './hot-events.js';
import {
  receivedRecordReferences,
  receivedCurrentOwnerTables,
} from './received-record-references.js';
import { readTemporalPageRecord } from './temporal-storage.js';
import { decodeCurrentContactRow } from './current-contact-codec.js';
import { RECORD_NODES } from './world-record-schema.js';
import { temporalDirectoriesFromRows, type WorldRecords } from './world-records.js';

function integer(value: unknown): number {
  const number =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(number))
    throw new Error('Current native row has an invalid SQL integer.');
  return number;
}
function ordinal(value: unknown): number {
  const number = integer(value);
  if (number < 0) throw new Error('Current native row has an invalid SQL ordinal.');
  return number;
}
function cell(value: unknown, sql: string): unknown {
  if (value === null) return null;
  if (/^BIGINT\[\]/.test(sql)) {
    if (!Array.isArray(value)) throw new Error('Current native row has an invalid integer array.');
    return value.map(integer);
  }
  return /^BIGINT\b/.test(sql) ? integer(value) : value;
}
function member(value: unknown, field: string): unknown {
  if (field === '$') return value;
  return value && typeof value === 'object' && Object.hasOwn(value, field)
    ? (value as Record<string, unknown>)[field]
    : undefined;
}

/** Both bootstrap and scoped hydration retain the sole current SQL column
 * order and PostgreSQL integer conversion; neither decodes canonical bodies. */
export function nativeCurrentRow(table: string, row: Record<string, unknown>) {
  const node = RECORD_NODES.get(table);
  if (!node) throw new Error('Native current row has no registered schema.');
  return {
    id: String(row['id']),
    parent: String(row['parent_id']),
    slot: String(row['slot']),
    position: ordinal(row['position']),
    payload: String(row['payload']),
    extra: Object.entries(node.columns ?? {}).map(([name, column]) => cell(row[name], column.sql)),
  };
}

/** Full current-format bootstrap at one committed PostgreSQL snapshot. Rows
 * retain their actual codec bytes and SQL metadata; no entity/history graph is
 * assembled. Partial working-set hydration remains an explicit separate read. */
export async function captureCurrentSources(records: WorldRecords, databaseSchema: string) {
  if (!records.db.readTransaction)
    throw new Error('Native cold installation requires a fixed database read snapshot.');
  return records.db.readTransaction(async () => {
    const head = await records.head();
    if (!head) return null;
    type Row = {
      id: string;
      parent: string;
      slot: string;
      position: number;
      payload: string;
      extra: unknown[];
    };
    const tables: Record<string, Row[]> = {};
    const highwaters = new Map<string, Map<string, number>>();
    for (const [table, node] of RECORD_NODES) {
      const columns = Object.entries(node.columns ?? {});
      const fields = [
        'id',
        'parent_id',
        'slot',
        'position',
        'payload',
        ...columns.map(([name]) => name),
      ];
      const rows = await records.db
        .prepare(
          `SELECT ${fields.join(',')} FROM ${table} WHERE world_id=? ORDER BY parent_id,position,id`,
        )
        .all(head.worldId);
      const owners = new Map<string, number>();
      tables[table] = rows.map((row) => {
        const position = ordinal(row['position']);
        const next = ordinal(position + 1);
        const parent = String(row['parent_id']);
        owners.set(parent, Math.max(owners.get(parent) ?? 0, next));
        return nativeCurrentRow(table, row);
      });
      highwaters.set(table, owners);
    }
    const current = currentRecordMetadata(
      head,
      databaseSchema,
      tables,
      highwaters,
      () => true,
      new Map(),
    );
    const wanted = (tables['world_hot_events'] ?? []).map((row) => {
      const pointer = JSON.parse(row.payload) as { id: string };
      if (typeof pointer.id !== 'string')
        throw new Error('Native cold occurrence lacks its original identity.');
      return pointer.id;
    });
    const originals: { eventId: string; payload: string }[] = [];
    for (let offset = 0; offset < wanted.length; offset += 800) {
      const rows = await records.db
        .prepare(
          'SELECT id,payload FROM history_events WHERE world_id=? AND id=ANY(?::text[]) ORDER BY position,id',
        )
        .all(head.worldId, wanted.slice(offset, offset + 800));
      originals.push(
        ...rows.map((row) => ({ eventId: String(row['id']), payload: String(row['payload']) })),
      );
    }
    if (originals.length !== wanted.length)
      throw new Error('Native cold hot occurrence lacks its canonical history body.');
    return {
      records: current,
      originals,
    };
  });
}

type CurrentRow = ReturnType<typeof nativeCurrentRow>;
type CurrentHead = NonNullable<Awaited<ReturnType<WorldRecords['head']>>>;
function currentRecordMetadata(
  head: CurrentHead,
  databaseSchema: string,
  tables: Record<string, CurrentRow[]>,
  highwaters: ReadonlyMap<string, ReadonlyMap<string, number>>,
  complete: (table: string) => boolean,
  nextPositions: ReadonlyMap<string, number>,
) {
  const settings = tables['world_settings']?.find((row) => row.id === '["world"]');
  if (!settings) throw new Error('Native cold installation has no current world header.');
  const header = JSON.parse(settings.payload) as Record<string, unknown>;
  if (header['id'] !== head.worldId)
    throw new Error('Native cold head and canonical world identity disagree.');
  const nextId = ordinal(header['nextId']);
  const coverage: {
    table: string;
    owner: string;
    complete: boolean;
    nextOrdinal: number;
    parentPresent: boolean;
  }[] = [];
  for (const [table, node] of RECORD_NODES) {
    const children = Object.entries(node.children ?? {});
    if (!children.length) continue;
    for (const row of tables[table] ?? []) {
      // Only these finite parent rows are decoded, solely for direct child
      // markers. Child bodies stay in their independently owned SQL rows.
      const body: unknown = JSON.parse(row.payload);
      for (const [field, child] of children) {
        const value = member(body, field);
        const present = value !== undefined && value !== null;
        const nextOrdinal = child.orderKey
          ? nextId
          : (nextPositions.get(`${child.node.table}:${row.id}`) ??
            highwaters.get(child.node.table)?.get(row.id) ??
            0);
        if (!present && (highwaters.get(child.node.table)?.get(row.id) ?? 0) > 0)
          throw new Error('Native cold installation has orphaned current child rows.');
        coverage.push({
          table: child.node.table,
          owner: row.id,
          complete: !present || complete(child.node.table),
          nextOrdinal,
          parentPresent: present,
        });
      }
    }
  }
  const entityIds = (tables['sim_entities'] ?? []).map((row) => {
    // entity_id is the existing schema projection, not an inferred path/name.
    const index = Object.keys(RECORD_NODES.get('sim_entities')!.columns ?? {}).indexOf('entity_id');
    const id = row.extra[index];
    if (typeof id !== 'string')
      throw new Error('Native cold entity lacks its current identity column.');
    return id;
  });
  return {
    worldId: head.worldId,
    databaseSchema,
    generation: head.generation,
    durableRevision: ordinal(head.revision),
    entityOrdering: coldEntityOrdering(entityIds),
    tables,
    coverage,
  };
}

/** The actual Source startup working set at one committed snapshot. Selection
 * witnesses describe only the indexed subsets actually queried: they never
 * relabel partial personal history as complete. Native installation must consume
 * them before admitting a read/mutation that relies on a negative result. */
export async function captureWorkingSources(records: WorldRecords, databaseSchema: string) {
  if (!records.db.readTransaction)
    throw new Error('Native cold installation requires a fixed database read snapshot.');
  return records.db.readTransaction(async () => {
    const captured = await records.readCurrentRows(true, 'native');
    if (!captured) return null;
    const { head, groups, nextPositions } = captured;
    const rows = (table: string) => [...(groups.get(table)?.values() ?? [])].flat();
    // These cold physical families have no compiled proof owner. The same
    // indexed startup selection must not make their real saved presence vanish.
    const physicalCounts = await records.readRecordCounts(head.worldId, [
      'sim_object_lineage',
      'sim_object_retirements',
      'sim_status_effects',
    ]);
    for (const table of ['sim_object_lineage', 'sim_object_retirements'])
      if (physicalCounts.get(table) !== 0)
        throw new Error(`Native proof has no compiled saved-family owner for ${table}.`);
    const references = new Set<string>();
    for (const table of receivedCurrentOwnerTables)
      for (const row of rows(table))
        for (const id of receivedRecordReferences(
          table,
          table === 'mind_perception_current'
            ? (decodeCurrentContactRow(row) as unknown as Record<string, unknown>)
            : JSON.parse(String(row['payload'])),
        ))
          references.add(id);
    const temporalActors = rows('mind_temporal_actors').map((row) => String(row['slot']));
    const coldDirectories = temporalDirectoriesFromRows(
      temporalActors,
      await records.readTemporalDirectories(head.worldId),
    );
    if (rows('mind_perception_value_state').length) {
      const pages = temporalActors.length
        ? await records.readTemporalTail(head.worldId, HOT_TEMPORAL_BYTES)
        : [];
      const parents = new Map<string, typeof pages>();
      for (const row of pages) {
        const parent = String(row['parent_id']);
        const siblings = parents.get(parent) ?? [];
        siblings.push(row);
        parents.set(parent, siblings);
        for (const id of temporalPageReferences(readTemporalPageRecord(row))) references.add(id);
      }
      groups.set('mind_temporal_pages', parents);
      const values = new Map<string, typeof pages>();
      const ids = [...references];
      for (let offset = 0; offset < ids.length; offset += 800) {
        const fields = [
          'id',
          'parent_id',
          'slot',
          'position',
          'payload',
          ...Object.keys(RECORD_NODES.get('mind_perception_values')!.columns ?? {}),
        ];
        const selected = await records.db
          .prepare(
            `SELECT ${fields.join(',')} FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])`,
          )
          .all(head.worldId, ids.slice(offset, offset + 800));
        for (const row of selected) {
          const parent = String(row['parent_id']);
          const siblings = values.get(parent) ?? [];
          siblings.push(row);
          values.set(parent, siblings);
        }
      }
      for (const siblings of values.values())
        siblings.sort((a, b) => ordinal(a['position']) - ordinal(b['position']));
      groups.set('mind_perception_values', values);
    }
    const dependencies = new Set<string>();
    for (const table of ['mind_awareness', 'mind_memories', 'mind_learned_capabilities'] as const)
      for (const row of rows(table))
        for (const id of hotEventRecordDependencies(table, JSON.parse(String(row['payload']))))
          dependencies.add(id);
    const hot = await records.readActiveHotEvents(head.worldId, [...dependencies]);
    const pointers = new Map<string, typeof hot.rows>();
    const originals: { eventId: string; payload: string }[] = [];
    for (const row of hot.rows) {
      const pointer = { ...row, payload: row['pointer_payload'] };
      const parent = String(row['parent_id']);
      const siblings = pointers.get(parent) ?? [];
      siblings.push(pointer);
      pointers.set(parent, siblings);
      const id = (JSON.parse(String(row['pointer_payload'])) as { id: string }).id;
      originals.push({ eventId: id, payload: String(row['payload']) });
    }
    groups.set('world_hot_events', pointers);
    const tables: Record<string, CurrentRow[]> = {};
    const highwaters = new Map<string, Map<string, number>>();
    for (const table of RECORD_NODES.keys()) {
      const owners = new Map<string, number>();
      tables[table] = rows(table).map((row) => {
        const current = nativeCurrentRow(table, row);
        owners.set(
          current.parent,
          Math.max(owners.get(current.parent) ?? 0, ordinal(current.position + 1)),
        );
        return current;
      });
      highwaters.set(table, owners);
    }
    const partial = new Set([
      ...HISTORY_TABLES,
      ...HISTORY_MAP_TABLES,
      'world_hot_events',
      'mind_perception_values',
    ]);
    // With no retired entities the shared current-entity predicate omits none.
    // Status selection is complete only when actual physical counts prove it.
    if (physicalCounts.get('sim_status_effects') === rows('sim_status_effects').length)
      partial.delete('sim_status_effects');
    for (const [owner, next] of await records.readOrdinalHighwaters(head.worldId, [
      'world_hot_events',
      'mind_perception_values',
      'sim_entities',
      'sim_object_lineage',
      'sim_object_retirements',
    ]))
      nextPositions.set(owner, next);
    const current = currentRecordMetadata(
      head,
      databaseSchema,
      tables,
      highwaters,
      (table) => !partial.has(table),
      nextPositions,
    );
    const actorOwners = (table: string) => rows(table).map((row) => String(row['slot']));
    const removedHotEvents = hot.count - hot.rows.length;
    if (!Number.isSafeInteger(removedHotEvents) || removedHotEvents < 0)
      throw new Error('Invalid active event coverage.');
    return {
      records: current,
      originals,
      coldDirectories,
      workingSet: {
        worldId: head.worldId,
        generation: head.generation,
        revision: ordinal(head.revision),
        removedHotEvents,
        hotEventWindow: HOT_EVENT_RECENT_ROWS,
        receivedValueClosure: true,
        activeAppraisals: actorOwners('mind_appraisals_owners'),
        openAgreementHeads: actorOwners('mind_awareness_owners'),
        sensoryAwareness: actorOwners('mind_awareness_owners'),
        runningActivities: actorOwners('activity_occurrences_owners'),
        currentContributions: current.entityOrdering.entries.map((entry) => entry.id),
      },
    };
  });
}
