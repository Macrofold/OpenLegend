import type { NativeSaveRows, NativeWorldSave } from '@open-legend/native-simulation';
import type { ExperiencePrivacy } from '@open-legend/domain';
import type { CommitInputs } from './commit-inputs.js';
import type { GameplayReceipt } from './command-receipts.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { NativePublication } from './native-operation.js';
import type { SqlGameRepository } from './store.js';
import {
  mergeHistoryProjection,
  type HistoryProjection,
} from './history-preparation.js';
import { nativeAppendHistoryProjection } from './native-history.js';
import { nativeRecordChanges, nativeSaveCut } from './native-records.js';
import { retainNativeSources } from './native-consumer.js';
import {
  mergeSourceVersionChanges,
  sourceVersionKey,
  type SourceVersionChange,
  type SourceVersionPlan,
} from './source-version-retention.js';

type Cut = ReturnType<typeof nativeSaveCut>;
export interface NativePendingPublication {
  readonly publication: NativePublication;
  readonly history: HistoryProjection;
  readonly changes: ReturnType<typeof nativeRecordChanges>;
  readonly getSources: ReturnType<SqlGameRepository['memories']['captureSources']>;
  readonly versions: SourceVersionPlan;
  readonly receipts: readonly GameplayReceipt[];
  readonly outcomes: CommitInputs['outcomes'];
}
interface Entry {
  readonly value: NativePendingPublication;
  next?: Entry;
}
/** An application-owned projection of an actual native immutable SQL prefix.
 * The opaque save and its decoded rows stay retained through retry and ACK.
 * They never absorb a newer publication or become a second row merge owner. */
export interface NativePendingPrefix {
  readonly save: NativeWorldSave;
  readonly cut: Cut;
  readonly inputs: CommitInputs;
  readonly receipts: readonly GameplayReceipt[];
}

/** Only operational accepted products live here. The native save journal owns
 * row replacement, temporal packing, placements and the pending byte allowance.
 * No SavedWorld or actor/history catalogue is retained by this owner. */
export class NativePendingSave {
  private head?: Entry;
  private tail?: Entry;
  private prefix?: NativePendingPrefix;
  private accepted: number;
  private durable: number;
  private revision: number;

  constructor(
    private readonly store: SqlGameRepository,
    private readonly binding: {
      readonly worldId: string;
      readonly generation: string;
      readonly timeline: string;
      readonly revision: number;
      readonly acceptedCut: number;
    },
  ) {
    this.accepted = this.durable = binding.acceptedCut;
    this.revision = binding.revision;
  }

  get through(): number {
    return this.accepted;
  }
  get dirty(): boolean {
    return this.accepted !== this.durable;
  }
  get inFlight(): NativePendingPrefix | undefined {
    return this.prefix;
  }

  /** All fallible projection and the next queue node are prepared before Ready.
   * Acceptance then installs only this already-created immutable node. */
  prepare(
    publication: NativePublication,
    versions: SourceVersionPlan,
    receipts: readonly GameplayReceipt[] = [],
    outcomes: CommitInputs['outcomes'] = [],
  ): { readonly value: NativePendingPublication; accept(): void } {
    const { progress } = publication;
    if (
      progress.worldId !== this.binding.worldId ||
      progress.generation !== this.binding.generation ||
      progress.baseCut !== this.accepted ||
      progress.throughCut !== this.accepted + 1
    )
      throw new Error('Native publication no longer follows its operational pending owner.');
    const changes = retainNativeSources(nativeRecordChanges(publication.records), publication);
    const history = retainNativeSources(
      nativeAppendHistoryProjection(publication.history),
      publication,
    );
    const value = retainNativeSources(
      {
        publication,
        changes,
        history,
        getSources: this.store.memories.captureSources(this.binding.worldId, changes, versions),
        versions,
        receipts,
        outcomes,
      },
      publication,
    );
    const entry: Entry = { value };
    const before = this.tail;
    let used = false;
    return {
      value,
      accept: () => {
        if (used || this.tail !== before || this.accepted !== progress.baseCut)
          throw new Error('Native pending publication was reused or displaced before settlement.');
        used = true;
        if (before) before.next = entry;
        else this.head = entry;
        this.tail = entry;
        this.accepted = progress.throughCut;
      },
    };
  }

  liveReadCuts(): LiveReadCuts {
    const cuts: LiveReadCuts['cuts'][number][] = [];
    if (this.prefix) {
      const { cut, inputs } = this.prefix;
      cuts.push({
        through: cut.throughCut,
        changes: cut.changes,
        history: inputs.history,
        getSources: (actor) =>
          this.store.memories.prepareSources(
            cut.worldId,
            cut.changes,
            inputs.sources.allowance,
            inputs.sources.versions,
            actor,
          ),
        versions: inputs.sources.versions,
      });
    }
    for (let entry = this.head; entry; entry = entry.next) {
      const value = entry.value;
      if (value.publication.progress.throughCut <= (this.prefix?.cut.throughCut ?? this.durable))
        continue;
      cuts.push({
        through: value.publication.progress.throughCut,
        changes: value.changes,
        history: value.history,
        getSources: value.getSources,
        versions: value.versions,
      });
    }
    return {
      worldId: this.binding.worldId,
      generation: this.binding.generation,
      storageGeneration: this.binding.generation,
      timeline: this.binding.timeline,
      sequence: this.accepted,
      durableSequence: this.durable,
      revision: this.revision,
      ...(this.prefix ? { inFlightThrough: this.prefix.cut.throughCut } : {}),
      cuts,
    };
  }

  capture(save: NativeWorldSave, rows: NativeSaveRows, privacy: ExperiencePrivacy): NativePendingPrefix {
    if (this.prefix) return this.prefix;
    if (this.store.records.needsHotPrune)
      throw new Error('Native save requires its installed hot-history projection.');
    const cut = retainNativeSources(nativeSaveCut(rows), rows);
    if (
      cut.worldId !== this.binding.worldId ||
      cut.generation !== this.binding.generation ||
      cut.baseRevision !== this.revision ||
      cut.throughCut <= this.durable ||
      cut.throughCut !== this.accepted
    )
      throw new Error('Native save prefix does not cover the exact accepted operational suffix.');
    let history: HistoryProjection | undefined;
    const versions = new Map<string, SourceVersionChange>();
    const receipts = new Map<string, GameplayReceipt>();
    const outcomes = new Map<string, CommitInputs['outcomes'][number]>();
    const invalidations: Record<string, readonly string[]> = {};
    let privacyChanged = false;
    for (let entry = this.head; entry; entry = entry.next) {
      const value = entry.value;
      if (value.publication.progress.throughCut > cut.throughCut) break;
      history = history ? mergeHistoryProjection(history, value.history) : value.history;
      for (const change of value.versions.changes) {
        const key = sourceVersionKey(change), before = versions.get(key);
        versions.set(key, before ? mergeSourceVersionChanges(before, change) : change);
      }
      for (const receipt of value.receipts) receipts.set(receipt.id, receipt);
      for (const outcome of value.outcomes) outcomes.set(outcome.id, outcome);
      for (const [actor, ids] of Object.entries(value.publication.invalidatedMemoryIds ?? {}))
        invalidations[actor] = [...new Set([...(invalidations[actor] ?? []), ...ids])];
      privacyChanged ||= value.publication.privacyChange !== undefined;
    }
    if (!history) throw new Error('Native save prefix is missing its accepted history projection.');
    const plan = { changes: [...versions.values()] };
    const sources = this.store.memories.prepareSources(
      cut.worldId,
      cut.changes,
      this.store.memories.captureAllowance(cut.worldId),
      plan,
    );
    const inputs: CommitInputs = {
      worldId: cut.worldId,
      initial: false,
      restore: false,
      changes: cut.changes,
      history,
      sources,
      outcomes: [...outcomes.values()],
      privacy,
      privacyChanged,
      invalidations,
      hotEventIds: [],
      collectReceivedValues: true,
    };
    // The complete prefix is constructed before replacing this operational
    // pointer. A refused capture keeps the same accepted queue available.
    return (this.prefix = retainNativeSources({ save, cut, inputs, receipts: [...receipts.values()] }, rows));
  }

  acknowledge(prefix: NativePendingPrefix, revision: number): void {
    if (prefix !== this.prefix || revision !== this.revision + 1)
      throw new Error('Native save acknowledgement belongs to a different immutable prefix.');
    while (this.head && this.head.value.publication.progress.throughCut <= prefix.cut.throughCut)
      this.head = this.head.next;
    if (!this.head) this.tail = undefined;
    this.durable = prefix.cut.throughCut;
    this.revision = revision;
    this.prefix = undefined;
  }
}
