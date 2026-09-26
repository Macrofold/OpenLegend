import type { ActorComponent } from './types.js';

/** Raw native health has one writer. Callers retain their existing ordered body
 * reconciliation boundary; extraction must not reorder damage, clamps or events.
 * docs/projects/shared-state-contributions-tech-design.md#5-execution-phases-and-deterministic-arbitration
 */
export function setBodyHealth(actor: ActorComponent, value: number): boolean {
  if (!Number.isFinite(value)) throw new Error('Health must be finite.');
  if (actor.health === value) return false;
  actor.health = value;
  return true;
}
