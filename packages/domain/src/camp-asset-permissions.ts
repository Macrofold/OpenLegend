import type { ConstructionPermission } from './assembly-types.js';
import { outcome } from './events.js';
import { isSafeRecordId } from './records.js';
import { chargeWork } from './work-budget.js';
import type { Bounds3 } from '@open-legend/spatial';
import type { DefinitionPin } from './world-modules.js';
import { definitionPin } from './world-modules.js';
import type { GateOperation, GroundedPanelFamily } from './boundary-types.js';
import type { WorldState } from './types.js';
import { entityGet } from './entity-collection.js';
import { readState, sameDefinitionPin } from './state-owners.js';
import { isAssemblyPlacement } from './spatial-state.js';
import {
  assemblySite,
  assemblyShapes,
  boundaryGateSweep,
  boundarySectionFrame,
  localPoint,
} from './assembly-geometry.js';

/** Current operational authority, never serialized in a gameplay checkpoint.
 * Public use supplies no custody, construction, impact or material-use right. */
export interface CampAssetPermission {
  kind: 'gate-use' | 'structural-impact';
  id: string;
  worldId: string;
  assemblyId: string;
  revision: number;
  revoked: boolean;
  family: DefinitionPin;
  site: { surfaceId: string; minX: number; maxX: number; minZ: number; maxZ: number };
  operations: Array<GateOperation | 'held-tool-impact'>;
  assets: Array<{ itemId: string; definition: DefinitionPin; originIds: string[] }>;
}

function exactGate(world: WorldState, permission: CampAssetPermission, itemId: string) {
  const root = entityGet(world.entities, permission.assemblyId),
    component = root?.assembly,
    family = component && world.assemblyFamilies?.[component.family.id],
    asset = permission.assets.find((asset) => asset.itemId === itemId),
    item = entityGet(world.entities, itemId),
    placement = item?.placement,
    gate =
      component?.implementation === 'grounded-panel-boundary' ? component.gates[itemId] : undefined,
    site = root && assemblySite(root);
  if (
    permission.worldId !== world.id ||
    !root ||
    component?.implementation !== 'grounded-panel-boundary' ||
    component.retired ||
    family?.implementation !== component.implementation ||
    !gate ||
    !asset ||
    !site ||
    site.surfaceId !== permission.site.surfaceId ||
    !sameDefinitionPin(permission.family, definitionPin(family)) ||
    !sameDefinitionPin(component.family, permission.family) ||
    !item?.item ||
    !sameDefinitionPin(item.item.definitionPin, asset.definition) ||
    !sameDefinitionPin(asset.definition, family.roles.gate) ||
    !isAssemblyPlacement(placement) ||
    placement.parentEntityId !== root.id ||
    component.parts[itemId]?.role !== 'gate'
  )
    return;
  const origins = item.item.materialOriginIds,
    permittedOrigins = new Set(asset.originIds);
  if (
    !origins ||
    origins.length !== asset.originIds.length ||
    !origins.every((origin) => permittedOrigins.has(origin))
  )
    return;
  const post = entityGet(world.entities, gate.postIds[0])?.placement,
    frame = boundarySectionFrame(world, root, gate.postIds[0], gate.postIds[1]);
  if (!isAssemblyPlacement(post) || !frame) return;
  const anchor = localPoint(site, root.spatial.heading, post.local.x, post.local.z, post.local.y),
    sweep = boundaryGateSweep(family.geometry, anchor, frame.heading, 'closed', 'open');
  const contained = (bounds: Bounds3) =>
    bounds.min.x >= permission.site.minX &&
    bounds.max.x <= permission.site.maxX &&
    bounds.min.z >= permission.site.minZ &&
    bounds.max.z <= permission.site.maxZ;
  if (!sweep.every(contained)) return;
  return true;
}

/** New grants must name actual current assets. An old unrelated removed asset
 * never invalidates a still-exact target when an existing grant is later used. */
export function campAssetPermissionCurrent(
  world: WorldState,
  permission: CampAssetPermission,
): boolean {
  const family = world.assemblyFamilies?.[permission.family.id];
  if (permission.kind === 'structural-impact')
    return (
      family?.implementation === 'grounded-panel-boundary' &&
      !!family.damage &&
      permission.operations.length === 1 &&
      permission.operations[0] === 'held-tool-impact' &&
      permission.assets.length > 0 &&
      permission.assets.length <= family.limits.parts &&
      permission.assets.every((asset) => !!exactStructuralAsset(world, permission, asset.itemId))
    );
  return (
    permission.kind === 'gate-use' &&
    family?.implementation === 'grounded-panel-boundary' &&
    permission.assets.length > 0 &&
    permission.assets.length <= family.limits.gates &&
    permission.operations.every((operation) => operation !== 'held-tool-impact') &&
    permission.assets.every((asset) => !!exactGate(world, permission, asset.itemId))
  );
}

/** One complete grant must cover the exact gate, law, origins and full operation
 * space. This read grants neither physical handling nor a bypass through a wall. */
export function gateUsePermission(
  world: WorldState,
  assemblyId: string,
  itemId: string,
  operation: GateOperation,
  permissions: readonly CampAssetPermission[],
  permissionId?: string,
): CampAssetPermission | undefined {
  return permissions.find(
    (permission) =>
      permission.kind === 'gate-use' &&
      (permissionId === undefined || permission.id === permissionId) &&
      !permission.revoked &&
      permission.assemblyId === assemblyId &&
      permission.operations.includes(operation) &&
      !!exactGate(world, permission, itemId),
  );
}

/** A publication allowance names an installed exact law, never a future law. */
export function gatePublicationPolicyCurrent(
  world: WorldState,
  policy: NonNullable<ConstructionPermission['publicGateUse']>,
): boolean {
  const family = world.assemblyFamilies?.[policy.family.id];
  return (
    family?.implementation === 'grounded-panel-boundary' &&
    sameDefinitionPin(policy.family, definitionPin(family))
  );
}

export interface CampAssetPublication {
  before?: CampAssetPermission;
  after: CampAssetPermission;
}

/** One physical gate keeps its operational identity across reinstallation. The
 * namespace is distinct from a native entity reference, with one variable part. */
export function publishedGatePermissionId(itemId: string): string {
  return `gate-use:${itemId}`;
}

/** Re-derive only the delegated authority. The native assembly owner separately
 * proves physical installation; SQL repeats this calculation with locked grants. */
function publishedAssetPermission(
  source: ConstructionPermission,
  assemblyId: string,
  asset: CampAssetPermission['assets'][number],
  kind: CampAssetPermission['kind'],
  before?: CampAssetPermission,
): CampAssetPermission | undefined {
  const policy = kind === 'gate-use' ? source.publicGateUse : source.structuralExposure,
    id =
      kind === 'gate-use'
        ? publishedGatePermissionId(asset.itemId)
        : publishedStructuralPermissionId(asset.itemId),
    assetOrigins = new Set(asset.originIds);
  if (
    !policy ||
    !policy.operations.length ||
    source.revoked ||
    !isSafeRecordId(id) ||
    (kind === 'gate-use'
      ? !source.operations.includes('boundary-gate')
      : !['post', 'boundary-panel', 'boundary-gate'].some((operation) =>
          source.operations.some((allowed) => allowed === operation),
        )) ||
    !assetOrigins.size ||
    assetOrigins.size !== asset.originIds.length ||
    (before &&
      (before.kind !== kind ||
        before.id !== id ||
        before.worldId !== source.worldId ||
        before.assets.length !== 1 ||
        before.assets[0]!.itemId !== asset.itemId ||
        !sameDefinitionPin(before.family, policy.family) ||
        !sameDefinitionPin(before.assets[0]!.definition, asset.definition) ||
        before.assets[0]!.originIds.length !== asset.originIds.length ||
        !before.assets[0]!.originIds.every((origin) => assetOrigins.has(origin))))
  )
    return;
  chargeWork({ candidates: source.materialIds.length, tests: asset.originIds.length });
  const origins = new Set(source.materialIds);
  if (!asset.originIds.every((origin) => origins.has(origin))) return;
  // Reinstallation cannot restore a revoked grant or an operation the operator
  // removed. Gate use and material impact share this exact publication owner.
  const operations = before
    ? before.operations.filter((operation) =>
        policy.operations.some((allowed) => allowed === operation),
      )
    : [...policy.operations];
  return {
    kind,
    id,
    worldId: source.worldId,
    assemblyId,
    revision: (before?.revision ?? 0) + 1,
    revoked: !!before?.revoked || !operations.length,
    family: { ...policy.family },
    site: { ...source.site },
    operations: operations.length ? operations : [...before!.operations],
    assets: [
      {
        itemId: asset.itemId,
        definition: { ...asset.definition },
        originIds: [...asset.originIds],
      },
    ],
  };
}
export function publishedGatePermission(
  source: ConstructionPermission,
  assemblyId: string,
  asset: CampAssetPermission['assets'][number],
  before?: CampAssetPermission,
): CampAssetPermission | undefined {
  return publishedAssetPermission(source, assemblyId, asset, 'gate-use', before);
}

/** Called on the private completed construction candidate, before any parts or
 * permission are published. No allowance means no automatic registration. */
export function prepareGatePublication(
  world: WorldState,
  source: ConstructionPermission,
  assemblyId: string,
  itemId: string,
  permissions: readonly CampAssetPermission[],
): CampAssetPublication | import('./types.js').Outcome | undefined {
  if (!source.publicGateUse) return;
  const item = entityGet(world.entities, itemId)?.item,
    before = permissions.find((permission) => permission.id === publishedGatePermissionId(itemId));
  const after =
    item?.materialOriginIds &&
    publishedGatePermission(
      source,
      assemblyId,
      {
        itemId,
        definition: item.definitionPin,
        originIds: item.materialOriginIds,
      },
      before,
    );
  if (!after || !campAssetPermissionCurrent(world, after))
    return outcome(
      false,
      'gate-registration',
      'The completed gate cannot be registered under the current exact publication permission.',
    );
  return { ...(before ? { before } : {}), after };
}

function exactStructuralAsset(world: WorldState, permission: CampAssetPermission, itemId: string) {
  const root = entityGet(world.entities, permission.assemblyId),
    component = root?.assembly,
    family = component && world.assemblyFamilies?.[component.family.id],
    site = root && assemblySite(root),
    asset = permission.assets.find((asset) => asset.itemId === itemId),
    item = entityGet(world.entities, itemId),
    part =
      component?.implementation === 'grounded-panel-boundary' ? component.parts[itemId] : undefined;
  if (
    permission.worldId !== world.id ||
    !site ||
    site.surfaceId !== permission.site.surfaceId ||
    component?.implementation !== 'grounded-panel-boundary' ||
    component.retired ||
    family?.implementation !== component.implementation ||
    !family.damage ||
    !part ||
    part.role === 'binding' ||
    !sameDefinitionPin(permission.family, definitionPin(family)) ||
    !sameDefinitionPin(component.family, permission.family) ||
    !asset ||
    !item?.item ||
    !sameDefinitionPin(item.item.definitionPin, asset.definition) ||
    !isAssemblyPlacement(item.placement) ||
    item.placement.parentEntityId !== root!.id
  )
    return;
  const role =
      part.role === 'post' || part.role === 'gate-post'
        ? 'post'
        : part.role === 'panel' || part.role === 'access-panel'
          ? 'panel'
          : part.role === 'gate'
            ? 'gate'
            : 'rail',
    state = readState(world, { entityId: itemId, definition: family.integrity[role] }, 'owner'),
    origins = new Set(asset.originIds),
    shape = assemblyShapes(world, root!).posts.find((shape) => shape.id === itemId);
  return (
    state.status === 'known' &&
    typeof state.value === 'number' &&
    state.value > 0 &&
    item.item.materialOriginIds?.length === origins.size &&
    asset.originIds.length === origins.size &&
    item.item.materialOriginIds.every((id) => origins.has(id)) &&
    !!shape &&
    shape.bounds.min.x >= permission.site.minX &&
    shape.bounds.max.x <= permission.site.maxX &&
    shape.bounds.min.z >= permission.site.minZ &&
    shape.bounds.max.z <= permission.site.maxZ
  );
}

export function structuralImpactPermission(
  world: WorldState,
  assemblyId: string,
  itemId: string,
  permissions: readonly CampAssetPermission[],
  permissionId?: string,
) {
  chargeWork({ candidates: permissions.length });
  return permissions.find(
    (permission) =>
      permission.kind === 'structural-impact' &&
      (permissionId === undefined || permission.id === permissionId) &&
      !permission.revoked &&
      permission.assemblyId === assemblyId &&
      permission.operations.includes('held-tool-impact') &&
      exactStructuralAsset(world, permission, itemId),
  );
}
export function structuralExposurePolicyCurrent(
  world: WorldState,
  policy: NonNullable<ConstructionPermission['structuralExposure']>,
) {
  const family = world.assemblyFamilies?.[policy.family.id];
  return (
    family?.implementation === 'grounded-panel-boundary' &&
    !!family.damage &&
    sameDefinitionPin(policy.family, definitionPin(family))
  );
}
export function publishedStructuralPermissionId(itemId: string) {
  return `structural-impact:${itemId}`;
}
/** Publication derives only the right for the operation that installs this role. */
export function structuralConstructionOperation(
  family: GroundedPanelFamily,
  definition: DefinitionPin,
): 'post' | 'boundary-panel' | 'boundary-gate' | undefined {
  if ([family.roles.post, family.roles.gatePost].some((pin) => sameDefinitionPin(pin, definition)))
    return 'post';
  if (
    [family.roles.panel, family.roles.parkingPanel].some((pin) =>
      sameDefinitionPin(pin, definition),
    )
  )
    return 'boundary-panel';
  if ([family.roles.gate, family.roles.rail].some((pin) => sameDefinitionPin(pin, definition)))
    return 'boundary-gate';
}
export function publishedStructuralPermission(
  source: ConstructionPermission,
  assemblyId: string,
  asset: CampAssetPermission['assets'][number],
  before?: CampAssetPermission,
): CampAssetPermission | undefined {
  return publishedAssetPermission(source, assemblyId, asset, 'structural-impact', before);
}
export function prepareStructuralPublication(
  world: WorldState,
  source: ConstructionPermission,
  assemblyId: string,
  itemId: string,
  permissions: readonly CampAssetPermission[],
): CampAssetPublication | import('./types.js').Outcome | undefined {
  if (!source.structuralExposure) return;
  const family = world.assemblyFamilies?.[source.structuralExposure.family.id];
  const item = entityGet(world.entities, itemId)?.item,
    before = permissions.find(
      (permission) => permission.id === publishedStructuralPermissionId(itemId),
    ),
    after =
      item?.materialOriginIds &&
      publishedStructuralPermission(
        source,
        assemblyId,
        { itemId, definition: item.definitionPin, originIds: item.materialOriginIds },
        before,
      );
  const operation =
    family?.implementation === 'grounded-panel-boundary' && item
      ? structuralConstructionOperation(family, item.definitionPin)
      : undefined;
  if (
    !after ||
    !operation ||
    !source.operations.includes(operation) ||
    !campAssetPermissionCurrent(world, after)
  )
    return outcome(
      false,
      'exposure-registration',
      'The completed part cannot be registered under current exact exposure permission.',
    );
  return { ...(before ? { before } : {}), after };
}
