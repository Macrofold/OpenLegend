import { bodyProfile, spatialMap, worldPosition } from './spatial-state.js';
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
const samePoint = (a: Position, b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;
/** Retain exact object exposures outside changed regions. Copy geometry inputs so edits,
 * movement and branch/recovery replay cannot mutate a cached dependency in place.
 * IDs preserve root order; description/recognition remains with its existing owner.
 * docs/performance.md#simulation-cpu-and-growing-history */
export function objectExposureQuery(
  world: WorldState,
  targets: Target[],
): (actor: Entity) => string[] {
  const map = spatialMap(world);
  const reusable = Object.isFrozen(map);
  let index = reusable ? indices.get(map) : undefined;
  const same =
    index &&
    index.targets.length === targets.length &&
    targets.every((t, i) => {
      const old = index!.targets[i]!;
      return old.id === t.id && samePoint(old.position, t.position) && old.height === t.height;
    });
  if (!same) {
    const previous = new Map(index?.targets.map((t) => [t.id, t]));
    const changed: Target[] = [];
    for (const target of targets) {
      const old = previous.get(target.id);
      if (!old || !samePoint(old.position, target.position) || old.height !== target.height) {
        changed.push(target);
        if (old) changed.push(old);
      }
      previous.delete(target.id);
    }
    changed.push(...previous.values());
    const nearChanges = spatialCandidates(changed);
    // A yielded phase or world fork can still be using the previous index.
    const observers = new Map(index?.observers);
    // Reordering roots also reorders the output, even when no transform changed.
    const order = new Map(index?.targets.map((target, i) => [target.id, i]));
    let last = -1,
      orderChanged = false;
    for (const target of targets) {
      const rank = order.get(target.id);
      if (rank === undefined) continue;
      if (rank < last) orderChanged = true;
      last = rank;
    }
    for (const [id, observer] of observers)
      if (
        orderChanged ||
        nearChanges(observer.position, observer.radius).some(
          (t) =>
            Math.hypot(
              t.position.x - observer.position.x,
              t.position.y - observer.position.y,
              t.position.z - observer.position.z,
            ) <= observer.radius,
        )
      )
        observers.delete(id);
    const geometry = targets.map(({ id, position, height }) => ({
      id,
      position: { x: position.x, y: position.y, z: position.z },
      height,
    }));
    index = { targets: geometry, near: spatialCandidates(geometry), observers };
    if (reusable) indices.set(map, index);
  }
  const prepared = index!;
  return (actor) => {
    const position = worldPosition(actor);
    const eye = bodyProfile(actor).eyeHeight,
      radius = visionRadius(world, actor);
    const cache = reusable ? prepared.observers : undefined;
    const previous = cache?.get(actor.id);
    if (
      previous &&
      samePoint(previous.position, position) &&
      previous.eye === eye &&
      previous.radius === radius
    )
      return previous.ids;
    const sees = visionQuery(world, actor);
    const ids = prepared
      .near(position, radius)
      .filter(sees)
      .map((target) => target.id);
    if (cache && (cache.has(actor.id) || cache.size < 256))
      cache.set(actor.id, {
        position: { x: position.x, y: position.y, z: position.z },
        eye,
        radius,
        ids: Object.freeze(ids) as string[],
      });
    return ids;
  };
}
