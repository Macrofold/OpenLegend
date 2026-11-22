import copy from './handover-copy.json' with { type: 'json' };
import { person, subjectNarration } from '../../narration.js';

// Authored sharing policy for the bundled world, not a universal consent law.
// SocialOfferPolicy installs deadlines/inbox limits; this presentation/suggestion
// owner is still compiled directly. Selected-world replacement is tracked at BW20.
// docs/worlds/base/social.md#offering-and-accepting-possessions
export const BASE_HANDOVER = {
  /** Compact generated suggestions; retained exact disclosures remain addressable. */
  candidateLots: copy.candidateLots,
  nearestProposalRecipients: copy.nearestProposalRecipients,
  residentProposalLots: copy.residentProposalLots,
  residentProposals: copy.residentProposals,
  typedProposalLots: copy.typedProposalLots,
  typedProposals: copy.typedProposals,
  /** Internal lot identities give equal-priority proposals a stable order. */
  compareLotIds: (a: string, b: string) => Number(a > b) - Number(a < b),
  copy,
  text: {
    title: copy.title,
    newOffer: copy.newOffer,
    review: copy.review,
    refresh: copy.refresh,
    choose: copy.choose,
    whole: copy.whole,
    giveQuantity: copy.giveQuantity,
    receiveQuantity: copy.receiveQuantity,
    selectionHint: copy.selectionHint,
    exchanged: (terms: string) => copy.reciprocalAccepted.replace('{terms}', () => terms),
    into: copy.into,
    to: copy.to,
    remembered: copy.remembered,
    noTransfer: copy.noTransfer,
    give: copy.give,
    receive: copy.receive,
    offer: copy.offer,
    accept: copy.accept,
    decline: copy.decline,
    withdraw: copy.withdraw,
    counter: copy.counter,
    gift: copy.gift,
    waiting: copy.waiting,
    incoming: copy.incoming,
    changed: copy.changed,
    unavailable: copy.reciprocalUnavailable,
    giftUnavailable: copy.giftUnavailable,
    unknown: copy.unknown,
    carriedLot: (name: string, index: number) => `${name} (carried stack ${index + 1})`,
    disclosedLot: (name: string, index: number) =>
      copy.disclosedLot.replace(/\{(name|number)\}/g, (_slot, key) =>
        key === 'name' ? name : String(index + 1),
      ),
    actionLabel: (verb: string, terms: string, person: string, incoming: boolean) =>
      `${verb} ${terms} ${incoming ? 'from' : 'to'} ${person}`,
    acceptDescription: (receive: string, give: string) =>
      copy.replyAcceptTrade.replace(/\{(receive|give)\}/g, (_slot, key) =>
        key === 'receive' ? receive : give,
      ),
    declineDescription: (person: string, terms: string, give: string) =>
      copy.replyDeclineTrade.replace(/\{(person|terms|give)\}/g, (_slot, key) =>
        key === 'person' ? person : key === 'terms' ? terms : give,
      ),
    withdrawDescription: (terms: string) => `Withdraw my offer of ${terms}; nothing moves.`,
    counterDescription: (give: string, receive: string) =>
      `Counteroffer: give ${give} to receive ${receive}. This replaces the earlier terms; they must accept the new revision.`,
    exchangeDescription: (give: string, receive: string) =>
      `Give ${give} to receive ${receive}. Availability is checked when agreeing.`,
    giftDescription: (give: string, person: string, minutes: number) =>
      copy.giftDescription.replace(/\{(give|person|minutes)\}/g, (_slot, key) =>
        key === 'give' ? give : key === 'person' ? person : String(minutes),
      ),
    replyGift: (accept: boolean, person: string, terms: string) =>
      (accept ? copy.replyAcceptGift : copy.replyDeclineGift).replace(
        /\{(person|terms)\}/g,
        (_slot, key) => (key === 'person' ? person : terms),
      ),
    replyDuringWork: copy.replyDuringWork,
    draftChanged: copy.draftChanged,
    terms: (give: string, receive?: string) =>
      receive ? `${give}${copy.reciprocalSeparator}${receive}` : give,
    witness: (verb: string) => copy.witnessExchange.replace('{verb}', () => verb),
    participantEvent: (personId: string, verb: string, terms: string) =>
      subjectNarration(
        personId,
        copy.participantExchange.replace(/\{(verb|terms)\}/g, (_key, part) =>
          part === 'verb' ? verb : terms,
        ),
      ),
    giftEvent: (personId: string, verb: string, terms: string) =>
      verb === 'expired' || verb === 'lapsed'
        ? { parts: [person(personId, 'possessive'), ` offer of ${terms} ${verb}.`] }
        : subjectNarration(
            personId,
            verb === 'offered'
              ? `offered ${terms} to someone nearby.`
              : `${verb} an offer of ${terms}.`,
          ),
    decision: copy.decision,
  },
} as const;
