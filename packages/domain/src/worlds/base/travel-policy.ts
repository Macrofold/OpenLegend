import type { SurfacePoint } from '@open-legend/spatial';
import { BASE_PLAN_RULES } from './plan-rules.js';

const destinationRole = 'destination';
const movementFamily = BASE_PLAN_RULES.requestedMovementFamily;
const travelActivityRoot = (name: string) => ({
  kind: 'invoke' as const,
  key: 'travel',
  name,
  command: movementFamily,
  args: { destination: { role: destinationRole } },
});

// This actual Source constructor also emits the compiled root template. Keep
// its property order: the bound command is retained as precise action evidence.
const travelActivity = {
  root: travelActivityRoot,
  movementFamily,
  destinationRole,
  proposerSuffix: 'proposer',
  recipientSuffix: 'recipient',
  previewId: 'outing-preview',
} as const;

// Number spelling remains JavaScript's existing formatter. These word-only
// combinators also expose literal templates to the compiled selected family.
const pointWords = (x: string, z: string) => `the selected point (${x}, ${z})`;
const contextWords = (
  companion: string,
  place: string,
  distance: string,
  status: string,
  company: string,
) =>
  `Outing with ${companion}: ${place}; ${distance} metres straight-line distance from me; ${status}. ${company}.`;

/** The bundled world's travel words and finite input facts, with no runtime
 * world-state dependencies. Source and its compiled selected family consume this owner.
 * docs/worlds/base/social.md#voluntary-outings */
export const BASE_TRAVEL_POLICY = {
  family: 'base:outing-invite',
  maxPurposeCharacters: 120,
  activity: travelActivity,
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
    contextWords(companion, place, distance.toFixed(1), status, company),
  agreementDescription:
    'Only travel is agreed. Each person controls their own walk and may leave. Gathering, conversation, possessions and combat remain separate choices.',
  description:
    'Invite a nearby person to one known destination. Each person may decline or leave, and walks through their own ordinary actions. This agrees only to travel; gathering, conversation, possessions and combat remain separate choices.',
  travelName: (place: string) => `Travel to ${place} for the outing`,
  pointName: (point: SurfacePoint) => pointWords(point.x.toFixed(1), point.z.toFixed(1)),
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
    unobservedWorkEnd:
      'The previously chosen work is no longer available. The other person’s current choices are unknown.',
    rememberedEndingEvent:
      'You ended your own participation in the last received travel or help terms. The other person’s current choices remain unknown.',
    rememberedEnded: 'Your remembered participation ended; completed effects remain.',
    acceptedPhysicalSlot:
      'A person already has accepted physical cooperation; leave it before accepting another.',
  },
} as const;

/** Data emitted by the actual Source wording functions, not another copy of
 * Base's words. Inserted labels/purposes remain literal UTF-16 values: Native
 * uses its existing one-pass renderer, never another interpolation pass.
 * Number fields are supplied by the existing bound Source display formatter.
 * This describes the travel family; it opens no positive Native admission.
 */
export const BASE_TRAVEL_RULES = {
  family: BASE_TRAVEL_POLICY.family,
  kind: 'travel',
  eventType: 'outing',
  agreementFamily: 'movement-outing',
  participantCapability: 'memory',
  operations: ['invite', 'accept', 'decline', 'leave'],
  maxPurposeCharacters: BASE_TRAVEL_POLICY.maxPurposeCharacters,
  activity: {
    root: BASE_TRAVEL_POLICY.activity.root(BASE_TRAVEL_POLICY.travelName('{place}')),
    destinationRole: BASE_TRAVEL_POLICY.activity.destinationRole,
    proposerSuffix: BASE_TRAVEL_POLICY.activity.proposerSuffix,
    recipientSuffix: BASE_TRAVEL_POLICY.activity.recipientSuffix,
    previewId: BASE_TRAVEL_POLICY.activity.previewId,
  },
  label: BASE_TRAVEL_POLICY.label,
  leaveLabel: BASE_TRAVEL_POLICY.leaveLabel,
  companionPrefix: BASE_TRAVEL_POLICY.companionPrefix,
  agreementDescription: BASE_TRAVEL_POLICY.agreementDescription,
  description: BASE_TRAVEL_POLICY.description,
  companyLabels: {
    visible: BASE_TRAVEL_POLICY.companyLabel(true),
    hidden: BASE_TRAVEL_POLICY.companyLabel(false),
  },
  templates: {
    purpose: BASE_TRAVEL_POLICY.purposeText('{purpose}'),
    acceptIdle: BASE_TRAVEL_POLICY.acceptLabel('{place}', false),
    acceptReplace: BASE_TRAVEL_POLICY.acceptLabel('{place}', true),
    decline: BASE_TRAVEL_POLICY.declineLabel('{place}'),
    withdraw: BASE_TRAVEL_POLICY.withdrawLabel('{place}'),
    context: contextWords('{companion}', '{place}', '{distance}', '{status}', '{company}'),
    travelName: BASE_TRAVEL_POLICY.travelName('{place}'),
    pointName: pointWords('{x}', '{z}'),
    invitedProposer: BASE_TRAVEL_POLICY.invited('{place}', undefined, true),
    invitedProposerPurpose: BASE_TRAVEL_POLICY.invited('{place}', '{purpose}', true),
    invitedRecipient: BASE_TRAVEL_POLICY.invited('{place}', undefined, false),
    invitedRecipientPurpose: BASE_TRAVEL_POLICY.invited('{place}', '{purpose}', false),
    accepted: BASE_TRAVEL_POLICY.accepted('{place}'),
    arrived: BASE_TRAVEL_POLICY.arrived('{place}'),
    ended: BASE_TRAVEL_POLICY.ended('{place}', '{reason}'),
  },
  messages: BASE_TRAVEL_POLICY.messages,
} as const;
