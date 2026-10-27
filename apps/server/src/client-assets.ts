import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createAssetDelivery, type AuthorizeAsset } from './asset-delivery.js';
import type { AssetResolver } from './asset-runtime.js';
import { assetRepositoryRoot } from './asset-configuration.js';
import type { ViteDevServer } from 'vite';

/** The same presentation runs on an empty host and an adopted world. Asset
 * delivery owns no gameplay service, authentication grant or simulation timer.
 */
export interface ClientAssets {
  serve(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> | void;
  close(budget?: { timeoutMs: number; signal?: AbortSignal }): Promise<void>;
}
export interface ClientAssetOptions {
  authorizeAsset?: AuthorizeAsset;
  assetResolver?: AssetResolver;
  /** Use the host's configured finite HTTP request allowance for asset output. */
  networkCapacity?: number;
  /** Authenticated local authoring uses its selected lock and the same cookie-protected route. */
  assetWork?: { indexPath?: string };
}
export async function createClientAssets(
  production = false,
  options: ClientAssetOptions = {},
): Promise<ClientAssets> {
  const delivery = await createAssetDelivery(
    options.authorizeAsset,
    options.assetResolver,
    options.networkCapacity,
  );
  let vite: ViteDevServer | undefined;
  try {
    const workConfiguration =
      options.assetWork && !production
        ? (await import('../../client/vite.config.js')).clientViteConfiguration({
            studies: true,
            indexPath: options.assetWork.indexPath,
            localAssetDelivery: true,
          })
        : undefined;
    vite = production
      ? undefined
      : await (
          await import('vite')
        ).createServer(
          workConfiguration
            ? {
                ...workConfiguration,
                configFile: false,
                server: {
                  ...workConfiguration.server,
                  middlewareMode: true,
                  host: '127.0.0.1',
                  hmr: false,
                  ws: false,
                },
                appType: 'spa',
              }
            : {
                configFile: resolve(assetRepositoryRoot, 'apps/client/vite.config.ts'),
                server: { middlewareMode: true },
                appType: 'spa',
              },
        );
  } catch (error) {
    await delivery.close();
    throw error;
  }
  const assets = resolve(assetRepositoryRoot, 'dist/client');
  let closing: Promise<void> | undefined;
  return {
    close(budget) {
      closing ??= (async () => {
        const wallEnd = budget ? Date.now() + budget.timeoutMs : undefined;
        const monoEnd = budget ? performance.now() + budget.timeoutMs : undefined;
        try {
          await vite?.close();
        } finally {
          await delivery.close(
            budget && wallEnd !== undefined && monoEnd !== undefined
              ? {
                  timeoutMs: Math.max(
                    1,
                    Math.floor(Math.min(wallEnd - Date.now(), monoEnd - performance.now())),
                  ),
                  signal: budget.signal,
                }
              : undefined,
          );
        }
      })();
      return closing;
    },
    async serve(request, response, url) {
      if (await delivery.serve(request, response, url)) return;
      if (vite) {
        vite.middlewares(request, response);
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405);
        response.end();
        return;
      }
      try {
        const path = resolve(
          assets,
          `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`,
        );
        if (!path.startsWith(`${assets}${sep}`)) {
          response.writeHead(403);
          response.end();
          return;
        }
        if (!(await stat(path)).isFile()) throw new Error('not-found');
        const types: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
        };
        response.writeHead(200, {
          'Content-Type': types[extname(path)] ?? 'application/octet-stream',
          'Cache-Control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600',
        });
        response.end(request.method === 'HEAD' ? undefined : await readFile(path));
      } catch {
        response.writeHead(404);
        response.end('Not found. Build the client with pnpm run build.');
      }
    },
  };
}
