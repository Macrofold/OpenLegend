import { NativeNpcIntake } from './native-npc-intake.js';
import {
  decisionClaimCurrentFromRead,
  finishDecisionPublicationFromRead,
  type DecisionPublication,
  type DecisionClaimFacts,
} from './decision-publication.js';
import { decisionPolicyDigest } from './decision-task.js';
import { DecisionClaimLost } from './decision-state.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type {
  NativeHost,
  NativeWorld,
  NativeWorldTurn,
  NativeWorldNpcResponseTicket,
} from '@open-legend/native-simulation';
import {
  canonicalJson,
  namePhrase,
  selectedCreationProfileForWorld,
  selectedPlaytestMilestoneRules,
  selectedTemporalPolicy,
  type ExperiencePrivacy,
  type AppraisalScope,
  type Outcome,
  type ActorResponse,
  type WorldState,
  type SpeechVolume,
  type Awareness,
  heardAddressedSpeech,
} from '@open-legend/domain';
import { nativeSetupSettings } from '@open-legend/domain/native-install';
import type {
  ApiResult,
  CommandInput,
  CommandReceiptResult,
  GameView,
  WorldInputUpdate,
  WorldInputResult,
} from '@open-legend/protocol';
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
  type ExitAttempt,
  type ControlRequest,
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
import { CheckpointBusyError, GameSaveError } from './game-saves.js';
import { NativePlayerCapture } from './native-player-capture.js';
import { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeNpcSourceSelection } from './native-npc-sources.js';
import { NativeRecentRetention } from './native-retention.js';
import { readNativeTemporalTail } from './native-temporal-tail.js';
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
import { NativeRestorePreparation } from './native-restore-operation.js';
import type { NativeWorldAdoption } from './store.js';
import { checkpointPrivacy } from './native-restore.js';
import { NativeActorRoster } from './native-actor-roster.js';
import { worldSpeedRefusal, worldControlOutcome } from './world-control-outcome.js';

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
  outcomes?:
    | CommitInputs['outcomes']
    | ((publication: NativePublication) => CommitInputs['outcomes']);
  signal?: AbortSignal;
  admitPublication?: (publication: NativePublication) => boolean;
};

/** The native handle owns gameplay and canonical rows. This service owns only
 * request authority, bounded scheduling, accepted publication products and the
 * existing ordered PostgreSQL writer. It never loads a TypeScript world. */
export class NativeWorldService implements NativePlayerRequestOwner {
  readonly worldId: string;
  private storageGeneration: string;
  private nativeWorld: NativeWorld;
  private nativeDefinitions: NativeDefinitionCapture;
  private timeline: string;
  localSessionToken = '';
  private readonly lane: WorkLane;
  private readonly projection: WorkLane;
  private readonly work = new HostWork(this);
  private readonly inputs: WorldInputOwner;
  private readonly reads = new AsyncLocalStorage<PlayerContext>();
  private readonly memoryReads = new AsyncLocalStorage<LiveReadCuts>();
  private readonly listeners = new Set<() => void>();
  private readonly publicationContext = new AsyncLocalStorage<{ active: boolean }>();
  private readonly publicationListeners = new Set<(publication: NativePublication) => void>();
  private pending: NativePendingSave;
  private recent: NativeRecentRetention;
  private provider?: ReturnType<NativeDefinitionCapture['geometry']>;
  private milestones: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  private readonly profiles = new Map<string, Promise<GameView['profile']>>();
  private readonly receipts = new Map<string, GameplayReceipt>();
  private readonly receiptReaders = new Map<string, number>();
  private readonly durableReceipts = new Set<string>();
  private readonly inputLives = new Map<string, { life: number; alive: boolean }>();
  private readonly speechActors = new Map<string, string>();
  private actors: NativeActorRoster;
  private readonly connections = new Map<string, RequestScope>();
  private readonly connectionPreferences = new Map<string, boolean>();
  private readonly presence = new Map<string, { at: number; scope: RequestScope }>();
  private readonly presenceOrders = new Map<
    string,
    { sequence: number; at: number; controlGeneration: number }
  >();
  private readonly exits = new Map<string, ExitAttempt>();
  private readonly awaitingRestoredPresence = new Set<string>();
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
  private retained?: NativeRetainedValues;
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
  private stopping?: Promise<void>;
  private restoring = false;
  private restoration?: {
    readonly preparation: NativeRestorePreparation;
    readonly receipt?: NativeWorldAdoption;
  };

  private constructor(
    readonly store: SqlGameRepository,
    readonly config: AppConfig,
    private readonly host: NativeHost,
    world: NativeWorld,
    definitions: NativeDefinitionCapture,
    installation: NativeCurrentWorldInstallation,
    timelineId: string,
    private operational: OperationalSettings,
    retained: NativeRetainedValues,
    progress: Progress,
    privacy: ExperiencePrivacy,
    epoch: CommandEpoch,
    milestones: Readonly<Record<string, Readonly<Record<string, boolean>>>>,
    actors: NativeActorRoster,
    recentRows: readonly { readonly slot: string; readonly payload: string }[],
    private readonly now: () => number,
    private readonly installationRelease?: AssetRevisionReference,
  ) {
    this.worldId = installation.worldId;
    this.storageGeneration = installation.generation;
    this.nativeWorld = world;
    this.nativeDefinitions = definitions;
    this.timeline = timelineId;
    this.retained = retained;
    this.progress = progress;
    this.durableProgress = progress;
    this.privacy = privacy;
    this.epoch = epoch;
    this.milestones = milestones;
    this.actors = actors;
    this.recent = new NativeRecentRetention(
      installation.worldId,
      selectedTemporalPolicy(definitions.facts.definitions).recent,
      recentRows,
    );
    this.provider = definitions.geometry();
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

  get generation(): string {
    return this.storageGeneration;
  }
  get world(): NativeWorld {
    return this.nativeWorld;
  }
  get definitions(): NativeDefinitionCapture {
    return this.nativeDefinitions;
  }
  get timelineId(): string {
    return this.timeline;
  }

  /** Reopen only a real current-format scoped world. Creating the normal game
   * and converting unsupported families remain their separate factory owners. */
  static async open(options: {
    host: NativeHost;
    store: SqlGameRepository;
    config: AppConfig;
    now?: () => number;
    presentationRelease?: AssetRevisionReference;
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
        options.host,
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
        new NativeActorRoster(
          source.records.tables['sim_actors'] ?? [],
          source.records.tables['sim_exit_exposures'] ?? [],
        ),
        source.records.tables['mind_temporal_actors'] ?? [],
        options.now ?? Date.now,
        options.presentationRelease,
      );
      const allocation = service.work.reserveAllocation(installation.workAllocation);
      const receipt = await store.adoptNativeCurrentWorld(installation, {
        liveReadCuts: () =>
          service!.memoryReads.getStore() ??
          service!.reads.getStore()?.cut ??
          service!.pending.liveReadCuts(),
        retainedValues: (worldId) =>
          worldId === installation.worldId ? (service!.retained?.ids ?? {}) : {},
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
      for (const attempt of await store.authority.exitAttempts(installation.worldId))
        service.exits.set(attempt.actorId, attempt);
      if (service.progress.paused)
        for (const actorId of service.actors.playerIds())
          if (
            !service.exits.has(actorId) &&
            service.actors.get(actorId)?.participation?.phase !== 'exiting'
          )
            service.awaitingRestoredPresence.add(actorId);
      service.unsubscribers.push(
        store.authority.subscribe(() => {
          service!.inputs.clear();
          service!.inputLives.clear();
          service!.notify(false);
        }),
      );
      service.unsubscribers.push(store.assets.subscribeAuthority(() => service!.notify(false)));
      service.unsubscribers.push(store.onProjection(() => service!.notify(false)));
      if (config.authentication.mode === 'local') await service.signInLocal();
      await service.withSaveBarrier(undefined, 'play', () =>
        service!.lane.run(() => service!.reconcileParticipationInLane()),
      );
      service.scheduleRecentRetention();
      return service;
    } catch (error) {
      service?.closeAdmission();
      await service?.provider?.close().catch(() => undefined);
      service?.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
      service?.work.close();
      definitions?.release();
      world.closeAdmission();
      await world.finishStop().catch(() => undefined);
      throw error;
    }
  }

  private get geometry() {
    if (!this.provider) throw new Error('Native physical provider is closed.');
    return this.provider;
  }
  get connectionLimit(): number {
    return this.config.capacity.connections;
  }
  get paused(): boolean {
    return !!this.failure || this.operational.manuallyPaused || this.absent;
  }
  get storageError(): string | null {
    return this.failure?.message ?? null;
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
    if (!this.currentScope(scope, capability, controlling))
      throw new AuthorityError(controlling ? 'control-changed' : 'stale-scope');
  }
  requestScope(session: LoginSession, connectionId: string): Promise<RequestScope> {
    return this.store.authority.scope(session, this.worldId, this.timelineId, connectionId);
  }
  authenticationMutation<T>(operation: () => Promise<T>): Promise<T> {
    return this.lane.run(() => {
      if (this.closed) throw new AuthorityError('stale-scope');
      return operation();
    });
  }
  async signInLocal(): Promise<string> {
    if (this.config.authentication.mode !== 'local') throw new AuthorityError('forbidden');
    return this.authenticationMutation(async () => {
      const login = await this.store.authority.login(
        { issuer: 'https://local.openlegend.invalid', subject: 'local-player' },
        this.now(),
        this.config.authentication.sessionMs,
        this.config.capacity.sessions,
      );
      this.localSessionToken = login.token;
      return login.token;
    });
  }
  refreshScope(scope: RequestScope): RequestScope {
    this.assertScope(scope);
    return this.store.authority.refresh(scope, this.now());
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify(history = false): void {
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
  /** Fixed accepted prefix. Model waits join its scheduled save, never force an
   * early flush or retarget themselves to a later unrelated physical cut. */
  durabilityTicket(): number {
    return this.pending.through;
  }
  isDurable(ticket: number): boolean {
    return this.pending.durableMark().through >= ticket;
  }
  get simTime(): number {
    return this.progress.at;
  }
  get identityThrough(): number {
    return this.progress.identityThrough;
  }
  get durableIdentityThrough(): number {
    return this.durableProgress.identityThrough;
  }
  npcActorIds(): Iterable<string> {
    return this.actors.npcIds();
  }
  npcActor(id: string) {
    return this.actors.get(id);
  }
  async whenDurable(ticket = this.durabilityTicket()): Promise<void> {
    if (this.isDurable(ticket)) return;
    if (this.failure) throw this.failure;
    if (this.closed) throw new Error('Native service closed before the evidence became durable.');
    return new Promise<void>((resolve, reject) => {
      let unsubscribe = () => {};
      const changed = () => {
        if (this.isDurable(ticket)) {
          unsubscribe();
          resolve();
        } else if (this.failure || this.closed) {
          unsubscribe();
          reject(
            this.failure ?? new Error('Native service closed before the evidence became durable.'),
          );
        }
      };
      unsubscribe = this.subscribe(changed);
      changed();
    });
  }
  privateReadFence(actorId: string, permitted: () => boolean): () => boolean {
    const generation = this.generation,
      epoch = this.privacyEpoch;
    const scope = { worldId: this.worldId, actorId };
    const revision = this.store.memories.sourceAccessRevision(scope);
    return () =>
      !this.closed &&
      !this.restoring &&
      !this.failure &&
      this.generation === generation &&
      this.privacyEpoch === epoch &&
      revision === this.store.memories.sourceAccessRevision(scope) &&
      !this.store.memories.sourceEditPending(scope) &&
      permitted();
  }
  /** Accepted sparse changes only. Consumers retain their own finite trigger
   * reads; they never subscribe to a second writable actor/world graph. */
  onPublication(listener: (publication: NativePublication) => void): () => void {
    this.publicationListeners.add(listener);
    return () => this.publicationListeners.delete(listener);
  }
  private publishAccepted(publication: NativePublication): void {
    for (const listener of this.publicationListeners) {
      try {
        listener(publication);
      } catch {
        /* Scheduling cannot undo accepted gameplay. */
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
  captureNpc(
    actorId: string,
    requiredAppraisals: readonly AppraisalScope[],
    options: Parameters<NativeNpcCapture['prepareChoices']>[2] = {},
  ) {
    return this.lane.run(async () => {
      this.assertAdmission();
      let capture = await NativeNpcCapture.capture(this.world, actorId, requiredAppraisals);
      try {
        const tail = capture.receiptTailRequest();
        if (tail) {
          const before = capture.facts.self.acceptedCut;
          const captured = await captureNativeReadCut(this.world, actorId);
          if (captured.acceptedCut !== before) throw new ViewChangedError();
          const answer = await readNativeTemporalTail(
            this.store.db,
            captured,
            this.pending.liveReadCuts(),
            tail,
          );
          await this.world.resolveReceiptTail(Buffer.from(JSON.stringify(answer)));
          capture.release();
          capture = await NativeNpcCapture.capture(this.world, actorId, requiredAppraisals);
          if (capture.facts.self.acceptedCut !== before || capture.receiptTailRequest())
            throw new ViewChangedError();
        }
        // Tail resolution changes derived metadata only. Choice setup and the
        // mental/history read still share their exact initial accepted cut.
        await capture.prepareChoices(this.world, this.geometry, options);
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

  prepareNpcSources(
    capture: NativeNpcCapture,
    selection: NativeNpcSourceSelection,
    signal?: AbortSignal,
  ) {
    return this.lane.run(async () => {
      this.assertAdmission();
      if (
        capture.facts.self.worldId !== this.worldId ||
        capture.facts.self.generation !== this.generation
      )
        throw new ViewChangedError();
      return capture.prepareSources(
        this.world,
        selection,
        this.geometry,
        { db: this.store.db, liveReadCuts: () => this.pending.liveReadCuts() },
        signal,
      );
    });
  }

  captureNpcIntake(
    actorId: string,
    afterSequence: number,
    weighedThrough?: number,
  ): Promise<NativeNpcIntake> {
    return this.lane.run(() => {
      this.assertAdmission();
      return NativeNpcIntake.capture(this.world, actorId, afterSequence, weighedThrough);
    });
  }
  /** Inspections acknowledge the exact native witness while the mutation lane
   * is held. No provider or model wait may occur inside the synchronous callback. */
  inspectNpcIntake<T>(
    read: NativeNpcIntake,
    inspected: (current: () => boolean) => T,
  ): Promise<{ result: T } | undefined> {
    return this.lane.run(async () => {
      this.assertAdmission();
      const publication = await read.inspection(this.world);
      if (!publication) return;
      try {
        return { result: inspected(() => publication.isCurrent()) };
      } finally {
        publication.release();
      }
    });
  }

  async changeNpcIntake(
    actorId: string,
    generation: string,
    operation:
      | { type: 'reserve-discovery'; interval: number; reservation: string }
      | { type: 'settle-discovery'; reservation: string; dispatched: boolean },
  ): Promise<boolean> {
    const publication = await this.acceptOperation({
      actorId,
      first: () => this.world.beginNpcIntake(Buffer.from(JSON.stringify({ actorId, operation }))),
      admitPublication: (publication) => publication.outcome.ok,
      current: () => generation === this.generation,
    });
    return publication?.outcome.ok === true;
  }
  prepareNpcSituation(
    capture: NativeNpcCapture,
    jobId: string,
    history: Parameters<NativeNpcCapture['prepareSituation']>[3],
    observations: Parameters<NativeNpcCapture['prepareSituation']>[4] = [],
  ) {
    return this.lane.run(() => {
      this.assertNpcCapture(capture);
      return capture.prepareSituation(this.world, this.definitions, jobId, history, observations);
    });
  }
  prepareNpcExperiencePresentation(capture: NativeNpcCapture, values: readonly unknown[]) {
    return this.lane.run(() => {
      this.assertNpcCapture(capture);
      return capture.prepareExperiencePresentation(this.world, this.definitions, values);
    });
  }
  private assertNpcCapture(capture: NativeNpcCapture): void {
    this.assertAdmission();
    if (
      capture.facts.self.worldId !== this.worldId ||
      capture.facts.self.generation !== this.generation
    )
      throw new ViewChangedError();
  }

  /** Memory repositories select only their scoped SQL/pending rows. This
   * context is separate from embodied player reads and grants no player scope. */
  withMemoryRead<T>(cut: LiveReadCuts, operation: () => Promise<T>): Promise<T> {
    if (this.restoring) throw new ViewChangedError();
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

  /** One repository operation gets a fresh SQL/pending cut. Provider and model
   * waits stay outside it; the original NPC observation remains its own owner. */
  async withNpcMemoryRead<T>(
    actorId: string,
    operation: (cut: LiveReadCuts) => Promise<T>,
  ): Promise<T> {
    const cut = await this.lane.run(async () => {
      this.assertAdmission();
      return nativeScopedReadCut(
        await captureNativeReadCut(this.world, actorId),
        this.pending.liveReadCuts(),
      );
    });
    return this.withMemoryRead(cut, () => operation(cut));
  }

  /** SQL admission precedes this final short turn when the callback needs SQL.
   * Only server-owned recall/ticket publication runs here, never paid work. */
  publishRecall<T>(operation: () => Promise<T>): Promise<T> {
    if (this.publicationContext.getStore()?.active) return operation();
    return this.lane.run(async () => {
      this.assertAdmission();
      const owner = { active: true };
      try {
        return await this.publicationContext.run(owner, operation);
      } finally {
        owner.active = false;
      }
    });
  }

  publishNpcHistory<T>(capture: NativeNpcCapture, start: () => T): Promise<{ result: T }> {
    return this.publishRecall(async () => {
      this.assertNpcCapture(capture);
      const publication = await capture.historyPublication(this.world);
      try {
        if (!publication?.isCurrent()) throw new ViewChangedError();
        // Wrapping the result deliberately starts, but never awaits, provider
        // work while this actual historical disclosure lease is held.
        return { result: start() };
      } finally {
        publication?.release();
      }
    });
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
    if (this.restoring) throw new ViewChangedError();
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
      : this.operational.manuallyPaused
        ? 'manual'
        : this.absent
          ? 'away'
          : null;
  }

  private presenceKey(scope: RequestScope): string {
    return `${scope.accountId}:${scope.sessionId}:${scope.connectionId}`;
  }
  get present(): boolean {
    const cutoff = this.now() - 12_000;
    const connected = new Set(
      [...this.connections.values()].map((scope) => this.presenceKey(scope)),
    );
    for (const [key, entry] of this.presence)
      if (entry.at < cutoff || !this.currentScope(entry.scope, 'play', true)) {
        this.presence.delete(key);
        if (!connected.has(key)) this.presenceOrders.delete(key);
      }
    for (const [key, entry] of this.presenceOrders)
      if (entry.at < cutoff && !connected.has(key)) this.presenceOrders.delete(key);
    return this.presence.size > 0;
  }
  private get absent(): boolean {
    if (this.present || this.actors.exitExposureActive) return false;
    for (const scope of this.connections.values())
      if (
        this.currentScope(scope) &&
        this.currentScope(this.refreshScope(scope), 'play', true) &&
        this.connectionPreferences.get(scope.accountId) === false
      )
        return false;
    return true;
  }
  private controllerPresent(scope: RequestScope): boolean {
    const controller = this.store.authority.currentController(scope, this.now());
    if (!controller) return false;
    const key = this.presenceKey(controller);
    const presence = this.presence.get(key);
    if (
      presence &&
      presence.at >= this.now() - 12_000 &&
      this.currentScope(presence.scope, 'play', true)
    )
      return true;
    const returning = this.presenceOrders.get(key);
    if (
      returning?.controlGeneration === controller.controlGeneration &&
      returning.at >= this.now() - 12_000
    )
      return true;
    return [...this.connections.values()].some(
      (connection) =>
        connection.connectionId === controller.connectionId &&
        connection.sessionId === controller.sessionId &&
        this.currentScope(connection) &&
        this.currentScope(this.refreshScope(connection), 'play', true),
    );
  }
  controlsElsewhere(scope: RequestScope): boolean {
    const controller = this.store.authority.currentController(scope, this.now());
    return (
      !!controller &&
      controller.connectionId !== scope.connectionId &&
      this.controllerPresent(scope)
    );
  }
  private participatingHumans(): Set<string> {
    const actors = new Set<string>();
    for (const scope of [
      ...this.connections.values(),
      ...[...this.presence.values()].map((entry) => entry.scope),
    ])
      if (this.currentScope(scope) && this.currentScope(this.refreshScope(scope), 'play', true))
        actors.add(scope.actorId);
    return actors;
  }
  private orderPresence(key: string, sequence: number | undefined, scope: RequestScope): boolean {
    if (sequence === undefined) return true;
    const previous = this.presenceOrders.get(key);
    if (previous?.controlGeneration === scope.controlGeneration && sequence <= previous.sequence)
      return false;
    if (!previous && this.presenceOrders.size >= this.config.capacity.presence)
      throw new Error('Presence capacity reached. Reconnect before continuing.');
    this.presenceOrders.set(key, {
      sequence,
      at: this.now(),
      controlGeneration: scope.controlGeneration,
    });
    return true;
  }
  private async participationInLane(
    actorId: string,
    operation:
      | { type: 'begin-exit' | 'depart' | 'reconcile-exit'; attemptId: string }
      | { type: 'return' },
    attempt: ExitAttempt | null,
    control?: { scope: RequestScope; request: ControlRequest; unattended: boolean },
  ): Promise<NativePublication> {
    const expectedRevision = this.actors.get(actorId)?.participation?.revision ?? 0;
    return this.protectedOperation({
      capability: 'play',
      ...(control ? { scope: control.scope } : {}),
      actorId,
      inLane: true,
      requireSuccess: true,
      first: () =>
        this.world.beginParticipation(
          Buffer.from(JSON.stringify({ actorId, expectedRevision, operation })),
        ),
      current: () => !this.closed && !this.failure,
      operationalChange: async () => {
        if (control)
          await this.store.authority.changeControl(
            control.scope,
            control.request,
            this.now,
            control.unattended,
          );
        await this.store.authority.saveExit(this.worldId, actorId, attempt);
      },
      accepted: () => {
        if (attempt) this.exits.set(actorId, attempt);
        else this.exits.delete(actorId);
      },
    });
  }
  private async reconcileParticipationInLane(): Promise<void> {
    this.present;
    const participating = this.participatingHumans();
    for (const actorId of this.actors.playerIds()) {
      const actor = this.actors.get(actorId)!;
      if (participating.has(actorId)) {
        this.awaitingRestoredPresence.delete(actorId);
        if (actor.participation && actor.participation.phase !== 'active')
          await this.participationInLane(actorId, { type: 'return' }, null);
        continue;
      }
      if (actor.participation?.phase === 'inactive') {
        this.awaitingRestoredPresence.delete(actorId);
        continue;
      }
      if (this.progress.paused && this.awaitingRestoredPresence.has(actorId)) continue;
      this.awaitingRestoredPresence.delete(actorId);
      const attempt = this.exits.get(actorId) ?? {
        worldId: this.worldId,
        actorId,
        id: randomUUID(),
        deadline: this.now() + this.config.exitGraceMs,
      };
      if (
        actor.participation?.phase !== 'exiting' ||
        actor.participation.exitAttemptId !== attempt.id
      ) {
        const result = await this.participationInLane(
          actorId,
          {
            type: actor.participation?.phase === 'exiting' ? 'reconcile-exit' : 'begin-exit',
            attemptId: attempt.id,
          },
          attempt,
        );
        if (!result.outcome.ok) continue;
      }
      if (
        this.definitions.facts.definitions.participationPolicy?.exitExposureSeconds === undefined &&
        this.now() >= attempt.deadline
      )
        await this.participationInLane(actorId, { type: 'depart', attemptId: attempt.id }, attempt);
    }
  }
  private async hostControlInLane(
    paused: boolean,
    speed: number,
    manuallyPaused: boolean,
    scope?: RequestScope,
    capability: Capability = 'play',
    controlling = false,
  ): Promise<ApiResult> {
    const publication = await this.protectedOperation({
      scope,
      capability,
      controlling,
      inLane: true,
      current: () => !this.closed && !this.failure,
      first: () =>
        this.world.beginControl(Buffer.from(JSON.stringify({ paused, speed, manuallyPaused }))),
      accepted: () => {
        this.operational = { ...this.operational, speed, manuallyPaused };
      },
    });
    return publication.outcome;
  }
  clockStartedAt = 0;
  private debtSeconds = 0;
  private inputAccountedThrough?: number;
  private clockAdmission: 'duration' | 'monotonic' = 'duration';
  useMonotonicClock(): void {
    this.clockAdmission = 'monotonic';
  }
  get speed(): number {
    return this.operational.speed;
  }
  private accountInputTime(until: number, fallback = this.clockStartedAt): void {
    this.clockAdmission = 'monotonic';
    if (this.paused) {
      this.inputs.clear();
      this.inputAccountedThrough = until;
      return;
    }
    const from = Math.max(this.clockStartedAt, this.inputAccountedThrough ?? fallback);
    if (until <= from) {
      this.inputAccountedThrough = from;
      return;
    }
    const ratio = this.config.baseRatio * this.speed;
    this.inputs.credit(from, until, this.progress.at + this.debtSeconds, ratio);
    this.debtSeconds += ((until - from) / 1000) * ratio;
    this.inputAccountedThrough = until;
  }
  private resetClock(): void {
    this.debtSeconds = 0;
    this.inputs.clear();
    this.inputAccountedThrough = performance.now();
  }
  private async syncPauseInLane(): Promise<void> {
    this.resetClock();
    const paused = this.paused,
      resuming = this.progress.paused && !paused;
    if (this.progress.paused !== paused)
      await this.hostControlInLane(paused, this.operational.speed, this.operational.manuallyPaused);
    else this.notify(false);
    if (resuming && !this.progress.paused) this.clockStartedAt = performance.now();
  }

  async setConnection(
    connectionId: string,
    connected: boolean,
    scope: RequestScope,
  ): Promise<void> {
    await this.withSaveBarrier(undefined, 'play', () =>
      this.lane.run(async () => {
        if (connected) {
          this.assertScope(scope);
          if (this.connections.size >= this.connectionLimit)
            throw new Error('Connection capacity reached.');
          const profile = await this.profileFor(scope);
          this.connections.set(connectionId, scope);
          this.connectionPreferences.set(scope.accountId, profile.preferences.pauseWhenHidden);
        } else {
          const previous = this.connections.get(connectionId);
          this.connections.delete(connectionId);
          if (
            previous &&
            ![...this.connections.values()].some(
              (item) => this.presenceKey(item) === this.presenceKey(previous),
            )
          ) {
            this.inputs.clear(previous.actorId);
            this.presence.delete(this.presenceKey(previous));
            this.presenceOrders.delete(this.presenceKey(previous));
            if (
              ![...this.connections.values()].some((item) => item.accountId === previous.accountId)
            )
              this.connectionPreferences.delete(previous.accountId);
          }
        }
        await this.reconcileParticipationInLane();
        if (this.progress.paused !== this.paused) await this.syncPauseInLane();
      }),
    );
  }
  private readonly pendingPresenceChanges = new Map<string, number>();
  private steadyPresence(scope: RequestScope): boolean {
    const key = this.presenceKey(scope),
      entry = this.presence.get(key);
    if (
      this.pendingPresenceChanges.has(key) ||
      !entry ||
      entry.at < this.now() - 12_000 ||
      !this.currentScope(entry.scope, 'play', true) ||
      !this.currentScope(scope, 'play', true) ||
      this.progress.paused !== this.paused ||
      this.exits.size ||
      this.awaitingRestoredPresence.size
    )
      return false;
    const participating = this.participatingHumans();
    for (const id of this.actors.playerIds())
      if (
        (this.actors.get(id)!.participation?.phase ?? 'active') !==
        (participating.has(id) ? 'active' : 'inactive')
      )
        return false;
    return true;
  }
  async reportPresence(
    clientId: string,
    visible: boolean,
    sequence: number | undefined,
    scope: RequestScope,
  ): Promise<void> {
    this.assertScope(scope, 'play', true);
    if (clientId !== scope.connectionId && this.config.authentication.mode !== 'local')
      throw new AuthorityError('forbidden');
    const key = this.presenceKey(scope);
    if (visible && sequence !== undefined && this.steadyPresence(scope)) {
      await this.store.authority.assertFence({
        scope,
        capability: 'play',
        controlling: true,
        now: this.now,
      });
      this.assertScope(scope, 'play', true);
      if (this.steadyPresence(scope)) {
        if (this.orderPresence(key, sequence, scope))
          this.presence.set(key, { at: this.now(), scope });
        return;
      }
    }
    this.pendingPresenceChanges.set(key, (this.pendingPresenceChanges.get(key) ?? 0) + 1);
    try {
      await this.withSaveBarrier(scope, 'play', () =>
        this.lane.run(async () => {
          this.assertScope(scope, 'play', true);
          await this.setPresenceInLane(clientId, visible, sequence, scope);
        }),
      );
    } finally {
      const count = this.pendingPresenceChanges.get(key)! - 1;
      if (count) this.pendingPresenceChanges.set(key, count);
      else this.pendingPresenceChanges.delete(key);
    }
  }
  private async setPresenceInLane(
    clientId: string,
    visible: boolean,
    sequence: number | undefined,
    scope: RequestScope,
  ): Promise<void> {
    if (clientId !== scope.connectionId && this.config.authentication.mode !== 'local')
      throw new AuthorityError('forbidden');
    const key = this.presenceKey(scope);
    if (!this.orderPresence(key, sequence, scope)) return;
    const wasPaused = this.paused;
    if (wasPaused && !this.progress.paused) await this.syncPauseInLane();
    if (visible) {
      if (!this.presence.has(key) && this.presence.size >= this.config.capacity.presence)
        throw new Error('Presence capacity reached. Reconnect before continuing.');
      this.presence.set(key, { at: this.now(), scope });
    } else {
      this.presence.delete(key);
      this.inputs.clear(scope.actorId);
    }
    await this.reconcileParticipationInLane();
    if (this.paused !== wasPaused || this.progress.paused !== this.paused)
      await this.syncPauseInLane();
  }

  async changeEmbodiment(scope: RequestScope, request: ControlRequest): Promise<ApiResult> {
    return this.withSaveBarrier(scope, 'play', () =>
      this.lane.run(async () => {
        this.assertScope(scope);
        if (await this.store.authority.controlReceipt(scope, request))
          return {
            ok: true,
            code: 'replayed',
            message: 'Control request already committed. Refresh to see current control.',
          };
        const actor = this.actors.get(scope.actorId);
        if (actor?.controller !== 'player') throw new AuthorityError('forbidden');
        if (request.operation !== 'release') {
          this.present;
          if (
            !this.presenceOrders.has(this.presenceKey(scope)) &&
            this.presenceOrders.size >= this.config.capacity.presence
          )
            throw new Error('Presence capacity reached. Reconnect before continuing.');
        }
        const attempt =
          request.operation === 'release'
            ? (this.exits.get(scope.actorId) ?? {
                worldId: this.worldId,
                actorId: scope.actorId,
                id: randomUUID(),
                deadline: this.now() + this.config.exitGraceMs,
              })
            : null;
        const publication = await this.participationInLane(
          scope.actorId,
          attempt ? { type: 'begin-exit', attemptId: attempt.id } : { type: 'return' },
          attempt,
          {
            scope,
            request,
            unattended: actor.participation?.phase === 'inactive' || !this.controllerPresent(scope),
          },
        );
        if (!publication.outcome.ok) return publication.outcome;
        if (!attempt) {
          const returned = this.refreshScope(scope);
          this.presenceOrders.set(this.presenceKey(returned), {
            sequence: -1,
            at: this.now(),
            controlGeneration: returned.controlGeneration,
          });
        }
        return {
          ...publication.outcome,
          message:
            request.operation === 'release'
              ? 'Your tab is paused; your character is leaving the world.'
              : 'Resumed here.',
        };
      }),
    );
  }
  async control(
    input: { paused?: boolean; speed?: number; clientId?: string; presenceSequence?: number },
    scope: RequestScope,
  ): Promise<ApiResult> {
    return this.withSaveBarrier(scope, 'play', () =>
      this.lane.run(async () => {
        this.assertScope(scope, 'play', true);
        const refused = worldSpeedRefusal(input.speed, this.config.godMode, () =>
          this.currentScope(scope, 'create'),
        );
        if (refused) return refused;
        if (input.paused === false) {
          if (input.clientId)
            await this.setPresenceInLane(input.clientId, true, input.presenceSequence, scope);
          if (this.absent)
            return {
              ok: false,
              code: 'away',
              message: 'This game tab has not reconnected yet. Reload it and try Resume again.',
            };
        }
        const speed = input.speed ?? this.operational.speed,
          manuallyPaused = input.paused ?? this.operational.manuallyPaused;
        if (this.clockAdmission === 'monotonic') this.accountInputTime(performance.now());
        const paused = manuallyPaused || this.absent || !!this.failure,
          resuming = this.progress.paused && !paused;
        if (paused || this.progress.paused) this.resetClock();
        const outcome = await this.hostControlInLane(
          paused,
          speed,
          manuallyPaused,
          scope,
          'play',
          true,
        );
        if (outcome.ok && resuming) this.clockStartedAt = performance.now();
        if (outcome.ok) this.scheduleRecentRetention();
        return outcome.ok ? worldControlOutcome(paused, speed) : outcome;
      }),
    );
  }

  private assertAdmission(protectedOwner = false, healthyWriter = true): void {
    if (this.closed) throw new Error('Native world admission is closed.');
    if (this.protectedAdmission && !protectedOwner) throw new OverloadError();
    if (!healthyWriter) return;
    if (this.failure) throw this.failure;
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
      this.actors.has(actorId) &&
      (actorId === scope.actorId ||
        (this.actors.get(actorId)?.controller !== 'player' && this.currentScope(scope, 'inspect')))
    );
  }

  /** Only the operational admission gate spans the asynchronous save barrier;
   * the mutation lane stays available to the exact older prefix's ACK. */
  private async withSaveBarrier<T>(
    scope: RequestScope | undefined,
    capability: Capability,
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.lane.run(() => {
      this.assertAdmission();
      if (scope) this.assertScope(scope, capability);
      this.protectedAdmission = true;
    });
    try {
      await this.flush();
      // An older in-flight save may have acquired a newer accepted suffix
      // before this gate closed. Drain that exact suffix too before preparing.
      while (this.pending.dirty) await this.flush();
      return await operation();
    } finally {
      if (!this.protectedHold) this.protectedAdmission = false;
      this.scheduleRecentRetention();
    }
  }

  /** The private native candidate and its full packed SQL prefix stay held
   * through the database result. This also owns the ordinary-save barrier. */
  private async protectedOperation(request: {
    readonly scope?: RequestScope;
    readonly capability: Capability;
    readonly controlling?: boolean;
    readonly actorId?: string;
    readonly first: () => Promise<NativeWorldTurn>;
    readonly current: () => boolean;
    readonly operationalChange?: (publication: NativePublication) => Promise<void>;
    readonly accepted?: () => void;
    readonly signal?: AbortSignal;
    /** Only internal host reconciliation already inside the barrier/lane. */
    readonly inLane?: boolean;
    readonly requireSuccess?: boolean;
  }): Promise<NativePublication> {
    let accepted = false;
    try {
      const operation = async () => {
        this.assertAdmission(true);
        if (request.scope) this.assertScope(request.scope, request.capability, request.controlling);
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
          requireSuccess: request.requireSuccess,
          history: { db: this.store.db, liveReadCuts: () => before },
          stage: async (publication) => {
            const change = publication.privacyChange;
            const privacy: ExperiencePrivacy = change
              ? {
                  forgotten: {
                    ...this.privacy.forgotten,
                    [change.actorId]: [...change.forgotten],
                  },
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
            return {
              prepared,
              privacy,
              retain: this.recent.prepare(publication.records),
              actors: this.actors.prepare(publication.records),
            };
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
                  ...(request.scope
                    ? {
                        authority: {
                          scope: request.scope,
                          capability: request.capability,
                          controlling: request.controlling ?? false,
                          now: this.now,
                        },
                      }
                    : {}),
                  operationalChange: request.operationalChange
                    ? () => request.operationalChange!(prepared.value.publication)
                    : undefined,
                },
              );
              this.committedPrefix = { prefix, revision: saved.revision };
            } catch (error) {
              if (postgresTransactionOutcome(error) === 'committed')
                this.committedPrefix = { prefix, revision: prefix.cut.baseRevision + 1 };
              throw error;
            }
          },
          accept: ({ prepared, privacy, retain, actors }) => {
            prepared.accept();
            retain();
            actors();
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
          this.publishAccepted(result.publication);
          this.notify(result.publication.events.length !== 0);
          this.scheduleRecentRetention();
        } else if (
          result.publication.protectedSave &&
          !(request.requireSuccess && !result.publication.outcome.ok)
        )
          throw new AuthorityError('stale-scope');
        return result.publication;
      };
      return request.inLane
        ? await operation()
        : await this.withSaveBarrier(request.scope, request.capability, () =>
            this.lane.run(operation),
          );
    } catch (error) {
      if (accepted || this.protectedHold)
        this.failure = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  async createSave(label: string, id: string, scope: RequestScope): Promise<void> {
    return this.captureCheckpoint(label, id, 'manual', scope);
  }
  async createAutosave(): Promise<void> {
    return this.captureCheckpoint('Autosave', randomUUID(), 'auto');
  }
  private async captureCheckpoint(
    label: string,
    id: string,
    kind: 'manual' | 'auto',
    scope?: RequestScope,
  ): Promise<void> {
    const release = await this.store.saves.admit(id, kind);
    let completion: Promise<void> | undefined;
    try {
      await this.withSaveBarrier(scope, 'save', () =>
        this.lane.run(async () => {
          if (scope) this.assertScope(scope, 'save');
          let captured!: () => void;
          const ready = new Promise<void>((resolve) => {
            captured = resolve;
          });
          completion = this.store.saves.create(this.worldId, label, id, {
            captured,
            expectedRevision: this.pending.durableMark().revision,
            kind,
          });
          // The actual worker pins this SQL revision before admission reopens.
          // File streaming/rename then continues without occupying the lane.
          await Promise.race([ready, completion]);
        }),
      );
      await completion;
    } catch (error) {
      if (
        kind === 'manual' &&
        !(error instanceof CheckpointBusyError) &&
        !(error instanceof AuthorityError) &&
        !(error instanceof OverloadError)
      )
        await this.store.saves.recordFailure(
          this.worldId,
          'manual',
          `Manual save failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      throw error;
    } finally {
      release();
    }
  }

  async deleteSave(id: string, scope: RequestScope): Promise<void> {
    const completion = await this.lane.run(() => {
      this.assertScope(scope, 'save');
      const done = this.store.saves.delete(this.worldId, id);
      void done.catch(() => undefined);
      return { done };
    });
    await completion.done;
  }

  /** The HTTP owner pauses and drains model work before this call. The old
   * native handle stays private but usable on confirmed rollback; only the
   * actual whole-install SQL result permits its irreversible replacement. */
  async restoreSave(
    id: string,
    requestId: string,
    scope: RequestScope,
    signal?: AbortSignal,
  ): Promise<void> {
    this.assertScope(scope, 'save');
    const prior = (await this.store.getIntegration(`load-request:${requestId}`)) as
      | { saveId: string }
      | undefined;
    this.assertScope(scope, 'save');
    if (prior) {
      if (prior.saveId !== id) throw new GameSaveError('Load request identity conflicts.');
      return;
    }
    const selected = await this.store.saves.readCanonical(this.worldId, id);
    this.assertScope(scope, 'save');
    await this.store.saves.assertCanonicalAssetDependencies(
      selected.captured,
      this.installationRelease,
      { accountId: scope.accountId },
      id,
    );
    try {
      await this.withSaveBarrier(scope, 'save', () =>
        this.lane.run(async () => {
          this.assertAdmission(true);
          this.assertScope(scope, 'save');
          if (!this.progress.paused)
            throw new GameSaveError('Pause the world before loading a checkpoint.');
          await this.store.saves.drain();
          const generation = this.generation,
            timelineBefore = this.timelineId;
          const current = () => {
            signal?.throwIfAborted();
            this.assertScope(scope, 'save');
            if (generation !== this.generation || timelineBefore !== this.timelineId)
              throw new AuthorityError('stale-scope');
          };
          current();
          this.restoring = true;
          this.inputs.clear();
          this.notify(false);
          const recoveryId = randomUUID();
          let preparation: NativeRestorePreparation | undefined;
          let committed = false;
          let receipt: NativeWorldAdoption | undefined;
          let committedError: unknown;
          try {
            try {
              await this.store.saves.create(this.worldId, 'Before last load', recoveryId, {
                kind: 'recovery',
                expectedRevision: this.pending.durableMark().revision,
              });
            } catch (error) {
              const reason = error instanceof Error ? error.message : 'unknown error';
              await this.store.saves.recordFailure(
                this.worldId,
                'recovery',
                `Load refused: the current world could not be preserved first. ${reason}`,
              );
              throw new GameSaveError(
                `Load refused; the current world was kept (paused) because it could not be preserved first. ${reason} Free disk space or resolve the capture limit, then load again.`,
              );
            }
            current();
            const epoch = {
              generation: this.epoch.generation + 1,
              openedAt: this.now(),
              token: randomUUID(),
            };
            if (!Number.isSafeInteger(epoch.generation))
              throw new Error('Command epoch exhausted.');
            const timeline = randomUUID();
            try {
              const result = await this.store.restoreCaptured(
                this.pending.durableMark().revision,
                {
                  generation,
                  checkpoint: selected.captured,
                  authority: { scope, capability: 'save', controlling: false, now: this.now },
                  restore: {
                    id,
                    requestId,
                    recoveryId,
                    epoch,
                    timeline,
                    assetPrincipal: { accountId: scope.accountId },
                  },
                },
                async (stage) => {
                  preparation = await NativeRestorePreparation.prepare({
                    host: this.host,
                    stage,
                    store: this.store,
                    work: this.work,
                    timeline,
                    privacy: this.privacy,
                    checkpointPrivacy: checkpointPrivacy(selected.captured),
                    current,
                    signal,
                    backgroundSearchAdmission: () =>
                      !this.closed && !this.failure && !this.restoring,
                    currentRetained: (world) => (this.world === world ? this.retained : undefined),
                  });
                  return preparation;
                },
              );
              committed = true;
              receipt = result.receipt;
            } catch (error) {
              const outcome = postgresTransactionOutcome(error);
              if (outcome === 'committed' && preparation) {
                committed = true;
                receipt = preparation.sqlReceipt;
                committedError = error;
              } else if (outcome === 'rolled-back') throw error;
              else {
                if (preparation) this.restoration = { preparation };
                this.failure = error instanceof Error ? error : new Error(String(error));
                throw error;
              }
            }
            if (!preparation || !receipt)
              throw new Error('Committed restore has no actual native owner.');
            this.restoration = { preparation, receipt };
            const oldDefinitions = this.definitions,
              oldProvider = this.provider,
              oldPending = this.pending;
            await preparation.activate(receipt, this.world);
            // All objects below were prepared before Ready. No await exposes a
            // mixture of old and new request/save/definition owners.
            this.nativeWorld = preparation.world;
            this.nativeDefinitions = preparation.definitions;
            this.storageGeneration = receipt.generation;
            this.timeline = timeline;
            this.pending = preparation.pending;
            this.recent = preparation.recent;
            this.provider = preparation.geometry;
            this.retained = preparation.retained;
            this.progress = this.durableProgress = preparation.publication.progress;
            this.privacy = preparation.publication.restoreMetadata.privacy;
            this.operational = preparation.operational;
            this.milestones = preparation.milestones;
            this.actors = preparation.actors;
            this.epoch = epoch;
            this.connections.clear();
            this.presence.clear();
            this.presenceOrders.clear();
            this.connectionPreferences.clear();
            this.awaitingRestoredPresence.clear();
            for (const actorId of this.actors.playerIds())
              if (
                !this.exits.has(actorId) &&
                this.actors.get(actorId)?.participation?.phase !== 'exiting'
              )
                this.awaitingRestoredPresence.add(actorId);
            this.inputLives.clear();
            this.inputs.clear();
            this.receipts.clear();
            this.durableReceipts.clear();
            this.speechActors.clear();
            this.inventoryReads.clear();
            this.profiles.clear();
            for (const release of this.sourceEdits.values()) release();
            this.sourceEdits.clear();
            oldPending.release();
            await oldProvider?.close();
            oldDefinitions.release();
            await this.refreshValues();
            // Resetting a paused transport does not itself make a restored
            // person depart. Existing operational exits still reconcile now.
            await this.reconcileParticipationInLane();
            this.resetClock();
            this.inputAccountedThrough = undefined;
            this.restoration = undefined;
            this.restoring = false;
            this.privacyEpoch++;
            this.notify(true);
            if (committedError) throw committedError;
          } catch (error) {
            if (committed || this.restoration || this.failure) {
              this.failure = error instanceof Error ? error : new Error(String(error));
            } else {
              try {
                await preparation?.reject();
              } catch (cleanup) {
                if (preparation) this.restoration = { preparation };
                this.failure = new AggregateError(
                  [error, cleanup],
                  'Restore rollback cleanup failed.',
                );
                throw this.failure;
              }
              this.restoring = false;
              this.notify(false);
            }
            throw error;
          }
        }),
      );
    } finally {
      await this.store.saves.retainRecovery(this.worldId);
    }
  }
  async pauseForRestore(scope: RequestScope): Promise<ApiResult> {
    return this.withSaveBarrier(scope, 'save', () =>
      this.lane.run(async () => {
        this.assertScope(scope, 'save');
        this.resetClock();
        return this.hostControlInLane(true, this.speed, true, scope, 'save');
      }),
    );
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
      admitPublication: request.admitPublication,
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
          typeof request.outcomes === 'function' ? request.outcomes(publication) : request.outcomes,
        );
        const lives: [string, { life: number; alive: boolean } | undefined][] = [];
        for (const row of publication.records.writes['sim_actors'] ?? []) {
          const actorId = (JSON.parse(row.parent) as string[]).at(-1)!;
          const actor = JSON.parse(row.payload) as {
            physicalLife?: number;
            alive: boolean;
            controller: 'player' | 'npc';
          };
          if (this.inputLives.has(actorId))
            lives.push([actorId, { life: actor.physicalLife ?? 0, alive: actor.alive }]);
        }
        for (const id of publication.records.deletes['sim_entities'] ?? []) {
          const actorId = (JSON.parse(id) as string[]).at(-1)!;
          if (this.inputLives.has(actorId)) lives.push([actorId, undefined]);
        }
        return {
          ...pending,
          lives,
          actors: this.actors.prepare(publication.records),
          retain: this.recent.prepare(publication.records),
        };
      },
    });
    if (!accepted.accepted) return undefined;
    const publication = accepted.value.value.publication;
    try {
      accepted.value.accept();
      accepted.value.retain();
      accepted.value.actors();
      this.progress = publication.progress;
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
    this.publishAccepted(publication);
    this.notify(publication.events.length !== 0);
    this.scheduleSave();
    this.scheduleRecentRetention();
    return publication;
  }

  /** The ticket owns real native bindings; the response supplies intentions
   * only. A durable decision claim shares the exact response SQL transaction. */
  async applyNpcResponse(input: {
    readonly actorId: string;
    readonly responseId: string;
    readonly ticket: NativeWorldNpcResponseTicket;
    readonly response: ActorResponse;
    readonly generation: string;
    readonly current: () => boolean;
    readonly signal: AbortSignal;
    readonly claim?: DecisionPublication;
  }): Promise<ApiResult> {
    const actorId = input.actorId;
    if (input.claim && input.claim.receiptId !== input.responseId)
      throw new Error('Decision publication and native response identities differ.');
    let authority: RequestScope | undefined;
    let admission: DecisionClaimFacts | undefined;
    const current = () =>
      input.generation === this.generation &&
      !input.signal.aborted &&
      !this.paused &&
      input.current() &&
      (!authority || this.currentScope(authority, 'play', true));
    const first = async () => {
      const job = await this.store.getJob(input.claim?.rootJobId ?? input.responseId);
      if (
        !job ||
        job.request.npcId !== actorId ||
        (job.authority && !this.currentScope(job.authority, 'play', true))
      )
        throw new DecisionClaimLost();
      authority = job.authority;
      if (input.claim) {
        const capture = await NativeNpcCapture.capture(this.world, actorId, []);
        try {
          const own = capture.facts.self,
            actor = this.actors.get(actorId);
          admission = {
            worldId: this.worldId,
            timelineId: this.timelineId,
            generation: this.generation,
            policyDigest: decisionPolicyDigest(this.config),
            at: own.at,
            physicalLife: own.physicalLife ?? 0,
            actorEligible:
              !!actor?.alive &&
              !actor.incapacitated &&
              actor.controller === 'npc' &&
              actor.cognition !== false &&
              !own.actionsBlocked,
          };
          if (!decisionClaimCurrentFromRead(job, input.claim, admission))
            throw new DecisionClaimLost();
        } finally {
          capture.release();
        }
      } else if (!['generating', 'queued', 'judging'].includes(job.status) && !job.responseReady) {
        throw new DecisionClaimLost();
      }
      if (!current()) throw new DecisionClaimLost();
      return this.world.beginNpcResponse(
        input.ticket,
        Buffer.from(JSON.stringify(input.response)),
        !!input.claim,
      );
    };
    try {
      if (input.claim) {
        const claim = input.claim;
        const publication = await this.protectedOperation({
          get scope() {
            return authority;
          },
          controlling: true,
          actorId,
          capability: 'play',
          first,
          current,
          signal: input.signal,
          operationalChange: async (publication) => {
            const receiptRow = (publication.records.writes['response_receipts'] ?? []).find(
              (row) => row.slot === input.responseId,
            );
            if (!receiptRow || !admission)
              throw new Error('Native response did not emit its bound canonical receipt.');
            const receipt = JSON.parse(receiptRow.payload) as NonNullable<
              WorldState['responseReceipts']
            >[string];
            await finishDecisionPublicationFromRead(
              this.store,
              claim,
              publication.outcome,
              receipt,
              (job, proposed) =>
                decisionClaimCurrentFromRead(job, proposed, {
                  ...admission!,
                  policyDigest: decisionPolicyDigest(this.config),
                }),
            );
          },
        });
        if (claim.startedMonotonic !== undefined) {
          claim.deliveredAt = claim.now();
          claim.deliveredElapsedMs = Math.max(0, performance.now() - claim.startedMonotonic);
        }
        return retainNativeSources(publication.outcome, publication);
      }
      const publication = await this.acceptOperation({
        actorId,
        first,
        current,
        signal: input.signal,
        outcomes: (publication) => [{ id: input.responseId, outcome: publication.outcome }],
      });
      return (
        (publication && retainNativeSources(publication.outcome, publication)) ?? {
          ok: false,
          code: 'stale-publication',
          message: 'This response is no longer current.',
        }
      );
    } catch (error) {
      if (error instanceof DecisionClaimLost)
        return {
          ok: false,
          code: 'stale-publication',
          message: 'This decision is no longer pending.',
        };
      throw error;
    }
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

  /** Speak through the same command owner used by the player. Only the actual
   * resulting personal account can admit a paid reply for the chosen NPC. */
  async speakToNpc(
    jobId: string,
    text: string,
    reference: string,
    volume: SpeechVolume,
    scope: RequestScope,
  ): Promise<
    | { readonly ok: false; readonly outcome: ApiResult }
    | {
        readonly ok: true;
        readonly actorId: string;
        readonly eventId: string;
        readonly heard: boolean;
        readonly recipientName: string;
      }
  > {
    return this.lane.run(async () => {
      this.assertAdmission();
      this.assertScope(scope, 'play', true);
      const capture = await NativePlayerCapture.capture(
        this.world,
        scope,
        PLAYER_EVENT_WINDOW,
        this.geometry,
      );
      try {
        const resolved = nativePlayerCommandReferences(
          scope,
          { type: 'say', targetId: reference, text, volume },
          capture.facts,
        );
        const available = await playerInteractionAvailability({
          mode: 'speak',
          config: this.config,
          read: () => this.interactionFacts('speak', resolved.targetId, scope, capture),
          budgetAvailable: (actor, allowance, ceiling) =>
            this.store.budgetAvailable(actor, allowance, ceiling),
          admit: (actor) => this.playerInteractionAdmission?.(actor) ?? true,
        });
        if (!available.available)
          return {
            ok: false,
            outcome: { ok: false, code: available.code, message: available.reason! },
          };
        const target = resolved.targetId;
        if (!target || !available.reply || this.actors.get(target)?.controller !== 'npc')
          return {
            ok: false,
            outcome: {
              ok: false,
              code: 'resident-unavailable',
              message: 'Select an available resident for this conversation.',
            },
          };
        const recipient = await capture.interaction('speak', target);
        if (!recipient.recipientDescription) throw new ViewChangedError();
        const recipientName = namePhrase(recipient.recipientDescription, 'definite', {
          capitalize: true,
        });
        const utteranceId = `${jobId}:player`;
        const command = ordinaryPlayerCommand(resolved, {
          id: utteranceId,
          actorId: scope.actorId,
        });
        if (!command) throw new Error('Speech command factory returned no command.');
        if ('ok' in command) return { ok: false, outcome: command };
        const publication = await this.acceptInLane({
          actorId: scope.actorId,
          first: () =>
            this.world.command(
              Buffer.from(JSON.stringify(command)),
              Buffer.from(canonicalJson(command)),
              false,
            ),
          current: () => this.currentScope(scope, 'play', true),
        });
        if (!publication) throw new AuthorityError('stale-scope');
        if (!publication.outcome.ok)
          return { ok: false, outcome: retainNativeSources(publication.outcome, publication) };
        const event = [...publication.events]
          .reverse()
          .find(
            (event) =>
              event.actorId === scope.actorId && event.data?.['utteranceId'] === utteranceId,
          );
        if (!event)
          throw new Error(
            'The utterance was already accepted without an available initiating event proof. Check its request status before retrying.',
          );
        const heard = publication.history.accounts.some(
          (account) =>
            account.eventId === event.id &&
            account.actorId === target &&
            account.awarenessPayload !== undefined &&
            heardAddressedSpeech(JSON.parse(account.awarenessPayload) as Awareness),
        );
        return retainNativeSources(
          {
            ok: true,
            actorId: target,
            eventId: event.id,
            heard,
            recipientName,
          },
          publication,
        );
      } finally {
        capture.release();
      }
    });
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
    await this.lane.run(async () => {
      this.assertAdmission(false, false);
      this.assertScope(scope, 'play', true);
      await this.refreshCommandEpoch();
    });
    const generation = this.generation,
      timeline = this.timelineId;
    const id = `gameplay:${scope.accountId}:${epoch}:${digest(commandId)}`;
    const fingerprint = digest({ actor: scope.actorId, input, scope });
    const readers = this.receiptReaders.get(id) ?? 0;
    if (!readers && this.receiptReaders.size >= this.config.capacity.requests)
      throw new OverloadError();
    this.receiptReaders.set(id, readers + 1);
    try {
      const selected = this.receipts.get(id) ?? (await this.store.commands.get(this.worldId, id));
      return await this.lane.run(async () => {
        this.assertAdmission(false, false);
        this.assertScope(scope, 'play', true);
        if (generation !== this.generation || timeline !== this.timelineId)
          throw new AuthorityError('stale-scope');
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
        this.assertAdmission();
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
            return {
              ok: false,
              code: 'unavailable',
              message: 'This action is unavailable in this build.',
            };
          const command = ordinaryPlayerCommand(resolved, {
            id,
            actorId: scope.actorId,
            humanInitiated: true,
            ...(input.purpose ? { purpose: input.purpose } : {}),
            ...(input.autoEquip ? { autoEquip: true } : {}),
            ...(input.combatHelpId ? { combatHelpId: input.combatHelpId } : {}),
            ...(input.cooperation ? { cooperation: input.cooperation } : {}),
          });
          if (!command || ('type' in command && command.type === 'evade'))
            return {
              ok: false,
              code: 'unavailable',
              message: 'This action is unavailable in this build.',
            };
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

  async commandReceipt(
    commandId: string,
    input: CommandInput,
    epoch: string,
    scope: RequestScope,
  ): Promise<CommandReceiptResult> {
    this.assertScope(scope);
    const audience = scopeKey(scope);
    const id = `gameplay:${scope.accountId}:${epoch}:${digest(commandId)}`;
    const selected = this.receipts.get(id) ?? (await this.store.commands.get(this.worldId, id));
    const prior = this.receipts.get(id) ?? selected;
    this.assertScope(scope);
    if (!prior)
      return {
        ok: false,
        scope: audience,
        status: epoch === this.commandEpoch ? 'unknown' : 'expired',
        message: 'The original result is not available. This does not confirm whether it happened.',
      };
    if (prior.recoveryFingerprint !== commandRecoveryFingerprint(input, scope))
      return {
        ok: false,
        scope: audience,
        status: 'unavailable',
        message: 'This result is unavailable for the current access and original request.',
      };
    if (this.now() >= prior.expiresAt)
      return {
        ok: false,
        scope: audience,
        status: 'expired',
        message: 'The original result has expired. Its outcome remains unconfirmed.',
      };
    return { ok: true, scope: audience, status: 'resolved', result: prior.result };
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

  private participationDue(): boolean {
    this.present;
    const participating = this.participatingHumans();
    for (const id of this.actors.playerIds()) {
      const phase = this.actors.get(id)!.participation;
      if (participating.has(id)) {
        if (phase && phase.phase !== 'active') return true;
        continue;
      }
      if (
        phase?.phase === 'inactive' ||
        (this.progress.paused && this.awaitingRestoredPresence.has(id))
      )
        continue;
      const attempt = this.exits.get(id);
      if (!attempt || phase?.phase !== 'exiting' || phase.exitAttemptId !== attempt.id) return true;
      if (
        this.definitions.facts.definitions.participationPolicy?.exitExposureSeconds === undefined &&
        this.now() >= attempt.deadline
      )
        return true;
    }
    return false;
  }

  /** The host offers actual elapsed intervals. Unadvanced debt survives a
   * bounded native batch; a navigation wait does not manufacture an accepted
   * SQL cut, and a suspended callback never grants input credit. */
  async tick(
    elapsedRealSeconds: number,
    suspendedRealSeconds = elapsedRealSeconds > 2 ? elapsedRealSeconds : 0,
    options: { drain?: boolean; offeredUntil?: number } = {},
  ): Promise<boolean> {
    if (
      !Number.isFinite(elapsedRealSeconds) ||
      elapsedRealSeconds < 0 ||
      !Number.isFinite(suspendedRealSeconds) ||
      suspendedRealSeconds < 0 ||
      (options.offeredUntil !== undefined &&
        (!Number.isFinite(options.offeredUntil) || options.offeredUntil < 0))
    )
      throw new Error('Tick durations must be finite nonnegative seconds.');
    do {
      const outstanding = this.save;
      if (
        outstanding &&
        this.pending.oldestAcceptedAt !== undefined &&
        performance.now() - this.pending.oldestAcceptedAt >= LIVE_SAVE_MAX_AGE_MS
      )
        await outstanding;
      if (this.participationDue() || this.progress.paused !== this.paused)
        await this.withSaveBarrier(undefined, 'play', () =>
          this.lane.run(async () => {
            await this.reconcileParticipationInLane();
            if (this.progress.paused !== this.paused) await this.syncPauseInLane();
          }),
        );
      const more = await this.lane.run(async () => {
        this.assertAdmission();
        if (this.paused) return false;
        if (options.offeredUntil !== undefined)
          elapsedRealSeconds = Math.min(
            elapsedRealSeconds,
            Math.max(0, (options.offeredUntil - this.clockStartedAt) / 1000),
          );
        if (suspendedRealSeconds > 0) {
          this.debtSeconds = 0;
          this.inputs.clear();
          this.inputAccountedThrough = options.offeredUntil ?? performance.now();
          elapsedRealSeconds = Math.max(0, elapsedRealSeconds - suspendedRealSeconds);
          this.inputAccountedThrough -= elapsedRealSeconds * 1000;
          if (!elapsedRealSeconds) return false;
        }
        if (options.offeredUntil !== undefined)
          this.accountInputTime(
            options.offeredUntil,
            options.offeredUntil - elapsedRealSeconds * 1000,
          );
        else {
          this.clockAdmission = 'duration';
          this.inputs.clear();
          this.inputAccountedThrough = undefined;
          this.debtSeconds += elapsedRealSeconds * this.config.baseRatio * this.speed;
        }
        this.inputs.expire(performance.now());
        const offered = Math.min(this.debtSeconds, 86400);
        if (offered < 1e-6) return false;
        const before = this.progress.at,
          inputs = this.inputs.inputs(performance.now());
        const publication = await this.acceptInLane({
          first: () => this.world.advance(offered, 4096, Buffer.from(JSON.stringify(inputs))),
          current: () => !this.paused && this.inputs.authorized(inputs, performance.now()),
          admitPublication: (value) =>
            !(
              value.progress.at === before &&
              value.outcome.ok &&
              value.outcome.code === 'navigation-pending'
            ),
        });
        if (!publication) return false;
        if (!publication.outcome.ok) {
          this.fail(
            new Error(
              `Required native work stopped before advancing time: ${publication.outcome.message}`,
            ),
          );
          return false;
        }
        const advanced = publication.progress.at - before;
        this.debtSeconds = Math.max(0, this.debtSeconds - advanced);
        return (
          !this.paused &&
          this.debtSeconds >= 1e-6 &&
          advanced > 0 &&
          publication.outcome.code !== 'navigation-pending'
        );
      });
      elapsedRealSeconds = suspendedRealSeconds = 0;
      if (!more || options.drain === false) return more;
      await new Promise<void>((resolve) => setImmediate(resolve));
    } while (true);
  }
  fail(error: unknown): void {
    this.failure = error instanceof Error ? error : new Error(String(error));
    this.inputs.clear();
    this.notify(false);
  }

  private inputState(scope: RequestScope, self: NativePlayerRead['self']) {
    const life = self.physicalLife ?? 0,
      alive = self.alive,
      generation = this.generation,
      paused = this.paused;
    const state = this.inputs.state(
      scope.actorId,
      digest({ scope, generation, life: self.physicalLife, alive, paused }),
      () =>
        this.currentScope(scope, 'play', true) &&
        this.generation === generation &&
        this.paused === paused &&
        this.inputLives.get(scope.actorId)?.life === life &&
        this.inputLives.get(scope.actorId)?.alive === alive,
    );
    if (
      !this.inputLives.has(scope.actorId) &&
      this.inputLives.size >= this.config.capacity.presence
    )
      for (const id of this.inputLives.keys()) if (!this.inputs.has(id)) this.inputLives.delete(id);
    this.inputLives.set(scope.actorId, { life, alive });
    if (!self.player.canSteer && state.steering) this.inputs.invalidateMovement(scope.actorId);
    return state;
  }
  async updateWorldInput(input: WorldInputUpdate, scope: RequestScope): Promise<WorldInputResult> {
    return this.lane.run(async () => {
      this.assertAdmission();
      this.assertScope(scope, 'play', true);
      const now = performance.now();
      this.accountInputTime(now);
      this.inputs.expire(now, scope.actorId);
      const capture = await NativePlayerCapture.capture(
        this.world,
        scope,
        PLAYER_EVENT_WINDOW,
        this.geometry,
      );
      try {
        const self = capture.facts.self,
          state = this.inputState(scope, self);
        if (this.paused)
          return {
            ok: false,
            code: 'paused',
            message: 'Resume the world to move or release.',
            inputScope: { ...state.scope },
          };
        if (!self.alive)
          return {
            ok: false,
            code: 'unavailable',
            message: 'This character cannot move now.',
            inputScope: { ...state.scope },
          };
        if (
          input.kind === 'steer' &&
          (input.direction.x || input.direction.z) &&
          !self.player.canSteer
        )
          return {
            ok: false,
            code: 'busy',
            message: 'This character cannot steer during the current work or condition.',
            inputScope: { ...state.scope },
          };
        return this.inputs.update(state, input, now, this.progress.at + this.debtSeconds);
      } finally {
        capture.release();
      }
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
          if (this.restoring) throw new ViewChangedError();
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
    if (this.restoring) throw new ViewChangedError();
    this.assertScope(scope);
    const context = this.reads.getStore();
    if (!context || context.scope !== scopeKey(scope))
      throw new Error('Native player projection requires its scoped accepted read owner.');
    const capture = context.captured,
      facts = capture.facts,
      self = facts.self;
    const controlling = this.currentScope(scope, 'play', true);
    const lifecycle = this.lifecycle();
    const input = this.inputState(scope, self);
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
              !this.restoring &&
              this.generation === lifecycle.generation &&
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
    // A failed post-COMMIT callback can stop new work even after its exact
    // prefix was acknowledged. A clean durable owner still has to close.
    if (this.failure && !this.committedPrefix && (this.pending.inFlight || this.pending.dirty))
      throw this.failure;
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
        this.notify(false);
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

  /** Stop intake first; accepted saves keep their original owner and are still
   * allowed to finish. Uncertain protected SQL cannot be cancelled as rollback. */
  closeAdmission(): void {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.saveTimer);
    clearTimeout(this.retentionTimer);
    this.saveTimer = this.retentionTimer = undefined;
    this.inputs.clear();
    this.inputLives.clear();
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
    this.notify(false);
  }

  close(): Promise<void> {
    this.closeAdmission();
    this.stopping ??= (async () => {
      await this.lane.idle();
      await this.projection.idle();
      await this.retentionTask;
      if (this.protectedHold || this.restoring || this.restoration)
        throw new Error('Protected SQL settlement remains held for durable recovery.');
      await this.flush();
      while (this.pending.dirty) await this.flush();
      this.world.closeAdmission();
      await this.world.finishStop();
      await this.provider?.close();
      this.provider = undefined;
      this.definitions.release();
      this.retained = undefined;
      // Keep only the confirmed scalar report. Owned native products used by
      // another real consumer retain their own admission until its last drop.
      this.progress = { ...this.progress };
      this.durableProgress = { ...this.durableProgress };
      this.pending.release();
      this.profiles.clear();
      this.speechActors.clear();
      this.inventoryReads.clear();
      for (const release of this.sourceEdits.values()) release();
      this.sourceEdits.clear();
      this.work.close();
    })();
    return this.stopping;
  }
}
