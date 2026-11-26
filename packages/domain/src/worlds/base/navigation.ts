/** Bundled-world follow tuning; the generic executor remains in domain/follow.ts.
 * docs/worlds/base/navigation.md#native-follow
 */
export const FOLLOW_RULES = {
  defaultDistance: 3,
  minimumDistance: 1.5,
  maximumDistance: 12,
  resumeMargin: 0.75,
  repathSeconds: 4,
  targetDisplacement: 1,
  /** Observed travel this far gives behind/beside a direction; less is no evidence. */
  headingEvidence: 0.5,
  /** Holding a behind/beside stance allows this much drift before moving again. */
  slotTolerance: 1,
} as const;

/** Outcomes shared by the live action and its ordinary preview. */
export const FOLLOW_OUTCOMES = {
  started: 'started follow.',
  expired: { code: 'invalid-follow', message: 'That stopping time has already passed.' },
  finiteRequired: {
    code: 'invalid-follow',
    message:
      'Finite proximity movement needs an original stopping time and current sight, without a continuing formation or lost-sight policy.',
  },
  limit: {
    code: 'follow-time-limit',
    message: 'The original following time ended; arrival is not implied.',
  },
  arrived: {
    code: 'follow-arrived',
    message:
      'Reached the selected {distance} m proximity. This movement has ended; no attack was performed.',
  },
  restricted: 'following is no longer available to this body.',
  blocked: 'the following route became physically blocked.',
  lastSeenReached: 'reached where the target was last seen; it is not in view.',
  lastSeenNoRoute: 'no supported route reaches where the target was last seen.',
} as const;
