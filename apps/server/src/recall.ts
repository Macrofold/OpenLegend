import { worldClockText } from '@open-legend/protocol';
import { canonicalJson, entityGet, entityValues } from '@open-legend/domain';
import { isEquipped } from '@open-legend/domain';
import { AsyncLocalStorage } from 'node:async_hooks';
import { recordBackgroundFailure } from './performance.js';
import { undispatchedReceipt } from './decision-state.js';
import type { CognitionExecution, ExecutionLease } from './cognition-execution.js';
import type { PreparedCognitionStage } from './cognition-runtime-control.js';
import { personalPronoun } from '@open-legend/language';
import {
  MemoryPreparationError,
  RETRIEVAL_ROWS,
  RETRIEVAL_BYTES,
  memorySourceProof,
} from './memory-repository.js';
import { stimulusSalience, STIMULUS_POLICY } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import type {
  RetrievedMemory,
  MemoryScope,
  CognitionPreparation,
  CurrentMemorySource,
} from './memory-repository.js';
import { subjectKnowledgeCandidates } from './knowledge-context.js';
import { recognizesSubject, observerGivenName, observerDescription } from '@open-legend/domain';
import {
  entityHandles,
  projectEntityMarkers,
  entityLabel,
  awarenessBindsSubject,
} from './entity-references.js';
import {
  assembleModelEvidence,
  candidateModelSources,
  contextSections,
  perceivedEntityText,
  possessionText,
  relativeLocation,
  experienceForModel,
  experienceModelBindings,
  experienceEmbeddingText,
  modelEvidenceReference,
  type ModelEvidenceSource,
} from './perceived-context.js';
import { recallQueries, type RecallDiscoveryCues } from './recall-query.js';
import { orderDecisionContextRoots } from './decision-context-selection.js';
import { decisionBoundItemIds } from './decision-observation.js';
import { currentGoal } from '@open-legend/domain';
import {
  attentionIncludes,
  CONTEXT_EVIDENCE_POLICY,
  JEV_QUESTIONS_VERSION,
} from './jev-questions.js';
import { attentionRequest } from './attention-request.js';
import {
  EXPERIENCE_LIMITS,
  experiences,
  mindFor,
  type MemoryRecord,
  type WorldState,
  type Awareness,
  type ExperienceEntry,
  experienceEntries,
  experienceEntryKey,
} from '@open-legend/domain';
import { embeddingBatches } from './embedding-batches.js';
import {
  createEmbeddingClient,
  EMBEDDING_LIMITS,
  type EmbeddingClient,
  type EmbeddingRequest,
  type AiResult,
  type JudgeRequest,
  type JudgeValue,
  type JudgmentAnswer,
} from '@open-legend/ai';
import { digest } from './content-digest.js';
import type { WorldService } from './world-service.js';
import type { IntelligenceLog } from './intelligence-log.js';
import { randomUUID } from 'node:crypto';
import { interactiveAllowance } from './cognition-budget.js';
import { stageAllowance } from './cognition-stage-budget.js';
export interface AttentionCandidate {
  id: string;
  kind: 'memory' | 'conversation' | 'entity' | 'possession' | 'knowledge' | 'action';
  text: string;
  experience?: ReturnType<typeof experienceForModel>[];
  /** Stable semantic content; current spatial details still reach attention and reasoning. */
  embeddingText?: string;
  revision: string;
  required: boolean;
  /** Trigger, commitment or correction evidence, independent of recent-memory coverage. */
  requiredSource?: boolean;
  automatic: boolean;
  entityIds: string[];
  at: number;
  salience: number;
  /** Native evidence IDs used by outcome/utterance owners; not complete record keys. */
  sourceIds?: string[];
  /** Complete kind/ID keys for exact selected-source bindings and grouped freshness. */
  sourceKeys?: string[];
  score?: number;
  selected?: boolean;
  attention?: JudgmentAnswer;
  reason?: string;
}
// Hard-query baselines survive unavailable optional retrieval; never expand actor scope.
// docs/memory-architecture.md#4-jev-attention-before-context-inclusion
export const HARD_CONTEXT_LIMITS = {
  actors: 16,
  objects: 16,
  possessions: 16,
  knowledge: 16,
  memories: 8,
};
/** Calendar labels read the installed world's clock offset and optional unit name. */
export function gameTime(at: number, offsetHours: number, dayLabel?: string): string {
  return worldClockText(at, offsetHours, dayLabel);
}
export function memoryCandidate(
  memory: MemoryRecord,
  world: WorldState,
  actorId: string,
  requiredIds: Set<string>,
  automaticIds: Set<string>,
  conversationIds: Set<string>,
  corrections: Record<string, string>,
  correctedIds: Set<string>,
  entry: ExperienceEntry,
): AttentionCandidate {
  const awareness = entry.source === 'awareness' ? entry.value : undefined;
  const experience = experienceForModel(
    entry,
    experienceModelBindings(
      world,
      actorId,
      entry,
      `source:${entry.source}:${digest([entry.source, memory.id]).slice(0, 12)}`,
    ),
  );
  const matches = (ids: Set<string>) =>
    ids.has(memory.id) || (memory.eventId ? ids.has(memory.eventId) : false);
  let summary = memory.summary;
  // Preserve who spoke to whom using this observer's event-time evidence. An ongoing
  // exposure can bind an unnamed speaker; an old canonical ID cannot identify a new exposure.
  // docs/memory-architecture.md#personal-perspective-and-acquisition
  if (awareness?.speech) {
    summary = experience.value['prose'] as string;
  } else if (awareness) {
    // Event roles use the retained observation, never inferred causality or a new exposure.
    // A projectile contact's source may be the struck body, not an unseen shooter.
    const roles = [
      [awareness.sourceId, 'source'],
      [awareness.targetId, 'subject'],
    ] as const;
    for (const [id, role] of roles)
      if (
        id &&
        entityGet(world.entities, id) &&
        awarenessBindsSubject(world, actorId, awareness, id)
      )
        summary += ` Occurrence ${role}: ${id === actorId ? personalPronoun('object') : entityLabel(world, entityGet(world.entities, id)!, actorId, 'indefinite')}.`;
  }
  const required =
    matches(requiredIds) ||
    (memory.kind === 'commitment' && !memory.resolved) ||
    !!corrections[memory.id] ||
    correctedIds.has(memory.id);
  return {
    id: experienceEntryKey(entry),
    experience: [experience],
    kind: matches(conversationIds) ? 'conversation' : 'memory',
    text: `${gameTime(memory.at, world.statusEffectPolicy.clockOffsetHours, world.presentation?.calendar?.dayLabel)} [${memory.source}]: ${summary}`,
    embeddingText: experienceEmbeddingText(entry, actorId),
    revision: awareness ? digest(memory) : digest({ ...memory, summary }),
    required,
    requiredSource: required,
    automatic: matches(automaticIds),
    entityIds: [...new Set(memory.entityIds)].filter(
      (id) =>
        recognizesSubject(world, actorId, id) ||
        (!!awareness && awarenessBindsSubject(world, actorId, awareness, id)),
    ),
    at: memory.at,
    salience: memory.importance,
    sourceIds: [memory.id],
    sourceKeys: [experienceEntryKey(entry)],
  };
}

export function candidateSet(
  world: WorldState,
  actorId: string,
  observed: NonNullable<ReturnType<WorldService['observe']>>,
  requiredIds: string[],
  automaticIds: string[] = [],
  conversationIds: string[] = [],
  retained?: RetrievedMemory[],
): AttentionCandidate[] {
  // Reject oversized preparation explicitly before formatting thousands of optional
  // bodies; this never narrows SQL recall eligibility or deletes retained sources.
  const documents = world.actorKnowledge?.[actorId] ?? {};
  if (
    observed.visibleEntities.length +
      observed.inventory.length +
      observed.knownRecipes.length +
      Object.keys(documents).length >
    RETRIEVAL_ROWS
  )
    throw new MemoryPreparationError();
  let preparedBytes = 0;
  for (const doc of Object.values(documents)) {
    preparedBytes += Buffer.byteLength(doc.text);
    if (preparedBytes > RETRIEVAL_BYTES) throw new MemoryPreparationError();
  }
  const requiredIdSet = new Set(requiredIds);
  const automaticIdSet = new Set(automaticIds);
  const conversationIdSet = new Set(conversationIds);
  const corrections = world.experience?.corrections?.[actorId] ?? {};
  const complete = retained
    ? new Map(retained.map((source) => [source.memory, source.entry]))
    : undefined;
  const nativeEntries = retained ? undefined : experienceEntries(world, actorId);
  const nativeEntry = (memory: MemoryRecord): ExperienceEntry => {
    const entry =
      complete?.get(memory) ??
      nativeEntries?.get(
        memory.kind === 'reflection'
          ? `summary:${memory.id}`
          : memory.kind === 'episode' &&
              memory.eventId &&
              nativeEntries.has(`awareness:${memory.eventId}`)
            ? `awareness:${memory.eventId}`
            : `memory:${memory.id}`,
      );
    if (!entry) throw new Error('A selected memory has no complete experience source.');
    return entry;
  };
  const correctedIdSet = new Set(Object.values(corrections));
  const awareness = new Map(
    (retained
      ? retained.flatMap((source) => (source.awareness ? [source.awareness] : []))
      : (world.experience?.awareness[actorId] ?? [])
    ).map((entry) => [entry.eventId, entry]),
  );
  const matches = (ids: Set<string>, memory: { id: string; eventId?: string }) =>
    ids.has(memory.id) || (memory.eventId ? ids.has(memory.eventId) : false);
  const recallable = retained
    ? retained.map((source) => source.memory)
    : experiences(world, actorId);
  const included = new Set(recallable.map((m) => m.id));
  // The normal raw-source cap must not hide the event that triggered this decision.
  for (const memory of retained ? [] : experiences(world, actorId, true)) {
    const include =
      matches(requiredIdSet, memory) ||
      matches(automaticIdSet, memory) ||
      matches(conversationIdSet, memory) ||
      !!corrections[memory.id] ||
      correctedIdSet.has(memory.id);
    if (include && !included.has(memory.id)) recallable.push(memory);
  }
  const memories = recallable.map((memory) =>
    memoryCandidate(
      memory,
      world,
      actorId,
      requiredIdSet,
      automaticIdSet,
      conversationIdSet,
      corrections,
      correctedIdSet,
      nativeEntry(memory),
    ),
  );
  // The recent baseline counts complete individual experiences, before optional
  // repetition grouping. Eight groups can contain an unbounded personal history.
  // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
  const recentMemories = new Set(
    memories
      .filter((memory) => memory.kind === 'memory')
      .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
      .slice(0, HARD_CONTEXT_LIMITS.memories)
      .map((memory) => memory.id),
  );
  const candidates: AttentionCandidate[] = [];
  const duplicateMemories = new Map<string, AttentionCandidate>();
  // Remembering a named individual is separate from recognizing a current exposure.
  const namedMemoryIds = new Set(
    recallable
      .filter((memory) =>
        memory.entityIds.some(
          (id) =>
            id !== actorId &&
            !!(
              world.observerIdentities?.[actorId]?.[id]?.nickname ||
              world.observerIdentities?.[actorId]?.[id]?.givenName
            ),
        ),
      )
      .map((memory) => memory.id),
  );
  for (const memory of memories) {
    if (recentMemories.has(memory.id)) memory.required = true;
    // Named others remain individual episodes; generic species recall has no actor handles.
    // The observer's own identity does not prevent grouping encounters with unnamed animals.
    // docs/memory-architecture.md#named-and-generic-memory-subjects
    const namedOther =
      (memory.sourceIds ?? []).some((id) => namedMemoryIds.has(id)) ||
      memory.entityIds.some((id) => id !== actorId && recognizesSubject(world, actorId, id));
    if (memory.required || memory.automatic || namedOther) {
      candidates.push(memory);
      continue;
    }
    // Repeated speech is still a distinct turn in a conversation.
    const timePrefix = `${gameTime(memory.at, world.statusEffectPolicy.clockOffsetHours, world.presentation?.calendar?.dayLabel)} `;
    const content = memory.text.startsWith(timePrefix)
      ? memory.text.slice(timePrefix.length)
      : memory.text;
    const key = `${memory.kind}:${content.trim().replace(/\s+/g, ' ').toLocaleLowerCase()}`;
    const existing = memory.kind === 'conversation' ? undefined : duplicateMemories.get(key);
    if (!existing) {
      duplicateMemories.set(key, memory);
      candidates.push(memory);
      continue;
    }
    existing.sourceIds!.push(...(memory.sourceIds ?? []));
    existing.sourceKeys!.push(...(memory.sourceKeys ?? []));
    existing.experience!.push(...(memory.experience ?? []));
    existing.entityIds = [...new Set([...existing.entityIds, ...memory.entityIds])];
    existing.salience = Math.max(existing.salience, memory.salience);
    existing.revision = digest([existing.revision, memory.revision].sort());
    if (memory.at > existing.at) {
      existing.at = memory.at;
      existing.text = memory.text;
    }
  }
  for (const memory of candidates) {
    memory.embeddingText ??= memory.text;
    const identities = [...new Set(memory.entityIds)].flatMap((id) =>
      entityGet(world.entities, id) &&
      !memory.text.includes(`(ID:${entityHandles(world, actorId).get(id)})`)
        ? [`(ID:${entityHandles(world, actorId).get(id)})`]
        : [],
    );
    if (identities.length) memory.text += ` Referenced entities: ${identities.join('; ')}.`;
  }
  for (const memory of candidates)
    if (memory.sourceIds && memory.sourceIds.length > 1)
      memory.text += ` (${memory.sourceIds.length} records contain this same remembered content.)`;
  const definitions = new Map(
    // Observation determines which definitions are permitted. Reuse their committed
    // immutable facts so repeated preparation can share descriptor work.
    observed.itemDefinitions.map((definition) => [
      definition.id,
      world.itemDefinitions[definition.id] ?? definition,
    ]),
  );
  const groundItems = new Map<string, typeof observed.groundItems>();
  for (const item of observed.groundItems) {
    const contents = groundItems.get(item.ownerId) ?? [];
    contents.push(item);
    groundItems.set(item.ownerId, contents);
  }
  for (const e of observed.visibleEntities) {
    const description = perceivedEntityText(e, definitions, world, actorId, groundItems.get(e.id));
    const embeddingText = description.replace(/ \(ID:[a-f0-9]+\)/g, '');
    candidates.push({
      id: `entity:${e.id}`,
      kind: 'entity',
      text: `${description} ${relativeLocation(observed.actor, e)}`,
      embeddingText,
      revision: digest(embeddingText),
      required: false,
      automatic: false,
      entityIds: [e.id],
      at: world.simTime,
      // Ongoing physical salience ranks a burning fire or a fallen person earlier in
      // optional attention; it forces nothing into context (EPR06).
      salience: 3 + stimulusSalience(e, STIMULUS_POLICY),
    });
  }
  for (const item of observed.inventory) {
    const definition = definitions.get(item.definitionId)!;
    const text = possessionText(item, definition, isEquipped(world, actorId, item.id));
    candidates.push({
      id: `item:${item.id}`,
      kind: 'possession',
      text,
      revision: digest(text),
      required: false,
      automatic: false,
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
      automatic: false,
      entityIds: [],
      at: world.simTime,
      salience: 3,
    });
  const nearest = [...observed.visibleEntities].sort(
    (a, b) =>
      Math.hypot(
        worldPosition(a).x - worldPosition(observed.actor).x,
        worldPosition(a).z - worldPosition(observed.actor).z,
      ) -
        Math.hypot(
          worldPosition(b).x - worldPosition(observed.actor).x,
          worldPosition(b).z - worldPosition(observed.actor).z,
        ) || a.id.localeCompare(b.id),
  );
  // An explicitly bound tool remains necessary even when a large inventory is ranked.
  const boundItems = decisionBoundItemIds(world, actorId);
  if (
    observed.inventory.filter((item) => boundItems.has(item.id)).length >
    HARD_CONTEXT_LIMITS.possessions
  )
    throw new Error('Required possession references exceed the decision allowance.');
  const hardIds = new Set([
    ...nearest
      .filter((e) => e.actor)
      .slice(0, HARD_CONTEXT_LIMITS.actors)
      .map((e) => `entity:${e.id}`),
    ...nearest
      .filter((e) => !e.actor)
      .slice(0, HARD_CONTEXT_LIMITS.objects)
      .map((e) => `entity:${e.id}`),
    ...[...observed.inventory]
      .sort(
        (a, b) =>
          Number(boundItems.has(b.id)) - Number(boundItems.has(a.id)) ||
          Number(isEquipped(world, actorId, b.id)) - Number(isEquipped(world, actorId, a.id)) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, HARD_CONTEXT_LIMITS.possessions)
      .map((i) => `item:${i.id}`),
    ...[...(world.knowledge[actorId] ?? [])]
      .sort((a, b) => b.learnedAt - a.learnedAt || a.recipeId.localeCompare(b.recipeId))
      .slice(0, HARD_CONTEXT_LIMITS.knowledge)
      .map((k) => `recipe:${k.recipeId}`),
  ]);
  for (const candidate of candidates) if (hardIds.has(candidate.id)) candidate.required = true;
  const involved = new Set(observed.visibleEntities.map((entity) => entity.id));
  for (const candidate of candidates.filter((c) => c.required || c.automatic))
    for (const id of candidate.entityIds) involved.add(id);
  candidates.push(...subjectKnowledgeCandidates(world, actorId, involved));
  return candidates;
}
interface VectorCache {
  model: string;
  dimensions: number;
  queries: Record<string, number[]>;
}
interface PreparedEmbedding {
  edited?: boolean;
  request: EmbeddingRequest;
  stage?: PreparedCognitionStage;
  lease?: ExecutionLease;
}
/** Scope is resolved before vector lookup. Every batch and result is bounded and revision-keyed. */
export class RecallService {
  private embeddings: EmbeddingClient;
  private readonly unsubscribe: () => void;
  private readonly unsubscribeControl?: () => void;
  private observedMemoryRevision = -1;
  private indexQueued = false;
  private indexWork: Promise<void> = Promise.resolve();
  private indexController = new AbortController();
  private closed = false;
  private indexFailure: string | undefined;
  private indexSlotId?: string;
  private indexActors: string[] = [];
  private indexGeneration?: string;
  private indexRoundMadeProgress = false;
  private readonly executionOwner = new AsyncLocalStorage<{
    rootId: string;
    lease: ExecutionLease;
  }>();
  constructor(
    private service: WorldService,
    private log: IntelligenceLog,
    client?: EmbeddingClient,
    private readonly execution?: CognitionExecution,
  ) {
    const c = service.config;
    this.embeddings =
      client ??
      createEmbeddingClient({
        apiKey: c.embeddingKey,
        model: c.embeddingModel,
        modelPrices: c.embeddingModelPrices,
        dimensions: c.embeddingDimensions,
        network: log.network,
        timeoutMs: c.aiTimeoutMs,
      });
    this.unsubscribe = service.subscribe(() => {
      if (service.paused) this.indexController.abort();
      else if (this.indexController.signal.aborted && !this.closed) {
        this.indexController = new AbortController();
        void this.indexWork.then(() => this.scheduleMemoryIndex());
      }
      const revision = service.store.memories?.publicationRevision ?? -1;
      if (revision === this.observedMemoryRevision) return;
      this.observedMemoryRevision = revision;
      this.scheduleMemoryIndex();
    });
    const control = service.cognitionControl;
    if (control) {
      let held = control.held;
      this.unsubscribeControl = control.subscribe(() => {
        const resumed = held && !control.held;
        held = control.held;
        if (resumed) {
          // Each interval may select different autonomous people. A previous
          // partial round must not hide newly selected people after release.
          this.indexActors = [];
          this.scheduleMemoryIndex();
        }
      });
    }
    this.scheduleMemoryIndex();
  }

  withExecution<T>(rootId: string, lease: ExecutionLease, operation: () => Promise<T>): Promise<T> {
    const release = this.service.cognitionControl?.registerNative(rootId);
    return this.executionOwner.run({ rootId, lease }, operation).finally(() => release?.());
  }
  private attemptLink(stage: string, requestId?: string, prepared?: PreparedEmbedding) {
    const owner = this.executionOwner.getStore();
    return owner
      ? {
          rootJobId: owner.rootId,
          category: 'preparation' as const,
          stage,
          executionClass: 'background' as const,
        }
      : prepared?.lease && requestId
        ? {
            rootJobId: requestId,
            category: 'preparation' as const,
            stage,
            executionClass: prepared.lease.executionClass,
          }
        : undefined;
  }

  private scheduleMemoryIndex(): void {
    if (
      this.closed ||
      this.service.cognitionControl?.held ||
      this.indexQueued ||
      !this.service.store.vectors ||
      !this.service.config.embeddingKey ||
      this.service.config.budgetUsd <= 0 ||
      this.service.paused
    )
      return;
    this.indexQueued = true;
    if (this.execution) {
      const id = `memory-index-admission:${randomUUID()}`;
      this.indexSlotId = id;
      this.indexWork = new Promise<void>((resolve) => {
        const at = this.execution!.timestamp();
        const accepted = this.execution!.enqueue({
          id,
          actorId: 'world-agent',
          kind: 'maintenance',
          urgency: 0,
          eligibleAt: at,
          dispatchBy: at + 2000,
          metadataBytes: Buffer.byteLength(id) + 128,
          start: async (lease) => {
            this.indexSlotId = undefined;
            let more = false;
            try {
              more = await this.withExecution(id, lease, () => this.indexMemories());
            } catch (error) {
              recordBackgroundFailure('memory-index', error);
              this.indexFailure =
                'Memory indexing interrupted; the original spending remains recorded.';
            } finally {
              this.indexQueued = false;
              resolve();
            }
            if (more && !lease.uncertainCompletion) this.scheduleMemoryIndex();
          },
          declined: async () => {
            this.indexQueued = false;
            this.indexSlotId = undefined;
            resolve();
          },
        });
        if (!accepted) {
          this.indexQueued = false;
          this.indexSlotId = undefined;
          resolve();
        }
      });
      return;
    }
    this.indexWork = this.indexWork
      .then(async () => {
        while (this.indexQueued && !this.closed) {
          this.indexQueued = false;
          const more = await this.indexMemories();
          this.indexQueued ||= more;
        }
      })
      .catch((error) => {
        recordBackgroundFailure('memory-index', error);
        this.indexFailure =
          'Memory indexing interrupted; dispatched sources require explicit reconciliation.';
      });
  }

  /** Check at actual dispatch, after logging/admission awaits. Start the provider in a
   * fresh mutation turn, but release that turn before waiting for its response. */
  private async embedCurrent(
    request: EmbeddingRequest,
    current: () => boolean | Promise<boolean>,
    prepared?: PreparedEmbedding,
  ): Promise<AiResult<number[][]>> {
    let providerStarted = false,
      dispatchIntent = false;
    try {
      const admitted = await this.service.publishRecall(async () => {
        const valid = await current();
        const owner = this.executionOwner.getStore();
        if (
          valid &&
          !this.closed &&
          !this.service.paused &&
          !request.signal?.aborted &&
          !owner?.lease.uncertainCompletion
        ) {
          if (owner || prepared?.lease) {
            try {
              dispatchIntent = true;
              if (!(await this.service.store.markDecisionDispatch(request.requestId)))
                throw new Error('Embedding dispatch was already claimed.');
            } catch (error) {
              // The write may have committed despite a lost acknowledgement.
              (prepared?.lease ?? owner?.lease)?.uncertain(request.requestId);
              throw error;
            }
          }
          const dispatch = () => {
            providerStarted = true;
            return this.embeddings.embed(prepared?.request ?? request);
          };
          return {
            result:
              prepared?.stage && this.service.cognitionControl
                ? this.service.cognitionControl.dispatch(prepared.stage, dispatch, prepared.lease)
                : dispatch(),
          };
        }
        const now = new Date().toISOString();
        const cancelled: AiResult<number[][]> = {
          outcome: 'cancelled',
          reason: 'Embedding context changed before dispatch.',
          receipt: {
            requestId: request.requestId,
            provider: 'openai',
            requestedModel: this.service.config.embeddingModel,
            model: this.service.config.embeddingModel,
            modelVersionStatus: 'unavailable',
            contextDigest: digest(request.texts),
            startedAt: now,
            completedAt: now,
            latencyMs: 0,
            dispatched: false,
            completionUncertain: false,
          },
        };
        return { result: Promise.resolve(cancelled) };
      });
      const result = await admitted.result;
      if (result.receipt.completionUncertain)
        (prepared?.lease ?? this.executionOwner.getStore()?.lease)?.uncertain(request.requestId);
      return result;
    } catch (error) {
      if (prepared?.stage && !providerStarted) {
        try {
          await this.service.store.settle(
            request.requestId,
            undispatchedReceipt(request.requestId, 'openai', Date.now()),
          );
        } catch (settlementError) {
          if (dispatchIntent)
            (prepared?.lease ?? this.executionOwner.getStore()?.lease)?.uncertain(
              request.requestId,
            );
          throw settlementError;
        }
      } else
        (prepared?.lease ?? this.executionOwner.getStore()?.lease)?.uncertain(request.requestId);
      throw error;
    } finally {
      try {
        if (prepared?.stage && prepared.stage.status !== 'consumed')
          await this.service.cognitionControl!.decline(
            prepared.stage,
            'Embedding ended before provider dispatch.',
          );
      } finally {
        prepared?.lease?.release();
      }
    }
  }

  private async prepareEmbedding(
    request: EmbeddingRequest,
    actorId: string,
    current: () => boolean | Promise<boolean>,
  ): Promise<PreparedEmbedding> {
    const control = this.service.cognitionControl;
    if (!control) return { request };
    const owner = this.executionOwner.getStore();
    if (owner?.lease.uncertainCompletion)
      throw new Error('An earlier embedding has uncertain external completion.');
    owner?.lease.release();
    const gate = await control.prepare(
      {
        id: request.requestId,
        rootId: owner?.rootId ?? request.requestId,
        actorId,
        purpose: 'embedding',
        generation: this.service.generation,
        responseBoundBytes: EMBEDDING_LIMITS.resultBytes,
        wireBoundBytes: 1_000_000,
        signal: request.signal,
        current: async () => {
          request.signal?.throwIfAborted();
          if (this.closed || !(await current()))
            throw new Error('Embedding evidence changed before dispatch.');
        },
      },
      { kind: 'embedding', request: { texts: request.texts } },
    );
    try {
      const lease = await this.execution?.acquirePrepared(
        gate.stage,
        owner ? 'background' : 'primary',
      );
      if (this.execution && !lease) throw new Error('Model execution capacity is occupied.');
      if (owner && lease) owner.lease = lease;
      return {
        request: { ...request, texts: gate.input.request.texts },
        stage: gate.stage,
        lease,
        edited: JSON.stringify(request.texts) !== JSON.stringify(gate.input.request.texts),
      };
    } catch (error) {
      await control.decline(gate.stage, 'Embedding capacity admission failed.');
      throw error;
    }
  }
  private async admitEmbedding(
    prepared: PreparedEmbedding,
    admit: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      return await admit();
    } catch (error) {
      await this.discardEmbedding(prepared);
      throw error;
    }
  }
  private async discardEmbedding(
    prepared: PreparedEmbedding,
    reason = 'Embedding admission ended before dispatch.',
  ): Promise<void> {
    prepared.lease?.release();
    if (prepared.stage) await this.service.cognitionControl?.decline(prepared.stage, reason);
  }
  private embeddingAllowance(prepared: PreparedEmbedding): number {
    return this.service.cognitionControl
      ? stageAllowance(this.service.config, {
          kind: 'embedding',
          request: { texts: prepared.request.texts },
        })
      : this.service.config.embeddingReserveUsd;
  }

  private async indexMemories(): Promise<boolean> {
    const controller = this.indexController;
    const repository = this.service.store.memories;
    const generation = this.service.generation;
    const head = await this.service.store.records?.head();
    if (!repository || !head || generation !== this.service.generation) return false;
    const config = this.service.config;
    const model = { model: config.embeddingModel, dimensions: config.embeddingDimensions };
    if (!this.indexActors.length || this.indexGeneration !== generation) {
      this.indexActors = entityValues(this.service.world.entities)
        .filter(
          (entity) =>
            entity.actor?.controller === 'npc' &&
            (this.service.cognitionControl?.allowsAutonomousActor(entity.id) ?? true),
        )
        .map((entity) => entity.id)
        .sort();
      this.indexGeneration = generation;
      this.indexRoundMadeProgress = false;
    }
    const actors = this.indexActors;
    // One batch per actor per round prevents a long-lived actor monopolizing the index budget.
    while (actors.length && !this.closed) {
      const actorId = actors.shift()!;
      const eligible = () =>
        entityGet(this.service.world.entities, actorId)?.actor?.controller === 'npc' &&
        (this.service.cognitionControl?.allowsAutonomousActor(actorId) ?? true);
      if (!eligible()) continue;
      const scope: MemoryScope = { worldId: head.worldId, actorId, generation: head.generation };
      const pending = await repository.pending(scope, model);
      const batch =
        embeddingBatches(
          pending.map((source) => ({
            ...source,
            text: experienceEmbeddingText(source.entry, actorId),
          })),
        ).next().value ?? [];
      if (!batch.length) continue;
      const current = async () =>
        generation === this.service.generation &&
        eligible() &&
        (await repository.current(
          scope,
          batch.map((source) => ({
            id: source.memory.id,
            sourceKind: source.sourceKind,
            revision: source.revision,
          })),
        ));
      const requestId = `memory-index:${randomUUID()}`;
      const prepared = await this.prepareEmbedding(
        { requestId, texts: batch.map((source) => source.text), signal: controller.signal },
        actorId,
        current,
      );
      let spendingRefused = false;
      const admitted = await this.admitEmbedding(prepared, () =>
        repository.markAttempt(scope, model, batch, requestId, async () => {
          if (!eligible() || this.closed) return false;
          const funded = await this.service.store.reserve(
            requestId,
            'openai',
            this.embeddingAllowance(prepared),
            Math.max(0, config.budgetUsd - interactiveAllowance(config)),
            actorId,
            undefined,
            undefined,
            this.attemptLink('memory-index', requestId, prepared),
          );
          spendingRefused = !funded;
          return funded;
        }),
      );
      if (!admitted) {
        await this.discardEmbedding(
          prepared,
          spendingRefused
            ? 'Embedding spending admission was refused.'
            : 'Embedding source or run eligibility changed before dispatch.',
        );
        continue; // A denied actor must not starve the next actor.
      }
      const result = await this.log.run(
        'Background memory embeddings',
        { requestId, actorId, ...model, sourceIds: batch.map((source) => source.memory.id) },
        () =>
          this.embedCurrent(
            {
              requestId,
              texts: batch.map((source) => source.text),
              signal: controller.signal,
            },
            current,
            prepared,
          ),
      );
      await this.service.store.settle(requestId, result.receipt);
      if (result.outcome !== 'value' || prepared.edited) return false;
      await this.service.publishRecall(async () => {
        if (this.closed || controller.signal.aborted || !(await current())) return;
        await repository.putVectors(
          scope,
          model,
          batch.map((source, index) => ({
            id: source.memory.id,
            revision: source.revision,
            vector: result.value[index]!,
          })),
        );
      });
      // Keep one batch per actor in a finite round, including without a shared
      // executor. A successful earlier batch still requires a new round when its
      // remaining participants have no work; otherwise they hide later actors.
      this.indexRoundMadeProgress = true;
      return true;
    }
    return this.indexRoundMadeProgress;
  }

  private recallCurrent(
    world: WorldState,
    actorId: string,
    generation: string,
    signal: AbortSignal,
  ): boolean {
    const now = this.service.world;
    return (
      !this.closed &&
      !signal.aborted &&
      generation === this.service.generation &&
      world.id === now.id &&
      !!entityGet(now.entities, actorId)?.actor &&
      entityGet(now.entities, actorId)?.actor?.controller ===
        entityGet(world.entities, actorId)?.actor?.controller &&
      digest(now.experience?.forgotten[actorId] ?? []) ===
        digest(world.experience?.forgotten[actorId] ?? []) &&
      digest(now.experience?.corrections?.[actorId] ?? {}) ===
        digest(world.experience?.corrections?.[actorId] ?? {})
    );
  }

  private readonly retrieval = new WeakMap<
    AttentionCandidate[],
    {
      eligible: number;
      indexed: number;
      missing: number;
      status: string;
      ranking: 'semantic' | 'lexical' | 'importance-recency';
      generation: string;
      queryCoverage: Omit<
        ReturnType<typeof recallQueries>,
        'lexical' | 'lexicalSources' | 'semantic'
      >;
    }
  >();
  private readonly sourceBindings = new WeakMap<
    AttentionCandidate[],
    { scope: MemoryScope; sources: Map<string, CurrentMemorySource> }
  >();
  selectedSources(candidates: AttentionCandidate[], selected: AttentionCandidate[]) {
    const binding = this.sourceBindings.get(candidates);
    if (!binding) return [];
    // Every member contributes to a grouped candidate's text and freshness binding.
    const ids = new Set(selected.flatMap((candidate) => candidate.sourceKeys ?? [candidate.id]));
    return [...ids].flatMap((id) => {
      const source = binding.sources.get(id);
      return source ? [{ ...source }] : [];
    });
  }
  /** Exact obligations/current causes plus the existing recent-memory baseline.
   * This path never buys discovery or attention and can establish required fit first. */
  async requiredCandidates(
    world: WorldState,
    actorId: string,
    observed: NonNullable<ReturnType<WorldService['observe']>>,
    requiredIds: string[],
    automaticIds: string[] = [],
    conversationIds: string[] = [],
    preparation?: CognitionPreparation,
  ): Promise<AttentionCandidate[]> {
    const repository = this.service.store.memories;
    const head = preparation?.scope ?? (await this.service.store.records?.head());
    if (!repository || !head)
      return candidateSet(
        world,
        actorId,
        observed,
        requiredIds,
        automaticIds,
        conversationIds,
      ).filter((candidate) => candidate.required || candidate.automatic);
    const scope: MemoryScope = preparation?.scope ?? {
      worldId: world.id,
      actorId,
      generation: head.generation,
    };
    const required = await repository.required(
      scope,
      [...requiredIds, ...automaticIds, ...conversationIds],
      preparation?.bodies,
    );
    const recent = await repository.selectContext(scope, null, HARD_CONTEXT_LIMITS.memories);
    const sources = [
      ...new Map(
        [...recent, ...required].map((source) => [experienceEntryKey(source.entry), source]),
      ).values(),
    ];
    const candidates = candidateSet(
      world,
      actorId,
      observed,
      requiredIds,
      automaticIds,
      conversationIds,
      sources,
    ).filter((candidate) => candidate.required || candidate.automatic);
    this.sourceBindings.set(candidates, {
      scope,
      sources: new Map(
        sources.map((source) => [experienceEntryKey(source.entry), memorySourceProof(source)]),
      ),
    });
    return candidates;
  }
  async candidates(
    world: WorldState,
    actorId: string,
    observed: NonNullable<ReturnType<WorldService['observe']>>,
    requiredIds: string[],
    automaticIds: string[],
    conversationIds: string[],
    stimulus: string,
    requestId: string,
    signal: AbortSignal,
    budgetCeiling: number,
    preparation?: CognitionPreparation,
    mode: 'ordinary' | 'native-only' = 'ordinary',
    discovery?: RecallDiscoveryCues,
  ): Promise<AttentionCandidate[]> {
    const generation = this.service.generation;
    const repository = this.service.store.memories;
    const head = preparation?.scope ?? (await this.service.store.records?.head());
    if (!repository || !head)
      return candidateSet(world, actorId, observed, requiredIds, automaticIds, conversationIds);
    const scope: MemoryScope = preparation?.scope ?? {
      worldId: world.id,
      actorId,
      generation: head.generation,
    };
    const current = () => this.recallCurrent(world, actorId, generation, signal);
    const config = this.service.config;
    const coverage = await repository.coverage(scope, {
      model: config.embeddingModel,
      dimensions: config.embeddingDimensions,
    });
    const count = coverage.eligible;
    const inner = world.innerWorlds?.[actorId];
    const goal = projectEntityMarkers(
      currentGoal(entityGet(world.entities, actorId)!.actor!),
      world,
      actorId,
    );
    const queries = recallQueries({ stimulus, goal, aboutMe: inner?.text, discovery });
    const query = queries.semantic;
    const key = `memory-query:${world.id}:${actorId}`;
    const queryKey = digest({ query, generation: scope.generation });
    const cache = (await this.service.store.getIntegration(key)) as
      | { key: string; model: string; dimensions: number; query: number[] }
      | undefined;
    let vector =
      query !== undefined &&
      cache?.key === queryKey &&
      cache.model === config.embeddingModel &&
      cache.dimensions === config.embeddingDimensions
        ? cache.query
        : undefined;
    let status =
      count <= 300
        ? 'direct: eligible sources fit discovery row limit'
        : vector
          ? 'cached query'
          : 'structured fallback: query embedding unavailable';
    if (
      mode !== 'native-only' &&
      count > 300 &&
      !vector &&
      query !== undefined &&
      this.service.store.vectors &&
      config.embeddingKey
    ) {
      const id = `${requestId}:memory-query`;
      signal.throwIfAborted();
      const prepared = await this.prepareEmbedding(
        { requestId: id, texts: [query], signal },
        actorId,
        current,
      );
      if (
        await this.admitEmbedding(prepared, () =>
          this.service.store.reserve(
            id,
            'openai',
            this.embeddingAllowance(prepared),
            budgetCeiling,
            actorId,
            undefined,
            undefined,
            this.attemptLink('memory-query', id, prepared),
          ),
        )
      ) {
        const result = await this.log.run(
          'Memory query embedding',
          { requestId: id, actorId, model: config.embeddingModel },
          () => this.embedCurrent({ requestId: id, texts: [query], signal }, current, prepared),
        );
        await this.service.store.settle(id, result.receipt);
        status = result.outcome;
        if (result.outcome === 'value') {
          vector = result.value[0];
          if (!prepared.edited)
            await this.service.publishRecall(async () => {
              if (!current()) throw new Error('Recall context changed during query embedding.');
              await this.service.store.putIntegration(key, {
                key: queryKey,
                model: config.embeddingModel,
                dimensions: config.embeddingDimensions,
                query: vector,
              });
            });
        }
      } else {
        await this.discardEmbedding(prepared, 'Embedding spending admission was refused.');
        status = 'structured fallback: spending cap';
      }
    }
    const required = await repository.required(
      scope,
      [...requiredIds, ...automaticIds, ...conversationIds],
      preparation?.bodies,
    );
    const recent = await repository.selectContext(scope, null, HARD_CONTEXT_LIMITS.memories);
    const lexical = !vector ? queries.lexicalSources : undefined;
    const optional = await repository.select(
      scope,
      300,
      vector
        ? { query: vector, model: config.embeddingModel, dimensions: config.embeddingDimensions }
        : lexical
          ? { text: lexical }
          : undefined,
      preparation?.conversation.sources.map((source) => source.id),
      preparation?.bodies,
    );
    signal.throwIfAborted();
    if ((await this.service.store.records?.head())?.generation !== scope.generation)
      throw new Error('World restored during memory retrieval.');
    const sources = [
      ...new Map(
        [...optional, ...recent, ...required].map((source) => [
          experienceEntryKey(source.entry),
          source,
        ]),
      ).values(),
    ];
    const candidates = candidateSet(
      world,
      actorId,
      observed,
      requiredIds,
      automaticIds,
      conversationIds,
      sources,
    );
    const scores = new Map(
      sources.map((source) => [experienceEntryKey(source.entry), source.score]),
    );
    for (const candidate of candidates)
      for (const key of candidate.sourceKeys ?? [candidate.id]) {
        const score = scores.get(key);
        if (score !== undefined && (candidate.score === undefined || score > candidate.score))
          candidate.score = score;
      }
    this.retrieval.set(candidates, {
      ...coverage,
      status,
      ranking: vector ? 'semantic' : lexical ? 'lexical' : 'importance-recency',
      generation: scope.generation,
      queryCoverage: {
        coverage: queries.coverage,
        includedSources: queries.includedSources,
        omittedSources: queries.omittedSources,
        identityIncluded: queries.identityIncluded,
      },
    });
    this.sourceBindings.set(candidates, {
      scope,
      sources: new Map(
        sources.map((source) => [experienceEntryKey(source.entry), memorySourceProof(source)]),
      ),
    });
    return candidates;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.unsubscribe();
    this.unsubscribeControl?.();
    this.indexController.abort();
    if (this.indexSlotId) await this.execution?.cancel(new Set([this.indexSlotId]));
    await this.indexWork;
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
    optionalByteBudget = Number.MAX_SAFE_INTEGER,
    immediateContext: Record<string, unknown> = {},
    mode: 'ordinary' | 'native-only' = 'ordinary',
    preparationContext: {
      discovery?: RecallDiscoveryCues;
      sources?: ModelEvidenceSource[];
      triggerKey?: string;
    } = {},
  ) {
    const config = this.service.config;
    const generation = this.service.generation;
    const inner = world.innerWorlds?.[actorId];
    const records = mindFor(world, actorId).records;
    const people = candidates
      .filter((candidate) => candidate.kind === 'entity')
      .flatMap((candidate) => candidate.entityIds)
      .filter((id) => !!entityGet(world.entities, id)?.actor);
    const queries = recallQueries({
      stimulus,
      goal: projectEntityMarkers(
        currentGoal(entityGet(world.entities, actorId)!.actor!),
        world,
        actorId,
      ),
      aboutMe: inner?.text,
      discovery: preparationContext.discovery,
    });
    const query = queries.semantic;
    const automatic = candidates.filter((candidate) => candidate.automatic);
    for (const candidate of automatic) {
      candidate.selected = true;
      candidate.reason = 'current conversation';
    }
    const searchable = candidates.filter((candidate) => !candidate.automatic);
    const candidateBytes = (candidate: AttentionCandidate) =>
      (candidate.experience?.length
        ? Buffer.byteLength(JSON.stringify(candidate.experience))
        : Buffer.byteLength(candidate.text.replace(/\n/g, '\n  '))) +
      Buffer.byteLength(candidate.id) +
      8;
    const contextBytes = candidateBytes;
    const mandatory = searchable.filter((candidate) => candidate.required);
    for (const candidate of mandatory) {
      candidate.selected = true;
      candidate.reason = 'mandatory';
    }
    const mandatoryBytes = mandatory.reduce((sum, candidate) => sum + contextBytes(candidate), 0);
    if (mandatoryBytes > optionalByteBudget)
      throw new Error('Required recall exceeds the remaining context budget.');
    let remainingBytes = optionalByteBudget - mandatoryBytes;
    const optionalCandidates = searchable.filter(
      (candidate) => !candidate.required && contextBytes(candidate) <= remainingBytes,
    );
    const sectionKinds: AttentionCandidate['kind'][] = [
      'conversation',
      'memory',
      'entity',
      'possession',
      'knowledge',
    ];
    const peopleSet = new Set(people);
    const metadataOrder = (a: AttentionCandidate, b: AttentionCandidate) =>
      Number(b.entityIds.some((id) => peopleSet.has(id))) -
        Number(a.entityIds.some((id) => peopleSet.has(id))) ||
      b.salience - a.salience ||
      b.at - a.at;
    const memoryOrder = (a: AttentionCandidate, b: AttentionCandidate) => {
      // Discovery relevance must survive the later byte shortlist. Scores within
      // this source family come from one query/method, never mixed with other
      // families' salience or attention probabilities.
      if (a.score !== undefined || b.score !== undefined) {
        if (a.score === undefined) return 1;
        if (b.score === undefined) return -1;
        if (a.score !== b.score) return b.score - a.score;
      }
      return metadataOrder(a, b);
    };
    const sections = new Map(
      sectionKinds.map((kind) => [
        kind,
        optionalCandidates
          .filter((candidate) => candidate.kind === kind)
          .sort(kind === 'memory' || kind === 'conversation' ? memoryOrder : metadataOrder),
      ]),
    );
    const sectionLimit = (_kind: AttentionCandidate['kind']) => 300;
    const semanticPool = sectionKinds.flatMap((kind) => {
      const section = sections.get(kind)!;
      return (kind === 'memory' || kind === 'conversation') && this.retrieval.has(candidates)
        ? []
        : section.length > sectionLimit(kind)
          ? section
          : [];
    });
    const key = `vectors:${world.id}:${actorId}`;
    const vectors = this.service.store.vectors;
    let cache = (
      semanticPool.length && vectors ? await this.service.store.getIntegration(key) : undefined
    ) as VectorCache | undefined;
    if (cache?.model !== config.embeddingModel || cache.dimensions !== config.embeddingDimensions)
      cache = {
        model: config.embeddingModel,
        dimensions: config.embeddingDimensions,
        queries: {},
      };
    const scope = { key, model: config.embeddingModel, dimensions: config.embeddingDimensions };
    const retainedSources = candidates.map(({ id, revision }) => ({ id, revision }));
    const indexed =
      semanticPool.length && vectors
        ? await vectors.reconcile(scope, retainedSources)
        : new Set<string>();

    // Preserve structured priority while indexing only sections large enough to need semantic top-N.
    const unindexed = semanticPool
      .filter((candidate) => !indexed.has(candidate.id))
      .sort(metadataOrder);
    const queryKey = digest({
      query,
      revision: inner?.revision,
      forgotten: world.experience?.forgotten[actorId],
    });
    const cachedQuery = query === undefined ? undefined : cache.queries[queryKey];
    const missing =
      query === undefined
        ? []
        : (embeddingBatches(unindexed, cachedQuery ? [] : [query]).next().value ?? []);
    let embeddingStatus = !semanticPool.length
      ? 'skipped: every section is within the direct-Jev limit'
      : vectors
        ? 'cache'
        : 'unavailable: PostgreSQL with pgvector required';
    const additions: { id: string; revision: string; vector: number[] }[] = [];
    let experimentalQuery: number[] | undefined;
    if (query === undefined)
      embeddingStatus = 'unavailable: complete current cue exceeds query allowance';
    if (query !== undefined && semanticPool.length && vectors && (missing.length || !cachedQuery)) {
      const id = `${jobId}:embeddings`;
      if (mode === 'native-only') embeddingStatus = 'native-only: cached evidence';
      else if (!config.embeddingKey) embeddingStatus = 'unavailable: no embedding credentials';
      else {
        const texts = [
          ...(!cachedQuery ? [query] : []),
          ...missing.map((c) => c.embeddingText ?? c.text),
        ];
        const prepared = await this.prepareEmbedding(
          { requestId: id, texts, signal },
          actorId,
          () => this.recallCurrent(world, actorId, generation, signal),
        );
        const funded = await this.admitEmbedding(prepared, () =>
          this.service.store.reserve(
            id,
            'openai',
            this.embeddingAllowance(prepared),
            budgetCeiling,
            actorId,
            undefined,
            undefined,
            this.attemptLink('recall-embeddings', id, prepared),
          ),
        );
        if (!funded) {
          await this.discardEmbedding(prepared, 'Embedding spending admission was refused.');
          embeddingStatus = 'deferred: spending cap';
        } else {
          const result = await this.log.run(
            'Embeddings',
            {
              requestId: id,
              model: config.embeddingModel,
              dimensions: config.embeddingDimensions,
              texts,
            },
            () =>
              this.embedCurrent(
                { requestId: id, texts, signal },
                () => this.recallCurrent(world, actorId, generation, signal),
                prepared,
              ),
          );
          await this.service.store.settle(id, result.receipt);
          embeddingStatus = result.outcome;
          if (result.outcome === 'value') {
            let i = 0;
            if (!cachedQuery) {
              if (prepared.edited) experimentalQuery = result.value[i++]!;
              else cache.queries[queryKey] = result.value[i++]!;
            }
            if (!prepared.edited)
              for (const c of missing)
                additions.push({ id: c.id, revision: c.revision, vector: result.value[i++]! });
            else
              embeddingStatus =
                'experimental vectors captured; original source caches remain unmodified';
            for (const id of Object.keys(cache.queries).slice(0, -16)) delete cache.queries[id];
          }
        }
      }
    }
    // Validation and bounded writes share the mutation turn with forgetting/restore.
    // Provider work above remains outside; an inherited callback context cannot bypass it.
    if (semanticPool.length && vectors)
      await this.service.publishRecall(async () => {
        if (!this.recallCurrent(world, actorId, generation, signal))
          throw new Error('Recall sources changed during embedding; discard stale context.');
        if (additions.length) {
          await vectors.put(scope, additions);
          for (const source of additions) indexed.add(source.id);
        }
        await this.service.store.putIntegration(key, cache);
      });
    const q = experimentalQuery ?? cache.queries[queryKey];
    const byId = new Map(searchable.map((c) => [c.id, c]));
    const finalists: AttentionCandidate[] = [];
    for (const kind of sectionKinds) {
      const section = sections.get(kind)!;
      const limit = sectionLimit(kind);
      if (section.length <= limit) {
        finalists.push(...section);
        continue;
      }
      const sources = section.map(({ id, revision }) => ({ id, revision }));
      const matches = q && vectors ? await vectors.search(scope, q, sources, limit) : [];
      const semantic = matches
        .map(({ id, score }) => {
          const candidate = byId.get(id)!;
          candidate.score = score;
          return candidate;
        })
        .sort(memoryOrder);
      finalists.push(
        ...Array.from(
          new Map([...semantic, ...section].map((candidate) => [candidate.id, candidate])).values(),
        ).slice(0, limit),
      );
    }
    const sourcePositions = new Map<string, number>();
    const orderedFinalists = orderDecisionContextRoots(
      finalists.map((candidate) => {
        const order = sourcePositions.get(candidate.kind) ?? 0;
        sourcePositions.set(candidate.kind, order + 1);
        return {
          key: canonicalJson([
            world.id,
            generation,
            actorId,
            candidate.kind,
            candidate.sourceKeys ?? [candidate.id],
            candidate.revision,
            'personal',
          ]),
          requiredReasons: [],
          relevance: { source: candidate.kind, order },
          candidate,
        };
      }),
      'source-local',
    );
    const boundedFinalists: AttentionCandidate[] = [];
    let judgeBytes = remainingBytes;
    // Exact required dialogue is already protected. Optional families have no
    // reserved turn; preserve their own query order and merge incomparable heads.
    for (const { candidate } of orderedFinalists) {
      const bytes = contextBytes(candidate);
      if (bytes > judgeBytes) {
        candidate.reason = 'omitted: shared context byte budget';
        continue;
      }
      boundedFinalists.push(candidate);
      judgeBytes -= bytes;
    }
    const candidateTexts = Object.fromEntries(
      boundedFinalists.map((candidate, index) => [
        `c${index}`,
        candidate.experience
          ? { kind: candidate.kind, experience: candidate.experience }
          : `[${candidate.kind}] ${candidate.text}`,
      ]),
    );
    let attentionStatus = 'no candidates';
    let attentionOmitted = 0;
    if (boundedFinalists.length) {
      try {
        const versions = new Map(
          [...(this.sourceBindings.get(candidates)?.sources ?? [])].map(([key, source]) => [
            key,
            source.revision,
          ]),
        );
        const evidence = assembleModelEvidence([
          ...(preparationContext.sources ?? []),
          ...candidateModelSources([...automatic, ...mandatory], versions),
        ]);
        const automaticContext = contextSections([...automatic, ...mandatory], evidence.sources);
        const includedContext: Record<string, unknown> = {
          ...immediateContext,
          ...automaticContext,
          experience: evidence.experience,
        };
        if (preparationContext.sources)
          // Deduplicate exact occurrence references, never the words of two turns.
          includedContext['conversation'] = [
            ...new Set([
              ...preparationContext.sources.map((source) =>
                modelEvidenceReference(evidence.sources.get(source.key)!.index),
              ),
              ...((automaticContext['conversation'] ?? []) as string[]),
            ]),
          ];
        else if (Array.isArray(immediateContext['conversation']))
          includedContext['conversation'] = [
            ...immediateContext['conversation'],
            ...(automaticContext['conversation'] ?? []),
          ];
        const trigger = preparationContext.triggerKey
          ? evidence.sources.get(preparationContext.triggerKey)
          : undefined;
        const triggerFacts = immediateContext['triggerFacts'];
        if (trigger && triggerFacts && typeof triggerFacts === 'object')
          includedContext['triggerFacts'] = {
            ...triggerFacts,
            experience: modelEvidenceReference(trigger.index),
          };
        const request = attentionRequest(
          {
            stimulus: trigger
              ? `Current cause: ${modelEvidenceReference(trigger.index)}`
              : (immediateContext['stimulus'] ?? stimulus),
            goal: projectEntityMarkers(
              currentGoal(entityGet(world.entities, actorId)!.actor!),
              world,
              actorId,
            ),
            includedContext,
            attentionPolicy: CONTEXT_EVIDENCE_POLICY,
          },
          Object.entries(candidateTexts),
        );
        const judged =
          mode !== 'native-only' && Object.keys(request.questions).length
            ? await judge(request)
            : { answers: {} };
        for (const [i, c] of boundedFinalists.entries()) {
          if (mode !== 'native-only' && !Object.hasOwn(request.questions, `c${i}`)) {
            c.selected = false;
            c.reason = 'omitted: attention request allowance';
            attentionOmitted++;
            continue;
          }
          const answer = judged.answers[`c${i}`];
          c.attention = answer;
          // Retrieval favors recall: confidence is not P(relevant), and ambiguity
          // must not erase useful or contradictory evidence. Native admission
          // remains responsible for any later action.
          c.selected = mode === 'native-only' ? true : attentionIncludes(answer);
          c.reason = !request.questions[`c${i}`]
            ? 'omitted: judgment token budget'
            : c.selected
              ? mode === 'native-only'
                ? 'Native bounded coverage'
                : 'Jev included'
              : 'Jev excluded or uncertain';
        }
        attentionStatus = 'completed';
      } catch (error) {
        signal.throwIfAborted();
        // Optional attention may fail; directly perceived evidence and active
        // obligations must still reach the immediate decision.
        attentionStatus = error instanceof Error ? error.message : 'Attention unavailable';
        for (const c of boundedFinalists) {
          c.selected = false;
          c.reason = 'attention unavailable';
        }
      }
    }
    const selected = [
      ...automatic,
      ...mandatory,
      ...boundedFinalists.filter((candidate) => candidate.selected),
    ].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    const includedOptional = new Set(boundedFinalists.filter((candidate) => candidate.selected));
    const ranked = orderedFinalists
      .filter(({ candidate }) => includedOptional.has(candidate))
      .map((entry) => ({
        ...entry,
        relevance: {
          ...entry.relevance,
          ...(entry.candidate.attention?.type === 'noul'
            ? { rank: entry.candidate.attention.noul }
            : {}),
        },
      }));
    const selectionBasis = ranked.every((entry) => entry.relevance.rank !== undefined)
      ? 'shared-rank'
      : 'source-local';
    return {
      selected,
      // Final observer-reference expansion can require another byte fit. Preserve
      // this retrieval order; chronological presentation is not omission priority.
      optionalPriority: orderDecisionContextRoots(ranked, selectionBasis).map(
        ({ candidate }) => candidate.id,
      ),
      diagnostics: {
        memoryRetrieval: { ...this.retrieval.get(candidates), indexFailure: this.indexFailure },
        questionVersion: JEV_QUESTIONS_VERSION,
        attentionStatus,
        attentionOmitted,
        selectionBasis,
        query: query ?? null,
        queryCoverage: queries.coverage,
        signals: {
          people,
          stimulus,
          goal: projectEntityMarkers(
            currentGoal(entityGet(world.entities, actorId)!.actor!),
            world,
            actorId,
          ),
          identityQueryIncluded: queries.identityIncluded,
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
          storage: vectors ? 'pgvector' : 'unavailable',
          table: vectors ? 'recall_vectors' : 'unavailable',
          search:
            'database exact top-300 per optional section; hard-query baselines bypass relevance; request/context size bounds apply',
          indexed: indexed.size,
          lag: semanticPool.filter((c) => !indexed.has(c.id)).length,
        },
        automatic,
        mandatory,
        sections: Object.fromEntries(
          sectionKinds.map((kind) => [
            kind,
            {
              eligible: sections.get(kind)!.length,
              finalists: boundedFinalists.filter((c) => c.kind === kind).length,
            },
          ]),
        ),
        candidates: boundedFinalists,
        eligible: candidates.length,
        unexamined:
          candidates.length -
          automatic.length -
          mandatory.length -
          boundedFinalists.length +
          attentionOmitted,
      },
    };
  }
}
