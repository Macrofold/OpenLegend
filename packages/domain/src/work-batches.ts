import { compileMeal } from './meals.js';
import {
  ACTIVITY_LIMITS,
  type ActivityBinding,
  type ActivityNode,
  type ActivityRequirement,
} from './action-experience.js';
import { prospectiveWork } from './action-capabilities.js';
import { entityGet } from './entity-collection.js';
import { outcome } from './events.js';
import { itemFor } from './objects.js';
import { accessiblePossession } from './object-access.js';
import { availableItemQuantity, resourcesAfterEnding } from './resource-claims.js';
import {
  chooseManufactureTools,
  prepareManufactureStock,
  validManufactureTools,
} from './manufacture.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { recipeMechanicalPin } from './invention-families.js';
import { gatheringYield, carriedGatheringChoices } from './gathering.js';
import { seesEntity } from './perception.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import type { Command, Outcome, WorldState } from './types.js';

export interface WorkRequestPresentation {
  modeLabel: string;
  foodLabel: string;
  gather: { id: string; label: string; description: string; selectionLabel: string };
  craft: { id: string; label: string; description: string; selectionLabel: string };
  meal: { id: string; label: string; description: string; selectionLabel: string };
}
export function validateWorkRequestPresentation(
  value: unknown,
): asserts value is WorkRequestPresentation {
  if (!hasRecordFields(value, ['modeLabel', 'foodLabel', 'gather', 'craft', 'meal']))
    throw new Error('Invalid authored finite-work request presentation.');
  const text = (value: unknown) =>
    typeof value === 'string' && !!value.trim() && value.length <= 500;
  if (!text(value.modeLabel) || !text(value.foodLabel)) throw new Error('Invalid request labels.');
  const ids = new Set<string>();
  for (const kind of ['gather', 'craft', 'meal'] as const) {
    const request = value[kind];
    if (
      !hasRecordFields(request, ['id', 'label', 'description', 'selectionLabel']) ||
      !isSafeRecordId(request.id) ||
      ids.has(request.id) ||
      !text(request.label) ||
      !text(request.description) ||
      !text(request.selectionLabel)
    )
      throw new Error('Invalid authored finite-work request.');
    ids.add(request.id);
  }
}

/** Installed request presentation enables existing native commands, never effects. */
export interface WorkBatchPolicy {
  presentation?: WorkRequestPresentation;
  id: string;
  version: number;
  maximumBatches: number;
  commands: Array<'gather' | 'craft'>;
  onceLabel: string;
  repeatLabel: string;
  countLabel: string;
  startLabel: string;
  gatherLabel: string;
  toolLabel: string;
  handsLabel: string;
  automaticToolLabel: string;
  help: string;
}
export function validateWorkBatchPolicy(value: unknown): asserts value is WorkBatchPolicy {
  if (
    !hasRecordFields(
      value,
      [
        'id',
        'version',
        'maximumBatches',
        'commands',
        'onceLabel',
        'repeatLabel',
        'countLabel',
        'startLabel',
        'gatherLabel',
        'toolLabel',
        'handsLabel',
        'automaticToolLabel',
        'help',
      ],
      ['presentation'],
    ) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    !Number.isSafeInteger(value.maximumBatches) ||
    Number(value.maximumBatches) < 1 ||
    Number(value.maximumBatches) > ACTIVITY_LIMITS.iterations ||
    !Array.isArray(value.commands) ||
    !value.commands.length ||
    value.commands.length > 2 ||
    new Set(value.commands).size !== value.commands.length ||
    value.commands.some((command) => !['gather', 'craft'].includes(command)) ||
    [
      'onceLabel',
      'repeatLabel',
      'countLabel',
      'startLabel',
      'gatherLabel',
      'toolLabel',
      'handsLabel',
      'automaticToolLabel',
      'help',
    ].some(
      (field) =>
        typeof value[field] !== 'string' ||
        !String(value[field]).trim() ||
        String(value[field]).length > ACTIVITY_LIMITS.text,
    )
  )
    throw new Error('Invalid installed finite-work selection policy.');
  if (value.presentation !== undefined) validateWorkRequestPresentation(value.presentation);
}
export type WorkBatchSelection =
  | import('./meals.js').MealSelection
  | { kind: 'gather'; targetId: string; itemId?: string; gatheringMode?: 'bare-hands' }
  | { kind: 'craft'; recipe: DefinitionPin; tools?: Record<string, string> };
export interface WorkBatchRequest {
  selection: WorkBatchSelection;
  batches: number;
  mode: 'enqueue' | 'replace' | 'interrupt';
}
/** Bind one selected source/method/tool, then let the existing executor dispatch
 * one real native operation at a time. Future nodes hold or spend no resources. */
export function compileWorkBatch(
  world: WorldState,
  actorId: string,
  id: string,
  request: WorkBatchRequest,
): Command | Outcome {
  const policy = world.workBatchPolicy,
    actor = entityGet(world.entities, actorId);
  const refuse = (message: string) => outcome(false, 'batch-choices', message);
  if (
    !policy ||
    !actor?.actor ||
    !request ||
    !Number.isSafeInteger(request.batches) ||
    request.batches < 1 ||
    (request.selection?.kind !== 'meal' && request.batches > policy.maximumBatches) ||
    !['enqueue', 'replace', 'interrupt'].includes(request.mode) ||
    !request.selection ||
    (request.selection.kind !== 'meal' && !policy.commands.includes(request.selection.kind))
  )
    return refuse('Choose a supported finite action, count and handling of current work.');
  const work = prospectiveWork(world, actorId, request.mode);
  if ('ok' in work) return work;
  if (!work.outcome.ok) return work.outcome;
  if (request.selection.kind === 'meal')
    return compileMeal(
      world,
      actorId,
      id,
      { ...request, selection: request.selection },
      resourcesAfterEnding(world, work.releasedInvocations),
    );
  const availability = resourcesAfterEnding(world, work.releasedInvocations),
    bindings: Record<string, ActivityBinding> = {},
    requirements: ActivityRequirement[] = [
      { kind: 'work-policy', definition: definitionPin(policy) },
    ];
  let name: string, invocation: Extract<ActivityNode, { kind: 'invoke' }>;
  const selection = request.selection;
  if (selection.kind === 'gather') {
    const source =
      isSafeRecordId(selection.targetId) && entityGet(world.entities, selection.targetId);
    if (!source || !seesEntity(world, actor, source))
      return refuse('Choose a personally visible source.');
    if (!source.resource || source.resource.cast)
      return refuse('Choose an ordinary finite gathering source.');
    const definition = world.itemDefinitions[source.resource.definitionId];
    if (!definition) return refuse('The selected source definition is unavailable.');
    if (
      (selection.gatheringMode !== undefined && selection.gatheringMode !== 'bare-hands') ||
      (selection.gatheringMode && selection.itemId)
    )
      return refuse('Choose bare hands or one exact carried tool.');
    const carried = carriedGatheringChoices(world, actorId, definition.id, availability);
    let chosen: import('./types.js').ItemInstance | undefined;
    if (selection.gatheringMode !== 'bare-hands')
      for (const choice of carried) {
        if (
          selection.itemId
            ? choice.item.id === selection.itemId
            : choice.quantity >
              (chosen
                ? world.itemDefinitions[chosen.definitionId]!.gatheringTool!.quantity
                : (world.gatheringPolicy?.bareHandQuantity ?? 0))
        )
          chosen = choice.item;
      }
    if (selection.itemId && !chosen)
      return refuse('The exact chosen gathering tool is unavailable.');
    bindings.source = source.id;
    requirements.push({
      kind: 'source',
      role: 'source',
      definition: definitionPin(definition),
      workSeconds: source.resource.workSeconds,
    });
    const args: Extract<ActivityNode, { kind: 'invoke' }>['args'] = {
      targetId: { role: 'source' },
      gatheringMode: { literal: chosen ? 'carried-tool' : 'bare-hands' },
    };
    if (chosen) {
      bindings.tool = chosen.id;
      args.itemId = { role: 'tool' };
      requirements.push({
        kind: 'item',
        role: 'tool',
        definition: definitionPin(world.itemDefinitions[chosen.definitionId]!),
      });
    }
    name = policy.gatherLabel.replaceAll('{source}', source.name);
    invocation = {
      kind: 'invoke',
      key: 'batch',
      name,
      command: 'gather',
      args,
      outputs: [
        {
          port: 'item',
          definitionId: definition.id,
          quantity: Math.max(
            1,
            gatheringYield(
              world,
              chosen ? [world.itemDefinitions[chosen.definitionId]] : [],
              definition.id,
            ),
          ),
        },
      ],
      requirements,
    };
  } else {
    if (!isDefinitionPin(selection.recipe)) return refuse('Choose the exact known method.');
    const recipe = world.recipes[selection.recipe.id];
    if (
      !world.knowledge[actorId]?.some((record) => record.recipeId === selection.recipe.id) ||
      !recipe ||
      !sameDefinitionPin(recipeMechanicalPin(recipe), selection.recipe)
    )
      return refuse('The selected method is no longer known with that definition.');
    if (
      selection.tools !== undefined &&
      (!validManufactureTools(selection.tools) ||
        Object.keys(selection.tools).some(
          (role) => !recipe.retainedTools.some((tool) => tool.role === role),
        ))
    )
      return refuse('Choose valid exact retained tools.');
    const tools =
      selection.tools ??
      (recipe.retainedTools.length
        ? chooseManufactureTools(
            world,
            actorId,
            recipe,
            prepareManufactureStock(world, actorId, availability),
          )
        : {});
    if (!tools) return refuse('The retained tools required by this method are unavailable.');
    const args: Extract<ActivityNode, { kind: 'invoke' }>['args'] = {
      recipeId: { literal: recipe.id },
    };
    for (const [index, role] of recipe.retainedTools.entries()) {
      const itemId = tools[role.role],
        item =
          itemId && accessiblePossession(world, actorId, itemId)
            ? itemFor(world, itemId)
            : undefined;
      if (!item) return refuse('The exact retained tool is unavailable.');
      const binding = `tool-${index}`;
      bindings[binding] = item.id;
      args[`tool:${role.role}`] = { role: binding };
      requirements.push({
        kind: 'item',
        role: binding,
        definition: definitionPin(world.itemDefinitions[item.definitionId]!),
      });
    }
    requirements.push({ kind: 'recipe', definition: selection.recipe });
    name = recipe.name;
    invocation = {
      kind: 'invoke',
      key: 'batch',
      name,
      command: 'craft',
      args,
      outputs: recipe.outputs.map((output) => ({
        port: output.port,
        definitionId: output.definition.id,
        quantity: output.quantity,
      })),
      requirements,
    };
  }
  const title = `${name} × ${request.batches}`;
  return {
    id,
    actorId,
    type: 'compose',
    selectionQuantity: {
      command: selection.kind,
      requested: request.batches,
      unitLabel: policy.countLabel,
    },
    name: title,
    mode: request.mode,
    bindings,
    root: {
      kind: 'sequence',
      name: title,
      children: Array.from({ length: request.batches }, (_, index) => ({
        ...invocation,
        key: `batch-${index + 1}`,
        name: `${name} (${index + 1}/${request.batches})`,
      })),
    },
  };
}
