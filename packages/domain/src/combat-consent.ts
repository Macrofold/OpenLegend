import { hasRecordFields, isSafeRecordId } from './records.js';
import { attackExecutionFactor, attackExecutionScore } from './combat-execution.js';
import { canonicalJson, outcome } from './events.js';
import { bodyPolicy } from './body-policy.js';
import { itemFor } from './objects.js';
import { strikeDefinition } from './strikes.js';
import { definitionPin } from './world-modules.js';
import { scarFactor } from './scar-effects.js';
import type { Action, Entity, Outcome, WorldState } from './types.js';
import { activelyParticipates } from './participation-state.js';

/** Admission never chooses hostility. Released effects use their captured contact law;
 * this check authorizes beginning an attack, not an already committed impact. */
export function attackPermissionProblem(
  world: WorldState,
  actor: Entity,
  target: Entity | undefined,
  attack: { requiresLethalReview?: boolean; targetLife?: number },
): Outcome | null {
  const policy = bodyPolicy(world)?.combat;
  const sourceController = actor.actor?.controller;
  if (!actor.actor?.alive || actor.actor.incapacitated || !activelyParticipates(actor))
    return outcome(false, 'attack-source-unavailable', 'This body cannot begin an attack.');
  if (
    !target?.actor?.alive ||
    !activelyParticipates(target) ||
    target.id === actor.id ||
    (attack.targetLife !== undefined && attack.targetLife !== (target.actor.physicalLife ?? 0))
  )
    return outcome(false, 'attack-target-unavailable', 'The selected living body is unavailable.');
  if (
    !policy ||
    !sourceController ||
    !policy.targets[sourceController].includes(target.actor.controller) ||
    ((sourceController === 'player' || attack.requiresLethalReview) &&
      !policy.humanIssuedTargets.includes(target.actor.controller))
  )
    return outcome(
      false,
      'attack-not-permitted',
      policy?.unavailableText ?? 'Combat is unavailable in this world.',
    );
  return null;
}

export interface LethalReviewPolicy {
  title: string;
  description: string;
  rangedDescription: string;
  confirmLabel: string;
  prepareLabel: string;
  cancelLabel: string;
}
/** Issued only after authenticated human review. Public commands carry an opaque server
 * token, never this authority. Saved actions retain the exact physical/tool commitment. */
export interface LethalPermission {
  actorId: string;
  sourceLife: number;
  targetId: string;
  targetLife: number;
  attackDigest: string;
  additionalTargets?: Array<Omit<LethalPermission, 'additionalTargets'>>;
}
export function validLethalPermission(value: unknown): value is LethalPermission {
  if (
    !hasRecordFields(
      value,
      ['actorId', 'sourceLife', 'targetId', 'targetLife', 'attackDigest'],
      ['additionalTargets'],
    )
  )
    return false;
  const permission = value as unknown as LethalPermission;
  if (
    ![permission.actorId, permission.targetId].every(isSafeRecordId) ||
    ![permission.sourceLife, permission.targetLife].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    typeof permission.attackDigest !== 'string' ||
    !permission.attackDigest
  )
    return false;
  return (
    permission.additionalTargets === undefined ||
    (Array.isArray(permission.additionalTargets) &&
      permission.additionalTargets.length === 1 &&
      permission.additionalTargets.every(
        (other) =>
          validLethalPermission(other) &&
          !('additionalTargets' in other) &&
          other.actorId === permission.actorId &&
          other.sourceLife === permission.sourceLife &&
          other.targetId !== permission.targetId,
      ))
  );
}
export function attackFacts(
  world: WorldState,
  actor: Entity,
  attack: Pick<Action, 'type' | 'definitionId' | 'weaponItemId' | 'ammoItemId' | 'attackExecution'>,
): { digest: string; injury: number } | null {
  const weapon = attack.weaponItemId ? itemFor(world, attack.weaponItemId) : undefined;
  const definition = weapon && world.itemDefinitions[weapon.definitionId];
  const ammunition = attack.ammoItemId ? itemFor(world, attack.ammoItemId) : undefined;
  const ammoDefinition = ammunition && world.itemDefinitions[ammunition.definitionId];
  const strike =
    attack.type === 'strike'
      ? strikeDefinition(attack.definitionId, world, attack.weaponItemId)
      : undefined;
  const raw =
    attack.type === 'strike'
      ? strike?.damage
      : definition?.rangedWeapon
        ? definition.rangedWeapon.damage + (ammoDefinition?.ammunition?.damageBonus ?? 0)
        : undefined;
  if (raw === undefined) return null;
  const outgoing = scarFactor(world, actor, 'outgoingInjuryFactor');
  return {
    injury: raw * outgoing,
    digest: canonicalJson({
      type: attack.type,
      strike,
      weapon: definition && definitionPin(definition),
      weaponId: weapon?.id,
      ammunition: ammoDefinition && definitionPin(ammoDefinition),
      ammoId: ammunition?.id,
      outgoing,
      execution: attack.attackExecution && {
        tool: attack.attackExecution.tool,
        profile: attack.attackExecution.profile,
        contact: attack.attackExecution.contact,
        injury: attack.attackExecution.injury,
        input: attack.attackExecution.input ?? { kind: 'ordinary' },
      },
    }),
  };
}
export function lethalPermission(
  world: WorldState,
  actor: Entity,
  target: Entity,
  attack: Pick<Action, 'type' | 'definitionId' | 'weaponItemId' | 'ammoItemId' | 'attackExecution'>,
): LethalPermission | null {
  const facts = attackFacts(world, actor, attack);
  return (
    facts && {
      actorId: actor.id,
      sourceLife: actor.actor?.physicalLife ?? 0,
      targetId: target.id,
      targetLife: target.actor?.physicalLife ?? 0,
      attackDigest: canonicalJson({
        attack: facts.digest,
        susceptibility: target.actor?.body?.susceptibility.injury,
        incomingInjuryFactor: scarFactor(world, target, 'incomingInjuryFactor'),
      }),
    }
  );
}
export function attackReviewProblem(
  world: WorldState,
  actor: Entity,
  target: Entity,
  attack: Pick<
    Action,
    | 'type'
    | 'definitionId'
    | 'weaponItemId'
    | 'ammoItemId'
    | 'lethalPermission'
    | 'requiresLethalReview'
    | 'attackExecution'
  >,
): Outcome | null {
  const policy = bodyPolicy(world),
    facts = attackFacts(world, actor, attack);
  if (!facts || !target.actor?.body)
    return outcome(false, 'attack-unavailable', 'The attack is no longer available.');
  const permission =
    attack.lethalPermission?.targetId === target.id
      ? attack.lethalPermission
      : attack.lethalPermission?.additionalTargets?.find((value) => value.targetId === target.id);
  if (permission) {
    const { additionalTargets: _otherTargets, ...singlePermission } =
      permission as LethalPermission;
    const expected = lethalPermission(world, actor, target, attack);
    if (canonicalJson(expected) !== canonicalJson(singlePermission))
      return outcome(
        false,
        'lethal-review-stale',
        'The reviewed body or attack changed. Review another attack.',
      );
  }
  const potential =
    facts.injury *
    attackExecutionFactor(
      attack.attackExecution,
      attackExecutionScore(attack as Action),
      'injury',
    ) *
    target.actor.body.susceptibility.injury *
    scarFactor(world, target, 'incomingInjuryFactor');
  if (
    policy?.lethalAttackReview &&
    (actor.actor?.controller === 'player' || attack.requiresLethalReview) &&
    policy.zeroHealth[target.actor.controller] === 'die' &&
    potential >= target.actor.health &&
    !permission
  )
    return outcome(
      false,
      'lethal-review-required',
      'This attack could kill its target. Review one lethal attempt first.',
    );
  return null;
}
