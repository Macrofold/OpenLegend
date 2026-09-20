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
import { estimateCostUsd } from './usage.js';
import type {
  AiClient,
  AiClientConfig,
  AiFailureOutcome,
  AiProvider,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
  ProviderConfig,
  RequestControl,
  TypedQuestionMap,
} from './types.js';

const DEFAULTS = {
  jev: { model: 'jev-1.13.0', endpoint: 'https://api.typesafe.ai/v1/systemone' },
  openai: { model: 'gpt-5.6-luna', endpoint: 'https://api.openai.com/v1/responses' },
};

class OutcomeError extends Error {
  constructor(
    readonly outcome: AiFailureOutcome,
    readonly reason: string,
    readonly uncertain = false,
  ) {
    super(reason);
  }
}

function limit(value: number | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw new Error('Invalid AI client limit');
  return value;
}

function validEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}

async function readBody(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string> {
  const declared = response.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) {
    void response.body?.cancel().catch(() => undefined);
    throw new InvalidData('response_too_large');
  }
  if (!response.body) throw new InvalidData('empty_response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new OutcomeError('uncertain', 'request_aborted', true);
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        cancel();
        throw new InvalidData('response_too_large');
      }
      chunks.push(chunk.value);
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
    } catch {
      throw new InvalidData('invalid_response_encoding');
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

function httpError(status: number): OutcomeError {
  if (status === 401 || status === 403)
    return new OutcomeError('unavailable', 'provider_credentials_rejected');
  if (status === 404) return new OutcomeError('unavailable', 'provider_or_model_unavailable');
  if (status === 429 || status === 529)
    return new OutcomeError('unavailable', 'provider_rate_limited');
  if (status >= 500 || status === 408)
    return new OutcomeError('uncertain', 'provider_completion_unknown', true);
  if (status === 400 || status === 413 || status === 422)
    return new OutcomeError('invalid', 'provider_rejected_request');
  return new OutcomeError('failed', 'provider_http_error');
}

/** Server-only transport boundary. It does not schedule, retry, reserve budgets, or authorize world changes. */
export function createAiClient(config: AiClientConfig = {}): AiClient {
  const timeoutMs = limit(config.timeoutMs, 20_000, 120_000);
  const maxRequestBytes = limit(config.maxRequestBytes, 65_536, 1_048_576);
  const maxResponseBytes = limit(config.maxResponseBytes, 262_144, 2_097_152);
  const maxOutputTokens = limit(config.maxOutputTokens, 2048, 16_384);
  const fetcher = config.fetch ?? ((url: string, init: RequestInit) => fetch(url, init));
  // Capture server configuration; later caller mutation must not change an admitted request.
  const providerConfigs = {
    jev: config.jev
      ? { ...config.jev, prices: config.jev.prices ? { ...config.jev.prices } : undefined }
      : undefined,
    openai: config.openai
      ? { ...config.openai, prices: config.openai.prices ? { ...config.openai.prices } : undefined }
      : undefined,
  };

  async function run<T>(
    provider: Exclude<AiProvider, 'macrofold'>,
    request: RequestControl,
    context: unknown,
    prepare: (
      model: string,
      contextJson: string,
    ) => { body: unknown; decode: (data: unknown) => T },
  ): Promise<AiResult<T>> {
    const started = Date.now();
    const options: ProviderConfig | undefined = providerConfigs[provider];
    const model =
      (provider === 'openai' ? (request as GenerateRequest).model : undefined) ??
      options?.model ??
      DEFAULTS[provider].model;
    const endpoint = options?.endpoint ?? DEFAULTS[provider].endpoint;
    const receipt: AiReceipt = {
      requestId: request.requestId,
      provider,
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    let callerCancelled = false;
    const externalAbort = () => {
      callerCancelled = true;
      controller.abort();
    };
    const finish = () => {
      receipt.completedAt = new Date().toISOString();
      receipt.latencyMs = Math.max(0, Date.now() - started);
    };
    try {
      if (
        typeof request.requestId !== 'string' ||
        !request.requestId ||
        request.requestId.length > 256
      )
        throw new InvalidData('invalid_request_id');
      const contextJson = serialize(context, maxRequestBytes);
      receipt.contextDigest = digest(contextJson);
      if (request.signal?.aborted) throw new OutcomeError('cancelled', 'caller_cancelled');
      if (
        request.deadlineMs !== undefined &&
        (!Number.isFinite(request.deadlineMs) || request.deadlineMs <= started)
      )
        throw new OutcomeError('failed', 'deadline_expired');
      if (!options?.apiKey?.trim())
        throw new OutcomeError('unavailable', 'provider_not_configured');
      if (!validEndpoint(endpoint) || !model || model.length > 128 || /[\r\n]/.test(options.apiKey))
        throw new OutcomeError('unavailable', 'invalid_provider_configuration');
      const prepared = prepare(model, contextJson);
      const body = serialize(prepared.body, maxRequestBytes);
      receipt.providerRequestDigest = digest(body);
      const remaining = Math.min(
        timeoutMs,
        (request.deadlineMs ?? started + timeoutMs) - Date.now(),
      );
      if (remaining <= 0) throw new OutcomeError('failed', 'deadline_expired');
      request.signal?.addEventListener('abort', externalAbort, { once: true });
      if (request.signal?.aborted) externalAbort();
      timer = setTimeout(() => controller.abort(), remaining);
      const aborted = new Promise<never>((_, reject) => {
        const rejectAbort = () =>
          reject(
            new OutcomeError(
              callerCancelled ? 'cancelled' : 'uncertain',
              callerCancelled ? 'caller_cancelled' : 'deadline_exceeded',
              receipt.dispatched,
            ),
          );
        controller.signal.addEventListener('abort', rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      });
      const operation = async (): Promise<T> => {
        if (controller.signal.aborted) throw new OutcomeError('cancelled', 'caller_cancelled');
        receipt.dispatched = true;
        const response = await fetcher(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.apiKey}`,
          },
          body,
          signal: controller.signal,
          redirect: 'error',
        });
        // An injected transport may ignore abort. Never consume its late response.
        if (controller.signal.aborted) {
          void response.body?.cancel().catch(() => undefined);
          throw new OutcomeError('uncertain', 'late_response', true);
        }
        receipt.httpStatus = response.status;
        const traceId = response.headers.get('x-request-id');
        if (traceId && /^[\w.:-]{1,256}$/.test(traceId)) receipt.providerRequestId = traceId;
        if (!response.ok) {
          void response.body?.cancel().catch(() => undefined);
          throw httpError(response.status);
        }
        const raw = await readBody(response, maxResponseBytes, controller.signal);
        if (controller.signal.aborted)
          throw new OutcomeError(
            callerCancelled ? 'cancelled' : 'uncertain',
            callerCancelled ? 'caller_cancelled' : 'deadline_exceeded',
            true,
          );
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new InvalidData('invalid_response_json');
        }
        // Bound nesting before decoder/schema traversal as well as bounding bytes on the wire.
        serialize(data, maxResponseBytes);
        if (record(data)) {
          if (typeof data.model === 'string' && /^[\w./:-]{1,128}$/.test(data.model)) {
            receipt.model = data.model;
            receipt.modelVersionStatus = 'reported';
          }
          if (typeof data.id === 'string' && /^[\w.:-]{1,256}$/.test(data.id))
            receipt.providerRequestId = data.id;
          const usage = decodeUsage(data);
          if (usage) {
            receipt.usage = usage;
            const cost = estimateCostUsd(
              usage,
              model === (options.model ?? DEFAULTS[provider].model) ? options.prices : undefined,
            );
            if (cost !== undefined) receipt.estimatedCostUsd = cost;
          }
        }
        return prepared.decode(data);
      };
      const value = await Promise.race([aborted, operation()]);
      finish();
      return { outcome: 'value', value, receipt };
    } catch (error) {
      const normalized =
        error instanceof OutcomeError
          ? error
          : error instanceof InvalidData
            ? new OutcomeError('invalid', error.code)
            : new OutcomeError(
                receipt.dispatched ? 'uncertain' : 'failed',
                receipt.dispatched ? 'transport_completion_unknown' : 'request_preparation_failed',
                receipt.dispatched,
              );
      receipt.completionUncertain = normalized.uncertain;
      finish();
      return { outcome: normalized.outcome, reason: normalized.reason, receipt };
    } finally {
      if (timer) clearTimeout(timer);
      request.signal?.removeEventListener('abort', externalAbort);
    }
  }

  return {
    judge(request: JudgeRequest): Promise<AiResult<JudgeValue>> {
      return run('jev', request, request.state, (model, contextJson) => {
        if (
          typeof request.state !== 'string' &&
          !record(request.state) &&
          !Array.isArray(request.state)
        )
          throw new InvalidData('invalid_judgment_state');
        const questions: unknown = JSON.parse(serialize(request.questions, maxRequestBytes));
        validateQuestions(questions);
        return {
          body: { model, state: JSON.parse(contextJson) as unknown, questions },
          decode: (data) => decodeJudge(data, questions as TypedQuestionMap),
        };
      });
    },
    generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      return run('openai', request, request.context, (model, contextJson) => {
        if (!request.task?.trim() || !request.instructions?.trim())
          throw new InvalidData('invalid_generation_instructions');
        const name =
          request.schemaName ?? request.task.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) throw new InvalidData('invalid_schema_name');
        const schema: unknown = JSON.parse(serialize(request.schema, maxRequestBytes));
        const validate = compileSchema(schema);
        const outputLimit = request.maxOutputTokens ?? maxOutputTokens;
        if (!Number.isSafeInteger(outputLimit) || outputLimit < 1 || outputLimit > maxOutputTokens)
          throw new InvalidData('output_limit_exceeded');
        const body: Record<string, unknown> = {
          model,
          instructions: request.instructions,
          input: typeof request.context === 'string' ? request.context : contextJson,
          store: false,
          service_tier: 'default',
          max_output_tokens: outputLimit,
          text: { format: { type: 'json_schema', name, strict: true, schema } },
        };
        const effort = request.reasoningEffort ?? providerConfigs.openai?.reasoningEffort;
        if (effort) body.reasoning = { effort };
        return {
          body,
          decode(data: unknown): T {
            if (!record(data) || !Array.isArray(data.output))
              throw new InvalidData('invalid_generation_response');
            const texts: string[] = [];
            for (const item of data.output) {
              if (!record(item) || item.type !== 'message' || !Array.isArray(item.content))
                continue;
              for (const part of item.content) {
                if (!record(part)) continue;
                if (part.type === 'refusal') throw new OutcomeError('refused', 'provider_refused');
                if (part.type === 'output_text' && typeof part.text === 'string')
                  texts.push(part.text);
              }
            }
            if (data.status === 'incomplete') throw new InvalidData('generation_incomplete');
            if (data.status === 'failed') throw new OutcomeError('failed', 'generation_failed');
            if (data.status !== 'completed')
              throw new OutcomeError('uncertain', 'generation_not_completed', true);
            if (texts.length === 0) throw new InvalidData('missing_generation_text');
            let value: unknown;
            try {
              value = JSON.parse(texts.join(''));
            } catch {
              throw new InvalidData('invalid_generated_json');
            }
            serialize(value, maxResponseBytes);
            if (!validate(value)) throw new InvalidData('generation_schema_mismatch');
            return value as T;
          },
        };
      });
    },
  };
}
