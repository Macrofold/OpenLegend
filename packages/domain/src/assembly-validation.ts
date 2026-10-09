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
  assemblySupportProblem,
  assemblyWorkCandidates,
  qualifiedAttachmentContact,
  coverLayersExceeded,
  loweredAssemblyMaterials,
  materialUsable,
  validAssemblyPhase,
  overlaps,
} from './assemblies.js';
import { isSafeRecordId, hasRecordFields } from './records.js';
import { sameDefinitionPin } from './state-owners.js';
import { definitionPin, validateAttributeValue } from './world-modules.js';
import { chargeWork } from './work-budget.js';
import type { AssemblyFamily } from './assembly-types.js';
import type { WorldState } from './types.js';

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
    const numbers = [
      family.bay.width,
      family.bay.length,
      minimumHeight,
      family.bay.postSection,
      family.cover.width,
      family.cover.length,
      family.cover.thickness,
      family.minimumClearance,
      family.wettingSeconds,
      family.dryingSeconds,
    ];
    if (
      !numbers.every((v) => Number.isFinite(v) && v > 0) ||
      family.cover.transmission < 0 ||
      family.cover.transmission > 1 ||
      !Number.isFinite(family.cover.transmission) ||
      !Number.isFinite(family.restMargin) ||
      family.restMargin < 0 ||
      family.cover.edge < 0 ||
      !Number.isFinite(family.cover.edge)
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
    if (family.arrangements.some((a) => assemblySpanProblem(family, a.id)))
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
    if (
      !world.assemblyFamilies[material.familyId] ||
      !['post', 'cover', 'binding', 'fiber'].includes(material.role) ||
      (material.role === 'post'
        ? !Number.isFinite(material.postHeight) ||
          material.postHeight! <= 0 ||
          material.postHeight! > SPATIAL_LIMITS.maxExtent
        : material.postHeight !== undefined)
    )
      throw new Error('Invalid current physical material definition.');
  }
  const panels: Array<ReturnType<typeof assemblyShapes>['panels'][number]> = [];
  for (const entity of Object.values(world.entities)) {
    const component = entity.assembly;
    const descriptor =
      entity.item && world.itemDefinitions[entity.item.definitionPin.id]?.assemblyMaterial;
    const family = descriptor && world.assemblyFamilies[descriptor.familyId];
    if (descriptor && !family) throw new Error('Material references a missing assembly family.');
    if (family && entity.item) {
      if (
        ['post', 'cover'].includes(descriptor!.role) &&
        (entity.item.quantity !== 1 || entity.item.individuality !== 'individual')
      )
        throw new Error('A post or covering needs one actual individual identity.');
      const origins = entity.item.materialOriginIds;
      if (
        !origins?.length ||
        !origins.every((origin) => isSafeRecordId(origin) && !!world.entities[origin]) ||
        new Set(origins).size !== origins.length
      )
        throw new Error('Invalid physical material provenance.');
      const expected = [
        family.conditionAttribute,
        ...(['cover', 'fiber'].includes(descriptor!.role) ? [family.moistureAttribute] : []),
      ];
      for (const id of expected) {
        const state = entity.attributes?.[id],
          definition = world.moduleManifest.definitions.find((d) => d.id === id)!;
        if (
          !state ||
          !hasRecordFields(state, ['value', 'revision']) ||
          !Number.isSafeInteger(state.revision) ||
          state.revision < 0
        )
          throw new Error('Missing current material state.');
        validateAttributeValue(definition, state.value);
      }
      if (
        ['cover', 'fiber'].includes(descriptor!.role) &&
        entity.placement?.mode === 'contained' &&
        world.entities[entity.placement.parentEntityId]?.container
      )
        throw new Error('Unsupported nested material exposure.');
    }
    const claim = entity.item?.assemblyClaim;
    if (claim) {
      const root = world.entities[claim.rootId];
      if (
        !family ||
        !root?.assembly ||
        root.assembly.retired ||
        !sameDefinitionPin(claim.family, definitionPin(family)) ||
        !sameDefinitionPin(claim.family, root.assembly.family) ||
        entity.item!.quantity !== 1 ||
        entity.item!.individuality !== 'individual'
      )
        throw new Error('Invalid protected material claim.');
      if (
        !root.assembly.parts[entity.id] &&
        (entity.placement?.mode !== 'contained' ||
          world.entities[entity.placement.parentEntityId]?.kind !== 'item-pile')
      )
        throw new Error('Protected lowered material must have actual exposed ground custody.');
    }
    const action = entity.actor?.action;
    if (
      action?.materialOriginIds &&
      (!['prepare', 'craft'].includes(action.type) ||
        !action.materialOriginIds.length ||
        new Set(action.materialOriginIds).size !== action.materialOriginIds.length ||
        !action.materialOriginIds.every(
          (origin) => isSafeRecordId(origin) && !!world.entities[origin],
        ))
    )
      throw new Error('Invalid saved material-production provenance.');
    if (action?.type === 'assemble' || action?.assemblyPhase) {
      if (
        action.type !== 'assemble' ||
        !action.assemblyPhase ||
        !validAssemblyPhase(action.assemblyPhase) ||
        !action.constructionGrant ||
        !isSafeRecordId(action.constructionGrant.id) ||
        !Number.isSafeInteger(action.constructionGrant.revision) ||
        action.constructionGrant.revision <= 0 ||
        !Number.isSafeInteger(action.assemblyCorner) ||
        action.assemblyCorner! < 0 ||
        action.assemblyCorner! >
          (['cover', 'lower'].includes(action.assemblyPhase.operation) ? 3 : 0) ||
        !action.destination ||
        !finitePoint(action.destination)
      )
        throw new Error('Invalid saved construction work.');
      const family = world.assemblyFamilies[action.assemblyPhase.familyId];
      if (
        !family ||
        !assemblyArrangement(family, action.assemblyPhase.arrangementId) ||
        action.totalSeconds !== family.seconds[action.assemblyPhase.operation] ||
        action.remainingSeconds < 0 ||
        !Number.isFinite(action.remainingSeconds) ||
        action.remainingSeconds > action.totalSeconds
      )
        throw new Error('Construction work lost its current mechanical pin.');
      const candidates =
        action.assemblyPhase.operation === 'reclaim-lowered'
          ? (() => {
              const material = world.entities[action.assemblyPhase!.itemId];
              const pile =
                material?.placement?.mode === 'contained'
                  ? world.entities[material.placement.parentEntityId]
                  : undefined;
              const p = pile?.placement;
              return p?.mode === 'world' && p.supportSurfaceId
                ? [{ stance: { ...p.position, surfaceId: p.supportSurfaceId } }]
                : [];
            })()
          : assemblyWorkCandidates(world, action.assemblyPhase, action.assemblyCorner!);
      if (
        !candidates.some(({ stance }) =>
          ['x', 'y', 'z', 'surfaceId'].every(
            (key) => Reflect.get(stance, key) === Reflect.get(action.destination!, key),
          ),
        )
      )
        throw new Error('Saved construction work lost its actual exterior stance.');
      const corners = ['cover', 'lower'].includes(action.assemblyPhase.operation) ? 4 : 1;
      if (
        action.remainingSeconds >
          (action.totalSeconds * (corners - action.assemblyCorner!)) / corners + 1e-7 ||
        action.remainingSeconds <
          (action.totalSeconds * (corners - 1 - action.assemblyCorner!)) / corners - 1e-7
      )
        throw new Error('Saved construction progress conflicts with its actual phase.');
    }
    if (!component) continue;
    const current = world.assemblyFamilies[component.family.id];
    if (
      !current ||
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
      const material = world.entities[id],
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
      const placement = world.entities[joint.bindingId]!.placement!;
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
  for (const root of Object.values(world.entities)) {
    if (!root.assembly || root.assembly.retired) continue;
    const family = world.assemblyFamilies[root.assembly.family.id]!,
      site = assemblySite(root)!;
    const bays = new Set(Object.values(root.assembly.parts).map((part) => part.bay));
    for (const bay of bays) {
      const problem = assemblySupportProblem(
        world,
        family,
        site,
        root.spatial.heading,
        bay,
        root.assembly.arrangementId,
      );
      if (problem) throw new Error(`Saved assembly support is invalid: ${problem}`);
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
  for (const root of Object.values(world.entities)) {
    const component = root.assembly;
    if (!component || component.retired) continue;
    const family = world.assemblyFamilies[component.family.id]!;
    if (
      Object.keys(component.parts).length + loweredAssemblyMaterials(world, root.id).length >
      family.limits.parts
    )
      throw new Error('Saved protected materials exceed the supported part limit.');
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
}
