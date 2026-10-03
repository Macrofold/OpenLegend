import type { ServerResponse } from 'node:http';
import type { WorldAgentProgressSnapshot } from '@open-legend/protocol';

/** One replaceable snapshot, no token backlog. Disconnect never cancels paid work.
 * docs/limits/inventions.md#ws01--world-agent-stream-delivery
 */
export class WorldAgentStream {
  private dirty = true;
  private reading = false;
  private blocked = false;
  private closed = false;
  private last = '';
  private nextAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private timeout?: ReturnType<typeof setTimeout>;
  private heartbeat: ReturnType<typeof setInterval>;
  private unwatch: () => void;
  constructor(
    private response: ServerResponse,
    private snapshot: () => Promise<WorldAgentProgressSnapshot>,
    private authorized: () => boolean,
    watch: (notify: () => void) => () => void,
    private released: () => void,
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
        void this.pump();
      },
      Math.max(0, this.nextAt - Date.now()),
    );
  }
  private write(frame: string) {
    if (!this.response.write(frame)) {
      this.blocked = true;
      this.timeout = setTimeout(() => this.response.destroy(), 30_000);
    }
  }
  private async pump() {
    if (!this.check() || this.blocked) return;
    this.reading = true;
    this.dirty = false;
    try {
      const snapshot = await this.snapshot();
      if (!this.check()) return;
      const payload = JSON.stringify(snapshot);
      if (Buffer.byteLength(payload) > 128 * 1024)
        throw new Error('Owner progress exceeds its delivery envelope.');
      if (payload !== this.last) {
        this.last = payload;
        const cursor = `${snapshot.turn?.id ?? 'none'}:${snapshot.turn?.revision ?? 0}`;
        this.write(`id: ${cursor}\nevent: snapshot\ndata: ${payload}\n\n`);
      }
      this.nextAt = Date.now() + 250;
    } catch {
      if (!this.closed && !this.response.destroyed) {
        if (this.blocked) this.response.destroy();
        else this.response.end('event: unavailable\ndata: {}\n\n');
      }
      this.close();
    } finally {
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
    this.released();
    this.response.end();
  }
}
