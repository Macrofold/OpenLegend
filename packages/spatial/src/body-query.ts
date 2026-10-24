import type { BodyProfile, Bounds3, FinitePanel, WalkableSurface, WorldPoint } from './types.js';

/** A query volume, not a new locomotion/body policy. */
export interface RoundVolume {
  radius: number;
  height: number;
  shape?: 'cylinder';
}

export interface CollisionSolid {
  bounds: Bounds3;
  surface?: WalkableSurface;
  panel?: FinitePanel;
  boxes?: readonly Bounds3[];
}
export type BodySweep = (
  solid: CollisionSolid,
  from: WorldPoint,
  to: WorldPoint,
  body: RoundVolume,
) => number | undefined;
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
  return solid.boxes
    ? solid.boxes.some((bounds) => sweep!({ bounds }, from, to, body) !== undefined)
    : sweep(solid, from, to, body) !== undefined;
}

/** First contact in the normalized segment, through the same native collision owner.
 * Undefined means no obstruction; a starting penetration has fraction zero.
 */
export function bodySweepFraction(
  solid: CollisionSolid,
  from: WorldPoint,
  to: WorldPoint,
  body: BodyProfile,
): number | undefined {
  if (!sweep) throw new Error('Initialize the spatial collision runtime before creating a world.');
  if (!solid.boxes) return sweep(solid, from, to, body);
  let first: number | undefined;
  for (const bounds of solid.boxes) {
    const hit = sweep({ bounds }, from, to, body);
    if (hit !== undefined && (first === undefined || hit < first)) first = hit;
  }
  return first;
}

/** Exact upright disk/headroom clearance through the same native shape owner. */
export function cylinderIntersects(
  solid: CollisionSolid,
  foot: WorldPoint,
  radius: number,
  height: number,
): boolean {
  if (!sweep) throw new Error('Initialize the spatial collision runtime before querying geometry.');
  const body: RoundVolume = { radius, height, shape: 'cylinder' };
  return solid.boxes
    ? solid.boxes.some((bounds) => sweep!({ bounds }, foot, foot, body) !== undefined)
    : sweep(solid, foot, foot, body) !== undefined;
}
