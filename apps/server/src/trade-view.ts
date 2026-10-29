import {
  BASE_HANDOVER,
  canHandleItems,
  currentBodySubject,
  entityGet,
  inventoryFor,
  nativeCommandSupported,
  observerName,
  perceivedItemOffers,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
import type { ItemTradeSummary, ItemTradeView } from '@open-legend/protocol';
import { privateDraftScopeKey, type RequestScope } from './authority.js';
import { permittedSourceHandle } from './entity-references.js';
import { handoverOptions, itemTradeView, tradeOwnLots } from './handover-actions.js';
import { nativeCommandKind } from './native-command-kind.js';
import {
  ContactReferenceError,
  currentContactReference,
  projectCommandContactReferences,
  resolveContactTarget,
} from './public-contact-references.js';
import type { WorldService } from './world-service.js';

/** A private physical route cannot reconnect two unknown bodies. Draft continuity
 * follows the observer's acquired individual, or this exact current contact. */
const tradeDraftScope = (world: WorldState, scope: RequestScope, person: Entity) =>
  permittedSourceHandle(world, scope.actorId, [
    'trade-draft',
    privateDraftScopeKey(scope),
    scope.timelineId,
    currentBodySubject(world, scope.actorId, person.id) ??
      currentContactReference(world, scope, person),
    person.actor?.physicalLife ?? 0,
  ]);

/** The ordinary view carries personally known offer identities, never each nearby
 * person's complete trade menu and another copy of the player's inventory. */
export function tradeSummary(
  world: WorldState,
  scope: RequestScope,
  person: Entity,
  readerRevision: string,
  disclosureRevision: string,
): ItemTradeSummary | undefined {
  const actor = entityGet(world.entities, scope.actorId)!;
  if (!person.actor?.alive || !canHandleItems(world, person)) return;
  const known = perceivedItemOffers(world, actor.id).filter(
    (offer) =>
      (offer.offererId === actor.id && offer.recipientId === person.id) ||
      (offer.recipientId === actor.id && offer.offererId === person.id),
  );
  const offers = known
    .filter((offer) => offer.status === 'pending' && offer.expiresAt > world.simTime)
    .map(({ id, revision }) => ({ id, revision }));
  return projectCommandContactReferences(world, scope, {
    scope: tradeDraftScope(world, scope, person),
    personId: person.id,
    personName: observerName(world, actor.id, person.id).name,
    labels: { title: BASE_HANDOVER.text.title },
    offers,
    revision: permittedSourceHandle(world, actor.id, [
      'trade-reader',
      person.id,
      known.map(({ id, revision, status }) => [id, revision, status]),
      offers,
      readerRevision,
      disclosureRevision,
    ]),
  });
}

/** Read-only detail: one selected current contact, through the same native
 * availability and evidence owners as execution and the action catalogue. */
export function readTradeView(
  service: WorldService,
  scope: RequestScope,
  targetReference: string,
): { ok: true; trade: ItemTradeView } {
  service.assertScope(scope);
  const world = service.world,
    person = entityGet(world.entities, resolveContactTarget(world, scope, targetReference));
  if (person?.id === scope.actorId || !person?.actor?.alive || !canHandleItems(world, person))
    throw new ContactReferenceError();
  const inventory = inventoryFor(world, scope.actorId);
  const replies = handoverOptions(world, scope.actorId, inventory, person, { offers: false })
    .filter((option) => nativeCommandSupported(world, nativeCommandKind(option.command.type)))
    .map((option) => {
      const preview = service.previewCommand(option.command, scope);
      return {
        id: permittedSourceHandle(world, scope.actorId, ['control', option.id]),
        label: option.shortLabel,
        command: option.command,
        enabled: preview.ok,
        ...(!preview.ok ? { reason: preview.message } : {}),
      };
    });
  return {
    ok: true,
    trade: projectCommandContactReferences(
      world,
      scope,
      itemTradeView(
        world,
        scope.actorId,
        tradeOwnLots(world, inventory),
        person,
        tradeDraftScope(world, scope, person),
        replies,
      ),
    ),
  };
}
