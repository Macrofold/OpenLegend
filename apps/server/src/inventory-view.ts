import {
  nativeInventoryActions,
  nativeActionIcon,
  activityRequestHost,
  currentInventoryInspection,
  visionRadius,
  canAccessContainer,
  accessiblePossession,
  inventoryWorkReason,
  mergeTargetAvailable,
  interactionPageQuery,
  membershipDependency,
  spatialCandidateMembershipKey,
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
  observerName,
  itemFor,
  describePossession,
  contentsQuery,
  capabilityBlocked,
  custodian,
  objectAncestors,
  targetApproachPoint,
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
  InventoryAccessView,
  EntityView,
} from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';
import { z } from 'zod';
import { HistoryCursorError } from './perceived-events.js';
import { countMetric } from './performance.js';
import { createHash } from 'node:crypto';
import { sealCursor, openCursor } from './scoped-cursor.js';

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

/** Call only for an already perceived world root; never project private bag descendants. */
export function inventoryStorageHint(
  service: WorldService,
  scope: RequestScope,
  id: string,
): EntityView['storage'] {
  const target = service.world.entities[id];
  if (
    !target ||
    target.retirement ||
    target.placement?.mode !== 'world' ||
    !(target.container || target.kind === 'item-pile' || target.remains)
  )
    return;
  return {
    containerId: id,
    placementRevision: target.placement.revision,
    ...(canAccessContainer(service.world, scope.actorId, id)
      ? { revision: target.inventoryRevision ?? 0 }
      : {}),
  };
}

/** Exact selected-target read: inspection never walks or exposes inaccessible contents. */
export function inventoryAccess(
  service: WorldService,
  scope: RequestScope,
  request: { containerId: string; approach?: boolean },
): InventoryAccessView {
  service.assertScope(scope);
  const world = service.world,
    actor = world.entities[scope.actorId],
    target = world.entities[request.containerId];
  const unavailable: InventoryAccessView = {
    ok: false,
    scope: scopeKey(scope),
    status: 'unavailable',
    message: 'This container is unavailable. Refresh after its location or access changes.',
  };
  if (
    !actor ||
    !target ||
    target.retirement ||
    !(target.id === actor.id || target.container || target.kind === 'item-pile' || target.remains)
  )
    return unavailable;
  const root = objectAncestors(world, target.id).at(-1);
  if (!root || root.placement?.mode !== 'world') return unavailable;
  const accessible = canAccessContainer(world, actor.id, target.id);
  const visibleExterior =
    (target.placement?.mode === 'world' && seesEntity(world, actor, target)) ||
    ((root.kind === 'item-pile' || root.remains) &&
      target.placement?.mode === 'contained' &&
      target.placement.parentEntityId === root.id &&
      seesEntity(world, actor, root));
  if (!accessible && !visibleExterior) return unavailable;
  const container = {
    id: target.id,
    name: observerDescription(world, scope.actorId, target.id),
    location: containerLocation(service, scope, target.id),
    rootId: root.id,
    placementRevision: root.placement.revision,
    geometryRevision: world.map.spatial.revision,
  };
  if (accessible)
    return {
      ok: true,
      scope: scopeKey(scope),
      status: 'ready',
      container: { ...container, revision: target.inventoryRevision ?? 0 },
    };
  if (canReachEntity(world, actor, root, world.itemHandling.reach))
    return { ...unavailable, container, message: 'You cannot access this container.' };
  // Native stance selection uses this world's handling reach and current geometry. It is
  // requested only by Walk to and open, never for every visible object or view update.
  const stance = request.approach
    ? targetApproachPoint(world, actor, root, world.itemHandling.reach)
    : null;
  return {
    ok: true,
    scope: scopeKey(scope),
    status: 'out-of-reach',
    container,
    ...(stance ? { stance } : {}),
    message:
      request.approach && !stance
        ? 'No approach is currently available. Refresh the target before trying again.'
        : 'Move within reach, then recheck access before opening.',
  };
}

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
  const items: ItemInstance[] = [],
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
      items.push(item);
  }
  return {
    ok: true,
    container: {
      id: containerId,
      ...observerName(world, scope.actorId, entity.id),
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
        ...observerName(world, scope.actorId, parent.id),
        revision: parent.inventoryRevision ?? 0,
      })),
    items: inventoryItemsView(service, scope, items),
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
  if (root.actor && !root.remains)
    return `${path}Carried by ${observerDescription(world, scope.actorId, rootId, 'definite')}`;
  const separation = distance(
    effectivePosition(world, scope.actorId),
    effectivePosition(world, id),
  );
  return `${path}On the ground · ${separation.toFixed(1)} m away`;
}

const destinationCursorSchema = z
  .object({
    binding: z.string(),
    phase: z.enum(['owned', 'spatial', 'granted', 'ground', 'done']),
    after: z.string(),
    spatialAfter: z.number().int().min(-1),
    spatialRevision: z.string(),
    grantActorId: z.string(),
    grantRevision: z.number().int().nonnegative(),
  })
  .strict();
type DestinationCursor = z.infer<typeof destinationCursorSchema>;
// A continuation may contain an examined private child ID while discovering an explicit
// carried-bag grant. Seal that internal position instead of publishing a hidden identity.
// These are live pages: restart invalidates them and asks the player to refresh.
const destinationCursor = sealCursor;
function readDestinationCursor(value: string): DestinationCursor {
  try {
    return destinationCursorSchema.parse(openCursor(value));
  } catch {
    throw new HistoryCursorError('Invalid or expired destination page. Refresh destinations.');
  }
}

/** Same disclosure owner for activity search, exact refresh and explicit approach. */
export function activityStorageReader(
  service: WorldService,
  scope: RequestScope,
  activity: { family: string; field: string },
): (id: string) => InventoryDestination | undefined {
  service.assertScope(scope);
  const world = service.world,
    actor = world.entities[scope.actorId]!;
  const host = activityRequestHost(world, activity.family);
  const field = host?.definition.requests?.find((entry) => entry.id === activity.family)?.fields[
    activity.field
  ];
  if (field?.discovery?.source !== 'storage')
    throw new HistoryCursorError('Choose an installed storage field.');
  return (id) => {
    const target = world.entities[id];
    if (!target || !(target.container || id === scope.actorId)) return;
    const own = custodian(world, id) === scope.actorId;
    const reachable = canAccessContainer(world, scope.actorId, id);
    const inspection = currentInventoryInspection(world, scope.actorId);
    const observedChild =
      inspection?.itemIds.includes(id) &&
      target.placement?.mode === 'contained' &&
      inspection.containerId === target.placement.parentEntityId;
    const root = objectAncestors(world, id).at(-1)!;
    const groundAppearance =
      target.placement?.mode === 'contained' &&
      target.placement.parentEntityId === root.id &&
      (root.kind === 'item-pile' || root.remains) &&
      seesEntity(world, actor, root);
    const visible =
      (target.placement?.mode === 'world' && seesEntity(world, actor, target)) || groundAppearance;
    const granted =
      target.placement?.mode === 'contained' &&
      world.entities[target.placement.parentEntityId]?.actor &&
      target.container?.access?.actors.includes(scope.actorId) &&
      reachable;
    if (!(id === scope.actorId || (own && reachable) || visible || observedChild || granted))
      return;
    const choice = host?.requestChoice?.(world, scope.actorId, activity.family, activity.field, id);
    if (!choice) return;
    const evidenced = own || inspection?.containerId === id;
    const allowed = reachable && evidenced;
    return {
      id,
      ...observerName(world, scope.actorId, id),
      name: choice.label,
      location: containerLocation(service, scope, id),
      revision: target.inventoryRevision ?? 0,
      kind: 'container',
      openable: reachable && evidenced,
      accessible: allowed,
      needsApproach: visible && !canReachEntity(world, actor, root, world.itemHandling.reach),
      canInspect: reachable,
      needsInspection: reachable && !evidenced,
      ...(reachable && evidenced && target.container
        ? {
            load: target.container.load,
            capacity: world.itemDefinitions[target.container.definitionPin.id]!.container!.capacity,
          }
        : {}),
      ...(!allowed
        ? {
            reason: reachable
              ? 'Inspect contents before reviewing this selection.'
              : canReachEntity(world, actor, root, world.itemHandling.reach)
                ? 'Contents are not accessible here. Refresh after access changes.'
                : 'Approach, then recheck access and inspect contents. Private contents remain unavailable.',
          }
        : {}),
    };
  };
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
  if (request.activity && source)
    throw new HistoryCursorError('Activity storage selection has no transfer source.');
  const storage = request.activity && activityStorageReader(service, scope, request.activity);
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
  if (
    parentId &&
    (!canAccessContainer(world, scope.actorId, parentId) ||
      (request.activity && !storage?.(parentId)?.openable))
  )
    throw new HistoryCursorError(
      'This destination is no longer reachable or accessible. Refresh destinations.',
    );
  const binding = createHash('sha256')
    .update(
      JSON.stringify([
        scopeKey(scope),
        actor.inventoryRevision ?? 0,
        source,
        request.activity,
        request.activity ? currentInventoryInspection(world, scope.actorId) : null,
        request.activity ? world.moduleManifest.activityHosts : null,
        parentId,
        query,
        effectivePosition(world, scope.actorId),
        actor.spatial.bodyProfileId,
        visionRadius(world, actor),
        actor.actor!.alive,
        membershipDependency(world, 'installed-capabilities').revision,
        world.map.spatial.revision,
        parentId ? (world.entities[parentId]!.inventoryRevision ?? 0) : 0,
      ]),
    )
    .digest('hex');
  const cursor: DestinationCursor = request.cursor
    ? readDestinationCursor(request.cursor)
    : {
        binding,
        phase: 'owned',
        after: '',
        spatialAfter: -1,
        spatialRevision: '',
        grantActorId: '',
        grantRevision: 0,
      };
  if (
    cursor.binding !== binding ||
    ((cursor.phase === 'granted' || cursor.phase === 'ground') &&
      (world.entities[cursor.grantActorId]?.inventoryRevision ?? 0) !== cursor.grantRevision)
  )
    throw new HistoryCursorError('Destinations, contents or access changed. Refresh destinations.');
  let spatialRevision: string | undefined;
  const spatialMembership = () =>
    (spatialRevision ??= createHash('sha256')
      .update(
        spatialCandidateMembershipKey(
          world,
          actor,
          request.activity ? visionRadius(world, actor) : world.itemHandling.reach,
        ),
      )
      .digest('hex'));
  if (cursor.phase === 'spatial' && cursor.spatialRevision !== spatialMembership())
    throw new HistoryCursorError('Nearby destinations changed. Refresh destinations.');
  const entries: InventoryDestination[] = [];
  let scanned = 0,
    materialized = 0,
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
      ...(id === scope.actorId
        ? { name: 'My possessions', nameForm: 'proper' as const }
        : observerName(world, scope.actorId, id)),
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
    const entry = request.activity ? storage?.(id) : project(id, recipient);
    if (!entry) return;
    if (!query || `${entry.name} ${entry.location}`.toLocaleLowerCase().includes(query))
      entries.push(entry);
  };
  if (!parentId && !request.cursor) add(scope.actorId);
  const parent = parentId
    ? request.activity
      ? storage?.(parentId)
      : project(parentId)
    : undefined;
  let spatial: ReturnType<typeof interactionPageQuery> | undefined;
  let spatialIndex = 0;
  while (scanned < 200 && entries.length < 40 && cursor.phase !== 'done') {
    if (
      parentId ||
      cursor.phase === 'owned' ||
      cursor.phase === 'granted' ||
      cursor.phase === 'ground'
    ) {
      const owner =
        parentId ||
        (cursor.phase === 'granted' || cursor.phase === 'ground'
          ? cursor.grantActorId
          : scope.actorId);
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
      materialized += page.values.length;
      let consumed = 0;
      for (const id of page.values) {
        if (scanned >= 200 || entries.length >= 40) break;
        scanned++;
        consumed++;
        cursor.after = id;
        if (
          world.entities[id]?.container &&
          (cursor.phase === 'ground' || canAccessContainer(world, scope.actorId, id))
        )
          add(id);
      }
      if (consumed < page.values.length) break;
      if (parentId) cursor.phase = 'done';
      else {
        // Ordinary carried pages do not depend on unrelated moving animals. Once a
        // shared bag's bounded inspection finishes, restart changed nearby coverage
        // rather than reuse an ordinal from a different spatial snapshot.
        if (cursor.spatialRevision !== spatialMembership()) {
          restarted = cursor.spatialRevision !== '';
          cursor.spatialAfter = -1;
          cursor.spatialRevision = spatialMembership();
        }
        cursor.phase = 'spatial';
        cursor.after = '';
      }
    } else {
      if (!spatial) {
        spatial = interactionPageQuery(
          world,
          actor,
          request.activity ? visionRadius(world, actor) : world.itemHandling.reach,
          cursor.spatialAfter,
          Math.min(201, 201 - scanned),
        );
        if (spatial.status === 'complete') materialized += spatial.values.length;
      }
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
      // A corpse retains its actor component; its storage follows native remains access.
      if (request.activity && (!target.actor || target.remains)) {
        if (!seesEntity(world, actor, target)) continue;
        if (target.container) add(target.id);
        if (target.kind === 'item-pile' || target.remains) {
          cursor.phase = 'ground';
          cursor.grantActorId = target.id;
          cursor.grantRevision = target.inventoryRevision ?? 0;
          cursor.after = '';
        }
      } else if (target.actor && !target.remains) {
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
        (target.container || target.kind === 'item-pile' || target.remains) &&
        canAccessContainer(world, scope.actorId, target.id)
      )
        add(target.id);
    }
  }
  countMetric('discovery.storageExamined', scanned);
  countMetric('discovery.storageMaterialized', materialized);
  countMetric('discovery.storageReturned', entries.length);
  return {
    ok: true,
    scope: scopeKey(scope),
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
  return projectInventoryItem(service, scope, item, (command) =>
    service.previewCommand(command, scope.actorId),
  );
}

/** Split lots can offer the same native preparation. Reuse its admission result
 * only within this synchronous batch, with the same world and controlling actor. */
export function inventoryItemsView(
  service: WorldService,
  scope: RequestScope,
  items: ItemInstance[],
): InventoryItemView[] {
  const previews = new Map<string, ReturnType<WorldService['previewCommand']>>();
  const preview = (command: ActionOption['command']) => {
    const key = JSON.stringify(command);
    let result = previews.get(key);
    if (!result) {
      result = service.previewCommand(command, scope.actorId);
      previews.set(key, result);
    }
    return result;
  };
  return items.map((item) => projectInventoryItem(service, scope, item, preview));
}

function projectInventoryItem(
  service: WorldService,
  scope: RequestScope,
  item: ItemInstance,
  preview: (command: ActionOption['command']) => ReturnType<WorldService['previewCommand']>,
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
    icon: nativeActionIcon(command.type),
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
    const availability = preview(command);
    actions.push(
      action(
        `eat-${item.id}`,
        applicableConsumption(world, player)!.label,
        command,
        availability.ok,
        availability.ok ? undefined : availability.message,
      ),
    );
  }
  // Cooking needs an exact perceived fire. Explore uses and targets offers that
  // choice rather than dispatching a shortcut that silently picks a world fire.
  if (accessiblePossession(world, player.id, item.id))
    for (const option of nativeInventoryActions(world, item)) {
      const availability = preview(option.command);
      actions.push(
        action(option.id, option.label, option.command, availability.ok, availability.message),
      );
    }
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
    ...(definition.icon ? { icon: definition.icon } : {}),
    name: definition.name,
    nameForm: definition.nameForm,
    indefiniteArticle: definition.indefiniteArticle,
    quantity: item.quantity,
    characteristics,
    ...(equipped && equippedDefinition && comparable
      ? {
          comparison: {
            id: equipped.id,
            name: equippedDefinition.name,
            nameForm: equippedDefinition.nameForm,
            indefiniteArticle: equippedDefinition.indefiniteArticle,
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
