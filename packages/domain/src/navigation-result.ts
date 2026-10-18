import {
  canWalkSegment,
  distance3D,
  finitePoint,
  SPATIAL_LIMITS,
  type BodyProfile,
  type NavigationRequest,
  type NavigationResult,
  type SpatialMap,
} from '@open-legend/spatial';

/** Shared admission of untrusted prepared routes. Preparation grants neither
 * movement nor a partial arrival; both ordinary actions and native refuge
 * comparisons must prove the same complete physical corridor. */
export function navigationResultProblem(
  map: SpatialMap,
  request: NavigationRequest,
  result: NavigationResult,
  profile: BodyProfile,
): string | undefined {
  if (result.status !== 'reached')
    return result.status === 'no-route'
      ? 'no supported route reaches that destination.'
      : result.status === 'unavailable'
        ? 'navigation preparation is unavailable; retry the action later.'
        : result.status === 'budget-exceeded'
          ? 'the route exceeds the current navigation budget.'
          : 'the proposed route does not fit this body or its supporting surfaces.';
  if (!Array.isArray(result.path) || result.path.length > SPATIAL_LIMITS.maxPathPoints)
    return 'navigation returned an invalid route.';
  let previous = request.from;
  for (const point of result.path) {
    if (!finitePoint(point) || !canWalkSegment(map, previous, point, profile))
      return 'the prepared route became physically blocked.';
    previous = point;
  }
  if (
    !request.destinations.some(
      (point) => point.surfaceId === previous.surfaceId && distance3D(point, previous) < 1e-6,
    )
  )
    return 'navigation returned only a partial route.';
  return undefined;
}
