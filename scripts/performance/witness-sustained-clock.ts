import type { SustainedClockSample } from './witness-sustained-client-contract.js';

export interface HealthProbe {
  scheduledAt: number;
  at: number;
  receivedAt?: number;
  gameSeconds?: number;
  configuredSpeed?: number;
  error?: string;
}

/** A stream view was produced before receipt. Inspect's clock read occurs
 * after dispatch. Pair the two sides to bound progress on this monotonic
 * fixture timeline without treating stream delivery delay as game time. */
export function summarizeClock(
  clock: readonly SustainedClockSample[],
  health: readonly HealthProbe[],
  start: number,
  end: number,
  cutoff: number,
  clockRatio: number,
) {
  const opening = clock.find((sample) => sample.boundary === start)?.receipt;
  function inspectedAtOrAfter(boundary: number) {
    const probe = health.find((sample) => sample.scheduledAt === boundary);
    return probe &&
      probe.at >= boundary &&
      probe.receivedAt !== undefined &&
      !probe.error &&
      probe.configuredSpeed === 1 &&
      Number.isFinite(probe.gameSeconds)
      ? probe.gameSeconds
      : undefined;
  }
  const inspectedStart = inspectedAtOrAfter(start);
  const samples = clock
    .filter((sample) => sample.boundary <= cutoff)
    .map(({ boundary, receipt }) => {
      const offeredGameSeconds = ((boundary - start) / 1000) * clockRatio;
      const streamObservedGameSeconds =
        receipt && opening ? receipt.gameSeconds - opening.gameSeconds : undefined;
      const lowerBoundGameSeconds =
        receipt && inspectedStart !== undefined
          ? Math.max(0, receipt.gameSeconds - inspectedStart)
          : undefined;
      return {
        boundary,
        receivedAt: receipt?.at,
        sampleAgeMs: receipt && boundary - receipt.at,
        gameSeconds: receipt?.gameSeconds,
        speed: receipt?.speed,
        paused: receipt?.paused,
        pauseReason: receipt?.pauseReason,
        preparingNavigation: receipt?.preparingNavigation,
        offeredGameSeconds,
        streamObservedGameSeconds,
        streamObservedShortfallGameSeconds:
          streamObservedGameSeconds === undefined
            ? undefined
            : offeredGameSeconds - streamObservedGameSeconds,
        lowerBoundGameSeconds,
        upperBoundShortfallGameSeconds:
          lowerBoundGameSeconds === undefined
            ? undefined
            : offeredGameSeconds - lowerBoundGameSeconds,
      };
    });
  const earlyClientEnd = cutoff < end;
  const final = samples.at(-1);
  if (earlyClientEnd || final?.boundary !== end)
    return { samples, earlyClientEnd, streamObservedFraction: null, fractionBounds: null };
  const inspectedEnd = inspectedAtOrAfter(end);
  const upperBoundGameSeconds =
    opening && inspectedEnd !== undefined ? inspectedEnd - opening.gameSeconds : undefined;
  return {
    samples,
    earlyClientEnd,
    streamObservedFraction:
      final.streamObservedGameSeconds === undefined
        ? null
        : final.streamObservedGameSeconds / final.offeredGameSeconds,
    fractionBounds: {
      lower:
        final.lowerBoundGameSeconds === undefined
          ? null
          : final.lowerBoundGameSeconds / final.offeredGameSeconds,
      upper:
        upperBoundGameSeconds === undefined
          ? null
          : upperBoundGameSeconds / final.offeredGameSeconds,
    },
  };
}
