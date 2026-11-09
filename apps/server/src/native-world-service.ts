import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NativeHost, NativeWorld, NativeWorldTurn } from '@open-legend/native-simulation';
import {
  canonicalJson,
  selectedCreationProfileForWorld,
  selectedPlaytestMilestoneRules,
  selectedTemporalPolicy,
  type ExperiencePrivacy,
  type AppraisalScope,
  type Outcome,
} from '@open-legend/domain';
import { nativeSetupSettings } from '@open-legend/domain/native-install';
import type { ApiResult, CommandInput, GameView } from '@open-legend/protocol';
import type { AssetRevisionReference } from '@open-legend/assets';
import {
  AuthorityError,
  commandRecoveryScopeKey,
  checkpointRecoveryScopeKey,
  privateDraftScopeKey,
  scopeKey,
  type Capability,
  type LoginSession,
  type RequestScope,
} from './authority.js';
import type { AppConfig } from './config.js';
import { DATABASE_SCHEMA, digest, type SqlGameRepository } from './store.js';
import { captureWorkingSources } from './native-current-sources.js';
import { nativeDefinitionSources } from './native-definition-sources.js';
import { nativeRecordLayouts, nativeStorageSettings } from './native-install-inputs.js';
import { NativeDefinitionCapture } from './native-definition-capture.js';
import { captureNativeReadCut, nativeScopedReadCut } from './native-read-cut.js';
import {
  captureNativeRetainedValues,
  type NativeRetainedValues,
} from './native-retained-values.js';
import { decodeNativeProduct, retainNativeSources } from './native-consumer.js';
import { NativePendingSave, type NativePendingPrefix } from './native-pending-save.js';
import { nativeRecordChanges } from './native-records.js';
import { prepareNativeSourceVersionPlan } from './native-source-versions.js';
import { acceptNativeOperation, type NativePublication } from './native-operation.js';
import {
  acceptProtectedNativeOperation,
  type NativeProtectedHold,
} from './native-protected-operation.js';
import { nativePrivateHistory } from './native-private-history.js';
import { postgresTransactionOutcome } from './postgres.js';
import { SOURCE_EDIT_PREPARATION_CAPACITY } from './history-edit.js';
import { NativePlayerCapture } from './native-player-capture.js';
import { NativeNpcCapture } from './native-npc-capture.js';
import { NativeRecentRetention } from './native-retention.js';
import { RETENTION_MIN_DELAY_MS } from './retention-deadlines.js';
import { playerInteractionAvailability } from './player-interaction.js';
import { nativePlayerCommandReferences } from './native-player-command.js';
import { ordinaryPlayerCommand } from './ordinary-player-command.js';
import {
  projectNativePlayerView,
  type NativePlayerRead,
  type NativePlayerRequestOwner,
  type NativePlayerViewRequest,
} from './native-player-view.js';
import { PLAYER_EVENT_WINDOW } from './player-events-view.js';
import { ViewChangedError } from './player-view-async.js';
import {
  COMMAND_RETRY_MS,
  COMMAND_RECEIPT_CACHE_ENTRIES,
  commandRecoveryFingerprint,
  type CommandEpoch,
  type GameplayReceipt,
} from './command-receipts.js';
import { privacyLedgerKey, readPrivacyLedger } from './privacy-ledger.js';
import { assertPrivacyContinuation } from './privacy-ledger.js';
import { RECORD_NODES } from './world-record-schema.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { CommitInputs } from './commit-inputs.js';
import type { NativeCurrentWorldInstallation } from './store.js';
import { HostWork } from './host-work.js';
import { OverloadError, WorkLane } from './work-lane.js';
import { LIVE_SAVE_INTERVAL_MS, LIVE_SAVE_MAX_AGE_MS } from './pending-world-save.js';
import { WorldInputOwner } from './world-input.js';
import { permittedSourceHandle } from './entity-references.js';
import { driveNativeOperation } from './native-providers.js';

type Progress = NativePublication['progress'];
type OperationalSettings = {
  speed: number;
  manuallyPaused: boolean;
  presentationRelease?: AssetRevisionReference;
  presentationReleaseRevision?: number;
};
type PlayerContext = {
  readonly scope: string;
  readonly captured: NativePlayerCapture;
  readonly cut: LiveReadCuts;
};
type NativeOperationRequest = {
  actorId?: string;
  first: () => Promise<NativeWorldTurn>;
  current: () => boolean;
  receipts?: (outcome: Outcome) => readonly GameplayReceipt[];
  outcomes?: CommitInputs['outcomes'];
  signal?: AbortSignal;
};

/** The native handle owns gameplay and canonical rows. This service owns only
 * request authority, bounded scheduling, accepted publication products and the
 * existing ordered PostgreSQL writer. It never loads a TypeScript world. */
export class NativeWorldService implements NativePlayerRequestOwner {
  private readonly lane: WorkLane;
  private readonly projection: WorkLane;
  private readonly work = new HostWork(this);
  private readonly inputs: WorldInputOwner;
  private readonly reads = new AsyncLocalStorage<PlayerContext>();
  private readonly memoryReads = new AsyncLocalStorage<LiveReadCuts>();
  private readonly listeners = new Set<() => void>();
  private readonly pending: NativePendingSave;
  private readonly recent: NativeRecentRetention;
  private readonly geometry: ReturnType<NativeDefinitionCapture['geometry']>;
  private readonly milestones: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  private readonly profiles = new Map<string, Promise<GameView['profile']>>();
  private readonly receipts = new Map<string, GameplayReceipt>();
  private readonly receiptReaders = new Map<string, number>();
  private readonly durableReceipts = new Set<string>();
  private readonly inputLives = new Map<string, { life: number; alive: boolean }>();
  private readonly speechActors = new Map<string, string>();
  private readonly actorControllers = new Map<string, 'player' | 'npc'>();
  private readonly sourceEdits = new Map<string, () => void>();
  private readonly inventoryReads = new Map<
    string,
    {
      bindings: string;
      details: string;
      bindingRevision: number;
      detailRevision: number;
    }
  >();
  private nextReadRevision = 0;
  private readonly unsubscribers: (() => void)[] = [];
  private retained: NativeRetainedValues;
  private progress: Progress;
  private durableProgress: Progress;
  private privacy: ExperiencePrivacy;
  private epoch: CommandEpoch;
  private version = 0;
  private historyVersion = 0;
  private privacyEpoch = 0;
  private closed = false;
  private save?: Promise<void>;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private retentionTimer?: ReturnType<typeof setTimeout>;
  private retentionWakeAt?: number;
  private retentionTask?: Promise<void>;
  private failure?: Error;
  private protectedAdmission = false;
  private protectedHold?: NativeProtectedHold;
  private committedPrefix?: { readonly prefix: NativePendingPrefix; readonly revision: number };
  private playerInteractionAdmission?: (actorId: string) => boolean;

  private constructor(
    readonly store: SqlGameRepository,
    readonly config: AppConfig,
    readonly world: NativeWorld,
    readonly definitions: NativeDefinitionCapture,
    readonly installation: NativeCurrentWorldInstallation,
    readonly timelineId: string,
    private readonly operational: OperationalSettings,
    retained: NativeRetainedValues,
    progress: Progress,
    privacy: ExperiencePrivacy,
    epoch: CommandEpoch,
    milestones: Readonly<Record<string, Readonly<Record<string, boolean>>>>,
    controllers: readonly (readonly [string, 'player' | 'npc'])[],
    recentRows: readonly { readonly slot: string; readonly payload: string }[],
    private readonly now: () => number,
  ) {
    this.retained = retained;
    this.progress = progress;
    this.durableProgress = progress;
    this.privacy = privacy;
    this.epoch = epoch;
    this.milestones = milestones;
    for (const [id, controller] of controllers) this.actorControllers.set(id, controller);
    this.recent = new NativeRecentRetention(
      installation.worldId,
      selectedTemporalPolicy(definitions.facts.definitions).recent,
      recentRows,
    );
    this.geometry = definitions.geometry();
    this.lane = new WorkLane('native.mutation', config.capacity.requests);
    this.projection = new WorkLane('native.projection', config.capacity.requests);
    this.inputs = new WorldInputOwner(config.capacity.presence);
    this.pending = new NativePendingSave(store, {
      worldId: installation.worldId,
      generation: installation.generation,
      revision: installation.revision,
      acceptedCut: installation.acceptedCut,
      timeline: timelineId,
    });
  }

  /** Reopen only a real current-format scoped world. Creating the normal game
   * and converting unsupported families remain their separate factory owners. */
  static async open(options: {
    host: NativeHost;
    store: SqlGameRepository;
    config: AppConfig;
    now?: () => number;
  }): Promise<NativeWorldService> {
    const { store, config } = options;
    await store.ready;
    const source = await captureWorkingSources(store.records, DATABASE_SCHEMA);
    if (!source) throw new Error('Native opening requires an existing current-format world.');
    // The proof's request surface has no maintenance writer. A positive saved
    // schedule must not be presented as an absent hold or resumed silently.
    if (
      (await store.maintenance.load(source.records.worldId)).some(
        (window) => window.status === 'scheduled' || window.status === 'active',
      )
    )
      throw new Error('Native opening cannot yet execute an operational maintenance schedule.');
    const row = source.records.tables['data_world']?.find((value) => value.id === '[]');
    const owner = source.records.tables['world_player_accounts']?.[0];
    if (!row || !owner)
      throw new Error('Native opening requires its actual host and player owner.');
    const saved = JSON.parse(row.payload) as OperationalSettings;
    const header = JSON.parse(source.records.tables['world_settings']![0]!.payload) as {
      simTime: number;
      sequence: number;
      nextId: number;
      paused: boolean;
    };
    const operational = {
      speed: saved.speed,
      manuallyPaused: saved.manuallyPaused,
      ...(saved.presentationRelease ? { presentationRelease: saved.presentationRelease } : {}),
      ...(saved.presentationReleaseRevision === undefined
        ? {}
        : { presentationReleaseRevision: saved.presentationReleaseRevision }),
    };
    const world = await options.host.installWorld(
      Buffer.from(
        JSON.stringify({
          ...source,
          definitions: nativeDefinitionSources(source),
          settings: nativeSetupSettings,
          storage: nativeStorageSettings,
          layouts: nativeRecordLayouts(),
          acceptedCut: 0,
        }),
      ),
      DATABASE_SCHEMA,
    );
    let definitions: NativeDefinitionCapture | undefined;
    let service: NativeWorldService | undefined;
    try {
      const installation = decodeNativeProduct<NativeCurrentWorldInstallation>(
        await world.installation(),
      );
      definitions = await NativeDefinitionCapture.capture(world);
      const retained = await captureNativeRetainedValues(world);
      const storedTimeline = await store.getIntegration(`world-timeline:${installation.worldId}`);
      if (storedTimeline !== undefined && (typeof storedTimeline !== 'string' || !storedTimeline))
        throw new Error('The current world timeline is malformed.');
      const timeline = storedTimeline ?? randomUUID();
      if (storedTimeline === undefined)
        await store.putIntegration(`world-timeline:${installation.worldId}`, timeline);
      const priorEpoch = (await store.getIntegration(`command-epoch:${installation.worldId}`)) as
        | CommandEpoch
        | undefined;
      const epoch = {
        generation: (priorEpoch?.generation ?? 0) + 1,
        openedAt: (options.now ?? Date.now)(),
        token: randomUUID(),
      };
      if (!Number.isSafeInteger(epoch.generation)) throw new Error('Command epoch exhausted.');
      await store.putIntegration(`command-epoch:${installation.worldId}`, epoch);
      await store.commands.prune(installation.worldId, epoch.generation, epoch.openedAt);
      const privacy: ExperiencePrivacy = { forgotten: {}, corrections: {} };
      for (const table of ['mind_forgotten', 'mind_corrections'] as const) {
        const columns = Object.keys(RECORD_NODES.get(table)!.columns!);
        for (const row of source.records.tables[table] ?? []) {
          const actor = String(row.extra[columns.indexOf('actor_id')]);
          const id = String(row.extra[columns.indexOf('source_id')]);
          if (table === 'mind_forgotten') (privacy.forgotten[actor] ??= []).push(id);
          else
            (privacy.corrections[actor] ??= {})[id] = String(
              row.extra[columns.indexOf('correction_id')],
            );
        }
      }
      const ledger = readPrivacyLedger(
        await store.getIntegration(privacyLedgerKey(installation.worldId)),
      );
      if (ledger) assertPrivacyContinuation(privacy, ledger);
      const progress: Progress = {
        worldId: installation.worldId,
        generation: installation.generation,
        baseCut: installation.acceptedCut,
        throughCut: installation.acceptedCut,
        identityThrough: header.nextId,
        at: header.simTime,
        sequence: header.sequence,
        paused: header.paused,
      };
      const milestones = Object.fromEntries(
        (source.records.tables['actor_milestones'] ?? []).map((row) => [
          row.slot,
          JSON.parse(row.payload) as Record<string, boolean>,
        ]),
      );
      service = new NativeWorldService(
        store,
        config,
        world,
        definitions,
        installation,
        timeline,
        operational,
        retained,
        progress,
        privacy,
        epoch,
        milestones,
        (source.records.tables['sim_actors'] ?? []).map((row) => [
          (JSON.parse(row.parent) as string[]).at(-1)!,
          (JSON.parse(row.payload) as { controller: 'player' | 'npc' }).controller,
        ]),
        source.records.tables['mind_temporal_actors'] ?? [],
        options.now ?? Date.now,
      );
      const allocation = service.work.reserveAllocation(installation.workAllocation);
      const receipt = await store.adoptNativeCurrentWorld(installation, {
        liveReadCuts: () =>
          service!.memoryReads.getStore() ??
          service!.reads.getStore()?.cut ??
          service!.pending.liveReadCuts(),
        retainedValues: (worldId) =>
          worldId === installation.worldId ? service!.retained.ids : {},
        backgroundSearchAdmission: () => !service!.closed && !service!.failure,
      });
      await world.activate(JSON.stringify(receipt));
      allocation.commit();
      const initial = await captureNativeReadCut(world, owner.slot);
      service.progress = {
        worldId: initial.worldId,
        generation: initial.generation,
        baseCut: initial.acceptedCut,
        throughCut: initial.acceptedCut,
        identityThrough: initial.identityThrough,
        at: initial.at,
        sequence: initial.sequence,
        paused: initial.paused,
      };
      service.durableProgress = service.progress;
      service.unsubscribers.push(
        store.authority.subscribe(() => {
          service!.inputs.clear();
          service!.inputLives.clear();
          service!.notify(false);
        }),
      );
      service.unsubscribers.push(store.assets.subscribeAuthority(() => service!.notify(false)));
      service.unsubscribers.push(store.onProjection(() => service!.notify(false)));
      service.scheduleRecentRetention();
      return service;
    } catch (error) {
      service?.work.close();
      definitions?.release();
      world.closeAdmission();
      await world.finishStop().catch(() => undefined);
      throw error;
    }
  }

  get worldId(): string {
    return this.installation.worldId;
  }
  get generation(): string {
    return this.installation.generation;
  }
  get connectionLimit(): number {
    return this.config.capacity.connections;
  }
  get paused(): boolean {
    return this.progress.paused;
  }
  get commandEpoch(): string {
    return this.epoch.token;
  }
  get historyEpoch(): string {
    return `${this.generation}:${this.privacyEpoch}`;
  }
  get durable() {
    const cut = this.pending.durableMark();
    return {
      revision: cut.revision,
      generation: this.generation,
      sequence: cut.through,
      nextId: this.durableProgress.identityThrough,
      eventSequence: this.durableProgress.sequence,
      simTime: this.durableProgress.at,
    };
  }
  lifecycle() {
    return {
      generation: this.generation,
      historyEpoch: this.historyEpoch,
      assetAuthorityGeneration: this.store.assets.projectionGeneration,
      at: this.progress.at,
    };
  }
  currentScope(scope: RequestScope, capability: Capability = 'play', controlling = false): boolean {
    return (
      !this.closed &&
      scope.worldId === this.worldId &&
      scope.timelineId === this.timelineId &&
      this.store.authority.current(scope, capability, controlling, this.now())
    );
  }
  assertScope(scope: RequestScope, capability: Capability = 'play', controlling = false): void {
    if (!this.currentScope(scope, capability, controlling)) throw new AuthorityError('stale-scope');
  }
  requestScope(session: LoginSession, connectionId: string): Promise<RequestScope> {
    return this.store.authority.scope(session, this.worldId, this.timelineId, connectionId);
  }
  refreshScope(scope: RequestScope): RequestScope {
    this.assertScope(scope);
    return this.store.authority.refresh(scope, this.now());
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify(history: boolean): void {
    this.version++;
    if (history) this.historyVersion++;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* A connection observer cannot refuse accepted gameplay. */
      }
    }
  }
  async profileFor(scope: RequestScope): Promise<GameView['profile']> {
    this.assertScope(scope);
    let profile = this.profiles.get(scope.accountId);
    if (!profile) {
      while (this.profiles.size >= this.connectionLimit)
        this.profiles.delete(this.profiles.keys().next().value!);
      profile = this.store.getProfile(scope.accountId);
      this.profiles.set(scope.accountId, profile);
    }
    const value = await profile;
    this.assertScope(scope);
    return value;
  }
  presentationReleaseRevision(): number {
    return this.operational.presentationReleaseRevision ?? 0;
  }
  async presentationReleaseFor(scope: RequestScope): Promise<GameView['presentationRelease']> {
    this.assertScope(scope);
    const reference = this.operational.presentationRelease;
    if (!reference) return undefined;
    const allowed = await this.store.assets.mayRead(reference, { accountId: scope.accountId });
    this.assertScope(scope);
    return allowed ? reference : undefined;
  }
  speechEventActor(id: string): string | undefined {
    return this.speechActors.get(id);
  }

  /** One native mental capture and its actual pending SQL overlay are acquired
   * together. Callers retain this finite read owner through context preparation. */
  captureNpc(actorId: string, requiredAppraisals: readonly AppraisalScope[]) {
    return this.lane.run(async () => {
      this.assertAdmission();
      const capture = await NativeNpcCapture.capture(this.world, actorId, requiredAppraisals);
      try {
        const cut = nativeScopedReadCut(
          await captureNativeReadCut(this.world, actorId),
          this.pending.liveReadCuts(),
        );
        if (capture.facts.self.acceptedCut !== cut.sequence) throw new ViewChangedError();
        return { capture, cut };
      } catch (error) {
        capture.release();
        throw error;
      }
    });
  }

  /** Memory repositories select only their scoped SQL/pending rows. This
   * context is separate from embodied player reads and grants no player scope. */
  withMemoryRead<T>(cut: LiveReadCuts, operation: () => Promise<T>): Promise<T> {
    if (
      cut.worldId !== this.worldId ||
      cut.generation !== this.generation ||
      cut.timeline !== this.timelineId ||
      !this.store.db.readAtCut ||
      !this.store.db.readTransaction
    )
      throw new Error('Native memory read has no current scoped SQL owner.');
    return this.memoryReads.run(cut, () =>
      this.store.db.readAtCut!(cut, () => this.store.db.readTransaction!(operation)),
    );
  }

  setPlayerInteractionAdmission(admit: (actorId: string) => boolean): () => void {
    this.playerInteractionAdmission = admit;
    return () => {
      if (this.playerInteractionAdmission === admit) this.playerInteractionAdmission = undefined;
    };
  }

  playerInteractionAvailability(
    mode: 'speak' | 'act',
    targetId: string | undefined,
    scope: RequestScope,
  ) {
    return playerInteractionAvailability({
      mode,
      config: this.config,
      read: () => this.lane.run(() => this.interactionFacts(mode, targetId, scope)),
      budgetAvailable: (actor, allowance, ceiling) =>
        this.store.budgetAvailable(actor, allowance, ceiling),
      admit: (actor) => this.playerInteractionAdmission?.(actor) ?? true,
    });
  }

  private async interactionFacts(
    mode: 'speak' | 'act',
    targetId: string | undefined,
    scope: RequestScope,
    existing?: NativePlayerCapture,
  ) {
    this.assertScope(scope);
    const capture =
      existing ??
      (await NativePlayerCapture.capture(this.world, scope, PLAYER_EVENT_WINDOW, this.geometry));
    try {
      const target =
        targetId && !existing
          ? nativePlayerCommandReferences(scope, { type: 'say', targetId }, capture.facts).targetId
          : targetId;
      const facts = await capture.interaction(mode, target);
      return {
        ...facts,
        controlling: this.currentScope(scope, 'play', true),
        paused: this.paused,
        pauseReason: this.pauseReason,
      };
    } finally {
      if (!existing) capture.release();
    }
  }

  get pauseReason(): 'manual' | 'away' | 'storage' | 'maintenance' | null {
    return this.failure
      ? 'storage'
      : this.paused
        ? this.operational.manuallyPaused
          ? 'manual'
          : 'away'
        : null;
  }

  private assertAdmission(protectedOwner = false): void {
    if (this.closed) throw new Error('Native world admission is closed.');
    if (this.failure) throw this.failure;
    if (this.protectedAdmission && !protectedOwner) throw new OverloadError();
    if (
      this.pending.oldestAcceptedAt !== undefined &&
      performance.now() - this.pending.oldestAcceptedAt >= LIVE_SAVE_MAX_AGE_MS
    )
      throw new OverloadError();
    this.store.assertWriteAdmission();
  }

  mayInspectPrivate(actorId: string, scope: RequestScope): boolean {
    return (
      this.currentScope(scope) &&
      this.actorControllers.has(actorId) &&
      (actorId === scope.actorId ||
        (this.actorControllers.get(actorId) !== 'player' && this.currentScope(scope, 'inspect')))
    );
  }

  /** The private native candidate and its full packed SQL prefix stay held
   * through the database result. This also owns the ordinary-save barrier. */
  private async protectedOperation(request: {
    readonly scope: RequestScope;
    readonly capability: Capability;
    readonly actorId?: string;
    readonly first: () => Promise<NativeWorldTurn>;
    readonly current: () => boolean;
    readonly operationalChange?: () => Promise<void>;
    readonly accepted?: () => void;
    readonly signal?: AbortSignal;
  }): Promise<NativePublication> {
    await this.lane.run(() => {
      this.assertAdmission();
      this.assertScope(request.scope, request.capability);
      this.protectedAdmission = true;
    });
    let accepted = false;
    try {
      // No newer operation may enter between this prefix and the protected
      // candidate. Previously accepted work remains owned by its exact writer.
      await this.flush();
      return await this.lane.run(async () => {
        this.assertAdmission(true);
        this.assertScope(request.scope, request.capability);
        const live = this.pending.liveReadCuts();
        const before = request.actorId
          ? nativeScopedReadCut(await captureNativeReadCut(this.world, request.actorId), live)
          : live;
        const result = await acceptProtectedNativeOperation({
          world: this.world,
          first: await request.first(),
          geometry: this.geometry,
          work: this.work,
          current: () => !this.closed && request.current(),
          signal: request.signal,
          history: { db: this.store.db, liveReadCuts: () => before },
          stage: async (publication) => {
            const change = publication.privacyChange;
            const privacy: ExperiencePrivacy = change
              ? {
                  forgotten: { ...this.privacy.forgotten, [change.actorId]: [...change.forgotten] },
                  corrections: {
                    ...this.privacy.corrections,
                    [change.actorId]: { ...change.corrections },
                  },
                }
              : this.privacy;
            assertPrivacyContinuation(privacy, this.privacy);
            const changes = nativeRecordChanges(publication.records);
            const versions = await prepareNativeSourceVersionPlan(
              this.store.db,
              publication.history,
              changes,
              publication.personalPredecessors,
              before,
            );
            const history = await nativePrivateHistory(
              publication,
              this.privacy,
              privacy,
              this.store.db,
              before,
            );
            const prepared = this.pending.prepareProtected(publication, versions, history, privacy);
            return { prepared, privacy, retain: this.recent.prepare(publication.records) };
          },
          commit: async ({ prepared }) => {
            const prefix = prepared.prefix;
            try {
              const saved = await this.store.commitCaptured(
                prefix.cut.baseRevision,
                prefix.inputs,
                {
                  generation: prefix.cut.generation,
                  through: prefix.cut.throughCut,
                  authority: {
                    scope: request.scope,
                    capability: request.capability,
                    controlling: false,
                    now: this.now,
                  },
                  operationalChange: request.operationalChange,
                },
              );
              this.committedPrefix = { prefix, revision: saved.revision };
            } catch (error) {
              if (postgresTransactionOutcome(error) === 'committed')
                this.committedPrefix = { prefix, revision: prefix.cut.baseRevision + 1 };
              throw error;
            }
          },
          accept: ({ prepared, privacy, retain }) => {
            prepared.accept();
            retain();
            accepted = true;
            this.progress = prepared.value.publication.progress;
            this.privacy = privacy;
            request.accepted?.();
          },
          park: (hold, error) => {
            this.protectedHold = hold;
            this.failure = error instanceof Error ? error : new Error(String(error));
          },
        });
        if (result.staged) {
          await this.acknowledgeCommitted();
          if (result.publication.privacyChange) this.privacyEpoch++;
          this.notify(result.publication.events.length !== 0);
          this.scheduleRecentRetention();
        } else if (result.publication.protectedSave) throw new AuthorityError('stale-scope');
        return result.publication;
      });
    } catch (error) {
      if (accepted || this.protectedHold)
        this.failure = error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      if (!this.protectedHold) this.protectedAdmission = false;
    }
  }
  private async refreshValues(): Promise<void> {
    const retained = await captureNativeRetainedValues(this.world);
    if (
      retained.worldId !== this.worldId ||
      retained.generation !== this.generation ||
      retained.acceptedCut !== this.pending.through
    )
      throw new Error('Native value protection snapshot belongs to a different accepted cut.');
    this.retained = retained;
  }
  private async refreshCommandEpoch(): Promise<void> {
    if (this.now() - this.epoch.openedAt < COMMAND_RETRY_MS) return;
    const next = {
      generation: this.epoch.generation + 1,
      openedAt: this.now(),
      token: randomUUID(),
    };
    if (!Number.isSafeInteger(next.generation)) throw new Error('Command epoch exhausted.');
    await this.store.putIntegration(`command-epoch:${this.worldId}`, next);
    this.epoch = next;
    await this.store.commands.prune(this.worldId, next.generation, this.now());
    this.notify(false);
  }

  /** Internal NPC/command callers submit their real bound cursor, not effects.
   * The current callback must retain its original authority/source/input epoch. */
  acceptOperation(request: NativeOperationRequest): Promise<NativePublication | undefined> {
    return this.lane.run(() => this.acceptInLane(request));
  }
  private async acceptInLane(
    request: NativeOperationRequest,
  ): Promise<NativePublication | undefined> {
    this.assertAdmission();
    const live = this.pending.liveReadCuts();
    const before = request.actorId
      ? nativeScopedReadCut(await captureNativeReadCut(this.world, request.actorId), live)
      : live;
    const accepted = await acceptNativeOperation({
      world: this.world,
      first: await request.first(),
      geometry: this.geometry,
      work: this.work,
      current: () => !this.closed && !this.failure && request.current(),
      signal: request.signal,
      history: { db: this.store.db, liveReadCuts: () => before },
      stage: async (publication) => {
        if (publication.privacyChange)
          throw new Error('A private edit requires its protected durable acceptance owner.');
        const changes = nativeRecordChanges(publication.records);
        const versions = await prepareNativeSourceVersionPlan(
          this.store.db,
          publication.history,
          changes,
          publication.personalPredecessors,
          before,
        );
        const pending = this.pending.prepare(
          publication,
          versions,
          request.receipts?.(publication.outcome),
          request.outcomes,
        );
        const lives: [string, { life: number; alive: boolean } | undefined][] = [];
        const controllers: [string, 'player' | 'npc' | undefined][] = [];
        for (const row of publication.records.writes['sim_actors'] ?? []) {
          const actorId = (JSON.parse(row.parent) as string[]).at(-1)!;
          const actor = JSON.parse(row.payload) as {
            physicalLife?: number;
            alive: boolean;
            controller: 'player' | 'npc';
          };
          controllers.push([actorId, actor.controller]);
          if (this.inputLives.has(actorId))
            lives.push([actorId, { life: actor.physicalLife ?? 0, alive: actor.alive }]);
        }
        for (const id of publication.records.deletes['sim_entities'] ?? []) {
          const actorId = (JSON.parse(id) as string[]).at(-1)!;
          if (this.inputLives.has(actorId)) lives.push([actorId, undefined]);
          controllers.push([actorId, undefined]);
        }
        return { ...pending, lives, controllers, retain: this.recent.prepare(publication.records) };
      },
    });
    if (!accepted.accepted) return undefined;
    const publication = accepted.value.value.publication;
    try {
      accepted.value.accept();
      accepted.value.retain();
      this.progress = publication.progress;
      for (const [id, controller] of accepted.value.controllers)
        if (controller) this.actorControllers.set(id, controller);
        else this.actorControllers.delete(id);
      for (const [id, after] of accepted.value.lives) {
        const before = this.inputLives.get(id);
        if (!after || after.life !== before?.life || after.alive !== before.alive)
          this.inputs.clear(id);
        if (after) this.inputLives.set(id, after);
        else this.inputLives.delete(id);
      }
    } catch (error) {
      this.failure = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
    for (const event of publication.events)
      if (event.actorId) this.speechActors.set(event.id, event.actorId);
    while (this.speechActors.size > PLAYER_EVENT_WINDOW * this.connectionLimit)
      this.speechActors.delete(this.speechActors.keys().next().value!);
    try {
      await this.refreshValues();
    } catch (error) {
      this.failure = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
    this.notify(publication.events.length !== 0);
    this.scheduleSave();
    this.scheduleRecentRetention();
    return publication;
  }

  async forgetMemory(
    actorId: string,
    sourceId: string,
    scope: RequestScope,
    signal?: AbortSignal,
  ): Promise<ApiResult> {
    if (!this.config.godMode || !this.mayInspectPrivate(actorId, scope))
      throw new AuthorityError('forbidden');
    this.assertScope(scope, 'create');
    const key = JSON.stringify([this.worldId, this.generation, actorId, sourceId]);
    let release = this.sourceEdits.get(key);
    const previousDenial = !!release;
    if (!release) {
      if (this.sourceEdits.size >= SOURCE_EDIT_PREPARATION_CAPACITY) throw new OverloadError();
      release = this.store.memories.beginSourceEdit(this.worldId, [actorId]);
      this.sourceEdits.set(key, release);
    }
    try {
      const publication = await this.protectedOperation({
        scope,
        capability: 'create',
        actorId,
        current: () => this.currentScope(scope, 'create') && this.mayInspectPrivate(actorId, scope),
        first: () => this.world.forget(Buffer.from(JSON.stringify({ actorId, sourceId }))),
        signal,
      });
      if (publication.outcome.ok || !previousDenial) {
        release();
        this.sourceEdits.delete(key);
      }
      return publication.outcome;
    } catch (error) {
      // Failed dependency/SQL work retains the actual actor disclosure denial.
      // A new explicit retry of this identity reuses the same denial handle.
      throw error;
    }
  }

  /** Recovery precedes target preparation: a lost body lease cannot turn an
   * already accepted request into a second execution with another target. */
  async command(
    commandId: string,
    input: CommandInput,
    epoch: string,
    scope: RequestScope,
    signal?: AbortSignal,
  ): Promise<ApiResult> {
    this.assertScope(scope, 'play', true);
    if (commandId.startsWith('gameplay:'))
      return {
        ok: false,
        code: 'invalid-command',
        message: 'Command IDs cannot use the reserved gameplay namespace.',
      };
    const id = `gameplay:${scope.accountId}:${epoch}:${digest(commandId)}`;
    const fingerprint = digest({ actor: scope.actorId, input, scope });
    const readers = this.receiptReaders.get(id) ?? 0;
    if (!readers && this.receiptReaders.size >= this.config.capacity.requests)
      throw new OverloadError();
    this.receiptReaders.set(id, readers + 1);
    try {
      const selected = this.receipts.get(id) ?? (await this.store.commands.get(this.worldId, id));
      return await this.lane.run(async () => {
        this.assertAdmission();
        this.assertScope(scope, 'play', true);
        await this.refreshCommandEpoch();
        const prior = this.receipts.get(id) ?? selected;
        if (prior) {
          if (this.now() >= prior.expiresAt)
            return {
              ok: false,
              code: 'expired',
              message: 'This command retry window has expired.',
            };
          return prior.fingerprint === fingerprint
            ? prior.result
            : {
                ok: false,
                code: 'idempotency-conflict',
                message: 'That command ID was used for different input.',
              };
        }
        if (epoch !== this.commandEpoch)
          return {
            ok: false,
            code: 'expired',
            message: 'This command epoch has closed. Refresh before issuing a new action.',
          };
        const captured = await NativePlayerCapture.capture(
          this.world,
          scope,
          PLAYER_EVENT_WINDOW,
          this.geometry,
        );
        try {
          const resolved = nativePlayerCommandReferences(scope, input, captured.facts);
          // These additional request families require their actual binders;
          // the plain factory may not silently drop an executable proposal.
          if (
            input.execution ||
            input.primaryAction ||
            input.knownPlace ||
            input.aimPoint ||
            input.aimBasis
          )
            throw new Error('The selected native command requires an unconverted request binder.');
          const command = ordinaryPlayerCommand(resolved, {
            id,
            actorId: scope.actorId,
            humanInitiated: true,
            ...(input.purpose ? { purpose: input.purpose } : {}),
            ...(input.autoEquip ? { autoEquip: true } : {}),
            ...(input.combatHelpId ? { combatHelpId: input.combatHelpId } : {}),
            ...(input.cooperation ? { cooperation: input.cooperation } : {}),
          });
          if (!command) throw new Error('This command family has no native proof executor.');
          if ('ok' in command) return command;
          if (command.type === 'say') {
            const available = await playerInteractionAvailability({
              mode: 'speak',
              config: this.config,
              read: () => this.interactionFacts('speak', command.targetId, scope, captured),
              budgetAvailable: (actor, allowance, ceiling) =>
                this.store.budgetAvailable(actor, allowance, ceiling),
              admit: (actor) => this.playerInteractionAdmission?.(actor) ?? true,
            });
            if (!available.available)
              return { ok: false, code: available.code, message: available.reason! };
          }
          let receipt: GameplayReceipt | undefined;
          const publication = await this.acceptInLane({
            actorId: scope.actorId,
            first: () =>
              this.world.command(
                Buffer.from(JSON.stringify(command)),
                Buffer.from(canonicalJson(command)),
                false,
              ),
            current: () => this.currentScope(scope, 'play', true) && epoch === this.commandEpoch,
            signal,
            receipts: (outcome) => {
              receipt = {
                id,
                epoch: this.epoch.generation,
                fingerprint,
                recoveryFingerprint: commandRecoveryFingerprint(input, scope),
                result: outcome,
                expiresAt: this.now() + COMMAND_RETRY_MS,
              };
              return [receipt];
            },
          });
          if (!publication) throw new AuthorityError('stale-scope');
          if (receipt) this.receipts.set(id, receipt);
          return publication.outcome;
        } finally {
          captured.release();
        }
      });
    } finally {
      const remaining = this.receiptReaders.get(id)! - 1;
      if (remaining) this.receiptReaders.set(id, remaining);
      else this.receiptReaders.delete(id);
      this.pruneReceipts();
    }
  }

  private pruneReceipts(): void {
    if (this.receipts.size <= COMMAND_RECEIPT_CACHE_ENTRIES) return;
    for (const id of this.durableReceipts) {
      if (this.receipts.size <= COMMAND_RECEIPT_CACHE_ENTRIES) break;
      if (this.receiptReaders.has(id)) continue;
      this.receipts.delete(id);
      this.durableReceipts.delete(id);
    }
  }

  /** An explicit admitted duration remains independent from wall-clock/UI
   * polling. The host's clock runner supplies actual leased input intervals. */
  advance(
    seconds: number,
    maximumIntervals: number,
    signal?: AbortSignal,
  ): Promise<NativePublication | undefined> {
    return this.lane.run(async () => {
      this.assertAdmission();
      const inputs = this.inputs.inputs(performance.now());
      return this.acceptInLane({
        first: () =>
          this.world.advance(seconds, maximumIntervals, Buffer.from(JSON.stringify(inputs))),
        current: () => this.inputs.authorized(inputs, performance.now()),
        signal,
      });
    });
  }

  /** Capture SQL's actual accepted overlay and the native disclosure token in
   * one mutation-lane turn. Async formatting then leaves that lane available. */
  async publishPlayer(
    scope: RequestScope,
    publish: NativePlayerViewRequest['publish'],
    execution: Pick<NativePlayerViewRequest, 'executionSource' | 'jevConfigured' | 'llmConfigured'>,
  ): Promise<void> {
    await this.projection.run(async () => {
      for (let attempt = 0; ; attempt++) {
        const context = await this.lane.run(async () => {
          this.assertScope(scope);
          const captured = await NativePlayerCapture.capture(
            this.world,
            scope,
            PLAYER_EVENT_WINDOW,
            this.geometry,
          );
          try {
            const cut = nativeScopedReadCut(
              await captureNativeReadCut(this.world, scope.actorId),
              this.pending.liveReadCuts(),
            );
            if (captured.facts.self.acceptedCut !== cut.sequence) throw new ViewChangedError();
            return { scope: scopeKey(scope), captured, cut };
          } catch (error) {
            captured.release();
            throw error;
          }
        });
        try {
          await this.reads.run(context, () =>
            projectNativePlayerView({
              owner: this,
              scope,
              definitions: this.definitions.player(scope.actorId),
              map: this.definitions.facts.geometry,
              store: this.store,
              practiceLoader: (ids) => {
                if (!this.store.db.readAtCut || !this.store.db.readTransaction)
                  throw new Error('Native practice reads require their actual accepted SQL cut.');
                return this.store.db.readAtCut(context.cut, () =>
                  this.store.db.readTransaction!(() =>
                    this.store.records.activityPage(this.worldId, scope.actorId, -1, ids),
                  ),
                );
              },
              budgetUsd: this.config.budgetUsd,
              ...execution,
              publish,
            }),
          );
          return;
        } catch (error) {
          if (!(error instanceof ViewChangedError) || attempt !== 0) throw error;
          this.assertScope(scope);
        } finally {
          context.captured.release();
        }
      }
    });
  }

  async capture(scope: RequestScope): Promise<NativePlayerRead> {
    this.assertScope(scope);
    const context = this.reads.getStore();
    if (!context || context.scope !== scopeKey(scope))
      throw new Error('Native player projection requires its scoped accepted read owner.');
    const capture = context.captured,
      facts = capture.facts,
      self = facts.self;
    const controlling = this.currentScope(scope, 'play', true);
    const lifecycle = this.lifecycle();
    const life = self.physicalLife ?? 0,
      alive = self.alive;
    const inputIdentity = digest({
      scope,
      generation: this.generation,
      life: self.physicalLife,
      alive: self.alive,
      paused: this.paused,
    });
    const lifecyclePause = this.paused;
    const input = this.inputs.state(
      scope.actorId,
      inputIdentity,
      () =>
        this.currentScope(scope, 'play', true) &&
        this.generation === lifecycle.generation &&
        this.paused === lifecyclePause &&
        this.inputLives.get(scope.actorId)?.life === life &&
        this.inputLives.get(scope.actorId)?.alive === alive,
    );
    if (
      !this.inputLives.has(scope.actorId) &&
      this.inputLives.size >= this.config.capacity.presence
    )
      for (const id of this.inputLives.keys()) if (!this.inputs.has(id)) this.inputLives.delete(id);
    this.inputLives.set(scope.actorId, { life, alive });
    for (const account of facts.events.accounts)
      if (account.authoredBySelf) this.speechActors.set(account.original.id, scope.actorId);
    while (this.speechActors.size > PLAYER_EVENT_WINDOW * this.connectionLimit)
      this.speechActors.delete(this.speechActors.keys().next().value!);
    const bindingKey = canonicalJson([
      self.player.inventoryRevision,
      self.player.body,
      self.player.equipped,
    ]);
    const detailKey = canonicalJson([
      self.position,
      self.heading,
      self.attributes,
      self.statusEffects,
      self.action,
      self.player.body,
      self.player.knowledgeRevision,
      self.alive,
      self.incapacitated,
      this.paused,
    ]);
    let inventory = this.inventoryReads.get(scopeKey(scope));
    const revision = () => {
      if (!Number.isSafeInteger(this.nextReadRevision + 1))
        throw new Error('Player read revision exhausted.');
      return ++this.nextReadRevision;
    };
    if (!inventory) {
      while (this.inventoryReads.size >= this.connectionLimit)
        this.inventoryReads.delete(this.inventoryReads.keys().next().value!);
      inventory = {
        bindings: bindingKey,
        details: detailKey,
        bindingRevision: revision(),
        detailRevision: revision(),
      };
      this.inventoryReads.set(scopeKey(scope), inventory);
    } else {
      if (inventory.bindings !== bindingKey) {
        inventory.bindings = bindingKey;
        inventory.bindingRevision = revision();
      }
      if (inventory.details !== detailKey) {
        inventory.details = detailKey;
        inventory.detailRevision = revision();
      }
    }
    const definitions = this.definitions.player(scope.actorId);
    const installed = this.definitions.facts.definitions;
    const canManageSaves = this.currentScope(scope, 'save');
    return {
      ...facts,
      lifecycle,
      host: {
        revision: this.version,
        ...(canManageSaves
          ? {
              checkpoint: {
                scope: scopeKey(scope),
                recoveryScope: checkpointRecoveryScopeKey(scope),
                timeline: this.timelineId,
              },
            }
          : {}),
        access: {
          scope: scopeKey(scope),
          privateDraftScope: privateDraftScopeKey(scope),
          commandRecoveryScope: commandRecoveryScopeKey(scope),
          canManageSaves,
          accountId: scope.accountId,
          actorId: scope.actorId,
          controlGeneration: scope.controlGeneration,
          controlling,
          controlledElsewhere:
            !controlling && !!this.store.authority.currentController(scope, this.now()),
          canOperate:
            this.currentScope(scope, 'create') || this.currentScope(scope, 'manage-access'),
          mode: this.config.authentication.mode,
        },
        maintenance: null,
        worldEventsRevision: `${this.generation}:${this.historyVersion}:${this.privacyEpoch}`,
        historyRevision: `${this.generation}:${this.historyVersion}`,
        historyEpoch: this.historyEpoch,
        saveTimeline: this.timelineId,
        commandEpoch: this.commandEpoch,
        milestones: selectedPlaytestMilestoneRules({ profile: definitions.profile }).map(
          (value) => ({ ...value, done: this.milestones[scope.actorId]?.[value.id] === true }),
        ),
        persistence: {
          status: this.failure ? 'error' : 'saved',
          message: this.failure?.message ?? 'Saved locally; the world pauses when you leave',
        },
      },
      clock: {
        speed: this.operational.speed,
        baseRatio: this.config.baseRatio,
        paused: this.paused,
        pauseReason: this.failure
          ? 'storage'
          : this.paused
            ? this.operational.manuallyPaused
              ? 'manual'
              : 'away'
            : null,
      },
      player: {
        memoryRevision: JSON.stringify([
          this.historyEpoch,
          this.store.memories.actorRevision(scope.actorId),
        ]),
        inventoryReadRevision: {
          bindings: inventory.bindingRevision,
          details: inventory.detailRevision,
          disclosure: permittedSourceHandle({ id: this.worldId }, scope.actorId, [
            'inventory-disclosure',
            undefined,
            facts.events.privacyRevision,
            this.historyEpoch,
          ]),
        },
        constructionRevision:
          !installed.hearthDefinitions && !installed.constructionProfile
            ? undefined
            : digest([
                installed.hearthDefinitions,
                installed.constructionProfile,
                this.store.authority
                  .constructionPermissions(this.worldId)
                  .filter((permission) => permission.actorId === scope.actorId)
                  .map(({ id, revision, revoked }) => [id, revision, revoked]),
              ]),
        inputScope: { ...input.scope },
      },
      placesRevision: this.store.memories.knownPlacesRevision(scope.actorId),
      telemetryRevision: this.version,
      controlling,
      freshWorldReview: !!(
        self.player.pendingDeath &&
        definitions.bodyPolicy?.reincarnation &&
        this.config.godMode &&
        this.currentScope(scope, 'create') &&
        this.currentScope(scope, 'inspect') &&
        selectedCreationProfileForWorld({ profile: definitions.profile }).recoveryOpeningId &&
        this.config.creation.installationId &&
        this.config.creation.targets.some((target) =>
          target.allowedCreatorAccountIds.includes(scope.accountId),
        )
      ),
      // The selected installer refuses positive item/construction contribution
      // ownership; no withdrawal exists in this accepted physical family.
      withdrawals: [],
      publishIfPermitted: (ids, complete, current) =>
        this.lane.run(() =>
          capture.publishIfPermitted(
            ids,
            complete,
            () => ({ paused: this.paused, controlling: this.currentScope(scope, 'play', true) }),
            () =>
              this.currentScope(scope) &&
              !this.store.memories.sourceEditPending({
                worldId: this.worldId,
                actorId: scope.actorId,
              }) &&
              current(),
          ),
        ),
      release: () => capture.release(),
    };
  }

  async previewPausedStop(scope: RequestScope): Promise<{ ok: boolean; message: string }> {
    return this.lane.run(async () => {
      this.assertScope(scope);
      const command = {
        id: randomUUID(),
        actorId: scope.actorId,
        humanInitiated: true,
        type: 'cancel',
      };
      const turn = await driveNativeOperation(
        this.world,
        await this.world.command(
          Buffer.from(JSON.stringify(command)),
          Buffer.from(canonicalJson(command)),
          true,
        ),
        this.geometry,
      );
      if (turn.kind !== 'preview' || !turn.preview)
        throw new Error('Native Stop preview did not close through its real rollback.');
      this.assertScope(scope);
      return decodeNativeProduct<Outcome>(turn.preview);
    });
  }

  private scheduleSave(): void {
    if (this.saveTimer || this.save || this.closed || this.failure) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      void this.flush().catch(() => this.notify(false));
    }, LIVE_SAVE_INTERVAL_MS);
    this.saveTimer.unref();
  }

  private scheduleRecentRetention(): void {
    const at = this.recent.at;
    if (
      at === undefined ||
      this.retentionTask ||
      this.closed ||
      this.failure ||
      this.paused ||
      this.protectedAdmission
    ) {
      clearTimeout(this.retentionTimer);
      this.retentionTimer = undefined;
      this.retentionWakeAt = undefined;
      return;
    }
    const wake =
      performance.now() +
      Math.max(
        RETENTION_MIN_DELAY_MS,
        ((at - this.progress.at) * 1000) / (this.config.baseRatio * this.operational.speed),
      );
    if (this.retentionTimer && this.retentionWakeAt !== undefined && this.retentionWakeAt <= wake)
      return;
    clearTimeout(this.retentionTimer);
    this.retentionWakeAt = wake;
    this.retentionTimer = setTimeout(
      () => {
        this.retentionTimer = undefined;
        this.retentionWakeAt = undefined;
        this.retentionTask = this.lane
          .run(
            async () => {
              if (this.closed || this.failure || this.paused || this.protectedAdmission) return;
              const actorIds = this.recent.actors(this.progress.at);
              if (actorIds.length)
                await this.acceptInLane({
                  first: () =>
                    this.world.beginRecentRetention(Buffer.from(JSON.stringify({ actorIds }))),
                  current: () => !this.closed && !this.failure && !this.paused,
                });
            },
            this.lane.waitMs,
            true,
          )
          .catch((error: unknown) => {
            if (!(error instanceof OverloadError))
              console.error('Native recent retention failed.', error);
          })
          .finally(() => {
            this.retentionTask = undefined;
            this.scheduleRecentRetention();
          });
      },
      Math.max(0, wake - performance.now()),
    );
    this.retentionTimer.unref();
  }
  /** The exact captured prefix survives SQL failure. No acknowledgement ever
   * includes the newer suffix accepted while its transaction was in flight. */
  async flush(): Promise<void> {
    if (this.save) return this.save;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
    if (this.failure && !this.committedPrefix) throw this.failure;
    this.save = (async () => {
      const prefix = await this.lane.run(async () => {
        if (this.committedPrefix) return this.committedPrefix.prefix;
        if (this.pending.inFlight) return this.pending.inFlight;
        if (!this.pending.dirty) return undefined;
        const save = await this.world.captureSave();
        return this.pending.capture(save, decodeNativeProduct(await save.rows()), this.privacy);
      });
      if (!prefix) return;
      if (!this.committedPrefix) {
        try {
          const saved = await this.store.commitCaptured(prefix.cut.baseRevision, prefix.inputs, {
            generation: prefix.cut.generation,
            through: prefix.cut.throughCut,
            receipts: prefix.receipts,
          });
          this.committedPrefix = { prefix, revision: saved.revision };
        } catch (error) {
          if (postgresTransactionOutcome(error) === 'committed')
            this.committedPrefix = { prefix, revision: prefix.cut.baseRevision + 1 };
          throw error;
        }
      }
      await this.lane.run(async () => {
        await this.acknowledgeCommitted();
        this.notify(false);
      });
    })()
      .catch((error: unknown) => {
        this.failure = error instanceof Error ? error : new Error(String(error));
        throw error;
      })
      .finally(() => {
        this.save = undefined;
        if (this.pending.dirty) this.scheduleSave();
      });
    return this.save;
  }

  private async acknowledgeCommitted(): Promise<void> {
    const committed = this.committedPrefix;
    if (!committed) throw new Error('Native acknowledgement has no confirmed SQL prefix.');
    const { prefix, revision } = committed;
    await this.world.acknowledge(
      JSON.stringify({
        worldId: prefix.cut.worldId,
        generation: prefix.cut.generation,
        prefix: prefix.cut.prefix,
        baseRevision: prefix.cut.baseRevision,
        revision,
        throughCut: prefix.cut.throughCut,
        identityThrough: prefix.cut.identityThrough,
      }),
    );
    this.pending.acknowledge(prefix, revision);
    this.committedPrefix = undefined;
    this.durableProgress = prefix.progress;
    for (const receipt of prefix.receipts) this.durableReceipts.add(receipt.id);
    this.pruneReceipts();
    await this.refreshValues();
  }
}
