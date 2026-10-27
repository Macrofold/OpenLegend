import { itemFor } from './objects.js';
import { accessiblePossession } from './object-access.js';
import type { ResourceAvailability } from './resource-claims.js';
import { applicableConsumption, bodyPolicy } from './body-policy.js';
import { entityGet } from './entity-collection.js';
import { outcome } from './events.js';
import { currentInventoryInspection } from './inventory-inspection.js';
import { isDefinitionPin } from './state-owners.js';
import { selectOwnConsumptionStock } from './stock-transfer.js';
import {
  attributeDefinition,
  definitionPin,
  readAttribute,
  type DefinitionPin,
} from './world-modules.js';
import { installedActivityHost } from './activity-hosts.js';
import type { WorkBatchRequest } from './work-batches.js';
import type { Command, Outcome, WorldState } from './types.js';

export type MealSelection = { kind: 'meal'; sourceId: string; food: DefinitionPin };
/** Read only the selected accessible possession; no future stock search. */
export function mealChoiceForItem(world: WorldState, actorId: string, itemId: string) {
  const actor = entityGet(world.entities, actorId),
    policy = actor && applicableConsumption(world, actor)?.meal,
    item = accessiblePossession(world, actorId, itemId) ? itemFor(world, itemId) : undefined,
    food = item && world.itemDefinitions[item.definitionId];
  return policy && item && food && food.nutrition! > 0
    ? {
        selection: { kind: 'meal' as const, sourceId: item.ownerId, food: definitionPin(food) },
        label: `${policy.mealLabel}: ${food.name}`,
        description: policy.help,
      }
    : undefined;
}
export function reviewMeal(
  world: WorldState,
  actorId: string,
  selection: MealSelection,
  availability?: ResourceAvailability,
) {
  const actor = entityGet(world.entities, actorId),
    body = bodyPolicy(world),
    consumption = actor && applicableConsumption(world, actor),
    policy = consumption?.meal;
  if (!policy || !body || !actor?.actor?.alive || !isDefinitionPin(selection.food))
    return outcome(false, 'meal-unavailable', 'This body has no supported meal selection.');
  if (
    selection.sourceId !== actorId &&
    currentInventoryInspection(world, actorId)?.containerId !== selection.sourceId
  )
    return outcome(
      false,
      'meal-stock-unavailable',
      'Inspect the chosen own container before selecting a new meal.',
    );
  const meter = attributeDefinition(world, consumption.attributeId),
    current = meter && readAttribute(world, actor, meter);
  if (meter?.schema.kind !== 'number' || typeof current !== 'number')
    return outcome(false, 'not-applicable', 'The consumption meter is unavailable.');
  const stock = selectOwnConsumptionStock(
    world,
    actorId,
    selection.sourceId,
    selection.food,
    policy.maximumUnits,
    availability,
  );
  if (!stock.available)
    return outcome(
      false,
      stock.status === 'incomplete' ? 'incomplete' : 'meal-stock-unavailable',
      stock.status === 'incomplete'
        ? 'The selected stock examination reached its limit before finding an available unit.'
        : 'Choose an available food in the selected own-stock location.',
    );
  // The stock owner proved a current exact definition in this accessible own scope.
  const food = world.itemDefinitions[selection.food.id]!;
  const refusal = consumption.refusals.find((entry) => entry.itemType === food.id);
  if (refusal || !(food.nutrition! > 0))
    return outcome(false, 'not-edible', refusal?.reason ?? consumption.unavailableText);
  const deficit = Math.max(0, meter.schema.max - current),
    nutrition = food.nutrition!;
  return {
    policy,
    body: definitionPin(body),
    food,
    meter,
    current,
    maximum: meter.schema.max,
    nutrition,
    available: stock.available,
    incomplete: stock.status === 'incomplete',
    atLeast: stock.status === 'incomplete' || stock.available >= policy.maximumUnits,
    suggested: Math.min(policy.maximumUnits, stock.available, Math.ceil(deficit / nutrition)),
  };
}
export function compileMeal(
  world: WorldState,
  actorId: string,
  id: string,
  request: WorkBatchRequest & { selection: MealSelection },
  availability?: ResourceAvailability,
): Command | Outcome {
  const review = reviewMeal(world, actorId, request.selection, availability);
  if ('ok' in review) return review;
  if (
    !Number.isSafeInteger(request.batches) ||
    request.batches < 1 ||
    request.batches > review.policy.maximumUnits
  )
    return outcome(false, 'meal-count', 'Choose a supported finite meal quantity.');
  if (review.current >= review.maximum)
    return outcome(
      false,
      'meal-full',
      `Already full; no meal is needed. ${review.policy.oneLabel} remains a deliberate single-unit choice.`,
    );
  if (!review.available)
    return outcome(
      false,
      review.incomplete ? 'incomplete' : 'meal-stock-empty',
      review.incomplete
        ? 'The selected stock examination reached its limit before finding an available unit. No complete absence is established.'
        : 'No available unit of the chosen food remains in this own-stock location.',
    );
  const host = world.moduleManifest.activityHosts.find(
    (pin) => pin.id === review.policy.conditionId,
  );
  if (!host || !installedActivityHost(world, host))
    return outcome(false, 'meal-unavailable', 'The selected meal stop condition is unavailable.');
  const requirements = [
    { kind: 'body-policy' as const, definition: review.body },
    { kind: 'item-definition' as const, definition: request.selection.food },
  ];
  const name = `${review.policy.mealLabel}: ${review.food.name} × ${request.batches}`;
  return {
    id,
    actorId,
    type: 'compose',
    selectionQuantity: {
      command: 'eat',
      requested: request.batches,
      unitLabel: review.policy.countLabel,
    },
    name,
    mode: request.mode,
    bindings: { self: actorId, stock: request.selection.sourceId },
    root: {
      kind: 'repeat',
      name,
      maximum: request.batches,
      finishAtMaximum: true,
      until: { test: 'registered', definition: host, role: 'self' },
      requirements,
      body: {
        kind: 'invoke',
        key: 'eat-unit',
        name: `${review.policy.oneLabel}: ${review.food.name}`,
        command: 'eat',
        requirements,
        args: {
          sourceId: { role: 'stock' },
          definitionId: { literal: review.food.id },
          definitionVersion: { literal: request.selection.food.version },
          definitionDigest: { literal: request.selection.food.digest },
          bodyPolicyId: { literal: review.body.id },
          bodyPolicyVersion: { literal: review.body.version },
          bodyPolicyDigest: { literal: review.body.digest },
        },
      },
    },
  };
}
