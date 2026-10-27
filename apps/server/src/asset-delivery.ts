import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { createNetworkOwner } from '@open-legend/network';
import { ownNodeStream, pipeOwned } from '@open-legend/network/node';
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
  capacity = 16,
) {
  const network = createNetworkOwner({ role: 'server-asset-output', capacity });
  const resolver = suppliedResolver ?? (await createAssetResolver({ purpose: 'runtime' }));
  const allowed = (request: IncomingMessage, reference: ArtifactReference) =>
    authorize ? authorize(request, reference) : reference.accessDomain === 'public';
  let closing: Promise<void> | undefined;
  return {
    close: async (budget: { timeoutMs: number; signal?: AbortSignal } = { timeoutMs: 30_000 }) => {
      network.stop('shutdown');
      if (!closing) {
        const wallEnd = Date.now() + budget.timeoutMs;
        const monoEnd = performance.now() + budget.timeoutMs;
        closing = (async () => {
          // Cache shutdown cannot clear pins while a stopped HTTP pipeline still
          // owns its source or socket. Waiting ends independently at shutdown's
          // existing deadline; actual cleanup retains those pins until closure.
          await network.whenIdle();
          const remaining = Math.max(
            1,
            Math.floor(Math.min(wallEnd - Date.now(), monoEnd - performance.now())),
          );
          await resolver.close({ timeoutMs: remaining, signal: budget.signal });
        })();
      }
      const result = await network.shutdown(budget, closing);
      if (result.unresolved) throw new Error('Asset output shutdown has unsettled owned streams.');
      await closing;
    },
    async serve(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
      if (!url.pathname.startsWith('/__assets/')) return false;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end();
        return true;
      }
      const cancellation = new AbortController();
      const abort = () => {
        if (!response.writableFinished) cancellation.abort();
      };
      response.once('close', abort);
      try {
        await network.run(
          { timeoutMs: 300_000, signal: cancellation.signal },
          async (operation) => {
            const output = ownNodeStream(operation, response);
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
              if (
                !(await operation.wait('callback', () =>
                  Promise.resolve(allowed(request, reference)),
                ))
              ) {
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
                response.writeHead(416, {
                  ...headers,
                  'Content-Range': 'bytes */' + reference.bytes,
                });
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
              let adoptedFile: Awaited<ReturnType<AssetResolver>> | undefined;
              try {
                const file = await operation.wait('body', async () => {
                  const acquired = await resolver(repositoryPath, operation.signal);
                  try {
                    operation.throwIfStopped();
                    adoptedFile = acquired;
                    return acquired;
                  } catch (error) {
                    await acquired.release?.();
                    throw error;
                  }
                });
                if (
                  !(await operation.wait('callback', () =>
                    Promise.resolve(allowed(request, reference)),
                  ))
                ) {
                  response.writeHead(403, { 'Cache-Control': 'private, no-store' });
                  response.end('Access to this asset changed during preparation.');
                  return true;
                }
                operation.throwIfStopped();
                response.writeHead(range ? 206 : 200, headers);
                const source = createReadStream(file.path, range);
                const input = ownNodeStream(operation, source);
                try {
                  await pipeOwned(operation, source, response, {
                    maxBytes: Number(headers['Content-Length']),
                    exactBytes: Number(headers['Content-Length']),
                  });
                } finally {
                  input.stop();
                  output.stop();
                  // A stopped caller cannot release bytes still being read or written.
                  await Promise.all([input.closed, output.closed]);
                }
              } finally {
                await adoptedFile?.release?.();
              }
            } catch (error) {
              if (response.headersSent || response.destroyed) {
                output.stop();
                throw error;
              }
              // Keep the owned socket open long enough to deliver a preparation
              // refusal; stopping it first turns this failure into a reset.
              response.writeHead(503, { 'Cache-Control': 'no-store' });
              response.end('Asset preparation failed. Pull the selected assets and try again.');
            } finally {
              await output.closed;
            }
          },
        );
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
