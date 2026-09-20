import { serialize, record, compileSchema } from './validation.js';
import type { FetchTransport } from './types.js';

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
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
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
        if (typeof candidate === 'string' && /^[a-z_]{1,80}$/.test(candidate))
          code = `: ${candidate}`;
      } catch {
        /* No untrusted response prose in errors or logs. */
      }
      throw new Error(`Macrofold request failed (HTTP ${response.status}${code}).`);
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
