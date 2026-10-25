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
  entityGet,
  type Entity,
  type WorldState,
  type SpeechTargetRole,
} from '@open-legend/domain';
import { scopeKey, type RequestScope } from './authority.js';
import { entityBodyReference } from './entity-references.js';
import type { ActionCatalogue } from '@open-legend/protocol';
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
    actions: result.actions.map((action) => ({
      ...action,
      id: publicActionReference(scope, action.id),
    })),
    ...(result.defaultActionId
      ? { defaultActionId: publicActionReference(scope, result.defaultActionId) }
      : {}),
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
): boolean => !!currentBodyGrant(world, actorId, id) || permittedContent(world, actorId, id);

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
  throw new ContactReferenceError();
}

/** Select only this observer's active bodies or learned associations, never all world IDs.
 * Resolving an opaque reference grants its exact role; native admission still checks use. */
export function resolveContactTarget(
  world: WorldState,
  scope: RequestScope,
  reference: string,
  options: { communication?: boolean } = {},
): string {
  if (permittedContent(world, scope.actorId, reference)) return reference;
  if (reference.startsWith('contact-')) {
    const owner = world.perceptionEvidence?.[scope.actorId];
    for (const lease of Object.values(owner?.current ?? {})) {
      if (lease.value.kind !== 'body') continue;
      const entity = entityGet(world.entities, lease.subjectId);
      if (
        entity &&
        currentBodyGrant(world, scope.actorId, entity.id) &&
        currentContactReference(world, scope, entity) === reference
      )
        return entity.id;
    }
  } else if (options.communication && reference.startsWith('person-')) {
    for (const { id } of rememberedCommunicationSubjects(world, scope.actorId))
      if (communicationReference(scope, { id }) === reference) return id;
  }
  throw new ContactReferenceError();
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
  inspectionScope: (value: string) => string,
): T {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const command = value as Record<string, unknown>;
    const request =
      command.type === 'activity-request' && typeof command.activityFamilyId === 'string'
        ? activityRequestDescriptors(world).find((entry) => entry.id === command.activityFamilyId)
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
        if (
          (key === 'targetId' ||
            key === 'destinationId' ||
            key === 'containerId' ||
            (key === 'itemId' && typeof command.type === 'string')) &&
          typeof part === 'string'
        )
          return [key, entityReference(part)];
        if (
          (key === 'activityArguments' || key === 'bindings') &&
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
                (key === 'activityArguments'
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
    (reference) => resolveContactTarget(world, scope, reference, { communication }),
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
  return mapContactReferences(
    world,
    input,
    (id) => physicalContactReference(world, scope, id),
    (value) => projectInspectionScope(scope, value),
  );
}
