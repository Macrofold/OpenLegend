import type { ServerResponse } from 'node:http';

export interface PrivateSnapshotMemory<T> {
  serialize(snapshot: T): { text: string; release(): void };
  frame(cursor: string, payload: string): { bytes: Buffer; release(): void };
  releaseSnapshot(snapshot: T): void;
}

/** One replaceable snapshot, no token backlog. Disconnect never cancels paid work.
 * docs/limits/inventions.md#ws01--world-agent-stream-delivery
 */
export class PrivateSnapshotStream<T> {
  private dirty = true;
  private reading = false;
  private blocked = false;
  private closed = false;
  private last = '';
  private lastMemory?: { release(): void };
  private nextAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private timeout?: ReturnType<typeof setTimeout>;
  private heartbeat: ReturnType<typeof setInterval>;
  private unwatch: () => void;
  private readingTask?: Promise<void>;
  constructor(
    private response: ServerResponse,
    private snapshot: () => Promise<T>,
    private authorized: () => boolean,
    watch: (notify: () => void) => () => void,
    private released: () => void,
    private cursor: (snapshot: T) => string,
    private current: (snapshot: T) => boolean = () => true,
    private memory?: PrivateSnapshotMemory<T>,
    private publication?: (publish: () => void) => Promise<boolean>,
  ) {
    this.unwatch = watch(() => this.notify());
    response.on('close', () => this.close());
    response.on('drain', () => {
      this.blocked = false;
      clearTimeout(this.timeout);
      this.schedule();
    });
    this.heartbeat = setInterval(() => {
      if (!this.check()) return;
      if (!this.blocked) this.write(': heartbeat\n\n');
    }, 15_000);
    this.schedule();
  }
  notify() {
    this.dirty = true;
    this.schedule();
  }
  check() {
    if (this.closed) return false;
    if (this.authorized()) return true;
    if (this.blocked) this.response.destroy();
    else this.response.end('event: access-changed\ndata: {}\n\n');
    this.close();
    return false;
  }
  private schedule() {
    if (this.closed || this.reading || this.blocked || this.timer || !this.dirty) return;
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        if (this.memory || this.publication) {
          this.readingTask = this.pump().finally(() => {
            this.readingTask = undefined;
          });
        } else void this.pump();
      },
      Math.max(0, this.nextAt - Date.now()),
    );
  }
  private write(frame: string | { bytes: Buffer; release(): void }) {
    let release: (() => void) | undefined;
    if (typeof frame !== 'string') {
      const owned = frame;
      let released = false;
      release = () => {
        if (released) return;
        released = true;
        this.response.off('close', release!);
        owned.release();
      };
      this.response.once('close', release);
    }
    let accepted: boolean;
    try {
      accepted = this.response.write(typeof frame === 'string' ? frame : frame.bytes, release);
    } catch (error) {
      release?.();
      throw error;
    }
    if (!accepted) {
      this.blocked = true;
      this.timeout = setTimeout(() => this.response.destroy(), 30_000);
    }
  }
  private async pump() {
    if (!this.check() || this.blocked) return;
    this.reading = true;
    this.dirty = false;
    let snapshot: T | undefined;
    let captured = false;
    let encoded: { text: string; release(): void } | undefined;
    try {
      const selected = await this.snapshot();
      snapshot = selected;
      captured = true;
      const deliver = () => {
        if (!this.check()) return;
        if (!this.current(selected)) {
          this.dirty = true;
          return;
        }
        encoded = this.memory?.serialize(selected);
        const payload = encoded?.text ?? JSON.stringify(selected);
        if (Buffer.byteLength(payload) > 128 * 1024)
          throw new Error('Private snapshot exceeds its delivery envelope.');
        if (payload !== this.last) {
          this.lastMemory?.release();
          this.last = payload;
          this.lastMemory = encoded;
          encoded = undefined;
          const cursor = this.cursor(selected);
          this.write(
            this.memory?.frame(cursor, payload) ??
              `id: ${cursor}\nevent: snapshot\ndata: ${payload}\n\n`,
          );
        }
        this.nextAt = Date.now() + 250;
      };
      if (this.publication) {
        if (!(await this.publication(deliver))) {
          this.dirty = true;
          this.nextAt = Date.now() + 250;
        }
      } else deliver();
    } catch {
      if (!this.closed && !this.response.destroyed) {
        if (this.blocked) this.response.destroy();
        else this.response.end('event: unavailable\ndata: {}\n\n');
      }
      this.close();
    } finally {
      encoded?.release();
      if (captured) this.memory?.releaseSnapshot(snapshot as T);
      this.reading = false;
      this.schedule();
    }
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timer);
    clearTimeout(this.timeout);
    clearInterval(this.heartbeat);
    this.unwatch();
    this.last = '';
    this.lastMemory?.release();
    this.lastMemory = undefined;
    this.released();
    this.response.end();
  }
  drain(): Promise<void> {
    return this.readingTask ?? Promise.resolve();
  }
}
