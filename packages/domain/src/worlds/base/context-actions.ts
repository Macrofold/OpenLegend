import { entityGet } from '../../entity-collection.js';
import { isEquipped } from '../../equipment.js';
import { activelyParticipates } from '../../participation-state.js';
import { seesEntity } from '../../perception.js';
import { personalEncounter } from '../../combat-encounters.js';
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

export function baseContextActions(world: WorldState, actorId: string, targetId?: string) {
  const actor = entityGet(world.entities, actorId);
  const target = targetId ? entityGet(world.entities, targetId) : undefined;
  const livingPair =
    actor?.actor?.alive &&
    target?.actor?.alive &&
    target.id !== actorId &&
    activelyParticipates(actor) &&
    activelyParticipates(target) &&
    seesEntity(world, actor, target);
  const ownAttack =
    livingPair && attacksBody(actor.actor?.action, target) ? actor.actor!.action : undefined;
  // Only this observer's acquired facts identify an opponent. Selection, approach,
  // another person's fight and hidden action targets cannot create incoming hostility.
  const pair = target ? personalEncounter(world, actorId, target.id) : undefined;
  const speaking =
    !!pair?.speak &&
    pair.speak.hostileRevision === pair.hostileRevision &&
    pair.speak.controller === actor?.actor?.controller;
  const heldAim = ownAttack?.type === 'aim' && !!ownAttack.ranged?.manual;
  const combat =
    !speaking &&
    !!(
      livingPair &&
      (heldAim ||
        (pair &&
          (Object.keys(pair.active).length ||
            (pair.incomingUntil ?? -1) > world.simTime ||
            (pair.own && (pair.own.until === undefined || pair.own.until > world.simTime)))))
    );
  return (choice: {
    command?: Command['type'];
    definitionId?: string;
    itemId?: string;
    ammoItemId?: string;
    speech?: boolean;
  }) => {
    const attack = !!choice.command && attacks.has(choice.command);
    const method = pair?.own?.method;
    const exactCurrent =
      !!method &&
      choice.command === method.type &&
      choice.itemId === method.weaponItemId &&
      choice.ammoItemId === method.ammoItemId &&
      (choice.command !== 'strike' || choice.definitionId === method.definitionId);
    const release = heldAim && choice.command === 'release-shot';
    const equipped = !!choice.itemId && isEquipped(world, actorId, choice.itemId);
    const contact = choice.command === 'strike';
    return {
      priority:
        combat && attack
          ? 1000 +
            (release
              ? 30000
              : exactCurrent
                ? 20000
                : contact && equipped
                  ? 200
                  : contact && !choice.itemId
                    ? 100
                    : 0) +
            (priorities[choice.command!] ?? 0)
          : choice.speech
            ? 100
            : ((choice.command && priorities[choice.command]) ?? 0),
      primary: combat
        ? attack
        : choice.speech || (!!choice.command && !standard.has(choice.command)),
    };
  };
}
