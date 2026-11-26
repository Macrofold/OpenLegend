import { Worker } from 'node:worker_threads';
import { evaluateGeometryBatch, type GeometryBatch } from '@open-legend/spatial';

export interface GeometryReservation {
  release(): void;
}
export interface GeometryCloneAllocation extends GeometryReservation {
  complete(): void;
}
/** The Native caller supplies capacity only; ordinary Source workers retain
 * their existing codec, fallback and independently bounded worker heaps. */
export interface GeometryPreparationAllocation {
  clone(value: unknown): GeometryCloneAllocation;
  result(kind: 'geometry' | 'navigation', count: number): GeometryReservation;
}
export class GeometryAllocationError extends Error {
  constructor(cause: unknown) {
    super('Native geometry allocation exceeds its byte allowance.', { cause });
  }
}

interface Slot {
  worker?: Worker;
  retiring?: Promise<void>;
  map?: GeometryBatch['map'];
  revision?: number;
  allocation?: GeometryCloneAllocation;
  pending?: {
    id: number;
    count: number;
    resolve: (result: boolean[]) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    messageAllocation?: GeometryCloneAllocation;
    resultAllocation?: GeometryReservation;
    previousMapAllocation?: GeometryCloneAllocation;
  };
}
interface SlotAllocation {
  map?: GeometryCloneAllocation;
  message?: GeometryCloneAllocation;
  result?: GeometryReservation;
}
function releaseAllocation(allocation: SlotAllocation | undefined): void {
  allocation?.map?.release();
  allocation?.message?.release();
  allocation?.result?.release();
}
/** One mutation owns at most one 128-query batch. Two bounded workers may divide it;
 * there is no backlog or gameplay publication here. Native synchronous callers
 * use the same geometry owner, and worker failure falls back to that exact path. */
export class GeometryBatches {
  private readonly slots: Slot[] = [{}, {}];
  private serial = 0;
  private closed = false;
  private failedMap?: GeometryBatch['map'];
  private readonly retirements = new Set<Promise<void>>();
  failures = 0;
  batches = 0;
  sightQueries = 0;
  walkingQueries = 0;
  constructor(private readonly allocation?: GeometryPreparationAllocation) {}
  async compute(batch: GeometryBatch): Promise<boolean[]> {
    if (this.closed || this.failedMap === batch.map || batch.queries.length < 32)
      return evaluateGeometryBatch(batch);
    if (this.slots.some((slot) => slot.pending || slot.retiring))
      return evaluateGeometryBatch(batch);
    const split =
      batch.queries.length >= 64 ? Math.ceil(batch.queries.length / 2) : batch.queries.length;
    let firstAllocation: SlotAllocation | undefined;
    let secondAllocation: SlotAllocation | undefined;
    try {
      this.batches++;
      if (batch.kind === 'walking') this.walkingQueries += batch.queries.length;
      else this.sightQueries += batch.queries.length;
      const firstQueries = batch.queries.slice(0, split);
      const secondQueries = split < batch.queries.length ? batch.queries.slice(split) : undefined;
      // A rejected first async query must not let its sibling launch anyway.
      // Native preflights both existing slots before either worker is created.
      firstAllocation = this.prepare(this.slots[0]!, batch, firstQueries);
      if (secondQueries) secondAllocation = this.prepare(this.slots[1]!, batch, secondQueries);
      const first = this.query(this.slots[0]!, batch, firstQueries, firstAllocation);
      const second = secondQueries
        ? this.query(this.slots[1]!, batch, secondQueries, secondAllocation)
        : Promise.resolve([]);
      const results = await Promise.all([first, second]);
      return results.flat();
    } catch (error) {
      if (error instanceof GeometryAllocationError) {
        for (const slot of this.slots) this.retire(slot);
        await Promise.all(this.retirements);
        throw error;
      }
      this.failures++;
      this.failedMap = batch.map;
      for (const slot of this.slots) this.retire(slot);
      return evaluateGeometryBatch(batch);
    } finally {
      releaseAllocation(firstAllocation);
      releaseAllocation(secondAllocation);
    }
  }

  private prepare(
    slot: Slot,
    batch: GeometryBatch,
    rays: GeometryBatch['queries'],
  ): SlotAllocation | undefined {
    if (!this.allocation) return;
    const allocation: SlotAllocation = {};
    try {
      if (slot.map !== batch.map || slot.revision !== batch.map.spatial.revision)
        allocation.map = this.allocation.clone(batch.map);
      allocation.message = this.allocation.clone({
        id: this.serial + 1,
        kind: batch.kind,
        queries: rays,
      });
      allocation.result = this.allocation.result('geometry', rays.length);
      return allocation;
    } catch (error) {
      releaseAllocation(allocation);
      throw error;
    }
  }
  private async query(
    slot: Slot,
    batch: GeometryBatch,
    rays: GeometryBatch['queries'],
    admission?: SlotAllocation,
  ): Promise<boolean[]> {
    // A changed map may need a replacement after failure. Join the old slot
    // before allocating another worker so termination remains inside its bound.
    if (slot.retiring) await slot.retiring;
    if (this.closed) throw new Error('Geometry executor stopped.');
    const changed = slot.map !== batch.map || slot.revision !== batch.map.spatial.revision;
    let mapAllocation: GeometryCloneAllocation | undefined;
    let messageAllocation: GeometryCloneAllocation | undefined;
    let resultAllocation: GeometryReservation | undefined;
    let transferred = false;
    try {
      // Reserve every actual worker copy before launching or posting. The map
      // is charged only when that slot installs it, not on each ray batch.
      mapAllocation = admission?.map;
      messageAllocation = admission?.message;
      resultAllocation = admission?.result;
      if (!slot.worker) {
        const worker = new Worker(new URL('./geometry-worker.mjs', import.meta.url), {
          execArgv: [],
          env: {},
          resourceLimits: { maxOldGenerationSizeMb: 128 },
        });
        slot.worker = worker;
        worker.on('message', (reply: { id?: number; results?: boolean[]; error?: string }) => {
          const pending = slot.pending;
          if (slot.worker !== worker || !pending || reply.id !== pending.id) return;
          clearTimeout(pending.timer);
          slot.pending = undefined;
          pending.previousMapAllocation?.release();
          slot.allocation?.complete();
          pending.messageAllocation?.release();
          pending.resultAllocation?.release();
          if (
            reply.error ||
            !Array.isArray(reply.results) ||
            reply.results.length !== pending.count ||
            reply.results.some((v) => typeof v !== 'boolean')
          )
            pending.reject(new Error('Incomplete geometry preparation.'));
          else pending.resolve(reply.results);
        });
        worker.on('error', () => {
          if (slot.worker === worker) this.retire(slot);
        });
        worker.on('exit', () => {
          if (slot.worker === worker) this.retire(slot);
        });
      }
      return await new Promise((resolve, reject) => {
        const id = ++this.serial;
        const timer = setTimeout(() => this.retire(slot), 5_000);
        slot.pending = {
          id,
          count: rays.length,
          resolve,
          reject,
          timer,
          messageAllocation,
          resultAllocation,
          ...(changed ? { previousMapAllocation: slot.allocation } : {}),
        };
        if (changed) slot.allocation = mapAllocation;
        if (admission) admission.map = admission.message = admission.result = undefined;
        transferred = true;
        try {
          slot.worker!.postMessage({
            id,
            ...(changed ? { map: batch.map } : {}),
            kind: batch.kind,
            queries: rays,
          });
          slot.map = batch.map;
          slot.revision = batch.map.spatial.revision;
        } catch {
          this.retire(slot);
        }
      });
    } finally {
      if (!transferred) {
        mapAllocation?.release();
        messageAllocation?.release();
        resultAllocation?.release();
      }
    }
  }
  private retire(slot: Slot): void {
    const worker = slot.worker,
      pending = slot.pending,
      allocation = slot.allocation;
    const releaseAllocations = () => {
      allocation?.release();
      pending?.previousMapAllocation?.release();
      pending?.messageAllocation?.release();
      pending?.resultAllocation?.release();
    };
    slot.worker = undefined;
    slot.map = undefined;
    slot.revision = undefined;
    slot.pending = undefined;
    slot.allocation = undefined;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Geometry executor stopped.'));
    }
    if (worker) {
      const retiring = worker
        .terminate()
        .then(() => {})
        .catch(() => {
          this.failures++;
        })
        .finally(() => {
          releaseAllocations();
          this.retirements.delete(retiring);
          if (slot.retiring === retiring) slot.retiring = undefined;
        });
      slot.retiring = retiring;
      this.retirements.add(retiring);
    } else releaseAllocations();
  }
  async close(): Promise<void> {
    this.closed = true;
    for (const slot of this.slots) this.retire(slot);
    await Promise.all(this.retirements);
    this.failedMap = undefined;
  }
}
