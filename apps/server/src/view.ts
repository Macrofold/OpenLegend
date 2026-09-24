import { capabilityBlocked, projectStatusEffects } from '@open-legend/domain';
import { statusEffectActions } from './status-effect-actions.js';
import { isConversationEvent } from '@open-legend/domain';
import { NATIVE_STRIKES, supportsManualWork } from '@open-legend/domain';
import { actionAnimation } from './action-animation.js';
import { knownRecipeAttribution } from '@open-legend/domain';
import { hasWildernessNeeds } from '@open-legend/domain';
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
  NATIVE_PREPARATIONS,
  experiences,
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

const projections = new WeakMap<WorldService, Map<string, { deps: unknown[]; value: unknown }>>();
function memoizer(service: WorldService) {
  let cache = projections.get(service);
  if (!cache) projections.set(service, (cache = new Map()));
  return <T>(key: string, deps: unknown[], build: () => T): T => {
    deps = [service.controlledEntityId, ...deps];
    const old = cache!.get(key);
    if (old && old.deps.length === deps.length && deps.every((dep, i) => dep === old.deps[i]))
      return old.value as T;
    const value = build();
    cache!.set(key, { deps, value });
    if (value instanceof Promise)
      void value.catch(() => {
        if (cache!.get(key)?.value === value) cache!.delete(key);
      });
    return value;
  };
}

const optionalSections = new WeakMap<
  WorldService,
  Map<string, { token: unknown; value?: unknown }>
>();
/** Refresh optional sections independently; changed scope immediately hides stale private data. */
function optional<T>(service: WorldService, key: string, token: Promise<T>, fallback: T): T {
  let sections = optionalSections.get(service);
  if (!sections) optionalSections.set(service, (sections = new Map()));
  const old = sections.get(key);
  if (old?.token === token) return (old.value as T | undefined) ?? fallback;
  const entry: { token: unknown; value?: unknown } = {
    token,
    ...(key === 'usage' && old ? { value: old.value } : {}),
  };
  sections.set(key, entry);
  void token
    .then((value) => {
      if (sections.get(key) !== entry) return;
      entry.value = value;
      service.notify(false);
    })
    .catch(() => {});
  return (entry.value as T | undefined) ?? fallback;
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
): Promise<GameView> {
  const world = service.world;
  const revision = service.version;
  const memo = memoizer(service);
  for (const key of projections.get(service)!.keys())
    if (key.startsWith('entity:') && !Object.hasOwn(world.entities, key.slice(7)))
      projections.get(service)!.delete(key);
  const paused = service.paused;
  const pauseReason = service.pauseReason;
  const speed = service.speed;
  const profile = service.profile;
  const milestones = service.milestones;
  const storageError = service.storageError;
  const memoryBacklog = service.memoryBacklog;
  const telemetryRevision = service.telemetryRevision;
  const observation = {
    inventory: memo('ownedItems', [world.items], () =>
      inventoryFor(world, service.controlledEntityId),
    ),
    visibleEntities: memo(
      'visibleEntities',
      [world.entities, world.map, world.moduleManifest],
      () =>
        nearbyEntities(
          world,
          world.entities[service.controlledEntityId]!.position,
          visionRadius(world, world.entities[service.controlledEntityId]!),
        ).filter(
          (entity) =>
            entity.id !== service.controlledEntityId &&
            seesEntity(world, world.entities[service.controlledEntityId]!, entity),
        ),
    ),
    knownRecipes: memo(
      'knownRecipes',
      [world.knowledge[service.controlledEntityId], world.recipes],
      () =>
        (world.knowledge[service.controlledEntityId] ?? [])
          .map((record) => world.recipes[record.recipeId])
          .filter((recipe) => !!recipe),
    ),
  };
  const player = world.entities[service.controlledEntityId]!;
  const actor = player.actor!;
  const quantity = (definitionId: string) =>
    observation.inventory
      .filter((item) => item.definitionId === definitionId)
      .reduce((sum, item) => sum + item.quantity, 0);
  const active = !paused && actor.alive && !actor.incapacitated;
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
  const equipment = world.items[actor.equippedItemId ?? ''];
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
      world.itemDefinitions,
      actor.equippedItemId,
      actor.capabilities?.needs,
      active,
      paused,
    ],
    () =>
      observation.inventory.map((item) => {
        const definition = world.itemDefinitions[item.definitionId]!;
        const actions: ActionOption[] = [];
        if (definition.launcher)
          actions.push(action(`equip-${item.id}`, 'Equip', { type: 'equip', itemId: item.id }));
        if (definition.nutrition && hasWildernessNeeds(actor))
          actions.push(action(`eat-${item.id}`, 'Eat one', { type: 'eat', itemId: item.id }));
        if (item.definitionId === 'raw_meat')
          actions.push(action(`cook-${item.id}`, 'Cook one', { type: 'cook', itemId: item.id }));
        for (const [key, recipe] of Object.entries(NATIVE_PREPARATIONS))
          if (recipe.input === item.definitionId)
            actions.push(
              action(
                `prepare-${key}`,
                key === 'fiber' ? 'Clean fibers' : 'Twist cord',
                { type: 'prepare', preparation: key as 'fiber' | 'cord' },
                item.quantity >= recipe.inputQuantity,
                `Requires ${recipe.inputQuantity}.`,
              ),
            );
        return {
          id: item.id,
          definitionId: item.definitionId,
          name: definition.name,
          quantity: item.quantity,
          category: definition.launcher
            ? 'equipment'
            : definition.ammunition
              ? 'ammunition'
              : definition.properties.includes('food')
                ? 'food'
                : 'material',
          description: definition.description,
          equipped: actor.equippedItemId === item.id,
          tags: [...definition.properties],
          actions,
        };
      }),
  );
  const entities: EntityView[] = observation.visibleEntities
    .filter((entity) => entity.id !== service.controlledEntityId)
    .map((entity) =>
      memo<EntityView>(
        `entity:${entity.id}`,
        [
          entity,
          world.itemDefinitions,
          active,
          paused,
          launcher,
          ammunition,
          observation.knownRecipes,
          player.position,
          world.map,
          actor.attributes,
          world.moduleManifest,
          world.statusEffectPolicy,
        ],
        () => {
          const actions: ActionOption[] = [];
          for (const option of statusEffectActions(world, player, entity)) {
            const preview = service.previewCommand(option.command);
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
              ? `${entity.name} cannot speak.`
              : !entity.actor.alive
                ? `${entity.name} is dead and cannot respond.`
                : entity.actor.incapacitated
                  ? `${entity.name} is incapacitated and cannot respond.`
                  : capabilityBlocked(world, entity, 'speech')
                    ? `${entity.name} cannot speak in their current state.`
                    : !hearsEntity(world, entity, player)
                      ? `Move within hearing range of ${entity.name} to talk.`
                      : undefined;
          if (entity.replenisher) {
            const definition = attributeDefinition(world, entity.replenisher.attributeId);
            if (definition?.reservoir && readAttribute(actor, definition) !== undefined) {
              const command = {
                type: 'replenish' as const,
                targetId: entity.id,
                attributeId: definition.id,
              };
              const preview = service.previewCommand(command);
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
          const kind: EntityView['kind'] = entity.remains
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
            name: entity.name,
            description: describeEntity(entity, world.itemDefinitions),
            ...(entity.actor?.traits ? { traits: entity.actor.traits.map((t) => ({ ...t })) } : {}),
            kind,
            subtype: entity.actor?.species ?? entity.resource?.definitionId ?? entity.kind,
            position: entity.position,
            supportSurfaceId: entity.spatial.supportSurfaceId,
            heading: entity.spatial.heading,
            appearance: entity.appearance ?? 'sprite',
            radius: entity.kind === 'campfire' ? 0.5 : 0.35,
            ...(entity.actor
              ? {
                  speechCapable,
                  canTalk: !talkUnavailableReason,
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
    [world.events, world.experience?.awareness[service.controlledEntityId]],
    () => {
      const awareness = world.experience?.awareness[service.controlledEntityId];
      const visible = awareness
        ? awareness
            .slice(-512)
            .reverse()
            .map((entry) => service.worldEvent(entry.eventId))
            .filter((event) => event !== undefined)
        : world.events
            .slice(-512)
            .reverse()
            .filter((event) => event.audience.includes(service.controlledEntityId));
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
    'usage',
    memo('usage', [telemetryRevision], () => service.store.usage(service.config.budgetUsd)),
    {
      budget: { limitUsd: service.config.budgetUsd, spentUsd: 0, reservedUsd: 0, estimated: true },
      usage: { jevCalls: 0, llmCalls: 0, inputTokens: 0, outputTokens: 0, lastLatencyMs: 0 },
    },
  );
  const jobs = optional(
    service,
    'jobs',
    memo('jobs', [telemetryRevision], async () =>
      (await service.store.recentJobs()).filter(
        (job) =>
          !job.request.invention || job.request.invention.actorId === service.controlledEntityId,
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
  const conversationId = world.conversations?.active[service.controlledEntityId];
  const conversationEntries = events
    .filter((event) => !conversationId || event.conversationId === conversationId)
    .filter((event) => isConversationEvent(event))
    .slice(-30);
  // Text is authoritative in memory; optional job reads must never hide it while refreshing.
  // See docs/architecture.md#performance-critical-path.
  const replies = optional(
    service,
    'speechJobs',
    memo('speechJobs', [service.historyEpoch, telemetryRevision, ...conversationEntries], () =>
      service.store.getSpeechJobs(
        conversationEntries
          .filter((event) => event.actorId === service.controlledEntityId)
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
      const preview = service.previewCommand(option.command);
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
    historyRevision: service.historyRevision,
    historyEpoch: service.historyEpoch,
    narrator: optional(
      service,
      'narrator',
      memo(
        'narrator',
        [service.historyRevision, telemetryRevision],
        () =>
          service.store.history?.latestNarration(world.id, service.profile.id) ??
          Promise.resolve(null),
      ),
      null,
    ),
    revision,
    worldId: world.id,
    saveTimeline: service.timelineId,
    commandEpoch: service.commandEpoch,
    godMode: service.config.godMode,
    inventionPolicy: {
      revision: world.inventionPolicy.revision,
      playerLocked: world.inventionPolicy.playerLocked,
      agentLocked: world.inventionPolicy.agentLocked,
    },
    ...(service.config.godMode
      ? {
          godTools: {
            traits: TRAIT_BANK.map((trait) => ({ ...trait })),
            spawnOptions: GOD_SPAWN_OPTIONS.map((option) => ({ ...option })),
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
      id: player.id,
      name: player.name,
      position: player.position,
      supportSurfaceId: player.spatial.supportSurfaceId,
      heading: player.spatial.heading,
      attributes: projectAttributes(world, player, 'owner'),
      health: actor.health,
      actionAnimation: actionAnimation(world, player),
      hunger: actor.fullness === undefined ? undefined : 100 - actor.fullness,
      energy: actor.energy,
      alive: actor.alive,
      statusEffects: projectStatusEffects(world, player),
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
      memories: memo<GameView['player']['memories']>(
        'memories',
        [
          world.memories[player.id],
          world.experience?.awareness[player.id],
          world.experience?.summaries[player.id],
          world.experience?.forgotten[player.id],
          world.experience?.corrections?.[player.id],
        ],
        () =>
          experiences(world, player.id)
            .sort((a, b) => a.at - b.at)
            .slice(-20)
            .map((m) => ({ id: m.id, text: `[${m.source}] ${m.summary}`, time: m.at })),
      ),
      history: `Your life in this clearing began on Day 1. You have lived here for ${Math.floor(world.simTime / 86400)} full days.`,
      inventory,
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
      // See docs/architecture.md#react-ui-and-design-system.
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
        speaker: world.entities[event.actorId!]?.name ?? 'Someone',
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
            ? 'Configure backend AI credentials and a spending cap. Macrofold also needs a nonzero MACROFOLD_COMPUTE_MAX_USD for warm compute.'
            : (latestProblem?.message ??
              'Jev routes bounded decisions. LLMs handle conversation, reconsideration and new recipes.'),
      jobs,
      ...usage,
    },
    milestones: [
      {
        id: 'talk',
        label: 'Talk with Ada',
        done: events.some(
          (event) => event.type === 'speech' && event.actorId !== service.controlledEntityId,
        ),
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
        done: events.some(
          (event) => event.type === 'harvested' && event.actorId === service.controlledEntityId,
        ),
      },
      {
        id: 'eat',
        label: 'Cook and eat a meal',
        done: events.some(
          (event) =>
            event.type === 'ate' &&
            event.actorId === service.controlledEntityId &&
            /meat/i.test(event.text),
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
      status: storageError || memoryBacklog ? 'error' : 'saved',
      message: storageError ?? memoryBacklog ?? 'Saved locally · the world pauses when you leave',
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
