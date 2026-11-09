import { BASE_MANUAL_WORK_BODY_PLANS } from './bodies.js';
import { BASE_DECISION_OFFERS } from './decision-offers.js';

/** The bundled world's gestures and private-thought presentation. The native
 * owner imports this same definition; the engine supplies structured grammar. */
export const BASE_RESPONSE_RULES = {
  offers: BASE_DECISION_OFFERS,
  thought: { source: 'self_thought', summaryPrefix: 'thought: ', importance: 5 },
  interpretation: { importance: 5 },
  expression: {
    eventType: 'expression',
    bodyPlans: BASE_MANUAL_WORK_BODY_PLANS,
    unsupportedBody: 'This gesture requires a supported biped body.',
    unavailable: 'The expression target is unavailable or out of reach.',
    accepted: 'Expression accepted without mechanical effects.',
    verbs: {
      nod: { verb: 'nod', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      smile: { verb: 'smile', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      frown: { verb: 'frown', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      wave: { verb: 'wave', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      shrug: { verb: 'shrug', headSuffix: null, targetPrefix: ' toward ', requiresReach: false },
      shake_head: {
        verb: 'shake',
        headSuffix: ' head',
        targetPrefix: ' toward ',
        requiresReach: false,
      },
      slap: { verb: 'slap', headSuffix: null, targetPrefix: ' ', requiresReach: true },
    } as Record<
      string,
      { verb: string; headSuffix: string | null; targetPrefix: string; requiresReach: boolean }
    >,
  },
} as const;
