import type { Entity, WorldState } from './types.js';
import { selectedObservationRules } from './world-composition.js';

const features = new WeakMap<
  Entity,
  { activity: string | undefined; rules: object; signature: string }
>();

/** Only current coarse outward facts, not physiology, private traits or intentions.
 * Add supported detail here when a real sensory consumer exists, not by hashing the whole entity.
 * Keep sensoryDraftWrites coverage in draft.ts synchronized when adding outward fields.
 * docs/architecture.md#change-driven-exposure-and-reaction-intake
 */
export function outwardFeatureSignature(
  world: Pick<WorldState, 'profile'>,
  entity: Entity,
  activity: string | undefined,
): string {
  const rules = selectedObservationRules(world);
  // Static frozen roots dominate large scenes. Mutable builders are never cache keys.
  const cached = Object.isFrozen(entity) ? features.get(entity) : undefined;
  if (cached && cached.activity === activity && cached.rules === rules) return cached.signature;
  const facts = [
    entity.actor ? '' : entity.name,
    entity.kind,
    entity.appearance ?? 'sprite',
    ...outwardStates(world, entity),
  ];
  // Physical posture changes wake the existing exposure owner. Target identity stays
  // out of this generic descriptor; the personal cue adapter checks both exposures.
  const value = JSON.stringify([facts, activity]);
  if (Object.isFrozen(entity)) features.set(entity, { activity, rules, signature: value });
  return value;
}
/** The coarse outward states of a source, in fixed positions (empty when not applicable):
 * life, heat, resource and remains. Stimulus salience keys on these, never on names. */
export function outwardStates(
  world: Pick<WorldState, 'profile'>,
  entity: Entity,
): [string, string, string, string] {
  const words = selectedObservationRules(world).outward;
  return [
    entity.actor
      ? entity.actor.alive
        ? entity.actor.incapacitated
          ? words.incapacitated
          : words.alive
        : words.dead
      : '',
    entity.heat ? (entity.heat.lit ? words.burning : words.unlit) : '',
    entity.resource ? (entity.resource.quantity > 0 ? words.materialPresent : words.depleted) : '',
    entity.remains ? (entity.remains.harvested ? words.harvested : words.unharvested) : '',
  ];
}
