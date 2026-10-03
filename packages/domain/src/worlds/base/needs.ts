import { DEFAULT_STATUS_EFFECT_POLICY } from './status-effects.js';

/** Base-default description only. Active saved status definitions remain authoritative.
 * docs/worlds/base/survival.md */
function rate(id: string): number {
  const operation = DEFAULT_STATUS_EFFECT_POLICY.definitions
    .find((definition) => definition.id === id)
    ?.whileActive.find((op) => 'changeRate' in op);
  if (!operation || !('changeRate' in operation))
    throw new Error('Missing authored base metabolic rate.');
  return Math.abs(operation.changeRate.amount);
}
export const WILDERNESS_NEEDS = {
  fullnessPerSecond: rate('wilderness:metabolism'),
  starvationDamagePerSecond: rate('wilderness:starvation'),
  exhaustionDamagePerSecond: rate('wilderness:exhaustion'),
} as const;
export const WILDERNESS_NEEDS_GUIDE =
  'Base defaults: metabolism lowers applicable nourishment during sleep as well as waking; starvation and awake exhaustion change bodily health quietly. All active rates come from the current saved status definitions, in attribute units per game second. These defaults do not override creator edits.';
