import { parentPort, workerData } from 'node:worker_threads';
import { PostgresDatabase } from './postgres.js';
import { applyJournalRange, JournalTableWriter } from './journal-application.js';
import { observeDurations, startPerformanceCapture } from './performance.js';
import type {
  ApplicationWorkerData,
  ApplicationRequest,
  ApplicationReply,
  ApplicationStatistics,
} from './journal-worker-client.js';
const { source, profiling } = workerData as ApplicationWorkerData;
const capture = profiling ? startPerformanceCapture({ runtimeMonitoring: false }) : undefined;
const port = parentPort;
if (!port) {
  capture?.stop();
  throw new Error('Journal application requires its owner.');
}
port.on('close', () => capture?.stop());
let active = false,
  busy = false;
const reply = (message: ApplicationReply) => port.postMessage(message);
const db = new PostgresDatabase(source.url, false, source.writeGroups, 'application', () => {
  active = false;
  reply({ type: 'failed', error: 'The application database reservation is unavailable.' });
});
const tables = new JournalTableWriter(db);
port.on('message', async (request: ApplicationRequest) => {
  if (request.type === 'activate' && !active && !busy) {
    active = true;
    reply({ type: 'active' });
    return;
  }
  if (request.type !== 'apply' || !active || busy) {
    reply({ type: 'failed', error: 'Journal worker admission is unavailable.' });
    return;
  }
  busy = true;
  const started = profiling ? performance.now() : undefined;
  const statistics: ApplicationStatistics | undefined = profiling
    ? {
        batches: 1,
        unobservedBatches: 0,
        statements: 0,
        sqlAwaitMs: 0,
        maxSqlMs: 0,
        elapsedMs: 0,
      }
    : undefined;
  const stop = statistics
    ? observeDurations((stage, duration) => {
        if (stage !== 'postgres.statement') return;
        statistics.statements++;
        statistics.sqlAwaitMs += duration;
        statistics.maxSqlMs = Math.max(statistics.maxSqlMs, duration);
      })
    : undefined;
  try {
    const entries = new Map(request.entries);
    if (entries.size !== request.range.through - request.range.first + 1)
      throw new Error('Journal worker is missing an exact online preparation.');
    const result = await applyJournalRange(db, request.range, entries, (entry, prepared) =>
      tables.apply(entry, prepared),
    );
    if (statistics && started !== undefined) statistics.elapsedMs = performance.now() - started;
    // The shared transaction promise resolves AFTER COMMIT, never after enqueue.
    reply({ type: 'complete', result, ...(statistics ? { statistics } : {}) });
  } catch (error) {
    active = false;
    reply({
      type: 'failed',
      error: error instanceof Error ? error.message : 'Journal application failed.',
    });
  } finally {
    stop?.();
    busy = false;
  }
});
// The parent must confirm its ORIGINAL live primary after this shared hold,
// then activate us. A late obsolete worker cannot join a replacement writer.
try {
  await db.confirmApplicationLease();
  reply({ type: 'ready' });
} catch (error) {
  capture?.stop();
  throw error;
}
