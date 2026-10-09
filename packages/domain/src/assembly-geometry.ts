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
import type { AssemblyFamily } from './assembly-types.js';
import { panelGeometry, SPATIAL_LIMITS } from '@open-legend/spatial';
import { chargeWork } from './work-budget.js';
import { current, isDraft } from 'immer';

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
export function postLocal(family: AssemblyFamily, slot: string): WorldPoint {
  const [column, row] = slot.split(':').map(Number);
  return {
    x: -family.bay.width / 2 + column! * family.bay.width,
    y: 0,
    z: row === 0 ? -family.bay.length / 2 : family.bay.length / 2,
  };
}
export function postBounds(
  family: AssemblyFamily,
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
export function assemblyArrangement(family: AssemblyFamily, id: string) {
  return family.arrangements.find((arrangement) => arrangement.id === id);
}
export function postHeightForSlot(
  family: AssemblyFamily,
  arrangementId: string,
  slot: string,
): number {
  return assemblyArrangement(family, arrangementId)!.rowHeights[Number(slot.split(':')[1])]!;
}
export function materialPostHeight(world: WorldState, id: string): number | undefined {
  const item = world.entities[id]?.item;
  return item && world.itemDefinitions[item.definitionPin.id]?.assemblyMaterial?.postHeight;
}
/** Actual in-plane cloth dimensions, parallel edges and downward-normal thickness.
 * The lowest upper corner minus full thickness is a conservative clearance bound,
 * distinct from the exact prism and its pointwise underside. */
export function coverGeometry(
  family: AssemblyFamily,
  site: WorldPoint,
  heading: number,
  bay: number,
  arrangementId: string,
): { bounds: Bounds3; panel: FinitePanel } {
  const heights = assemblyArrangement(family, arrangementId)!.rowHeights;
  const rise = heights[1] - heights[0],
    span = Math.hypot(family.bay.length, rise);
  const halfRun = (family.cover.length * family.bay.length) / span / 2;
  const halfRise = (family.cover.length * rise) / span / 2;
  const center = localPoint(site, heading, bay * family.bay.width, 0);
  const midHeight = (heights[0] + heights[1]) / 2;
  const panel: FinitePanel = {
    corners: [
      localPoint(center, heading, -family.cover.width / 2, -halfRun, midHeight - halfRise),
      localPoint(center, heading, -family.cover.width / 2, halfRun, midHeight + halfRise),
      localPoint(center, heading, family.cover.width / 2, halfRun, midHeight + halfRise),
      localPoint(center, heading, family.cover.width / 2, -halfRun, midHeight - halfRise),
    ],
    thickness: family.cover.thickness,
  };
  for (const corner of panel.corners) Object.freeze(corner);
  Object.freeze(panel.corners);
  Object.freeze(panel);
  return { panel, bounds: panelGeometry(panel).bounds };
}
export function coverBounds(
  family: AssemblyFamily,
  site: WorldPoint,
  heading: number,
  bay: number,
  arrangementId: string,
): Bounds3 {
  return coverGeometry(family, site, heading, bay, arrangementId).bounds;
}
export function assemblySpanProblem(
  family: AssemblyFamily,
  arrangementId: string,
): string | undefined {
  const arrangement = assemblyArrangement(family, arrangementId);
  if (!arrangement) return 'Choose one of the authored arrangements.';
  const rise = arrangement.rowHeights[1] - arrangement.rowHeights[0];
  const span = Math.hypot(family.bay.length, rise);
  const lowerEdge =
    (arrangement.rowHeights[0] + arrangement.rowHeights[1]) / 2 -
    (family.cover.length * Math.abs(rise)) / span / 2;
  if (
    family.cover.width < family.bay.width + 2 * family.cover.edge - SPATIAL_LIMITS.epsilon ||
    family.cover.length < span + 2 * family.cover.edge - SPATIAL_LIMITS.epsilon ||
    lowerEdge - family.cover.thickness < family.minimumClearance
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
// Only immutable world views reuse geometry. Root pose, actual part placements,
// family dimensions and physical material definitions are all dependencies.
const shapeViews = new WeakMap<
  object,
  {
    placement: Entity['placement'];
    spatial: Entity['spatial'];
    family: AssemblyFamily;
    definitions: WorldState['itemDefinitions'];
    placements: Entity['placement'][];
    shapes: AssemblyShapes;
  }
>();
export function assemblyShapes(world: WorldState, root: Entity): AssemblyShapes {
  const component = root.assembly,
    site = assemblySite(root),
    family = component && world.assemblyFamilies?.[component.family.id];
  if (!component || component.retired || !site || !family) return { posts: [], panels: [] };
  const cacheable = Object.isFrozen(world);
  const prior = cacheable ? shapeViews.get(component) : undefined;
  const parts = Object.values(component.parts);
  const placements = cacheable ? parts.map((part) => world.entities[part.itemId]?.placement) : [];
  if (
    prior &&
    prior.placement === root.placement &&
    prior.spatial === root.spatial &&
    prior.family === family &&
    prior.definitions === world.itemDefinitions &&
    placements.length === prior.placements.length &&
    placements.every((p, i) => p === prior.placements[i])
  )
    return prior.shapes;
  const posts: SpatialBlocker[] = [],
    panels: CoverPanel[] = [];
  for (const part of parts) {
    const material = world.entities[part.itemId];
    if (!isAssemblyPlacement(material?.placement)) continue;
    chargeWork({ candidates: 1 });
    if (part.role === 'post') {
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
    } else if (part.role === 'cover')
      panels.push({
        id: part.itemId,
        ...coverGeometry(family, site, root.spatial.heading, part.bay, component.arrangementId),
        transmission: family.cover.transmission,
      });
  }
  const shapes = { posts, panels };
  if (cacheable)
    shapeViews.set(component, {
      placement: root.placement,
      spatial: root.spatial,
      family,
      definitions: world.itemDefinitions,
      placements,
      shapes,
    });
  return shapes;
}
/** Only actual flexible coverings receive the family's overlap exemption. */
export function isInstalledCover(world: WorldState, id: string): boolean {
  const item = world.entities[id],
    rootId = item?.item?.assemblyClaim?.rootId;
  return (
    !!rootId &&
    isAssemblyPlacement(item?.placement) &&
    item.placement.parentEntityId === rootId &&
    world.entities[rootId]?.assembly?.parts[id]?.role === 'cover'
  );
}
const sharedMaps = new WeakMap<
  SpatialMap,
  { revision: number; components: unknown[]; map: SpatialMap }
>();
const cache = new WeakMap<WorldState, { base: SpatialMap; revision: number; map: SpatialMap }>();
/** Rebuilt geometry is never persisted or placed in the public starter-map projection. */
export function assemblySpatialMap(world: WorldState, base: SpatialMap): SpatialMap {
  if (!world.assemblyGeometryRevision) return base;
  const cached = cache.get(world);
  if (cached?.base === base && cached.revision === world.assemblyGeometryRevision)
    return cached.map;
  const roots = worldRootEntities(world, true).filter(
    (root) =>
      root.assembly && !root.assembly.retired && Object.keys(root.assembly.parts).length > 0,
  );
  const components: unknown[] = roots.flatMap((root) => [
    root.assembly!.parts,
    root.assembly!.family,
    root.assembly!.arrangementId,
    root.placement!,
    root.spatial,
  ]);
  components.push(world.assemblyFamilies!, world.itemDefinitions);
  // Unchanged draft branches still have their immutable identity. A work-only
  // edit must not evict the shared geometry with temporary or revoked proxies.
  // Changed mutable dependencies remain local until their owner publishes them.
  // docs/performance.md#design-recurring-work-before-implementation
  for (let i = 0; i < components.length; i++) {
    const value = components[i];
    if (isDraft(value)) components[i] = current(value);
  }
  const shared = sharedMaps.get(base);
  if (
    shared?.revision === world.assemblyGeometryRevision &&
    components.length === shared.components.length &&
    components.every((part, i) => part === shared.components[i])
  ) {
    cache.set(world, { base, revision: world.assemblyGeometryRevision, map: shared.map });
    return shared.map;
  }
  const blockers = [...base.spatial.blockers];
  for (const root of roots) {
    if (!root.assembly) continue;
    const shapes = assemblyShapes(world, root);
    blockers.push(
      ...shapes.posts,
      ...shapes.panels.map((panel) => ({
        id: panel.id,
        bounds: panel.bounds,
        panel: panel.panel,
        movement: true,
        sight: false,
        acousticTransmission: 1,
        material: world.assemblyFamilies![root.assembly!.family.id]!.materials.cover,
        nonWalkable: true,
      })),
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
  if (components.every((part) => typeof part !== 'object' || Object.isFrozen(part)))
    sharedMaps.set(base, { revision: world.assemblyGeometryRevision, components, map });
  return map;
}
