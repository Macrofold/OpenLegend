/** One indexed entry per character: replacing a deadline removes its predecessor,
 * so deferrals cannot accumulate stale heap nodes. These are derived local clocks,
 * never saved authority or another model queue. */
export class DeadlineIndex {
  private readonly heap: Array<{ id: string; at: number }> = [];
  private readonly positions = new Map<string, number>();
  clear(): void {
    this.heap.length = 0;
    this.positions.clear();
  }
  set(id: string, at: number): void {
    const position = this.positions.get(id);
    if (position !== undefined && this.heap[position]?.at === at) return;
    this.delete(id);
    if (!Number.isFinite(at)) return;
    this.positions.set(id, this.heap.length);
    this.heap.push({ id, at });
    this.up(this.heap.length - 1);
  }
  delete(id: string): void {
    const index = this.positions.get(id);
    if (index === undefined) return;
    const last = this.heap.pop()!;
    this.positions.delete(id);
    if (index === this.heap.length) return;
    this.heap[index] = last;
    this.positions.set(last.id, index);
    const moved = this.up(index);
    this.down(moved);
  }
  takeDue(at: number): string[] {
    const ids: string[] = [];
    while (this.heap[0] && this.heap[0]!.at <= at) {
      const id = this.heap[0]!.id;
      this.delete(id);
      ids.push(id);
    }
    return ids;
  }
  private swap(a: number, b: number): void {
    const left = this.heap[a]!,
      right = this.heap[b]!;
    this.heap[a] = right;
    this.heap[b] = left;
    this.positions.set(left.id, b);
    this.positions.set(right.id, a);
  }
  private up(start: number): number {
    let index = start;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent]!.at <= this.heap[index]!.at) break;
      this.swap(parent, index);
      index = parent;
    }
    return index;
  }
  private down(start: number): void {
    let index = start;
    while (index * 2 + 1 < this.heap.length) {
      let next = index * 2 + 1;
      if (next + 1 < this.heap.length && this.heap[next + 1]!.at < this.heap[next]!.at) next++;
      if (this.heap[index]!.at <= this.heap[next]!.at) break;
      this.swap(index, next);
      index = next;
    }
  }
}
