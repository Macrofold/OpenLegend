import { canUseInventory, inventoryItemView } from './inventory-view.js';
import { itemFor, itemsForOwner } from '@open-legend/domain';
import { worldPosition, worldSupport } from '@open-legend/domain';
import { scopeKey, type RequestScope } from './authority.js';
import { observerDescription } from '@open-legend/domain';
import { capabilityBlocked, projectStatusEffects } from '@open-legend/domain';
import { pickupActions } from './item-actions.js';
import { statusEffectActions } from './status-effect-actions.js';
import { isConversationEvent } from '@open-legend/domain';
import { NATIVE_STRIKES, supportsManualWork } from '@open-legend/domain';
import { actionAnimation } from './action-animation.js';
import { knownRecipeAttribution } from '@open-legend/domain';
import { projectAttributes, attributeDefinition, readAttribute } from '@open-legend/domain';
import { canSpeak } from '@open-legend/domain';
import type {
  ActionOption,
  EntityView,
  GamePatch,
  GameView,
  InventoryItemView,
} from '@open-legend/protocol';
import {
  hearsEntity,
  seesEntity,
  visionRadius,
  nearbyEntities,
  inventoryFor,
  canRecoverAtCamp,
  GOD_SPAWN_OPTIONS,
  TRAIT_BANK,
  type WorldEvent,
} from '@open-legend/domain';
import { describeEntity } from './entity-description.js';
import type { WorldService } from './world-service.js';

interface ViewCache {
  scope: RequestScope;
  values: Map<string, { deps: unknown[]; value: unknown }>;
  sections: Map<string, { token: unknown; value?: unknown }>;
}
const projections = new WeakMap<WorldService, Map<string, ViewCache>>();
function scopedCache(service: WorldService, scope: RequestScope): ViewCache {
  let scopes = projections.get(service);
  if (!scopes) projections.set(service, (scopes = new Map()));
  for (const [key, cache] of scopes) if (!service.currentScope(cache.scope)) scopes.delete(key);
  const key = scopeKey(scope);
  let cache = scopes.get(key);
  if (!cache) {
    while (scopes.size >= 32) scopes.delete(scopes.keys().next().value!);
    scopes.set(key, (cache = { scope, values: new Map(), sections: new Map() }));
  }
  return cache;
}
function memoizer(cache: ViewCache) {
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
  const revision = service.version;
  const memo = memoizer(cache);
  for (const key of cache.values.keys())
    if (key.startsWith('entity:') && !Object.hasOwn(world.entities, key.slice(7)))
      cache.values.delete(key);
  const paused = service.paused;
  const pauseReason = service.pauseReason;
  const speed = service.speed;
  const milestones = service.milestonesFor(scope.actorId);
  const storageError = service.storageError;
  const telemetryRevision = service.telemetryRevision;
  const observation = {
    inventory: memo('ownedItems', [world.entities[scope.actorId]?.inventoryRevision], () =>
      inventoryFor(world, scope.actorId),
    ),
    visibleEntities: memo(
      'visibleEntities',
      [world.entities, world.map, world.moduleManifest],
      () =>
        nearbyEntities(
          world,
          worldPosition(world.entities[scope.actorId]!),
          visionRadius(world, world.entities[scope.actorId]!),
        ).filter(
          (entity) =>
            entity.id !== scope.actorId &&
            seesEntity(world, world.entities[scope.actorId]!, entity),
        ),
    ),
    knownRecipes: memo('knownRecipes', [world.knowledge[scope.actorId], world.recipes], () =>
      (world.knowledge[scope.actorId] ?? [])
        .map((record) => world.recipes[record.recipeId])
        .filter((recipe) => !!recipe),
    ),
  };
  const pileContents = memo(
    'pileContents',
    [observation.visibleEntities, world.objectState, world.itemDefinitions],
    () => {
      const byOwner = new Map<string, NonNullable<EntityView['contents']>>();
      for (const pile of observation.visibleEntities.filter(
        (entity) => entity.kind === 'item-pile',
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
          });
          byOwner.set(item.ownerId, contents);
        }
      }
      return byOwner;
    },
  );
  const player = world.entities[scope.actorId]!;
  const actor = player.actor!;
  const quantity = (definitionId: string) =>
    observation.inventory
      .filter((item) => item.definitionId === definitionId)
      .reduce((sum, item) => sum + item.quantity, 0);
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
    possible = true,
    reason?: string,
  ): ActionOption => ({
    id,
    label,
    command,
    enabled: active && possible,
    ...(!active
      ? {
          reason: paused ? 'Resume the world to act.' : 'You cannot act in your current condition.',
        }
      : !possible && reason
        ? { reason }
        : {}),
  });
  const equipment = itemFor(world, actor.equippedItemId ?? '');
  const launcher = equipment && world.itemDefinitions[equipment.definitionId]?.launcher;
  const ammunition =
    launcher &&
    observation.inventory.find(
      (item) =>
        world.itemDefinitions[item.definitionId]?.ammunition?.kind === launcher.ammunitionKind,
    );
  const inventory = memo<InventoryItemView[]>(
    'inventory',
    [
      observation.inventory,
      world.resourceReservations,
      world.itemDefinitions,
      actor.equippedItemId,
      actor.action,
      world.itemHandling,
      player.spatial,
      player.placement,
      player.statusEffects,
      world.statusEffectPolicy,
      actor.capabilities?.needs,
      active,
      paused,
    ],
    () => observation.inventory.slice(0, 60).map((item) => inventoryItemView(service, scope, item)),
  );
  const entities: EntityView[] = observation.visibleEntities
    .filter((entity) => entity.id !== scope.actorId)
    .map((entity) =>
      memo<EntityView>(
        `entity:${entity.id}`,
        [
          entity,
          world.observerIdentities?.[scope.actorId]?.[entity.id],
          world.perceptionEpisodes?.[scope.actorId]?.[entity.id],
          entity.kind === 'item-pile' ? pileContents.get(entity.id) : undefined,
          world.itemDefinitions,
          active,
          paused,
          launcher,
          ammunition,
          observation.knownRecipes,
          worldPosition(player),
          player.spatial,
          player.placement,
          world.itemHandling,
          player.statusEffects,
          world.map,
          actor.attributes,
          world.moduleManifest,
          world.statusEffectPolicy,
        ],
        () => {
          const displayName = observerDescription(world, scope.actorId, entity.id);
          const actions: ActionOption[] = [];
          for (const option of pickupActions(world, player, entity, (command) =>
            service.previewCommand(command, scope.actorId),
          )) {
            const preview = option.availability;
            actions.push(
              action(option.id, option.label, option.command, preview.ok, preview.message),
            );
          }
          for (const option of statusEffectActions(world, player, entity)) {
            const preview = service.previewCommand(option.command, scope.actorId);
            actions.push(
              action(option.id, option.label, option.command, preview.ok, preview.message),
            );
          }
          if (entity.actor)
            for (const definition of Object.values(NATIVE_STRIKES)) {
              const command = {
                type: 'strike' as const,
                definitionId: definition.id,
                targetId: entity.id,
              };
              actions.push(
                action(
                  `${definition.id}-${entity.id}`,
                  definition.label,
                  command,
                  !!entity.actor?.alive && supportsManualWork(player) && active,
                  'Requires an active actor with a supported biped body and a living target.',
                ),
              );
            }

          const speechCapable = canSpeak(entity);
          const talkUnavailableReason = !entity.actor
            ? undefined
            : !speechCapable
              ? `${displayName} cannot speak.`
              : !entity.actor.alive
                ? `${displayName} is dead and cannot respond.`
                : entity.actor.incapacitated
                  ? `${displayName} is incapacitated and cannot respond.`
                  : capabilityBlocked(world, entity, 'speech')
                    ? `${displayName} cannot speak in their current state.`
                    : !hearsEntity(world, entity, player)
                      ? `Move within hearing range of ${displayName} to talk.`
                      : undefined;
          if (entity.replenisher) {
            const definition = attributeDefinition(world, entity.replenisher.attributeId);
            if (definition?.reservoir && readAttribute(actor, definition) !== undefined) {
              const command = {
                type: 'replenish' as const,
                targetId: entity.id,
                attributeId: definition.id,
              };
              const preview = service.previewCommand(command, scope.actorId);
              actions.push(
                action(
                  `replenish-${entity.id}`,
                  definition.reservoir.actionLabel,
                  command,
                  preview.ok,
                  preview.message,
                ),
              );
            }
          }
          if (entity.resource)
            actions.push(
              action(
                `gather-${entity.id}`,
                'Gather',
                { type: 'gather', targetId: entity.id },
                entity.resource.quantity > 0,
                'This source is depleted.',
              ),
            );
          if (entity.animal && entity.actor?.alive)
            actions.push(
              action(
                `hunt-${entity.id}`,
                'Hunt',
                { type: 'hunt', targetId: entity.id },
                !!launcher && !!ammunition,
                !launcher
                  ? 'Invent, craft and equip a launcher first.'
                  : `Carry compatible ${launcher.ammunitionKind} ammunition.`,
              ),
            );
          if (entity.remains)
            actions.push(
              action(
                `harvest-${entity.id}`,
                'Harvest remains',
                { type: 'harvest', targetId: entity.id },
                !entity.remains.harvested,
                'These remains have already been harvested.',
              ),
            );
          if (canSpeak(entity) && entity.actor?.controller === 'npc')
            for (const recipe of observation.knownRecipes)
              actions.push(
                action(`teach-${recipe.id}`, `Teach ${recipe.name}`, {
                  type: 'teach',
                  targetId: entity.id,
                  recipeId: recipe.id,
                }),
              );
          const kind: EntityView['kind'] =
            entity.kind === 'item-pile'
              ? 'item-pile'
              : entity.remains
                ? 'remains'
                : entity.animal
                  ? 'animal'
                  : entity.actor
                    ? 'actor'
                    : entity.resource
                      ? 'resource'
                      : 'station';
          return {
            id: entity.id,
            name: displayName,
            ...(entity.kind === 'item-pile' ? { contents: pileContents.get(entity.id) ?? [] } : {}),
            description: describeEntity({ ...entity, name: displayName }, world.itemDefinitions),
            ...(entity.actor?.traits ? { traits: entity.actor.traits.map((t) => ({ ...t })) } : {}),
            kind,
            subtype: entity.actor?.species ?? entity.resource?.definitionId ?? entity.kind,
            position: worldPosition(entity),
            supportSurfaceId: worldSupport(entity),
            heading: entity.spatial.heading,
            appearance: entity.appearance ?? 'sprite',
            radius: entity.kind === 'campfire' ? 0.5 : 0.35,
            ...(entity.actor
              ? {
                  speechCapable,
                  canTalk: !talkUnavailableReason,
                  talkRequiresAi: entity.actor.controller === 'npc',
                  ...(talkUnavailableReason ? { talkUnavailableReason } : {}),
                }
              : {}),
            statusEffects: projectStatusEffects(world, entity),
            actionAnimation: actionAnimation(world, entity),
            status: entity.actor
              ? !entity.actor.alive
                ? 'Dead'
                : projectStatusEffects(world, entity).length
                  ? projectStatusEffects(world, entity)
                      .map((d) => d.label)
                      .join(', ')
                  : entity.actor.action
                    ? ({
                        pickup: 'Picking up items',
                        move: 'Walking',
                        replenish: 'Replenishing',
                        gather: 'Gathering',
                        'status-effect': 'Active state',
                        hunt: 'Hunting',
                        strike: 'Striking',
                        harvest: 'Harvesting',
                        cook: 'Cooking',
                        prepare: 'Preparing',
                        craft: 'Crafting',
                      }[entity.actor.action.type] ?? 'Working')
                    : entity.animal
                      ? entity.animal.fleeSeconds > 0
                        ? 'Fleeing'
                        : 'Foraging'
                      : 'Watching the clearing'
              : entity.animal
                ? !entity.actor!.alive
                  ? 'Dead'
                  : entity.animal.fleeSeconds > 0
                    ? 'Fleeing'
                    : 'Foraging'
                : entity.remains
                  ? entity.remains.harvested
                    ? 'Harvested'
                    : 'Fresh remains'
                  : entity.heat
                    ? entity.heat.lit
                      ? 'Lit · cooking heat'
                      : 'Cold'
                    : entity.replenisher
                      ? `${Math.round(entity.replenisher.remaining)} units of supply`
                      : entity.kind === 'item-pile'
                        ? `${pileContents.get(entity.id)?.length ?? 0} item stack${pileContents.get(entity.id)?.length === 1 ? '' : 's'}`
                        : 'Gatherable',
            ...(entity.resource ? { quantity: entity.resource.quantity } : {}),
            ...(entity.actor
              ? {
                  attributes: projectAttributes(world, entity, 'public'),
                  health: entity.actor.health,
                  bodyRevision: entity.actor.body?.revision,
                  species: entity.actor.species,
                }
              : {}),
            actions,
          };
        },
      ),
    );
  const events = memo(
    'visibleEvents',
    [world.events, world.experience?.awareness[scope.actorId]],
    () => {
      const awareness = world.experience?.awareness[scope.actorId];
      const visible = awareness
        ? awareness
            .slice(-512)
            .reverse()
            .map((entry) => {
              const event = service.worldEvent(entry.eventId);
              // An audience join permits this actor's evidence, not the raw global prose.
              return (
                event && {
                  ...event,
                  text: entry.text,
                  ...(event.type === 'speech'
                    ? {
                        data: {
                          ...event.data,
                          text: (entry.intelligible ? entry.content : undefined) ?? entry.text,
                        },
                      }
                    : {}),
                }
              );
            })
            .filter((event) => event !== undefined)
        : [];
      const bounded: WorldEvent[] = [];
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
  const llmConfigured = service.config.macrofoldKey ? true : !!service.config.llmKey;
  // Job history is not a service-health probe. A later completed request
  // supersedes an older failure; cancellations do not diagnose provider health.
  const latestSettled = jobs.find((job) => job.status === 'failed' || job.status === 'completed');
  const latestProblem = latestSettled?.status === 'failed' ? latestSettled : undefined;
  const aiMode =
    executionSource === 'test-fixture'
      ? 'fixture'
      : jevConfigured && llmConfigured
        ? latestProblem
          ? 'degraded'
          : 'live'
        : 'unconfigured';
  const playerActions = [
    ...statusEffectActions(world, player, player).map((option) => {
      const preview = service.previewCommand(option.command, scope.actorId);
      return action(option.id, option.label, option.command, preview.ok, preview.message);
    }),
    action('cancel', 'Stop current work', { type: 'cancel' }, !!actor.action, 'No work to stop.'),
  ];
  if (canRecoverAtCamp(player))
    playerActions.push({
      id: 'recover',
      label: 'Recover at camp',
      command: { type: 'recover' },
      enabled: !paused,
      reason: 'Personal playtest recovery; world history is retained.',
    });
  const work = actor.action;
  const targetName =
    work?.targetId &&
    observation.visibleEntities.find((entity) => entity.id === work.targetId)?.name;
  const workLabels: Record<string, string> = {
    move: 'Walking',
    replenish: 'Replenishing',
    'status-effect':
      world.statusEffectPolicy.definitions.find((d) => d.id === work?.definitionId)?.label ??
      'Active state',
    gather: `Gathering${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    harvest: `Harvesting${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    strike: `Striking${targetName ? ` ${targetName}` : ''}`,
    hunt: `Hunting${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    cook: 'Cooking meat',
    prepare: work?.preparation === 'fiber' ? 'Cleaning fibers' : 'Twisting cord',
    craft: `Crafting${work?.recipeId && world.recipes[work.recipeId] ? ` ${world.recipes[work.recipeId]!.output.name}` : ''}`,
  };
  return {
    schemaVersion: 2,
    access: {
      scope: scopeKey(scope),
      canManageSaves: service.mayManageSaves(scope),
      accountId: scope.accountId,
      actorId: scope.actorId,
      controlGeneration: scope.controlGeneration,
      controlling: service.currentScope(scope, 'play', true),
      mode: service.config.authentication.mode,
    },
    historyRevision: service.historyRevision,
    historyEpoch: service.historyEpoch,
    narrator: optional(
      service,
      cache,
      'narrator',
      memo(
        'narrator',
        [service.historyRevision, telemetryRevision],
        () =>
          service.store.history?.latestNarration(world.id, scope.accountId) ??
          Promise.resolve(null),
      ),
      null,
    ),
    revision,
    worldId: world.id,
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
            traits: TRAIT_BANK.map((trait) => ({ ...trait })),
            spawnOptions: GOD_SPAWN_OPTIONS.map((option) => ({ ...option })),
            itemOptions: memo('god-items', [world.itemDefinitions], () =>
              Object.values(world.itemDefinitions)
                .map((definition) => ({
                  id: definition.id,
                  label: definition.name,
                  description: definition.description,
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            ),
          },
        }
      : {}),
    profile: profile,
    vision: { radius: visionRadius(world, player) },
    map: memo<GameView['map']>('map', [world.map, world.seed], () => ({
      ...world.map,
      seed: world.seed,
      obstacles: world.map.tiles.flatMap((row, z) =>
        row.flatMap((tile, x) =>
          tile === 'rock' ? [{ y: 0, x, z, radius: 0.52, kind: 'rock' }] : [],
        ),
      ),
    })),
    clock: {
      seconds: world.simTime,
      day: Math.floor(world.simTime / 86400) + 1,
      hour: (8 + world.simTime / 3600) % 24,
      speed: speed,
      baseRatio: service.config.baseRatio,
      paused: paused,
      pauseReason: pauseReason,
    },
    player: {
      participation: actor.participation?.phase ?? 'active',
      id: player.id,
      name: player.name,
      position: worldPosition(player),
      supportSurfaceId: worldSupport(player),
      heading: player.spatial.heading,
      attributes: projectAttributes(world, player, 'owner'),
      health: actor.health,
      actionAnimation: actionAnimation(world, player),
      hunger: actor.fullness === undefined ? undefined : 100 - actor.fullness,
      energy: actor.energy,
      alive: actor.alive,
      statusEffects: projectStatusEffects(world, player, 'owner'),
      action: actor.action
        ? {
            id: actor.action.id,
            // Floating progress is opt-in; routine movement never gets a status.
            showStatus:
              actor.action.stage === 'working' &&
              [
                'gather',
                'prepare',
                'craft',
                'cook',
                'harvest',
                'hunt',
                'strike',
                'replenish',
              ].includes(actor.action.type),
            durationSeconds: actor.action.totalSeconds,
            elapsedSeconds:
              actor.action.stage === 'working'
                ? actor.action.totalSeconds - actor.action.remainingSeconds
                : 0,
            advancing: !paused && actor.action.stage === 'working',
            label: workLabels[actor.action.type] ?? 'Working',
            progress:
              actor.action.stage === 'approaching'
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
      memories: optional(
        service,
        cache,
        'memories',
        memo(
          'memories',
          [
            service.timelineId,
            scope.actorId,
            service.historyRevision,
            world.memories[player.id],
            world.experience?.summaries[player.id],
            world.experience?.forgotten[player.id],
            world.experience?.corrections?.[player.id],
          ],
          async () =>
            (await service.memoryContext(player.id, null, 20))
              .sort((a, b) => a.at - b.at)
              .map((m) => ({ id: m.id, text: `[${m.source}] ${m.summary}`, time: m.at })),
        ),
        [],
      ),
      history: `Your life in this clearing began on Day 1. You have lived here for ${Math.floor(world.simTime / 86400)} full days.`,
      inventory,
      inventoryRevision: player.inventoryRevision ?? 0,
      canUseInventory: canUseInventory(service, scope),
      actions: playerActions,
    },
    entities,
    recipes: memo<GameView['recipes']>(
      'recipes',
      [
        observation.knownRecipes,
        world.declarationReceipts,
        world.knowledge[player.id],
        inventory,
        active,
        paused,
      ],
      () =>
        observation.knownRecipes.map((recipe) => {
          const totals = new Map<string, number>();
          for (const input of recipe.inputs)
            totals.set(input.definitionId, (totals.get(input.definitionId) ?? 0) + input.quantity);
          const enough = [...totals].every(
            ([definitionId, required]) => quantity(definitionId) >= required,
          );
          return {
            id: recipe.id,
            npcCreated: knownRecipeAttribution(world, player.id, recipe.id)!.npcCreated,
            name: recipe.name,
            description: recipe.description,
            family: recipe.output.launcher
              ? `${recipe.output.launcher.mechanism} launcher · ${recipe.output.launcher.ammunitionKind}`
              : recipe.output.gatheringTool
                ? `Gathering tool · up to ${recipe.output.gatheringTool.quantity} ${world.itemDefinitions[recipe.output.gatheringTool.resourceId]!.name} per batch`
                : 'Arrow ammunition',
            ingredients: recipe.inputs.map((input) => ({
              name: world.itemDefinitions[input.definitionId]!.name,
              quantity: input.quantity,
              available: quantity(input.definitionId),
              role: input.role,
            })),
            workSeconds: recipe.workSeconds,
            provenance: `${recipe.provenance.source} · ${recipe.provenance.model ?? 'test fixture'}`,
            actions: [
              action(
                `craft-${recipe.id}`,
                'Craft one',
                { type: 'craft', recipeId: recipe.id },
                enough,
                'Gather or prepare the missing materials.',
              ),
            ],
          };
        }),
    ),
    events: memo<GameView['events']>('events', [events], () =>
      events
        // Recognize legacy movement records that predate structured action types.
        .filter(isJournalEvent)
        .slice(-60)
        .map((event) => ({
          id: event.id,
          time: event.at,
          type: event.type,
          text: event.text,
          ...(event.actorId ? { actorId: event.actorId } : {}),
          ...(event.targetId ? { targetId: event.targetId } : {}),
        })),
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
              ...(replyStatus === 'failed' ? { replyFailure: replyMessage } : {}),
            }
          : {}),
        speakerId: event.actorId!,
        speaker: event.actorId
          ? observerDescription(world, scope.actorId, event.actorId)
          : 'Someone',
        text: String(event.data?.['text'] ?? event.text),
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
    milestones: [
      {
        id: 'talk',
        label: 'Talk with Ada',
        done: events.some((event) => event.type === 'speech' && event.actorId !== scope.actorId),
      },
      {
        id: 'invent',
        label: 'Invent a sling',
        done: observation.knownRecipes.some(
          (recipe) => recipe.output.launcher?.mechanism === 'swing',
        ),
      },
      { id: 'craft', label: 'Craft and equip a launcher', done: !!launcher },
      {
        id: 'hunt',
        label: 'Hunt and harvest',
        done: events.some((event) => event.type === 'harvested' && event.actorId === scope.actorId),
      },
      {
        id: 'eat',
        label: 'Cook and eat a meal',
        done: events.some(
          (event) =>
            event.type === 'ate' && event.actorId === scope.actorId && /meat/i.test(event.text),
        ),
      },
      {
        id: 'bow',
        label: 'Discover bow and arrow',
        done:
          observation.knownRecipes.some((recipe) => recipe.output.launcher?.mechanism === 'flex') &&
          observation.knownRecipes.some((recipe) => recipe.output.ammunition?.kind === 'arrow'),
      },
    ].map((milestone) => ({
      ...milestone,
      done: milestone.done || milestones[milestone.id] === true,
    })),
    persistence: {
      status: storageError ? 'error' : 'saved',
      message: storageError ?? 'Saved locally · the world pauses when you leave',
    },
  };
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
    if (!same(previous[key], next[key])) changed[key] = next[key];
  return Object.keys(changed).length ? changed : undefined;
}

/** Public transport delta only. Authoritative/private state never enters this comparison. */
export function projectPatch(previous: GameView, next: GameView): GamePatch | null {
  if (
    previous.access?.scope !== next.access?.scope ||
    previous.access?.controlling !== next.access?.controlling ||
    previous.worldId !== next.worldId ||
    previous.saveTimeline !== next.saveTimeline ||
    previous.schemaVersion !== next.schemaVersion ||
    previous.godMode !== next.godMode ||
    !same(previous.inventionPolicy, next.inventionPolicy) ||
    !same(previous.godTools, next.godTools) ||
    !same(previous.vision, next.vision) ||
    !same(previous.map, next.map)
  )
    return null;
  const beforeEntities = new Map(previous.entities.map((entity) => [entity.id, entity]));
  const afterEntities = new Map(next.entities.map((entity) => [entity.id, entity]));
  const upsert = next.entities.filter((entity) => !same(beforeEntities.get(entity.id), entity));
  const remove = previous.entities
    .filter((entity) => !afterEntities.has(entity.id))
    .map((entity) => entity.id);
  const beforeOrder = previous.entities.map((entity) => entity.id);
  const afterOrder = next.entities.map((entity) => entity.id);
  const order = same(beforeOrder, afterOrder) ? undefined : afterOrder;
  const clock = changedFields(previous.clock, next.clock);
  const player = changedFields(previous.player, next.player);
  const ai = changedFields(previous.ai, next.ai);
  return {
    schemaVersion: 2,
    scope: next.access?.scope,
    ...(previous.commandEpoch !== next.commandEpoch ? { commandEpoch: next.commandEpoch } : {}),
    baseRevision: previous.revision,
    revision: next.revision,
    ...(previous.historyRevision !== next.historyRevision
      ? { historyRevision: next.historyRevision }
      : {}),
    ...(previous.historyEpoch !== next.historyEpoch ? { historyEpoch: next.historyEpoch } : {}),
    ...(!same(previous.narrator, next.narrator) ? { narrator: next.narrator ?? null } : {}),
    ...(!same(previous.profile, next.profile) ? { profile: next.profile } : {}),
    ...(clock ? { clock } : {}),
    ...(player ? { player } : {}),
    ...(upsert.length || remove.length || order
      ? { entities: { upsert, remove, ...(order ? { order } : {}) } }
      : {}),
    ...(!same(previous.recipes, next.recipes) ? { recipes: next.recipes } : {}),
    ...(!same(previous.events, next.events) ? { events: next.events } : {}),
    ...(!same(previous.conversation, next.conversation) ? { conversation: next.conversation } : {}),
    ...(ai ? { ai } : {}),
    ...(!same(previous.milestones, next.milestones) ? { milestones: next.milestones } : {}),
    ...(!same(previous.persistence, next.persistence) ? { persistence: next.persistence } : {}),
  };
}
