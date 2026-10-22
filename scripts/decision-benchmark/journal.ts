import {
  usdToMicroUsd,
  sumSafeIntegers,
  type MacrofoldBillingMode,
} from '../../packages/ai/src/index.js';
import type { RunRecord } from './evaluate.js';
import { armById, type BenchmarkArm, type BenchmarkArmId } from './arms.js';
import {
  experimentArms,
  validateResolvedModelExperiment,
  type ResolvedModelExperiment,
} from './model-experiment.js';

export interface BenchmarkManifest {
  version: string;
  corpusDigest: string;
  gitCommit: string;
  runId: string;
  models: BenchmarkArmId[];
  modelExperiment?: ResolvedModelExperiment;
  executionDigest: string;
  priorCommitmentUsd: number;
  maxCostUsd: number;
  capUsd: number;
  concurrency: number;
  timeoutMs: number;
  baseUrl: string;
  /** Omission is the canonical default; native decision delivery never streams. */
  streamGeneration?: true;
  billingMode: MacrofoldBillingMode;
  providerConnectionId?: string;
  startedAt: string;
}
export interface BenchmarkJournalEvent {
  event: 'admitted' | 'accepted' | 'result';
  key: string;
  requestId: string;
  reservedUsd?: number;
  runId?: string;
  record?: RunRecord;
  at: string;
}

const micro = (value: number) => {
  const amount = usdToMicroUsd(value);
  if (amount === undefined) throw new Error('Invalid benchmark accounting amount.');
  return amount;
};

/** Derived from validated events, or updated after a live event is durably synced.
 * Completed history never needs rescanning to admit the next call. Only unfinished
 * reservations remain indexed; the append-only journal retains every actual attempt.
 */
export class BenchmarkAccounting {
  committedMicroUsd: number;
  admittedCalls = 0;
  completedCalls = 0;
  private readonly pending = new Map<string, BenchmarkJournalEvent>();

  constructor(priorUsd: number, events: readonly BenchmarkJournalEvent[] = []) {
    this.committedMicroUsd = micro(priorUsd);
    for (const event of events) this.apply(event);
  }

  get pendingAdmissions(): BenchmarkJournalEvent[] {
    return [...this.pending.values()];
  }

  apply(event: BenchmarkJournalEvent): void {
    let total: number | undefined;
    if (event.event === 'admitted') {
      total = sumSafeIntegers([this.committedMicroUsd, micro(event.reservedUsd!)]);
      this.pending.set(event.key, event);
      this.admittedCalls++;
    } else if (event.event === 'result') {
      const admission = this.pending.get(event.key);
      requireValue(admission, 'result without a pending reservation');
      const reserved = micro(admission.reservedUsd!);
      const receipt = event.record!.result.receipt;
      const known = Math.max(
        micro(receipt.estimatedCostUsd ?? 0),
        micro(receipt.providerReportedCostUsd ?? 0),
      );
      const settled =
        (receipt.usage || receipt.macrofoldCostAttribution?.basis === 'deployment') &&
        receipt.estimatedCostUsd !== undefined &&
        !receipt.completionUncertain
          ? known
          : Math.max(reserved, known);
      total = sumSafeIntegers([this.committedMicroUsd - reserved, settled]);
      this.pending.delete(event.key);
      this.completedCalls++;
    } else return;
    requireValue(total !== undefined, 'aggregate accounting overflow');
    this.committedMicroUsd = total;
  }
}
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid benchmark journal object.');
}
function requireValue(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`Invalid benchmark journal: ${reason}.`);
}
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const date = (value: unknown) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT/.test(value) &&
  Number.isFinite(Date.parse(value));
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const count = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;

/** Current manifests only: corrupt funding or limits cannot authorize resumed spending. */
export function assertValidManifest(value: unknown): asserts value is BenchmarkManifest {
  object(value);
  if (value.modelExperiment !== undefined) validateResolvedModelExperiment(value.modelExperiment);
  const availableArms =
    value.modelExperiment === undefined
      ? armById
      : experimentArms({ modelExperiment: value.modelExperiment });
  requireValue(
    text(value.version) &&
      hash(value.corpusDigest) &&
      typeof value.gitCommit === 'string' &&
      /^[a-f0-9]{40}$/.test(value.gitCommit),
    'manifest identity',
  );
  requireValue(
    typeof value.runId === 'string' &&
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value.runId),
    'run identity',
  );
  requireValue(
    Array.isArray(value.models) &&
      value.models.length > 0 &&
      value.models.length <= availableArms.size &&
      new Set(value.models).size === value.models.length &&
      value.models.every((model) => typeof model === 'string' && availableArms.has(model)),
    'model binding',
  );
  const cap = usdToMicroUsd(value.capUsd),
    price = usdToMicroUsd(value.maxCostUsd);
  requireValue(
    cap !== undefined &&
      cap > 0 &&
      cap <= 100_000_000 &&
      price !== undefined &&
      price > 0 &&
      price <= cap,
    'spending limits',
  );
  requireValue(
    hash(value.executionDigest) &&
      usdToMicroUsd(value.priorCommitmentUsd)! >= 0 &&
      usdToMicroUsd(value.priorCommitmentUsd)! <= cap!,
    'execution policy or prior commitment',
  );
  requireValue(
    count(value.concurrency) &&
      value.concurrency >= 1 &&
      value.concurrency <= 4 &&
      count(value.timeoutMs) &&
      value.timeoutMs >= 1000 &&
      value.timeoutMs <= 300000,
    'execution limits',
  );
  if (value.modelExperiment) {
    const plan = value.modelExperiment.plan;
    requireValue(
      value.models.length === availableArms.size &&
        cap === usdToMicroUsd(plan.limits.cap_usd) &&
        price === usdToMicroUsd(plan.limits.per_call_usd) &&
        usdToMicroUsd(value.priorCommitmentUsd) === usdToMicroUsd(plan.prior_commitment_usd) &&
        value.timeoutMs === plan.limits.timeout_ms &&
        value.concurrency === plan.limits.concurrency,
      'experiment limits or arm selection',
    );
  }
  requireValue(
    (value.streamGeneration === undefined || value.streamGeneration === true) &&
      date(value.startedAt),
    'delivery or timestamp',
  );
  requireValue(value.billingMode === 'managed' || value.billingMode === 'byok', 'billing mode');
  requireValue(
    value.billingMode === 'byok'
      ? text(value.providerConnectionId) &&
          value.providerConnectionId.length <= 256 &&
          !/\s/.test(value.providerConnectionId)
      : value.providerConnectionId === undefined,
    'funding connection',
  );
  requireValue(typeof value.baseUrl === 'string', 'base URL');
  const url = new URL(value.baseUrl);
  requireValue(
    ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    'base URL',
  );
}

export function assertBenchmarkRecord(
  value: unknown,
  key: string,
  requestId: string,
  expectedDigest: string,
  acceptedRun?: string,
  availableArms: ReadonlyMap<string, BenchmarkArm> = armById,
): asserts value is RunRecord {
  object(value);
  requireValue(
    text(value.model) &&
      text(value.sceneId) &&
      `${value.model}:${value.sceneId}` === key &&
      value.requestId === requestId &&
      value.inputDigest === expectedDigest,
    'result identity or input digest',
  );
  object(value.result);
  const result = value.result;
  requireValue(
    typeof result.outcome === 'string' &&
      [
        'value',
        'unknown',
        'unavailable',
        'invalid',
        'failed',
        'refused',
        'cancelled',
        'uncertain',
      ].includes(result.outcome),
    'result outcome',
  );
  object(result.receipt);
  const receipt = result.receipt;
  const arm = availableArms.get(String(value.model));
  requireValue(arm, 'unknown arm');
  requireValue(
    value.stream === undefined ||
      (value.stream === true && arm.transport === 'macrofold-generation'),
    'generation delivery mode',
  );
  const macrofold = arm.transport.startsWith('macrofold');
  requireValue(
    value.outputMode === undefined ||
      (arm.macrofoldDeployment !== undefined &&
        ['json_schema', 'json_object', 'prompted_json'].includes(String(value.outputMode))),
    'output mode',
  );
  if (receipt.macrofoldDeployment !== undefined) {
    object(receipt.macrofoldDeployment);
    requireValue(
      arm.macrofoldDeployment !== undefined &&
        receipt.macrofoldDeployment.deploymentId ===
          arm.macrofoldDeployment.modelBinding.deployment_id &&
        (arm.macrofoldDeployment.modelBinding.deployment_revision_id === undefined ||
          receipt.macrofoldDeployment.deploymentRevisionId ===
            arm.macrofoldDeployment.modelBinding.deployment_revision_id),
      'deployment receipt binding',
    );
  }
  requireValue(
    receipt.requestId === requestId &&
      receipt.provider === (macrofold ? 'macrofold' : 'openai') &&
      receipt.requestedModel === arm.model &&
      text(receipt.model) &&
      ['reported', 'unavailable'].includes(String(receipt.modelVersionStatus)),
    'receipt identity',
  );
  requireValue(
    hash(receipt.contextDigest) &&
      (receipt.providerRequestDigest === undefined || hash(receipt.providerRequestDigest)) &&
      date(receipt.startedAt) &&
      date(receipt.completedAt) &&
      finite(receipt.latencyMs) &&
      receipt.latencyMs >= 0,
    'receipt metadata',
  );
  requireValue(
    typeof receipt.dispatched === 'boolean' && typeof receipt.completionUncertain === 'boolean',
    'dispatch evidence',
  );
  requireValue(
    receipt.providerRequestId === undefined ||
      (typeof receipt.providerRequestId === 'string' &&
        /^[\w.:-]{1,256}$/.test(receipt.providerRequestId)),
    'provider correlation identity',
  );
  requireValue(
    receipt.dispatched ||
      (!receipt.completionUncertain &&
        (receipt.providerRequestId === undefined ||
          (!macrofold &&
            [400, 401, 403, 404, 413, 422, 429].includes(Number(receipt.httpStatus))))),
    'undispatched completion',
  );
  requireValue(
    (!macrofold || receipt.providerRequestId === acceptedRun) &&
      (!acceptedRun || receipt.dispatched),
    'accepted Run receipt',
  );
  requireValue(
    receipt.estimatedCostUsd === undefined || usdToMicroUsd(receipt.estimatedCostUsd) !== undefined,
    'receipt price',
  );
  requireValue(
    receipt.providerReportedCostUsd === undefined ||
      usdToMicroUsd(receipt.providerReportedCostUsd)! >= 0,
    'provider invoice',
  );
  requireValue(
    receipt.httpStatus === undefined ||
      (count(receipt.httpStatus) && receipt.httpStatus >= 100 && receipt.httpStatus <= 599),
    'HTTP status',
  );
  for (const field of ['providerErrorCode', 'providerErrorType'])
    requireValue(
      receipt[field] === undefined ||
        (typeof receipt[field] === 'string' && /^[a-z][a-z0-9_]{0,127}$/.test(receipt[field])),
      'provider error identifier',
    );
  requireValue(
    receipt.retryAfterMs === undefined || count(receipt.retryAfterMs),
    'provider minimum wait',
  );
  if (receipt.providerRateLimit !== undefined) {
    object(receipt.providerRateLimit);
    const fields = ['remainingRequests', 'remainingTokens', 'resetRequestsMs', 'resetTokensMs'];
    requireValue(
      Object.keys(receipt.providerRateLimit).every((key) => fields.includes(key)),
      'provider rate fields',
    );
    for (const field of fields)
      requireValue(
        receipt.providerRateLimit[field] === undefined || count(receipt.providerRateLimit[field]),
        'provider rate value',
      );
  }
  if (receipt.questionRefusals !== undefined)
    requireValue(
      arm.transport === 'openai-decision' &&
        Array.isArray(receipt.questionRefusals) &&
        receipt.questionRefusals.length > 0 &&
        receipt.questionRefusals.length <= 200 &&
        new Set(receipt.questionRefusals).size === receipt.questionRefusals.length &&
        receipt.questionRefusals.every(
          (id) => typeof id === 'string' && id.length > 0 && id.length <= 256,
        ),
      'individual question refusals',
    );
  for (const field of [
    'providerLatencyMs',
    'providerQueueLatencyMs',
    'intermediaryRunLatencyMs',
    'intermediaryQueueLatencyMs',
  ])
    requireValue(
      receipt[field] === undefined || (finite(receipt[field]) && receipt[field] >= 0),
      'provider timing',
    );
  if (receipt.usage !== undefined) {
    object(receipt.usage);
    requireValue(
      count(receipt.usage.inputTokens) && count(receipt.usage.outputTokens),
      'token usage',
    );
    for (const field of ['cachedInputTokens', 'cacheWriteInputTokens', 'reasoningOutputTokens'])
      requireValue(
        receipt.usage[field] === undefined || count(receipt.usage[field]),
        'token usage',
      );
    requireValue(
      Number(receipt.usage.cachedInputTokens ?? 0) +
        Number(receipt.usage.cacheWriteInputTokens ?? 0) <=
        receipt.usage.inputTokens &&
        Number(receipt.usage.reasoningOutputTokens ?? 0) <= receipt.usage.outputTokens,
      'token subsets',
    );
  }
  if (result.outcome === 'value') {
    object(result.value);
    object(result.value.answers);
    const answers = result.value.answers;
    requireValue(
      !Array.isArray(receipt.questionRefusals) ||
        receipt.questionRefusals.every((id: string) => !Object.hasOwn(answers, id)),
      'question both answered and refused',
    );
    requireValue(
      receipt.dispatched &&
        (!macrofold || acceptedRun !== undefined) &&
        !receipt.completionUncertain &&
        (Object.keys(result.value.answers).length > 0 || Object.hasOwn(value, 'generation')),
      'successful result',
    );
    for (const answer of Object.values(result.value.answers)) {
      object(answer);
      if (answer.type === 'noul') requireValue(finite(answer.noul), 'numeric answer');
      else {
        requireValue(answer.type === 'choice' || answer.type === 'score', 'answer type');
        object(answer.probabilities);
        requireValue(
          Object.values(answer.probabilities).every(finite) &&
            (!Object.hasOwn(answer, 'confidence') || finite(answer.confidence)),
          'answer evidence',
        );
        if (answer.type === 'choice')
          requireValue(
            text(answer.choice) &&
              (Object.hasOwn(answer.probabilities, answer.choice) ||
                // The production fallback returns a selected handle without a
                // probability vector. Keep that actual JSON; never fabricate confidence.
                (Object.keys(answer.probabilities).length === 0 &&
                  Object.hasOwn(value, 'generation'))),
            'choice answer',
          );
        else {
          object(answer.legend);
          requireValue(
            finite(answer.score) && Object.values(answer.legend).every(text),
            'score answer',
          );
        }
      }
    }
  } else requireValue(text(result.reason), 'failure reason');
}

/** Preserve unfinished admissions, but refuse conflicting or forged resume evidence. */
export function validateJournal(
  events: unknown[],
  manifest: BenchmarkManifest,
  expectedInputs: Map<string, string>,
): BenchmarkJournalEvent[] {
  assertValidManifest(manifest);
  const availableArms = experimentArms(manifest);
  const admitted = new Map<string, string>(),
    requestIds = new Set<string>(),
    accepted = new Map<string, string>(),
    runIds = new Set<string>(),
    completed = new Set<string>();
  const accounting = new BenchmarkAccounting(manifest.priorCommitmentUsd);
  const validated: BenchmarkJournalEvent[] = [];
  for (const event of events) {
    object(event);
    requireValue(text(event.key) && text(event.requestId) && date(event.at), 'event identity');
    const key = event.key;
    const expectedDigest = expectedInputs.get(key);
    requireValue(expectedDigest !== undefined && hash(expectedDigest), 'unknown model or scene');
    const model = manifest.models.find((model) => key.startsWith(`${model}:`));
    requireValue(model !== undefined, 'unselected model');
    const scene = event.key.slice(model.length + 1);
    requireValue(
      event.requestId === `olbench:${manifest.runId}:${scene}:${manifest.models.indexOf(model)}`,
      'request binding',
    );
    if (event.event === 'admitted') {
      requireValue(
        !admitted.has(event.key) &&
          !requestIds.has(event.requestId) &&
          usdToMicroUsd(event.reservedUsd)! > 0 &&
          usdToMicroUsd(event.reservedUsd)! <= usdToMicroUsd(manifest.maxCostUsd)!,
        'duplicate admission or reservation',
      );
      admitted.set(event.key, event.requestId);
      requestIds.add(event.requestId);
      const admission: BenchmarkJournalEvent = {
        event: 'admitted',
        key,
        requestId: event.requestId,
        reservedUsd: Number(event.reservedUsd),
        at: String(event.at),
      };
      accounting.apply(admission);
      requireValue(
        accounting.committedMicroUsd <= usdToMicroUsd(manifest.capUsd)!,
        'aggregate reservation',
      );
      validated.push(admission);
    } else {
      requireValue(
        admitted.get(event.key) === event.requestId && !completed.has(event.key),
        'unadmitted or completed event',
      );
      if (event.event === 'accepted') {
        requireValue(
          text(event.runId) && !accepted.has(event.key) && !runIds.has(event.runId),
          'duplicate accepted Run',
        );
        accepted.set(event.key, event.runId);
        runIds.add(event.runId);
        validated.push({
          event: 'accepted',
          key,
          requestId: event.requestId,
          runId: event.runId,
          at: String(event.at),
        });
      } else {
        requireValue(event.event === 'result', 'event kind');
        assertBenchmarkRecord(
          event.record,
          event.key,
          event.requestId,
          expectedDigest,
          accepted.get(event.key),
          availableArms,
        );
        requireValue(
          event.record.stream ===
            (manifest.streamGeneration &&
            availableArms.get(model)!.transport === 'macrofold-generation'
              ? true
              : undefined),
          'request delivery differs from manifest',
        );
        completed.add(event.key);
        const result: BenchmarkJournalEvent = {
          event: 'result',
          key,
          requestId: event.requestId,
          record: event.record,
          at: String(event.at),
        };
        accounting.apply(result);
        validated.push(result);
      }
    }
  }
  return validated;
}

export function parseJournal(text: string): unknown[] {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as unknown);
}
