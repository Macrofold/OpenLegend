import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { monitorEventLoopDelay, PerformanceObserver } from 'node:perf_hooks';
import { installMeasurementSink } from '@open-legend/domain/diagnostic-measurements';
import {
  CampaignMeasurements,
  type CampaignCaptureOptions,
  type CampaignDrainResult,
  type CampaignWindow,
} from './performance-campaign.js';
import {
  databaseParameterBytes,
  databaseSqlTemplate,
  databaseWireCounters,
  submittedSqlStatements,
  type DatabaseMeasurementOwner,
  type DatabaseWireCounters,
} from './performance-sql.js';
import { endMeasurement } from '@open-legend/domain/diagnostic-measurements';
import type { Worker } from 'node:worker_threads';
export type { DatabaseMeasurementOwner } from './performance-sql.js';
export type {
  CampaignCaptureOptions,
  CampaignMeasurementDefinition,
  CampaignMeasurementKind,
  CampaignWindow,
} from './performance-campaign.js';

type DurationObserver = (stage: string, milliseconds: number, endedAt: number) => void;
interface DatabaseQueryTally {
  kind: string;
  tables: string[];
  aggregation: 'normalized-template' | 'owner-family' | 'template-overflow';
  calls: number;
  failed: number;
  returnedRows: number;
  affectedRows: number | null;
  elapsedMs: number;
  owner?: DatabaseMeasurementOwner;
  submittedStatements?: number;
  clientSubmissions?: number;
  parameterCount?: number;
  knownParameterBytes?: number;
  unknownParameterCalls?: number;
  sqlBytes?: number;
  protocolReadBytes?: number;
  protocolWrittenBytes?: number;
  unavailableWireCalls?: number;
  censoredCalls?: number;
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
  omittedDatabaseRows: number;
  gauges: Map<string, number>;
  observers: Set<DurationObserver>;
  omitted: { durationEvents: number; counterEvents: number; gaugeEvents: number };
  stopMonitoring?: () => void;
  campaign?: CampaignMeasurements;
  databaseOperations: Map<
    string,
    { count: number; failed: number; waitMs: number; holdMs: number }
  >;
  stopSqlDecode?: () => void;
  id: string;
  databaseWireInFlight: Map<unknown, { count: number; exclusive?: DatabaseQueryObservation }>;
  workers: Map<Worker, string>;
  workerExitListeners: Map<Worker, () => void>;
  workerCollection?: Promise<unknown[]>;
  stopWorkerCollections: Set<() => void>;
  workerInstruments?: WorkerMeasurementInstruments;
}
export interface WorkerMeasurementInstruments {
  cpu?: boolean;
  allocation?: boolean;
  cpuIntervalUs?: number;
  allocationIntervalBytes?: number;
}
export interface WorkerPerformanceConfiguration {
  captureId: string;
  campaign: CampaignCaptureOptions;
  instruments?: WorkerMeasurementInstruments;
  parentClock: { beforeUnixMs: number; monoMs: number; afterUnixMs: number };
}
interface TimingMark {
  readonly capture: Capture;
  readonly started: number;
}
let capture: Capture | undefined;
let captureSequence = 0;
const groupedWriteCapture = new AsyncLocalStorage<{
  capture: Capture;
  owner: DatabaseMeasurementOwner;
  grouped: boolean;
}>();
const groupedWriteKey = 'family:grouped-write';
const overflowQueryKey = 'family:template-overflow';
const maximumQueryTemplates = 256;
function databaseQueryTally(
  kind: string,
  tables: string[],
  aggregation: DatabaseQueryTally['aggregation'],
): DatabaseQueryTally {
  return {
    kind,
    tables,
    aggregation,
    calls: 0,
    failed: 0,
    returnedRows: 0,
    affectedRows: ['insert', 'update', 'delete'].includes(kind) ? 0 : null,
    elapsedMs: 0,
  };
}
export function profilingEnabled(): boolean {
  // Campaign sites are independently selected. Legacy producers must not prepare
  // every optional clock/argument merely because a leaf capture is active.
  return capture !== undefined && capture.campaign === undefined;
}
/** One explicit owner per isolate; importing helpers never starts collection. */
export function startPerformanceCapture(options: {
  runtimeMonitoring: boolean;
  campaign?: CampaignCaptureOptions;
  workerInstruments?: WorkerMeasurementInstruments;
}): {
  stop(): { discardedMeasurementTokens: number };
  snapshot(): ReturnType<typeof performanceSnapshot>;
  drain(deadlineMs?: number): Promise<CampaignDrainResult>;
  setWindow(window: CampaignWindow): void;
  cutoff(endMs: number, drainUntilMs: number): void;
} {
  if (capture) throw new Error('Performance capture is already active.');
  const owned: Capture = {
    active: true,
    startedAtUnixMs: Date.now(),
    runtimeMonitoring: options.runtimeMonitoring,
    samples: new Map(),
    counters: new Map(),
    // Fixed aggregate families cannot compete with exact shapes for capacity.
    // Unknown shapes still contribute every completed adapter call after the cap.
    databaseQueries: new Map([
      [groupedWriteKey, databaseQueryTally('grouped-write', [], 'owner-family')],
      [overflowQueryKey, databaseQueryTally('other', [], 'template-overflow')],
    ]),
    databaseRows: new Map(),
    omittedDatabaseRows: 0,
    gauges: new Map(),
    observers: new Set(),
    omitted: { durationEvents: 0, counterEvents: 0, gaugeEvents: 0 },
    databaseOperations: new Map(),
    id: options.campaign?.captureId ?? `${process.pid}:${++captureSequence}`,
    databaseWireInFlight: new Map(),
    workers: new Map(),
    workerExitListeners: new Map(),
    stopWorkerCollections: new Set(),
    workerInstruments: options.workerInstruments,
  };
  capture = owned;
  let discardedMeasurementTokens = 0;
  const stop = () => {
    if (!owned.active) return { discardedMeasurementTokens };
    owned.active = false;
    if (capture === owned) capture = undefined;
    try {
      owned.stopMonitoring?.();
    } finally {
      discardedMeasurementTokens = owned.campaign?.stop() ?? 0;
      owned.stopSqlDecode?.();
      owned.stopSqlDecode = undefined;
      owned.campaign = undefined;
      owned.stopMonitoring = undefined;
      owned.samples.clear();
      owned.counters.clear();
      owned.databaseQueries.clear();
      owned.databaseRows.clear();
      owned.databaseOperations.clear();
      owned.databaseWireInFlight.clear();
      for (const cancel of owned.stopWorkerCollections) cancel();
      owned.stopWorkerCollections.clear();
      owned.workerCollection = undefined;
      for (const worker of owned.workers.keys()) {
        try {
          worker.postMessage({ type: 'profiling-stop', captureId: owned.id });
        } catch {
          // An exited worker already released its isolate-owned resources.
        }
      }
      for (const [worker, listener] of owned.workerExitListeners) worker.off('exit', listener);
      owned.workerExitListeners.clear();
      owned.workers.clear();
      owned.gauges.clear();
      owned.observers.clear();
    }
    return { discardedMeasurementTokens };
  };
  try {
    if (options.campaign) {
      if (options.runtimeMonitoring)
        throw new Error(
          'Campaign resource observations must use their explicitly selected instrument.',
        );
      owned.campaign = new CampaignMeasurements({ ...options.campaign, captureId: owned.id });
      const detachSink = installMeasurementSink(owned.campaign);
      owned.campaign.bindDetach(() => {
        detachSink();
        owned.stopSqlDecode?.();
        owned.stopSqlDecode = undefined;
      });
    }
    if (options.runtimeMonitoring) owned.stopMonitoring = monitorRuntime(owned);
  } catch (error) {
    stop();
    throw error;
  }
  return {
    stop,
    snapshot: () => {
      if (capture !== owned || !owned.active)
        throw new Error('This performance capture is stopped.');
      return performanceSnapshot();
    },
    drain: (deadlineMs) => {
      if (capture !== owned || !owned.active || !owned.campaign)
        throw new Error('No active campaign capture.');
      return owned.campaign.drain(deadlineMs);
    },
    setWindow: (window) => {
      if (capture !== owned || !owned.active || !owned.campaign)
        throw new Error('No active campaign capture.');
      owned.campaign.setWindow(window);
      for (const worker of owned.workers.keys()) {
        try {
          worker.postMessage({ type: 'profiling-window', captureId: owned.id, window });
        } catch {
          owned.campaign.failure();
        }
      }
    },
    cutoff: (endMs, drainUntilMs) => {
      if (capture !== owned || !owned.active || !owned.campaign)
        throw new Error('No active campaign capture.');
      owned.campaign.cutoff(endMs, drainUntilMs);
      for (const worker of owned.workers.keys()) {
        try {
          worker.postMessage({
            type: 'profiling-cutoff',
            captureId: owned.id,
            endMs,
            drainUntilMs,
          });
        } catch {
          owned.campaign.failure();
        }
      }
    },
  };
}
/** Reuse a timestamp already required for admission when the caller has one. */
export function beginTiming(started?: number): TimingMark | undefined {
  const owned = capture;
  return owned && !owned.campaign
    ? { capture: owned, started: started ?? performance.now() }
    : undefined;
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
  if (owned.campaign)
    throw new Error('Campaign duration selection uses numeric scope definitions.');
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
  if (owned && !owned.campaign) recordCapturedDuration(owned, stage, milliseconds);
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
  if (!owned || owned.campaign) return;
  if (owned.counters.has(name) || owned.counters.size < 32)
    owned.counters.set(name, (owned.counters.get(name) ?? 0) + amount);
  else owned.omitted.counterEvents++;
}
/** The explicit batch owner names this family; varying CTE/parameter shapes do
 * not consume normalized-template slots. The adapter remains the sole query timer.
 * Attribution belongs to this capture even while its write waits in a queue. */
export function withGroupedWriteAttribution<T>(operation: () => Promise<T>): Promise<T> {
  const owned = capture;
  if (!owned || (owned.campaign && !owned.campaign.enabled)) return operation();
  const previous = groupedWriteCapture.getStore();
  return groupedWriteCapture.run(
    { capture: owned, owner: previous?.capture === owned ? previous.owner : 'save', grouped: true },
    operation,
  );
}
/** Reuse the existing submission context. No extra reader, global current owner
 * or new asynchronous context layer is introduced by the SQL mode. */
export function withDatabaseAttribution<T>(owner: DatabaseMeasurementOwner, operation: () => T): T {
  const owned = capture;
  if (!owned?.campaign?.enabled || !owned.campaign.sql) return operation();
  const previous = groupedWriteCapture.getStore();
  return groupedWriteCapture.run(
    { capture: owned, owner, grouped: previous?.capture === owned && previous.grouped },
    operation,
  );
}
export function databaseMeasurementOwner(): DatabaseMeasurementOwner {
  const value = groupedWriteCapture.getStore();
  return value && value.capture === capture ? value.owner : 'unmapped';
}
export function sqlProfilingEnabled(): boolean {
  return !!capture?.campaign?.enabled && capture.campaign.sql;
}
export function performanceCampaignSnapshot() {
  return capture?.campaign?.snapshot() ?? null;
}
/** Explicit worker startup configuration; no provider/world data is included. */
export function workerPerformanceConfiguration(
  isolate: string,
): WorkerPerformanceConfiguration | undefined {
  const owned = capture;
  if (!owned?.campaign?.enabled) return;
  const beforeUnixMs = Date.now(),
    monoMs = performance.now(),
    afterUnixMs = Date.now();
  return {
    captureId: owned.id,
    campaign: { ...owned.campaign.workerConfiguration(), captureId: owned.id, isolate },
    instruments: owned.workerInstruments,
    parentClock: { beforeUnixMs, monoMs, afterUnixMs },
  };
}
export function registerPerformanceWorker(worker: Worker, isolate: string): void {
  const owned = capture;
  if (!owned?.campaign?.enabled) return;
  if (owned.workers.size >= 64 && !owned.workers.has(worker)) {
    owned.campaign.failure();
    return;
  }
  owned.workers.set(worker, `${isolate}:${worker.threadId}`);
  const exited = () => {
    owned.workerExitListeners.delete(worker);
    // Setup may create and close workers before installing the measured world.
    // Their absence is not a missing observation of the measured interval.
    if (owned.active && !owned.campaign?.windowStarted(performance.now()))
      owned.workers.delete(worker);
  };
  owned.workerExitListeners.set(worker, exited);
  worker.once('exit', exited);
}
/** One export per worker after cutoff/drain. This never starts or restarts a
 * worker, and a missing reply is a measurement failure, not a gameplay retry. */
export async function collectPerformanceWorkers(
  timeoutMs = 10_000,
  drainUntilMs?: number,
): Promise<unknown[]> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 125_000)
    throw new Error('Invalid worker measurement export deadline.');
  const owned = capture;
  if (!owned?.campaign) return [];
  if (owned.workerCollection) return owned.workerCollection;
  owned.workerCollection = Promise.all(
    [...owned.workers].map(
      ([worker, isolate]) =>
        new Promise<unknown>((resolve) => {
          if (worker.threadId < 0) {
            resolve({
              isolate,
              status: 'failed',
              reason: 'Worker exited during or after the measurement window, before export.',
            });
            return;
          }
          let complete = false;
          const finish = (value: unknown) => {
            if (complete) return;
            complete = true;
            clearTimeout(timer);
            worker.off('message', reply);
            worker.off('exit', exited);
            owned.stopWorkerCollections.delete(cancel);
            resolve(value);
          };
          const reply = (message: { type?: string; captureId?: string; report?: unknown }) => {
            if (message.type === 'profiling-export' && message.captureId === owned.id)
              finish({ isolate, status: 'collected', report: message.report });
          };
          const exited = () =>
            finish({
              isolate,
              status: 'failed',
              reason: 'Worker exited before measurement export.',
            });
          const timer = setTimeout(
            () =>
              finish({ isolate, status: 'failed', reason: 'Worker measurement export timed out.' }),
            timeoutMs,
          );
          timer.unref();
          const cancel = () =>
            finish({
              isolate,
              status: 'failed',
              reason: 'Measurement capture stopped during export.',
            });
          owned.stopWorkerCollections.add(cancel);
          worker.on('message', reply);
          worker.on('exit', exited);
          try {
            worker.postMessage({ type: 'profiling-export', captureId: owned.id, drainUntilMs });
          } catch {
            finish({
              isolate,
              status: 'failed',
              reason: 'Worker measurement export could not be sent.',
            });
          }
        }),
    ),
  );
  return owned.workerCollection;
}
export function beginCampaignOperation(id: string, units = 1): number {
  return capture?.campaign?.beginNamed(id, units) ?? 0;
}
interface DatabaseQueueObservation {
  capture: Capture;
  owner: DatabaseMeasurementOwner;
  lane: 'read' | 'write';
  queuedAt: number;
  admittedAt?: number;
  waitToken: number;
  holdToken?: number;
}
export function beginDatabaseQueue(
  name: string,
  queuedAt: number,
): DatabaseQueueObservation | undefined {
  const owned = capture;
  if (
    !owned?.campaign?.enabled ||
    !owned.campaign.sql ||
    (name !== 'postgres' && name !== 'postgres.read')
  )
    return;
  return {
    capture: owned,
    owner: databaseMeasurementOwner(),
    lane: name === 'postgres.read' ? 'read' : 'write',
    queuedAt,
    waitToken: owned.campaign.beginNamed('S13.01.wait'),
  };
}
export function admitDatabaseQueue(value: DatabaseQueueObservation | undefined, at: number): void {
  if (
    !value ||
    value.capture !== capture ||
    !value.capture.active ||
    !value.capture.campaign?.enabled
  )
    return;
  endMeasurement(value.waitToken);
  value.admittedAt = at;
  value.holdToken = value.capture.campaign?.beginNamed('S13.01.hold');
}
export function finishDatabaseQueue(
  value: DatabaseQueueObservation | undefined,
  failed = false,
): void {
  if (
    !value ||
    value.capture !== capture ||
    !value.capture.active ||
    !value.capture.campaign?.enabled
  )
    return;
  const now = performance.now();
  endMeasurement(
    value.admittedAt === undefined ? value.waitToken : (value.holdToken ?? 0),
    failed ? (value.admittedAt === undefined ? 'timeout' : 'error') : 'success',
  );
  if (
    !value.capture.campaign?.withinWindow(value.queuedAt) ||
    !value.capture.campaign.withinDrain(now)
  )
    return;
  const key = `${value.owner}:${value.lane}`;
  const data = value.capture.databaseOperations.get(key) ?? {
    count: 0,
    failed: 0,
    waitMs: 0,
    holdMs: 0,
  };
  data.count++;
  if (failed) data.failed++;
  data.waitMs += (value.admittedAt ?? now) - value.queuedAt;
  if (value.admittedAt !== undefined) data.holdMs += now - value.admittedAt;
  value.capture.databaseOperations.set(key, data);
}
interface DatabaseQueryObservation {
  mark: TimingMark;
  key: string;
  statements?: number;
  parameterCount?: number;
  parameterBytes?: number | null;
  sqlBytes?: number;
  wire?: DatabaseWireCounters;
  client?: unknown;
  token?: number;
  submittedAt?: number;
  returnedAt?: number;
  measured?: boolean;
  wireRegistered?: boolean;
  wireOverlap?: boolean;
}
/** Optional bounded SQL-template attribution. No parameters or query text leave
 * this owner. These elapsed totals describe the same adapter work as
 * postgres.statement and must not be added to it. */
export function beginDatabaseQuery(
  sql: string,
  params?: readonly unknown[],
  client?: unknown,
  submittedSql = sql,
  submittedOwner?: DatabaseMeasurementOwner,
): DatabaseQueryObservation | undefined {
  const current = capture;
  if (!current || (current.campaign && (!current.campaign.enabled || !current.campaign.sql)))
    return;
  const mark = current.campaign ? { capture: current, started: performance.now() } : beginTiming();
  if (!mark) return;
  const owned = mark.capture;
  const currentOwner = databaseMeasurementOwner();
  const owner = currentOwner === 'unmapped' ? (submittedOwner ?? 'unmapped') : currentOwner;
  const attribution = groupedWriteCapture.getStore();
  const grouped = attribution?.capture === owned && attribution.grouped;
  const normalized = grouped ? '' : databaseSqlTemplate(sql);
  const templateKey = grouped
    ? groupedWriteKey
    : createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  const key = owned.campaign ? `${owner}:${templateKey}` : templateKey;
  const observation: DatabaseQueryObservation = { mark, key };
  if (owned.campaign) {
    observation.statements = submittedSqlStatements(submittedSql);
    observation.parameterCount = params?.length ?? 0;
    observation.parameterBytes = databaseParameterBytes(params ?? []);
    observation.sqlBytes = Buffer.byteLength(submittedSql);
    observation.wire = databaseWireCounters(client);
    observation.client = client;
  }
  if (!owned.databaseQueries.has(key)) {
    if (owned.databaseQueries.size >= maximumQueryTemplates + 2) {
      const overflow = owned.campaign ? `${owner}:${overflowQueryKey}` : overflowQueryKey;
      if (!owned.databaseQueries.has(overflow))
        owned.databaseQueries.set(overflow, {
          ...databaseQueryTally('other', [], 'template-overflow'),
          owner,
        });
      return { ...observation, key: overflow };
    }
    const first = /^\s*([A-Z]+)/iu.exec(normalized)?.[1]?.toLowerCase() ?? 'other';
    const kind =
      first === 'with'
        ? /\b(?:INSERT|UPDATE|DELETE)\b/iu.test(normalized)
          ? 'grouped-write'
          : 'select'
        : first;
    const tables = [
      ...new Set(
        [...normalized.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO)\s+([a-z_][a-z_0-9.]*)/giu)].map(
          (match) => match[1]!.toLowerCase(),
        ),
      ),
    ]
      .sort()
      .slice(0, 32);
    owned.databaseQueries.set(key, {
      ...databaseQueryTally(
        grouped ? 'grouped-write' : kind,
        tables,
        grouped ? 'owner-family' : 'normalized-template',
      ),
      ...(owned.campaign ? { owner } : {}),
    });
  }
  return observation;
}
export function submitDatabaseQuery(query: DatabaseQueryObservation | undefined): void {
  if (
    !query ||
    query.mark.capture !== capture ||
    !query.mark.capture.active ||
    !query.mark.capture.campaign?.enabled
  )
    return;
  if (query.client && query.wire) {
    const active = query.mark.capture.databaseWireInFlight.get(query.client);
    if (active) {
      active.count++;
      if (active.exclusive) active.exclusive.wireOverlap = true;
      active.exclusive = undefined;
      query.wireOverlap = true;
    } else
      query.mark.capture.databaseWireInFlight.set(query.client, { count: 1, exclusive: query });
    query.wireRegistered = true;
  }
  query.submittedAt = performance.now();
  query.token = query.mark.capture.campaign.beginNamed('S13.04.submit');
  query.measured = query.mark.capture.campaign.withinWindow(query.submittedAt);
  if (!query.measured) return;
  const tally = query.mark.capture.databaseQueries.get(query.key)!;
  tally.submittedStatements = (tally.submittedStatements ?? 0) + (query.statements ?? 0);
  tally.clientSubmissions = (tally.clientSubmissions ?? 0) + 1;
  tally.parameterCount = (tally.parameterCount ?? 0) + (query.parameterCount ?? 0);
  tally.knownParameterBytes = (tally.knownParameterBytes ?? 0) + (query.parameterBytes ?? 0);
  tally.unknownParameterCalls =
    (tally.unknownParameterCalls ?? 0) + Number(query.parameterBytes === null);
  tally.sqlBytes = (tally.sqlBytes ?? 0) + (query.sqlBytes ?? 0);
}
export function returnedDatabaseQuery(query: DatabaseQueryObservation | undefined): void {
  if (
    !query ||
    query.mark.capture !== capture ||
    !query.mark.capture.active ||
    !query.mark.capture.campaign?.enabled
  )
    return;
  query.returnedAt = performance.now();
  endMeasurement(query.token ?? 0);
}
export function finishDatabaseQuery(
  query: ReturnType<typeof beginDatabaseQuery>,
  result?: { rows: readonly unknown[]; changes: number },
  raw?: unknown,
): void {
  if (!query || !query.mark.capture.active || query.mark.capture !== capture) return;
  if (query.mark.capture.campaign && !query.mark.capture.campaign.enabled) return;
  const tally = query.mark.capture.databaseQueries.get(query.key)!;
  if (query.wireRegistered) {
    const active = query.mark.capture.databaseWireInFlight.get(query.client);
    if (active && --active.count === 0)
      query.mark.capture.databaseWireInFlight.delete(query.client);
    query.wireRegistered = false;
  }
  if (query.mark.capture.campaign) {
    if (query.returnedAt === undefined)
      endMeasurement(query.token ?? 0, result ? 'success' : 'error');
    if (!query.measured) return;
    if (!query.mark.capture.campaign.withinDrain(query.returnedAt ?? performance.now())) {
      tally.censoredCalls = (tally.censoredCalls ?? 0) + 1;
      return;
    }
  }
  tally.calls++;
  tally.elapsedMs +=
    query.submittedAt !== undefined
      ? (query.returnedAt ?? performance.now()) - query.submittedAt
      : (elapsedTiming(query.mark) ?? 0);
  if (query.mark.capture.campaign) {
    const after = databaseWireCounters(query.client);
    if (
      !query.wireOverlap &&
      query.wire &&
      after &&
      after.read >= query.wire.read &&
      after.written >= query.wire.written
    ) {
      tally.protocolReadBytes = (tally.protocolReadBytes ?? 0) + after.read - query.wire.read;
      tally.protocolWrittenBytes =
        (tally.protocolWrittenBytes ?? 0) + after.written - query.wire.written;
    } else tally.unavailableWireCalls = (tally.unavailableWireCalls ?? 0) + 1;
  }
  if (!result) tally.failed++;
  else {
    const results = Array.isArray(raw) ? raw : raw ? [raw] : [result];
    for (const item of results) {
      const value = item as {
        rows?: readonly unknown[];
        rowCount?: number;
        changes?: number;
        command?: string;
      };
      tally.returnedRows += value.rows?.length ?? 0;
      if (tally.affectedRows !== null) tally.affectedRows += value.rowCount ?? value.changes ?? 0;
    }
  }
}
/** Installed only for a selected SQL driver-decode series, and restored by the
 * same capture. This times pg's actual field parsing, not callback waiting. */
export function observeDatabaseDecoder(prototype: object | undefined): void {
  const owned = capture;
  if (!owned?.campaign?.sql || !owned.campaign.scope('S13.04.driverDecode') || owned.stopSqlDecode)
    return;
  const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'handleDataRow');
  if (!prototype || !descriptor || typeof descriptor.value !== 'function') {
    owned.campaign.failure();
    return;
  }
  const original = descriptor.value as (this: unknown, message: unknown) => unknown;
  const decodeScope = owned.campaign.scope('S13.04.driverDecode');
  const measured = function (this: unknown, message: unknown) {
    const token =
      owned.active && capture === owned ? (owned.campaign?.begin(decodeScope, 1, 0) ?? 0) : 0;
    let failed = false;
    try {
      return original.call(this, message);
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      endMeasurement(token, failed ? 'error' : 'success');
    }
  };
  try {
    Object.defineProperty(prototype, 'handleDataRow', { ...descriptor, value: measured });
  } catch {
    owned.campaign.failure();
    return;
  }
  owned.stopSqlDecode = () => {
    try {
      if (Object.getOwnPropertyDescriptor(prototype, 'handleDataRow')?.value === measured)
        Object.defineProperty(prototype, 'handleDataRow', descriptor);
    } catch {
      owned.campaign?.failure();
    }
  };
}
/** Rows/bytes already prepared by the canonical writer; never encode to count. */
export function recordDatabaseRows(table: string, rows: number, bytes: number): void {
  const owned = capture;
  if (!owned || (owned.campaign && (!owned.campaign.enabled || !owned.campaign.sql))) return;
  if (owned.campaign && !owned.campaign.withinWindow(performance.now())) return;
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
  if (!owned || owned.campaign) return;
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
        mode: owned?.campaign ? 'campaign' : owned ? 'recent' : 'off',
        omitted: owned
          ? { ...owned.omitted }
          : { durationEvents: 0, counterEvents: 0, gaugeEvents: 0 },
      },
      campaign: owned?.campaign?.snapshot() ?? null,
      counters: owned ? Object.fromEntries(owned.counters) : {},
      gauges: owned ? Object.fromEntries(owned.gauges) : {},
      database: {
        operations: owned
          ? Object.fromEntries(
              [...owned.databaseOperations].map(([key, value]) => [key, { ...value }]),
            )
          : {},
        accounting: owned?.campaign?.sql
          ? {
              statementMeaning:
                'Submitted SQL statements; actual backend execution comes from PostgreSQL statistics.',
              windowMeaning:
                'Query and queue submissions begun in the measured window; completions observed through drain. Carry-in window activity is separate in scope metrics. Unresolved submissions are not zero-cost completions.',
              roundTripMeaning:
                'Client submissions are logical request/reply exchanges, not TCP packet counts.',
              parameterBytesMeaning:
                'Known encoded primitive/binary payload; unsupported driver preparation is counted separately.',
              wireBytesMeaning:
                'Socket deltas include protocol framing; no parameter values or SQL text are exported.',
            }
          : null,
        queries: owned
          ? Object.fromEntries(
              [...owned.databaseQueries].map(([key, value]) => [
                key,
                {
                  ...value,
                  tables: [...value.tables],
                  unresolvedOrCensoredCalls:
                    value.clientSubmissions === undefined
                      ? null
                      : value.clientSubmissions - value.calls,
                },
              ]),
            )
          : {},
        prepared: owned
          ? Object.fromEntries([...owned.databaseRows].map(([key, value]) => [key, { ...value }]))
          : {},
        omittedQueries: 0,
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
