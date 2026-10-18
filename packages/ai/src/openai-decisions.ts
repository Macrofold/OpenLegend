import {
  decodeUsage,
  digest,
  InvalidData,
  record,
  serialize,
  prepareQuestions,
} from './validation.js';
import { estimateCostUsd } from './usage.js';
import { captureHttpErrorDiagnostics, captureResponseRateLimits } from './http-diagnostics.js';
import { NetworkError, type NetworkOwner } from '@open-legend/network';
import { providerOwner, providerText } from './provider-http.js';
import type {
  AiReceipt,
  AiResult,
  FetchTransport,
  JudgeRequest,
  JudgeValue,
  JudgmentAnswer,
  TypedQuestionMap,
} from './types.js';

/** Official /v1/decisions protocol; Noul is our probability-of-predicate representation. */
export function openAiDecisionInput(request: Pick<JudgeRequest, 'state' | 'questions'>) {
  return decisionInput(request.state, prepareQuestions(request.questions, 500_000));
}

function decisionInput(state: unknown, questions: TypedQuestionMap) {
  if (Object.keys(questions).length > 200) throw new InvalidData('decisions_question_limit');
  return {
    model: 'gpt-6-luna',
    input: serialize(state, 480_000),
    questions: Object.entries(questions).map(([name, q]) =>
      q.type === 'noul'
        ? {
            type: 'predicate',
            name,
            instructions:
              q.instructions +
              (q.criteria
                ? `\nTrue: ${q.criteria.true ?? ''}\nFalse: ${q.criteria.false ?? ''}`
                : ''),
          }
        : q.type === 'choice'
          ? {
              type: 'choice',
              name,
              instructions: q.instructions,
              choices: Object.entries(q.criteria).map(([value, description]) => ({
                value,
                description: description ?? value,
              })),
            }
          : {
              type: 'score',
              name,
              instructions: q.instructions,
              levels: q.criteria.map((description, index) => ({
                label: String(index),
                description,
              })),
            },
    ),
  };
}
export function decodeOpenAiDecision(
  data: unknown,
  questions: TypedQuestionMap,
  onQuestionRefusal?: (questionId: string) => void,
): JudgeValue {
  if (
    !record(data) ||
    !Array.isArray(data.answers) ||
    data.answers.length !== Object.keys(questions).length
  )
    throw new InvalidData('invalid_decisions_answers');
  const answers: Record<string, JudgmentAnswer> = Object.create(null);
  const seen = new Set<string>();
  for (const raw of data.answers) {
    if (
      !record(raw) ||
      typeof raw.name !== 'string' ||
      !Object.hasOwn(questions, raw.name) ||
      seen.has(raw.name)
    )
      throw new InvalidData('invalid_decisions_identity');
    seen.add(raw.name);
    const q = questions[raw.name]!;
    // Refusal is per question; independent usable answers remain available.
    // https://developers.openai.com/api/reference/resources/decisions/methods/create
    if (raw.type === 'refusal') {
      onQuestionRefusal?.(raw.name);
      continue;
    }
    const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (q.type === 'noul') {
      if (raw.type !== 'predicate' || !finite(raw.probability))
        throw new InvalidData('invalid_decisions_predicate');
      answers[raw.name] = { type: 'noul', noul: raw.probability };
      continue;
    }
    if (raw.type !== q.type || !Array.isArray(raw.probabilities))
      throw new InvalidData('invalid_decisions_distribution');
    const distribution: Record<string, number> = Object.create(null);
    const keys =
      q.type === 'choice' ? Object.keys(q.criteria) : q.criteria.map((_, i) => String(i));
    const offered = new Set(keys);
    for (const entry of raw.probabilities) {
      if (
        !record(entry) ||
        (q.type === 'choice'
          ? typeof entry.value !== 'string'
          : !Number.isSafeInteger(entry.value)) ||
        !offered.has(String(entry.value)) ||
        Object.hasOwn(distribution, String(entry.value)) ||
        !finite(entry.probability)
      )
        throw new InvalidData('invalid_decisions_distribution');
      distribution[String(entry.value)] = entry.probability;
    }
    if (keys.some((k) => !Object.hasOwn(distribution, k)))
      throw new InvalidData('missing_decisions_probability');
    if (raw.confidence !== undefined && !finite(raw.confidence))
      throw new InvalidData('invalid_decisions_confidence');
    const confidence = raw.confidence === undefined ? {} : { confidence: raw.confidence as number };
    if (q.type === 'choice') {
      // The complete offered distribution owns selection; a redundant echoed
      // choice cannot make those usable scores invalid.
      const selected = keys.reduce(
        (best, key) => (distribution[key]! > distribution[best]! ? key : best),
        keys[0]!,
      );
      answers[raw.name] = {
        type: 'choice',
        choice: selected,
        probabilities: distribution,
        ...confidence,
      };
    } else {
      if (!finite(raw.score)) throw new InvalidData('invalid_decisions_score');
      answers[raw.name] = {
        type: 'score',
        score: raw.score,
        probabilities: distribution,
        legend: Object.fromEntries(q.criteria.map((s, i) => [String(i), s])),
        ...confidence,
      };
    }
  }
  if (Object.keys(answers).length === 0) throw new InvalidData('decisions_refused');
  return { answers };
}

export function createOpenAiDecisionClient(configuration: {
  apiKey: string;
  timeoutMs?: number;
  fetch?: FetchTransport;
  network?: NetworkOwner;
}) {
  const config = Object.freeze({ ...configuration });
  const network = providerOwner(config.network, config.fetch);
  const timeout = config.timeoutMs ?? 120_000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300_000)
    throw new Error('Invalid OpenAI decision timeout.');
  return {
    async judge(request: JudgeRequest): Promise<AiResult<JudgeValue>> {
      const started = Date.now();
      const receipt: AiReceipt = {
        requestId: request.requestId,
        provider: 'openai',
        requestedModel: 'gpt-6-luna',
        model: 'gpt-6-luna',
        modelVersionStatus: 'unavailable',
        contextDigest: digest('invalid_context'),
        startedAt: new Date(started).toISOString(),
        completedAt: new Date(started).toISOString(),
        latencyMs: 0,
        dispatched: false,
        completionUncertain: false,
      };
      let callerCancelled = false;
      const httpFailure = (): AiResult<JudgeValue> => ({
        outcome: [401, 403, 404, 429].includes(receipt.httpStatus!)
          ? 'unavailable'
          : [400, 413, 422].includes(receipt.httpStatus!)
            ? 'invalid'
            : receipt.completionUncertain
              ? 'uncertain'
              : 'failed',
        reason: `openai_http_${receipt.httpStatus}`,
        receipt,
      });
      try {
        if (
          typeof request.requestId !== 'string' ||
          !request.requestId ||
          request.requestId.length > 256
        )
          throw new InvalidData('invalid_request_id');
        const contextJson = serialize(
          { state: request.state, questions: request.questions },
          500_000,
        );
        const questions = prepareQuestions(request.questions, 500_000);
        const body = decisionInput(request.state, questions);
        const serialized = serialize(body, 500_000);
        receipt.contextDigest = digest(contextJson);
        receipt.providerRequestDigest = digest(serialized);
        if (!config.apiKey.trim())
          return { outcome: 'unavailable', reason: 'provider_not_configured', receipt };
        if (request.signal?.aborted) {
          callerCancelled = true;
          return { outcome: 'cancelled', reason: 'caller_cancelled', receipt };
        }
        if (request.deadlineMs !== undefined && !Number.isFinite(request.deadlineMs))
          return { outcome: 'unavailable', reason: 'deadline_expired', receipt };
        const remaining = Math.min(timeout, (request.deadlineMs ?? started + timeout) - Date.now());
        if (!Number.isFinite(remaining) || remaining <= 0)
          return { outcome: 'unavailable', reason: 'deadline_expired', receipt };
        return await network.run(
          {
            timeoutMs: Math.max(1, Math.floor(remaining)),
            deadlineAtMs: request.deadlineMs,
            signal: request.signal,
          },
          async (operation) => {
            operation.throwIfStopped();
            receipt.dispatched = true;
            receipt.completionUncertain = true;
            const raw = await providerText(
              operation,
              {
                url: 'https://api.openai.com/v1/decisions',
                init: {
                  method: 'POST',
                  redirect: 'error',
                  headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Client-Request-Id': digest(request.requestId),
                  },
                  body: serialized,
                },
                bodyPolicy: { kind: 'bounded', maxBytes: 1_000_000 },
              },
              (metadata) => {
                receipt.httpStatus = metadata.status;
                captureResponseRateLimits(receipt, metadata.headers);
                const traceId = metadata.headers.get('x-request-id');
                if (traceId && /^[\w.:-]{1,256}$/.test(traceId))
                  receipt.providerRequestId = traceId;
                if ([400, 401, 403, 404, 413, 422, 429].includes(metadata.status)) {
                  receipt.dispatched = false;
                  receipt.completionUncertain = false;
                }
              },
            );
            if (
              receipt.httpStatus !== undefined &&
              (receipt.httpStatus < 200 || receipt.httpStatus >= 300)
            ) {
              captureHttpErrorDiagnostics(raw, receipt);
              return httpFailure();
            }
            receipt.completionUncertain = false;
            const data: unknown = JSON.parse(raw);
            serialize(data, 1_000_000);
            if (record(data)) {
              if (typeof data.id === 'string' && /^[\w.:-]{1,256}$/.test(data.id))
                receipt.providerRequestId = data.id;
              if (typeof data.model === 'string' && /^[\w./:-]{1,128}$/.test(data.model)) {
                receipt.model = data.model;
                receipt.modelVersionStatus = 'reported';
              }
              receipt.usage = decodeUsage(data);
              if (
                !receipt.usage &&
                record(data.usage) &&
                Number.isSafeInteger(data.usage.input_tokens) &&
                Number(data.usage.input_tokens) >= 0 &&
                data.usage.output_tokens === undefined
              )
                receipt.usage = decodeUsage({
                  ...data,
                  usage: { ...data.usage, output_tokens: 0 },
                });
              // The exact Decisions rate is separate from Responses; no output/cache charges.
              const usage = receipt.usage;
              if (usage && (data.model === undefined || data.model === 'gpt-6-luna'))
                receipt.estimatedCostUsd = estimateCostUsd(usage, {
                  inputUsdPerMillion: usage.inputTokens > 272_000 ? 0.2 : 0.1,
                  outputUsdPerMillion: 0,
                  cachedInputUsdPerMillion: 0,
                  cacheWriteInputUsdPerMillion: 0,
                });
            }
            const value = decodeOpenAiDecision(data, questions, (questionId) => {
              (receipt.questionRefusals ??= []).push(questionId);
            });
            operation.throwIfStopped();
            return { outcome: 'value' as const, value, receipt };
          },
        );
      } catch (error) {
        if (
          receipt.httpStatus !== undefined &&
          (receipt.httpStatus < 200 || receipt.httpStatus >= 300)
        )
          return httpFailure();
        callerCancelled = error instanceof NetworkError && error.kind === 'cancelled';
        return {
          outcome: callerCancelled
            ? 'cancelled'
            : receipt.completionUncertain
              ? 'uncertain'
              : error instanceof InvalidData && error.code === 'decisions_refused'
                ? 'refused'
                : error instanceof InvalidData || error instanceof SyntaxError
                  ? 'invalid'
                  : 'failed',
          reason: callerCancelled
            ? 'caller_cancelled'
            : error instanceof NetworkError && error.kind === 'deadline_exceeded'
              ? 'deadline_exceeded'
              : error instanceof InvalidData
                ? error.code
                : error instanceof SyntaxError
                  ? 'invalid_decisions_json'
                  : 'openai_decisions_request_failed',
          receipt,
        };
      } finally {
        receipt.completedAt = new Date().toISOString();
        receipt.latencyMs = Date.now() - started;
      }
    },
  };
}
