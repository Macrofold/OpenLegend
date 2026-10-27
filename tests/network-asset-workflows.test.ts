import { afterEach, expect, it, vi } from 'vitest';
import { createNetworkOwner } from '@open-legend/network';
import { artifactKey, type ArtifactReference } from '@open-legend/assets';
import type { AssetConfiguration } from '../apps/server/src/asset-configuration.js';
import type { AssetRepository } from '../apps/server/src/asset-repository.js';
import { S3AssetStorage, withAssetStorageOperation } from '../apps/server/src/asset-storage.js';
import { toolSequence } from '../scripts/network.js';
import { withRecoveryAuthority } from '../scripts/assets/recovery.js';
import { withdrawAssetRevision } from '../scripts/assets/withdrawal.js';

vi.mock('../scripts/assets/infrastructure.js', () => ({
  assetInfrastructureOutputs: async () => ({
    outputs: { RuntimeBucket: 'synthetic-runtime', RuntimeDistributionId: 'synthetic-cdn' },
  }),
}));
const configuration: AssetConfiguration = {
  profile: 'synthetic',
  region: 'us-east-2',
  accountId: '123456789012',
  buckets: { runtime: 'synthetic-runtime' },
  maxObjectBytes: 1024,
  cache: { maxBytes: 1024, maxEntries: 1, maxConcurrent: 1 },
  publication: {
    maxRevisions: 1,
    maxFiles: 1,
    maxBytes: 1024,
    maxDepth: 1,
    maxManifestBytes: 1024,
  },
};
const reference: ArtifactReference = {
  boundary: 'runtime',
  accessDomain: 'public',
  sha256: 'a'.repeat(64),
  bytes: 1,
  mediaType: 'application/octet-stream',
};
const revision = {
  owner: { kind: 'collection' as const, id: 'fixture-owner' },
  assetId: 'fixture-asset',
  revisionId: 'fixture-revision',
  manifestSha256: 'b'.repeat(64),
};
const principal = { accountId: configuration.accountId };
const authorityReference: ArtifactReference = {
  ...reference,
  boundary: 'asset-recovery',
  accessDomain: 'fixture-domain',
  mediaType: 'application/json',
};
const marker = {
  bytes: Buffer.from(
    JSON.stringify({
      format: 'openlegend-asset-authority',
      domain: 'fixture-domain',
      generation: 0,
      status: 'complete',
      authority: { reference: authorityReference, key: artifactKey(authorityReference) },
    }),
  ),
  etag: 'fixture-etag',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => {
  vi.useRealTimers();
});

it('stops actual withdrawal before deletion or another SQL write when preparation finishes after its original deadline', async () => {
  const prepared = deferred<void>(),
    release = deferred<void>();
  const send = vi.fn(async () => ({ DeleteMarker: true, VersionId: 'fixture-delete' }));
  vi.spyOn(S3AssetStorage.prototype, 'principal').mockImplementation(async function (
    this: S3AssetStorage,
  ) {
    (this as unknown as { client: { send: typeof send } }).client.send = send;
    return configuration.accountId;
  });
  vi.spyOn(S3AssetStorage.prototype, 'readRecoveryMarker').mockResolvedValue(marker);
  vi.spyOn(S3AssetStorage.prototype, 'compareRecoveryMarker').mockImplementation(
    async (_domain, bytes) => ({ bytes, etag: 'fixture-etag' }),
  );
  vi.spyOn(S3AssetStorage.prototype, 'upload').mockImplementation(
    async (artifact, _source, key) => ({
      accountId: configuration.accountId,
      region: configuration.region,
      bucket: 'synthetic-recovery',
      key: key ?? artifactKey(artifact),
      sha256: artifact.sha256,
      bytes: artifact.bytes,
      mediaType: artifact.mediaType,
    }),
  );
  // Any accidental SDK dispatch is intercepted, including one after local expiry.
  const close = vi.spyOn(S3AssetStorage.prototype, 'close');
  const location = {
    accountId: configuration.accountId,
    region: configuration.region,
    bucket: configuration.buckets.runtime!,
    reference,
    key: artifactKey(reference),
  };
  const plan = {
    id: 'fixture-removal',
    generation: 0,
    status: 'pending',
    files: [location],
    keptShared: [],
  };
  const record = vi.fn();
  const complete = vi.fn();
  const repository = {
    db: { transactionActive: false },
    authorityOperationOutcome: async () => undefined,
    restrictionSnapshot: async () => ({ generation: 0 }),
    assertRecoveryOperator: async () => {},
    authorityOperation: async (
      _principal: unknown,
      _id: unknown,
      _fingerprint: unknown,
      mutate: () => Promise<unknown>,
    ) => ({ generation: 0, outcome: await mutate() }),
    withdraw: async () => [revision],
    planControlledRemoval: async () => plan,
    controlledRemoval: async () => plan,
    controlledRemovalReceipts: async () => [],
    assertControlledRemovalLocation: async () => {
      prepared.resolve();
      await release.promise;
    },
    recordControlledRemoval: record,
    completeControlledRemoval: complete,
  } as unknown as AssetRepository;
  const result = toolSequence(1000, () =>
    withdrawAssetRevision({
      repository,
      configuration,
      sourceConfigurations: [],
      principal,
      authorityDomain: 'fixture-domain',
      operationId: 'original-withdrawal',
      reference: revision,
      reason: 'synthetic review',
    }),
  ).catch((error) => error);
  await prepared.promise;
  vi.useFakeTimers();
  // The already-created real timer uses the original deadline. Abort it by
  // advancing the shared clock, then trigger the lazy deadline check on resume.
  vi.setSystemTime(Date.now() + 1001);
  release.resolve();
  await vi.advanceTimersByTimeAsync(0);
  expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
  expect(send).not.toHaveBeenCalled();
  expect(record).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(3));
});

it('does not admit SQL after delayed recovery preparation passes the deadline', async () => {
  const owner = createNetworkOwner({ role: 'fixture-recovery', capacity: 1 });
  const release = deferred<typeof marker>();
  const entered = deferred<void>();
  const sql = vi.fn();
  const repository = {
    db: { transactionActive: false },
    authorityOperationOutcome: sql,
  } as unknown as AssetRepository;
  const storage = new S3AssetStorage(configuration, 'recovery-writer');
  vi.spyOn(storage, 'principal').mockResolvedValue(configuration.accountId);
  vi.spyOn(storage, 'readRecoveryMarker').mockImplementation(() => {
    entered.resolve();
    return release.promise;
  });
  let late!: Promise<unknown>;
  vi.useFakeTimers();
  const result = owner
    .run({ timeoutMs: 25 }, (operation) => {
      late = withRecoveryAuthority(
        repository,
        storage,
        {
          domain: 'fixture-domain',
          directory: '/unused-synthetic',
          operationId: 'original-operation',
          fingerprint: 'a'.repeat(64),
          principal,
          operation,
        },
        async () => {
          throw new Error('Mutation must not start.');
        },
      );
      return withAssetStorageOperation(operation, () => late);
    })
    .catch((error) => error);
  await entered.promise;
  await vi.advanceTimersByTimeAsync(25);
  expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
  release.resolve(marker);
  await expect(late).rejects.toMatchObject({ kind: 'deadline_exceeded' });
  expect(sql).not.toHaveBeenCalled();
  storage.close();
  await vi.advanceTimersByTimeAsync(0);
  expect(owner.snapshot().active).toBe(0);
});

it.each(['queued', 'admitted'] as const)(
  'keeps %s authority work within the original admission decision',
  async (phase) => {
    const owner = createNetworkOwner({ role: 'fixture-authority', capacity: 1 });
    const release = deferred<void>(),
      entered = deferred<void>();
    const mutate = vi.fn(async () => {
      if (phase === 'admitted') {
        entered.resolve();
        await release.promise;
      }
      return 'committed';
    });
    const readOutcome = vi.fn(async () => undefined);
    const readSnapshot = vi.fn(async () => ({ generation: 0 }));
    const repository = {
      db: { transactionActive: false },
      authorityOperationOutcome: readOutcome,
      restrictionSnapshot: readSnapshot,
      assertRecoveryOperator: async () => {},
      authorityOperation: async (
        _principal: unknown,
        _id: unknown,
        _fingerprint: unknown,
        work: () => Promise<unknown>,
      ) => {
        if (phase === 'queued') {
          entered.resolve();
          await release.promise;
        }
        return { generation: 0, outcome: await work() };
      },
    } as unknown as AssetRepository;
    const storage = new S3AssetStorage(configuration, 'recovery-writer');
    vi.spyOn(storage, 'principal').mockResolvedValue(configuration.accountId);
    vi.spyOn(storage, 'readRecoveryMarker').mockResolvedValue(marker);
    const publish = vi
      .spyOn(storage, 'compareRecoveryMarker')
      .mockImplementation(async (_domain, bytes) => ({ bytes, etag: 'pending-etag' }));
    let late!: Promise<unknown>;
    vi.useFakeTimers();
    const result = owner
      .run({ timeoutMs: 25 }, (operation) => {
        late = withRecoveryAuthority(
          repository,
          storage,
          {
            domain: 'fixture-domain',
            directory: '/unused-synthetic',
            operationId: 'original-operation',
            fingerprint: 'a'.repeat(64),
            principal,
            operation,
          },
          mutate,
        );
        return withAssetStorageOperation(operation, () => late);
      })
      .catch((error) => error);
    await entered.promise;
    await vi.advanceTimersByTimeAsync(25);
    expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
    release.resolve();
    await expect(late).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    expect(mutate).toHaveBeenCalledTimes(phase === 'queued' ? 0 : 1);
    // No new read, mutation or complete recovery marker is admitted after expiry.
    expect(readOutcome).toHaveBeenCalledOnce();
    expect(readSnapshot).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledOnce();
    expect(JSON.parse(Buffer.from(publish.mock.calls[0]![1]).toString()).status).toBe('pending');
    storage.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().active).toBe(0);
  },
);
