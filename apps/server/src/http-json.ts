import type { IncomingMessage, ServerResponse } from 'node:http';

const DEFAULT_BODY_BYTES = 16_384;
export const AUTHORING_BODY_BYTES = 128 * 1024;
const EDITOR_BODY_BYTES = 1_048_576;
const BODY_TIMEOUT_MS = 10_000;
export const LAB_IMPORT_BODY_TIMEOUT_MS = 120_000;

/** Apply the ordinary receive deadline before authentication/queued work. Only
 * the explicit streamed bundle upload receives the longer file-transfer window. */
export function receiveBodyDeadline(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): void {
  // Header callbacks precede IncomingMessage.complete even for bodyless GETs.
  // Those requests must not put the response stream under a receive deadline.
  const framedBody =
    Number(request.headers['content-length'] ?? 0) > 0 ||
    request.headers['transfer-encoding'] !== undefined;
  if (request.complete || !framedBody) return;
  const duration =
    pathname === '/api/cognition-lab/imports' ? LAB_IMPORT_BODY_TIMEOUT_MS : BODY_TIMEOUT_MS;
  const timer = setTimeout(() => {
    // A body can be fully received but unread while authentication is pending.
    // Node need not emit stream 'end' until consumption; processing owns no timer.
    if (request.complete) return;
    if (!response.headersSent) response.writeHead(408, { Connection: 'close' });
    response.end();
    request.destroy();
  }, duration);
  timer.unref();
  const clear = () => clearTimeout(timer);
  request.once('end', clear);
  request.once('close', clear);
}

/** JSON escaping can make the transport larger than the validated candidate. Only the
 * authoring and structured draft editing get the shared bounded envelope; ordinary mutations keep their limit.
 * docs/world-agent-mcp.md#local-transport-parity
 */
export function httpBodyLimit(pathname: string): number {
  if (
    pathname === '/api/world-agent/authoring' ||
    pathname === '/api/world-agent/session/draft-save' ||
    pathname === '/api/world-agent/session/draft-preview'
  )
    return AUTHORING_BODY_BYTES;
  return pathname.startsWith('/api/god/editor/') || pathname === '/api/cognition-lab/operations'
    ? EDITOR_BODY_BYTES
    : DEFAULT_BODY_BYTES;
}

export function readHttpJson(
  request: IncomingMessage,
  pathname: string,
  retain?: (bytes: number) => void,
): Promise<unknown> {
  return readBoundedJson(request, httpBodyLimit(pathname), retain);
}

/** Both HTTP adapters use the same byte/decode/deadline boundary before schema validation. */
export async function readBoundedJson(
  request: IncomingMessage,
  limit: number,
  retain?: (bytes: number) => void,
): Promise<unknown> {
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
      retain?.(buffer.length);
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
