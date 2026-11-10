import { nativeMilestoneUpdates } from './native-milestones.js';
import type {
  NativeHost,
  NativeWorld,
  NativeWorldPrepared,
  NativeWorldTurn,
} from '@open-legend/native-simulation';
import {
  selectedTemporalPolicy,
  selectedRecognitionSupportReader,
  type ExperiencePrivacy,
  type WorkVector,
} from '@open-legend/domain';
import { nativeSetupSettings } from '@open-legend/domain/native-install';
import { DATABASE_SCHEMA, type NativeWorldAdoption, type SqlGameRepository } from './store.js';
import { nativeDefinitionSources } from './native-definition-sources.js';
import { nativeRecordLayouts, nativeStorageSettings } from './native-install-inputs.js';
import { NativeDefinitionCapture } from './native-definition-capture.js';
import {
  decodeNativeProduct,
  copyNativeProduct,
  retainNativeProduct,
  retainNativeSources,
  withNativeJsonInput,
  encodeNativeJson,
  releaseNativeProduct,
} from './native-consumer.js';
import { nativeRecordChanges } from './native-records.js';
import { nativeTemporalPageEdits } from './native-temporal-edits.js';
import { nativeRestoredHistory } from './native-private-history.js';
import { driveNativeOperation } from './native-providers.js';
import { NativePendingSave } from './native-pending-save.js';
import { NativeActorRoster } from './native-actor-roster.js';
import { NativeRetention } from './native-retention.js';
import type { NativeRetainedValues } from './native-retained-values.js';
import type { HostWork } from './host-work.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type {
  NativeRestoreProjection,
  NativeRestorePublication,
  NativeRestoreStage,
} from './native-restore.js';
import {
  withAdmittedWorkingSources,
  nativeSourceFlatStringFields,
} from './native-current-sources.js';
import { ACCOUNT_RETENTION_PREPARATION } from './account-retention.js';
import { SUPPORT_MEMBERSHIP_PREPARATION } from './retention-cleanup.js';
import { SOURCE_RETENTION_CLOSURE_ROUNDS } from './source-version-retention.js';
import type { OperationalSettings } from './native-world-service.js';
import type { CommandEpoch } from './command-receipts.js';
import type { NativeMilestones } from './native-milestones.js';

/** One inactive native preparation and its genuine Ready fence stay owned
 * through the outer SQL outcome. Neither rejection nor activation fabricates
 * an ordinary save acknowledgement. */
export class NativeRestorePreparation implements NativeRestoreProjection {
  private settled = false;
  private receipt?: NativeWorldAdoption;
  private temporalEdits?: ReturnType<typeof nativeTemporalPageEdits>;
  private publicationOwner?: NativeRestorePublication;
  private installationOwner?: NativeRestoreProjection['installation'];
  private inputsOwner?: NativeRestoreProjection['inputs'];
  private archivesOwner?: NativeRestoreProjection['archives'];
  private archiveBaselineOwner?: NativeRestoreProjection['archiveBaseline'];
  readonly retentionCapacity;
  readonly pending: NativePendingSave;
  readonly retention: NativeRetention;
  private retainedOwner?: NativeRetainedValues;
  private clearProspective?: () => void;
  private operationalOwner?: OperationalSettings;
  private milestonesOwner?: NativeMilestones;
  private privacyOwner?: ExperiencePrivacy;
  private epochOwner?: CommandEpoch;
  private progressOwner?: NativeRestorePublication['progress'];
  readonly actors: NativeActorRoster;
  readonly providers;

  private constructor(
    readonly world: NativeWorld,
    readonly definitions: NativeDefinitionCapture,
    readonly geometry: ReturnType<NativeDefinitionCapture['geometry']>,
    readonly turn: NativeWorldTurn,
    private readonly prepared: NativeWorldPrepared,
    publication: NativeRestorePublication,
    private readonly allocation: ReturnType<HostWork['reserveAllocation']>,
    stage: NativeRestoreStage,
    store: SqlGameRepository,
    timeline: string,
    epoch: CommandEpoch,
    history: Awaited<ReturnType<typeof nativeRestoredHistory>>,
    backgroundSearchAdmission: () => boolean,
    currentRetained: (world: NativeWorld) => NativeRetainedValues | undefined,
  ) {
    this.publicationOwner = publication;
    const restored = publication.restore;
    this.installationOwner = retainNativeSources(restored.installation, publication);
    const changes = retainNativeSources(nativeRecordChanges(restored.changes), publication);
    let temporal: ReturnType<typeof nativeTemporalPageEdits> | undefined;
    try {
      this.epochOwner = epoch;
      this.progressOwner = retainNativeProduct(copyNativeProduct(world, publication.progress));
      this.privacyOwner = retainNativeProduct(
        copyNativeProduct(world, publication.restoreMetadata.privacy),
      );
      // These are the inactive checkpoint journal's first-before/final-after
      // pages. SQL revokes their exact receipts after writing this same delta.
      temporal = nativeTemporalPageEdits(
        world,
        changes,
        publication.temporalPredecessors,
        publication,
      );
      this.temporalEdits = temporal;
      changes.temporalEdits = temporal;
      retainNativeSources(changes, publication, temporal);
      this.archivesOwner = retainNativeSources(
        publication.restoreMetadata.keptArchives,
        publication,
      );
      this.archiveBaselineOwner = retainNativeSources(
        publication.restoreMetadata.archiveBaseline,
        publication,
      );
      this.retentionCapacity = {
        reserveBytes: (bytes: number) => world.reserveConsumerBytes(bytes),
        reserveJson: (bytes: Buffer) => world.reserveConsumerJson(bytes),
      };
      this.inputsOwner = retainNativeSources(
        {
          worldId: restored.worldId,
          initial: false,
          restore: true,
          changes,
          history,
          sources: store.memories.prepareSources(
            restored.worldId,
            changes,
            this.installation.memoryAllowance,
            publication.sourceVersions,
          ),
          outcomes: [],
          privacy: this.privacy,
          privacyChanged: true,
          invalidations: publication.invalidatedMemoryIds ?? {},
          hotEventIds: [],
          collectReceivedValues: true,
        },
        publication,
      );
      this.pending = new NativePendingSave(
        store,
        {
          worldId: restored.worldId,
          generation: restored.generation,
          revision: restored.revision,
          acceptedCut: restored.acceptedCut,
          timeline,
        },
        world,
      );
      this.retainedOwner = retainNativeProduct(
        copyNativeProduct(world, {
          worldId: restored.worldId,
          generation: restored.generation,
          acceptedCut: restored.acceptedCut,
          ids: restored.retainedValues,
        }),
      );
      // The SQL collector can hold this bare lookup across awaits. Its small
      // independent pin survives both publication cleanup and service refresh.
      retainNativeProduct(retainNativeSources(this.retained.ids, this.retained));
      const pending = this.pending,
        worldId = restored.worldId;
      let prospective: NativeRetainedValues | undefined = this.retained;
      this.clearProspective = () => {
        prospective = undefined;
      };
      this.providers = {
        liveReadCuts: () => pending.liveReadCuts(),
        retainedValues: (id: string) => {
          if (id !== worldId) return {};
          const current = currentRetained(world);
          if (current) {
            // The activated service now owns its regular IDs-only product. Do
            // not retain the entire prepared publication's admission forever.
            prospective = undefined;
            return current.ids;
          }
          return prospective?.ids ?? {};
        },
        backgroundSearchAdmission,
      };
      const host =
        restored.changes.writes['data_world']?.find((row) => row.id === '[]') ??
        stage.source.records.tables['data_world']!.find((row) => row.id === '[]')!;
      this.operationalOwner = retainNativeProduct(
        copyNativeProduct(world, JSON.parse(host.payload) as OperationalSettings),
      );
      this.milestonesOwner = retainNativeProduct(
        copyNativeProduct(
          world,
          Object.fromEntries(
            (stage.source.records.tables['actor_milestones'] ?? []).map((row) => [
              row.slot,
              JSON.parse(row.payload) as Record<string, boolean>,
            ]),
          ),
        ),
      );
      const updatedMilestones = nativeMilestoneUpdates(world, this.milestones, restored.changes);
      if (updatedMilestones !== this.milestones) {
        releaseNativeProduct(this.milestones);
        this.milestonesOwner = updatedMilestones;
      }
      this.actors = NativeActorRoster.capture(
        world,
        stage.source.records.tables['sim_actors'] ?? [],
        stage.source.records.tables['sim_exit_exposures'] ?? [],
        stage.source.records.tables['sim_native_response_episodes'] ?? [],
      );
      let admittedRetention: NativeRetention | undefined;
      try {
        const staged = this.actors.prepare(restored.changes);
        try {
          staged();
        } finally {
          staged.release();
        }
        admittedRetention = NativeRetention.capture(
          world,
          restored.worldId,
          selectedTemporalPolicy(definitions.facts.definitions),
          stage.source.records.tables['mind_temporal_actors'] ?? [],
        );
        this.retention = admittedRetention;
        const retained = this.retention.prepare(restored.changes);
        try {
          retained();
        } finally {
          retained.release();
        }
      } catch (error) {
        this.actors.release();
        admittedRetention?.release();
        throw error;
      }
    } catch (error) {
      // A failed constructor has no returned owner to perform later cleanup.
      releaseNativeProduct(changes);
      if (temporal) releaseNativeProduct(temporal);
      this.temporalEdits = undefined;
      this.releaseMetadata();
      releaseNativeProduct(history);
      this.releaseProducts();
      throw error;
    }
  }

  private releaseTemporalEdits(): void {
    const temporal = this.temporalEdits;
    if (!temporal) return;
    this.temporalEdits = undefined;
    // Failed preparation or a known SQL outcome ends these revocation inputs.
    // Adoption providers retain their independent raw
    // publication/IDs owners, rather than this converted change map.
    releaseNativeProduct(this.inputs.changes);
    releaseNativeProduct(temporal);
  }

  private metadata<T extends object>(value: T | undefined): T {
    if (!value) throw new Error('Native restore metadata was released or transferred.');
    return value;
  }
  get publication(): NativeRestorePublication {
    return this.metadata(this.publicationOwner);
  }
  get installation(): NativeRestoreProjection['installation'] {
    return this.metadata(this.installationOwner);
  }
  get inputs(): NativeRestoreProjection['inputs'] {
    return this.metadata(this.inputsOwner);
  }
  get archives(): NativeRestoreProjection['archives'] {
    return this.metadata(this.archivesOwner);
  }
  get archiveBaseline(): NativeRestoreProjection['archiveBaseline'] {
    return this.metadata(this.archiveBaselineOwner);
  }
  get retained(): NativeRetainedValues {
    return this.metadata(this.retainedOwner);
  }

  /** End temporary installation products after confirmed rejection or the
   * actual service handoff. Unknown SQL and incomplete adoption retain them. */
  private releaseProducts(): void {
    const publication = this.publicationOwner,
      installation = this.installationOwner,
      inputs = this.inputsOwner,
      archives = this.archivesOwner,
      baseline = this.archiveBaselineOwner,
      retained = this.retainedOwner;
    this.publicationOwner = this.installationOwner = this.inputsOwner = undefined;
    this.archivesOwner = this.archiveBaselineOwner = this.retainedOwner = undefined;
    this.clearProspective?.();
    this.clearProspective = undefined;
    if (inputs) {
      releaseNativeProduct(inputs.history);
      releaseNativeProduct(inputs);
    }
    if (retained) {
      releaseNativeProduct(retained.ids);
      releaseNativeProduct(retained);
    }
    if (archives) releaseNativeProduct(archives);
    if (baseline) releaseNativeProduct(baseline);
    if (installation) releaseNativeProduct(installation);
    if (publication) releaseNativeProduct(publication);
  }
  get operational(): OperationalSettings {
    return this.metadata(this.operationalOwner);
  }
  get milestones(): NativeMilestones {
    return this.metadata(this.milestonesOwner);
  }
  get privacy(): ExperiencePrivacy {
    return this.metadata(this.privacyOwner);
  }
  get epoch(): CommandEpoch {
    return this.metadata(this.epochOwner);
  }

  get progress(): NativeRestorePublication['progress'] {
    return this.metadata(this.progressOwner);
  }

  /** The service first adopts these exact prepared products synchronously. */
  transferMetadata(): void {
    this.operationalOwner = this.milestonesOwner = this.privacyOwner = this.epochOwner = undefined;
    this.progressOwner = undefined;
    this.retainedOwner = undefined;
  }

  /** SQL and native activation have finished. The service owns the independent
   * report/metadata and refreshed value lookup before these large inputs end. */
  completeAdoption(): void {
    this.releaseProducts();
  }
  private releaseMetadata(): void {
    const operational = this.operationalOwner,
      milestones = this.milestonesOwner,
      privacy = this.privacyOwner,
      epoch = this.epochOwner,
      progress = this.progressOwner,
      retained = this.retainedOwner;
    this.transferMetadata();
    if (operational) releaseNativeProduct(operational);
    if (milestones) releaseNativeProduct(milestones);
    if (privacy) releaseNativeProduct(privacy);
    if (epoch) releaseNativeProduct(epoch);
    if (progress) releaseNativeProduct(progress);
    if (retained) {
      releaseNativeProduct(retained.ids);
      releaseNativeProduct(retained);
    }
  }

  static async prepare(request: {
    readonly host: NativeHost;
    readonly stage: NativeRestoreStage;
    readonly store: SqlGameRepository;
    readonly work: HostWork;
    readonly timeline: string;
    readonly epoch: CommandEpoch;
    readonly privacy: ExperiencePrivacy;
    readonly checkpointPrivacy: ExperiencePrivacy;
    readonly current: () => void;
    readonly backgroundSearchAdmission: () => boolean;
    readonly currentRetained: (world: NativeWorld) => NativeRetainedValues | undefined;
    readonly signal?: AbortSignal;
  }): Promise<NativeRestorePreparation> {
    const { stage, store } = request;
    request.signal?.throwIfAborted();
    let packet: Buffer | undefined = await withAdmittedWorkingSources(
      store.records,
      DATABASE_SCHEMA,
      request.host,
      async (working) => {
        if (
          !working ||
          working.records.generation !== stage.generation ||
          working.records.durableRevision !== stage.revision
        )
          throw new Error('Restore working selection differs from its protected SQL installation.');
        return encodeNativeJson(
          request.host,
          {
            ...working,
            definitions: nativeDefinitionSources(working),
            settings: nativeSetupSettings,
            storage: nativeStorageSettings,
            layouts: nativeRecordLayouts(),
            acceptedCut: 0,
          },
          { installationRoot: { flatStringFields: nativeSourceFlatStringFields } },
        );
      },
    );
    let world: NativeWorld;
    try {
      world = await request.host.installRestoringWorld(packet, DATABASE_SCHEMA);
    } finally {
      releaseNativeProduct(packet);
      packet = undefined;
    }
    let definitions: NativeDefinitionCapture | undefined;
    let geometry: ReturnType<NativeDefinitionCapture['geometry']> | undefined;
    let turn: NativeWorldTurn | undefined;
    let allocation: ReturnType<HostWork['reserveAllocation']> | undefined;
    let result: NativeRestorePreparation | undefined;
    let publication: NativeRestorePublication | undefined;
    let history: Awaited<ReturnType<typeof nativeRestoredHistory>> | undefined;
    try {
      const initial = decodeNativeProduct<NativeRestoreProjection['installation']>(
        await world.installation(),
      );
      definitions = await NativeDefinitionCapture.capture(world);
      geometry = definitions.geometry();
      const reads = await stage.prepareReads(initial, {
        reserveBytes: (bytes) => world.reserveConsumerBytes(bytes),
        reserveJson: (bytes) => world.reserveConsumerJson(bytes),
      });
      // This is the actual private SQL installation at cut zero, inside its
      // still-open transaction. No ordinary live read can access this owner.
      const cut: LiveReadCuts = {
        worldId: initial.worldId,
        generation: initial.generation,
        storageGeneration: stage.generation,
        timeline: request.timeline,
        revision: stage.revision,
        sequence: initial.acceptedCut,
        durableSequence: initial.acceptedCut,
        cuts: [],
      };
      turn = await driveNativeOperation(
        world,
        await withNativeJsonInput(
          world,
          {
            privacy: request.privacy,
            metadata: stage.metadata,
            retentionPreparation: {
              accounts: ACCOUNT_RETENTION_PREPARATION,
              support: SUPPORT_MEMBERSHIP_PREPARATION,
              rounds: SOURCE_RETENTION_CLOSURE_ROUNDS,
            },
          },
          (bytes) => world.beginRestore(bytes),
        ),
        geometry,
        request.signal,
        {
          db: store.db,
          liveReadCuts: () => cut,
          restoreView: (projection, read, archives) =>
            reads.withPrivateView(projection, read, archives),
          retentionCapacity: {
            reserveBytes: (bytes) => world.reserveConsumerBytes(bytes),
            reserveJson: (bytes) => world.reserveConsumerJson(bytes),
          },
          retentionSignal: request.signal,
          retentionSupportSourceIds: selectedRecognitionSupportReader(
            definitions.facts.definitions,
          ),
        },
      );
      if (turn.kind !== 'prepared' || !turn.prepared)
        throw new Error('Native checkpoint reconciliation did not produce a sealed preparation.');
      allocation = request.work.reserveAllocation(
        JSON.parse(turn.prepared.allocation()) as WorkVector,
      );
      publication = decodeNativeProduct<NativeRestorePublication>(turn.prepared.takePublication());
      if (
        !publication.restore ||
        publication.restore.worldId !== initial.worldId ||
        publication.restore.generation !== initial.generation ||
        publication.restore.revision !== stage.revision
      )
        throw new Error('Native restore output does not bind the staged checkpoint.');
      history = await nativeRestoredHistory(publication, request.checkpointPrivacy, store.db, cut);
      result = new NativeRestorePreparation(
        world,
        definitions,
        geometry,
        turn,
        turn.prepared,
        publication,
        allocation,
        stage,
        store,
        request.timeline,
        request.epoch,
        history,
        request.backgroundSearchAdmission,
        request.currentRetained,
      );
      request.signal?.throwIfAborted();
      request.current();
      turn.prepared.ready();
      return result;
    } catch (error) {
      result?.releaseTemporalEdits();
      result?.releaseProducts();
      if (history) releaseNativeProduct(history);
      if (publication) releaseNativeProduct(publication);
      result?.releaseMetadata();
      result?.actors.release();
      result?.retention.release();
      if (turn?.kind === 'prepared') await world.cancel(turn.key);
      allocation?.rollback();
      world.closeAdmission();
      await world.finishStop();
      await geometry?.close();
      definitions?.release();
      throw error;
    }
  }

  async reject(): Promise<void> {
    if (this.settled) throw new Error('Native restore settlement was already decided.');
    this.settled = true;
    this.releaseTemporalEdits();
    this.releaseMetadata();
    if (this.prepared.settle(false) || (await this.world.finishSettlement(this.turn.key)))
      throw new Error('Rejected native restore unexpectedly accepted its candidate.');
    this.allocation.rollback();
    this.world.closeAdmission();
    await this.world.finishStop();
    await this.geometry.close();
    this.definitions.release();
    this.actors.release();
    this.retention.release();
    this.pending.release();
    this.releaseProducts();
  }

  retainReceipt(receipt: NativeWorldAdoption): void {
    if (this.receipt) throw new Error('Restore SQL receipt was already retained.');
    this.receipt = receipt;
  }
  get sqlReceipt(): NativeWorldAdoption {
    if (!this.receipt) throw new Error('Restore has no staged SQL installation receipt.');
    return this.receipt;
  }

  /** Only a known whole-install COMMIT permits this irreversible adoption. */
  async activate(receipt: NativeWorldAdoption, old: NativeWorld): Promise<void> {
    if (this.settled) throw new Error('Native restore settlement was already decided.');
    this.settled = true;
    this.releaseTemporalEdits();
    if (!this.prepared.settle(true))
      throw new Error('Committed native restore refused its accepted candidate.');
    old.closeAdmission();
    await old.finishStop();
    await this.world.activateRestored(this.turn.key, JSON.stringify(receipt));
    this.allocation.commit();
  }
}
