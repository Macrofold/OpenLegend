import display from './world-control-display.json' with { type: 'json' };

/** The application owns this control receipt's wording; formatting grants no
 * authority to change the clock or the saved host settings. */
export function worldControlOutcome(paused: boolean, speed: number) {
  return {
    ok: true as const,
    code: 'control' as const,
    message: paused ? display.paused : `${display.runningPrefix}${speed}${display.runningSuffix}`,
  };
}

export const CONTROL_SPEEDS: readonly number[] = display.speeds;

/** Speed is application control policy, independent of the simulation owner. */
export function worldSpeedRefusal(
  speed: number | undefined,
  godMode: boolean,
  canCreate: () => boolean,
) {
  if (speed === undefined) return undefined;
  if (!godMode || !canCreate())
    return {
      ok: false as const,
      code: 'forbidden',
      message: 'Game speed is available in God mode only.',
    };
  if (!CONTROL_SPEEDS.includes(speed))
    return { ok: false as const, code: 'speed', message: 'Choose 0.5×, 1×, 3× or 8×.' };
}
