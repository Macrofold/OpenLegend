import { compileBaseOpeningContent, type BaseOpeningContent } from './opening-content.js';
import { validateMaterialContributionPolicy } from '../../construction-contributions.js';
import {
  validateContentsExposureProfile,
  type ContentsExposureProfile,
} from '../../contents-exposure.js';
import { validateDailyRainShape, type DailyRainShape } from '../../rain.js';
import { definitionPin, type DefinitionPin } from '../../world-modules.js';
import { validateAssemblyCoverProfiles } from '../../assembly-cover.js';
import type { AssemblyCoverProfile, ConstructionPermission } from '../../assembly-types.js';
import { CONSTRUCTION_OPERATIONS } from '../../construction-permissions.js';
import type { BaseBoundaryConfiguration } from './camp-boundaries.js';
import { validateCraftCatalogue, type CraftCataloguePolicy } from '../../craft-catalogue.js';
import { validateMealPolicy } from '../../body-policy.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import { validateSpatialExtent } from '@open-legend/spatial';
import { validateGatheringPolicy, type GatheringPolicy } from '../../gathering.js';
import type { StartingGroundReservation } from './landscape.js';
import { validateHearthShape, type HearthShapeDefinition } from '../../hearths.js';
import {
  validateWorkBatchPolicy,
  validateWorkRequestPresentation,
  type WorkBatchPolicy,
} from '../../work-batches.js';
import {
  MATERIAL_PROPERTIES,
  type FixedTransformDefinition,
  type ItemDefinition,
  type MaterialProperty,
  type RecipeCandidate,
} from '../../types.js';

export type AuthoredManufactureMethod =
  | {
      definition: FixedTransformDefinition;
      learning: 'authored-elementary';
    }
  | {
      id: string;
      revision: number;
      candidate: RecipeCandidate;
      learning: 'authored-elementary';
    };

export interface BaseOpeningGeometry {
  content: BaseOpeningContent;
  id: string;
  revision: number;
  seed: number;
  extentMetres: { width: number; depth: number };
  gathering: GatheringPolicy;
  sourceApproachClearanceMetres: number;
  anchors: Record<string, { xMetres: number; zMetres: number; support: 'terrain' }>;
  campReservations: Array<
    StartingGroundReservation & { id: string; revision: number; label: string; description: string }
  >;
  construction: {
    id: string;
    site: ConstructionPermission['site'];
    materialItems: string[];
    operations: ConstructionPermission['operations'];
    boundaryFamily: string;
    publicGateUseOperations: NonNullable<ConstructionPermission['publicGateUse']>['operations'];
    structuralExposure: boolean;
    materialContributions: boolean;
  };
}
export interface BaseResourceSource {
  id: string;
  revision: number;
  placement:
    | { kind: 'anchor'; anchor: string; offsetMeters: { x: number; z: number } }
    | { kind: 'retained-opening'; entityId: string };
  item: string;
  quantity: number;
  workSeconds: number;
  collection: 'bare-hand';
  name: string;
}
export interface PreparedBaseMaterialWorld {
  ecology: import('./ecology-config.js').BaseEcologyConfiguration;
  opportunities: import('./supply-config.js').BaseSupplyConfiguration;
  cooperationHelpMethodRefs: string[];
  socialOfferPolicy: import('../../social-offer-policy.js').SocialOfferPolicy;
  people: import('./people-config.js').BasePeopleConfiguration;
  opening: BaseOpeningGeometry;
  items: Array<{ revision: number; definition: ItemDefinition }>;
  sources: BaseResourceSource[];
  methods: AuthoredManufactureMethod[];
  materialContributions?: NonNullable<
    import('../../assembly-types.js').ConstructionProfile['materialContributions']
  >;
  contentsExposureProfiles?: ContentsExposureProfile[];
  dailyRain?: DailyRainShape & { clock: 'localTime'; region: { openingBoundsRef: string } };
  hearths: AuthoredHearthDefinition[];
  coverProfiles: AssemblyCoverProfile[];
  defaultCover: DefinitionPin;
  boundary: BaseBoundaryConfiguration;
  workBatches: WorkBatchPolicy;
  workRequests: import('../../work-batches.js').WorkRequestPresentation;
  catalogue: CraftCataloguePolicy;
  meal: import('../../body-policy.js').MealPolicy;
}
export function compileBaseWorkConfiguration(
  value: unknown,
): Pick<PreparedBaseMaterialWorld, 'workBatches' | 'meal' | 'workRequests' | 'catalogue'> {
  if (!hasRecordFields(value, ['workBatches', 'meal', 'workRequests', 'catalogue']))
    throw new Error('Invalid authored work configuration.');
  validateWorkBatchPolicy(value.workBatches);
  validateMealPolicy(value.meal);
  validateWorkRequestPresentation(value.workRequests);
  validateCraftCatalogue(value.catalogue);
  return {
    workBatches: structuredClone(value.workBatches),
    meal: structuredClone(value.meal),
    workRequests: structuredClone(value.workRequests),
    catalogue: structuredClone(value.catalogue),
  };
}
export interface AuthoredHearthDefinition extends HearthShapeDefinition {
  input: { definitionId: string; quantity: number };
}
export function compileBaseConstructionConfiguration(value: unknown): {
  materialContributions?: NonNullable<
    import('../../assembly-types.js').ConstructionProfile['materialContributions']
  >;
  contentsExposureProfiles?: ContentsExposureProfile[];
  dailyRain?: DailyRainShape & { clock: 'localTime'; region: { openingBoundsRef: string } };
  hearths: AuthoredHearthDefinition[];
  coverProfiles: AssemblyCoverProfile[];
  defaultCover: DefinitionPin;
  boundary: BaseBoundaryConfiguration;
  structuralItems: PreparedBaseMaterialWorld['items'];
} {
  if (
    !hasRecordFields(
      value,
      ['hearths', 'coverProfiles', 'defaultCover', 'boundary'],
      ['dailyRain', 'contentsExposureProfiles', 'materialContributions'],
    ) ||
    !Array.isArray(value.hearths) ||
    !hasRecordFields(value.boundary, ['family', 'attributes', 'materials']) ||
    !Array.isArray(value.boundary.attributes)
  )
    throw new Error('Invalid authored construction configuration.');
  if (value.materialContributions !== undefined)
    validateMaterialContributionPolicy(value.materialContributions);
  if (value.contentsExposureProfiles !== undefined) {
    if (!Array.isArray(value.contentsExposureProfiles))
      throw new Error('Invalid contents-exposure profiles.');
    const ids = new Set<string>();
    for (const profile of value.contentsExposureProfiles) {
      validateContentsExposureProfile(profile);
      if (ids.has(profile.id)) throw new Error('Duplicate contents-exposure profile.');
      ids.add(profile.id);
    }
  }
  if (value.dailyRain !== undefined) {
    validateDailyRainShape(value.dailyRain);
    if (
      value.dailyRain.clock !== 'localTime' ||
      !hasRecordFields(value.dailyRain.region, ['openingBoundsRef']) ||
      !isSafeRecordId(value.dailyRain.region.openingBoundsRef)
    )
      throw new Error('Invalid authored daily rain clock or opening reference.');
  }
  validateAssemblyCoverProfiles(value.coverProfiles);
  const defaultCover = value.coverProfiles.find((profile) => profile.id === value.defaultCover);
  if (!defaultCover) throw new Error('Missing selected default covering profile.');
  const ids = new Set<string>();
  const hearths = value.hearths.map((row): AuthoredHearthDefinition => {
    validateHearthShape(row);
    if (
      ids.has(row.id) ||
      !hasRecordFields(row.input, ['definitionId', 'quantity']) ||
      !isSafeRecordId(row.input.definitionId) ||
      !Number.isSafeInteger(row.input.quantity) ||
      Number(row.input.quantity) < 1 ||
      Number(row.input.quantity) > 16
    )
      throw new Error('Invalid authored placed-fire material or duplicate identity.');
    ids.add(row.id);
    return {
      ...row,
      input: { definitionId: row.input.definitionId, quantity: Number(row.input.quantity) },
    };
  });
  return {
    hearths,
    ...(value.materialContributions
      ? {
          materialContributions: structuredClone(value.materialContributions) as NonNullable<
            PreparedBaseMaterialWorld['materialContributions']
          >,
        }
      : {}),
    ...(value.contentsExposureProfiles
      ? {
          contentsExposureProfiles: structuredClone(
            value.contentsExposureProfiles,
          ) as ContentsExposureProfile[],
        }
      : {}),
    ...(value.dailyRain
      ? {
          dailyRain: structuredClone(value.dailyRain) as NonNullable<
            PreparedBaseMaterialWorld['dailyRain']
          >,
        }
      : {}),
    coverProfiles: structuredClone(value.coverProfiles),
    defaultCover: definitionPin(defaultCover),
    // The shared initializer resolves these authored references and runs the
    // complete family/attribute validators before the generator writes output.
    boundary: structuredClone({
      family: value.boundary.family,
      attributes: value.boundary.attributes,
    }) as BaseBoundaryConfiguration,
    structuralItems: compileBaseMaterialConfiguration(
      { items: value.boundary.materials, sources: [] },
      value.coverProfiles,
    ).items,
  };
}
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const positiveInteger = (value: unknown): value is number =>
  finite(value) && Number.isSafeInteger(value) && value > 0;

/** Geometry is prepared independently of installed/generated definitions. Full
 * Main population/stock selection remains a later initializer stage. */
export function compileBaseOpeningGeometry(value: unknown): BaseOpeningGeometry {
  if (
    !hasRecordFields(value, [
      'id',
      'revision',
      'seed',
      'extentMetres',
      'gathering',
      'sourceApproachClearanceMetres',
      'anchors',
      'campReservations',
      'construction',
      'content',
    ]) ||
    !isSafeRecordId(value.id) ||
    !positiveInteger(value.revision) ||
    !finite(value.sourceApproachClearanceMetres) ||
    value.sourceApproachClearanceMetres <= 0 ||
    !finite(value.seed) ||
    !Number.isSafeInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 0xffffffff ||
    !hasRecordFields(value.extentMetres, ['width', 'depth']) ||
    !finite(value.extentMetres.width) ||
    !finite(value.extentMetres.depth) ||
    !value.anchors ||
    typeof value.anchors !== 'object' ||
    Array.isArray(value.anchors) ||
    !Array.isArray(value.campReservations)
  )
    throw new Error('Invalid authored opening geometry.');
  const { width, depth } = value.extentMetres;
  validateSpatialExtent(width, depth);
  validateGatheringPolicy(value.gathering);
  if (value.gathering === null) throw new Error('This authored opening requires gathering.');
  const anchors: BaseOpeningGeometry['anchors'] = {};
  for (const [id, row] of Object.entries(value.anchors)) {
    if (
      !isSafeRecordId(id) ||
      !hasRecordFields(row, ['xMetres', 'zMetres', 'support']) ||
      !finite(row.xMetres) ||
      !finite(row.zMetres) ||
      row.support !== 'terrain' ||
      row.xMetres < 0 ||
      row.zMetres < 0 ||
      row.xMetres > width - 1 ||
      row.zMetres > depth - 1
    )
      throw new Error('Invalid authored opening anchor.');
    anchors[id] = { xMetres: row.xMetres, zMetres: row.zMetres, support: row.support };
  }
  if (!Object.hasOwn(anchors, 'arrival')) throw new Error('Opening requires its arrival anchor.');
  const reservations = new Set<string>();
  const campReservations = value.campReservations.map((row) => {
    if (
      !hasRecordFields(row, [
        'id',
        'revision',
        'label',
        'description',
        'minX',
        'maxX',
        'minZ',
        'maxZ',
      ]) ||
      !isSafeRecordId(row.id) ||
      reservations.has(row.id) ||
      typeof row.label !== 'string' ||
      !row.label.trim() ||
      typeof row.description !== 'string' ||
      !row.description.trim() ||
      row.description.length > 2000 ||
      !positiveInteger(row.revision) ||
      !finite(row.minX) ||
      !finite(row.maxX) ||
      !finite(row.minZ) ||
      !finite(row.maxZ) ||
      row.minX < 0 ||
      row.minZ < 0 ||
      row.maxX > width - 1 ||
      row.maxZ > depth - 1 ||
      row.minX >= row.maxX ||
      row.minZ >= row.maxZ
    )
      throw new Error('Invalid authored ground reservation.');
    reservations.add(row.id);
    return {
      id: row.id,
      revision: row.revision,
      label: row.label,
      description: row.description,
      minX: row.minX,
      maxX: row.maxX,
      minZ: row.minZ,
      maxZ: row.maxZ,
    };
  });
  const policy = value.construction;
  if (
    !hasRecordFields(policy, [
      'id',
      'site',
      'materialItems',
      'operations',
      'boundaryFamily',
      'publicGateUseOperations',
      'structuralExposure',
      'materialContributions',
    ]) ||
    !isSafeRecordId(policy.id) ||
    !isSafeRecordId(policy.boundaryFamily) ||
    typeof policy.structuralExposure !== 'boolean' ||
    typeof policy.materialContributions !== 'boolean' ||
    !hasRecordFields(policy.site, ['surfaceId', 'minX', 'maxX', 'minZ', 'maxZ']) ||
    !isSafeRecordId(policy.site.surfaceId) ||
    ![policy.site.minX, policy.site.maxX, policy.site.minZ, policy.site.maxZ].every(finite) ||
    Number(policy.site.minX) < 0 ||
    Number(policy.site.minZ) < 0 ||
    Number(policy.site.minX) >= Number(policy.site.maxX) ||
    Number(policy.site.minZ) >= Number(policy.site.maxZ) ||
    Number(policy.site.maxX) > width - 1 ||
    Number(policy.site.maxZ) > depth - 1 ||
    !Array.isArray(policy.materialItems) ||
    !policy.materialItems.length ||
    !policy.materialItems.every(isSafeRecordId) ||
    new Set(policy.materialItems).size !== policy.materialItems.length ||
    !Array.isArray(policy.operations) ||
    !policy.operations.length ||
    !policy.operations.every((operation) =>
      CONSTRUCTION_OPERATIONS.some((allowed) => allowed === operation),
    ) ||
    new Set(policy.operations).size !== policy.operations.length ||
    !Array.isArray(policy.publicGateUseOperations) ||
    !policy.publicGateUseOperations.length ||
    !policy.publicGateUseOperations.every((operation) =>
      ['open', 'close', 'bar', 'unbar'].includes(operation),
    ) ||
    new Set(policy.publicGateUseOperations).size !== policy.publicGateUseOperations.length
  )
    throw new Error('Invalid exact authored construction publication policy.');
  const construction: BaseOpeningGeometry['construction'] = {
    id: policy.id,
    boundaryFamily: policy.boundaryFamily,
    structuralExposure: policy.structuralExposure,
    materialContributions: policy.materialContributions,
    site: {
      surfaceId: policy.site.surfaceId,
      minX: Number(policy.site.minX),
      maxX: Number(policy.site.maxX),
      minZ: Number(policy.site.minZ),
      maxZ: Number(policy.site.maxZ),
    },
    materialItems: [...policy.materialItems],
    operations: policy.operations.map(
      (operation) => CONSTRUCTION_OPERATIONS.find((allowed) => allowed === operation)!,
    ),
    publicGateUseOperations: policy.publicGateUseOperations.map((operation) => {
      if (
        operation === 'open' ||
        operation === 'close' ||
        operation === 'bar' ||
        operation === 'unbar'
      )
        return operation;
      throw new Error('Unsupported authored gate operation.');
    }),
  };
  return {
    id: value.id,
    revision: value.revision,
    seed: value.seed,
    extentMetres: { width, depth },
    content: compileBaseOpeningContent(value.content, { width, depth }),
    gathering: value.gathering,
    construction,
    sourceApproachClearanceMetres: value.sourceApproachClearanceMetres,
    anchors,
    campReservations,
  };
}

export function compileBaseResourceSources(
  value: unknown,
  opening: BaseOpeningGeometry,
): BaseResourceSource[] {
  if (!hasRecordFields(value, ['items', 'sources']) || !Array.isArray(value.sources))
    throw new Error('Invalid authored finite sources.');
  const ids = new Set<string>();
  return value.sources.map((row) => {
    if (
      !hasRecordFields(row, [
        'id',
        'revision',
        'placement',
        'item',
        'quantity',
        'workSeconds',
        'collection',
        'name',
      ]) ||
      !isSafeRecordId(row.id) ||
      ids.has(row.id) ||
      !positiveInteger(row.revision) ||
      !isSafeRecordId(row.item) ||
      !positiveInteger(row.quantity) ||
      !finite(row.workSeconds) ||
      row.workSeconds <= 0 ||
      row.collection !== 'bare-hand' ||
      typeof row.name !== 'string' ||
      !row.name.trim()
    )
      throw new Error('Invalid authored finite source.');
    ids.add(row.id);
    const placement = row.placement;
    let resolved: BaseResourceSource['placement'];
    if (
      hasRecordFields(placement, ['kind', 'entityId']) &&
      placement.kind === 'retained-opening' &&
      isSafeRecordId(placement.entityId) &&
      placement.entityId === row.id
    )
      resolved = { kind: placement.kind, entityId: placement.entityId };
    else if (
      hasRecordFields(placement, ['kind', 'anchor', 'offsetMeters']) &&
      placement.kind === 'anchor' &&
      isSafeRecordId(placement.anchor) &&
      Object.hasOwn(opening.anchors, placement.anchor) &&
      hasRecordFields(placement.offsetMeters, ['x', 'z']) &&
      finite(placement.offsetMeters.x) &&
      finite(placement.offsetMeters.z)
    ) {
      const anchor = opening.anchors[placement.anchor]!;
      const x = anchor.xMetres + placement.offsetMeters.x,
        z = anchor.zMetres + placement.offsetMeters.z;
      if (
        x < 0 ||
        z < 0 ||
        x > opening.extentMetres.width - 1 ||
        z > opening.extentMetres.depth - 1
      )
        throw new Error('Authored source lies outside its opening.');
      resolved = {
        kind: placement.kind,
        anchor: placement.anchor,
        offsetMeters: { x: placement.offsetMeters.x, z: placement.offsetMeters.z },
      };
    } else throw new Error('Invalid or unresolved authored source placement.');
    return {
      id: row.id,
      revision: row.revision,
      placement: resolved,
      item: row.item,
      quantity: row.quantity,
      workSeconds: row.workSeconds,
      collection: row.collection,
      name: row.name,
    };
  });
}

/** The selected material palette admits native items/contact equipment only.
 * Additional capabilities need their actual definition/consumer before this schema expands. */
export function compileBaseMaterialConfiguration(
  value: unknown,
  covers: readonly AssemblyCoverProfile[],
): {
  items: Array<{ revision: number; definition: ItemDefinition }>;
} {
  if (!hasRecordFields(value, ['items', 'sources']) || !Array.isArray(value.items))
    throw new Error('Invalid authored material definitions.');
  const ids = new Set<string>();
  const finite = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error('Material values must be finite.');
    return value;
  };
  const number = (value: unknown): number => {
    const result = finite(value);
    if (result <= 0) throw new Error('Material dimensions and loads must be positive.');
    return result;
  };
  const revision = (value: unknown): number => {
    const result = number(value);
    if (!Number.isSafeInteger(result))
      throw new Error('Material revisions must be positive safe integers.');
    return result;
  };
  return {
    items: value.items.map((row) => {
      if (
        !hasRecordFields(
          row,
          [
            'id',
            'revision',
            'version',
            'name',
            'description',
            'portable',
            'packingLoad',
            'properties',
          ],
          ['stockShape', 'equipment', 'melee', 'icon', 'tracksMaterialOrigins', 'assemblyMaterial'],
        ) ||
        !isSafeRecordId(row.id) ||
        ids.has(row.id) ||
        typeof row.name !== 'string' ||
        !row.name.trim() ||
        typeof row.description !== 'string' ||
        !row.description.trim() ||
        typeof row.portable !== 'boolean' ||
        (row.tracksMaterialOrigins !== undefined && row.tracksMaterialOrigins !== true) ||
        (row.icon !== undefined && (typeof row.icon !== 'string' || !row.icon.trim())) ||
        !Array.isArray(row.properties) ||
        !row.properties.every((property): property is MaterialProperty =>
          (MATERIAL_PROPERTIES as readonly unknown[]).includes(property),
        ) ||
        new Set(row.properties).size !== row.properties.length
      )
        throw new Error('Invalid authored inventory item.');
      ids.add(row.id);
      const definition: ItemDefinition = {
        id: row.id,
        version: revision(row.version),
        name: row.name,
        description: row.description,
        portable: row.portable,
        packingLoad: number(row.packingLoad),
        properties: row.properties,
        ...(row.tracksMaterialOrigins === true ? { tracksMaterialOrigins: true } : {}),
        ...(typeof row.icon === 'string' ? { icon: row.icon } : {}),
      };
      if (row.assemblyMaterial !== undefined) {
        const material = row.assemblyMaterial;
        if (
          !hasRecordFields(material, ['familyId', 'role'], ['coverProfileId', 'postHeight']) ||
          !isSafeRecordId(material.familyId)
        )
          throw new Error('Unsupported authored assembly material.');
        if (material.role === 'cover') {
          const cover = covers.find((profile) => profile.id === material.coverProfileId);
          if (!cover || material.postHeight !== undefined)
            throw new Error('Unknown authored covering profile or unsupported post height.');
          definition.assemblyMaterial = {
            familyId: material.familyId,
            role: 'cover',
            coverProfile: definitionPin(cover),
          };
        } else if (material.role === 'post') {
          if (material.coverProfileId !== undefined)
            throw new Error('A structural post cannot select a covering profile.');
          definition.assemblyMaterial = {
            familyId: material.familyId,
            role: 'post',
            postHeight: number(material.postHeight),
          };
        } else if (
          material.role === 'panel' ||
          material.role === 'gate' ||
          material.role === 'rail'
        ) {
          if (material.postHeight !== undefined || material.coverProfileId !== undefined)
            throw new Error('A structural part cannot select a post height or covering profile.');
          definition.assemblyMaterial = {
            familyId: material.familyId,
            role: material.role,
          };
        } else throw new Error('Unsupported authored structural role.');
      }
      if (row.stockShape !== undefined) {
        if (!hasRecordFields(row.stockShape, ['usableLengthMeters']))
          throw new Error('Invalid finite stock shape.');
        definition.stockShape = { usableLengthMeters: number(row.stockShape.usableLengthMeters) };
      }
      if (row.equipment !== undefined) {
        const equipment = row.equipment;
        if (
          !hasRecordFields(equipment, ['ports', 'uses']) ||
          !Array.isArray(equipment.ports) ||
          !equipment.ports.every(isSafeRecordId) ||
          !Array.isArray(equipment.uses) ||
          !equipment.uses.every((use): use is 'melee' => use === 'melee')
        )
          throw new Error('Invalid selected material equipment.');
        definition.equipment = { ports: equipment.ports, uses: equipment.uses };
      }
      if (row.melee !== undefined) {
        const melee = row.melee;
        if (
          !hasRecordFields(melee, [
            'damage',
            'accuracy',
            'range',
            'approachRange',
            'windupSeconds',
            'recoverySeconds',
          ])
        )
          throw new Error('Invalid selected contact weapon.');
        definition.melee = {
          damage: finite(melee.damage),
          accuracy: finite(melee.accuracy),
          range: finite(melee.range),
          approachRange: finite(melee.approachRange),
          windupSeconds: finite(melee.windupSeconds),
          recoverySeconds: finite(melee.recoverySeconds),
        };
      }
      return { revision: revision(row.revision), definition };
    }),
  };
}
/** Build-time syntax only. Native compilation subsequently proves exact installed
 * definitions; this module must not import the initializer or generated bundle. */
export function compileBaseManufactureConfiguration(
  value: unknown,
  contentsProfiles: readonly ContentsExposureProfile[] = [],
): {
  methods: AuthoredManufactureMethod[];
} {
  if (
    !hasRecordFields(value, ['methods']) ||
    !Array.isArray(value.methods) ||
    !value.methods.length
  )
    throw new Error('The authored manufacture bundle needs methods.');
  const ids = new Set<string>();
  const positive = (number: unknown): number is number =>
    typeof number === 'number' && Number.isSafeInteger(number) && number > 0;
  return {
    methods: value.methods.map((row) => {
      if (row && typeof row === 'object' && 'kind' in row && row.kind === 'family-candidate') {
        if (
          !hasRecordFields(row, [
            'id',
            'revision',
            'kind',
            'family',
            'name',
            'description',
            'inputs',
            'output',
            'parameters',
            'learning',
          ]) ||
          !isSafeRecordId(row.id) ||
          ids.has(row.id) ||
          !positive(row.revision) ||
          !hasRecordFields(row.family, ['id', 'version']) ||
          !isSafeRecordId(row.family.id) ||
          !positive(row.family.version) ||
          typeof row.name !== 'string' ||
          !row.name.trim() ||
          typeof row.description !== 'string' ||
          !row.description.trim() ||
          !Array.isArray(row.inputs) ||
          !hasRecordFields(row.output, ['name', 'description']) ||
          typeof row.output.name !== 'string' ||
          !row.output.name.trim() ||
          typeof row.output.description !== 'string' ||
          !row.output.description.trim() ||
          !row.parameters ||
          typeof row.parameters !== 'object' ||
          Array.isArray(row.parameters) ||
          row.learning !== 'authored-elementary'
        )
          throw new Error('Invalid authored family method.');
        ids.add(row.id);
        const inputs = row.inputs.map((input) => {
          if (
            !hasRecordFields(input, ['role', 'definitionId', 'quantity']) ||
            !isSafeRecordId(input.role) ||
            !isSafeRecordId(input.definitionId) ||
            !positive(input.quantity)
          )
            throw new Error('Invalid authored family input.');
          return { role: input.role, definitionId: input.definitionId, quantity: input.quantity };
        });
        const parameters = structuredClone(row.parameters) as Record<string, unknown>;
        if (parameters.contentsExposureProfile !== undefined) {
          const reference = parameters.contentsExposureProfile;
          const profile =
            hasRecordFields(reference, ['id', 'version']) &&
            contentsProfiles.find((p) => p.id === reference.id && p.version === reference.version);
          if (!profile)
            throw new Error('An authored container needs its exact installed contents profile.');
          parameters.contentsExposureProfile = definitionPin(profile);
        }
        return {
          id: row.id,
          revision: row.revision,
          learning: 'authored-elementary' as const,
          candidate: {
            family: { id: row.family.id, version: row.family.version },
            name: row.name,
            description: row.description,
            inputs,
            output: { name: row.output.name, description: row.output.description },
            parameters,
          },
        };
      }
      if (
        !hasRecordFields(row, [
          'id',
          'revision',
          'kind',
          'implementation',
          'label',
          'description',
          'workSeconds',
          'inputs',
          'retainedTools',
          'outputs',
          'learning',
        ]) ||
        !isSafeRecordId(row.id) ||
        ids.has(row.id) ||
        !positive(row.revision) ||
        row.kind !== 'fixed-transform' ||
        row.implementation !== 'finite-material-transform' ||
        typeof row.label !== 'string' ||
        !row.label.trim() ||
        typeof row.description !== 'string' ||
        !row.description.trim() ||
        !positive(row.workSeconds) ||
        !Array.isArray(row.inputs) ||
        !Array.isArray(row.retainedTools) ||
        !Array.isArray(row.outputs) ||
        row.learning !== 'authored-elementary'
      )
        throw new Error('Invalid authored manufacture method.');
      ids.add(row.id);
      const inputs = row.inputs.map((input) => {
        if (
          !hasRecordFields(input, ['role', 'item', 'quantity']) ||
          !isSafeRecordId(input.role) ||
          !isSafeRecordId(input.item) ||
          !positive(input.quantity)
        )
          throw new Error('Invalid authored spent material.');
        return { role: input.role, definitionId: input.item, quantity: input.quantity };
      });
      const retainedTools = row.retainedTools.map((tool) => {
        if (
          !hasRecordFields(tool, ['role', 'quantity', 'allowedItems']) ||
          !isSafeRecordId(tool.role) ||
          !positive(tool.quantity) ||
          !Array.isArray(tool.allowedItems) ||
          !tool.allowedItems.every(isSafeRecordId)
        )
          throw new Error('Invalid authored retained tool.');
        return {
          role: tool.role,
          quantity: tool.quantity,
          allowedDefinitionIds: tool.allowedItems as string[],
        };
      });
      const outputs = row.outputs.map((output) => {
        if (
          !hasRecordFields(output, ['port', 'item', 'quantity']) ||
          !isSafeRecordId(output.port) ||
          !isSafeRecordId(output.item) ||
          !positive(output.quantity)
        )
          throw new Error('Invalid authored output port.');
        return { port: output.port, definitionId: output.item, quantity: output.quantity };
      });
      return {
        learning: 'authored-elementary' as const,
        definition: {
          id: row.id,
          version: row.revision,
          name: row.label,
          description: row.description,
          workSeconds: row.workSeconds,
          inputs,
          retainedTools,
          outputs,
        },
      };
    }),
  };
}
