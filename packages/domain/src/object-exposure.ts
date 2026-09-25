import { current, isDraft } from 'immer';
import { bodyProfile, spatialMap } from './spatial-state.js';
import { spatialCandidates } from './spatial.js';
import { visionQuery, visionRadius } from './perception.js';
import type { Entity, Position, WorldState } from './types.js';

type Target = { id: string; position: Position; height: number };
type Observer = { position: Position; eye: number; radius: number; ids: string[] };
type Index = {
  targets: Target[];
  near: ReturnType<typeof spatialCandidates<Target>>;
  observers: Map<string, Observer>;
};
const indices = new WeakMap<WorldState['map'], Index>();
/** Static objects usually outnumber moving actors. Reuse their exact exposure set across
 * numeric need/activity changes, but never across movement, shape, geometry or sense changes.
 * This stores IDs, not stale entity descriptions. Cache misses preserve the original query/order.
 * docs/performance.md#simulation-cpu-and-growing-history
 */
export function objectExposureQuery(
  world: WorldState,
  targets: Target[],
): (actor: Entity) => string[] {
  const map = spatialMap(world);
  const reusable = Object.isFrozen(map) && targets.every((t) => Object.isFrozen(t.position));
  let index = reusable ? indices.get(map) : undefined;
  if (
    !index ||
    index.targets.length !== targets.length ||
    targets.some((t, i) => {
      const previous = index!.targets[i];
      return (
        previous?.id !== t.id || previous.position !== t.position || previous.height !== t.height
      );
    })
  ) {
    const geometry = targets.map(({ id, position, height }) => ({ id, position, height }));
    index = { targets: geometry, near: spatialCandidates(geometry), observers: new Map() };
    if (reusable) indices.set(map, index);
  }
  const prepared = index;
  return (actor) => {
    const position = isDraft(actor.position) ? current(actor.position) : actor.position;
    const eye = bodyProfile(actor).eyeHeight,
      radius = visionRadius(world, actor);
    const cache = reusable && Object.isFrozen(position) ? prepared.observers : undefined;
    const previous = cache?.get(actor.id);
    if (previous?.position === position && previous.eye === eye && previous.radius === radius)
      return previous.ids;
    const sees = visionQuery(world, actor);
    const ids = prepared
      .near(position, radius)
      .filter(sees)
      .map((target) => target.id);
    if (cache && (cache.has(actor.id) || cache.size < 256))
      cache.set(actor.id, { position, eye, radius, ids: Object.freeze(ids) as string[] });
    return ids;
  };
}
