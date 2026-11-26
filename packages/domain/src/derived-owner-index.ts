import { recordMapChangesBetween } from './draft.js';
import { objectIndexGet, objectIndexSet, type ObjectIndexNode } from './object-index.js';

/** Rebuildable summaries of immutable owned records. Missing lineage rebuilds;
 * no world, draft or record body is retained by the index itself. */
export class DerivedOwnerIndex<T, S, A> {
  private readonly cached = new WeakMap<object, { owners?: ObjectIndexNode<S>; aggregate: A }>();
  private latest?: WeakRef<object>;
  constructor(
    private readonly summarize: (value: T, owner: string) => S,
    private readonly empty: () => A,
    private readonly update: (
      aggregate: A,
      owner: string,
      before: S | undefined,
      after: S | undefined,
    ) => A,
  ) {}
  read(source: Readonly<Record<string, T>>): A {
    const immutable = Object.isFrozen(source);
    const cached = immutable ? this.cached.get(source) : undefined;
    if (cached) return cached.aggregate;
    const previous = this.latest?.deref();
    const before = immutable && previous ? this.cached.get(previous) : undefined;
    const changed = before && previous ? recordMapChangesBetween(previous, source) : undefined;
    let aggregate = changed ? before!.aggregate : this.empty();
    let owners = changed ? before!.owners : undefined;
    for (const id of changed ?? Object.keys(source)) {
      const old = objectIndexGet(owners, id);
      const next = Object.hasOwn(source, id) ? this.summarize(source[id]!, id) : undefined;
      aggregate = this.update(aggregate, id, old, next);
      owners = objectIndexSet(owners, id, next);
    }
    if (immutable) {
      this.cached.set(source, { owners, aggregate });
      this.latest = new WeakRef(source);
    }
    return aggregate;
  }
}
