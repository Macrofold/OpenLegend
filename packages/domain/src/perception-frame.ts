import { isSafeRecordId } from './records.js';
import type { Entity, WorldState } from './types.js';

const features = new WeakMap<Entity, { feature: string; detail: string }>();

/** Only current coarse outward facts, not physiology, private traits or intentions.
 * Add supported detail here when a real sensory consumer exists, not by hashing the whole entity.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export function visibleFeature(entity: Entity): { feature: string; detail: string } {
  // Static frozen roots dominate large scenes. Mutable builders are never cache keys.
  const cached = Object.isFrozen(entity) ? features.get(entity) : undefined;
  if (cached) return cached;
  const facts = [
    entity.actor ? '' : entity.name,
    entity.kind,
    entity.appearance ?? 'sprite',
    entity.actor
      ? entity.actor.alive
        ? entity.actor.incapacitated
          ? 'incapacitated'
          : 'alive'
        : 'dead'
      : '',
    entity.heat ? (entity.heat.lit ? 'burning' : 'unlit') : '',
    entity.resource ? (entity.resource.quantity > 0 ? 'material present' : 'depleted') : '',
    entity.remains ? (entity.remains.harvested ? 'harvested' : 'unharvested') : '',
  ];
  const value = { feature: JSON.stringify(facts), detail: facts.filter(Boolean).join(', ') };
  if (Object.isFrozen(entity)) features.set(entity, value);
  return value;
}

export function validatePerceptionState(world: WorldState): void {
  const values = world.perceptionFeatures;
  if (
    !values ||
    typeof values !== 'object' ||
    Array.isArray(values) ||
    Object.entries(values).some(
      ([id, value]) => !isSafeRecordId(id) || typeof value !== 'string' || value.length > 2048,
    )
  )
    throw new Error('Invalid saved perception feature baseline.');
}
