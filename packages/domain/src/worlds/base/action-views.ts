import type { Command, WorldState } from '../../types.js';
import type { ActivityView } from '../../action-experience.js';
import { itemFor } from '../../objects.js';
import { accessiblePossession, possessionItems } from '../../object-access.js';
import { worldPosition } from '../../spatial-state.js';
import { seesEntity } from '../../perception.js';
import { observerDescription } from './knowledge.js';
import { strikeDefinition, describeAttack } from '../../strikes.js';
import { BASE_ACTION_DEFAULTS, rangedApproachRange } from './actions.js';
import { NATIVE_PREPARATIONS } from './items.js';

/** Bundled-world disclosure and wording; the engine stores the permitted view.
 * No later observation may fill in a hidden historical target or effect. */
export function nativeActivityView(world: WorldState, command: Command): ActivityView {
  const actor = world.entities[command.actorId];
  const targetId =
    'targetId' in command ? command.targetId : 'heatId' in command ? command.heatId : undefined;
  const target = targetId ? world.entities[targetId] : undefined;
  const perceived =
    !!actor && !!target && (actor.id === target.id || seesEntity(world, actor, target));
  const itemId =
    'weaponItemId' in command
      ? command.weaponItemId
      : 'itemId' in command
        ? command.itemId
        : undefined;
  const item =
    itemId && accessiblePossession(world, command.actorId, itemId)
      ? itemFor(world, itemId)
      : undefined;
  const definition = item && world.itemDefinitions[item.definitionId];
  const names: Partial<Record<Command['type'], string>> = {
    strike: 'Attack once',
    hunt: 'Hunt once',
    harvest: 'Harvest',
    cook: 'Cook',
    eat: 'Eat',
    equip: 'Equip',
    move: 'Move',
    gather: 'Gather',
    prepare: 'Prepare',
    craft: 'Make',
    pickup: 'Pick up',
    drop: 'Put down',
    'transfer-item': 'Move an item',
    'split-item': 'Separate part of a stack',
    'merge-item': 'Combine stacks',
    unequip: 'Put away equipment',
    follow: 'Follow',
    replenish: 'Replenish',
    recover: 'Recover',
    say: 'Speak',
    teach: 'Teach',
  };
  const view: ActivityView = { name: command.purpose ?? names[command.type] ?? 'Act', facts: [] };
  if (perceived) {
    view.target = observerDescription(world, command.actorId, target.id);
    const a = worldPosition(actor),
      b = worldPosition(target);
    view.facts.push({
      name: 'distance',
      value: `${Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z).toFixed(1)} m`,
      critical: true,
    });
    const bearing = Math.atan2(b.x - a.x, b.z - a.z) - actor.spatial.heading;
    const directions = [
      'ahead',
      'ahead and to my right',
      'to my right',
      'behind and to my right',
      'behind',
      'behind and to my left',
      'to my left',
      'ahead and to my left',
    ];
    view.facts.push({
      name: 'direction',
      value: directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8]!,
      critical: true,
    });
    if (target.animal && target.actor)
      view.facts.push({
        name: 'health',
        value: `${target.actor.health}/${target.actor.body?.maxHealth ?? 'unknown'}`,
        critical: true,
      });
  }
  if (command.type === 'move' && actor) {
    const from = worldPosition(actor),
      to = command.destination;
    view.target = `the chosen place at ${to.x.toFixed(1)}, ${to.z.toFixed(1)}`;
    view.facts.push({
      name: 'distance',
      value: `${Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z).toFixed(1)} m directly; the route length is not known`,
      critical: true,
    });
  }
  if (definition) {
    const siblings = [...possessionItems(world, command.actorId)].filter(
      (value) => world.itemDefinitions[value.definitionId]?.name === definition.name,
    );
    view.tool =
      siblings.length > 1
        ? `${definition.name}, item ${siblings.findIndex((value) => value.id === item!.id) + 1} among my same-named items`
        : definition.name;
    if (definition.description)
      view.facts.push({ name: 'description', value: definition.description, critical: false });
  }
  if (command.type === 'strike') {
    const profile =
      !command.weaponItemId || item
        ? strikeDefinition(command.definitionId, world, command.weaponItemId)
        : undefined;
    if (profile) {
      view.facts.push({ name: 'attack', value: describeAttack(profile), critical: true });
      view.facts.push({
        name: 'approach',
        value: `Move to within ${profile.approachRange ?? profile.range} m; route length is not known`,
        critical: true,
      });
    }
  }
  if (command.type === 'hunt' && definition?.launcher) {
    const ammunition = [...possessionItems(world, command.actorId)].find(
      (item) =>
        (!command.ammoItemId || command.ammoItemId === item.id) &&
        world.itemDefinitions[item.definitionId]?.ammunition?.kind ===
          definition.launcher!.ammunitionKind,
    );
    const ammo = ammunition && world.itemDefinitions[ammunition.definitionId];
    view.facts.push({
      name: 'attack',
      value: describeAttack({
        ...definition.launcher,
        damage: definition.launcher.damage + (ammo?.ammunition?.damageBonus ?? 0),
        workSeconds: BASE_ACTION_DEFAULTS.shotSeconds,
      }),
      critical: true,
    });
    view.facts.push({
      name: 'approach',
      value: `Move to within ${rangedApproachRange(definition.launcher.range).toFixed(2)} m; the route length is not known`,
      critical: true,
    });
    view.facts.push({
      name: 'ammunition',
      value: ammunition
        ? `Uses one ${ammo!.name}; ${ammunition.quantity} in this carried stack`
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
  if (command.type === 'say') {
    for (let at = 0; at < command.text.length; at += 500)
      view.facts.push({
        name: at ? 'more of my words' : 'my words',
        value: command.text.slice(at, at + 500),
        critical: true,
      });
    view.facts.push({
      name: 'reply',
      value: 'Speaking does not promise that anyone hears, answers or agrees',
      critical: true,
    });
  }
  if (command.type === 'cook') {
    view.facts.push({
      name: 'cost',
      value: `Uses one raw meat at the start; ${BASE_ACTION_DEFAULTS.cookSeconds} game seconds; requires a lit fire throughout; spent meat is not returned on interruption`,
      critical: true,
    });
  }
  if (command.type === 'harvest')
    view.facts.push({
      name: 'requirements',
      value: `Requires a cutting tool and unharvested remains; ${BASE_ACTION_DEFAULTS.harvestSeconds} game seconds plus approach`,
      critical: true,
    });
  if (['harvest', 'cook', 'gather', 'pickup', 'replenish'].includes(command.type))
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
          ? 'Lit now; it must stay lit until cooking ends'
          : 'Not lit now; cooking cannot start'
        : 'The fire condition is not currently known',
      critical: true,
    });
  if (command.type === 'gather' && perceived && target.resource)
    view.facts.push({
      name: 'work',
      value: `${target.resource.workSeconds} game seconds; ${target.resource.quantity} ${world.itemDefinitions[target.resource.definitionId]?.name ?? 'material'} remains here; actual yield depends on available material and tools`,
      critical: true,
    });
  const recipe = command.type === 'craft' ? world.recipes[command.recipeId] : undefined;
  const preparation =
    command.type === 'prepare' ? NATIVE_PREPARATIONS[command.preparation] : undefined;
  if (recipe) {
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
  if (preparation)
    view.facts.push({
      name: 'materials',
      value: `${preparation.inputQuantity} ${world.itemDefinitions[preparation.input]?.name ?? 'material'}; spent when work starts`,
      critical: true,
    });
  if (
    ['drop', 'transfer-item', 'split-item', 'merge-item'].includes(command.type) &&
    'quantity' in command
  )
    view.facts.push({ name: 'quantity', value: command.quantity, critical: true });
  if (command.type === 'status-effect') {
    const effect = world.statusEffectPolicy.definitions.find(
      (effect) => effect.id === command.definitionId,
    );
    if (effect)
      view.name =
        command.operation === 'activate'
          ? (effect.actions?.activate ?? `Begin ${effect.label}`)
          : (effect.actions?.deactivate ?? `End ${effect.label}`);
    view.facts.push({
      name: 'result',
      value: 'An attempt; the actual applied or resisted change is recorded when it happens',
      critical: true,
    });
  }
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
  return nativeActivityView(world, {
    ...command,
    purpose: command.purpose === 'Hunt once' ? 'Hunt once' : undefined,
  }).name;
}
