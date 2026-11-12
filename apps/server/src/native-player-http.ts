import type { ServerResponse } from 'node:http';
import type { GameView } from '@open-legend/protocol';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import {
  nativeJsonFixedWorkspace,
  releaseNativeProduct,
  retainNativeProduct,
} from './native-consumer.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativePlayerEncoder, NativePlayerViewRequest } from './native-player-view.js';
import { isOverloadError, OverloadError, WorkLane } from './work-lane.js';
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

const slots = (count: number) => 256 + 64 * count;

/** The socket can close before Node invokes its write callback. Keep this
 * copied payload's custody until either actual completion, then forget both. */
function transportRelease(response: ServerResponse, bytes: Buffer): () => void {
  const release = () => {
    response.off('close', release);
    releaseNativeProduct(bytes);
  };
  response.once('close', release);
  return release;
}

function fields(value: object): number {
  let count = 0;
  for (const key in value) if (Object.hasOwn(value, key)) count++;
  return count;
}

/** The comparison keeps key arrays only along its active ancestors. A common
 * immutable child, particularly the installed map, ends the walk there. */
function comparisonKeys(value: unknown, shared?: unknown): number {
  if (value === shared || !value || typeof value !== 'object') return 0;
  let nested = 0;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++)
      nested = Math.max(
        nested,
        comparisonKeys(value[index], Array.isArray(shared) ? shared[index] : undefined),
      );
    return slots(value.length) + nested;
  }
  const record = value as Record<string, unknown>;
  const peer =
    shared && typeof shared === 'object' ? (shared as Record<string, unknown>) : undefined;
  let count = 0;
  for (const key in record)
    if (Object.hasOwn(record, key)) {
      count++;
      nested = Math.max(nested, comparisonKeys(record[key], peer?.[key]));
    }
  return slots(count) + nested;
}

function patchWorkspace(previous: GameView, next: GameView): number {
  const oldEntities = previous.entities.length,
    newEntities = next.entities.length;
  const oldEvents = previous.events.length,
    newEvents = next.events.length;
  // Entity/event lookup tables, pair arrays, add/remove/update/order lists and
  // their growth overlap. All record bodies and unchanged children are borrowed.
  let bytes =
    6 * slots(oldEntities) +
    6 * slots(newEntities) +
    (oldEntities + newEntities + oldEvents) * (slots(2) + 4 * 64) +
    4 * slots(oldEvents) +
    5 * slots(newEvents) +
    14 * slots(12);
  let oldWidth = 0,
    compare = 0;
  for (const entity of previous.entities) {
    oldWidth = Math.max(oldWidth, fields(entity));
    compare = Math.max(compare, comparisonKeys(entity));
  }
  for (const entity of next.entities) {
    const width = fields(entity);
    // One sparse replacement object and at most one removed-field list per
    // next entity, with the existing `id` filtering scratch kept separate.
    bytes += slots(3) + 2 * slots(width) + 3 * slots(oldWidth);
    compare = Math.max(compare, comparisonKeys(entity));
  }
  for (const event of previous.events) compare = Math.max(compare, comparisonKeys(event));
  for (const event of next.events) compare = Math.max(compare, comparisonKeys(event));
  for (const key of ['clock', 'player', 'ai'] as const)
    bytes += 3 * slots(fields(previous[key])) + 2 * slots(fields(next[key]));
  for (const key of [
    'presentationRelease',
    'inventionPolicy',
    'godTools',
    'vision',
    'hearing',
    'map',
    'maintenance',
    'clock',
    'player',
    'ai',
    'cartography',
    'communicationReferences',
    'narrator',
    'profile',
    'recipes',
    'conversation',
    'milestones',
    'persistence',
  ] as const)
    compare = Math.max(
      compare,
      comparisonKeys(previous[key], next[key]),
      comparisonKeys(next[key], previous[key]),
    );
  return nativeJsonFixedWorkspace + bytes + 2 * compare;
}

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
      (view, encode) => {
        if (response.destroyed || this.closed) return;
        const bytes = encode(view);
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        retainNativeProduct(bytes);
        const release = transportRelease(response, bytes);
        try {
          response.end(bytes, release);
        } catch (error) {
          release();
          throw error;
        }
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
    if (stream.blocked || stream.response.destroyed) {
      releaseNativeProduct(bytes);
      return;
    }
    const release = transportRelease(stream.response, bytes);
    try {
      if (!stream.response.write(bytes, release)) {
        stream.blocked = true;
        stream.timeout = setTimeout(() => stream.response.destroy(), 30_000);
        stream.timeout.unref();
      }
    } catch (error) {
      release();
      throw error;
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
      (view, encode) => {
        if (!this.current(stream) || stream.blocked) return;
        // A privacy boundary jumps directly to a newly permitted reset. It
        // never emits a patch containing earlier forgotten private content.
        const prior = stream.view?.historyEpoch === view.historyEpoch ? stream.view : undefined;
        if (prior?.revision === view.revision && scopeKey(stream.scope) === view.access?.scope)
          return;
        const message =
          (prior && this.patchBytes(prior, view, encode)) ??
          encode(view, { prefix: 'event: reset\ndata: ', suffix: '\n\n' });
        if (!stream.response.headersSent) {
          stream.response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          });
          stream.response.flushHeaders();
        }
        retainNativeProduct(message);
        this.write(stream, message);
        if (stream.view) releaseNativeProduct(stream.view);
        stream.view = retainNativeProduct(view);
      },
      this.execution,
    );
  }

  private patchBytes(
    previous: GameView,
    view: GameView,
    encode: NativePlayerEncoder,
  ): Buffer | null {
    const world = this.service.world;
    const sizing = world.reserveConsumerBytes(nativeJsonFixedWorkspace);
    let bound: number;
    try {
      bound = patchWorkspace(previous, view);
    } finally {
      sizing.release();
    }
    const preparation = world.reserveConsumerBytes(bound);
    try {
      const patch = projectPatch(previous, view);
      return patch
        ? encode(patch, {
            prefix: 'event: patch\ndata: ',
            suffix: '\n\n',
          })
        : null;
    } finally {
      preparation.release();
    }
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
                if (isOverloadError(error)) {
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
            if (isOverloadError(error)) this.again = true;
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
