import {
  DerivedOwnerIndex,
  objectIndexSet,
  objectIndexEntriesAtLeast,
  selectedTemporalPolicy,
  type ObjectIndexNode,
  type TemporalActorHistory,
  type WorldState,
} from '@open-legend/domain';

type Policy = ReturnType<typeof selectedTemporalPolicy>;
type DeadlineIndex = ObjectIndexNode<number> | undefined;
export type RecentRetentionHeader = Pick<
  TemporalActorHistory,
  'maintenanceDue' | 'bytes' | 'count' | 'nextDue'
>;
export const RETENTION_MIN_DELAY_MS = 250;
export function recentRetentionDeadline(actor: RecentRetentionHeader, policy: Policy['recent']) {
  return actor.maintenanceDue || actor.bytes > policy.maxBytes || actor.count > policy.maxChanges
    ? 0
    : (actor.nextDue ?? Infinity);
}
export function supportRetentionDeadline(actor: Pick<TemporalActorHistory, 'accounts'>): number {
  return actor.accounts &&
    actor.accounts.supportDirtyRevision !== actor.accounts.supportSettledRevision
    ? 0
    : Infinity;
}
export function knowledgeRetentionDeadline(actor: Pick<TemporalActorHistory, 'accounts'>): number {
  return actor.accounts?.knowledgeDue ?? Infinity;
}
export type RetentionWorkKind = 'recent' | 'accounts' | 'knowledge' | 'support';
const emptyActors: Record<string, TemporalActorHistory> = Object.freeze({});
const byPolicy = new WeakMap<
  Policy,
  {
    recent: DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>;
    accounts: DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>;
    knowledge: DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>;
    support: DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>;
  }
>();
function indexes(world: WorldState) {
  const policy = selectedTemporalPolicy(world);
  let indexes = byPolicy.get(policy);
  if (!indexes) {
    const make = (deadline: (actor: TemporalActorHistory) => number) =>
      new DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>(
        deadline,
        () => undefined,
        (tree, id, _before, after) =>
          objectIndexSet(
            tree,
            id,
            after !== undefined && Number.isFinite(after) ? -after : undefined,
          ),
      );
    indexes = {
      recent: make((actor) => recentRetentionDeadline(actor, policy.recent)),
      // Required admission already marks nextDue at its early maintenance target.
      // Protected grants above that target must not schedule empty SQL forever.
      accounts: make((actor) =>
        !actor.accounts ||
        (['optional', 'required', 'speech'] as const).some(
          (pool) =>
            actor.accounts![pool].bytes > policy[pool].maxBytes ||
            actor.accounts![pool].count > policy[pool].maxRecords,
        )
          ? 0
          : (actor.accounts.nextDue ?? Infinity),
      ),
      knowledge: make(knowledgeRetentionDeadline),
      support: make(supportRetentionDeadline),
    };
    byPolicy.set(policy, indexes);
  }
  return indexes;
}
const actors = (world: WorldState) => world.experience?.temporal?.actors ?? emptyActors;

/** Existing immutable-owner lineage updates only changed actor summaries. These
 * rebuildable deadlines contain scalars, never account bodies or permissions. */
export function nextRecentRetentionAt(world: WorldState): number | null {
  const tree = indexes(world).recent.read(actors(world));
  return tree ? -tree.maximum : null;
}
export function nextAccountRetentionAt(world: WorldState): number | null {
  const tree = indexes(world).accounts.read(actors(world));
  return tree ? -tree.maximum : null;
}
export function nextKnowledgeRetentionAt(world: WorldState): number | null {
  const tree = indexes(world).knowledge.read(actors(world));
  return tree ? -tree.maximum : null;
}
export function nextSupportRetentionAt(world: WorldState): number | null {
  const tree = indexes(world).support.read(actors(world));
  return tree ? -tree.maximum : null;
}
/** Fair bounded preparation over the same native deadline index. Cursors select
 * service order only; they retain neither a world snapshot nor personal content,
 * and need no persistence. A failed/still-due slice cannot starve later actors. */
export class RetentionActorSelection {
  private static readonly maximumActors = 32;
  private worldId?: string;
  private after: Partial<Record<RetentionWorkKind, string>> = {};
  select(world: WorldState, kind: RetentionWorkKind): string[] {
    return this.selectIndex(
      world.id,
      kind,
      indexes(world)[kind].read(actors(world)),
      world.simTime,
    );
  }
  /** The native application has the same actual scalar headers and deadline
   * tree. Reuse the bounded fair traversal without manufacturing a world. */
  selectIndex(worldId: string, kind: RetentionWorkKind, tree: DeadlineIndex, at: number): string[] {
    if (this.worldId !== worldId) {
      this.worldId = worldId;
      this.after = {};
    }
    const threshold = -at,
      after = this.after[kind],
      selected: string[] = [];
    for (const [id] of objectIndexEntriesAtLeast(tree, threshold, after)) {
      selected.push(id);
      if (selected.length === RetentionActorSelection.maximumActors) break;
    }
    if (after !== undefined && selected.length < RetentionActorSelection.maximumActors)
      for (const [id] of objectIndexEntriesAtLeast(tree, threshold)) {
        if (id > after) break;
        selected.push(id);
        if (selected.length === RetentionActorSelection.maximumActors) break;
      }
    if (selected.length) this.after[kind] = selected.at(-1)!;
    return selected;
  }
}
