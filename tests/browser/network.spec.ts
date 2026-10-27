import { expect, test, type Page } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { clientViteConfiguration } from '../../apps/client/vite.config.js';
import { createGameServer } from '../../apps/server/src/http.js';
import { testRepository, closeTestDatabases, readConfig } from '../fixtures/database.js';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import type {
  GameView,
  InviteView,
  OperationsView,
  WorldAgentSessionStatus,
} from '@open-legend/protocol';

interface NetworkProbe {
  holdState: boolean;
  stateRequests: number;
  eventRequests: number;
  privateRequests: number;
  privateOpened: number;
  privateClosed: number;
  heartbeats: number;
  eventMode: 'native' | 'incomplete' | 'forbidden';
  privateMode: 'native' | 'forbidden';
  releaseState?: () => Promise<void>;
}
declare global {
  interface Window {
    __networkProbe: NetworkProbe;
    __operationsProbe: {
      holdReads: boolean;
      reads: number;
      creates: number;
      original?: { id: string; label: string };
    };
  }
}

async function controlledBrowser(page: Page, holdState = false) {
  await blockExternalBrowserRequests(page);
  await page.clock.install();
  await page.addInitScript((hold) => {
    const original = window.fetch.bind(window);
    const probe: NetworkProbe = (window.__networkProbe = {
      holdState: hold,
      stateRequests: 0,
      eventRequests: 0,
      privateRequests: 0,
      privateOpened: 0,
      privateClosed: 0,
      heartbeats: 0,
      eventMode: 'native',
      privateMode: 'native',
    });
    window.fetch = async (input, init) => {
      const path = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        location.href,
      ).pathname;
      if (path === '/api/state') {
        probe.stateRequests++;
        if (probe.holdState)
          return new Promise<Response>((resolve) => {
            probe.releaseState = async () => {
              // Ignore the original cancelled signal, then deliver its late
              // native read. It must never replace the expired entry result.
              resolve(await original(input, { ...init, signal: undefined }));
            };
          });
      }
      const privateProgress = path === '/api/world-agent/session/progress';
      if (privateProgress) probe.privateRequests++;
      if (path === '/api/events') probe.eventRequests++;
      if (
        (path === '/api/events' && probe.eventMode === 'forbidden') ||
        (privateProgress && probe.privateMode === 'forbidden')
      )
        return Response.json({ ok: false }, { status: 403 });
      if (path === '/api/events' && probe.eventMode === 'incomplete') {
        let timer = 0;
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(': unfinished'));
              timer = window.setInterval(
                () => controller.enqueue(new TextEncoder().encode('x')),
                10_000,
              );
            },
            cancel() {
              clearInterval(timer);
              // Deliberately uncooperative cleanup: the abandoned slot stays counted.
              return new Promise<void>(() => {});
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }
      const response = await original(input, init);
      if ((path !== '/api/events' && !privateProgress) || !response.body || response.status !== 200)
        return response;
      if (privateProgress) probe.privateOpened++;
      // Observe the same native stream, without a clone/second reader. This
      // fixture records complete real server heartbeat comments for N17.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let tail = '';
      let cancelled = false;
      return new Response(
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const item = await reader.read();
              if (cancelled) return;
              if (item.done) {
                controller.close();
                return;
              }
              if (!privateProgress) {
                const text = tail + decoder.decode(item.value, { stream: true });
                probe.heartbeats += (text.match(/: heartbeat\n\n/g) ?? []).length;
                tail = text.slice(-12);
              }
              controller.enqueue(item.value);
            } catch (error) {
              if (!cancelled) controller.error(error);
            }
          },
          cancel(reason) {
            cancelled = true;
            if (privateProgress) probe.privateClosed++;
            return reader.cancel(reason);
          },
        }),
        { status: response.status, headers: response.headers },
      );
    };
  }, holdState);
}

async function gameFixture(godMode = false) {
  const game = await createGameServer({
    config: readConfig({
      AI_BUDGET_USD: '0',
      OPEN_LEGEND_WORLD_PRESET: 'solo',
      OPEN_LEGEND_GOD_MODE: String(godMode),
    }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  return { game, base: `http://127.0.0.1:${address.port}` };
}

test('resumed entry expires an ignored request before delayed timers or a late reply, then explicit retry enters the actual game', async ({
  page,
}, info) => {
  const { game, base } = await gameFixture();
  try {
    await controlledBrowser(page, true);
    await page.goto(base);
    await expect.poll(() => page.evaluate(() => window.__networkProbe.stateRequests)).toBe(1);
    // Move only wall time: unlike fastForward, this does not execute the
    // deadline timer. The application's visible-document resume check must
    // expire the request before it can consume a queued native response.
    const resumedAt = await page.evaluate(() => Date.now() + 15_001);
    await page.clock.setSystemTime(resumedAt);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(
      page.getByRole('heading', { name: 'We couldn’t connect to your world' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry connection', exact: true })).toBeEnabled();
    await page.screenshot({ path: info.outputPath('bounded-initial-entry.png') });
    await page.evaluate(() => window.__networkProbe.releaseState!());
    await expect(
      page.getByRole('heading', { name: 'We couldn’t connect to your world' }),
    ).toBeVisible();
    await page.evaluate(() => {
      window.__networkProbe.holdState = false;
    });
    await page.getByRole('button', { name: 'Retry connection', exact: true }).click();
    await enterGame(page);
    await expect(page.getByRole('button', { name: 'Time settings', exact: true })).toBeEnabled();
    expect(await game.service.store.recentJobs()).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});

test('quiet main streams heartbeat, partial trickles expire, and forbidden reconnect waits for deliberate recovery', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const { game, base } = await gameFixture();
  try {
    await controlledBrowser(page);
    await page.goto(base);
    await enterGame(page);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect.poll(() => game.service.pauseReason).toBe('manual');
    const connections = await page.evaluate(() => window.__networkProbe.eventRequests);
    // More than one complete liveness window, under the real server's cadence.
    await expect
      .poll(() => page.evaluate(() => window.__networkProbe.heartbeats), { timeout: 50_000 })
      .toBeGreaterThanOrEqual(3);
    expect(await page.evaluate(() => window.__networkProbe.eventRequests)).toBe(connections);
    await page.evaluate(() => {
      window.__networkProbe.eventMode = 'incomplete';
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await expect
      .poll(() => page.evaluate(() => window.__networkProbe.eventRequests))
      .toBe(connections + 1);
    await page.clock.fastForward(30_000);
    expect(await page.evaluate(() => window.__networkProbe.eventRequests)).toBe(connections + 1);
    await page.evaluate(() => {
      window.__networkProbe.eventMode = 'forbidden';
    });
    await page.clock.fastForward(15_001);
    await page.clock.fastForward(6_001);
    await expect(
      page.getByRole('heading', { name: 'No access to this world', exact: true }),
    ).toBeVisible();
    const rejected = await page.evaluate(() => window.__networkProbe.eventRequests);
    await page.clock.fastForward(60_000);
    expect(await page.evaluate(() => window.__networkProbe.eventRequests)).toBe(rejected);
    await page.screenshot({ path: info.outputPath('bounded-access-recovery.png') });
    await page.evaluate(() => {
      window.__networkProbe.eventMode = 'native';
    });
    await page.getByRole('button', { name: 'Check access again', exact: true }).click();
    await enterGame(page);
    expect(await page.evaluate(() => window.__networkProbe.eventRequests)).toBeGreaterThan(
      rejected,
    );
  } finally {
    await page.close();
    await game.close();
  }
});

test('private progress closes on hiding, retains drafts, and stops forbidden reconnect until explicit refresh', async ({
  page,
}, info) => {
  const { game, base } = await gameFixture(true);
  try {
    await controlledBrowser(page);
    const paid: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/(?:world-agent\/messages|chat|ai\/cancel)$/.test(new URL(request.url()).pathname))
        paid.push(request.url());
    });
    await page.route('**/api/world-agent/session/status', async (route) => {
      const native = await route.fetch();
      const status = (await native.json()) as WorldAgentSessionStatus & { ok: boolean };
      if (status.ok && status.data?.available)
        status.availability = {
          ...status.availability,
          configured: true,
          reason: 'Controlled availability; no provider call.',
        };
      await route.fulfill({ response: native, json: status });
    });
    await page.goto(base);
    await enterGame(page);
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('button', { name: 'World editor', exact: true }).click();
    await page.getByRole('button', { name: 'Start conversation', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Message to World Agent', exact: true });
    await expect(input).toBeVisible();
    await input.fill('An unsent private draft');
    await expect
      .poll(() => page.evaluate(() => window.__networkProbe.privateOpened))
      .toBeGreaterThanOrEqual(1);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect
      .poll(() => page.evaluate(() => window.__networkProbe.privateClosed))
      .toBeGreaterThanOrEqual(1);
    const before = await page.evaluate(() => window.__networkProbe.privateRequests);
    await page.evaluate(() => {
      window.__networkProbe.privateMode = 'forbidden';
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await enterGame(page);
    await expect
      .poll(() => page.evaluate(() => window.__networkProbe.privateRequests))
      .toBeGreaterThan(before);
    await expect(
      page.getByText('Access changed. Reopen the conversation with current access.', {
        exact: true,
      }),
    ).toBeVisible();
    const forbidden = await page.evaluate(() => window.__networkProbe.privateRequests);
    await page.clock.fastForward(20_000);
    expect(await page.evaluate(() => window.__networkProbe.privateRequests)).toBe(forbidden);
    await page.screenshot({ path: info.outputPath('bounded-private-progress.png') });
    await page.evaluate(() => {
      window.__networkProbe.privateMode = 'native';
    });
    await page
      .locator('#world-editorPanel')
      .getByRole('button', { name: 'Options', exact: true })
      .click();
    await page.getByRole('button', { name: 'Refresh this session', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.__networkProbe.privateRequests))
      .toBeGreaterThan(forbidden);
    await expect(input).toHaveValue('An unsent private draft');
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});

test('the actual browser helper consumes a large complete game projection and releases its request slot', async ({
  page,
}, info) => {
  const { game, base } = await gameFixture();
  try {
    await blockExternalBrowserRequests(page);
    await page.goto(base);
    await enterGame(page);
    const client = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
    const native = await page.request.get(base + '/api/state', {
      headers: { 'X-OL-Client': client! },
    });
    expect(native.ok()).toBe(true);
    const projection = (await native.json()) as GameView;
    const source = projection.entities[0]!;
    const description = 'A'.repeat(65_536);
    const marker = 'end-of-complete-projection';
    projection.entities.push(
      ...Array.from({ length: 128 }, (_, index) => ({
        ...source,
        id: `${source.id}:network-qualification:${index}`,
        description: index === 127 ? description + marker : description,
      })),
    );
    const serialized = JSON.stringify(projection);
    const bytes = Buffer.byteLength(serialized);
    expect(bytes).toBeGreaterThan(8 * 1024 * 1024);
    await page.route('**/api/state?network-qualification=large', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Length': String(bytes) },
        body: serialized,
      }),
    );
    const evidence = await page.evaluate(async () => {
      const modulePath = '/assets/network-tools.js';
      const tools = (await import(
        modulePath
      )) as typeof import('../../apps/client/src/network-tools.js');
      const heap = () =>
        (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize;
      const before = heap();
      const result = await tools.browserRequest('/api/state?network-qualification=large', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const view = result.body as GameView;
      const after = heap();
      return {
        status: result.status,
        bytes: new TextEncoder().encode(JSON.stringify(view)).byteLength,
        entityCount: view.entities.length,
        lastId: view.entities.at(-1)!.id,
        lastDescription: view.entities.at(-1)!.description!.slice(-26),
        owner: tools.browserNetworkSnapshot().find((owner) => owner.role === 'browser-api-reads'),
        heapBeforeBytes: before,
        heapAfterBytes: after,
        heapDeltaBytes: before === undefined || after === undefined ? undefined : after - before,
      };
    });
    expect(evidence).toMatchObject({
      status: 200,
      bytes,
      entityCount: projection.entities.length,
      lastId: projection.entities.at(-1)!.id,
      lastDescription: marker,
      owner: { occupied: 0, active: 0, unsettled: 0, quarantined: 0 },
    });
    await info.attach('large-complete-projection.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });
    console.log('Large complete browser projection:', JSON.stringify(evidence));
  } finally {
    await page.close();
    await game.close();
  }
});

test('operations retains the original uncertain invitation and recovers a failed refresh without resending it', async ({
  page,
}, info) => {
  const { game, base } = await gameFixture(true);
  try {
    await controlledBrowser(page);
    await page.addInitScript(() => {
      const original = window.fetch.bind(window);
      const probe: Window['__operationsProbe'] = (window.__operationsProbe = {
        holdReads: false,
        reads: 0,
        creates: 0,
      });
      window.fetch = async (input, init) => {
        const path = new URL(String(input), location.href).pathname;
        if (path === '/api/operations') {
          probe.reads++;
          if (probe.holdReads) return new Promise<Response>(() => {});
        }
        if (path === '/api/invites/create') {
          probe.creates++;
          probe.original = JSON.parse(String(init?.body)) as { id: string; label: string };
          // Synthetic acceptance with a lost reply. The fixture's list below
          // supplies the saved original ID; no invitation is created externally.
          return new Promise<Response>(() => {});
        }
        return original(input, init);
      };
    });
    const invites: InviteView[] = [];
    let audience: 'original' | 'renewed' | 'replacement' = 'original';
    await page.route('**/api/operations', async (route) => {
      const native = await route.fetch();
      const view = (await native.json()) as OperationsView;
      expect(view.ok).toBe(true);
      expect(view.capabilities).toContain('manage-access');
      await route.fulfill({
        response: native,
        json: {
          ...view,
          mode: 'oidc',
          ...(audience === 'original'
            ? {}
            : {
                scope: `${view.scope}:${audience}`,
                clock: { ...view.clock, day: audience === 'renewed' ? 77 : 78 },
              }),
          ...(audience === 'replacement'
            ? { worldId: 'replacement-world', accountId: 'replacement-account' }
            : {}),
          access: { ...view.access, invites: audience === 'replacement' ? [] : invites },
        },
      });
    });
    // Establish the local fixture's normal native session. The operations UI
    // has no character-presence owner and does not create sessions on a read.
    const session = await page.request.get(base + '/api/state');
    expect(session.ok()).toBe(true);
    await session.dispose();
    await page.goto(base + '/?view=operations');
    await page.getByRole('tab', { name: 'People and invitations', exact: true }).click();
    await page.getByLabel('Who is this for?', { exact: true }).fill('Network qualification');
    await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('spectator');
    const create = page.getByRole('button', { name: 'Create invite link', exact: true });
    await create.click();
    await expect.poll(() => page.evaluate(() => window.__operationsProbe.creates)).toBe(1);
    const original = (await page.evaluate(() => window.__operationsProbe.original))!;
    invites.push({
      ...original,
      role: 'spectator',
      capabilities: ['spectate'],
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
    });
    // A matching label is not identity. Only the exact original saved ID may
    // receive the recovery marker, even beside another invitation to that name.
    invites.push({ ...invites[0]!, id: randomUUID() });
    await page.clock.fastForward(30_001);
    await expect(create).toBeEnabled();
    await expect(page.getByText('Original unconfirmed invitation', { exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: original.label })).toContainText(
      'Check the entry marked “Original unconfirmed invitation”',
    );
    await expect(page.getByLabel('Invite link', { exact: true })).toHaveCount(0);
    await page.evaluate(() => {
      window.__operationsProbe.holdReads = true;
    });
    const refresh = page.getByRole('button', { name: 'Refresh world status', exact: true });
    await refresh.click();
    await page.clock.fastForward(15_001);
    await expect(page.getByRole('alert')).toContainText('The previous view remains visible.');
    await expect(page.getByText('Original unconfirmed invitation', { exact: true })).toBeVisible();
    await expect(refresh).toBeEnabled();
    await page.screenshot({ path: info.outputPath('bounded-operations-recovery.png') });
    await page.evaluate(() => {
      window.__operationsProbe.holdReads = false;
    });
    await refresh.click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => window.__operationsProbe.creates)).toBe(1);
    await expect(page.getByText('Original unconfirmed invitation', { exact: true })).toBeVisible();
    // A refreshed control/permission scope is still this account's unresolved
    // request. Its exact correlation and the unsent form remain available.
    audience = 'renewed';
    await refresh.click();
    await expect(page.locator('.ol-operations-clock')).toContainText('Day 77');
    await expect(page.getByText('Original unconfirmed invitation', { exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: original.label })).toContainText(
      'is unconfirmed',
    );
    await expect(page.getByLabel('Who is this for?', { exact: true })).toHaveValue(original.label);
    await page.screenshot({ path: info.outputPath('bounded-operations-renewed-scope.png') });
    // The existing account/world owner resets every protected operations panel.
    // It must not be replaced with a key that resets drafts on every refresh.
    audience = 'replacement';
    await refresh.click();
    await expect(page.locator('.ol-operations-clock')).toContainText('Day 78');
    await expect(page.getByText('Original unconfirmed invitation', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: original.label })).toHaveCount(0);
    await expect(page.getByLabel('Who is this for?', { exact: true })).toHaveValue('');
    expect(await page.evaluate(() => window.__operationsProbe.creates)).toBe(1);
  } finally {
    await page.close();
    await game.close();
  }
});

function triangleGlb(): Buffer {
  const binary = Buffer.alloc(44);
  [-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0].forEach((value, index) =>
    binary.writeFloatLE(value, index * 4),
  );
  [0, 1, 2].forEach((value, index) => binary.writeUInt16LE(value, 36 + index * 2));
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: '2.0' },
      buffers: [{ byteLength: binary.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
        { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: 'VEC3',
          min: [-0.5, -0.5, 0],
          max: [0.5, 0.5, 0],
        },
        { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    }),
  );
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const output = Buffer.alloc(12 + 8 + padded.length + 8 + binary.length);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(padded.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(output, 20);
  output.writeUInt32LE(binary.length, 20 + padded.length);
  output.writeUInt32LE(0x004e4942, 24 + padded.length);
  binary.copy(output, 28 + padded.length);
  return output;
}

test('optional icon failure leaves the game usable and real renderer resources survive late-owner replacement', async ({
  page,
}, info) => {
  const { game, base } = await gameFixture();
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-renderer-network-'));
  try {
    const bytes = triangleGlb();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const indexPath = join(directory, 'index.json');
    await writeFile(
      indexPath,
      JSON.stringify({
        release: {
          owner: { kind: 'collection', id: 'network-qualification' },
          assetId: 'renderer-fixture',
          revisionId: 'triangle',
          manifestSha256: 'f'.repeat(64),
        },
        files: {
          'apps/client/src/props/network-qualification.glb': {
            sha256,
            bytes: bytes.length,
            mediaType: 'model/gltf-binary',
            boundary: 'runtime',
            accessDomain: 'public',
          },
        },
      }),
    );
    const configuration = clientViteConfiguration({ indexPath, localAssetDelivery: true });
    const result = await build({
      ...configuration,
      configFile: false,
      logLevel: 'error',
      build: {
        ...configuration.build,
        write: false,
        emptyOutDir: false,
        rolldownOptions: {
          ...configuration.build?.rolldownOptions,
          input: fileURLToPath(
            new URL('../../apps/client/test-fixtures/renderer-network.ts', import.meta.url),
          ),
          output: {
            format: 'es',
            entryFileNames: 'renderer-qualification.js',
            chunkFileNames: '[name]-[hash].js',
          },
        },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((output) =>
      'output' in output ? output.output : [],
    );
    await blockExternalBrowserRequests(page);
    const installed = JSON.parse(
      await readFile(new URL('../../assets/locks/development.json', import.meta.url), 'utf8'),
    ) as { files: Record<string, { sha256: string }> };
    const iconsSha256 = installed.files['apps/client/src/design-system/icons/icons.json']!.sha256;
    let iconFailures = 0;
    await page.route('**/*', async (route) => {
      const url = decodeURIComponent(route.request().url());
      if (url.includes(iconsSha256) || url.includes('/design-system/icons/icons.json')) {
        iconFailures++;
        return route.abort('failed');
      }
      return route.fallback();
    });
    await page.route('**/__renderer-qualification/*', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1);
      const output = outputs.find((candidate) => candidate.fileName === name);
      if (!output || output.type !== 'chunk') return route.abort('failed');
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: output.code });
    });
    await page.goto(base);
    await enterGame(page);
    expect(iconFailures).toBe(1);
    await expect(page.locator('.ol-sigil').first()).toBeVisible();
    await page.getByRole('button', { name: 'Time settings', exact: true }).click();
    await expect(page.getByRole('radio', { name: '0.5×', exact: true })).toBeVisible();
    const evidence = await page.evaluate(
      async (contents) => {
        const path = '/__renderer-qualification/renderer-qualification.js';
        const tools = (await import(
          path
        )) as typeof import('../../apps/client/test-fixtures/renderer-network.js');
        const canvas = document.createElement('canvas');
        canvas.id = 'network-replacement-qualification';
        canvas.width = canvas.height = 128;
        document.body.appendChild(canvas);
        try {
          return await tools.qualifyRendererNetwork(canvas, contents);
        } finally {
          canvas.remove();
        }
      },
      [...bytes],
    );
    expect(evidence.download).toMatchObject({
      accepted: false,
      oldAssets: 0,
      successorCurrent: true,
      successorVertices: 3,
      owner: { occupied: 0, active: 0, unsettled: 0, quarantined: 0 },
    });
    expect(evidence.parser).toMatchObject({
      accepted: false,
      cleanupWasAwaited: true,
      oldAssets: 0,
      successorCurrent: true,
      successorVertices: 3,
      successorIndices: 3,
      owner: { occupied: 0, active: 0, unsettled: 0, quarantined: 0 },
    });
    expect(evidence.parser.successorAssets).toBeGreaterThan(0);
    expect(evidence.retired).toEqual({
      vertexBufferReleased: true,
      indicesReleased: true,
      registryReleased: true,
    });
    await expect(page.getByRole('button', { name: 'Time settings', exact: true })).toBeEnabled();
    await info.attach('renderer-network-retirement.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });
    console.log('Actual renderer retirement:', JSON.stringify(evidence));
    await page.screenshot({ path: info.outputPath('optional-icon-and-renderer-retirement.png') });
  } finally {
    await page.close();
    await game.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test.afterAll(closeTestDatabases);
