import type { CognitionPolicy } from '../../cognition-policy.js';

export const DEFAULT_COGNITION_POLICY: CognitionPolicy = {
  actionGuidance: {
    reasons:
      'Choose a worthwhile next step for this person using current bodily state, feelings, interests, knowledge, commitments and chosen goals. Curiosity, enjoyment, company and rest are reasons to act without material gain or a declared goal. Reassess from actual remembered outcomes and present circumstances whether further work still serves a current reason. Mere availability or possible future usefulness is insufficient. Continuing useful admitted work is legitimate; needless restarting is not.',
    consideration:
      'Is this a reasonable action for this actor to consider taking now, given the trigger, current situation, interests and intentions?',
    selection:
      'Does this action serve a current need, intention or interest supported by this character’s knowledge, values and present circumstances?',
    criteria: {
      true: 'The action serves a current need, intention or interest. Enjoyment, curiosity, company and rest can be worthwhile without material gain or a declared goal. Its prerequisites are available; ordinary risk or further work does not make it pointless.',
      false:
        'No remaining reason supports the action here, it conflicts with the character’s values, depends on unavailable prerequisites, or needlessly restarts completed or remaining work. Mere availability or possible future usefulness does not establish a current reason.',
    },
  },
  recording: { actionResultImportance: 6, exposureImportance: 6 },
  dream: { statusEffectId: 'wilderness:restorative-rest', afterSeconds: 7200 },
  version: 1,
  revision: 1,
  maxImmediateLevel: 4,
  significantEventTypes: ['death', 'animal-died', 'incapacitated', 'taught'],
  reflection: true,
};
