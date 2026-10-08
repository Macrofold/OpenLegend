import { canAccessContainer } from './object-access.js';
import { itemFor } from './objects.js';
import { getOwn } from './records.js';
import { outcome } from './events.js';
import { currentInventoryInspection } from './inventory-inspection.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { recipeMechanicalPin, validateInstalledRecipe } from './invention-families.js';
import type { Command, WorldState } from './types.js';
import { WorkBudgetError } from './work-budget.js';

/** Resolve access before method facts: knowing a record's ID never opens its container.
 * docs/worlds/base/rewarding-expeditions.md#rewards-worth-using */
export function readRecipeRecord(world: WorldState, actorId: string, itemId: string) {
  const item = itemFor(world, itemId);
  if (!item || !canAccessContainer(world, actorId, item.ownerId))
    return outcome(false, 'record-unavailable', 'Reach and inspect an accessible recipe record.');
  const definition = getOwn(world.itemDefinitions, item.definitionId);
  const record = definition?.recipeRecord;
  if (!record || record.disclosure !== 'method')
    return outcome(false, 'record-unavailable', 'This item cannot disclose a production method.');
  const recipe = getOwn(world.recipes, record.method.id);
  if (!recipe || !sameDefinitionPin(record.method, recipeMechanicalPin(recipe)))
    return outcome(
      false,
      'method-unavailable',
      'The exact method on this record is no longer installed.',
    );
  try {
    validateInstalledRecipe(world, recipe);
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return outcome(
      false,
      'method-unavailable',
      'The recorded method has an unavailable or changed dependency.',
    );
  }
  return { item, definition, recipe };
}

/** Choices come only from the page the actor deliberately inspected. */
export function inspectedRecipeRecords(world: WorldState, actorId: string) {
  return (currentInventoryInspection(world, actorId)?.itemIds ?? []).flatMap((itemId) => {
    if (!world.itemDefinitions[itemFor(world, itemId)?.definitionId ?? '']?.recipeRecord) return [];
    const read = readRecipeRecord(world, actorId, itemId);
    if (!('recipe' in read)) return [];
    const command: Omit<Extract<Command, { type: 'learn-record' }>, 'actorId' | 'id'> = {
      type: 'learn-record',
      itemId,
      expectedRevision: read.item.revision!,
      placementRevision: read.item.placementRevision!,
      recordPin: definitionPin(read.definition),
    };
    return [{ ...read, command }];
  });
}

/** Shared read-only admission; it allocates no receipt, grants and changes nothing. */
export function prepareRecipeLearning(
  world: WorldState,
  command: Extract<Command, { type: 'learn-record' }>,
) {
  const read = readRecipeRecord(world, command.actorId, command.itemId);
  if (!('recipe' in read)) return read;
  if (
    read.item.revision !== command.expectedRevision ||
    read.item.placementRevision !== command.placementRevision ||
    !sameDefinitionPin(definitionPin(read.definition), command.recordPin)
  )
    return outcome(false, 'stale-record', 'The selected record changed. Inspect it again.');
  if (!currentInventoryInspection(world, command.actorId)?.itemIds.includes(command.itemId))
    return outcome(
      false,
      'record-uninspected',
      'Inspect this accessible record before learning its method.',
    );
  return read;
}
