/** The application owns this control receipt's wording; formatting grants no
 * authority to change the clock or the saved host settings. */
export function worldControlOutcome(paused: boolean, speed: number) {
  return {
    ok: true as const,
    code: 'control' as const,
    message: paused ? 'World paused.' : `World running at ${speed}×.`,
  };
}

export const CONTROL_SPEEDS: readonly number[] = [0.5, 1, 3, 8];

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
