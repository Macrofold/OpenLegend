import type { ServerResponse } from 'node:http';
import type { GameView } from '@open-legend/protocol';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import {
  nativeJsonFixedWorkspace,
  releaseNativeProduct,
  retainNativeProduct,
} from './native-consumer.js';
import { decisionJsonGraphBytes, decisionObjectBytes } from './native-decision-allocation.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativePlayerEncoder, NativePlayerViewRequest } from './native-player-view.js';
import { isOverloadError, OverloadError } from './work-lane.js';
import { ViewChangedError, projectPatch } from './view.js';

type Stream = {
  readonly response: ServerResponse;
  readonly sequence: number;
  readonly abort: AbortController;
  readonly memory: { release(): void };
  readonly disconnected: () => void;
  readonly onClose: () => void;
  readonly onDrain: () => void;
  scope: RequestScope;
  scopeKey: string;
  view?: GameView;
  claimed: number;
  due: boolean;
  busy: boolean;
  blocked: boolean;
  timeout?: ReturnType<typeof setTimeout>;
};
type Scan = {
  readonly iterator: IterableIterator<Stream>;
  readonly through: number;
  readonly target: number;
  visited: number;
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

/** Sizes the later patch comparison by walking both views, including nested
 * entity and event fields. Only call this after ruling out no output and a
 * mandatory reset. The bound applies to this exact pair of views. */
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
  private readonly periodic = new Set<Promise<void>>();
  private readonly requests = new Set<Promise<void>>();
  private readonly retirement = new AbortController();
  private readonly unsubscribe: () => void;
  private readonly heartbeat: ReturnType<typeof setInterval>;
  private wake?: ReturnType<typeof setTimeout>;
  private scan?: Scan;
  private requested = false;
  private notification = 0;
  private sequence = 0;
  private nextPublicationAt = 0;
  private closed = false;

  constructor(
    private readonly service: NativeWorldService,
    private readonly execution: Execution,
  ) {
    this.unsubscribe = service.subscribe(() => {
      this.notification++;
      this.schedule();
    });
    this.heartbeat = setInterval(() => {
      for (const stream of this.streams.values()) {
        if (!this.current(stream)) continue;
        if (stream.response.headersSent && !stream.blocked)
          this.write(stream, Buffer.from(': heartbeat\n\n'));
      }
    }, 15_000);
    this.heartbeat.unref();
  }

  get connections(): number {
    return this.streams.size;
  }

  async state(scope: RequestScope, response: ServerResponse): Promise<void> {
    if (response.destroyed || this.closed) return;
    await this.track(async () => {
      const connection = new AbortController();
      const disconnected = () => connection.abort(new ViewChangedError());
      response.once('close', disconnected);
      const signal = AbortSignal.any([connection.signal, this.retirement.signal]);
      try {
        await this.service.publishPlayer(
          scope,
          (view, encode) => {
            if (signal.aborted || response.destroyed || response.writableEnded) return;
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
          signal,
        );
      } finally {
        response.off('close', disconnected);
      }
    });
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
    if (response.destroyed) return;
    this.service.assertScope(scope);
    // The scheduler record/scope outlives individual views and may remain
    // locally active after disconnect. Payloads have their own admission.
    const memory = this.service.world.reserveConsumerBytes(
      decisionObjectBytes(36) + decisionJsonGraphBytes(scope),
    );
    const stream: Stream = {
      response,
      sequence: ++this.sequence,
      abort: new AbortController(),
      memory,
      disconnected,
      scope,
      scopeKey: scopeKey(scope),
      claimed: this.notification,
      due: false,
      busy: true,
      blocked: false,
      onClose: () => this.drop(stream),
      onDrain: () => {
        if (!this.registered(stream)) return;
        clearTimeout(stream.timeout);
        stream.timeout = undefined;
        stream.blocked = false;
        stream.due = true;
        this.pending(stream);
      },
    };
    this.streams.set(response, stream);
    response.once('close', stream.onClose);
    response.on('drain', stream.onDrain);
    await this.track(async () => {
      try {
        // Initial headers and reset bytes leave with the same native
        // publication authorization as subsequent stream updates.
        await this.publish(stream);
      } catch (error) {
        this.drop(stream);
        throw error;
      } finally {
        this.settled(stream);
      }
    });
  }

  private async track(operation: () => Promise<void>): Promise<void> {
    const task = operation();
    this.requests.add(task);
    try {
      await task;
    } finally {
      this.requests.delete(task);
    }
  }

  private clearBaseline(stream: Stream): void {
    if (stream.view) releaseNativeProduct(stream.view);
    stream.view = undefined;
  }

  private registered(stream: Stream): boolean {
    return this.streams.get(stream.response) === stream;
  }

  private drop(stream: Stream): void {
    if (!this.registered(stream)) return;
    this.streams.delete(stream.response);
    stream.abort.abort(new ViewChangedError());
    clearTimeout(stream.timeout);
    stream.timeout = undefined;
    stream.response.off('close', stream.onClose);
    stream.response.off('drain', stream.onDrain);
    this.clearBaseline(stream);
    if (!stream.busy) stream.memory.release();
    stream.disconnected();
  }

  private current(stream: Stream): boolean {
    if (!this.registered(stream)) return false;
    if (this.closed || stream.response.destroyed || stream.response.writableEnded) {
      this.drop(stream);
      return false;
    }
    if (!this.service.currentScope(stream.scope)) {
      try {
        if (stream.blocked) stream.response.destroy();
        else stream.response.end('event: access-changed\ndata: {}\n\n');
      } finally {
        this.drop(stream);
      }
      return false;
    }
    return true;
  }

  private write(stream: Stream, bytes: Buffer): boolean {
    const { response } = stream;
    if (
      !this.registered(stream) ||
      stream.blocked ||
      response.destroyed ||
      response.writableEnded
    ) {
      releaseNativeProduct(bytes);
      return false;
    }
    const release = transportRelease(response, bytes);
    try {
      if (!response.write(bytes, release) && this.registered(stream)) {
        stream.blocked = true;
        stream.timeout = setTimeout(() => response.destroy(), 30_000);
        stream.timeout.unref();
      }
      return true;
    } catch (error) {
      release();
      throw error;
    }
  }

  private async publish(stream: Stream): Promise<void> {
    if (!this.current(stream) || stream.blocked) return;
    const scope = this.service.refreshScope(stream.scope);
    const key = scopeKey(scope);
    if (key !== stream.scopeKey) {
      stream.scope = scope;
      stream.scopeKey = key;
      this.clearBaseline(stream);
    }
    await this.service.publishPlayer(
      stream.scope,
      (view, encode) => {
        if (!this.current(stream) || stream.blocked || stream.scopeKey !== key) return;
        // A privacy boundary jumps directly to a newly permitted reset. It
        // never emits a patch containing earlier forgotten private content.
        const prior = stream.view?.historyEpoch === view.historyEpoch ? stream.view : undefined;
        if (prior?.revision === view.revision && key === view.access?.scope) return;
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
        // Transfer only this response's view before writing, then install it
        // as the patch baseline only if the active stream really queued it.
        const next = retainNativeProduct(view);
        try {
          retainNativeProduct(message);
          if (!this.write(stream, message) || !this.registered(stream)) return;
          this.clearBaseline(stream);
          stream.view = next;
        } finally {
          if (stream.view !== next) releaseNativeProduct(next);
        }
      },
      this.execution,
      stream.abort.signal,
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

  /** Keep one real notification (or one explicit drain/retry) pending for
   * each stream. Completing a publication never creates new demand.
   * docs/projects/native-runtime-foundations-tech-design.md#11-multiplayer-update-delivery */
  private pending(stream: Stream): void {
    if (
      !this.registered(stream) ||
      stream.busy ||
      stream.blocked ||
      (!stream.due && stream.claimed >= this.notification)
    )
      return;
    const scan = this.scan;
    if (
      scan &&
      stream.sequence > scan.visited &&
      stream.sequence <= scan.through &&
      (stream.due || stream.claimed < scan.target)
    )
      return;
    this.schedule();
  }

  private settled(stream: Stream): void {
    stream.busy = false;
    if (this.registered(stream)) this.pending(stream);
    else stream.memory.release();
  }

  private schedule(): void {
    if (this.closed || !this.streams.size) return;
    this.requested = true;
    this.arm();
  }

  private arm(): void {
    if (this.closed || this.wake || this.scan || !this.requested || !this.streams.size) return;
    this.wake = setTimeout(
      () => {
        this.wake = undefined;
        if (this.closed || !this.streams.size) return;
        this.requested = false;
        this.nextPublicationAt = performance.now() + 50;
        const target = this.notification;
        if (this.streams.size === 1 && this.periodic.size < this.service.playerProjectionWidth) {
          const stream = this.streams.values().next().value;
          if (stream) this.claim(stream, target);
          return;
        }
        this.scan = { iterator: this.streams.values(), through: this.sequence, target, visited: 0 };
        this.pump();
      },
      Math.max(0, this.nextPublicationAt - performance.now()),
    );
    this.wake.unref();
  }

  private pump(): void {
    const scan = this.scan;
    if (!scan || this.closed) return;
    while (this.periodic.size < this.service.playerProjectionWidth) {
      // Advance before launching. The Map iterator excludes removed streams;
      // the cutoff keeps connections registered later in their own bootstrap.
      const step = scan.iterator.next();
      if (step.done || step.value.sequence > scan.through) {
        this.scan = undefined;
        this.arm();
        return;
      }
      const stream = step.value;
      scan.visited = stream.sequence;
      this.claim(stream, scan.target);
    }
  }

  private claim(stream: Stream, target: number): void {
    if (
      !this.current(stream) ||
      stream.busy ||
      stream.blocked ||
      (!stream.due && stream.claimed >= target)
    )
      return;
    stream.claimed = target;
    stream.due = false;
    stream.busy = true;
    const task = this.publish(stream)
      .catch((error: unknown) => {
        if (!this.registered(stream) || error instanceof ViewChangedError) return;
        if (isOverloadError(error)) {
          stream.due = true;
          return;
        }
        if (!(error instanceof AuthorityError))
          console.error('Native player publication failed.', error);
        stream.response.destroy();
        this.drop(stream);
      })
      .finally(() => {
        this.periodic.delete(task);
        this.settled(stream);
        this.pump();
      });
    this.periodic.add(task);
  }

  async close(): Promise<void> {
    let endError: unknown;
    if (!this.closed) {
      this.closed = true;
      this.retirement.abort(new ViewChangedError());
      clearTimeout(this.wake);
      clearInterval(this.heartbeat);
      this.unsubscribe();
      this.scan = undefined;
      for (const stream of this.streams.values()) {
        try {
          if (stream.blocked) stream.response.destroy();
          else stream.response.end();
        } catch (error) {
          endError ??= error;
          stream.response.destroy();
        } finally {
          this.drop(stream);
        }
      }
    }
    await Promise.allSettled([...this.periodic, ...this.requests]);
    if (endError) throw endError;
  }
}
