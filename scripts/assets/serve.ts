import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve, sep } from 'node:path';
import type { ArtifactReference } from '@open-legend/assets';
import {
  assetRepositoryRoot,
  readAssetConfiguration,
} from '../../apps/server/src/asset-configuration.js';
import { S3AssetStorage } from '../../apps/server/src/asset-storage.js';
import { createAssetResolver } from '../../apps/server/src/asset-runtime.js';
import { createClientAssets, type ClientAssets } from '../../apps/server/src/client-assets.js';
import { AssetRepository, AssetAccessError } from '../../apps/server/src/asset-repository.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';

export interface AssetWorkServerOptions {
  configPath?: string;
  indexPath?: string;
  port: number;
  page: string;
}
export interface AssetWorkServer {
  /** Ephemeral local login only; never a permanent study or artifact URL. */
  url: string;
  port: number;
  close(): Promise<void>;
}
const pages = new Set(['/', '/art-study.html', '/scene-study.html']);
const allowedBoundaries = new Set(['runtime', 'art-studies', 'art-library']);
const codeExtension = /\.(?:[cm]?[jt]sx?|css|map|wasm)$/i;
const jsonModules = new Set([
  '/src/props/art-study/layout.json',
  '/src/props/art-study/selections.json',
  '/src/characters/mercenary-assets/mercenary-sculpted-provenance.json',
]);
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );
const equalSecret = (supplied: string | undefined, expected: string) => {
  const bytes = Buffer.from(supplied ?? '');
  const secret = Buffer.from(expected);
  return bytes.length === secret.length && timingSafeEqual(bytes, secret);
};
const allowedReference = (reference: ArtifactReference) =>
  allowedBoundaries.has(reference.boundary) &&
  (reference.accessDomain === 'public' || reference.accessDomain === 'curated-private');

/** Vite serves reviewed application code. Media/source bytes have only the exact-lock route. */
function codeRequest(pathname: string): boolean {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (path === '/@vite/client' || path === '/@vite/env' || path.startsWith('/@id/')) return true;
  if (jsonModules.has(path)) return true;
  if (!codeExtension.test(path)) return false;
  if (path.startsWith('/src/') || path.startsWith('/node_modules/')) return true;
  if (!path.startsWith('/@fs/')) return false;
  const absolute = resolve(path.slice('/@fs/'.length));
  const roots = [
    'node_modules',
    'apps/client/src',
    'packages/assets/src',
    'packages/protocol/src',
    'packages/spatial/src',
    'packages/language/src',
  ].map((directory) => resolve(assetRepositoryRoot, directory) + sep);
  return roots.some((root) => absolute.startsWith(root));
}

export async function serveAssetWork(options: AssetWorkServerOptions): Promise<AssetWorkServer> {
  if (!Number.isSafeInteger(options.port) || options.port < 0 || options.port > 65535)
    throw new Error('Choose a loopback port from 0 through 65535.');
  if (!pages.has(options.page))
    throw new Error(
      'The operator viewer supports /art-study.html, /scene-study.html or /. Historical pages require a separately registered, verified viewer.',
    );
  const configuration = await readAssetConfiguration(options.configPath);
  const identity = new S3AssetStorage(configuration);
  let principal: string;
  try {
    principal = await identity.principal();
  } finally {
    identity.close();
  }
  const databaseUrl = process.env['OPEN_LEGEND_DATABASE_URL'];
  if (!databaseUrl || !['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol))
    throw new Error(
      'The operator viewer requires OPEN_LEGEND_DATABASE_URL for current asset permissions.',
    );
  // Both the browser projection and exact delivery must use the same selection.
  // Inspector pages need recorded scenes and alternatives outside the game pack.
  const indexPath = options.indexPath
    ? resolve(options.indexPath)
    : resolve(assetRepositoryRoot, 'assets/locks/studies.json');
  const resolver = await createAssetResolver({ ...options, indexPath });
  const database = new PostgresDatabase(databaseUrl, true);
  const authority = new AssetRepository(database);
  const currentPermission = async (reference: ArtifactReference): Promise<boolean> => {
    try {
      await authority.authorizeArtifact({ accountId: principal }, resolver.release, reference);
      return true;
    } catch (error) {
      if (
        error instanceof AssetAccessError &&
        (error.code === 'forbidden' || error.code === 'unavailable')
      )
        return false;
      throw error;
    }
  };
  const ticket = randomBytes(32).toString('base64url');
  const session = randomBytes(32).toString('base64url');
  const cookieName = 'openlegend_asset_' + randomBytes(8).toString('hex');
  let expiresAt = 0;
  let used = false;
  let origin = '';
  let clients: ClientAssets | undefined;
  let closing: Promise<void> | undefined;
  const authenticated = (request: IncomingMessage) => {
    const cookies = request.headers.cookie?.split(';').map((cookie) => cookie.trim()) ?? [];
    const prefix = cookieName + '=';
    const values = cookies.filter((cookie) => cookie.startsWith(prefix));
    return values.length === 1 && equalSecret(values[0]?.slice(prefix.length), session);
  };
  const reply = (
    request: IncomingMessage,
    response: ServerResponse,
    status: number,
    text: string,
    mediaType = 'text/plain; charset=utf-8',
  ) => {
    response.writeHead(status, {
      'Content-Type': mediaType,
      'Content-Length': Buffer.byteLength(text),
    });
    response.end(request.method === 'HEAD' ? undefined : text);
  };
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; media-src 'self' blob:; connect-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    void (async () => {
      // Exact Host protects loopback from DNS rebinding; browser provenance is
      // checked before both ticket redemption and cookie-authorized requests.
      if (request.headers.host !== new URL(origin).host)
        return reply(request, response, 403, 'Unexpected local viewer host.');
      if (request.headers.origin !== undefined && request.headers.origin !== origin)
        return reply(request, response, 403, 'Cross-origin viewer requests are refused.');
      const site = request.headers['sec-fetch-site'];
      if (site !== undefined && site !== 'same-origin' && site !== 'none')
        return reply(request, response, 403, 'Cross-site viewer requests are refused.');
      if (request.headers.referer !== undefined) {
        let referringOrigin: string;
        try {
          referringOrigin = new URL(request.headers.referer).origin;
        } catch {
          return reply(request, response, 403, 'Invalid viewer origin.');
        }
        if (referringOrigin !== origin)
          return reply(request, response, 403, 'Cross-origin viewer requests are refused.');
      }
      const url = new URL(request.url ?? '/', origin);
      if (url.origin !== origin)
        return reply(request, response, 403, 'Unexpected viewer request target.');
      if (url.pathname === '/__asset-login') {
        if (request.method !== 'GET') return reply(request, response, 405, 'Login requires GET.');
        if (
          used ||
          Date.now() > expiresAt ||
          !equalSecret(url.searchParams.get('ticket') ?? undefined, ticket)
        )
          return reply(
            request,
            response,
            403,
            'This local login link is invalid, expired or already used. Restart the viewer for a new link.',
          );
        used = true;
        response.writeHead(303, {
          Location: options.page,
          'Set-Cookie': `${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/`,
        });
        response.end();
        return;
      }
      if (!authenticated(request))
        return reply(
          request,
          response,
          403,
          'Open the one-use local login link printed by pnpm assets serve.',
        );
      if (request.method !== 'GET' && request.method !== 'HEAD')
        return reply(request, response, 405, 'The operator viewer supports GET and HEAD.');
      if (url.pathname.startsWith('/__assets/') || url.pathname.startsWith('/__asset-records/')) {
        const records = url.pathname.startsWith('/__asset-records/');
        const prefix = records ? '/__asset-records/' : '/__assets/';
        let path: string;
        let reference: ArtifactReference;
        try {
          path = decodeURIComponent(url.pathname.slice(prefix.length));
          reference = resolver.reference(path);
        } catch {
          return reply(
            request,
            response,
            404,
            'The file is absent from the selected exact asset lock.',
          );
        }
        if (!allowedReference(reference))
          return reply(
            request,
            response,
            403,
            'This viewer does not grant access to creator, world-private, intake or recovery scopes.',
          );
        if (records) {
          if (!(await currentPermission(reference)))
            return reply(
              request,
              response,
              403,
              'Current asset permission or rights do not allow this retained record.',
            );
          const download =
            '/__assets/' +
            encodeURIComponent(path) +
            '?release=' +
            resolver.releaseSha256 +
            '&sha256=' +
            reference.sha256;
          const facts = [
            ['Repository reference', path],
            ['Storage collection', reference.boundary],
            ['Access scope', reference.accessDomain],
            ['Bytes', String(reference.bytes)],
            ['Media type', reference.mediaType],
            ['SHA-256', reference.sha256],
          ];
          const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Retained asset record</title><main><h1>Retained asset record</h1><p>This exact file belongs to the selected development collection. Its presence does not establish production or redistribution approval.</p><dl>${facts.map(([name, value]) => `<dt>${escapeHtml(name ?? '')}</dt><dd>${escapeHtml(value ?? '')}</dd>`).join('')}</dl><p><a href="${escapeHtml(download)}">Download the exact retained file</a></p><p><a href="/art-study.html">Open the art study</a></p></main></html>`;
          return reply(request, response, 200, body, 'text/html; charset=utf-8');
        }
      } else if (!pages.has(url.pathname) && !codeRequest(url.pathname))
        return reply(
          request,
          response,
          404,
          'No reviewed viewer page or application module exists at this path.',
        );
      if (!clients) return reply(request, response, 503, 'The local viewer is starting.');
      await clients.serve(request, response, url);
    })().catch(() => {
      if (response.headersSent || response.destroyed) response.destroy();
      else reply(request, response, 503, 'The local asset viewer could not prepare this request.');
    });
  });
  const close = (): Promise<void> => {
    closing ??= (async () => {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', interrupt);
      const stopped = server.listening
        ? new Promise<void>((accept, reject) =>
            server.close((error) => (error ? reject(error) : accept())),
          )
        : Promise.resolve();
      server.closeAllConnections();
      const results = await Promise.allSettled([
        stopped,
        clients ? clients.close() : resolver.close(),
        database.close(),
      ]);
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length)
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          'The operator viewer did not finish closing cleanly.',
        );
    })();
    return closing;
  };
  const interrupt = () => {
    void close().catch(() => {
      console.error('The local asset viewer could not finish closing cleanly.');
      process.exitCode = 1;
    });
  };
  try {
    clients = await createClientAssets(false, {
      assetResolver: resolver,
      assetWork: { indexPath },
      authorizeAsset: async (request, reference) =>
        authenticated(request) &&
        allowedReference(reference) &&
        (await currentPermission(reference)),
    });
    await new Promise<void>((accept, reject) => {
      server.once('error', reject);
      server.listen(options.port, '127.0.0.1', () => {
        server.off('error', reject);
        accept();
      });
    });
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('The viewer did not bind its loopback TCP address.');
    origin = `http://127.0.0.1:${address.port}`;
    expiresAt = Date.now() + 60_000;
    const url = `${origin}/__asset-login?ticket=${ticket}`;
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    console.log(
      JSON.stringify({
        url,
        expiresAt: new Date(expiresAt).toISOString(),
        page: options.page,
        profile: configuration.profile,
        project: configuration.accountId,
      }),
    );
    return { url, port: address.port, close };
  } catch (error) {
    await close();
    throw error;
  }
}
