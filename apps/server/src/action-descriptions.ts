import { nativeCommandKind } from './native-command-kind.js';
import { commandDescriptions, installedActionMeaning } from '@open-legend/domain';
import {
  BASE_OUTING,
  BASE_RANGED_TEXT,
  BASE_EVASION_TEXT,
  BASE_CONSTRUCTION_DESCRIPTIONS,
  equippedItem,
  guardDescription,
  equipmentChangeDescription,
  BASE_GUARD_TEXT,
} from '@open-legend/domain';
import { castDefinition, preparationDefinition } from '@open-legend/domain';
import { namePhrase } from '@open-legend/language';
import {
  nativeCatalogueView,
  strikeDefinition,
  describeItemOffer,
  BASE_HANDOVER,
  BASE_PRACTICE_COMMAND_DESCRIPTIONS,
  handlingAccuracy,
  toolPracticeDefinition,
  describePractice,
  practiceRank,
  rangedPolicy,
  rangedTargetAllowed,
} from '@open-legend/domain';
import { domainCommand } from './cognition.js';
import { bodyPolicy, type WorldState } from '@open-legend/domain';
import { BASE_DEATH_COMMAND_DESCRIPTIONS, BASE_FOOD_ACTION_WORDING } from '@open-legend/domain';
import { consumptionDescription } from './body-services.js';
import {
  BASE_FIRE_CARE,
  fireFuelDescription,
  gatheringYield,
  NATIVE_ITEMS,
  NATIVE_PREPARATIONS,
  type ActorObservation,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

/** Common explanations also cover families with no eligible target. Prose is
 * presentation data; command previews and the kernel still own every prerequisite. */
export const ACTION_DESCRIPTIONS = commandDescriptions();

function descriptionRead(observation: ActorObservation) {
  const definitions = new Map(observation.itemDefinitions.map((item) => [item.id, item]));
  return {
    definitions,
    targets: new Map(observation.visibleEntities.map((entity) => [entity.id, entity])),
    items: new Map(observation.inventory.map((item) => [item.id, item])),
    recipes: new Map(observation.knownRecipes.map((recipe) => [recipe.id, recipe])),
    gatheringTools: observation.inventory
      .filter((item) => item.quantity > 0)
      .map((item) => definitions.get(item.definitionId)),
  };
}
type DescriptionRead = ReturnType<typeof descriptionRead>;

/** Only the player's permitted observation enters this projection. Reuse saved
 * invention prose and trusted mechanics; hovering never starts model work. */
function describeCommand(
  command: CommandInput,
  observation: ActorObservation,
  world: WorldState,
  read: DescriptionRead,
): string {
  const definition = (id: string) => read.definitions.get(id) ?? NATIVE_ITEMS[id];
  const name = (id: string) => definition(id)?.name ?? 'material';
  const target = 'targetId' in command ? read.targets.get(command.targetId ?? '') : undefined;
  const item = 'itemId' in command ? read.items.get(command.itemId ?? '') : undefined;
  const itemDefinition = item && definition(item.definitionId);
  const recipe = 'recipeId' in command ? read.recipes.get(command.recipeId ?? '') : undefined;
  const common =
    installedActionMeaning(world, nativeCommandKind(command.type))?.description ??
    ACTION_DESCRIPTIONS[command.type] ??
    'Choose a supported action.';
  if (command.type === 'outing') return BASE_OUTING.description;
  switch (command.type) {
    case 'guard':
      return itemDefinition?.contactDefense
        ? `${equipmentChangeDescription(world, observation.actor.id, item!.id)}${itemDefinition.name}: ${guardDescription(itemDefinition.contactDefense)}`
        : common;
    case 'strike': {
      if (itemDefinition?.melee) {
        const m = itemDefinition.melee;
        return `${equipmentChangeDescription(world, observation.actor.id, item!.id)}${common} ${itemDefinition.name}: ${m.damage} damage, ${m.accuracy * 100}% accuracy, ${m.range} units reach, ${m.windupSeconds} game seconds wind-up and ${m.recoverySeconds} seconds recovery. Requires this exact equipped weapon; misses cause no damage.`;
      }
      const strike = strikeDefinition(command.definitionId, world);
      return strike
        ? `${common} ${strike.label}: ${strike.damage} injury damage, ${strike.range} units reach, ${strike.workSeconds} game seconds of wind-up. One strike per command; no automatic repeated attacks.`
        : common;
    }
    case 'gather':
      if (!target?.resource || target.resource.cast) return common;
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
    case 'practice-shot':
    case 'hunt': {
      const equipped = read.items.get(
        command.itemId ?? equippedItem(world, observation.actor.id, 'ranged')?.id ?? '',
      );
      const weapon = equipped && definition(equipped.definitionId);
      if (command.type === 'practice-shot') {
        const practice = weapon && toolPracticeDefinition(world, weapon);
        const known =
          weapon?.launcher && practice?.id === target?.practiceTarget?.attributeId
            ? handlingAccuracy(world, observation.actor, weapon)
            : undefined;
        return practice?.practice
          ? describePractice(
              practice.practice,
              target ? namePhrase(target, 'definite') : 'the selected target',
              weapon?.name,
              known?.competence === undefined ? undefined : known.accuracy,
            )
          : common;
      }
      const handling = weapon?.launcher && handlingAccuracy(world, observation.actor, weapon);
      const note = handling?.definition
        ? ` ${handling.definition.name}: ${practiceRank(handling.definition.practice!, handling.competence)}. ${handling.definition.practice!.scope}`
        : '';
      const policy = rangedPolicy(world);
      if (!policy) return common;
      const subject =
        target && rangedTargetAllowed(world, target)
          ? namePhrase(target, 'definite')
          : policy.targetLabel;
      return `${equipped ? equipmentChangeDescription(world, observation.actor.id, equipped.id) : ''}${policy.actionLabel}: attempt one shot at ${subject}. ${weapon?.launcher ? `${namePhrase(weapon, 'definite', { capitalize: true })} is the selected tool and uses ${weapon.launcher.ammunitionKind} ammunition.` : 'Equip a ranged tool and carry compatible ammunition first.'} ${policy.scope}${note} ${policy.accuracyExplanation}`;
    }
    case 'harvest':
      if (!target?.remains) return common;
      return target.remains.harvested
        ? `${namePhrase(target, 'definite', { capitalize: true })} has already been harvested. No materials remain.`
        : `${common} ${namePhrase(target, 'definite', { capitalize: true })} yields: ${target.remains.yields.map((yielded) => `${yielded.quantity} ${name(yielded.definitionId).toLowerCase()}`).join(', ')}.`;
    case 'cook': {
      const native = domainCommand(command, observation.actor.id, 'cook-description');
      const preparation =
        native?.type === 'cook' ? preparationDefinition(world, native) : undefined;
      return preparation
        ? `${preparation.description} ${preparation.workSeconds} game seconds after approach.${target ? ` Use ${namePhrase(target, 'definite')}.` : ''} Spent ingredients are not returned on interruption.`
        : common;
    }
    case 'fish':
      return target ? (castDefinition(world, target)?.description ?? common) : common;
    case 'handover': {
      if (command.offerId) {
        const offer = world.itemOffers?.[command.offerId];
        if (offer && [offer.offererId, offer.recipientId].includes(observation.actor.id))
          return describeItemOffer(world, offer) + '. ' + BASE_HANDOVER.text.decision;
      }
      const what =
        item && itemDefinition ? `${command.quantity ?? item.quantity} ${itemDefinition.name}` : '';
      return command.handoverOperation === 'offer' || command.handoverOperation === 'counter'
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
  read: DescriptionRead = descriptionRead(observation),
): Array<[string, string]> {
  const target = read.targets.get(command.targetId ?? '');
  const name = (id: string) => read.definitions.get(id)?.name ?? NATIVE_ITEMS[id]?.name ?? id;
  const duration = (seconds: number) =>
    `${seconds < 60 ? `${seconds} seconds` : `${Number((seconds / 60).toFixed(1))} minutes`} of game time`;
  if (command.type === 'gather' && target?.resource && !target.resource.cast)
    return [
      [
        'Yields',
        `${Math.min(
          gatheringYield(read.gatheringTools, target.resource.definitionId),
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
            ? `1 ${command.itemId ? name(read.items.get(command.itemId)?.definitionId ?? '') : 'fuel item'}`
            : 'Nothing',
      ],
      ['Time', duration(BASE_FIRE_CARE[operation].workSeconds)],
    ];
  }
  if (command.type === 'craft') {
    const r = read.recipes.get(command.recipeId ?? '');
    if (r)
      return [
        ['Costs', r.inputs.map((i) => `${i.quantity} ${name(i.definitionId)}`).join(', ')],
        ['Yields', r.output.name],
        ['Time', duration(r.workSeconds)],
      ];
  }
  return [];
}

/** Adapt the existing permitted action view, not a second set of combat/travel formulas.
 * Facts are display-only; the exact original command remains the execution intention. */
export function actionDescriptions(observation: ActorObservation, world: WorldState) {
  const read = descriptionRead(observation);
  const nativeView = nativeCatalogueView(world, observation.inventory);
  return {
    describe: (command: CommandInput) => describeCommand(command, observation, world, read),
    facts: (command: CommandInput): Array<[string, string]> => {
      const native = domainCommand(command, observation.actor.id, 'preview');
      if (native.type === 'hunt' && command.ammunitionId) native.ammoItemId = command.ammunitionId;
      const view = nativeView(native);
      const facts: Array<[string, string]> = [];
      if (view.target) facts.push(['Target', view.target]);
      if (view.tool) facts.push(['Tool', view.tool]);
      facts.push(...commandFacts(command, observation, read));
      for (const fact of view.facts)
        if (typeof fact.value === 'string' || typeof fact.value === 'number')
          facts.push([fact.name[0]!.toUpperCase() + fact.name.slice(1), String(fact.value)]);
      return [...new Map(facts)];
    },
  };
}
