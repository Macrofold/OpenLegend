import type { SurfacePoint } from '@open-legend/spatial';
import { BASE_HANDOVER } from './handover.js';
import { hasMemory } from '../../living.js';
import type { OutingEndCause } from '../../outings.js';

/** Authored pair/fixed-place scope. Consent never grants a promise or another actor's body.
 * docs/worlds/base/social.md#voluntary-outings */
export const BASE_OUTING = {
  // Native wildlife cannot retain or answer this social agreement. Capability, not
  // species/anatomy or player-vs-NPC control, leaves room for other authored people.
  participant: hasMemory,
  offerSeconds: BASE_HANDOVER.offerSeconds,
  pendingPerProposer: BASE_HANDOVER.pendingPerOfferer,
  family: 'base:outing-invite',
  label: 'Invite to travel',
  leaveLabel: 'Leave outing',
  companionPrefix: ' Outing companion: ',
  companyLabel: (visible: boolean) => (visible ? 'In sight' : 'Not in sight; location unknown'),
  purposeText: (purpose: string | undefined) => (purpose ? ` Stated purpose: “${purpose}”.` : ''),
  acceptLabel: (place: string, busy: boolean) =>
    `Accept travel to ${place}${busy ? ' and replace my current work' : ''}`,
  declineLabel: (place: string) => `Decline travel to ${place}`,
  withdrawLabel: (place: string) => `Withdraw invitation to ${place}`,
  context: (companion: string, place: string, distance: number, status: string, company: string) =>
    `Outing with ${companion}: ${place}; ${distance.toFixed(1)} metres straight-line distance from me; ${status}. ${company}.`,
  agreementDescription:
    'Only travel is agreed. Each person controls their own walk and may leave. Gathering, conversation, possessions and combat remain separate choices.',
  description:
    'Invite a nearby person to one known destination. Each person may decline or leave, and walks through their own ordinary actions. This agrees only to travel; gathering, conversation, possessions and combat remain separate choices.',
  travelName: (place: string) => `Travel to ${place} for the outing`,
  pointName: (point: SurfacePoint) =>
    `the selected point (${point.x.toFixed(1)}, ${point.z.toFixed(1)})`,
  invited: (place: string, purpose: string | undefined, proposer: boolean) =>
    `${proposer ? 'offered company' : 'received an invitation'} to ${place}${purpose ? `; stated purpose: “${purpose}”` : ''}. Only travel is proposed; acceptance or refusal remains a choice.`,
  accepted: (place: string) =>
    `agreed to travel to ${place}. Each participant controls their own walk and may leave.`,
  arrived: (place: string) =>
    `arrived at ${place} for the outing. Conversation, gathering and any other work remain separate choices. The companion's arrival is known only if observed.`,
  ended: (place: string, reason: string) => `ended the outing to ${place}. ${reason}`,
  messages: {
    person: 'Choose a person you can currently see.',
    nearby: 'Both people must be able to travel and within speaking reach.',
    terms: 'Choose a person, a fixed destination and how to handle current work.',
    limit: 'Leave your accepted outing or withdraw a pending invitation before adding another.',
    pending:
      'There is already an invitation or outing between these people. Reply to it or leave it before proposing another.',
    destination: 'Choose a place you can currently see or a permitted map point.',
    busy: 'Finish current work, or explicitly choose to replace or pause it for this outing.',
    changed:
      'The invitation no longer applies because the agreed trip or current work changed. Choose a new invitation.',
    route: 'The agreed walk cannot start now. No participant has started or replaced work.',
    unavailable:
      'This outing is no longer available. No private circumstances or unseen location are disclosed.',
    invited: 'Invitation sent. Nobody moves until the recipient freely accepts these terms.',
    accepted: 'The outing was accepted. Each person has their own walk to the agreed destination.',
    declined: 'The invitation was declined. No travel or other work was started.',
    left: 'The outing ended by choice. Only remaining travel belonging to this outing was stopped.',
    expired: 'The unanswered invitation expired.',
    interrupted:
      'The outing ended after its travel was stopped or replaced. Other chosen work is unchanged.',
    finished:
      'Your travel is finished. The outing is closed; what happens next is a separate choice.',
    company: 'saw the outing companion again. This observation grants no control over them.',
    separated:
      'lost sight of the outing companion. Their location is unknown. The agreed destination is unchanged; continuing there or leaving remains a choice.',
  },
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
