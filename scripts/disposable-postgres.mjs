import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

/** Fixtures and profiles create/drop only their own fresh database. Normal application database
 * configuration is never inherited. docs/maintainers/performance-profiling.md
 */
export async function createDisposableDatabase(connectionString) {
  let adminUrl;
  try {
    adminUrl = new URL(connectionString);
  } catch {
    throw new Error(
      'Disposable database creation requires an explicit loopback PostgreSQL admin URL.',
    );
  }
  if (
    !['postgres:', 'postgresql:'].includes(adminUrl.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(adminUrl.hostname) ||
    adminUrl.search ||
    adminUrl.hash
  )
    throw new Error(
      'Disposable database creation accepts only loopback PostgreSQL URLs without query overrides.',
    );

  const require = createRequire(new URL('../apps/server/package.json', import.meta.url));
  const { Client } = require('pg');
  const prefix = process.env.OPENLEGEND_FIXTURE_DATABASE_PREFIX;
  // The managed supervisor reclaims only its run-prefixed databases after an
  // interrupted process. Keep 64 random bits and PostgreSQL's complete 63-byte
  // identifier limit; server-side truncation would lose the ownership witness.
  if (
    prefix !== undefined &&
    (!/^[a-z][a-z0-9_]*_$/.test(prefix) || Buffer.byteLength(prefix) + 16 > 63)
  )
    throw new Error('Disposable PostgreSQL database prefix is invalid.');
  const random = randomUUID().replaceAll('-', '');
  const database =
    prefix === undefined ? 'openlegend_fixture_' + random : prefix + random.slice(0, 16);
  if (Buffer.byteLength(database) > 63)
    throw new Error('Disposable PostgreSQL database identifier exceeds its allowance.');
  const withAdmin = async (stage, operation) => {
    const client = new Client({
      connectionString: adminUrl.toString(),
      connectionTimeoutMillis: 5000,
      // DROP DATABASE can wait for a cluster checkpoint (6.08s on hosted CI).
      // This administrative bound is separate from interactive application queries.
      statement_timeout: 30000,
    });
    // The awaited operation reports failure; an idle socket error must not bypass cleanup.
    client.on('error', () => {});
    try {
      await client.connect();
      return await operation(client);
    } catch (error) {
      const code =
        typeof error?.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code)
          ? ` (${error.code})`
          : '';
      // Never echo a URL, password, server query or arbitrary driver error into the report.
      throw new Error(`Disposable PostgreSQL ${stage} failed${code}. No automatic retry.`);
    } finally {
      await client.end().catch(() => {});
    }
  };
  const version = await withAdmin('creation', async (client) => {
    const result = await client.query('SHOW server_version');
    // Only our generated identifier enters SQL; the caller-selected database is never reset.
    await client.query(`CREATE DATABASE "${database}"`);
    return result.rows[0].server_version;
  });
  const target = new URL(adminUrl);
  target.pathname = '/' + database;
  let closed = false;
  return {
    url: target.toString(),
    details: { adapter: 'postgres', topology: 'loopback', version, database },
    async close() {
      if (closed) return;
      // Do not force-drop or terminate other sessions. A teardown problem is a reported failure.
      await withAdmin('cleanup', (client) => client.query(`DROP DATABASE "${database}"`));
      closed = true;
    },
  };
}
