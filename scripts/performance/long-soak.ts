import { entityGet } from '../../packages/domain/src/index.js';
import {
  createItemLot,
  directChildIds,
  gatheringYield,
  itemFor,
  PLAYER_ID,
  type WorldState,
} from '@open-legend/domain';
import { NATIVE_PREPARATIONS } from '../../packages/domain/src/worlds/base/items.js';

export interface RoutineResource {
  actorId: string;
  id: string;
  type: string;
  quantity: number;
}

/** Finite initial diagnostic stock; the ordinary engine still owns all later use. */
export function prepareLongSoak(
  world: WorldState,
  resources: RoutineResource[],
  seconds: number,
  baseRatio: number,
) {
  const sleep = world.statusEffectPolicy.definitions.find(
    (definition) => definition.id === 'wilderness:restorative-rest',
  );
  const restoration = sleep?.whileActive.find((operation) => 'changeRate' in operation);
  if (!restoration || !('changeRate' in restoration))
    throw new Error('Missing installed rest rate.');
  const energyAttributeId = restoration.changeRate.attribute;
  const energy = world.moduleManifest.definitions.find(
    (definition) => definition.id === energyAttributeId,
  );
  const consumption = world.moduleManifest.bodyPolicy?.consumption;
  const foodAttributeId = consumption?.attributeId;
  const food = world.moduleManifest.definitions.find(
    (definition) => definition.id === foodAttributeId,
  );
  const foodDefinitionId = 'berries';
  const nutrition = world.itemDefinitions[foodDefinitionId]?.nutrition;
  const drain = world.statusEffectPolicy.definitions
    .flatMap((definition) =>
      definition.whileActive.flatMap((operation) =>
        'changeRate' in operation &&
        operation.changeRate.attribute === foodAttributeId &&
        operation.changeRate.amount < 0
          ? [-operation.changeRate.amount]
          : [],
      ),
    )
    .reduce((sum, rate) => sum + rate, 0);
  if (!energy?.concern || food?.schema.kind !== 'number' || !nutrition || !drain)
    throw new Error(
      'Long soak requires current numeric food/energy and installed consumption rates.',
    );
  const gameSeconds = seconds * baseRatio * 3;
  const targets: Record<string, { fiber: string; berries: string }> = {};
  let minimumCycleSeconds = Infinity,
    maximumCycleSeconds = 0;
  for (const resource of resources) {
    const patch = entityGet(world.entities, resource.id)?.resource;
    if (!patch) throw new Error('A declared long-soak patch is missing.');
    const target = (targets[resource.actorId] ??= { fiber: '', berries: '' });
    target[patch.definitionId === 'raw_fiber' ? 'fiber' : 'berries'] = resource.id;
  }
  for (const target of Object.values(targets)) {
    const cycle =
      entityGet(world.entities, target.fiber)!.resource!.workSeconds +
      NATIVE_PREPARATIONS.fiber.workSeconds +
      NATIVE_PREPARATIONS.cord.workSeconds +
      entityGet(world.entities, target.berries)!.resource!.workSeconds;
    minimumCycleSeconds = Math.min(minimumCycleSeconds, cycle);
    maximumCycleSeconds = Math.max(maximumCycleSeconds, cycle);
  }
  const maximumCyclesPerActor = Math.ceil(gameSeconds / minimumCycleSeconds) + 1;
  for (const resource of resources) {
    const patch = entityGet(world.entities, resource.id)!.resource!;
    patch.quantity = maximumCyclesPerActor * gatheringYield([], patch.definitionId);
    resource.quantity = patch.quantity;
  }
  const initialFoodQuantity =
    Math.ceil((gameSeconds * drain + food.schema.max - food.schema.min) / nutrition) + 2;
  const foodLotId = createItemLot(world, PLAYER_ID, foodDefinitionId, initialFoodQuantity);
  return {
    gameSeconds,
    minimumCycleSeconds,
    maximumCycleSeconds,
    maximumCyclesPerActor,
    maximumWorkActionsIgnoringRest: maximumCyclesPerActor * Object.keys(targets).length * 5,
    resourceSchedule:
      'Each resident chooses its declared initially reachable patch only while visible and offered; standing work with no NPC approach travel, retargeting or replenishment.',
    assumptions:
      'Current no-tool gathering yields and fixed native preparation durations; walking/rest can only lengthen the cycle. No tool or learned activity is granted.',
    targets,
    energyConcernBelow: energy.concern.below,
    playerSurvival: {
      foodAttributeId: foodAttributeId!,
      energyAttributeId,
      sleepEffectId: sleep!.id,
      foodDefinitionId,
      initialFoodQuantity,
    },
    foodLotId,
    foodDrainPerGameSecond: drain,
    nutrition,
  };
}

export function soakInventory(world: WorldState, actorId: string) {
  const quantities: Record<string, number> = {};
  let lots = 0;
  for (const id of directChildIds(world, actorId)) {
    const item = itemFor(world, id);
    if (!item) continue;
    lots++;
    quantities[item.definitionId] = (quantities[item.definitionId] ?? 0) + item.quantity;
  }
  return { lots, quantities };
}
