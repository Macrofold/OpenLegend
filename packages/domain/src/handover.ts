import { subjectNarration } from './narration.js';
import { emit, emitPrivateObservation, emitWitnessObservation, outcome } from './events.js';
import { canHandleItems } from './item-handling.js';
import { accessiblePossession, inventoryWorkReason } from './object-access.js';
import {
  directChildIds,
  itemFor,
  moveLot,
  moveLotsTogether,
  jointItemMoveReason,
  objectAncestors,
} from './objects.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity } from './perception.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { availableItemQuantity } from './resource-claims.js';
import { canReachEntity } from './spatial.js';
import { nextId } from './data.js';
import { WorkBudgetError } from './work-budget.js';
import { readOnlyDraftView } from './draft.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { BASE_HANDOVER } from './worlds/base/handover.js';
import type { Command, Entity, ItemInstance, Outcome, WorldEvent, WorldState } from './types.js';

export interface RequestedLot {
  itemId: string;
  quantity: number;
  expectedRevision?: number;
  placementRevision?: number;
  expectedContentsRevision?: number;
}
export interface OfferLot {
  itemId: string;
  definitionPin: DefinitionPin;
  quantity: number;
  whole: boolean;
  revision: number;
  placementRevision: number;
  contentsRevision?: number;
  subtreeRevision?: number;
}
/** Remembered explicit terms, never live stock, contents or packing information. */
export interface KnownTradeLot {
  lot: OfferLot;
  name: string;
  description: string;
  disclosedAt: number;
}
/** Pending consent only. Events and ordinary command receipts retain outcomes.
 * docs/worlds/base/social.md#offering-and-accepting-possessions */
export interface ItemOffer {
  id: string;
  revision: number;
  offererId: string;
  recipientId: string;
  offered: OfferLot;
  requested?: OfferLot;
  createdAt: number;
  expiresAt: number;
}
export const HANDOVER_OPERATIONS = ['offer', 'counter', 'accept', 'decline', 'withdraw'] as const;
type HandoverCommand = Extract<Command, { type: 'handover' }>;
type TermsCommand = Extract<HandoverCommand, { operation: 'offer' | 'counter' }>;
const revision = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
function validRequest(lot: RequestedLot): boolean {
  return (
    !!lot &&
    isSafeRecordId(lot.itemId) &&
    Number.isSafeInteger(lot.quantity) &&
    lot.quantity > 0 &&
    [lot.expectedRevision, lot.placementRevision, lot.expectedContentsRevision].every(
      (pin) => pin === undefined || revision(pin),
    )
  );
}
export function isHandoverCommand(command: Command): boolean {
  if (command?.type !== 'handover' || !isSafeRecordId(command.targetId)) return false;
  if (command.operation === 'offer' || command.operation === 'counter')
    return (
      validRequest(command) &&
      (command.requested === undefined || validRequest(command.requested)) &&
      (command.targetRevision === undefined || revision(command.targetRevision)) &&
      (command.operation !== 'counter' ||
        (isSafeRecordId(command.offerId) && revision(command.expectedOfferRevision)))
    );
  return (
    (HANDOVER_OPERATIONS as readonly string[]).includes(command.operation) &&
    isSafeRecordId(command.offerId) &&
    revision(command.expectedOfferRevision)
  );
}
interface OffersBetween {
  readonly incoming: readonly ItemOffer[];
  readonly outgoing: readonly ItemOffer[];
}
interface OfferIndex {
  between: Map<string, Map<string, { incoming: ItemOffer[]; outgoing: ItemOffer[] }>>;
  byItem: Map<string, ItemOffer>;
  outgoingCount: Map<string, number>;
}
const offerIndexes = new WeakMap<NonNullable<WorldState['itemOffers']>, OfferIndex>();
const emptyOfferIndex: OfferIndex = {
  between: new Map(),
  byItem: new Map(),
  outgoingCount: new Map(),
};
const noOffers: OffersBetween = Object.freeze({
  incoming: Object.freeze([]),
  outgoing: Object.freeze([]),
});
function offerIndex(world: WorldState): OfferIndex {
  if (!world.itemOffers) return emptyOfferIndex;
  const offers = readOnlyDraftView(world.itemOffers);
  const cached = Object.isFrozen(offers) ? offerIndexes.get(offers) : undefined;
  if (cached) return cached;
  const index: OfferIndex = {
    between: new Map(),
    byItem: new Map(),
    outgoingCount: new Map(),
  };
  const pair = (actorId: string, otherId: string) => {
    let people = index.between.get(actorId);
    if (!people) index.between.set(actorId, (people = new Map()));
    let terms = people.get(otherId);
    if (!terms) people.set(otherId, (terms = { incoming: [], outgoing: [] }));
    return terms;
  };
  for (const offer of Object.values(offers ?? {})) {
    pair(offer.offererId, offer.recipientId).outgoing.push(offer);
    pair(offer.recipientId, offer.offererId).incoming.push(offer);
    index.byItem.set(offer.offered.itemId, offer);
    if (offer.requested) index.byItem.set(offer.requested.itemId, offer);
    index.outgoingCount.set(offer.offererId, (index.outgoingCount.get(offer.offererId) ?? 0) + 1);
  }
  for (const people of index.between.values())
    for (const terms of people.values()) {
      Object.freeze(terms.incoming);
      Object.freeze(terms.outgoing);
      Object.freeze(terms);
    }
  // A published offer table has immutable terms. Draft edits/mutable builders rebuild;
  // deletion, replacement and restore therefore cannot inherit stale consent or membership.
  if (offers && Object.isFrozen(offers)) offerIndexes.set(offers, index);
  return index;
}
export function offersBetween(world: WorldState, actorId: string, otherId: string): OffersBetween {
  return offerIndex(world).between.get(actorId)?.get(otherId) ?? noOffers;
}
/** Read only remembered disclosures from this person, without consulting their stock. */
export function knownTradeLots(
  world: WorldState,
  actorId: string,
  otherId: string,
  limit: number = BASE_HANDOVER.candidateLots,
): KnownTradeLot[] {
  const result: KnownTradeLot[] = [],
    remembered = world.entities[actorId]?.actor?.knownTradeLots?.[otherId] ?? {};
  for (const id in remembered) {
    const known = getOwn(remembered, id);
    if (known) result.push(known);
    if (result.length >= limit) break;
  }
  return result;
}
const able = (entity: Entity | undefined): entity is Entity =>
  !!entity?.actor &&
  entity.actor.alive &&
  !entity.actor.incapacitated &&
  !entity.retirement &&
  activelyParticipates(entity);
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
function grantedContainer(world: WorldState, itemId: string): boolean {
  if (world.entities[itemId]?.container?.access) return true;
  for (const child of directChildIds(world, itemId))
    if (grantedContainer(world, child)) return true;
  return false;
}
function pinLot(world: WorldState, item: ItemInstance, quantity: number): OfferLot {
  const entity = world.entities[item.id]!;
  return {
    itemId: item.id,
    definitionPin: { ...entity.item!.definitionPin },
    quantity,
    whole: !!entity.container || entity.item!.individuality === 'individual',
    revision: entity.item!.revision,
    placementRevision: entity.placement!.revision,
    ...(entity.container
      ? {
          contentsRevision: entity.inventoryRevision ?? 0,
          subtreeRevision: entity.container.subtreeRevision,
        }
      : {}),
  };
}
export function describeOfferLot(world: WorldState, lot: OfferLot): string {
  return lot.quantity + ' ' + (world.itemDefinitions[lot.definitionPin.id]?.name ?? 'item');
}
export function describeItemOffer(world: WorldState, offer: ItemOffer): string {
  return BASE_HANDOVER.text.terms(
    describeOfferLot(world, offer.offered),
    offer.requested && describeOfferLot(world, offer.requested),
  );
}
function lotStillHeld(world: WorldState, holderId: string, lot: OfferLot, exact = true): boolean {
  const item = itemFor(world, lot.itemId),
    holder = world.entities[holderId];
  const definition = item && world.itemDefinitions[item.definitionId];
  return (
    !!item &&
    able(holder) &&
    canHandleItems(world, holder) &&
    !!definition &&
    sameDefinitionPin(definitionPin(definition), lot.definitionPin) &&
    sameDefinitionPin(world.entities[item.id]!.item!.definitionPin, lot.definitionPin) &&
    (!exact ||
      (item.revision === lot.revision && item.placementRevision === lot.placementRevision)) &&
    definition.portable === true &&
    accessiblePossession(world, holderId, item.id) &&
    availableItemQuantity(world, item.id) >= lot.quantity &&
    !inventoryWorkReason(world, holderId, item.id) &&
    (lot.contentsRevision === undefined ||
      (world.entities[item.id]?.inventoryRevision ?? 0) === lot.contentsRevision) &&
    (lot.subtreeRevision === undefined ||
      world.entities[item.id]?.container?.subtreeRevision === lot.subtreeRevision) &&
    !grantedContainer(world, item.id)
  );
}
function offerStillHeld(world: WorldState, offer: ItemOffer): boolean {
  return (
    lotStillHeld(world, offer.offererId, offer.offered, !!offer.requested) &&
    (!offer.requested || lotStillHeld(world, offer.recipientId, offer.requested))
  );
}
function remember(world: WorldState, learnerId: string, holderId: string, lot: OfferLot) {
  const learner = world.entities[learnerId]?.actor,
    entity = world.entities[lot.itemId];
  const definition = world.itemDefinitions[lot.definitionPin.id];
  if (!learner || !definition || !entity?.item) return;
  const known = (learner.knownTradeLots ??= {});
  const disclosed: KnownTradeLot = {
    lot: { ...lot, definitionPin: { ...lot.definitionPin } },
    name: definition.name,
    description: definition.description,
    disclosedAt: world.simTime,
  };
  // Recent executable references are bounded; ordinary memories retain older experiences.
  // docs/limits/parallel-batch-04-expeditions-and-exchange.md#px-l01--one-exact-lot-on-each-side-of-an-immediate-barter
  const recent = knownTradeLots(world, learnerId, holderId).filter(
    (entry) => entry.lot.itemId !== lot.itemId,
  );
  known[holderId] = Object.fromEntries(
    [disclosed, ...recent]
      .slice(0, BASE_HANDOVER.candidateLots)
      .map((entry) => [entry.lot.itemId, entry]),
  );
}
/** Witnesses perceive the ordinary act; only parties receive exact reciprocal terms.
 * Private occurrences use existing awareness/memory, without disclosing bag interiors. */
function notice(
  world: WorldState,
  events: WorldEvent[],
  offer: ItemOffer,
  type: string,
  verb: string,
  source: Entity | undefined,
  targetId: string,
  trigger = false,
) {
  if (!source) return;
  if (!offer.requested) {
    emit(
      world,
      events,
      type,
      BASE_HANDOVER.text.giftEvent(source.id, verb, describeItemOffer(world, offer)),
      source,
      targetId,
      {
        offerId: offer.id,
        offerRevision: offer.revision,
        semanticTrigger: trigger,
        urgency: trigger ? 4 : 0,
      },
    );
    return;
  }
  emitWitnessObservation(
    world,
    events,
    type,
    subjectNarration(source, BASE_HANDOVER.text.witness(verb)),
    source,
    targetId,
    { offerId: offer.id },
  );
  for (const id of [offer.offererId, offer.recipientId]) {
    const receiver = world.entities[id];
    if (!receiver?.actor) continue;
    emitPrivateObservation(
      world,
      events,
      type,
      receiver,
      BASE_HANDOVER.text.participantEvent(source.id, verb, describeItemOffer(world, offer)),
      source,
      targetId,
      {
        offerId: offer.id,
        offerRevision: offer.revision,
        semanticTrigger: trigger && id === targetId,
        urgency: trigger && id === targetId ? 4 : 0,
      },
    );
  }
}
function close(
  world: WorldState,
  events: WorldEvent[],
  offer: ItemOffer,
  type: string,
  verb: string,
  source: Entity | undefined,
  targetId: string,
) {
  delete world.itemOffers![offer.id];
  if (!Object.keys(world.itemOffers!).length) delete world.itemOffers;
  notice(world, events, offer, type, verb, source, targetId);
}
function matchingSelection(
  world: WorldState,
  item: ItemInstance,
  selection: RequestedLot,
): boolean {
  return (
    (selection.expectedRevision === undefined || item.revision === selection.expectedRevision) &&
    (selection.placementRevision === undefined ||
      item.placementRevision === selection.placementRevision) &&
    (selection.expectedContentsRevision === undefined ||
      (world.entities[item.id]!.inventoryRevision ?? 0) === selection.expectedContentsRevision)
  );
}
function belongs(
  offer: ItemOffer | undefined,
  actorId: string,
  otherId: string,
): offer is ItemOffer {
  return (
    !!offer &&
    ((offer.offererId === actorId && offer.recipientId === otherId) ||
      (offer.recipientId === actorId && offer.offererId === otherId))
  );
}
export function prepareItemOffer(
  world: WorldState,
  actor: Entity,
  command: TermsCommand,
): Outcome | { item: ItemInstance; recipient: Entity; requested?: OfferLot; prior?: ItemOffer } {
  if (!isHandoverCommand(command))
    return outcome(false, 'invalid-command', 'Choose an offer and a person.');
  const other = getOwn(world.entities, command.targetId);
  const refused = offerRecipientProblem(world, actor, other);
  if (refused || !other)
    return outcome(false, refused?.code ?? 'not-visible', refused?.message ?? 'Choose a person.');
  let prior: ItemOffer | undefined;
  if (command.operation === 'counter') {
    prior = getOwn(world.itemOffers ?? {}, command.offerId!);
    if (!belongs(prior, actor.id, other.id))
      return outcome(false, 'no-offer', 'There is no such offer between you and that person.');
    if (prior.revision !== command.expectedOfferRevision)
      return outcome(false, 'stale-offer', BASE_HANDOVER.text.changed);
    if (world.simTime >= prior.expiresAt)
      return outcome(false, 'expired', 'That offer has expired.');
  }
  const item = itemFor(world, command.itemId),
    definition = item && world.itemDefinitions[item.definitionId];
  if (!item || !definition || !accessiblePossession(world, actor.id, item.id))
    return outcome(false, 'item-unavailable', 'Choose one of your accessible possessions.');
  // Barter never pins/probes the recipient's private inventory revision.
  if (
    !matchingSelection(world, item, command) ||
    (!command.requested &&
      command.targetRevision !== undefined &&
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
  let requested: OfferLot | undefined;
  if (command.requested) {
    // Check knowledge before touching other stock. Guessed IDs and unavailable remembered
    // objects produce the same refusal, never where/why the other person's item changed.
    const known = getOwn(actor.actor!.knownTradeLots?.[other.id] ?? {}, command.requested.itemId);
    const previous = prior && (prior.offererId === other.id ? prior.offered : prior.requested);
    // An open proposal is itself a permitted disclosure even after the compact memory
    // list ages it out. It grants only its exact lot/pins/quantity, never other stock.
    const disclosed =
      known?.lot ?? (previous?.itemId === command.requested.itemId ? previous : undefined);
    if (
      !disclosed ||
      command.requested.quantity > disclosed.quantity ||
      (disclosed.whole && command.requested.quantity !== disclosed.quantity)
    )
      return outcome(false, 'offer-lapsed', BASE_HANDOVER.text.unavailable);
    requested = {
      ...disclosed,
      definitionPin: { ...disclosed.definitionPin },
      quantity: command.requested.quantity,
    };
    if (
      !lotStillHeld(world, other.id, requested) ||
      !matchingSelection(world, itemFor(world, requested.itemId)!, command.requested)
    )
      return outcome(false, 'offer-lapsed', BASE_HANDOVER.text.unavailable);
  }
  const pending = offerIndex(world);
  const promised = (id: string) => {
    const offer = pending.byItem.get(id);
    return !!offer && offer.id !== prior?.id;
  };
  const promisedDescendant = (id: string): boolean => {
    for (const child of directChildIds(world, id))
      if (promised(child) || promisedDescendant(child)) return true;
    return false;
  };
  const overlaps = (id: string) =>
    promised(id) ||
    objectAncestors(world, id).some((entity) => promised(entity.id)) ||
    promisedDescendant(id);
  if (overlaps(item.id))
    return outcome(false, 'already-offered', 'These items are already being offered.');
  if (requested && overlaps(requested.itemId))
    return outcome(false, 'offer-lapsed', BASE_HANDOVER.text.unavailable);
  if (
    (pending.outgoingCount.get(actor.id) ?? 0) - (prior?.offererId === actor.id ? 1 : 0) >=
    BASE_HANDOVER.pendingPerOfferer
  )
    return outcome(false, 'offer-limit', 'Withdraw an earlier offer first.');
  return {
    item,
    recipient: other,
    ...(requested ? { requested } : {}),
    ...(prior ? { prior } : {}),
  };
}
function offerMoves(offer: ItemOffer) {
  return [
    {
      itemId: offer.offered.itemId,
      quantity: offer.offered.quantity,
      destinationId: offer.recipientId,
    },
    ...(offer.requested
      ? [
          {
            itemId: offer.requested.itemId,
            quantity: offer.requested.quantity,
            destinationId: offer.offererId,
          },
        ]
      : []),
  ];
}
/** Read-only admission shared by replies and previews, including final joint placement. */
export function itemOfferReplyProblem(
  world: WorldState,
  actor: Entity,
  command: Extract<HandoverCommand, { operation: 'accept' | 'decline' | 'withdraw' }>,
): Outcome | undefined {
  if (!isHandoverCommand(command))
    return outcome(false, 'invalid-command', 'Choose an offer and a person.');
  const offer = getOwn(world.itemOffers ?? {}, command.offerId);
  const own =
    command.operation === 'withdraw'
      ? offer?.offererId === actor.id && offer.recipientId === command.targetId
      : offer?.recipientId === actor.id && offer.offererId === command.targetId;
  if (!offer || !own)
    return outcome(false, 'no-offer', 'There is no such offer between you and that person.');
  if (offer.revision !== command.expectedOfferRevision)
    return outcome(false, 'stale-offer', BASE_HANDOVER.text.changed);
  if (command.operation !== 'accept') return;
  if (world.simTime >= offer.expiresAt) return outcome(false, 'expired', 'That offer has expired.');
  const other = world.entities[offer.offererId];
  if (!other || !seesEntity(world, actor, other) || !seesEntity(world, other, actor))
    return outcome(false, 'not-visible', 'You and the offerer must be able to see each other.');
  if (!canHandleItems(world, actor))
    return outcome(false, 'unavailable', 'You cannot take items now.');
  if (!canReachEntity(world, actor, other, world.itemHandling.reach))
    return outcome(false, 'out-of-reach', "Move within arm's reach of the offerer to take it.");
  if (!able(actor) || !offerStillHeld(world, offer))
    return outcome(
      false,
      'offer-lapsed',
      offer.requested ? BASE_HANDOVER.text.unavailable : BASE_HANDOVER.text.giftUnavailable,
    );
  if (jointItemMoveReason(world, offerMoves(offer)))
    return outcome(
      false,
      'offer-lapsed',
      offer.requested ? BASE_HANDOVER.text.unavailable : BASE_HANDOVER.text.giftUnavailable,
    );
}
export function executeHandover(
  world: WorldState,
  actor: Entity,
  command: HandoverCommand,
  events: WorldEvent[],
): Outcome {
  if ('itemId' in command) {
    const prepared = prepareItemOffer(world, actor, command);
    if ('ok' in prepared) return prepared;
    const offer: ItemOffer = {
      id: prepared.prior?.id ?? nextId(world, 'offer'),
      revision: (prepared.prior?.revision ?? 0) + 1,
      offererId: actor.id,
      recipientId: prepared.recipient.id,
      offered: pinLot(world, prepared.item, command.quantity),
      ...(prepared.requested ? { requested: prepared.requested } : {}),
      createdAt: world.simTime,
      expiresAt: world.simTime + BASE_HANDOVER.offerSeconds,
    };
    if (!Number.isSafeInteger(offer.revision))
      return outcome(false, 'stale-offer', BASE_HANDOVER.text.changed);
    (world.itemOffers ??= {})[offer.id] = offer;
    remember(world, offer.recipientId, offer.offererId, offer.offered);
    notice(
      world,
      events,
      offer,
      'item-offered',
      prepared.prior ? 'revised' : 'offered',
      actor,
      offer.recipientId,
      true,
    );
    return outcome(
      true,
      'offered',
      'Offered ' +
        describeItemOffer(world, offer) +
        '. Nothing moves unless they accept within ' +
        BASE_HANDOVER.offerSeconds / 60 +
        ' game minutes; you can withdraw it.',
    );
  }
  const problem = itemOfferReplyProblem(world, actor, command);
  if (problem) return problem;
  const offer = world.itemOffers![command.offerId]!;
  if (command.operation === 'withdraw' || command.operation === 'decline') {
    const withdrawn = command.operation === 'withdraw';
    close(
      world,
      events,
      offer,
      withdrawn ? 'offer-withdrawn' : 'offer-declined',
      withdrawn ? 'withdrew' : 'declined',
      actor,
      command.targetId,
    );
    return outcome(
      true,
      withdrawn ? 'withdrawn' : 'declined',
      withdrawn ? 'Offer withdrawn; nothing moved.' : 'Offer declined; nothing moved.',
    );
  }
  let itemId: string;
  try {
    itemId = offer.requested
      ? moveLotsTogether(world, offerMoves(offer), command.id)[0]!
      : moveLot(world, offer.offered.itemId, actor.id, offer.offered.quantity, command.id);
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return outcome(
      false,
      'offer-lapsed',
      offer.requested ? BASE_HANDOVER.text.unavailable : BASE_HANDOVER.text.giftUnavailable,
    );
  }
  close(world, events, offer, 'offer-accepted', 'accepted', actor, offer.offererId);
  return {
    ...outcome(
      true,
      'accepted-offer',
      offer.requested
        ? BASE_HANDOVER.text.exchanged(describeItemOffer(world, offer))
        : 'Took ' + describeItemOffer(world, offer) + '.',
    ),
    itemId,
  };
}
export function reconcileItemOffers(world: WorldState, events: WorldEvent[]): void {
  if (!world.itemOffers) return;
  for (const offer of Object.values(world.itemOffers)) {
    const expired = world.simTime >= offer.expiresAt;
    if (!expired && able(world.entities[offer.recipientId]) && offerStillHeld(world, offer))
      continue;
    const offerer = world.entities[offer.offererId],
      recipient = world.entities[offer.recipientId];
    close(
      world,
      events,
      offer,
      expired ? 'offer-expired' : 'offer-lapsed',
      expired ? 'expired' : 'lapsed',
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
function validLot(lot: OfferLot): boolean {
  const pin = lot?.definitionPin;
  return (
    hasRecordFields(
      lot,
      ['itemId', 'definitionPin', 'quantity', 'whole', 'revision', 'placementRevision'],
      ['contentsRevision', 'subtreeRevision'],
    ) &&
    isSafeRecordId(lot.itemId) &&
    !!pin &&
    hasRecordFields(pin, ['id', 'version', 'digest']) &&
    isSafeRecordId(pin.id) &&
    Number.isSafeInteger(pin.version) &&
    pin.version > 0 &&
    typeof pin.digest === 'string' &&
    pin.digest.length > 0 &&
    pin.digest.length <= 128 &&
    Number.isSafeInteger(lot.quantity) &&
    lot.quantity > 0 &&
    typeof lot.whole === 'boolean' &&
    revision(lot.revision) &&
    revision(lot.placementRevision) &&
    (lot.contentsRevision === undefined || revision(lot.contentsRevision)) &&
    (lot.subtreeRevision === undefined || revision(lot.subtreeRevision))
  );
}
/** Validate current shapes; dangling terms/memories are not an old-format reader. */
export function validateItemOffers(world: WorldState): void {
  for (const entity of Object.values(world.entities)) {
    const remembered = entity.actor?.knownTradeLots;
    if (remembered === undefined) continue;
    if (!remembered || typeof remembered !== 'object' || Array.isArray(remembered))
      throw new Error('Invalid item disclosures.');
    for (const [holderId, lots] of Object.entries(remembered)) {
      if (
        !isSafeRecordId(holderId) ||
        !lots ||
        typeof lots !== 'object' ||
        Array.isArray(lots) ||
        Object.keys(lots).length > BASE_HANDOVER.candidateLots
      )
        throw new Error('Invalid item disclosures.');
      for (const [id, known] of Object.entries(lots))
        if (
          !hasRecordFields(known, ['lot', 'name', 'description', 'disclosedAt']) ||
          !validLot(known.lot) ||
          id !== known.lot.itemId ||
          typeof known.name !== 'string' ||
          typeof known.description !== 'string' ||
          !Number.isFinite(known.disclosedAt)
        )
          throw new Error('Invalid item disclosure.');
    }
  }
  if (world.itemOffers === undefined) return;
  if (!world.itemOffers || typeof world.itemOffers !== 'object' || Array.isArray(world.itemOffers))
    throw new Error('Invalid item offers.');
  const perOfferer = new Map<string, number>(),
    items = new Set<string>();
  for (const [id, offer] of Object.entries(world.itemOffers)) {
    if (
      !hasRecordFields(
        offer,
        ['id', 'revision', 'offererId', 'recipientId', 'offered', 'createdAt', 'expiresAt'],
        ['requested'],
      ) ||
      id !== offer.id ||
      ![id, offer.offererId, offer.recipientId].every(isSafeRecordId) ||
      offer.offererId === offer.recipientId ||
      !revision(offer.revision) ||
      offer.revision < 1 ||
      !validLot(offer.offered) ||
      (offer.requested !== undefined && !validLot(offer.requested)) ||
      !Number.isFinite(offer.createdAt) ||
      !Number.isFinite(offer.expiresAt) ||
      offer.expiresAt <= offer.createdAt ||
      offer.expiresAt > offer.createdAt + BASE_HANDOVER.offerSeconds
    )
      throw new Error('Invalid item offer.');
    for (const lot of [offer.offered, ...(offer.requested ? [offer.requested] : [])]) {
      if (items.has(lot.itemId)) throw new Error('An item is promised twice.');
      items.add(lot.itemId);
    }
    const count = (perOfferer.get(offer.offererId) ?? 0) + 1;
    if (count > BASE_HANDOVER.pendingPerOfferer) throw new Error('Too many pending item offers.');
    perOfferer.set(offer.offererId, count);
  }
}
