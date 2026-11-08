import type { NativeChangedRows, NativeSaveRows } from '@open-legend/native-simulation';
import { RECORD_NODES, RECORD_PARENTS } from './world-record-schema.js';
import type { RecordChanges } from './world-records.js';

/** Convert one final immutable native save prefix to the existing writer's transport.
 * Payload strings and column values stay encoded; this never reconstructs a world.
 * docs/projects/native-simulation-core-tech-design.md#62-direct-changed-record-saving */
export function nativeRecordChanges(changes: NativeChangedRows): RecordChanges {
  const writes = new Map(Object.entries(changes.writes));
  const pendingDeletes = new Map(Object.entries(changes.deletes));
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
  for (const table of [...pendingDeletes.keys(), ...expired.keys()])
    if (!RECORD_NODES.has(table))
      throw new Error(`Native save names an unknown record table: ${table}.`);
  if (rows !== changes.rows) throw new Error('Native save row accounting is inconsistent.');
  // Native metadata keeps explicit descendant tombstones across unsaved parent
  // removal/recreation. Only the final immutable SQL prefix can discard those
  // already covered by the current schema's actual foreign-key cascade.
  const deletedParents = new Map<string, Set<string>>();
  const deletes = new Map<string, string[]>();
  for (const [table, ids] of pendingDeletes) {
    const ancestors: Set<string>[] = [];
    for (let parent = RECORD_PARENTS.get(table); parent; parent = RECORD_PARENTS.get(parent)) {
      const parentIds = pendingDeletes.get(parent);
      if (!parentIds?.length) continue;
      let values = deletedParents.get(parent);
      if (!values) {
        values = new Set(parentIds);
        deletedParents.set(parent, values);
      }
      ancestors.push(values);
    }
    const remaining = ancestors.length
      ? ids.filter((id) => {
          const path: unknown = JSON.parse(id);
          if (!Array.isArray(path) || path.some((part) => typeof part !== 'string'))
            throw new Error('Native delete has an invalid canonical record identity.');
          for (let length = path.length - 1; length > 0; length--) {
            const parent = JSON.stringify(path.slice(0, length));
            if (ancestors.some((values) => values.has(parent))) return false;
          }
          return true;
        })
      : ids;
    if (remaining.length) deletes.set(table, remaining);
  }
  return { writes, deletes, rows, ...(expired.size ? { expired } : {}) };
}

/** Exact acknowledgement bindings travel beside the row cut. The owner keeps
 * this prefix until its actual database revision succeeds; a newer suffix is
 * never acknowledged by completing this save. */
export function nativeSaveCut(save: NativeSaveRows) {
  return {
    worldId: save.worldId,
    generation: save.generation,
    prefix: save.prefix,
    baseRevision: save.baseRevision,
    throughCut: save.throughCut,
    identityThrough: save.identityThrough,
    changes: nativeRecordChanges(save.changes),
  };
}
