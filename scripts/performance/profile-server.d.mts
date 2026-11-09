import type { WorldService } from '../../apps/server/src/world-service.js';
import type { SqlDatabase } from '../../apps/server/src/store.js';
import type { ProfilingCase } from './profiling-types.js';
import type { ProfilerSafetyHost } from './profiling-safety.js';

/** Fields consumed by the campaign adapter; the existing JavaScript driver
 * retains its additional observations in the exported raw result. */
export interface ProfileLoadWindow {
  commands: { count: number; p95Ms: number | null };
  errorCount: number;
  skippedIntervals: number;
  movementTriggers: { completed: number };
}
export interface ProfileLoadResult {
  offeredWindow: ProfileLoadWindow;
  measured: ProfileLoadWindow;
}

export function runCampaignHarness(
  item: ProfilingCase,
  hooks: {
    signal?: AbortSignal;
    phase(name: string, detail?: unknown): void;
    driver(pid: number, diagnostics: unknown): void;
    measure(
      operation: (startUnixMs: number) => Promise<ProfileLoadResult>,
      service: WorldService,
      database: SqlDatabase,
    ): Promise<ProfileLoadResult>;
  },
): Promise<unknown>;

export function runCampaignSafety<T>(
  seed: number,
  run: (host: ProfilerSafetyHost) => Promise<T>,
  signal?: AbortSignal,
): Promise<T>;
