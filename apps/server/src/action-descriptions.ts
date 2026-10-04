import { namePhrase } from '@open-legend/language';
import { strikeDefinition } from '@open-legend/domain';
import { bodyPolicy, type WorldState } from '@open-legend/domain';
import { consumptionDescription } from './body-services.js';
import {
  BASE_FIRE_CARE,
  BASE_ACTION_DESCRIPTIONS,
  fireFuelDescription,
  gatheringYield,
  NATIVE_ITEMS,
  NATIVE_PREPARATIONS,
  type ActorObservation,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

/** Common explanations also cover families with no eligible target. Prose is
 * presentation data; command previews and the kernel still own every prerequisite. */
export const ACTION_DESCRIPTIONS: Record<CommandInput['type'] | 'talk', string> = {
  'activity-request':
    'Choose every required parameter and review a supported activity before starting it.',
  'inspect-activities':
    'Read a bounded page of my own past actions and results, without repeating them.',
  activity:
    'Attempt a personally learned sequence; each step rechecks its requirements and keeps actual completed results.',
  say: 'Speak to nearby listeners. Only people who hear the words receive the speech.',
  conversation:
    'Join or leave a nearby conversation. Membership never grants earlier unheard speech.',
  pickup:
    'Approach a visible pile and pick up its portable items. Quantities are checked again on arrival.',
  drop: 'Place the selected quantity of a portable possession on the current support. Stop active work first.',
  'transfer-item':
    'Move free units between accessible containers. Bags retain their identity and contents. Capacity and nesting are checked together.',
  'split-item':
    'Separate free units into a new lot in the same container. Reserved units stay in their original lot.',
  'merge-item':
    'Combine equivalent free lots in the same container. Individual objects and reserved lots remain separate.',
  unequip: 'Release the selected equipment into your inventory after current work has finished.',
  'confirm-attempt':
    'Accept the exact revised action and its disclosed omissions. Native prerequisites are rechecked before execution.',
  'withdraw-attempt': 'Decline or withdraw a pending action; ongoing work is unchanged.',
  follow:
    'Follow a currently perceived actor, stopping when the target is lost or the activity is interrupted. No attack or stealth is implied.',
  move: 'Walk to the chosen location along a traversable route. This replaces your current work.',
  ...BASE_ACTION_DESCRIPTIONS,
  strike:
    'Approach the target and perform one strike. Damage requires a living target in range with a clear line of effect at impact.',
  handover:
    'Offer carried items to a person within reach, or accept, decline or withdraw an offer. Nothing changes hands unless the recipient accepts; an unanswered offer expires.',
  eat: 'Consume one accessible portion through the installed body service.',
  replenish:
    'Approach a compatible supply and transfer its finite resource into your reservoir over time. Stopping keeps only the amount already transferred.',
  'status-effect': 'Activate or end an applicable state on the selected target.',
  'inspect-inventory':
    'Inspect a bounded page of your own possessions or one selected reachable container; further pages require another explicit request and current access.',
  cancel:
    'Stop all current and paused work. Completed effects remain; materials already consumed are not returned.',
  recover:
    'Use the installed recovery service. Your current action ends; world history is retained.',
  teach:
    'Share a learned crafting technique with a nearby person so they can use it themselves. Teaching shares knowledge, not an item.',
  talk: 'Open a conversation with a nearby person. You can review and edit your message before sending it.',
};

/** Only the player's permitted observation enters this projection. Reuse saved
 * invention prose and trusted mechanics; hovering never starts model work. */
export function describeCommand(
  command: CommandInput,
  observation: ActorObservation,
  world: WorldState,
): string {
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
    case 'strike': {
      if (itemDefinition?.melee) {
        const m = itemDefinition.melee;
        return `${common} ${itemDefinition.name}: ${m.damage} damage, ${m.accuracy * 100}% accuracy, ${m.range} units reach, ${m.windupSeconds} game seconds wind-up and ${m.recoverySeconds} seconds recovery. Requires this exact equipped weapon; misses cause no damage.`;
      }
      const strike = strikeDefinition(command.definitionId);
      return strike
        ? `${common} ${strike.label}: ${strike.damage} injury damage, ${strike.range} units reach, ${strike.workSeconds} game seconds of wind-up. One strike per command; no automatic repeated attacks.`
        : common;
    }
    case 'gather':
      if (!target?.resource) return common;
      return `${common} ${namePhrase(target, 'definite', { capitalize: true })} has ${target.resource.quantity} units of ${name(target.resource.definitionId).toLowerCase()} remaining.`;
    case 'prepare': {
      if (!command.preparation) return common;
      const preparation = NATIVE_PREPARATIONS[command.preparation];
      return `Use ${preparation.inputQuantity} ${name(preparation.input).toLowerCase()} to make ${preparation.outputQuantity} ${name(preparation.output).toLowerCase()}. Materials are consumed when work begins; stopping does not return them.`;
    }
    case 'craft':
      if (!recipe) return common;
      return `${recipe.description}\n\nMakes ${namePhrase(definition(recipe.outputDefinitionId) ?? recipe.output, 'indefinite')}. Requires: ${recipe.inputs.map((input) => `${input.quantity} ${name(input.definitionId).toLowerCase()}`).join(', ')}. Materials are consumed when work begins and are not refunded if you stop.`;
    case 'equip':
      return itemDefinition?.launcher
        ? `${itemDefinition.description}\n\nReady ${namePhrase(itemDefinition, 'definite')} for hunting. It uses ${itemDefinition.launcher!.ammunitionKind} ammunition.`
        : itemDefinition
          ? `${itemDefinition.description}\n\n${common}`
          : common;
    case 'hunt': {
      const equipped = observation.inventory.find(
        (entry) => entry.id === observation.actor.actor?.equippedItemId,
      );
      const weapon = equipped && definition(equipped.definitionId);
      const subject = target?.animal ? namePhrase(target, 'definite') : 'a living animal';
      return `Attempt one shot at ${subject}. ${weapon?.launcher ? `${namePhrase(weapon, 'definite', { capitalize: true })} is equipped and uses ${weapon.launcher.ammunitionKind} ammunition.` : 'Equip a ranged tool and carry compatible ammunition first.'} A shot can miss or wound the animal without killing it. Killed animals leave remains to harvest.`;
    }
    case 'harvest':
      if (!target?.remains) return common;
      return target.remains.harvested
        ? `${namePhrase(target, 'definite', { capitalize: true })} has already been harvested. No materials remain.`
        : `${common} ${namePhrase(target, 'definite', { capitalize: true })} yields: ${target.remains.yields.map((yielded) => `${yielded.quantity} ${name(yielded.definitionId).toLowerCase()}`).join(', ')}.`;
    case 'cook':
      return target ? `${common} Use ${namePhrase(target, 'definite')} for this portion.` : common;
    case 'handover': {
      const what =
        item && itemDefinition ? `${command.quantity ?? item.quantity} ${itemDefinition.name}` : '';
      return command.handoverOperation === 'offer'
        ? `Offer ${what || 'these items'} to ${target ? namePhrase(target, 'definite') : 'this person'}. Nothing moves unless they accept; you keep the items meanwhile and can withdraw the offer.`
        : command.handoverOperation === 'accept'
          ? `Take the offered items from ${target ? namePhrase(target, 'definite') : 'this person'}. You must be within arm's reach of each other.`
          : command.handoverOperation === 'decline'
            ? `Decline ${target ? namePhrase(target, 'definite') : 'this person'}'s offer; nothing moves.`
            : command.handoverOperation === 'withdraw'
              ? `Withdraw your offer to ${target ? namePhrase(target, 'definite') : 'this person'}; nothing moves.`
              : common;
    }
    case 'tend-fire': {
      const state = target?.heat
        ? ` ${namePhrase(target, 'definite', { capitalize: true })} is ${target.heat.lit ? 'burning' : 'cold'}, with ${fireFuelDescription(target.heat)}.`
        : '';
      return command.fireOperation === 'light'
        ? `Light ${target ? namePhrase(target, 'definite') : 'the campfire'} with a fire drill (a carried rigid shaft, kept) and one bundle of plain fibers as tinder (used up). The fire must already have fuel.${state}`
        : command.fireOperation === 'fuel'
          ? `Add ${itemDefinition ? namePhrase(itemDefinition, 'definite') : 'one piece of carried fuel'} to ${target ? namePhrase(target, 'definite') : 'the campfire'}. It burns for about ${BASE_FIRE_CARE.fuel.secondsPerUnit / 3600} more hour; a fire holds at most ${BASE_FIRE_CARE.fuel.maximumFuelSeconds / 3600} hours of fuel.${state}`
          : command.fireOperation === 'extinguish'
            ? `Put out ${target ? namePhrase(target, 'definite') : 'the campfire'}. Unburnt fuel stays for relighting; cooking there stops working.${state}`
            : common;
    }
    case 'eat':
      return consumptionDescription(world, observation.actor, itemDefinition);
    case 'recover':
      return bodyPolicy(world)?.recovery?.successText ?? common;
    case 'teach':
      return recipe && target
        ? `Teach ${namePhrase(target, 'definite')} how to make ${recipe.name}. ${recipe.description}\n\nShares the technique, not its materials or a finished item. You must be close enough to teach them.`
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
      [
        'Yields',
        `${Math.min(
          gatheringYield(
            observation.inventory
              .filter((item) => item.quantity > 0)
              .map((item) => observation.itemDefinitions.find((d) => d.id === item.definitionId)),
            target.resource.definitionId,
          ),
          target.resource.quantity,
        )} ${name(target.resource.definitionId)}`,
      ],
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
  if (command.type === 'tend-fire' && command.fireOperation) {
    const operation = command.fireOperation;
    return [
      [
        'Costs',
        operation === 'light'
          ? '1 tinder bundle; a drill is kept'
          : operation === 'fuel'
            ? `1 ${command.itemId ? name(observation.inventory.find((i) => i.id === command.itemId)?.definitionId ?? '') : 'fuel item'}`
            : 'Nothing',
      ],
      ['Time', duration(BASE_FIRE_CARE[operation].workSeconds)],
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
