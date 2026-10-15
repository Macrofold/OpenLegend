import type { ActorComponent, WorldState } from './types.js';

/** Raw native health has one writer. Callers retain their existing ordered body
 * reconciliation boundary; extraction must not reorder damage, clamps or events.
 * docs/projects/completed/shared-state-contributions-tech-design.md#5-execution-phases-and-deterministic-arbitration
 */
export function setBodyHealth(world: WorldState, actor: ActorComponent, value: number): boolean {
  if (!Number.isFinite(value)) throw new Error('Health must be finite.');
  const definition = world.moduleManifest.definitions.find(
    (d) => d.implementation === 'native-health-v1',
  );
  if (definition?.nativeHealth?.precision === 'whole-points' && value !== actor.health) {
    const delta = value - actor.health;
    value = actor.health + Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta)));
  }
  value = Math.max(0, Math.min(actor.body!.maxHealth, value));
  if (actor.health === value) return false;
  actor.health = value;
  return true;
}
