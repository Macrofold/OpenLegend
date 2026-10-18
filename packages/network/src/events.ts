import { NetworkError, networkError } from './errors.js';
import {
  consumeFramedHttp,
  openHttp,
  type ConsumeStep,
  type HttpBytes,
  type HttpConsumer,
  type HttpRequest,
} from './http.js';
import {
  callConsumer,
  scopeOf,
  validateDuration,
  type ConsumptionContext,
  type NetworkOperation,
} from './operation.js';
import type { NetworkOwner } from './owner.js';

export interface EventFrame {
  kind: 'event' | 'comment';
  event: string;
  data: string;
  id?: string;
}

export type EventFramePolicy =
  | { kind: 'bounded'; maxFrameBytes: number }
  | { kind: 'complete-projection'; owner: 'game-events' };

/** Incremental UTF-8/SSE framing; comments renew liveness only after their blank line. */
export class SSEFramer {
  private readonly decoder = new TextDecoder('utf-8', { fatal: true });
  private readonly encoder = new TextEncoder();
  private lineParts: string[] = [];
  private data: string[] = [];
  private comments: string[] = [];
  private event = '';
  private id: string | undefined;
  private frameBytes = 0;
  private pendingCr = false;
  private finished = false;
  private incomplete = false;

  constructor(private readonly policy: EventFramePolicy) {
    if (policy.kind === 'complete-projection' && policy.owner !== 'game-events') {
      throw new TypeError('Complete event projections require their reviewed owner');
    }
    if (
      policy.kind === 'bounded' &&
      (!Number.isSafeInteger(policy.maxFrameBytes) || policy.maxFrameBytes <= 0)
    ) {
      throw new RangeError('Event frame allowance must be a positive safe integer');
    }
  }

  push(bytes: Uint8Array): EventFrame[] {
    if (this.finished) throw new NetworkError('operation_closed', 'body', 'started');
    try {
      return this.text(this.decoder.decode(bytes, { stream: true }));
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError('invalid_encoding', 'body', 'started');
    }
  }

  finish(): EventFrame[] {
    if (this.finished) return [];
    this.finished = true;
    try {
      const frames = this.text(this.decoder.decode());
      if (this.pendingCr) {
        this.pendingCr = false;
        this.append('', 1);
        this.line(frames);
      }
      this.incomplete = this.frameBytes > 0;
      // SSE requires a blank line. An incomplete final event is never a result.
      this.lineParts = [];
      this.data = [];
      this.comments = [];
      return frames;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError('invalid_encoding', 'body', 'started');
    }
  }

  get hasIncompleteFrame(): boolean {
    return this.incomplete || this.frameBytes > 0;
  }

  private text(text: string): EventFrame[] {
    const frames: EventFrame[] = [];
    let segment = 0;
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (this.pendingCr) {
        this.pendingCr = false;
        this.append('', character === '\n' ? 2 : 1);
        this.line(frames);
        if (character === '\n') {
          segment = index + 1;
          continue;
        }
      }
      if (character !== '\n' && character !== '\r') continue;
      this.append(text.slice(segment, index), character === '\r' ? 0 : 1);
      if (character === '\r') this.pendingCr = true;
      else this.line(frames);
      segment = index + 1;
    }
    if (segment < text.length) this.append(text.slice(segment), 0);
    return frames;
  }

  private append(text: string, delimiterBytes: number): void {
    this.frameBytes += this.encoder.encode(text).byteLength + delimiterBytes;
    if (this.policy.kind === 'bounded' && this.frameBytes > this.policy.maxFrameBytes) {
      throw new NetworkError('body_too_large', 'body', 'started');
    }
    if (text) this.lineParts.push(text);
  }

  private line(frames: EventFrame[]): void {
    const line = this.lineParts.join('');
    this.lineParts = [];
    if (line === '') {
      if (this.data.length > 0) {
        frames.push({
          kind: 'event',
          event: this.event || 'message',
          data: this.data.join('\n'),
          ...(this.id === undefined ? {} : { id: this.id }),
        });
      } else if (this.comments.length > 0) {
        frames.push({ kind: 'comment', event: '', data: this.comments.join('\n') });
      }
      this.data = [];
      this.comments = [];
      this.event = '';
      this.frameBytes = 0;
      return;
    }
    if (line.startsWith(':')) {
      this.comments.push(line.slice(line[1] === ' ' ? 2 : 1));
      return;
    }
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.data.push(value);
    else if (field === 'event') this.event = value;
    else if (field === 'id' && !value.includes('\0')) this.id = value;
  }
}

export interface FiniteEventRequest extends Omit<HttpRequest, 'bodyPolicy'> {
  framePolicy: { kind: 'bounded'; maxFrameBytes: number };
  /** Preserve an existing cumulative bound where the provider contract supplies one. */
  cumulativeMaxBytes?: number;
}

export interface EventConsumer<T> {
  headers(metadata: Omit<HttpBytes, 'bytes'>, context: ConsumptionContext): void;
  event(frame: EventFrame, context: ConsumptionContext): ConsumeStep<T> | Promise<ConsumeStep<T>>;
  end(context: ConsumptionContext): T | Promise<T>;
  idle?: HttpConsumer<T>['idle'];
}

/** Finite provider SSE: per-frame memory is bounded without inventing a total Run limit. */
export function consumeEventStream<T>(
  operation: NetworkOperation,
  request: FiniteEventRequest,
  consumer: EventConsumer<T>,
): Promise<T> {
  const framer = new SSEFramer(request.framePolicy);
  if (
    request.cumulativeMaxBytes !== undefined &&
    (!Number.isSafeInteger(request.cumulativeMaxBytes) || request.cumulativeMaxBytes < 0)
  ) {
    throw new RangeError('Cumulative event allowance must be a nonnegative safe integer');
  }
  let total = 0;
  const frames = async (
    values: EventFrame[],
    context: ConsumptionContext,
  ): Promise<ConsumeStep<T>> => {
    for (const frame of values) {
      context.throwIfStopped();
      const step = await consumer.event(frame, context);
      context.throwIfStopped();
      if (step.kind === 'complete') return step;
    }
    return { kind: 'continue' };
  };
  return consumeFramedHttp(
    operation,
    {
      ...request,
      bodyPolicy: { kind: 'bounded', maxBytes: request.framePolicy.maxFrameBytes },
    },
    {
      headers(metadata, context) {
        consumer.headers(metadata, context);
        if (
          metadata.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
          'text/event-stream'
        ) {
          throw new NetworkError('invalid_stream', 'connect', 'started', metadata.status);
        }
      },
      async chunk(bytes, context) {
        total += bytes.byteLength;
        if (request.cumulativeMaxBytes !== undefined && total > request.cumulativeMaxBytes) {
          throw new NetworkError('body_too_large', 'body', 'started');
        }
        return frames(framer.push(bytes), context);
      },
      async end(context) {
        const step = await frames(framer.finish(), context);
        if (step.kind === 'complete') return step.value;
        if (framer.hasIncompleteFrame) throw new NetworkError('invalid_stream', 'body', 'started');
        return consumer.end(context);
      },
      idle: consumer.idle,
    },
  );
}

export type SubscriptionResult =
  | { reason: 'closed' | 'stream_ended' }
  | {
      reason: 'connection_failed';
      failure: { kind: 'http_status'; status: number } | { kind: 'transport'; error: NetworkError };
    }
  | { reason: 'liveness_expired'; error: NetworkError };

export interface Subscription {
  close(): void;
  done: Promise<SubscriptionResult>;
}

export interface SubscriptionOptions {
  mode: 'subscription';
  url: string | URL;
  init?: RequestInit;
  signal: AbortSignal;
  connectTimeoutMs: number;
  heartbeatTimeoutMs: number;
  framePolicy: EventFramePolicy;
}

export function subscribeEvents(
  owner: NetworkOwner,
  options: SubscriptionOptions,
  consume: (frame: EventFrame, context: ConsumptionContext) => void | Promise<void>,
): Subscription {
  validateDuration(options.connectTimeoutMs);
  validateDuration(options.heartbeatTimeoutMs);
  if (
    options.mode !== 'subscription' ||
    options.init?.body != null ||
    (options.init?.method ?? 'GET').toUpperCase() !== 'GET'
  ) {
    throw new TypeError('Subscriptions require a bodyless GET');
  }
  const controller = new AbortController();
  const { body: _body, ...requestInit } = options.init ?? {};
  let closed = false;
  let connected = false;
  const externalStop = () => controller.abort();
  options.signal.addEventListener('abort', externalStop, { once: true });
  options.init?.signal?.addEventListener('abort', externalStop, { once: true });
  if (options.signal.aborted || options.init?.signal?.aborted) controller.abort();
  const done: Promise<SubscriptionResult> = owner
    .run(
      { timeoutMs: options.connectTimeoutMs, signal: controller.signal },
      async (operation): Promise<SubscriptionResult> => {
        const scope = scopeOf(operation);
        const owned = await openHttp(operation, {
          url: options.url,
          init: requestInit,
          bodyPolicy: { kind: 'complete-projection', owner: 'game-events' },
        });
        try {
          const response = owned.response;
          if (response.status !== 200) {
            return {
              reason: 'connection_failed',
              failure: { kind: 'http_status', status: response.status },
            };
          }
          const mime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
          if (mime !== 'text/event-stream' || !response.body) {
            throw new NetworkError('invalid_stream', 'connect', 'started', response.status);
          }
          connected = true;
          scope.renewWindow(options.heartbeatTimeoutMs);
          const reader = response.body.getReader();
          owned.setReader(reader);
          const framer = new SSEFramer(options.framePolicy);
          for (;;) {
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
              result = await operation.wait('body', () => reader.read());
            } catch (error) {
              owned.terminalReadError(error);
              throw error;
            }
            operation.throwIfStopped();
            const frames = result.done ? framer.finish() : framer.push(result.value);
            for (const frame of frames) {
              operation.throwIfStopped();
              scope.renewWindow(options.heartbeatTimeoutMs);
              await callConsumer(operation, (context) => consume(frame, context));
            }
            if (result.done) {
              owned.naturalEnd();
              return { reason: 'stream_ended' };
            }
          }
        } finally {
          owned.cancel();
        }
      },
    )
    .catch((error: unknown): SubscriptionResult => {
      const failure = networkError(error, connected ? 'body' : 'connect', 'started');
      if (failure.kind === 'capacity_unavailable') throw failure;
      if (closed || options.signal.aborted || failure.kind === 'cancelled')
        return { reason: 'closed' };
      if (connected && failure.kind === 'deadline_exceeded')
        return { reason: 'liveness_expired', error: failure };
      return { reason: 'connection_failed', failure: { kind: 'transport', error: failure } };
    })
    .finally(() => {
      options.signal.removeEventListener('abort', externalStop);
      options.init?.signal?.removeEventListener('abort', externalStop);
    });
  return {
    close() {
      if (closed) return;
      closed = true;
      controller.abort();
    },
    done,
  };
}
