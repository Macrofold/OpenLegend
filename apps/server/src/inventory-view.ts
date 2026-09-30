import {
  NATIVE_PREPARATIONS,
  canAccessContainer,
  accessiblePossession,
  inventoryWorkReason,
  mergeTargetAvailable,
  worldRootEntities,
  dropItemReason,
  hasWildernessNeeds,
  observerDescription,
  itemFor,
  describePossession,
  contentsQuery,
  capabilityBlocked,
  custodian,
  objectAncestors,
  type ItemInstance,
} from '@open-legend/domain';
import type {
  ActionOption,
  InventoryItemView,
  ContainerPage,
  ObjectHistoryPage,
} from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';
import { z } from 'zod';
import { HistoryCursorError } from './perceived-events.js';

/** A historical successor is descriptive only; no redirect to an actionable object. */
export async function objectHistoryPage(
  service: WorldService,
  scope: RequestScope,
  request: { cursor?: string; objectId?: string },
): Promise<ObjectHistoryPage> {
  service.assertScope(scope);
  if (!service.store.records) throw new Error('Object history is unavailable.');
  let after = '';
  if (request.cursor) {
    const cursor = z
      .object({ scope: z.string(), after: z.string(), objectId: z.string().optional() })
      .strict()
      .parse(JSON.parse(Buffer.from(request.cursor, 'base64url').toString()));
    if (cursor.scope !== scopeKey(scope) || cursor.objectId !== request.objectId)
      throw new HistoryCursorError('History access changed; reload this page.');
    after = cursor.after;
  }
  await service.flush();
  const page = await service.store.records.objectHistory(
    service.world.id,
    scope.actorId,
    after,
    request.objectId,
  );
  service.assertScope(scope);
  return {
    ok: true,
    entries: page.entries,
    ...(page.after
      ? {
          next: Buffer.from(
            JSON.stringify({
              scope: scopeKey(scope),
              after: page.after,
              objectId: request.objectId,
            }),
          ).toString('base64url'),
        }
      : {}),
  };
}

const cursorSchema = z
  .object({
    scope: z.string(),
    containerId: z.string(),
    revision: z.number().int().nonnegative(),
    rootRevision: z.number().int().nonnegative(),
    query: z.string(),
    source: z.string(),
    after: z.string(),
  })
  .strict();
/** Live pages restart on any inventory/custody revision. Search scans at most 200
 * permitted children; a continuation is returned even when that window has no match.
 * With `mergeSourceId`, the same windows list only lots that source can merge into,
 * across the whole container rather than the displayed page (docs/limits/objects.md#qu05).
 * Stale-page and access refusals use the readable 400 refusal so players see their
 * refresh guidance instead of a generic server failure. */
export function containerPage(
  service: WorldService,
  scope: RequestScope,
  request: { containerId?: string; query?: string; cursor?: string; mergeSourceId?: string },
): ContainerPage {
  service.assertScope(scope);
  const world = service.world,
    containerId = request.containerId ?? scope.actorId;
  const entity = world.entities[containerId];
  if (!entity || !canAccessContainer(world, scope.actorId, containerId))
    throw new HistoryCursorError('This container is unavailable.');
  const revision = entity.inventoryRevision ?? 0,
    rootRevision = world.entities[scope.actorId]!.inventoryRevision ?? 0;
  const query = (request.query ?? '').trim().toLocaleLowerCase(),
    source = request.mergeSourceId ?? '';
  if (source && itemFor(world, source)?.ownerId !== containerId)
    throw new HistoryCursorError('This lot changed. Refresh this container.');
  // A lot that ongoing work needs cannot be merged anywhere; list no targets.
  const sourceBlocked =
    !!source &&
    (!!inventoryWorkReason(world, scope.actorId, source) ||
      world.itemDefinitions[itemFor(world, source)!.definitionId]?.portable !== true);
  let after = '';
  if (request.cursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(request.cursor, 'base64url').toString('utf8')),
      );
    } catch {
      throw new HistoryCursorError('Invalid inventory page. Refresh this container.');
    }
    if (
      cursor.scope !== scopeKey(scope) ||
      cursor.containerId !== containerId ||
      cursor.revision !== revision ||
      cursor.rootRevision !== rootRevision ||
      cursor.query !== query ||
      cursor.source !== source
    )
      throw new HistoryCursorError('Contents or access changed. Refresh this container.');
    after = cursor.after;
  }
  const page = contentsQuery(world, containerId, scopeKey(scope), after);
  if (page.status !== 'complete')
    throw new Error('Contents are temporarily unavailable. Refresh before continuing.');
  const items: InventoryItemView[] = [],
    children = page.values;
  let scanned = 0,
    next: string | undefined;
  for (const id of sourceBlocked ? [] : children) {
    if (scanned === 200 || items.length === 40) {
      next = Buffer.from(
        JSON.stringify({
          scope: scopeKey(scope),
          containerId,
          revision,
          rootRevision,
          query,
          source,
          after,
        }),
      ).toString('base64url');
      break;
    }
    scanned++;
    after = id;
    const item = itemFor(world, id);
    if (
      item &&
      (source
        ? mergeTargetAvailable(world, scope.actorId, source, item.id)
        : !query ||
          world.itemDefinitions[item.definitionId]!.name.toLocaleLowerCase().includes(query))
    )
      items.push(inventoryItemView(service, scope, item));
  }
  return {
    ok: true,
    container: {
      id: containerId,
      name: entity.name,
      revision,
      ...(entity.container ? { restricted: !!entity.container.access } : {}),
      ...(entity.container
        ? {
            load: entity.container.load,
            capacity: world.itemDefinitions[entity.container.definitionPin.id]!.container!.capacity,
          }
        : {}),
    },
    breadcrumbs: objectAncestors(world, containerId)
      .reverse()
      .filter((parent) => canAccessContainer(world, scope.actorId, parent.id))
      .map((parent) => ({
        id: parent.id,
        name: parent.name,
        revision: parent.inventoryRevision ?? 0,
      })),
    // Merge lookups need no move destinations; skip the world-root scan.
    destinations: (source ? [] : worldRootEntities(world))
      .filter(
        (target) =>
          target.id !== scope.actorId && canAccessContainer(world, scope.actorId, target.id, true),
      )
      .map((target) => ({
        id: target.id,
        name: observerDescription(world, scope.actorId, target.id),
        revision: target.inventoryRevision ?? 0,
        depositOnly: !!target.actor,
      })),
    items,
    ...(next ? { next } : {}),
  };
}

/** The same permitted availability drives page refresh and item actions, including
 * silent capability restrictions and incapacitation without a public status label. */
export function canUseInventory(service: WorldService, scope: RequestScope): boolean {
  const player = service.world.entities[scope.actorId],
    actor = player?.actor;
  return (
    !!actor &&
    !service.paused &&
    actor.alive &&
    !actor.incapacitated &&
    !capabilityBlocked(service.world, player, 'actions') &&
    actor.participation?.phase !== 'inactive' &&
    service.currentScope(scope, 'play', true)
  );
}

/** Explicit permitted-child projection shared by the compact HUD and paginated browser. */
export function inventoryItemView(
  service: WorldService,
  scope: RequestScope,
  item: ItemInstance,
): InventoryItemView {
  const world = service.world,
    player = world.entities[scope.actorId]!,
    actor = player.actor!;
  const active = canUseInventory(service, scope);
  const action = (
    id: string,
    label: string,
    command: ActionOption['command'],
    possible = true,
    reason?: string,
  ): ActionOption => ({
    id,
    label,
    command,
    enabled: active && possible,
    ...(!active
      ? {
          reason: service.paused
            ? 'Resume the world to act.'
            : 'Current character control is required.',
        }
      : !possible && reason
        ? { reason }
        : {}),
  });

  const definition = world.itemDefinitions[item.definitionId]!;
  const actions: ActionOption[] = [];
  const workReason = inventoryWorkReason(world, player.id, item.id);
  if (definition.portable === true && accessiblePossession(world, player.id, item.id)) {
    const command = { type: 'drop' as const, itemId: item.id, quantity: item.quantity };
    const reason = dropItemReason(world, player, item.id, item.quantity);
    actions.push(action(`drop-${item.id}`, 'Drop', command, !reason, reason ?? undefined));
  }
  if (
    (definition.launcher || definition.melee || definition.gatheringTool) &&
    accessiblePossession(world, player.id, item.id)
  )
    actions.push(action(`equip-${item.id}`, 'Equip', { type: 'equip', itemId: item.id }));
  if (
    accessiblePossession(world, player.id, item.id) &&
    definition.nutrition &&
    hasWildernessNeeds(actor)
  )
    actions.push(action(`eat-${item.id}`, 'Eat one', { type: 'eat', itemId: item.id }));
  if (accessiblePossession(world, player.id, item.id) && item.definitionId === 'raw_meat')
    actions.push(action(`cook-${item.id}`, 'Cook one', { type: 'cook', itemId: item.id }));
  for (const [key, recipe] of Object.entries(NATIVE_PREPARATIONS))
    if (accessiblePossession(world, player.id, item.id) && recipe.input === item.definitionId)
      actions.push(
        action(
          `prepare-${key}`,
          key === 'fiber' ? 'Clean fibers' : 'Twist cord',
          { type: 'prepare', preparation: key as 'fiber' | 'cord' },
          item.quantity >= recipe.inputQuantity,
          `Requires ${recipe.inputQuantity}.`,
        ),
      );
  if (item.individuality === 'homogeneous' && item.quantity > 1)
    actions.push(
      action(
        `split-${item.id}`,
        'Split lot',
        {
          type: 'split-item',
          itemId: item.id,
          quantity: 1,
          targetId: item.ownerId,
          expectedRevision: item.revision!,
          placementRevision: item.placementRevision!,
          targetRevision: world.entities[item.ownerId]!.inventoryRevision ?? 0,
        },
        !workReason,
        workReason ?? undefined,
      ),
    );
  if (actor.equippedItemId === item.id)
    actions.push(
      action(
        `unequip-${item.id}`,
        'Unequip',
        {
          type: 'unequip',
          itemId: item.id,
          expectedRevision: item.revision!,
          placementRevision: item.placementRevision!,
        },
        !actor.action,
        'Finish current work first.',
      ),
    );
  const declaration = world.entities[item.id]!.declaredOwner;
  return {
    id: item.id,
    revision: item.revision ?? 0,
    placementRevision: item.placementRevision ?? 0,
    individual: item.individuality === 'individual',
    ...(item.container && canAccessContainer(world, scope.actorId, item.id)
      ? {
          container: {
            load: item.container.load,
            capacity: definition.container!.capacity,
            revision: world.entities[item.id]!.inventoryRevision ?? 0,
          },
        }
      : {}),
    ...(declaration
      ? {
          declaredOwner: {
            name: declaration.holderId
              ? observerDescription(world, scope.actorId, declaration.holderId)
              : 'No declared owner',
            revision: declaration.revision,
          },
        }
      : {}),
    definitionId: item.definitionId,
    name: definition.name,
    quantity: item.quantity,
    category:
      definition.launcher || definition.melee || definition.gatheringTool
        ? 'equipment'
        : definition.ammunition
          ? 'ammunition'
          : definition.properties.includes('food')
            ? 'food'
            : 'material',
    description: describePossession(item, definition, actor.equippedItemId === item.id),
    equipped: actor.equippedItemId === item.id,
    tags: [...definition.properties, ...(definition.portable ? ['Portable'] : [])],
    actions,
  };
}
