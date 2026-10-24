import { selectedSocialDefaults } from './world-composition.js';
import type { WorldState } from './types.js';

/** The selected world owns event-retention tuning; it cannot prescribe social choices. */
export function selectedSocialPolicy(world: WorldState) {
  return world.socialPolicy === undefined ? selectedSocialDefaults(world) : world.socialPolicy;
}
export function validateSocialPolicy(world: WorldState): void {
  const policy = selectedSocialPolicy(world);
  if (
    !policy ||
    typeof policy !== 'object' ||
    Array.isArray(policy) ||
    Object.keys(policy).some((key) => key !== 'notableThreshold') ||
    !Number.isFinite(policy.notableThreshold)
  )
    throw new Error('The world’s social settings require only a finite event-retention threshold.');
}
