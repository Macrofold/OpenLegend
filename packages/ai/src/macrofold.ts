import { AsyncLocalStorage } from 'node:async_hooks';
import {
  consumeHttp,
  createNetworkOwner,
  afterNetworkResourcesClose,
  SSEFramer,
  type FiniteBudget,
  type NetworkOperation,
  type NetworkOwner,
} from '@open-legend/network';
import { providerOwner, providerText } from './provider-http.js';
import {
  serialize,
  record,
  PreparedJson,
  InvalidData,
  jsonCaptureBytes,
  jsonTextCaptureBytes,
  type PreparedSchema,
} from './validation.js';
import type { FetchTransport, GenerateRequest, RequestControl } from './types.js';

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
      // The immediate-inference contract uses this exact code only before
      // admission or after a confirmed rollback. admission_unknown stays uncertain.
      (this.status === 503 && this.code === 'inference_admission_timeout') ||
      [400, 401, 403, 404, 413, 422, 429].includes(this.status)
    );
  }
}

/** Authenticated transport only: no game policy, world state or automatic retries. */
const cleanupNetwork = createNetworkOwner({ role: 'ai-cleanup', capacity: 4 });
type Allocation = RequestControl['allocation'];
type Reservation = { release(): void };
type OperationContext = {
  operation: NetworkOperation;
  allocation: Allocation;
  releases: Set<() => void>;
};
const operationContext = new AsyncLocalStorage<OperationContext>();

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
    private readonly defaultAllocation?: Allocation,
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
  run<T>(
    budget: FiniteBudget,
    work: (operation: NetworkOperation) => Promise<T>,
    allocation?: Allocation,
  ): Promise<T> {
    const admission = allocation ?? this.currentAllocation() ?? this.defaultAllocation;
    // Nested inference observation still borrows the outer raw input/schema.
    // Its actual abandoned resources must retain that original owner's lease.
    const parent = budget.parent ?? this.currentOperation();
    return this.network.run(parent ? { ...budget, parent } : budget, (operation) =>
      this.scoped(operation, admission, work),
    );
  }
  runCleanup<T>(work: () => Promise<T>, signal?: AbortSignal, allocation?: Allocation): Promise<T> {
    const admission = allocation ?? this.currentAllocation() ?? this.defaultAllocation;
    return this.cleanup.run({ timeoutMs: 5000, signal }, (operation) =>
      this.scoped(operation, admission, work),
    );
  }
  private scoped<T>(
    operation: NetworkOperation,
    allocation: Allocation,
    work: (operation: NetworkOperation) => Promise<T>,
  ): Promise<T> {
    const context: OperationContext = { operation, allocation, releases: new Set() };
    return this.context.run(context, async () => {
      try {
        return await work(operation);
      } finally {
        // A local deadline can leave fetch, body cancellation or a callback
        // alive. Their actual network owner, including nested transports,
        // retains request/schema/decoder custody until those resources close.
        afterNetworkResourcesClose(operation, () => {
          for (const release of context.releases) release();
          context.releases.clear();
        });
      }
    });
  }
  currentAllocation(): Allocation {
    return this.context.getStore()?.allocation;
  }
  reserve(bytes: number): Reservation | undefined {
    const context = this.context.getStore();
    let reservation = context?.allocation?.reserveBytes(bytes);
    if (!reservation) return undefined;
    const release = () => {
      if (!reservation) return;
      const retained = reservation;
      reservation = undefined;
      context!.releases.delete(release);
      retained.release();
    };
    context!.releases.add(release);
    return { release };
  }
  hold(release: () => void): void {
    const context = this.context.getStore();
    if (!context) throw new InvalidData('missing_macrofold_operation');
    context.releases.add(release);
  }
  currentOperation(): NetworkOperation | undefined {
    return this.context.getStore()?.operation;
  }
  /** HTTP pacing belongs to this observation, never the serialized Run receipt or request identity. */
  retryAfterMs(value: unknown): number | undefined {
    return value !== null && typeof value === 'object' ? this.responseWaits.get(value) : undefined;
  }
  private within<T>(
    signal: AbortSignal | undefined,
    work: (operation: NetworkOperation) => Promise<T>,
  ): Promise<T> {
    const parent = this.context.getStore()?.operation;
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
      this.reserve(6 * 16000 + 64 * 1024);
      if (method === 'PUT' && options.text !== undefined)
        this.reserve(64 + 2 * options.text.length);
      let status = 0;
      let revision: string | null = null;
      const text = await providerText(
        operation,
        {
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
        },
        (value) => {
          status = value.status;
          revision = value.headers.get('etag');
        },
        this.currentAllocation()?.reserveBytes,
      );
      if (status < 200 || status >= 300)
        throw new Error(`Workspace file request failed (HTTP ${status}).`);
      return { text, revision };
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
    publication?: import('@open-legend/network').HttpPublication,
    onDispatch?: () => void,
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
      const transport = this;
      const allocated = this.currentAllocation() !== undefined;
      // The bounded response can overlap its original chunks, concatenation,
      // decoded UTF-16 text and the stream's retained output/carry.
      this.reserve(6 * maxResponseBytes + 64 * 1024);
      let requestBody: string | undefined;
      if (body !== undefined) {
        const borrowed = body instanceof PreparedJson;
        const serializing =
          allocated && !borrowed ? this.reserve(jsonCaptureBytes(body)) : undefined;
        try {
          requestBody = (borrowed ? body : new PreparedJson(body, 500_000)).text(500_000);
          // PreparedJson's producer owns this same cached text through the
          // original resource lease. Only newly serialized text needs a pin.
          if (!borrowed) this.reserve(64 + 2 * requestBody.length);
          // Node's fetch body source keeps that string and separately encodes
          // a UTF-8 Uint8Array when the request stream is pulled.
          if (allocated) this.reserve(256 + Buffer.byteLength(requestBody));
        } finally {
          serializing?.release();
        }
      }
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
          // The response escrow already owns the shared parser workspace.
          // Accepted/terminal records and delta strings may survive this frame.
          if (allocated) this.reserve(Math.max(0, jsonTextCaptureBytes(frame.data) - 64 * 1024));
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
            if (allocated) this.reserve(Math.max(0, jsonTextCaptureBytes(raw) - 64 * 1024));
            const data: unknown = JSON.parse(raw);
            const candidate = record(data) && record(data.error) ? data.error.code : undefined;
            if (typeof candidate === 'string' && /^[a-z_]{1,80}$/.test(candidate)) code = candidate;
          } catch {
            /* Untrusted prose stays out of errors. */
          }
          throw new MacrofoldHttpError(status, code, retryAfterMs);
        }
        if (allocated) this.reserve(Math.max(0, jsonTextCaptureBytes(raw) - 64 * 1024));
        const value: unknown = JSON.parse(raw);
        const serializing = allocated ? this.reserve(jsonCaptureBytes(value)) : undefined;
        try {
          serialize(value, maxResponseBytes);
        } finally {
          serializing?.release();
        }
        if (retryAfterMs !== undefined && value !== null && typeof value === 'object')
          this.responseWaits.set(value, retryAfterMs);
        return value;
      };
      try {
        return await consumeHttp(
          operation,
          {
            url,
            publication,
            onDispatch,
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
              ...(requestBody === undefined ? {} : { body: requestBody }),
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
                // Admit UTF-8 decoding, frame strings and their carrier arrays
                // before the shared framer makes any of those copies.
                const framing = transport.reserve(8 * bytes.byteLength + 64 * 1024);
                const ended = await frames(framer.push(bytes));
                context.throwIfStopped();
                framing?.release();
                return ended ? { kind: 'complete', value: completed() } : { kind: 'continue' };
              }
              length += bytes.byteLength;
              if (length > maxResponseBytes)
                throw new InvalidData('Macrofold response exceeds the size limit.');
              transport.reserve(bytes.byteLength + 256 + 2 * 24);
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
