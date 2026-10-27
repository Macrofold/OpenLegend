import { Readable, Writable } from 'node:stream';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createNetworkOwner } from './owner.js';
import { NetworkError } from './errors.js';
import { consumeHttp, requestBytes, requestText } from './http.js';
import { SSEFramer, subscribeEvents, consumeEventStream } from './events.js';
import {
  consumeHttpReadable,
  consumeSdkReadable,
  ownNodeStream,
  pipeOwned,
  runRemoteProcess,
  waitForOperationResources,
  waitSdkValue,
} from './node.js';
import type { NetworkClock, NetworkOperation, NetworkScheduler } from './operation.js';

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let turn = 0; turn < 15; turn++) await Promise.resolve();
}

class ManualTime implements NetworkClock, NetworkScheduler {
  wall = 10_000;
  mono = 0;
  next = 0;
  timers = new Map<number, { at: number; callback: () => void }>();
  wallNow = () => this.wall;
  monotonicNow = () => this.mono;
  schedule = (delay: number, callback: () => void) => {
    const id = this.next++;
    this.timers.set(id, { at: this.mono + delay, callback });
    return () => {
      this.timers.delete(id);
    };
  };
  advance(ms: number) {
    this.wall += ms;
    this.mono += ms;
    for (const [id, timer] of [...this.timers]) {
      if (timer.at <= this.mono) {
        this.timers.delete(id);
        timer.callback();
      }
    }
  }
}

const policy = { kind: 'bounded' as const, maxBytes: 1_024 };
const encoder = new TextEncoder();

describe('finite network ownership', () => {
  it('does not invoke work or dispatch for an already-expired budget', async () => {
    const time = new ManualTime();
    let starts = 0;
    const owner = createNetworkOwner({ role: 'test', capacity: 1, clock: time, scheduler: time });
    await expect(
      owner.run({ timeoutMs: 50, deadlineAtMs: time.wall }, async () => {
        starts++;
      }),
    ).rejects.toMatchObject({ kind: 'deadline_exceeded', dispatch: 'not_started' });
    expect(starts).toBe(0);
    expect(owner.snapshot().occupied).toBe(0);
    expect(time.timers.size).toBe(0);
  });

  it('ends ignored cancellation while repeated attempts plateau at capacity', async () => {
    const time = new ManualTime();
    let starts = 0;
    const raw = deferred<Response>();
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: () => {
        starts++;
        return raw.promise;
      },
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      requestBytes(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    for (let attempt = 0; attempt < 1_000; attempt++) {
      await expect(owner.run({ timeoutMs: 10 }, async () => {})).rejects.toMatchObject({
        kind: 'capacity_unavailable',
        dispatch: 'not_started',
      });
    }
    expect(starts).toBe(1);
    expect(owner.snapshot()).toMatchObject({ occupied: 1, unsettled: 1 });
    raw.reject(new Error('late secret transport error'));
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
    expect(time.timers.size).toBe(0);
  });

  it('does not hold another independently created role', async () => {
    const time = new ManualTime();
    const stalled = createNetworkOwner({
      role: 'reads',
      capacity: 1,
      clock: time,
      scheduler: time,
    });
    const controls = createNetworkOwner({
      role: 'controls',
      capacity: 1,
      clock: time,
      scheduler: time,
    });
    const pending = stalled.run({ timeoutMs: 10 }, (operation) =>
      operation.wait('connect', () => new Promise<never>(() => {})),
    );
    const rejection = expect(pending).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    await expect(controls.run({ timeoutMs: 10 }, async () => 'logout')).resolves.toBe('logout');
  });

  it('retains an unfinished outer callback after its local timeout', async () => {
    const time = new ManualTime();
    const raw = deferred<string>();
    const owner = createNetworkOwner({ role: 'test', capacity: 1, clock: time, scheduler: time });
    const result = owner.run({ timeoutMs: 10 }, () => raw.promise);
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    expect(owner.snapshot().occupied).toBe(1);
    raw.resolve('late');
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('rejects retained successful and failed operation handles', async () => {
    const owner = createNetworkOwner({ role: 'test', capacity: 1 });
    let handle: NetworkOperation | undefined;
    await owner.run({ timeoutMs: 1_000 }, async (operation) => {
      handle = operation;
      return 1;
    });
    expect(() => handle?.throwIfStopped()).toThrowError(NetworkError);
    await expect(handle?.wait('connect', async () => 2)).rejects.toMatchObject({
      kind: 'operation_closed',
    });
  });

  it('closes a successfully returned shorter scope and cancels its detached child', async () => {
    const owner = createNetworkOwner({ role: 'parent', capacity: 1 });
    const childOwner = createNetworkOwner({ role: 'child', capacity: 1 });
    let childResult: Promise<number> | undefined;
    const raw = deferred<number>();
    await owner.run({ timeoutMs: 1_000 }, async (parent) => {
      childResult = childOwner.run({ parent, timeoutMs: 1_000 }, (child) =>
        child.wait('connect', () => raw.promise),
      );
      void childResult.catch(() => {});
      return 'parent complete';
    });
    await expect(childResult).rejects.toMatchObject({ kind: 'operation_closed' });
    expect(owner.snapshot().occupied).toBe(1);
    raw.resolve(1);
    await flush();
    expect(childOwner.snapshot().occupied).toBe(0);
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('checks wall expiry after browser suspension without waiting for its timer', async () => {
    const time = new ManualTime();
    const raw = deferred<number>();
    const owner = createNetworkOwner({ role: 'test', capacity: 1, clock: time, scheduler: time });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      operation.wait('connect', () => raw.promise),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.wall += 20;
    raw.resolve(42);
    await rejection;
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('inherits both parent clocks after wall-clock rollback', async () => {
    const time = new ManualTime();
    const parentOwner = createNetworkOwner({
      role: 'parent',
      capacity: 1,
      clock: time,
      scheduler: time,
    });
    const childOwner = createNetworkOwner({
      role: 'child',
      capacity: 1,
      clock: time,
      scheduler: time,
    });
    const raw = deferred<number>();
    const result = parentOwner.run({ timeoutMs: 10 }, async (parent) => {
      time.wall -= 5_000;
      return childOwner.run({ parent, timeoutMs: 1_000 }, (child) =>
        child.wait('connect', () => raw.promise),
      );
    });
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    expect(parentOwner.snapshot().occupied).toBe(1);
    expect(childOwner.snapshot().occupied).toBe(1);
    raw.resolve(1);
    await flush();
    expect(parentOwner.snapshot().occupied).toBe(0);
    expect(childOwner.snapshot().occupied).toBe(0);
  });

  it('keeps a short phase closed while allowing an eligible parent to continue', async () => {
    const owner = createNetworkOwner({ role: 'test', capacity: 1 });
    let phase: NetworkOperation | undefined;
    await expect(
      owner.run({ timeoutMs: 1_000 }, async (operation) => {
        await operation.within(100, async (child) => {
          phase = child;
          return 1;
        });
        expect(() => phase?.throwIfStopped()).toThrowError(NetworkError);
        return operation.wait('connect', async () => 2);
      }),
    ).resolves.toBe(2);
  });

  it('keeps the first cancellation cause and does not mark local preparation dispatched', async () => {
    const time = new ManualTime();
    const controller = new AbortController();
    const raw = deferred<number>();
    const owner = createNetworkOwner({ role: 'test', capacity: 1, clock: time, scheduler: time });
    const result = owner.run({ timeoutMs: 10, signal: controller.signal }, (operation) =>
      operation.wait('admission', () => raw.promise),
    );
    const rejection = expect(result).rejects.toMatchObject({
      kind: 'cancelled',
      dispatch: 'not_started',
    });
    controller.abort();
    time.advance(20);
    raw.resolve(1);
    await rejection;
  });
});

describe('owned HTTP bodies', () => {
  it('disposes a late response exactly once and retains its original cleanup', async () => {
    const time = new ManualTime();
    const raw = deferred<Response>();
    const cleanup = deferred<void>();
    let cancellations = 0;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          cancellations++;
          return cleanup.promise;
        },
      }),
    );
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: () => raw.promise,
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      requestBytes(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    raw.resolve(response);
    await flush();
    expect(cancellations).toBe(1);
    expect(owner.snapshot().occupied).toBe(1);
    cleanup.resolve();
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('returns a terminal streamed result while cleanup remains physically pending', async () => {
    const cleanup = deferred<void>();
    let cancellations = 0;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('done'));
        },
        cancel() {
          cancellations++;
          return cleanup.promise;
        },
      }),
    );
    const owner = createNetworkOwner({ role: 'test', capacity: 1, fetch: async () => response });
    const value = await owner.run({ timeoutMs: 1_000 }, (operation) =>
      consumeHttp(
        operation,
        { url: 'https://example.invalid', bodyPolicy: policy },
        {
          headers() {},
          chunk() {
            return { kind: 'complete', value: 'accepted' };
          },
          end() {
            return 'unexpected EOF';
          },
        },
      ),
    );
    expect(value).toBe('accepted');
    expect(cancellations).toBe(1);
    expect(owner.snapshot().occupied).toBe(1);
    cleanup.resolve();
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('does not mistake cancellation-created EOF for finished underlying cleanup', async () => {
    const time = new ManualTime();
    const cleanup = deferred<void>();
    let cancellations = 0;
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            cancel() {
              cancellations++;
              return cleanup.promise;
            },
          }),
        ),
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      requestBytes(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    await flush();
    time.advance(10);
    await rejection;
    await flush();
    expect(cancellations).toBe(1);
    expect(owner.snapshot().occupied).toBe(1);
    cleanup.resolve();
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('retains unknown cancellation failure rather than refunding its slot', async () => {
    const time = new ManualTime();
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            cancel() {
              throw new Error('unknown cleanup');
            },
          }),
        ),
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      requestBytes(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    await flush();
    time.advance(10);
    await rejection;
    await flush();
    expect(owner.snapshot()).toMatchObject({ occupied: 1, quarantined: 1 });
  });

  it('retires an ordinary abort when its underlying fetch rejects', async () => {
    const time = new ManualTime();
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      requestBytes(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('preserves observed status when an error body stalls', async () => {
    const time = new ManualTime();
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: async () => new Response(new ReadableStream(), { status: 429 }),
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      requestBytes(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
    );
    const rejection = expect(result).rejects.toMatchObject({
      kind: 'deadline_exceeded',
      status: 429,
    });
    await flush();
    time.advance(10);
    await rejection;
  });

  it('enforces declared/actual/exact bytes and fatal UTF-8 without losing HTTP status', async () => {
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 2,
      fetch: async (url) =>
        url.endsWith('declared')
          ? new Response('x', { status: 400, headers: { 'content-length': '9999' } })
          : new Response(new Uint8Array([0xff])),
    });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        requestBytes(operation, { url: 'https://example.invalid/declared', bodyPolicy: policy }),
      ),
    ).rejects.toMatchObject({ kind: 'body_too_large', status: 400 });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        requestText(operation, { url: 'https://example.invalid/encoding', bodyPolicy: policy }),
      ),
    ).rejects.toMatchObject({ kind: 'invalid_encoding', status: 200 });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        requestBytes(operation, {
          url: 'https://example.invalid/exact',
          bodyPolicy: { kind: 'bounded', maxBytes: 10, exactBytes: 2 },
        }),
      ),
    ).rejects.toMatchObject({ kind: 'body_length_mismatch', status: 200 });
  });

  it('does not compare compressed wire length to decoded exact bytes', async () => {
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      fetch: async () =>
        new Response('ok', { headers: { 'content-length': '12', 'content-encoding': 'gzip' } }),
    });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        requestText(operation, {
          url: 'https://example.invalid',
          bodyPolicy: { kind: 'bounded', maxBytes: 2, exactBytes: 2 },
        }),
      ),
    ).resolves.toMatchObject({ text: 'ok' });
  });

  it('guards required callbacks and closes their retained publication context', async () => {
    const time = new ManualTime();
    const callback = deferred<{ kind: 'complete'; value: string }>();
    let retained: { throwIfStopped(): void } | undefined;
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: async () => new Response('x'),
    });
    const result = owner.run({ timeoutMs: 10 }, (operation) =>
      consumeHttp(
        operation,
        { url: 'https://example.invalid', bodyPolicy: policy },
        {
          headers() {},
          chunk(_bytes, context) {
            retained = context;
            return callback.promise;
          },
          end() {
            return 'EOF';
          },
        },
      ),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    await flush();
    time.advance(10);
    await rejection;
    expect(() => retained?.throwIfStopped()).toThrowError(NetworkError);
    expect(owner.snapshot().occupied).toBe(1);
    callback.resolve({ kind: 'complete', value: 'late' });
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('observes consumed bytes once and isolates diagnostic mutation and rejection', async () => {
    let observed = 0;
    const owner = createNetworkOwner({
      role: 'test',
      capacity: 1,
      fetch: async () => new Response('ok'),
      onExchange(exchange) {
        observed++;
        expect(new TextDecoder().decode(exchange.bytes)).toBe('ok');
        exchange.bytes?.fill(0);
        throw new Error('diagnostic');
      },
    });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        requestText(operation, { url: 'https://example.invalid', bodyPolicy: policy }),
      ),
    ).resolves.toMatchObject({ text: 'ok' });
    expect(observed).toBe(1);
  });
});

describe('SSE framing and continuous liveness', () => {
  it('counts CRLF bytes in a frame and does not grant a comment heartbeat for a partial frame', () => {
    const exact = new SSEFramer({ kind: 'bounded', maxFrameBytes: 11 });
    expect(exact.push(encoder.encode(': alive\r\n\r\n'))).toHaveLength(1);
    const small = new SSEFramer({ kind: 'bounded', maxFrameBytes: 10 });
    expect(() => small.push(encoder.encode(': alive\r\n\r\n'))).toThrowError(NetworkError);
  });

  it('consumes a finite per-frame stream larger than one frame without buffering its history', async () => {
    const owner = createNetworkOwner({
      role: 'events',
      capacity: 1,
      fetch: async () =>
        new Response('data: ok\n\n'.repeat(200), {
          headers: { 'content-type': 'text/event-stream' },
        }),
    });
    let count = 0;
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        consumeEventStream(
          operation,
          { url: 'https://example.invalid', framePolicy: { kind: 'bounded', maxFrameBytes: 12 } },
          {
            headers() {},
            event() {
              count++;
              return { kind: 'continue' };
            },
            end() {
              return count;
            },
          },
        ),
      ),
    ).resolves.toBe(200);
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('bounds idle callbacks under the same original operation without another body read', async () => {
    const time = new ManualTime();
    const callback = deferred<void>();
    let ticks = 0;
    const owner = createNetworkOwner({
      role: 'events',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: async () =>
        new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } }),
    });
    const result = owner.run({ timeoutMs: 30 }, (operation) =>
      consumeEventStream<void>(
        operation,
        { url: 'https://example.invalid', framePolicy: { kind: 'bounded', maxFrameBytes: 12 } },
        {
          headers() {},
          event() {
            return { kind: 'continue' };
          },
          end() {},
          idle: {
            intervalMs: 10,
            consume() {
              ticks++;
              return callback.promise;
            },
          },
        },
      ),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    await flush();
    time.advance(10);
    await flush();
    expect(ticks).toBe(1);
    time.advance(20);
    await rejection;
    expect(owner.snapshot().occupied).toBe(1);
    callback.resolve();
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
    expect(time.timers.size).toBe(0);
  });

  it('handles split UTF-8, CR/LF, multiline data and comments; drops incomplete EOF', () => {
    const framer = new SSEFramer({ kind: 'bounded', maxFrameBytes: 1_024 });
    const bytes = encoder.encode(
      ': heartbeat\r\n\r\nevent: snapshot\ndata: 😀\rdata: two\r\nid: 7\r\n\r\ndata: unfinished',
    );
    const frames = [];
    for (const byte of bytes) frames.push(...framer.push(new Uint8Array([byte])));
    frames.push(...framer.finish());
    expect(frames).toEqual([
      { kind: 'comment', event: '', data: 'heartbeat' },
      { kind: 'event', event: 'snapshot', data: '😀\ntwo', id: '7' },
    ]);
  });

  it('bounds incomplete frames but permits many complete bounded frames', () => {
    const framer = new SSEFramer({ kind: 'bounded', maxFrameBytes: 12 });
    for (let index = 0; index < 100; index++)
      expect(framer.push(encoder.encode('data: ok\n\n'))).toHaveLength(1);
    expect(() => framer.push(encoder.encode('data: too long'))).toThrowError(NetworkError);
  });

  it('renews liveness from complete comments and expires partial trickle', async () => {
    const time = new ManualTime();
    let stream: ReadableStreamDefaultController<Uint8Array> | undefined;
    const owner = createNetworkOwner({
      role: 'subscriptions',
      capacity: 1,
      clock: time,
      scheduler: time,
      fetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(value) {
              stream = value;
            },
          }),
          { headers: { 'content-type': 'Text/Event-Stream; charset=utf-8' } },
        ),
    });
    let frames = 0;
    const subscription = subscribeEvents(
      owner,
      {
        mode: 'subscription',
        url: 'https://example.invalid',
        signal: new AbortController().signal,
        connectTimeoutMs: 10,
        heartbeatTimeoutMs: 45,
        framePolicy: { kind: 'bounded', maxFrameBytes: 100 },
      },
      () => {
        frames++;
      },
    );
    await flush();
    time.advance(30);
    stream?.enqueue(encoder.encode(': alive\n\n'));
    await flush();
    expect(frames).toBe(1);
    time.advance(30);
    stream?.enqueue(encoder.encode('data: incomplete'));
    await flush();
    time.advance(15);
    await expect(subscription.done).resolves.toMatchObject({ reason: 'liveness_expired' });
  });

  it('preserves non-success HTTP status and validates stream content type', async () => {
    for (const status of [204, 401, 403, 503]) {
      const owner = createNetworkOwner({
        role: 'subscriptions',
        capacity: 1,
        fetch: async () => new Response(null, { status }),
      });
      const subscription = subscribeEvents(
        owner,
        {
          mode: 'subscription',
          url: 'https://example.invalid',
          signal: new AbortController().signal,
          connectTimeoutMs: 100,
          heartbeatTimeoutMs: 100,
          framePolicy: { kind: 'bounded', maxFrameBytes: 100 },
        },
        () => {},
      );
      await expect(subscription.done).resolves.toMatchObject({
        reason: 'connection_failed',
        failure: { kind: 'http_status', status },
      });
    }
    const owner = createNetworkOwner({
      role: 'subscriptions',
      capacity: 1,
      fetch: async () => new Response('bad', { headers: { 'content-type': 'text/plain' } }),
    });
    const subscription = subscribeEvents(
      owner,
      {
        mode: 'subscription',
        url: 'https://example.invalid',
        signal: new AbortController().signal,
        connectTimeoutMs: 100,
        heartbeatTimeoutMs: 100,
        framePolicy: { kind: 'bounded', maxFrameBytes: 100 },
      },
      () => {},
    );
    await expect(subscription.done).resolves.toMatchObject({
      reason: 'connection_failed',
      failure: { kind: 'transport', error: { kind: 'invalid_stream', status: 200 } },
    });
  });
});

describe('Node resource ownership', () => {
  it.each(['buffered', 'node', 'subscription'] as const)(
    'honors earlier request cancellation in %s even when transport ignores it',
    async (kind) => {
      const time = new ManualTime();
      const raw = deferred<Response>();
      const request = new AbortController();
      let consumed = 0;
      let settled = false;
      const owner = createNetworkOwner({
        role: 'node-http',
        capacity: 1,
        clock: time,
        scheduler: time,
        fetch: () => raw.promise,
      });
      const http = {
        url: 'https://example.invalid',
        init: { signal: request.signal },
        bodyPolicy: policy,
      };
      const pending: Promise<unknown> =
        kind === 'subscription'
          ? subscribeEvents(
              owner,
              {
                mode: 'subscription',
                url: http.url,
                init: http.init,
                signal: new AbortController().signal,
                connectTimeoutMs: 100,
                heartbeatTimeoutMs: 100,
                framePolicy: { kind: 'bounded', maxFrameBytes: 100 },
              },
              () => {
                consumed++;
              },
            ).done
          : owner.run<unknown>({ timeoutMs: 100 }, (operation) =>
              kind === 'buffered'
                ? requestBytes(operation, http)
                : consumeHttpReadable(
                    operation,
                    http,
                    () => undefined,
                    async () => {
                      consumed++;
                    },
                  ),
            );
      const result = pending.then(
        (value) => {
          settled = true;
          return value;
        },
        (error: unknown) => {
          settled = true;
          return error;
        },
      );
      request.abort();
      await flush();
      try {
        expect(settled).toBe(true);
        expect(await result).toMatchObject(
          kind === 'subscription' ? { reason: 'closed' } : { kind: 'cancelled' },
        );
        expect(owner.snapshot()).toMatchObject({ occupied: 1, unsettled: 1 });
      } finally {
        raw.resolve(new Response('late'));
        await flush();
        owner.stop('owner_disposed');
      }
      expect(consumed).toBe(0);
      expect(owner.snapshot().occupied).toBe(0);
      expect(time.timers.size).toBe(0);
    },
  );

  it('preserves SDK-specific rejection and ignores late scalar success', async () => {
    const owner = createNetworkOwner({ role: 'sdk', capacity: 1 });
    const rejection = Object.assign(new Error('specific'), { status: 412 });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        waitSdkValue(operation, 'credentials', () => Promise.reject(rejection)),
      ),
    ).rejects.toBe(rejection);
  });

  it('destroys a late SDK body and never starts its file consumer', async () => {
    const time = new ManualTime();
    const result = deferred<{ body: Readable }>();
    let consumes = 0;
    let operation: NetworkOperation | undefined;
    const owner = createNetworkOwner({ role: 'sdk', capacity: 1, clock: time, scheduler: time });
    const pending = owner.run({ timeoutMs: 10 }, (value) => {
      operation = value;
      return consumeSdkReadable(
        value,
        () => result.promise,
        (response) => ({ source: response.body, metadata: 1 }),
        async () => {
          consumes++;
          return 1;
        },
      );
    });
    const rejection = expect(pending).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    const body = new Readable({ read() {} });
    result.resolve({ body });
    await new Promise<void>((resolve) => body.once('close', resolve));
    if (!operation) throw new Error('missing operation');
    await waitForOperationResources(operation);
    expect(consumes).toBe(0);
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
    expect(body.listenerCount('error')).toBe(0);
    expect(body.listenerCount('end')).toBe(0);
    expect(body.listenerCount('finish')).toBe(0);
  });

  it('retains an owned sink until actual close and counts exact pipeline bytes', async () => {
    const owner = createNetworkOwner({ role: 'pipe', capacity: 1 });
    const chunks: Uint8Array[] = [];
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        pipeOwned(
          operation,
          Readable.from([Buffer.from('abc')]),
          new Writable({
            write(chunk: Buffer, _encoding, callback) {
              chunks.push(chunk);
              callback();
            },
          }),
          { maxBytes: 3, exactBytes: 3 },
        ),
      ),
    ).resolves.toBe(3);
    expect(Buffer.concat(chunks).toString()).toBe('abc');
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('does not treat destroy requested as observed descriptor closure', async () => {
    const time = new ManualTime();
    const closure = deferred<void>();
    let node: ReturnType<typeof ownNodeStream> | undefined;
    const source = new Readable({
      read() {},
      destroy(_error, callback) {
        void closure.promise.then(() => callback());
      },
    });
    const owner = createNetworkOwner({ role: 'pipe', capacity: 1, clock: time, scheduler: time });
    const pending = owner.run({ timeoutMs: 10 }, async (operation) => {
      node = ownNodeStream(operation, source);
      for (let adoption = 0; adoption < 1_000; adoption++)
        expect(ownNodeStream(operation, source)).toBe(node);
      expect(source.listenerCount('close')).toBe(1);
      expect(() => ownNodeStream(operation, source, { requireClose: false })).toThrowError(
        'cannot change its closure evidence',
      );
      await waitForOperationResources(operation, { bounded: true });
    });
    const rejection = expect(pending).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    time.advance(10);
    await rejection;
    expect(source.destroyed).toBe(true);
    expect(source.closed).toBe(false);
    expect(owner.snapshot().occupied).toBe(1);
    closure.resolve();
    await node?.closed;
    await flush();
    expect(owner.snapshot().occupied).toBe(0);
  });

  it('bounds remote subprocess waiting and retains the child through observed exit', async () => {
    const owner = createNetworkOwner({ role: 'process', capacity: 1 });
    await expect(
      owner.run({ timeoutMs: 1_000 }, (operation) =>
        runRemoteProcess(operation, {
          command: process.execPath,
          args: ['-e', 'process.stdout.write("ready")'],
        }),
      ),
    ).resolves.toMatchObject({ exitCode: 0, stdout: 'ready' });
    const directory = mkdtempSync(join(tmpdir(), 'openlegend-owned-child-'));
    const ready = join(directory, 'ready'),
      terminated = join(directory, 'terminated');
    const time = new ManualTime();
    const hanging = createNetworkOwner({
      role: 'process',
      capacity: 1,
      clock: time,
      scheduler: time,
    });
    const result = hanging.run({ timeoutMs: 10 }, (operation) =>
      runRemoteProcess(operation, {
        command: process.execPath,
        args: [
          '-e',
          'const fs=require("node:fs");process.on("SIGTERM",()=>fs.writeFileSync(process.argv[2],"received"));fs.writeFileSync(process.argv[1],"ready");setInterval(()=>{},1000)',
          ready,
          terminated,
        ],
        killGraceMs: 20,
      }),
    );
    const rejection = expect(result).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    try {
      // The child proves its handler is installed before the original deadline
      // expires. This demonstrates escalation, rather than a startup-time kill.
      await expect.poll(() => existsSync(ready)).toBe(true);
      time.advance(10);
      await rejection;
      await expect.poll(() => existsSync(terminated)).toBe(true);
      expect(hanging.snapshot().occupied).toBe(1);
      time.advance(20);
      await expect.poll(() => hanging.snapshot().occupied).toBe(0);
    } finally {
      hanging.stop('owner_disposed');
      time.advance(20);
      await expect.poll(() => hanging.snapshot().occupied).toBe(0);
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
