import { performance } from 'node:perf_hooks';
import { startPerformanceCapture } from '../../apps/server/src/performance.js';
import {
  submittedSqlStatements,
  databaseParameterBytes,
} from '../../apps/server/src/performance-sql.js';
import {
  beginMeasurement,
  pauseMeasurement,
  resumeMeasurement,
  endMeasurement,
  countMeasurementWork,
} from '@open-legend/domain/diagnostic-measurements';

/** Focused future qualification, never imported by plan/report/control. This
 * checks the real capture owner, not a second recorder or a production timer. */
export async function runRecorderSafety() {
  const definitions = [
    { scope: 900001, id: 'Q02.carry', kind: 'active-segments' as const, unit: 'specimen' },
    {
      scope: 900002,
      id: 'Q02.started',
      kind: 'active-segments' as const,
      unit: 'specimen',
      dimensions: ['work'],
    },
  ];
  const checks: Array<{ name: string; passed: boolean; detail?: unknown }> = [];
  const assert = (name: string, passed: boolean, detail?: unknown) => {
    checks.push({ name, passed, detail });
    if (!passed) throw Error(`Recorder safety failed: ${name}.`);
  };
  const capture = startPerformanceCapture({
    runtimeMonitoring: false,
    campaign: {
      definitions,
      selectedScopes: [900001, 900002],
    },
  });
  let old = 0;
  try {
    const carry = beginMeasurement(900001);
    pauseMeasurement(carry);
    const start = performance.now();
    capture.setWindow({ startMs: start, endMs: Infinity, drainUntilMs: Infinity });
    resumeMeasurement(carry);
    endMeasurement(carry);
    const completed = beginMeasurement(900002);
    countMeasurementWork(completed, 7, 0);
    pauseMeasurement(completed);
    await Promise.resolve();
    resumeMeasurement(completed);
    endMeasurement(completed);
    old = beginMeasurement(900002);
    pauseMeasurement(old);
    const cutoff = performance.now();
    capture.cutoff(cutoff, cutoff + 10);
    const drain = await capture.drain(cutoff + 10);
    assert(
      'unfinished-drain-honors-monotonic-deadline',
      drain.status === 'deadline' &&
        drain.pendingAtStart === 1 &&
        drain.pendingAtEnd === 1 &&
        drain.endedAtMs >= drain.deadlineMs,
      drain,
    );
    const snapshot = capture.snapshot().runtime.campaign!;
    const rows = snapshot.metrics as Array<Record<string, unknown>>;
    const carryRow = rows.find((row) => row.id === 'Q02.carry')!,
      startedRow = rows.find((row) => row.id === 'Q02.started')!;
    assert(
      'carry-in-not-started-latency',
      carryRow.carryIn === 1 && carryRow.eligible === 0,
      carryRow,
    );
    assert('unfinished-cutoff-recorded', startedRow.unfinishedAtCutoff === 1, startedRow);
    assert(
      'unresolved-operation-is-censored',
      startedRow.censored === 1 &&
        Array.isArray(startedRow.lowerBoundLatenciesMs) &&
        startedRow.lowerBoundLatenciesMs.length === 1,
      startedRow,
    );
    assert(
      'token-work-count-is-actual',
      Array.isArray(startedRow.startedOperationWork) && startedRow.startedOperationWork[0] === 7,
      startedRow,
    );
    assert(
      'capture-has-no-recorder-failures',
      snapshot.failures.length === 0 && snapshot.omittedTokens === 0,
      snapshot.failures,
    );
    const latency = startedRow.latency as { count: number; histogram: { counts: number[] } };
    assert(
      'whole-window-histogram-counts',
      latency.count === 1 && latency.histogram.counts.reduce((sum, count) => sum + count, 0) === 1,
      latency,
    );
  } finally {
    capture.stop();
  }
  const fresh = startPerformanceCapture({
    runtimeMonitoring: false,
    campaign: {
      definitions,
      selectedScopes: [900002],
      window: { startMs: performance.now(), endMs: Infinity, drainUntilMs: Infinity },
    },
  });
  try {
    assert('unselected-scope-has-no-token', beginMeasurement(900001) === 0);
    const current = beginMeasurement(900002);
    endMeasurement(old);
    endMeasurement(current);
    endMeasurement(current);
    const snapshot = fresh.snapshot().runtime.campaign!;
    const currentRow = snapshot.metrics.find(
      (row) => row.id === 'Q02.started',
    ) as unknown as Record<string, unknown>;
    assert(
      'stale-token-cannot-close-new-capture',
      currentRow.completed === 1 && snapshot.failures.length === 0,
      currentRow,
    );
  } finally {
    fresh.stop();
  }
  assert(
    'statement-count-not-adapter-count',
    submittedSqlStatements(
      "SELECT ';' AS value; /* ; */ SELECT 1; DO $$ BEGIN PERFORM 1; END $$;",
    ) === 3,
  );
  assert(
    'unknown-parameter-bytes-are-not-zero',
    databaseParameterBytes([{ private: 'not serialized by the meter' }]) === null,
  );
  return { checks }; // Every value above is asserted against the actual recorder; no synthetic replay counters.
}
