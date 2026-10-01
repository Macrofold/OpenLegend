import {
  BASE_HANDOVER,
  offersBetween,
  type Entity,
  type ItemInstance,
  type WorldState,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

export interface HandoverOption {
  id: string;
  /** Menu wording naming the other person. */
  label: string;
  /** Short wording for that person's own panel. */
  shortLabel: string;
  /** Actor-facing consequence summary for character decisions. */
  description: string;
  command: CommandInput;
}

/** Offer and reply options between an actor and one visible person; native admission still
 * decides. Only offers between these two are read, never other people's pending offers.
 * Offers cover top-level portable lots, food first, as one unit or the whole lot. */
export function handoverOptions(
  world: WorldState,
  actorId: string,
  inventory: readonly ItemInstance[],
  person: Entity,
  { offers = true, maxLots = 6 }: { offers?: boolean; maxLots?: number } = {},
): HandoverOption[] {
  // The dead cannot hold, give or take; their offers have already lapsed.
  if (!person.actor?.alive || person.id === actorId) return [];
  const name = (definitionId: string) => world.itemDefinitions[definitionId]?.name ?? 'item';
  const { incoming, outgoing } = offersBetween(world, actorId, person.id);
  const options: HandoverOption[] = [];
  for (const offer of incoming) {
    const what = `${offer.quantity} ${name(offer.definitionId)}`;
    const about = world.itemDefinitions[offer.definitionId]?.description;
    options.push(
      {
        id: `offer-accept:${offer.id}`,
        label: `Accept ${what} from ${person.name}`,
        shortLabel: `Accept ${what}`,
        description: `Accept ${what} that ${person.name} is offering me; it moves into my possession now.${about ? ` ${name(offer.definitionId)}: ${about}` : ''} Replying does not interrupt my current work.`,
        command: {
          type: 'handover',
          handoverOperation: 'accept',
          targetId: person.id,
          offerId: offer.id,
        },
      },
      {
        id: `offer-decline:${offer.id}`,
        label: `Decline ${what} from ${person.name}`,
        shortLabel: `Decline ${what}`,
        description: `Decline ${person.name}'s offer of ${what}; nothing moves.`,
        command: {
          type: 'handover',
          handoverOperation: 'decline',
          targetId: person.id,
          offerId: offer.id,
        },
      },
    );
  }
  for (const offer of outgoing) {
    const what = `${offer.quantity} ${name(offer.definitionId)}`;
    options.push({
      id: `offer-withdraw:${offer.id}`,
      label: `Withdraw offer of ${what} to ${person.name}`,
      shortLabel: `Withdraw offer of ${what}`,
      description: `Withdraw my offer of ${what} to ${person.name}; nothing moves.`,
      command: {
        type: 'handover',
        handoverOperation: 'withdraw',
        targetId: person.id,
        offerId: offer.id,
      },
    });
  }
  if (!offers) return options;
  const lots = inventory
    .filter(
      (item) =>
        item.ownerId === actorId &&
        world.itemDefinitions[item.definitionId]?.portable === true &&
        !outgoing.some((offer) => offer.itemId === item.id),
    )
    .sort(
      (a, b) =>
        Number(!world.itemDefinitions[a.definitionId]!.nutrition) -
          Number(!world.itemDefinitions[b.definitionId]!.nutrition) || a.id.localeCompare(b.id),
    )
    .slice(0, maxLots);
  const minutes = BASE_HANDOVER.offerSeconds / 60;
  for (const item of lots)
    for (const quantity of item.quantity > 1 ? [1, item.quantity] : [item.quantity]) {
      const what = `${quantity} ${name(item.definitionId)}`;
      options.push({
        id: `offer:${item.id}:${quantity}:${person.id}`,
        label: `Offer ${what} to ${person.name}`,
        shortLabel: `Offer ${what}`,
        description: `Offer ${what} to ${person.name}. Nothing moves unless they accept within ${minutes} game minutes; I keep it until then and can withdraw the offer.`,
        command: {
          type: 'handover',
          handoverOperation: 'offer',
          targetId: person.id,
          itemId: item.id,
          quantity,
        },
      });
    }
  return options;
}
