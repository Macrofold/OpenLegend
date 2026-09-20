import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  createWorld,
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
  observeActor,
  type Command,
  type DeclarationDraft,
  type DeclarationProvenance,
  type Transition,
  type WorldState,
} from '@open-legend/domain';
import type {
  ApiResult,
  CommandInput,
  PlayerProfile,
  PlayerPreferencePatch,
} from '@open-legend/protocol';
import type { AppConfig } from './config.js';
import type { SavedWorld, GameRepository } from './store.js';

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
export const commandInputSchema = z
  .object({
    type: z.enum([
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

/** Application coordination only: pure rules live in domain; all I/O is through a store. */
export class WorldService {
  private saved: SavedWorld;
  private revision: number;
  private readonly listeners = new Set<() => void>();
  private readonly presence = new Map<string, number>();
  private readonly presenceOrders = new Map<string, number>();
  private readonly connections = new Set<string>();
  private pauseWhenHidden: boolean;
  private debtSeconds = 0;
  storageError: string | null = null;
  memoryBacklog: string | null = null;
  readonly generation = randomUUID();

  constructor(
    readonly store: GameRepository,
    readonly config: AppConfig,
    private readonly now = Date.now,
  ) {
    const existing = store.load();
    if (
      existing?.state.world.schemaVersion === 1 &&
      !store.getIntegration(`legacy-backup:${existing.state.world.id}`)
    )
      store.putIntegration(`legacy-backup:${existing.state.world.id}`, structuredClone(existing));
    this.pauseWhenHidden = this.profile.preferences.pauseWhenHidden;
    this.saved = existing?.state ?? {
      world: createWorld(config.seed),
      speed: 1,
      manuallyPaused: false,
    };
    this.revision = existing?.revision ?? 0;
    this.saved.world.minds ??= {};
    for (const entity of Object.values(this.saved.world.entities))
      if (entity.actor) this.saved.world.minds[entity.id] ??= mindFor(this.saved.world, entity.id);
    migrateCognition(this.saved.world);
    initializeActorTraits(this.saved.world);
    // No persisted wall-clock delta is replayed. Presence is deliberately process-local.
    this.saved = { ...this.saved, world: { ...this.saved.world, paused: true } };
    this.revision = store.commit(this.revision, this.saved);
    store.recoverInterruptedWork();
  }

  get world(): WorldState {
    return this.saved.world;
  }
  // The current host has one local player. A future account adapter supplies this
  // principal; neither preferences nor action queries accept a client-selected actor.
  get profile(): PlayerProfile {
    return this.store.getProfile('local-player');
  }
  setPreferences(preferences: PlayerPreferencePatch): PlayerProfile {
    const profile = this.store.setPreferences('local-player', preferences);
    const pausePolicyChanged = this.pauseWhenHidden !== profile.preferences.pauseWhenHidden;
    this.pauseWhenHidden = profile.preferences.pauseWhenHidden;
    if (pausePolicyChanged) this.syncPause();
    else this.notify();
    return profile;
  }
  get version(): number {
    return this.revision;
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
  setConnection(connectionId: string, connected: boolean): void {
    if (connected) this.connections.add(connectionId);
    else this.connections.delete(connectionId);
    if (this.world.paused !== this.paused) this.syncPause();
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
  notify(): void {
    for (const listener of this.listeners) listener();
  }

  private commit(saved: SavedWorld): boolean {
    if (this.storageError) return false;
    try {
      // A newly admitted actor receives its seed mind in the same saved transition.
      // Later context construction must never redefine identity from a changed goal.
      const newcomers = Object.values(saved.world.entities).filter(
        (entity) => entity.actor && !saved.world.minds?.[entity.id],
      );
      if (newcomers.length) {
        const world = { ...saved.world, minds: { ...saved.world.minds } };
        for (const entity of newcomers) world.minds[entity.id] = mindFor(world, entity.id);
        saved = { ...saved, world };
      }
      migrateCognition(saved.world);
      initializeActorTraits(saved.world);
      // Completed onboarding milestones outlive the bounded recent-event feed.
      const flags = { ...saved.milestones };
      const events = saved.world.events.filter((event) => event.audience.includes('player'));
      if (events.some((event) => event.type === 'speech' && event.actorId === 'ada'))
        flags['talk'] = true;
      if (events.some((event) => event.type === 'harvested' && event.actorId === 'player'))
        flags['hunt'] = true;
      if (
        events.some(
          (event) => event.type === 'ate' && event.actorId === 'player' && /meat/i.test(event.text),
        )
      )
        flags['eat'] = true;
      const known = (saved.world.knowledge['player'] ?? []).map(
        (record) => saved.world.recipes[record.recipeId],
      );
      if (known.some((recipe) => recipe?.output.launcher?.mechanism === 'swing'))
        flags['invent'] = true;
      if (
        known.some((recipe) => recipe?.output.launcher?.mechanism === 'flex') &&
        known.some((recipe) => recipe?.output.ammunition?.kind === 'arrow')
      )
        flags['bow'] = true;
      if (saved.world.entities['player']?.actor?.equippedItemId) flags['craft'] = true;
      saved = { ...saved, milestones: flags };
      this.revision = this.store.commit(this.revision, saved);
      this.saved = saved;
      this.notify();
      return true;
    } catch {
      this.storageError =
        'The save could not be committed. Simulation is paused; restart after resolving storage access.';
      this.notify();
      return false;
    }
  }

  setPresence(clientId: string, visible: boolean, sequence?: number): void {
    if (sequence !== undefined) {
      const previous = this.presenceOrders.get(clientId);
      if (previous !== undefined && sequence <= previous) return;
      this.presenceOrders.set(clientId, sequence);
    }
    const wasPaused = this.paused;
    // Observe an expired heartbeat before renewing it. Otherwise a reconnect ahead
    // of the timer can hide the absence transition from pending inference.
    if (wasPaused && !this.world.paused) this.syncPause();
    if (visible) this.presence.set(clientId, this.now());
    else this.presence.delete(clientId);
    if (this.paused !== wasPaused || this.world.paused !== this.paused) this.syncPause();
  }

  control(input: {
    paused?: boolean;
    speed?: number;
    clientId?: string;
    presenceSequence?: number;
  }): ApiResult {
    if (input.speed !== undefined && ![0.5, 1, 3, 8].includes(input.speed))
      return { ok: false, code: 'speed', message: 'Choose 0.5×, 1×, 3× or 8×.' };
    if (input.paused === false) {
      // Clicking Resume is itself evidence that the player has returned. Do not
      // wait for the browser's next (possibly throttled) five-second heartbeat.
      if (input.clientId) this.setPresence(input.clientId, true, input.presenceSequence);
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
    const ok = this.commit(next);
    return {
      ok,
      code: ok ? 'control' : 'storage',
      message: ok
        ? next.world.paused
          ? 'World paused.'
          : `World running at ${next.speed}×.`
        : this.storageError!,
    };
  }

  private syncPause(): void {
    this.debtSeconds = 0;
    if (this.world.paused !== this.paused)
      this.commit({ ...this.saved, world: { ...this.world, paused: this.paused } });
    else this.notify();
  }

  /** Fixed simulation steps, one durable batch per timer turn. No model work enters this path. */
  tick(elapsedRealSeconds: number): void {
    if (this.world.paused !== this.paused) this.syncPause();
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
        this.notify();
      }
      this.debtSeconds = 0;
      return;
    }
    if (this.memoryBacklog) {
      this.memoryBacklog = null;
      this.notify();
    }
    this.debtSeconds += elapsedRealSeconds * this.config.baseRatio * this.speed;
    // Supported timer gaps are at most two seconds. Even at 8×, at most 960 cheap
    // fixed steps are due; process that bounded batch without silently losing time.
    const steps = Math.floor(this.debtSeconds);
    if (!steps) return;
    let world = this.world;
    for (let step = 0; step < steps; step++) world = advanceWorld(world, 1).world;
    if (this.commit({ ...this.saved, world })) this.debtSeconds -= steps;
  }

  transition(operation: (world: WorldState) => Transition): ApiResult {
    if (this.paused)
      return { ok: false, code: 'paused', message: 'Resume the world before acting.' };
    const result = operation(this.world);
    if (!this.commit({ ...this.saved, world: result.world }))
      return { ok: false, code: 'storage', message: this.storageError! };
    return { ok: result.outcome.ok, code: result.outcome.code, message: result.outcome.message };
  }

  command(commandId: string, input: CommandInput, actorId = 'player'): ApiResult {
    return this.evaluateCommand(commandId, input, actorId, false);
  }

  /** Run the actual admission rules on a disposable transition; never commit preview effects. */
  previewCommand(input: CommandInput): ApiResult {
    return this.evaluateCommand(randomUUID(), input, 'player', true);
  }

  private evaluateCommand(
    commandId: string,
    input: CommandInput,
    actorId: string,
    preview: boolean,
  ): ApiResult {
    const envelope = { id: commandId, actorId };
    let command: Command;
    switch (input.type) {
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

  say(requestId: string, actorId: string, text: string, targetId?: string): ApiResult {
    return this.transition((world) =>
      executeCommand(world, {
        id: requestId,
        actorId,
        type: 'say',
        text,
        ...(targetId ? { targetId } : {}),
      }),
    );
  }

  correctMemory(actorId: string, sourceId: string, correctionEventId: string): ApiResult {
    const corrected = correctExperience(this.world, actorId, sourceId, correctionEventId);
    if (!corrected.outcome.ok) return corrected.outcome;
    const ok = this.commit({ ...this.saved, world: corrected.world });
    if (ok) this.store.putIntegration(`vectors:${this.world.id}:${actorId}`, null);
    return {
      ok,
      code: ok ? 'corrected' : 'storage',
      message: ok ? corrected.outcome.message : this.storageError!,
    };
  }

  forgetMemory(actorId: string, sourceId: string): ApiResult {
    if (!this.world.entities[actorId]?.actor)
      return { ok: false, code: 'actor', message: 'Unknown actor.' };
    if (
      !experiences(this.world, actorId, true).some(
        (m) => m.id === sourceId || m.eventId === sourceId,
      )
    )
      return { ok: false, code: 'source', message: 'That source is not retained for this actor.' };
    const forgotten = forgetExperience(this.world, actorId, sourceId);
    const ok = this.commit({ ...this.saved, world: forgotten.world });
    if (ok) {
      this.store.putIntegration(`vectors:${this.world.id}:${actorId}`, null);
      this.store.putIntegration(`interests:${this.world.id}:${actorId}`, null);
    }
    return {
      ok,
      code: ok ? 'forgotten' : 'storage',
      message: ok
        ? 'Recall and derived text invalidated; workspace resets before its next fresh job.'
        : this.storageError!,
    };
  }

  setGoal(requestId: string, text: string): ApiResult {
    return this.transition((world) =>
      executeCommand(world, { id: requestId, actorId: 'ada', type: 'goal', text }),
    );
  }

  admit(draft: DeclarationDraft, provenance: DeclarationProvenance): ApiResult {
    return this.transition((world) => admitDeclaration(world, draft, provenance));
  }

  observe(actorId: string) {
    return observeActor(this.world, actorId);
  }
}
