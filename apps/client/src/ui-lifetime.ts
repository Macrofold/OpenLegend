/** Presentation-only time. Gameplay work/effects must retain their own clock and admission.
 * docs/timed-ui.md#2-explicit-clock-domains */
export class PresentationClock {
  private lastMs: number | null = null;
  private wasPaused = true;
  private elapsedMs = 0;
  get now(): number {
    return this.elapsedMs;
  }
  sample(nowMs: number, paused: boolean): number {
    if (!Number.isFinite(nowMs)) throw new Error('Invalid presentation clock sample.');
    if (this.lastMs !== null && !this.wasPaused && !paused)
      this.elapsedMs += Math.max(0, nowMs - this.lastMs);
    this.lastMs = nowMs;
    this.wasPaused = paused;
    return this.elapsedMs;
  }
}
export interface PresentationLifetime {
  durationMs: number;
  startedAt: number | null;
}
export function createLifetime(durationMs: number): PresentationLifetime {
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('Invalid UI duration.');
  return { durationMs, startedAt: null };
}
export function activateLifetime(lifetime: PresentationLifetime, nowMs: number): void {
  if (!Number.isFinite(nowMs)) throw new Error('Invalid UI start time.');
  lifetime.startedAt ??= nowMs;
}
export function sampleLifetime(lifetime: PresentationLifetime, nowMs: number, paused = false) {
  const remainingMs = Math.max(
    0,
    lifetime.durationMs -
      (lifetime.startedAt === null ? 0 : Math.max(0, nowMs - lifetime.startedAt)),
  );
  return {
    state:
      remainingMs === 0
        ? ('expired' as const)
        : lifetime.startedAt === null
          ? ('queued' as const)
          : paused
            ? ('paused' as const)
            : ('running' as const),
    remainingMs,
    remainingFraction: lifetime.durationMs ? remainingMs / lifetime.durationMs : 0,
  };
}
