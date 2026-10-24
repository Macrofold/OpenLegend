import { craftCatalogueCategory } from '../../craft-catalogue.js';
import { carriedGatheringChoices } from '../../gathering.js';
import type {
  ActivityHostDescriptor,
  ActivityRequest,
  ActivityRequestChoice,
  ActivityRequestDescriptor,
} from '../../activity-hosts.js';
import type { Command, Outcome, WorldState } from '../../types.js';
import { compileWorkBatch, type WorkRequestPresentation } from '../../work-batches.js';
import { mealChoiceForItem } from '../../meals.js';
import { currentInventoryInspection } from '../../inventory-inspection.js';
import { accessiblePossession } from '../../object-access.js';
import { custodian } from '../../objects.js';
import { entityGet } from '../../entity-collection.js';
import { recipeMechanicalPin } from '../../invention-families.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import { outcome } from '../../events.js';
import { observeActor } from '../../kernel.js';
import { definitionPin } from '../../world-modules.js';

function requestsFor(world: WorldState): ActivityRequestDescriptor[] {
  const work = world.workBatchPolicy,
    text = work?.presentation,
    meal = world.moduleManifest.bodyPolicy?.consumption?.meal;
  if (!work || !text) return [];
  const mode = { type: 'mode' as const, label: text.modeLabel, required: true as const },
    count = (label: string, maximum: number) => ({
      type: 'integer' as const,
      label,
      minimum: 1,
      maximum,
      required: true as const,
    }),
    entity = (label: string) => ({ type: 'entity' as const, label, required: true as const });
  const presentation = ({ id, label, description }: WorkRequestPresentation['gather']) => ({
    id,
    label,
    description,
  });
  return [
    {
      ...presentation(text.gather),
      requires: ['gather'],
      fields: {
        sourceId: entity(text.gather.selectionLabel),
        instrumentId: entity(work.toolLabel),
        batches: count(work.countLabel, work.maximumBatches),
        mode,
      },
    },
    {
      ...presentation(text.craft),
      requires: ['craft'],
      fields: {
        recipeId: {
          type: 'definition',
          definitionKind: 'recipe',
          label: text.craft.selectionLabel,
          required: true,
        },
        batches: count(work.countLabel, work.maximumBatches),
        mode,
      },
    },
    ...(meal
      ? [
          {
            ...presentation(text.meal),
            requires: ['eat'],
            fields: {
              sourceId: entity(text.meal.selectionLabel),
              definitionId: {
                type: 'definition',
                definitionKind: 'item',
                label: text.foodLabel,
                required: true,
              },
              units: count(meal.countLabel, meal.maximumUnits),
              mode,
            },
          } as ActivityRequestDescriptor,
        ]
      : []),
  ];
}
function bind(
  world: WorldState,
  actorId: string,
  id: string,
  request: ActivityRequest,
  permitted?: readonly string[],
): Command | Outcome {
  const text = world.workBatchPolicy?.presentation;
  if (!text)
    return outcome(
      false,
      'unsupported-activity',
      'This world does not support that requested activity.',
    );
  const args = request.arguments,
    kind =
      request.family === text.gather.id
        ? 'gather'
        : request.family === text.craft.id
          ? 'craft'
          : request.family === text.meal.id
            ? 'meal'
            : undefined;
  const fields =
    kind === 'craft'
      ? ['recipeId', 'batches', 'mode']
      : kind === 'meal'
        ? ['sourceId', 'definitionId', 'units', 'mode']
        : ['sourceId', 'instrumentId', 'batches', 'mode'];
  if (
    !kind ||
    !hasRecordFields(args, fields) ||
    !['enqueue', 'replace', 'interrupt'].includes(String(args.mode))
  )
    return outcome(
      false,
      'finite-work-request',
      'Choose a supported finite request and all of its parameters.',
    );
  const mode = args.mode as 'enqueue' | 'replace' | 'interrupt';
  if (kind === 'craft') {
    const known =
      typeof args.recipeId === 'string' &&
      world.knowledge[actorId]?.some((record) => record.recipeId === args.recipeId);
    const recipe = known && typeof args.recipeId === 'string' && world.recipes[args.recipeId];
    if (!recipe) return outcome(false, 'unknown-method', 'Choose a personally known method.');
    return compileWorkBatch(world, actorId, id, {
      selection: { kind, recipe: recipeMechanicalPin(recipe) },
      batches: args.batches as number,
      mode,
    });
  }
  if (
    !isSafeRecordId(args.sourceId) ||
    (permitted && args.sourceId !== actorId && !permitted.includes(args.sourceId))
  )
    return outcome(false, 'unpermitted-source', 'Choose a personally permitted source.');
  if (kind === 'gather') {
    if (
      !isSafeRecordId(args.instrumentId) ||
      (permitted && args.instrumentId !== actorId && !permitted.includes(args.instrumentId))
    )
      return outcome(
        false,
        'unpermitted-instrument',
        'Choose your own hands or one permitted carried tool.',
      );
    return compileWorkBatch(world, actorId, id, {
      selection: {
        kind,
        targetId: args.sourceId,
        ...(args.instrumentId === actorId
          ? { gatheringMode: 'bare-hands' }
          : { itemId: args.instrumentId }),
      },
      batches: args.batches as number,
      mode,
    });
  }
  const food = typeof args.definitionId === 'string' && world.itemDefinitions[args.definitionId];
  if (!food)
    return outcome(
      false,
      'meal-stock-unavailable',
      'Choose an available food in the selected own-stock location.',
    );
  return compileWorkBatch(world, actorId, id, {
    selection: { kind, sourceId: args.sourceId, food: definitionPin(food) },
    batches: args.units as number,
    mode,
  });
}
function choice(
  world: WorldState,
  actorId: string,
  family: string,
  field: string,
  id: string,
  knownIds?: ReadonlySet<string>,
): ActivityRequestChoice | undefined {
  const work = world.workBatchPolicy,
    text = work?.presentation;
  if (!work || !text) return;
  if (family === text.gather.id && field === 'sourceId') {
    const source = entityGet(world.entities, id);
    if (!source?.resource || source.resource.cast) return;
    return {
      id,
      label: `${source.name}: ${source.resource.workSeconds} game seconds per batch plus walking; ${source.resource.quantity} ${world.itemDefinitions[source.resource.definitionId]!.name} remain.`,
      kind: 'entity',
      roles: [field],
      requestIds: [family],
      accessible: true,
    };
  }
  if (family === text.gather.id && field === 'instrumentId') {
    if (id === actorId)
      return {
        id,
        label: work.handsLabel,
        kind: 'entity',
        roles: [field],
        requestIds: [family],
        accessible: true,
      };
    const selected = carriedGatheringChoices(world, actorId).find((tool) => tool.item.id === id);
    if (selected)
      return {
        id,
        label: `${selected.definition.name} (up to ${selected.quantity} per compatible collection)`,
        kind: 'entity',
        roles: [field],
        requestIds: [family],
        accessible: true,
      };
    return;
  }
  if (family === text.craft.id && field === 'recipeId') {
    const recipe = world.recipes[id];
    if (
      !recipe ||
      !(knownIds
        ? knownIds.has(id)
        : world.knowledge[actorId]?.some((record) => record.recipeId === id))
    )
      return;
    const category = craftCatalogueCategory(world, recipe);
    return {
      id,
      label: `${category?.label ? `${category.label}: ` : ''}${recipe.name}; ${recipe.workSeconds} game seconds per batch; spends ${recipe.inputs.map((input) => `${input.quantity} ${world.itemDefinitions[input.definitionId]!.name}`).join(', ')}; makes ${recipe.outputs.map((output) => `${output.quantity} ${world.itemDefinitions[output.definition.id]!.name}`).join(', ')}${recipe.retainedTools.length ? `; keeps ${recipe.retainedTools.map((tool) => `${tool.quantity} ${tool.allowedDefinitions.map((pin) => world.itemDefinitions[pin.id]!.name).join(' or ')}`).join(', ')}` : ''}.`,
      kind: 'definition',
      roles: [field],
      requestIds: [family],
      accessible: true,
    };
  }
  if (family === text.meal.id && field === 'sourceId') {
    const source = entityGet(world.entities, id),
      inspected = currentInventoryInspection(world, actorId);
    if (
      id !== actorId &&
      (!source?.container || custodian(world, id) !== actorId || inspected?.containerId !== id)
    )
      return;
    if (!source) return;
    return {
      id,
      label: source.name,
      kind: 'entity',
      roles: [field],
      requestIds: [family],
      accessible: true,
    };
  }
  if (family === text.meal.id && field === 'definitionId') {
    const selected = mealChoiceForItem(world, actorId, id);
    if (!selected) return;
    return {
      id: selected.selection.food.id,
      label: selected.label,
      kind: 'definition',
      roles: [field],
      requestIds: [family],
      accessible: true,
    };
  }
}
/** Only parameter choices: native admission and voluntary character selection retain
 * control. This installs no automatic gathering/eating goal or second work queue. */
export const BASE_WORK_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'base:finite-survival-requests',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: [],
    deadlineSafeCommands: [],
  },
  requestDescriptors: requestsFor,
  compileRequest: bind,
  requestChoice: choice,
  requestChoices(world, actorId, prepared) {
    const work = world.workBatchPolicy,
      text = work?.presentation;
    if (!work || !text) return { choices: [], warnings: [] };
    const observed = prepared ?? observeActor(world, actorId),
      choices: ActivityRequestChoice[] = [],
      warnings: string[] = [];
    if (!observed) return { choices, warnings };
    for (const source of observed.visibleEntities) {
      const selected = choice(world, actorId, text.gather.id, 'sourceId', source.id);
      if (selected) choices.push(selected);
    }
    choices.push({
      id: actorId,
      label: work.handsLabel,
      kind: 'entity',
      roles: ['instrumentId'],
      requestIds: [text.gather.id],
      accessible: true,
    });
    for (const selected of carriedGatheringChoices(
      world,
      actorId,
      undefined,
      undefined,
      observed.inventory,
    ))
      choices.push({
        id: selected.item.id,
        label: `${selected.definition.name} (up to ${selected.quantity} per compatible collection)`,
        kind: 'entity',
        roles: ['instrumentId'],
        requestIds: [text.gather.id],
        accessible: true,
      });
    const known = world.knowledge[actorId] ?? [],
      knownIds = new Set(known.map((record) => record.recipeId));
    for (const id of knownIds) {
      const selected = choice(world, actorId, text.craft.id, 'recipeId', id, knownIds);
      if (selected) choices.push(selected);
    }
    const sources = [actorId, currentInventoryInspection(world, actorId)?.containerId].filter(
        (id): id is string => !!id,
      ),
      admitted = new Set<string>();
    for (const id of sources) {
      const selected = choice(world, actorId, text.meal.id, 'sourceId', id);
      if (selected && !admitted.has(id)) {
        choices.push(selected);
        admitted.add(id);
      }
    }
    const foods = new Set<string>();
    for (const item of observed.inventory) {
      if (!admitted.has(item.ownerId) || !accessiblePossession(world, actorId, item.id)) continue;
      const selected = choice(world, actorId, text.meal.id, 'definitionId', item.id);
      if (selected && !foods.has(selected.id)) {
        choices.push(selected);
        foods.add(selected.id);
      }
    }
    return { choices, warnings };
  },
};
