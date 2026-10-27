import {
  assemblyPresentation,
  currentBodyObservation,
  canonicalJson,
  observerName,
  type ObservedAssembly,
} from '@open-legend/domain';
import { BOUNDARY_REPAIR_INPUT_LIMIT } from '@open-legend/domain';
import {
  boundaryConstructionProfile,
  constructionProfile,
  assemblySupportSlots,
  materialPostHeight,
  materialUsable,
  spatialMap,
  compileAssemblyActivity,
} from '@open-legend/domain';
import { surfaceById, surfaceHeight } from '@open-legend/spatial';
import { entityGet } from '@open-legend/domain';
import { isAssemblyPlacement } from '@open-legend/domain';
import { z } from 'zod';
import {
  isSafeRecordId,
  assemblySite,
  materialExposureView,
  ACTIVITY_LIMITS,
  definitionPin,
  boundaryMaterialIntact,
  boundaryEditCandidates,
  boundaryPostSlot,
  boundaryRemovalOperations,
  boundaryReleasedMaterials,
  boundaryRepairState,
  boundaryMaterialWorkQuery,
  pointVisionQuery,
  sameDefinitionPin,
  currentInventoryInspection,
  materialAuthorized,
  availableItemQuantity,
  accessiblePossession,
  prospectiveWork,
  resourcesAfterEnding,
  assemblyHeadings,
  nativeCommandSupported,
  installedActionMeaning,
  type Entity,
  type ItemInstance,
  type GroundedPanelFamily,
  type ConstructionPermission,
  type WorldState,
} from '@open-legend/domain';
import type {
  BoundaryConstructionChoices,
  BoundaryConstructionPlan,
  CanopyConstructionPlan,
  ConstructionPlan,
  CommandInput,
} from '@open-legend/protocol';
import { digest } from './content-digest.js';
const id = z.string().refine(isSafeRecordId);
export const boundaryImpactPlanSchema = z
  .object({
    assemblyId: id,
    itemId: id,
    toolId: id,
    familyId: id,
    familyVersion: z.number().int().positive().safe(),
    familyDigest: id,
  })
  .strict();
export const gateUsePlanSchema = z
  .object({
    assemblyId: id,
    itemId: id,
    operation: z.enum(['open', 'close', 'bar', 'unbar']),
    familyId: id,
    familyVersion: z.number().int().positive().safe(),
    familyDigest: id,
    expectedRevision: z.number().int().nonnegative().safe(),
    side: z.enum(['inside', 'outside']).optional(),
  })
  .strict();

/** Called only for a personally perceived structure. Keep all four intentions:
 * an unseen bar must not select or disable a menu entry from hidden state. */
export function gateUseOptions(world: WorldState, root: Entity) {
  const component = root.assembly,
    family = component && world.assemblyFamilies?.[component.family.id];
  if (
    component?.implementation !== 'grounded-panel-boundary' ||
    component.retired ||
    family?.implementation !== component.implementation ||
    !nativeCommandSupported(world, 'operate-gate')
  )
    return [];
  const pin = definitionPin(family);
  return Object.keys(component.gates).flatMap((itemId) =>
    (['open', 'close', 'bar', 'unbar'] as const).map((operation) => ({
      id: `gate:${JSON.stringify([root.id, itemId, operation])}`,
      label: `${family.labels[operation]} — ${entityGet(world.entities, itemId)!.name}`,
      description: `${family.labels[operation]}. ${installedActionMeaning(world, 'operate-gate')!.description} ${family.seconds[operation]} game seconds plus approach.`,
      command: {
        type: 'operate-gate',
        gateUse: {
          assemblyId: root.id,
          itemId,
          operation,
          familyId: pin.id,
          familyVersion: pin.version,
          familyDigest: pin.digest,
          expectedRevision: component.revision,
        },
      } satisfies CommandInput,
    })),
  );
}

/** One explicit actor read shares carried-tool eligibility and sight preparation.
 * Equivalent same-definition tools have the same admitted impact; choose one
 * available after replacement. An inventory-item request can select its exact tool. */
export function prepareBoundaryImpactOptions(
  world: WorldState,
  actorId: string,
  stock: readonly ItemInstance[],
) {
  const actor = entityGet(world.entities, actorId),
    sight = actor && pointVisionQuery(world, actor),
    work = prospectiveWork(world, actorId, 'replace'),
    resources = 'ok' in work ? undefined : resourcesAfterEnding(world, work.releasedInvocations),
    tools = new Map<string, ItemInstance[]>();
  for (const item of stock)
    if (accessiblePossession(world, actorId, item.id)) {
      const rows = tools.get(item.definitionId);
      if (rows) rows.push(item);
      else tools.set(item.definitionId, [item]);
    }
  return (root: Entity) => {
    const component = root.assembly,
      family = component && world.assemblyFamilies?.[component.family.id];
    if (
      component?.implementation !== 'grounded-panel-boundary' ||
      component.retired ||
      family?.implementation !== component.implementation ||
      !family.damage ||
      !sight ||
      !nativeCommandSupported(world, 'impact-boundary')
    )
      return [];
    const faces = boundaryMaterialWorkQuery(world, root.id, actorId),
      pin = definitionPin(family),
      selectedTools = family.damage.tools.flatMap((profile) => {
        const rows = tools.get(profile.definition.id) ?? [],
          tool =
            rows.find((item) => availableItemQuantity(world, item.id, undefined, resources) > 0) ??
            rows[0];
        return tool &&
          sameDefinitionPin(
            entityGet(world.entities, tool.id)!.item!.definitionPin,
            profile.definition,
          )
          ? [{ tool, profile }]
          : [];
      });
    return Object.values(component.parts)
      .filter(
        (part) => part.role !== 'binding' && faces(part.itemId).some((face) => sight(face.point)),
      )
      .flatMap((part, index) =>
        selectedTools.map(({ tool, profile }) => ({
          id: `structural-impact:${JSON.stringify([root.id, part.itemId, tool.id])}`,
          label: `${family.damage!.label} — ${entityGet(world.entities, part.itemId)!.name} ${index + 1} — ${entityGet(world.entities, tool.id)!.name}`,
          description: `${installedActionMeaning(world, 'impact-boundary')!.description} ${profile.impact} material impact, ${profile.seconds} game seconds plus approach, ${profile.reach} m reach.`,
          command: {
            type: 'impact-boundary',
            boundaryImpact: {
              assemblyId: root.id,
              itemId: part.itemId,
              toolId: tool.id,
              familyId: pin.id,
              familyVersion: pin.version,
              familyDigest: pin.digest,
            },
          } satisfies CommandInput,
        })),
      );
  };
}

export const hearthPlanSchema = z
  .object({
    definition: z
      .object({
        id,
        version: z.number().int().positive().safe(),
        digest: z.string().min(1).max(180),
      })
      .strict(),
    site: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        surfaceId: id,
      })
      .strict(),
  })
  .strict();
const canopyPlanSchema = z
  .object({
    familyId: id,
    arrangementId: id,
    rootId: id.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    site: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        surfaceId: id,
      })
      .strict(),
    orientation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    operation: z.enum(['build', 'extend', 'replace', 'lower', 'dismantle', 'resume', 'reclaim']),
    postIds: z.array(id).max(6),
    coverId: id.optional(),
    bindingIds: z.array(id).max(4),
    outgoingId: id.optional(),
    destinationId: id.optional(),
    keepCovered: z.boolean().optional(),
  })
  .strict();
const boundaryPlanSchema = z
  .object({
    implementation: z.literal('grounded-panel-boundary'),
    familyId: id,
    familyVersion: z.number().int().positive().safe(),
    familyDigest: id,
    rootId: id.optional(),
    expectedRevision: z.number().int().nonnegative().safe().optional(),
    site: hearthPlanSchema.shape.site,
    orientation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    steps: z
      .array(
        z.discriminatedUnion('operation', [
          z.object({ operation: z.literal('post'), slot: id, itemId: id, toolId: id }).strict(),
          z
            .object({
              operation: z.literal('boundary-panel'),
              fromSlot: id,
              toSlot: id,
              itemId: id,
              bindingIds: z.tuple([id, id]),
            })
            .strict(),
          z
            .object({
              operation: z.literal('boundary-gate'),
              fromSlot: id,
              toSlot: id,
              thirdSlot: id,
              parkingSectionId: id,
              itemId: id,
              railIds: z.tuple([id, id]),
              bindingIds: z.array(id).length(6),
            })
            .strict(),
          ...boundaryRemovalOperations.map((operation) =>
            z
              .object({ operation: z.literal(operation), itemId: id, destinationId: id.optional() })
              .strict(),
          ),
          z
            .object({
              operation: z.literal('repair-boundary'),
              itemId: id,
              toolId: id,
              inputIds: z.array(id).min(1).max(BOUNDARY_REPAIR_INPUT_LIMIT),
            })
            .strict(),
        ]),
      )
      .min(1)
      .max(ACTIVITY_LIMITS.nodes - 1),
  })
  .strict();
export const constructionPlanSchema = z.union([canopyPlanSchema, boundaryPlanSchema]);

/** One explicit scoped read shares its carried stock and visible-root preparation
 * with the existing covering view. These facts grant no later execution. */
export function boundaryConstructionChoices(
  world: WorldState,
  actorId: string,
  family: GroundedPanelFamily,
  stock: readonly ItemInstance[],
  permissions: readonly ConstructionPermission[],
  visible: ReadonlySet<string>,
): BoundaryConstructionChoices {
  const materials: BoundaryConstructionChoices['materials'] = [];
  const observer = entityGet(world.entities, actorId),
    seesPoint = observer ? pointVisionQuery(world, observer) : () => false;
  const materialRoles = [
    'post',
    'gatePost',
    'panel',
    'parkingPanel',
    'gate',
    'rail',
    'binding',
  ] as const;
  const roles = new Map(materialRoles.map((role) => [family.roles[role].id, role]));
  const tools = new Set(family.postTools.map((pin) => pin.id));
  const repairTools = new Set(family.repair.toolDefinitions.map((pin) => pin.id));
  const work = prospectiveWork(world, actorId, 'replace');
  const resources =
    'ok' in work ? undefined : resourcesAfterEnding(world, work.releasedInvocations);
  for (const item of stock) {
    if (!accessiblePossession(world, actorId, item.id)) continue;
    const definition = world.itemDefinitions[item.definitionId]!,
      role = roles.get(definition.id);
    if (
      !role &&
      !tools.has(definition.id) &&
      !repairTools.has(definition.id) &&
      definition.id !== family.repair.input.id
    )
      continue;
    const availableQuantity = availableItemQuantity(world, item.id),
      availableAfterReplacing = availableItemQuantity(world, item.id, undefined, resources);
    const add = (role: BoundaryConstructionChoices['materials'][number]['role'], reason?: string) =>
      materials.push({
        id: item.id,
        name: entityGet(world.entities, item.id)!.name,
        role,
        quantity: item.quantity,
        availableQuantity,
        availableAfterReplacing,
        eligible: !reason,
        ...(reason ? { reason } : {}),
      });
    if (tools.has(definition.id))
      add(
        'tool',
        availableAfterReplacing < 1 ? 'Held for work this choice cannot release.' : undefined,
      );
    if (repairTools.has(definition.id))
      add('repair-tool', availableAfterReplacing < 1 ? 'Held for other work.' : undefined);
    if (definition.id === family.repair.input.id)
      add(
        'repair-input',
        !permissions.some((permission) => materialAuthorized(world, item.id, permission))
          ? 'This material needs construction permission.'
          : availableAfterReplacing < 1
            ? 'Held for other work.'
            : undefined,
      );
    if (!role) continue;
    const reason = !boundaryMaterialIntact(world, item.id, family, role)
      ? 'This material does not meet the current construction condition.'
      : !permissions.some((permission) => materialAuthorized(world, item.id, permission))
        ? 'Carrying this material does not grant construction permission.'
        : availableAfterReplacing < 1
          ? 'Held for work this choice cannot release.'
          : undefined;
    add(
      role === 'gatePost' ? 'gate-post' : role === 'parkingPanel' ? 'access-panel' : role,
      reason,
    );
  }
  const roots: BoundaryConstructionChoices['roots'] = [];
  const inspection = currentInventoryInspection(world, actorId);
  for (const id of visible) {
    const root = entityGet(world.entities, id),
      component = root?.assembly;
    if (
      !root ||
      component?.implementation !== 'grounded-panel-boundary' ||
      component.family.id !== family.id ||
      component.retired ||
      !constructionPreviewBasis(world, actorId, id)
    )
      continue;
    const candidates = boundaryEditCandidates(world, id),
      parts = Object.values(component.parts).filter(
        (part) => part.role === 'post' || part.role === 'gate-post',
      ),
      names = new Map(
        parts.map((part, index) => [
          part.itemId,
          `${entityGet(world.entities, part.itemId)!.name} ${index + 1}`,
        ]),
      );
    const editableParts: BoundaryConstructionChoices['roots'][number]['editableParts'] = [];
    const workFaces = boundaryMaterialWorkQuery(world, id, actorId);
    const addPart = (
      itemId: string,
      operation: BoundaryConstructionChoices['editOperations'][number]['operation'],
      slot: string,
    ) => {
      if (operation === 'repair-boundary') {
        const condition = boundaryRepairState(world, id, itemId);
        if (
          condition &&
          condition.value > 0 &&
          condition.value < condition.maximum &&
          workFaces(itemId).some((face) => seesPoint(face.point))
        )
          editableParts.push({
            id: itemId,
            name: entityGet(world.entities, itemId)!.name,
            operation,
            released: [],
          });
        return;
      }
      const released = new Map<string, { name: string; quantity: number }>();
      for (const releasedId of boundaryReleasedMaterials(world, {
        implementation: 'grounded-panel-boundary',
        operation,
        itemId,
        slot,
        familyId: family.id,
        familyVersion: family.version,
        familyDigest: component.family.digest,
        rootId: id,
        requestId: component.requestId,
        editId: 'read',
        expectedRevision: component.revision,
        destination: assemblySite(root)!,
        heading: root.spatial.heading,
      })) {
        const material = entityGet(world.entities, releasedId)!;
        const key = JSON.stringify([material.item!.definitionPin.id, material.name]),
          prior = released.get(key);
        if (prior) prior.quantity += material.item!.quantity;
        else released.set(key, { name: material.name, quantity: material.item!.quantity });
      }
      if (released.size)
        editableParts.push({
          id: itemId,
          name: entityGet(world.entities, itemId)!.name,
          operation,
          released: [...released.values()],
        });
    };
    for (const part of Object.values(component.parts)) {
      // The installed repair law selects structural roles through boundaryRepairState.
      if (part.role !== 'binding') addPart(part.itemId, 'repair-boundary', part.slot);
      if (part.role === 'panel' || part.role === 'access-panel')
        addPart(part.itemId, 'remove-boundary-panel', part.slot);
      else if (part.role === 'gate') addPart(part.itemId, 'remove-boundary-gate', part.slot);
      else if (part.role === 'post' || part.role === 'gate-post')
        addPart(part.itemId, 'reclaim-post', part.slot);
    }
    if (
      inspection?.containerId &&
      entityGet(world.entities, inspection.containerId)?.kind === 'item-pile'
    )
      for (const itemId of inspection.itemIds) {
        const material = entityGet(world.entities, itemId);
        if (
          material?.item?.assemblyClaim?.rootId === id &&
          !component.parts[itemId] &&
          material.placement?.mode === 'contained' &&
          material.placement.parentEntityId === inspection.containerId
        )
          addPart(itemId, 'reclaim-lowered', 'lowered');
      }
    roots.push({
      id,
      name: observerName(world, actorId, root.id).name,
      revision: component.revision,
      site: assemblySite(root)!,
      orientation: assemblyHeadings.indexOf(root.spatial.heading) as 0 | 1 | 2 | 3,
      editableParts,
      postSlots: candidates.postSlots.map((slot, index) => ({
        slot,
        label: `${family.labels.post} — ${index + 1}`,
      })),
      gateSpans: candidates.gateSpans.map((span) => ({
        fromSlot: span.fromSlot,
        toSlot: span.toSlot,
        thirdSlot: span.thirdSlot,
        parkingSectionId: span.parkingSectionId,
        label: `${names.get(span.fromPostId)} → ${names.get(span.toPostId)}`,
      })),
      panelSpans: candidates.panelSpans.map((span) => ({
        fromSlot: span.fromSlot,
        toSlot: span.toSlot,
        label: `${names.get(span.fromPostId)} → ${names.get(span.toPostId)}`,
      })),
    });
  }
  return {
    definition: definitionPin(family),
    name: family.name,
    description: family.description,
    help: family.presentation.help,
    authorized: permissions.some(
      (permission) =>
        permission.operations.includes('post') ||
        permission.operations.includes('boundary-panel') ||
        permission.operations.includes('boundary-gate') ||
        permission.operations.includes('repair-boundary') ||
        boundaryRemovalOperations.some((operation) => permission.operations.includes(operation)),
    ),
    postLabel: family.labels.post,
    panelLabel: family.labels['boundary-panel'],
    gateLabel: family.labels['boundary-gate'],
    gateSeconds: family.seconds['boundary-gate'],
    gateBindingQuantity: 6,
    editOperations: [...boundaryRemovalOperations, 'repair-boundary' as const].map((operation) => ({
      operation,
      label: family.labels[operation],
      seconds: family.seconds[operation],
    })),
    railName: world.itemDefinitions[family.roles.rail.id]!.name,
    postSeconds: family.seconds.post,
    panelSeconds: family.seconds['boundary-panel'],
    bindingName: world.itemDefinitions[family.roles.binding.id]!.name,
    bindingQuantity: family.joints.panelTies.length,
    repair: {
      inputName: world.itemDefinitions[family.repair.input.id]!.name,
      quantity: family.repair.quantity,
      amount: family.repair.amount,
    },
    startSlot: boundaryPostSlot(0, 0),
    materials,
    roots,
  };
}
/** Proposed edits may reuse live mechanical helpers only while their complete
 * outward structure still matches the actual received sample. This check grants
 * no new observation; a mismatch waits for the native sensory owner. */
export function constructionPreviewBasis(
  world: WorldState,
  actorId: string,
  id: string,
): ObservedAssembly | undefined {
  const observed = currentBodyObservation(world, actorId, id)?.value.body.assembly;
  const root = entityGet(world.entities, id);
  if (!observed || !root?.assembly || observed.revision !== root.assembly.revision) return;
  const actual = assemblyPresentation(world, id);
  if (!actual) return;
  const geometry = (value: ObservedAssembly) => ({
    implementation: value.implementation,
    familyId: value.familyId,
    revision: value.revision,
    heading: value.heading,
    site: value.site,
    presentation: value.presentation,
    shapes: value.shapes,
    arrangementId:
      value.implementation === 'four-corner-flexible-bays' ? value.arrangementId : undefined,
    parts: value.parts.map(({ condition: _condition, ...part }) => part),
  });
  return canonicalJson(geometry(actual)) === canonicalJson(geometry(observed))
    ? observed
    : undefined;
}

/** Reuse the same visible roots, material roles and full-plan compiler as Build.
 * These are finite proposals, never reservations, goals or a second work executor. */
export function constructionHelpPlans(
  world: WorldState,
  actorId: string,
  stock: readonly ItemInstance[],
  permissions: readonly ConstructionPermission[],
  seen: readonly Entity[],
): ConstructionPlan[] {
  if (!world.socialOfferPolicy?.cooperation?.families.includes('help')) return [];
  const own = permissions.filter(
    (grant) => grant.actorId === actorId && grant.worldId === world.id && !grant.revoked,
  );
  const attempted = new Map<string, boolean>(),
    plans = new Map<string, ConstructionPlan>();
  const compile = (plan: ConstructionPlan) => {
    const key = JSON.stringify(plan),
      prior = attempted.get(key);
    if (prior !== undefined) return prior;
    const valid = !(
      'ok' in compileAssemblyActivity(world, actorId, `help-plan-${attempted.size}`, plan, own)
    );
    attempted.set(key, valid);
    if (valid) plans.set(key, plan);
    return valid;
  };
  // A phase needs one complete grant. Preserve cross-phase choices, then try
  // each grant's materials so an earlier partial grant cannot hide valid work.
  // Identical proposals compile once against the complete current permission view.
  const scopes = own.length > 1 ? [own, ...own.map((grant) => [grant])] : [own];
  for (const scope of scopes)
    constructionHelpPlansForPermissions(world, actorId, stock, scope, seen, compile);
  return [...plans.values()];
}

function constructionHelpPlansForPermissions(
  world: WorldState,
  actorId: string,
  stock: readonly ItemInstance[],
  permissions: readonly ConstructionPermission[],
  seen: readonly Entity[],
  compile: (plan: ConstructionPlan) => boolean,
): ConstructionPlan[] {
  if (!world.socialOfferPolicy?.cooperation?.families.includes('help')) return [];
  const selected = boundaryConstructionProfile(world),
    actor = entityGet(world.entities, actorId);
  if (!actor) return [];
  const canopy = canopyHelpPlans(world, actorId, stock, permissions, seen, compile);
  if (!selected) return canopy;
  const visible = new Set(seen.map((entity) => entity.id)),
    own = permissions.filter(
      (permission) =>
        permission.actorId === actorId && permission.worldId === world.id && !permission.revoked,
    );
  if (!own.length) return [];
  const data = boundaryConstructionChoices(world, actorId, selected.family, stock, own, visible),
    plans: BoundaryConstructionPlan[] = [],
    seesPoint = pointVisionQuery(world, actor);
  const rows = (role: BoundaryConstructionChoices['materials'][number]['role']) =>
    data.materials.filter(
      (item) => item.role === role && item.eligible && item.availableAfterReplacing > 0,
    );
  const units = (role: BoundaryConstructionChoices['materials'][number]['role'], count: number) => {
    const result: string[] = [];
    for (const row of rows(role))
      for (let n = 0; n < row.availableAfterReplacing && result.length < count; n++)
        result.push(row.id);
    return result.length === count ? result : undefined;
  };
  const add = (
    base: Omit<BoundaryConstructionPlan, 'steps'>,
    step: BoundaryConstructionPlan['steps'][number],
  ) => {
    const plan = { ...base, steps: [step] };
    if (compile(plan)) plans.push(plan);
  };
  const posts = [...rows('post'), ...rows('gate-post')],
    tools = rows('tool'),
    binding = units('binding', data.bindingQuantity),
    rails = units('rail', 2),
    gateBindings = units('binding', data.gateBindingQuantity),
    repair = units('repair-input', data.repair.quantity);
  const base = {
    implementation: 'grounded-panel-boundary' as const,
    familyId: data.definition.id,
    familyVersion: data.definition.version,
    familyDigest: data.definition.digest,
    orientation: 0 as const,
  };
  for (const root of data.roots) {
    const here = {
      ...base,
      rootId: root.id,
      expectedRevision: root.revision,
      site: root.site,
      orientation: root.orientation,
    };
    for (const slot of root.postSlots) {
      const before = plans.length;
      for (const item of posts) {
        for (const tool of tools) {
          add(here, { operation: 'post', slot: slot.slot, itemId: item.id, toolId: tool.id });
          if (plans.length > before) break;
        }
        if (plans.length > before) break;
      }
    }
    if (binding)
      for (const span of root.panelSpans)
        for (const item of [...rows('panel'), ...rows('access-panel')])
          add(here, {
            operation: 'boundary-panel',
            ...span,
            itemId: item.id,
            bindingIds: [binding[0]!, binding[1]!],
          });
    if (rails && gateBindings)
      for (const span of root.gateSpans)
        for (const item of rows('gate'))
          add(here, {
            operation: 'boundary-gate',
            ...span,
            itemId: item.id,
            railIds: [rails[0]!, rails[1]!],
            bindingIds: gateBindings,
          });
    for (const part of root.editableParts) {
      if (part.operation === 'repair-boundary') {
        if (repair)
          for (const tool of rows('repair-tool'))
            add(here, {
              operation: 'repair-boundary',
              itemId: part.id,
              toolId: tool.id,
              inputIds: repair,
            });
      } else add(here, { operation: part.operation, itemId: part.id, destinationId: actorId });
    }
  }
  // A grant does not reveal a distant camp. A new site is suggested only when
  // the actual ground is currently seen, then checked by the ordinary compiler.
  const sites = new Set<string>();
  for (const permission of own) {
    if (!permission.operations.includes('post')) continue;
    const x = (permission.site.minX + permission.site.maxX) / 2,
      z = (permission.site.minZ + permission.site.maxZ) / 2,
      surface = surfaceById(spatialMap(world), permission.site.surfaceId);
    if (!surface) continue;
    const site = { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id },
      key = JSON.stringify(site);
    if (sites.has(key) || !seesPoint(site)) continue;
    sites.add(key);
    const before = plans.length;
    for (const item of posts) {
      for (const tool of tools) {
        add(
          { ...base, site },
          { operation: 'post', slot: data.startSlot, itemId: item.id, toolId: tool.id },
        );
        if (plans.length > before) break;
      }
      if (plans.length > before) break;
    }
  }
  return [...canopy, ...plans];
}

/** Native full-plan compilation owns permission, quantities, geometry and phase
 * admission. Candidate discovery shares its material meanings, without assigning work. */
function canopyHelpPlans(
  world: WorldState,
  actorId: string,
  stock: readonly ItemInstance[],
  permissions: readonly ConstructionPermission[],
  seen: readonly Entity[],
  compile: (plan: ConstructionPlan) => boolean,
): CanopyConstructionPlan[] {
  const selected = constructionProfile(world),
    actor = entityGet(world.entities, actorId);
  if (!selected || !actor) return [];
  const { family } = selected,
    own = permissions.filter(
      (grant) => grant.actorId === actorId && grant.worldId === world.id && !grant.revoked,
    );
  if (!own.length) return [];
  const plans: CanopyConstructionPlan[] = [],
    materials = stock.filter(
      (item) =>
        accessiblePossession(world, actorId, item.id) &&
        availableItemQuantity(world, item.id) > 0 &&
        own.some((grant) => materialAuthorized(world, item.id, grant)),
    ),
    rows = (role: 'post' | 'cover' | 'binding') =>
      materials.filter((item) => materialUsable(world, item.id, family, role)),
    posts = rows('post'),
    covers = rows('cover'),
    bindings = rows('binding'),
    bindingIds: string[] = [];
  for (const item of bindings)
    for (let n = 0; n < availableItemQuantity(world, item.id) && bindingIds.length < 4; n++)
      bindingIds.push(item.id);
  const add = (plan: CanopyConstructionPlan) => {
    if (compile(plan)) plans.push(plan);
  };
  const installing = (base: CanopyConstructionPlan, bay: number) => {
    const root = base.rootId ? entityGet(world.entities, base.rootId) : undefined,
      arrangement = family.arrangements.find((row) => row.id === base.arrangementId);
    if (!arrangement || bindingIds.length !== 4) return;
    const slots = assemblySupportSlots(bay).filter(
        (slot) =>
          !Object.values(root?.assembly?.parts ?? {}).some(
            (part) => part.role === 'post' && part.slot === slot,
          ),
      ),
      used = new Map<string, number>(),
      ids: string[] = [];
    for (const slot of slots) {
      const height = arrangement.rowHeights[Number(slot.split(':')[1])],
        post = posts.find(
          (item) =>
            materialPostHeight(world, item.id) === height &&
            (used.get(item.id) ?? 0) < availableItemQuantity(world, item.id),
        );
      if (!post) return;
      ids.push(post.id);
      used.set(post.id, (used.get(post.id) ?? 0) + 1);
    }
    for (const cover of covers) add({ ...base, postIds: ids, bindingIds, coverId: cover.id });
  };
  for (const root of seen) {
    const component = root.assembly,
      site = assemblySite(root);
    if (
      !site ||
      component?.implementation !== family.implementation ||
      component.retired ||
      component.family.id !== family.id ||
      !constructionPreviewBasis(world, actorId, root.id)
    )
      continue;
    const base: CanopyConstructionPlan = {
      familyId: family.id,
      arrangementId: component.arrangementId,
      rootId: root.id,
      expectedRevision: component.revision,
      site,
      orientation: assemblyHeadings.indexOf(root.spatial.heading) as 0 | 1 | 2 | 3,
      operation: 'resume',
      postIds: [],
      bindingIds: [],
      destinationId: actorId,
    };
    const parts = Object.values(component.parts),
      coversInPlace = parts.filter((part) => part.role === 'cover');
    installing(base, parts.some((part) => part.bay === 1) ? 1 : 0);
    installing({ ...base, operation: 'extend' }, 1);
    add({ ...base, operation: 'dismantle' });
    for (const part of coversInPlace) {
      add({ ...base, operation: 'lower', outgoingId: part.itemId });
      installing(
        { ...base, operation: 'replace', outgoingId: part.itemId, keepCovered: true },
        part.bay,
      );
    }
  }
  const sight = pointVisionQuery(world, actor),
    sites = new Set<string>();
  for (const grant of own) {
    if (!grant.operations.includes('post')) continue;
    const x = (grant.site.minX + grant.site.maxX) / 2,
      z = (grant.site.minZ + grant.site.maxZ) / 2,
      surface = surfaceById(spatialMap(world), grant.site.surfaceId);
    if (!surface) continue;
    const site = { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id },
      key = JSON.stringify(site);
    if (sites.has(key) || !sight(site)) continue;
    sites.add(key);
    for (const arrangement of family.arrangements)
      installing(
        {
          familyId: family.id,
          arrangementId: arrangement.id,
          operation: 'build',
          site,
          orientation: 0,
          postIds: [],
          bindingIds: [],
          destinationId: actorId,
        },
        0,
      );
  }
  return plans;
}
