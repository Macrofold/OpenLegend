import { atomicObjects, canHandleItems } from './item-handling.js';
import {
  accessiblePossession,
  canAccessContainer,
  inventoryWorkReason,
  possessionItems,
} from './object-access.js';
import { custodian, directChildIds, itemFor, moveLot } from './objects.js';
import { availableItemQuantity, itemHasReservations } from './resource-claims.js';
import { getOwn, isSafeRecordId } from './records.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { contributionSourceBound } from './status-capabilities.js';
import { WorkBudgetError } from './work-budget.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import type { ItemInstance, WorldState } from './types.js';

/** Native admission work, independent of world-authored delivery quantities.
 * docs/projects/next-playable-week/camp-activities.md#fresh-stock-binding-at-the-existing-custody-owner
 */
export const STOCK_TRANSFER_LIMITS = Object.freeze({ examined: 200, movedLots: 16 });

export interface StockTransferRequest {
  sourceId: string;
  destinationId: string;
  definitionId: string;
  definitionVersion: number;
  definitionDigest: string;
  quantity: number;
  minimumHeld: number;
}
export interface StockLotAdmission {
  itemId: string;
  quantity: number;
  revision: number;
  placementRevision: number;
}
export interface StockTransferAdmission {
  sourceId: string;
  destinationId: string;
  destinationRevision: number;
  definition: DefinitionPin;
  quantity: number;
  minimumHeld: number;
  lots: StockLotAdmission[];
}
export type StockTransferResult =
  | {
      status: 'moved';
      examined: number;
      admitted: StockTransferAdmission;
      outputs: Array<StockLotAdmission & { definitionId: string }>;
    }
  | {
      status: 'invalid' | 'unavailable' | 'insufficient' | 'incomplete';
      examined: number;
      message: string;
    };
export type AvailableStockProof = {
  status: 'proved' | 'insufficient' | 'incomplete' | 'unavailable';
  /** A lower bound when proved/incomplete, never a claimed complete census. */
  available: number;
  examined: number;
};
export interface AvailableStockOptions {
  /** A selected own bag can prove the minimum without inspecting other possessions. */
  sourceId?: string;
  /** Completion may count the exact lot pinned by this actor's current action. This
   * trusted internal option does not release claims or another action's use. */
  ignoreActionId?: string;
}
interface StockScan {
  examined: number;
  ownAvailable: number;
  countedOwnLots: Set<string>;
}
const newScan = (): StockScan => ({
  examined: 0,
  ownAvailable: 0,
  countedOwnLots: new Set(),
});

function currentDefinition(world: WorldState, pin: DefinitionPin): boolean {
  const definition = getOwn(world.itemDefinitions, pin.id);
  return !!definition?.portable && sameDefinitionPin(definitionPin(definition), pin);
}
function* sourceItems(
  world: WorldState,
  actorId: string,
  sourceId: string,
): Generator<ItemInstance> {
  if (sourceId === actorId) yield* possessionItems(world, actorId);
  else
    for (const id of directChildIds(world, sourceId)) {
      const item = itemFor(world, id);
      // Every indexed direct child is examined, even if it supplies no portable units.
      // Valid containment children are items; an invalid child aborts instead of hiding it.
      if (!item) throw new Error('Selected contents are unavailable.');
      yield item;
    }
}
function eligibleQuantity(
  world: WorldState,
  actorId: string,
  item: ItemInstance,
  pin: DefinitionPin,
  ignoreActionId?: string,
): number {
  const entity = world.entities[item.id],
    lot = entity?.item,
    action = world.entities[actorId]?.actor?.action;
  if (
    !entity ||
    !lot ||
    item.container ||
    item.individuality !== 'homogeneous' ||
    !sameDefinitionPin(lot.definitionPin, pin) ||
    !canAccessContainer(world, actorId, item.ownerId) ||
    itemHasReservations(world, item.id) ||
    contributionSourceBound(world, item.id) ||
    Object.values(entity.statusEffects ?? {}).some((state) => state.active)
  )
    return 0;
  const completingOwnAction =
    !!ignoreActionId && action?.id === ignoreActionId && action.itemId === item.id;
  if (!completingOwnAction && inventoryWorkReason(world, actorId, item.id)) return 0;
  return availableItemQuantity(world, item.id);
}
function countOwn(
  world: WorldState,
  actorId: string,
  item: ItemInstance,
  amount: number,
  scan: StockScan,
) {
  if (
    amount &&
    !scan.countedOwnLots.has(item.id) &&
    accessiblePossession(world, actorId, item.id)
  ) {
    scan.countedOwnLots.add(item.id);
    // Stop proofs at the requested threshold; a stored complete total is unnecessary.
    scan.ownAvailable = Math.min(Number.MAX_SAFE_INTEGER, scan.ownAvailable + amount);
  }
}
function scanOwnStock(
  world: WorldState,
  actorId: string,
  pin: DefinitionPin,
  required: number,
  scan: StockScan,
  options: AvailableStockOptions = {},
): AvailableStockProof['status'] {
  if (scan.ownAvailable >= required) return 'proved';
  const iterator = sourceItems(world, actorId, options.sourceId ?? actorId);
  while (scan.examined < STOCK_TRANSFER_LIMITS.examined) {
    const next = iterator.next();
    if (next.done) return 'insufficient';
    scan.examined++;
    const amount = eligibleQuantity(world, actorId, next.value, pin, options.ignoreActionId);
    countOwn(world, actorId, next.value, amount, scan);
    if (scan.ownAvailable >= required) return 'proved';
  }
  return 'incomplete';
}

/** Shared admission/completion spending proof. The caller adds its planned debit to
 * the chosen minimum; the proof does not reserve stock or grant continued access. */
export function proveAvailableStock(
  world: WorldState,
  actorId: string,
  pin: DefinitionPin,
  required: number,
  options: AvailableStockOptions = {},
): AvailableStockProof {
  const scan = newScan();
  try {
    const sourceId = options.sourceId ?? actorId;
    if (
      !Number.isSafeInteger(required) ||
      required < 0 ||
      !isDefinitionPin(pin) ||
      !currentDefinition(world, pin) ||
      !world.entities[actorId]?.actor ||
      (sourceId !== actorId &&
        (!world.entities[sourceId]?.container || custodian(world, sourceId) !== actorId)) ||
      !canAccessContainer(world, actorId, sourceId)
    )
      return { status: 'unavailable', available: 0, examined: 0 };
    const status = scanOwnStock(world, actorId, pin, required, scan, options);
    return { status, available: scan.ownAvailable, examined: scan.examined };
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return { status: 'unavailable', available: scan.ownAvailable, examined: scan.examined };
  }
}

/** Resolve this attempt's exact lots and commit through the existing physical owner.
 * No revision from a prior activity is accepted as future movement authority. */
export function transferStock(
  world: WorldState,
  actorId: string,
  request: StockTransferRequest,
  cause: string,
): StockTransferResult {
  const scan = newScan(),
    fail = (
      status: Extract<StockTransferResult, { message: string }>['status'],
      message: string,
    ): StockTransferResult => ({ status, message, examined: scan.examined }),
    pin: DefinitionPin = {
      id: request.definitionId,
      version: request.definitionVersion,
      digest: request.definitionDigest,
    };
  if (
    ![actorId, request.sourceId, request.destinationId, cause].every(isSafeRecordId) ||
    !isDefinitionPin(pin) ||
    !Number.isSafeInteger(request.quantity) ||
    request.quantity <= 0 ||
    !Number.isSafeInteger(request.minimumHeld) ||
    request.minimumHeld < 0 ||
    request.sourceId === request.destinationId
  )
    return fail(
      'invalid',
      'Choose a valid material, exact quantity, minimum and distinct containers.',
    );
  try {
    const actor = getOwn(world.entities, actorId),
      source = getOwn(world.entities, request.sourceId),
      destination = getOwn(world.entities, request.destinationId);
    // Scope is checked before stock/capacity diagnostics, preserving hidden contents.
    if (
      !actor?.actor ||
      !canHandleItems(world, actor) ||
      !source ||
      !destination ||
      !(source.id === actorId || source.container) ||
      !(destination.id === actorId || destination.container) ||
      !canAccessContainer(world, actorId, source.id) ||
      !canAccessContainer(world, actorId, destination.id) ||
      !currentDefinition(world, pin)
    )
      return fail('unavailable', 'Choose an accessible source, destination and portable material.');
    const sourceOwn = source.id === actorId || custodian(world, source.id) === actorId,
      destinationOwn = destination.id === actorId || custodian(world, destination.id) === actorId,
      requiredOwn = sourceOwn && !destinationOwn ? request.quantity + request.minimumHeld : 0;
    if (!Number.isSafeInteger(requiredOwn))
      return fail('invalid', 'The quantity and chosen minimum exceed supported whole units.');
    const lots: StockLotAdmission[] = [],
      iterator = sourceItems(world, actorId, source.id);
    let remaining = request.quantity,
      sourceComplete = false;
    while (remaining || scan.ownAvailable < requiredOwn) {
      if (scan.examined >= STOCK_TRANSFER_LIMITS.examined)
        return fail(
          'incomplete',
          'Inspect further or choose a narrower source to establish available stock.',
        );
      const next = iterator.next();
      if (next.done) {
        sourceComplete = true;
        break;
      }
      scan.examined++;
      const item = next.value,
        amount = eligibleQuantity(world, actorId, item, pin);
      countOwn(world, actorId, item, amount, scan);
      if (!remaining || !amount || item.ownerId === destination.id) continue;
      if (lots.length >= STOCK_TRANSFER_LIMITS.movedLots)
        return fail(
          'incomplete',
          'The exact quantity needs too many lots; choose a narrower source.',
        );
      if (item.revision === undefined || item.placementRevision === undefined)
        return fail('unavailable', 'Current item revisions are unavailable.');
      const quantity = Math.min(amount, remaining);
      lots.push({
        itemId: item.id,
        quantity,
        revision: item.revision,
        placementRevision: item.placementRevision,
      });
      remaining -= quantity;
    }
    if (remaining)
      return fail('insufficient', 'The selected source has too few available matching units.');
    if (sourceComplete && source.id === actorId && scan.ownAvailable < requiredOwn)
      return fail(
        'insufficient',
        'This transfer would leave fewer available units than the chosen personal minimum.',
      );
    const guard = scanOwnStock(world, actorId, pin, requiredOwn, scan);
    if (guard !== 'proved')
      return fail(
        guard === 'incomplete' ? 'incomplete' : 'insufficient',
        guard === 'incomplete'
          ? 'Inspect further or choose a narrower source to establish the chosen personal minimum.'
          : 'This transfer would leave fewer available units than the chosen personal minimum.',
      );
    const admitted: StockTransferAdmission = {
      sourceId: source.id,
      destinationId: destination.id,
      destinationRevision: destination.inventoryRevision ?? 0,
      definition: { ...pin },
      quantity: request.quantity,
      minimumHeld: request.minimumHeld,
      lots,
    };
    const outputs = atomicObjects(world, (candidate) =>
      lots.map((lot) => {
        // Skipping automatic merges preserves provenance and avoids a destination-wide
        // scan for each selected source lot. Existing explicit merge remains available.
        const itemId = moveLot(candidate, lot.itemId, destination.id, lot.quantity, cause, false),
          moved = itemFor(candidate, itemId);
        if (!moved || moved.revision === undefined || moved.placementRevision === undefined)
          throw new Error('Moved units or current revisions are unavailable.');
        return {
          itemId,
          definitionId: pin.id,
          quantity: lot.quantity,
          revision: moved.revision,
          placementRevision: moved.placementRevision,
        };
      }),
    );
    return { status: 'moved', examined: scan.examined, admitted, outputs };
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return fail(
      'unavailable',
      error instanceof Error ? error.message : 'Stock transfer is unavailable.',
    );
  }
}
