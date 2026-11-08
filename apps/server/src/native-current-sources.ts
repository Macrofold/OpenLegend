import { coldEntityOrdering } from '@open-legend/domain';
import { RECORD_NODES } from './world-record-schema.js';
import type { WorldRecords } from './world-records.js';

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
        return {
          id: String(row['id']),
          parent,
          slot: String(row['slot']),
          position,
          payload: String(row['payload']),
          extra: columns.map(([name, column]) => cell(row[name], column.sql)),
        };
      });
      highwaters.set(table, owners);
    }
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
            : (highwaters.get(child.node.table)?.get(row.id) ?? 0);
          if (!present && (highwaters.get(child.node.table)?.get(row.id) ?? 0) > 0)
            throw new Error('Native cold installation has orphaned current child rows.');
          coverage.push({
            table: child.node.table,
            owner: row.id,
            complete: true,
            nextOrdinal,
            parentPresent: present,
          });
        }
      }
    }
    const entityIds = (tables['sim_entities'] ?? []).map((row) => {
      // entity_id is the existing schema projection, not an inferred path/name.
      const index = Object.keys(RECORD_NODES.get('sim_entities')!.columns ?? {}).indexOf(
        'entity_id',
      );
      const id = row.extra[index];
      if (typeof id !== 'string')
        throw new Error('Native cold entity lacks its current identity column.');
      return id;
    });
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
      records: {
        worldId: head.worldId,
        databaseSchema,
        generation: head.generation,
        durableRevision: ordinal(head.revision),
        entityOrdering: coldEntityOrdering(entityIds),
        tables,
        coverage,
      },
      originals,
    };
  });
}
