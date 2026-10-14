import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

/** The same presentation runs on an empty host and an adopted world. Asset
 * delivery owns no gameplay service, authentication grant or simulation timer.
 */
export interface ClientAssets {
  serve(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> | void;
  close(): Promise<void>;
}
export async function createClientAssets(production = false): Promise<ClientAssets> {
  const vite = production
    ? undefined
    : await (
        await import('vite')
      ).createServer({
        configFile: resolve('apps/client/vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
  const assets = resolve('dist/client');
  let closed = false;
  return {
    async close() {
      if (closed) return;
      closed = true;
      await vite?.close();
    },
    async serve(request, response, url) {
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
