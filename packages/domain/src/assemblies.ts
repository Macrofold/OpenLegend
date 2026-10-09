import {
  findPhysicalWorkApproach,
  physicalWorkPointAvailable,
  type PhysicalWorkPoint,
} from './spatial.js';
import { applyPatches, type Patch } from 'immer';
import { captureObjectIndex } from './objects.js';
import { captureReservationIndex } from './resource-claims.js';
import { captureWorkAllocations } from './work-budget.js';
import { seesEntity } from './perception.js';
import { draftWorld, finishWorld, changedEntityIds } from './draft.js';
import { WorkBudgetError } from './work-budget.js';
import { ResourceReservationError } from './resource-claims.js';
import {
  BODY_PROFILES,
  MOVEMENT,
  SPATIAL_LIMITS,
  canStand,
  finitePoint,
  spatialBlockers,
  physicalIntersections,
  solidOverlap,
  coverExposureSupported,
  surfaceById,
  surfaceHeight,
  surfaceSupportsRectangle,
  type Bounds3,
  type SurfacePoint,
} from '@open-legend/spatial';
import {
  assemblyShapes,
  assemblySite,
  coverBounds,
  localPoint,
  postLocal,
  rectangularBounds,
  isInstalledCover,
  assemblyHeadings,
  assemblyArrangement,
  assemblySpanProblem,
  coverGeometry,
  materialPostHeight,
  postHeightForSlot,
  postBounds,
} from './assembly-geometry.js';
import type {
  AssemblyFamily,
  AssemblyPhase,
  AssemblyPlan,
  ConstructionPermission,
} from './assembly-types.js';
import type { ActivityNode, ActivityArgument } from './action-experience.js';
import { definitionPin } from './world-modules.js';
import { readState, sameDefinitionPin, stateAddress } from './state-owners.js';
import {
  availableItemQuantity,
  itemDefinitionPin,
  releaseInvocationResources,
  reserveResource,
} from './resource-claims.js';
import {
  attachAssemblyPart,
  detachAssemblyPart,
  directChildIds,
  itemFor,
  assemblyMovesReason,
} from './objects.js';
import { accessiblePossession, canAccessContainer } from './object-access.js';
import { canHandleItems } from './item-handling.js';
import {
  bodyProfile,
  bodySpace,
  groundedSpatial,
  spatialMap,
  worldPlacement,
  worldPosition,
} from './spatial-state.js';
import { rootMembershipChanged, worldRootEntities } from './entity-index.js';
import { nextId } from './data.js';
import { chargeWork } from './work-budget.js';
import { emit, outcome } from './events.js';
import { recordSemanticChange } from './dependencies.js';
import { subjectNarration } from './narration.js';
import { isSafeRecordId } from './records.js';
import type { Action, Command, Entity, Outcome, WorldEvent, WorldState } from './types.js';

export function validAssemblyPhase(phase: AssemblyPhase): boolean {
  return (
    ['post', 'cover', 'lower', 'reclaim-post', 'reclaim-lowered'].includes(phase.operation) &&
    [
      phase.familyId,
      phase.arrangementId,
      phase.requestId,
      phase.editId,
      phase.slot,
      phase.itemId,
    ].every(isSafeRecordId) &&
    [
      phase.rootId,
      phase.binding1,
      phase.binding2,
      phase.binding3,
      phase.binding4,
      phase.destinationId,
    ].every((id) => id === undefined || isSafeRecordId(id)) &&
    Number.isSafeInteger(phase.expectedRevision) &&
    phase.expectedRevision >= 0 &&
    finitePoint(phase.destination) &&
    isSafeRecordId(phase.destination.surfaceId) &&
    assemblyHeadings.includes(phase.heading) &&
    Number.isSafeInteger(phase.bay) &&
    phase.bay >= 0
  );
}

export const overlaps = (a: Bounds3, b: Bounds3) =>
  a.min.x < b.max.x - SPATIAL_LIMITS.epsilon &&
  a.max.x > b.min.x + SPATIAL_LIMITS.epsilon &&
  a.min.y < b.max.y - SPATIAL_LIMITS.epsilon &&
  a.max.y > b.min.y + SPATIAL_LIMITS.epsilon &&
  a.min.z < b.max.z - SPATIAL_LIMITS.epsilon &&
  a.max.z > b.min.z + SPATIAL_LIMITS.epsilon;

/** Reject disjoint panels before testing their common positive-area intersection. */
export function coverLayersExceeded(
  incoming: Bounds3,
  panels: readonly { bounds: Bounds3 }[],
  maximum: number,
): boolean {
  const candidates = panels.filter((panel) => {
    chargeWork({ candidates: 1 });
    const b = panel.bounds;
    return (
      Math.max(incoming.min.x, b.min.x) <
        Math.min(incoming.max.x, b.max.x) - SPATIAL_LIMITS.epsilon &&
      Math.max(incoming.min.z, b.min.z) < Math.min(incoming.max.z, b.max.z) - SPATIAL_LIMITS.epsilon
    );
  });
  if (maximum === 1) return candidates.length > 0;
  for (let i = 0; i < candidates.length; i++)
    for (let j = i + 1; j < candidates.length; j++) {
      chargeWork({ candidates: 1 });
      const a = candidates[i]!.bounds,
        b = candidates[j]!.bounds;
      if (
        Math.max(incoming.min.x, a.min.x, b.min.x) <
          Math.min(incoming.max.x, a.max.x, b.max.x) - SPATIAL_LIMITS.epsilon &&
        Math.max(incoming.min.z, a.min.z, b.min.z) <
          Math.min(incoming.max.z, a.max.z, b.max.z) - SPATIAL_LIMITS.epsilon
      )
        return true;
    }
  return false;
}

/** Protected lowered pieces remain actual direct pile contents, with no second ledger. */
export function loweredAssemblyMaterials(world: WorldState, rootId: string): string[] {
  return worldRootEntities(world, true)
    .filter((root) => root.kind === 'item-pile')
    .flatMap((root) => [...directChildIds(world, root.id)])
    .filter((id) => world.entities[id]?.item?.assemblyClaim?.rootId === rootId);
}
export function assemblyRoot(
  world: WorldState,
  phase: Pick<AssemblyPhase, 'rootId' | 'requestId'>,
): Entity | undefined {
  const id =
    phase.rootId ??
    worldRootEntities(world, true).find((root) => root.assembly?.requestId === phase.requestId)?.id;
  // The index supplies identity only: a compound mutation must use its live draft,
  // never an unchanged immutable record returned by the read-only root view.
  return id ? world.entities[id] : undefined;
}
export function assemblyFamily(world: WorldState, id: string): AssemblyFamily | undefined {
  return world.assemblyFamilies?.[id];
}
const postSlot = (column: number, row: number) => `${column}:${row}`;
export const assemblySupportSlots = (bay: number) => [
  postSlot(bay, 0),
  postSlot(bay, 1),
  postSlot(bay + 1, 1),
  postSlot(bay + 1, 0),
];
const phaseInputs = (phase: AssemblyPhase) =>
  phase.operation === 'post'
    ? [phase.itemId]
    : phase.operation === 'cover'
      ? [phase.itemId, phase.binding1!, phase.binding2!, phase.binding3!, phase.binding4!]
      : [];
function releasedMaterials(world: WorldState, phase: AssemblyPhase): string[] {
  return phase.operation === 'lower'
    ? [
        phase.itemId,
        ...Object.values(assemblyRoot(world, phase)?.assembly?.joints ?? {})
          .filter((joint) => joint.coverId === phase.itemId)
          .map((joint) => joint.bindingId),
      ]
    : [phase.itemId];
}
function activeEdit(world: WorldState, root: Entity): string | undefined {
  const edit = root.assembly?.activeEdit;
  const actor = edit && world.entities[edit.actorId]?.actor;
  const plan = actor?.agency.plan,
    phase = actor?.action?.assemblyPhase;
  return (plan && plan.id === edit?.invocationId && plan.status === 'active') ||
    (edit &&
      phase &&
      phase.editId === edit.invocationId &&
      assemblyRoot(world, phase)?.id === root.id)
    ? edit?.invocationId
    : undefined;
}
export function assemblyPermission(
  world: WorldState,
  actorId: string,
  phase: AssemblyPhase,
  permissions: readonly ConstructionPermission[],
): ConstructionPermission | undefined {
  const bounds = coverBounds(
    assemblyFamily(world, phase.familyId)!,
    phase.destination,
    phase.heading,
    phase.bay,
    phase.arrangementId,
  );
  const materials = phaseInputs(phase);
  if (!materials.length) materials.push(...releasedMaterials(world, phase));
  let sitePermission: ConstructionPermission | undefined;
  for (const p of permissions) {
    if (
      !p.revoked &&
      p.worldId === world.id &&
      p.actorId === actorId &&
      p.operations.includes(phase.operation) &&
      p.site.surfaceId === phase.destination.surfaceId &&
      bounds.min.x >= p.site.minX &&
      bounds.max.x <= p.site.maxX &&
      bounds.min.z >= p.site.minZ &&
      bounds.max.z <= p.site.maxZ
    ) {
      sitePermission ??= p;
      if (materials.every((id) => materialAuthorized(world, id, p))) return p;
    }
  }
  // Keep the precise material refusal when site rights exist. A phase must fit
  // one complete grant; rights from separate grants are never combined.
  return sitePermission;
}
export function materialAuthorized(
  world: WorldState,
  id: string,
  permission: ConstructionPermission,
): boolean {
  const origins = world.entities[id]?.item?.materialOriginIds;
  return !!origins?.length && origins.every((source) => permission.materialIds.includes(source));
}
export function materialUsable(
  world: WorldState,
  id: string,
  family: AssemblyFamily,
  role: string,
): boolean {
  const material = world.entities[id],
    definition = material?.item && world.itemDefinitions[material.item.definitionPin.id];
  const descriptor = definition?.assemblyMaterial;
  if (
    !material?.item ||
    !definition ||
    !sameDefinitionPin(material.item.definitionPin, definitionPin(definition)) ||
    descriptor?.familyId !== family.id ||
    descriptor.role !== role
  )
    return false;
  const condition = world.moduleManifest.definitions.find(
    (d) => d.id === family.conditionAttribute,
  );
  if (!condition) return false;
  const current = readState(world, stateAddress(id, condition), 'owner');
  return current.status === 'known' && current.value === family.usableCondition;
}
export function assemblyWorkCandidates(
  world: WorldState,
  phase: AssemblyPhase,
  corner: number,
): PhysicalWorkPoint[] {
  const family = assemblyFamily(world, phase.familyId)!;
  const slot = ['post', 'reclaim-post'].includes(phase.operation)
    ? phase.slot
    : assemblySupportSlots(phase.bay)[corner]!;
  if (
    !slot ||
    (phase.operation === 'post' && !Number.isFinite(materialPostHeight(world, phase.itemId)))
  )
    return [];
  const local = postLocal(family, slot),
    section = family.bay.postSection / 2;
  const obstruction =
    phase.operation === 'post'
      ? {
          bounds: postBounds(
            family,
            phase.destination,
            phase.heading,
            slot,
            materialPostHeight(world, phase.itemId)!,
          ),
        }
      : phase.operation === 'cover'
        ? coverGeometry(family, phase.destination, phase.heading, phase.bay, phase.arrangementId)
        : undefined;
  return [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ].map(([du, dv]) => ({
    ...(obstruction ? { obstruction } : {}),
    point: localPoint(
      phase.destination,
      phase.heading,
      local.x + du! * section,
      local.z + dv! * section,
      postHeightForSlot(family, phase.arrangementId, slot) - family.binding.workDrop,
    ),
    stance: {
      ...localPoint(
        phase.destination,
        phase.heading,
        local.x + du! * family.binding.stanceOffset,
        local.z + dv! * family.binding.stanceOffset,
      ),
      surfaceId: phase.destination.surfaceId,
    },
  }));
}
export function assemblyStances(
  world: WorldState,
  phase: AssemblyPhase,
  actorId: string,
): Array<SurfacePoint | undefined> {
  if (phase.operation === 'reclaim-lowered') {
    const placement = world.entities[phase.itemId]?.placement;
    const pile =
      placement?.mode === 'contained' ? world.entities[placement.parentEntityId] : undefined;
    return pile?.placement?.mode === 'world' && pile.placement.supportSurfaceId
      ? [{ ...pile.placement.position, surfaceId: pile.placement.supportSurfaceId }]
      : [];
  }
  const count = ['cover', 'lower'].includes(phase.operation) ? 4 : 1;
  return Array.from(
    { length: count },
    (_, corner) =>
      findPhysicalWorkApproach(
        world,
        world.entities[actorId]!,
        assemblyWorkCandidates(world, phase, corner),
        world.itemHandling.reach,
      )?.candidate.stance,
  );
}
/** The entire positive intersection must remain in the admitted post-tip band.
 * docs/worlds/base/editable-shelters.md#qualified-geometry-for-px05 */
export function qualifiedAttachmentContact(
  family: AssemblyFamily,
  cover: { bounds: Bounds3; panel?: import('@open-legend/spatial').FinitePanel },
  post: { bounds: Bounds3 },
): boolean {
  const lower = {
    bounds: {
      min: post.bounds.min,
      max: { ...post.bounds.max, y: post.bounds.max.y - family.binding.contactBand },
    },
  };
  return !solidOverlap(cover, lower);
}
/** The same supported footprint is required by admission and current-format loading. */
export function assemblySupportProblem(
  world: WorldState,
  family: AssemblyFamily,
  site: SurfacePoint,
  heading: number,
  bay: number,
  arrangementId: string,
): string | undefined {
  const map = spatialMap(world),
    surface = surfaceById(map, site.surfaceId);
  if (!surface || surface.slopeX !== 0 || surface.slopeZ !== 0)
    return 'Choose one flat supported ground patch.';
  const bounds = coverBounds(family, site, heading, bay, arrangementId);
  if (
    !surfaceSupportsRectangle(map, surface, {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
    })
  )
    return 'The whole covering needs supported ground, including the space between its corners.';
  for (const x of [bounds.min.x, bounds.max.x])
    for (const z of [bounds.min.z, bounds.max.z]) {
      const y = surfaceHeight(surface, x, z);
      if (
        Math.abs(y - site.y) > SPATIAL_LIMITS.epsilon ||
        !canStand(
          map,
          { x, y, z, surfaceId: surface.id },
          { ...BODY_PROFILES.object, radius: 0.001, height: 0.001 },
        )
      )
        return 'The entire covering, including its overhang, needs supported clear ground.';
    }
  return assemblySpanProblem(family, arrangementId);
}
function geometryProblem(
  world: WorldState,
  actorId: string,
  family: AssemblyFamily,
  phase: AssemblyPhase,
): string | undefined {
  const support = assemblySupportProblem(
    world,
    family,
    phase.destination,
    phase.heading,
    phase.bay,
    phase.arrangementId,
  );
  if (support) return support;
  const map = spatialMap(world),
    actor = world.entities[actorId]!;
  const blockers = spatialBlockers(map);
  if (blockers.length >= SPATIAL_LIMITS.maxBlockers && ['post', 'cover'].includes(phase.operation))
    return 'This world has reached its supported physical geometry limit. Reclaim unused parts before adding another.';
  const cover = coverGeometry(
    family,
    phase.destination,
    phase.heading,
    phase.bay,
    phase.arrangementId,
  );
  const root = assemblyRoot(world, phase);
  const prospective =
    phase.operation === 'post'
      ? {
          bounds: postBounds(
            family,
            phase.destination,
            phase.heading,
            phase.slot,
            materialPostHeight(world, phase.itemId)!,
          ),
        }
      : cover;
  if (
    physicalIntersections(map, prospective).some((hit) => {
      if (phase.operation !== 'cover') return true;
      if (isInstalledCover(world, hit.id)) return false;
      const post = root?.assembly?.parts[hit.id];
      return !(
        post?.role === 'post' &&
        assemblySupportSlots(phase.bay).includes(post.slot) &&
        phaseInputs(phase).length === 5 &&
        qualifiedAttachmentContact(family, prospective, hit)
      );
    })
  )
    return 'The selected part intersects an existing obstacle. Move the preview to clear ground.';
  for (const occupant of worldRootEntities(world, true)) {
    if (occupant.id === root?.id || occupant.id === actorId || occupant.assembly) continue;
    const occupied = bodySpace(world, occupant);
    if (solidOverlap(prospective, { bounds: occupied }))
      return 'Someone or a belonging occupies the selected part’s space. Move it normally before building here.';
  }
  return assemblyWorkProblem(world, actorId, phase);
}
function assemblyWorkProblem(
  world: WorldState,
  actorId: string,
  phase: AssemblyPhase,
): string | undefined {
  const actor = world.entities[actorId]!;
  const count = ['cover', 'lower'].includes(phase.operation) ? 4 : 1;
  for (let corner = 0; corner < count; corner++) {
    if (
      !findPhysicalWorkApproach(
        world,
        actor,
        assemblyWorkCandidates(world, phase, corner),
        world.itemHandling.reach,
      )
    )
      return 'A binding has no clear reachable exterior work face. Move obstructing belongings normally or choose another site.';
  }
}
/** No IDs, holds, events, randomness or temporary execution are created by this evaluator. */
export function evaluateAssemblyPhase(
  world: WorldState,
  actorId: string,
  phase: AssemblyPhase,
  permissions: readonly ConstructionPermission[],
  invocationId?: string,
): Outcome {
  const refuse = (code: string, message: string) => outcome(false, code, message);
  const family = assemblyFamily(world, phase.familyId),
    actor = world.entities[actorId];
  if (!validAssemblyPhase(phase))
    return refuse('invalid-phase', 'Choose a complete supported construction phase.');
  if (
    !family ||
    family.implementation !== 'four-corner-flexible-bays' ||
    !actor?.actor?.alive ||
    !canHandleItems(world, actor)
  )
    return refuse(
      'construction-unavailable',
      'This person cannot perform this supported construction work.',
    );
  if (
    !finitePoint(phase.destination) ||
    !assemblyHeadings.includes(phase.heading) ||
    !Number.isSafeInteger(phase.bay) ||
    phase.bay < 0 ||
    phase.bay >= (assemblyArrangement(family, phase.arrangementId)?.maximumBays ?? 0)
  )
    return refuse('invalid-layout', 'Choose a supported site, orientation and bay.');
  if (
    ['post', 'reclaim-post'].includes(phase.operation) &&
    !assemblySupportSlots(phase.bay).includes(phase.slot)
  )
    return refuse('invalid-part', 'Choose a post position belonging to the selected bay.');
  const permission = assemblyPermission(world, actorId, phase, permissions);
  if (!permission)
    return refuse(
      'construction-permission',
      'You have no current permission to change this structure at that site. Visiting does not grant editing rights.',
    );
  const root = assemblyRoot(world, phase),
    component = root?.assembly;
  if (invocationId && phase.operation !== 'reclaim-lowered') {
    const action = actor.actor!.action,
      corner = action?.assemblyCorner ?? 0;
    const actual = worldPosition(actor);
    const candidate = assemblyWorkCandidates(world, phase, corner).find(
      (candidate) =>
        action?.destination &&
        ['x', 'y', 'z', 'surfaceId'].every(
          (key) => Reflect.get(candidate.stance, key) === Reflect.get(action.destination!, key),
        ),
    );
    if (
      !candidate ||
      !physicalWorkPointAvailable(world, actor, candidate, world.itemHandling.reach, actual)
    )
      return refuse(
        'binding-access',
        'The selected exterior work face is blocked or out of reach. Completed parts remain.',
      );
  }
  if (phase.rootId && !component)
    return refuse('missing-structure', 'Choose the actual structure to change.');
  const actualSite = root && assemblySite(root);
  if (
    component &&
    (!actualSite ||
      component.requestId !== phase.requestId ||
      component.arrangementId !== phase.arrangementId ||
      root!.spatial.heading !== phase.heading ||
      actualSite.surfaceId !== phase.destination.surfaceId ||
      ['x', 'y', 'z'].some(
        (key) => Reflect.get(actualSite, key) !== Reflect.get(phase.destination, key),
      ))
  )
    return refuse(
      'stale-structure',
      'The actual structure has a different site or orientation. Refresh its current parts.',
    );
  if (
    component &&
    (component.retired ||
      component.revision !== phase.expectedRevision ||
      !sameDefinitionPin(component.family, definitionPin(family)))
  )
    return refuse(
      'stale-structure',
      'The structure changed. Refresh its parts before choosing another edit.',
    );
  if (!component && (phase.operation !== 'post' || phase.expectedRevision !== 0))
    return refuse('missing-structure', 'The selected structure is no longer available.');
  if (
    root &&
    activeEdit(world, root) &&
    (activeEdit(world, root) !== phase.editId || component?.activeEdit?.actorId !== actorId)
  )
    return refuse(
      'competing-edit',
      'Another edit is already in progress. Stop or finish it before changing these parts.',
    );
  if (
    phase.operation === 'post' &&
    component &&
    Object.values(component.parts).some((part) => part.role === 'post' && part.slot === phase.slot)
  )
    return refuse('occupied-socket', 'That post position is already occupied.');
  const inputs = phaseInputs(phase),
    totals = new Map<string, number>();
  inputs.forEach((id) => totals.set(id, (totals.get(id) ?? 0) + 1));
  if (
    inputs.some(
      (id, index) =>
        !isSafeRecordId(id) ||
        !accessiblePossession(world, actorId, id) ||
        !materialAuthorized(world, id, permission) ||
        !materialUsable(
          world,
          id,
          family,
          index === 0 ? (phase.operation === 'post' ? 'post' : 'cover') : 'binding',
        ),
    )
  )
    return refuse(
      'unauthorized-material',
      'Choose intact qualified material with permission for construction. Carrying or declaring it yours is insufficient.',
    );
  for (const [id, count] of totals) {
    if (availableItemQuantity(world, id, invocationId) < count)
      return refuse(
        'missing-material',
        'The selected material is unavailable or held by other work.',
      );
  }
  if (
    component &&
    Object.keys(component.parts).length +
      loweredAssemblyMaterials(world, root!.id).length +
      inputs.length >
      family.limits.parts
  )
    return refuse('part-limit', 'This arrangement exceeds the supported number of real parts.');
  if (
    phase.operation === 'post' &&
    materialPostHeight(world, phase.itemId) !==
      postHeightForSlot(family, phase.arrangementId, phase.slot)
  )
    return refuse(
      'post-height',
      'Choose an actual post of the height required at this edge. Posts are never resized.',
    );
  if (phase.operation === 'post' || phase.operation === 'cover') {
    const problem = geometryProblem(world, actorId, family, phase);
    if (problem) return refuse('invalid-placement', problem);
  }
  if (phase.operation === 'lower' || phase.operation === 'reclaim-post') {
    const problem = assemblyWorkProblem(world, actorId, phase);
    if (problem) return refuse('binding-access', problem);
  }
  if (phase.operation === 'cover') {
    const posts = assemblySupportSlots(phase.bay).map((slot) =>
      Object.values(component?.parts ?? {}).find(
        (part) => part.role === 'post' && part.slot === slot,
      ),
    );
    if (
      posts.some(
        (post) =>
          !post ||
          !materialUsable(world, post.itemId, family, 'post') ||
          materialPostHeight(world, post.itemId) !==
            postHeightForSlot(family, phase.arrangementId, post.slot),
      )
    )
      return refuse(
        'missing-support',
        'Install all four intact posts before fastening this covering.',
      );
    if (
      posts.some(
        (post) =>
          Object.values(component!.joints).filter((j) => j.postId === post!.itemId).length >=
          family.limits.sockets,
      )
    )
      return refuse(
        'loaded-socket',
        'The shared posts have no free attachment sockets. Lower a covering before replacing it.',
      );
    const incoming = {
      id: phase.itemId,
      ...coverGeometry(family, phase.destination, phase.heading, phase.bay, phase.arrangementId),
      transmission: family.cover.transmission,
    };
    const panels = worldRootEntities(world, true).flatMap((r) =>
      r.assembly ? assemblyShapes(world, r).panels : [],
    );
    if (!coverExposureSupported(incoming, panels))
      return refuse(
        'cover-orientation',
        'These overlapping slopes cannot provide qualified rain coverage. Separate the coverings or align their slopes.',
      );
    if (coverLayersExceeded(incoming.bounds, panels, family.limits.layers))
      return refuse(
        'cover-layers',
        'This replacement exceeds the qualified covering layers. Choose removal before installation and its temporary exposure.',
      );
  }
  if (!inputs.length) {
    const selected = world.entities[phase.itemId];
    if (selected?.item?.assemblyClaim?.rootId !== root?.id)
      return refuse('missing-part', 'The selected actual part is no longer available.');
    if (releasedMaterials(world, phase).some((id) => !materialAuthorized(world, id, permission)))
      return refuse(
        'unauthorized-material',
        'You have no current construction-use permission to reclaim these actual materials.',
      );
    if (
      phase.operation === 'reclaim-post' &&
      Object.values(component!.joints).some((j) => j.postId === phase.itemId)
    )
      return refuse(
        'loaded-support',
        'This post supports a covering. Lower every dependent covering before removing it.',
      );
    const role = component?.parts[phase.itemId]?.role;
    if (
      (phase.operation === 'lower' && role !== 'cover') ||
      (phase.operation === 'reclaim-post' && role !== 'post') ||
      (phase.operation === 'reclaim-lowered' && role !== undefined)
    )
      return refuse(
        'invalid-part',
        'Choose the corresponding actual installed or lowered material.',
      );
    if (phase.operation === 'reclaim-lowered') {
      const stance = assemblyStances(world, phase, actorId)[0];
      if (!stance || !canStand(spatialMap(world), stance, bodyProfile(actor)))
        return refuse(
          'reclaim-access',
          'The actual lowered material needs accessible supported ground.',
        );
      if (invocationId) {
        const p = worldPosition(actor),
          profile = bodyProfile(actor);
        if (
          Math.hypot(
            p.x - stance.x,
            p.z - stance.z,
            p.y + profile.interactionHeight - (stance.y + family.exposure.folded.height),
          ) > world.itemHandling.reach
        )
          return refuse('reclaim-access', 'Move within reach of the actual lowered material.');
      }
    }
    const destination = phase.destinationId;
    if (destination && !canAccessContainer(world, actorId, destination))
      return refuse(
        'reclaim-access',
        'Choose a currently accessible destination for these materials.',
      );
    if (destination) {
      const ids = releasedMaterials(world, phase);
      const capacity = assemblyMovesReason(world, ids, root!.id, destination);
      if (capacity) return refuse('reclaim-destination', capacity);
    }
  }
  return outcome(
    true,
    'available',
    'The selected phase is currently available; completed effects are rechecked at its commit.',
  );
}

export function reserveAssemblyPhase(
  world: WorldState,
  actorId: string,
  phase: AssemblyPhase,
  invocationId: string,
): void {
  const totals = new Map<string, number>();
  phaseInputs(phase).forEach((id) => totals.set(id, (totals.get(id) ?? 0) + 1));
  for (const [id, amount] of totals) {
    const lot = world.entities[id]!.item!;
    const result = reserveResource(
      world,
      {
        id: `${invocationId}:material:${id}`,
        invocationId,
        actorId,
        resource: {
          kind: 'item',
          itemId: id,
          definition: itemDefinitionPin(world.itemDefinitions[lot.definitionPin.id]!),
        },
        amount,
      },
      lot.revision,
    );
    if (result.status !== 'applied') throw new ResourceReservationError();
  }
}
export function assemblyGroundDestination(
  world: WorldState,
  site: SurfacePoint,
  family: AssemblyFamily,
): string {
  const id = nextId(world, 'pile');
  world.entities[id] = {
    id,
    kind: 'item-pile',
    name: family.presentation.loweredName,
    placement: worldPlacement(site, site.surfaceId),
    spatial: {
      ...groundedSpatial('object'),
      softFootprint: family.exposure.folded,
    },
  };
  rootMembershipChanged(world, id);
  return id;
}
/** Caller owns the isolated native transition; all parts/holds/geometry/events publish together. */
function commitAssemblyParts(
  world: WorldState,
  actorId: string,
  phase: AssemblyPhase,
  invocationId: string,
): { rootId: string; installed: string[]; released: string[] } {
  const family = assemblyFamily(world, phase.familyId)!;
  let root = assemblyRoot(world, phase);
  if (!root) {
    const id = nextId(world, 'assembly');
    root = {
      id,
      name: family.name,
      description: family.description,
      kind: 'assembly',
      placement: worldPlacement(phase.destination, phase.destination.surfaceId),
      spatial: { ...groundedSpatial('object'), heading: phase.heading },
      assembly: {
        family: definitionPin(family),
        arrangementId: phase.arrangementId,
        requestId: phase.requestId,
        revision: 0,
        parts: {},
        joints: {},
      },
    };
    world.entities[id] = root;
    rootMembershipChanged(world, id);
  }
  const component = root.assembly!;
  component.activeEdit = { actorId, invocationId: phase.editId };
  releaseInvocationResources(world, invocationId);
  const claim = { rootId: root.id, family: definitionPin(family) };
  const installed: string[] = [],
    released: string[] = [];
  if (phase.operation === 'post') {
    const local = postLocal(family, phase.slot),
      id = attachAssemblyPart(
        world,
        phase.itemId,
        root.id,
        { portId: 'assembly', slot: phase.slot, local },
        claim,
      );
    component.parts[id] = { itemId: id, role: 'post', slot: phase.slot, bay: phase.bay };
    installed.push(id);
  } else if (phase.operation === 'cover') {
    const slot = `cover:${phase.bay}:${phase.itemId}`;
    const cover = attachAssemblyPart(
      world,
      phase.itemId,
      root.id,
      {
        portId: 'assembly',
        slot,
        local: {
          x: phase.bay * family.bay.width,
          y:
            (assemblyArrangement(family, phase.arrangementId)!.rowHeights[0] +
              assemblyArrangement(family, phase.arrangementId)!.rowHeights[1]) /
            2,
          z: 0,
        },
      },
      claim,
    );
    component.parts[cover] = { itemId: cover, role: 'cover', slot, bay: phase.bay };
    installed.push(cover);
    const sources = [phase.binding1!, phase.binding2!, phase.binding3!, phase.binding4!];
    assemblySupportSlots(phase.bay).forEach((postSocket, corner) => {
      const post = Object.values(component.parts).find(
        (p) => p.role === 'post' && p.slot === postSocket,
      )!;
      const slot = `binding:${cover}:${corner}`,
        local = postLocal(family, postSocket);
      const binding = attachAssemblyPart(
        world,
        sources[corner]!,
        root!.id,
        {
          portId: 'assembly',
          slot,
          local: { ...local, y: materialPostHeight(world, post.itemId)! },
        },
        claim,
      );
      component.parts[binding] = { itemId: binding, role: 'binding', slot, bay: phase.bay };
      component.joints[slot] = {
        id: slot,
        coverId: cover,
        postId: post.itemId,
        bindingId: binding,
        corner,
      };
      installed.push(binding);
    });
  } else {
    const destination =
      phase.destinationId ?? assemblyGroundDestination(world, phase.destination, family);
    const ids = releasedMaterials(world, phase);
    for (const id of ids) {
      detachAssemblyPart(world, id, root.id, destination);
      delete component.parts[id];
      released.push(id);
    }
    for (const [id, joint] of Object.entries(component.joints))
      if (ids.includes(joint.coverId) || ids.includes(joint.bindingId)) delete component.joints[id];
  }
  component.revision++;
  // Collecting already lowered material changes custody, not collision or rain
  // geometry; the object owner invalidates exposed membership and current forms.
  if (phase.operation !== 'reclaim-lowered')
    world.assemblyGeometryRevision = (world.assemblyGeometryRevision ?? 0) + 1;
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: root.id,
    before: phase.destination,
    after: phase.destination,
  });
  if (
    !Object.keys(component.parts).length &&
    loweredAssemblyMaterials(world, root.id).length === 0
  ) {
    component.retired = { at: world.simTime, cause: 'dismantled' };
    delete component.activeEdit;
    delete root.placement;
    rootMembershipChanged(world, root.id);
  }
  return { rootId: root.id, installed, released };
}

export function commitAssemblyPhase(
  world: WorldState,
  actorId: string,
  phase: AssemblyPhase,
  invocationId: string,
  permissions: readonly ConstructionPermission[],
  events: WorldEvent[],
): Outcome {
  const checked = evaluateAssemblyPhase(world, actorId, phase, permissions, invocationId);
  if (!checked.ok) return checked;
  // Removing parts changes the materials a grant must cover. Keep the authority
  // checked before the transition for the completion record and server commit fence.
  const permission = assemblyPermission(world, actorId, phase, permissions)!;
  const candidate = draftWorld(world);
  let parts: ReturnType<typeof commitAssemblyParts>;
  try {
    parts = commitAssemblyParts(candidate, actorId, phase, invocationId);
  } catch (error) {
    if (error instanceof WorkBudgetError || error instanceof ResourceReservationError) throw error;
    return outcome(
      false,
      'construction-changed',
      error instanceof Error ? error.message : 'The selected parts changed.',
    );
  }
  publishAssemblyParts(world, candidate);
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: parts.rootId,
    before: phase.destination,
    after: phase.destination,
  });
  const family = assemblyFamily(world, phase.familyId)!;
  emit(
    world,
    events,
    'construction-phase',
    subjectNarration(
      world.entities[actorId]!,
      `completed: ${family.labels[phase.operation].toLowerCase()}.`,
    ),
    world.entities[actorId],
    parts.rootId,
    {
      installed: parts.installed.join(','),
      released: parts.released.join(','),
      assemblyId: parts.rootId,
      grantId: permission.id,
      grantRevision: permission.revision,
      actionId: invocationId,
    },
  );
  return outcome(true, 'construction-completed', family.labels[phase.operation]);
}

export function assemblyWorkBoundary(action: Action): number {
  const corners =
    action.assemblyPhase && ['cover', 'lower'].includes(action.assemblyPhase.operation) ? 4 : 1;
  return (
    action.remainingSeconds -
    (action.totalSeconds * (corners - 1 - (action.assemblyCorner ?? 0))) / corners
  );
}

function publishAssemblyParts(world: WorldState, candidate: WorldState): void {
  const objects = captureObjectIndex(candidate),
    reservations = captureReservationIndex(candidate),
    allocations = captureWorkAllocations(candidate);
  let changes: readonly Patch[] = [];
  const committed = finishWorld(candidate, (patches) => {
    changes = patches;
  });
  const changed = changedEntityIds(committed) ?? new Set<string>();
  const roots = new Map(
    [...changed].map((id) => [
      id,
      world.entities[id]?.placement?.mode === 'world' && !world.entities[id]?.retirement,
    ]),
  );
  // Apply the validated candidate's actual writes into the existing mutable owner.
  // Replacing whole entity/work maps would adopt unchanged frozen branches as plain
  // objects, breaking later same-turn moisture/status work after a zero-time reclaim.
  // Existing actor/action references and atomic admission stay with the outer draft.
  // docs/architecture.md#state-and-transitions
  applyPatches(
    world,
    changes.filter(
      (p) =>
        [
          'entities',
          'objectState',
          'objectLineage',
          'resourceReservations',
          'workState',
          'assemblyGeometryRevision',
          'nextId',
        ].includes(String(p.path[0])) ||
        (p.path[0] === 'actionExperience' && p.path[1] === 'items'),
    ),
  );
  objects(world, changed);
  reservations(world);
  allocations(world);
  for (const id of changed) {
    const next = world.entities[id];
    if (roots.get(id) !== (next?.placement?.mode === 'world' && !next.retirement))
      rootMembershipChanged(world, id);
  }
}
/** Condition changes invoke the same compound part/custody publisher as construction. */
export function lowerUnsupportedCovers(
  world: WorldState,
  changedId: string,
  events: WorldEvent[],
): void {
  const claim = world.entities[changedId]?.item?.assemblyClaim,
    root = claim && world.entities[claim.rootId],
    component = root?.assembly;
  const family = component && assemblyFamily(world, component.family.id),
    site = root && assemblySite(root);
  if (!family || !component || !site || component.retired) return;
  const affected = Object.values(component.parts).filter(
    (part) =>
      part.role === 'cover' &&
      (!materialUsable(world, part.itemId, family, 'cover') ||
        Object.values(component.joints)
          .filter((j) => j.coverId === part.itemId)
          .some(
            (j) =>
              !materialUsable(world, j.postId, family, 'post') ||
              !materialUsable(world, j.bindingId, family, 'binding'),
          )),
  );
  if (!affected.length) return;
  const candidate = draftWorld(world),
    next = candidate.entities[root!.id]!.assembly!,
    destination = assemblyGroundDestination(candidate, site, family),
    lowered: string[] = [];
  for (const cover of affected) {
    const ids = [
      cover.itemId,
      ...Object.values(next.joints)
        .filter((j) => j.coverId === cover.itemId)
        .map((j) => j.bindingId),
    ];
    for (const id of ids) {
      detachAssemblyPart(candidate, id, root!.id, destination, true);
      delete next.parts[id];
      lowered.push(id);
    }
    for (const [id, joint] of Object.entries(next.joints))
      if (joint.coverId === cover.itemId) delete next.joints[id];
  }
  next.revision++;
  candidate.assemblyGeometryRevision = (candidate.assemblyGeometryRevision ?? 0) + 1;
  publishAssemblyParts(world, candidate);
  recordSemanticChange(world, { kind: 'spatial', entityId: root!.id, before: site, after: site });
  emit(
    world,
    events,
    'cover-lowered',
    family.presentation.failureText,
    world.entities[root!.id],
    undefined,
    {
      assemblyId: root!.id,
      changedMaterialId: changedId,
      lowered: lowered.join(','),
      destinationId: destination,
    },
  );
}

/** Compile into the existing saved activity owner. Native effects still own each phase. */
export function compileAssemblyActivity(
  world: WorldState,
  actorId: string,
  id: string,
  plan: AssemblyPlan,
  permissions: readonly ConstructionPermission[],
): Command | Outcome {
  const family = assemblyFamily(world, plan.familyId),
    root = plan.rootId ? world.entities[plan.rootId] : undefined,
    component = root?.assembly;
  if (
    !family ||
    (plan.rootId &&
      (!component || component.retired || component.revision !== plan.expectedRevision))
  )
    return outcome(
      false,
      'stale-structure',
      'Refresh the selected structure and its current parts.',
    );
  if (root && !seesEntity(world, world.entities[actorId]!, root))
    return outcome(
      false,
      'not-visible',
      'Move close enough to perceive the actual structure before changing it.',
    );
  if (root && activeEdit(world, root))
    return outcome(
      false,
      'competing-edit',
      'Finish or stop the current edit before starting another.',
    );
  const site = root ? assemblySite(root)! : plan.site,
    heading = root ? root.spatial.heading : assemblyHeadings[plan.orientation];
  const arrangementId = component?.arrangementId ?? plan.arrangementId;
  const arrangement = assemblyArrangement(family, arrangementId);
  if (
    !arrangement ||
    !finitePoint(site) ||
    !assemblyHeadings.includes(heading) ||
    (component && plan.arrangementId !== arrangementId) ||
    (plan.operation === 'extend' && arrangement.maximumBays < 2)
  )
    return outcome(
      false,
      'invalid-layout',
      'This arrangement does not admit the selected work. Reclaim actual parts to build a different arrangement.',
    );
  const requestId = component?.requestId ?? id;
  const phases: AssemblyPhase[] = [];
  let revision = component?.revision ?? 0;
  const phase = (
    operation: AssemblyPhase['operation'],
    itemId: string,
    bay: number,
    slot: string,
  ): AssemblyPhase => ({
    operation,
    itemId,
    bay,
    slot,
    familyId: family.id,
    arrangementId,
    requestId,
    rootId: root?.id,
    editId: id,
    expectedRevision: revision++,
    destination: site,
    heading,
    ...(plan.destinationId ? { destinationId: plan.destinationId } : {}),
  });
  const covers = Object.values(component?.parts ?? {}).filter((p) => p.role === 'cover');
  if (plan.operation === 'build' && root)
    return outcome(
      false,
      'existing-structure',
      'Choose extension, replacement or remaining work for an existing structure.',
    );
  if (plan.operation !== 'build' && !root)
    return outcome(false, 'missing-structure', 'Choose the actual structure to change.');
  if (plan.operation === 'replace' && !covers.some((p) => p.itemId === plan.outgoingId))
    return outcome(false, 'missing-part', 'Choose the actual covering to replace.');
  if (
    plan.operation === 'lower' &&
    plan.outgoingId &&
    !covers.some((p) => p.itemId === plan.outgoingId)
  )
    return outcome(false, 'missing-part', 'Choose an actual installed covering.');
  const lower = (part: (typeof covers)[number]) =>
    phases.push(phase('lower', part.itemId, part.bay, part.slot));
  if (plan.operation === 'dismantle' || plan.operation === 'lower') {
    const selected = plan.outgoingId ? covers.filter((p) => p.itemId === plan.outgoingId) : covers;
    selected.forEach(lower);
    if (plan.operation === 'dismantle') {
      for (const post of Object.values(component?.parts ?? {}).filter((p) => p.role === 'post'))
        phases.push(phase('reclaim-post', post.itemId, post.bay, post.slot));
      for (const itemId of loweredAssemblyMaterials(world, root!.id))
        phases.push(phase('reclaim-lowered', itemId, 0, 'lowered'));
    }
  } else if (plan.operation === 'reclaim') {
    if (!plan.outgoingId)
      return outcome(false, 'missing-part', 'Choose one actual lowered material to reclaim.');
    phases.push(phase('reclaim-lowered', plan.outgoingId, 0, 'lowered'));
  } else {
    const bay =
      plan.operation === 'resume'
        ? Object.values(component?.parts ?? {}).some((p) => p.bay === 1)
          ? 1
          : 0
        : plan.operation === 'extend'
          ? 1
          : plan.operation === 'replace'
            ? (covers.find((p) => p.itemId === plan.outgoingId)?.bay ?? 0)
            : 0;
    if (plan.operation !== 'replace' && covers.some((p) => p.bay === bay))
      return outcome(
        false,
        'covered-bay',
        'This bay already has its covering. Choose replacement, or extend into the adjacent bay.',
      );
    if (plan.operation === 'replace' && plan.keepCovered === false) {
      const outgoing = covers.find((p) => p.itemId === plan.outgoingId);
      if (outgoing) lower(outgoing);
    }
    const required = assemblySupportSlots(bay).filter(
      (slot) =>
        !Object.values(component?.parts ?? {}).some((p) => p.role === 'post' && p.slot === slot),
    );
    if (required.length !== plan.postIds.length || !plan.coverId || plan.bindingIds.length !== 4)
      return outcome(
        false,
        'material-choices',
        `Choose ${required.length} actual posts, one covering and four binding units for the remaining work.`,
      );
    required.forEach((slot, i) => phases.push(phase('post', plan.postIds[i]!, bay, slot)));
    const cover = phase('cover', plan.coverId, bay, `cover:${bay}`);
    [cover.binding1, cover.binding2, cover.binding3, cover.binding4] = plan.bindingIds;
    phases.push(cover);
    if (plan.operation === 'replace' && plan.keepCovered !== false) {
      const outgoing = covers.find((p) => p.itemId === plan.outgoingId);
      if (outgoing) lower(outgoing);
    }
  }
  if (!phases.length)
    return outcome(
      false,
      'nothing-to-change',
      'Choose an actual remaining part or a supported new bay.',
    );
  const selected = new Map<string, number>();
  for (const p of phases) {
    const grant = assemblyPermission(world, actorId, p, permissions);
    if (!grant)
      return outcome(
        false,
        'construction-permission',
        'You have no current permission for every phase at this site.',
      );
    if (
      !phaseInputs(p).length &&
      releasedMaterials(world, p).some((itemId) => !materialAuthorized(world, itemId, grant))
    )
      return outcome(
        false,
        'unauthorized-material',
        'You have no current construction-use permission to reclaim these actual materials.',
      );
    for (const [index, itemId] of phaseInputs(p).entries()) {
      if (
        !accessiblePossession(world, actorId, itemId) ||
        !materialAuthorized(world, itemId, grant) ||
        !materialUsable(
          world,
          itemId,
          family,
          index === 0 ? (p.operation === 'post' ? 'post' : 'cover') : 'binding',
        )
      )
        return outcome(
          false,
          'unauthorized-material',
          'Every selected unit needs current construction permission and intact qualified material.',
        );
      selected.set(itemId, (selected.get(itemId) ?? 0) + 1);
    }
    if (
      p.operation === 'post' &&
      materialPostHeight(world, p.itemId) !== postHeightForSlot(family, arrangementId, p.slot)
    )
      return outcome(
        false,
        'post-height',
        'Choose an actual post of the height required at this edge. Posts are never resized.',
      );
    if (p.operation === 'post' || p.operation === 'cover') {
      const reason = geometryProblem(world, actorId, family, p);
      if (reason) return outcome(false, 'invalid-placement', reason);
    }
  }
  for (const [itemId, count] of selected)
    if (availableItemQuantity(world, itemId) < count)
      return outcome(
        false,
        'missing-material',
        'The complete selected work requires more available material than you chose.',
      );
  if (
    (component
      ? Object.keys(component.parts).length + loweredAssemblyMaterials(world, root!.id).length
      : 0) +
      [...selected.values()].reduce((a, b) => a + b, 0) >
    family.limits.parts
  )
    return outcome(false, 'part-limit', 'The selected work exceeds the supported number of parts.');
  const plannedPosts = new Map(
    Object.values(component?.parts ?? {})
      .filter((p) => p.role === 'post')
      .map((p) => [p.slot, p.itemId]),
  );
  const loads = new Map<string, number>();
  for (const joint of Object.values(component?.joints ?? {})) {
    const slot = component!.parts[joint.postId]!.slot;
    loads.set(slot, (loads.get(slot) ?? 0) + 1);
  }
  const panels = worldRootEntities(world, true).flatMap((r) =>
    r.assembly ? assemblyShapes(world, r).panels : [],
  );
  let physicalCount = spatialBlockers(spatialMap(world)).length;
  for (const p of phases) {
    physicalCount += ['post', 'cover'].includes(p.operation)
      ? 1
      : ['lower', 'reclaim-post'].includes(p.operation)
        ? -1
        : 0;
    if (physicalCount > SPATIAL_LIMITS.maxBlockers)
      return outcome(
        false,
        'geometry-capacity',
        'This world has reached its supported physical geometry limit. Reclaim unused parts before adding another.',
      );
    if (p.operation === 'post') {
      if (plannedPosts.has(p.slot))
        return outcome(false, 'occupied-socket', 'That post position is already occupied.');
      plannedPosts.set(p.slot, p.itemId);
    }
    if (p.operation === 'lower') {
      const index = panels.findIndex((panel) => panel.id === p.itemId);
      if (index < 0) return outcome(false, 'missing-part', 'Choose an actual installed covering.');
      panels.splice(index, 1);
      for (const joint of Object.values(component?.joints ?? {}).filter(
        (j) => j.coverId === p.itemId,
      )) {
        const slot = component!.parts[joint.postId]!.slot;
        loads.set(slot, (loads.get(slot) ?? 0) - 1);
      }
    }
    if (p.operation === 'cover') {
      if (assemblySupportSlots(p.bay).some((slot) => !plannedPosts.has(slot)))
        return outcome(
          false,
          'missing-support',
          'The selected work leaves a required post missing.',
        );
      if (
        assemblySupportSlots(p.bay).some((slot) => (loads.get(slot) ?? 0) >= family.limits.sockets)
      )
        return outcome(
          false,
          'loaded-socket',
          'There is no spare binding socket. Choose removal before installation and its temporary exposure.',
        );
      const incoming = {
        id: p.itemId,
        ...coverGeometry(family, site, heading, p.bay, arrangementId),
        transmission: family.cover.transmission,
      };
      if (!coverExposureSupported(incoming, panels))
        return outcome(
          false,
          'cover-orientation',
          'These overlapping slopes cannot provide qualified rain coverage. Separate the coverings or align their slopes.',
        );
      if (coverLayersExceeded(incoming.bounds, panels, family.limits.layers))
        return outcome(
          false,
          'cover-layers',
          'The replacement would create a third covering layer. Choose removal before installation and its temporary exposure.',
        );
      panels.push(incoming);
      for (const slot of assemblySupportSlots(p.bay)) loads.set(slot, (loads.get(slot) ?? 0) + 1);
    }
  }
  // The first phase's full checks are shared with start/completion. Remaining phases
  // retain exact choices and may stop when current geometry/material/permission changes.
  const first = evaluateAssemblyPhase(world, actorId, phases[0]!, permissions);
  if (!first.ok) return first;
  const bindings: Record<string, string | SurfacePoint> = { site };
  const literal = (value: string | number | boolean): ActivityArgument => ({ literal: value });
  const nodes: ActivityNode[] = phases.map((p, index) => {
    const args: Record<string, ActivityArgument> = {};
    for (const [key, value] of Object.entries(p)) {
      if (value === undefined) continue;
      if (key === 'destination') {
        args[key] = { role: 'site' };
        continue;
      }
      if (
        [
          'itemId',
          'binding1',
          'binding2',
          'binding3',
          'binding4',
          'destinationId',
          'rootId',
        ].includes(key)
      ) {
        const role = `phase-${index}-${key}`;
        bindings[role] = String(value);
        args[key] = { role };
      } else if (typeof value === 'string' || typeof value === 'number') args[key] = literal(value);
    }
    return {
      kind: 'invoke',
      key: `phase-${index}`,
      name: family.labels[p.operation],
      command: 'assemble',
      args,
    };
  });
  return {
    id,
    actorId,
    type: 'compose',
    name: family.name,
    mode: 'replace',
    bindings,
    root: { kind: 'sequence', name: family.name, children: nodes },
  };
}
