import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CognitionLabWorkspace } from '@open-legend/protocol';
import { createDisposableDatabase } from '../../scripts/disposable-postgres.mjs';
import { createGameServer } from '../../apps/server/src/http.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { SqlGameRepository } from '../../apps/server/src/store.js';
import { WorldService } from '../../apps/server/src/world-service.js';
import { readConfig } from './database.js';
import { fixtureCognitionAi } from './cognition-ai.js';
import type { AppConfig } from '../../apps/server/src/config.js';

/** Native HTTP/browser/profile specimens own both databases. No application database,
 * credentials, paid provider, or saved player progress enters this fixture. */
export async function startCognitionLabFixture(
  options: {
    withAi?: boolean;
    production?: boolean;
    tick?: boolean;
    /** Owned initial preparation runs before any runtime writer is constructed. */
    prepareGame?: (store: SqlGameRepository, config: AppConfig) => Promise<void>;
  } = {},
) {
  const [gameDatabase, labDatabase] = await Promise.all([
    createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']),
    createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']),
  ]);
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-http-'));
  const config = readConfig({
    OPEN_LEGEND_DATABASE_URL: gameDatabase.url,
    OPEN_LEGEND_DATA_DIR: join(directory, 'game'),
    OPEN_LEGEND_LAB_DATABASE_URL: labDatabase.url,
    OPEN_LEGEND_LAB_DATA_DIR: join(directory, 'lab'),
    OPEN_LEGEND_GOD_MODE: 'true',
    ...(options.withAi
      ? { TYPESAFE_API_KEY: 'fixture', OPENAI_API_KEY: 'fixture', OPEN_LEGEND_LAB_BUDGET_USD: '1' }
      : {}),
  });
  let store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(gameDatabase.url));
  const ai = fixtureCognitionAi();
  let game: Awaited<ReturnType<typeof createGameServer>> | undefined;
  const listen = async (port = 0) => {
    game = await createGameServer({
      store,
      config,
      production: options.production ?? true,
      tick: options.tick ?? false,
      ...(options.withAi ? { aiClient: ai.client } : {}),
    });
    await new Promise<void>((resolve) => game!.server.listen(port, '127.0.0.1', resolve));
  };
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (game) await game.close();
    else await store.close();
    await gameDatabase.close();
    await labDatabase.close();
    await rm(directory, { recursive: true, force: true });
  };
  try {
    await store.ready;
    await options.prepareGame?.(store, config);
    // Cognition specimens retain ordinary Main's native content, with native
    // presentation. Art qualification needs its real publication catalogue;
    // an empty fixture database must never fabricate approval for a real release.
    const nativeOpening = new WorldService(store, config);
    try {
      await nativeOpening.ready;
    } finally {
      nativeOpening.releaseHostWork();
    }
    await listen();
    const address = game!.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture listener.');
    const base = `http://127.0.0.1:${address.port}`;
    const initial = await fetch(`${base}/api/cognition-lab/workspace`);
    const cookie = initial.headers.get('set-cookie')?.split(';')[0] ?? '';
    const workspace = (await initial.json()) as CognitionLabWorkspace;
    if (initial.status !== 200) throw new Error('The native fixture lab did not open.');
    return {
      get game() {
        return game!;
      },
      config,
      directory,
      base,
      cookie,
      workspace,
      calls: ai.calls,
      labDatabaseUrl: labDatabase.url,
      gameDatabaseUrl: gameDatabase.url,
      restart: async () => {
        await game!.close();
        game = undefined;
        store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(gameDatabase.url));
        await listen(address.port);
        return game!;
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
