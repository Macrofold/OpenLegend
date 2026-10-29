import { entityGet } from './entity-collection.js';
import { seesEntity, hearsEntity } from './perception.js';
import { hasRecordFields, isSafeRecordId, isImmutableData } from './records.js';
import { finitePoint, type SurfacePoint } from '@open-legend/spatial';
import { cloneValue } from './draft.js';
import { isOfferLot } from './handover.js';
import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import { validContributionTerms } from './construction-contributions.js';
import type { ItemOffer, OfferLot, KnownTradeLot } from './handover.js';
import type { MovementOuting, OutingEndCause } from './outings.js';
import type { WorldState } from './types.js';
import type { Awareness } from './experience.js';

/** Derived lookup facts only. Exact acquired terms remain in their original
 * personal evidence, independently of whether live assent still exists. */
export function personalAgreementMetadata(
  entry: Awareness,
): { key: string; open: boolean; until?: number } | undefined {
  if (
    entry.retentionClass !== 'memory' ||
    typeof entry.eventData?.agreement !== 'string' ||
    (!['cooperation', 'social-compact'].includes(entry.eventType ?? '') &&
      entry.eventData.personalAgreement !== true)
  )
    return;
  // The owning event/current-format validators check the complete terms. This
  // selector reads only their shared lifecycle fields, never grants authority.
  const value = JSON.parse(entry.eventData.agreement) as {
    id: string;
    family?: string;
    phase?: string;
    status?: string;
    replyBy?: number;
    expiresAt?: number;
    endAt?: number;
  };
  const phase = value.phase ?? value.status;
  return {
    key: JSON.stringify([value.family ?? entry.eventType, value.id]),
    open: phase !== 'ended',
    ...(phase === 'pending'
      ? { until: value.replyBy ?? value.expiresAt }
      : value.endAt !== undefined
        ? { until: value.endAt }
        : {}),
  };
}

/** Residency is not forgetting. Preserve each latest eligible ongoing agreement,
 * including personally remembered assent whose unseen ending is unknown. */
export function retainedAgreementEvidence(world: WorldState, actorId: string): Set<string> {
  const omitted = new Set(world.experience?.forgotten[actorId] ?? []),
    corrections = world.experience?.corrections?.[actorId],
    latest = new Map<string, { id: string; open: boolean; until?: number }>();
  for (const entry of world.experience?.awareness[actorId] ?? []) {
    if (omitted.has(entry.eventId) || corrections?.[entry.eventId]) continue;
    const metadata = personalAgreementMetadata(entry);
    if (metadata) latest.set(metadata.key, { ...metadata, id: entry.eventId });
  }
  return new Set(
    [...latest.values()]
      .filter((entry) => entry.open && (entry.until ?? Infinity) > world.simTime)
      .map((entry) => entry.id),
  );
}

interface PersonalTerms {
  id: string;
  revision: number;
  createdAt: number;
  expiresAt: number;
}
export interface PerceivedMovementOuting extends PersonalTerms {
  family: 'movement-outing';
  kind: 'travel' | 'combat-help';
  proposerId: string;
  recipientId: string;
  status: 'pending' | 'traveling' | 'helping' | 'ended';
  destination: { label: string; point?: SurfacePoint };
  purpose?: string;
  ownArrived: boolean;
  opponentId?: string;
  cause?: OutingEndCause | 'own-ending';
}
export interface PerceivedItemOffer extends PersonalTerms {
  family: 'item-offer';
  offererId: string;
  recipientId: string;
  offered: OfferLot[];
  requested: OfferLot[];
  constructionUse?: {
    terms: import('./construction-contributions.js').ConstructionContributionTerms;
  };
  descriptions: {
    offered: { name: string; description: string }[];
    requested: { name: string; description: string }[];
  };
  status: 'pending' | 'ended';
  cause?: string;
}
export function mutualSocialReception(
  world: WorldState,
  firstId: string,
  secondId: string,
): boolean {
  const first = entityGet(world.entities, firstId),
    second = entityGet(world.entities, secondId);
  return (
    !!first?.actor?.alive &&
    !!second?.actor?.alive &&
    seesEntity(world, first, second) &&
    seesEntity(world, second, first) &&
    hearsEntity(world, first, second) &&
    hearsEntity(world, second, first)
  );
}
export function movementOutingSnapshot(
  trip: MovementOuting,
  actorId: string,
  cause?: PerceivedMovementOuting['cause'],
): PerceivedMovementOuting {
  return {
    family: 'movement-outing',
    id: trip.id,
    revision: trip.revision,
    createdAt: trip.createdAt,
    expiresAt: trip.expiresAt,
    kind: trip.kind,
    proposerId: trip.proposerId,
    recipientId: trip.recipientId,
    status: cause ? 'ended' : trip.status,
    destination: {
      label: trip.combat?.labels[actorId] ?? trip.destination.label,
      ...(trip.kind === 'travel' ? { point: cloneValue(trip.destination.point) } : {}),
    },
    ...(trip.purpose ? { purpose: trip.purpose } : {}),
    ownArrived: trip.arrived.includes(actorId),
    ...(trip.kind === 'combat-help' ? { opponentId: trip.combat.opponentId } : {}),
    ...(cause ? { cause } : {}),
  };
}
export function itemOfferSnapshot(
  world: WorldState,
  offer: ItemOffer,
  actorId: string,
  cause?: string,
): PerceivedItemOffer {
  const previous = perceivedItemOffers(world, actorId).find(
      (known) => known.id === offer.id && known.revision === offer.revision,
    ),
    description = (lot: OfferLot) => ({
      name: world.itemDefinitions[lot.definitionPin.id]!.name,
      description: world.itemDefinitions[lot.definitionPin.id]!.description,
    });
  return {
    family: 'item-offer',
    id: offer.id,
    revision: offer.revision,
    createdAt: offer.createdAt,
    expiresAt: offer.expiresAt,
    offererId: offer.offererId,
    recipientId: offer.recipientId,
    offered: cloneValue(offer.offered),
    requested: cloneValue(offer.requested),
    ...(offer.constructionUse
      ? { constructionUse: { terms: cloneValue(offer.constructionUse.terms) } }
      : {}),
    descriptions: previous?.descriptions ?? {
      offered: offer.offered.map(description),
      requested: offer.requested.map(description),
    },
    status: cause ? 'ended' : 'pending',
    ...(cause ? { cause } : {}),
  };
}
function validCommon(value: Record<string, unknown>): boolean {
  return (
    isSafeRecordId(value.id) &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) > 0 &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    value.createdAt >= 0 &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    value.expiresAt >= value.createdAt
  );
}
export function validatePersonalSocial(
  value: unknown,
  actorId: string,
): asserts value is PerceivedMovementOuting | PerceivedItemOffer {
  const fail = (): never => {
    throw new Error('Invalid personally received social terms.');
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  const record = value as Record<string, unknown>;
  if (!validCommon(record)) fail();
  if (record.family === 'movement-outing') {
    if (
      !hasRecordFields(
        record,
        [
          'family',
          'id',
          'revision',
          'createdAt',
          'expiresAt',
          'kind',
          'proposerId',
          'recipientId',
          'status',
          'destination',
          'ownArrived',
        ],
        ['purpose', 'opponentId', 'cause'],
      ) ||
      !isSafeRecordId(record.proposerId) ||
      !isSafeRecordId(record.recipientId) ||
      ![record.proposerId, record.recipientId].includes(actorId) ||
      record.proposerId === record.recipientId ||
      !['travel', 'combat-help'].includes(String(record.kind)) ||
      !['pending', 'traveling', 'helping', 'ended'].includes(String(record.status)) ||
      typeof record.ownArrived !== 'boolean' ||
      !hasRecordFields(record.destination, ['label'], record.kind === 'travel' ? ['point'] : []) ||
      typeof record.destination.label !== 'string' ||
      !record.destination.label.length ||
      (record.kind === 'travel' &&
        (!finitePoint(record.destination.point) ||
          !isSafeRecordId((record.destination.point as SurfacePoint).surfaceId))) ||
      (record.kind === 'combat-help' && !isSafeRecordId(record.opponentId)) ||
      (record.purpose !== undefined && typeof record.purpose !== 'string') ||
      (record.cause !== undefined && typeof record.cause !== 'string') ||
      (record.status === 'ended') !== (record.cause !== undefined)
    )
      fail();
  } else if (record.family === 'item-offer') {
    if (
      !hasRecordFields(
        record,
        [
          'family',
          'id',
          'revision',
          'createdAt',
          'expiresAt',
          'offererId',
          'recipientId',
          'offered',
          'requested',
          'descriptions',
          'status',
        ],
        ['constructionUse', 'cause'],
      ) ||
      !isSafeRecordId(record.offererId) ||
      !isSafeRecordId(record.recipientId) ||
      ![record.offererId, record.recipientId].includes(actorId) ||
      record.offererId === record.recipientId ||
      !Array.isArray(record.offered) ||
      !record.offered.length ||
      !record.offered.every(isOfferLot) ||
      !Array.isArray(record.requested) ||
      !record.requested.every(isOfferLot) ||
      record.offered.length + record.requested.length > STOCK_TRANSFER_LIMITS.movedLots ||
      new Set([...record.offered, ...record.requested].map((lot) => lot.itemId)).size !==
        record.offered.length + record.requested.length ||
      !hasRecordFields(record.descriptions, ['offered', 'requested']) ||
      !Array.isArray(record.descriptions.offered) ||
      record.descriptions.offered.length !== record.offered.length ||
      !Array.isArray(record.descriptions.requested) ||
      record.descriptions.requested.length !== record.requested.length ||
      (record.cause !== undefined && typeof record.cause !== 'string') ||
      !['pending', 'ended'].includes(String(record.status)) ||
      (record.status === 'ended') !== (typeof record.cause === 'string') ||
      (record.constructionUse !== undefined &&
        (record.offered.length !== 1 ||
          !hasRecordFields(record.constructionUse, ['terms']) ||
          !validContributionTerms(record.constructionUse.terms)))
    )
      fail();
    for (const description of Object.values(
      record.descriptions as Record<string, unknown[]>,
    ).flat())
      if (
        !hasRecordFields(description, ['name', 'description']) ||
        typeof description.name !== 'string' ||
        typeof description.description !== 'string'
      )
        fail();
  } else fail();
}
type Received = {
  movement: PerceivedMovementOuting[];
  offers: PerceivedItemOffer[];
  disclosures: Map<string, Map<string, KnownTradeLot>>;
};
const received = new WeakMap<
  object,
  { forgotten: unknown; corrections: unknown; value: Received }
>();
function personallyReceived(world: WorldState, actorId: string): Received {
  const entries = world.experience?.awareness[actorId] ?? [],
    forgotten = world.experience?.forgotten[actorId],
    corrections = world.experience?.corrections?.[actorId],
    immutable =
      isImmutableData(entries) && isImmutableData(forgotten) && isImmutableData(corrections),
    cached = immutable ? received.get(entries) : undefined;
  if (cached && cached.forgotten === forgotten && cached.corrections === corrections)
    return cached.value;
  const omitted = new Set(forgotten ?? []),
    movement = new Map<string, PerceivedMovementOuting>(),
    offers = new Map<string, PerceivedItemOffer>(),
    disclosures = new Map<string, Map<string, KnownTradeLot>>();
  for (const entry of entries) {
    if (
      entry.retentionClass !== 'memory' ||
      omitted.has(entry.eventId) ||
      corrections?.[entry.eventId] ||
      entry.eventData?.personalAgreement !== true ||
      typeof entry.eventData.agreement !== 'string'
    )
      continue;
    const value: unknown = JSON.parse(entry.eventData.agreement);
    validatePersonalSocial(value, actorId);
    if (value.family === 'movement-outing') movement.set(value.id, value);
    else {
      offers.set(value.id, value);
      const own = value.offererId === actorId,
        holder = own ? value.recipientId : value.offererId,
        lot = own ? value.requested : value.offered,
        description = own ? value.descriptions.requested : value.descriptions.offered;
      if (lot.length) {
        let rows = disclosures.get(holder);
        if (!rows) disclosures.set(holder, (rows = new Map()));
        lot.forEach((item, index) => {
          rows.delete(item.itemId);
          rows.set(item.itemId, {
            lot: item,
            ...description[index]!,
            disclosedAt: value.createdAt,
          });
        });
      }
    }
  }
  const value = { movement: [...movement.values()], offers: [...offers.values()], disclosures };
  if (immutable) received.set(entries, { forgotten, corrections, value });
  return value;
}
export function perceivedMovementOutings(
  world: WorldState,
  actorId: string,
): PerceivedMovementOuting[] {
  return personallyReceived(world, actorId).movement;
}
export function perceivedItemOffers(world: WorldState, actorId: string): PerceivedItemOffer[] {
  return personallyReceived(world, actorId).offers;
}
export function perceivedOffersBetween(world: WorldState, actorId: string, otherId: string) {
  const known = perceivedItemOffers(world, actorId).filter(
    (offer) => offer.status === 'pending' && offer.expiresAt > world.simTime,
  );
  return {
    incoming: known.filter((offer) => offer.offererId === otherId && offer.recipientId === actorId),
    outgoing: known.filter((offer) => offer.offererId === actorId && offer.recipientId === otherId),
  };
}
export function rememberedTradeLots(
  world: WorldState,
  actorId: string,
  otherId: string,
  limit: number,
): KnownTradeLot[] {
  return [...(personallyReceived(world, actorId).disclosures.get(otherId)?.values() ?? [])]
    .reverse()
    .slice(0, limit);
}

const emptyTradeDisclosures: ReadonlyMap<string, KnownTradeLot> = new Map();
/** Prepared personal evidence only; consumers must retain their actor's read scope. */
export function rememberedTradeDisclosureIndex(
  world: WorldState,
  actorId: string,
  otherId: string,
): ReadonlyMap<string, KnownTradeLot> {
  return personallyReceived(world, actorId).disclosures.get(otherId) ?? emptyTradeDisclosures;
}

/** Exact submitted references use the same personally received evidence index.
 * Candidate display windows cannot decide whether a disclosed lot is known. */
export function rememberedTradeLotReferences(
  world: WorldState,
  actorId: string,
  otherId: string,
  itemIds: readonly string[],
): ReadonlyMap<string, KnownTradeLot> {
  const disclosed = rememberedTradeDisclosureIndex(world, actorId, otherId);
  const selected = new Map<string, KnownTradeLot>();
  for (const id of itemIds) {
    const entry = disclosed.get(id);
    if (entry) selected.set(id, entry);
  }
  return selected;
}
export function validatePersonalSocialEvidence(world: WorldState): void {
  for (const [actorId, entries] of Object.entries(world.experience?.awareness ?? {}))
    for (const entry of entries)
      if (entry.eventData?.personalAgreement === true) {
        if (typeof entry.eventData.agreement !== 'string')
          throw new Error('Missing personally received social terms.');
        validatePersonalSocial(JSON.parse(entry.eventData.agreement), actorId);
      }
}
