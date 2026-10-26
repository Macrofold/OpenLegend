import type { Bounds3 } from './types.js';

interface Entry<T> {
  value: T;
  bounds: Bounds3;
}
interface Node<T> {
  bounds: Bounds3;
  count: number;
  entries?: Entry<T>[];
  children?: [Node<T>, Node<T>];
}
const axes = ['x', 'y', 'z'] as const;

export interface BoundsQueryCursor {
  /** Tree paths, meaningful only against the same immutable index. */
  pending: number[][];
  offset: number;
  /** The last pending leaf was already charged/accepted before this page ended. */
  leaf?: boolean;
}
export interface BoundsCoverRow<T> {
  key: string;
  bounds: Bounds3;
  count: number;
  /** Only complete leaf contents; an aggregate never claims hidden member detail. */
  values?: readonly T[];
}

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
      const centers: Bounds3 = {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity },
      };
      for (const { bounds: b } of items)
        for (const axis of axes) {
          bounds.min[axis] = Math.min(bounds.min[axis], b.min[axis]);
          bounds.max[axis] = Math.max(bounds.max[axis], b.max[axis]);
          const center = b.min[axis] + b.max[axis];
          centers.min[axis] = Math.min(centers.min[axis], center);
          centers.max[axis] = Math.max(centers.max[axis], center);
        }
      if (items.length <= 4) return { bounds, count: items.length, entries: items };
      // Wide overlapping decks may vary only in Y. Split their centers, not slab width.
      const axis = axes.reduce((best, next) =>
        centers.max[next] - centers.min[next] > centers.max[best] - centers.min[best] ? next : best,
      );
      items.sort(
        (a, b) => a.bounds.min[axis] + a.bounds.max[axis] - b.bounds.min[axis] - b.bounds.max[axis],
      );
      const middle = items.length >>> 1;
      return { bounds, count: items.length, children: [build(items.slice(0, middle)), build(items.slice(middle))] };
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

  /** A disjoint complete cover even when expansion is exhausted. Counts and bounds
   * describe presence; they do not disclose the members of an unexpanded region. */
  cover(maxRows: number, maxVisits: number): { rows: BoundsCoverRow<T>[]; visited: number } {
    if (!this.root || maxRows < 1 || maxVisits < 1) return { rows: [], visited: 0 };
    const frontier = [{ node: this.root, key: '' }];
    let visited = 1;
    for (let i = 0; i < frontier.length && frontier.length < maxRows; i++) {
      const entry = frontier[i]!;
      if (!entry.node.children || visited + 2 > maxVisits) continue;
      frontier.splice(i, 1,
        { node: entry.node.children[0], key: `${entry.key}0` },
        { node: entry.node.children[1], key: `${entry.key}1` });
      visited += 2;
      i--;
    }
    return {
      rows: frontier.map(({ node, key }) => ({ key, bounds: node.bounds, count: node.count,
        ...(node.entries ? { values: node.entries.map((entry) => entry.value) } : {}) })),
      visited,
    };
  }

  /** Bound tree visits AND entries examined. A partial answer never proves absence.
   * A cursor is tied to this exact immutable tree by its owning caller. */
  query(intersects: (bounds: Bounds3) => boolean, allowance: number, cursor?: BoundsQueryCursor): {
    values: T[]; visited: number; status: 'complete' | 'partial'; cursor?: BoundsQueryCursor;
  } {
    const pending = cursor ? cursor.pending.map((path) => [...path]) : (this.root ? [[]] : []);
    let offset = cursor?.offset ?? 0, visited = 0, enteredLeaf = cursor?.leaf ?? false;
    const values: T[] = [];
    while (pending.length && visited < allowance) {
      const path = pending.pop()!;
      let node = this.root;
      for (const part of path) node = node?.children?.[part as 0 | 1];
      if (!node) throw new Error('A spatial cursor does not belong to this index.');
      if (!enteredLeaf) visited++;
      if (!enteredLeaf && !intersects(node.bounds)) { offset = 0; continue; }
      if (node.children) {
        pending.push([...path, 1], [...path, 0]);
        enteredLeaf = false;
        continue;
      }
      const entries = node.entries!;
      while (offset < entries.length && visited < allowance) {
        const entry = entries[offset++]!;
        visited++;
        if (intersects(entry.bounds)) values.push(entry.value);
      }
      if (offset < entries.length) { pending.push(path); enteredLeaf = true; break; }
      offset = 0;
      enteredLeaf = false;
    }
    return pending.length
      ? { values, visited, status: 'partial', cursor: { pending, offset, ...(enteredLeaf ? { leaf: true } : {}) } }
      : { values, visited, status: 'complete' };
  }

  region(key: string, allowance: number, cursor?: BoundsQueryCursor) {
    if (!/^[01]*$/.test(key) || key.length > 64) throw new Error('Invalid spatial region.');
    return this.query(() => true, allowance, cursor ?? { pending: [[...key].map(Number)], offset: 0 });
  }
}
