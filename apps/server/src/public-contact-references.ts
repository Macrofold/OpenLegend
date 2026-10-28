import { createHmac, randomBytes } from 'node:crypto';
import {
  accessiblePossession,
  activityRequestDescriptors,
  currentInventoryInspection,
  currentObservedFacets,
  rememberedCommunicationSubjects,
  canAccessContainer,
  objectAncestors,
  currentBodyGrant,
  currentBodyObservation,
  currentBodySubject,
  receivedFacetValue,
  type ObserverSubject,
  observerIndividual,
  currentCommunicationSubject,
  knownGuideDestinations,
  canAddressRememberedSubject,
  type ActorEvent,
  type ObservedAssembly,
  entityGet,
  type Entity,
  type WorldState,
  type SpeechTargetRole,
} from '@open-legend/domain';
import { scopeKey, type RequestScope } from './authority.js';
import { entityBodyReference } from './entity-references.js';
import type {
  ActionCatalogue,
  AssemblyView,
  ConstructionView,
  ConstructionShape,
} from '@open-legend/protocol';
import { sealCursor, openCursor } from './scoped-cursor.js';

const communicationKey = randomBytes(32);
export class ContactReferenceError extends Error {
  readonly code = 'stale-contact';
  constructor() {
    super('That observed target is no longer available.');
  }
}

/** A current body role is scoped to this audience, timeline, controller and physical life. */
export const currentContactReference = (
  world: WorldState,
  scope: RequestScope,
  entity: Entity,
): string => {
  const observed = currentBodyGrant(world, scope.actorId, entity.id);
  if (!observed) throw new ContactReferenceError();
  return `contact-${entityBodyReference(`${scopeKey(scope)}:${observed.leaseId}`, entity)}`;
};

/** Communication remembers an acquired person independently from a replaceable body. */
export const communicationReference = (scope: RequestScope, entity: Pick<Entity, 'id'>): string =>
  `person-${createHmac('sha256', communicationKey)
    .update(JSON.stringify([scopeKey(scope), entity.id]))
    .digest('hex')}`;
export const publicActionReference = (scope: RequestScope, id: string): string =>
  `action-${createHmac('sha256', communicationKey)
    .update(JSON.stringify([scopeKey(scope), 'action', id]))
    .digest('hex')}`;
export function projectActionCatalogue(
  world: WorldState,
  scope: RequestScope,
  catalogue: ActionCatalogue,
): ActionCatalogue {
  const result = projectCommandContactReferences(world, scope, catalogue);
  return {
    ...result,
    ...(result.primaryAction
      ? {
          primaryAction: {
            ...result.primaryAction,
            actionId: publicActionReference(scope, result.primaryAction.actionId),
          },
        }
      : {}),
    actions: result.actions.map((action) => ({
      ...action,
      id: publicActionReference(scope, action.id),
    })),
    ...(result.defaultActionId
      ? { defaultActionId: publicActionReference(scope, result.defaultActionId) }
      : {}),
  };
}

/** A mounted material belongs to one received construction, not an unseen global
 * item list. Losing that root's body revokes all of its material references. */
function assemblyPartReference(
  world: WorldState,
  scope: RequestScope,
  rootId: string,
  itemId: string,
): string {
  const lease = currentBodyGrant(world, scope.actorId, rootId);
  if (!lease) throw new ContactReferenceError();
  return `part-${createHmac('sha256', communicationKey)
    .update(JSON.stringify([scopeKey(scope), lease.leaseId, 'assembly-part', rootId, itemId]))
    .digest('hex')}`;
}
export function projectObservedAssembly(
  world: WorldState,
  scope: RequestScope,
  rootId: string,
  assembly: ObservedAssembly,
): AssemblyView {
  const references = new Map(
    assembly.parts.map((part) => [part.id, assemblyPartReference(world, scope, rootId, part.id)]),
  );
  const shapes = assembly.shapes.map((shape) => ({ ...shape, id: references.get(shape.id)! }));
  if (assembly.implementation === 'grounded-panel-boundary')
    return {
      ...assembly,
      materialRevision: createHmac('sha256', communicationKey)
        .update(JSON.stringify([scopeKey(scope), rootId, assembly.materialRevision]))
        .digest('hex'),
      parts: assembly.parts.map((part) => ({ ...part, id: references.get(part.id)! })),
      shapes,
    };
  return {
    ...assembly,
    parts: assembly.parts.map((part) => ({ ...part, id: references.get(part.id)! })),
    shapes,
  };
}

/** Historical participant wording and current permissions are separate facts.
 * A now-recognized stranger never rewrites an earlier anonymous voice. */
export function perceivedParticipantReferences(
  world: WorldState,
  scope: RequestScope,
  event: ActorEvent,
) {
  const result: ReturnType<import('./perceived-events.js').PublicEventRoleProjection> = {};
  const body = event.sourceBody;
  if (body) {
    const entity = entityGet(world.entities, body.entityId);
    const received = currentBodyObservation(world, scope.actorId, body.entityId);
    if (body.entityId === scope.actorId && body.physicalLife === (entity?.actor?.physicalLife ?? 0))
      result.actor = { contactReference: scope.actorId };
    else if (
      entity &&
      received &&
      received.id === body.leaseId &&
      body.physicalLife === (entity.actor?.physicalLife ?? 0)
    )
      result.actor = { contactReference: currentContactReference(world, scope, entity) };
  }
  const subject = event.sourceSubject;
  const identity =
    subject?.kind === 'individual' ? observerIndividual(world, scope.actorId, subject) : undefined;
  const remembered = identity && !identity.seedOnly ? identity.canonicalId : undefined;
  if (remembered && remembered !== scope.actorId && remembered === event.actorId)
    result.actor = {
      ...result.actor,
      communicationReference: communicationReference(scope, { id: remembered }),
    };
  // An admitted addressee label establishes its original recognized role. A
  // separate present association still gates its current body/communication link.
  const targetId = event.speech?.addressee ? event.targetId : undefined;
  if (
    targetId &&
    targetId !== scope.actorId &&
    canAddressRememberedSubject(world, scope.actorId, targetId)
  ) {
    result.target = { communicationReference: communicationReference(scope, { id: targetId }) };
    const target = entityGet(world.entities, targetId);
    if (target && currentCommunicationSubject(world, scope.actorId, targetId) === targetId)
      result.target.contactReference = currentContactReference(world, scope, target);
  }
  return result;
}

/** Field-by-field construction projection keeps definition, site and slot IDs in
 * their own namespaces; only physical people/materials/root roles are translated. */
export function projectConstructionView(
  world: WorldState,
  scope: RequestScope,
  view: ConstructionView,
): ConstructionView {
  if (!view.ok) return view;
  const ref = (id: string) => physicalContactReference(world, scope, id);
  return {
    ...view,
    materials: view.materials.map((material) => ({ ...material, id: ref(material.id) })),
    lowered: view.lowered.map((material) => ({
      ...material,
      id: ref(material.id),
      rootId: ref(material.rootId),
    })),
    ...(view.cooperation
      ? {
          cooperation: {
            ...view.cooperation,
            people: view.cooperation.people.map((person) => ({ ...person, id: ref(person.id) })),
          },
        }
      : {}),
    ...(view.boundary
      ? {
          boundary: {
            ...view.boundary,
            materials: view.boundary.materials.map((material) => ({
              ...material,
              id: ref(material.id),
            })),
            roots: view.boundary.roots.map((root) => ({
              ...root,
              id: ref(root.id),
              editableParts: root.editableParts.map((part) => ({ ...part, id: ref(part.id) })),
            })),
          },
        }
      : {}),
  };
}
/** Preview pieces are presentation only, including proposed pieces not yet in the
 * world. They are never current body/material grants. */
export function projectConstructionPreview<T extends { shapes: ConstructionShape[] }>(
  scope: RequestScope,
  preview: T,
): T {
  return {
    ...preview,
    shapes: preview.shapes.map((shape) => ({
      ...shape,
      id: `preview-${createHmac('sha256', communicationKey)
        .update(JSON.stringify([scopeKey(scope), 'construction-shape', shape.id]))
        .digest('hex')}`,
    })),
  };
}

/** Existing owned/inspected contents are explicit physical roles, not guessed bodies. */
function permittedContent(world: WorldState, actorId: string, id: string): boolean {
  if (id === actorId || accessiblePossession(world, actorId, id)) return true;
  const inspection = currentInventoryInspection(world, actorId);
  if (inspection?.containerId === id || inspection?.itemIds.includes(id)) return true;
  const target = entityGet(world.entities, id);
  if (target?.container?.access?.actors.includes(actorId)) {
    const root = objectAncestors(world, id).at(-1);
    if (root && currentBodyGrant(world, actorId, root.id) && canAccessContainer(world, actorId, id))
      return true;
  }
  if (!target?.item) return false;
  const root = objectAncestors(world, id).at(-1);
  return (
    !!root &&
    currentObservedFacets(world, actorId, root.id).some(
      (facet) =>
        facet.value.kind === 'pile-contents' && facet.value.items.some((item) => item.id === id),
    )
  );
}

/** Breadcrumbs link only an already admitted body or contents role. */
export const hasPhysicalContactReference = (
  world: WorldState,
  actorId: string,
  id: string,
): boolean => {
  if (currentBodyGrant(world, actorId, id) || permittedContent(world, actorId, id)) return true;
  const root = objectAncestors(world, id).at(-1);
  return (
    !!root &&
    !!currentBodyObservation(world, actorId, root.id)?.value.body.assembly?.parts.some(
      (part) => part.id === id,
    )
  );
};

/** Project only a body or an already admitted possession/contents role. */
export function physicalContactReference(
  world: WorldState,
  scope: RequestScope,
  id: string,
): string {
  const entity = entityGet(world.entities, id);
  if (entity && currentBodyGrant(world, scope.actorId, id))
    return currentContactReference(world, scope, entity);
  if (permittedContent(world, scope.actorId, id)) return id;
  const root = entity && objectAncestors(world, id).at(-1);
  const body = root && currentBodyObservation(world, scope.actorId, root.id)?.value.body;
  if (root && body?.assembly?.parts.some((part) => part.id === id))
    return assemblyPartReference(world, scope, root.id, id);
  throw new ContactReferenceError();
}

/** Select only this observer's active bodies or learned associations, never all world IDs.
 * Resolving an opaque reference grants its exact role; native admission still checks use. */
function contactTargetResolver(world: WorldState, scope: RequestScope, communication = false) {
  let bodies: Map<string, string> | undefined,
    parts: Map<string, string> | undefined,
    people: Map<string, string> | undefined;
  return (reference: string): string => {
    if (permittedContent(world, scope.actorId, reference)) return reference;
    let selected: Map<string, string> | undefined;
    if (reference.startsWith('contact-')) {
      if (!bodies) {
        bodies = new Map();
        for (const lease of Object.values(
          world.perceptionEvidence?.[scope.actorId]?.current ?? {},
        )) {
          if (lease.value.kind !== 'body') continue;
          const entity = entityGet(world.entities, lease.subjectId);
          if (entity && currentBodyGrant(world, scope.actorId, entity.id))
            bodies.set(currentContactReference(world, scope, entity), entity.id);
        }
      }
      selected = bodies;
    } else if (reference.startsWith('part-')) {
      if (!parts) {
        parts = new Map();
        for (const lease of Object.values(
          world.perceptionEvidence?.[scope.actorId]?.current ?? {},
        )) {
          if (
            lease.value.kind !== 'body' ||
            !currentBodyGrant(world, scope.actorId, lease.subjectId)
          )
            continue;
          const value = receivedFacetValue(world, lease.value);
          if (value?.kind !== 'body') continue;
          for (const part of value.body.assembly?.parts ?? [])
            parts.set(assemblyPartReference(world, scope, lease.subjectId, part.id), part.id);
        }
      }
      selected = parts;
    } else if (communication && reference.startsWith('person-')) {
      people ??= new Map(
        rememberedCommunicationSubjects(world, scope.actorId).map(({ id }) => [
          communicationReference(scope, { id }),
          id,
        ]),
      );
      selected = people;
    }
    const id = selected?.get(reference);
    if (id) return id;
    throw new ContactReferenceError();
  };
}
export function resolveContactTarget(
  world: WorldState,
  scope: RequestScope,
  reference: string,
  options: { communication?: boolean } = {},
): string {
  return contactTargetResolver(world, scope, options.communication)(reference);
}

/** A current person window may select private knowledge only through the same
 * received body shown to that viewer. This grants no canonical identity or name. */
export function resolveCurrentPersonSubject(
  world: WorldState,
  scope: RequestScope,
  reference: string,
  bodyReference: string,
): ObserverSubject {
  const id = resolveContactTarget(world, scope, reference);
  const target = entityGet(world.entities, id);
  if (!target?.actor || entityBodyReference(scopeKey(scope), target) !== bodyReference)
    throw new ContactReferenceError();
  const subject = currentBodySubject(world, scope.actorId, id);
  if (!subject) throw new ContactReferenceError();
  return subject;
}

/** A retained destination is a personal place role, not a current body grant.
 * Resolve only the existing owner's offered places; never consult hidden positions. */
function knownDestinationReferences(world: WorldState, scope: RequestScope, project: boolean) {
  let destinations: Map<string, string> | undefined;
  return (value: string): string => {
    destinations ??= new Map(
      knownGuideDestinations(world, scope.actorId).map(({ id }): [string, string] => {
        const reference = `place-${createHmac('sha256', communicationKey)
          .update(JSON.stringify([scopeKey(scope), 'known-destination', id]))
          .digest('hex')}`;
        return project ? [id, reference] : [reference, id];
      }),
    );
    const result = destinations.get(value);
    if (result === undefined) throw new ContactReferenceError();
    return result;
  };
}

const admittedSpeechRole = (reference: string): SpeechTargetRole =>
  reference.startsWith('person-') ? 'remembered' : 'body';

/** Preserve the selected role before decoding its sole recipient routing ID. */
export function resolveSpeechTarget(
  world: WorldState,
  scope: RequestScope,
  reference: string,
): { targetId: string; targetRole: SpeechTargetRole } {
  return {
    targetId: resolveContactTarget(world, scope, reference, { communication: true }),
    targetRole: admittedSpeechRole(reference),
  };
}

/** Installed request fields and learned-method roles own entity parameter meaning.
 * Definition IDs, method IDs and literal strings are never interpreted as targets. */
function mapContactReferences<T>(
  world: WorldState,
  input: T,
  entityReference: (id: string) => string,
  destinationReference: (id: string) => string,
  inspectionScope: (value: string) => string,
): T {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const command = value as Record<string, unknown>;
    const request =
      (command.type === 'activity-request' && typeof command.activityFamilyId === 'string') ||
      (command.kind === 'activity' && typeof command.family === 'string')
        ? activityRequestDescriptors(world).find(
            (entry) => entry.id === (command.activityFamilyId ?? command.family),
          )
        : undefined;
    const method =
      command.type === 'activity' && typeof command.methodId === 'string'
        ? world.actionExperience.methods[command.methodId]
        : undefined;
    return Object.fromEntries(
      Object.entries(command).map(([key, part]) => {
        if (
          command.type === 'inspect-inventory' &&
          key === 'expectedScope' &&
          typeof part === 'string'
        )
          return [key, inspectionScope(part)];
        // Guide/hunt terms and carrying-help tasks select personal places, which
        // may outlive physical contact. Other destinations remain physical roles.
        if (
          key === 'destinationId' &&
          typeof part === 'string' &&
          ((command.type === 'outing' &&
            (command.cooperationKind === 'guide' || command.cooperationKind === 'hunt')) ||
            command.kind === 'carry')
        )
          return [key, destinationReference(part)];
        if (
          ([
            'targetId',
            'destinationId',
            'containerId',
            'itemId',
            'ammunitionId',
            'opponentId',
            'quarryId',
            'toolId',
            'coverId',
            'outgoingId',
            'rootId',
            'assemblyId',
            'npcId',
          ].includes(key) ||
            (key === 'sourceId' && command.kind === 'meal')) &&
          typeof part === 'string'
        )
          return [key, entityReference(part)];
        if (key === 'shapeId' && typeof part === 'string' && part.startsWith('part-'))
          return [key, entityReference(part)];
        if (['postIds', 'bindingIds', 'railIds', 'inputIds'].includes(key) && Array.isArray(part))
          return [key, part.map((id) => (typeof id === 'string' ? entityReference(id) : id))];
        if (key === 'tools' && part && typeof part === 'object' && !Array.isArray(part))
          return [
            key,
            Object.fromEntries(
              Object.entries(part).map(([role, id]) => [
                role,
                typeof id === 'string' ? entityReference(id) : id,
              ]),
            ),
          ];
        if (
          (key === 'activityArguments' || key === 'arguments' || key === 'bindings') &&
          part &&
          typeof part === 'object' &&
          !Array.isArray(part)
        )
          return [
            key,
            Object.fromEntries(
              Object.entries(part).map(([field, argument]) => [
                field,
                typeof argument === 'string' &&
                (key === 'activityArguments' || key === 'arguments'
                  ? request?.fields[field]?.type === 'entity'
                  : method?.roles[field]?.kind === 'object' ||
                    method?.roles[field]?.kind === 'self')
                  ? entityReference(argument)
                  : argument,
              ]),
            ),
          ];
        return [key, visit(part)];
      }),
    );
  };
  return visit(input) as T;
}

/** Native continuation proofs contain private custody and position facts. The public
 * token grants only this exact inspection under the current controller/timeline. */
export function projectInspectionScope(scope: RequestScope, value: string): string {
  return sealCursor({ kind: 'inventory-inspection', scope: scopeKey(scope), value });
}
function resolveInspectionScope(scope: RequestScope, token: string): string {
  const proof = openCursor(token) as { kind?: unknown; scope?: unknown; value?: unknown };
  if (
    proof?.kind !== 'inventory-inspection' ||
    proof.scope !== scopeKey(scope) ||
    typeof proof.value !== 'string'
  )
    throw new ContactReferenceError();
  return proof.value;
}

/** Explicit command/reference positions only. Text, stock IDs and arbitrary data stay data. */
export function resolveCommandContactReferences<T extends object>(
  world: WorldState,
  scope: RequestScope,
  input: T,
): T & { targetRole?: SpeechTargetRole } {
  const communication = 'type' in input && input.type === 'say';
  const resolved = mapContactReferences(
    world,
    input,
    contactTargetResolver(world, scope, communication),
    knownDestinationReferences(world, scope, false),
    (value) => resolveInspectionScope(scope, value),
  ) as T & { targetRole?: SpeechTargetRole };
  // This is admission metadata, not a client-granted name or identity claim.
  delete resolved.targetRole;
  if (communication && 'targetId' in input && typeof input.targetId === 'string')
    resolved.targetRole = admittedSpeechRole(input.targetId);
  return resolved;
}

export function projectCommandContactReferences<T>(
  world: WorldState,
  scope: RequestScope,
  input: T,
): T {
  const references = new Map<string, string>();
  return mapContactReferences(
    world,
    input,
    (id) => {
      let reference = references.get(id);
      if (reference === undefined) {
        reference = physicalContactReference(world, scope, id);
        references.set(id, reference);
      }
      return reference;
    },
    knownDestinationReferences(world, scope, true),
    (value) => projectInspectionScope(scope, value),
  );
}
