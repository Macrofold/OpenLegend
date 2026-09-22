import { recordDuration, timed, countMetric, gaugeMetric } from './performance.js';
import { retainHotEvents } from './hot-events.js';
import { COMMAND_RETRY_MS, type CommandEpoch, type GameplayReceipt } from './command-receipts.js';
import { createPersonMemoryPager } from './person-memory-page.js';
import {
  controlledEntityId,
  defaultStoryPolicy,
  defaultResidentEntityId,
  validateStoryPolicy,
  editStoryMechanism,
  type StoryPolicy,
} from '@open-legend/domain';
import { changeConversation, leaveConversation } from '@open-legend/domain';
import { establishKinship, type Kinship } from '@open-legend/domain';
import { applyBodyEffects, type BodyEffect } from '@open-legend/domain';
import { enableActorCognition } from '@open-legend/domain';
import { migrateActors, hasMemory } from '@open-legend/domain';
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
  advanceWorld,
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
  type GodSpawnDraft,
  type GodMemoryEdit,
  type GodPersonDraft,
  type GodPersonEditorDraft,
  type WorldEvent,
  type WorldState,
} from '@open-legend/domain';
import type {
  ApiResult,
  CommandInput,
  GodPersonEditorView,
  GodWorldEventsEditorView,
  PlayerProfile,
  PlayerPreferencePatch,
} from '@open-legend/protocol';
import type { AppConfig } from './config.js';
import { digest, type SavedWorld, type GameRepository } from './store.js';

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
export const commandInputSchema = z
  .object({
    type: z.enum([
      'conversation',
      'move',
      'gather',
      'prepare',
      'craft',
      'equip',
      'hunt',
      'harvest',
      'cook',
      'eat',
      'rest',
      'cancel',
      'recover',
      'teach',
    ]),
    conversationId: id.optional(),
    generation: z.number().int().nonnegative().optional(),
    operation: z.enum(['join', 'leave']).optional(),
    targetId: id.optional(),
    itemId: id.optional(),
    recipeId: id.optional(),
    ammunitionId: id.optional(),
    position: z.object({ x: z.number().finite(), z: z.number().finite() }).strict().optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    preparation: z.enum(['fiber', 'cord']).optional(),
  })
  .strict();
export const requestIdSchema = id;

function updateMilestones(saved: SavedWorld, events: WorldEvent[]): SavedWorld {
  const flags = { ...saved.milestones };
  if (
    !flags['talk'] &&
    events.some(
      (event) =>
        event.type === 'speech' &&
        event.actorId !== controlledEntityId(saved.world) &&
        event.audience.includes(controlledEntityId(saved.world)),
    )
  )
    flags['talk'] = true;
  if (
    !flags['hunt'] &&
    events.some(
      (event) => event.type === 'harvested' && event.actorId === controlledEntityId(saved.world),
    )
  )
    flags['hunt'] = true;
  if (
    !flags['eat'] &&
    events.some(
      (event) =>
        event.type === 'ate' &&
        event.actorId === controlledEntityId(saved.world) &&
        /meat/i.test(event.text),
    )
  )
    flags['eat'] = true;
  if (!flags['invent'] || !flags['bow']) {
    const known = (saved.world.knowledge[controlledEntityId(saved.world)] ?? []).map(
      (record) => saved.world.recipes[record.recipeId],
    );
    if (!flags['invent'] && known.some((recipe) => recipe?.output.launcher?.mechanism === 'swing'))
      flags['invent'] = true;
    if (
      !flags['bow'] &&
      known.some((recipe) => recipe?.output.launcher?.mechanism === 'flex') &&
      known.some((recipe) => recipe?.output.ammunition?.kind === 'arrow')
    )
      flags['bow'] = true;
  }
  if (
    !flags['craft'] &&
    saved.world.entities[controlledEntityId(saved.world)]?.actor?.equippedItemId
  )
    flags['craft'] = true;
  return { ...saved, milestones: flags };
}

/** Application coordination only: pure rules live in domain; all I/O is through a store. */
export class WorldService {
  private saved!: SavedWorld;
  private readonly personMemoryPage = createPersonMemoryPager();
  private worldEventsById = new Map<string, WorldEvent>();
  private persistedRevision = 0;
  private persistedEvents: WorldEvent[] = [];
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
  private lastRoutinePersistAt = 0;
  private unpersisted = false;
  private readonly listeners = new Set<() => void>();
  private readonly presence = new Map<string, number>();
  private readonly presenceOrders = new Map<string, number>();
  private readonly connections = new Set<string>();
  private pauseWhenHidden = true;
  private currentProfile!: PlayerProfile;
  readonly ready: Promise<void>;
  private mutationTail: Promise<unknown> = Promise.resolve();
  private mutationContext = new AsyncLocalStorage<boolean>();
  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    if (this.mutationContext.getStore()) return await operation();
    const queuedAt = performance.now();
    const next = this.mutationTail.then(() => {
      recordDuration('mutation.wait', performance.now() - queuedAt);
      return this.mutationContext.run(true, operation);
    });
    this.mutationTail = next.catch(() => undefined);
    return next;
  }
  private debtSeconds = 0;
  storageError: string | null = null;
  memoryBacklog: string | null = null;
  readonly generation = randomUUID();

  constructor(
    readonly store: GameRepository,
    readonly config: AppConfig,
    private readonly now = Date.now,
  ) {
    this.ready = this.initialize();
  }
  private async initialize() {
    const { store, config } = this;
    await store.ready;
    this.currentProfile = await store.getProfile('local-player');
    const existing = await store.load();
    if (
      existing &&
      existing.state.world.schemaVersion !== 3 &&
      !(await store.getIntegration(`legacy-backup:${existing.state.world.id}`))
    )
      await store.putIntegration(
        `legacy-backup:${existing.state.world.id}`,
        structuredClone(existing),
      );
    this.pauseWhenHidden = this.profile.preferences.pauseWhenHidden;
    this.saved = existing?.state ?? {
      world: createWorld(config.seed),
      speed: 1,
      manuallyPaused: false,
    };
    this.persistedRevision = existing?.revision ?? 0;
    this.persistedEvents = this.saved.world.events;
    this.viewRevision = this.persistedRevision;
    this.saved = {
      ...this.saved,
      world: updateWorld(this.saved.world, (world) => {
        world.storyPolicy ??= defaultStoryPolicy();
        validateStoryPolicy(world.storyPolicy);
        migrateActors(world);
        world.minds ??= {};
        for (const entity of Object.values(world.entities))
          if (hasMemory(entity)) world.minds[entity.id] ??= mindFor(world, entity.id);
        migrateCognition(world);
        initializeActorTraits(world);
        world.socialPolicy = {
          conversationInactivitySeconds: config.conversationInactivitySeconds,
          notableThreshold: 8,
        };
        world.paused = true;
      }),
    };
    this.saved = updateMilestones(this.saved, this.saved.world.events);
    // Startup migrations may replace historical branches, so use the ordinary diff once.
    const startupHistory = this.saved.world;
    if (store.history) this.saved = { ...this.saved, world: retainHotEvents(startupHistory) };
    this.persistedRevision = await store.commit(
      this.persistedRevision,
      this.saved,
      undefined,
      undefined,
      { after: startupHistory },
    );
    freezeWorld(this.saved.world);
    this.persistedEvents = this.saved.world.events;
    this.worldEventsById = new Map(this.saved.world.events.map((event) => [event.id, event]));
    this.epoch =
      ((await store.getIntegration(`command-epoch:${this.world.id}`)) as CommandEpoch) ??
      this.epoch;
    await this.refreshCommandEpoch();
    this.viewRevision = this.persistedRevision;
    this.lastRoutinePersistAt = this.now();
    await store.recoverInterruptedWork();
  }

  get controlledEntityId(): string {
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
  // The current host has one local player. A future account adapter supplies this
  // principal; neither preferences nor action queries accept a client-selected actor.
  get profile(): PlayerProfile {
    return this.currentProfile;
  }
  async setPreferences(preferences: PlayerPreferencePatch): Promise<PlayerProfile> {
    return this.mutate(async () => {
      await this.ready;

      const profile = await this.store.setPreferences('local-player', preferences);
      this.currentProfile = profile;
      const pausePolicyChanged = this.pauseWhenHidden !== profile.preferences.pauseWhenHidden;
      this.pauseWhenHidden = profile.preferences.pauseWhenHidden;
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
    return this.saved.milestones ?? {};
  }
  get paused(): boolean {
    return this.saved.manuallyPaused || this.absent || this.storageError !== null;
  }
  private get absent(): boolean {
    // An open stream survives background heartbeat throttling. With the setting
    // off, this is connected background play, not offline catch-up after closing.
    return !this.present && (this.pauseWhenHidden || this.connections.size === 0);
  }
  async setConnection(connectionId: string, connected: boolean): Promise<void> {
    return this.mutate(async () => {
      await this.ready;

      if (connected) this.connections.add(connectionId);
      else this.connections.delete(connectionId);
      await this.reconcileDisconnectedConversation();
      if (this.world.paused !== this.paused) await this.syncPause();
    });
  }
  private async reconcileDisconnectedConversation(): Promise<void> {
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
    for (const [key, timestamp] of this.presence) if (timestamp < cutoff) this.presence.delete(key);
    return this.presence.size > 0;
  }
  get pauseReason(): 'manual' | 'away' | 'storage' | null {
    return this.storageError
      ? 'storage'
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
    const actorId = this.controlledEntityId;
    const relevant = (event: WorldEvent) =>
      event.audience.includes(actorId) &&
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
      if (count === undefined) this.transcriptEpoch++;
    }
  }
  /** Presentation changes need the same refresh signal as committed journal sources. */
  notifyHistory(): void {
    this.transcriptRevision++;
    this.notify();
  }
  notify(telemetry = true): void {
    if (telemetry) this.telemetryRevision++;
    this.viewRevision++;
    for (const listener of this.listeners) listener();
  }

  private async commit(
    saved: SavedWorld,
    invalidatedMemoryIds: Record<string, string[]> | undefined,
    eventMode: 'unchanged' | 'append' | 'diff',
    historyBefore?: WorldState,
    receipt?: GameplayReceipt,
  ): Promise<boolean> {
    if (this.storageError) return false;
    try {
      if (eventMode === 'unchanged' && saved.world.events !== this.saved.world.events)
        throw new Error(
          'A transition declared unchanged events but replaced the event collection.',
        );
      // Measure from durable state, including routine progress flushed by a control/editor save.
      const appendEventCount = appendedEventCount(this.persistedEvents, saved.world.events);
      const currentAppendCount = appendedEventCount(this.saved.world.events, saved.world.events);
      saved = updateMilestones(
        saved,
        currentAppendCount === undefined
          ? saved.world.events
          : currentAppendCount
            ? saved.world.events.slice(-currentAppendCount)
            : [],
      );
      const historyWorld = saved.world;
      if (this.store.history) saved = { ...saved, world: retainHotEvents(historyWorld) };
      this.persistedRevision = await timed('world.commit', () =>
        this.store.commit(this.persistedRevision, saved, invalidatedMemoryIds, appendEventCount, {
          before: historyBefore,
          after: historyWorld,
          receipt,
        }),
      );
      this.updateHistoryRevision(
        historyBefore?.events ?? this.persistedEvents,
        historyWorld.events,
        historyBefore ? undefined : appendEventCount,
      );
      if (
        this.saved.world.experience?.forgotten[this.controlledEntityId] !==
        saved.world.experience?.forgotten[this.controlledEntityId]
      ) {
        this.transcriptRevision++;
        this.transcriptEpoch++;
      }
      if (invalidatedMemoryIds?.[this.controlledEntityId]?.length) {
        this.transcriptRevision++;
        this.transcriptEpoch++;
      }
      freezeWorld(saved.world);
      this.saved = saved;
      if (currentAppendCount === undefined || saved.world.events !== historyWorld.events)
        this.worldEventsById = new Map(saved.world.events.map((event) => [event.id, event]));
      else
        for (const event of saved.world.events.slice(this.worldEventsById.size))
          this.worldEventsById.set(event.id, event);
      this.persistedEvents = saved.world.events;
      this.unpersisted = false;
      this.lastRoutinePersistAt = this.now();
      this.notify(false);
      return true;
    } catch {
      this.storageError =
        'The save could not be committed. Simulation is paused; restart after resolving storage access.';
      this.notify(false);
      return false;
    }
  }

  private acceptRoutine(saved: SavedWorld): void {
    const appended = appendedEventCount(this.saved.world.events, saved.world.events);
    if (appended === undefined)
      this.worldEventsById = new Map(saved.world.events.map((event) => [event.id, event]));
    else
      for (const event of saved.world.events.slice(this.worldEventsById.size))
        this.worldEventsById.set(event.id, event);
    this.saved = updateMilestones(
      saved,
      appended === undefined
        ? saved.world.events
        : appended
          ? saved.world.events.slice(-appended)
          : [],
    );
    freezeWorld(this.saved.world);
    this.unpersisted = true;
    this.notify(false);
  }

  async flush(): Promise<void> {
    await this.mutate(async () => {
      await this.ready;
      if (this.unpersisted && !(await this.commit(this.saved, undefined, 'append')))
        throw new Error(this.storageError ?? 'The pending world changes could not be saved.');
    });
  }

  async setPresence(clientId: string, visible: boolean, sequence?: number): Promise<void> {
    return this.mutate(async () => {
      await this.ready;

      if (sequence !== undefined) {
        const previous = this.presenceOrders.get(clientId);
        if (previous !== undefined && sequence <= previous) return;
        this.presenceOrders.set(clientId, sequence);
      }
      const wasPaused = this.paused;
      // Observe an expired heartbeat before renewing it. Otherwise a reconnect ahead
      // of the timer can hide the absence transition from pending inference.
      if (wasPaused && !this.world.paused) await this.syncPause();
      if (visible) this.presence.set(clientId, this.now());
      else this.presence.delete(clientId);
      if (this.paused !== wasPaused || this.world.paused !== this.paused) await this.syncPause();
    });
  }

  async control(input: {
    paused?: boolean;
    speed?: number;
    clientId?: string;
    presenceSequence?: number;
  }): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      if (input.speed !== undefined && ![0.5, 1, 3, 8].includes(input.speed))
        return { ok: false, code: 'speed', message: 'Choose 0.5×, 1×, 3× or 8×.' };
      if (input.paused === false) {
        // Clicking Resume is itself evidence that the player has returned. Do not
        // wait for the browser's next (possibly throttled) five-second heartbeat.
        if (input.clientId) await this.setPresence(input.clientId, true, input.presenceSequence);
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
        paused: next.manuallyPaused || this.absent || this.storageError !== null,
      };
      // Speed changes preserve already-admitted time; pausing/resuming starts a fresh clock.
      if (next.world.paused || this.world.paused) this.debtSeconds = 0;
      gaugeMetric('clock.pendingSimSeconds', this.debtSeconds);
      const ok = await this.commit(next, undefined, 'unchanged');
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

  private async syncPause(): Promise<void> {
    return this.mutate(async () => {
      await this.ready;

      this.debtSeconds = 0;
      gaugeMetric('clock.pendingSimSeconds', 0);
      if (this.world.paused !== this.paused)
        await this.commit(
          { ...this.saved, world: { ...this.world, paused: this.paused } },
          undefined,
          'unchanged',
        );
      else this.notify(false);
    });
  }

  /** Fixed simulation steps with routine durability coalesced to one real second. */
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
      await this.tickBatch(elapsedRealSeconds, suspendedRealSeconds);
      elapsedRealSeconds = 0;
      suspendedRealSeconds = 0;
      if (this.paused || this.debtSeconds < 1) return;
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
      if (
        Object.values(this.world.experience?.awareness ?? {}).some(
          (entries) => entries.length >= EXPERIENCE_LIMITS.backlog,
        ) ||
        Object.values(this.world.memories).some(
          (entries) => entries.length >= EXPERIENCE_LIMITS.backlog + 16,
        )
      ) {
        if (!this.memoryBacklog) {
          this.memoryBacklog =
            'Experience backlog is full; simulation is waiting for consolidation or operator resolution. No memories were discarded.';
          this.notify(false);
        }
        this.debtSeconds = 0;
        gaugeMetric('clock.pendingSimSeconds', 0);
        return;
      }
      if (this.memoryBacklog) {
        this.memoryBacklog = null;
        this.notify(false);
      }
      const requested = elapsedRealSeconds * this.config.baseRatio * this.speed;
      countMetric('clock.activeRealSeconds', elapsedRealSeconds);
      countMetric('clock.requestedSimSeconds', requested);
      gaugeMetric('clock.requestedSpeed', this.speed);
      this.debtSeconds += requested;
      gaugeMetric('clock.pendingSimSeconds', this.debtSeconds);
      const steps = Math.floor(this.debtSeconds);
      if (!steps) return;
      let world = this.world;
      const batchStarted = performance.now();
      let nativeMs = 0;
      let completedSteps = 0;
      gaugeMetric('tick.dueSteps', steps);
      // Publish a bounded prefix and release mutation ownership; retain the rest as debt.
      // A single transition remains atomic even if it exceeds this time budget.
      for (; completedSteps < steps; ) {
        const stepStarted = performance.now();
        world = freezeWorld(advanceWorld(world, 1).world);
        const stepMs = performance.now() - stepStarted;
        nativeMs += stepMs;
        recordDuration('native.step', stepMs);
        completedSteps++;
        if (performance.now() - batchStarted >= 8) break;
      }
      recordDuration('tick.nativeWork', nativeMs);
      const beforeSimTime = this.world.simTime;
      const saved = { ...this.saved, world };
      if (this.now() - this.lastRoutinePersistAt >= 1000) {
        if (await this.commit(saved, undefined, 'append')) this.debtSeconds -= completedSteps;
      } else {
        this.acceptRoutine(saved);
        this.debtSeconds -= completedSteps;
      }
      countMetric('clock.advancedSimSeconds', this.world.simTime - beforeSimTime);
      gaugeMetric('clock.pendingSimSeconds', this.debtSeconds);
    });
  }

  async conversation(
    requestId: string,
    operation: 'join' | 'leave',
    conversationId: string,
    generation: number,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;
      if (operation === 'join' && this.paused)
        return { ok: false, code: 'paused', message: 'Resume before joining.' };
      const result = changeConversation(
        this.world,
        requestId,
        this.controlledEntityId,
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
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      if (this.paused)
        return { ok: false, code: 'paused', message: 'Resume the world before acting.' };
      const result = operation(this.world);
      const receipt = gameplay ? { ...gameplay, result: result.outcome } : undefined;
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
      return { ok: result.outcome.ok, code: result.outcome.code, message: result.outcome.message };
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

  async godKinship(fact: Kinship): Promise<ApiResult> {
    return this.godTransition((world) => establishKinship(world, fact));
  }

  async godEffects(
    id: string,
    effects: BodyEffect[],
    expected: Record<string, number>,
  ): Promise<ApiResult> {
    return this.godTransition((world) => applyBodyEffects(world, id, effects, expected));
  }

  async spawn(draft: GodSpawnDraft): Promise<ApiResult> {
    return await this.godTransition((world) => spawnWorldEntity(world, draft));
  }

  async personEditor(actorId: string, before?: string): Promise<GodPersonEditorView | ApiResult> {
    await this.ready;
    const entity = this.world.entities[actorId];
    if (!entity?.actor || !hasMemory(entity))
      return { ok: false, code: 'actor', message: 'Choose a person.' };
    const page = this.personMemoryPage(this.world, actorId, before);
    if (!page)
      return { ok: false, code: 'stale', message: 'History changed; refresh before paging.' };
    return {
      ...page,
      ok: true,
      revision: this.viewRevision,
      actorId,
      person: {
        name: entity.name,
        description:
          entity.actor.description?.trim() || `${entity.name} is a person in the clearing.`,
        personality: entity.actor.personality ?? '',
        backstory: entity.actor.backstory ?? '',
        traitIds: entity.actor.traits?.map((trait) => trait.id) ?? [],
        goals: [...(entity.actor.goals?.length ? entity.actor.goals : [entity.actor.goal])].filter(
          Boolean,
        ),
        stats: {
          health: entity.actor.health,
          fullness: entity.actor.fullness,
          energy: entity.actor.energy,
        },
      },
    };
  }

  async personMemoryJson(actorId: string, entryId: string) {
    await this.ready;
    const entry = experienceEntry(this.world, actorId, entryId);
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
  ): Promise<ApiResult & { revision?: number }> {
    return this.mutate(async () => {
      await this.ready;
      const entity = this.world.entities[actorId];
      if (!entity?.actor || entity.kind !== 'npc')
        return { ok: false, code: 'actor', message: 'Choose a person.' };
      const currentPerson: GodPersonEditorDraft = {
        name: entity.name,
        description:
          entity.actor.description?.trim() || `${entity.name} is a person in the clearing.`,
        personality: entity.actor.personality ?? '',
        backstory: entity.actor.backstory ?? '',
        traitIds: entity.actor.traits?.map((trait) => trait.id) ?? [],
        goals: [...(entity.actor.goals?.length ? entity.actor.goals : [entity.actor.goal])].filter(
          Boolean,
        ),
        stats: {
          health: entity.actor.health,
          fullness: entity.actor.fullness,
          energy: entity.actor.energy,
        },
      };
      const changedFields = (Object.keys(person) as Array<keyof GodPersonEditorDraft>).filter(
        (key) => JSON.stringify(person[key]) !== JSON.stringify(basePerson[key]),
      );
      for (const key of changedFields) {
        // Simulation-owned stats may drift after opening; an explicit god edit overrides
        // that snapshot. Other fields retain field-level optimistic concurrency.
        if (
          key !== 'stats' &&
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
          'unchanged',
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      return { ...result.outcome, revision: this.viewRevision };
    });
  }

  async worldEventsEditor(before?: number): Promise<GodWorldEventsEditorView> {
    await this.ready;
    const page = await this.store.history?.eventPage(this.world.id, before);
    return {
      before: page?.before,
      ok: true,
      revision: this.viewRevision,
      events: (page?.events ?? this.world.events.slice(-100)).map((event) => ({
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

  async worldEventJson(id: string) {
    await this.ready;
    const event = this.worldEvent(id) ?? (await this.store.history?.event(this.world.id, id));
    return event
      ? { ok: true as const, hash: digest(event), json: JSON.stringify(event, null, 2) }
      : { ok: false as const, code: 'event', message: 'That world event no longer exists.' };
  }

  async saveWorldEventsEditor(
    changes: Array<{ id: string; expectedHash: string; replacement: WorldEvent | null }>,
  ): Promise<ApiResult & { revision?: number }> {
    return this.mutate(async () => {
      await this.ready;
      // Load cold dependencies only for an explicit owner edit, under mutation ownership.
      const original =
        this.world.archivedEventCount && this.store.history
          ? {
              ...this.world,
              events: [
                ...(await this.store.history.allEvents(this.world.id)).filter(
                  (event) => !this.worldEventsById.has(event.id),
                ),
                ...this.world.events,
              ].sort((a, b) => (a.order ?? a.sequence) - (b.order ?? b.sequence)),
              archivedEventCount: 0,
            }
          : this.world;
      const eventsById = new Map(original.events.map((event) => [event.id, event]));
      for (const change of changes) {
        const event = eventsById.get(change.id);
        if (!event || digest(event) !== change.expectedHash)
          return {
            ok: false,
            code: 'stale',
            message: 'A world event you changed was updated elsewhere. Refresh and review it.',
            revision: this.viewRevision,
          };
      }
      const result = editWorldEventsState(original, changes);
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
    });
  }

  async command(
    commandId: string,
    input: CommandInput,
    actorId?: string,
    epoch?: string,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;
      const actor = actorId ?? this.controlledEntityId;
      if (commandId.startsWith('gameplay:'))
        return {
          ok: false,
          code: 'invalid-command',
          message: 'Command IDs cannot use the reserved gameplay namespace.',
        };
      // Legacy callers retain their old identity rules; new clients bind retries to their issued epoch.
      if (epoch === undefined || !this.store.commands)
        return await this.evaluateCommand(commandId, input, actor, false);
      await this.refreshCommandEpoch();
      const id = `gameplay:${epoch}:${digest(commandId)}`;
      const fingerprint = digest({ actor, input });
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
      return await this.evaluateCommand(id, input, actor, false, {
        id,
        epoch: this.epoch.generation,
        fingerprint,
        expiresAt: this.now() + COMMAND_RETRY_MS,
      });
    });
  }

  /** Run the actual admission rules on a disposable transition; never commit preview effects. */
  previewCommand(input: CommandInput): ApiResult {
    return this.evaluateCommand(randomUUID(), input, this.controlledEntityId, true) as ApiResult;
  }

  private evaluateCommand(
    commandId: string,
    input: CommandInput,
    actorId: string,
    preview: boolean,
    gameplay?: Omit<GameplayReceipt, 'result'>,
  ): ApiResult | Promise<ApiResult> {
    const envelope = { id: commandId, actorId };
    let command: Command;
    switch (input.type) {
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
      case 'gather':
      case 'harvest':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose a target.' };
        command = { ...envelope, type: input.type, targetId: input.targetId };
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
      case 'hunt':
        if (!input.targetId) return { ok: false, code: 'target', message: 'Choose an animal.' };
        command = {
          ...envelope,
          type: 'hunt',
          targetId: input.targetId,
          ...(input.itemId ? { weaponItemId: input.itemId } : {}),
          ...(input.ammunitionId ? { ammoItemId: input.ammunitionId } : {}),
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
    if (preview) {
      if (this.paused) return { ok: false, code: 'paused', message: 'Resume the world to act.' };
      const { outcome } = executeCommand(this.world, command);
      return { ok: outcome.ok, code: outcome.code, message: outcome.message };
    }
    return this.transition((world) => executeCommand(world, command), gameplay);
  }

  async say(
    requestId: string,
    actorId: string,
    text: string,
    targetId?: string,
  ): Promise<ApiResult> {
    return await this.transition((world) =>
      executeCommand(world, {
        id: requestId,
        actorId,
        type: 'say',
        text,
        ...(targetId ? { targetId } : {}),
      }),
    );
  }

  async correctMemory(
    actorId: string,
    sourceId: string,
    correctionEventId: string,
  ): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      const invalidated = [
        sourceId,
        ...(this.world.memories[actorId] ?? [])
          .filter((memory) => memory.id === sourceId || memory.eventId === sourceId)
          .map((memory) => memory.id),
        ...(this.world.experience?.summaries[actorId] ?? [])
          .filter((summary) => summary.id === sourceId || summary.sourceIds.includes(sourceId))
          .map((summary) => summary.id),
      ];
      const corrected = correctExperience(this.world, actorId, sourceId, correctionEventId);
      if (!corrected.outcome.ok) return corrected.outcome;
      const ok = await this.commit(
        { ...this.saved, world: corrected.world },
        { [actorId]: invalidated },
        'unchanged',
      );
      return {
        ok,
        code: ok ? 'corrected' : 'storage',
        message: ok ? corrected.outcome.message : this.storageError!,
      };
    });
  }

  async forgetMemory(actorId: string, sourceId: string): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      if (!this.world.entities[actorId]?.actor)
        return { ok: false, code: 'actor', message: 'Unknown actor.' };
      if (
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

  async admit(draft: DeclarationDraft, provenance: DeclarationProvenance): Promise<ApiResult> {
    return await this.transition((world) => admitDeclaration(world, draft, provenance));
  }

  observe(actorId: string) {
    return observeActor(this.world, actorId);
  }
}
