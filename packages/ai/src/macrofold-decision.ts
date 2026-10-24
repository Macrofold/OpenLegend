import { setTimeout as delay } from 'node:timers/promises';
import { NetworkError, type NetworkOwner } from '@open-legend/network';
import { MacrofoldTransport, MacrofoldHttpError, macrofoldObject as object } from './macrofold.js';
import {
  captureMacrofoldDeploymentTarget,
  captureMacrofoldDeploymentReceipt,
  decodeMacrofoldGeneration,
  macrofoldDeploymentRequestFields,
  prepareMacrofoldGenerationInput,
  type MacrofoldDeploymentTarget,
  type MacrofoldOutputMode,
} from './macrofold-inference-target.js';
import {
  microUsdToUsd,
  parseNonnegativeSafeInteger,
  sumSafeIntegers,
  usdToMicroUsd,
} from './cost.js';
import {
  prepareSchema,
  PreparedJson,
  decodeJudge,
  decodeUsage,
  digest,
  InvalidData,
  record,
  serialize,
  prepareQuestions,
} from './validation.js';
import type {
  AiReceipt,
  AiResult,
  FetchTransport,
  GenerateRequest,
  JsonValue,
  JudgeRequest,
  JudgeValue,
  RequestControl,
  TokenUsage,
} from './types.js';

export type MacrofoldDecisionModel = 'typesafe/jev-1.13' | 'microsoft/microsoft-decision-1';
export type MacrofoldBillingMode = NonNullable<AiReceipt['macrofoldBillingMode']>;

interface MacrofoldTransportConfig {
  baseUrl: string;
  apiKey: string;
  /** An explicit caller-funded limit; this client owns no aggregate spending ledger. */
  maxCostUsd: number;
  timeoutMs?: number;
  fetch?: FetchTransport;
  network?: NetworkOwner;
}

type MacrofoldCatalogBinding<Model extends string> = {
  model: Model;
  billingMode: MacrofoldBillingMode;
  providerConnectionId?: string;
  macrofoldDeployment?: never;
  macrofoldOutputMode?: never;
};

type MacrofoldDeploymentBinding = {
  macrofoldDeployment: MacrofoldDeploymentTarget;
  model?: never;
  billingMode?: never;
  providerConnectionId?: never;
};

export type MacrofoldGenerationConfig = MacrofoldTransportConfig &
  (
    | MacrofoldCatalogBinding<string>
    | (MacrofoldDeploymentBinding & {
        macrofoldOutputMode: MacrofoldOutputMode;
      })
  );

export type MacrofoldDecisionConfig = MacrofoldTransportConfig &
  (
    | MacrofoldCatalogBinding<MacrofoldDecisionModel>
    | (MacrofoldDeploymentBinding & { macrofoldOutputMode?: never })
  );

export interface MacrofoldGenerationRequest extends GenerateRequest {
  /** Stream delivery internally; only the completed, validated value is returned. */
  stream?: boolean;
  /** Persist the accepted Run before observation; callback failure never resubmits. */
  onAccepted?: (runId: string) => Promise<void>;
}

export interface MacrofoldDecisionRequest extends JudgeRequest {
  stream?: false;
  /** Optional reduction from the normal answer allowance, such as a prepared deployment cap. */
  maxOutputTokens?: number;
  /** Persist this identity before observation; a failed callback never resubmits admission. */
  onAccepted?: (runId: string) => Promise<void>;
}

const terminal = new Set(['succeeded', 'failed', 'cancelled', 'timed_out']);

/** A finalized immediate response carries the same identity facts as a Run read.
 * No extra observation is needed merely to reconstruct that control projection. */
export function macrofoldTerminalStatus(
  accepted: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!accepted['result'] || !terminal.has(String(accepted['status']))) return undefined;
  return {
    id: accepted['run_id'],
    kind: accepted['kind'],
    status: accepted['status'],
    wait_seconds: accepted['wait_seconds'],
  };
}

/** Run execution includes platform finalization; it is never model-only latency. */
export function captureMacrofoldRunTiming(
  status: Record<string, unknown>,
  receipt: AiReceipt,
): void {
  const began = typeof status['started_at'] === 'string' ? Date.parse(status['started_at']) : NaN;
  const ended =
    typeof status['completed_at'] === 'string' ? Date.parse(status['completed_at']) : NaN;
  if (Number.isFinite(began) && Number.isFinite(ended))
    receipt.intermediaryRunLatencyMs = Math.max(0, Math.round(ended - began));
  if (typeof status['wait_seconds'] === 'number' && Number.isFinite(status['wait_seconds']))
    receipt.intermediaryQueueLatencyMs = Math.max(0, Math.round(status['wait_seconds'] * 1000));
}

/** Shared completion/accounting meaning for immediate calls and their recovery.
 * Missing billing stays unknown; it does not trigger a report query or a new call. */
export function captureMacrofoldInferenceReceipt(
  run: string,
  status: Record<string, unknown>,
  result: Record<string, unknown>,
  receipt: AiReceipt,
): Record<string, unknown> {
  receipt.completionUncertain = macrofoldInferenceEvidence(run, status, result).completionUncertain;
  const inference = object(result['inference']);
  captureMacrofoldDeploymentReceipt(inference, receipt, receipt.macrofoldRequestedDeployment);
  const admittedMode = receipt.macrofoldBillingMode;
  const reportedMode = record(inference['billing'])
    ? inference['billing']['billing_mode']
    : undefined;
  // Current host configuration cannot reinterpret an older Run's zero BYOK
  // platform charge as a paid model's complete bill. Conflicting evidence is unpriced.
  const billingMode =
    (admittedMode === 'managed' || admittedMode === 'byok') &&
    (reportedMode === undefined || reportedMode === admittedMode)
      ? admittedMode
      : undefined;
  if (billingMode === undefined) delete receipt.estimatedCostUsd;
  captureEmbeddedInferenceUsage(inference, receipt, billingMode);
  // A fetched terminal Run independently reports the same managed charge. Keep
  // the larger usable observation; never add overlapping reports of one bill.
  // Immediate response projections contain no Run charge to manufacture here.
  const runCharge = billingMode === 'managed' ? microUsdToUsd(status['cost_micro_usd']) : undefined;
  if (runCharge !== undefined)
    receipt.estimatedCostUsd = Math.max(receipt.estimatedCostUsd ?? 0, runCharge);
  captureMacrofoldRunTiming(status, receipt);
  if (
    typeof inference['model_revision'] === 'string' &&
    /^[\w./:-]{1,128}$/.test(inference['model_revision'])
  ) {
    receipt.model = inference['model_revision'];
    receipt.modelVersionStatus = 'reported';
  }
  const providerMs = record(inference['timings_ms'])
    ? inference['timings_ms']['provider']
    : undefined;
  if (typeof providerMs === 'number' && Number.isFinite(providerMs) && providerMs >= 0)
    receipt.providerLatencyMs = providerMs;
  const nativeValue = inference['value'];
  if (record(nativeValue) && record(nativeValue['answers'])) {
    // These native diagnostics are separate from transport time. Retain only
    // supported scalar metadata, never an extra copy of private model output.
    const nativeMs = nativeValue['latency_ms'];
    if (typeof nativeMs === 'number' && Number.isFinite(nativeMs) && nativeMs >= 0)
      receipt.nativeLatencyMs = nativeMs;
    if (typeof nativeValue['truncated'] === 'boolean')
      receipt.nativeTruncated = nativeValue['truncated'];
  }
  return inference;
}

/** Shared by gameplay and standalone evaluation: a charge alone does not prove completion. */
export function macrofoldInferenceEvidence(
  run: string,
  status: Record<string, unknown>,
  result: Record<string, unknown>,
): { completionUncertain: boolean; uninvokedInferenceChargeUsd?: number } {
  if (
    status['id'] !== run ||
    status['kind'] !== 'inference' ||
    !terminal.has(String(status['status'])) ||
    result['run_id'] !== run ||
    result['final'] !== true
  )
    throw new InvalidData('macrofold_terminal_identity_invalid');
  const inference = object(result['inference']);
  const outcome = inference['outcome'];
  const providerOutcome = inference['provider_outcome'];
  if (
    typeof outcome !== 'string' ||
    ![
      'value',
      'unknown',
      'refused',
      'invalid_output',
      'failed',
      'uncertain',
      'stale_input',
    ].includes(outcome) ||
    typeof providerOutcome !== 'string' ||
    !['not_invoked', 'responded', 'uncertain'].includes(providerOutcome)
  )
    throw new InvalidData('macrofold_inference_outcome_invalid');
  const expected = ['value', 'unknown', 'refused', 'stale_input'].includes(outcome)
    ? 'succeeded'
    : 'failed';
  const completionUncertain =
    outcome === 'uncertain' ||
    providerOutcome === 'uncertain' ||
    (outcome === 'value' && providerOutcome === 'not_invoked') ||
    result['execution_outcome'] !==
      (status['status'] === 'succeeded'
        ? 'success'
        : status['status'] === 'failed'
          ? 'failure'
          : status['status']) ||
    (!['cancelled', 'timed_out'].includes(String(status['status'])) &&
      status['status'] !== expected);
  return {
    completionUncertain,
    uninvokedInferenceChargeUsd:
      !completionUncertain && providerOutcome === 'not_invoked'
        ? microUsdToUsd(status['cost_micro_usd'])
        : undefined,
  };
}

/** Decode accounting independently: unusable usage must not discard a valid answer
 * or a separately known charge. Missing usage never falls back to the model body.
 * docs/ai-providers.md#receipts-outcomes-and-accounting */
function captureEmbeddedInferenceUsage(
  inference: Record<string, unknown>,
  receipt: AiReceipt,
  billingMode: MacrofoldBillingMode | undefined,
): void {
  const usage = record(inference['usage']) ? inference['usage'] : {};
  const billing =
    record(inference['billing']) && inference['billing']['billing_mode'] === billingMode
      ? inference['billing']
      : {};
  const raw = inference['value'];
  const nativeUsage =
    record(raw) && record(raw.usage) && raw.usage.prompt_tokens !== undefined
      ? decodeUsage({
          usage: {
            input_tokens: raw.usage.prompt_tokens,
            output_tokens: raw.usage.completion_tokens,
            input_tokens_details: raw.usage.prompt_tokens_details,
            output_tokens_details: raw.usage.completion_tokens_details,
          },
        })
      : decodeUsage(raw);
  const input = parseNonnegativeSafeInteger(usage['input_tokens']),
    output = parseNonnegativeSafeInteger(usage['output_tokens']);
  // Null means unreported; malformed supplied cache counts invalidate usage.
  const cacheCount = (value: unknown) =>
    value === null ? undefined : (parseNonnegativeSafeInteger(value) ?? NaN);
  const cached = cacheCount(usage['cached_input_tokens']),
    written = cacheCount(usage['cache_write_input_tokens']);
  const reasoning =
    nativeUsage?.outputTokens === output ? nativeUsage?.reasoningOutputTokens : undefined;
  const embeddedUsage =
    usage['completeness'] === 'complete' && input !== undefined && output !== undefined
      ? decodeUsage({
          usage: {
            input_tokens: input,
            output_tokens: output,
            input_tokens_details: {
              ...(cached === undefined ? {} : { cached_tokens: cached }),
              ...(written === undefined ? {} : { cache_write_tokens: written }),
            },
            ...(reasoning === undefined
              ? {}
              : { output_tokens_details: { reasoning_tokens: reasoning } }),
          },
        })
      : undefined;
  // Deployment request fees are fixed independently of token metering. The
  // gateway's provisional flag can describe missing usage even when its exact
  // matched deployment attribution and all request-fee fields establish zero.
  // Uncertain execution still retains its original reservation.
  const fixedDeploymentFee =
    billingMode === 'byok' &&
    !receipt.completionUncertain &&
    receipt.macrofoldRequestedDeployment !== undefined &&
    receipt.macrofoldDeployment !== undefined &&
    receipt.macrofoldCostAttribution?.basis === 'deployment' &&
    receipt.macrofoldCostAttribution.deploymentId === receipt.macrofoldDeployment.deploymentId &&
    receipt.macrofoldCostAttribution.infrastructureCostIncluded === false &&
    microUsdToUsd(billing['charged_micro_usd']) === 0 &&
    microUsdToUsd(billing['reported_micro_usd']) === 0 &&
    microUsdToUsd(billing['budget_cost_micro_usd']) === 0;
  const estimatedCostUsd =
    billingMode === 'managed'
      ? microUsdToUsd(billing['charged_micro_usd'])
      : fixedDeploymentFee
        ? 0
        : billingMode === 'byok' && billing['provisional'] === false && embeddedUsage
          ? microUsdToUsd(billing['reported_micro_usd'])
          : undefined;
  const reported = billing['provider_reported_cost_usd'];
  const providerReportedCostUsd =
    billing['provider_reported_cost_status'] === 'reported' &&
    typeof reported === 'number' &&
    usdToMicroUsd(reported) !== undefined
      ? reported
      : undefined;
  // Exact-Run reconciliation can add evidence, but a missing field cannot erase
  // previously established usage, a platform charge or a provider-reported amount.
  if (embeddedUsage !== undefined) receipt.usage = embeddedUsage;
  if (estimatedCostUsd !== undefined)
    receipt.estimatedCostUsd = Math.max(receipt.estimatedCostUsd ?? 0, estimatedCostUsd);
  if (providerReportedCostUsd !== undefined)
    receipt.providerReportedCostUsd = providerReportedCostUsd;
}

/** Complete exact-Run native harness usage. Inferences use their embedded receipt. */
export async function captureMacrofoldRunUsage(
  api: Pick<MacrofoldTransport, 'request'>,
  receipt: AiReceipt,
  signal: AbortSignal,
): Promise<void> {
  if (!receipt.providerRequestId) return;
  const billingMode = receipt.macrofoldBillingMode;
  if (billingMode !== 'managed' && billingMode !== 'byok') {
    delete receipt.estimatedCostUsd;
    return;
  }
  try {
    const query = new URLSearchParams({
      from: receipt.startedAt,
      to: new Date().toISOString(),
      run_id: receipt.providerRequestId,
      limit: '100',
    });
    const page = object(
      await api.request(`/v1/billing/usage?${query}`, undefined, undefined, signal),
    );
    if (page['next_cursor'] !== null || !Array.isArray(page['data']) || page['data'].length > 100)
      return;
    const entries = page['data'].map(object);
    if (
      entries.some(
        (entry) =>
          entry['run_id'] !== receipt.providerRequestId ||
          typeof entry['kind'] !== 'string' ||
          !['model', 'tool', 'compute', 'storage'].includes(entry['kind']),
      )
    )
      return;
    const models = entries
      .filter((entry) => entry['kind'] === 'model')
      .map((entry) => object(entry['model_usage']));
    // A native harness's usage-based estimate needs complete model rows;
    // an empty page may precede billing and cannot prove free execution.
    // docs/ai-providers.md#receipts-outcomes-and-accounting
    if (
      !models.length ||
      models.some((model) => model['completeness'] !== 'complete' || model['provisional'] !== false)
    )
      return;
    const integer = parseNonnegativeSafeInteger;
    const usages: TokenUsage[] = [];
    for (const model of models) {
      const usage = decodeUsage({
        usage: {
          input_tokens: integer(model['input_tokens']),
          output_tokens: integer(model['output_tokens']),
          input_tokens_details: {
            cached_tokens:
              model['cached_input_tokens'] == null
                ? 0
                : (integer(model['cached_input_tokens']) ?? NaN),
            cache_write_tokens:
              model['cache_write_input_tokens'] == null
                ? 0
                : (integer(model['cache_write_input_tokens']) ?? NaN),
          },
        },
      });
      if (!usage) return;
      usages.push(usage);
    }
    const total = (key: keyof TokenUsage) =>
      sumSafeIntegers(usages.map((usage) => usage[key] ?? 0));
    const input = total('inputTokens'),
      output = total('outputTokens');
    const cached = total('cachedInputTokens'),
      written = total('cacheWriteInputTokens');
    if (
      input === undefined ||
      output === undefined ||
      cached === undefined ||
      written === undefined
    )
      return;
    const reasoning =
      receipt.usage?.outputTokens === output ? receipt.usage.reasoningOutputTokens : undefined;
    receipt.usage = {
      inputTokens: input,
      outputTokens: output,
      cachedInputTokens: cached,
      cacheWriteInputTokens: written,
      ...(reasoning === undefined ? {} : { reasoningOutputTokens: reasoning }),
    };
    if (billingMode === 'byok') {
      const charges = [
        ...models.map((model) => integer(model['reported_micro_usd']) ?? NaN),
        ...entries
          .filter((entry) => entry['kind'] !== 'model')
          .map((entry) => integer(entry['charged_micro_usd']) ?? NaN),
      ];
      const charged = sumSafeIntegers(charges);
      const cost = charged === undefined ? undefined : microUsdToUsd(String(charged));
      if (cost !== undefined)
        receipt.estimatedCostUsd = Math.max(receipt.estimatedCostUsd ?? 0, cost);
    }
  } catch {
    // Reporting failure cannot turn completed work into free execution or trigger paid retries.
  }
}

interface PreparedInference<T> {
  input: Record<string, unknown>;
  maxOutputTokens: number;
  decode(raw: unknown): { value: T } | { refused: true };
}

function outputTokenLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 16_384)
    throw new InvalidData('output_limit_exceeded');
  return value;
}

type InferenceRequest = RequestControl & {
  stream?: boolean;
  onProgress?: GenerateRequest['onProgress'];
  onAccepted?: (runId: string) => Promise<void>;
};

/** One admission/Run lifecycle for native decisions and schema-valued generation. */
function createMacrofoldExecutor(
  configuration: MacrofoldGenerationConfig | MacrofoldDecisionConfig,
  kind: 'decision' | 'generation',
) {
  const config = Object.freeze({ ...configuration });
  const deployment = config.macrofoldDeployment
    ? captureMacrofoldDeploymentTarget(config.macrofoldDeployment)
    : undefined;
  const model = deployment ? `deployment:${deployment.modelBinding.deployment_id}` : config.model;
  const billingMode = deployment ? 'byok' : config.billingMode;
  const maxCost = usdToMicroUsd(config.maxCostUsd);
  const configuredTimeout = config.timeoutMs ?? 120_000;
  const timeout = deployment ? Math.min(configuredTimeout, 240_000) : configuredTimeout;
  if (
    maxCost === undefined ||
    (maxCost === 0 && deployment === undefined) ||
    !Number.isSafeInteger(configuredTimeout) ||
    configuredTimeout < 1 ||
    configuredTimeout > 300_000 ||
    !model?.trim() ||
    model.length > 200 ||
    !billingMode ||
    !['managed', 'byok'].includes(billingMode) ||
    (deployment !== undefined &&
      (config.model !== undefined ||
        config.billingMode !== undefined ||
        config.providerConnectionId !== undefined ||
        (kind === 'decision'
          ? config.macrofoldOutputMode !== undefined
          : !['json_schema', 'json_object', 'prompted_json'].includes(
              config.macrofoldOutputMode ?? '',
            ))))
  )
    throw new Error('Invalid Macrofold inference configuration.');
  const api = new MacrofoldTransport(config.baseUrl, config.apiKey, config.fetch, config.network);
  return async function execute<T>(
    request: InferenceRequest,
    prepare: () => PreparedInference<T>,
  ): Promise<AiResult<T>> {
    const started = Date.now();
    const receipt: AiReceipt = {
      requestId: request.requestId,
      provider: 'macrofold',
      macrofoldBillingMode: billingMode,
      ...(deployment ? { macrofoldRequestedDeployment: deployment } : {}),
      requestedModel: model,
      model,
      modelVersionStatus: 'unavailable',
      contextDigest: digest('invalid_context'),
      startedAt: new Date(started).toISOString(),
      completedAt: new Date(started).toISOString(),
      latencyMs: 0,
      dispatched: false,
      completionUncertain: false,
    };
    let run: string | undefined;
    try {
      if (
        typeof request.requestId !== 'string' ||
        !request.requestId ||
        request.requestId.length > 256
      )
        throw new InvalidData('invalid_request_id');
      if (
        request.stream !== undefined &&
        request.stream !== false &&
        (kind !== 'generation' || request.stream !== true)
      )
        throw new InvalidData(
          kind === 'decision'
            ? 'decision_streaming_unsupported'
            : 'inference_streaming_unsupported',
        );
      const prepared = prepare();
      const input = prepared.input;
      receipt.contextDigest = digest(serialize(input, 500_000));
      if (!config.apiKey.trim())
        return { outcome: 'unavailable', reason: 'provider_not_configured', receipt };
      if (request.signal?.aborted)
        return { outcome: 'cancelled', reason: 'caller_cancelled', receipt };
      const remaining = Math.min(timeout, (request.deadlineMs ?? started + timeout) - Date.now());
      if (!Number.isFinite(remaining) || remaining <= 0)
        return { outcome: 'unavailable', reason: 'deadline_expired', receipt };
      return await api.run(
        {
          timeoutMs: Math.max(1, Math.floor(remaining)),
          deadlineAtMs: request.deadlineMs,
          signal: request.signal,
        },
        async (operation) => {
          const signal = operation.signal;
          const body = {
            ...(request.stream ? { stream: true } : {}),
            ...(deployment
              ? macrofoldDeploymentRequestFields(deployment)
              : {
                  model_binding: {
                    provider: 'openrouter',
                    model,
                    billing_mode: receipt.macrofoldBillingMode,
                    ...(config.providerConnectionId
                      ? { provider_connection_id: config.providerConnectionId }
                      : {}),
                  },
                }),
            input,
            limits: {
              max_cost_micro_usd: String(maxCost),
              max_output_tokens: prepared.maxOutputTokens,
              timeout_seconds: Math.ceil(remaining / 1000),
            },
          };
          const preparedBody = new PreparedJson(body, 500_000);
          receipt.providerRequestDigest = digest(preparedBody.text(500_000));
          signal.throwIfAborted();
          receipt.dispatched = true;
          receipt.completionUncertain = true;
          let acceptance: Promise<void> | undefined;
          const rememberAccepted = async (value: Record<string, unknown>) => {
            const id = value['run_id'];
            if (typeof id !== 'string' || !id) throw new InvalidData('macrofold_run_missing');
            if (run !== undefined && run !== id)
              throw new InvalidData('macrofold_run_identity_invalid');
            if (!acceptance) {
              run = id;
              receipt.providerRequestId = id;
              // The stream can detach after acceptance. Retain the same persistence
              // promise, including its failure, when ordinary Run observation resumes.
              acceptance = Promise.resolve().then(() => request.onAccepted?.(id));
            }
            await operation.wait('callback', () => acceptance!);
            return id;
          };
          let accepted: Record<string, unknown>;
          try {
            accepted = object(
              await api.request(
                '/v1/inferences',
                preparedBody,
                digest(request.requestId),
                signal,
                undefined,
                request.stream
                  ? {
                      text: request.onProgress ?? (() => {}),
                      accepted: async (value) => {
                        await rememberAccepted(value);
                      },
                    }
                  : undefined,
              ),
            );
          } catch (error) {
            if (error instanceof MacrofoldHttpError && error.admissionRejected) {
              receipt.dispatched = false;
              receipt.completionUncertain = false;
            }
            throw error;
          }
          run = await rememberAccepted(accepted);
          const embeddedResult = accepted['result'] ? object(accepted['result']) : undefined;
          let status = macrofoldTerminalStatus(accepted);
          const waitForRun = (value: Record<string, unknown>) =>
            delay(Math.max(250, api.retryAfterMs(value) ?? 0), undefined, { signal });
          const readRun = async (path: string): Promise<Record<string, unknown>> => {
            for (;;) {
              signal.throwIfAborted();
              try {
                return object(await api.request(path, undefined, undefined, signal));
              } catch (error) {
                if (!(error instanceof MacrofoldHttpError) || error.status !== 429) throw error;
                // Reading the same accepted Run never creates another funded request.
                await delay(Math.max(1000, error.retryAfterMs ?? 60_000), undefined, {
                  signal: signal,
                });
              }
            }
          };
          if (!status) await waitForRun(accepted);
          while (!status || !terminal.has(String(status['status']))) {
            signal.throwIfAborted();
            status = await readRun(`/v1/runs/${encodeURIComponent(run)}`);
            if (status['id'] !== run) throw new InvalidData('macrofold_run_identity_invalid');
            if (terminal.has(String(status['status']))) break;
            await waitForRun(status);
          }
          let result =
            embeddedResult ?? (await readRun(`/v1/runs/${encodeURIComponent(run)}/result`));
          // A terminal execution can precede result finalization. Observe only
          // this accepted Run within its original deadline; never resubmit it.
          while (result['final'] === false) {
            if (result['run_id'] !== run)
              throw new InvalidData('macrofold_terminal_identity_invalid');
            await waitForRun(result);
            result = await readRun(`/v1/runs/${encodeURIComponent(run)}/result`);
          }
          const inference = captureMacrofoldInferenceReceipt(run, status, result, receipt);
          const raw = inference['value'];
          // Caller cancellation during acceptance persistence or recovery still
          // withdraws the answer; no paid request is retried.
          signal.throwIfAborted();
          if (receipt.completionUncertain)
            return { outcome: 'uncertain', reason: 'provider_completion_unknown', receipt };
          if (status['status'] === 'cancelled')
            return { outcome: 'cancelled', reason: 'provider_cancelled', receipt };
          if (status['status'] === 'timed_out')
            return { outcome: 'failed', reason: 'deadline_exceeded', receipt };
          const outcome = inference['outcome'];
          if (outcome !== 'value')
            return {
              outcome:
                outcome === 'unknown' || outcome === 'refused'
                  ? outcome
                  : outcome === 'invalid_output'
                    ? 'invalid'
                    : 'failed',
              reason: `provider_${String(outcome)}`,
              receipt,
            };
          const decoded = prepared.decode(raw);
          return 'refused' in decoded
            ? { outcome: 'refused', reason: 'provider_refused', receipt }
            : { outcome: 'value', value: decoded.value, receipt };
        },
      );
    } catch (error) {
      const stopped =
        error instanceof NetworkError && ['cancelled', 'deadline_exceeded'].includes(error.kind);
      const callerCancelled = error instanceof NetworkError && error.kind === 'cancelled';
      if (stopped && run) {
        const originalRun = run;
        try {
          await api.runCleanup(() =>
            api.request(
              `/v1/runs/${encodeURIComponent(originalRun)}/cancel`,
              {},
              digest(`cancel:${request.requestId}`),
              undefined,
            ),
          );
        } catch {
          /* Original reservation remains uncertain. */
        }
      }
      if (error instanceof MacrofoldHttpError) {
        receipt.httpStatus = error.status;
        if (/^[a-z][a-z0-9_]{0,127}$/.test(error.code)) receipt.providerErrorCode = error.code;
      }
      const outcome = stopped
        ? callerCancelled
          ? 'cancelled'
          : receipt.dispatched
            ? 'uncertain'
            : 'unavailable'
        : receipt.completionUncertain
          ? 'uncertain'
          : error instanceof InvalidData || error instanceof SyntaxError
            ? 'invalid'
            : error instanceof MacrofoldHttpError && error.admissionRejected
              ? [400, 413, 422].includes(error.status)
                ? 'invalid'
                : 'unavailable'
              : 'failed';
      return {
        outcome,
        reason: stopped
          ? callerCancelled
            ? 'caller_cancelled'
            : 'deadline_exceeded'
          : error instanceof InvalidData
            ? error.code
            : error instanceof MacrofoldHttpError && /^[a-z_]{1,80}$/.test(error.code)
              ? error.code
              : 'macrofold_request_failed',
        receipt,
      };
    } finally {
      receipt.completedAt = new Date().toISOString();
      receipt.latencyMs = Date.now() - started;
    }
  };
}

/** Native decision transport without a game world or Worker. Callers reserve before judge. */
export function createMacrofoldDecisionClient(configuration: MacrofoldDecisionConfig): {
  judge(request: MacrofoldDecisionRequest): Promise<AiResult<JudgeValue>>;
} {
  if (
    !configuration.macrofoldDeployment &&
    !['typesafe/jev-1.13', 'microsoft/microsoft-decision-1'].includes(configuration.model)
  )
    throw new Error('Invalid Macrofold decision configuration.');
  const execute = createMacrofoldExecutor(configuration, 'decision');
  return {
    judge: (request) =>
      execute(request, () => {
        const maxOutputTokens = outputTokenLimit(request.maxOutputTokens ?? 16_384);
        const input = {
          state: JSON.parse(serialize(request.state, 500_000)) as unknown,
          questions: prepareQuestions(request.questions, 500_000),
        };
        return {
          input,
          maxOutputTokens: Math.min(
            maxOutputTokens,
            Math.max(1024, Object.keys(input.questions).length * 64),
          ),
          decode: (raw) => ({ value: decodeJudge(raw, input.questions) }),
        };
      }),
  };
}

/** One existing inference lifecycle for catalog chat and configured deployment generation. */
export function createMacrofoldGenerationClient(configuration: MacrofoldGenerationConfig): {
  generate<T = JsonValue>(request: MacrofoldGenerationRequest): Promise<AiResult<T>>;
} {
  const config: MacrofoldGenerationConfig = configuration.macrofoldDeployment
    ? Object.freeze({
        ...configuration,
        macrofoldDeployment: captureMacrofoldDeploymentTarget(configuration.macrofoldDeployment),
      })
    : Object.freeze({ ...configuration });
  const execute = createMacrofoldExecutor(config, 'generation');
  return {
    generate<T = JsonValue>(request: MacrofoldGenerationRequest): Promise<AiResult<T>> {
      return execute<T>(request, () => {
        const deployment = config.macrofoldDeployment;
        if (deployment) {
          if (request.model !== undefined || request.reasoningEffort !== undefined)
            throw new InvalidData('deployment_provider_parameters_unsupported');
          if (request.macrofoldDeployment) {
            const selected = captureMacrofoldDeploymentTarget(request.macrofoldDeployment);
            if (
              selected.workspaceId !== deployment.workspaceId ||
              selected.modelBinding.deployment_id !== deployment.modelBinding.deployment_id ||
              selected.modelBinding.deployment_revision_id !==
                deployment.modelBinding.deployment_revision_id
            )
              throw new InvalidData('deployment_not_authorized');
          }
          if (
            request.macrofoldOutputMode !== undefined &&
            request.macrofoldOutputMode !== config.macrofoldOutputMode
          )
            throw new InvalidData('deployment_output_mode_not_authorized');
        } else {
          if (
            request.macrofoldDeployment !== undefined ||
            request.macrofoldOutputMode !== undefined
          )
            throw new InvalidData('deployment_not_configured');
          if (request.model !== undefined && request.model !== config.model)
            throw new InvalidData('model_not_authorized');
        }
        const preparedSchema = prepareSchema(request.schema, 500_000);
        const maxOutputTokens = outputTokenLimit(request.maxOutputTokens ?? 4096);
        return {
          maxOutputTokens,
          input: prepareMacrofoldGenerationInput(
            { ...request, maxOutputTokens },
            preparedSchema,
            config.macrofoldOutputMode,
          ),
          decode: (raw) => decodeMacrofoldGeneration<T>(raw, preparedSchema),
        };
      });
    },
  };
}
