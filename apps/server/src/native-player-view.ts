import { isConversationEvent } from '@open-legend/domain';
import type { GameView } from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import { retainNativeSources } from './native-consumer.js';
import type { GameRepository } from './store.js';
import type { PlayerPracticeLoader } from './player-self-view.js';
import { playerHasWork } from './player-self-view.js';
import {
  nativePlayerCommunicationReferences,
  nativePlayerControls,
  nativePlayerEntities,
  nativePlayerEvents,
  nativePlayerEventViews,
  nativePlayerOwnedView,
  nativePlayerWorldView,
  type NativePlayerActorSelf,
  type NativePlayerActorPerception,
  type NativePlayerControlFacts,
  type NativePlayerEventRead,
  type NativePlayerViewDefinitions,
} from './native-view.js';
import {
  memoizer,
  optional,
  permittedPlayerJobs,
  playerSpeechJobIds,
  playerUsageFallback,
  projectPlayerAi,
  projectPlayerJobs,
  type PlayerAsyncCache,
  type PlayerAsyncOwner,
  ViewChangedError,
} from './player-view-async.js';

type HostFields = Pick<
  GameView,
  | 'revision'
  | 'checkpoint'
  | 'access'
  | 'maintenance'
  | 'worldEventsRevision'
  | 'historyRevision'
  | 'historyEpoch'
  | 'saveTimeline'
  | 'commandEpoch'
  | 'milestones'
  | 'persistence'
> & {
  access: NonNullable<GameView['access']>;
  saveTimeline: string;
  historyEpoch: string;
};
type Lifecycle = {
  generation: string;
  historyEpoch: string;
  assetAuthorityGeneration: number;
  at: number;
};
/** The host retains the actual native actor/event tokens until release. These
 * methods call the native scoped fences, never compare an entire accepted cut. */
export interface NativePlayerRead {
  readonly self: NativePlayerActorSelf;
  readonly perception: NativePlayerActorPerception;
  readonly events: NativePlayerEventRead;
  readonly controls: NativePlayerControlFacts;
  readonly lifecycle: Lifecycle;
  readonly host: HostFields;
  readonly clock: Pick<GameView['clock'], 'speed' | 'baseRatio' | 'paused' | 'pauseReason'>;
  readonly player: Pick<
    GameView['player'],
    'memoryRevision' | 'inventoryReadRevision' | 'constructionRevision' | 'inputScope'
  >;
  readonly placesRevision: NonNullable<GameView['cartography']>['placesRevision'];
  readonly telemetryRevision: number;
  readonly controlling: boolean;
  readonly freshWorldReview: boolean;
  /** Actual construction-permission options, already previewed by their owner. */
  readonly withdrawals: Parameters<typeof nativePlayerControls>[3]['withdrawals'];
  /** The host checks actor, event and operational fences together in its
   * serialized publication lane. Its real current availability read supplies
   * canUseInventory; captured own fields cannot supply that post-await check. */
  publishIfPermitted(
    ids: readonly string[],
    complete: (canUseInventory: boolean, encode: (value: object) => Buffer) => Buffer,
    operationalStillCurrent: () => boolean,
  ): Promise<Buffer>;
  release(): void;
}
export interface NativePlayerRequestOwner extends PlayerAsyncOwner {
  readonly connectionLimit: number;
  assertScope(scope: RequestScope): void;
  profileFor(scope: RequestScope): Promise<GameView['profile']>;
  capture(scope: RequestScope): Promise<NativePlayerRead>;
  lifecycle(): Lifecycle;
  presentationReleaseFor(scope: RequestScope): Promise<GameView['presentationRelease']>;
  presentationReleaseRevision(): number;
  /** Preview executes the real Cancel prefix and rolls it back; it is evaluated
   * after practice awaits, at then-current state, just like the Source request. */
  previewPausedStop(scope: RequestScope): Promise<{ ok: boolean; message: string }>;
  speechEventActor(id: string): string | undefined;
}
export interface NativePlayerViewRequest {
  readonly owner: NativePlayerRequestOwner;
  readonly scope: RequestScope;
  readonly definitions: NativePlayerViewDefinitions;
  readonly map: Parameters<typeof nativePlayerWorldView>[4]['map'];
  readonly store: Pick<GameRepository, 'usage' | 'recentJobs' | 'getSpeechJobs' | 'history'>;
  readonly practiceLoader: PlayerPracticeLoader;
  readonly executionSource: 'live-model' | 'test-fixture';
  readonly budgetUsd: number;
  readonly jevConfigured: boolean;
  readonly llmConfigured: boolean;
  /** Queue these exact bytes synchronously in the actual HTTP/connection sink.
   * Native disclosure remains fenced through serialization and this handoff;
   * a slow socket does not retain the publication lock while it drains. */
  readonly publish: (bytes: Buffer, view: GameView) => void;
}
const caches = new WeakMap<NativePlayerRequestOwner, Map<string, PlayerAsyncCache>>();
function scopedCache(owner: NativePlayerRequestOwner, scope: RequestScope): PlayerAsyncCache {
  let scopes = caches.get(owner);
  if (!scopes) caches.set(owner, (scopes = new Map()));
  for (const [key, cache] of scopes) if (!owner.currentScope(cache.scope)) scopes.delete(key);
  const key = scopeKey(scope);
  let cache = scopes.get(key);
  if (!cache) {
    while (scopes.size >= owner.connectionLimit) scopes.delete(scopes.keys().next().value!);
    scopes.set(key, (cache = { scope, values: new Map(), sections: new Map() }));
  }
  return cache;
}

/** The complete ordinary embodied request. Private simulation reads end at the
 * finite captures above; formatting and asynchronous repositories see no Entity
 * or WorldState. The supported installation refuses positive unconverted item,
 * recipe and agreement families; this request explicitly refuses inspection. */
export async function projectNativePlayerView(request: NativePlayerViewRequest): Promise<void> {
  const { owner, scope, definitions, store } = request;
  owner.assertScope(scope);
  if (scope.audience !== 'embodied')
    throw new Error('Native authorized-inspection presentation is unavailable.');
  const profile = await owner.profileFor(scope);
  owner.assertScope(scope);
  const read = await owner.capture(scope);
  try {
    const { self, perception, controls, clock, host } = read;
    if (
      host.access?.actorId !== scope.actorId ||
      host.access.scope !== scopeKey(scope) ||
      host.access.accountId !== scope.accountId
    )
      throw new ViewChangedError();
    if (self.player.knownRecipes.length !== 0)
      throw new Error('Native learned-method presentation is unavailable.');
    const cache = scopedCache(owner, scope),
      memo = memoizer(cache);
    const owned = await nativePlayerOwnedView(self, perception, definitions, {
      paused: clock.paused,
      inputScope: read.player.inputScope,
      // Authorized-inspection tools and its recovery-opening operation are an
      // explicitly unconverted proof family, never a silent ordinary-player mode.
      freshWorldReview: read.freshWorldReview,
      practiceLoader: request.practiceLoader,
    });
    const selectedEvents = nativePlayerEvents(self, perception, read.events, definitions);
    const conversation = selectedEvents.filter(isConversationEvent).slice(-30);
    const speechIds = playerSpeechJobIds(conversation, self.actorId);
    const usage = optional(
      owner,
      cache,
      'usage',
      memo('usage', [read.telemetryRevision], () => store.usage(request.budgetUsd, scope.actorId)),
      playerUsageFallback(request.budgetUsd),
    );
    const jobs = projectPlayerJobs(
      optional(
        owner,
        cache,
        'jobs',
        memo('jobs', [read.telemetryRevision], async () =>
          permittedPlayerJobs(await store.recentJobs(), scope, (id) => owner.speechEventActor(id)),
        ),
        [],
      ),
    );
    const replies = optional(
      owner,
      cache,
      'speechJobs',
      // Only SQL addresses belong in this retained cache. Holding ActorEvent
      // objects here would outlive their native capture byte/evidence custody.
      memo('speechJobs', [host.historyEpoch, read.telemetryRevision, ...speechIds], () =>
        store.getSpeechJobs(speechIds),
      ),
      new Map<string, never>(),
    );
    const pausedStop =
      clock.paused && playerHasWork(!!self.action, self.player.agency)
        ? await owner.previewPausedStop(scope)
        : undefined;
    const timing = { at: self.at, maxAgeSeconds: definitions.recentMaxAgeSeconds };
    const narratorRevision = store.history?.bannerRevisionAt(self.worldId, scope.accountId, timing);
    const narration = await memo(
      'narrator',
      [narratorRevision, host.historyEpoch],
      () =>
        store.history?.latestNarration(self.worldId, scope.accountId, timing) ??
        Promise.resolve({ status: 'current' as const, item: null }),
    );
    if (narration.status === 'stale') throw new ViewChangedError();
    const assetAuthorityGeneration = owner.lifecycle().assetAuthorityGeneration;
    const presentationRelease = await owner.presentationReleaseFor(scope);
    const world = nativePlayerWorldView(self, perception, definitions, controls, {
      ...clock,
      map: request.map,
      placesRevision: read.placesRevision,
    });
    const eventViews = nativePlayerEventViews(
      self,
      perception,
      read.events,
      definitions,
      scope,
      host.saveTimeline,
      replies,
    );
    const projected: Omit<GameView, 'player'> & {
      player: Omit<GameView['player'], 'canUseInventory'>;
    } = {
      ...host,
      ...world,
      ...eventViews,
      schemaVersion: 3,
      worldId: self.worldId,
      evaluationCut: self.at,
      sightConfirmedThrough: perception.sightConfirmedThrough,
      godMode: false,
      profile,
      inventionPolicy: definitions.inventionPolicy,
      narrator: narration.item,
      ...(presentationRelease ? { presentationRelease } : {}),
      ...(presentationRelease || host.access.canManageSaves
        ? { presentationReleaseRevision: owner.presentationReleaseRevision() }
        : {}),
      player: {
        ...owned,
        ...read.player,
        work: null,
        controls: nativePlayerControls(self, controls, definitions, {
          paused: clock.paused,
          controlling: read.controlling,
          pausedStop,
          withdrawals: read.withdrawals,
        }),
      },
      entities: nativePlayerEntities(self, perception, definitions, scope).entities,
      communicationReferences: nativePlayerCommunicationReferences(self, scope),
      recipes: [],
      ai: projectPlayerAi(jobs, usage, request),
    };
    const current = owner.lifecycle();
    if (
      read.lifecycle.generation !== current.generation ||
      read.lifecycle.historyEpoch !== current.historyEpoch ||
      assetAuthorityGeneration !== current.assetAuthorityGeneration ||
      narratorRevision !==
        store.history?.bannerRevisionAt(self.worldId, scope.accountId, {
          ...timing,
          at: current.at,
        })
    )
      throw new ViewChangedError();
    owner.assertScope(scope);
    await read.publishIfPermitted(
      selectedEvents.map((event) => event.id),
      (canUseInventory, encode) => {
        const finalView = { ...projected, player: { ...projected.player, canUseInventory } };
        const bytes = encode(finalView);
        request.publish(bytes, retainNativeSources(finalView, bytes));
        return bytes;
      },
      () => {
        owner.assertScope(scope);
        const final = owner.lifecycle();
        return (
          current.generation === final.generation &&
          current.historyEpoch === final.historyEpoch &&
          assetAuthorityGeneration === final.assetAuthorityGeneration &&
          narratorRevision ===
            store.history?.bannerRevisionAt(self.worldId, scope.accountId, {
              ...timing,
              at: final.at,
            })
        );
      },
    );
  } finally {
    read.release();
  }
}
