import {
  checkBodyLength,
  checkDeclaredLength,
  decodeUtf8,
  joinBytes,
  validateBodyPolicy,
  type BodyPolicy,
} from './body.js';
import { NetworkError, networkError } from './errors.js';
import {
  callConsumer,
  scopeOf,
  type ConsumptionContext,
  type NetworkOperation,
} from './operation.js';

export interface HttpRequest {
  url: string | URL;
  init?: Omit<RequestInit, 'body'> & { body?: Exclude<BodyInit, ReadableStream> | null };
  bodyPolicy: BodyPolicy;
  requestTimeoutMs?: number;
  /** Private semantic adapters omit optional exchange recording entirely. */
  diagnostics?: 'omit';
}

export interface HttpBytes {
  status: number;
  statusText: string;
  headers: Headers;
  bytes: Uint8Array;
}

export interface HttpText extends Omit<HttpBytes, 'bytes'> {
  text: string;
}

export type ConsumeStep<T> = { kind: 'continue' } | { kind: 'complete'; value: T };

export interface HttpConsumer<T> {
  headers(metadata: Omit<HttpBytes, 'bytes'>, context: ConsumptionContext): void;
  chunk(bytes: Uint8Array, context: ConsumptionContext): ConsumeStep<T> | Promise<ConsumeStep<T>>;
  end(context: ConsumptionContext): T | Promise<T>;
  idle?: {
    intervalMs: number;
    consume(context: ConsumptionContext): void | Promise<void>;
  };
}

export interface NetworkExchange {
  url: string;
  method: string;
  requestBody?: string;
  status?: number;
  bytes?: Uint8Array;
  streaming: boolean;
  truncated?: boolean;
  error?: NetworkError;
  startedAt: number;
  completedAt: number;
}

export type NetworkExchangeObserver = (exchange: NetworkExchange) => undefined;

const observers = new WeakMap<NetworkOperation, NetworkExchangeObserver>();

/** Internal owner construction seam. */
export function setExchangeObserver(
  operation: NetworkOperation,
  observer: NetworkExchangeObserver,
): void {
  observers.set(operation, observer);
}

export function exchangeObserver(operation: NetworkOperation): NetworkExchangeObserver | undefined {
  return observers.get(operation);
}

/** Internal HTTP ownership object; only the Node bridge may adopt its native response. */
export interface OwnedHttp {
  response: Response;
  cancel(): void;
  naturalEnd(): void;
  terminalReadError(error: unknown): void;
  setReader(reader: ReadableStreamDefaultReader<Uint8Array>): void;
}

export async function openHttp(
  operation: NetworkOperation,
  request: HttpRequest,
): Promise<OwnedHttp> {
  validateBodyPolicy(request.bodyPolicy);
  if (request.init?.body instanceof ReadableStream) {
    throw new TypeError('Streaming uploads require the owned Node adapter');
  }
  const scope = scopeOf(operation);
  scope.markStarted('connect');
  scope.observeStatus(undefined);
  const activity = scope.httpActivity();
  const controller = new AbortController();
  let owned: OwnedHttp | undefined;
  let stopped = false;
  let removeStop = () => {};
  const requestSignal = request.init?.signal;
  const stop = () => {
    stopped = true;
    // Preserve the first reader cancellation before abort can synthesize EOF.
    owned?.cancel();
    controller.abort();
  };
  removeStop = scope.onStop(stop);
  const signalStop = () => stop();
  requestSignal?.addEventListener('abort', signalStop, { once: true });
  const detach = () => {
    removeStop();
    requestSignal?.removeEventListener('abort', signalStop);
  };
  let raw: Promise<Response>;
  try {
    operation.throwIfStopped();
    if (requestSignal?.aborted) throw new NetworkError('cancelled', 'connect', 'not_started');
    raw = scope.transport(String(request.url), { ...request.init, signal: controller.signal });
  } catch (error) {
    detach();
    activity.finish();
    throw networkError(error, 'connect', scope.dispatch);
  }
  const observed = Promise.resolve(raw).then(
    (response) => {
      scope.observeStatus(response.status);
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let cancelRequested = false;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        detach();
        activity.finish();
        if (reader) {
          try {
            reader.releaseLock();
          } catch {
            // A pending read retains its own guarded activity until settlement.
          }
        }
      };
      owned = {
        response,
        setReader(value) {
          reader = value;
        },
        cancel() {
          if (finished || cancelRequested) return;
          cancelRequested = true;
          let cleanup: Promise<void>;
          try {
            cleanup = reader ? reader.cancel() : (response.body?.cancel() ?? Promise.resolve());
          } catch {
            activity.quarantine();
            controller.abort();
            return;
          }
          // This exact promise is the closure proof, never a second cancel call.
          Promise.resolve(cleanup).then(finish, () => activity.quarantine());
          controller.abort();
        },
        naturalEnd() {
          if (!cancelRequested) finish();
        },
        terminalReadError(error) {
          if (!cancelRequested || (error instanceof DOMException && error.name === 'AbortError')) {
            finish();
          }
        },
      };
      if (!response.body) finish();
      if (stopped || operation.signal.aborted) owned.cancel();
      return owned;
    },
    (error: unknown) => {
      detach();
      activity.finish();
      throw networkError(error, 'connect', 'started');
    },
  );
  return scope.guard('connect', observed);
}

/** Internal composition shared by buffered, streamed and Web-to-Node HTTP. */
export async function withRequestScope<T>(
  operation: NetworkOperation,
  request: HttpRequest,
  work: (effective: NetworkOperation) => Promise<T>,
): Promise<T> {
  if (request.requestTimeoutMs === undefined && !request.init?.signal) return work(operation);
  const parent = scopeOf(operation);
  const observer = exchangeObserver(operation);
  return parent.withBudget(
    {
      timeoutMs: request.requestTimeoutMs ?? Math.max(1, Math.ceil(operation.remainingMs())),
      signal: request.init?.signal ?? undefined,
    },
    (effective) => {
      if (observer) setExchangeObserver(effective, observer);
      return work(effective);
    },
  );
}

async function consume<T>(
  operation: NetworkOperation,
  request: HttpRequest,
  consumer: HttpConsumer<T>,
  streaming: boolean,
  observedBytes?: () => Uint8Array,
  framed = false,
): Promise<T> {
  return withRequestScope(operation, request, async (effective) => {
    const scope = scopeOf(effective);
    const startedAt = scope.clock.wallNow();
    const observer = request.diagnostics === 'omit' ? undefined : exchangeObserver(effective);
    let owned: OwnedHttp | undefined;
    let status: number | undefined;
    let failure: NetworkError | undefined;
    let isStream = false;
    const diagnosticChunks: Uint8Array[] = [];
    let diagnosticLength = 0;
    let diagnosticOverflow = false;
    try {
      owned = await openHttp(effective, request);
      const response = owned.response;
      status = response.status;
      isStream =
        response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ===
        'text/event-stream';
      effective.throwIfStopped();
      await callConsumer(effective, (context) =>
        consumer.headers(
          { status: response.status, statusText: response.statusText, headers: response.headers },
          context,
        ),
      );
      if (!framed) checkDeclaredLength(response.headers, request.bodyPolicy, status);
      const reader = response.body?.getReader();
      let total = 0;
      if (reader) {
        owned.setReader(reader);
        for (;;) {
          let result: ReadableStreamReadResult<Uint8Array>;
          try {
            result = consumer.idle
              ? await readWithIdle(effective, reader, consumer.idle)
              : await effective.wait('body', () => reader.read());
          } catch (error) {
            owned.terminalReadError(error);
            throw error;
          }
          effective.throwIfStopped();
          if (result.done) {
            owned.naturalEnd();
            break;
          }
          total += result.value.byteLength;
          if (!framed) checkBodyLength(total, request.bodyPolicy, status);
          if (observer && streaming && !isStream && !diagnosticOverflow) {
            diagnosticLength += result.value.byteLength;
            const remaining = 1_000_000 - (diagnosticLength - result.value.byteLength);
            if (remaining > 0) diagnosticChunks.push(result.value.subarray(0, remaining).slice());
            if (diagnosticLength > 1_000_000) diagnosticOverflow = true;
          }
          const step = await callConsumer(effective, (context) =>
            consumer.chunk(result.value, context),
          );
          if (step.kind === 'complete') {
            effective.throwIfStopped();
            owned.cancel();
            return step.value;
          }
        }
      }
      if (!framed) checkBodyLength(total, request.bodyPolicy, status, true);
      return await callConsumer(effective, (context) => consumer.end(context));
    } catch (error) {
      failure = networkError(error, 'body', scope.dispatch, status);
      owned?.cancel();
      // Transport reads are already sanitized; semantic callback failures retain their identity.
      throw error;
    } finally {
      if (observer) {
        try {
          const completeBytes = isStream
            ? undefined
            : (observedBytes?.() ??
              joinBytes(diagnosticChunks, Math.min(1_000_000, diagnosticLength)));
          const truncated = diagnosticOverflow || (completeBytes?.byteLength ?? 0) > 1_000_000;
          // Diagnostics receive their own bounded prefix; an observer must not
          // be able to change the bytes the semantic caller will decode.
          const bytes = completeBytes?.slice(0, 1_000_000);
          observer({
            url: String(request.url),
            method: request.init?.method ?? 'GET',
            requestBody: typeof request.init?.body === 'string' ? request.init.body : undefined,
            status,
            bytes,
            truncated,
            streaming: isStream,
            error: failure,
            startedAt,
            completedAt: scope.clock.wallNow(),
          });
        } catch {
          // Optional diagnostics cannot replace the transport result or start a reader.
        }
      }
    }
  });
}

async function readWithIdle(
  operation: NetworkOperation,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idle: NonNullable<HttpConsumer<unknown>['idle']>,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (!Number.isSafeInteger(idle.intervalMs) || idle.intervalMs <= 0) {
    throw new RangeError('HTTP idle cadence must be a positive safe integer');
  }
  const scope = scopeOf(operation);
  type Result =
    | { kind: 'pending' }
    | { kind: 'value'; value: ReadableStreamReadResult<Uint8Array> }
    | { kind: 'error'; error: unknown };
  let result: Result = { kind: 'pending' };
  const current = (): Result => result;
  let wake: (() => void) | undefined;
  // Attach exactly one pair of handlers, even through many idle ticks.
  operation
    .wait('body', () => reader.read())
    .then(
      (value) => {
        result = { kind: 'value', value };
        wake?.();
      },
      (error: unknown) => {
        result = { kind: 'error', error };
        wake?.();
      },
    );
  for (;;) {
    const settled = current();
    if (settled.kind === 'value') return settled.value;
    if (settled.kind === 'error') throw settled.error;
    let cancel = () => {};
    try {
      await scope.guard(
        'body',
        new Promise<void>((resolve) => {
          wake = resolve;
          cancel = scope.scheduler.schedule(idle.intervalMs, resolve);
        }),
      );
    } finally {
      cancel();
      wake = undefined;
    }
    operation.throwIfStopped();
    if (current().kind === 'pending') {
      await callConsumer(operation, (context) => idle.consume(context));
    }
  }
}

export function consumeHttp<T>(
  operation: NetworkOperation,
  request: HttpRequest,
  consumer: HttpConsumer<T>,
): Promise<T> {
  return consume(operation, request, consumer, true);
}

/** Internal finite SSE bridge; its caller must enforce every in-progress frame. */
export function consumeFramedHttp<T>(
  operation: NetworkOperation,
  request: HttpRequest,
  consumer: HttpConsumer<T>,
): Promise<T> {
  return consume(operation, request, consumer, true, undefined, true);
}

export async function requestBytes(
  operation: NetworkOperation,
  request: HttpRequest,
): Promise<HttpBytes> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  let metadata: Omit<HttpBytes, 'bytes'> | undefined;
  let combined: Uint8Array | undefined;
  const bytes = () => (combined ??= joinBytes(chunks, length));
  return consume(
    operation,
    request,
    {
      headers(value) {
        metadata = value;
      },
      chunk(chunk) {
        chunks.push(chunk.slice());
        length += chunk.byteLength;
        return { kind: 'continue' };
      },
      end() {
        if (!metadata) throw new NetworkError('invalid_stream', 'body', 'started');
        return { ...metadata, bytes: bytes() };
      },
    },
    false,
    bytes,
  );
}

export async function requestText(
  operation: NetworkOperation,
  request: HttpRequest,
): Promise<HttpText> {
  const { bytes, ...metadata } = await requestBytes(operation, request);
  const text = decodeUtf8(bytes, metadata.status);
  operation.throwIfStopped();
  return { ...metadata, text };
}
