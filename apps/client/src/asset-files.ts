import {
  assetUrl as publicAssetUrl,
  sameAssetRevision,
  isRepositoryAssetPath,
  type AssetRevisionReference,
} from '@open-legend/assets';
import { delivery, files, release, releaseSha256 } from 'virtual:openlegend-assets';

export const installedAssetRelease = release;
export const isCurrentAssetRelease = (reference?: AssetRevisionReference): boolean =>
  sameAssetRevision(reference, release);

/** Only the release's permitted delivery projection enters this module. The
 * complete authoring/migration inventory can contain private source records. */
export function assetUrl(repositoryPath: string): string {
  const reference = files[repositoryPath];
  if (!reference) {
    if (!isRepositoryAssetPath(repositoryPath)) throw new Error('Unsafe asset path.');
    // The server's exact release lookup and current permission check resolve
    // scoped files. Their private hashes/cloud descriptors are not bundled.
    return '/__assets/' + encodeURIComponent(repositoryPath) + '?release=' + releaseSha256;
  }
  const base =
    reference.boundary === 'runtime'
      ? delivery.runtimeBaseUrl
      : reference.boundary === 'art-studies'
        ? delivery.studyBaseUrl
        : undefined;
  return base && reference.accessDomain === 'public'
    ? publicAssetUrl(reference, base)
    : '/__assets/' + encodeURIComponent(repositoryPath) + '?sha256=' + reference.sha256;
}

/** Game servers do not serve the full study build. The dedicated study build
 * keeps navigation beside its own pinned pages; game tools use the reviewed
 * hosted viewer configured at build time. */
export function studyPageUrl(page: 'art-study.html' | 'scene-study.html'): string | undefined {
  const base = delivery.studyViewerBaseUrl;
  return base ? new URL(page, new URL(base, window.location.href)).href : undefined;
}

const referencesByUrl = new Map(
  Object.entries(files).map(([path, reference]) => [assetUrl(path), reference]),
);

/** Verify exact bytes before handing them to model, image or generated-data
 * decoders. Streaming admission stops an oversized response before allocation. */
export async function readAssetBytes(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const reference = referencesByUrl.get(url);
  if (
    !reference &&
    (!/^\/__assets\/[^?#]+\?release=[a-f0-9]{64}$/.test(url) ||
      !url.endsWith('?release=' + releaseSha256))
  )
    throw new Error('Asset URL is outside the selected release.');
  const response = await fetch(url, { signal, redirect: 'error' });
  try {
    if (!response.ok) throw new Error('Asset download failed (' + response.status + ').');
    const declared = response.headers.get('content-length');
    const bytes = reference?.bytes ?? Number(declared ?? NaN);
    const sha256 =
      reference?.sha256 ?? /^"([a-f0-9]{64})"$/.exec(response.headers.get('etag') ?? '')?.[1];
    if (!Number.isSafeInteger(bytes) || bytes < 0 || !sha256) {
      throw new Error('Asset response is missing exact authorized file metadata.');
    }
    if (
      declared !== null &&
      !response.headers.has('content-encoding') &&
      Number(declared) !== bytes
    ) {
      throw new Error('Asset download length does not match its selected revision.');
    }
    const contents = new Uint8Array(bytes);
    let length = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Asset download has no body.');
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > contents.byteLength) {
          throw new Error('Asset download exceeds its selected revision length.');
        }
        contents.set(chunk.value, length - chunk.value.byteLength);
      }
    } finally {
      reader.releaseLock();
    }
    if (length !== bytes)
      throw new Error('Asset download is incomplete for its selected revision.');
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', contents));
    const actual = Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (actual !== sha256) throw new Error('Asset download checksum did not match.');
    signal?.throwIfAborted();
    return contents.buffer;
  } finally {
    // Refused metadata, error responses and failed allocation must release the
    // network body too. A stream already failed by cancellation keeps its cause.
    try {
      await response.body?.cancel();
    } catch {
      // Preserve the transfer/verification result rather than a cleanup error.
    }
  }
}

const decoder = new TextDecoder();
export async function readAssetJson<T>(repositoryPath: string, signal?: AbortSignal): Promise<T> {
  const contents = await readAssetBytes(assetUrl(repositoryPath), signal);
  return JSON.parse(decoder.decode(contents)) as T;
}
