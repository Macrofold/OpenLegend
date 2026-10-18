import { Worker } from 'node:worker_threads';
import type {
  JournalRange,
  JournalApplied,
  JournalTables,
  RetainedJournal,
} from './journal-application.js';
import { countMetric, recordDuration } from './performance.js';
export interface ApplicationSource {
  url: string;
  writeGroups: boolean;
}
export interface ApplicationWorkerData {
  source: ApplicationSource;
  profiling: boolean;
}
export interface ApplicationStatistics {
  batches: number;
  unobservedBatches: number;
  statements: number;
  sqlAwaitMs: number;
  maxSqlMs: number;
  elapsedMs: number;
}
export type ApplicationRequest =
  | { type: 'activate' }
  | { type: 'apply'; range: JournalRange; entries: [number, RetainedJournal<JournalTables>][] };
export type ApplicationReply =
  | { type: 'ready' | 'active' }
  | { type: 'complete'; result: JournalApplied; statistics?: ApplicationStatistics }
  | { type: 'failed'; error: string };

/** Exactly one complete accepted batch in flight. Journal debt is the queue;
 * this owner has no world copies, request replay or unbounded message backlog. */
export class JournalWorker {
  private readonly worker: Worker;
  readonly ready: Promise<void>;
  readonly statistics?: ApplicationStatistics;
  private failure?: Error;
  private stopped?: Promise<void>;
  private active = false;
  private pending?: {
    range?: JournalRange;
    resolve: (result?: JournalApplied) => void;
    reject: (error: Error) => void;
  };
  constructor(
    source: ApplicationSource,
    failed: (error: Error) => void,
    options: { profiling: boolean },
  ) {
    this.statistics = options.profiling
      ? {
          batches: 0,
          unobservedBatches: 0,
          statements: 0,
          sqlAwaitMs: 0,
          maxSqlMs: 0,
          elapsedMs: 0,
        }
      : undefined;
    const url = new URL('./journal-worker.ts', import.meta.url).href;
    // Reuse the checkpoint worker's pinned trusted TypeScript bootstrap.
    const bootstrap = `import { createRequire } from 'node:module';
      const { tsImport } = createRequire(${JSON.stringify(import.meta.url)})('tsx/esm/api');
      await tsImport(${JSON.stringify(url)}, ${JSON.stringify(import.meta.url)});`;
    this.worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`), {
      workerData: { source, profiling: options.profiling } satisfies ApplicationWorkerData,
    });
    this.ready = new Promise<void>((resolve, reject) => {
      const fail = (error: Error) => {
        if (!this.failure) {
          this.failure = error;
          failed(error);
        }
        reject(this.failure);
        const pending = this.pending;
        this.pending = undefined;
        if (pending?.range && this.statistics) this.statistics.unobservedBatches++;
        pending?.reject(this.failure);
      };
      this.worker.on('message', (message: ApplicationReply) => {
        if (this.failure) return;
        if (message.type === 'ready') resolve();
        else if (message.type === 'active' && this.pending && !this.pending.range) {
          this.active = true;
          this.pending.resolve();
          this.pending = undefined;
        } else if (message.type === 'complete' && this.pending?.range) {
          const expected = this.pending.range,
            result = message.result;
          if (
            result.worldId !== expected.worldId ||
            result.generation !== expected.generation ||
            result.first !== expected.first ||
            result.through !== expected.through
          ) {
            fail(new Error('Journal worker completion has a different owner.'));
            return;
          }
          const measured = message.statistics;
          if (this.statistics) {
            if (measured) {
              this.statistics.batches += measured.batches;
              this.statistics.statements += measured.statements;
              this.statistics.sqlAwaitMs += measured.sqlAwaitMs;
              this.statistics.maxSqlMs = Math.max(this.statistics.maxSqlMs, measured.maxSqlMs);
              this.statistics.elapsedMs += measured.elapsedMs;
              recordDuration('persistence.worker.application', measured.elapsedMs);
              recordDuration('persistence.worker.sqlAwait', measured.sqlAwaitMs);
              countMetric('persistence.worker.sqlStatements', measured.statements);
            } else this.statistics.unobservedBatches++;
          }
          this.pending.resolve(result);
          this.pending = undefined;
        } else if (message.type === 'failed') fail(new Error(message.error));
        else fail(new Error('Unexpected journal worker completion.'));
      });
      this.worker.on('error', fail);
      this.worker.on('exit', () => fail(new Error('Journal application worker exited.')));
    });
    this.ready.catch(() => undefined);
  }
  async activate(): Promise<void> {
    await this.ready;
    await this.request({ type: 'activate' });
  }
  async apply(
    range: JournalRange,
    entries: ReadonlyMap<number, RetainedJournal<JournalTables>>,
  ): Promise<JournalApplied> {
    await this.ready;
    if (!this.active) throw new Error('Journal worker is not activated.');
    return (await this.request({ type: 'apply', range, entries: [...entries] }))!;
  }
  private request(request: ApplicationRequest): Promise<JournalApplied | undefined> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending) return Promise.reject(new Error('Journal application worker is busy.'));
    return new Promise((resolve, reject) => {
      this.pending = {
        ...(request.type === 'apply' ? { range: request.range } : {}),
        resolve,
        reject,
      };
      try {
        this.worker.postMessage(request);
      } catch (error) {
        this.pending = undefined;
        reject(error);
      }
    });
  }
  close(): Promise<void> {
    if (!this.stopped) {
      this.failure ??= new Error('Journal application worker stopped.');
      if (this.pending?.range && this.statistics) this.statistics.unobservedBatches++;
      this.pending?.reject(this.failure);
      this.pending = undefined;
      this.stopped = this.worker.terminate().then(() => undefined);
    }
    return this.stopped;
  }
}
