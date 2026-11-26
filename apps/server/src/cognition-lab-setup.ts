import { Client } from 'pg';
import { mkdir, realpath } from 'node:fs/promises';
import { sep } from 'node:path';

/** Standard local setup creates only the lab database; existing worlds are untouched. */
export async function provisionCognitionLab(
  gameUrl: string,
  labUrl: string,
  gameDirectory: string,
  labDirectory: string,
): Promise<void> {
  const game = new URL(gameUrl),
    lab = new URL(labUrl);
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
  await Promise.all([
    mkdir(gameDirectory, { recursive: true }),
    mkdir(labDirectory, { recursive: true }),
  ]);
  const [gamePath, labPath] = await Promise.all([realpath(gameDirectory), realpath(labDirectory)]);
  if (
    gamePath === labPath ||
    labPath.startsWith(gamePath + sep) ||
    gamePath.startsWith(labPath + sep)
  )
    throw new Error('The Lab needs its own checkpoint directory.');
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
  } finally {
    await client.end();
  }
}
