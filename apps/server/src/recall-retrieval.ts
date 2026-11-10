import type { MemoryReadCache, MemoryScope, MemoryRepository } from './memory-repository.js';
import type { GameRepository } from './store.js';
import type { AttentionCandidate } from './recall.js';
import type { RecallSelectionRuntime } from './recall-selection.js';
import { experienceEntryKey } from '@open-legend/domain';
import { personalVectorScope } from './vector-store.js';
import { digest } from './content-digest.js';

type SelectedSources = Awaited<ReturnType<MemoryRepository['required']>>;
type NoteRows = Awaited<ReturnType<MemoryRepository['knowledgeCandidates']>>['entries'];
export interface RecallRetrievalRuntime extends RecallSelectionRuntime {
  readonly store: RecallSelectionRuntime['store'] & Pick<GameRepository, 'records'>;
}
/** Bounded indexed retrieval and spending over an actual actor SQL scope. Its
 * consumer supplies source formatting and current-note permission, not a world. */
export async function retrieveRecall(input: {
  runtime: RecallRetrievalRuntime;
  repository: Pick<MemoryRepository, 'coverage' | 'required' | 'select' | 'knowledgeCandidates'>;
  scope: MemoryScope;
  worldId: string;
  actorId: string;
  query: string;
  requiredIds: string[];
  automaticIds: string[];
  conversationIds: string[];
  conversationSourceIds?: string[];
  bodies?: MemoryReadCache;
  requestId: string;
  signal: AbortSignal;
  budgetCeiling: number;
  mode: 'ordinary' | 'native-only';
  currentNoteIds(rows: NoteRows): string[] | Promise<string[]>;
  formatCandidates(
    sources: SelectedSources,
    noteIds: string[],
  ): AttentionCandidate[] | Promise<AttentionCandidate[]>;
}) {
  const {
    runtime,
    repository,
    scope,
    worldId,
    actorId,
    query,
    requiredIds,
    automaticIds,
    conversationIds,
    conversationSourceIds,
    bodies,
    requestId,
    signal,
    budgetCeiling,
    mode,
    currentNoteIds,
    formatCandidates,
  } = input;
  const config = runtime.config;
  const current = () => runtime.current();
  const coverage = await repository.coverage(scope, {
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
  });
  const count = coverage.eligible;
  const key = personalVectorScope(worldId, actorId, 'memory-query');
  const queryKey = digest({ query, generation: scope.generation });
  const cache = (await runtime.store.getIntegration(key)) as
    | { key: string; model: string; dimensions: number; query: number[] }
    | undefined;
  let vector =
    cache?.key === queryKey &&
    cache.model === config.embeddingModel &&
    cache.dimensions === config.embeddingDimensions
      ? cache.query
      : undefined;
  let status =
    count <= 300
      ? 'direct: all eligible sources fit'
      : vector
        ? 'cached query'
        : 'structured fallback: query embedding unavailable';
  if (
    mode !== 'native-only' &&
    count > 300 &&
    !vector &&
    runtime.store.vectors &&
    config.embeddingKey &&
    Buffer.byteLength(query) <= 8000
  ) {
    const id = `${requestId}:memory-query`;
    signal.throwIfAborted();
    if (
      await runtime.store.reserve(
        id,
        'openai',
        config.embeddingReserveUsd,
        budgetCeiling,
        actorId,
        undefined,
        undefined,
        runtime.attemptLink('memory-query'),
      )
    ) {
      const result = await runtime.log.run(
        'Memory query embedding',
        { requestId: id, actorId, model: config.embeddingModel },
        () => runtime.embed({ requestId: id, texts: [query], signal }, current),
      );
      await runtime.store.settle(id, result.receipt);
      status = result.outcome;
      if (result.outcome === 'value') {
        vector = result.value[0];
        await runtime.publish(async () => {
          if (!(await current())) throw new Error('Recall context changed during query embedding.');
          await runtime.store.putIntegration(key, {
            key: queryKey,
            model: config.embeddingModel,
            dimensions: config.embeddingDimensions,
            query: vector,
          });
        });
      }
    } else status = 'structured fallback: spending cap';
  }
  const required = await repository.required(
    scope,
    [...requiredIds, ...automaticIds, ...conversationIds],
    bodies,
  );
  const optional = await repository.select(
    scope,
    300,
    vector
      ? { query: vector, model: config.embeddingModel, dimensions: config.embeddingDimensions }
      : undefined,
    conversationSourceIds,
    bodies,
  );
  signal.throwIfAborted();
  if ((await runtime.store.records?.head())?.generation !== scope.generation)
    throw new Error('World restored during memory retrieval.');
  const sources = [
    ...new Map(
      [...optional, ...required].map((source) => [experienceEntryKey(source.entry), source]),
    ).values(),
  ];
  const notePage = await repository.knowledgeCandidates(scope, {
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
    ...(vector && runtime.store.vectors ? { query: vector } : {}),
  });
  signal.throwIfAborted();
  if (!(await current())) throw new Error('Recall authority changed during note selection.');
  const noteIds = await currentNoteIds(notePage.entries);
  const candidates = await formatCandidates(sources, noteIds);
  return {
    candidates,
    sources,
    retrieval: { ...coverage, status, generation: scope.generation },
    noteCoverage: {
      partial: notePage.partial || noteIds.length !== notePage.entries.length,
      considered: noteIds.length,
    },
  };
}
