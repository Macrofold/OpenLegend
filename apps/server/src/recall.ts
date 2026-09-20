import { attentionQuestions, JEV_QUESTIONS_VERSION } from './jev-questions.js';
import { experiences, mindFor, type WorldState } from '@open-legend/domain';
import {
  cosineSimilarity,
  createEmbeddingClient,
  type EmbeddingClient,
  type JudgeRequest,
  type JudgeValue,
  type JudgmentAnswer,
} from '@open-legend/ai';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';
import type { IntelligenceLog } from './intelligence-log.js';
export interface AttentionCandidate {
  id: string;
  kind: 'memory' | 'entity' | 'possession' | 'knowledge';
  text: string;
  revision: string;
  required: boolean;
  entityIds: string[];
  at: number;
  salience: number;
  score?: number;
  selected?: boolean;
  attention?: JudgmentAnswer;
  reason?: string;
}
export function gameTime(at: number): string {
  // The world clock starts at 08:00; match the player-facing calendar.
  const hour = (8 + Math.floor(at / 3600)) % 24;
  return `Day ${Math.floor(at / 86400) + 1}, ${hour.toString().padStart(2, '0')}:${Math.floor(at / 60) % 60 < 10 ? '0' : ''}${Math.floor(at / 60) % 60}`;
}
export function candidateSet(
  world: WorldState,
  actorId: string,
  observed: NonNullable<ReturnType<WorldService['observe']>>,
  requiredIds: string[],
): AttentionCandidate[] {
  const candidates: AttentionCandidate[] = experiences(world, actorId).map((m) => ({
    id: m.id,
    kind: 'memory',
    text: `${gameTime(m.at)}: ${m.source === 'heard' ? 'I heard: ' : m.source === 'inferred' ? 'Remembered summary: ' : ''}${m.summary}`,
    revision: digest(m),
    required:
      requiredIds.includes(m.id) ||
      requiredIds.includes(m.eventId ?? '') ||
      (m.kind === 'commitment' && !m.resolved) ||
      !!world.experience?.corrections?.[actorId]?.[m.id] ||
      Object.values(world.experience?.corrections?.[actorId] ?? {}).includes(m.id),
    entityIds: m.entityIds,
    at: m.at,
    salience: m.importance,
  }));
  for (const e of observed.visibleEntities)
    candidates.push({
      id: `entity:${e.id}`,
      kind: 'entity',
      text: `${e.name}: ${e.kind}${e.actor ? `, ${e.actor.action?.type ?? 'idle'}` : ''}${e.resource ? `, ${e.resource.quantity} available` : ''}`,
      revision: digest({
        name: e.name,
        kind: e.kind,
        resource: e.resource,
        activity: e.actor?.action?.type,
      }),
      required: false,
      entityIds: [e.id],
      at: world.simTime,
      salience: 3,
    });
  for (const item of observed.inventory) {
    const definition = world.itemDefinitions[item.definitionId]!;
    candidates.push({
      id: `item:${item.id}`,
      kind: 'possession',
      text: `${item.quantity} ${definition.name}; ${definition.properties.join(', ')}`,
      revision: digest({ item, definition }),
      required: false,
      entityIds: [],
      at: world.simTime,
      salience: 2,
    });
  }
  for (const recipe of observed.knownRecipes)
    candidates.push({
      id: `recipe:${recipe.id}`,
      kind: 'knowledge',
      text: `I know ${recipe.name}: ${recipe.description}`,
      revision: digest(recipe),
      required: false,
      entityIds: [],
      at: world.simTime,
      salience: 3,
    });
  return candidates;
}
interface VectorCache {
  model: string;
  dimensions: number;
  entries: Record<string, { revision: string; vector: number[] }>;
  queries: Record<string, number[]>;
}
/** Scope is resolved before vector lookup. Every batch and result is bounded and revision-keyed. */
export class RecallService {
  private embeddings: EmbeddingClient;
  constructor(
    private service: WorldService,
    private log: IntelligenceLog,
    client?: EmbeddingClient,
  ) {
    const c = service.config;
    this.embeddings =
      client ??
      createEmbeddingClient({
        apiKey: c.embeddingKey,
        model: c.embeddingModel,
        dimensions: c.embeddingDimensions,
        fetch: log.fetch,
        timeoutMs: c.aiTimeoutMs,
      });
  }
  async select(
    world: WorldState,
    actorId: string,
    stimulus: string,
    jobId: string,
    candidates: AttentionCandidate[],
    judge: (request: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>,
    signal: AbortSignal,
    budgetCeiling = this.service.config.budgetUsd,
  ) {
    const config = this.service.config;
    const inner = world.innerWorlds?.[actorId];
    const records = mindFor(world, actorId).records;
    const people = Object.values(world.entities)
      .filter((e) => candidates.some((c) => c.kind === 'entity' && c.entityIds.includes(e.id)))
      .map((e) => e.id);
    // Cues are derived from the accepted text, never a second writable biography.
    const cues = (inner?.text ?? '')
      .split(/\n+/)
      .filter((line) => /concern|worr|conflict|believ|doubt|goal|want|need|promise/i.test(line))
      .slice(0, 8)
      .join('\n')
      .slice(0, 1600);
    const query = `${stimulus}\nMy current goal: ${world.entities[actorId]!.actor!.goal}\n${cues}`;
    if (Buffer.byteLength(query) > 8000)
      throw new Error(
        'The complete semantic stimulus exceeds the embedding input allowance; split this opportunity.',
      );
    const key = `vectors:${world.id}:${actorId}`;
    let cache = this.service.store.getIntegration(key) as VectorCache | undefined;
    if (cache?.model !== config.embeddingModel || cache.dimensions !== config.embeddingDimensions)
      cache = {
        model: config.embeddingModel,
        dimensions: config.embeddingDimensions,
        entries: {},
        queries: {},
      };
    const valid = new Map(candidates.map((c) => [c.id, c.revision]));
    for (const [id, v] of Object.entries(cache.entries))
      if (valid.get(id) !== v.revision) delete cache.entries[id];
    const ranked = [...candidates].sort(
      (a, b) =>
        Number(b.required) -
          Number(a.required) +
          (b.entityIds.some((id) => people.includes(id)) ? 10 : 0) -
          (a.entityIds.some((id) => people.includes(id)) ? 10 : 0) ||
        b.salience - a.salience ||
        b.at - a.at,
    );
    const missing = ranked.filter((c) => !cache!.entries[c.id]).slice(0, 32);
    const queryKey = digest({
      query,
      revision: inner?.revision,
      forgotten: world.experience?.forgotten[actorId],
    });
    const cachedQuery = cache.queries[queryKey];
    let embeddingStatus = 'cache';
    if (missing.length || !cachedQuery) {
      const id = `${jobId}:embeddings`;
      if (!config.embeddingKey) embeddingStatus = 'unavailable: no embedding credentials';
      else if (!this.service.store.reserve(id, 'openai', config.embeddingReserveUsd, budgetCeiling))
        embeddingStatus = 'deferred: spending cap';
      else {
        const texts = [...(!cachedQuery ? [query] : []), ...missing.map((c) => c.text)];
        const result = await this.log.run(
          'Embeddings',
          {
            requestId: id,
            model: config.embeddingModel,
            dimensions: config.embeddingDimensions,
            texts,
          },
          () => this.embeddings.embed({ requestId: id, texts, signal }),
        );
        this.service.store.settle(id, result.receipt);
        embeddingStatus = result.outcome;
        if (result.outcome === 'value') {
          let i = 0;
          if (!cachedQuery) cache.queries[queryKey] = result.value[i++]!;
          for (const c of missing)
            cache.entries[c.id] = { revision: c.revision, vector: result.value[i++]! };
          for (const id of Object.keys(cache.queries).slice(0, -16)) delete cache.queries[id];
        }
      }
    }
    for (const id of Object.keys(cache.entries).slice(0, -1024)) delete cache.entries[id];
    // A late response must not repopulate corrected/forgotten content.
    if (
      digest(this.service.world.experience?.forgotten[actorId] ?? []) ===
        digest(world.experience?.forgotten[actorId] ?? []) &&
      digest(this.service.world.experience?.corrections?.[actorId] ?? {}) ===
        digest(world.experience?.corrections?.[actorId] ?? {})
    )
      this.service.store.putIntegration(key, cache);
    const q = cache.queries[queryKey];
    for (const c of ranked) {
      const vector = cache.entries[c.id];
      if (q && vector) c.score = cosineSimilarity(q, vector.vector);
    }
    ranked.sort(
      (a, b) =>
        Number(b.required) - Number(a.required) ||
        (b.score ?? 0) +
          (b.entityIds.some((id) => people.includes(id)) ? 0.15 : 0) +
          b.salience * 0.01 -
          ((a.score ?? 0) +
            (a.entityIds.some((id) => people.includes(id)) ? 0.15 : 0) +
            a.salience * 0.01) ||
        b.at - a.at,
    );
    const mandatory = ranked.filter((c) => c.required);
    if (mandatory.length > 24)
      throw new Error('Required recall exceeds bounded attention capacity.');
    const batch = [
      ...mandatory,
      ...ranked.filter((c) => !c.required).slice(0, 24 - mandatory.length),
    ];
    const candidateTexts = Object.fromEntries(batch.map((c, i) => [`c${i}`, c.text]));
    const questions = attentionQuestions(Object.keys(candidateTexts));
    let attentionStatus = 'no candidates';
    if (batch.length) {
      try {
        const judged = await judge({
          state: {
            stimulus,
            aboutMe: inner?.text ?? '',
            goal: world.entities[actorId]!.actor!.goal,
            peoplePresent: people.map((id) => world.entities[id]!.name),
            candidates: candidateTexts,
          },
          questions,
        });
        for (const [i, c] of batch.entries()) {
          const answer = judged.answers[`c${i}`];
          c.attention = answer;
          // Retrieval favors recall: confidence is not P(relevant), and ambiguity
          // must not erase useful or contradictory evidence. Native admission
          // remains responsible for any later action.
          c.selected =
            c.required ||
            !!(
              answer &&
              'choice' in answer &&
              answer.choice === 'yes' &&
              (answer.probabilities['yes'] ?? 0) >= 0.5
            );
          c.reason = c.required
            ? 'mandatory'
            : c.selected
              ? 'Jev included'
              : 'Jev excluded or uncertain';
        }
        attentionStatus = 'completed';
      } catch (error) {
        signal.throwIfAborted();
        // Optional attention may fail; directly perceived evidence and active
        // obligations must still reach the immediate decision.
        attentionStatus = error instanceof Error ? error.message : 'Attention unavailable';
        for (const c of batch) {
          c.selected = c.required;
          c.reason = c.required ? 'mandatory; attention unavailable' : 'attention unavailable';
        }
      }
    }
    const selected = batch.filter((c) => c.selected);
    return {
      selected,
      diagnostics: {
        questionVersion: JEV_QUESTIONS_VERSION,
        attentionStatus,
        query,
        signals: {
          people,
          stimulus,
          goal: world.entities[actorId]!.actor!.goal,
          acceptedTextCues: cues,
          legacyFacetHints: records
            .filter((r) => ['concern', 'belief'].includes(r.kind))
            .map((r) => r.id),
        },
        embedding: {
          model: config.embeddingModel,
          dimensions: config.embeddingDimensions,
          metric: 'cosine',
          status: embeddingStatus,
          cachedQuery: !!cachedQuery,
          indexed: Object.keys(cache.entries).length,
          lag: ranked.filter((c) => !cache!.entries[c.id]).length,
        },
        candidates: batch,
        eligible: candidates.length,
        unexamined: candidates.length - batch.length,
      },
    };
  }
}
