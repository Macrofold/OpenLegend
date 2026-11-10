import { ActorWork, INTAKE_LIMITS, type WorkRead } from './actor-work.js';
import type { MaintenanceAdmission, MaintenanceInspection } from './maintenance-host.js';
import type { NativeWorldService } from './native-world-service.js';
import { NativeMaintenanceRead } from './native-maintenance-read.js';
import { nativePublicationActors, nativeRecordActor } from './native-publication-actors.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeProduct,
  retainNativeSources,
} from './native-consumer.js';

/** One change-driven intake for the existing maintenance scheduler, including
 * player memory owners eligible for protected-only cleanup. No rich NPC body
 * or whole-world graph is retained merely to enroll scheduling work. */
export class NativeMaintenanceIntake {
  private generation?: string;
  private population: readonly string[] = [];
  private readonly populationIds = new Set<string>();
  private readonly mindOwners = new Set<string>();
  private populationRevision = 0;
  private populationDirty = true;
  private readonly dirty = new Set<string>();
  private sourceRevision?: number;
  private backlog: unknown;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly service: NativeWorldService,
    private readonly memoryBacklog: () => unknown,
  ) {
    this.unsubscribe = service.onPublication((publication) => {
      for (const id of nativePublicationActors(publication, this.population)) this.dirty.add(id);
      for (const [table, owners] of [
        ['mind_state', this.mindOwners],
        ['activity_learning', this.populationIds],
      ] as const) {
        if (
          (publication.records.deletes[table]?.length ?? 0) > 0 ||
          publication.records.writes[table]?.some((row) => {
            const id = nativeRecordActor(table, row.id);
            return id !== undefined && !owners.has(id);
          })
        ) {
          this.populationDirty = true;
          this.populationRevision++;
        }
      }
    });
  }
  async refresh(work: ActorWork): Promise<void> {
    const { service } = this;
    const generation = service.generation;
    if (this.generation !== generation || this.populationDirty) {
      const revision = this.populationRevision;
      const population = await service.publishRecall(async () =>
        decodeNativeProduct<{ thought: string[]; maintenance: string[] }>(
          await service.world.maintenancePopulation(),
        ),
      );
      try {
        if (generation !== service.generation || revision !== this.populationRevision) return;
        if (this.generation !== generation) {
          work.clear();
          this.dirty.clear();
        }
        const nextIds = new Set(population.maintenance);
        for (const id of this.population) if (!nextIds.has(id)) work.retire(id);
        const previous = this.population;
        this.population = retainNativeProduct(
          retainNativeSources(population.maintenance, population),
        );
        releaseNativeProduct(previous);
        this.populationIds.clear();
        this.mindOwners.clear();
        for (const id of population.thought) this.mindOwners.add(id);
        for (const id of this.population) this.populationIds.add(id);
        for (const id of this.population) this.dirty.add(id);
        this.generation = generation;
        this.sourceRevision = undefined;
        this.populationDirty = false;
      } finally {
        releaseNativeProduct(population);
      }
    }
    const sourceChanges = service.store.memories.actorChangesSince(this.sourceRevision);
    this.sourceRevision = sourceChanges?.revision;
    for (const id of sourceChanges?.actors ?? this.population) this.dirty.add(id);
    const backlog = this.memoryBacklog();
    if (backlog !== this.backlog) for (const id of this.population) this.dirty.add(id);
    this.backlog = backlog;
    for (const id of [...this.dirty].slice(0, INTAKE_LIMITS.readsPerPass)) {
      this.dirty.delete(id);
      const actor = service.npcActor(id);
      if (!this.populationIds.has(id) || !actor?.alive || !actor.memory) {
        work.retire(id);
        continue;
      }
      const read = await service.publishRecall(() =>
        NativeMaintenanceRead.capture(service.world, id),
      );
      try {
        if (generation !== service.generation) return;
        if (!read.facts.enrolled) {
          work.retire(id);
          continue;
        }
        work.refreshCaptured(
          service.worldId,
          generation,
          [
            {
              id,
              input: read.inputs(backlog, service.store.memories.actorRevision(id)),
            },
          ],
          false,
        );
      } finally {
        read.release();
      }
    }
  }
  async inspection(work: ActorWork, actorId: string): Promise<MaintenanceInspection> {
    const capture = work.captureRead(actorId);
    const read = await this.service.publishRecall(() =>
      NativeMaintenanceRead.capture(this.service.world, actorId),
    );
    const backlog = this.memoryBacklog(),
      revision = this.service.store.memories.actorRevision(actorId);
    const inputs = read.inputs(backlog, revision).values;
    const sameInputs = (captured: WorkRead | undefined) =>
      !!captured &&
      captured.inputs.length === inputs.length &&
      captured.inputs.every((value, index) => Object.is(value, inputs[index]));
    const admission: MaintenanceAdmission = {
      actorId,
      generation: read.facts.generation,
      fence: read.facts.bodyFence,
      purpose: 'maintenance',
      requiresBody: false,
    };
    return {
      acknowledge: (nextSimAt) =>
        this.service.publishRecall(async () => {
          const gate = await read.publication(this.service.world, admission);
          try {
            return work.inspectedRead(
              actorId,
              nextSimAt,
              capture,
              this.service.generation,
              () =>
                !!gate?.isCurrent() &&
                read.native.inputsCurrent() &&
                sameInputs(capture) &&
                backlog === this.memoryBacklog() &&
                revision === this.service.store.memories.actorRevision(actorId),
            );
          } finally {
            gate?.release();
          }
        }),
      release: () => read.release(),
    };
  }
  clear(): void {
    this.unsubscribe();
    releaseNativeProduct(this.population);
    this.population = [];
    this.populationIds.clear();
    this.mindOwners.clear();
    this.dirty.clear();
    this.generation = undefined;
    this.sourceRevision = undefined;
  }
}
