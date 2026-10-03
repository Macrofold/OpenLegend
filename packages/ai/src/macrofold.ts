import { serialize, record, compileSchema, InvalidData } from './validation.js';
import type { FetchTransport, GenerateRequest } from './types.js';
import { consumeEventStream } from './event-stream.js';

/** Structured HTTP failure; application code decides whether admission was rejected. */
export class MacrofoldHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Macrofold request failed (HTTP ${status}${code ? `: ${code}` : ''}).`);
  }
  get admissionRejected(): boolean {
    return (
      this.code === 'execution_disabled' ||
      // Macrofold rejects insufficient credit before creating a Run or reserving spend.
      (this.status === 402 && this.code === 'insufficient_credit') ||
      [400, 401, 403, 404, 413, 422, 429].includes(this.status)
    );
  }
}

/** Authenticated transport only: no game policy, world state or automatic retries. */
export class MacrofoldTransport {
  private base: URL;
  constructor(
    baseUrl: string,
    private key: string,
    private transport: FetchTransport = fetch,
  ) {
    this.base = new URL(baseUrl);
    if (
      !['http:', 'https:'].includes(this.base.protocol) ||
      this.base.username ||
      this.base.password
    )
      throw new Error('Invalid Macrofold base URL.');
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
    const response = await this.transport(url.href, {
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
    });
    if (!response.ok) {
      void response.body?.cancel();
      throw new Error(`Workspace file request failed (HTTP ${response.status}).`);
    }
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 16000) throw new Error('Workspace file response exceeds quota.');
        chunks.push(next.value);
      }
    } finally {
      void reader.cancel().catch(() => {});
    }
    return {
      text: new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
      revision: response.headers.get('etag'),
    };
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
  ): Promise<unknown> {
    if (
      !Number.isSafeInteger(maxResponseBytes) ||
      maxResponseBytes < 1 ||
      maxResponseBytes > 1_000_000
    )
      throw new Error('Invalid Macrofold response limit.');
    const url = new URL(path, this.base);
    // Returned polling URLs may not redirect bearer credentials to another host.
    if (url.origin !== this.base.origin) throw new Error('Macrofold returned a foreign URL.');
    if (!this.key) throw new Error('MACROFOLD_API_KEY is not configured.');
    if (body !== undefined && !operationId) throw new Error('Mutation requires an operation ID.');
    const control = signal ?? AbortSignal.timeout(30_000);
    control.throwIfAborted();
    const response = await this.transport(url.href, {
      method: body === undefined ? 'GET' : 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        ...(operationId ? { 'Idempotency-Key': operationId } : {}),
      },
      ...(body === undefined ? {} : { body: serialize(body, 500_000) }),
      signal: control,
    });
    if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
      if (!progress) throw new InvalidData('Unexpected Macrofold stream.');
      let accepted: Record<string, unknown> | undefined;
      let terminal: Record<string, unknown> | undefined;
      let text = '';
      let textBytes = 0;
      let sequence = 0;
      const publish = (value: Parameters<typeof progress.text>[0]) => {
        try {
          progress.text(value);
        } catch {
          // Presentation failure must not interrupt receipt observation or cause another dispatch.
        }
      };
      try {
        await consumeEventStream(
          response,
          maxResponseBytes * 4,
          async (value) => {
            const event = macrofoldObject(value);
            if (event['schema_version'] !== 1) throw new InvalidData('Unknown inference stream.');
            const data = macrofoldObject(event['data']);
            if (event['type'] === 'run.accepted') {
              if (accepted) throw new InvalidData('Duplicate inference acceptance.');
              accepted = data;
              if (event['run_id'] !== macrofoldString(data['run_id']))
                throw new InvalidData('Inference stream identity mismatch.');
              await progress.accepted(data);
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
          },
          control,
        );
        if (!terminal) throw new InvalidData('Inference stream has no terminal result.');
        const result = macrofoldObject(terminal['result']);
        const inference = macrofoldObject(result['inference']);
        const native = inference['value'] as
          | { choices?: { message?: { content?: unknown } }[] }
          | undefined;
        if (native?.choices?.[0]?.message?.content !== text) publish({ kind: 'withdrawn' });
        return terminal;
      } catch (error) {
        publish({ kind: 'withdrawn' });
        // Observe the SAME accepted Run through the existing polling/receipt owner.
        // There is no replayable direct stream and no second inference request.
        if (accepted) return accepted;
        throw error;
      }
    }
    const reader = response.body?.getReader();
    if (!reader) {
      if (!response.ok) throw new MacrofoldHttpError(response.status, '');
      throw new InvalidData('Macrofold returned an empty response.');
    }
    const chunks: Uint8Array[] = [];
    let length = 0;
    const cancel = () => {
      void reader.cancel().catch(() => {});
    };
    control.addEventListener('abort', cancel, { once: true });
    try {
      for (;;) {
        control.throwIfAborted();
        const chunk = await reader.read();
        control.throwIfAborted();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > maxResponseBytes)
          throw new InvalidData('Macrofold response exceeds the size limit.');
        chunks.push(chunk.value);
      }
    } catch (error) {
      if (!response.ok) throw new MacrofoldHttpError(response.status, '');
      throw error;
    } finally {
      control.removeEventListener('abort', cancel);
      cancel();
      reader.releaseLock();
    }
    let raw: string;
    try {
      raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length));
    } catch {
      if (!response.ok) throw new MacrofoldHttpError(response.status, '');
      throw new InvalidData('Invalid Macrofold response encoding.');
    }
    if (!response.ok) {
      let code = '';
      try {
        const body = JSON.parse(raw);
        const candidate = body?.error?.code;
        if (typeof candidate === 'string' && /^[a-z_]{1,80}$/.test(candidate)) code = candidate;
      } catch {
        /* No untrusted response prose in errors or logs. */
      }
      throw new MacrofoldHttpError(response.status, code);
    }
    const value: unknown = JSON.parse(raw);
    serialize(value, maxResponseBytes);
    return value;
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
export function validateMacrofoldValue<T>(schema: unknown, value: unknown): T {
  if (!compileSchema(schema)(value))
    throw new InvalidData('Macrofold output did not match the requested schema.');
  return value as T;
}
