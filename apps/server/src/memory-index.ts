import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { AiResult, EmbeddingRequest } from '@open-legend/ai';
import type { AppConfig } from './config.js';
import type { GameRepository } from './store.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { CognitionExecution, ExecutionLease } from './cognition-execution.js';
import { embeddingBatches } from './embedding-batches.js';
import { experienceEmbeddingText } from './perceived-context.js';
import { interactiveAllowance } from './cognition-budget.js';
import { recordBackgroundFailure } from './performance.js';
import type { MemoryScope } from './memory-repository.js';

export interface MemoryIndexAdmission {
  current(): boolean;
  embed(
    request: EmbeddingRequest,
    current: () => Promise<boolean>,
    lease?: ExecutionLease,
  ): Promise<AiResult<number[][]>>;
  release?(): void;
}
export interface MemoryIndexHost {
  readonly config: AppConfig;
  readonly store: GameRepository;
  readonly generation: string;
  readonly paused: boolean;
  subscribe(changed: () => void): () => void;
  actorIds(): Promise<readonly string[]>;
  isNpc(actorId: string): boolean;
  admission(actorId: string): Promise<MemoryIndexAdmission | undefined>;
  read<T>(actorId: string, work: () => Promise<T>): Promise<T>;
  publishRecall<T>(work: () => Promise<T>): Promise<T>;
}

/** One shared SQL-backed indexing loop for both authorities. Personal source
 * and final provider gates remain with the host; vectors are derived data. */
export class MemoryIndex {
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
    private readonly service: MemoryIndexHost,
    private readonly log: IntelligenceLog,
    private readonly execution?: CognitionExecution,
  ) {
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
  get failure(): string | undefined {
    return this.indexFailure;
  }
  private withExecution<T>(
    rootId: string,
    lease: ExecutionLease,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.executionOwner.run({ rootId, lease }, work);
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
        await this.service.actorIds(),
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
      if (!this.service.isNpc(actorId)) continue;
      const scope: MemoryScope = { worldId: head.worldId, actorId, generation: head.generation };
      const admission = await this.service.admission(actorId);
      if (!admission) continue;
      try {
        const pending = await this.service.read(actorId, () => repository.pending(scope, model));
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
          admission.current() &&
          this.service.isNpc(actorId) &&
          (await this.service.read(actorId, () =>
            repository.current(
              scope,
              batch.map((source) => ({
                id: source.memory.id,
                sourceKind: source.sourceKind,
                revision: source.revision,
              })),
            ),
          ));
        const requestId = `memory-index:${randomUUID()}`;
        const admitted = await repository.markAttempt(
          scope,
          model,
          batch,
          requestId,
          async () =>
            this.service.isNpc(actorId) &&
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
            admission.embed(
              {
                requestId,
                texts: batch.map((source) => source.text),
                signal: controller.signal,
              },
              current,
              this.executionOwner.getStore()?.lease,
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
      } finally {
        admission.release?.();
      }
    }
    if (this.indexMore) return true;
    this.indexAfter = undefined;
    const more = this.indexRoundMadeProgress || this.indexRegistering;
    this.indexRoundMadeProgress = false;
    return more;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.unsubscribe();
    this.indexController.abort();
    if (this.indexSlotId) await this.execution?.cancel(new Set([this.indexSlotId]));
    await this.indexWork;
  }
}
