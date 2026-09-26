import { chargeWork, WorkBudgetError } from './work-budget.js';
import { contributionSourceBound } from './status-capabilities.js';
import { isDraft, original } from 'immer';
import { recordSemanticChange } from './dependencies.js';
import { nextId } from './data.js';
import { canonicalJson } from './events.js';
import { getOwn, isSafeRecordId, hasRecordFields } from './records.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import {
  assertReservedStock,
  itemHasReservations,
  availableItemQuantity,
} from './resource-claims.js';
import { groundedSpatial, worldPosition } from './spatial-state.js';
import {
  objectIndexGet,
  objectIndexSet,
  objectIndexEntries,
  type ObjectIndexNode,
} from './object-index.js';
import type { Entity, ItemInstance, WorldState } from './types.js';

export interface ItemLot {
  definitionPin: DefinitionPin;
  unitPin: DefinitionPin;
  quantity: number;
  individuality: 'homogeneous' | 'individual';
  revision: number;
}
export interface ContainerState {
  definitionPin: DefinitionPin;
  subtreeRevision: number;
  /** Derived from admitted whole packing load; bound to subtreeRevision, never an editable balance. */
  load: number;
  loadRevision: number;
  height: number;
}
export interface DeclaredOwner {
  holderId: string | null;
  disclosure: 'custodian' | 'public';
  sourceId: string;
  revision: number;
}
export interface ObjectRetirement {
  /** Historical physical custodian, never title or present access. Absent in older records. */
  custodianId?: string | null;
  at: number;
  cause: string;
  definitionPin: DefinitionPin;
  quantity: number;
}
export interface ObjectLineage {
  custodianId?: string | null;
  id: string;
  at: number;
  cause: string;
  type: 'split' | 'merge' | 'consume';
  sourceId: string;
  targetId?: string;
  quantity: number;
  unitPin: DefinitionPin;
}
export const ITEM_COUNT_PIN: Readonly<DefinitionPin> = Object.freeze({
  id: 'native-item-count',
  version: 1,
  digest: 'positive-safe-integer-units-v1',
});
export const MAX_CONTAINMENT_DEPTH = 16;
type Children = ObjectIndexNode<number> | undefined;
type ChildIndex = ObjectIndexNode<Children> | undefined;
interface IndexedObjects {
  children: ChildIndex;
}
const indexes = new WeakMap<object, IndexedObjects>();
const retiredIndexes = new WeakMap<WorldState['entities'], readonly string[]>();
/** Residency metadata follows exact writes, so partial consumption does not scan or
 * copy every live object merely to evict its newly committed history record. */
export function retiredObjectIds(world: WorldState): readonly string[] {
  const entities = world.entities;
  let ids = Object.isFrozen(entities) ? retiredIndexes.get(entities) : undefined;
  if (!ids) {
    ids = Object.values(entities)
      .filter((entity) => entity.retirement)
      .map((entity) => entity.id);
    if (Object.isFrozen(entities)) retiredIndexes.set(entities, ids);
  }
  return ids;
}
function parentOf(entity: Entity | undefined): string | undefined {
  return entity?.placement && entity.placement.mode !== 'world'
    ? entity.placement.parentEntityId
    : undefined;
}
function indexFor(world: WorldState): IndexedObjects {
  const token = world.objectState;
  let index = indexes.get(token);
  if (index) return index;
  if (isDraft(world) && original(world)?.objectState) {
    const base = original(world)!;
    const inherited = indexFor(base);
    index = { children: inherited.children };
  } else {
    index = { children: undefined };
    for (const entity of Object.values(world.entities)) {
      const parent = !entity.retirement && parentOf(entity);
      if (parent)
        index.children = objectIndexSet(
          index.children,
          parent,
          objectIndexSet(
            objectIndexGet(index.children, parent),
            entity.id,
            1 + (entity.container?.height ?? 0),
          ),
        );
    }
  }
  indexes.set(token, index);
  return index;
}
/** FinishWorld transfers the rebuildable index; canonical state remains plain JSON. */
export function captureObjectIndex(
  draft: WorldState,
): (committed: WorldState, changed: ReadonlySet<string>) => void {
  const index = draft.objectState && indexes.get(draft.objectState);
  const base = original(draft)!,
    priorRetired = retiredIndexes.get(base.entities);
  return (committed, changed) => {
    if (index) indexes.set(committed.objectState, { children: index.children });
    if (priorRetired && base.entities !== committed.entities) {
      let ids: Set<string> | undefined;
      for (const id of changed)
        if (!!base.entities[id]?.retirement !== !!committed.entities[id]?.retirement) {
          ids ??= new Set(priorRetired);
          if (committed.entities[id]?.retirement) ids.add(id);
          else ids.delete(id);
        }
      retiredIndexes.set(committed.entities, ids ? [...ids] : priorRetired);
    }
  };
}
function reindex(
  world: WorldState,
  id: string,
  oldParent: string | undefined,
  newParent: string | undefined,
) {
  const index = indexFor(world);
  for (const scopeId of new Set([oldParent, newParent]))
    if (scopeId)
      recordSemanticChange(world, { kind: 'membership', family: 'direct-contents', scopeId });
  world.objectState.revision = bump(world.objectState.revision);
  if (oldParent)
    index.children = objectIndexSet(
      index.children,
      oldParent,
      objectIndexSet(objectIndexGet(index.children, oldParent), id, undefined),
    );
  if (newParent)
    index.children = objectIndexSet(
      index.children,
      newParent,
      objectIndexSet(
        objectIndexGet(index.children, newParent),
        id,
        1 + (world.entities[id]?.container?.height ?? 0),
      ),
    );
}
export function* directChildIds(
  world: WorldState,
  parentId: string,
  after = '',
): Generator<string> {
  for (const [id] of objectIndexEntries(
    objectIndexGet(indexFor(world).children, parentId),
    after,
  )) {
    chargeWork({ candidates: 1 });
    yield id;
  }
}
export function itemFor(world: WorldState, id: string): ItemInstance | undefined {
  const entity = getOwn(world.entities, id),
    lot = entity?.item,
    ownerId = parentOf(entity);
  if (!entity || !lot || entity.retirement || !ownerId) return undefined;
  return {
    id,
    definitionId: lot.definitionPin.id,
    quantity: lot.quantity,
    revision: lot.revision,
    ownerId,
    individuality: lot.individuality,
    placementRevision: entity.placement!.revision,
    ...(entity.container ? { container: { ...entity.container } } : {}),
  };
}
export function itemsForOwner(world: WorldState, ownerId: string): readonly ItemInstance[] {
  return [...directChildIds(world, ownerId)].flatMap((id) => {
    const item = itemFor(world, id);
    return item ? [item] : [];
  });
}
/** Legacy creator type totals are a read projection, never an instance replacement. */
export function inventoryTotals(
  world: WorldState,
  ownerId: string,
): Array<{ definitionId: string; quantity: number }> {
  const totals = new Map<string, number>();
  for (const item of itemsForOwner(world, ownerId))
    totals.set(item.definitionId, checked((totals.get(item.definitionId) ?? 0) + item.quantity));
  return [...totals].map(([definitionId, quantity]) => ({ definitionId, quantity }));
}
export function allItems(world: WorldState): ItemInstance[] {
  return Object.values(world.entities).flatMap((entity) => {
    const item = entity.item && itemFor(world, entity.id);
    return item ? [item] : [];
  });
}
export function objectAncestors(world: WorldState, id: string): Entity[] {
  const result: Entity[] = [],
    seen = new Set<string>();
  for (
    let entity = getOwn(world.entities, id);
    entity;
    entity = getOwn(world.entities, parentOf(entity))
  ) {
    if (seen.has(entity.id) || result.length > MAX_CONTAINMENT_DEPTH)
      throw new Error('Containment cycle or depth limit.');
    if (entity.retirement) throw new Error('Physical parent is retired.');
    seen.add(entity.id);
    result.push(entity);
    if (entity.placement?.mode === 'world') return result;
    if (!parentOf(entity)) throw new Error('Physical placement is missing.');
  }
  throw new Error('Physical parent is unavailable.');
}
export function effectivePosition(world: WorldState, id: string) {
  return worldPosition(objectAncestors(world, id).at(-1)!);
}
export function custodian(world: WorldState, id: string): string {
  return objectAncestors(world, id).at(-1)!.id;
}
function checked(value: number, label = 'quantity'): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`Object ${label} exceeds the supported range.`);
  return value;
}
function bump(value: number): number {
  return checked(value + 1, 'revision');
}
function ownLoad(world: WorldState, lot: ItemLot): number | undefined {
  const definition = world.itemDefinitions[lot.definitionPin.id];
  if (!definition || !sameDefinitionPin(definitionPin(definition), lot.definitionPin))
    throw new Error('Pinned object definition unavailable.');
  const packing =
    definition.packingLoad ??
    world.itemHandling.packingLoads?.find((entry) =>
      sameDefinitionPin(entry.definition, lot.definitionPin),
    )?.load;
  return packing === undefined ? undefined : checked(packing * lot.quantity, 'packing load');
}
function subtreeLoad(world: WorldState, entity: Entity): number | undefined {
  if (!entity.item) return undefined;
  const own = ownLoad(world, entity.item);
  if (own === undefined) return undefined;
  if (entity.container && entity.container.loadRevision !== entity.container.subtreeRevision)
    throw new Error('Container load requires reconciliation.');
  return checked(own + (entity.container?.load ?? 0), 'packing load');
}
function ancestorDeltas(
  world: WorldState,
  source: Entity | undefined,
  destination: Entity | undefined,
  load: number | undefined,
): Map<string, number> {
  const deltas = new Map<string, number>();
  for (const [parent, sign] of [
    [source, -1],
    [destination, 1],
  ] as const) {
    if (!parent) continue;
    for (const ancestor of objectAncestors(world, parent.id)) {
      if (!ancestor.container) continue;
      if (load === undefined) throw new Error('This item has no admitted packing load for a bag.');
      deltas.set(ancestor.id, (deltas.get(ancestor.id) ?? 0) + sign * load);
    }
  }
  for (const [id, delta] of deltas) {
    const container = world.entities[id]!.container!;
    const definition = world.itemDefinitions[container.definitionPin.id];
    if (
      !definition?.container ||
      !sameDefinitionPin(definitionPin(definition), container.definitionPin) ||
      container.loadRevision !== container.subtreeRevision
    )
      throw new Error('Container capacity is unavailable.');
    const next = checked(container.load + delta, 'packing load');
    if (next > definition.container.capacity)
      throw new Error('The bag does not have enough packing capacity.');
    bump(container.subtreeRevision);
  }
  return deltas;
}
function publishDeltas(
  world: WorldState,
  deltas: Map<string, number>,
  direct: readonly (string | undefined)[],
) {
  for (const [id, delta] of deltas) {
    const container = world.entities[id]!.container!;
    container.load += delta;
    container.subtreeRevision = bump(container.subtreeRevision);
    container.loadRevision = container.subtreeRevision;
  }
  const affected = new Set<string>();
  for (const id of direct)
    if (id && world.entities[id])
      for (const ancestor of objectAncestors(world, id)) affected.add(ancestor.id);
  // Inner summaries first; whole-root movement never visits the moved subtree.
  const ordered = [...affected].sort(
    (a, b) => objectAncestors(world, b).length - objectAncestors(world, a).length,
  );
  for (const id of ordered) {
    const entity = world.entities[id]!;
    entity.inventoryRevision = bump(entity.inventoryRevision ?? 0);
    recordSemanticChange(world, { kind: 'membership', family: 'direct-contents', scopeId: id });
    if (entity.container) {
      if (!deltas.has(id)) {
        entity.container.subtreeRevision = bump(entity.container.subtreeRevision);
        entity.container.loadRevision = entity.container.subtreeRevision;
      }
      const index = indexFor(world);
      entity.container.height = objectIndexGet(index.children, id)?.maximum ?? 0;
      const parent = parentOf(entity);
      if (parent)
        index.children = objectIndexSet(
          index.children,
          parent,
          objectIndexSet(objectIndexGet(index.children, parent), id, 1 + entity.container.height),
        );
    }
  }
}
/** A hold changes the availability exposed by a contents page without changing
 * quantity or placement. Reuse the same ancestor revision owner for live cursors. */
export function itemAvailabilityChanged(world: WorldState, id: string): void {
  const entity = world.entities[id];
  if (entity?.item && !entity.retirement) publishDeltas(world, new Map(), [parentOf(entity)]);
}
function historicalCustodian(world: WorldState, id: string): string | null {
  const root = custodian(world, id);
  return world.entities[root]?.actor ? root : null;
}
function lineage(
  world: WorldState,
  type: ObjectLineage['type'],
  sourceId: string,
  quantity: number,
  cause: string,
  targetId?: string,
) {
  const source = world.entities[sourceId]!,
    pin = source.item?.unitPin ?? ITEM_COUNT_PIN;
  const id = nextId(world, 'object-history');
  (world.objectLineage ??= {})[id] = {
    id,
    type,
    sourceId,
    ...(targetId ? { targetId } : {}),
    quantity,
    cause,
    at: world.simTime,
    unitPin: { ...pin },
    custodianId: historicalCustodian(world, sourceId),
  };
}
export function mergeCompatible(world: WorldState, aId: string, bId: string): boolean {
  const a = world.entities[aId],
    b = world.entities[bId],
    first = a?.item,
    second = b?.item;
  return (
    !!first &&
    !!second &&
    first.individuality === 'homogeneous' &&
    second.individuality === 'homogeneous' &&
    !a.container &&
    !b.container &&
    !lotCarriesState(a) &&
    !lotCarriesState(b) &&
    !contributionSourceBound(world, aId) &&
    !contributionSourceBound(world, bId) &&
    a.placement?.mode === 'contained' &&
    b.placement?.mode === 'contained' &&
    !itemHasReservations(world, aId) &&
    !itemHasReservations(world, bId) &&
    sameDefinitionPin(first.definitionPin, second.definitionPin) &&
    sameDefinitionPin(first.unitPin, second.unitPin) &&
    canonicalJson(a.declaredOwner ?? null) === canonicalJson(b.declaredOwner ?? null) &&
    !identityBound(world, aId) &&
    !identityBound(world, bId)
  );
}
/** V1 has no homogeneous codec for per-instance state. Preserve it on whole moves;
 * splitting/merging requires a future family's explicit equivalence/rebinding rule. */
function lotCarriesState(entity: Entity): boolean {
  return !!(
    Object.keys(entity.attributes ?? {}).length ||
    Object.keys(entity.mechanismFields ?? {}).length ||
    Object.keys(entity.statusEffects ?? {}).length
  );
}
/** Native process references bind possessions of their acting custodian. Other processes
 * must hold quantities through P1; neither route permits silent identity rebinding. */
function identityBound(world: WorldState, id: string): boolean {
  const action = world.entities[custodian(world, id)]?.actor?.action;
  return (
    (!!action && [action.itemId, action.weaponItemId, action.ammoItemId].includes(id)) ||
    Object.values(world.entities[id]?.statusEffects ?? {}).some((state) => state.active)
  );
}
export function canReceiveSource(world: WorldState, id: string, definitionId: string): boolean {
  const entity = world.entities[id],
    lot = entity?.item,
    definition = world.itemDefinitions[definitionId];
  return (
    !!lot &&
    !!definition &&
    lot.individuality === 'homogeneous' &&
    !entity.container &&
    !lotCarriesState(entity) &&
    !contributionSourceBound(world, id) &&
    !entity.declaredOwner &&
    entity.placement?.mode === 'contained' &&
    sameDefinitionPin(lot.definitionPin, definitionPin(definition)) &&
    sameDefinitionPin(lot.unitPin, ITEM_COUNT_PIN) &&
    !itemHasReservations(world, id) &&
    !identityBound(world, id)
  );
}
/** Trusted source/crafting callers already own admission and the domain draft. */
export function createItemLot(
  world: WorldState,
  parentId: string,
  definitionId: string,
  quantity: number,
  id = nextId(world, 'item'),
): string {
  const definition = getOwn(world.itemDefinitions, definitionId),
    parent = getOwn(world.entities, parentId);
  if (
    !isSafeRecordId(id) ||
    !definition ||
    !parent ||
    !(parent.actor || parent.kind === 'item-pile' || parent.container) ||
    !quantity ||
    checked(quantity) !== quantity ||
    getOwn(world.entities, id)
  )
    throw new Error('Invalid object source, identity, quantity or destination.');
  if (definition.container && quantity !== 1)
    throw new Error('Each bag must have its own identity.');
  const ancestors = objectAncestors(world, parentId);
  if (
    ancestors.length > MAX_CONTAINMENT_DEPTH ||
    ancestors.some(
      (ancestor, index) =>
        ancestor.container &&
        index + 1 >
          world.itemDefinitions[ancestor.container.definitionPin.id]!.container!.maximumDepth,
    )
  )
    throw new Error('This destination exceeds the admitted nesting depth.');
  const pin = definitionPin(definition);
  const lot: ItemLot = {
    definitionPin: pin,
    unitPin: { ...ITEM_COUNT_PIN },
    quantity,
    revision: 0,
    individuality: definition.container ? 'individual' : 'homogeneous',
  };
  const deltas = ancestorDeltas(world, undefined, parent, ownLoad(world, lot));
  // Build before inserting, then update only the direct membership paths.
  indexFor(world);
  world.entities[id] = {
    id,
    kind: 'item',
    name: definition.name,
    placement: { mode: 'contained', parentEntityId: parentId, revision: 0 },
    spatial: groundedSpatial('object'),
    item: lot,
    ...(definition.container
      ? {
          container: {
            definitionPin: pin,
            subtreeRevision: 0,
            load: 0,
            loadRevision: 0,
            height: 0,
          },
        }
      : {}),
  };
  reindex(world, id, undefined, parentId);
  publishDeltas(world, deltas, [parentId]);
  return id;
}
interface QuantityChange {
  id: string;
  quantity: number;
}
function quantityPlan(world: WorldState, changes: readonly QuantityChange[]) {
  const deltas = new Map<string, number>(),
    parents = new Set<string>();
  const seen = new Set<string>();
  for (const { id, quantity } of changes) {
    if (seen.has(id)) throw new Error('Duplicate quantity destination.');
    seen.add(id);
    checked(quantity);
    const entity = world.entities[id],
      lot = entity?.item;
    if (!entity || !lot) throw new Error('Object is unavailable.');
    if (lot.individuality === 'individual' && quantity > 1)
      throw new Error('An individual object has one unit.');
    if (quantity === lot.quantity) continue;
    bump(lot.revision);
    if (!quantity && !directChildIds(world, id).next().done)
      throw new Error('Empty this container before retiring it.');
    if (
      !quantity &&
      [entity.attributes, entity.mechanismFields, entity.statusEffects].some(
        (component) => component && Object.keys(component).length,
      )
    )
      throw new Error('This object has active state requiring its own retirement operation.');
    const parentId = parentOf(entity);
    if (!parentId) throw new Error('Item custody is unavailable.');
    parents.add(parentId);
    const load = ownLoad(world, { ...lot, quantity: Math.abs(quantity - lot.quantity) });
    for (const ancestor of objectAncestors(world, parentId))
      if (ancestor.container) {
        if (load === undefined) throw new Error('Packing compatibility is unavailable.');
        deltas.set(
          ancestor.id,
          (deltas.get(ancestor.id) ?? 0) + Math.sign(quantity - lot.quantity) * load,
        );
      }
  }
  for (const [id, delta] of deltas) {
    const container = world.entities[id]!.container!,
      rule = world.itemDefinitions[container.definitionPin.id]?.container;
    if (
      !rule ||
      container.loadRevision !== container.subtreeRevision ||
      checked(container.load + delta) > rule.capacity
    )
      throw new Error('The bag does not have enough packing capacity.');
    bump(container.subtreeRevision);
  }
  return { deltas, parents: [...parents] };
}
export function validateItemQuantityChanges(
  world: WorldState,
  changes: readonly QuantityChange[],
): string | undefined {
  try {
    quantityPlan(world, changes);
    return undefined;
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return error instanceof Error ? error.message : 'Item quantities unavailable.';
  }
}
/** Called by the P1 phase publisher after all coupled debits/credits have been admitted. */
export function applyItemQuantities(
  world: WorldState,
  changes: readonly QuantityChange[],
  cause: string,
): void {
  changeItemQuantities(world, changes, cause, 'consume');
}
function changeItemQuantities(
  world: WorldState,
  changes: readonly QuantityChange[],
  cause: string,
  history: 'consume' | 'split',
): void {
  if (!changes.length) return;
  const plan = quantityPlan(world, changes);
  // Claim planning still sees its own hold. Check backing only at publication,
  // after the claim owner settles consumption, including direct edits/retirement.
  // archive/07-technical-architecture/world-module-runtime.md#5-effects-ownership-and-deterministic-composition
  if (world.resourceReservations)
    for (const { id, quantity } of changes) {
      const lot = world.entities[id]!.item!;
      if (quantity < lot.quantity)
        assertReservedStock(
          world,
          { kind: 'item', itemId: id, definition: lot.definitionPin },
          quantity,
          0,
        );
    }
  for (const { id, quantity } of changes) {
    const entity = world.entities[id]!,
      lot = entity.item!;
    if (lot.quantity === quantity) continue;
    if (quantity) {
      if (history === 'consume' && quantity < lot.quantity)
        lineage(world, 'consume', id, lot.quantity - quantity, cause);
      lot.quantity = quantity;
      lot.revision = bump(lot.revision);
    } else {
      const parentId = parentOf(entity),
        parent = getOwn(world.entities, parentId);
      lineage(world, 'consume', id, lot.quantity, cause);
      if (parent?.actor?.equippedItemId === id) parent.actor.equippedItemId = null;
      entity.retirement = {
        custodianId: historicalCustodian(world, id),
        at: world.simTime,
        cause,
        definitionPin: { ...lot.definitionPin },
        quantity: lot.quantity,
      };
      reindex(world, id, parentId, undefined);
      delete entity.item;
      delete entity.container;
      delete entity.placement;
    }
  }
  publishDeltas(world, plan.deltas, plan.parents);
}
export function retireItem(world: WorldState, id: string, cause: string): void {
  applyItemQuantities(world, [{ id, quantity: 0 }], cause);
}
export function setItemQuantity(
  world: WorldState,
  id: string,
  quantity: number,
  cause: string,
): void {
  applyItemQuantities(world, [{ id, quantity }], cause);
}
export function splitLot(world: WorldState, id: string, quantity: number, cause: string): string {
  return splitHomogeneousLot(world, id, quantity, cause, 'live');
}
function splitHomogeneousLot(
  world: WorldState,
  id: string,
  quantity: number,
  cause: string,
  mode: 'live' | 'migration',
): string {
  const entity = world.entities[id],
    lot = entity?.item,
    parentId = parentOf(entity),
    action = parentId && world.entities[parentId]?.actor?.action;
  // The checked legacy equipment conversion alone rebinds a running weapon to
  // its individualized unit. Ordinary splits cannot redirect process identity.
  const migratingWeapon =
    mode === 'migration' &&
    action &&
    action.weaponItemId === id &&
    action.itemId !== id &&
    action.ammoItemId !== id;
  if (
    !lot ||
    !parentId ||
    entity!.container ||
    lotCarriesState(entity!) ||
    (identityBound(world, id) && !migratingWeapon) ||
    contributionSourceBound(world, id) ||
    lot.individuality !== 'homogeneous' ||
    quantity <= 0 ||
    quantity >= lot.quantity ||
    quantity > availableItemQuantity(world, id)
  )
    throw new Error('Choose free units from a homogeneous stack.');
  checked(quantity);
  const resultId = nextId(world, 'item');
  // Split preserves units; its one lineage row is published after the new identity exists.
  changeItemQuantities(world, [{ id, quantity: lot.quantity - quantity }], cause, 'split');
  createItemLot(world, parentId, lot.definitionPin.id, quantity, resultId);
  if (entity!.declaredOwner) world.entities[resultId]!.declaredOwner = { ...entity!.declaredOwner };
  lineage(world, 'split', id, quantity, cause, resultId);
  return resultId;
}
export function moveLot(
  world: WorldState,
  id: string,
  destinationId: string,
  quantity: number,
  cause: string,
  merge = true,
): string {
  const entity = world.entities[id],
    lot = entity?.item,
    sourceId = parentOf(entity),
    destination = world.entities[destinationId];
  if (
    !entity ||
    !lot ||
    !sourceId ||
    !destination ||
    !(destination.actor || destination.kind === 'item-pile' || destination.container)
  )
    throw new Error('Item or destination unavailable.');
  if (quantity <= 0 || checked(quantity) > availableItemQuantity(world, id))
    throw new Error('That quantity is unavailable or reserved.');
  if (sourceId === destinationId) return id;
  if (quantity === lot.quantity && identityBound(world, id))
    throw new Error('This object is bound to running work. Finish or cancel that work first.');
  const ancestors = objectAncestors(world, destinationId);
  if (
    ancestors.some((value) => value.id === id) ||
    ancestors.length + (entity.container?.height ?? 0) > MAX_CONTAINMENT_DEPTH
  )
    throw new Error('A bag cannot contain itself or exceed the nesting limit.');
  if (quantity !== lot.quantity && (entity.container || lot.individuality === 'individual'))
    throw new Error('An individual object cannot be divided.');
  for (let i = 0; i < ancestors.length; i++) {
    const enclosing = ancestors[i]!,
      rule =
        enclosing.container &&
        world.itemDefinitions[enclosing.container.definitionPin.id]?.container;
    if (rule && i + 1 + (entity.container?.height ?? 0) > rule.maximumDepth)
      throw new Error('This bag cannot accept that nesting depth.');
  }
  const load =
    quantity === lot.quantity ? subtreeLoad(world, entity) : ownLoad(world, { ...lot, quantity });
  const deltas = ancestorDeltas(world, world.entities[sourceId], destination, load);
  let target: string | undefined;
  if (merge && lot.individuality === 'homogeneous' && !entity.container)
    for (const otherId of directChildIds(world, destinationId))
      if (mergeCompatible(world, id, otherId)) {
        target = otherId;
        break;
      }
  if (target) checked(world.entities[target]!.item!.quantity + quantity);
  const movedId = quantity === lot.quantity ? id : splitLot(world, id, quantity, cause);
  const moved = world.entities[movedId]!,
    moving = moved.item!;
  if (world.entities[sourceId]?.actor?.equippedItemId === movedId)
    world.entities[sourceId]!.actor!.equippedItemId = null;
  moving.revision = bump(moving.revision);
  moved.placement = {
    mode: 'contained',
    parentEntityId: destinationId,
    revision: bump(moved.placement!.revision),
  };
  reindex(world, movedId, sourceId, destinationId);
  publishDeltas(world, deltas, [sourceId, destinationId]);
  if (target) {
    // The move accounted for the net capacity; merge changes identity, never total load.
    const survivor = world.entities[target]!.item!;
    survivor.quantity += quantity;
    survivor.revision = bump(survivor.revision);
    lineage(world, 'merge', movedId, quantity, cause, target);
    moved.retirement = {
      custodianId: historicalCustodian(world, movedId),
      at: world.simTime,
      cause,
      definitionPin: { ...moving.definitionPin },
      quantity,
    };
    reindex(world, movedId, destinationId, undefined);
    delete moved.item;
    delete moved.placement;
    return target;
  }
  return movedId;
}
export function equipLot(
  world: WorldState,
  actorId: string,
  id: string,
  cause: string,
  mode: 'live' | 'migration' = 'live',
): string {
  const actor = world.entities[actorId]?.actor,
    entity = world.entities[id],
    lot = entity?.item;
  if (
    !actor ||
    !lot ||
    parentOf(entity) !== actorId ||
    (mode === 'live' && (actor.action || itemHasReservations(world, id)))
  )
    throw new Error('Choose a free tool in this inventory.');
  if (
    mode === 'migration' &&
    lot.quantity > 1 &&
    (actor.action?.itemId === id ||
      actor.action?.ammoItemId === id ||
      availableItemQuantity(world, id) < 1)
  )
    throw new Error('Equipped stack has an unsupported active reference; conversion refused.');
  const definition = world.itemDefinitions[lot.definitionPin.id];
  if (!definition?.launcher && !definition?.gatheringTool)
    throw new Error('This item has no equipment capability.');
  const previous = actor.equippedItemId ? world.entities[actor.equippedItemId] : undefined;
  if (previous?.placement?.mode === 'attached')
    previous.placement = {
      mode: 'contained',
      parentEntityId: actorId,
      revision: bump(previous.placement.revision),
    };
  const equippedId = lot.quantity > 1 ? splitHomogeneousLot(world, id, 1, cause, mode) : id;
  const equipped = world.entities[equippedId]!;
  equipped.item!.individuality = 'individual';
  equipped.item!.revision = bump(equipped.item!.revision);
  equipped.placement = {
    mode: 'attached',
    parentEntityId: actorId,
    portId: 'equipment',
    revision: bump(equipped.placement!.revision),
  };
  actor.equippedItemId = equippedId;
  publishDeltas(world, new Map(), [actorId]);
  return equippedId;
}
export function validateObjects(world: WorldState): void {
  const slots = new Set<string>();
  if (
    !world.objectState ||
    !Number.isSafeInteger(world.objectState.revision) ||
    world.objectState.revision < 0
  )
    throw new Error('Invalid object membership revision.');
  for (const entity of Object.values(world.entities)) {
    if (
      !isSafeRecordId(entity.id) ||
      getOwn(world.entities, entity.id) !== entity ||
      (entity.inventoryRevision !== undefined &&
        (!Number.isSafeInteger(entity.inventoryRevision) || entity.inventoryRevision < 0))
    )
      throw new Error('Invalid object identity or inventory revision.');
    const declaration = entity.declaredOwner;
    if (
      declaration &&
      (!hasRecordFields(declaration, ['holderId', 'sourceId', 'revision', 'disclosure']) ||
        (declaration.holderId !== null && !isSafeRecordId(declaration.holderId)) ||
        !isSafeRecordId(declaration.sourceId) ||
        !Number.isSafeInteger(declaration.revision) ||
        declaration.revision <= 0 ||
        !['custodian', 'public'].includes(declaration.disclosure))
    )
      throw new Error('Invalid ownership declaration.');
    if (entity.retirement) {
      const retired = entity.retirement;
      if (
        entity.item ||
        entity.placement ||
        entity.container ||
        !hasRecordFields(retired, ['at', 'cause', 'definitionPin', 'quantity'], ['custodianId']) ||
        (retired.custodianId != null && !isSafeRecordId(retired.custodianId)) ||
        !Number.isFinite(retired.at) ||
        retired.at < 0 ||
        !Number.isSafeInteger(retired.quantity) ||
        retired.quantity <= 0 ||
        typeof retired.cause !== 'string' ||
        !sameDefinitionPin(
          retired.definitionPin,
          definitionPin(world.itemDefinitions[retired.definitionPin.id]!),
        )
      )
        throw new Error('Invalid retired object.');
      continue;
    }
    const placement = entity.placement;
    if (
      !placement ||
      !Number.isSafeInteger(placement.revision) ||
      placement.revision < 0 ||
      !['world', 'contained', 'attached'].includes(placement.mode)
    )
      throw new Error('Invalid physical placement.');
    const ancestors = objectAncestors(world, entity.id);
    if (
      !hasRecordFields(
        placement,
        placement.mode === 'world'
          ? ['mode', 'position', 'supportSurfaceId', 'revision']
          : placement.mode === 'attached'
            ? ['mode', 'parentEntityId', 'portId', 'revision']
            : ['mode', 'parentEntityId', 'revision'],
      )
    )
      throw new Error('Conflicting physical placement fields.');
    if (placement.mode !== 'world') {
      if (!entity.item || !isSafeRecordId(placement.parentEntityId))
        throw new Error('Only admitted item entities may be contained.');
      const parent = ancestors[1];
      if (!parent || !(parent.actor || parent.kind === 'item-pile' || parent.container))
        throw new Error('Invalid physical container.');
      if (placement.mode === 'attached') {
        const key = `${placement.parentEntityId}:${placement.portId}`;
        if (
          placement.portId !== 'equipment' ||
          slots.has(key) ||
          parent.actor?.equippedItemId !== entity.id ||
          entity.item.individuality !== 'individual'
        )
          throw new Error('Invalid equipment attachment.');
        slots.add(key);
      }
    }
    const lot = entity.item;
    if (!lot) continue;
    if (
      !hasRecordFields(lot, ['definitionPin', 'unitPin', 'quantity', 'individuality', 'revision'])
    )
      throw new Error('Unsupported lot state.');
    const definition = world.itemDefinitions[lot.definitionPin.id];
    if (
      !definition ||
      !sameDefinitionPin(definitionPin(definition), lot.definitionPin) ||
      !sameDefinitionPin(lot.unitPin, ITEM_COUNT_PIN) ||
      !Number.isSafeInteger(lot.quantity) ||
      lot.quantity <= 0 ||
      !Number.isSafeInteger(lot.revision) ||
      lot.revision < 0 ||
      !['individual', 'homogeneous'].includes(lot.individuality) ||
      (lot.individuality === 'individual' && lot.quantity !== 1)
    )
      throw new Error('Invalid lot identity, quantity or exact definition.');
    if (entity.container) {
      if (
        !hasRecordFields(entity.container, [
          'definitionPin',
          'subtreeRevision',
          'load',
          'loadRevision',
          'height',
        ]) ||
        !Number.isSafeInteger(entity.container.subtreeRevision) ||
        entity.container.subtreeRevision < 0 ||
        !Number.isSafeInteger(entity.container.height) ||
        entity.container.height < 0 ||
        !Number.isSafeInteger(entity.container.load) ||
        entity.container.load < 0
      )
        throw new Error('Invalid container summary.');
      if (
        !definition.container ||
        lot.individuality !== 'individual' ||
        !sameDefinitionPin(entity.container.definitionPin, lot.definitionPin)
      )
        throw new Error('Invalid container definition.');
      let load = 0,
        height = 0;
      for (const childId of directChildIds(world, entity.id)) {
        const child = world.entities[childId]!;
        height = Math.max(height, 1 + (child.container?.height ?? 0));
        const childLoad = subtreeLoad(world, child);
        if (childLoad === undefined) throw new Error('Unknown packing load in container.');
        load = checked(load + childLoad);
      }
      if (
        height !== entity.container.height ||
        height > definition.container.maximumDepth ||
        load !== entity.container.load ||
        load > definition.container.capacity ||
        entity.container.loadRevision !== entity.container.subtreeRevision
      )
        throw new Error('Container load summary is inconsistent.');
    }
  }
  for (const entity of Object.values(world.entities))
    if (entity.actor?.equippedItemId) {
      const equipped = getOwn(world.entities, entity.actor.equippedItemId);
      if (
        equipped?.placement?.mode !== 'attached' ||
        equipped.placement.parentEntityId !== entity.id ||
        !equipped.item
      )
        throw new Error('Equipment refers to an unavailable attachment.');
    }
  for (const [id, record] of Object.entries(world.objectLineage ?? {})) {
    if (
      !hasRecordFields(
        record,
        ['id', 'at', 'cause', 'type', 'sourceId', 'quantity', 'unitPin'],
        ['targetId', 'custodianId'],
      ) ||
      (record.custodianId != null && !isSafeRecordId(record.custodianId)) ||
      id !== record.id ||
      !isSafeRecordId(id) ||
      !isSafeRecordId(record.sourceId) ||
      (record.targetId !== undefined && !isSafeRecordId(record.targetId)) ||
      !['split', 'merge', 'consume'].includes(record.type) ||
      !Number.isFinite(record.at) ||
      record.at < 0 ||
      !Number.isSafeInteger(record.quantity) ||
      record.quantity <= 0 ||
      !sameDefinitionPin(record.unitPin, ITEM_COUNT_PIN) ||
      typeof record.cause !== 'string'
    )
      throw new Error('Invalid object lineage.');
  }
}

export function declareObjectOwner(
  world: WorldState,
  id: string,
  expectedRevision: number,
  holderId: string | null,
  disclosure: DeclaredOwner['disclosure'],
  sourceId: string,
): void {
  const entity = getOwn(world.entities, id);
  if (
    !entity?.item ||
    entity.retirement ||
    (entity.declaredOwner?.revision ?? 0) !== expectedRevision ||
    (holderId && !getOwn(world.entities, holderId))
  )
    throw new Error('Ownership declaration or holder changed.');
  if (!isSafeRecordId(sourceId) || !['custodian', 'public'].includes(disclosure))
    throw new Error('Invalid ownership declaration.');
  entity.declaredOwner = { holderId, disclosure, sourceId, revision: bump(expectedRevision) };
  const parent = parentOf(entity);
  if (parent) publishDeltas(world, new Map(), [parent]);
}

export function mergeLots(
  world: WorldState,
  sourceId: string,
  targetId: string,
  cause: string,
): string {
  const source = world.entities[sourceId],
    target = world.entities[targetId];
  if (
    sourceId === targetId ||
    !source?.item ||
    !target?.item ||
    parentOf(source) !== parentOf(target) ||
    !mergeCompatible(world, sourceId, targetId)
  )
    throw new Error('These lots are not equivalent free objects in the same container.');
  const quantity = source.item.quantity,
    total = checked(target.item.quantity + quantity);
  bump(target.item.revision);
  lineage(world, 'merge', sourceId, quantity, cause, targetId);
  source.retirement = {
    custodianId: historicalCustodian(world, sourceId),
    at: world.simTime,
    cause,
    definitionPin: { ...source.item.definitionPin },
    quantity,
  };
  const parent = parentOf(source);
  reindex(world, sourceId, parent, undefined);
  delete source.item;
  delete source.placement;
  target.item.quantity = total;
  target.item.revision = bump(target.item.revision);
  publishDeltas(world, new Map(), [parent]);
  return targetId;
}
export function unequipLot(world: WorldState, actorId: string): void {
  const actor = world.entities[actorId]?.actor;
  if (!actor?.equippedItemId) return;
  const item = world.entities[actor.equippedItemId];
  if (!item?.item || itemHasReservations(world, item.id) || actor.action)
    throw new Error('Finish current work before releasing this equipment.');
  item.placement = {
    mode: 'contained',
    parentEntityId: actorId,
    revision: bump(item.placement!.revision),
  };
  actor.equippedItemId = null;
  publishDeltas(world, new Map(), [actorId]);
}
