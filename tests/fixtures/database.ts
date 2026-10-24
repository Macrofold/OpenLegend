import type { WorldState } from '@open-legend/domain';
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

/** A named directory reopens the same owned database until fixture cleanup.
 * Isolated mechanic specimens may choose an explicit current opening; omission
 * keeps ordinary startup and its real Main content. Never overwrite a retained run. */
export async function testRepository(
  directory?: string,
  initialWorld?: WorldState,
): Promise<SqlGameRepository> {
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
  if (initialWorld) {
    await repository.ready;
    if (await repository.records.head())
      throw new Error('An explicit fixture opening requires an empty owned database.');
    await repository.commit(0, { world: initialWorld, speed: 1, manuallyPaused: false });
  }
  return repository;
}

/** Fixtures inject their repository; never inherit provider keys or an application database. */
export const readConfig = (env: NodeJS.ProcessEnv = {}) =>
  applicationConfig({
    OPEN_LEGEND_DATABASE_URL: 'postgresql://localhost/fixture_injected_repository',
    AI_BUDGET_USD: '0',
    // Unrelated fixtures opt out; activation checks use the application reader directly.
    DECISION_ESCALATION_JSON: '{"mode":"off","origins":[],"reasons":[]}',
    // A fixture generation key must not enable the separate live embedding worker.
    OPENAI_EMBEDDING_API_KEY: '',
    ...env,
  });

export async function closeTestDatabases(): Promise<void> {
  for (const repository of repositories) await repository.close();
  repositories.clear();
  // Each owned DROP can wait for a PostgreSQL checkpoint. A small bounded batch
  // avoids serializing those waits across every specimen in one test file.
  const owned = [...databases];
  const failures: unknown[] = [];
  for (let index = 0; index < owned.length; index += 4) {
    const results = await Promise.allSettled(
      owned.slice(index, index + 4).map(async ([directory, database]) => {
        await database.close();
        databases.delete(directory);
      }),
    );
    for (const result of results) if (result.status === 'rejected') failures.push(result.reason);
  }
  for (const directory of ownedDirectories)
    if (!databases.has(directory)) {
      rmSync(directory, { recursive: true, force: true });
      ownedDirectories.delete(directory);
    }
  if (failures.length) throw new AggregateError(failures, 'Owned fixture database cleanup failed.');
}
