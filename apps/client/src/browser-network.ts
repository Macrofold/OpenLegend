import {
  createNetworkOwner,
  NetworkError,
  requestText,
  subscribeEvents,
} from '@open-legend/network';
import type { EventFrame, Subscription, ConsumptionContext } from '@open-legend/network';
import { browserRequestPolicy } from './network-policies';

// Stable document owners count abandoned underlying work as well as visible waits.
const reads = createNetworkOwner({ role: 'browser-api-reads', capacity: 16 });
const commands = createNetworkOwner({ role: 'browser-commands-control', capacity: 8 });
const presence = createNetworkOwner({ role: 'browser-presence', capacity: 1 });
const subscriptions = createNetworkOwner({ role: 'browser-subscriptions', capacity: 4 });
export const assetNetwork = createNetworkOwner({ role: 'browser-asset-network', capacity: 4 });
const owners = [reads, commands, presence, subscriptions, assetNetwork];
/** Read-only, on-demand diagnostics; there is no background sampling or reset. */
export const browserNetworkSnapshot = () => owners.map((owner) => owner.snapshot());
const utf8 = new TextEncoder();
const resume = () => {
  // Queued network data cannot become current before suspended budgets expire.
  for (const owner of owners) owner.checkDeadlines();
};
if (
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function' &&
  typeof document !== 'undefined'
) {
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resume();
  });
}
export interface BrowserReply {
  status: number;
  ok: boolean;
  body: unknown;
}
/** Safe display text with structured transport evidence retained for recovery. */
export class BrowserRequestError extends Error {
  constructor(
    message: string,
    readonly failure: NetworkError,
  ) {
    super(message, { cause: failure });
  }
}
export interface BrowserRequestObservation {
  phase: 'started' | 'completed' | 'failed';
  id: number;
  path: string;
  at: number;
  input?: unknown;
  status?: number;
  result?: unknown;
}
let requestObserver: ((value: BrowserRequestObservation) => undefined) | undefined;
let observationId = 0;
/** Optional profiling observes already-consumed replies; it never clones a body
 * or changes transport ownership. Stopping removes preparation from later calls. */
export function observeBrowserRequests(
  observer: (value: BrowserRequestObservation) => undefined,
): () => void {
  if (requestObserver) throw new Error('A browser request recorder is already active.');
  requestObserver = observer;
  return () => {
    if (requestObserver === observer) requestObserver = undefined;
  };
}
export function browserRequest(
  path: string,
  init: Omit<RequestInit, 'body' | 'method' | 'headers'> & {
    method?: 'GET' | 'POST';
    body?: string;
    headers?: Record<string, string>;
  },
  body?: unknown,
  prepare?: () => Promise<Record<string, string> | void>,
): Promise<BrowserReply> {
  const method = init.method === 'POST' ? 'POST' : 'GET';
  const policy = browserRequestPolicy(method, path, body);
  const owner =
    policy.semantic === 'presence'
      ? presence
      : policy.semantic === 'read' || policy.semantic === 'preparation'
        ? reads
        : commands;
  let captured: typeof requestObserver;
  let id = 0;
  const observe = (
    phase: BrowserRequestObservation['phase'],
    status?: number,
    result?: unknown,
  ) => {
    if (!captured || captured !== requestObserver) return;
    try {
      captured({ phase, id, path, at: performance.now(), input: body, status, result });
    } catch {
      /* Optional recording cannot change request acceptance or delivery. */
    }
  };
  return owner
    .run({ timeoutMs: policy.timeoutMs, signal: init.signal ?? undefined }, async (operation) => {
      const preparedHeaders = prepare ? await operation.wait('admission', prepare) : undefined;
      if (requestObserver) {
        captured = requestObserver;
        id = ++observationId;
        observe('started');
      }
      const result = await requestText(operation, {
        url: path,
        init: { ...init, method, headers: { ...init.headers, ...preparedHeaders } },
        bodyPolicy: { kind: 'complete-projection', owner: 'browser-api' },
      });
      operation.throwIfStopped();
      let parsed: unknown;
      try {
        parsed = JSON.parse(result.text);
      } catch {
        /* Status remains usable without JSON. */
      }
      operation.throwIfStopped();
      observe('completed', result.status, parsed);
      return {
        status: result.status,
        ok: result.status >= 200 && result.status < 300,
        body: parsed,
      };
    })
    .catch((error: unknown) => {
      observe('failed');
      if (!(error instanceof NetworkError)) throw error;
      // Known authorization/rejection status survives an unreadable error body.
      // No body/private result from the expired operation is adopted here.
      if (error.status !== undefined && (error.status < 200 || error.status >= 300))
        return { status: error.status, ok: false, body: undefined };
      if (error.kind === 'capacity_unavailable')
        throw new BrowserRequestError(
          'Earlier server requests are still finishing. Wait before continuing.',
          error,
        );
      if (policy.semantic === 'mutation')
        throw new BrowserRequestError(
          error.dispatch === 'not_started'
            ? 'This change was not sent. Refresh before trying again.'
            : 'This change is unconfirmed. Check its saved result or current state before sending another change.',
          error,
        );
      throw new BrowserRequestError(
        'The requested information is unavailable. Refresh to reconnect.',
        error,
      );
    });
}
export function browserSubscription(
  url: string,
  signal: AbortSignal,
  kind: 'game' | 'private-progress',
  consume: (frame: EventFrame, context: ConsumptionContext) => void | Promise<void>,
): Subscription {
  return subscribeEvents(
    subscriptions,
    {
      mode: 'subscription',
      url,
      signal,
      init: { credentials: 'same-origin', cache: 'no-store' },
      connectTimeoutMs: 15_000,
      heartbeatTimeoutMs: 45_000,
      framePolicy:
        kind === 'game'
          ? { kind: 'complete-projection', owner: 'game-events' }
          : { kind: 'bounded', maxFrameBytes: 128 * 1024 + 1024 },
    },
    (frame, context) => {
      // The server's existing allowance is JSON payload bytes; SSE event/id
      // lines need bounded additional room without shrinking supported snapshots.
      if (
        kind === 'private-progress' &&
        frame.kind === 'event' &&
        utf8.encode(frame.data).byteLength > 128 * 1024
      )
        throw new Error('The reply update exceeds its delivery allowance.');
      return consume(frame, context);
    },
  );
}
