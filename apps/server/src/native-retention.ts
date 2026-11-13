import {
  jsonByteLength,
  objectIndexGet,
  objectIndexSet,
  type ObjectIndexNode,
} from '@open-legend/domain';
import type {
  NativeChangedRows,
  NativeWorld,
  NativeWorldConsumer,
} from '@open-legend/native-simulation';
import { attachNativeConsumer, encodeNativeJson, releaseNativeProduct } from './native-consumer.js';
import {
  RetentionActorSelection,
  accountRetentionDeadline,
  knowledgeRetentionDeadline,
  recentRetentionDeadline,
  supportRetentionDeadline,
  type RetentionWorkKind,
} from './retention-deadlines.js';

type Admission = Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;
type Policy = Parameters<typeof accountRetentionDeadline>[1];
type Row = { readonly slot: string; readonly payload: string };
type Owned<T> = { value: T; guard: NativeWorldConsumer };
type Index = { tree?: ObjectIndexNode<number>; count: number; keyBytes: number };
type Indexes = Record<RetentionWorkKind, Index>;
type Edit = { key: Owned<{ id: string }>; values: Record<RetentionWorkKind, number | undefined> };
export type PreparedNativeRetention = (() => void) & { release(): void };
const kinds = ['recent', 'support', 'knowledge', 'accounts'] as const;
const noChanges: readonly never[] = [];
const nodeBytes = 32 * 8;
const empty = (): Indexes => ({
  recent: { count: 0, keyBytes: 0 },
  support: { count: 0, keyBytes: 0 },
  knowledge: { count: 0, keyBytes: 0 },
  accounts: { count: 0, keyBytes: 0 },
});
const bytes = (indexes: Indexes): number => {
  let result = 5 * 32 * 8;
  for (const kind of kinds) result += indexes[kind].count * nodeBytes + indexes[kind].keyBytes;
  return result;
};
// A tree key originates only in the tiny {id} copy, never a rich SQL header.
// Cover its encoded/decoded UTF-16 backing and both string headers.
const keyBytes = (id: string) => 4 * (jsonByteLength(id) + 7) + 2 * 8 * 8;

function copy<T extends object>(world: Admission, value: T): Owned<T> {
  const encoded = encodeNativeJson(world, value);
  let guard: NativeWorldConsumer | undefined;
  try {
    guard = world.reserveConsumerJson(encoded);
    return { value: JSON.parse(encoded.toString('utf8')) as T, guard };
  } catch (error) {
    guard?.release();
    throw error;
  } finally {
    releaseNativeProduct(encoded);
  }
}
function parse<T, R>(world: Admission, payload: string, consume: (value: T) => R): R {
  const length = Buffer.byteLength(payload),
    carrier = world.reserveConsumerBytes(length + 32 * 8);
  let decoded: NativeWorldConsumer | undefined;
  try {
    const encoded = Buffer.allocUnsafeSlow(length);
    encoded.write(payload);
    decoded = world.reserveConsumerJson(encoded);
    return consume(JSON.parse(payload) as T);
  } finally {
    decoded?.release();
    carrier.release();
  }
}

/** Actual scalar deadlines own small independent metadata snapshots. Persistent
 * AVL branches may be shared by the live and preparing snapshot, both admitted;
 * neither owner retains a Source packet, publication or rich account body.
 * docs/projects/native-simulation-core-tech-design.md#32-candidate-acceptance-and-rollback */
export class NativeRetention {
  private indexes: Indexes;
  private readonly cursors: Partial<Record<RetentionWorkKind, NativeWorldConsumer>> = {};
  private select: RetentionActorSelection | undefined = new RetentionActorSelection();
  private maximumKeyBytes = 0;
  private revision = 0;
  private released = false;
  private constructor(
    private worldOwner: Admission | undefined,
    private configuration: Owned<{ worldId: string; policy: Policy }> | undefined,
    private fixed: NativeWorldConsumer | undefined,
    private snapshot: NativeWorldConsumer | undefined,
    indexes: Indexes,
  ) {
    this.indexes = indexes;
  }

  static capture(
    world: Admission,
    worldId: string,
    policy: Policy,
    rows: readonly Row[],
  ): NativeRetention {
    const fixed = world.reserveConsumerBytes(12 * 32 * 8);
    let configuration: Owned<{ worldId: string; policy: Policy }> | undefined,
      snapshot: NativeWorldConsumer | undefined,
      owner: NativeRetention | undefined;
    try {
      configuration = copy(world, { worldId, policy });
      // Admit the initial five index containers before allocating them.
      snapshot = world.reserveConsumerBytes(5 * 32 * 8);
      owner = new NativeRetention(world, configuration, fixed, snapshot, empty());
      const staged = owner.prepareRows(rows, noChanges, false);
      try {
        staged();
      } finally {
        staged.release();
      }
      return owner;
    } catch (error) {
      if (owner) owner.release();
      else {
        snapshot?.release();
        configuration?.guard.release();
        fixed.release();
      }
      throw error;
    }
  }
  private live(): void {
    if (this.released) throw new Error('Native retention index was released.');
  }
  private get world(): Admission {
    this.live();
    return this.worldOwner!;
  }
  get worldId(): string {
    this.live();
    return this.configuration!.value.worldId;
  }
  get at(): number | undefined {
    this.live();
    let result = Infinity;
    for (const kind of kinds) {
      const tree = this.indexes[kind].tree;
      if (tree) result = Math.min(result, -tree.maximum);
    }
    return Number.isFinite(result) ? result : undefined;
  }

  actors(kind: RetentionWorkKind, at: number): string[] {
    this.live();
    const count = RetentionActorSelection.maximumActors,
      height = this.indexes[kind].tree?.height ?? 0;
    const scratch = this.world.reserveConsumerBytes(
      (height + 4) * 32 * 8 + count * (2 * 8 + this.maximumKeyBytes),
    );
    let cursor: NativeWorldConsumer | undefined, output: Owned<string[]> | undefined;
    try {
      // Selection mutates only its fair operational cursor. Its retained ID
      // remains admitted even if the selected tree is replaced during I/O.
      cursor = this.world.reserveConsumerBytes(this.maximumKeyBytes + 32 * 8);
      const selected = this.select!.selectIndex(this.worldId, kind, this.indexes[kind].tree, at);
      if (selected.length) {
        this.cursors[kind]?.release();
        this.cursors[kind] = cursor;
        cursor = undefined;
      }
      output = copy(this.world, selected);
      const result = attachNativeConsumer(output.value, output.guard);
      output = undefined;
      return result;
    } finally {
      output?.guard.release();
      cursor?.release();
      scratch.release();
    }
  }

  prepare(changes: NativeChangedRows): PreparedNativeRetention {
    this.live();
    return this.prepareRows(
      changes.writes['mind_temporal_actors'] ?? noChanges,
      changes.deletes['mind_temporal_actors'] ?? noChanges,
      !!(
        changes.deletes['experience_state']?.length ||
        changes.deletes['mind_temporal_state']?.length
      ),
    );
  }

  private prepareRows(
    rows: readonly Row[],
    deleted: readonly string[],
    clear: boolean,
  ): PreparedNativeRetention {
    this.live();
    // Changed-key maps, edit scalars, key-copy carriers and callback frames;
    // their bound follows this sparse batch, not world age or account bodies.
    const count = rows.length + deleted.length;
    if (!count && !clear) {
      let frame: NativeWorldConsumer | undefined = this.world.reserveConsumerBytes(3 * 32 * 8);
      const revision = this.revision;
      let consumed = false;
      const release = () => {
        if (consumed) return;
        consumed = true;
        frame?.release();
        frame = undefined;
      };
      const accept = () => {
        if (consumed) throw new Error('Native retention preparation was consumed.');
        this.live();
        if (this.revision !== revision)
          throw new Error('Native retention preparation no longer follows its accepted headers.');
        release();
      };
      return Object.assign(accept, { release });
    }
    let scratch: NativeWorldConsumer | undefined = this.world.reserveConsumerBytes(
      (12 + count * 9) * 32 * 8,
    );
    const edits: Edit[] = [];
    let next: Indexes | undefined,
      prospective: NativeWorldConsumer | undefined,
      maximumKeyBytes = this.maximumKeyBytes,
      consumed = false;
    const revision = this.revision;
    const release = () => {
      if (consumed) return;
      consumed = true;
      for (const edit of edits) edit.key.guard.release();
      edits.length = 0;
      next = undefined;
      prospective?.release();
      prospective = undefined;
      scratch?.release();
      scratch = undefined;
    };
    try {
      const policy = this.configuration!.value.policy;
      for (const row of rows)
        parse<
          Parameters<typeof accountRetentionDeadline>[0] &
            Parameters<typeof recentRetentionDeadline>[0],
          void
        >(this.world, row.payload, (header) => {
          const key = copy(this.world, { id: row.slot });
          try {
            const values: Record<RetentionWorkKind, number | undefined> = {
              recent: recentRetentionDeadline(header, policy.recent),
              support: supportRetentionDeadline(header),
              knowledge: knowledgeRetentionDeadline(header),
              accounts: accountRetentionDeadline(header, policy),
            };
            for (const kind of kinds)
              values[kind] = Number.isFinite(values[kind]) ? -values[kind]! : undefined;
            edits.push({ key, values });
          } catch (error) {
            key.guard.release();
            throw error;
          }
        });
      for (const id of deleted)
        parse<string[], void>(this.world, id, (path) => {
          const key = copy(this.world, { id: path.at(-1)! });
          try {
            edits.push({
              key,
              values: {
                recent: undefined,
                support: undefined,
                knowledge: undefined,
                accounts: undefined,
              },
            });
          } catch (error) {
            key.guard.release();
            throw error;
          }
        });
      const totals: Indexes = {
        recent: { count: this.indexes.recent.count, keyBytes: this.indexes.recent.keyBytes },
        support: { count: this.indexes.support.count, keyBytes: this.indexes.support.keyBytes },
        knowledge: {
          count: this.indexes.knowledge.count,
          keyBytes: this.indexes.knowledge.keyBytes,
        },
        accounts: { count: this.indexes.accounts.count, keyBytes: this.indexes.accounts.keyBytes },
      };
      const overrides = {
        recent: new Map<string, number | undefined>(),
        support: new Map<string, number | undefined>(),
        knowledge: new Map<string, number | undefined>(),
        accounts: new Map<string, number | undefined>(),
      };
      let maximum = bytes(totals);
      for (const edit of edits) {
        const id = edit.key.value.id,
          cost = keyBytes(id);
        maximumKeyBytes = Math.max(maximumKeyBytes, cost);
        for (const kind of kinds) {
          const before = overrides[kind].has(id)
              ? overrides[kind].get(id)
              : objectIndexGet(this.indexes[kind].tree, id),
            after = edit.values[kind];
          if (before === undefined && after !== undefined) {
            totals[kind].count++;
            totals[kind].keyBytes += cost;
          } else if (before !== undefined && after === undefined) {
            totals[kind].count--;
            totals[kind].keyBytes -= cost;
          }
          overrides[kind].set(id, after);
        }
        maximum = Math.max(maximum, bytes(totals));
      }
      prospective = this.world.reserveConsumerBytes(maximum);
      next = {
        recent: { ...this.indexes.recent },
        support: { ...this.indexes.support },
        knowledge: { ...this.indexes.knowledge },
        accounts: { ...this.indexes.accounts },
      };
      for (const edit of edits)
        for (const kind of kinds) {
          const index = next[kind],
            height = index.tree?.height ?? 0;
          // One search path plus AVL double rotations allocates at most six
          // nodes per level; recursive frames and dead rotation intermediates
          // end with this synchronous helper call.
          const workspace = this.world.reserveConsumerBytes(
            (height + 1) * (6 * nodeBytes + 32 * 8),
          );
          try {
            index.tree = objectIndexSet(index.tree, edit.key.value.id, edit.values[kind]);
          } finally {
            workspace.release();
          }
        }
      for (const kind of kinds) {
        next[kind].count = totals[kind].count;
        next[kind].keyBytes = totals[kind].keyBytes;
      }
      if (clear) next = empty();
      const retained = bytes(next);
      if (retained < maximum) {
        const smaller = this.world.reserveConsumerBytes(retained);
        prospective.release();
        prospective = smaller;
      }
      // Only the completed scalar trees survive preparation. Their snapshot
      // guard now owns the copied key backing, so temporary keys/edits can end.
      for (const edit of edits) edit.key.guard.release();
      edits.length = 0;
      for (const kind of kinds) overrides[kind].clear();
      const frame = this.world.reserveConsumerBytes(3 * 32 * 8);
      scratch.release();
      scratch = frame;
      const accept = () => {
        if (consumed) throw new Error('Native retention preparation was consumed.');
        this.live();
        if (this.revision !== revision)
          throw new Error('Native retention preparation no longer follows its accepted headers.');
        let changed = false;
        for (const kind of kinds) if (this.indexes[kind].tree !== next![kind].tree) changed = true;
        this.indexes = next!;
        next = undefined;
        this.snapshot!.release();
        this.snapshot = prospective;
        prospective = undefined;
        this.maximumKeyBytes = maximumKeyBytes;
        if (changed) this.revision++;
        release();
      };
      return Object.assign(accept, { release });
    } catch (error) {
      release();
      throw error;
    }
  }

  release(): void {
    if (this.released) return;
    this.released = true;
    for (const kind of kinds) {
      this.indexes[kind].tree = undefined;
      this.cursors[kind]?.release();
      delete this.cursors[kind];
    }
    this.select = undefined;
    this.configuration?.guard.release();
    this.configuration = undefined;
    this.snapshot?.release();
    this.snapshot = undefined;
    this.fixed?.release();
    this.fixed = undefined;
    this.worldOwner = undefined;
  }
}
