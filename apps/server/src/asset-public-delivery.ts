import type { Writable } from 'node:stream';
import type { NetworkOperation } from '@open-legend/network';
import { consumeHttpReadable, pipeOwned } from '@open-legend/network/node';
import { assetUrl, type ArtifactReference } from '@open-legend/assets';

export const isPublicDeliveryReference = (reference: ArtifactReference): boolean =>
  reference.accessDomain === 'public' &&
  (reference.boundary === 'runtime' || reference.boundary === 'art-studies');

/** Anonymous exact bytes only. The cache owns the writable sink and pathname;
 * this adapter's source is confined to the reviewed Node streaming boundary. */
export async function copyPublicAssetToCache(
  reference: ArtifactReference,
  sink: Writable,
  operation: NetworkOperation,
  runtimeEnvironment: 'production' | 'development' = 'production',
): Promise<void> {
  if (!isPublicDeliveryReference(reference))
    throw new Error('Anonymous asset reads require a published runtime or study reference.');
  const base =
    reference.boundary === 'runtime'
      ? 'https://assets.openlegend.ai' +
        (runtimeEnvironment === 'development' ? '/development' : '')
      : 'https://assets.openlegend.ai/studies';
  await consumeHttpReadable(
    operation,
    {
      url: assetUrl(reference, base),
      init: {
        redirect: 'error',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { 'accept-encoding': 'identity' },
      },
      bodyPolicy: { kind: 'bounded', maxBytes: reference.bytes, exactBytes: reference.bytes },
    },
    (response) => {
      let headers = 0;
      let headerBytes = 0;
      for (const [name, value] of response.headers) {
        headers++;
        headerBytes += Buffer.byteLength(name) + Buffer.byteLength(value);
      }
      const declared = response.headers.get('content-length');
      if (
        response.status !== 200 ||
        headers > 64 ||
        headerBytes > 32 * 1024 ||
        (response.headers.has('content-encoding') &&
          response.headers.get('content-encoding') !== 'identity') ||
        (declared !== null && Number(declared) !== reference.bytes) ||
        response.headers.get('content-type')?.toLowerCase() !== reference.mediaType.toLowerCase()
      )
        throw new Error('Public asset response does not match its bounded exact file description.');
    },
    async (source, _metadata, context) => {
      await pipeOwned(operation, source, sink, {
        maxBytes: reference.bytes,
        exactBytes: reference.bytes,
      });
      context.throwIfStopped();
    },
  );
}
