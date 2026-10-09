import type { ContactDefenseProfile } from '../../contact-defense.js';
import type { Entity, WorldState } from '../../types.js';
import { equipmentConflicts, isEquipped } from '../../equipment.js';

export const BASE_GUARD_PROFILE: ContactDefenseProfile = {
  reduction: 0.5,
  coverageDegrees: 120,
  preparationSeconds: 15,
  readySeconds: 180,
  recoverySeconds: 60,
  label: 'Guard',
  preparingLabel: 'Preparing guard',
  readyLabel: 'Guard ready',
  recoveryLabel: 'Recovering from guard',
};
export const BASE_GUARD_TEXT = {
  description:
    'Choose a finite guard with a compatible shield, facing a visible target or the selected direction.',
  binding: 'Choose a shield and a visible target or facing direction.',
  active: 'This guard is already chosen. Stop it before choosing another direction.',
  unavailable: 'Equip that exact compatible shield first.',
  distinctDirection: 'Choose a visible target in a distinct direction.',
  facing: 'Choose a visible target or an explicit facing direction.',
  interrupted: 'the chosen guard is no longer available.',
  injuryInterrupted: 'Injury interrupted the chosen guard.',
  activity: 'guarding with a shield',
  activityLabel: 'Guarding with a shield',
  recovery: 'Finish recovering before guarding or attacking again. Movement remains available.',
  keywords: ['guard', 'shield', 'defend'],
};
export function guardChoiceLabel(shieldName: string, targetName?: string): string {
  return `${BASE_GUARD_PROFILE.label} with ${shieldName} ${targetName ? `facing ${targetName}` : 'in this direction'}`;
}
export function guardDescription(profile: ContactDefenseProfile): string {
  return `Prepare for ${profile.preparationSeconds} game seconds, then guard one connecting contact blow for up to ${profile.readySeconds} game seconds. Reduces injury by ${profile.reduction * 100}% within the front ${profile.coverageDegrees}°; then recover for ${profile.recoverySeconds} game seconds. Facing stays fixed. A late or rear blow still hurts; projectiles and other hazards are not blocked. Movement ends readiness and remains available during recovery.`;
}
export function guardContactResult(
  result: {
    preventedInjury: number;
    rawInjury: number;
    damage: number;
  },
  failure?: 'unavailable' | 'preparing' | 'expired' | 'coverage',
  canContinue = true,
): string {
  const amount = (n: number) => Number(n.toFixed(3));
  if (failure) {
    const reason =
      failure === 'preparing'
        ? 'the guard was still preparing'
        : failure === 'expired'
          ? 'the ready window had expired'
          : failure === 'coverage'
            ? 'the blow was outside the chosen coverage'
            : 'the chosen shield was unavailable';
    return `lost ${amount(result.damage)} health from a contact blow; ${reason}, so the shield prevented no injury.`;
  }
  return `blocked ${amount(result.preventedInjury)} of ${amount(result.rawInjury)} contact injury with the shield; lost ${amount(result.damage)} health.${canContinue ? ' Guard is now recovering.' : ''}`;
}
export function guardWorkLabel(world: WorldState, entity: Entity): string | undefined {
  const action = entity.actor?.action;
  const profile =
    action?.itemId &&
    world.itemDefinitions[world.entities[action.itemId]?.item?.definitionPin.id ?? '']
      ?.contactDefense;
  if (!profile || !action?.guard) return;
  return action.guard.phase === 'preparing'
    ? profile.preparingLabel
    : action.guard.phase === 'ready'
      ? profile.readyLabel
      : profile.recoveryLabel;
}
export function equipmentChangeDescription(
  world: WorldState,
  actorId: string,
  itemId: string,
): string {
  if (isEquipped(world, actorId, itemId)) return '';
  const conflicts = equipmentConflicts(world, actorId, itemId);
  return `Auto-equip${conflicts.length ? `; put away ${conflicts.map((i) => world.itemDefinitions[i.definitionId]!.name).join(', ')}` : ''}. `;
}
export function equipmentEquipOutcome(
  world: WorldState,
  itemId: string,
  stowedIds: string[],
): { message: string; narration: string } {
  const name = world.itemDefinitions[world.entities[itemId]!.item!.definitionPin.id]!.name;
  const stowed = stowedIds
    .map((id) => world.itemDefinitions[world.entities[id]!.item!.definitionPin.id]!.name)
    .join(', ');
  return {
    message: `Equipped ${name}.${stowed ? ` Put away ${stowed}; the same items remain carried.` : ''}`,
    narration: `equipped ${name}${stowed ? ` and put away ${stowed}` : ''}.`,
  };
}
