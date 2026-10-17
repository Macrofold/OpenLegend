import { isEquipped } from '../../equipment.js';
import { activelyParticipates } from '../../participation-state.js';
import { seesEntity } from '../../perception.js';
import type { Action, Command, Entity, WorldState } from '../../types.js';

/** Presentation preferences for this world, not new action admission or a saved combat
 * flag. Only a currently visible body's committed attack can identify an aggressor.
 * docs/projects/player-experience-overhaul-tech-design.md#pointer-hud-and-visibility-follow-up--october-16-2026 */
const attacks = new Set<string>(['strike', 'hunt', 'aim', 'shoot-once', 'release-shot']);
const standard = new Set<string>(['move', 'inspect', 'inspect-inventory', 'cancel']);
const priorities: Partial<Record<Command['type'], number>> = {
  gather: 90,
  pickup: 90,
  harvest: 90,
  fish: 90,
  'practice-shot': 90,
  'release-shot': 100,
  replenish: 80,
  cook: 70,
  craft: 70,
  hunt: 60,
  'shoot-once': 50,
  strike: 40,
  aim: 30,
};

function attacksBody(action: Action | null | undefined, target: Entity): boolean {
  return !!(
    action &&
    attacks.has(action.type) &&
    action.targetId === target.id &&
    action.targetLife === (target.actor?.physicalLife ?? 0)
  );
}

export function baseContextActions(
  world: WorldState,
  actorId: string,
  targetId?: string,
  observedLaunches: ReadonlySet<number> = new Set(),
) {
  const actor = world.entities[actorId];
  const target = targetId ? world.entities[targetId] : undefined;
  const livingPair =
    actor?.actor?.alive &&
    target?.actor?.alive &&
    target.id !== actorId &&
    activelyParticipates(actor) &&
    activelyParticipates(target) &&
    seesEntity(world, actor, target);
  const ownAttack =
    livingPair && attacksBody(actor.actor?.action, target) ? actor.actor!.action : undefined;
  // An enemy's private queued plan, remembered hostility or pursuit goal is not evidence.
  // Current native preparation/approach/recovery is a visible committed attack. Released
  // projectiles retain their independent exact source/target lives until flight ends.
  const combat = !!(
    livingPair &&
    (ownAttack ||
      attacksBody(target.actor?.action, actor) ||
      Object.values(world.projectiles ?? {}).some(
        (flight) =>
          !flight.practice &&
          ((flight.sourceId === actorId &&
            flight.targetId === target.id &&
            flight.sourceLife === (actor.actor?.physicalLife ?? 0) &&
            flight.targetLife === (target.actor?.physicalLife ?? 0)) ||
            (flight.sourceId === target.id &&
              flight.targetId === actorId &&
              observedLaunches.has(flight.launchedAt) &&
              flight.sourceLife === (target.actor?.physicalLife ?? 0) &&
              flight.targetLife === (actor.actor?.physicalLife ?? 0))),
      ))
  );
  return (choice: {
    command?: Command['type'];
    definitionId?: string;
    itemId?: string;
    speech?: boolean;
  }) => {
    const attack = !!choice.command && attacks.has(choice.command);
    const exactCurrent =
      !!ownAttack &&
      ((choice.command === ownAttack.type &&
        choice.itemId === ownAttack.weaponItemId &&
        (choice.command !== 'strike' || choice.definitionId === ownAttack.definitionId)) ||
        (choice.command === 'release-shot' && !!ownAttack.ranged?.manual));
    const equipped = !!choice.itemId && isEquipped(world, actorId, choice.itemId);
    return {
      priority:
        combat && attack
          ? 1000 + (exactCurrent ? 200 : equipped ? 100 : 0) + (priorities[choice.command!] ?? 0)
          : choice.speech
            ? 100
            : ((choice.command && priorities[choice.command]) ?? 0),
      primary: combat
        ? attack
        : choice.speech || (!!choice.command && !standard.has(choice.command)),
    };
  };
}
