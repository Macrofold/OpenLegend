import { distance, hasLineOfSight } from './spatial.js';
import type { Position, WorldState } from './types.js';

/** Prototype sight is deliberately broad and distance-only. Hearing retains its
 * existing range/rock obstruction rule rather than growing with visual range. */
export const PERCEPTION_RULES = { sightRadius: 28, hearingRadius: 10 } as const;

export function canSee(from: Position, to: Position): boolean {
  return distance(from, to) <= PERCEPTION_RULES.sightRadius;
}

export function canHear(world: WorldState, from: Position, to: Position): boolean {
  return distance(from, to) <= PERCEPTION_RULES.hearingRadius && hasLineOfSight(world, from, to);
}
