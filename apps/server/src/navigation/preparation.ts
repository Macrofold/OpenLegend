import { Worker } from 'node:worker_threads';
import type { NavigationRequest, NavigationResult, SpatialMap } from '@open-legend/spatial';
import { OverloadError, WorkLane } from '../work-lane.js';
import { beginTiming, endTiming, profilingEnabled, recordDuration } from '../performance.js';
import type { NavigationMessage, NavigationReply } from './messages.js';
import {
  GeometryAllocationError,
  type GeometryCloneAllocation,
  type GeometryPreparationAllocation,
  type GeometryReservation,
} from '../geometry-batches.js';

// Explicit preparation and native phases share this admission lane. The physical
// worker, six-profile mesh cache, deadline and memory ceiling are the existing
// navigation provider's, rather than a native replacement for Recast.
const preparationLane = new WorkLane('navigation.preparation', 8);
const maximumRequests = 64;
const deadlineMs = 20_000;
let serial = 0;
const unavailable = (): NavigationResult => ({ status: 'unavailable', path: [] });
type Request = { id: string; request: NavigationRequest };

/** One persistent physical provider, independent of gameplay authority. A map
 * identity change rebuilds its cache; each result still requires body/corridor
 * validation and current action/proposal admission by its caller.
 */
export class NavigationPreparation {
  private worker?: Worker;
  private map?: SpatialMap;
  private mapAllocation?: GeometryCloneAllocation;
  private key = '';
  private requestId = 0;
  private active = false;
  private closed = false;
  private retiring?: Promise<number>;
  private outstanding?: {
    id: number;
    key: string;
    resolve: (reply: NavigationReply | null) => void;
    messageAllocation?: GeometryCloneAllocation;
    resultAllocation?: GeometryReservation;
  };

  constructor(private readonly allocation?: GeometryPreparationAllocation) {}

  async compute(
    map: SpatialMap,
    requests: ReadonlyArray<Request>,
  ): Promise<ReadonlyMap<string, NavigationResult>> {
    if (!requests.length) return new Map();
    const results = new Map(requests.map(({ id }) => [id, unavailable()]));
    if (
      this.closed ||
      this.active ||
      requests.length > maximumRequests ||
      new Set(requests.map(({ id }) => id)).size !== requests.length
    )
      return results;
    this.active = true;
    try {
      return await preparationLane.run(async () => {
        if (this.closed) return results;
        if (this.retiring) await this.retiring;
        if (this.closed) return results;
        const started = beginTiming();
        let timer: NodeJS.Timeout | undefined;
        let stagedMap: GeometryCloneAllocation | undefined;
        try {
          const changed = this.map !== map;
          if (changed) stagedMap = this.allocation?.clone(map);
          if (!this.worker && !this.allocation) this.start();
          let startedWorker = !!this.worker;
          if (changed) this.key = `candidate-preparation:${++serial}`;
          timer = setTimeout(() => void this.retire(), deadlineMs);
          for (let index = 0; index < requests.length && !this.closed; index++) {
            const task = requests[index]!;
            if (!this.worker && startedWorker) break;
            const id = ++this.requestId;
            let messageAllocation: GeometryCloneAllocation | undefined;
            let resultAllocation: GeometryReservation | undefined;
            let transferred = false;
            try {
              messageAllocation = this.allocation?.clone({
                id,
                key: this.key,
                request: task.request,
              });
              resultAllocation = this.allocation?.result('navigation', 1);
              if (!this.worker) this.start();
              startedWorker = true;
              const worker = this.worker!;
              const reply = await new Promise<NavigationReply | null>((resolve) => {
                this.outstanding = {
                  id,
                  key: this.key,
                  resolve,
                  messageAllocation,
                  resultAllocation,
                };
                transferred = true;
                const message: NavigationMessage = {
                  id,
                  key: this.key,
                  ...(changed && index === 0 ? { map } : {}),
                  request: task.request,
                };
                try {
                  worker.postMessage(message);
                } catch {
                  void this.retire();
                }
              });
              if (!reply || reply.error || !reply.result) {
                await this.retire();
                break;
              }
              // A failed map preparation must never mark a later phase warm.
              this.map = map;
              if (stagedMap) {
                stagedMap.complete();
                this.mapAllocation?.release();
                this.mapAllocation = stagedMap;
                stagedMap = undefined;
              }
              results.set(task.id, reply.result);
              if (reply.timing) {
                recordDuration('navigation.preparation.query', reply.timing.queryMs);
                recordDuration('navigation.preparation.build', reply.timing.buildMs);
              }
            } finally {
              if (!transferred) {
                messageAllocation?.release();
                resultAllocation?.release();
              }
            }
          }
        } catch (error) {
          await this.retire();
          if (error instanceof GeometryAllocationError) throw error;
        } finally {
          clearTimeout(timer);
          try {
            if (this.retiring) await this.retiring;
          } finally {
            stagedMap?.release();
            endTiming('navigation.preparation.batch', started);
          }
        }
        return results;
      });
    } catch (error) {
      if (!(error instanceof OverloadError)) throw error;
      return results;
    } finally {
      this.active = false;
    }
  }

  private start(): void {
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), {
      execArgv: [],
      env: {},
      workerData: { profiling: profilingEnabled() },
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    this.worker = worker;
    worker.on('message', (reply: NavigationReply) => {
      const pending = this.outstanding;
      if (
        this.worker !== worker ||
        !pending ||
        reply.id !== pending.id ||
        reply.key !== pending.key
      )
        return;
      this.outstanding = undefined;
      pending.messageAllocation?.release();
      pending.resultAllocation?.release();
      pending.resolve(reply);
    });
    worker.on('error', () => {
      if (this.worker === worker) void this.retire();
    });
    worker.on('exit', () => {
      if (this.worker === worker) void this.retire();
    });
  }

  private retire(): Promise<number> {
    if (this.retiring) return this.retiring;
    const worker = this.worker,
      allocation = this.mapAllocation;
    this.worker = undefined;
    this.mapAllocation = undefined;
    this.map = undefined;
    this.key = '';
    const pending = this.outstanding;
    this.outstanding = undefined;
    pending?.resolve(null);
    const retirement = worker?.terminate() ?? Promise.resolve(0);
    this.retiring = retirement;
    // Keep ownership until termination settles, including failed termination.
    void retirement
      .finally(() => {
        allocation?.release();
        pending?.messageAllocation?.release();
        pending?.resultAllocation?.release();
        if (this.retiring === retirement) this.retiring = undefined;
      })
      .catch(() => {});
    return retirement;
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.retire();
  }
}

/** One-shot authoring/preview callers release the same physical provider after
 * their isolated batch. Native gameplay retains it across admitted phases.
 */
export async function prepareCandidateNavigation(
  map: SpatialMap,
  requests: ReadonlyArray<Request>,
): Promise<ReadonlyMap<string, NavigationResult>> {
  const provider = new NavigationPreparation();
  try {
    return await provider.compute(map, requests);
  } finally {
    await provider.close();
  }
}
