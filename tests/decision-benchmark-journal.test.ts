import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  assertValidManifest,
  parseJournal,
  validateJournal,
  type BenchmarkManifest,
} from '../scripts/decision-benchmark/journal.js';
import { armById, benchmarkArms, resolveArm } from '../scripts/decision-benchmark/arms.js';
import {
  committedMicroUsd,
  executionWorkers,
  runBenchmark,
} from '../scripts/decision-benchmark/run.js';
import { corpusVersion, modelInput, sha256 } from '../scripts/decision-benchmark/corpus.js';
import { preparedArmInput } from '../scripts/decision-benchmark/execute.js';
import type { BenchmarkRecoveryPlan } from '../scripts/decision-benchmark/recovery.js';
import type { BenchmarkScene } from '../scripts/decision-benchmark/types.js';

const gitFixture = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ execFileSync: gitFixture }));

const model = 'typesafe/jev-1.13';
const at = '2026-10-15T20:00:00.000Z';
const hash = 'a'.repeat(64);
const manifest: BenchmarkManifest = {
  version: 'openlegend-decisions-2026-10-15',
  corpusDigest: hash,
  executionDigest: hash,
  priorCommitmentUsd: 0,
  gitCommit: 'b'.repeat(40),
  runId: '11111111-1111-4111-8111-111111111111',
  models: [model, 'microsoft/microsoft-decision-1'],
  maxCostUsd: 0.02,
  capUsd: 4,
  concurrency: 2,
  timeoutMs: 120000,
  baseUrl: 'http://127.0.0.1:3210',
  billingMode: 'managed',
  startedAt: at,
};
const inputs = new Map([
  ['typesafe/jev-1.13:scene-a', hash],
  ['typesafe/jev-1.13:scene-b', hash],
]);
const workerScene: BenchmarkScene = {
  id: 'worker-phase-scene',
  family: 'memory-correction',
  title: 'A correction received in person',
  scope: 'hypothetical-world',
  sources: ['docs/memory-architecture.md'],
  state: { observation: 'Mara handed me the envelope and corrected the recipient to Neri.' },
  cases: [
    {
      id: 'worker-phase-scene-q1',
      question: { type: 'noul', instructions: 'Did I personally hear the recipient correction?' },
      gold: { type: 'noul', min: 0.5, max: 1, label: true },
      rationale: 'The supplied observation directly records hearing Mara’s correction.',
      difficulty: 'clear',
      ambiguity: 'unambiguous',
      tags: ['source-evidence'],
    },
  ],
};

function prepareNoCallPhase() {
  vi.stubEnv('OPENAI_API_KEY', 'fixture-key-never-dispatched');
  vi.stubEnv('MACROFOLD_API_KEY', 'fixture-key-never-dispatched');
  vi.stubEnv('MACROFOLD_BASE_URL', manifest.baseUrl);
  gitFixture.mockImplementation((command: string, args: string[]) => {
    if (command !== 'git') throw new Error('Unexpected fixture command.');
    if (args[0] === 'diff') return '';
    if (args[0] === 'ls-files') return '';
    if (args[0] === 'rev-parse') return `${'b'.repeat(40)}\n`;
    throw new Error('Unexpected fixture git operation.');
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('Provider requests are forbidden in worker phase fixtures.');
  });
}

const noCallPhaseOptions = () =>
  new Map([
    ['live', 'true'],
    ['max-new', '0'],
    ['models', 'luna-decision'],
    ['workers', '16'],
  ]);
function eventSet(scene = 'scene-a', selectedModel = model, modelIndex = 0) {
  const arm = armById.get(selectedModel);
  const key = `${selectedModel}:${scene}`,
    requestId = `olbench:${manifest.runId}:${scene}:${modelIndex}`,
    runId = `run-${scene}`;
  const admitted = { event: 'admitted', key, requestId, reservedUsd: 0.02, at };
  const accepted = { event: 'accepted', key, requestId, runId, at };
  const record = {
    sceneId: scene,
    model: selectedModel,
    requestId,
    inputDigest: hash,
    result: {
      outcome: 'value',
      value: { answers: { question: { type: 'noul', noul: 0.9 } } },
      receipt: {
        requestId,
        provider: arm?.transport.startsWith('openai') ? 'openai' : 'macrofold',
        requestedModel: arm?.model ?? selectedModel,
        model: arm?.model ?? selectedModel,
        modelVersionStatus: 'unavailable',
        contextDigest: hash,
        providerRequestDigest: hash,
        providerRequestId: runId,
        startedAt: at,
        completedAt: at,
        latencyMs: 0,
        dispatched: true,
        completionUncertain: false,
        estimatedCostUsd: 0.000005,
        usage: { inputTokens: 100, outputTokens: 3 },
      },
    },
  };
  return { admitted, accepted, result: { event: 'result', key, requestId, record, at } };
}

const nativeModel = 'openai/gpt-6-luna:decisions';
const nativeManifest: BenchmarkManifest = { ...manifest, models: [nativeModel] };
const nativeInputs = new Map([[`${nativeModel}:scene-a`, hash]]);
function nativeHttpFailure(patch: Record<string, unknown> = {}) {
  const event = eventSet('scene-a', nativeModel);
  const result = {
    ...event.result,
    record: {
      ...event.result.record,
      result: {
        outcome: 'unavailable',
        reason: 'openai_http_429',
        receipt: {
          ...event.result.record.result.receipt,
          dispatched: false,
          httpStatus: 429,
          providerRequestId: 'req_rejected_trace',
          estimatedCostUsd: undefined,
          usage: undefined,
          ...patch,
        },
      },
    },
  };
  return [event.admitted, result];
}

describe('resumed per-question refusals and provider HTTP metadata', () => {
  it('preserves independent usable answers alongside refused native question identities', () => {
    const event = eventSet('scene-a', nativeModel);
    const result = {
      ...event.result,
      record: {
        ...event.result.record,
        result: {
          ...event.result.record.result,
          receipt: {
            ...event.result.record.result.receipt,
            questionRefusals: ['question-refused'],
          },
        },
      },
    };
    const parsed = validateJournal([event.admitted, result], nativeManifest, nativeInputs);
    expect(parsed[1]?.record?.result.receipt.questionRefusals).toEqual(['question-refused']);
    expect(parsed[1]?.record?.result.outcome).toBe('value');
  });

  it('preserves a full native refusal without manufacturing answers or removing known cost', () => {
    const event = eventSet('scene-a', nativeModel);
    const result = {
      ...event.result,
      record: {
        ...event.result.record,
        result: {
          outcome: 'refused',
          reason: 'decisions_refused',
          receipt: {
            ...event.result.record.result.receipt,
            questionRefusals: ['question'],
          },
        },
      },
    };
    const parsed = validateJournal([event.admitted, result], nativeManifest, nativeInputs);
    expect(parsed[1]?.record?.result.outcome).toBe('refused');
    expect(committedMicroUsd(parsed, 0)).toBe(5);
  });

  it.each([
    [],
    ['duplicate', 'duplicate'],
    [''],
    ['x'.repeat(257)],
    [null],
    [42],
    'question',
    Array.from({ length: 201 }, (_, index) => `question-${index}`),
  ])('refuses malformed native refusal identifiers: %o', (questionRefusals) => {
    const event = eventSet('scene-a', nativeModel);
    const result = {
      ...event.result,
      record: {
        ...event.result.record,
        result: {
          ...event.result.record.result,
          receipt: { ...event.result.record.result.receipt, questionRefusals },
        },
      },
    };
    expect(() => validateJournal([event.admitted, result], nativeManifest, nativeInputs)).toThrow(
      'individual question refusals',
    );
  });

  it('rejects a question recorded as both answered and refused and refuses foreign-provider annotations', () => {
    const event = eventSet('scene-a', nativeModel);
    const overlapping = {
      ...event.result,
      record: {
        ...event.result.record,
        result: {
          ...event.result.record.result,
          receipt: { ...event.result.record.result.receipt, questionRefusals: ['question'] },
        },
      },
    };
    expect(() =>
      validateJournal([event.admitted, overlapping], nativeManifest, nativeInputs),
    ).toThrow('both answered and refused');
    const macrofold = eventSet();
    const foreign = {
      ...macrofold.result,
      record: {
        ...macrofold.result.record,
        result: {
          ...macrofold.result.record.result,
          receipt: {
            ...macrofold.result.record.result.receipt,
            questionRefusals: ['other-question'],
          },
        },
      },
    };
    expect(() =>
      validateJournal([macrofold.admitted, macrofold.accepted, foreign], manifest, inputs),
    ).toThrow('individual question refusals');
  });

  it('retains an HTTP rejection trace identity and safe cooldown evidence without releasing its reservation', () => {
    const parsed = validateJournal(
      nativeHttpFailure({
        providerErrorCode: 'insufficient_quota',
        providerErrorType: 'insufficient_quota',
        retryAfterMs: 172800000,
        providerRateLimit: {
          remainingRequests: 0,
          remainingTokens: 500,
          resetRequestsMs: 60000,
          resetTokensMs: 250,
        },
      }),
      nativeManifest,
      nativeInputs,
    );
    expect(parsed[1]?.record?.result.receipt).toMatchObject({
      dispatched: false,
      httpStatus: 429,
      providerRequestId: 'req_rejected_trace',
      providerErrorCode: 'insufficient_quota',
      retryAfterMs: 172800000,
      providerRateLimit: { remainingRequests: 0, resetTokensMs: 250 },
    });
    expect(committedMicroUsd(parsed, 0)).toBe(20000);
  });

  it.each([
    { providerErrorCode: '' },
    { providerErrorCode: 'a'.repeat(129) },
    { providerErrorCode: 'Bearer credential' },
    { providerErrorType: 429 },
    { providerErrorType: 'RateLimitError' },
  ])('rejects unsanitized provider error identifiers: %o', (patch) => {
    expect(() => validateJournal(nativeHttpFailure(patch), nativeManifest, nativeInputs)).toThrow(
      'provider error identifier',
    );
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1000', null])(
    'rejects an unsafe provider minimum wait: %o',
    (retryAfterMs) => {
      expect(() =>
        validateJournal(nativeHttpFailure({ retryAfterMs }), nativeManifest, nativeInputs),
      ).toThrow('provider minimum wait');
    },
  );

  it.each([
    { remainingRequests: -1 },
    { remainingTokens: 0.5 },
    { resetRequestsMs: Infinity },
    { resetTokensMs: Number.MAX_SAFE_INTEGER + 1 },
    { remainingTokens: '0' },
    { resetTokensMs: null },
    { remainingRequests: NaN },
  ])('rejects unsafe rate-limit scalars: %o', (providerRateLimit) => {
    expect(() =>
      validateJournal(nativeHttpFailure({ providerRateLimit }), nativeManifest, nativeInputs),
    ).toThrow('provider rate value');
  });

  it.each([null, [], 'untrusted', { authorization: 'credential' }])(
    'rejects malformed or unexpected rate metadata: %o',
    (providerRateLimit) => {
      expect(() =>
        validateJournal(nativeHttpFailure({ providerRateLimit }), nativeManifest, nativeInputs),
      ).toThrow();
    },
  );

  it('accepts safe boundary values without imposing an arbitrary shorter provider wait', () => {
    expect(() =>
      validateJournal(
        nativeHttpFailure({
          providerErrorCode: 'a'.repeat(128),
          retryAfterMs: Number.MAX_SAFE_INTEGER,
          providerRateLimit: {
            remainingRequests: 0,
            remainingTokens: Number.MAX_SAFE_INTEGER,
            resetRequestsMs: 0,
            resetTokensMs: Number.MAX_SAFE_INTEGER,
          },
        }),
        nativeManifest,
        nativeInputs,
      ),
    ).not.toThrow();
  });

  it('rejects malformed trace identities and correlation-only IDs without authoritative HTTP rejection', () => {
    for (const patch of [
      { providerRequestId: 'Bearer credential' },
      { providerRequestId: 'x'.repeat(257) },
      { httpStatus: 200 },
      { httpStatus: 503 },
      { httpStatus: undefined },
      { completionUncertain: true },
    ])
      expect(() =>
        validateJournal(nativeHttpFailure(patch), nativeManifest, nativeInputs),
      ).toThrow();
  });

  it('keeps undispatched Macrofold accepted Runs invalid even with HTTP rejection metadata', () => {
    const event = eventSet();
    const result = {
      ...event.result,
      record: {
        ...event.result.record,
        result: {
          outcome: 'unavailable',
          reason: 'provider_rate_limited',
          receipt: {
            ...event.result.record.result.receipt,
            dispatched: false,
            httpStatus: 429,
          },
        },
      },
    };
    expect(() =>
      validateJournal([event.admitted, event.accepted, result], manifest, inputs),
    ).toThrow();
    expect(() => validateJournal([event.admitted, result], manifest, inputs)).toThrow();
  });
});

describe('benchmark resume evidence', () => {
  it('accepts current managed and explicitly bound BYOK manifests', () => {
    expect(() => assertValidManifest(manifest)).not.toThrow();
    expect(() =>
      assertValidManifest({
        ...manifest,
        billingMode: 'byok',
        providerConnectionId: 'exact-connection',
      }),
    ).not.toThrow();
    const { billingMode, ...old } = manifest;
    expect(() => assertValidManifest(old)).toThrow();
  });
  it('refuses nonfinite, unsafe and contradictory spending or execution limits', () => {
    for (const patch of [
      { capUsd: NaN },
      { capUsd: Infinity },
      { capUsd: 100.01 },
      { maxCostUsd: -1 },
      { maxCostUsd: 5 },
      { concurrency: 0 },
      { timeoutMs: 300001 },
    ])
      expect(() => assertValidManifest({ ...manifest, ...patch })).toThrow();
  });
  it('refuses unknown or duplicate models and inconsistent funding bindings', () => {
    for (const patch of [
      { models: ['unknown'] },
      { models: [model, model] },
      { billingMode: 'byok' },
      { billingMode: 'managed', providerConnectionId: 'unexpected' },
      { baseUrl: 'https://secret@host.example' },
    ])
      expect(() => assertValidManifest({ ...manifest, ...patch })).toThrow();
  });
  it('parses complete JSON lines and fails closed on a truncated journal', () => {
    expect(parseJournal('\n{}\n{}\n')).toEqual([{}, {}]);
    expect(() => parseJournal('{}\n{"event":')).toThrow();
  });
  it('preserves partial admissions and validates a completed exact result', () => {
    const e = eventSet();
    expect(validateJournal([e.admitted], manifest, inputs)).toEqual([e.admitted]);
    expect(validateJournal([e.admitted, e.accepted], manifest, inputs)).toHaveLength(2);
    expect(validateJournal([e.admitted, e.accepted, e.result], manifest, inputs)).toHaveLength(3);
    const optionalConfidence = {
      ...e.result,
      record: {
        ...e.result.record,
        result: {
          ...e.result.record.result,
          value: {
            answers: {
              selected: {
                type: 'choice',
                choice: 'kept',
                probabilities: { kept: 0.9, unknown: 0.1 },
              },
              rated: {
                type: 'score',
                score: 1,
                legend: { '0': 'Low', '1': 'High' },
                probabilities: { '0': 0, '1': 1 },
              },
            },
          },
        },
      },
    };
    expect(
      validateJournal([e.admitted, e.accepted, optionalConfidence], manifest, inputs),
    ).toHaveLength(3);
  });
  it('refuses duplicate admissions and mismatched request identities', () => {
    const a = eventSet(),
      b = eventSet('scene-b');
    expect(() => validateJournal([a.admitted, a.admitted], manifest, inputs)).toThrow();
    expect(() =>
      validateJournal(
        [a.admitted, { ...b.admitted, requestId: a.admitted.requestId }],
        manifest,
        inputs,
      ),
    ).toThrow();
  });
  it('refuses orphan results, duplicate results and events following completion', () => {
    const e = eventSet();
    for (const events of [
      [e.result],
      [e.admitted, e.accepted, e.result, e.result],
      [e.admitted, e.accepted, e.result, e.accepted],
    ])
      expect(() => validateJournal(events, manifest, inputs)).toThrow();
  });
  it('refuses results with another scene, model, request or input digest', () => {
    const e = eventSet();
    for (const patch of [
      { sceneId: 'scene-b' },
      { model: 'microsoft/microsoft-decision-1' },
      { requestId: 'another-request' },
      { inputDigest: 'c'.repeat(64) },
    ])
      expect(() =>
        validateJournal(
          [e.admitted, e.accepted, { ...e.result, record: { ...e.result.record, ...patch } }],
          manifest,
          inputs,
        ),
      ).toThrow();
    expect(() => validateJournal([e.admitted], manifest, new Map())).toThrow();
  });
  it('refuses mismatched or reused accepted Runs and invalid receipt amounts', () => {
    const a = eventSet(),
      b = eventSet('scene-b');
    expect(() =>
      validateJournal(
        [a.admitted, a.accepted, b.admitted, { ...b.accepted, runId: a.accepted.runId }],
        manifest,
        inputs,
      ),
    ).toThrow();
    for (const patch of [
      { providerRequestId: 'another-run' },
      { requestId: 'another-request' },
      { estimatedCostUsd: NaN },
      { estimatedCostUsd: -1 },
      { completionUncertain: true },
      { usage: { inputTokens: 1, outputTokens: 0, cachedInputTokens: 2 } },
    ])
      expect(() =>
        validateJournal(
          [
            a.admitted,
            a.accepted,
            {
              ...a.result,
              record: {
                ...a.result.record,
                result: {
                  ...a.result.record.result,
                  receipt: { ...a.result.record.result.receipt, ...patch },
                },
              },
            },
          ],
          manifest,
          inputs,
        ),
      ).toThrow();
  });
  it('enforces aggregate reservations and permits a definitive undispatched refusal', () => {
    const a = eventSet(),
      b = eventSet('scene-b');
    expect(() =>
      validateJournal([a.admitted, b.admitted], { ...manifest, capUsd: 0.02 }, inputs),
    ).toThrow();
    const receipt = {
      ...a.result.record.result.receipt,
      dispatched: false,
      providerRequestId: undefined,
      estimatedCostUsd: undefined,
    };
    const refused = {
      ...a.result,
      record: {
        ...a.result.record,
        result: { outcome: 'unavailable', reason: 'insufficient_credit', receipt },
      },
    };
    expect(validateJournal([a.admitted, refused], manifest, inputs)).toHaveLength(2);
    const overshoot = {
      ...a.result,
      record: {
        ...a.result.record,
        result: {
          ...a.result.record.result,
          receipt: { ...a.result.record.result.receipt, estimatedCostUsd: 5 },
        },
      },
    };
    expect(validateJournal([a.admitted, a.accepted, overshoot], manifest, inputs)).toHaveLength(3);
  });

  it('binds all seven comparison arms to unique aliases, transports and requested models', () => {
    expect(benchmarkArms.map((arm) => arm.id)).toEqual([
      'typesafe/jev-1.13',
      'microsoft/microsoft-decision-1',
      'openai/gpt-6-luna:decisions',
      'openai/gpt-6-luna:low',
      'openai/gpt-6-luna:medium',
      'openai/gpt-6-luna:high',
      'meta/muse-spark-1.3-contributor',
    ]);
    expect(new Set(benchmarkArms.map((arm) => arm.alias)).size).toBe(7);
    for (const arm of benchmarkArms) {
      expect(resolveArm(arm.alias)).toBe(arm.id);
      expect(resolveArm(arm.id)).toBe(arm.id);
      expect(armById.get(arm.id)).toBe(arm);
    }
    expect(resolveArm('luna')).toBeUndefined();
    expect(() =>
      assertValidManifest({
        ...manifest,
        models: benchmarkArms.map((arm) => arm.id),
        capUsd: 50,
        priorCommitmentUsd: 0.04,
      }),
    ).not.toThrow();
  });

  it('rejects absent or malformed execution digests and impossible prior commitments', () => {
    for (const patch of [
      { executionDigest: undefined },
      { executionDigest: 'old-prompt' },
      { executionDigest: 'A'.repeat(64) },
      { priorCommitmentUsd: undefined },
      { priorCommitmentUsd: -0.01 },
      { priorCommitmentUsd: NaN },
      { priorCommitmentUsd: Infinity },
      { priorCommitmentUsd: 4.000001 },
    ])
      expect(() => assertValidManifest({ ...manifest, ...patch })).toThrow();
  });

  it.each([50, 100])('preserves the frozen $%s cap including prior spending', (capUsd) => {
    const a = eventSet(),
      b = eventSet('scene-b');
    const capped = { ...manifest, capUsd, priorCommitmentUsd: capUsd - 0.02 };
    const events = validateJournal([a.admitted], capped, inputs);
    expect(committedMicroUsd(events, capped.priorCommitmentUsd)).toBe(capUsd * 1_000_000);
    expect(() =>
      validateJournal([a.admitted, { ...b.admitted, reservedUsd: 0.000001 }], capped, inputs),
    ).toThrow('aggregate reservation');
    expect(() => assertValidManifest({ ...capped, capUsd: 100 })).not.toThrow();
    expect(() => assertValidManifest({ ...capped, capUsd: 100.000001 })).toThrow();
  });

  it('accepts variable positive reservations only up to the admitted per-call ceiling', () => {
    const a = eventSet(),
      b = eventSet('scene-b');
    const events = validateJournal(
      [
        { ...a.admitted, reservedUsd: 0.003501 },
        { ...b.admitted, reservedUsd: 0.008207 },
      ],
      manifest,
      inputs,
    );
    expect(committedMicroUsd(events, 0.04)).toBe(51_708);
    for (const reservedUsd of [0, -0.01, 0.020001, NaN, Infinity, undefined])
      expect(() => validateJournal([{ ...a.admitted, reservedUsd }], manifest, inputs)).toThrow();
  });

  it('releases supported completed charges so later calls can use the remaining headroom', () => {
    const a = eventSet(),
      b = eventSet('scene-b');
    const bounded = { ...manifest, capUsd: 0.065, priorCommitmentUsd: 0.04 };
    const events = validateJournal([a.admitted, a.accepted, a.result, b.admitted], bounded, inputs);
    expect(committedMicroUsd(events, bounded.priorCommitmentUsd)).toBe(60_005);
    expect(() => validateJournal([a.admitted, b.admitted], bounded, inputs)).toThrow(
      'aggregate reservation',
    );
  });

  it.each(['missing usage', 'missing estimate', 'uncertain completion'] as const)(
    'keeps the full reservation for %s even when other cheap-looking evidence exists',
    (reason) => {
      const a = eventSet(),
        b = eventSet('scene-b');
      const receipt = { ...a.result.record.result.receipt };
      if (reason === 'missing usage') Reflect.deleteProperty(receipt, 'usage');
      if (reason === 'missing estimate') Reflect.deleteProperty(receipt, 'estimatedCostUsd');
      if (reason === 'uncertain completion') receipt.completionUncertain = true;
      const result = {
        ...a.result,
        record: {
          ...a.result.record,
          result: {
            outcome: reason === 'uncertain completion' ? 'uncertain' : 'invalid',
            reason: 'fixture_missing_or_uncertain_evidence',
            receipt,
          },
        },
      };
      const bounded = { ...manifest, capUsd: 0.065, priorCommitmentUsd: 0.04 };
      const events = validateJournal([a.admitted, a.accepted, result], bounded, inputs);
      expect(committedMicroUsd(events, bounded.priorCommitmentUsd)).toBe(60_000);
      expect(() => validateJournal([...events, b.admitted], bounded, inputs)).toThrow(
        'aggregate reservation',
      );
    },
  );

  it.each([
    [0.000005, 0.000003, 5],
    [0.000005, 0.008, 8_000],
    [0.009, 0.008, 9_000],
    [0.000005, 0, 5],
  ])(
    'settles completed usage to the larger estimate or invoice (%s / %s)',
    (estimate, invoice, micro) => {
      const a = eventSet();
      const receipt = {
        ...a.result.record.result.receipt,
        estimatedCostUsd: estimate,
        providerReportedCostUsd: invoice,
      };
      const result = {
        ...a.result,
        record: {
          ...a.result.record,
          result: {
            ...a.result.record.result,
            receipt,
          },
        },
      };
      const events = validateJournal([a.admitted, a.accepted, result], manifest, inputs);
      expect(committedMicroUsd(events, 0.04)).toBe(40_000 + micro);
    },
  );

  it.each(['missing usage', 'uncertain completion'] as const)(
    'retains higher known costs as well as the reservation under %s',
    (reason) => {
      const a = eventSet(),
        b = eventSet('scene-b');
      const receipt = {
        ...a.result.record.result.receipt,
        estimatedCostUsd: 0.025,
        providerReportedCostUsd: 0.03,
        completionUncertain: reason === 'uncertain completion',
      };
      if (reason === 'missing usage') Reflect.deleteProperty(receipt, 'usage');
      const result = {
        ...a.result,
        record: {
          ...a.result.record,
          result: {
            outcome: 'uncertain',
            reason: 'billing_not_final',
            receipt,
          },
        },
      };
      const bounded = { ...manifest, capUsd: 0.065, priorCommitmentUsd: 0.04 };
      const events = validateJournal([a.admitted, a.accepted, result], bounded, inputs);
      expect(committedMicroUsd(events, bounded.priorCommitmentUsd)).toBe(70_000);
      expect(() =>
        validateJournal([...events, { ...b.admitted, reservedUsd: 0.000001 }], bounded, inputs),
      ).toThrow('aggregate reservation');
    },
  );

  it('records a higher completed charge honestly and blocks later admission above the cap', () => {
    const a = eventSet(),
      b = eventSet('scene-b');
    const receipt = { ...a.result.record.result.receipt, estimatedCostUsd: 0.025 };
    const result = {
      ...a.result,
      record: {
        ...a.result.record,
        result: {
          ...a.result.record.result,
          receipt,
        },
      },
    };
    const bounded = { ...manifest, capUsd: 0.065, priorCommitmentUsd: 0.04 };
    const events = validateJournal([a.admitted, a.accepted, result], bounded, inputs);
    expect(committedMicroUsd(events, bounded.priorCommitmentUsd)).toBe(65_000);
    expect(() =>
      validateJournal([...events, { ...b.admitted, reservedUsd: 0.000001 }], bounded, inputs),
    ).toThrow('aggregate reservation');
  });

  it.each(['luna-decision', 'luna-low', 'luna-medium', 'luna-high'])(
    'accepts a completed direct %s result without a Macrofold acceptance event',
    (alias) => {
      const selected = resolveArm(alias);
      if (!selected) throw new Error('Missing fixture arm.');
      const e = eventSet('direct-scene', selected);
      const directManifest = { ...manifest, models: [selected] };
      const expected = new Map([[e.admitted.key, hash]]);
      const events = validateJournal([e.admitted, e.result], directManifest, expected);
      expect(events).toHaveLength(2);
      expect(committedMicroUsd(events, 0.04)).toBe(40_005);
      const wrongModel = {
        ...e.result,
        record: {
          ...e.result.record,
          result: {
            ...e.result.record.result,
            receipt: {
              ...e.result.record.result.receipt,
              requestedModel: selected,
            },
          },
        },
      };
      expect(() => validateJournal([e.admitted, wrongModel], directManifest, expected)).toThrow(
        'receipt identity',
      );
    },
  );

  it('requires successful Macrofold results to refer to a durably accepted Run', () => {
    const e = eventSet();
    expect(() => validateJournal([e.admitted, e.result], manifest, inputs)).toThrow();
    const withoutRunId = {
      ...e.result,
      record: {
        ...e.result.record,
        result: {
          ...e.result.record.result,
          receipt: {
            ...e.result.record.result.receipt,
            providerRequestId: undefined,
          },
        },
      },
    };
    expect(() => validateJournal([e.admitted, withoutRunId], manifest, inputs)).toThrow(
      'successful result',
    );
  });

  it('rejects unknown arms and changed prompt/input bindings during resume', () => {
    const e = eventSet();
    expect(() =>
      validateJournal([e.admitted], manifest, new Map([[e.admitted.key, 'c'.repeat(64)]])),
    ).not.toThrow();
    expect(() =>
      validateJournal(
        [e.admitted, e.accepted, e.result],
        manifest,
        new Map([[e.admitted.key, 'c'.repeat(64)]]),
      ),
    ).toThrow('input digest');
    const unknown = { ...e.admitted, key: 'unknown-model:scene-a' };
    expect(() => validateJournal([unknown], manifest, new Map([[unknown.key, hash]]))).toThrow(
      'unselected model',
    );
  });

  it.each(['changed prompt', 'removed prior commitment'])(
    'refuses %s on report/resume before any provider request',
    async (change) => {
      const directory = await mkdtemp(join(tmpdir(), 'olbench-journal-'));
      const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        throw new Error('Provider requests are forbidden in journal fixtures.');
      });
      try {
        // Empty task selection isolates the immutable execution policy from corpus authoring.
        const executionDigest = sha256({
          arms: benchmarkArms,
          tasks: [],
          outputTokens: 8192,
          spending: 'complete-usage-or-reservation',
          priorCommitmentUsd: 0.04,
        });
        const stored = {
          ...manifest,
          version: corpusVersion,
          corpusDigest: sha256({ scenes: [], generation: [] }),
          executionDigest: change === 'changed prompt' ? 'c'.repeat(64) : executionDigest,
          priorCommitmentUsd: change === 'removed prior commitment' ? 0 : 0.04,
        };
        await writeFile(join(directory, 'manifest.json'), JSON.stringify(stored));
        await expect(runBenchmark('report', directory, new Map(), [], () => ({}))).rejects.toThrow(
          change === 'changed prompt' ? 'prompt' : 'Prior task commitment',
        );
        expect(fetcher).not.toHaveBeenCalled();
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );

  it.each([
    [undefined, 4],
    ['1', 1],
    ['16', 16],
    ['0', undefined],
    ['17', undefined],
    ['1.5', undefined],
    ['NaN', undefined],
    ['Infinity', undefined],
  ] as const)('validates runtime worker count %s', (value, expected) => {
    if (expected === undefined) expect(() => executionWorkers(value, 4)).toThrow('1–16');
    else expect(executionWorkers(value, 4)).toBe(expected);
  });

  it('records a sixteen-worker zero-call phase without changing the original manifest', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'olbench-phase-'));
    const fetcher = prepareNoCallPhase();
    try {
      await runBenchmark('run', directory, noCallPhaseOptions(), [workerScene], () => ({}));
      const stored = JSON.parse(
        await readFile(join(directory, 'manifest.json'), 'utf8'),
      ) as BenchmarkManifest;
      expect(stored).toMatchObject({
        concurrency: 4,
        models: ['openai/gpt-6-luna:decisions'],
        priorCommitmentUsd: 0.04,
        capUsd: 50,
      });
      const phaseText = await readFile(join(directory, 'execution-phases.jsonl'), 'utf8');
      const phases = phaseText
        .trim()
        .split('\n')
        .map(
          (line) =>
            JSON.parse(line) as {
              id: string;
              runId: string;
              workers: number;
              sourceCommit: string;
              sourceDiffDigest: string;
            },
        );
      expect(phases).toHaveLength(1);
      const phase = phases[0]!;
      expect(phase.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(phase).toMatchObject({
        runId: stored.runId,
        workers: 16,
        sourceCommit: 'b'.repeat(40),
        sourceDiffDigest: sha256(''),
      });
      expect(await readFile(join(directory, `source-diff-${phase.id}.patch`), 'utf8')).toBe('');
      expect(await readFile(join(directory, 'journal.jsonl'), 'utf8')).toBe('');
      await expect(access(join(directory, 'RUNNING.lock'))).rejects.toMatchObject({
        code: 'ENOENT',
      });

      await runBenchmark('report', directory, new Map(), [workerScene], () => ({}));
      const report = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8')) as {
        executionPhases: unknown[];
        admittedCalls: number;
        conservativeCommittedUsd: number;
      };
      expect(report).toMatchObject({
        executionPhases: phases,
        admittedCalls: 0,
        conservativeCommittedUsd: 0.04,
      });
      expect(await readFile(join(directory, 'execution-phases.jsonl'), 'utf8')).toBe(phaseText);
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('cleans the running lock if durable phase metadata cannot be opened', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'olbench-phase-error-'));
    const fetcher = prepareNoCallPhase();
    try {
      const git = gitFixture.getMockImplementation()!;
      gitFixture.mockImplementation((command: string, args: string[]) =>
        args[0] === 'ls-files' ? 'packages/ai/src/untracked-runtime.ts\0' : git(command, args),
      );
      await expect(
        runBenchmark('run', directory, noCallPhaseOptions(), [workerScene], () => ({})),
      ).rejects.toThrow('add or commit it first');
      await expect(access(join(directory, 'RUNNING.lock'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await readFile(join(directory, 'journal.jsonl'), 'utf8')).toBe('');
      expect(fetcher).not.toHaveBeenCalled();
      gitFixture.mockImplementation(git);
      await mkdir(join(directory, 'execution-phases.jsonl'));
      await expect(
        runBenchmark('run', directory, noCallPhaseOptions(), [workerScene], () => ({})),
      ).rejects.toThrow();
      await expect(access(join(directory, 'RUNNING.lock'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await readFile(join(directory, 'journal.jsonl'), 'utf8')).toBe('');
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('freezes ordinary admission after the source ledger funds a recovery lane', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'olbench-recovery-source-'));
    const fetcher = prepareNoCallPhase();
    try {
      await writeFile(join(directory, 'recovery-claim.json'), '{}');
      await expect(
        runBenchmark('run', directory, noCallPhaseOptions(), [workerScene], () => ({})),
      ).rejects.toThrow('frozen');
      await expect(access(join(directory, 'RUNNING.lock'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each(['exhausted combined budget', 'changed recovery input', 'omitted recovery selection'])(
    'refuses paid admission for %s',
    async (condition) => {
      const directory = await mkdtemp(join(tmpdir(), 'olbench-recovery-funding-'));
      const fetcher = prepareNoCallPhase();
      const arm = armById.get('meta/muse-spark-1.3-contributor')!;
      const inputDigest = sha256({
        arm,
        input: preparedArmInput(arm, { id: workerScene.id, input: modelInput(workerScene) }),
      });
      const plan: BenchmarkRecoveryPlan = {
        sourceRunId: manifest.runId,
        sourceManifestDigest: hash,
        sourceJournalDigest: hash,
        priorCommitmentUsd: condition === 'exhausted combined budget' ? 49.999999 : 0.04,
        capUsd: 50,
        selections: [
          {
            key: `${arm.id}:${workerScene.id}`,
            model: arm.id,
            sceneId: workerScene.id,
            inputDigest: condition === 'changed recovery input' ? hash : inputDigest,
            originalRequestId: 'original',
            originalRunId: 'original-run',
            proofDigest: hash,
            originalRecordDigest: hash,
          },
        ],
      };
      const options = new Map([
        ['live', 'true'],
        ['models', 'spark-contributor'],
        ['workers', '16'],
      ]);
      if (condition === 'omitted recovery selection') options.set('max-new', '0');
      try {
        const run = runBenchmark('run', directory, options, [workerScene], () => ({}), plan);
        if (condition === 'changed recovery input')
          await expect(run).rejects.toThrow('Recovery input');
        else if (condition === 'omitted recovery selection') {
          await run;
          await expect(
            runBenchmark('run', directory, options, [workerScene], () => ({})),
          ).rejects.toThrow('prompt');
        } else {
          await run;
          expect(await readFile(join(directory, 'journal.jsonl'), 'utf8')).toBe('');
          const report = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8'));
          expect(report.conservativeCommittedUsd).toBe(49.999999);
          expect(report.unattemptedCalls).toBe(1);
        }
        expect(fetcher).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
});
