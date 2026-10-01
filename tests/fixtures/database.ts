import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDisposableDatabase } from '../../scripts/disposable-postgres.mjs';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { SqlGameRepository } from '../../apps/server/src/store.js';
import { readConfig as applicationConfig } from '../../apps/server/src/config.js';

const databases = new Map<string, Awaited<ReturnType<typeof createDisposableDatabase>>>();
const ownedDirectories = new Set<string>();
const repositories = new Set<SqlGameRepository>();

/** A named directory reopens the same owned database until fixture cleanup. */
export async function testRepository(directory?: string): Promise<SqlGameRepository> {
  if (!directory) {
    directory = mkdtempSync(join(tmpdir(), 'openlegend-fixture-'));
    ownedDirectories.add(directory);
  }
  let database = databases.get(directory);
  if (!database) {
    database = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']);
    databases.set(directory, database);
  }
  const repository = new SqlGameRepository(directory, new PostgresDatabase(database.url));
  repositories.add(repository);
  const close = repository.close.bind(repository);
  repository.close = async () => {
    if (!repositories.has(repository)) return;
    await close();
    repositories.delete(repository);
  };
  return repository;
}

/** Fixtures inject their repository; never inherit provider keys or an application database. */
export const readConfig = (env: NodeJS.ProcessEnv = {}) =>
  applicationConfig({
    OPEN_LEGEND_DATABASE_URL: 'postgresql://localhost/fixture_injected_repository',
    AI_BUDGET_USD: '0',
    // A fixture generation key must not enable the separate live embedding worker.
    OPENAI_EMBEDDING_API_KEY: '',
    ...env,
  });

export async function closeTestDatabases(): Promise<void> {
  for (const repository of repositories) await repository.close();
  repositories.clear();
  for (const [directory, database] of databases) {
    await database.close();
    databases.delete(directory);
  }
  for (const directory of ownedDirectories) rmSync(directory, { recursive: true, force: true });
  ownedDirectories.clear();
}
