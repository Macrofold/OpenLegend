import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

/** A profile can create/drop only its own fresh database. Normal application database
 * configuration is never inherited. docs/maintainers/performance-profiling.md
 */
export async function createProfileDatabase(connectionString) {
  if (!connectionString)
    return { url: '', details: { adapter: 'sqlite' }, close: async () => {} };
  let adminUrl;
  try {
    adminUrl = new URL(connectionString);
  } catch {
    throw new Error('Profiling requires an explicit loopback PostgreSQL admin URL.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(adminUrl.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(adminUrl.hostname) ||
    adminUrl.search ||
    adminUrl.hash
  )
    throw new Error('Profiling accepts only loopback PostgreSQL URLs without query overrides.');

  const require = createRequire(new URL('../../apps/server/package.json', import.meta.url));
  const { Client } = require('pg');
  const database = 'openlegend_profile_' + randomUUID().replaceAll('-', '');
  const withAdmin = async (stage, operation) => {
    const client = new Client({
      connectionString: adminUrl.toString(),
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
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
