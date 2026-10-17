import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { MacrofoldTransport } from '../packages/ai/src/macrofold.js';
import { armById } from '../scripts/decision-benchmark/arms.js';
import { corpusVersion, sha256 } from '../scripts/decision-benchmark/corpus.js';
import { preparedArmInput } from '../scripts/decision-benchmark/execute.js';
import type { BenchmarkManifest } from '../scripts/decision-benchmark/journal.js';
import { recoverBudgetAdmissions } from '../scripts/decision-benchmark/recover-budget.js';
import * as execution from '../scripts/decision-benchmark/run.js';
import type { BenchmarkScene } from '../scripts/decision-benchmark/types.js';

const model = 'meta/muse-spark-1.3-contributor';
const scene: BenchmarkScene = {
  id: 'recovery-test-scene',
  family: 'memory-correction',
  title: 'An observed correction',
  scope: 'hypothetical-world',
  sources: ['docs/memory-architecture.md'],
  state: { observation: 'Mara corrected the recipient to Neri, within my hearing.' },
  cases: [
    {
      id: 'recovery-test-scene-q1',
      question: { type: 'noul', instructions: 'Did I hear the correction?' },
      gold: { type: 'noul', min: 0.5, max: 1 },
      rationale: 'The correction was personally heard.',
      difficulty: 'clear',
      ambiguity: 'unambiguous',
      tags: ['source-evidence'],
    },
  ],
};
const at = '2026-10-15T22:00:00.000Z';
const acceptedRun = 'accepted-run';
const stopped = new Error('Fixture stops before the paid runner.');
let directory: string, source: string, output: string;
let request: MockInstance<MacrofoldTransport['request']>;
let run: MockInstance<typeof execution.runBenchmark>;
async function fixture(overrides: Partial<BenchmarkManifest> = {}) {
  const prepared = execution.prepareBenchmarkTasks([scene], false);
  const arm = armById.get(model)!;
  const task = prepared.taskById.get(scene.id)!;
  const manifest: BenchmarkManifest = {
    version: corpusVersion,
    corpusDigest: prepared.corpusDigest,
    executionDigest: 'a'.repeat(64),
    gitCommit: 'b'.repeat(40),
    runId: '11111111-1111-4111-8111-111111111111',
    models: [model],
    priorCommitmentUsd: 0.04,
    maxCostUsd: 0.1,
    capUsd: 50,
    concurrency: 4,
    timeoutMs: 180000,
    baseUrl: 'http://localhost:3210',
    billingMode: 'byok',
    providerConnectionId: 'fixture-connection',
    startedAt: at,
    ...overrides,
  };
  const requestId = `olbench:${manifest.runId}:${scene.id}:0`,
    key = `${model}:${scene.id}`;
  const record = {
    model,
    sceneId: scene.id,
    requestId,
    inputDigest: sha256({ arm, input: preparedArmInput(arm, task) }),
    result: {
      outcome: 'failed',
      reason: 'provider_failed',
      receipt: {
        provider: 'macrofold',
        requestedModel: model,
        model,
        modelVersionStatus: 'unavailable',
        requestId,
        contextDigest: 'c'.repeat(64),
        startedAt: at,
        completedAt: at,
        latencyMs: 100,
        dispatched: true,
        completionUncertain: false,
        providerRequestId: acceptedRun,
        estimatedCostUsd: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    },
  };
  const events = [
    { event: 'admitted', key, requestId, reservedUsd: 0.01, at },
    { event: 'accepted', key, requestId, runId: acceptedRun, at },
    { event: 'result', key, requestId, record, at },
  ];
  await writeFile(join(source, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(
    join(source, 'journal.jsonl'),
    events.map((event) => JSON.stringify(event)).join('\n') + '\n',
  );
  return { manifest, record, events };
}
function options() {
  return new Map([
    ['source', source],
    ['live', 'true'],
    ['max-new', '1'],
  ]);
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'decision-recovery-boundary-'));
  source = join(directory, 'source');
  output = join(directory, 'recovery');
  await mkdir(source);
  await mkdir(output);
  vi.stubEnv('MACROFOLD_BASE_URL', 'http://localhost:3210');
  vi.stubEnv('MACROFOLD_API_KEY', 'fixture-key');
  vi.stubEnv('MACROFOLD_JEV_CONNECTION_ID', '');
  vi.stubEnv('MACROFOLD_PROVIDER_CONNECTION_ID', 'fixture-connection');
  request = vi
    .spyOn(MacrofoldTransport.prototype, 'request')
    .mockImplementation(async (path, body) => {
      expect(body).toBeUndefined(); // These are read-only proof requests, never inference POSTs.
      return path.endsWith('/result')
        ? {
            run_id: acceptedRun,
            final: true,
            inference: {
              model,
              outcome: 'failed',
              provider_outcome: 'not_invoked',
              provider_request_digest: null,
              validation: { status: 'not_run' },
            },
          }
        : {
            id: acceptedRun,
            kind: 'inference',
            model,
            status: 'failed',
            failure_code: 'run_budget_exhausted',
            cost_micro_usd: '0',
          };
    });
  run = vi.spyOn(execution, 'runBenchmark').mockRejectedValue(stopped);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('explicit recovery execution boundary', () => {
  it('freezes proof, exclusive lane, exact selection and aggregate commitment before execution', async () => {
    await fixture();
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toBe(
      stopped,
    );
    expect(request).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledTimes(1);
    const call = run.mock.calls[0]!;
    expect(call[2].get('max-new')).toBe('1');
    expect(call[2].get('billing-mode')).toBe('byok');
    expect(call[2].get('cap-usd')).toBe('50');
    expect(call[5]).toMatchObject({
      priorCommitmentUsd: 0.04,
      capUsd: 50,
      selections: [{ key: `${model}:${scene.id}` }],
    });
    const claim = JSON.parse(await readFile(join(source, 'recovery-claim.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(claim.directory).toBe(await realpath(output));
    expect(claim.planDigest).toBe(sha256(call[5]));
    await expect(readFile(join(source, 'RUNNING.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('carries all source uncertainty into the same aggregate cap', async () => {
    const saved = await fixture({ capUsd: 0.05, maxCostUsd: 0.02 });
    const other = structuredClone(saved.record);
    other.sceneId = scene.id + '-other';
    other.requestId = `olbench:${saved.manifest.runId}:${other.sceneId}:0`;
    other.result.receipt.requestId = other.requestId;
    other.result.receipt.providerRequestId = 'uncertain-other-run';
    other.result.receipt.completionUncertain = true;
    const otherScene = {
      ...scene,
      id: other.sceneId,
      cases: scene.cases.map((test) => ({ ...test, id: test.id + '-other' })),
    };
    const prepared = execution.prepareBenchmarkTasks([scene, otherScene], false);
    const task = prepared.taskById.get(otherScene.id)!;
    other.inputDigest = sha256({
      arm: armById.get(model)!,
      input: preparedArmInput(armById.get(model)!, task),
    });
    const key = `${model}:${other.sceneId}`;
    const events = [
      ...saved.events,
      { event: 'admitted', key, requestId: other.requestId, reservedUsd: 0.009, at },
      { event: 'accepted', key, requestId: other.requestId, runId: 'uncertain-other-run', at },
      { event: 'result', key, requestId: other.requestId, record: other, at },
    ];
    await writeFile(
      join(source, 'manifest.json'),
      JSON.stringify({ ...saved.manifest, corpusDigest: prepared.corpusDigest }),
    );
    await writeFile(
      join(source, 'journal.jsonl'),
      events.map((event) => JSON.stringify(event)).join('\n'),
    );
    await expect(
      recoverBudgetAdmissions(output, options(), [scene, otherScene], () => ({})),
    ).rejects.toBe(stopped);
    const call = run.mock.calls[0]!;
    expect(call[2].get('cap-usd')).toBe('0.05');
    expect(call[5]).toMatchObject({ priorCommitmentUsd: 0.049, capUsd: 0.05 });
    expect(call[5]?.selections).toHaveLength(1);
  });

  it('resumes only the same frozen lane using stored terminal proofs without refetching', async () => {
    await fixture();
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toBe(
      stopped,
    );
    request.mockClear();
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toBe(
      stopped,
    );
    expect(request).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('refuses a later second output directory before any proof or paid request', async () => {
    await fixture();
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toBe(
      stopped,
    );
    request.mockClear();
    run.mockClear();
    const second = join(directory, 'second-recovery');
    await mkdir(second);
    await expect(recoverBudgetAdmissions(second, options(), [scene], () => ({}))).rejects.toThrow(
      'different recovery directory',
    );
    expect(request).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects changed funding or Macrofold host before any request', async () => {
    await fixture();
    vi.stubEnv('MACROFOLD_PROVIDER_CONNECTION_ID', 'different-connection');
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toThrow(
      'funding connection',
    );
    vi.stubEnv('MACROFOLD_PROVIDER_CONNECTION_ID', 'fixture-connection');
    vi.stubEnv('MACROFOLD_BASE_URL', 'http://localhost:9999');
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toThrow(
      'source Macrofold host',
    );
    expect(request).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects source/output aliases and an active source runner', async () => {
    await fixture();
    const alias = join(directory, 'source-alias');
    await symlink(source, alias);
    await expect(recoverBudgetAdmissions(alias, options(), [scene], () => ({}))).rejects.toThrow(
      'distinct physical',
    );
    await writeFile(join(source, 'RUNNING.lock'), 'another runner');
    await expect(
      recoverBudgetAdmissions(output, options(), [scene], () => ({})),
    ).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(join(source, 'RUNNING.lock'), 'utf8')).toBe('another runner');
    expect(request).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a corrupted saved proof or changed source before paid execution', async () => {
    const saved = await fixture();
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toBe(
      stopped,
    );
    request.mockClear();
    run.mockClear();
    await writeFile(
      join(output, 'recovery-proofs.json'),
      JSON.stringify([{ runId: 'foreign-run', status: {}, result: {} }]),
    );
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toThrow(
      'frozen source candidates',
    );
    expect(run).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    await writeFile(join(output, 'recovery-proofs.json'), '[]');
    await writeFile(
      join(source, 'journal.jsonl'),
      saved.events
        .slice(0, 2)
        .map((event) => JSON.stringify(event))
        .join('\n'),
    );
    await expect(recoverBudgetAdmissions(output, options(), [scene], () => ({}))).rejects.toThrow(
      'all finish',
    );
    expect(run).not.toHaveBeenCalled();
  });
});
