import {
  hasWildernessNeeds,
  NATIVE_ITEMS,
  NATIVE_PREPARATIONS,
  type ActorObservation,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

/** Common explanations also cover families with no eligible target. Prose is
 * presentation data; command previews and the kernel still own every prerequisite. */
export const ACTION_DESCRIPTIONS: Record<CommandInput['type'] | 'talk', string> = {
  conversation:
    'Join or leave a nearby conversation. Membership never grants earlier unheard speech.',
  move: 'Walk to the chosen location along a traversable route. This replaces your current work.',
  gather:
    'Approach a resource and collect a small batch into your inventory. Supplies at each source are finite.',
  prepare: 'Turn gathered plant material into usable fibers or cord for crafting.',
  craft:
    'Make an item using a technique you know. Materials are consumed when work begins and are not refunded if you stop.',
  equip:
    'Ready a ranged tool from your inventory for hunting. It needs compatible ammunition before you can fire.',
  hunt: 'Approach a living animal and attempt one shot with your equipped ranged tool. Each attempt consumes ammunition and can miss. A killed animal leaves harvestable remains.',
  harvest:
    'Use a cutting point to collect the remaining materials from animal remains. Each set of remains can be harvested once.',
  cook: 'Turn one portion of raw meat into cooked food at a lit campfire. The fire must stay lit until the work finishes.',
  eat: 'Eat one portion from your inventory to restore fullness immediately, up to full. Raw meat must be cooked first.',
  replenish:
    'Approach a compatible supply and transfer its finite resource into your reservoir over time. Stopping keeps only the amount already transferred.',
  rest: 'Rest where you are to regain energy over time. Resting replaces your current work, and hunger continues to increase.',
  cancel: 'Stop your current movement or work. Materials already consumed are not returned.',
  recover:
    'Return to camp after collapsing, with health, fullness and energy partially restored. Your current action ends; the world continues from its current state.',
  teach:
    'Share a learned crafting technique with a nearby person so they can use it themselves. Teaching shares knowledge, not an item.',
  talk: 'Open a conversation with a nearby person. You can review and edit your message before sending it.',
};

/** Only the player's permitted observation enters this projection. Reuse saved
 * invention prose and trusted mechanics; hovering never starts model work. */
export function describeCommand(command: CommandInput, observation: ActorObservation): string {
  const definition = (id: string) =>
    observation.itemDefinitions.find((item) => item.id === id) ?? NATIVE_ITEMS[id];
  const name = (id: string) => definition(id)?.name ?? 'material';
  const target =
    'targetId' in command
      ? observation.visibleEntities.find((entity) => entity.id === command.targetId)
      : undefined;
  const item =
    'itemId' in command
      ? observation.inventory.find((entry) => entry.id === command.itemId)
      : undefined;
  const itemDefinition = item && definition(item.definitionId);
  const recipe =
    'recipeId' in command
      ? observation.knownRecipes.find((entry) => entry.id === command.recipeId)
      : undefined;
  const common = ACTION_DESCRIPTIONS[command.type];
  switch (command.type) {
    case 'gather':
      if (!target?.resource) return common;
      return `${common} ${target.name} has ${target.resource.quantity} units of ${name(target.resource.definitionId).toLowerCase()} remaining.`;
    case 'prepare': {
      if (!command.preparation) return common;
      const preparation = NATIVE_PREPARATIONS[command.preparation];
      return `Use ${preparation.inputQuantity} ${name(preparation.input).toLowerCase()} to make ${preparation.outputQuantity} ${name(preparation.output).toLowerCase()}. Materials are consumed when work begins; stopping does not return them.`;
    }
    case 'craft':
      if (!recipe) return common;
      return `${recipe.description}\n\nMakes ${recipe.output.name}. Requires: ${recipe.inputs.map((input) => `${input.quantity} ${name(input.definitionId).toLowerCase()}`).join(', ')}. Materials are consumed when work begins and are not refunded if you stop.`;
    case 'equip':
      return itemDefinition
        ? `${itemDefinition.description}\n\nReady ${itemDefinition.name} for hunting. It uses ${itemDefinition.launcher!.ammunitionKind} ammunition.`
        : common;
    case 'hunt': {
      const equipped = observation.inventory.find(
        (entry) => entry.id === observation.actor.actor?.equippedItemId,
      );
      const weapon = equipped && definition(equipped.definitionId);
      const subject = target?.animal
        ? target.name.trim().toLowerCase() === target.actor!.species!.trim().toLowerCase()
          ? `the ${target.actor!.species!}`
          : target.name
        : 'a living animal';
      return `Attempt one shot at ${subject}. ${weapon?.launcher ? `Your equipped ${weapon.name} uses ${weapon.launcher.ammunitionKind} ammunition.` : 'Equip a ranged tool and carry compatible ammunition first.'} A shot can miss or wound the animal without killing it. Killed animals leave remains to harvest.`;
    }
    case 'harvest':
      if (!target?.remains) return common;
      return target.remains.harvested
        ? `${target.name} has already been harvested. No materials remain.`
        : `${common} ${target.name} yields: ${target.remains.yields.map((yielded) => `${yielded.quantity} ${name(yielded.definitionId).toLowerCase()}`).join(', ')}.`;
    case 'cook':
      return target ? `${common} Use ${target.name} for this portion.` : common;
    case 'eat':
      if (!hasWildernessNeeds(observation.actor.actor!)) return 'This body has no fullness need.';
      return itemDefinition?.nutrition
        ? `Eat one portion of ${itemDefinition.name.toLowerCase()}. Restores up to ${itemDefinition.nutrition} fullness, capped at full. You currently have ${Math.round(observation.actor.actor!.fullness!)} / 100 fullness.`
        : common;
    case 'teach':
      return recipe && target
        ? `Teach ${target.name} how to make ${recipe.name}. ${recipe.description}\n\nShares the technique, not its materials or a finished item. You must be close enough to teach them.`
        : common;
    default:
      return common;
  }
}

/** Facts come from the same trusted work definitions as execution. Travel time is separate. */
export function commandFacts(
  command: CommandInput,
  observation: ActorObservation,
): Array<[string, string]> {
  const target = observation.visibleEntities.find((e) => e.id === command.targetId);
  const name = (id: string) =>
    observation.itemDefinitions.find((d) => d.id === id)?.name ?? NATIVE_ITEMS[id]?.name ?? id;
  const duration = (seconds: number) =>
    `${seconds < 60 ? `${seconds} seconds` : `${Number((seconds / 60).toFixed(1))} minutes`} of game time`;
  if (command.type === 'gather' && target?.resource)
    return [
      ['Yields', `${Math.min(2, target.resource.quantity)} ${name(target.resource.definitionId)}`],
      ['Time', `${duration(target.resource.workSeconds)}, plus travel`],
    ];
  if (command.type === 'prepare' && command.preparation) {
    const p = NATIVE_PREPARATIONS[command.preparation];
    return [
      ['Costs', `${p.inputQuantity} ${name(p.input)}`],
      ['Yields', `${p.outputQuantity} ${name(p.output)}`],
      ['Time', duration(p.workSeconds)],
    ];
  }
  if (command.type === 'craft') {
    const r = observation.knownRecipes.find((r) => r.id === command.recipeId);
    if (r)
      return [
        ['Costs', r.inputs.map((i) => `${i.quantity} ${name(i.definitionId)}`).join(', ')],
        ['Yields', r.output.name],
        ['Time', duration(r.workSeconds)],
      ];
  }
  return [];
}
