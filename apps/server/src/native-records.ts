import type { NativeChangedRows, NativeSaveRows } from '@open-legend/native-simulation';
import { RECORD_NODES } from './world-record-schema.js';
import type { RecordChanges } from './world-records.js';

/** Convert one detached native product to the existing writer's transport.
 * Payload strings and column values stay encoded; this never reconstructs a world.
 * docs/projects/native-simulation-core-tech-design.md#62-direct-changed-record-saving */
export function nativeRecordChanges(changes: NativeChangedRows): RecordChanges {
  const writes = new Map(Object.entries(changes.writes));
  const deletes = new Map(Object.entries(changes.deletes));
  const expired = new Map(Object.entries(changes.expired ?? {}));
  let rows = 0;
  for (const [table, values] of writes) {
    const node = RECORD_NODES.get(table);
    // SQL dispatch and interpolated column masks use the current schema owner,
    // including when a loaded addon does not match the application's build.
    if (!node) throw new Error(`Native save names an unknown record table: ${table}.`);
    const columns = Object.keys(node.columns ?? {});
    for (const value of values) {
      if (
        value.extra.length !== columns.length ||
        value.writeColumns?.some((column) => !columns.includes(column))
      )
        throw new Error(`Native save columns do not match the record schema: ${table}.`);
    }
    rows += values.length;
  }
  for (const table of [...deletes.keys(), ...expired.keys()])
    if (!RECORD_NODES.has(table))
      throw new Error(`Native save names an unknown record table: ${table}.`);
  if (rows !== changes.rows) throw new Error('Native save row accounting is inconsistent.');
  return { writes, deletes, rows, ...(expired.size ? { expired } : {}) };
}

/** Exact acknowledgement bindings travel beside the row cut. The owner keeps
 * this prefix until its actual database revision succeeds; a newer suffix is
 * never acknowledged by completing this save. */
export function nativeSaveCut(save: NativeSaveRows) {
  return {
    prefix: save.prefix,
    baseRevision: save.baseRevision,
    throughCut: save.throughCut,
    changes: nativeRecordChanges(save.changes),
  };
}
