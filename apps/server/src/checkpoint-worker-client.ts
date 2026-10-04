import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { SaveFileMetadata } from './save-files.js';
export type CheckpointSource = { url: string };
export interface CheckpointRequest {
  directory: string;
  id: string;
  worldId: string;
  label: string;
  format: string;
  kind: SaveFileMetadata['kind'];
  expectedRevision?: number;
  sequence?: number;
  /** Parent-owned cleanup identity for an interrupted worker's private stage. */
  stageId?: string;
}
/** Bounds the database read snapshot even when one filesystem operation never settles.
 * The worker owns that connection, so terminating it also closes the snapshot. */
export const CHECKPOINT_WORKER_TIMEOUT_MS = 125_000;
/** One owned worker, no world-sized structured clone or parallel capture backlog. */
export class CheckpointWorker {
  private readonly worker: Worker;
  readonly ready: Promise<void>;
  private pending?: {
    captured: () => void;
    resolve: () => void;
    reject: (error: Error) => void;
    stagePath: string;
  };
  private failure?: Error;
  constructor(
    source: CheckpointSource,
    private readonly captureTimeoutMs = CHECKPOINT_WORKER_TIMEOUT_MS,
    suppliedWorker?: Worker,
  ) {
    const url = new URL('./checkpoint-worker.ts', import.meta.url).href;
    // A data URL fixes this trusted bootstrap's ESM mode independently of a
    // parent's stdin/eval flags. Anchor the pinned tsx loader to this module;
    // a data URL itself cannot resolve workspace packages.
    const bootstrap = `import { createRequire } from 'node:module';
      const { tsImport } = createRequire(${JSON.stringify(import.meta.url)})('tsx/esm/api');
      await tsImport(${JSON.stringify(url)}, ${JSON.stringify(import.meta.url)});`;
    this.worker =
      suppliedWorker ??
      new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`), {
        workerData: source,
        resourceLimits: { maxOldGenerationSizeMb: 256 },
      });
    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.on('message', (message: { type: string; error?: string }) => {
        if (message.type === 'ready') resolve();
        else if (this.failure)
          return; // A timed-out capture settles only after worker exit.
        else if (message.type === 'captured') this.pending?.captured();
        else if (message.type === 'complete') {
          this.pending?.resolve();
          this.pending = undefined;
        } else if (message.type === 'failed') {
          this.pending?.reject(new Error(message.error ?? 'Checkpoint worker failed.'));
          this.pending = undefined;
        }
      });
      const fail = (error: Error) => {
        // A watchdog failure names the actual stalled capture; its worker exit only
        // confirms that the PostgreSQL snapshot and file handles have been released.
        const reason = this.failure ?? error;
        this.failure = reason;
        reject(reason);
        const pending = this.pending;
        this.pending = undefined;
        if (pending)
          void rm(pending.stagePath, { recursive: true, force: true }).then(
            () => pending.reject(reason),
            (cleanupError: unknown) =>
              pending.reject(
                new Error(
                  `${reason.message} Its private staging directory could not be cleaned: ${String(cleanupError)}`,
                ),
              ),
          );
      };
      this.worker.on('error', (error) => {
        this.failure ??= error;
        reject(error);
        // The error can precede exit. Keep pending capture and stage cleanup fenced
        // until the worker is gone, so no later publication can follow rejection.
        void this.worker.terminate().catch(() => undefined);
      });
      this.worker.on('exit', (code) => fail(new Error(`Checkpoint worker exited (${code}).`)));
    });
    // Storage initialization can fail before GameSaves awaits this worker. Keep the
    // original rejection observable there without an unhandled early/teardown rejection.
    this.ready.catch(() => undefined);
  }
  async capture(request: CheckpointRequest, captured: () => void) {
    await this.ready;
    if (this.failure) throw this.failure;
    if (this.pending) throw new Error('Checkpoint worker is busy.');
    const stageId = randomUUID();
    return new Promise<void>((resolve, reject) => {
      // The row scanner's two-minute check runs only between rows. A blocked write,
      // sync or rename would otherwise pin PostgreSQL's read snapshot forever (SL09-C).
      const timeout = setTimeout(() => {
        const error = new Error(
          'Checkpoint worker exceeded its time limit; previous saves retained.',
        );
        this.failure = error;
        // Do not settle the capture until the worker has exited. Otherwise a late
        // rename could publish a slot after the caller was told that capture failed.
        // If termination itself fails, a worker may still publish. Keep this
        // capture unresolved until an exit event proves it can no longer do so.
        void this.worker.terminate().catch((reason: unknown) => {
          this.failure = new Error(`Checkpoint worker could not stop: ${String(reason)}`);
        });
      }, this.captureTimeoutMs);
      this.pending = {
        captured,
        stagePath: join(request.directory, `.pending-${process.pid}-${stageId}`),
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      };
      try {
        this.worker.postMessage({ ...request, stageId });
      } catch (error) {
        this.pending.reject(
          error instanceof Error ? error : new Error('Checkpoint dispatch failed.'),
        );
        this.pending = undefined;
      }
    });
  }
  async close() {
    await this.worker.terminate();
  }
}
