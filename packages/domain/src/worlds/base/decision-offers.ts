import { namePhrase, type Named } from '@open-legend/language';
import { BASE_ACTION_DEFAULTS } from './actions.js';
import { BASE_MANUAL_WORK_BODY_PLANS } from './bodies.js';
import { FOLLOW_RULES } from './navigation.js';
import { BASE_STRIKE_BODY_RULES } from './strikes.js';
import { BASE_GUARD_TEXT } from './shield-defense.js';

/** These are discovery rules and labels for this world's finite native choices.
 * Offering a choice never grants execution, target continuity or future work. */
export const BASE_DECISION_OFFERS = {
  inspectionCommand: 'inspect-inventory',
  followCommand: 'follow',
  strikeCommand: 'strike',
  interactionRadius: BASE_ACTION_DEFAULTS.interactionRadius,
  follow: FOLLOW_RULES,
  manualWorkBodyPlans: BASE_MANUAL_WORK_BODY_PLANS,
  naturalStrikeBodyPlans: BASE_STRIKE_BODY_RULES.unrestrictedBodyPlans,
  huntingPurpose: 'Hunt once',
  availability: {
    invalidFollow: {
      code: 'invalid-follow',
      message:
        'Choose another perceived actor and a following distance between 1.5 and 12 world units.',
    },
    unknownStrike: { code: 'unknown-action', message: 'Choose a registered strike.' },
    unsupportedStrike: {
      code: 'unsupported-body',
      message: 'This body cannot perform that natural strike.',
    },
    combatRecovery: { code: 'combat-recovery', message: BASE_GUARD_TEXT.recovery },
    strikeRange: { code: 'out-of-range', message: 'Move within strike range first.' },
    unperceived: { code: 'not-visible', message: 'The action target is not currently perceived.' },
    attackSource: {
      code: 'attack-source-unavailable',
      message: 'This body cannot begin an attack.',
    },
    attackTarget: {
      code: 'attack-target-unavailable',
      message: 'The selected living body is unavailable.',
    },
    attackPermission: {
      code: 'attack-not-permitted',
      message: 'Combat is unavailable in this world.',
    },
    followUnavailableCode: 'follow-unavailable',
    followUnperceived: 'the followed target is no longer perceived.',
    followRestricted: 'following is no longer available to this body.',
    followUnsupported: 'a supported ground stance is required.',
    followDead: 'the followed actor is no longer alive.',
    followChanged: 'the physical participant selected for following has changed.',
    followBudget: 'the follow route exceeds the current navigation budget.',
    followNoRoute: 'no supported route to the perceived target remains.',
  },
  probes: [
    { direction: 'north', dx: 0, dz: -0.75 },
    { direction: 'east', dx: 0.75, dz: 0 },
    { direction: 'south', dx: 0, dz: 0.75 },
    { direction: 'west', dx: -0.75, dz: 0 },
  ],
} as const;

export type DecisionOfferDescription =
  | { kind: 'inspection' }
  | { kind: 'continuation'; actionType?: string; planPending: boolean }
  | { kind: 'follow'; target: Named | string }
  | { kind: 'probe'; direction: string }
  | { kind: 'approach'; targetDescription: string; distance: string; reach: number };

/** Both current Source discovery and the detached native candidate formatter
 * call this owner with already permitted names and measured facts. */
export function decisionOfferDescription(input: DecisionOfferDescription): {
  description: string;
  firstActionDescription?: string;
} {
  switch (input.kind) {
    case 'inspection':
      return {
        description:
          'Inspect the first page of my own accessible possessions if the selected context omits needed information. This reads at most 16 possessions; it does not change them.',
      };
    case 'continuation':
      return {
        description: input.actionType
          ? `Continue the ${input.actionType} already in progress.`
          : input.planPending
            ? 'Continue the remaining chosen work, including steps not yet started. Each step rechecks its prerequisites.'
            : 'Remain in place while considering the next useful step.',
      };
    case 'follow':
      return {
        description: `Follow ${namePhrase(input.target, 'definite')} while visible; no stealth or automatic sunset stop.`,
      };
    case 'probe':
      return { description: `Probe a short distance ${input.direction}.` };
    case 'approach': {
      const target = input.targetDescription;
      return {
        firstActionDescription: `Move once near ${target}'s observed position`,
        description: `Move near the currently observed position of ${target}, currently ${input.distance} m away. Stop at the selected reachable place within ${input.reach} m of that observed position; route length is not known. This moves to that location once; it does not follow later movement.`,
      };
    }
  }
}
