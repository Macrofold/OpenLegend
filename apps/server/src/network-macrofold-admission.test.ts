import { afterEach, describe, expect, it, vi } from 'vitest';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { MacrofoldBackend } from './macrofold.js';
import type { WorldAgentTurn } from './world-authoring.js';

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

afterEach(() => vi.unstubAllGlobals());

describe('protected authoring admission through the actual server and PostgreSQL journal', () => {
  it('journals one late accepted Run before cancelling that same Run after conversation closure', async () => {
    const admitted = deferred<void>(),
      response = deferred<Response>(),
      journalStarted = deferred<void>(),
      journalAllowed = deferred<void>(),
      cancelled = deferred<void>();
    const paths: string[] = [];
    let admissionSignal: AbortSignal | null | undefined;
    let journalKey = '';
    const config = readConfig({
      AI_BUDGET_USD: '100',
      MACROFOLD_API_KEY: 'fixture-only-key',
      MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
      MACROFOLD_WORKER_ID: 'fixture-worker',
      OPEN_LEGEND_GOD_MODE: 'true',
    });
    const fetcher = vi.fn(async (input: string, init: RequestInit): Promise<Response> => {
      const url = new URL(input);
      expect(url.origin).toBe('https://macrofold.fixture.invalid');
      paths.push(url.pathname);
      if (url.pathname === '/v1/models')
        return Response.json({
          data: [
            {
              id: config.macrofoldModel,
              enabled: true,
              harnesses: [config.macrofoldHarness],
              billing_modes: [config.macrofoldBillingMode],
            },
          ],
        });
      if (url.pathname === '/v1/workspaces')
        return Response.json({ id: 'fixture-workspace', default_worktree_id: 'fixture-worktree' });
      if (url.pathname === '/v1/connections/fixture-connection/access')
        return Response.json({ version: 'fixture-access' });
      if (url.pathname === '/v1/connections/fixture-connection/access/rules')
        return Response.json({});
      if (url.pathname === '/v1/runs') {
        expect(JSON.parse(String(init.body))).toMatchObject({
          worker_id: 'fixture-worker',
          worktree_id: 'fixture-worktree',
          stream: true,
        });
        admissionSignal = init.signal;
        admitted.resolve();
        return response.promise;
      }
      if (url.pathname === '/v1/runs/late-original-run/cancel') {
        expect(journalKey).not.toBe('');
        const journal = await store.getIntegration(journalKey);
        expect(journal).toMatchObject({ response: { run_id: 'late-original-run' } });
        cancelled.resolve();
        return Response.json({ run_id: 'late-original-run', status: 'cancelling' });
      }
      throw new Error(`Unexpected synthetic Macrofold request ${url.pathname}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const store = await testRepository();
    const service = new WorldService(store, config);
    const putIntegration = store.putIntegration.bind(store);
    const retained: string[] = [];
    vi.spyOn(store, 'putIntegration').mockImplementation(async (key, value) => {
      if (
        value &&
        typeof value === 'object' &&
        'response' in value &&
        value.response &&
        typeof value.response === 'object' &&
        'run_id' in value.response &&
        value.response.run_id === 'late-original-run'
      ) {
        journalKey = key;
        journalStarted.resolve();
        await journalAllowed.promise;
        retained.push(key);
      }
      await putIntegration(key, value);
    });
    await enterLocalWorld(service);
    const backend = new MacrofoldBackend(service);
    const beginRun = vi.fn(async () => {}),
      progress = vi.fn(async () => {});
    try {
      const authority = service.localScope;
      const turn: WorldAgentTurn = {
        turnId: 'fixture-turn',
        authority,
        sessionId: 'fixture-authoring-session',
        contextHandle: 'fixture-private-context',
        connectionId: 'fixture-connection',
        toolNames: [],
        budget: { id: 'fixture-budget', limitUsd: 1 },
        runUsd: 0.01,
        timeoutSeconds: 300,
        prompt: 'Synthetic fixture only. No world changes.',
        profile: 'discovery',
        beginRun,
        onProgress: progress,
      };
      const pending = backend.message(
        {
          requestId: 'fixture-request',
          conversationId: 'fixture-conversation',
          worldId: service.world.id,
          text: 'A synthetic authoring request.',
        },
        authority,
        turn,
      );
      await admitted.promise;
      await backend.closeConversation(turn.sessionId, authority, true);
      const closedReply = await pending;
      expect(closedReply.ok).toBe(false);
      expect(closedReply.code).not.toBe('completed');
      expect(admissionSignal?.aborted).toBe(false);
      expect(paths.filter((path) => path.endsWith('/cancel'))).toEqual([]);
      response.resolve(
        Response.json({
          run_id: 'late-original-run',
          worker_id: 'fixture-worker',
          worktree_id: 'fixture-worktree',
          session_id: 'fixture-provider-session',
          urls: {
            status: '/v1/runs/late-original-run',
            result: '/v1/runs/late-original-run/result',
          },
        }),
      );
      await journalStarted.promise;
      expect(paths.filter((path) => path.endsWith('/cancel'))).toEqual([]);
      journalAllowed.resolve();
      await cancelled.promise;
      // Inspect the actual persisted owner records after the background cleanup starts.
      const keys = retained.filter((key) => key.includes(':operation:run:'));
      expect(keys).toHaveLength(1);
      expect(await store.getIntegration(keys[0]!)).toMatchObject({
        response: {
          run_id: 'late-original-run',
          worker_id: 'fixture-worker',
          worktree_id: 'fixture-worktree',
        },
      });
      expect(paths.filter((path) => path === '/v1/runs')).toHaveLength(1);
      expect(paths.filter((path) => path.endsWith('/cancel'))).toEqual([
        '/v1/runs/late-original-run/cancel',
      ]);
      expect(paths.some((path) => path.endsWith('/result') || path.endsWith('/stream'))).toBe(
        false,
      );
      expect(beginRun).not.toHaveBeenCalled();
      expect(progress).not.toHaveBeenCalled();
    } finally {
      journalAllowed.resolve();
      backend.stop();
      await store.close();
    }
  });
});
