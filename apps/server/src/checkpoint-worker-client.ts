import { Worker } from 'node:worker_threads';
import type { SaveFileMetadata } from './save-files.js';
export type CheckpointSource = { kind: 'sqlite'; path: string } | { kind: 'postgres'; url: string };
export interface CheckpointRequest {
  directory: string;
  id: string;
  worldId: string;
  label: string;
  format: string;
  kind: SaveFileMetadata['kind'];
  expectedRevision?: number;
}
/** One owned worker, no world-sized structured clone or parallel capture backlog. */
export class CheckpointWorker {
  private readonly worker: Worker;
  readonly ready: Promise<void>;
  private pending?: { captured: () => void; resolve: () => void; reject: (error: Error) => void };
  private failure?: Error;
  constructor(source: CheckpointSource) {
    const url = new URL('./checkpoint-worker.ts', import.meta.url).href;
    // A data URL fixes this trusted bootstrap's ESM mode independently of a
    // parent's stdin/eval flags. Anchor the pinned tsx loader to this module;
    // a data URL itself cannot resolve workspace packages.
    const bootstrap = `import { createRequire } from 'node:module';
      const { tsImport } = createRequire(${JSON.stringify(import.meta.url)})('tsx/esm/api');
      await tsImport(${JSON.stringify(url)}, ${JSON.stringify(import.meta.url)});`;
    this.worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`), {
      workerData: source,
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.on('message', (message: { type: string; error?: string }) => {
        if (message.type === 'ready') resolve();
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
        this.failure = error;
        reject(error);
        this.pending?.reject(error);
        this.pending = undefined;
      };
      this.worker.on('error', fail);
      this.worker.on('exit', (code) => fail(new Error(`Checkpoint worker exited (${code}).`)));
    });
  }
  async capture(request: CheckpointRequest, captured: () => void) {
    await this.ready;
    if (this.failure) throw this.failure;
    if (this.pending) throw new Error('Checkpoint worker is busy.');
    return new Promise<void>((resolve, reject) => {
      this.pending = { captured, resolve, reject };
      this.worker.postMessage(request);
    });
  }
  async close() {
    await this.worker.terminate();
  }
}
