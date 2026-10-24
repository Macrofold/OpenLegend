import { current, isDraft } from 'immer';
import { readOnlyDraftView } from './draft.js';
import {
  objectIndexGet,
  objectIndexSet,
  objectIndexEntries,
  type ObjectIndexNode,
} from './object-index.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { validateOrderedRecord } from './ordered-record.js';
import { countDomainWork } from './diagnostic-counters.js';
import type { Entity } from './types.js';

interface EntityEntry {
  entity: Entity;
  order: string;
}
/** One canonical entity per exact key; ordering is independent of the lookup tree. */
export interface EntityCollection {
  kind: 'entity-collection';
  byId?: ObjectIndexNode<EntityEntry>;
  byOrder?: ObjectIndexNode<string>;
  nextInsertion: number;
  size: number;
}
const IMMER_STATE = Symbol.for('immer-state');
type EntityDraftState = { modified_?: boolean; copy_?: Entity };
const accessed = new WeakMap<EntityCollection, Map<string, Entity>>();
const structural = new WeakMap<EntityCollection, Set<string>>();
const removed = new WeakMap<EntityCollection, Set<string>>();

export function emptyEntities(): EntityCollection {
  return { kind: 'entity-collection', nextInsertion: 0, size: 0 };
}
function arrayIndex(id: string): number | undefined {
  const value = Number(id);
  return Number.isInteger(value) && value >= 0 && value < 4294967295 && String(value) === id
    ? value
    : undefined;
}
function numericOrder(id: string): string | undefined {
  return arrayIndex(id) === undefined ? undefined : `0/${id.padStart(10, '0')}`;
}
function plainGet<T>(node: ObjectIndexNode<T> | undefined, key: string): T | undefined {
  while (node) {
    const current = readOnlyDraftView(node);
    if (key === current.key) return current.value;
    node = key < current.key ? current.left : current.right;
  }
  return;
}
/** Ordinary owned drafts return their current mutable entity. Read-only phase views and
 * published collections return the same current value without creating a path of drafts. */
export function entityGet(records: EntityCollection, id: string): Entity | undefined {
  const mutable = isDraft(records);
  if (mutable) {
    const retained = accessed.get(records)?.get(id);
    if (retained) {
      countDomainWork('entityDraftLookupHits');
      return retained;
    }
    countDomainWork('entityDraftTreeLookups');
  }
  const entry = mutable ? objectIndexGet(records.byId, id) : plainGet(records.byId, id);
  if (!entry) return;
  const value = mutable ? entry.entity : readOnlyDraftView(readOnlyDraftView(entry).entity);
  if (mutable) {
    let values = accessed.get(records);
    if (!values) accessed.set(records, (values = new Map()));
    values.set(id, value);
  }
  return value;
}
export function entityOwn(records: EntityCollection, id: unknown): Entity | undefined {
  return isSafeRecordId(id) ? entityGet(records, id) : undefined;
}
export function entityHas(records: EntityCollection, id: string): boolean {
  return plainGet(readOnlyDraftView(records).byId, id) !== undefined;
}
/** Immutable ordering fact, not a second ordinal. Removal/reinsertion changes a string
 * key's label even when its entity identity and value are unchanged. */
export function entityOrdering(
  records: EntityCollection,
  id: string,
): { key: string; numeric: boolean } | undefined {
  const entry = plainGet(readOnlyDraftView(records).byId, id);
  if (!entry) return;
  const key = readOnlyDraftView(entry).order;
  return { key, numeric: arrayIndex(id) !== undefined };
}
function changed(records: EntityCollection, id: string): void {
  if (!isDraft(records)) return;
  let ids = structural.get(records);
  if (!ids) structural.set(records, (ids = new Set()));
  ids.add(id);
}
export function entitySet(records: EntityCollection, id: string, entity: Entity): void {
  if (entity.id !== id) throw new Error('Entity key and identity differ.');
  accessed.get(records)?.delete(id);
  const previous = plainGet(readOnlyDraftView(records).byId, id);
  let order = previous && readOnlyDraftView(previous).order;
  if (!order) {
    order = numericOrder(id);
    if (!order) {
      if (!Number.isSafeInteger(records.nextInsertion + 1)) {
        // An ordering label is not a gameplay capacity. Renumber the present string
        // keys before integer precision could alias two insertion positions.
        const entries = [...entityEntries(records)];
        records.byId = undefined;
        records.byOrder = undefined;
        records.nextInsertion = 0;
        records.size = 0;
        for (const [key, value] of entries) entitySet(records, key, value);
      }
      order = `1/${String(records.nextInsertion++).padStart(16, '0')}`;
    }
    records.size++;
    records.byOrder = objectIndexSet(records.byOrder, order, id);
  }
  records.byId = objectIndexSet(records.byId, id, { entity, order });
  changed(records, id);
}
export function entityDelete(records: EntityCollection, id: string): boolean {
  accessed.get(records)?.delete(id);
  const previous = plainGet(readOnlyDraftView(records).byId, id);
  if (!previous) return false;
  if (isDraft(records)) {
    let ids = removed.get(records);
    if (!ids) removed.set(records, (ids = new Set()));
    ids.add(id);
  }
  records.byOrder = objectIndexSet(records.byOrder, readOnlyDraftView(previous).order, undefined);
  records.byId = objectIndexSet(records.byId, id, undefined);
  records.size--;
  changed(records, id);
  return true;
}
function* orderedEntityIds(node: ObjectIndexNode<string> | undefined): Generator<string> {
  if (!node) return;
  const value = readOnlyDraftView(node);
  yield* orderedEntityIds(value.left);
  yield value.value;
  yield* orderedEntityIds(value.right);
}
/** Full enumeration traverses each tree once. Exact lookup stays logarithmic, while a
 * complete result must not pay another lookup path for every already visited entity. */
function enumerationValues(records: EntityCollection): Map<string, Entity> {
  const values = new Map<string, Entity>();
  const mutable = isDraft(records);
  let owned = mutable ? accessed.get(records) : undefined;
  if (mutable && !owned) accessed.set(records, (owned = new Map()));
  function visit(node: ObjectIndexNode<EntityEntry> | undefined): void {
    if (!node) return;
    const view = mutable ? node : readOnlyDraftView(node);
    countDomainWork('entityEnumerationEntriesVisited');
    visit(view.left);
    const entry = mutable ? view.value : readOnlyDraftView(view.value);
    const value = mutable ? entry.entity : readOnlyDraftView(entry.entity);
    values.set(view.key, value);
    owned?.set(view.key, value);
    visit(view.right);
  }
  visit(mutable ? records.byId : readOnlyDraftView(records).byId);
  return values;
}
export function entityEntries(records: EntityCollection): [string, Entity][] {
  const values = enumerationValues(records),
    entries: [string, Entity][] = [];
  for (const id of orderedEntityIds(readOnlyDraftView(records).byOrder)) {
    const value = values.get(id);
    if (value) entries.push([id, value]);
  }
  return entries;
}
export function entityValues(records: EntityCollection): Entity[] {
  const values = enumerationValues(records),
    ordered: Entity[] = [];
  for (const id of orderedEntityIds(readOnlyDraftView(records).byOrder)) {
    const value = values.get(id);
    if (value) ordered.push(value);
  }
  return ordered;
}
export function entityKeys(records: EntityCollection): string[] {
  return [...orderedEntityIds(readOnlyDraftView(records).byOrder)];
}
/** Independent collection header over immutable branches, for scoped hydration/edit owners. */
export function cloneEntities(records: EntityCollection): EntityCollection {
  return { ...(isDraft(records) ? current(records) : records) };
}
export function entitiesFromEntries(
  entries: Iterable<readonly [string, Entity]>,
): EntityCollection {
  const records = emptyEntities();
  for (const [id, value] of entries) entitySet(records, id, value);
  return records;
}
/** Immediate draft-owner audit only. Returned proxies never enter saved metadata. */
export function entityDraftAudit(records: EntityCollection) {
  if (!isDraft(records)) return;
  return {
    assigned: structural.get(records) ?? new Set<string>(),
    removed: removed.get(records) as ReadonlySet<string> | undefined,
    values: accessed.get(records) ?? new Map<string, Entity>(),
  };
}
export function entityDraftChanges(records: EntityCollection): ReadonlySet<string> | undefined {
  const audit = entityDraftAudit(records);
  if (!audit) return;
  const ids = new Set(audit.assigned);
  for (const [id, entity] of audit.values) {
    const state = isDraft(entity)
      ? (entity as unknown as Record<symbol, EntityDraftState>)[IMMER_STATE]
      : undefined;
    if (state?.modified_) ids.add(id);
  }
  return ids;
}
export function validateEntityCollection(records: EntityCollection): void {
  if (
    !hasRecordFields(records, ['kind', 'nextInsertion', 'size'], ['byId', 'byOrder']) ||
    records.kind !== 'entity-collection' ||
    !Number.isSafeInteger(records.size) ||
    records.size < 0 ||
    !Number.isSafeInteger(records.nextInsertion) ||
    records.nextInsertion < 0
  )
    throw new Error('Invalid current entity collection.');
  validateOrderedRecord(
    { size: records.size, ...(records.byId ? { root: records.byId } : {}) },
    (entry) =>
      hasRecordFields(entry, ['entity', 'order']) &&
      typeof entry.order === 'string' &&
      !!entry.entity &&
      typeof entry.entity === 'object',
  );
  validateOrderedRecord(
    { size: records.size, ...(records.byOrder ? { root: records.byOrder } : {}) },
    (id) => isSafeRecordId(id),
  );
  const keys = new Set<string>();
  const orders = new Set<string>();
  const entryOrders = new Map<string, string>();
  for (const [id, entry] of objectIndexEntries(records.byId)) {
    if (
      !isSafeRecordId(id) ||
      !entry ||
      entry.entity?.id !== id ||
      keys.has(id) ||
      orders.has(entry.order)
    )
      throw new Error('Invalid entity collection identity or order.');
    const numeric = numericOrder(id);
    const position = Number(entry.order?.slice(2));
    if (
      numeric
        ? entry.order !== numeric
        : !/^1\/\d{16}$/.test(entry.order) ||
          !Number.isSafeInteger(position) ||
          position < 0 ||
          position >= records.nextInsertion
    )
      throw new Error('Invalid entity collection insertion position.');
    keys.add(id);
    orders.add(entry.order);
    entryOrders.set(id, entry.order);
  }
  let count = 0;
  for (const [order, id] of objectIndexEntries(records.byOrder)) {
    if (!keys.has(id) || entryOrders.get(id) !== order)
      throw new Error('Invalid entity collection order reference.');
    count++;
  }
  if (keys.size !== records.size || count !== records.size)
    throw new Error('Invalid entity collection size.');
}
