import { Client } from 'pg';
import { mkdir, realpath } from 'node:fs/promises';
import type { AppConfig } from './config.js';
import type { SqlDatabase } from './store.js';

/** Resolve the actual server/database identity; URL spelling, roles and loopback aliases
 * must not disguise a shared native store. No connection string enters a projection.
 */
export async function assertLabIsolation(
  config: AppConfig,
  game: SqlDatabase,
  lab: SqlDatabase,
): Promise<void> {
  await mkdir(config.cognitionLab.dataDirectory, { recursive: true });
  const [gameDirectory, labDirectory, gameIdentity, labIdentity] = await Promise.all([
    realpath(config.dataDirectory),
    realpath(config.cognitionLab.dataDirectory),
    game
      .prepare(
        'SELECT current_database() AS database, pg_postmaster_start_time()::text AS started, inet_server_port() AS port',
      )
      .get(),
    lab
      .prepare(
        'SELECT current_database() AS database, pg_postmaster_start_time()::text AS started, inet_server_port() AS port',
      )
      .get(),
  ]);
  if (gameDirectory === labDirectory)
    throw new Error('Choose a separate OPEN_LEGEND_LAB_DATA_DIR before opening the lab.');
  // The accepted server's own identity covers IPv4/IPv6 and DNS aliases. Two
  // distinct servers with coincident start/port/name are conservatively refused.
  if (
    gameIdentity?.['database'] === labIdentity?.['database'] &&
    gameIdentity?.['started'] === labIdentity?.['started'] &&
    gameIdentity?.['port'] === labIdentity?.['port']
  )
    throw new Error('Choose a separate OPEN_LEGEND_LAB_DATABASE_URL before opening the lab.');
}

/** Standard local setup creates only the lab database; existing worlds are untouched. */
export async function provisionCognitionLab(config: AppConfig): Promise<void> {
  const game = new URL(config.databaseUrl),
    lab = new URL(config.cognitionLab.databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(lab.protocol) || lab.hash || lab.pathname.length < 2)
    throw new Error('OPEN_LEGEND_LAB_DATABASE_URL must be a PostgreSQL database URL.');
  const loopback = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (!loopback(lab.hostname))
    throw new Error(
      'Automatic lab setup is local-only. Provision the configured lab database through its existing operator.',
    );
  if (
    decodeURIComponent(game.pathname) === decodeURIComponent(lab.pathname) &&
    (game.hostname === lab.hostname || loopback(game.hostname)) &&
    (game.port || '5432') === (lab.port || '5432')
  )
    throw new Error('The lab database must be separate from the game database.');
  const database = decodeURIComponent(lab.pathname.slice(1));
  if (Buffer.byteLength(database) > 63)
    throw new Error(
      'Choose an OPEN_LEGEND_LAB_DATABASE_URL with a database name of at most 63 bytes.',
    );
  const admin = new URL(lab);
  admin.pathname = '/postgres';
  const client = new Client({
    connectionString: admin.href,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  });
  client.on('error', () => undefined);
  try {
    await client.connect();
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (!exists.rowCount) await client.query(`CREATE DATABASE "${database.replaceAll('"', '""')}"`);
    await mkdir(config.cognitionLab.dataDirectory, { recursive: true });
  } finally {
    await client.end();
  }
}
