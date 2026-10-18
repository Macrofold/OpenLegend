import { draftWorld, finishWorld, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { recordSemanticChange } from './dependencies.js';
import { countDomainWork } from './diagnostic-counters.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import {
  advanceInvocationInterval,
  chargeInvocationValue,
  type WorkDemand,
  type WorkInvocation,
} from './work-budget.js';
import type { Entity, WorldState } from './types.js';
import {
  statusArithmeticThresholds,
  validateRetainedStatusArithmetic,
  type StatusEffectInstance,
} from './status-effects.js';
import { attributeDefinition } from './world-modules.js';
import type { AttributeState } from './world-modules.js';

/** Exact ordered arithmetic, bounded by compaction rather than by slowing the world.
 * Saved continuation retains the same operations and anchors; no alternate meter owner.
 * docs/limits/native-work.md#nw17--experimental-deferred-arithmetic-window */
export const NATIVE_VALUE_SEGMENTS = 64;
export interface NativeValueAttribute {
  rates: number[];
  min: number;
  max: number;
  /** No meter revision/invalidation is earned by an already-clamped operation. */
  changed: boolean;
}
export interface NativeValueBinding {
  entityId: string;
  statusId: string;
  episode: string;
  attributes: Record<string, NativeValueAttribute>;
  demand: WorkDemand;
  from: number;
}
export interface NativeValueWindow {
  segments: Array<{ seconds: number; simTime: number }>;
  bindingCount: number;
  bindings: Record<string, NativeValueBinding>;
  byEntity: Record<string, Record<string, string>>;
}
function windowOf(world: WorldState): NativeValueWindow | undefined {
  const value = readOnlyDraftView(world).pendingNativeIntegration;
  return value && readOnlyDraftView(value);
}
function bindingFor(world: WorldState, entityId: string, attributeId: string) {
  const window = windowOf(world);
  const subject = window && getOwn(readOnlyDraftView(window.byEntity), entityId);
  const id = subject && getOwn(readOnlyDraftView(subject), attributeId);
  const binding = id && getOwn(readOnlyDraftView(window!.bindings), id);
  return binding ? readOnlyDraftView(binding) : undefined;
}
function storedAttribute(entity: Entity, attributeId: string): AttributeState | undefined {
  const value = readOnlyDraftView(entity);
  const states = value.actor ? readOnlyDraftView(value.actor).attributes : value.attributes;
  return states ? readOnlyDraftView(states)[attributeId] : undefined;
}
const currentAttributeReads = new WeakMap<
  NativeValueAttribute,
  {
    segment: WeakRef<object>;
    from: number;
    anchorValue: number;
    anchorRevision: number;
    concernActive: boolean | undefined;
    state: AttributeState;
  }
>();
/** Pure current state, including its revision. Readers never write anchors or accounting. */
export function currentAttributeState(
  world: WorldState,
  entity: Entity,
  attributeId: string,
): AttributeState | undefined {
  const state = storedAttribute(entity, attributeId);
  if (!state) return;
  const anchor = readOnlyDraftView(state),
    binding = bindingFor(world, entity.id, attributeId);
  if (!binding || typeof anchor.value !== 'number') return anchor;
  const operation = getOwn(readOnlyDraftView(binding.attributes), attributeId)!;
  let value = anchor.value,
    revision = anchor.revision;
  const segments = readOnlyDraftView(windowOf(world)!.segments);
  const segment = readOnlyDraftView(segments[segments.length - 1]!);
  const cached = currentAttributeReads.get(operation);
  if (
    cached?.segment.deref() === segment &&
    cached.from === binding.from &&
    cached.anchorValue === value &&
    cached.anchorRevision === revision &&
    cached.concernActive === anchor.concernActive
  ) {
    countDomainWork('nativeValueReadCacheHits');
    return cached.state;
  }
  const rates = readOnlyDraftView(operation.rates);
  countDomainWork('nativeValueOperationsReplayed', (segments.length - binding.from) * rates.length);
  for (let i = binding.from; i < segments.length; i++) {
    const segment = readOnlyDraftView(segments[i]!);
    for (const rate of rates) {
      const next = Math.max(operation.min, Math.min(operation.max, value + rate * segment.seconds));
      if (next !== value) {
        if (!Number.isSafeInteger(++revision)) throw new Error('Attribute revision exhausted.');
        value = next;
      }
    }
  }
  const projected = Object.freeze({ ...anchor, value, revision });
  // One derived result per attribute operation group, with no world/draft references or predecessor
  // cursor. Reading an older fork can replace this cache entry, never its arithmetic.
  currentAttributeReads.set(operation, {
    segment: new WeakRef(segment),
    from: binding.from,
    anchorValue: anchor.value,
    anchorRevision: anchor.revision,
    concernActive: anchor.concernActive,
    state: projected,
  });
  return projected;
}
export function currentStatusInstance(
  world: WorldState,
  entity: Entity | undefined,
  statusId: string,
): StatusEffectInstance | undefined {
  const states = entity && readOnlyDraftView(entity).statusEffects;
  const state = states && readOnlyDraftView(states)[statusId];
  if (!state) return;
  const anchor = readOnlyDraftView(state),
    window = windowOf(world);
  const binding = window && getOwn(readOnlyDraftView(window.bindings), anchor.episode);
  if (!binding) return anchor;
  let elapsedSeconds = anchor.elapsedSeconds;
  const segments = readOnlyDraftView(window!.segments);
  countDomainWork('nativeValueOperationsReplayed', segments.length - binding.from);
  for (let i = binding.from; i < segments.length; i++)
    elapsedSeconds += readOnlyDraftView(segments[i]!).seconds;
  return { ...anchor, elapsedSeconds };
}
export function currentWorkInvocation(world: WorldState, id: string): WorkInvocation | undefined {
  const state = readOnlyDraftView(world).workState;
  const stored = state && readOnlyDraftView(state).invocations;
  const invocation = stored && readOnlyDraftView(stored)[id];
  if (!invocation) return;
  const anchor = readOnlyDraftView(invocation),
    window = windowOf(world);
  const binding = window && getOwn(readOnlyDraftView(window.bindings), id);
  if (!binding) return anchor;
  const result = { ...anchor, used: { ...readOnlyDraftView(anchor.used) } };
  const segments = readOnlyDraftView(window!.segments);
  countDomainWork('nativeValueOperationsReplayed', segments.length - binding.from);
  for (let i = binding.from; i < segments.length; i++) {
    const segment = readOnlyDraftView(segments[i]!);
    advanceInvocationInterval(result, segment.simTime);
    chargeInvocationValue(result, binding.demand);
  }
  return result;
}
/** In-place materialization preserves existing owned entity/status references. It does
 * not emit history: eligibility excludes threshold/latch changes, and invalidation was
 * recorded when the original arithmetic operation was retained. */
export function materializeNativeEpisode(world: WorldState, episode: string): void {
  const window = windowOf(world),
    binding = window && getOwn(readOnlyDraftView(window.bindings), episode);
  if (!binding) return;
  const entity = entityGet(world.entities, binding.entityId);
  if (!entity) throw new Error('Pending native value lost its entity.');
  const attributes = Object.keys(readOnlyDraftView(binding.attributes));
  countDomainWork('nativeValuesMaterialized', attributes.length);
  for (const attributeId of attributes) {
    const value = currentAttributeState(world, entity, attributeId)!;
    const attribute = (entity.actor?.attributes ?? entity.attributes)![attributeId]!;
    attribute.value = value.value;
    attribute.revision = value.revision;
  }
  const status = currentStatusInstance(world, entity, binding.statusId)!;
  const work = currentWorkInvocation(world, episode)!;
  entity.statusEffects![binding.statusId]!.elapsedSeconds = status.elapsedSeconds;
  Object.assign(world.workState!.invocations[episode]!, work, { used: { ...work.used } });
  const owned = world.pendingNativeIntegration!;
  delete owned.bindings[episode];
  owned.bindingCount--;
  const subject = owned.byEntity[binding.entityId]!;
  for (const attributeId of attributes) delete subject[attributeId];
  if (!Object.keys(subject).length) delete owned.byEntity[binding.entityId];
  if (!owned.bindingCount) delete world.pendingNativeIntegration;
}
export function materializeNativeEntity(world: WorldState, entityId: string): void {
  const subjects = windowOf(world)?.byEntity;
  const bindings = subjects && getOwn(readOnlyDraftView(subjects), entityId);
  if (bindings)
    for (const id of Object.values(readOnlyDraftView(bindings)))
      materializeNativeEpisode(world, id);
}
export function materializeNativeAttribute(
  world: WorldState,
  entityId: string,
  attributeId: string,
): void {
  const binding = bindingFor(world, entityId, attributeId);
  if (binding) materializeNativeEpisode(world, binding.episode);
}
export function materializeNativeValuesInPlace(world: WorldState): void {
  const window = windowOf(world);
  if (window)
    for (const id of Object.keys(readOnlyDraftView(window.bindings)))
      materializeNativeEpisode(world, id);
}
/** Save preparation must accept and install this exact result, never encode it while
 * claiming an unrelated pending snapshot is the durable baseline. */
export function materializeNativeValues(world: WorldState): WorldState {
  if (!windowOf(world)) return world;
  const owned = draftWorld(world, { retainNativeValues: true });
  materializeNativeValuesInPlace(owned);
  // Unlike a command, this only writes the exact already-earned values. Keep the
  // sampling remainder: dropping it would split the next ordered rate operation
  // differently after saving/restoring. A fresh header explicitly retains it
  // through finishWorld's conservative command-invalidation boundary.
  if (owned.nativeInterval) owned.nativeInterval = { ...owned.nativeInterval };
  return finishWorld(owned);
}
function sameNativeAttributes(
  before: Record<string, NativeValueAttribute>,
  after: Record<string, NativeValueAttribute>,
): boolean {
  before = readOnlyDraftView(before);
  if (before === after) return true;
  const ids = Object.keys(before);
  if (ids.length !== Object.keys(after).length) return false;
  return ids.every((id) => {
    const prior = readOnlyDraftView(before[id]!);
    const next = getOwn(after, id);
    const rates = readOnlyDraftView(prior.rates);
    return (
      next !== undefined &&
      prior.min === next.min &&
      prior.max === next.max &&
      prior.changed === next.changed &&
      rates.length === next.rates.length &&
      rates.every((rate, index) => rate === next.rates[index])
    );
  });
}
/** Append one shared segment after preflighting every episode through its existing
 * accounting owner. A changed cohort materializes before its next operation. */
export function retainNativeIntegration(
  world: WorldState,
  bindings: Omit<NativeValueBinding, 'from'>[],
  seconds: number,
): ReadonlySet<string> {
  let window = windowOf(world);
  const selected = new Map(bindings.map((binding) => [binding.episode, binding]));
  if (window) {
    for (const prior of Object.values(readOnlyDraftView(window.bindings))) {
      const next = selected.get(prior.episode);
      if (
        !next ||
        !sameNativeAttributes(prior.attributes, next.attributes) ||
        prior.statusId !== next.statusId ||
        prior.entityId !== next.entityId ||
        prior.demand.tests !== next.demand.tests ||
        prior.demand.effects !== next.demand.effects
      )
        materializeNativeEpisode(world, prior.episode);
    }
    if ((windowOf(world)?.segments.length ?? 0) >= NATIVE_VALUE_SEGMENTS)
      materializeNativeValuesInPlace(world);
  }
  if (!bindings.length) return new Set();
  for (const binding of bindings) {
    const work = currentWorkInvocation(world, binding.episode);
    if (!work) throw new Error('Pending native value has no admitted invocation.');
    const next = { ...work, used: { ...work.used } };
    advanceInvocationInterval(next, world.simTime);
    chargeInvocationValue(next, binding.demand);
  }
  const owned = (world.pendingNativeIntegration ??= {
    segments: [],
    bindingCount: 0,
    bindings: {},
    byEntity: {},
  });
  const from = owned.segments.length;
  for (const binding of bindings) {
    if (owned.bindings[binding.episode]) continue;
    owned.bindingCount++;
    owned.bindings[binding.episode] = { ...binding, from };
    const subject = (owned.byEntity[binding.entityId] ??= {});
    for (const attributeId of Object.keys(binding.attributes))
      subject[attributeId] = binding.episode;
  }
  // Only duration/time are shared; operation order and each binding's anchor remain explicit.
  owned.segments.push({ seconds, simTime: world.simTime });
  countDomainWork('nativeValueSegmentsRetained');
  for (const binding of bindings) {
    // Eligibility already proved whether any meter changes. Clamped accounting-only
    // continuation sends no invented attribute invalidation or repeated replay.
    if (Object.values(binding.attributes).some((attribute) => attribute.changed))
      recordSemanticChange(world, {
        kind: 'state',
        entityId: binding.entityId,
        field: 'attribute',
      });
  }
  return new Set(bindings.map((binding) => binding.episode));
}

function nativeRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.keys(value).every(isSafeRecordId)
  );
}
/** Cold current-format validation. Call only after the anchor world has passed the
 * existing full validator; this proves the extra links/operations before pure readers
 * or materialization consume them. Never repairs or installs omitted continuation. */
export function validateNativeValueWindow(world: WorldState): void {
  const window = world.pendingNativeIntegration;
  if (window === undefined) return;
  const fail: () => never = () => {
    throw new Error('Invalid saved native arithmetic continuation.');
  };
  if (
    !hasRecordFields(window, ['segments', 'bindingCount', 'bindings', 'byEntity']) ||
    !Array.isArray(window.segments) ||
    !window.segments.length ||
    window.segments.length > NATIVE_VALUE_SEGMENTS ||
    !Number.isSafeInteger(window.bindingCount) ||
    window.bindingCount <= 0 ||
    !nativeRecord(window.bindings) ||
    !nativeRecord(window.byEntity) ||
    Object.keys(window.bindings).length !== window.bindingCount
  )
    fail();
  let previous = 0;
  let duration = 0;
  for (const segment of window.segments) {
    if (
      !hasRecordFields(segment, ['seconds', 'simTime']) ||
      typeof segment.seconds !== 'number' ||
      !Number.isFinite(segment.seconds) ||
      segment.seconds <= 0 ||
      typeof segment.simTime !== 'number' ||
      !Number.isFinite(segment.simTime) ||
      segment.simTime < previous ||
      segment.simTime > world.simTime
    )
      fail();
    duration += segment.seconds;
    // A flushed prior interval and this endpoint's own application may share a
    // clock, but no prefix can earn arithmetic before the world's time origin.
    const timeSlack =
      8 * Number.EPSILON * Math.max(1, segment.simTime, duration) * window.segments.length;
    if (!Number.isFinite(duration) || duration > segment.simTime + timeSlack) fail();
    previous = segment.simTime;
  }
  const expected = new Map<string, Map<string, string>>();
  for (const [episode, binding] of Object.entries(window.bindings)) {
    if (
      !hasRecordFields(binding, [
        'entityId',
        'statusId',
        'episode',
        'attributes',
        'demand',
        'from',
      ]) ||
      !isSafeRecordId(binding.entityId) ||
      !isSafeRecordId(binding.statusId) ||
      binding.episode !== episode ||
      !Number.isSafeInteger(binding.from) ||
      binding.from < 0 ||
      binding.from >= window.segments.length ||
      !nativeRecord(binding.attributes) ||
      !Object.keys(binding.attributes).length ||
      !hasRecordFields(binding.demand, ['tests', 'effects']) ||
      typeof binding.demand.tests !== 'number' ||
      typeof binding.demand.effects !== 'number' ||
      !Number.isSafeInteger(binding.demand.tests) ||
      !Number.isSafeInteger(binding.demand.effects) ||
      binding.demand.tests < 0 ||
      binding.demand.effects < 0
    )
      fail();
    const entity = entityGet(world.entities, binding.entityId);
    const state = entity?.statusEffects?.[binding.statusId];
    const definition = world.statusEffectPolicy.definitions.find(
      (value) => value.id === binding.statusId,
    );
    const work = world.workState?.invocations[episode];
    if (
      !entity?.actor ||
      !state ||
      !definition ||
      state.episode !== episode ||
      !state.active ||
      !work?.recurrence ||
      work.parentId ||
      work.children ||
      work.rootId !== episode ||
      work.actorId !== entity.id ||
      work.moduleId !== definition.id ||
      window.segments[binding.from]!.simTime < work.intervalAt
    )
      fail();
    if (Object.keys(binding.attributes).length > definition.whileActive.length) fail();
    let operations = 0;
    const owner = expected.get(entity.id) ?? new Map<string, string>();
    expected.set(entity.id, owner);
    for (const [id, attribute] of Object.entries(binding.attributes)) {
      if (
        !hasRecordFields(attribute, ['rates', 'min', 'max', 'changed']) ||
        !Array.isArray(attribute.rates) ||
        !attribute.rates.length ||
        attribute.rates.length > definition.whileActive.length ||
        attribute.rates.some((rate) => typeof rate !== 'number' || !Number.isFinite(rate)) ||
        typeof attribute.min !== 'number' ||
        !Number.isFinite(attribute.min) ||
        typeof attribute.max !== 'number' ||
        !Number.isFinite(attribute.max) ||
        attribute.min > attribute.max ||
        typeof attribute.changed !== 'boolean' ||
        owner.has(id)
      )
        fail();
      operations += attribute.rates.length;
      if (operations > definition.whileActive.length) fail();
      owner.set(id, episode);
      const anchor = storedAttribute(entity, id);
      const installed = attributeDefinition(world, id);
      if (!anchor || typeof anchor.value !== 'number' || !installed) fail();
      let value = anchor.value;
      const thresholds = statusArithmeticThresholds(installed);
      for (let index = binding.from; index < window.segments.length; index++) {
        let changed = false;
        for (const rate of attribute.rates) {
          const next = Math.max(
            attribute.min,
            Math.min(attribute.max, value + rate * window.segments[index]!.seconds),
          );
          if (
            !Number.isFinite(next) ||
            (next !== value &&
              thresholds.some(
                (threshold) =>
                  Math.min(value, next) <= threshold && Math.max(value, next) >= threshold,
              ))
          )
            fail();
          changed ||= next !== value;
          value = next;
        }
        if (changed !== attribute.changed) fail();
      }
    }
    validateRetainedStatusArithmetic(
      world,
      entity,
      state,
      definition,
      binding.attributes,
      binding.demand,
    );
    // Projecting through the original work owner rejects impossible bursts/demands;
    // the subsequent full materialized validation checks final revisions/time as well.
    currentWorkInvocation(world, episode);
  }
  if (Object.keys(window.byEntity).length !== expected.size) fail();
  for (const [entityId, values] of Object.entries(window.byEntity)) {
    const mappings = expected.get(entityId);
    if (!nativeRecord(values) || !mappings || Object.keys(values).length !== mappings.size) fail();
    for (const [id, episode] of Object.entries(values)) if (mappings.get(id) !== episode) fail();
  }
}
