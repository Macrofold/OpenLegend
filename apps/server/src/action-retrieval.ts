import { createEmbeddingClient } from '@open-legend/ai';
import type { CandidateAction } from './context.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { WorldService } from './world-service.js';
import { digest } from './store.js';

export const ACTION_RETRIEVAL_LIMIT = 300;

/** Rank the whole actor-permitted library, never the first insertion-order slice.
 * docs/memory-architecture.md#4-jev-attention-before-context-inclusion
 */
export async function retrieveActions(
  service: WorldService,
  log: IntelligenceLog,
  actorId: string,
  jobId: string,
  query: string,
  candidates: CandidateAction[],
  signal: AbortSignal,
  ready: () => Promise<void>,
) {
  const fallback = (status: string) => ({
    candidates: [...candidates]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, ACTION_RETRIEVAL_LIMIT),
    status,
    eligible: candidates.length,
  });
  // Every option already fits: embedding cannot improve coverage, so incur no paid search.
  if (candidates.length <= ACTION_RETRIEVAL_LIMIT)
    return {
      candidates,
      status: 'complete library; no retrieval needed',
      eligible: candidates.length,
    };
  const { config, store } = service;
  const vectors = store.vectors;
  if (!vectors || !config.embeddingKey)
    return fallback(
      'semantic retrieval unavailable; deterministic ID fallback, incomplete coverage',
    );
  const scope = {
    key: `actions:${service.world.id}:${actorId}`,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
  };
  const sources = candidates.map((candidate) => ({
    id: candidate.id,
    revision: digest(candidate.description),
    text: candidate.description,
  }));
  const embeddings = createEmbeddingClient({
    apiKey: config.embeddingKey,
    model: scope.model,
    dimensions: scope.dimensions,
    fetch: log.fetch,
    timeoutMs: config.aiTimeoutMs,
  });
  try {
    const indexed = await vectors.reconcile(scope, sources);
    const missing = sources.filter((source) => !indexed.has(source.id));
    let queryVector: number[] | undefined;
    let offset = 0;
    do {
      await ready();
      const texts = queryVector ? [] : [query];
      const batch: typeof sources = [];
      while (offset < missing.length && texts.length < 33) {
        const source = missing[offset]!;
        if (Buffer.byteLength(JSON.stringify([...texts, source.text])) > 60000) break;
        texts.push(source.text);
        batch.push(source);
        offset++;
      }
      if (!texts.length) throw new Error('Action description exceeds embedding input budget.');
      const id = `${jobId}:action-embeddings:${offset}`;
      if (
        !(await store.reserve(id, 'openai', config.embeddingReserveUsd, config.budgetUsd, actorId))
      )
        return fallback('semantic retrieval unavailable: spending cap; incomplete coverage');
      const result = await log.run(
        'Action embeddings',
        { requestId: id, actorId, model: scope.model, sources: batch.map((s) => s.id) },
        () => embeddings.embed({ requestId: id, texts, signal }),
      );
      await store.settle(id, result.receipt);
      await ready();
      if (result.outcome !== 'value')
        return fallback(`semantic retrieval ${result.outcome}; incomplete coverage`);
      let index = 0;
      if (!queryVector) queryVector = result.value[index++]!;
      await vectors.put(
        scope,
        batch.map((source) => ({ ...source, vector: result.value[index++]! })),
      );
    } while (offset < missing.length);
    const matches = await vectors.search(scope, queryVector!, sources, ACTION_RETRIEVAL_LIMIT);
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    return {
      candidates: matches.map((match) => byId.get(match.id)!),
      status: 'semantic top-300 across complete permitted library',
      eligible: candidates.length,
    };
  } catch (error) {
    signal.throwIfAborted();
    return fallback(
      `semantic retrieval failed: ${error instanceof Error ? error.message : 'unavailable'}; incomplete coverage`,
    );
  }
}
