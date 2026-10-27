import { constructionPermissionCurrent } from './construction-contributions.js';
import {
  cylinderIntersects,
  finitePoint,
  physicalIntersections,
  MOVEMENT,
  SPATIAL_LIMITS,
  surfaceById,
  surfaceHeight,
  surfaceSupportsDisk,
  type Bounds3,
  type SurfacePoint,
  type WorldPoint,
} from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import {
  bodyProfile,
  bodySpace,
  spatialMap,
  worldPosition,
  worldPlacement,
  groundedSpatial,
} from './spatial-state.js';
import {
  nearbyBodyEntities,
  findPhysicalWorkApproach,
  physicalWorkPointAvailable,
  type PhysicalWorkPoint,
} from './spatial.js';
import { outcome } from './events.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { tracksMaterialOrigins } from './material-inventory.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { chargeWork } from './work-budget.js';
import { pointVisionQuery } from './perception.js';
import { accessiblePossession, possessionItems } from './object-access.js';
import { canHandleItems } from './item-handling.js';
import { itemFor } from './objects.js';
import { materialAuthorized } from './assemblies.js';
import type { ConstructionPermission } from './assembly-types.js';
import {
  availableItemQuantity,
  heldInvocationResources,
  reserveResource,
  applyResourceGroup,
  resourceGroupProblem,
  ResourceReservationError,
  type ResourceAvailability,
} from './resource-claims.js';
import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import { entitySet } from './entity-collection.js';
import { nextEntityId } from './data.js';
import { emit } from './events.js';
import { subjectNarration } from './narration.js';
import { rootMembershipChanged } from './entity-index.js';
import { recordSemanticChange } from './dependencies.js';
import type { ConstructionPermissionEffect } from './construction-permissions.js';
import type { Action, Entity, Outcome, WorldEvent, WorldState } from './types.js';

/** Trusted finite placed-fire computation; values/wording belong to the world. */
export interface HearthShapeDefinition {
  id: string;
  version: number;
  implementation: 'campfire-ring';
  name: string;
  description: string;
  actionLabel: string;
  activityText: string;
  completedText: string;
  help: string;
  radiusMetres: number;
  heightMetres: number;
  clearanceHeightMetres: number;
  maximumHeightDifferenceMetres: number;
  terrainOnly: boolean;
  workSeconds: number;
}
export interface HearthDefinition extends HearthShapeDefinition {
  input: { definition: DefinitionPin; quantity: number };
}
export interface PlacedHearth {
  definition: DefinitionPin;
  actorId: string;
  physicalLife: number;
  actionId: string;
}
export interface HearthWork {
  definition: DefinitionPin;
  site: SurfacePoint;
  point: WorldPoint;
  physicalLife: number;
  stones: Array<{ itemId: string; quantity: number; originIds: string[] }>;
}

/** Shared authored/current-format shape checks; input resolution has its own owner. */
export function validateHearthShape(
  value: unknown,
): asserts value is HearthShapeDefinition & { input: unknown } {
  if (
    !hasRecordFields(value, [
      'id',
      'version',
      'implementation',
      'name',
      'description',
      'actionLabel',
      'activityText',
      'completedText',
      'help',
      'radiusMetres',
      'heightMetres',
      'clearanceHeightMetres',
      'maximumHeightDifferenceMetres',
      'terrainOnly',
      'workSeconds',
      'input',
    ]) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    value.implementation !== 'campfire-ring' ||
    typeof value.terrainOnly !== 'boolean' ||
    ['name', 'description', 'actionLabel', 'activityText', 'completedText', 'help'].some(
      (key) => typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 2000,
    ) ||
    ['radiusMetres', 'heightMetres', 'clearanceHeightMetres', 'workSeconds'].some(
      (key) => typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] <= 0,
    ) ||
    typeof value.maximumHeightDifferenceMetres !== 'number' ||
    !Number.isFinite(value.maximumHeightDifferenceMetres) ||
    value.maximumHeightDifferenceMetres < 0 ||
    Number(value.radiusMetres) > SPATIAL_LIMITS.maxExtent ||
    Number(value.clearanceHeightMetres) > SPATIAL_LIMITS.maxExtent ||
    Number(value.heightMetres) > Number(value.clearanceHeightMetres) ||
    Number(value.workSeconds) > 86400
  )
    throw new Error('Invalid finite placed-fire definition.');
}
export function validateHearthDefinition(value: unknown): asserts value is HearthDefinition {
  validateHearthShape(value);
  if (
    !hasRecordFields(value.input, ['definition', 'quantity']) ||
    !isDefinitionPin(value.input.definition) ||
    !Number.isSafeInteger(value.input.quantity) ||
    Number(value.input.quantity) < 1 ||
    Number(value.input.quantity) > 16
  )
    throw new Error('Invalid placed-fire material definition.');
}
export function hearthDefinition(
  world: WorldState,
  pin: DefinitionPin,
): HearthDefinition | undefined {
  const definition = world.hearthDefinitions && getOwn(world.hearthDefinitions, pin.id);
  return definition && sameDefinitionPin(definitionPin(definition), pin) ? definition : undefined;
}
export function validateHearthDefinitions(world: WorldState): void {
  if (world.hearthDefinitions === undefined) return;
  if (
    !world.hearthDefinitions ||
    typeof world.hearthDefinitions !== 'object' ||
    Array.isArray(world.hearthDefinitions)
  )
    throw new Error('Invalid installed placed-fire definitions.');
  for (const [id, definition] of Object.entries(world.hearthDefinitions)) {
    validateHearthDefinition(definition);
    const material = getOwn(world.itemDefinitions, definition.input.definition.id);
    if (
      id !== definition.id ||
      !material ||
      !tracksMaterialOrigins(material) ||
      !sameDefinitionPin(definitionPin(material), definition.input.definition)
    )
      throw new Error('A placed-fire definition needs its exact tracked material.');
  }
}
/** Historical authorship never grants access or requires the creator to remain alive. */
export function validatePlacedHearth(world: WorldState, entity: Entity): void {
  const placed = entity.hearth;
  if (placed === undefined) return;
  if (
    !hasRecordFields(placed, ['definition', 'actorId', 'physicalLife', 'actionId']) ||
    !isDefinitionPin(placed.definition) ||
    !isSafeRecordId(placed.actorId) ||
    !isSafeRecordId(placed.actionId) ||
    !Number.isSafeInteger(placed.physicalLife) ||
    placed.physicalLife < 0
  )
    throw new Error('Invalid placed-fire completion identity.');
  const definition = hearthDefinition(world, placed.definition);
  if (
    !definition ||
    entity.kind !== 'campfire' ||
    !entity.heat ||
    entity.placement?.mode !== 'world' ||
    !entity.placement.supportSurfaceId ||
    entity.spatial.body.radius !== definition.radiusMetres ||
    entity.spatial.body.height !== definition.heightMetres
  )
    throw new Error('A placed fire disagrees with its actual definition or physical object.');
}
export function hearthBounds(
  definition: HearthDefinition,
  site: SurfacePoint,
  height = definition.heightMetres,
): Bounds3 {
  return {
    min: { x: site.x - definition.radiusMetres, y: site.y, z: site.z - definition.radiusMetres },
    max: {
      x: site.x + definition.radiusMetres,
      y: site.y + height,
      z: site.z + definition.radiusMetres,
    },
  };
}
/** Complete finite support/headroom query; no placement, movement or permission effects. */
export function hearthSiteProblem(
  world: WorldState,
  definition: HearthDefinition,
  site: SurfacePoint,
): Outcome | undefined {
  if (!finitePoint(site) || !isSafeRecordId(site.surfaceId))
    return outcome(false, 'unsupported-placement', 'Choose an actual supported place.');
  const map = spatialMap(world),
    surface = surfaceById(map, site.surfaceId);
  if (
    !surface ||
    (definition.terrainOnly && !surface.terrain) ||
    !surfaceSupportsDisk(map, surface, site, definition.radiusMetres) ||
    Math.abs(surfaceHeight(surface, site.x, site.z) - site.y) > SPATIAL_LIMITS.supportTolerance ||
    2 * definition.radiusMetres * Math.hypot(surface.slopeX, surface.slopeZ) >
      definition.maximumHeightDifferenceMetres + SPATIAL_LIMITS.epsilon
  )
    return outcome(
      false,
      'unsupported-placement',
      'The complete footprint needs compatible, sufficiently level support.',
    );
  const bounds = hearthBounds(definition, site, definition.clearanceHeightMetres);
  for (const hit of physicalIntersections(map, { bounds })) {
    chargeWork({ tests: 1 });
    // The selected support is already checked over the complete disk, including
    // its admitted flatness. Other floors/solids receive the exact cylinder query.
    if (hit.kind === 'surface' && hit.id === surface.id) continue;
    const solid = hit.kind === 'surface' ? { ...hit, surface: surfaceById(map, hit.id) } : hit;
    if (cylinderIntersects(solid, site, definition.radiusMetres, definition.clearanceHeightMetres))
      return outcome(
        false,
        'blocked-placement',
        'The footprint or required space above it is occupied.',
      );
  }
  for (const entity of nearbyBodyEntities(world, site, definition.radiusMetres)) {
    if (entity.assembly) continue; // Actual attached solids were checked above.
    chargeWork({ tests: 1 });
    if (
      cylinderIntersects(
        { bounds: bodySpace(world, entity) },
        site,
        definition.radiusMetres,
        definition.clearanceHeightMetres,
      )
    )
      return outcome(false, 'occupied-placement', 'Another body or object occupies this place.');
  }
}
export function hearthWorkCandidates(
  world: WorldState,
  actorId: string,
  definition: HearthDefinition,
  site: SurfacePoint,
): PhysicalWorkPoint[] {
  const actor = entityGet(world.entities, actorId);
  if (!actor?.actor) return [];
  const map = spatialMap(world),
    surface = surfaceById(map, site.surfaceId);
  if (!surface) return [];
  const start = worldPosition(actor),
    angle = Math.atan2(start.z - site.z, start.x - site.x);
  const distance =
    definition.radiusMetres + Math.SQRT2 * bodyProfile(actor).radius + 2 * MOVEMENT.skin;
  return Array.from({ length: 8 }, (_, index) => {
    const heading = angle + (index * Math.PI) / 4;
    const x = site.x + Math.cos(heading) * distance,
      z = site.z + Math.sin(heading) * distance;
    return {
      stance: { x, z, y: surfaceHeight(surface, x, z), surfaceId: site.surfaceId },
      point: {
        x: site.x + Math.cos(heading) * definition.radiusMetres,
        y: site.y + definition.heightMetres,
        z: site.z + Math.sin(heading) * definition.radiusMetres,
      },
      obstruction: { bounds: hearthBounds(definition, site) },
    };
  });
}
export function hearthApproach(
  world: WorldState,
  actorId: string,
  definition: HearthDefinition,
  site: SurfacePoint,
) {
  const actor = entityGet(world.entities, actorId);
  return (
    actor &&
    findPhysicalWorkApproach(
      world,
      actor,
      hearthWorkCandidates(world, actorId, definition, site),
      world.itemHandling.reach,
    )
  );
}

export function validHearthCommand(
  command: Extract<import('./types.js').Command, { type: 'place-hearth' }>,
): boolean {
  return (
    isDefinitionPin({
      id: command.definitionId,
      version: command.definitionVersion,
      digest: command.definitionDigest,
    }) &&
    finitePoint(command.destination) &&
    isSafeRecordId(command.destination.surfaceId)
  );
}

const hearthHoldId = (actionId: string, index: number) => `${actionId}:hearth-input:${index}`;
function siteCovered(
  permission: ConstructionPermission,
  definition: HearthDefinition,
  site: SurfacePoint,
): boolean {
  const bounds = hearthBounds(definition, site);
  return (
    permission.operations.includes('place-hearth') &&
    permission.site.surfaceId === site.surfaceId &&
    permission.site.minX <= bounds.min.x &&
    permission.site.maxX >= bounds.max.x &&
    permission.site.minZ <= bounds.min.z &&
    permission.site.maxZ >= bounds.max.z
  );
}
function hearthMaterials(
  world: WorldState,
  actorId: string,
  definition: HearthDefinition,
  permission: ConstructionPermission,
  availability?: ResourceAvailability,
): { status: 'ready'; stones: HearthWork['stones'] } | { status: 'incomplete' | 'insufficient' } {
  const stones: HearthWork['stones'] = [];
  let needed = definition.input.quantity,
    examined = 0;
  for (const item of possessionItems(world, actorId)) {
    chargeWork({ candidates: 1 });
    if (++examined > STOCK_TRANSFER_LIMITS.examined) return { status: 'incomplete' };
    const lot = entityGet(world.entities, item.id)?.item;
    if (
      !lot ||
      !sameDefinitionPin(lot.definitionPin, definition.input.definition) ||
      !accessiblePossession(world, actorId, item.id) ||
      !materialAuthorized(world, item.id, permission)
    )
      continue;
    const amount = Math.min(needed, availableItemQuantity(world, item.id, undefined, availability));
    if (amount < 1) continue;
    const origins = lot.materialOriginIds!;
    chargeWork({
      candidates: origins.length,
      outputBytes: origins.reduce((n, id) => n + id.length * 3 + 4, 0),
    });
    stones.push({ itemId: item.id, quantity: amount, originIds: [...origins] });
    needed -= amount;
    if (!needed) return { status: 'ready', stones };
    if (stones.length >= STOCK_TRANSFER_LIMITS.movedLots) return { status: 'incomplete' };
  }
  return { status: 'insufficient' };
}
/** Read-only first admission. The chosen exact lots and stance survive approach. */
export function prepareHearthAction(
  world: WorldState,
  actorId: string,
  id: string,
  pin: DefinitionPin,
  site: SurfacePoint,
  permissions: readonly ConstructionPermission[],
  availability?: ResourceAvailability,
): Action | Outcome {
  const actor = entityGet(world.entities, actorId),
    definition = hearthDefinition(world, pin);
  const material = definition && getOwn(world.itemDefinitions, definition.input.definition.id);
  if (
    !actor?.actor ||
    !canHandleItems(world, actor) ||
    !definition ||
    !material ||
    !sameDefinitionPin(definitionPin(material), definition.input.definition)
  )
    return outcome(
      false,
      'unavailable-placement',
      'The selected construction definition or material is unavailable.',
    );
  if (!pointVisionQuery(world, actor)(site))
    return outcome(
      false,
      'not-visible',
      'Move where you can see the selected ground before choosing this work.',
    );
  const problem = hearthSiteProblem(world, definition, site);
  if (problem) return problem;
  let selected: { permission: ConstructionPermission; stones: HearthWork['stones'] } | undefined;
  let incomplete = false;
  for (const permission of permissions) {
    chargeWork({ candidates: 1 });
    if (
      permission.worldId !== world.id ||
      permission.actorId !== actorId ||
      !constructionPermissionCurrent(world, permission) ||
      !siteCovered(permission, definition, site)
    )
      continue;
    const material = hearthMaterials(world, actorId, definition, permission, availability);
    if (material.status === 'ready') {
      selected = { permission, stones: material.stones };
      break;
    }
    incomplete ||= material.status === 'incomplete';
  }
  if (!selected && incomplete)
    return outcome(
      false,
      'preparation-incomplete',
      'The bounded material check is incomplete. Choose a smaller accessible stock arrangement before starting.',
    );
  if (!selected)
    return outcome(
      false,
      'construction-permission',
      'The complete placement needs current site permission and enough available permitted material.',
    );
  // Availability alone cannot authorize retiring an active object. Preview the
  // exact completion debit through the same quantity owner before reserving/travel.
  const debitProblem = resourceGroupProblem(
    world,
    {
      invocationId: id,
      fulfillment: 'all-or-nothing',
      operations: selected.stones.map((stone) => ({
        source: { kind: 'item', itemId: stone.itemId, definition: definition.input.definition },
        sourceRevision: itemFor(world, stone.itemId)!.revision ?? 0,
        amount: stone.quantity,
      })),
    },
    availability,
  );
  if (debitProblem)
    return outcome(
      false,
      debitProblem,
      'The selected material cannot currently be spent on this placement.',
    );
  const approach = hearthApproach(world, actorId, definition, site);
  if (!approach)
    return outcome(false, 'blocked-stance', 'No supported clear working stance is available.');
  const destination = approach.candidate.stance;
  const here = worldPosition(actor),
    atStance =
      actor.placement?.mode === 'world' &&
      actor.placement.supportSurfaceId === destination.surfaceId &&
      Math.hypot(here.x - destination.x, here.y - destination.y, here.z - destination.z) <=
        MOVEMENT.arrivalTolerance;
  return {
    id,
    type: 'place-hearth',
    stage: atStance ? 'working' : 'approaching',
    destination: { ...destination },
    path: atStance ? [] : approach.route.path,
    ...(approach.route.status === 'pending'
      ? { navigation: { request: approach.route.request } }
      : {}),
    remainingSeconds: definition.workSeconds,
    totalSeconds: definition.workSeconds,
    consumed: [],
    constructionGrant: { id: selected.permission.id, revision: selected.permission.revision },
    hearthWork: {
      definition: { ...pin },
      site: { ...site },
      point: { ...approach.candidate.point },
      physicalLife: actor.actor.physicalLife ?? 0,
      stones: selected.stones,
    },
  };
}
export function reserveHearthMaterials(world: WorldState, actorId: string, action: Action): void {
  const work = action.hearthWork!,
    definition = hearthDefinition(world, work.definition)!;
  for (const [index, stone] of work.stones.entries()) {
    const item = itemFor(world, stone.itemId);
    if (
      !item ||
      reserveResource(
        world,
        {
          id: hearthHoldId(action.id, index),
          invocationId: action.id,
          actorId,
          resource: { kind: 'item', itemId: stone.itemId, definition: definition.input.definition },
          amount: stone.quantity,
        },
        item.revision ?? 0,
      ).status !== 'applied'
    )
      throw new ResourceReservationError();
  }
}
/** Recheck exact physical/life/material/permission meaning after elapsed work. */
export function hearthWorkProblem(
  world: WorldState,
  actorId: string,
  action: Action,
  permissions: readonly ConstructionPermission[],
  requireReach = true,
): Outcome | undefined {
  const work = action.hearthWork,
    actor = entityGet(world.entities, actorId),
    definition = work && hearthDefinition(world, work.definition),
    grant = permissions.find(
      (p) =>
        p.id === action.constructionGrant?.id &&
        p.worldId === world.id &&
        p.actorId === actorId &&
        constructionPermissionCurrent(world, p) &&
        p.revision === action.constructionGrant?.revision,
    );
  if (
    !work ||
    !actor?.actor ||
    !definition ||
    !grant ||
    work.physicalLife !== (actor.actor.physicalLife ?? 0) ||
    !siteCovered(grant, definition, work.site)
  )
    return outcome(
      false,
      'construction-permission',
      'The selected placement, body or current permission changed.',
    );
  const material = getOwn(world.itemDefinitions, definition.input.definition.id);
  if (
    !material ||
    !sameDefinitionPin(definitionPin(material), definition.input.definition) ||
    work.stones.some((stone) => {
      const lot = entityGet(world.entities, stone.itemId)?.item;
      return (
        !lot ||
        !sameDefinitionPin(lot.definitionPin, definition.input.definition) ||
        !accessiblePossession(world, actorId, stone.itemId) ||
        availableItemQuantity(world, stone.itemId, action.id) < stone.quantity ||
        !materialAuthorized(world, stone.itemId, grant) ||
        lot.materialOriginIds?.length !== stone.originIds.length ||
        !stone.originIds.every((origin, index) => origin === lot.materialOriginIds?.[index])
      );
    })
  )
    return outcome(
      false,
      'changed-material',
      'The exact held construction materials are no longer available.',
    );
  const siteProblem = hearthSiteProblem(world, definition, work.site);
  if (siteProblem) return siteProblem;
  if (
    requireReach &&
    (!action.destination ||
      !physicalWorkPointAvailable(
        world,
        actor,
        {
          stance: action.destination,
          point: work.point,
          obstruction: { bounds: hearthBounds(definition, work.site) },
        },
        world.itemHandling.reach,
        worldPosition(actor),
      ))
  )
    return outcome(false, 'blocked-stance', 'The actual working stance or physical reach changed.');
}
export function completeHearth(
  world: WorldState,
  actorId: string,
  action: Action,
  permissions: readonly ConstructionPermission[],
  events: WorldEvent[],
): {
  outcome: Outcome;
  effect?: Extract<ConstructionPermissionEffect, { kind: 'hearth-created' }>;
} {
  const problem = hearthWorkProblem(world, actorId, action, permissions);
  if (problem) return { outcome: problem };
  const work = action.hearthWork!,
    definition = hearthDefinition(world, work.definition)!;
  const origins = [...new Set(work.stones.flatMap((stone) => stone.originIds))];
  const debit = applyResourceGroup(
    world,
    {
      invocationId: action.id,
      fulfillment: 'all-or-nothing',
      operations: work.stones.map((stone, index) => ({
        source: {
          kind: 'item' as const,
          itemId: stone.itemId,
          definition: definition.input.definition,
        },
        sourceRevision: itemFor(world, stone.itemId)!.revision ?? 0,
        amount: stone.quantity,
        reservationId: hearthHoldId(action.id, index),
      })),
    },
    events,
  );
  if (debit.status !== 'applied')
    return {
      outcome: outcome(
        false,
        'changed-material',
        'The exact reserved material could not be committed.',
      ),
    };
  const id = nextEntityId(world, 'hearth');
  entitySet(world.entities, id, {
    id,
    name: definition.name,
    description: definition.description,
    kind: 'campfire',
    placement: worldPlacement(work.site, work.site.surfaceId),
    spatial: groundedSpatial({
      id: definition.id,
      radius: definition.radiusMetres,
      height: definition.heightMetres,
      eyeHeight: definition.heightMetres / 2,
      earHeight: definition.heightMetres / 2,
      interactionHeight: definition.heightMetres / 2,
      maxSlope: 0,
    }),
    heat: { lit: false, fuelSeconds: 0 },
    hearth: {
      definition: { ...work.definition },
      actorId,
      physicalLife: work.physicalLife,
      actionId: action.id,
    },
  });
  rootMembershipChanged(world, id);
  recordSemanticChange(world, { kind: 'spatial', entityId: id, before: null, after: work.site });
  emit(
    world,
    events,
    'hearth-placed',
    subjectNarration(
      entityGet(world.entities, actorId)!,
      definition.completedText[0]!.toLowerCase() + definition.completedText.slice(1),
    ),
    entityGet(world.entities, actorId),
    id,
    {
      actionId: action.id,
      hearthId: id,
      grantId: action.constructionGrant!.id,
      grantRevision: action.constructionGrant!.revision,
    },
  );
  const bounds = hearthBounds(definition, work.site);
  return {
    outcome: {
      ...outcome(true, 'hearth-placed', definition.completedText),
      entityId: id,
      spent: definition.input.quantity,
    },
    effect: {
      kind: 'hearth-created',
      permissionId: action.constructionGrant!.id,
      permissionRevision: action.constructionGrant!.revision,
      actorId,
      actionId: action.id,
      physicalLife: work.physicalLife,
      // Operational admission consumes this effect after the world draft closes.
      // Retain the exact pin as owned data, never the draft's revoked proxy.
      definition: { ...work.definition },
      hearthId: id,
      originIds: origins,
      site: {
        surfaceId: work.site.surfaceId,
        minX: bounds.min.x,
        maxX: bounds.max.x,
        minZ: bounds.min.z,
        maxZ: bounds.max.z,
      },
    },
  };
}

export function validateHearthAction(world: WorldState, entity: Entity): void {
  const action = entity.actor?.action,
    work = action?.hearthWork;
  if (!work && action?.type !== 'place-hearth') return;
  if (
    !action ||
    action.type !== 'place-hearth' ||
    !work ||
    !hasRecordFields(work, ['definition', 'site', 'point', 'physicalLife', 'stones']) ||
    !isDefinitionPin(work.definition) ||
    !finitePoint(work.site) ||
    !isSafeRecordId(work.site.surfaceId) ||
    !finitePoint(work.point) ||
    !Number.isSafeInteger(work.physicalLife) ||
    work.physicalLife !== (entity.actor!.physicalLife ?? 0) ||
    !action.destination ||
    !finitePoint(action.destination) ||
    action.destination.surfaceId !== work.site.surfaceId ||
    !action.constructionGrant ||
    !isSafeRecordId(action.constructionGrant.id) ||
    !Number.isSafeInteger(action.constructionGrant.revision) ||
    action.constructionGrant.revision < 1 ||
    !Array.isArray(work.stones) ||
    !work.stones.length ||
    work.stones.length > STOCK_TRANSFER_LIMITS.movedLots ||
    new Set(work.stones.map((stone) => stone.itemId)).size !== work.stones.length
  )
    throw new Error('Invalid current placed-fire work.');
  const definition = hearthDefinition(world, work.definition);
  if (
    !definition ||
    action.totalSeconds !== definition.workSeconds ||
    work.stones.reduce((total, stone) => total + stone.quantity, 0) !== definition.input.quantity
  )
    throw new Error('Placed-fire work disagrees with its exact definition.');
  const holds = new Map(
    [...heldInvocationResources(world, action.id)].map((hold) => [hold.id, hold]),
  );
  if (holds.size !== work.stones.length)
    throw new Error('Placed-fire work requires exactly its selected material holds.');
  for (const [index, stone] of work.stones.entries()) {
    if (
      !hasRecordFields(stone, ['itemId', 'quantity', 'originIds']) ||
      !isSafeRecordId(stone.itemId) ||
      !Number.isSafeInteger(stone.quantity) ||
      stone.quantity < 1 ||
      !Array.isArray(stone.originIds) ||
      !stone.originIds.length ||
      new Set(stone.originIds).size !== stone.originIds.length ||
      !stone.originIds.every(isSafeRecordId)
    )
      throw new Error('Invalid selected placed-fire material.');
    const lot = entityGet(world.entities, stone.itemId)?.item,
      hold = holds.get(hearthHoldId(action.id, index));
    if (
      !lot ||
      !sameDefinitionPin(lot.definitionPin, definition.input.definition) ||
      lot.materialOriginIds?.length !== stone.originIds.length ||
      !stone.originIds.every((origin, i) => origin === lot.materialOriginIds?.[i]) ||
      !hold ||
      hold.actorId !== entity.id ||
      hold.amount !== stone.quantity ||
      hold.resource.kind !== 'item' ||
      hold.resource.itemId !== stone.itemId ||
      !sameDefinitionPin(hold.resource.definition, definition.input.definition)
    )
      throw new Error('Placed-fire work lost its exact material or reservation binding.');
  }
}
