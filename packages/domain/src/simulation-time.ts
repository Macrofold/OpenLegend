import { isDraft, original } from 'immer';
import { statusDefinitions } from './status-capabilities.js';
import {
  effectBindings,
  readEntityAttribute,
  type StatusCondition,
  type StatusRateInterval,
} from './status-effects.js';
import { attributeDefinition, readAttribute } from './world-modules.js';
import type { Entity, WorldState } from './types.js';

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
  return time >= 0 ? Math.max(TIME_EPSILON, time) : Infinity;
}
/** A compound condition can only change when one of its numeric/clock leaves changes. */
function conditionBoundary(
  world: WorldState,
  entity: Entity,
  state: Parameters<typeof effectBindings>[2],
  condition: StatusCondition,
  rates: AttributeRates,
): number {
  if ('all' in condition || 'any' in condition)
    return Math.min(
      ...('all' in condition ? condition.all : condition.any).map((c) =>
        conditionBoundary(world, entity, state, c, rates),
      ),
    );
  if ('dailyWindow' in condition) {
    const hour =
      (((world.simTime / 3600 + world.statusEffectPolicy.clockOffsetHours) % 24) + 24) % 24;
    return Math.min(
      ...[condition.dailyWindow.start, condition.dailyWindow.end].map((h) => {
        const seconds = ((h - hour + 24) % 24) * 3600;
        return seconds < TIME_EPSILON ? 86400 : seconds;
      }),
    );
  }
  if (!('compare' in condition)) return Infinity;
  const c = condition.compare,
    b = effectBindings(world, entity, state);
  const target =
    c.target === '$subject' ? b.subject : c.target === '$source' ? b.source : b.actionTarget;
  const value = readEntityAttribute(world, target, c.attribute);
  if (!target || typeof value !== 'number') return Infinity;
  const rate = rates.get(target.id)?.get(c.attribute) ?? 0;
  const schema = attributeDefinition(world, c.attribute)?.schema;
  // A saturated outward rate cannot change a predicate, including a strict equality.
  if (
    schema?.kind === 'number' &&
    ((value <= schema.min && rate < 0) || (value >= schema.max && rate > 0))
  )
    return Infinity;
  return untilThreshold(value, rate, c.value);
}
export function statusBoundary(
  world: WorldState,
  entities: readonly string[],
  rates: AttributeRates,
): number {
  let result = Infinity;
  for (const id of entities) {
    const entity = world.entities[id];
    if (!entity) continue;
    for (const d of statusDefinitions(world)) {
      const state = entity.statusEffects?.[d.id];
      if (!d.enabled && !state?.active) continue;
      if (!state?.active && state && state.automaticAfter > world.simTime)
        result = Math.min(result, state.automaticAfter - world.simTime);
      const conditions = [
        d.requires,
        ...(state?.active
          ? [
              d.automaticDeactivation,
              ...d.whileActive.map((op) => ('changeRate' in op ? op.when : undefined)),
            ]
          : [d.activationCondition, d.automaticActivation]),
      ];
      for (const c of conditions)
        if (c) result = Math.min(result, conditionBoundary(world, entity, state, c, rates));
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
      if (d.concern)
        thresholds.push(
          d.concern.below,
          Math.min(d.schema.max, d.concern.below + (d.schema.max - d.schema.min) * 0.05),
        );
      for (const t of thresholds)
        if (
          !(value === t && ((t === d.schema.min && rate < 0) || (t === d.schema.max && rate > 0)))
        )
          result = Math.min(result, untilThreshold(value, rate, t));
    }
  }
  return result;
}
