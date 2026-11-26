import { toolHttp } from '../network.js';

export function localGameOrigin(value: string): URL | null {
  const origin = URL.parse(value);
  return origin &&
    origin.protocol === 'http:' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) &&
    !origin.username &&
    !origin.password &&
    origin.pathname === '/' &&
    !origin.search &&
    !origin.hash
    ? origin
    : null;
}

/** Use the running listener's local sign-in. Keep the redirect and cookie
 * inside the caller's bounded operation. No hosted or OIDC session is usable here. */
export async function localGameSession(origin: URL): Promise<string | null> {
  const login = await toolHttp(
    new URL('/auth/login', origin),
    { redirect: 'manual' },
    { timeoutMs: 10_000 },
  );
  if (login.status !== 303 || login.headers.get('Location') !== '/') return null;
  return (
    login.headers
      .getSetCookie()
      .find((value) => value.startsWith('ol_session='))
      ?.split(';')[0] ?? null
  );
}
