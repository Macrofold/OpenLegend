import { entityGet, seesEntity, spatialMap, type WorldState } from '@open-legend/domain';
import { finitePoint, surfaceHeight, SPATIAL_LIMITS } from '@open-legend/spatial';
import type { CommandInput } from '@open-legend/protocol';
import { entityBodyReference } from './entity-references.js';
import { scopeKey, type RequestScope } from './authority.js';

/** Validate the permitted basis, not whether a physical pointer produced the coordinates. */
export function aimPointProblem(
  world: WorldState,
  input: CommandInput,
  scope: RequestScope,
): string | undefined {
  if (input.bodyReference) {
    const target = input.targetId ? entityGet(world.entities, input.targetId) : undefined;
    const actor = entityGet(world.entities, scope.actorId);
    if (
      !target ||
      !actor ||
      !seesEntity(world, actor, target) ||
      input.bodyReference !== entityBodyReference(scopeKey(scope), target)
    )
      return 'That displayed body changed. Choose it again.';
  }
  const point = input.aimPoint;
  if (!point) return;
  if (!finitePoint(point)) return 'Choose a finite point in the visible world.';
  const basis = input.aimBasis,
    actor = entityGet(world.entities, scope.actorId);
  if (!basis || !actor) return 'Choose a displayed body, surface or solid shape.';
  if (input.targetId) {
    const target = entityGet(world.entities, input.targetId);
    if (!target || !seesEntity(world, actor, target))
      return 'Choose a point whose subject is still in view.';
    if (basis.bodyReference && basis.bodyReference !== entityBodyReference(scopeKey(scope), target))
      return 'That body changed. Choose a new point.';
    if (target.actor && !basis.bodyReference) return 'Choose the current displayed body.';
    return;
  }
  if (basis.bodyReference) return 'Choose the body belonging to this point.';
  const layout = spatialMap(world).spatial;
  const id = basis.surfaceId ?? basis.shapeId;
  if (!id || !layout) return 'Choose a displayed surface or solid shape.';
  const surface = layout.surfaces.find((candidate) => candidate.id === id);
  if (surface) {
    const epsilon = SPATIAL_LIMITS.supportTolerance;
    const top = surfaceHeight(surface, point.x, point.z);
    if (
      point.x >= surface.minX - epsilon &&
      point.x <= surface.maxX + epsilon &&
      point.z >= surface.minZ - epsilon &&
      point.z <= surface.maxZ + epsilon &&
      point.y <= top + epsilon &&
      point.y >= Math.min(surface.solidBase ?? top - surface.thickness, top) - epsilon
    )
      return;
  }
  const blocker = layout.blockers.find((candidate) => candidate.id === id),
    epsilon = SPATIAL_LIMITS.supportTolerance;
  if (
    blocker &&
    (blocker.boxes ?? [blocker.bounds]).some((bounds) =>
      ['x', 'y', 'z'].every((axis) => {
        const key = axis as keyof typeof point;
        return point[key] >= bounds.min[key] - epsilon && point[key] <= bounds.max[key] + epsilon;
      }),
    )
  )
    return;
  return 'That displayed shape changed. Choose a new point.';
}
