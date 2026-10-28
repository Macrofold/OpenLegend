import { equippedItems, recognizesSubject, knowledgeDocument } from '@open-legend/domain';
import { worldClockParts, worldDayText } from '@open-legend/protocol';
import { attackSourceView } from './attack-execution-view.js';
import { perceivedOffersBetween, knownTradeLots } from '@open-legend/domain';
import { contributionWithdrawals } from './handover-actions.js';
import { localWeatherView, installedActionMeaning } from '@open-legend/domain';
import { gateUseLabel } from '@open-legend/domain';
import { assemblyPhaseLabel } from '@open-legend/domain';
import { selectedCreationProfileForWorld, entityGet, definitionPin } from '@open-legend/domain';
import { selectedEventPresentation, selectedAnimalActivity } from '@open-legend/domain';
import {
  replacementRest,
  rangedTargetAllowed,
  rangedPolicy,
  practiceDefinition,
  nativeCommandSupported,
} from '@open-legend/domain';
import { nativeCommandKind } from './native-command-kind.js';
import { outingViews } from './outing-view.js';

import { recipeDetailsView } from './recipe-view.js';
import {
  guardWorkLabel,
  BASE_GUARD_TEXT,
  BASE_RANGED_TEXT,
  nativeActivityViews,
  observedCombatActivity,
  combatRecoveryDeadline,
} from '@open-legend/domain';
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
  effectiveBodyProfile,
  activelyParticipates,
  spatialMap,
  visionFieldOfView,
} from '@open-legend/domain';
import { materialExposureView } from '@open-legend/domain';
import { assemblyView } from './construction.js';
import { namePhrase } from '@open-legend/language';
import {
  recipeFamily,
  basePlaytestMilestones,
  BASE_FAMILY_POLICY,
  preferredTargetEquipment,
} from '@open-legend/domain';
import { projectWork } from './work-view.js';
import { projectActivityStatus } from './activity-requests.js';
import { canUseInventory, inventoryItemSummary, inventoryStorageHint } from './inventory-view.js';
import {
  itemFor,
  itemsForOwner,
  namedClockTimes,
  typedRequestVocabulary,
  nativeActionIcon,
} from '@open-legend/domain';
import { exposedPlaces, worldPosition, worldSupport } from '@open-legend/domain';
import {
  commandRecoveryScopeKey,
  checkpointRecoveryScopeKey,
  privateDraftScopeKey,
  scopeKey,
  type RequestScope,
} from './authority.js';
import { observerDescription, observerName, fireFuelDescription } from '@open-legend/domain';
import { handoverOptions, itemTradeView, tradeOwnLots } from './handover-actions.js';
import { canHandleItems, offersBetween } from '@open-legend/domain';
import {
  capabilityBlocked,
  projectStatusEffects,
  statusEffectsReadToken,
} from '@open-legend/domain';
import { attackSubject, bodyPolicy } from '@open-legend/domain';
import { isConversationEvent } from '@open-legend/domain';
import { supportsManualWork } from '@open-legend/domain';
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
import { canSpeak } from '@open-legend/domain';
import type {
  ActionOption,
  EntityView,
  GamePatch,
  GameView,
  InventoryItemSummary,
} from '@open-legend/protocol';
import {
  hearsEntity,
  seesEntity,
  visionRadius,
  nearbyEntities,
  inventoryFor,
  quantityOf,
  canRecoverAtCamp,
  GOD_SPAWN_OPTIONS,
  TRAIT_BANK,
  type WorldEvent,
  type WorldState,
} from '@open-legend/domain';
import { describeEntity } from './entity-description.js';
import { entityBodyReference, contextActionRevision } from './entity-references.js';
import { itemIllustration, perceivedEncounterPreferenceBinding } from '@open-legend/domain';
import { reincarnationPolicy, scarTreatmentProblem } from '@open-legend/domain';
import type { WorldService } from './world-service.js';

/** Called only for the controlled player or an already permitted entity. Do not
 * project the world's lookup table: it can name people the observer has not met. */
function portraitArt(world: WorldState, appearance: string | undefined) {
  const portraits = world.presentation?.portraits;
  return portraits && appearance && Object.hasOwn(portraits, appearance)
    ? portraits[appearance]
    : undefined;
}

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
export const calendarFields = (world: WorldState) => {
  const { day, hour } = worldClockParts(world.simTime, world.statusEffectPolicy.clockOffsetHours);
  return {
    seconds: world.simTime,
    day,
    hour,
    offsetHours: world.statusEffectPolicy.clockOffsetHours,
    ...(world.presentation?.calendar ? { dayLabel: world.presentation.calendar.dayLabel } : {}),
  };
};

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
  const position = worldPosition(observer),
    angle = visionFieldOfView(world, observer);
  const candidates = nearbyEntities(world, position, sightRadius);
  // Membership depends on physical facts, not every entity's inventory, meters
  // or private history. Resolve current records after reusing geometric membership.
  const visibleIdsPrepared = memo(
    'visibleEntityIds',
    [
      spatialMap(world),
      world.moduleManifest,
      sightRadius,
      position.x,
      position.y,
      position.z,
      effectiveBodyProfile(world, observer).eyeHeight,
      activelyParticipates(observer),
      angle,
      angle < 2 * Math.PI ? observer.spatial.heading : undefined,
      ...candidates.flatMap((e) => {
        const p = worldPosition(e);
        return [
          e.id,
          p.x,
          p.y,
          p.z,
          effectiveBodyProfile(world, e).height,
          activelyParticipates(e),
          e.assembly?.implementation,
        ];
      }),
    ],
    () =>
      candidates
        .filter((e) => e.id !== scope.actorId && seesEntity(world, observer, e))
        .map((e) => e.id),
  );
  const visibleRecords = visibleIdsPrepared.map((id) => entityGet(world.entities, id)!);
  const observation = {
    inventory: memo(
      'ownedItems',
      [entityGet(world.entities, scope.actorId)?.inventoryRevision],
      () => inventoryFor(world, scope.actorId),
    ),
    visibleEntities: memo(
      'visibleEntities',
      [visibleIdsPrepared, ...visibleRecords],
      () => visibleRecords,
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
  const pileContents = memo(
    'pileContents',
    [
      observation.visibleEntities,
      world.objectState,
      world.itemDefinitions,
      world.entities,
      world.assemblyGeometryRevision,
      world.simTime,
    ],
    () => {
      const byOwner = new Map<string, NonNullable<EntityView['contents']>>();
      for (const pile of observation.visibleEntities.filter(
        (entity) => entity.kind === 'item-pile' || !!entity.remains,
      )) {
        for (const item of itemsForOwner(world, pile.id)) {
          const definition = world.itemDefinitions[item.definitionId]!;
          const contents = byOwner.get(item.ownerId) ?? [];
          contents.push({
            id: item.id,
            definitionId: item.definitionId,
            name: definition.name,
            quantity: item.quantity,
            portable: definition.portable === true,
            materialCondition: materialExposureView(world, item.id),
          });
          byOwner.set(item.ownerId, contents);
        }
      }
      return byOwner;
    },
  );
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
        ...(world.presentation?.introduction
          ? { introduction: world.presentation.introduction }
          : {}),
        ...(world.presentation?.crafting
          ? {
              crafting: {
                categoryLabel: world.presentation.crafting.categoryLabel,
                allLabel: world.presentation.crafting.allLabel,
                categories: world.presentation.crafting.categories,
              },
            }
          : {}),
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
      world.presentation?.itemArt,
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
  const entities: EntityView[] = observation.visibleEntities
    .filter((entity) => entity.id !== scope.actorId)
    .map((entity) =>
      memo<EntityView>(
        `entity:${entity.id}`,
        [
          entity,
          nativeValuesFor(entity.id),
          nativeValuesFor(player.id),
          // Sustained effects include their live source dependencies in the token.
          // Remains and released attacks retain their wider current readers.
          entity.remains || entity.actor?.action?.type === 'strike' ? world.entities : undefined,
          statusEffectsReadToken(world, entity),
          entity.assembly ? world.entities : undefined,
          entity.assembly ? world.simTime : undefined,
          // Recovery can count down while the body itself stays unchanged. Rebuild only
          // when the whole-second description changes, rather than on every clock tick.
          entity.actor
            ? Math.max(0, Math.ceil(combatRecoveryDeadline(world, entity) - world.simTime))
            : undefined,
          entity.assembly ? service.constructionAllowed(scope.actorId) : undefined,
          entity.assembly?.implementation === 'grounded-panel-boundary'
            ? service.gateUseReadRevision(entity.id)
            : undefined,
          world.observerIdentities?.[scope.actorId]?.[entity.id],
          entity.actor ? world.presentation?.portraits : undefined,
          entity.actor || entity.resource || entity.kind === 'item-pile' || entity.remains
            ? world.presentation?.itemArt
            : undefined,
          world.perceptionEpisodes?.[scope.actorId]?.[entity.id],
          entity.kind === 'item-pile' || entity.remains ? pileContents.get(entity.id) : undefined,
          // Fire care availability depends on the player's carried tinder, drill and fuel.
          entity.heat || entity.resource?.cast ? player.inventoryRevision : undefined,
          entity.heat ? world.foodPreparations : undefined,
          entity.resource?.cast ? world.castDefinitions : undefined,
          // Offer replies appear and disappear with pending offers between the two people.
          ...(entity.actor
            ? (() => {
                const { incoming, outgoing } = perceivedOffersBetween(
                  world,
                  scope.actorId,
                  entity.id,
                );
                return [...incoming, ...outgoing].flatMap((offer) => [
                  offer,
                  Math.max(0, Math.ceil((offer.expiresAt - world.simTime) / 60)),
                  offer.constructionUse
                    ? Math.max(
                        0,
                        Math.ceil((offer.constructionUse.terms.expiresAt - world.simTime) / 60),
                      )
                    : undefined,
                ]);
              })()
            : []),
          entity.actor ? world.socialOfferPolicy : undefined,
          entity.actor ? world.constructionProfile?.materialContributions : undefined,
          entity.actor ? knownTradeLots(world, scope.actorId, entity.id) : undefined,
          entity.actor ? player.inventoryRevision : undefined,
          // Starting/stopping work can bind a promised tool without changing its lot.
          entity.actor ? actor.action : undefined,
          actor.encounters?.pairs[entity.id],
          // Agreement and observation can change without either person's action changing.
          entity.actor ? coaching : undefined,
          // Manual action choices depend on physical form, not unrelated body conditions.
          entity.actor ? actor.body?.plan : undefined,
          entity.actor ? service.timelineId : undefined,
          world.itemDefinitions,
          active,
          paused,
          pauseReason,
          player.inventoryRevision,
          (actor.combatReadyAt ?? 0) > world.simTime,
          observation.knownRecipes,
          worldPosition(player),
          player.spatial,
          player.placement,
          world.itemHandling,
          player.statusEffects,
          world.map,
          actor.attributes,
          actor.scars,
          actor.physicalLife,
          world.participationPolicy,
          world.exitExposures?.[entity.id],
          // Only fading subjects depend on the clock. Other entity projections stay reusable.
          world.exitExposures?.[entity.id] !== undefined ? world.simTime : undefined,
          world.moduleManifest,
          world.statusEffectPolicy,
        ],
        () => {
          let values = cache.entities.get(entity.id);
          if (!values) cache.entities.set(entity.id, (values = new Map()));
          const block = memoizer({ values });
          const attributes = block(
            'attributes',
            [entity.actor, world.moduleManifest, nativeValuesFor(entity.id)],
            () => (entity.actor ? projectAttributes(world, entity, 'public') : []),
          );
          const effects = projectStatusEffects(world, entity);
          const display = observerName(world, scope.actorId, entity.id);
          const description = block(
            'description',
            [
              display.name,
              display.nameForm,
              display.indefiniteArticle,
              entity.remains,
              entity.threat?.policy,
              entity.threat?.mode,
              entity.threat?.relinquished,
              entity.actor?.action?.strikePhase,
              entity.actor?.action?.type,
              entity.resource,
              world.itemDefinitions,
              world.castDefinitions,
              entity.description,
              entity.actor?.description,
              entity.actor?.alive,
              entity.animal?.episode?.mode,
              entity.animal?.foraging?.mode,
              entity.heat,
            ],
            () => describeEntity(world, { ...entity, ...display }),
          );
          const bodySize = entity.actor
            ? block(
                'body-size',
                [
                  entity.spatial.body,
                  entity.spatial.inactiveBody,
                  entity.spatial.softFootprint,
                  entity.spatial.localPose,
                  world.moduleManifest,
                  entity.actor.alive,
                ],
                () => {
                  const profile = effectiveBodyProfile(world, entity);
                  return { width: profile.radius * 2, height: profile.height };
                },
              )
            : undefined;
          const displayName = display.name;
          const sentenceName = namePhrase(display, 'definite');
          const subjectName = namePhrase(display, 'definite', { capitalize: true });
          const controls: ActionOption[] = [];
          // Existing agreements stay directly answerable without preparing possible new work.
          if (
            coaching &&
            entity.actor &&
            [coaching.learnerId, coaching.coachId].includes(entity.id)
          )
            for (const option of competenceOptions(world, scope.actorId, entity, [])) {
              const preview = service.previewCommand(option.command, scope);
              controls.push(
                action(option.id, option.label, option.command, preview.ok, preview.message),
              );
            }
          if (entity.actor)
            for (const option of handoverOptions(
              world,
              scope.actorId,
              observation.inventory,
              entity,
              { offers: false },
            )) {
              const preview = service.previewCommand(option.command, scope);
              controls.push(
                action(option.id, option.shortLabel, option.command, preview.ok, preview.message),
              );
            }
          const speechCapable = canSpeak(entity);
          // Speaking selects a recipient; that person's hearing, language, memory
          // and ability to answer do not authorize the speaker's own vocal action.
          const talkUnavailableReason = !entity.actor
            ? undefined
            : !entity.actor.alive
              ? `${subjectName} is no longer an available recipient.`
              : !canSpeak(player) || capabilityBlocked(world, player, 'speech')
                ? 'Your character cannot speak now.'
                : undefined;
          const kind: EntityView['kind'] = entity.practiceTarget
            ? 'practice-target'
            : entity.kind === 'item-pile'
              ? 'item-pile'
              : entity.remains
                ? 'remains'
                : entity.animal
                  ? 'animal'
                  : entity.actor
                    ? 'actor'
                    : entity.resource || entity.kind === 'resource'
                      ? 'resource'
                      : 'station';
          const installedControls = controls.filter((option) =>
            nativeCommandSupported(world, nativeCommandKind(option.command.type)),
          );
          return {
            id: entity.id,
            ...(entity.assembly
              ? {
                  ...(entity.assembly.implementation === 'grounded-panel-boundary'
                    ? { actionRevision: service.gateUseReadRevision(entity.id) }
                    : {}),
                  assembly: assemblyView(
                    world,
                    entity.id,
                    service.constructionAllowed(scope.actorId),
                    scope.actorId,
                  ),
                }
              : {}),
            ...display,
            ...(entity.actor &&
            recognizesSubject(world, scope.actorId, entity.id) &&
            world.observerIdentities?.[scope.actorId]?.[entity.id]
              ? {
                  identity: {
                    ...(world.observerIdentities[scope.actorId]![entity.id]!.givenName
                      ? {
                          knownName: world.observerIdentities[scope.actorId]![entity.id]!.givenName,
                        }
                      : {}),
                    ...(world.observerIdentities[scope.actorId]![entity.id]!.nickname
                      ? { nickname: world.observerIdentities[scope.actorId]![entity.id]!.nickname }
                      : {}),
                    revision: world.observerIdentities[scope.actorId]![entity.id]!.revision,
                  },
                }
              : {}),
            icon: entity.resource
              ? world.itemDefinitions[entity.resource.definitionId]?.icon
              : entity.icon,
            ...(entity.resource
              ? { art: itemIllustration(world, entity.resource.definitionId) }
              : {}),
            storage: inventoryStorageHint(service, scope, entity.id),
            ...(entity.kind === 'item-pile' || entity.remains
              ? { contents: pileContents.get(entity.id) ?? [] }
              : {}),
            description,
            ...(entity.actor?.traits ? { traits: entity.actor.traits.map((t) => ({ ...t })) } : {}),
            kind,
            subtype: entity.actor?.species ?? entity.resource?.definitionId ?? entity.kind,
            position: worldPosition(entity),
            supportSurfaceId: worldSupport(entity),
            heading: entity.spatial.heading,
            appearance: entity.appearance ?? 'sprite',
            ...(entity.actor ? { portrait: portraitArt(world, entity.appearance) } : {}),
            ...(entity.heat ? { heat: { lit: entity.heat.lit } } : {}),
            radius: bodySize ? bodySize.width / 2 : entity.kind === 'campfire' ? 0.5 : 0.35,
            contextActionRevision: contextActionRevision(
              scopeKey(scope),
              world,
              player,
              entity,
              perceivedEncounterPreferenceBinding(world, player, entity),
            ),
            ...(entity.actor
              ? {
                  bodySize,
                }
              : {}),
            ...(entity.actor?.body ? { bodyPlan: entity.actor.body.plan } : {}),
            ...(world.exitExposures?.[entity.id] !== undefined &&
            world.participationPolicy?.exitExposureSeconds
              ? {
                  departureProgress: Math.max(
                    0,
                    Math.min(
                      1,
                      1 -
                        (world.exitExposures[entity.id]! - world.simTime) /
                          world.participationPolicy.exitExposureSeconds,
                    ),
                  ),
                }
              : {}),
            ...(entity.actor
              ? {
                  speechCapable,
                  canTalk: !talkUnavailableReason,
                  talkRequiresAi: entity.actor.controller === 'npc',
                  ...(talkUnavailableReason ? { talkUnavailableReason } : {}),
                }
              : {}),
            statusEffects: effects,
            actionAnimation: actionAnimation(world, entity),
            status: entity.actor
              ? !entity.actor.alive
                ? ((entity.remains?.phase === 'rotting'
                    ? bodyPolicy(world)?.remains?.rottingLabel
                    : bodyPolicy(world)?.remains?.freshLabel) ?? '')
                : (observedCombatActivity(world, player, entity) ??
                  (effects.length
                    ? effects.map((d) => d.label).join(', ')
                    : entity.actor.action
                      ? ({
                          feed: installedActionMeaning(world, 'feed')?.label,
                          'operate-gate': undefined,
                          'impact-boundary':
                            entity.actor.action.boundaryImpact &&
                            world.assemblyFamilies?.[
                              entity.actor.action.boundaryImpact.intent.familyId
                            ]?.implementation === 'grounded-panel-boundary'
                              ? (
                                  world.assemblyFamilies[
                                    entity.actor.action.boundaryImpact.intent.familyId
                                  ] as import('@open-legend/domain').GroundedPanelFamily
                                ).damage?.label
                              : undefined,
                          assemble: entity.actor.action.assemblyPhase
                            ? assemblyPhaseLabel(world, entity.actor.action.assemblyPhase)
                            : undefined,
                          'place-hearth':
                            world.hearthDefinitions?.[
                              entity.actor.action.hearthWork?.definition.id ?? ''
                            ]?.actionLabel,
                          guard: BASE_GUARD_TEXT.activityLabel,
                          pickup: 'Picking up items',
                          move: 'Walking',
                          evade: bodyPolicy(world)?.evasion?.label,
                          follow: 'Following',
                          replenish:
                            attributeDefinition(world, entity.actor.action.attributeId ?? '')
                              ?.reservoir?.actionLabel ?? 'Working',
                          gather: 'Gathering',
                          'status-effect': 'Active state',
                          hunt: rangedPolicy(world)?.activityLabel,
                          aim: BASE_RANGED_TEXT.aimingLabel,
                          'shoot-once': BASE_RANGED_TEXT.shootingLabel,
                          'practice-shot': practiceDefinition(
                            world,
                            entity.actor.action.competencePin?.id ?? '',
                          )?.practice?.presentation.practiceActivityLabel,
                          coaching: practiceDefinition(
                            world,
                            entity.actor.action.competencePin?.id ?? '',
                          )?.practice?.presentation.coachingActivityLabel,
                          strike: 'Striking',
                          harvest: 'Harvesting',
                          cook: 'Cooking',
                          fish: 'Fishing',
                          'tend-fire': 'Tending a fire',
                          'treat-scar': 'Treating an injury',
                          craft: 'Crafting',
                        }[entity.actor.action.type] ?? 'Working')
                      : entity.threat
                        ? ''
                        : entity.animal
                          ? selectedAnimalActivity(world, entity).status
                          : 'Watching the surroundings'))
              : entity.animal
                ? selectedAnimalActivity(world, entity).status
                : entity.remains
                  ? entity.remains.harvested
                    ? 'Harvested'
                    : 'Fresh remains'
                  : entity.heat
                    ? entity.heat.lit
                      ? `Lit, cooking heat; ${fireFuelDescription(entity.heat)}`
                      : `Cold; ${fireFuelDescription(entity.heat)}`
                    : entity.replenisher
                      ? `${Math.round(entity.replenisher.remaining)} units of supply`
                      : entity.kind === 'item-pile'
                        ? `${pileContents.get(entity.id)?.length ?? 0} item stack${pileContents.get(entity.id)?.length === 1 ? '' : 's'}`
                        : entity.resource
                          ? entity.resource.cast
                            ? entity.resource.quantity > 0
                              ? world.castDefinitions[entity.resource.cast.definitionId]!
                                  .availableText
                              : world.castDefinitions[entity.resource.cast.definitionId]!
                                  .exhaustedText
                            : 'Gatherable'
                          : '',
            ...(entity.resource && !entity.resource.cast
              ? { quantity: entity.resource.quantity }
              : {}),
            ...(entity.actor
              ? {
                  attributes,
                  ...(attributes.some((attribute) => attribute.bodyHealth)
                    ? { health: entity.actor.health }
                    : {}),
                  bodyRevision: entity.actor.body?.revision,
                  bodyReference: entityBodyReference(scopeKey(scope), entity),
                  ...(!entity.actor.alive
                    ? {
                        bodyState:
                          entity.remains?.phase === 'rotting'
                            ? ('rotting' as const)
                            : ('dead' as const),
                      }
                    : {}),
                  species: entity.actor.species,
                  ...(world.socialOfferPolicy && entity.actor.alive && canHandleItems(world, entity)
                    ? {
                        trade: itemTradeView(
                          world,
                          scope.actorId,
                          memo(
                            'tradeOwnLots',
                            [
                              observation.inventory,
                              world.itemDefinitions,
                              world.presentation?.itemArt,
                            ],
                            () => tradeOwnLots(world, observation.inventory),
                          ),
                          entity,
                          JSON.stringify([privateDraftScopeKey(scope), service.timelineId]),
                          installedControls,
                        ),
                      }
                    : {}),
                }
              : {}),
            ...(installedControls.length ? { controls: installedControls } : {}),
          };
        },
      ),
    );
  const events = memo(
    'visibleEvents',
    [world.events, world.experience?.awareness[scope.actorId]],
    () => {
      const awareness = world.experience?.awareness[scope.actorId];
      const visible = (awareness ?? [])
        .slice(-512)
        .reverse()
        .flatMap((entry) => {
          const event = service.worldEvent(entry.eventId);
          return event ? [projectEventEvidence(event, entry)] : [];
        });
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
        service.currentScope(scope, 'inspect') ? undefined : scope.actorId,
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
          : service.config.authentication.mode === 'local' &&
            (!job.request.invention || job.request.invention.actorId === scope.actorId),
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
  const conversationEntries = events.filter((event) => isConversationEvent(event)).slice(-30);
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
    hasWork && paused ? service.previewCommand({ type: 'cancel' }, scope) : undefined;
  const playerControls = [
    action(
      'cancel',
      'Stop all work',
      { type: 'cancel' },
      hasWork && (pausedStop?.ok ?? true),
      pausedStop?.message ?? 'No work to stop.',
    ),
  ];
  for (const option of contributionWithdrawals(
    world,
    scope.actorId,
    service.store.authority!.constructionPermissions(world.id),
  )) {
    const checked = service.previewCommand(option.command, scope);
    playerControls.push(
      action(option.id, option.label, option.command, checked.ok, checked.message),
    );
  }
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
  const workTargetId = work?.ranged ? attackSubject(work)?.id : work?.targetId;
  const aimDetails =
    work?.type === 'aim'
      ? attackDetails({
          id: work.id,
          actorId: scope.actorId,
          type: 'aim',
          targetId: workTargetId,
          ...(work.ranged?.aimPoint ? { aimPoint: work.ranged.aimPoint } : {}),
          weaponItemId: work.weaponItemId,
          ammoItemId: work.ammoItemId,
        })
      : undefined;

  const targetName =
    workTargetId &&
    observation.visibleEntities.some((entity) => entity.id === workTargetId) &&
    observerName(world, player.id, workTargetId).name;
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
    craft: `Crafting${work?.recipeId && world.recipes[work.recipeId] ? ` ${world.recipes[work.recipeId]!.outputs.map((output) => world.itemDefinitions[output.definition.id]!.name).join(', ')}` : ''}`,
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
  const placesRevision =
    service.store.memories?.knownPlacesRevision(player.id) ?? service.generation;
  const presentationRelease = await service.presentationReleaseFor(scope);
  const projected: GameView = {
    schemaVersion: 3,
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
    ...(world.presentation?.mapArt
      ? {
          cartography: memo<NonNullable<GameView['cartography']>>(
            'cartography',
            [
              world.presentation.mapArt,
              world.knowledgePolicy,
              world.mapMarkers?.[player.id],
              world.actorKnowledge?.[player.id],
              world.knowledgeRevisions?.[player.id],
              placesRevision,
            ],
            () => {
              const art = world.presentation!.mapArt!;
              return {
                art: { path: art.path, bounds: { ...art.bounds }, northDegrees: art.northDegrees },
                revision: world.knowledgeRevisions?.[player.id] ?? 0,
                placesRevision,
                maxMarkers: art.maxMarkers,
                labelCharacters: art.labelCharacters,
                ...(world.knowledgePolicy
                  ? { noteCharacters: world.knowledgePolicy.maxCharacters.subject }
                  : {}),
                markerIcons: art.markerIcons.map((icon) => ({ ...icon })),
                markers: Object.values(world.mapMarkers?.[player.id] ?? {}).map((marker) => {
                  const note = knowledgeDocument(world, player.id, marker.id, 'map-marker');
                  return {
                    ...marker,
                    note: { text: note?.text ?? '', revision: note?.revision ?? 0 },
                  };
                }),
              };
            },
          ),
        }
      : {}),
    saveTimeline: service.timelineId,
    commandEpoch: service.commandEpoch,
    godMode: service.config.godMode && service.currentScope(scope, 'create'),
    inventionPolicy: {
      revision: world.inventionPolicy.revision,
      playerLocked: world.inventionPolicy.playerLocked,
      agentLocked: world.inventionPolicy.agentLocked,
    },
    ...(service.config.godMode && service.currentScope(scope, 'create')
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
      weather: localWeatherView(world, worldPosition(player)),
      ...(world.presentation?.daylight
        ? {
            daylight: {
              startHour:
                world.statusEffectPolicy.namedTimes[world.presentation.daylight.startTime]!,
              endHour: world.statusEffectPolicy.namedTimes[world.presentation.daylight.endTime]!,
              noonElevationDegrees: world.presentation.daylight.noonElevationDegrees,
            },
          }
        : {}),
      ...calendarFields(world),
      speed: speed,
      baseRatio: service.config.baseRatio,
      paused: paused,
      pauseReason: pauseReason,
      preparingNavigation: navigationBlocked(world),
      namedTimes: namedClockTimes(world),
    },
    player: {
      knowledgeRevision: world.knowledgeRevisions?.[player.id] ?? 0,
      appearance: player.appearance ?? 'sprite',
      portrait: portraitArt(world, player.appearance),
      participation: actor.participation?.phase ?? 'active',
      departureNotice: world.participationPolicy?.exitDescription,
      id: player.id,
      name: player.name,
      nameForm: player.nameForm,
      indefiniteArticle: player.indefiniteArticle,
      position: worldPosition(player),
      supportSurfaceId: worldSupport(player),
      heading: player.spatial.heading,
      bodySize: {
        width: effectiveBodyProfile(world, player).radius * 2,
        height: effectiveBodyProfile(world, player).height,
      },
      attributes: projectAttributes(world, player, 'owner').filter(
        (attribute) => !attributeDefinition(world, attribute.id)?.practice,
      ),
      practice,
      actionAnimation: actionAnimation(world, player),
      alive: actor.alive,
      ...(service.currentScope(scope, 'play', true)
        ? { inputScope: service.inputScope(scope) }
        : {}),
      ...(actor.attackModeNotice ? { attackModeNotice: actor.attackModeNotice } : {}),
      ...(actor.alive
        ? { attackSource: attackSourceView(world, player.id, observation.inventory) }
        : {}),
      hasWork,
      life: actor.physicalLife ?? 0,
      death:
        actor.pendingDeath && reincarnation
          ? {
              message: reincarnation.deathText,
              freshWorldReview:
                service.config.godMode &&
                service.currentScope(scope, 'create') &&
                service.currentScope(scope, 'inspect') &&
                !!selectedCreationProfileForWorld(world).recoveryOpeningId &&
                !!service.config.creation.installationId &&
                service.config.creation.targets.some((target) =>
                  target.allowedCreatorAccountIds.includes(scope.accountId),
                ),
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
            ...(actor.action.attackExecution
              ? { execution: service.executionView(player.id) }
              : {}),
            // Floating progress is opt-in; routine movement never gets a status.
            showStatus:
              actor.action.type === 'aim' ||
              !!actor.action.navigation ||
              (actor.action.stage === 'working' &&
                [
                  'gather',
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
                      command: { type: 'cancel' as const, expectedActionId: actor.action.id },
                      enabled: true,
                    },
                  ],
                }
              : {}),
            ...(actor.action.attackExecution
              ? {
                  controls: [
                    {
                      id: `release:${actor.action.id}`,
                      label: 'Attack normally',
                      command:
                        actor.action.type === 'aim'
                          ? { type: 'release-shot' as const, aimId: actor.action.id }
                          : { type: 'release-strike' as const, expectedActionId: actor.action.id },
                      enabled: actor.action.attackExecution.ready && !paused,
                    },
                    {
                      id: `cancel:${actor.action.id}`,
                      label: 'Cancel',
                      command: { type: 'cancel' as const, expectedActionId: actor.action.id },
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
              : actor.action.gateWork
                ? gateUseLabel(world, actor.action.gateWork.intent)
                : actor.action.assemblyPhase
                  ? assemblyPhaseLabel(world, actor.action.assemblyPhase)
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
      // Two finite presentation substitutions preserve the world's authored self
      // description. Elapsed whole intervals use zero offset, unlike date labels.
      ...(world.presentation?.calendar?.historyTemplate
        ? {
            history: world.presentation.calendar.historyTemplate
              .replaceAll(
                '{startDay}',
                worldDayText(
                  worldClockParts(0, world.statusEffectPolicy.clockOffsetHours).day,
                  world.presentation.calendar.dayLabel,
                ),
              )
              .replaceAll('{elapsedDays}', String(worldClockParts(world.simTime, 0).day - 1)),
          }
        : {}),
      inventory,
      equipmentPorts: memo(
        'equipment-ports',
        [
          actor.body?.equipmentPorts,
          player.inventoryRevision,
          world.itemDefinitions,
          world.presentation?.itemArt,
        ],
        () => {
          const attached = equippedItems(world, player.id);
          return (actor.body?.equipmentPorts ?? []).map((port) => {
            const item = attached.find((item) =>
              world.itemDefinitions[item.definitionId]!.equipment!.ports.includes(port.id),
            );
            const definition = item && world.itemDefinitions[item.definitionId]!;
            return {
              ...port,
              ...(item && definition
                ? {
                    item: {
                      id: item.id,
                      name: definition.name,
                      art: itemIllustration(world, item.definitionId),
                      ...(definition.icon ? { icon: definition.icon } : {}),
                    },
                  }
                : {}),
            };
          });
        },
      ),
      inventoryRevision: player.inventoryRevision ?? 0,
      constructionRevision: service.constructionReadRevision(player.id),
      workBatchRevision: world.workBatchPolicy
        ? JSON.stringify([definitionPin(world.workBatchPolicy), world.moduleManifest.bodyPolicyPin])
        : undefined,
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
        service.config.godMode && service.currentScope(scope, 'create')
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
    recipes: memo<GameView['recipes']>(
      'recipes',
      [
        observation.knownRecipes,
        world.presentation,
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
    events: memo<GameView['events']>('events', [events], () =>
      events
        // Recognize legacy movement records that predate structured action types.
        .filter(isJournalEvent)
        .slice(-60)
        .map((event) => publicEvent(event, selectedEventPresentation(world), player.id)),
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
        speakerId: event.actorId,
        speech: event.speech,
        speaker: event.speech
          ? (event.speech.speaker?.nameAtTime ?? 'Someone')
          : event.actorId
            ? observerDescription(world, scope.actorId, event.actorId)
            : 'Someone',
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
    [
      'commandEpoch',
      'worldEventsRevision',
      'historyRevision',
      'historyEpoch',
      'narrator',
      'cartography',
    ] as const
  ).filter((key) => previous[key] !== undefined && next[key] === undefined);
  const removedClock = removedFields(previous.clock, next.clock);
  const removedPlayer = removedFields(previous.player, next.player);
  const removedAi = removedFields(previous.ai, next.ai);
  return {
    schemaVersion: 3,
    scope: next.access?.scope,
    ...(!same(previous.cartography, next.cartography) ? { cartography: next.cartography } : {}),
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
