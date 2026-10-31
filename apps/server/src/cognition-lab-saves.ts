import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { CognitionLabSettingsPatch } from '@open-legend/protocol';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';
import {
  CognitionLabRecords,
  LAB_STORAGE_DEFAULTS,
  LabStorageError,
  labJson,
  labCheckpointReference,
  labExperimentSnapshotSchema,
  labSavedDataSchema,
  assertLabMetadataSize,
  type LabArtifact,
  type LabExperimentSnapshot,
  type LabJson,
  type LabNativeCheckpoint,
  type LabRecord,
  type LabSavedData,
} from './cognition-lab-records.js';
import {
  labExperimentChunks,
  labExperimentMetadata,
  readLabExperiment,
} from './cognition-lab-experiment.js';
import type { GameSaves } from './game-saves.js';
import type { SaveFileMetadata } from './save-files.js';

/** One native import publication and its lab retention charge. Rollback belongs
 * to the unpublished descriptor, and never removes a file retained beforehand. */
export async function importLabCheckpoint(
  records: CognitionLabRecords,
  native: GameSaves,
  metadata: SaveFileMetadata,
  lines: AsyncIterable<string>,
  reservationId?: string,
): Promise<{ checkpoint: LabNativeCheckpoint; rollback(): Promise<void> }> {
  const prior = await records.checkpoint(metadata.id);
  const imported = await native.importLines(metadata, lines);
  const checkpoint = labCheckpointReference(imported.metadata);
  const rollback = async () => {
    if (prior) return;
    const remove = () =>
      imported.created ? native.delete(checkpoint.worldId, checkpoint.id) : Promise.resolve();
    if (await records.checkpoint(checkpoint.id))
      await records.removeUnreferencedCheckpoint(checkpoint.id, remove);
    else if (imported.created && !(await records.references('checkpoint', checkpoint.id)))
      await remove();
  };
  try {
    await records.registerCheckpoint(checkpoint, reservationId);
  } catch (error) {
    await rollback();
    throw error;
  }
  return { checkpoint, rollback };
}

export interface LabSaveScope {
  worldId: string;
  runtimeGeneration: string;
  scenarioRevision: number;
  /** The committed native cut; notification/UI revisions are not native revisions. */
  nativeRevision: number;
  /** Disclosure proof travels with the descriptor and its context artifact. */
  privacy?: LabJson;
}
export type LabInferenceSettings = Required<
  Pick<CognitionLabSettingsPatch, 'models' | 'effort' | 'maxOutputTokens'>
>;
export interface LabSaveRuntime {
  scope(): LabSaveScope;
  experiment(): LabExperimentSnapshot;
  /** Ordinary native capture owns the coherent database snapshot and file publication. */
  capture(id: string, name: string): Promise<LabNativeCheckpoint>;
  /** Validate/install the pair at one held replacement boundary through the native owner.
   * Present-day permission/privacy overlays remain authoritative and must be reported. */
  restore(
    checkpoint: LabNativeCheckpoint,
    experiment: LabExperimentSnapshot,
    commandId: string,
    source?: {
      recordId: string;
      experimentArtifactId: string;
      inferenceSettings?: LabInferenceSettings;
    },
  ): Promise<{ baselineChanged: boolean; reasons: string[] }>;
  /** Internal native replacement may apply current correction/forgetting overlays.
   * The host still checks ownership/private scope; external evidence reads do not use it. */
  restoreAccess?<T>(work: () => Promise<T>): Promise<T>;
  remove(checkpoint: LabNativeCheckpoint): Promise<void>;
}
export interface LabSaveResult {
  record: LabRecord;
  checkpoint: LabNativeCheckpoint;
  experiment: LabExperimentSnapshot;
}

/** Binds native checkpoints to the non-rewindable lab's immutable experiment inputs.
 * This owns descriptors/references, not another native save or restoration engine. */
export class CognitionLabSaves {
  private reusable?: { scope: LabSaveScope; checkpoint: LabNativeCheckpoint };
  constructor(
    private readonly records: CognitionLabRecords,
    private readonly runtime: LabSaveRuntime,
  ) {}
  private assertScope(expected: Pick<LabSaveScope, 'runtimeGeneration' | 'scenarioRevision'>) {
    const current = this.runtime.scope();
    if (
      current.runtimeGeneration !== expected.runtimeGeneration ||
      current.scenarioRevision !== expected.scenarioRevision
    )
      throw new LabStorageError(
        'conflict',
        'The applied scenario changed during capture. Refresh before executing.',
      );
    return current;
  }
  async capture(
    kind: 'scenario' | 'checkpoint',
    name: string,
    options: {
      id?: string;
      origin?: string;
      description?: string;
      expected?: Pick<LabSaveScope, 'runtimeGeneration' | 'scenarioRevision'>;
      continuation?: LabJson;
      references?: Array<{ kind: 'record' | 'artifact'; id: string }>;
    } = {},
  ): Promise<LabSaveResult> {
    z.string().min(1).max(80).parse(name);
    const description = z.string().trim().max(1000).optional().parse(options.description);
    const scope = this.runtime.scope();
    this.assertScope(options.expected ?? scope);
    const experiment = labExperimentSnapshotSchema.parse(
      structuredClone(this.runtime.experiment()),
    );
    const continuation =
      options.continuation === undefined ? undefined : labJson(options.continuation);
    const references = z
      .array(z.object({ kind: z.enum(['record', 'artifact']), id: z.string().uuid() }).strict())
      .parse(options.references ?? []);
    const id = z
      .string()
      .uuid()
      .parse(options.id ?? randomUUID());
    const prior = await this.records.getRecord(id, kind);
    if (prior) {
      const saved = labSavedDataSchema.parse(prior.data);
      return {
        record: prior,
        checkpoint: saved.checkpoint,
        experiment: await this.readExperiment(saved.experimentArtifactId),
      };
    }
    const reuse =
      this.reusable?.scope.worldId === scope.worldId &&
      this.reusable.scope.runtimeGeneration === scope.runtimeGeneration &&
      this.reusable.scope.nativeRevision === scope.nativeRevision
        ? this.reusable.checkpoint
        : undefined;
    const experimentMetadata = labExperimentMetadata(experiment);
    const descriptor = {
      checkpoint: {
        id: randomUUID(),
        worldId: scope.worldId,
        bytes: CHECKPOINT_LIMITS.bytes,
        checksum: '0'.repeat(64),
        createdAt: new Date().toISOString(),
        simTime: Number.MAX_VALUE,
        revision: Number.MAX_SAFE_INTEGER,
      },
      experimentArtifactId: experimentMetadata.id,
      scenarioRevision: scope.scenarioRevision,
      runtimeGeneration: scope.runtimeGeneration,
      ...(options.origin ? { origin: options.origin } : {}),
      ...(continuation !== undefined ? { continuation } : {}),
    };
    // Continuation descriptors remain metadata; full experiment context is streamed.
    const envelope = {
      kind: 'record',
      record: {
        id,
        kind,
        name,
        createdAt: new Date().toISOString(),
        status: 'complete',
        summary: {
          ...descriptor.checkpoint,
          ...(description ? { description } : {}),
          privacy: scope.privacy ?? null,
        },
        data: descriptor,
      },
      links: [
        { kind: 'checkpoint', id: descriptor.checkpoint.id },
        { kind: 'artifact', id: experimentMetadata.id },
        ...references,
      ],
      recipients: [],
    };
    assertLabMetadataSize(envelope);
    const snapshotBytes = experimentMetadata.bytes + Buffer.byteLength(JSON.stringify(envelope));
    const reservation = await this.records.reserve(
      (reuse ? 0 : CHECKPOINT_LIMITS.bytes) + snapshotBytes + 16384,
    );
    let checkpoint: LabNativeCheckpoint | undefined = reuse;
    let registered = false,
      descriptorWritten = false,
      experimentWritten = false;
    try {
      await this.writeExperiment(experiment, experimentMetadata, reservation);
      experimentWritten = true;
      this.assertScope(scope);
      checkpoint ??= labCheckpointReference(await this.runtime.capture(randomUUID(), name));
      this.assertScope(scope);
      if (checkpoint.worldId !== scope.worldId)
        throw new LabStorageError('integrity', 'The native capture belongs to another world.');
      await this.records.registerCheckpoint(checkpoint, reuse ? undefined : reservation);
      registered = true;
      const data: LabSavedData = {
        checkpoint,
        experimentArtifactId: experimentMetadata.id,
        scenarioRevision: scope.scenarioRevision,
        runtimeGeneration: scope.runtimeGeneration,
        ...(options.origin ? { origin: options.origin } : {}),
        ...(continuation !== undefined ? { continuation } : {}),
      };
      const record: LabRecord = {
        id,
        kind,
        name,
        createdAt: new Date().toISOString(),
        status: 'complete',
        summary: {
          checkpointId: checkpoint.id,
          worldId: checkpoint.worldId,
          simTime: checkpoint.simTime,
          capturedAt: checkpoint.createdAt,
          bytes: checkpoint.bytes,
          ...(description ? { description } : {}),
          privacy: scope.privacy ?? null,
        },
        data: labJson(data),
      };
      await this.records.putRecord(record, {
        reservationId: reservation,
        immutable: true,
        references: [
          { kind: 'checkpoint', id: checkpoint.id },
          { kind: 'artifact', id: experimentMetadata.id },
          ...references,
        ],
      });
      descriptorWritten = true;
      this.assertScope(scope);
      this.reusable = {
        scope: { ...scope, nativeRevision: checkpoint.revision ?? scope.nativeRevision },
        checkpoint,
      };
      return { record, checkpoint, experiment };
    } finally {
      try {
        if (checkpoint && !reuse && !descriptorWritten) {
          const abandoned = checkpoint;
          if (registered)
            await this.records.removeUnreferencedCheckpoint(abandoned.id, () =>
              this.runtime.remove(abandoned),
            );
          else await this.runtime.remove(checkpoint);
        }
      } finally {
        try {
          if (experimentWritten && !descriptorWritten)
            await this.records.removeUnreferencedArtifact(experimentMetadata.id);
        } finally {
          await this.records.release(reservation);
        }
      }
    }
  }
  /** Shared point-in-time import and ordinary capture use this same context owner. */
  async storeExperiment(
    snapshot: LabExperimentSnapshot,
    reservationId?: string,
  ): Promise<LabArtifact> {
    const experiment = labExperimentSnapshotSchema.parse(structuredClone(snapshot));
    return this.writeExperiment(experiment, labExperimentMetadata(experiment), reservationId);
  }
  private writeExperiment(
    experiment: LabExperimentSnapshot,
    metadata: LabArtifact,
    reservationId?: string,
  ): Promise<LabArtifact> {
    return this.records.putArtifactStream(
      (async function* () {
        yield* labExperimentChunks(experiment);
      })(),
      metadata,
      reservationId,
    );
  }
  readExperiment(artifactId: string): Promise<LabExperimentSnapshot> {
    return readLabExperiment(this.records, artifactId);
  }
  /** Automatic origin capture includes applied unsaved edits, once per episode. */
  origin(
    name = 'Run origin',
    expected?: Pick<LabSaveScope, 'runtimeGeneration' | 'scenarioRevision'>,
  ): Promise<LabSaveResult> {
    return this.capture('checkpoint', name, { expected });
  }
  async restore(
    id: string,
    commandId: string,
    inferenceSettings?: LabInferenceSettings,
  ): Promise<{ record: LabRecord; baselineChanged: boolean; reasons: string[] }> {
    const work = () => this.restoreSaved(id, commandId, inferenceSettings);
    return this.runtime.restoreAccess ? this.runtime.restoreAccess(work) : work();
  }
  private async restoreSaved(
    id: string,
    commandId: string,
    inferenceSettings?: LabInferenceSettings,
  ): Promise<{ record: LabRecord; baselineChanged: boolean; reasons: string[] }> {
    const record = await this.records.getRecord(id);
    if (!record || (record.kind !== 'scenario' && record.kind !== 'checkpoint'))
      throw new LabStorageError(
        'missing',
        'The selected starting scenario or checkpoint is unavailable.',
      );
    const saved = labSavedDataSchema.parse(record.data);
    const experiment = await this.readExperiment(saved.experimentArtifactId);
    const outcome = await this.runtime.restore(saved.checkpoint, experiment, commandId, {
      recordId: record.id,
      experimentArtifactId: saved.experimentArtifactId,
      inferenceSettings,
    });
    this.reusable = undefined;
    return { record, ...outcome };
  }
  async remove(id: string): Promise<void> {
    // The facade authorizes management of this exact saved identity. Historical
    // disclosure may be forbidden after a correction; deletion needs only this
    // owner's reference graph and registered native manifest, never its payload.
    const references = await this.records.removeRecord(id);
    for (const artifact of references.artifacts)
      await this.records.removeUnreferencedArtifact(artifact);
    for (const checkpointId of references.checkpoints) {
      const checkpoint = await this.records.checkpoint(checkpointId);
      if (checkpoint)
        await this.records.removeUnreferencedCheckpoint(checkpointId, () =>
          this.runtime.remove(checkpoint),
        );
    }
    if (this.reusable && references.checkpoints.includes(this.reusable.checkpoint.id))
      this.reusable = undefined;
  }
}

export interface LabComparisonColumn {
  run: LabRecord;
  costs: { knownUsd: number; unknownCount: number; uncertainCount: number };
  originId?: string;
}
/** Comparisons read summaries only; details/payloads remain explicit selected reads. */
export async function compareLabRuns(
  records: CognitionLabRecords,
  runIds: string[],
): Promise<LabComparisonColumn[]> {
  z.array(z.string().uuid()).min(2).max(LAB_STORAGE_DEFAULTS.maxPageSize).parse(runIds);
  const columns: LabComparisonColumn[] = [];
  for (const id of [...new Set(runIds)]) {
    const run = await records.getHeader(id, 'run');
    if (!run) throw new LabStorageError('missing', 'A selected comparison run is unavailable.');
    const data =
      run.summary && typeof run.summary === 'object' && !Array.isArray(run.summary)
        ? run.summary
        : undefined;
    const originId = typeof data?.['originId'] === 'string' ? data['originId'] : undefined;
    columns.push({
      run: { ...run, data: null },
      costs: await records.costs(id),
      ...(originId ? { originId } : {}),
    });
  }
  return columns;
}
