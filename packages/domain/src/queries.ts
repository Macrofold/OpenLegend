import {
  membershipDependency,
  existenceDependency,
  valueDependency,
  type Dependency,
  type QueryResult,
} from './dependencies.js';
import { directChildIds } from './objects.js';
import { nearbyEntities } from './spatial.js';
import { WorkBudgetError, withWorkMeter, WORK_LIMITS, chargeWork } from './work-budget.js';
import type { Entity, Position, WorldState } from './types.js';
import type { AttributeDefinition } from './world-modules.js';

function query<T>(
  dependencies: Dependency[],
  maximumCandidates: number,
  read: () => T[],
): QueryResult<T> {
  if (
    !Number.isSafeInteger(maximumCandidates) ||
    maximumCandidates < 0 ||
    maximumCandidates > WORK_LIMITS.group.candidates
  )
    return { status: 'unavailable', dependencies };
  try {
    return {
      status: 'complete',
      values: withWorkMeter({ ...WORK_LIMITS.group, candidates: maximumCandidates }, read),
      dependencies,
    };
  } catch (error) {
    if (!(error instanceof WorkBudgetError)) throw error;
    return { status: 'budget-exhausted', dependencies };
  }
}
/** Complete page, including the requested lookahead. Empty pages still depend on
 * parent membership, child values, installed item definitions and the caller's scope.
 * Authorization is performed by the caller before passing its opaque scope. */
export function contentsQuery(
  world: WorldState,
  parentId: string,
  scope: string,
  after = '',
  pageSize = 201,
): QueryResult<string> {
  const dependencies: Dependency[] = [
    membershipDependency(world, 'direct-contents', parentId),
    existenceDependency(world, parentId),
    valueDependency(world, 'items'),
    valueDependency(world, 'claims'),
    { kind: 'authority', scope },
  ];
  if (
    !world.entities[parentId] ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 201
  )
    return { status: 'unavailable', dependencies };
  return query(dependencies, pageSize, () => {
    const values: string[] = [];
    for (const id of directChildIds(world, parentId, after)) {
      values.push(id);
      if (values.length === pageSize) break;
    }
    return values;
  });
}
export function spatialQuery(
  world: WorldState,
  position: Position,
  radius: number,
  maximumCandidates = WORK_LIMITS.group.candidates,
): QueryResult<Entity> {
  const dependencies: Dependency[] = [
    membershipDependency(world, 'spatial-candidates'),
    membershipDependency(world, 'installed-capabilities'),
    valueDependency(world, 'status-policy'),
    { kind: 'geometry', revision: world.map.spatial.revision },
  ];
  if (
    ![position.x, position.y, position.z, radius].every(Number.isFinite) ||
    radius < 0 ||
    radius > 10000
  )
    return { status: 'unavailable', dependencies };
  return query(dependencies, maximumCandidates, () => nearbyEntities(world, position, radius));
}
/** Closed installed family, used by creator capability discovery. Actor-known
 * capability queries add that actor's knowledge dependency and filter at that owner. */
export function installedStateQuery(world: WorldState): QueryResult<AttributeDefinition> {
  const dependencies = [membershipDependency(world, 'installed-capabilities')];
  return query(dependencies, WORK_LIMITS.group.candidates, () => {
    chargeWork({ candidates: world.moduleManifest.definitions.length });
    return world.moduleManifest.definitions;
  });
}
