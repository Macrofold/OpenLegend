import { materialCoverProfile } from './assembly-cover.js';
import { entityGet } from './entity-collection.js';
import { isAssemblyPlacement } from './spatial-state.js';
import { worldRootEntities } from './entity-index.js';
import type {
  Bounds3,
  FinitePanel,
  CoverPanel,
  SpatialBlocker,
  SpatialMap,
  SurfacePoint,
  WorldPoint,
} from '@open-legend/spatial';
import type { Entity, WorldState } from './types.js';
import type { GroundedPanelFamily } from './boundary-types.js';
import type {
  AssemblyCoverProfile,
  AssemblyFamily,
  FlexibleBayFamily,
  GroundedPanelGeometry,
  BoundaryShapeRole,
} from './assembly-types.js';
import { panelGeometry, SPATIAL_LIMITS } from '@open-legend/spatial';
import { chargeWork } from './work-budget.js';
import { current, freeze, isDraft, original } from 'immer';
import { readOnlyDraftView } from './draft.js';
import { isImmutableData } from './records.js';

export function localPoint(
  anchor: WorldPoint,
  heading: number,
  u: number,
  v: number,
  height = 0,
): WorldPoint {
  // EntitySpatial owns radian Y-up heading. Snap only the admitted orthogonal
  // sine/cosine values so exact local coordinates survive capture/restoration.
  const cosine = Math.round(Math.cos(heading)),
    sine = Math.round(Math.sin(heading));
  const x = cosine * u + sine * v,
    z = -sine * u + cosine * v;
  return { x: anchor.x + x, y: anchor.y + height, z: anchor.z + z };
}
export const assemblyHeadings = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] as const;
export function rectangularBounds(
  anchor: WorldPoint,
  heading: number,
  width: number,
  length: number,
  height: number,
  thickness: number,
): Bounds3 {
  const a = localPoint(anchor, heading, -width / 2, -length / 2, height),
    b = localPoint(anchor, heading, width / 2, length / 2, height);
  return {
    min: { x: Math.min(a.x, b.x), y: anchor.y + height - thickness, z: Math.min(a.z, b.z) },
    max: { x: Math.max(a.x, b.x), y: anchor.y + height, z: Math.max(a.z, b.z) },
  };
}
export function postLocal(family: FlexibleBayFamily, slot: string): WorldPoint {
  const [column, row] = slot.split(':').map(Number);
  return {
    x: -family.bay.width / 2 + column! * family.bay.width,
    y: 0,
    z: row === 0 ? -family.bay.length / 2 : family.bay.length / 2,
  };
}
export function postBounds(
  family: FlexibleBayFamily,
  site: WorldPoint,
  heading: number,
  slot: string,
  height: number,
): Bounds3 {
  const local = postLocal(family, slot);
  return rectangularBounds(
    localPoint(site, heading, local.x, local.z),
    heading,
    family.bay.postSection,
    family.bay.postSection,
    height,
    height,
  );
}
export function assemblyArrangement(family: FlexibleBayFamily, id: string) {
  return family.arrangements.find((arrangement) => arrangement.id === id);
}
export function postHeightForSlot(
  family: FlexibleBayFamily,
  arrangementId: string,
  slot: string,
): number {
  return assemblyArrangement(family, arrangementId)!.rowHeights[Number(slot.split(':')[1])]!;
}
export function materialPostHeight(world: WorldState, id: string): number | undefined {
  const item = entityGet(world.entities, id)?.item;
  return item && world.itemDefinitions[item.definitionPin.id]?.assemblyMaterial?.postHeight;
}
/** Section direction is derived from the actual post attachments. No part stores a
 * second rotation or arbitrary position outside the attachment owner. */
export function boundarySectionFrame(
  world: WorldState,
  root: Entity,
  fromId: string,
  toId: string,
): { local: WorldPoint; heading: number } | undefined {
  const from = entityGet(world.entities, fromId)?.placement,
    to = entityGet(world.entities, toId)?.placement;
  if (
    !isAssemblyPlacement(from) ||
    !isAssemblyPlacement(to) ||
    from.parentEntityId !== root.id ||
    to.parentEntityId !== root.id
  )
    return;
  return boundarySectionLocalFrame(from.local, to.local, root.spatial.heading);
}
/** The same local-frame calculation serves actual attachments and a permitted
 * construction preview. Only the attachment owner writes a committed position. */
export function boundarySectionLocalFrame(
  from: WorldPoint,
  to: WorldPoint,
  rootHeading: number,
): { local: WorldPoint; heading: number } | undefined {
  const dx = to.x - from.x,
    dz = to.z - from.z;
  if ((dx === 0) === (dz === 0) || from.y !== to.y) return;
  const direction = dx > 0 ? 0 : dz < 0 ? 1 : dx < 0 ? 2 : 3,
    rootDirection = assemblyHeadings.findIndex((heading) => heading === rootHeading);
  if (rootDirection < 0) return;
  return {
    local: {
      x: (from.x + to.x) / 2,
      y: from.y,
      z: (from.z + to.z) / 2,
    },
    heading: assemblyHeadings[(rootDirection + direction) % 4]!,
  };
}
export function boundarySolidAt(
  geometry: GroundedPanelGeometry,
  role: BoundaryShapeRole,
  anchor: WorldPoint,
  heading: number,
): { bounds: Bounds3; boxes?: Bounds3[] } {
  return boundarySolidFromBoxes(boundaryBoxesAt(geometry, role, anchor, heading));
}
/** Finite union; callers already own nonempty admitted physical pieces. */
export function boundarySolidFromBoxes(boxes: Bounds3[]): { bounds: Bounds3; boxes?: Bounds3[] } {
  const bounds: Bounds3 = {
    min: {
      x: Math.min(...boxes.map((b) => b.min.x)),
      y: Math.min(...boxes.map((b) => b.min.y)),
      z: Math.min(...boxes.map((b) => b.min.z)),
    },
    max: {
      x: Math.max(...boxes.map((b) => b.max.x)),
      y: Math.max(...boxes.map((b) => b.max.y)),
      z: Math.max(...boxes.map((b) => b.max.z)),
    },
  };
  return { bounds, ...(boxes.length > 1 ? { boxes } : {}) };
}

/** One attachment-relative layout for installation, movement and restoration.
 * Hangers are the two actual selected cords, not extra generated parts. */
export function boundaryGateLayout(
  geometry: GroundedPanelGeometry,
  from: WorldPoint,
  to: WorldPoint,
  rootHeading: number,
  position: 'open' | 'closed',
  bindingSection: number,
) {
  const frame = boundarySectionLocalFrame(from, to, rootHeading);
  if (!frame) return;
  const relativeHeading = frame.heading - rootHeading,
    spacing = geometry.section.spacing,
    gate = geometry.gate,
    centre = spacing / 2 + (position === 'open' ? gate.travel : 0),
    point = (u: number, height = 0, v = gate.insideOffset) =>
      localPoint(from, relativeHeading, u, v, height);
  return {
    heading: frame.heading,
    leaf: point(centre),
    rails: [point(spacing / 2, gate.railHeight), point(spacing * 1.5, gate.railHeight)],
    hangers: [point(centre - gate.hangerHalfSpacing), point(centre + gate.hangerHalfSpacing)],
    // The middle post carries two distinct ties side by side on its actual face.
    runnerTies: [
      0,
      spacing - (geometry.section.postSection - bindingSection) / 2,
      spacing + (geometry.section.postSection - bindingSection) / 2,
      spacing * 2,
    ].map((u) =>
      point(
        u,
        gate.railHeight,
        (geometry.section.postSection / 2 + gate.insideOffset - gate.railSection / 2) / 2,
      ),
    ),
  };
}

/** The four stationary cords bridge the actual gap, touching each endpoint only
 * inside the authored post/runner contact region. Never ignore a whole support. */
export function boundaryRunnerTieSolid(
  family: GroundedPanelFamily,
  anchor: WorldPoint,
  heading: number,
) {
  const half = family.presentation.bindingSize / 2,
    length =
      family.geometry.gate.insideOffset -
      family.geometry.gate.railSection / 2 -
      family.geometry.section.postSection / 2,
    a = localPoint(anchor, heading, -half, -length / 2, -half),
    b = localPoint(anchor, heading, half, length / 2, half);
  return {
    bounds: {
      min: { x: Math.min(a.x, b.x), y: a.y, z: Math.min(a.z, b.z) },
      max: { x: Math.max(a.x, b.x), y: b.y, z: Math.max(a.z, b.z) },
    },
  };
}

/** Resolve the role/direction of an actual gate attachment once for every reader. */
function boundaryGateAttachments(world: WorldState, root: Entity) {
  const component = root.assembly,
    family = component && world.assemblyFamilies?.[component.family.id],
    attachments = new Map<string, { role: BoundaryShapeRole | 'runner-tie'; heading: number }>();
  if (
    component?.implementation !== 'grounded-panel-boundary' ||
    family?.implementation !== component.implementation
  )
    return attachments;
  for (const [id, gate] of Object.entries(component.gates)) {
    const from = entityGet(world.entities, gate.postIds[0])?.placement,
      to = entityGet(world.entities, gate.postIds[1])?.placement;
    if (!isAssemblyPlacement(from) || !isAssemblyPlacement(to)) continue;
    const frame = boundarySectionLocalFrame(from.local, to.local, root.spatial.heading);
    if (!frame) continue;
    attachments.set(id, { role: 'gate', heading: frame.heading });
    gate.railIds.forEach((itemId, index) =>
      attachments.set(itemId, {
        role: index === 0 ? 'first-rail' : 'second-rail',
        heading: frame.heading,
      }),
    );
    gate.bindingIds.forEach((itemId, index) =>
      attachments.set(itemId, {
        role: index < 4 ? 'runner-tie' : index === 4 ? 'first-hanger' : 'second-hanger',
        heading: frame.heading,
      }),
    );
  }
  return attachments;
}
/** Actual in-plane cloth dimensions, parallel edges and downward-normal thickness.
 * The lowest upper corner minus full thickness is a conservative clearance bound,
 * distinct from the exact prism and its pointwise underside. */
export function coverGeometry(
  family: FlexibleBayFamily,
  site: WorldPoint,
  heading: number,
  bay: number,
  arrangementId: string,
  cover: AssemblyCoverProfile,
): { bounds: Bounds3; panel: FinitePanel; transmission: number } {
  const heights = assemblyArrangement(family, arrangementId)!.rowHeights;
  const rise = heights[1] - heights[0],
    span = Math.hypot(family.bay.length, rise);
  const halfRun = (cover.length * family.bay.length) / span / 2;
  const halfRise = (cover.length * rise) / span / 2;
  const center = localPoint(site, heading, bay * family.bay.width, 0);
  const midHeight = (heights[0] + heights[1]) / 2;
  const panel: FinitePanel = {
    corners: [
      localPoint(center, heading, -cover.width / 2, -halfRun, midHeight - halfRise),
      localPoint(center, heading, -cover.width / 2, halfRun, midHeight + halfRise),
      localPoint(center, heading, cover.width / 2, halfRun, midHeight + halfRise),
      localPoint(center, heading, cover.width / 2, -halfRun, midHeight - halfRise),
    ],
    thickness: cover.thickness,
  };
  for (const corner of panel.corners) Object.freeze(corner);
  Object.freeze(panel.corners);
  Object.freeze(panel);
  return { panel, bounds: panelGeometry(panel).bounds, transmission: cover.transmission };
}
export function coverBounds(
  family: FlexibleBayFamily,
  site: WorldPoint,
  heading: number,
  bay: number,
  arrangementId: string,
  cover: AssemblyCoverProfile,
): Bounds3 {
  return coverGeometry(family, site, heading, bay, arrangementId, cover).bounds;
}
export function assemblySpanProblem(
  family: FlexibleBayFamily,
  arrangementId: string,
  cover: AssemblyCoverProfile,
): string | undefined {
  const arrangement = assemblyArrangement(family, arrangementId);
  if (!arrangement) return 'Choose one of the authored arrangements.';
  const rise = arrangement.rowHeights[1] - arrangement.rowHeights[0];
  const span = Math.hypot(family.bay.length, rise);
  const lowerEdge =
    (arrangement.rowHeights[0] + arrangement.rowHeights[1]) / 2 -
    (cover.length * Math.abs(rise)) / span / 2;
  if (
    cover.width < family.bay.width + 2 * cover.edge - SPATIAL_LIMITS.epsilon ||
    cover.length < span + 2 * cover.edge - SPATIAL_LIMITS.epsilon ||
    lowerEdge - cover.thickness < family.minimumClearance
  )
    return 'The selected material cannot provide the required in-plane span, overhang and lower-edge headroom.';
}
export function assemblySite(root: Entity): SurfacePoint | undefined {
  const p = root.placement;
  return p?.mode === 'world' && p.supportSurfaceId
    ? { ...p.position, surfaceId: p.supportSurfaceId }
    : undefined;
}
type AssemblyShapes = { posts: SpatialBlocker[]; panels: CoverPanel[] };
// Resolve nested read-only drafts too: an unchanged component can contain children
// previously visited through proxies without having a physical edit of its own.
const geometrySnapshot = <T extends object>(value: T): T =>
  isDraft(value) ? current(value) : value;
/** Unrelated inventions do not change installed shapes. Include each attached
 * material's family because a flexible covering selects its physical profile there. */
function partGeometryDependencies(world: WorldState, root: Entity): unknown[] {
  const view = readOnlyDraftView(world),
    entities = readOnlyDraftView(view.entities),
    definitions = readOnlyDraftView(view.itemDefinitions),
    families = view.assemblyFamilies && readOnlyDraftView(view.assemblyFamilies),
    component = readOnlyDraftView(readOnlyDraftView(root).assembly!);
  return Object.values(readOnlyDraftView(component.parts)).flatMap((part) => {
    const material = entityGet(entities, readOnlyDraftView(part).itemId),
      item = material?.item && readOnlyDraftView(material.item),
      definition = item && definitions[readOnlyDraftView(item.definitionPin).id],
      physical = definition && readOnlyDraftView(definition).assemblyMaterial,
      family = physical && families?.[readOnlyDraftView(physical).familyId];
    return [
      material?.placement && geometrySnapshot(material.placement),
      definition && geometrySnapshot(definition),
      family && geometrySnapshot(family),
    ];
  });
}
const sameComponents = (a: unknown[], b: unknown[]) =>
  a.length === b.length && a.every((part, i) => part === b[i]);
// Only immutable world views reuse geometry. Root pose, actual part placements,
// family dimensions and physical material definitions are all dependencies.
const shapeViews = new WeakMap<
  object,
  {
    placement: Entity['placement'];
    spatial: Entity['spatial'];
    family: AssemblyFamily;
    materials: unknown[];
    shapes: AssemblyShapes;
  }
>();
export function assemblyShapes(world: WorldState, root: Entity): AssemblyShapes {
  const view = readOnlyDraftView(root),
    component = view.assembly && geometrySnapshot(view.assembly),
    site = assemblySite(view),
    families = readOnlyDraftView(world).assemblyFamilies,
    selected = component && families && readOnlyDraftView(families)[component.family.id],
    family = selected && geometrySnapshot(selected),
    placement = view.placement && geometrySnapshot(view.placement),
    spatial = geometrySnapshot(view.spatial);
  if (
    !component ||
    component.retired ||
    !site ||
    !family ||
    component.implementation !== family.implementation
  )
    return { posts: [], panels: [] };
  // Other work may change while every physical input remains immutable. Compare
  // those exact current inputs, not the outer world's mutability or draft identity.
  // docs/performance.md#design-recurring-work-before-implementation
  const materials = partGeometryDependencies(world, root);
  const cacheable = [component, placement, spatial, family, ...materials].every(isImmutableData);
  const prior = cacheable ? shapeViews.get(component) : undefined;
  const parts = Object.values(component.parts);
  if (
    prior &&
    prior.placement === placement &&
    prior.spatial === spatial &&
    prior.family === family &&
    sameComponents(materials, prior.materials)
  )
    return prior.shapes;
  const posts: SpatialBlocker[] = [],
    panels: CoverPanel[] = [],
    gateAttachments = boundaryGateAttachments(world, root);
  for (const part of parts) {
    const material = entityGet(world.entities, part.itemId);
    if (!isAssemblyPlacement(material?.placement)) continue;
    chargeWork({ candidates: 1 });
    if (
      family.implementation === 'grounded-panel-boundary' &&
      component.implementation === 'grounded-panel-boundary'
    ) {
      const gateAttachment = gateAttachments.get(part.itemId);
      if (
        !gateAttachment &&
        part.role !== 'post' &&
        part.role !== 'gate-post' &&
        part.role !== 'panel' &&
        part.role !== 'access-panel'
      )
        continue;
      const placement = material.placement;
      let heading = gateAttachment?.heading ?? root.spatial.heading;
      if (part.role === 'panel' || part.role === 'access-panel') {
        const section = Object.values(component.sections).find(
          (section) => section.panelId === part.itemId,
        );
        const frame =
          section && boundarySectionFrame(world, root, section.fromPostId, section.toPostId);
        if (!frame) continue;
        heading = frame.heading;
      }
      const anchor = localPoint(
          site,
          root.spatial.heading,
          placement.local.x,
          placement.local.z,
          placement.local.y,
        ),
        solid =
          gateAttachment?.role === 'runner-tie'
            ? boundaryRunnerTieSolid(family, anchor, heading)
            : boundarySolidAt(
                family.geometry,
                gateAttachment?.role ?? (part.role as BoundaryShapeRole),
                anchor,
                heading,
              );
      posts.push({
        id: part.itemId,
        ...solid,
        movement: true,
        sight: true,
        acousticTransmission: 1,
        material:
          part.role === 'binding'
            ? family.materials.binding
            : part.role === 'post' ||
                part.role === 'gate-post' ||
                part.role === 'first-rail' ||
                part.role === 'second-rail'
              ? family.materials.post
              : family.materials.panel,
        nonWalkable: true,
      });
    } else if (
      family.implementation === 'four-corner-flexible-bays' &&
      component.implementation === 'four-corner-flexible-bays' &&
      part.role === 'post'
    ) {
      posts.push({
        id: part.itemId,
        bounds: postBounds(
          family,
          site,
          root.spatial.heading,
          part.slot,
          materialPostHeight(world, part.itemId)!,
        ),
        movement: true,
        sight: true,
        acousticTransmission: 0,
        material: family.materials.post,
      });
    } else if (
      family.implementation === 'four-corner-flexible-bays' &&
      component.implementation === 'four-corner-flexible-bays' &&
      part.role === 'cover'
    )
      panels.push({
        id: part.itemId,
        ...coverGeometry(
          family,
          site,
          root.spatial.heading,
          part.bay,
          component.arrangementId,
          materialCoverProfile(world, part.itemId)!,
        ),
      });
  }
  const shapes = { posts, panels };
  if (cacheable)
    shapeViews.set(component, {
      placement,
      spatial,
      family,
      materials,
      shapes,
    });
  return shapes;
}
/** Only actual flexible coverings receive the family's overlap exemption. */
export function isInstalledCover(world: WorldState, id: string): boolean {
  const item = entityGet(world.entities, id),
    rootId = item?.item?.assemblyClaim?.rootId;
  return (
    !!rootId &&
    isAssemblyPlacement(item?.placement) &&
    item.placement.parentEntityId === rootId &&
    entityGet(world.entities, rootId)?.assembly?.parts[id]?.role === 'cover'
  );
}
const sharedMaps = new WeakMap<
  SpatialMap,
  { revision: number; components: unknown[]; map: SpatialMap }
>();
const cache = new WeakMap<WorldState, { base: SpatialMap; revision: number; map: SpatialMap }>();
function geometryComponents(world: WorldState, roots: Entity[]): unknown[] {
  const components: unknown[] = roots.flatMap((root) => [
    root.assembly!.parts,
    world.assemblyFamilies?.[root.assembly!.family.id],
    root.assembly!.arrangementId,
    root.placement!,
    root.spatial,
    ...partGeometryDependencies(world, root),
    // Section/gate relationships determine panel headings and attachment roles.
    // Their physical placements above also change during gate travel.
    ...(root.assembly!.implementation === 'grounded-panel-boundary'
      ? [
          root.assembly!.sections,
          ...Object.values(root.assembly!.gates).flatMap((gate) => [
            gate.postIds,
            gate.railIds,
            gate.bindingIds,
          ]),
        ]
      : []),
  ]);
  return components.map((value) => (isDraft(value) ? current(value) : value));
}
function shareImmutableGeometry(
  base: SpatialMap,
  revision: number,
  components: unknown[],
  map: SpatialMap,
): void {
  if (!isImmutableData(base) || !components.every(isImmutableData)) return;
  freeze(map, true);
  sharedMaps.set(base, { revision, components, map });
}
/** Rebuilt geometry is never persisted or placed in the public starter-map projection. */
export function assemblySpatialMap(world: WorldState, base: SpatialMap): SpatialMap {
  if (!world.assemblyGeometryRevision) return base;
  const cached = cache.get(world);
  if (cached?.base === base && cached.revision === world.assemblyGeometryRevision) {
    // A map may first be prepared before its source world is published. Seal the
    // owned derivative once its exact physical inputs become immutable, so all
    // geometry/perception consumers can use their existing immutable fast paths.
    // docs/performance.md#design-recurring-work-before-implementation
    if (!Object.isFrozen(cached.map) && !isDraft(world) && Object.isFrozen(world)) {
      const roots = worldRootEntities(world, true).filter((root) => root.assembly);
      shareImmutableGeometry(
        base,
        world.assemblyGeometryRevision,
        geometryComponents(world, roots),
        cached.map,
      );
    }
    return cached.map;
  }
  const roots = worldRootEntities(world, true).filter(
    (root) =>
      root.assembly && !root.assembly.retired && Object.keys(root.assembly.parts).length > 0,
  );
  const components = geometryComponents(world, roots);
  // Unchanged draft branches still have their immutable identity. A work-only
  // edit must not evict the shared geometry with temporary or revoked proxies.
  // Changed mutable dependencies remain local until their owner publishes them.
  // docs/performance.md#design-recurring-work-before-implementation
  const shared = sharedMaps.get(base);
  if (
    shared?.revision === world.assemblyGeometryRevision &&
    sameComponents(components, shared.components)
  ) {
    cache.set(world, { base, revision: world.assemblyGeometryRevision, map: shared.map });
    return shared.map;
  }
  // A native caller may hand over an unfrozen builder. Its unchanged physical
  // dependencies still identify the exact predecessor within this transition;
  // do not reject prepared routes merely because the new draft has a new owner.
  const predecessor = isDraft(world) ? original(world)! : undefined;
  if (
    predecessor?.map === base &&
    predecessor.assemblyGeometryRevision === world.assemblyGeometryRevision &&
    sameComponents(
      components,
      geometryComponents(
        predecessor,
        roots.map((root) => entityGet(predecessor.entities, root.id)!),
      ),
    )
  ) {
    const map = assemblySpatialMap(predecessor, base);
    shareImmutableGeometry(base, world.assemblyGeometryRevision, components, map);
    cache.set(world, { base, revision: world.assemblyGeometryRevision, map });
    return map;
  }
  const blockers = [...base.spatial.blockers];
  for (const root of roots) {
    if (!root.assembly) continue;
    const shapes = assemblyShapes(world, root);
    const family = world.assemblyFamilies![root.assembly.family.id]!;
    blockers.push(
      ...shapes.posts,
      ...(family.implementation === 'four-corner-flexible-bays'
        ? shapes.panels.map((panel) => ({
            id: panel.id,
            bounds: panel.bounds,
            panel: panel.panel,
            movement: true,
            sight: false,
            acousticTransmission: 1,
            material: family.materials.cover,
            nonWalkable: true,
          }))
        : []),
    );
  }
  const map = {
    ...base,
    spatial: {
      ...base.spatial,
      revision: base.spatial.revision + world.assemblyGeometryRevision,
      blockers,
    },
  };
  cache.set(world, { base, revision: world.assemblyGeometryRevision, map });
  shareImmutableGeometry(base, world.assemblyGeometryRevision, components, map);
  return map;
}

/** Local boxes share the attachment owner's one transform. Posts/panels/leaf
 * use a base-centre origin; runners use their centre; hanging cords use the leaf's
 * base elevation and their own horizontal centre. Apertures and lap joints are
 * real empty space, never collision exceptions for a whole object. */
export function boundaryLocalBoxes(
  geometry: GroundedPanelGeometry,
  role: BoundaryShapeRole,
): Bounds3[] {
  const section = geometry.section,
    gate = geometry.gate;
  const box = (
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
  ): Bounds3 => ({ min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } });
  if (role === 'post' || role === 'gate-post') {
    const half = section.postSection / 2;
    return [
      box(
        -half,
        half,
        0,
        role === 'post' ? section.postHeight : section.gatePostHeight,
        -half,
        half,
      ),
    ];
  }
  if (role === 'panel' || role === 'access-panel') {
    const half = section.panelWidth / 2,
      thickness = section.panelThickness / 2;
    if (role === 'panel') return [box(-half, half, 0, section.panelHeight, -thickness, thickness)];
    const opening = section.accessOpening,
      edge = opening.width / 2;
    return [
      box(-half, -edge, 0, section.panelHeight, -thickness, thickness),
      box(edge, half, 0, section.panelHeight, -thickness, thickness),
      box(-edge, edge, 0, opening.bottom, -thickness, thickness),
      box(-edge, edge, opening.top, section.panelHeight, -thickness, thickness),
    ];
  }
  if (role === 'gate')
    return [
      box(-gate.width / 2, gate.width / 2, 0, gate.height, -gate.thickness / 2, gate.thickness / 2),
    ];
  if (role === 'first-hanger' || role === 'second-hanger') {
    const half = gate.hangerSection / 2;
    return [box(-half, half, gate.height, gate.railHeight - gate.railSection / 2, -half, half)];
  }
  const halfLength = gate.railLength / 2,
    halfSection = gate.railSection / 2;
  // Each actual reversible runner has one complementary half-depth end.
  const lap = gate.railLength - section.spacing;
  return role === 'first-rail'
    ? [
        box(-halfLength, halfLength - lap, -halfSection, halfSection, -halfSection, halfSection),
        box(halfLength - lap, halfLength, -halfSection, 0, -halfSection, halfSection),
      ]
    : [
        box(-halfLength, -halfLength + lap, 0, halfSection, -halfSection, halfSection),
        box(-halfLength + lap, halfLength, -halfSection, halfSection, -halfSection, halfSection),
      ];
}
export function boundaryBoxesAt(
  geometry: GroundedPanelGeometry,
  role: BoundaryShapeRole,
  anchor: WorldPoint,
  heading: number,
): Bounds3[] {
  return boundaryLocalBoxes(geometry, role).map((box) => {
    const a = localPoint(anchor, heading, box.min.x, box.min.z, box.min.y),
      b = localPoint(anchor, heading, box.max.x, box.max.z, box.max.y);
    return {
      min: { x: Math.min(a.x, b.x), y: a.y, z: Math.min(a.z, b.z) },
      max: { x: Math.max(a.x, b.x), y: b.y, z: Math.max(a.z, b.z) },
    };
  });
}
/** Exact axial sweep of the leaf and both hanging cords. Evaluate each prism;
 * their enclosing box would incorrectly obstruct empty space above the leaf. */
export function boundaryGateSweep(
  geometry: GroundedPanelGeometry,
  site: WorldPoint,
  heading: number,
  from: 'open' | 'closed',
  to: 'open' | 'closed',
): Bounds3[] {
  const gate = geometry.gate;
  const fromU = geometry.section.spacing / 2 + (from === 'open' ? gate.travel : 0),
    toU = geometry.section.spacing / 2 + (to === 'open' ? gate.travel : 0);
  return (['gate', 'first-hanger', 'second-hanger'] as const).flatMap((role) => {
    const hangerOffset =
      role === 'first-hanger'
        ? -gate.hangerHalfSpacing
        : role === 'second-hanger'
          ? gate.hangerHalfSpacing
          : 0;
    return boundaryLocalBoxes(geometry, role).map((box) => {
      const a = localPoint(
          site,
          heading,
          Math.min(fromU, toU) + hangerOffset + box.min.x,
          gate.insideOffset + box.min.z,
          box.min.y,
        ),
        b = localPoint(
          site,
          heading,
          Math.max(fromU, toU) + hangerOffset + box.max.x,
          gate.insideOffset + box.max.z,
          box.max.y,
        );
      return {
        min: { x: Math.min(a.x, b.x), y: a.y, z: Math.min(a.z, b.z) },
        max: { x: Math.max(a.x, b.x), y: b.y, z: Math.max(a.z, b.z) },
      };
    });
  });
}

/** The two reached handles move with the leaf; the inside bar uses the inside
 * anchor. Calling this read grants neither handling capability nor authority. */
export function boundaryGateHandle(
  geometry: GroundedPanelGeometry,
  site: WorldPoint,
  heading: number,
  position: 'open' | 'closed',
  side: 'inside' | 'outside',
): WorldPoint {
  return localPoint(
    site,
    heading,
    geometry.section.spacing / 2 + (position === 'open' ? geometry.gate.travel : 0),
    side === 'inside' ? geometry.gate.insideHandleOffset : geometry.gate.outsideHandleOffset,
    geometry.gate.handleHeight,
  );
}
