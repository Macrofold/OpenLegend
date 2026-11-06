import { entityGet } from './entity-collection.js';
import { statusDefinitions } from './status-capabilities.js';
import { activelyParticipates } from './participation-state.js';
import {
  effectBindings,
  localHour,
  readEntityAttribute,
  matchesStatusCondition,
  retainNegativeStatusCondition,
  periodicChangeCount,
  statusComparisonValue,
  type EffectBindings,
  type StatusCondition,
  type StatusRateInterval,
} from './status-effects.js';
import {
  type AttributeDefinition,
  attributeRange,
  attributeThreshold,
  readAttribute,
} from './world-modules.js';
import type { WorldState } from './types.js';
import { readOnlyDraftView } from './draft.js';

/** Numeric progress guard, not a biological tick. docs/simulation-time.md#native-interval-contract */
export const TIME_EPSILON = 1e-6;
/** First clock value satisfying an owner's elapsed comparison, including rounding. */
export function elapsedDeadline(start: number, seconds: number): number {
  let time = start + seconds;
  while (time - start < seconds)
    time += Math.max(Number.MIN_VALUE, Math.abs(time) * Number.EPSILON);
  return time;
}
export type AttributeRates = Map<string, Map<string, number>>;
export function addRate(
  rates: AttributeRates,
  entityId: string,
  attribute: string,
  amount: number,
): void {
  let values = rates.get(entityId);
  if (!values) rates.set(entityId, (values = new Map()));
  values.set(attribute, (values.get(attribute) ?? 0) + amount);
}
export function untilThreshold(value: number, rate: number, threshold: number): number {
  if (!rate) return Infinity;
  const time = (threshold - value) / rate;
  // A strict-side departure must change a large value representably, or it would repeat.
  return time >= 0
    ? Math.max(TIME_EPSILON, time, (2 * Math.abs(value) * Number.EPSILON) / Math.abs(rate))
    : Infinity;
}
interface ConditionTransition {
  matches: boolean;
  afterSeconds: number;
}
/** Lower bound on a predicate changing, not a promise that a compound predicate will change.
 * An AND cannot become true before every currently false child could change; a permanently
 * false child therefore suppresses irrelevant numeric deadlines. OR has the dual rule.
 * docs/simulation-time.md#native-interval-contract */
function conditionTransition(
  world: WorldState,
  bindings: EffectBindings,
  condition: StatusCondition,
  rates: AttributeRates,
  attributes: ReadonlyMap<string, AttributeDefinition>,
): ConditionTransition {
  if ('all' in condition || 'any' in condition) {
    const conjunction = 'all' in condition;
    const children = 'all' in condition ? condition.all : condition.any;
    let earliest = Infinity,
      blocking = 0,
      hasBlocking = false;
    for (const child of children) {
      const transition = conditionTransition(world, bindings, child, rates, attributes);
      earliest = Math.min(earliest, transition.afterSeconds);
      if (transition.matches !== conjunction) {
        if (transition.afterSeconds === Infinity)
          return { matches: !conjunction, afterSeconds: Infinity };
        hasBlocking = true;
        blocking = Math.max(blocking, transition.afterSeconds);
      }
    }
    return {
      matches: conjunction !== hasBlocking,
      afterSeconds: hasBlocking ? blocking : earliest,
    };
  }
  const matches = matchesStatusCondition(world, bindings, condition);
  if ('dailyWindow' in condition) {
    return { matches, afterSeconds: dailyWindowBoundary(world, condition.dailyWindow) };
  }
  if (!('compare' in condition)) return { matches, afterSeconds: Infinity };
  const c = condition.compare;
  const target =
    c.target === '$subject'
      ? bindings.subject
      : c.target === '$source'
        ? bindings.source
        : bindings.actionTarget;
  const value = readEntityAttribute(world, target, c.attribute);
  if (!target || typeof value !== 'number') return { matches, afterSeconds: Infinity };
  const rate = rates.get(target.id)?.get(c.attribute) ?? 0;
  const definition = attributes.get(c.attribute);
  const schema =
    definition?.schema.kind === 'number'
      ? target.actor
        ? attributeRange(target.actor, definition)
        : definition.schema
      : undefined;
  const threshold = statusComparisonValue(world, bindings, c);
  let afterSeconds = Infinity;
  // A saturated outward rate cannot change a predicate, including equality.
  if (
    rate &&
    !(schema && ((value <= schema.min && rate < 0) || (value >= schema.max && rate > 0)))
  ) {
    if (value === threshold) {
      const after =
        c.operator === 'equal'
          ? false
          : c.operator === 'notEqual'
            ? true
            : c.operator === 'greaterThanOrEqual'
              ? rate > 0
              : rate < 0;
      // A reached threshold only needs the strict-side micro-interval when its truth changes,
      // long enough to change the value representably.
      if (matches !== after)
        afterSeconds = Math.max(
          TIME_EPSILON,
          (2 * Math.abs(value) * Number.EPSILON) / Math.abs(rate),
        );
    } else afterSeconds = untilThreshold(value, rate, threshold);
  }
  if (!matches)
    retainNegativeStatusCondition(world, bindings, condition, value, threshold, rate, afterSeconds);
  return { matches, afterSeconds };
}
/** Shared strict-future daily edges, with the matcher’s exact local-hour arithmetic. */
export function dailyWindowBoundary(
  world: WorldState,
  window: { start: number; end: number },
): number {
  const hour = localHour(world);
  return Math.min(
    ...[window.start, window.end].map((h) => {
      // Subtract before wrapping: adding 24 first can round a residue onto an edge.
      const gap = h - hour;
      const seconds = (gap < 0 ? gap + 24 : gap) * 3600;
      return seconds <= 0 ? 86400 : Math.max(TIME_EPSILON, seconds);
    }),
  );
}
export function statusBoundary(
  world: WorldState,
  entities: readonly string[],
  rates: AttributeRates,
  attributes: ReadonlyMap<string, AttributeDefinition>,
  /** Receives stored absolute deadlines so the caller can land on them exactly. */
  at: (time: number) => void = () => {},
): number {
  let result = Infinity;
  const definitions = statusDefinitions(world);
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const currentEntities = readOnlyDraftView(world.entities);
  for (const id of entities) {
    const storedEntity = entityGet(currentEntities, id);
    if (!storedEntity) continue;
    const entity = readOnlyDraftView(storedEntity);
    const states = entity.statusEffects && readOnlyDraftView(entity.statusEffects);
    // Independent contributions use contribution IDs, not singleton definition keys.
    // Their lifetime and predicates must end a restriction at the actual boundary.
    for (const stored of Object.values(states ?? {})) {
      const state = readOnlyDraftView(stored);
      if (!state.active || !state.contribution) continue;
      const { lifetime, definitionId } = state.contribution;
      if (lifetime.kind === 'fixed') {
        result = Math.min(result, lifetime.expiresAt - world.simTime);
        at(lifetime.expiresAt);
      }
      const definition = byId.get(definitionId);
      if (!definition) continue;
      const bindings = effectBindings(world, entity, state);
      for (const condition of [definition.requires, definition.automaticDeactivation])
        if (condition)
          result = Math.min(
            result,
            conditionTransition(world, bindings, condition, rates, attributes).afterSeconds,
          );
    }
    if (!activelyParticipates(entity)) continue;
    for (const d of definitions) {
      const stored = states?.[d.id];
      const state = stored && readOnlyDraftView(stored);
      if (!state?.active) {
        // Only automatic activation can happen without a command. Retired episode bindings
        // must not predict reactivation against its old source/target: activation binds self.
        if (!d.enabled || !d.automaticActivation) continue;
        const delay = (state?.automaticAfter ?? 0) - world.simTime;
        if (delay > 0) {
          result = Math.min(result, delay);
          at(state!.automaticAfter);
          continue;
        }
        result = Math.min(
          result,
          conditionTransition(
            world,
            effectBindings(world, entity),
            {
              all: [
                d.requires,
                ...(d.activationCondition ? [d.activationCondition] : []),
                d.automaticActivation,
              ],
            },
            rates,
            attributes,
          ).afterSeconds,
        );
        continue;
      }
      const bindings = effectBindings(world, entity, state);
      for (const operation of d.whileActive) {
        if (!('changeEvery' in operation)) continue;
        if (operation.when && !matchesStatusCondition(world, bindings, operation.when)) continue;
        const every = operation.changeEvery.everyGameSeconds;
        const after =
          (periodicChangeCount(state.elapsedSeconds, every) + 1) * every - state.elapsedSeconds;
        const dueAt = world.simTime + after;
        result = Math.min(result, after);
        at(dueAt);
      }
      const conditions = [
        d.requires,
        d.automaticDeactivation,
        ...d.whileActive.map((op) => ('when' in op ? op.when : undefined)),
      ];
      for (const condition of conditions)
        if (condition)
          result = Math.min(
            result,
            conditionTransition(world, bindings, condition, rates, attributes).afterSeconds,
          );
    }
  }
  return result;
}
export function statusAttributeRates(intervals: readonly StatusRateInterval[]): AttributeRates {
  const result: AttributeRates = new Map();
  for (const interval of intervals)
    for (const { targetId, attribute, rate } of interval.rates)
      addRate(result, targetId, attribute, rate);
  return result;
}
export function attributeBoundary(
  world: WorldState,
  rates: AttributeRates,
  definitions: readonly AttributeDefinition[],
): number {
  let result = Infinity;
  const currentEntities = readOnlyDraftView(world.entities);
  for (const [id, values] of rates) {
    const stored = entityGet(currentEntities, id);
    if (!stored) continue;
    const entity = readOnlyDraftView(stored);
    for (const d of definitions) {
      const rate = values.get(d.id) ?? 0;
      if (!rate) continue;
      const state = entity.attributes && readOnlyDraftView(entity.attributes)[d.id];
      const value = entity.actor
        ? readAttribute(world, entity, d)
        : state
          ? readOnlyDraftView(state).value
          : undefined;
      if (typeof value !== 'number') continue;
      const range = attributeRange(entity.actor, d);
      const thresholds = [range.min, range.max];
      if (d.concern) {
        const below = attributeThreshold(entity.actor, d, d.concern.below, d.concern.unit);
        thresholds.push(below);
        if (d.concern.mode === 'latched')
          thresholds.push(Math.min(range.max, below + d.concern.recoveryMargin!));
      }
      for (const t of thresholds)
        if (!(value === t && ((t === range.min && rate < 0) || (t === range.max && rate > 0))))
          result = Math.min(result, untilThreshold(value, rate, t));
    }
  }
  return result;
}

/** Convert an authored normal-play duration once; runtime speed and pause only
 * determine how quickly the shared simulation clock advances. */
export function normalSpeedSeconds(world: WorldState, seconds: number): number {
  const rate = world.timePolicy?.normalGameSecondsPerSecond;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0)
    throw new Error('A normal-play duration requires an installed world clock rate.');
  return seconds * rate;
}
