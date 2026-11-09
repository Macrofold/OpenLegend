import { objectIndexSet, type ObjectIndexNode } from '@open-legend/domain';
import type { NativeChangedRows } from '@open-legend/native-simulation';
import {
  RetentionActorSelection,
  recentRetentionDeadline,
  type RecentRetentionHeader,
} from './retention-deadlines.js';

/** Derived scheduling metadata contains one deadline per actual actor header.
 * Initial complete headers are visited once; accepted edits update exact keys.
 * No page, account body or mutable world is retained for recurring selection. */
export class NativeRecentRetention {
  private tree?: ObjectIndexNode<number>;
  private readonly select = new RetentionActorSelection();
  constructor(
    readonly worldId: string,
    private readonly policy: Parameters<typeof recentRetentionDeadline>[1],
    rows: readonly { readonly slot: string; readonly payload: string }[],
  ) {
    for (const row of rows) this.tree = this.add(this.tree, row.slot, row.payload);
  }
  private add(tree: ObjectIndexNode<number> | undefined, id: string, payload: string) {
    const deadline = recentRetentionDeadline(
      JSON.parse(payload) as RecentRetentionHeader,
      this.policy,
    );
    return objectIndexSet(tree, id, Number.isFinite(deadline) ? -deadline : undefined);
  }
  get at(): number | undefined {
    return this.tree ? -this.tree.maximum : undefined;
  }
  actors(at: number): string[] {
    return this.select.selectIndex(this.worldId, 'recent', this.tree, at);
  }
  /** Path-copy admission happens before Ready; acceptance only swaps a pointer. */
  prepare(changes: NativeChangedRows): () => void {
    const before = this.tree;
    let next = before;
    for (const row of changes.writes['mind_temporal_actors'] ?? [])
      next = this.add(next, row.slot, row.payload);
    for (const id of changes.deletes['mind_temporal_actors'] ?? [])
      next = objectIndexSet(next, (JSON.parse(id) as string[]).at(-1)!, undefined);
    if (
      changes.deletes['experience_state']?.length ||
      changes.deletes['mind_temporal_state']?.length
    )
      next = undefined;
    return () => {
      if (this.tree !== before)
        throw new Error('Native retention preparation no longer follows its accepted headers.');
      this.tree = next;
    };
  }
}
