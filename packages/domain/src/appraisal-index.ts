import { isDraft, original } from 'immer';
import {
  objectIndexEntries,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from './object-index.js';
import type { Appraisal } from './appraisals.js';
import type { WorldState } from './types.js';

type Entry = { actorId: string; id: string; at?: number };
interface Index {
  active?: ObjectIndexNode<string>;
  due?: ObjectIndexNode<Entry>;
  locations?: ObjectIndexNode<Entry>;
}
const snapshots = new WeakMap<object, Index>();
const drafts = new WeakMap<WorldState, Index>();
const timeBytes = new DataView(new ArrayBuffer(8));
function dueKey(entry: Entry): string {
  timeBytes.setFloat64(0, entry.at!, false);
  // Nonnegative finite IEEE doubles sort in byte order, including subsecond times.
  return `${timeBytes.getUint32(0).toString(16).padStart(8, '0')}${timeBytes.getUint32(4).toString(16).padStart(8, '0')}:${entry.id}`;
}
function add(index: Index, record: Appraisal): void {
  const previous = objectIndexGet(index.locations, record.id);
  if (previous) {
    index.active = objectIndexSet(index.active, `${previous.actorId}\0${record.id}`, undefined);
    if (previous.at !== undefined)
      index.due = objectIndexSet(index.due, dueKey(previous), undefined);
  }
  let next: Entry | undefined;
  if (record.state === 'active') {
    next = {
      actorId: record.actorId,
      id: record.id,
      ...(record.nextAt !== undefined ? { at: record.nextAt } : {}),
    };
    index.active = objectIndexSet(index.active, `${record.actorId}\0${record.id}`, record.id);
    if (next.at !== undefined) index.due = objectIndexSet(index.due, dueKey(next), next);
  }
  index.locations = objectIndexSet(index.locations, record.id, next);
}
function indexFor(world: WorldState): Index {
  const pending = drafts.get(world);
  if (pending) return pending;
  const base = isDraft(world) ? original(world)! : world;
  const records = base.appraisals;
  const cached = records && Object.isFrozen(records) ? snapshots.get(records) : undefined;
  let index = cached;
  if (!index) {
    index = {};
    for (const values of Object.values(records ?? {}))
      for (const record of Object.values(values)) add(index, record);
    if (records && Object.isFrozen(records)) snapshots.set(records, index);
  }
  if (isDraft(world)) {
    index = { ...index };
    drafts.set(world, index);
  }
  return index;
}
/** Call before a write, then publish its scalar index entry after the write. Trees are
 * persistent; editing one appraisal copies O(log N) index nodes, not the social world. */
export function prepareAppraisalIndex(world: WorldState): void {
  indexFor(world);
}
export function indexAppraisal(world: WorldState, record: Appraisal): void {
  if (isDraft(world)) add(indexFor(world), record);
}
export function* activeAppraisalIds(
  world: WorldState,
  actorId: string,
  after: string,
): Generator<string> {
  const prefix = `${actorId}\0`;
  for (const [key, id] of objectIndexEntries(indexFor(world).active, `${prefix}${after}`)) {
    if (!key.startsWith(prefix)) break;
    yield id;
  }
}
export function nextDueAppraisal(world: WorldState): Entry | undefined {
  const first = objectIndexEntries(indexFor(world).due).next().value?.[1];
  return first && first.at! <= world.simTime ? first : undefined;
}
export function captureAppraisalIndex(world: WorldState): (result: WorldState) => void {
  const pending = drafts.get(world);
  drafts.delete(world);
  return (result) => {
    if (pending && result.appraisals) snapshots.set(result.appraisals, pending);
  };
}
