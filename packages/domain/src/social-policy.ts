import { selectedSocialDefaults } from './world-composition.js';
import type { WorldState } from './types.js';

/** Missing settings use their selected world owner. Complete admitted policies are
 * read directly on conversation/event paths, without copying them every interval. */
export function selectedSocialPolicy(world: WorldState) {
  const policy = world.socialPolicy;
  if (policy?.conversationInactivitySeconds !== undefined && policy.notableThreshold !== undefined)
    return policy;
  const defaults = selectedSocialDefaults(world);
  if (!policy) return defaults;
  return {
    conversationInactivitySeconds:
      policy.conversationInactivitySeconds === undefined
        ? defaults.conversationInactivitySeconds
        : policy.conversationInactivitySeconds,
    notableThreshold:
      policy.notableThreshold === undefined ? defaults.notableThreshold : policy.notableThreshold,
  };
}

/** Saved settings must support elapsed-time expiry and numerical event retention.
 * Zero expiry and any finite retention threshold remain usable authored choices. */
export function validateSocialPolicy(world: WorldState): void {
  const stored = world.socialPolicy;
  if (stored !== undefined && (!stored || typeof stored !== 'object' || Array.isArray(stored)))
    throw new Error('The world’s social settings must be an object.');
  const policy = selectedSocialPolicy(world);
  if (
    !Number.isFinite(policy.conversationInactivitySeconds) ||
    policy.conversationInactivitySeconds < 0
  )
    throw new Error('Conversation inactivity must be a finite nonnegative duration.');
  if (!Number.isFinite(policy.notableThreshold))
    throw new Error('Event retention importance must have a finite threshold.');
}
