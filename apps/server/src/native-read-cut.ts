import type { NativeChangedRows, NativeWorld } from '@open-legend/native-simulation';
import type { NativeHistoryInput } from './native-history.js';
import { nativeHistoryAccountCuts } from './native-history.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import { nativeRecordChanges } from './native-records.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
  withNativeJsonInput,
} from './native-consumer.js';

/** Actual accepted native metadata and the selected actor's unsaved physical
 * page representation. Other pending rows/history remain with their existing
 * immutable publication owner; this read does not copy that whole backlog. */
export interface NativeActorReadCut {
  readonly worldId: string;
  readonly generation: string;
  readonly actorId: string;
  readonly acceptedCut: number;
  readonly identityThrough: number;
  readonly at: number;
  readonly sequence: number;
  readonly paused: boolean;
  readonly save: {
    readonly durableRevision: number;
    readonly durableCut: number;
    readonly throughCut: number;
    readonly inFlightThrough?: number;
    readonly representedBefore: number;
  };
  readonly temporal: NativeChangedRows;
  readonly history: Pick<NativeHistoryInput, 'worldId' | 'generation' | 'baseCut' | 'cuts'>;
}

export async function captureNativeReadCut(world: NativeWorld, actorId: string) {
  return decodeNativeProduct<NativeActorReadCut>(
    await withNativeJsonInput(world, { actorId }, (bytes) => world.readCut(bytes)),
  );
}

/** Join real pre-Ready accepted products with the save owner's current scoped
 * page preview. A missing/stale Node publication cannot become an empty SQL
 * overlay merely because the durable database still contains older rows. */
export function nativeScopedReadCut(
  captured: NativeActorReadCut,
  pending: LiveReadCuts,
): LiveReadCuts {
  try {
    if (
      pending.worldId !== captured.worldId ||
      pending.generation !== captured.generation ||
      pending.revision !== captured.save.durableRevision ||
      pending.sequence !== captured.acceptedCut ||
      pending.durableSequence !== captured.save.durableCut ||
      pending.inFlightThrough !== captured.save.inFlightThrough ||
      captured.save.throughCut !== captured.acceptedCut ||
      captured.history.worldId !== captured.worldId ||
      captured.history.generation !== captured.generation ||
      captured.history.baseCut !== captured.acceptedCut ||
      captured.history.cuts.length !== 1 ||
      captured.history.cuts[0]?.actorId !== captured.actorId
    )
      throw new Error('Native indexed read no longer matches its accepted publication owner.');

    let through = pending.durableSequence;
    for (const cut of pending.cuts) {
      // A closed immutable SQL prefix can combine multiple accepted cuts. Each
      // subsequent still-unsaved publication must remain present in order.
      const prefix = through === pending.durableSequence && cut.through === pending.inFlightThrough;
      if (!prefix && cut.through !== through + 1)
        throw new Error('Native indexed read is missing an accepted pending cut.');
      through = cut.through;
    }
    if (through !== captured.acceptedCut)
      throw new Error('Native indexed read is missing its complete accepted suffix.');

    return retainNativeSources(
      {
        ...pending,
        cuts: [
          ...pending.cuts,
          { through: captured.acceptedCut, changes: nativeRecordChanges(captured.temporal) },
        ],
        historyEligibility: nativeHistoryAccountCuts(captured.history.cuts),
      },
      captured,
      pending,
    );
  } finally {
    // Adopt both input snapshots. Their joined OUT product owns independent
    // pins, including pending history that may be acknowledged during SQL I/O.
    releaseNativeProduct(captured);
    releaseNativeProduct(pending);
  }
}
