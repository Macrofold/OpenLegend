import type { BodyPolicy } from '../../body-policy.js';
import type { StatusCondition } from '../../status-effects.js';
import { BASE_REINCARNATION_POLICY } from './death.js';
import { BASE_EVASION_TEXT, BASE_RANGED_TEXT } from './ranged-counterplay.js';
import type { ActorComponent } from '../../types.js';

/** These native families use the bundled injury-cancels-preparation rule. The body
 * mutation owner performs cancellation; this policy chooses whether it applies.
 * Alternate body/action interruption laws remain EWF03 work, without a second writer.
 * docs/engine-and-world-boundaries.md#intentional-v1-specificity */
export function baseCombatInjuryInterruption(
  healthBefore: number,
  actor: Pick<ActorComponent, 'health' | 'action'>,
): string | undefined {
  if (!(actor.health < healthBefore)) return;
  if (actor.action?.ranged) return BASE_RANGED_TEXT.injuryInterrupted;
  if (actor.action?.evasion) return BASE_EVASION_TEXT.injuryInterrupted;
}

const below = (attribute: string, value: number): StatusCondition => ({
  compare: { target: '$subject', attribute, operator: 'lessThan', value },
});
const distress: StatusCondition = {
  any: [below('wilderness:health', 40), below('wilderness:fullness', 30)],
};
const awake: StatusCondition = {
  statusActive: { target: '$subject', definitionId: 'wilderness:restorative-rest', value: false },
};
export const BASE_BODY_POLICY: BodyPolicy = {
  id: 'wilderness:body-policy',
  version: 8,
  evasion: {
    bodyPlans: ['biped'],
    maximumDistance: 2,
    seconds: 12,
    repeatSeconds: 120,
    label: 'Evade',
    description:
      'Bodies and walls can stop movement. No immunity or attack bonus is granted. Walking remains available.',
  },
  combat: {
    targets: {
      player: ['npc', 'native'],
      npc: ['player', 'npc', 'native'],
      native: ['player', 'npc', 'native'],
    },
    humanIssuedTargets: ['npc', 'native'],
    // A perceived impact warrants prompt reconsideration, never a prescribed retaliation.
    // docs/worlds/base/lifecycle-and-protection.md#npc-combat-participation
    impactAttention: { importance: 8, urgency: 8 },
    unavailableText: 'This attack is not permitted against that participating body.',
  },
  reincarnation: BASE_REINCARNATION_POLICY,
  lethalAttackReview: {
    title: 'Attempt a final blow?',
    description:
      'This attack could kill the target. Death leaves a body; ordinary animal and NPC revival is unavailable. Confirm one attack; a hit is not guaranteed. Choosing does not pause the world.',
    confirmLabel: 'Attempt lethal blow',
    cancelLabel: 'Cancel',
  },
  zeroHealth: {
    player: 'die',
    npc: 'die',
    native: 'die',
    incapacitateNarration: '{subject.subject:definite} collapsed and can recover at camp.',
    deathNarration: '{subject.subject:definite} died.',
  },
  recovery: null,
  revival: { fillToMaximum: ['wilderness:fullness', 'wilderness:energy'] },
  remains: {
    rotAfterSeconds: 3 * 86400,
    removeAfterSeconds: 7 * 86400,
    freshLabel: 'Dead',
    rottingLabel: 'Rotting',
    rotNarration: '{subject.subject:definite} began to rot.',
    removalNarration: 'The remains of {subject.object:definite} decomposed.',
  },
  consumption: {
    attributeId: 'wilderness:fullness',
    quantityProperty: 'nutrition',
    refusals: [{ itemType: 'raw_meat', reason: 'Cook raw meat before eating.' }],
    label: 'Eat one',
    narration: '{subject.subject:definite} ate {item.name:definite}.',
    successText: 'Food restored fullness.',
    unavailableText: 'Choose prepared edible food.',
    suggestWhen: below('wilderness:fullness', 30),
  },
  carryingConcern: {
    attributeId: 'wilderness:fullness',
    itemProperty: 'food',
    text: '{subject.subject} {subject.verb:have} no food.',
  },
  backgroundThinking: {
    maintenanceBlockedWhen: distress,
    commitBlockedWhen: { any: [distress, { all: [below('wilderness:energy', 15), awake] }] },
    reflectionBlockedWhen: { any: [distress, below('wilderness:energy', 30)] },
    reconsiderationInputs: [
      { key: 'exhausted', when: below('wilderness:energy', 15), director: true },
      { key: 'energy-critical', when: below('wilderness:energy', 10), director: false },
    ],
  },
};
