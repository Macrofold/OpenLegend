import { entityGet } from '../../entity-collection.js';
import type { ContactDefenseProfile } from '../../contact-defense.js';
import type { Entity, WorldState } from '../../types.js';
import { equipmentConflicts, isEquipped } from '../../equipment.js';
import equipmentCopy from './equipment-copy.json' with { type: 'json' };
export { equipmentCopy as BASE_EQUIPMENT_COPY };

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
export const BASE_GUARD_CHOICE_COPY = {
  facing: '{label} with {shield} facing {name}',
  direction: '{label} with {shield} in this direction',
  detail:
    'Prepare for {preparation} game seconds, then guard one connecting melee blow or supported projectile for up to {ready} game seconds. Reduces injury by {reduction}% within the front {coverage}°; then recover for {recovery} game seconds. Facing stays fixed. A late or rear blow still hurts. Other hazards are not blocked. Movement ends readiness and remains available during recovery.',
} as const;
function guardCopy(template: string, fields: Readonly<Record<string, string | number>>) {
  return template.replace(/\{([a-z]+)\}/gu, (marker, key: string) =>
    Object.hasOwn(fields, key) ? String(fields[key]) : marker,
  );
}
export function guardChoiceLabel(
  shieldName: string,
  targetName?: string,
  label = BASE_GUARD_PROFILE.label,
): string {
  return guardCopy(targetName ? BASE_GUARD_CHOICE_COPY.facing : BASE_GUARD_CHOICE_COPY.direction, {
    label,
    shield: shieldName,
    name: targetName ?? '',
  });
}
export function guardDescription(
  profile: Pick<
    ContactDefenseProfile,
    'preparationSeconds' | 'readySeconds' | 'reduction' | 'coverageDegrees' | 'recoverySeconds'
  >,
): string {
  return guardCopy(BASE_GUARD_CHOICE_COPY.detail, {
    preparation: profile.preparationSeconds,
    ready: profile.readySeconds,
    reduction: profile.reduction * 100,
    coverage: profile.coverageDegrees,
    recovery: profile.recoverySeconds,
  });
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
    world.itemDefinitions[entityGet(world.entities, action.itemId)?.item?.definitionPin.id ?? '']
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
  return `${equipmentCopy.autoEquip}${conflicts.length ? `${equipmentCopy.putAway}${conflicts.map((i) => world.itemDefinitions[i.definitionId]!.name).join(', ')}` : ''}. `;
}
export function equipmentEquipOutcome(
  world: WorldState,
  itemId: string,
  stowedIds: string[],
): { message: string; narration: string } {
  const name =
    world.itemDefinitions[entityGet(world.entities, itemId)!.item!.definitionPin.id]!.name;
  const stowed = stowedIds
    .map((id) => world.itemDefinitions[entityGet(world.entities, id)!.item!.definitionPin.id]!.name)
    .join(', ');
  return {
    message: `${equipmentCopy.equipped}${name}.${stowed ? `${equipmentCopy.stowed}${stowed}${equipmentCopy.stowedResult}` : ''}`,
    narration: `${equipmentCopy.equippedEvent}${name}${stowed ? `${equipmentCopy.stowedEvent}${stowed}` : ''}.`,
  };
}
