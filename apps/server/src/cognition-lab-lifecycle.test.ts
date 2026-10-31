import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { PLAYER_ID, NPC_ID, supportedPosition, entityGet } from '@open-legend/domain';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { readConfig } from '../../../tests/fixtures/database.js';
import { CognitionLab } from './cognition-lab.js';
import { createWorldRuntime } from './world-runtime.js';
import { PostgresDatabase } from './postgres.js';
import { SqlGameRepository } from './store.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  vi.restoreAllMocks();
  const failures: unknown[] = [];
  for (const close of cleanup.splice(0)) {
    try {
      await close();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw failures[0];
}, 120_000);

async function fixture(options: { oidc?: boolean } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-lifecycle-')),
    gameDatabase = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']),
    labDatabase = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']);
  const config = readConfig({
    OPEN_LEGEND_DATABASE_URL: gameDatabase.url,
    OPEN_LEGEND_DATA_DIR: join(directory, 'game'),
    OPEN_LEGEND_LAB_DATABASE_URL: labDatabase.url,
    OPEN_LEGEND_LAB_DATA_DIR: join(directory, 'lab'),
    OPEN_LEGEND_GOD_MODE: 'true',
    OPEN_LEGEND_LAB_BUDGET_USD: '0',
    ...(options.oidc
      ? {
          OPEN_LEGEND_AUTH_MODE: 'oidc',
          OPEN_LEGEND_PUBLIC_ORIGIN: 'https://game.fixture.invalid',
          OPEN_LEGEND_OIDC_ISSUER: 'https://identity.fixture.invalid/',
          OPEN_LEGEND_OIDC_CLIENT_ID: 'native-fixture-client',
          OPEN_LEGEND_ACCOUNT_BINDINGS: JSON.stringify([
            {
              issuer: 'https://identity.fixture.invalid/',
              subject: 'native-fixture-creator',
              accountId: 'native-fixture-creator',
              actorId: PLAYER_ID,
              capabilities: ['play', 'save', 'create', 'inspect', 'manage-access'],
            },
          ]),
        }
      : {}),
  });
  const store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(gameDatabase.url));
  let game: Awaited<ReturnType<typeof createWorldRuntime>> | undefined,
    lab: CognitionLab | undefined;
  cleanup.push(async () => {
    await lab?.close().catch(() => undefined);
    await game?.close().catch(() => undefined);
    await store.close();
    await gameDatabase.close();
    await labDatabase.close();
    await rm(directory, { recursive: true, force: true });
  });
  game = await createWorldRuntime({ store, config });
  lab = new CognitionLab(game, config, { store });
  // Only the external provider exchange is outside this fixture. The verified
  // identity enters the ordinary native login/session/grant owners unchanged.
  const session = options.oidc
    ? (
        await store.authority.login(
          { issuer: 'https://identity.fixture.invalid/', subject: 'native-fixture-creator' },
          Date.now(),
          config.authentication.sessionMs,
          config.capacity.sessions,
        )
      ).session
    : await store.authority.authenticate(game.service.localSessionToken, Date.now());
  const host = options.oidc
    ? await game.service.requestScope(session, 'lifecycle-fixture')
    : game.service.localScope;
  await lab.withAuthority(host, session, 'lifecycle-fixture', () => lab!.workspace());
  return { game, lab, config, labDatabase, store, session, host };
}

it('opens the held lab under configured OIDC with explicit native authority and no local principal', async () => {
  const network = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('External identity/provider I/O is blocked in the native OIDC fixture.');
  });
  const h = await fixture({ oidc: true });
  expect(h.config.authentication.mode).toBe('oidc');
  expect(() => h.game.service.localScope).toThrow();
  expect(() => h.lab.runtime.service.localScope).toThrow();
  expect(h.game.service.currentScope(h.host, 'create')).toBe(true);
  await h.lab.withAuthority(h.host, h.session, 'lifecycle-fixture', async (authority) => {
    expect(h.lab.runtime.service.currentScope(authority.scope, 'create')).toBe(true);
    expect(authority.scope.accountId).toBe(h.host.accountId);
    const workspace = await h.lab.workspace();
    expect(workspace.state).toBe('ready');
    expect(h.lab.runtime.service.cognitionControl?.held).toBe(true);
    expect(h.lab.runtime.service.world.paused).toBe(h.lab.runtime.service.paused);
    expect(h.lab.runtime.service.paused).toBe(false);
    const world = h.lab.runtime.service.world;
    const prepared = h.lab.runtime.service.prepareCommandChoice(
      { type: 'move', position: supportedPosition(entityGet(world.entities, NPC_ID)!)! },
      NPC_ID,
      'replace',
    );
    expect(prepared).toHaveProperty('outcome');
    const inventory = h.lab.runtime.service.previewNativeCommand(
      { type: 'inspect-inventory', targetId: NPC_ID },
      NPC_ID,
    );
    expect(inventory).toHaveProperty('ok');
    await expect(
      h.lab.runtime.service.command(
        'stale-explicit-preview-fixture',
        { type: 'inspect-inventory', targetId: NPC_ID },
        NPC_ID,
        undefined,
        { ...authority.scope, worldId: 'different-world' },
      ),
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(stale-scope|control-changed)$/) });
    expect(h.lab.runtime.service.world).toBe(world);
  });
  await expect(
    h.lab.withAuthority(
      { ...h.host, accountId: 'different-unadmitted-account' },
      h.session,
      'forged-native-identity',
      () => h.lab.workspace(),
    ),
  ).rejects.toThrow();
  await expect(h.lab.close()).resolves.toBeUndefined();
  await expect(h.game.close()).resolves.toBeUndefined();
  expect(network).not.toHaveBeenCalled();
}, 60_000);

it('closes every lab owner after final evidence failure, preserves the first error and releases the database writer', async () => {
  const h = await fixture(),
    failure = new Error('Fixture final evidence failure.'),
    secondary = new Error('Fixture later runtime failure.');
  vi.spyOn(h.lab.runs, 'finalize').mockRejectedValue(failure);
  const realClose = h.lab.runtime.close.bind(h.lab.runtime),
    runtime = vi.spyOn(h.lab.runtime, 'close').mockImplementation(async () => {
      await realClose();
      throw secondary;
    }),
    records = vi.spyOn(h.lab.records, 'close'),
    store = vi.spyOn(h.lab.runtime.service.store, 'close');
  const closing = h.lab.close();
  const concurrent = h.lab.close();
  const concurrentFailure = expect(concurrent).rejects.toBe(failure);
  await expect(closing).rejects.toBe(failure);
  await concurrentFailure;
  await expect(h.lab.close()).rejects.toBe(failure);
  expect(runtime).toHaveBeenCalledOnce();
  expect(records).toHaveBeenCalledOnce();
  expect(store).toHaveBeenCalledOnce();
  // A real second native writer can open only after the first owner's advisory
  // lease and subordinate sessions have closed, despite both injected failures.
  const reopened = new SqlGameRepository(
    h.config.cognitionLab.dataDirectory,
    new PostgresDatabase(h.labDatabase.url),
  );
  try {
    await reopened.ready;
    expect((await reopened.records.head())?.worldId).toBe(h.lab.runtime.service.world.id);
  } finally {
    await reopened.close();
  }
}, 60_000);

it('closes later native runtime owners after a clock-drain failure and shares that original shutdown outcome', async () => {
  const h = await fixture(),
    failure = new Error('Fixture native clock drain failure.');
  const idle = vi.spyOn(h.game.clock, 'idle').mockRejectedValue(failure),
    director = vi.spyOn(h.game.director, 'close'),
    navigation = vi.spyOn(h.game.navigation, 'close'),
    autosaves = vi.spyOn(h.game.autosaves, 'close'),
    work = vi.spyOn(h.game.service, 'releaseHostWork'),
    execution = vi.spyOn(h.game.execution, 'close');
  const closing = h.game.close();
  expect(h.game.close()).toBe(closing);
  await expect(closing).rejects.toBe(failure);
  await expect(h.game.close()).rejects.toBe(failure);
  expect(idle).toHaveBeenCalledOnce();
  expect(director).toHaveBeenCalledOnce();
  expect(navigation).toHaveBeenCalledOnce();
  expect(autosaves).toHaveBeenCalledOnce();
  expect(work).toHaveBeenCalledOnce();
  expect(execution).toHaveBeenCalledOnce();
  await expect(h.game.clock.advance(1, false)).rejects.toThrow('held');
}, 60_000);
