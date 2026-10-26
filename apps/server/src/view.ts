import { receivedEventAccounts } from './received-event-accounts.js';
import {
  currentBodyObservation,
  currentObservedFacets,
  rememberedCommunicationSubjects,
  currentCommunicationSubject,
} from '@open-legend/domain';
import {
  currentContactReference,
  communicationReference,
  projectCommandContactReferences,
} from './public-contact-references.js';
import { permittedSourceHandle, evidenceSourceHandle } from './entity-references.js';
import { entityGet } from '@open-legend/domain';
import { selectedEventPresentation } from '@open-legend/domain';
import { nativeCommandSupported } from '@open-legend/domain';
import { nativeCommandKind } from './native-command-kind.js';
import { outingViews } from './outing-view.js';

import { recipeDetailsView } from './recipe-view.js';
import { guardWorkLabel, BASE_RANGED_TEXT, nativeActivityViews } from '@open-legend/domain';
import { competenceOptions, waitingForFeedback } from './competence-actions.js';
import {
  ownPractice,
  coachingFor,
  occurrenceFor,
  renderActivity,
  type PracticeView,
  type ActivityOccurrence,
} from '@open-legend/domain';

import {
  basePlaytestMilestones,
  BASE_FAMILY_POLICY,
  preferredTargetEquipment,
} from '@open-legend/domain';
import { projectWork } from './work-view.js';
import { projectActivityStatus } from './activity-requests.js';
import { canUseInventory, inventoryItemSummary, inventoryStorageHint } from './inventory-view.js';
import { namedClockTimes, typedRequestVocabulary, nativeActionIcon } from '@open-legend/domain';
import { exposedPlaces, worldPosition, worldSupport } from '@open-legend/domain';
import {
  commandRecoveryScopeKey,
  checkpointRecoveryScopeKey,
  privateDraftScopeKey,
  scopeKey,
  type RequestScope,
} from './authority.js';
import { observerName } from '@open-legend/domain';
import { handoverOptions, itemTradeView, tradeOwnLots } from './handover-actions.js';
import { canHandleItems } from '@open-legend/domain';
import { projectStatusEffects } from '@open-legend/domain';
import { bodyPolicy } from '@open-legend/domain';
import { isConversationEvent } from '@open-legend/domain';

import { actionAnimation } from './action-animation.js';
import {
  knownRecipeAttribution,
  navigationBlocked,
  projectEventEvidence,
  hearingReferenceRadius,
  perceptionGuide,
  type ActorEvent,
} from '@open-legend/domain';
import { publicEvent } from './perceived-events.js';
import { projectAttributes, attributeDefinition } from '@open-legend/domain';

import type {
  ActionOption,
  EntityView,
  GamePatch,
  GameView,
  InventoryItemSummary,
} from '@open-legend/protocol';
import {
  visionRadius,
  inventoryFor,
  quantityOf,
  canRecoverAtCamp,
  GOD_SPAWN_OPTIONS,
  TRAIT_BANK,
  type WorldState,
} from '@open-legend/domain';

import { reincarnationPolicy } from '@open-legend/domain';
import type { WorldService } from './world-service.js';

/** Private evidence changed during a read; discard and prepare a current view. */
export class ViewChangedError extends Error {
  constructor() {
    super('The world changed while preparing this view. Refresh to see current information.');
  }
}

interface ViewCache {
  scope: RequestScope;
  values: Map<string, { deps: unknown[]; value: unknown }>;
  sections: Map<string, { token: unknown; value?: unknown }>;
  entities: Map<string, Map<string, { deps: unknown[]; value: unknown }>>;
}
const projections = new WeakMap<WorldService, Map<string, ViewCache>>();
function scopedCache(service: WorldService, scope: RequestScope): ViewCache {
  let scopes = projections.get(service);
  if (!scopes) projections.set(service, (scopes = new Map()));
  for (const [key, cache] of scopes) if (!service.currentScope(cache.scope)) scopes.delete(key);
  const key = scopeKey(scope);
  let cache = scopes.get(key);
  if (!cache) {
    while (scopes.size >= service.config.capacity.connections)
      scopes.delete(scopes.keys().next().value!);
    scopes.set(
      key,
      (cache = { scope, values: new Map(), sections: new Map(), entities: new Map() }),
    );
  }
  return cache;
}
function memoizer(cache: Pick<ViewCache, 'values'>) {
  return <T>(key: string, deps: unknown[], build: () => T): T => {
    const old = cache.values.get(key);
    if (old && old.deps.length === deps.length && deps.every((dep, i) => dep === old.deps[i]))
      return old.value as T;
    const value = build();
    cache.values.set(key, { deps, value });
    if (value instanceof Promise)
      void value.catch(() => {
        if (cache.values.get(key)?.value === value) cache.values.delete(key);
      });
    return value;
  };
}
/** An async result may populate only its original still-permitted private section. */
function optional<T>(
  service: WorldService,
  cache: ViewCache,
  key: string,
  token: Promise<T>,
  fallback: T,
): T {
  const old = cache.sections.get(key);
  if (old?.token === token) return (old.value as T | undefined) ?? fallback;
  const entry: { token: unknown; value?: unknown } = { token };
  cache.sections.set(key, entry);
  void token
    .then((value) => {
      if (cache.sections.get(key) !== entry || !service.currentScope(cache.scope)) return;
      entry.value = value;
      service.notify(false);
    })
    .catch(() => {});
  return fallback;
}

function isJournalEvent(event: { type: string; text: string; data?: Record<string, unknown> }) {
  return !(
    event.type === 'action-started' &&
    (event.data?.['actionType'] === 'move' ||
      (event.data?.['actionType'] === undefined && event.text.endsWith(' started move.')))
  );
}

/** Calendar projection shared by embodied views and the characterless operations view. */
export const calendarFields = (world: WorldState) => ({
  seconds: world.simTime,
  day: Math.floor(world.simTime / 86400) + 1,
  hour: (world.statusEffectPolicy.clockOffsetHours + world.simTime / 3600) % 24,
});

/** This explicit projection is a security boundary: never serialize WorldState to the browser. */
export async function projectView(
  service: WorldService,
  executionSource: 'live-model' | 'test-fixture' = 'live-model',
  scope: RequestScope = service.localScope,
): Promise<GameView> {
  service.assertScope(scope);
  const profile = await service.profileFor(scope);
  const cache = scopedCache(service, scope);
  const world = service.world;
  // Native arithmetic can advance a person's current meters without replacing
  // their stored actor record. Reuse the window only for an affected person.
  const nativeValuesFor = (id: string) =>
    world.pendingNativeIntegration?.byEntity[id] ? world.pendingNativeIntegration : undefined;
  const revision = service.version;
  const memo = memoizer(cache);
  const paused = service.paused;
  const pauseReason = service.pauseReason;
  const speed = service.speed;
  const milestones = service.milestonesFor(scope.actorId);
  const storageError = service.storageError;
  const telemetryRevision = service.telemetryRevision;
  // Timed perception restrictions can expire without replacing any entity.
  // Depend on their current result, not every clock tick between boundaries.
  const observer = entityGet(world.entities, scope.actorId)!;
  const sightRadius = visionRadius(world, observer);
  const observation = {
    inventory: memo(
      'ownedItems',
      [entityGet(world.entities, scope.actorId)?.inventoryRevision],
      () => inventoryFor(world, scope.actorId),
    ),
    visibleEntities: memo(
      'visibleEntities',
      [world.entities, world.perceptionEvidence?.[scope.actorId]],
      () =>
        [
          ...new Set(
            Object.values(world.perceptionEvidence?.[scope.actorId]?.current ?? {})
              .filter((lease) => lease.value.kind === 'body')
              .map((lease) => lease.subjectId),
          ),
        ].flatMap((id) => {
          const entity = entityGet(world.entities, id);
          return entity && id !== scope.actorId && currentBodyObservation(world, scope.actorId, id)
            ? [entity]
            : [];
        }),
    ),
    knownRecipes: memo('knownRecipes', [world.knowledge[scope.actorId], world.recipes], () =>
      (world.knowledge[scope.actorId] ?? [])
        .map((record) => world.recipes[record.recipeId])
        .filter((recipe) => !!recipe),
    ),
  };
  const visibleIds = new Set(observation.visibleEntities.map((entity) => entity.id));
  for (const id of cache.entities.keys()) if (!visibleIds.has(id)) cache.entities.delete(id);
  for (const key of cache.values.keys())
    if (key.startsWith('entity:') && !visibleIds.has(key.slice(7))) cache.values.delete(key);
  const player = entityGet(world.entities, scope.actorId)!;
  const presentation = memo(
    'presentation',
    [world.presentation, world.places, player, observation.visibleEntities],
    () => {
      const position = worldPosition(player);
      let nearest: { id: string; label: string; distance: number } | undefined;
      // Location is a current perception, not the world's fixed opening heading or a remembered site.
      for (const place of exposedPlaces(
        world,
        player,
        observation.visibleEntities.map((entity) => entity.id),
      )) {
        const distance =
          (position.x - place.point.x) ** 2 +
          (position.y - place.point.y) ** 2 +
          (position.z - place.point.z) ** 2;
        if (
          !nearest ||
          distance < nearest.distance ||
          (distance === nearest.distance && place.id < nearest.id)
        )
          nearest = { id: place.id, label: place.label, distance };
      }
      const worldName = world.presentation?.worldName ?? 'World';
      return {
        worldName,
        locationName: nearest?.label ?? worldName,
        timeLabel: world.presentation?.timeLabel ?? 'World time',
      };
    },
  );
  const actor = player.actor!;
  const generation = service.generation;
  const historyEpoch = service.historyEpoch;
  const practice = await memo<Promise<PracticeView[]>>(
    'practice',
    [actor.practice, world.moduleManifest, generation, historyEpoch],
    async () => {
      const progress = ownPractice(world, player);
      const missing = progress.flatMap((p) =>
        p.evidence
          .filter((e) => !occurrenceFor(world, player.id, e.occurrenceId))
          .map((e) => e.occurrenceId),
      );
      const recorded = new Map<string, ActivityOccurrence>();
      if (service.store.records)
        for (let offset = 0; offset < missing.length; offset += 128) {
          const rows = await service.store.records.activityPage(
            world.id,
            player.id,
            -1,
            missing.slice(offset, offset + 128),
            128,
          );
          for (const row of rows) if (!row.entry.revoked) recorded.set(row.entry.id, row.entry);
        }
      return progress.map((p) => ({
        ...p,
        evidence: p.evidence.map((e) => ({
          ...e,
          description: recorded.has(e.occurrenceId)
            ? renderActivity(recorded.get(e.occurrenceId)!.view, 'What happened')
            : e.description,
        })),
      }));
    },
  );
  // A correction can revoke retained evidence while SQL inspection is pending.
  // Recheck even a cached promise before publishing pre-correction private text.
  if (generation !== service.generation || historyEpoch !== service.historyEpoch)
    throw new ViewChangedError();
  service.assertScope(scope);
  const quantity = (definitionId: string) => quantityOf(world, player.id, definitionId);
  const active =
    actor.participation?.phase !== 'inactive' &&
    !paused &&
    actor.alive &&
    !actor.incapacitated &&
    service.currentScope(scope, 'play', true);
  const coaching = coachingFor(world, scope.actorId);
  const action = (
    id: string,
    label: string,
    command: ActionOption['command'],
    possible = true,
    reason?: string,
    icon = nativeActionIcon(command.type),
  ): ActionOption => {
    // Consent-ending rows carry the server's complete current preview. They require
    // control, while declining physical work requires no live body or running clock.
    const consentEnding =
      command.type === 'coaching' &&
      (command.coachingOperation === 'withdraw' || command.coachingOperation === 'decline');
    const canChoose =
      active ||
      ((consentEnding || command.type === 'cancel') && service.currentScope(scope, 'play', true));
    return {
      id,
      label,
      icon,
      command,
      enabled: canChoose && possible,
      ...(!canChoose
        ? {
            reason: paused
              ? 'Resume the world to act.'
              : 'You cannot act in your current condition.',
          }
        : !possible && reason
          ? { reason }
          : {}),
    };
  };
  let activityView: ReturnType<typeof nativeActivityViews> | undefined;
  const attackDetails = (command: import('@open-legend/domain').Command) => {
    const view = (activityView ??= nativeActivityViews(world, observation.inventory))(command);
    const facts = view.facts
      .filter((fact) => fact.critical)
      .map((fact) => [fact.name, String(fact.value)] as [string, string]);
    const detail = view.facts
      .filter((fact) => !fact.critical)
      .map((fact) => `${fact.name}: ${String(fact.value)}`)
      .join('; ');
    return { facts, detail };
  };
  const equipment = preferredTargetEquipment(world, scope.actorId);
  const inventoryItems = observation.inventory.slice(0, 60);
  // Plain owned lots depend on their own records. Containers, method records,
  // declared ownership and exposed building materials retain the broader world
  // dependencies used by their access, validation, naming and roof/rain readers.
  const broadInventory = inventoryItems.some((item) => {
    const definition = world.itemDefinitions[item.definitionId];
    return (
      item.container ||
      definition?.recipeRecord ||
      definition?.assemblyMaterial ||
      entityGet(world.entities, item.id)?.declaredOwner
    );
  });
  const materialInventory = inventoryItems.some(
    (item) => world.itemDefinitions[item.definitionId]?.assemblyMaterial,
  );
  const inventory = memo<InventoryItemSummary[]>(
    'inventory',
    [
      observation.inventory,
      broadInventory ? world.entities : undefined,
      ...inventoryItems.map((item) => entityGet(world.entities, item.id)),
      materialInventory ? world.finiteRain : undefined,
      materialInventory ? world.simTime : undefined,
      materialInventory ? world.assemblyFamilies : undefined,
      world.map,
      world.resourceReservations,
      world.itemDefinitions,
      world.recipes,
      actor.inventoryInspection,
      world.knowledge[player.id],
      player.inventoryRevision,
      actor.action,
      world.itemHandling,
      player.spatial,
      player.placement,
      player.statusEffects,
      world.statusEffectPolicy,
      actor.attributes,
      nativeValuesFor(player.id),
      actor.body,
      world.moduleManifest,
      active,
      paused,
    ],
    () => inventoryItems.map((item) => inventoryItemSummary(service, scope, item)),
  );
  // The current-channel producer owns measured values. Publication consumes its
  // frozen facets and does not rerun sight or fill missing detail from an Entity.
  const entities: EntityView[] = observation.visibleEntities.map((entity) => {
    const received = currentBodyObservation(world, player.id, entity.id);
    if (!received) throw new ViewChangedError();
    const body = received.value.body;
    const facets = currentObservedFacets(world, player.id, entity.id);
    const pile = facets.find((facet) => facet.value.kind === 'pile-contents');
    const carried = facets.find((facet) => facet.value.kind === 'carried');
    const publicAttributes = facets.find((facet) => facet.value.kind === 'public-attributes');
    const display = observerName(world, player.id, entity.id);
    const kind: EntityView['kind'] =
      body.kind === 'animal'
        ? 'animal'
        : body.kind === 'npc' || body.kind === 'player'
          ? 'actor'
          : body.kind === 'remains'
            ? 'remains'
            : body.kind === 'item-pile'
              ? 'item-pile'
              : body.kind === 'resource'
                ? 'resource'
                : body.kind === 'practice-target'
                  ? 'practice-target'
                  : 'station';
    const controls: ActionOption[] = [];
    if (entity.actor) {
      if (coaching && [coaching.learnerId, coaching.coachId].includes(entity.id))
        for (const option of competenceOptions(world, player.id, entity, [])) {
          const preview = service.previewCommand(option.command, player.id);
          controls.push(
            action(option.id, option.label, option.command, preview.ok, preview.message),
          );
        }
      for (const option of handoverOptions(world, player.id, observation.inventory, entity, {
        offers: false,
      })) {
        const preview = service.previewCommand(option.command, player.id);
        controls.push(
          action(option.id, option.shortLabel, option.command, preview.ok, preview.message),
        );
      }
    }
    const rememberedAddressee = currentCommunicationSubject(world, player.id, entity.id);
    const installedControls = controls.filter((option) =>
      nativeCommandSupported(world, nativeCommandKind(option.command.type)),
    );

    return {
      id: currentContactReference(world, scope, entity),
      ...display,
      observation: {
        kind: 'current',
        modality: 'sight',
        measurementAt: received.valueMeasuredThrough,
        acquiredAt: received.valueAcquiredAt,
        confirmedThrough: received.confirmedThrough,
        sourceReference: evidenceSourceHandle(world, player.id, {
          family: 'native-exposure',
          observer: received.original.observer,
          id: received.original.id,
          revision: received.original.revision,
        }),
      },
      kind,
      subtype: body.kind,
      position: body.position,
      supportSurfaceId: body.supportSurfaceId,
      heading: body.heading,
      appearance: body.appearance,
      radius: body.radius,
      bodySize: { width: body.radius * 2, height: body.height },
      status: body.outward.filter(Boolean).join(', '),
      ...(body.description ? { description: body.description } : {}),
      ...(publicAttributes?.value.kind === 'public-attributes'
        ? { attributes: publicAttributes.value.attributes }
        : {}),
      ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
      ...(body.heatLit !== undefined ? { heat: { lit: body.heatLit } } : {}),
      ...(body.remainsPhase === 'fresh' || body.remainsPhase === 'rotting'
        ? { bodyState: body.remainsPhase === 'fresh' ? ('dead' as const) : ('rotting' as const) }
        : {}),
      ...(pile?.value.kind === 'pile-contents' ? { contents: pile.value.items } : {}),
      storage: inventoryStorageHint(service, scope, entity.id, body),
      ...(carried?.value.kind === 'carried'
        ? {
            observedCarried: {
              items: carried.value.items,
              measurementAt: carried.valueMeasuredThrough,
              confirmedThrough: carried.confirmedThrough,
            },
          }
        : {}),
      ...(entity.actor
        ? {
            canTalk: body.outward[0] === 'alive',
            ...(rememberedAddressee
              ? {
                  communicationReference: communicationReference(scope, {
                    id: rememberedAddressee,
                  }),
                }
              : {}),
            ...(entity.actor.alive && canHandleItems(world, entity)
              ? {
                  trade: projectCommandContactReferences(
                    world,
                    scope,
                    itemTradeView(
                      world,
                      player.id,
                      memo('tradeOwnLots', [observation.inventory, world.itemDefinitions], () =>
                        tradeOwnLots(world, observation.inventory),
                      ),
                      entity,
                      JSON.stringify([privateDraftScopeKey(scope), service.timelineId]),
                      installedControls,
                    ),
                  ),
                }
              : {}),
          }
        : {}),
      ...(installedControls.length
        ? {
            controls: installedControls.map((option) => ({
              ...option,
              id: permittedSourceHandle(world, player.id, ['control', option.id]),
              command: projectCommandContactReferences(world, scope, option.command),
            })),
          }
        : {}),
    };
  });
  const events = memo(
    'visibleEvents',
    [
      world.events,
      world.experience?.awareness[scope.actorId],
      world.experience?.temporal?.actors[scope.actorId]?.chunks,
      world.perceptionEvidence?.[scope.actorId]?.received,
      world.experience?.forgotten[scope.actorId],
      world.experience?.corrections?.[scope.actorId],
    ],
    () => {
      // Current reception may be displayed without becoming a lasting memory.
      // Actor-owned receipts authorize the recent sequence; global events supply
      // metadata only after that personal selection, never missing observations.
      const wanted = new Set([
        ...world.events.slice(-512).map((event) => event.id),
        ...(world.experience?.awareness[scope.actorId] ?? [])
          .slice(-512)
          .map((entry) => entry.eventId),
      ]);
      const visible = [...receivedEventAccounts(world, scope.actorId, wanted, { current: true })]
        .flatMap(([id, account]) => {
          const event = service.worldEvent(id);
          return event ? [projectEventEvidence(event, account.evidence)] : [];
        })
        .sort((a, b) => (b.order ?? b.sequence) - (a.order ?? a.sequence));
      const bounded: ActorEvent[] = [];
      let journal = 0;
      let conversation = 0;
      for (const event of visible) {
        bounded.push(event);
        if (isJournalEvent(event)) journal++;
        if (isConversationEvent(event)) conversation++;
        if (journal >= 60 && conversation >= 30) break;
      }
      return bounded.reverse();
    },
  );
  const usage = optional(
    service,
    cache,
    'usage',
    memo('usage', [telemetryRevision], () =>
      service.store.usage(
        service.config.budgetUsd,
        scope.audience === 'authorized-inspection' && service.currentScope(scope, 'inspect')
          ? undefined
          : scope.actorId,
      ),
    ),
    {
      budget: { limitUsd: service.config.budgetUsd, spentUsd: 0, reservedUsd: 0, estimated: true },
      usage: { jevCalls: 0, llmCalls: 0, inputTokens: 0, outputTokens: 0, lastLatencyMs: 0 },
    },
  );
  const jobs = optional(
    service,
    cache,
    'jobs',
    memo('jobs', [telemetryRevision], async () =>
      (await service.store.recentJobs()).filter((job) =>
        job.authority
          ? job.authority.accountId === scope.accountId && job.authority.actorId === scope.actorId
          : job.request.invention?.actorId === scope.actorId ||
            (job.kind === 'thought' && job.request.npcId === scope.actorId) ||
            (!!job.playerSpeechEventId &&
              service.worldEvent(job.playerSpeechEventId)?.actorId === scope.actorId),
      ),
    ),
    [],
  ).map(({ id, kind, status, message, queueLatencyMs, totalLatencyMs }) => ({
    id,
    kind,
    status,
    // Operational telemetry must not reveal a resident's private selected plan.
    message: kind === 'thought' ? `Resident reconsideration: ${status}.` : message,
    queueLatencyMs,
    totalLatencyMs,
  }));
  const conversationId = world.conversations?.active[scope.actorId];
  const conversationEntries = events
    .filter((event) => !conversationId || event.conversationId === conversationId)
    .filter((event) => isConversationEvent(event))
    .slice(-30);
  // Text is authoritative in memory; optional job reads must never hide it while refreshing.
  // See docs/architecture.md#performance-critical-path.
  const replies = optional(
    service,
    cache,
    'speechJobs',
    memo('speechJobs', [service.historyEpoch, telemetryRevision, ...conversationEntries], () =>
      service.store.getSpeechJobs(
        conversationEntries
          .filter((event) => event.actorId === scope.actorId)
          .map((event) => event.id),
      ),
    ),
    new Map<string, never>(),
  );
  const jevConfigured = service.config.macrofoldKey ? true : !!service.config.jevKey;
  const llmConfigured =
    !service.config.jevOnly && !!(service.config.macrofoldKey || service.config.llmKey);
  // Job history is not a service-health probe. A later completed request
  // supersedes an older failure; cancellations do not diagnose provider health.
  const latestSettled = jobs.find((job) => job.status === 'failed' || job.status === 'completed');
  const latestProblem = latestSettled?.status === 'failed' ? latestSettled : undefined;
  const aiMode =
    executionSource === 'test-fixture'
      ? 'fixture'
      : jevConfigured
        ? latestProblem
          ? 'degraded'
          : 'live'
        : 'unconfigured';
  const hasWork =
    !!actor.action ||
    !!actor.agency.suspended ||
    actor.agency.plan?.status === 'active' ||
    actor.agency.plan?.status === 'blocked';
  // Only paused existing work needs the service's exceptional-command check;
  // ordinary Stop remains a cheap direct control, not a fresh full action menu.
  const pausedStop =
    hasWork && paused ? service.previewCommand({ type: 'cancel' }, player.id) : undefined;
  const playerControls = [
    action(
      'cancel',
      'Stop all work',
      { type: 'cancel' },
      hasWork && (pausedStop?.ok ?? true),
      pausedStop?.message ?? 'No work to stop.',
    ),
  ];
  if (canRecoverAtCamp(world, player))
    playerControls.push({
      id: 'recover',
      label: bodyPolicy(world)!.recovery!.label,
      command: { type: 'recover' },
      enabled: !paused,
      reason: 'Personal playtest recovery; world history is retained.',
    });
  const reincarnation = reincarnationPolicy(world);
  if (actor.pendingDeath && reincarnation)
    playerControls.push({
      id: 'respawn',
      label: reincarnation.continueLabel,
      command: { type: 'respawn' },
      enabled:
        !paused &&
        actor.participation?.phase !== 'inactive' &&
        service.currentScope(scope, 'play', true),
      reason: 'Resume here before continuing.',
    });
  const work = actor.action;
  const aimDetails =
    work?.type === 'aim'
      ? attackDetails({
          id: work.id,
          actorId: scope.actorId,
          type: 'aim',
          targetId: work.targetId!,
          weaponItemId: work.weaponItemId,
          ammoItemId: work.ammoItemId,
        })
      : undefined;

  const targetName =
    work?.targetId &&
    observation.visibleEntities.some((entity) => entity.id === work.targetId) &&
    observerName(world, player.id, work.targetId).name;
  const workLabels: Record<string, string> = {
    'treat-scar':
      work?.scarId && reincarnation
        ? `${reincarnation.treatmentLabel} ${reincarnation.scars.find((scar) => scar.id === work.scarId)?.name ?? ''}`
        : 'Working',
    move: 'Walking',
    follow: 'Following',
    replenish:
      attributeDefinition(world, work?.attributeId ?? '')?.reservoir?.actionLabel ?? 'Working',
    'status-effect':
      world.statusEffectPolicy.definitions.find((d) => d.id === work?.definitionId)?.label ??
      'Active state',
    gather: `Gathering${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    harvest: `Harvesting${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    strike: `Striking${targetName ? ` ${targetName}` : ''}`,
    'practice-shot': 'Preparing one practice shot',
    coaching: waitingForFeedback(world, player)
      ? 'Waiting for the other person to choose feedback'
      : 'Guided feedback',
    evade: bodyPolicy(world)?.evasion?.label ?? 'Moving',
    hunt: `Hunting${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    aim: `${work?.ranged ? `${world.itemDefinitions[work.ranged.tool.id]?.name ?? 'Selected tool'}: ` : ''}${work?.ranged?.ready ? BASE_RANGED_TEXT.readyLabel : BASE_RANGED_TEXT.aimingLabel}${targetName ? ` (${targetName})` : ''}`,
    'shoot-once': `${BASE_RANGED_TEXT.shootingLabel}${targetName ? ` (${targetName})` : ''}`,
    cook: 'Cooking',
    fish: 'Fishing',
    'tend-fire':
      work?.fireOperation === 'light'
        ? 'Lighting the fire'
        : work?.fireOperation === 'fuel'
          ? 'Adding fuel'
          : 'Putting out the fire',
    prepare: work?.preparation === 'fiber' ? 'Cleaning fibers' : 'Twisting cord',
    craft: `Crafting${work?.recipeId && world.recipes[work.recipeId] ? ` ${world.recipes[work.recipeId]!.output.name}` : ''}`,
  };
  const guide = perceptionGuide(world, player);
  // Read the indexed latest passage before publishing the view. A temporary null
  // while this refreshes would dismiss and then reannounce the same old narration.
  // Narration completion already calls notifyHistory; unrelated telemetry is not a dependency.
  const narrator = await memo(
    'narrator',
    [service.store.history?.bannerRevision, historyEpoch],
    () =>
      service.store.history?.latestNarration(world.id, scope.accountId) ?? Promise.resolve(null),
  );
  const assetAuthorityGeneration = service.assetAuthorityGeneration;
  const presentationRelease = await service.presentationReleaseFor(scope);
  const projected: GameView = {
    schemaVersion: 3,
    evaluationCut: world.simTime,
    checkpoint: service.mayManageSaves(scope)
      ? {
          scope: scopeKey(scope),
          recoveryScope: checkpointRecoveryScopeKey(scope),
          timeline: service.timelineId,
        }
      : undefined,
    access: {
      scope: scopeKey(scope),
      privateDraftScope: privateDraftScopeKey(scope),
      commandRecoveryScope: commandRecoveryScopeKey(scope),
      canManageSaves: service.mayManageSaves(scope),
      accountId: scope.accountId,
      actorId: scope.actorId,
      controlGeneration: scope.controlGeneration,
      controlling: service.currentScope(scope, 'play', true),
      controlledElsewhere: service.controlsElsewhere(scope),
      canOperate:
        service.currentScope(scope, 'create') || service.currentScope(scope, 'manage-access'),
      mode: service.config.authentication.mode,
    },
    maintenance: service.maintenanceNotice,
    worldEventsRevision: service.worldEventsRevision(scope.actorId),
    historyRevision: service.historyRevision,
    historyEpoch: service.historyEpoch,
    narrator,
    revision,
    worldId: world.id,
    ...(presentationRelease ? { presentationRelease } : {}),
    ...(presentationRelease || service.mayManageSaves(scope)
      ? { presentationReleaseRevision: service.presentationReleaseRevision }
      : {}),
    presentation,
    saveTimeline: service.timelineId,
    commandEpoch: service.commandEpoch,
    godMode:
      service.config.godMode &&
      scope.audience === 'authorized-inspection' &&
      service.currentScope(scope, 'create'),
    inventionPolicy: {
      revision: world.inventionPolicy.revision,
      playerLocked: world.inventionPolicy.playerLocked,
      agentLocked: world.inventionPolicy.agentLocked,
    },
    ...(service.config.godMode &&
    scope.audience === 'authorized-inspection' &&
    service.currentScope(scope, 'create')
      ? {
          godTools: {
            familyLabel: BASE_FAMILY_POLICY.title,
            traits: TRAIT_BANK.map((trait) => ({ ...trait })),
            spawnOptions: GOD_SPAWN_OPTIONS.map((option) => ({ ...option })),
            itemOptions: memo('god-items', [world.itemDefinitions], () =>
              Object.values(world.itemDefinitions)
                .map((definition) => ({
                  id: definition.id,
                  label: definition.name,
                  ...(definition.icon ? { icon: definition.icon } : {}),
                  description: definition.description,
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            ),
          },
        }
      : {}),
    profile: profile,
    vision: { radius: visionRadius(world, player), ...guide.vision },
    hearing: { referenceRadius: hearingReferenceRadius(world, player), ...guide.hearing },
    map: memo<GameView['map']>('map', [world.map, world.seed], () => ({
      ...world.map,
      seed: world.seed,
    })),
    clock: {
      ...calendarFields(world),
      speed: speed,
      baseRatio: service.config.baseRatio,
      paused: paused,
      pauseReason: pauseReason,
      preparingNavigation: navigationBlocked(world),
      namedTimes: namedClockTimes(world),
      offsetHours: world.statusEffectPolicy.clockOffsetHours,
    },
    player: {
      appearance: player.appearance ?? 'sprite',
      participation: actor.participation?.phase ?? 'active',
      departureNotice: world.participationPolicy?.exitDescription,
      id: player.id,
      name: player.name,
      nameForm: player.nameForm,
      indefiniteArticle: player.indefiniteArticle,
      position: worldPosition(player),
      supportSurfaceId: worldSupport(player),
      heading: player.spatial.heading,
      attributes: projectAttributes(world, player, 'owner').filter(
        (attribute) => !attributeDefinition(world, attribute.id)?.practice,
      ),
      practice,
      actionAnimation: actionAnimation(world, player),
      alive: actor.alive,
      hasWork,
      life: actor.physicalLife ?? 0,
      death:
        actor.pendingDeath && reincarnation
          ? {
              message: reincarnation.deathText,
              at: actor.pendingDeath.at,
              corpseId: actor.pendingDeath.corpseId,
              retained: actor.pendingDeath.retained,
              left: actor.pendingDeath.left,
              retainedLabel: bodyPolicy(world)!.reincarnation!.retainedLabel,
              lostLabel: bodyPolicy(world)!.reincarnation!.lostLabel,
            }
          : null,
      scars: (reincarnation?.scars ?? [])
        .filter((scar) => actor.scars?.[scar.id])
        .map((scar) => ({
          id: scar.id,
          name: scar.name,
          description: scar.description,
          treatmentsRemaining: actor.scars![scar.id]!,
        })),
      ...(!actor.alive
        ? {
            bodyState:
              player.remains?.phase === 'removed'
                ? ('removed' as const)
                : player.remains?.phase === 'rotting'
                  ? ('rotting' as const)
                  : ('dead' as const),
          }
        : {}),
      statusEffects: projectStatusEffects(world, player, 'owner'),
      ...(bodyPolicy(world)?.evasion
        ? {
            evasion: {
              label: bodyPolicy(world)!.evasion!.label,
              readyIn: Math.max(0, (actor.evasionReadyAt ?? 0) - world.simTime),
            },
          }
        : {}),
      action: actor.action
        ? {
            id: actor.action.id,
            // Floating progress is opt-in; routine movement never gets a status.
            showStatus:
              actor.action.type === 'aim' ||
              !!actor.action.navigation ||
              (actor.action.stage === 'working' &&
                [
                  'gather',
                  'prepare',
                  'craft',
                  'assemble',
                  'cook',
                  'harvest',
                  'treat-scar',
                  'hunt',
                  'aim',
                  'shoot-once',
                  'practice-shot',
                  'coaching',
                  'strike',
                  'guard',
                  'replenish',
                  'tend-fire',
                ].includes(actor.action.type)),
            ...(actor.action.type === 'aim'
              ? {
                  detail:
                    aimDetails &&
                    [
                      BASE_RANGED_TEXT.aimDescription,
                      ...(work?.ranged?.ready ? [BASE_RANGED_TEXT.ready] : []),
                      ...aimDetails.facts.map(([name, value]) => `${name}: ${value}`),
                      aimDetails.detail,
                    ].join('; '),
                  controls: [
                    {
                      id: `release:${actor.action.id}`,
                      label: BASE_RANGED_TEXT.shootingName,
                      command: { type: 'release-shot' as const, aimId: actor.action.id },
                      enabled: !!actor.action.ranged?.ready && !paused,
                      ...(!actor.action.ranged?.ready ? { reason: BASE_RANGED_TEXT.notReady } : {}),
                    },
                    {
                      id: `cancel:${actor.action.id}`,
                      label: BASE_RANGED_TEXT.cancelName,
                      command: { type: 'cancel' as const },
                      enabled: true,
                    },
                  ],
                }
              : {}),
            durationSeconds: actor.action.totalSeconds,
            elapsedSeconds:
              actor.action.stage === 'working'
                ? actor.action.totalSeconds - actor.action.remainingSeconds
                : 0,
            advancing:
              !paused &&
              actor.action.stage === 'working' &&
              !actor.action.ranged?.ready &&
              !waitingForFeedback(world, player),
            label: actor.action.navigation
              ? 'Preparing route'
              : actor.action.assemblyPhase
                ? (world.assemblyFamilies?.[actor.action.assemblyPhase.familyId]?.labels[
                    actor.action.assemblyPhase.operation
                  ] ?? 'Working')
                : (guardWorkLabel(world, player) ?? workLabels[actor.action.type] ?? 'Working'),
            progress:
              actor.action.stage === 'approaching' || actor.action.type === 'follow'
                ? 0
                : actor.action.totalSeconds === 0
                  ? 1
                  : Math.max(
                      0,
                      Math.min(1, 1 - actor.action.remainingSeconds / actor.action.totalSeconds),
                    ),
          }
        : null,
      traits: actor.traits?.map((t) => ({ ...t })),
      memoryRevision: JSON.stringify([
        service.historyEpoch,
        service.store.memories?.actorRevision(player.id) ?? 0,
      ]),
      history: `Your time in this world began on Day 1. You have been here for ${Math.floor(world.simTime / 86400)} full days.`,
      inventory,
      inventoryRevision: player.inventoryRevision ?? 0,
      canUseInventory: canUseInventory(service, scope),
      actionAttempts: memo('player-action-attempts', [actor.agency.attempts], () =>
        actor.agency.attempts.map((attempt) => ({
          id: attempt.id,
          description: attempt.description,
          status: attempt.status,
          mode: attempt.mode,
          ...(attempt.resolution
            ? { reason: attempt.resolution.reason, category: attempt.resolution.category }
            : {}),
          ...(attempt.alternative ? { fulfillment: attempt.alternative.fulfillment } : {}),
        })),
      ),
      activity: projectActivityStatus(world, player.id),
      outings: outingViews(world, player.id),
      // Step-by-step work states are a developer view (God mode); players use Stop current
      // work and the plain answers to their own requests. Owner decision, 2026-09-29.
      work:
        service.config.godMode &&
        scope.audience === 'authorized-inspection' &&
        service.currentScope(scope, 'create')
          ? memo(
              'player-work',
              // Labels use this observer's names and encounters and learned method names.
              [
                actor.agency.plan,
                actor.agency.suspended,
                actor.action,
                observation.visibleEntities,
                world.observerIdentities?.[player.id],
                world.perceptionEpisodes?.[player.id],
                world.actionExperience.methods,
              ],
              () => projectWork(world, player.id),
            )
          : null,
      controls: playerControls,
      ...(equipment
        ? {
            equippedTargetItem: {
              id: equipment.id,
              name: world.itemDefinitions[equipment.definitionId]!.name,
            },
          }
        : {}),
      actionWording: {
        examples: [...typedRequestVocabulary(world).examples],
        placeholder: typedRequestVocabulary(world).placeholder,
      },
    },
    entities,
    communicationReferences: rememberedCommunicationSubjects(world, player.id).map(
      ({ id, label }) => ({
        id: communicationReference(scope, { id }),
        label,
      }),
    ),
    recipes: memo<GameView['recipes']>(
      'recipes',
      [
        observation.knownRecipes,
        world.moduleManifest,
        world.itemDefinitions,
        world.declarationReceipts,
        world.knowledge[player.id],
        inventory,
        active,
        paused,
      ],
      () =>
        observation.knownRecipes.map((recipe) => {
          return {
            id: recipe.id,
            ...recipeDetailsView(world, recipe, quantity),
            origin:
              recipe.provenance.source === 'authored-world'
                ? 'authored'
                : knownRecipeAttribution(world, player.id, recipe.id)!.npcCreated
                  ? 'npc'
                  : 'player',
            provenance:
              recipe.provenance.source === 'authored-world'
                ? 'Known authored method; learned through an admitted disclosure.'
                : `${recipe.provenance.source} (${recipe.provenance.model ?? 'supplied proposal'})`,
          };
        }),
    ),
    events: memo<GameView['events']>(
      'events',
      // The historical words stay fixed, but a current caption anchor can expire
      // without another event. Never memoize that body grant on history alone.
      [
        events,
        world.perceptionEvidence?.[player.id]?.current,
        world.entities,
        world.moduleManifest,
        service.timelineId,
      ],
      () =>
        events
          // Recognize legacy movement records that predate structured action types.
          .filter(isJournalEvent)
          .slice(-60)
          .map((event) =>
            publicEvent(
              event,
              selectedEventPresentation(world),
              player.id,
              JSON.stringify([world.id, `${service.timelineId}:${scopeKey(scope)}`]),
              (body) => {
                if (
                  body.entityId === player.id &&
                  body.physicalLife === (player.actor?.physicalLife ?? 0)
                )
                  return player.id;
                const entity = entityGet(world.entities, body.entityId);
                const received = entity && currentBodyObservation(world, player.id, entity.id);
                return entity &&
                  received &&
                  body.leaseId === received.id &&
                  body.physicalLife === (entity.actor?.physicalLife ?? 0)
                  ? currentContactReference(world, scope, entity)
                  : undefined;
              },
            ),
          ),
    ),
    conversation: conversationEntries.map((event) => {
      const reply = replies.get(event.id);
      const legacyIdentityFailure =
        reply?.message === 'Models cannot author identity or seed provenance.' ||
        reply?.message ===
          "Generated memories cannot change a character's fixed identity or claim to be part of their authored starting history.";
      // Only an actual failed job is a failed message. Cancellation and stale
      // work end pending UI without relabeling an interaction as a technical failure.
      // See docs/architecture.md#react-presentation-and-character-traits.
      const terminalFailure = legacyIdentityFailure || reply?.status === 'failed';
      const replyStatus = terminalFailure ? 'failed' : reply?.status;
      const replyMessage = legacyIdentityFailure
        ? "The response tried to change the character's fixed identity or treat generated material as part of their original history."
        : reply?.message;
      return {
        id: event.id,
        kind: event.type === 'speech' ? ('speech' as const) : ('action' as const),
        ...(event.data?.['mechanical'] === false ? { mechanical: false } : {}),
        ...(replyStatus && replyMessage
          ? {
              replyStatus,
              replyRequestId: reply?.id,
              retryable: reply?.status === 'failed',
              ...(['failed', 'cancelled', 'stale'].includes(replyStatus)
                ? { replyReason: replyMessage }
                : {}),
            }
          : {}),
        ...(event.actorId === scope.actorId ? { speakerId: scope.actorId } : {}),
        speech: event.speech,
        speaker: event.speech
          ? (event.speech.speaker?.nameAtTime ?? 'Someone')
          : (event.references?.find((reference) => reference.role === 'actor')?.label ?? 'Someone'),
        text:
          event.speech?.intelligibility === 'none'
            ? event.text
            : String(event.data?.['text'] ?? event.text),
        time: event.at,
      };
    }),
    ai: {
      mode: aiMode,
      jevConfigured,
      llmConfigured,
      message:
        aiMode === 'fixture'
          ? 'Injected test provider. This is not live AI acceptance evidence.'
          : aiMode === 'unconfigured'
            ? 'Configure backend AI credentials and a spending cap. Macrofold native execution also needs an owner-selected MACROFOLD_WORKER_ID; direct inference does not.'
            : (latestProblem?.message ??
              'Jev routes bounded decisions. LLMs handle conversation, reconsideration and new recipes.'),
      jobs,
      ...usage,
    },
    milestones: basePlaytestMilestones(world, scope.actorId, events).map((milestone) => ({
      ...milestone,
      done: milestone.done || milestones[milestone.id] === true,
    })),
    persistence: {
      status: storageError ? 'error' : 'saved',
      message: storageError ?? 'Saved locally; the world pauses when you leave',
    },
  };
  // Reads above can cross a correction, forgotten memory, restored world or control change.
  // Do not retain or publish an old passage (or any other private view facts) across that boundary.
  if (
    generation !== service.generation ||
    historyEpoch !== service.historyEpoch ||
    assetAuthorityGeneration !== service.assetAuthorityGeneration
  )
    throw new ViewChangedError();
  service.assertScope(scope);
  return projected;
}

function same(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>,
    b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && same(a[key], b[key]))
  );
}

function changedFields<T extends object>(previous: T, next: T): Partial<T> | undefined {
  const changed: Partial<T> = {};
  for (const key of Object.keys(next) as Array<keyof T>)
    if (next[key] !== undefined && !same(previous[key], next[key])) changed[key] = next[key];
  return Object.keys(changed).length ? changed : undefined;
}
function removedFields<T extends object>(previous: T, next: T): Array<keyof T> | undefined {
  const keys = (Object.keys(previous) as Array<keyof T>).filter(
    (key) => previous[key] !== undefined && next[key] === undefined,
  );
  return keys.length ? keys : undefined;
}

/** Public transport delta only. Authoritative/private state never enters this comparison. */
export function projectPatch(previous: GameView, next: GameView): GamePatch | null {
  if (
    previous.access?.scope !== next.access?.scope ||
    previous.access?.controlling !== next.access?.controlling ||
    previous.access?.controlledElsewhere !== next.access?.controlledElsewhere ||
    previous.worldId !== next.worldId ||
    previous.saveTimeline !== next.saveTimeline ||
    previous.schemaVersion !== next.schemaVersion ||
    previous.godMode !== next.godMode ||
    !same(previous.presentationRelease, next.presentationRelease) ||
    previous.presentationReleaseRevision !== next.presentationReleaseRevision ||
    !same(previous.inventionPolicy, next.inventionPolicy) ||
    !same(previous.godTools, next.godTools) ||
    !same(previous.vision, next.vision) ||
    !same(previous.hearing, next.hearing) ||
    !same(previous.map, next.map) ||
    // Rare operational notices reset the view instead of adding another patch field.
    !same(previous.maintenance, next.maintenance)
  )
    return null;
  const beforeEntities = new Map(previous.entities.map((entity) => [entity.id, entity]));
  const afterEntities = new Map(next.entities.map((entity) => [entity.id, entity]));
  const add: EntityView[] = [];
  const update: NonNullable<GamePatch['entities']>['update'] = [];
  for (const entity of next.entities) {
    const before = beforeEntities.get(entity.id);
    if (!before) add.push(entity);
    else if (before !== entity) {
      const set = changedFields(before, entity);
      const removed = removedFields(before, entity)?.filter((field) => field !== 'id');
      if (set || removed?.length)
        update.push({
          id: entity.id,
          ...(set ? { set } : {}),
          ...(removed?.length ? { remove: removed } : {}),
        });
    }
  }
  const remove = previous.entities
    .filter((entity) => !afterEntities.has(entity.id))
    .map((entity) => entity.id);
  const beforeOrder = previous.entities.map((entity) => entity.id);
  const afterOrder = next.entities.map((entity) => entity.id);
  const order = same(beforeOrder, afterOrder) ? undefined : afterOrder;
  const clock = changedFields(previous.clock, next.clock);
  const player = changedFields(previous.player, next.player);
  const ai = changedFields(previous.ai, next.ai);
  const removedView = (
    ['commandEpoch', 'worldEventsRevision', 'historyRevision', 'historyEpoch', 'narrator'] as const
  ).filter((key) => previous[key] !== undefined && next[key] === undefined);
  const removedClock = removedFields(previous.clock, next.clock);
  const removedPlayer = removedFields(previous.player, next.player);
  const removedAi = removedFields(previous.ai, next.ai);
  return {
    schemaVersion: 3,
    evaluationCut: next.evaluationCut,
    scope: next.access?.scope,
    ...(removedView.length || removedClock || removedPlayer || removedAi
      ? {
          remove: {
            ...(removedView.length ? { view: removedView } : {}),
            ...(removedClock ? { clock: removedClock } : {}),
            ...(removedPlayer ? { player: removedPlayer } : {}),
            ...(removedAi ? { ai: removedAi } : {}),
          },
        }
      : {}),
    ...(!same(previous.communicationReferences, next.communicationReferences)
      ? { communicationReferences: next.communicationReferences }
      : {}),
    ...(previous.commandEpoch !== next.commandEpoch ? { commandEpoch: next.commandEpoch } : {}),
    baseRevision: previous.revision,
    revision: next.revision,
    ...(previous.worldEventsRevision !== next.worldEventsRevision
      ? { worldEventsRevision: next.worldEventsRevision }
      : {}),
    ...(previous.historyRevision !== next.historyRevision
      ? { historyRevision: next.historyRevision }
      : {}),
    ...(previous.historyEpoch !== next.historyEpoch ? { historyEpoch: next.historyEpoch } : {}),
    ...(!same(previous.narrator, next.narrator) ? { narrator: next.narrator ?? null } : {}),
    ...(!same(previous.profile, next.profile) ? { profile: next.profile } : {}),
    ...(clock ? { clock } : {}),
    ...(player ? { player } : {}),
    ...(add.length || update.length || remove.length || order
      ? { entities: { add, update, remove, ...(order ? { order } : {}) } }
      : {}),
    ...(!same(previous.recipes, next.recipes) ? { recipes: next.recipes } : {}),
    ...(!same(previous.events, next.events) ? { events: next.events } : {}),
    ...(!same(previous.conversation, next.conversation) ? { conversation: next.conversation } : {}),
    ...(ai ? { ai } : {}),
    ...(!same(previous.milestones, next.milestones) ? { milestones: next.milestones } : {}),
    ...(!same(previous.persistence, next.persistence) ? { persistence: next.persistence } : {}),
  };
}
