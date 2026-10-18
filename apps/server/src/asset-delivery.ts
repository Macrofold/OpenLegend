import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { ArtifactReference } from '@open-legend/assets';
import { createAssetResolver, type AssetResolver } from './asset-runtime.js';

export type AuthorizeAsset = (
  request: IncomingMessage,
  reference: ArtifactReference,
) => boolean | Promise<boolean>;

function rangeOf(header: string, bytes: number): { start: number; end: number } | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || bytes === 0) return;
  const suffix = !match[1];
  const first = Number(suffix ? match[2] : match[1]);
  const last = match[2] ? Number(match[2]) : bytes - 1;
  if (!Number.isSafeInteger(first) || first < 0 || !Number.isSafeInteger(last)) return;
  const start = suffix ? Math.max(0, bytes - first) : first;
  const end = suffix ? bytes - 1 : Math.min(last, bytes - 1);
  return start <= end && start < bytes ? { start, end } : undefined;
}

/** A release lookup is not permission. Admission happens before local cache
 * preparation, and protected bytes are checked again after that wait. */
export async function createAssetDelivery(
  authorize?: AuthorizeAsset,
  suppliedResolver?: AssetResolver,
) {
  const resolver = suppliedResolver ?? (await createAssetResolver({ purpose: 'runtime' }));
  const allowed = (request: IncomingMessage, reference: ArtifactReference) =>
    authorize ? authorize(request, reference) : reference.accessDomain === 'public';
  return {
    close: () => resolver.close(),
    async serve(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
      if (!url.pathname.startsWith('/__assets/')) return false;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end();
        return true;
      }
      const cancellation = new AbortController();
      const abort = () => cancellation.abort();
      response.once('close', abort);
      try {
        let repositoryPath: string;
        let reference: ArtifactReference;
        try {
          repositoryPath = decodeURIComponent(url.pathname.slice('/__assets/'.length));
          reference = resolver.reference(repositoryPath);
        } catch {
          response.writeHead(404, { 'Cache-Control': 'no-store' });
          response.end('Asset is not in the selected release.');
          return true;
        }
        if (!(await allowed(request, reference))) {
          response.writeHead(403, { 'Cache-Control': 'private, no-store' });
          response.end('This asset requires current project access.');
          return true;
        }
        const release = url.searchParams.get('release');
        if (release !== null && release !== resolver.releaseSha256) {
          response.writeHead(409, { 'Cache-Control': 'no-store' });
          response.end('The selected asset release changed. Reload the page.');
          return true;
        }
        const selected = url.searchParams.get('sha256');
        if (selected !== null && selected !== reference.sha256) {
          response.writeHead(409, { 'Cache-Control': 'no-store' });
          response.end('The selected asset release changed. Reload the page.');
          return true;
        }
        const tag = '"' + reference.sha256 + '"';
        const headers: Record<string, string | number> = {
          'Content-Type': reference.mediaType,
          'X-Content-Type-Options': 'nosniff',
          'Accept-Ranges': 'bytes',
          ETag: tag,
          'Cache-Control':
            reference.accessDomain !== 'public'
              ? 'private, no-store'
              : selected
                ? 'public, max-age=31536000, immutable'
                : 'no-cache',
        };
        // Executable documents and editable sources are downloads here.
        // Reviewed galleries/viewers belong on their isolated tooling origin.
        if (
          !/^(?:image\/(?:png|jpeg|webp|gif|avif)|audio\/|video\/|font\/|model\/gltf-binary|application\/json(?:;|$))/.test(
            reference.mediaType,
          )
        ) {
          headers['Content-Disposition'] = 'attachment';
          headers['Content-Security-Policy'] = "sandbox; default-src 'none'";
        }
        if (request.headers['if-none-match']?.split(/\s*,\s*/).includes(tag)) {
          response.writeHead(304, headers);
          response.end();
          return true;
        }
        const rangeHeader =
          request.method === 'GET' &&
          (!request.headers['if-range'] || request.headers['if-range'] === tag)
            ? request.headers.range
            : undefined;
        const range = rangeHeader ? rangeOf(rangeHeader, reference.bytes) : undefined;
        if (rangeHeader && !range) {
          response.writeHead(416, { ...headers, 'Content-Range': 'bytes */' + reference.bytes });
          response.end();
          return true;
        }
        if (range)
          headers['Content-Range'] = `bytes ${range.start}-${range.end}/${reference.bytes}`;
        headers['Content-Length'] = range ? range.end - range.start + 1 : reference.bytes;
        if (request.method === 'HEAD') {
          response.writeHead(200, headers);
          response.end();
          return true;
        }
        const file = await resolver(repositoryPath, cancellation.signal);
        try {
          if (!(await allowed(request, reference))) {
            response.writeHead(403, { 'Cache-Control': 'private, no-store' });
            response.end('Access to this asset changed during preparation.');
            return true;
          }
          cancellation.signal.throwIfAborted();
          response.writeHead(range ? 206 : 200, headers);
          await pipeline(createReadStream(file.path, range), response, {
            signal: cancellation.signal,
          });
        } finally {
          await file.release?.();
        }
      } catch {
        if (response.headersSent || response.destroyed) response.destroy();
        else {
          response.writeHead(503, { 'Cache-Control': 'no-store' });
          response.end('Asset preparation failed. Pull the selected assets and try again.');
        }
      } finally {
        response.off('close', abort);
      }
      return true;
    },
  };
}
