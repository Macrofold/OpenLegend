import {
  availableStrikes,
  availableItemQuantity,
  BASE_GUARD_TEXT,
  BASE_RANGED_TEXT,
  BASE_SKILLED_TEXT,
  combatRecoveryDeadline,
  entityGet,
  nativeCommandSupported,
  preferredTargetEquipment,
  rangedPolicy,
  strikeDefinition,
  supportsManualWork,
  worldSupport,
  type ItemInstance,
  type WorldState,
  type StrikeDefinition,
} from '@open-legend/domain';
import type { GameView } from '@open-legend/protocol';

/** Offer this body's selected held source without inventing a target or searching hidden bodies. */
export function attackSourceView(
  world: WorldState,
  actorId: string,
  inventory: readonly ItemInstance[],
): GameView['player']['attackSource'] {
  const item = preferredTargetEquipment(world, actorId),
    definition = item && world.itemDefinitions[item.definitionId],
    actor = entityGet(world.entities, actorId),
    recovering = !!actor && combatRecoveryDeadline(world, actor) > world.simTime;
  if (item && definition?.rangedWeapon) {
    const ammunitionId = inventory.find(
      (ammo) =>
        world.itemDefinitions[ammo.definitionId]?.ammunition?.kind ===
          definition.rangedWeapon!.ammunitionKind && availableItemQuantity(world, ammo.id) >= 1,
    )?.id;
    const command = definition.execution ? 'aim' : 'shoot-once';
    const reason =
      !nativeCommandSupported(world, command) ||
      !rangedPolicy(world) ||
      !actor ||
      !supportsManualWork(actor) ||
      worldSupport(actor) === null
        ? BASE_SKILLED_TEXT.sourceUnavailable
        : recovering
          ? BASE_GUARD_TEXT.recovery
          : !ammunitionId
            ? BASE_RANGED_TEXT.ammunitionUnavailable
            : undefined;
    return {
      label: definition.name,
      enabled: !reason,
      ...(reason ? { reason } : {}),
      kind: 'ranged',
      pointFire: rangedPolicy(world)?.pointFire === true,
      ...(rangedPolicy(world) ? { targetRule: rangedPolicy(world)!.targetRule } : {}),
      command: { type: command, itemId: item.id, ...(ammunitionId ? { ammunitionId } : {}) },
      ...(definition.execution ? { profile: definition.execution.profile } : {}),
    };
  }
  const strikes = availableStrikes(world, actorId);
  const strike =
    item && definition?.melee
      ? strikeDefinition(definition.id, world, item.id)
      : strikes.find((candidate) => !candidate.weaponItemId);
  if (!strike) return;
  const selected = strike.weaponItemId && world.itemDefinitions[strike.id];
  return projectMeleeAttackSource(
    strike,
    nativeCommandSupported(world, 'strike'),
    strikes.some(
      (candidate) => candidate.id === strike.id && candidate.weaponItemId === strike.weaponItemId,
    ),
    recovering,
    selected && selected.execution ? selected.execution.profile : undefined,
  );
}

/** The selected source and its actual availability are already known. Neither
 * this display nor its command installs a target or grants an attack. */
export function projectMeleeAttackSource(
  strike: StrikeDefinition,
  supported: boolean,
  available: boolean,
  recovering: boolean,
  profile: NonNullable<GameView['player']['attackSource']>['profile'],
): NonNullable<GameView['player']['attackSource']> {
  const reason =
    !supported || !available
      ? BASE_SKILLED_TEXT.sourceUnavailable
      : recovering
        ? BASE_GUARD_TEXT.recovery
        : undefined;
  return {
    label: strike.label,
    enabled: !reason,
    ...(reason ? { reason } : {}),
    kind: 'melee',
    command: {
      type: 'strike',
      definitionId: strike.id,
      ...(strike.weaponItemId ? { itemId: strike.weaponItemId } : {}),
    },
    ...(profile ? { profile } : {}),
  };
}
