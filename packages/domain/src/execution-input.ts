/** Pure optional-input arithmetic. World families own profiles and consequences;
 * callers own authority, exact action binding and commitment. */
export interface ExecutionBands {
  positiveRadius: number;
  ordinaryRadius: number;
  penaltyTailWidth: number;
}
export interface TimedReleaseProfile {
  kind: 'timed-release';
  periodSeconds: number;
  center: number;
  greenWidth: number;
  ordinaryWidth: number;
  labels?: { instruction: string; poor: string; ordinary: string; excellent: string };
}
export type TimedReleaseInput = { kind: 'ordinary' } | { kind: 'timed-release'; phase: number };
export interface ExecutionAssessment {
  score: number;
  quality: 'poor' | 'ordinary' | 'excellent';
  mode: 'ordinary' | 'manual';
}
/** Unsaved, finite simulation-time permission. The host owns real-time expiry. */
export interface AdmittedWorldInput {
  actorId: string;
  steering?: {
    direction: { x: number; z: number };
    startsAt: number;
    endsAt: number;
  };
  release?: { actionId: string; startsAt: number; endsAt: number };
}
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function validBands(value: ExecutionBands): boolean {
  return (
    finite(value.positiveRadius) &&
    value.positiveRadius > 0 &&
    finite(value.ordinaryRadius) &&
    value.ordinaryRadius > value.positiveRadius &&
    finite(value.penaltyTailWidth) &&
    value.penaltyTailWidth > 0
  );
}
export function evaluateExecutionDeviation(
  deviation: number,
  bands: ExecutionBands,
): number | undefined {
  if (!finite(deviation) || deviation < 0 || !validBands(bands)) return undefined;
  const score =
    deviation <= bands.positiveRadius
      ? 1 - deviation / bands.positiveRadius
      : deviation <= bands.ordinaryRadius
        ? 0
        : -Math.min(1, (deviation - bands.ordinaryRadius) / bands.penaltyTailWidth);
  for (const anchor of [-1, 0, 1])
    if (Math.abs(score - anchor) <= 16 * Number.EPSILON) return anchor;
  return Math.max(-1, Math.min(1, score));
}
export function timedReleaseLandmarks(profile: TimedReleaseProfile) {
  const radii = [
    profile.center - profile.ordinaryWidth,
    profile.center - profile.greenWidth,
    profile.center,
    profile.center + profile.greenWidth,
    profile.center + profile.ordinaryWidth,
  ];
  return {
    ascending: radii.map((radius) => radius / 2),
    descending: radii.map((radius) => 1 - radius / 2),
  };
}
/** Wire and saved-state readers share the same finite evidence vocabulary. */
export function validTimedReleaseInput(value: unknown): value is TimedReleaseInput {
  if (!record(value)) return false;
  const keys = Object.keys(value);
  if (value.kind === 'ordinary') return keys.length === 1;
  return (
    value.kind === 'timed-release' &&
    keys.length === 2 &&
    finite(value.phase) &&
    value.phase >= 0 &&
    value.phase < 1
  );
}
export function validTimedReleaseProfile(value: unknown): value is TimedReleaseProfile {
  if (
    !record(value) ||
    value.kind !== 'timed-release' ||
    !finite(value.periodSeconds) ||
    value.periodSeconds <= 0 ||
    !finite(value.center) ||
    value.center <= 0 ||
    value.center >= 1 ||
    !finite(value.greenWidth) ||
    value.greenWidth <= 0 ||
    !finite(value.ordinaryWidth) ||
    value.ordinaryWidth <= value.greenWidth ||
    value.ordinaryWidth > Math.min(value.center, 1 - value.center) ||
    value.ordinaryWidth >= Math.max(value.center, 1 - value.center)
  )
    return false;
  const labels = value.labels;
  if (
    labels !== undefined &&
    (!record(labels) ||
      ['instruction', 'poor', 'ordinary', 'excellent'].some((key) => {
        const label = labels[key];
        return typeof label !== 'string' || !label.trim() || label.length > 1000;
      }))
  )
    return false;
  const points = timedReleaseLandmarks(value as unknown as TimedReleaseProfile);
  return (
    points.ascending.every(
      (point, index, all) =>
        finite(point) && point >= 0 && point <= 0.5 && (!index || point > all[index - 1]!),
    ) &&
    points.descending.every(
      (point, index, all) =>
        finite(point) && point >= 0.5 && point <= 1 && (!index || point < all[index - 1]!),
    ) &&
    points.ascending[2]! > 0 &&
    points.ascending[2]! < 0.5 &&
    points.descending[2]! > 0.5 &&
    points.descending[2]! < 1
  );
}
function assessment(score: number, mode: ExecutionAssessment['mode']): ExecutionAssessment {
  return { score, quality: score > 0 ? 'excellent' : score < 0 ? 'poor' : 'ordinary', mode };
}
export function evaluateTimedRelease(
  profile: TimedReleaseProfile,
  input: TimedReleaseInput,
): ExecutionAssessment | undefined {
  if (!validTimedReleaseProfile(profile)) return undefined;
  if (input.kind === 'ordinary') return assessment(0, 'ordinary');
  if (input.kind !== 'timed-release' || !finite(input.phase) || input.phase < 0 || input.phase >= 1)
    return undefined;
  const points = timedReleaseLandmarks(profile);
  let deviation = Math.abs(1 - Math.abs(2 * input.phase - 1) - profile.center);
  for (const half of [points.ascending, points.descending]) {
    if (input.phase === half[2]) deviation = 0;
    else if (input.phase === half[1] || input.phase === half[3]) deviation = profile.greenWidth;
    else if (input.phase === half[0] || input.phase === half[4]) deviation = profile.ordinaryWidth;
  }
  const score = evaluateExecutionDeviation(deviation, {
    positiveRadius: profile.greenWidth,
    ordinaryRadius: profile.ordinaryWidth,
    penaltyTailWidth: Math.max(profile.center, 1 - profile.center) - profile.ordinaryWidth,
  });
  return score === undefined ? undefined : assessment(score, 'manual');
}
