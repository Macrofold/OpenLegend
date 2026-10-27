import type { AttackExecutionProfile } from '../../combat-execution.js';

/** Selected world tuning; docs/worlds/base/skilled-action-execution.md. */
const profile = {
  kind: 'timed-release' as const,
  periodSeconds: 1,
  center: 0.5,
  greenWidth: 0.06,
  ordinaryWidth: 0.15,
  labels: {
    instruction:
      'Release in the inner patterned band for strong timing, or the outer band for ordinary timing. Timing does not guarantee a hit.',
    poor: 'Poor timing',
    ordinary: 'Ordinary timing',
    excellent: 'Strong timing',
  },
};
export const BASE_ATTACK_EXECUTION = {
  sling: { profile, contact: { positive: 0.25, negative: 0.1 } },
  bow: { profile, contact: { positive: 0.2, negative: 0.1 } },
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
};

export const BASE_SKILLED_TEXT = {
  sourceUnavailable: 'This attack is unavailable in the current world or body.',
  postureHeld: 'Wait until this body can stand before beginning that work.',
  recoveredRelease: 'A recovered action uses ordinary execution.',
  invalidRelease: 'Choose a valid release.',
  strikeChanged: 'That prepared strike is no longer available.',
  targetUnavailable: 'The selected target is unavailable.',
  noHeldRelease: 'This weapon has no held release.',
  outOfRange: 'Move within shot range first.',
  releaseAlreadyRequested: 'A release has already been requested.',
  releaseRequested: 'Release requested; preparation is still underway.',
};
