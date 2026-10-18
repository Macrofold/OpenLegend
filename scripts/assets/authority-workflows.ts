import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AssetConfiguration } from '../../apps/server/src/asset-configuration.js';
import type { AssetPrincipal, AssetRepository } from '../../apps/server/src/asset-repository.js';
import { S3AssetStorage } from '../../apps/server/src/asset-storage.js';
import { withRecoveryAuthority } from './recovery.js';

/** Every operator permission/rights change uses the independently retained
 * pending marker. A crash cannot make an older backup look current. */
export async function mutateAssetAuthority<T>(
  options: {
    repository: AssetRepository;
    configuration: AssetConfiguration;
    principal: AssetPrincipal;
    domain: string;
    operationId?: string;
    change: unknown;
    bootstrap: boolean;
  },
  mutation: () => Promise<T>,
): Promise<T> {
  const storage = new S3AssetStorage(options.configuration, 'recovery-writer');
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-asset-authority-'));
  const fingerprint = createHash('sha256').update(JSON.stringify(options.change)).digest('hex');
  try {
    const marker = await storage.readRecoveryMarker(options.domain);
    if (!marker && options.bootstrap) return mutation();
    return await withRecoveryAuthority(
      options.repository,
      storage,
      {
        domain: options.domain,
        directory,
        operationId: options.operationId ?? 'authority-' + fingerprint.slice(0, 32),
        fingerprint,
        principal: options.principal,
      },
      mutation,
    );
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
}
