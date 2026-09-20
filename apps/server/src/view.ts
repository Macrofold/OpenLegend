import type { ActionOption, EntityView, GameView, InventoryItemView } from '@open-legend/protocol';
import {
  NATIVE_PREPARATIONS,
  PERCEPTION_RULES,
  canHear,
  canRecoverAtCamp,
} from '@open-legend/domain';
import type { WorldService } from './world-service.js';

/** This explicit projection is a security boundary: never serialize WorldState to the browser. */
export function projectView(
  service: WorldService,
  executionSource: 'live-model' | 'test-fixture' = 'live-model',
): GameView {
  const world = service.world;
  const observation = service.observe('player')!;
  const player = world.entities['player']!;
  const actor = player.actor!;
  const quantity = (definitionId: string) =>
    observation.inventory
      .filter((item) => item.definitionId === definitionId)
      .reduce((sum, item) => sum + item.quantity, 0);
  const active = !service.paused && actor.alive && !actor.incapacitated;
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
          reason: service.paused
            ? 'Resume the world to act.'
            : 'You cannot act in your current condition.',
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
  const inventory: InventoryItemView[] = observation.inventory.map((item) => {
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
  });
  const entities: EntityView[] = observation.visibleEntities
    .filter((entity) => entity.id !== 'player')
    .map((entity) => {
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
              ? entity.actor.action.type
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
    });
  const events = world.events.filter((event) => event.audience.includes('player'));
  const usage = service.store.usage(service.config.budgetUsd);
  const jobs = service.store
    .recentJobs()
    .map(({ id, kind, status, message, queueLatencyMs, totalLatencyMs }) => ({
      id,
      kind,
      status,
      // Operational telemetry must not reveal a resident's private selected plan.
      message: kind === 'thought' ? `Resident reconsideration: ${status}.` : message,
      queueLatencyMs,
      totalLatencyMs,
    }));
  const jevConfigured = service.config.macrofoldKey
    ? service.config.macrofoldComputeUsd > 0
    : !!service.config.jevKey;
  const llmConfigured = service.config.macrofoldKey
    ? service.config.macrofoldComputeUsd > 0
    : !!service.config.llmKey;
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
      enabled: !service.paused,
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
    revision: service.version,
    worldId: world.id,
    profile: service.profile,
    vision: { radius: PERCEPTION_RULES.sightRadius },
    map: {
      ...world.map,
      seed: world.seed,
      obstacles: world.map.tiles.flatMap((row, z) =>
        row.flatMap((tile, x) => (tile === 'rock' ? [{ x, z, radius: 0.52, kind: 'rock' }] : [])),
      ),
    },
    clock: {
      seconds: world.simTime,
      day: Math.floor(world.simTime / 86400) + 1,
      hour: (8 + world.simTime / 3600) % 24,
      speed: service.speed,
      baseRatio: service.config.baseRatio,
      paused: service.paused,
      pauseReason: service.pauseReason,
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
            advancing: !service.paused && actor.action.stage === 'working',
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
      inventory,
      actions: playerActions,
    },
    entities,
    recipes: observation.knownRecipes.map((recipe) => {
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
    events: events
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
    conversation: events
      .filter((event) => event.type === 'speech')
      .slice(-30)
      .map((event) => ({
        id: event.id,
        ...(event.actorId === 'player'
          ? { replyStatus: service.store.getSpeechJob(event.id)?.status }
          : {}),
        speakerId: event.actorId!,
        speaker: world.entities[event.actorId!]?.name ?? 'Someone',
        text: String(event.data?.['text'] ?? event.text),
        time: event.at,
      })),
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
      done: milestone.done || service.milestones[milestone.id] === true,
    })),
    persistence: {
      status: service.storageError ? 'error' : 'saved',
      message: service.storageError ?? 'Saved locally · the world pauses when you leave',
    },
  };
}
