import type { DeathScar, ReincarnationPolicy } from '../../reincarnation.js';
export const BASE_DEATH_SCARS: DeathScar[] = [
  {
    id: 'wilderness:stiff-leg',
    name: 'Stiff leg',
    description: 'You walk 20% slower until treated.',
    movementFactor: 0.8,
    outgoingInjuryFactor: 1,
    incomingInjuryFactor: 1,
  },
  {
    id: 'wilderness:unsteady-hands',
    name: 'Unsteady hands',
    description: 'Your attacks inflict 20% less injury until treated.',
    movementFactor: 1,
    outgoingInjuryFactor: 0.8,
    incomingInjuryFactor: 1,
  },
  {
    id: 'wilderness:tender-chest',
    name: 'Tender chest',
    description: 'You receive 20% more injury until treated.',
    movementFactor: 1,
    outgoingInjuryFactor: 1,
    incomingInjuryFactor: 1.2,
  },
];
export const BASE_REINCARNATION_POLICY: ReincarnationPolicy = {
  retainedTypeFraction: 0.5,
  restKind: 'campfire',
  radius: 396,
  spawnOffset: 1.8,
  fillAttributes: ['wilderness:fullness', 'wilderness:energy'],
  scars: BASE_DEATH_SCARS,
  treatment: { materialId: 'prepared_fiber', quantity: 1, workSeconds: 600, reach: 2.2 },
  arrivalText: 'You stumble out of the woods...',
  arrivalNarration: '{subject.name:definite} stumbled out of the woods...',
  continueLabel: 'Continue near a campfire',
  deathText:
    'You died. Half of your carried item types remain with you; the rest are on your old body. Your next life carries a scar.',
  retainedLabel: 'Retained',
  lostLabel: 'Left on your old body',
  treatmentLabel: 'Treat',
  treatmentText: 'You finished treating one death scar.',
};
export const BASE_DEATH_COMMAND_DESCRIPTIONS = {
  respawn:
    'Continue as another iteration of the same character near a campfire. Your old body and its belongings stay where you died.',
  'treat-scar':
    'Spend prepared fiber and uninterrupted time beside a campfire to treat one death scar. Injury interrupts treatment.',
};
