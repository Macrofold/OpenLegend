import { objectIndexSet, type ObjectIndexNode } from '@open-legend/domain';
import type { NativeChangedRows } from '@open-legend/native-simulation';
import {
  RetentionActorSelection,
  knowledgeRetentionDeadline,
  recentRetentionDeadline,
  supportRetentionDeadline,
} from './retention-deadlines.js';

/** Derived scheduling metadata contains cleanup deadlines from actual headers.
 * Initial complete headers are visited once; accepted edits update exact keys.
 * No page, account body or mutable world is retained for recurring selection. */
export class NativeRetention {
  private recent?: ObjectIndexNode<number>;
  private support?: ObjectIndexNode<number>;
  private knowledge?: ObjectIndexNode<number>;
  private readonly select = new RetentionActorSelection();
  constructor(
    readonly worldId: string,
    private readonly policy: Parameters<typeof recentRetentionDeadline>[1],
    rows: readonly { readonly slot: string; readonly payload: string }[],
  ) {
    for (const row of rows) {
      const header = JSON.parse(row.payload);
      this.recent = this.add(this.recent, row.slot, recentRetentionDeadline(header, this.policy));
      this.support = this.add(this.support, row.slot, supportRetentionDeadline(header));
      this.knowledge = this.add(this.knowledge, row.slot, knowledgeRetentionDeadline(header));
    }
  }
  private add(tree: ObjectIndexNode<number> | undefined, id: string, deadline: number) {
    return objectIndexSet(tree, id, Number.isFinite(deadline) ? -deadline : undefined);
  }
  get at(): number | undefined {
    const at = Math.min(
      this.recent ? -this.recent.maximum : Infinity,
      this.support ? -this.support.maximum : Infinity,
      this.knowledge ? -this.knowledge.maximum : Infinity,
    );
    return Number.isFinite(at) ? at : undefined;
  }
  actors(kind: 'recent' | 'knowledge' | 'support', at: number): string[] {
    return this.select.selectIndex(this.worldId, kind, this[kind], at);
  }
  /** Path-copy admission happens before Ready; acceptance only swaps a pointer. */
  prepare(changes: NativeChangedRows): () => void {
    const beforeRecent = this.recent,
      beforeKnowledge = this.knowledge,
      beforeSupport = this.support;
    let recent = beforeRecent,
      knowledge = beforeKnowledge,
      support = beforeSupport;
    for (const row of changes.writes['mind_temporal_actors'] ?? []) {
      const header = JSON.parse(row.payload);
      recent = this.add(recent, row.slot, recentRetentionDeadline(header, this.policy));
      support = this.add(support, row.slot, supportRetentionDeadline(header));
      knowledge = this.add(knowledge, row.slot, knowledgeRetentionDeadline(header));
    }
    for (const id of changes.deletes['mind_temporal_actors'] ?? []) {
      const actor = (JSON.parse(id) as string[]).at(-1)!;
      recent = objectIndexSet(recent, actor, undefined);
      support = objectIndexSet(support, actor, undefined);
      knowledge = objectIndexSet(knowledge, actor, undefined);
    }
    if (
      changes.deletes['experience_state']?.length ||
      changes.deletes['mind_temporal_state']?.length
    )
      recent = support = knowledge = undefined;
    return () => {
      if (
        this.recent !== beforeRecent ||
        this.support !== beforeSupport ||
        this.knowledge !== beforeKnowledge
      )
        throw new Error('Native retention preparation no longer follows its accepted headers.');
      this.recent = recent;
      this.support = support;
      this.knowledge = knowledge;
    };
  }
}
