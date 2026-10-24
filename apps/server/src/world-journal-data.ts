import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  validateNarration,
  validEncounterExposure,
  type WorldEvent,
  type WorldState,
} from '@open-legend/domain';
import { prepareHistory } from './history-preparation.js';
import { validateCurrentWorldState } from './upgrade-world.js';
import {
  WorldRecords,
  assembleWorldRecords,
  type RecordChanges,
  type RowChange,
} from './world-records.js';
import {
  RECORD_NODES,
  WORLD_RECORD_SCHEMA,
  type JsonRecord,
  type RecordNode,
} from './world-record-schema.js';
import type { SavedWorld } from './store.js';

/** Recovery data only: no SQL, commands, providers or process-local callbacks.
 * docs/projects/performance-overhaul/journal-contract.md#first-executable-checkpoint-selected-at-0254-edt */
export const JOURNAL_ENTRY_BYTES = 32 * 1024 * 1024;
const safeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const eventSchema: z.ZodType<WorldEvent> = z
  .object({
    id: z.string().min(1),
    sequence: safeInteger,
    at: z.number().finite(),
    type: z.string(),
    text: z.string(),
    audience: z.array(z.string()),
    actorId: z.string().optional(),
    targetId: z.string().optional(),
    scope: z.enum(['external', 'private', 'system']).optional(),
    origin: z
      .object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() })
      .strict()
      .optional(),
    order: safeInteger.optional(),
    importance: z.number().finite().optional(),
    urgency: z.number().finite().optional(),
    data: z
      .record(z.string(), z.union([z.string(), z.number().finite(), z.boolean(), z.null()]))
      .optional(),
    exposure: z.custom<NonNullable<WorldEvent['exposure']>>(validEncounterExposure).optional(),
    narration: z
      .custom<NonNullable<WorldEvent['narration']>>((value) => {
        try {
          validateNarration(value);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
  })
  .strict();
const rowSchema = z
  .object({
    id: z.string(),
    parent: z.string(),
    slot: z.string(),
    position: safeInteger,
    payload: z.string(),
    extra: z.array(z.unknown()),
    create: z.boolean(),
  })
  .strict();
const deltaSchema = z
  .object({
    writes: z.array(z.tuple([z.string(), z.array(rowSchema)])),
    deletes: z.array(z.tuple([z.string(), z.array(z.string())])),
    history: z
      .object({ append: z.boolean(), changed: z.array(eventSchema), removed: z.array(z.string()) })
      .strict(),
  })
  .strict();
export interface JournalTransition {
  changes: RecordChanges;
  history: { append: boolean; changed: WorldEvent[]; removed: string[] };
}
export interface EncodedJournalTransition {
  readonly payload: string;
  readonly checksum: string;
  readonly bytes: number;
}
const validatedEncodings = new WeakMap<EncodedJournalTransition, JournalTransition>();
const checksum = (payload: string) => createHash('sha256').update(payload).digest('hex');

/** Resolve the schema's real logical path, including transparent actor-owned `$` collections. */
export function journalRecordPath(
  table: string,
  id: string,
): { node: RecordNode; parent: string; slot?: string; list: boolean } {
  const path = z.array(z.string()).parse(JSON.parse(id));
  if (JSON.stringify(path) !== id) throw new Error('Invalid journal record identity.');
  let node = WORLD_RECORD_SCHEMA,
    cursor = 0,
    parent = '',
    slot = '',
    list = false;
  while (cursor < path.length) {
    const parentLength = cursor;
    const field: string = node.children?.['$'] ? '$' : path[cursor++]!;
    const child = node.children?.[field];
    if (!child) throw new Error('Unknown journal record path.');
    if (child.mode !== 'one') {
      if (cursor >= path.length) throw new Error('Incomplete journal record path.');
      slot = path[cursor++]!;
    } else slot = field;
    parent = JSON.stringify(path.slice(0, parentLength));
    list = child.mode === 'list';
    node = child.node;
  }
  if (node.table !== table) throw new Error('Journal record table/path mismatch.');
  return { node, parent, slot, list };
}
function validateChanges(changes: RecordChanges): void {
  const tables = new Set<string>();
  for (const [table, rows] of changes.writes) {
    if (!RECORD_NODES.has(table) || tables.has(table))
      throw new Error('Unknown/repeated journal table.');
    tables.add(table);
    const ids = new Set<string>();
    for (const row of rows) {
      if (ids.has(row.id)) throw new Error('Repeated journal record write.');
      ids.add(row.id);
      const { node, parent, slot, list } = journalRecordPath(table, row.id);
      if (row.parent !== parent || row.slot !== (list ? String(row.position) : slot))
        throw new Error('Journal record ownership mismatch.');
      const value = JSON.parse(row.payload) as JsonRecord;
      const expected = Object.values(node.columns ?? {}).map((column) =>
        column.value(value, JSON.parse(row.id) as string[]),
      );
      if (JSON.stringify(expected) !== JSON.stringify(row.extra))
        throw new Error('Journal derived columns disagree with their record.');
      if (
        (table === 'activity_methods' || table === 'activity_occurrences') &&
        Buffer.byteLength(row.payload) > 32768
      )
        throw new Error('Journal activity record exceeds its canonical bound.');
    }
  }
  for (const [table, ids] of changes.deletes) {
    if (!RECORD_NODES.has(table) || new Set(ids).size !== ids.length)
      throw new Error('Unknown/repeated journal deletion.');
    const writes = new Set(changes.writes.get(table)?.map((row) => row.id));
    for (const id of ids) {
      journalRecordPath(table, id);
      if (writes.has(id)) throw new Error('Journal both replaces and deletes one record.');
    }
  }
}
/** Oversized changes keep ordinary synchronous saving; the world itself is not capped. */
export function encodeJournalTransition(
  changes: RecordChanges,
  history: ReturnType<typeof prepareHistory>,
): EncodedJournalTransition | undefined {
  // A lower bound rejects provably oversized construction before copying every
  // payload into another complete JSON string. Exact escaping/UTF-8 is checked below.
  let minimum = 0;
  for (const rows of changes.writes.values())
    for (const row of rows) {
      minimum += row.payload.length;
      if (minimum > JOURNAL_ENTRY_BYTES) return;
    }
  for (const event of history.changed) {
    minimum += event.text.length;
    if (minimum > JOURNAL_ENTRY_BYTES) return;
  }
  const payload = JSON.stringify({
    writes: [...changes.writes],
    deletes: [...changes.deletes],
    history: { append: history.fastAppend, changed: history.changed, removed: history.removed },
  });
  const bytes = Buffer.byteLength(payload);
  if (bytes > JOURNAL_ENTRY_BYTES) return;
  // The same current decoder protects both accepted encoding and restart recovery.
  const hash = checksum(payload);
  const transition = decodeJournalTransition(payload, hash);
  const encoded = Object.freeze({ payload, checksum: hash, bytes });
  validatedEncodings.set(encoded, transition);
  return encoded;
}
/** Reuse only this owner's sealed exact encoding; foreign preparation is decoded.
 * Neither the weak key nor its value retains a world or predecessor chain. */
export function validatedJournalTransition(encoded: EncodedJournalTransition): JournalTransition {
  if (Buffer.byteLength(encoded.payload) !== encoded.bytes)
    throw new Error('Journal byte count changed.');
  return (
    validatedEncodings.get(encoded) ?? decodeJournalTransition(encoded.payload, encoded.checksum)
  );
}
export function decodeJournalTransition(
  payload: string,
  expectedChecksum: string,
): JournalTransition {
  if (Buffer.byteLength(payload) > JOURNAL_ENTRY_BYTES || checksum(payload) !== expectedChecksum)
    throw new Error('Journal transition integrity check failed.');
  const value = deltaSchema.parse(JSON.parse(payload));
  if (
    new Set(value.writes.map(([table]) => table)).size !== value.writes.length ||
    new Set(value.deletes.map(([table]) => table)).size !== value.deletes.length
  )
    throw new Error('Repeated journal table.');
  const changes: RecordChanges = {
    writes: new Map(value.writes),
    deletes: new Map(value.deletes),
    rows: value.writes.reduce((count, [, rows]) => count + rows.length, 0),
  };
  validateChanges(changes);
  if (
    new Set(value.history.changed.map((event) => event.id)).size !== value.history.changed.length ||
    new Set(value.history.removed).size !== value.history.removed.length ||
    (value.history.append && value.history.removed.length)
  )
    throw new Error('Invalid journal event delta.');
  return { changes, history: value.history };
}

/** Restart-only reconstruction from a complete applied world. Online application reuses its
 * exact immutable preparation. This never manufactures commands or reruns random choices. */
export function reconstructJournalWorld(
  records: WorldRecords,
  before: SavedWorld,
  transition: JournalTransition,
): SavedWorld {
  const baseline = records.prepare(undefined, before);
  const tables = new Map<string, Map<string, RowChange>>(
    [...baseline.writes].map(([table, rows]) => [table, new Map(rows.map((row) => [row.id, row]))]),
  );
  // Reparent before deleting old structural ownership, matching WorldRecords.write.
  for (const [table, rows] of transition.changes.writes) {
    let entries = tables.get(table);
    if (!entries) tables.set(table, (entries = new Map()));
    for (const row of rows) {
      if (row.create && entries.has(row.id)) throw new Error('Journal creates an existing record.');
      entries.set(row.id, row);
    }
  }
  const children = new Map<string, Map<string, string[]>>();
  for (const [table, entries] of tables) {
    const parents = new Map<string, string[]>();
    for (const row of entries.values()) {
      const ids = parents.get(row.parent) ?? [];
      ids.push(row.id);
      parents.set(row.parent, ids);
    }
    children.set(table, parents);
  }
  const remove = (table: string, id: string) => {
    if (!tables.get(table)?.delete(id)) return;
    const node = RECORD_NODES.get(table)!;
    for (const child of Object.values(node.children ?? {}))
      for (const childId of children.get(child.node.table)?.get(id) ?? [])
        remove(child.node.table, childId);
  };
  for (const [table, ids] of transition.changes.deletes) for (const id of ids) remove(table, id);
  const events = new Map(before.world.events.map((event) => [event.id, event]));
  for (const id of transition.history.removed) events.delete(id);
  for (const event of transition.history.changed) events.set(event.id, event);
  const groups = new Map<string, Map<string, JsonRecord[]>>();
  for (const [table, entries] of tables) {
    const parents = new Map<string, JsonRecord[]>();
    for (const row of entries.values()) {
      let payload = row.payload;
      if (table === 'world_hot_events') {
        const event = events.get((JSON.parse(payload) as { id: string }).id);
        if (!event) throw new Error('Journal hot event has no exact history body.');
        payload = JSON.stringify(event);
      }
      const siblings = parents.get(row.parent) ?? [];
      siblings.push({
        id: row.id,
        parent_id: row.parent,
        slot: row.slot,
        position: row.position,
        payload,
      });
      parents.set(row.parent, siblings);
    }
    for (const siblings of parents.values())
      siblings.sort(
        (a, b) =>
          Number(a['position']) - Number(b['position']) ||
          String(a['id']).localeCompare(String(b['id'])),
      );
    groups.set(table, parents);
  }
  const after = assembleWorldRecords(groups, before.world.id);
  validateCurrentWorldState(after.world);
  return after;
}
