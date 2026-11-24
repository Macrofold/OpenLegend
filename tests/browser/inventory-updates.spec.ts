import { randomUUID } from 'node:crypto';
import type {
  AiUsageView,
  ApiResult,
  ContainerPage,
  GamePatch,
  GameView,
} from '@open-legend/protocol';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

type Position = GameView['player']['position'];
type Movement = { revision: number; id: string; position: Position };

async function signIn(page: Page, base: string, subject: 'picker-a' | 'picker-b') {
  const loginForm = await page.goto(`${base}/auth/login`);
  expect(loginForm?.status(), 'The configured identity provider returned a sign-in form').toBe(200);
  await page.getByLabel('Test account').selectOption(subject);
  const [callback] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === '/auth/callback'),
    page.getByRole('button', { name: 'Confirm identity', exact: true }).click(),
  ]);
  expect(callback.status()).toBe(303);
  await page.waitForURL((url) => url.origin === base && url.pathname !== '/auth/callback');
}

function near(left: Position, right: Position) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z) < 0.08;
}

test('inventory keeps its search and focus during unrelated motion and refreshes a changed carried lot', async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const game = await rustBrowserGame({
    oidc: {
      origin: process.env['OPENLEGEND_TEST_RUST_ORIGIN'] ?? '',
      issuer: process.env['OPENLEGEND_TEST_RUST_OIDC_ISSUER'] ?? '',
      clientId: process.env['OPENLEGEND_TEST_RUST_OIDC_CLIENT_ID'] ?? '',
    },
  });
  const errors: string[] = [];
  const queries: string[] = [];
  const motion: Movement[] = [];
  let reads = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const prefix = 'fixture-view-movement ';
    if (message.text().startsWith(prefix))
      motion.push(JSON.parse(message.text().slice(prefix.length)) as Movement);
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/inventory') {
      reads++;
      queries.push(request.postDataJSON().query ?? '');
    }
  });
  async function state(request: APIRequestContext, headers: Record<string, string>) {
    const response = await request.get(`${game.base}/api/state`, { headers });
    expect(response.ok()).toBe(true);
    const view = (await response.json()) as GameView;
    await response.dispose();
    return view;
  }
  async function post(
    request: APIRequestContext,
    path: string,
    data: unknown,
    headers: Record<string, string>,
    view: GameView,
  ) {
    if (!view.access?.scope || !view.historyEpoch) throw new Error('Missing signed world scope.');
    const response = await request.post(`${game.base}${path}`, {
      data,
      headers: {
        ...headers,
        Origin: game.base,
        'X-OL-Scope': view.access.scope,
        'X-OL-Generation': view.historyEpoch.split(':')[0]!,
      },
    });
    expect(response.ok()).toBe(true);
    const result = (await response.json()) as ApiResult;
    expect(result.ok, result.message).toBe(true);
    await response.dispose();
  }
  const stopMover = new AbortController();
  let moverContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let moverStream: Promise<void> | undefined;
  let moverFailure: unknown;
  try {
    await page.addInitScript(() => {
      // Inspect the same chunks consumed by the production subscription. A clock
      // patch, another subject, or repeating the last position does not count.
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (new URL(response.url).pathname !== '/api/events' || !response.body) return response;
        const getReader = response.body.getReader.bind(response.body);
        Object.defineProperty(response.body, 'getReader', {
          value: () => {
            const reader = getReader();
            const read = reader.read.bind(reader);
            const decoder = new TextDecoder();
            let pending = '';
            reader.read = async () => {
              const chunk = await read();
              if (!chunk.done) {
                pending += decoder.decode(chunk.value, { stream: true });
                const frames = pending.split(/\r?\n\r?\n/);
                pending = frames.pop()!;
                for (const frame of frames) {
                  const lines = frame.split(/\r?\n/);
                  if (!lines.some((line) => /^event: ?patch$/.test(line))) continue;
                  const data = lines
                    .filter((line) => line.startsWith('data:'))
                    .map((line) => line.slice(5).trimStart())
                    .join('\n');
                  const patch = JSON.parse(data) as GamePatch;
                  for (const entity of patch.entities?.update ?? []) {
                    if (entity.set?.position)
                      console.debug(
                        `fixture-view-movement ${JSON.stringify({ revision: patch.revision, id: entity.id, position: entity.set.position })}`,
                      );
                  }
                }
              }
              return chunk;
            };
            return reader;
          },
        });
        return response;
      };
    });
    // Sign in to a different account before focusing the inventory. This
    // context only needs the real sign-in form and its cookies, not a second 3D render.
    moverContext = await browser.newContext({ javaScriptEnabled: false });
    const other = await moverContext.newPage();
    await blockExternalBrowserRequests(other);
    await signIn(other, game.base, 'picker-b');
    await blockExternalBrowserRequests(page);
    await signIn(page, game.base, 'picker-a');
    await enterGame(page);
    const ownerHeaders = await browserTabHeaders(page);
    const owner = await state(page.request, ownerHeaders);
    expect(owner.access?.controlling).toBe(true);
    // Stopped preparations are saved paused. Start the ordinary clock through
    // this signed playing tab before offering actual movement from another one.
    if (owner.clock.pauseReason === 'manual') {
      await page.getByRole('button', { name: 'Game menu (Escape)', exact: true }).click();
      await page.getByRole('button', { name: 'Resume world', exact: true }).click();
      await page.getByRole('button', { name: 'Back to the world', exact: true }).click();
    }
    await expect
      .poll(() => state(page.request, ownerHeaders))
      .toMatchObject({ clock: { paused: false } });

    const clientId = randomUUID();
    const moverHeaders = { 'X-OL-Client': clientId };
    const request = moverContext.request;
    const original = await state(request, moverHeaders);
    expect(original.access?.actorId).toBe('inventory-motion-player');
    expect(original.access?.actorId).not.toBe(owner.access?.actorId);
    await post(
      request,
      '/api/embodiment',
      {
        id: randomUUID(),
        operation: 'replace',
        expectedGeneration: original.access?.controlGeneration,
      },
      moverHeaders,
      original,
    );
    const mover = await state(request, moverHeaders);
    expect(mover.access?.controlling).toBe(true);
    const session = (await request.storageState()).cookies.find(
      (cookie) => cookie.name === 'ol_session',
    );
    if (!session) throw new Error('The moving player did not receive a session cookie.');
    const stream = await fetch(`${game.base}/api/events`, {
      headers: { ...moverHeaders, Cookie: `${session.name}=${session.value}` },
      signal: stopMover.signal,
    });
    expect(stream.ok).toBe(true);
    if (!stream.body) throw new Error('The moving player did not open a live view.');
    moverStream = stream.body
      .pipeTo(new WritableStream(), { signal: stopMover.signal })
      .catch((error: unknown) => {
        if (!stopMover.signal.aborted) moverFailure = error;
      });
    let sequence = 0;
    const present = (view: GameView) =>
      post(
        request,
        '/api/presence',
        {
          clientId,
          visible: true,
          sequence: ++sequence,
        },
        moverHeaders,
        view,
      );
    await present(mover);
    const start = mover.player.position;
    const otherInView = async () =>
      (await state(page.request, ownerHeaders)).entities.find(
        (entity) => entity.kind === 'actor' && near(entity.position, start),
      );
    await expect.poll(otherInView).toBeDefined();
    const moverReference = (await otherInView())?.id;
    if (!moverReference) throw new Error('The stationary player did not receive the mover’s body.');

    await page.getByRole('button', { name: 'Character (C)', exact: true }).click();
    const panel = page.locator('#inventoryPanel');
    const search = panel.getByRole('textbox', { name: /^Search / }).first();
    await expect(search).toBeVisible();
    const [filtered] = await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/inventory' &&
          response.request().postDataJSON().query === 'fiber' &&
          response.ok(),
      ),
      search.fill('fiber'),
    ]);
    expect(queries).toContain('fiber');
    const contents = (await filtered.json()) as ContainerPage;
    expect(contents.ok).toBe(true);
    const item = contents.items.find(
      (item) =>
        item.definitionId === 'prepared_fiber' &&
        (item.group?.representativeAvailableQuantity ?? item.availableQuantity ?? item.quantity) >
          1,
    );
    if (!item) throw new Error('The stocked opening did not return a carried fiber lot.');
    await expect(panel.locator('.ol-inventory-collection[aria-busy="true"]')).toHaveCount(0);
    const initialReads = reads;
    let receivedRevision = (await state(page.request, ownerHeaders)).revision;
    const delivered: Movement[] = [];
    for (let index = 0; index < 20; index++) {
      const current = await state(request, moverHeaders);
      await present(current);
      expect(current.access?.controlling).toBe(true);
      expect(current.commandEpoch).toBeTruthy();
      // The stopped fixture certifies both of these terrain points before serving.
      const destination = {
        ...start,
        x: start.x + (index % 2 === 0 ? 0.55 : 0),
        surfaceId: 'terrain',
      };
      await post(
        request,
        '/api/command',
        {
          commandId: randomUUID(),
          commandEpoch: current.commandEpoch,
          command: { type: 'move', position: destination },
        },
        moverHeaders,
        current,
      );
      const observed = () =>
        motion.find(
          (change) =>
            change.id === moverReference &&
            change.revision > receivedRevision &&
            near(change.position, destination),
        );
      await expect
        .poll(observed, { message: `Receive movement ${index + 1} from the second player` })
        .toBeDefined();
      const received = observed()!;
      receivedRevision = received.revision;
      delivered.push(received);
    }
    expect(new Set(delivered.map((update) => update.revision)).size).toBe(20);
    await expect(search).toHaveValue('fiber');
    await expect(search).toBeFocused();
    expect(reads).toBe(initialReads);

    const current = await state(page.request, ownerHeaders);
    expect(current.access?.controlling).toBe(true);
    expect(current.commandEpoch).toBeTruthy();
    await post(
      page.request,
      '/api/command',
      {
        commandId: randomUUID(),
        commandEpoch: current.commandEpoch,
        command: { type: 'drop', itemId: item.id, quantity: 1 },
      },
      ownerHeaders,
      current,
    );
    await expect.poll(() => reads).toBeGreaterThan(initialReads);
    await expect(panel.locator(`button[data-item-id="${item.id}"]`)).toHaveAttribute(
      'aria-label',
      new RegExp(`, ${item.quantity - 1}(?:,|$)`),
    );
    await expect(search).toHaveValue('fiber');
    expect(moverFailure).toBeUndefined();
    expect(errors).toEqual([]);
    const usage = await page.request.get(`${game.base}/api/ai/usage`, { headers: ownerHeaders });
    expect(usage.ok()).toBe(true);
    expect(((await usage.json()) as AiUsageView).usage.llmCalls).toBe(0);
    await usage.dispose();
  } finally {
    stopMover.abort();
    try {
      await Promise.all([moverStream, moverContext?.close(), page.close()]);
    } finally {
      await game.close();
    }
  }
});
