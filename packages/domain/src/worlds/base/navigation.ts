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
