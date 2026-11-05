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
import { recipeRequestDescription } from './activity-descriptions.js';

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
    entity = (label: string) => ({
      type: 'entity' as const,
      label,
      required: true as const,
      discovery: { source: 'choices' as const },
    });
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
        instrumentId: { ...entity(work.toolLabel), dependencies: ['sourceId'] },
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
          discovery: { source: 'definitions' },
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
                dependencies: ['sourceId'],
                discovery: { source: 'choices' },
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
      label: `${category?.label ? `${category.label}: ` : ''}${recipeRequestDescription(world, recipe)}`,
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
  requestChoice(world, actorId, family, field, id) {
    return choice(world, actorId, family, field, id);
  },
  requestChoices(world, actorId, prepared, query, families) {
    const work = world.workBatchPolicy,
      text = work?.presentation;
    if (!work || !text) return { choices: [], warnings: [] };
    const observed = prepared ?? observeActor(world, actorId, { includeMemories: false }),
      choices: ActivityRequestChoice[] = [],
      warnings: string[] = [];
    if (!observed) return { choices, warnings };
    const wants = (family: string, field: string) =>
      (!families || families.includes(family)) &&
      (!query || (query.family === family && query.field === field));
    if (wants(text.gather.id, 'sourceId'))
      for (const source of observed.visibleEntities) {
        const selected = choice(world, actorId, text.gather.id, 'sourceId', source.id);
        if (selected) choices.push(selected);
      }
    if (wants(text.gather.id, 'instrumentId')) {
      choices.push({
        id: actorId,
        label: work.handsLabel,
        kind: 'entity',
        roles: ['instrumentId'],
        requestIds: [text.gather.id],
        accessible: true,
      });
      const selectedSource =
        typeof query?.arguments.sourceId === 'string'
          ? entityGet(world.entities, query.arguments.sourceId)?.resource?.definitionId
          : undefined;
      for (const selected of carriedGatheringChoices(
        world,
        actorId,
        selectedSource,
        undefined,
        observed.inventory,
      ))
        choices.push({
          id: selected.item.id,
          label: `${selected.definition.name} (up to ${selected.quantity} per compatible collection; gathers ${world.itemDefinitions[selected.definition.gatheringTool!.resourceId]?.name ?? selected.definition.gatheringTool!.resourceId})`,
          kind: 'entity',
          roles: ['instrumentId'],
          requestIds: [text.gather.id],
          accessible: true,
        });
    }
    if (wants(text.craft.id, 'recipeId')) {
      const known = world.knowledge[actorId] ?? [],
        knownIds = new Set(known.map((record) => record.recipeId));
      for (const id of knownIds) {
        const selected = choice(world, actorId, text.craft.id, 'recipeId', id, knownIds);
        if (selected) choices.push(selected);
      }
    }
    if (wants(text.meal.id, 'sourceId') || wants(text.meal.id, 'definitionId')) {
      const sources = [actorId, currentInventoryInspection(world, actorId)?.containerId].filter(
          (id): id is string => !!id,
        ),
        admitted = new Set<string>();
      for (const id of sources) {
        const selected = choice(world, actorId, text.meal.id, 'sourceId', id);
        if (selected && !admitted.has(id)) {
          if (wants(text.meal.id, 'sourceId')) choices.push(selected);
          admitted.add(id);
        }
      }
      if (wants(text.meal.id, 'definitionId')) {
        const foods = new Set<string>();
        for (const item of observed.inventory) {
          if (!accessiblePossession(world, actorId, item.id)) continue;
          const selected = choice(world, actorId, text.meal.id, 'definitionId', item.id);
          if (!selected) continue;
          // Preserve distinct known stock scopes. A dependent field reads only
          // its selected source; metadata discovery never expands source tuples.
          for (const sourceId of [
            actorId,
            ...(item.ownerId !== actorId && admitted.has(item.ownerId) ? [item.ownerId] : []),
          ]) {
            if (query && query.arguments.sourceId !== sourceId) continue;
            const key = JSON.stringify([sourceId, selected.id]);
            if (foods.has(key)) continue;
            choices.push({ ...selected, requires: { sourceId } });
            foods.add(key);
          }
        }
      }
    }
    return { choices, warnings };
  },
};
