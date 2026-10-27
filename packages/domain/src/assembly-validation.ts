import { boundaryRepairInputIds } from './boundary-repair-inputs.js';
import { materialContainerAllowed } from './contents-exposure.js';
import { validateGateWork } from './gate-operations.js';
import { validateBoundaryImpact } from './boundary-impacts.js';
import {
  assemblyCoverProfile,
  defaultCoverProfile,
  materialCoverProfile,
  validateAssemblyCoverProfiles,
} from './assembly-cover.js';
import {
  validateBoundaryFamily,
  validateBoundaryComponent,
  boundaryMaterialDefinitionValid,
} from './boundary-validation.js';
import { materialInventoryRule, validateMaterialInventoryRule } from './material-inventory.js';
import { entityGet, entityValues } from './entity-collection.js';
import {
  finitePoint,
  spatialBlockers,
  physicalIntersections,
  SPATIAL_LIMITS,
  coverExposureSupported,
} from '@open-legend/spatial';
import { spatialMap, isAssemblyPlacement } from './spatial-state.js';
import {
  assemblyShapes,
  assemblySite,
  coverBounds,
  postLocal,
  isInstalledCover,
  assemblyHeadings,
  assemblyArrangement,
  assemblySpanProblem,
  materialPostHeight,
  postHeightForSlot,
} from './assembly-geometry.js';
import {
  flexibleAssemblyFamily,
  assemblySupportProblem,
  assemblyWorkCandidates,
  qualifiedAttachmentContact,
  coverLayersExceeded,
  loweredAssemblyMaterials,
  materialUsable,
  validAssemblyPhase,
  overlaps,
  assemblyWorkPointCount,
  assemblyPhaseSeconds,
  assemblyPhaseHeldItems,
  assemblyRoot,
} from './assemblies.js';
import { heldInvocationResources } from './resource-claims.js';
import { isSafeRecordId, hasRecordFields } from './records.js';
import { sameDefinitionPin, isDefinitionPin } from './state-owners.js';
import { completeObjectHistory, validateMaterialOrigins } from './objects.js';
import { definitionPin, validateAttributeValue } from './world-modules.js';
import { chargeWork } from './work-budget.js';
import type { WorldState } from './types.js';
import { validateConstructionProfile } from './construction-scene.js';

/** A saved roof is validated, never repaired/collapsed as a side effect of loading it. */
export function validateAssemblies(world: WorldState): void {
  if (
    !world.assemblyFamilies ||
    !Number.isSafeInteger(world.assemblyGeometryRevision) ||
    world.assemblyGeometryRevision! < 0
  )
    throw new Error(
      'Incompatible development assembly format. Existing data was not converted or replaced.',
    );
  for (const [id, family] of Object.entries(world.assemblyFamilies)) {
    if (family.implementation === 'grounded-panel-boundary') {
      validateBoundaryFamily(world, id, family);
      continue;
    }
    if (
      family.id !== id ||
      !isSafeRecordId(id) ||
      family.implementation !== 'four-corner-flexible-bays' ||
      !Number.isSafeInteger(family.version) ||
      family.version <= 0
    )
      throw new Error('Invalid installed assembly family.');
    if (
      !family.materials ||
      !['post', 'cover'].every((role) =>
        ['stone', 'timber', 'panel'].includes(Reflect.get(family.materials, role)),
      )
    )
      throw new Error('Invalid authored physical material.');
    if (
      !Array.isArray(family.arrangements) ||
      !family.arrangements.length ||
      family.arrangements.length > 8 ||
      new Set(family.arrangements.map((a) => a.id)).size !== family.arrangements.length ||
      !assemblyArrangement(family, family.defaultArrangementId) ||
      family.arrangements.some(
        (a) =>
          !isSafeRecordId(a.id) ||
          typeof a.name !== 'string' ||
          !a.name.length ||
          typeof a.description !== 'string' ||
          !a.description.length ||
          !Array.isArray(a.rowHeights) ||
          a.rowHeights.length !== 2 ||
          !a.rowHeights.every(
            (h) => Number.isFinite(h) && h > 0 && h <= SPATIAL_LIMITS.maxExtent,
          ) ||
          !Number.isSafeInteger(a.maximumBays) ||
          a.maximumBays < 1 ||
          a.maximumBays > family.limits.bays,
      )
    )
      throw new Error('Invalid finite authored arrangements.');
    const minimumHeight = Math.min(...family.arrangements.flatMap((a) => a.rowHeights));
    if (
      !family.binding ||
      ![family.binding.contactBand, family.binding.workDrop, family.binding.stanceOffset].every(
        (value) => Number.isFinite(value) && value > 0,
      ) ||
      family.binding.contactBand >= minimumHeight ||
      family.binding.workDrop >= minimumHeight
    )
      throw new Error('Invalid binding contact or work geometry.');
    validateAssemblyCoverProfiles(family.coverProfiles);
    if (!isDefinitionPin(family.defaultCover) || !assemblyCoverProfile(family, family.defaultCover))
      throw new Error('Missing exact default covering profile.');
    const numbers = [
      family.bay.width,
      family.bay.length,
      minimumHeight,
      family.bay.postSection,
      family.minimumClearance,
      family.wettingSeconds,
      family.dryingSeconds,
    ];
    if (
      !numbers.every((v) => Number.isFinite(v) && v > 0) ||
      !Number.isFinite(family.restMargin) ||
      family.restMargin < 0
    )
      throw new Error('Invalid assembly geometry or material law.');
    if (
      family.limits.bays < 1 ||
      family.limits.bays > 2 ||
      family.limits.parts < 1 ||
      family.limits.parts > 32 ||
      family.limits.layers < 1 ||
      family.limits.layers > 2 ||
      family.limits.sockets < 1 ||
      family.limits.sockets > 2 ||
      !['bays', 'parts', 'layers', 'sockets'].every((key) =>
        Number.isSafeInteger(Reflect.get(family.limits, key)),
      )
    )
      throw new Error('Unsupported assembly computation envelope.');
    if (
      !Object.values(family.seconds).every((v) => Number.isFinite(v) && v >= 0 && v <= 86400) ||
      !['post', 'cover', 'lower', 'reclaim-post', 'reclaim-lowered'].every(
        (op) =>
          typeof Reflect.get(family.seconds, op) === 'number' &&
          typeof Reflect.get(family.labels, op) === 'string',
      )
    )
      throw new Error('Invalid native assembly work.');
    const condition = world.moduleManifest.definitions.find(
        (d) => d.id === family.conditionAttribute,
      ),
      moisture = world.moduleManifest.definitions.find((d) => d.id === family.moistureAttribute);
    if (
      condition?.schema.kind !== 'category' ||
      !condition.schema.choices.includes(family.usableCondition) ||
      moisture?.schema.kind !== 'number' ||
      moisture.schema.min !== 0 ||
      moisture.schema.max !== 1
    )
      throw new Error('Missing exact material state definitions.');
    if (!hasRecordFields(family.inventory, ['post', 'cover', 'binding', 'fiber']))
      throw new Error('Invalid installed material inventory rule.');
    for (const [role, rule] of Object.entries(family.inventory)) {
      validateMaterialInventoryRule(world, rule);
      if (
        rule.bagRefusal === null &&
        rule.stateAttributes.includes(family.moistureAttribute) &&
        ['cover', 'fiber'].includes(role)
      )
        throw new Error('This exposed material needs its admitted bag restriction.');
    }
    if (
      family.arrangements.some((a) =>
        assemblySpanProblem(family, a.id, defaultCoverProfile(family)),
      )
    )
      throw new Error('Unsupported in-plane span, overhang or lower-edge clearance.');
    const forms = [
      [family.exposure.folded.width, family.exposure.folded.length, family.exposure.folded.height],
      [family.exposure.fiber.width, family.exposure.fiber.length, family.exposure.fiber.height],
      [family.exposure.worn.width, family.exposure.worn.length],
    ];
    const labels = family.moistureLabels;
    if (
      forms.some(
        (form) => !form.every((v) => Number.isFinite(v) && v > 0 && v <= SPATIAL_LIMITS.maxExtent),
      ) ||
      !Number.isFinite(labels.dryMaximum) ||
      !Number.isFinite(labels.wetMinimum) ||
      labels.dryMaximum < 0 ||
      labels.wetMinimum <= labels.dryMaximum ||
      labels.wetMinimum > 1 ||
      !['dry', 'damp', 'wet', 'saturated'].every(
        (key) =>
          typeof Reflect.get(labels, key) === 'string' && Reflect.get(labels, key).length > 0,
      ) ||
      !Number.isFinite(family.presentation.bindingSize) ||
      family.presentation.bindingSize <= 0 ||
      !['postColor', 'coverColor'].every((key) =>
        /^#[\da-f]{6}$/i.test(Reflect.get(family.presentation, key)),
      ) ||
      !['loweredName', 'failureText', 'invitationText', 'help', 'useHelp', 'replacementHelp'].every(
        (key) =>
          typeof Reflect.get(family.presentation, key) === 'string' &&
          Reflect.get(family.presentation, key).length > 0,
      )
    )
      throw new Error('Invalid supported material form or presentation.');
    if (
      !family.presentation.planLabels ||
      !['build', 'resume', 'extend', 'replace', 'lower', 'dismantle', 'reclaim'].every(
        (operation) =>
          typeof Reflect.get(family.presentation.planLabels, operation) === 'string' &&
          Reflect.get(family.presentation.planLabels, operation).length > 0,
      )
    )
      throw new Error('Missing authored building choices.');
  }
  for (const definition of Object.values(world.itemDefinitions)) {
    const material = definition.assemblyMaterial;
    if (!material) continue;
    const anyFamily = world.assemblyFamilies[material.familyId];
    if (anyFamily?.implementation === 'grounded-panel-boundary') {
      if (!boundaryMaterialDefinitionValid(definition, anyFamily))
        throw new Error('Invalid current boundary material definition.');
      continue;
    }
    const materialFamily = flexibleAssemblyFamily(world, material.familyId);
    if (
      !materialFamily ||
      !['post', 'cover', 'binding', 'fiber'].includes(material.role) ||
      (material.role === 'cover'
        ? !isDefinitionPin(material.coverProfile) ||
          !assemblyCoverProfile(materialFamily, material.coverProfile)
        : material.coverProfile !== undefined) ||
      (material.role === 'post'
        ? !Number.isFinite(material.postHeight) ||
          material.postHeight! <= 0 ||
          material.postHeight! > SPATIAL_LIMITS.maxExtent
        : material.postHeight !== undefined)
    )
      throw new Error('Invalid current physical material definition.');
  }
  const panels: Array<ReturnType<typeof assemblyShapes>['panels'][number]> = [];
  const completeOrigins = completeObjectHistory(world.entities);
  for (const entity of entityValues(world.entities)) {
    const component = entity.assembly;
    validateMaterialOrigins(world, entity, completeOrigins);
    const descriptor =
      entity.item && world.itemDefinitions[entity.item.definitionPin.id]?.assemblyMaterial;
    const family = descriptor && world.assemblyFamilies[descriptor.familyId];
    if (descriptor && !family) throw new Error('Material references a missing assembly family.');
    if (family && entity.item) {
      const inventory = materialInventoryRule(
        world,
        world.itemDefinitions[entity.item.definitionPin.id]!,
      )!;
      if (
        !inventory.homogeneous &&
        (entity.item.quantity !== 1 || entity.item.individuality !== 'individual')
      )
        throw new Error('This material needs one actual individual identity.');
      if (
        entity.placement?.mode === 'contained' &&
        entityGet(world.entities, entity.placement.parentEntityId)?.container &&
        inventory.bagRefusal &&
        !materialContainerAllowed(
          world,
          world.itemDefinitions[entity.item.definitionPin.id]!,
          entityGet(world.entities, entity.placement.parentEntityId)!,
        )
      )
        throw new Error('This material has no admitted rule for bag containment.');
      for (const id of inventory.stateAttributes) {
        const state = entity.attributes?.[id];
        // Optional material state may be absent; a present value still reaches
        // equivalence/copying and passive consumers and must have its admitted shape.
        if (state === undefined && !inventory.initialAttributes.includes(id)) continue;
        const definition = world.moduleManifest.definitions.find((d) => d.id === id)!;
        if (
          !state ||
          !hasRecordFields(state, ['value', 'revision']) ||
          !Number.isSafeInteger(state.revision) ||
          state.revision < 0
        )
          throw new Error('Missing current material state.');
        validateAttributeValue(definition, state.value);
      }
    }
    const claim = entity.item?.assemblyClaim;
    if (claim) {
      const root = entityGet(world.entities, claim.rootId);
      const claimFamily = world.assemblyFamilies[claim.family.id];
      const admitted =
        claimFamily?.implementation === 'grounded-panel-boundary'
          ? Object.values(claimFamily.roles).some((pin) =>
              sameDefinitionPin(pin, entity.item!.definitionPin),
            ) ||
            Object.values(claimFamily.salvage.outputs)
              .flat()
              .some((output) => sameDefinitionPin(output.definition, entity.item!.definitionPin))
          : claimFamily && descriptor?.familyId === claimFamily.id;
      if (
        !claimFamily ||
        !admitted ||
        !root?.assembly ||
        root.assembly.retired ||
        !sameDefinitionPin(claim.family, definitionPin(claimFamily)) ||
        !sameDefinitionPin(claim.family, root.assembly.family) ||
        entity.item!.quantity !== 1 ||
        entity.item!.individuality !== 'individual'
      )
        throw new Error('Invalid protected material claim.');
      if (
        !root.assembly.parts[entity.id] &&
        (entity.placement?.mode !== 'contained' ||
          entityGet(world.entities, entity.placement.parentEntityId)?.kind !== 'item-pile')
      )
        throw new Error('Protected lowered material must have actual exposed ground custody.');
    }
    const action = entity.actor?.action;
    if (action?.type === 'impact-boundary' || action?.boundaryImpact)
      validateBoundaryImpact(world, entity.id, action);
    if (action?.type === 'operate-gate' || action?.gateWork)
      validateGateWork(world, entity.id, action);
    if (action?.materialPermission !== undefined) {
      const binding = action.materialPermission;
      if (
        action.type !== 'gather' ||
        !hasRecordFields(binding, ['definition', 'grants']) ||
        !isDefinitionPin(binding.definition) ||
        !Array.isArray(binding.grants) ||
        !binding.grants.length ||
        new Set(binding.grants.map((grant) => grant?.id)).size !== binding.grants.length ||
        binding.grants.some(
          (grant) =>
            !hasRecordFields(grant, ['id', 'revision']) ||
            !isSafeRecordId(grant.id) ||
            !Number.isSafeInteger(grant.revision) ||
            grant.revision <= 0,
        )
      )
        throw new Error('Invalid saved material-permission binding.');
    }
    if (
      action?.materialOriginIds &&
      (action.type !== 'craft' ||
        !action.materialOriginIds.length ||
        new Set(action.materialOriginIds).size !== action.materialOriginIds.length ||
        !action.materialOriginIds.every(
          (origin) =>
            isSafeRecordId(origin) && (!completeOrigins || !!entityGet(world.entities, origin)),
        ))
    )
      throw new Error('Invalid saved material-production provenance.');
    if (
      action?.assemblyExitPending !== undefined &&
      (action.type !== 'assemble' ||
        !['admission', 'commit'].includes(action.assemblyExitPending) ||
        action.assemblyPhase?.implementation !== 'grounded-panel-boundary' ||
        !['post', 'boundary-panel', 'boundary-gate'].includes(action.assemblyPhase.operation))
    )
      throw new Error('Invalid saved construction preparation.');
    if (action?.type === 'assemble' || action?.assemblyPhase) {
      if (
        action.type !== 'assemble' ||
        !action.assemblyPhase ||
        !validAssemblyPhase(action.assemblyPhase) ||
        !action.constructionGrant ||
        !isSafeRecordId(action.constructionGrant.id) ||
        (action.assemblyPhase.implementation === 'grounded-panel-boundary' &&
          action.assemblyPhase.permissionId !== undefined &&
          action.assemblyPhase.permissionId !== action.constructionGrant.id) ||
        !Number.isSafeInteger(action.constructionGrant.revision) ||
        action.constructionGrant.revision <= 0 ||
        !Number.isSafeInteger(action.assemblyCorner) ||
        action.assemblyCorner! < 0 ||
        action.assemblyCorner! > assemblyWorkPointCount(action.assemblyPhase) - 1 ||
        !action.destination ||
        !finitePoint(action.destination)
      )
        throw new Error('Invalid saved construction work.');
      const family = world.assemblyFamilies[action.assemblyPhase.familyId];
      if (
        !family ||
        (family.implementation === 'four-corner-flexible-bays' &&
          (action.assemblyPhase.implementation !== undefined ||
            !assemblyArrangement(family, action.assemblyPhase.arrangementId))) ||
        (family.implementation === 'grounded-panel-boundary' &&
          (action.assemblyPhase.implementation !== 'grounded-panel-boundary' ||
            (action.assemblyPhase.operation === 'repair-boundary' &&
              boundaryRepairInputIds(action.assemblyPhase).length !== family.repair.quantity) ||
            !sameDefinitionPin(
              {
                id: action.assemblyPhase.familyId,
                version: action.assemblyPhase.familyVersion,
                digest: action.assemblyPhase.familyDigest,
              },
              definitionPin(family),
            ))) ||
        action.totalSeconds !== assemblyPhaseSeconds(world, action.assemblyPhase) ||
        action.remainingSeconds < 0 ||
        !Number.isFinite(action.remainingSeconds) ||
        action.remainingSeconds > action.totalSeconds
      )
        throw new Error('Construction work lost its current mechanical pin.');
      const required = new Map<string, number>();
      for (const id of assemblyPhaseHeldItems(action.assemblyPhase))
        required.set(id, (required.get(id) ?? 0) + 1);
      const holds = [...heldInvocationResources(world, action.id)];
      if (
        holds.length !== required.size ||
        holds.some(
          (hold) =>
            hold.actorId !== entity.id ||
            hold.resource.kind !== 'item' ||
            hold.amount !== required.get(hold.resource.itemId) ||
            !sameDefinitionPin(
              hold.resource.definition,
              entityGet(world.entities, hold.resource.itemId)!.item!.definitionPin,
            ),
        )
      )
        throw new Error('Construction work lost its exact selected material or kept-tool holds.');
      const root = assemblyRoot(world, action.assemblyPhase),
        edit = root?.assembly?.activeEdit;
      if (
        root &&
        (edit?.actorId !== entity.id || edit.invocationId !== action.assemblyPhase.editId)
      )
        throw new Error('Construction work lost its exact active edit identity.');
      const candidates =
        action.assemblyPhase.operation === 'reclaim-lowered' &&
        action.assemblyPhase.implementation !== 'grounded-panel-boundary'
          ? (() => {
              const material = entityGet(world.entities, action.assemblyPhase!.itemId);
              const pile =
                material?.placement?.mode === 'contained'
                  ? entityGet(world.entities, material.placement.parentEntityId)
                  : undefined;
              const p = pile?.placement;
              return p?.mode === 'world' && p.supportSurfaceId
                ? [{ stance: { ...p.position, surfaceId: p.supportSurfaceId } }]
                : [];
            })()
          : assemblyWorkCandidates(world, action.assemblyPhase, action.assemblyCorner!, entity.id);
      if (
        !candidates.some(({ stance }) =>
          ['x', 'y', 'z', 'surfaceId'].every(
            (key) => Reflect.get(stance, key) === Reflect.get(action.destination!, key),
          ),
        )
      )
        throw new Error('Saved construction work lost its actual exterior stance.');
      const corners = assemblyWorkPointCount(action.assemblyPhase);
      if (
        action.remainingSeconds >
          (action.totalSeconds * (corners - action.assemblyCorner!)) / corners + 1e-7 ||
        action.remainingSeconds <
          (action.totalSeconds * (corners - 1 - action.assemblyCorner!)) / corners - 1e-7
      )
        throw new Error('Saved construction progress conflicts with its actual phase.');
    }
    if (!component) continue;
    if (component.implementation === 'grounded-panel-boundary') {
      validateBoundaryComponent(world, entity, component);
      continue;
    }
    const current = flexibleAssemblyFamily(world, component.family.id);
    if (
      !current ||
      component.implementation !== 'four-corner-flexible-bays' ||
      !sameDefinitionPin(component.family, definitionPin(current)) ||
      entity.kind !== 'assembly' ||
      entity.item ||
      !isSafeRecordId(component.requestId) ||
      !assemblyArrangement(current, component.arrangementId) ||
      !Number.isSafeInteger(component.revision) ||
      component.revision < 0 ||
      'heading' in component ||
      !assemblyHeadings.includes(entity.spatial.heading) ||
      Object.keys(component.parts).length > current.limits.parts
    )
      throw new Error('Invalid current assembly.');
    if (component.retired) {
      if (
        entity.placement ||
        Object.keys(component.parts).length ||
        Object.keys(component.joints).length
      )
        throw new Error('A retired assembly cannot retain physical parts.');
      continue;
    }
    const site = assemblySite(entity);
    if (!site || !finitePoint(site))
      throw new Error('An assembly needs one supported world placement.');
    const slots = new Set<string>();
    for (const [id, part] of Object.entries(component.parts)) {
      chargeWork({ candidates: 1 });
      const material = entityGet(world.entities, id),
        placement = material?.placement,
        rule =
          material?.item && world.itemDefinitions[material.item.definitionPin.id]?.assemblyMaterial;
      if (
        part.itemId !== id ||
        !isSafeRecordId(id) ||
        !['post', 'cover', 'binding'].includes(part.role) ||
        rule?.role !== part.role ||
        rule.familyId !== current.id ||
        part.bay < 0 ||
        part.bay >= assemblyArrangement(current, component.arrangementId)!.maximumBays ||
        !Number.isSafeInteger(part.bay) ||
        slots.has(part.slot) ||
        !isAssemblyPlacement(placement) ||
        placement.parentEntityId !== entity.id ||
        placement.slot !== part.slot ||
        !finitePoint(placement.local) ||
        material?.item?.assemblyClaim?.rootId !== entity.id
      )
        throw new Error('Invalid single-placement part membership.');
      slots.add(part.slot);
      const expected =
        part.role === 'post'
          ? postLocal(current, part.slot)
          : part.role === 'cover'
            ? {
                x: part.bay * current.bay.width,
                y:
                  (assemblyArrangement(current, component.arrangementId)!.rowHeights[0] +
                    assemblyArrangement(current, component.arrangementId)!.rowHeights[1]) /
                  2,
                z: 0,
              }
            : undefined;
      if (
        expected &&
        ['x', 'y', 'z'].some((k) => Reflect.get(expected, k) !== Reflect.get(placement.local, k))
      )
        throw new Error('Saved material geometry conflicts with its exact installed shape.');
      if (
        part.role === 'post' &&
        (materialPostHeight(world, id) !==
          postHeightForSlot(current, component.arrangementId, part.slot) ||
          ![`${part.bay}:0`, `${part.bay}:1`, `${part.bay + 1}:0`, `${part.bay + 1}:1`].includes(
            part.slot,
          ))
      )
        throw new Error('A post needs one exact socket in its connected bay.');
      if (part.role === 'cover') {
        const joints = Object.values(component.joints).filter((j) => j.coverId === id);
        if (
          joints.length !== 4 ||
          new Set(joints.map((j) => j.corner)).size !== 4 ||
          !materialUsable(world, id, current, 'cover')
        )
          throw new Error('A saved covering lacks complete qualified attachment.');
        const required = [
          `${part.bay}:0`,
          `${part.bay}:1`,
          `${part.bay + 1}:1`,
          `${part.bay + 1}:0`,
        ];
        for (const joint of joints)
          if (
            component.parts[joint.postId]?.slot !== required[joint.corner] ||
            !materialUsable(world, joint.postId, current, 'post') ||
            !materialUsable(world, joint.bindingId, current, 'binding')
          )
            throw new Error('A saved supported roof has corrupt supports.');
      }
    }
    const bound = new Set<string>();
    for (const [id, joint] of Object.entries(component.joints)) {
      if (
        joint.id !== id ||
        component.parts[joint.coverId]?.role !== 'cover' ||
        component.parts[joint.postId]?.role !== 'post' ||
        component.parts[joint.bindingId]?.role !== 'binding' ||
        bound.has(joint.bindingId) ||
        !Number.isSafeInteger(joint.corner) ||
        joint.corner < 0 ||
        joint.corner > 3 ||
        Object.values(component.joints).filter((j) => j.postId === joint.postId).length >
          current.limits.sockets
      )
        throw new Error('Invalid actual attachment joint.');
      bound.add(joint.bindingId);
      const placement = entityGet(world.entities, joint.bindingId)!.placement!;
      const expected = {
        ...postLocal(current, component.parts[joint.postId]!.slot),
        y: materialPostHeight(world, joint.postId)!,
      };
      if (
        !isAssemblyPlacement(placement) ||
        ['x', 'y', 'z'].some((k) => Reflect.get(expected, k) !== Reflect.get(placement.local, k))
      )
        throw new Error('Binding does not occupy its actual joint.');
    }
    if (Object.values(component.parts).some((p) => p.role === 'binding' && !bound.has(p.itemId)))
      throw new Error('An installed binding has no joint.');
    panels.push(...assemblyShapes(world, entity).panels);
  }
  const blockers = spatialBlockers(spatialMap(world));
  if (blockers.length > SPATIAL_LIMITS.maxBlockers)
    throw new Error('Saved assembly geometry exceeds the physical work limit.');
  for (const root of entityValues(world.entities)) {
    if (
      !root.assembly ||
      root.assembly.retired ||
      root.assembly.implementation !== 'four-corner-flexible-bays'
    )
      continue;
    const family = flexibleAssemblyFamily(world, root.assembly.family.id)!,
      site = assemblySite(root)!;
    const bays = new Set(Object.values(root.assembly.parts).map((part) => part.bay));
    for (const bay of bays) {
      const covers = Object.values(root.assembly.parts).filter(
        (part) => part.role === 'cover' && part.bay === bay,
      );
      const profiles = covers.length
        ? covers.map((part) => materialCoverProfile(world, part.itemId)!)
        : [defaultCoverProfile(family)];
      for (const profile of profiles) {
        const problem = assemblySupportProblem(
          world,
          family,
          site,
          root.spatial.heading,
          bay,
          root.assembly.arrangementId,
          profile,
        );
        if (problem) throw new Error(`Saved assembly support is invalid: ${problem}`);
      }
    }
    const geometry = assemblyShapes(world, root);
    for (const shape of [...geometry.posts, ...geometry.panels]) {
      for (const hit of physicalIntersections(spatialMap(world), shape)) {
        if (hit.id === shape.id) continue;
        const role = root.assembly.parts[shape.id]?.role;
        if (role === 'cover' && isInstalledCover(world, hit.id)) continue;
        const coverId = role === 'cover' ? shape.id : hit.id;
        const postId = role === 'post' ? shape.id : hit.id;
        const ownJoint = Object.values(root.assembly.joints).some(
          (joint) => joint.coverId === coverId && joint.postId === postId,
        );
        const cover =
          role === 'cover' ? shape : geometry.panels.find((panel) => panel.id === hit.id);
        const post = role === 'post' ? shape : geometry.posts.find((post) => post.id === hit.id);
        if (!ownJoint || !cover || !post || !qualifiedAttachmentContact(family, cover, post))
          throw new Error(
            'Saved assembly has contact outside a qualified joint or intersects another obstacle.',
          );
      }
    }
  }
  for (const root of entityValues(world.entities)) {
    const component = root.assembly;
    if (!component || component.retired) continue;
    const family = world.assemblyFamilies[component.family.id]!;
    if (
      Object.keys(component.parts).length + loweredAssemblyMaterials(world, root.id).length >
      family.limits.parts
    )
      throw new Error('Saved protected materials exceed the supported part limit.');
    if (family.implementation !== 'four-corner-flexible-bays') continue;
    for (const panel of assemblyShapes(world, root).panels) {
      if (!coverExposureSupported(panel, panels))
        throw new Error('Saved overlapping slopes exceed the qualified rain coverage envelope.');
      if (
        coverLayersExceeded(
          panel.bounds,
          panels.filter((other) => other.id !== panel.id),
          family.limits.layers,
        )
      )
        throw new Error('Saved coverings exceed their qualified layer envelope.');
    }
  }
  const rain = world.finiteRain;
  if (
    rain &&
    (!world.assemblyFamilies[rain.family.id] ||
      !sameDefinitionPin(rain.family, definitionPin(world.assemblyFamilies[rain.family.id]!)) ||
      ![
        rain.minX,
        rain.maxX,
        rain.minZ,
        rain.maxZ,
        rain.startsAt,
        rain.endsAt,
        rain.intensity,
      ].every(Number.isFinite) ||
      rain.minX >= rain.maxX ||
      rain.minZ >= rain.maxZ ||
      rain.startsAt < 0 ||
      rain.endsAt <= rain.startsAt ||
      rain.intensity < 0 ||
      rain.intensity > 1)
  )
    throw new Error('Invalid finite weather process.');
  validateConstructionProfile(world);
}

/** Definition admission for the finite orthogonal panel/slider geometry. This
 * proves supported topology, not terrain, body clearance, authority or reach. */
export function validateGroundedPanelGeometry(
  value: unknown,
): asserts value is import('./assembly-types.js').GroundedPanelGeometry {
  if (
    !hasRecordFields(value, ['section', 'gate']) ||
    !hasRecordFields(value.section, [
      'spacing',
      'postSection',
      'postHeight',
      'gatePostHeight',
      'panelWidth',
      'panelHeight',
      'panelThickness',
      'accessOpening',
    ]) ||
    !hasRecordFields(value.section.accessOpening, ['width', 'bottom', 'top']) ||
    !hasRecordFields(value.gate, [
      'travel',
      'width',
      'height',
      'thickness',
      'insideOffset',
      'railHeight',
      'railSection',
      'railLength',
      'hangerSection',
      'hangerHalfSpacing',
      'handleHeight',
      'insideHandleOffset',
      'outsideHandleOffset',
    ])
  )
    throw new Error('Invalid grounded-panel geometry fields.');
  const values = [
    ...Object.entries(value.section)
      .filter(([key]) => key !== 'accessOpening')
      .map(([, value]) => value),
    ...Object.values(value.section.accessOpening),
    ...Object.entries(value.gate)
      .filter(([key]) => key !== 'insideHandleOffset' && key !== 'outsideHandleOffset')
      .map(([, value]) => value),
  ];
  if (
    !values.every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value > 0 &&
        value <= SPATIAL_LIMITS.maxExtent,
    ) ||
    ![value.gate.insideHandleOffset, value.gate.outsideHandleOffset].every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        Math.abs(value) <= SPATIAL_LIMITS.maxExtent,
    )
  )
    throw new Error('Invalid grounded-panel dimensions.');
  const geometry = value as unknown as import('./assembly-types.js').GroundedPanelGeometry;
  const section = geometry.section,
    gate = geometry.gate;
  const opening = section.accessOpening,
    epsilon = SPATIAL_LIMITS.epsilon;
  if (
    section.postSection >= section.spacing ||
    Math.abs(section.panelWidth - (section.spacing - section.postSection)) > epsilon ||
    section.panelHeight >= section.postHeight ||
    opening.width >= section.panelWidth ||
    opening.bottom >= opening.top ||
    opening.top >= section.panelHeight ||
    Math.abs(gate.travel - section.spacing) > epsilon ||
    gate.width < section.panelWidth ||
    gate.insideOffset - gate.thickness / 2 <= section.panelThickness / 2 ||
    gate.railLength <= section.spacing ||
    gate.railSection >= gate.railHeight ||
    section.gatePostHeight < gate.railHeight + gate.railSection / 2 - epsilon ||
    gate.height >= gate.railHeight - gate.railSection / 2 ||
    gate.hangerHalfSpacing <= gate.hangerSection / 2 ||
    gate.hangerHalfSpacing + gate.hangerSection / 2 > gate.width / 2 ||
    gate.handleHeight < opening.bottom ||
    gate.handleHeight > opening.top ||
    gate.handleHeight >= gate.height ||
    gate.insideHandleOffset < gate.insideOffset + gate.thickness / 2 ||
    gate.outsideHandleOffset > gate.insideOffset - gate.thickness / 2
  )
    throw new Error('Unsupported grounded-panel contacts, opening or slide geometry.');
}
