import { hasEmbeddingAccess } from './generation-config.js';
import { createEmbeddingClient, EMBEDDING_LIMITS } from '@open-legend/ai';
import type { CognitionExecution } from './cognition-execution.js';
import { stageAllowance } from './cognition-stage-budget.js';
import { undispatchedReceipt } from './decision-state.js';
import type { CandidateAction } from './context.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { WorldService } from './world-service.js';
import { digest } from './store.js';

export const ACTION_RETRIEVAL_LIMIT = 300;

/** Spread optional discovery across the actual executable families. Preserve
 * relevance order within each family; a large set of variants must not hide
 * unrelated opportunities before the relevance model can consider them.
 * This is coverage, not endorsement or permission to execute a choice. */
export function diverseActionCandidates(
  candidates: readonly CandidateAction[],
  limit = candidates.length,
): CandidateAction[] {
  return interleaveActionFamilies(
    candidates,
    (candidate) => candidate.nativeInvocation?.type ?? candidate.command?.type ?? null,
    limit,
  );
}

/** The same coverage rule applies after judgment when only bound offers remain. */
export function interleaveActionFamilies<T>(
  candidates: readonly T[],
  familyOf: (candidate: T) => string | null,
  limit = candidates.length,
): T[] {
  const families = new Map<string | null, T[]>();
  for (const candidate of candidates) {
    const family = familyOf(candidate);
    const group = families.get(family);
    if (group) group.push(candidate);
    else families.set(family, [candidate]);
  }
  let active = [...families.values()];
  const selected: T[] = [];
  for (let index = 0; active.length && selected.length < limit; index++) {
    const remaining: T[][] = [];
    for (const group of active) {
      if (selected.length >= limit) break;
      selected.push(group[index]!);
      if (index + 1 < group.length) remaining.push(group);
    }
    active = remaining;
  }
  return selected;
}

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
  nativeOnly = false,
  execution?: CognitionExecution,
) {
  const fallback = (status: string) => ({
    candidates: diverseActionCandidates(
      [...candidates].sort((a, b) => a.id.localeCompare(b.id)),
      ACTION_RETRIEVAL_LIMIT,
    ),
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
  if (nativeOnly) return fallback('native bounded coverage; additional paid retrieval disabled');
  const { config, store } = service;
  const vectors = store.vectors;
  if (!vectors || !hasEmbeddingAccess(config))
    return fallback(
      'semantic retrieval unavailable; deterministic family-diverse fallback, incomplete coverage',
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
  const embeddings =
    service.embeddingClient ??
    createEmbeddingClient({
      apiKey: config.embeddingKey,
      model: scope.model,
      dimensions: scope.dimensions,
      network: log.network,
      modelPrices: config.embeddingModelPrices,
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
      const control = service.cognitionControl;
      const prepared = control
        ? await control.prepare(
            {
              id,
              rootId: jobId,
              actorId,
              purpose: 'action-retrieval',
              generation: service.generation,
              responseBoundBytes: EMBEDDING_LIMITS.resultBytes,
              wireBoundBytes: 1_000_000,
              signal,
              current: ready,
            },
            { kind: 'embedding', request: { texts } },
          )
        : undefined;
      const selected = prepared?.input ?? { kind: 'embedding' as const, request: { texts } };
      const lease = execution
        ? prepared
          ? await execution.acquirePrepared(prepared.stage, 'primary')
          : await execution.primary()
        : undefined;
      if (execution && !lease) {
        if (prepared)
          await control!.decline(prepared.stage, 'Shared model execution capacity is occupied.');
        return fallback('semantic retrieval unavailable: shared capacity; incomplete coverage');
      }
      let reserved = false,
        dispatchIntent = false,
        providerStarted = false,
        completed = false;
      const result = await (async () => {
        try {
          await ready();
          reserved = await store.reserve(
            id,
            'openai',
            control ? stageAllowance(config, selected) : config.embeddingReserveUsd,
            config.budgetUsd,
            actorId,
            undefined,
            undefined,
            lease
              ? {
                  rootJobId: jobId,
                  category: 'preparation',
                  stage: 'action-retrieval',
                  executionClass: lease.executionClass,
                }
              : undefined,
          );
          if (!reserved) {
            if (prepared) await control!.decline(prepared.stage, 'Spending allowance unavailable.');
            return undefined;
          }
          await ready();
          if (lease) {
            dispatchIntent = true;
            if (!(await store.markDecisionDispatch(id)))
              throw new Error('Action retrieval dispatch was already claimed.');
          }
          const result = await log.run(
            'Action embeddings',
            {
              requestId: id,
              actorId,
              model: scope.model,
              sources: batch.map((source) => source.id),
            },
            () => {
              const dispatch = () => {
                providerStarted = true;
                return embeddings.embed({ requestId: id, ...selected.request, signal });
              };
              return prepared && control
                ? control.dispatch(prepared.stage, selected, dispatch, lease)
                : dispatch();
            },
          );
          if (result.receipt.completionUncertain) lease?.uncertain(id);
          await store.settle(id, result.receipt);
          completed = true;
          return result;
        } finally {
          try {
            try {
              if (reserved && !providerStarted && !completed) {
                await store.settle(id, undispatchedReceipt(id, 'openai', Date.now()));
                completed = true;
              }
            } finally {
              if (prepared && prepared.stage.status !== 'consumed')
                await control!.decline(
                  prepared.stage,
                  'Action retrieval ended before provider dispatch.',
                );
            }
          } finally {
            if (dispatchIntent && !completed) lease?.uncertain(id);
            lease?.release();
          }
        }
      })();
      if (!result)
        return fallback('semantic retrieval unavailable: spending cap; incomplete coverage');
      await ready();
      if (result.outcome !== 'value')
        return fallback(`semantic retrieval ${result.outcome}; incomplete coverage`);
      if (
        selected.request.texts.some(
          (text, index) => index >= (queryVector ? 0 : 1) && text !== texts[index],
        )
      )
        return fallback(
          'experimental source embedding captured; original source cache remains unmodified',
        );
      let index = 0;
      if (!queryVector) queryVector = result.value[index++]!;
      await vectors.put(
        scope,
        batch.map((source) => ({ ...source, vector: result.value[index++]! })),
      );
    } while (offset < missing.length);
    const matches = await vectors.search(scope, queryVector!, sources, ACTION_RETRIEVAL_LIMIT);
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const ranked = matches.map((match) => byId.get(match.id)!);
    const matched = new Set(matches.map((match) => match.id));
    return {
      candidates: diverseActionCandidates(
        [
          ...ranked,
          ...candidates
            .filter((candidate) => !matched.has(candidate.id))
            .sort((a, b) => a.id.localeCompare(b.id)),
        ],
        ACTION_RETRIEVAL_LIMIT,
      ),
      status: 'family-diverse semantic top-300 across complete permitted library',
      eligible: candidates.length,
    };
  } catch (error) {
    signal.throwIfAborted();
    return fallback(
      `semantic retrieval failed: ${error instanceof Error ? error.message : 'unavailable'}; incomplete coverage`,
    );
  }
}
