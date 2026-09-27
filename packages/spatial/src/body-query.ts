import type { BodyProfile, Bounds3, WalkableSurface, WorldPoint } from './types.js';

export interface CollisionSolid {
  bounds: Bounds3;
  surface?: WalkableSurface;
}
export type BodySweep = (
  solid: CollisionSolid,
  from: WorldPoint,
  to: WorldPoint,
  body: BodyProfile,
) => boolean;
let sweep: BodySweep | undefined;
/** Host initializes the query implementation once. The browser never imports its WASM.
 * archive/07-technical-architecture/spatial-world-runtime.md#collision-authority
 */
export function installBodySweep(query: BodySweep): void {
  sweep = query;
}
export function bodyIntersects(
  solid: CollisionSolid,
  from: WorldPoint,
  to: WorldPoint,
  body: BodyProfile,
): boolean {
  if (!sweep) throw new Error('Initialize the spatial collision runtime before creating a world.');
  return sweep(solid, from, to, body);
}
