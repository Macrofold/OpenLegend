import {
  canonicalJson,
  selectReceivedReceiptMembers,
  type TemporalHistorySelection,
  type TemporalPage,
  type EvidenceSource,
} from '@open-legend/domain';
import { personalAccountRevision } from './personal-accounts.js';
import type { RecordChanges } from './world-records.js';

type Selection = TemporalHistorySelection['entries'][number];
/** Finite admitted input dependencies. Physical row ownership and ordinary age
 * are not revocation: the request already owns its exact permitted copies.
 * docs/projects/bookkeeping-simplification-tech-design.md#meaningful-knowledge-identity-and-delayed-interpretation */
export interface TemporalSourceWatch {
  /** Life of the request owner, independent of each receipt's historical life. */
  observerPhysicalLife?: number;
  aliases: Set<string>;
  selections: Map<string, { selection: Selection; bytes: number }>;
  bytes: number;
  personalSources: Map<string, string>;
  /** Scalar edits observed while source preparation awaits its first binding. */
  personalEdits: Map<string, string | undefined>;
  editBytes: number;
}
export const newTemporalSourceWatch = (): TemporalSourceWatch => ({
  aliases: new Set(),
  selections: new Map(),
  bytes: 0,
  personalSources: new Map(),
  personalEdits: new Map(),
  editBytes: 0,
});
export function retainTemporalSelectionWatch(
  watch: TemporalSourceWatch,
  selections: readonly Selection[],
  aliases: Iterable<string>,
  maximumBytes: number,
  semanticSources: readonly EvidenceSource[],
): boolean {
  const personalSources = new Map(watch.personalSources);
  for (const source of semanticSources) {
    const table =
      source.family === 'awareness'
        ? 'mind_awareness'
        : source.family === 'memory' || source.family === 'action-result'
          ? 'mind_memories'
          : undefined;
    if (!table) continue;
    const key = JSON.stringify([table, source.observer.actorId, source.id]),
      old = personalSources.get(key);
    if (old !== undefined && old !== source.revision) return false;
    if (watch.personalEdits.has(key) && watch.personalEdits.get(key) !== source.revision)
      return false;
    personalSources.set(key, String(source.revision));
  }
  const retainedAliases = new Set([...watch.aliases, ...aliases]);
  const retained = new Map(watch.selections);
  let bytes = 0;
  for (const selection of selections) {
    const receipt = selection.receipt,
      key = JSON.stringify([
        receipt.actorId,
        receipt.physicalLife,
        receipt.epoch,
        receipt.batchOrder,
        receipt.entryIndex,
        receipt.facets.map((facet) => facet.memberIndex),
      ]);
    if (!retained.has(key))
      retained.set(key, { selection, bytes: Buffer.byteLength(JSON.stringify(selection)) });
  }
  for (const capture of retained.values()) bytes += capture.bytes;
  for (const id of retainedAliases) bytes += Buffer.byteLength(id) + 8;
  for (const [key, revision] of personalSources)
    bytes += Buffer.byteLength(key) + Buffer.byteLength(revision);
  if (bytes + watch.editBytes > maximumBytes) return false;
  watch.aliases = retainedAliases;
  watch.selections = retained;
  watch.bytes = bytes;
  watch.personalSources = personalSources;
  return true;
}

function logicalProjection(page: TemporalPage, expected: Selection): unknown {
  const selected = selectReceivedReceiptMembers(
    page,
    expected.receipt,
    new Set(expected.receipt.facets.map((facet) => facet.memberIndex)),
    new Set([expected.receipt.subject, ...(expected.receipt.contextSubjects ?? [])]),
  );
  return (
    selected && [
      selected.actorId,
      selected.physicalLife,
      selected.epoch,
      selected.batchOrder,
      selected.entryIndex,
      selected.at,
      selected.order,
      selected.change,
      selected.required,
      selected.origin,
      selected.facets,
    ]
  );
}
/** Called only at accepted mutation boundaries. Most gameplay changes contain
 * no semantic edits, so no selected receipt/value is revisited for movement. */
export function temporalWatchChanges(
  watch: TemporalSourceWatch,
  actorId: string,
  changes: RecordChanges,
  maximumBytes: number,
): boolean {
  for (const table of ['mind_forgotten', 'mind_corrections'])
    for (const row of changes.writes.get(table) ?? []) {
      const path = JSON.parse(row.id) as string[];
      if (path[3] !== actorId) continue;
      const source = table === 'mind_forgotten' ? JSON.parse(row.payload) : path.at(-1);
      if (typeof source === 'string' && watch.aliases.has(source)) return false;
    }
  for (const intent of changes.temporalEdits ?? []) {
    if (!intent.before || intent.before.actorId !== actorId) continue;
    for (const { selection } of watch.selections.values()) {
      const before = logicalProjection(intent.before, selection);
      if (
        before &&
        (intent.deleted ||
          canonicalJson(before) !== canonicalJson(logicalProjection(intent.after, selection)))
      )
        return false;
    }
  }
  // Only a typed personal-source dependency selects this revision fence.
  // A native observation's raw event alias is not ownership of its awareness
  // wrapper: routine account conversion/expiry cannot revoke dated input.
  const rememberEdit = (key: string, revision: string | undefined) => {
    if (!watch.personalEdits.has(key)) watch.editBytes += Buffer.byteLength(key) + 128;
    if (watch.bytes + watch.editBytes > maximumBytes) return false;
    watch.personalEdits.set(key, revision);
    return true;
  };
  for (const table of ['mind_awareness', 'mind_memories', 'mind_summaries']) {
    const ownerAt = table === 'mind_memories' ? 2 : 3;
    for (const row of changes.writes.get(table) ?? []) {
      if (row.create) continue;
      if (changes.expired?.get(table)?.includes(row.id)) continue;
      const path = JSON.parse(row.id) as string[],
        key = JSON.stringify([table, path[ownerAt], row.slot]);
      if (path[ownerAt] !== actorId) continue;
      const revision = personalAccountRevision(row.payload),
        expected = watch.personalSources.get(key);
      if (!rememberEdit(key, revision) || (expected !== undefined && revision !== expected))
        return false;
    }
    for (const id of changes.deletes.get(table) ?? []) {
      if (changes.expired?.get(table)?.includes(id)) continue;
      const path = JSON.parse(id) as string[],
        key = JSON.stringify([table, path[ownerAt], path.at(-1)]);
      if (
        path[ownerAt] === actorId &&
        (!rememberEdit(key, undefined) || watch.personalSources.has(key))
      )
        return false;
    }
  }
  return true;
}
