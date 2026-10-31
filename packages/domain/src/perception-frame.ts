import type { Entity } from './types.js';

const features = new WeakMap<Entity, { activity: string | undefined; signature: string }>();

/** Only current coarse outward facts, not physiology, private traits or intentions.
 * Add supported detail here when a real sensory consumer exists, not by hashing the whole entity.
 * Keep sensoryDraftWrites coverage in draft.ts synchronized when adding outward fields.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export function outwardFeatureSignature(entity: Entity, activity: string | undefined): string {
  // Static frozen roots dominate large scenes. Mutable builders are never cache keys.
  const cached = Object.isFrozen(entity) ? features.get(entity) : undefined;
  if (cached && cached.activity === activity) return cached.signature;
  const facts = [
    entity.actor ? '' : entity.name,
    entity.kind,
    entity.appearance ?? 'sprite',
    ...outwardStates(entity),
  ];
  // Physical posture changes wake the existing exposure owner. Target identity stays
  // out of this generic descriptor; the personal cue adapter checks both exposures.
  const value = JSON.stringify([facts, activity]);
  if (Object.isFrozen(entity)) features.set(entity, { activity, signature: value });
  return value;
}
/** The coarse outward states of a source, in fixed positions (empty when not applicable):
 * life, heat, resource and remains. Stimulus salience keys on these, never on names. */
export function outwardStates(entity: Entity): [string, string, string, string] {
  return [
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
}
