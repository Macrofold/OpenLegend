import type { CognitionPolicy } from '../../cognition-policy.js';

export const DEFAULT_COGNITION_POLICY: CognitionPolicy = {
  dream: { statusEffectId: 'wilderness:restorative-rest', afterSeconds: 7200 },
  version: 1,
  revision: 1,
  maxImmediateLevel: 4,
  significantEventTypes: ['death', 'animal-died', 'incapacitated', 'taught'],
  reflection: true,
};
