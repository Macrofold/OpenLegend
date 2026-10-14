import { canonicalJson, outcome } from './events.js';
import { bodyPolicy } from './body-policy.js';
import { itemFor } from './objects.js';
import { strikeDefinition } from './strikes.js';
import { definitionPin } from './world-modules.js';
import { scarFactor } from './scar-effects.js';
import type { Action, Entity, Outcome, WorldState } from './types.js';
import { activelyParticipates } from './participation-state.js';

/** Admission never chooses hostility. A released projectile checks its captured source
 * attribution separately from the body's ability to begin another action. */
export function attackPermissionProblem(
  world: WorldState,
  actor: Entity,
  target: Entity | undefined,
  attack: { requiresLethalReview?: boolean; targetLife?: number },
  committedSource?: { controller: 'player' | 'npc' | 'native' },
): Outcome | null {
  const policy = bodyPolicy(world)?.combat;
  const sourceController = committedSource?.controller ?? actor.actor?.controller;
  if (
    !committedSource &&
    (!actor.actor?.alive || actor.actor.incapacitated || !activelyParticipates(actor))
  )
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
  confirmLabel: string;
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
}
export function attackFacts(
  world: WorldState,
  actor: Entity,
  attack: Pick<Action, 'type' | 'definitionId' | 'weaponItemId' | 'ammoItemId'>,
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
      : definition?.launcher
        ? definition.launcher.damage + (ammoDefinition?.ammunition?.damageBonus ?? 0)
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
    }),
  };
}
export function lethalPermission(
  world: WorldState,
  actor: Entity,
  target: Entity,
  attack: Pick<Action, 'type' | 'definitionId' | 'weaponItemId' | 'ammoItemId'>,
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
  >,
): Outcome | null {
  const policy = bodyPolicy(world),
    facts = attackFacts(world, actor, attack);
  if (!facts || !target.actor?.body)
    return outcome(false, 'attack-unavailable', 'The attack is no longer available.');
  if (attack.lethalPermission) {
    const expected = lethalPermission(world, actor, target, attack);
    if (canonicalJson(expected) !== canonicalJson(attack.lethalPermission))
      return outcome(
        false,
        'lethal-review-stale',
        'The reviewed body or attack changed. Review another attack.',
      );
  }
  const potential =
    facts.injury *
    target.actor.body.susceptibility.injury *
    scarFactor(world, target, 'incomingInjuryFactor');
  if (
    policy?.lethalAttackReview &&
    (actor.actor?.controller === 'player' || attack.requiresLethalReview) &&
    policy.zeroHealth[target.actor.controller] === 'die' &&
    potential >= target.actor.health &&
    !attack.lethalPermission
  )
    return outcome(
      false,
      'lethal-review-required',
      'This attack could kill its target. Review one lethal attempt first.',
    );
  return null;
}
