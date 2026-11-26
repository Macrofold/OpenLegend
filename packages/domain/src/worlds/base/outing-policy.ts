import { hasMemory } from '../../living.js';
import type { OutingEndCause } from '../../outings.js';
import { BASE_TRAVEL_POLICY } from './travel-policy.js';

/** Authored pair/fixed-place scope. Consent never grants a promise or another actor's body.
 * docs/worlds/base/social.md#voluntary-outings */
export const BASE_OUTING = {
  // Native wildlife cannot retain or answer this social agreement. Capability, not
  // species/anatomy or player-vs-NPC control, leaves room for other authored people.
  participant: hasMemory,
  ...BASE_TRAVEL_POLICY,
} as const;

const helpConsequences =
  'Only unfinished work belonging to this agreement stops; injuries, released shots, spent supplies and recovery remain. The opponent may still act.';
const helpRefusalConsequence = 'This refusal starts no attack or physical work.';
/** Fighting together is a separate, revocable request, never a trip's implied permission. */
export const BASE_COMBAT_HELP = {
  family: 'base:combat-help',
  keywords: ['help', 'fight', 'combat'],
  label: 'Ask for combat help',
  purpose: 'Help me in this fight',
  risk: 'You may be injured or killed. You choose how to help and can stop.',
  description:
    'Ask a nearby person for help against one opponent you both currently identify. You may be injured or killed. You choose how to help and can stop. Acceptance begins no attack and grants no control over the helper.',
  accept: 'Accept combat help',
  decline: 'Decline combat help',
  stop: 'Stop helping',
  cancel: 'Cancel request',
  companionPrefix: ' Combat companion: ',
  sent: 'Combat help requested. Acceptance grants no control and starts no attack.',
  declined: `Combat help declined. ${helpRefusalConsequence}`,
  invited: (proposer: boolean) =>
    `${proposer ? 'requested voluntary help' : 'received a request for voluntary help'} against the identified opponent. Nobody attacks by accepting; each person chooses their own actions and may stop. You may be injured or killed.`,
  accepted: (recipient: boolean) =>
    `${recipient ? 'accepted voluntary help' : 'received acceptance of voluntary help'} against the identified opponent. Each person chooses their own actions and may stop. You may be injured or killed.`,
  ended: `Combat help ended. ${helpConsequences}`,
  closed: (cause: OutingEndCause, pending: boolean, bySelf: boolean | undefined) => {
    if (cause === 'declined')
      return `${bySelf ? 'declined the combat-help request' : 'received refusal of the combat-help request'}. ${helpRefusalConsequence}`;
    if (pending) {
      if (cause === 'expired')
        return 'had the unanswered combat-help request expire. No help was accepted.';
      if (cause === 'left')
        return `${bySelf ? 'withdrew from' : 'received withdrawal of'} the unanswered combat-help request. No help was accepted.`;
      return 'had the unanswered combat-help request become unavailable. No help was accepted.';
    }
    if (cause === 'left')
      return `${bySelf ? 'stopped the agreed combat help' : 'had the agreed combat help stopped by the companion'}. ${helpConsequences}`;
    return `had the agreed combat help become unavailable. ${helpConsequences}`;
  },
  unavailable:
    'This combat help is unavailable. The opponent or a participant is no longer available, contact was lost, or another priority was chosen. No unseen circumstances are disclosed.',
  opponent: 'Both people must currently perceive the same eligible opponent.',
  objective: (companion: string, opponent: string) =>
    `Help ${companion} in this fight against ${opponent}; choose how to help and stop when needed.`,
  actionDescription: (opponent: string, action: string) =>
    `Continue your accepted combat help against ${opponent}: ${action}`,
  separateActionDescription: (action: string) =>
    `${action} Choosing this as separate work ends your accepted combat help.`,
  workChoiceTerms:
    'The person who accepted ends their help if they choose separate physical work. Work chosen for this agreement continues it; talking and inspecting do not end it.',
  context: (
    companion: string,
    opponent: string,
    distance: number | null,
    status: string,
    company: string,
  ) =>
    `Help with ${companion} against ${opponent}: ${status}; ${distance === null ? 'opponent not in sight; location unknown' : `${distance.toFixed(1)} metres away`}. ${company}.`,
  company: 'saw the combat companion again. This observation grants no control over them.',
  separated:
    'lost sight of the combat companion. Their location is unknown; each person still chooses their own actions and may stop helping.',
} as const;
