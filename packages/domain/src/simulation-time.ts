import { isDraft, original } from 'immer';
import { statusDefinitions } from './status-capabilities.js';
import { activelyParticipates } from './participation-state.js';
import {
  effectBindings,
  localHour,
  readEntityAttribute,
  matchesStatusCondition,
  type EffectBindings,
  type StatusCondition,
  type StatusRateInterval,
} from './status-effects.js';
import { attributeDefinition, readAttribute } from './world-modules.js';
import type { WorldState } from './types.js';

/** Numeric progress guard, not a biological tick. docs/simulation-time.md#native-interval-contract */
export const TIME_EPSILON = 1e-6;
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
): ConditionTransition {
  if ('all' in condition || 'any' in condition) {
    const conjunction = 'all' in condition;
    const children = 'all' in condition ? condition.all : condition.any;
    let earliest = Infinity,
      blocking = 0,
      hasBlocking = false;
    for (const child of children) {
      const transition = conditionTransition(world, bindings, child, rates);
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
    const hour = localHour(world);
    return {
      matches,
      afterSeconds: Math.min(
        ...[condition.dailyWindow.start, condition.dailyWindow.end].map((h) => {
          // h - hour is exact near an edge; adding 24 first would round a residue short of the
          // edge to zero. Exactly on an edge has passed it; a residue short of it has not (PF13.16).
          const gap = h - hour;
          const seconds = (gap < 0 ? gap + 24 : gap) * 3600;
          return seconds <= 0 ? 86400 : Math.max(TIME_EPSILON, seconds);
        }),
      ),
    };
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
  const schema = attributeDefinition(world, c.attribute)?.schema;
  // A saturated outward rate cannot change a predicate, including equality.
  if (
    !rate ||
    (schema?.kind === 'number' &&
      ((value <= schema.min && rate < 0) || (value >= schema.max && rate > 0)))
  )
    return { matches, afterSeconds: Infinity };
  if (value === c.value) {
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
    return {
      matches,
      afterSeconds:
        matches === after
          ? Infinity
          : Math.max(TIME_EPSILON, (2 * Math.abs(value) * Number.EPSILON) / Math.abs(rate)),
    };
  }
  return { matches, afterSeconds: untilThreshold(value, rate, c.value) };
}
export function statusBoundary(
  world: WorldState,
  entities: readonly string[],
  rates: AttributeRates,
  /** Receives stored absolute deadlines so the caller can land on them exactly. */
  at: (time: number) => void = () => {},
): number {
  let result = Infinity;
  const definitions = statusDefinitions(world);
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  for (const id of entities) {
    const entity = world.entities[id];
    if (!entity) continue;
    // Independent contributions use contribution IDs, not singleton definition keys.
    // Their lifetime and predicates must end a restriction at the actual boundary.
    for (const state of Object.values(entity.statusEffects ?? {})) {
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
            conditionTransition(world, bindings, condition, rates).afterSeconds,
          );
    }
    if (!activelyParticipates(entity)) continue;
    for (const d of definitions) {
      const state = entity.statusEffects?.[d.id];
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
          ).afterSeconds,
        );
        continue;
      }
      const bindings = effectBindings(world, entity, state);
      const conditions = [
        d.requires,
        d.automaticDeactivation,
        ...d.whileActive.map((op) => ('changeRate' in op ? op.when : undefined)),
      ];
      for (const condition of conditions)
        if (condition)
          result = Math.min(
            result,
            conditionTransition(world, bindings, condition, rates).afterSeconds,
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
export function attributeBoundary(world: WorldState, rates: AttributeRates): number {
  let result = Infinity;
  const manifest = isDraft(world.moduleManifest)
    ? original(world.moduleManifest)!
    : world.moduleManifest;
  for (const [id, values] of rates) {
    const entity = world.entities[id];
    if (!entity) continue;
    for (const d of manifest.definitions) {
      if (d.schema.kind !== 'number') continue;
      const value = entity.actor
        ? readAttribute(entity.actor, d)
        : entity.attributes?.[d.id]?.value;
      const rate = values.get(d.id) ?? 0;
      if (typeof value !== 'number' || !rate) continue;
      const thresholds = [d.schema.min, d.schema.max];
      if (d.concern) {
        thresholds.push(d.concern.below);
        if (d.concern.mode === 'latched')
          thresholds.push(Math.min(d.schema.max, d.concern.below + d.concern.recoveryMargin!));
      }
      for (const t of thresholds)
        if (
          !(value === t && ((t === d.schema.min && rate < 0) || (t === d.schema.max && rate > 0)))
        )
          result = Math.min(result, untilThreshold(value, rate, t));
    }
  }
  return result;
}
