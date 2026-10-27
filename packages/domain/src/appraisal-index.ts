import { readOnlyDraftView } from './draft.js';
import { isImmutableData } from './records.js';
import { isDraft, original } from 'immer';
import {
  objectIndexEntries,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from './object-index.js';
import type { Appraisal } from './appraisals.js';
import type { WorldState } from './types.js';
import type { DefinitionPin } from './world-modules.js';

type Entry = { actorId: string; id: string; scope: string; at?: number };
interface Index {
  active?: ObjectIndexNode<string>;
  due?: ObjectIndexNode<Entry>;
  locations?: ObjectIndexNode<Entry>;
  scoped?: ObjectIndexNode<string>;
}
function scopeKey(actorId: string, pin: DefinitionPin, targetId: string | null): string {
  return `${JSON.stringify([actorId, pin.id, pin.version, pin.digest, targetId])}\0`;
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
    index.scoped = objectIndexSet(index.scoped, `${previous.scope}${record.id}`, undefined);
    if (previous.at !== undefined)
      index.due = objectIndexSet(index.due, dueKey(previous), undefined);
  }
  let next: Entry | undefined;
  if (record.state === 'active') {
    next = {
      actorId: record.actorId,
      id: record.id,
      scope: scopeKey(record.actorId, record.definitionPin, record.targetId),
      ...(record.nextAt !== undefined ? { at: record.nextAt } : {}),
    };
    index.active = objectIndexSet(index.active, `${record.actorId}\0${record.id}`, record.id);
    index.scoped = objectIndexSet(index.scoped, `${next.scope}${record.id}`, record.id);
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
/** Exact owner/definition/subject membership, independent of retained history and
 * the convenience page. Values and permission remain with the appraisal owner. */
export function* scopedAppraisalIds(
  world: WorldState,
  actorId: string,
  pin: DefinitionPin,
  targetId: string | null,
): Generator<string> {
  const prefix = scopeKey(actorId, pin, targetId);
  for (const [key, id] of objectIndexEntries(indexFor(world).scoped, prefix)) {
    if (!key.startsWith(prefix)) break;
    yield id;
  }
}
export function nextDueAppraisal(world: WorldState): Entry | undefined {
  const first = objectIndexEntries(indexFor(world).due).next().value?.[1];
  return first && first.at! <= world.simTime ? first : undefined;
}
/** The same derived order drives both interval selection and due-state consumption. */
export function nextAppraisalDeadline(world: WorldState): number {
  return objectIndexEntries(indexFor(world).due).next().value?.[1].at ?? Infinity;
}
export function captureAppraisalIndex(world: WorldState): (result: WorldState) => void {
  const pending = drafts.get(world);
  drafts.delete(world);
  return (result) => {
    if (pending && result.appraisals) snapshots.set(result.appraisals, pending);
  };
}

const processDeadlines = new WeakMap<object, number>();
/** A process table changes only on enrolment/retirement or its own due occurrence.
 * Reuse its numeric minimum between unrelated movement/need boundaries. */
export function nextAppraisalProcessDeadline(world: WorldState): number {
  const processes = readOnlyDraftView(world).appraisalProcesses;
  if (!processes) return Infinity;
  const values = readOnlyDraftView(processes),
    stable = isImmutableData(values);
  const cached = stable ? processDeadlines.get(values) : undefined;
  if (cached !== undefined) return cached;
  let next = Infinity;
  for (const process of Object.values(values))
    next = Math.min(next, readOnlyDraftView(process).nextAt);
  if (stable) processDeadlines.set(values, next);
  return next;
}
