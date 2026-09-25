/** Bundled integration fidelity, not a clock conversion or universal world law.
 * docs/worlds/base/time.md */
export const BASE_TIME_POLICY = {
  idleHorizonSeconds: 60,
  perceptionTravelMetres: 1,
  blockedFlightRetrySeconds: 5,
  fullnessBoundaries: [0, 10, 30, 38, 42, 100],
  energyBoundaries: [0, 5, 25, 70, 100],
} as const;
