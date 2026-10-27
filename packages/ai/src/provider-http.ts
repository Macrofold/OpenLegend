import {
  consumeHttp,
  createNetworkOwner,
  type HttpBytes,
  type HttpRequest,
  type NetworkOperation,
  type NetworkOwner,
} from '@open-legend/network';
import type { FetchTransport } from './types.js';

// Unconfigured/recreated clients share admission; reconstructing a client must
// never refund slots held by an uncooperative earlier request.
const providerNetwork = createNetworkOwner({ role: 'ai-provider', capacity: 32 });

/** A provider timeout or server failure cannot prove that dispatched work did not finish. */
export function uncertainHttpStatus(status: number): boolean {
  return status === 408 || status >= 500;
}

export function providerOwner(network?: NetworkOwner, transport?: FetchTransport): NetworkOwner {
  return (
    network ??
    (transport
      ? createNetworkOwner({ role: 'ai-injected-provider', capacity: 32, fetch: transport })
      : providerNetwork)
  );
}

/** Provider semantics remain outside the shared HTTP reader. Failed bodies are
 * optional diagnostics, capped at 8 KiB, while their known status survives a stall.
 */
export async function providerText(
  operation: NetworkOperation,
  request: HttpRequest,
  headers: (metadata: Omit<HttpBytes, 'bytes'>) => void,
): Promise<string> {
  let failed = false;
  let length = 0;
  const chunks: Uint8Array[] = [];
  const decode = () =>
    new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length));
  return consumeHttp<string>(operation, request, {
    headers(metadata) {
      failed = metadata.status < 200 || metadata.status >= 300;
      headers(metadata);
    },
    chunk(bytes) {
      if (failed && length + bytes.byteLength > 8192) return { kind: 'complete', value: '' };
      chunks.push(bytes.slice());
      length += bytes.byteLength;
      return { kind: 'continue' };
    },
    end: decode,
  });
}
