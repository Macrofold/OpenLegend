import { basePlaytestMilestones } from '@open-legend/domain';
import { activityChoiceView } from './activity-context.js';
import {
  ACTIVITY_LIMITS,
  discoverActivities,
  retainActivity,
  renderActivity,
  acquiredActivities,
  bindActivityRequest,
  reviewActivityRequest,
} from '@open-legend/domain';
import { resolveKnownPlaceMove, knownPlaceReference } from './known-places.js';
import type { StoryJob } from './history.js';
import {
  prepareHistoryEdit,
  type HistoryEditSelection,
  type PreparedHistoryEdit,
} from './history-edit.js';
import { reconcileConditions, initializePerception } from '@open-legend/domain';
import { scopedInventionErrors } from './invention-context.js';
import { advanceWorldSlices, appendedRecordCount } from '@open-legend/domain';
import { setContainerAccess, type ContainerAccessRequest } from '@open-legend/domain';
import { WorkLane, OverloadError } from './work-lane.js';
import {
  authorAppraisal,
  changeAppraisal,
  appraisalDefinition,
  appraisalCreationIdentity,
  type Outcome,
} from '@open-legend/domain';
import { knowledgeDocument, canRememberSubject } from '@open-legend/domain';
import { HostWork } from './host-work.js';
import { WorkBudgetError } from '@open-legend/domain';
import { changeParticipation } from '@open-legend/domain';
import {
  lethalAttackOffer,
  bodyPolicy,
  observerName,
  nativeActivityView,
  type LethalPermission,
} from '@open-legend/domain';
import {
  AuthorityError,
  commandRecoveryFields,
  scopeKey,
  type RequestScope,
  type Capability,
  type LoginSession,
  type AuthorityFence,
  type ControlRequest,
  type ExitAttempt,
  type BindingRequest,
} from './authority.js';
import { compactHistory, discardedHistoryRelease } from './history-residency.js';
import { consolidationBatch, type ConsolidationBatch } from './memory-consolidation.js';
import { editKnowledge, assignGivenName, rememberSubject } from '@open-legend/domain';
import { createGodItem, type GodItemRequest } from '@open-legend/domain';
import { declareOwnership, custodian, type OwnershipRequest } from '@open-legend/domain';
import { inventoryTotals, projectStatusEffects } from '@open-legend/domain';
import { completeNavigation, navigationBlocked } from '@open-legend/domain';
import { initializeCollisionRuntime } from '@open-legend/spatial/rapier';
import type { NavigationRequest, NavigationResult } from '@open-legend/spatial';
import type { SpeechVolume } from '@open-legend/domain';
import { changeInventionPolicy } from '@open-legend/domain';
import { goalTexts } from '@open-legend/domain';
import {
  admitAttributeDeclaration,
  editActorAttributes,
  projectAttributes,
  type AttributeDeclarationRequest,
  type AttributeEditRequest,
  type DefinitionPin,
} from '@open-legend/domain';
import { createReservoirDemo, createTouchDemo } from '@open-legend/domain';
import { validateWorldModules } from '@open-legend/domain';
import {
  CheckpointBusyError,
  GameSaveError,
  type SavePayload,
  type RestoreSave,
} from './game-saves.js';
import { recordDuration, timed, countMetric, gaugeMetric } from './performance.js';
import { retainHotEvents } from './hot-events.js';
import { COMMAND_RETRY_MS, type CommandEpoch, type GameplayReceipt } from './command-receipts.js';
import { createPersonMemoryPager, formatMemoryEntry } from './person-memory-page.js';
import {
  controlledEntityId,
  defaultStoryPolicy,
  defaultResidentEntityId,
  validateStoryPolicy,
  editStoryMechanism,
  type StoryPolicy,
} from '@open-legend/domain';
import { changeConversation, leaveConversation } from '@open-legend/domain';
import { changeFamilyTree } from '@open-legend/domain';
import { familyPeople, projectFamily } from './family-view.js';
import type { FamilyEdit } from '@open-legend/protocol';
import { applyBodyEffects, type BodyEffect } from '@open-legend/domain';
import { enableActorCognition } from '@open-legend/domain';
import { hasMemory } from '@open-legend/domain';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  createWorld,
  updateWorld,
  appendedEventCount,
  initializeActorTraits,
  freezeWorld,
  migrateCognition,
  forgetExperience,
  correctExperience,
  experiences,
  EXPERIENCE_LIMITS,
  mindFor,
  executeCommand,
  admitDeclaration,
  experienceEntry,
  experienceEntries,
  editPerson as editPersonState,
  editWorldEvents as editWorldEventsState,
  observeActor,
  reviveActor,
  spawnWorldEntity,
  type Command,
  type DeclarationDraft,
  type DeclarationProvenance,
  type Transition,
  type GodSpawnRequest,
  type GodMemoryEdit,
  type GodPersonDraft,
  type GodPersonEditorDraft,
  type WorldEvent,
  type WorldState,
  type Entity,
} from '@open-legend/domain';
import type {
  ApiResult,
  CommandInput,
  CommandReceiptResult,
  GodPersonEditorView,
  GodWorldEventsEditorView,
  MaintenanceWindowView,
  PlayerProfile,
  PlayerPreferencePatch,
} from '@open-legend/protocol';
import type { AppConfig } from './config.js';
import { digest, type SavedWorld, type GameRepository, type PreparedCommit } from './store.js';

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
export const commandInputSchema = z
  .object({
    type: z.enum([
      'activity',
      'activity-request',
      'conversation',
      'say',
      'pickup',
      'drop',
      'transfer-item',
      'split-item',
      'merge-item',
      'unequip',
      'move',
      'follow',
      'confirm-attempt',
      'withdraw-attempt',
      'gather',
      'prepare',
      'craft',
      'equip',
      'strike',
      'hunt',
      'harvest',
      'cook',
      'tend-fire',
      'handover',
      'outing',
      'eat',
      'status-effect',
      'replenish',
      'inspect-inventory',
      'inspect-activities',
      'cancel',
      'recover',
      'respawn',
      'treat-scar',
      'teach',
    ]),
    purpose: z.string().trim().min(1).max(120).optional(),
    activityFamilyId: id.optional(),
    activityArguments: z
      .record(id, z.union([z.string().min(1).max(120), z.number().finite(), z.boolean()]))
      .refine((value) => Object.keys(value).length <= 16)
      .optional(),
    methodId: id.optional(),
    bindings: z
      .record(
        id,
        z.union([
          z.string().min(1).max(1500),
          z
            .object({
              x: z.number().finite(),
              y: z.number().finite(),
              z: z.number().finite(),
              surfaceId: id,
            })
            .strict(),
        ]),
      )
      .refine((value) => Object.keys(value).length <= ACTIVITY_LIMITS.nodes)
      .optional(),
    resume: z.boolean().optional(),
    historyAfter: z.number().int().min(-1).optional(),
    methodAfter: z.number().int().min(0).max(ACTIVITY_LIMITS.acquisitions).optional(),
    after: id.optional(),
    containerId: id.optional(),
    expectedScope: z.string().max(16000).optional(),
    conversationId: id.optional(),
    text: z.string().trim().min(1).max(1500).optional(),
    generation: z.number().int().nonnegative().optional(),
    operation: z.enum(['join', 'leave']).optional(),
    effectOperation: z.enum(['activate', 'deactivate']).optional(),
    fireOperation: z.enum(['light', 'fuel', 'extinguish']).optional(),
    handoverOperation: z.enum(['offer', 'counter', 'accept', 'decline', 'withdraw']).optional(),
    outingOperation: z.enum(['invite', 'accept', 'decline', 'leave']).optional(),
    outingId: id.optional(),
    outingMode: z.enum(['enqueue', 'replace', 'interrupt']).optional(),
    destinationId: id.optional(),
    offerId: id.optional(),
    expectedOfferRevision: z.number().int().nonnegative().safe().optional(),
    requestedItem: z
      .object({
        itemId: id,
        quantity: z.number().int().positive().safe(),
        expectedRevision: z.number().int().nonnegative().safe().optional(),
        placementRevision: z.number().int().nonnegative().safe().optional(),
        expectedContentsRevision: z.number().int().nonnegative().safe().optional(),
      })
      .strict()
      .optional(),
    targetId: id.optional(),
    definitionId: id.optional(),
    distance: z.number().min(1.5).max(12).optional(),
    attemptId: id.optional(),
    scarId: id.optional(),
    lethalReviewId: id.optional(),
    itemId: id.optional(),
    recipeId: id.optional(),
    attributeId: id.optional(),
    ammunitionId: id.optional(),
    position: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        surfaceId: id,
      })
      .strict()
      .optional(),
    knownPlace: knownPlaceReference.optional(),
    expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    expectedActionId: id.optional(),
    placementRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    expectedContentsRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    targetRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
    preparation: z.enum(['fiber', 'cord']).optional(),
  })
  .strict();
export const requestIdSchema = id;

function commandRecoveryFingerprint(input: CommandInput, scope: RequestScope): string {
  // A reconnect may read its committed result after taking control again. It cannot execute
  // through this fingerprint, nor cross a login, grant, character or restored timeline.
  // docs/projects/game-interaction-redesign-tech-design.md#direct-transfer-without-weaker-authority
  return digest({ input, scope: commandRecoveryFields(scope) });
}

function actorMilestones(
  saved: SavedWorld,
  events: WorldEvent[],
  actorId: string,
): Record<string, boolean> {
  const flags = { ...saved.actorMilestones?.[actorId] };
  for (const milestone of basePlaytestMilestones(saved.world, actorId, events, 'recording'))
    if (milestone.done) flags[milestone.id] = true;
  return flags;
}

function updateMilestones(saved: SavedWorld, events: WorldEvent[]): SavedWorld {
  const byActor = { ...saved.actorMilestones };
  if (saved.milestones) byActor[controlledEntityId(saved.world)] ??= saved.milestones;
  const source = { ...saved, actorMilestones: byActor };
  for (const entity of Object.values(saved.world.entities))
    if (entity.actor?.controller === 'player')
      byActor[entity.id] = actorMilestones(source, events, entity.id);
  const { milestones: _legacy, ...current } = saved;
  return { ...current, actorMilestones: byActor };
}

/** Latest durable world commit, in one process-local `generation` (it changes on restart and
 * load). `sequence` orders snapshots: a durability ticket is saved once `sequence >= ticket`.
 * Bounds for records created at or before the cut: awareness/memory `sequence <= nextId`,
 * event `sequence <= eventSequence`. Revisions of older records need a ticket.
 * docs/projects/ordered-async-saves.md#durable-notification-epr05-seam */
export interface DurableMark {
  revision: number;
  generation: string;
  sequence: number;
  nextId: number;
  eventSequence: number;
  simTime: number;
}
/** A background save outstanding beyond this age makes the native tick wait for it (SV19). */
const BACKGROUND_SAVE_BACKPRESSURE_MS = 4000;
/** A background save refused before BEGIN (writer queue busy) re-submits the same prepared
 * write, up to this many attempts in total (SV20). */
const BACKGROUND_SAVE_ATTEMPTS = 4;
/** Waiting commands defer new background saves, but not beyond this unsaved age (SV21). */
const BACKGROUND_SAVE_DEFERRAL_MS = 5000;
interface BackgroundSave {
  snapshot: SavedWorld;
  historyWorld: WorldState;
  appendEventCount: number | undefined;
  currentAppendCount: number | undefined;
  changes: PreparedCommit;
  released: SavedWorld;
  allocation: { commit(): void; rollback(): void };
  sequence: number;
}
/** Undefined when every record this snapshot removes from memory (hot-event trimming and
 * history release) is the exact object the durable baseline holds, so SQL already has that
 * value; otherwise the collection that would lose a not-yet-durable record. */
function nonDurableEviction(
  durable: WorldState | undefined,
  history: WorldState,
  snapshot: WorldState,
  released: WorldState,
): string | undefined {
  if (!durable) return 'baseline';
  if (history.events !== snapshot.events) {
    const kept = new Set(snapshot.events),
      held = new Set(durable.events);
    if (history.events.some((event) => !kept.has(event) && !held.has(event))) return 'events';
  }
  return evictedFrom(snapshot, released, durable, []);
}
function evictedFrom(
  before: unknown,
  after: unknown,
  durable: unknown,
  path: string[],
): string | undefined {
  const where = () => path.slice(0, path[0] === 'experience' ? 2 : 1).join('.') || 'world';
  if (before === after || before === durable || !before || typeof before !== 'object') return;
  if (!after || typeof after !== 'object') return where();
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return where();
    const kept = new Set<unknown>(after),
      held = new Set<unknown>(Array.isArray(durable) ? durable : []);
    return before.every((entry) => kept.has(entry) || held.has(entry)) ? undefined : where();
  }
  const prior =
    durable && typeof durable === 'object' ? (durable as Record<string, unknown>) : undefined;
  for (const [key, value] of Object.entries(before)) {
    const next = [...path, key];
    const failed = !Object.hasOwn(after, key)
      ? prior?.[key] === value
        ? undefined
        : next.slice(0, next[0] === 'experience' ? 2 : 1).join('.')
      : evictedFrom(value, (after as Record<string, unknown>)[key], prior?.[key], next);
    if (failed) return failed;
  }
  return;
}

/** Application coordination only: pure rules live in domain; all I/O is through a store. */
export class WorldService {
  private saved!: SavedWorld;
  private readonly personMemoryPage = createPersonMemoryPager();
  private worldEventsById = new Map<string, WorldEvent>();
  private persistedRevision = 0;
  private persistedEvents: WorldEvent[] = [];
  private persistedMemorySources?: Pick<WorldState, 'memories' | 'experience'>;
  private epoch: CommandEpoch = { generation: 0, openedAt: 0, token: '' };
  get commandEpoch(): string {
    return this.epoch.token;
  }
  private async refreshCommandEpoch(): Promise<void> {
    if (this.epoch.token && this.now() - this.epoch.openedAt < COMMAND_RETRY_MS) return;
    const next = {
      generation: this.epoch.generation + 1,
      openedAt: this.now(),
      token: randomUUID(),
    };
    await this.store.putIntegration(`command-epoch:${this.world.id}`, next);
    this.epoch = next;
    await this.store.commands?.prune(this.world.id, next.generation, this.now());
    this.notify(false);
  }
  private viewRevision = 0;
  private lastProgressSaveAt = 0;
  private unpersisted = false;
  private readonly listeners = new Set<() => void>();
  private readonly presence = new Map<string, { at: number; scope: RequestScope }>();
  private readonly presenceOrders = new Map<
    string,
    { sequence: number; at: number; controlGeneration: number }
  >();
  private readonly connections = new Map<string, RequestScope>();
  private readonly connectionPreferences = new Map<string, boolean>();
  private exits = new Map<string, ExitAttempt>();
  private lethalReviews = new Map<
    string,
    {
      requestId: string;
      inputDigest: string;
      scope: string;
      expiresAt: number;
      command: Command;
      permission: LethalPermission;
      view: NonNullable<ApiResult['lethalReview']>;
    }
  >();
  private humanActorIds: readonly string[] = [];
  private pauseWhenHidden = true;
  private currentProfile!: PlayerProfile;
  private localRequestScope?: RequestScope;
  localSessionToken = '';
  private authorityContext = new AsyncLocalStorage<Omit<AuthorityFence, 'now'> | undefined>();
  /** Only the explicit single-principal composition root may use legacy callers. */
  get localScope(): RequestScope {
    if (this.config.authentication.mode !== 'local' || !this.localRequestScope)
      throw new AuthorityError('forbidden');
    // Trusted local composition resolves the current lease for its one connection.
    // External requests keep their explicit captured scope and stale-result fences.
    return this.refreshScope({ ...this.localRequestScope, timelineId: this.timelineId });
  }
  currentScope(scope: RequestScope, capability: Capability = 'play', controlling = false): boolean {
    return (
      scope.worldId === this.world.id &&
      scope.timelineId === this.timelineId &&
      !!this.store.authority?.current(scope, capability, controlling, this.now())
    );
  }
  controlsElsewhere(scope: RequestScope): boolean {
    const controller = this.store.authority?.currentController(scope, this.now());
    return (
      !!controller &&
      controller.connectionId !== scope.connectionId &&
      this.controllerPresent(scope)
    );
  }
  private controllerPresent(scope: RequestScope): boolean {
    const controller = this.store.authority?.currentController(scope, this.now());
    if (!controller) return false;
    // The common foreground/handoff case is a direct lookup, not a per-view
    // scan of all players. Only connected clients without a heartbeat need the
    // existing bounded connection inventory.
    const presence = this.presence.get(this.presenceKey(controller));
    if (
      presence &&
      presence.at >= this.now() - 12_000 &&
      this.currentScope(presence.scope, 'play', true)
    )
      return true;
    const returning = this.presenceOrders.get(this.presenceKey(controller));
    if (
      returning?.controlGeneration === controller.controlGeneration &&
      returning.at >= this.now() - 12_000
    )
      return true;
    for (const connection of this.connections.values()) {
      if (
        connection.connectionId === controller.connectionId &&
        connection.sessionId === controller.sessionId &&
        this.currentScope(connection) &&
        this.currentScope(this.refreshScope(connection), 'play', true)
      )
        return true;
    }
    return false;
  }
  refreshScope(scope: RequestScope): RequestScope {
    this.assertScope(scope);
    return this.store.authority!.refresh(scope, this.now());
  }
  assertScope(scope: RequestScope, capability: Capability = 'play', controlling = false): void {
    if (!this.currentScope(scope, capability, controlling))
      throw new AuthorityError(controlling ? 'control-changed' : 'stale-scope');
  }
  async authenticationMutation<T>(operation: () => Promise<T>): Promise<T> {
    return this.mutate(operation);
  }
  /** Explicit loopback sign-in renews a revoked local login; ordinary reads never do. */
  async signInLocal(): Promise<string> {
    if (this.config.authentication.mode !== 'local') throw new AuthorityError('forbidden');
    return this.authenticationMutation(async () => {
      const login = await this.store.authority!.login(
        { issuer: 'https://local.openlegend.invalid', subject: 'local-player' },
        this.now(),
        this.config.authentication.sessionMs,
        this.config.capacity.sessions,
      );
      this.localSessionToken = login.token;
      this.localRequestScope = await this.requestScope(login.session, 'local-internal');
      return login.token;
    });
  }
  async requestScope(session: LoginSession, connectionId: string): Promise<RequestScope> {
    if (!this.store.authority) throw new AuthorityError('session');
    return this.store.authority.scope(session, this.world.id, this.timelineId, connectionId);
  }
  /** Scope is explicit at entry; this context only carries the SQL publication fence,
   * never the actor/profile selected by an operation. Nested work retains its origin. */
  async authorized<T>(
    scope: RequestScope,
    capability: Capability,
    controlling: boolean,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.mutate(async () => {
      this.assertScope(scope, capability, controlling);
      return this.authorityContext.run({ scope, capability, controlling }, async () => {
        await this.store.authority!.assertFence({
          scope,
          capability,
          controlling,
          now: this.now,
        });
        return operation();
      });
    });
  }
  private readonly profiles = new Map<string, Promise<PlayerProfile>>();
  async profileFor(scope: RequestScope): Promise<PlayerProfile> {
    this.assertScope(scope);
    // Preferences change through setPreferences, not with every simulation frame.
    // Bound retained accounts by the same capacity as their connected views.
    let pending = this.profiles.get(scope.accountId);
    if (!pending) {
      while (this.profiles.size >= this.config.capacity.connections)
        this.profiles.delete(this.profiles.keys().next().value!);
      pending = this.store.getProfile(scope.accountId);
      this.profiles.set(scope.accountId, pending);
      const captured = pending;
      void pending.catch(() => {
        if (this.profiles.get(scope.accountId) === captured) this.profiles.delete(scope.accountId);
      });
    }
    const loaded = await pending;
    const latest = this.profiles.get(scope.accountId);
    const profile = latest && latest !== pending ? await latest : loaded;
    this.assertScope(scope);
    return profile;
  }
  milestonesFor(actorId: string): Readonly<Record<string, boolean>> {
    return this.saved.actorMilestones?.[actorId] ?? {};
  }

  readonly ready: Promise<void>;
  private readonly hostWork = new HostWork(this);
  releaseHostWork(): void {
    this.hostWork.close();
  }
  private readonly mutationLane = new WorkLane('mutation');
  private mutationContext = new AsyncLocalStorage<{ active: boolean }>();
  /** Run one change to the world in the mutation queue. `progress` marks simulation progress
   * (ticks, computed routes), whose own saves are background saves; every other operation
   * (commands, AI results, reads) saves synchronously if it saves at all. */
  private async mutate<T>(operation: () => Promise<T>, progress = false): Promise<T> {
    if (this.mutationContext.getStore()?.active) return await operation();
    if (progress) return this.runMutation(operation);
    // Commands and reads should not own the queue while waiting for a background save's I/O;
    // native ticks and computed-route publication keep running meanwhile. The wait keeps the
    // queue's admission deadline, so a stalled write still yields a busy result, not a hang.
    // While this operation is pending no new background save starts; its own synchronous
    // save, if any, carries the simulation progress.
    // docs/projects/ordered-async-saves.md#ordering-rules
    this.pendingOperations++;
    const arrived = performance.now();
    try {
      if (this.backgroundSave) await this.awaitBackgroundSave(this.mutationLane.waitMs);
      // One admission budget covers the wait above and the queue.
      return await this.runMutation(
        operation,
        this.mutationLane.waitMs - (performance.now() - arrived),
      );
    } finally {
      if (--this.pendingOperations === 0) this.releaseSnapshotRequest();
    }
  }
  /** Top-level operations other than simulation progress that are waiting for, or holding,
   * the queue. While any is pending, no new background save starts (SV21). */
  private pendingOperations = 0;
  private runMutation<T>(operation: () => Promise<T>, waitMs?: number): Promise<T> {
    return this.mutationLane.run(() => {
      const scope = { active: true };
      const startedAt = performance.now();
      return this.mutationContext.run(scope, async () => {
        try {
          return await operation();
        } finally {
          scope.active = false;
          // How long one operation owned the queue (PF00 save-path attribution).
          recordDuration('mutation.hold', performance.now() - startedAt);
        }
      });
    }, waitMs);
  }
  /** Wait, without the admission deadline, until no background save remains (shutdown).
   * Settling one can release a waiting durability request, which starts the next save (in the
   * background, or synchronously inside the queue) before this method resumes; the caller's
   * deadline bounds it. */
  async settleBackgroundSaves(): Promise<void> {
    do {
      await this.backgroundSave?.done;
      await this.mutationLane.idle();
    } while (this.backgroundSave);
  }
  private async awaitBackgroundSave(deadlineMs: number): Promise<void> {
    const write = this.backgroundSave;
    if (!write) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), deadlineMs);
    });
    try {
      if (await Promise.race([write.done.then(() => false), expired])) throw new OverloadError();
    } finally {
      clearTimeout(timer);
    }
  }
  private debtSeconds = 0;
  private storageFailure: string | null = null;
  /** Latched storage failure. Every assignment, from any caller, rejects durability waiters:
   * no later snapshot will be written in this process. */
  get storageError(): string | null {
    return this.storageFailure;
  }
  set storageError(message: string | null) {
    this.storageFailure = message;
    if (message) {
      this.snapshotRequested = false;
      this.rejectDurableWaiters(new Error(message));
    }
  }
  memoryBacklog: string | null = null;
  generation = randomUUID();
  timelineId: string = randomUUID();

  constructor(
    readonly store: GameRepository,
    readonly config: AppConfig,
    private readonly now = Date.now,
  ) {
    this.ready = this.initialize();
  }
  private async initialize() {
    const { store, config } = this;
    await initializeCollisionRuntime();
    await store.ready;
    this.currentProfile = await store.getProfile('local-player');
    const existing = await store.load(true);
    if (existing) validateWorldModules(existing.state.world);
    this.pauseWhenHidden = this.currentProfile.preferences.pauseWhenHidden;
    const creationAccounts = {
      creatorAccountIds: [this.currentProfile.id],
      playerAccountId: this.currentProfile.id,
    };
    this.saved = existing?.state ?? {
      world:
        config.worldPreset === 'touch-demo'
          ? createTouchDemo(config.seed, creationAccounts)
          : config.worldPreset === 'reservoir-demo'
            ? createReservoirDemo(config.seed, creationAccounts)
            : createWorld(config.seed, creationAccounts),
      speed: 1,
      manuallyPaused: false,
    };
    if (!store.authority) throw new Error('Current authority repository is required.');
    const bindings =
      config.authentication.mode === 'local'
        ? [
            {
              issuer: 'https://local.openlegend.invalid',
              subject: 'local-player',
              accountId: 'local-player',
              actorId: controlledEntityId(this.saved.world),
              capabilities: [
                'play',
                'save',
                ...(config.godMode ? (['create', 'inspect', 'manage-access'] as const) : []),
              ] as Capability[],
            },
          ]
        : config.authentication.bindings;
    const existingGrants = await store.authority.worldGrants(this.saved.world.id);
    const actorBindings = new Map(
      existingGrants.flatMap((grant) => (grant.actorId ? [[grant.actorId, grant.accountId]] : [])),
    );
    for (const binding of bindings)
      if (binding.actorId && !existingGrants.some((grant) => grant.accountId === binding.accountId))
        actorBindings.set(binding.actorId, binding.accountId);
    const actorOwners = new Map([
      ...Object.entries(this.saved.world.authorship.playerAccountIds),
      ...(await store.authority.actorOwners(this.saved.world.id)),
      ...actorBindings,
    ]);
    // Validate identities before either world or grant publication. SQL provisions the entire
    // configured set inside the same startup transaction as the canonical world records.
    for (const actorId of actorBindings.keys())
      if (!this.saved.world.entities[actorId]?.actor)
        throw new Error('Configured actor binding does not exist in this world.');
    this.persistedRevision = existing?.revision ?? 0;
    this.persistedEvents = this.saved.world.events;
    this.viewRevision = this.persistedRevision;
    this.saved = {
      ...this.saved,
      world: updateWorld(this.saved.world, (world) => {
        world.storyPolicy ??= defaultStoryPolicy();
        validateStoryPolicy(world.storyPolicy);
        world.minds ??= {};
        for (const entity of Object.values(world.entities))
          if (hasMemory(entity)) world.minds[entity.id] ??= mindFor(world, entity.id);
        migrateCognition(world);
        initializeActorTraits(world);
        world.socialPolicy = {
          conversationInactivitySeconds: config.conversationInactivitySeconds,
          notableThreshold: 8,
        };
        for (const [actorId, accountId] of actorOwners) {
          const actor = world.entities[actorId]?.actor;
          if (!actor) continue;
          actor.controller = 'player';
          world.authorship.playerAccountIds[actorId] = accountId;
        }
        if (!existing) {
          initializePerception(world, []);
          for (const entity of Object.values(world.entities))
            reconcileConditions(world, entity, []);
        }
        world.paused = true;
      }),
    };
    this.saved = updateMilestones(this.saved, this.saved.world.events);
    // Startup initialization can add actor state, so use the ordinary diff once.
    const startupHistory = this.saved.world;
    if (store.history) this.saved = { ...this.saved, world: retainHotEvents(startupHistory) };
    const startupAllocation = this.hostWork.reserve(this.saved.world);
    try {
      this.persistedRevision = await store.commit(
        this.persistedRevision,
        this.saved,
        undefined,
        undefined,
        { after: startupHistory, authorityBindings: bindings, authorityOwners: actorOwners },
      );
      startupAllocation.commit();
    } catch (error) {
      startupAllocation.rollback();
      throw error;
    }
    if (store.releaseHistory) this.saved = store.releaseHistory(this.saved);
    freezeWorld(this.saved.world);
    this.rememberPersistedMemorySources();
    this.persistedEvents = this.saved.world.events;
    this.worldEventsById = new Map(this.saved.world.events.map((event) => [event.id, event]));
    this.epoch =
      ((await store.getIntegration(`command-epoch:${this.world.id}`)) as CommandEpoch) ??
      this.epoch;
    await this.refreshCommandEpoch();
    this.timelineId =
      ((await store.getIntegration(`world-timeline:${this.world.id}`)) as string) ||
      this.timelineId;
    await store.putIntegration(`world-timeline:${this.world.id}`, this.timelineId);
    if (!store.authority) throw new Error('Current authority repository is required.');
    if (config.authentication.mode === 'local') {
      await this.signInLocal();
    }
    this.humanActorIds = Object.values(this.world.entities)
      .filter((entity) => entity.actor?.controller === 'player')
      .map((entity) => entity.id);
    store.authority.subscribe(() => this.notify(false));
    this.viewRevision = this.persistedRevision;
    this.lastProgressSaveAt = this.now();
    this.publishDurable(this.persistedRevision, this.snapshotSequence, this.saved.world);
    await store.recoverInterruptedWork();
    this.exits = new Map(
      (await store.authority.exitAttempts(this.world.id)).map((attempt) => [
        attempt.actorId,
        attempt,
      ]),
    );
    // Restart has no verified live transports. Existing deadlines are retained, never extended.
    await this.reconcileParticipation();
  }

  get controlledEntityId(): string {
    if (this.config.authentication.mode !== 'local') throw new AuthorityError('forbidden');
    return controlledEntityId(this.world);
  }
  get defaultResidentEntityId(): string {
    return defaultResidentEntityId(this.world);
  }

  get world(): WorldState {
    return this.saved.world;
  }
  worldEvent(eventId: string): WorldEvent | undefined {
    return this.worldEventsById.get(eventId);
  }
  // Compatibility for the explicit loopback single-principal composition root.
  get profile(): PlayerProfile {
    if (this.config.authentication.mode !== 'local') throw new AuthorityError('forbidden');
    return this.currentProfile;
  }
  /** Derived recall publication always enters a fresh mutation turn, including callbacks
   * that inherited an earlier AsyncLocalStorage context. Providers remain outside this lane. */
  async publishRecall<T>(operation: () => Promise<T>): Promise<T> {
    return this.mutationContext.exit(() => this.mutate(operation));
  }
  async setPreferences(
    preferences: PlayerPreferencePatch,
    scope = this.localScope,
  ): Promise<PlayerProfile> {
    return this.mutate(async () => {
      await this.ready;
      this.assertScope(scope);
      const priorPauseWhenHidden =
        this.connectionPreferences.get(scope.accountId) ?? this.pauseWhenHidden;
      const profile = await this.store.setPreferences(scope.accountId, preferences);
      if (
        !this.profiles.has(scope.accountId) &&
        this.profiles.size >= this.config.capacity.connections
      )
        this.profiles.delete(this.profiles.keys().next().value!);
      this.profiles.set(scope.accountId, Promise.resolve(profile));
      this.assertScope(scope);
      if (this.config.authentication.mode === 'local') this.currentProfile = profile;
      const pausePolicyChanged = priorPauseWhenHidden !== profile.preferences.pauseWhenHidden;
      if (this.config.authentication.mode === 'local')
        this.pauseWhenHidden = profile.preferences.pauseWhenHidden;
      this.connectionPreferences.set(scope.accountId, profile.preferences.pauseWhenHidden);
      if (pausePolicyChanged) await this.syncPause();
      else this.notify(false);
      return profile;
    });
  }
  get version(): number {
    return this.viewRevision;
  }
  get speed(): number {
    return this.saved.speed;
  }
  get milestones(): Readonly<Record<string, boolean>> {
    return this.milestonesFor(this.controlledEntityId);
  }
  get paused(): boolean {
    return (
      this.saved.manuallyPaused || this.maintenanceHeld || this.absent || this.storageError !== null
    );
  }
  /** Operational MP03 hold and public notice, owned by MaintenanceSchedule and outside
   * gameplay saves. docs/projects/multiplayer-entry-maintenance.md#decisions */
  maintenanceNotice: MaintenanceWindowView | null = null;
  private maintenanceHeld = false;
  get maintenanceActive(): boolean {
    return this.maintenanceHeld;
  }
  /** Persist an operational change, then publish its hold and notice at one writer boundary.
   * Entering or leaving the hold drops pending simulation debt (no catch-up) and rotates the
   * world generation, so no job or result admitted before a boundary applies after it. */
  async changeMaintenance(
    held: boolean,
    notice: MaintenanceWindowView | null,
    persist: () => Promise<void>,
  ): Promise<void> {
    return this.mutate(async () => {
      await this.ready;
      await persist();
      this.maintenanceNotice = notice;
      if (this.maintenanceHeld !== held) {
        this.maintenanceHeld = held;
        this.generation = randomUUID();
      }
      await this.syncPause();
    });
  }
  private get absent(): boolean {
    if (this.present) return false;
    if (Object.keys(this.world.exitExposures ?? {}).length) return false;
    // Non-browser clients may opt into connected background play. Game tabs
    // always release control on blur, so an old stream cannot keep them active.
    for (const scope of this.connections.values()) {
      if (
        this.currentScope(scope) &&
        this.currentScope(this.refreshScope(scope), 'play', true) &&
        this.connectionPreferences.get(scope.accountId) === false
      )
        return false;
    }
    return true;
  }
  async setConnection(
    connectionId: string,
    connected: boolean,
    scope = this.localScope,
  ): Promise<void> {
    // Transport callbacks can inherit the context of the write that closes a stream.
    // Give them their own queue turn without borrowing that write's request authority.
    return this.mutationContext.exit(() =>
      this.authorityContext.run(undefined, () =>
        this.mutate(async () => {
          await this.ready;

          if (connected) {
            this.assertScope(scope);
            if (this.connections.size >= this.config.capacity.connections)
              throw new Error('Connection capacity reached.');
            this.connections.set(connectionId, scope);
            this.connectionPreferences.set(
              scope.accountId,
              (await this.profileFor(scope)).preferences.pauseWhenHidden,
            );
          } else {
            const previous = this.connections.get(connectionId);
            this.connections.delete(connectionId);
            if (
              previous &&
              ![...this.connections.values()].some(
                (item) => this.presenceKey(item) === this.presenceKey(previous),
              )
            ) {
              this.presence.delete(this.presenceKey(previous));
              this.presenceOrders.delete(this.presenceKey(previous));
              if (
                ![...this.connections.values()].some(
                  (item) => item.accountId === previous.accountId,
                )
              )
                this.connectionPreferences.delete(previous.accountId);
            }
          }
          await this.reconcileDisconnectedConversation();
          await this.reconcileParticipation();
          if (this.world.paused !== this.paused) await this.syncPause();
        }),
      ),
    );
  }
  private async reconcileDisconnectedConversation(): Promise<void> {
    if (this.config.authentication.mode !== 'local') return;
    if (this.present || this.connections.size > 0) this.disconnectedAt = null;
    else this.disconnectedAt ??= this.now();
    if (
      this.disconnectedAt !== null &&
      this.now() - this.disconnectedAt >= this.config.conversationDisconnectMs &&
      this.world.conversations?.active[this.controlledEntityId]
    ) {
      const world = updateWorld(this.world, (draft) =>
        leaveConversation(draft, this.controlledEntityId, 'disconnect'),
      );
      if (!(await this.commit({ ...this.saved, world }, undefined, 'unchanged'))) return;
    }
  }
  get present(): boolean {
    const cutoff = this.now() - 12_000;
    for (const [key, entry] of this.presence)
      if (entry.at < cutoff || !this.currentScope(entry.scope, 'play', true)) {
        this.presence.delete(key);
        if (![...this.connections.values()].some((scope) => this.presenceKey(scope) === key))
          this.presenceOrders.delete(key);
      }
    for (const [key, entry] of this.presenceOrders)
      if (
        entry.at < cutoff &&
        ![...this.connections.values()].some((scope) => this.presenceKey(scope) === key)
      )
        this.presenceOrders.delete(key);
    return this.presence.size > 0;
  }
  get pauseReason(): 'manual' | 'away' | 'storage' | 'maintenance' | null {
    return this.storageError
      ? 'storage'
      : this.maintenanceHeld
        ? 'maintenance'
        : this.saved.manuallyPaused
          ? 'manual'
          : this.absent
            ? 'away'
            : null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private disconnectedAt: number | null = null;
  telemetryRevision = 0;
  private transcriptRevision = 0;
  private eventViewRevisions = new Map<string, number>();
  worldEventsRevision(actorId: string): string {
    return `${this.generation}:${this.eventViewRevisions.get(actorId) ?? 0}:${this.transcriptEpoch}`;
  }
  private transcriptEpoch = 0;
  get historyEpoch(): string {
    return `${this.generation}:${this.transcriptEpoch}`;
  }
  get historyRevision(): string {
    return `${this.generation}:${this.transcriptRevision}`;
  }
  private updateHistoryRevision(
    before: WorldEvent[],
    after: WorldEvent[],
    count: number | undefined,
  ) {
    // Refresh only observers whose permitted event log changed. Unheard speech must not
    // generate a public activity signal or a history request for unrelated observers.
    const observers = new Set(
      (count === undefined ? [...before, ...after] : count ? after.slice(-count) : []).flatMap(
        (event) => event.audience,
      ),
    );
    for (const actorId of observers)
      this.eventViewRevisions.set(actorId, (this.eventViewRevisions.get(actorId) ?? 0) + 1);
    if (count === undefined && before !== after) this.transcriptEpoch++;
    const relevant = (event: WorldEvent) =>
      !(
        event.type === 'action-started' &&
        (event.data?.['actionType'] === 'move' || event.text.endsWith(' started move.'))
      );
    const changed =
      count === undefined
        ? JSON.stringify(before.filter(relevant)) !== JSON.stringify(after.filter(relevant))
        : after.slice(after.length - count).some(relevant);
    if (changed) {
      this.transcriptRevision++;
    }
  }
  /** Presentation changes need the same refresh signal as committed journal sources. */
  notifyHistory(): void {
    this.transcriptRevision++;
    this.notify();
  }
  /** Serialize the last evidence/access check with character and world mutations.
   * Prose cannot publish after an inspection permission or destination has changed. */
  async publishNarration(job: StoryJob, text: string | null, reason?: string, receipt?: unknown) {
    return this.mutate(async () => {
      const repository = this.store.history!;
      if (!(await repository.selectionCurrent(() => this.world, job))) {
        await repository.cancel(this.world.id, job, receipt);
        return false;
      }
      return repository.publish(this.world.id, job, text, reason, receipt);
    });
  }
  notify(telemetry = true): void {
    if (telemetry) this.telemetryRevision++;
    this.viewRevision++;
    for (const listener of this.listeners) listener();
  }

  /** Milestones and hot-event placement shared by every world write. */
  private prepareSnapshot(saved: SavedWorld): {
    snapshot: SavedWorld;
    historyWorld: WorldState;
    appendEventCount: number | undefined;
    currentAppendCount: number | undefined;
  } {
    // Measure from durable state, including simulation progress a synchronous save carried.
    const appendEventCount = appendedEventCount(this.persistedEvents, saved.world.events);
    const currentAppendCount = appendedEventCount(this.saved.world.events, saved.world.events);
    let snapshot = updateMilestones(
      saved,
      currentAppendCount === undefined
        ? saved.world.events
        : currentAppendCount
          ? saved.world.events.slice(-currentAppendCount)
          : [],
    );
    const historyWorld = snapshot.world;
    if (this.store.history) {
      const hot = retainHotEvents(compactHistory(historyWorld, this.saved.world));
      snapshot = {
        ...snapshot,
        world: updateWorld(historyWorld, (draft) => {
          draft.events = hot.events;
          draft.archivedEventCount = hot.archivedEventCount;
        }),
      };
    }
    return { snapshot, historyWorld, appendEventCount, currentAppendCount };
  }

  private installWorld(
    saved: SavedWorld,
    historyWorld: WorldState,
    currentAppendCount: number | undefined,
  ): void {
    freezeWorld(saved.world);
    this.saved = saved;
    if (currentAppendCount === undefined || saved.world.events !== historyWorld.events)
      this.worldEventsById = new Map(saved.world.events.map((event) => [event.id, event]));
    else
      for (const event of saved.world.events.slice(this.worldEventsById.size))
        this.worldEventsById.set(event.id, event);
  }

  private async commit(
    saved: SavedWorld,
    invalidatedMemoryIds: Record<string, string[]> | undefined,
    eventMode: 'unchanged' | 'append' | 'diff',
    historyBefore?: WorldState,
    receipt?: GameplayReceipt,
    restore?: RestoreSave,
    authorityChanges?: {
      bindingChange?: { scope: RequestScope; request: BindingRequest; now: () => number };
      controlChange?: {
        scope: RequestScope;
        request: ControlRequest;
        now: () => number;
        unattended: boolean;
      };
      participationChange?: { actorId: string; attempt: ExitAttempt | null };
      operationalChange?: () => Promise<void>;
    },
  ): Promise<boolean> {
    // Synchronous save. One writer in snapshot order: an in-flight background save commits
    // first, and a failed one stops every later write
    // (docs/projects/ordered-async-saves.md#ordering-rules).
    await this.backgroundSave?.done;
    if (this.storageError) return false;
    let allocation: ReturnType<HostWork['reserve']> | undefined;
    try {
      freezeWorld(saved.world);
      allocation = this.hostWork.reserve(saved.world);
      if (eventMode === 'unchanged' && saved.world.events !== this.saved.world.events)
        throw new Error(
          'A transition declared unchanged events but replaced the event collection.',
        );
      const prepared = this.prepareSnapshot(saved);
      const { historyWorld, appendEventCount, currentAppendCount } = prepared;
      saved = prepared.snapshot;
      const revision = await timed('world.commit', () =>
        this.store.commit(this.persistedRevision, saved, invalidatedMemoryIds, appendEventCount, {
          before: historyBefore,
          after: historyWorld,
          receipt,
          restore,
          ...authorityChanges,
          ...(this.authorityContext.getStore()
            ? { authority: { ...this.authorityContext.getStore()!, now: this.now } }
            : {}),
        }),
      );
      this.persistedRevision = revision;
      allocation.commit();
      this.updateHistoryRevision(
        historyBefore?.events ?? this.persistedEvents,
        historyWorld.events,
        historyBefore ? undefined : appendEventCount,
      );
      if (this.saved.world.experience?.forgotten !== saved.world.experience?.forgotten) {
        this.transcriptRevision++;
        this.transcriptEpoch++;
      }
      if (invalidatedMemoryIds && Object.values(invalidatedMemoryIds).some((ids) => ids.length)) {
        this.transcriptRevision++;
        this.transcriptEpoch++;
      }
      if (this.store.releaseHistory) saved = this.store.releaseHistory(saved);
      this.installWorld(saved, historyWorld, currentAppendCount);
      this.persistedEvents = saved.world.events;
      this.rememberPersistedMemorySources();
      this.unpersisted = false;
      this.lastProgressSaveAt = this.now();
      // A load publishes its first mark only after the new timeline generation is installed.
      if (restore) this.durableSequence = ++this.snapshotSequence;
      else this.publishDurable(revision, ++this.snapshotSequence, saved.world);
      this.notify(false);
      return true;
    } catch (error) {
      allocation?.rollback();
      if (error instanceof WorkBudgetError) {
        this.storageError = `${error.message} Required native work is paused before publication.`;
        this.notify(false);
        return false;
      }
      if (error instanceof AuthorityError || error instanceof OverloadError) throw error;
      this.storageError =
        'The save could not be committed. Simulation is paused; restart after resolving storage access.';
      this.notify(false);
      return false;
    }
  }

  // Saves come in two kinds (docs/save-and-load.md#background-and-synchronous-world-saves):
  // - Background save: simulation progress (ticks, computed routes) is prepared in the queue,
  //   then written while the game keeps running (`backgroundSave`, `commitBackgroundSave`).
  //   It is shown before it is saved, as it always was.
  // - Synchronous save: commands, AI results, pause/resume, editors and loads hold the queue
  //   until written and are shown only afterwards (`commit`). Simulation progress is also
  //   saved synchronously when a background save would drop an unsaved record from memory
  //   (the synchronous branch of `saveProgress`, SB20).
  // docs/projects/ordered-async-saves.md#ordered-persistence-design
  private backgroundSave?: { startedAt: number; sequence: number; done: Promise<void> };
  private snapshotSequence = 0;
  private durableSequence = 0;
  private snapshotRequested = false;
  private durableWaiters: Array<{
    sequence: number;
    resolve: (mark: DurableMark) => void;
    reject: (error: Error) => void;
  }> = [];
  private readonly durableListeners = new Set<(mark: DurableMark) => void>();
  /** Latest durable world commit; see DurableMark. */
  durable: DurableMark = {
    revision: 0,
    generation: '',
    sequence: 0,
    nextId: 0,
    eventSequence: 0,
    simTime: 0,
  };
  /** Collections that forced a synchronous save of simulation progress (SB20), for PF00. */
  readonly synchronousProgressSaves = new Map<string, number>();

  /** Sequence of the first snapshot that will contain the live world as it is now. */
  durabilityTicket(): number {
    return this.unpersisted ? this.snapshotSequence + 1 : this.snapshotSequence;
  }
  isDurable(ticket: number): boolean {
    return this.durableSequence >= ticket;
  }

  /** Notified after every durable world commit, in revision order, after the PostgreSQL
   * COMMIT and its after-commit hooks. Listeners must not throw or mutate the world directly. */
  onDurable(listener: (mark: DurableMark) => void): () => void {
    this.durableListeners.add(listener);
    return () => {
      this.durableListeners.delete(listener);
    };
  }

  private publishDurable(revision: number, sequence: number, world: WorldState): void {
    this.durableSequence = sequence;
    const mark = (this.durable = {
      revision,
      generation: this.generation,
      sequence,
      nextId: world.nextId,
      eventSequence: world.sequence,
      simTime: world.simTime,
    });
    const covered = this.durableWaiters.filter((waiter) => waiter.sequence <= sequence);
    this.durableWaiters = this.durableWaiters.filter((waiter) => waiter.sequence > sequence);
    for (const waiter of covered) waiter.resolve(mark);
    if (!this.durableListeners.size) return;
    // Deliver from a root context: a listener never runs as nested work of the committing
    // operation, never inherits its request authority and cannot fail the save.
    this.mutationContext.exit(() =>
      this.authorityContext.run(undefined, () =>
        queueMicrotask(() => {
          for (const listener of this.durableListeners)
            try {
              listener(mark);
            } catch {
              // Optional observers do not affect durability.
            }
        }),
      ),
    );
  }

  private releaseSnapshotRequest(): void {
    if (
      !this.snapshotRequested ||
      this.backgroundSave ||
      this.pendingOperations ||
      this.storageError
    )
      return;
    this.snapshotRequested = false;
    void this.mutate(() => this.saveRequestedProgress(), true).catch((error: unknown) =>
      // A lost follow-up request must not leave callers waiting forever.
      this.rejectDurableWaiters(error instanceof Error ? error : new Error(String(error))),
    );
  }

  private rejectDurableWaiters(error: Error): void {
    for (const waiter of this.durableWaiters.splice(0)) waiter.reject(error);
  }

  /** Resolves once the live world as it is now has been durably committed. Outside the
   * mutation queue this waits without holding it; inside, it commits synchronously.
   * docs/projects/ordered-async-saves.md#durable-notification-epr05-seam */
  async whenDurable(): Promise<DurableMark> {
    await this.ready;
    if (this.mutationContext.getStore()?.active) {
      await this.flush();
      return this.durable;
    }
    const target = await this.mutate(() => this.requestDurable(), true);
    if (target === undefined || this.durableSequence >= target) return this.durable;
    if (this.storageError) throw new Error(this.storageError);
    return new Promise((resolve, reject) =>
      this.durableWaiters.push({ sequence: target, resolve, reject }),
    );
  }

  /** In the queue: the snapshot sequence that will cover the current live world. */
  private async requestDurable(): Promise<number | undefined> {
    if (this.storageError) throw new Error(this.storageError);
    if (this.backgroundSave) {
      if (!this.unpersisted) return this.backgroundSave.sequence;
      this.snapshotRequested = true;
      return this.snapshotSequence + 1;
    }
    if (!this.unpersisted) return undefined;
    // A waiting command's synchronous save will cover this; do not make it wait behind a write.
    if (this.pendingOperations) {
      this.snapshotRequested = true;
      return this.snapshotSequence + 1;
    }
    if (!(await this.saveProgress(this.saved)))
      throw new Error(this.storageError ?? 'The pending world changes could not be saved.');
    // Background save: the write just started. Synchronous fallback: already durable.
    return this.pendingWriteSequence();
  }
  private pendingWriteSequence(): number | undefined {
    return this.backgroundSave?.sequence;
  }

  /** Save one snapshot of simulation progress: a background save when every record it removes
   * from memory is already durable; otherwise a synchronous save, as before (SB20).
   * docs/projects/ordered-async-saves.md#ordering-rules */
  private async saveProgress(saved: SavedWorld): Promise<boolean> {
    const { store } = this;
    if (this.storageError) return false;
    if (this.backgroundSave) return this.acceptProgress(saved);
    if (!store.prepareCommit || !store.releasedHistory || !store.adoptHistory)
      return this.commit(saved, undefined, 'append');
    let allocation: ReturnType<HostWork['reserve']> | undefined;
    let write: BackgroundSave;
    try {
      freezeWorld(saved.world);
      allocation = this.hostWork.reserve(saved.world);
      const prepared = this.prepareSnapshot(saved);
      // Preparation assigns canonical record positions; release reuses them.
      const changes = store.prepareCommit(this.persistedRevision, prepared.snapshot, {
        after: prepared.historyWorld,
      });
      const released = store.releasedHistory(prepared.snapshot);
      freezeWorld(released.world);
      write = { ...prepared, changes, released, allocation, sequence: 0 };
    } catch (error) {
      allocation?.rollback();
      if (error instanceof WorkBudgetError) {
        this.storageError = `${error.message} Required native work is paused before publication.`;
        this.notify(false);
        return false;
      }
      return this.failProgressSave(error);
    }
    const unsafe = nonDurableEviction(
      write.changes.baseline?.world,
      write.historyWorld,
      write.snapshot.world,
      write.released.world,
    );
    if (unsafe) {
      // A record created or changed since the last durable save would leave memory before
      // SQL has it. Keep the invariant with today's order: write, then release (reusing the
      // same prepared change set and release, which are not idempotent to recompute).
      countMetric('persistence.synchronousProgressSaves');
      this.synchronousProgressSaves.set(
        unsafe,
        (this.synchronousProgressSaves.get(unsafe) ?? 0) + 1,
      );
      let revision: number;
      try {
        // One attempt: this path holds the queue, so a refusal is retried by the next tick.
        revision = await this.commitProgress(write);
      } catch (error) {
        write.allocation.rollback();
        // Nothing was installed or written; the next tick recomputes this progress and release.
        discardedHistoryRelease(write.snapshot.world);
        if (error instanceof OverloadError) throw error;
        return this.failProgressSave(error);
      }
      write.allocation.commit();
      this.installWorld(write.released, write.historyWorld, write.currentAppendCount);
      this.unpersisted = false;
      this.publishDurable(revision, ++this.snapshotSequence, write.released.world);
      this.notify(false);
      return true;
    }
    countMetric('persistence.backgroundSaves');
    write.allocation.commit();
    this.installWorld(write.released, write.historyWorld, write.currentAppendCount);
    this.unpersisted = false;
    write.sequence = ++this.snapshotSequence;
    const startedAt = performance.now();
    gaugeMetric('persistence.backgroundSavesInFlight', 1);
    // A fresh context: the write outlives this mutation, and its settle hooks must not be
    // mistaken for nested queue work or inherit a request's authority fence.
    // Settles without rejecting: a failure is recorded in storageError, never thrown here.
    // The released world is already live, so this prepared change set is the only valid
    // successor of the durable baseline: it either commits or latches storageError. A new
    // snapshot is never diffed against the unreleased baseline, which would delete the
    // records this release evicted.
    const done = this.mutationContext.exit(() =>
      this.authorityContext.run(undefined, async () => {
        try {
          const revision = await this.commitBackgroundSave(write);
          this.backgroundSave = undefined;
          this.publishDurable(revision, write.sequence, write.released.world);
          this.notify(false);
        } catch (error) {
          this.backgroundSave = undefined;
          this.failProgressSave(error, false);
        } finally {
          gaugeMetric('persistence.backgroundSavesInFlight', 0);
          recordDuration('persistence.backgroundSave', performance.now() - startedAt);
        }
        this.releaseSnapshotRequest();
      }),
    );
    this.backgroundSave = { startedAt, sequence: write.sequence, done };
    this.notify(false);
    return true;
  }

  private async saveRequestedProgress(): Promise<void> {
    if (this.storageError) return;
    if (this.backgroundSave || this.pendingOperations) {
      this.snapshotRequested = true;
      return;
    }
    if (this.unpersisted) await this.saveProgress(this.saved);
    // Already covered by a later synchronous save.
    else for (const waiter of this.durableWaiters.splice(0)) waiter.resolve(this.durable);
  }

  /** A write refused before BEGIN (writer queue full or busy) ran nothing, so the same prepared
   * change set is re-submitted after a growing pause; a full queue refuses instantly and needs
   * time to drain. Any other error, or the last refusal, is returned to the caller. */
  private async commitBackgroundSave(write: BackgroundSave): Promise<number> {
    for (let attempt = 1; ; attempt++)
      try {
        return await this.commitProgress(write);
      } catch (error) {
        if (!(error instanceof OverloadError) || attempt >= BACKGROUND_SAVE_ATTEMPTS) throw error;
        countMetric('persistence.backgroundSaveRetries');
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
  }

  /** Commit a prepared snapshot of simulation progress (background or synchronous) and adopt
   * its released form as the durable baseline in the same continuation, before any other
   * preparation can run. */
  private async commitProgress(write: BackgroundSave): Promise<number> {
    const revision = await timed('world.commit', () =>
      this.store.commit(write.changes.revision, write.snapshot, undefined, write.appendEventCount, {
        after: write.historyWorld,
        prepared: write.changes,
      }),
    );
    this.store.adoptHistory!(write.snapshot, write.released);
    this.persistedRevision = revision;
    this.updateHistoryRevision(
      this.persistedEvents,
      write.historyWorld.events,
      write.appendEventCount,
    );
    if (
      write.changes.baseline?.world.experience?.forgotten !==
      write.snapshot.world.experience?.forgotten
    ) {
      this.transcriptRevision++;
      this.transcriptEpoch++;
    }
    this.persistedEvents = write.released.world.events;
    this.persistedMemorySources = {
      memories: write.released.world.memories,
      experience: write.released.world.experience,
    };
    this.lastProgressSaveAt = this.now();
    return revision;
  }

  private failProgressSave(error: unknown, rethrowAuthority = true): false {
    if (rethrowAuthority && error instanceof AuthorityError) throw error;
    // The snapshot never became durable. Every later commit re-checks this latch, so no
    // newer state is written on top of an unknown baseline; restart reloads the last revision.
    this.unpersisted = true;
    this.storageError =
      'The save could not be committed. Simulation is paused; restart after resolving storage access.';
    this.rejectDurableWaiters(new Error(this.storageError));
    this.notify(false);
    return false;
  }

  private acceptProgress(saved: SavedWorld): boolean {
    let allocation: ReturnType<HostWork['reserve']> | undefined;
    try {
      allocation = this.hostWork.reserve(saved.world);
      const appended = appendedEventCount(this.saved.world.events, saved.world.events);
      const next = updateMilestones(
        saved,
        appended === undefined
          ? saved.world.events
          : appended
            ? saved.world.events.slice(-appended)
            : [],
      );
      freezeWorld(next.world);
      if (appended === undefined)
        this.worldEventsById = new Map(next.world.events.map((event) => [event.id, event]));
      else
        for (const event of next.world.events.slice(this.worldEventsById.size))
          this.worldEventsById.set(event.id, event);
      this.saved = next;
      allocation.commit();
      this.unpersisted = true;
      this.notify(false);
      return true;
    } catch (error) {
      allocation?.rollback();
      if (!(error instanceof WorkBudgetError)) throw error;
      this.storageError = `${error.message} Required native work is paused before publication.`;
      this.notify(false);
      return false;
    }
  }

  /** Inside the mutation queue: after this returns, SQL holds the live world and the store
   * baseline is the live world (hydration, history edits, capture and restore rely on it). */
  async flush(): Promise<void> {
    await this.mutate(async () => {
      await this.ready;
      await this.backgroundSave?.done;
      if (this.unpersisted && !(await this.commit(this.saved, undefined, 'append')))
        throw new Error(this.storageError ?? 'The pending world changes could not be saved.');
    });
  }

  private rememberPersistedMemorySources(): void {
    const { memories, experience } = this.world;
    this.persistedMemorySources = { memories, experience };
  }

  /** Persist sources needed by SQL, not unrelated pose/need progression. Appends
   * cannot change a previously selected source; edits and revocations still flush.
   * Outside the queue this waits for ordered durability without holding the queue.
   * docs/architecture.md#performance-critical-path */
  async flushMemorySources(actorId: string, includeAppends = true): Promise<void> {
    await this.ready;
    // Take one queue turn first so an earlier forget/correction commits before this check.
    if (!this.mutationContext.getStore()?.active) await this.mutate(async () => undefined);
    if (!this.unpersisted && !this.backgroundSave) return;
    const before = this.persistedMemorySources,
      after = this.world;
    const unchanged = (a: unknown[] | undefined, b: unknown[] | undefined) =>
      a === b || (!includeAppends && !!a && !!b && appendedRecordCount(a, b) !== undefined);
    if (
      !before ||
      !unchanged(before.memories[actorId], after.memories[actorId]) ||
      !unchanged(before.experience?.awareness[actorId], after.experience?.awareness[actorId]) ||
      !unchanged(before.experience?.summaries[actorId], after.experience?.summaries[actorId]) ||
      before.experience?.forgotten[actorId] !== after.experience?.forgotten[actorId] ||
      before.experience?.corrections?.[actorId] !== after.experience?.corrections?.[actorId]
    )
      await this.whenDurable();
  }

  /** Cold actor history is scoped to one serialized operation, then released. */
  async withActorHistory<T>(
    actorIds: string[] | undefined,
    operation: () => Promise<T>,
    sourceIds?: string[],
  ): Promise<T> {
    return this.mutate(async () => {
      await this.flush();
      if (this.store.hydrateHistory)
        this.saved = await this.store.hydrateHistory(this.saved, actorIds, sourceIds);
      freezeWorld(this.saved.world);
      try {
        return await operation();
      } finally {
        if (this.storageError)
          this.saved = { ...this.saved, world: compactHistory(this.saved.world) };
        else if (this.store.releaseHistory) this.saved = this.store.releaseHistory(this.saved);
        freezeWorld(this.saved.world);
      }
    });
  }
  private async withHistoryEdit<T extends ApiResult>(
    selection: HistoryEditSelection,
    operation: (prepared?: PreparedHistoryEdit) => Promise<T>,
  ): Promise<T | (ApiResult & { revision: number })> {
    await this.flush();
    if (!this.store.records || !this.store.adoptHistory) return this.mutate(() => operation());
    const original = this.saved;
    const generation = this.generation;
    const revision = this.persistedRevision;
    const prepared = await prepareHistoryEdit(this.store.records.db, original, selection);
    return this.mutate(async () => {
      await this.flush();
      // A newer world may have added a dependency or changed authority while the read
      // snapshot was open. Refuse stale preparation instead of dropping that dependency.
      if (
        original !== this.saved ||
        generation !== this.generation ||
        revision !== this.persistedRevision
      )
        return {
          ok: false,
          code: 'stale',
          message: 'The world changed while preparing this edit. Refresh and try again.',
          revision: this.viewRevision,
        };
      this.store.adoptHistory!(original, prepared.state);
      this.saved = prepared.state;
      freezeWorld(this.saved.world);
      try {
        return await operation(prepared);
      } finally {
        if (this.store.releaseHistory && !this.storageError)
          this.saved = this.store.releaseHistory(this.saved);
        else this.saved = { ...this.saved, world: compactHistory(this.saved.world) };
        freezeWorld(this.saved.world);
      }
    });
  }

  async memoryContext(actorId: string, query: string | null, limit: number) {
    await this.flush();
    const world = this.world,
      generation = this.generation;
    if (!world.entities[actorId]?.actor) throw new Error('Actor unavailable.');
    const head = await this.store.records?.head();
    if (!this.store.memories || !head) return experiences(world, actorId).slice(-limit);
    const scope = { worldId: world.id, actorId, generation: head.generation };
    // Optional history selection runs on the read lane, never while holding the
    // world's mutation queue. Verify selected sources before disclosing the result.
    const selected = await this.store.memories.selectContext(scope, query, limit);
    if (
      !(await this.store.memories.current(
        scope,
        selected.map((entry) => ({ id: entry.memory.id, revision: entry.revision })),
      )) ||
      generation !== this.generation ||
      !this.world.entities[actorId]?.actor ||
      world.experience?.forgotten[actorId] !== this.world.experience?.forgotten[actorId] ||
      world.experience?.corrections?.[actorId] !== this.world.experience?.corrections?.[actorId]
    )
      throw new Error('Memory context changed during retrieval.');
    return selected.map((entry) => entry.memory);
  }
  async awarenessEvidence(actorId: string, eventIds: string[]) {
    if (!this.world.entities[actorId]?.actor) throw new Error('Actor unavailable.');
    if (!eventIds.length) return [];
    const ids = new Set(eventIds);
    const forgotten = new Set(this.world.experience?.forgotten[actorId] ?? []);
    for (const id of forgotten) ids.delete(id);
    const recent = (this.world.experience?.awareness[actorId] ?? []).filter((entry) =>
      ids.has(entry.eventId),
    );
    // Newly observed triggers already belong to the immutable authoritative world.
    // Do not save/reload the world just to recover evidence still resident in it.
    // Missing (cold) sources retain the persisted selection and revision checks below.
    if (recent.length === ids.size) return recent;
    await this.flush();
    const world = this.world,
      generation = this.generation;
    if (!world.entities[actorId]?.actor) throw new Error('Actor unavailable.');
    const head = await this.store.records?.head();
    if (!this.store.memories || !head)
      return (world.experience?.awareness[actorId] ?? []).filter((entry) =>
        eventIds.includes(entry.eventId),
      );
    const scope = { worldId: world.id, actorId, generation: head.generation };
    const selected = await this.store.memories.evidence(scope, eventIds);
    if (
      !(await this.store.memories.current(
        scope,
        selected.map((entry) => ({ id: entry.memory.id, revision: entry.revision })),
      )) ||
      generation !== this.generation ||
      !this.world.entities[actorId]?.actor ||
      world.experience?.forgotten[actorId] !== this.world.experience?.forgotten[actorId] ||
      world.experience?.corrections?.[actorId] !== this.world.experience?.corrections?.[actorId]
    )
      throw new Error('Trigger evidence changed during retrieval.');
    return selected.flatMap((entry) => (entry.awareness ? [entry.awareness] : []));
  }
  async inspectMemoryContext(actorId: string, scope = this.localScope) {
    if (!this.config.godMode || !this.mayInspectPrivate(actorId, scope))
      throw new Error('Private mind inspection is unavailable.');
    await this.flush();
    const world = this.world,
      generation = this.generation;
    const sourceRevision = this.store.memories?.actorRevision(actorId);
    const head = await this.store.records?.head();
    const commitments =
      this.store.memories && head
        ? await this.store.memories.commitments({
            worldId: world.id,
            actorId,
            generation: head.generation,
          })
        : undefined;
    const recent = await this.memoryContext(actorId, null, 100);
    const current =
      !commitments ||
      (await this.store.memories!.current(
        { worldId: world.id, actorId, generation: head!.generation },
        commitments.map((entry) => ({ id: entry.memory.id, revision: entry.revision })),
      ));
    if (
      !current ||
      generation !== this.generation ||
      !this.mayInspectPrivate(actorId, scope) ||
      sourceRevision !== this.store.memories?.actorRevision(actorId)
    )
      throw new Error('Private mind changed during inspection.');
    return {
      generation,
      sourceRevision,
      recent: recent.sort((a, b) => a.at - b.at),
      commitments: commitments
        ? commitments.map((entry) => entry.memory)
        : (world.memories[actorId] ?? []).filter((entry) => entry.kind === 'commitment'),
    };
  }
  async memoryMaintenanceStatus(actorId: string) {
    // Scheduling can use the last durable snapshot. Flushing here made every idle
    // actor force a world save. Actual maintenanceBatch flushes before selecting
    // sources; the next committed actor revision wakes this advisory check again.
    const world = this.world;
    // These booleans grant no source access. ActorWork fences the scheduling
    // snapshot, and actual batch selection checks the current database generation.
    if (this.store.memories)
      return this.store.memories.maintenanceStatus({ worldId: world.id, actorId }, world.simTime);
    const all = experiences(world, actorId, true);
    return {
      hasMemories: all.length > 0,
      rawDue: all.some(
        (entry) =>
          entry.kind === 'episode' && entry.at <= world.simTime - EXPERIENCE_LIMITS.rawHours * 3600,
      ),
      pressure: !!this.memoryBacklog,
    };
  }
  async historySnapshot(actorId: string): Promise<WorldState> {
    return this.mutate(async () => {
      await this.flush();
      return this.store.records
        ? (await this.store.records.withHistory(this.saved, [actorId])).world
        : this.world;
    });
  }
  /** Internal actor-context caller; external callers must use inspectActivities. */
  async activityHistoryForActor(
    actorId: string,
    after = -1,
    methodAfter = 0,
  ): Promise<import('@open-legend/protocol').ActivityHistoryPage> {
    const generation = this.generation;
    await this.flush();
    const rows = this.store.records
      ? await this.store.records.activityPage(this.world.id, actorId, after, undefined, 16)
      : (this.world.actionExperience.occurrences[actorId] ?? [])
          .map((entry, position) => ({ entry, position }))
          .filter((row) => row.position > after)
          .slice(0, 16);
    if (generation !== this.generation)
      throw new Error('The world changed during action inspection.');
    const denied = new Set(this.world.experience?.forgotten[actorId] ?? []);
    const entries: import('@open-legend/protocol').ActivityHistoryPage['entries'] = [];
    let bytes = 0,
      through = after,
      remaining = rows.length === 16;
    for (const row of rows) {
      if (
        row.entry.revoked ||
        denied.has(row.entry.id) ||
        row.entry.evidenceIds.some((id) => denied.has(id))
      ) {
        through = row.position;
        continue;
      }
      const text = renderActivity(
        row.entry.parentName && row.entry.parentName !== row.entry.view.name
          ? {
              name: row.entry.parentName,
              facts: [
                {
                  name: 'recorded part',
                  value:
                    'This is one performed part of the chosen activity, not a claim that all of it finished',
                  critical: true,
                },
              ],
              children: [row.entry.view],
            }
          : row.entry.view,
        'What happened',
      );
      if ((bytes += Buffer.byteLength(text)) > 16384) {
        remaining = true;
        break;
      }
      entries.push({ at: row.entry.at, text, status: row.entry.status });
      through = row.position;
    }
    const known = acquiredActivities(this.world, actorId);
    const methods: import('@open-legend/protocol').ActivityHistoryPage['methods'] = [];
    let methodBytes = 0,
      methodNext: number | null = null;
    for (let index = methodAfter; index < known.length; index++) {
      const method = known[index]!;
      const bindings = this.world.actionExperience.acquisitions[actorId]![method.id]!.bindings;
      const text = renderActivity(
        activityChoiceView(this.world, actorId, method, bindings),
        'Can do',
      );
      if (methods.length >= 4 || methodBytes + Buffer.byteLength(text) > 16384) {
        methodNext = index;
        break;
      }
      methodBytes += Buffer.byteLength(text);
      methods.push({
        name: method.name,
        text,
        status: method.executable
          ? 'Tentative, learned from my own attempts; current bindings may need revision'
          : 'Incomplete idea; cannot execute',
      });
    }
    return {
      worldId: this.world.id,
      generation,
      learningStatus: this.world.actionExperience.learning[actorId]?.pending.length
        ? 'Learning from completed actions is pending. It requires safe idle time, available storage, and an authorized model budget.'
        : 'No completed actions are waiting for learning.',
      entries,
      next: remaining ? through : null,
      methods,
      methodNext,
    };
  }

  async inspectActivities(actorId: string, after = -1, scope = this.localScope, methodAfter = 0) {
    this.assertScope(scope, scope.actorId === actorId ? 'play' : 'inspect');
    if (!this.mayInspectPrivate(actorId, scope)) throw new AuthorityError('forbidden');
    const result = await this.activityHistoryForActor(actorId, after, methodAfter);
    this.assertScope(scope, scope.actorId === actorId ? 'play' : 'inspect');
    if (!this.mayInspectPrivate(actorId, scope)) throw new AuthorityError('forbidden');
    return result;
  }

  async prepareActivityLearning(actorId: string) {
    await this.flush();
    const original = this.saved,
      generation = this.generation;
    const after = original.world.actionExperience.learning[actorId]?.position ?? -1;
    let rows = this.store.records
      ? await this.store.records.activityPage(original.world.id, actorId, after)
      : (original.world.actionExperience.occurrences[actorId] ?? [])
          .map((entry, position) => ({ entry, position }))
          .filter((row) => row.position > after)
          .slice(0, 512);
    const through = rows.at(-1)?.position ?? after;
    const seen = new Set(rows.map((row) => row.entry.id));
    for (let pass = 0; pass < 12 && rows.length < 512 && this.store.records; pass++) {
      const missing = [
        ...new Set(rows.flatMap((row) => row.entry.connections.map((link) => link.from))),
      ]
        .filter((id) => !seen.has(id))
        .slice(0, 512 - rows.length);
      if (!missing.length) break;
      const remainingBytes = 4 * 1024 * 1024 - Buffer.byteLength(JSON.stringify(rows));
      if (remainingBytes < 1) break;
      const linked = await this.store.records.activityPage(
        original.world.id,
        actorId,
        -1,
        missing,
        128,
        remainingBytes,
      );
      if (!linked.length) break;
      for (const row of linked) seen.add(row.entry.id);
      if (Buffer.byteLength(JSON.stringify([...rows, ...linked])) > 4 * 1024 * 1024) break;
      rows.push(...linked);
    }
    rows.sort((a, b) => a.position - b.position);
    const denied = new Set(original.world.experience?.forgotten[actorId] ?? []);
    const discovered = discoverActivities(
      original.world,
      actorId,
      rows.map((row) =>
        denied.has(row.entry.id) || row.entry.evidenceIds.some((id) => denied.has(id))
          ? { ...row.entry, revoked: true }
          : row.entry,
      ),
    );
    const assessed = original.world.actionExperience.learning[actorId]?.assessed ?? [];
    const proposedAssessments = [
      ...new Set([...assessed, ...discovered.candidates.map((candidate) => candidate.signature)]),
    ];
    // Prove space for every possible retain before paying. This discarded draft
    // reuses native admission and cannot publish knowledge or advance the cursor.
    let retentionBlocked = false;
    updateWorld(original.world, (draft) => {
      draft.actionExperience.occurrences[actorId] = rows.map((row) => row.entry);
      for (const candidate of discovered.candidates)
        if (!retainActivity(draft, actorId, candidate)) retentionBlocked = true;
    });
    const capacityBlocked =
      retentionBlocked ||
      proposedAssessments.length > ACTIVITY_LIMITS.assessed ||
      Buffer.byteLength(JSON.stringify(proposedAssessments)) > ACTIVITY_LIMITS.assessmentBytes;
    return { ...discovered, rows, through, generation, actorId, capacityBlocked };
  }

  async publishActivityLearning(
    batch: Awaited<ReturnType<WorldService['prepareActivityLearning']>>,
    judgments: ('retain' | 'decline' | 'uncertain')[],
    dispatched = false,
    checkCurrent?: (world: WorldState) => void,
  ): Promise<boolean> {
    return this.mutate(async () => {
      await this.flush();
      checkCurrent?.(this.world);
      if (
        batch.capacityBlocked ||
        this.paused ||
        this.generation !== batch.generation ||
        !this.world.entities[batch.actorId]?.actor?.alive
      )
        return false;
      const rows = this.store.records
        ? await this.store.records.activityPage(
            this.world.id,
            batch.actorId,
            -1,
            batch.rows.map((row) => row.entry.id),
          )
        : batch.rows;
      // Background eligibility can change while history is read. The maintenance
      // caller owns that admission; this writer rechecks it before any publication.
      checkCurrent?.(this.world);
      const deniedNow = new Set(this.world.experience?.forgotten[batch.actorId] ?? []);
      if (
        batch.candidates.some((candidate) =>
          [...candidate.occurrenceIds, ...(candidate.otherEvidence ?? [])].some((id) => {
            const entry = rows.find((row) => row.entry.id === id)?.entry;
            return (
              !entry ||
              entry.actorId !== batch.actorId ||
              entry.revoked ||
              deniedNow.has(id) ||
              entry.evidenceIds.some((source) => deniedNow.has(source))
            );
          }),
        )
      )
        return false;
      if (
        dispatched &&
        (this.world.entities[batch.actorId]?.actor?.action ||
          this.world.entities[batch.actorId]?.actor?.agency.plan?.status === 'active')
      )
        return false;
      if (this.store.records && this.store.adoptHistory) {
        const prepared = this.store.records.withActivityPage(this.saved, batch.actorId, rows);
        this.store.adoptHistory(this.saved, prepared);
        this.saved = prepared;
      }
      const world = updateWorld(this.world, (draft) => {
        const cursor = draft.actionExperience.learning[batch.actorId];
        if (!cursor) return;
        for (const [index, candidate] of batch.candidates.entries()) {
          if (dispatched) {
            if (
              !cursor.assessed.includes(candidate.signature) &&
              (cursor.assessed.length >= ACTIVITY_LIMITS.assessed ||
                Buffer.byteLength(JSON.stringify([...cursor.assessed, candidate.signature])) >
                  ACTIVITY_LIMITS.assessmentBytes)
            )
              throw new Error('Activity assessment allowance is full; learning remains pending.');
            if (!cursor.assessed.includes(candidate.signature))
              cursor.assessed.push(candidate.signature);
          } else if (judgments[index] === 'retain') {
            const denied = new Set(draft.experience?.forgotten[batch.actorId] ?? []);
            const valid = candidate.occurrenceIds.every((id) => {
              const entry = rows.find((row) => row.entry.id === id)?.entry;
              return (
                entry &&
                !entry.revoked &&
                !denied.has(id) &&
                !entry.evidenceIds.some((source) => denied.has(source))
              );
            });
            if (!valid || !retainActivity(draft, batch.actorId, candidate))
              throw new Error(
                'Learning could not be retained; no partial publication was committed.',
              );
          }
        }
        // Advance only a fully prepared page. Durable records retain deferred
        // endpoints; dispatched signatures prevent uncertain work being retried.
        cursor.examined = [...new Set([...(cursor.examined ?? []), ...batch.examined])];
        if (!batch.more) {
          cursor.position = batch.through;
          cursor.examined = [];
        }
        if (!batch.more)
          cursor.pending = cursor.pending.filter(
            (id) => !batch.rows.some((row) => row.entry.id === id),
          );
      });
      return this.commit({ ...this.saved, world }, undefined, 'unchanged');
    });
  }

  async maintenanceBatch(
    actorId: string,
    mode: ConsolidationBatch['mode'],
    review?: {
      day: number;
      throughRevision?: number;
      after?: { at: number; sequence: number; id: string };
    },
  ): Promise<ConsolidationBatch | null> {
    await this.flush();
    const world = this.world,
      generation = this.generation;
    const head = await this.store.records?.head();
    const batch =
      this.store.memories && head
        ? await this.store.memories.maintenanceBatch(
            { worldId: world.id, actorId, generation: head.generation },
            world.simTime,
            mode,
            review,
          )
        : consolidationBatch(world, actorId, mode, review?.day);
    return generation === this.generation ? batch : null;
  }
  async createSave(label: string, id: string, scope = this.localScope): Promise<void> {
    try {
      await this.captureSave(label, id, 'manual', scope);
    } catch (error) {
      // Busy and permission refusals are answers, not checkpoint failures (SL08-A).
      if (
        !(error instanceof CheckpointBusyError) &&
        !(error instanceof AuthorityError) &&
        !(error instanceof OverloadError)
      )
        await this.store.saves?.recordFailure(
          this.world.id,
          'manual',
          `Manual save failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      throw error;
    }
  }
  /** Host-owned whole-world recovery. No player request can choose this entry point.
   * docs/save-and-load.md#compatibility-and-retention */
  async createAutosave(): Promise<void> {
    return this.authorityContext.run(undefined, () =>
      this.captureSave('Autosave', randomUUID(), 'auto'),
    );
  }
  private async captureSave(
    label: string,
    id: string,
    kind: 'manual' | 'auto',
    scope?: RequestScope,
  ): Promise<void> {
    // Reserve the capture slot before the mutation queue: a manual save may wait here for a
    // capture in progress without holding the queue, and goes ahead of the next autosave.
    const release = (await this.store.saves?.admit(id, kind)) ?? (() => undefined);
    let completion: Promise<void> | undefined;
    const capture = async () => {
      await this.flush();
      if (scope) this.assertScope(scope, 'save');
      if (this.storageError || !this.store.saves)
        throw new Error(this.storageError ?? 'Saves unavailable.');
      let captured!: () => void;
      const ready = new Promise<void>((resolve) => {
        captured = resolve;
      });
      completion = this.store.saves.create(this.saved, label, id, {
        captured,
        expectedRevision: this.persistedRevision,
        kind,
      });
      // The read snapshot has pinned the committed cut. File output no longer owns
      // the gameplay mutation queue; later commits cannot change this candidate.
      await timed('save.captureBarrier', () => Promise.race([ready, completion!]));
    };
    try {
      if (scope) await this.authorized(scope, 'save', false, capture);
      else await this.mutate(capture);
      await completion;
    } finally {
      release();
    }
  }

  async deleteSave(id: string, scope = this.localScope): Promise<void> {
    let completion: Promise<void> | undefined;
    await this.authorized(scope, 'save', false, async () => {
      await this.ready;
      if (!this.mayManageSaves(scope) || !this.store.saves)
        throw new Error('World creator or host operator access required.');
      // Order deletion after already admitted capture, including its flush/barrier.
      // Waiting for file output happens outside the gameplay mutation queue.
      completion = this.store.saves.delete(this.world.id, id);
      // Attach a handler now; the caller observes the original failure below.
      void completion.catch(() => undefined);
    });
    await completion;
  }

  async restoreSave(
    id: string,
    requestId: string,
    payload: SavePayload,
    scope = this.localScope,
  ): Promise<void> {
    try {
      await this.mutate(async () => {
        await this.ready;
        this.assertScope(scope, 'save');
        const prior = (await this.store.getIntegration(`load-request:${requestId}`)) as
          | { saveId: string }
          | undefined;
        if (prior) {
          if (prior.saveId !== id) throw new Error('Load request identity conflicts.');
          return;
        }
        await this.flush();
        await this.store.saves?.drain();
        if (!this.mayManageSaves(scope))
          throw new Error('World creator or host operator access required.');
        const restored = structuredClone(payload.state);
        await this.store.authority!.restoreBindings(restored.world);
        // Current-format validation precedes installation; the current privacy
        // ledger below still removes experience forgotten after this save.
        const ledger = (await this.store.getIntegration(`forget-ledger:${this.world.id}`)) as
          | Record<string, string[]>
          | undefined;
        const events = payload.history.history_events.map(
          (row) => JSON.parse(String(row['payload'])) as WorldEvent,
        );
        if (
          events.length !==
          restored.world.events.length + (restored.world.archivedEventCount ?? 0)
        )
          throw new Error('Save history is incomplete.');
        restored.world.events = events.sort(
          (a, b) => (a.order ?? a.sequence) - (b.order ?? b.sequence),
        );
        restored.world.archivedEventCount = 0;
        const baseline = structuredClone(restored.world);
        for (const entity of Object.values(restored.world.entities))
          if (entity.actor) delete entity.actor.inventoryInspection;
        for (const [actorId, ids] of Object.entries(ledger ?? {}))
          for (const sourceId of ids)
            restored.world = forgetExperience(restored.world, actorId, sourceId).world;
        restored.manuallyPaused = true;
        restored.world.paused = true;
        const epoch = {
          generation: this.epoch.generation + 1,
          openedAt: this.now(),
          token: randomUUID(),
        };
        const timeline = randomUUID();
        // Preserve the current world before any database write, pinned to the revision this load
        // replaces. If it cannot be written (full disk, capture limits), the load is refused and
        // the current world stays active, without a storage latch. No bypass (SB13, SL09-A).
        const recoveryId = randomUUID();
        // Validate the candidate before writing the recovery file; a later refusal (busy writer,
        // fence) can still leave that file unreferenced, and recovery rotation below bounds it.
        this.store.saves?.validatePayload(payload);
        if (this.store.saves)
          try {
            await this.store.saves.create(this.saved, 'Before last load', recoveryId, {
              kind: 'recovery',
              expectedRevision: this.persistedRevision,
            });
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown error';
            await this.store.saves.recordFailure(
              this.world.id,
              'recovery',
              `Load refused: the current world could not be preserved first. ${reason}`,
            );
            throw new GameSaveError(
              `Load refused; the current world was kept (paused) because it could not be preserved first. ${reason} Free disk space or resolve the capture limit, then load again.`,
            );
          }
        if (
          !(await this.commit(restored, undefined, 'diff', baseline, undefined, {
            id,
            requestId,
            payload,
            epoch,
            timeline,
            recoveryId,
          }))
        )
          throw new Error(this.storageError ?? 'Load failed.');
        this.epoch = epoch;
        this.timelineId = timeline;
        this.generation = randomUUID();
        // One mark per revision, only under the new generation; abandoned-timeline waiters fail.
        this.rejectDurableWaiters(new Error('The world timeline was replaced by a load.'));
        this.publishDurable(this.persistedRevision, this.snapshotSequence, this.saved.world);
        this.humanActorIds = Object.values(this.world.entities)
          .filter((entity) => entity.actor?.controller === 'player')
          .map((entity) => entity.id);
        this.connections.clear();
        this.presence.clear();
        this.presenceOrders.clear();
        await this.authorityContext.run(undefined, () => this.reconcileParticipation());
        // The restored world may be installed even when its follow-up save fails.
        if (this.storageError) throw new Error(this.storageError);
        this.debtSeconds = 0;
        this.memoryBacklog = null;
        this.notify();
      });
    } finally {
      // Also after a refused or failed load: keeps two recovery files plus the pointer's.
      await this.store.saves?.retainRecovery(this.world.id);
    }
  }

  async changeEmbodiment(scope: RequestScope, request: ControlRequest): Promise<ApiResult> {
    return this.authorized(scope, 'play', false, async () => {
      if (await this.store.authority!.controlReceipt(scope, request))
        return {
          ok: true,
          code: 'replayed',
          message: 'Control request already committed. Refresh to see current control.',
        };
      const actor = this.world.entities[scope.actorId]?.actor;
      if (!actor || actor.controller !== 'player') throw new AuthorityError('forbidden');
      if (request.operation !== 'release') {
        this.present; // Prune expired pending returns using the existing owner.
        if (
          !this.presenceOrders.has(this.presenceKey(scope)) &&
          this.presenceOrders.size >= this.config.capacity.presence
        )
          throw new Error('Presence capacity reached. Reconnect before continuing.');
      }
      const attempt =
        request.operation === 'release'
          ? (this.exits.get(scope.actorId) ?? {
              worldId: this.world.id,
              actorId: scope.actorId,
              id: randomUUID(),
              deadline: this.now() + this.config.exitGraceMs,
            })
          : null;
      const result = changeParticipation(
        this.world,
        scope.actorId,
        actor.participation?.revision ?? 0,
        attempt ? { type: 'begin-exit', attemptId: attempt.id } : { type: 'return' },
      );
      if (!result.outcome.ok) return result.outcome;
      if (
        !(await this.commit(
          { ...this.saved, world: result.world },
          undefined,
          'append',
          undefined,
          undefined,
          undefined,
          {
            controlChange: {
              scope,
              request,
              now: this.now,
              unattended:
                actor.participation?.phase === 'inactive' || !this.controllerPresent(scope),
            },
            participationChange: { actorId: scope.actorId, attempt },
          },
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      if (attempt) this.exits.set(scope.actorId, attempt);
      else {
        this.exits.delete(scope.actorId);
        // Reserve the first heartbeat's place before the stream opens. This
        // closes the handoff gap without making control acquisition itself
        // foreground presence or adding a second ownership record.
        const returned = this.refreshScope(scope);
        this.presenceOrders.set(this.presenceKey(returned), {
          sequence: -1,
          at: this.now(),
          controlGeneration: returned.controlGeneration,
        });
      }
      return {
        ...result.outcome,
        message:
          request.operation === 'release'
            ? 'Your tab is paused; your character is leaving the world.'
            : 'Resumed here.',
      };
    });
  }
  async rebindAccount(scope: RequestScope, request: BindingRequest): Promise<ApiResult> {
    return this.authorized(scope, 'manage-access', false, async () => {
      if (await this.store.authority!.bindingReceipt(scope, request))
        return { ok: true, code: 'replayed', message: 'Character binding already committed.' };
      const grant = await this.store.authority!.grant(this.world.id, request.accountId);
      const entity = this.world.entities[request.actorId];
      const owner =
        (await this.store.authority!.actorOwners(this.world.id)).get(request.actorId) ??
        this.world.authorship.playerAccountIds[request.actorId];
      if (
        !grant?.actorId ||
        grant.revision !== request.expectedRevision ||
        grant.actorId === request.actorId
      )
        throw new AuthorityError('conflict');
      const previousActorId = grant.actorId;
      if (!entity?.actor || entity.retirement || (owner && owner !== request.accountId))
        throw new AuthorityError('forbidden');
      let world = updateWorld(this.world, (draft) => {
        draft.entities[request.actorId]!.actor!.controller = 'player';
        draft.authorship.playerAccountIds[request.actorId] = request.accountId;
      });
      // Both embodiments settle through the existing departure owner. Native progress and
      // inventory stay with the actor; explicit control acquisition is required afterward.
      for (const actorId of [previousActorId, request.actorId]) {
        const departed = this.departImmediately(world, actorId);
        if (!departed.ok) return departed.outcome;
        world = departed.world;
      }
      if (
        !(await this.commit(
          { ...this.saved, world },
          undefined,
          'append',
          undefined,
          undefined,
          undefined,
          { bindingChange: { scope, request, now: this.now } },
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      this.exits.delete(previousActorId);
      this.exits.delete(request.actorId);
      this.humanActorIds = Object.values(this.world.entities)
        .filter((entity) => entity.actor?.controller === 'player')
        .map((entity) => entity.id);
      return {
        ok: true,
        code: 'bound',
        message: 'Character binding changed. Choose Control here to enter the character.',
      };
    });
  }
  /** Settle a body out of active participation now through the existing departure owner. */
  private departImmediately(
    world: WorldState,
    actorId: string,
  ): { ok: true; world: WorldState } | { ok: false; outcome: ApiResult } {
    const actor = world.entities[actorId]?.actor;
    if (!actor) throw new AuthorityError('forbidden');
    if (actor.participation?.phase === 'inactive') return { ok: true, world };
    const attemptId = actor.participation?.exitAttemptId ?? randomUUID();
    if (actor.participation?.phase !== 'exiting') {
      const exit = changeParticipation(world, actorId, actor.participation?.revision ?? 0, {
        type: 'begin-exit',
        attemptId,
      });
      if (!exit.outcome.ok) return { ok: false, outcome: exit.outcome };
      world = exit.world;
    }
    const departure = changeParticipation(
      world,
      actorId,
      world.entities[actorId]!.actor!.participation!.revision,
      { type: 'depart', attemptId },
    );
    return departure.outcome.ok
      ? { ok: true, world: departure.world }
      : { ok: false, outcome: departure.outcome };
  }
  /** Invite enrollment: an unowned person becomes a human character in the same commit that
   * redeems the invite and records its grant. The caller validates inside this writer lane.
   * Like a rebinding, the body departs until its new controller explicitly takes control.
   * docs/projects/multiplayer-entry-maintenance.md#decisions */
  async enrollCharacter(
    actorId: string,
    accountId: string,
    persist: () => Promise<void>,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;
      const entity = this.world.entities[actorId];
      if (!entity?.actor?.alive || entity.retirement || entity.actor.controller === 'player')
        return {
          ok: false,
          code: 'character-unavailable',
          message: 'That character is no longer available.',
        };
      const departed = this.departImmediately(
        updateWorld(this.world, (draft) => {
          draft.entities[actorId]!.actor!.controller = 'player';
          draft.authorship.playerAccountIds[actorId] = accountId;
        }),
        actorId,
      );
      if (!departed.ok) return departed.outcome;
      if (
        !(await this.commit(
          { ...this.saved, world: departed.world },
          undefined,
          'append',
          undefined,
          undefined,
          undefined,
          { operationalChange: persist },
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      this.exits.delete(actorId);
      this.humanActorIds = Object.values(this.world.entities)
        .filter((entity) => entity.actor?.controller === 'player')
        .map((entity) => entity.id);
      return { ok: true, code: 'enrolled', message: 'Character bound to the invited account.' };
    });
  }
  private async reconcileParticipation(): Promise<void> {
    this.present; // Prune expired or replaced heartbeat authority first.
    const participating = new Set<string>();
    const scopes = [
      ...this.connections.values(),
      ...[...this.presence.values()].map((entry) => entry.scope),
    ];
    for (const scope of scopes) {
      if (this.currentScope(scope) && this.currentScope(this.refreshScope(scope), 'play', true))
        participating.add(scope.actorId);
    }
    for (const actorId of this.humanActorIds) {
      const entity = this.world.entities[actorId];
      if (!entity?.actor) continue;
      let actor = this.world.entities[entity.id]!.actor!;
      if (participating.has(entity.id)) {
        if (actor.participation?.phase === 'exiting' || actor.participation?.phase === 'inactive') {
          const result = changeParticipation(this.world, entity.id, actor.participation.revision, {
            type: 'return',
          });
          if (
            result.outcome.ok &&
            (await this.commit(
              { ...this.saved, world: result.world },
              undefined,
              'append',
              undefined,
              undefined,
              undefined,
              { participationChange: { actorId: entity.id, attempt: null } },
            ))
          )
            this.exits.delete(entity.id);
        }
        continue;
      }
      if (actor.participation?.phase === 'inactive') continue;
      let attempt = this.exits.get(entity.id);
      if (!attempt)
        attempt = {
          worldId: this.world.id,
          actorId: entity.id,
          id: randomUUID(),
          deadline: this.now() + this.config.exitGraceMs,
        };
      if (
        actor.participation?.phase !== 'exiting' ||
        actor.participation.exitAttemptId !== attempt.id
      ) {
        // A restored gameplay phase adopts the current operational attempt and original deadline.
        const baseline = updateWorld(this.world, (draft) => {
          const state = draft.entities[entity.id]!.actor!.participation;
          if (state?.phase === 'exiting') {
            state.phase = 'active';
            delete state.exitAttemptId;
          }
        });
        const result = changeParticipation(
          baseline,
          entity.id,
          actor.participation?.revision ?? 0,
          { type: 'begin-exit', attemptId: attempt.id },
        );
        if (
          !result.outcome.ok ||
          !(await this.commit(
            { ...this.saved, world: result.world },
            undefined,
            'append',
            undefined,
            undefined,
            undefined,
            { participationChange: { actorId: entity.id, attempt } },
          ))
        )
          continue;
        this.exits.set(entity.id, attempt);
        actor = this.world.entities[entity.id]!.actor!;
      }
      if (
        this.world.participationPolicy?.exitExposureSeconds === undefined &&
        this.now() >= attempt.deadline
      ) {
        const result = changeParticipation(this.world, entity.id, actor.participation!.revision, {
          type: 'depart',
          attemptId: attempt.id,
        });
        if (result.outcome.ok)
          await this.commit({ ...this.saved, world: result.world }, undefined, 'append');
      }
    }
  }
  private presenceKey(scope: RequestScope) {
    return `${scope.accountId}:${scope.sessionId}:${scope.connectionId}`;
  }
  async setPresence(
    clientId: string,
    visible: boolean,
    sequence?: number,
    scope = this.localScope,
  ): Promise<void> {
    return this.mutate(async () => {
      await this.ready;

      this.assertScope(scope, 'play', true);
      if (clientId !== scope.connectionId && this.config.authentication.mode !== 'local')
        throw new AuthorityError('forbidden');
      clientId = this.presenceKey(scope);
      if (sequence !== undefined) {
        const previous = this.presenceOrders.get(clientId);
        // Reload keeps the tab identity but acquires a new control generation.
        // Order messages within that authority, never against a previous page's
        // counter; the scope check above still refuses all old-generation input.
        if (
          previous?.controlGeneration === scope.controlGeneration &&
          sequence <= previous.sequence
        )
          return;
        if (
          !this.presenceOrders.has(clientId) &&
          this.presenceOrders.size >= this.config.capacity.presence
        )
          throw new Error('Presence capacity reached. Reconnect before continuing.');
        this.presenceOrders.set(clientId, {
          sequence,
          at: this.now(),
          controlGeneration: scope.controlGeneration,
        });
      }
      const wasPaused = this.paused;
      // Observe an expired heartbeat before renewing it. Otherwise a reconnect ahead
      // of the timer can hide the absence transition from pending inference.
      if (wasPaused && !this.world.paused) await this.syncPause();
      if (visible) {
        if (!this.presence.has(clientId) && this.presence.size >= this.config.capacity.presence)
          throw new Error('Presence capacity reached. Reconnect before continuing.');
        this.presence.set(clientId, { at: this.now(), scope });
      } else this.presence.delete(clientId);
      await this.reconcileParticipation();
      if (this.paused !== wasPaused || this.world.paused !== this.paused) await this.syncPause();
    });
  }

  async control(
    input: {
      paused?: boolean;
      speed?: number;
      clientId?: string;
      presenceSequence?: number;
    },
    scope = this.localScope,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      if (input.speed !== undefined && ![0.5, 1, 3, 8].includes(input.speed))
        return { ok: false, code: 'speed', message: 'Choose 0.5×, 1×, 3× or 8×.' };
      if (this.maintenanceHeld && input.paused === false)
        return {
          ok: false,
          code: 'maintenance',
          message: 'The world is paused for maintenance until a creator marks it ready.',
        };
      if (input.paused === false) {
        // Clicking Resume is itself evidence that the player has returned. Do not
        // wait for the browser's next (possibly throttled) five-second heartbeat.
        if (input.clientId)
          await this.setPresence(input.clientId, true, input.presenceSequence, scope);
        if (this.absent)
          return {
            ok: false,
            code: 'away',
            message: 'This game tab has not reconnected yet. Reload it and try Resume again.',
          };
      }
      const next = {
        ...this.saved,
        speed: input.speed ?? this.saved.speed,
        manuallyPaused: input.paused ?? this.saved.manuallyPaused,
      };
      next.world = {
        ...next.world,
        paused:
          next.manuallyPaused || this.maintenanceHeld || this.absent || this.storageError !== null,
      };
      // Speed changes preserve already-admitted time; pausing/resuming starts a fresh clock.
      if (next.world.paused || this.world.paused) this.debtSeconds = 0;
      gaugeMetric('clock.pendingSimSeconds', this.debtSeconds);
      const resuming = this.world.paused && !next.world.paused;
      const ok = await this.commit(next, undefined, 'unchanged');
      if (ok && resuming) this.clockStartedAt = performance.now();
      return {
        ok,
        code: ok ? 'control' : 'storage',
        message: ok
          ? next.world.paused
            ? 'World paused.'
            : `World running at ${next.speed}×.`
          : this.storageError!,
      };
    });
  }

  /** Host monotonic instant (`performance.now`) of the latest resume. The host clock never
   * charges real time from before it, so a tick left waiting across a pause (for example a
   * maintenance window) adds no catch-up. docs/projects/multiplayer-entry-maintenance.md */
  clockStartedAt = 0;
  private async syncPause(): Promise<void> {
    return this.mutate(async () => {
      await this.ready;

      this.debtSeconds = 0;
      gaugeMetric('clock.pendingSimSeconds', 0);
      const resuming = this.world.paused && !this.paused;
      if (this.world.paused !== this.paused)
        await this.commit(
          { ...this.saved, world: { ...this.world, paused: this.paused } },
          undefined,
          'unchanged',
        );
      else this.notify(false);
      if (resuming && !this.world.paused) this.clockStartedAt = performance.now();
    });
  }

  /** Boundary-limited elapsed integration; background saves keep their real-time cadence. */
  async tick(
    elapsedRealSeconds: number,
    suspendedRealSeconds = elapsedRealSeconds > 2 ? elapsedRealSeconds : 0,
  ): Promise<void> {
    if (
      !Number.isFinite(elapsedRealSeconds) ||
      elapsedRealSeconds < 0 ||
      !Number.isFinite(suspendedRealSeconds) ||
      suspendedRealSeconds < 0
    )
      throw new Error('Tick durations must be finite nonnegative seconds.');
    do {
      // Bound unsaved simulation progress: once a background save has been outstanding this
      // long, native time waits for it (outside the queue) instead of accumulating more.
      const outstanding = this.backgroundSave;
      if (
        outstanding &&
        performance.now() - outstanding.startedAt >= BACKGROUND_SAVE_BACKPRESSURE_MS
      ) {
        countMetric('persistence.backpressureWaits');
        await outstanding.done;
      }
      await this.tickBatch(elapsedRealSeconds, suspendedRealSeconds);
      elapsedRealSeconds = 0;
      suspendedRealSeconds = 0;
      if (this.paused || this.debtSeconds < 1e-6 || navigationBlocked(this.world)) return;
      // Release the mutation queue before yielding so commands can interleave with catch-up.
      const yieldedAt = performance.now();
      await new Promise<void>((resolve) => setImmediate(resolve));
      recordDuration('tick.yieldWait', performance.now() - yieldedAt);
    } while (true);
  }

  private async tickBatch(elapsedRealSeconds: number, suspendedRealSeconds: number): Promise<void> {
    return this.mutate(async () => {
      await this.ready;
      await this.refreshCommandEpoch();

      await this.reconcileDisconnectedConversation();
      await this.reconcileParticipation();
      if (this.world.paused !== this.paused) await this.syncPause();
      if (this.paused || elapsedRealSeconds < 0) return;
      // The host distinguishes missing callbacks from callbacks during a busy batch.
      // Direct callers retain the suspension default (docs/performance.md#simulation-cpu-and-growing-history).
      if (suspendedRealSeconds > 0) {
        countMetric('clock.excludedGapRealSeconds', suspendedRealSeconds);
        countMetric('clock.discardedPendingSimSeconds', this.debtSeconds);
        gaugeMetric('clock.pendingSimSeconds', 0);
        this.debtSeconds = 0;
        elapsedRealSeconds = Math.max(0, elapsedRealSeconds - suspendedRealSeconds);
        if (!elapsedRealSeconds) return;
      }
      // Optional memory maintenance must never stop native time or walking.
      // This warning measures resident pressure only; maintenanceStatus separately checks
      // canonical SQL backlog, including awareness evicted from the working set.
      // Retain every source; docs/memory-architecture.md#6-hourly-consolidation-and-six-hour-raw-recall.
      const memoryBacklog =
        Object.values(this.world.experience?.awareness ?? {}).some(
          (entries) => entries.length >= EXPERIENCE_LIMITS.consolidationPressure,
        ) ||
        Object.values(this.world.memories).some(
          (entries) => entries.length >= EXPERIENCE_LIMITS.consolidationPressure + 16,
        )
          ? 'Memory consolidation is behind; simulation continues and all source memories are retained.'
          : null;
      if (this.memoryBacklog !== memoryBacklog) {
        this.memoryBacklog = memoryBacklog;
        this.notify(false);
      }
      // Keep admitted debt, but do not charge the world hunger/action time for CPU preparation.
      // A canceled action, failed request or completed route releases this technical barrier.
      // docs/architecture.md#navigation-preparation
      if (navigationBlocked(this.world)) {
        countMetric('clock.navigationExcludedRealSeconds', elapsedRealSeconds);
        gaugeMetric('navigation.blocked', 1);
        return;
      }
      gaugeMetric('navigation.blocked', 0);
      const requested = elapsedRealSeconds * this.config.baseRatio * this.speed;
      countMetric('clock.activeRealSeconds', elapsedRealSeconds);
      countMetric('clock.requestedSimSeconds', requested);
      gaugeMetric('clock.requestedSpeed', this.speed);
      this.debtSeconds += requested;
      gaugeMetric('clock.pendingSimSeconds', this.debtSeconds);
      const offered = Math.min(this.debtSeconds, 86400);
      if (offered < 1e-6) return;
      let world = this.world;
      const batchStarted = performance.now();
      let nativeMs = 0;
      let advancedSeconds = 0;
      gaugeMetric('tick.dueSimSeconds', this.debtSeconds);
      // Game-clock conversion is not an integration frequency. Accept one boundary-limited
      // interval at a time and retain actual unadvanced time as debt. docs/simulation-time.md
      // A single transition remains atomic even if it exceeds this time budget.
      while (advancedSeconds < offered) {
        if (navigationBlocked(world)) break;
        const stepStarted = performance.now();
        const startTime = world.simTime;
        const slices = advanceWorldSlices(world, offered - advancedSeconds, { maxIntervals: 1 });
        const nextSlice = (boundary?: boolean) => {
          const started = performance.now();
          try {
            return slices.next(boundary);
          } finally {
            recordDuration('native.iteratorCall', performance.now() - started);
          }
        };
        let sliceStarted = performance.now(),
          result = nextSlice();
        while (!result.done) {
          if (performance.now() - sliceStarted >= 8) {
            recordDuration('native.noYield', performance.now() - sliceStarted);
            await new Promise<void>((resolve) => setImmediate(resolve));
            sliceStarted = performance.now();
          }
          // Local motion deadlines need not force publication, but they provide a
          // coherent exit when this batch has used its responsiveness budget.
          result = nextSlice(result.value === 'boundary' && performance.now() - batchStarted >= 8);
        }
        const advanced = result.value;
        if (!advanced.outcome.ok) {
          recordDuration('native.noYield', performance.now() - sliceStarted);
          this.storageError = `Required native work stopped before advancing time: ${advanced.outcome.message} Restart after reconciling the admitted workload.`;
          this.notify(false);
          return;
        }
        const finalizationStarted = performance.now();
        world = freezeWorld(advanced.world);
        recordDuration('native.finalization', performance.now() - finalizationStarted);
        // Wall time from one actual yield to the next includes indivisible native calls
        // and finalization; queue, storage and cooperative waiting are measured separately.
        recordDuration('native.noYield', performance.now() - sliceStarted);
        const delta = world.simTime - startTime;
        const stepMs = performance.now() - stepStarted;
        nativeMs += stepMs;
        recordDuration('native.step', stepMs);
        recordDuration('native.intervalSimMs', delta * 1000);
        advancedSeconds += delta;
        if (delta <= 0 || performance.now() - batchStarted >= 8) break;
      }
      recordDuration('tick.nativeWork', nativeMs);
      const beforeSimTime = this.world.simTime;
      const saved = { ...this.saved, world };
      // Simulation progress is saved about once per real second as a background save, which no
      // longer holds this queue (docs/projects/ordered-async-saves.md#ordering-rules).
      // A wall clock stepped backwards must not suspend these saves (LA171, SV19).
      const sinceSave = this.now() - this.lastProgressSaveAt;
      const unsavedMs = sinceSave < 0 ? Number.POSITIVE_INFINITY : sinceSave;
      const due =
        !this.backgroundSave &&
        unsavedMs >= 1000 &&
        (!this.pendingOperations || unsavedMs >= BACKGROUND_SAVE_DEFERRAL_MS);
      if (due ? await this.saveProgress(saved) : this.acceptProgress(saved))
        this.debtSeconds = Math.max(0, this.debtSeconds - advancedSeconds);
      countMetric('clock.advancedSimSeconds', this.world.simTime - beforeSimTime);
      gaugeMetric('clock.pendingSimSeconds', this.debtSeconds);
    }, true);
  }

  async conversation(
    requestId: string,
    operation: 'join' | 'leave',
    conversationId: string,
    generation: number,
    scope = this.localScope,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;
      if (operation === 'join' && this.paused)
        return { ok: false, code: 'paused', message: 'Resume before joining.' };
      const result = changeConversation(
        this.world,
        `${scope.accountId}:${requestId}`,
        scope.actorId,
        operation,
        conversationId,
        generation,
      );
      if (!result.outcome.ok) return result.outcome;
      if (!(await this.commit({ ...this.saved, world: result.world }, undefined, 'unchanged')))
        return { ok: false, code: 'storage', message: this.storageError! };
      return result.outcome;
    });
  }
  async transition(
    operation: (world: WorldState) => Transition,
    gameplay?: Omit<GameplayReceipt, 'result'>,
    responseJobId?: string,
    validateSources?: (world: WorldState) => Promise<boolean>,
    commandType?: Command['type'],
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      // Durable job admission outlives the hot domain receipt window. Check inside
      // the same mutation lane as commit (docs/architecture.md#actor-agency-foundation).
      if (responseJobId) {
        const job = await this.store.getJob(responseJobId);
        if (
          !job ||
          (!this.world.responseReceipts?.[responseJobId] &&
            job.status !== 'generating' &&
            !(job.responseReady && ['queued', 'judging'].includes(job.status)))
        )
          return {
            ok: false,
            code: 'retired-response',
            message:
              'This response identity is retired or was never admitted; no effects were applied.',
          };
      }
      if (validateSources && !(await validateSources(this.world)))
        return {
          ok: false,
          code: 'stale-publication',
          message: 'Publication sources or authority changed.',
        };
      // Deliberate inspection records permitted facts at frozen time. Other reasons
      // for holding the writer still apply (docs/ui-ux/world-interaction.md#paused-game-tabs).
      const manuallyPausedInspection =
        commandType === 'inspect-inventory' &&
        this.saved.manuallyPaused &&
        !this.maintenanceHeld &&
        !this.absent &&
        this.storageError === null;
      if (this.paused && !manuallyPausedInspection)
        return { ok: false, code: 'paused', message: 'Resume the world before acting.' };
      const result = operation(this.world);
      const receipt = gameplay ? { ...gameplay, result: result.outcome } : undefined;
      // A rejected/stale background transition with no effects has nothing to save.
      // Explicit commands and response jobs still need their durable outcome/receipt.
      if (result.world === this.world && !receipt && !responseJobId && !result.invalidatedMemoryIds)
        return { ...result.outcome };
      const world = receipt
        ? updateWorld(result.world, (draft) => {
            delete draft.commandReceipts[receipt.id];
          })
        : result.world;
      if (
        !(await this.commit(
          { ...this.saved, world },
          result.invalidatedMemoryIds,
          'append',
          undefined,
          receipt,
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      return { ...result.outcome };
    });
  }

  async preparedNavigation(
    actorId: string,
    actionId: string,
    request: NavigationRequest,
    result: NavigationResult,
    map: WorldState['map'],
    timeline: string,
  ): Promise<void> {
    await this.mutate(async () => {
      if (this.storageError || this.world.map !== map || this.timelineId !== timeline) return;
      const transition = completeNavigation(this.world, actorId, actionId, request, result);
      if (transition.world === this.world) return;
      // The action/request is already durable. A computed route is simulation progress,
      // saved in the next background save; restart can prepare it again from that request.
      // Avoid a synchronous save before the character takes its first step.
      // docs/performance.md#navigation-failure-and-shutdown
      this.acceptProgress({ ...this.saved, world: transition.world });
    }, true);
  }

  /** Apply an exact reviewed tool operation with its receipt in the existing world transaction.
   * The callback is application-owned, never a function supplied through MCP.
   * docs/world-agent-runtime.md#durable-write-sessions
   */
  async reviewedTransition(
    id: string,
    fingerprint: string,
    timeline: string,
    scope: RequestScope,
    operation: (world: WorldState) => Promise<Transition>,
    controlling = false,
  ): Promise<ApiResult> {
    return this.authorized(scope, controlling ? 'play' : 'create', controlling, async () => {
      await this.ready;
      if (!this.config.godMode || this.timelineId !== timeline)
        return { ok: false, code: 'stale', message: 'World authority or timeline changed.' };
      this.assertScope(scope, 'create');
      this.assertScope(scope, 'inspect');
      const receipts = this.store.commands;
      if (!receipts)
        return {
          ok: false,
          code: 'unavailable',
          message: 'Durable operation receipts are unavailable.',
        };
      const previous = await receipts.get(this.world.id, id);
      if (previous)
        return previous.fingerprint === fingerprint
          ? previous.result
          : {
              ok: false,
              code: 'conflict',
              message: 'Operation identity already has different content.',
            };
      const result = await operation(this.world);
      if (!result.outcome.ok) return result.outcome;
      const receipt: GameplayReceipt = {
        id,
        fingerprint,
        recoveryFingerprint: null,
        epoch: 0,
        expiresAt: Number.MAX_SAFE_INTEGER,
        result: result.outcome,
      };
      const world = updateWorld(result.world, (draft) => {
        delete draft.commandReceipts[id];
      });
      if (
        !(await this.commit(
          { ...this.saved, world },
          result.invalidatedMemoryIds,
          'append',
          undefined,
          receipt,
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      return result.outcome;
    });
  }

  private async godTransition(operation: (world: WorldState) => Transition): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      const result = operation(this.world);
      if (!result.outcome.ok) return result.outcome;
      if (
        !(await this.commit(
          { ...this.saved, world: result.world },
          result.invalidatedMemoryIds,
          'append',
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      return result.outcome;
    });
  }

  async godAct(
    action: 'revive' | 'enable-cognition',
    targetId: string,
    requestId?: string,
    expectedRevision?: number,
  ): Promise<ApiResult> {
    return await this.godTransition((world) => {
      switch (action) {
        case 'revive':
          return reviveActor(world, targetId, requestId, expectedRevision);
        case 'enable-cognition':
          return enableActorCognition(world, targetId);
      }
    });
  }

  async authorCharacterAppraisal(
    request: import('@open-legend/protocol').AuthoredAppraisalRequest,
    scope: RequestScope,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;
      this.assertScope(scope, 'create');
      const actor = this.world.entities[request.actorId];
      if (
        !this.config.godMode ||
        actor?.actor?.controller !== 'npc' ||
        !this.mayInspectPrivate(request.actorId, scope)
      )
        throw new AuthorityError('forbidden');
      if (request.worldId !== this.world.id || request.generation !== this.generation)
        throw new AuthorityError('stale-scope');
      if (!this.store.commands || !this.store.records)
        return {
          ok: false,
          code: 'unavailable',
          message: 'Durable appraisal authoring is unavailable.',
        };
      await this.refreshCommandEpoch();
      const id = `authored:${digest([scope.accountId, request.epoch, request.id])}`;
      const fingerprint = digest({ scope, request });
      const prior = await this.store.commands.get(this.world.id, id);
      if (prior)
        return prior.fingerprint === fingerprint && this.now() < prior.expiresAt
          ? prior.result
          : {
              ok: false,
              code: 'appraisal-conflict',
              message: 'This authored operation changed or expired.',
            };
      if (request.epoch !== this.commandEpoch)
        return { ok: false, code: 'expired', message: 'Reload before authoring a new feeling.' };
      const change = request.change;
      const definition =
        change.kind === 'create' && appraisalDefinition(this.world, change.definitionPin);
      if (
        change.kind === 'create' &&
        (!definition ||
          definition.value.kind !== 'qualitative' ||
          (change.targetId !== null &&
            !canRememberSubject(this.world, request.actorId, change.targetId)))
      )
        return {
          ok: false,
          code: 'appraisal-rejected',
          message: 'Choose a supported feeling and known subject.',
        };
      const createIds =
        change.kind === 'create' && definition
          ? [
              appraisalCreationIdentity(
                request.actorId,
                change.definitionPin,
                change.targetId,
                id,
                definition.stacking,
              ).id,
            ]
          : [];
      const bindings = {
        sources: [],
        subjects: change.kind === 'create' && change.targetId ? [change.targetId] : [],
        authorizationReceipt: id,
        completeCreates: createIds,
        priorOutcomes: await this.store.records.appraisalOutcomes(
          this.world.id,
          request.actorId,
          createIds,
        ),
      };
      const events: WorldEvent[] = [];
      let result: Outcome = {
        ok: false,
        code: 'appraisal-rejected',
        message: 'Appraisal unavailable.',
      };
      const candidate = updateWorld(this.world, (draft) => {
        result =
          change.kind === 'create'
            ? authorAppraisal(
                draft,
                request.actorId,
                change.definitionPin,
                change.targetId,
                { kind: 'qualitative' },
                {
                  kind: 'authored',
                  actorId: request.actorId,
                  authorizationReceipt: id,
                  sourceVersion: fingerprint,
                  sourceRefs: [],
                },
                bindings,
                events,
              )
            : changeAppraisal(draft, request.actorId, change, id, bindings, events);
        if (result.ok && events.length) draft.sequence++;
      });
      // The durable operation receipt and private evidence share the world commit.
      const committed = await this.commit(
        { ...this.saved, world: result.ok ? candidate : this.world },
        undefined,
        'append',
        undefined,
        {
          id,
          fingerprint,
          recoveryFingerprint: null,
          epoch: this.epoch.generation,
          expiresAt: this.now() + COMMAND_RETRY_MS,
          result,
        },
      );
      return committed ? result : { ok: false, code: 'storage', message: this.storageError! };
    });
  }

  async editCharacterKnowledge(
    value: import('@open-legend/domain').KnowledgeEdit & {
      worldId: string;
      generation: string;
      actorId: string;
      givenName?: string;
      nameRevision?: number;
    },
    scope = this.localScope,
    mode: 'creator' | 'owner' = 'creator',
  ): Promise<ApiResult> {
    if (mode === 'creator' && !this.config.godMode)
      return { ok: false, code: 'forbidden', message: 'God access required.' };

    return this.godTransition((world) => {
      if (
        !this.mayInspectPrivate(value.actorId, scope) ||
        (mode === 'owner' &&
          (value.actorId !== scope.actorId || !this.currentScope(scope, 'play', true)))
      )
        return {
          world,
          events: [],
          outcome: {
            ok: false,
            code: 'forbidden',
            message: 'Human-private character content is unavailable to this principal.',
          },
        };
      if (world.id !== value.worldId || this.generation !== value.generation)
        return {
          world,
          events: [],
          outcome: {
            ok: false,
            code: 'stale-world',
            message: 'The world changed. Reload the editor.',
          },
        };
      let edited: import('@open-legend/domain').Outcome = {
        ok: false,
        code: 'knowledge-rejected',
        message: 'Knowledge edit rejected.',
      };
      const candidate = updateWorld(world, (draft) => {
        const permitted =
          value.subjectId &&
          (mode === 'creator' ||
            canRememberSubject(draft, value.actorId, value.subjectId) ||
            knowledgeDocument(draft, value.actorId, value.subjectId))
            ? [value.subjectId]
            : [];
        if (value.givenName !== undefined && value.subjectId) {
          const named = assignGivenName(
            draft,
            value.actorId,
            {
              subjectId: value.subjectId,
              givenName: value.givenName,
              expectedRevision: value.nameRevision ?? 0,
            },
            permitted,
            mode === 'creator',
          );
          if (!named.ok) {
            edited = named;
            return;
          }
        }
        edited = editKnowledge(draft, value.actorId, value, permitted);
        if (edited.ok && value.subjectId)
          rememberSubject(draft, value.actorId, value.subjectId, mode === 'creator');
      });
      return { world: edited.ok ? candidate : world, events: [], outcome: edited };
    });
  }

  async godFamily(actorId: string, scope: RequestScope, after?: string, parentId?: string) {
    return this.authorized(scope, 'inspect', false, async () => {
      await this.ready;
      this.assertScope(scope, 'create');
      if (!this.config.godMode) throw new Error('God access required.');
      return projectFamily(this.world, this.timelineId, actorId, after, parentId);
    });
  }

  async godFamilyPeople(query: string, scope: RequestScope, after?: string) {
    return this.authorized(scope, 'inspect', false, async () => {
      await this.ready;
      this.assertScope(scope, 'create');
      if (!this.config.godMode) throw new Error('God access required.');
      return familyPeople(this.world, this.timelineId, query, after);
    });
  }

  async godFamilyEdit(value: FamilyEdit, scope: RequestScope): Promise<ApiResult> {
    await this.ready;
    const fingerprint = JSON.stringify([
      this.world.id,
      scope.accountId,
      value.id,
      value.generation,
      value.revision,
      value.change.kind,
      value.change.link.id,
      value.change.link.parentId,
      value.change.link.childId,
    ]);
    return this.reviewedTransition(
      `family:${JSON.stringify([scope.accountId, value.id])}`,
      fingerprint,
      value.generation,
      scope,
      async (world) => changeFamilyTree(world, value.change, value.revision),
    );
  }

  async godEffects(
    id: string,
    effects: BodyEffect[],
    expected: Record<string, number>,
  ): Promise<ApiResult> {
    return this.godTransition((world) => applyBodyEffects(world, id, effects, expected));
  }

  async createItem(request: GodItemRequest, scope = this.localScope): Promise<ApiResult> {
    return this.godTransition((world) => {
      this.assertScope(scope, 'create');
      if ('actorId' in request.destination) {
        const account = world.authorship.playerAccountIds[request.destination.actorId];
        if (this.config.authentication.mode !== 'local' && account && account !== scope.accountId)
          return {
            world,
            events: [],
            outcome: {
              ok: false,
              code: 'unavailable',
              message: 'That destination is unavailable.',
            },
          };
      }
      return createGodItem(world, request);
    });
  }
  async containerAccess(request: ContainerAccessRequest, scope: RequestScope): Promise<ApiResult> {
    return this.godTransition((world) => {
      this.assertScope(scope, 'create');
      const root = world.entities[request.itemId] ? custodian(world, request.itemId) : undefined;
      if (!root || (world.entities[root]?.actor && root !== scope.actorId))
        return {
          world,
          events: [],
          outcome: { ok: false, code: 'unavailable', message: 'This container is unavailable.' },
        };
      return setContainerAccess(world, request);
    });
  }

  async declareOwnership(request: OwnershipRequest, scope: RequestScope): Promise<ApiResult> {
    return this.godTransition((world) => {
      this.assertScope(scope, 'create');
      if (custodian(world, request.itemId) !== scope.actorId)
        return {
          world,
          events: [],
          outcome: { ok: false, code: 'unavailable', message: 'Choose an accessible possession.' },
        };
      return declareOwnership(world, request);
    });
  }

  async spawn(request: GodSpawnRequest, scope = this.localScope): Promise<ApiResult> {
    return this.godTransition((world) => {
      this.assertScope(scope, 'create');
      return spawnWorldEntity(world, request);
    });
  }

  async godInventionPolicy(
    expectedGeneration: string,
    expectedRevision: number,
    settings: { playerLocked: boolean; agentLocked: boolean },
    scope = this.localScope,
  ): Promise<ApiResult> {
    if (!this.config.godMode)
      return { ok: false, code: 'forbidden', message: 'God access required.' };
    return this.godTransition((world) => {
      const reject = (code: string, message: string) => ({
        world,
        events: [],
        outcome: { ok: false, code, message },
      });
      if (expectedGeneration !== this.generation)
        return reject('stale', 'The world was restored; refresh before editing.');
      // Both groups share admission; unlocking permits only finite, actor-scoped proposals.
      // docs/architecture.md#shared-invention-workflow
      return changeInventionPolicy(
        world,
        expectedRevision,
        settings,
        scope.accountId,
        'Owner changed invention settings.',
      );
    });
  }

  async godAttributeDeclaration(
    request: AttributeDeclarationRequest,
    expectedGeneration: string,
  ): Promise<ApiResult> {
    if (!this.config.godMode)
      return { ok: false, code: 'forbidden', message: 'God access required.' };
    return this.godTransition((world) =>
      expectedGeneration !== this.generation
        ? {
            world,
            events: [],
            outcome: {
              ok: false,
              code: 'stale',
              message: 'The world was restored; refresh before editing.',
            },
          }
        : admitAttributeDeclaration(world, request),
    );
  }
  async godAttributeEdit(
    request: AttributeEditRequest,
    expectedGeneration: string,
  ): Promise<ApiResult> {
    if (!this.config.godMode)
      return { ok: false, code: 'forbidden', message: 'God access required.' };
    return this.godTransition((world) =>
      expectedGeneration !== this.generation
        ? {
            world,
            events: [],
            outcome: {
              ok: false,
              code: 'stale',
              message: 'The world was restored; refresh before editing.',
            },
          }
        : editActorAttributes(world, request),
    );
  }
  async attributeEditor(actorId: string, scope = this.localScope) {
    await this.ready;
    if (!this.config.godMode)
      return { ok: false, code: 'forbidden', message: 'God access required.' };
    if (!this.mayInspectPrivate(actorId, scope)) throw new AuthorityError('forbidden');
    const entity = this.world.entities[actorId];
    if (!entity?.actor) return { ok: false, code: 'actor', message: 'Choose an actor.' };
    return {
      ok: true,
      generation: this.generation,
      manifestRevision: this.world.moduleManifest!.revision,
      attributes: projectAttributes(this.world, entity, 'owner'),
    };
  }

  diagnosticAccess(scope: RequestScope) {
    this.assertScope(scope, 'inspect');
    return {
      accountId: scope.accountId,
      actorIds: Object.keys(this.world.entities).filter((id) => this.mayInspectPrivate(id, scope)),
      allowUnscoped: this.config.authentication.mode === 'local',
    };
  }
  async mayInspectCall(id: string, scope: RequestScope): Promise<boolean> {
    this.assertScope(scope, 'inspect');
    const call = await this.store.intelligenceCall(id);
    const root = call?.parentId ? await this.store.intelligenceCall(call.parentId) : call;
    if (!root || !this.currentScope(scope, 'inspect')) return false;
    return root.ownerAccountId
      ? root.ownerAccountId === scope.accountId
      : root.actorId
        ? this.mayInspectPrivate(root.actorId, scope)
        : this.config.authentication.mode === 'local';
  }
  private mayInspectEvent(event: WorldEvent, scope: RequestScope): boolean {
    return (
      this.currentScope(scope, 'inspect') &&
      (this.config.authentication.mode === 'local' || event.audience.includes(scope.actorId))
    );
  }
  /** The local principal owns the controlled actor. Creator capabilities do not
   * grant another human's private mind; hosted principals must bind their own actor. */
  mayInspectPrivate(actorId: string, scope = this.localScope): boolean {
    if (!this.currentScope(scope)) return false;
    const actor = this.world.entities[actorId]?.actor;
    return (
      !!actor &&
      (actorId === scope.actorId ||
        (actor.controller !== 'player' && this.currentScope(scope, 'inspect')))
    );
  }

  /** Current local principal/host capability. Hosted staff authentication belongs
   * to D5; a client-provided role never grants this capability. */
  mayManageSaves(scope = this.localScope): boolean {
    return this.currentScope(scope, 'save');
  }

  private personMeters(entity: Entity): Record<string, number> {
    return Object.fromEntries(
      projectAttributes(this.world, entity, 'owner').flatMap((meter) =>
        meter.display === 'meter' && meter.status === 'known' && typeof meter.value === 'number'
          ? [[meter.id, meter.value] as const]
          : [],
      ),
    );
  }

  async personEditor(
    actorId: string,
    before?: string,
    scope = this.localScope,
  ): Promise<GodPersonEditorView | ApiResult> {
    await this.ready;
    if (!this.mayInspectPrivate(actorId, scope))
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Human-private character content is unavailable to this principal.',
      };
    await this.flush();
    const generation = this.generation;
    const actor = this.world.entities[actorId];
    if (!actor?.actor || !hasMemory(actor))
      return { ok: false, code: 'actor', message: 'Choose a person.' };
    const head = await this.store.records?.head();
    const selected =
      this.store.memories && head
        ? await this.store.memories.page(
            { worldId: this.world.id, actorId, generation: head.generation },
            before,
          )
        : undefined;
    if (generation !== this.generation || !this.mayInspectPrivate(actorId, scope))
      return {
        ok: false as const,
        code: 'stale',
        message: 'The character scope changed; refresh before reading.',
      };
    // Database reads may yield while simulation replaces this person. Project all
    // fields from the current actor together with the current meter definitions.
    const entity = this.world.entities[actorId];
    if (!entity?.actor || !hasMemory(entity))
      return { ok: false, code: 'actor', message: 'Choose a person.' };
    const entries = selected?.entries.map(formatMemoryEntry);
    const page =
      this.store.memories && head
        ? selected && {
            memories: entries!,
            before: selected.more ? entries?.at(-1)?.id : undefined,
          }
        : this.personMemoryPage(this.world, actorId, before);
    if (!page)
      return { ok: false, code: 'stale', message: 'History changed; refresh before paging.' };
    return {
      ...page,
      ok: true,
      revision: this.viewRevision,
      actorId,
      generation,
      manifestRevision: this.world.moduleManifest.revision,
      bodyPolicyPin: this.world.moduleManifest.bodyPolicyPin,
      meters: projectAttributes(this.world, entity, 'owner'),
      statuses: [
        !entity.actor.alive ? 'Dead' : entity.actor.incapacitated ? 'Incapacitated' : 'Alive',
        ...projectStatusEffects(this.world, entity).map((effect) => effect.label),
      ],
      itemOptions: Object.values(this.world.itemDefinitions)
        .map((item) => ({ id: item.id, name: item.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      traitOptions: entity.actor.traits?.map((trait) => ({ ...trait })) ?? [],
      person: {
        inventory: inventoryTotals(this.world, actorId),
        name: entity.name,
        description:
          entity.actor.description?.trim() || `${entity.name} is a person in the clearing.`,
        personality: entity.actor.personality ?? '',
        backstory: entity.actor.backstory ?? '',
        traitIds: entity.actor.traits?.map((trait) => trait.id) ?? [],
        goals: goalTexts(entity.actor),
        meters: this.personMeters(entity),
      },
    };
  }

  async personMemoryJson(actorId: string, entryId: string, scope = this.localScope) {
    await this.ready;
    if (!this.mayInspectPrivate(actorId, scope))
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Human-private character content is unavailable to this principal.',
      };
    await this.flush();
    const generation = this.generation;
    const head = await this.store.records?.head();
    const entry =
      this.store.memories && head
        ? await this.store.memories.entry(
            { worldId: this.world.id, actorId, generation: head.generation },
            entryId,
          )
        : experienceEntry(this.world, actorId, entryId);
    if (generation !== this.generation || !this.mayInspectPrivate(actorId, scope))
      return {
        ok: false as const,
        code: 'stale',
        message: 'The character scope changed; refresh before reading.',
      };
    return entry
      ? { ok: true as const, hash: digest(entry.value), json: JSON.stringify(entry.value, null, 2) }
      : { ok: false as const, code: 'memory', message: 'That memory no longer exists.' };
  }

  async savePersonEditor(
    actorId: string,
    basePerson: GodPersonEditorDraft,
    person: GodPersonEditorDraft,
    memoryChanges: Array<{
      entryId: string;
      expectedHash: string;
      replacement: GodMemoryEdit | null;
    }>,
    expected: { manifestRevision: number; bodyPolicyPin: DefinitionPin | null; generation: string },
    scope = this.localScope,
  ): Promise<ApiResult & { revision?: number }> {
    return this.withHistoryEdit(
      {
        sources: memoryChanges.map((change) => ({
          actorId,
          sourceId: change.entryId.slice(change.entryId.indexOf(':') + 1),
        })),
      },
      async () => {
        await this.ready;
        if (!this.mayInspectPrivate(actorId, scope))
          return {
            ok: false as const,
            code: 'forbidden',
            message: 'Human-private character content is unavailable to this principal.',
          };
        if (!this.config.godMode || !this.currentScope(scope, 'create'))
          return {
            ok: false,
            code: 'forbidden',
            message: 'Creator access is required to edit a person.',
          };
        if (
          expected.generation !== this.generation ||
          expected.manifestRevision !== this.world.moduleManifest.revision ||
          expected.bodyPolicyPin?.id !== this.world.moduleManifest.bodyPolicyPin?.id ||
          expected.bodyPolicyPin?.version !== this.world.moduleManifest.bodyPolicyPin?.version ||
          expected.bodyPolicyPin?.digest !== this.world.moduleManifest.bodyPolicyPin?.digest
        )
          return {
            ok: false,
            code: 'stale',
            message:
              'The installed meter definitions or world timeline changed. Refresh and review the form before saving.',
            revision: this.viewRevision,
          };
        const entity = this.world.entities[actorId];
        if (!entity?.actor || !hasMemory(entity))
          return { ok: false, code: 'actor', message: 'Choose a person.' };
        const currentPerson: GodPersonEditorDraft = {
          inventory: inventoryTotals(this.world, actorId),
          name: entity.name,
          description:
            entity.actor.description?.trim() || `${entity.name} is a person in the clearing.`,
          personality: entity.actor.personality ?? '',
          backstory: entity.actor.backstory ?? '',
          traitIds: entity.actor.traits?.map((trait) => trait.id) ?? [],
          goals: goalTexts(entity.actor),
          meters: this.personMeters(entity),
        };
        const changedFields = (Object.keys(person) as Array<keyof GodPersonEditorDraft>).filter(
          (key) => JSON.stringify(person[key]) !== JSON.stringify(basePerson[key]),
        );
        for (const key of changedFields) {
          // Simulation-owned meters may drift after opening; an explicit god edit overrides
          // that snapshot. Other fields retain field-level optimistic concurrency.
          if (
            key !== 'meters' &&
            JSON.stringify(currentPerson[key]) !== JSON.stringify(basePerson[key])
          )
            return {
              ok: false,
              code: 'stale',
              message: `This person's ${key} changed elsewhere. Refresh before saving it.`,
              revision: this.viewRevision,
            };
        }
        const mergedPerson = { ...currentPerson };
        for (const key of changedFields)
          Object.assign(mergedPerson, { [key]: structuredClone(person[key]) });
        const entries = memoryChanges.length ? experienceEntries(this.world, actorId) : undefined;
        for (const change of memoryChanges) {
          const entry = entries?.get(change.entryId);
          if (!entry || digest(entry.value) !== change.expectedHash)
            return {
              ok: false,
              code: 'stale',
              message: 'A memory you changed was updated elsewhere. Refresh and review it.',
              revision: this.viewRevision,
            };
        }
        const result = editPersonState(this.world, {
          actorId,
          person: mergedPerson,
          memoryChanges,
        });
        if (!result.outcome.ok) return result.outcome;
        if (
          !(await this.commit(
            { ...this.saved, world: result.world },
            result.invalidatedMemoryIds,
            // Meter edits reconcile through the body/condition owners and may append events.
            'append',
          ))
        )
          return { ok: false, code: 'storage', message: this.storageError! };
        return { ...result.outcome, revision: this.viewRevision };
      },
    );
  }

  async worldEventsEditor(
    before?: number,
    scope = this.localScope,
  ): Promise<GodWorldEventsEditorView> {
    await this.ready;
    const page = await this.store.history?.eventPage(
      this.world.id,
      before,
      this.config.authentication.mode === 'local' ? undefined : scope.actorId,
    );
    return {
      before: page?.before,
      ok: true,
      revision: this.viewRevision,
      events: (
        page?.events ??
        this.world.events.filter((event) => this.mayInspectEvent(event, scope)).slice(-100)
      ).map((event) => ({
        id: event.id,
        type: event.type,
        text: event.text,
        time: event.at,
        actors: [event.actorId, event.targetId].filter((value): value is string => !!value),
        hash: digest(event),
      })),
    };
  }

  async storyEditor() {
    await this.ready;
    return {
      ok: true,
      policy: this.world.storyPolicy ?? defaultStoryPolicy(),
      revision: this.world.storyPolicyRevision ?? 0,
    };
  }
  async saveStoryEditor(
    revision: number,
    policy: StoryPolicy,
    changes: { entityId: string; values: Record<string, number> | null }[],
  ) {
    return this.mutate(async () => {
      await this.ready;
      if (revision !== (this.world.storyPolicyRevision ?? 0))
        return {
          ok: false,
          code: 'stale',
          message: 'Story configuration changed. Refresh before saving.',
        };
      let world: WorldState;
      try {
        world = editStoryMechanism(this.world, policy, changes);
      } catch (error) {
        return {
          ok: false,
          code: 'invalid',
          message: error instanceof Error ? error.message : 'Invalid story configuration.',
        };
      }
      if (!(await this.commit({ ...this.saved, world }, undefined, 'diff')))
        return { ok: false, message: this.storageError! };
      return { ok: true, message: 'Story mechanism saved.' };
    });
  }

  async worldEventJson(id: string, scope = this.localScope) {
    await this.ready;
    const event = this.worldEvent(id) ?? (await this.store.history?.event(this.world.id, id));
    return event && this.mayInspectEvent(event, scope)
      ? { ok: true as const, hash: digest(event), json: JSON.stringify(event, null, 2) }
      : { ok: false as const, code: 'event', message: 'That world event no longer exists.' };
  }

  async saveWorldEventsEditor(
    changes: Array<{ id: string; expectedHash: string; replacement: WorldEvent | null }>,
    scope = this.localScope,
  ): Promise<ApiResult & { revision?: number }> {
    return this.withHistoryEdit(
      { eventIds: changes.map((change) => change.id) },
      async (prepared) => {
        await this.ready;
        const cold = prepared?.events.filter((event) => !this.worldEventsById.has(event.id)) ?? [];
        const original = cold.length
          ? {
              ...this.world,
              events: [...this.world.events, ...cold].sort(
                (a, b) => (a.order ?? a.sequence) - (b.order ?? b.sequence),
              ),
              archivedEventCount: (this.world.archivedEventCount ?? 0) - cold.length,
            }
          : this.world;
        const eventsById = new Map(original.events.map((event) => [event.id, event]));
        for (const change of changes) {
          const event = eventsById.get(change.id);
          if (
            !event ||
            !this.mayInspectEvent(event, scope) ||
            digest(event) !== change.expectedHash
          )
            return {
              ok: false,
              code: 'stale',
              message: 'A world event you changed was updated elsewhere. Refresh and review it.',
              revision: this.viewRevision,
            };
        }
        const result = editWorldEventsState(original, changes, prepared?.referencedEventIds);
        if (!result.outcome.ok) return result.outcome;
        if (
          !(await this.commit(
            { ...this.saved, world: result.world },
            result.invalidatedMemoryIds,
            'diff',
            original,
          ))
        )
          return { ok: false, code: 'storage', message: this.storageError! };
        return { ...result.outcome, revision: this.viewRevision };
      },
    );
  }

  async command(
    commandId: string,
    input: CommandInput,
    actorId?: string,
    epoch?: string,
    scope?: RequestScope,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;
      if (scope) this.assertScope(scope, 'play', true);
      const actor = scope?.actorId ?? actorId ?? this.controlledEntityId;
      if (commandId.startsWith('gameplay:'))
        return {
          ok: false,
          code: 'invalid-command',
          message: 'Command IDs cannot use the reserved gameplay namespace.',
        };
      // Legacy callers retain their old identity rules; new clients bind retries to their issued epoch.
      if (scope && (!epoch || !this.store.commands)) throw new AuthorityError('stale-scope');
      const prepare = async () => {
        if (!input.knownPlace) return input;
        if (input.type !== 'move')
          return {
            ok: false,
            code: 'invalid-command',
            message: 'A remembered place can only select a movement destination.',
          };
        const result = await resolveKnownPlaceMove(this, actor, input.knownPlace);
        if (!('position' in result)) return result;
        const { knownPlace: _reference, ...command } = input;
        return { ...command, position: result.position };
      };
      if (epoch === undefined || !this.store.commands) {
        const resolved = await prepare();
        return 'type' in resolved
          ? await this.evaluateCommand(
              commandId,
              resolved,
              actor,
              false,
              undefined,
              scope ?? this.localScope,
            )
          : resolved;
      }
      await this.refreshCommandEpoch();
      const id = `gameplay:${scope?.accountId ?? 'local-player'}:${epoch}:${digest(commandId)}`;
      const fingerprint = digest({ actor, input, ...(scope ? { scope } : {}) });
      const prior = await this.store.commands.get(this.world.id, id);
      if (prior) {
        if (this.now() >= prior.expiresAt)
          return { ok: false, code: 'expired', message: 'This command retry window has expired.' };
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
      const resolved = await prepare();
      if (!('type' in resolved)) return resolved;
      return await this.evaluateCommand(
        id,
        resolved,
        actor,
        false,
        {
          id,
          epoch: this.epoch.generation,
          fingerprint,
          recoveryFingerprint: scope ? commandRecoveryFingerprint(input, scope) : null,
          expiresAt: this.now() + COMMAND_RETRY_MS,
        },
        scope ?? this.localScope,
      );
    });
  }

  /** Resolve an original request without re-admitting it under changed control. */
  async commandReceipt(
    commandId: string,
    input: CommandInput,
    epoch: string,
    scope: RequestScope,
  ): Promise<CommandReceiptResult> {
    return this.mutate(async () => {
      await this.ready;
      this.assertScope(scope);
      const audience = scopeKey(scope);
      const id = `gameplay:${scope.accountId}:${epoch}:${digest(commandId)}`;
      const prior = await this.store.commands?.get(this.world.id, id);
      this.assertScope(scope);
      if (!prior)
        return {
          ok: false,
          scope: audience,
          status: epoch === this.commandEpoch ? 'unknown' : 'expired',
          message:
            'The original result is not available. This does not confirm whether it happened.',
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
    });
  }

  /** Run current admission; native pure prerequisites or disposable effects never commit. */
  previewCommand(input: CommandInput, actorId = this.controlledEntityId): ApiResult {
    const result = this.evaluateCommand(randomUUID(), input, actorId, true) as ApiResult;
    if (result.code === 'lethal-review-required') return { ...result, ok: true };
    if (result.ok && input.type === 'activity-request') {
      const notes = reviewActivityRequest(this.world, actorId, {
        family: input.activityFamilyId!,
        arguments: input.activityArguments!,
      });
      return { ...result, message: [result.message, ...notes].join(' ') };
    }
    return result;
  }

  /** Family binding is shared by UI commands and reviewed agent commands. */
  private bindCommand(
    commandId: string,
    input: CommandInput,
    actorId: string,
  ): Command | ApiResult {
    const envelope = {
      id: commandId,
      actorId,
      ...(input.purpose ? { purpose: input.purpose } : {}),
    };
    let command: Command;
    switch (input.type) {
      case 'outing':
        if (input.outingOperation === 'invite' && input.targetId && input.outingMode)
          return {
            ...envelope,
            type: 'outing',
            operation: 'invite',
            recipientId: input.targetId,
            destinationId: input.destinationId,
            destination: input.position,
            mode: input.outingMode,
          };
        if (
          (input.outingOperation === 'accept' ||
            input.outingOperation === 'decline' ||
            input.outingOperation === 'leave') &&
          input.outingId &&
          input.expectedRevision !== undefined
        )
          return {
            ...envelope,
            type: 'outing',
            operation: input.outingOperation,
            outingId: input.outingId,
            expectedRevision: input.expectedRevision,
            mode: input.outingMode,
          };
        return {
          ok: false,
          code: 'outing-choices',
          message: 'Choose the exact invitation and reply.',
        };
      case 'activity-request':
        if (!input.activityFamilyId || !input.activityArguments)
          return {
            ok: false,
            code: 'activity-choices',
            message: 'Choose the activity and every required parameter.',
          };
        {
          const bound = bindActivityRequest(this.world, actorId, commandId, {
            family: input.activityFamilyId,
            arguments: input.activityArguments,
          });
          return 'ok' in bound
            ? bound
            : { ...bound, ...(input.purpose ? { purpose: input.purpose } : {}) };
        }
      case 'activity':
        if (!input.methodId || !input.bindings)
          return {
            ok: false,
            code: 'binding',
            message: 'Choose a learned method and current objects.',
          };
        command = {
          ...envelope,
          type: 'activity',
          methodId: input.methodId,
          bindings: input.bindings,
          ...(input.resume ? { resume: true } : {}),
        };
        break;
      case 'say':
        if (!input.text?.trim())
          return { ok: false, code: 'speech', message: 'Enter something to say.' };
        command = {
          ...envelope,
          type: 'say',
          text: input.text,
          ...(input.targetId ? { targetId: input.targetId } : {}),
        };
        break;
      case 'conversation':
        if (!input.conversationId || input.generation === undefined || !input.operation)
          return { ok: false, code: 'conversation', message: 'Choose a current conversation.' };
        command = {
          ...envelope,
          type: 'conversation',
          operation: input.operation,
          conversationId: input.conversationId,
          generation: input.generation,
        };
        break;
      case 'move':
        if (!input.position)
          return { ok: false, code: 'position', message: 'Choose a destination.' };
        command = { ...envelope, type: 'move', destination: input.position };
        break;
      case 'cancel':
        command = { ...envelope, type: 'cancel', expectedActionId: input.expectedActionId };
        break;
      case 'status-effect':
        if (!input.targetId || !input.definitionId || !input.effectOperation)
          return {
            ok: false,
            code: 'binding',
            message: 'Choose a status effect, operation and target.',
          };
        command = {
          ...envelope,
          type: 'status-effect',
          targetId: input.targetId,
          definitionId: input.definitionId,
          operation: input.effectOperation,
        };
        break;
      case 'pickup':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose a pile.' };
        command = {
          ...envelope,
          type: 'pickup',
          targetId: input.targetId,
          ...(input.itemId ? { itemId: input.itemId } : {}),
          ...(input.itemId && input.quantity ? { quantity: input.quantity } : {}),
        };
        break;
      case 'transfer-item':
      case 'split-item':
      case 'merge-item':
        if (
          !input.itemId ||
          !input.targetId ||
          input.quantity === undefined ||
          input.expectedRevision === undefined ||
          input.placementRevision === undefined ||
          input.targetRevision === undefined
        )
          return {
            ok: false,
            code: 'item',
            message: 'Choose current item, quantity and destination references.',
          };
        command = {
          ...envelope,
          type: input.type,
          itemId: input.itemId,
          quantity: input.quantity,
          targetId: input.targetId,
          expectedRevision: input.expectedRevision,
          placementRevision: input.placementRevision,
          ...(input.expectedContentsRevision !== undefined
            ? { expectedContentsRevision: input.expectedContentsRevision }
            : {}),
          targetRevision: input.targetRevision,
        };
        break;
      case 'unequip':
        if (
          !input.itemId ||
          input.expectedRevision === undefined ||
          input.placementRevision === undefined
        )
          return { ok: false, code: 'item', message: 'Choose current equipment.' };
        command = {
          ...envelope,
          type: 'unequip',
          itemId: input.itemId,
          expectedRevision: input.expectedRevision,
          placementRevision: input.placementRevision,
        };
        break;
      case 'drop':
        if (!input.itemId || input.quantity === undefined)
          return { ok: false, code: 'item', message: 'Choose an item and quantity.' };
        command = { ...envelope, type: 'drop', itemId: input.itemId, quantity: input.quantity };
        break;
      case 'confirm-attempt':
      case 'withdraw-attempt':
        if (!input.attemptId)
          return { ok: false, code: 'attempt', message: 'Choose a pending action.' };
        command = { ...envelope, type: input.type, attemptId: input.attemptId };
        break;
      case 'follow':
        if (!input.targetId)
          return { ok: false, code: 'target', message: 'Choose an actor to follow.' };
        command = {
          ...envelope,
          type: 'follow',
          targetId: input.targetId,
          ...(input.distance !== undefined ? { distance: input.distance } : {}),
        };
        break;
      case 'gather':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose a target.' };
        command = {
          ...envelope,
          type: 'gather',
          targetId: input.targetId,
          ...(input.itemId ? { itemId: input.itemId } : {}),
        };
        break;
      case 'harvest':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose a target.' };
        command = { ...envelope, type: input.type, targetId: input.targetId };
        break;
      case 'replenish':
        if (!input.targetId || !input.attributeId)
          return {
            ok: false,
            code: 'binding',
            message: 'Choose a replenishment source and attribute.',
          };
        command = {
          ...envelope,
          type: 'replenish',
          targetId: input.targetId,
          attributeId: input.attributeId,
        };
        break;
      case 'prepare':
        command = { ...envelope, type: 'prepare', preparation: input.preparation ?? 'fiber' };
        break;
      case 'craft':
        if (!input.recipeId)
          return { ok: false, code: 'recipe', message: 'Choose an admitted recipe.' };
        command = { ...envelope, type: 'craft', recipeId: input.recipeId };
        break;
      case 'equip':
      case 'eat':
        if (!input.itemId) return { ok: false, code: 'item', message: 'Choose an item.' };
        command = { ...envelope, type: input.type, itemId: input.itemId };
        break;
      case 'cook': {
        if (!input.itemId) return { ok: false, code: 'item', message: 'Choose raw food to cook.' };
        const heatId =
          input.targetId ??
          Object.values(this.world.entities).find((entity) => entity.heat?.lit)?.id;
        if (!heatId)
          return { ok: false, code: 'heat', message: 'There is no supported lit cooking fire.' };
        command = { ...envelope, type: 'cook', itemId: input.itemId, heatId };
        break;
      }
      case 'tend-fire':
        // Always an explicitly chosen perceived fire; never a world-wide search.
        if (!input.targetId || !input.fireOperation)
          return {
            ok: false,
            code: 'target',
            message: 'Choose a campfire and what to do with it.',
          };
        command = {
          ...envelope,
          type: 'tend-fire',
          operation: input.fireOperation,
          targetId: input.targetId,
          ...(input.itemId ? { itemId: input.itemId } : {}),
        };
        break;
      case 'handover':
        if (!input.targetId || !input.handoverOperation)
          return { ok: false, code: 'target', message: 'Choose a person and an offer.' };
        if (input.handoverOperation === 'offer' || input.handoverOperation === 'counter') {
          if (!input.itemId || input.quantity === undefined)
            return { ok: false, code: 'item', message: 'Choose what to offer and how many.' };
          command = {
            ...envelope,
            type: 'handover',
            operation: input.handoverOperation,
            targetId: input.targetId,
            itemId: input.itemId,
            quantity: input.quantity,
            ...(input.requestedItem ? { requested: input.requestedItem } : {}),
            ...(input.offerId ? { offerId: input.offerId } : {}),
            ...(input.expectedOfferRevision !== undefined
              ? { expectedOfferRevision: input.expectedOfferRevision }
              : {}),
            ...(input.expectedRevision !== undefined
              ? { expectedRevision: input.expectedRevision }
              : {}),
            ...(input.placementRevision !== undefined
              ? { placementRevision: input.placementRevision }
              : {}),
            ...(input.expectedContentsRevision !== undefined
              ? { expectedContentsRevision: input.expectedContentsRevision }
              : {}),
            ...(input.targetRevision !== undefined ? { targetRevision: input.targetRevision } : {}),
          };
        } else {
          if (!input.offerId || input.expectedOfferRevision === undefined)
            return { ok: false, code: 'offer', message: 'Choose an offer and its current terms.' };
          command = {
            ...envelope,
            type: 'handover',
            operation: input.handoverOperation,
            targetId: input.targetId,
            offerId: input.offerId,
            expectedOfferRevision: input.expectedOfferRevision,
          };
        }
        break;
      case 'inspect-activities':
        command = {
          ...envelope,
          type: 'inspect-activities',
          after: input.historyAfter ?? -1,
          methodAfter: input.methodAfter ?? 0,
        };
        break;
      case 'inspect-inventory':
        command = {
          ...envelope,
          type: 'inspect-inventory',
          containerId: input.containerId,
          itemId: input.itemId,
          after: input.after,
          expectedRevision: input.expectedRevision,
          expectedScope: input.expectedScope,
        };
        break;
      case 'strike':
        if (!input.targetId || !input.definitionId)
          return { ok: false, code: 'target', message: 'Choose a strike and target.' };
        command = {
          ...envelope,
          type: 'strike',
          humanInitiated: true,
          targetId: input.targetId,
          definitionId: input.definitionId,
          ...(input.itemId ? { weaponItemId: input.itemId } : {}),
        };
        break;
      case 'hunt':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose an animal.' };
        command = {
          ...envelope,
          type: 'hunt',
          humanInitiated: true,
          targetId: input.targetId,
          ...(input.itemId ? { weaponItemId: input.itemId } : {}),
          ...(input.ammunitionId ? { ammoItemId: input.ammunitionId } : {}),
        };
        break;
      case 'treat-scar':
        if (!input.targetId || !input.scarId)
          return { ok: false, code: 'target', message: 'Choose a scar and rest spot.' };
        command = {
          ...envelope,
          type: 'treat-scar',
          targetId: input.targetId,
          scarId: input.scarId,
        };
        break;
      case 'teach':
        if (!input.targetId || !input.recipeId)
          return { ok: false, code: 'target', message: 'Choose a person and a learned recipe.' };
        command = {
          ...envelope,
          type: 'teach',
          targetId: input.targetId,
          recipeId: input.recipeId,
        };
        break;
      default:
        command = { ...envelope, type: input.type };
    }
    return command;
  }

  reviewedCommandTransition(
    world: WorldState,
    id: string,
    input: CommandInput,
    scope: RequestScope,
  ): Transition {
    if (world !== this.world || !this.currentScope(scope, 'play', true))
      return {
        world,
        events: [],
        outcome: { ok: false, code: 'stale-controller', message: 'The controlled actor changed.' },
      };
    const bound = this.bindCommand(id, input, scope.actorId);
    return 'actorId' in bound
      ? executeCommand(world, bound)
      : { world, events: [], outcome: bound };
  }

  private evaluateCommand(
    commandId: string,
    input: CommandInput,
    actorId: string,
    preview: boolean,
    gameplay?: Omit<GameplayReceipt, 'result'>,
    scope?: RequestScope,
  ): ApiResult | Promise<ApiResult> {
    const bound = this.bindCommand(commandId, input, actorId);
    if (!('actorId' in bound)) return bound;
    let command = bound;
    if (preview) {
      if (this.paused && input.type !== 'inspect-inventory')
        return { ok: false, code: 'paused', message: 'Resume the world to act.' };
      const { outcome } = executeCommand(this.world, command, { preview: true });
      return { ok: outcome.ok, code: outcome.code, message: outcome.message };
    }
    const { lethalReviewId, ...unreviewedInput } = input;
    const inputDigest = digest(unreviewedInput);
    const reviewScope = scope ? digest({ scope, generation: this.generation }) : undefined;
    if (lethalReviewId) {
      const review = this.lethalReviews.get(actorId);
      if (
        !review ||
        review.view.id !== lethalReviewId ||
        review.scope !== reviewScope ||
        review.expiresAt <= this.now() ||
        review.inputDigest !== inputDigest ||
        (review.command.type !== 'strike' && review.command.type !== 'hunt')
      )
        return {
          ok: false,
          code: 'lethal-review-stale',
          message: 'That attack review expired or changed. Choose the attack again.',
        };
      command = { ...review.command, id: commandId, lethalPermission: review.permission };
    } else if (scope && (command.type === 'strike' || command.type === 'hunt')) {
      const preview = executeCommand(this.world, command, { preview: true }).outcome;
      if (preview.code === 'lethal-review-required') {
        const offer = lethalAttackOffer(this.world, command),
          policy = bodyPolicy(this.world)?.lethalAttackReview;
        if (!offer || !policy) return preview;
        // One pending review per controlled actor, with a cap shared by connected requests.
        // No target lock, paid work, ammo debit or action occurs while the dialog is open.
        for (const [actor, prior] of this.lethalReviews)
          if (prior.expiresAt <= this.now()) this.lethalReviews.delete(actor);
        if (
          !this.lethalReviews.has(actorId) &&
          this.lethalReviews.size >= this.config.capacity.requests
        )
          return {
            ok: false,
            code: 'busy',
            message: 'Attack review capacity is full. Try again shortly.',
          };
        const prior = this.lethalReviews.get(actorId);
        if (
          prior?.requestId === commandId &&
          prior.scope === reviewScope &&
          prior.inputDigest === inputDigest
        )
          return { ...preview, lethalReview: prior.view };
        const attack = nativeActivityView(this.world, offer.command);
        const view: NonNullable<ApiResult['lethalReview']> = {
          id: randomUUID(),
          ...policy,
          targetLabel: observerName(this.world, actorId, offer.permission.targetId).name,
          attack: {
            name: attack.name,
            ...(attack.tool ? { tool: attack.tool } : {}),
            facts: attack.facts
              .filter((fact) => fact.critical)
              .map((fact) => ({
                name: fact.name,
                value: String(fact.value),
                critical: true,
              })),
          },
        };
        this.lethalReviews.set(actorId, {
          requestId: commandId,
          inputDigest,
          scope: reviewScope!,
          expiresAt: this.now() + 60_000,
          command: offer.command,
          permission: offer.permission,
          view,
        });
        return { ...preview, lethalReview: view };
      }
    }
    return this.transition(
      (world) => executeCommand(world, command),
      gameplay,
      undefined,
      undefined,
      command.type,
    ).then((result) => {
      if (lethalReviewId && (result.ok || result.code === 'lethal-review-stale'))
        this.lethalReviews.delete(actorId);
      return result;
    });
  }

  async say(
    requestId: string,
    actorId: string,
    text: string,
    targetId?: string,
    volume: SpeechVolume = 'normal',
  ): Promise<ApiResult> {
    return await this.transition((world) =>
      executeCommand(world, {
        id: requestId,
        actorId,
        type: 'say',
        text,
        volume,
        ...(targetId ? { targetId } : {}),
      }),
    );
  }

  async correctMemory(
    actorId: string,
    sourceId: string,
    correctionEventId: string,
    scope = this.localScope,
  ): Promise<ApiResult> {
    return this.withHistoryEdit(
      {
        sources: [
          { actorId, sourceId },
          { actorId, sourceId: correctionEventId },
        ],
      },
      async () => {
        await this.ready;
        if (!this.mayInspectPrivate(actorId, scope))
          return {
            ok: false as const,
            code: 'forbidden',
            message: 'Human-private character content is unavailable to this principal.',
          };

        const corrected = correctExperience(this.world, actorId, sourceId, correctionEventId);
        if (!corrected.outcome.ok) return corrected.outcome;
        const ok = await this.commit(
          { ...this.saved, world: corrected.world },
          corrected.invalidatedMemoryIds,
          'unchanged',
        );
        return {
          ok,
          code: ok ? 'corrected' : 'storage',
          message: ok ? corrected.outcome.message : this.storageError!,
        };
      },
    );
  }

  async forgetMemory(
    actorId: string,
    sourceId: string,
    scope = this.localScope,
  ): Promise<ApiResult> {
    return this.withHistoryEdit({ sources: [{ actorId, sourceId }] }, async () => {
      await this.ready;
      if (!this.mayInspectPrivate(actorId, scope))
        return {
          ok: false as const,
          code: 'forbidden',
          message: 'Human-private character content is unavailable to this principal.',
        };

      if (!this.world.entities[actorId]?.actor)
        return { ok: false, code: 'actor', message: 'Unknown actor.' };
      const recordedAction =
        this.world.actionExperience.occurrences[actorId]?.some((entry) => entry.id === sourceId) ||
        (await this.store.records?.activityPage(this.world.id, actorId, -1, [sourceId]))?.length;
      if (
        !recordedAction &&
        !experiences(this.world, actorId, true).some(
          (m) => m.id === sourceId || m.eventId === sourceId,
        )
      )
        return {
          ok: false,
          code: 'source',
          message: 'That source is not retained for this actor.',
        };
      const forgotten = forgetExperience(this.world, actorId, sourceId);
      if (!forgotten.outcome.ok) return forgotten.outcome;
      const ok = await this.commit(
        { ...this.saved, world: forgotten.world },
        forgotten.invalidatedMemoryIds,
        'unchanged',
      );
      return {
        ok,
        code: ok ? 'forgotten' : 'storage',
        message: ok
          ? 'Recall and derived text invalidated; workspace resets before its next fresh job.'
          : this.storageError!,
      };
    });
  }

  async setGoal(requestId: string, text: string): Promise<ApiResult> {
    return await this.transition((world) =>
      executeCommand(world, {
        id: requestId,
        actorId: this.defaultResidentEntityId,
        type: 'goal',
        text,
      }),
    );
  }

  async admit(
    draft: DeclarationDraft,
    provenance: DeclarationProvenance,
    checkCurrent?: () => void,
  ): Promise<ApiResult> {
    return await this.transition((world) => {
      // Recheck cancellation after waiting for the writer, before publishing the candidate.
      // docs/architecture.md#shared-invention-workflow
      checkCurrent?.();
      const errors = scopedInventionErrors(this, provenance.actorId, draft, world);
      if (errors.length)
        return {
          world,
          events: [],
          outcome: { ok: false, code: 'invalid-declaration', message: errors.join(' ') },
        };
      return admitDeclaration(world, draft, provenance);
    });
  }

  observe(actorId: string, options: { includeMemories?: boolean } = {}) {
    return observeActor(this.world, actorId, options);
  }
}
