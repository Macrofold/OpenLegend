import { createEmbeddingClient } from '@open-legend/ai';
import { inventionFamily } from '@open-legend/domain';
import type { InventionSearch, SimilarInvention } from '@open-legend/protocol';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';
import type { IntelligenceLog } from './intelligence-log.js';

/** Search only learned definitions. Ranking never grants knowledge or declares equivalence.
 * archive/07-technical-architecture/declarations-and-evolution.md#similar-inventions-before-authoring
 */
export async function searchInventions(
  service: WorldService,
  log: IntelligenceLog,
  jobId: string,
  actorId: string,
  intent: string,
  signal: AbortSignal,
  current: () => void,
  ready: () => Promise<void>,
): Promise<InventionSearch> {
  const { world, config, store } = service;
  const recipes = (world.knowledge[actorId] ?? [])
    .map((entry) => world.recipes[entry.recipeId])
    .filter((recipe) => recipe !== undefined)
    .filter((recipe) => inventionFamily(recipe));
  const complete = (matches: SimilarInvention[]): InventionSearch => ({
    status: 'complete',
    matches,
    message: matches.length
      ? 'Compare these known techniques before authoring.'
      : 'No similar known techniques found.',
  });
  if (!recipes.length) return complete([]);
  const unavailable = (message: string): InventionSearch => ({
    status: 'unavailable',
    matches: [],
    message,
  });
  const vectors = store.vectors;
  if (!vectors || !config.embeddingKey)
    return unavailable(
      'Similarity search needs configured embeddings and PostgreSQL vector storage. Retry search or explicitly continue without it.',
    );
  const scope = {
    key: `inventions:${world.id}:${actorId}`,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
  };
  const sources = recipes.map((recipe) => ({
    id: recipe.id,
    revision: digest({ version: recipe.version, digest: recipe.digest, descriptionVersion: 1 }),
    text: JSON.stringify({
      name: recipe.name,
      purpose: recipe.description,
      family: inventionFamily(recipe),
      inputs: recipe.inputs,
      output: recipe.output,
      workSeconds: recipe.workSeconds,
    }),
  }));
  const embeddings = createEmbeddingClient({
    apiKey: config.embeddingKey,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
    fetch: log.fetch,
    timeoutMs: config.aiTimeoutMs,
  });
  try {
    const indexed = await vectors.reconcile(scope, sources);
    const missing = sources.filter((source) => !indexed.has(source.id));
    let query: number[] | undefined;
    // Eight bounded definitions per batch leave room for UTF-8 descriptions and the query.
    for (let offset = 0; offset < Math.max(1, missing.length); offset += 8) {
      await ready();
      const batch = missing.slice(offset, offset + 8);
      const texts = [...(!query ? [intent] : []), ...batch.map((source) => source.text)];
      const id = `${jobId}:invention-search:${offset}`;
      if (
        !(await store.reserve(
          id,
          'openai',
          config.embeddingReserveUsd,
          config.budgetUsd,
          'world-agent',
        ))
      )
        return unavailable(
          'Similarity search could not reserve its allowance. No new recipe was generated.',
        );
      const result = await log.run(
        'Invention embeddings',
        { requestId: id, model: scope.model, dimensions: scope.dimensions, texts },
        () => embeddings.embed({ requestId: id, texts, signal }),
      );
      await store.settle(id, result.receipt);
      current();
      if (result.outcome !== 'value')
        return unavailable(
          `Similarity search returned ${result.outcome}. No automatic retry or recipe generation followed.`,
        );
      let index = 0;
      if (!query) query = result.value[index++]!;
      await vectors.put(
        scope,
        batch.map((source) => ({ ...source, vector: result.value[index++]! })),
      );
    }
    current();
    const ranked = await vectors.search(scope, query!, sources, 5);
    current();
    // Snapshot membership once; rechecking every source with Array.some is quadratic.
    // docs/architecture.md#bounded-invention-history-and-recovery
    const known = new Set((service.world.knowledge[actorId] ?? []).map((entry) => entry.recipeId));
    if (
      sources.some(
        (source) =>
          !known.has(source.id) ||
          service.world.recipes[source.id]?.digest !== world.recipes[source.id]?.digest,
      )
    )
      return unavailable('Known recipes changed during search. Search again before choosing.');
    const exact = recipes.filter(
      (recipe) =>
        intent.includes(recipe.id) || intent.toLowerCase().includes(recipe.name.toLowerCase()),
    );
    const matches = [
      ...exact.map((recipe) => ({
        id: recipe.id,
        score: ranked.find((match) => match.id === recipe.id)?.score,
      })),
      ...ranked.filter(
        (match) => match.score >= 0.25 && !exact.some((recipe) => recipe.id === match.id),
      ),
    ].slice(0, 5);
    return complete(
      matches.map((match) => {
        const recipe = recipes.find((r) => r.id === match.id)!;
        return {
          recipeId: recipe.id,
          version: recipe.version,
          digest: digest(recipe.digest),
          name: recipe.name,
          description: recipe.description,
          materials: recipe.inputs
            .map(
              (input) =>
                `${input.quantity} ${world.itemDefinitions[input.definitionId]!.name} (${input.role})`,
            )
            .join(', '),
          behavior: recipe.output.launcher
            ? `${inventionFamily(recipe)} launcher; ${recipe.output.launcher.ammunitionKind} ammunition; range ${recipe.output.launcher.range}; ${recipe.workSeconds} game seconds to craft`
            : recipe.output.gatheringTool
              ? `Carried gathering tool; up to ${recipe.output.gatheringTool.quantity} ${world.itemDefinitions[recipe.output.gatheringTool.resourceId]!.name} per batch, limited by remaining supply; ${recipe.workSeconds} game seconds to craft`
              : `Arrow ammunition; damage bonus ${recipe.output.ammunition!.damageBonus}; ${recipe.workSeconds} game seconds to craft`,
          score: match.score,
        };
      }),
    );
  } catch (error) {
    current();
    await log.record(`${jobId}:search-failure`, 'Invention search failure', {
      reason: error instanceof Error ? error.message : 'Search failed',
    });
    return unavailable(
      'Similarity search is unavailable. Retry search or explicitly continue without it.',
    );
  }
}
