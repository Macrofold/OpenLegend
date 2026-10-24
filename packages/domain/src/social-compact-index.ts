import { isDraft, original } from 'immer';
import {
  objectIndexEntries,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from './object-index.js';
import type { WorldState } from './types.js';
import { isImmutableData } from './records.js';
import type { SocialCompact } from './social-compacts.js';

interface Entry {
  actors: string[];
  deadline?: number;
}
interface Index {
  members?: ObjectIndexNode<string>;
  due?: ObjectIndexNode<number>;
  entries?: ObjectIndexNode<Entry>;
}
const snapshots = new WeakMap<object, Index>(),
  drafts = new WeakMap<WorldState, Index>();
const prefix = (actorId: string) => '[' + JSON.stringify(actorId) + ',';
const bytes = new DataView(new ArrayBuffer(8));
function timeKey(time: number, id: string): string {
  bytes.setFloat64(0, time, false);
  return `${bytes.getUint32(0).toString(16).padStart(8, '0')}${bytes.getUint32(4).toString(16).padStart(8, '0')}:${id}`;
}
function update(index: Index, id: string, compact?: SocialCompact): void {
  const before = objectIndexGet(index.entries, id);
  if (before) {
    for (const actor of before.actors)
      index.members = objectIndexSet(index.members, JSON.stringify([actor, id]), undefined);
    if (before.deadline !== undefined)
      index.due = objectIndexSet(index.due, timeKey(before.deadline, id), undefined);
  }
  const entry = compact
    ? {
        actors: [compact.proposerId, compact.recipientId],
        ...(compact.phase === 'pending'
          ? { deadline: compact.replyBy }
          : compact.endAt === undefined
            ? {}
            : { deadline: compact.endAt }),
      }
    : undefined;
  if (entry) {
    for (const actor of entry.actors)
      index.members = objectIndexSet(index.members, JSON.stringify([actor, id]), id);
    if (entry.deadline !== undefined)
      index.due = objectIndexSet(index.due, timeKey(entry.deadline, id), entry.deadline);
  }
  index.entries = objectIndexSet(index.entries, id, entry);
}
function indexFor(world: WorldState): Index {
  const pending = drafts.get(world);
  if (pending) return pending;
  const base = isDraft(world) ? original(world)! : world,
    records = base.socialCompacts;
  let index = records && isImmutableData(records) ? snapshots.get(records) : undefined;
  if (!index) {
    index = {};
    for (const compact of Object.values(records ?? {})) update(index, compact.id, compact);
    if (records && isImmutableData(records)) snapshots.set(records, index);
  }
  if (isDraft(world)) {
    index = { ...index };
    drafts.set(world, index);
  }
  return index;
}
export function prepareCompactIndex(world: WorldState): void {
  indexFor(world);
}
export function indexCompact(world: WorldState, id: string, compact?: SocialCompact): void {
  if (isDraft(world)) update(indexFor(world), id, compact);
}
export function* actorCompactIds(world: WorldState, actorId: string): Generator<string> {
  const start = prefix(actorId);
  for (const [key, id] of objectIndexEntries(indexFor(world).members, start)) {
    if (!key.startsWith(start)) break;
    yield id;
  }
}
export function nextCompactDeadline(world: WorldState): number {
  return objectIndexEntries(indexFor(world).due).next().value?.[1] ?? Infinity;
}
export function* dueCompactIds(world: WorldState): Generator<string> {
  for (const [key, at] of objectIndexEntries(indexFor(world).due)) {
    if (at > world.simTime) break;
    yield key.slice(key.indexOf(':') + 1);
  }
}
export function captureCompactIndex(world: WorldState): (result: WorldState) => void {
  const pending = drafts.get(world);
  drafts.delete(world);
  return (result) => {
    if (pending && result.socialCompacts && isImmutableData(result.socialCompacts))
      snapshots.set(result.socialCompacts, pending);
  };
}
