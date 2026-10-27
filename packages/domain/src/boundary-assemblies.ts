import {
  boundaryPhaseBindings,
  boundaryPhaseHeldItems,
  boundaryPhaseInputs,
  boundaryPostGrid,
  boundaryPostSlot,
  validBoundaryPhase,
} from './boundary-phase.js';
import { boundaryRepairInputBindings, boundaryRepairInputIds } from './boundary-repair-inputs.js';
import {
  boundaryExitBatch,
  boundaryExitResult,
  type BoundaryExitBatch,
  type BoundaryExitPreparations,
} from './boundary-exits.js';
import { draftWorld, finishWorld } from './draft.js';
import {
  constructionPermissionBatch,
  recordAssemblyPermissionEffect,
} from './construction-permissions.js';
import { WorkBudgetError } from './work-budget.js';
import { ResourceReservationError } from './resource-claims.js';
import type { ProspectiveWork } from './action-capabilities.js';
import {
  gatePublicationPolicyCurrent,
  publishedGatePermissionId,
  prepareGatePublication,
  structuralExposurePolicyCurrent,
  type CampAssetPermission,
} from './camp-asset-permissions.js';
import {
  assemblyRoot,
  activeAssemblyEdit,
  loweredAssemblyMaterials,
  selectAssemblyPermission,
  materialAuthorized,
  materialUsable,
  assemblyActivityCommand,
  assemblyWorkPointCount,
  assemblyGroundDestination,
} from './assemblies.js';
import type { AssemblyPhasePreview } from './assemblies.js';
import type { ConstructionPermission } from './assembly-types.js';
import { definitionPin } from './world-modules.js';
import { accessiblePossession, canAccessContainer } from './object-access.js';
import { canHandleItems } from './item-handling.js';
import {
  availableItemQuantity,
  releaseInvocationResources,
  resourcesAfterEnding,
} from './resource-claims.js';
import { prospectiveWork } from './action-capabilities.js';
import { currentInventoryInspection } from './inventory-inspection.js';
import { ACTIVITY_LIMITS, validateActivityNode } from './action-experience.js';
import { seesEntity, pointVisionQuery } from './perception.js';
import {
  attachAssemblyPart,
  detachAssemblyPart,
  assemblyMovesReason,
  applyItemQuantities,
  destroyAssemblyPart,
} from './objects.js';
import { nextEntityId } from './data.js';
import { rootMembershipChanged, worldRootEntities } from './entity-index.js';
import { recordSemanticChange } from './dependencies.js';
import { outcome } from './events.js';
import {
  spatialBlockers,
  physicalIntersections,
  solidOverlap,
  surfaceById,
  surfaceHeight,
  surfaceSupportsRectangle,
  SPATIAL_LIMITS,
  type Bounds3,
  type WorldPoint,
  type SurfacePoint,
} from '@open-legend/spatial';
import {
  findPhysicalWorkApproach,
  physicalWorkPointAvailable,
  nearbyBodyEntities,
} from './spatial.js';
import type { Command, Entity, Outcome, WorldState } from './types.js';
import { entityGet, entitySet } from './entity-collection.js';
import {
  isAssemblyPlacement,
  bodyProfile,
  bodySpace,
  groundedSpatial,
  spatialMap,
  worldPlacement,
  worldPosition,
  worldSupport,
} from './spatial-state.js';
import type { PhysicalWorkPoint } from './spatial.js';
import { readState, writeState, sameDefinitionPin } from './state-owners.js';
import { finitePoint } from '@open-legend/spatial';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type {
  BoundaryPhase,
  BoundarySection,
  BoundaryPart,
  BoundaryComponent,
  BoundaryStructuralRole,
  GroundedPanelFamily,
  BoundaryPlan,
} from './boundary-types.js';
import {
  assemblyHeadings,
  assemblySite,
  assemblyShapes,
  boundaryBoxesAt,
  boundarySectionFrame,
  boundarySectionLocalFrame,
  boundarySolidAt,
  boundaryGateLayout,
  boundaryGateSweep,
  boundaryRunnerTieSolid,
  boundarySolidFromBoxes,
  localPoint,
} from './assembly-geometry.js';

/** Repair changes the installed material as well as spending its chosen inputs.
 * One grant must cover both; possession and the root's edit right are insufficient. */
function boundaryPhaseMaterials(world: WorldState, phase: BoundaryPhase): string[] {
  return [
    ...boundaryPhaseInputs(phase),
    ...boundaryReleasedMaterials(world, phase),
    ...(phase.operation === 'repair-boundary' ? [phase.itemId] : []),
  ];
}

export function boundaryIntegrityState(world: WorldState, rootId: string, itemId: string) {
  const component = entityGet(world.entities, rootId)?.assembly;
  if (component?.implementation !== 'grounded-panel-boundary') return;
  const family = boundaryFamily(world, component.family.id),
    part = component.parts[itemId];
  if (!family || !part || part.role === 'binding') return;
  const role: BoundaryStructuralRole =
    part.role === 'post' || part.role === 'gate-post'
      ? 'post'
      : part.role === 'panel' || part.role === 'access-panel'
        ? 'panel'
        : part.role === 'gate'
          ? 'gate'
          : 'rail';
  const definition = family.integrity[role],
    attribute = world.moduleManifest.definitions.find((entry) => entry.id === definition.id),
    value = readState(world, { entityId: itemId, definition }, 'owner');
  if (
    attribute?.schema.kind !== 'number' ||
    typeof attribute.schema.max !== 'number' ||
    value.status !== 'known' ||
    typeof value.value !== 'number'
  )
    return;
  return {
    definition,
    value: value.value,
    revision: value.revision,
    maximum: attribute.schema.max,
    role,
  };
}
export function boundaryRepairState(world: WorldState, rootId: string, itemId: string) {
  const state = boundaryIntegrityState(world, rootId, itemId),
    component = entityGet(world.entities, rootId)?.assembly,
    family = component && boundaryFamily(world, component.family.id);
  return state && family?.repair.roles.includes(state.role) ? state : undefined;
}

export const boundaryRemovalOperations = [
  'remove-boundary-panel',
  'remove-boundary-gate',
  'reclaim-post',
  'reclaim-lowered',
] as const;
function boundaryRemoval(phase: BoundaryPhase): boolean {
  return boundaryRemovalOperations.some((operation) => operation === phase.operation);
}
/** Exact outgoing identities, including the real ties/runners; custody never
 * supplies construction permission and dismantling creates no replacement items. */
export function boundaryReleasedMaterials(world: WorldState, phase: BoundaryPhase): string[] {
  const root = assemblyRoot(world, phase),
    component = root?.assembly;
  if (component?.implementation !== 'grounded-panel-boundary') return [];
  if (phase.operation === 'remove-boundary-panel') {
    const section = Object.values(component.sections).find(
      (entry) => entry.kind !== 'gate' && entry.panelId === phase.itemId,
    );
    return section && section.kind !== 'gate' ? [section.panelId, ...section.bindingIds] : [];
  }
  if (phase.operation === 'remove-boundary-gate') {
    const gate = component.gates[phase.itemId];
    return gate ? [phase.itemId, ...gate.railIds, ...gate.bindingIds] : [];
  }
  if (phase.operation === 'reclaim-post') {
    const part = component.parts[phase.itemId];
    return part && (part.role === 'post' || part.role === 'gate-post') ? [part.itemId] : [];
  }
  if (phase.operation === 'reclaim-lowered') {
    const item = entityGet(world.entities, phase.itemId),
      placement = item?.placement;
    return !component.parts[phase.itemId] &&
      item?.item?.assemblyClaim?.rootId === root!.id &&
      placement?.mode === 'contained' &&
      entityGet(world.entities, placement.parentEntityId)?.kind === 'item-pile'
      ? [phase.itemId]
      : [];
  }
  return [];
}
function boundaryOutgoingSolid(world: WorldState, phase: BoundaryPhase) {
  const root = assemblyRoot(world, phase);
  if (!root) return;
  const ids = boundaryReleasedMaterials(world, phase);
  if (!ids.length) return;
  if (phase.operation === 'reclaim-lowered') {
    const placement = entityGet(world.entities, phase.itemId)?.placement;
    const pile =
      placement?.mode === 'contained'
        ? entityGet(world.entities, placement.parentEntityId)
        : undefined;
    return pile ? { bounds: bodySpace(world, pile) } : undefined;
  }
  const selected = new Set(ids),
    shapes = assemblyShapes(world, root).posts.filter((shape) => selected.has(shape.id));
  return shapes.length
    ? boundarySolidFromBoxes(shapes.flatMap((shape) => shape.boxes ?? [shape.bounds]))
    : undefined;
}

/** The ordinary ground alternative is the reached final work face, not the root
 * anchor (which is itself an occupied post in this family). Recheck at effect. */
function boundaryReclaimPoint(
  world: WorldState,
  actorId: string,
  phase: BoundaryPhase,
): SurfacePoint | undefined {
  const actor = entityGet(world.entities, actorId),
    action = actor?.actor?.action;
  if (!actor) return;
  const last = assemblyWorkPointCount(phase) - 1;
  if (
    action?.assemblyPhase?.editId === phase.editId &&
    action.assemblyCorner === last &&
    action.stage === 'working'
  ) {
    const support = worldSupport(actor);
    return support ? { ...worldPosition(actor), surfaceId: support } : undefined;
  }
  return findPhysicalWorkApproach(
    world,
    actor,
    boundaryWorkCandidates(world, phase, last, actorId),
    world.itemHandling.reach,
  )?.candidate.stance;
}

function boundaryOperationSolid(
  world: WorldState,
  actorId: string,
  phase: BoundaryPhase,
  family: GroundedPanelFamily,
) {
  if (phase.operation === 'repair-boundary') {
    const root = assemblyRoot(world, phase),
      shape = root && assemblyShapes(world, root).posts.find((entry) => entry.id === phase.itemId);
    return shape && boundarySolidFromBoxes(shape.boxes ?? [shape.bounds]);
  }
  if (!boundaryRemoval(phase)) return boundaryIncomingSolid(world, phase, family);
  const outgoing = boundaryOutgoingSolid(world, phase);
  if (!outgoing || phase.destinationId) return outgoing;
  const point = boundaryReclaimPoint(world, actorId, phase),
    footprint = family.salvage.footprint;
  return point
    ? boundarySolidFromBoxes([
        outgoing.bounds,
        {
          min: { x: point.x - footprint.width / 2, y: point.y, z: point.z - footprint.length / 2 },
          max: {
            x: point.x + footprint.width / 2,
            y: point.y + footprint.height,
            z: point.z + footprint.length / 2,
          },
        },
      ])
    : undefined;
}

/** Shared actual solid faces for repair and deliberate material impacts. */
export function boundaryMaterialWorkQuery(
  world: WorldState,
  rootId: string,
  actorId: string,
): (itemId: string) => PhysicalWorkPoint[] {
  const root = entityGet(world.entities, rootId),
    component = root?.assembly,
    family = component && boundaryFamily(world, component.family.id),
    actor = entityGet(world.entities, actorId),
    site = root && assemblySite(root),
    shapes = new Map(
      root ? assemblyShapes(world, root).posts.map((shape) => [shape.id, shape]) : [],
    );
  return (itemId) => {
    const shape = shapes.get(itemId);
    if (!family || !actor || !site || !shape) return [];
    // Work at a real exposed solid, including an access panel's actual woven
    // pieces. Its empty opening is never a substitute working surface.
    return (shape.boxes ?? [shape.bounds]).flatMap((bounds) => {
      const centre = {
          x: (bounds.min.x + bounds.max.x) / 2,
          y: (bounds.min.y + bounds.max.y) / 2,
          z: (bounds.min.z + bounds.max.z) / 2,
        },
        clearance = bodyProfile(actor).radius + family.workPoints.clearance;
      return (['x', 'z'] as const).flatMap((axis) =>
        (['min', 'max'] as const).map((side) => {
          const sign = side === 'min' ? -1 : 1;
          return {
            point: { ...centre, [axis]: bounds[side][axis] + sign * SPATIAL_LIMITS.epsilon * 2 },
            stance: {
              ...centre,
              y: site.y,
              [axis]: bounds[side][axis] + sign * clearance,
              surfaceId: site.surfaceId,
            },
          };
        }),
      );
    });
  };
}
export function boundaryMaterialWorkCandidates(
  world: WorldState,
  rootId: string,
  itemId: string,
  actorId: string,
): PhysicalWorkPoint[] {
  return boundaryMaterialWorkQuery(world, rootId, actorId)(itemId);
}

/** Native approach candidates remain with the shared body/reach/path owner. */
export function boundaryPostWorkCandidates(
  world: WorldState,
  actorId: string,
  phase: Pick<BoundaryPhase, 'slot' | 'itemId' | 'destination' | 'heading'>,
  family: Pick<GroundedPanelFamily, 'roles' | 'geometry' | 'workPoints'>,
): PhysicalWorkPoint[] {
  const actor = entityGet(world.entities, actorId),
    item = entityGet(world.entities, phase.itemId)?.item,
    grid = boundaryPostGrid(phase.slot);
  if (!actor || !item || !grid) return [];
  const role = sameDefinitionPin(item.definitionPin, family.roles.post)
    ? 'post'
    : sameDefinitionPin(item.definitionPin, family.roles.gatePost)
      ? 'gate-post'
      : undefined;
  if (!role) return [];
  const u = grid[0] * family.geometry.section.spacing,
    v = grid[1] * family.geometry.section.spacing;
  const point = localPoint(phase.destination, phase.heading, u, v),
    bounds = boundaryBoxesAt(family.geometry, role, point, phase.heading)[0]!,
    half = family.geometry.section.postSection / 2,
    offset = bodyProfile(actor).radius + half + family.workPoints.clearance;
  return [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ].map(([du, dv]) => ({
    obstruction: { bounds },
    point: localPoint(
      phase.destination,
      phase.heading,
      u + du! * half,
      v + dv! * half,
      family.workPoints.postHeight,
    ),
    stance: {
      ...localPoint(phase.destination, phase.heading, u + du! * offset, v + dv! * offset),
      surfaceId: phase.destination.surfaceId,
    },
  }));
}

export function boundaryFamily(world: WorldState, id: string): GroundedPanelFamily | undefined {
  const family = world.assemblyFamilies?.[id];
  return family?.implementation === 'grounded-panel-boundary' ? family : undefined;
}
export function boundaryPostRole(world: WorldState, id: string, family: GroundedPanelFamily) {
  const item = entityGet(world.entities, id)?.item;
  return !item
    ? undefined
    : sameDefinitionPin(item.definitionPin, family.roles.post)
      ? 'post'
      : sameDefinitionPin(item.definitionPin, family.roles.gatePost)
        ? 'gate-post'
        : undefined;
}
export function boundaryPanelInfo(
  world: WorldState,
  phase: BoundaryPhase,
  family: GroundedPanelFamily,
) {
  if (phase.operation !== 'boundary-panel') return;
  const root = assemblyRoot(world, phase),
    component = root?.assembly;
  if (!root || component?.implementation !== 'grounded-panel-boundary') return;
  const from = Object.values(component.parts).find(
      (part) => (part.role === 'post' || part.role === 'gate-post') && part.slot === phase.fromSlot,
    ),
    to = Object.values(component.parts).find(
      (part) => (part.role === 'post' || part.role === 'gate-post') && part.slot === phase.toSlot,
    );
  const fromGrid = boundaryPostGrid(phase.fromSlot),
    toGrid = boundaryPostGrid(phase.toSlot);
  if (
    !from ||
    !to ||
    !fromGrid ||
    !toGrid ||
    Math.abs(fromGrid[0] - toGrid[0]) + Math.abs(fromGrid[1] - toGrid[1]) !== 1
  )
    return;
  const frame = boundarySectionFrame(world, root, from.itemId, to.itemId),
    item = entityGet(world.entities, phase.itemId)?.item;
  const role =
    item && sameDefinitionPin(item.definitionPin, family.roles.panel)
      ? ('panel' as const)
      : item && sameDefinitionPin(item.definitionPin, family.roles.parkingPanel)
        ? ('access-panel' as const)
        : undefined;
  return frame && role ? { root, component, from, to, frame, role } : undefined;
}

export function boundaryGateSupports(
  world: WorldState,
  root: Entity,
  family: GroundedPanelFamily,
  slots: readonly [string, string, string],
  parkingSectionId: string,
) {
  const component = root.assembly;
  if (component?.implementation !== family.implementation) return;
  const posts = slots.map((slot) =>
      Object.values(component.parts).find(
        (part) => part.role === 'gate-post' && part.slot === slot,
      ),
    ),
    grids = slots.map(boundaryPostGrid);
  if (posts.some((post) => !post) || grids.some((grid) => !grid)) return;
  const [a, b, c] = grids as [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  if (
    Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) !== 1 ||
    c[0] - b[0] !== b[0] - a[0] ||
    c[1] - b[1] !== b[1] - a[1]
  )
    return;
  const [from, to, third] = posts as [
      NonNullable<(typeof posts)[number]>,
      NonNullable<(typeof posts)[number]>,
      NonNullable<(typeof posts)[number]>,
    ],
    parking = component.sections[parkingSectionId],
    fromPlacement = entityGet(world.entities, from.itemId)?.placement,
    toPlacement = entityGet(world.entities, to.itemId)?.placement;
  if (
    !parking ||
    parking.kind !== 'access-panel' ||
    ![parking.fromPostId, parking.toPostId].includes(to.itemId) ||
    ![parking.fromPostId, parking.toPostId].includes(third.itemId) ||
    !isAssemblyPlacement(fromPlacement) ||
    !isAssemblyPlacement(toPlacement)
  )
    return;
  const layout = boundaryGateLayout(
    family.geometry,
    fromPlacement.local,
    toPlacement.local,
    root.spatial.heading,
    'closed',
    family.presentation.bindingSize,
  );
  return layout
    ? {
        root,
        component,
        posts: [from, to, third] as const,
        parking,
        layout,
        fromLocal: fromPlacement.local,
      }
    : undefined;
}
export function boundaryGateInfo(
  world: WorldState,
  phase: BoundaryPhase,
  family: GroundedPanelFamily,
) {
  if (phase.operation !== 'boundary-gate') return;
  const root = assemblyRoot(world, phase);
  return root
    ? boundaryGateSupports(
        world,
        root,
        family,
        [phase.fromSlot, phase.toSlot, phase.thirdSlot],
        phase.parkingSectionId,
      )
    : undefined;
}

function boundaryGatePieces(world: WorldState, phase: BoundaryPhase, family: GroundedPanelFamily) {
  const info = boundaryGateInfo(world, phase, family);
  if (!info || phase.operation !== 'boundary-gate') return;
  const parts = [
    { id: phase.itemId, role: 'gate' as const, local: info.layout.leaf },
    ...info.layout.rails.map((local, index) => ({
      id: index === 0 ? phase.rail1Id : phase.rail2Id,
      role: index === 0 ? ('first-rail' as const) : ('second-rail' as const),
      local,
    })),
    ...info.layout.hangers.map((local, index) => ({
      id: index === 0 ? phase.binding5 : phase.binding6,
      role: index === 0 ? ('first-hanger' as const) : ('second-hanger' as const),
      local,
    })),
  ];
  return [
    ...parts.flatMap((part) =>
      boundaryBoxesAt(
        family.geometry,
        part.role,
        localPoint(phase.destination, phase.heading, part.local.x, part.local.z, part.local.y),
        info.layout.heading,
      ).map((bounds) => ({
        id: part.id,
        role:
          part.role === 'first-hanger' || part.role === 'second-hanger'
            ? ('binding' as const)
            : part.role,
        bounds,
      })),
    ),
    ...info.layout.runnerTies.map((local, index) => ({
      id: boundaryPhaseBindings(phase)[index]!,
      role: 'binding' as const,
      bounds: boundaryRunnerTieSolid(
        family,
        localPoint(phase.destination, phase.heading, local.x, local.z, local.y),
        info.layout.heading,
      ).bounds,
    })),
  ];
}
function boundaryGateIncoming(
  world: WorldState,
  phase: BoundaryPhase,
  family: GroundedPanelFamily,
) {
  const pieces = boundaryGatePieces(world, phase, family);
  return pieces && boundarySolidFromBoxes(pieces.map((piece) => piece.bounds));
}
/** The finite family admits one path or simple cycle. This is only topology;
 * native admission and installation separately preserve actual occupied exits. */
function boundarySectionGraph(
  sections: readonly Pick<BoundarySection, 'fromPostId' | 'toPostId'>[],
): { problem: string } | { components: number; hasCycle: boolean; vertices: Set<string> } {
  const adjacent = new Map<string, Set<string>>(),
    edges = new Set<string>();
  for (const section of sections) {
    const edge = JSON.stringify([section.fromPostId, section.toPostId].sort());
    if (section.fromPostId === section.toPostId || edges.has(edge))
      return { problem: 'Choose a new section between two different neighboring posts.' };
    edges.add(edge);
    for (const [from, to] of [
      [section.fromPostId, section.toPostId],
      [section.toPostId, section.fromPostId],
    ] as const) {
      const neighbors = adjacent.get(from) ?? new Set<string>();
      neighbors.add(to);
      adjacent.set(from, neighbors);
      if (neighbors.size > 2)
        return { problem: 'A post can join at most two sections in this finite boundary.' };
    }
  }
  const unseen = new Set(adjacent.keys());
  let components = 0,
    hasCycle = false;
  while (unseen.size) {
    const pending = [unseen.values().next().value!];
    let cycle = true;
    components++;
    while (pending.length) {
      const id = pending.pop()!;
      if (!unseen.delete(id)) continue;
      const neighbors = adjacent.get(id)!;
      if (neighbors.size !== 2) cycle = false;
      for (const next of neighbors) if (unseen.has(next)) pending.push(next);
    }
    hasCycle ||= cycle;
  }
  return { components, hasCycle, vertices: new Set(adjacent.keys()) };
}
export function boundarySectionGraphProblem(
  sections: readonly Pick<BoundarySection, 'fromPostId' | 'toPostId'>[],
  requireConnected = true,
): string | undefined {
  const graph = boundarySectionGraph(sections);
  if ('problem' in graph) return graph.problem;
  if (graph.components > 1 && (requireConnected || graph.hasCycle))
    return 'Extend the existing connected boundary rather than start a disconnected section.';
}
function boundarySectionExtensionProblem(
  existing: readonly BoundarySection[],
  addition: Pick<BoundarySection, 'fromPostId' | 'toPostId'>,
): string | undefined {
  const before = boundarySectionGraph(existing),
    after = boundarySectionGraph([...existing, addition]);
  if ('problem' in before) return before.problem;
  if ('problem' in after) return after.problem;
  if (after.components <= 1) return;
  // Loss/removal can leave several valid paths in one root. Reconnecting them
  // takes real sequential work: an extension must touch those paths, never add
  // a separate component or seal one fragment into its own isolated cycle.
  if (
    before.components <= 1 ||
    after.hasCycle ||
    after.components > before.components ||
    (!before.vertices.has(addition.fromPostId) && !before.vertices.has(addition.toPostId))
  )
    return 'Extend or reconnect the existing boundary rather than start a disconnected section.';
}
export function boundaryIncomingSolid(
  world: WorldState,
  phase: BoundaryPhase,
  family: GroundedPanelFamily,
) {
  if (phase.operation === 'boundary-gate') return boundaryGateIncoming(world, phase, family);
  if (phase.operation === 'post') {
    const role = boundaryPostRole(world, phase.itemId, family),
      grid = boundaryPostGrid(phase.slot);
    return role && grid
      ? boundarySolidAt(
          family.geometry,
          role,
          localPoint(
            phase.destination,
            phase.heading,
            grid[0] * family.geometry.section.spacing,
            grid[1] * family.geometry.section.spacing,
          ),
          phase.heading,
        )
      : undefined;
  }
  const info = boundaryPanelInfo(world, phase, family);
  return info
    ? boundarySolidAt(
        family.geometry,
        info.role,
        localPoint(
          phase.destination,
          phase.heading,
          info.frame.local.x,
          info.frame.local.z,
          info.frame.local.y,
        ),
        info.frame.heading,
      )
    : undefined;
}
export function boundaryPermission(
  world: WorldState,
  actorId: string,
  phase: BoundaryPhase,
  permissions: readonly ConstructionPermission[],
): ConstructionPermission | undefined {
  const family = boundaryFamily(world, phase.familyId),
    solid = family && boundaryOperationSolid(world, actorId, phase, family);
  if (!solid) return;
  return selectAssemblyPermission(
    world,
    actorId,
    {
      operation: phase.operation,
      destination: phase.destination,
      bounds: solid.bounds,
      materials: boundaryPhaseMaterials(world, phase),
      rootId: phase.rootId,
      requestId: phase.requestId,
    },
    phase.permissionId === undefined
      ? permissions
      : permissions.filter((permission) => permission.id === phase.permissionId),
  );
}
/** Walls or nearby belongings can block the normal stance at an attachment. Step
 * along that same exposed face too; every candidate still needs full body,
 * reach, ray, prospective-part and route checks through the shared owner. */
function boundaryAttachmentStances(
  phase: BoundaryPhase,
  heading: number,
  centre: { x: number; y: number; z: number },
  offset: number,
) {
  return [-1, 1].flatMap((side) =>
    [0, -1, 1].map((along) => ({
      side,
      stance: {
        ...localPoint(
          { ...centre, y: phase.destination.y },
          heading,
          along * offset,
          side * offset,
        ),
        surfaceId: phase.destination.surfaceId,
      },
    })),
  );
}
export function boundaryWorkCandidates(
  world: WorldState,
  phase: BoundaryPhase,
  corner: number,
  actorId: string,
): PhysicalWorkPoint[] {
  const family = boundaryFamily(world, phase.familyId),
    actor = entityGet(world.entities, actorId);
  if (!family || !actor) return [];
  if (phase.operation === 'repair-boundary')
    return corner === 0 && phase.rootId
      ? boundaryMaterialWorkCandidates(world, phase.rootId, phase.itemId, actorId)
      : [];
  if (phase.operation === 'post' || phase.operation === 'reclaim-post')
    return corner === 0 ? boundaryPostWorkCandidates(world, actorId, phase, family) : [];
  if (phase.operation === 'reclaim-lowered') {
    const placement = entityGet(world.entities, phase.itemId)?.placement;
    const pile =
      placement?.mode === 'contained'
        ? entityGet(world.entities, placement.parentEntityId)
        : undefined;
    const point = pile?.placement;
    if (corner !== 0 || point?.mode !== 'world' || !point.supportSurfaceId || !pile) return [];
    const bounds = bodySpace(world, pile),
      profile = bodyProfile(actor),
      clearance = profile.radius + family.workPoints.clearance;
    // The pile is the reached target, not a place to stand inside its displayed
    // footprint. Keep other bodies and belongings in the shared clearance check.
    return [
      { x: bounds.min.x - clearance, z: point.position.z },
      { x: bounds.max.x + clearance, z: point.position.z },
      { x: point.position.x, z: bounds.min.z - clearance },
      { x: point.position.x, z: bounds.max.z + clearance },
    ].map((stance) => ({
      point: { ...point.position, y: bounds.max.y },
      stance: { ...stance, y: point.position.y, surfaceId: point.supportSurfaceId! },
    }));
  }
  if (phase.operation === 'remove-boundary-gate') {
    const root = assemblyRoot(world, phase),
      component = root?.assembly;
    const gate =
      component?.implementation === 'grounded-panel-boundary'
        ? component.gates[phase.itemId]
        : undefined;
    const from = gate && entityGet(world.entities, gate.postIds[0])?.placement,
      to = gate && entityGet(world.entities, gate.postIds[1])?.placement;
    if (
      !gate ||
      !root ||
      !isAssemblyPlacement(from) ||
      !isAssemblyPlacement(to) ||
      corner < 0 ||
      corner >= 6
    )
      return [];
    const layout = boundaryGateLayout(
      family.geometry,
      from.local,
      to.local,
      root.spatial.heading,
      gate.position,
      family.presentation.bindingSize,
    )!;
    const local = corner < 4 ? layout.runnerTies[corner]! : layout.hangers[corner - 4]!;
    const shape = assemblyShapes(world, root).posts.find(
      (entry) => entry.id === gate.bindingIds[corner],
    );
    if (!shape) return [];
    const centre = localPoint(phase.destination, phase.heading, local.x, local.z),
      normal = localPoint({ x: 0, y: 0, z: 0 }, layout.heading, 0, 1);
    const offset =
      bodyProfile(actor).radius +
      family.geometry.section.postSection / 2 +
      family.workPoints.clearance;
    return boundaryAttachmentStances(phase, layout.heading, centre, offset).map(
      ({ side, stance }) => ({
        // Reach the exposed underside of a runner tie, or the exposed face of
        // an actual hanger above the leaf. Neither target lies inside its support.
        point:
          corner < 4
            ? { ...centre, y: shape.bounds.min.y - SPATIAL_LIMITS.epsilon * 2 }
            : {
                x: centre.x + (normal.x * side * (shape.bounds.max.x - shape.bounds.min.x)) / 2,
                y: (shape.bounds.min.y + shape.bounds.max.y) / 2,
                z: centre.z + (normal.z * side * (shape.bounds.max.z - shape.bounds.min.z)) / 2,
              },
        stance,
      }),
    );
  }
  if (phase.operation === 'boundary-gate') {
    const info = boundaryGateInfo(world, phase, family);
    if (!info || corner < 0 || corner >= 6) return [];
    const local = corner < 4 ? info.layout.runnerTies[corner]! : info.layout.hangers[corner - 4]!,
      height = corner < 4 ? family.workPoints.runnerHeight : family.geometry.gate.height,
      point = localPoint(phase.destination, phase.heading, local.x, local.z, height),
      offset =
        bodyProfile(actor).radius +
        family.geometry.section.postSection / 2 +
        family.workPoints.clearance,
      obstruction = boundaryIncomingSolid(world, phase, family);
    return boundaryAttachmentStances(phase, info.layout.heading, point, offset).map(
      ({ stance }) => ({
        point,
        ...(obstruction ? { obstruction } : {}),
        stance,
      }),
    );
  }
  const root = assemblyRoot(world, phase),
    component = root?.assembly;
  const section =
    phase.operation === 'remove-boundary-panel' &&
    component?.implementation === 'grounded-panel-boundary'
      ? Object.values(component.sections).find(
          (entry) => entry.kind !== 'gate' && entry.panelId === phase.itemId,
        )
      : undefined;
  const panelPhase =
    section && section.kind !== 'gate'
      ? {
          ...phase,
          operation: 'boundary-panel' as const,
          sectionId: section.id,
          fromSlot: component!.parts[section.fromPostId]!.slot,
          toSlot: component!.parts[section.toPostId]!.slot,
          binding1: section.bindingIds[0]!,
          binding2: section.bindingIds[1]!,
        }
      : phase;
  const info = boundaryPanelInfo(world, panelPhase, family),
    tie = family.joints.panelTies[corner];
  if (!info || !tie) return [];
  const post = entityGet(
    world.entities,
    tie.end === 0 ? info.from.itemId : info.to.itemId,
  )?.placement;
  if (!isAssemblyPlacement(post)) return [];
  const base = localPoint(
      phase.destination,
      phase.heading,
      post.local.x,
      post.local.z,
      post.local.y,
    ),
    half = family.geometry.section.postSection / 2,
    offset = bodyProfile(actor).radius + half + family.workPoints.clearance,
    obstruction = boundaryIncomingSolid(world, phase, family);
  return boundaryAttachmentStances(phase, info.frame.heading, base, offset).map(
    ({ side, stance }) => ({
      ...(obstruction ? { obstruction } : {}),
      point: localPoint(base, info.frame.heading, 0, side * half, tie.height),
      stance,
    }),
  );
}
/** Integrity is personally operable physical condition, independent of custody or social consent. */
export function boundaryMaterialIntact(
  world: WorldState,
  id: string,
  family: GroundedPanelFamily,
  role: 'post' | 'gatePost' | 'panel' | 'parkingPanel' | 'gate' | 'rail' | 'binding',
): boolean {
  const item = entityGet(world.entities, id)?.item,
    definition = item && world.itemDefinitions[item.definitionPin.id];
  if (
    !definition ||
    !sameDefinitionPin(item!.definitionPin, definitionPin(definition)) ||
    !sameDefinitionPin(item!.definitionPin, family.roles[role])
  )
    return false;
  if (role === 'binding') {
    const material = definition.assemblyMaterial,
      owner = material && world.assemblyFamilies?.[material.familyId];
    return (
      owner?.implementation === 'four-corner-flexible-bays' &&
      materialUsable(world, id, owner, 'binding')
    );
  }
  const structural = role === 'gatePost' ? 'post' : role === 'parkingPanel' ? 'panel' : role,
    pin = family.integrity[structural],
    current = readState(world, { entityId: id, definition: pin }, 'owner');
  return current.status === 'known' && typeof current.value === 'number' && current.value > 0;
}

function boundaryPartRole(part: BoundaryPart) {
  return part.role === 'gate-post'
    ? ('gatePost' as const)
    : part.role === 'access-panel'
      ? ('parkingPanel' as const)
      : part.role === 'first-rail' || part.role === 'second-rail'
        ? ('rail' as const)
        : part.role;
}
function destroyedBoundaryParts(
  world: WorldState,
  component: BoundaryComponent,
  family: GroundedPanelFamily,
  failingId?: string,
) {
  return Object.values(component.parts).filter(
    (part) =>
      part.role !== 'binding' &&
      (part.itemId === failingId ||
        !boundaryMaterialIntact(world, part.itemId, family, boundaryPartRole(part))),
  );
}
function boundaryStructuralRole(part: BoundaryPart): BoundaryStructuralRole {
  return part.role === 'post' || part.role === 'gate-post'
    ? 'post'
    : part.role === 'panel' || part.role === 'access-panel'
      ? 'panel'
      : part.role === 'gate'
        ? 'gate'
        : 'rail';
}
function boundaryFailureMaterialCount(
  world: WorldState,
  rootId: string,
  component: BoundaryComponent,
  family: GroundedPanelFamily,
  destroyed: readonly BoundaryPart[],
) {
  const outputs = destroyed.reduce((sum, part) => {
    const role = boundaryStructuralRole(part);
    return sum + family.salvage.outputs[role].reduce((n, output) => n + output.quantity, 0);
  }, 0);
  return (
    Object.keys(component.parts).length -
    destroyed.length +
    loweredAssemblyMaterials(world, rootId).length +
    outputs
  );
}
/** The actual failure owner and impact admission use the same complete material
 * count. Refuse an uncommitted impact before a full salvage allowance stalls time. */
export function boundaryFailureWithinLimit(world: WorldState, rootId: string, failingId: string) {
  const component = entityGet(world.entities, rootId)?.assembly,
    family = component && boundaryFamily(world, component.family.id);
  return (
    component?.implementation === 'grounded-panel-boundary' &&
    !!family &&
    boundaryFailureMaterialCount(
      world,
      rootId,
      component,
      family,
      destroyedBoundaryParts(world, component, family, failingId),
    ) <= family.limits.parts
  );
}

/** Collapse is local to this lightweight family. Plan every reverse dependency
 * before the compound writes custody, salvage or geometry; there is no falling
 * body effect and no second destruction/update loop. */
export function commitBoundaryFailure(world: WorldState, rootId: string, changedId: string) {
  const root = entityGet(world.entities, rootId),
    component = root?.assembly,
    family = component && boundaryFamily(world, component.family.id),
    site = root && assemblySite(root);
  if (
    component?.implementation !== 'grounded-panel-boundary' ||
    !family ||
    !site ||
    component.retired
  )
    return;
  const changed = component.parts[changedId];
  if (!changed || boundaryMaterialIntact(world, changedId, family, boundaryPartRole(changed)))
    return;
  const destroyed = destroyedBoundaryParts(world, component, family),
    removed = new Set(destroyed.map((part) => part.itemId));
  if (changed.role === 'binding') removed.add(changedId);
  for (const section of Object.values(component.sections)) {
    if (section.kind === 'gate') continue;
    if (
      removed.has(section.panelId) ||
      removed.has(section.fromPostId) ||
      removed.has(section.toPostId) ||
      section.bindingIds.some((id) => !boundaryMaterialIntact(world, id, family, 'binding'))
    )
      for (const id of [section.panelId, ...section.bindingIds]) removed.add(id);
  }
  for (const [id, gate] of Object.entries(component.gates)) {
    const parking = component.sections[gate.parkingSectionId];
    if (
      removed.has(id) ||
      gate.postIds.some((id) => removed.has(id)) ||
      gate.railIds.some((id) => removed.has(id)) ||
      gate.bindingIds.some((id) => !boundaryMaterialIntact(world, id, family, 'binding')) ||
      !parking ||
      parking.kind === 'gate' ||
      removed.has(parking.panelId)
    )
      for (const partId of [id, ...gate.railIds, ...gate.bindingIds]) removed.add(partId);
  }
  if (
    boundaryFailureMaterialCount(world, rootId, component, family, destroyed) > family.limits.parts
  )
    throw new WorkBudgetError('work-unavailable', 'effects');
  const surface = surfaceById(spatialMap(world), site.surfaceId),
    shape = assemblyShapes(world, root!).posts.find((entry) => entry.id === changedId),
    halfX = family.salvage.footprint.width / 2,
    halfZ = family.salvage.footprint.length / 2;
  if (!surface || !shape) throw new Error('The failed material has no supported reclaim site.');
  const origin = {
    x: (shape.bounds.min.x + shape.bounds.max.x) / 2,
    z: (shape.bounds.min.z + shape.bounds.max.z) / 2,
  };
  const point = {
    x: Math.max(surface.minX + halfX, Math.min(surface.maxX - halfX, origin.x)),
    y: site.y,
    z: Math.max(surface.minZ + halfZ, Math.min(surface.maxZ - halfZ, origin.z)),
    surfaceId: site.surfaceId,
  };
  if (
    !surfaceSupportsRectangle(spatialMap(world), surface, {
      minX: point.x - halfX,
      maxX: point.x + halfX,
      minZ: point.z - halfZ,
      maxZ: point.z + halfZ,
    })
  )
    throw new Error('The failed material needs supported ground for its actual salvage.');
  const destination = assemblyGroundDestination(world, point, family),
    destroyedIds = new Set(destroyed.map((part) => part.itemId)),
    lowered: string[] = [],
    outputs: string[] = [];
  for (const id of removed) {
    const part = component.parts[id]!;
    if (destroyedIds.has(id)) {
      const key = boundaryStructuralRole(part);
      outputs.push(
        ...destroyAssemblyPart(
          world,
          id,
          rootId,
          destination,
          { entityId: id, definition: family.integrity[key] },
          family.salvage.outputs[key],
        ),
      );
    } else {
      detachAssemblyPart(world, id, rootId, destination, true);
      lowered.push(id);
    }
    delete component.parts[id];
  }
  for (const [id, section] of Object.entries(component.sections))
    if (removed.has(section.kind === 'gate' ? section.gateId : section.panelId))
      delete component.sections[id];
  for (const [id, gate] of Object.entries(component.gates))
    if (removed.has(id)) delete component.gates[id];
  for (const [id, joint] of Object.entries(component.joints))
    if (removed.has(joint.partId) || removed.has(joint.supportId) || removed.has(joint.bindingId))
      delete component.joints[id];
  component.revision++;
  world.assemblyGeometryRevision = (world.assemblyGeometryRevision ?? 0) + 1;
  return { lowered, destroyed: [...destroyedIds], outputs, destination };
}
function boundaryInputRole(
  world: WorldState,
  family: GroundedPanelFamily,
  phase: BoundaryPhase,
  index: number,
  itemId: string,
) {
  if (phase.operation === 'post')
    return boundaryPostRole(world, itemId, family) === 'post' ? 'post' : 'gatePost';
  if (phase.operation === 'boundary-gate')
    return index === 0 ? 'gate' : index < 3 ? 'rail' : 'binding';
  if (index !== 0) return 'binding';
  const pin = entityGet(world.entities, itemId)?.item?.definitionPin;
  return pin && sameDefinitionPin(pin, family.roles.panel) ? 'panel' : 'parkingPanel';
}
function boundaryInputIntact(
  world: WorldState,
  family: GroundedPanelFamily,
  phase: BoundaryPhase,
  index: number,
  id: string,
): boolean {
  if (phase.operation !== 'repair-boundary')
    return boundaryMaterialIntact(
      world,
      id,
      family,
      boundaryInputRole(world, family, phase, index, id),
    );
  const item = entityGet(world.entities, id)?.item;
  return !!item && sameDefinitionPin(item.definitionPin, family.repair.input);
}
function boundaryPostToolAvailable(
  world: WorldState,
  actorId: string,
  toolId: string,
  family: GroundedPanelFamily,
  repair = false,
): boolean {
  const tool = entityGet(world.entities, toolId)?.item,
    definition = tool && world.itemDefinitions[tool.definitionPin.id];
  return (
    !!definition &&
    accessiblePossession(world, actorId, toolId) &&
    sameDefinitionPin(tool!.definitionPin, definitionPin(definition)) &&
    (repair ? family.repair.toolDefinitions : family.postTools).some((pin) =>
      sameDefinitionPin(pin, tool!.definitionPin),
    )
  );
}
/** Native phase admission and completion use this same pure read. Unsupported work
 * remains unavailable until its real consumers are installed. */
export function evaluateBoundaryPhase(
  world: WorldState,
  actorId: string,
  phase: BoundaryPhase,
  permissions: readonly ConstructionPermission[],
  invocationId?: string,
  preview?: AssemblyPhasePreview,
): Outcome {
  const refuse = (code: string, message: string) => outcome(false, code, message),
    actor = entityGet(world.entities, actorId),
    family = boundaryFamily(world, phase.familyId);
  if (!validBoundaryPhase(phase))
    return refuse('invalid-phase', 'Choose a complete supported construction phase.');
  if (!family || !actor?.actor?.alive || !canHandleItems(world, actor))
    return refuse('construction-unavailable', 'This person cannot perform this construction work.');
  if (
    !sameDefinitionPin(
      { id: phase.familyId, version: phase.familyVersion, digest: phase.familyDigest },
      definitionPin(family),
    )
  )
    return refuse(
      'stale-definition',
      'The construction rules changed. Review the current exact parts and work before starting again.',
    );
  if (
    phase.operation !== 'post' &&
    phase.operation !== 'boundary-panel' &&
    phase.operation !== 'boundary-gate' &&
    phase.operation !== 'repair-boundary' &&
    !boundaryRemoval(phase)
  )
    return refuse('construction-unavailable', 'This construction operation is not installed.');
  if (
    phase.operation === 'repair-boundary' &&
    boundaryRepairInputIds(phase).length !== family.repair.quantity
  )
    return refuse(
      'invalid-repair-inputs',
      'Choose every exact input required by the installed repair.',
    );
  const count = assemblyWorkPointCount(phase);
  const currentAction = actor.actor.action;
  if (
    invocationId &&
    (currentAction?.id !== invocationId ||
      currentAction.type !== 'assemble' ||
      !Number.isSafeInteger(currentAction.assemblyCorner) ||
      currentAction.assemblyCorner! < 0 ||
      currentAction.assemblyCorner! >= count)
  )
    return refuse('construction-work', 'This construction work has ended or been replaced.');
  const root = assemblyRoot(world, phase),
    actual = root?.assembly,
    component = actual?.implementation === 'grounded-panel-boundary' ? actual : undefined,
    site = root && assemblySite(root);
  if (phase.rootId && !actual)
    return refuse('missing-structure', 'Choose the actual structure to change.');
  if (
    actual &&
    (!component ||
      component.retired ||
      component.requestId !== phase.requestId ||
      component.revision !== phase.expectedRevision ||
      !sameDefinitionPin(component.family, definitionPin(family)) ||
      root!.spatial.heading !== phase.heading ||
      !site ||
      ['x', 'y', 'z', 'surfaceId'].some(
        (key) => Reflect.get(site, key) !== Reflect.get(phase.destination, key),
      ))
  )
    return refuse(
      'stale-structure',
      'The structure changed. Refresh its actual parts, site and orientation.',
    );
  if (!component && (phase.operation !== 'post' || phase.expectedRevision !== 0))
    return refuse('missing-structure', 'The selected structure is no longer available.');
  const edit = root && activeAssemblyEdit(world, root, actorId, preview?.work);
  if (edit && (edit !== phase.editId || component!.activeEdit!.actorId !== actorId))
    return refuse(
      'competing-edit',
      'Another edit is already in progress. Stop or finish it first.',
    );
  if (phase.operation === 'post') {
    const grid = boundaryPostGrid(phase.slot)!;
    if (grid.some((n) => Math.abs(n) > family.limits.sections))
      return refuse(
        'invalid-layout',
        'Choose a post within this finite structure’s supported extent.',
      );
    if (component && Object.values(component.parts).some((part) => part.slot === phase.slot))
      return refuse('occupied-socket', 'That post position is already occupied.');
  }
  const info =
    phase.operation === 'boundary-panel' ? boundaryPanelInfo(world, phase, family) : undefined;
  if (phase.operation === 'boundary-panel') {
    if (
      !info ||
      ![info.from, info.to].every((post) =>
        boundaryMaterialIntact(
          world,
          post.itemId,
          family,
          post.role === 'post' ? 'post' : 'gatePost',
        ),
      )
    )
      return refuse(
        'missing-support',
        'Choose two actual intact neighboring posts for this panel.',
      );
    if (
      phase.sectionId !== `section-${component!.nextSection}` ||
      !Number.isSafeInteger(component!.nextSection + 1) ||
      phase.slot !== `panel:${phase.sectionId}`
    )
      return refuse('stale-structure', 'Refresh the structure before selecting its next section.');
    if (Object.keys(component!.sections).length >= family.limits.sections)
      return refuse(
        'section-limit',
        'This finite boundary has reached its supported section limit.',
      );
    const graph = boundarySectionExtensionProblem(Object.values(component!.sections), {
      fromPostId: info.from.itemId,
      toPostId: info.to.itemId,
    });
    if (graph) return refuse('invalid-layout', graph);
  }
  if (phase.operation === 'boundary-gate') {
    const gate = boundaryGateInfo(world, phase, family);
    if (
      !gate ||
      !gate.posts.every((post) => boundaryMaterialIntact(world, post.itemId, family, 'gatePost')) ||
      !boundaryMaterialIntact(world, gate.parking.panelId, family, 'parkingPanel')
    )
      return refuse(
        'missing-support',
        'Choose three intact neighboring tall posts and their actual access panel in the parking section.',
      );
    if (
      phase.sectionId !== `section-${component!.nextSection}` ||
      !Number.isSafeInteger(component!.nextSection + 1) ||
      phase.slot !== `gate:${phase.sectionId}`
    )
      return refuse(
        'stale-structure',
        'Refresh the structure before selecting its next gate section.',
      );
    if (
      Object.keys(component!.gates).length >= family.limits.gates ||
      Object.keys(component!.sections).length >= family.limits.sections
    )
      return refuse(
        'section-limit',
        'This finite boundary has reached its supported gate or section limit.',
      );
    if (
      Object.values(component!.gates).some(
        (existing) => existing.parkingSectionId === phase.parkingSectionId,
      )
    )
      return refuse(
        'occupied-gate',
        'Choose a parking section that is not already part of another gate.',
      );
    const graph = boundarySectionExtensionProblem(Object.values(component!.sections), {
      fromPostId: gate.posts[0].itemId,
      toPostId: gate.posts[1].itemId,
    });
    if (graph) return refuse('invalid-layout', graph);
    const anchor = localPoint(
        phase.destination,
        phase.heading,
        gate.fromLocal.x,
        gate.fromLocal.z,
        gate.fromLocal.y,
      ),
      sweep = boundaryGateSweep(family.geometry, anchor, gate.layout.heading, 'closed', 'open'),
      bounds = boundarySolidFromBoxes(sweep).bounds,
      centre = {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: (bounds.min.z + bounds.max.z) / 2,
      },
      radius = Math.hypot(
        bounds.max.x - centre.x,
        bounds.max.y - centre.y,
        bounds.max.z - centre.z,
      ),
      occupants = nearbyBodyEntities(world, centre, radius).filter(
        (other) => other.id !== actorId && !other.assembly,
      );
    if (
      sweep.some(
        (bounds) =>
          physicalIntersections(spatialMap(world), { bounds }).length ||
          occupants.some((other) => solidOverlap({ bounds }, { bounds: bodySpace(world, other) })),
      )
    )
      return refuse(
        'occupied-gate',
        'The complete leaf and hanging-cord movement space must be clear before installing this gate.',
      );
  }
  const permission = boundaryPermission(world, actorId, phase, permissions);
  if (
    phase.operation === 'boundary-gate' &&
    permission?.publicGateUse &&
    (!gatePublicationPolicyCurrent(world, permission.publicGateUse) ||
      !isSafeRecordId(publishedGatePermissionId(phase.itemId)))
  )
    return refuse(
      'gate-registration',
      'The gate needs current exact publication permission before construction.',
    );
  if (!permission)
    return refuse(
      'construction-permission',
      'You have no current permission for this construction work at that site.',
    );
  if (
    ['post', 'boundary-panel', 'boundary-gate'].includes(phase.operation) &&
    permission.structuralExposure &&
    (!structuralExposurePolicyCurrent(world, permission.structuralExposure) ||
      !sameDefinitionPin(permission.structuralExposure.family, definitionPin(family)))
  )
    return refuse(
      'exposure-registration',
      'Review current exact structural exposure permission before building this part.',
    );
  if (phase.operation === 'repair-boundary') {
    const seesPoint = pointVisionQuery(world, actor);
    if (
      !boundaryMaterialWorkCandidates(world, root!.id, phase.itemId, actorId).some((face) =>
        seesPoint(face.point),
      )
    )
      return refuse(
        'construction-access',
        'Choose a personally perceived solid face before repairing this part.',
      );
    const state = root && boundaryRepairState(world, root.id, phase.itemId);
    if (!state || state.value <= 0 || component?.parts[phase.itemId]?.slot !== phase.slot)
      return refuse(
        'invalid-repair',
        'Choose an actual unbroken part permitted by this structure’s repair rules.',
      );
    if (state.value >= state.maximum)
      return refuse('undamaged-material', 'This part needs no repair; no material was spent.');
    if (!materialAuthorized(world, phase.itemId, permission))
      return refuse(
        'unauthorized-material',
        'Repair needs permission for this actual installed part.',
      );
    if (!boundaryPostToolAvailable(world, actorId, phase.toolId, family, true))
      return refuse(
        'missing-tool',
        'Keep the selected qualified repair tool accessible throughout the work.',
      );
  }
  if (boundaryRemoval(phase)) {
    const released = boundaryReleasedMaterials(world, phase),
      part = component?.parts[phase.itemId];
    if (
      !released.length ||
      (phase.operation !== 'reclaim-lowered' && part?.slot !== phase.slot) ||
      released.some((id) => !materialAuthorized(world, id, permission))
    )
      return refuse(
        'unauthorized-material',
        'Choose the actual parts with one complete current construction-use permission.',
      );
    if (
      phase.operation === 'reclaim-post' &&
      (Object.values(component!.sections).some(
        (section) => section.fromPostId === phase.itemId || section.toPostId === phase.itemId,
      ) ||
        Object.values(component!.joints).some((joint) => joint.supportId === phase.itemId))
    )
      return refuse(
        'loaded-support',
        'Remove every dependent wall and gate before reclaiming this support.',
      );
    if (
      phase.operation === 'remove-boundary-panel' &&
      Object.values(component!.gates).some((gate) => {
        const parking = component!.sections[gate.parkingSectionId];
        return parking?.kind !== 'gate' && parking?.panelId === phase.itemId;
      })
    )
      return refuse('loaded-support', 'Remove the gate before its required parking panel.');
    if (phase.destinationId) {
      if (!canAccessContainer(world, actorId, phase.destinationId))
        return refuse(
          'reclaim-access',
          'Choose a currently accessible destination for these actual materials.',
        );
      const problem = assemblyMovesReason(world, released, root!.id, phase.destinationId);
      if (problem) return refuse('reclaim-destination', problem);
    } else {
      const point = boundaryReclaimPoint(world, actorId, phase),
        map = spatialMap(world),
        surface = point && surfaceById(map, point.surfaceId),
        footprint = family.salvage.footprint;
      if (
        !point ||
        !surface ||
        !surfaceSupportsRectangle(map, surface, {
          minX: point.x - footprint.width / 2,
          maxX: point.x + footprint.width / 2,
          minZ: point.z - footprint.length / 2,
          maxZ: point.z + footprint.length / 2,
        })
      )
        return refuse(
          'reclaim-destination',
          'The released materials need supported ground or an accessible destination.',
        );
    }
  }
  const inputs = boundaryPhaseInputs(phase);
  for (const [index, id] of inputs.entries()) {
    if (
      !accessiblePossession(world, actorId, id) ||
      !materialAuthorized(world, id, permission) ||
      !boundaryInputIntact(world, family, phase, index, id)
    )
      return refuse(
        'unauthorized-material',
        'Choose intact exact material with construction-use permission. Carrying it is insufficient.',
      );
  }
  if (
    phase.operation === 'post' &&
    !boundaryPostToolAvailable(world, actorId, phase.toolId, family)
  )
    return refuse(
      'missing-tool',
      'Keep the selected qualified post-setting tool accessible throughout the work.',
    );
  const heldCounts = new Map<string, number>();
  for (const id of boundaryPhaseHeldItems(phase)) heldCounts.set(id, (heldCounts.get(id) ?? 0) + 1);
  for (const [id, count] of heldCounts)
    if (availableItemQuantity(world, id, invocationId, preview?.resources) < count)
      return refuse(
        'missing-material',
        'The exact selected material or kept tool is unavailable or held by other work.',
      );
  if (
    (component
      ? Object.keys(component.parts).length + loweredAssemblyMaterials(world, root!.id).length
      : 0) +
      (phase.operation === 'repair-boundary' ? 0 : inputs.length) >
    family.limits.parts
  )
    return refuse('part-limit', 'Reclaim unused parts before adding more to this structure.');
  if (!boundaryRemoval(phase) && phase.operation !== 'repair-boundary') {
    const solid = boundaryIncomingSolid(world, phase, family);
    if (!solid)
      return refuse('invalid-part', 'Choose a supported actual part and its current attachments.');
    const map = spatialMap(world),
      surface = surfaceById(map, phase.destination.surfaceId),
      bounds = solid.bounds;
    if (
      !surface ||
      surface.slopeX !== 0 ||
      surface.slopeZ !== 0 ||
      !surfaceSupportsRectangle(map, surface, {
        minX: bounds.min.x,
        maxX: bounds.max.x,
        minZ: bounds.min.z,
        maxZ: bounds.max.z,
      }) ||
      Math.abs(surfaceHeight(surface, bounds.min.x, bounds.min.z) - phase.destination.y) >
        SPATIAL_LIMITS.epsilon
    )
      return refuse(
        'invalid-support',
        'The entire post base or panel bottom needs one flat supported ground patch.',
      );
    if (spatialBlockers(map).length + (solid.boxes?.length ?? 1) > SPATIAL_LIMITS.maxBlockers)
      return refuse('geometry-limit', 'Reclaim unused physical parts before adding another.');
    if (physicalIntersections(map, solid).length)
      return refuse('invalid-placement', 'The selected part intersects an existing obstacle.');
    for (const occupant of worldRootEntities(world, true)) {
      if (occupant.id === actorId || occupant.assembly) continue;
      if (solidOverlap(solid, { bounds: bodySpace(world, occupant) }))
        return refuse(
          'occupied-placement',
          'Someone or a belonging occupies the selected part’s space. Move it normally before building here.',
        );
    }
  }
  for (let corner = 0; corner < count; corner++) {
    const candidates = boundaryWorkCandidates(world, phase, corner, actorId);
    if (!findPhysicalWorkApproach(world, actor, candidates, world.itemHandling.reach))
      return refuse(
        'construction-access',
        'A required attachment has no clear reachable working face.',
      );
    if (invocationId && corner === actor.actor.action?.assemblyCorner) {
      const destination = actor.actor.action.destination,
        candidate =
          destination &&
          candidates.find(({ stance }) =>
            ['x', 'y', 'z', 'surfaceId'].every(
              (key) => Reflect.get(stance, key) === Reflect.get(destination, key),
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
        return refuse(
          'construction-access',
          'The selected working face is blocked or out of reach. Completed parts remain.',
        );
    }
  }
  if (
    !boundaryRemoval(phase) &&
    phase.operation !== 'repair-boundary' &&
    !preview?.deferExits &&
    (!invocationId || preview?.commitExits)
  )
    return boundaryPhaseExitPreparation(
      world,
      actorId,
      phase,
      permissions,
      preview?.campAssets ?? [],
      preview?.boundaryExits,
      {
        invocationId,
        work: preview?.work,
        commit: preview?.commitExits === true,
      },
    ).outcome;
  return outcome(
    true,
    'available',
    'The selected construction phase is currently available; exact parts, work faces, ground and permission are checked again at completion.',
  );
}
/** Called only inside the existing assembly owner's isolated compound transition. */
export function commitBoundaryParts(
  world: WorldState,
  actorId: string,
  phase: BoundaryPhase,
  invocationId: string,
): { rootId: string; installed: string[]; released: string[]; retire: boolean; created: boolean } {
  if (phase.operation === 'repair-boundary') {
    const root = assemblyRoot(world, phase)!,
      state = boundaryRepairState(world, root.id, phase.itemId)!,
      family = boundaryFamily(world, phase.familyId)!;
    releaseInvocationResources(world, invocationId);
    const counts = new Map<string, number>();
    for (const id of boundaryPhaseInputs(phase)) counts.set(id, (counts.get(id) ?? 0) + 1);
    applyItemQuantities(
      world,
      [...counts].map(([id, count]) => ({
        id,
        quantity: entityGet(world.entities, id)!.item!.quantity - count,
      })),
      'construction-repair',
    );
    const written = writeState(
      world,
      { entityId: phase.itemId, definition: state.definition },
      state.revision,
      { kind: 'increment', amount: Math.min(family.repair.amount, state.maximum - state.value) },
      [],
      'construction-repair',
      'transition',
      'silent',
    );
    if (written.status !== 'applied') throw new Error('The selected repair condition changed.');
    root.assembly!.revision++;
    return { rootId: root.id, installed: [], released: [], retire: false, created: false };
  }
  if (boundaryRemoval(phase)) {
    const root = assemblyRoot(world, phase)!,
      component = root.assembly;
    if (component?.implementation !== 'grounded-panel-boundary')
      throw new Error('The selected boundary changed.');
    const released = boundaryReleasedMaterials(world, phase);
    if (!released.length)
      throw new Error('The selected material is no longer installed or reclaimable.');
    const point = phase.destinationId ? undefined : boundaryReclaimPoint(world, actorId, phase);
    if (!phase.destinationId && !point) throw new Error('The reached reclaim destination changed.');
    releaseInvocationResources(world, invocationId);
    const destination =
      phase.destinationId ??
      assemblyGroundDestination(world, point!, boundaryFamily(world, phase.familyId)!);
    const removed = new Set(released);
    for (const id of released) {
      detachAssemblyPart(world, id, root.id, destination);
      delete component.parts[id];
    }
    for (const [id, section] of Object.entries(component.sections))
      if (removed.has(section.kind === 'gate' ? section.gateId : section.panelId))
        delete component.sections[id];
    for (const [id, joint] of Object.entries(component.joints))
      if (removed.has(joint.partId) || removed.has(joint.supportId) || removed.has(joint.bindingId))
        delete component.joints[id];
    if (phase.operation === 'remove-boundary-gate') delete component.gates[phase.itemId];
    component.revision++;
    if (phase.operation !== 'reclaim-lowered')
      world.assemblyGeometryRevision = (world.assemblyGeometryRevision ?? 0) + 1;
    return {
      rootId: root.id,
      installed: [],
      released,
      retire:
        !Object.keys(component.parts).length && !loweredAssemblyMaterials(world, root.id).length,
      created: false,
    };
  }
  if (
    phase.operation !== 'post' &&
    phase.operation !== 'boundary-panel' &&
    phase.operation !== 'boundary-gate'
  )
    throw new Error('This construction operation is not installed.');
  const family = boundaryFamily(world, phase.familyId)!;
  let root = assemblyRoot(world, phase);
  const created = !root;
  if (!root) {
    const id = nextEntityId(world, 'assembly');
    root = {
      id,
      name: family.name,
      description: family.description,
      kind: 'assembly',
      placement: worldPlacement(phase.destination, phase.destination.surfaceId),
      spatial: { ...groundedSpatial(world.itemHandling.objectBody), heading: phase.heading },
      assembly: {
        implementation: 'grounded-panel-boundary',
        family: definitionPin(family),
        requestId: phase.requestId,
        revision: 0,
        nextSection: 0,
        parts: {},
        joints: {},
        sections: {},
        gates: {},
      },
    };
    entitySet(world.entities, id, root);
    rootMembershipChanged(world, id);
  }
  const component = root.assembly;
  if (component?.implementation !== 'grounded-panel-boundary')
    throw new Error('The construction family changed.');
  releaseInvocationResources(world, invocationId);
  component.activeEdit = { actorId, invocationId: phase.editId };
  const claim = { rootId: root.id, family: definitionPin(family) },
    installed: string[] = [];
  if (phase.operation === 'post') {
    const grid = boundaryPostGrid(phase.slot)!,
      id = attachAssemblyPart(
        world,
        phase.itemId,
        root.id,
        {
          portId: 'assembly',
          slot: phase.slot,
          local: {
            x: grid[0] * family.geometry.section.spacing,
            y: 0,
            z: grid[1] * family.geometry.section.spacing,
          },
        },
        claim,
      );
    component.parts[id] = {
      itemId: id,
      role: boundaryPostRole(world, id, family)!,
      slot: phase.slot,
    };
    installed.push(id);
  } else if (phase.operation === 'boundary-gate') {
    const info = boundaryGateInfo(world, phase, family);
    if (!info) throw new Error('The selected gate supports changed.');
    const attach = (
      sourceId: string,
      role: import('./boundary-types.js').BoundaryPart['role'],
      slot: string,
      local: WorldPoint,
    ) => {
      const id = attachAssemblyPart(
        world,
        sourceId,
        root!.id,
        { portId: 'assembly', slot, local },
        claim,
      );
      component.parts[id] = { itemId: id, role, slot };
      installed.push(id);
      return id;
    };
    const leaf = attach(phase.itemId, 'gate', phase.slot, info.layout.leaf),
      rails = [phase.rail1Id, phase.rail2Id].map((id, index) =>
        attach(
          id,
          index === 0 ? 'first-rail' : 'second-rail',
          JSON.stringify(['runner', phase.sectionId, index]),
          info.layout.rails[index]!,
        ),
      ) as [string, string],
      bindings = boundaryPhaseBindings(phase).map((id, index) => {
        const slot = JSON.stringify([
            index < 4 ? 'runner-post' : 'leaf-hanger',
            phase.sectionId,
            index,
          ]),
          binding = attach(
            id,
            'binding',
            slot,
            index < 4 ? info.layout.runnerTies[index]! : info.layout.hangers[index - 4]!,
          );
        component.joints[slot] = {
          id: slot,
          kind: index < 4 ? 'runner-post' : 'leaf-hanger',
          partId: index < 4 ? rails[index < 2 ? 0 : 1] : leaf,
          supportId: index < 4 ? info.posts[[0, 1, 1, 2][index]!]!.itemId : rails[0],
          bindingId: binding,
          index,
        };
        return binding;
      }) as [string, string, string, string, string, string];
    component.gates[leaf] = {
      sectionId: phase.sectionId,
      postIds: info.posts.map((post) => post.itemId) as [string, string, string],
      railIds: rails,
      parkingSectionId: phase.parkingSectionId,
      bindingIds: bindings,
      position: 'closed',
      barred: false,
      slide: definitionPin(family),
    };
    component.sections[phase.sectionId] = {
      id: phase.sectionId,
      fromPostId: info.posts[0].itemId,
      toPostId: info.posts[1].itemId,
      kind: 'gate',
      gateId: leaf,
    };
    component.nextSection++;
  } else {
    const info = boundaryPanelInfo(world, phase, family);
    if (!info) throw new Error('The selected panel supports changed.');
    const panel = attachAssemblyPart(
      world,
      phase.itemId,
      root.id,
      { portId: 'assembly', slot: phase.slot, local: info.frame.local },
      claim,
    );
    component.parts[panel] = { itemId: panel, role: info.role, slot: phase.slot };
    installed.push(panel);
    const bindings: string[] = [];
    family.joints.panelTies.forEach((tie, index) => {
      const post = tie.end === 0 ? info.from : info.to,
        placement = entityGet(world.entities, post.itemId)!.placement;
      if (!isAssemblyPlacement(placement)) throw new Error('The selected post attachment changed.');
      const slot = JSON.stringify(['panel-end', phase.sectionId, index]),
        binding = attachAssemblyPart(
          world,
          boundaryPhaseBindings(phase)[index]!,
          root!.id,
          { portId: 'assembly', slot, local: { ...placement.local, y: tie.height } },
          claim,
        );
      component.parts[binding] = { itemId: binding, role: 'binding', slot };
      component.joints[slot] = {
        id: slot,
        kind: 'panel-end',
        partId: panel,
        supportId: post.itemId,
        bindingId: binding,
        index,
      };
      bindings.push(binding);
      installed.push(binding);
    });
    component.sections[phase.sectionId] = {
      id: phase.sectionId,
      fromPostId: info.from.itemId,
      toPostId: info.to.itemId,
      kind: info.role,
      panelId: panel,
      bindingIds: bindings,
    };
    component.nextSection++;
  }
  component.revision++;
  world.assemblyGeometryRevision = (world.assemblyGeometryRevision ?? 0) + 1;
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: root.id,
    before: phase.destination,
    after: phase.destination,
  });
  return { rootId: root.id, installed, released: [], retire: false, created };
}

type GatePlanStep = Extract<BoundaryPlan['steps'][number], { operation: 'boundary-gate' }>;
function gatePlanPhase(
  common: Omit<BoundaryPhase, 'slot' | 'itemId' | 'operation'>,
  step: GatePlanStep,
  sectionId: string,
): Extract<BoundaryPhase, { operation: 'boundary-gate' }> {
  return {
    ...common,
    operation: 'boundary-gate',
    slot: `gate:${sectionId}`,
    sectionId,
    itemId: step.itemId,
    fromSlot: step.fromSlot,
    toSlot: step.toSlot,
    thirdSlot: step.thirdSlot,
    parkingSectionId: step.parkingSectionId,
    rail1Id: step.railIds[0],
    rail2Id: step.railIds[1],
    binding1: step.bindingIds[0]!,
    binding2: step.bindingIds[1]!,
    binding3: step.bindingIds[2]!,
    binding4: step.bindingIds[3]!,
    binding5: step.bindingIds[4]!,
    binding6: step.bindingIds[5]!,
  };
}

/** Predict placement through the actual attachment owner without elapsed work or
 * publication. A source-authorized root claim is an alternative private calculation
 * for each still-eligible grant, never an operational permission or saved effect.
 * docs/projects/first-playable-world-tech-design.md#complete-finite-boundary-layout-admission
 */
function preflightBoundaryLayout(
  world: WorldState,
  actorId: string,
  id: string,
  phases: readonly BoundaryPhase[],
  permissions: readonly ConstructionPermission[],
  work: ProspectiveWork,
): string | Outcome {
  const complete = permissions.filter(
    (permission) =>
      !permission.revoked &&
      permission.worldId === world.id &&
      permission.actorId === actorId &&
      phases.every(
        (phase) =>
          permission.operations.includes(phase.operation) &&
          boundaryPhaseMaterials(world, phase).every((itemId) =>
            materialAuthorized(world, itemId, permission),
          ),
      ),
  );
  const refuse = () =>
    outcome(
      false,
      'construction-permission',
      'The complete selected sequence needs one current construction grant covering every operation, site and material.',
    );
  if (!complete.length) return refuse();
  if (phases.length === 1) {
    const phase = phases[0]!,
      permission = boundaryPermission(world, actorId, phase, complete);
    if (!permission) return refuse();
    const checked = evaluateBoundaryPhase(world, actorId, phase, [permission], undefined, {
      work,
      resources: resourcesAfterEnding(world, work.releasedInvocations),
      deferExits: true,
    });
    return checked.ok ? permission.id : checked;
  }
  const candidate = draftWorld(world, { retainNativeValues: true });
  const batch = constructionPermissionBatch(world.id, complete);
  let eligible = new Set(complete.map((permission) => permission.id));
  try {
    for (const invocation of work.releasedInvocations)
      releaseInvocationResources(candidate, invocation);
    for (const phase of phases) {
      const matching = batch.permissions.filter(
        (permission) =>
          eligible.has(permission.id) &&
          !!boundaryPermission(candidate, actorId, phase, [permission]) &&
          // The selector can retain an incomplete site grant solely to explain
          // a precise refusal. It must never certify a whole finite sequence.
          boundaryPhaseMaterials(candidate, phase).every((itemId) =>
            materialAuthorized(candidate, itemId, permission),
          ),
      );
      if (!matching.length) return refuse();
      eligible = new Set(matching.map((permission) => permission.id));
      const checked = evaluateBoundaryPhase(candidate, actorId, phase, matching, undefined, {
        work,
        resources: resourcesAfterEnding(candidate, []),
        deferExits: true,
      });
      if (!checked.ok) return checked;
      const changed = commitBoundaryParts(candidate, actorId, phase, id);
      if (changed.created)
        for (const permission of matching)
          recordAssemblyPermissionEffect(batch, {
            kind: 'assembly-created',
            permissionId: permission.id,
            permissionRevision: permission.revision,
            actorId,
            actionId: id,
            assemblyId: changed.rootId,
          });
    }
    return batch.permissions.find((permission) => eligible.has(permission.id))!.id;
  } catch (error) {
    if (error instanceof WorkBudgetError || error instanceof ResourceReservationError) throw error;
    return outcome(
      false,
      'invalid-layout',
      error instanceof Error
        ? error.message
        : 'The selected parts cannot form an available finite layout.',
    );
  } finally {
    // Finalize and discard the single private candidate, including all provisional
    // identities, origin claims and semantic changes. Only real phases publish.
    finishWorld(candidate);
  }
}

/** Exact finite intent only. Each native phase still owns geometry, authority,
 * reservation, elapsed work and publication. No future effect is pre-authorized. */
export function prepareBoundaryPlan(
  world: WorldState,
  actorId: string,
  id: string,
  plan: BoundaryPlan,
  permissions: readonly ConstructionPermission[],
): { command: Command; permission: ConstructionPermission } | Outcome {
  const refuse = (code: string, message: string) => outcome(false, code, message);
  if (
    !hasRecordFields(
      plan,
      [
        'implementation',
        'familyId',
        'familyVersion',
        'familyDigest',
        'site',
        'orientation',
        'steps',
      ],
      ['rootId', 'expectedRevision'],
    ) ||
    plan.implementation !== 'grounded-panel-boundary' ||
    !Array.isArray(plan.steps) ||
    !plan.steps.length ||
    plan.steps.length >= ACTIVITY_LIMITS.nodes
  )
    return refuse('invalid-layout', 'Choose a supported finite construction sequence.');
  const family = world.assemblyFamilies?.[plan.familyId],
    root = plan.rootId ? entityGet(world.entities, plan.rootId) : undefined,
    component = root?.assembly,
    actor = entityGet(world.entities, actorId);
  if (!family || family.implementation !== 'grounded-panel-boundary')
    return refuse('unsupported-family', 'This construction family is not installed.');
  if (
    !sameDefinitionPin(
      { id: plan.familyId, version: plan.familyVersion, digest: plan.familyDigest },
      definitionPin(family),
    )
  )
    return refuse(
      'stale-definition',
      'The selected construction definition changed. Review the current materials, layout and work again.',
    );
  if (
    plan.rootId &&
    (!component ||
      component.retired ||
      component.implementation !== family.implementation ||
      component.family.id !== family.id ||
      component.revision !== plan.expectedRevision)
  )
    return refuse('stale-structure', 'Refresh the actual structure and its current parts.');
  if (root && (!actor || !seesEntity(world, actor, root)))
    return refuse('not-visible', 'Move close enough to perceive the actual structure.');
  const site = root ? assemblySite(root)! : plan.site,
    heading = root ? root.spatial.heading : assemblyHeadings[plan.orientation],
    pin = definitionPin(family),
    requestId = component?.requestId ?? id,
    phases: BoundaryPhase[] = [];
  let revision = component?.revision ?? 0,
    section = component?.implementation === 'grounded-panel-boundary' ? component.nextSection : 0;
  for (const step of plan.steps) {
    if (!step || typeof step !== 'object')
      return refuse('invalid-layout', 'Choose exact supported post or panel steps.');
    const common = {
      implementation: 'grounded-panel-boundary' as const,
      familyId: pin.id,
      familyVersion: pin.version,
      familyDigest: pin.digest,
      requestId,
      ...(root ? { rootId: root.id } : {}),
      editId: id,
      expectedRevision: revision++,
      destination: site,
      heading,
    };
    if (
      step.operation === 'post' &&
      hasRecordFields(step, ['operation', 'slot', 'itemId', 'toolId'])
    )
      phases.push({ ...common, ...step });
    else if (
      step.operation === 'boundary-panel' &&
      hasRecordFields(step, ['operation', 'fromSlot', 'toSlot', 'itemId', 'bindingIds']) &&
      Array.isArray(step.bindingIds) &&
      step.bindingIds.length === 2
    ) {
      const sectionId = `section-${section++}`;
      phases.push({
        ...common,
        operation: step.operation,
        itemId: step.itemId,
        fromSlot: step.fromSlot,
        toSlot: step.toSlot,
        sectionId,
        slot: `panel:${sectionId}`,
        binding1: step.bindingIds[0],
        binding2: step.bindingIds[1],
      });
    } else if (
      step.operation === 'boundary-gate' &&
      hasRecordFields(step, [
        'operation',
        'fromSlot',
        'toSlot',
        'thirdSlot',
        'parkingSectionId',
        'itemId',
        'railIds',
        'bindingIds',
      ]) &&
      Array.isArray(step.railIds) &&
      step.railIds.length === 2 &&
      Array.isArray(step.bindingIds) &&
      step.bindingIds.length === 6
    ) {
      phases.push(gatePlanPhase(common, step, `section-${section++}`));
    } else if (
      step.operation === 'repair-boundary' &&
      hasRecordFields(step, ['operation', 'itemId', 'toolId', 'inputIds']) &&
      Array.isArray(step.inputIds) &&
      step.inputIds.length === family.repair.quantity &&
      step.inputIds.every(isSafeRecordId)
    ) {
      const part =
        component?.implementation === 'grounded-panel-boundary'
          ? component.parts[step.itemId]
          : undefined;
      if (!root || !part) return refuse('missing-part', 'Choose an actual current part to repair.');
      phases.push({
        ...common,
        operation: step.operation,
        itemId: step.itemId,
        slot: part.slot,
        toolId: step.toolId,
        ...boundaryRepairInputBindings(step.inputIds),
      });
    } else if (
      (step.operation === 'remove-boundary-panel' ||
        step.operation === 'remove-boundary-gate' ||
        step.operation === 'reclaim-post' ||
        step.operation === 'reclaim-lowered') &&
      hasRecordFields(step, ['operation', 'itemId'], ['destinationId'])
    ) {
      const part =
        component?.implementation === 'grounded-panel-boundary'
          ? component.parts[step.itemId]
          : undefined;
      if (!root || (!part && step.operation !== 'reclaim-lowered'))
        return refuse('missing-part', 'Choose an actual current part of this structure.');
      if (step.operation === 'reclaim-lowered') {
        const inspected = currentInventoryInspection(world, actorId),
          placement = entityGet(world.entities, step.itemId)?.placement;
        if (
          !inspected?.itemIds.includes(step.itemId) ||
          placement?.mode !== 'contained' ||
          inspected.containerId !== placement.parentEntityId
        )
          return refuse(
            'reclaim-access',
            'Inspect the actual ground pile before choosing its protected material.',
          );
      }
      phases.push({ ...common, ...step, slot: part?.slot ?? 'lowered' });
    } else return refuse('invalid-layout', 'Choose exact supported construction steps.');
  }
  if (!phases.every(validBoundaryPhase))
    return refuse(
      'invalid-layout',
      'The selected construction fields are incomplete or unsupported.',
    );
  const work = prospectiveWork(world, actorId, 'replace');
  if ('ok' in work) return work;
  if (!work.outcome.ok) return work.outcome;
  const resources = resourcesAfterEnding(world, work.releasedInvocations),
    spent = new Map<string, number>(),
    needed = new Map<string, number>();
  // A kept tool is needed during a phase, not spent once per step. Earlier spent
  // stock cannot be reused by a later step; each actual reservation stays native.
  for (const phase of phases) {
    const held = new Map<string, number>();
    for (const itemId of boundaryPhaseHeldItems(phase))
      held.set(itemId, (held.get(itemId) ?? 0) + 1);
    for (const [itemId, count] of held)
      needed.set(itemId, Math.max(needed.get(itemId) ?? 0, (spent.get(itemId) ?? 0) + count));
    for (const itemId of boundaryPhaseInputs(phase))
      spent.set(itemId, (spent.get(itemId) ?? 0) + 1);
  }
  for (const [itemId, count] of needed)
    if (
      !accessiblePossession(world, actorId, itemId) ||
      availableItemQuantity(world, itemId, undefined, resources) < count
    )
      return refuse(
        'missing-material',
        'The selected sequence needs more available material or a kept tool. Earlier consumed stock cannot be used twice.',
      );
  for (const phase of phases) {
    if (
      boundaryPhaseInputs(phase).some(
        (itemId, index) => !boundaryInputIntact(world, family, phase, index, itemId),
      )
    )
      return refuse('invalid-material', 'Choose intact exact material for every selected step.');
    if (
      phase.operation === 'post' &&
      !boundaryPostToolAvailable(world, actorId, phase.toolId, family)
    )
      return refuse(
        'missing-tool',
        'Each selected post step needs an accessible qualified kept tool.',
      );
  }
  const selected = preflightBoundaryLayout(world, actorId, id, phases, permissions, work);
  if (typeof selected !== 'string') return selected;
  for (const phase of phases) phase.permissionId = selected;
  const command = assemblyActivityCommand(
    actorId,
    id,
    family.name,
    site,
    phases,
    (phase) => family.labels[phase.operation],
  );
  validateActivityNode(command.root);
  return { command, permission: permissions.find((permission) => permission.id === selected)! };
}

export function compileBoundaryActivity(
  world: WorldState,
  actorId: string,
  id: string,
  plan: BoundaryPlan,
  permissions: readonly ConstructionPermission[],
): Command | Outcome {
  const prepared = prepareBoundaryPlan(world, actorId, id, plan, permissions);
  return 'command' in prepared ? prepared.command : prepared;
}

/** Permitted prospective pieces, using the same physical producer as installed
 * parts. This is a picture of intent, never geometry or construction authority. */
export function boundaryPlanShapes(
  world: WorldState,
  actorId: string,
  plan: BoundaryPlan,
): Array<{
  id: string;
  role:
    | 'post'
    | 'gate-post'
    | 'panel'
    | 'access-panel'
    | 'gate'
    | 'first-rail'
    | 'second-rail'
    | 'binding';
  bounds: Bounds3;
}> {
  const family = boundaryFamily(world, plan.familyId),
    root = plan.rootId ? entityGet(world.entities, plan.rootId) : undefined,
    component = root?.assembly,
    actor = entityGet(world.entities, actorId);
  if (
    !family ||
    !actor ||
    (plan.rootId &&
      (!root ||
        !seesEntity(world, actor, root) ||
        component?.implementation !== 'grounded-panel-boundary'))
  )
    return [];
  const site = root ? assemblySite(root) : plan.site,
    heading = root ? root.spatial.heading : assemblyHeadings[plan.orientation];
  if (!site || !finitePoint(site) || !assemblyHeadings.includes(heading)) return [];
  const posts = new Map<string, WorldPoint>(),
    shapes: ReturnType<typeof boundaryPlanShapes> = [];
  if (root && component?.implementation === 'grounded-panel-boundary')
    for (const part of Object.values(component.parts)) {
      const placement = entityGet(world.entities, part.itemId)?.placement;
      if ((part.role === 'post' || part.role === 'gate-post') && isAssemblyPlacement(placement))
        posts.set(part.slot, placement.local);
    }
  const add = (
    id: string,
    role: 'post' | 'gate-post' | 'panel' | 'access-panel',
    local: WorldPoint,
    direction: number,
  ) => {
    const point = localPoint(site, heading, local.x, local.z, local.y);
    for (const bounds of boundaryBoxesAt(family.geometry, role, point, direction))
      shapes.push({ id, role, bounds });
  };
  for (const step of plan.steps) {
    if (
      step.operation === 'repair-boundary' ||
      boundaryRemovalOperations.some((operation) => operation === step.operation)
    ) {
      if (!root || component?.implementation !== 'grounded-panel-boundary') continue;
      // These are already disclosed installed solids, not guessed stock or a
      // simulated subtraction from the world. The selected command still checks
      // all material rights and the destination before any real removal.
      const selected =
        step.operation === 'repair-boundary'
          ? new Set([step.itemId])
          : new Set(
              boundaryReleasedMaterials(world, {
                implementation: 'grounded-panel-boundary',
                operation: step.operation as (typeof boundaryRemovalOperations)[number],
                familyId: family.id,
                familyVersion: family.version,
                familyDigest: component.family.digest,
                requestId: component.requestId,
                rootId: root.id,
                editId: 'preview',
                expectedRevision: component.revision,
                destination: site,
                heading,
                itemId: step.itemId,
                slot: component.parts[step.itemId]?.slot ?? 'lowered',
              }),
            );
      for (const shape of assemblyShapes(world, root).posts) {
        const part = component.parts[shape.id];
        if (selected.has(shape.id) && part)
          for (const bounds of shape.boxes ?? [shape.bounds])
            shapes.push({ id: shape.id, role: part.role, bounds });
      }
      continue;
    }
    // A guessed hidden item's size or selected role must not enter a refused ghost.
    if (!accessiblePossession(world, actorId, step.itemId)) continue;
    if (step.operation === 'post') {
      const grid = boundaryPostGrid(step.slot),
        role = boundaryPostRole(world, step.itemId, family);
      if (!grid || !role || grid.some((n) => Math.abs(n) > family.limits.sections)) continue;
      const local = {
        x: grid[0] * family.geometry.section.spacing,
        y: 0,
        z: grid[1] * family.geometry.section.spacing,
      };
      posts.set(step.slot, local);
      add(step.itemId, role, local, heading);
    } else if (step.operation === 'boundary-gate') {
      if (
        !root ||
        component?.implementation !== 'grounded-panel-boundary' ||
        step.bindingIds.length !== 6 ||
        step.railIds.length !== 2 ||
        ![...step.railIds, ...step.bindingIds].every((id) =>
          accessiblePossession(world, actorId, id),
        )
      )
        continue;
      const phase = gatePlanPhase(
        {
          implementation: 'grounded-panel-boundary',
          familyId: family.id,
          familyVersion: family.version,
          familyDigest: definitionPin(family).digest,
          rootId: root.id,
          requestId: component.requestId,
          editId: 'preview',
          expectedRevision: component.revision,
          destination: site,
          heading,
        },
        step,
        `section-${component.nextSection}`,
      );
      shapes.push(...(boundaryGatePieces(world, phase, family) ?? []));
    } else if (step.operation === 'boundary-panel') {
      const from = posts.get(step.fromSlot),
        to = posts.get(step.toSlot),
        frame = from && to && boundarySectionLocalFrame(from, to, heading),
        pin = entityGet(world.entities, step.itemId)?.item?.definitionPin,
        role =
          pin && sameDefinitionPin(pin, family.roles.panel)
            ? 'panel'
            : pin && sameDefinitionPin(pin, family.roles.parkingPanel)
              ? 'access-panel'
              : undefined;
      if (frame && role) add(step.itemId, role, frame.local, frame.heading);
    }
  }
  return shapes;
}

/** Geometry-relative intentions only; the selected native phase still checks its
 * site, occupied space, support, work face, materials and complete permission. */
export function boundaryEditCandidates(world: WorldState, rootId: string) {
  const root = entityGet(world.entities, rootId),
    component = root?.assembly,
    family = component && boundaryFamily(world, component.family.id);
  if (!family || component?.implementation !== 'grounded-panel-boundary' || component.retired)
    return { postSlots: [], panelSpans: [], gateSpans: [] };
  const posts = new Map(
    Object.values(component.parts)
      .filter((part) => part.role === 'post' || part.role === 'gate-post')
      .map((part) => [part.slot, part]),
  );
  const occupied = new Set(
      Object.values(component.sections).map((section) =>
        JSON.stringify([section.fromPostId, section.toPostId].sort()),
      ),
    ),
    slots = new Set<string>(),
    spans = new Set<string>(),
    panelSpans: Array<{ fromSlot: string; toSlot: string; fromPostId: string; toPostId: string }> =
      [];
  for (const post of posts.values()) {
    const grid = boundaryPostGrid(post.slot)!;
    for (const [dx, dz] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const x = grid[0] + dx,
        z = grid[1] + dz;
      if (Math.abs(x) > family.limits.sections || Math.abs(z) > family.limits.sections) continue;
      const slot = boundaryPostSlot(x, z),
        other = posts.get(slot);
      if (!other) slots.add(slot);
      else {
        const pair = JSON.stringify([post.itemId, other.itemId].sort());
        if (!occupied.has(pair) && !spans.has(pair)) {
          spans.add(pair);
          panelSpans.push({
            fromSlot: post.slot,
            toSlot: other.slot,
            fromPostId: post.itemId,
            toPostId: other.itemId,
          });
        }
      }
    }
  }
  const gateSpans: Array<{
    fromSlot: string;
    toSlot: string;
    thirdSlot: string;
    parkingSectionId: string;
    fromPostId: string;
    toPostId: string;
  }> = [];
  const parked = new Set(Object.values(component.gates).map((gate) => gate.parkingSectionId));
  for (const section of Object.values(component.sections)) {
    if (section.kind !== 'access-panel' || parked.has(section.id)) continue;
    for (const [middleId, thirdId] of [
      [section.fromPostId, section.toPostId],
      [section.toPostId, section.fromPostId],
    ]) {
      const middle = component.parts[middleId!],
        third = component.parts[thirdId!];
      if (middle?.role !== 'gate-post' || third?.role !== 'gate-post') continue;
      const m = boundaryPostGrid(middle.slot)!,
        t = boundaryPostGrid(third.slot)!,
        first = posts.get(boundaryPostSlot(2 * m[0] - t[0], 2 * m[1] - t[1]));
      if (
        first?.role !== 'gate-post' ||
        occupied.has(JSON.stringify([first.itemId, middle.itemId].sort()))
      )
        continue;
      if (
        boundaryGateSupports(
          world,
          root!,
          family,
          [first.slot, middle.slot, third.slot],
          section.id,
        )
      )
        gateSpans.push({
          fromSlot: first.slot,
          toSlot: middle.slot,
          thirdSlot: third.slot,
          parkingSectionId: section.id,
          fromPostId: first.itemId,
          toPostId: middle.itemId,
        });
    }
  }
  return { postSlots: [...slots], panelSpans, gateSpans };
}

/** The assembly owner builds one isolated real geometry cut. Host answers stay
 * outside saved authority; every actual cut and occupant is fenced again.
 */
export function boundaryPhaseExitPreparation(
  world: WorldState,
  actorId: string,
  phase: BoundaryPhase,
  permissions: readonly ConstructionPermission[],
  campAssets: readonly CampAssetPermission[],
  prepared?: BoundaryExitPreparations,
  options: { invocationId?: string; work?: ProspectiveWork; commit?: boolean } = {},
): { outcome: Outcome; batch?: BoundaryExitBatch } {
  const actor = entityGet(world.entities, actorId)!,
    root = assemblyRoot(world, phase),
    permission = boundaryPermission(world, actorId, phase, permissions),
    face = options.commit
      ? undefined
      : findPhysicalWorkApproach(
          world,
          actor,
          boundaryWorkCandidates(world, phase, assemblyWorkPointCount(phase) - 1, actorId),
          world.itemHandling.reach,
        );
  if (!permission || (!options.commit && !face))
    return {
      outcome: outcome(
        false,
        'construction-access',
        'The selected work no longer has its complete permission or clear working face.',
      ),
    };
  const candidate = draftWorld(world, { retainNativeValues: true });
  let after: WorldState,
    afterPermissions = campAssets,
    publicationProblem: Outcome | undefined;
  try {
    for (const id of options.work?.releasedInvocations ?? [])
      releaseInvocationResources(candidate, id);
    const changed = commitBoundaryParts(
      candidate,
      actorId,
      phase,
      options.invocationId ?? phase.editId,
    );
    if (phase.operation === 'boundary-gate') {
      const component = entityGet(candidate.entities, changed.rootId)!.assembly!;
      const leaf = changed.installed.find((id) => component.parts[id]?.role === 'gate')!;
      const publication = prepareGatePublication(
        candidate,
        permission,
        changed.rootId,
        leaf,
        campAssets,
      );
      if (publication && 'ok' in publication) publicationProblem = publication;
      else if (publication)
        afterPermissions = [
          ...campAssets.filter((p) => p.id !== publication.after.id),
          publication.after,
        ];
    }
  } finally {
    after = finishWorld(candidate);
  }
  if (publicationProblem) return { outcome: publicationProblem };
  const nextRoot = assemblyRoot(after, phase)!;
  const batch = boundaryExitBatch(
    world,
    after,
    root?.id,
    nextRoot.id,
    campAssets,
    afterPermissions,
    face ? { actorId, after: face.candidate.stance } : undefined,
  );
  return batch
    ? { batch, outcome: boundaryExitResult(batch, prepared?.get(actorId)) }
    : { outcome: outcome(true, 'available', 'The change has no affected occupied exit.') };
}

/** A pending native action can stop/refuse without awaiting obsolete preparation.
 * Admission checks current stock after hypothetically ending only its own holds;
 * no real work or authority is changed by this read.
 */
export function pendingBoundaryExitPreparation(
  world: WorldState,
  actorId: string,
  permissions: readonly ConstructionPermission[],
  campAssets: readonly CampAssetPermission[],
  prepared?: BoundaryExitPreparations,
): { outcome: Outcome; batch?: BoundaryExitBatch } | undefined {
  const actor = entityGet(world.entities, actorId),
    action = actor?.actor?.action,
    phase = action?.assemblyPhase;
  if (!action?.assemblyExitPending || phase?.implementation !== 'grounded-panel-boundary') return;
  const grant = permissions.find((p) => p.id === action.constructionGrant?.id);
  if (!grant || grant.revoked || grant.revision !== action.constructionGrant?.revision)
    return {
      outcome: outcome(
        false,
        'construction-permission',
        'Construction permission changed. Completed parts remain.',
      ),
    };
  const work = prospectiveWork(world, actorId, 'replace');
  if ('ok' in work) return { outcome: work };
  if (!work.outcome.ok) return { outcome: work.outcome };
  const checked = evaluateBoundaryPhase(world, actorId, phase, [grant], undefined, {
    work,
    resources: resourcesAfterEnding(world, [action.id]),
    deferExits: true,
  });
  if (!checked.ok) return { outcome: checked };
  return boundaryPhaseExitPreparation(world, actorId, phase, [grant], campAssets, prepared, {
    invocationId: action.id,
    work,
    commit: action.assemblyExitPending === 'commit',
  });
}
