import {
  activityRequestChoices,
  activityRequestDescriptors,
  activityRequestRoleEntityIds,
  canonicalJson,
  type ActivityRequestDescriptor,
  type ActivityRequestObservation,
  type WorkDemand,
  type WorldState,
} from '@open-legend/domain';
import { entityHandles } from './entity-references.js';
import { outingContext } from './outing-view.js';
import {
  projectActivityRequestRequirements,
  activityRequestDirectory,
} from './activity-request-choice.js';
import { ACTIVITY_ROUTE_POLICY } from './jev-questions.js';

export type ActivityDetailSelection = 'complete' | 'directory' | 'selected';

/** Capture native descriptors separately from the executable model view. A cheap
 * directory grants neither invocation fields nor concrete-action coverage.
 * docs/technical/situation-aware-cognition-context.md#52-call-contracts-and-preparation-order */
export function activityDecisionFacts(
  world: WorldState,
  actorId: string,
  observed: ActivityRequestObservation,
  {
    includeRequests = true,
    detail = 'complete',
    selectedFamily,
    selectedFamilyIds,
    descriptors,
    charge = () => {},
  }: {
    includeRequests?: boolean;
    detail?: ActivityDetailSelection;
    selectedFamily?: string;
    selectedFamilyIds?: readonly string[];
    descriptors?: readonly ActivityRequestDescriptor[];
    charge?: (demand: WorkDemand) => void;
  } = {},
) {
  // Descriptor production can inspect actor-scoped prerequisites, but does not
  // enumerate choice tuples. Reuse this exact capture for route shape checks.
  charge({ candidates: world.moduleManifest.activityHosts.length });
  const nativeDescriptors = includeRequests ? activityRequestDescriptors(world, actorId) : [];
  const descriptorIdentity = canonicalJson(nativeDescriptors);
  charge({ inputBytes: Buffer.byteLength(descriptorIdentity) });
  if (includeRequests && descriptors && canonicalJson(descriptors) !== descriptorIdentity)
    throw new Error('The character’s available activity meanings changed during preparation.');
  const discoveryDescriptors = includeRequests ? structuredClone(nativeDescriptors) : [];
  // WorldService publishes immutable snapshots. Reuse a check only on the same
  // frozen snapshot; mutable construction worlds must always read current metadata.
  let checkedWorld = Object.isFrozen(world) ? new WeakRef(world) : undefined;
  let checkedCurrent = true;
  const current = (snapshot: WorldState): boolean => {
    if (!includeRequests) return true;
    if (checkedWorld?.deref() === snapshot) return checkedCurrent;
    charge({ candidates: snapshot.moduleManifest.activityHosts.length });
    const currentDescriptors = activityRequestDescriptors(snapshot, actorId);
    const identity = canonicalJson(currentDescriptors);
    charge({ candidates: currentDescriptors.length, inputBytes: Buffer.byteLength(identity) });
    checkedCurrent = identity === descriptorIdentity;
    checkedWorld = Object.isFrozen(snapshot) ? new WeakRef(snapshot) : undefined;
    return checkedCurrent;
  };
  charge({ candidates: discoveryDescriptors.length });
  const completeForms =
    detail === 'complete'
      ? discoveryDescriptors
      : detail === 'directory'
        ? []
        : discoveryDescriptors.filter((descriptor) =>
            (selectedFamilyIds ?? (selectedFamily ? [selectedFamily] : [])).includes(descriptor.id),
          );
  if (detail === 'selected' && selectedFamily && completeForms.length !== 1)
    throw new Error('The selected activity family is no longer available.');
  const selected = observed.inspectedContainer;
  // Full ordinary generation keeps its existing complete catalogue. Explicit
  // family selection instead uses the native field owner at each frontier.
  // Never expand the whole catalogue merely to build a route directory.
  const roleReferenceIds =
    detail === 'selected' && selectedFamily !== undefined
      ? (() => {
          const descriptor = completeForms[0]!;
          charge({
            candidates:
              observed.visibleEntities.length +
              observed.inventory.length +
              (selected?.items.length ?? 0),
            tests: Object.keys(descriptor.fields).length,
          });
          return activityRequestRoleEntityIds(world, actorId, descriptor.id, observed);
        })()
      : [];
  const available =
    (detail === 'complete' || (detail === 'selected' && selectedFamilyIds !== undefined)) &&
    completeForms.length
      ? (() => {
          charge({
            candidates:
              observed.visibleEntities.length +
              observed.inventory.length +
              (selected?.items.length ?? 0),
            tests: completeForms.reduce(
              (total, form) => total + Object.keys(form.fields).length,
              0,
            ),
          });
          return activityRequestChoices(
            world,
            actorId,
            observed,
            undefined,
            completeForms.map((form) => form.id),
          );
        })()
      : undefined;
  const handles = available ? entityHandles(world, actorId) : undefined;
  let missingChoice = false;
  charge({ candidates: available?.choices.length ?? 0 });
  const choices = (available?.choices ?? []).flatMap(({ id, kind, ...choice }) => {
    const requires = projectActivityRequestRequirements(completeForms, choice, (id) =>
      handles?.get(id),
    );
    if (!requires) {
      missingChoice = true;
      return [];
    }
    return [
      {
        ...choice,
        kind,
        ...(choice.requires ? { requires } : {}),
        ...(kind === 'entity'
          ? { entityId: id }
          : kind === 'choice'
            ? { value: id }
            : { definitionId: id }),
      },
    ];
  });
  const activityRequests = {
    requests: completeForms,
    choices,
    warnings: [
      ...(available?.warnings ?? []),
      ...(missingChoice
        ? [
            'Some activity choices lack current permitted parent references; their preparation is incomplete.',
          ]
        : []),
    ],
  };
  const facts = {
    simTime: world.simTime,
    outing: outingContext(world, actorId),
    activityRequests,
    ...(detail !== 'complete' && discoveryDescriptors.length
      ? {
          activityDirectory: activityRequestDirectory(discoveryDescriptors, completeForms),
          activityRoutePolicy: ACTIVITY_ROUTE_POLICY,
        }
      : {}),
    ...(selected
      ? {
          inspectedContainer: {
            entityId: selected.id,
            name: selected.name,
            revision: selected.revision,
            ...(selected.load !== undefined
              ? { load: selected.load, capacity: selected.capacity }
              : {}),
            more: selected.inspection.more,
            items: selected.items.map((item) => ({
              entityId: item.id,
              definitionId: item.definitionId,
              name: world.itemDefinitions[item.definitionId]!.name,
              quantity: item.quantity,
              revision: item.revision,
            })),
          },
        }
      : {}),
  };
  charge({
    candidates: roleReferenceIds.length,
    inputBytes: roleReferenceIds.reduce((total, id) => total + Buffer.byteLength(id), 0),
  });
  const referenceIds = [
    ...new Set([
      ...choices.flatMap((choice) => ('entityId' in choice ? [choice.entityId] : [])),
      ...roleReferenceIds,
      ...(selected ? [selected.id, ...selected.items.map((item) => item.id)] : []),
    ]),
  ];
  return { facts, discoveryDescriptors, completeForms, referenceIds, current };
}
