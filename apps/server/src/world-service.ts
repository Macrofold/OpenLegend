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
  initializeActorTraits,
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
        event.type === 'speech' && event.actorId === 'ada' && event.audience.includes('player'),
    )
  )
    flags['talk'] = true;
  if (
    !flags['hunt'] &&
    events.some((event) => event.type === 'harvested' && event.actorId === 'player')
  )
    flags['hunt'] = true;
  if (
    !flags['eat'] &&
    events.some(
      (event) => event.type === 'ate' && event.actorId === 'player' && /meat/i.test(event.text),
    )
  )
    flags['eat'] = true;
  if (!flags['invent'] || !flags['bow']) {
    const known = (saved.world.knowledge['player'] ?? []).map(
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
  if (!flags['craft'] && saved.world.entities['player']?.actor?.equippedItemId)
    flags['craft'] = true;
  return { ...saved, milestones: flags };
}

/** Application coordination only: pure rules live in domain; all I/O is through a store. */
export class WorldService {
  private saved!: SavedWorld;
  private worldEventsById = new Map<string, WorldEvent>();
  private persistedRevision = 0;
  private persistedEventCount = 0;
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
    const next = this.mutationTail.then(() => this.mutationContext.run(true, operation));
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
    this.persistedEventCount = this.saved.world.events.length;
    this.viewRevision = this.persistedRevision;
    this.saved = {
      ...this.saved,
      world: updateWorld(this.saved.world, (world) => {
        migrateActors(world);
        world.minds ??= {};
        for (const entity of Object.values(world.entities))
          if (hasMemory(entity)) world.minds[entity.id] ??= mindFor(world, entity.id);
        migrateCognition(world);
        initializeActorTraits(world);
        world.paused = true;
      }),
    };
    this.saved = updateMilestones(this.saved, this.saved.world.events);
    // Startup migrations may replace historical branches, so use the ordinary diff once.
    this.persistedRevision = await store.commit(this.persistedRevision, this.saved);
    this.persistedEventCount = this.saved.world.events.length;
    this.worldEventsById = new Map(this.saved.world.events.map((event) => [event.id, event]));
    this.viewRevision = this.persistedRevision;
    this.lastRoutinePersistAt = this.now();
    await store.recoverInterruptedWork();
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
      this.world.conversations?.active['player']
    ) {
      const world = updateWorld(this.world, (draft) =>
        leaveConversation(draft, 'player', 'disconnect'),
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
  notify(telemetry = true): void {
    if (telemetry) this.telemetryRevision++;
    this.viewRevision++;
    for (const listener of this.listeners) listener();
  }

  private async commit(
    saved: SavedWorld,
    invalidatedMemoryIds: Record<string, string[]> | undefined,
    eventMode: 'unchanged' | 'append' | 'diff',
  ): Promise<boolean> {
    if (this.storageError) return false;
    try {
      // A newly admitted actor receives its seed mind in the same saved transition.
      // Later context construction must never redefine identity from a changed goal.
      saved = {
        ...saved,
        world: updateWorld(saved.world, (world) => {
          for (const entity of Object.values(world.entities))
            if (hasMemory(entity) && !world.minds?.[entity.id])
              (world.minds ??= {})[entity.id] = mindFor(world, entity.id);
          world.socialPolicy = {
            conversationInactivitySeconds: this.config.conversationInactivitySeconds,
            notableThreshold: 8,
          };
          migrateCognition(world);
          initializeActorTraits(world);
        }),
      };
      if (eventMode === 'unchanged' && saved.world.events !== this.saved.world.events)
        throw new Error(
          'A transition declared unchanged events but replaced the event collection.',
        );
      if (
        eventMode === 'append' &&
        (saved.world.events.length < this.saved.world.events.length ||
          (this.saved.world.events.length > 0 &&
            saved.world.events[this.saved.world.events.length - 1] !==
              this.saved.world.events[this.saved.world.events.length - 1]))
      )
        throw new Error('A transition declared append-only events but changed retained history.');
      const appendEventCount =
        eventMode === 'append' && saved.world.events.length >= this.persistedEventCount
          ? saved.world.events.length - this.persistedEventCount
          : undefined;
      saved = updateMilestones(
        saved,
        appendEventCount ? saved.world.events.slice(-appendEventCount) : [],
      );
      this.persistedRevision = await this.store.commit(
        this.persistedRevision,
        saved,
        invalidatedMemoryIds,
        appendEventCount,
      );
      this.saved = saved;
      if (eventMode === 'diff')
        this.worldEventsById = new Map(saved.world.events.map((event) => [event.id, event]));
      else
        for (const event of saved.world.events.slice(this.worldEventsById.size))
          this.worldEventsById.set(event.id, event);
      this.persistedEventCount = saved.world.events.length;
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
    for (const event of saved.world.events.slice(this.worldEventsById.size))
      this.worldEventsById.set(event.id, event);
    this.saved = saved;
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
      this.debtSeconds = 0;
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
  async tick(elapsedRealSeconds: number): Promise<void> {
    return this.mutate(async () => {
      await this.ready;

      await this.reconcileDisconnectedConversation();
      if (this.world.paused !== this.paused) await this.syncPause();
      if (this.paused || elapsedRealSeconds <= 0) return;
      // A long event-loop suspension is absence, not permission to catch up offline time.
      if (elapsedRealSeconds > 2) {
        this.debtSeconds = 0;
        return;
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
        return;
      }
      if (this.memoryBacklog) {
        this.memoryBacklog = null;
        this.notify(false);
      }
      this.debtSeconds += elapsedRealSeconds * this.config.baseRatio * this.speed;
      // Supported timer gaps are at most two seconds. Even at 8×, at most 960 cheap
      // fixed steps are due; process that bounded batch without silently losing time.
      const steps = Math.floor(this.debtSeconds);
      if (!steps) return;
      let world = this.world;
      for (let step = 0; step < steps; step++) world = advanceWorld(world, 1).world;
      const saved = { ...this.saved, world };
      if (this.now() - this.lastRoutinePersistAt >= 1000) {
        if (await this.commit(saved, undefined, 'append')) this.debtSeconds -= steps;
      } else {
        this.acceptRoutine(saved);
        this.debtSeconds -= steps;
      }
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
        'player',
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
  async transition(operation: (world: WorldState) => Transition): Promise<ApiResult> {
    return this.mutate(async () => {
      await this.ready;

      if (this.paused)
        return { ok: false, code: 'paused', message: 'Resume the world before acting.' };
      const result = operation(this.world);
      if (
        !(await this.commit(
          { ...this.saved, world: result.world },
          result.invalidatedMemoryIds,
          'append',
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
    const byId = new Map(this.world.events.map((event) => [event.id, event]));
    const awareness = (this.world.experience?.awareness[actorId] ?? []).map((value) => ({
      id: `awareness:${value.eventId}`,
      source: 'awareness' as const,
      label: 'Raw' as const,
      text: value.text,
      time: value.at,
      tags: [value.modality, ...(value.recognized ? ['recognized'] : []), ...value.entityIds],
      hash: digest(value),
      eventType: byId.get(value.eventId)?.type ?? value.modality,
    }));
    const memories = (this.world.memories[actorId] ?? []).map((value) => ({
      id: `memory:${value.id}`,
      source: 'memory' as const,
      label: 'Raw' as const,
      text: value.summary,
      time: value.at,
      tags: [value.kind, value.source, ...value.entityIds],
      hash: digest(value),
    }));
    const summaries = (this.world.experience?.summaries[actorId] ?? []).map((value) => ({
      id: `summary:${value.id}`,
      source: 'summary' as const,
      label: 'Consolidated' as const,
      text: value.text,
      time: value.to,
      tags: ['reflection', ...value.entityIds],
      hash: digest(value),
    }));
    const all = [...awareness, ...memories, ...summaries].sort(
      (a, b) => b.time - a.time || a.id.localeCompare(b.id),
    );
    const index = before ? all.findIndex((entry) => entry.id === before) : -1;
    if (before && index < 0)
      return { ok: false, code: 'stale', message: 'History changed; refresh before paging.' };
    const page = all.slice(index + 1, index + 101);
    return {
      before: index + 101 < all.length ? page.at(-1)?.id : undefined,
      ok: true,
      revision: this.viewRevision,
      actorId,
      person: {
        name: entity.name,
        personality: entity.actor.personality ?? '',
        backstory: entity.actor.backstory ?? '',
        traitIds: entity.actor.traits?.map((trait) => trait.id) ?? [],
        initialGoals: [...(entity.actor.initialGoals ?? [])],
      },
      memories: page,
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
    basePerson: GodPersonDraft,
    person: GodPersonDraft,
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
      const currentPerson: GodPersonDraft = {
        name: entity.name,
        personality: entity.actor.personality ?? '',
        backstory: entity.actor.backstory ?? '',
        traitIds: entity.actor.traits?.map((trait) => trait.id) ?? [],
        initialGoals: [...(entity.actor.initialGoals ?? [])],
      };
      const personChanged = JSON.stringify(person) !== JSON.stringify(basePerson);
      if (personChanged && JSON.stringify(currentPerson) !== JSON.stringify(basePerson))
        return {
          ok: false,
          code: 'stale',
          message: 'This person was edited elsewhere. Refresh before saving these fields.',
          revision: this.viewRevision,
        };
      const memoryHashes = new Map(
        [...experienceEntries(this.world, actorId)].map(([key, entry]) => [
          key,
          digest(entry.value),
        ]),
      );
      for (const change of memoryChanges) {
        if (memoryHashes.get(change.entryId) !== change.expectedHash)
          return {
            ok: false,
            code: 'stale',
            message: 'A memory you changed was updated elsewhere. Refresh and review it.',
            revision: this.viewRevision,
          };
      }
      const result = editPersonState(this.world, {
        actorId,
        person: personChanged ? person : currentPerson,
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

  async worldEventJson(id: string) {
    await this.ready;
    const event = this.worldEvent(id);
    return event
      ? { ok: true as const, hash: digest(event), json: JSON.stringify(event, null, 2) }
      : { ok: false as const, code: 'event', message: 'That world event no longer exists.' };
  }

  async saveWorldEventsEditor(
    changes: Array<{ id: string; expectedHash: string; replacement: WorldEvent | null }>,
  ): Promise<ApiResult & { revision?: number }> {
    return this.mutate(async () => {
      await this.ready;
      for (const change of changes) {
        const event = this.worldEvent(change.id);
        if (!event || digest(event) !== change.expectedHash)
          return {
            ok: false,
            code: 'stale',
            message: 'A world event you changed was updated elsewhere. Refresh and review it.',
            revision: this.viewRevision,
          };
      }
      const result = editWorldEventsState(this.world, changes);
      if (!result.outcome.ok) return result.outcome;
      if (
        !(await this.commit(
          { ...this.saved, world: result.world },
          result.invalidatedMemoryIds,
          'diff',
        ))
      )
        return { ok: false, code: 'storage', message: this.storageError! };
      return { ...result.outcome, revision: this.viewRevision };
    });
  }

  async command(commandId: string, input: CommandInput, actorId = 'player'): Promise<ApiResult> {
    return await this.evaluateCommand(commandId, input, actorId, false);
  }

  /** Run the actual admission rules on a disposable transition; never commit preview effects. */
  previewCommand(input: CommandInput): ApiResult {
    return this.evaluateCommand(randomUUID(), input, 'player', true) as ApiResult;
  }

  private evaluateCommand(
    commandId: string,
    input: CommandInput,
    actorId: string,
    preview: boolean,
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
    return this.transition((world) => executeCommand(world, command));
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
      executeCommand(world, { id: requestId, actorId: 'ada', type: 'goal', text }),
    );
  }

  async admit(draft: DeclarationDraft, provenance: DeclarationProvenance): Promise<ApiResult> {
    return await this.transition((world) => admitDeclaration(world, draft, provenance));
  }

  observe(actorId: string) {
    return observeActor(this.world, actorId);
  }
}
