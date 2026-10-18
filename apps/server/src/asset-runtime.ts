import {
  indexedAsset,
  type ArtifactReference,
  type AssetRevisionReference,
} from '@open-legend/assets';
import {
  assetCacheRoot,
  readAssetConfiguration,
  readAssetIndex,
  type AssetStoragePurpose,
} from './asset-configuration.js';
import { S3AssetStorage } from './asset-storage.js';
import { AssetCache } from './asset-cache.js';
import { copyPublicAssetToCache, isPublicDeliveryReference } from './asset-public-delivery.js';

export interface OpenAssetFile {
  path: string;
  reference: ArtifactReference;
  release(): Promise<void>;
}
export interface AssetResolver {
  (repositoryPath: string, signal?: AbortSignal): Promise<OpenAssetFile>;
  reference(repositoryPath: string): ArtifactReference;
  releaseSha256: string;
  release: AssetRevisionReference;
  close(): Promise<void>;
}
export async function createAssetResolver(
  options: {
    indexPath?: string;
    configPath?: string;
    cacheRoot?: string;
    purpose?: AssetStoragePurpose;
    /** Anonymous, exact public CDN/cache reads only; never use for private admission. */
    publicOnly?: boolean;
  } = {},
): Promise<AssetResolver> {
  const configuration = await readAssetConfiguration(options.configPath);
  const index = await readAssetIndex(options.indexPath);
  const stores = new Map<AssetStoragePurpose, S3AssetStorage>();
  const storageFor = (reference: ArtifactReference): S3AssetStorage => {
    const purpose =
      options.purpose ??
      (reference.boundary === 'runtime'
        ? 'runtime'
        : reference.boundary === 'art-studies'
          ? 'study'
          : reference.boundary === 'art-library' || reference.boundary === 'intake'
            ? 'authoring'
            : undefined);
    if (!purpose) throw new Error('Recovery reads require an explicitly selected recovery role.');
    let storage = stores.get(purpose);
    if (!storage) {
      storage = new S3AssetStorage(configuration, purpose);
      stores.set(purpose, storage);
    }
    return storage;
  };
  const cache = new AssetCache({
    root: options.cacheRoot ?? assetCacheRoot(configuration),
    maxBytes: configuration.cache.maxBytes,
    maxEntries: configuration.cache.maxEntries,
    maxConcurrent: configuration.cache.maxConcurrent,
  });
  const referenceFor = (repositoryPath: string): ArtifactReference => {
    const reference = indexedAsset(index, repositoryPath);
    if (options.publicOnly && !isPublicDeliveryReference(reference))
      throw new Error('Anonymous materialization refuses private or original-library files.');
    if (reference.bytes > configuration.maxObjectBytes)
      throw new Error('Asset exceeds the configured transfer byte allowance.');
    return reference;
  };
  const open: AssetResolver = Object.assign(
    async (repositoryPath: string, signal?: AbortSignal) => {
      const reference = referenceFor(repositoryPath);
      return cache.acquire(
        reference,
        async (temporary, transferSignal) => {
          if (options.publicOnly)
            return copyPublicAssetToCache(
              reference,
              temporary,
              transferSignal,
              configuration.runtimeEnvironment,
            );
          await storageFor(reference).download(reference, temporary, transferSignal);
        },
        signal,
      );
    },
    {
      reference: referenceFor,
      releaseSha256: index.release.manifestSha256,
      release: index.release,
      close: async () => {
        try {
          await cache.close();
        } finally {
          for (const storage of stores.values()) storage.close();
        }
      },
    },
  );
  return open;
}
