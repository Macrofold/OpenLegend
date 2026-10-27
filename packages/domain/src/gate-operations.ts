import { physicalIntersections, solidOverlap } from '@open-legend/spatial';
import type { Action, Outcome, WorldState } from './types.js';
import type { GateUseIntent, GateWork } from './boundary-types.js';
import type { CampAssetPermission } from './camp-asset-permissions.js';
import { gateUsePermission } from './camp-asset-permissions.js';
import { entityGet } from './entity-collection.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { outcome } from './events.js';
import { activeAssemblyEdit } from './assemblies.js';
import { canHandleItems } from './item-handling.js';
import { seesEntity, pointVisionQuery } from './perception.js';
import {
  bodyProfile,
  bodySpace,
  isAssemblyPlacement,
  spatialMap,
  worldPosition,
} from './spatial-state.js';
import {
  assemblySite,
  boundaryGateHandle,
  boundaryGateLayout,
  boundaryGateSweep,
  boundarySectionFrame,
  boundarySolidFromBoxes,
  localPoint,
} from './assembly-geometry.js';
import {
  findPhysicalWorkApproach,
  physicalWorkPointAvailable,
  nearbyBodyEntities,
  type PhysicalWorkPoint,
} from './spatial.js';
import { prospectiveWork, type ProspectiveWork } from './action-capabilities.js';
import { MOVEMENT } from '@open-legend/spatial';

export function validGateUseIntent(value: unknown): value is GateUseIntent {
  return (
    hasRecordFields(
      value,
      [
        'assemblyId',
        'itemId',
        'operation',
        'familyId',
        'familyVersion',
        'familyDigest',
        'expectedRevision',
      ],
      ['side'],
    ) &&
    ['assemblyId', 'itemId', 'familyId', 'familyDigest'].every((key) =>
      isSafeRecordId(value[key]),
    ) &&
    typeof value.operation === 'string' &&
    ['open', 'close', 'bar', 'unbar'].includes(value.operation) &&
    Number.isSafeInteger(value.familyVersion) &&
    Number(value.familyVersion) > 0 &&
    Number.isSafeInteger(value.expectedRevision) &&
    Number(value.expectedRevision) >= 0 &&
    (value.side === undefined || value.side === 'inside' || value.side === 'outside')
  );
}
export function gateUseContext(world: WorldState, intent: GateUseIntent) {
  const root = entityGet(world.entities, intent.assemblyId),
    component = root?.assembly,
    family = world.assemblyFamilies?.[intent.familyId],
    gate =
      component?.implementation === 'grounded-panel-boundary'
        ? component.gates[intent.itemId]
        : undefined,
    site = root && assemblySite(root);
  if (
    !root ||
    component?.implementation !== 'grounded-panel-boundary' ||
    component.retired ||
    family?.implementation !== component.implementation ||
    !gate ||
    !site ||
    component.revision !== intent.expectedRevision ||
    !sameDefinitionPin(component.family, definitionPin(family)) ||
    !sameDefinitionPin(gate.slide, component.family) ||
    !sameDefinitionPin(
      { id: intent.familyId, version: intent.familyVersion, digest: intent.familyDigest },
      component.family,
    )
  )
    return;
  const post = entityGet(world.entities, gate.postIds[0])?.placement,
    to = entityGet(world.entities, gate.postIds[1])?.placement,
    frame = boundarySectionFrame(world, root, gate.postIds[0], gate.postIds[1]);
  if (!isAssemblyPlacement(post) || !isAssemblyPlacement(to) || !frame) return;
  const anchor = localPoint(site, root.spatial.heading, post.local.x, post.local.z, post.local.y),
    layout = boundaryGateLayout(
      family.geometry,
      post.local,
      to.local,
      root.spatial.heading,
      gate.position,
      family.presentation.bindingSize,
    );
  return layout
    ? { root, component, family, gate, site, anchor, layout, heading: frame.heading }
    : undefined;
}
export function gateUseUnchanged(world: WorldState, intent: GateUseIntent): boolean {
  const details = gateUseContext(world, intent);
  if (!details) return false;
  const gate = details.gate;
  return intent.operation === 'open'
    ? gate.position === 'open'
    : intent.operation === 'close'
      ? gate.position === 'closed'
      : gate.position === 'closed' && (intent.operation === 'bar' ? gate.barred : !gate.barred);
}
export function gateUseLabel(world: WorldState, intent: GateUseIntent): string {
  const family = world.assemblyFamilies?.[intent.familyId];
  return family?.implementation === 'grounded-panel-boundary'
    ? family.labels[intent.operation]
    : '';
}
function movementSolid(world: WorldState, intent: GateUseIntent) {
  const details = gateUseContext(world, intent);
  return details
    ? boundarySolidFromBoxes(
        boundaryGateSweep(
          details.family.geometry,
          details.anchor,
          details.heading,
          'closed',
          'open',
        ),
      )
    : undefined;
}
export function gateWorkCandidates(
  world: WorldState,
  actorId: string,
  intent: GateUseIntent,
): Array<PhysicalWorkPoint & { side: 'inside' | 'outside' }> {
  const actor = entityGet(world.entities, actorId),
    details = gateUseContext(world, intent);
  if (!actor || !details) return [];
  const { family, gate, anchor, heading, site } = details,
    sides: Array<'inside' | 'outside'> =
      intent.operation === 'bar' || intent.operation === 'unbar'
        ? ['inside']
        : ['inside', 'outside'];
  if (intent.side && !sides.includes(intent.side)) return [];
  const obstruction = movementSolid(world, intent);
  return sides
    .filter((side) => !intent.side || side === intent.side)
    .map((side) => ({
      side,
      point: boundaryGateHandle(family.geometry, anchor, heading, gate.position, side),
      ...(obstruction ? { obstruction } : {}),
      stance: {
        ...localPoint(
          anchor,
          heading,
          family.geometry.section.spacing / 2 +
            (gate.position === 'open' ? family.geometry.gate.travel : 0),
          side === 'inside'
            ? family.geometry.gate.insideOffset +
                family.geometry.gate.thickness / 2 +
                bodyProfile(actor).radius +
                family.workPoints.clearance
            : -family.geometry.section.panelThickness / 2 -
                bodyProfile(actor).radius -
                family.workPoints.clearance,
        ),
        surfaceId: site.surfaceId,
      },
    }));
}
export function gateMovementProblem(
  world: WorldState,
  intent: GateUseIntent,
  actorId?: string,
): Outcome | undefined {
  if (intent.operation === 'bar' || intent.operation === 'unbar') return;
  const details = gateUseContext(world, intent),
    solid = movementSolid(world, intent);
  if (!details || !solid)
    return outcome(false, 'gate-changed', 'The actual gate or its supports changed.');
  const moving = new Set([intent.itemId, ...details.gate.bindingIds.slice(4)]),
    map = spatialMap(world),
    bounds = solid.bounds,
    centre = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    },
    radius = Math.hypot(bounds.max.x - centre.x, bounds.max.y - centre.y, bounds.max.z - centre.z);
  if (
    physicalIntersections(map, solid).some((hit) => !moving.has(hit.id)) ||
    nearbyBodyEntities(world, centre, radius).some(
      (other) =>
        other.id !== actorId &&
        !other.assembly &&
        solidOverlap(solid, { bounds: bodySpace(world, other) }),
    )
  )
    return outcome(
      false,
      'gate-blocked',
      'The gate and its hanging cords need their complete movement space clear.',
    );
}

/** Admission and elapsed-work checks share exact mechanics and current authority. */
export function prepareGateUse(
  world: WorldState,
  actorId: string,
  intent: GateUseIntent,
  permissions: readonly CampAssetPermission[],
  invocationId?: string,
  work?: ProspectiveWork,
  checkMovement = true,
  permissionId?: string,
) {
  const actor = entityGet(world.entities, actorId),
    details = validGateUseIntent(intent) && gateUseContext(world, intent);
  if (!actor?.actor?.alive || !canHandleItems(world, actor) || !details)
    return outcome(
      false,
      'gate-unavailable',
      'Choose a current supported gate and a person able to handle it.',
    );
  if (!invocationId && !seesEntity(world, actor, details.root))
    return outcome(false, 'not-visible', 'Move close enough to perceive the actual structure.');
  const grant = gateUsePermission(
    world,
    intent.assemblyId,
    intent.itemId,
    intent.operation,
    permissions,
    permissionId,
  );
  if (!grant)
    return outcome(
      false,
      'gate-permission',
      'There is no current public-use permission for this exact gate and operation.',
    );
  if (!work && !invocationId) {
    const replacement = prospectiveWork(world, actorId, 'replace');
    if ('ok' in replacement) return replacement;
    if (!replacement.outcome.ok) return replacement.outcome;
    work = replacement;
  }
  const edit = activeAssemblyEdit(world, details.root, actorId, work);
  if (edit && (edit !== invocationId || details.component.activeEdit?.actorId !== actorId))
    return outcome(false, 'competing-edit', 'Another operation is in progress on this structure.');
  if (
    details.gate.position === 'open' &&
    (intent.operation === 'bar' || intent.operation === 'unbar')
  )
    return outcome(false, 'gate-open', 'Close the gate before using its inside bar.');
  if (checkMovement && !gateUseUnchanged(world, intent)) {
    const movement = gateMovementProblem(world, intent, invocationId ? undefined : actorId);
    if (movement) return movement;
  }
  const candidates = gateWorkCandidates(world, actorId, intent),
    approach = findPhysicalWorkApproach(world, actor, candidates, world.itemHandling.reach);
  if (!approach)
    return outcome(false, 'gate-access', 'No clear supported route reaches the selected handle.');
  // A remote intention does not reveal an occluded inside bar. The person can
  // discover the obstruction by actually reaching a handle, or by seeing it.
  if (
    intent.operation === 'open' &&
    details.gate.barred &&
    (pointVisionQuery(
      world,
      actor,
    )(
      boundaryGateHandle(
        details.family.geometry,
        details.anchor,
        details.heading,
        details.gate.position,
        'inside',
      ),
    ) ||
      physicalWorkPointAvailable(
        world,
        actor,
        approach.candidate,
        world.itemHandling.reach,
        worldPosition(actor),
      ))
  )
    return outcome(false, 'gate-barred', 'The closed gate must be unbarred from inside first.');
  const side = candidates.find((candidate) => candidate === approach.candidate)!.side;
  return {
    details,
    approach,
    work: {
      intent,
      position: details.gate.position,
      barred: details.gate.barred,
      side,
      grant: { id: grant.id, revision: grant.revision },
    } satisfies GateWork,
  };
}
export function gateWorkProblem(
  world: WorldState,
  actorId: string,
  action: Action & { gateWork?: GateWork },
  permissions: readonly CampAssetPermission[],
  checkMovement = false,
): Outcome | undefined {
  const saved = action.gateWork;
  if (!saved) return outcome(false, 'gate-work', 'This gate work is no longer available.');
  const prepared = prepareGateUse(
    world,
    actorId,
    { ...saved.intent, side: saved.side },
    permissions,
    action.id,
    undefined,
    checkMovement,
    saved.grant.id,
  );
  if ('ok' in prepared) return prepared;
  if (
    prepared.work.position !== saved.position ||
    prepared.work.barred !== saved.barred ||
    prepared.work.grant.id !== saved.grant.id ||
    prepared.work.grant.revision !== saved.grant.revision
  )
    return outcome(
      false,
      'gate-changed',
      'The gate or its current permission changed during preparation.',
    );
  const actor = entityGet(world.entities, actorId)!,
    destination = action.destination,
    candidate = gateWorkCandidates(world, actorId, { ...saved.intent, side: saved.side }).find(
      (candidate) =>
        destination &&
        (['x', 'y', 'z', 'surfaceId'] as const).every(
          (key) => candidate.stance[key] === destination[key],
        ),
    );
  if (
    !candidate ||
    !physicalWorkPointAvailable(
      world,
      actor,
      candidate,
      world.itemHandling.reach,
      worldPosition(actor),
    )
  )
    return outcome(false, 'gate-access', 'The actual handle is no longer reached and clear.');
}

export function prepareGateAction(
  world: WorldState,
  actorId: string,
  id: string,
  intent: GateUseIntent,
  permissions: readonly CampAssetPermission[],
  work?: ProspectiveWork,
): Action | Outcome {
  const prepared = prepareGateUse(world, actorId, intent, permissions, undefined, work);
  if ('ok' in prepared) return prepared;
  const actor = entityGet(world.entities, actorId)!,
    destination = prepared.approach.candidate.stance,
    here = worldPosition(actor),
    atStance =
      actor.placement?.mode === 'world' &&
      actor.placement.supportSurfaceId === destination.surfaceId &&
      Math.hypot(here.x - destination.x, here.y - destination.y, here.z - destination.z) <=
        MOVEMENT.arrivalTolerance;
  if (
    gateUseUnchanged(world, intent) &&
    physicalWorkPointAvailable(
      world,
      actor,
      prepared.approach.candidate,
      world.itemHandling.reach,
      here,
    )
  )
    return outcome(
      true,
      'gate-unchanged',
      'The gate is already in the requested state; no operation was needed.',
    );
  return {
    id,
    type: 'operate-gate',
    stage: atStance ? 'working' : 'approaching',
    destination: { ...destination },
    path: atStance ? [] : prepared.approach.route.path,
    ...(prepared.approach.route.status === 'pending'
      ? { navigation: { request: prepared.approach.route.request } }
      : {}),
    remainingSeconds: prepared.details.family.seconds[intent.operation],
    totalSeconds: prepared.details.family.seconds[intent.operation],
    consumed: [],
    gateWork: prepared.work,
  };
}
export function claimGateWork(world: WorldState, actorId: string, action: Action): void {
  const root = action.gateWork && entityGet(world.entities, action.gateWork.intent.assemblyId);
  if (!root?.assembly || root.assembly.implementation !== 'grounded-panel-boundary')
    throw new Error('The actual gate structure is unavailable.');
  root.assembly.activeEdit = { actorId, invocationId: action.id };
}
export function releaseGateWork(world: WorldState, actorId: string, action: Action): void {
  const component =
    action.gateWork && entityGet(world.entities, action.gateWork.intent.assemblyId)?.assembly;
  if (component?.activeEdit?.actorId === actorId && component.activeEdit.invocationId === action.id)
    delete component.activeEdit;
}

export function validateGateWork(world: WorldState, actorId: string, action: Action): void {
  const work = action.gateWork;
  if (
    action.type !== 'operate-gate' ||
    !work ||
    !hasRecordFields(work, ['intent', 'position', 'barred', 'side', 'grant']) ||
    !validGateUseIntent(work.intent) ||
    !['open', 'closed'].includes(work.position) ||
    typeof work.barred !== 'boolean' ||
    (work.barred && work.position !== 'closed') ||
    (work.side !== 'inside' && work.side !== 'outside') ||
    (work.intent.side !== undefined && work.intent.side !== work.side) ||
    ((work.intent.operation === 'bar' || work.intent.operation === 'unbar') &&
      work.side !== 'inside') ||
    !hasRecordFields(work.grant, ['id', 'revision']) ||
    !isSafeRecordId(work.grant.id) ||
    !Number.isSafeInteger(work.grant.revision) ||
    work.grant.revision < 1
  )
    throw new Error('Invalid current gate work.');
  const details = gateUseContext(world, work.intent),
    destination = action.destination;
  if (
    !details ||
    details.gate.position !== work.position ||
    details.gate.barred !== work.barred ||
    details.component.activeEdit?.actorId !== actorId ||
    details.component.activeEdit.invocationId !== action.id ||
    action.totalSeconds !== details.family.seconds[work.intent.operation] ||
    !Number.isFinite(action.remainingSeconds) ||
    action.remainingSeconds < 0 ||
    action.remainingSeconds > action.totalSeconds ||
    !destination ||
    !gateWorkCandidates(world, actorId, { ...work.intent, side: work.side }).some((candidate) =>
      (['x', 'y', 'z', 'surfaceId'] as const).every(
        (key) => candidate.stance[key] === destination[key],
      ),
    )
  )
    throw new Error(
      'Saved gate work conflicts with its actual gate, reached handle or edit owner.',
    );
}
