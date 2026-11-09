import { retrieveRecall } from './recall-retrieval.js';
import { selectRecall } from './recall-selection.js';
import { formatEntityRecallCandidate } from './recall-entity.js';
import { formatMemoryCandidate, groupMemoryCandidates } from './recall-memory.js';
import { personalVectorScope } from './vector-store.js';
import { npcMemoryActorIds, recentLearnedRecipeIds } from '@open-legend/domain';
import { acceptedMindText } from '@open-legend/domain';
import { requiredItemIds, requiredRecipeIds } from './decision-observation.js';
import {
  retainedMemorySubjects,
  captureExperienceContext,
  type CapturedExperienceContext,
} from './experience-context.js';
import { worldClockText } from '@open-legend/protocol';
import { entityGet, entityValues } from '@open-legend/domain';
import { isEquipped } from '@open-legend/domain';
import { AsyncLocalStorage } from 'node:async_hooks';
import { recordBackgroundFailure } from './performance.js';
import type { CognitionExecution, ExecutionLease } from './cognition-execution.js';
import { personalPronoun } from '@open-legend/language';
export { experienceManifestForModel } from './experience-context.js';
import {
  MemoryPreparationError,
  RETRIEVAL_ROWS,
  CONTEXT_CANDIDATE_LIMIT,
  RETRIEVAL_BYTES,
  memorySourceProof,
} from './memory-repository.js';
import { worldPosition } from '@open-legend/domain';
import type {
  RetrievedMemory,
  MemoryScope,
  CognitionPreparation,
  CurrentMemorySource,
} from './memory-repository.js';
import { subjectKnowledgeCandidates } from './knowledge-context.js';
import {
  currentBodyValue,
  identityForEntity,
  observerIndividual,
  subjectKey,
  speechDescription,
} from '@open-legend/domain';
import {
  entityHandle,
  projectEntityMarkers,
  historicalAccountText,
  entityLabel,
  awarenessBindsSubject,
} from './entity-references.js';
import {
  contextSections,
  perceivedEntityText,
  possessionText,
  relativeLocation,
  experienceForModel,
  experienceModelBindings,
  experienceEmbeddingText,
} from './perceived-context.js';
import { currentGoal } from '@open-legend/domain';
import {
  EXPERIENCE_LIMITS,
  experiences,
  mindFor,
  type MemoryRecord,
  type Entity,
  type WorldState,
  type Awareness,
  type ObserverSubject,
  type ExperienceEntry,
  experienceEntries,
  experienceReading,
  experienceEntryKey,
} from '@open-legend/domain';
import { embeddingBatches } from './embedding-batches.js';
import {
  createEmbeddingClient,
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
export interface AttentionCandidate {
  subjects?: ObserverSubject[];
  /** Structured source meaning cannot be grouped by an equal display sentence. */
  hasStructuredExperience?: boolean;
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
function retainedMemoryEntities(
  world: WorldState,
  actorId: string,
  memory: MemoryRecord,
  awareness?: Awareness,
): Set<string> {
  const subjects = retainedMemorySubjects(memory);
  return new Set([
    actorId,
    ...subjects.flatMap((subject) => {
      const id =
        subject.kind === 'entity'
          ? subject.entityId
          : observerIndividual(world, actorId, subject)?.canonicalId;
      return id ? [id] : [];
    }),
    ...memory.entityIds.filter(
      (id) => !!awareness && awarenessBindsSubject(world, actorId, awareness, id),
    ),
  ]);
}
export function summaryProjector(
  actorId: string,
  presentation: CapturedExperienceContext,
  offset: number,
  dayLabel: string | undefined,
  canonicalSubjects: ReadonlyMap<string, string>,
) {
  return (entry: Extract<ExperienceEntry, { source: 'summary' }>) => {
    const memory = experienceReading(entry, actorId);
    const permitted = new Set([
      actorId,
      ...retainedMemorySubjects(memory).flatMap((subject) => {
        const id =
          subject.kind === 'entity' ? subject.entityId : canonicalSubjects.get(subjectKey(subject));
        return id ? [id] : [];
      }),
    ]);
    const summary = memory.summary.replace(/\(ID:([^()\s]+)\)/g, (marker, id: string) =>
      permitted.has(id) ? marker : '',
    );
    return {
      text: `${gameTime(memory.at, offset, dayLabel)} [${memory.source}]: ${summary}`,
      experience: [
        experienceForModel(
          entry,
          experienceModelBindings(
            presentation,
            actorId,
            entry,
            `source:${entry.source}:${digest([entry.source, memory.id]).slice(0, 12)}`,
          ),
        ),
      ],
      entityIds: [...permitted].filter((id) => id !== actorId || memory.entityIds.includes(id)),
    };
  };
}
/** Derived dialogue can be formatted after generation from finite source meaning;
 * its participant associations are captured before that wait. */
export function captureSummaryProjector(
  world: WorldState,
  actorId: string,
  entries: readonly ExperienceEntry[],
) {
  const subjects = new Map<string, string>();
  for (const entry of entries)
    for (const subject of retainedMemorySubjects(experienceReading(entry, actorId))) {
      const canonical =
        subject.kind === 'entity'
          ? subject.entityId
          : observerIndividual(world, actorId, subject)?.canonicalId;
      if (canonical) subjects.set(subjectKey(subject), canonical);
    }
  return summaryProjector(
    actorId,
    captureExperienceContext(world, actorId, undefined, entries),
    world.statusEffectPolicy.clockOffsetHours,
    world.presentation?.calendar?.dayLabel,
    subjects,
  );
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
  const permittedEntities = retainedMemoryEntities(world, actorId, memory, awareness);
  const occurrenceLabels: string[] = [];
  if (awareness && awareness.eventType !== 'speech') {
    const roles = [
      [awareness.sourceId, 'source'],
      [awareness.targetId, 'subject'],
    ] as const;
    for (const [id, role] of roles) {
      const entity = id && entityGet(world.entities, id);
      if (id && entity && awarenessBindsSubject(world, actorId, awareness, id))
        occurrenceLabels.push(
          ` Occurrence ${role}: ${id === actorId ? personalPronoun('object') : entityLabel(world, entity, actorId, 'indefinite')}.`,
        );
    }
  }
  return formatMemoryCandidate(
    memory,
    {
      actorId,
      permittedEntities,
      occurrenceLabels,
      experience: experienceForModel(
        entry,
        experienceModelBindings(
          world,
          actorId,
          entry,
          `source:${entry.source}:${digest([entry.source, memory.id]).slice(0, 12)}`,
        ),
      ),
      embeddingText: experienceEmbeddingText(entry, actorId),
      time: (at) =>
        gameTime(
          at,
          world.statusEffectPolicy.clockOffsetHours,
          world.presentation?.calendar?.dayLabel,
        ),
    },
    requiredIds,
    automaticIds,
    conversationIds,
    corrections,
    correctedIds,
    entry,
  );
}

export function candidateSet(
  world: WorldState,
  actorId: string,
  observed: NonNullable<ReturnType<WorldService['observe']>>,
  requiredIds: string[],
  automaticIds: string[] = [],
  conversationIds: string[] = [],
  retained?: RetrievedMemory[],
  optionalKnowledgeIds?: readonly string[],
): AttentionCandidate[] {
  // Reject oversized preparation explicitly before formatting thousands of optional
  // bodies; this never narrows SQL recall eligibility or deletes retained sources.
  if (
    observed.visibleEntities.length + observed.inventory.length + observed.knownRecipes.length >
    RETRIEVAL_ROWS
  )
    throw new MemoryPreparationError();
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
  // Remembering a named individual is separate from recognizing a current exposure.
  const namedMemoryIds = new Set(
    memories
      .filter((memory) =>
        memory.entityIds.some((id) => {
          const identity = identityForEntity(world, actorId, id);
          return id !== actorId && !!(identity?.nickname || identity?.givenName);
        }),
      )
      .map((memory) => memory.id),
  );
  const candidates = groupMemoryCandidates(
    memories,
    namedMemoryIds,
    (at) =>
      gameTime(
        at,
        world.statusEffectPolicy.clockOffsetHours,
        world.presentation?.calendar?.dayLabel,
      ),
    HARD_CONTEXT_LIMITS.memories,
  );
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
    const received = currentBodyValue(world, actorId, e.id);
    const description = perceivedEntityText(world, actorId, e.id);
    if (!received || !description) continue;
    candidates.push(
      formatEntityRecallCandidate({
        id: e.id,
        description,
        relativeLocation: relativeLocation(world, observed.actor, e),
        acquiredAt: received.valueAcquiredAt,
        outward: received.value.body.outward,
      }),
    );
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
  // An explicitly bound tool remains necessary even when a large inventory is ranked.
  const boundItems = requiredItemIds(world, actorId);
  if (
    observed.inventory.filter((item) => boundItems.has(item.id)).length >
    HARD_CONTEXT_LIMITS.possessions
  )
    throw new Error('Required possession references exceed the decision allowance.');
  const hardIds = new Set([
    ...[...requiredRecipeIds(world, actorId)].map((id) => `recipe:${id}`),
    ...observed.visibleEntities.map((entity) => `entity:${entity.id}`),
    ...[...observed.inventory]
      .sort(
        (a, b) =>
          Number(boundItems.has(b.id)) - Number(boundItems.has(a.id)) ||
          Number(isEquipped(world, actorId, b.id)) - Number(isEquipped(world, actorId, a.id)) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, HARD_CONTEXT_LIMITS.possessions)
      .map((i) => `item:${i.id}`),
    ...recentLearnedRecipeIds(world, actorId, HARD_CONTEXT_LIMITS.knowledge).map(
      (id) => `recipe:${id}`,
    ),
  ]);
  for (const candidate of candidates) if (hardIds.has(candidate.id)) candidate.required = true;
  const involved = new Set(observed.visibleEntities.map((entity) => entity.id));
  for (const candidate of candidates.filter((c) => c.required || c.automatic))
    for (const id of candidate.entityIds) involved.add(id);
  candidates.push(...subjectKnowledgeCandidates(world, actorId, involved, optionalKnowledgeIds));
  return candidates;
}
interface RecallAuthority {
  worldId: string;
  controller: NonNullable<Entity['actor']>['controller'] | undefined;
  forgotten: string;
  corrections: string;
}
function captureRecallAuthority(world: WorldState, actorId: string): RecallAuthority {
  return {
    worldId: world.id,
    controller: entityGet(world.entities, actorId)?.actor?.controller,
    forgotten: digest(world.experience?.forgotten[actorId] ?? []),
    corrections: digest(world.experience?.corrections?.[actorId] ?? {}),
  };
}
export function captureRecallSelection(
  world: WorldState,
  actorId: string,
  peopleIds: Iterable<string>,
) {
  return {
    authority: captureRecallAuthority(world, actorId),
    worldId: world.id,
    inner: world.innerWorlds?.[actorId]
      ? {
          text: acceptedMindText(world, actorId),
          revision: world.innerWorlds[actorId]!.revision,
        }
      : undefined,
    records: mindFor(world, actorId).records,
    people: [...peopleIds].filter((id) => !!entityGet(world.entities, id)?.actor),
    goal: projectEntityMarkers(
      currentGoal(entityGet(world.entities, actorId)!.actor!),
      world,
      actorId,
    ),
    forgotten: [...(world.experience?.forgotten[actorId] ?? [])],
  };
}
export type RecallSelectionContext = ReturnType<typeof captureRecallSelection>;

interface VectorCache {
  model: string;
  dimensions: number;
  queries: Record<string, number[]>;
}
/** Scope is resolved before vector lookup. Every batch and result is bounded and revision-keyed. */
export class RecallService {
  private embeddings: EmbeddingClient;
  private readonly unsubscribe: () => void;
  private observedMemoryRevision = -1;
  private indexQueued = false;
  private indexWork: Promise<void> = Promise.resolve();
  private indexController = new AbortController();
  private closed = false;
  private indexFailure: string | undefined;
  private indexSlotId?: string;
  private indexActors: string[] = [];
  private indexGeneration?: string;
  private indexAfter?: string;
  private indexMore = false;
  private indexRegistering = false;
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
    this.scheduleMemoryIndex();
  }

  withExecution<T>(rootId: string, lease: ExecutionLease, operation: () => Promise<T>): Promise<T> {
    return this.executionOwner.run({ rootId, lease }, operation);
  }
  private attemptLink(stage: string) {
    const owner = this.executionOwner.getStore();
    return owner
      ? {
          rootJobId: owner.rootId,
          category: 'preparation' as const,
          stage,
          executionClass: 'background' as const,
        }
      : undefined;
  }

  private scheduleMemoryIndex(): void {
    if (
      this.closed ||
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
  ): Promise<AiResult<number[][]>> {
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
        if (owner) {
          try {
            if (!(await this.service.store.markDecisionDispatch(request.requestId)))
              throw new Error('Embedding dispatch was already claimed.');
          } catch (error) {
            // The write may have committed despite a lost acknowledgement.
            owner.lease.uncertain(request.requestId);
            throw error;
          }
        }
        return { result: this.embeddings.embed(request) };
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
    try {
      const result = await admitted.result;
      if (result.receipt.completionUncertain)
        this.executionOwner.getStore()?.lease.uncertain(request.requestId);
      return result;
    } catch (error) {
      this.executionOwner.getStore()?.lease.uncertain(request.requestId);
      throw error;
    }
  }

  private async indexMemories(): Promise<boolean> {
    const controller = this.indexController;
    const repository = this.service.store.memories;
    const generation = this.service.generation;
    const head = await this.service.store.records?.head();
    if (!repository || !head || generation !== this.service.generation) return false;
    const config = this.service.config;
    const model = { model: config.embeddingModel, dimensions: config.embeddingDimensions };
    if (this.indexGeneration !== generation) {
      this.indexGeneration = generation;
      this.indexActors = [];
      this.indexAfter = undefined;
      this.indexMore = false;
      this.indexRoundMadeProgress = false;
    }
    if (!this.indexActors.length) {
      const pending = await repository.pendingActors(
        { worldId: head.worldId, generation: head.generation },
        model,
        npcMemoryActorIds(this.service.world),
        this.indexAfter,
      );
      if (generation !== this.service.generation) return false;
      this.indexRegistering = pending.registering;
      this.indexMore = pending.actors.length > 64;
      this.indexActors = pending.actors.slice(0, 64);
      this.indexAfter = this.indexActors.at(-1);
      if (!this.indexActors.length) {
        this.indexAfter = undefined;
        const more = this.indexRoundMadeProgress || this.indexRegistering;
        this.indexRoundMadeProgress = false;
        return more;
      }
    }
    const actors = this.indexActors;
    // One batch per actor per round prevents a long-lived actor monopolizing the index budget.
    while (actors.length && !this.closed) {
      const actorId = actors.shift()!;
      if (entityGet(this.service.world.entities, actorId)?.actor?.controller !== 'npc') continue;
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
        entityGet(this.service.world.entities, actorId)?.actor?.controller === 'npc' &&
        (await repository.current(
          scope,
          batch.map((source) => ({
            id: source.memory.id,
            sourceKind: source.sourceKind,
            revision: source.revision,
          })),
        ));
      const requestId = `memory-index:${randomUUID()}`;
      const admitted = await repository.markAttempt(
        scope,
        model,
        batch,
        requestId,
        async () =>
          entityGet(this.service.world.entities, actorId)?.actor?.controller === 'npc' &&
          !this.closed &&
          this.service.store.reserve(
            requestId,
            'openai',
            config.embeddingReserveUsd,
            Math.max(0, config.budgetUsd - interactiveAllowance(config)),
            actorId,
            undefined,
            undefined,
            this.attemptLink('memory-index'),
          ),
      );
      if (!admitted) continue; // A denied actor must not starve the next actor.
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
          ),
      );
      await this.service.store.settle(requestId, result.receipt);
      if (result.outcome !== 'value') return false;
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
    if (this.indexMore) return true;
    this.indexAfter = undefined;
    const more = this.indexRoundMadeProgress || this.indexRegistering;
    this.indexRoundMadeProgress = false;
    return more;
  }

  private recallCurrent(
    authority: RecallAuthority,
    actorId: string,
    generation: string,
    signal: AbortSignal,
  ): boolean {
    const now = this.service.world;
    return (
      !this.closed &&
      !signal.aborted &&
      generation === this.service.generation &&
      authority.worldId === now.id &&
      !!entityGet(now.entities, actorId)?.actor &&
      entityGet(now.entities, actorId)?.actor?.controller === authority.controller &&
      digest(now.experience?.forgotten[actorId] ?? []) === authority.forgotten &&
      digest(now.experience?.corrections?.[actorId] ?? {}) === authority.corrections
    );
  }

  private readonly noteCoverage = new WeakMap<
    AttentionCandidate[],
    { partial: boolean; considered: number }
  >();
  private readonly retrieval = new WeakMap<
    AttentionCandidate[],
    { eligible: number; indexed: number; missing: number; status: string; generation: string }
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
  async candidates(
    readWorld: () => WorldState,
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
  ): Promise<AttentionCandidate[]> {
    const generation = this.service.generation;
    const authority = captureRecallAuthority(readWorld(), actorId);
    const repository = this.service.store.memories;
    const head = preparation?.scope ?? (await this.service.store.records?.head());
    if (!repository || !head)
      return candidateSet(
        readWorld(),
        actorId,
        observed,
        requiredIds,
        automaticIds,
        conversationIds,
      );
    const scope: MemoryScope = preparation?.scope ?? {
      worldId: readWorld().id,
      actorId,
      generation: head.generation,
    };
    const current = () => this.recallCurrent(authority, actorId, generation, signal);
    const config = this.service.config;
    const query = `${stimulus}\nMy current goal: ${projectEntityMarkers(currentGoal(entityGet(readWorld().entities, actorId)!.actor!), readWorld(), actorId)}\n${acceptedMindText(readWorld(), actorId) ?? ''}`;
    const retrieved = await retrieveRecall({
      runtime: {
        config,
        store: this.service.store,
        log: this.log,
        current,
        publish: (operation) => this.service.publishRecall(operation),
        embed: (request, valid) => this.embedCurrent(request, valid),
        attemptLink: (stage) => this.attemptLink(stage),
      },
      repository,
      scope,
      worldId: readWorld().id,
      actorId,
      query,
      requiredIds,
      automaticIds,
      conversationIds,
      conversationSourceIds: preparation?.conversation.sources.map((source) => source.id),
      bodies: preparation?.bodies,
      requestId,
      signal,
      budgetCeiling,
      mode,
      currentNoteIds: (rows) => {
        const currentNotes = readWorld().actorKnowledge?.[actorId] ?? {};
        return rows.flatMap((row) =>
          currentNotes[row.id]?.revision === row.revision ? [row.id] : [],
        );
      },
      formatCandidates: (sources, noteIds) =>
        candidateSet(
          readWorld(),
          actorId,
          observed,
          requiredIds,
          automaticIds,
          conversationIds,
          sources,
          noteIds,
        ),
    });
    const { candidates, sources } = retrieved;
    this.noteCoverage.set(candidates, retrieved.noteCoverage);
    const scores = new Map(
      sources.map((source) => [experienceEntryKey(source.entry), source.score]),
    );
    for (const candidate of candidates)
      if (scores.get(candidate.id) !== undefined) candidate.score = scores.get(candidate.id);
    this.retrieval.set(candidates, retrieved.retrieval);
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
    this.indexController.abort();
    if (this.indexSlotId) await this.execution?.cancel(new Set([this.indexSlotId]));
    await this.indexWork;
  }
  async select(
    captured: RecallSelectionContext,
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
  ) {
    const generation = this.service.generation;
    return selectRecall(
      {
        config: this.service.config,
        store: this.service.store,
        log: this.log,
        indexFailure: this.indexFailure,
        retrieval: this.retrieval.get(candidates),
        noteCoverage: this.noteCoverage.get(candidates),
        current: () => this.recallCurrent(captured.authority, actorId, generation, signal),
        publish: (operation) => this.service.publishRecall(operation),
        embed: (request, current) => this.embedCurrent(request, current),
        attemptLink: (stage) => this.attemptLink(stage),
      },
      captured,
      actorId,
      stimulus,
      jobId,
      candidates,
      judge,
      signal,
      budgetCeiling,
      optionalByteBudget,
      immediateContext,
      mode,
    );
  }
}
