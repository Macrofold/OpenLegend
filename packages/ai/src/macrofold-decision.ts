import { setTimeout as delay } from 'node:timers/promises';
import { awaitWithSignal } from './http-response.js';
import { MacrofoldTransport, MacrofoldHttpError, macrofoldObject as object } from './macrofold.js';
import {
  microUsdToUsd,
  parseNonnegativeSafeInteger,
  sumSafeIntegers,
  usdToMicroUsd,
} from './cost.js';
import {
  compileSchema,
  decodeJudge,
  decodeUsage,
  digest,
  InvalidData,
  record,
  serialize,
  validateQuestions,
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
export type MacrofoldBillingMode = 'managed' | 'byok';

export interface MacrofoldGenerationConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  billingMode: MacrofoldBillingMode;
  providerConnectionId?: string;
  /** An explicit caller-funded limit; this client owns no aggregate spending ledger. */
  maxCostUsd: number;
  timeoutMs?: number;
  fetch?: FetchTransport;
}

export interface MacrofoldDecisionConfig extends Omit<MacrofoldGenerationConfig, 'model'> {
  model: MacrofoldDecisionModel;
}

export interface MacrofoldGenerationRequest extends GenerateRequest {
  /** Stream delivery internally; only the completed, validated value is returned. */
  stream?: boolean;
  /** Persist the accepted Run before observation; callback failure never resubmits. */
  onAccepted?: (runId: string) => Promise<void>;
}

export interface MacrofoldDecisionRequest extends JudgeRequest {
  stream?: false;
  /** Persist this identity before observation; a failed callback never resubmits admission. */
  onAccepted?: (runId: string) => Promise<void>;
}

const terminal = new Set(['succeeded', 'failed', 'cancelled', 'timed_out']);

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

/** Exact-Run complete usage, shared with the gameplay adapter. Missing billing stays unpriced. */
export async function captureMacrofoldRunUsage(
  api: Pick<MacrofoldTransport, 'request'>,
  receipt: AiReceipt,
  signal: AbortSignal,
  billingMode: string,
  uninvokedInferenceChargeUsd?: number,
): Promise<void> {
  if (!receipt.providerRequestId) return;
  if (billingMode === 'byok') delete receipt.estimatedCostUsd;
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
    // An exact not-invoked Run can omit model usage. Its known platform
    // charge still needs complete usage; an empty page may precede billing rows.
    // docs/ai-providers.md#receipts-outcomes-and-accounting
    if (
      (!models.length && uninvokedInferenceChargeUsd === undefined) ||
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
      if (
        cost !== undefined &&
        (uninvokedInferenceChargeUsd === undefined || cost >= uninvokedInferenceChargeUsd)
      )
        receipt.estimatedCostUsd = cost;
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

type InferenceRequest = RequestControl & {
  stream?: boolean;
  onProgress?: GenerateRequest['onProgress'];
  onAccepted?: (runId: string) => Promise<void>;
};

/** One admission/Run lifecycle for native decisions and schema-valued generation. */
function createMacrofoldExecutor(
  configuration: MacrofoldGenerationConfig,
  kind: 'decision' | 'generation',
) {
  const config = Object.freeze({ ...configuration });
  const maxCost = usdToMicroUsd(config.maxCostUsd);
  const timeout = config.timeoutMs ?? 120_000;
  if (
    !maxCost ||
    !Number.isSafeInteger(timeout) ||
    timeout < 1 ||
    timeout > 300_000 ||
    !config.model.trim() ||
    config.model.length > 200 ||
    !['managed', 'byok'].includes(config.billingMode)
  )
    throw new Error('Invalid Macrofold inference configuration.');
  const api = new MacrofoldTransport(config.baseUrl, config.apiKey, config.fetch);
  return async function execute<T>(
    request: InferenceRequest,
    prepare: () => PreparedInference<T>,
  ): Promise<AiResult<T>> {
    const started = Date.now();
    const receipt: AiReceipt = {
      requestId: request.requestId,
      provider: 'macrofold',
      requestedModel: config.model,
      model: config.model,
      modelVersionStatus: 'unavailable',
      contextDigest: digest('invalid_context'),
      startedAt: new Date(started).toISOString(),
      completedAt: new Date(started).toISOString(),
      latencyMs: 0,
      dispatched: false,
      completionUncertain: false,
    };
    const controller = new AbortController();
    let callerCancelled = false;
    const cancel = () => {
      if (controller.signal.aborted) return;
      callerCancelled = true;
      controller.abort();
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
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
      request.signal?.addEventListener('abort', cancel, { once: true });
      if (request.signal?.aborted) cancel();
      timer = setTimeout(() => controller.abort(), remaining);
      const body = {
        ...(request.stream ? { stream: true } : {}),
        model_binding: {
          provider: 'openrouter',
          model: config.model,
          billing_mode: config.billingMode,
          ...(config.providerConnectionId
            ? { provider_connection_id: config.providerConnectionId }
            : {}),
        },
        input,
        limits: {
          max_cost_micro_usd: String(maxCost),
          max_output_tokens: prepared.maxOutputTokens,
          timeout_seconds: Math.ceil(remaining / 1000),
        },
      };
      receipt.providerRequestDigest = digest(serialize(body, 500_000));
      controller.signal.throwIfAborted();
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
        await awaitWithSignal(acceptance, controller.signal);
        return id;
      };
      let accepted: Record<string, unknown>;
      try {
        accepted = object(
          await api.request(
            '/v1/inferences',
            body,
            digest(request.requestId),
            controller.signal,
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
      let status: Record<string, unknown>;
      const readRun = async (path: string): Promise<Record<string, unknown>> => {
        for (;;) {
          controller.signal.throwIfAborted();
          try {
            return object(await api.request(path, undefined, undefined, controller.signal));
          } catch (error) {
            if (!(error instanceof MacrofoldHttpError) || error.status !== 429) throw error;
            // Reading the same accepted Run never creates another funded request.
            await delay(Math.max(1000, error.retryAfterMs ?? 60_000), undefined, {
              signal: controller.signal,
            });
          }
        }
      };
      for (;;) {
        controller.signal.throwIfAborted();
        status = await readRun(`/v1/runs/${encodeURIComponent(run)}`);
        if (status['id'] !== run) throw new InvalidData('macrofold_run_identity_invalid');
        if (terminal.has(String(status['status']))) break;
        await delay(250, undefined, { signal: controller.signal });
      }
      const result = accepted['result']
        ? object(accepted['result'])
        : await readRun(`/v1/runs/${encodeURIComponent(run)}/result`);
      const evidence = macrofoldInferenceEvidence(run, status, result);
      receipt.completionUncertain = evidence.completionUncertain;
      const inference = object(result['inference']);
      const raw = inference['value'];
      receipt.usage = decodeUsage(raw);
      if (record(raw) && record(raw.usage)) {
        const usage = raw.usage;
        if (usage.prompt_tokens !== undefined)
          receipt.usage = decodeUsage({
            usage: {
              input_tokens: usage.prompt_tokens,
              output_tokens: usage.completion_tokens,
              input_tokens_details: usage.prompt_tokens_details,
              output_tokens_details: usage.completion_tokens_details,
            },
          });
        if (typeof usage.cost === 'number' && Number.isFinite(usage.cost) && usage.cost >= 0)
          receipt.providerReportedCostUsd = usage.cost;
      }
      if (config.billingMode === 'managed')
        receipt.estimatedCostUsd = microUsdToUsd(status['cost_micro_usd']);
      else
        await captureMacrofoldRunUsage(
          api,
          receipt,
          controller.signal,
          config.billingMode,
          evidence.uninvokedInferenceChargeUsd,
        );
      // Billing observation is awaited and may absorb a reporting failure.
      // Caller cancellation during that wait still withdraws the answer.
      controller.signal.throwIfAborted();
      if (
        typeof inference['model_revision'] === 'string' &&
        /^[\w./:-]{1,128}$/.test(inference['model_revision'])
      ) {
        receipt.model = inference['model_revision'];
        receipt.modelVersionStatus = 'reported';
      }
      const began =
        typeof status['started_at'] === 'string' ? Date.parse(status['started_at']) : NaN;
      const ended =
        typeof status['completed_at'] === 'string' ? Date.parse(status['completed_at']) : NaN;
      if (Number.isFinite(began) && Number.isFinite(ended))
        receipt.providerLatencyMs = Math.max(0, Math.round(ended - began));
      if (typeof status['wait_seconds'] === 'number' && Number.isFinite(status['wait_seconds']))
        receipt.providerQueueLatencyMs = Math.max(0, Math.round(status['wait_seconds'] * 1000));
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
    } catch (error) {
      if (controller.signal.aborted && run) {
        try {
          await api.request(
            `/v1/runs/${encodeURIComponent(run)}/cancel`,
            {},
            digest(`cancel:${request.requestId}`),
            AbortSignal.timeout(5000),
          );
        } catch {
          /* Original reservation remains uncertain. */
        }
      }
      if (error instanceof MacrofoldHttpError) receipt.httpStatus = error.status;
      const outcome = controller.signal.aborted
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
        reason: controller.signal.aborted
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
      if (timer) clearTimeout(timer);
      request.signal?.removeEventListener('abort', cancel);
      receipt.completedAt = new Date().toISOString();
      receipt.latencyMs = Date.now() - started;
    }
  };
}

/** Native decision transport without a game world or Worker. Callers reserve before judge. */
export function createMacrofoldDecisionClient(configuration: MacrofoldDecisionConfig): {
  judge(request: MacrofoldDecisionRequest): Promise<AiResult<JudgeValue>>;
} {
  if (!['typesafe/jev-1.13', 'microsoft/microsoft-decision-1'].includes(configuration.model))
    throw new Error('Invalid Macrofold decision configuration.');
  const execute = createMacrofoldExecutor(configuration, 'decision');
  return {
    judge: (request) =>
      execute(request, () => {
        validateQuestions(request.questions);
        // Validate JSON before cloning without canonical key sorting: the first
        // offered choice must still win an exact tie after the provider wait.
        serialize({ state: request.state, questions: request.questions }, 500_000);
        const input = structuredClone({ state: request.state, questions: request.questions });
        return {
          input,
          maxOutputTokens: Math.min(
            16_384,
            Math.max(1024, Object.keys(input.questions).length * 64),
          ),
          decode: (raw) => ({ value: decodeJudge(raw, input.questions) }),
        };
      }),
  };
}

/** Native OpenRouter chat with a strict caller-owned JSON schema and optional streamed delivery. */
export function createMacrofoldGenerationClient(configuration: MacrofoldGenerationConfig): {
  generate<T = JsonValue>(request: MacrofoldGenerationRequest): Promise<AiResult<T>>;
} {
  const config = Object.freeze({ ...configuration });
  const execute = createMacrofoldExecutor(config, 'generation');
  return {
    generate<T = JsonValue>(request: MacrofoldGenerationRequest): Promise<AiResult<T>> {
      return execute<T>(request, () => {
        if (!request.task?.trim() || !request.instructions?.trim())
          throw new InvalidData('invalid_generation_instructions');
        if (request.model !== undefined && request.model !== config.model)
          throw new InvalidData('model_not_authorized');
        const name =
          request.schemaName ?? request.task.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) throw new InvalidData('invalid_schema_name');
        const schema: unknown = JSON.parse(
          serialize(request.schema, 500_000, { preserveKeyOrder: true }),
        );
        const validate = compileSchema(schema);
        const maxOutputTokens = request.maxOutputTokens ?? 4096;
        if (
          !Number.isSafeInteger(maxOutputTokens) ||
          maxOutputTokens < 1 ||
          maxOutputTokens > 16_384
        )
          throw new InvalidData('output_limit_exceeded');
        if (
          request.reasoningEffort !== undefined &&
          !['none', 'low', 'medium', 'high'].includes(request.reasoningEffort)
        )
          throw new InvalidData('invalid_reasoning_effort');
        const context = serialize(request.context, 500_000);
        return {
          maxOutputTokens,
          input: {
            messages: [
              { role: 'system', content: request.instructions },
              {
                role: 'user',
                content: typeof request.context === 'string' ? request.context : context,
              },
            ],
            max_tokens: maxOutputTokens,
            response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
            provider: { require_parameters: true },
            ...(request.reasoningEffort ? { reasoning: { effort: request.reasoningEffort } } : {}),
          },
          decode(raw: unknown): { value: T } | { refused: true } {
            if (
              !record(raw) ||
              !Array.isArray(raw.choices) ||
              raw.choices.length !== 1 ||
              !record(raw.choices[0])
            )
              throw new InvalidData('invalid_generation_response');
            const choice = raw.choices[0];
            const message = choice.message;
            if (!record(message)) throw new InvalidData('invalid_generation_response');
            if (message.refusal || choice.finish_reason === 'content_filter')
              return { refused: true as const };
            if (choice.finish_reason === 'length') throw new InvalidData('generation_incomplete');
            if (typeof message.content !== 'string')
              throw new InvalidData('missing_generation_text');
            let value: unknown;
            try {
              value = JSON.parse(message.content);
            } catch {
              throw new InvalidData('invalid_generation_json');
            }
            if (!validate(value)) throw new InvalidData('generation_schema_mismatch');
            return { value: value as T };
          },
        };
      });
    },
  };
}
