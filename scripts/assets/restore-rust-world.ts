import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { assertAssetRevisionReference } from '@open-legend/assets';
import {
  AssetRepository,
  type RestoredWorldArtwork,
} from '../../apps/server/src/asset-repository.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { readCurrentAssetAuthority, type AssetRecoveryTransport } from './recovery.js';

const runLocalRestore = promisify(execFile);

/** The only network operations use the existing authenticated recovery reader.
 * Neither read holds a database writer or creates a Node gameplay service. */
export async function restoreRustWorld(
  storage: AssetRecoveryTransport,
  options: {
    serverDirectory: string;
    release: string;
    backup: string;
    databaseUrl: string;
    dataDirectory: string;
    domain: string;
  },
): Promise<RestoredWorldArtwork> {
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-rust-artwork-restore-'));
  try {
    const principal = { accountId: await storage.principal() };
    const verification = { domain: options.domain, directory };
    await readCurrentAssetAuthority(storage, verification);
    const { stdout } = await runLocalRestore(
      'openlegend-game-server',
      ['restore-world', options.release, options.backup, '--artwork-operator', principal.accountId],
      {
        env: {
          ...process.env,
          PATH: options.serverDirectory,
          OPEN_LEGEND_DATABASE_URL: options.databaseUrl,
          OPEN_LEGEND_DATA_DIR: options.dataDirectory,
        },
        maxBuffer: 64 * 1024,
      },
    );
    const report = JSON.parse(stdout) as RestoredWorldArtwork;
    const release = report.artwork?.release;
    if (release !== null) assertAssetRevisionReference(release);
    if (report.artwork.principal !== principal.accountId)
      throw new Error('The staged artwork restore belongs to another recovery operator.');
    const latest = await readCurrentAssetAuthority(storage, verification);
    if ((await storage.principal()) !== principal.accountId)
      throw new Error('The recovery operator changed before artwork activation.');

    const database = new PostgresDatabase(options.databaseUrl);
    try {
      await new AssetRepository(database).activateRestoredWorldArtwork(report, latest, principal);
    } finally {
      await database.close();
    }
    return report;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
