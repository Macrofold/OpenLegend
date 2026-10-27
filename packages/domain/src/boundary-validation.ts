import { BOUNDARY_REPAIR_INPUT_LIMIT } from './boundary-repair-inputs.js';
import type { Entity, ItemDefinition, WorldState } from './types.js';
import type { BoundaryComponent, GroundedPanelFamily } from './boundary-types.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { definitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { entityGet } from './entity-collection.js';
import { isAssemblyPlacement, spatialMap } from './spatial-state.js';
import {
  assemblyHeadings,
  assemblySite,
  assemblyShapes,
  boundarySectionFrame,
  boundaryGateLayout,
} from './assembly-geometry.js';
import {
  boundaryMaterialIntact,
  boundaryPostRole,
  boundarySectionGraphProblem,
  boundaryGateSupports,
} from './boundary-assemblies.js';
import { boundaryPostGrid } from './boundary-phase.js';
import { validateGroundedPanelGeometry } from './assembly-validation.js';
import {
  finitePoint,
  physicalIntersections,
  SPATIAL_LIMITS,
  surfaceById,
  surfaceHeight,
  surfaceSupportsRectangle,
} from '@open-legend/spatial';
import { tracksMaterialOrigins, validateMaterialInventoryRule } from './material-inventory.js';

export function boundaryMaterialDefinitionValid(
  definition: ItemDefinition,
  family: GroundedPanelFamily,
): boolean {
  const descriptor = definition.assemblyMaterial,
    pin = definitionPin(definition);
  if (!descriptor || descriptor.familyId !== family.id || descriptor.coverProfile !== undefined)
    return false;
  return descriptor.role === 'post'
    ? (sameDefinitionPin(pin, family.roles.post) &&
        descriptor.postHeight === family.geometry.section.postHeight) ||
        (sameDefinitionPin(pin, family.roles.gatePost) &&
          descriptor.postHeight === family.geometry.section.gatePostHeight)
    : descriptor.postHeight === undefined &&
        (descriptor.role === 'panel'
          ? sameDefinitionPin(pin, family.roles.panel) ||
            sameDefinitionPin(pin, family.roles.parkingPanel)
          : descriptor.role === 'gate'
            ? sameDefinitionPin(pin, family.roles.gate)
            : descriptor.role === 'rail' && sameDefinitionPin(pin, family.roles.rail));
}
export function validateBoundaryFamily(
  world: WorldState,
  id: string,
  family: GroundedPanelFamily,
): void {
  if (
    !hasRecordFields(
      family,
      [
        'id',
        'version',
        'implementation',
        'name',
        'description',
        'geometry',
        'roles',
        'postTools',
        'materials',
        'inventory',
        'joints',
        'workPoints',
        'seconds',
        'labels',
        'limits',
        'integrity',
        'repair',
        'salvage',
        'presentation',
      ],
      ['damage'],
    ) ||
    family.id !== id ||
    !isSafeRecordId(id) ||
    !Number.isSafeInteger(family.version) ||
    family.version < 1 ||
    ![family.name, family.description].every(
      (text) => typeof text === 'string' && text.trim().length > 0,
    )
  )
    throw new Error('Invalid installed boundary family.');
  validateGroundedPanelGeometry(family.geometry);
  const exactItem = (pin: unknown) =>
    isDefinitionPin(pin) &&
    !!world.itemDefinitions[pin.id] &&
    sameDefinitionPin(pin, definitionPin(world.itemDefinitions[pin.id]!));
  if (
    family.damage &&
    (!hasRecordFields(
      family.damage,
      ['implementation', 'label', 'pastTense', 'tools'],
      ['exposureText'],
    ) ||
      family.damage.implementation !== 'held-tool-impact' ||
      (family.damage.exposureText !== undefined &&
        (typeof family.damage.exposureText !== 'string' || !family.damage.exposureText.trim())) ||
      !family.damage.label.trim() ||
      !family.damage.pastTense.trim() ||
      !Array.isArray(family.damage.tools) ||
      !family.damage.tools.length ||
      family.damage.tools.length > 8 ||
      new Set(family.damage.tools.map((profile) => profile.definition.id)).size !==
        family.damage.tools.length ||
      family.damage.tools.some(
        (profile) =>
          !hasRecordFields(profile, [
            'definition',
            'impact',
            'seconds',
            'reach',
            'recoverySeconds',
          ]) ||
          !exactItem(profile.definition) ||
          !Number.isSafeInteger(profile.impact) ||
          profile.impact < 1 ||
          !Number.isFinite(profile.seconds) ||
          profile.seconds <= 0 ||
          profile.seconds > 86400 ||
          !Number.isFinite(profile.reach) ||
          profile.reach <= 0 ||
          profile.reach > SPATIAL_LIMITS.maxExtent ||
          !Number.isFinite(profile.recoverySeconds) ||
          profile.recoverySeconds < 0 ||
          profile.recoverySeconds > 86400,
      ))
  )
    throw new Error('Invalid exact structural tool-impact law.');
  if (
    !hasRecordFields(family.roles, [
      'post',
      'gatePost',
      'panel',
      'parkingPanel',
      'gate',
      'rail',
      'binding',
    ]) ||
    !Object.values(family.roles).every(exactItem) ||
    new Set(Object.values(family.roles).map((pin) => pin.id)).size !== 7 ||
    !Array.isArray(family.postTools) ||
    !family.postTools.length ||
    family.postTools.length > 8 ||
    !family.postTools.every(exactItem) ||
    !hasRecordFields(family.materials, ['post', 'panel', 'binding']) ||
    !Object.values(family.materials).every((material) =>
      ['stone', 'timber', 'panel'].includes(material),
    )
  )
    throw new Error('Boundary materials and tools need exact current definitions.');
  if (
    !hasRecordFields(family.inventory, ['post', 'panel', 'gate', 'rail']) ||
    !hasRecordFields(family.integrity, ['post', 'panel', 'gate', 'rail'])
  )
    throw new Error('Missing boundary material laws.');
  for (const role of ['post', 'panel', 'gate', 'rail'] as const) {
    validateMaterialInventoryRule(world, family.inventory[role]);
    const pin = family.integrity[role],
      definition =
        isDefinitionPin(pin) &&
        world.moduleManifest.definitions.find((definition) => definition.id === pin.id);
    if (
      !definition ||
      !sameDefinitionPin(pin, definitionPin(definition)) ||
      definition.schema.kind !== 'number' ||
      definition.schema.min !== 0 ||
      !Number.isSafeInteger(definition.schema.max) ||
      !Number.isSafeInteger(definition.schema.initial) ||
      definition.schema.initial <= 0 ||
      !family.inventory[role].initialAttributes.includes(pin.id)
    )
      throw new Error('Missing exact positive boundary integrity law.');
  }
  const binding = world.itemDefinitions[family.roles.binding.id]!.assemblyMaterial;
  // Exact input bindings and their controls must fit the shared native phase allowance.
  if (
    !hasRecordFields(family.repair, ['roles', 'input', 'quantity', 'amount', 'toolDefinitions']) ||
    !Array.isArray(family.repair.roles) ||
    !family.repair.roles.length ||
    new Set(family.repair.roles).size !== family.repair.roles.length ||
    family.repair.roles.some((role) => !['post', 'panel', 'gate', 'rail'].includes(role)) ||
    !exactItem(family.repair.input) ||
    !Number.isSafeInteger(family.repair.quantity) ||
    family.repair.quantity < 1 ||
    family.repair.quantity > BOUNDARY_REPAIR_INPUT_LIMIT ||
    !Number.isSafeInteger(family.repair.amount) ||
    family.repair.amount < 1 ||
    !Array.isArray(family.repair.toolDefinitions) ||
    !family.repair.toolDefinitions.length ||
    family.repair.toolDefinitions.length > 8 ||
    !family.repair.toolDefinitions.every(exactItem)
  )
    throw new Error('Unsupported exact boundary repair law.');
  if (
    binding?.role !== 'binding' ||
    world.assemblyFamilies?.[binding.familyId]?.implementation !== 'four-corner-flexible-bays'
  )
    throw new Error('Boundary bindings must use their installed shared cord law.');
  if (
    !hasRecordFields(family.limits, ['sections', 'gates', 'parts', 'activeEdits']) ||
    family.limits.activeEdits !== 1 ||
    !Number.isSafeInteger(family.limits.sections) ||
    family.limits.sections < 1 ||
    family.limits.sections > 16 ||
    !Number.isSafeInteger(family.limits.gates) ||
    family.limits.gates < 1 ||
    family.limits.gates > 2 ||
    !Number.isSafeInteger(family.limits.parts) ||
    family.limits.parts < 1 ||
    family.limits.parts > 96
  )
    throw new Error('Unsupported finite boundary envelope.');
  const operations = [
    'post',
    'boundary-panel',
    'boundary-gate',
    'remove-boundary-panel',
    'remove-boundary-gate',
    'reclaim-post',
    'reclaim-lowered',
    'repair-boundary',
    'open',
    'close',
    'bar',
    'unbar',
  ];
  if (
    !hasRecordFields(family.seconds, operations) ||
    !hasRecordFields(family.labels, operations) ||
    !Object.entries(family.seconds).every(
      ([operation, seconds]) =>
        Number.isFinite(seconds) &&
        (operation === 'reclaim-lowered' ? seconds >= 0 : seconds > 0) &&
        seconds <= 86400,
    ) ||
    !Object.values(family.labels).every(
      (label) => typeof label === 'string' && label.trim().length > 0,
    )
  )
    throw new Error('Invalid native boundary work.');
  if (
    !hasRecordFields(family.joints, [
      'panelTies',
      'panelContact',
      'runnerContact',
      'hangerContact',
    ]) ||
    !Array.isArray(family.joints.panelTies) ||
    family.joints.panelTies.length !== 2 ||
    new Set(family.joints.panelTies.map((tie) => tie.end)).size !== 2 ||
    family.joints.panelTies.some(
      (tie) =>
        !hasRecordFields(tie, ['end', 'height']) ||
        (tie.end !== 0 && tie.end !== 1) ||
        !Number.isFinite(tie.height) ||
        tie.height <= 0 ||
        tie.height > family.geometry.section.panelHeight,
    ) ||
    [family.joints.panelContact, family.joints.runnerContact, family.joints.hangerContact].some(
      (box) =>
        !hasRecordFields(box, ['min', 'max']) ||
        !finitePoint(box.min) ||
        !finitePoint(box.max) ||
        ['x', 'y', 'z'].some((axis) => Reflect.get(box.min, axis) >= Reflect.get(box.max, axis)),
    )
  )
    throw new Error('Invalid finite boundary attachment geometry.');
  if (
    !hasRecordFields(family.workPoints, [
      'clearance',
      'postHeight',
      'panelHeight',
      'runnerHeight',
    ]) ||
    !Object.values(family.workPoints).every(
      (value) => Number.isFinite(value) && value > 0 && value <= SPATIAL_LIMITS.maxExtent,
    ) ||
    family.workPoints.postHeight > family.geometry.section.postHeight ||
    family.workPoints.panelHeight > family.geometry.section.panelHeight
  )
    throw new Error('Invalid boundary working points.');
  if (
    !hasRecordFields(family.salvage, ['footprint', 'outputs']) ||
    !hasRecordFields(family.salvage.footprint, ['width', 'length', 'height']) ||
    !Object.values(family.salvage.footprint).every(
      (value) => Number.isFinite(value) && value > 0 && value <= SPATIAL_LIMITS.maxExtent,
    ) ||
    !hasRecordFields(family.salvage.outputs, ['post', 'panel', 'gate', 'rail']) ||
    Object.values(family.salvage.outputs).some(
      (outputs) =>
        !Array.isArray(outputs) ||
        outputs.length > 4 ||
        outputs.some(
          (output) =>
            !hasRecordFields(output, ['port', 'definition', 'quantity']) ||
            !isSafeRecordId(output.port) ||
            !exactItem(output.definition) ||
            !tracksMaterialOrigins(world.itemDefinitions[output.definition.id]!) ||
            !Number.isSafeInteger(output.quantity) ||
            output.quantity < 1 ||
            output.quantity > 16,
        ),
    )
  )
    throw new Error('Invalid finite boundary salvage.');
  for (const role of ['post', 'gatePost', 'panel', 'parkingPanel', 'gate', 'rail'] as const)
    if (!boundaryMaterialDefinitionValid(world.itemDefinitions[family.roles[role].id]!, family))
      throw new Error('Boundary roles need their actual qualified material definitions.');
  const presentation = family.presentation;
  const text = (value: unknown) => typeof value === 'string' && !!value.trim();
  if (
    !hasRecordFields(
      presentation,
      [
        'postColor',
        'coverColor',
        'bindingSize',
        'loweredName',
        'failureText',
        'help',
        'exposureText',
        'unbarredText',
        'barredText',
        'openText',
        'closedText',
        'planLabels',
      ],
      ['condition'],
    ) ||
    !Object.entries(presentation).every(
      ([key, value]) =>
        key === 'bindingSize' || key === 'planLabels' || key === 'condition' || text(value),
    ) ||
    !Number.isFinite(presentation.bindingSize) ||
    presentation.bindingSize <= 0 ||
    presentation.bindingSize > SPATIAL_LIMITS.maxExtent ||
    presentation.bindingSize * 2 > family.geometry.section.postSection ||
    family.geometry.gate.insideOffset - family.geometry.gate.railSection / 2 <=
      family.geometry.section.postSection / 2 ||
    family.joints.runnerContact.min.x > -family.geometry.section.postSection / 2 ||
    family.joints.runnerContact.max.x < family.geometry.section.postSection / 2 ||
    family.joints.runnerContact.min.y > -presentation.bindingSize / 2 ||
    family.joints.runnerContact.max.y < presentation.bindingSize / 2 ||
    family.joints.runnerContact.min.z >
      family.geometry.section.postSection / 2 - family.geometry.gate.insideOffset ||
    family.joints.runnerContact.max.z < -family.geometry.gate.railSection / 2 ||
    !hasRecordFields(presentation.planLabels, ['post', 'panel', 'gate', 'remove', 'repair']) ||
    !Object.values(presentation.planLabels).every(text)
  )
    throw new Error('Boundary presentation needs its complete readable authored labels.');
  if (
    presentation.condition &&
    (!hasRecordFields(presentation.condition, [
      'nearlyBrokenFraction',
      'intact',
      'damaged',
      'nearlyBroken',
    ]) ||
      !Number.isFinite(presentation.condition.nearlyBrokenFraction) ||
      presentation.condition.nearlyBrokenFraction <= 0 ||
      presentation.condition.nearlyBrokenFraction >= 1 ||
      ![
        presentation.condition.intact,
        presentation.condition.damaged,
        presentation.condition.nearlyBroken,
      ].every(text))
  )
    throw new Error('Invalid authored coarse material condition display.');
}
/** One current graph owns actual parts and joints; restoration never repairs it. */
export function validateBoundaryComponent(
  world: WorldState,
  entity: Entity,
  component: BoundaryComponent,
): void {
  const family = world.assemblyFamilies?.[component.family.id];
  if (
    !hasRecordFields(
      component,
      [
        'implementation',
        'family',
        'requestId',
        'revision',
        'nextSection',
        'parts',
        'joints',
        'sections',
        'gates',
      ],
      ['activeEdit', 'retired'],
    ) ||
    family?.implementation !== 'grounded-panel-boundary' ||
    !sameDefinitionPin(component.family, definitionPin(family)) ||
    entity.kind !== 'assembly' ||
    entity.item ||
    !isSafeRecordId(component.requestId) ||
    !Number.isSafeInteger(component.revision) ||
    component.revision < 0 ||
    !Number.isSafeInteger(component.nextSection) ||
    component.nextSection < 0 ||
    !assemblyHeadings.some((heading) => heading === entity.spatial.heading) ||
    [component.parts, component.joints, component.sections, component.gates].some(
      (records) =>
        !records ||
        typeof records !== 'object' ||
        Array.isArray(records) ||
        Object.keys(records).some((key) => !isSafeRecordId(key)),
    ) ||
    Object.keys(component.parts).length > family.limits.parts ||
    Object.keys(component.sections).length > family.limits.sections ||
    Object.keys(component.gates).length > family.limits.gates
  )
    throw new Error('Invalid current boundary assembly.');
  if (
    component.activeEdit &&
    (!hasRecordFields(component.activeEdit, ['actorId', 'invocationId']) ||
      !isSafeRecordId(component.activeEdit.actorId) ||
      !isSafeRecordId(component.activeEdit.invocationId) ||
      !entityGet(world.entities, component.activeEdit.actorId)?.actor)
  )
    throw new Error('Invalid boundary edit identity.');
  if (component.retired) {
    if (
      !hasRecordFields(component.retired, ['at', 'cause']) ||
      !Number.isFinite(component.retired.at) ||
      component.retired.at < 0 ||
      component.retired.at > world.simTime ||
      !isSafeRecordId(component.retired.cause) ||
      entity.placement ||
      Object.keys(component.parts).length ||
      Object.keys(component.sections).length ||
      Object.keys(component.gates).length ||
      Object.keys(component.joints).length
    )
      throw new Error('A retired boundary cannot retain physical parts.');
    return;
  }
  const site = assemblySite(entity);
  if (!site || !finitePoint(site))
    throw new Error('A boundary needs one supported world placement.');
  const panelSections = new Map<string, import('./boundary-types.js').BoundarySection>(),
    bound = new Set<string>(),
    jointIds = new Set<string>();
  for (const [id, section] of Object.entries(component.sections)) {
    const ordinal = Number(id.slice('section-'.length));
    if (section.kind === 'gate') {
      if (
        !hasRecordFields(section, ['id', 'fromPostId', 'toPostId', 'kind', 'gateId']) ||
        section.id !== id ||
        id !== `section-${ordinal}` ||
        !Number.isSafeInteger(ordinal) ||
        ordinal < 0 ||
        ordinal >= component.nextSection ||
        !isSafeRecordId(section.gateId) ||
        component.gates[section.gateId]?.sectionId !== id
      )
        throw new Error('Invalid actual gate section.');
      continue;
    }
    if (
      !hasRecordFields(section, [
        'id',
        'fromPostId',
        'toPostId',
        'kind',
        'panelId',
        'bindingIds',
      ]) ||
      section.id !== id ||
      !id.startsWith('section-') ||
      !Number.isSafeInteger(ordinal) ||
      ordinal < 0 ||
      ordinal >= component.nextSection ||
      id !== `section-${ordinal}` ||
      (section.kind !== 'panel' && section.kind !== 'access-panel') ||
      !isSafeRecordId(section.panelId) ||
      panelSections.has(section.panelId) ||
      !Array.isArray(section.bindingIds) ||
      section.bindingIds.length !== family.joints.panelTies.length ||
      new Set(section.bindingIds).size !== section.bindingIds.length ||
      ![section.fromPostId, section.toPostId].every((postId) => {
        const part = component.parts[postId];
        return part && (part.role === 'post' || part.role === 'gate-post');
      })
    )
      throw new Error('Invalid actual boundary section.');
    const from = entityGet(world.entities, section.fromPostId)?.placement,
      to = entityGet(world.entities, section.toPostId)?.placement,
      frame = boundarySectionFrame(world, entity, section.fromPostId, section.toPostId);
    if (
      !frame ||
      !isAssemblyPlacement(from) ||
      !isAssemblyPlacement(to) ||
      Math.abs(to.local.x - from.local.x) + Math.abs(to.local.z - from.local.z) !==
        family.geometry.section.spacing
    )
      throw new Error('A boundary section needs adjacent actual posts.');
    const panel = component.parts[section.panelId],
      placement = entityGet(world.entities, section.panelId)?.placement;
    if (
      panel?.role !== section.kind ||
      panel.slot !== `panel:${id}` ||
      !isAssemblyPlacement(placement) ||
      ['x', 'y', 'z'].some(
        (key) => Reflect.get(placement.local, key) !== Reflect.get(frame.local, key),
      )
    )
      throw new Error('Saved panel conflicts with its actual section geometry.');
    panelSections.set(section.panelId, section);
    family.joints.panelTies.forEach((tie, index) => {
      const jointId = JSON.stringify(['panel-end', id, index]),
        joint = component.joints[jointId],
        bindingId = section.bindingIds[index]!,
        supportId = tie.end === 0 ? section.fromPostId : section.toPostId,
        post = entityGet(world.entities, supportId)?.placement,
        binding = entityGet(world.entities, bindingId)?.placement;
      if (
        !joint ||
        !hasRecordFields(joint, ['id', 'kind', 'partId', 'supportId', 'bindingId', 'index']) ||
        joint.id !== jointId ||
        joint.kind !== 'panel-end' ||
        joint.partId !== section.panelId ||
        joint.supportId !== supportId ||
        joint.bindingId !== bindingId ||
        joint.index !== index ||
        bound.has(bindingId) ||
        component.parts[bindingId]?.role !== 'binding' ||
        component.parts[bindingId]?.slot !== jointId ||
        !isAssemblyPlacement(post) ||
        !isAssemblyPlacement(binding) ||
        binding.local.x !== post.local.x ||
        binding.local.z !== post.local.z ||
        binding.local.y !== tie.height ||
        !boundaryMaterialIntact(world, bindingId, family, 'binding')
      )
        throw new Error('Invalid exact panel attachment.');
      bound.add(bindingId);
      jointIds.add(jointId);
    });
  }
  const gateParts = new Set<string>(),
    parkingSections = new Set<string>();
  for (const [id, gate] of Object.entries(component.gates)) {
    if (
      !hasRecordFields(gate, [
        'sectionId',
        'postIds',
        'railIds',
        'parkingSectionId',
        'bindingIds',
        'position',
        'barred',
        'slide',
      ]) ||
      !isSafeRecordId(gate.sectionId) ||
      !isSafeRecordId(gate.parkingSectionId) ||
      !Array.isArray(gate.postIds) ||
      gate.postIds.length !== 3 ||
      new Set(gate.postIds).size !== 3 ||
      !Array.isArray(gate.railIds) ||
      gate.railIds.length !== 2 ||
      new Set(gate.railIds).size !== 2 ||
      !Array.isArray(gate.bindingIds) ||
      gate.bindingIds.length !== 6 ||
      new Set(gate.bindingIds).size !== 6 ||
      ![...gate.postIds, ...gate.railIds, ...gate.bindingIds].every(isSafeRecordId) ||
      (gate.position !== 'open' && gate.position !== 'closed') ||
      typeof gate.barred !== 'boolean' ||
      (gate.barred && gate.position !== 'closed') ||
      !sameDefinitionPin(gate.slide, definitionPin(family)) ||
      parkingSections.has(gate.parkingSectionId)
    )
      throw new Error('Invalid exact gate assembly.');
    const slots = gate.postIds.map((post) => component.parts[post]?.slot),
      info =
        slots.every((slot): slot is string => typeof slot === 'string') &&
        boundaryGateSupports(
          world,
          entity,
          family,
          slots as [string, string, string],
          gate.parkingSectionId,
        ),
      from = entityGet(world.entities, gate.postIds[0])?.placement,
      to = entityGet(world.entities, gate.postIds[1])?.placement,
      layout =
        isAssemblyPlacement(from) &&
        isAssemblyPlacement(to) &&
        boundaryGateLayout(
          family.geometry,
          from.local,
          to.local,
          entity.spatial.heading,
          gate.position,
          family.presentation.bindingSize,
        ),
      section = component.sections[gate.sectionId];
    if (
      !info ||
      !layout ||
      section?.kind !== 'gate' ||
      section.gateId !== id ||
      section.fromPostId !== gate.postIds[0] ||
      section.toPostId !== gate.postIds[1]
    )
      throw new Error('Gate supports, parking section or endpoint changed.');
    parkingSections.add(gate.parkingSectionId);
    const exactPart = (
      partId: string,
      role: import('./boundary-types.js').BoundaryPart['role'],
      slot: string,
      local: import('@open-legend/spatial').WorldPoint,
    ) => {
      const part = component.parts[partId],
        placement = entityGet(world.entities, partId)?.placement;
      if (
        gateParts.has(partId) ||
        part?.role !== role ||
        part.slot !== slot ||
        !isAssemblyPlacement(placement) ||
        ['x', 'y', 'z'].some(
          (axis) => Reflect.get(placement.local, axis) !== Reflect.get(local, axis),
        )
      )
        throw new Error('Gate attachment conflicts with its exact endpoint or support.');
      gateParts.add(partId);
    };
    if (
      !boundaryMaterialIntact(world, id, family, 'gate') ||
      gate.railIds.some((rail) => !boundaryMaterialIntact(world, rail, family, 'rail'))
    )
      throw new Error('Installed gate and runners need their actual intact material.');
    exactPart(id, 'gate', `gate:${gate.sectionId}`, layout.leaf);
    gate.railIds.forEach((rail, index) =>
      exactPart(
        rail,
        index === 0 ? 'first-rail' : 'second-rail',
        JSON.stringify(['runner', gate.sectionId, index]),
        layout.rails[index]!,
      ),
    );
    gate.bindingIds.forEach((binding, index) => {
      const kind = index < 4 ? 'runner-post' : 'leaf-hanger',
        slot = JSON.stringify([kind, gate.sectionId, index]),
        joint = component.joints[slot],
        partId = index < 4 ? gate.railIds[index < 2 ? 0 : 1] : id,
        supportId =
          index < 4
            ? gate.postIds[[0, 1, 1, 2][index]!]!
            : gate.railIds[gate.position === 'closed' ? 0 : 1];
      if (
        !joint ||
        !hasRecordFields(joint, ['id', 'kind', 'partId', 'supportId', 'bindingId', 'index']) ||
        joint.id !== slot ||
        joint.kind !== kind ||
        joint.partId !== partId ||
        joint.supportId !== supportId ||
        joint.bindingId !== binding ||
        joint.index !== index ||
        bound.has(binding) ||
        !boundaryMaterialIntact(world, binding, family, 'binding')
      )
        throw new Error('Invalid exact runner tie or hanging cord.');
      exactPart(
        binding,
        'binding',
        slot,
        index < 4 ? layout.runnerTies[index]! : layout.hangers[index - 4]!,
      );
      bound.add(binding);
      jointIds.add(slot);
    });
  }
  if (
    Object.keys(component.joints).some((id) => !jointIds.has(id)) ||
    boundarySectionGraphProblem(Object.values(component.sections), false)
  )
    throw new Error('Invalid boundary section or joint graph.');
  const slots = new Set<string>();
  for (const [id, part] of Object.entries(component.parts)) {
    const material = entityGet(world.entities, id),
      placement = material?.placement;
    if (
      !hasRecordFields(part, ['itemId', 'role', 'slot']) ||
      part.itemId !== id ||
      !isSafeRecordId(id) ||
      !isSafeRecordId(part.slot) ||
      slots.has(part.slot) ||
      !isAssemblyPlacement(placement) ||
      placement.parentEntityId !== entity.id ||
      placement.slot !== part.slot ||
      !finitePoint(placement.local) ||
      material?.item?.assemblyClaim?.rootId !== entity.id
    )
      throw new Error('Invalid single-placement boundary part.');
    slots.add(part.slot);
    if (part.role === 'post' || part.role === 'gate-post') {
      const grid = boundaryPostGrid(part.slot);
      if (
        !grid ||
        grid.some((n) => Math.abs(n) > family.limits.sections) ||
        part.role !== boundaryPostRole(world, id, family) ||
        !boundaryMaterialIntact(world, id, family, part.role === 'post' ? 'post' : 'gatePost') ||
        placement.local.x !== grid[0] * family.geometry.section.spacing ||
        placement.local.y !== 0 ||
        placement.local.z !== grid[1] * family.geometry.section.spacing
      )
        throw new Error('Invalid single-placement boundary post.');
    } else if (part.role === 'panel' || part.role === 'access-panel') {
      if (
        !panelSections.has(id) ||
        !boundaryMaterialIntact(world, id, family, part.role === 'panel' ? 'panel' : 'parkingPanel')
      )
        throw new Error('An installed panel needs its exact intact material and section.');
    } else if (!gateParts.has(id) && (part.role !== 'binding' || !bound.has(id)))
      throw new Error('Unsupported or unattached boundary part.');
  }
  const map = spatialMap(world),
    surface = surfaceById(map, site.surfaceId);
  for (const solid of assemblyShapes(world, entity).posts) {
    if (
      !surface ||
      surface.slopeX !== 0 ||
      surface.slopeZ !== 0 ||
      !surfaceSupportsRectangle(map, surface, {
        minX: solid.bounds.min.x,
        maxX: solid.bounds.max.x,
        minZ: solid.bounds.min.z,
        maxZ: solid.bounds.max.z,
      }) ||
      Math.abs(surfaceHeight(surface, solid.bounds.min.x, solid.bounds.min.z) - site.y) >
        SPATIAL_LIMITS.epsilon ||
      physicalIntersections(map, solid).some((hit) => hit.id !== solid.id)
    )
      throw new Error('Saved boundary part has invalid support or overlapping geometry.');
  }
}
