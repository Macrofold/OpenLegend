import { serialize, record, compileSchema } from './validation.js';
import type { FetchTransport } from './types.js';

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
  ): Promise<unknown> {
    const url = new URL(path, this.base);
    // Returned polling URLs may not redirect bearer credentials to another host.
    if (url.origin !== this.base.origin) throw new Error('Macrofold returned a foreign URL.');
    if (!this.key) throw new Error('MACROFOLD_API_KEY is not configured.');
    if (body !== undefined && !operationId) throw new Error('Mutation requires an operation ID.');
    const response = await this.transport(url.href, {
      method: body === undefined ? 'GET' : 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        ...(operationId ? { 'Idempotency-Key': operationId } : {}),
      },
      ...(body === undefined ? {} : { body: serialize(body, 500_000) }),
      signal: signal ?? AbortSignal.timeout(30_000),
    });
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Macrofold returned an empty response.');
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 1_000_000) throw new Error('Macrofold response exceeds the size limit.');
        chunks.push(chunk.value);
      }
    } finally {
      await reader.cancel();
    }
    const raw = Buffer.concat(chunks).toString('utf8');
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
    return JSON.parse(raw) as unknown;
  }
}

export function macrofoldObject(value: unknown): Record<string, unknown> {
  if (!record(value)) throw new Error('Invalid Macrofold response.');
  return value;
}
export function macrofoldString(value: unknown): string {
  if (typeof value !== 'string' || !value.length)
    throw new Error('Missing Macrofold response field.');
  return value;
}
export function validateMacrofoldValue<T>(schema: unknown, value: unknown): T {
  if (!compileSchema(schema)(value))
    throw new Error('Macrofold output did not match the requested schema.');
  return value as T;
}
