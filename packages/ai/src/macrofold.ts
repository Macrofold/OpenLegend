import { AsyncLocalStorage } from 'node:async_hooks';
import {
  consumeHttp,
  createNetworkOwner,
  requestText,
  SSEFramer,
  type FiniteBudget,
  type NetworkOperation,
  type NetworkOwner,
} from '@open-legend/network';
import { providerOwner } from './provider-http.js';
import { serialize, record, PreparedJson, InvalidData, type PreparedSchema } from './validation.js';
import type { FetchTransport, GenerateRequest } from './types.js';

/** Structured HTTP failure; application code decides whether admission was rejected. */
export class MacrofoldHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfterMs?: number,
  ) {
    super(`Macrofold request failed (HTTP ${status}${code ? `: ${code}` : ''}).`);
  }
  get admissionRejected(): boolean {
    return (
      this.code === 'execution_disabled' ||
      this.code === 'inference_disabled' ||
      // Macrofold rejects insufficient credit before creating a Run or reserving spend.
      (this.status === 402 && this.code === 'insufficient_credit') ||
      // These canonical deployment errors establish no new admission. Other
      // conflicts/unavailable responses can still represent uncertain work.
      (this.status === 409 &&
        ['deployment_binding_stale', 'deployment_not_ready'].includes(this.code)) ||
      (this.status === 402 && this.code === 'deployment_budget_exhausted') ||
      (this.status === 503 && this.code === 'deployment_unavailable') ||
      [400, 401, 403, 404, 413, 422, 429].includes(this.status)
    );
  }
}

/** Authenticated transport only: no game policy, world state or automatic retries. */
const cleanupNetwork = createNetworkOwner({ role: 'ai-cleanup', capacity: 4 });
const operationContext = new AsyncLocalStorage<NetworkOperation>();

export class MacrofoldTransport {
  private base: URL;
  private readonly responseWaits = new WeakMap<object, number>();
  private readonly network: NetworkOwner;
  private readonly cleanup: NetworkOwner;
  private readonly context = operationContext;
  constructor(
    baseUrl: string,
    private key: string,
    transport?: FetchTransport,
    network?: NetworkOwner,
    private readonly diagnostics = true,
  ) {
    this.network = providerOwner(network, transport);
    this.cleanup = transport
      ? createNetworkOwner({ role: 'ai-injected-cleanup', capacity: 4, fetch: transport })
      : cleanupNetwork;
    this.base = new URL(baseUrl);
    if (
      !['http:', 'https:'].includes(this.base.protocol) ||
      this.base.username ||
      this.base.password
    )
      throw new Error('Invalid Macrofold base URL.');
  }
  /** One original budget across admission, callbacks and same-Run observation. */
  run<T>(budget: FiniteBudget, work: (operation: NetworkOperation) => Promise<T>): Promise<T> {
    return this.network.run(budget, (operation) =>
      this.context.run(operation, () => work(operation)),
    );
  }
  runCleanup<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return this.cleanup.run({ timeoutMs: 5000, signal }, (operation) =>
      this.context.run(operation, work),
    );
  }
  currentOperation(): NetworkOperation | undefined {
    return this.context.getStore();
  }
  /** HTTP pacing belongs to this observation, never the serialized Run receipt or request identity. */
  retryAfterMs(value: unknown): number | undefined {
    return value !== null && typeof value === 'object' ? this.responseWaits.get(value) : undefined;
  }
  private within<T>(
    signal: AbortSignal | undefined,
    work: (operation: NetworkOperation) => Promise<T>,
  ): Promise<T> {
    const parent = this.context.getStore();
    if (parent) {
      parent.throwIfStopped();
      signal?.throwIfAborted();
      return work(parent);
    }
    return this.run({ timeoutMs: 30_000, signal }, work);
  }
  async file(
    worktree: string,
    path: string,
    method: 'GET' | 'PUT' | 'DELETE',
    options: { revision?: string; operationId?: string; text?: string; signal: AbortSignal },
  ): Promise<{ text: string; revision: string | null }> {
    const url = new URL(
      `/v1/worktrees/${encodeURIComponent(worktree)}/file?path=${encodeURIComponent(path)}`,
      this.base,
    );
    return this.within(options.signal, async (operation) => {
      const response = await requestText(operation, {
        url,
        diagnostics: this.diagnostics ? undefined : 'omit',
        init: {
          method,
          redirect: 'error',
          signal: options.signal,
          headers: {
            Authorization: `Bearer ${this.key}`,
            ...(method === 'GET'
              ? {}
              : {
                  'Content-Type': 'application/octet-stream',
                  'If-Match': options.revision!,
                  'Idempotency-Key': options.operationId!,
                }),
          },
          ...(method === 'PUT' ? { body: options.text } : {}),
        },
        bodyPolicy: { kind: 'bounded', maxBytes: 16000 },
      });
      if (response.status < 200 || response.status >= 300)
        throw new Error(`Workspace file request failed (HTTP ${response.status}).`);
      return { text: response.text, revision: response.headers.get('etag') };
    });
  }
  async request(
    path: string,
    body?: unknown,
    operationId?: string,
    signal?: AbortSignal,
    maxResponseBytes = 1_000_000,
    progress?: {
      text: NonNullable<GenerateRequest['onProgress']>;
      accepted: (value: Record<string, unknown>) => Promise<void>;
    },
    matchVersion?: string,
  ): Promise<unknown> {
    if (
      !Number.isSafeInteger(maxResponseBytes) ||
      maxResponseBytes < 1 ||
      maxResponseBytes > 1_000_000
    )
      throw new Error('Invalid Macrofold response limit.');
    const url = new URL(path, this.base);
    if (url.origin !== this.base.origin) throw new Error('Macrofold returned a foreign URL.');
    if (!this.key) throw new Error('MACROFOLD_API_KEY is not configured.');
    if (body !== undefined && !operationId) throw new Error('Mutation requires an operation ID.');
    return this.within(signal, async (operation) => {
      let status: number | undefined;
      let retryAfterMs: number | undefined;
      let streaming = false;
      let accepted: Record<string, unknown> | undefined;
      let terminal: Record<string, unknown> | undefined;
      let text = '';
      let textBytes = 0;
      let sequence = 0;
      let length = 0;
      const chunks: Uint8Array[] = [];
      const framer = new SSEFramer({ kind: 'bounded', maxFrameBytes: 1_000_000 });
      const publish = (value: Parameters<NonNullable<typeof progress>['text']>[0]) => {
        try {
          operation.throwIfStopped();
          progress?.text(value);
        } catch {
          /* Optional presentation cannot change execution. */
        }
      };
      const acceptEvent = async (value: unknown): Promise<void | false> => {
        if (!progress) throw new InvalidData('Unexpected Macrofold stream.');
        const event = macrofoldObject(value);
        if (event['schema_version'] !== 1) throw new InvalidData('Unknown inference stream.');
        const data = macrofoldObject(event['data']);
        if (event['type'] === 'run.accepted') {
          if (accepted) throw new InvalidData('Duplicate inference acceptance.');
          accepted = data;
          if (event['run_id'] !== macrofoldString(data['run_id']))
            throw new InvalidData('Inference stream identity mismatch.');
          await operation.wait('callback', () => progress.accepted(data));
          publish({ kind: 'accepted', providerRequestId: macrofoldString(data['run_id']) });
        } else {
          if (!accepted || event['run_id'] !== accepted['run_id'] || terminal)
            throw new InvalidData('Inference stream identity mismatch.');
          if (event['type'] === 'output.delta') {
            if (data['choice_index'] !== 0 || typeof data['text'] !== 'string')
              throw new InvalidData('Unsupported inference output channel.');
            text += data['text'];
            textBytes += Buffer.byteLength(data['text']);
            if (textBytes > maxResponseBytes)
              throw new InvalidData('Inference text exceeds its byte limit.');
            publish({ kind: 'text', text: data['text'], sequence: ++sequence });
          } else if (
            ['run.succeeded', 'run.failed', 'run.cancelled', 'run.timed_out'].includes(
              String(event['type']),
            )
          ) {
            if (data['run_id'] !== accepted['run_id'])
              throw new InvalidData('Terminal inference identity mismatch.');
            terminal = data;
            // A complete terminal receipt is sufficient; an open HTTP stream
            // must not delay completion or lose known usage at the deadline.
            return false;
          } else if (event['type'] === 'transport.error')
            throw new InvalidData('Inference stream interrupted.');
        }
      };
      const frames = async (values: ReturnType<SSEFramer['push']>): Promise<boolean> => {
        for (const frame of values) {
          if (frame.kind !== 'event' || !frame.data || frame.data === '[DONE]') continue;
          if ((await acceptEvent(JSON.parse(frame.data))) === false) return true;
        }
        return false;
      };
      const completed = () => {
        if (streaming) {
          if (!terminal) throw new InvalidData('Inference stream has no terminal result.');
          const result = macrofoldObject(terminal['result']);
          const inference = macrofoldObject(result['inference']);
          const native = inference['value'] as
            | { choices?: { message?: { content?: unknown } }[] }
            | undefined;
          if (native?.choices?.[0]?.message?.content !== text) publish({ kind: 'withdrawn' });
          return terminal;
        }
        let raw: string;
        try {
          raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length));
        } catch {
          throw new InvalidData('Invalid Macrofold response encoding.');
        }
        if (status === undefined) throw new InvalidData('Macrofold response has no status.');
        if (status < 200 || status >= 300) {
          let code = '';
          try {
            const data: unknown = JSON.parse(raw);
            const candidate = record(data) && record(data.error) ? data.error.code : undefined;
            if (typeof candidate === 'string' && /^[a-z_]{1,80}$/.test(candidate)) code = candidate;
          } catch {
            /* Untrusted prose stays out of errors. */
          }
          throw new MacrofoldHttpError(status, code, retryAfterMs);
        }
        const value: unknown = JSON.parse(raw);
        serialize(value, maxResponseBytes);
        if (retryAfterMs !== undefined && value !== null && typeof value === 'object')
          this.responseWaits.set(value, retryAfterMs);
        return value;
      };
      try {
        return await consumeHttp(
          operation,
          {
            url,
            diagnostics: this.diagnostics ? undefined : 'omit',
            init: {
              method: body === undefined ? 'GET' : 'POST',
              redirect: 'error',
              signal,
              headers: {
                Authorization: `Bearer ${this.key}`,
                'Content-Type': 'application/json',
                ...(matchVersion === undefined ? {} : { 'If-Match': JSON.stringify(matchVersion) }),
                ...(operationId ? { 'Idempotency-Key': operationId } : {}),
              },
              ...(body === undefined
                ? {}
                : {
                    body: (body instanceof PreparedJson
                      ? body
                      : new PreparedJson(body, 500_000)
                    ).text(500_000),
                  }),
            },
            bodyPolicy: { kind: 'bounded', maxBytes: maxResponseBytes * 4 },
          },
          {
            headers(metadata) {
              status = metadata.status;
              const retry = metadata.headers.get('retry-after');
              const seconds = retry?.trim() ? Number(retry) : NaN;
              const ms = Number.isFinite(seconds)
                ? seconds * 1000
                : retry
                  ? Date.parse(retry) - Date.now()
                  : NaN;
              if (Number.isFinite(ms) && ms >= 0) retryAfterMs = Math.min(ms, 2_147_483_647);
              streaming =
                status >= 200 &&
                status < 300 &&
                !!metadata.headers.get('content-type')?.includes('text/event-stream');
              if (streaming && !progress) throw new InvalidData('Unexpected Macrofold stream.');
            },
            async chunk(bytes, context) {
              if (streaming) {
                const ended = await frames(framer.push(bytes));
                context.throwIfStopped();
                return ended ? { kind: 'complete', value: completed() } : { kind: 'continue' };
              }
              length += bytes.byteLength;
              if (length > maxResponseBytes)
                throw new InvalidData('Macrofold response exceeds the size limit.');
              chunks.push(bytes.slice());
              return { kind: 'continue' };
            },
            async end(context) {
              if (streaming) await frames(framer.finish());
              context.throwIfStopped();
              return completed();
            },
          },
        );
      } catch (error) {
        if (streaming) {
          publish({ kind: 'withdrawn' });
          if (accepted) {
            operation.throwIfStopped();
            return accepted;
          }
        }
        if (
          status !== undefined &&
          (status < 200 || status >= 300) &&
          !(error instanceof MacrofoldHttpError)
        )
          throw new MacrofoldHttpError(status, '', retryAfterMs);
        throw error;
      }
    });
  }
}

export function macrofoldObject(value: unknown): Record<string, unknown> {
  if (!record(value)) throw new InvalidData('Invalid Macrofold response.');
  return value;
}
export function macrofoldString(value: unknown): string {
  if (typeof value !== 'string' || !value.length)
    throw new InvalidData('Missing Macrofold response field.');
  return value;
}
export function validateMacrofoldValue<T>(prepared: PreparedSchema, value: unknown): T {
  if (!prepared.validate(value))
    throw new InvalidData('Macrofold output did not match the requested schema.');
  return value as T;
}
