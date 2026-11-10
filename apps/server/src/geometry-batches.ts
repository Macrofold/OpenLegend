import { Worker } from 'node:worker_threads';
import { evaluateGeometryBatch, type GeometryBatch } from '@open-legend/spatial';

interface Slot {
  worker?: Worker;
  retiring?: Promise<void>;
  map?: GeometryBatch['map'];
  revision?: number;
  pending?: {
    id: number;
    count: number;
    resolve: (result: boolean[]) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
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
  async compute(batch: GeometryBatch): Promise<boolean[]> {
    if (this.closed || this.failedMap === batch.map || batch.queries.length < 32)
      return evaluateGeometryBatch(batch);
    if (this.slots.some((slot) => slot.pending || slot.retiring))
      return evaluateGeometryBatch(batch);
    const split =
      batch.queries.length >= 64 ? Math.ceil(batch.queries.length / 2) : batch.queries.length;
    try {
      this.batches++;
      if (batch.kind === 'walking') this.walkingQueries += batch.queries.length;
      else this.sightQueries += batch.queries.length;
      const first = this.query(this.slots[0]!, batch, batch.queries.slice(0, split));
      const second =
        split < batch.queries.length
          ? this.query(this.slots[1]!, batch, batch.queries.slice(split))
          : Promise.resolve([]);
      const results = await Promise.all([first, second]);
      return results.flat();
    } catch {
      this.failures++;
      this.failedMap = batch.map;
      for (const slot of this.slots) this.retire(slot);
      return evaluateGeometryBatch(batch);
    }
  }
  private async query(
    slot: Slot,
    batch: GeometryBatch,
    rays: GeometryBatch['queries'],
  ): Promise<boolean[]> {
    // A changed map may need a replacement after failure. Join the old slot
    // before allocating another worker so termination remains inside its bound.
    if (slot.retiring) await slot.retiring;
    if (this.closed) throw new Error('Geometry executor stopped.');
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
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      const timer = setTimeout(() => this.retire(slot), 5_000);
      slot.pending = { id, count: rays.length, resolve, reject, timer };
      const changed = slot.map !== batch.map || slot.revision !== batch.map.spatial.revision;
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
  }
  private retire(slot: Slot): void {
    const worker = slot.worker,
      pending = slot.pending;
    slot.worker = undefined;
    slot.map = undefined;
    slot.revision = undefined;
    slot.pending = undefined;
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
          this.retirements.delete(retiring);
          if (slot.retiring === retiring) slot.retiring = undefined;
        });
      slot.retiring = retiring;
      this.retirements.add(retiring);
    }
  }
  async close(): Promise<void> {
    this.closed = true;
    for (const slot of this.slots) this.retire(slot);
    await Promise.all(this.retirements);
    this.failedMap = undefined;
  }
}
