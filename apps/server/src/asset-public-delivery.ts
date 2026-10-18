import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { assetUrl, type ArtifactReference } from '@open-legend/assets';

export const isPublicDeliveryReference = (reference: ArtifactReference): boolean =>
  reference.accessDomain === 'public' &&
  (reference.boundary === 'runtime' || reference.boundary === 'art-studies');

/** This anonymous transport has no AWS credentials, SQL connection or URL
 * override. AssetCache owns final hash verification before granting a reader;
 * this adapter bounds the HTTP response and writes only its reserved partial. */
export async function copyPublicAssetToCache(
  reference: ArtifactReference,
  destination: string,
  signal?: AbortSignal,
  runtimeEnvironment: 'production' | 'development' = 'production',
): Promise<void> {
  if (!isPublicDeliveryReference(reference))
    throw new Error('Anonymous asset reads require a published runtime or study reference.');
  const base =
    reference.boundary === 'runtime'
      ? 'https://assets.openlegend.ai' +
        (runtimeEnvironment === 'development' ? '/development' : '')
      : 'https://assets.openlegend.ai/studies';
  const transferSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(300_000)])
    : AbortSignal.timeout(300_000);
  const response = await fetch(assetUrl(reference, base), {
    signal: transferSignal,
    redirect: 'error',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: { 'accept-encoding': 'identity' },
  });
  let headers = 0;
  let headerBytes = 0;
  for (const [name, value] of response.headers) {
    headers++;
    headerBytes += Buffer.byteLength(name) + Buffer.byteLength(value);
  }
  const declared = response.headers.get('content-length');
  const body = response.body;
  if (
    response.status !== 200 ||
    !body ||
    headers > 64 ||
    headerBytes > 32 * 1024 ||
    (response.headers.has('content-encoding') &&
      response.headers.get('content-encoding') !== 'identity') ||
    (declared !== null && Number(declared) !== reference.bytes) ||
    response.headers.get('content-type')?.toLowerCase() !== reference.mediaType.toLowerCase()
  ) {
    await response.body?.cancel();
    throw new Error('Public asset response does not match its bounded exact file description.');
  }
  let received = 0;
  const bounded = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      callback(
        received > reference.bytes ? new Error('Public asset exceeded its reserved bytes.') : null,
        chunk,
      );
    },
  });
  async function* chunks() {
    const reader = body!.getReader();
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) return;
        yield next.value;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
  try {
    await pipeline(
      Readable.from(chunks(), { objectMode: false }),
      bounded,
      createWriteStream(destination, { flags: 'wx', mode: 0o600 }),
      { signal: transferSignal },
    );
    if (received !== reference.bytes) throw new Error('Public asset download was incomplete.');
  } catch (error) {
    await response.body?.cancel().catch(() => undefined);
    throw error;
  }
}
