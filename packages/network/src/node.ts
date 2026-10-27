import { spawn } from 'node:child_process';
import { Readable, Transform, type Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  checkBodyLength,
  checkDeclaredLength,
  validateBodyPolicy,
  type BodyPolicy,
} from './body.js';
import { NetworkError, type NetworkPhase } from './errors.js';
import { openHttp, withRequestScope, type HttpBytes, type HttpRequest } from './http.js';
import {
  callConsumer,
  scopeOf,
  type ConsumptionContext,
  type NetworkOperation,
} from './operation.js';

export interface OwnedNodeStream {
  /** Physical closure, not the caller's bounded observation result. */
  closed: Promise<void>;
  stop(): void;
}

const streamsByOperation = new WeakMap<
  NetworkOperation,
  WeakMap<Readable | Writable, { owned: OwnedNodeStream; requireClose: boolean }>
>();

export function ownNodeStream(
  operation: NetworkOperation,
  stream: Readable | Writable,
  options: { requireClose?: boolean; adoptLate?: boolean } = {},
): OwnedNodeStream {
  const scope = scopeOf(operation);
  let late = false;
  try {
    scope.throwIfStopped();
  } catch (error) {
    if (!options.adoptLate) throw error;
    late = true;
  }
  let streams = streamsByOperation.get(operation);
  if (!streams) {
    streams = new WeakMap();
    streamsByOperation.set(operation, streams);
  }
  const requireClose = options.requireClose !== false;
  const existing = streams.get(stream);
  if (existing) {
    if (existing.requireClose !== requireClose)
      throw new TypeError('A Node stream cannot change its closure evidence within an operation');
    if (late) existing.owned.stop();
    return existing.owned;
  }
  const activity = scope.activity();
  let requested = false;
  let settled = false;
  let resolveClosed: () => void = () => {};
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  let removeStop = () => {};
  const finish = () => {
    if (settled) return;
    settled = true;
    removeStop();
    stream.removeListener('close', finish);
    stream.removeListener('error', onError);
    stream.removeListener('end', naturalFinish);
    stream.removeListener('finish', naturalFinish);
    activity.finish();
    resolveClosed();
  };
  const onError = () => {
    // Error is observed; a still-open descriptor is not refunded on error alone.
    if (stream.closed) finish();
  };
  const naturalFinish = () => {
    if (!requireClose && !requested) finish();
  };
  const stop = () => {
    if (requested || settled) return;
    requested = true;
    try {
      stream.destroy();
    } catch {
      activity.quarantine();
    }
    if (stream.closed) finish();
  };
  const owned = { closed, stop };
  // SDK adoption and downstream piping share one physical resource. Weak keys
  // retain neither a history of streams nor extra operation lifetimes.
  streams.set(stream, { owned, requireClose });
  stream.once('close', finish);
  stream.on('error', onError);
  stream.once('end', naturalFinish);
  stream.once('finish', naturalFinish);
  removeStop = scope.onStop(stop);
  if (late) stop();
  if (stream.closed) finish();
  return owned;
}

/** Actual closure for retained cleanup; bounded observation before another attempt. */
export function waitForOperationResources(
  operation: NetworkOperation,
  options: { bounded?: true } = {},
): Promise<void> {
  const scope = scopeOf(operation);
  if (options.bounded) scope.markStarted('cleanup');
  const closed = scope.lease.resourcesClosed();
  // Registering this observation as another resource would wait on itself.
  // Expiry ends only the bounded wait; physical activities remain retained.
  return options.bounded ? scope.guard('cleanup', closed) : closed;
}

/** SDK error types remain with their semantic adapter (403/404/conditional writes). */
export function waitSdkValue<T>(
  operation: NetworkOperation,
  phase: NetworkPhase,
  start: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const scope = scopeOf(operation);
  scope.markStarted(phase);
  const activity = scope.activity();
  let raw: Promise<T>;
  try {
    raw = start(operation.signal);
  } catch (error) {
    activity.finish();
    return Promise.reject(error);
  }
  const observed = Promise.resolve(raw).then(
    (value) => {
      activity.finish();
      return value;
    },
    (error: unknown) => {
      activity.finish();
      throw error;
    },
  );
  return scope.guard(phase, observed, false);
}

export async function consumeSdkReadable<T, M, R>(
  operation: NetworkOperation,
  start: (signal: AbortSignal) => Promise<T>,
  adopt: (result: T) => { source: Readable; metadata: M },
  consume: (source: Readable, metadata: M, context: ConsumptionContext) => Promise<R>,
): Promise<R> {
  const scope = scopeOf(operation);
  scope.markStarted('connect');
  const pending = scope.activity();
  let raw: Promise<T>;
  try {
    raw = start(operation.signal);
  } catch (error) {
    pending.finish();
    throw error;
  }
  let stream: OwnedNodeStream | undefined;
  const observed = Promise.resolve(raw).then(
    (result) => {
      // Adoption occurs in the raw fulfillment handler before dropping pending ownership.
      let adopted: { source: Readable; metadata: M };
      try {
        adopted = adopt(result);
      } catch (error) {
        pending.finish();
        throw error;
      }
      try {
        // One stream owner handles ordinary and late bodies alike, including
        // once-only destruction, actual close and listener retirement.
        stream = ownNodeStream(operation, adopted.source, { adoptLate: true });
      } finally {
        pending.finish();
      }
      operation.throwIfStopped();
      return adopted;
    },
    (error: unknown) => {
      pending.finish();
      throw error;
    },
  );
  try {
    const adopted = await scope.guard('connect', observed, false);
    return await callConsumer(operation, (context) =>
      consume(adopted.source, adopted.metadata, context),
    );
  } finally {
    stream?.stop();
  }
}

export async function pipeOwned(
  operation: NetworkOperation,
  source: Readable,
  sink: Writable,
  bytePolicy: { maxBytes: number; exactBytes?: number },
): Promise<number> {
  const policy: BodyPolicy = { kind: 'bounded', ...bytePolicy };
  validateBodyPolicy(policy);
  const ownedSource = ownNodeStream(operation, source);
  const ownedSink = ownNodeStream(operation, sink);
  let total = 0;
  const counter = new Transform({
    transform(chunk: unknown, _encoding, callback) {
      try {
        operation.throwIfStopped();
        if (!(chunk instanceof Uint8Array))
          throw new NetworkError('invalid_stream', 'body', 'started');
        total += chunk.byteLength;
        checkBodyLength(total, policy);
        callback(null, chunk);
      } catch (error) {
        callback(
          error instanceof Error ? error : new NetworkError('invalid_stream', 'body', 'started'),
        );
      }
    },
    flush(callback) {
      try {
        checkBodyLength(total, policy, undefined, true);
        callback();
      } catch (error) {
        callback(
          error instanceof Error ? error : new NetworkError('invalid_stream', 'body', 'started'),
        );
      }
    },
  });
  const ownedCounter = ownNodeStream(operation, counter);
  try {
    await operation.wait('body', () => pipeline(source, counter, sink));
    await operation.wait('cleanup', () =>
      Promise.all([ownedSource.closed, ownedCounter.closed, ownedSink.closed]).then(() => {}),
    );
    operation.throwIfStopped();
    return total;
  } catch (error) {
    ownedSource.stop();
    ownedCounter.stop();
    ownedSink.stop();
    throw error;
  }
}

/** Reviewed Web-to-Node bridge for exact assets; ordinary callers never receive a Response. */
export async function consumeHttpReadable<M, R>(
  operation: NetworkOperation,
  request: HttpRequest,
  adoptHeaders: (metadata: Omit<HttpBytes, 'bytes'>) => M,
  consume: (source: Readable, metadata: M, context: ConsumptionContext) => Promise<R>,
): Promise<R> {
  return withRequestScope(operation, request, (effective) =>
    consumeOwnedHttpReadable(effective, request, adoptHeaders, consume),
  );
}

async function consumeOwnedHttpReadable<M, R>(
  operation: NetworkOperation,
  request: HttpRequest,
  adoptHeaders: (metadata: Omit<HttpBytes, 'bytes'>) => M,
  consume: (source: Readable, metadata: M, context: ConsumptionContext) => Promise<R>,
): Promise<R> {
  const owned = await openHttp(operation, request);
  let node: OwnedNodeStream | undefined;
  try {
    const response = owned.response;
    operation.throwIfStopped();
    const metadata = adoptHeaders({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    checkDeclaredLength(response.headers, request.bodyPolicy, response.status);
    const reader = response.body?.getReader();
    if (reader) owned.setReader(reader);
    let total = 0;
    const source = Readable.from(
      (async function* () {
        if (reader) {
          for (;;) {
            let item: ReadableStreamReadResult<Uint8Array>;
            try {
              item = await operation.wait('body', () => reader.read());
            } catch (error) {
              owned.terminalReadError(error);
              throw error;
            }
            if (item.done) {
              owned.naturalEnd();
              break;
            }
            operation.throwIfStopped();
            total += item.value.byteLength;
            checkBodyLength(total, request.bodyPolicy, response.status);
            yield item.value;
          }
        }
        checkBodyLength(total, request.bodyPolicy, response.status, true);
      })(),
    );
    node = ownNodeStream(operation, source);
    source.once('close', () => owned.cancel());
    return await callConsumer(operation, (context) => consume(source, metadata, context));
  } finally {
    node?.stop();
    owned.cancel();
  }
}

export interface RemoteProcessOptions {
  command: string;
  args: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxOutputBytes?: number;
  killGraceMs?: number;
}

export interface RemoteProcessResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

/** Argument-array invocation only. No shell parsing, automatic retry or mutation replay. */
export function runRemoteProcess(
  operation: NetworkOperation,
  options: RemoteProcessOptions,
): Promise<RemoteProcessResult> {
  const scope = scopeOf(operation);
  const maximum = options.maxOutputBytes ?? 1_048_576;
  const grace = options.killGraceMs ?? 2_000;
  if (!Number.isSafeInteger(maximum) || maximum < 0 || !Number.isSafeInteger(grace) || grace <= 0) {
    throw new RangeError('Remote process output and termination bounds must be finite');
  }
  return operation.wait(
    'subprocess',
    () =>
      new Promise<RemoteProcessResult>((resolve, reject) => {
        const child = spawn(options.command, [...options.args], {
          cwd: options.cwd,
          env: options.env,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = 0;
        const stdout: Uint8Array[] = [];
        const stderr: Uint8Array[] = [];
        let failure: NetworkError | undefined;
        let requested = false;
        let cancelKill: (() => void) | undefined;
        const stop = () => {
          if (requested) return;
          requested = true;
          child.kill('SIGTERM');
          cancelKill = scope.scheduler.schedule(grace, () => child.kill('SIGKILL'));
        };
        const removeStop = scope.onStop(stop);
        const receive = (chunks: Uint8Array[], chunk: Buffer) => {
          output += chunk.byteLength;
          if (output > maximum) {
            failure ??= new NetworkError('body_too_large', 'subprocess', 'started');
            stop();
          } else chunks.push(chunk);
        };
        child.stdout.on('data', (chunk: Buffer) => receive(stdout, chunk));
        child.stderr.on('data', (chunk: Buffer) => receive(stderr, chunk));
        child.once('error', () => {
          failure ??= new NetworkError('transport_error', 'subprocess', 'started');
        });
        child.once('close', (exitCode, signal) => {
          removeStop();
          cancelKill?.();
          if (failure) {
            reject(failure);
            return;
          }
          resolve({
            exitCode,
            signal,
            stdout: Buffer.concat(stdout).toString('utf8'),
            stderr: Buffer.concat(stderr).toString('utf8'),
          });
        });
      }),
  );
}
