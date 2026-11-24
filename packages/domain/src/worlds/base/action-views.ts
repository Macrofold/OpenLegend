import activityDisplay from './config/ordinary-activity-display.json' with { type: 'json' };
import hearthCopy from '../../hearth-placement-messages.json' with { type: 'json' };
import { gateUseLabel } from '../../gate-operations.js';
import { entityGet } from '../../entity-collection.js';
import { observedBodyHealthValue } from './hunting.js';
import {
  ordinaryActivityView,
  appendObservedActivityFacts,
  sharedOrdinaryActivityName,
} from './ordinary-activity-view.js';
import { equippedItem, type EquipmentUse } from '../../equipment.js';
import contextActions from './config/context-actions.json' with { type: 'json' };
import { bodyPolicy } from '../../body-policy.js';
import { BASE_RANGED_TEXT } from './ranged-counterplay.js';
import { practiceDefinition, toolPracticeDefinition } from '../../practical-competence.js';
import { preparationDefinition } from '../../food-preparation.js';
import { castDefinition } from '../../finite-casts.js';
import type { Command, Entity, ItemInstance, WorldState } from '../../types.js';
import { ACTIVITY_LIMITS, type ActivityView } from '../../action-experience.js';
import { itemFor } from '../../objects.js';
import { accessiblePossession, possessionItems } from '../../object-access.js';
import { worldPosition } from '../../spatial-state.js';
import { seesEntity } from '../../perception.js';
import { observerDescription } from './knowledge.js';
import { strikeDefinition, describeAttack } from '../../strikes.js';
import { BASE_ACTION_DEFAULTS } from './actions.js';
import { rangedPolicy, rangedApproachRange, shotPreparationSeconds } from '../../ranged-policy.js';
import { fireCareFacts, fireFuelDescription } from './fire.js';
import { attributeDefinition } from '../../world-modules.js';
import { reincarnationPolicy } from '../../reincarnation.js';
import {
  BASE_EQUIPMENT_COPY,
  guardDescription,
  equipmentChangeDescription,
} from './shield-defense.js';
import { evasionDescription } from './combat-views.js';
import gatheringCopy from './gathering-copy.json' with { type: 'json' };
import castCopy from './cast-copy.json' with { type: 'json' };
import preparationCopy from '../../food-preparation-messages.json' with { type: 'json' };

export const BASE_FOOD_ACTION_WORDING = {
  cookingDescription:
    'Use the selected preparation and exact ingredients at a lit heat source. Spent ingredients are not returned on interruption.',
  cookingLabel: 'Prepare food',
  cookingRequiredText:
    'Choose an installed preparation, its ingredients and a perceived heat source.',
  cookingHeatRequiredText: 'A perceived lit heat source is needed.',
  fishingDescription: 'Choose one cast at a compatible finite source using the selected tool.',
  fishingLabel: castCopy.label,
  fishingHereLabel: 'Fish here',
  fishingRequiredText: 'Choose a perceived compatible reach and an accessible fishing tool.',
  fishingBindingText: 'Choose a river reach and an exact fishing tool.',
};

type ViewPossessions = {
  items: readonly ItemInstance[];
  byId: ReadonlyMap<string, ItemInstance>;
  names: ReadonlyMap<string, string>;
};

/** This world's preferred held item for the explicit target-use gesture. */
export function preferredTargetEquipment(world: WorldState, actorId: string) {
  for (const use of contextActions.equippedUseOrder as EquipmentUse[]) {
    const item = equippedItem(world, actorId, use);
    if (item) return item;
  }
}

/** Select the same preferred use regardless of catalogue construction order.
 * Offers must already describe and check this exact held item; selection grants no execution. */
export function equippedTargetAction<T extends { command: { type: string; itemId?: string } }>(
  world: WorldState,
  target: Entity,
  equipment: { id: string; definitionId: string } | undefined,
  offers: readonly T[],
): T | undefined {
  if (!equipment) return;
  const definition = world.itemDefinitions[equipment.definitionId];
  for (const kind of contextActions.equippedActionOrder) {
    if (['aim', 'shoot-once', 'hunt'].includes(kind) && !definition?.rangedWeapon) continue;
    if (
      kind === 'gather' &&
      definition?.gatheringTool?.resourceId !== target.resource?.definitionId
    )
      continue;
    const exact = offers.find(
      (offer) => offer.command.itemId === equipment.id && offer.command.type === kind,
    );
    if (exact) return exact;
  }
}

/** Bundled-world disclosure and wording; the engine stores the permitted view.
 * No later observation may fill in a hidden historical target or effect. */
export function nativeActivityView(world: WorldState, command: Command): ActivityView {
  return activityView(world, command);
}
function toolName(name: string, ordinal: number, count: number): string {
  return count > 1
    ? name + gatheringCopy.sameNamedToolSuffix.replace('{ordinal}', String(ordinal))
    : name;
}
function activityView(
  world: WorldState,
  command: Command,
  possessions?: ViewPossessions,
): ActivityView {
  const actor = entityGet(world.entities, command.actorId);
  const heldAim =
    command.type === 'release-shot' &&
    actor?.actor?.action?.id === command.aimId &&
    actor.actor.action.ranged?.manual
      ? actor.actor.action
      : undefined;
  const heldStrike =
    command.type === 'release-strike' &&
    actor?.actor?.action?.id === command.expectedActionId &&
    actor.actor.action.type === 'strike' &&
    actor.actor.action.attackExecution
      ? actor.actor.action
      : undefined;
  const targetId =
    heldAim?.targetId ??
    heldStrike?.targetId ??
    ('targetId' in command ? command.targetId : 'heatId' in command ? command.heatId : undefined);
  const target = targetId ? entityGet(world.entities, targetId) : undefined;
  const perceived =
    !!actor && !!target && (actor.id === target.id || seesEntity(world, actor, target));
  const actorView =
    actor && (perceived || command.type === 'move')
      ? { position: worldPosition(actor), heading: actor.spatial.heading }
      : undefined;
  const targetView = perceived
    ? {
        name: observerDescription(world, command.actorId, target.id),
        position: worldPosition(target),
        health: observedBodyHealthValue(world, command.actorId, target.id),
      }
    : undefined;
  if (
    command.type === 'move' ||
    command.type === 'say' ||
    command.type === 'status-effect' ||
    command.type === 'follow' ||
    (command.type === 'strike' && !command.weaponItemId && !command.manualExecution)
  ) {
    const purpose = { purpose: command.purpose, chosenPurpose: command.chosenPurpose?.description };
    const effect =
      command.type === 'status-effect'
        ? world.statusEffectPolicy.definitions.find((effect) => effect.id === command.definitionId)
        : undefined;
    return ordinaryActivityView({
      command:
        command.type === 'move'
          ? { ...purpose, type: 'move', destination: command.destination }
          : command.type === 'say'
            ? { ...purpose, type: 'say', text: command.text }
            : command.type === 'status-effect'
              ? { ...purpose, type: 'status-effect', operation: command.operation }
              : command.type === 'follow'
                ? {
                    ...purpose,
                    type: 'follow',
                    complete: command.complete,
                    distance: command.distance,
                    until: command.until,
                  }
                : { ...purpose, type: 'strike' },
      actor: actorView,
      target: targetView,
      effect: effect
        ? {
            label: effect.label,
            activate: effect.actions?.activate,
            deactivate: effect.actions?.deactivate,
          }
        : undefined,
      strike: command.type === 'strike' ? strikeDefinition(command.definitionId, world) : undefined,
    });
  }
  const itemId =
    heldAim?.weaponItemId ??
    heldStrike?.weaponItemId ??
    ('weaponItemId' in command
      ? command.weaponItemId
      : 'itemId' in command
        ? command.itemId
        : undefined);
  const item =
    itemId && accessiblePossession(world, command.actorId, itemId)
      ? itemFor(world, itemId)
      : undefined;
  const definition = item && world.itemDefinitions[item.definitionId];
  const names: Partial<Record<Command['type'], string>> = {
    strike: 'Attack once',
    'release-strike': 'Release attack',
    hunt: 'Hunt once',
    aim: BASE_RANGED_TEXT.aimName,
    'shoot-once': BASE_RANGED_TEXT.shotName,
    'release-shot': BASE_RANGED_TEXT.shootingName,
    harvest: 'Harvest',
    cook: activityDisplay.cookName,
    fish: BASE_FOOD_ACTION_WORDING.fishingLabel,
    'tend-fire': 'Tend a fire',
    eat: activityDisplay.eatName,
    equip: BASE_EQUIPMENT_COPY.equipLabel,
    guard: 'Guard with shield',
    evade: bodyPolicy(world)?.evasion?.label,
    gather: gatheringCopy.name,
    craft: 'Make',
    pickup: 'Pick up',
    drop: 'Put down',
    'transfer-item': 'Move an item',
    'split-item': 'Separate part of a stack',
    'merge-item': 'Combine stacks',
    unequip: BASE_EQUIPMENT_COPY.unequipActivity,
    replenish: 'Replenish',
    recover: 'Recover',
    'treat-scar': 'Treat a scar',
    teach: 'Teach',
    'learn-record': 'Learn a recorded method',
  };
  if (command.type === 'operate-gate') names['operate-gate'] = gateUseLabel(world, command);
  if (command.type === 'impact-boundary') {
    const family = world.assemblyFamilies?.[command.familyId];
    if (family?.implementation === 'grounded-panel-boundary' && family.damage)
      names['impact-boundary'] = family.damage.label;
  }
  if (command.type === 'practice-shot')
    names['practice-shot'] = practiceDefinition(
      world,
      target?.practiceTarget?.attributeId ?? '',
    )?.practice?.practiceLabel;
  if (command.type === 'coaching')
    names.coaching = practiceDefinition(world, command.attributeId)?.practice?.coachingLabel;
  const reservoir =
    command.type === 'replenish'
      ? attributeDefinition(world, command.attributeId)?.reservoir
      : undefined;
  const view: ActivityView = {
    name: command.purpose ?? reservoir?.actionLabel ?? names[command.type] ?? 'Act',
    facts: [],
  };
  if (command.chosenPurpose)
    view.facts.push({
      name: 'chosen purpose',
      value: command.chosenPurpose.description,
      critical: true,
    });
  if (command.type === 'treat-scar') {
    const treatment = reincarnationPolicy(world)?.treatment;
    if (treatment)
      view.facts.push({
        name: 'treatment',
        value: `${treatment.quantity} ${world.itemDefinitions[treatment.materialId]?.name ?? 'material'} and ${treatment.workSeconds} game seconds beside a rest spot; injury interrupts treatment.`,
        critical: true,
      });
  }
  appendObservedActivityFacts(view, actorView, targetView);
  if (definition) {
    if (possessions) view.tool = possessions.names.get(item!.id);
    else {
      const siblings = [...possessionItems(world, command.actorId)].filter(
        (value) => world.itemDefinitions[value.definitionId]?.name === definition.name,
      );
      view.tool = toolName(
        definition.name,
        siblings.findIndex((value) => value.id === item!.id) + 1,
        siblings.length,
      );
    }
    if (definition.description)
      view.facts.push({ name: 'description', value: definition.description, critical: false });
  }
  if (command.type === 'guard' && definition?.contactDefense) {
    view.facts.push({
      name: 'guard',
      value: guardDescription(definition.contactDefense),
      critical: true,
    });
    view.facts.push({
      name: 'facing',
      value: command.targetId
        ? 'Face this visible target once; the shield does not track it'
        : 'Hold the chosen body direction; camera rotation does not turn it',
      critical: true,
    });
  }
  if (command.type === 'evade' && actor) {
    const description = evasionDescription(world, actor, command.destination);
    if (description)
      view.facts.push({
        name: 'movement',
        value: description,
        critical: true,
      });
  }
  if (command.type === 'strike' || heldStrike) {
    const strikeCommand = heldStrike ?? (command.type === 'strike' ? command : undefined);
    const profile =
      strikeCommand && (!strikeCommand.weaponItemId || item)
        ? strikeDefinition(strikeCommand.definitionId, world, strikeCommand.weaponItemId)
        : undefined;
    if (profile) {
      const manual = heldStrike || (command.type === 'strike' && command.manualExecution);
      view.facts.push({
        name: 'attack',
        value: manual
          ? `${profile.damage} injury before protection; reach ${profile.range} m; ${Math.round((profile.accuracy ?? 1) * 100)}% base hit chance in reach. Range and line of effect are checked at impact.`
          : describeAttack(profile),
        critical: true,
      });
      view.facts.push({
        name: manual ? 'preparation' : 'approach',
        value: manual
          ? heldStrike
            ? `Releases this prepared strike when ready; ${heldStrike.remainingSeconds} game seconds of preparation remain, followed by ${profile.recoverySeconds ?? 0} game seconds of recovery. You control movement.`
            : `${profile.workSeconds} game seconds of preparation, then choose Release or Cancel; ${profile.recoverySeconds ?? 0} game seconds of recovery after release. You control movement.`
          : `Move to within ${profile.approachRange ?? profile.range} m; route length is not known`,
        critical: true,
      });
    }
  }
  const rangedCommand = heldAim ?? command;
  const ranged =
    heldAim || ['hunt', 'aim', 'shoot-once'].includes(command.type) ? rangedPolicy(world) : null;
  const rangedWithoutApproach =
    (command.type === 'aim' || command.type === 'shoot-once') &&
    (!!command.aimPoint || (command.type === 'aim' && command.manualExecution));
  if (ranged && 'ammoItemId' in rangedCommand && definition?.rangedWeapon) {
    const compatible = (item: ItemInstance) =>
      world.itemDefinitions[item.definitionId]?.ammunition?.kind ===
      definition.rangedWeapon!.ammunitionKind;
    const exact = rangedCommand.ammoItemId && possessions?.byId.get(rangedCommand.ammoItemId);
    const ammunition =
      possessions && rangedCommand.ammoItemId
        ? exact && compatible(exact)
          ? exact
          : undefined
        : (possessions?.items ?? [...possessionItems(world, command.actorId)]).find(
            (item) =>
              (!rangedCommand.ammoItemId || rangedCommand.ammoItemId === item.id) &&
              compatible(item),
          );
    const ammo = ammunition && world.itemDefinitions[ammunition.definitionId];
    const shot = definition.rangedWeapon;
    const words = activityDisplay.ranged;
    const requirement = rangedWithoutApproach ? words.withoutApproach : words.afterApproach;
    view.facts.push({
      name: 'shot',
      value: rangedFact(words.shot, {
        damage: Math.max(0, shot.damage + (ammo?.ammunition?.damageBonus ?? 0)),
        range: shot.range,
        steadiness: Math.round(shot.accuracy * 100),
        speed: shot.flightSpeed,
        contact: ranged.accuracyExplanation,
      }),
      critical: false,
    });
    view.facts.push({
      name: 'preparation',
      value: heldAim
        ? heldAim.ranged?.ready
          ? 'Releases the selected prepared aim now; no further approach or preparation'
          : `Requests release when the selected aim is ready; ${heldAim.remainingSeconds} game seconds of preparation remain. You control movement.`
        : command.type === 'aim'
          ? `${shotPreparationSeconds(world, toolPracticeDefinition(world, definition)?.practice)} game seconds${requirement}; then choose Shoot or Cancel aim`
          : rangedFact(words.automaticPreparation, {
              seconds: shotPreparationSeconds(
                world,
                toolPracticeDefinition(world, definition)?.practice,
              ),
              approach: requirement,
            }),
      critical: true,
    });
    if (!heldAim && !rangedWithoutApproach)
      view.facts.push({
        name: 'approach',
        value: rangedFact(words.approach, {
          distance: rangedApproachRange(world, shot.range).toFixed(2),
        }),
        critical: true,
      });
    view.facts.push({
      name: 'ammunition',
      value: ammunition
        ? rangedFact(words.stock, { ammunition: ammo!.name, quantity: ammunition.quantity })
        : 'No compatible carried projectile is currently known; a projectile is required',
      critical: true,
    });
  }
  if (command.type === 'equip' && definition?.melee)
    view.facts.push({
      name: 'weapon',
      value: describeAttack({ ...definition.melee, workSeconds: definition.melee.windupSeconds }),
      critical: true,
    });
  if (command.type === 'teach')
    view.facts.push({
      name: 'subject',
      value: world.recipes[command.recipeId]?.name ?? 'a known technique',
      critical: true,
    });
  if (command.type === 'cook') {
    const preparation = preparationDefinition(world, command);
    if (preparation) {
      view.name = command.purpose ?? preparation.name;
      view.facts.push({
        name: 'cost',
        value: `${preparationCopy.costPrefix}${preparation.workSeconds}${preparationCopy.costSuffix}`,
        critical: true,
      });
      const products = preparation.outputs.map((output) => ({
        quantity: output.quantity,
        material: world.itemDefinitions[output.definitionId]?.name ?? 'item',
      }));
      view.facts.push({
        name: 'output',
        value: products,
        sentence: `${preparationCopy.outputPrefix}${products.map(({ quantity, material }) => `${quantity} ${material}`).join(', ')}`,
        critical: true,
      });
      const ingredients = preparation.inputs.map((input) => {
        const id = command.inputs[input.role];
        const ingredient =
          id && accessiblePossession(world, command.actorId, id) ? itemFor(world, id) : undefined;
        return {
          role: input.role,
          material: world.itemDefinitions[input.definitionId]?.name ?? 'ingredient',
          'required quantity': input.quantity,
          'selected carried quantity':
            ingredient?.quantity ?? 'The selected ingredient is no longer accessible',
        };
      });
      // Preserve each role without turning authored role text into a display label
      // or exceeding the record owner's per-detail/fact limits.
      for (let at = 0; at < ingredients.length; at += ACTIVITY_LIMITS.detailEntries) {
        const portions = ingredients.slice(at, at + ACTIVITY_LIMITS.detailEntries);
        view.facts.push({
          name: at ? `more ingredients ${at / ACTIVITY_LIMITS.detailEntries + 1}` : 'ingredients',
          value: portions,
          sentence: `${preparationCopy.ingredientsPrefix}${portions
            .map((portion) => {
              const carried = portion['selected carried quantity'];
              return `${portion.role}: ${portion['required quantity']} ${portion.material} (${typeof carried === 'number' ? `${carried}${preparationCopy.carriedSuffix}` : carried})`;
            })
            .join('; ')}`,
          critical: true,
        });
      }
    } else
      view.facts.push({
        name: 'preparation',
        value: 'The selected preparation changed or is unavailable',
        critical: true,
      });
  }
  if (command.type === 'fish') {
    const cast = perceived ? castDefinition(world, target) : undefined;
    if (cast) {
      view.facts.push({ name: 'cast', value: cast.description, critical: true });
      view.facts.push({
        name: 'supply',
        value: target!.resource!.quantity > 0 ? cast.supplyUnknownText : cast.exhaustedText,
        critical: true,
      });
      view.facts.push({
        name: 'approach',
        value: castCopy.approach,
        critical: true,
      });
    }
  }
  if (command.type === 'harvest')
    view.facts.push({
      name: 'requirements',
      value: `Requires a cutting tool and unharvested remains; ${BASE_ACTION_DEFAULTS.harvestSeconds} game seconds plus approach`,
      critical: true,
    });
  if (command.type === 'impact-boundary') {
    const family = world.assemblyFamilies?.[command.familyId],
      tool = entityGet(world.entities, command.toolId)?.item,
      profile =
        family?.implementation === 'grounded-panel-boundary' && tool
          ? family.damage?.tools.find((profile) => profile.definition.id === tool.definitionPin.id)
          : undefined;
    if (profile)
      view.facts.push({
        name: 'work',
        value: `${profile.seconds} game seconds plus approach; ${profile.impact} material impact; ${profile.reach} m reach`,
        critical: true,
      });
  }
  if (command.type === 'operate-gate') {
    const family = world.assemblyFamilies?.[command.familyId];
    if (family?.implementation === 'grounded-panel-boundary')
      view.facts.push({
        name: 'work',
        value: `${family.seconds[command.operation]} game seconds plus approach`,
        critical: true,
      });
  }
  if (command.type === 'place-hearth') {
    const hearth = world.hearthDefinitions?.[command.definitionId];
    if (hearth) {
      view.name = hearth.actionLabel;
      view.facts.push(
        {
          name: hearthCopy.activity.materialName,
          value: `${hearth.input.quantity} ${world.itemDefinitions[hearth.input.definition.id]?.name ?? 'material units'}${hearthCopy.activity.materialSuffix}`,
          critical: true,
        },
        {
          name: hearthCopy.activity.workName,
          value: `${hearth.workSeconds}${hearthCopy.activity.workSuffix}`,
          critical: true,
        },
        { name: hearthCopy.activity.placementName, value: hearth.help, critical: true },
      );
    }
  }
  if (command.type === 'tend-fire') {
    view.name =
      command.purpose ??
      { light: 'Light a fire', fuel: 'Add fuel to a fire', extinguish: 'Put out a fire' }[
        command.operation
      ];
    view.facts.push(...fireCareFacts(command.operation));
    if (perceived && target.heat)
      view.facts.push({
        name: 'fire',
        value: `${target.heat.lit ? 'Burning' : 'Cold'} now, with ${fireFuelDescription(target.heat)}`,
        critical: true,
      });
  }
  if (['harvest', 'cook', 'pickup', 'replenish', 'tend-fire'].includes(command.type))
    view.facts.push({
      name: 'approach',
      value: `Move to within ${command.type === 'pickup' ? world.itemHandling.reach : BASE_ACTION_DEFAULTS.interactionRadius} m; the route length is not known`,
      critical: true,
    });
  if (command.type === 'cook')
    view.facts.push({
      name: 'fire',
      value: perceived
        ? target.heat?.lit
          ? preparationCopy.fireCondition
          : 'Not lit now; cooking cannot start'
        : 'The fire condition is not currently known',
      critical: true,
    });
  if (command.type === 'gather') {
    view.facts.push({
      name: gatheringCopy.approachName,
      value: gatheringCopy.approach.replace(
        '{reach}',
        String(BASE_ACTION_DEFAULTS.interactionRadius),
      ),
      critical: true,
    });
    if (perceived && target.resource) {
      const { workSeconds, quantity, definitionId } = target.resource;
      view.facts.push({
        name: gatheringCopy.workName,
        value: gatheringCopy.work
          .replace('{seconds}', String(workSeconds))
          .replace('{quantity}', String(quantity))
          .replace('{material}', () => world.itemDefinitions[definitionId]?.name ?? 'material'),
        critical: true,
      });
    }
  }
  const recipe = command.type === 'craft' ? world.recipes[command.recipeId] : undefined;
  if (recipe) {
    if (recipe.retainedTools.length)
      view.facts.push({
        name: 'kept tools',
        value: recipe.retainedTools
          .map(
            (tool) =>
              `${tool.quantity} ${tool.allowedDefinitions.map((pin) => world.itemDefinitions[pin.id]!.name).join(' or ')}`,
          )
          .join('; '),
        critical: true,
      });
    view.facts.push({
      name: 'materials',
      value: recipe.inputs
        .map(
          (input) =>
            `${input.quantity} ${world.itemDefinitions[input.definitionId]?.name ?? 'material'}`,
        )
        .join(', '),
      critical: true,
    });
    view.facts.push({
      name: 'work',
      value: `${recipe.workSeconds} game seconds; materials are spent when work starts and are not returned on interruption`,
      critical: true,
    });
  }
  if (
    ['pickup', 'drop', 'transfer-item', 'split-item', 'merge-item'].includes(command.type) &&
    'quantity' in command &&
    command.quantity !== undefined
  )
    view.facts.push({ name: 'quantity', value: command.quantity, critical: true });
  if (command.type === 'eat' && definition?.nutrition)
    view.facts.push({
      name: 'food',
      value: `Uses one; restores up to ${definition.nutrition} fullness`,
      critical: true,
    });
  return view;
}

/** Shared method names admit authored public purposes only. Personal prose stays
 * in the actor's own occurrence, never the world-wide structural catalogue. */
export function sharedNativeActivityName(world: WorldState, command: Command): string {
  if (
    command.type === 'move' ||
    command.type === 'say' ||
    command.type === 'status-effect' ||
    command.type === 'follow' ||
    command.type === 'cook' ||
    command.type === 'eat' ||
    (command.type === 'strike' && !command.weaponItemId && !command.manualExecution)
  ) {
    const effect =
      command.type === 'status-effect'
        ? world.statusEffectPolicy.definitions.find((effect) => effect.id === command.definitionId)
        : undefined;
    return sharedOrdinaryActivityName({
      command: {
        type: command.type,
        purpose: command.purpose,
        ...(command.type === 'status-effect' ? { operation: command.operation } : {}),
      },
      ...(command.type === 'cook'
        ? { preparationName: preparationDefinition(world, command)?.name }
        : {}),
      ...(effect
        ? {
            effect: {
              label: effect.label,
              activate: effect.actions?.activate,
              deactivate: effect.actions?.deactivate,
            },
          }
        : {}),
    });
  }
  return nativeActivityView(world, {
    ...command,
    purpose: command.purpose === 'Hunt once' ? 'Hunt once' : undefined,
  }).name;
}

/** Extra ordinary-player commitment wording; NPC decision context is unchanged. */
export function nativeHuntCatalogueLabel(targetName: string, toolName: string): string {
  return `Hunt ${targetName} with ${toolName}`;
}

function nativeCatalogueCommitments(
  world: WorldState,
  command: Command,
  possessions: ViewPossessions,
): Array<[string, string]> {
  const facts: Array<[string, string]> = [];
  const action = entityGet(world.entities, command.actorId)?.actor?.action,
    heldAim =
      command.type === 'release-shot' && action?.id === command.aimId && action.ranged?.manual
        ? action
        : undefined;
  const heldStrike =
    command.type === 'release-strike' &&
    action?.id === command.expectedActionId &&
    action.type === 'strike' &&
    action.attackExecution
      ? action
      : undefined;
  const manualStrike = heldStrike || (command.type === 'strike' && command.manualExecution);
  const rangedWithoutApproach =
    (command.type === 'aim' || command.type === 'shoot-once') &&
    (!!command.aimPoint || (command.type === 'aim' && command.manualExecution));
  if (command.type === 'craft')
    facts.push([
      'Material selection',
      'Draws from carried supplies across lots; this action does not bind to one selected lot',
    ]);
  const heldItemId =
    heldAim?.weaponItemId ??
    heldStrike?.weaponItemId ??
    (command.type === 'guard'
      ? command.itemId
      : command.type === 'hunt' ||
          command.type === 'aim' ||
          command.type === 'shoot-once' ||
          command.type === 'strike'
        ? command.weaponItemId
        : undefined);
  if (heldItemId)
    facts.push([
      'Equipment',
      `${'autoEquip' in command && command.autoEquip ? equipmentChangeDescription(world, command.actorId, heldItemId) : ''}Requires this exact item to be held${heldAim ? '; releases this prepared aim' : manualStrike ? '; you control movement before impact' : rangedWithoutApproach ? '; no automatic approach' : command.type === 'guard' ? '; guarding stays in place' : '; approach is automatic'}`,
    ]);
  if (
    heldAim ||
    command.type === 'hunt' ||
    command.type === 'aim' ||
    command.type === 'shoot-once'
  ) {
    const weaponItemId =
        heldAim?.weaponItemId ?? ('weaponItemId' in command ? command.weaponItemId : undefined),
      ammoItemId =
        heldAim?.ammoItemId ?? ('ammoItemId' in command ? command.ammoItemId : undefined);
    const tool = weaponItemId && itemFor(world, weaponItemId);
    const definition = tool && world.itemDefinitions[tool.definitionId];
    facts.push([
      'Time',
      heldAim
        ? heldAim.ranged?.ready
          ? 'Immediate release of the already prepared aim'
          : `${heldAim.remainingSeconds} game seconds of preparation remain before the requested release`
        : `${shotPreparationSeconds(world, definition ? toolPracticeDefinition(world, definition)?.practice : undefined)} seconds of game time${rangedWithoutApproach ? '; no automatic approach' : ', plus approach'}`,
    ]);
    if (ammoItemId) {
      const projectile = activityView(
        world,
        {
          type: 'equip',
          actorId: command.actorId,
          id: 'preview-projectile',
          itemId: ammoItemId,
        },
        possessions,
      ).tool;
      if (projectile) facts.push(['Projectile', projectile]);
    } else if (weaponItemId)
      facts.push(['Ammunition', 'No compatible accessible, unreserved projectile is available.']);
  }
  if (
    heldAim ||
    heldStrike ||
    command.type === 'hunt' ||
    command.type === 'aim' ||
    command.type === 'shoot-once' ||
    command.type === 'strike'
  )
    facts.push([
      activityDisplay.strike.catalogue.uncertaintyName,
      activityDisplay.strike.catalogue.uncertainty,
    ]);
  return facts;
}

/** One immutable actor read supplies names and exact projectile lookups for the
 * entire player catalogue. Nothing survives the request or changes NPC context. */
export function nativeCatalogueView(
  world: WorldState,
  items: readonly ItemInstance[],
): (command: Command) => ActivityView {
  const possessions = prepareViewPossessions(world, items);
  return (command) => {
    const view = activityView(world, command, possessions);
    for (const [name, value] of nativeCatalogueCommitments(world, command, possessions))
      view.facts.push({ name, value, critical: true });
    return view;
  };
}
function rangedFact(template: string, fields: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, key: string) =>
    Object.hasOwn(fields, key) ? String(fields[key]) : token,
  );
}

/** Share physical naming and exact ammunition reads without adding catalogue-only facts. */
export function nativeActivityViews(
  world: WorldState,
  items: readonly ItemInstance[],
): (command: Command) => ActivityView {
  let possessions: ViewPossessions | undefined;
  return (command) =>
    activityView(
      world,
      command,
      ('weaponItemId' in command && command.weaponItemId) || ('itemId' in command && command.itemId)
        ? (possessions ??= prepareViewPossessions(world, items))
        : undefined,
    );
}
function prepareViewPossessions(
  world: WorldState,
  items: readonly ItemInstance[],
): ViewPossessions {
  const counts = new Map<string, number>(),
    ordinals = new Map<string, number>();
  for (const item of items) {
    const name = world.itemDefinitions[item.definitionId]!.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const names = new Map<string, string>();
  for (const item of items) {
    const name = world.itemDefinitions[item.definitionId]!.name;
    const ordinal = (ordinals.get(name) ?? 0) + 1;
    ordinals.set(name, ordinal);
    names.set(item.id, toolName(name, ordinal, counts.get(name)!));
  }
  return {
    items,
    names,
    byId: new Map(items.map((item) => [item.id, item])),
  };
}
