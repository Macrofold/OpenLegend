import type { IncomingMessage } from 'node:http';

const DEFAULT_BODY_BYTES = 16_384;
const AUTHORING_BODY_BYTES = 128 * 1024;
const EDITOR_BODY_BYTES = 1_048_576;
const BODY_TIMEOUT_MS = 10_000;

/** JSON escaping can make the transport larger than the validated candidate. Only the
 * exact authoring route gets its MCP-sized envelope; ordinary mutations keep their limit.
 * docs/world-agent-mcp.md#local-transport-parity
 */
export function httpBodyLimit(pathname: string): number {
  if (pathname === '/api/world-agent/authoring') return AUTHORING_BODY_BYTES;
  return pathname.startsWith('/api/god/editor/') ? EDITOR_BODY_BYTES : DEFAULT_BODY_BYTES;
}

export async function readHttpJson(
  request: IncomingMessage,
  pathname: string,
): Promise<unknown> {
  const limit = httpBodyLimit(pathname);
  const declared = request.headers['content-length'];
  if (declared !== undefined) {
    const length = Number(declared);
    if (!Number.isSafeInteger(length) || length < 0 || length > limit)
      throw new Error('body-limit');
  }
  let bytes = 0;
  const chunks: Buffer[] = [];
  const timer = setTimeout(() => request.destroy(new Error('body-timeout')), BODY_TIMEOUT_MS);
  timer.unref();
  try {
    for await (const part of request) {
      const buffer = Buffer.isBuffer(part) ? part : Buffer.from(part as string);
      bytes += buffer.length;
      if (bytes > limit) throw new Error('body-limit');
      chunks.push(buffer);
    }
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
    } catch {
      throw new SyntaxError('Invalid UTF-8 JSON.');
    }
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timer);
  }
}
