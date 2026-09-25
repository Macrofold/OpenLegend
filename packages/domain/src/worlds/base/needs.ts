import type { ActorComponent, Entity } from '../../types.js';

// Base-world seeking, eating, sleep and cognitive concern use distinct thresholds.
// docs/worlds/base/survival.md
export const WILDERNESS_NEEDS = {
  fullnessPerSecond: 0.003,
  starvationDamagePerSecond: 0.009,
  exhaustionDamagePerSecond: 0.003,
} as const;
export function hasWildernessNeeds(
  actor: ActorComponent,
): actor is ActorComponent & { fullness: number; energy: number } {
  return (
    actor.capabilities?.needs !== false &&
    actor.fullness !== undefined &&
    actor.energy !== undefined
  );
}
export function nativeNeedBelow(
  actor: ActorComponent,
  need: 'fullness' | 'energy',
  threshold: number,
): boolean {
  return hasWildernessNeeds(actor) && actor[need] < threshold;
}
/** Native actions, rest, editors and physiology share this value owner. */
export function setWildernessNeed(
  actor: ActorComponent,
  need: 'fullness' | 'energy',
  value: number,
): void {
  if (need === 'energy') {
    if (!Number.isFinite(actor.energy) || !Number.isFinite(value))
      throw new Error('Energy is not applicable.');
    actor.energy = Math.max(0, Math.min(100, value));
    return;
  }
  if (!hasWildernessNeeds(actor) || !Number.isFinite(value))
    throw new Error('Wilderness need is not applicable.');
  actor[need] = Math.max(0, Math.min(100, value));
}
export function advanceWildernessNeeds(
  entity: Entity,
  seconds: number,
  exhaustedSeconds = entity.actor?.energy === 0 ? seconds : 0,
): boolean {
  const actor = entity.actor!;
  if (!hasWildernessNeeds(actor)) return false;
  const previous = actor.health;
  const starvingSeconds = Math.max(
    0,
    seconds - actor.fullness / WILDERNESS_NEEDS.fullnessPerSecond,
  );
  setWildernessNeed(
    actor,
    'fullness',
    actor.fullness - WILDERNESS_NEEDS.fullnessPerSecond * seconds,
  );
  // Depletion at the end cannot charge damage for the preceding fed interval.
  actor.health = Math.max(
    0,
    actor.health -
      WILDERNESS_NEEDS.starvationDamagePerSecond * starvingSeconds -
      WILDERNESS_NEEDS.exhaustionDamagePerSecond * exhaustedSeconds,
  );
  return actor.health !== previous;
}
