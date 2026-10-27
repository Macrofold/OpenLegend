import type { Outcome, WorldState } from './types.js';
import { actorOutingIds } from './outing-index.js';
import { actorCompactIds } from './social-compact-index.js';
import { pendingItemOfferCounts } from './handover.js';
import { outcome } from './events.js';

export interface PendingSocialOfferCounts {
  incoming: number;
  outgoing: number;
}
export type SocialOfferReference = { family: 'handover' | 'outing' | 'compact'; id: string };

/** Inspect only this participant's indexed records. The result is admission,
 * never disclosure of another person's inbox or an instruction to accept.
 * docs/limits/first-playable-cooperation.md#cpl04--admission-and-inbox-growth */
export function pendingSocialOfferCounts(
  world: WorldState,
  actorId: string,
  excluding?: SocialOfferReference,
): PendingSocialOfferCounts {
  const result = pendingItemOfferCounts(
    world,
    actorId,
    excluding?.family === 'handover' ? excluding.id : undefined,
  );
  for (const id of actorOutingIds(world, actorId)) {
    const trip = world.outings?.[id];
    if (!trip || (excluding?.family === 'outing' && excluding.id === id)) continue;
    const pending =
      trip.status === 'pending'
        ? { proposerId: trip.proposerId, expiresAt: trip.expiresAt }
        : trip.kind === 'cooperate' && trip.pendingAmendment
          ? {
              proposerId: trip.pendingAmendment.proposedBy,
              expiresAt: trip.pendingAmendment.expiresAt,
            }
          : undefined;
    if (!pending || pending.expiresAt <= world.simTime) continue;
    if (pending.proposerId === actorId) result.outgoing++;
    else result.incoming++;
  }
  for (const id of actorCompactIds(world, actorId)) {
    const compact = world.socialCompacts?.[id];
    if (
      !compact ||
      compact.phase !== 'pending' ||
      compact.replyBy <= world.simTime ||
      (excluding?.family === 'compact' && excluding.id === id)
    )
      continue;
    if (compact.proposerId === actorId) result.outgoing++;
    else result.incoming++;
  }
  return result;
}
export function socialOfferAdmissionProblem(
  world: WorldState,
  proposerId: string,
  recipientId: string,
  excluding?: SocialOfferReference,
): Outcome | undefined {
  const policy = world.socialOfferPolicy;
  if (!policy)
    return outcome(
      false,
      'social-offers-unavailable',
      'This world does not install social offers.',
    );
  if (pendingSocialOfferCounts(world, proposerId, excluding).outgoing >= policy.outgoing)
    return outcome(false, 'social-offer-limit', policy.messages.outgoing);
  if (pendingSocialOfferCounts(world, recipientId, excluding).incoming >= policy.incoming)
    return outcome(false, 'social-offer-limit', policy.messages.incoming);
}

/** Full current-format validation is legitimate full-set work, once at installation. */
export function validateSocialOffers(world: WorldState): void {
  const actors = new Set<string>(),
    pairs = new Set<string>();
  for (const offer of Object.values(world.itemOffers ?? {})) {
    actors.add(offer.offererId);
    actors.add(offer.recipientId);
    if (world.socialOfferPolicy?.onePendingPerPair && offer.expiresAt > world.simTime) {
      const key = JSON.stringify([offer.offererId, offer.recipientId].sort());
      if (pairs.has(key)) throw new Error('Duplicate pending offers for one pair.');
      pairs.add(key);
    }
  }
  for (const trip of Object.values(world.outings ?? {})) {
    actors.add(trip.proposerId);
    actors.add(trip.recipientId);
  }
  for (const compact of Object.values(world.socialCompacts ?? {})) {
    actors.add(compact.proposerId);
    actors.add(compact.recipientId);
  }
  if (!world.socialOfferPolicy) {
    if (actors.size) throw new Error('Social records need their installed offer policy.');
    return;
  }
  for (const id of actors) {
    const counts = pendingSocialOfferCounts(world, id);
    if (
      counts.outgoing > world.socialOfferPolicy.outgoing ||
      counts.incoming > world.socialOfferPolicy.incoming
    )
      throw new Error('Saved pending social offers exceed the installed admission limit.');
  }
}
