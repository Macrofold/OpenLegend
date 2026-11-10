import type {
  NativeChangedRows,
  NativeSaveRows,
  NativeWorld,
  NativeWorldTurn,
} from '@open-legend/native-simulation';
import type { Outcome, ExperiencePrivacy, WorkVector, WorldEvent } from '@open-legend/domain';
import type { HostWork } from './host-work.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import type { NativeHistoryInput } from './native-history.js';
import type { NativeHistoryReadContext } from './native-providers.js';
import { driveNativeOperation } from './native-providers.js';
import {
  decodeNativeProduct,
  releaseNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import type { SourceVersionPlan } from './source-version-retention.js';
import type { NativePersonalPredecessor } from './native-source-versions.js';
import type { NativeTemporalPredecessor } from './native-temporal-edits.js';

/** A finite proposed publication, never an accepted authority or client view.
 * Every semantic owner's actual changed rows accompany its occurrence and
 * private account products; consumers cannot request a shorter save pipeline. */
export interface NativePublication {
  readonly outcome: Outcome;
  readonly events: readonly WorldEvent[];
  readonly history: NativeHistoryInput;
  readonly notices: {
    readonly changes: readonly (
      | { readonly kind: 'state'; readonly entityId: string; readonly field: 'appraisal' }
      | { readonly kind: 'knowledge'; readonly actorId: string }
    )[];
    readonly conservative: boolean;
    readonly appraisalRevision: number;
  };
  readonly records: NativeChangedRows;
  readonly personalPredecessors: readonly NativePersonalPredecessor[];
  readonly temporalPredecessors: readonly NativeTemporalPredecessor[];
  readonly sourceVersions: SourceVersionPlan;
  /** The complete private SQL prefix for a protected edit. SQL acknowledgement
   * becomes available only after the same prepared operation is accepted. */
  readonly protectedSave?: NativeSaveRows;
  readonly progress: {
    readonly worldId: string;
    readonly generation: string;
    readonly baseCut: number;
    readonly throughCut: number;
    readonly identityThrough: number;
    readonly at: number;
    readonly sequence: number;
    readonly paused: boolean;
  };
  readonly invalidatedMemoryIds?: Readonly<Record<string, readonly string[]>>;
  readonly privacyChange?: {
    readonly actorId: string;
    readonly forgotten: ExperiencePrivacy['forgotten'][string];
    readonly corrections: ExperiencePrivacy['corrections'][string];
  };
}

export type NativeAcceptance<T> =
  | { readonly accepted: true; readonly value: T }
  | {
      readonly accepted: false;
    };

/** The application prepares its complete immutable read/save consumers before
 * Ready, then checks its actual authority/input epoch synchronously at settle.
 * Provider/SQL waits retain no native compute job or publication lock. */
export async function acceptNativeOperation<T extends object>(request: {
  readonly world: NativeWorld;
  readonly first: NativeWorldTurn;
  readonly geometry: NativeGeometryProviders;
  readonly work: HostWork;
  readonly stage: (publication: NativePublication) => T | Promise<T>;
  /** End only a genuinely rejected private stage, never accepted/uncertain work. */
  readonly discard?: () => void;
  readonly current: () => boolean;
  /** Host elapsed integration can discard a genuine no-time navigation wait. */
  readonly admitPublication?: (publication: NativePublication) => boolean;
  readonly signal?: AbortSignal;
  readonly history?: NativeHistoryReadContext;
}): Promise<NativeAcceptance<T>> {
  const { world, work, signal } = request;
  const turn = await driveNativeOperation(
    world,
    request.first,
    request.geometry,
    signal,
    request.history,
  );
  if (turn.kind !== 'prepared' || !turn.prepared)
    throw new Error('Native acceptance requires a complete prepared operation.');
  const prepared = turn.prepared;
  let allocation: ReturnType<HostWork['reserveAllocation']> | undefined;
  let ready = false;
  let settled = false;
  let accepted = false;
  let completed = false;
  let publication: NativePublication | undefined;
  let value: T | undefined;
  try {
    allocation = work.reserveAllocation(JSON.parse(prepared.allocation()) as WorkVector);
    publication = decodeNativeProduct<NativePublication>(prepared.takePublication());
    if (publication.protectedSave)
      throw new Error('Protected native edits require their database commit owner.');
    if (request.admitPublication && !request.admitPublication(publication)) {
      await world.cancel(turn.key);
      settled = completed = true;
      allocation.rollback();
      return { accepted: false };
    }
    // A failure in history/source projection or consumer admission still rolls
    // back the genuine native checkpoint. No fallible staging follows accept.
    value = await request.stage(publication);
    value = retainNativeSources(value, publication);
    prepared.ready();
    ready = true;
    accepted = !signal?.aborted && request.current();
    const actual = prepared.settle(accepted);
    settled = true;
    if (actual !== accepted) throw new Error('Native settlement returned a different decision.');
    if ((await world.finishSettlement(turn.key)) !== accepted)
      throw new Error('Native settlement completion returned a different decision.');
    completed = true;
    if (!accepted) {
      allocation.rollback();
      return { accepted: false };
    }
    allocation.commit();
    return { accepted: true, value };
  } catch (error) {
    if (!settled) {
      if (ready) {
        prepared.settle(false);
        if (await world.finishSettlement(turn.key))
          throw new Error('Native rejection unexpectedly accepted an operation.', { cause: error });
      } else await world.cancel(turn.key);
      allocation?.rollback();
    } else if (completed && !accepted) allocation?.rollback();
    // An accepted candidate whose undo destruction failed keeps the pending
    // maximum HostWork allocation. Its poisoned world must stop before release.
    throw error;
  } finally {
    if (!accepted && (!settled || completed)) {
      if (value) {
        request.discard?.();
        releaseNativeProduct(value);
      }
      if (publication) releaseNativeProduct(publication);
    }
  }
}
