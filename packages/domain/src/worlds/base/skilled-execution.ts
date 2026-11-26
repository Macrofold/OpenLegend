import arms from './config/armament-manufacture.json' with { type: 'json' };
import type { AttackExecutionProfile } from '../../combat-execution.js';

/** Selected world tuning; docs/worlds/base/skilled-action-execution.md. */
const profile = { ...arms.bowExecution.profile, kind: 'timed-release' as const };
export const BASE_ATTACK_EXECUTION = {
  sling: { profile, contact: { positive: 0.25, negative: 0.1 } },
  bow: { profile, contact: arms.bowExecution.contact },
  spear: {
    profile,
    contact: { positive: 0.15, negative: 0.1 },
    injury: { positive: 0.1, negative: 0.1 },
  },
  hammer: { profile, injury: { positive: 0.25, negative: 0.1 } },
} satisfies Record<string, AttackExecutionProfile>;
export const BASE_LOCAL_AVOIDANCE = {
  bodyProfiles: ['person', 'deer'],
  heightFactor: 0.45,
  holdSeconds: 12,
  cooldownSeconds: 60,
  contextFactor: 1,
  contractedText: 'ducked beneath an incoming projectile.',
  restoredText: 'returned to an upright posture.',
  clearedText: 'was missed by the passing projectile.',
  postureHeldText: 'Wait until this body can stand before beginning that work.',
};

export const BASE_SKILLED_TEXT = {
  sourceUnavailable: 'This attack is unavailable in the current world or body.',
  postureHeld: BASE_LOCAL_AVOIDANCE.postureHeldText,
  recoveredRelease: 'A recovered action uses ordinary execution.',
  invalidRelease: 'Choose a valid release.',
  strikeChanged: 'That prepared strike is no longer available.',
  targetUnavailable: 'The selected target is unavailable.',
  noHeldRelease: 'This weapon has no held release.',
  outOfRange: 'Move within shot range first.',
  releaseAlreadyRequested: 'A release has already been requested.',
  releaseRequested: 'Release requested; preparation is still underway.',
};
