import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from './config.js';

export function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

export function gameCookie(
  authentication: AppConfig['authentication'],
  name: string,
  value: string,
  maxAge?: number,
) {
  return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/${authentication.mode === 'oidc' && authentication.origin.startsWith('https:') ? '; Secure' : ''}${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;
}
export function readGameCookie(
  request: IncomingMessage,
  name: 'ol_session' | 'ol_login' | 'ol_invite',
) {
  return new RegExp(`(?:^|;\\s*)${name}=([a-f0-9]{64})(?:;|$)`).exec(
    request.headers.cookie ?? '',
  )?.[1];
}

/** Both runtime compositions use the exact same HTTP host and navigation
 * admission. API origin/authority checks still run before any scoped read. */
export function gameHttpLocation(
  request: IncomingMessage,
  port: number,
  authentication: AppConfig['authentication'],
):
  | { readonly url: URL; readonly ownOrigin: string }
  | { readonly redirect: string }
  | { readonly status: number; readonly code: string; readonly message: string } {
  let url: URL;
  try {
    url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  } catch {
    return { status: 400, code: 'url', message: 'Invalid URL.' };
  }
  const loopbackHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
  const publicOrigin = authentication.mode === 'oidc' ? new URL(authentication.origin) : undefined;
  const allowedHosts = publicOrigin ? new Set([publicOrigin.host]) : loopbackHosts;
  if (!allowedHosts.has(request.headers.host ?? '')) {
    if (
      authentication.insecureLoopback &&
      publicOrigin?.protocol === 'http:' &&
      loopbackHosts.has(publicOrigin.host) &&
      loopbackHosts.has(request.headers.host ?? '') &&
      (request.method === 'GET' || request.method === 'HEAD') &&
      request.url?.startsWith('/') &&
      !['/api', '/auth', '/mcp'].some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
      )
    )
      return { redirect: `${publicOrigin.origin}${url.pathname}${url.search}` };
    return { status: 403, code: 'host', message: 'Use the configured game host.' };
  }
  return {
    url,
    ownOrigin:
      authentication.mode === 'oidc' ? authentication.origin : `http://${request.headers.host}`,
  };
}
