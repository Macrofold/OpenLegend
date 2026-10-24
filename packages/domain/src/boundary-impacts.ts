import type { Action, Outcome, WorldEvent, WorldState } from './types.js';
import type { BoundaryImpactIntent } from './boundary-types.js';
import type { CampAssetPermission } from './camp-asset-permissions.js';
import { structuralImpactPermission } from './camp-asset-permissions.js';
import { entityGet } from './entity-collection.js';
import { definitionPin } from './world-modules.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { isDefinitionPin, readState, sameDefinitionPin, writeState } from './state-owners.js';
import { accessiblePossession } from './object-access.js';
import {
  availableItemQuantity,
  resourcesAfterEnding,
  reserveResource,
  ResourceReservationError,
  heldInvocationResources,
} from './resource-claims.js';
import { prospectiveWork, type ProspectiveWork } from './action-capabilities.js';
import { canHandleItems } from './item-handling.js';
import {
  boundaryFailureWithinLimit,
  boundaryMaterialWorkCandidates,
} from './boundary-assemblies.js';
import { findPhysicalWorkApproach, physicalWorkPointAvailable } from './spatial.js';
import { seesEntity, pointVisionQuery } from './perception.js';
import { worldPosition } from './spatial-state.js';
import { outcome, emit } from './events.js';
import { subjectNarration } from './narration.js';
import { finitePoint, MOVEMENT } from '@open-legend/spatial';

export function validBoundaryImpactIntent(value: unknown): value is BoundaryImpactIntent {
  return (
    hasRecordFields(value, [
      'assemblyId',
      'itemId',
      'toolId',
      'familyId',
      'familyVersion',
      'familyDigest',
    ]) &&
    ['assemblyId', 'itemId', 'toolId', 'familyId', 'familyDigest'].every((key) =>
      isSafeRecordId(value[key]),
    ) &&
    Number.isSafeInteger(value.familyVersion) &&
    Number(value.familyVersion) > 0
  );
}
function impactContext(world: WorldState, intent: BoundaryImpactIntent) {
  const root = entityGet(world.entities, intent.assemblyId),
    component = root?.assembly,
    family = world.assemblyFamilies?.[intent.familyId],
    item = entityGet(world.entities, intent.itemId),
    part =
      component?.implementation === 'grounded-panel-boundary'
        ? component.parts[intent.itemId]
        : undefined,
    tool = entityGet(world.entities, intent.toolId)?.item;
  if (
    component?.implementation !== 'grounded-panel-boundary' ||
    component.retired ||
    family?.implementation !== component.implementation ||
    !family.damage ||
    !part ||
    part.role === 'binding' ||
    !item?.item ||
    !tool ||
    !sameDefinitionPin(component.family, definitionPin(family)) ||
    !sameDefinitionPin(component.family, {
      id: intent.familyId,
      version: intent.familyVersion,
      digest: intent.familyDigest,
    })
  )
    return;
  const profile = family.damage.tools.find((profile) =>
      sameDefinitionPin(profile.definition, tool.definitionPin),
    ),
    role =
      part.role === 'post' || part.role === 'gate-post'
        ? 'post'
        : part.role === 'panel' || part.role === 'access-panel'
          ? 'panel'
          : part.role === 'gate'
            ? 'gate'
            : 'rail',
    definition = family.integrity[role],
    state = readState(world, { entityId: intent.itemId, definition }, 'owner');
  if (!profile || state.status !== 'known' || typeof state.value !== 'number' || state.value <= 0)
    return;
  return {
    root: root!,
    component,
    family,
    profile,
    item,
    tool,
    definition,
    state,
    value: state.value,
  };
}
export function prepareBoundaryImpact(
  world: WorldState,
  actorId: string,
  id: string,
  intent: BoundaryImpactIntent,
  permissions: readonly CampAssetPermission[],
  replacing?: ProspectiveWork,
): Action | Outcome {
  const actor = entityGet(world.entities, actorId),
    details = validBoundaryImpactIntent(intent) && impactContext(world, intent);
  if (
    !actor?.actor?.alive ||
    !canHandleItems(world, actor) ||
    !details ||
    !seesEntity(world, actor, details.root)
  )
    return outcome(
      false,
      'invalid-impact',
      'Choose an actual perceived structural part and a qualified tool.',
    );
  const work = replacing ?? prospectiveWork(world, actorId, 'replace');
  if ('ok' in work) return work;
  if (!work.outcome.ok) return work.outcome;
  if (
    !accessiblePossession(world, actorId, intent.toolId) ||
    availableItemQuantity(
      world,
      intent.toolId,
      undefined,
      resourcesAfterEnding(world, work.releasedInvocations),
    ) < 1
  )
    return outcome(
      false,
      'missing-tool',
      'Keep the exact qualified tool accessible and available for this impact.',
    );
  const grant = structuralImpactPermission(world, intent.assemblyId, intent.itemId, permissions);
  if (!grant)
    return outcome(
      false,
      'protected-property',
      'This actual structural part has no current permission for that impact.',
    );
  if (
    details.value <= details.profile.impact &&
    !boundaryFailureWithinLimit(world, intent.assemblyId, intent.itemId)
  )
    return outcome(
      false,
      'part-limit',
      'Reclaim lowered materials before this impact creates more salvage.',
    );
  const visible = pointVisionQuery(world, actor),
    candidates = boundaryMaterialWorkCandidates(
      world,
      intent.assemblyId,
      intent.itemId,
      actorId,
    ).filter((candidate) => visible(candidate.point)),
    approach = findPhysicalWorkApproach(world, actor, candidates, details.profile.reach);
  if (!approach)
    return outcome(
      false,
      'impact-access',
      'No clear supported approach reaches a personally perceived solid face of this part.',
    );
  const destination = approach.candidate.stance,
    here = worldPosition(actor),
    atStance =
      Math.hypot(here.x - destination.x, here.y - destination.y, here.z - destination.z) <=
      MOVEMENT.arrivalTolerance;
  return {
    id,
    type: 'impact-boundary',
    stage: atStance ? 'working' : 'approaching',
    destination: { ...destination },
    path: atStance ? [] : approach.route.path,
    ...(approach.route.status === 'pending'
      ? { navigation: { request: approach.route.request } }
      : {}),
    remainingSeconds: details.profile.seconds,
    totalSeconds: details.profile.seconds,
    consumed: [],
    boundaryImpact: {
      intent,
      tool: { ...details.tool.definitionPin },
      target: { ...details.item.item!.definitionPin },
      point: { ...approach.candidate.point },
      grant: { id: grant.id, revision: grant.revision },
    },
  };
}
export function boundaryImpactProblem(
  world: WorldState,
  actorId: string,
  action: Action,
  permissions: readonly CampAssetPermission[],
  contact = false,
): Outcome | undefined {
  const work = action.boundaryImpact,
    actor = entityGet(world.entities, actorId),
    details = work && impactContext(world, work.intent);
  if (
    !work ||
    !actor?.actor?.alive ||
    !canHandleItems(world, actor) ||
    !details ||
    !accessiblePossession(world, actorId, work.intent.toolId) ||
    !sameDefinitionPin(details.tool.definitionPin, work.tool) ||
    !sameDefinitionPin(details.item.item!.definitionPin, work.target)
  )
    return outcome(
      false,
      'impact-changed',
      'The selected part or kept tool is no longer available.',
    );
  const grant = structuralImpactPermission(
    world,
    work.intent.assemblyId,
    work.intent.itemId,
    permissions,
    work.grant.id,
  );
  if (!grant || grant.id !== work.grant.id || grant.revision !== work.grant.revision)
    return outcome(
      false,
      'protected-property',
      'The current permission for this material impact changed.',
    );
  if (
    details.value <= details.profile.impact &&
    !boundaryFailureWithinLimit(world, work.intent.assemblyId, work.intent.itemId)
  )
    return outcome(
      false,
      'part-limit',
      'Reclaim lowered materials before this impact creates more salvage.',
    );
  const candidate = boundaryMaterialWorkCandidates(
    world,
    work.intent.assemblyId,
    work.intent.itemId,
    actorId,
  ).find(
    (candidate) =>
      ['x', 'y', 'z', 'surfaceId'].every(
        (key) => Reflect.get(candidate.stance, key) === Reflect.get(action.destination!, key),
      ) &&
      ['x', 'y', 'z'].every(
        (key) => Reflect.get(candidate.point, key) === Reflect.get(work.point, key),
      ),
  );
  if (
    !candidate ||
    !pointVisionQuery(world, actor)(work.point) ||
    (contact &&
      !physicalWorkPointAvailable(
        world,
        actor,
        candidate,
        details.profile.reach,
        worldPosition(actor),
      ))
  )
    return outcome(
      false,
      'impact-contact',
      'The selected solid face moved, became hidden or is no longer in clear physical reach.',
    );
}
export function reserveBoundaryImpact(world: WorldState, actorId: string, action: Action): void {
  const work = action.boundaryImpact!,
    item = entityGet(world.entities, work.intent.toolId)!.item!;
  if (
    reserveResource(
      world,
      {
        id: `${action.id}:structural-tool`,
        invocationId: action.id,
        actorId,
        resource: { kind: 'item', itemId: work.intent.toolId, definition: work.tool },
        amount: 1,
      },
      item.revision,
    ).status !== 'applied'
  )
    throw new ResourceReservationError();
}
export function completeBoundaryImpact(
  world: WorldState,
  actorId: string,
  action: Action,
  permissions: readonly CampAssetPermission[],
  events: WorldEvent[],
): Outcome {
  const problem = boundaryImpactProblem(world, actorId, action, permissions, true);
  if (problem) return problem;
  const work = action.boundaryImpact!,
    details = impactContext(world, work.intent)!,
    actor = entityGet(world.entities, actorId)!,
    before = details.value,
    loss = Math.min(before, details.profile.impact);
  const written = writeState(
    world,
    { entityId: work.intent.itemId, definition: details.definition },
    details.state.revision,
    { kind: 'increment', amount: -loss },
    events,
    'structural-impact',
    'transition',
    'silent',
    action.id,
  );
  if (written.status !== 'applied')
    return outcome(false, 'impact-changed', 'The material condition changed before contact.');
  emit(
    world,
    events,
    'structure-struck',
    subjectNarration(actor, `${details.family.damage!.pastTense}.`),
    actor,
    work.intent.assemblyId,
    {
      itemId: work.intent.itemId,
      actionId: action.id,
      exposureGrantId: work.grant.id,
      exposureGrantRevision: work.grant.revision,
    },
  );
  emit(
    world,
    events,
    'structure-impact-detail',
    subjectNarration(actor, `${details.family.damage!.pastTense}.`),
    actor,
    work.intent.itemId,
    {
      itemId: work.intent.itemId,
      integrityDefinition: details.definition.id,
      integrityBefore: before,
      integrityAfter: before - loss,
      actualLoss: loss,
      actionId: action.id,
    },
    'private',
  );
  return outcome(true, 'structural-impact', details.family.damage!.label);
}
export function boundaryImpactRecovery(world: WorldState, action: Action): number {
  return action.boundaryImpact
    ? (impactContext(world, action.boundaryImpact.intent)?.profile.recoverySeconds ?? 0)
    : 0;
}
export function validateBoundaryImpact(world: WorldState, actorId: string, action: Action): void {
  const work = action.boundaryImpact,
    family = work && world.assemblyFamilies?.[work.intent.familyId],
    target = work && entityGet(world.entities, work.intent.itemId),
    tool = work && entityGet(world.entities, work.intent.toolId)?.item,
    holds = [...heldInvocationResources(world, action.id)];
  if (
    action.type !== 'impact-boundary' ||
    !work ||
    !hasRecordFields(work, ['intent', 'tool', 'target', 'point', 'grant']) ||
    !validBoundaryImpactIntent(work.intent) ||
    !isDefinitionPin(work.tool) ||
    !isDefinitionPin(work.target) ||
    !finitePoint(work.point) ||
    !hasRecordFields(work.grant, ['id', 'revision']) ||
    !isSafeRecordId(work.grant.id) ||
    !Number.isSafeInteger(work.grant.revision) ||
    work.grant.revision < 1 ||
    family?.implementation !== 'grounded-panel-boundary' ||
    !family.damage ||
    !sameDefinitionPin(definitionPin(family), {
      id: work.intent.familyId,
      version: work.intent.familyVersion,
      digest: work.intent.familyDigest,
    }) ||
    !family.damage.tools.some(
      (profile) =>
        sameDefinitionPin(profile.definition, work.tool) && profile.seconds === action.totalSeconds,
    ) ||
    !target ||
    !(target.item?.definitionPin ?? target.retirement?.definitionPin) ||
    !sameDefinitionPin(
      (target.item?.definitionPin ?? target.retirement?.definitionPin)!,
      work.target,
    ) ||
    !tool ||
    !sameDefinitionPin(tool.definitionPin, work.tool) ||
    !action.destination ||
    !finitePoint(action.destination) ||
    holds.length !== 1 ||
    holds[0]!.actorId !== actorId ||
    holds[0]!.amount !== 1 ||
    holds[0]!.resource.kind !== 'item' ||
    holds[0]!.resource.itemId !== work.intent.toolId ||
    !sameDefinitionPin(holds[0]!.resource.definition, work.tool) ||
    !Number.isFinite(action.remainingSeconds) ||
    action.remainingSeconds < 0 ||
    action.remainingSeconds > action.totalSeconds
  )
    throw new Error('Invalid exact current structural impact work.');
}
