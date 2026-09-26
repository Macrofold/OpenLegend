import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import type { DefinitionPin } from './world-modules.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type { WorldState } from './types.js';
import { isDraft, original } from 'immer';
import { objectIndexGet, objectIndexSet, type ObjectIndexNode } from './object-index.js';
import { releaseInvocationResources, resourceReservationWork } from './resource-claims.js';

/** Deterministic units, independent of wall time and provider spending. Operational
 * containment, not authored world law. docs/projects/dependency-invalidation-tech-design.md#7-budget-model-and-static-admission */
export const WORK_UNITS = [
  'candidates',
  'tests',
  'inputBytes',
  'outputBytes',
  'effects',
  'claims',
  'subscriptions',
  'live',
  'queued',
  'retainedBytes',
  'depth',
] as const;
export type WorkUnit = (typeof WORK_UNITS)[number];
export type WorkVector = Record<WorkUnit, number>;
export type WorkDemand = Partial<WorkVector>;
export const WORK_LIMITS = Object.freeze({
  version: 'native-work-v1',
  // Safety ceilings; matched workload qualification is recorded separately from these bounds.
  group: Object.freeze({
    candidates: 2_000_000,
    tests: 4_000_000,
    inputBytes: 64_000_000,
    outputBytes: 16_000_000,
    effects: 100_000,
    claims: 100_000,
    subscriptions: 100_000,
    live: 65_536,
    queued: 65_536,
    retainedBytes: 64_000_000,
    depth: 32,
  }),
  actor: Object.freeze({ live: 2048, queued: 4096, retainedBytes: 4_000_000, subscriptions: 8192 }),
  module: Object.freeze({
    live: 32768,
    queued: 32768,
    retainedBytes: 32_000_000,
    subscriptions: 65536,
  }),
  world: Object.freeze({
    live: 65536,
    queued: 65536,
    retainedBytes: 64_000_000,
    subscriptions: 100000,
  }),
});
export class WorkBudgetError extends Error {
  constructor(
    readonly code: 'work-unavailable' | 'work-contract',
    readonly unit: WorkUnit,
  ) {
    super(
      code === 'work-unavailable'
        ? `Native work capacity is unavailable (${unit}).`
        : `Native work exceeded its admitted ${unit} envelope.`,
    );
  }
}
function integer(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Invalid or overflowing native work bound.');
  return value;
}
export function workVector(value: WorkDemand = {}): WorkVector {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !WORK_UNITS.includes(key as WorkUnit))
  )
    throw new Error('Invalid native work vector.');
  const vector = {} as WorkVector;
  for (const unit of WORK_UNITS) vector[unit] = integer(value[unit] ?? 0);
  return vector;
}
function retainedAllocation(value: WorkDemand): WorkVector {
  const vector = workVector(value);
  // Only resident stock is summed across live invocations. Execution counters and
  // maximum nesting depth belong to interval limits, not releasable reservations.
  for (const unit of WORK_UNITS)
    if (!['live', 'queued', 'retainedBytes', 'subscriptions'].includes(unit) && vector[unit])
      throw new Error('Execution work cannot be retained as a live allocation.');
  return vector;
}
export function addWork(a: WorkDemand, b: WorkDemand): WorkVector {
  const left = workVector(a),
    right = workVector(b);
  return workVector(
    Object.fromEntries(
      WORK_UNITS.map((unit) => [
        unit,
        integer(unit === 'depth' ? Math.max(left.depth, right.depth) : left[unit] + right[unit]),
      ]),
    ),
  );
}
export function multiplyWork(value: WorkDemand, count: number): WorkVector {
  integer(count);
  const vector = workVector(value);
  return workVector(
    Object.fromEntries(
      WORK_UNITS.map((unit) => [
        unit,
        integer(unit === 'depth' ? (count ? vector.depth : 0) : vector[unit] * count),
      ]),
    ),
  );
}
export function requireWork(
  demand: WorkDemand,
  limit: WorkDemand,
  code: 'work-unavailable' | 'work-contract' = 'work-unavailable',
): void {
  const required = workVector(demand);
  for (const unit of WORK_UNITS)
    if (limit[unit] !== undefined && required[unit] > limit[unit]!)
      throw new WorkBudgetError(code, unit);
}
export interface WorkExpansion {
  own: WorkDemand;
  children?: readonly { maximum: number; expansion: WorkExpansion }[];
}
/** Trusted families compose their entire bounded selector/descendant tree. Generated
 * data cannot install callbacks or reset a child's allowance by choosing a new ID. */
export function expansionWork(
  tree: WorkExpansion,
  ancestors = new Set<WorkExpansion>(),
): WorkVector {
  if (!tree || ancestors.has(tree) || ancestors.size >= WORK_LIMITS.group.depth)
    throw new Error('Unsupported cyclic or unbounded work expansion.');
  const path = new Set(ancestors).add(tree);
  let result = workVector(tree.own);
  let depth = 1;
  for (const child of tree.children ?? []) {
    const cost = expansionWork(child.expansion, path);
    result = addWork(result, multiplyWork({ ...cost, depth: 0 }, child.maximum));
    if (child.maximum) depth = Math.max(depth, cost.depth + 1);
  }
  result.depth = Math.max(result.depth, depth);
  requireWork(result, WORK_LIMITS.group);
  return result;
}
export interface RecurringWork {
  intervalSeconds: number;
  burst: number;
}
export interface WorkInvocation {
  id: string;
  rootId: string;
  parentId?: string;
  actorId: string;
  moduleId: string;
  definitionPin: DefinitionPin;
  limit: WorkVector;
  used: WorkVector;
  allocation: WorkVector;
  startedAt: number;
  intervalAt: number;
  revision: number;
  executions: number;
  children: number;
  recurrence?: RecurringWork;
}
export interface WorkState {
  policyVersion: string;
  invocations: Record<string, WorkInvocation>;
}
function validRecurrence(value: RecurringWork | undefined): void {
  if (
    value &&
    (!hasRecordFields(value, ['intervalSeconds', 'burst']) ||
      !Number.isFinite(value.intervalSeconds) ||
      value.intervalSeconds <= 0 ||
      !Number.isSafeInteger(value.burst) ||
      value.burst < 1)
  )
    throw new Error('Recurring native work requires positive simulation time and a finite burst.');
}
interface AllocationIndex {
  total: WorkVector;
  actors?: ObjectIndexNode<WorkVector>;
  modules?: ObjectIndexNode<WorkVector>;
}
const allocationSnapshots = new WeakMap<object, AllocationIndex>();
const allocationDrafts = new WeakMap<WorldState, AllocationIndex>();
function adjustAllocation(index: AllocationIndex, invocation: WorkInvocation, sign: 1 | -1): void {
  // Aggregate allocation quotas are additive occupancy, not cumulative execution depth.
  const adjust = (prior: WorkDemand = {}) =>
    workVector(
      Object.fromEntries(
        WORK_UNITS.map((unit) => [
          unit,
          integer((prior[unit] ?? 0) + invocation.allocation[unit] * sign),
        ]),
      ),
    );
  index.total = adjust(index.total);
  index.actors = objectIndexSet(
    index.actors,
    invocation.actorId,
    adjust(objectIndexGet(index.actors, invocation.actorId)),
  );
  index.modules = objectIndexSet(
    index.modules,
    invocation.moduleId,
    adjust(objectIndexGet(index.modules, invocation.moduleId)),
  );
}
function allocationIndex(world: WorldState): AllocationIndex {
  const pending = allocationDrafts.get(world);
  if (pending) return pending;
  const base = isDraft(world) ? original(world)! : world,
    records = base.workState?.invocations;
  let index = records && Object.isFrozen(records) ? allocationSnapshots.get(records) : undefined;
  if (!index) {
    index = { total: workVector() };
    for (const invocation of Object.values(records ?? {})) adjustAllocation(index, invocation, 1);
    if (records && Object.isFrozen(records)) allocationSnapshots.set(records, index);
  }
  if (isDraft(world)) {
    index = { ...index };
    allocationDrafts.set(world, index);
  }
  return index;
}
function allocations(world: WorldState, actorId: string, moduleId: string) {
  const index = allocationIndex(world);
  const holds = resourceReservationWork(world);
  return {
    total: addWork(index.total, holds.total),
    actor: addWork(objectIndexGet(index.actors, actorId) ?? {}, holds.actors.get(actorId) ?? {}),
    module: addWork(
      objectIndexGet(index.modules, moduleId) ?? {},
      holds.modules.get(moduleId) ?? {},
    ),
  };
}
export function workAllocations(world: WorldState): WorkVector {
  return addWork(allocationIndex(world).total, resourceReservationWork(world).total);
}
/** Reservation and process owners share one aggregate admission, with each retaining
 * its own canonical lifecycle. The accounting indexes are disposable derived data. */
export function requireAllocation(
  world: WorldState,
  actorId: string,
  moduleId: string,
  demand: WorkDemand,
): void {
  const current = allocations(world, actorId, moduleId);
  requireWork(addWork(current.actor, demand), WORK_LIMITS.actor);
  requireWork(addWork(current.module, demand), WORK_LIMITS.module);
  requireWork(addWork(current.total, demand), WORK_LIMITS.world);
}
export function captureWorkAllocations(world: WorldState): (result: WorldState) => void {
  const base = original(world),
    records = base?.workState?.invocations;
  const current = world.workState?.invocations;
  const sameOwner =
    current === records || (current && isDraft(current) && original(current) === records);
  const index =
    allocationDrafts.get(world) ??
    (sameOwner && records && Object.isFrozen(records)
      ? allocationSnapshots.get(records)
      : undefined);
  allocationDrafts.delete(world);
  return (result) => {
    if (index && result.workState) allocationSnapshots.set(result.workState.invocations, index);
  };
}
/** Internal semantic admission port. The caller owns the surrounding atomic draft and
 * receipt. Duplicate admission cannot refill cumulative or current interval allowance. */
export function admitWork(
  world: WorldState,
  request: {
    id: string;
    parentId?: string;
    actorId: string;
    moduleId: string;
    definitionPin: DefinitionPin;
    limit: WorkDemand;
    allocation: WorkDemand;
    recurrence?: RecurringWork;
  },
): WorkInvocation {
  if (
    ![request.id, request.actorId, request.moduleId].every(isSafeRecordId) ||
    !Object.hasOwn(world.entities, request.actorId) ||
    world.entities[request.actorId]?.retirement ||
    (request.parentId !== undefined && !isSafeRecordId(request.parentId))
  )
    throw new Error('Invalid native invocation identity.');
  if (!isDefinitionPin(request.definitionPin)) throw new Error('Invalid native definition pin.');
  validRecurrence(request.recurrence);
  const existing = world.workState?.invocations[request.id];
  if (existing) {
    if (
      !sameDefinitionPin(existing.definitionPin, request.definitionPin) ||
      existing.actorId !== request.actorId ||
      existing.moduleId !== request.moduleId ||
      existing.parentId !== request.parentId ||
      JSON.stringify(existing.limit) !== JSON.stringify(workVector(request.limit)) ||
      JSON.stringify(existing.allocation) !== JSON.stringify(workVector(request.allocation)) ||
      JSON.stringify(existing.recurrence) !== JSON.stringify(request.recurrence)
    )
      throw new Error('Native invocation identity conflict.');
    return existing;
  }
  const parent = request.parentId ? world.workState?.invocations[request.parentId] : undefined;
  if (
    request.parentId &&
    (!parent ||
      parent.actorId !== request.actorId ||
      parent.moduleId !== request.moduleId ||
      !sameDefinitionPin(parent.definitionPin, request.definitionPin) ||
      request.recurrence)
  )
    throw new Error('Invalid native descendant lineage.');
  const limit = workVector(request.limit),
    allocation = retainedAllocation(request.allocation);
  requireWork(limit, WORK_LIMITS.group);
  requireWork(allocation, WORK_LIMITS.world);
  requireAllocation(world, request.actorId, request.moduleId, allocation);
  if (parent) {
    let cursor: WorkInvocation | undefined = parent;
    let depth = 1;
    while (cursor) {
      if (++depth > WORK_LIMITS.group.depth) throw new WorkBudgetError('work-unavailable', 'depth');
      cursor = cursor.parentId ? world.workState?.invocations[cursor.parentId] : undefined;
    }
    // Reserve the complete descendant demand now. The child's execution spends this
    // reservation; release never refunds cumulative root credit within an interval.
    const used = addWork(parent.used, addWork(limit, allocation));
    requireWork(used, parent.limit);
    parent.used = used;
    parent.children++;
    parent.revision++;
  }
  const invocation: WorkInvocation = {
    id: request.id,
    rootId: parent?.rootId ?? request.id,
    ...(request.parentId ? { parentId: request.parentId } : {}),
    actorId: request.actorId,
    moduleId: request.moduleId,
    definitionPin: { ...request.definitionPin },
    limit,
    allocation,
    used: workVector(),
    startedAt: world.simTime,
    intervalAt: world.simTime,
    revision: 1,
    executions: 0,
    children: 0,
    ...(request.recurrence ? { recurrence: { ...request.recurrence } } : {}),
  };
  (world.workState ??= { policyVersion: WORK_LIMITS.version, invocations: {} }).invocations[
    request.id
  ] = invocation;
  if (isDraft(world)) adjustAllocation(allocationIndex(world), invocation, 1);
  return invocation;
}
export function advanceWorkInterval(world: WorldState, id: string): void {
  const root = world.workState?.invocations[id];
  if (!root || root.rootId !== id || !root.recurrence)
    throw new Error('No admitted recurring root.');
  if (
    world.simTime <= root.intervalAt ||
    world.simTime < root.intervalAt + root.recurrence.intervalSeconds
  )
    return;
  if (root.children > 0) throw new Error('Recurring interval still owns pending descendants.');
  // At most this interval's burst; pause/downtime cannot bank unlimited catch-up work.
  root.intervalAt = world.simTime;
  root.used = workVector();
  root.executions = 0;
  root.revision++;
}
export function chargeInvocation(world: WorldState, id: string, demand: WorkDemand): void {
  const invocation = world.workState?.invocations[id];
  if (!invocation) throw new Error('Native work has no admitted invocation.');
  if (invocation.recurrence && invocation.executions >= invocation.recurrence.burst)
    throw new WorkBudgetError('work-contract', 'effects');
  // A running native episode usually charges two counters. Preflight every changed
  // counter before mutation, without copying/replacing all eleven saved counters per
  // actor per tick. Retained/root reservations are still charged at admission.
  const increments = Object.entries(demand) as [WorkUnit, number][];
  for (const [unit, amount] of increments) {
    if (!WORK_UNITS.includes(unit)) throw new Error('Unknown work unit.');
    integer(amount);
    const next = integer(
      unit === 'depth' ? Math.max(invocation.used[unit], amount) : invocation.used[unit] + amount,
    );
    if (next > invocation.limit[unit]) throw new WorkBudgetError('work-contract', unit);
  }
  for (const [unit, amount] of increments)
    invocation.used[unit] =
      unit === 'depth' ? Math.max(invocation.used[unit], amount) : invocation.used[unit] + amount;
  invocation.executions++;
  invocation.revision++;
}
export function releaseWork(world: WorldState, id: string): void {
  const records = world.workState?.invocations;
  if (!records?.[id]) return;
  const source = records[id]!;
  const allocation = allocationIndex(world);
  const pending = [id];
  if (source.children) {
    const children = new Map<string, string[]>();
    for (const invocation of Object.values(records))
      if (invocation.parentId) {
        const ids = children.get(invocation.parentId) ?? [];
        ids.push(invocation.id);
        children.set(invocation.parentId, ids);
      }
    for (let i = 0; i < pending.length; i++) pending.push(...(children.get(pending[i]!) ?? []));
  }
  if (source.parentId) {
    const parent = records[source.parentId]!;
    parent.children--;
    parent.revision++;
  }
  for (const key of pending.reverse()) {
    releaseInvocationResources(world, key);
    if (isDraft(world)) adjustAllocation(allocation, records[key]!, -1);
    delete records[key];
  }
}
export function validateWorkState(world: WorldState): void {
  if (!world.workState) return;
  if (
    !hasRecordFields(world.workState, ['policyVersion', 'invocations']) ||
    world.workState.policyVersion !== WORK_LIMITS.version
  )
    throw new Error('Invalid native work state.');
  const actors = new Map<string, WorkVector>(),
    modules = new Map<string, WorkVector>();
  let total = workVector();
  const childCounts = new Map<string, number>();
  for (const value of Object.values(world.workState.invocations))
    if (value.parentId) childCounts.set(value.parentId, (childCounts.get(value.parentId) ?? 0) + 1);
  for (const [id, invocation] of Object.entries(world.workState.invocations)) {
    if (
      !hasRecordFields(
        invocation,
        [
          'id',
          'rootId',
          'actorId',
          'moduleId',
          'definitionPin',
          'limit',
          'used',
          'allocation',
          'startedAt',
          'intervalAt',
          'revision',
          'executions',
          'children',
        ],
        ['parentId', 'recurrence'],
      ) ||
      id !== invocation.id ||
      !isDefinitionPin(invocation.definitionPin) ||
      ![id, invocation.rootId, invocation.actorId, invocation.moduleId].every(isSafeRecordId) ||
      !world.entities[invocation.actorId] ||
      invocation.children !== (childCounts.get(id) ?? 0) ||
      !Number.isSafeInteger(invocation.executions) ||
      invocation.executions < 0 ||
      (invocation.recurrence && invocation.executions > invocation.recurrence.burst) ||
      !Number.isSafeInteger(invocation.revision) ||
      invocation.revision < 1 ||
      !Number.isFinite(invocation.startedAt) ||
      invocation.startedAt < 0 ||
      !Number.isFinite(invocation.intervalAt) ||
      invocation.intervalAt < invocation.startedAt ||
      invocation.intervalAt > world.simTime
    )
      throw new Error('Invalid saved native invocation.');
    validRecurrence(invocation.recurrence);
    retainedAllocation(invocation.allocation);
    requireWork(invocation.used, invocation.limit);
    requireWork(invocation.limit, WORK_LIMITS.group);
    const seen = new Set<string>();
    let cursor: WorkInvocation | undefined = invocation;
    while (cursor?.parentId) {
      if (seen.has(cursor.id) || seen.size >= WORK_LIMITS.group.depth)
        throw new Error('Invalid saved work lineage.');
      seen.add(cursor.id);
      cursor = world.workState.invocations[cursor.parentId];
      if (
        !cursor ||
        cursor.rootId !== invocation.rootId ||
        cursor.actorId !== invocation.actorId ||
        cursor.moduleId !== invocation.moduleId ||
        !sameDefinitionPin(cursor.definitionPin, invocation.definitionPin)
      )
        throw new Error('Invalid saved work parent.');
    }
    if (cursor?.id !== invocation.rootId || (invocation.parentId && invocation.recurrence))
      throw new Error('Invalid saved work root.');
    total = addWork(total, invocation.allocation);
    actors.set(
      invocation.actorId,
      addWork(actors.get(invocation.actorId) ?? {}, invocation.allocation),
    );
    modules.set(
      invocation.moduleId,
      addWork(modules.get(invocation.moduleId) ?? {}, invocation.allocation),
    );
  }
  requireWork(total, WORK_LIMITS.world);
  for (const allocation of actors.values()) requireWork(allocation, WORK_LIMITS.actor);
  for (const allocation of modules.values()) requireWork(allocation, WORK_LIMITS.module);
}

interface WorkMeter {
  limit: WorkVector;
  used: WorkVector;
  parent?: WorkMeter;
  depth: number;
}
let activeMeter: WorkMeter | undefined;
/** Native execution is synchronous. Every nested charge also spends its ancestors'
 * allowance, while a query's smaller local cap still applies. */
export function inWorkGroup(): boolean {
  return activeMeter !== undefined;
}
export function withWorkMeter<T>(limit: WorkDemand, operation: () => T): T {
  const meter: WorkMeter = {
    limit: workVector(limit),
    used: workVector(),
    parent: activeMeter,
    depth: (activeMeter?.depth ?? 0) + 1,
  };
  if (meter.depth > WORK_LIMITS.group.depth) throw new WorkBudgetError('work-contract', 'depth');
  requireWork(meter.limit, WORK_LIMITS.group);
  activeMeter = meter;
  try {
    return operation();
  } finally {
    activeMeter = meter.parent;
  }
}
export function chargeWork(demand: WorkDemand): void {
  if (!activeMeter) return; // Mutable seed/migration builders are validated before installation.
  const keys = Object.keys(demand) as WorkUnit[];
  // Preflight the entire chain before charging any meter, including on local exhaustion.
  for (let meter: WorkMeter | undefined = activeMeter; meter; meter = meter.parent)
    for (const key of keys) {
      if (!WORK_UNITS.includes(key)) throw new Error('Unknown work unit.');
      const next = integer(meter.used[key] + integer(demand[key]!));
      if (next > meter.limit[key]) throw new WorkBudgetError('work-contract', key);
    }
  for (let meter: WorkMeter | undefined = activeMeter; meter; meter = meter.parent)
    for (const key of keys) meter.used[key] += demand[key]!;
}
