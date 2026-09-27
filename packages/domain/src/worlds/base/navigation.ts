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
} as const;
