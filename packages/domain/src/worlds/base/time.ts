/** Bundled normal-time conversion and integration fidelity, never universal world law.
 * docs/worlds/base/time.md */
export const BASE_TIME_POLICY = {
  normalGameSecondsPerSecond: 60,
  idleHorizonSeconds: 60,
  maxAdvanceSeconds: 86400,
  perceptionTravelMetres: 4,
} as const;

/** Immutable selected forecast data; current reads reuse this one object. */
export const BASE_SIMULATION_TIME_RULES = {
  idleHorizonSeconds: BASE_TIME_POLICY.idleHorizonSeconds,
  perceptionTravelMetres: BASE_TIME_POLICY.perceptionTravelMetres,
  maxAdvanceSeconds: BASE_TIME_POLICY.maxAdvanceSeconds,
  invalidDurationMessage: 'Supply zero to one game day and a bounded positive interval count.',
} as const;
