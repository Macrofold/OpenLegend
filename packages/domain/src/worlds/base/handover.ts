import { person, subjectNarration } from '../../narration.js';

// Authored sharing policy for the bundled world, not a universal consent law.
// docs/worlds/base/social.md#offering-and-accepting-possessions
export const BASE_HANDOVER = {
  /** Game seconds an unanswered offer stays open: 30 wall seconds at 1×, 3.75 at 8×. */
  offerSeconds: 1800,
  /** Pending offers one person may hold out at once. */
  pendingPerOfferer: 3,
  /** Recent exact references per person; older experiences remain in ordinary memory. */
  candidateLots: 6,
  text: {
    title: 'Trade',
    newOffer: 'New offer',
    review: 'Review changed terms',
    refresh: 'Review current items',
    choose: 'Choose an item',
    whole: 'This object must be offered whole.',
    giveQuantity: 'Quantity you give',
    receiveQuantity: 'Quantity you receive',
    selectionHint:
      'This panel shows six carried lots and the six most recent item disclosures. Choose other possessions in Inventory. Older items can still be countered in an open offer; otherwise ask for a fresh disclosure.',
    exchanged: (terms: string) => `Exchanged ${terms}.`,
    into: 'Into your possessions',
    to: 'To',
    remembered: 'Last disclosed; current availability is unknown.',
    noTransfer: 'Nothing moves before acceptance.',
    give: 'You give',
    receive: 'You receive',
    offer: 'Offer',
    accept: 'Accept',
    decline: 'Decline',
    withdraw: 'Withdraw',
    counter: 'Counteroffer',
    gift: 'Nothing — a gift',
    waiting: 'Waiting for their reply',
    incoming: 'Your reply is needed',
    changed: 'The terms changed. Review both sides before replying.',
    unavailable: 'The agreed items are no longer available.',
    giftUnavailable: 'The offered items are no longer available.',
    unknown: 'No item has been disclosed. They can offer an item first.',
    carriedLot: (name: string, index: number) => `${name} · carried lot ${index + 1}`,
    disclosedLot: (name: string, index: number) => `${name} · disclosed lot ${index + 1}`,
    actionLabel: (verb: string, terms: string, person: string, incoming: boolean) =>
      `${verb} ${terms} ${incoming ? 'from' : 'to'} ${person}`,
    acceptDescription: (receive: string, give?: string) =>
      `Receive ${receive}${give ? ` and give ${give}; both move together or neither.` : ' into my possession now.'}`,
    declineDescription: (person: string, terms: string, give?: string) =>
      `Decline ${person}'s offer of ${terms}. Close this proposal${give ? ` while keeping my ${give}` : ''}; receive nothing and transfer nothing.`,
    withdrawDescription: (terms: string) => `Withdraw my offer of ${terms}; nothing moves.`,
    counterDescription: (give: string, receive: string) =>
      `Counteroffer: give ${give} to receive ${receive}. This replaces the earlier terms; they must accept the new revision.`,
    exchangeDescription: (give: string, receive: string) =>
      `Give ${give} to receive ${receive}. Availability is checked when agreeing.`,
    giftDescription: (give: string, person: string, minutes: number) =>
      `Offer ${give} to ${person}. Nothing moves unless they accept within ${minutes} game minutes; I keep it meanwhile and can withdraw it.`,
    replyDuringWork: 'Replying does not interrupt unrelated work.',
    draftChanged:
      'The offer changed or ended. Keep your draft and review the current terms, or submit a new offer.',
    terms: (give: string, receive?: string) => (receive ? `${give} for ${receive}` : give),
    witness: (verb: string) => `${verb} an item exchange with someone nearby.`,
    participantEvent: (personId: string, verb: string, terms: string) =>
      subjectNarration(personId, `${verb} an exchange of ${terms}.`),
    giftEvent: (personId: string, verb: string, terms: string) =>
      verb === 'expired' || verb === 'lapsed'
        ? { parts: [person(personId, 'possessive'), ` offer of ${terms} ${verb}.`] }
        : subjectNarration(
            personId,
            verb === 'offered'
              ? `offered ${terms} to someone nearby.`
              : `${verb} an offer of ${terms}.`,
          ),
    decision:
      'Choose freely using the exact items, your current needs, possessions and goals. Declining is a valid choice. No item moves before acceptance.',
  },
} as const;
