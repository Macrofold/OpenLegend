import { S3AssetStorage } from './asset-storage.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ASSET_TABLES } from './asset-repository.js';
import type { AssetConfiguration } from './asset-configuration.js';
import { PostgresDatabase } from './postgres.js';
import type { SqlDatabase } from './store.js';

/** One shared asset authority records publication and permission for every machine.
 * Each game keeps a synchronized copy in its own database, because worlds read
 * releases and pin saves there: docs/asset-workflow.md#shared-asset-authority. */

/** Records about one world's saves. They stay in the game's own database and are
 * never overwritten by a sync. Every other asset table is the authority's. */
export const WORLD_ASSET_TABLES = [
  'asset_save_claims',
  'asset_world_bindings',
  'asset_pins',
  'asset_pin_files',
] as const satisfies readonly (typeof ASSET_TABLES)[number][];
const worldTables: ReadonlySet<string> = new Set(WORLD_ASSET_TABLES);
export const SHARED_ASSET_TABLES = ASSET_TABLES.filter((table) => !worldTables.has(table));

export async function assetAuthorityUrl(configuration: AssetConfiguration): Promise<string> {
  const authority = configuration.authority;
  if (!authority)
    throw new Error('assets/config.json names no shared asset authority (the "authority" entry).');
  // Short-lived IAM token from the person's own sign-in; no stored database password.
  const storage = new S3AssetStorage(configuration);
  let token: string;
  try {
    token = await storage.databaseAuthToken(authority);
  } finally {
    storage.close();
  }
  const bundle = authority.certificateBundle.replace(/^~(?=\/)/, homedir());
  const url = new URL(`postgresql://${authority.host}`);
  url.port = String(authority.port);
  url.pathname = `/${authority.database}`;
  url.username = encodeURIComponent(authority.user);
  url.password = encodeURIComponent(token);
  url.searchParams.set('sslmode', 'verify-full');
  url.searchParams.set('sslrootcert', bundle.startsWith('/') ? bundle : join(homedir(), bundle));
  return url.toString();
}

export async function openAssetAuthority(
  configuration: AssetConfiguration,
  readOnly = false,
): Promise<PostgresDatabase> {
  return new PostgresDatabase(await assetAuthorityUrl(configuration), readOnly, true, 'authority');
}

const INSERT_ROWS = 200;

/** Replaces the game's copy of the shared asset records with the authority's
 * current snapshot, leaving world save records in place. Refuses when a local save
 * pins a revision the authority no longer records, which would break its restore. */
export async function syncAssetAuthority(
  authority: SqlDatabase,
  game: SqlDatabase,
): Promise<Record<string, number>> {
  const snapshot = new Map<string, Record<string, unknown>[]>();
  const read = async () => {
    for (const table of SHARED_ASSET_TABLES)
      snapshot.set(table, await authority.prepare(`SELECT * FROM ${table}`).all());
  };
  // One repeatable-read snapshot, so revisions, files and grants agree.
  await (authority.readTransaction ? authority.readTransaction(read) : read());
  const revisions = new Set(
    snapshot
      .get('asset_revisions')!
      .map((row) => `${row['revision_key']}\0${row['manifest_sha256']}`),
  );
  const counts: Record<string, number> = {};
  await game.transaction(async () => {
    const pinned = await game
      .prepare('SELECT DISTINCT revision_key,manifest_sha256 FROM asset_pins')
      .all();
    const missing = pinned.filter(
      (row) => !revisions.has(`${row['revision_key']}\0${row['manifest_sha256']}`),
    );
    if (missing.length)
      throw new Error(
        `The shared authority lacks ${missing.length} revision(s) this game's saves pin, for example ${String(missing[0]!['revision_key'])}; nothing was changed.`,
      );
    for (const table of SHARED_ASSET_TABLES) {
      const rows = snapshot.get(table)!;
      await game.prepare(`DELETE FROM ${table}`).run();
      counts[table] = rows.length;
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]!);
      const tuple = `(${columns.map(() => '?').join(',')})`;
      for (let start = 0; start < rows.length; start += INSERT_ROWS) {
        const batch = rows.slice(start, start + INSERT_ROWS);
        await game
          .prepare(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES ${batch.map(() => tuple).join(',')}`,
          )
          .run(...batch.flatMap((row) => columns.map((column) => row[column])));
      }
    }
  });
  return counts;
}
