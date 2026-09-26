import type { ActorComponent, Entity } from '../../types.js';
import { setBodyHealth } from '../../body-state.js';

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
  } else if (!hasWildernessNeeds(actor) || !Number.isFinite(value))
    throw new Error('Wilderness need is not applicable.');
  const next = Math.max(0, Math.min(100, value));
  if (actor[need] === next) return;
  const key = need === 'fullness' ? 'fullnessRevision' : 'energyRevision';
  const revision = (actor[key] ?? 0) + 1;
  if (!Number.isSafeInteger(revision)) throw new Error('Need revision exhausted.');
  actor[need] = next;
  actor[key] = revision;
}
export function advanceWildernessNeeds(entity: Entity, seconds: number): boolean {
  const actor = entity.actor!;
  if (!hasWildernessNeeds(actor)) return false;
  const previous = actor.health;
  setWildernessNeed(
    actor,
    'fullness',
    actor.fullness - WILDERNESS_NEEDS.fullnessPerSecond * seconds,
  );
  if (actor.fullness === 0)
    setBodyHealth(
      actor,
      Math.max(0, actor.health - WILDERNESS_NEEDS.starvationDamagePerSecond * seconds),
    );
  if (actor.energy === 0)
    setBodyHealth(
      actor,
      Math.max(0, actor.health - WILDERNESS_NEEDS.exhaustionDamagePerSecond * seconds),
    );
  return actor.health !== previous;
}
