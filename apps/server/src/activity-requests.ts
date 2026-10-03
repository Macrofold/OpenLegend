import {
  activityRequestHost,
  accessiblePossession,
  canAccessContainer,
  currentInventoryInspection,
  inspectedContainer,
  custodian,
  objectAncestors,
  seesEntity,
  effectivePosition,
  distance,
  targetApproachPoint,
  contentsQuery,
  interactionPageQuery,
  visionRadius,
  membershipDependency,
  spatialCandidateMembershipKey,
  activityRequestDescriptors,
  clockDeadline,
  namedClockTimes,
  type WorldState,
} from '@open-legend/domain';
import type {
  ActivityRequestsView,
  ActivityChoicePage,
  ActivityChoice,
} from '@open-legend/protocol';
import { countMetric } from './performance.js';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { activityStorageReader } from './inventory-view.js';
import { sealCursor, openCursor } from './scoped-cursor.js';
import { HistoryCursorError } from './perceived-events.js';
import { scopeKey, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';

/** The ordinary result contains no detailed child-step debugger or another person's work. */
export function activityStatus(
  service: WorldService,
  scope: RequestScope,
): Pick<ActivityRequestsView, 'ok' | 'scope' | 'simTime' | 'status'> {
  service.assertScope(scope);
  return {
    ok: true,
    scope: scopeKey(scope),
    simTime: service.world.simTime,
    status: projectActivityStatus(service.world, scope.actorId),
  };
}
export function projectActivityStatus(
  world: WorldState,
  actorId: string,
): ActivityRequestsView['status'] {
  const plan = world.entities[actorId]?.actor?.agency.plan,
    execution = plan?.activity;
  if (!execution) return undefined;
  const waiting =
    plan!.status === 'active' &&
    !world.entities[actorId]!.actor!.action &&
    execution.pending.at(-1)?.node.kind === 'wait'
      ? execution.pending.at(-1)!.node.name
      : undefined;
  return {
    name: execution.request?.name ?? 'My selected method',
    status: waiting ? 'waiting' : plan!.status,
    ...(execution.reason || waiting ? { reason: execution.reason ?? waiting } : {}),
    ...(execution.control
      ? {
          spent: execution.spent ?? 0,
          attempts: execution.attempts ?? 0,
          interrupted: execution.interrupted ?? false,
          deadline: execution.control.deadline,
        }
      : {}),
  };
}
export function activityRequests(service: WorldService, scope: RequestScope): ActivityRequestsView {
  const requests = activityRequestDescriptors(service.world);
  const timing = requests
    .flatMap((request) => Object.values(request.fields))
    .filter(
      (field) =>
        field.type === 'time' &&
        field.minimumDuration !== undefined &&
        field.maximumDuration !== undefined,
    );
  return {
    ...activityStatus(service, scope),
    requests,
    ...(timing.length
      ? {
          timeOptions: {
            minimumDuration: Math.max(...timing.map((field) => field.minimumDuration!)),
            maximumDuration: Math.min(...timing.map((field) => field.maximumDuration!)),
            namedDeadlines: namedClockTimes(service.world).map((name) => ({
              name,
              at: clockDeadline(service.world, name)!,
            })),
          },
        }
      : {}),
  };
}

export interface ActivityChoiceRequest {
  family: string;
  field: string;
  query?: string;
  cursor?: string;
  sourceId?: string;
  selectedId?: string;
  witnessId?: string;
  approach?: boolean;
}
const choiceCursor = z
  .object({
    binding: z.string(),
    phase: z.enum(['owned', 'spatial', 'done']),
    parent: z.string(),
    after: z.string(),
    spatialAfter: z.number().int().min(-1),
  })
  .strict();

/** Role filtering happens before counting returned choices. Character knowledge comes
 * from accessible possessions, sight, or the exact current admitted inspection page.
 * Unrelated needs/clock changes do not invalidate continuation. Warm pages use the
 * current derived index; its cold membership preparation is counted separately. */
export function activityChoicePage(
  service: WorldService,
  scope: RequestScope,
  request: ActivityChoiceRequest,
): ActivityChoicePage {
  service.assertScope(scope);
  const world = service.world,
    actor = world.entities[scope.actorId]!;
  const host = activityRequestHost(world, request.family);
  const field = host?.definition.requests?.find((entry) => entry.id === request.family)?.fields[
    request.field
  ];
  if (!host?.requestChoice || !field?.discovery)
    throw new HistoryCursorError('Choose an installed searchable activity field.');
  const source = field.discovery.source;
  if (
    (request.sourceId && !field.discovery.sourceField) ||
    (request.witnessId && source !== 'materials') ||
    (request.approach && (source !== 'storage' || !request.selectedId)) ||
    (request.selectedId && request.cursor)
  )
    throw new HistoryCursorError('This activity field does not support that search mode.');
  const storage = source === 'storage' ? activityStorageReader(service, scope, request) : undefined;
  const inspection = currentInventoryInspection(world, scope.actorId);
  const selectedTarget =
    request.selectedId && Object.hasOwn(world.entities, request.selectedId)
      ? world.entities[request.selectedId]
      : undefined;
  const binding = createHash('sha256')
    .update(
      JSON.stringify([
        scopeKey(scope),
        request.family,
        request.field,
        host.definition,
        request.sourceId,
        (request.query ?? '').trim().toLocaleLowerCase(),
        actor.inventoryRevision,
        actor.placement,
        actor.spatial.bodyProfileId,
        actor.actor?.alive,
        visionRadius(world, actor),
        world.map.spatial.revision,
        membershipDependency(world, 'installed-capabilities').revision,
        source === 'spatial' && !request.selectedId
          ? spatialCandidateMembershipKey(world, actor, visionRadius(world, actor))
          : null,
        source !== 'spatial' ? inspection : null,
        selectedTarget && !selectedTarget.retirement
          ? objectAncestors(world, selectedTarget.id).map((entity) => [
              entity.id,
              entity.inventoryRevision,
              entity.placement,
              entity.container?.access,
            ])
          : null,
        request.sourceId ? world.entities[request.sourceId]?.inventoryRevision : null,
      ]),
    )
    .digest('hex');
  const evidence = binding;
  const result: ActivityChoicePage = {
    ok: true,
    scope: scopeKey(scope),
    status: 'complete',
    choices: [],
    evidence,
  };
  const permitted = (id: string) => {
    const target = world.entities[id];
    return (
      !!target &&
      !target.retirement &&
      (id === actor.id ||
        accessiblePossession(world, actor.id, id) ||
        (target.placement?.mode === 'world' && seesEntity(world, actor, target)) ||
        inspection?.containerId === id ||
        (inspection?.containerId === request.sourceId && inspection?.itemIds.includes(id)))
    );
  };
  const project = (id: string): ActivityChoice | undefined => {
    if (source === 'storage') {
      const destination = storage?.(id);
      return destination
        ? {
            id,
            label: destination.name,
            kind: 'entity',
            roles: [request.field],
            accessible: destination.accessible === true,
            location: destination.location,
            reason: destination.reason,
            needsApproach: destination.needsApproach,
            needsInspection: destination.needsInspection,
            canInspect: destination.canInspect,
          }
        : undefined;
    }
    if (!permitted(id)) return;
    if (source === 'materials') {
      const selected = request.sourceId && world.entities[request.sourceId];
      if (!selected) return;
      const own = custodian(world, selected.id) === actor.id;
      if (selected.resource) {
        if (id !== selected.id || !seesEntity(world, actor, selected)) return;
      } else if (own) {
        if (
          !accessiblePossession(world, actor.id, id) ||
          !objectAncestors(world, id).some((entry) => entry.id === selected.id)
        )
          return;
      } else if (inspection?.containerId !== selected.id || !inspection?.itemIds.includes(id))
        return;
    }
    const choice = host.requestChoice!(world, actor.id, request.family, request.field, id);
    if (!choice) return;
    const separation = distance(effectivePosition(world, actor.id), effectivePosition(world, id));
    return {
      ...choice,
      ...(source === 'materials' ? { witnessId: id } : {}),
      distance: separation,
      location: accessiblePossession(world, actor.id, id)
        ? 'Carried by you'
        : `${source === 'materials' && inspection?.itemIds.includes(id) ? 'In inspected supply' : 'In sight'} · ${separation.toFixed(1)} m away · ${id}`,
    };
  };
  if (request.selectedId) {
    const selected = project(
      source === 'materials' ? (request.witnessId ?? request.sourceId ?? '') : request.selectedId,
    );
    if (selected?.id === request.selectedId) result.selected = selected;
    if (request.approach && selected && source === 'storage') {
      const target = world.entities[selected.id]!;
      const point = targetApproachPoint(
        world,
        actor,
        objectAncestors(world, target.id).at(-1)!,
        world.itemHandling.reach,
      );
      if (point) result.stance = point;
      else
        result.message =
          'No approach is currently available. Refresh the target before trying again.';
    }
    if (result.selected && source === 'storage' && inspection?.containerId === request.selectedId) {
      const inspected = inspectedContainer(world, actor.id)!;
      result.inspection = {
        ...inspection,
        containerId: inspected.id,
        items: inspected.items.map((item) => ({
          id: item.id,
          name: world.itemDefinitions[item.definitionId]!.name,
          quantity: item.quantity,
        })),
      };
    }
    return result;
  }
  if (source === 'storage')
    throw new HistoryCursorError('Use the shared storage search for this field.');
  const query = (request.query ?? '').trim().toLocaleLowerCase();
  let cursor: z.infer<typeof choiceCursor>;
  try {
    cursor = request.cursor
      ? choiceCursor.parse(openCursor(request.cursor))
      : {
          binding,
          phase: source === 'spatial' ? 'spatial' : 'owned',
          parent: request.sourceId ?? actor.id,
          after: '',
          spatialAfter: -1,
        };
  } catch {
    return { ...result, status: 'stale', message: 'This search page expired. Refresh the search.' };
  }
  if (cursor.binding !== binding)
    return {
      ...result,
      status: 'stale',
      message: 'Objects, access or inspection changed. Refresh the search.',
    };
  const add = (id: string) => {
    const choice = project(id);
    if (
      choice &&
      (!query || `${choice.label} ${choice.location ?? ''}`.toLocaleLowerCase().includes(query)) &&
      !result.choices.some((entry) => entry.id === choice.id)
    )
      result.choices.push(choice);
  };
  const recordWork = (examined: number, materialized: number) => {
    countMetric('discovery.activityExamined', examined);
    countMetric('discovery.activityMaterialized', materialized);
    countMetric('discovery.activityReturned', result.choices.length);
  };
  if (source === 'materials') {
    const selected = request.sourceId && world.entities[request.sourceId];
    if (!selected || !permitted(selected.id))
      return {
        ...result,
        status: 'unavailable',
        message: 'Choose a currently permitted source before choosing its material.',
      };
    if (selected.resource) {
      add(selected.id);
      recordWork(1, 1);
      return result;
    }
    if (custodian(world, selected.id) !== actor.id) {
      if (inspection?.containerId !== selected.id)
        return {
          ...result,
          status: 'unavailable',
          message: 'Inspect the selected supply before choosing its material.',
        };
      for (const id of inspection.itemIds) add(id);
      recordWork(inspection.itemIds.length, inspection.itemIds.length);
      return {
        ...result,
        ...(inspection.more
          ? {
              message:
                'Only this admitted inspection page is searched. Inspect the next contents page for more materials.',
            }
          : {}),
      };
    }
    if (!canAccessContainer(world, actor.id, selected.id))
      return {
        ...result,
        status: 'unavailable',
        message: 'The selected supply is no longer accessible.',
      };
  }
  let scanned = 0,
    materialized = 0;
  if (cursor.phase === 'owned') {
    // Walk indexed children and recover ancestors from canonical placement. Keeping
    // only the current parent/child avoids a depth-sized cursor exceeding wire limits.
    const root = request.sourceId ?? actor.id;
    let parent = cursor.parent;
    while (scanned < 200 && result.choices.length < 40) {
      const page = contentsQuery(world, parent, scopeKey(scope), cursor.after, 1);
      if (page.status !== 'complete')
        return {
          ...result,
          status: 'unavailable',
          message: 'Supply discovery is unavailable. Refresh before continuing.',
        };
      materialized += page.values.length;
      const id = page.values[0];
      if (!id) {
        if (parent === root) {
          cursor.phase = 'done';
          break;
        }
        cursor.after = parent;
        const placement = world.entities[parent]?.placement;
        if (!placement || placement.mode === 'world')
          return { ...result, status: 'stale', message: 'Supply moved. Refresh the search.' };
        parent = cursor.parent = placement.parentEntityId;
        continue;
      }
      scanned++;
      cursor.after = id;
      add(id);
      if (world.entities[id]?.container && canAccessContainer(world, actor.id, id)) {
        parent = cursor.parent = id;
        cursor.after = '';
      }
    }
  } else if (cursor.phase === 'spatial') {
    const page = interactionPageQuery(
      world,
      actor,
      visionRadius(world, actor),
      cursor.spatialAfter,
      201,
    );
    if (page.status !== 'complete')
      return {
        ...result,
        status: 'unavailable',
        message: 'Visible-object discovery is unavailable. Refresh before continuing.',
      };
    materialized += page.values.length;
    for (const candidate of page.values) {
      if (scanned === 200 || result.choices.length === 40) break;
      scanned++;
      cursor.spatialAfter = candidate.after;
      add(candidate.value.id);
    }
    if (scanned === page.values.length) cursor.phase = 'done';
  }
  recordWork(scanned, materialized);
  result.status = cursor.phase === 'done' ? 'complete' : 'partial';
  if (cursor.phase !== 'done') result.next = sealCursor(cursor);
  return result;
}
