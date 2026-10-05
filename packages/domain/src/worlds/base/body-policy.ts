import type { BodyPolicy } from '../../body-policy.js';
import type { StatusCondition } from '../../status-effects.js';
import { BASE_FAMILY_FACTS } from './actions.js';
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
  version: 2,
  zeroHealth: {
    player: 'incapacitate',
    npc: 'die',
    native: 'die',
    incapacitateNarration: '{subject.name:definite} collapsed and can recover at camp.',
    deathNarration: '{subject.name:definite} died.',
  },
  recovery: {
    controllers: ['player'],
    when: {
      any: [
        { field: { target: '$subject', name: 'incapacitated', operator: 'equal', value: true } },
        below('wilderness:health', 30),
        below('wilderness:fullness', 20),
      ],
    },
    anchor: 'safeReturnAnchor',
    floors: [
      { attributeId: 'wilderness:health', value: 65 },
      { attributeId: 'wilderness:fullness', value: 45 },
      { attributeId: 'wilderness:energy', value: 65 },
    ],
    label: 'Recover at camp',
    narration: '{subject.name:definite} recovered at camp.',
    successText: 'Recovered at camp.',
    refusalText: 'Camp recovery is available when health or food is critically low.',
  },
  revival: { fillToMaximum: ['wilderness:fullness', 'wilderness:energy'] },
  remains: {
    rotAfterSeconds: 3 * 86400,
    removeAfterSeconds: 7 * 86400,
    freshLabel: 'Dead',
    rottingLabel: 'Rotting',
    rotNarration: '{subject.name:definite} began to rot.',
    removalNarration: 'The remains of {subject.name:definite} decomposed.',
  },
  consumption: {
    attributeId: 'wilderness:fullness',
    quantityProperty: 'nutrition',
    refusals: [
      { itemType: BASE_FAMILY_FACTS.cooking.input, reason: 'Cook raw meat before eating.' },
    ],
    label: 'Eat one',
    narration: '{subject.name:definite} ate {item.name:definite}.',
    successText: 'Food restored fullness.',
    unavailableText: 'Choose prepared edible food.',
    suggestWhen: below('wilderness:fullness', 30),
  },
  carryingConcern: {
    attributeId: 'wilderness:fullness',
    itemProperty: 'food',
    text: 'I have no food.',
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
