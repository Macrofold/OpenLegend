import type {
  NativeWorld,
  NativeWorldPrepared,
  NativeWorldTurn,
} from '@open-legend/native-simulation';
import type { WorkVector } from '@open-legend/domain';
import type { HostWork } from './host-work.js';
import type { NativeGeometryProviders } from './native-geometry.js';
import type { NativeHistoryReadContext } from './native-providers.js';
import { driveNativeOperation } from './native-providers.js';
import { decodeNativeProduct, retainNativeSources } from './native-consumer.js';
import type { NativePublication } from './native-operation.js';
import { postgresTransactionOutcome } from './postgres.js';

/** An uncertain transaction keeps its real Ready owner and allocation parked.
 * Dropping a request or stopping intake cannot decide that SQL rolled back. */
export interface NativeProtectedHold {
  readonly turn: NativeWorldTurn;
  readonly prepared: NativeWorldPrepared;
  readonly allocation: ReturnType<HostWork['reserveAllocation']>;
  readonly staged: object;
}

/** SQL is the protected operation's settlement authority. Ordinary accepted
 * play continues through acceptNativeOperation; this path owns Ready through
 * the exact database result and never exposes the private candidate as live. */
export async function acceptProtectedNativeOperation<T extends object>(request: {
  readonly world: NativeWorld;
  readonly first: NativeWorldTurn;
  readonly geometry: NativeGeometryProviders;
  readonly work: HostWork;
  readonly current: () => boolean;
  readonly stage: (publication: NativePublication) => Promise<T>;
  readonly commit: (staged: T) => Promise<void>;
  readonly accept: (staged: T) => void;
  readonly park: (hold: NativeProtectedHold, error: unknown) => void;
  readonly signal?: AbortSignal;
  /** A refused domain transition must not execute attached control SQL. */
  readonly requireSuccess?: boolean;
  readonly history: NativeHistoryReadContext;
}): Promise<{ readonly publication: NativePublication; readonly staged?: T }> {
  const { world } = request;
  const turn = await driveNativeOperation(
    world,
    request.first,
    request.geometry,
    request.signal,
    request.history,
  );
  if (turn.kind !== 'prepared' || !turn.prepared)
    throw new Error('Protected native acceptance requires a complete prepared operation.');
  const prepared = turn.prepared;
  let allocation: ReturnType<HostWork['reserveAllocation']> | undefined;
  let staged: T | undefined;
  let ready = false;
  let settled = false;
  let committed = false;
  let parked = false;
  let commitFailure: unknown;
  const reject = async () => {
    if (ready) {
      if (prepared.settle(false)) throw new Error('Protected native rejection accepted state.');
      settled = true;
      if (await world.finishSettlement(turn.key))
        throw new Error('Protected native rejection completion accepted state.');
    } else await world.cancel(turn.key);
    allocation?.rollback();
  };
  try {
    allocation = request.work.reserveAllocation(JSON.parse(prepared.allocation()) as WorkVector);
    const publication = decodeNativeProduct<NativePublication>(prepared.takePublication());
    // Refused/no-change operations have no protected SQL prefix. Their actual
    // semantic result is returned after exact rollback, without a fake save.
    if (!publication.protectedSave || (request.requireSuccess && !publication.outcome.ok)) {
      await reject();
      return { publication };
    }
    staged = retainNativeSources(await request.stage(publication), publication);
    prepared.ready();
    ready = true;
    if (request.signal?.aborted || !request.current()) {
      await reject();
      return { publication };
    }
    try {
      await request.commit(staged);
      committed = true;
    } catch (error) {
      const outcome = postgresTransactionOutcome(error);
      if (outcome === 'committed') {
        committed = true;
        commitFailure = error;
      } else if (outcome === 'rolled-back') throw error;
      else {
        parked = true;
        request.park({ turn, prepared, allocation, staged }, error);
        throw error;
      }
    }
    // SQL success remains authoritative even if a session expired or the
    // caller disconnected while COMMIT was in flight. Never reauthorize here.
    if (!prepared.settle(true)) throw new Error('Protected native commit was refused.');
    settled = true;
    if (!(await world.finishSettlement(turn.key)))
      throw new Error('Protected native commit completion was refused.');
    allocation.commit();
    request.accept(staged);
    if (commitFailure) throw commitFailure;
    return { publication, staged };
  } catch (error) {
    if (committed) {
      // SQL can no longer be undone. Retain a failed settlement/application
      // owner for cold recovery rather than misreporting a native rollback.
      if (!parked && allocation && staged) {
        parked = true;
        request.park({ turn, prepared, allocation, staged }, error);
      }
    } else if (!settled && !parked) await reject();
    throw error;
  }
}
