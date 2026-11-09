import {
  selectedTradeViewTitle,
  canHandleItems,
  currentBodySubject,
  prepareCurrentBodyReadScope,
  entityGet,
  inventoryFor,
  nativeCommandSupported,
  observerName,
  perceivedItemOffers,
  type ObserverSubject,
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
const tradeDraftScope = (
  world: WorldState,
  scope: RequestScope,
  person: Entity,
  reads = prepareCurrentBodyReadScope(world, scope.actorId),
) =>
  tradeDraftScopeFor(
    world.id,
    scope,
    currentBodySubject(world, scope.actorId, person.id, reads) ??
      currentContactReference(world, scope, person, reads),
    person.actor?.physicalLife ?? 0,
  );

export function tradeDraftScopeFor(
  worldId: string,
  scope: RequestScope,
  subject: ObserverSubject | string,
  physicalLife: number,
): string {
  return permittedSourceHandle({ id: worldId }, scope.actorId, [
    'trade-draft',
    privateDraftScopeKey(scope),
    scope.timelineId,
    subject,
    physicalLife,
  ]);
}

interface KnownOfferRevision {
  readonly id: string;
  readonly revision: number;
  readonly status: string;
  readonly expiresAt: number;
}

export function tradeDefinitionsRevisionFor(
  worldId: string,
  observerId: string,
  input: {
    readonly itemDefinitions: WorldState['itemDefinitions'];
    readonly itemArt: NonNullable<WorldState['presentation']>['itemArt'];
    readonly itemHandling: WorldState['itemHandling'];
    readonly constructionProfile: WorldState['constructionProfile'];
  },
): string {
  return permittedSourceHandle({ id: worldId }, observerId, [
    'trade-definitions',
    input.itemDefinitions,
    input.itemArt,
    input.itemHandling,
    input.constructionProfile,
  ]);
}

export function tradeReaderRevisionFor(
  worldId: string,
  observerId: string,
  input: {
    readonly inventoryRevision: number | undefined;
    readonly bodyRevision: string;
    readonly actionId: string | undefined;
    readonly actionStage: string | undefined;
    readonly heldStock: readonly (readonly [string, number])[];
    readonly moduleRevision: number;
    readonly spatialRevision: number;
    readonly definitionsRevision: string;
  },
): string {
  return permittedSourceHandle({ id: worldId }, observerId, [
    'trade-reader-owner',
    input.inventoryRevision,
    input.bodyRevision,
    input.actionId,
    input.actionStage,
    input.heldStock,
    input.moduleRevision,
    input.spatialRevision,
    input.definitionsRevision,
  ]);
}
/** The source reader owns offer selection and current contact permission. This
 * formatter consumes those finite products and retains the existing tokens. */
export function projectKnownTradeSummary(input: {
  readonly worldId: string;
  readonly observerId: string;
  readonly personId: string;
  readonly personReference: string;
  readonly personName: string;
  readonly title: string;
  readonly draftScope: string;
  readonly known: readonly KnownOfferRevision[];
  readonly at: number;
  readonly readerRevision: string;
  readonly disclosureRevision: string;
}): ItemTradeSummary {
  const offers = input.known
    .filter((offer) => offer.status === 'pending' && offer.expiresAt > input.at)
    .map(({ id, revision }) => ({ id, revision }));
  return {
    scope: input.draftScope,
    personId: input.personReference,
    personName: input.personName,
    labels: { title: input.title },
    offers,
    revision: permittedSourceHandle({ id: input.worldId }, input.observerId, [
      'trade-reader',
      input.personId,
      input.known.map(({ id, revision, status }) => [id, revision, status]),
      offers,
      input.readerRevision,
      input.disclosureRevision,
    ]),
  };
}

/** The ordinary view carries personally known offer identities, never each nearby
 * person's complete trade menu and another copy of the player's inventory. */
export function tradeSummary(
  world: WorldState,
  scope: RequestScope,
  person: Entity,
  readerRevision: string,
  disclosureRevision: string,
  reads = prepareCurrentBodyReadScope(world, scope.actorId),
): ItemTradeSummary | undefined {
  const actor = entityGet(world.entities, scope.actorId)!;
  if (!person.actor?.alive || !canHandleItems(world, person)) return;
  const known = perceivedItemOffers(world, actor.id).filter(
    (offer) =>
      (offer.offererId === actor.id && offer.recipientId === person.id) ||
      (offer.recipientId === actor.id && offer.offererId === person.id),
  );
  return projectKnownTradeSummary({
    worldId: world.id,
    observerId: actor.id,
    personId: person.id,
    personReference: currentContactReference(world, scope, person, reads),
    personName: observerName(world, actor.id, person.id, reads).name,
    title: selectedTradeViewTitle(world),
    draftScope: tradeDraftScope(world, scope, person, reads),
    known,
    at: world.simTime,
    readerRevision,
    disclosureRevision,
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
