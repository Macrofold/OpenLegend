import { equippedItem } from './equipment.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { worldPosition } from './spatial-state.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type { Entity, WorldState, WorldEvent } from './types.js';
import { commitBodyEffects } from './living.js';
import { emit } from './events.js';
import { subjectNarration } from './narration.js';
import { guardContactResult } from './worlds/base/shield-defense.js';
import { activelyParticipates } from './participation-state.js';

/** Finite contact-only capability; tuning and wording belong to the authored world. */
export interface ContactDefenseProfile {
  reduction: number;
  coverageDegrees: number;
  preparationSeconds: number;
  readySeconds: number;
  recoverySeconds: number;
  label: string;
  preparingLabel: string;
  readyLabel: string;
  recoveryLabel: string;
}
export interface GuardState {
  phase: 'preparing' | 'ready' | 'recovery';
  profile: DefinitionPin;
  physicalLife: number;
  facing: number;
  readyAt: number;
  expiresAt: number;
  recoveryUntil?: number;
}
export interface ContactImpact {
  rawInjury: number;
  preventedInjury: number;
  injury: number;
  guardActionId?: string;
  shieldItemId?: string;
  attemptedGuardId?: string;
  guardFailure?: 'unavailable' | 'preparing' | 'expired' | 'coverage';
}
export function validContactDefense(p: ContactDefenseProfile): boolean {
  return (
    !!p &&
    hasRecordFields(p, [
      'reduction',
      'coverageDegrees',
      'preparationSeconds',
      'readySeconds',
      'recoverySeconds',
      'label',
      'preparingLabel',
      'readyLabel',
      'recoveryLabel',
    ]) &&
    Number.isFinite(p.reduction) &&
    p.reduction > 0 &&
    p.reduction < 1 &&
    Number.isFinite(p.coverageDegrees) &&
    p.coverageDegrees > 0 &&
    p.coverageDegrees <= 360 &&
    [p.preparationSeconds, p.readySeconds, p.recoverySeconds].every(
      (n) => Number.isFinite(n) && n > 0,
    ) &&
    [p.label, p.preparingLabel, p.readyLabel, p.recoveryLabel].every(
      (t) => typeof t === 'string' && !!t.trim() && t.length <= 200,
    )
  );
}
export function currentGuardProfile(
  world: WorldState,
  defender: Entity,
): ContactDefenseProfile | undefined {
  const action = defender.actor?.action,
    guard = action?.guard;
  if (
    !activelyParticipates(defender) ||
    action?.type !== 'guard' ||
    !guard ||
    !action.itemId ||
    guard.physicalLife !== (defender.actor?.physicalLife ?? 0) ||
    guard.facing !== defender.spatial.heading
  )
    return;
  const shield = equippedItem(world, defender.id, 'guard', action.itemId);
  const definition = shield && world.itemDefinitions[shield.definitionId];
  return definition && sameDefinitionPin(guard.profile, definitionPin(definition))
    ? definition.contactDefense
    : undefined;
}
/** Pure calculation after an admitted contact hit; no extra roll or independent damage effect. */
export function contactImpact(
  world: WorldState,
  source: Entity,
  defender: Entity,
  rawInjury: number,
): ContactImpact {
  const ordinary: ContactImpact = { rawInjury, preventedInjury: 0, injury: rawInjury };
  const action = defender.actor?.action,
    guard = action?.guard;
  const profile = currentGuardProfile(world, defender);
  if (action?.type === 'guard' && guard && guard.phase !== 'recovery') {
    ordinary.attemptedGuardId = action.id;
    ordinary.guardFailure = !profile
      ? 'unavailable'
      : world.simTime < guard.readyAt
        ? 'preparing'
        : world.simTime >= guard.expiresAt
          ? 'expired'
          : 'coverage';
  }
  if (
    !profile ||
    !guard ||
    guard.phase === 'recovery' ||
    world.simTime < guard.readyAt ||
    world.simTime >= guard.expiresAt ||
    !defender.actor?.alive ||
    defender.actor.incapacitated
  )
    return ordinary;
  const from = worldPosition(source),
    to = worldPosition(defender);
  const dx = from.x - to.x,
    dz = from.z - to.z,
    length = Math.hypot(dx, dz);
  if (
    length <= 1e-8 ||
    (dx * Math.sin(guard.facing) + dz * Math.cos(guard.facing)) / length <
      Math.cos((profile.coverageDegrees * Math.PI) / 360)
  )
    return ordinary;
  return {
    rawInjury,
    preventedInjury: rawInjury * profile.reduction,
    injury: rawInjury * (1 - profile.reduction),
    guardActionId: action!.id,
    shieldItemId: action!.itemId,
  };
}
/** Start recovery before injury interrupts work. The existing body-scoped combat deadline
 * survives Stop and movement; it never supplies protection. */
export function recoverGuard(world: WorldState, defender: Entity, at = world.simTime): void {
  const actor = defender.actor!,
    action = actor.action,
    profile = currentGuardProfile(world, defender);
  if (!action?.guard || !profile || action.guard.phase === 'recovery') return;
  const until = at + profile.recoverySeconds;
  action.guard.phase = 'recovery';
  action.guard.recoveryUntil = until;
  action.totalSeconds = profile.recoverySeconds;
  action.remainingSeconds = Math.max(0, until - world.simTime);
  actor.combatReadyAt = Math.max(actor.combatReadyAt ?? 0, until);
}
export function combatRecoveryDeadline(world: WorldState, entity: Entity): number {
  const guard = entity.actor?.action?.guard;
  const profile = currentGuardProfile(world, entity);
  return Math.max(
    entity.actor?.combatReadyAt ?? 0,
    guard && profile && guard.phase !== 'recovery' && world.simTime >= guard.expiresAt
      ? guard.expiresAt + profile.recoverySeconds
      : 0,
  );
}
export function consumeContactGuard(
  world: WorldState,
  defender: Entity,
  impact: ContactImpact,
): void {
  if (impact.guardActionId && defender.actor?.action?.id === impact.guardActionId)
    recoverGuard(world, defender);
}
export function validateContactDefense(world: WorldState): void {
  for (const definition of Object.values(world.itemDefinitions))
    if (definition.contactDefense && !validContactDefense(definition.contactDefense))
      throw new Error('Invalid admitted contact defense.');
  for (const entity of Object.values(world.entities)) {
    const action = entity.actor?.action,
      guard = action?.guard;
    if (!action || (!guard && action.type !== 'guard')) continue;
    const profile = currentGuardProfile(world, entity);
    if (
      action.type !== 'guard' ||
      !guard ||
      !profile ||
      !isSafeRecordId(action.itemId) ||
      !hasRecordFields(
        guard,
        ['phase', 'profile', 'physicalLife', 'facing', 'readyAt', 'expiresAt'],
        ['recoveryUntil'],
      ) ||
      !['preparing', 'ready', 'recovery'].includes(guard.phase) ||
      !Number.isSafeInteger(guard.physicalLife) ||
      guard.physicalLife < 0 ||
      ![guard.facing, guard.readyAt, guard.expiresAt].every(Number.isFinite) ||
      guard.readyAt < 0 ||
      Math.abs(guard.expiresAt - guard.readyAt - profile.readySeconds) > 1e-6 ||
      (guard.phase === 'recovery'
        ? !Number.isFinite(guard.recoveryUntil) ||
          guard.recoveryUntil! < guard.readyAt + profile.recoverySeconds ||
          guard.recoveryUntil! > guard.expiresAt + profile.recoverySeconds ||
          (entity.actor!.combatReadyAt ?? 0) < guard.recoveryUntil!
        : guard.recoveryUntil !== undefined)
    )
      throw new Error('Invalid current guard continuation.');
  }
}
/** One committed contact injury path, shared by natural and equipment strikes. Existing body
 * susceptibility, scars, clamping, interruption and death still belong to the body owner. */
export function commitContactImpact(
  world: WorldState,
  source: Entity,
  defender: Entity,
  rawInjury: number,
  cause: string,
  events: WorldEvent[],
) {
  const impact = contactImpact(world, source, defender, rawInjury);
  const before = defender.actor!.health;
  consumeContactGuard(world, defender, impact);
  const committed = commitBodyEffects(
    world,
    defender,
    [{ targetId: defender.id, kind: 'injury', amount: impact.injury }],
    cause,
    events,
  ) ?? { healthBefore: before, healthAfter: before, injuryFactor: 0 };
  const result = {
    damage: committed.healthBefore - committed.healthAfter,
    rawInjury: rawInjury * committed.injuryFactor,
    preventedInjury: impact.preventedInjury * committed.injuryFactor,
    healthBefore: committed.healthBefore,
    healthAfter: committed.healthAfter,
  };
  const defenseActionId = impact.guardActionId ?? impact.attemptedGuardId;
  if (defenseActionId) {
    // The defender feels the result even when the attacker is hidden. Do not name or bind the
    // attacker, its item or its location in this participant-private physical account.
    emit(
      world,
      events,
      'guarded',
      subjectNarration(
        defender,
        guardContactResult(
          result,
          impact.guardFailure,
          !!defender.actor?.alive && !defender.actor.incapacitated,
        ),
      ),
      defender,
      undefined,
      { ...result, actionId: defenseActionId },
      'private',
    );
  }
  return result;
}
