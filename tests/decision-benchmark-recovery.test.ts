import { describe, expect, it } from 'vitest';
import { sha256 } from '../scripts/decision-benchmark/corpus.js';
import type { RunRecord } from '../scripts/decision-benchmark/evaluate.js';
import type {
  BenchmarkJournalEvent,
  BenchmarkManifest,
} from '../scripts/decision-benchmark/journal.js';
import {
  buildRecoveryPlan,
  mergeRecoveryResults,
  type MacrofoldRecoveryProof,
} from '../scripts/decision-benchmark/recovery.js';

const model = 'meta/muse-spark-1.3-contributor';
const at = '2026-10-15T22:00:00.000Z';
const hash = 'a'.repeat(64);
const originalRun = 'original-run';
const manifest: BenchmarkManifest = {
  version: 'openlegend-decisions-expanded-2026-10-15',
  corpusDigest: hash,
  executionDigest: hash,
  gitCommit: 'b'.repeat(40),
  runId: '11111111-1111-4111-8111-111111111111',
  models: [model],
  priorCommitmentUsd: 0.04,
  maxCostUsd: 0.1,
  capUsd: 50,
  concurrency: 4,
  timeoutMs: 180000,
  baseUrl: 'http://localhost:3210',
  billingMode: 'managed',
  startedAt: at,
};
function sourceRecord(sceneId = 'scene-a'): RunRecord {
  const requestId = `olbench:${manifest.runId}:${sceneId}:0`;
  return {
    model,
    sceneId,
    requestId,
    inputDigest: hash,
    result: {
      outcome: 'failed',
      reason: 'provider_failed',
      receipt: {
        provider: 'macrofold',
        requestedModel: model,
        model,
        modelVersionStatus: 'unavailable',
        requestId,
        contextDigest: hash,
        startedAt: at,
        completedAt: at,
        latencyMs: 100,
        dispatched: true,
        completionUncertain: false,
        providerRequestId: originalRun,
        estimatedCostUsd: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    },
  };
}
function journal(record = sourceRecord()): BenchmarkJournalEvent[] {
  const key = `${record.model}:${record.sceneId}`;
  return [
    { event: 'admitted', key, requestId: record.requestId, reservedUsd: 0.01, at },
    { event: 'accepted', key, requestId: record.requestId, runId: originalRun, at },
    { event: 'result', key, requestId: record.requestId, record, at },
  ];
}
const expected = new Map([[`${model}:scene-a`, hash]]);
function proof(): MacrofoldRecoveryProof {
  return {
    runId: originalRun,
    status: {
      id: originalRun,
      kind: 'inference',
      model,
      status: 'failed',
      failure_code: 'run_budget_exhausted',
      cost_micro_usd: '0',
    },
    result: {
      run_id: originalRun,
      final: true,
      execution_outcome: 'failure',
      inference: {
        model,
        outcome: 'failed',
        provider_outcome: 'not_invoked',
        provider_request_digest: null,
        validation: { status: 'not_run' },
      },
    },
  };
}
function plan(record = sourceRecord(), evidence = proof()) {
  return buildRecoveryPlan(manifest, journal(record), expected, [evidence]);
}
function recovered(record = sourceRecord()): RunRecord {
  const copy = structuredClone(record);
  copy.requestId = 'a-fresh-recovery-request';
  copy.result.receipt.requestId = copy.requestId;
  copy.result.receipt.providerRequestId = 'fresh-recovery-run';
  copy.result.receipt.estimatedCostUsd = 0.0001;
  copy.result.receipt.usage = { inputTokens: 1000, outputTokens: 100 };
  copy.result = {
    ...copy.result,
    outcome: 'value',
    value: { answers: { 'question-a': { type: 'noul', noul: 1 } } },
  };
  return copy;
}

describe('explicit recovery of never-invoked Macrofold budget refusals', () => {
  it('binds exact source, input, receipt and authoritative proof without making any request', () => {
    const original = sourceRecord(),
      evidence = proof();
    const recovery = plan(original, evidence);
    expect(recovery).toMatchObject({
      sourceRunId: manifest.runId,
      sourceManifestDigest: sha256(manifest),
      sourceJournalDigest: sha256(journal(original)),
      priorCommitmentUsd: 0.04,
      capUsd: 50,
      selections: [
        {
          key: `${model}:scene-a`,
          model,
          sceneId: 'scene-a',
          inputDigest: hash,
          originalRequestId: original.requestId,
          originalRunId: originalRun,
          proofDigest: sha256(evidence),
          originalRecordDigest: sha256(original),
        },
      ],
    });
  });

  it('refuses source admissions that have not completed', () => {
    expect(() => buildRecoveryPlan(manifest, journal().slice(0, 2), expected, [proof()])).toThrow(
      'unfinished admissions',
    );
  });

  it('retains outstanding cost from unrelated uncertain model executions', () => {
    const original = sourceRecord('scene-b');
    original.result.receipt.providerRequestId = 'other-run';
    original.result.receipt.completionUncertain = true;
    const otherEvents = journal(original).map((event) =>
      event.event === 'accepted' ? { ...event, runId: 'other-run' } : event,
    );
    const events = [...journal(), ...otherEvents];
    const inputs = new Map([...expected, [`${model}:scene-b`, hash]]);
    expect(buildRecoveryPlan(manifest, events, inputs, [proof()]).priorCommitmentUsd).toBe(0.05);
  });

  it('refuses duplicate, foreign and incomplete evidence', () => {
    expect(() => buildRecoveryPlan(manifest, journal(), expected, [proof(), proof()])).toThrow(
      'duplicate original Run',
    );
    expect(() => plan(sourceRecord(), { ...proof(), runId: 'foreign-run' })).toThrow(
      'not an accepted',
    );
    expect(() => plan(sourceRecord(), { ...proof(), status: null })).toThrow('object');
    expect(() => plan(sourceRecord(), { ...proof(), result: {} })).toThrow('object');
  });

  it.each([
    { id: 'wrong-run' },
    { kind: 'native_agent' },
    { status: 'running' },
    { status: 'succeeded' },
    { failure_code: 'provider_rejected' },
    { model: 'other-model' },
    { cost_micro_usd: '1' },
    { cost_micro_usd: undefined },
  ])('refuses contradictory Run status %o', (changed) => {
    const evidence = proof();
    evidence.status = { ...(evidence.status as Record<string, unknown>), ...changed };
    expect(() => plan(sourceRecord(), evidence)).toThrow();
  });

  it.each([
    { outcome: 'value' },
    { provider_outcome: 'responded' },
    { provider_outcome: 'uncertain' },
    { provider_request_digest: hash },
    { provider_request_digest: undefined },
    { provider_request_id: 'already-sent' },
    { model: 'other-model' },
    { validation: { status: 'passed' } },
  ])('refuses evidence suggesting actual or uncertain invocation %o', (changed) => {
    const evidence = proof();
    const result = evidence.result as Record<string, unknown>;
    result.inference = { ...(result.inference as Record<string, unknown>), ...changed };
    expect(() => plan(sourceRecord(), evidence)).toThrow();
  });

  it.each([
    { completionUncertain: true },
    { estimatedCostUsd: 0.000001 },
    { estimatedCostUsd: undefined },
    { providerReportedCostUsd: 0.000001 },
    { usage: undefined },
    { usage: { inputTokens: 1, outputTokens: 0 } },
  ])('refuses nonzero or missing original spending evidence %o', (changed) => {
    const record = sourceRecord();
    Object.assign(record.result.receipt, changed);
    expect(() => plan(record)).toThrow();
  });
});

describe('recovery comparison provenance', () => {
  it('preserves both service attempts while selecting the sole actual model invocation', () => {
    const original = sourceRecord(),
      retry = recovered(original);
    const result = mergeRecoveryResults([original], [retry], plan(original));
    expect(result.serviceAttempts).toEqual([original, retry]);
    expect(result.comparisonRecords).toEqual([retry]);
    expect(result).toMatchObject({ replacedNeverInvokedCalls: 1, pendingRecoveryCalls: 0 });
    expect(result.serviceAttempts[0]).toBe(original);
    expect(original.result.outcome).toBe('failed');
  });

  it('does not fabricate an answered case before its first model invocation', () => {
    const original = sourceRecord();
    expect(mergeRecoveryResults([original], [], plan(original))).toMatchObject({
      serviceAttempts: [original],
      comparisonRecords: [],
      replacedNeverInvokedCalls: 0,
      pendingRecoveryCalls: 1,
    });
  });

  it('retains unrelated paid model outcomes unchanged', () => {
    const original = sourceRecord(),
      paid = recovered(sourceRecord('scene-b'));
    const result = mergeRecoveryResults([original, paid], [recovered(original)], plan(original));
    expect(result.serviceAttempts).toHaveLength(3);
    expect(result.comparisonRecords[0]).toBe(paid);
  });

  it('refuses foreign, duplicate, changed-input and original-identity recovery results', () => {
    const original = sourceRecord(),
      recoveryPlan = plan(original),
      retry = recovered(original);
    expect(() => mergeRecoveryResults([original], [retry, retry], recoveryPlan)).toThrow(
      'duplicate',
    );
    expect(() =>
      mergeRecoveryResults([original], [recovered(sourceRecord('scene-b'))], recoveryPlan),
    ).toThrow('unselected');
    expect(() =>
      mergeRecoveryResults([original], [{ ...retry, inputDigest: 'c'.repeat(64) }], recoveryPlan),
    ).toThrow('changed input');
    expect(() => mergeRecoveryResults([original], [original], recoveryPlan)).toThrow('identity');
    expect(() => mergeRecoveryResults([original, original], [], recoveryPlan)).toThrow(
      'duplicate source',
    );
  });

  it('refuses mutation or replacement of the proven original service attempt', () => {
    const original = sourceRecord(),
      recoveryPlan = plan(original);
    const changed = structuredClone(original);
    changed.result.receipt.estimatedCostUsd = 1;
    expect(() => mergeRecoveryResults([changed], [recovered(original)], recoveryPlan)).toThrow(
      'source result differs',
    );
    expect(() => mergeRecoveryResults([], [], recoveryPlan)).toThrow('source result differs');
  });
});
