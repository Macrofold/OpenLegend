import {
  memoizer,
  optional,
  permittedPlayerJobs,
  projectPlayerJobs,
  playerUsageFallback,
  projectPlayerAi,
  playerSpeechJobIds,
  ViewChangedError,
} from './player-view-async.js';
export { ViewChangedError } from './player-view-async.js';
import {
  PLAYER_EVENT_WINDOW,
  isPlayerJournalEvent,
  boundPlayerEvents,
} from './player-events-view.js';
import {
  playerCalendarFields,
  projectPlayerPresentation,
  projectPlayerCartography,
  projectPlayerClock,
  playerHistoryText,
} from './player-world-view.js';
import {
  nativeText,
  selectedTemporalPolicy,
  selectedObservedBodyKind,
  selectedPlayerViewRules,
  selectedPlayerWorkLabels,
} from '@open-legend/domain';
import {
  canSpeak,
  equippedItems,
  knowledgeDocument,
  currentBodySubject,
  currentSightConfirmedThrough,
  observerIndividual,
  bodyEligibilityRevision,
  availableItemQuantity,
  currentInventoryInspection,
  entityChangesBetween,
  custodian,
} from '@open-legend/domain';
import { receivedEventAccounts } from './received-event-accounts.js';
import { attackSourceView } from './attack-execution-view.js';
import { contributionWithdrawals } from './handover-actions.js';
import { localWeatherView, installedActionMeaning } from '@open-legend/domain';
import { gateUseLabel } from '@open-legend/domain';
import { assemblyPhaseLabel } from '@open-legend/domain';
import { selectedCreationProfileForWorld, definitionPin } from '@open-legend/domain';
import {
  currentBodyGrant,
  prepareCurrentBodyReadScope,
  countDomainWork,
  currentObservedBodyIds,
  activelyParticipates,
  currentObservedFacetValues,
  hasCurrentObservedFacet,
  rememberedCommunicationSubjects,
  currentCommunicationSubject,
} from '@open-legend/domain';
import {
  currentContactReference,
  communicationReference,
  projectCommandContactReferences,
  projectObservedAssembly,
  perceivedParticipantReferences,
} from './public-contact-references.js';
import { permittedSourceHandle, evidenceSourceHandle } from './entity-references.js';
import { entityGet } from '@open-legend/domain';
import { selectedEventPresentation } from '@open-legend/domain';
import { outingViews } from './outing-view.js';

import { recipeDetailsView } from './recipe-view.js';
import { guardWorkLabel, BASE_RANGED_TEXT, nativeActivityViews } from '@open-legend/domain';
import { waitingForFeedback } from './competence-actions.js';
import { ownPractice, coachingFor, occurrenceFor, type PracticeView } from '@open-legend/domain';
import { effectiveBodyProfile, visionFieldOfView } from '@open-legend/domain';
import {
  BASE_PLAYTEST_MILESTONES,
  BASE_FAMILY_POLICY,
  preferredTargetEquipment,
} from '@open-legend/domain';
import { projectWork } from './work-view.js';
import { projectActivityStatus } from './activity-requests.js';
import { canUseInventory, inventoryItemBinding, inventoryStorageHint } from './inventory-view.js';
import { namedClockTimes, typedRequestVocabulary, nativeActionIcon } from '@open-legend/domain';
import { exposedPlaces, worldPosition, worldSupport } from '@open-legend/domain';
import {
  commandRecoveryScopeKey,
  checkpointRecoveryScopeKey,
  privateDraftScopeKey,
  scopeKey,
  type RequestScope,
} from './authority.js';
import { observerDescription, observerName } from '@open-legend/domain';
import { tradeDefinitionsRevisionFor, tradeReaderRevisionFor, tradeSummary } from './trade-view.js';
import { rememberedTradeDisclosureIndex } from '@open-legend/domain';
import { capabilityBlocked, projectStatusEffects } from '@open-legend/domain';
import { attackSubject, bodyPolicy } from '@open-legend/domain';
import { isConversationEvent } from '@open-legend/domain';

import { actionAnimation } from './action-animation.js';
import {
  hydratePlayerPractice,
  projectPlayerAction,
  projectPlayerAttempts,
  projectPlayerEquipment,
  projectPlayerBody,
  projectPlayerControl,
  projectRecoveryControl,
  projectRespawnControl,
  playerHasWork,
} from './player-self-view.js';
import {
  knownRecipeAttribution,
  navigationBlocked,
  projectEventEvidence,
  hearingReferenceRadius,
  perceptionGuide,
  type ActorEvent,
} from '@open-legend/domain';
import { projectConversationEvent, publicEvent } from './perceived-events.js';
import {
  projectObservedEntity,
  projectObservedAppearance,
  projectObservedCommunication,
} from './observed-body-view.js';
import { projectAttributes, attributeDefinition } from '@open-legend/domain';

import type {
  ActionOption,
  EntityView,
  GamePatch,
  GameView,
  InventoryItemBinding,
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

interface ViewCache {
  scope: RequestScope;
  values: Map<string, { deps: unknown[]; value: unknown }>;
  sections: Map<string, { token: unknown; value?: unknown }>;
  entities: Map<string, Map<string, { deps: unknown[]; value: unknown }>>;
  eventChunks: import('./received-event-accounts.js').ReceivedEventAccountIndex;
  inventoryDetails?: {
    entities: WeakRef<WorldState['entities']>;
    contents: number | undefined;
    revision: number;
  };
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
      (cache = {
        scope,
        values: new Map(),
        sections: new Map(),
        entities: new Map(),
        eventChunks: new Map(),
      }),
    );
  }
  return cache;
}
/** Item attributes can change without changing contents membership. Follow the
 * existing exact native delta, not every world's item or only the HUD's first page.
 * The weak baseline keeps this derived hint from retaining an old world. */
function ownedInventoryDetailRevision(
  cache: ViewCache,
  world: WorldState,
  actorId: string,
  revision: number,
): number {
  const previous = cache.inventoryDetails,
    before = previous?.entities.deref(),
    contents = entityGet(world.entities, actorId)?.inventoryRevision;
  let changed = !previous || contents !== previous.contents;
  if (!changed && before !== world.entities) {
    const ids = before && entityChangesBetween(before, world.entities);
    changed =
      !ids ||
      [...ids].some((id) => {
        const entity = entityGet(world.entities, id);
        // Removed/retired rows are rare and require a conservative refresh;
        // ordinary foreign actor/item movement never scans this inventory.
        return (
          !entity || !!entity.retirement || (!!entity.item && custodian(world, id) === actorId)
        );
      });
  }
  const selected = changed ? revision : previous!.revision;
  cache.inventoryDetails = { entities: new WeakRef(world.entities), contents, revision: selected };
  return selected;
}
/** Calendar projection shared by embodied views and the characterless operations view. */
export const calendarFields = (world: WorldState) => {
  return playerCalendarFields(
    world.simTime,
    world.statusEffectPolicy.clockOffsetHours,
    world.presentation?.calendar,
  );
};

const publicDetailKinds = ['pile-contents', 'carried', 'public-attributes'] as const;

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
  const sectionRevision = (key: string, deps: unknown[]) => memo(key, deps, () => revision);
  const paused = service.paused;
  const pauseReason = service.pauseReason;
  const speed = service.speed;
  const milestones = service.milestonesFor(scope.actorId);
  const storageError = service.storageError;
  const telemetryRevision = service.telemetryRevision;
  const player = entityGet(world.entities, scope.actorId)!;
  const currentEvidence = world.perceptionEvidence?.[scope.actorId];
  // Current membership and historical-role links must share the grant owner's
  // inputs. Geometry can invalidate a lease without changing its stored contact.
  const currentBodyInputs = [
    world.entities,
    world.moduleManifest,
    world.statusEffectPolicy,
    currentEvidence?.current,
    currentEvidence?.visualConfirmation,
    currentEvidence?.life,
    currentEvidence?.observer?.physicalLife,
    world.sensory,
    capabilityBlocked(world, player, 'perception'),
  ];
  // One synchronous permission/body read covers membership, grant witnesses and
  // presentation. It is released before practice or any other asynchronous read.
  let bodyReads = prepareCurrentBodyReadScope(world, scope.actorId);
  const observation = {
    inventory: memo(
      'ownedItems',
      [entityGet(world.entities, scope.actorId)?.inventoryRevision],
      () => inventoryFor(world, scope.actorId),
    ),
    visibleEntities: memo('visibleEntities', currentBodyInputs, () =>
      (bodyReads ? currentObservedBodyIds(world, scope.actorId, bodyReads) : []).flatMap((id) => {
        const entity = entityGet(world.entities, id);
        return entity ? [entity] : [];
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
  const sightConfirmedThrough = currentSightConfirmedThrough(world, player.id);
  // The receiver's actual completed sample is shared transport metadata. Unequal
  // detail times stay explicit; the world clock can never fill a missing sample.
  const detailTime = (at: number) => (at === sightConfirmedThrough ? undefined : at);
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
      return projectPlayerPresentation(world.presentation, nearest?.label);
    },
  );
  const actor = player.actor!;
  const playerViewRules = selectedPlayerViewRules(world);
  const isJournalEvent = (event: ActorEvent) => isPlayerJournalEvent(event, playerViewRules);
  const practiceAttributeIds = memo(
    'practiceAttributeIds',
    [world.moduleManifest],
    () =>
      new Set(
        world.moduleManifest.definitions
          .filter((definition) => definition.practice)
          .map((definition) => definition.id),
      ),
  );
  const observerLife = actor.physicalLife ?? 0;
  const observerParticipating = activelyParticipates(player);
  // Capture only body roles this view exposes. Exact grant continuity permits
  // ordinary movement while an async reader waits, but never a lost/replaced body.
  const bodyGrants = observation.visibleEntities.map((entity) => ({
    id: entity.id,
    grant: currentBodyGrant(world, scope.actorId, entity.id, bodyReads)!,
  }));
  const generation = service.generation;
  const historyEpoch = service.historyEpoch;
  const quantity = (definitionId: string) => quantityOf(world, player.id, definitionId);
  const active =
    actor.participation?.phase !== 'inactive' &&
    !paused &&
    actor.alive &&
    !actor.incapacitated &&
    service.currentScope(scope, 'play', true);
  const action = (
    id: string,
    label: string,
    command: ActionOption['command'],
    possible: boolean,
    reason?: string,
  ): ActionOption =>
    projectPlayerControl(
      { id, label, command, possible, reason },
      {
        profile: world.profile,
        active,
        controlling: service.currentScope(scope, 'play', true),
        paused,
      },
    );
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
  const equippedInventory = memo(
    'equippedInventory',
    [actor.body?.equipmentPorts, player.inventoryRevision, world.itemDefinitions],
    () => equippedItems(world, player.id),
  );
  const inventoryItems = memo('inventoryItems', [observation.inventory], () =>
    observation.inventory.slice(0, 60),
  );
  const ownedDetailsRevision = observation.inventory.length
    ? ownedInventoryDetailRevision(cache, world, player.id, revision)
    : player.inventoryRevision;
  const ownedInventoryRecords = memo(
    'ownedInventoryRecords',
    [observation.inventory, ownedDetailsRevision],
    () => {
      const next = observation.inventory.map((item) => entityGet(world.entities, item.id)!);
      const previous = cache.values.get('ownedInventoryRecords')?.value as typeof next | undefined;
      // Lost weak lineage requires a full owned-item check, not a fictional
      // detail change when those exact records still agree.
      return previous?.length === next.length && next.every((record, i) => record === previous[i])
        ? previous
        : next;
    },
  );
  const inspection = currentInventoryInspection(world, player.id);
  const inspectedRecords = [...new Set([...(inspection?.itemIds ?? []), inspection?.containerId])]
    .filter((id): id is string => !!id)
    .flatMap((id) => entityGet(world.entities, id) ?? []);
  const inventoryRecords = memo(
    'inventoryDetailRecords',
    [ownedInventoryRecords, ...inspectedRecords],
    () => [...ownedInventoryRecords, ...inspectedRecords],
  );
  const declaredHolders = memo('declaredInventoryHolders', [inventoryRecords], () => [
    ...new Set(inventoryRecords.flatMap((record) => record.declaredOwner?.holderId ?? [])),
  ]);
  // Only the permitted label of a relevant declared holder can change this
  // detail. Unrelated body movement must not fan out opened inventory reads.
  const declaredHolderNames = declaredHolders.map((id) =>
    observerDescription(world, scope.actorId, id),
  );
  const materialInventory = memo(
    'materialInventory',
    [inventoryRecords, world.itemDefinitions],
    () =>
      inventoryRecords.some(
        (record) =>
          record.item && world.itemDefinitions[record.item.definitionPin.id]?.assemblyMaterial,
      ),
  );
  const bindingDependencies = [
    observation.inventory,
    player.inventoryRevision,
    actor.body?.equipmentPorts,
    world.resourceReservations,
    world.itemDefinitions,
    world.presentation?.itemArt,
  ];
  const inventory = memo<InventoryItemBinding[]>('inventory', bindingDependencies, () =>
    inventoryItems.map((item) => inventoryItemBinding(service, scope, item)),
  );
  // Open readers need to know that their facts changed, not receive sixty
  // prepared comparisons/methods/exposure reads in every ordinary publication.
  const inventoryBindingRevision = sectionRevision('inventoryBindingRevision', bindingDependencies);
  const inventoryDetailRevision = sectionRevision('inventoryDetailRevision', [
    observation.inventory,
    inventoryRecords,
    ...declaredHolderNames,
    materialInventory ? world.finiteRain : undefined,
    materialInventory ? world.simTime : undefined,
    materialInventory ? world.assemblyFamilies : undefined,
    materialInventory ? world.assemblyGeometryRevision : undefined,
    materialInventory ? world.dailyRainDefinitions : undefined,
    materialInventory ? world.constructionProfile : undefined,
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
  ]);
  const inventoryDisclosureRevision = memo(
    'inventoryDisclosureRevision',
    [inspection, world.experience?.privacyRevisions?.[player.id], service.historyEpoch],
    () =>
      permittedSourceHandle(world, player.id, [
        'inventory-disclosure',
        inspection,
        world.experience?.privacyRevisions?.[player.id],
        service.historyEpoch,
      ]),
  );
  const inventoryReadRevision = memo(
    'inventoryReadRevision',
    [inventoryBindingRevision, inventoryDetailRevision, inventoryDisclosureRevision],
    () => ({
      bindings: inventoryBindingRevision,
      details: inventoryDetailRevision,
      disclosure: inventoryDisclosureRevision,
    }),
  );
  // The current-channel producer owns measured values. Publication consumes its
  // frozen facets and does not rerun sight or fill missing detail from an Entity.
  const attention = world.perceptionEvidence?.[player.id]?.attention;
  const { keys: attentionKeys, preferences: attentionPreferences } = memo(
    'attentionPreferences',
    [attention?.annotations, attention?.explicit],
    () => ({
      keys: new Map(
        Object.entries(attention?.annotations ?? {}).map(([key, candidate]) => [
          candidate.sourceId,
          key,
        ]),
      ),
      preferences: new Set(attention?.explicit ?? []),
    }),
  );
  const tradeDefinitions = memo(
    'tradeDefinitions',
    [
      world.itemDefinitions,
      world.presentation?.itemArt,
      world.itemHandling,
      world.constructionProfile,
    ],
    () =>
      tradeDefinitionsRevisionFor(world.id, player.id, {
        itemDefinitions: world.itemDefinitions,
        itemArt: world.presentation?.itemArt,
        itemHandling: world.itemHandling,
        constructionProfile: world.constructionProfile,
      }),
  );
  const tradeBodyRevision = bodyEligibilityRevision(world, player);
  const tradeHeldStock = memo(
    'tradeHeldStock',
    [world.resourceReservations, observation.inventory],
    () =>
      observation.inventory.map((item): [string, number] => [
        item.id,
        availableItemQuantity(world, item.id),
      ]),
  );
  const coaching = coachingFor(world, player.id);
  const playerCanSpeak = canSpeak(player) && !capabilityBlocked(world, player, 'speech');
  const tradeReaderRevision = memo(
    'tradeReaderRevision',
    [
      player.inventoryRevision,
      tradeBodyRevision,
      actor.action?.id,
      actor.action?.stage,
      tradeHeldStock,
      world.moduleManifest.revision,
      world.map.spatial.revision,
      tradeDefinitions,
    ],
    () =>
      tradeReaderRevisionFor(world.id, player.id, {
        inventoryRevision: player.inventoryRevision,
        bodyRevision: tradeBodyRevision,
        actionId: actor.action?.id,
        actionStage: actor.action?.stage,
        heldStock: tradeHeldStock,
        moduleRevision: world.moduleManifest.revision,
        spatialRevision: world.map.spatial.revision,
        definitionsRevision: tradeDefinitions,
      }),
  );
  const entities: EntityView[] = (() => {
    return observation.visibleEntities
      .filter((entity) => entity.id !== scope.actorId)
      .map((entity) => {
        let values = cache.entities.get(entity.id);
        if (!values) cache.entities.set(entity.id, (values = new Map()));
        const entityMemo = memoizer({ values });
        const parts = bodyReads?.bodyParts(entity.id);
        if (!parts) throw new ViewChangedError();
        const individualSubject = currentBodySubject(world, player.id, entity.id, bodyReads);
        const identity = individualSubject
          ? observerIndividual(world, player.id, individualSubject)
          : undefined;
        countDomainWork('viewNameReads');
        const display = entityMemo(
          'name',
          [
            identity,
            parts.details.label?.name,
            parts.details.label?.nameForm,
            parts.details.label?.indefiniteArticle,
          ],
          () => {
            countDomainWork('viewNamePreparations');
            return observerName(world, player.id, entity.id, bodyReads);
          },
        );
        const description = bodyReads?.received(entity.id, 'description');
        const descriptionInput = bodyReads?.observed(entity.id, 'description');
        countDomainWork('viewAppearanceReads');
        const appearance = entityMemo(
          'appearance',
          [
            parts.details,
            description,
            world.presentation?.portraits,
            !!entity.actor,
            descriptionInput?.metadata.availability,
            descriptionInput?.originalSource.facets[descriptionInput.field.originalOrdinal]?.role,
          ],
          () => {
            countDomainWork('viewAppearancePreparations');
            return projectObservedAppearance(
              selectedObservedBodyKind(world, parts.details.kind),
              parts.details,
              description?.kind === 'description' ? description.text : undefined,
              (descriptionInput?.originalSource.facets[descriptionInput.field.originalOrdinal]
                ?.role ?? 'direct') === 'direct',
              !!entity.actor,
              entity.actor ? portraitArt(world, parts.details.appearance) : undefined,
            );
          },
        );
        const facets = currentObservedFacetValues(
          world,
          player.id,
          entity.id,
          publicDetailKinds,
          bodyReads,
        );
        const received = bodyReads?.envelope(entity.id, 'body');
        if (!received) throw new ViewChangedError();
        const body = { ...appearance.detail, ...parts.pose };
        const detailMeasured =
          received.descriptionSupport?.descriptionMeasuredThrough ?? received.valueMeasuredThrough;
        const detailAcquired =
          received.descriptionSupport?.descriptionAcquiredAt ?? received.valueAcquiredAt;
        const detailConfirmed =
          received.descriptionSupport?.confirmedThrough ?? received.confirmedThrough;
        const detailSource = received.descriptionSupport?.confirmation ?? received.source;
        const kind = appearance.kind;
        const rememberedAddressee = currentCommunicationSubject(
          world,
          player.id,
          entity.id,
          bodyReads,
        );
        const grant = currentBodyGrant(world, player.id, entity.id, bodyReads)!;
        const binding = perceivedEncounterPreferenceBinding(world, player, entity);
        const tradeDisclosures = entity.actor
          ? rememberedTradeDisclosureIndex(world, player.id, entity.id)
          : undefined;

        return projectObservedEntity({
          references: {
            id: entityMemo('contact', [grant.leaseId, grant.physicalLife], () =>
              currentContactReference(world, scope, entity, bodyReads),
            ),
            bodyReference: entityMemo('body', [entity.actor?.physicalLife ?? 0], () =>
              entityBodyReference(scopeKey(scope), entity),
            ),
            contextActionRevision: entityMemo(
              'contextActions',
              [
                world.moduleManifest.revision,
                actor.physicalLife,
                entity.actor?.physicalLife,
                JSON.stringify(binding),
                coaching,
                (actor.combatReadyAt ?? 0) > world.simTime,
                actor.action?.ranged?.ready,
              ],
              () => contextActionRevision(scopeKey(scope), world, player, entity, binding),
            ),
          },
          ...(body.assembly
            ? {
                construction: {
                  assembly: projectObservedAssembly(world, scope, entity.id, body.assembly),
                  actionRevision: permittedSourceHandle(world, player.id, [
                    'assembly-actions',
                    received.id,
                    body.assembly.revision,
                    body.assembly.implementation === 'grounded-panel-boundary'
                      ? body.assembly.materialRevision
                      : null,
                  ]),
                },
              }
            : {}),
          ...(attentionKeys.has(entity.id)
            ? { attentionPreference: attentionPreferences.has(attentionKeys.get(entity.id)!) }
            : {}),
          display,
          ...(identity && !identity.seedOnly
            ? {
                identity: entityMemo(
                  'identity',
                  [identity.givenName, identity.nickname, identity.revision],
                  () => ({
                    ...(identity.givenName ? { knownName: identity.givenName } : {}),
                    ...(identity.nickname ? { nickname: identity.nickname } : {}),
                    revision: identity.revision,
                  }),
                ),
              }
            : {}),
          observation: entityMemo(
            'observation',
            [
              detailMeasured,
              detailAcquired,
              detailConfirmed,
              sightConfirmedThrough,
              detailSource.family,
              detailSource.id,
              detailSource.revision,
              detailSource.observer.actorId,
              detailSource.observer.physicalLife,
            ],
            () => ({
              kind: 'current',
              modality: 'sight',
              measurementAt: detailTime(detailMeasured),
              acquiredAt: detailTime(detailAcquired),
              confirmedThrough: detailTime(detailConfirmed),
              sourceReference: evidenceSourceHandle(world, player.id, detailSource),
            }),
          ),

          body,
          kind,
          portrait: appearance.portrait,
          status: appearance.status,
          bodySize: entityMemo('bodySize', [body.radius, body.height], () => ({
            width: body.radius * 2,
            height: body.height,
          })),
          facets,
          observedMoving: hasCurrentObservedFacet(
            world,
            player.id,
            entity.id,
            'observed-motion',
            bodyReads,
          ),
          observationId: received.id,
          observerId: player.id,
          referenceScope: world,
          sightConfirmedThrough,
          resourceArt:
            body.kind === 'resource' && body.subtype
              ? itemIllustration(world, body.subtype)
              : undefined,
          storage: inventoryStorageHint(service, scope, entity.id, body, bodyReads),
          ...(entity.actor
            ? {
                communication: projectObservedCommunication({
                  bodyAlive: body.outward[0] === 'alive',
                  playerCanSpeak,
                  talkRequiresAi: entity.actor.controller === 'npc',
                  communicationReference: rememberedAddressee
                    ? communicationReference(scope, { id: rememberedAddressee })
                    : undefined,
                  trade: tradeSummary(
                    world,
                    scope,
                    entity,
                    tradeReaderRevision,
                    entityMemo('tradeDisclosures', [tradeDisclosures], () =>
                      permittedSourceHandle(world, player.id, [
                        'trade-disclosures',
                        entity.id,
                        [...tradeDisclosures!],
                      ]),
                    ),
                    bodyReads,
                  ),
                }),
              }
            : {}),
        });
      });
  })();
  // Borrowed readers cannot cross an await, even though this world is immutable.
  bodyReads = undefined;
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
      return hydratePlayerPractice(
        progress,
        missing,
        service.store.records
          ? (ids) => service.store.records!.activityPage(world.id, player.id, -1, ids, 128)
          : undefined,
      );
    },
  );
  // A correction can revoke retained evidence while SQL inspection is pending.
  // Recheck even a cached promise before publishing pre-correction private text.
  if (generation !== service.generation || historyEpoch !== service.historyEpoch)
    throw new ViewChangedError();
  service.assertScope(scope);
  const eventEvidenceOwners = (snapshot: WorldState) => [
    entityGet(snapshot.entities, scope.actorId)?.actor?.physicalLife ?? 0,
    snapshot.experience?.awareness[scope.actorId],
    snapshot.experience?.temporal?.actors[scope.actorId]?.pages,
    snapshot.perceptionEvidence?.[scope.actorId]?.received,
    snapshot.experience?.forgotten[scope.actorId],
    snapshot.experience?.corrections?.[scope.actorId],
  ];
  const capturedEventOwners = eventEvidenceOwners(world);
  const events = memo('visibleEvents', [world.events, ...capturedEventOwners], () => {
    // Current reception may be displayed without becoming a lasting memory.
    // Actor-owned receipts authorize the recent sequence; global events supply
    // metadata only after that personal selection, never missing observations.
    const wanted = new Set([
      ...world.events.slice(-PLAYER_EVENT_WINDOW).map((event) => event.id),
      ...(world.experience?.awareness[scope.actorId] ?? [])
        .slice(-PLAYER_EVENT_WINDOW)
        .map((entry) => entry.eventId),
    ]);
    const visible = [
      ...receivedEventAccounts(world, scope.actorId, wanted, {
        current: true,
        evidenceOnly: true,
        index: cache.eventChunks,
      }),
    ].flatMap(([id, account]) => {
      const event = service.worldEvent(id);
      return event
        ? [
            memo(`eventAccount:${id}`, [event, account.awareness ?? account.evidence], () =>
              projectEventEvidence(event, account.evidence),
            ),
          ]
        : [];
    });
    return boundPlayerEvents(visible, playerViewRules);
  });
  const selectedEventIds = new Set(events.map((event) => event.id));
  for (const key of cache.values.keys())
    if (
      (key.startsWith('eventAccount:') && !selectedEventIds.has(key.slice(13))) ||
      (key.startsWith('event:') && !selectedEventIds.has(key.slice(6)))
    )
      cache.values.delete(key);
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
    playerUsageFallback(service.config.budgetUsd),
  );
  const jobs = projectPlayerJobs(
    optional(
      service,
      cache,
      'jobs',
      memo('jobs', [telemetryRevision], async () =>
        permittedPlayerJobs(
          await service.store.recentJobs(),
          scope,
          (id) => service.worldEvent(id)?.actorId,
        ),
      ),
      [],
    ),
  );
  const conversationEntries = events.filter((event) => isConversationEvent(event)).slice(-30);
  const speechJobIds = playerSpeechJobIds(conversationEntries, scope.actorId);
  // Text is authoritative in memory; optional job reads must never hide it while refreshing.
  // See docs/architecture.md#performance-critical-path.
  const replies = optional(
    service,
    cache,
    'speechJobs',
    memo('speechJobs', [service.historyEpoch, telemetryRevision, ...speechJobIds], () =>
      service.store.getSpeechJobs(speechJobIds),
    ),
    new Map<string, never>(),
  );
  const jevConfigured = service.config.macrofoldKey ? true : !!service.config.jevKey;
  const llmConfigured =
    !service.config.jevOnly && !!(service.config.macrofoldKey || service.config.llmKey);
  const hasWork = playerHasWork(!!actor.action, actor.agency);
  // Only paused existing work needs the service's exceptional-command check;
  // ordinary Stop remains a cheap direct control, not a fresh full action menu.
  const pausedStop =
    hasWork && paused ? service.previewCommand({ type: 'cancel' }, scope) : undefined;
  const playerControls = [
    action(
      'cancel',
      playerViewRules.stopLabel,
      { type: 'cancel' },
      hasWork && (pausedStop?.ok ?? true),
      pausedStop?.message ?? playerViewRules.noWork,
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
    playerControls.push(
      projectRecoveryControl(
        bodyPolicy(world)!.recovery!.label,
        paused,
        playerViewRules.recoverReason,
      ),
    );
  const reincarnation = reincarnationPolicy(world);
  if (actor.pendingDeath && reincarnation)
    playerControls.push(
      projectRespawnControl(
        reincarnation.continueLabel,
        paused,
        actor.participation?.phase === 'inactive',
        service.currentScope(scope, 'play', true),
        playerViewRules.respawnReason,
      ),
    );
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
  const workWaitingForFeedback = waitingForFeedback(world, player);
  const workLabels = selectedPlayerWorkLabels(world, {
    scarLabel:
      work?.scarId && reincarnation
        ? `${reincarnation.treatmentLabel} ${reincarnation.scars.find((scar) => scar.id === work.scarId)?.name ?? ''}`
        : undefined,
    replenishmentLabel: attributeDefinition(world, work?.attributeId ?? '')?.reservoir?.actionLabel,
    statusLabel: world.statusEffectPolicy.definitions.find((d) => d.id === work?.definitionId)
      ?.label,
    targetName,
    waitingForFeedback: workWaitingForFeedback,
    evasionLabel: bodyPolicy(world)?.evasion?.label,
    toolName: work?.ranged
      ? (world.itemDefinitions[work.ranged.tool.id]?.name ?? playerViewRules.selectedTool)
      : undefined,
    rangedReady: !!work?.ranged?.ready,
    fireOperation: work?.fireOperation,
    craftOutputs:
      work?.recipeId && world.recipes[work.recipeId]
        ? world.recipes[work.recipeId]!.outputs.map(
            (output) => world.itemDefinitions[output.definition.id]!.name,
          )
        : undefined,
  });
  const guide = perceptionGuide(world, player);
  // Read the indexed latest passage before publishing the view. A temporary null
  // while this refreshes would dismiss and then reannounce the same old narration.
  // Narration completion already calls notifyHistory; unrelated telemetry is not a dependency.
  const narratorTiming = {
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
  };
  const narratorRevision = service.store.history?.bannerRevisionAt(
    world.id,
    scope.accountId,
    narratorTiming,
  );
  const narration = await memo(
    'narrator',
    [narratorRevision, historyEpoch],
    () =>
      service.store.history?.latestNarration(world.id, scope.accountId, narratorTiming) ??
      Promise.resolve({ status: 'current' as const, item: null }),
  );
  if (narration.status === 'stale') throw new ViewChangedError();
  const narrator = narration.item;
  const assetAuthorityGeneration = service.assetAuthorityGeneration;
  const placesRevision =
    service.store.memories?.knownPlacesRevision(player.id) ?? service.generation;
  const presentationRelease = await service.presentationReleaseFor(scope);
  const projected: GameView = {
    schemaVersion: 3,
    evaluationCut: world.simTime,
    sightConfirmedThrough,
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
              return projectPlayerCartography(
                art,
                world.knowledgePolicy?.maxCharacters.subject,
                world.knowledgeRevisions?.[player.id] ?? 0,
                placesRevision,
                Object.values(world.mapMarkers?.[player.id] ?? {}).map((marker) => {
                  const note = knowledgeDocument(world, player.id, {
                    kind: 'map-marker',
                    markerId: marker.id,
                  });
                  return {
                    ...marker,
                    note: { text: note?.text ?? '', revision: note?.revision ?? 0 },
                  };
                }),
              );
            },
          ),
        }
      : {}),
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
    clock: projectPlayerClock(
      world.simTime,
      world.presentation,
      world.statusEffectPolicy.namedTimes,
      world.statusEffectPolicy.clockOffsetHours,
      {
        weather: localWeatherView(world, worldPosition(player)),
        speed,
        baseRatio: service.config.baseRatio,
        paused,
        pauseReason,
        preparingNavigation: navigationBlocked(world),
      },
    ),
    player: {
      ...projectPlayerBody(
        {
          identity: player,
          knowledgeRevision: world.knowledgeRevisions?.[player.id] ?? 0,
          position: worldPosition(player),
          supportSurfaceId: worldSupport(player),
          heading: player.spatial.heading,
          profile: effectiveBodyProfile(world, player),
          attributes: projectAttributes(world, player, 'owner'),
          alive: actor.alive,
          physicalLife: actor.physicalLife,
          participation: actor.participation,
          pendingDeath: actor.pendingDeath,
          scars: actor.scars,
          remainsPhase: player.remains?.phase,
          statusEffects: projectStatusEffects(world, player, 'owner'),
          evasionReadyAt: actor.evasionReadyAt,
          attackModeNotice: actor.attackModeNotice,
          at: world.simTime,
        },
        {
          portrait: portraitArt(world, player.appearance),
          practice,
          actionAnimation: actionAnimation(world, player),
          inputScope: service.currentScope(scope, 'play', true)
            ? service.inputScope(scope)
            : undefined,
          attackSource: actor.alive
            ? attackSourceView(world, player.id, observation.inventory)
            : undefined,
          hasWork,
          departureNotice: world.participationPolicy?.exitDescription,
          bodyPolicy: bodyPolicy(world) ?? null,
          freshWorldReview: !!(
            actor.pendingDeath &&
            reincarnation &&
            service.config.godMode &&
            service.currentScope(scope, 'create') &&
            service.currentScope(scope, 'inspect') &&
            selectedCreationProfileForWorld(world).recoveryOpeningId &&
            service.config.creation.installationId &&
            service.config.creation.targets.some((target) =>
              target.allowedCreatorAccountIds.includes(scope.accountId),
            )
          ),
          practiceAttributeIds,
          defaultAppearance: playerViewRules.defaultAppearance,
        },
      ),
      action: actor.action
        ? projectPlayerAction(
            {
              id: actor.action.id,
              type: actor.action.type,
              stage: actor.action.stage,
              totalSeconds: actor.action.totalSeconds,
              remainingSeconds: actor.action.remainingSeconds,
              preparingNavigation: !!actor.action.navigation,
              rangedReady: !!actor.action.ranged?.ready,
              waitingForFeedback: workWaitingForFeedback,
            },
            {
              paused,
              hasExecution: !!actor.action.attackExecution,
              execution: actor.action.attackExecution
                ? service.executionView(player.id)
                : undefined,
              hasDetail: actor.action.type === 'aim',
              detail:
                aimDetails &&
                [
                  BASE_RANGED_TEXT.aimDescription,
                  ...(work?.ranged?.ready ? [BASE_RANGED_TEXT.ready] : []),
                  ...aimDetails.facts.map(([name, value]) => `${name}: ${value}`),
                  aimDetails.detail,
                ].join('; '),
              controls: actor.action.attackExecution
                ? [
                    {
                      id: `release:${actor.action.id}`,
                      label: playerViewRules.attackNormally,
                      command:
                        actor.action.type === 'aim'
                          ? { type: 'release-shot', aimId: actor.action.id }
                          : { type: 'release-strike', expectedActionId: actor.action.id },
                      enabled: actor.action.attackExecution.ready && !paused,
                    },
                    {
                      id: `cancel:${actor.action.id}`,
                      label: playerViewRules.cancelLabel,
                      command: { type: 'cancel', expectedActionId: actor.action.id },
                      enabled: true,
                    },
                  ]
                : actor.action.type === 'aim'
                  ? [
                      {
                        id: `release:${actor.action.id}`,
                        label: BASE_RANGED_TEXT.shootingName,
                        command: { type: 'release-shot', aimId: actor.action.id },
                        enabled: !!actor.action.ranged?.ready && !paused,
                        ...(!actor.action.ranged?.ready
                          ? { reason: BASE_RANGED_TEXT.notReady }
                          : {}),
                      },
                      {
                        id: `cancel:${actor.action.id}`,
                        label: BASE_RANGED_TEXT.cancelName,
                        command: { type: 'cancel', expectedActionId: actor.action.id },
                        enabled: true,
                      },
                    ]
                  : undefined,
              label: actor.action.navigation
                ? playerViewRules.preparingRoute
                : actor.action.gateWork
                  ? gateUseLabel(world, actor.action.gateWork.intent)
                  : actor.action.assemblyPhase
                    ? assemblyPhaseLabel(world, actor.action.assemblyPhase)
                    : (guardWorkLabel(world, player) ??
                      workLabels[actor.action.type] ??
                      playerViewRules.working),
              statusTypes: playerViewRules.actionStatusTypes,
              workingStatusTypes: playerViewRules.workingStatusTypes,
              noProgressTypes: playerViewRules.noProgressTypes,
            },
          )
        : null,
      traits: actor.traits?.map((t) => ({ ...t })),
      memoryRevision: JSON.stringify([
        service.historyEpoch,
        service.store.memories?.actorRevision(player.id) ?? 0,
      ]),
      ...(world.presentation?.calendar?.historyTemplate
        ? {
            history: playerHistoryText(
              world.simTime,
              world.statusEffectPolicy.clockOffsetHours,
              world.presentation.calendar,
            ),
          }
        : {}),
      inventory,
      inventoryReadRevision,
      equipmentPorts: memo(
        'equipment-ports',
        [
          actor.body?.equipmentPorts,
          player.inventoryRevision,
          world.itemDefinitions,
          world.presentation?.itemArt,
        ],
        () =>
          projectPlayerEquipment(
            actor.body?.equipmentPorts ?? [],
            equippedInventory,
            world.itemDefinitions,
            world.presentation?.itemArt,
          ),
      ),
      inventoryRevision: player.inventoryRevision ?? 0,
      constructionRevision: service.constructionReadRevision(player.id),
      workBatchRevision: world.workBatchPolicy
        ? JSON.stringify([definitionPin(world.workBatchPolicy), world.moduleManifest.bodyPolicyPin])
        : undefined,
      canUseInventory: canUseInventory(service, scope),
      actionAttempts: memo('player-action-attempts', [actor.agency.attempts], () =>
        projectPlayerAttempts(actor.agency.attempts),
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
    events: memo<GameView['events']>(
      'events',
      // The historical words stay fixed, but a current caption anchor can expire
      // without another event. Never memoize that body grant on history alone.
      [
        events,
        ...currentBodyInputs,
        world.observerIdentities?.[player.id],
        world.perceptionEpisodes?.[player.id],
        service.timelineId,
      ],
      () => {
        const reads = prepareCurrentBodyReadScope(world, scope.actorId);
        const presentation = selectedEventPresentation(world);
        return events
          .filter(isJournalEvent)
          .slice(-60)
          .map((event) => {
            const roles = perceivedParticipantReferences(world, scope, event, reads ?? null);
            return memo(
              `event:${event.id}`,
              [
                event,
                presentation,
                roles.actor?.contactReference,
                roles.actor?.communicationReference,
                roles.target?.contactReference,
                roles.target?.communicationReference,
              ],
              () =>
                publicEvent(
                  event,
                  presentation,
                  player.id,
                  JSON.stringify([world.id, `${service.timelineId}:${scopeKey(scope)}`]),
                  () => roles,
                ),
            );
          });
      },
    ),
    conversation: conversationEntries.map((event) =>
      projectConversationEvent(event, scope.actorId, replies.get(event.id)),
    ),
    ai: projectPlayerAi(jobs, usage, { executionSource, jevConfigured, llmConfigured }),
    milestones: BASE_PLAYTEST_MILESTONES.map((milestone) => ({
      ...milestone,
      done: milestones[milestone.id] === true,
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
    narratorRevision !==
      service.store.history?.bannerRevisionAt(world.id, scope.accountId, {
        at: service.world.simTime,
        maxAgeSeconds: selectedTemporalPolicy(service.world).recent.maxAgeSeconds,
      }) ||
    assetAuthorityGeneration !== service.assetAuthorityGeneration
  )
    throw new ViewChangedError();
  service.assertScope(scope);
  if (service.world !== world) {
    const currentPlayer = entityGet(service.world.entities, player.id);
    const reads = prepareCurrentBodyReadScope(service.world, scope.actorId);
    if (
      !currentPlayer?.actor ||
      (currentPlayer.actor.physicalLife ?? 0) !== observerLife ||
      currentPlayer.actor.alive !== actor.alive ||
      activelyParticipates(currentPlayer) !== observerParticipating ||
      bodyGrants.some(({ id, grant }) => {
        const current = currentBodyGrant(service.world, scope.actorId, id, reads);
        return (
          !current ||
          current.leaseId !== grant.leaseId ||
          current.physicalLife !== grant.physicalLife
        );
      })
    )
      throw new ViewChangedError();
  }
  // Natural expiry can remove a recent account without a creator edit. Recheck
  // selected event facts after asynchronous preparation, only when this person's
  // evidence owners changed; unrelated motion must not invalidate their view.
  if (eventEvidenceOwners(service.world).some((owner, i) => owner !== capturedEventOwners[i])) {
    const wanted = new Set(events.map((event) => event.id));
    const before = receivedEventAccounts(world, scope.actorId, wanted, {
      current: true,
      evidenceOnly: true,
      index: cache.eventChunks,
    });
    const after = receivedEventAccounts(service.world, scope.actorId, wanted, {
      current: true,
      evidenceOnly: true,
      index: cache.eventChunks,
    });
    if (
      events.some(
        (event) =>
          !after.has(event.id) ||
          !same(before.get(event.id)?.evidence, after.get(event.id)?.evidence),
      )
    )
      throw new ViewChangedError();
  }
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

function eventChanges(previous: GameView['events'], next: GameView['events']): GamePatch['events'] {
  if (previous === next) return;
  const before = new Map(previous.map((event) => [event.id, event]));
  const after = new Set(next.map((event) => event.id));
  const upsert = next.filter((event) => !same(before.get(event.id), event));
  const remove = previous.filter((event) => !after.has(event.id)).map((event) => event.id);
  const order = next.map((event) => event.id);
  const reordered = !same(
    previous.map((event) => event.id),
    order,
  );
  return upsert.length || remove.length || reordered
    ? { upsert, remove, ...(reordered ? { order } : {}) }
    : undefined;
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
  const events = eventChanges(previous.events, next.events);
  return {
    schemaVersion: 3,
    evaluationCut: next.evaluationCut,
    ...(previous.sightConfirmedThrough !== next.sightConfirmedThrough
      ? { sightConfirmedThrough: next.sightConfirmedThrough }
      : {}),
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
    ...(events ? { events } : {}),
    ...(!same(previous.conversation, next.conversation) ? { conversation: next.conversation } : {}),
    ...(ai ? { ai } : {}),
    ...(!same(previous.milestones, next.milestones) ? { milestones: next.milestones } : {}),
    ...(!same(previous.persistence, next.persistence) ? { persistence: next.persistence } : {}),
  };
}
