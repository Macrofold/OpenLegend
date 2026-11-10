import type { ServerResponse } from 'node:http';
import type { GameView } from '@open-legend/protocol';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import {
  releaseNativeProduct,
  retainNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativePlayerViewRequest } from './native-player-view.js';
import { OverloadError, WorkLane } from './work-lane.js';
import { ViewChangedError, projectPatch } from './view.js';

type Stream = {
  readonly response: ServerResponse;
  scope: RequestScope;
  view?: GameView;
  blocked: boolean;
  timeout?: ReturnType<typeof setTimeout>;
};
type Execution = Pick<
  NativePlayerViewRequest,
  'executionSource' | 'jevConfigured' | 'llmConfigured'
>;

/** Player bytes are serialized and queued during the native disclosure lease.
 * A drain callback requests a fresh permitted view instead of replaying an old
 * prepared payload after the actor's knowledge or authority changed. */
export class NativePlayerHttp {
  private readonly streams = new Map<ServerResponse, Stream>();
  private readonly lane: WorkLane;
  private readonly unsubscribe: () => void;
  private readonly heartbeat: ReturnType<typeof setInterval>;
  private wake?: ReturnType<typeof setTimeout>;
  private running?: Promise<void>;
  private again = false;
  private nextPublicationAt = 0;
  private closed = false;

  constructor(
    private readonly service: NativeWorldService,
    private readonly execution: Execution,
  ) {
    this.lane = new WorkLane('native.http.projection', service.config.capacity.requests);
    this.unsubscribe = service.subscribe(() => this.schedule());
    this.heartbeat = setInterval(() => {
      for (const stream of this.streams.values()) {
        if (!this.current(stream)) continue;
        if (stream.response.headersSent) this.write(stream, Buffer.from(': heartbeat\n\n'));
      }
    }, 15_000);
    this.heartbeat.unref();
  }

  get connections(): number {
    return this.streams.size;
  }

  async state(scope: RequestScope, response: ServerResponse): Promise<void> {
    await this.service.publishPlayer(
      scope,
      (bytes) => {
        if (response.destroyed || this.closed) return;
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        retainNativeProduct(bytes);
        response.once('close', () => releaseNativeProduct(bytes));
        response.end(bytes, () => releaseNativeProduct(bytes));
      },
      this.execution,
    );
  }

  /** The request owner first installs the real transport/presence connection.
   * Its close callback removes that same admitted connection after this owner
   * has stopped retaining its private player view. */
  async connect(
    scope: RequestScope,
    response: ServerResponse,
    disconnected: () => void,
  ): Promise<void> {
    if (this.closed || this.streams.size >= this.service.connectionLimit) throw new OverloadError();
    this.service.assertScope(scope);
    const stream: Stream = { response, scope, blocked: false };
    this.streams.set(response, stream);
    response.once('close', () => {
      this.drop(stream);
      disconnected();
    });
    response.on('drain', () => {
      if (!this.streams.has(response)) return;
      clearTimeout(stream.timeout);
      stream.timeout = undefined;
      stream.blocked = false;
      this.schedule();
    });
    try {
      // Initial headers and reset bytes are handed off in the same real native
      // publication callback; no earlier unfenced snapshot opens the stream.
      await this.publish(stream);
    } catch (error) {
      this.drop(stream);
      throw error;
    }
  }

  private drop(stream: Stream): void {
    clearTimeout(stream.timeout);
    this.streams.delete(stream.response);
    if (stream.view) releaseNativeProduct(stream.view);
    stream.view = undefined;
  }

  private current(stream: Stream): boolean {
    if (this.closed || stream.response.destroyed) {
      this.drop(stream);
      return false;
    }
    if (!this.service.currentScope(stream.scope)) {
      if (stream.blocked) stream.response.destroy();
      else stream.response.end('event: access-changed\ndata: {}\n\n');
      this.drop(stream);
      return false;
    }
    return true;
  }

  private write(stream: Stream, bytes: Buffer): void {
    if (stream.blocked || stream.response.destroyed) return;
    if (!stream.response.write(bytes, () => releaseNativeProduct(bytes))) {
      stream.blocked = true;
      stream.timeout = setTimeout(() => stream.response.destroy(), 30_000);
      stream.timeout.unref();
    }
  }

  private async publish(stream: Stream): Promise<void> {
    if (!this.current(stream) || stream.blocked) return;
    const current = this.service.refreshScope(stream.scope);
    if (scopeKey(current) !== scopeKey(stream.scope)) {
      stream.scope = current;
      if (stream.view) releaseNativeProduct(stream.view);
      stream.view = undefined;
    }
    await this.service.publishPlayer(
      stream.scope,
      (bytes, view) => {
        if (!this.current(stream) || stream.blocked) return;
        if (!stream.response.headersSent) {
          stream.response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          });
          stream.response.flushHeaders();
        }
        // A privacy boundary jumps directly to a newly permitted reset. It
        // never emits a patch containing earlier forgotten private content.
        const prior = stream.view?.historyEpoch === view.historyEpoch ? stream.view : undefined;
        if (prior?.revision === view.revision && scopeKey(stream.scope) === view.access?.scope)
          return;
        const patch = prior ? projectPatch(prior, view) : null;
        const message = retainNativeSources(
          patch
            ? Buffer.from(`event: patch\ndata: ${JSON.stringify(patch)}\n\n`)
            : Buffer.concat([Buffer.from('event: reset\ndata: '), bytes, Buffer.from('\n\n')]),
          view,
        );
        retainNativeProduct(message);
        this.write(stream, message);
        if (stream.view) releaseNativeProduct(stream.view);
        stream.view = retainNativeProduct(view);
      },
      this.execution,
    );
  }

  private schedule(): void {
    if (this.closed || this.wake || !this.streams.size) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.wake = setTimeout(
      () => {
        this.wake = undefined;
        this.nextPublicationAt = performance.now() + 50;
        this.running = this.lane
          .run(async () => {
            for (const stream of this.streams.values()) {
              if (this.closed) break;
              try {
                await this.publish(stream);
              } catch (error) {
                if (error instanceof ViewChangedError) continue;
                if (error instanceof OverloadError) {
                  this.again = true;
                  continue;
                }
                if (!(error instanceof AuthorityError))
                  console.error('Native player publication failed.', error);
                stream.response.destroy();
                this.drop(stream);
              }
            }
          })
          .catch((error: unknown) => {
            if (error instanceof OverloadError) this.again = true;
            else console.error('Native player publication queue failed.', error);
          })
          .finally(() => {
            this.running = undefined;
            if (this.again) {
              this.again = false;
              this.schedule();
            }
          });
      },
      Math.max(0, this.nextPublicationAt - performance.now()),
    );
    this.wake.unref();
  }

  async close(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      clearTimeout(this.wake);
      clearInterval(this.heartbeat);
      this.unsubscribe();
      for (const stream of this.streams.values()) {
        stream.response.end();
        this.drop(stream);
      }
    }
    await this.running;
    await this.lane.idle();
  }
}
