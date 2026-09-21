import type { Entity, Position, WorldState } from './types.js';
import { current as snapshot, isDraft } from 'immer';

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
  const map = isDraft(world.map) ? snapshot(world.map) : world.map;
  let walkable = navigation.get(map);
  const width = map.width,
    size = width * map.height;
  if (!walkable) {
    walkable = new Uint8Array(size);
    for (let z = 0; z < map.height; z++)
      for (let x = 0; x < width; x++) {
        const tile = map.tiles[z]?.[x];
        walkable[z * width + x] = tile === 'grass' || tile === 'sand' ? 1 : 0;
      }
    navigation.set(map, walkable);
  }
  const start = Math.round(from.z) * width + Math.round(from.x);
  const goal = Math.round(to.z) * width + Math.round(to.x);
  const queue = new Int32Array(size),
    parents = new Int32Array(size).fill(-1);
  queue[0] = start;
  parents[start] = start;
  let tail = 1;
  for (let index = 0; index < tail; index++) {
    const current = queue[index]!;
    if (current === goal) {
      const path: Position[] = [];
      for (let step = current; step !== start; step = parents[step]!) {
        path.push({ x: step % width, z: Math.floor(step / width) });
      }
      path.reverse();
      // The last point retains the requested sub-tile position.
      if (path.length) path[path.length - 1] = { ...to };
      else if (distance(from, to) > 0.01) path.push({ ...to });
      return path;
    }
    // Keep north/east/south/west tie-breaking identical to native navigation.
    for (const next of [
      current - width,
      current % width < width - 1 ? current + 1 : -1,
      current + width,
      current % width > 0 ? current - 1 : -1,
    ]) {
      if (next >= 0 && next < size && walkable[next] && parents[next] === -1) {
        parents[next] = current;
        queue[tail++] = next;
      }
    }
  }
  return null;
}

const navigation = new WeakMap<WorldState['map'], Uint8Array>();

/** Ephemeral candidate index; callers rebuild after movement, then apply exact visibility rules. */
export function spatialCandidates(entities: Entity[], cellSize = 28) {
  const cells = new Map<string, { entity: Entity; order: number }[]>();
  entities.forEach((entity, order) => {
    const key = `${Math.floor(entity.position.x / cellSize)},${Math.floor(entity.position.z / cellSize)}`;
    let cell = cells.get(key);
    if (!cell) cells.set(key, (cell = []));
    cell.push({ entity, order });
  });
  return (position: Position, radius: number): Entity[] => {
    const found: { entity: Entity; order: number }[] = [];
    for (
      let x = Math.floor((position.x - radius) / cellSize);
      x <= Math.floor((position.x + radius) / cellSize);
      x++
    )
      for (
        let z = Math.floor((position.z - radius) / cellSize);
        z <= Math.floor((position.z + radius) / cellSize);
        z++
      )
        found.push(...(cells.get(`${x},${z}`) ?? []));
    // Keep the original event/observer order, including RNG-independent audience ordering.
    return found.sort((a, b) => a.order - b.order).map(({ entity }) => entity);
  };
}

const entityIndexes = new WeakMap<WorldState['entities'], ReturnType<typeof spatialCandidates>>();
/** Immutable snapshots share one index; mutable domain drafts must rebuild after movement. */
export function nearbyEntities(world: WorldState, position: Position, radius: number): Entity[] {
  let index = isDraft(world.entities) ? undefined : entityIndexes.get(world.entities);
  if (!index) {
    index = spatialCandidates(Object.values(world.entities));
    if (!isDraft(world.entities)) entityIndexes.set(world.entities, index);
  }
  return index(position, radius);
}
