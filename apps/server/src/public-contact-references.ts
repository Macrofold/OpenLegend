import { createHmac, randomBytes } from 'node:crypto';
import {
  accessiblePossession,
  canAddressRememberedSubject,
  currentBodyGrant,
  entityGet,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
import { scopeKey, type RequestScope } from './authority.js';
import { entityBodyReference } from './entity-references.js';
import type { ActionCatalogue } from '@open-legend/protocol';

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

/** Select only this observer's active bodies or learned associations, never all world IDs.
 * Resolving an opaque reference grants its exact role; native admission still checks use. */
export function resolveContactTarget(
  world: WorldState,
  scope: RequestScope,
  reference: string,
  options: { communication?: boolean } = {},
): string {
  if (reference === scope.actorId || accessiblePossession(world, scope.actorId, reference))
    return reference;
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
    const subjects = new Set(
      Object.values(world.observerIdentities?.[scope.actorId] ?? {}).flatMap((identity) =>
        identity.canonicalId ? [identity.canonicalId] : [],
      ),
    );
    for (const id of subjects) {
      const entity = entityGet(world.entities, id);
      if (
        entity?.actor &&
        canAddressRememberedSubject(world, scope.actorId, id) &&
        communicationReference(scope, entity) === reference
      )
        return id;
    }
  }
  throw new ContactReferenceError();
}

/** Explicit command/reference positions only. Text, stock IDs and arbitrary data stay data. */
export function resolveCommandContactReferences<T extends object>(
  world: WorldState,
  scope: RequestScope,
  input: T,
): T {
  const communication = 'type' in input && input.type === 'say';
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, part]) => [
        key,
        (key === 'targetId' || key === 'destinationId') && typeof part === 'string'
          ? resolveContactTarget(world, scope, part, { communication })
          : visit(part),
      ]),
    );
  };
  return visit(input) as T;
}

export function projectCommandContactReferences<T>(
  world: WorldState,
  scope: RequestScope,
  input: T,
): T {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, part]) => {
        if (
          (key === 'targetId' || key === 'destinationId') &&
          typeof part === 'string' &&
          part !== scope.actorId &&
          !accessiblePossession(world, scope.actorId, part)
        ) {
          const entity = entityGet(world.entities, part);
          if (!entity || !currentBodyGrant(world, scope.actorId, part))
            throw new ContactReferenceError();
          return [key, currentContactReference(world, scope, entity)];
        }
        return [key, visit(part)];
      }),
    );
  };
  return visit(input) as T;
}
