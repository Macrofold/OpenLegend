import { takeNativeChanges } from './native-change-feed.js';
import { isDraft, original } from 'immer';
import {
  itemOfferSnapshot,
  perceivedItemOffers,
  rememberedTradeLots,
  rememberedTradeLotReferences,
  mutualSocialReception,
  type PerceivedItemOffer,
} from './personal-social.js';
import { EXPERIENCE_LIMITS } from './experience.js';
import { countDomainWork } from './diagnostic-counters.js';
import { carryingOffer, recordCarryingCustody } from './outings.js';
import { socialOfferAdmissionProblem } from './social-offers.js';
import { reconcileConstructionAuthority } from './assembly-use.js';
import {
  prepareConstructionContribution,
  validContributionTerms,
  validContributionConsent,
  sameContributionConsent,
  type ConstructionContributionConsent,
} from './construction-contributions.js';
import {
  applyConstructionPermissionEffect,
  type ConstructionPermissionBatch,
} from './construction-permissions.js';
import type { ConstructionPermission } from './assembly-types.js';
import { cloneValue, entityChangesSince } from './draft.js';
import { entityGet, entityOwn, entityValues } from './entity-collection.js';
import { canonicalJson } from './events.js';
import { subjectNarration } from './narration.js';
import { emit, emitPrivateObservation, emitWitnessObservation, outcome } from './events.js';
import { canHandleItems } from './item-handling.js';
import { accessiblePossession, inventoryWorkReason } from './object-access.js';
import {
  itemContainerCapacity,
  recordMaterialContribution,
  directChildIds,
  itemFor,
  moveLot,
  moveLotsTogether,
  jointItemMoveReason,
  objectAncestors,
  custodian,
} from './objects.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity } from './perception.js';
import { getOwn, hasRecordFields, isSafeRecordId, isImmutableData } from './records.js';
import { availableItemQuantity } from './resource-claims.js';
import { canReachEntity } from './spatial.js';
import { nextId } from './data.js';
import { WorkBudgetError } from './work-budget.js';
import { readOnlyDraftView } from './draft.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { BASE_HANDOVER } from './worlds/base/handover.js';
import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import type { Command, Entity, ItemInstance, Outcome, WorldEvent, WorldState } from './types.js';

export interface RequestedLot {
  itemId: string;
  quantity: number;
  expectedRevision?: number;
  placementRevision?: number;
  expectedContentsRevision?: number;
}
export interface OfferLot {
  capacity?: number;
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
/** Trusted preparation of retained personal evidence. This is operation context,
 * never client command authority or another saved copy of a person's knowledge. */
export interface TradeDisclosureContext {
  actorId: string;
  personId: string;
  lots: ReadonlyMap<string, KnownTradeLot>;
}
/** Pending consent only. Events and ordinary command receipts retain outcomes.
 * docs/worlds/base/social.md#offering-and-accepting-possessions */
export interface ItemOffer {
  id: string;
  revision: number;
  offererId: string;
  recipientId: string;
  offered: OfferLot[];
  requested: OfferLot[];
  constructionUse?: ConstructionContributionConsent;
  createdAt: number;
  expiresAt: number;
}
export const HANDOVER_OPERATIONS = [
  'offer',
  'counter',
  'accept',
  'decline',
  'withdraw',
  'withdraw-use',
] as const;
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
  if (command.operation === 'withdraw-use')
    return isSafeRecordId(command.permissionId) && revision(command.expectedRevision);
  if (command.operation === 'offer' || command.operation === 'counter')
    return (
      Array.isArray(command.offered) &&
      command.offered.length > 0 &&
      command.offered.length <= STOCK_TRANSFER_LIMITS.movedLots &&
      command.offered.every(validRequest) &&
      Array.isArray(command.requested) &&
      command.requested.length <= STOCK_TRANSFER_LIMITS.movedLots &&
      command.requested.every(validRequest) &&
      command.offered.length + command.requested.length <= STOCK_TRANSFER_LIMITS.movedLots &&
      (command.constructionUse === undefined ||
        (command.offered.length === 1 && validContributionTerms(command.constructionUse))) &&
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
  deadlines: ItemOffer[];
  order: Map<string, number>;
}
const offerIndexes = new WeakMap<NonNullable<WorldState['itemOffers']>, OfferIndex>();
const emptyOfferIndex: OfferIndex = {
  between: new Map(),
  byItem: new Map(),
  deadlines: [],
  order: new Map(),
};
const noOffers: OffersBetween = Object.freeze({
  incoming: Object.freeze([]),
  outgoing: Object.freeze([]),
});
function offerIndex(world: WorldState): OfferIndex {
  if (!world.itemOffers) return emptyOfferIndex;
  const offers = readOnlyDraftView(world.itemOffers);
  const cached = isImmutableData(offers) ? offerIndexes.get(offers) : undefined;
  if (cached) return cached;
  const index: OfferIndex = {
    between: new Map(),
    byItem: new Map(),
    deadlines: [],
    order: new Map(),
  };
  const pair = (actorId: string, otherId: string) => {
    let people = index.between.get(actorId);
    if (!people) index.between.set(actorId, (people = new Map()));
    let terms = people.get(otherId);
    if (!terms) people.set(otherId, (terms = { incoming: [], outgoing: [] }));
    return terms;
  };
  for (const offer of Object.values(offers ?? {})) {
    index.order.set(offer.id, index.order.size);
    index.deadlines.push(offer);
    pair(offer.offererId, offer.recipientId).outgoing.push(offer);
    pair(offer.recipientId, offer.offererId).incoming.push(offer);
    for (const lot of [...offer.offered, ...offer.requested]) index.byItem.set(lot.itemId, offer);
  }
  index.deadlines.sort((a, b) => a.expiresAt - b.expiresAt);
  for (const people of index.between.values())
    for (const terms of people.values()) {
      Object.freeze(terms.incoming);
      Object.freeze(terms.outgoing);
      Object.freeze(terms);
    }
  // A published offer table has immutable terms. Draft edits/mutable builders rebuild;
  // deletion, replacement and restore therefore cannot inherit stale consent or membership.
  if (offers && isImmutableData(offers)) offerIndexes.set(offers, index);
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
  return rememberedTradeLots(world, actorId, otherId, limit);
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
  if (entityGet(world.entities, itemId)?.container?.access) return true;
  for (const child of directChildIds(world, itemId))
    if (grantedContainer(world, child)) return true;
  return false;
}
function pinLot(world: WorldState, item: ItemInstance, quantity: number): OfferLot {
  const entity = entityGet(world.entities, item.id)!;
  return {
    itemId: item.id,
    definitionPin: { ...entity.item!.definitionPin },
    quantity,
    whole: !!entity.container || entity.item!.individuality === 'individual',
    revision: entity.item!.revision,
    placementRevision: entity.placement!.revision,
    ...(entity.container
      ? {
          capacity: itemContainerCapacity(world, entity),
          contentsRevision: entity.inventoryRevision ?? 0,
          subtreeRevision: entity.container.subtreeRevision,
        }
      : {}),
  };
}
export function pendingItemOfferCounts(world: WorldState, actorId: string, excluding?: string) {
  const result = { incoming: 0, outgoing: 0 };
  for (const between of offerIndex(world).between.get(actorId)?.values() ?? []) {
    for (const offer of between.incoming)
      if (offer.id !== excluding && offer.expiresAt > world.simTime) result.incoming++;
    for (const offer of between.outgoing)
      if (offer.id !== excluding && offer.expiresAt > world.simTime) result.outgoing++;
  }
  return result;
}
export function describeOfferLot(world: WorldState, lot: OfferLot): string {
  return (
    lot.quantity +
    ' ' +
    (world.itemDefinitions[lot.definitionPin.id]?.name ?? 'item') +
    (lot.capacity === undefined ? '' : ` (capacity ${lot.capacity})`)
  );
}
export function describeItemOffer(
  world: WorldState,
  offer: Pick<ItemOffer, 'offered' | 'requested'> & {
    constructionUse?: {
      terms: import('./construction-contributions.js').ConstructionContributionTerms;
    };
    descriptions?: PerceivedItemOffer['descriptions'];
  },
): string {
  const describe = (
    lots: readonly OfferLot[],
    descriptions?: { name: string; description: string }[],
  ) =>
    lots
      .map((lot, index) =>
        descriptions?.[index]
          ? `${lot.quantity} ${descriptions[index]!.name}`
          : describeOfferLot(world, lot),
      )
      .join(', ');
  const ordinary = BASE_HANDOVER.text.terms(
    describe(offer.offered, offer.descriptions?.offered),
    offer.requested.length ? describe(offer.requested, offer.descriptions?.requested) : undefined,
  );
  if (!offer.constructionUse) return ordinary;
  return ordinary + ' — ' + describeConstructionUse(world, offer.constructionUse.terms);
}
export function describeConstructionUse(
  world: WorldState,
  terms: import('./construction-contributions.js').ConstructionContributionTerms,
  timePlaceholder = false,
): string {
  const policy = world.constructionProfile?.materialContributions;
  if (!policy)
    throw new Error('An active construction contribution requires its installed presentation.');
  const family =
      world.constructionProfile && world.assemblyFamilies?.[world.constructionProfile.family.id],
    boundary =
      world.constructionProfile?.boundary &&
      world.assemblyFamilies?.[world.constructionProfile.boundary.id];
  const operation =
    boundary?.implementation === 'grounded-panel-boundary' && terms.operation in boundary.labels
      ? boundary.labels[terms.operation as keyof typeof boundary.labels]
      : family?.implementation === 'four-corner-flexible-bays' && terms.operation in family.labels
        ? family.labels[terms.operation as keyof typeof family.labels]
        : terms.operation === 'place-hearth'
          ? Object.values(world.hearthDefinitions ?? {})[0]?.actionLabel
          : undefined;
  const values = {
    operation: operation ?? policy.label,
    site: policy.siteLabels[terms.site.surfaceId] ?? policy.label,
    ...Object.fromEntries(
      Object.entries(terms.site).map(([key, value]) => [
        key,
        typeof value === 'number' ? Number(value.toFixed(2)) : value,
      ]),
    ),
    minutes: timePlaceholder
      ? '{minutes}'
      : Math.max(0, Math.ceil((terms.expiresAt - world.simTime) / 60)),
  };
  return policy.termsText.replace(/\{(\w+)\}/g, (_match, key) =>
    String(values[key as keyof typeof values] ?? ''),
  );
}
function lotStillHeld(world: WorldState, holderId: string, lot: OfferLot, exact = true): boolean {
  const item = itemFor(world, lot.itemId),
    holder = entityGet(world.entities, holderId);
  const definition = item && world.itemDefinitions[item.definitionId];
  return (
    !!item &&
    able(holder) &&
    canHandleItems(world, holder) &&
    !!definition &&
    sameDefinitionPin(definitionPin(definition), lot.definitionPin) &&
    sameDefinitionPin(entityGet(world.entities, item.id)!.item!.definitionPin, lot.definitionPin) &&
    (!exact ||
      (item.revision === lot.revision && item.placementRevision === lot.placementRevision)) &&
    (lot.capacity === undefined ||
      itemContainerCapacity(world, entityGet(world.entities, item.id)!) === lot.capacity) &&
    definition.portable === true &&
    accessiblePossession(world, holderId, item.id) &&
    availableItemQuantity(world, item.id) >= lot.quantity &&
    !inventoryWorkReason(world, holderId, item.id) &&
    (lot.contentsRevision === undefined ||
      (entityGet(world.entities, item.id)?.inventoryRevision ?? 0) === lot.contentsRevision) &&
    (lot.subtreeRevision === undefined ||
      entityGet(world.entities, item.id)?.container?.subtreeRevision === lot.subtreeRevision) &&
    !grantedContainer(world, item.id)
  );
}
function offerStillHeld(world: WorldState, offer: ItemOffer): boolean {
  return (
    offer.offered.every((lot) =>
      lotStillHeld(world, offer.offererId, lot, offer.requested.length > 0),
    ) && offer.requested.every((lot) => lotStillHeld(world, offer.recipientId, lot))
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
  const ended = type !== 'item-offered',
    automatic = type === 'offer-expired' || type === 'offer-lapsed';
  if (source && !automatic)
    emitWitnessObservation(
      world,
      events,
      type,
      subjectNarration(source, BASE_HANDOVER.text.witness(verb)),
      source,
      targetId,
      { offerId: offer.id },
    );
  let receipt: string | undefined;
  for (const id of [offer.offererId, offer.recipientId]) {
    const receiver = entityGet(world.entities, id);
    if (!receiver?.actor) continue;
    const previous = perceivedItemOffers(world, id).find(
      (known) => known.id === offer.id && known.revision === offer.revision,
    );
    const delivered =
      !ended ||
      type === 'offer-expired' ||
      source?.id === id ||
      (source && mutualSocialReception(world, id, source.id));
    if (!delivered || (ended && !previous)) continue;
    const snapshot = itemOfferSnapshot(world, offer, id, ended ? type : undefined);
    const text = automatic
      ? `${type === 'offer-expired' ? 'The stated offer deadline has passed.' : 'Your previously offered terms are no longer available.'} ${describeItemOffer(world, snapshot)}`
      : BASE_HANDOVER.text.participantEvent(source!.id, verb, describeItemOffer(world, snapshot));
    const data = {
      offerId: offer.id,
      offerRevision: offer.revision,
      personalAgreement: true,
      agreement: canonicalJson(snapshot),
      semanticTrigger: trigger && id === targetId,
      urgency: trigger && id === targetId ? 4 : 0,
      importance: EXPERIENCE_LIMITS.protectedImportance,
    };
    const event = automatic
      ? emit(world, events, type, text, receiver, undefined, data, 'private')
      : emitPrivateObservation(world, events, type, receiver, text, source!, targetId, data);
    if (id === source?.id || !receipt) receipt = event.id;
  }
  return receipt;
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
  return notice(world, events, offer, type, verb, source, targetId);
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
      (entityGet(world.entities, item.id)!.inventoryRevision ?? 0) ===
        selection.expectedContentsRevision)
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
  permissions: readonly ConstructionPermission[] = [],
  disclosures?: TradeDisclosureContext,
):
  | Outcome
  | {
      items: ItemInstance[];
      recipient: Entity;
      requested: OfferLot[];
      prior?: ItemOffer;
      constructionUse?: ConstructionContributionConsent;
    } {
  if (!isHandoverCommand(command))
    return outcome(false, 'invalid-command', 'Choose the items and a person for this offer.');
  const other = entityOwn(world.entities, command.targetId);
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
  const items: ItemInstance[] = [];
  for (const selection of command.offered) {
    const item = itemFor(world, selection.itemId),
      definition = item && world.itemDefinitions[item.definitionId];
    if (!item || !definition || !accessiblePossession(world, actor.id, item.id))
      return outcome(false, 'item-unavailable', 'Choose your accessible possessions.');
    if (!matchingSelection(world, item, selection))
      return outcome(false, 'stale', 'An item changed. Review the current offer.');
    if (definition.portable !== true)
      return outcome(false, 'not-portable', 'This object cannot be handed over.');
    if (selection.quantity > availableItemQuantity(world, item.id))
      return outcome(false, 'quantity', 'You do not have that many free to offer.');
    if (
      selection.quantity !== item.quantity &&
      (item.individuality === 'individual' || entityGet(world.entities, item.id)?.container)
    )
      return outcome(false, 'whole-object', 'Offer the whole object.');
    const busy = inventoryWorkReason(world, actor.id, item.id);
    if (busy) return outcome(false, 'in-use', busy);
    if (grantedContainer(world, item.id))
      return outcome(false, 'access-granted', "Clear this bag's access list before offering it.");
    items.push(item);
  }
  const receivedPrior =
    prior &&
    perceivedItemOffers(world, actor.id).find(
      (known) =>
        known.id === prior.id && known.revision === prior.revision && known.status === 'pending',
    );
  const previous = receivedPrior
    ? receivedPrior.offererId === other.id
      ? receivedPrior.offered
      : receivedPrior.requested
    : [];
  // A complete retained read overrides the resident tail, including an empty
  // result after forgetting. Current custody and exact pins are still checked below.
  const known =
    disclosures?.actorId === actor.id && disclosures.personId === other.id
      ? disclosures.lots
      : rememberedTradeLotReferences(
          world,
          actor.id,
          other.id,
          command.requested.map((selection) => selection.itemId),
        );
  const requested: OfferLot[] = [];
  for (const selection of command.requested) {
    // Check personal disclosure before inspecting another person's current stock.
    const disclosed =
      known.get(selection.itemId)?.lot ?? previous.find((lot) => lot.itemId === selection.itemId);
    if (
      !disclosed ||
      selection.quantity > disclosed.quantity ||
      (disclosed.whole && selection.quantity !== disclosed.quantity)
    )
      return outcome(false, 'offer-lapsed', BASE_HANDOVER.text.unavailable);
    const lot = {
      ...disclosed,
      definitionPin: { ...disclosed.definitionPin },
      quantity: selection.quantity,
    };
    if (
      !lotStillHeld(world, other.id, lot) ||
      !matchingSelection(world, itemFor(world, lot.itemId)!, selection)
    )
      return outcome(false, 'offer-lapsed', BASE_HANDOVER.text.unavailable);
    requested.push(lot);
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
  const all = [...items.map((item) => item.id), ...requested.map((lot) => lot.itemId)],
    selected = new Set(all);
  if (selected.size !== all.length)
    return outcome(false, 'duplicate-item', 'Choose each item or containing object only once.');
  for (const id of all) {
    const ancestors = objectAncestors(world, id);
    if (ancestors.some((ancestor) => ancestor.id !== id && selected.has(ancestor.id)))
      return outcome(false, 'duplicate-item', 'Choose each item or containing object only once.');
    if (promised(id) || ancestors.some((entity) => promised(entity.id)) || promisedDescendant(id))
      return requested.some((lot) => lot.itemId === id)
        ? outcome(false, 'offer-lapsed', BASE_HANDOVER.text.unavailable)
        : outcome(false, 'already-offered', 'These items are already being offered.');
  }
  const admission = socialOfferAdmissionProblem(
    world,
    actor.id,
    other.id,
    prior ? { family: 'handover', id: prior.id } : undefined,
  );
  if (admission) return admission;
  if (world.socialOfferPolicy!.onePendingPerPair) {
    const between = offersBetween(world, actor.id, other.id);
    if (
      [...between.incoming, ...between.outgoing].some(
        (offer) => offer.id !== prior?.id && offer.expiresAt > world.simTime,
      )
    )
      return outcome(false, 'offer-pending', world.socialOfferPolicy!.messages.pair);
  }
  const constructionUse =
    command.constructionUse &&
    prepareConstructionContribution(
      world,
      permissions,
      actor.id,
      other.id,
      items[0]!.id,
      command.constructionUse,
    );
  if (constructionUse && 'ok' in constructionUse) return constructionUse;
  return {
    items,
    recipient: other,
    requested,
    ...(constructionUse ? { constructionUse } : {}),
    ...(prior ? { prior } : {}),
  };
}
function offerMoves(offer: ItemOffer) {
  return [
    ...offer.offered.map((lot) => ({
      itemId: lot.itemId,
      quantity: lot.quantity,
      destinationId: offer.recipientId,
    })),
    ...offer.requested.map((lot) => ({
      itemId: lot.itemId,
      quantity: lot.quantity,
      destinationId: offer.offererId,
    })),
  ];
}
/** Read-only admission shared by replies and previews, including final joint placement. */
export function itemOfferReplyProblem(
  world: WorldState,
  actor: Entity,
  command: Extract<HandoverCommand, { operation: 'accept' | 'decline' | 'withdraw' }>,
  permissions: readonly ConstructionPermission[] = [],
): Outcome | undefined {
  if (!isHandoverCommand(command))
    return outcome(false, 'invalid-command', 'Choose an offer and a person.');
  const offer = getOwn(world.itemOffers ?? {}, command.offerId);
  const own =
    command.operation === 'withdraw'
      ? offer?.offererId === actor.id && offer.recipientId === command.targetId
      : offer?.recipientId === actor.id && offer.offererId === command.targetId;
  if (!offer || !own) {
    const known = rememberedOfferExit(world, actor.id, command);
    if (known) return;
    return outcome(false, 'no-offer', 'These offer terms are no longer available.');
  }
  if (offer.revision !== command.expectedOfferRevision)
    return outcome(false, 'stale-offer', BASE_HANDOVER.text.changed);
  if (command.operation !== 'accept') return;
  if (world.simTime >= offer.expiresAt) return outcome(false, 'expired', 'That offer has expired.');
  const other = entityGet(world.entities, offer.offererId);
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
      offer.requested.length ? BASE_HANDOVER.text.unavailable : BASE_HANDOVER.text.giftUnavailable,
    );
  if (offer.constructionUse) {
    const current = prepareConstructionContribution(
      world,
      permissions,
      offer.offererId,
      offer.recipientId,
      offer.offered[0]!.itemId,
      offer.constructionUse.terms,
    );
    if ('ok' in current) return current;
    if (!sameContributionConsent(current, offer.constructionUse))
      return outcome(false, 'stale-offer', BASE_HANDOVER.text.changed);
  }
  if (jointItemMoveReason(world, offerMoves(offer)))
    return outcome(
      false,
      'offer-lapsed',
      offer.requested.length ? BASE_HANDOVER.text.unavailable : BASE_HANDOVER.text.giftUnavailable,
    );
}
export function contributionWithdrawalProblem(
  world: WorldState,
  actor: Entity,
  command: Extract<HandoverCommand, { operation: 'withdraw-use' }>,
  permissions: readonly ConstructionPermission[],
): Outcome | undefined {
  if (!isHandoverCommand(command))
    return outcome(false, 'invalid-command', 'Choose the current material-use permission.');
  const permission = permissions.find(
    (p) => p.id === command.permissionId && p.worldId === world.id,
  );
  if (
    !permission?.contribution ||
    ![permission.actorId, permission.contribution.donorId].includes(actor.id)
  )
    return outcome(
      false,
      'construction-contribution',
      'You cannot withdraw that material-use permission.',
    );
  const other =
    permission.actorId === actor.id ? permission.contribution.donorId : permission.actorId;
  if (
    command.targetId !== other ||
    permission.revision !== command.expectedRevision ||
    permission.revoked
  )
    return outcome(false, 'stale', 'The material-use permission changed. Refresh it.');
}
export function executeHandover(
  world: WorldState,
  actor: Entity,
  command: HandoverCommand,
  events: WorldEvent[],
  batch: ConstructionPermissionBatch,
  disclosures?: TradeDisclosureContext,
): Outcome {
  if (command.operation === 'withdraw-use') {
    const problem = contributionWithdrawalProblem(world, actor, command, batch.permissions);
    if (problem) return problem;
    applyConstructionPermissionEffect(batch, {
      kind: 'contribution-ended',
      permissionId: command.permissionId,
      permissionRevision: command.expectedRevision,
      actionId: command.id,
      at: world.simTime,
      reason: 'withdrawn',
      actorId: actor.id,
    });
    reconcileConstructionAuthority(world, batch.permissions);
    const message = 'Material-use permission withdrawn. Completed work and possessions remain.';
    emitPrivateObservation(
      world,
      events,
      'contribution-withdrawn',
      actor,
      message,
      actor,
      command.targetId,
      { permissionId: command.permissionId },
    );
    // Operational revocation is not remote sensory evidence. The other person
    // discovers any interrupted work through its ordinary admitted outcome.
    return outcome(true, 'contribution-withdrawn', message);
  }
  if ('offered' in command) {
    const prepared = prepareItemOffer(world, actor, command, batch.permissions, disclosures);
    if ('ok' in prepared) return prepared;
    const offer: ItemOffer = {
      id: prepared.prior?.id ?? nextId(world, 'offer'),
      revision: (prepared.prior?.revision ?? 0) + 1,
      offererId: actor.id,
      recipientId: prepared.recipient.id,
      offered: prepared.items.map((item, index) =>
        pinLot(world, item, command.offered[index]!.quantity),
      ),
      requested: prepared.requested,
      ...(prepared.constructionUse
        ? { constructionUse: cloneValue(prepared.constructionUse) }
        : {}),
      createdAt: world.simTime,
      expiresAt: world.simTime + world.socialOfferPolicy!.pendingSeconds,
    };
    if (!Number.isSafeInteger(offer.revision))
      return outcome(false, 'stale-offer', BASE_HANDOVER.text.changed);
    (world.itemOffers ??= {})[offer.id] = offer;
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
        world.socialOfferPolicy!.pendingSeconds / 60 +
        ' game minutes; you can withdraw it.',
    );
  }
  const problem = itemOfferReplyProblem(world, actor, command, batch.permissions);
  if (problem) return problem;
  const remembered = rememberedOfferExit(world, actor.id, command);
  if (!world.itemOffers?.[command.offerId] && remembered) {
    emitPrivateObservation(
      world,
      events,
      'offer-own-ending',
      actor,
      'You ended your own participation in the last received offer. No other person’s current choice is reported.',
      actor,
      command.targetId,
      {
        personalAgreement: true,
        agreement: canonicalJson({ ...remembered, status: 'ended', cause: 'own-ending' }),
        offerId: remembered.id,
        importance: EXPERIENCE_LIMITS.protectedImportance,
      },
    );
    return outcome(
      true,
      'offer-own-ending',
      'Your remembered offer participation ended; nothing moved.',
    );
  }
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
  const carrying = carryingOffer(world, offer);
  let itemId: string;
  try {
    // Plan every promised source together; merging one of several sources before
    // its move would invalidate the agreement. A single gift keeps normal merging.
    itemId =
      offer.requested.length || offer.offered.length > 1
        ? moveLotsTogether(world, offerMoves(offer), command.id)[0]!
        : moveLot(
            world,
            offer.offered[0]!.itemId,
            actor.id,
            offer.offered[0]!.quantity,
            command.id,
            !offer.constructionUse && !carrying,
          );
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return outcome(
      false,
      'offer-lapsed',
      offer.requested.length ? BASE_HANDOVER.text.unavailable : BASE_HANDOVER.text.giftUnavailable,
    );
  }
  if (offer.constructionUse) {
    let permissionId: string;
    do {
      permissionId = nextId(world, 'contribution-permission');
    } while (batch.permissions.some((permission) => permission.id === permissionId));
    const lot = entityGet(world.entities, itemId)!.item!;
    applyConstructionPermissionEffect(batch, {
      kind: 'material-contributed',
      permissionId: offer.constructionUse.recipientGrant.id,
      contribution: {
        actionId: command.id,
        at: world.simTime,
        donorId: offer.offererId,
        recipientId: offer.recipientId,
        offerId: offer.id,
        offerRevision: offer.revision,
        permissionId,
        consent: cloneValue(offer.constructionUse),
        transferred: {
          itemId,
          definition: { ...lot.definitionPin },
          quantity: offer.offered[0]!.quantity,
          originIds: [...lot.materialOriginIds!],
        },
      },
    });
    recordMaterialContribution(world, itemId, permissionId);
  }
  const transferEvent = close(
    world,
    events,
    offer,
    'offer-accepted',
    'accepted',
    actor,
    offer.offererId,
  );
  if (carrying) recordCarryingCustody(world, carrying.id, itemId, transferEvent!);
  return {
    ...outcome(
      true,
      'accepted-offer',
      offer.requested.length
        ? BASE_HANDOVER.text.exchanged(describeItemOffer(world, offer))
        : 'Took ' + describeItemOffer(world, offer) + '.',
    ),
    itemId,
  };
}
/** Current parties, items and their former/current custodians select eligibility.
 * The index supplies no rights: each selected offer repeats the complete held guard. */
function changedItemOfferIds(
  world: WorldState,
  baseline: WorldState | undefined,
  local?: ReadonlySet<string>,
): Set<string> | undefined {
  const changes =
    local ??
    entityChangesSince(world, baseline, [
      'itemOffers',
      'itemDefinitions',
      'itemHandling',
      'moduleManifest',
      'statusEffectPolicy',
      'resourceReservations',
    ]);
  if (!changes || !baseline) return;
  const candidates = new Set(changes),
    index = offerIndex(world),
    ids = new Set<string>();
  for (const id of changes)
    for (const snapshot of [baseline, world]) {
      const entity = entityGet(readOnlyDraftView(snapshot).entities, id);
      if (entity?.item || entity?.container) candidates.add(custodian(snapshot, id));
    }
  for (const id of candidates) {
    const item = index.byItem.get(id);
    if (item) ids.add(item.id);
    for (const pair of index.between.get(id)?.values() ?? []) {
      for (const offer of pair.incoming) ids.add(offer.id);
      for (const offer of pair.outgoing) ids.add(offer.id);
    }
  }
  for (const offer of index.deadlines) {
    if (offer.expiresAt > world.simTime) break;
    ids.add(offer.id);
  }
  return new Set([...ids].sort((a, b) => index.order.get(a)! - index.order.get(b)!));
}
const offerReconciliation = {};
export function reconcileItemOffers(
  world: WorldState,
  events: WorldEvent[],
  options: { baseline?: WorldState } = {},
): void {
  if (!world.itemOffers || !offerIndex(world).order.size) return;
  const offers = readOnlyDraftView(world.itemOffers);
  const local = takeNativeChanges(world, offerReconciliation);
  const baseline = options.baseline ?? (isDraft(world) ? original(world)! : undefined);
  const ids = changedItemOfferIds(world, baseline, local) ?? Object.keys(offers);
  for (const id of ids) {
    const offer = offers[id];
    if (!offer) continue;
    countDomainWork('itemOffersChecked');
    const expired = world.simTime >= offer.expiresAt;
    if (
      !expired &&
      able(entityGet(world.entities, offer.recipientId)) &&
      offerStillHeld(world, offer)
    )
      continue;
    const offerer = entityGet(world.entities, offer.offererId),
      recipient = entityGet(world.entities, offer.recipientId);
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
  return offerIndex(world).deadlines[0]?.expiresAt ?? Infinity;
}
export function isOfferLot(value: unknown): value is OfferLot {
  if (
    !hasRecordFields(
      value,
      ['itemId', 'definitionPin', 'quantity', 'whole', 'revision', 'placementRevision'],
      ['contentsRevision', 'subtreeRevision', 'capacity'],
    )
  )
    return false;
  const lot = value as unknown as OfferLot;
  const pin = lot.definitionPin;
  return (
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
    (lot.capacity === undefined || (Number.isSafeInteger(lot.capacity) && lot.capacity > 0)) &&
    (lot.contentsRevision === undefined || revision(lot.contentsRevision)) &&
    (lot.subtreeRevision === undefined || revision(lot.subtreeRevision))
  );
}
/** Validate current shapes; dangling terms/memories are not an old-format reader. */
export function validateItemOffers(world: WorldState): void {
  if (world.itemOffers === undefined) return;
  if (!world.itemOffers || typeof world.itemOffers !== 'object' || Array.isArray(world.itemOffers))
    throw new Error('Invalid item offers.');
  const items = new Set<string>();
  for (const [id, offer] of Object.entries(world.itemOffers)) {
    if (
      !hasRecordFields(
        offer,
        [
          'id',
          'revision',
          'offererId',
          'recipientId',
          'offered',
          'requested',
          'createdAt',
          'expiresAt',
        ],
        ['constructionUse'],
      ) ||
      id !== offer.id ||
      ![id, offer.offererId, offer.recipientId].every(isSafeRecordId) ||
      offer.offererId === offer.recipientId ||
      !revision(offer.revision) ||
      offer.revision < 1 ||
      !Array.isArray(offer.offered) ||
      !offer.offered.length ||
      offer.offered.length > STOCK_TRANSFER_LIMITS.movedLots ||
      !offer.offered.every(isOfferLot) ||
      !Array.isArray(offer.requested) ||
      offer.requested.length > STOCK_TRANSFER_LIMITS.movedLots ||
      !offer.requested.every(isOfferLot) ||
      offer.offered.length + offer.requested.length > STOCK_TRANSFER_LIMITS.movedLots ||
      (offer.constructionUse !== undefined &&
        (offer.offered.length !== 1 ||
          !validContributionConsent(offer.constructionUse) ||
          !world.constructionProfile?.materialContributions ||
          !world.constructionProfile.materialContributions.operations.includes(
            offer.constructionUse.terms.operation,
          ) ||
          !Object.hasOwn(
            world.constructionProfile.materialContributions.siteLabels,
            offer.constructionUse.terms.site.surfaceId,
          ) ||
          offer.constructionUse.terms.expiresAt >
            offer.createdAt + world.constructionProfile.materialContributions.maximumSeconds)) ||
      !Number.isFinite(offer.createdAt) ||
      !Number.isFinite(offer.expiresAt) ||
      offer.expiresAt <= offer.createdAt ||
      !world.socialOfferPolicy ||
      offer.expiresAt > offer.createdAt + world.socialOfferPolicy.pendingSeconds
    )
      throw new Error('Invalid item offer.');
    for (const lot of [...offer.offered, ...offer.requested]) {
      if (items.has(lot.itemId)) throw new Error('An item is promised twice.');
      items.add(lot.itemId);
    }
  }
}

function rememberedOfferExit(
  world: WorldState,
  actorId: string,
  command: Extract<HandoverCommand, { operation: 'accept' | 'decline' | 'withdraw' }>,
) {
  if (command.operation === 'accept' || world.itemOffers?.[command.offerId]) return;
  return perceivedItemOffers(world, actorId).find(
    (known) =>
      known.id === command.offerId &&
      known.revision === command.expectedOfferRevision &&
      known.status === 'pending' &&
      (command.operation === 'withdraw'
        ? known.offererId === actorId && known.recipientId === command.targetId
        : known.recipientId === actorId && known.offererId === command.targetId),
  );
}
