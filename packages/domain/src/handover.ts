import { namePhrase } from '@open-legend/language';
import { emit, outcome } from './events.js';
import { canHandleItems } from './item-handling.js';
import { accessiblePossession, inventoryWorkReason } from './object-access.js';
import { directChildIds, itemFor, moveLot } from './objects.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity } from './perception.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { availableItemQuantity } from './resource-claims.js';
import { canReachEntity } from './spatial.js';
import { nextId } from './data.js';
import { WorkBudgetError } from './work-budget.js';
import { BASE_HANDOVER } from './worlds/base/handover.js';
import type { Command, Entity, Outcome, WorldEvent, WorldState } from './types.js';

/** A pending proposal to hand over carried items. Nothing is reserved or moved until the
 * named recipient's own command accepts it; terminal offers are deleted, events keep history.
 * docs/worlds/base/social.md#offering-and-accepting-possessions */
export interface ItemOffer {
  id: string;
  offererId: string;
  recipientId: string;
  itemId: string;
  definitionId: string;
  quantity: number;
  /** An offered container's contents revision; acceptance never moves changed contents. */
  contentsRevision?: number;
  createdAt: number;
  expiresAt: number;
}
export const HANDOVER_OPERATIONS = ['offer', 'accept', 'decline', 'withdraw'] as const;
type HandoverCommand = Extract<Command, { type: 'handover' }>;

export function isHandoverCommand(command: Command): boolean {
  if (command?.type !== 'handover' || !isSafeRecordId(command.targetId)) return false;
  return command.operation === 'offer'
    ? isSafeRecordId(command.itemId) &&
        Number.isSafeInteger(command.quantity) &&
        command.quantity > 0 &&
        [
          command.expectedRevision,
          command.placementRevision,
          command.expectedContentsRevision,
          command.targetRevision,
        ].every(
          (revision) => revision === undefined || (Number.isSafeInteger(revision) && revision >= 0),
        )
    : (HANDOVER_OPERATIONS as readonly string[]).includes(command.operation) &&
        isSafeRecordId(command.offerId);
}

/** Scoped read for the two parties only; bystanders learn from perceived events. */
export function offersBetween(
  world: WorldState,
  actorId: string,
  otherId: string,
): { incoming: ItemOffer[]; outgoing: ItemOffer[] } {
  const incoming: ItemOffer[] = [],
    outgoing: ItemOffer[] = [];
  for (const offer of Object.values(world.itemOffers ?? {})) {
    if (offer.recipientId === actorId && offer.offererId === otherId) incoming.push(offer);
    if (offer.offererId === actorId && offer.recipientId === otherId) outgoing.push(offer);
  }
  return { incoming, outgoing };
}

const able = (entity: Entity | undefined): entity is Entity =>
  !!entity?.actor &&
  entity.actor.alive &&
  !entity.actor.incapacitated &&
  !entity.retirement &&
  activelyParticipates(entity);
/** One rule for who may be offered items now, shared by admission and every surface that
 * lists recipients: seen first, then able to take items, then within arm's reach. */
export function offerRecipientProblem(
  world: WorldState,
  offerer: Entity,
  recipient: Entity | undefined,
): { code: string; message: string } | null {
  if (!recipient || recipient.id === offerer.id || !seesEntity(world, offerer, recipient))
    return { code: 'not-visible', message: 'Choose a person you can currently see.' };
  if (!able(recipient) || !canHandleItems(world, recipient) || !canHandleItems(world, offerer))
    return { code: 'unavailable', message: 'That person cannot take items now.' };
  if (!canReachEntity(world, offerer, recipient, world.itemHandling.reach))
    return { code: 'out-of-reach', message: "Move within arm's reach of that person." };
  return null;
}
/** A bag keeps its access list when it changes hands, so a granted bag would let the giver
 * keep reaching into the recipient's possession; offer it only once no grant remains. */
function grantedContainer(world: WorldState, itemId: string): boolean {
  if (world.entities[itemId]?.container?.access) return true;
  for (const child of directChildIds(world, itemId))
    if (grantedContainer(world, child)) return true;
  return false;
}
const described = (world: WorldState, offer: ItemOffer) =>
  `${offer.quantity} ${world.itemDefinitions[offer.definitionId]?.name ?? 'item'}`;

/** Whether the offered terms still hold on the offerer's side. Deliberately one generic
 * answer: neither party learns why the other's circumstances changed. */
function offerStillHeld(world: WorldState, offer: ItemOffer): boolean {
  const item = itemFor(world, offer.itemId);
  const offerer = world.entities[offer.offererId];
  return (
    !!item &&
    able(offerer) &&
    item.definitionId === offer.definitionId &&
    world.itemDefinitions[item.definitionId]?.portable === true &&
    accessiblePossession(world, offer.offererId, item.id) &&
    availableItemQuantity(world, item.id) >= offer.quantity &&
    !inventoryWorkReason(world, offer.offererId, item.id) &&
    (offer.contentsRevision === undefined ||
      (world.entities[item.id]?.inventoryRevision ?? 0) === offer.contentsRevision)
  );
}
function close(
  world: WorldState,
  events: WorldEvent[],
  offer: ItemOffer,
  type: string,
  text: string,
  source: Entity | undefined,
  targetId: string,
): void {
  delete world.itemOffers![offer.id];
  if (!Object.keys(world.itemOffers!).length) delete world.itemOffers;
  if (source) emit(world, events, type, text, source, targetId, { offerId: offer.id });
}

/** The single owner of offer creation, consent and custody transfer. Every refusal leaves
 * the world unchanged; the kernel converts a failed outcome into a rejected command.
 * Neither outcome messages nor event text name the other person: a reader may not know
 * their name, and observer perspective renames only an event's leading acting subject.
 * The recipient still perceives an offer as directed at them through its target. */
export function executeHandover(
  world: WorldState,
  actor: Entity,
  command: HandoverCommand,
  events: WorldEvent[],
): Outcome {
  if (!isHandoverCommand(command))
    return outcome(false, 'invalid-command', 'Choose an offer and a person.');
  const other = getOwn(world.entities, command.targetId);
  const reach = world.itemHandling.reach;
  if (command.operation === 'offer') {
    // Sight comes first, so an unseen person cannot be probed for their condition.
    const refused = offerRecipientProblem(world, actor, other);
    if (refused || !other)
      return outcome(false, refused?.code ?? 'not-visible', refused?.message ?? 'Choose a person.');
    const item = itemFor(world, command.itemId);
    const definition = item && world.itemDefinitions[item.definitionId];
    if (!item || !definition || !accessiblePossession(world, actor.id, item.id))
      return outcome(false, 'item-unavailable', 'Choose one of your accessible possessions.');
    // A held inventory selection must not silently offer changed items. Check only after
    // normal sight and possession admission so these pins cannot probe private revisions.
    if (
      (command.expectedRevision !== undefined && item.revision !== command.expectedRevision) ||
      (command.placementRevision !== undefined &&
        item.placementRevision !== command.placementRevision) ||
      (command.expectedContentsRevision !== undefined &&
        (world.entities[item.id]!.inventoryRevision ?? 0) !== command.expectedContentsRevision) ||
      (command.targetRevision !== undefined &&
        (other.inventoryRevision ?? 0) !== command.targetRevision)
    )
      return outcome(false, 'stale', 'The item or recipient changed. Refresh before offering it.');
    if (definition.portable !== true)
      return outcome(false, 'not-portable', 'This object cannot be handed over.');
    if (command.quantity > availableItemQuantity(world, item.id))
      return outcome(false, 'quantity', 'You do not have that many free to offer.');
    if (
      command.quantity !== item.quantity &&
      (item.individuality === 'individual' || world.entities[item.id]?.container)
    )
      return outcome(false, 'whole-object', 'Offer the whole object.');
    const busy = inventoryWorkReason(world, actor.id, item.id);
    if (busy) return outcome(false, 'in-use', busy);
    if (grantedContainer(world, item.id))
      return outcome(false, 'access-granted', "Clear this bag's access list before offering it.");
    const pending = Object.values(world.itemOffers ?? {});
    if (pending.some((offer) => offer.itemId === item.id))
      return outcome(false, 'already-offered', 'These items are already being offered.');
    if (
      pending.filter((offer) => offer.offererId === actor.id).length >=
      BASE_HANDOVER.pendingPerOfferer
    )
      return outcome(false, 'offer-limit', 'Withdraw an earlier offer first.');
    const container = world.entities[item.id]?.container;
    const offer: ItemOffer = {
      id: nextId(world, 'offer'),
      offererId: actor.id,
      recipientId: other.id,
      itemId: item.id,
      definitionId: item.definitionId,
      quantity: command.quantity,
      ...(container ? { contentsRevision: world.entities[item.id]!.inventoryRevision ?? 0 } : {}),
      createdAt: world.simTime,
      expiresAt: world.simTime + BASE_HANDOVER.offerSeconds,
    };
    (world.itemOffers ??= {})[offer.id] = offer;
    // Only the offer itself invites the recipient to decide; replies stay routine.
    emit(
      world,
      events,
      'item-offered',
      `${namePhrase(actor, 'definite', { capitalize: true })} offered ${described(world, offer)} to someone nearby.`,
      actor,
      other.id,
      { offerId: offer.id, semanticTrigger: true, urgency: 4 },
    );
    return outcome(
      true,
      'offered',
      `Offered ${described(world, offer)}. Nothing moves unless they accept within ${BASE_HANDOVER.offerSeconds / 60} game minutes; you can withdraw it.`,
    );
  }
  const offer = getOwn(world.itemOffers ?? {}, command.offerId);
  const own =
    command.operation === 'withdraw'
      ? offer?.offererId === actor.id && offer.recipientId === command.targetId
      : offer?.recipientId === actor.id && offer.offererId === command.targetId;
  // Only the named parties may act; nobody else learns whether the offer exists.
  if (!offer || !own)
    return outcome(false, 'no-offer', 'There is no such offer between you and that person.');
  if (command.operation === 'withdraw') {
    close(
      world,
      events,
      offer,
      'offer-withdrawn',
      `${namePhrase(actor, 'definite', { capitalize: true })} withdrew an offer of ${described(world, offer)}.`,
      actor,
      offer.recipientId,
    );
    return outcome(true, 'withdrawn', 'Offer withdrawn; nothing moved.');
  }
  if (command.operation === 'decline') {
    close(
      world,
      events,
      offer,
      'offer-declined',
      `${namePhrase(actor, 'definite', { capitalize: true })} declined an offer of ${described(world, offer)}.`,
      actor,
      offer.offererId,
    );
    return outcome(true, 'declined', 'Offer declined; nothing moved.');
  }
  if (world.simTime >= offer.expiresAt) return outcome(false, 'expired', 'That offer has expired.');
  if (!other || !seesEntity(world, actor, other) || !seesEntity(world, other, actor))
    return outcome(false, 'not-visible', 'You and the offerer must be able to see each other.');
  if (!canHandleItems(world, actor))
    return outcome(false, 'unavailable', 'You cannot take items now.');
  if (!canReachEntity(world, actor, other, reach))
    return outcome(false, 'out-of-reach', "Move within arm's reach of the offerer to take it.");
  if (!offerStillHeld(world, offer))
    return outcome(false, 'offer-lapsed', 'The offered items are no longer available.');
  let itemId: string;
  try {
    itemId = moveLot(world, offer.itemId, actor.id, offer.quantity, command.id);
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return outcome(false, 'offer-lapsed', 'The offered items are no longer available.');
  }
  close(
    world,
    events,
    offer,
    'offer-accepted',
    `${namePhrase(actor, 'definite', { capitalize: true })} accepted an offer of ${described(world, offer)}.`,
    actor,
    offer.offererId,
  );
  return { ...outcome(true, 'accepted-offer', `Took ${described(world, offer)}.`), itemId };
}

/** Close expired offers and those whose parties or items can no longer honor them.
 * Each change emits an event, which also invalidates cached simulation intervals. */
export function reconcileItemOffers(world: WorldState, events: WorldEvent[]): void {
  if (!world.itemOffers) return;
  for (const offer of Object.values(world.itemOffers)) {
    const expired = world.simTime >= offer.expiresAt;
    if (!expired && able(world.entities[offer.recipientId]) && offerStillHeld(world, offer))
      continue;
    const offerer = world.entities[offer.offererId];
    const recipient = world.entities[offer.recipientId];
    close(
      world,
      events,
      offer,
      expired ? 'offer-expired' : 'offer-lapsed',
      `${offerer ? `${namePhrase(offerer, 'definite', { capitalize: true })}'s offer` : 'An offer'} of ${described(world, offer)} ${expired ? 'expired' : 'lapsed'}.`,
      offerer ?? recipient,
      offerer ? offer.recipientId : offer.offererId,
    );
  }
}

export function nextItemOfferDeadline(world: WorldState): number {
  let deadline = Infinity;
  for (const offer of Object.values(world.itemOffers ?? {}))
    deadline = Math.min(deadline, offer.expiresAt);
  return deadline;
}

/** Shape only: a dangling offer is ordinary state until reconciliation closes it. */
export function validateItemOffers(world: WorldState): void {
  if (world.itemOffers === undefined) return;
  if (!world.itemOffers || typeof world.itemOffers !== 'object' || Array.isArray(world.itemOffers))
    throw new Error('Invalid item offers.');
  const perOfferer = new Map<string, number>();
  const items = new Set<string>();
  for (const [id, offer] of Object.entries(world.itemOffers)) {
    if (
      !hasRecordFields(
        offer,
        [
          'id',
          'offererId',
          'recipientId',
          'itemId',
          'definitionId',
          'quantity',
          'createdAt',
          'expiresAt',
        ],
        ['contentsRevision'],
      ) ||
      id !== offer.id ||
      ![offer.id, offer.offererId, offer.recipientId, offer.itemId, offer.definitionId].every(
        isSafeRecordId,
      ) ||
      offer.offererId === offer.recipientId ||
      !Number.isSafeInteger(offer.quantity) ||
      offer.quantity < 1 ||
      (offer.contentsRevision !== undefined &&
        (!Number.isSafeInteger(offer.contentsRevision) || offer.contentsRevision < 0)) ||
      !Number.isFinite(offer.createdAt) ||
      !Number.isFinite(offer.expiresAt) ||
      offer.expiresAt <= offer.createdAt ||
      // Same expression as creation, so fractional clocks cannot round a valid offer out.
      offer.expiresAt > offer.createdAt + BASE_HANDOVER.offerSeconds ||
      items.has(offer.itemId)
    )
      throw new Error('Invalid item offer.');
    items.add(offer.itemId);
    const count = (perOfferer.get(offer.offererId) ?? 0) + 1;
    if (count > BASE_HANDOVER.pendingPerOfferer) throw new Error('Too many pending item offers.');
    perOfferer.set(offer.offererId, count);
  }
}
