import { AsyncLocalStorage } from 'node:async_hooks';
import {
  createNetworkOwner,
  consumeHttp,
  requestBytes,
  type BodyPolicy,
  type NetworkOperation,
} from '@open-legend/network';
import { runRemoteProcess } from '@open-legend/network/node';
import { browserRequestPolicy } from '../apps/client/src/network-policies.js';

const http = createNetworkOwner({ role: 'tool-http', capacity: 8 });
const processes = createNetworkOwner({ role: 'tool-remote-processes', capacity: 4 });
const context = new AsyncLocalStorage<NetworkOperation>();
export class ToolRemoteError extends Error {
  #details: string;
  constructor(stdout: string, stderr: string) {
    super(
      'Remote command failed. Its external result may need reconciliation before repeating it.',
    );
    this.#details = stdout + '\n' + stderr;
  }
  matches(pattern: RegExp): boolean {
    return pattern.test(this.#details);
  }
}
export const remoteErrorMatches = (error: unknown, pattern: RegExp): boolean =>
  error instanceof ToolRemoteError && error.matches(pattern);

/** Nested control-plane steps retain their original sequence deadline. */
export function toolSequence<T>(
  timeoutMs: number,
  work: (operation: NetworkOperation) => Promise<T>,
): Promise<T> {
  const parent = context.getStore();
  if (parent) {
    parent.throwIfStopped();
    return work(parent);
  }
  return http.run({ timeoutMs }, (operation) => context.run(operation, () => work(operation)));
}
export async function toolDelay(milliseconds: number): Promise<void> {
  const operation = context.getStore();
  if (!operation) throw new Error('A remote sequence must own its polling delay.');
  await operation.wait(
    'admission',
    (signal) =>
      new Promise<void>((resolve, reject) => {
        const finish = () => {
          signal.removeEventListener('abort', abort);
          resolve();
        };
        const timer = setTimeout(finish, milliseconds);
        const abort = () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', abort);
          reject(new Error('Remote sequence stopped.'));
        };
        signal.addEventListener('abort', abort, { once: true });
      }),
  );
}
export interface ToolResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
/** Consumed bytes only: this result carries no socket, reader or network Response. */
export function toolHttp(
  url: string | URL,
  init: Omit<RequestInit, 'body' | 'method'> & {
    method?: 'GET' | 'POST';
    body?: Exclude<BodyInit, ReadableStream> | null;
  } = {},
  options: { timeoutMs?: number; bodyPolicy?: BodyPolicy; parent?: NetworkOperation } = {},
): Promise<ToolResponse> {
  let bodyPolicy = options.bodyPolicy;
  if (!bodyPolicy) {
    const target = new URL(url);
    if (target.pathname.startsWith('/api/')) {
      // Profilers emulate these same reviewed browser operations. Reuse their
      // complete-view contract rather than inventing a diagnostic byte ceiling.
      let body: unknown;
      try {
        if (typeof init.body === 'string') body = JSON.parse(init.body);
      } catch {
        /* Server owns malformed request refusal. */
      }
      browserRequestPolicy(init.method === 'POST' ? 'POST' : 'GET', target.pathname, body);
      bodyPolicy = { kind: 'complete-projection', owner: 'browser-api' };
    } else bodyPolicy = { kind: 'bounded', maxBytes: 1_048_576 };
  }
  const use = async (operation: NetworkOperation) => {
    const response = await requestBytes(operation, {
      url,
      init,
      bodyPolicy,
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: response.headers,
      async text() {
        return new TextDecoder('utf-8', { fatal: true }).decode(response.bytes);
      },
      async json<T>() {
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response.bytes)) as T;
      },
      async arrayBuffer() {
        return Uint8Array.from(response.bytes).buffer;
      },
    };
  };
  const parent = options.parent ?? context.getStore();
  const timeoutMs = options.timeoutMs ?? 15_000;
  return parent
    ? parent.within(timeoutMs, use)
    : http.run({ timeoutMs, signal: init.signal ?? undefined }, use);
}
/** Finite diagnostic stream consumption retains exact measured wire byte counts. */
export function toolStream(
  url: string | URL,
  init: RequestInit,
  consume: (chunk: Uint8Array) => void,
  timeoutMs: number,
  parent?: NetworkOperation,
): { ready: Promise<void>; done: Promise<void> } {
  if (
    (init.method !== undefined && init.method !== 'GET') ||
    init.body != null ||
    new URL(url).pathname !== '/api/events'
  )
    throw new Error('Only the reviewed read-only game stream is supported by this driver.');
  let established!: () => void;
  let refused!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    established = resolve;
    refused = reject;
  });
  const use = (operation: NetworkOperation) =>
    consumeHttp(
      operation,
      {
        url,
        init: { ...init, body: undefined },
        bodyPolicy: { kind: 'complete-projection', owner: 'game-events' },
      },
      {
        headers(response) {
          if (
            response.status !== 200 ||
            !/^text\/event-stream(?:;|$)/i.test(response.headers.get('content-type') ?? '')
          )
            throw new Error('The diagnostic event stream was refused.');
          established();
        },
        chunk(bytes, active) {
          active.throwIfStopped();
          consume(bytes);
          return { kind: 'continue' };
        },
        end() {},
      },
    );
  const done = parent
    ? parent.within(timeoutMs, use)
    : http.run({ timeoutMs, signal: init.signal ?? undefined }, use);
  void done.catch(refused);
  return { ready, done };
}
export async function toolRemote(
  command: string,
  args: readonly string[],
  options: { timeoutMs?: number; maxBuffer?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string }> {
  const result = await processes.run(
    { timeoutMs: options.timeoutMs ?? 60_000, parent: context.getStore() },
    (operation) =>
      runRemoteProcess(operation, {
        command,
        args,
        cwd: options.cwd,
        env: options.env,
        maxOutputBytes: options.maxBuffer ?? 1_048_576,
      }),
  );
  if (result.exitCode !== 0 || result.signal)
    // Never expose arguments/output: cloud-login commands can contain tickets.
    throw new ToolRemoteError(result.stdout, result.stderr);
  return { stdout: result.stdout, stderr: result.stderr };
}
