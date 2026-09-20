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
  PERCEPTION_RULES,
  canHear,
  canSee,
  inventoryFor,
  canRecoverAtCamp,
  GOD_SPAWN_OPTIONS,
  TRAIT_BANK,
} from '@open-legend/domain';
import { describeEntity } from './entity-description.js';
import type { WorldService } from './world-service.js';

const projections = new WeakMap<WorldService, Map<string, { deps: unknown[]; value: unknown }>>();
function memoizer(service: WorldService) {
  let cache = projections.get(service);
  if (!cache) projections.set(service, (cache = new Map()));
  return <T>(key: string, deps: unknown[], build: () => T): T => {
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
    inventory: memo('ownedItems', [world.items], () => inventoryFor(world, 'player')),
    visibleEntities: memo('visibleEntities', [world.entities], () =>
      Object.values(world.entities).filter(
        (entity) =>
          entity.id !== 'player' && canSee(world.entities['player']!.position, entity.position),
      ),
    ),
    knownRecipes: memo('knownRecipes', [world.knowledge['player'], world.recipes], () =>
      (world.knowledge['player'] ?? [])
        .map((record) => world.recipes[record.recipeId])
        .filter((recipe) => !!recipe),
    ),
  };
  const player = world.entities['player']!;
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
    [observation.inventory, world.itemDefinitions, actor.equippedItemId, active, paused],
    () =>
      observation.inventory.map((item) => {
        const definition = world.itemDefinitions[item.definitionId]!;
        const actions: ActionOption[] = [];
        if (definition.launcher)
          actions.push(action(`equip-${item.id}`, 'Equip', { type: 'equip', itemId: item.id }));
        if (definition.nutrition)
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
    .filter((entity) => entity.id !== 'player')
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
        ],
        () => {
          const actions: ActionOption[] = [];
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
          if (entity.animal?.alive)
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
          if (entity.kind === 'npc')
            for (const recipe of observation.knownRecipes)
              actions.push(
                action(`teach-${recipe.id}`, `Teach ${recipe.name}`, {
                  type: 'teach',
                  targetId: entity.id,
                  recipeId: recipe.id,
                }),
              );
          const kind: EntityView['kind'] = entity.actor
            ? 'actor'
            : entity.remains
              ? 'remains'
              : entity.animal
                ? 'animal'
                : entity.resource
                  ? 'resource'
                  : 'station';
          return {
            id: entity.id,
            name: entity.name,
            description: describeEntity(entity, world.itemDefinitions),
            ...(entity.actor?.traits ? { traits: entity.actor.traits.map((t) => ({ ...t })) } : {}),
            kind,
            subtype: entity.animal?.species ?? entity.resource?.definitionId ?? entity.kind,
            position: entity.position,
            radius: entity.kind === 'campfire' ? 0.5 : 0.35,
            ...(entity.actor
              ? { canTalk: entity.actor.alive && canHear(world, player.position, entity.position) }
              : {}),
            status: entity.actor
              ? !entity.actor.alive
                ? 'Dead'
                : entity.actor.action
                  ? ({
                      move: 'Walking',
                      gather: 'Gathering',
                      rest: 'Resting',
                      hunt: 'Hunting',
                      harvest: 'Harvesting',
                      cook: 'Cooking',
                      prepare: 'Preparing',
                      craft: 'Crafting',
                    }[entity.actor.action.type] ?? 'Working')
                  : 'Watching the clearing'
              : entity.animal
                ? !entity.animal.alive
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
                    : 'Gatherable',
            ...(entity.resource ? { quantity: entity.resource.quantity } : {}),
            ...(entity.animal ? { health: entity.animal.health } : {}),
            actions,
          };
        },
      ),
    );
  const events = memo(
    'visibleEvents',
    [world.events, world.experience?.awareness['player']],
    () => {
      const aware = new Set(world.experience?.awareness['player']?.map((a) => a.eventId));
      return world.events.filter((event) =>
        world.experience ? aware.has(event.id) : event.audience.includes('player'),
      );
    },
  );
  const usage = await memo('usage', [telemetryRevision], () =>
    service.store.usage(service.config.budgetUsd),
  );
  const jobs = (await memo('jobs', [telemetryRevision], () => service.store.recentJobs())).map(
    ({ id, kind, status, message, queueLatencyMs, totalLatencyMs }) => ({
      id,
      kind,
      status,
      // Operational telemetry must not reveal a resident's private selected plan.
      message: kind === 'thought' ? `Resident reconsideration: ${status}.` : message,
      queueLatencyMs,
      totalLatencyMs,
    }),
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
    action('rest', 'Rest', { type: 'rest' }),
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
    rest: 'Resting',
    gather: `Gathering${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    harvest: `Harvesting${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    hunt: `Hunting${targetName ? ` ${targetName.toLowerCase()}` : ''}`,
    cook: 'Cooking meat',
    prepare: work?.preparation === 'fiber' ? 'Cleaning fibers' : 'Twisting cord',
    craft: `Crafting${work?.recipeId && world.recipes[work.recipeId] ? ` ${world.recipes[work.recipeId]!.output.name}` : ''}`,
  };
  return {
    schemaVersion: 1,
    revision,
    worldId: world.id,
    godMode: service.config.godMode,
    ...(service.config.godMode
      ? {
          godTools: {
            traits: TRAIT_BANK.map((trait) => ({ ...trait })),
            spawnOptions: GOD_SPAWN_OPTIONS.map((option) => ({ ...option })),
          },
        }
      : {}),
    profile: profile,
    vision: { radius: PERCEPTION_RULES.sightRadius },
    map: memo<GameView['map']>('map', [world.map, world.seed], () => ({
      ...world.map,
      seed: world.seed,
      obstacles: world.map.tiles.flatMap((row, z) =>
        row.flatMap((tile, x) => (tile === 'rock' ? [{ x, z, radius: 0.52, kind: 'rock' }] : [])),
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
      health: actor.health,
      hunger: 100 - actor.fullness,
      energy: actor.energy,
      alive: actor.alive,
      action: actor.action
        ? {
            id: actor.action.id,
            // Floating progress is opt-in; routine movement never gets a status.
            showStatus:
              actor.action.stage === 'working' &&
              ['gather', 'prepare', 'craft', 'cook', 'harvest', 'rest', 'hunt'].includes(
                actor.action.type,
              ),
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
      [observation.knownRecipes, inventory, active, paused],
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
            name: recipe.name,
            description: recipe.description,
            family: recipe.output.launcher
              ? `${recipe.output.launcher.mechanism} launcher · ${recipe.output.launcher.ammunitionKind}`
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
        .filter((event) => {
          // Walking is routine journal noise. Retain internal events, and recognize
          // old saves whose action-started records predate structured action types.
          return !(
            event.type === 'action-started' &&
            (event.data?.['actionType'] === 'move' ||
              (event.data?.['actionType'] === undefined && event.text.endsWith(' started move.')))
          );
        })
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
    conversation: await memo<Promise<GameView['conversation']>>(
      'conversation',
      [
        events,
        telemetryRevision,
        ...Object.values(world.entities).flatMap((entity) => [entity.id, entity.name]),
      ],
      async () => {
        const entries = events
          .filter(
            (event) => event.type === 'speech' || typeof event.data?.['responseId'] === 'string',
          )
          .slice(-30);
        const replies = await service.store.getSpeechJobs(
          entries.filter((event) => event.actorId === 'player').map((event) => event.id),
        );
        return entries.map((event) => {
          const reply = replies.get(event.id);
          const legacyIdentityFailure =
            reply?.message === 'Models cannot author identity or seed provenance.' ||
            reply?.message ===
              "Generated memories cannot change a character's fixed identity or claim to be part of their authored starting history.";
          const terminalFailure =
            legacyIdentityFailure ||
            (reply !== undefined && ['failed', 'cancelled', 'stale'].includes(reply.status));
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
                  ...(replyStatus === 'failed' ? { replyFailure: replyMessage } : {}),
                }
              : {}),
            speakerId: event.actorId!,
            speaker: world.entities[event.actorId!]?.name ?? 'Someone',
            text: String(event.data?.['text'] ?? event.text),
            time: event.at,
          };
        });
      },
    ),
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
        done: events.some((event) => event.type === 'speech' && event.actorId === 'ada'),
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
        done: events.some((event) => event.type === 'harvested' && event.actorId === 'player'),
      },
      {
        id: 'eat',
        label: 'Cook and eat a meal',
        done: events.some(
          (event) => event.type === 'ate' && event.actorId === 'player' && /meat/i.test(event.text),
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
    previous.schemaVersion !== next.schemaVersion ||
    previous.godMode !== next.godMode ||
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
    schemaVersion: 1,
    baseRevision: previous.revision,
    revision: next.revision,
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
