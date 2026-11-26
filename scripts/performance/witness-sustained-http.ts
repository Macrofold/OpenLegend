import { createNetworkOwner, requestText, type HttpRequest } from '@open-legend/network';

export interface SustainedHttpWrite {
  authority: { scope: string; generation: string };
  body: object;
  publication?: HttpRequest['publication'];
  onResponse?: (status: number) => void;
}

export function createSustainedHttp(
  base: string,
  role: string,
  capacity: number,
  timeoutMs: number,
) {
  const network = createNetworkOwner({ role, capacity });
  return {
    async request<T>(
      session: { cookie: string; clientId: string },
      path: string,
      write?: SustainedHttpWrite,
      signal?: AbortSignal,
    ) {
      return network.run({ timeoutMs, signal }, async (operation) => {
        const response = await requestText(operation, {
          url: new URL(path, base),
          init: {
            headers: {
              Cookie: session.cookie,
              'X-OL-Client': session.clientId,
              ...(write && {
                Origin: base,
                'Content-Type': 'application/json',
                'X-OL-Scope': write.authority.scope,
                'X-OL-Generation': write.authority.generation,
              }),
            },
            ...(write && { method: 'POST', body: JSON.stringify(write.body) }),
          },
          bodyPolicy: { kind: 'complete-projection', owner: 'browser-api' },
          publication: write?.publication,
        });
        write?.onResponse?.(response.status);
        const result = JSON.parse(response.text) as T;
        operation.throwIfStopped();
        return { status: response.status, result };
      });
    },
    stop: () => network.stop('shutdown'),
  };
}
