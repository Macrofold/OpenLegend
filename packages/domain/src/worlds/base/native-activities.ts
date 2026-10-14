import { preparationDefinition } from '../../food-preparation.js';
import { NATIVE_PREPARATIONS } from './items.js';
import type { ActivityHostDescriptor, ActivityActionMeaning } from '../../activity-hosts.js';
import type { Command } from '../../types.js';
import { BASE_COMMAND_DESCRIPTIONS } from './action-descriptions.js';
import { BASE_FAMILY_FACTS } from './actions.js';

function host(
  id: string,
  commands: readonly Command['type'][],
  fallback?: ActivityActionMeaning['fallback'],
): ActivityHostDescriptor {
  const actions: Partial<Record<Command['type'], ActivityActionMeaning>> = {};
  for (const command of commands)
    actions[command] = {
      label: command,
      ...(fallback ? { fallback } : {}),
      description: BASE_COMMAND_DESCRIPTIONS[command]!,
      singleItemReceipt: (BASE_FAMILY_FACTS.singleItemReceipt as readonly string[]).includes(
        command,
      ),
      itemOutputs: (BASE_FAMILY_FACTS.itemOutputs as readonly string[]).includes(command),
      unpausableWhileWorking: (
        BASE_FAMILY_FACTS.unpausableWhileWorking as readonly string[]
      ).includes(command),
      toolFields: BASE_FAMILY_FACTS.toolFields[command] ?? [],
      unitPerCommand: (BASE_FAMILY_FACTS.unitPerCommand as readonly string[]).includes(command),
    };
  return {
    definition: {
      id,
      version: 1,
      interface: 'activity-host-v1',
      implementationVersion: 1,
      commands,
      deadlineSafeCommands: [],
      actions,
    },
    supportsCommand(world, command) {
      if (command === 'cook') return Object.keys(world.foodPreparations).length > 0;
      if (command === 'fish') return Object.keys(world.castDefinitions).length > 0;
      if (command === 'craft' || command === 'teach')
        return world.moduleManifest.recipeFamilies.length > 0;
      if (['hunt', 'aim', 'shoot-once', 'release-shot'].includes(command))
        return !!world.moduleManifest.rangedPolicy;
      if (command === 'practice-shot' || command === 'coaching')
        return world.moduleManifest.definitions.some((definition) => !!definition.practice);
      return true;
    },
    outputDefinition(world, command) {
      if (command.type === 'gather' || command.type === 'fish')
        return world.entities[command.targetId]?.resource?.definitionId;
      if (command.type === 'cook') {
        const outputs = preparationDefinition(world, command)?.outputs;
        return outputs?.length === 1 ? outputs[0]!.definitionId : undefined;
      }
      if (command.type === 'prepare') return NATIVE_PREPARATIONS[command.preparation].output;
      if (command.type === 'craft') return world.recipes[command.recipeId]?.outputDefinitionId;
    },
  };
}
/** Optional capabilities are separate exact installations. Missing possessions block an
 * installed command; linking this source grants no availability.
 * docs/worlds/base/actions.md */
export const BASE_NATIVE_ACTIVITY_HOSTS = [
  host('base:gathering', ['gather'], {
    label: 'Gather resources',
    category: 'Gather',
    reason: 'Move within sight of a resource.',
  }),
  host('base:preparation', ['prepare']),
  host('base:manufacturing', ['craft'], {
    label: 'Craft a known recipe',
    category: 'Create',
    reason: 'Invent or learn a recipe first.',
  }),
  host('base:hunting', ['hunt', 'aim', 'shoot-once', 'release-shot'], {
    label: 'Hunt an animal',
    category: 'Hunt',
    reason: 'Move within sight of a living animal.',
  }),
  host('base:harvesting', ['harvest'], {
    label: 'Harvest remains',
    category: 'Gather',
    reason: 'Find animal remains to harvest.',
  }),
  host('base:cooking', ['cook'], {
    label: 'Prepare food',
    category: 'Create',
    reason: 'Choose an installed preparation, its ingredients and a perceived heat source.',
  }),
  host('base:fishing', ['fish'], {
    label: 'Fish once',
    category: 'Gather',
    reason: 'Choose a perceived compatible reach and an accessible fishing tool.',
  }),
  host('base:teaching', ['teach'], {
    label: 'Teach a technique',
    category: 'Social',
    reason: 'Learn a recipe and find a nearby listener.',
  }),
  host('base:practice', ['practice-shot', 'coaching']),
];
