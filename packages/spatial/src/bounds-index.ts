import type { Bounds3 } from './types.js';

interface Entry<T> {
  value: T;
  bounds: Bounds3;
}
interface Node<T> {
  bounds: Bounds3;
  entries?: Entry<T>[];
  children?: [Node<T>, Node<T>];
}
const axes = ['x', 'y', 'z'] as const;

/** Immutable broad phase over full extents, including stacked floors and large slabs.
 * A static tree avoids inserting a terrain slab into thousands of spatial-hash cells.
 * Exact shape tests still decide hits; this index may only discard disjoint bounds.
 */
export class BoundsIndex<T> {
  private root?: Node<T>;

  constructor(entries: Entry<T>[]) {
    const build = (items: Entry<T>[]): Node<T> => {
      const bounds: Bounds3 = {
        min: { ...items[0]!.bounds.min },
        max: { ...items[0]!.bounds.max },
      };
      for (const { bounds: b } of items)
        for (const axis of axes) {
          bounds.min[axis] = Math.min(bounds.min[axis], b.min[axis]);
          bounds.max[axis] = Math.max(bounds.max[axis], b.max[axis]);
        }
      if (items.length <= 4) return { bounds, entries: items };
      const axis = axes.reduce((best, next) =>
        bounds.max[next] - bounds.min[next] > bounds.max[best] - bounds.min[best] ? next : best,
      );
      items.sort(
        (a, b) => a.bounds.min[axis] + a.bounds.max[axis] - b.bounds.min[axis] - b.bounds.max[axis],
      );
      const middle = items.length >>> 1;
      return { bounds, children: [build(items.slice(0, middle)), build(items.slice(middle))] };
    };
    if (entries.length) this.root = build([...entries]);
  }

  /** Return true to stop after a decisive hit, without allocating/sorting every intersection. */
  visit(intersects: (bounds: Bounds3) => boolean, visit: (value: T) => boolean): boolean {
    const walk = (node: Node<T>): boolean => {
      if (!intersects(node.bounds)) return false;
      if (node.entries) {
        for (const entry of node.entries)
          if (intersects(entry.bounds) && visit(entry.value)) return true;
        return false;
      }
      return walk(node.children![0]) || walk(node.children![1]);
    };
    return this.root ? walk(this.root) : false;
  }
}
