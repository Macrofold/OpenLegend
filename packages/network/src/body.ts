import { NetworkError } from './errors.js';

export type BodyPolicy =
  | { kind: 'bounded'; maxBytes: number; exactBytes?: number }
  | { kind: 'complete-projection'; owner: 'browser-api' | 'game-events' };

export function validateBodyPolicy(policy: BodyPolicy): void {
  if (policy.kind === 'complete-projection') {
    if (policy.owner !== 'browser-api' && policy.owner !== 'game-events') {
      throw new TypeError('Complete projections require a reviewed owner');
    }
    return;
  }
  if (!Number.isSafeInteger(policy.maxBytes) || policy.maxBytes < 0) {
    throw new RangeError('Body allowance must be a nonnegative safe integer');
  }
  if (
    policy.exactBytes !== undefined &&
    (!Number.isSafeInteger(policy.exactBytes) ||
      policy.exactBytes < 0 ||
      policy.exactBytes > policy.maxBytes)
  ) {
    throw new RangeError('Exact body length must fit its allowance');
  }
}

export function checkDeclaredLength(headers: Headers, policy: BodyPolicy, status: number): void {
  validateBodyPolicy(policy);
  const raw = headers.get('content-length');
  // Fetch exposes decoded bytes; an encoded wire length is not a decoded length.
  if (policy.kind !== 'bounded' || raw === null || headers.has('content-encoding')) return;
  if (!/^\d+$/.test(raw)) return;
  const length = Number(raw);
  if (!Number.isSafeInteger(length) || length > policy.maxBytes) {
    throw new NetworkError('body_too_large', 'body', 'started', status);
  }
  if (policy.exactBytes !== undefined && length !== policy.exactBytes) {
    throw new NetworkError('body_length_mismatch', 'body', 'started', status);
  }
}

export function checkBodyLength(
  bytes: number,
  policy: BodyPolicy,
  status?: number,
  complete = false,
): void {
  if (policy.kind !== 'bounded') return;
  if (bytes > policy.maxBytes) {
    throw new NetworkError('body_too_large', 'body', 'started', status);
  }
  if (complete && policy.exactBytes !== undefined && bytes !== policy.exactBytes) {
    throw new NetworkError('body_length_mismatch', 'body', 'started', status);
  }
}

export function decodeUtf8(bytes: Uint8Array, status?: number): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new NetworkError('invalid_encoding', 'body', 'started', status);
  }
}

export function joinBytes(chunks: readonly Uint8Array[], byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
