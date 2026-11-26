import { BASE_MANUAL_WORK_BODY_PLANS } from './bodies.js';
import { BASE_DECISION_OFFERS } from './decision-offers.js';

/** The bundled world's gestures and private-thought presentation. The native
 * owner imports this same definition; the engine supplies structured grammar. */
export const BASE_RESPONSE_RULES = {
  offers: BASE_DECISION_OFFERS,
  thought: { source: 'self_thought', summaryPrefix: 'thought: ', importance: 5 },
  interpretation: { importance: 5 },
  expression: {
    guidance: 'Available gestures',
    unsupportedGuidance:
      'This person or creature has no available gesture. Leave out gesture actions.',
    eventType: 'expression',
    bodyPlans: BASE_MANUAL_WORK_BODY_PLANS,
    unsupportedBody: 'This gesture requires a supported biped body.',
    unavailable: 'The expression target is unavailable or out of reach.',
    accepted: 'Expression accepted.',
    contacted: 'Brief contact occurred.',
    outOfReach: 'Move within reach before trying that gesture.',
  },
} as const;
