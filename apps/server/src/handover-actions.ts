import { itemContainerCapacity } from '@open-legend/domain';
import {
  worldPosition,
  worldSupport,
  describeConstructionUse,
  constructionPermissionCurrent,
  prepareConstructionPermissions,
  prepareConstructionContribution,
  type ConstructionPermission,
  type ConstructionContributionTerms,
} from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import { namePhrase } from '@open-legend/language';
import {
  BASE_HANDOVER,
  perceivedOffersBetween,
  knownTradeLots,
  describeItemOffer,
  describeOfferLot,
  availableItemQuantity,
  observerName,
  type Entity,
  type ItemInstance,
  type WorldState,
  type OfferLot,
  type KnownTradeLot,
} from '@open-legend/domain';
import type {
  ActionOption,
  CommandInput,
  ItemTradeView,
  TradeLotView,
} from '@open-legend/protocol';

export interface HandoverOption {
  id: string;
  received?: true;
  label: string;
  shortLabel: string;
  description: string;
  command: CommandInput;
}
/** Public authored proposal choices. These disclose no other person's grants;
 * the handover owner still checks both complete current permissions on submission. */
export function contributionChoices(world: WorldState, actorId: string) {
  const policy = world.constructionProfile?.materialContributions,
    actor = entityGet(world.entities, actorId);
  if (!policy || !actor) return [];
  const p = worldPosition(actor),
    surfaceId = worldSupport(actor),
    r = policy.siteRadiusMetres;
  if (!surfaceId || !policy.siteLabels[surfaceId]) return [];
  return policy.operations.map((operation) => {
    const terms: ConstructionContributionTerms = {
      operation,
      site: { surfaceId, minX: p.x - r, maxX: p.x + r, minZ: p.z - r, maxZ: p.z + r },
      expiresAt: world.simTime + policy.maximumSeconds,
    };
    const detail = describeConstructionUse(world, terms);
    return {
      id: operation,
      label: detail,
      terms,
      durationSeconds: policy.maximumSeconds,
      detail: describeConstructionUse(world, terms, true),
    };
  });
}
export function contributionWithdrawals(
  world: WorldState,
  actorId: string,
  permissions: readonly ConstructionPermission[],
): HandoverOption[] {
  return (
    prepareConstructionPermissions(world.id, permissions).contributionsByParticipant.get(actorId) ??
    []
  )
    .map((entry) => permissions[entry.index]!)
    .filter(
      (p) =>
        p.worldId === world.id &&
        p.contribution &&
        constructionPermissionCurrent(world, p) &&
        [p.actorId, p.contribution.donorId].includes(actorId),
    )
    .map((p) => {
      const targetId = p.actorId === actorId ? p.contribution!.donorId : p.actorId;
      const detail = describeConstructionUse(world, {
        site: p.site,
        operation: p.operations[0]!,
        expiresAt: p.contribution!.expiresAt,
      });
      return {
        id: 'withdraw-construction-use:' + p.id + ':' + p.revision,
        label: 'Withdraw material use — ' + detail,
        shortLabel: 'Withdraw material use',
        description:
          detail +
          ' Ending this permission stops its unfinished work; completed construction and possessions remain.',
        command: {
          type: 'handover',
          handoverOperation: 'withdraw-use',
          targetId,
          contributionPermissionId: p.id,
          expectedRevision: p.revision,
        },
      };
    });
}
const pins = (lot: OfferLot) => ({
  itemId: lot.itemId,
  quantity: lot.quantity,
  expectedRevision: lot.revision,
  placementRevision: lot.placementRevision,
  expectedContentsRevision: lot.contentsRevision,
});

/** Participant-only terms; candidates consult the actor's disclosures, never other stock. */
export function handoverOptions(
  world: WorldState,
  actorId: string,
  inventory: readonly ItemInstance[],
  person: Entity,
  {
    offers = true,
    maxLots = BASE_HANDOVER.candidateLots,
    includeNested = false,
    contributions = false,
    permissions = [],
  }: {
    offers?: boolean;
    maxLots?: number;
    includeNested?: boolean;
    contributions?: boolean;
    permissions?: readonly ConstructionPermission[];
  } = {},
): HandoverOption[] {
  if (!person.actor?.alive || person.id === actorId) return [];
  const describedPerson = observerName(world, actorId, person.id);
  const personLabel = namePhrase(describedPerson, 'definite');
  const name = (id: string) => world.itemDefinitions[id]?.name ?? 'item';
  const { incoming, outgoing } = perceivedOffersBetween(world, actorId, person.id);
  const options: HandoverOption[] = [];
  for (const offer of incoming) {
    const what = describeItemOffer(world, offer);
    const receive = describeOfferLot(world, offer.offered);
    const give = offer.requested && describeOfferLot(world, offer.requested);
    for (const operation of ['accept', 'decline'] as const) {
      const label = operation === 'accept' ? BASE_HANDOVER.text.accept : BASE_HANDOVER.text.decline;
      options.push({
        id: 'offer-' + operation + ':' + offer.id + ':' + offer.revision,
        received: true,
        label: BASE_HANDOVER.text.actionLabel(label, what, personLabel, true),
        shortLabel: label + ' ' + what,
        description:
          operation === 'accept'
            ? BASE_HANDOVER.text.acceptDescription(receive, give) +
              ' ' +
              (world.itemDefinitions[offer.offered.definitionPin.id]?.description ?? '') +
              (give
                ? ' ' +
                  (world.itemDefinitions[offer.requested!.definitionPin.id]?.description ?? '')
                : '') +
              ' ' +
              BASE_HANDOVER.text.replyDuringWork +
              ' ' +
              BASE_HANDOVER.text.decision
            : BASE_HANDOVER.text.declineDescription(personLabel, what, give),
        command: {
          type: 'handover',
          handoverOperation: operation,
          targetId: person.id,
          offerId: offer.id,
          expectedOfferRevision: offer.revision,
        },
      });
    }
  }
  for (const offer of outgoing) {
    const what = describeItemOffer(world, offer);
    options.push({
      id: 'offer-withdraw:' + offer.id + ':' + offer.revision,
      received: true,
      label: BASE_HANDOVER.text.actionLabel(BASE_HANDOVER.text.withdraw, what, personLabel, false),
      shortLabel: BASE_HANDOVER.text.withdraw + ' ' + what,
      description: BASE_HANDOVER.text.withdrawDescription(what),
      command: {
        type: 'handover',
        handoverOperation: 'withdraw',
        targetId: person.id,
        offerId: offer.id,
        expectedOfferRevision: offer.revision,
      },
    });
  }
  if (!offers || !world.socialOfferPolicy) return options;
  const lots = inventory
    .filter(
      (item) =>
        (includeNested || item.ownerId === actorId) &&
        world.itemDefinitions[item.definitionId]?.portable === true,
    )
    .sort(
      (a, b) =>
        Number(!world.itemDefinitions[a.definitionId]!.nutrition) -
          Number(!world.itemDefinitions[b.definitionId]!.nutrition) || a.id.localeCompare(b.id),
    )
    .slice(0, maxLots);
  const known = knownTradeLots(world, actorId, person.id);
  const useChoices = contributions ? contributionChoices(world, actorId) : [];
  for (const item of lots) {
    const amounts =
      item.quantity > 1 && item.individuality !== 'individual' && !item.container
        ? [1, item.quantity]
        : [item.quantity];
    for (const quantity of amounts) {
      const what = quantity + ' ' + name(item.definitionId);
      const own = {
        itemId: item.id,
        quantity,
        expectedRevision: item.revision,
        placementRevision: item.placementRevision,
        expectedContentsRevision: item.container
          ? (entityGet(world.entities, item.id)?.inventoryRevision ?? 0)
          : undefined,
      };
      if (contributions) {
        const role = world.itemDefinitions[item.definitionId]?.assemblyMaterial?.role;
        const uses = useChoices.filter((choice) =>
          role === 'post'
            ? choice.terms.operation === 'post'
            : role === 'cover'
              ? choice.terms.operation === 'cover'
              : role === 'panel'
                ? choice.terms.operation === 'boundary-panel'
                : role === 'gate' || role === 'rail'
                  ? choice.terms.operation === 'boundary-gate'
                  : role === 'binding'
                    ? ['boundary-panel', 'boundary-gate'].includes(choice.terms.operation)
                    : role === 'fiber'
                      ? choice.terms.operation === 'repair-boundary'
                      : false,
        );
        for (const choice of uses) {
          const consent = prepareConstructionContribution(
            world,
            permissions,
            actorId,
            person.id,
            item.id,
            choice.terms,
          );
          if ('ok' in consent) continue;
          const description = what + ' — ' + describeConstructionUse(world, choice.terms);
          options.push({
            id: 'contribute:' + person.id + ':' + item.id + ':' + quantity + ':' + choice.id,
            label: description,
            shortLabel: world.constructionProfile!.materialContributions!.label,
            description,
            command: {
              type: 'handover',
              handoverOperation: 'offer',
              targetId: person.id,
              ...own,
              constructionUse: choice.terms,
            },
          });
        }
      }
      // A reply replaces the existing proposal rather than promising its item twice.
      for (const prior of incoming) {
        const terms = BASE_HANDOVER.text.terms(what, describeOfferLot(world, prior.offered));
        options.push({
          id: 'counter:' + prior.id + ':' + prior.revision + ':' + item.id + ':' + quantity,
          label: BASE_HANDOVER.text.actionLabel(
            BASE_HANDOVER.text.counter,
            terms,
            personLabel,
            false,
          ),
          shortLabel: BASE_HANDOVER.text.counter + ' ' + terms,
          description:
            BASE_HANDOVER.text.counterDescription(what, describeOfferLot(world, prior.offered)) +
            ' ' +
            BASE_HANDOVER.text.decision,
          command: {
            type: 'handover',
            handoverOperation: 'counter',
            targetId: person.id,
            ...own,
            requestedItem: pins(prior.offered),
            offerId: prior.id,
            expectedOfferRevision: prior.revision,
          },
        });
      }
      for (const requested of known) {
        const terms = BASE_HANDOVER.text.terms(what, describeOfferLot(world, requested.lot));
        options.push({
          id: 'trade:' + item.id + ':' + quantity + ':' + requested.lot.itemId + ':' + person.id,
          label: BASE_HANDOVER.text.actionLabel(
            BASE_HANDOVER.text.offer,
            terms,
            personLabel,
            false,
          ),
          shortLabel: BASE_HANDOVER.text.offer + ' ' + terms,
          description:
            BASE_HANDOVER.text.exchangeDescription(what, describeOfferLot(world, requested.lot)) +
            ' ' +
            requested.description +
            ' ' +
            BASE_HANDOVER.text.decision,
          command: {
            type: 'handover',
            handoverOperation: 'offer',
            targetId: person.id,
            ...own,
            requestedItem: pins(requested.lot),
          },
        });
      }
      if (
        !outgoing.some(
          (offer) => offer.offered.itemId === item.id || offer.requested?.itemId === item.id,
        )
      )
        options.push({
          id: 'offer:' + item.id + ':' + quantity + ':' + person.id,
          label: BASE_HANDOVER.text.actionLabel(BASE_HANDOVER.text.offer, what, personLabel, false),
          shortLabel: BASE_HANDOVER.text.offer + ' ' + what,
          description: BASE_HANDOVER.text.giftDescription(
            what,
            personLabel,
            world.socialOfferPolicy.pendingSeconds / 60,
          ),
          command: { type: 'handover', handoverOperation: 'offer', targetId: person.id, ...own },
        });
    }
  }
  return options;
}

function disclosedView(known: KnownTradeLot, index: number): TradeLotView {
  return {
    id: known.lot.itemId,
    name: known.name,
    label: BASE_HANDOVER.text.disclosedLot(known.name, index),
    description: known.description,
    quantity: known.lot.quantity,
    revision: known.lot.revision,
    placementRevision: known.lot.placementRevision,
    contentsRevision: known.lot.contentsRevision,
    whole: known.lot.whole,
    capacity: known.lot.capacity,
  };
}
/** Prepare the observer's compact stock once, shared by all permitted person panels. */
export function tradeOwnLots(
  world: WorldState,
  inventory: readonly ItemInstance[],
): TradeLotView[] {
  return inventory
    .filter((item) => world.itemDefinitions[item.definitionId]?.portable === true)
    .slice(0, BASE_HANDOVER.candidateLots)
    .map(
      (item, index): TradeLotView => ({
        id: item.id,
        name: world.itemDefinitions[item.definitionId]!.name,
        label: BASE_HANDOVER.text.carriedLot(world.itemDefinitions[item.definitionId]!.name, index),
        description: world.itemDefinitions[item.definitionId]!.description,
        capacity: itemContainerCapacity(world, entityGet(world.entities, item.id)!),
        quantity: availableItemQuantity(world, item.id),
        revision: item.revision ?? 0,
        placementRevision: item.placementRevision ?? 0,
        contentsRevision: item.container
          ? (entityGet(world.entities, item.id)?.inventoryRevision ?? 0)
          : undefined,
        whole: !!item.container || item.individuality === 'individual',
      }),
    );
}
export function itemTradeView(
  world: WorldState,
  actorId: string,
  ownLots: readonly TradeLotView[],
  person: Entity,
  scope: string,
  replies: readonly ActionOption[],
): ItemTradeView {
  const labels = BASE_HANDOVER.text;
  const { incoming, outgoing } = perceivedOffersBetween(world, actorId, person.id);
  const remembered = knownTradeLots(world, actorId, person.id);
  const termView = (lot: OfferLot, own: boolean): TradeLotView => {
    const saved = remembered.find((entry) => entry.lot.itemId === lot.itemId);
    const named = own
      ? ownLots.find((item) => item.id === lot.itemId)
      : saved && disclosedView(saved, remembered.indexOf(saved));
    const definition = world.itemDefinitions[lot.definitionPin.id];
    return {
      id: lot.itemId,
      name: named?.name ?? definition?.name ?? 'item',
      label: named?.label ?? definition?.name ?? 'item',
      description: named?.description ?? definition?.description ?? '',
      capacity: lot.capacity,
      quantity: lot.quantity,
      revision: lot.revision,
      placementRevision: lot.placementRevision,
      contentsRevision: lot.contentsRevision,
      whole: lot.whole,
    };
  };
  return {
    scope: JSON.stringify([scope, person.id]),
    personId: person.id,
    personName: observerName(world, actorId, person.id).name,
    labels: {
      title: labels.title,
      newOffer: labels.newOffer,
      review: labels.review,
      refresh: labels.refresh,
      choose: labels.choose,
      whole: labels.whole,
      giveQuantity: labels.giveQuantity,
      receiveQuantity: labels.receiveQuantity,
      selectionHint: labels.selectionHint,
      into: labels.into,
      to: labels.to,
      remembered: labels.remembered,
      noTransfer: labels.noTransfer,
      draftChanged: labels.draftChanged,
      give: labels.give,
      receive: labels.receive,
      offer: labels.offer,
      accept: labels.accept,
      decline: labels.decline,
      withdraw: labels.withdraw,
      counter: labels.counter,
      gift: labels.gift,
      waiting: labels.waiting,
      incoming: labels.incoming,
      changed: labels.changed,
      unknown: labels.unknown,
    },
    ...(world.constructionProfile?.materialContributions
      ? { contributionChoices: contributionChoices(world, actorId) }
      : {}),
    ownLots: [...ownLots],
    knownLots: remembered.map(disclosedView),
    offers: [...incoming, ...outgoing].map((offer) => {
      const isIncoming = offer.recipientId === actorId;
      const give = isIncoming ? offer.requested : offer.offered;
      const receive = isIncoming ? offer.offered : offer.requested;
      return {
        id: offer.id,
        revision: offer.revision,
        incoming: isIncoming,
        ...(offer.constructionUse
          ? {
              constructionUse: {
                terms: offer.constructionUse.terms,
                detail: describeConstructionUse(world, offer.constructionUse.terms, true),
              },
            }
          : {}),
        ...(give ? { give: termView(give, true) } : {}),
        ...(receive ? { receive: termView(receive, false) } : {}),
        expiresAt: offer.expiresAt,
        actions: replies
          .filter((option) => option.command.offerId === offer.id)
          .map((option) => {
            return {
              id: option.id,
              label:
                option.command.handoverOperation === 'accept'
                  ? labels.accept
                  : option.command.handoverOperation === 'decline'
                    ? labels.decline
                    : labels.withdraw,
              command: option.command,
              enabled: option.enabled,
              ...(!option.enabled ? { reason: option.reason } : {}),
            };
          }),
      };
    }),
  };
}
