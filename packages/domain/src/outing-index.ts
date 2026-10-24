import { current, isDraft, original } from 'immer';
import { entityChangesSince, readOnlyDraftView } from './draft.js';
import {
  objectIndexEntries,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from './object-index.js';
import { countDomainWork } from './diagnostic-counters.js';
import { isImmutableData } from './records.js';
import { contributionDependentIds } from './status-capabilities.js';
import type { WorldState } from './types.js';
import type { Outing } from './outings.js';
interface Entry {
  actors: string[];
  kind: Outing['kind'];
  destinationIds: string[];
  deadline?: number;
}
interface Index {
  order?: ReadonlyMap<string, number>;
  members?: ObjectIndexNode<string>;
  destinations?: ObjectIndexNode<string>;
  accepted?: ObjectIndexNode<string>;
  due?: ObjectIndexNode<number>;
  locations?: ObjectIndexNode<Entry>;
}
// JSON tuple boundaries remain exact when an authored identity contains separators.
const relationKey = (owner: string, id: string) => JSON.stringify([owner, id]);
const relationPrefix = (owner: string) => '[' + JSON.stringify(owner) + ',';
const snapshots = new WeakMap<object, Index>();
const drafts = new WeakMap<WorldState, Index>();
const bytes = new DataView(new ArrayBuffer(8));
function destinationEntities(destination: { entityId?: string; anchor?: { entityId: string } }) {
  return [destination.entityId, destination.anchor?.entityId];
}
function timeKey(at: number, id: string) {
  bytes.setFloat64(0, at, false);
  return `${bytes.getUint32(0).toString(16).padStart(8, '0')}${bytes.getUint32(4).toString(16).padStart(8, '0')}:${id}`;
}
function update(index: Index, id: string, trip?: Outing) {
  const prior = objectIndexGet(index.locations, id);
  if (!!prior !== !!trip) index.order = undefined;
  if (prior) {
    for (const actor of prior.actors) {
      index.members = objectIndexSet(index.members, relationKey(actor, id), undefined);
      if (objectIndexGet(index.accepted, relationKey(prior.kind, actor)) === id)
        index.accepted = objectIndexSet(index.accepted, relationKey(prior.kind, actor), undefined);
    }
    for (const destinationId of prior.destinationIds)
      index.destinations = objectIndexSet(
        index.destinations,
        relationKey(destinationId, id),
        undefined,
      );
    if (prior.deadline !== undefined)
      index.due = objectIndexSet(index.due, timeKey(prior.deadline, id), undefined);
  }
  const entry = trip
    ? {
        actors: [trip.proposerId, trip.recipientId],
        kind: trip.kind,
        destinationIds: (trip.kind === 'cooperate'
          ? trip.terms.purpose === 'hunt'
            ? [trip.terms.quarry.id, ...destinationEntities(trip.terms.meetingPlace)]
            : trip.terms.purpose === 'guide'
              ? destinationEntities(trip.terms.destination)
              : trip.terms.task.kind === 'carry'
                ? destinationEntities(trip.terms.task.destination)
                : trip.terms.task.kind === 'construction'
                  ? [trip.terms.task.phase.rootId]
                  : []
          : [trip.combat?.opponentId ?? trip.destination.entityId]
        ).filter((id): id is string => !!id),
        ...(trip.status === 'pending'
          ? { deadline: trip.expiresAt }
          : trip.kind === 'cooperate'
            ? { deadline: Math.min(trip.endAt!, trip.pendingAmendment?.expiresAt ?? Infinity) }
            : {}),
      }
    : undefined;
  if (entry) {
    for (const actor of entry.actors) {
      index.members = objectIndexSet(index.members, relationKey(actor, id), id);
      if (trip!.status !== 'pending')
        index.accepted = objectIndexSet(index.accepted, relationKey(trip!.kind, actor), id);
    }
    for (const destinationId of entry.destinationIds)
      index.destinations = objectIndexSet(index.destinations, relationKey(destinationId, id), id);
    if (entry.deadline !== undefined)
      index.due = objectIndexSet(index.due, timeKey(entry.deadline, id), entry.deadline);
  }
  index.locations = objectIndexSet(index.locations, id, entry);
}
function buildIndex(records: WorldState['outings']): Index {
  const index: Index = {},
    order = new Map<string, number>();
  for (const id of Object.keys(records ?? {})) {
    countDomainWork('outingIndexed');
    update(index, id, records![id]);
    order.set(id, order.size);
  }
  index.order = order;
  return index;
}
function indexFor(world: WorldState): Index {
  const pending = drafts.get(world);
  if (pending) return pending;
  const base = isDraft(world) ? original(world)! : world;
  const records = base.outings;
  let index = records && isImmutableData(records) ? snapshots.get(records) : undefined;
  if (!index) {
    index = buildIndex(records);
    if (records && isImmutableData(records)) snapshots.set(records, index);
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
  const prefix = relationPrefix(actorId);
  for (const [key, id] of objectIndexEntries(indexFor(world).members, prefix)) {
    if (!key.startsWith(prefix)) break;
    yield id;
  }
}
export function acceptedOutingId(
  world: WorldState,
  actorId: string,
  kind: Outing['kind'] = 'travel',
): string | undefined {
  return objectIndexGet(indexFor(world).accepted, relationKey(kind, actorId));
}
export function affectedOutingIds(world: WorldState, entityIds: Iterable<string>): Set<string> {
  const index = indexFor(world),
    ids = new Set<string>();
  for (const entityId of entityIds) {
    for (const id of actorOutingIds(world, entityId)) ids.add(id);
    const prefix = relationPrefix(entityId);
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
function latest<T>(value: T): T {
  return isDraft(value) ? (current(value as object) as T) : value;
}
/** Select before reading terms. Cold/unknown lineage and changed shared rules
 * retain the complete authoritative check; this preparation grants no consent. */
export function nativeOutingIds(
  world: WorldState,
  baseline: WorldState | undefined,
  observedActors: Iterable<string> = [],
): Set<string> | undefined {
  if (isDraft(world)) {
    const stored = readOnlyDraftView(world).outings;
    const records = stored && readOnlyDraftView(stored);
    if (
      records === original(world)!.outings &&
      isImmutableData(records) &&
      !indexFor(world).locations
    )
      return new Set();
  }
  const changes = entityChangesSince(world, baseline, [
    'outings',
    'socialOfferPolicy',
    'moduleManifest',
    'statusEffectPolicy',
    'recipes',
    'assemblyFamilies',
    'places',
    'map',
  ]);
  if (!changes || !baseline) return;
  const index = indexFor(world);
  if (!index.locations) return new Set();
  const ids = affectedOutingIds(
    world,
    new Set([...changes, ...observedActors, ...contributionDependentIds(world, baseline, changes)]),
  );
  for (const [key, at] of objectIndexEntries(index.due)) {
    if (at > world.simTime) break;
    ids.add(key.slice(key.indexOf(':') + 1));
  }
  const order = index.order;
  if (!order) return;
  return new Set([...ids].sort((a, b) => order.get(a)! - order.get(b)!));
}
/** A full fallback also refreshes derived membership after an unknown builder. */
export function prepareFullOutingCheck(world: WorldState): void {
  if (!isDraft(world)) return;
  const records = latest(readOnlyDraftView(world).outings);
  const retained = records && isImmutableData(records) ? snapshots.get(records) : undefined;
  drafts.set(world, retained ? { ...retained } : buildIndex(records));
}
export function captureOutingIndex(world: WorldState): (result: WorldState) => void {
  const pending = drafts.get(world);
  drafts.delete(world);
  return (result) => {
    if (pending && result.outings && isImmutableData(result.outings)) {
      // Insertion/removal invalidates canonical record order. Recover it once
      // at publication, rather than forcing every later native check full.
      pending.order ??= new Map(Object.keys(result.outings).map((id, index) => [id, index]));
      snapshots.set(result.outings, pending);
    }
  };
}
