import { recordSemanticChange } from './dependencies.js';
import { chargeWork, requireAllocation, requireWork, WORK_LIMITS } from './work-budget.js';
import {
  itemAvailabilityChanged,
  itemFor,
  applyItemQuantities,
  validateItemQuantityChanges,
} from './objects.js';
import { current, isDraft, original } from 'immer';
import { canonicalJson } from './events.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { isDefinitionPin, readState, sameDefinitionPin, writeState } from './state-owners.js';
import { cloneValue } from './draft.js';
import { attributeDefinition, definitionPin, type DefinitionPin } from './world-modules.js';
import type { ItemDefinition, WorldEvent, WorldState } from './types.js';

/** Closed native resource ports. A display unit never establishes compatibility. */
export type ResourceRef =
  | { kind: 'attribute'; entityId: string; definition: DefinitionPin }
  | { kind: 'replenisher'; entityId: string; definition: DefinitionPin }
  | { kind: 'gathering'; entityId: string; definition: DefinitionPin }
  | { kind: 'item'; itemId: string; definition: DefinitionPin };
export interface ResourceReservation {
  /** Older canonical holds may lack claimant evidence; never infer private ownership. */
  actorId?: string;
  requestDigest: string;
  id: string;
  invocationId: string;
  resource: ResourceRef;
  amount: number;
  revision: number;
  state: 'held' | 'consumed' | 'released';
  expiresAt?: number;
}
export interface ResourceOperation {
  source: ResourceRef;
  sourceRevision: number;
  destination?: ResourceRef;
  destinationRevision?: number;
  amount: number;
  reservationId?: string;
}
export interface ResourceGroup {
  invocationId: string;
  fulfillment: 'all-or-nothing' | 'bounded-partial';
  operations: readonly ResourceOperation[];
}
export type ResourceFailure =
  | 'invalid'
  | 'stale'
  | 'unavailable'
  | 'incompatible'
  | 'insufficient'
  | 'unsupported';
export type ResourceResult = { status: 'applied'; amounts: number[] } | { status: ResourceFailure };
export interface ResourceStock {
  value: number;
  minimum: number;
  maximum: number;
  revision: number;
  precision: 'whole' | 'native-continuous';
}
interface ResourceLedger {
  debits: Map<string, number>;
  freeDebits: Map<string, number>;
  credits: Map<string, number>;
  writes: Map<string, { ref: ResourceRef; stock: ResourceStock; value: number }>;
  holds: Map<string, number>;
}
interface ResourcePlan extends ResourceLedger {
  status: 'planned';
  amounts: number[];
}

export function isResourceRef(value: unknown): value is ResourceRef {
  if (
    !hasRecordFields(value, ['kind', 'definition'], ['entityId', 'itemId']) ||
    !isDefinitionPin(value.definition)
  )
    return false;
  return value.kind === 'item'
    ? hasRecordFields(value, ['kind', 'definition', 'itemId']) && isSafeRecordId(value.itemId)
    : ['attribute', 'replenisher', 'gathering'].includes(value.kind as string) &&
        hasRecordFields(value, ['kind', 'definition', 'entityId']) &&
        isSafeRecordId(value.entityId);
}
function isResourceOperation(value: unknown): value is ResourceOperation {
  return (
    hasRecordFields(
      value,
      ['source', 'sourceRevision', 'amount'],
      ['destination', 'destinationRevision', 'reservationId'],
    ) &&
    isResourceRef(value.source) &&
    Number.isSafeInteger(value.sourceRevision) &&
    (value.sourceRevision as number) >= 0 &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    (value.destination === undefined
      ? value.destinationRevision === undefined
      : isResourceRef(value.destination) &&
        Number.isSafeInteger(value.destinationRevision) &&
        (value.destinationRevision as number) >= 0) &&
    (value.reservationId === undefined || isSafeRecordId(value.reservationId))
  );
}

export function itemDefinitionPin(definition: ItemDefinition): DefinitionPin {
  return definitionPin(definition);
}
export function resourceKey(ref: ResourceRef): string {
  return canonicalJson([ref.kind, ref.kind === 'item' ? ref.itemId : ref.entityId, ref.definition]);
}
export function readResource(world: WorldState, ref: ResourceRef): ResourceStock | undefined {
  if (ref.kind === 'item' || ref.kind === 'gathering') {
    const definition = getOwn(world.itemDefinitions, ref.definition.id);
    if (!definition || !sameDefinitionPin(itemDefinitionPin(definition), ref.definition)) return;
    const stock =
      ref.kind === 'item'
        ? itemFor(world, ref.itemId)
        : getOwn(world.entities, ref.entityId)?.resource;
    if (!stock || stock.definitionId !== definition.id) return;
    return {
      value: stock.quantity,
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      revision: stock.revision ?? 0,
      precision: 'whole',
    };
  }
  const definition = attributeDefinition(world, ref.definition.id);
  const pin = world.moduleManifest.pins.find((value) => value.id === ref.definition.id);
  if (
    !definition?.reservoir ||
    !pin ||
    !sameDefinitionPin(pin, ref.definition) ||
    definition.schema.kind !== 'number'
  )
    return;
  if (ref.kind === 'attribute') {
    const state = readState(world, { entityId: ref.entityId, definition: ref.definition }, 'owner');
    if (state.status !== 'known' || typeof state.value !== 'number') return;
    return {
      value: state.value,
      minimum: definition.schema.min,
      maximum: definition.schema.max,
      revision: state.revision,
      precision: 'native-continuous',
    };
  }
  const stock = getOwn(world.entities, ref.entityId)?.replenisher;
  if (!stock || stock.attributeId !== definition.id) return;
  return {
    value: stock.remaining,
    minimum: 0,
    maximum: 1e9,
    revision: stock.revision ?? 0,
    precision: 'native-continuous',
  };
}

const reservationIndexes = new WeakMap<
  NonNullable<WorldState['resourceReservations']>,
  {
    amounts: Map<string, number>;
    deadlines: Array<{ at: number; id: string; invocationId: string }>;
    invocations: Map<string, string[]>;
    allocation: ReservationAllocation;
  }
>();
const changedReservationIndexes = new WeakSet<object>();
const emptyReservationIndex = {
  amounts: new Map<string, number>(),
  deadlines: [] as Array<{ at: number; id: string; invocationId: string }>,
  invocations: new Map<string, string[]>(),
  allocation: emptyAllocation(),
};
type Occupancy = { live: number; retainedBytes: number };
interface ReservationAllocation {
  total: Occupancy;
  actors: Map<string, Occupancy>;
  modules: Map<string, Occupancy>;
  roots: Map<string, Occupancy>;
}
function emptyAllocation(): ReservationAllocation {
  return {
    total: { live: 0, retainedBytes: 0 },
    actors: new Map(),
    modules: new Map(),
    roots: new Map(),
  };
}
function holdOccupancy(hold: ResourceReservation): Occupancy {
  return {
    live: hold.state === 'held' ? 1 : 0,
    retainedBytes: JSON.stringify(hold).length * 3 + 256,
  };
}
function addOccupancy(target: Occupancy, value: Occupancy): void {
  target.live += value.live;
  target.retainedBytes += value.retainedBytes;
  if (!Number.isSafeInteger(target.live) || !Number.isSafeInteger(target.retainedBytes))
    throw new Error('Reservation allocation overflow.');
}
function accountHold(
  allocation: ReservationAllocation,
  hold: ResourceReservation,
  direction: 1 | -1 = 1,
): void {
  const value = holdOccupancy(hold);
  value.live *= direction;
  value.retainedBytes *= direction;
  addOccupancy(allocation.total, value);
  for (const [map, id] of [
    [allocation.actors, hold.actorId],
    [allocation.modules, hold.resource.definition.id],
    [allocation.roots, hold.invocationId],
  ] as const) {
    if (!id) continue;
    let current = map.get(id);
    if (!current) map.set(id, (current = { live: 0, retainedBytes: 0 }));
    addOccupancy(current, value);
  }
}
function writableReservationIndex(
  reservations: NonNullable<WorldState['resourceReservations']>,
  prior: typeof emptyReservationIndex,
): typeof emptyReservationIndex {
  const owns =
    changedReservationIndexes.has(reservations) && reservationIndexes.get(reservations) === prior;
  const copyCounts = (values: Map<string, Occupancy>) =>
    new Map([...values].map(([key, value]) => [key, { ...value }]));
  return owns
    ? prior
    : {
        amounts: new Map(prior.amounts),
        deadlines: [...prior.deadlines],
        invocations: new Map([...prior.invocations].map(([key, values]) => [key, [...values]])),
        allocation: {
          total: { ...prior.allocation.total },
          actors: copyCounts(prior.allocation.actors),
          modules: copyCounts(prior.allocation.modules),
          roots: copyCounts(prior.allocation.roots),
        },
      };
}
/** Consecutive admissions in one atomic draft extend owned metadata, rather than
 * serializing every retained receipt again for each new fractional hold. */
function indexNewReservation(
  world: WorldState,
  hold: ResourceReservation,
  prior: typeof emptyReservationIndex,
): void {
  const reservations = world.resourceReservations!;
  if (!isDraft(world)) return;
  const index = writableReservationIndex(reservations, prior);
  // Integer property names enumerate before other IDs; unknown ordering rebuilds.
  if (/^\d+$/.test(hold.id)) {
    invalidateReservationIndex(reservations);
    return;
  }
  const key = resourceKey(hold.resource);
  index.amounts.set(key, (index.amounts.get(key) ?? 0) + hold.amount);
  const owned = index.invocations.get(hold.invocationId) ?? [];
  owned.push(hold.id);
  index.invocations.set(hold.invocationId, owned);
  accountHold(index.allocation, hold);
  if (hold.expiresAt !== undefined) {
    const entry = { at: hold.expiresAt, id: hold.id, invocationId: hold.invocationId };
    let low = 0,
      high = index.deadlines.length;
    while (low < high) {
      const mid = (low + high) >>> 1,
        other = index.deadlines[mid]!;
      if (other.at < entry.at || (other.at === entry.at && other.id.localeCompare(entry.id) < 0))
        low = mid + 1;
      else high = mid;
    }
    index.deadlines.splice(low, 0, entry);
  }
  reservationIndexes.set(reservations, index);
  changedReservationIndexes.add(reservations);
}
export function captureReservationIndex(world: WorldState): (result: WorldState) => void {
  const records = world.resourceReservations;
  const index = records && reservationIndexes.get(records);
  return (result) => {
    if (index && result.resourceReservations)
      reservationIndexes.set(result.resourceReservations, index);
  };
}
/** Derived occupancy includes terminal receipts until their canonical owner supports
 * cold replay. Release cannot hide retained memory or refund cumulative execution. */
export function resourceReservationWork(world: WorldState): ReservationAllocation {
  return reservationIndex(world).allocation;
}
function invalidateReservationIndex(
  reservations: NonNullable<WorldState['resourceReservations']>,
): void {
  reservationIndexes.delete(reservations);
  changedReservationIndexes.add(reservations);
}
function reservationIndex(world: WorldState) {
  return reservationMapIndex(world.resourceReservations);
}
function reservationMapIndex(
  reservations: WorldState['resourceReservations'],
): typeof emptyReservationIndex {
  if (!reservations) return emptyReservationIndex;
  const cached = reservationIndexes.get(reservations);
  if (cached) return cached;
  if (isDraft(reservations) && !changedReservationIndexes.has(reservations)) {
    const index = reservationMapIndex(original(reservations));
    reservationIndexes.set(reservations, index);
    return index;
  }
  const amounts = new Map<string, number>();
  const deadlines: Array<{ at: number; id: string; invocationId: string }> = [];
  const invocations = new Map<string, string[]>();
  const allocation = emptyAllocation();
  for (const hold of Object.values(reservations)) {
    accountHold(allocation, hold);
    if (hold.state !== 'held') continue;
    const key = resourceKey(hold.resource);
    const total = (amounts.get(key) ?? 0) + hold.amount;
    if (!Number.isFinite(total)) throw new Error('Reservation quantity overflow.');
    amounts.set(key, total);
    const owned = invocations.get(hold.invocationId) ?? [];
    owned.push(hold.id);
    invocations.set(hold.invocationId, owned);
    if (hold.expiresAt !== undefined)
      deadlines.push({ at: hold.expiresAt, id: hold.id, invocationId: hold.invocationId });
  }
  deadlines.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const index = { amounts, deadlines, invocations, allocation };
  // Draft caches contain IDs/numbers only, never proxies; every reservation writer
  // updates or invalidates this index before publication. Mutable seed builders remain uncached.
  if (reservations && (isDraft(reservations) || Object.isFrozen(reservations)))
    reservationIndexes.set(reservations, index);
  return index;
}
function heldAmounts(world: WorldState): Map<string, number> {
  return reservationIndex(world).amounts;
}
export class ResourceReservationError extends Error {
  readonly code = 'resource-reserved';
  constructor() {
    super('This change would consume stock reserved by existing work.');
  }
}
/** Every stock writer, including creator edits and native rates, preserves admitted
 * holds. A claim publisher settles its own hold in the same draft before the debit. */
export function assertReservedStock(
  world: WorldState,
  ref: ResourceRef,
  value: number,
  minimum: number,
): void {
  if (
    world.resourceReservations &&
    value - minimum < (heldAmounts(world).get(resourceKey(ref)) ?? 0)
  )
    throw new ResourceReservationError();
}
export function availableResource(world: WorldState, ref: ResourceRef): number | undefined {
  const stock = readResource(world, ref);
  return stock
    ? Math.max(0, stock.value - stock.minimum - (heldAmounts(world).get(resourceKey(ref)) ?? 0))
    : undefined;
}
export function itemHasReservations(world: WorldState, itemId: string): boolean {
  if (!world.resourceReservations) return false;
  const item = itemFor(world, itemId);
  const definition = item && getOwn(world.itemDefinitions, item.definitionId);
  return (
    !!definition &&
    (heldAmounts(world).get(
      resourceKey({ kind: 'item', itemId, definition: itemDefinitionPin(definition) }),
    ) ?? 0) > 0
  );
}
export function availableItemQuantity(world: WorldState, itemId: string): number {
  const item = itemFor(world, itemId);
  if (!item) return 0;
  if (!world.resourceReservations) return item.quantity;
  const definition = getOwn(world.itemDefinitions, item.definitionId);
  return definition
    ? (availableResource(world, {
        kind: 'item',
        itemId,
        definition: itemDefinitionPin(definition),
      }) ?? 0)
    : 0;
}

/** Planning reads one start state; a coupled group cannot spend its own speculative
 * outputs. Holds are converted once, not deducted a second time from available stock.
 * docs/projects/shared-state-contributions-tech-design.md#5-execution-phases-and-deterministic-arbitration
 */
function planGroup(
  world: WorldState,
  group: ResourceGroup,
  accepted?: ResourceLedger,
): ResourcePlan | { status: ResourceFailure } {
  if (
    !hasRecordFields(group, ['invocationId', 'fulfillment', 'operations']) ||
    !isSafeRecordId(group.invocationId) ||
    !Array.isArray(group.operations) ||
    !group.operations.length ||
    group.operations.length > 256 ||
    !['all-or-nothing', 'bounded-partial'].includes(group.fulfillment) ||
    (group.fulfillment === 'bounded-partial' &&
      (group.operations.length !== 1 || !group.operations[0]?.destination))
  )
    return { status: 'invalid' };
  const held = heldAmounts(world);
  const debits = new Map(accepted?.debits);
  const freeDebits = new Map(accepted?.freeDebits);
  const credits = new Map(accepted?.credits);
  const writes = new Map([...(accepted?.writes ?? [])].map(([key, value]) => [key, { ...value }]));
  const holds = new Map(accepted?.holds);
  const amounts: number[] = [];
  for (const operation of group.operations) {
    if (!isResourceOperation(operation)) return { status: 'invalid' };
    const source = readResource(world, operation.source);
    const destination = operation.destination && readResource(world, operation.destination);
    if (!source || (operation.destination && !destination)) return { status: 'unavailable' };
    if (
      !Number.isSafeInteger(operation.sourceRevision) ||
      source.revision !== operation.sourceRevision ||
      (destination &&
        (!Number.isSafeInteger(operation.destinationRevision) ||
          destination.revision !== operation.destinationRevision))
    )
      return { status: 'stale' };
    if (
      !Number.isFinite(operation.amount) ||
      operation.amount <= 0 ||
      (source.precision === 'whole' && !Number.isSafeInteger(operation.amount))
    )
      return { status: 'invalid' };
    const sourceKey = resourceKey(operation.source);
    const destinationKey = operation.destination && resourceKey(operation.destination);
    if (
      operation.destination &&
      (sourceKey === destinationKey ||
        !sameDefinitionPin(operation.source.definition, operation.destination.definition) ||
        source.precision !== destination?.precision)
    )
      return { status: 'incompatible' };
    // Items are consumed or moved by their custody owner, never credited into a
    // retired identity. P3 supplies split/merge/placement, not a second balance.
    if (operation.destination?.kind === 'item' || operation.destination?.kind === 'gathering')
      return { status: 'incompatible' };
    const hold =
      operation.reservationId && getOwn(world.resourceReservations ?? {}, operation.reservationId);
    if (
      operation.reservationId &&
      (!hold ||
        hold.state !== 'held' ||
        hold.invocationId !== group.invocationId ||
        !Number.isSafeInteger(hold.revision + 1) ||
        resourceKey(hold.resource) !== sourceKey ||
        (hold.expiresAt !== undefined && world.simTime >= hold.expiresAt))
    )
      return { status: 'stale' };
    const alreadyDebited = debits.get(sourceKey) ?? 0;
    const available = hold
      ? Math.min(
          source.value - source.minimum - alreadyDebited,
          hold.amount - (holds.get(hold.id) ?? 0),
        )
      : Math.min(
          source.value - source.minimum - alreadyDebited,
          source.value -
            source.minimum -
            (held.get(sourceKey) ?? 0) -
            (freeDebits.get(sourceKey) ?? 0),
        );
    const capacity = destination
      ? destination.maximum - destination.value - (credits.get(destinationKey!) ?? 0)
      : Infinity;
    const amount =
      group.fulfillment === 'bounded-partial'
        ? Math.min(operation.amount, available, capacity)
        : operation.amount;
    if (amount <= 0 || amount > available || amount > capacity) return { status: 'insufficient' };
    const debit = alreadyDebited + amount;
    const credit = (credits.get(destinationKey ?? '') ?? 0) + amount;
    if (
      !Number.isFinite(debit) ||
      !Number.isFinite(credit) ||
      (source.precision === 'whole' &&
        (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)))
    )
      return { status: 'invalid' };
    debits.set(sourceKey, debit);
    if (hold) holds.set(hold.id, (holds.get(hold.id) ?? 0) + amount);
    else freeDebits.set(sourceKey, (freeDebits.get(sourceKey) ?? 0) + amount);
    if (!writes.has(sourceKey))
      writes.set(sourceKey, { ref: operation.source, stock: source, value: source.value });
    if (operation.destination && destination && destinationKey) {
      credits.set(destinationKey, credit);
      if (!writes.has(destinationKey))
        writes.set(destinationKey, {
          ref: operation.destination,
          stock: destination,
          value: destination.value,
        });
    }
    amounts.push(amount);
  }
  for (const [key, write] of writes) {
    write.value = write.stock.value - (debits.get(key) ?? 0) + (credits.get(key) ?? 0);
    if (
      !Number.isFinite(write.value) ||
      write.value < write.stock.minimum ||
      write.value > write.stock.maximum ||
      !Number.isSafeInteger(write.stock.revision + 1) ||
      (write.stock.precision === 'whole' && !Number.isSafeInteger(write.value))
    )
      return { status: 'invalid' };
  }
  if (
    validateItemQuantityChanges(
      world,
      [...writes.values()].flatMap(({ ref, value }) =>
        ref.kind === 'item' ? [{ id: ref.itemId, quantity: value }] : [],
      ),
    )
  )
    return { status: 'unsupported' };
  return { status: 'planned', amounts, writes, holds, debits, freeDebits, credits };
}

/** Callers provide already-admitted proposal order; clients cannot assign priority.
 * Every group reads this phase's start state. Only accepted claims enter the ledger,
 * and no group can spend speculative inflows from itself or another producer. */
export function applyResourcePhase(
  world: WorldState,
  phase: {
    id: 'native-action-inputs-v1' | 'declared-resource-transfers-v1';
    groups: readonly ResourceGroup[];
  },
  events: WorldEvent[],
): ResourceResult[] {
  if (
    !hasRecordFields(phase, ['id', 'groups']) ||
    !['native-action-inputs-v1', 'declared-resource-transfers-v1'].includes(phase.id) ||
    !Array.isArray(phase.groups) ||
    phase.groups.length > 256 ||
    new Set(phase.groups.map((group) => group?.invocationId)).size !== phase.groups.length
  )
    throw new Error('Invalid admitted resource phase.');
  chargeWork({
    claims: phase.groups.reduce(
      (sum, group) => sum + (Array.isArray(group?.operations) ? group.operations.length : 0),
      0,
    ),
    effects: phase.groups.length,
  });
  let accepted: ResourcePlan | undefined;
  const results: ResourceResult[] = [];
  for (const group of phase.groups) {
    const plan = planGroup(world, group, accepted);
    if (plan.status !== 'planned') results.push(plan);
    else {
      accepted = plan;
      results.push({ status: 'applied', amounts: plan.amounts });
    }
  }
  if (accepted) publishResourcePlan(world, accepted, events, phase.id);
  return results;
}

/** Native caller owns the draft, event/action outcome and durable receipt. Continuous
 * work persists action progress, avoiding a journal record for every integration step.
 */
export function applyResourceGroup(
  world: WorldState,
  group: ResourceGroup,
  events: WorldEvent[],
): ResourceResult {
  chargeWork({ claims: group?.operations?.length ?? 0, effects: 1 });
  const plan = planGroup(world, group);
  if (plan.status !== 'planned') return plan;
  publishResourcePlan(world, plan, events, group.invocationId);
  return { status: 'applied', amounts: plan.amounts };
}
function consumePlannedHolds(world: WorldState, plan: ResourcePlan): void {
  if (!plan.holds.size) return;
  // The plan already validated every claim. Release the consumed reservation in this
  // atomic draft before the owner checks the remaining backing stock.
  const reservations = world.resourceReservations!;
  const index = isDraft(world)
    ? writableReservationIndex(reservations, reservationIndex(world))
    : undefined;
  const continuous = new Set<string>(),
    ended = new Set<string>(),
    invocations = new Set<string>();
  for (const [id, amount] of plan.holds) {
    const hold = reservations[id]!;
    if (index) accountHold(index.allocation, hold, -1);
    hold.amount -= amount;
    hold.revision++;
    if (!hold.amount) hold.state = 'consumed';
    if (index) {
      accountHold(index.allocation, hold);
      const key = resourceKey(hold.resource);
      if (plan.writes.get(key)!.stock.precision === 'whole') {
        const remaining = index.amounts.get(key)! - amount;
        if (remaining) index.amounts.set(key, remaining);
        else index.amounts.delete(key);
      } else continuous.add(key);
      if (hold.state === 'consumed') {
        ended.add(id);
        invocations.add(hold.invocationId);
      }
    }
    // Keep contents cursors sensitive to reservation availability as well as quantity.
    if (hold.resource.kind === 'item') itemAvailabilityChanged(world, hold.resource.itemId);
  }
  if (index) {
    // Whole-unit subtraction is exact. Continuous sums retain canonical record
    // order rather than changing native floating-point behavior by subtraction.
    if (continuous.size) {
      for (const key of continuous) index.amounts.delete(key);
      const records = isDraft(reservations) ? current(reservations) : reservations;
      for (const hold of Object.values(records)) {
        if (hold.state !== 'held') continue;
        const key = resourceKey(hold.resource);
        if (continuous.has(key))
          index.amounts.set(key, (index.amounts.get(key) ?? 0) + hold.amount);
      }
    }
    for (const id of invocations) {
      const remaining = index.invocations.get(id)!.filter((holdId) => !ended.has(holdId));
      if (remaining.length) index.invocations.set(id, remaining);
      else index.invocations.delete(id);
    }
    if (ended.size) index.deadlines = index.deadlines.filter((entry) => !ended.has(entry.id));
    reservationIndexes.set(reservations, index);
    changedReservationIndexes.add(reservations);
  } else invalidateReservationIndex(reservations);
}
function publishResourcePlan(
  world: WorldState,
  plan: ResourcePlan,
  events: WorldEvent[],
  cause: string,
): void {
  consumePlannedHolds(world, plan);
  for (const { ref, stock, value } of plan.writes.values()) {
    recordSemanticChange(world, {
      kind: 'state',
      entityId: ref.kind === 'item' ? ref.itemId : ref.entityId,
      field: 'resource',
    });
    if (ref.kind === 'attribute') {
      const result = writeState(
        world,
        { entityId: ref.entityId, definition: ref.definition },
        stock.revision,
        { kind: 'replace', value },
        events,
        cause,
      );
      if (result.status !== 'applied' && result.status !== 'unchanged')
        throw new Error('Validated resource owner rejected publication.');
    } else if (ref.kind === 'replenisher') {
      const target = world.entities[ref.entityId]!.replenisher!;
      target.remaining = value;
      target.revision = stock.revision + 1;
    } else if (ref.kind === 'gathering') {
      const target = world.entities[ref.entityId]!.resource!;
      target.quantity = value;
      target.revision = stock.revision + 1;
    } else {
      // Item quantities publish together below, including net ancestor capacity.
    }
  }
  applyItemQuantities(
    world,
    [...plan.writes.values()].flatMap(({ ref, value }) =>
      ref.kind === 'item' ? [{ id: ref.itemId, quantity: value }] : [],
    ),
    cause,
  );
}

export function reserveResource(
  world: WorldState,
  request: Omit<ResourceReservation, 'state' | 'revision' | 'requestDigest'> & { actorId: string },
  expectedRevision: number,
): ResourceResult {
  if (
    !hasRecordFields(
      request,
      ['id', 'invocationId', 'actorId', 'resource', 'amount'],
      ['expiresAt'],
    ) ||
    !isResourceRef(request.resource)
  )
    return { status: 'invalid' };
  // A continuously draining native reserve cannot promise future stock. Until a
  // family admits a depletion/hold arbitration policy it is transferable, not holdable.
  if (
    request.resource.kind === 'attribute' &&
    (attributeDefinition(world, request.resource.definition.id)?.reservoir?.drainPerSecond ?? 0) > 0
  )
    return { status: 'unsupported' };
  const prior = getOwn(world.resourceReservations ?? {}, request.id);
  const requestDigest = canonicalJson({ ...request, expectedRevision });
  if (prior) {
    return prior.requestDigest === requestDigest
      ? { status: 'applied', amounts: [request.amount] }
      : { status: 'stale' };
  }
  if (
    !isSafeRecordId(request.id) ||
    !isSafeRecordId(request.actorId) ||
    !isSafeRecordId(request.invocationId) ||
    (request.expiresAt !== undefined &&
      (!Number.isFinite(request.expiresAt) || request.expiresAt <= world.simTime))
  )
    return { status: 'invalid' };
  const actor = world.entities[request.actorId];
  if (
    !actor?.actor ||
    actor.retirement ||
    !actor.actor.alive ||
    (actor.actor.action?.id !== request.invocationId &&
      world.workState?.invocations[request.invocationId]?.actorId !== request.actorId)
  )
    return { status: 'unavailable' };
  const plan = planGroup(world, {
    invocationId: request.invocationId,
    fulfillment: 'all-or-nothing',
    operations: [
      { source: request.resource, sourceRevision: expectedRevision, amount: request.amount },
    ],
  });
  if (plan.status !== 'planned') return plan;
  const hold: ResourceReservation = {
    ...request,
    requestDigest,
    resource: cloneValue(request.resource),
    revision: 1,
    state: 'held',
  };
  const allocation = holdOccupancy(hold);
  requireAllocation(world, request.actorId, request.resource.definition.id, allocation);
  const root = resourceReservationWork(world).roots.get(request.invocationId) ?? {
    live: 0,
    retainedBytes: 0,
  };
  requireWork(
    {
      live: root.live + allocation.live,
      retainedBytes: root.retainedBytes + allocation.retainedBytes,
    },
    WORK_LIMITS.group,
  );
  chargeWork({ claims: 1, effects: 1, retainedBytes: allocation.retainedBytes });
  const index = reservationIndex(world);
  (world.resourceReservations ??= {})[request.id] = hold;
  indexNewReservation(world, hold, index);
  if (request.resource.kind === 'item') itemAvailabilityChanged(world, request.resource.itemId);
  recordSemanticChange(world, {
    kind: 'state',
    entityId:
      request.resource.kind === 'item' ? request.resource.itemId : request.resource.entityId,
    field: 'resource',
  });
  return { status: 'applied', amounts: [request.amount] };
}

export function releaseResource(world: WorldState, id: string, invocationId: string): boolean {
  const hold = getOwn(world.resourceReservations ?? {}, id);
  if (!hold || hold.invocationId !== invocationId) return false;
  if (hold.state === 'held') {
    if (!Number.isSafeInteger(hold.revision + 1))
      throw new Error('Reservation revision exhausted.');
    hold.state = 'released';
    hold.revision++;
    if (hold.resource.kind === 'item') itemAvailabilityChanged(world, hold.resource.itemId);
    recordSemanticChange(world, {
      kind: 'state',
      entityId: hold.resource.kind === 'item' ? hold.resource.itemId : hold.resource.entityId,
      field: 'resource',
    });
    invalidateReservationIndex(world.resourceReservations!);
  }
  return true;
}
export function releaseInvocationResources(world: WorldState, invocationId: string): void {
  if (!world.resourceReservations) return;
  for (const id of reservationIndex(world).invocations.get(invocationId) ?? [])
    releaseResource(world, id, invocationId);
}
export function validateResourceReservations(world: WorldState): void {
  const totals = new Map<string, number>();
  for (const [id, hold] of Object.entries(world.resourceReservations ?? {})) {
    if (
      !hasRecordFields(
        hold,
        ['id', 'invocationId', 'resource', 'amount', 'requestDigest', 'revision', 'state'],
        ['expiresAt', 'actorId'],
      ) ||
      id !== hold.id ||
      !isSafeRecordId(id) ||
      !isSafeRecordId(hold.invocationId) ||
      (hold.actorId !== undefined &&
        (!isSafeRecordId(hold.actorId) || !world.entities[hold.actorId]?.actor)) ||
      !isResourceRef(hold.resource) ||
      typeof hold.requestDigest !== 'string' ||
      !['held', 'released', 'consumed'].includes(hold.state) ||
      !Number.isSafeInteger(hold.revision) ||
      hold.revision < 1 ||
      !Number.isFinite(hold.amount) ||
      hold.amount < 0 ||
      (hold.state === 'held' && hold.amount === 0) ||
      (hold.expiresAt !== undefined && (!Number.isFinite(hold.expiresAt) || hold.expiresAt < 0))
    )
      throw new Error('Invalid resource reservation.');
    if (hold.state !== 'held') continue;
    const stock = readResource(world, hold.resource);
    if (hold.actorId) {
      const actor = world.entities[hold.actorId]!;
      if (
        !actor.actor!.alive ||
        actor.retirement ||
        (actor.actor!.action?.id !== hold.invocationId &&
          world.workState?.invocations[hold.invocationId]?.actorId !== hold.actorId)
      )
        throw new Error('Resource reservation has no live owning process.');
    }
    const key = resourceKey(hold.resource);
    const total = (totals.get(key) ?? 0) + hold.amount;
    if (
      !stock ||
      total > stock.value - stock.minimum ||
      !Number.isFinite(total) ||
      (stock.precision === 'whole' && !Number.isSafeInteger(total))
    )
      throw new Error('Unbacked resource reservation.');
    totals.set(key, total);
  }
  const allocation = resourceReservationWork(world);
  requireWork(allocation.total, WORK_LIMITS.world);
  for (const [actorId] of allocation.actors) requireAllocation(world, actorId, '', {});
  for (const [moduleId] of allocation.modules) requireAllocation(world, '', moduleId, {});
  for (const root of allocation.roots.values()) requireWork(root, WORK_LIMITS.group);
}

/** Rebuildable deadline metadata avoids scanning retained holds on every tick. */
export function reconcileResourceReservations(world: WorldState): void {
  if (!world.resourceReservations) return;
  for (const deadline of reservationIndex(world).deadlines) {
    if (deadline.at > world.simTime) break;
    releaseResource(world, deadline.id, deadline.invocationId);
  }
}
