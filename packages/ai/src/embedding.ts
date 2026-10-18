import { NetworkError, type NetworkOwner } from '@open-legend/network';
import { providerOwner, providerText, uncertainHttpStatus } from './provider-http.js';
import { createHash } from 'node:crypto';
import type {
  AiReceipt,
  AiResult,
  FetchTransport,
  ModelTokenPrices,
  RequestControl,
} from './types.js';
import { captureModelPrices, estimateCostUsd, modelTokenPrices } from './usage.js';
import { decodeUsage, record } from './validation.js';
/** Adapter admission limits shared by callers planning bounded batches. */
export const EMBEDDING_LIMITS = { texts: 33, textBytes: 8000, batchBytes: 64000 } as const;
export interface EmbeddingRequest extends RequestControl {
  texts: string[];
}
export interface EmbeddingClient {
  embed(request: EmbeddingRequest): Promise<AiResult<number[][]>>;
}
export function createEmbeddingClient(config: {
  apiKey: string;
  model: string;
  dimensions: number;
  modelPrices?: readonly ModelTokenPrices[];
  fetch?: FetchTransport;
  network?: NetworkOwner;
  timeoutMs?: number;
}): EmbeddingClient {
  const modelPrices = captureModelPrices(config.modelPrices ?? []);
  config = { ...config };
  const network = providerOwner(config.network, config.fetch);
  return {
    async embed(request) {
      const started = Date.now();
      const contextJson = JSON.stringify(request.texts);
      const receipt: AiReceipt = {
        requestId: request.requestId,
        provider: 'openai',
        requestedModel: config.model,
        model: config.model,
        modelVersionStatus: 'unavailable',
        contextDigest: createHash('sha256').update(contextJson).digest('hex'),
        startedAt: new Date(started).toISOString(),
        completedAt: new Date(started).toISOString(),
        latencyMs: 0,
        dispatched: false,
        completionUncertain: false,
      };
      const result = (
        outcome: 'unavailable' | 'invalid' | 'uncertain' | 'cancelled',
        reason: string,
      ): AiResult<number[][]> => ({ outcome, reason, receipt });
      try {
        if (!config.apiKey) return result('unavailable', 'Embedding provider not configured.');
        if (
          !Number.isInteger(config.dimensions) ||
          config.dimensions < 64 ||
          config.dimensions > 3072 ||
          !request.texts.length ||
          request.texts.length > EMBEDDING_LIMITS.texts ||
          request.texts.some(
            (t) => !t.trim() || Buffer.byteLength(t) > EMBEDDING_LIMITS.textBytes,
          ) ||
          Buffer.byteLength(contextJson) > EMBEDDING_LIMITS.batchBytes
        )
          return result('invalid', 'Embedding input exceeds batch limits.');
        const body = JSON.stringify({
          model: config.model,
          input: request.texts,
          dimensions: config.dimensions,
          encoding_format: 'float',
        });
        receipt.providerRequestDigest = createHash('sha256').update(body).digest('hex');
        return await network.run(
          {
            timeoutMs: config.timeoutMs ?? 15000,
            deadlineAtMs: request.deadlineMs,
            signal: request.signal,
          },
          async (operation) => {
            operation.throwIfStopped();
            receipt.dispatched = true;
            const raw = await providerText(
              operation,
              {
                url: 'https://api.openai.com/v1/embeddings',
                init: {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Client-Request-Id': createHash('sha256')
                      .update(receipt.requestId)
                      .digest('hex'),
                  },
                  body,
                  redirect: 'error',
                },
                bodyPolicy: { kind: 'bounded', maxBytes: 2000000 },
              },
              (metadata) => {
                receipt.httpStatus = metadata.status;
                const externalId = metadata.headers.get('x-request-id');
                if (externalId && /^[\w.:-]{1,256}$/.test(externalId))
                  receipt.providerRequestId = externalId;
              },
            );
            if (
              receipt.httpStatus !== undefined &&
              (receipt.httpStatus < 200 || receipt.httpStatus >= 300)
            ) {
              receipt.completionUncertain = uncertainHttpStatus(receipt.httpStatus);
              return result(
                receipt.completionUncertain ? 'uncertain' : 'unavailable',
                `Embedding HTTP ${receipt.httpStatus}.`,
              );
            }
            const data: unknown = JSON.parse(raw);
            if (!record(data)) return result('invalid', 'Invalid embedding response.');
            if (typeof data.model === 'string' && /^[\w./:-]{1,128}$/.test(data.model)) {
              receipt.model = data.model;
              receipt.modelVersionStatus = 'reported';
            }
            // Billing survives unusable vectors: a completed malformed result can still cost money.
            // docs/ai-providers.md#receipts-outcomes-and-accounting
            const usage = decodeUsage({
              usage: {
                input_tokens: record(data.usage) ? data.usage.prompt_tokens : undefined,
                output_tokens: 0,
              },
            });
            if (usage) {
              receipt.usage = usage;
              receipt.estimatedCostUsd = estimateCostUsd(
                usage,
                modelTokenPrices(
                  modelPrices,
                  config.model,
                  data.model === undefined
                    ? config.model
                    : typeof data.model === 'string'
                      ? data.model
                      : '',
                ),
              );
            }
            if (!Array.isArray(data.data) || data.data.length !== request.texts.length)
              return result('invalid', 'Missing embeddings.');
            if (data.data.some((value) => !record(value) || !Number.isSafeInteger(value.index)))
              return result('invalid', 'Invalid embedding vector.');
            const vectors = data.data as { index: number; embedding: unknown }[];
            vectors.sort((a, b) => a.index - b.index);
            if (
              vectors.some(
                (v, i) =>
                  v.index !== i ||
                  !Array.isArray(v.embedding) ||
                  v.embedding.length !== config.dimensions ||
                  v.embedding.some((x) => !Number.isFinite(x)) ||
                  !v.embedding.some((x) => x !== 0),
              )
            )
              return result('invalid', 'Invalid embedding vector.');
            operation.throwIfStopped();
            return {
              outcome: 'value' as const,
              value: vectors.map((v) => v.embedding as number[]),
              receipt,
            };
          },
        );
      } catch (error) {
        if (
          receipt.httpStatus !== undefined &&
          receipt.httpStatus >= 300 &&
          receipt.httpStatus < 500 &&
          !uncertainHttpStatus(receipt.httpStatus)
        ) {
          receipt.completionUncertain = false;
          return result('unavailable', `Embedding HTTP ${receipt.httpStatus}.`);
        }
        receipt.completionUncertain = receipt.dispatched;
        return result(
          error instanceof NetworkError && error.kind === 'cancelled'
            ? 'cancelled'
            : receipt.dispatched
              ? 'uncertain'
              : 'unavailable',
          'Embedding completion unknown; no retry.',
        );
      } finally {
        receipt.completedAt = new Date().toISOString();
        receipt.latencyMs = Date.now() - started;
      }
    },
  };
}
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) throw new Error('Incompatible embedding dimensions.');
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    aa += a[i]! ** 2;
    bb += b[i]! ** 2;
  }
  return dot / Math.sqrt(aa * bb);
}
