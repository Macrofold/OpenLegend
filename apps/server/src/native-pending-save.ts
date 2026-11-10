import type { NativeWorld } from '@open-legend/native-simulation';
import { nativeTemporalPageEdits } from './native-temporal-edits.js';
import type { PendingTemporalPage } from './temporal-page-storage.js';
import type { NativeSaveRows, NativeWorldSave } from '@open-legend/native-simulation';
import type { ExperiencePrivacy } from '@open-legend/domain';
import type { CommitInputs } from './commit-inputs.js';
import type { GameplayReceipt } from './command-receipts.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { NativePublication } from './native-operation.js';
import type { SqlGameRepository } from './store.js';
import { mergeHistoryProjection, type HistoryProjection } from './history-preparation.js';
import { nativeAppendHistoryProjection } from './native-history.js';
import { nativeRecordChanges, nativeSaveCut } from './native-records.js';
import {
  attachNativeConsumer,
  createNativeConsumerScope,
  releaseNativeProduct,
  retainNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
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
  readonly dispose: () => void;
  acceptedAt: number;
  next?: Entry;
}
/** An application-owned projection of an actual native immutable SQL prefix.
 * The opaque save and its decoded rows stay retained through retry and ACK.
 * They never absorb a newer publication or become a second row merge owner. */
export interface NativePendingPrefix {
  /** A protected candidate already owns the exact private native prefix. It
   * has no public Save handle until its SQL result determines settlement. */
  readonly save?: NativeWorldSave;
  readonly cut: Cut;
  readonly inputs: CommitInputs;
  readonly receipts: readonly GameplayReceipt[];
  readonly getSources: NativePendingPublication['getSources'];
  readonly progress: NativePublication['progress'];
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
  private readonly prefixOwners = new WeakMap<NativePendingPrefix, () => void>();

  constructor(
    private readonly store: SqlGameRepository,
    private readonly binding: {
      readonly worldId: string;
      readonly generation: string;
      readonly timeline: string;
      readonly revision: number;
      readonly acceptedCut: number;
    },
    private readonly budget: Pick<NativeWorld, 'reserveConsumerBytes'>,
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
  get oldestAcceptedAt(): number | undefined {
    return this.head?.acceptedAt;
  }
  durableMark(): { revision: number; through: number } {
    return { revision: this.revision, through: this.durable };
  }
  get inFlight(): NativePendingPrefix | undefined {
    return this.prefix;
  }

  /** All fallible projection and the next queue node are prepared before Ready.
   * Acceptance then installs only this already-created immutable node. */
  async prepare(
    publication: NativePublication,
    versions: SourceVersionPlan,
    receipts: readonly GameplayReceipt[] = [],
    outcomes: CommitInputs['outcomes'] = [],
    projectedHistory?: HistoryProjection,
  ) {
    const { progress } = publication;
    if (
      progress.worldId !== this.binding.worldId ||
      progress.generation !== this.binding.generation ||
      progress.baseCut !== this.accepted ||
      progress.throughCut !== this.accepted + 1
    )
      throw new Error('Native publication no longer follows its operational pending owner.');
    const owner = createNativeConsumerScope();
    let used = false;
    try {
      return await owner.run(async () => {
        const changes = retainNativeSources(nativeRecordChanges(publication.records), publication);
        // The current/durable progress report has its own service lifetime. Ending
        // this queue node at ACK must not release that report's independent pin.
        retainNativeProduct(retainNativeSources(publication.progress, publication));
        const history = retainNativeSources(
          projectedHistory
            ? { ...projectedHistory }
            : nativeAppendHistoryProjection(publication.history),
          publication,
          ...(projectedHistory ? [projectedHistory] : []),
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
          ...receipts,
        );
        const entry: Entry = { value, acceptedAt: 0, dispose: () => owner.dispose() };
        const before = this.tail;
        return {
          value,
          cancel: () => {
            if (used) return;
            owner.dispose();
            releaseNativeProduct(publication.progress);
          },
          accept: () => {
            if (used || this.tail !== before || this.accepted !== progress.baseCut)
              throw new Error(
                'Native pending publication was reused or displaced before settlement.',
              );
            used = true;
            entry.acceptedAt = performance.now();
            if (before) before.next = entry;
            else this.head = entry;
            this.tail = entry;
            this.accepted = progress.throughCut;
          },
        };
      });
    } catch (error) {
      owner.dispose();
      releaseNativeProduct(publication.progress);
      throw error;
    }
  }

  /** A protected candidate follows a completed ordinary save barrier. Pack
   * and SQL projection are already owned by that exact private native cut;
   * accepting only installs the prepared node and the same prefix pointer. */
  async prepareProtected(
    budget: Pick<NativeWorld, 'reserveConsumerBytes'>,
    publication: NativePublication,
    versions: SourceVersionPlan,
    history: HistoryProjection,
    privacy: ExperiencePrivacy,
    outcomes: CommitInputs['outcomes'] = [],
  ) {
    if (this.head || this.prefix || this.accepted !== this.durable)
      throw new Error('Protected native publication requires the completed save barrier.');
    if (!publication.protectedSave)
      throw new Error('Protected native publication has no held complete SQL prefix.');
    const protectedSave = publication.protectedSave;
    const prepared = await this.prepare(publication, versions, [], outcomes, history);
    const owner = createNativeConsumerScope();
    try {
      return await owner.run(async () => {
        const temporal = publication.privacyChange
          ? nativeTemporalPageEdits(
              budget,
              nativeRecordChanges(protectedSave.changes),
              publication.temporalPredecessors,
              publication,
            )
          : undefined;
        if (temporal) {
          prepared.value.changes.temporalEdits = temporal;
          retainNativeSources(prepared.value.changes, publication, temporal);
        }
        const prefix = await this.projectPrefix(
          undefined,
          retainNativeSources(protectedSave, publication),
          [prepared.value],
          privacy,
          publication.progress.throughCut,
          temporal,
        );
        const releasePrefix = this.prefixOwners.get(prefix)!;
        this.prefixOwners.set(prefix, () => {
          releasePrefix();
          owner.dispose();
        });
        return {
          value: prepared.value,
          prefix,
          cancel: () => {
            prepared.cancel();
            this.prefixOwners.get(prefix)?.();
          },
          accept: () => {
            if (this.prefix)
              throw new Error('Protected native save prefix was displaced before acceptance.');
            prepared.accept();
            this.prefix = prefix;
          },
        };
      });
    } catch (error) {
      owner.dispose();
      prepared.cancel();
      throw error;
    }
  }

  liveReadCuts(): LiveReadCuts {
    const after = this.prefix?.cut.throughCut ?? this.durable;
    let count = this.prefix ? 1 : 0;
    for (let entry = this.head; entry; entry = entry.next)
      if (entry.value.publication.progress.throughCut > after) count++;
    // One snapshot root, its cut/reference arrays and the selected five-field
    // cut headers. Rows, strings and history maps are borrowed, never copied.
    const storage = this.budget.reserveConsumerBytes(
      (32 + 10 * 8 + 32 + count * 8 + 32 + count * 8 + count * (32 + 5 * 8)) * 8,
    );
    try {
      const cuts: LiveReadCuts['cuts'][number][] = [];
      const sources: object[] = [];
      if (this.prefix) {
        const { cut, inputs } = this.prefix;
        cuts.push({
          through: cut.throughCut,
          changes: cut.changes,
          history: inputs.history,
          getSources: this.prefix.getSources,
          versions: inputs.sources.versions,
        });
        sources.push(this.prefix);
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
        sources.push(value);
      }
      return attachNativeConsumer(
        {
          worldId: this.binding.worldId,
          generation: this.binding.generation,
          storageGeneration: this.binding.generation,
          timeline: this.binding.timeline,
          sequence: this.accepted,
          durableSequence: this.durable,
          revision: this.revision,
          ...(this.prefix ? { inFlightThrough: this.prefix.cut.throughCut } : {}),
          cuts,
        },
        storage,
        ...sources,
      );
    } catch (error) {
      storage.release();
      throw error;
    }
  }

  async capture(
    save: NativeWorldSave,
    rows: NativeSaveRows,
    privacy: ExperiencePrivacy,
  ): Promise<NativePendingPrefix> {
    if (this.prefix) {
      releaseNativeProduct(rows);
      return this.prefix;
    }
    const pending = function* (first: Entry | undefined) {
      for (let entry = first; entry; entry = entry.next) yield entry.value;
    };
    const prefix = await this.projectPrefix(save, rows, pending(this.head), privacy, this.accepted);
    // Only the complete projection replaces this pointer. Refused capture
    // leaves every earlier accepted publication and its exact suffix intact.
    return (this.prefix = prefix);
  }

  private async projectPrefix(
    save: NativeWorldSave | undefined,
    rows: NativeSaveRows,
    pending: Iterable<NativePendingPublication>,
    privacy: ExperiencePrivacy,
    through: number,
    temporalEdits?: readonly PendingTemporalPage[],
  ): Promise<NativePendingPrefix> {
    const owner = createNativeConsumerScope();
    try {
      return await owner.run(async () => {
        if (this.store.records.needsHotPrune)
          throw new Error('Native save requires its installed hot-history projection.');
        const cut = retainNativeSources(nativeSaveCut(rows), rows);
        if (temporalEdits) {
          cut.changes.temporalEdits = temporalEdits;
          retainNativeSources(cut.changes, rows, temporalEdits);
          retainNativeSources(cut, rows, cut.changes);
        }
        if (
          cut.worldId !== this.binding.worldId ||
          cut.generation !== this.binding.generation ||
          cut.baseRevision !== this.revision ||
          cut.throughCut <= this.durable ||
          cut.throughCut !== through
        )
          throw new Error(
            'Native save prefix does not cover the exact accepted operational suffix.',
          );
        let history: HistoryProjection | undefined;
        const versions = new Map<string, SourceVersionChange>();
        const receipts = new Map<string, GameplayReceipt>();
        const outcomes = new Map<string, CommitInputs['outcomes'][number]>();
        const invalidations: Record<string, readonly string[]> = {};
        let privacyChanged = false;
        let progress: NativePublication['progress'] | undefined;
        const historyOwners: [object, ...object[]] = [rows];
        for (const value of pending) {
          if (value.publication.progress.throughCut > cut.throughCut) break;
          progress = value.publication.progress;
          history = history ? mergeHistoryProjection(history, value.history) : { ...value.history };
          historyOwners.push(value.history);
          for (const change of value.versions.changes) {
            const key = sourceVersionKey(change),
              before = versions.get(key);
            versions.set(key, before ? mergeSourceVersionChanges(before, change) : change);
          }
          for (const receipt of value.receipts) receipts.set(receipt.id, receipt);
          for (const outcome of value.outcomes) outcomes.set(outcome.id, outcome);
          for (const [actor, ids] of Object.entries(value.publication.invalidatedMemoryIds ?? {}))
            invalidations[actor] = [...new Set([...(invalidations[actor] ?? []), ...ids])];
          privacyChanged ||= value.publication.privacyChange !== undefined;
        }
        if (!history || !progress)
          throw new Error('Native save prefix is missing its accepted history projection.');
        retainNativeSources(history, ...historyOwners);
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
        const prefix = retainNativeSources(
          {
            save,
            cut,
            inputs,
            progress,
            receipts: [...receipts.values()],
            getSources: this.store.memories.captureSources(cut.worldId, cut.changes, plan),
          },
          rows,
          history,
          privacy,
          ...receipts.values(),
          ...(temporalEdits ? [temporalEdits] : []),
        );
        this.prefixOwners.set(prefix, () => owner.dispose());
        return prefix;
      });
    } catch (error) {
      owner.dispose();
      throw error;
    } finally {
      // The prefix and any OUT reader now own independent pins. The decoded
      // save-row input itself has no consumer after this projection attempt.
      releaseNativeProduct(rows);
    }
  }

  acknowledge(prefix: NativePendingPrefix, revision: number): void {
    if (prefix !== this.prefix || revision !== this.revision + 1)
      throw new Error('Native save acknowledgement belongs to a different immutable prefix.');
    while (this.head && this.head.value.publication.progress.throughCut <= prefix.cut.throughCut) {
      const entry = this.head;
      this.head = entry.next;
      entry.dispose();
    }
    if (!this.head) this.tail = undefined;
    this.durable = prefix.cut.throughCut;
    this.revision = revision;
    this.prefix = undefined;
    this.prefixOwners.get(prefix)?.();
    this.prefixOwners.delete(prefix);
  }

  release(): void {
    if (this.dirty || this.prefix)
      throw new Error('An unacknowledged native prefix cannot be released during shutdown.');
    this.head = this.tail = undefined;
  }
}
