import {
  cookingCommand,
  castDefinition,
  type CookCommand,
  type CookingPreparation,
  type Entity,
  type ItemInstance,
  type WorldState,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import { digest } from './content-digest.js';

export function cookingInput(command: CookCommand): CommandInput {
  const { id: _id, actorId: _actorId, heatId, ...input } = command;
  return { ...input, targetId: heatId };
}
export function cookingOptions(preparations: readonly CookingPreparation[], heatId: string) {
  return preparations.map((preparation) => {
    const command = cookingInput(cookingCommand(preparation, heatId));
    return {
      // Delimiters can occur inside authored IDs. Preserve the complete chosen body.
      id: `cook-${digest(command)}`,
      label: preparation.definition.name,
      definition: preparation.definition,
      command,
    };
  });
}
/** Index permitted tools once before expanding their uses across perceived sites. */
export function fishingTools(
  world: WorldState,
  inventory: readonly Pick<ItemInstance, 'id' | 'definitionId'>[],
) {
  const tools = new Map<string, Array<Pick<ItemInstance, 'id' | 'definitionId'>>>();
  for (const item of inventory) {
    const kind = world.itemDefinitions[item.definitionId]?.fishingTool?.kind;
    if (!kind) continue;
    const group = tools.get(kind) ?? [];
    if (!tools.has(kind)) tools.set(kind, group);
    group.push(item);
  }
  return tools;
}
/** Callers supply only perceived sites and the index of permitted tools. */
export function fishingOptions(
  world: WorldState,
  tools: ReturnType<typeof fishingTools>,
  source: Entity,
) {
  const definition = castDefinition(world, source);
  if (!definition) return [];
  return (tools.get(definition.toolKind) ?? []).map((item) => ({
    id: `fish-${digest([source.id, item.id])}`,
    label: `${definition.actionLabel} ${world.itemDefinitions[item.definitionId]!.name}`,
    description: definition.description,
    command: { type: 'fish' as const, targetId: source.id, itemId: item.id },
  }));
}
