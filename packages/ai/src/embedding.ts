import { createHash } from 'node:crypto';
import type { AiReceipt, AiResult, FetchTransport, RequestControl } from './types.js';
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
  fetch?: FetchTransport;
  timeoutMs?: number;
}): EmbeddingClient {
  return {
    async embed(request) {
      const started = Date.now();
      const receipt: AiReceipt = {
        requestId: request.requestId,
        provider: 'openai',
        requestedModel: config.model,
        model: config.model,
        modelVersionStatus: 'unavailable',
        contextDigest: createHash('sha256').update(JSON.stringify(request.texts)).digest('hex'),
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
          Buffer.byteLength(JSON.stringify(request.texts)) > EMBEDDING_LIMITS.batchBytes
        )
          return result('invalid', 'Embedding input exceeds batch limits.');
        const signal = AbortSignal.any([
          ...(request.signal ? [request.signal] : []),
          AbortSignal.timeout(config.timeoutMs ?? 15000),
        ]);
        signal.throwIfAborted();
        const body = JSON.stringify({
          model: config.model,
          input: request.texts,
          dimensions: config.dimensions,
          encoding_format: 'float',
        });
        receipt.providerRequestDigest = createHash('sha256').update(body).digest('hex');
        receipt.dispatched = true;
        const response = await (config.fetch ?? fetch)('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          body,
          signal,
          redirect: 'error',
        });
        receipt.httpStatus = response.status;
        if (!response.ok) {
          void response.body?.cancel();
          receipt.completionUncertain = response.status >= 500;
          return result(
            receipt.completionUncertain ? 'uncertain' : 'unavailable',
            `Embedding HTTP ${response.status}.`,
          );
        }
        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        try {
          for (;;) {
            const next = await reader.read();
            if (next.done) break;
            bytes += next.value.byteLength;
            if (bytes > 2000000) throw new Error('Embedding response too large.');
            chunks.push(next.value);
          }
        } finally {
          void reader.cancel().catch(() => {});
        }
        const data = JSON.parse(Buffer.concat(chunks).toString()) as {
          data?: { index: number; embedding: number[] }[];
          model?: string;
          usage?: { prompt_tokens: number };
        };
        if (!Array.isArray(data.data) || data.data.length !== request.texts.length)
          return result('invalid', 'Missing embeddings.');
        const vectors = [...data.data].sort((a, b) => a.index - b.index);
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
        if (data.model) {
          receipt.model = data.model;
          receipt.modelVersionStatus = 'reported';
        }
        if (data.usage && Number.isSafeInteger(data.usage.prompt_tokens))
          receipt.usage = { inputTokens: data.usage.prompt_tokens, outputTokens: 0 };
        return { outcome: 'value', value: vectors.map((v) => v.embedding), receipt };
      } catch {
        receipt.completionUncertain = receipt.dispatched;
        return result(
          request.signal?.aborted ? 'cancelled' : 'uncertain',
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
