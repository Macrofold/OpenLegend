import { isConversationEvent } from '@open-legend/domain';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import type { AiJobView, GameView, WorldInputScope } from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import {
  attachNativeConsumer,
  copyNativeProduct,
  retainNativeSources,
  releaseNativeProduct,
  reserveNativeJsonTextWorkspace,
  withoutNativeConsumerScope,
} from './native-consumer.js';
import {
  fundNativeSourceWorkspace,
  withNativeSqlPreparation,
} from './native-source-preparation.js';
import type { GameRepository, SqlDatabase } from './store.js';
import type { PlayerPracticeLoader } from './player-self-view.js';
import { playerHasWork } from './player-self-view.js';
import {
  nativePlayerCommunicationReferences,
  nativePlayerControls,
  nativePlayerEntities,
  nativePlayerEvents,
  nativePlayerEventSelectionBytes,
  nativePlayerEventViewBytes,
  nativePlayerEventViews,
  nativePlayerOwnedView,
  nativePlayerWorldView,
  nativePlayerProjectionBytes,
  type NativePlayerActorSelf,
  type NativePlayerActorPerception,
  type NativePlayerControlFacts,
  type NativePlayerEventRead,
  type NativePlayerViewDefinitions,
} from './native-view.js';
import {
  memoizer,
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
  > & { readonly inputScope: WorldInputScope };
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
  readonly capacity: Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
  readonly scope: RequestScope;
  readonly definitions: NativePlayerViewDefinitions;
  readonly map: Parameters<typeof nativePlayerWorldView>[4]['map'];
  readonly store: Pick<GameRepository, 'usage' | 'recentJobs' | 'getSpeechJobs' | 'history'> & {
    readonly db: Pick<SqlDatabase, 'withReadTransferAdmission'>;
  };
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

type OptionalSection = 'usage' | 'jobs' | 'speechJobs';
type ViewDependency = string | number;
type OptionalView = {
  readonly deps: readonly ViewDependency[];
  readonly allocation: NativeWorldConsumer;
  value?: object;
  loading: boolean;
  retired: boolean;
};
type NativePlayerCache = Pick<PlayerAsyncCache, 'scope' | 'values'> & {
  readonly optional: Partial<Record<OptionalSection, OptionalView>>;
  readonly allocation: NativeWorldConsumer;
  loading: number;
  readers: number;
  retired: boolean;
};
const caches = new WeakMap<
  NativePlayerRequestOwner,
  { readonly scopes: Map<string, NativePlayerCache>; readonly allocation: NativeWorldConsumer }
>();

function finishCache(cache: NativePlayerCache): void {
  if (cache.retired && !cache.loading && !cache.readers) cache.allocation.release();
}

function retireOptional(entry: OptionalView): void {
  entry.retired = true;
  if (entry.value) releaseNativeProduct(entry.value);
  entry.value = undefined;
  if (!entry.loading) entry.allocation.release();
}

function retireCache(cache: NativePlayerCache): void {
  cache.retired = true;
  for (const key of ['usage', 'jobs', 'speechJobs'] as const) {
    const entry = cache.optional[key];
    if (entry) retireOptional(entry);
    delete cache.optional[key];
  }
  cache.values.clear();
  finishCache(cache);
}

/** End this world's cache ownership at actual restore adoption or close.
 * Pending SQL and already borrowed view values finish under their own owners. */
export function clearNativePlayerViewCache(owner: NativePlayerRequestOwner): void {
  const table = caches.get(owner);
  if (!table) return;
  caches.delete(owner);
  for (const cache of table.scopes.values()) retireCache(cache);
  table.scopes.clear();
  table.allocation.release();
}

function scopedCache(
  owner: NativePlayerRequestOwner,
  scope: RequestScope,
  capacity: NativePlayerViewRequest['capacity'],
): NativePlayerCache {
  let table = caches.get(owner);
  if (!table) {
    const allocation = capacity.reserveConsumerBytes((owner.connectionLimit + 3) * 256);
    table = { scopes: new Map(), allocation };
    caches.set(owner, table);
  }
  const scopes = table.scopes;
  for (const [key, cache] of scopes)
    if (!owner.currentScope(cache.scope)) {
      scopes.delete(key);
      retireCache(cache);
    }
  const key = scopeKey(scope);
  let cache = scopes.get(key);
  if (!cache) {
    let units = key.length;
    for (const value of Object.values(scope)) if (typeof value === 'string') units += value.length;
    const allocation = capacity.reserveConsumerBytes(8 * 256 + 2 * units);
    while (scopes.size >= owner.connectionLimit) {
      const oldest = scopes.keys().next().value!;
      retireCache(scopes.get(oldest)!);
      scopes.delete(oldest);
    }
    cache = {
      scope: { ...scope },
      values: new Map(),
      optional: {},
      allocation,
      loading: 0,
      readers: 0,
      retired: false,
    };
    scopes.set(key, cache);
  }
  cache.readers++;
  return cache;
}

async function loadOptionalView<T extends object>(
  owner: NativePlayerRequestOwner,
  cache: NativePlayerCache,
  section: OptionalSection,
  entry: OptionalView,
  capacity: NativePlayerViewRequest['capacity'],
  db: NativePlayerViewRequest['store']['db'],
  load: () => Promise<T>,
): Promise<void> {
  let selected: T | undefined;
  try {
    // These operational tables have single-statement snapshots and no live
    // gameplay overlay. Keep their actual transfer/parse owner independent of
    // the player cut, whose view may complete before these reads settle.
    await withoutNativeConsumerScope(() =>
      withNativeSqlPreparation(capacity, db, async () => {
        selected = copyNativeProduct(capacity, await load());
      }),
    );
    if (entry.retired || !owner.currentScope(cache.scope)) return;
    entry.value = selected;
    selected = undefined;
    owner.notify(false);
  } catch {
    // These sections are optional. The next matching request may retry them.
  } finally {
    if (!entry.value && cache.optional[section] === entry) {
      delete cache.optional[section];
      retireOptional(entry);
    }
    if (selected) releaseNativeProduct(selected);
    entry.loading = false;
    if (entry.retired) entry.allocation.release();
    cache.loading--;
    finishCache(cache);
  }
}

function optionalNativePlayerView<T extends object>(
  owner: NativePlayerRequestOwner,
  cache: NativePlayerCache,
  capacity: NativePlayerViewRequest['capacity'],
  db: NativePlayerViewRequest['store']['db'],
  section: OptionalSection,
  deps: readonly ViewDependency[],
  load: () => Promise<T>,
  fallback: T,
  borrowed: object[],
): T {
  if (cache.retired) return fallback;
  const current = cache.optional[section];
  if (
    current &&
    current.deps.length === deps.length &&
    deps.every((dep, index) => dep === current.deps[index])
  ) {
    if (!current.value) return fallback;
    borrowed.push(retainNativeSources({}, current.value));
    return current.value as T;
  }
  if (current) {
    delete cache.optional[section];
    retireOptional(current);
  }
  let units = 0;
  for (const dep of deps) if (typeof dep === 'string') units += dep.length;
  let allocation: NativeWorldConsumer;
  try {
    // Speech uses both its dependency vector and the selected SQL addresses.
    allocation = capacity.reserveConsumerBytes(6 * 256 + 2 * units + 2 * 64 * deps.length);
  } catch {
    return fallback;
  }
  const entry: OptionalView = { deps, allocation, loading: true, retired: false };
  cache.optional[section] = entry;
  cache.loading++;
  void loadOptionalView(owner, cache, section, entry, capacity, db, load);
  return fallback;
}

type SpeechReply = Pick<AiJobView, 'id' | 'status' | 'message'>;
async function selectedPlayerJobs(
  owner: NativePlayerRequestOwner,
  scope: RequestScope,
  store: NativePlayerViewRequest['store'],
): Promise<GameView['ai']['jobs']> {
  const jobs = await store.recentJobs();
  fundNativeSourceWorkspace(4 * 256 + jobs.length * (256 + 9 * 64 + 2 * 64));
  return projectPlayerJobs(permittedPlayerJobs(jobs, scope, (id) => owner.speechEventActor(id)));
}

async function selectedSpeechReplies(
  store: NativePlayerViewRequest['store'],
  ids: string[],
): Promise<Array<[string, SpeechReply]>> {
  const jobs = await store.getSpeechJobs(ids);
  fundNativeSourceWorkspace(4 * 256 + jobs.size * (3 * 256 + 7 * 64));
  return [...jobs].map(([event, { id, status, message }]) => [event, { id, status, message }]);
}

/** The complete ordinary embodied request. Private simulation reads end at the
 * finite captures above; formatting and asynchronous repositories see no Entity
 * or WorldState. The supported installation refuses positive unconverted item,
 * recipe and agreement families; this request explicitly refuses inspection. */
export async function projectNativePlayerView(request: NativePlayerViewRequest): Promise<void> {
  const { owner, capacity, scope, definitions, store, budgetUsd } = request;
  owner.assertScope(scope);
  if (scope.audience !== 'embodied')
    throw new Error('Native authorized-inspection presentation is unavailable.');
  const profile = await owner.profileFor(scope);
  let read: NativePlayerRead | undefined;
  let frame: NativeWorldConsumer | undefined;
  let projection: NativeWorldConsumer | undefined;
  let selection: NativeWorldConsumer | undefined;
  let eventWorkspace: NativeWorldConsumer | undefined;
  let scopeWorkspace: NativeWorldConsumer | undefined;
  let viewOutput: NativeWorldConsumer | undefined;
  let eventOutput: NativeWorldConsumer | undefined;
  let replyWorkspace: NativeWorldConsumer | undefined;
  let cache: NativePlayerCache | undefined;
  let borrowed: object[] | undefined;
  try {
    // Small closures and scratch carriers remain live while the caller awaits
    // the real prepared fields. The returned view has separate custody.
    frame = capacity.reserveConsumerBytes(24 * 256);
    scopeWorkspace = reserveNativeJsonTextWorkspace(capacity, scope);
    owner.assertScope(scope);
    read = await owner.capture(scope);
    const { self, perception, controls, clock, host } = read;
    const inputScope = read.player.inputScope;
    if (
      host.access?.actorId !== scope.actorId ||
      host.access.scope !== scopeKey(scope) ||
      host.access.accountId !== scope.accountId
    )
      throw new ViewChangedError();
    if (self.player.knownRecipes.length !== 0)
      throw new Error('Native learned-method presentation is unavailable.');
    const bound = nativePlayerProjectionBytes(
      self,
      perception,
      definitions,
      request.map,
      read.withdrawals,
    );
    projection = capacity.reserveConsumerBytes(bound.workspace);
    viewOutput = capacity.reserveConsumerBytes(bound.output);
    const sections = (cache = scopedCache(owner, scope, capacity));
    const sources = (borrowed = [] as object[]);
    const memo = memoizer(sections);
    const owned = await nativePlayerOwnedView(
      self,
      perception,
      definitions,
      {
        paused: clock.paused,
        inputScope: read.player.inputScope,
        // Authorized-inspection tools and its recovery-opening operation are an
        // explicitly unconverted proof family, never a silent ordinary-player mode.
        freshWorldReview: read.freshWorldReview,
        practiceLoader: request.practiceLoader,
      },
      capacity,
    );
    selection = capacity.reserveConsumerBytes(nativePlayerEventSelectionBytes(read.events));
    const selectedEvents = nativePlayerEvents(self, perception, read.events, definitions);
    const conversation = selectedEvents.filter(isConversationEvent).slice(-30);
    const speechIds = playerSpeechJobIds(conversation, self.actorId);
    const usage = optionalNativePlayerView(
      owner,
      sections,
      capacity,
      store.db,
      'usage',
      [read.telemetryRevision],
      () => store.usage(budgetUsd, sections.scope.actorId),
      playerUsageFallback(budgetUsd),
      sources,
    );
    const jobs = optionalNativePlayerView(
      owner,
      sections,
      capacity,
      store.db,
      'jobs',
      [read.telemetryRevision],
      () => selectedPlayerJobs(owner, sections.scope, store),
      [],
      sources,
    );
    const replyRows = optionalNativePlayerView(
      owner,
      sections,
      capacity,
      store.db,
      'speechJobs',
      [host.historyEpoch, read.telemetryRevision, ...speechIds],
      () => selectedSpeechReplies(store, speechIds),
      [],
      sources,
    );
    const pausedStop =
      clock.paused && playerHasWork(!!self.action, self.player.agency)
        ? await owner.previewPausedStop(scope)
        : undefined;
    const timing = { at: self.at, maxAgeSeconds: definitions.recentMaxAgeSeconds };
    const narratorRevision = store.history?.bannerRevisionAt(self.worldId, scope.accountId, timing);
    if (sections.retired) throw new ViewChangedError();
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
    const eventBound = nativePlayerEventViewBytes(selectedEvents, conversation, definitions);
    eventWorkspace = capacity.reserveConsumerBytes(eventBound.workspace);
    eventOutput = capacity.reserveConsumerBytes(eventBound.output);
    replyWorkspace = capacity.reserveConsumerBytes(256 + 4 * 64 * replyRows.length);
    const world = nativePlayerWorldView(self, perception, definitions, controls, {
      ...clock,
      map: request.map,
      placesRevision: read.placesRevision,
    });
    const eventViews = nativePlayerEventViews(
      self,
      selectedEvents,
      conversation,
      read.events,
      definitions,
      scope,
      host.saveTimeline,
      new Map(replyRows),
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
      entities: nativePlayerEntities(self, perception, definitions, scope, capacity),
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
        attachNativeConsumer(finalView, viewOutput!);
        viewOutput = undefined;
        attachNativeConsumer(finalView, eventOutput!);
        eventOutput = undefined;
        request.publish(
          bytes,
          retainNativeSources(finalView, bytes, profile, inputScope, ...sources),
        );
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
    read?.release();
    releaseNativeProduct(profile);
    if (borrowed) for (const source of borrowed) releaseNativeProduct(source);
    if (cache) {
      cache.readers--;
      finishCache(cache);
    }
    replyWorkspace?.release();
    eventOutput?.release();
    viewOutput?.release();
    eventWorkspace?.release();
    selection?.release();
    projection?.release();
    scopeWorkspace?.release();
    frame?.release();
  }
}
