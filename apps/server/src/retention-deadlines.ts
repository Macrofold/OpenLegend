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
const emptyActors: Record<string, TemporalActorHistory> = Object.freeze({});
const byPolicy = new WeakMap<
  Policy,
  {
    recent: DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>;
    accounts: DerivedOwnerIndex<TemporalActorHistory, number, DeadlineIndex>;
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
      recent: make((actor) =>
        actor.maintenanceDue ||
        actor.bytes > policy.recent.maxBytes ||
        actor.count > policy.recent.maxChanges
          ? 0
          : (actor.nextDue ?? Infinity),
      ),
      accounts: make((actor) =>
        !!actor.individualRepairs?.length ||
        !actor.accounts ||
        (['optional', 'required', 'speech'] as const).some(
          (pool) =>
            actor.accounts![pool].bytes > policy[pool].maxBytes ||
            actor.accounts![pool].count > policy[pool].maxRecords,
        )
          ? 0
          : (actor.accounts.nextDue ?? Infinity),
      ),
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
/** Fair bounded preparation over the same native deadline index. Cursors select
 * service order only; they retain neither a world snapshot nor personal content,
 * and need no persistence. A failed/still-due slice cannot starve later actors. */
export class RetentionActorSelection {
  private static readonly maximumActors = 32;
  private worldId?: string;
  private after: Partial<Record<'recent' | 'accounts', string>> = {};
  select(world: WorldState, kind: 'recent' | 'accounts'): string[] {
    if (this.worldId !== world.id) {
      this.worldId = world.id;
      this.after = {};
    }
    const tree = indexes(world)[kind].read(actors(world)),
      threshold = -world.simTime,
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
