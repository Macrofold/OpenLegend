import { createHash } from 'node:crypto';
import { monitorEventLoopDelay, PerformanceObserver } from 'node:perf_hooks';

type DurationObserver = (stage: string, milliseconds: number, endedAt: number) => void;
interface DatabaseQueryTally {
  kind: string;
  tables: string[];
  calls: number;
  failed: number;
  returnedRows: number;
  affectedRows: number | null;
  elapsedMs: number;
}
interface Capture {
  active: boolean;
  startedAtUnixMs: number;
  runtimeMonitoring: boolean;
  samples: Map<
    string,
    { count: number; values: number[]; next: number; totalMs: number; maxMs: number }
  >;
  counters: Map<string, number>;
  databaseQueries: Map<string, DatabaseQueryTally>;
  databaseRows: Map<string, { rows: number; bytes: number }>;
  omittedDatabaseQueries: number;
  omittedDatabaseRows: number;
  gauges: Map<string, number>;
  observers: Set<DurationObserver>;
  omitted: { durationEvents: number; counterEvents: number; gaugeEvents: number };
  stopMonitoring?: () => void;
}
interface TimingMark {
  readonly capture: Capture;
  readonly started: number;
}
let capture: Capture | undefined;
export function profilingEnabled(): boolean {
  return capture !== undefined;
}
/** One explicit owner per isolate; importing helpers never starts collection. */
export function startPerformanceCapture(options: { runtimeMonitoring: boolean }): { stop(): void } {
  if (capture) throw new Error('Performance capture is already active.');
  const owned: Capture = {
    active: true,
    startedAtUnixMs: Date.now(),
    runtimeMonitoring: options.runtimeMonitoring,
    samples: new Map(),
    counters: new Map(),
    databaseQueries: new Map(),
    databaseRows: new Map(),
    omittedDatabaseQueries: 0,
    omittedDatabaseRows: 0,
    gauges: new Map(),
    observers: new Set(),
    omitted: { durationEvents: 0, counterEvents: 0, gaugeEvents: 0 },
  };
  capture = owned;
  const stop = () => {
    if (!owned.active) return;
    owned.active = false;
    if (capture === owned) capture = undefined;
    try {
      owned.stopMonitoring?.();
    } finally {
      owned.stopMonitoring = undefined;
      owned.samples.clear();
      owned.counters.clear();
      owned.databaseQueries.clear();
      owned.databaseRows.clear();
      owned.gauges.clear();
      owned.observers.clear();
    }
  };
  try {
    if (options.runtimeMonitoring) owned.stopMonitoring = monitorRuntime(owned);
  } catch (error) {
    stop();
    throw error;
  }
  return { stop };
}
/** Reuse a timestamp already required for admission when the caller has one. */
export function beginTiming(started?: number): TimingMark | undefined {
  const owned = capture;
  return owned && { capture: owned, started: started ?? performance.now() };
}
/** Stopped or replaced captures never read a measurement clock or attribute old work. */
export function elapsedTiming(mark: TimingMark | undefined, endedAt?: number): number | undefined {
  if (!mark || !mark.capture.active || mark.capture !== capture) return;
  return (endedAt ?? performance.now()) - mark.started;
}
export function endTiming(
  stage: string,
  mark: TimingMark | undefined,
  excludedMs = 0,
): number | undefined {
  if (!mark) return;
  const elapsed = elapsedTiming(mark);
  if (elapsed === undefined) return;
  const milliseconds = Math.max(0, elapsed - excludedMs);
  recordCapturedDuration(mark.capture, stage, milliseconds);
  return milliseconds;
}
/** Tools must start their own capture instead of silently receiving an empty profile. */
export function observeDurations(observer: DurationObserver): () => void {
  const owned = capture;
  if (!owned) throw new Error('Start performance capture before observing durations.');
  owned.observers.add(observer);
  return () => {
    owned.observers.delete(observer);
  };
}
function recordCapturedDuration(owned: Capture, stage: string, milliseconds: number): void {
  if (owned.observers.size) {
    const endedAt = performance.now();
    for (const observer of owned.observers) {
      try {
        observer(stage, milliseconds, endedAt);
      } catch {
        owned.observers.delete(observer);
        console.error('Disabled a failed performance observer.');
      }
    }
  }
  if (!owned.active) return;
  let sample = owned.samples.get(stage);
  if (!sample) {
    if (owned.samples.size >= 64) {
      owned.omitted.durationEvents++;
      return;
    }
    owned.samples.set(stage, (sample = { count: 0, values: [], next: 0, totalMs: 0, maxMs: 0 }));
  }
  sample.count++;
  sample.totalMs += milliseconds;
  sample.maxMs = Math.max(sample.maxMs, milliseconds);
  sample.values[sample.next] = milliseconds;
  sample.next = (sample.next + 1) % 256;
}
export function recordDuration(stage: string, milliseconds: number): void {
  const owned = capture;
  if (owned) recordCapturedDuration(owned, stage, milliseconds);
}
export function timedSync<T>(stage: string, operation: () => T): T {
  const mark = beginTiming();
  if (!mark) return operation();
  try {
    return operation();
  } finally {
    endTiming(stage, mark);
  }
}
export async function timed<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  const mark = beginTiming();
  if (!mark) return await operation();
  try {
    return await operation();
  } finally {
    endTiming(stage, mark);
  }
}
export function countMetric(name: string, amount = 1): void {
  const owned = capture;
  if (!owned) return;
  if (owned.counters.has(name) || owned.counters.size < 32)
    owned.counters.set(name, (owned.counters.get(name) ?? 0) + amount);
  else owned.omitted.counterEvents++;
}
/** Optional bounded SQL-template attribution. No parameters or query text leave
 * this owner. These elapsed totals describe the same adapter work as
 * postgres.statement and must not be added to it. */
export function beginDatabaseQuery(sql: string): { mark: TimingMark; key: string } | undefined {
  const mark = beginTiming();
  if (!mark) return;
  const owned = mark.capture;
  const key = createHash('sha256').update(sql).digest('hex').slice(0, 16);
  if (!owned.databaseQueries.has(key)) {
    if (owned.databaseQueries.size >= 256) {
      owned.omittedDatabaseQueries++;
      return;
    }
    const first = /^\s*([A-Z]+)/iu.exec(sql)?.[1]?.toLowerCase() ?? 'other';
    const kind =
      first === 'with'
        ? /\b(?:INSERT|UPDATE|DELETE)\b/iu.test(sql)
          ? 'grouped-write'
          : 'select'
        : first;
    const tables = [
      ...new Set(
        [...sql.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO)\s+([a-z_][a-z_0-9.]*)/giu)].map((match) =>
          match[1]!.toLowerCase(),
        ),
      ),
    ]
      .sort()
      .slice(0, 32);
    owned.databaseQueries.set(key, {
      kind,
      tables,
      calls: 0,
      failed: 0,
      returnedRows: 0,
      affectedRows: ['insert', 'update', 'delete'].includes(kind) ? 0 : null,
      elapsedMs: 0,
    });
  }
  return { mark, key };
}
export function finishDatabaseQuery(
  query: ReturnType<typeof beginDatabaseQuery>,
  result?: { rows: readonly unknown[]; changes: number },
): void {
  if (!query || !query.mark.capture.active || query.mark.capture !== capture) return;
  const tally = query.mark.capture.databaseQueries.get(query.key)!;
  tally.calls++;
  tally.elapsedMs += elapsedTiming(query.mark) ?? 0;
  if (!result) tally.failed++;
  else {
    tally.returnedRows += result.rows.length;
    if (tally.affectedRows !== null) tally.affectedRows += result.changes;
  }
}
/** Rows/bytes already prepared by the canonical writer; never encode to count. */
export function recordDatabaseRows(table: string, rows: number, bytes: number): void {
  const owned = capture;
  if (!owned) return;
  let entry = owned.databaseRows.get(table);
  if (!entry) {
    if (owned.databaseRows.size >= 128) {
      owned.omittedDatabaseRows += rows;
      return;
    }
    owned.databaseRows.set(table, (entry = { rows: 0, bytes: 0 }));
  }
  entry.rows += rows;
  entry.bytes += bytes;
}
export function gaugeMetric(name: string, value: number): void {
  const owned = capture;
  if (!owned) return;
  if (owned.gauges.has(name) || owned.gauges.size < 32) owned.gauges.set(name, value);
  else owned.omitted.gaugeEvents++;
}
type BackgroundFailureOperation =
  | 'memory-search'
  | 'memory-index'
  | 'memory-maintenance'
  | 'intelligence-write'
  | 'navigation-preview'
  | 'simulation-tick'
  | 'decision-admission'
  | 'world-commit';
interface BackgroundFailure {
  operation: BackgroundFailureOperation;
  atUnixMs: number;
  errorClass: string;
  frames?: string[];
  code?: string;
  transactionEntered?: boolean;
  attemptedCalls?: number;
}
const backgroundFailures: BackgroundFailure[] = [];
let backgroundFailuresObserved = 0;
/** Retain safe failure causes without retaining private error text. */
export function recordBackgroundFailure(
  operation: BackgroundFailureOperation,
  error: unknown,
  details: Pick<BackgroundFailure, 'transactionEntered' | 'attemptedCalls'> = {},
): void {
  try {
    const name = error instanceof Error ? error.constructor.name : typeof error;
    const code =
      error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined;
    const failure: BackgroundFailure = {
      operation,
      atUnixMs: performance.timeOrigin + performance.now(),
      errorClass: /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) ? name : 'unknown',
      // Locations only: error messages can contain private game/provider data.
      ...(error instanceof Error && error.stack
        ? {
            frames: error.stack
              .split('\n')
              .slice(1, 9)
              .flatMap((line) => {
                const frame = line.match(
                  /^\s+at .*\/([A-Za-z0-9_.-]+\.[cm]?[jt]s:\d+:\d+)\)?$/,
                )?.[1];
                return frame ? [frame] : [];
              }),
          }
        : {}),
      ...(code && /^(?:busy|[0-9A-Z]{5}|E[A-Z_]{1,63})$/.test(code) ? { code } : {}),
      ...details,
    };
    backgroundFailuresObserved++;
    if (backgroundFailures.length < 20) backgroundFailures.push(failure);
    console.error('Background operation failed.', JSON.stringify(failure));
  } catch {
    console.error('Background failure details were unavailable.');
  }
}
/** Monitoring resources belong to this exact capture, including queued callbacks. */
function monitorRuntime(owned: Capture): () => void {
  const delay = monitorEventLoopDelay({ resolution: 20 });
  let gc: PerformanceObserver | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (timer) clearInterval(timer);
    delay.disable();
    gc?.disconnect();
  };
  try {
    delay.enable();
    gc = new PerformanceObserver((list) => {
      if (!owned.active) return;
      for (const entry of list.getEntries())
        recordCapturedDuration(owned, 'gc.pause', entry.duration);
    });
    gc.observe({ entryTypes: ['gc'] });
    let lastCpu = process.cpuUsage();
    let lastAt = performance.now();
    timer = setInterval(() => {
      if (!owned.active) return;
      const now = performance.now();
      const cpu = process.cpuUsage();
      gaugeMetric(
        'process.cpuPercent',
        ((cpu.user - lastCpu.user + cpu.system - lastCpu.system) / 1000 / (now - lastAt)) * 100,
      );
      const memory = process.memoryUsage();
      gaugeMetric('process.heapUsedBytes', memory.heapUsed);
      gaugeMetric('process.rssBytes', memory.rss);
      if (delay.count) {
        gaugeMetric('eventLoop.p95Ms', delay.percentile(95) / 1e6);
        gaugeMetric('eventLoop.maxMs', delay.max / 1e6);
      } else {
        // An interval without observations establishes no delay, including zero.
        owned.gauges.delete('eventLoop.p95Ms');
        owned.gauges.delete('eventLoop.maxMs');
      }
      lastCpu = cpu;
      lastAt = now;
      delay.reset();
    }, 1000);
    timer.unref();
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}
export function performanceSnapshot() {
  const owned = capture;
  return {
    runtime: {
      uptimeSeconds: process.uptime(),
      profiling: {
        enabled: !!owned,
        startedAtUnixMs: owned?.startedAtUnixMs ?? null,
        runtimeMonitoring: owned?.runtimeMonitoring ?? false,
        omitted: owned
          ? { ...owned.omitted }
          : { durationEvents: 0, counterEvents: 0, gaugeEvents: 0 },
      },
      counters: owned ? Object.fromEntries(owned.counters) : {},
      gauges: owned ? Object.fromEntries(owned.gauges) : {},
      database: {
        queries: owned
          ? Object.fromEntries(
              [...owned.databaseQueries].map(([key, value]) => [
                key,
                { ...value, tables: [...value.tables] },
              ]),
            )
          : {},
        prepared: owned
          ? Object.fromEntries([...owned.databaseRows].map(([key, value]) => [key, { ...value }]))
          : {},
        omittedQueries: owned?.omittedDatabaseQueries ?? 0,
        omittedPreparedRows: owned?.omittedDatabaseRows ?? 0,
      },
      backgroundFailures: {
        observed: backgroundFailuresObserved,
        omitted: backgroundFailuresObserved - backgroundFailures.length,
        samples: backgroundFailures.map((failure) => ({ ...failure })),
      },
    },
    ...Object.fromEntries(
      [...(owned?.samples ?? [])].map(([stage, sample]) => {
        const sorted = [...sample.values].sort((a, b) => a - b);
        const percentile = (p: number) =>
          sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
        return [
          stage,
          {
            count: sample.count,
            totalMs: sample.totalMs,
            maxMs: sample.maxMs,
            retained: sorted.length,
            p50: percentile(0.5),
            p95: percentile(0.95),
            p99: percentile(0.99),
            recentMs: [...sample.values],
          },
        ];
      }),
    ),
  };
}
