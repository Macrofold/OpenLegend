import { isDraft, original } from 'immer';
import {
  objectIndexEntries,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from './object-index.js';
import { countDomainWork } from './diagnostic-counters.js';
import type { WorldState } from './types.js';
import type { Outing } from './outings.js';
interface Entry {
  actors: string[];
  destinationId?: string;
  deadline?: number;
}
interface Index {
  members?: ObjectIndexNode<string>;
  destinations?: ObjectIndexNode<string>;
  accepted?: ObjectIndexNode<string>;
  due?: ObjectIndexNode<number>;
  locations?: ObjectIndexNode<Entry>;
}
const snapshots = new WeakMap<object, Index>();
const drafts = new WeakMap<WorldState, Index>();
const bytes = new DataView(new ArrayBuffer(8));
function timeKey(at: number, id: string) {
  bytes.setFloat64(0, at, false);
  return `${bytes.getUint32(0).toString(16).padStart(8, '0')}${bytes.getUint32(4).toString(16).padStart(8, '0')}:${id}`;
}
function update(index: Index, id: string, trip?: Outing) {
  const prior = objectIndexGet(index.locations, id);
  if (prior) {
    for (const actor of prior.actors) {
      index.members = objectIndexSet(index.members, `${actor}\0${id}`, undefined);
      if (objectIndexGet(index.accepted, actor) === id)
        index.accepted = objectIndexSet(index.accepted, actor, undefined);
    }
    if (prior.destinationId)
      index.destinations = objectIndexSet(
        index.destinations,
        `${prior.destinationId}\0${id}`,
        undefined,
      );
    if (prior.deadline !== undefined)
      index.due = objectIndexSet(index.due, timeKey(prior.deadline, id), undefined);
  }
  const entry = trip
    ? {
        actors: [trip.proposerId, trip.recipientId],
        destinationId: trip.destination.entityId,
        ...(trip.status === 'pending' ? { deadline: trip.expiresAt } : {}),
      }
    : undefined;
  if (entry) {
    for (const actor of entry.actors) {
      index.members = objectIndexSet(index.members, `${actor}\0${id}`, id);
      if (trip!.status === 'traveling') index.accepted = objectIndexSet(index.accepted, actor, id);
    }
    if (entry.destinationId)
      index.destinations = objectIndexSet(index.destinations, `${entry.destinationId}\0${id}`, id);
    if (entry.deadline !== undefined)
      index.due = objectIndexSet(index.due, timeKey(entry.deadline, id), entry.deadline);
  }
  index.locations = objectIndexSet(index.locations, id, entry);
}
function indexFor(world: WorldState): Index {
  const pending = drafts.get(world);
  if (pending) return pending;
  const base = isDraft(world) ? original(world)! : world;
  const records = base.outings;
  let index = records && Object.isFrozen(records) ? snapshots.get(records) : undefined;
  if (!index) {
    index = {};
    for (const trip of Object.values(records ?? {})) {
      countDomainWork('outingIndexed');
      update(index, trip.id, trip);
    }
    if (records && Object.isFrozen(records)) snapshots.set(records, index);
  }
  if (isDraft(world)) {
    index = { ...index };
    drafts.set(world, index);
  }
  return index;
}
export function prepareOutingIndex(world: WorldState): void {
  indexFor(world);
}
export function indexOuting(world: WorldState, id: string, trip?: Outing): void {
  if (isDraft(world)) update(indexFor(world), id, trip);
}
export function* actorOutingIds(world: WorldState, actorId: string): Generator<string> {
  const prefix = `${actorId}\0`;
  for (const [key, id] of objectIndexEntries(indexFor(world).members, prefix)) {
    if (!key.startsWith(prefix)) break;
    yield id;
  }
}
export function acceptedOutingId(world: WorldState, actorId: string): string | undefined {
  return objectIndexGet(indexFor(world).accepted, actorId);
}
export function affectedOutingIds(world: WorldState, entityIds: Iterable<string>): Set<string> {
  const index = indexFor(world),
    ids = new Set<string>();
  for (const entityId of entityIds) {
    for (const id of actorOutingIds(world, entityId)) ids.add(id);
    const prefix = `${entityId}\0`;
    for (const [key, id] of objectIndexEntries(index.destinations, prefix)) {
      if (!key.startsWith(prefix)) break;
      ids.add(id);
    }
  }
  return ids;
}
export function nextOutingDeadline(world: WorldState): number {
  return objectIndexEntries(indexFor(world).due).next().value?.[1] ?? Infinity;
}
export function captureOutingIndex(world: WorldState): (result: WorldState) => void {
  const pending = drafts.get(world);
  drafts.delete(world);
  return (result) => {
    if (pending && result.outings) snapshots.set(result.outings, pending);
  };
}
