import {
  NATIVE_PREPARATIONS,
  canAccessContainer,
  accessiblePossession,
  inventoryWorkReason,
  mergeTargetAvailable,
  interactionPageQuery,
  membershipDependency,
  availableItemQuantity,
  itemMoveReason,
  itemPackingLoad,
  itemCharacteristics,
  effectivePosition,
  distance,
  seesEntity,
  canReachEntity,
  dropItemReason,
  applicableConsumption,
  observerDescription,
  itemFor,
  describePossession,
  contentsQuery,
  capabilityBlocked,
  custodian,
  objectAncestors,
  offerRecipientProblem,
  type ItemInstance,
} from '@open-legend/domain';
import type {
  ActionOption,
  InventoryItemView,
  ContainerPage,
  ObjectHistoryPage,
  InventoryDestination,
  InventoryDestinationPage,
  InventoryDestinationRequest,
} from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';
import { z } from 'zod';
import { HistoryCursorError } from './perceived-events.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

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
      location: containerLocation(service, scope, containerId),
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
    items,
    ...(next ? { next } : {}),
  };
}

function containerLocation(service: WorldService, scope: RequestScope, id: string): string {
  const world = service.world,
    rootId = custodian(world, id),
    root = world.entities[rootId]!;
  const enclosing = objectAncestors(world, id)
    .slice(1, -1)
    .filter((entry) => entry.container && canAccessContainer(world, scope.actorId, entry.id))
    .reverse()
    .map((entry) => observerDescription(world, scope.actorId, entry.id));
  const path = enclosing.length ? `In ${enclosing.join(' › ')} · ` : '';
  if (rootId === scope.actorId) return `${path}Carried by you`;
  if (root.actor) return `${path}Carried by ${observerDescription(world, scope.actorId, rootId)}`;
  const separation = distance(
    effectivePosition(world, scope.actorId),
    effectivePosition(world, id),
  );
  return `${path}On the ground · ${separation.toFixed(1)} m away`;
}

const destinationCursorSchema = z
  .object({
    binding: z.string(),
    phase: z.enum(['owned', 'spatial', 'granted', 'done']),
    after: z.string(),
    spatialAfter: z.number().int().min(-1),
    spatialRevision: z.number().int().nonnegative(),
    grantActorId: z.string(),
    grantRevision: z.number().int().nonnegative(),
  })
  .strict();
type DestinationCursor = z.infer<typeof destinationCursorSchema>;
// A continuation may contain an examined private child ID while discovering an explicit
// carried-bag grant. Seal that internal position instead of publishing a hidden identity.
// These are live pages: restart invalidates them and asks the player to refresh.
const destinationCursorKey = randomBytes(32);
function destinationCursor(value: DestinationCursor): string {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', destinationCursorKey, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
function readDestinationCursor(value: string): DestinationCursor {
  try {
    const bytes = Buffer.from(value, 'base64url'),
      decipher = createDecipheriv('aes-256-gcm', destinationCursorKey, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return destinationCursorSchema.parse(
      JSON.parse(
        Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
      ),
    );
  } catch {
    throw new HistoryCursorError('Invalid or expired destination page. Refresh destinations.');
  }
}

/** Lazy, permitted destination discovery. No ordinary contents page performs this read.
 * Only direct children and the existing spatial index are inspected; each response scans
 * at most 200 candidates and returns at most 40 choices, retaining honest continuation.
 * Cold rebuilding of the existing index and native selected-bag admission are separate
 * work: this window is a discovery bound, not a total native work/latency certificate. */
export function inventoryDestinationPage(
  service: WorldService,
  scope: RequestScope,
  request: InventoryDestinationRequest,
): InventoryDestinationPage {
  service.assertScope(scope);
  const world = service.world,
    actor = world.entities[scope.actorId]!,
    source = request.source;
  const item = source && itemFor(world, source.itemId);
  if (
    source &&
    (!item ||
      item.ownerId !== source.containerId ||
      !canAccessContainer(world, scope.actorId, source.containerId) ||
      item.revision !== source.revision ||
      item.placementRevision !== source.placementRevision ||
      (source.contentsRevision !== undefined &&
        (world.entities[item.id]?.inventoryRevision ?? 0) !== source.contentsRevision) ||
      (world.entities[source.containerId]?.inventoryRevision ?? 0) !== source.containerRevision ||
      !Number.isSafeInteger(source.quantity) ||
      source.quantity < 1 ||
      source.quantity > availableItemQuantity(world, source.itemId))
  )
    throw new HistoryCursorError(
      'The selected item or its source changed. Refresh before choosing a destination.',
    );
  const parentId = request.parentId ?? '',
    query = (request.query ?? '').trim().toLocaleLowerCase();
  if (parentId && !canAccessContainer(world, scope.actorId, parentId))
    throw new HistoryCursorError(
      'This destination is no longer reachable or accessible. Refresh destinations.',
    );
  const binding = JSON.stringify([
    scopeKey(scope),
    actor.inventoryRevision ?? 0,
    source,
    parentId,
    query,
    effectivePosition(world, scope.actorId),
    actor.spatial.bodyProfileId,
    actor.actor!.alive,
    membershipDependency(world, 'installed-capabilities').revision,
    world.map.spatial.revision,
    parentId ? (world.entities[parentId]!.inventoryRevision ?? 0) : 0,
  ]);
  const cursor: DestinationCursor = request.cursor
    ? readDestinationCursor(request.cursor)
    : {
        binding,
        phase: 'owned',
        after: '',
        spatialAfter: -1,
        spatialRevision: 0,
        grantActorId: '',
        grantRevision: 0,
      };
  if (
    cursor.binding !== binding ||
    (cursor.phase === 'granted' &&
      (world.entities[cursor.grantActorId]?.inventoryRevision ?? 0) !== cursor.grantRevision)
  )
    throw new HistoryCursorError('Destinations, contents or access changed. Refresh destinations.');
  const spatialRevision = membershipDependency(world, 'spatial-candidates').revision;
  if (cursor.phase === 'spatial' && cursor.spatialRevision !== spatialRevision)
    throw new HistoryCursorError('Nearby destinations changed. Refresh destinations.');
  const entries: InventoryDestination[] = [];
  let scanned = 0,
    unavailable = false,
    restarted = false;
  const sourceProblem =
    source &&
    item &&
    (inventoryWorkReason(world, scope.actorId, item.id) ??
      (world.itemDefinitions[item.definitionId]?.portable !== true
        ? 'This object cannot be moved by this action.'
        : undefined));
  const project = (id: string, recipient = false): InventoryDestination => {
    const target = world.entities[id]!,
      definition = target.container && world.itemDefinitions[target.container.definitionPin.id];
    const offer =
      recipient && source && item
        ? service.previewCommand(
            {
              type: 'handover',
              handoverOperation: 'offer',
              targetId: id,
              itemId: item.id,
              quantity: source.quantity,
            },
            scope.actorId,
          )
        : undefined;
    const reason =
      source && item
        ? sourceProblem ||
          (id === item.ownerId
            ? 'The selected item is already here.'
            : recipient
              ? offer && !offer.ok
                ? offer.message
                : undefined
              : itemMoveReason(world, item.id, id, source.quantity))
        : undefined;
    return {
      id,
      name: id === scope.actorId ? 'My possessions' : observerDescription(world, scope.actorId, id),
      location: recipient
        ? 'Nearby person · offer requires their acceptance'
        : containerLocation(service, scope, id),
      revision: target.inventoryRevision ?? 0,
      kind: recipient ? 'recipient' : 'container',
      openable: !recipient,
      ...(target.container && definition?.container
        ? { load: target.container.load, capacity: definition.container.capacity }
        : {}),
      ...(source
        ? {
            fit: reason
              ? ('blocked' as const)
              : recipient
                ? ('unknown' as const)
                : ('fits' as const),
          }
        : {}),
      ...(reason ? { reason } : {}),
    };
  };
  const add = (id: string, recipient = false) => {
    const entry = project(id, recipient);
    if (!query || `${entry.name} ${entry.location}`.toLocaleLowerCase().includes(query))
      entries.push(entry);
  };
  if (!parentId && !request.cursor) add(scope.actorId);
  const parent = parentId ? project(parentId) : undefined;
  let spatial: ReturnType<typeof interactionPageQuery> | undefined;
  let spatialIndex = 0;
  while (scanned < 200 && entries.length < 40 && cursor.phase !== 'done') {
    if (parentId || cursor.phase === 'owned' || cursor.phase === 'granted') {
      const owner = parentId || (cursor.phase === 'granted' ? cursor.grantActorId : scope.actorId);
      const page = contentsQuery(
        world,
        owner,
        scopeKey(scope),
        cursor.after,
        Math.min(201, 201 - scanned),
      );
      if (page.status !== 'complete') {
        unavailable = true;
        break;
      }
      let consumed = 0;
      for (const id of page.values) {
        if (scanned >= 200 || entries.length >= 40) break;
        scanned++;
        consumed++;
        cursor.after = id;
        if (world.entities[id]?.container && canAccessContainer(world, scope.actorId, id)) add(id);
      }
      if (consumed < page.values.length) break;
      if (parentId) cursor.phase = 'done';
      else {
        // Ordinary carried pages do not depend on unrelated moving animals. Once a
        // shared bag's bounded inspection finishes, restart changed nearby coverage
        // rather than reuse an ordinal from a different spatial snapshot.
        if (cursor.spatialRevision !== spatialRevision) {
          restarted = cursor.spatialRevision !== 0;
          cursor.spatialAfter = -1;
          cursor.spatialRevision = spatialRevision;
        }
        cursor.phase = 'spatial';
        cursor.after = '';
      }
    } else {
      spatial ??= interactionPageQuery(
        world,
        actor,
        world.itemHandling.reach,
        cursor.spatialAfter,
        Math.min(201, 201 - scanned),
      );
      if (spatial.status !== 'complete') {
        unavailable = true;
        break;
      }
      if (spatialIndex >= spatial.values.length) {
        cursor.phase = 'done';
        break;
      }
      const candidate = spatial.values[spatialIndex++]!;
      cursor.spatialAfter = candidate.after;
      scanned++;
      const target = candidate.value;
      if (target.id === scope.actorId) continue;
      if (target.actor) {
        if (
          !seesEntity(world, actor, target) ||
          !canReachEntity(world, actor, target, world.itemHandling.reach)
        )
          continue;
        if (
          source &&
          item &&
          accessiblePossession(world, scope.actorId, item.id) &&
          !offerRecipientProblem(world, actor, target)
        )
          add(target.id, true);
        cursor.phase = 'granted';
        cursor.grantActorId = target.id;
        cursor.grantRevision = target.inventoryRevision ?? 0;
      } else if (
        (target.container || target.kind === 'item-pile') &&
        canAccessContainer(world, scope.actorId, target.id)
      )
        add(target.id);
    }
  }
  return {
    ok: true,
    status: unavailable ? 'unavailable' : cursor.phase === 'done' ? 'complete' : 'partial',
    ...(unavailable
      ? { message: 'Destination discovery is temporarily unavailable. Refresh before continuing.' }
      : restarted
        ? {
            message:
              'Nearby things changed. The nearby search restarted; carried choices remain available.',
          }
        : {}),
    destinations: entries,
    ...(parent ? { container: parent } : {}),
    breadcrumbs: parentId
      ? objectAncestors(world, parentId)
          .reverse()
          .filter((entry) => canAccessContainer(world, scope.actorId, entry.id))
          .map((entry) => ({
            id: entry.id,
            name:
              entry.id === scope.actorId
                ? 'My possessions'
                : observerDescription(world, scope.actorId, entry.id),
          }))
      : [],
    ...(!unavailable && cursor.phase !== 'done' ? { next: destinationCursor(cursor) } : {}),
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
    applicableConsumption(world, player)
  ) {
    const command = { type: 'eat' as const, itemId: item.id };
    const preview = service.previewCommand(command, player.id);
    actions.push(
      action(
        `eat-${item.id}`,
        applicableConsumption(world, player)!.label,
        command,
        preview.ok,
        preview.ok ? undefined : preview.message,
      ),
    );
  }
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
  const characteristics = itemCharacteristics(world, definition).map(({ key: id, ...fact }) => ({
    id,
    ...fact,
  }));
  const equipped =
    actor.equippedItemId &&
    actor.equippedItemId !== item.id &&
    (definition.launcher || definition.melee || definition.gatheringTool) &&
    accessiblePossession(world, scope.actorId, actor.equippedItemId)
      ? itemFor(world, actor.equippedItemId)
      : undefined;
  const equippedDefinition = equipped && world.itemDefinitions[equipped.definitionId];
  const counterpart = equippedDefinition
    ? itemCharacteristics(world, equippedDefinition).map(({ key: id, ...fact }) => ({
        id,
        ...fact,
      }))
    : [];
  const comparable = counterpart.some((other) =>
    characteristics.some((fact) => fact.id === other.id && fact.unit === other.unit),
  );
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
    characteristics,
    ...(equipped && equippedDefinition && comparable
      ? {
          comparison: {
            id: equipped.id,
            name: equippedDefinition.name,
            characteristics: counterpart,
          },
        }
      : {}),
    availableQuantity: availableItemQuantity(world, item.id),
    ...(!item.container || canAccessContainer(world, scope.actorId, item.id)
      ? { packingLoad: itemPackingLoad(world, item.id, 1) }
      : {}),
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
