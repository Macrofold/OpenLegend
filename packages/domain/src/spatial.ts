import type { Position, WorldState } from './types.js';

export function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
export function isWalkable(world: WorldState, position: Position): boolean {
  if (
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.z) ||
    position.x < 0 ||
    position.z < 0 ||
    position.x > world.map.width - 1 ||
    position.z > world.map.height - 1
  )
    return false;
  const tile = world.map.tiles[Math.round(position.z)]?.[Math.round(position.x)];
  return tile === 'grass' || tile === 'sand';
}
export function hasLineOfSight(world: WorldState, from: Position, to: Position): boolean {
  const steps = Math.max(1, Math.ceil(distance(from, to) * 3));
  for (let i = 1; i < steps; i++) {
    const x = Math.round(from.x + ((to.x - from.x) * i) / steps);
    const z = Math.round(from.z + ((to.z - from.z) * i) / steps);
    if (world.map.tiles[z]?.[x] === 'rock') return false;
  }
  return true;
}
/** Bounded breadth-first grid navigation. null means unreachable; [] means already there. */
export function findPath(world: WorldState, from: Position, to: Position): Position[] | null {
  if (!isWalkable(world, from) || !isWalkable(world, to)) return null;
  const start = { x: Math.round(from.x), z: Math.round(from.z) };
  const goal = { x: Math.round(to.x), z: Math.round(to.z) };
  const key = (p: Position) => `${p.x},${p.z}`;
  const queue: Position[] = [start];
  const parents = new Map<string, Position | null>([[key(start), null]]);
  for (let index = 0; index < queue.length && index < world.map.width * world.map.height; index++) {
    const current = queue[index]!;
    if (current.x === goal.x && current.z === goal.z) {
      const path: Position[] = [];
      let step: Position | null = current;
      while (step && key(step) !== key(start)) {
        path.unshift(step);
        step = parents.get(key(step)) ?? null;
      }
      // The last point retains the requested sub-tile position.
      if (path.length) path[path.length - 1] = { ...to };
      else if (distance(from, to) > 0.01) path.push({ ...to });
      return path;
    }
    for (const [dx, dz] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const next = { x: current.x + dx!, z: current.z + dz! };
      if (isWalkable(world, next) && !parents.has(key(next))) {
        parents.set(key(next), current);
        queue.push(next);
      }
    }
  }
  return null;
}
